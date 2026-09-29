# Fase 4 — relatório

**29/09/2026. As três perguntas têm resposta calculada na VPS, para hoje e para qualquer dia desde 01/04/2026, e a rotina que as calcula de hora em hora avisa pelo Telegram quando falha.** Na VPS estão gravadas 546 respostas: 182 dias (01/04 a 29/09) × 3 perguntas. A história da Link está no Kaizen da VPS com os números do PC (6.183 documentos, 5.271 vendas válidas, R$ 737.124,85 vendidos de abril a 25/09) e zero diferença na comparação por dia.

Os registros detalhados: `docs/fases/FASE-4-vps.md` (tudo o que rodou na VPS, com as saídas) e `docs/fases/FASE-4-ensaio-pc.md` (o ensaio no PC, com o ERP de verdade). A spec é `docs/superpowers/specs/2026-09-28-fase4-indicadores-e-rotina-design.md`; o plano, `docs/superpowers/plans/2026-09-28-fase4-indicadores-e-rotina.md`.

**Uma pendência sua, de 1 minuto** (seção "O que é seu", item 1): desde as 9h de 29/09, as leituras de hora em hora terminam `aviso` (não `falha`) porque o ERP começou a usar dois códigos novos que o Kaizen ainda não traduz (a forma de pagamento "Boleto" e um ajuste de custo feito pela formação de preço). A tradução está pronta; o sistema de permissões não deixou o agente aplicá-la sozinho.

## O que ficou pronto

- **As três perguntas**, cada uma calculada para qualquer dia:
  - **Vendas**: vendido, devoluções e realizado do dia e do mês; número de vendas, ticket médio e itens por venda; meta da loja, percentual da meta, dias úteis, ritmo e projeção do mês; os mesmos números por vendedor, com clientes atendidos e o mix por grupo de produto; vendas por hora e por dia da semana; e os itens sem vendedor, que ficam fora do vendido e aparecem como exceção.
  - **Compras e estoque**: curva ABC por valor e por quantidade (90 dias), compras do período por classe da curva ("estou comprando o que gira ou o que encalha?"), estoque, estoque médio, giro, cobertura, encalhe, ruptura, custo zero e estoque negativo, também por grupo, marca e fornecedor.
  - **Financeiro**: contas a pagar em aberto por vencimento (vencidas, até 7 dias, até 30 dias), saldo do banco e folga em 7 e 30 dias, entradas e saídas do dia e do mês, recebíveis de cartão, fluxo previsto de 30 dias, a quebra de cada fechamento de caixa por forma e a gaveta do dia.
- **A rotina**: a leitura de hora em hora que já existia (Fase 2) passou a calcular as três respostas de hoje depois de ler o ERP; a leitura das 22h recalcula todos os dias desde 01/04, para que um feriado ou uma meta digitados depois, ou uma venda que chegou atrasada, apareçam nos dias passados. Se o cálculo falha, a leitura falha e você recebe pelo Telegram: "Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — (motivo). Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem." Na hora seguinte que der certo, chega "voltou a funcionar".
- **O comportamento de cada documento vem da natureza de operação do ERP** (sua decisão de 28/09). O Kaizen lê as 81 naturezas a cada leitura, guarda uma versão a cada mudança e grava no documento a versão da época. É venda o documento cuja natureza é de venda **e** mexe no financeiro (o pedido, natureza 530); o orçamento (520) e a pré-venda (500) são de venda mas não mexem no financeiro, e ficam fora. A troca é a natureza que o próprio ERP aponta como troca na configuração (900). Se você mudar uma natureza no ERP, o Kaizen segue a nova sem mudar código, o que já foi gravado fica com a da época, e o resumo das 22h diz qual mudou e o quê. A Link, que não tinha natureza, ganhou três fixas (pedido, orçamento, nota de entrada).
- **Meta e ritmo por vendedor** valem para quem tem cadastro do tipo vendedor no ERP: hoje Igor e Daniele. A venda de Erleide (tipo "não informado") e dos 3 usuários de teste da Link entra só na loja, numa linha "outros".
- **O que você digita** ganhou tabelas: meta, feriado e saldo do banco. Até o app, digita-se por SQL (os comandos estão no item 2 de "O que é seu"). Já estão gravados como dias sem expediente os três dias de segunda a sábado em que a loja não abriu desde abril: 01/05, 07/09 e 26/09 (a pausa da virada).
- **A descrição dos produtos do ERP novo**, que estava vazia nos 1.029, agora vem do lugar certo do cadastro (o produto 60 é "BROCA CHATA P/ MADEIRA 1" X 6" WORKER"). No PC, zero produtos sem descrição.
- **O `publicacao/implantar.sh`**, a única porta do agente para a VPS. Ele publica na stack `kaizen` a versão de um ramo do GitHub (com as migrações do esquema `kaizen`), lê o log e roda cinco comandos do próprio Kaizen: a carga da Link, a leitura da noite manual, o cálculo de dias pedidos, a lista das execuções e a mensagem de teste do Telegram. Todo argumento é conferido no PC antes de chegar à VPS; ele só roda de hh:10 a hh:50 e nunca das 22h às 22h59; não toca a stack `prumo`, o esquema `erp` (além da leitura que você deu), volumes nem segredos. Depois de aprovado, entrou no `settings.json` a regra única que o libera.

