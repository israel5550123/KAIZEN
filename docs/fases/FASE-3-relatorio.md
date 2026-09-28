# Fase 3 — relatório

**28/09/2026. A construção da Fase 3 está pronta; falta só a rodada contra a cópia final da Link, que chega ao PC em 29/09.** O tradutor da Link foi feito, testado, revisado e rodado contra a cópia antiga da Link que está no seu PC (a do `link_postgres`, com vendas até 25/09 às 11h51). A história de abril a 25/09 está gravada no Kaizen do PC, ligada ao cadastro do ERP novo. A rodada contra a cópia final é a última tarefa do plano e fica aberta: ela roda numa sessão nova, com o `/goal` do fim deste relatório, depois que você restaurar a cópia final (passo a passo abaixo).

## O que ficou pronto

- **Um comando só**, `node --env-file=.env tradutor/link.mts`, lê a cópia da Link e grava a história no Kaizen, tudo de uma vez ou nada.
  - Ele lê a Link no mesmo banco do Kaizen, como vai ser na VPS, e o usuário do Kaizen só tem permissão de leitura nela: não há como o tradutor mexer na cópia da Link.
  - Rodar duas vezes não duplica nada.
  - Antes de gravar, ele confere a cópia: se faltar uma coluna, se uma tabela vier vazia, se uma venda apontar para um cliente ou vendedor que não está na cópia, se aparecer um código que o Kaizen ainda não sabe traduzir, ou se o total de algum dia não bater com a Link, ele para e diz o motivo, sem gravar nada.
- **Cada documento da Link fica na mesma forma de um documento do ERP novo:** o mesmo tipo (pedido, orçamento, fechamento de caixa, sangria, suprimento, conta a pagar), a mesma situação, as mesmas formas de pagamento, e os códigos de cliente, produto e vendedor do cadastro novo. A Fase 4 vai calcular os indicadores do mesmo jeito para as duas fontes.
- **O valor de cada item é a conta da própria Link**, sem arredondar o resultado. É a única conta que o tradutor faz, e é a que você aprovou na Fase 2.

## Os números, na cópia antiga

**Documentos gravados:** 6.155.

| Tipo | Quantos |
| --- | --- |
| Pedidos (vendas) | 5.278: 5.244 válidas e 34 canceladas |
| Orçamentos | 4 |
| Fechamentos de caixa | 158 (3 turnos abertos: dois de 13/04 que nunca fecharam e o de 25/09, que fecha na cópia final) |
| Sangrias | 419 |
| Suprimentos | 157 |
| Contas a pagar | 88, com 221 parcelas (R$ 625.935,51) e 127 pagamentos (R$ 380.070,75) |
| Notas de entrada | 51 |

- **Itens:** 14.636 vendidos, 54 devolvidos e 530 de nota de entrada.
- **Pagamentos das vendas:** 5.980. Em 5.243 das 5.244 vendas válidas, a soma dos pagamentos é a venda menos a devolução. A exceção é a venda 100, de 15/04: um troco de R$ 0,01 que a Link não gravou em lugar nenhum.
- **Contas a pagar em aberto em 25/09:** 94 parcelas, R$ 245.864,76, o mesmo total das contas que a migração levou ao ERP novo.

**Vendas válidas por mês** (vendido e devolução como no relatório de vendas da Link, que não arredonda a devolução item a item):

| Mês | Vendas | Vendido | Devolução | Líquido |
| --- | --- | --- | --- | --- |
| abril | 489 | 58.825,56 | 1.322,12 | 57.503,44 |
| maio | 905 | 132.684,79 | 1.141,42 | 131.543,37 |
| junho | 961 | 140.882,93 | 437,16 | 140.445,77 |
| julho | 1.072 | 145.743,81 | 352,83 | 145.390,98 |
| agosto | 1.008 | 140.782,78 | 279,11 | 140.503,67 |
| setembro (até 25/09 às 11h51) | 809 | 113.916,89 | 663,73 | 113.253,16 |
| **total** | **5.244** | **732.836,76** | **4.196,36** | **728.640,40** |

