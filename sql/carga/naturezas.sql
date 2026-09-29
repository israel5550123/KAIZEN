-- Uma versão nova para cada natureza lida que o Kaizen ainda não tem, ou cuja última versão difere em alguma
-- coluna (spec da Fase 4, seção 6). A natureza que sumiu do ERP fica como está. Devolve só as que mudaram,
-- com a versão anterior e a nova: a primeira versão de um código não é mudança.
with lida as (
  select
    n->>'codigo' as codigo,
    n->>'descricao' as descricao,
    n->>'categoria' as categoria,
    coalesce(n->>'estoque' = 'T', false) as estoque,
    coalesce(n->>'reserva' = 'T', false) as reserva,
    coalesce(n->>'financeiro' = 'T', false) as financeiro,
    -- a troca é a natureza que a configuração do ERP aponta, não uma categoria
    coalesce(n->>'codigo' = x.dados->>'troca', false) as troca
  from pg_temp.entrada x, jsonb_array_elements(x.dados->'naturezas') n
  where x.assunto = 'naturezas'
),
ultima as (
  select distinct on (v.codigo) v.codigo, v.descricao, v.categoria, v.estoque, v.reserva, v.financeiro, v.troca
  from kaizen.natureza v
  where v.fonte = 'meuerp'
  order by v.codigo, v.id desc
),
nova as (
  insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca)
  select 'meuerp', l.codigo, l.descricao, l.categoria, l.estoque, l.reserva, l.financeiro, l.troca
  from lida l
  left join ultima u on u.codigo = l.codigo
  where u.codigo is null
     or (l.descricao, l.categoria, l.estoque, l.reserva, l.financeiro, l.troca)
        is distinct from (u.descricao, u.categoria, u.estoque, u.reserva, u.financeiro, u.troca)
  order by l.codigo::bigint
  returning id, codigo, descricao, categoria, estoque, reserva, financeiro, troca
)
select
  nv.id,
  nv.codigo,
  jsonb_build_object('descricao', u.descricao, 'categoria', u.categoria, 'estoque', u.estoque,
    'reserva', u.reserva, 'financeiro', u.financeiro, 'troca', u.troca) as antes,
  jsonb_build_object('descricao', nv.descricao, 'categoria', nv.categoria, 'estoque', nv.estoque,
    'reserva', nv.reserva, 'financeiro', nv.financeiro, 'troca', nv.troca) as depois
from nova nv
join ultima u on u.codigo = nv.codigo
order by nv.codigo::bigint
