---
name: date-tz-fortaleza-git-bash
description: "date" com TZ=America/Fortaleza no Git Bash desta máquina não converte — devolve a hora do sistema (UTC) com o rótulo errado
metadata:
  type: project
---

Neste ambiente (Git Bash do PC do orquestrador), `TZ="America/Fortaleza" date "+%d/%m/%Y %H:%M"` não converte de verdade: ele devolve o relógio do sistema (que roda em UTC) só com o rótulo "Fortaleza" colado, adiantado 3h da hora real de Fortaleza. Isso já causou um erro no registro da Fase 3, tarefa 9 (`docs/fases/FASE-3-rodada-copia-antiga.md`), corrigido num commit à parte (`a9033d4`) depois de a revisão pegar.

**Como aplicar:** para registrar "quando" algo aconteceu em hora de Fortaleza (fuso do projeto), não confie em `date` com `TZ` neste shell. Use uma fonte que já carregue o offset explícito, por exemplo `git log -1 --format=%ai <commit>` (mostra `-0300`, que é o offset fixo de Fortaleza, sem horário de verão) ou o mtime dos arquivos (`ls -la --time-style=full-iso`, que também sai em `-0300` neste PC). Valores de coluna `timestamp` que já vêm do Postgres (via `psql`) não têm esse problema — são texto puro do banco, não passam por `date`/`TZ`.