## As três perguntas na VPS (29/09, 13h12)

### Vendas — um dia de cada mês desde abril

| Dia | Vendido do mês | Devoluções | Realizado do mês | Vendas |
| --- | --- | --- | --- | --- |
| 30/04 | R$ 58.825,56 | R$ 1.322,12 | R$ 57.503,44 | 481 |
| 31/05 | R$ 132.684,79 | R$ 1.141,42 | R$ 131.543,37 | 904 |
| 30/06 | R$ 140.882,93 | R$ 437,16 | R$ 140.445,77 | 961 |
| 31/07 | R$ 145.743,81 | R$ 352,83 | R$ 145.390,98 | 1.072 |
| 31/08 | R$ 140.782,78 | R$ 279,11 | R$ 140.503,67 | 1.008 |
| 25/09 | R$ 118.204,98 | R$ 663,73 | R$ 117.541,25 | 836 |
| **soma** | **R$ 737.124,85** | | | **5.262** |

- O vendido de cada mês é o mesmo da Fase 3 e do ensaio no PC, centavo por centavo.
- **As vendas somam 5.262, e não 5.271.** Das 5.271 vendas válidas da Link, 5.262 têm item vendido e 9 só têm item devolvido (uma troca sem compra): a devolução delas (R$ 1.199,79) conta no realizado, mas elas não contam como venda.
- **Hoje, 29/09 (às 13h12):** vendido no mês R$ 130.561,75 = R$ 118.204,98 da Link (01 a 25/09) + R$ 8.366,43 de 28/09 + R$ 3.990,34 de 29/09 até aquela hora; realizado do mês R$ 129.898,02 (910 vendas); projeção de setembro R$ 138.190,22. Sem meta cadastrada, o percentual e o ritmo saem vazios.

### Compras e estoque — hoje (29/09)

- Curva ABC por valor, nos 90 dias até hoje: 121 produtos A, 170 B e 315 C (606 com venda).
- **"Estou comprando o que gira ou o que encalha?":** dos 281 produtos que tiveram entrada de compra nos últimos 90 dias, 95 são curva A, 72 B, 74 C e 40 não tiveram venda no período.
- Encalhe (estoque parado, sem venda em 90 dias, que não é produto novo): 240 produtos, R$ 41.071,56 pelo custo do cadastro. Ruptura (vendeu e está zerado ou negativo): 143 produtos.
- Antes de 26/09 (a virada), o Kaizen não tem estoque: a Link não guardava histórico. Nesses dias saem a curva e as compras por classe, e o estoque aparece como "desconhecido antes de 26/09/2026".

### Financeiro — hoje (29/09) e na virada

