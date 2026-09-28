# Como o Kaizen é construído em modo autônomo

O dono definiu o destino em `OBJETIVO.md` e não fica na sessão. Cada fase roda de ponta a ponta sem perguntar nada a ele. Este documento diz quem decide o quê, o que trava, e como uma fase começa e termina.

## Papéis

| Papel | Onde roda | Modelo | O que faz |
|---|---|---|---|
| **Orquestrador** | o chat principal do Claude Code | o da sessão (usar Opus) | lê o objetivo, faz o brainstorming e a spec consigo mesmo, escreve o plano, despacha tarefas, julga revisões, decide conflitos, fecha a fase |
| **implementador** | subagente (`.claude/agents/implementador.md`) | Sonnet | uma tarefa por vez, com as 7 perguntas antes do código |
| **revisor** | subagente (`.claude/agents/revisor.md`) | Sonnet | spec cumprida? código a mais? teste prova algo? |
| **auditor-de-fase** | subagente em contexto limpo (`.claude/agents/auditor-de-fase.md`) | Opus | uma vez por fase, roda os testes e confere o "pronto quando" |

Para mudar o modelo de um papel, troque a linha `model:` do arquivo do agente. Ao despachar pelo `subagent-driven-development`, use `subagent_type` com esses nomes (em vez de `general-purpose`), mantendo os prompts das skills, e **não passe `model` na chamada**: o parâmetro da chamada vence o do arquivo, e o arquivo é onde o dono controla o modelo. A exceção é a escalada das rodadas 4 e 5 do loop de correção, em que a skill manda subir um degrau.

## O que "parceiro humano" significa aqui

As skills do Superpowers falam em "aprovação do parceiro humano" (brainstorming, spec, plano, escolha inline × subagentes, merge). **Em modo autônomo, o parceiro humano é o orquestrador.** A aprovação já foi dada de antemão por `OBJETIVO.md`. Concretamente:

- **Brainstorming**: as perguntas que a skill faria ao dono, o orquestrador responde consultando `OBJETIVO.md`, `docs/LOJA.md`, `docs/api/` e `docs/DECISOES.md`. Quando nenhum deles responde, escolhe a opção mais simples e registra em `docs/DECISOES.md`.
- **Brainstorming, passo das abordagens**: as 2–3 abordagens com prós e contras continuam obrigatórias, por escrito. A spec ganha uma seção **"Alternativas consideradas"** com cada abordagem descartada em duas linhas (o que era, por que perdeu) e o critério que decidiu — sempre o de `OBJETIVO.md`: menos peças, menos regras, menos dependências, nenhuma exceção para funcionar. É por essa seção que o dono confere se a ideia escolhida foi a certa.
- **Spec e plano**: o orquestrador roda o loop de revisão da skill, aprova e segue. Não espera leitura do dono.
- **Execução**: sempre `subagent-driven-development`, sempre em branch `fase-N`. Não há pausa entre tarefas.
- **Fim da fase**: `finishing-a-development-branch` → merge em `main` e push. Não pergunta.
- **A ferramenta AskUserQuestion está bloqueada por hook.** Não tente contornar: a resposta é decidir e registrar.

## As únicas três paradas

O trabalho só para, e o orquestrador só escreve "PARADO:" no relatório da fase, quando:

1. Uma ação **irreversível fora do repositório** é necessária e não está prevista em `OBJETIVO.md` (apagar dado na VPS, contratar serviço, gastar dinheiro).
2. **Todo caminho possível é um chute** e o erro custaria refazer a fase inteira.
3. O **auditor reprovou duas vezes** o mesmo item e a terceira tentativa não tem uma ideia nova.

Tudo o mais é decisão do orquestrador. Uma decisão errada custa retrabalho que o dono vê e desfaz pelo git; uma parada custa dias.

## Acesso à VPS

O agente usa a VPS, mas só por uma porta: o script `publicacao/implantar.sh`, versionado no repositório. `ssh`, `scp` e `docker secret` soltos continuam bloqueados no `.claude/settings.json`; o script é o único comando liberado.

- **Até a Fase 3**, a VPS é do dono: a Fase 3 lê a cópia da Link e não precisa implantar nada.
- **No início da Fase 4**, antes da primeira tarefa, o orquestrador escreve `publicacao/implantar.sh` como tarefa do plano, com revisão normal. O script só pode: enviar os arquivos da stack `kaizen`, rodar `docker stack deploy` da stack `kaizen`, ler o log dos serviços da stack `kaizen` e rodar as migrações do esquema `kaizen`. Nada da stack `prumo`, do esquema `erp`, de volumes ou de segredos. Os segredos o dono cria à mão.
- Com o script aprovado pelo revisor, o orquestrador acrescenta ao `allow` do `.claude/settings.json` **uma única regra**, `Bash(bash publicacao/implantar.sh*)`, e registra em `docs/DECISOES.md`. É a única exceção à regra de não mexer no `settings.json`, e vale só uma vez.
- Qualquer mudança posterior no script é tarefa com revisão, e o revisor reprova se ela sair da stack `kaizen`.
- A partir daí, as fases que implantam (4, 5b, 6, 7) fecham sozinhas, sem esperar o dono.

