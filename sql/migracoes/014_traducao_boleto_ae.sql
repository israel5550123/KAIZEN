-- Correção pós-Fase 4 (29/09/2026): traduz os 2 códigos que a leitura de hora em hora das 10h de 29/09 achou
-- sem tradução, conferidos no ERP só lendo (docs/DECISOES.md, Fase 4, 29/09): a forma 9, "Boleto" (usada no
-- pagamento das notas de entrada 439, R$ 2.382,18, e 442, R$ 21.940,72), e o tipo AE, ajuste de custo feito pela
-- tela de formação de preços (documentos 450 e 451), sem estoque, financeiro nem natureza, como o AC.
insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('meuerp', 'forma', '9', 'boleto'),
  ('meuerp', 'tipo', 'AE', 'ajuste_custo');