- **A pagar hoje: R$ 214.627,22 em 80 parcelas** = 79 parcelas das contas a pagar (R$ 212.245,04) + 1 parcela da nota de entrada 439, de hoje, paga por boleto (R$ 2.382,18). Nenhuma vencida; R$ 31.173,68 vencem até 06/10. Sem saldo do banco digitado, a folga sai vazia.
- **A virada entre as fontes, sem contar a dívida duas vezes:** 25/09 (fonte Link) mostra 94 parcelas, R$ 245.864,76; 26/09 (fonte ERP novo) mostra 79 parcelas, R$ 212.245,04. A diferença, R$ 33.619,72, é a das 15 parcelas que você excluiu no ERP: 13 em 28/09 (R$ 28.373,33) e 2 hoje às 09h33 (R$ 5.246,39, conferidas no ERP: as canceladas passaram de 107, R$ 274.238,09, para 109, R$ 279.484,48). Nenhuma delas foi paga: o Kaizen trata a parcela excluída como se não existisse.
- A quebra de caixa de hoje (até 13h12) é R$ 0,00. A de 28/09 inclui −R$ 93,50 de dois turnos de teste de 26/09 que só foram fechados em 28/09 (fechamentos 138 e 141): é o que a tela do ERP também mostra (item 3 de "O que é seu").

## A história da Link na VPS

`link ok: documentos=6183 … vendas_validas: 5271 … dias_comparados: 141`. Os 6.183 documentos = 5.305 pedidos + 4 orçamentos + 158 fechamentos + 420 sangrias + 157 suprimentos + 88 contas + 51 notas. O comando só termina com `ok` se o total de cada um dos 141 dias com venda bater com a Link: zero diferença. Os números são os mesmos do PC e da Fase 3 (itens, pagamentos, parcelas, baixas e ligações ao cadastro novo).

## As leituras de hora em hora durante a fase

Tabela `kaizen.execucao` da VPS, desde o início da fase (28/09, 19h28):

| Leitura | Resultado | Por quê |
| --- | --- | --- |
| 28/09 22h (noite) | ok | |
| 29/09 08h | ok | a primeira com a versão da fase publicada de madrugada |
| 29/09 09h e 10h | aviso (1) | o código novo da forma 9 (boleto), na nota 439 de 09h00 |
| 29/09 11h, 12h e 13h | aviso (2) | o boleto e o tipo novo `AE` (ajuste de custo, 10h18) |
| 29/09 13h11 (noite manual) | aviso (2) | os mesmos dois códigos |

**Nenhuma falha e nenhuma leitura pulada.** Os avisos não vêm do código da Fase 4: a leitura das 9h já saiu `aviso` rodando a versão da madrugada (`c4045c6`, ainda sem o cálculo), e o texto deles (lido na mesma leitura rodada no PC às 10h24) é `o código "9" de forma … não tem tradução` e `o código "AE" de tipo … não tem tradução`. É o mesmo caso dos 7 códigos de 28/09, que a conferência da Fase 2 traduziu pela migração 009. Com a tradução aplicada (item 1 abaixo), as leituras voltam a `ok` na hora cheia seguinte.

## O aviso quando a rotina falha

- **Provado por teste, com o texto exato:** uma leitura das 14h em que o cálculo falha fica registrada como `falha`, o Telegram recebe exatamente a mensagem de falha do cálculo, e a leitura das 15h, que dá certo, manda "Kaizen: voltou a funcionar às 15h." Se a falha for o banco caindo no meio do cálculo, a mensagem é a do banco fora ("o banco do Kaizen não respondeu"), e não a do cálculo: um teste provoca a queda de verdade no Postgres.
- **Provado na VPS:** `teste-telegram: o Telegram aceitou a mensagem` (13h13), e a leitura da noite manual mandou o resumo dos avisos (`telegram sim`).

## O ensaio no PC

Antes da VPS, a fase inteira rodou no banco do PC com o ERP de verdade: a noite calculou as 546 respostas em 2 min 12 s (na VPS, 1 min 25 s); o vendido de cada mês bateu; as vendas somaram 5.262; o produto 1708 (164 unidades paradas desde abril) saiu em encalhe, e o 5336 (comprado em 26/08) saiu como produto novo, fora do encalhe; e os comandos SQL de meta e saldo, rodados e depois apagados, fizeram aparecer a meta (R$ 150.000,00, 84,86%, ritmo 0,8854) e a folga em 7 dias (R$ 13.579,93) na resposta do dia.

