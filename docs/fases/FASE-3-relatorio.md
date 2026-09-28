# Fase 3 — relatório

**28/09/2026. A Fase 3 está pronta.** A história da Link, de abril a 25/09 (o último dia de venda), está gravada no Kaizen do PC a partir da **cópia final**, ligada ao cadastro do ERP novo e na mesma forma dos documentos do ERP novo. A comparação dia a dia com a Link deu **zero diferença nos 141 dias com venda**, e rodar o comando duas vezes não duplicou nada. A sua resposta às falhas da ligação está gravada, e a leitura de hora em hora do ERP novo continua funcionando depois dela.

Os detalhes da rodada final, com cada conferência, estão em `docs/fases/FASE-3-rodada-copia-final.md`; os da rodada contra a cópia antiga, em `docs/fases/FASE-3-rodada-copia-antiga.md`.

## O que ficou pronto

- **Um comando só**, `node --env-file=.env tradutor/link.mts`, lê a cópia da Link e grava a história no Kaizen, tudo de uma vez ou nada.
  - Ele lê a Link no mesmo banco do Kaizen, como vai ser na VPS, e o usuário do Kaizen só tem permissão de leitura nela: não há como o tradutor mexer na cópia da Link.
  - Rodar duas vezes não duplica nada.
  - Antes de gravar, ele confere a cópia: se faltar uma coluna, se uma tabela vier vazia, se uma venda apontar para um cliente ou vendedor que não está na cópia, se aparecer um código que o Kaizen ainda não sabe traduzir, ou se o total de algum dia não bater com a Link, ele para e diz o motivo, sem gravar nada.
- **Cada documento da Link fica na mesma forma de um documento do ERP novo:** o mesmo tipo (pedido, orçamento, fechamento de caixa, sangria, suprimento, conta a pagar), a mesma situação, as mesmas formas de pagamento, e os códigos de cliente, produto e vendedor do cadastro novo. A Fase 4 vai calcular os indicadores do mesmo jeito para as duas fontes.
- **O valor de cada item é a conta da própria Link**, sem arredondar o resultado. É a única conta que o tradutor faz, e é a que você aprovou na Fase 2.

## A cópia final: conferida, restaurada, intocada

- **Conferida antes de usar:** o arquivo `erp-link-2026-09-28.dump` (que chegou em `C:\Users\Israel\Documents` e foi copiado para `C:\Projetos\link-copias`) tem o sha256 esperado, `449ea8aa…c1ef`, e as 26 tabelas da Link, nenhuma de outro esquema. Foi tirado da VPS em 28/09 às 00h28.
- **Restaurada pelo passo a passo** (o de antes deste relatório: `pg_restore -n erp --clean --if-exists --no-owner --no-acl` e a leitura dada ao Kaizen). O resultado: 5.309 negociações (27 a mais que a cópia antiga), a última em 25/09 às 17h48; o turno 190 fechado às 17h50; nenhuma parcela de conta fora das contas `2.x`.
- **A trava de cópia pela metade passou:** as colunas, as 20 tabelas lidas cheias e nenhuma venda apontando para quem não está na cópia.
- **Nada foi gravado depois da restauração:** a impressão digital do esquema `erp` do Kaizen (contagem e conteúdo de cada tabela e os contadores de escrita do Postgres) ficou idêntica do fim da restauração até o fim das rodadas, e o `link_postgres` (a cópia antiga) só recebeu consultas: os contadores de escrita dele são os mesmos de antes.

## Os números finais

**Documentos gravados:** 6.183.

| Tipo | Quantos |
| --- | --- |
| Pedidos (vendas) | 5.305: 5.271 válidas e 34 canceladas |
| Orçamentos | 4 |
| Fechamentos de caixa | 158 (2 turnos abertos: os dois de 13/04 que nunca fecharam) |
| Sangrias | 420 |
| Suprimentos | 157 |
| Contas a pagar | 88, com 221 parcelas (R$ 625.935,51) e 127 pagamentos (R$ 380.070,75) |
| Notas de entrada | 51 |