- Maio e junho são os números que o Prumo conferiu com o relatório de vendas da Link (131.543,37 e 140.445,77).
- O total que a Link grava em cada troca arredonda a devolução item a item; por isso, em abril e em setembro, o líquido "gravado" da Link fica 1 centavo acima (57.503,45 e 113.253,17). O Kaizen segue o relatório, que é o que você confere.
- A comparação por dia, Kaizen contra Link, deu **zero diferença nos 141 dias** com venda.

**Ligação com o cadastro do ERP novo** (só o que os documentos citam):

| O quê | Ligou pela regra | Ligou por decisão | Não ligou |
| --- | --- | --- | --- |
| Produtos (pelo código) | 782 | 0 | 6 |
| Clientes (pelo CPF/CNPJ) | 335 | 7 | 1 |
| Fornecedores (pelo CNPJ) | 19 | 0 | 1 |
| Vendedores (pelo primeiro nome) | 3 (Igor, Daniele, Erleide) | 0 | 3 |

- Todos os produtos das vendas válidas ligaram.
- As 7 "decisões" são o Consumidor Final e 6 clientes sem CPF/CNPJ nos dois cadastros, ligados pelo código e pelo nome (registradas em `docs/DECISOES.md`).
- 31 vendas válidas da Link não têm cliente nenhum (R$ 2.339,00), como a Link as gravou.

**Rodar duas vezes:** a segunda rodada não gravou nenhum documento novo, e a foto de todas as tabelas do Kaizen ficou idêntica à da primeira. Depois das últimas correções do código, rodei de novo duas vezes: a mesma foto.

## A mesma forma: uma venda de junho e uma de 28/09

Às 09h09 de hoje, o tradutor do ERP novo trouxe o primeiro pedido do dia (o pedido 196, das 09h07, R$ 46,00 em dinheiro, 4 unidades do produto 5211, vendedora Daniele). A mesma consulta do Kaizen mostra a venda de junho 1992 da Link (R$ 150,00 no Pix, dois itens, vendedor Igor) e esse pedido **na mesma forma**: os dois são "pedido", "emitido", de saída, que recebe; os itens de saída levam o código do produto e do vendedor do cadastro novo, com o nome; e as formas de pagamento saem no mesmo vocabulário ("pix", "dinheiro"). O que muda entre os dois é só o fato: valor, produto, data e cliente. As duas fichas, lado a lado, estão em `docs/fases/FASE-3-rodada-copia-antiga.md`, seção "A mesma forma".

Uma diferença que o pedido real mostrou, fora das vendas: no ERP novo, o orçamento e a pré-venda saem com movimento de saída; na Link, o orçamento ficou sem movimento (4 orçamentos, de abril e junho). Nenhum número de venda muda, porque orçamento não recebe; está em `docs/DECISOES.md` para a Fase 4 decidir junto com a conferência "a pré-venda reserva estoque?" da Fase 2.

## Testes

- `npm run verificar`: **rodou 324 testes, esperados 324** (eram 280 no fim da Fase 2; a Fase 3 acrescentou 44).
- Os testes da Link usam uma "Link falsa" com 290 linhas reais da cópia antiga, com nomes, CPF e CNPJ inventados, e conferem valores exatos: por exemplo, a venda de junho 1992 soma R$ 150,00 com o desconto repartido entre os itens; a devolução de 21/05 soma R$ 67,764.

## Revisão

