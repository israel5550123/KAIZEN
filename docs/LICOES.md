# Lições

O que deu errado numa fase e que regra teria evitado. Uma linha por lição, com a evidência (tarefa, commit ou item da auditoria). É a matéria-prima do fecho de fase: lição que aparece duas vezes vira regra num agente ou uma skill do projeto; lição que aparece uma vez fica aqui esperando.

Formato: **data · fase · o que aconteceu · evidência · regra que evitaria**.

## Fase 2

- 27/09/2026 · Fase 2 · A revisão de cada tarefa aprovou as 19 de primeira, e a revisão da branch inteira achou 5 problemas importantes (trava de só leitura com brechas, "voltou a funcionar" que não se repete, remédio do corte que travaria o tradutor, roteiro que publica sem a lista antes da virada, limpeza de imagens que falha) · 5 commits "Revisão final", de 3f006f4 a 5879f28 · Revisar a branch inteira também no meio da fase, logo depois das tarefas que se ligam (a execução da hora e a da noite), e não só no fim.
- 27/09/2026 · Fase 2 · O ensaio com o ERP de verdade rodou antes das correções da revisão final, que mudaram 10 arquivos que rodam em produção; foi preciso repetir a leitura da noite às 23h01 · `kaizen.execucao` do PC (20h44, 20h45 e 23h01) contra os commits das 22h06 às 22h33 · O ensaio é o último passo antes do fechamento: se o código mudou depois dele, a leitura da noite roda de novo no PC e o resultado é registrado.
- 27/09/2026 · Fase 2 · Os agentes `implementador`, `revisor` e `auditor-de-fase` foram criados no meio da sessão e não ficaram disponíveis como tipo de subagente; o orquestrador despachou `general-purpose` com o modelo do arquivo e a instrução de ler o papel · erro "Agent type 'implementador' not found" no despacho da tarefa 1; ruling no ledger · Criar ou mudar agentes antes de abrir a sessão da fase, e conferir no começo que os tipos aparecem.
