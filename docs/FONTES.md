# De onde vem cada número — relatório da Fase 1

**Etapa 1 de 2 — 24/09/2026, revisada no mesmo dia com as decisões do dono e com a conferência da importação dos cadastros (feita às 21h33 de 24/09).** Esta etapa mapeou a estrutura: o que cada endpoint promete e todas as tabelas do banco. Ainda não há venda no ERP. Tudo que depende de venda real está marcado **(confirmar)** e será conferido na etapa 2, nos primeiros dias de outubro. A fase só fecha depois dela.

## Resumo

- **As três perguntas têm fonte.** A tabela de indicadores abaixo tem 25 linhas. A meta é cadastrada no Kaizen; 19 saem inteiramente do ERP; 5 precisam também de algo que o ERP não guarda (lista 3): feriados locais, saldo do banco e a regra de crédito do cartão.
- **Os relatórios do próprio ERP discordam sobre o que é venda.** Nos relatórios que somam vendas há pelo menos dez combinações diferentes de tipos de documento, e uns somam os itens, outros os pagamentos. A régua do Kaizen é o relatório 154 (seção "Armadilha").
- **O SQL cobre tudo o que a API cobre, e mais.** A API entrega vendas completas (itens, custo do item, pagamentos, cliente) e a foto do estoque. Turno e conferência de caixa, histórico de estoque, contas pagas filtradas pela data do pagamento, cancelamento de item e fornecedor do produto só existem pelo SQL.
- **Não existe registro de alteração de vendas.** O banco registra cada alteração de cadastro e de saldo de estoque, com número de versão, mas não de documentos. Para pegar venda atrasada do PDV e cancelamento posterior, o tradutor terá de reler uma janela de dias. Custa pouco: cerca de 40 vendas por dia cabem numa página.
- **O limite de requisições não dá erro, dá espera.** São cerca de 20 chamadas por minuto do relógio; a 21ª fica retida até o minuto virar (medido: 22,7 s) e depois é respondida. Página de até 100 registros, na API e no SQL.
- **A importação dos cadastros trouxe uma surpresa e duas escolhas do dono** (seção "Conferência da importação"). A surpresa: o código da Link não está na referência, e sim no próprio código do produto. As escolhas: o estoque entrou zerado, e o dono o lança depois; e entraram 1.022 produtos, contra 1.391 ativos na Link, porque o dono tirou os que a loja não trabalha mais.

## Decisões do dono (24/09/2026)

1. **A régua do "Realizado" é o relatório 154 — "TOTAL DE VENDAS POR FUNCIONARIO E PERIODO".** É por ele que o dono confere. O que ele conta está na seção "Armadilha".
2. **Quebra de caixa = informado − calculado** (`valconferido − valdisponivel`). O recontado não entra: no ERP anterior ele era digitado depois de o operador ver a resposta do sistema, o que contaminava a medição. O Meu ERP Online não tem campo de recontado, e isso não é uma falta.
3. **Feriados municipais e estaduais ficam numa lista do Kaizen.** O ERP só tem os 13 nacionais.
4. **A troca de mercadoria será configurada pelo suporte antes de 01/10, a pedido do dono.** Hoje a forma de pagamento e a natureza da troca estão vazias (`config_entrada_saida.idpagamentotrocamercadoria` e `idnaturezatrocamercadoria`). É o único item com prazo real: sem ela, a devolução não tem por onde entrar e o líquido das vendas nasce errado.

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
| Sem CPF/CNPJ | 25, dos quais 22 clientes (entre eles o Consumidor Final) | — |
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

**O estoque entrou zerado, e o dono o lança depois.** A importação criou um documento de modelo `IM` com os 1.022 produtos e quantidade zero; o histórico tem 1.022 linhas de 0 para 0. Enquanto o estoque não for lançado, cobertura, ruptura, encalhe e giro não têm base, e cada venda de outubro deixará o produto negativo (o ERP permite). A primeira entrada real de cada produto será a carga do estoque, quando vier. Se ela for feita por inventário, todos os produtos terão a mesma data, e a carência do produto novo vem da Link.

