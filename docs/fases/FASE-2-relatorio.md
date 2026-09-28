# Fase 2 — relatório

**27/09/2026. A fase fecha em duas etapas, e este relatório fecha a primeira.** A fase só fecha com os seis dias de operação na VPS.
- **Primeira etapa, pronta:** o tradutor do ERP novo foi feito, testado, ensaiado com o ERP de verdade, revisado e auditado nesta sessão, em modo autônomo. Ele é mesclado em `main` e enviado ao GitHub.
- **Segunda etapa, sua:** implantar na VPS e acompanhar seis dias de operação. Quem implementa não tem acesso à VPS (spec 7.1 e `docs/DECISOES.md`).

## O que ficou pronto

- **O banco próprio do Kaizen,** o esquema `kaizen`, com 18 tabelas e uma visão. Ele foi desenhado para receber o ERP novo agora e a Link na Fase 3. A spec (`docs/superpowers/specs/2026-09-27-fase2-esquema-e-tradutor-design.md`) diz de onde vem cada coluna nas duas fontes.
- **O tradutor do ERP novo.**
  - Lê o ERP só por consulta: a trava recusa qualquer escrita antes de sair do computador.
  - Roda de hora em hora, das 8h às 19h, e por inteiro às 22h, de segunda a sábado.
  - Grava tudo de uma vez ou nada, e não duplica se rodar duas vezes.
  - Apaga do Kaizen o que o suporte apagar do ERP, com aviso. Se o ERP devolver uma lista vazia ou cortada, não apaga nada.
  - Toda noite, compara os totais de cada dia com os do próprio ERP.
- **Avisos pelo Telegram:**
  - uma mensagem quando a leitura falha e outra quando volta;
  - às 22h, um resumo, só se houver aviso.

  Cada mensagem diz o que fazer.
- **280 testes automáticos, todos passando.** Eles incluem os casos reais da simulação e dos testes de 25 e 26/09: troco, três formas de pagamento, troca com crédito e uso do crédito, devolução em dinheiro, orçamento fechado dias depois, venda cancelada, pedido regravado, fechamento refeito, sangria, conta paga depois e baixa estornada.
- **Ensaio com o ERP de verdade, em 27/09** (`docs/FONTES.md`, "Ensaio da Fase 2"):
  - cada consulta rodou no ERP; a mais lenta levou 948 ms, contra um limite de 30.000 ms;
  - nenhuma coluna esperada falta;
  - a leitura completa rodou de novo às 23h01, já com o código final, depois das correções da revisão: gravou 44 documentos, 1.029 produtos, 447 pessoas e 9 funcionários em 2,7 s, sem aviso nenhum;
  - a comparação dos totais deu zero diferença.

  O ERP só tinha os 44 ajustes de custo de 27/09. A conta das vendas se prova com a operação real.
- **O roteiro de implantação** (`publicacao/README.md`), comando por comando, para você rodar na VPS, e o **comando de conferência**. Esse comando imprime, em palavras, os números do Kaizen e onde conferir cada um no ERP.
- **Revisão.**
  - Cada uma das 19 tarefas passou por um revisor independente, e todas foram aprovadas de primeira.
  - Uma revisão final da branch inteira, em quatro áreas, achou 5 problemas importantes e 16 menores, sem nenhum crítico.
  - Todos foram corrigidos, e uma re-revisão aprovou as correções.

## O que falta, e é seu

1. **Urgente, se ainda não fez:** o roteiro, passo 1. Parar o sync do Prumo e guardar a cópia da Link fora da VPS. É a única reserva da história de abril a 25/09.
2. **Importar de novo as contas a pagar.** Em 27/09, não havia nenhuma no ERP.
3. **Criar o robô do Telegram.** No Telegram, abra o BotFather, mande `/newbot` e dê um nome. Guarde no Gerenciador de Senhas o token que ele devolve e mande uma mensagem qualquer para o robô novo. O passo 5 do roteiro usa esse token e mostra como achar o número da conversa.
4. **Implantar na VPS pelo roteiro `publicacao/README.md`,** passos 0 a 8, entre hh:10 e hh:50. Antes do passo 6, peça a uma sessão a lista "antes da virada" e decida o que não for conta a pagar nem os 44 ajustes de custo.
5. **Por seis dias de operação seguidos,** toda manhã, rodar o passo 13 do roteiro (o comando `conferencia`) e olhar a parte 5. Nela precisam aparecer:
   - todas as leituras esperadas feitas. Uma falha do ERP só vale se o Telegram avisou, e a conferência mostra isso;
   - "zero diferença" na comparação da noite.

   Seis dias assim fecham o "pronto quando" da fase na VPS.
