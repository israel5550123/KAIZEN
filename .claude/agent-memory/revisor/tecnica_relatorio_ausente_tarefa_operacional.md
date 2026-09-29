---
name: tecnica-relatorio-ausente-tarefa-operacional
description: O que fazer quando o orquestrador aponta um task-N-report.md que não existe no disco (tarefas de operação/ensaio, sem código)
metadata:
  type: feedback
---

Na Tarefa 11 da Fase 4 (o ensaio no PC), o orquestrador me mandou ler `task-11-report.md` como "relatório do implementador (alegação)", mas esse arquivo nunca existiu na pasta da fase (`.superpowers/sdd/<fase>/`) — só existiam `task-11-brief.md` e dois `.txt` de saída bruta (`task-11-indicadores-saida.txt`, `task-11-noite-saida.txt`). Conferi com `git log --all --diff-filter=A --name-only` que o arquivo nunca foi criado nem removido: não é sumiço, é ausência desde sempre.

**Why:** tarefas de operação/ensaio (sem código, sem teste, cujo "Files: Create" é o próprio registro em `docs/fases/*.md`) não seguem o padrão das 7 perguntas dos relatórios de implementação — o próprio registro da fase já cumpre o papel de relatório (traz comandos, saídas, tabela esperado×obtido e veredito no rodapé). Travar a revisão por um arquivo que a tarefa nunca pediu para existir seria reprovar por uma exigência que não está no brief.

**How to apply:** se o relatório apontado pelo orquestrador não existir, primeiro confirme que a tarefa é do tipo "operação" (brief diz explicitamente "não acrescenta código nem teste", e o único artefato listado em Files é um `docs/fases/*.md`). Se for esse o caso, trate o próprio registro como a "alegação" a ser verificada (ordem de leitura 4 do meu papel) e não reprove pela ausência do `task-N-report.md`; registre isso como observação, não como achado. Se a tarefa for de código (Files inclui `.mts`/`.ts`) e o relatório ainda assim não existir, aí sim é achado — nesse caso não há como confirmar as "7 perguntas" nem o TDD alegado.
