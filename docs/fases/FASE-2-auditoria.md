# Fase 2 — auditoria

**APROVADA — só a etapa de quem implementa** (código, testes, ensaio, roteiro e comando de conferência). **A Fase 2 não está fechada.** O "pronto quando" do `OBJETIVO.md` ("atualizados de hora em hora na VPS") e os itens 1, 2, 3 (a parte da VPS) e 5 da spec (seção 10) não têm nenhuma evidência. Todos dependem do dono. A fase só fecha depois dos seis dias de operação na VPS.

Auditoria feita em 27/09/2026, entre 22h40 e 23h, na branch `fase-2` (último commit `5879f28`). Tudo foi feito só lendo, e sem abrir o `.env`. Não houve chamada ao ERP nem ao Telegram.

## O que falta ou deve ser corrigido

**Antes do commit de fechamento (orquestrador):**

1. **Corrigir a entrada de `docs/DECISOES.md` sobre a implantação.** O texto "a fase fecha nesta sessão" contradiz três fontes:
   - a spec, seção 1: "A fase fecha depois de seis dias seguidos de operação na VPS";
   - a spec, seção 10, itens 1 a 3;
   - o próprio relatório: "A Fase 3 começa depois dos seis dias na VPS, porque uma fase não começa antes de a anterior fechar".

   O texto certo é: "a primeira etapa fecha nesta sessão; a fase fecha com os seis dias na VPS". Pela mesma razão, a mensagem de commit do passo 6 da tarefa 20 ("Fase 2 fechada nesta sessão") não deve dizer "fechada".
2. **Acrescentar ao relatório a tarefa "criar o robô no BotFather e mandar uma mensagem a ele".** É o item 5 da seção 3 da spec, e é do dono. Nem o relatório nem o roteiro `publicacao/README.md` dizem que isso precisa ser feito, nem como. O passo 5 do roteiro já pressupõe "o token do robô do Telegram (o que o BotFather deu)".
3. **Dizer no relatório e no `FONTES.md` que o ensaio completo rodou com o código anterior às correções.**
   - As duas execuções com o ERP de verdade (noite das 20h44min57 às 20h44min59; hora das 20h45min04 às 20h45min29) rodaram antes dos 5 commits da revisão final (das 22h06 às 22h33).
   - Esses commits mudaram 10 arquivos que rodam em produção. Oito estão no caminho da execução: `execucao.mts`, `registro.mts`, `telegram.mts`, `banco.mts`, `erp.mts`, `somente-leitura.mts`, `sql/carga/apagar.sql` e `sql/erp/empresa-local.sql`. Os outros dois são `conferencia-dono.mts` e `sql/kaizen/conferencia-dono.sql`.
   - Depois deles, só as consultas foram rodadas de novo (22h32).
   - Recomendado: repetir `noite --manual` no PC (leva cerca de 2 s e só lê o ERP) e registrar o resultado. Sem isso, a primeira execução completa do código final será o passo 8 do roteiro, na VPS.
4. **Preencher a seção "Fase 2" de `docs/LICOES.md`**, que está vazia. É o passo 5 da tarefa 20; há duas sugestões no fim deste arquivo.

**Do dono (a segunda etapa, sem a qual a fase não fecha):**

- implantar pelo roteiro (passos 0 a 8);
- seis dias seguidos de operação com todas as execuções registradas e zero diferença (itens 1 e 2);
- a mensagem de teste mandada da VPS (item 3);
- importar de novo as contas a pagar (item 5);
- as quatro pendências já registradas em `docs/DECISOES.md`.

**Remover:** nada.

## 1. Testes

- `npm run verificar`, rodado por mim: saída 0 e `tsc -p .` sem erro.
  - "rodou 280 testes, esperados 280": 280 passaram, 0 falharam, 0 pulados, 0 por fazer, em 75,3 s.
  - O contador (`ferramentas/testar.mts`) reprova se houver teste pulado ou se a contagem for diferente de `testes-esperados.txt` (280).
  - Não há `.only`, `.skip` nem `todo` em nenhum arquivo de teste.
- **Comparado com o plano:**
  - O plano esperava 274 testes no fim da tarefa 18.
  - Pelo histórico de `testes-esperados.txt`, o acréscimo de cada tarefa bate com a tabela do plano: 7, 11, 3, 23, 28, 17, 18, 17, 11, 31, 13, 31, 25, 16, 13, 4, 4 e 2 testes.
  - Os 6 a mais vieram de um commit só da revisão final (`f8b6c0e`), e conferi o nome de cada um:
    - conectar desiste em 10 s;
    - a noite que falhou depois de gravar;
    - a volta recusada, na noite;
    - a volta recusada, na hora;
    - a leitura manual;
    - o comando `hora` de ponta a ponta.
