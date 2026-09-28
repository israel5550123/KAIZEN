-- O resumo do comando link (spec, seção 9), lido do kaizen já gravado e do erp: uma linha por número.
-- Valores em reais no formato da loja (R$ 1.234,56).
with doc as (
  select d.id, d.origem_tabela, d.origem_id, d.modelo, d.tipo, d.situacao, d.criado_em, d.fechado_em, d.pessoa
  from kaizen.documento_negocio d
  where d.fonte = 'link'
),
venda as (
  select d.id, d.origem_id, d.pessoa, d.criado_em
  from doc d
  where d.tipo = 'pedido' and d.situacao = 'emitido'
),
item as (
  select i.documento_id, i.origem_tabela, i.sentido, i.produto, i.valor_liquido, i.vendedor
  from kaizen.documento_item i
  join doc d on d.id = i.documento_id
),
pagamento_venda as (
  select v.origem_id, coalesce(sum(p.valor), 0) as pago
  from venda v
  left join kaizen.documento_pagamento p on p.documento_id = v.id
  group by v.origem_id
),
confere as (
  select pv.origem_id, pv.pago, n.valor_total_venda - n.valor_total_devolucao as devido
  from pagamento_venda pv
  join erp.negociacao n on n.id_negociacao::text = pv.origem_id
),
parcela as (
  select pa.id, pa.valor, pa.status
  from kaizen.parcela pa
  join doc d on d.id = pa.documento_id
),
baixa as (
  select b.valor
  from kaizen.baixa b
  join parcela pa on pa.id = b.parcela_id
),
razao_fora as (
  select
    coalesce(regexp_replace(l.obs, '[0-9]+', 'N', 'g'), '(sem obs)') as obs,
    l.orientacao,
    count(*) as quantos,
    sum(l.valor) as valor
  from erp.pc_lancamento l
  where not exists (
    select 1 from kaizen.documento k
    where k.fonte = 'link' and k.origem_tabela = 'pc_lancamento' and k.origem_id = l.id_pc_lancamento::text
  )
  group by 1, 2
),
-- cada código citado, com o papel: o cliente é a pessoa da venda ou do orçamento; o fornecedor, a da conta ou da nota
citado as (
  select distinct 'cliente' as papel, 'pessoa' as entidade, d.pessoa as codigo from doc d where d.origem_tabela = 'negociacao' and d.pessoa is not null
  union
  select distinct 'fornecedor', 'pessoa', d.pessoa from doc d where d.origem_tabela <> 'negociacao' and d.pessoa is not null
  union
  select distinct 'produto', 'produto', i.produto from item i
  union
  select distinct 'vendedor', 'funcionario', i.vendedor from item i where i.vendedor is not null
),
ligacao as (
  select
    c.papel,
    case
      when c.codigo like 'link:%' then 'falha'
      when exists (
        select 1 from kaizen.de_para dp
        where dp.fonte = 'link' and dp.entidade = c.entidade and dp.codigo_kaizen = c.codigo
      ) then 'decisao'
      else 'regra'
    end as como
  from citado c
),
de_para_falha as (
  select dp.entidade, dp.codigo_origem, dp.codigo_kaizen
  from kaizen.de_para dp
  where dp.fonte = 'link' and dp.codigo_kaizen like 'link:%'
),
-- os itens que dependem de cada falha: todos os do documento da pessoa; só os do produto ou do vendedor
falha_item as (
  select f.entidade, f.codigo_kaizen, d.id as documento_id, i.sentido, i.valor_liquido
  from de_para_falha f
  join doc d on d.pessoa = f.codigo_kaizen
  left join item i on i.documento_id = d.id
  where f.entidade = 'pessoa'
  union all
  select f.entidade, f.codigo_kaizen, i.documento_id, i.sentido, i.valor_liquido
  from de_para_falha f
  join item i
    on (f.entidade = 'produto' and i.produto = f.codigo_kaizen)
    or (f.entidade = 'funcionario' and i.vendedor = f.codigo_kaizen)
),
-- cada falha da de_para, com o que a cita: documentos, vendas válidas e o vendido que depende dela
falha as (
  select
    f.entidade, f.codigo_origem, f.codigo_kaizen,
    coalesce(
      (select p.nome from kaizen.pessoa p where f.entidade = 'pessoa' and p.fonte = 'link' and p.codigo = f.codigo_kaizen),
      (select pr.descricao from kaizen.produto pr where f.entidade = 'produto' and pr.fonte = 'link' and pr.codigo = f.codigo_kaizen),
      (select fu.nome from kaizen.funcionario fu where f.entidade = 'funcionario' and fu.fonte = 'link' and fu.codigo = f.codigo_kaizen)
    ) as nome,
    count(distinct fi.documento_id) as documentos,
    count(distinct v.id) as vendas,
    kaizen.meio_par(coalesce(sum(fi.valor_liquido) filter (where v.id is not null and fi.sentido = 'S'), 0), 2) as vendido
  from de_para_falha f
  left join falha_item fi on fi.entidade = f.entidade and fi.codigo_kaizen = f.codigo_kaizen
  left join venda v on v.id = fi.documento_id
  group by f.entidade, f.codigo_origem, f.codigo_kaizen
),
-- as vendas válidas cujo cliente ou vendedor falhou, e o vendido que depende da falha
venda_falha as (
  select
    'cliente' as papel,
    count(distinct v.id) as vendas,
    kaizen.meio_par(coalesce(sum(i.valor_liquido) filter (where i.sentido = 'S'), 0), 2) as vendido
  from venda v
  left join item i on i.documento_id = v.id
  where v.pessoa like 'link:%'
  union all
  select
    'vendedor',
    count(distinct i.documento_id),
    kaizen.meio_par(coalesce(sum(i.valor_liquido) filter (where i.sentido = 'S'), 0), 2)
  from item i
  where i.vendedor like 'link:%'
    and i.documento_id in (select v.id from venda v)
),
dia as (
  select v.criado_em::date as dia from venda v
  union
  select n.data::date
  from erp.negociacao n
  join erp.caixa c on c.id_negociacao = n.id_negociacao
  where n.venda and not c.inativo
),
linha (ordem, chave, valor) as (
  select 1, 'documentos', count(*)::text from doc
  union all
  select 1, 'documentos:' || coalesce(d.tipo, d.modelo), count(*)::text from doc d group by coalesce(d.tipo, d.modelo)
  union all
  select 2, 'vendas_validas', count(*)::text from venda
  union all
  select 2, 'vendas_canceladas', count(*)::text from doc d where d.tipo = 'pedido' and d.situacao = 'cancelado'
  union all
  select 2, 'orcamentos', count(*)::text from doc d where d.tipo = 'orcamento'
  union all
  select 2, 'vendas_validas_sem_cliente', count(*)::text from venda v where v.pessoa is null
  union all
  select 3, 'itens_vendidos', count(*)::text from item i where i.origem_tabela = 'negociacao_item_vendido'
  union all
  select 3, 'itens_devolvidos', count(*)::text from item i where i.origem_tabela = 'negociacao_item_devolvido'
  union all
  select 3, 'itens_de_nota', count(*)::text from item i where i.origem_tabela = 'compra_item'
  union all
  select 4, 'pagamentos', count(*)::text from kaizen.documento_pagamento p join doc d on d.id = p.documento_id
  union all
  select 4, 'pagamentos_batem',
    count(*) filter (where c.pago = c.devido)::text || ' de ' || count(*)::text || ' vendas válidas somam venda − devolução'
  from confere c
  union all
  select 4, 'pagamentos_nao_batem',
    'negociação ' || c.origem_id
      || ': pagamentos R$ ' || translate(to_char(c.pago, 'FM999,999,999,990.00'), ',.', '.,')
      || ', venda − devolução R$ ' || translate(to_char(c.devido, 'FM999,999,999,990.00'), ',.', '.,')
  from confere c
  where c.pago <> c.devido
  union all
  select 5, 'fechamentos', count(*)::text from doc d where d.tipo = 'fechamento_caixa'
  union all
  select 5, 'turnos_abertos', count(*)::text from doc d where d.tipo = 'fechamento_caixa' and d.fechado_em is null
  union all
  select 5, 'conferencia_linhas', count(*)::text from kaizen.conferencia_caixa c join doc d on d.id = c.documento_id
  union all
  select 6, 'parcelas',
    count(*)::text || ', R$ ' || translate(to_char(coalesce(sum(pa.valor), 0), 'FM999,999,999,990.00'), ',.', '.,')
  from parcela pa
  union all
  select 6, 'parcelas_pendentes',
    count(*)::text || ', R$ ' || translate(to_char(coalesce(sum(pa.valor), 0), 'FM999,999,999,990.00'), ',.', '.,')
  from parcela pa
  where pa.status = 'false'
  union all
  select 6, 'baixas',
    count(*)::text || ', R$ ' || translate(to_char(coalesce(sum(b.valor), 0), 'FM999,999,999,990.00'), ',.', '.,')
  from baixa b
  union all
  select 7, 'razao_fora',
    r.obs || ' (orientação ' || r.orientacao::text || '): ' || r.quantos::text
      || ', R$ ' || translate(to_char(r.valor, 'FM999,999,999,990.00'), ',.', '.,')
  from razao_fora r
  union all
  select 8, 'ligacoes:' || g.papel,
    'regra ' || count(*) filter (where g.como = 'regra')::text
      || ', decisão ' || count(*) filter (where g.como = 'decisao')::text
      || ', falha ' || count(*) filter (where g.como = 'falha')::text
  from ligacao g
  group by g.papel
  union all
  select 8, 'vendas_com_falha:' || vf.papel,
    vf.vendas::text || ' vendas válidas, R$ ' || translate(to_char(vf.vendido, 'FM999,999,999,990.00'), ',.', '.,')
  from venda_falha vf
  union all
  select 9, 'falha',
    f.entidade || ' ' || f.codigo_origem || ' → ' || f.codigo_kaizen || coalesce(' (' || f.nome || ')', '')
      || ': ' || f.documentos::text || ' documentos, ' || f.vendas::text || ' vendas válidas, R$ '
      || translate(to_char(f.vendido, 'FM999,999,999,990.00'), ',.', '.,')
  from falha f
  union all
  select 10, 'dias_comparados', count(*)::text from dia
)
select l.ordem, l.chave, l.valor
from linha l
order by l.ordem, l.chave, l.valor;
