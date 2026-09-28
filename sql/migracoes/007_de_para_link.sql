-- Decisões de ligação dos clientes da Link (spec da Fase 3, seção 6): valem antes da regra do CPF/CNPJ.
-- 10000502 é o Consumidor Final; 10000199 foi renumerado para 484 na migração;
-- os outros 20 estão sem CPF/CNPJ nos dois cadastros, com o mesmo código e o mesmo nome.
insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen) values
  ('pessoa', 'link', '10000502', '999007'),
  ('pessoa', 'link', '10000199', '484'),
  ('pessoa', 'link', '21', '21'),
  ('pessoa', 'link', '75', '75'),
  ('pessoa', 'link', '84', '84'),
  ('pessoa', 'link', '142', '142'),
  ('pessoa', 'link', '145', '145'),
  ('pessoa', 'link', '172', '172'),
  ('pessoa', 'link', '212', '212'),
  ('pessoa', 'link', '213', '213'),
  ('pessoa', 'link', '214', '214'),
  ('pessoa', 'link', '216', '216'),
  ('pessoa', 'link', '236', '236'),
  ('pessoa', 'link', '250', '250'),
  ('pessoa', 'link', '274', '274'),
  ('pessoa', 'link', '276', '276'),
  ('pessoa', 'link', '279', '279'),
  ('pessoa', 'link', '290', '290'),
  ('pessoa', 'link', '298', '298'),
  ('pessoa', 'link', '361', '361'),
  ('pessoa', 'link', '384', '384'),
  ('pessoa', 'link', '409', '409');