- **Valor de referência.**
  - Os 280 testes têm pelo menos uma conferência explícita, com entrada concreta.
  - 277 comparam com um valor fixo, ou com um erro de mensagem certa: textos exatos do Telegram, R$ 50,00 e −R$ 5,00 do troco, 1.029/714/54.660,5 da virada, corte 184, 48 linhas de tradução.
  - 3 conferem uma propriedade:
    - o token não aparece em nenhuma mensagem de erro;
    - o texto de falha cabe em 4.000 caracteres, com o fim exato;
    - nenhum arquivo de `sql/erp` usa sintaxe do Postgres 15 ou 16.
  - Nenhum teste passa sem conferir nada.

## 2. "Pronto quando", item a item

| Item | Evidência que eu produzi | Situação |
| --- | --- | --- |
| `OBJETIVO.md`: vendas, estoque e a pagar desde 28/09, de hora em hora na VPS, com registro e aviso | Nenhuma. Não há nada na VPS. | **não pronto (dono)** |
| Spec 10.1: seis dias na VPS, nenhuma execução faltando | Nenhuma. No Postgres do PC, `kaizen.execucao` tem só 2 linhas, as duas manuais. | **não pronto (dono)** |
| Spec 10.2: zero diferença toda noite, nos seis dias | Na VPS, nenhuma. No PC, a noite de 27/09 deu resultado `ok`, com 0 avisos, logo zero diferença em 1 dia. Mas o ERP só tinha os 44 ajustes de custo, sem venda, pagamento, parcela, baixa nem movimento de estoque. | **não pronto (dono)**; a leitura só foi provada com ajustes de custo |
| Spec 10.3: mensagem de teste mandada da VPS | Nenhuma. | **não pronto (dono)** |
| Spec 10.3: no PC, uma falha provocada gera o texto certo | Testes com o texto exato da spec 7.2: ERP fora ("…continuam os das 13h. Nada a fazer: ele tenta de novo às 15h."), token recusado, coluna sumida, banco fora, trava presa. O envio é falso, injetado no teste; nenhum teste chama o Telegram. | **pronto** |
| Spec 10.4: testes com a contagem conferida | 280 de 280 (seção 1). | **pronto** |
| Spec 10.5: as contas a pagar reimportadas batem com o ERP | O ERP não tinha nenhuma conta a pagar em 27/09. Depende do dono, e pela spec não segura os outros itens. | **não pronto (dono)** |
| Spec 10.6: conferências da seção 9 | `FONTES.md`, "Conferências da operação real (Fase 2)": as 13 estão como abertas, mais a pergunta do código HTTP do limite de 30 s. Nenhuma podia acontecer antes de 28/09. | **pronto** |
| Conferência do dono (spec 10) | Rodei `conferencia 60 2138 1436` contra o Postgres do PC. Saíram as 5 partes, cada uma dizendo onde conferir no ERP: 0 vendas; 0 contas; nenhum fechamento; produtos 60 = 3, 2138 = 48 e 1436 = 6; "nenhuma execução agendada registrada ainda"; "Última comparação da noite (27/09): zero diferença". | **pronto** |

**O ensaio com o ERP de verdade (spec 8), conferido no banco do PC:**

- **As 8 consultas:** os 8 arquivos de `sql/erp/` rodaram (`docs/medicoes/ensaio-consultas-2026-09-27.txt`).
  - A mais lenta, na segunda rodada, levou 948 ms; na primeira, 1.234 ms. O limite é 30.000 ms.
  - Faltam 0 das 108 colunas, e só existem a empresa 1 e o local de estoque 1.
- **Execução da noite, `kaizen.execucao` id 1:** `ok` em 2,24 s, com estas contagens:
  - 44 documentos;
  - 1.029 produtos e 1.029 na foto do estoque;
  - 447 pessoas, 9 funcionários e 653 ligações de fornecedor;
  - 0 movimentos e 0 avisos.
- **Execução da hora, `kaizen.execucao` id 2:** `ok` em 24,9 s, com 0 documentos novos.
- **Os 44 documentos no banco:** todos `AC`, números 94 a 137, `oid` 185 a 228, criados de 27/09 14h20min04 a 14h33min24.

**O esquema no PC:**

- 18 tabelas e 1 visão (`documento_negocio`), criadas pelas 5 migrações registradas.
- A virada tem 1.029 produtos, 714 com estoque e 54.660,5 unidades.
- O corte tem as 8 tabelas, com o documento em 184.

