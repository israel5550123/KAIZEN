# Fase 2, conferência da operação real: tradução dos 7 códigos novos do ERP

**Não reabre a Fase 2.** É a conferência prevista em `docs/AUTONOMIA.md` (passo 7 de "Como uma fase roda"): corrige e registra. Spec de referência: `docs/superpowers/specs/2026-09-27-fase2-esquema-e-tradutor-design.md`, seção 5.4 (a `traducao` e os códigos "deixados de fora de propósito" até terem significado conhecido).

## O problema, em números

A primeira leitura manual na VPS (execução 1, 28/09 17h23, imagem 7d1590c) terminou em `aviso` com 7 códigos do ERP sem tradução no Kaizen: forma `6` (21 vezes), `7` (5), `8` (4); situação `S` (17); status de parcela `C` (107); tipo `EM` (1); tipo `MN` (18). Nenhum número do Kaizen está errado por causa deles, mas o aviso se repete em toda leitura e a ficha mostra forma e tipo vazios.

## O que cada código é (lido no ERP, só leitura, em 28/09 à tarde)

| Campo | Código | No ERP | Tradução |
| --- | --- | --- | --- |
| `forma` | 6 | `pagamento` 6, "Pix (Manual)", idtipo 20, à vista, sem integração; a venda baixa na hora | `pix` |
| `forma` | 7 | `pagamento` 7, "Cartão Crédito (Manual)", idtipo 3, não à vista; a venda vira conta a receber que vence no ato, como a forma 3 | `credito` |
| `forma` | 8 | `pagamento` 8, "Cartão Débito (Manual)", idtipo 4, à vista, sem integração | `debito` |
| `situacao` | S | só existe nos manifestos (`MN`): a nota chegou da SEFAZ e ninguém a abriu; vira `O` (conferido) quando alguém lança a entrada | `pendente` |
| `status_parcela` | C | parcela cancelada (swagger: "P = Pendente, B = Baixada, C = Cancelada"); é o que a tela Contas Pagar/Receber grava ao "excluir" | `cancelada` |
| `tipo` | EM | alteração em massa do cadastro de produtos (o EM 150, de 28/09 08h59, subiu o desconto máximo dos 1.029 produtos para 5%) | `alteracao_em_massa` |
| `tipo` | MN | manifesto de NF-e: nota de fornecedor trazida da SEFAZ; sem item, pagamento, parcela nem estoque | `manifesto_nfe` |

## Restrições

- A migração `002_traducao.sql` já foi aplicada na VPS e **não se reescreve**. As 7 linhas entram numa migração nova, `sql/migracoes/009_traducao_operacao_real.sql`.
- Nenhum número do Kaizen muda: vendas pela regra do 154, contas a pagar (81 parcelas, R$ 217.491,43 no ERP de 28/09) e a quebra total de cada fechamento continuam iguais. Os testes provam isso.
- Teste com valor de referência dos documentos reais abaixo. Sem `.skip`, sem `.only`.
- Nada escreve no ERP; nada toca o esquema `erp`.

## Documentos reais para os testes (ERP, 28/09/2026)

- Pedido 209 (oid 264), `PA`, E, S, R, 10h19m52, turno 1/18153/3: itens R$ 28,80 + R$ 58,00 + R$ 23,20 (vendedor 999005); pagamento oid 134, forma 6, R$ 110,00.
- Pedido 221 (oid 280), `PA`, E, S, R, 10h50m16: itens R$ 375,00 + R$ 18,00 + R$ 120,00 + R$ 5,00 (vendedor 999005); pagamentos oid 141, forma 6, R$ 18,00, e oid 142, forma 7, R$ 500,00.
- Pedido 324 (oid 442), `PA`, E, S, R, 15h03m30: pagamento oid 252, forma 8, R$ 185,61.
- Manifesto 273 (oid 377), `MN`, status S, movimento e financeiro nulos, criado 28/06/2026 13h14m18.
- Manifesto 290 (oid 394), `MN`, status O, movimento e financeiro nulos, criado 22/09/2026 13h07m31.
- `EM` 150 (oid 242), status E, movimento N, financeiro N, 28/09 08h59m21.
- Conta a pagar 365 (oid 501), `CP`, E, E, P: parcelas oid 372 C R$ 114,90 ("INTERNET - PARC 3/9"), oid 404, 439 e 457 P R$ 114,90 cada.
- Fechamento 417 (oid 600), `FC`, E, N, N, 17h55m09, turno 1/18153/3. Conferência, forma: calculado / informado — 1: 604,80 / 606,80; 2: 43,20 / 43,20; 3: 0,00 / 0,00; 4: 160,90 / 160,90; 5: 0,00 / 0,00; 6: 2.535,48 / 2.535,48; 7: 500,00 / 500,00; 8: 185,61 / 185,61. Quebra do fechamento: R$ 2,00, toda no dinheiro.

