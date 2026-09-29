# Fase 4 — auditoria da fase inteira

**APROVADA.** O "pronto quando" da Fase 4 tem evidência que eu mesmo produzi. As três perguntas têm resposta calculada na VPS:

- **para hoje:** a cada leitura de hora em hora. O log da VPS mostra `respostas=3` nas leituras das 11h às 14h de 29/09. A das 14h é a primeira agendada com a versão final, `14287fa`.
- **para os 182 dias de 01/04 a 29/09:** pela leitura da noite manual das 13h11. Ela terminou sem falha na tabela de execuções da VPS; a contagem de 546 respostas está no registro.

Os testes passam: 424 de 424, a contagem que o plano espera.

Das condições que o dono pôs para a fase, uma não se cumpre ao pé da letra. As leituras de hora em hora terminam `aviso`, e não `ok`, desde as 09h de 29/09: 6 das 8 leituras agendadas da fase, com 0 falhas e 0 puladas. Não impede o fecho, pelo que está na seção 4.

Antes da mescla, falta registrar em `docs/DECISOES.md` quatro decisões que o relatório diz estarem lá e não estão; uma delas contraria uma entrada da Fase 3. Faltam também outras quatro que o dono poderia querer tomar. Nenhum número gravado muda com isso. Durante a auditoria, sete delas apareceram no disco sem commit (ver abaixo da lista).

Feita em 29/09/2026, das 13h50 às 14h15 (Fortaleza), na branch `fase-4`, último commit `c85d233`, ainda não mesclada em `main`.

O que eu fiz:

- rodei `npm run verificar`;
- no banco do PC, só SELECT;
- na VPS, `bash publicacao/implantar.sh log 3`, `log 1` e `rodar execucoes 2026-09-28` (dentro da janela), que só leem.

Não rodei `publicar`, `link`, `noite`, `indicadores` nem `teste-telegram`. Não consultei o ERP, não abri o `.env` e não fiz commit.

## O que falta ou deve ser corrigido

**Antes da mescla (orquestrador; só documentos):**

1. **Registrar em `docs/DECISOES.md` as decisões da spec que o dono poderia querer tomar.** O relatório, na seção "Decisões tomadas sem você", diz "Estão em `docs/DECISOES.md`, seção 'Fase 4'". Dos 9 itens que ele lista, 4 não estão lá. Conferi as 10 entradas de 28/09 e 29/09 da Fase 4:
   - **O corte do financeiro em 26/09** (spec, decisão 16). A entrada da Fase 3 de 28/09 diz: "a Fase 4 usa cada fonte só no seu período (a Link até 25/09, o ERP novo **a partir de 28/09**)". A spec mudou para 26/09 e o código faz 26/09 (`sql/regras/financeiro.sql`, `date '2026-09-25'`). Nenhuma entrada de `DECISOES.md` registra a troca. Quem ler `DECISOES.md` acredita no 28/09.
   - **01/05 e 07/09 gravados como feriado pela migração 012** (spec, decisão 11). O `OBJETIVO.md` diz que o dono digita os feriados. A escolha muda a projeção. Conferi no banco do PC as 8 segundas antes de 28/09: com o 07/09 fora, a média é R$ 5.516,80; com ele dentro, R$ 4.297,71. Cada segunda projetada fica R$ 1.219,09 maior.
   - **O estoque só a partir de 26/09** (decisão 17): antes disso, giro, cobertura, encalhe e ruptura saem vazios.
   - **O documento sem natureza segue o tipo traduzido** (decisão 8).

   Pela mesma regra, também deveriam ter entrada, porque mudam o que o dono lê:
   - **As três naturezas fixas da Link** (pedido, orçamento e nota de entrada; decisão 9). A auditoria da Fase 3 (seção 6) pediu esta entrada: "É pergunta para a spec da Fase 4, com entrada em `DECISOES.md` lá". A spec respondeu, mas `DECISOES.md` não.
   - **A resposta da pergunta 2 em contagem de produtos por classe, e não em reais** (decisão 18).
   - **A parcela cancelada conta como se nunca tivesse existido, também nos dias passados.** O a pagar de 26/09 era 81 parcelas, R$ 217.491,43, no ensaio das 09h. Às 13h12 era 79 parcelas, R$ 212.245,04, depois de o dono excluir 2 no ERP às 09h33. O relatório explica o número, mas não diz que "qualquer dia passado" pode mudar depois de calculado.
   - **A natureza que muda no ERP é avisada no resumo das 22h, e não na hora** (decisão 7).

   Depois, a frase do relatório passa a ser verdadeira. `docs/AUTONOMIA.md`: "Decisão não registrada é decisão que não aconteceu."
