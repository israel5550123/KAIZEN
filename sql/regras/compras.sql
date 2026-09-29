-- Compras e estoque do dia $1 (spec da Fase 4, seção 8.3): uma linha, com a resposta em jsonb na coluna resposta.
-- Período: os 90 dias que terminam no dia. O estoque só é conhecido a partir de 26/09/2026 (a virada).
with periodo as (
  select $1::date - 89 as de, $1::date as ate, $1::date >= date '2026-09-26' as conhecido
),
-- Os dias do período com estoque conhecido: nenhum antes de 26/09/2026. Direto de $1, o Postgres sabe quantos são;
-- vindo de outra CTE, ele supõe 1.000 dias e liga a compilação JIT, que custa mais que a própria conta.
dias as (
  select $1::date - n as dia
  from generate_series(0, least(89, $1::date - date '2026-09-26')) as n
),
-- Por produto, o vendido menos o devolvido no período, em valor e em quantidade (spec 8.1).
venda as (
  select
    v.produto,
    sum(case v.sentido when 'vendido' then v.valor else -v.valor end) as liquido,
    sum(case v.sentido when 'vendido' then v.quantidade else -v.quantidade end) as quantidade,
    bool_or(v.sentido = 'vendido') as vendeu
  from kaizen.venda_item v, periodo
  where v.dia between periodo.de and periodo.ate
  group by v.produto
),
-- Curva ABC (docs/LOJA.md): é A enquanto o acumulado, contando o próprio produto, não passa de 80%; B até 95%; C o
-- resto. O código desempata como texto: há códigos que não são número ('link:1993').
curva_valor as (
  select produto, liquido,
    case
      when sum(liquido) over acumulado <= 0.80 * sum(liquido) over () then 'A'
      when sum(liquido) over acumulado <= 0.95 * sum(liquido) over () then 'B'
      else 'C'
    end as classe
  from venda
  where liquido > 0
  window acumulado as (order by liquido desc, produto collate "C" rows unbounded preceding)
),
curva_quantidade as (
  select produto, quantidade,
    case
      when sum(quantidade) over acumulado <= 0.80 * sum(quantidade) over () then 'A'
      when sum(quantidade) over acumulado <= 0.95 * sum(quantidade) over () then 'B'
      else 'C'
    end as classe
  from venda
  where quantidade > 0
  window acumulado as (order by quantidade desc, liquido desc, produto collate "C" rows unbounded preceding)
),
-- Estoque no fim do dia (spec 8.1): o saldo do movimento de maior origem_id::bigint com momento até o fim do dia
-- (como texto, '9999' ficaria acima de '10000'); sem movimento, a virada; sem virada, 0. Aqui, o último movimento de
-- cada produto em cada dia; os de antes do primeiro dia do período contam nele.
movimento as (
  select distinct on (m.produto, greatest(m.momento::date, p.primeiro))
    m.produto, greatest(m.momento::date, p.primeiro) as dia, m.origem_id::bigint as ordem, m.saldo_depois
  from kaizen.estoque_movimento m, (select min(dia) as primeiro from dias) p, periodo
  where m.momento < periodo.ate + 1
  order by m.produto, greatest(m.momento::date, p.primeiro), m.origem_id::bigint desc
),
com_estoque as (
  select produto from kaizen.estoque_virada
  union
  select produto from movimento
  union
  select produto from venda
),
-- Em cada dia, o maior origem_id até ali.
grade as (
  select c.produto, d.dia, max(m.ordem) over (partition by c.produto order by d.dia) as ordem
  from com_estoque c
  cross join dias d
  left join movimento m on m.produto = c.produto and m.dia = d.dia
),
estoque as (
  select
    g.produto,
    avg(coalesce(m.saldo_depois, v.quantidade, 0)) as medio,
    max(coalesce(m.saldo_depois, v.quantidade, 0)) filter (where g.dia = periodo.ate) as atual
  from grade g
  cross join periodo
  left join movimento m on m.produto = g.produto and m.ordem = g.ordem
  left join kaizen.estoque_virada v on v.produto = g.produto
  group by g.produto
),
-- Entrada de compra (spec 8.3): item de entrada em documento de papel compra, até o dia. O item N da Link (entrada
-- não concluída) não é entrada; ajuste, inventário, orçamento, pré-venda e a virada não são compra.
entrada as (
  select i.produto, p.dia
  from kaizen.documento_papel p
  join kaizen.documento_item i on i.documento_id = p.id
  join kaizen.traducao s on s.fonte = p.fonte and s.campo = 'sentido' and s.codigo = i.sentido
  cross join periodo
  where p.papel = 'compra' and s.valor = 'entrada' and p.dia <= periodo.ate
),
-- O primeiro dia com item vendido de cada produto. Calculado uma vez (materialized): consultada produto a produto,
-- a visão venda_item seria refeita para cada um.
primeira_venda as materialized (
  select v.produto, min(v.dia) as dia from kaizen.venda_item v where v.sentido = 'vendido' group by v.produto
),
-- Produto novo: a primeira entrada de compra é de menos de 60 dias antes do dia, e antes dela ele não vendeu; se ela é
-- de 26/09/2026 em diante, o estoque no fim da véspera dela era zero ou menos.
novo as (
  select f.produto
  from (select produto, min(dia) as dia from entrada group by produto) f
  cross join periodo
  left join primeira_venda pv on pv.produto = f.produto
  where f.dia > periodo.ate - 60
    and (pv.dia is null or pv.dia >= f.dia)
    and (
      f.dia < date '2026-09-26'
      or coalesce(
        (select m.saldo_depois from kaizen.estoque_movimento m
         where m.produto = f.produto and m.momento < f.dia
         order by m.origem_id::bigint desc limit 1),
        (select v.quantidade from kaizen.estoque_virada v where v.produto = f.produto),
        0
      ) <= 0
    )
),
-- Cada produto com venda no período ou estoque diferente de zero. O cadastro vem pelo código: o produto que só existe
-- na Link tem código próprio ('link:…'), que não se repete no ERP novo.
linha as (
  select
    x.produto, c.descricao, c.grupo, c.marca, c.custo,
    cv.classe as classe_valor, cq.classe as classe_quantidade,
    coalesce(v.liquido, 0) as liquido, coalesce(v.quantidade, 0) as quantidade,
    e.atual as estoque, e.medio as estoque_medio,
    case when periodo.conhecido then e.atual > 0 and not coalesce(v.vendeu, false) and n.produto is null end as encalhe,
    case when periodo.conhecido then coalesce(v.vendeu, false) and e.atual <= 0 end as ruptura
  from (select produto from venda union select produto from estoque) x
  cross join periodo
  left join venda v on v.produto = x.produto
  left join estoque e on e.produto = x.produto
  left join kaizen.produto c on c.codigo = x.produto
  left join curva_valor cv on cv.produto = x.produto
  left join curva_quantidade cq on cq.produto = x.produto
  left join novo n on n.produto = x.produto
  where v.vendeu or e.atual <> 0
),
-- Giro por grupo, marca e fornecedor: as somas dos produtos da lista. O fornecedor sai pelo nome do cadastro de pessoas.
giro as (
  select x.por, x.nome, sum(x.quantidade) as quantidade, sum(x.estoque_medio) as estoque_medio, sum(x.estoque) as estoque
  from (
    select 'grupo' as por, l.grupo as nome, l.quantidade, l.estoque_medio, l.estoque from linha l
    union all
    select 'marca', l.marca, l.quantidade, l.estoque_medio, l.estoque from linha l
    union all
    select 'fornecedor', pe.nome, l.quantidade, l.estoque_medio, l.estoque
    from linha l
    left join kaizen.produto_fornecedor f on f.produto = l.produto
    left join kaizen.pessoa pe on pe.fonte = f.fonte and pe.codigo = f.fornecedor
  ) x
  group by x.por, x.nome
),
giro_lista as (
  select g.por, jsonb_agg(jsonb_build_object(
    'nome', g.nome,
    'quantidade', g.quantidade,
    'estoque_medio', round(g.estoque_medio, 4),
    'giro', round(g.quantidade / nullif(g.estoque_medio, 0), 4),
    'cobertura_dias', case when g.quantidade > 0 then case when g.estoque <= 0 then 0 else round(g.estoque * 90 / g.quantidade, 4) end end
  ) order by g.nome) as lista
  from giro g
  group by g.por
)
select jsonb_build_object(
  'periodo', jsonb_build_object('de', periodo.de, 'ate', periodo.ate),
  'estoque_conhecido', periodo.conhecido,
  'abc_valor', (
    select jsonb_object_agg(k.classe, jsonb_build_object('produtos', k.produtos, 'liquido', k.liquido))
    from (
      select k.classe, count(cv.produto) as produtos, round(coalesce(sum(cv.liquido), 0), 2) as liquido
      from (values ('A'), ('B'), ('C')) as k (classe)
      left join curva_valor cv on cv.classe = k.classe
      group by k.classe
    ) k
  ),
  'abc_quantidade', (
    select jsonb_object_agg(k.classe, jsonb_build_object('produtos', k.produtos, 'quantidade', k.quantidade))
    from (
      select k.classe, count(cq.produto) as produtos, coalesce(sum(cq.quantidade), 0) as quantidade
      from (values ('A'), ('B'), ('C')) as k (classe)
      left join curva_quantidade cq on cq.classe = k.classe
      group by k.classe
    ) k
  ),
  'compras_por_classe', (
    select jsonb_build_object(
      'A', count(*) filter (where cv.classe = 'A'),
      'B', count(*) filter (where cv.classe = 'B'),
      'C', count(*) filter (where cv.classe = 'C'),
      'sem_venda', count(*) filter (where cv.classe is null)
    )
    from (select distinct e.produto from entrada e where e.dia >= periodo.de) cp
    left join curva_valor cv on cv.produto = cp.produto
  ),
  'encalhe', case when periodo.conhecido then (
    select jsonb_build_object('produtos', count(*), 'valor', round(coalesce(sum(l.estoque * l.custo), 0), 2))
    from linha l where l.encalhe
  ) end,
  'ruptura', case when periodo.conhecido then (
    select jsonb_build_object('produtos', count(*)) from linha l where l.ruptura
  ) end,
  'produtos', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'codigo', l.produto,
      'descricao', l.descricao,
      'classe_valor', l.classe_valor,
      'classe_quantidade', l.classe_quantidade,
      'liquido', round(l.liquido, 2),
      'quantidade', l.quantidade,
      'estoque', l.estoque,
      'estoque_medio', round(l.estoque_medio, 4),
      'giro', round(l.quantidade / nullif(l.estoque_medio, 0), 4),
      'cobertura_dias', case when l.quantidade > 0 then case when l.estoque <= 0 then 0 else round(l.estoque * 90 / l.quantidade, 4) end end,
      'encalhe', l.encalhe,
      'ruptura', l.ruptura
    ) order by l.liquido desc, l.produto collate "C"), '[]')
    from linha l
  ),
  'giro_por_grupo', case when periodo.conhecido then coalesce((select lista from giro_lista where por = 'grupo'), '[]') end,
  'giro_por_marca', case when periodo.conhecido then coalesce((select lista from giro_lista where por = 'marca'), '[]') end,
  'giro_por_fornecedor', case when periodo.conhecido then coalesce((select lista from giro_lista where por = 'fornecedor'), '[]') end,
  'custo_zero', (
    select coalesce(jsonb_agg(p.codigo order by p.codigo collate "C"), '[]')
    from kaizen.produto p
    where p.fonte = 'meuerp' and p.ativo and coalesce(p.custo, 0) = 0
  ),
  'estoque_negativo', case when periodo.conhecido then (
    select coalesce(jsonb_agg(l.produto order by l.produto collate "C"), '[]') from linha l where l.estoque < 0
  ) end
) as resposta
from periodo