- **Itens:** 14.704 linhas de item vendido (14.606 nas vendas válidas, 89 nas canceladas e 9 nos orçamentos), 54 devolvidos e 530 de nota de entrada.
- **Pagamentos das vendas:** 6.009. Em 5.270 das 5.271 vendas válidas, a soma dos pagamentos é a venda menos a devolução. A exceção é a negociação 100 (venda 161 na tela da Link), de 15/04: um troco de R$ 0,01 que a Link não gravou em lugar nenhum.
- **Contas a pagar em aberto em 25/09:** 94 parcelas, R$ 245.864,76, o mesmo total das contas que a migração levou ao ERP novo.
- **O turno 190 (25/09, das 07h55 às 17h50):** dinheiro calculado R$ 892,99 e informado R$ 893,00; Pix R$ 3.945,06; cartão R$ 1.751,00.

**O que a cópia final trouxe a mais que a antiga:** a tarde de 25/09. São 27 vendas, das 13h53 às 17h48 (R$ 4.288,09, 68 itens, 28 pagamentos), 1 sangria às 17h31 e o fechamento do turno 190. Nenhum outro dia mudou. As vendas da tarde citam 1 cliente e 2 produtos que a cópia antiga não citava, e os três ligaram pela regra. A tabela número por número está em `FASE-3-rodada-copia-final.md`, seção 6.

### Vendas válidas por mês, para você conferir com os relatórios da Link

Vendido e devolução como no relatório de vendas da Link, que não arredonda a devolução item a item. O vendido de cada mês é igual ao que a Link gravou, centavo por centavo.

| Mês | Vendas | Vendido | Devolução | Líquido |
| --- | --- | --- | --- | --- |
| abril | 489 | 58.825,56 | 1.322,12 | 57.503,44 |
| maio | 905 | 132.684,79 | 1.141,42 | 131.543,37 |
| junho | 961 | 140.882,93 | 437,16 | 140.445,77 |
| julho | 1.072 | 145.743,81 | 352,83 | 145.390,98 |
| agosto | 1.008 | 140.782,78 | 279,11 | 140.503,67 |
| setembro (até 25/09) | 836 | 118.204,98 | 663,73 | 117.541,25 |
| **total** | **5.271** | **737.124,85** | **4.196,36** | **732.928,49** |

- Maio e junho são os números que o Prumo já tinha conferido com o relatório de vendas da Link (131.543,37 e 140.445,77).
- Em abril e em setembro, o total que a Link grava em cada troca arredonda a devolução item a item, e o líquido "gravado" fica 1 centavo acima (57.503,45 e 117.541,26). O Kaizen segue o relatório de vendas, que é o que você confere.
- 25/09 inteiro: 52 vendas, R$ 6.258,55.

**Comparação dia a dia:** Kaizen contra Link, a quantidade de vendas, o vendido e a devolução de cada um dos 141 dias com venda: **zero diferença**.

### Ligação com o cadastro do ERP novo

Só o que os documentos citam:

| O quê | Ligou pela regra | Ligou por decisão | Ficou com o código da Link |
| --- | --- | --- | --- |
| Produtos (pelo código) | 784 | 0 | 6 (ignorados por você) |
| Clientes (pelo CPF/CNPJ) | 336 | 7 | 0 |
| Fornecedores (pelo CNPJ) | 19 | 0 | 1 (ignorado por você) |
| Vendedores (pelo primeiro nome) | 3 (Igor, Daniele, Erleide) | 0 | 3 (ignorados por você) |

- Todos os produtos e todos os clientes das vendas válidas ligaram.
- As 7 "decisões" de cliente são o Consumidor Final (a Link tinha dois códigos que agora vão para o 999007: o Consumidor Final dela e o cliente 1, pela sua resposta), o cliente 10000199 (ligado ao 484, que a migração renumerou) e 5 clientes sem CPF/CNPJ nos dois cadastros, com o mesmo código e o mesmo nome (21, 214, 279, 290 e 409).
- 31 vendas válidas da Link não têm cliente nenhum (R$ 2.339,00), como a Link as gravou.
- 5 vendas de teste (R$ 300,60) ficam com os vendedores Israel e Luis Henrique da Link: contam no total da loja, mas não em nenhum vendedor do ERP novo.

## A sua resposta à ligação

Gravada em `docs/DECISOES.md` e pela migração 008:

- **O cliente de R$ 60,00** (cliente 1 da Link, 3D MOVEIS, 2 vendas: a 1194 e a 1855 na tela da Link) agora é o **Consumidor Final 999007** do ERP novo, que existe.
- **Os 3 usuários de teste** (Sistema, Israel e Luis Henrique), **o FORNECEDOR PADRÃO** e **os 6 produtos sem venda válida** ficam ignorados: continuam com o código da Link. O resumo do comando ainda chama essas 10 de "falha"; qualquer falha fora delas seria nova, e na cópia final não apareceu nenhuma.
- **A leitura de hora em hora do ERP novo continua funcionando:** ela aplica as migrações antes de ler; às 11h08 aplicou a 008 no banco do PC, onde a falha do cliente 1 já estava gravada, e terminou normalmente (155 documentos do ERP novo lidos). Um teste novo prova o mesmo em banco de teste.