2. **Registrar a lição em `docs/LICOES.md`.** É a segunda fase seguida com decisão que está na spec e não em `DECISOES.md`:
   - a memória do auditor registra o mesmo padrão na Fase 3;
   - a entrada que a auditoria da Fase 3 pediu para a Fase 4, a natureza da Link, também não foi feita.

   Pelo `docs/AUTONOMIA.md`, lição repetida vira regra. Uma regra que se pode verificar: o verificador independente, que já refaz os números do relatório, também confere cada item de "Decisões tomadas sem você" contra uma entrada de `DECISOES.md`.
3. **Pôr o título `## Fase 4` em `docs/DECISOES.md`.** As 10 entradas da Fase 4 estão debaixo de `## Fase 3`, porque o arquivo só tem os títulos `## Fase 2` e `## Fase 3`. O `docs/LICOES.md` já tem `## Fase 4`. A `fase-5a` acrescenta `## Fase 5a` no mesmo arquivo, e o título ajuda na mescla dela.

**Depois da mescla (tarefa 13 do plano):**

4. **Reescrever o texto da tarefa 13 antes de despachá-la.** O passo 3 espera "todas as leituras agendadas desde o início da fase com resultado `ok`, inclusive a primeira com a imagem de `main`". A mensagem de commit do passo 5 diz "a leitura seguinte terminou ok". Enquanto a migração 014 não entrar, essa leitura termina `aviso` (seção 4). É o erro da tarefa 3 desta fase, registrado em `docs/LICOES.md`: mensagem de commit que afirma o que não aconteceu. O esperado passa a ser: nenhuma `falha` e nenhuma `pulada`; `aviso` só pelos códigos `forma:9` e `tipo:AE`; `respostas=3`.
5. **Pôr a linha `complete` da tarefa 13 no ledger** depois dela. Hoje as tarefas 1 a 12 têm a linha, e a 13 não pode ter antes da mescla.

**Do dono:**

6. **Aprovar a migração 014** (forma 9 = boleto, tipo `AE` = ajuste de custo). O SQL está em `docs/DECISOES.md`, 29/09. Uma consequência para decidir junto: hoje a forma 9 só aparece em pagamento de nota de entrada (a 439, R$ 2.382,18, e a 442, R$ 21.940,72, ainda rascunho no banco do PC), que não entra no dinheiro que entrou. Se um dia uma **venda** for paga em boleto, a regra do financeiro põe o valor em `entradas.outras` no dia da venda (`sql/regras/financeiro.sql`, CTE `entrada`), e não no dia em que o boleto é pago.
7. As demais pendências do relatório, itens 2 a 5 de "O que é seu": as metas, a conferência no ERP e as duas brechas nas travas.

**Remover:** nada.

**O que apareceu no disco durante a auditoria.** Às 14h07, o `git status` mostrou mudanças sem commit que não são minhas, em quatro arquivos, respondendo a esta lista:

- `docs/DECISOES.md`: o título `## Fase 4` e 8 entradas novas. São 7 das 8 decisões do item 1 (corte do financeiro, feriados, estoque, documento sem natureza, pergunta 2, parcela cancelada, aviso da natureza) e mais uma, a do `sem_vendedor`. **Falta a das três naturezas da Link** (decisão 9).
- O plano, na tarefa 13: o esperado virou "nenhuma `falha` e nenhuma `pulada`", com o `aviso` dos dois códigos. A mensagem de commit não promete mais `ok`. Isso fecha o item 4.
- A spec, na seção 6, agora descreve a versão ganha depois (seção 5 abaixo).
- A memória do implementador foi alinhada à lição: sem hífen nem disfarce (seção 6 abaixo).

