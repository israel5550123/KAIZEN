# Fase 3 — auditoria da construção

**APROVADA, só a construção.** Os três itens combinados para esta sessão têm evidência que eu mesmo produzi: spec e plano existem, as tarefas 1 a 9 estão com `complete` no ledger e a 10 está no passo 6 (esta auditoria); os testes passam, 324 de 324, a contagem do plano; a história da cópia antiga da Link está no `kaizen` do PC, ligada ao cadastro do ERP novo, sem duplicar. **A Fase 3 não está fechada:** o "pronto quando" do `OBJETIVO.md` é contra a cópia final, que é a tarefa 11 (29/09) e fica aberta de propósito.

Auditoria de 28/09/2026, das 11h50 às 12h25 (Fortaleza), na branch `fase-3`, último commit `9835e50`. Rodei os testes e fiz só SELECT no banco `kaizen`, como o usuário `kaizen`. Não rodei o comando da Link, não escrevi no banco, não abri o `.env` e não toquei no `link_postgres`.

## O que falta ou deve ser corrigido

Nenhum destes pontos impede a mescla. Os dois primeiros devem ser feitos antes de o dono restaurar a cópia final.

1. **Proteger a restauração da cópia final** (relatório, passo 1.5; spec, seção 3; plano, tarefa 10, passo 5). O `pg_restore --clean` roda sem `-n erp`. Na VPS, os esquemas `erp` e `kaizen` estão no mesmo banco `prumo` (spec da Fase 2, linha 100). Se o arquivo da VPS trouxer outro esquema além do `erp`, o `--clean` apaga e troca esse esquema no banco `kaizen` do PC. O passo 1.4 conta só `TABLE DATA erp` e não percebe esquema a mais. O roteiro da Fase 2 manda tirar o arquivo com `-n erp`, então o risco é baixo. Mesmo assim, acrescentar `-n erp` ao comando do passo 1.5 custa uma palavra.
2. **Corrigir no relatório a frase sobre as 7 decisões.** O relatório diz: "o Consumidor Final e 6 clientes sem CPF/CNPJ, ligados pelo código e pelo nome". Conferido no banco, as 7 são:
   - o Consumidor Final (`10000502` → `999007`, 831 documentos);
   - o `10000199` → `484`, renumerado na migração e ligado pelo nome, não pelo código;
   - 5 clientes com o mesmo código nos dois cadastros: 21, 214, 279, 290 e 409.
3. **Três lacunas em `docs/DECISOES.md`.** Estão na spec, mas não no arquivo que o dono lê para decidir:
   - **As contas a pagar abertas estão nas duas fontes.** As 94 parcelas pendentes da Link (R$ 245.864,76) são as mesmas que a migração levou ao ERP novo. Somadas sem o corte por período, a folga da Fase 4 conta essa dívida duas vezes (spec, seções 13 e 14).
   - **O vendedor liga pelo primeiro nome.** O `OBJETIVO.md` diz "pelo nome". Com o primeiro nome, 3 vendedores ligam e 3 falham.
   - **A regra de conta a pagar só foi medida na cópia antiga.** Na cópia antiga, toda parcela de conta é `2.x` positiva. A conferência dessa regra na cópia final ficou para a tarefa 11, em vez de um filtro no SQL. É um ruling do ledger que não foi registrado.
4. **A forma do orçamento difere entre as duas fontes.** A diferença está registrada em `DECISOES.md` e deixada para a Fase 4. A spec (7.2) diz: "No ERP novo, o sentido do item é o movimento do documento: S no pedido, N no orçamento". O primeiro dia real desmentiu isso:

   | Fonte | Orçamentos | Movimento | Itens |
   | --- | --- | --- | --- |
   | ERP novo | 4 | saída | 13, sentido `S` |
   | ERP novo, pré-venda | 2 | saída | 8, sentido `S` |
   | Link | 4 | nenhum | 9, sentido `N` |

   A "mesma forma" do "pronto quando" é a da venda, e a venda confere (seção 3). A spec não ganhou nota sobre a premissa que caiu.

**Remover:** nada.

## 1. Testes

- `npm run verificar`, rodado por mim: `tsc -p .` sem erro e saída 0.
  - Resultado: "rodou 324 testes, esperados 324". Passaram 324; 0 falharam, 0 foram pulados, 0 ficaram por fazer. Durou 109,2 s.
