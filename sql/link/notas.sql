-- Nota de entrada: o fornecedor ganha 900000 no código, como no ERP novo.
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'nota_entrada', ne.id_nota_entrada::text,
  ne.id_nota_entrada::text,
  ne.modelo,
  null,
  ne.data_hora_insert, ne.data_hora_insert,
  lp.codigo_kaizen,
  null
from erp.nota_entrada ne
left join erp.fornecedor fo on fo.id_fornecedor = ne.id_fornecedor
left join pg_temp.link_liga lp on lp.entidade = 'pessoa' and lp.codigo_origem = (fo.fornecedor_codigo + 900000)::text;

-- Itens da compra da nota, já na unidade do estoque: E quando a entrada foi concluída, senão N.
insert into pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  'nota_entrada', co.id_nota_entrada::text,
  'compra_item', ci.id_compra_item::text,
  case when ci.entrada_concluida then 'E' else 'N' end,
  lpr.codigo_kaizen,
  ci.qtd,
  null,
  null
from erp.compra_item ci
join erp.compra co on co.id_compra = ci.id_compra
join pg_temp.link_doc d on d.origem_tabela = 'nota_entrada' and d.origem_id = co.id_nota_entrada::text
left join erp.produto p on p.id_produto = ci.id_produto
left join pg_temp.link_liga lpr on lpr.entidade = 'produto' and lpr.codigo_origem = p.produto_codigo;
