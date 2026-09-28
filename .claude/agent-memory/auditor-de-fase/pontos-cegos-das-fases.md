---
name: pontos-cegos-das-fases
description: O que passou despercebido pelas revisões nas Fases 2 e 3 do Kaizen e como conferir sem escrever no banco; ler antes de auditar qualquer fase
metadata:
  type: project
---

O que as revisões de tarefa e de branch deixaram passar, e que só a auditoria viu (Fase 3, 28/09/2026):

- **Passo a passo do dono com `pg_restore --clean` sem `-n erp`.** Na VPS, `erp` e `kaizen` moram no mesmo banco `prumo`; um dump que não seja só do `erp` apagaria o esquema `kaizen`. Conferir todo comando de restauração que o dono vai rodar.
  **Why:** o dono executa sem ler código; um `--clean` amplo destrói dado sem aviso.
  **How to apply:** em toda fase com restauração ou migração pelas mãos do dono (Fase 4 na VPS, rodada final da Fase 3), exigir `-n erp` ou conferência da lista do dump.
- **Premissa da spec sobre o ERP novo medida na simulação e desmentida no primeiro dia real** (orçamento `OC` sai com movimento `S`, a spec dizia `N`). Conferir as premissas "no ERP novo é assim" contra documentos reais de 28/09 em diante no `kaizen` do PC.
- **Frases de composição no relatório** ("as 7 decisões são X e Y") saem imprecisas; os totais batem, a composição não. Conferir por consulta.
- **Decisão que está na spec mas não em `DECISOES.md`** (ex.: a pagar nas duas fontes, vendedor pelo primeiro nome). O dono lê `DECISOES.md`, não a spec.
- **Migração já aplicada com o texto mudado depois** (a 007): não há checksum; o banco antigo não vê a mudança. Aceitável se registrado.

Como provar "rodar duas vezes não duplica" só com SELECT: `visto_em` dos documentos (primeira rodada, nunca muda) contra `lido_em` do cadastro fonte `link` (última rodada), mais contagem de chaves de origem repetidas = 0.

Relacionado: [[auditoria-so-leitura]]