Esta auditoria é do commit `c85d233`. Essas mudanças só contam depois de commitadas. Com elas no commit, e com a entrada da Link e a lição em `docs/LICOES.md` (item 2), a lista "antes da mescla" fica fechada.

## 1. Testes

- **O comando:** `npm run verificar`, rodado por mim às 13h50.
  - `tsc -p .` terminou sem erro.
  - Resultado: "rodou 424 testes, esperados 424". Passaram 424; falharam 0; 0 pulados, 0 por fazer, 0 cancelados.
  - Os testes duraram 360,9 s (6 min).
  - O comando saiu com 0.
- **A contagem do plano:** a tabela "Contagem de testes" chega a 422 (329 + 12 + 2 + 12 + 3 + 9 + 13 + 11 + 16 + 12 + 3). Com os 2 da correção final registrados no ledger, dá 424. É o que `testes-esperados.txt` diz; em `main` ele diz 329.
- **Os 95 testes novos, pelas declarações `test(` de cada arquivo**, contra `main`:
  - `regras-financeiro` +17, `regras-vendas` +14, `natureza` +11, `regras-compras` +11, `papel` +9, `implantar` +8, `indicadores` +8;
  - `comandos-vps` +4, `execucao-indicadores` +4, `link-natureza` +4;
  - `telegram` +2, `avisos` +1, `consulta-estoque-cadastros` +1, `execucao` +1.

  A soma dá 95 = 424 − 329, e bate com a composição do relatório (12 + 2 + 12 + 3 + 9 + 13 + 11 + 16 + 12 + 3 + 2).
- **Valor de referência concreto:** os 95 têm.
  - Nos 10 arquivos novos, as comparações são `deepEqual`/`equal` com valor fixo. Foram 236 dessas, contra 14 `ok`/`match`/`notEqual` e 2 `rejects` com a mensagem de erro esperada. As 14 são complementos: prefixo exato de linha impressa ("R$ 150,00 (1 vendas)"), ausência de CR no script, lista de `docker` permitidos.
  - Nenhum `.skip` ou `.only`; o contador da suíte confirma 0 pulados.
  - Os casos que a spec (seção 12) manda cobrir estão todos, cada um com o número dela. Exemplos: ritmo 0,7692; o `origem_id` 10000 contra 9999; o 1708 em encalhe e o 5336 novo; a troca de R$ 18,00; as notas da Link com item `N`; e a mensagem de falha do cálculo, com o texto exato, seguida de "voltou a funcionar às 15h".

## 2. O "pronto quando": as três perguntas calculadas na VPS, para hoje e para qualquer dia desde abril

| O quê | Evidência que eu produzi | Situação |
| --- | --- | --- |
| Hoje, na VPS | `log 3`, às 13h51: as leituras das 11h, 12h e 13h de 29/09 terminaram com `respostas=3` (imagem `a6f9260`, que já calcula). `log 1`, às 14h00: a leitura das 14h, **a primeira agendada com a imagem final `14287fa`**, terminou `hora aviso: documentos_lidos=269, … avisos=2, respostas=3`. | conferido |
| Qualquer dia passado, na VPS | `rodar execucoes 2026-09-28`: a execução 12, a noite manual das 13h11 com a imagem `14287fa`, terminou `aviso`, e não `falha`. Pelo código (`tradutor/execucao.mts`), a noite calcula de 01/04 até hoje, e um erro no cálculo vira `falha` com o motivo `indicadores`; a noite só termina `ok` ou `aviso` com os 182 dias gravados. O teste "a noite calcula todos os dias da história" prova esse caminho (01/04 a 03/04, 9 respostas). O número 546 da VPS (`respostas=546`) está no registro `FASE-4-vps.md`; eu não o vejo por leitura, porque o `log` do serviço não mostra comandos rodados com `exec`. | conferido pelo resultado; a contagem, pelo registro |
| O mesmo cálculo no PC | `kaizen.resposta`: 546 linhas, 182 dias distintos de 01/04 a 29/09, nenhum dia com menos de 3 respostas. | conferido |
| A versão que está na VPS é a que vai para `main` | `git diff --stat 14287fa c85d233`: só 3 arquivos de `docs/`. `main` é o ponto de partida da `fase-4` (`5070970`), então a mescla é avanço direto. | conferido |