## Quando o revisor contradiz o plano

O orquestrador escreveu o plano e tende a defendê-lo. Por isso, quando um achado do revisor contradiz o texto do plano, a regra é: o orquestrador não pode simplesmente manter o plano. Ele registra a decisão em `docs/DECISOES.md` com a evidência que sustenta cada lado e escolhe pelo critério de `OBJETIVO.md`, não pela autoria. Se der razão ao plano contra o revisor **duas vezes no mesmo ponto**, o ponto vai para o auditor de fase decidir, e a decisão dele vale.

Nenhum papel revisa o que ele mesmo escreveu: implementador e revisor são despachos separados; o auditor não viu a conversa. O implementador só é retomado para corrigir o próprio trabalho (rodadas 1–3); a re-revisão é sempre despacho novo.

## Registro de decisões

Toda decisão que o dono *poderia* querer tomar vai para `docs/DECISOES.md`, uma entrada por decisão: data, fase, **o quê**, **por quê** (que trecho do objetivo ou da spec sustenta), **o que muda se estiver errado**. É por esse arquivo que o dono audita a fase depois, e é onde ele responde. Decisão não registrada é decisão que não aconteceu.

## Contra o loop infinito

- O loop de correção por tarefa tem no máximo 5 rodadas (já é regra da skill). Na 5ª, o orquestrador decide: aceita com pendência registrada, ou remove a tarefa e registra.
- A condição de `/goal` sempre traz um teto de turnos. Batido o teto, o orquestrador escreve `docs/fases/FASE-N-relatorio.md` com o que está pronto e o que falta, e para.
- "Pronto" é o "pronto quando" de `OBJETIVO.md`, verificado pelo auditor. Depois disso não se melhora nada: melhoria é assunto da fase seguinte ou do dono.

## Travas mecânicas (não dependem de bom senso)

- `.claude/settings.json`: modo `auto` (sem prompt de permissão), com `deny` para force push, remoção de stack/volume no Docker, prune do Docker e `ssh`, `scp` e `docker secret` soltos (seção "Acesso à VPS").
- `.claude/hooks/sem-perguntas.js`: nega `AskUserQuestion`.
- `.claude/hooks/guarda-bash.js`: nega comando destrutivo na VPS, `DROP`/`TRUNCATE` no esquema `erp`, `git reset --hard`, `rm -rf` fora do projeto e qualquer escrita HTTP no Meu ERP Online.
- Testes só valem com valor de referência concreto; `.skip`/`.only` reprovam na revisão.

## Como uma fase roda

1. `git checkout main && git pull`, abrir sessão nova do Claude Code (contexto zero), modelo Opus. No início da fase, o orquestrador confere que `implementador`, `revisor` e `auditor-de-fase` aparecem entre os `subagent_type` disponíveis. Se algum não aparecer, ele escreve isso em `docs/fases/FASE-N-relatorio.md` e para antes da primeira tarefa: os agentes só carregam quando a sessão abre, e o dono precisa abrir uma sessão nova (`docs/LICOES.md`, Fase 2).
2. Confirmar que o modo de permissão mostra `auto` (Shift+Tab alterna; `.claude/settings.json` já define).
3. Colar o `/goal` da fase (modelo abaixo). A partir daí a sessão só volta ao dono quando a condição é atingida, quando é julgada impossível, ou quando o teto de turnos bate.
4. Limites de uso da conta pausam o `/goal` e ele retoma sozinho quando o limite renova. O PC precisa ficar ligado com o VS Code aberto.
5. Ao fim: `docs/fases/FASE-N-auditoria.md` (do auditor) e `docs/fases/FASE-N-relatorio.md` (do orquestrador, em português, por números) são o que o dono lê. Divergência com o ERP volta como bug na fase seguinte, nunca reabre a fase.
6. O relatório da fase termina com o texto do `/goal` da fase seguinte, montado a partir do "pronto quando" dela em `OBJETIVO.md`, pronto para o dono colar numa sessão nova.
7. Quando uma fase depende de dado que ainda não existe (ex.: operação real do ERP), ela fecha com o dado disponível e ganha depois um `/goal` de conferência, em sessão nova, que compara o esquema próprio com a fonte e corrige o que divergir. Conferência não reabre a fase; corrige e registra.