- A contagem do plano (tabela de tarefas) é 280 + 44 = 324, e `testes-esperados.txt` diz 324. Os 44 testes novos por arquivo:

  | Arquivo | Testes | Tarefa |
  | --- | --- | --- |
  | `link-migracao` | 5 | 4 da tarefa 1 e 1 da tarefa 10 |
  | `link-falsa` | 5 | 2 |
  | `link-ligar` | 7 | 3 |
  | `link-vendas` | 11 | 4 |
  | `link-caixa` | 3 | 5 |
  | `link-contas` | 4 | 6 |
  | `link-comando` | 7 | 7 |
  | `link-copia` | 2 | 8 |

  Cada arquivo bate com o que o plano pede à sua tarefa.
- Nenhum `.skip`, `.only` ou `todo` nos arquivos da Link.
- **Valor de referência concreto:** os 44 testes novos comparam valores exatos.
  - 43 usam números, códigos e mensagens dos casos reais da cópia antiga. Exemplos: a venda 1992 soma 150,00, com os itens 90,365760772 e 59,634246; a devolução da 1095 é 67,764 sem arredondar e 67,77 linha a linha; os empates 109,725 → 109,72 e 90,915 → 90,92; o fechamento 7 tem pix calculado 922,38 e informado 817,38; a conta 1396; a mensagem `código da Link sem tradução: forma Pix (8)`.
  - 1 é estrutural: toda migração que grava na `de_para` tem a cláusula `on conflict ... do update`.
- **Limite:** o valor de cada item é o que o próprio SQL gravou no protótipo, porque a Link não guarda valor por item. O que prova a conta são as somas contra o que a Link gravou: `valor_total_venda` e `valor_total_devolucao` em 6 negociações (1992, 392, 3613, 5061, 2492 e a devolução da 1095), e a comparação por dia em 10 dias.
- Os 280 testes da Fase 2 foram auditados em `FASE-2-auditoria.md`. A branch não muda nenhum arquivo de código da Fase 2: `git diff main...fase-3` só cria arquivos da Link e muda `testes-esperados.txt`.

## 2. "Pronto quando" da construção, item por item

### 2.1 Spec e plano

- A spec `docs/superpowers/specs/2026-09-28-fase3-tradutor-link-design.md` existe e tem a seção "Alternativas consideradas", com 10 alternativas descartadas e o critério do `OBJETIVO.md`.
- O plano `docs/superpowers/plans/2026-09-28-fase3-tradutor-link.md` existe, com 11 tarefas.
- No ledger (`.superpowers/sdd/2026-09-28-fase3-tradutor-link/progress.md`), as tarefas 1 a 9 estão como `complete`.
- A tarefa 10 está nos passos 6 (esta auditoria) e 7 (mescla). Os passos 1 a 5 têm commits:
  - `9835e50`: a mesma forma;
  - `e856fc9`: correção da revisão final, com a rodada repetida às 05h58;
  - `daa4770`: decisões e lições;
  - `8e480d1`: relatório.
- A tarefa 11 está aberta, como combinado.

### 2.2 A história gravada no `kaizen` do PC (cópia antiga)

Todos os números abaixo saíram das minhas consultas; entre parênteses, a Link na mesma cópia.

- **A cópia:** esquema `erp` com 26 tabelas e 5.282 negociações; a última é de 25/09 às 11h51min03. O sha256 do dump em `C:\Projetos\link-copias` é `bd8e4b39…130da`, igual ao registro da rodada.
- **Documentos da Link: 6.155.**

  | Tipo | Documentos | Na Link |
  | --- | --- | --- |
  | Pedido emitido | 5.244 | |
  | Pedido cancelado | 34 | |
  | Orçamento | 4 | 5.282 negociações, com os pedidos |
  | Fechamento de caixa | 158 | 158 |
  | Sangria | 419 | 419 |
  | Suprimento | 157 | 157 |
  | Conta a pagar | 88 | |
  | Nota de entrada | 51 | 51 |

- **Filhos:**

  | O quê | No Kaizen | Na Link |
  | --- | --- | --- |
  | Itens vendidos | 14.636 | 14.636 |
  | Itens devolvidos | 54 | 54 |
  | Itens de nota | 530 | 530 |
  | Pagamentos | 5.980 | |
  | Linhas de conferência | 632 | |
  | Parcelas | 221 | |
  | Baixas | 127 (R$ 380.070,75) | |

  Os 5.980 pagamentos são 5.383 do caixa, 576 de sangria e suprimento, 18 de vale, 2 de dinheiro devolvido (−R$ 161,00) e 1 de bonificação. Das 221 parcelas, 94 estão pendentes (R$ 245.864,76).