## 3. As condições do dono para a fase

| Condição | Evidência | Situação |
| --- | --- | --- |
| `implantar.sh` como primeira tarefa | O primeiro commit de código da fase é `01890c7` (29/09 00h33), o do script, depois só de spec e plano. O script não mudou depois (`git log -- publicacao/implantar.sh`: só `01890c7`). | conferido |
| A regra única no `allow` | `c4045c6` (00h50, depois do APROVADO do revisor no ledger) acrescenta ao `.claude/settings.json` só as duas formas que o `AUTONOMIA.md` permite, `Bash(bash publicacao/implantar.sh*)` e a do PowerShell pelo Git Bash. Nada mais mudou no `settings.json` nem em `.claude/hooks/`. | conferido |
| A descrição dos produtos corrigida, com teste de valor concreto | Teste "a descrição do produto 60 é a da mercadoria 730": espera `BROCA CHATA P/ MADEIRA 1" X 6" WORKER`. No banco do PC: 1.029 produtos do ERP novo, 0 sem descrição; o 60 e o 1436 (`COLA DE CONTATO 14 KG KISAFIX`) com a da spec. Na VPS não há leitura do cadastro pelo script; as leituras de hora em hora regravam os produtos com o código novo desde a imagem `c4045c6`. | conferido no PC |
| A Link na VPS: 6.183 documentos, 5.271 vendas válidas, R$ 737.124,85, zero diferença por dia | No PC, por SELECT: 6.183 documentos da Link = 5.305 pedidos (2.069 `A/true` + 3.236 `T/true`) + 4 orçamentos + 158 fechamentos + 420 sangrias (17 + 403) + 157 suprimentos + 88 contas + 51 notas; 5.271 documentos de papel `venda`; vendido R$ 737.124,85 em 141 dias. Por mês: 58.825,56; 132.684,79; 140.882,93; 145.743,81; 140.782,78; 118.204,98. Na VPS, só o registro: `link ok … dias_comparados: 141`, às 13h11. Eu não posso reproduzir lá sem gravar (`rodar link` grava). | conferido no PC; na VPS, pelo registro |
| O aviso ao dono pelo Telegram quando a rotina falha | Teste `execucao-indicadores`: a leitura das 14h com o cálculo falhando fica `falha`, `telegram_ok = true`. A mensagem é exatamente a da spec, "…Os dados do Kaizen continuam os das 13h…", e às 15h chega "Kaizen: voltou a funcionar às 15h.". Outro teste prova que a queda real do Postgres (57P01) no cálculo continua avisada como banco fora. Na VPS, a execução 12 mostra `telegram sim`: o resumo foi aceito pelo Telegram. | conferido |
| As leituras de hora em hora da Fase 2 continuando `ok` durante a fase | `rodar execucoes 2026-09-28`, às 14h10: desde o início da fase (28/09, 19h28) são 8 leituras agendadas. 2 terminaram `ok` (22h de 28/09 e 08h de 29/09) e 6 `aviso` (09h a 14h de 29/09). Nenhuma `falha`, nenhuma `pulada`. | **não se cumpre ao pé da letra**; ver seção 4 |

## 4. Os dois pontos que o orquestrador pediu para eu julgar

### 4.1 As leituras em `aviso` desde as 09h, e a migração 014 com o dono

**Não impede o fecho.**

O que vi:

- Na VPS, `rodar execucoes 2026-09-28` às 14h10, as execuções desde o início da fase:

  | Execução | Início | Tipo | Resultado | Avisos | Imagem |
  | --- | --- | --- | --- | --- | --- |
  | 5 | 28/09 22h00 | noite agendada | ok | 0 | `ecf9280` |
  | 6 | 29/09 08h00 | hora agendada | ok | 0 | `c4045c6` |
  | 7 e 8 | 29/09 09h00 e 10h00 | hora agendada | aviso | 1 | `c4045c6` às 09h; `a6f9260` às 10h |
  | 9 a 11 | 29/09 11h00 a 13h00 | hora agendada | aviso | 2 | `a6f9260` |
  | 12 | 29/09 13h11 | noite manual | aviso | 2 | `14287fa` (telegram sim) |
  | 13 | 29/09 14h00 | hora agendada | aviso | 2 | `14287fa` |

  Contagem desde 28/09 (inclui as 4 de antes da fase): ok 3, aviso 10, falha 0, pulada 0, sem resultado 0, total 13.

  A tabela da VPS não mostra a imagem. A coluna "Imagem" vem das horas de publicação no `FASE-4-vps.md` (01h10, 09h32 e 13h10) e, para as leituras das 11h às 14h, do log, que eu li: o contêiner das 11h, 12h e 13h é um, e o das 14h é o que subiu às 13h10 com `14287fa`.