- Cada tarefa passou por um revisor independente; 8 de 9 foram aprovadas de primeira, e a da rodada teve uma correção (a hora do registro estava em UTC).
- **A revisão da branch no meio da fase** achou que uma cópia restaurada pela metade seria gravada sem aviso, com vendas sem cliente ou sem vendedor. Virou uma tarefa nova, com a trava e 2 testes.
- **A revisão final** achou que a primeira resposta sua às falhas da `de_para`, gravada do jeito mais simples, pararia a leitura de hora em hora do ERP novo. Virou um teste que impede isso.
- Como foi a segunda fase seguida em que só a revisão da branch inteira achou os problemas importantes, essa revisão no meio da fase virou regra do método (`docs/AUTONOMIA.md`).

## O que é seu

**1. Em 29/09, restaurar a cópia final no Postgres do PC** (no PowerShell, na pasta `C:\Projetos\KAIZEN`):

1. Guarde o arquivo em `C:\Projetos\link-copias\erp-link-2026-09-28.dump` (fora do repositório; a pasta já existe).
2. Confira o arquivo:
   `Get-FileHash C:\Projetos\link-copias\erp-link-2026-09-28.dump -Algorithm SHA256`
   Tem de mostrar `449EA8AA005EF7A9E76B3AA28EE596309201B3406FA6A9C6A8D061A76233C1EF`. Se for outro, pare: o arquivo não é o que saiu da VPS.
3. Copie para dentro do Postgres do Kaizen:
   `docker cp C:\Projetos\link-copias\erp-link-2026-09-28.dump kaizen-postgres-1:/tmp/erp-final.dump`
4. Confira que as 26 tabelas estão no arquivo:
   `docker exec kaizen-postgres-1 pg_restore --list /tmp/erp-final.dump | Select-String "TABLE DATA erp" | Measure-Object`
   Tem de mostrar `Count : 26`.
5. Restaure no lugar da cópia antiga (troca só a cópia da Link dentro do Postgres do Kaizen; o `link_postgres` não é tocado):
   `docker exec kaizen-postgres-1 pg_restore -U postgres -d kaizen --clean --if-exists --no-owner --no-acl /tmp/erp-final.dump`
   Pode aparecer aviso sobre dono ou permissão; não é erro.
6. Dê ao Kaizen a leitura da cópia:
   `docker exec kaizen-postgres-1 psql -U postgres -d kaizen -c "grant usage on schema erp to kaizen" -c "grant select on all tables in schema erp to kaizen"`
   Tem de mostrar `GRANT` duas vezes.
7. Confira:
   `docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -c "select count(*), max(data) from erp.negociacao"`
   Tem de mostrar mais de 5.282 negociações, e a última depois de 25/09 às 11h51.
8. Abra uma sessão nova do Claude Code e cole o `/goal` do fim deste relatório.

**2. Responder as falhas da ligação** (sem pressa). O que não ligou ao cadastro novo ficou com o código da Link, marcado `link:`, e conta no total da loja, mas não num cliente, produto ou vendedor do ERP novo:

| Na Link | Onde aparece | Valor |
| --- | --- | --- |
| Vendedor Israel (usuário 7) | 4 vendas de teste da implantação | R$ 261,00 |
| Vendedor Luis Henrique (usuário 8) | 1 venda de teste | R$ 39,60 |
| Usuário Sistema (1) | só na venda 8, cancelada, e em 2 turnos zerados | — |
| Cliente de código 1 (3D MOVEIS) | 2 vendas | R$ 60,00 |
| FORNECEDOR PADRÃO (fornecedor 1) | 8 contas a pagar | — |
| Produtos 1993, 2396, 2758, 5218, 5239 e 5264 | a venda cancelada 8 e notas de entrada | nenhuma venda válida |

Para cada um, diga aqui ou em `docs/DECISOES.md` se ele deve apontar para um código do ERP novo, ou se fica como está. Uma sessão grava a sua resposta e roda o comando de novo.

**3. Conferir os meses** da tabela de vendas acima com os relatórios de vendas da Link que você tiver guardados. Divergência volta como bug.