## Tarefa 1: a migração 009 e o nome da forma com o código na conferência do dono

**Arquivos:**
- criar `sql/migracoes/009_traducao_operacao_real.sql`: as 7 linhas da tabela acima, fonte `meuerp`, com um comentário de uma linha dizendo de onde vêm (conferência da operação real, 28/09/2026).
- `sql/kaizen/conferencia-dono.sql` e/ou `tradutor/conferencia-dono.mts`: cada linha de forma do fechamento passa a trazer o código do ERP ao lado do nome, porque o ERP grava uma linha por forma (8 linhas em todo fechamento, até as zeradas) e, com a tradução, a 2 e a 6 viram as duas "pix", a 3 e a 7 as duas "credito", a 4 e a 8 as duas "debito". Texto: `  pix (forma 6): calculado R$ 2.535,48, informado R$ 2.535,48, quebra R$ 0,00`. Forma sem tradução: `  forma 9: calculado ...`. A ordem continua a do código; a linha da troca continua fora; a quebra do fechamento não muda.
- testes (abaixo) e `testes-esperados.txt`.

**Testes (4 novos, 1 ajustado; 325 → 329):**
1. Novo: com as migrações até a 008 aplicadas, um banco com os documentos reais acima dá, em `codigosSemTraducao`, exatamente os 7 códigos (forma 6, 7, 8; situacao S; status_parcela C; tipo EM, MN) com as contagens do próprio conjunto; depois de aplicar a 009, dá lista vazia. (Prova que é a 009 que resolve.)
2. Novo: com todas as migrações, `kaizen.documento_negocio` dá `manifesto_nfe`/`pendente` para o 273, `manifesto_nfe`/`conferido` para o 290 e `alteracao_em_massa`/`emitido` para o 150; e `sql/kaizen/ficha-venda.sql` do pedido 221 dá os pagamentos `pix` R$ 18.00 e `credito` R$ 500.00.
3. Novo, em `tradutor/conferencia-dono.test.mts`: com o fechamento 417, os pedidos 209, 221 e 324 e a conta a pagar 365, o texto da conferência mostra o fechamento 417 com quebra R$ 2,00 e as 7 linhas sem a troca (`dinheiro (forma 1)` ... `debito (forma 8)`, com os valores acima); as contas a pagar dão 3 parcelas, R$ 344,70 (a parcela C fica fora); as vendas de 28/09 dão 3 vendas, R$ 813,61 (itens com vendedor: R$ 110,00 do 209 + R$ 518,00 do 221 + R$ 185,61 do 324; os itens do 324 são R$ 91,20 + R$ 38,00 + R$ 34,91 + R$ 12,00 + R$ 9,50).
4. Novo: com todas as migrações, `kaizen.traducao` da fonte `meuerp` tem 55 linhas, e as 7 novas têm os valores da tabela.
5. Ajustado, em `tradutor/conferencias.test.mts` (o teste "avisa os códigos deixados de fora de propósito"): o status C de parcela sai da lista esperada e do título, porque agora tem tradução; AM, RU, financeiro E e baixa X continuam avisando. Os textos esperados de `tradutor/conferencia-dono.test.mts` ganham o `(forma N)`.

**Pronto quando:** `npm run verificar` passa com 329 testes; o commit diz o resultado ("os 7 códigos da operação real de 28/09 ganham tradução; nenhum número muda").

## Depois da tarefa (orquestrador)

- `docs/FONTES.md`: seção "Conferências da operação real" com a tabela acima, a evidência e os exemplos; tabela "Tipos de pagamento" com 8 formas; as regras futuras que falam em "formas 1 a 4" e "formas 3 e 4" passam a falar pela forma traduzida; conta a pagar é parcela `pendente`, nunca "diferente de baixada".
- `docs/DECISOES.md`: uma entrada por decisão (as 7 traduções, o nome `pendente` para o `S` e o código na linha de forma da conferência).
- Revisão da tarefa (revisor), verificador dos números do `FONTES.md`, merge em `main` e envio ao GitHub; instruções do passo 9 do roteiro para o dono.
