---
name: pontos-cegos-das-fases
description: O que passou despercebido pelas revisões nas Fases 2 a 4 do Kaizen e como conferir sem escrever no banco nem na VPS; ler antes de auditar qualquer fase
metadata:
  type: project
---

O que as revisões de tarefa e de branch deixaram passar, e que só a auditoria viu (Fase 3, 28/09/2026; Fase 4, 29/09/2026):

- **Passo a passo do dono com `pg_restore --clean` sem `-n erp`.** Na VPS, `erp` e `kaizen` moram no mesmo banco `prumo`; um dump que não seja só do `erp` apagaria o esquema `kaizen`. Conferir todo comando de restauração que o dono vai rodar.
  **Why:** o dono executa sem ler código; um `--clean` amplo destrói dado sem aviso.
  **How to apply:** em toda fase com restauração ou migração pelas mãos do dono, exigir `-n erp` ou conferência da lista do dump.
- **Premissa da spec sobre o ERP novo medida na simulação e desmentida no primeiro dia real.** Conferir as premissas "no ERP novo é assim" contra documentos reais de 28/09 em diante.
- **Frases de composição no relatório saem erradas** (três vezes na Fase 3). Conferir cada "X é A + B" por consulta. Na Fase 4 todas bateram (o verificador independente de números funcionou).
- **Decisão que está na spec mas não em `DECISOES.md`** — aconteceu de novo na Fase 4, e pior: o relatório dizia "estão em DECISOES.md" e 4 de 9 não estavam; uma (corte do financeiro em 26/09) contrariava a entrada da Fase 3 (28/09). Conferir cada item de "Decisões tomadas sem você" do relatório contra as entradas de `DECISOES.md`, e cada decisão numerada da spec contra elas. Conferir também se existe o título `## Fase N` (na Fase 4 as entradas ficaram debaixo de `## Fase 3`).
- **Tarefa pós-mescla com resultado e mensagem de commit escritos de antemão** (Fase 4, tarefa 13 prometia "a leitura seguinte terminou ok" quando as leituras estavam em `aviso`). Ler o texto das tarefas que ainda vão rodar e apontar promessa que o estado atual desmente.
- **Condição literal do dono não cumprida por causa externa** (Fase 4: leituras em `aviso` por códigos novos do ERP, com a tradução bloqueada pela permissão). Julgar pelo propósito escrito no plano ("o cálculo não muda nada da leitura"), provar que o aviso viria igual com o código de `main`, e dizer em uma linha que o literal fica aberto.
- **Migração já aplicada com o texto mudado depois** (a 007): não há checksum; aceitável se registrado.
- **O ledger `.superpowers/sdd/` é gitignored**: a linha `complete` só existe no disco; a última tarefa (rodada/mescla) costuma ficar sem ela no momento da auditoria.
- **Mudança do dono sem commit em `OBJETIVO.md`**: apontar que o dono precisa commitar.
- **Memória de agente que ensina a passar por baixo de trava do dono** (Fase 4: hifenizar a palavra do acesso remoto para o `guarda-bash` não pegar). Ler as memórias novas dos agentes no diff da branch.

Como provar sem escrever:
- "Rodar duas vezes não duplica": `visto_em` contra `lido_em`, chaves de origem repetidas = 0, `foto.sql` igual à da última rodada.
- "Nada gravado no `erp`": `pg_stat_user_tables` do esquema `erp` com `upd=0 del=0`, e o md5 por tabela igual ao do fim da rodada.
- **VPS, só lendo:** `bash publicacao/implantar.sh log N` (qualquer hora; mostra só o que o `crond` rodou, com `respostas=` nas linhas `hora`/`noite`, em UTC, 3 h na frente) e `rodar execucoes AAAA-MM-DD` (só de hh:10 a hh:50; mostra resultado, avisos e telegram, mas não as contagens). O que foi rodado por `exec` (`link`, `indicadores`, `noite` manual) não aparece no log: esses números só se conferem pelo registro `FASE-N-vps.md` e reproduzindo no banco do PC.
- Suíte da Fase 4: `npm run verificar` leva ~6 min (424 testes); rodar em segundo plano com saída num arquivo do scratchpad funcionou.

Relacionado: [[auditoria-so-leitura]]
