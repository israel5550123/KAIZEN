# De onde vem cada número — relatório da Fase 1

**Fase 1 fechada em 27/09/2026, com o aval do dono.** O relatório foi escrito de 24 a 27/09. Nesses dias entraram as decisões do dono, a conferência da importação dos cadastros, a simulação e os testes, a revisão completa do documento, e a conferência da limpeza da base e do inventário. Ele mapeia o que cada endpoint promete e todas as tabelas do banco. Ainda não há venda real no ERP, que começa em 28/09. O que depende de venda real está marcado **(confirmar)** e listado em "Etapa 2"; é o primeiro passo da Fase 2.

## Resumo

- **As três perguntas têm fonte.** A tabela de indicadores abaixo tem 25 linhas. A meta é cadastrada no Kaizen; 18 saem inteiramente do ERP; 6 precisam também de algo que o ERP não guarda (lista 3): feriados locais, saldo do banco e a regra de crédito do cartão (D+1).
- **Os relatórios do próprio ERP discordam sobre o que é venda.** Nos relatórios que somam vendas há pelo menos dez combinações diferentes de tipos de documento, e uns somam os itens, outros os pagamentos. O vendido do Kaizen segue a regra do relatório 154 (seção "Armadilha"), pelo qual o dono confere. Mas o número comparado à meta é o líquido: vendido menos devoluções, com a venda contada no dia do fechamento (decisões 6 e 7).
- **O SQL cobre tudo o que a API cobre, e mais.** A API entrega vendas completas (itens, custo do item, pagamentos, cliente) e a foto do estoque. A conferência do fechamento de caixa, o histórico de estoque, as contas pagas filtradas pela data do pagamento, o cancelamento de item e o fornecedor do produto só existem pelo SQL.
- **Não existe registro de alteração de vendas.** O banco registra cada alteração de cadastro e de saldo de estoque, com número de versão, mas não de documentos. Para pegar venda atrasada do PDV e cancelamento posterior, o tradutor terá de reler uma janela de dias. Custa pouco: cerca de 40 vendas por dia cabem numa página. Uma ressalva: a API filtra os documentos só pela data de criação, e um orçamento convertido dias depois no próprio documento escapa dessa releitura (seção "Lista 1", "Filtro por data").
- **O limite de requisições não dá erro, dá espera.** São cerca de 20 chamadas por minuto do relógio. Na medição, depois de 19 chamadas no mesmo minuto, a seguinte (a 20ª) ficou retida 22,7 s, até o minuto virar, e depois foi respondida. O tradutor deve contar com 19 por minuto. Página de até 100 registros, na API e no SQL.
- **A importação dos cadastros trouxe uma surpresa e duas escolhas do dono** (seção "Conferência da importação"). A surpresa: o código da Link não está na referência, e sim no próprio código do produto. As escolhas: o estoque entrou zerado, e está sendo lançado pelo inventário "BALANÇO 1"; e entraram 1.022 produtos, contra 1.391 ativos na Link, porque o dono tirou os que a loja não trabalha mais.
- **A simulação do dono em 25/09 confirmou a maior parte da etapa 2** (seção "Simulação do dono"). O valor que o ERP espera na gaveta segue a conta do `LOJA.md`, ao centavo (R$ 92,00), e a troca e a devolução ficaram claras. Apareceram armadilhas novas, a principal delas o crédito de troca aparecendo como conta a pagar. O dono decidiu em 25/09 como o Realizado trata vendedor, devolução e orçamento (seção "Decisões do dono").
- **Os testes de 26/09 confirmaram quase todo o resto** (seção "Testes do dono"): Pix, débito, crédito, várias formas numa venda, troco, sangria, suprimento adicional, cliente padrão, vendedor obrigatório e o uso do crédito de troca. Eles mostraram três coisas novas:
  - o cartão de crédito passou a gerar conta a receber;
  - o número do caixa e o da abertura não identificam o turno sozinhos, mas junto com o usuário que abriu quase sempre identificam;
  - o vendedor gravado foi quase sempre o Igor, inclusive nas vendas da Daniele e do suporte.

  Não apareceram cancelamento nem uma venda sem internet identificável.
- **A fase fechou em 27/09.** As três listas existem, e os 25 indicadores apontam para elas, que é o "Pronto quando" do `OBJETIVO.md`. A limpeza e o inventário foram conferidos em 27/09, e o inventário saiu certo. A limpeza apagou junto as 94 contas a pagar, que o dono vai importar de novo, e deixou restos sem documento, que o dono decidiu não mandar apagar (decisão 12). O que fica em aberto, listado em "Etapa 2", é o que só a operação real mostra a partir de 28/09, e isso passa a ser o primeiro passo da Fase 2.

## Decisões do dono (24 a 26/09/2026)

1. **A régua do vendido é o relatório 154 — "TOTAL DE VENDAS POR FUNCIONARIO E PERIODO".** É por ele que o dono confere. O que ele conta está na seção "Armadilha"; o Realizado passou a ter três números (item 6).
2. **Quebra de caixa = informado − calculado** (`valconferido − valdisponivel`). O recontado não entra: no ERP anterior ele era digitado depois de o operador ver a resposta do sistema, o que contaminava a medição. O Meu ERP Online não tem campo de recontado, e isso não é uma falta.
3. **Feriados municipais e estaduais ficam numa lista do Kaizen.** O ERP só tem os 13 nacionais.
4. **A troca de mercadoria foi configurada em 25/09.** Forma de pagamento 5, "Troca/Devolução" (tipo 81), e natureza 900, "TROCA DE MERCADORIA" (`config_entrada_saida.idpagamentotrocamercadoria` e `idnaturezatrocamercadoria`). Era o único item com prazo real: sem ela, a devolução não tinha por onde entrar.
5. **Vendedor obrigatório no caixa, a partir de 25/09.** O PDV passa a exigir o vendedor. Venda sem vendedor, se ainda aparecer, é exceção que o Kaizen sinaliza. Nos testes de 26/09, o vendedor gravado foi quase sempre o Igor (seção "Testes do dono"): o campo obrigatório não garante que o vendedor seja o certo.
6. **O Realizado vira três números:**
   - **Vendido:** a regra do relatório 154 (itens de documento emitido, de saída, que gera recebimento, com vendedor), para conferir com o ERP;
   - **Devoluções:** à parte, na data e no vendedor da troca (itens dos documentos `TM`);
   - **Líquido:** vendido − devoluções, o que ficou de fato no mês.

   O líquido é o número comparado à meta e usado no ritmo do vendedor. O `LOJA.md` foi atualizado com essas definições em 25/09, com autorização do dono.
7. **A venda conta na data em que foi fechada, não na do orçamento.** O 154 conta pela data do documento (`datahora`). Há dois jeitos de converter um orçamento, e só um deles cria diferença:
   - **No caixa**, a conversão cria um documento novo, já com a data do fechamento. Em 26/09, o orçamento 88 virou o pedido 89. O 154 e o Kaizen contam no mesmo dia.
   - **No próprio documento**, feita fora do caixa. Em 25/09, o orçamento 58 foi feito às 15h09, convertido às 15h27 e regravado às 15h48, e essa última hora ficou em `datahoramovimento`. Aqui o 154 conta no dia do orçamento, e o Kaizen, pelo `datahoramovimento`, no dia do fechamento. O Kaizen lista esses orçamentos para a conferência **(confirmar** com uma conversão dessas feita em outro dia).
8. **Devolução de item de orçamento:** o ERP permite (simulação, documento 63). O dono vai criar uma verificação na loja para impedir.
9. **Documentos que a loja vai usar:** pré-venda, orçamento, pedido de venda, NFC-e e NF-e. Condicional não. NFC-e e NF-e ainda não estavam configuradas em 25/09, por isso não apareceram na simulação.
10. **A operação real no ERP novo começa na segunda-feira, 28/09/2026, não em 01/10.** O inventário foi contado em 26/09. Ele é encerrado depois de o suporte limpar a base, antes da abertura de segunda, e precisa estar certo na segunda. O último dia de venda na Link foi sexta-feira, 25/09; haverá uma cópia final dela no Postgres da VPS. A virada de fonte passou de 01/10 para 28/09 no `OBJETIVO.md` e no `LOJA.md`, com autorização do dono. Setembro fica dividido: de 1º a 25/09 pela Link, e de 28 a 30/09 pelo ERP novo. O sábado, 26/09, não tem venda em nenhum dos dois, porque é o dia do inventário; o Kaizen o trata como a pausa da virada, e não como queda de venda.

    Do ERP novo antes de 28/09, o Kaizen não lê vendas, trocas, caixas nem contas a receber: são a importação e os testes, que o suporte vai apagar. Continuam valendo dois conjuntos de dados reais:
    - as 94 parcelas a pagar importadas em 24/09 (49 documentos de modelo `CP`, com datas de 14/04 a 22/09);
    - o documento que o encerramento do inventário "BALANÇO 1" gerar, que é a carga do estoque.

    Para a carência do encalhe, a data de entrada dos produtos migrados continua vindo da Link.
11. **A limpeza da base é feita pelo suporte, direto no banco (combinado em 26/09).** O suporte apaga as movimentações de teste: documentos 51 a 118, menos os 5 ajustes de custo `AC` 76 a 80, que são reais. Mantém os cadastros de clientes, usuários, funcionários e produtos, as contas a pagar, as tarefas e as configurações. O Kaizen não apaga nem altera nada. Ele só confere, lendo, contra a fotografia de 26/09 (seção "Limpeza da base").
12. **Fechamento da Fase 1 (27/09).** O dono fechou a fase com a conferência de 27/09 e decidiu duas coisas:
    - **Contas a pagar:** a limpeza apagou as 94 parcelas. O dono vai importá-las de novo, e isso não atrapalha o projeto.
    - **Restos da limpeza:** 30 linhas de conferência de caixa, 25 de histórico de estoque e 6 do documento 58 ficaram sem documento. O dono decidiu não pedir outra limpeza ao suporte.

    Por isso, a Fase 2 leva em conta duas coisas. Linha de histórico de estoque com data anterior a 26/09, 22h40, é resto e fica fora. E, na conferência de caixa, um fechamento com mais de uma linha por forma de pagamento, ou com valores que não batem com as vendas do turno, é sinal de resto e vira aviso.

## Conferência da importação (24/09/2026)

Os cadastros entraram às 21h33 de 24/09. A API e o SQL dão os mesmos totais em tudo: 1.022 produtos, 1.022 linhas de estoque e de custo, 445 pessoas, 4 funcionários e 94 contas a pagar.

| O quê | ERP novo | Link (cópia de 12/09) |
| --- | --- | --- |
| Produtos | 1.022, todos ativos | 1.391 ativos, 7 inativos |
| Com estoque positivo | 0 (todos com saldo zero) | 863 |
| Com estoque negativo | 0 | 66 |
| Com custo zero | 84 | 138 |
| Com preço zero | 9 | — |
| Sem marca | 46 (4,5%) | 36,4% |
| Com fornecedor no cadastro | 653 (63,9%) | — |
| Com código de barras | 259 | — |
| Pessoas | 445: 415 clientes, 26 fornecedores, 4 os dois | — |
| Com CPF/CNPJ | 420: 330 CPF e 90 CNPJ; nenhum com tamanho errado, máscara, dígito repetido ou duplicado | — |
| Sem CPF/CNPJ | 25, dos quais 22 clientes; o Consumidor Final original foi sobrescrito na importação (seção "Simulação do dono") | — |
| Com endereço, bairro e município | 445, dos quais 300 em São Luís | — |
| Com latitude e longitude | 0 | — |
| Funcionários | Igor Mendes Ribeiro e Daniele Fonseca Lima, vendedores; Erleide Alves Pereira (gerente) e Wallace Carvalho Pereira (estoque), sem tipo | — |
| Contas a pagar pendentes | 94 parcelas, R$ 245.864,76; API e SQL batem ao centavo | 101 abertas entre as emitidas em 2026 |

**O código da Link está no código do produto, não na referência.** Os códigos dos produtos no ERP novo vão de 60 a 5.362, a faixa dos códigos de tela da Link (`produto_codigo`). Os três códigos de tela citados na documentação da Link existem aqui, com descrições coerentes, e nenhum aparece na referência:

