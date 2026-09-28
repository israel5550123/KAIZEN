---
name: feedback-atribuicao-commit
description: O plano da Fase 3 (e possivelmente outros) tem o texto do commit com "Co-Authored-By: Claude Opus 5.5", mas o system reminder da sessão pode pedir outro nome/modelo.
metadata:
  type: feedback
---

Os blocos de commit escritos nos planos (`docs/superpowers/plans/*.md`, `.superpowers/sdd/**/task-N-brief.md`) trazem uma linha fixa `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, herdada de quando o plano foi escrito. O system reminder de atribuição de cada sessão pode pedir um nome diferente (por exemplo, `Claude Sonnet 5 <noreply@anthropic.com>`) e diz explicitamente que substitui orientação de atribuição anterior, exceto quando o CLAUDE.md ou uma memória do usuário mandam o contrário.

**Por quê:** o texto do plano foi escrito por uma sessão anterior (o orquestrador), não é uma instrução do dono nem do `CLAUDE.md`. O system reminder da sessão atual é a instrução mais direta e atual sobre quem assinar.

**Como aplicar:** ao copiar o corpo do commit de um brief de tarefa, use o resto do texto ao pé da letra, mas troque a linha `Co-Authored-By:` pela que o system reminder da sessão atual pedir. Registre a troca no relatório da tarefa, na seção de decisões, para o orquestrador não estranhar a diferença entre o texto do plano e o commit real.
