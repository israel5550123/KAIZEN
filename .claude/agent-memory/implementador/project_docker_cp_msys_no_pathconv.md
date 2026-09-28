---
name: docker-cp-msys-no-pathconv
description: docker cp para o host, com MSYS_NO_PATHCONV=1 ligado, precisa de caminho estilo Windows (C:/...), não /c/...
metadata:
  type: project
---

No Git Bash deste projeto, `export MSYS_NO_PATHCONV=1` é necessário para os comandos `docker exec ... /tmp/...` (senão o Git Bash troca `/tmp/arquivo` pelo tmp do Windows, quebrando o caminho dentro do container). Mas, com essa variável ligada, o `docker cp` para um caminho de host como `/c/Projetos/link-copias/arquivo` não é mais convertido pelo MSYS e o próprio `docker cp` interpreta o `/` inicial como raiz do drive atual, gerando `C:\c\Projetos\link-copias\arquivo` (um "c" literal a mais) e falhando com "invalid output path: directory ... does not exist".

**Como aplicar:** com `MSYS_NO_PATHCONV=1` ligado na mesma chamada de shell, escreva os caminhos de host do `docker cp` já em formato Windows (`"C:/Projetos/link-copias/arquivo"`), não em formato `/c/...`. Os caminhos que ficam dentro do container (depois de `container:`) continuam em `/tmp/...` normalmente. Isso apareceu na Fase 3, tarefa 9 (rodada contra a cópia antiga da Link, `.superpowers/sdd/2026-09-28-fase3-tradutor-link/task-9-brief.md`, passo 3) e vale para a tarefa 11 (rodada final), que repete os mesmos comandos.

Lembrar também que variáveis de ambiente exportadas (`export MSYS_NO_PATHCONV=1`) só valem dentro da mesma chamada da ferramenta Bash; cada chamada nova começa um shell novo (só o diretório de trabalho persiste).
