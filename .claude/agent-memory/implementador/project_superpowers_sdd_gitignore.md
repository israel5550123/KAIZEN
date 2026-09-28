---
name: project-superpowers-sdd-gitignore
description: .superpowers/sdd/ tem .gitignore próprio (ignora tudo); briefs e task-N-report.md não entram em commit
metadata:
  type: project
---

`.superpowers/sdd/` tem um `.gitignore` próprio (`.superpowers/sdd/.gitignore`, regra `*`) que ignora tudo dentro
da pasta, inclusive as subpastas por fase (ex.: `.superpowers/sdd/2026-09-28-fase3-tradutor-link/`). `git add` num
`task-N-report.md` ou `task-N-brief.md` falha com "ignored by one of your .gitignore files" a menos que se use `-f`.

**Why:** briefs e relatórios de tarefa são artefatos de trabalho do processo multiagente (orquestrador/implementador/
revisor), não parte do produto; o dono não versiona esse rastro.

**How to apply:** quando uma tarefa pedir para "acrescentar ao relatório .superpowers/sdd/.../task-N-report.md" e
também "commitar só os arquivos X", edite o relatório normalmente (ele fica salvo no disco, é isso que a tarefa
pede) mas não tente `git add` nele — nunca vai conflitar com "não commitar documento nenhum", porque o gitignore já
impede. Não usar `-f` para forçar a inclusão sem o dono pedir.
