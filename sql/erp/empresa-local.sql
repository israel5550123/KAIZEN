select coalesce(json_agg(json_build_object('tabela', v.tabela, 'valor', v.valor) order by v.tabela collate "C", v.valor), '[]')::text as dados
from (
  select 'documento.idempresa' as tabela, d.idempresa as valor
  from documento d where d.oid > {{corte_documento}} and d.idempresa <> 1
  union
  select 'mercadoria_estoque_historico._idlocalestoque', h._idlocalestoque
  from mercadoria_estoque_historico h where h.oid > {{corte_historico}} and h._idlocalestoque <> 1
  union
  select 'mercadoria_estoque._idempresa', me._idempresa
  from mercadoria_estoque me where me._idempresa <> 1
  union
  select 'mercadoria_estoque._idlocalestoque', ml._idlocalestoque
  from mercadoria_estoque ml where ml._idlocalestoque <> 1
  union
  select 'mercadoria_custo._idempresa', mc._idempresa
  from mercadoria_custo mc where mc._idempresa <> 1
  union
  select 'mercadoria_variacao_empresa._idempresa', ve._idempresa
  from mercadoria_variacao_empresa ve where ve._idempresa <> 1
  union
  select 'mercadoria_variacao_pessoa._idempresa', vp._idempresa
  from mercadoria_variacao_pessoa vp where vp._idempresa <> 1
  union
  select 'pessoa_funcionario._idempresa', pf._idempresa
  from pessoa_funcionario pf where pf._idempresa <> 1
) as v