- 1795: "SISTEMA DE CORRER PORTA DE PASSAGEM RO-7502V ROMETAL";
- 5334: "BUCHA 8MM NYLON C/ ANEL", com estoque −200 na Link;
- 1436: "COLA DE CONTATO 14 KG KISAFIX", a "cola de 14 kg" do dicionário da Link.

A referência (`mercadoria_variacao.referencia`), preenchida em 469 produtos, guarda a referência do fabricante: "443689" numa broca Worker, "3000850" numa cola Afix. Oito vieram estragadas pela planilha em notação científica ("4,3411E+14", repetida em 6 produtos).

Consequência: na Fase 3, o produto da Link liga pelo código (`_idmercadoriavariacao` = `produto_codigo` da Link). O `LOJA.md` e o `OBJETIVO.md` diziam que o código estava na referência e foram corrigidos em 24/09, com autorização do dono **(confirmar** contra a cópia da Link na Fase 3).

**Os produtos criados no ERP novo continuam a numeração.** Em 26/09 havia 1.029 produtos, 7 criados depois da importação. Cinco deles, do 5363 ao 5367, aparecem nos ajustes de custo `AC` 76 a 80. **(Confirmar** na Fase 3 qual é o maior `produto_codigo` da Link. Se passar de 5.362, a ligação pelo código só vale para os produtos que já existiam em 24/09, e os criados depois entram por de-para.)

**O estoque entrou zerado, e o dono o lança pelo inventário "BALANÇO 1", antes da operação real.** A importação criou um documento de modelo `IM` com os 1.022 produtos e quantidade zero; o histórico tem 1.022 linhas de 0 para 0. Enquanto o estoque não for lançado, cobertura, ruptura, encalhe e giro não têm base, e cada venda deixa o produto negativo (o ERP permite). A primeira entrada real de cada produto será a carga do estoque, quando vier. Se ela for feita por inventário, todos os produtos terão a mesma data, e a carência do produto novo vem da Link.

**369 produtos a menos que na Link, de propósito.** Entraram 1.022, contra 1.391 ativos na cópia de 12/09: o dono tirou os produtos com que a loja não trabalha mais, e fez o mesmo com parte dos clientes. Consequência para a Fase 3: a venda desses produtos e clientes de abril a 25/09 existe na Link e não tem par no cadastro novo. Como a régua é bater com o ERP, ela precisa continuar somando no realizado daqueles meses; a Fase 3 decide como ela entra na história.

**As datas de cliente não servem.** 442 das 445 pessoas vieram com cadastro em 31/12/1899 (a data vazia da planilha), e o "cliente desde" repete a mesma data. Recência, "cliente desde" e clientes que pararam de comprar dependem da história da Link (Fase 3).

**Contas a pagar.** Das 94 parcelas pendentes em 24/09, 12 já estavam vencidas, de 27/05 a 23/09/2026 (R$ 27.617,38). Nos 7 dias seguintes, de 24/09 a 01/10, vencem 6 (R$ 18.648,83). Nos 30 dias seguintes, de 24/09 a 24/10, vencem 38 (R$ 110.216,33), já contando essas 6. As 12 vencidas foram deixadas em aberto de propósito pelo dono.

## Simulação do dono (25/09/2026)

Das 14h16 às 15h53 de 25/09 o dono simulou a operação no ERP, num caixa só (Caixa 01, operador Igor): abertura, suprimento, vendas, orçamentos, pré-vendas, uma troca, uma devolução em dinheiro e o fechamento. Ficaram 18 documentos, do 51 ao 68. O estoque estava zerado, então as vendas deixaram produtos negativos.

| Documento | Tipo (`modelo`) | Movimenta | Quantos |
| --- | --- | --- | --- |
| Abertura de caixa | `AX` | nada | 2 |
| Suprimento (fundo de troco) | `SF` | entrada de R$ 1,00 em dinheiro | 1 |
| Pedido de venda: foi a "venda" do caixa | `PA` | estoque sai; gera recebimento | 4 |
| Orçamento | `OC` | nada | 2 |
| Pré-venda | `PV` | nada | 2 |
| Troca com crédito para o cliente ("Troca de Mercadoria - Adiantamento") | `TM` | estoque entra; gera pagamento | 1 |
| Devolução com dinheiro de volta ("Troca de Mercadoria - Retirada") | `TM` | estoque entra; gera pagamento | 1 |
| Liberação de permissão | `LP` | nada | 4 |
| Fechamento de caixa | `FC` | nada; guarda a conferência | 1 |

Nenhuma NFC-e foi emitida: a venda do caixa saiu como pedido de venda (`PA`).

**O que a simulação confirmou:**

- **O calculado do ERP segue a conta do `LOJA.md`, ao centavo.** O dinheiro esperado na gaveta no fechamento foi R$ 92,00: R$ 1,00 de suprimento, mais R$ 77,00, R$ 16,00 e R$ 16,00 de vendas em dinheiro, menos R$ 18,00 da devolução em dinheiro. O pedido sem pagamento (R$ 144,00) ficou fora, como deve. O operador informou zero, porque era teste: o que se conferiu foi a conta do sistema, não a gaveta.
- **O turno não está em `caixa_controle`**, que continua vazia. Ele está nos documentos `AX` (abertura) e `FC` (fechamento), ligados por `idcaixaabertura` + `idabertura`, com o suprimento em `SF`. Nos testes de 26/09, esse par se repetiu entre turnos (seção "Testes do dono", achado 1). A conferência às cegas fica em `documento_conferencia_caixa`, ligada ao `FC`, uma linha por forma de pagamento, inclusive uma linha "Troca/Devolução".
- **Troco é uma linha negativa de dinheiro.** A venda 66 tem R$ 20,00 e −R$ 4,00 em dinheiro.
- **A troca funciona como adiantamento.** O item volta ao estoque, e o valor vira crédito do cliente: pago com a forma 5, "Troca/Devolução" (tipo 81, criada pelo dono), e registrado como **parcela a pagar pendente**. O item devolvido aponta a venda de origem (`documento_mercadoria.iddocumentoorigem`), e o item da venda original marca a quantidade devolvida (`qtddevolucao`).
- **A devolução em dinheiro** também devolve o item ao estoque e baixa na hora uma parcela a pagar em dinheiro, que sai da gaveta.
- **Orçamento convertido fora do caixa continua no mesmo documento.** O 58 nasceu orçamento às 15h09 e virou pedido às 15h27 (em `documento_historico`, evento `TR`, `OC>PA`). Nessa hora, o histórico de estoque tem a saída só do produto 2138. Às 15h48 o pedido foi gravado de novo, com um item a mais (o 5278, R$ 25,00): o 2138 teve estorno e nova saída, e o 5278 saiu pela primeira vez. O `datahora` continua 15h09, e o `datahoramovimento` ficou 15h48, a hora da última gravação e não a da conversão **(confirmar** o que acontece com um pedido regravado em outro dia). O histórico de estoque leva sempre a hora do orçamento.
- **Estoque:** cada venda e cada troca gravou linha no histórico e entrada em `tabela_alteracao` (5 produtos alterados). Dá para ler o estoque só pelo que mudou.
- **API:** a lista de documentos trouxe itens, custo do item, pagamentos, parcelas, baixas e cliente em 18 dos 19 documentos. A exceção foi a parcela pendente do crédito de troca (documento 61), que não veio na lista embutida, embora exista no banco e apareça em `conta-pagar/pendentes`.

**O que o relatório 154 mostraria em 25/09:** Igor Mendes Ribeiro, R$ 176,00, com os pedidos 58 (R$ 144,00), 66 e 67 (R$ 16,00 cada). Pela regra dele, ficaram fora:

- o pedido 54, de R$ 77,00, vendido **sem vendedor**;
- as duas devoluções (R$ 77,00 e R$ 18,00), porque documento de entrada não desconta nada;
- orçamentos e pré-vendas, porque não geram recebimento.

E entrou o pedido 58, feito fora do caixa e sem pagamento registrado.

**Armadilhas que a simulação revelou:**

1. **O crédito de troca aparece como conta a pagar.** `conta-pagar/pendentes` passou de 94 para 95 parcelas, com os R$ 77,00 da troca vencendo em 25/09. Para o Kaizen, crédito de cliente não é conta: sem tirar o modelo `TM`, a folga em 7 dias cairia R$ 77,00.
2. **O crédito de troca entra no fechamento de caixa.** A linha "Troca/Devolução" teve calculado de −R$ 77,00; com o informado zero, virou sobra de R$ 77,00. A quebra de caixa do Kaizen precisa considerar só Dinheiro, Pix, Crédito e Débito.
3. **Orçamento convertido dentro do próprio documento conta no dia do orçamento.** O 154 soma por `DATE(datahora)`: um orçamento de segunda que vira venda na quarta entra na segunda. O Kaizen conta na data do fechamento (decisão 7). A conversão feita no caixa não tem esse problema, porque cria um documento novo.
4. **Pré-venda não fica ligada ao pedido.** As pré-vendas 64 e 65 (R$ 16,00 cada) e os pedidos 66 e 67 (R$ 16,00 cada, mesmo produto, de 1 a 3 minutos depois) não têm ligação gravada, e as pré-vendas continuam emitidas. O 154 não conta pré-venda, mas um relatório que conte pré-venda e pedido juntos, sem exigir recebimento, conta duas vezes. O dono confirmou que as pré-vendas viraram esses pedidos, em ordem cruzada: a 65 virou o 66, e a 64 virou o 67. A ligação existe só como texto na observação do pedido ("Docs Origem: 18"), e o 18 é o número que o caixa dá à pré-venda (`documento.idexterno`), não o código do documento.
5. **A pré-venda está marcada para reservar estoque (`flagreservaestoque = T`), mas nenhuma reserva apareceu.** O gatilho de estoque ignora documento que não movimenta estoque, e a pré-venda não movimenta **(confirmar** depois do inventário).
6. **O ERP deixou devolver item de um orçamento.** A devolução em dinheiro (documento 63) aponta como origem o orçamento 59, que nunca foi venda: o produto 1362 ficou com +1 no estoque, e a gaveta com −R$ 18,00.
7. **A importação sobrescreveu o Consumidor Final.** A pessoa 2, que era o Consumidor Final do ERP, virou um cliente real da Link (uma empresa). O dono criou outro Consumidor Final (999007) às 14h57 e o pôs como cliente padrão. O ERP não deixa vender sem cliente: no balcão, fica o Consumidor Final. Mesmo assim, as vendas de teste das 15h40 às 15h43 foram para a pessoa 2. Nos testes de 26/09, as vendas feitas sem trocar o cliente já foram para o 999007. O crédito da troca ficou no Consumidor Final (saldo de R$ 77,00 pela API). Na Fase 3, o Consumidor Final da Link (cliente 1229) liga ao 999007.

**Estoque deixado pela simulação:** produto 60 com −2, 1362 com +1, 2138 com −10 e 5278 com −1. Até os testes de 26/09, os três negativos voltaram a zero sem deixar linha no histórico: o 60 já estava em 0 na primeira venda de teste, às 14h05. O único documento de estoque nesse intervalo é o `LE` 72, do inventário "TESTE" (26/09, 08h02, sem itens), com "zerar itens negativos" ligada. O 1362, positivo e não contado, continuou com +1. Fica a primeira pista sobre o encerramento do inventário: ele zera os negativos, mantém os positivos não contados e não deixa linha no histórico.

**Não foi simulado:** cancelamento (da venda inteira e de item antes de fechar), sangria, pagamento em Pix e em cartão, NFC-e e venda com o caixa sem internet.

**O que o dono decidiu sobre isso (25/09):** o caixa passa a exigir o vendedor; o Realizado vira três números (vendido, devoluções e líquido); e a venda conta na data em que foi fechada, não na do orçamento. Os detalhes estão nos itens 5 a 7 de "Decisões do dono".

## Testes do dono (26/09/2026)

De 25/09 às 21h50 a 26/09 às 18h39, o dono, a Daniele, o Igor e o suporte fizeram testes em quatro caixas: 1 "CX01", 2 "VENDAS", 3 "VENDAS 03" e 10 "CAIXA TESTE". Os testes de venda começaram com a abertura das 12h44 de 26/09. Ficaram 50 documentos, do 69 ao 118, todos antes de encerrar o inventário "BALANÇO 1", que continuava aberto. Entre eles estão o `LE` 72, do inventário "TESTE", e os 5 ajustes de custo `AC` feitos das 09h01 às 11h22. As conclusões abaixo foram conferidas de duas formas: por três verificações independentes sobre os mesmos dados (15 confirmadas; 1 incerta, a venda sem internet) e por uma revisão completa do documento.