## Testes

- `npm run verificar`: **rodou 424 testes, esperados 424**. Eram 329 no início da fase; a fase acrescentou 95: o script de implantação 12, a descrição do produto 2, a natureza no ERP novo 12, a natureza da Link 3, a base das regras 9, vendas 13, compras 11, financeiro 16, a rotina 12, a correção da revisão do meio da fase 3 e a correção da revisão final 2.
- Todo teste compara com um valor fixo (por exemplo: em 15/06, com meta de R$ 1.000,00 e R$ 384,60 realizados em 13 de 26 dias úteis, o ritmo é 0,7692).
- A suíte passou de ~2 para ~6 a 11 minutos, porque os testes antigos da leitura da noite agora recalculam ~180 dias cada. Aceitei (decisão registrada): na VPS, a noite manual de 29/09 levou 1 min 25 s.

## Revisão

- Cada tarefa passou por um revisor independente. Das 12 tarefas feitas antes do merge, só a primeira publicação teve correção: a mensagem do commit afirmava uma conferência que tinha sido adiada; o registro ganhou uma nota corrigindo. A 13ª (voltar a VPS para `main` e conferir a leitura seguinte) acontece depois do merge.
- A sessão parou três vezes no limite de uso da conta. Os agentes interrompidos foram retomados de onde pararam; o implementador da tarefa 12 parou depois de publicar e carregar a Link na VPS, e o orquestrador fez os passos restantes pelo `implantar.sh` e escreveu o registro, revisado por um revisor independente.
- **A revisão da branch inteira no meio da fase** (quatro lentes, cada achado conferido por um verificador que tentou derrubá-lo): 16 achados, 5 se sustentaram, todos pequenos. Viraram uma correção (o banco caindo no meio do cálculo passa a ser avisado como banco fora) e três testes que faltavam.
- **O auditor de fase** (contexto limpo, 29/09 das 13h50 às 14h20): **APROVADA** (`docs/fases/FASE-4-auditoria.md`). Ele rodou a suíte (424 de 424), refez cinco números por consultas próprias (projeção de 25/09, ruptura e encalhe de 26/09, o a pagar de 25/09, a média das segundas) e leu as execuções na VPS. Pediu, antes do merge, que quatro decisões que estavam só na spec entrassem no `DECISOES.md`; entraram, e a falta virou regra no `AUTONOMIA.md` (segunda fase seguida).
- **A revisão final** (o modelo mais capaz, lendo a branch inteira e conferindo números no banco do PC por consultas próprias): "pronto para merge", sem nada crítico ou importante. Dos 6 menores, quatro viraram correção (os itens sem vendedor passam a ser sinalizados; um documento que chega antes da sua natureza passa a ganhá-la depois; o financeiro ficou de 4 a 10 vezes mais rápido nos fins de mês (de 1,2–1,4 s para 0,13–0,31 s por dia); um texto da spec) e dois ficaram registrados (item 4 de "O que é seu" e as decisões).

## O que é seu

