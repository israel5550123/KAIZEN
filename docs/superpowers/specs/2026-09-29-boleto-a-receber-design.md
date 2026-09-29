# Boleto a receber: a entrada conta no dia em que o boleto é pago

**Escrita e aprovada pelo orquestrador em 29/09/2026, em modo autônomo (`docs/AUTONOMIA.md`), a partir da resposta do dono às pendências da Fase 4.** O dono decidiu: numa venda paga em boleto, a venda conta na meta no dia da venda; no fluxo de caixa, a entrada conta no dia em que o boleto é pago (baixa da parcela), e não no dia da venda. Os fatos do ERP citados aqui foram medidos em 29/09, às 16h, por consulta só de leitura; os do Kaizen, no banco do PC.

## 1. Ponto de partida (medido)

- **Nenhuma venda em boleto existe ainda.** A forma 9 ("Boleto") só aparece em 2 notas de entrada (a 439 e a 442, R$ 24.322,90). Hoje o boleto é forma de compra.
- **No ERP novo, todo pagamento de venda vira uma parcela a receber**, ligada ao pagamento pela sequência (`documento_parcela._idsequencia = documento_pagamento._idsequencia`). À vista, a parcela nasce baixada, com uma baixa no ato e na mesma forma: formas 1, 2, 4, 6 e 8, 77 parcelas, 77 baixas. No crédito (forma 7), a parcela fica pendente e sem baixa: 5 parcelas, R$ 1.615,79 em pagamentos.
- **O Kaizen não copia a parcela a receber.** O leitor (`sql/erp/documentos.sql`) só lê parcelas de documento a pagar (`tipomovimentofinanceiro = 'P'`), e a comparação com o ERP (`sql/erp/totais.sql`) conta só essas; o teste "pedido 87" (`tradutor/casos-reais.test.mts`) fixa isso. No banco do PC, nenhuma venda tem parcela.
- **A meta já está certa.** `sql/regras/vendas.sql` não olha a forma de pagamento: a venda em boleto já conta no vendido do dia da venda.
- **O fluxo de caixa não está.** `sql/regras/financeiro.sql` põe todo pagamento de venda nas entradas do dia da venda (crédito, débito e cartão no dia seguinte). Um boleto cairia em `outras` no dia da venda.
- **A releitura de hora em hora** (`oidsComParcelaAberta`, `tradutor/kaizen.mts`) relê todo documento do ERP novo com parcela não baixada, para pegar baixas feitas depois. A leitura das 22h relê todos os documentos.

## 2. O que muda

1. **O leitor copia também a parcela a receber** (documento com financeiro `R`), com as baixas, do mesmo jeito que já copia a parcela a pagar. A comparação com o ERP passa a contar as duas, para que o que se copia seja o que se confere.
2. **Pagamento e parcela guardam a sequência do ERP** (coluna nova `sequencia`, por migração), para a regra saber qual parcela é de qual pagamento. Na Link fica vazia.
3. **A releitura de hora em hora continua só para documento a pagar** (financeiro `P`). A baixa de um boleto a receber entra pela leitura das 22h, que relê tudo: o boleto pago aparece nas entradas no mesmo dia, até as 22h.
4. **Na regra do financeiro, o pagamento de venda em boleto sai das entradas do dia da venda**, e cada baixa válida da parcela ligada a ele entra nas entradas do dia da baixa, na chave `outras` (a que já existe para as formas que não são dinheiro, Pix ou cartão). Baixa parcial entra pelo valor pago, cada uma no seu dia; baixa estornada (status não válido) não entra.
5. **Migração 014 antes** (tarefa separada): forma `9` → `boleto`, tipo `AE` → `ajuste_custo`. Sem ela, a regra não reconhece o boleto.

Nada muda na posição de contas a pagar, nas saídas, na folga, na gaveta, nos recebíveis de cartão e no fluxo previsto: todos filtram por papel (`conta_pagar`, `compra`) ou por forma de cartão e dinheiro.

## 3. Teste de valor concreto

Venda de 05/10/2026, R$ 500,00: R$ 100,00 no Pix (baixa no ato) e R$ 400,00 em boleto (parcela pendente, vencimento 20/10). Baixa do boleto em 18/10, R$ 400,00.

- Vendido de 05/10: R$ 500,00 (a meta conta no dia da venda).
- Entradas de 05/10: Pix R$ 100,00; `outras` R$ 0,00.
- Entradas de 18/10: `outras` R$ 400,00. Entradas de outubro: Pix R$ 100,00; `outras` R$ 400,00.
- Baixa estornada do boleto: `outras` de 18/10 volta a R$ 0,00.
- Pedido 87 (dinheiro, Pix e crédito): as entradas não mudam com as parcelas a receber copiadas (R$ 50,00 dinheiro, R$ 40,00 Pix no dia; R$ 30,00 crédito no dia seguinte).

## 4. Alternativas consideradas

- **Copiar só a parcela a receber do pagamento em boleto.** Perdeu: o leitor teria de saber que o código 9 é boleto, e a tradução mora no Kaizen, não no leitor (uma exceção no lugar errado).
- **Trocar todas as entradas de venda pelas baixas.** Perdeu: o crédito fica pendente para sempre no ERP e sumiria das entradas; mudaria números que já batem.
- **Chave nova `boleto` nas entradas.** Perdeu por ora: muda o formato de toda resposta do financeiro por uma forma que ainda não teve venda; `outras` já é onde o boleto cairia. Se o dono quiser ver o boleto separado, é uma chave a mais.
- **Releitura de hora em hora também para parcela a receber pendente.** Perdeu: cada venda no crédito seria relida de hora em hora para sempre (5 em dois dias). A leitura das 22h basta para o boleto aparecer no mesmo dia.

Critério: `OBJETIVO.md` (menos peças, menos regras, nenhuma exceção para funcionar).

## 5. O que muda se estiver errado

- Se o ERP gravar a baixa do boleto de outro jeito (a primeira venda em boleto dirá), a regra da seção 2.4 é a única a ajustar; o teste do item 3 mostra o formato suposto.
- Se o dono quiser o boleto pago na hora, e não até as 22h, a releitura passa a incluir a parcela a receber pendente em boleto.
- O boleto a receber pendente não entra no fluxo previsto de 30 dias; se o dono quiser, ele entra como entrada prevista no vencimento.