**A imagem:** o histórico do Docker local registra a construção de `publicacao/Dockerfile` no commit `e9a6719` (27/09, 20h38; 13 de 13 passos). `Dockerfile`, `crontab`, `stack.yml`, `package.json` e `package-lock.json` não mudaram depois disso.

## 3. A decisão de deixar a implantação com o dono

**Parte sustentada.** A implantação ficar com o dono está na spec aprovada pelo dono, em três lugares:

- seção 3: "Na implantação, pelo roteiro do plano, na VPS, como `root` […] Quem implementa não tem acesso à VPS";
- seção 7.1: "Feita pelo dono, na VPS, como `root`, comando por comando";
- seção 10: "O roteiro traz um comando que o dono roda na VPS; quem implementa não tem acesso a ela".

**Parte não sustentada.** A frase "a fase fecha nesta sessão" não se sustenta:

- A spec (seções 1 e 10) só fecha a fase depois dos seis dias.
- O item 7 de `docs/AUTONOMIA.md`, citado na entrada, trata de "dado que ainda não existe". Ele não trata da implantação, que é um ato do dono.
- O próprio relatório trata a fase como aberta até os seis dias.

Por isso, a correção 1 da lista acima.

## 4. Código a mais

**Os arquivos.** Comparei os 93 arquivos que a branch muda com os arquivos que o plano manda criar ou mudar:

- Todo arquivo de código, SQL e publicação está no plano.
- Fora da lista "Criar/Modificar" do plano, só aparecem:
  - os `.test.mts`, que o plano cita em cada tarefa;
  - `docs/medicoes/ensaio-consultas-2026-09-27.txt`, que é a evidência do ensaio.

**Os acréscimos à letra da spec.** São pequenos, e ficam:

- no erro 429, no máximo 3 novas tentativas;
- um redirecionamento vira erro, para o token nunca ir para outro endereço;
- palavras e funções recusadas a mais na trava de só leitura: `into`, `share`, `set_config`, `pg_terminate_backend`, `pg_advisory_lock` e outras;
- na conferência do dono, o crédito de troca separado das contas e o modelo `TR` fora da conta, para bater com a tela do ERP. Nenhum dos dois está na tabela de tradução da spec.

**Observação.** A imagem copia `tradutor/` inteira, e com ela vão para a produção os testes, o ERP falso e os dados de exemplo. Não quebra nada.

## 5. Regras

- **Escrita no ERP: nenhuma.**
  - A única saída para o ERP é `criarErp`, com endereço fixo: `POST /api/consulta/sql/v1`, precedido de `verificarSomenteLeitura`.
  - A outra chamada de rede do código é a do Telegram.
  - Não há `PUT`, `PATCH`, `DELETE` nem `GET` em `tradutor/` ou `ferramentas/`.
- **Esquema `erp`: nenhum toque.** A busca por `erp.<tabela>` em `sql/` deu 0 ocorrências. No código, as únicas ocorrências são chamadas ao cliente do ERP (`erp.consultar`), nenhuma ao esquema.
- **Regra de negócio no tradutor.** A carga só faz as transformações da spec 5.1:
  - 0 vira vazio;
  - data de parcela e de baixa vira `date`;
  - nome e sobrenome se juntam;
  - a bandeira de inativo é traduzida.

  As parcelas entram só de documento que paga, como na spec 5.2.

  Há dois lugares que calculam, os dois pedidos pela spec:
  - `sql/carga/apagar.sql` calcula o valor do aviso de documento apagado (spec 6.3, passo 7);
  - `sql/kaizen/conferencia-dono.sql` calcula as vendas "pela regra do relatório 154" e a quebra de caixa (spec 10).

  Com isso, "venda" e "quebra" ficam escritas uma vez aqui e outra vez na Fase 4. A Fase 4 precisa impedir que as duas definições se afastem.
- **Dependência ou serviço fora do `OBJETIVO.md`: nenhum.**
  - Em produção, a única dependência é `pg` 8.23.0; TypeScript e os tipos são só de desenvolvimento.
  - O Telegram e a stack `kaizen` estão no `OBJETIVO.md`.
- **Acesso à VPS.** Isto deveria ir ao dono:
  - `docs/DECISOES.md` registra uma verificação de acesso por SSH, negada pelo classificador. O plano diz "Quem implementa não tem acesso à VPS e não roda nada lá".
  - A trava que a spec aprovada previa (`.claude/settings.json` bloqueando `ssh`, `scp`, `docker service`, `docker stack` e `docker secret`) saiu da spec depois da aprovação, no commit `3cb89fd`, porque o `settings.json` é do dono.
  - Hoje nada mecânico impede `ssh`, `scp` ou `docker secret` neste projeto: o `settings.json` e o `guarda-bash.js` do dono não os cobrem.
  - Cabe ao dono decidir se quer essa trava.

