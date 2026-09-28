-- arredonda a <casas> casas; no empate exato de meio, vai para o par (109,725 -> 109,72; 90,915 -> 90,92)
create function kaizen.meio_par(valor numeric, casas integer) returns numeric
language sql immutable
as $$
  select case
    when abs(valor * power(10::numeric, casas) % 1) = 0.5
      then round(round(valor * power(10::numeric, casas) / 2) * 2 / power(10::numeric, casas), casas)
    else round(valor, casas)
  end
$$;

-- a situação sem coluna própria (orçamento, fechamento, sangria, suprimento, conta, nota da Link) vem pelo modelo
create or replace view kaizen.documento_negocio as
select
  d.id, d.fonte, d.origem_tabela, d.origem_id, d.codigo, d.modelo,
  tt.valor as tipo,
  d.status,
  coalesce(ts.valor, tsm.valor) as situacao,
  coalesce(tm.valor, tmm.valor) as movimento,
  coalesce(tf.valor, tfm.valor) as financeiro,
  d.criado_em, d.fechado_em, d.pessoa,
  d.turno_caixa, d.turno_usuario, d.turno_numero, d.visto_em
from kaizen.documento d
left join kaizen.traducao tt on tt.fonte = d.fonte and tt.campo = 'tipo' and tt.codigo = d.modelo
left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'situacao' and ts.codigo = d.status
left join kaizen.traducao tsm on tsm.fonte = d.fonte and tsm.campo = 'situacao_pelo_modelo' and tsm.codigo = d.modelo
left join kaizen.traducao tm on tm.fonte = d.fonte and tm.campo = 'movimento' and tm.codigo = d.movimento
left join kaizen.traducao tmm on tmm.fonte = d.fonte and tmm.campo = 'movimento_pelo_modelo' and tmm.codigo = d.modelo
left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'financeiro' and tf.codigo = d.financeiro
left join kaizen.traducao tfm on tfm.fonte = d.fonte and tfm.campo = 'financeiro_pelo_modelo' and tfm.codigo = d.modelo;

-- os códigos da Link no vocabulário do ERP novo; cartao, banco e nota_entrada são os três valores que ele não tem
insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('link', 'tipo', 'A/true', 'pedido'),
  ('link', 'tipo', 'T/true', 'pedido'),
  ('link', 'tipo', 'P/false', 'orcamento'),
  ('link', 'tipo', 'caixa_fechamento', 'fechamento_caixa'),
  ('link', 'tipo', 'Sangria/true', 'sangria'),
  ('link', 'tipo', 'Sangria/false', 'sangria'),
  ('link', 'tipo', 'Suprimento/true', 'suprimento'),
  ('link', 'tipo', '2.1.2.02', 'conta_pagar'),
  ('link', 'tipo', '2.1.3.07', 'conta_pagar'),
  ('link', 'tipo', '2.1.4.10', 'conta_pagar'),
  ('link', 'tipo', '2.1.5.02', 'conta_pagar'),
  ('link', 'tipo', '55', 'nota_entrada'),
  ('link', 'situacao', 'false', 'emitido'),
  ('link', 'situacao', 'true', 'cancelado'),
  ('link', 'situacao_pelo_modelo', 'A/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'T/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'P/false', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'caixa_fechamento', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'Sangria/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'Sangria/false', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'Suprimento/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.2.02', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.3.07', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.4.10', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.5.02', 'emitido'),
  ('link', 'situacao_pelo_modelo', '55', 'emitido'),
  ('link', 'movimento_pelo_modelo', 'A/true', 'saida'),
  ('link', 'movimento_pelo_modelo', 'T/true', 'saida'),
  ('link', 'movimento_pelo_modelo', 'P/false', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'caixa_fechamento', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'Sangria/true', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'Sangria/false', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'Suprimento/true', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.2.02', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.3.07', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.4.10', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.5.02', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '55', 'entrada'),
  ('link', 'financeiro_pelo_modelo', 'A/true', 'recebe'),
  ('link', 'financeiro_pelo_modelo', 'T/true', 'recebe'),
  ('link', 'financeiro_pelo_modelo', 'P/false', 'nenhum'),
  ('link', 'financeiro_pelo_modelo', 'caixa_fechamento', 'nenhum'),
  ('link', 'financeiro_pelo_modelo', 'Sangria/true', 'paga'),
  ('link', 'financeiro_pelo_modelo', 'Sangria/false', 'paga'),
  ('link', 'financeiro_pelo_modelo', 'Suprimento/true', 'nenhum'),
  ('link', 'financeiro_pelo_modelo', '2.1.2.02', 'paga'),
  ('link', 'financeiro_pelo_modelo', '2.1.3.07', 'paga'),
  ('link', 'financeiro_pelo_modelo', '2.1.4.10', 'paga'),
  ('link', 'financeiro_pelo_modelo', '2.1.5.02', 'paga'),
  ('link', 'financeiro_pelo_modelo', '55', 'nenhum'),
  ('link', 'forma', 'Dinheiro', 'dinheiro'),
  ('link', 'forma', 'Pix', 'pix'),
  ('link', 'forma', 'Cartao/true', 'credito'),
  ('link', 'forma', 'Cartao/false', 'debito'),
  ('link', 'forma', '2.1.2.03', 'troca'),
  ('link', 'forma', '1.1.1.01', 'dinheiro'),
  ('link', 'forma', '1.1.1.02.01', 'banco'),
  ('link', 'forma', 'dinheiro', 'dinheiro'),
  ('link', 'forma', 'pix', 'pix'),
  ('link', 'forma', 'cartao', 'cartao'),
  ('link', 'forma', 'nota_promissoria', 'troca'),
  ('link', 'forma', 'cheque', 'cheque'),
  ('link', 'forma', 'boleto', 'boleto'),
  ('link', 'status_parcela', 'false', 'pendente'),
  ('link', 'status_parcela', 'true', 'baixada'),
  ('link', 'status_baixa', 'true', 'valida'),
  ('link', 'sentido', 'S', 'saida'),
  ('link', 'sentido', 'E', 'entrada'),
  ('link', 'sentido', 'N', 'nenhum');
