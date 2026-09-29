# Fase 4 — o que rodou na VPS

**SHA publicado: `c4045c6`** (o mesmo `git rev-parse --short HEAD` do PC). Imagem anterior: `kaizen-tradutor:ecf9280`.

## 1. Primeira publicação

**Nota de correção:** a mensagem do commit `f427564` afirma "a leitura seguinte terminou ok", mas isso não foi conferido nesta tarefa — o passo 5 (esperar a leitura agendada seguinte) foi adiado por decisão do orquestrador, como o texto abaixo já registra. A primeira leitura agendada com a versão `c4045c6` é a das 08h de 29/09/2026, e a conferência dela fica para a tarefa 12.

Prova do `publicacao/implantar.sh` de ponta a ponta, na madrugada de terça, 29/09/2026, com a versão das tarefas 1 e 2 do plano da Fase 4 (os comandos `migrar` e `execucoes`, e a descrição do produto vindo da mercadoria). Todas as horas abaixo são de Fortaleza (`date` sem `TZ` no Git Bash do PC); o log do Docker (passo 1) está em UTC, 3 horas na frente.

### Passo 1 — o estado da VPS antes de publicar (00h57)

Comando: `bash publicacao/implantar.sh log 24`

```
ID             NAME              MODE         REPLICAS   IMAGE                     PORTS
xcvewu57o6t8   kaizen_tradutor   replicated   1/1        kaizen-tradutor:ecf9280

2026-09-28T21:00:05Z hora aviso: documentos_lidos=265, documentos_novos=7, apagados=0, movimentos=169, foto=1029, produtos=1029, pessoas=449, funcionarios=9, fornecedores=654, avisos=7
2026-09-28T22:00:04Z hora aviso: documentos_lidos=264, documentos_novos=2, apagados=0, movimentos=171, foto=1029, produtos=1029, pessoas=449, funcionarios=9, fornecedores=654, avisos=7
2026-09-29T01:00:06Z noite ok: documentos_lidos=282, documentos_novos=0, apagados=0, movimentos=171, foto=1029, produtos=1029, pessoas=449, funcionarios=9, fornecedores=654, avisos=0

2026-09-28T20:22:54Z crond: crond (busybox 1.37.0) started, log level 8
2026-09-28T21:00:00Z crond: USER root pid  49 cmd cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts hora
2026-09-28T22:00:00Z crond: USER root pid  61 cmd cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts hora
2026-09-28T22:21:52Z crond: crond (busybox 1.37.0) started, log level 8
2026-09-29T01:00:00Z crond: USER root pid  25 cmd cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts noite
```

Nenhuma linha repetida (8 linhas de log, todas diferentes). Imagem confirmada: `kaizen-tradutor:ecf9280`, serviço `1/1`. As leituras de hora em hora de 21h e 22h (UTC) — 18h e 19h em Fortaleza — ainda em `aviso`, de antes da migração 009; a noite das 22h de Fortaleza (01h UTC) já em `ok`.

### Passo 2 — a branch no GitHub (00h58)

Comando: `git push origin fase-4`

```
remote:
remote: Create a pull request for 'fase-4' on GitHub by visiting:
remote:      https://github.com/israel5550123/KAIZEN/pull/new/fase-4
remote:
To https://github.com/israel5550123/KAIZEN.git
 * [new branch]      fase-4 -> fase-4
```

Branch `fase-4` criada no GitHub, com o HEAD local (`c4045c6`).

### Passo 3 — publicar (fora da janela às 00h59; rodou às 01h10, dentro da janela)

Às 00h59 o relógio estava fora da janela (hh:10 a hh:50); o comando esperou com `until` e rodou automaticamente na abertura da janela seguinte, 01h10.

Comando: `bash publicacao/implantar.sh publicar fase-4`

