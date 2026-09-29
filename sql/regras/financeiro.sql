-- Financeiro do dia $1 (spec da Fase 4, seção 8.4). Dois cortes (decisão 16): a posição do dia (contas a pagar,
-- folgas, fluxo previsto) usa uma fonte só, a Link até 25/09/2026 e o ERP novo a partir de 26/09/2026; os fluxos
-- (realizado, recebíveis, caixa) usam a fonte de cada dia, e o mês soma os dias, cada um pela sua fonte.
-- Dinheiro: soma sem arredondar e round(…, 2) só no total.
with dia as (
  select
    $1::date as d,
    date_trunc('month', $1::date::timestamp)::date as inicio_mes,
    case when $1::date <= date '2026-09-25' then 'link' else 'meuerp' end as fonte
),
-- kaizen.documento_papel é uma visão cara (junta documento com várias traduções); lida uma vez só aqui (como
-- sql/regras/vendas.sql:12 já faz) e usada no lugar dela abaixo, em vez de o Postgres refazer a junção a cada CTE
-- que precisa dela — a `saida`, por exemplo, refazia a junção para cada baixa do mês.
papel as materialized (
  select * from kaizen.documento_papel
),
-- Parcela em aberto no fim do dia: de conta a pagar ou compra, lançada até o dia, não cancelada, e com o valor
-- menos as baixas válidas até o dia maior que zero. O valor dela é o que falta pagar.
aberta as (
  select pa.vencimento, pa.valor - coalesce(bx.pago, 0) as valor
  from dia
  join papel dp on dp.fonte = dia.fonte and dp.papel in ('conta_pagar', 'compra')
  join kaizen.parcela pa on pa.documento_id = dp.id
  left join kaizen.traducao tp on tp.fonte = dp.fonte and tp.campo = 'status_parcela' and tp.codigo = pa.status
  cross join lateral (
    select sum(b.valor) as pago
    from kaizen.baixa b
    join kaizen.traducao tb on tb.fonte = dp.fonte and tb.campo = 'status_baixa' and tb.codigo = b.status
    where b.parcela_id = pa.id and tb.valor = 'valida' and b.pago_em <= dia.d
  ) bx
  where pa.lancado_em <= dia.d and tp.valor is distinct from 'cancelada' and pa.valor - coalesce(bx.pago, 0) > 0
),
posicao as (
  select
    count(*) filter (where a.vencimento < dia.d) as vencidas_parcelas,
    coalesce(sum(a.valor) filter (where a.vencimento < dia.d), 0) as vencidas,
    count(*) filter (where a.vencimento between dia.d and dia.d + 7) as ate_7_parcelas,
    coalesce(sum(a.valor) filter (where a.vencimento between dia.d and dia.d + 7), 0) as ate_7,
    count(*) filter (where a.vencimento between dia.d and dia.d + 30) as ate_30_parcelas,
    coalesce(sum(a.valor) filter (where a.vencimento between dia.d and dia.d + 30), 0) as ate_30,
    count(*) as total_parcelas,
    coalesce(sum(a.valor), 0) as total
  from aberta a
  cross join dia
),
saldo as (
  select s.data, s.valor
  from dia
  join kaizen.saldo_banco s on s.data <= dia.d
  order by s.data desc
  limit 1
),
-- Pagamentos dos documentos do caixa, cada documento pela fonte do dia dele, com a forma traduzida.
pagamento as (
  select dp.dia, dp.papel, tf.valor as forma, pg.valor
  from papel dp
  join kaizen.documento_pagamento pg on pg.documento_id = dp.id
  left join kaizen.traducao tf on tf.fonte = dp.fonte and tf.campo = 'forma' and tf.codigo = pg.forma
  where dp.papel in ('venda', 'troca', 'suprimento', 'suprimento_adicional', 'sangria')
    and dp.fonte = case when dp.dia <= date '2026-09-25' then 'link' else 'meuerp' end
),
-- Entradas: pagamentos das vendas, menos o vale (forma troca). Crédito, débito e cartão entram no dia seguinte
-- ao da venda (o recebível); dinheiro, Pix e as outras formas, no dia da venda.
entrada as (
  select
    case when p.forma in ('credito', 'debito', 'cartao') then p.dia + 1 else p.dia end as dia,
    case when p.forma in ('dinheiro', 'pix', 'credito', 'debito', 'cartao') then p.forma else 'outras' end as forma,
    p.valor
  from pagamento p
  where p.papel = 'venda' and p.forma is distinct from 'troca'
),
-- Saídas: baixas válidas das contas a pagar, pela data da baixa e pela fonte desse dia, menos a forma troca;
-- mais o dinheiro devolvido nas trocas, no dia da troca.
saida as (
  select b.pago_em as dia, b.valor
  from papel dp
  join kaizen.parcela pa on pa.documento_id = dp.id
  join kaizen.baixa b on b.parcela_id = pa.id
  join kaizen.traducao tb on tb.fonte = dp.fonte and tb.campo = 'status_baixa' and tb.codigo = b.status
  left join kaizen.traducao tf on tf.fonte = dp.fonte and tf.campo = 'forma' and tf.codigo = b.forma
  where dp.papel in ('conta_pagar', 'compra') and tb.valor = 'valida' and tf.valor is distinct from 'troca'
    and dp.fonte = case when b.pago_em <= date '2026-09-25' then 'link' else 'meuerp' end
  union all
  select p.dia, p.valor
  from pagamento p
  where p.papel = 'troca' and p.forma = 'dinheiro'
),
fluxo as (
  select
    periodo.nome,
    jsonb_build_object(
      'entradas', (
        select jsonb_build_object(
          'dinheiro', round(coalesce(sum(e.valor) filter (where e.forma = 'dinheiro'), 0), 2),
          'pix', round(coalesce(sum(e.valor) filter (where e.forma = 'pix'), 0), 2),
          'credito', round(coalesce(sum(e.valor) filter (where e.forma = 'credito'), 0), 2),
          'debito', round(coalesce(sum(e.valor) filter (where e.forma = 'debito'), 0), 2),
          'cartao', round(coalesce(sum(e.valor) filter (where e.forma = 'cartao'), 0), 2),
          'outras', round(coalesce(sum(e.valor) filter (where e.forma = 'outras'), 0), 2)
        )
        from entrada e
        where e.dia between periodo.de and dia.d
      ),
      'saidas', (
        select round(coalesce(sum(s.valor), 0), 2)
        from saida s
        where s.dia between periodo.de and dia.d
      )
    ) as conteudo
  from dia
  cross join lateral (values ('dia', dia.d), ('mes', dia.inicio_mes)) as periodo (nome, de)
),
-- Recebível de cartão: as vendas no crédito, no débito ou em cartão do dia, a creditar no dia seguinte.
recebivel as (
  select round(coalesce(sum(p.valor), 0), 2) as valor
  from dia
  join pagamento p on p.dia = dia.d
  where p.papel = 'venda' and p.forma in ('credito', 'debito', 'cartao')
),
fechamento as (
  select d.id, d.fonte, d.codigo, coalesce(d.fechado_em, d.criado_em) as momento
  from dia
  join papel dp on dp.fonte = dia.fonte and dp.dia = dia.d and dp.papel = 'fechamento_caixa'
  join kaizen.documento d on d.id = dp.id
),
-- Gaveta do dia, só o dinheiro: o das vendas (com o troco e o dinheiro devolvido da Link, que já vêm negativos),
-- os suprimentos, as sangrias e o dinheiro devolvido nas trocas.
gaveta as (
  select
    coalesce(sum(p.valor) filter (where p.papel = 'venda'), 0) as vendas,
    coalesce(sum(p.valor) filter (where p.papel in ('suprimento', 'suprimento_adicional')), 0) as suprimentos,
    coalesce(sum(p.valor) filter (where p.papel = 'sangria'), 0) as sangrias,
    coalesce(sum(p.valor) filter (where p.papel = 'troca'), 0) as trocas
  from dia
  join pagamento p on p.dia = dia.d
  where p.forma = 'dinheiro'
)
select jsonb_build_object(
  'fonte', dia.fonte,
  'contas_a_pagar', jsonb_build_object(
    'vencidas', jsonb_build_object('parcelas', po.vencidas_parcelas, 'valor', round(po.vencidas, 2)),
    'ate_7_dias', jsonb_build_object('parcelas', po.ate_7_parcelas, 'valor', round(po.ate_7, 2)),
    'ate_30_dias', jsonb_build_object('parcelas', po.ate_30_parcelas, 'valor', round(po.ate_30, 2)),
    'total', jsonb_build_object('parcelas', po.total_parcelas, 'valor', round(po.total, 2)),
    'por_vencimento', coalesce((
      select jsonb_agg(jsonb_build_object(
        'vencimento', to_char(v.vencimento, 'YYYY-MM-DD'), 'parcelas', v.parcelas, 'valor', round(v.valor, 2)
      ) order by v.vencimento)
      from (select a.vencimento, count(*) as parcelas, sum(a.valor) as valor from aberta a group by a.vencimento) v
    ), '[]'::jsonb)
  ),
  'saldo_banco', case when sb.data is not null
    then jsonb_build_object('data', to_char(sb.data, 'YYYY-MM-DD'), 'valor', round(sb.valor, 2)) end,
  'folga_7', round(sb.valor - (po.vencidas + po.ate_7), 2),
  'folga_30', round(sb.valor - (po.vencidas + po.ate_30), 2),
  'fluxo_realizado', (select jsonb_object_agg(f.nome, f.conteudo) from fluxo f),
  'recebiveis_cartao', jsonb_build_object('credito_em', to_char(dia.d + 1, 'YYYY-MM-DD'), 'valor', (select r.valor from recebivel r)),
  'fluxo_previsto', (
    select jsonb_agg(jsonb_build_object(
      'data', to_char(dia.d + n, 'YYYY-MM-DD'),
      'entradas', case when n = 1 then (select r.valor from recebivel r) else 0 end,
      'saidas', round(coalesce((select sum(a.valor) from aberta a where a.vencimento = dia.d + n), 0), 2)
    ) order by n)
    from generate_series(1, 30) as n
  ),
  'caixa', jsonb_build_object(
    'fechamentos', coalesce((
      select jsonb_agg(jsonb_build_object('codigo', f.codigo, 'quebra', q.quebra, 'formas', q.formas) order by f.momento, f.id)
      from fechamento f
      cross join lateral (
        select
          coalesce(jsonb_agg(jsonb_build_object(
            'forma', x.forma, 'calculado', round(x.calculado, 2), 'informado', round(x.informado, 2),
            'quebra', round(x.informado - x.calculado, 2)
          ) order by x.forma), '[]'::jsonb) as formas,
          round(coalesce(sum(x.informado - x.calculado), 0), 2) as quebra
        from (
          -- por forma traduzida (2 e 6 são as duas pix), sem a linha da troca
          select tf.valor as forma, sum(coalesce(cc.calculado, 0)) as calculado, sum(coalesce(cc.informado, 0)) as informado
          from kaizen.conferencia_caixa cc
          left join kaizen.traducao tf on tf.fonte = f.fonte and tf.campo = 'forma' and tf.codigo = cc.forma
          where cc.documento_id = f.id and tf.valor is distinct from 'troca'
          group by tf.valor
        ) x
      ) q
    ), '[]'::jsonb),
    'gaveta', jsonb_build_object(
      'vendas_dinheiro', round(g.vendas, 2),
      'suprimentos', round(g.suprimentos, 2),
      'sangrias', round(g.sangrias, 2),
      'devolucoes_dinheiro', round(g.trocas, 2),
      'gaveta', round(g.vendas + g.suprimentos - g.sangrias - g.trocas, 2)
    )
  )
) as resposta
from dia
cross join posicao po
cross join gaveta g
left join saldo sb on true