## Orçamento e pré-venda no estoque

**Não baixam e não reservam.** Consulta só de leitura ao ERP novo em 28/09, às 10h45: os 12 orçamentos do dia (36 itens) e as 3 pré-vendas (23 itens) não gravaram nenhuma linha no histórico de estoque, e nenhum produto da loja tem reserva; os 13 pedidos do dia gravaram 34 linhas, uma por item (o pedido 196, por exemplo, levou o produto 5211 de 319 para 315). Desde a virada, nenhum orçamento ou pré-venda mexeu no estoque. O orçamento da Link, que o Kaizen gravou sem movimento, tem o mesmo efeito; nada muda.

**A frase para o suporte do ERP:**

> No nosso Meu ERP Online, o orçamento (OC) e a pré-venda (PV) são gravados com tipo de movimento de saída, mas não mexem no estoque: em 28/09, 12 orçamentos e 3 pré-vendas (59 itens, por exemplo o orçamento 146 e a pré-venda 143) não gravaram nenhuma linha no histórico de estoque e não deixaram nenhuma reserva, embora as 3 pré-vendas estejam marcadas para reservar estoque (`flagreservaestoque = T`), enquanto os 13 pedidos de venda do dia baixaram o saldo item a item; isso é o funcionamento esperado, ou a pré-venda deveria reservar o estoque?

## A mesma forma: uma venda de junho e uma de 28/09

A venda de junho 1992 da Link (negociação interna 1992, venda 2124 na tela da Link; R$ 150,00 no Pix, dois itens, vendedor Igor) e o pedido 196 do ERP novo (28/09, 09h07, R$ 46,00 em dinheiro, vendedora Daniele) saem **na mesma forma** pela mesma consulta: os dois são "pedido", "emitido", de saída, que recebe; os itens de saída levam o código do produto e do vendedor do cadastro novo, com o nome; e as formas de pagamento saem no mesmo vocabulário ("pix", "dinheiro"). O que muda entre os dois é só o fato. As duas fichas estão em `docs/fases/FASE-3-rodada-copia-antiga.md`, seção "A mesma forma".

## Testes

- `npm run verificar`: **rodou 325 testes, esperados 325** (eram 280 no fim da Fase 2; a construção da Fase 3 acrescentou 44 e a sua resposta à ligação, 1).
- Os testes da Link usam uma "Link falsa" com 290 linhas reais da cópia antiga, com nomes, CPF e CNPJ inventados, e conferem valores exatos: por exemplo, a venda de junho 1992 soma R$ 150,00 com o desconto repartido entre os itens; a devolução de 21/05 soma R$ 67,764.

## Revisão

- Cada tarefa passou por um revisor independente; 9 de 10 foram aprovadas de primeira, e a da rodada da cópia antiga teve uma correção (a hora do registro estava em UTC). A tarefa da sua resposta (migração 008) foi aprovada de primeira.
- **A revisão da branch no meio da fase** achou que uma cópia restaurada pela metade seria gravada sem aviso. Virou uma trava com 2 testes, e ela passou na cópia final.
- **A revisão final** achou que uma resposta sua à ligação, gravada do jeito mais simples, pararia a leitura de hora em hora do ERP novo. Virou um teste que impede isso, e a migração 008 seguiu essa regra.

## O que é seu

1. **Conferir os meses** da tabela acima com os relatórios de vendas da Link que você tiver guardados. Divergência volta como bug, com o número esperado e o obtido.
2. **Levar a frase ao suporte do ERP** (seção "Orçamento e pré-venda no estoque").
3. **Um bug da Fase 2 que apareceu aqui:** os produtos do ERP novo estão no Kaizen com a descrição vazia. A consulta da Fase 2 lê a descrição de uma tabela em que ela está vazia; a certa é outra. Não muda nenhum número; a correção é uma tarefa pequena da conferência da Fase 2.
4. **Códigos novos no ERP novo:** a operação de 28/09 trouxe 6 códigos que o Kaizen ainda não traduz (formas 6 e 7, situação `S`, status de parcela `C`, tipos `EM` e `MN`). O tradutor avisou e seguiu. Quem fizer a conferência da Fase 2 decide o que é cada um (`docs/DECISOES.md`, 28/09).
5. **Antes da Fase 4:** fechar a Fase 2 na VPS (os seis dias de operação) e, com o sync do Prumo parado, dar ao usuário `kaizen` a leitura do esquema `erp` no Postgres da VPS, com os mesmos dois `grant` usados no PC (`grant usage on schema erp to kaizen` e `grant select on all tables in schema erp to kaizen`). A Fase 4 leva a história da Link ao Kaizen da VPS com o mesmo comando.