6. **Conferir as partes 1 a 4 do mesmo comando** com o relatório 154, a tela de contas a pagar, os fechamentos e três ou quatro produtos. Divergência volta como bug.
7. **Conferir com a equipe se o vendedor gravado é quem atendeu,** na primeira semana.

## As conferências da operação real

As 13 perguntas que só a loja funcionando responde estão abertas em `docs/FONTES.md`. A pergunta sobre o código HTTP do limite de 30 s também está aberta. Todas são respondidas lendo o ERP, só leitura, a partir de 28/09, e nenhuma segura a fase.

## Mudanças na spec depois da sua aprovação

Foram quatro, todas no commit 3cb89fd e registradas em `docs/DECISOES.md`:

- a seção "Alternativas consideradas", que o modo autônomo exige;
- as pastas do código (6.1);
- a proteção da noite contra uma lista de movimentos vazia (6.4 e 6.5);
- as travas de `ssh`, `scp` e `docker` no `.claude/settings.json`. A spec previa essas travas, mas esse arquivo é seu, então elas não foram criadas, e a spec (7.3) passou a dizer que as travas ficam com você. Hoje as suas travas cobrem force push, remoção de stack e volume e o prune do Docker, mas não `ssh`, `scp` nem `docker secret`. Se quiser essas três, acrescente as regras.

A exceção da conta do item da Link passou a cobrir também o item devolvido, com o seu aval de 27/09.

## Decisões tomadas sem você nesta fase

Todas estão em `docs/DECISOES.md`, seção "Fase 2", cada uma com o porquê e o que muda se estiver errada. As principais:

- **Onde a fase rodou:** o plano foi aprovado e executado nesta sessão, pelo modo autônomo, na branch `fase-2`.
- **Implantação:** fica com você, pelo roteiro, porque quem implementa não tem acesso à VPS.
- **Os 44 ajustes de custo de 27/09 entram como reais.** Se um dia precisar mudar isso, a migração tem de apagar junto o que já foi gravado. O texto de `docs/DECISOES.md` foi corrigido na revisão final para dizer isso.
- **Proteção nova na noite:** ela não apaga movimentos de estoque se o ERP devolver a lista vazia.
- **Escolhas técnicas:** o código fica em `tradutor/`, com o driver `pg` e o TypeScript só para conferir tipos.
- **Escopo:** as Fases 7 a 12 que você acrescentou hoje não mudam o esquema agora. Cada uma entra com as suas tabelas na sua fase.
- **Seus arquivos:** `CLAUDE.md`, `OBJETIVO.md`, `docs/LOJA.md`, `docs/AUTONOMIA.md` e `.claude/` continuam como você os deixou, fora dos commits da fase.

## Próxima fase

A Fase 3 (tradutor do ERP anterior) começa depois dos seis dias na VPS, porque uma fase não começa antes de a anterior fechar. Ela começa numa sessão nova, com este `/goal`:

```text
/goal A Fase 3 do OBJETIVO.md está fechada, seguindo docs/AUTONOMIA.md: (1) existe spec em docs/superpowers/specs/ e plano em docs/superpowers/plans/ para a fase, e todas as tarefas do plano têm linha "complete" no ledger; (2) os testes passam (comando e contagem no transcript) e a contagem bate com a esperada no plano; (3) cada item do "pronto quando" da fase tem evidência mostrada no transcript; (4) o subagente auditor-de-fase escreveu docs/fases/FASE-3-auditoria.md com veredito APROVADA; (5) a branch fase-3 foi mesclada em main e enviada ao GitHub; (6) docs/fases/FASE-3-relatorio.md existe, em português, com os números. Ou pare após 200 turnos e escreva em docs/fases/FASE-3-relatorio.md o que ficou pronto e o que falta.
```

A Fase 3 vai precisar ler o esquema `erp` da VPS, ou de uma cópia dele. Sem acesso à VPS, a sessão precisa do `pg_dump` do passo 1 do roteiro, restaurado no Postgres do PC.

Uma nota da auditoria para a Fase 7: os leads do CRM vêm de `/api/lead/v1`, que é um GET. A trava desta fase só deixa sair `consulta/sql`, e abrir essa porta é decisão da spec da Fase 7.
