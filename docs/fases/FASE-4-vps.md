# Fase 4 — o que rodou na VPS

**SHA publicado: `c4045c6`** (o mesmo `git rev-parse --short HEAD` do PC). Imagem anterior: `kaizen-tradutor:ecf9280`.

## 1. Primeira publicação

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
