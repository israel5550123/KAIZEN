-- $1: totais do ERP (sql/erp/totais.sql); $2: maior oid de documento lido; $3: maior oid de movimento lido.
-- Os dois lados usam os mesmos filtros da carga, por dia de criado_em (documentos) e de momento (movimentos).
with erp as (
  select e->>'dia' as dia, e->>'medida' as medida, e->>'valor' as valor
  from jsonb_array_elements($1::jsonb) e
),
dc as (
  select d.id, d.modelo, d.status, d.financeiro, to_char(d.criado_em, 'YYYY-MM-DD') as dia
  from kaizen.documento d
  where d.fonte = 'meuerp' and d.origem_id::bigint <= $2::bigint
),
ds as (
  select distinct dc.dia from dc
),
it as (
  select dc.dia, sum(i.valor_liquido) as valor
  from dc join kaizen.documento_item i on i.documento_id = dc.id
  group by dc.dia
),
pa as (
  select dc.dia, sum(p.valor) as valor
  from dc join kaizen.documento_pagamento p on p.documento_id = dc.id
  group by dc.dia
),
pc as (
  select dc.dia, count(*) as quantidade, sum(q.valor) as valor
  from dc join kaizen.parcela q on q.documento_id = dc.id
  where dc.financeiro = 'P'
  group by dc.dia
),
bx as (
  select dc.dia, count(*) as quantidade, sum(b.valor) as valor
  from dc
  join kaizen.parcela q on q.documento_id = dc.id
  join kaizen.baixa b on b.parcela_id = q.id
  where dc.financeiro = 'P'
  group by dc.dia
),
cf as (
  select dc.dia, sum(c.calculado) as calculado, sum(c.informado) as informado
  from dc join kaizen.conferencia_caixa c on c.documento_id = dc.id
  group by dc.dia
),
mv as (
  select to_char(m.momento, 'YYYY-MM-DD') as dia, count(*) as quantidade,
    sum(coalesce(m.saldo_depois, 0) - coalesce(m.saldo_antes, 0)) as variacao
  from kaizen.estoque_movimento m
  where m.fonte = 'meuerp' and m.origem_id::bigint <= $3::bigint
  group by 1
),
kz as (
  select dc.dia, 'documentos:' || dc.modelo || ':' || coalesce(dc.status, '-') as medida, count(*)::text as valor
  from dc
  group by dc.dia, dc.modelo, dc.status
  union all
  select ds.dia, v.medida, v.valor
  from ds
  left join it on it.dia = ds.dia
  left join pa on pa.dia = ds.dia
  left join pc on pc.dia = ds.dia
  left join bx on bx.dia = ds.dia
  left join cf on cf.dia = ds.dia
  cross join lateral (values
    ('itens:valor', coalesce(it.valor, 0)::text),
    ('pagamentos:valor', coalesce(pa.valor, 0)::text),
    ('parcelas:quantidade', coalesce(pc.quantidade, 0)::text),
    ('parcelas:valor', coalesce(pc.valor, 0)::text),
    ('baixas:quantidade', coalesce(bx.quantidade, 0)::text),
    ('baixas:valor', coalesce(bx.valor, 0)::text),
    ('conferencia:calculado', coalesce(cf.calculado, 0)::text),
    ('conferencia:informado', coalesce(cf.informado, 0)::text)
  ) as v (medida, valor)
  union all
  select mv.dia, w.medida, w.valor
  from mv
  cross join lateral (values
    ('movimentos:quantidade', mv.quantidade::text),
    ('movimentos:variacao', mv.variacao::text)
  ) as w (medida, valor)
)
select
  coalesce(e.dia, k.dia) as dia,
  coalesce(e.medida, k.medida) as medida,
  coalesce(e.valor, '0') as erp,
  coalesce(k.valor, '0') as kaizen
from erp e
full outer join kz k on k.dia = e.dia and k.medida = e.medida
where coalesce(e.valor::numeric, 0) <> coalesce(k.valor::numeric, 0)
order by 1, 2