**369 produtos a menos que na Link, de propósito.** Entraram 1.022, contra 1.391 ativos na cópia de 12/09: o dono tirou os produtos com que a loja não trabalha mais, e fez o mesmo com parte dos clientes. Consequência para a Fase 3: a venda desses produtos e clientes de abril a setembro existe na Link e não tem par no cadastro novo. Como a régua é bater com o ERP, ela precisa continuar somando no realizado daqueles meses; a Fase 3 decide como ela entra na história.

**As datas de cliente não servem.** 442 das 445 pessoas vieram com cadastro em 31/12/1899 (a data vazia da planilha), e o "cliente desde" repete a mesma data. Recência, "cliente desde" e clientes que pararam de comprar dependem da história da Link (Fase 3).

**Contas a pagar.** Das 94 parcelas pendentes, 12 venceram entre 27/05 e 23/09/2026 (R$ 27.617,38). Vencem de 24/09 a 01/10 outras 6 (R$ 18.648,83), e de 24/09 a 24/10, 38 (R$ 110.216,33). As 12 vencidas foram deixadas em aberto de propósito pelo dono.

## Em aberto para a Fase 2: por onde o tradutor lê

Duas posições, com o argumento de cada uma. A decisão é do brainstorming da Fase 2.

- **Endpoint onde existe, SQL só para o que falta** (inclinação do dono). Os endpoints são interface pública, documentada no swagger. O SQL lê o esquema interno do ERP: não tem contrato e pode mudar sem aviso numa atualização. Nesse caminho, o SQL fica restrito ao que não tem endpoint: caixa (turno e conferência, o principal), contas pagas por data de pagamento, histórico de estoque (estoque médio e primeira entrada), item removido antes de fechar, hora do cancelamento e fornecedor do produto.
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

**Na prática:** se a loja só emitir NFC-e (`65`), quase todas as combinações dão o mesmo número. A divergência aparece se o balcão usar pré-venda, orçamento ou pedido com status emitido: um relatório conta, outro não, e a pré-venda convertida em NFC-e pode contar duas vezes. **(Confirmar** em outubro quais tipos a loja gera.)

**O que o 154 conta**, linha a linha do SQL dele:

- itens (`documento_mercadoria.valtotalliquido`) de documentos com `status = 'E'`, `tipomovimento = 'S'` e `tipomovimentofinanceiro = 'R'`, pela data `DATE(datahora)`;
- não filtra tipo de documento: quem deixa pré-venda, condicional, orçamento e pedido de fora é a exigência de gerar recebimento, porque as naturezas desses quatro não movimentam financeiro **(confirmar** que o documento herda isso);
- só soma item com vendedor (`idpessoafuncionario > 0`): item vendido sem vendedor fica fora do total;
- não desconta nenhum documento de entrada: se a devolução entrar como documento de troca separado, ela não reduz o número do 154 **(confirmar** quando a troca estiver configurada).

## Lista 1 — O que a API entrega (endpoints)