- **Pagamentos contra a venda:** somam venda − devolução em 5.243 das 5.244 vendas válidas. A exceção é a 100 (336,79 × 336,78), a esperada pela spec.
- **Ligações** (códigos citados pelos documentos):

  | O quê | Ligados ao cadastro do ERP novo | Falhas |
  | --- | --- | --- |
  | Clientes | 342 | 1 |
  | Fornecedores | 19 | 1 |
  | Produtos | 782 | 6 |
  | Vendedores | 3 | 3 |

  - Todos os códigos ligados existem no cadastro `meuerp`.
  - Nenhum item de venda válida ficou com produto `link:`.
  - 31 vendas válidas não têm cliente (R$ 2.339,00), como a Link as gravou.
- **`de_para` da Link:** 22 decisões e 11 falhas.
  - Falhas de funcionário: 1, 7 e 8.
  - Falhas de pessoa: 1 e 900001.
  - Falhas de produto: 1993, 2396, 2758, 5218, 5239 e 5264.
  - É a lista do relatório e da spec (seção 6).
- **Comparação por dia:** rodei `sql/link/comparar.sql`, que só lê, sobre o que está gravado: 0 linhas com diferença. São 141 dias com venda válida no Kaizen e 141 na Link.
- **Meses:** o vendido de cada mês é igual ao `valor_total_venda` da Link; os totais são 5.244 vendas e 732.836,76. A devolução sem arredondar difere 1 centavo da gravada pela Link em abril (1.322,12 × 1.322,11) e em setembro (663,73 × 663,72), como o relatório explica. Maio (131.543,37) e junho (140.445,77) batem com os números que o Prumo conferiu.

### 2.3 Rodar duas vezes não duplica

- **Os documentos não foram gravados de novo.** Os 6.155 documentos da Link têm um único `visto_em`, 28/09 às 05h34min15, que é a primeira rodada. O cadastro só da Link (6 produtos, 2 pessoas, 3 funcionários) tem `lido_em` de 05h58min25, que é a última rodada. Houve rodadas depois da primeira, e nenhum documento foi apagado e gravado de novo.
- **Nenhuma chave de origem repete:** 0 em documento, 0 em item e 0 em pagamento.
- **Os arquivos das rodadas** (em `C:\Projetos\link-copias`, fora do repositório):
  - `rodada-1` traz `novos=6155`; `rodada-2`, `3` e `4` trazem `novos=0`;
  - o resumo da rodada 1 é igual ao da rodada 4;
  - as fotos 1 e 2 são iguais, a 3 e a 4 são iguais, e a 2 é igual à 5.
- **O comando não grava em `kaizen.execucao`:** não há linha entre 05h31min54 e 09h09.
- **A leitura do ERP novo não mexeu na história da Link:** a das 09h09 não alterou nenhuma linha dela; o `visto_em` e o `lido_em` acima continuam os mesmos.
- **Nos testes:** a idempotência tem 2 testes, um da tarefa 4 e um da tarefa 7, e os dois passam.

### 2.4 A mesma forma: a venda 1992 da Link (17/06) e o pedido 196 do ERP novo (28/09, 09h07)

Rodei `sql/kaizen/ficha-venda.sql` para os documentos 2508 e 24855.

- **O que é igual:**
  - as chaves do documento, de cada item e de cada pagamento;
  - tipo `pedido`, situação `emitido`, movimento `saida`, financeiro `recebe`;
  - os itens de sentido `saida`, com produto e vendedor no código do cadastro novo (vendedor `1` e `999005`);
  - as formas no mesmo vocabulário (`pix`, `dinheiro`).
- **O que difere é o fato:** valores, produtos, datas e cliente.
- A descrição do produto sai vazia nas duas fichas, pelo bug da Fase 2 registrado em `DECISOES.md`.
- O resultado é igual às fichas do registro da rodada.

## 3. Código a mais

Nenhum.

- Cada arquivo criado ou mudado na branch está na lista de arquivos de alguma tarefa do plano:
  - 2 migrações;
  - 14 arquivos em `sql/link/`;
  - `sql/kaizen/ficha-venda.sql`;
  - `tradutor/link.mts`, `link-falsa.mts` e `link-casos.json`;
  - 8 arquivos de teste;
  - os documentos da fase.