1. **Aprovar a tradução dos dois códigos novos do ERP** (as leituras voltam a `ok`): a forma 9, "Boleto", e o tipo `AE`, o ajuste de custo que a tela de formação de preço grava. O SQL (uma migração nova, `014`) está pronto em `docs/DECISOES.md` (29/09, "Pendência para o dono"). O agente tentou gravar a migração e o sistema de permissões do Claude Code recusou, porque ela vai ao banco de produção na leitura seguinte; pela regra do ambiente, ele não contorna a recusa. Para aplicar: numa sessão, diga que aprova a migração 014; a sessão cria o arquivo com o teste, publica pelo `implantar.sh` e confere a leitura seguinte. Decida junto (o auditor apontou): hoje o boleto só aparece em pagamento de nota de entrada (a nota 439, R$ 2.382,18), que não entra no dinheiro que entrou; se um dia uma **venda** for paga em boleto, a regra do financeiro põe o valor nas entradas do dia da venda, e não no dia em que o boleto é pago.
2. **Digitar as metas de outubro e, quando quiser a folga, o saldo do banco**, até o app existir. No Postgres da VPS (passo 14 do roteiro `publicacao/README.md`, sem a opção só de leitura), trocando os valores:
   - meta da loja: `insert into kaizen.meta (mes, valor) values ('2026-10-01', 150000);`
   - meta de um vendedor (o código do ERP: Igor 1, Daniele 999005): `insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', '1', 70000);`
   - saldo do banco de um dia: `insert into kaizen.saldo_banco (data, valor) values ('2026-10-01', 50000);`
   - um dia em que a loja vai fechar: `insert into kaizen.feriado (data, descricao) values ('2026-10-12', 'Nossa Senhora Aparecida');`
   Só entram os dias em que a loja **fecha**: os feriados de 2026 em que ela abriu (21/04, 04/06, 28/07, 15/08 e 08/09) ficaram de fora de propósito, porque a projeção usa a média dos mesmos dias da semana. A leitura das 22h recalcula todos os dias com o que você digitar.
3. **Conferir no ERP, na conferência da Fase 2:** (a) a quebra de 28/09 inclui −R$ 93,50 dos fechamentos 138 e 141, que fecharam turnos de teste de 26/09 (crédito R$ 30,50 e débito R$ 28,00 no 138; débito R$ 35,00 no 141, com informado zero); (b) no fechamento 419 de 28/09, o Pix calculado pelo ERP é R$ 34,00 maior que os pedidos daquele turno que o Kaizen tem — pode ser um pedido que a leitura não trouxe; (c) a primeira troca real (o sinal do dinheiro devolvido) e a primeira NFC-e (se ela duplicar a venda do pedido, a venda conta duas vezes, porque as duas naturezas são de venda com financeiro).
4. **Duas brechas nas travas, que só você pode fechar** (`docs/DECISOES.md`, 29/09, "Para o dono decidir"): o `guarda-bash` não pega o acesso remoto chamado pelo caminho completo do programa, e a regra do `allow` libera o que estiver no script, que o agente pode editar (a proteção hoje é a revisão obrigatória de toda mudança nele). Nenhuma foi usada.
5. **Conferir os meses** da tabela de vendas com os relatórios da Link que você tiver, e a quebra, a gaveta e o a pagar de 28/09 e 29/09 com as telas do ERP. Divergência volta como bug, com o número esperado e o obtido.

## Decisões tomadas sem você

Estão em `docs/DECISOES.md`, seção "Fase 4", com o porquê e o que muda se estiverem erradas. As principais:
- o `implantar.sh` roda, além de publicar e ler o log, uma lista fechada de cinco comandos do Kaizen (a Link, a noite manual, o cálculo de dias, a lista das execuções, o teste do Telegram), que os itens do `/goal` só provam na VPS;
- a regra única do `allow`, e a forma do PowerShell pelo caminho do Git Bash (no PowerShell deste PC, `bash` é o WSL);
- documento sem natureza (caixa, contas, ajustes) segue o tipo traduzido, porque o ERP só configura natureza nos documentos comerciais;
- 01/05 e 07/09 gravados como dias sem expediente (a loja não abriu; sem o 07/09, a média das segundas antes de 28/09 cairia de R$ 5.516,80 para R$ 4.297,71, e a projeção de cada segunda sairia R$ 1.219 menor);
- o financeiro com uma fonte por dia na posição (a Link até 25/09, o ERP novo a partir de 26/09) e os fluxos somando as duas;
- o estoque só a partir de 26/09 (a Link não guardava histórico; reconstruí-lo seria inventar);
- a soma dos vendedores com "outros" pode diferir do total do mês em até 1 centavo por parte, porque cada parte é arredondada por si (em 25/09, 117.541,26 contra 117.541,25), em vez de calcular "outros" por diferença, que poderia mostrar "outros: −R$ 0,01";
- a quebra de 28/09 com os turnos de teste mantida, porque é o que o ERP mostra;
- a suíte de testes de ~11 minutos aceita;
- a Link com três naturezas próprias (pedido, orçamento, nota de entrada), com o comportamento que ela tinha, em vez das naturezas do ERP novo;
- a pergunta 2 em contagem de produtos por classe, e não em reais (as notas da Link não têm valor);
- a parcela excluída no ERP deixa de contar também nos dias passados: o a pagar de um dia já calculado pode mudar (26/09 foi de 81 para 79 parcelas depois das duas exclusões de hoje), porque o ERP não guarda quando a parcela foi excluída;
- a natureza que muda no ERP é avisada no resumo das 22h, e não na hora.