## Limites conhecidos

- Uma negociação só de devolução (9 casos, R$ 1.199,78) fica como pedido sem item vendido; a Fase 4 conta como venda só o pedido com item vendido, para as duas fontes.
- Se um item apontar para um produto que não está na cópia, o comando para sem gravar, mas com a mensagem do banco, e não numa frase.
- Na Link, o fechamento de cartão junta crédito e débito; a quebra de cartão da Link vem junta.
- As contas a pagar abertas em 25/09 estão nas duas fontes (a Link e a migração ao ERP novo); a Fase 4 usa cada fonte só no seu período, senão conta a dívida duas vezes.

## Decisões tomadas sem você

Estão em `docs/DECISOES.md`, seção "Fase 3", cada uma com o porquê e o que muda se estiver errada. As principais: a Link lida no mesmo banco do Kaizen; os documentos com os códigos do cadastro novo; o prefixo `link:` para o que só existe na Link; a `de_para` com as decisões e as falhas; as 22 decisões de cliente; o valor do item sem arredondar; os sinais dos pagamentos; o que não entrou e por quê; o "28/09 em diante" no lugar de "outubro" no "pronto quando". Desta última sessão: como "ignorado" foi gravado (a falha fica com o código da Link, sem marca nova), a restauração da cópia final feita pela sessão (o seu `/goal` mandou) e a resposta sobre o estoque, que fecha a pergunta do orçamento.

## Próxima fase

A Fase 4 (indicadores e rotina) começa depois de a Fase 2 fechar na VPS e de você dar a leitura do `erp` ao `kaizen` na VPS (item 5 acima). A primeira tarefa dela é o script `publicacao/implantar.sh`, a única porta do agente para a VPS (`docs/AUTONOMIA.md`, seção "Acesso à VPS"). O `/goal`, para colar numa sessão nova:

```text
/goal A Fase 4 do OBJETIVO.md está fechada, seguindo docs/AUTONOMIA.md e a decisão do dono de 28/09 no OBJETIVO.md (o comportamento de cada tipo de documento vem da natureza de operação do ERP, não de uma lista no código): (1) a primeira tarefa do plano é o script publicacao/implantar.sh, como manda a seção "Acesso à VPS" do AUTONOMIA.md (ele só envia os arquivos da stack kaizen, roda docker stack deploy da stack kaizen, lê o log dos serviços dela e roda as migrações do esquema kaizen; nada da stack prumo, do esquema erp, de volumes ou de segredos); com o script aprovado pelo revisor, a regra única Bash(bash publicacao/implantar.sh*) e a equivalente PowerShell(...) entram no allow do .claude/settings.json, e a mudança vai para docs/DECISOES.md; (2) existe spec em docs/superpowers/specs/ e plano em docs/superpowers/plans/ para a fase, e todas as tarefas do plano têm linha "complete" no ledger; (3) a história da Link está no Kaizen da VPS com os números do PC (6.183 documentos da Link, 5.271 vendas válidas, R$ 737.124,85 vendidos de abril a 25/09) e zero diferença na comparação por dia; (4) os testes passam (comando e contagem no transcript) e a contagem bate com a esperada no plano (a Fase 3 fechou com 325); (5) cada item do "pronto quando" da fase tem evidência mostrada no transcript: as três perguntas (vendas, compras, financeiro) calculadas na VPS para hoje e para um dia passado de cada mês desde abril, e o aviso ao dono quando a rotina falha; (6) o subagente auditor-de-fase escreveu docs/fases/FASE-4-auditoria.md com veredito APROVADA; (7) a branch fase-4 foi mesclada em main e enviada ao GitHub; (8) docs/fases/FASE-4-relatorio.md existe, em português, com os números e o /goal da Fase 5a. Ou pare após 200 turnos e escreva em docs/fases/FASE-4-relatorio.md o que ficou pronto e o que falta.
```
