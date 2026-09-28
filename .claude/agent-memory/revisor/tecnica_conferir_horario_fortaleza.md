---
name: tecnica-conferir-horario-fortaleza
description: Como flagrar um "quando" (data/hora Fortaleza) errado num registro de fase, comparando com o timestamp do commit git
metadata:
  type: feedback
---

Ao revisar um registro de fase (`docs/fases/*.md`) que afirma "quando (data e hora de Fortaleza)", confira contra o `git log -1 --format="%ai"` do commit da própria tarefa (o author/committer date do git carrega o offset `-03:00` real, confiável, e não depende do relógio do container) e contra o `mtime` dos arquivos brutos citados como evidência (dump, fotos, rodadas). Já achei um caso (Fase 3, tarefa 9, commit `6b947e2`) em que o registro dizia "08h35 (Fortaleza)" mas o commit foi às "05:36:42 -0300" — exatamente as 3h de diferença entre UTC e America/Fortaleza, ou seja: o autor pegou a hora UTC e rotulou como Fortaleza.

**Why:** é um erro fácil de cometer (confundir `date -u` com hora local) e fácil de não perceber só lendo o texto, porque o registro "soa" plausível; só bate com a realidade quando se compara com uma fonte de horário independente e confiável (timestamp do git, que sempre grava o offset).

**How to apply:** sempre que o passo da tarefa pedir "hora de Fortaleza" num registro, rodar `git log -1 --format="Author: %ai"` do commit da tarefa e comparar a hora (ajustando por poucos minutos de execução); se a diferença for de ~3h, é quase certo que é UTC rotulado como Fortaleza — isso conta como "número que você reproduziu e deu diferente do relatado" e reprova.