| O quê | Endpoint | Campos que interessam |
| --- | --- | --- |
| Vendas e demais documentos, com itens, custo do item, pagamentos, parcelas, baixas e cópia do cliente, numa resposta só | `documento` (filtros `DataInicio`, `DataFim` sobre `dataHora`; `Modelo`, `Status`, `TipoMovimento`, `IdCaixa`) | `codigo`, `dataHora`, `modelo`, `status`, `tipoMovimento`, `tipoMovimentoFinanceiro`, `idPessoa`, `idCaixa`, `idAbertura`, `modificado`, `valTotal`; em `mercadoriasLista[]`: `idMercadoriaVariacao`, `qtd`, `valTotalLiquido`, `valDesconto`, `idPessoaFuncionario`, `nomePessoaFuncionario`, `qtdDevolucao`, `documentoMercadoriaCustoLista[].valCusto`; em `pagamentosLista[]`: `idPagamento`, `valor`, parcelas e baixas; em `pessoa`: `cnpjCpf`, `bairro`, `municipio`, `idIbgeMunicipio` |
| Itens e pagamentos de um documento | `documento/{id}/mercadorias`, `documento/{id}/pagamentos` | mesmos campos, um documento por chamada |
| Vendido por produto no período (já somado) | `documento/mercadorias-vendidas` | `idMercadoriaVariacao`, `qtd`, `valTotalLiquido` |
| Sangria, retirada e fundo de caixa | `documento` com `Modelo` = `RS`, `RT`, `RU` | `pagamentosLista[].valor` **(confirmar)** |
| Estoque atual (foto) | `local-estoque/1/estoques` (há um único local: 1, "Local de estoque padrão") | `idMercadoriaVariacao`, `qtdSaldo`, `qtdSaldoReserva`, `dataHora` |
| Custo atual | `mercadoria-custo` | `idMercadoriaVariacao`, `valCusto`, `valCustoMedio` |
| Produtos | `mercadoria` | `codigoMercadoriaVariacao`, `descricao`, `referenciaVariacao`, `idGrupo`, `idSecao`, `idSubgrupo`, `idMarca`, `ativo`, `dataAlteracao` |
| Clientes | `pessoa`, `pessoa/cnpjcpf` | `codigo`, `razaoSocial`, `cnpjCpf`, `tipo`, `dataCadastro`, `ativo` |
| Endereço do cliente | `pessoa/{id}/enderecos` | uma chamada por cliente |
| Vendedores | `funcionario` | `codigoPessoa`, `tipo` (V = vendedor), `ativo` |
| Formas de pagamento | `pagamento` | `codigo`, `descricao`, `idTipo`, `aVista`, `tipoIntegracaoCartao` |
| Contas a pagar pendentes | `conta-pagar/pendentes` (filtro `inicio`/`fim` sobre o vencimento) | `idDocumento`, `idParcela`, `nome`, `dtVencimento`, `valOrigem`, `valPago`, `valSaldo`, `status` |
| DRE | `dre` (`DataInicio`, `DataFim`) | linhas no formato da tela do ERP |

A API **não** entrega: turno de caixa, conferência às cegas, baixas filtradas pela data de pagamento, histórico de estoque em lote (só produto por produto, `mercadoria/{id}/local-estoque/{local}/estoque-historico/{data}`), item cancelado antes de fechar, motivo e hora do cancelamento, fornecedor do produto.

## Lista 2 — O que só o SQL entrega

| O quê | Tabelas |
| --- | --- |
| Turno de caixa: abertura, fechamento, suprimento inicial, operador | `caixa_controle` |
| Fechamento às cegas por forma: calculado × informado | `documento_conferencia_caixa` (+ `documento_conferencia`) |
| Contas pagas por data de pagamento (liquidadas) | `documento_parcela` + `documento_parcela_pagamento` |
| Saldo de estoque em qualquer data (estoque médio, giro) | `mercadoria_estoque_historico` |
| Data da primeira entrada do produto (carência do encalhe) | `mercadoria_estoque_historico`: primeira linha do produto em que o saldo sobe (`qtdnovosaldo > qtdsaldoatual`) |
| Item removido antes de fechar a venda | `documento_mercadoria_historico` com `tipoevento = 'CO'` |
| Hora e motivo do cancelamento da venda | `documento_cancelamento_historico` |
| Pré-venda convertida em nota (origem → destino) | `documento_historico` |
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
| Recebível de cartão por data de crédito | As formas de cartão não têm integração com a maquininha (`tipoIntegracaoCartao = N`); a tabela de transações de cartão (`documento_tef`) fica vazia | Regra no Kaizen: venda no cartão + D+1 (`LOJA.md`) |
| Feriados de São Luís e do Maranhão | A tabela `feriado` tem só os 13 nacionais | Lista própria no Kaizen (decidido) |
| Pedido de compra / estoque a chegar | A loja não registra (`LOJA.md`) | Não entra |

## Cada indicador e sua fonte