**Confirmado:**

- **Cliente padrão:** toda venda feita sem trocar o cliente caiu no Consumidor Final 999007. Para achar o balcão, não serve o campo fiscal `flagconsumidorfinal`: ele vale S em todos os clientes das vendas de teste, inclusive empresas.
- **Vendedor obrigatório:** todo item de pedido tem vendedor; só o orçamento 85 ficou sem. **Mas o vendedor gravado não é, com certeza, quem atendeu.** 15 dos 16 pedidos gravaram o vendedor 1 (Igor Mendes Ribeiro), inclusive os feitos pela Daniele (101, 103, 106, 108 e 115) e pelo suporte (110, 111, 112 e 114). Só o pedido 87 e a pré-venda 90 têm outro vendedor, o 999005 (Daniele). O caixa não pede a senha do vendedor **(confirmar** na primeira semana se o caixa sugere um vendedor por padrão). O nome do vendedor não vem no item da venda do caixa (`nomePessoaFuncionario` vazio): ele sai do cadastro de pessoas, pelo código.
- **Pix e cartão de débito** dão baixa na hora.
- **A forma Cartão Crédito deixou de ser "à vista" no cadastro do ERP entre 14h09 e 14h27.** Não é venda a prazo: o cliente continua pagando na hora. O que muda é que o ERP passa a registrar cada venda no crédito como uma conta a receber, em nome do cliente da venda. Foram 4 vendas, R$ 59,50, listadas em `conta-receber/pendentes`, com vencimento no próprio momento da venda, e não em D+1. As vendas no crédito de antes da mudança continuam gravadas como à vista: cada venda guarda a condição que valia na hora dela (`documento_pagamento.flagavista`, e o plano de contas 1.1 ou 1.2). Por isso a condição tem de ser lida na venda, não no cadastro.
- **Várias formas numa venda** (o pedido 87 tem dinheiro, Pix e crédito) e **troco** como linha negativa de dinheiro (pedido 116: R$ 50,00 e −R$ 5,00).
- **O crédito de troca foi consumido.** O pedido 117 pagou R$ 77,00 com a forma 5 e aponta a troca de origem na parcela do pagamento: `documentoParcelaLista[].idDocumentoAdiantamento` = 61, na API, e `documento_parcela.iddocumentoadiantamento`, no SQL. A cópia do cliente na venda (`pessoa.idDocumentoAdiantamento`, de `documento_pessoa`) veio 0. A parcela da troca foi baixada, `conta-pagar/pendentes` voltou a 94 parcelas (R$ 245.864,76), e o adiantamento do Consumidor Final voltou a zero.
- **Sangria:** modelo `RS`, em dinheiro (R$ 5,00, "compra de agua sanitaria"). O suprimento tem dois modelos: `SF`, o fundo de troco, e `SD`, o suprimento adicional ("troco em moedas adicional"), que grava financeiro.
- **O calculado do fechamento segue a conta, ao centavo.** No FC 98, o dinheiro esperado foi R$ 58,00 = R$ 50,00 (SF) + R$ 3,00 (venda) + R$ 10,00 (SD) − R$ 5,00 (sangria). O operador informou R$ 20,00, uma quebra de teste de −R$ 38,00. Na linha "Troca/Devolução", o crédito usado entra no calculado como +R$ 77,00 (FC 118), e o crédito gerado entrava como −R$ 77,00 (FC 68, na simulação). Com o informado zero, isso daria uma falta ou uma sobra de R$ 77,00, se o Kaizen não tirasse essa linha da quebra.
- **Orçamento e pré-venda convertidos no caixa viram documento novo**, com "Docs Origem: N" na observação (`documento.observacao`). N é o `idexterno` do documento de origem. Ele se repete entre caixas (o 7 é o orçamento 88, do caixa 2, e também o pedido 112, do caixa 3) e até no mesmo caixa: no caixa 1, o 31 é o orçamento 85, origem da pré-venda 90, e também o fechamento 118. Para ligar, é preciso casar N com o caixa e com o modelo de origem (`OC` ou `PV`), e pegar o documento mais recente antes do documento novo **(confirmar** na operação real, quando a pré-venda for feita num terminal e fechada em outro). O documento novo leva a data do fechamento, o que já atende à decisão 7.
- **API:** as listas embutidas em `documento` vêm completas, exceto as parcelas **pendentes**. Para os 4 pedidos no crédito, a lista vem vazia; essas parcelas estão no SQL e em `conta-receber/pendentes`.

**Não aconteceu nos dados:**

- **Item removido antes de fechar:** não há nenhum evento de item (`documento_mercadoria_historico` vazia).
- **Venda cancelada:** nenhum documento com status `C`.
- **Venda sem internet:** não dá para identificá-la. Os pedidos 116 e 117 (caixa 10, sem abertura própria, com `idexterno` fora de sequência) são candidatos, mas nenhum campo confirma.

**Achados:**

1. **O turno não se identifica só pelo número do caixa e o da abertura.** Três casos:
   - "Caixa 1, abertura 2" existiu em 25/09, com o Igor, e em 26/09, com a Daniele.
   - "Caixa 1, abertura 1" também se repetiu: na simulação de 25/09 e com a Daniele em 26/09, do suprimento 83 ao fechamento 99, **sem documento `AX`**.
   - "Caixa 3, abertura 1" foi aberto duas vezes no mesmo dia, pela Daniele (AX 100) e pelo suporte (AX 109).

   O número da abertura conta por caixa e por usuário. Com o usuário que abriu (`documento.idusuarioabertura`: Igor 18152, Daniele 18153, suporte 9149), as aberturas ficam únicas. A exceção é o FC 118: ele fechou de novo a abertura 3 do Igor no caixa 1, já fechada às 08h37, e somou as vendas 116 e 117, feitas no caixa 10 mas lançadas nessa abertura. Como o dinheiro esperado de cada fechamento sai do próprio `FC`, que traz o calculado e o informado, a quebra de caixa funciona mesmo assim. O turno não pode depender de achar o `AX`. Como ligar cada venda ao seu turno fica para conferir na operação real, porque o dia dos testes também foi dia de configuração.
2. **Ficaram 5 turnos de teste abertos,** com R$ 231,00 de vendas sem conferência: Igor no caixa 1, abertura 4 (AX 75); Daniele no caixa 3, abertura 1 (AX 100); Daniele no caixa 1, abertura 2 (AX 102); Igor no caixa 2, abertura 2 (AX 104); e o suporte no caixa 3, abertura 1 (AX 109). A limpeza da base apaga todos eles. Como nenhum turno com venda no crédito já sem ser à vista foi fechado, não se sabe ainda se o calculado da linha "Cartão Crédito" soma essas vendas.
3. **Inventário:** o "TESTE" virou o documento `LE` 72, sem nenhum item. O "BALANÇO 1" estava aberto no fim dos testes, com 714 produtos contados de um cadastro de 1.029. Faltavam 315. As contagens ocupam 788 linhas, porque 69 produtos foram contados mais de uma vez. Dos 12 produtos que a simulação e os testes deixaram com saldo diferente de zero, 7 já estavam contados e 5 não: 61 (−4), 1352 (−1), 1360 (−1), 1362 (+1, da devolução do orçamento na simulação) e 1418 (−1).

## Limpeza da base (combinada em 26/09/2026)

O suporte vai apagar, direto no banco, as movimentações de teste, para o inventário ser lançado sobre uma base limpa (decisão 11). O Kaizen não apaga nada. Antes da limpeza, uma leitura tirou esta fotografia (26/09, 19h04) do que tem de continuar lá depois:

| O quê | Na fotografia |
| --- | --- |
| Contas a pagar (documentos 2 a 50, modelo `CP`) | 94 parcelas pendentes, R$ 245.864,76 |
| Produtos | 1.029: os 1.022 importados e 7 criados depois. 1.027 linhas de custo, somando R$ 17.967,88; preços somando R$ 33.841,65; 84 com custo zero |
| Pessoas | 447, entre elas o Consumidor Final 999007; 9 funcionários |
| Tarefas | 219, de 12 tipos; 5 perfis de usuário |
| Configuração | as 5 formas de pagamento; a troca (forma 5 e natureza 900); o cliente padrão 999007; os 4 caixas exigindo vendedor; o cartão de crédito sem ser à vista |
| Contagem do inventário "BALANÇO 1" (aberto) | 788 linhas, 714 produtos, 54.660,5 unidades |
| Ajustes de custo `AC` 76 a 80 | reais, embora estejam no meio da numeração dos testes: se forem apagados, os custos novos têm de continuar nos produtos |

E o que tem de sair: os documentos de teste 51 a 118, que são 20 pedidos, 6 pré-vendas, 5 orçamentos, 2 trocas, 10 aberturas, 6 fechamentos, 4 suprimentos (`SF` e `SD`), 1 sangria, 8 liberações e o inventário "TESTE". Com eles saem os itens, os pagamentos, as parcelas (inclusive as 4 contas a receber de teste, de R$ 59,50), as conferências de caixa e as 25 linhas de histórico de estoque.

**O ponto de atenção é o estoque.** Apagar documento direto no banco não desfaz o que ele fez no estoque, porque o gatilho `tr_estoque`, que atualiza o saldo, só roda quando um documento é incluído ou alterado. Na fotografia, 12 produtos tinham saldo de teste. Antes de encerrar o inventário, o saldo e a reserva de todos os produtos precisam estar em zero. Com o estoque zerado, tanto faz se o encerramento substitui o saldo pelo contado ou soma o contado ao saldo: o resultado é o mesmo.

## Conferência depois da limpeza e do inventário (27/09/2026)

Leitura de 27/09, comparada com a fotografia de 26/09.

| O quê | Fotografia (26/09) | Agora (27/09) | Resultado |
| --- | --- | --- | --- |
| Documentos de teste 51 a 118 | 68 documentos | nenhum | apagados |
| Contas a receber de teste | 4 (R$ 59,50) | nenhuma | apagadas |
| **Contas a pagar** | **94 parcelas, R$ 245.864,76** | **nenhuma** | **apagadas junto: precisam ser importadas de novo** |
| Produtos | 1.029 | 1.029 | iguais |
| Custos | soma R$ 17.967,88; 84 com custo zero | soma R$ 17.888,83; 85 com custo zero | o produto 2978 ficou com custo 0 (custo médio R$ 79,05), às 21h51 de 26/09, de propósito |
| Preços | soma R$ 33.841,65 | soma R$ 34.090,65 | 2 alterados, de propósito: o 2962 (R$ 250,00) e o 60 (R$ 16,00) |
| Pessoas, funcionários e tarefas | 447, 9 e 219 | 447, 9 e 219 | iguais |
| Leads do CRM | — | 575 | os da "Carteira antiga SNK", importados em 26/09; são reais |
| Configuração | — | igual | só mudaram as regras do inventário: agora substitui o saldo dos contados e não zera negativos |

**O inventário saiu certo.** O "BALANÇO 1" foi encerrado às 22h47 de 26/09 e virou o documento `LE` 48, com 788 itens e 54.660,5 unidades. Os números, produto a produto:

- **Os 1.029 produtos** estão com o saldo igual ao contado.
- **714 produtos têm estoque,** que soma 54.660,5 unidades.
- **315 produtos ficaram com zero.**
- **Nenhum produto está negativo,** e a reserva está zerada.
- **Os 69 produtos contados mais de uma vez** tiveram as contagens somadas.

Antes do encerramento, o suporte zerou os 12 produtos que os testes tinham mexido, com 5 ajustes de saldo (`AS`) às 22h40. O encerramento gravou 788 linhas no histórico de estoque. Por isso, a primeira entrada dos produtos contados é 26/09, às 22h47; para 12 deles, é o ajuste das 22h40. Como previsto, a carência do produto novo para os migrados vem da Link.

**Dois problemas encontrados** (o dono decidiu como tratar cada um: decisão 12):

