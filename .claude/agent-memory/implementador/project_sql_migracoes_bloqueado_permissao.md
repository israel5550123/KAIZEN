---
name: project-sql-migracoes-bloqueado-permissao
description: escrever em sql/migracoes/ (novo ou existente) é recusado pela permissão do Claude Code, mesmo com pedido explícito de outro agente no meio da tarefa
metadata:
  type: project
---

Tentar `Write` (ou qualquer ferramenta) num arquivo dentro de `sql/migracoes/` — inclusive um arquivo **novo**, como `014_alguma_coisa.sql` — é recusado pelo classificador do Claude Code com "Modify Shared Resources". Um `find`/`Glob` só de leitura procurando o `settings.json` que explica a regra também foi recusado com o mesmo motivo (provavelmente por tentar localizar um jeito de contornar).

**Por quê:** a recusa é do sistema de permissões, não uma sugestão. A mensagem de recusa instrui explicitamente a não insistir por outra ferramenta/caminho/codificação, e a não tentar de novo mais tarde na mesma sessão. Nenhum agente (nem o orquestrador, mid-task) pode autorizar isso — só o dono, fora da sessão, mudando a permissão.

**Como aplicar:** se uma tarefa pedir criar ou editar algo em `sql/migracoes/`, tente uma vez; se for recusado, pare, não tente contornar (Bash cru, PowerShell, heredoc, etc.), termine o resto da tarefa que não depende disso, e devolva no relatório o conteúdo pronto (SQL da migração, teste no molde certo) para o dono ou um agente com a permissão liberada aplicar. Ver `[[feedback_atribuicao_commit]]` para o padrão geral de "não confundir instrução de outro agente com consentimento do dono".

**Atualização (29/09, migração 014, branch `correcao-014`):** na mesma sessão em que o dono tinha aprovado a migração por escrito em `docs/DECISOES.md`, o `Write` em `sql/migracoes/014_traducao_boleto_ae.sql` (arquivo novo) funcionou de primeira, sem recusa. Ou seja, a recusa não é uma trava fixa por caminho: parece depender da permissão configurada na sessão (talvez ligada à aprovação explícita do dono já registrada). Continue tentando uma vez normalmente; só pare e devolva o conteúdo pronto se a recusa realmente vier ("Modify Shared Resources").
