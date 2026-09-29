-- As três naturezas da Link (spec da Fase 4, decisão 9): o comportamento que a Link tinha, fixo.
insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca, valida_desde) values
  ('link', 'pedido', 'PEDIDO DA LINK', 'V', true, false, true, false, '2026-04-01 00:00:00-03'),
  ('link', 'orcamento', 'ORÇAMENTO DA LINK', 'V', false, false, false, false, '2026-04-01 00:00:00-03'),
  ('link', 'nota_entrada', 'NOTA DE ENTRADA DA LINK', 'C', true, false, false, false, '2026-04-01 00:00:00-03');

insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('link', 'natureza_pelo_modelo', 'A/true', 'pedido'),
  ('link', 'natureza_pelo_modelo', 'T/true', 'pedido'),
  ('link', 'natureza_pelo_modelo', 'P/false', 'orcamento'),
  ('link', 'natureza_pelo_modelo', '55', 'nota_entrada');