## Limites conhecidos

- **Antes de 26/09 não há estoque** (giro, cobertura, encalhe, ruptura vazios nesses dias), e as notas de entrada da Link têm quantidade mas não valor: por isso as compras por classe contam produtos, não reais.
- **A projeção é a do `docs/LOJA.md`:** o realizado até a véspera mais a média dos mesmos dias da semana para cada dia útil que falta, contando o próprio dia. Num dia já encerrado, ela não usa o que ele vendeu: a projeção de 31/07, último dia do mês, sai R$ 143.854,76, e não os R$ 145.390,98 realizados.
- **O custo usado no encalhe e no custo zero é o do cadastro atual**, não o da época.
- **Sem meta e sem saldo digitados**, o percentual da meta, o ritmo e a folga saem vazios.

## Próxima fase

A Fase 5a (desenho do app) já está em andamento, em paralelo, por decisão sua de 28/09 (worktree `C:\Projetos\KAIZEN-5a`, branch `fase-5a`). Os números das telas devem apontar para as chaves das respostas desta fase (spec da Fase 4, seção 8), e a lista "A conferir com a Fase 4" do `docs/app/TELAS.md` pode ser fechada contra ela. O `/goal` para fechar a Fase 5a, numa sessão nova:

```text
/goal A Fase 5a do OBJETIVO.md está fechada, seguindo docs/AUTONOMIA.md e a decisão do dono de 28/09 (a 5a roda em paralelo, no worktree C:\Projetos\KAIZEN-5a, branch fase-5a, e só escreve em docs/app/, DECISOES e LICOES): (1) existe spec em docs/superpowers/specs/ e plano em docs/superpowers/plans/ para a fase, com a seção "Alternativas consideradas", e todas as tarefas do plano têm linha "complete" no ledger; (2) docs/app/DESIGN.md, docs/app/TELAS.md e as duas imagens de cada tela (compacta e expandida; só a compacta nas do entregador) existem em docs/app/telas/; (3) cada item do "Destino completo" do OBJETIVO.md tem uma tela ou um lugar numa tela, numa tabela que o auditor confere item por item; (4) cada número de cada tela aponta para um indicador: para as três perguntas, a chave exata da resposta da Fase 4 (spec docs/superpowers/specs/2026-09-28-fase4-indicadores-e-rotina-design.md, seção 8, e a tabela kaizen.resposta); para o que vem depois, a fase e o item do Destino; e a seção "A conferir com a Fase 4" do TELAS.md está resolvida contra a spec da Fase 4 já mesclada em main; (5) existe a lista de checagem visual de até 15 itens, com os itens de cada formato; (6) nenhuma tela passa de três toques até o detalhe, e os números vêm com unidade, comparação e cor só para estado; (7) o subagente auditor-de-fase escreveu docs/fases/FASE-5a-auditoria.md com veredito APROVADA; (8) o origin/main mais recente foi trazido para a fase-5a, os conflitos resolvidos só em docs/, e a fase-5a foi mesclada em main e enviada ao GitHub; (9) docs/fases/FASE-5a-relatorio.md existe, em português, e termina com o /goal da Fase 5b. Ou pare após 200 turnos e escreva em docs/fases/FASE-5a-relatorio.md o que ficou pronto e o que falta.
```
