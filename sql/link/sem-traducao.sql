-- Todo código cru dos documentos da Link e dos filhos precisa de linha na tradução: vazio quando está tudo certo.
-- O modelo é traduzido quatro vezes (tipo, situação, movimento e financeiro pelo modelo); o status, quando existe.
with doc as (
  select k.id, k.modelo, k.status
  from kaizen.documento k
  where k.fonte = 'link'
),
cru (campo, codigo) as (
  select 'tipo', d.modelo from doc d
  union all
  select 'situacao_pelo_modelo', d.modelo from doc d
  union all
  select 'movimento_pelo_modelo', d.modelo from doc d
  union all
  select 'financeiro_pelo_modelo', d.modelo from doc d
  union all
  select 'situacao', d.status from doc d where d.status <> ''
  union all
  select 'forma', p.forma from doc d join kaizen.documento_pagamento p on p.documento_id = d.id
  union all
  select 'forma', c.forma from doc d join kaizen.conferencia_caixa c on c.documento_id = d.id
  union all
  select 'forma', b.forma from doc d join kaizen.parcela pa on pa.documento_id = d.id join kaizen.baixa b on b.parcela_id = pa.id
  union all
  select 'status_parcela', pa.status from doc d join kaizen.parcela pa on pa.documento_id = d.id
  union all
  select 'status_baixa', b.status from doc d join kaizen.parcela pa on pa.documento_id = d.id join kaizen.baixa b on b.parcela_id = pa.id
  union all
  select 'sentido', i.sentido from doc d join kaizen.documento_item i on i.documento_id = d.id
)
select c.campo, c.codigo, count(*) as quantos
from cru c
where not exists (
  select 1 from kaizen.traducao t
  where t.fonte = 'link' and t.campo = c.campo and t.codigo = c.codigo
)
group by c.campo, c.codigo
order by c.campo, c.codigo;