- No log da VPS, as leituras das 11h às 14h terminam com `avisos=2, respostas=3`.
- No banco do PC, a leitura das 10h24 (execução 8) tem exatamente dois avisos: `codigo:forma:9` ("apareceu 2 vez(es)") e `codigo:tipo:AE` ("apareceu 2 vez(es)").

Por que não impede:

1. **O aviso não vem do código da Fase 4.** Quem o gera é a conferência de códigos sem tradução da Fase 2 (`tradutor/conferencias.mts`). A fase só acrescentou a ela o campo `natureza`, e o aviso não é de natureza. A leitura das 09h já terminou `aviso` com a imagem `c4045c6`, que não tinha o cálculo. Com o código de `main`, a leitura daria o mesmo aviso: `main:tradutor/conferencias.mts` já confere o tipo (linha 14) e a forma (linha 24).
2. **É o comportamento certo.** O ERP passou a usar dois códigos que o Kaizen não conhece, e a leitura avisa em vez de dizer `ok`. Uma leitura `ok` com código desconhecido seria o defeito. O objetivo da condição, escrito no plano ("o cálculo não muda nada da leitura"), está cumprido: nenhuma leitura falhou nem foi pulada desde o início da fase.
3. **Os dois códigos não mudam nenhum número da Fase 4.** Conferido no banco do PC:
   - a forma 9 só aparece em dois pagamentos de nota de entrada (a 439, emitida, papel `compra`; a 442, ainda rascunho). Pagamento de compra não entra nas entradas (`sql/regras/financeiro.sql`: só papel `venda`), e a parcela da 439 entra no a pagar pelo documento, qualquer que seja a forma;
   - os dois `AE` (450 e 451) ficam sem papel, com 2 itens sem quantidade e sem valor; nenhuma regra os lê.
4. **Traduzir o código é decidir o que ele é.** A entrada da Fase 3 (28/09) dá isso a quem confere a operação real, por migração. O sistema de permissões recusou ao implementador escrever a 014. Contornar a recusa seria pior do que a pendência. Quem destrava é o dono, e isso está no topo do relatório, com o SQL pronto.

O que isso exige do texto: a condição do dono, se ele a quis literal, fica aberta até a 014 entrar. A tarefa 13 não pode prometer `ok` (item 4 da lista acima).

### 4.2 A tarefa 13 depois da mescla

**Não impede o fecho.**

- O código em produção é o que vai para `main`. A VPS roda `kaizen-tradutor:14287fa`. De `14287fa` a `c85d233` só mudaram `docs/LICOES.md`, `docs/fases/FASE-4-relatorio.md` e `docs/fases/FASE-4-vps.md`. O `Dockerfile` copia só `tradutor/`, `sql/` e o `crontab`, então a imagem de `main` terá o mesmo conteúdo. `main` não tem commit fora da `fase-4` (`git log fase-4..main` vazio), e a mescla é avanço direto.
- O que a tarefa 13 muda: o `/opt/kaizen` sai do ramo `fase-4` e volta para `main`, e o `git pull` do roteiro do dono (passo 9 do `publicacao/README.md`) volta a puxar `main`. Até lá, o dono não deve usar o passo 9.
- O item (1) do `/goal` ("todas as tarefas do plano têm linha `complete`") não pode valer para a 13 antes da mescla. É um limite do texto do `/goal`, não uma falta da fase.

## 5. Código a mais

Conferi os 63 arquivos da branch contra o mapa de arquivos do plano. Todo arquivo de código está no mapa.

