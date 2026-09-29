-- Vendas de um dia (spec da Fase 4, seção 8.2). $1 = o dia calculado (date). Um único select, que devolve uma linha
-- com a coluna resposta (jsonb). Dinheiro: soma sem arredondar e round(…, 2) só no total; razões com 4 casas. Sem
-- divisor (nenhuma venda, nenhuma meta, nenhum dia útil decorrido), o campo sai vazio: o dia sem venda não dá erro.
with
periodo as (
  select $1::date as dia,
         date_trunc('month', $1::date)::date as inicio,
         (date_trunc('month', $1::date) + interval '1 month' - interval '1 day')::date as fim
),
-- Os documentos de papel venda, calculados uma vez só: juntar documento_papel direto com venda_item (que já passa por
-- ela) leva o Postgres a um laço aninhado que, com os 6.338 documentos do banco do PC, passa de 2 minutos por dia.
venda as materialized (
  select p.id from kaizen.documento_papel p where p.papel = 'venda'
),
-- Os itens vendidos e devolvidos até o dia (kaizen.venda_item). realizado é o valor com sinal: o devolvido entra
-- negativo. conta_venda marca o item vendido de documento de papel venda: só ele conta nas vendas e nos itens por venda.
item as (
  select v.documento, v.dia, v.hora, v.pessoa, v.produto, v.vendedor, v.sentido,
         case v.sentido when 'vendido' then v.valor else -v.valor end as realizado,
         v.sentido = 'vendido' and v.documento in (select vd.id from venda vd) as conta_venda
  from kaizen.venda_item v
  where v.dia <= $1::date
),
item_mes as (
  select i.* from item i, periodo pr where i.dia >= pr.inicio
),
-- Os itens sem vendedor (docs/LOJA.md: "fica fora, como no 154, e o Kaizen o sinaliza como exceção"): saída e entrada
-- dos documentos de papel venda ou troca, a mesma regra de kaizen.venda_item (migração 012), só sem o filtro de
-- vendedor. Lido direto de documento_item + documento_papel, sem mexer na 012.
sem_vendedor_item as (
  select p.dia, i.valor_liquido as valor
  from kaizen.documento_papel p
  join kaizen.documento_item i on i.documento_id = p.id
  join kaizen.traducao s on s.fonte = p.fonte and s.campo = 'sentido' and s.codigo = i.sentido
  where p.papel in ('venda', 'troca') and i.vendedor is null and s.valor in ('saida', 'entrada')
),
sem_vendedor_total as (
  select t.nome, count(sv.valor) as itens, coalesce(sum(sv.valor), 0) as valor
  from (values ('dia'), ('mes')) t (nome)
  cross join periodo pr
  left join sem_vendedor_item sv on (t.nome = 'dia' and sv.dia = pr.dia) or (t.nome = 'mes' and sv.dia between pr.inicio and pr.dia)
  group by t.nome
),
-- O dia e o mês até o dia, com as mesmas contas.
total as (
  select t.nome,
         sum(i.realizado) filter (where i.sentido = 'vendido') as vendido,
         -sum(i.realizado) filter (where i.sentido = 'devolvido') as devolucoes,
         sum(i.realizado) as realizado,
         count(distinct i.documento) filter (where i.conta_venda) as vendas,
         count(distinct (i.documento, i.produto)) filter (where i.conta_venda) as produtos
  from (values ('dia'), ('mes')) t (nome)
  cross join periodo pr
  left join item_mes i on t.nome = 'mes' or i.dia = pr.dia
  group by t.nome
),
resumo as (
  select t.nome, t.realizado, jsonb_build_object(
    'vendido', round(coalesce(t.vendido, 0), 2),
    'devolucoes', round(coalesce(t.devolucoes, 0), 2),
    'realizado', round(coalesce(t.realizado, 0), 2),
    'vendas', t.vendas,
    'ticket_medio', round(t.realizado / nullif(t.vendas, 0), 2),
    'itens_por_venda', round(t.produtos::numeric / nullif(t.vendas, 0), 4),
    'sem_vendedor', jsonb_build_object('itens', sv.itens, 'valor', round(sv.valor, 2))
  ) as conteudo
  from total t
  join sem_vendedor_total sv on sv.nome = t.nome
),
-- Dia útil: segunda a sábado, menos os feriados cadastrados.
calendario as (
  select d.data, extract(isodow from d.data)::int as dia_da_semana,
         extract(isodow from d.data) < 7 and not exists (select 1 from kaizen.feriado f where f.data = d.data) as util
  from periodo pr
  cross join lateral (select pr.inicio + n as data from generate_series(0, pr.fim - pr.inicio) n) d
),
uteis as (
  select count(*) filter (where c.util) as do_mes,
         count(*) filter (where c.util and c.data <= pr.dia) as decorridos
  from calendario c, periodo pr
),
meta as (
  select m.vendedor, m.valor from kaizen.meta m, periodo pr where m.mes = pr.inicio
),
-- Projeção: o realizado de cada dia antes do dia calculado; e os dias úteis antes dele, a partir do primeiro dia com
-- venda, cada um com o seu realizado (0 sem venda). ordem = 1 é o mais recente de cada dia da semana.
por_dia as (
  select i.dia, sum(i.realizado) as realizado from item i where i.dia < $1::date group by i.dia
),
historia as (
  select h.data, extract(isodow from h.data)::int as dia_da_semana, coalesce(pd.realizado, 0) as realizado,
         row_number() over (partition by extract(isodow from h.data) order by h.data desc) as ordem
  from periodo pr
  cross join (select min(i.dia) as primeiro from item i where i.conta_venda) pv
  cross join lateral (select pv.primeiro + n as data from generate_series(0, pr.dia - 1 - pv.primeiro) n) h
  left join por_dia pd on pd.dia = h.data
  where extract(isodow from h.data) < 7 and not exists (select 1 from kaizen.feriado f where f.data = h.data)
),
media as (
  select h.dia_da_semana, avg(h.realizado) as valor from historia h where h.ordem <= 8 group by h.dia_da_semana
),
projecao as (
  select coalesce((select sum(pd.realizado) from por_dia pd, periodo pr where pd.dia >= pr.inicio), 0)
       + coalesce((select sum(m.valor)
                   from calendario c
                   join media m on m.dia_da_semana = c.dia_da_semana
                   cross join periodo pr
                   where c.util and c.data >= pr.dia), 0) as valor
),
-- Vendedor com meta e ritmo: funcionário do ERP novo com tipo V no cadastro lido por último. Os outros vão para outros.
vendedor as (
  select f.codigo, f.nome from kaizen.funcionario f where f.fonte = 'meuerp' and f.tipo = 'V'
),
por_vendedor as (
  select i.vendedor,
         sum(i.realizado) filter (where i.dia = $1::date) as realizado_dia,
         sum(i.realizado) as realizado_mes,
         count(distinct i.documento) filter (where i.conta_venda) as vendas_mes,
         count(distinct i.pessoa) filter (where i.conta_venda and i.pessoa <> '999007') as clientes
  from item_mes i
  group by i.vendedor
),
-- O grupo vem do cadastro do produto pelo código, de qualquer fonte (os produtos só da Link têm código 'link:…').
mix as (
  select i.vendedor, coalesce(pd.grupo, 'sem grupo') as grupo, sum(i.realizado) as realizado
  from item_mes i
  left join kaizen.produto pd on pd.codigo = i.produto
  group by i.vendedor, coalesce(pd.grupo, 'sem grupo')
)
select jsonb_build_object(
  'dia', (select r.conteudo from resumo r where r.nome = 'dia'),
  'mes', (select r.conteudo || jsonb_build_object(
            'meta', lm.valor,
            'percentual_meta', round(coalesce(r.realizado, 0) / nullif(lm.valor, 0), 4),
            'dias_uteis', u.do_mes,
            'dias_uteis_decorridos', u.decorridos,
            'ritmo', round(coalesce(r.realizado, 0) * u.do_mes / nullif(lm.valor * u.decorridos, 0), 4),
            'projecao', round((select p.valor from projecao p), 2))
          from resumo r
          cross join uteis u
          left join meta lm on lm.vendedor is null
          where r.nome = 'mes'),
  'vendedores', coalesce((
    select jsonb_agg(jsonb_build_object(
      'codigo', v.codigo,
      'nome', v.nome,
      'realizado_dia', round(coalesce(pv.realizado_dia, 0), 2),
      'realizado_mes', round(coalesce(pv.realizado_mes, 0), 2),
      'vendas_mes', coalesce(pv.vendas_mes, 0),
      'meta', m.valor,
      'ritmo', round(coalesce(pv.realizado_mes, 0) * u.do_mes / nullif(m.valor * u.decorridos, 0), 4),
      'clientes_atendidos', coalesce(pv.clientes, 0),
      'mix', coalesce((
        select jsonb_agg(jsonb_build_object('grupo', x.grupo, 'realizado', round(x.realizado, 2))
                         order by x.realizado desc, x.grupo)
        from mix x where x.vendedor = v.codigo), '[]'::jsonb)
    ) order by v.codigo::bigint)
    from vendedor v
    cross join uteis u
    left join por_vendedor pv on pv.vendedor = v.codigo
    left join meta m on m.vendedor = v.codigo), '[]'::jsonb),
  'outros', (
    select jsonb_build_object(
      'realizado_dia', round(coalesce(sum(i.realizado) filter (where i.dia = $1::date), 0), 2),
      'realizado_mes', round(coalesce(sum(i.realizado), 0), 2),
      'vendas_mes', count(distinct i.documento) filter (where i.conta_venda))
    from item_mes i
    where not exists (select 1 from vendedor v where v.codigo = i.vendedor)),
  'por_hora', coalesce((
    select jsonb_agg(jsonb_build_object('hora', h.hora, 'vendas', h.vendas, 'realizado', round(h.realizado, 2)) order by h.hora)
    from (
      select i.hora, count(distinct i.documento) filter (where i.conta_venda) as vendas, sum(i.realizado) as realizado
      from item_mes i group by i.hora
    ) h), '[]'::jsonb),
  'por_dia_da_semana', coalesce((
    select jsonb_agg(jsonb_build_object('dia_da_semana', s.dia_da_semana, 'vendas', s.vendas, 'realizado', round(s.realizado, 2))
                     order by s.dia_da_semana)
    from (
      select extract(isodow from i.dia)::int as dia_da_semana,
             count(distinct i.documento) filter (where i.conta_venda) as vendas, sum(i.realizado) as realizado
      from item_mes i group by 1
    ) s), '[]'::jsonb)
) as resposta