| Indicador | Lista | Onde |
| --- | --- | --- |
| Meta da loja e do vendedor | — | Cadastrada no Kaizen |
| Realizado do dia e do mês | 1 | Regra do relatório 154: itens de documento emitido, de saída, que gera recebimento, com vendedor; soma de `valtotalliquido` por `DATE(datahora)` |
| Projeção do mês por dia da semana | 1 + 3 | Realizado + feriados locais |
| Ritmo por vendedor | 1 + 3 | Vendedor no item (`idpessoafuncionario`) + dias úteis (feriados locais) |
| Ticket médio, itens por venda | 1 | Venda + itens |
| Vendas por hora e por dia da semana | 1 | `datahora` da venda |
| Curva ABC de clientes, RFV, clientes que pararam | 1 | `idpessoa` da venda; venda para Consumidor Final (pessoa 2) não entra **(confirmar a proporção)** |
| Distribuição por região | 1 ou 2 | Cópia do endereço na venda (API) ou `pessoa_endereco` (SQL) |
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
| Contas a pagar por vencimento | 1 | `conta-pagar/pendentes` |
| Folga em 7 e 30 dias | 1 + 3 | Pendentes + saldo digitado |
| Fluxo de caixa realizado | 1 + 2 | Entradas: pagamentos das vendas; saídas: baixas por `dtpagamento` |
| Fluxo de caixa previsto | 1 + 3 | Pendentes + cartão a receber (regra D+1) |
| Quebra de caixa por turno e forma | 2 | `valconferido − valdisponivel` por forma (decisão: sem recontado); turno em `caixa_controle` |
| Gaveta e sangrias | 1 + 2 | Documentos `RS`, `RT`, `RU` + `caixa_controle.valsuprimentoinicial` |
| Recebíveis de cartão por data de crédito | 3 | Regra D+1 |

Alertas, briefing e interpretação por IA usam os indicadores acima. Tarefas e anotações do vendedor são dados do próprio Kaizen. A geolocalização tem campo no ERP (`pessoa_endereco.latitude`/`longitude`), mas veio vazia na importação: nenhum dos 445 endereços tem coordenada. Ela terá de ser preenchida pelo endereço, como o `OBJETIVO.md` já prevê.

## Respostas às perguntas da fase

**Status de documento.** `C` cancelado, `E` emitido, `I` inutilizado, `O` conferido, `R` rascunho, `V` enviado, `X` excluído, `Z` contingência. Os relatórios de venda do ERP contam só `E`, exceto os que deixam escolher na tela. **(Confirmar** em que status termina uma NFC-e da loja.)

**Tipos de pagamento.** Cinco formas cadastradas, nenhuma integrada:

| Código | Descrição | Tipo | À vista |
| --- | --- | --- | --- |
| 1 | Dinheiro | 1 | S |
| 2 | Pix | 17 (Pagamento Instantâneo Dinâmico) | S |
| 3 | Cartão Crédito | 3 | S |
| 4 | Cartão Débito | 4 | S |
| 5 | Prazo | 5 (Crédito Loja), 1x em 30 dias | N |

A forma "Prazo" existe mesmo sem venda a prazo na loja.

**Como se distingue venda.** Pelo trio `tipomovimento = S` (saída), `tipomovimentofinanceiro = R` (gera recebimento) e `status = E`, e pelo `modelo`: `65` NFC-e, `55` NF-e, `PV` pré-venda, `PA` pedido, `OC` orçamento, `CN` condicional. Outros modelos: `RS`/`RT` retirada, `RU` fundo de caixa, `TM` troca, `LE` inventário, `PE` perda, `TS` transferência, `IM` importação de cadastro, `CP` conta a pagar (as 94 importadas são desse modelo). Qual combinação conta depende do relatório (seção "Armadilha"); a régua é a do 154. **(Confirmar** que modelo o PDV da loja grava e se a pré-venda vira NFC-e, porque aí a mesma venda existe duas vezes.)

**Documento alterado depois de lido.** Não há registro de alteração para documentos (nenhum dos 154 gatilhos de alteração é de documento). O que existe:

- a hora do cancelamento (`documento_cancelamento_historico.datahora`);
- a hora da conversão (`documento_historico.datahora`);
- a hora da remoção de item (`documento_mercadoria_historico.datahora`);
- a marca `flagmodificado`.

Para cadastros e saldo de estoque há `tabela_alteracao`, com versão crescente, que permite ler só o que mudou. **(Confirmar** o atraso real do PDV offline.)

**Limite e páginas.**

- Foram 91 chamadas, todas respondidas, nenhuma recusada.
- O tempo típico de resposta foi de 0,2 s, variando de 0,1 a 1,2 s.
- O limite conta por minuto do relógio: com 19 chamadas no minuto, a seguinte ficou retida 22,7 s e só foi respondida na virada do minuto.
- Nenhum cabeçalho informa o limite.
- A página padrão tem 50 registros e a máxima, 100, tanto nos endpoints quanto no SQL; pedir mais que isso devolve 100.

