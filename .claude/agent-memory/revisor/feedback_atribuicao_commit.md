---
name: atribuicao-commit-nao-reprova
description: Divergência entre o Co-Authored-By pedido no plano/restricoes.md e o que sai no commit real não é achado de reprovação
metadata:
  type: feedback
---

Quando o brief de uma tarefa (ou `restricoes.md`) pede uma linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` mas o commit real sai com outro nome de modelo (ex.: `Claude Sonnet 5 <noreply@anthropic.com>`), isso **não é achado que reprova**.

**Por quê:** o system reminder de atribuição da sessão do implementador diz explicitamente que substitui qualquer instrução de atribuição anterior, inclusive uma cópia antiga do mesmo reminder. O implementador da Tarefa 1 da Fase 3 (migrações 006/007, commit `3397949`) documentou essa troca no relatório, com o motivo. O texto do brief foi escrito antes da sessão come ar, então ele não é uma instrução do dono nem do `CLAUDE.md`: é só o texto congelado do plano.

**Como aplicar:** ao revisar qualquer tarefa desta Fase 3 (ou de outra) cujo plano tenha uma linha `Co-Authored-By` fixa, checar apenas se a linha existe e identifica um coautor Claude; não travar a revisão por causa do nome/versão do modelo. Colocar em "Observações", nunca em "Achados que reprovam". Isso deve se repetir nas Tarefas 2 a 10 do plano da Fase 3, que têm o mesmo texto de commit no brief.
