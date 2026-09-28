-- Resposta do dono (28/09/2026) às falhas da de_para da Link (docs/DECISOES.md, Fase 3): o cliente 1 da Link
-- (3D MOVEIS, 2 vendas, R$ 60,00) é o Consumidor Final 999007 do ERP novo. As outras falhas ficam com o código link:.
-- Depois da primeira rodada da Link a falha já ocupa a chave: por isso o on conflict.
insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen) values
  ('pessoa', 'link', '1', '999007')
on conflict (entidade, fonte, codigo_origem) do update set codigo_kaizen = excluded.codigo_kaizen;