**Código da Link e CPF/CNPJ.** O código da Link **não** está na referência da variação, como o `LOJA.md` dizia antes da correção de 24/09: ele é o próprio código do produto (`codigoMercadoriaVariacao` na API, `_idmercadoriavariacao` no SQL), conferido em 3 de 3 casos (seção "Conferência da importação"). A referência (`referenciaVariacao` na API, `mercadoria_variacao.referencia` no SQL, cópia em `documento_mercadoria.referencia`) guarda a do fabricante, em 469 dos 1.022 produtos. O CPF/CNPJ fica em `pessoa.cnpjcpf`, só números: 420 das 445 pessoas têm, 330 CPF e 90 CNPJ, sem duplicidade. A busca por CPF/CNPJ aceita com ou sem máscara.

**Fuso.** O banco está em `America/Sao_Paulo`, que tem o mesmo horário de Fortaleza (UTC−3, sem horário de verão). As datas são gravadas sem fuso, na hora local.

## Etapa 2 — o que falta conferir

Depois da importação dos cadastros (feita em 24/09; resultados na seção "Conferência da importação"):

- [x] Quantos produtos, variações e clientes entraram: 1.022 produtos (uma variação cada), 445 pessoas.
- [x] Onde está o código da Link: no código do produto, não na referência; e quantos clientes têm CPF/CNPJ: 420 de 445.
- [x] Como o estoque inicial entrou: não entrou; documento `IM` com quantidade zero em todos.
- [x] Quantos produtos vieram com custo zero: 84.
- [x] Os 369 produtos a menos que na Link: limpeza de propósito do dono, que fez o mesmo com parte dos clientes.

Antes de 01/10:

- [ ] Troca configurada pelo suporte (o dono pede).

Quando o dono lançar o estoque:

- [ ] Por qual documento o estoque entra, porque ele define a primeira entrada de todo produto migrado.

Depois de 01/10, com vendas reais:

- [ ] Quais tipos de documento a loja gera (`65`, `PV`, `OC`, `PA`) e status final da venda do PDV; se a pré-venda duplica.
- [ ] No 154: se pré-venda e orçamento ficam fora por não gerar recebimento; quanto da venda fica sem vendedor; se a troca reduz o total.
- [ ] Como aparecem troca e devolução.
- [ ] Turno em `caixa_controle` e conferência em `documento_conferencia_caixa`.
- [ ] Sangria e fundo de caixa (`RS`, `RT`, `RU`) e devolução paga em dinheiro.
- [ ] Atraso do PDV offline: diferença entre a hora da venda e a hora em que ela aparece.
- [ ] Proporção de vendas para Consumidor Final; itens por venda.
- [ ] Se as listas dentro de `documento` (itens, pagamentos, custo) vêm preenchidas.
- [ ] Se o saldo de estoque gera entrada em `tabela_alteracao` a cada venda.
- [ ] Se a DRE da API bate com a tela do ERP.

## Como foi feito

Um script descartável, fora do repositório, chamou a API com uma trava que só deixa passar leitura: GET, e POST apenas no `consulta/sql` com um único comando SELECT. Foram 91 chamadas (51 endpoints, 40 consultas SQL) e nenhuma escrita, das quais 21 na conferência da importação. O mapa do banco veio de `information_schema` (365 tabelas e 3 visões), dos gatilhos (inclusive o código do que grava o histórico de estoque) e do SQL dos 172 relatórios do próprio ERP.

## Tabelas e colunas (para a Fase 2)

Colunas com `_` na frente formam a chave da tabela. Todas as tabelas têm também `oid`, o identificador da linha usado por `tabela_alteracao._oid`. Só as colunas que interessam aos indicadores estão listadas; o nome é o do banco.

### Vendas

**`documento`** — cabeçalho de todo documento (venda, nota de entrada, sangria, conferência de caixa, conta a pagar).
`_iddocumento`, `idempresa`, `idcaixa`, `idabertura`, `idcaixaabertura`, `idusuario`, `nomeusuario`, `idpessoa`, `datahora`, `datahoramovimento`, `numero`, `serie`, `modelo`, `tipomovimento`, `tipomovimentoestoque`, `tipomovimentofinanceiro`, `idnaturezaoperacao`, `naturezaoperacao`, `status`, `flagmodificado`, `idexterno`, `oid`

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

