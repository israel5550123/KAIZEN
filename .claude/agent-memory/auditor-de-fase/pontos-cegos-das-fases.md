---
name: pontos-cegos-das-fases
description: O que passou despercebido pelas revisões nas Fases 2 e 3 do Kaizen e como conferir sem escrever no banco; ler antes de auditar qualquer fase
metadata:
  type: project
---

O que as revisões de tarefa e de branch deixaram passar, e que só a auditoria viu (Fase 3, 28/09/2026):

- **Passo a passo do dono com `pg_restore --clean` sem `-n erp`.** Na VPS, `erp` e `kaizen` moram no mesmo banco `prumo`; um dump que não seja só do `erp` apagaria o esquema `kaizen`. Conferir todo comando de restauração que o dono vai rodar.
  **Why:** o dono executa sem ler código; um `--clean` amplo destrói dado sem aviso.
  **How to apply:** em toda fase com restauração ou migração pelas mãos do dono (Fase 4 na VPS), exigir `-n erp` ou conferência da lista do dump.
- **Premissa da spec sobre o ERP novo medida na simulação e desmentida no primeiro dia real** (orçamento `OC` sai com movimento `S`, a spec dizia `N`; na rodada final se provou que o `S` não baixa estoque). Conferir as premissas "no ERP novo é assim" contra documentos reais de 28/09 em diante.
- **Frases de composição no relatório saem erradas, e de novo depois de revisadas.** Na Fase 3 foram três: "as 7 decisões são X e Y" (auditoria da construção), "as outras 16" que eram 14 (revisão final), "Pagamentos das vendas: 6.009" que incluía 577 de sangria e suprimento (auditoria final). Os totais batem; a composição não. Conferir cada "X é A + B" por consulta.
- **Decisão que está na spec mas não em `DECISOES.md`**. O dono lê `DECISOES.md`, não a spec.
- **Migração já aplicada com o texto mudado depois** (a 007): não há checksum; aceitável se registrado.
- **O ledger `.superpowers/sdd/` é gitignored**: a linha `complete` só existe no disco; a última tarefa (rodada/mescla) costuma ficar sem ela no momento da auditoria.
- **Mudança do dono sem commit em `OBJETIVO.md`** citada por `DECISOES.md` e pelo `/goal` seguinte: apontar que o dono precisa commitar, senão `main` cita decisão que não está em `main`.

Como provar sem escrever:
- "Rodar duas vezes não duplica": `visto_em` dos documentos (primeira rodada, nunca muda) contra `lido_em` do cadastro fonte `link` (última rodada), mais chaves de origem repetidas = 0, mais `foto.sql` agora igual à foto da última rodada.
- "Nada gravado no `erp` depois da restauração": `pg_stat_user_tables` do esquema `erp` com `upd=0 del=0` e `ins` = soma exata das linhas restauradas, e o md5 por tabela (`C:\Projetos\link-copias\erp-impressao.sql`) igual ao do fim da rodada. Mesma coisa no `link_postgres`.

Relacionado: [[auditoria-so-leitura]]
