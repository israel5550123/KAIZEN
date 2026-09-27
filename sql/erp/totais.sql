with dc as (
  select d._iddocumento as iddoc, d.modelo as modelo, d.status as situacao,
    d.tipomovimentofinanceiro as financeiro, to_char(d.datahora, 'YYYY-MM-DD') as dia
  from documento d
  where d.oid > {{corte_documento}} and d.oid <= {{documento_ate}}
),
ds as (
  select distinct dx.dia as dia from dc dx
),
it as (
  select di.dia as dia, sum(m.valtotalliquido) as valor
  from dc di
  join documento_mercadoria m on m._iddocumento = di.iddoc and m.oid > {{corte_item}}
  group by di.dia
),
pa as (
  select dp.dia as dia, sum(p.valor) as valor
  from dc dp
  join documento_pagamento p on p._iddocumento = dp.iddoc and p.oid > {{corte_pagamento}}
  group by dp.dia
),
pc as (
  select dq.dia as dia, count(*) as quantidade, sum(q.valparcela) as valor
  from dc dq
  join documento_parcela q on q._iddocumento = dq.iddoc and q.oid > {{corte_parcela}}
  where dq.financeiro = 'P'
  group by dq.dia
),
bx as (
  select db.dia as dia, count(*) as quantidade, sum(b.valpagamento) as valor
  from dc db
  join documento_parcela qb on qb._iddocumento = db.iddoc and qb.oid > {{corte_parcela}}
  join documento_parcela_pagamento b on b._iddocumento = qb._iddocumento and b._idsequencia = qb._idsequencia
    and b._idparcela = qb._idparcela and b.oid > {{corte_baixa}}
  where db.financeiro = 'P'
  group by db.dia
),
cf as (
  select dk.dia as dia, sum(c.valdisponivel) as calculado, sum(c.valconferido) as informado
  from dc dk
  join documento_conferencia_caixa c on c._iddocumento = dk.iddoc and c.oid > {{corte_conferencia}}
  group by dk.dia
),
mv as (
  select to_char(h.datahora, 'YYYY-MM-DD') as dia, count(*) as quantidade,
    sum(coalesce(h.qtdnovosaldo, 0) - coalesce(h.qtdsaldoatual, 0)) as variacao
  from mercadoria_estoque_historico h
  where h.oid > {{corte_historico}} and h.oid <= {{movimento_ate}}
  group by to_char(h.datahora, 'YYYY-MM-DD')
),
tt as (
  select dm.dia as dia, 'documentos:' || dm.modelo || ':' || coalesce(dm.situacao, '-') as medida, count(*)::text as valor
  from dc dm
  group by dm.dia, dm.modelo, dm.situacao
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
select coalesce(json_agg(json_build_object('dia', tt.dia, 'medida', tt.medida, 'valor', tt.valor)
  order by tt.dia collate "C", tt.medida collate "C"), '[]')::text as dados
from tt