**`documento_historico`** — conversão entre documentos (ex.: pré-venda em NFC-e).
`_iddocumento`, `_idsequencia`, `evento`, `modeloorigem`, `modelodestino`, `iddocumentoorigem`, `numeroorigem`, `datahora`

**`documento_sincronizacao`** — integração do documento (possível pista do PDV offline).
`_iddocumento`, `_tipointegracao`, `datahora`, `situacao`, `status`

**`natureza_operacao`** — 81 naturezas; define se o documento é venda (`tipocategoria = 'V'`), compra (`C`), devolução (`D`) e se mexe em estoque e financeiro.
`_idnatureza`, `descricao`, `tipomovimento`, `tipocategoria`, `flagmovimentarestoque`, `flagmovimentarfinanceiro`, `flaggerarcomissao`, `cfop`

**`pagamento`** — formas de pagamento.
`_idempresa`, `_idpagamento`, `descricao`, `idtipo`, `flagavista`, `tipointegracaocartao`, `idcontapadrao`

### Caixa

**`caixa_controle`** — turno (abertura → fechamento).
`_idabertura`, `_idempresa`, `_idusuario`, `numeroabertura`, `datahoraabertura`, `datahorafechamento`, `valsuprimentoinicial`, `status`, `idconta`, `idpessoafuncionario`, `iddocumentoaberto`, `tipo`, `origem`

**`documento_conferencia_caixa`** — fechamento às cegas, uma linha por forma. `valdisponivel` é o calculado pelo sistema; `valconferido` é o informado pelo operador. Quebra = `valconferido − valdisponivel` (decisão do dono: sem recontado); o ERP conta só conferências com `documento.status = 'E'`.
`_iddocumento`, `_idpagamento`, `descricao`, `valdisponivel`, `valconferido`, `observacao`

**`documento_conferencia`** — quem conferiu e quando.
`_iddocumento`, `idusuario`, `datahora`

**Sangria e suprimento** — são linhas de `documento` com `modelo` `RS` (retirada saque), `RT` (retirada transferência) ou `RU` (fundo de caixa); o valor está em `documento_pagamento.valor`.

**`config_pos`** — configuração de cada caixa.
`numero`, `idcontapadrao`, `flagsomarsuprimento`, `valtrocoinicial`, `tipofechamento`

### Estoque e produtos

**`mercadoria_estoque`** — saldo atual.
`_idempresa`, `_idlocalestoque`, `_idmercadoriavariacao`, `qtdsaldo`, `qtdsaldoreserva`, `datahora`

**`mercadoria_estoque_historico`** — saldo antes e depois de cada movimento; o saldo numa data é a última linha até ela, e a primeira entrada do produto é a primeira linha em que o saldo sobe. Gravada pelo gatilho `tr_estoque` da tabela `documento` quando um documento com estoque é emitido ou cancelado, com a data do documento; estoque lançado direto no saldo não gera linha.
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

### Financeiro

**`documento_parcela`** — parcela a pagar ou a receber (`status` `P` pendente, `B` baixada). Conta a pagar é o documento com `tipomovimentofinanceiro = 'P'` e `modelo <> 'TR'`.
`_iddocumento`, `_idsequencia`, `_idparcela`, `valparcela`, `dtvencimento`, `dtlancamento`, `status`, `idconta`, `iddocumentoagrupado`, `descricao`

**`documento_parcela_pagamento`** — baixa da parcela; conta só `status = 'E'`.
`_iddocumento`, `_idsequencia`, `_idparcela`, `_idsequenciapagamento`, `dtpagamento`, `valpagamento`, `idconta`, `status`, `iddocumentopagamento`

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

**`config_entrada_saida`** — `idpagamentotrocamercadoria`, `idnaturezatrocamercadoria` (hoje vazios), `idpessoapadrao` (2, Consumidor Final)

**`config_estoque`** — `flagpermitirestoquenegativo` (hoje `T`), `idnaturezaperda`, `idnaturezainventario`

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