**4. Um bug da Fase 2 que apareceu aqui:** os produtos do ERP novo estão no Kaizen com a descrição vazia. A consulta da Fase 2 lê a descrição de uma tabela em que ela está vazia; a certa é outra. Não muda nenhum número; a correção é uma tarefa pequena da conferência da Fase 2.

**5. Na Fase 4:** levar a história da Link ao Kaizen da VPS (com o sync do Prumo parado, dar ao usuário `kaizen` a leitura do esquema `erp` e rodar o mesmo comando lá).

## Limites conhecidos

- Uma negociação só de devolução (9 casos, R$ 1.199,78) fica como pedido sem item vendido; a Fase 4 conta como venda só o pedido com item vendido, para as duas fontes.
- Na cópia final, se um item apontar para um produto que não está na cópia, o comando para sem gravar, mas com a mensagem do banco, e não numa frase.
- Na Link, o fechamento de cartão junta crédito e débito; a quebra de cartão da Link vem junta.

## Decisões tomadas sem você

Estão em `docs/DECISOES.md`, seção "Fase 3", cada uma com o porquê e o que muda se estiver errada. As principais: a Link lida no mesmo banco do Kaizen; os documentos com os códigos do cadastro novo; o prefixo `link:` para o que só existe na Link; a `de_para` com as decisões e as falhas; as 22 decisões de cliente; o valor do item sem arredondar; os sinais dos pagamentos; o que não entrou e por quê (a foto do estoque da Link, as colunas de conta e sinal, a classificação pelas planilhas, as bonificações); e o "28/09 em diante" no lugar de "outubro" no "pronto quando".

## O `/goal` da rodada final

Depois de restaurar a cópia final (passo 1 acima), cole numa sessão nova:

```text
/goal A rodada final da Fase 3 está feita, seguindo docs/AUTONOMIA.md e a tarefa 11 do plano docs/superpowers/plans/2026-09-28-fase3-tradutor-link.md: (1) a cópia final da Link que restaurei no banco kaizen do Postgres do PC foi conferida (26 tabelas, a última venda depois de 25/09 às 11h51, o turno 190 fechado, nenhuma parcela de conta fora das contas 2.x); (2) o comando node --env-file=.env tradutor/link.mts rodou duas vezes com link ok, a segunda sem documento novo e com a mesma foto, e o transcript mostra as contagens, as falhas da de_para e a comparação por dia sem diferença; (3) docs/fases/FASE-3-rodada-copia-final.md explica cada número que mudou em relação à cópia antiga; (4) a tarefa 11 tem linha complete no ledger, a branch fase-3-final foi mesclada em main e enviada ao GitHub, e docs/fases/FASE-3-relatorio.md diz, com os números, que a Fase 3 está pronta. Se a cópia final não estiver restaurada, escreva isso no relatório e pare. Ou pare após 60 turnos e escreva no relatório o que ficou pronto e o que falta.
```

## Próxima fase

A Fase 4 (indicadores e rotina) começa depois de a Fase 2 fechar na VPS (os seis dias de operação) e de a rodada final da Fase 3 passar. O `/goal` dela:

```text
/goal A Fase 4 do OBJETIVO.md está fechada, seguindo docs/AUTONOMIA.md: (1) existe spec em docs/superpowers/specs/ e plano em docs/superpowers/plans/ para a fase, e todas as tarefas do plano têm linha "complete" no ledger; (2) os testes passam (comando e contagem no transcript) e a contagem bate com a esperada no plano; (3) cada item do "pronto quando" da fase tem evidência mostrada no transcript; (4) o subagente auditor-de-fase escreveu docs/fases/FASE-4-auditoria.md com veredito APROVADA; (5) a branch fase-4 foi mesclada em main e enviada ao GitHub; (6) docs/fases/FASE-4-relatorio.md existe, em português, com os números. Ou pare após 200 turnos e escreva em docs/fases/FASE-4-relatorio.md o que ficou pronto e o que falta.
```