Três coisas vão além do texto original da spec, todas pequenas:

- **`sem_vendedor` nas respostas de vendas** (correção final, item 1). A spec foi atualizada (seção 8.2) e o `docs/LOJA.md` já pedia o item sem vendedor como exceção. Hoje vale zero nas duas fontes: 0 itens sem vendedor em venda ou troca no banco do PC. O implementador decidiu que o valor é a soma crua de `valor_liquido`, sem sinal (relatório da correção final). Em `c85d233`, a decisão não está em `DECISOES.md`; a mudança sem commit a acrescenta.
- **O documento que nasceu com natureza sem versão ganha a versão depois** (correção final, item 2). Em `c85d233`, a seção 6 da spec ainda diz só "fica com `natureza_id` vazio"; a mudança sem commit acrescenta a frase.
- **A "quebra do dia" da linha impressa pelo comando `indicadores`** é somada em `tradutor/indicadores.mts` (`SQL_LINHAS`), e não está em `kaizen.resposta`: a resposta tem a quebra de cada fechamento, não a do dia. O `percentual_meta × 100` também é feito ali. É só para imprimir, em SQL, sem passar número pelo JavaScript. Mas é um número mostrado ao dono que não vem da regra.

Nenhum dos três precisa sair. O segundo precisa de uma frase na spec, se o orquestrador quiser a spec fiel.

## 6. Regra quebrada

Nenhuma encontrada.

- **Escrita no ERP:** nenhuma. `tradutor/erp.mts` e `ferramentas/` não mudaram; a leitura nova (`sql/erp/naturezas.sql`) é um SELECT pelo mesmo caminho.
- **Esquema `erp`:** nenhuma migração nem regra o cita (busca por `erp.` em `sql/migracoes/010` a `013` e `sql/regras/`: nada).
- **Regra no tradutor:** a natureza da Link vem da tabela de tradução (`natureza_pelo_modelo`, migração 011), que é dado. As regras decidem pelo papel (visão `kaizen.documento_papel`), sem lista de tipos: nenhuma regra cita `modelo` nem código de tipo do ERP.
- **Cálculo fora da rotina:** o JSON sai do Postgres para `kaizen.resposta` por `insert … select`. A exceção menor é a da linha impressa (seção 5).
- **Dependência ou serviço novo:** nenhum. `package.json`, `package-lock.json`, `Dockerfile`, `stack.yml`, `crontab`, `docker-compose.yml` e `.claude/hooks/` não mudaram.
- **O script:** só a stack `kaizen`, com os argumentos conferidos no PC. O teste lê o arquivo e recusa as palavras proibidas.
- **Migração editada depois de aplicada** (spec, decisão 19): nenhuma.
  - Cada uma das 010 a 013 tem um commit só.
  - `git diff --name-status --diff-filter=M` de `a6f9260` (a publicação que as aplicou na VPS) e de `7a583c6` (a que aplicou a 010 e a 011 no PC) até `c85d233`, em `sql/migracoes`: vazio.

Um ponto de método, que não é regra quebrada. A memória nova do implementador (`.claude/agent-memory/implementador/project_guarda_bash_ssh_scp_solto.md`) ensina a escrever a palavra do acesso remoto com hífen para o texto passar pelo `guarda-bash`. O `docs/LICOES.md` da fase diz outra coisa: a mensagem de commit não usa a palavra. O certo é alinhar a memória à lição, porque ensinar a passar por baixo de uma trava do dono é o caminho errado, mesmo para prosa. A mudança sem commit das 14h07 faz isso: a memória passa a dizer "não tente passar a palavra pela trava (nada de hífen ou disfarce)". Precisa entrar no commit.

## 7. `docs/DECISOES.md`

- **Nenhuma decisão registrada contraria o `OBJETIVO.md`.**
  - A natureza como fonte do comportamento, o tipo do cadastro para meta e ritmo e o aviso de natureza mudada estão implementados como o `OBJETIVO.md` manda.
  - A spec (decisão 7) manda o aviso da natureza no resumo das 22h, e não na hora; é uma leitura possível de "o dono recebe um aviso", mas não está em `DECISOES.md` (item 1).