```
From kaizen-github:israel5550123/KAIZEN
   ecf9280..5070970  main       -> origin/main
 * [new branch]      fase-4     -> origin/fase-4
Switched to a new branch 'fase-4'
branch 'fase-4' set up to track 'origin/fase-4'.
Already up to date.
c4045c6
publicar: em uso kaizen-tradutor:ecf9280 com o segredo kaizen_env_v1; publicando kaizen-tradutor:c4045c6
#0 building with "default" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 625B 0.0s done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:24.18.0-alpine
#2 DONE 0.8s

#3 [internal] load .dockerignore
#3 transferring context: 2B done
#3 DONE 0.0s

#4 [internal] load build context
#4 transferring context: 88.01kB 0.0s done
#4 DONE 0.0s

#5 [1/8] FROM docker.io/library/node:24.18.0-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd
#5 resolve docker.io/library/node:24.18.0-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd 0.1s done
#5 DONE 0.1s

#6 [2/8] RUN apk add --no-cache tzdata
#6 CACHED

#7 [3/8] WORKDIR /kaizen
#7 CACHED

#8 [4/8] COPY package.json package-lock.json ./
#8 CACHED

#9 [5/8] RUN npm ci --omit=dev
#9 CACHED

#10 [6/8] COPY tradutor/ tradutor/
#10 DONE 0.1s

#11 [7/8] COPY sql/ sql/
#11 DONE 0.1s

#12 [8/8] COPY publicacao/crontab /etc/crontabs/root
#12 DONE 0.0s

#13 exporting to image
#13 exporting layers 0.2s done
#13 exporting manifest sha256:dd2c2780d3b7087eceec32504d75b226f7e4ece46f13b5eed8ac913e998c4ddf 0.0s done
#13 exporting config sha256:76dcb073b65b33503c6738b5a58a8b391f9f18376bbb6bb19a220ec73630e141 0.0s done
#13 exporting attestation manifest sha256:4ab535f537a640b52df0e89306e893aa920cbe5b818085168f37082b851a80c8 0.0s done
#13 exporting manifest list sha256:813997b5f12b67ae29ad7d86faea0d21dadc20638d54722e6db5e4626b95c650 0.0s done
#13 naming to docker.io/library/kaizen-tradutor:c4045c6 done
#13 unpacking to docker.io/library/kaizen-tradutor:c4045c6 0.1s done
#13 DONE 0.4s
Since --detach=false was not specified, tasks will be created in the background.
In a future release, --detach=false will become the default.
Updating service kaizen_tradutor (id: xcvewu57o6t8jw6dni3uxwoi3)
publicar: esperando o serviço em 1/1 com kaizen-tradutor:c4045c6 (até 120 s)
migrar: nenhuma migração pendente
publicar: kaizen-tradutor:c4045c6 no ar (antes: kaizen-tradutor:ecf9280)
ID             NAME              MODE         REPLICAS   IMAGE                     PORTS
xcvewu57o6t8   kaizen_tradutor   replicated   1/1        kaizen-tradutor:c4045c6
```

Sem erro em nenhum passo (`sha256` do `stack.yml` conferido, `build`, `deploy` e espera); `migrar: nenhuma migração pendente`, como esperado (as tarefas 1 e 2 não trazem migração). SHA publicado igual ao `git rev-parse --short HEAD` do PC (`c4045c6`); imagem anterior `kaizen-tradutor:ecf9280`; serviço em `1/1` com a imagem nova.

(Nota: o `git fetch` também trouxe `ecf9280..5070970` da branch `main` no GitHub, sem relação com esta publicação, que é da branch `fase-4`.)

### Passo 4 — a tabela das execuções (01h43, dentro da janela)

Comando: `bash publicacao/implantar.sh rodar execucoes 2026-09-28`

```
id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem
1 | noite | manual | 28/09 17:24 | aviso | 7 | sim | —
2 | hora | agendada | 28/09 18:00 | aviso | 7 | — | —
3 | hora | agendada | 28/09 19:00 | aviso | 7 | — | —
4 | noite | manual | 28/09 19:22 | ok | 0 | sim | —
5 | noite | agendada | 28/09 22:00 | ok | 0 | — | —
contagem desde 28/09/2026: ok 2, aviso 3, falha 0, pulada 0, sem resultado 0 (total 5)
```

