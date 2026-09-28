-- Fechamento de caixa: o turno aberto fica sem fechado_em. O turno_usuario é o usuário do ERP novo
-- do funcionário ligado; fica vazio se a ligação falhou ou se o funcionário não tem usuário (zero).
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'caixa_fechamento', f.id_caixa_fechamento::text,
  f.id_caixa_fechamento::text,
  'caixa_fechamento',
  null,
  f.data_hora_abertura, f.data_hora,
  null,
  nullif(fu.usuario, 0)
from erp.caixa_fechamento f
left join pg_temp.link_liga lf on lf.entidade = 'funcionario' and lf.codigo_origem = f.id_usuario::text
left join kaizen.funcionario fu on fu.fonte = 'meuerp' and fu.codigo = lf.codigo_kaizen;

-- Conferência às cegas: dinheiro, pix, cartão e nota promissória sempre; cheque e boleto só quando não são zero.
-- O recontado não entra.
insert into pg_temp.link_conferencia (doc_tabela, doc_id, origem_tabela, origem_id, forma, calculado, informado)
select
  'caixa_fechamento', f.id_caixa_fechamento::text,
  'caixa_fechamento', f.id_caixa_fechamento::text || '/' || v.forma,
  v.forma, v.calculado, v.informado
from erp.caixa_fechamento f
cross join lateral (values
  ('dinheiro', f.dinheiro, f.dinheiro_informado),
  ('pix', f.pix, f.pix_informado),
  ('cartao', f.cartao, f.cartao_informado),
  ('nota_promissoria', f.nota_promissoria, f.nota_promissoria_informado),
  ('cheque', f.cheque, f.cheque_informado),
  ('boleto', f.boleto, f.boleto_informado)
) as v (forma, calculado, informado)
where v.forma not in ('cheque', 'boleto')
   or coalesce(v.calculado, 0) <> 0
   or coalesce(v.informado, 0) <> 0;

-- Sangria e suprimento: o modelo cru é a obs e a orientação; o próprio lançamento é o pagamento em dinheiro.
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'pc_lancamento', l.id_pc_lancamento::text,
  l.id_pc_lancamento::text,
  l.obs || '/' || l.orientacao::text,
  null,
  l.data_emissao, l.data_emissao,
  null,
  null
from erp.pc_lancamento l
where l.obs in ('Sangria', 'Suprimento');

insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'pc_lancamento', l.id_pc_lancamento::text,
  'pc_lancamento', l.id_pc_lancamento::text,
  '1.1.1.01',
  l.valor
from erp.pc_lancamento l
where l.obs in ('Sangria', 'Suprimento');
