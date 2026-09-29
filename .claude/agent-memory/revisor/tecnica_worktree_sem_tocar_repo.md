---
name: tecnica-worktree-sem-tocar-repo
description: Como reproduzir RED e medir antes/depois sem mudar nenhum arquivo do repositório principal
metadata:
  type: project
---

Quando a tarefa de revisão proíbe mudar qualquer arquivo do repositório ("não mude nenhum arquivo do repositório"), mas pede para reproduzir o RED de um teste ou medir antes/depois de uma otimização, use:

1. **`git worktree add ../pasta-tmp <commit-antes>`** — cria uma cópia isolada checkada no commit anterior à correção, sem tocar a árvore principal. Depois, `git worktree remove ../pasta-tmp --force` para limpar (confirme com `git worktree list` que sumiu).
2. **`node_modules` não vem com o worktree** (não é rastreado pelo git). Em vez de rodar `npm install` (lento e desnecessário), crie uma junção: `cmd //c "mklink /J <worktree>\node_modules <repo>\node_modules"` (Windows) — ou symlink em POSIX.
3. **`.env` também não vem** (gitignored) — copie manualmente do repo principal para o worktree.
4. Para provar RED: copie só os arquivos de teste do commit corrigido para o worktree (`git show <commit-depois>:caminho/teste.mts > caminho/teste.mts`), deixando o SQL/código de produção do worktree como estava antes da correção. Rode os testes: devem falhar exatamente como o relatório alega.
5. Para medir performance sem editar o arquivo do repo: leia o SQL atual com `readFileSync`, construa a versão "antes" em memória (regex/replace desfazendo a otimização) e rode as duas via `EXPLAIN ANALYZE` numa transação `read only`, direto no Postgres do PC (`docker ps` mostra o container e a porta; a URL costuma estar em `.env` como `KAIZEN_URL`). Nunca escreva a versão "antes" de volta no arquivo do repo.
6. Scripts assim rodam do scratchpad, mas o Node ESM não resolve pacotes do `node_modules` do repo a partir de um cwd diferente nem via `NODE_PATH` — importe pelo caminho absoluto: `import pg from 'file:///C:/Projetos/KAIZEN/node_modules/pg/lib/index.js'`.

**Por quê**: a instrução de não mexer no repositório é para não contaminar a árvore de trabalho durante uma revisão (evitar mascarar o que o próximo agente vai ver, ou commitar algo por engano). O worktree isola completamente; o script de medição fica só no scratchpad, nunca no repo.

**Como aplicar**: sempre que a tarefa pedir "reproduza o RED desfazendo a correção numa cópia fora do repositório" ou "meça antes/depois só lendo".