1. **As 94 contas a pagar foram apagadas junto com os testes.** `conta-pagar/pendentes` está vazia. Sem elas, a folga em 7 e 30 dias sai errada. O dono vai importá-las de novo.
2. **Ficaram restos dos testes sem o documento a que pertenciam:**
   - 30 linhas de conferência de caixa (documentos 68, 71, 74, 98, 99 e 118);
   - 25 linhas de histórico de estoque (documentos 54 a 117);
   - 6 linhas do documento 58 em outras tabelas.

   A numeração dos documentos recomeçou do 1 e hoje vai até o 49. Os documentos novos vão reusar os números 50 a 118, provavelmente já na segunda, e esses restos passam a parecer deles. Um fechamento novo com um desses números apareceria com a conferência de teste, e uma venda nova herdaria movimentos de estoque de teste. Isso já aconteceu uma vez: as 1.022 linhas de histórico da importação antiga (documento 1) agora aparecem ligadas ao documento 1 novo, um ajuste de custo. Como essas linhas são de 0 para 0, esse caso é inofensivo. O dono decidiu não mandar apagar esses restos; a Fase 2 os trata como diz a decisão 12.

## Em aberto para a Fase 2: por onde o tradutor lê

Duas posições, com o argumento de cada uma. A decisão é do brainstorming da Fase 2.

- **Endpoint onde existe, SQL só para o que falta** (inclinação do dono). Os endpoints são interface pública, documentada no swagger. O SQL lê o esquema interno do ERP: não tem contrato e pode mudar sem aviso numa atualização. Nesse caminho, o SQL fica restrito ao que não tem endpoint: caixa (a conferência do fechamento, o principal), contas pagas por data de pagamento, histórico de estoque (estoque médio e primeira entrada), item removido antes de fechar, hora do cancelamento e fornecedor do produto.
- **SQL como caminho único.** Um mecanismo só (uma paginação, um formato), alcance de todas as tabelas, e as colunas com os nomes listados no fim deste documento. A proteção contra mudança de esquema seria o tradutor conferir, a cada execução, se as colunas esperadas existem, e falhar com aviso.

## Armadilha: o que cada relatório do ERP chama de venda

Os relatórios de venda contam só documento emitido (`status = 'E'`), exceto os que deixam escolher emitido ou cancelado na tela. O resto muda de um para outro. Principais combinações entre os relatórios que somam valor de venda:

| Tipos de documento que contam | Exige "gera recebimento" | Soma | Relatórios |
| --- | --- | --- | --- |
| Qualquer tipo; **só item com vendedor** | sim | itens | **154** (régua), 29, 5 |
| `PV`, `PA`, `OC`, `CN`, `55`, `65` | sim | itens | 2, 3, 7 (ticket médio, venda por hora) |
| `55`, `65`, `PV`, `OC`, `PA` | sim | itens | 13, 57, 75, 76, 94, 159 |
| `55`, `65`, `PV`, `OC`, `PA` | não | itens | 165, 168, 172 |
| `55`, `65`, `PV`, `OC`, `PA` | sim | pagamentos | 160, 161, 166 |
| `55`, `65`, `PV`, `OC`, `PA` | não | pagamentos | 74 |
| `55`, `65`, `PV`, `OC` (sem pedido); exclui a forma "troca" | sim | pagamentos | 162 |
| `55`, `65`, `PV`, `OC`, `OS`, `PA` | sim | itens | 12 |
| `55`, `65`, `PV`, `OC`, `OS`, com ou sem `PA` | não | itens | 91, 92 |
| `PV`, `PA`, `55`, `65`, `CN`, `OS` | não | pagamentos | 16 (venda total por cliente) |
| Inclui serviço e transporte: `NS`, `OS`, `PV`, `67`, `65`, `59`, `57`, `55`, `PA` | sim | pagamentos | 169, 59, 68 |
| `55`, `65`, `59`, `PV`, `OC`, `PA`, `OS` | sim | itens | 149 |
| `65`, `55`, `59`, `PV`, `PA`; status escolhido na tela | sim | itens | 163 |
| Só fiscais: `65`, `55`, `59`; status escolhido na tela | não | itens | 62, 63 |
| Escolhidos na tela | varia | varia | 4, 61, 98, 148 |

Códigos: `65` NFC-e, `55` NF-e, `59` CF-e, `PV` pré-venda, `PA` pedido de venda, `OC` orçamento, `CN` condicional, `OS` ordem de serviço, `NS` NFS-e, `57`/`67` CT-e. "Gera recebimento" é `tipomovimentofinanceiro = 'R'`. A lista completa, relatório por relatório, está no anexo no fim.

**Na prática:** a loja vai usar pré-venda, orçamento, pedido, NFC-e e NF-e (decisão 9). Nos testes de 25 e 26/09, toda venda do caixa saiu como pedido (`PA`), e o orçamento ou a pré-venda de origem continuaram emitidos. É justamente o caso em que os relatórios divergem. Os que somam itens de `PV`, `OC` e `PA` sem exigir recebimento (entre eles 91, 165, 168, 171 e 172) contam duas vezes a pré-venda e o pedido que saiu dela. O 154 não, porque orçamento e pré-venda não geram recebimento. **(Confirmar** a partir de 28/09 se a NFC-e sai como documento separado do pedido; item da "Etapa 2".)

**O que o 154 conta**, linha a linha do SQL dele:

- itens (`documento_mercadoria.valtotalliquido`) de documentos com `status = 'E'`, `tipomovimento = 'S'` e `tipomovimentofinanceiro = 'R'`, pela data `DATE(datahora)`;
- não filtra tipo de documento: quem deixa orçamento e pré-venda de fora é a exigência de gerar recebimento, porque os dois gravam `tipomovimentofinanceiro = 'N'` (conferido na simulação). O pedido de venda (`PA`) gera recebimento e conta, mesmo sem pagamento registrado. O condicional não foi testado;
- só soma item com vendedor (`idpessoafuncionario > 0`): item vendido sem vendedor fica fora do total (na simulação, uma venda de R$ 77,00);
- não desconta nenhum documento de entrada: troca e devolução são documentos `TM` de entrada e não reduzem o número do 154 (conferido na simulação);
- soma pela data do documento (`datahora`): orçamento convertido em venda conta no dia do orçamento (conferido na simulação).

## Lista 1 — O que a API entrega (endpoints)

| O quê | Endpoint | Campos que interessam |
| --- | --- | --- |
| Vendas e demais documentos, com itens, custo do item, pagamentos, parcelas, baixas e cópia do cliente, numa resposta só | `documento` (filtros `DataInicio`, `DataFim` sobre `dataHora`; `Modelo`, `Status`, `TipoMovimento`, `IdCaixa`) | `codigo`, `dataHora`, `dataHoraMovimento`, `tipoDataHoraMovimento`, `modelo`, `status`, `tipoMovimento`, `tipoMovimentoFinanceiro`, `idPessoa`, `idCaixa`, `idCaixaAbertura`, `idUsuarioAbertura`, `idAbertura`, `idExterno`, `observacao` (o "Docs Origem"), `modificado`, `valTotal`. Em `mercadoriasLista[].documentoMercadoria`: `_IdSequencia`, `idMercadoriaVariacao`, `qtd`, `valTotalLiquido`, `valDesconto`, `idPessoaFuncionario`, `nomePessoaFuncionario` (vazio nas vendas do caixa), `idDocumentoOrigem`, `qtdDevolucao`. Em `mercadoriasLista[].documentoMercadoriaCustoLista[]`: `valCusto`, `valCustoMedio`. Em `pagamentosLista[].documentoPagamento`: `_IdSequencia`, `idPagamento`, `valor`, `flagAVista`, `codigoPlanoConta`, `tipoIntegracaoCartao`. Parcelas em `pagamentosLista[].documentoParcelaLista[]` (com `idDocumentoAdiantamento`; as pendentes não vêm) e baixas em `pagamentosLista[].documentoParcelaPagamentoLista[]` (com `idPagamento` e `dtPagamento`). Em `pessoa`: `cnpjCpf`, `bairro`, `municipio`, `idIbgeMunicipio` |
| Itens e pagamentos de um documento | `documento/{id}/mercadorias`, `documento/{id}/pagamentos` | mesmos campos, um documento por chamada |
| Vendido por produto no período (já somado) | `documento/mercadorias-vendidas` | `idMercadoriaVariacao`, `qtd`, `valTotalLiquido` |
| Turno de caixa: abertura, suprimento, suprimento adicional, sangria e fechamento (sem os valores da conferência) | `documento` com `Modelo` = `AX`, `SF`, `SD`, `RS`/`RT`, `FC`. O filtro `IdCaixa` é o caixa onde o documento foi feito, não o do turno | `idCaixaAbertura`, `idUsuarioAbertura` e `idAbertura` (o turno); `pagamentosLista[].documentoPagamento.valor`. Sangria `RS` conferida em 26/09; `RT` **(confirmar)** |
| Inventário: contagem e encerramento por produto | `inventario`, `inventario/{id}/mercadorias`, `inventario/{id}/encerramentos` | `status`, `idDocumento`; por item, `idMercadoriaVariacao`, `qtdContada`, `qtdAnterior` |
| Estoque atual (foto) | `local-estoque/1/estoques` (há um único local: 1, "Local de estoque padrão") | `idMercadoriaVariacao`, `qtdSaldo`, `qtdSaldoReserva`, `dataHora` |
| Custo atual | `mercadoria-custo` | `idMercadoriaVariacao`, `valCusto`, `valCustoMedio` |
| Produtos | `mercadoria` | `codigoMercadoriaVariacao`, `descricao`, `referenciaVariacao`, `idGrupo`, `idSecao`, `idSubgrupo`, `idMarca`, `ativo`, `dataAlteracao` |
| Clientes | `pessoa`, `pessoa/cnpjcpf` | `codigo`, `razaoSocial`, `cnpjCpf`, `tipo`, `dataCadastro`, `ativo` |
| Endereço do cliente | `pessoa/{id}/enderecos` | uma chamada por cliente |
| Vendedores | `funcionario` | `codigoPessoa`, `tipo` (V = vendedor), `ativo` |
| Formas de pagamento | `pagamento` | `codigo`, `descricao`, `idTipo`, `aVista`, `tipoIntegracaoCartao` |
| Contas a pagar pendentes | `conta-pagar/pendentes` (filtro `inicio`/`fim` sobre o vencimento) | `idDocumento`, `idParcela`, `nome`, `dtVencimento`, `valOrigem`, `valPago`, `valSaldo`, `status` |
| Contas a receber pendentes (hoje, as vendas no cartão de crédito) | `conta-receber/pendentes` (filtro `inicio`/`fim`) | `idDocumento`, `dtVencimento`, `valSaldo`, `status` |
| DRE | `dre` (`DataInicio`, `DataFim`) | linhas no formato da tela do ERP |

A API **não** entrega: a conferência às cegas do fechamento (calculado × informado), baixas filtradas pela data de pagamento, histórico de estoque em lote (só produto por produto, `mercadoria/{id}/local-estoque/{local}/estoque-historico/{data}`), item cancelado antes de fechar, motivo e hora do cancelamento, fornecedor do produto.

**Filtro por data.** A API filtra `documento` e `documento/mercadorias-vendidas` só por `dataHora`, a data de criação; a segunda ainda exige um `Modelo` por chamada. Não há filtro por `dataHoraMovimento` nem por `modificado`. O vendido conta por `dataHoraMovimento` (decisão 7). O orçamento convertido no próprio documento guarda o `dataHora` do orçamento, ganha o `dataHoraMovimento` do fechamento e continua com `modificado` em `N`. No único caso visto (pedido 58), só `tipoDataHoraMovimento = 'A'` o distinguia entre os 66 documentos lidos pela API. Se essa conversão for dias depois, a releitura por janela de `dataHora` não a encontra. Pelo SQL, o filtro vai em `datahoramovimento`, e a conversão fica em `documento_historico` (evento `TR`). Pela API, o tradutor precisa reler pelo código (`IdDocumento`) cada orçamento já visto que ainda não virou venda.

## Lista 2 — O que só o SQL entrega