A execução 1 (manual, 17h24) e as duas leituras de hora seguintes, ainda de antes da migração 009, em `aviso`; a partir da execução 4 (a migração aplicada), em `ok`. Nenhuma execução `hora` nova depois da publicação: são 01h43, e a próxima leitura agendada é só às 08h.

### Passo 5 — a primeira leitura com a versão nova: fica para a tarefa 12

A publicação terminou de madrugada (01h10), fora do expediente de leituras de hora em hora (das 8h às 19h, de segunda a sábado; às 22h a da noite). Não há leitura agendada entre 23h e 07h, então não faz sentido esperar aqui. **A primeira leitura agendada com a versão nova (`kaizen-tradutor:c4045c6`) será a das 08h de 29/09/2026, e a conferência dela (log e tabela de execuções) fica para a tarefa 12.**

## 2. A fase na VPS

**SHA publicado: `14287fa`** (o `git rev-parse --short HEAD` da branch `fase-4`, com as tarefas 1 a 11, a correção da revisão da branch no meio da fase e a correção da revisão final). Imagem anterior: `kaizen-tradutor:a6f9260`.

Terça, 29/09/2026. Todas as horas em Fortaleza (`date` sem `TZ` no Git Bash do PC). O implementador desta tarefa publicou a `a6f9260` às 09h32 e carregou a Link, e parou no limite de uso da conta sem registrar; o orquestrador fez os passos a seguir pelo `implantar.sh` e escreveu este registro (ledger da fase, 29/09 12h59).

**A primeira leitura agendada com a versão da primeira publicação** (`c4045c6`, a das 08h de 29/09) terminou `ok`: no log, `2026-09-29T11:00:06Z … hora ok: documentos_lidos=224, documentos_novos=4, apagados=0, movimentos=171, foto=1029, produtos=1029, pessoas=449, funcionarios=9, fornecedores=654, avisos=0` (11h UTC = 08h em Fortaleza), e a linha 6 da tabela abaixo.

### Passo 1 — nenhuma migração publicada foi editada (13h00)

Comando: `git diff --name-status --diff-filter=M a6f9260 HEAD -- sql/migracoes` (a `a6f9260` foi a última versão publicada, já com as migrações 010 a 013). Saída: nenhuma linha.

### Passo 2 — as execuções antes de publicar (13h10)

Comando: `bash publicacao/implantar.sh rodar execucoes 2026-09-28`

```
id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem
1 | noite | manual | 28/09 17:24 | aviso | 7 | sim | —
2 | hora | agendada | 28/09 18:00 | aviso | 7 | — | —
3 | hora | agendada | 28/09 19:00 | aviso | 7 | — | —
4 | noite | manual | 28/09 19:22 | ok | 0 | sim | —
5 | noite | agendada | 28/09 22:00 | ok | 0 | — | —
6 | hora | agendada | 29/09 08:00 | ok | 0 | — | —
7 | hora | agendada | 29/09 09:00 | aviso | 1 | — | —
8 | hora | agendada | 29/09 10:00 | aviso | 1 | — | —
9 | hora | agendada | 29/09 11:00 | aviso | 2 | — | —
10 | hora | agendada | 29/09 12:00 | aviso | 2 | — | —
11 | hora | agendada | 29/09 13:00 | aviso | 2 | — | —
contagem desde 28/09/2026: ok 3, aviso 8, falha 0, pulada 0, sem resultado 0 (total 11)
```

A partir das 09h, as leituras terminam `aviso` por dois códigos que o ERP começou a usar em 29/09 e que o Kaizen ainda não traduz (a leitura das 09h ainda rodava a `c4045c6`, antes da publicação da tarefa 12): a **forma 9** ("Boleto", no pagamento das notas de entrada 439, criada às 09h00, R$ 2.382,18, e 442, às 09h35, R$ 21.940,72) e o **tipo `AE`** (documentos 450 e 451, às 10h18 e 10h20, "Custo Salvo pela formação de preços"). O texto dos avisos foi lido na leitura do PC às 10h24 (`kaizen.execucao` do PC: `o código "9" de forma apareceu 2 vez(es) e não tem tradução no Kaizen` e `o código "AE" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen`); o que eles são, conferido no ERP só lendo. A tradução é a migração `014`, pendência do dono (`docs/DECISOES.md`, 29/09). Nenhuma falha, nenhuma pulada.