- A memória dos agentes (`.claude/agent-memory/`) é prevista em `docs/AUTONOMIA.md`.
- Há duas linhas do resumo impresso que a spec não lista: `vendas_validas_sem_cliente` e `turnos_abertos`. As duas estão no plano, e a tarefa 11 usa `turnos_abertos`.

## 4. Regras

- **Escrita no ERP:** nenhuma. `tradutor/link.mts` só fala com o Postgres. As duas leituras do ERP novo (05h31 e 09h09) são do tradutor da Fase 2, que só lê.
- **Esquema `erp`:**
  - O usuário `kaizen` tem só SELECT, nas 26 tabelas; não pode criar nada no `erp` e não é dono de nenhuma tabela dele.
  - O único toque no `erp` foi a restauração da cópia no banco local, pelo superusuário, com `pg_restore`. É a decisão 1 da spec e está em `DECISOES.md`.
  - A fonte, o `link_postgres`, só recebeu `pg_dump`, segundo o registro. Não conferi, por ordem.
- **Regra de negócio no tradutor:**
  - A única conta é o valor do item: meio-par e rateio da negociação; o devolvido é `qtd × preco_liquido_unitario`. É a exceção declarada e aprovada pelo dono (spec da Fase 2, decisão 4).
  - A "venda válida" do resumo e da comparação serve só para conferir e imprimir; não é gravada.
  - A ligação da venda ao turno, a regra do período de cada fonte e a contagem de venda ficaram para a Fase 4.
- **Dependências e serviços:** o `package.json` não mudou. Nenhum serviço novo, e o Telegram não é chamado.
- **Método:** houve 1 mudança de método (`20d3400`), num commit `método:` separado, que cita a lição que apareceu pela segunda vez. Nenhum arquivo do dono foi mexido (`settings.json`, hooks, agentes, `CLAUDE.md`, `OBJETIVO.md`).

## 5. `docs/DECISOES.md`

- Nenhuma decisão contraria o `OBJETIVO.md` ou a spec.
- A troca de "uma de outubro" por "28/09 em diante" é do `/goal` do dono e está registrada.
- **As mudanças em relação à spec da Fase 2 estão registradas, cada uma com o que muda se estiver errada:**
  - os códigos do cadastro novo nos documentos;
  - o prefixo `link:`;
  - a situação pelo modelo;
  - o que não entrou (as colunas de conta e sinal, a foto do estoque, as planilhas e as bonificações).
- **O que vai ao dono está registrado:**
  - as 11 falhas da `de_para`;
  - o bug da descrição da Fase 2;
  - o orçamento com movimento de saída no ERP novo;
  - o modelo `EM`.
- Faltam as três entradas do item 3 da lista acima.

## 6. Organização

- **Quem não lê código entende a fase por três arquivos:**
  - `docs/fases/FASE-3-relatorio.md`: números, o que é do dono, o passo a passo de 29/09 e o `/goal` da rodada final;
  - `docs/fases/FASE-3-rodada-copia-antiga.md`: as duas rodadas, as fotos e as duas fichas;
  - `docs/DECISOES.md`.
- Os números do relatório batem com as minhas consultas. A exceção é a frase do item 2 da lista acima.

## 7. A tarefa 11 (rodada contra a cópia final)

**Está descrita de modo que outra sessão consegue fazê-la.** Há:

- a pré-condição e a parada se a cópia antiga ainda estiver no lugar;
- as três conferências da restauração (26 tabelas, a última venda depois das 11h51 e o turno 190 fechado), mais a consulta das parcelas fora de `2.x`, que tem de dar 0;
- as duas rodadas com as fotos, apontando para `C:\Projetos\link-copias\foto.sql`, que existe;
- o que deve mudar em relação à cópia antiga (`turnos_abertos` de 3 para 2; hoje os turnos abertos são o 3, o 4 e o 190);
- a branch `fase-3-final` a partir de `main`;
- o `/goal` pronto no relatório.

**Duas ressalvas:**

- a restauração do item 1 da lista acima;
- o texto da tarefa diz que a correção de uma parada é "uma migração ou uma linha na lista de colunas". Uma diferença na comparação por dia exige mudar o SQL da Link, pelo ciclo normal que a própria tarefa cita.
