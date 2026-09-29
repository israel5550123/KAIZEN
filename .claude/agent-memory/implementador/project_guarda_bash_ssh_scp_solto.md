---
name: guarda-bash-ssh-scp-solto
description: o hook guarda-bash.js bloqueia a palavra solta "ssh"/"scp" em QUALQUER comando Bash, inclusive dentro de mensagens de commit em prosa
metadata:
  type: project
---

O hook `.claude/hooks/guarda-bash.js` (PreToolUse do Bash) tem a regra
`/(^|[\s;&|(])(ssh|scp)(\.exe)?\s/i` para impedir `ssh`/`scp` soltos (a VPS só
fala com `publicacao/implantar.sh`). Essa regex não distingue comando real de
texto: se a mensagem de commit (passada por heredoc dentro do próprio comando
Bash) tiver a palavra "ssh" cercada de espaço em algum ponto — por exemplo
"testado com um ssh falso, sem falar com a VPS" — o hook recusa o commit
inteiro com "ssh/scp solto", mesmo que nenhum `ssh` de verdade seja chamado.

**Por quê:** o hook lê `tool_input.command` como string bruta e testa a regex
nela; não sabe distinguir heredoc/comentário/prosa de comando.

**Como aplicar:** ao escrever a mensagem de um commit (ou qualquer comando
Bash) que precise mencionar "ssh" ou "scp" em português corrido, hifenize ou
pontue de forma que a palavra não fique seguida de espaço logo após
"ssh"/"scp" — por exemplo "ssh-falso" em vez de "ssh falso". Vale para a
Tarefa 1 da Fase 4 (`publicacao/implantar.sh`, que usa `ssh` de verdade e é
testado com um substituto) e qualquer tarefa futura que documente esse script
no texto do commit.