### Passo 3 — publicar a fase (13h10)

Comando: `bash publicacao/implantar.sh publicar fase-4`

```
14287fa
publicar: em uso kaizen-tradutor:a6f9260 com o segredo kaizen_env_v1; publicando kaizen-tradutor:14287fa
Updating service kaizen_tradutor (id: xcvewu57o6t8jw6dni3uxwoi3)
publicar: esperando o serviço em 1/1 com kaizen-tradutor:14287fa (até 120 s)
migrar: nenhuma migração pendente
publicar: kaizen-tradutor:14287fa no ar (antes: kaizen-tradutor:a6f9260)
ID             NAME              MODE         REPLICAS   IMAGE                     PORTS
xcvewu57o6t8   kaizen_tradutor   replicated   1/1        kaizen-tradutor:14287fa
```

(Linhas do `git merge` e do `docker build` omitidas.) As migrações 010 a 013 já tinham sido aplicadas pela publicação das 09h32.

### Passo 4 — a história da Link (13h11)

Comando: `bash publicacao/implantar.sh rodar link` (5 segundos)

```
link ok: documentos=6183, novos=0, itens=15288, pagamentos=6009, conferencias=632, parcelas=221, baixas=127
documentos: 6183
documentos:conta_pagar: 88
documentos:fechamento_caixa: 158
documentos:nota_entrada: 51
documentos:orcamento: 4
documentos:pedido: 5305
documentos:sangria: 420
documentos:suprimento: 157
vendas_canceladas: 34
vendas_validas: 5271
itens_devolvidos: 54
itens_vendidos: 14704
pagamentos: 6009
pagamentos_batem: 5270 de 5271 vendas válidas somam venda − devolução
parcelas: 221, R$ 625.935,51
parcelas_pendentes: 94, R$ 245.864,76
baixas: 127, R$ 380.070,75
ligacoes:cliente: regra 336, decisão 7, falha 0
ligacoes:fornecedor: regra 19, decisão 0, falha 1
ligacoes:produto: regra 784, decisão 0, falha 6
ligacoes:vendedor: regra 3, decisão 0, falha 3
dias_comparados: 141
```

(Omitidas as linhas de `razao_fora` e as 10 `falha` já conhecidas da Fase 3, iguais às do PC.) `novos=0`: a Link já tinha sido gravada pela tarefa 12 depois da publicação das 09h32; esta rodada refez a conferência inteira. O comando só termina com `link ok` se os 141 dias baterem com a Link: **zero diferença na comparação por dia**. Os 6.183 documentos = 5.305 pedidos + 4 orçamentos + 158 fechamentos + 420 sangrias + 157 suprimentos + 88 contas + 51 notas.

### Passo 5 — a leitura da noite, manual (13h11)

Comando: `time bash publicacao/implantar.sh rodar noite`

```
noite aviso: documentos_lidos=331, documentos_novos=0, apagados=0, movimentos=291, foto=1029, produtos=1029, pessoas=451, funcionarios=9, fornecedores=662, avisos=2, respostas=546
real	1m24.751s
```

546 respostas = 182 dias (01/04 a 29/09) × 3 perguntas, em 1 min 25 s (o prazo da noite é 30 min). Os 2 avisos são os dois códigos do passo 2. Terminou às 13h12, bem antes da leitura das 14h.

### Passo 6 — as três perguntas, um dia de cada mês e hoje (13h12)

Comando: `bash publicacao/implantar.sh rodar indicadores 2026-04-30 2026-05-31 2026-06-30 2026-07-31 2026-08-31 2026-09-25 2026-09-26 2026-09-29`

