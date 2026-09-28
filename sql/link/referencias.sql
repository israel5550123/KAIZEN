select 'negociacao.id_cliente' as onde, 'cliente' as tabela, count(*)::int as quantas
from erp.negociacao n
where n.id_cliente is not null and not exists (select 1 from erp.cliente c where c.id_cliente = n.id_cliente)
union all
select 'negociacao.id_usuario', 'usuario', count(*)::int
from erp.negociacao n
where n.id_usuario is not null and not exists (select 1 from erp.usuario u where u.id_usuario = n.id_usuario)
union all
select 'caixa_fechamento.id_usuario', 'usuario', count(*)::int
from erp.caixa_fechamento f
where f.id_usuario is not null and not exists (select 1 from erp.usuario u where u.id_usuario = f.id_usuario)
union all
select 'pc_lancamento_fonte.id_fornecedor', 'fornecedor', count(*)::int
from erp.pc_lancamento_fonte f
where f.id_fornecedor is not null and not exists (select 1 from erp.fornecedor o where o.id_fornecedor = f.id_fornecedor)
union all
select 'nota_entrada.id_fornecedor', 'fornecedor', count(*)::int
from erp.nota_entrada n
where n.id_fornecedor is not null and not exists (select 1 from erp.fornecedor o where o.id_fornecedor = n.id_fornecedor)
union all
select 'compra.id_fornecedor', 'fornecedor', count(*)::int
from erp.compra c
where c.id_fornecedor is not null and not exists (select 1 from erp.fornecedor o where o.id_fornecedor = c.id_fornecedor)
