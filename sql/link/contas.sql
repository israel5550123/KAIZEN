-- Conta a pagar: lançamento sem caixa com ao menos uma parcela positiva numa conta 2.x, fora a 2.1.2.03
-- (vale e bonificação são crédito de cliente, não conta). O modelo cru é a menor dessas contas.
-- O fornecedor é o da fonte do lançamento; sem ele, o da compra (compra.id_compra = id_ped_entrada).
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
with conta as (
  select pp.id_pc_lancamento, min(pp.pc_codigo_destino) as modelo
  from erp.pc_lancamento_parcela pp
  where pp.destino_positiva and pp.pc_codigo_destino like '2.%' and pp.pc_codigo_destino <> '2.1.2.03'
  group by pp.id_pc_lancamento
)
select
  'pc_lancamento', l.id_pc_lancamento::text,
  l.id_pc_lancamento::text,
  ct.modelo,
  null,
  l.data_emissao, null,
  lp.codigo_kaizen,
  null
from conta ct
join erp.pc_lancamento l on l.id_pc_lancamento = ct.id_pc_lancamento
left join erp.pc_lancamento_fonte f on f.id_pc_lancamento = l.id_pc_lancamento
left join erp.compra co on co.id_compra = f.id_ped_entrada
left join erp.fornecedor fo on fo.id_fornecedor = coalesce(f.id_fornecedor, co.id_fornecedor)
left join pg_temp.link_liga lp on lp.entidade = 'pessoa' and lp.codigo_origem = (fo.fornecedor_codigo + 900000)::text
where l.id_caixa is null;

-- Parcelas: todas as do lançamento da conta (as contas já estão em link_doc, com o modelo 2.x).
insert into pg_temp.link_parcela (doc_tabela, doc_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao)
select
  d.origem_tabela, d.origem_id,
  'pc_lancamento_parcela', pp.id_pc_lancamento_parcela::text,
  d.criado_em::date,
  nullif(pp.data_vencimento, date '0001-01-01'),
  pp.valor,
  pp.liquidada::text,
  pp.documento
from pg_temp.link_doc d
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento::text = d.origem_id
where d.origem_tabela = 'pc_lancamento' and d.modelo like '2.%';

-- Baixas: a fonte de outro lançamento que aponta para a parcela. Paga no dia desse lançamento,
-- pela conta de destino da parcela dele (a menor, se houver mais de uma).
insert into pg_temp.link_baixa (doc_tabela, doc_id, parcela_origem_id, origem_tabela, origem_id, pago_em, valor, forma, status)
with forma as (
  select x.id_pc_lancamento, min(x.pc_codigo_destino) as forma
  from erp.pc_lancamento_parcela x
  group by x.id_pc_lancamento
)
select
  d.origem_tabela, d.origem_id,
  pp.id_pc_lancamento_parcela::text,
  'pc_lancamento_fonte', f.id_pc_lancamento_fonte::text,
  pg.data_emissao::date,
  f.valor,
  fm.forma,
  pp.liquidada::text
from pg_temp.link_doc d
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento::text = d.origem_id
join erp.pc_lancamento_fonte f on f.id_pc_lancamento_parcela = pp.id_pc_lancamento_parcela and f.id_pc_lancamento <> pp.id_pc_lancamento
join erp.pc_lancamento pg on pg.id_pc_lancamento = f.id_pc_lancamento
left join forma fm on fm.id_pc_lancamento = f.id_pc_lancamento
where d.origem_tabela = 'pc_lancamento' and d.modelo like '2.%';
