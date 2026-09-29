---
name: tecnica-mensagem-commit-vs-registro
description: Checar se a mensagem do commit (às vezes pré-escrita no brief) ainda é verdadeira depois de um passo ter sido adiado ou mudado no despacho
metadata:
  type: feedback
---

Alguns briefs de tarefa de operação (ex.: `task-N-brief.md` da publicação na VPS) já escrevem o comando `git commit -m "..."` literal no passo final, escrito **antes** de a tarefa rodar, assumindo que todos os passos anteriores terminaram como o brief previu. Quando o orquestrador adia ou muda um passo no despacho (ex.: "de madrugada não há leitura agendada, o passo 5 fica para a tarefa 12"), o implementador pode registrar o adiamento corretamente no corpo do documento e, ainda assim, rodar o `git commit` com o texto literal do brief, que vira uma afirmação falsa presa para sempre no histórico do git.

Caso encontrado: Fase 4, Tarefa 3 (`publicacao/implantar.sh` na VPS), commit `f427564`. O brief mandava commitar com a mensagem "Fase 4: primeira publicação na VPS pelo implantar.sh; a leitura seguinte terminou ok". O despacho autorizou adiar o passo 5 (esperar a leitura seguinte) para a tarefa 12, porque a publicação terminou de madrugada (01h10 Fortaleza) e a próxima leitura agendada só é às 08h. O relatório e o `docs/fases/FASE-4-vps.md` registram esse adiamento corretamente ("fica para a tarefa 12") — mas a mensagem do commit, checada com `git show -s --format=%B <sha>`, manteve o texto original, afirmando que "a leitura seguinte terminou ok", o que não foi verificado nesta tarefa (o commit é de 01h45, sete horas antes da leitura das 8h). Reprovei por isso.

**Why:** a regra do despacho é "o registro não afirma nada que as saídas não mostrem (inclusive a mensagem do commit)" — a mensagem do commit é parte do registro permanente, não um detalhe cosmético; uma afirmação lá que o corpo do próprio documento contradiz é uma alegação sem evidência, que é exatamente o que a revisão existe para pegar.

**How to apply:** sempre que uma tarefa de operação tiver um comando de commit literal no brief, e o despacho (ou o relatório) mencionar qualquer adiamento, mudança de passo ou "BLOCKED" parcial, conferir a mensagem real do commit com `git show -s --format=%B <sha>` e comparar frase a frase com o que o próprio documento commitado registra. Divergência = achado que reprova, com a evidência sendo o próprio texto do commit contra o próprio texto do documento.