| O quê | Tabelas |
| --- | --- |
| Fechamento às cegas por forma: calculado × informado | `documento_conferencia_caixa` (+ `documento_conferencia`) |
| Contas pagas por data de pagamento (liquidadas) | `documento_parcela` + `documento_parcela_pagamento` |
| Saldo de estoque em qualquer data (estoque médio, giro) | `mercadoria_estoque_historico` |
| Data da primeira entrada do produto (carência do encalhe) | `mercadoria_estoque_historico`: primeira linha do produto em que o saldo sobe (`qtdnovosaldo > qtdsaldoatual`) |
| Item removido antes de fechar a venda | `documento_mercadoria_historico` com `tipoevento = 'CO'` |
| Hora e motivo do cancelamento da venda | `documento_cancelamento_historico` |
| Orçamento convertido em pedido no próprio documento (o 58, feito fora do caixa): origem → destino. A conversão feita no caixa cria documento novo e não grava linha aqui: a origem fica só no texto "Docs Origem: N" da observação (N = `idexterno` da origem), que a API também entrega | `documento_historico` (evento `TR`) |
| Fornecedor do produto | `mercadoria_variacao_pessoa`, `mercadoria_fornecedor` |
| Endereço de todos os clientes numa consulta, com latitude e longitude | `pessoa_endereco` |
| O que mudou desde a última leitura — só cadastros e saldo de estoque | `tabela_alteracao` (`_tabela`, `_oid`, `versao`, `datahora`) |
| Como o próprio ERP calcula cada relatório | `relatorio.sql` (172 relatórios) |

**Primeira entrada do produto.** O cadastro não tem data de criação, só a da última alteração. Mas o histórico de estoque é gravado pelo gatilho `tr_estoque` da tabela `documento`: todo documento emitido que mexe em estoque grava uma linha por item, com a data do documento (`datahora`), o documento de origem (`_iddocumento`) e o saldo antes e depois. A primeira entrada de cada produto sai de lá. Ressalvas: estoque lançado direto no saldo, sem documento, não deixa linha; e se o estoque inicial entrar por um documento de inventário, todo produto migrado terá a mesma primeira entrada, e para esses a carência vem da Link (Fase 3). Na importação de 24/09 o documento `IM` gravou 1.022 linhas de saldo 0 para 0, que não contam como entrada; a primeira entrada será o lançamento do estoque, que o dono faz depois.

Existem também `meta` e `meta_tipo` (metas no ERP). O Kaizen não as usa: as metas ficam no Kaizen, como decidido no `OBJETIVO.md`.

## Lista 3 — O que não existe em lugar nenhum

| O quê | Situação | Saída possível |
| --- | --- | --- |
| Saldo do banco | Já sabido: o depósito não é lançado no ERP | O dono digita no Kaizen (decidido) |
| Recebível de cartão por data de crédito | Desde 26/09, do pedido 101 em diante, Pix, crédito e débito têm `tipoIntegracaoCartao = X` ("PixEi", pelo swagger). Mesmo assim, a tabela de transações de cartão (`documento_tef`) continuou vazia em todos os documentos de 26/09, sem prazo de recebimento, e a conta a receber do crédito vence no próprio momento da venda | Regra no Kaizen: venda no cartão (formas 3 e 4) + D+1 (`LOJA.md`). **(Confirmar** na operação real se a integração passa a gravar `documento_tef.qtddiasrecebimento`; se gravar, o recebível passa para a lista 2) |
| Feriados de São Luís e do Maranhão | A tabela `feriado` tem só os 13 nacionais | Lista própria no Kaizen (decidido) |
| Pedido de compra / estoque a chegar | A loja não registra (`LOJA.md`) | Não entra |

## Cada indicador e sua fonte

| Indicador | Lista | Onde |
| --- | --- | --- |
| Meta da loja e do vendedor | — | Cadastrada no Kaizen |
| Realizado do dia e do mês | 1 | Três números (decisão de 25/09). Vendido: regra do 154, mas na data do fechamento (`datahoramovimento`). Devoluções: itens dos documentos `TM`, na data e no vendedor da troca. Líquido: vendido − devoluções |
| Projeção do mês por dia da semana | 1 + 3 | Realizado + feriados locais |
| Ritmo por vendedor | 1 + 3 | Vendedor no item (`idpessoafuncionario`) + dias úteis (feriados locais) |
| Ticket médio, itens por venda | 1 | Venda + itens |
| Vendas por hora e por dia da semana | 1 | `datahoramovimento` da venda (na API, `dataHoraMovimento`), a mesma data do Realizado (decisão 7). Com `datahora`, o orçamento convertido no próprio documento cairia no dia e na hora do orçamento |
| Curva ABC de clientes, RFV, clientes que pararam | 1 | `idpessoa` da venda. A venda para o Consumidor Final (pessoa 999007) não entra **(confirmar a proporção)**. A pessoa 2 é hoje um cliente real e entra. Não usar o campo fiscal `flagconsumidorfinal`, que vale S em todos os clientes das vendas de teste, inclusive empresas |
| Distribuição por região | 1 ou 2 | Cópia do endereço na venda (API) ou `pessoa_endereco` (SQL), sem as vendas para o Consumidor Final 999007: ele tem endereço cadastrado e poria todo o balcão num bairro só |
| Venda, mix e clientes por vendedor | 1 | Itens: vendedor, grupo, seção, marca; cliente da venda |
| Curva ABC de produtos (valor e quantidade) | 1 | Itens ou `documento/mercadorias-vendidas` |
| Giro | 1 + 2 | Vendido + estoque médio de `mercadoria_estoque_historico` |
| Cobertura | 1 | Estoque atual + ritmo de venda |
| Giro/cobertura por grupo e marca | 1 | Cadastro do produto |
| Giro/cobertura por fornecedor | 2 | `mercadoria_variacao_pessoa` ou última nota de entrada |
| Encalhe (90 dias, carência para produto novo) | 1 + 2 | Estoque + última venda + primeira entrada em `mercadoria_estoque_historico`; produto migrado, data da Link |
| Ruptura | 1 | Vendeu no período e `qtdSaldo <= 0` |
| Custo zero | 1 | `mercadoria-custo` com `valCusto = 0` |
| Estoque negativo | 1 | `qtdSaldo < 0`; o ERP permite (`config_estoque.flagpermitirestoquenegativo = T`) |
| Contas a pagar por vencimento | 1 | `conta-pagar/pendentes`, sem os créditos de troca (modelo `TM`) |
| Folga em 7 e 30 dias | 1 + 3 | Pendentes, sem os créditos de troca, + saldo digitado |
| Fluxo de caixa realizado | 1 + 2 + 3 | Entradas: pagamentos das vendas nas formas 1 a 4, sem a forma 5, que é o crédito de troca (o pedido 117 "pagou" R$ 77,00 com ela sem entrar dinheiro). O cartão entra em D+1, pela regra do `LOJA.md` (lista 3), e não pela baixa do ERP. Saídas: baixas de contas a pagar por `dtpagamento`, sem as parcelas de `TM` baixadas com a forma 5 (a troca 61 foi baixada assim, sem sair dinheiro). A devolução paga em dinheiro continua como saída. Suprimento (`SF`, `SD`) e sangria (`RS`, `RT`) também gravam parcela baixada, mas são dinheiro mudando de lugar dentro da loja e ficam fora. Se a sangria servir para pagar despesa (a de 26/09 foi "compra de agua sanitaria"), o dono decide se ela conta como saída **(confirmar)** |
| Fluxo de caixa previsto | 1 + 3 | Saídas: `conta-pagar/pendentes` por vencimento, sem os créditos de troca (`TM`). Entradas: o cartão a receber, pela regra D+1 sobre os pagamentos nas formas 3 e 4. Não somar `conta-receber/pendentes`: desde 26/09 ela repete as vendas no crédito, e o mesmo dinheiro contaria duas vezes |
| Quebra de caixa por turno e forma | 2 | `valconferido − valdisponivel` por forma, só Dinheiro, Pix, Crédito e Débito, sem a linha "Troca/Devolução" (decisão: sem recontado); por documento de fechamento (`FC`). Ainda falta conferir a ligação de cada venda ao turno e se o calculado da linha "Cartão Crédito" inclui as vendas no crédito depois que ele deixou de ser à vista |
| Gaveta e sangrias | 1 + 2 | Suprimento (`SF`), suprimento adicional (`SD`), sangria (`RS`, conferida em 26/09; `RT` não apareceu), vendas em dinheiro (o troco é uma linha negativa) e devoluções em dinheiro. O calculado do ERP confere: R$ 92,00 na simulação; R$ 58,00 = 50,00 + 3,00 + 10,00 − 5,00 no FC 98. No relatório 164, o `SD` só entra quando o caixa tem `config_pos.flagsomarsuprimento = 'T'` |
| Recebíveis de cartão por data de crédito | 3 | Regra D+1. Desde 26/09, a venda no crédito gera conta a receber (`conta-receber/pendentes`), mas com vencimento no dia da venda; se o prazo do cartão for configurado no ERP, o recebível passa a sair de lá |

Alertas, briefing e interpretação por IA usam os indicadores acima. Tarefas e anotações do vendedor são dados do próprio Kaizen. A geolocalização tem campo no ERP (`pessoa_endereco.latitude`/`longitude`), mas veio vazia na importação: nenhum dos 445 endereços tem coordenada. Ela terá de ser preenchida pelo endereço, como o `OBJETIVO.md` já prevê.

## Respostas às perguntas da fase

**Status de documento.** `C` cancelado, `E` emitido, `I` inutilizado, `O` conferido, `R` rascunho, `V` enviado, `X` excluído, `Z` contingência. Os relatórios de venda do ERP contam só `E`, exceto os que deixam escolher na tela. **(Confirmar** em que status termina uma NFC-e da loja.)

**Tipos de pagamento.** Cinco formas cadastradas (conferido em 26/09, às 19h):

| Código | Descrição | Tipo | À vista | Integração |
| --- | --- | --- | --- | --- |
| 1 | Dinheiro | 1 | S | nenhuma (`N`) |
| 2 | Pix | 17 (Pagamento Instantâneo Dinâmico) | S | PixEi (`X`), desde 26/09 |
| 3 | Cartão Crédito | 3 | N desde 26/09, entre 14h09 e 14h27 (antes, S) | PixEi (`X`), desde 26/09 |
| 4 | Cartão Débito | 4 | S | PixEi (`X`), desde 26/09 |
| 5 | Troca/Devolução | 81; ainda com o parcelamento "1x em 30 dias" da antiga forma "Prazo" | N | nenhuma (`N`) |

Em 24/09, a forma 5 era "Prazo" (tipo 5, Crédito Loja). Em 25/09, ela virou "Troca/Devolução" (decisão 4). Pela forma 5 não entra dinheiro: ela registra o crédito de troca sendo gerado ou usado, e fica fora da quebra de caixa e do fluxo de caixa. Cada venda guarda a condição que valia na hora dela (`documento_pagamento.flagavista`). A integração `X` começou no pedido 101, às 14h00 de 26/09; mesmo com ela, `documento_tef` ficou vazia em todos os documentos de 26/09.

**Como se distingue venda.** Pelo trio `tipomovimento = S` (saída), `tipomovimentofinanceiro = R` (gera recebimento) e `status = E`, e pelo `modelo`: `65` NFC-e, `55` NF-e, `PV` pré-venda, `PA` pedido, `OC` orçamento, `CN` condicional. Outros modelos:

- caixa: `AX` abertura, `SF` suprimento (fundo de troco), `SD` suprimento adicional, `RS`/`RT` retirada (sangria), `FC` fechamento. `RU` (fundo de caixa) aparece no relatório 1, "RETIRADAS DE CAIXA DETALHADO", junto de `RS` e `RT`: o ERP o trata como retirada, não como suprimento. Ele não apareceu nos testes;
- troca e devolução: `TM`;
- estoque: `LE` inventário, `PE` perda, `TS` transferência;
- cadastro: `AC`, custo alterado pelo cadastro (5 em 26/09, sem mexer em estoque nem em financeiro);
- outros: `LP` liberação de permissão, `IM` importação de cadastro, `CP` conta a pagar (as 94 importadas são desse modelo).

Qual combinação conta depende do relatório (seção "Armadilha"); a régua é a do 154. Na simulação, o caixa gravou a venda como pedido de venda (`PA`), e a pré-venda não ficou ligada ao pedido **(confirmar** se na operação real a venda será NFC-e).

**Documento alterado depois de lido.** Não há registro de alteração para documentos (nenhum dos 154 gatilhos de alteração é de documento). O que existe:

- a hora do cancelamento (`documento_cancelamento_historico.datahora`);
- a hora da conversão (`documento_historico.datahora`);
- a hora da remoção de item (`documento_mercadoria_historico.datahora`);
- a marca `flagmodificado`.

E um caso que escapa da releitura por janela: o orçamento convertido no próprio documento muda de `OC` para `PA` sem mudar `datahora` (orçamento 58). Se ele for mais antigo que a janela, o tradutor precisa relê-lo pelo código ou ler pelo SQL (ver "Filtro por data", na lista 1).

Para cadastros e saldo de estoque há `tabela_alteracao`, com versão crescente, que permite ler só o que mudou. **(Confirmar** o atraso real do PDV offline.)

**Limite e páginas.**

- Foram 180 chamadas, todas respondidas, nenhuma recusada pelo limite (uma voltou com erro 400, por uma coluna errada numa consulta de leitura).
- O tempo típico de resposta foi de 0,2 s, variando de 0,1 a 1,2 s.
- O limite conta por minuto do relógio: com 19 chamadas no minuto, a seguinte ficou retida 22,7 s e só foi respondida na virada do minuto.
- Nenhum cabeçalho informa o limite.
- A página padrão tem 50 registros e a máxima, 100, tanto nos endpoints quanto no SQL; pedir mais que isso devolve 100.

**Código da Link e CPF/CNPJ.** O código da Link **não** está na referência da variação, como o `LOJA.md` dizia antes da correção de 24/09: ele é o próprio código do produto (`codigoMercadoriaVariacao` na API, `_idmercadoriavariacao` no SQL), conferido em 3 de 3 casos (seção "Conferência da importação"). A referência (`referenciaVariacao` na API, `mercadoria_variacao.referencia` no SQL, cópia em `documento_mercadoria.referencia`) guarda a do fabricante, em 469 dos 1.022 produtos. O CPF/CNPJ fica em `pessoa.cnpjcpf`, só números: 420 das 445 pessoas têm, 330 CPF e 90 CNPJ, sem duplicidade. A busca por CPF/CNPJ aceita com ou sem máscara.

**Fuso.** O banco está em `America/Sao_Paulo`, que tem o mesmo horário de Fortaleza (UTC−3, sem horário de verão). As datas são gravadas sem fuso, na hora local.

## Etapa 2 — o que falta conferir

Com o fechamento da Fase 1, em 27/09, os itens abertos desta lista mudam de dono. Os da operação real ("Na operação real, a partir de 28/09") passam a ser o primeiro passo da Fase 2. Os outros ficam com o dono, como indicado em cada um.

Depois da importação dos cadastros (feita em 24/09; resultados na seção "Conferência da importação"):

- [x] Quantos produtos, variações e clientes entraram: 1.022 produtos (uma variação cada), 445 pessoas.
- [x] Onde está o código da Link: no código do produto, não na referência; e quantos clientes têm CPF/CNPJ: 420 de 445.
- [x] Como o estoque inicial entrou: não entrou; documento `IM` com quantidade zero em todos.
- [x] Quantos produtos vieram com custo zero: 84.
- [x] Os 369 produtos a menos que na Link: limpeza de propósito do dono, que fez o mesmo com parte dos clientes.

Antes da operação real:

- [x] Troca configurada (25/09): forma 5, "Troca/Devolução", e natureza 900.

Na simulação de 25/09 (seção "Simulação do dono"):

- [x] Tipos de documento: a venda do caixa saiu como `PA`; orçamento e pré-venda não geram recebimento e ficam fora do 154.
- [x] No 154: item sem vendedor fica fora (R$ 77,00); troca e devolução não reduzem o total.
- [x] Como aparecem troca e devolução.
- [x] Turno (documentos `AX` e `FC`) e conferência em `documento_conferencia_caixa`; o calculado bate com a conta do `LOJA.md`.
- [x] Suprimento (`SF`) e devolução paga em dinheiro.
- [x] As listas dentro de `documento` vêm preenchidas, exceto a parcela pendente do crédito de troca.
- [x] O saldo de estoque gera entrada em `tabela_alteracao` a cada venda.
- [x] As pré-vendas 64 e 65 viraram os pedidos 67 e 66; a ligação é só texto na observação do pedido.

Testes de 26/09, antes de encerrar o inventário (seção "Testes do dono"):

- [x] Sangria (`RS`), e o suprimento adicional (`SD`).
- [x] Pagamento em Pix, débito e crédito, venda com várias formas e troco.
- [x] A venda com o cliente padrão cai no Consumidor Final 999007. O ERP não deixa vender sem cliente.
- [x] O caixa exige o vendedor.
- [x] O crédito de troca de R$ 77,00 foi consumido e a conta a pagar dele sumiu.
- [x] Cancelamento de venda inteira e de item antes de fechar: não apareceu nos dados. Passou para "Na operação real".
- [x] Venda com o caixa sem internet: não dá para identificar nos dados. Passou para "Na operação real": medir na operação real, comparando a hora em que o tradutor vê a venda com a hora gravada nela.

Depois da limpeza da base pelo suporte, antes de encerrar o inventário (seção "Limpeza da base"; isso substitui "fechar os 5 turnos" e "limpar as 4 contas a receber"):

Conferido em 27/09 (seção "Conferência depois da limpeza e do inventário"):

- [x] Sumiram os documentos de teste 51 a 118. `conta-receber/pendentes` voltou a 0, e não sobrou turno aberto. Ficaram restos sem documento (30 linhas de conferência, 25 de histórico, 6 do documento 58).
- [x] Conferido: as 94 parcelas a pagar (R$ 245.864,76) **não** ficaram. Foram apagadas junto, e `conta-pagar/pendentes` está vazia (decisão 12).
- [x] Ficaram os cadastros, as tarefas, a configuração e a contagem do "BALANÇO 1", com os números da fotografia.
- [x] Ficaram os custos, exceto o produto 2978, que ficou com custo 0 às 21h51 de 26/09.
- [x] Os 12 produtos mexidos pelos testes foram zerados antes do inventário, com 5 ajustes de saldo `AS`.

Com o dono (decisão 12):

- [ ] Importar de novo as 94 contas a pagar. O dono resolve depois, e isso não atrapalha o projeto.
- [x] Restos sem documento (30 linhas de `documento_conferencia_caixa`, 25 de `mercadoria_estoque_historico` e 6 do documento 58): o dono decidiu não mandar apagar. A Fase 2 trata esses restos como descrito na decisão 12.
- [x] O custo 0 do produto 2978 e os preços novos do 2962 e do 60 são de propósito (dono, 27/09).

Depois do encerramento do inventário:

- [x] O saldo de cada produto ficou igual ao contado, nos 1.029: `mercadoria_estoque.qtdsaldo` igual a `inventario_encerramento.qtdcontada`.
- [ ] Com o dono: confirmar os produtos sem contagem. Dos 1.029, 714 foram contados, e os 315 restantes ficaram com saldo zero. Com "zerar itens não contados" desligada, cada produto não contado fica com o saldo que tinha no encerramento, zero depois da limpeza. O dono confirma que esses produtos não têm mesmo mercadoria na loja. Produto com mercadoria e saldo zero vira ruptura falsa na primeira venda e sai da cobertura, do giro e do encalhe. Para comparar: na Link, em 12/09, 863 produtos tinham estoque positivo.
- [x] Os 69 produtos contados mais de uma vez tiveram as contagens somadas no encerramento. Falta o dono confirmar que era para somar (o mesmo produto em dois lugares) e que não foi contagem repetida.
- [x] O estoque entrou pelo documento `LE` 48, que gravou 788 itens e 788 linhas em `mercadoria_estoque_historico`. A primeira entrada dos produtos contados é 26/09, 22h47.

Na operação real, a partir de 28/09:

- [ ] Primeira NFC-e e primeira NF-e: tipo, status final, e se a venda fica um documento só ou dois (pedido e nota). Se ficarem dois, o 154 pode contar em dobro.
- [ ] Primeiro orçamento fechado em outro dia: conferir que `datahoramovimento` leva a data do fechamento, na conversão feita no próprio documento. Na conversão que cria um documento novo, a data já é a do fechamento.
- [ ] Como cada venda se liga ao seu turno: `idcaixaabertura` + `idusuarioabertura` + `idabertura` foi único nos testes, exceto no FC 118, que fechou de novo um turno já fechado.
- [ ] No primeiro fechamento com venda no crédito: se o calculado da linha "Cartão Crédito" soma essas vendas, que desde 26/09 não são mais à vista. Se não somar, cada venda no crédito aparece como sobra de caixa.
- [ ] Na primeira semana, com o dono: se as vendas de cada vendedor saem com o código dele. Se o caixa sugerir sempre o mesmo vendedor, o ritmo por vendedor sai errado.
- [ ] Os primeiros cancelamentos reais (da venda inteira e de item antes de fechar), que não apareceram nos testes.
- [ ] Se a pré-venda reserva estoque, agora que há estoque lançado.
- [ ] Proporção de vendas para Consumidor Final; itens por venda; atraso real do caixa sem internet.
- [ ] Se a DRE da API bate com a tela do ERP.

## Como foi feito

Um script descartável, fora do repositório, chamou a API com uma trava que só deixa passar leitura: GET, e POST apenas no `consulta/sql` com um único comando SELECT. Foram 180 chamadas (63 endpoints, 117 consultas SQL) e nenhuma escrita: 21 na conferência da importação, 26 na leitura da simulação, 26 na leitura dos testes de 26/09, 7 na fotografia antes da limpeza e 30 na conferência depois dela. O mapa do banco veio de `information_schema` (365 tabelas e 3 visões), dos gatilhos (inclusive o código do que grava o histórico de estoque) e do SQL dos 172 relatórios do próprio ERP.

A revisão também foi feita de forma independente. As conclusões sobre os testes de 26/09 passaram por três verificadores, e o documento inteiro, em 26/09, por cinco revisores (completude, coerência, exatidão contra os dados, utilidade para a Fase 2 e clareza para o dono). Cada revisor teve um verificador que tentou derrubar os achados. Os 60 achados foram confirmados e corrigidos neste documento.

## Tabelas e colunas (para a Fase 2)

Colunas com `_` na frente formam a chave da tabela. Todas as tabelas têm também `oid`, o identificador da linha usado por `tabela_alteracao._oid`. Só as colunas que interessam aos indicadores estão listadas; o nome é o do banco.

### Vendas

**`documento`** — cabeçalho de todo documento (venda, nota de entrada, sangria, conferência de caixa, conta a pagar).
`_iddocumento`, `idempresa`, `idcaixa` (onde o documento foi feito), `idabertura`, `idcaixaabertura`, `idusuarioabertura` (esses três ligam ao turno), `idusuario`, `nomeusuario`, `idpessoa`, `datahora` (criação), `datahoramovimento` (fechamento; a data do vendido), `tipodatahoramovimento`, `numero`, `serie`, `modelo`, `tipomovimento`, `tipomovimentoestoque`, `tipomovimentofinanceiro`, `idnaturezaoperacao`, `naturezaoperacao`, `status`, `flagmodificado`, `idexterno` (número local do caixa), `observacao` (o "Docs Origem: N" da conversão feita no caixa), `oid`

**`documento_mercadoria`** — itens.
`_iddocumento`, `_idsequencia`, `idmercadoria`, `idmercadoriavariacao`, `descricao`, `referencia`, `qtd`, `qtdestoque`, `valunitariobruto`, `valunitarioliquido`, `valtotalbruto`, `valtotalliquido`, `valdesconto`, `valacrescimo`, `idpessoafuncionario`, `nomepessoafuncionario`, `idsecao`, `idgrupo`, `idsubgrupo`, `idmarca`, `marca`, `idlocalestoque`, `iddocumentoorigem`, `qtddevolucao`

**`documento_mercadoria_custo`** — custo do item no momento da venda.
`_iddocumento`, `_idsequencia`, `idmercadoriavariacao`, `valcusto`, `valcustomedio`

**`documento_pagamento`** — formas de pagamento da venda.
`_iddocumento`, `_idsequencia`, `idpagamento`, `idtipo`, `descricao`, `valor`, `flagavista`, `valdesconto`, `valacrescimo`, `tipointegracaocartao`, `codigoplanoconta`

**`documento_pessoa`** — cópia do cliente gravada na venda.
`_iddocumento`, `idpessoa`, `nome`, `cnpjcpf`, `bairro`, `idibgemunicipio`, `municipio`, `uf`, `flagconsumidorfinal`