```
30/04/2026 vendas: realizado do dia R$ 4.471,60 (33 vendas); no mês vendido R$ 58.825,56, devoluções R$ 1.322,12, realizado R$ 57.503,44 (481 vendas), sem meta cadastrada, projeção R$ 56.891,60
30/04/2026 compras: curva A 80, B 92, C 106 produtos; compras do período: A 7, B 13, C 5, sem venda 21; estoque desconhecido antes de 26/09/2026
30/04/2026 financeiro (link): a pagar R$ 82.492,39 em 25 parcelas, vencidas R$ 12.990,04, até 7 dias R$ 16.738,49; saldo do banco não digitado; quebra do dia R$ 23,00
31/05/2026 vendas: realizado do dia R$ 0,00 (0 vendas); no mês vendido R$ 132.684,79, devoluções R$ 1.141,42, realizado R$ 131.543,37 (904 vendas), sem meta cadastrada, projeção R$ 131.543,37
31/05/2026 compras: curva A 105, B 126, C 212 produtos; compras do período: A 40, B 25, C 34, sem venda 36; estoque desconhecido antes de 26/09/2026
31/05/2026 financeiro (link): a pagar R$ 104.180,37 em 46 parcelas, vencidas R$ 5.973,78, até 7 dias R$ 15.085,87; saldo do banco não digitado; quebra do dia R$ 0,00
30/06/2026 vendas: realizado do dia R$ 5.619,30 (33 vendas); no mês vendido R$ 140.882,93, devoluções R$ 437,16, realizado R$ 140.445,77 (961 vendas), sem meta cadastrada, projeção R$ 141.146,74
30/06/2026 compras: curva A 112, B 151, C 268 produtos; compras do período: A 51, B 42, C 28, sem venda 27; estoque desconhecido antes de 26/09/2026
30/06/2026 financeiro (link): a pagar R$ 91.141,64 em 43 parcelas, vencidas R$ 13.617,38, até 7 dias R$ 27.400,63; saldo do banco não digitado; quebra do dia R$ 0,00
31/07/2026 vendas: realizado do dia R$ 6.794,90 (43 vendas); no mês vendido R$ 145.743,81, devoluções R$ 352,83, realizado R$ 145.390,98 (1072 vendas), sem meta cadastrada, projeção R$ 143.854,76
31/07/2026 compras: curva A 114, B 161, C 327 produtos; compras do período: A 66, B 53, C 73, sem venda 65; estoque desconhecido antes de 26/09/2026
31/07/2026 financeiro (link): a pagar R$ 215.583,48 em 74 parcelas, vencidas R$ 16.485,51, até 7 dias R$ 11.009,49; saldo do banco não digitado; quebra do dia R$ 0,00
31/08/2026 vendas: realizado do dia R$ 4.232,86 (41 vendas); no mês vendido R$ 140.782,78, devoluções R$ 279,11, realizado R$ 140.503,67 (1008 vendas), sem meta cadastrada, projeção R$ 141.884,20
31/08/2026 compras: curva A 114, B 170, C 328 produtos; compras do período: A 82, B 65, C 67, sem venda 37; estoque desconhecido antes de 26/09/2026
31/08/2026 financeiro (link): a pagar R$ 201.578,48 em 79 parcelas, vencidas R$ 13.617,38, até 7 dias R$ 20.518,58; saldo do banco não digitado; quebra do dia R$ 0,00
25/09/2026 vendas: realizado do dia R$ 6.258,55 (52 vendas); no mês vendido R$ 118.204,98, devoluções R$ 663,73, realizado R$ 117.541,25 (836 vendas), sem meta cadastrada, projeção R$ 135.088,52
25/09/2026 compras: curva A 119, B 171, C 314 produtos; compras do período: A 90, B 72, C 75, sem venda 36; estoque desconhecido antes de 26/09/2026
25/09/2026 financeiro (link): a pagar R$ 245.864,76 em 94 parcelas, vencidas R$ 27.617,38, até 7 dias R$ 21.288,45; saldo do banco não digitado; quebra do dia R$ 0,01
26/09/2026 vendas: realizado do dia R$ 0,00 (0 vendas); no mês vendido R$ 118.204,98, devoluções R$ 663,73, realizado R$ 117.541,25 (836 vendas), sem meta cadastrada, projeção R$ 135.340,59
26/09/2026 compras: curva A 119, B 171, C 314 produtos; compras do período: A 90, B 72, C 75, sem venda 36; encalhe 243 produtos, R$ 41.433,55; ruptura 146
26/09/2026 financeiro (meuerp): a pagar R$ 212.245,04 em 79 parcelas, vencidas R$ 0,00, até 7 dias R$ 15.286,11; saldo do banco não digitado; quebra do dia R$ 0,00
29/09/2026 vendas: realizado do dia R$ 3.990,34 (24 vendas); no mês vendido R$ 130.561,75, devoluções R$ 663,73, realizado R$ 129.898,02 (910 vendas), sem meta cadastrada, projeção R$ 138.190,22
29/09/2026 compras: curva A 121, B 170, C 315 produtos; compras do período: A 95, B 72, C 74, sem venda 40; encalhe 240 produtos, R$ 41.071,56; ruptura 143
29/09/2026 financeiro (meuerp): a pagar R$ 214.627,22 em 80 parcelas, vencidas R$ 0,00, até 7 dias R$ 31.173,68; saldo do banco não digitado; quebra do dia R$ 0,00
```