## 6. `docs/DECISOES.md`

São 13 entradas da Fase 2: 9 já commitadas e 4 pendências do dono, que ainda estão fora de commit.

- **Contrariam a spec:** só o trecho "a fase fecha nesta sessão" (seção 3 acima).
- **Deveriam ir ao dono:**
  - a retirada da trava de `ssh`, `scp` e `docker` da spec aprovada (seção 5 acima);
  - as mudanças feitas na spec depois da aprovação, no commit `3cb89fd`: seção "Alternativas consideradas", pastas em 6.1, proteção da noite em 6.4 e 6.5, e a troca da trava em 7.3. Todas estão registradas, mas mudam um texto que o dono aprovou.
- **Os 44 ajustes de custo:** já estavam decididos pelo dono (spec, seção 3, item 9; `FONTES.md`, decisão 13). Não é decisão autônoma.
- **As Fases 7 a 12 fora do esquema agora:** a entrada se sustenta para o ERP novo.
  - O custo do item no momento da venda, que a margem vai pedir, existe no ERP em `documento_mercadoria_custo` (`FONTES.md`). A releitura da noite o preenche no passado quando entrar.
  - Nota para a Fase 7: os leads vêm de `/api/lead/v1`, um GET. A trava desta fase só deixa sair `consulta/sql`. Abrir essa porta é decisão do dono na spec da Fase 7.

## 7. Organização

**O que se entende sem ler código.** Por `docs/`, entende-se o que a fase entregou:

- o relatório;
- as seções "Ensaio da Fase 2" e "Conferências da operação real" do `FONTES.md`;
- a spec;
- `DECISOES.md`;
- o roteiro.

**O que não se confere pelo repositório:**

- As 227 caixas do plano estão todas desmarcadas, e não há ledger no repositório.
- Por isso, "19 tarefas aprovadas de primeira" e "5 problemas importantes e 16 menores" na revisão final não se conferem. Conferi só que cada uma das 19 tarefas tem commit e que existem os 5 commits "Revisão final".

**Pontos menores do relatório:**

- ele cita só os 948 ms da segunda rodada; a primeira teve 1.234 ms;
- ele diz "é mesclado em `main`" antes de a mesclagem acontecer;
- a spec (6.3, passo 4) fala em 107 pares de colunas, e o código e o plano usam 108. O ensaio mostra que as 108 existem no ERP.

## Lições sugeridas para `docs/LICOES.md`

- 27/09/2026 · Fase 2 · A revisão de cada tarefa aprovou as 19 de primeira; a revisão da branch inteira achou 5 problemas importantes, segundo o relatório · 5 commits "Revisão final", de `3f006f4` a `5879f28` · Revisar a branch inteira também no meio da fase, depois das tarefas que se ligam (execução da hora e da noite), e não só no fim.
- 27/09/2026 · Fase 2 · O ensaio com o ERP de verdade rodou antes das correções da revisão final, que mudaram 10 arquivos que rodam em produção, 8 deles no caminho da execução · `kaizen.execucao` do PC (20h44 e 20h45) contra os commits das 22h06 às 22h33 · O ensaio é o último passo antes do fechamento: mudou código depois dele, a execução da noite no PC roda de novo e o resultado é registrado.

## Nota do orquestrador, depois desta auditoria (27/09, 23h)

O veredito acima é do auditor e não foi mudado. Os quatro pedidos de correção antes do commit de fechamento foram atendidos:

1. **`docs/DECISOES.md`:** diz agora que "a primeira etapa fecha nesta sessão; a fase só fecha com os seis dias de operação na VPS". O commit de fechamento não diz "Fase 2 fechada".
2. **Relatório:** traz a tarefa do dono de criar o robô no BotFather e mandar uma mensagem a ele (item 3 de "O que falta, e é seu").
3. **Leitura da noite repetida com o código final** (commit 5879f28), às 23h01 no PC: ok, 44 documentos, 1.029 produtos, 447 pessoas, 9 funcionários, 653 ligações de fornecedor, em 2,7 s, sem aviso, com zero diferença. Está registrada no `FONTES.md` e no relatório.
4. **`docs/LICOES.md`:** ganhou as duas lições sugeridas e uma terceira, sobre os agentes criados no meio da sessão.

O que a auditoria mandou ao dono está no relatório, na seção "Mudanças na spec depois da sua aprovação", e em `docs/DECISOES.md`: as travas de `ssh`, `scp` e `docker`, as quatro mudanças na spec e a verificação de SSH negada. A nota sobre os leads da Fase 7 também está no relatório.
