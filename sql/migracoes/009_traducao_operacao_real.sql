-- Conferência da operação real (28/09/2026): traduz os 7 códigos que a primeira leitura na VPS (17h23) achou sem
-- tradução, lidos no ERP à tarde do mesmo dia (docs/superpowers/plans/2026-09-28-fase2-conferencia-codigos.md).
insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('meuerp', 'forma', '6', 'pix'),
  ('meuerp', 'forma', '7', 'credito'),
  ('meuerp', 'forma', '8', 'debito'),
  ('meuerp', 'situacao', 'S', 'pendente'),
  ('meuerp', 'status_parcela', 'C', 'cancelada'),
  ('meuerp', 'tipo', 'EM', 'alteracao_em_massa'),
  ('meuerp', 'tipo', 'MN', 'manifesto_nfe');