### Modelo de `/goal` para uma fase

```
/goal A Fase N do OBJETIVO.md está fechada, seguindo docs/AUTONOMIA.md: (1) existe spec em docs/superpowers/specs/ e plano em docs/superpowers/plans/ para a fase, e todas as tarefas do plano têm linha "complete" no ledger; (2) os testes passam (comando e contagem no transcript) e a contagem bate com a esperada no plano; (3) cada item do "pronto quando" da fase tem evidência mostrada no transcript; (4) o subagente auditor-de-fase escreveu docs/fases/FASE-N-auditoria.md com veredito APROVADA; (5) a branch fase-N foi mesclada em main e enviada ao GitHub; (6) docs/fases/FASE-N-relatorio.md existe, em português, com os números. Ou pare após 200 turnos e escreva em docs/fases/FASE-N-relatorio.md o que ficou pronto e o que falta.
```

## Aprendizado entre sessões

Duas peças, nada mais:

1. **Memória própria de cada subagente.** Os três agentes têm `memory: project`: cada um mantém `.claude/agent-memory/<nome>/MEMORY.md`, que entra no git. O implementador anota o que descobriu da API e do esquema; o revisor, os erros que mais se repetem; o auditor, o que costuma passar despercebido. Isso é mecanismo nativo do Claude Code; ninguém precisa lembrar de usar.
2. **`docs/LICOES.md`.** No fecho de cada fase, o orquestrador e o auditor registram ali o que deu errado e que regra teria evitado, com evidência. Lição que aparece **duas vezes** vira regra: uma linha no agente responsável, ou uma skill nova em `.claude/skills/kaizen-<nome>/` escrita com a skill `writing-skills`. Lição que aparece uma vez fica esperando.

Limites, para o método não crescer sozinho até virar peso morto:

- Mudança de método só acontece no fecho de fase, num commit separado começando com `método:`, e no máximo **três por fase**, cada uma citando a lição que a justifica.
- A IA pode mudar `.claude/agents/*.md`, `docs/AUTONOMIA.md` e criar skills do projeto. **Nunca** mexe em `.claude/settings.json`, `.claude/hooks/`, `CLAUDE.md` nem `OBJETIVO.md`: as travas mecânicas e o destino são só do dono.
- Regra nova tem de ser verificável por quem lê o relatório ("teste com valor de referência" é regra; "seja cuidadoso" não é).
- Regra que não evitou nada em duas fases seguidas é removida no fecho da terceira. Método também acumula código a mais.

## Organização do repositório

- `OBJETIVO.md` — o destino; só o dono muda.
- `docs/AUTONOMIA.md` — este arquivo.
- `docs/DECISOES.md` — decisões autônomas, por fase.
- `docs/LICOES.md` — o que deu errado e que regra evitaria; alimenta o fecho de fase.
- `.claude/agent-memory/` — memória de cada subagente entre sessões (entra no git).
- `docs/superpowers/specs/` e `plans/` — spec e plano de cada fase (formato das skills).
- `docs/fases/FASE-N-auditoria.md` e `FASE-N-relatorio.md` — o que o dono lê ao fim de cada fase.
- Código em pastas com nome pelo papel (`tradutor-erp-novo/`, `rotina/`, `api/`, `app/`), decididas na spec da fase que as cria. Nada fora delas sem uma linha em `docs/DECISOES.md`.

## Fases de app (5a em diante)

- **Skills oficiais do Flutter.** No início da Fase 5a, antes do brainstorming, instalar em `.claude/skills/` as skills mantidas pela equipe do Flutter (repositório `flutter/agent-plugins`, instalação com `npx skills add flutter/agent-plugins --skill '*' --agent claude-code --yes`; cobrem layout responsivo/adaptativo, estado, testes de widget e acessibilidade) e as do Dart (`dart-lang/skills`). Copiar as regras de `flutter/agent-plugins/rules` para uma seção do `CLAUDE.md` é tarefa da 5a, registrada em `DECISOES.md`. Não instalar antes: cada skill ocupa contexto em toda sessão.
- **Auditor visual.** Quando houver tela, entra um quarto subagente, `auditor-visual`, que roda o app nos dois formatos (janela compacta e expandida), tira captura de cada tela e confere a lista de checagem da Fase 5a olhando o PNG. A forma mais simples se decide na spec da 5b, entre: app Flutter web aberto no Chrome com captura pelo `chrome-devtools-mcp` redimensionando a janela, ou `integration_test` do Flutter salvando capturas em `build/capturas/` em dois tamanhos. Não se adianta essa decisão agora.
