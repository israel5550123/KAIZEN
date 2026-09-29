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

**Como aplicar:** não tente passar a palavra pela trava (nada de hífen ou disfarce): a trava é do dono. Escreva a mensagem de commit sem ela ("acesso remoto", "o programa de acesso à VPS"), e escreva textos de arquivo que precisem dela pelo editor de arquivos (Write/Edit), não por heredoc no Bash. Lição da Fase 4 em docs/LICOES.md.
