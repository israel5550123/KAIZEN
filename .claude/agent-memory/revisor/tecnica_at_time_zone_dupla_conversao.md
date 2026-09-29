---
name: tecnica-at-time-zone-dupla-conversao
description: Ao conferir timestamptz do Postgres por node-postgres, não usar "AT TIME ZONE 'America/Fortaleza'" sem checar o timezone da sessão — pode converter duas vezes
metadata:
  type: feedback
---

Ao conferir uma hora registrada (ex.: "rodada no PC às 15h12") contra a coluna `inicio` (tipo `timestamp with time zone`) de `kaizen.execucao` via `node --env-file=.env` + `pg`, rodar `select inicio at time zone 'America/Fortaleza'` e fazer `JSON.stringify` do resultado é enganoso: se a sessão do Postgres já está no fuso `-03` (comum em bancos locais/VPS deste projeto), `AT TIME ZONE` converte de novo, e o driver `pg` serializa o resultado (que já é um "timestamp without time zone" com o valor local) como se fosse UTC, anexando `Z`. O resultado aparenta uma hora 3h adiantada da real (ex.: `18:12:12Z` quando a hora Fortaleza verdadeira era `15:12:12`).

**Why:** na Fase 4 tarefa 13, isso quase virou um achado falso (a hora do registro "batendo errado" com o banco) até eu trocar a consulta por `inicio::text` (que devolve o offset gravado, ex.: `2026-09-29 15:12:12.960688-03`) e confirmar que o registro estava certo.

**How to apply:** para conferir hora de uma coluna `timestamptz`, preferir `select coluna::text` (mostra o offset gravado, sem depender do timezone da sessão) a `AT TIME ZONE`. Se usar `AT TIME ZONE`, primeiro conferir `show timezone` da sessão — se já for `America/Fortaleza` ou `-03`, não aplicar `AT TIME ZONE` de novo. Ver também [[tecnica-conferir-horario-fortaleza]].