**`documento_cancelamento_historico`** — cancelamento da venda inteira.
`_iddocumento`, `idusuario`, `motivo`, `datahora`

**`documento_mercadoria_historico`** — item removido antes de fechar (`tipoevento = 'CO'`).
`_iddocumento`, `_idsequencia`, `idmercadoriavariacao`, `tipoevento`, `datahora`, `qtd`, `valunitarioliquido`, `valtotalliquido`, `observacao`

**`documento_historico`** — conversão feita no próprio documento (ex.: orçamento 58 em pedido, evento `TR`, `OC>PA`). A conversão feita no caixa não grava linha aqui.
`_iddocumento`, `_idsequencia`, `evento`, `modeloorigem`, `modelodestino`, `iddocumentoorigem`, `numeroorigem`, `datahora`

**`documento_sincronizacao`** — integração do documento (possível pista do PDV offline).
`_iddocumento`, `_tipointegracao`, `datahora`, `situacao`, `status`

**`natureza_operacao`** — 81 naturezas; define se o documento é venda (`tipocategoria = 'V'`), compra (`C`), devolução (`D`) e se mexe em estoque e financeiro.
`_idnatureza`, `descricao`, `tipomovimento`, `tipocategoria`, `flagmovimentarestoque`, `flagmovimentarfinanceiro`, `flaggerarcomissao`, `cfop`

**`pagamento`** — formas de pagamento.
`_idempresa`, `_idpagamento`, `descricao`, `idtipo`, `flagavista`, `tipointegracaocartao`, `idcontapadrao`

### Caixa

**`caixa_controle`** — tabela de turno, mas ficou vazia na simulação e nos testes: o turno está nos documentos `AX` e `FC`, por `idcaixaabertura` + `idusuarioabertura` + `idabertura`. Colunas, caso ela passe a ser usada:
`_idabertura`, `_idempresa`, `_idusuario`, `numeroabertura`, `datahoraabertura`, `datahorafechamento`, `valsuprimentoinicial`, `status`, `idconta`, `idpessoafuncionario`, `iddocumentoaberto`, `tipo`, `origem`

**`documento_conferencia_caixa`** — fechamento às cegas, uma linha por forma. `valdisponivel` é o calculado pelo sistema; `valconferido` é o informado pelo operador. Quebra = `valconferido − valdisponivel` (decisão do dono: sem recontado); o ERP conta só conferências com `documento.status = 'E'`. Traz também uma linha da forma "Troca/Devolução", que o Kaizen deixa fora da quebra.
`_iddocumento`, `_idpagamento`, `descricao`, `valdisponivel`, `valconferido`, `observacao`

**`documento_conferencia`** — quem conferiu e quando.
`_iddocumento`, `idusuario`, `datahora`

**Turno, suprimento e sangria** — são linhas de `documento` ligadas por `idcaixaabertura` + `idusuarioabertura` + `idabertura` (na API, `idCaixaAbertura`, `idUsuarioAbertura`, `idAbertura`): `AX` abertura, `SF` suprimento (fundo), `SD` suprimento adicional, `RS` (retirada saque) e `RT` (retirada transferência) para sangria, e `FC` fechamento.

- **O número da abertura conta por caixa e por usuário.** O par caixa + abertura repetiu em vários casos em 25 e 26/09. Por exemplo, a Daniele e o suporte abriram, cada um, a abertura 1 do caixa 3 no mesmo dia (AX 100 e 109). Com o usuário da abertura, as aberturas ficam únicas. A única repetição é o FC 118, que fechou de novo a abertura 3 do Igor no caixa 1, já fechada pelo FC 74, e somou as vendas 116 e 117.
- **`idusuarioabertura` e `idusuario`.** Nos documentos lidos, os dois vieram sempre iguais. Se eles diferem quando um usuário lança no turno de outro, fica para conferir na operação real.
- **`idcaixa` é o caixa onde o documento foi feito**, e não serve para ligar ao turno: as vendas 116 e 117 têm `idcaixa` 10 e `idcaixaabertura` 1.
- **Turno sem abertura.** O turno da Daniele no caixa 1, abertura 1 (SF 83, pedido 87, FC 99), não tem `AX` entre os documentos 51 e 118.
- **Venda feita fora do caixa** (pedido 58) tem `idcaixa`, `idcaixaabertura` e `idabertura` zerados.

O valor está em `documento_pagamento.valor`. `RU` (fundo de caixa) aparece no relatório 1 do ERP como retirada; ele não apareceu nos testes.

**`config_pos`** — configuração de cada caixa.
`numero`, `idcontapadrao`, `flagsomarsuprimento`, `valtrocoinicial`, `tipofechamento`

### Estoque e produtos

**`mercadoria_estoque`** — saldo atual.
`_idempresa`, `_idlocalestoque`, `_idmercadoriavariacao`, `qtdsaldo`, `qtdsaldoreserva`, `datahora`

**`mercadoria_estoque_historico`** — saldo antes e depois de cada movimento. O saldo numa data é a última linha até ela, exceto quando o saldo muda sem linha: em 26/09, os negativos da simulação voltaram a zero sem linha nenhuma, e o único documento no intervalo foi o encerramento do inventário "TESTE". Por isso, o tradutor compara a última linha com `mercadoria_estoque.qtdsaldo` e avisa quando divergem. A primeira entrada do produto é a primeira linha em que o saldo sobe. Gravada pelo gatilho `tr_estoque` da tabela `documento` quando um documento com estoque é emitido ou cancelado, com a data do documento; estoque lançado direto no saldo não gera linha.
`_idhistorico`, `_iddocumento`, `_idlocalestoque`, `idmercadoriavariacao`, `datahora`, `qtdsaldoatual`, `qtdnovosaldo`

**`mercadoria_custo`** — custo atual.
`_idempresa`, `_idmercadoriavariacao`, `valcusto`, `valcustomedio`, `datahora`

**`mercadoria`** — produto.
`_idmercadoria`, `descricao`, `referencia`, `idtipo`, `idsecao`, `idgrupo`, `idsubgrupo`, `dtalteracao`

**`mercadoria_variacao`** — variação; é o código usado em venda e estoque. Na importação, `_idmercadoriavariacao` recebeu o código de tela da Link (`produto_codigo`); `referencia` é a referência do fabricante.
`_idmercadoriavariacao`, `idmercadoria`, `descricao`, `referencia`, `codigobarras`, `idmarca`, `marca`, `dtalteracao`

**`mercadoria_variacao_codigo_adicional`** — outros códigos do produto (734 linhas): `tipocodigo` `R` referência, `C` código de barras.
`_idmercadoriavariacao`, `_idsequencia`, `codigoadicional`, `tipocodigo`

**`mercadoria_variacao_empresa`** — situação da variação na loja.
`_idempresa`, `_idmercadoriavariacao`, `flaginativo`, `qtdestoqueminimo`, `qtdestoquemaximo`

**`mercadoria_variacao_pessoa`** e **`mercadoria_fornecedor`** — fornecedor do produto.
`_idempresa`, `_idmercadoriavariacao`, `_idpessoa`, `flaginativo` · `_idmercadoriavariacao`, `_idpessoa`, `codigoexterno`

**`mercadoria_grupo`**, **`mercadoria_secao`**, **`mercadoria_subgrupo`**, **`mercadoria_marca`** — nomes.
`_idgrupo`/`_idsecao`/`_idsubgrupo`/`_idmarca`, `descricao`, `flaginativo`

**`tabela_alteracao`** — uma linha por linha alterada de cadastro ou saldo, com a versão mais recente.
`_tabela`, `_oid`, `versao`, `datahora`

**`inventario`** — cada inventário (em 26/09: 1 "TESTE", encerrado; 2 "BALANÇO 1", aberto). `status` é `A` aberto ou `E` encerrado. `iddocumento` é o documento `LE` gerado no encerramento (72 no TESTE, que não teve itens; 0 enquanto aberto). Espera-se que esse documento apareça em `mercadoria_estoque_historico._iddocumento` como a primeira entrada de cada produto migrado **(confirmar** no encerramento do "BALANÇO 1").
`_idinventario`, `descricao`, `idlocalestoque`, `status`, `datahora`, `iddocumento`, `tipofinalidade`

**`inventario_mercadoria`** — cada contagem. O mesmo produto pode ter várias linhas (788 linhas para 714 produtos no "BALANÇO 1"), por isso o contado não se soma por aqui.
`_idinventario`, `_idsequencia`, `idmercadoriavariacao`, `idusuario`, `datahora`, `qtdcontada`, `qtdanterior`, `origem`

**`inventario_encerramento`** — uma linha por produto no encerramento.
`_idinventario`, `_idmercadoriavariacao`, `datahora`, `idusuario`, `qtdcontada`, `qtdanterior`, `valcusto`, `valcustomedio`

Na API: `inventario`, `inventario/{id}/mercadorias` e `inventario/{id}/encerramentos`. As regras do encerramento estão em `config_estoque` (seção "Configuração").

### Financeiro

**`documento_parcela`** — parcela a pagar ou a receber (`status` `P` pendente, `B` baixada). Conta a pagar, pela regra do ERP, é o documento com `tipomovimentofinanceiro = 'P'` e `modelo <> 'TR'`. Essa regra também pega a troca (`TM`: o crédito de R$ 77,00 ficou pendente de 25 a 26/09, e a devolução de R$ 18,00 foi baixada na hora, em dinheiro) e a sangria (`RS`: R$ 5,00, baixada na hora). Para o Kaizen, contas a pagar e folga usam `modelo NOT IN ('TR', 'TM')`. O item de `conta-pagar/pendentes` na API não traz o modelo: para tirar o `TM` por ali, é preciso cruzar `idDocumento` com o modelo do documento. `iddocumentoadiantamento` aponta a troca cujo crédito foi usado (pedido 117 → troca 61).
`_iddocumento`, `_idsequencia`, `_idparcela`, `valparcela`, `dtvencimento`, `dtlancamento`, `status`, `idconta`, `iddocumentoagrupado`, `iddocumentoadiantamento`, `descricao`

**`documento_parcela_pagamento`** — baixa da parcela; conta só `status = 'E'`.
`_iddocumento`, `_idsequencia`, `_idparcela`, `_idsequenciapagamento`, `idpagamento`, `dtpagamento`, `valpagamento`, `idconta`, `codigoplanoconta`, `status`, `iddocumentopagamento`

Toda linha de `documento_pagamento` gera uma parcela com o mesmo `_iddocumento` + `_idsequencia`. No pedido 116, as linhas de pagamento 2 (R$ 50,00) e 3 (−R$ 5,00) geraram uma parcela cada. Dinheiro, Pix, débito, crédito enquanto era à vista, `SF`, `SD` e `RS` foram baixados na hora, na conta 1. Em 26/09 foram 21 baixas: 16 de pedidos, 2 de `SF`, 1 de `SD`, 1 de `RS` e 1 de `TM`. Só 2 eram de documento a pagar (`RS` 97 e `TM` 61).

Por isso, as saídas do fluxo realizado são as baixas de documento com `tipomovimentofinanceiro = 'P'` e `modelo <> 'TR'`, sem as feitas com a forma 5 (`idpagamento = 5`, consumo de crédito de troca, como a baixa de R$ 77,00 da troca 61). Pelo mesmo motivo, as entradas não contam o pagamento de venda com a forma 5 (pedido 117, R$ 77,00). Como `conta-receber/pendentes` não traz a forma, a forma de uma parcela a receber sai de `documento_pagamento.idpagamento`, pela mesma ligação. `iddocumentopagamento` veio vazio ou 0 em todas as baixas.

**`plano_conta`** — 46 contas do plano.
`_codigo`, `descricao`, `tipo`, `idplanodre`

**`conta`** — contas internas (hoje: 1 "CAIXA GERAL", 2 "CAIXA VENDAS").
`_idconta`, `descricao`, `tipo`, `idbanco`

**`documento_tef`** — transação de cartão integrada; vazia enquanto não houver integração.
`_iddocumento`, `_idsequencia`, `valortransacao`, `qtddiasrecebimento`, `pertaxa`, `qtdparcelas`

### Clientes e vendedores