- **Contradição por omissão:** o corte do financeiro em 26/09 contra a entrada da Fase 3, que diz 28/09 (item 1 da lista).
- **Deveriam ir ao dono**, e foram:
  - a 014;
  - as duas brechas nas travas (`guarda-bash` pelo caminho completo; `allow` com `*` sobre um arquivo que o agente pode editar);
  - os −R$ 93,50 de 28/09;
  - os R$ 34,00 de Pix de 28/09.
- **Deveriam ir ao dono, e não foram:** as do item 1. As que mais pesam são os feriados de 01/05 e 07/09, porque o `OBJETIVO.md` põe os feriados na mão dele, e a parcela cancelada mudando os dias passados.
- **A tarefa 12 foi feita pelo orquestrador**, e não por um implementador, depois de o implementador morrer no limite de uso. Está no ledger e no relatório, e teve revisor independente. Não está em `DECISOES.md`; é de método, não de produto, e não precisa ir ao dono.

## 8. Organização

Quem não leu código entende a fase por `docs/fases/FASE-4-relatorio.md`. O relatório diz:

- o que cada pergunta responde;
- os números de um dia de cada mês, com as partes que os compõem;
- as leituras em `aviso` e por quê;
- o que é do dono, com os comandos prontos.

Conferi no banco do PC as composições que ele escreve:

- 6.183 documentos (acima);
- o vendido de 28/09, R$ 8.366,43, em 50 vendas;
- as contas a pagar do ERP novo: 79 pendentes, R$ 212.245,04, e 109 canceladas, R$ 279.484,48;
- os −R$ 93,50 (30,50 + 28,00 + 35,00);
- a diferença da virada: R$ 33.619,72 = 245.864,76 − 212.245,04 = 28.373,33 + 5.246,39, em 15 = 94 − 79 parcelas;
- 606 = 121 + 170 + 315 e 281 = 95 + 72 + 74 + 40.

Todas batem. Refiz também, por uma consulta minha, sem a regra, a projeção de 25/09. São o realizado de 01 a 24/09 mais a média das 8 últimas do mesmo dia da semana para cada um dos 4 dias úteis de 25 a 30/09 (26/09 é feriado). Deu R$ 135.088,52, o mesmo da resposta. Refiz do mesmo jeito a ruptura de 26/09: produtos com item vendido nos 90 dias até 26/09 e estoque no fim do dia zero ou menos, com o estoque pelo movimento de maior `origem_id` como número e, sem movimento, pela virada. Deu 146, o mesmo da resposta. E o encalhe de 26/09 também. São os produtos com estoque acima de zero e sem item vendido nos 90 dias, tirados os novos: primeira entrada de compra há menos de 60 dias e sem venda antes dela. Deu 243, o mesmo da resposta; 13 produtos parados ficaram fora por serem novos. O a pagar da Link em 25/09 também. São as parcelas das contas e notas lançadas até o dia, menos as baixas válidas até o dia, com saldo maior que zero. Deu 94 parcelas, R$ 245.864,76.

Os registros `FASE-4-vps.md` e `FASE-4-ensaio-pc.md` trazem cada comando com a saída. As correções que sofreram estão marcadas no próprio texto.

Tem uma lacuna, sem efeito no resultado. A publicação da `a6f9260` às 09h32 não tem a saída registrada, porque o implementador parou no limite de uso. Foi ela que aplicou as migrações 010 a 013 na VPS, e depois dela veio a primeira carga da Link lá. O registro só diz que isso aconteceu. A prova de que as migrações estão lá é indireta:

- a leitura das 14h grava `respostas=3`, o que precisa da 013 (eu vi, no log);
- a noite manual das 13h11 terminou sem falha (eu vi, na tabela de execuções);
- a publicação das 13h10 disse `migrar: nenhuma migração pendente` (está no registro).

O que atrapalha a leitura:

- a frase falsa sobre `DECISOES.md` (item 1 da lista);
- a falta do título `## Fase 4` (item 3);
- a spec, na seção 6, que não descreve a versão ganha depois.

As três ficam resolvidas com a mudança sem commit. Do item 1, ainda falta a entrada das naturezas da Link.