**Esperado (ensaio no PC e Fase 3) × obtido na VPS:**

| Número | Esperado | VPS |
| --- | --- | --- |
| Vendido de abril (30/04) | R$ 58.825,56 | R$ 58.825,56 |
| Vendido de maio (31/05) | R$ 132.684,79 | R$ 132.684,79 |
| Vendido de junho (30/06) | R$ 140.882,93 | R$ 140.882,93 |
| Vendido de julho (31/07) | R$ 145.743,81 | R$ 145.743,81 |
| Vendido de agosto (31/08) | R$ 140.782,78 | R$ 140.782,78 |
| Vendido de setembro até 25/09 | R$ 118.204,98 | R$ 118.204,98 |
| **Soma** (58.825,56 + 132.684,79 + 140.882,93 + 145.743,81 + 140.782,78 + 118.204,98) | **R$ 737.124,85** | **R$ 737.124,85** |
| Vendas dos seis meses (481 + 904 + 961 + 1.072 + 1.008 + 836) | 5.262 | 5.262 |
| A pagar em 25/09 (fonte Link) | 94 parcelas, R$ 245.864,76 | 94 parcelas, R$ 245.864,76 |
| A pagar em 26/09 (fonte ERP novo) | o do ERP no momento | 79 parcelas, R$ 212.245,04 |

**O a pagar de 26/09 mudou desde o ensaio da manhã, e bate com o ERP.** No ensaio do PC (09h) eram 81 parcelas, R$ 217.491,43. Consulta só de leitura ao ERP às 13h13: as parcelas de conta a pagar (`CP`) pendentes são 79, R$ 212.245,04, e as canceladas 109, R$ 279.484,48 (eram 107, R$ 274.238,09, em 28/09): duas parcelas vencidas, R$ 5.246,39 (279.484,48 − 274.238,09), foram excluídas no ERP em 29/09, e a posição de qualquer dia passa a não contá-las (parcela cancelada é tratada como se não existisse). Em 29/09 são 80 parcelas, R$ 214.627,22 = as 79 (R$ 212.245,04) + a parcela da nota de entrada 439, paga por boleto (R$ 2.382,18).

### Passo 7 — o Telegram (13h13)

Comando: `bash publicacao/implantar.sh rodar teste-telegram`

```
teste-telegram: o Telegram aceitou a mensagem
```

### Passo 8 — as execuções da fase (13h13)

Comando: `bash publicacao/implantar.sh rodar execucoes 2026-09-28`

```
id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem
(linhas 1 a 11 iguais às do passo 2)
12 | noite | manual | 29/09 13:11 | aviso | 2 | sim | —
contagem desde 28/09/2026: ok 3, aviso 9, falha 0, pulada 0, sem resultado 0 (total 12)
```

Desde o início da fase (28/09, 19h28): as execuções 5 a 12. Nenhuma `falha` e nenhuma `pulada`; `ok` até a leitura das 08h de 29/09; `aviso` a partir das 09h, só pelos dois códigos novos do ERP (passo 2), que não vêm do código da Fase 4. A execução 12 (a noite manual deste registro) mandou o resumo dos avisos ao Telegram (`telegram sim`).