**`pessoa`** — na importação, `datacadastro` e `dataclientedesde` vieram com 31/12/1899 em 442 das 445 pessoas; não servem de data.
`_idpessoa`, `nome`, `sobrenome`, `tipo`, `cnpjcpf`, `datacadastro`, `dataclientedesde`, `flaginativo`, `idsituacao`, `idgrupo`, `referencia`, `codigoexterno`

**`pessoa_endereco`**
`_idpessoa`, `_idendereco`, `bairro`, `idibgemunicipio`, `uf`, `cep`, `idregiao`, `flagprincipal`, `flaginativo`, `latitude`, `longitude`, `origemgeolocalizacao`

**`pessoa_funcionario`** — vendedor (`tipo = 'V'`).
`_idempresa`, `_idpessoa`, `idusuario`, `tipo`, `flaginativo`

### Configuração

**`config_entrada_saida`** — `idpagamentotrocamercadoria` (5, "Troca/Devolução") e `idnaturezatrocamercadoria` (900, "TROCA DE MERCADORIA"), configurados em 25/09; `idpessoapadrao` (999007, o Consumidor Final criado em 25/09; a pessoa 2 virou cliente real na importação)

**`config_estoque`** — `flagpermitirestoquenegativo` (hoje `T`), `idnaturezaperda`, `idnaturezainventario`; e as regras do encerramento do inventário: `flagzeraritensnegativosinventario` (`T`), `flagzeraritensinventario` (`F`, não zera os não contados), `flagzeraritenscontadosinventario` (`F`) e `flagsubstituirsaldoitenscontadosinventario` (`F`)

**`feriado`** — `titulo`, `tipoferiado`, `flagfixo`, `data`

## Anexo — filtros de venda de cada relatório do ERP

Extraído automaticamente do SQL de cada relatório (`relatorio.sql`) em 24/09/2026. Entram os relatórios que leem documentos de saída ou que exigem "gera recebimento"; ficam de fora os de cancelamento, caixa e inutilização. Quando um relatório tem mais de uma lista de tipos (em subconsultas), aparecem todas, separadas por " / ". "Soma" diz se o valor vem dos itens (`documento_mercadoria`) ou dos pagamentos (`documento_pagamento`); "—" é relatório que lista linhas sem somar valor.

| Nº | Relatório | Tipos de documento | Status | Gera recebimento | Soma | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | TICKET MEDIO POR PDV | PV, PA, OC, CN, 55, 65 | E | sim | itens | |
| 3 | TICKET MEDIO POR FUNCIONÁRIO | PV, PA, OC, CN, 55, 65 | E | sim | itens | |
| 4 | TICKET MEDIO POR MODELO DE VENDA | escolhido na tela | E | sim | itens | |
| 5 | QUANTIDADE DE PRODUTOS VENDIDOS POR FUNCIONARIO | qualquer | E | sim | itens | só item com vendedor |
| 7 | VALOR DE VENDA POR HORA | PV, PA, OC, CN, 55, 65 | E | sim | itens | |
| 10 | VALORES POR FORMA DE PAGAMENTO ANALÍTICO | ST, SD / RS, TM, RP / PV, OC, CN, PA, 65, 59, 55 / exceto SD, ST / exceto TR / TR / RT / TM | E | sim (N, R) | — | |
| 11 | RELATORIO MOVIMENTO DE PRODUTO POR POR NATUREZA OPERACAO | 55, 65, PV, PA, OR, CN / PV / PA / 55 / 65 / CN / OC / OS | qualquer | não exige | — | |
| 12 | VENDAS POR VENDEDOR E GRUPOS | 65, 55, PV, OC, OS, PA | E | sim | itens | |
| 13 | VENDAS DE MERCADORIAS POR PICO/HORA | 55, 65, PV, OC, PA | E | sim | itens | |
| 15 | REPOSIÇÃO DE MERCADORIA | 55, 65, PV, OC, PA, CN | E | não exige | — | |
| 17 | VENDAS POR PRODUTO COM CATÁLOGO | 55, 65, PV, OC, PA / DF | C, escolhido na tela | não exige | — | |
| 21 | KITS MAIS VENDIDOS POR PERÍODO | PV, PA, OC, CN, 65, 55, 59 | E | não exige | itens | |
| 25 | RELATÓRIO DE VENDAS COM FRETE/ENTREGA | 55, 65, 59, PV, PA, OC | escolhido na tela | sim | total do documento | |
| 27 | VENDAS FILTRADAS POR CFOP | 65 | escolhido na tela | sim | — | |
| 28 | ACRÉSCIMOS EM VENDAS | 55, 65, 59, PV, PA, OC, OS | escolhido na tela | sim | total do documento | |
| 29 | TOTAL DE VENDAS POR FUNCIONARIO E PERIODO E SEÇÃO | qualquer | E | sim | itens | só item com vendedor |
| 31 | RELATÓRIO DE COMPRAS DE PRODUTOS DE ORIGEM E VENDAS DE PRODUTOS DERIVADOS | 55, 1A / 55, 65, 59 | escolhido na tela | não exige | — | |
| 32 | RELATÓRIO DE PRODUTOS COM BAIXO GIRO DE ESTOQUE | 55, 1A / 55, 65, 59 / PV, PA / 55, 65, 59, PV, PA | E | sim (P, R) | — | |
| 57 | CUSTO X VENDA POR GRUPO | 55, 65, PV, OC, PA | E | sim | itens | |
| 59 | DOCUMENTOS EMITIDOS COM FORMA DE PAGAMENTO E CLIENTE | NS, OS, PV, 67, 65, 59, 57, 55, PA | E | sim | pagamentos | |
| 60 | DOCUMENTOS EMITIDOS POR CFOP (NF-e) | 55 | E, C, escolhido na tela | não exige | — | |
| 61 | DOCUMENTOS EMITIDOS POR MODELO E FORMA DE PAGAMENTO | escolhido na tela | escolhido na tela | sim | pagamentos | |
| 62 | DOCUMENTOS FISCAIS EMITIDOS POR NATUREZA OPERACAO | 65, 55, 59 | escolhido na tela | não exige | itens | |
| 63 | DOCUMENTOS FISCAIS EMITIDOS | 65, 55, 59 | escolhido na tela | não exige | itens | |
| 64 | ENTREGAS POR PERÍODO E ENTREGADOR | PV, PA, OC, CN, 55, 65, 59 | qualquer | não exige | itens, pagamentos | |
| 68 | Forma de pagamento por cliente | NS, OS, PV, 67, 65, 59, 57, 55, PA | E | sim | pagamentos | |
| 71 | HISTÓRICO DE MERCADORIAS | qualquer | E | não exige | — | |
| 74 | LUCRATIVIDADE POR USUÁRIO E DATA | 55, 65, PV, PA, OC | E | não exige | pagamentos | |
| 75 | LUCRO BRUTO DAS MERCADORIAS VENDIDAS NO PERIODO E DESCONTO | 55, 65, PV, OC, PA | E | sim | itens | |
| 76 | LUCRO BRUTO DAS MERCADORIAS VENDIDAS NO PERIODO | 55, 65, PV, OC, PA | E | sim | itens | |
| 81 | MERCADORIAS CADASTRADAS E FILTROS | 55, 65, 59 | E | não exige | — | |
| 91 | MERCADORIAS VENDIDAS NO PERIODO - NOVO | 55, 65, PV, OC, OS, PA | E | não exige | itens | |
| 92 | MERCADORIAS VENDIDAS NO PERIODO - NOVO | 55, 65, PV, OC, OS | E | não exige | itens | |
| 93 | MERCADORIAS VENDIDAS NO PERíodo COM VALOR POR CLIENTE | 55, 65, PV, OC, PA | E | não exige | — | |
| 94 | MERCADORIAS VENDIDAS NO PERÍODO DIARIO | 55, 65, PV, OC, PA | E | sim | itens | |
| 95 | MERCADORIAS VENDIDAS NO PERÍODO POR CLIENTE COM FUNCIONARIO | 55, 65, PV, OC | E | não exige | — | |
| 96 | MERCADORIAS VENDIDAS NO PERÍODO POR CLIENTE | 55, 65, PV, OC, PA | E | não exige | — | |
| 97 | MERCADORIAS VENDIDAS NO PERÍODO POR GRUPO E SUBGRUPO | 55, 65, PV, OC, PA | E | não exige | — | |
| 98 | MERCADORIAS VENDIDAS NO PERÍODO | escolhido na tela / 1A / 55 / 65 / 57 / 67 / 58 / 59 / NS / MN / MT / CN / PV / PA / OC / OS / OP / LC / 00 / 10 | E | não exige | — | |
| 99 | MERCADORIAS VENDIDAS POR FUNCIONARIO | qualquer | qualquer | não exige | — | só item com vendedor |
| 100 | MERCADORIAS VENDIDAS POR MARCA | 55, MN, 65, 59, PV, OC, OS, PA | E | não exige | — | |
| 101 | MERCADORIAS VENDIDAS POR PAGAMENTO | PV, 55, 59, 65, PA | E | não exige | — | |
| 104 | NF-E EMITIDAS | 55 | escolhido na tela | não exige | itens | |
| 105 | NFC-E EMITIDAS | 65 | escolhido na tela | não exige | itens | |
| 126 | QUANTIDADE DE ESTOQUE MATRIZ E FILIAL | 55, 65, 59 / 55, 65, 59, PA, PV, OC | E | não exige | — | |
| 127 | QUANTIDADE DE PRODUTOS VENDIDOS COM CUSTO | qualquer | E | não exige | — | |
| 148 | TOP MERCADORIAS MAIS VENDIDAS POR GRUPO, SUBGRUPO E SEÇÃO | escolhido na tela | E | sim | itens | |
| 149 | TOP MERCADORIAS MAIS VENDIDAS POR PERIODO | 55, 65, 59, PV, OC, PA, OS | E | sim | itens | |
| 152 | TOTAL DE VENDAS POR EQUIPE DAS ORDENS DE SERVIÇO FINALIZADAS | qualquer | E | não exige | itens | |
| 153 | TOTAL DE VENDAS POR FUNCIONARIO DAS ORDENS DE SERVIÇO | qualquer | qualquer | não exige | itens | só item com vendedor |
| 154 | TOTAL DE VENDAS POR FUNCIONARIO E PERIODO | qualquer | E | sim | itens | só item com vendedor |
| 158 | VALOR DE PIS/COFINS POR CST - SAÍDAS | 65, 59, 55 | E | não exige | — | |
| 159 | VALOR DE VENDA POR CLIENTE | 55, 65, PV, OC, PA | E | sim | itens | |
| 160 | VALOR DE VENDA POR FORMA DE PAGAMENTO E CAIXA | 55, 65, PV, PA, OC | E | sim | pagamentos | |
| 161 | VALOR DE VENDA POR FORMA DE PAGAMENTO, CAIXA E USUÁRIO | 55, 65, PV, PA, OC | E | sim | pagamentos | |
| 162 | VALOR DE VENDA POR FORMA DE PAGAMENTO | 55, 65, PV, OC | E | sim | pagamentos | exclui pagamento de troca |
| 163 | VALOR TOTAL DE VENDAS POR MODELO | 65, 55, 59, PV, PA | escolhido na tela | sim | itens | |
| 164 | VALORES POR FORMA DE PAGAMENTO | ST, SD / RS, TM, RP / PV, OC, CN, PA, 65, 59, 55 / exceto SD, ST / exceto TR / TR / RT / TM | E | sim (N, R) | — | |
| 165 | VENDA POR FORNECEDOR | PV, 55, 65, PA, OC / 55 | E | não exige | itens | |
| 166 | VENDAS EM DELIVERY | PA, PV, 55, 65, OC | E | sim | pagamentos | |
| 168 | VENDA POR FORNECEDOR | PV, 55, 65, PA, OC / 55 | E | não exige | itens | |
| 169 | VENDAS POR FUNCIONÁRIO | NS, OS, PV, 67, 65, 59, 57, 55, PA | E | sim | pagamentos | |
| 170 | VENDAS POR PRODUTO AGRUPADO POR USUÁRIO | qualquer | E | não exige | — | |
| 171 | VENDAS POR SEÇÃO COM DETALHE DE PRODUTOS | PV, PA, 65, 55, 57, OC, OS / escolhido na tela | E | não exige | itens | |
| 172 | VENDAS POR TABELA DE PREÇO | 65, 55, PV, PA, OC | E | não exige | itens | |
