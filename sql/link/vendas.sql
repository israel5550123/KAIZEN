-- Toda negociação da Link vira documento: venda (A/true, T/true) ou orçamento (P/false).
-- A situação crua é o caixa.inativo; o orçamento não tem caixa e fica sem status.
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'negociacao', n.id_negociacao::text,
  coalesce(n.venda_codigo, n.orcamento_codigo)::text,
  n.tipo || '/' || n.venda::text,
  c.inativo::text,
  n.data, c.data_hora,
  lp.codigo_kaizen,
  null
from erp.negociacao n
left join erp.caixa c on c.id_negociacao = n.id_negociacao
left join erp.cliente cl on cl.id_cliente = n.id_cliente
left join pg_temp.link_liga lp on lp.entidade = 'pessoa' and lp.codigo_origem = cl.cliente_codigo;

-- Item vendido: o meio-par do item, depois o desconto e o acréscimo da negociação, sem arredondar o resultado.
-- O trim_scale só tira os zeros à direita que a divisão por 100 deixa (até 46 casas); o valor não muda.
-- Sentido S na venda e N no orçamento, como o movimento do documento no ERP novo.
insert into pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  'negociacao', n.id_negociacao::text,
  'negociacao_item_vendido', v.id_negociacao_item_vendido::text,
  case when n.venda then 'S' else 'N' end,
  lpr.codigo_kaizen,
  v.qtd,
  trim_scale(
    kaizen.meio_par(v.qtd * (v.preco_bruto_unitario + v.valor_acrescimo_padrao) * (1 - v.desconto_percentual / 100), 2)
      * (1 - n.desconto_percentual / 100) * (1 + n.acrescimo_percentual / 100)
  ),
  lf.codigo_kaizen
from erp.negociacao_item_vendido v
join erp.negociacao n on n.id_negociacao = v.id_negociacao
left join erp.produto p on p.id_produto = v.id_produto
left join pg_temp.link_liga lpr on lpr.entidade = 'produto' and lpr.codigo_origem = p.produto_codigo
left join pg_temp.link_liga lf on lf.entidade = 'funcionario' and lf.codigo_origem = n.id_usuario::text;

-- Item devolvido: entra na negociação da troca, com qtd × preço líquido, sem arredondar.
insert into pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  'negociacao', n.id_negociacao::text,
  'negociacao_item_devolvido', d.id_negociacao_item_devolvido::text,
  'E',
  lpr.codigo_kaizen,
  d.qtd,
  d.qtd * d.preco_liquido_unitario,
  lf.codigo_kaizen
from erp.negociacao_item_devolvido d
join erp.negociacao n on n.id_negociacao = d.id_negociacao
left join erp.produto p on p.id_produto = d.id_produto
left join pg_temp.link_liga lpr on lpr.entidade = 'produto' and lpr.codigo_origem = p.produto_codigo
left join pg_temp.link_liga lf on lf.entidade = 'funcionario' and lf.codigo_origem = n.id_usuario::text;

-- Pagamentos do caixa da venda; no cartão, a forma crua leva também o crédito (true) ou débito (false).
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'caixa_parcela', cp.id_caixa_parcela::text,
  case when cp.forma_pagamento = 'Cartao' then 'Cartao/' || cp.credito_ou_debito_cartao::text else cp.forma_pagamento end,
  cp.valor
from erp.caixa_parcela cp
join erp.caixa c on c.id_caixa = cp.id_caixa;

-- Do razão da venda, com o sinal do pedido do ERP novo: na conta 2.1.2.03, o vale usado entra positivo
-- e o vale gerado, negativo.
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'pc_lancamento_parcela', pp.id_pc_lancamento_parcela::text,
  pp.pc_codigo_destino,
  case when pp.destino_positiva then -pp.valor else pp.valor end
from erp.pc_lancamento l
join erp.caixa c on c.id_caixa = l.id_caixa
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento = l.id_pc_lancamento
where pp.pc_codigo_destino = '2.1.2.03';

-- O dinheiro devolvido ao cliente (parcela 1.1.1.01 não positiva) entra negativo, como o troco.
-- As parcelas 1.1.1.01 positivas repetem o dinheiro do caixa_parcela e não entram.
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'pc_lancamento_parcela', pp.id_pc_lancamento_parcela::text,
  pp.pc_codigo_destino,
  -pp.valor
from erp.pc_lancamento l
join erp.caixa c on c.id_caixa = l.id_caixa
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento = l.id_pc_lancamento
where pp.pc_codigo_destino = '1.1.1.01' and not pp.destino_positiva;

-- A bonificação usada na venda (a 358) aparece como fonte 2.1.2.03 do lançamento da venda.
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'pc_lancamento_fonte', f.id_pc_lancamento_fonte::text,
  f.pc_codigo_origem,
  case when f.origem_positiva then -f.valor else f.valor end
from erp.pc_lancamento l
join erp.caixa c on c.id_caixa = l.id_caixa
join erp.pc_lancamento_fonte f on f.id_pc_lancamento = l.id_pc_lancamento
where f.pc_codigo_origem = '2.1.2.03';
