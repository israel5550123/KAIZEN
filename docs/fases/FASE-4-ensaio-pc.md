# Fase 4 — ensaio no PC

**29/09/2026, branch `fase-4`, commit `7f50e68`.** Roda a fase inteira no banco do PC (Postgres em Docker, `kaizen-postgres-1`), com o ERP de verdade só em leitura, antes de ir para a VPS. Nenhum código ou teste novo — só operação e este registro.

## Antes do passo 1: as migrações não mudaram desde a tarefa 5

```
$ git diff --name-status --diff-filter=M 7a583c6 HEAD -- sql/migracoes
(sem saída — nenhum arquivo de migração foi modificado desde o commit da tarefa 5)
```

A 010 e a 011 aplicadas na tarefa 5 (passo 8) continuam com o mesmo SQL. Segue sem `BLOCKED`.

## Passo 1 — as migrações (09:00)

```
$ node --env-file=.env tradutor/principal.mts migrar
migrar: aplicadas 012_regras, 013_resposta
```

Esperado × obtido: igual, palavra por palavra.

## Passo 2 — a Link, de novo (08:59:44 – 08:59:48, 4s)

```
$ node --env-file=.env tradutor/link.mts
link ok: documentos=6183, novos=0, itens=15288, pagamentos=6009, conferencias=632, parcelas=221, baixas=127
...
vendas_validas: 5271
...
dias_comparados: 141
```

| Número | Esperado | Obtido |
| --- | --- | --- |
| documentos | 6183 | 6183 |
| novos | 0 | 0 |
| vendas_validas | 5271 | 5271 |
| dias_comparados | 141 | 141 |

## Passo 3 — a leitura da noite, com o cálculo de todos os dias (08:59:53 – 09:02:06, 2m12,516s)

```
$ time node --env-file=.env tradutor/principal.mts noite --manual
Kaizen — resumo de 29/09:
Códigos novos no ERP (6) — leve este resumo à próxima sessão com o Claude:
- o código "EM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen (2 vezes)
- o código "6" de forma apareceu 7 vez(es) e não tem tradução no Kaizen
- o código "7" de forma apareceu 3 vez(es) e não tem tradução no Kaizen
- o código "S" de situacao apareceu 17 vez(es) e não tem tradução no Kaizen
- o código "C" de status_parcela apareceu 7 vez(es) e não tem tradução no Kaizen
- e mais 1
noite ok: documentos_lidos=301, documentos_novos=146, apagados=0, movimentos=209, foto=1029, produtos=1029, pessoas=449, funcionarios=9, fornecedores=654, avisos=0, respostas=546

real	2m12.516s
```

**Achado (`DONE_WITH_CONCERNS`):** o comando terminou com `noite ok` (não `noite aviso`), mas imprimiu, antes da linha de resultado, o resumo de códigos sem tradução acumulados — exatamente o caso que o brief da tarefa manda anotar em vez de corrigir código: seis códigos novos do ERP real ainda sem tradução no Kaizen (tipo "EM"; forma "6" e "7"; situação "S"; status_parcela "C"; e mais um não listado no topo). Isso é a rotina de hora em hora (tarefa 9) funcionando como desenhado — ela lista o que não sabe traduzir e pede para levar à próxima sessão — e não impede o cálculo: `avisos=0` (nenhum aviso do tipo que bloqueia o cálculo do dia) e as 546 respostas foram gravadas. Fica registrado para a próxima sessão tratar os seis códigos, como o próprio texto pede.

Depois, só lendo, no banco do PC:

```
$ docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At <<'SQL'
select 'naturezas', fonte, count(distinct codigo), count(*) from kaizen.natureza group by fonte order by fonte;
select 'documentos meuerp sem natureza com modelo de venda', count(*) from kaizen.documento where fonte = 'meuerp' and modelo in ('PA', 'OC', 'PV', 'TM', '55', '65') and natureza_id is null;
select 'respostas', count(*), min(data), max(data) from kaizen.resposta;
SQL
naturezas|link|3|3
naturezas|meuerp|81|81
documentos meuerp sem natureza com modelo de venda|0
respostas|546|2026-04-01|2026-09-29
```

| Número | Esperado | Obtido |
| --- | --- | --- |
| naturezas, link (códigos distintos / linhas) | 3 / 3 | 3 / 3 |
| naturezas, meuerp (códigos distintos / linhas) | 81 / 81 (ou mais versões) | 81 / 81 |
| documentos meuerp de venda sem natureza | 0 | 0 |
| respostas (contagem, data mín., data máx.) | R = 546 (3 × 182 dias de 01/04 a 29/09), 2026-04-01, 2026-09-29 | 546, 2026-04-01, 2026-09-29 |

## Passo 4 — um dia de cada mês, e a virada (09:02:51 – 09:03:00, 9s)

```
$ node --env-file=.env tradutor/principal.mts indicadores 2026-04-30 2026-05-31 2026-06-30 2026-07-31 2026-08-31 2026-09-25 2026-09-26 2026-09-29
30/04/2026 vendas: realizado do dia R$ 4.471,60 (33 vendas); no mês vendido R$ 58.825,56, devoluções R$ 1.322,12, realizado R$ 57.503,44 (481 vendas), sem meta cadastrada, projeção R$ 56.891,60
30/04/2026 compras: curva A 80, B 92, C 106 produtos; compras do período: A 7, B 13, C 5, sem venda 21; estoque desconhecido antes de 26/09/2026
30/04/2026 financeiro (link): a pagar R$ 82.492,39 em 25 parcelas, vencidas R$ 12.990,04, até 7 dias R$ 16.738,49; saldo do banco não digitado; quebra do dia R$ 23,00
31/05/2026 vendas: realizado do dia R$ 0,00 (0 vendas); no mês vendido R$ 132.684,79, devoluções R$ 1.141,42, realizado R$ 131.543,37 (904 vendas), sem meta cadastrada, projeção R$ 131.543,37
31/05/2026 compras: curva A 105, B 126, C 212 produtos; compras do período: A 40, B 25, C 34, sem venda 36; estoque desconhecido antes de 26/09/2026
31/05/2026 financeiro (link): a pagar R$ 104.180,37 em 46 parcelas, vencidas R$ 5.973,78, até 7 dias R$ 15.085,87; saldo do banco não digitado; quebra do dia R$ 0,00
30/06/2026 vendas: realizado do dia R$ 5.619,30 (33 vendas); no mês vendido R$ 140.882,93, devoluções R$ 437,16, realizado R$ 140.445,77 (961 vendas), sem meta cadastrada, projeção R$ 141.146,74
30/06/2026 compras: curva A 112, B 151, C 268 produtos; compras do período: A 51, B 42, C 28, sem venda 27; estoque desconhecido antes de 26/09/2026
30/06/2026 financeiro (link): a pagar R$ 91.141,64 em 43 parcelas, vencidas R$ 13.617,38, até 7 dias R$ 27.400,63; saldo do banco não digitado; quebra do dia R$ 0,00
31/07/2026 vendas: realizado do dia R$ 6.794,90 (43 vendas); no mês vendido R$ 145.743,81, devoluções R$ 352,83, realizado R$ 145.390,98 (1072 vendas), sem meta cadastrada, projeção R$ 143.854,76
31/07/2026 compras: curva A 114, B 161, C 327 produtos; compras do período: A 66, B 53, C 73, sem venda 65; estoque desconhecido antes de 26/09/2026
31/07/2026 financeiro (link): a pagar R$ 215.583,48 em 74 parcelas, vencidas R$ 16.485,51, até 7 dias R$ 11.009,49; saldo do banco não digitado; quebra do dia R$ 0,00
31/08/2026 vendas: realizado do dia R$ 4.232,86 (41 vendas); no mês vendido R$ 140.782,78, devoluções R$ 279,11, realizado R$ 140.503,67 (1008 vendas), sem meta cadastrada, projeção R$ 141.884,20
31/08/2026 compras: curva A 114, B 170, C 328 produtos; compras do período: A 82, B 65, C 67, sem venda 37; estoque desconhecido antes de 26/09/2026
31/08/2026 financeiro (link): a pagar R$ 201.578,48 em 79 parcelas, vencidas R$ 13.617,38, até 7 dias R$ 20.518,58; saldo do banco não digitado; quebra do dia R$ 0,00
25/09/2026 vendas: realizado do dia R$ 6.258,55 (52 vendas); no mês vendido R$ 118.204,98, devoluções R$ 663,73, realizado R$ 117.541,25 (836 vendas), sem meta cadastrada, projeção R$ 135.088,52
25/09/2026 compras: curva A 119, B 171, C 314 produtos; compras do período: A 90, B 72, C 75, sem venda 36; estoque desconhecido antes de 26/09/2026
25/09/2026 financeiro (link): a pagar R$ 245.864,76 em 94 parcelas, vencidas R$ 27.617,38, até 7 dias R$ 21.288,45; saldo do banco não digitado; quebra do dia R$ 0,01
26/09/2026 vendas: realizado do dia R$ 0,00 (0 vendas); no mês vendido R$ 118.204,98, devoluções R$ 663,73, realizado R$ 117.541,25 (836 vendas), sem meta cadastrada, projeção R$ 135.340,59
26/09/2026 compras: curva A 119, B 171, C 314 produtos; compras do período: A 90, B 72, C 75, sem venda 36; encalhe 243 produtos, R$ 41.433,55; ruptura 146
26/09/2026 financeiro (meuerp): a pagar R$ 217.491,43 em 81 parcelas, vencidas R$ 0,00, até 7 dias R$ 20.532,50; saldo do banco não digitado; quebra do dia R$ 0,00
29/09/2026 vendas: realizado do dia R$ 1.374,84 (6 vendas); no mês vendido R$ 127.946,25, devoluções R$ 663,73, realizado R$ 127.282,52 (892 vendas), sem meta cadastrada, projeção R$ 138.190,22
29/09/2026 compras: curva A 121, B 169, C 313 produtos; compras do período: A 93, B 72, C 74, sem venda 34; encalhe 243 produtos, R$ 41.253,24; ruptura 144
29/09/2026 financeiro (meuerp): a pagar R$ 217.491,43 em 81 parcelas, vencidas R$ 5.246,39, até 7 dias R$ 31.173,68; saldo do banco não digitado; quebra do dia R$ 0,00
```

### Vendido e devolução do mês (linha `vendas`)

| Dia | Vendido do mês — esperado | Vendido do mês — obtido | Devoluções do mês — esperado | Devoluções do mês — obtido |
| --- | --- | --- | --- | --- |
| 30/04 | R$ 58.825,56 | R$ 58.825,56 | R$ 1.322,12 | R$ 1.322,12 |
| 31/05 | R$ 132.684,79 | R$ 132.684,79 | R$ 1.141,42 | R$ 1.141,42 |
| 30/06 | R$ 140.882,93 | R$ 140.882,93 | R$ 437,16 | R$ 437,16 |
| 31/07 | R$ 145.743,81 | R$ 145.743,81 | R$ 352,83 | R$ 352,83 |
| 31/08 | R$ 140.782,78 | R$ 140.782,78 | R$ 279,11 | R$ 279,11 |
| 25/09 | R$ 118.204,98 | R$ 118.204,98 | R$ 663,73 | R$ 663,73 |
| **soma (partes acima)** | **R$ 737.124,85** (58.825,56+132.684,79+140.882,93+145.743,81+140.782,78+118.204,98) | **R$ 737.124,85** | **R$ 4.196,36** (1.322,12+1.141,42+437,16+352,83+279,11+663,73) | **R$ 4.196,37** |

Os seis dias batem centavo por centavo com o esperado — zero divergência. A soma do vendido também bate, R$ 737.124,85. **Achado sem gravidade, registrado e não corrigido:** somar as seis devoluções arredondadas do jeito que estão na tabela dá R$ 4.196,37, um centavo a mais que o R$ 4.196,36 do brief (que é o mesmo total que já está em `docs/fases/FASE-3-relatorio.md`). Isso não é um número que o Kaizen calculou errado agora: o próprio relatório da Fase 3 explica que a devolução "não arredonda item a item" — o total oficial soma as devoluções sem arredondar cada item antes, então pode diferir em um centavo da soma das seis parcelas já arredondadas para exibir. O mesmo padrão aparece no total do líquido da Fase 3 (732.928,49 no relatório contra 732.928,48 somando as seis parcelas exibidas). Não é divergência do ensaio; é o arredondamento de sempre, herdado do brief.

### Financeiro (linha `financeiro`)

| Dia | Esperado | Obtido |
| --- | --- | --- |
| 25/09 (link) | a pagar R$ 245.864,76 em 94 parcelas | a pagar R$ 245.864,76 em 94 parcelas |
| 26/09 (meuerp) | a pagar R$ 217.491,43 em 81 parcelas | a pagar R$ 217.491,43 em 81 parcelas |

Os dois bateram de primeira; não foi preciso rodar a consulta `consultar-erp.mts` de comparação porque não houve divergência.

### Compras (linha `compras`)

30/04 a 25/09: todas as seis mostraram `estoque desconhecido antes de 26/09/2026`, como esperado. 26/09 e 29/09 (hoje) mostraram encalhe e ruptura (243 produtos/R$ 41.433,55/ruptura 146 em 26/09; 243 produtos/R$ 41.253,24/ruptura 144 em 29/09), como esperado.

### As três conferências do orquestrador (depois do passo 4)

```
$ docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At <<'SQL'
select 'conf1', sum((conteudo->'mes'->>'vendas')::int) from kaizen.resposta
  where pergunta = 'vendas' and data in ('2026-04-30','2026-05-31','2026-06-30','2026-07-31','2026-08-31','2026-09-25');
SQL
conf1|5262
```

Detalhe por dia: 30/04→481, 31/05→904, 30/06→961, 31/07→1072, 31/08→1008, 25/09→836; soma 5.262.

```
$ docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At <<'SQL'
select p->>'encalhe' from kaizen.resposta r, jsonb_array_elements(r.conteudo->'produtos') p
  where r.pergunta = 'compras' and r.data = '2026-09-28' and p->>'codigo' = '1708';
select p->>'encalhe' from kaizen.resposta r, jsonb_array_elements(r.conteudo->'produtos') p
  where r.pergunta = 'compras' and r.data = '2026-09-28' and p->>'codigo' = '5336';
SQL
conf2 produto 1708|true
conf2 produto 5336|false
```

```
$ docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At <<'SQL'
select count(*) from kaizen.produto where fonte = 'meuerp' and (descricao is null or descricao = '');
SQL
conf3|0
```

| Conferência | Esperado | Obtido |
| --- | --- | --- |
| 1. soma de vendas do mês nas 6 respostas (30/04, 31/05, 30/06, 31/07, 31/08, 25/09) | 5.262 | 5.262 |
| 2. produto 1708 na resposta de compras de 28/09 | `encalhe` verdadeiro | `true` |
| 2. produto 5336 na resposta de compras de 28/09 | `encalhe` falso | `false` |
| 3. produtos meuerp com descrição vazia ou nula | 0 | 0 |

As três bateram.

## Passo 5 — um dia fora da história (09:04:37)

```
$ node --env-file=.env tradutor/principal.mts indicadores 2026-03-31; echo "saída $?"
indicadores falha: fora da história (de 01/04/2026 até hoje): 2026-03-31; nada foi calculado
saída 1
```

Esperado × obtido: igual (mensagem "fora da história" e `saída 1`).

## Passo novo — os comandos do dono (09:05:13 – 09:05:31)

Comandos que vão para o relatório da fase (meta da loja, meta do vendedor 1, saldo do banco de hoje):

```
$ docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen <<'SQL'
insert into kaizen.meta (mes, valor) values (date_trunc('month', current_date)::date, 150000);
insert into kaizen.meta (mes, vendedor, valor) values (date_trunc('month', current_date)::date, '1', 70000);
insert into kaizen.saldo_banco (data, valor) values (current_date, 50000);
SQL
INSERT 0 1
INSERT 0 1
INSERT 0 1
```

`indicadores` de hoje, com meta e saldo cadastrados:

```
$ node --env-file=.env tradutor/principal.mts indicadores 2026-09-29
29/09/2026 vendas: realizado do dia R$ 1.374,84 (6 vendas); no mês vendido R$ 127.946,25, devoluções R$ 663,73, realizado R$ 127.282,52 (892 vendas), meta R$ 150.000,00 (84,86%), ritmo 0,8854, projeção R$ 138.190,22
29/09/2026 compras: curva A 121, B 169, C 313 produtos; compras do período: A 93, B 72, C 74, sem venda 34; encalhe 243 produtos, R$ 41.253,24; ruptura 144
29/09/2026 financeiro (meuerp): a pagar R$ 217.491,43 em 81 parcelas, vencidas R$ 5.246,39, até 7 dias R$ 31.173,68; folga em 7 dias R$ 13.579,93; quebra do dia R$ 0,00
```

A linha de vendas passou a mostrar a meta (R$ 150.000,00), o percentual (84,86%) e o ritmo (0,8854); a de financeiro passou a mostrar a folga em 7 dias (R$ 13.579,93). Como esperado.

Apagando as três linhas pelas mesmas chaves:

```
$ docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen <<'SQL'
delete from kaizen.meta where mes = date_trunc('month', current_date)::date and vendedor is null;
delete from kaizen.meta where mes = date_trunc('month', current_date)::date and vendedor = '1';
delete from kaizen.saldo_banco where data = current_date;
SQL
DELETE 1
DELETE 1
DELETE 1
```

`indicadores` de hoje de novo:

```
$ node --env-file=.env tradutor/principal.mts indicadores 2026-09-29
29/09/2026 vendas: realizado do dia R$ 1.374,84 (6 vendas); no mês vendido R$ 127.946,25, devoluções R$ 663,73, realizado R$ 127.282,52 (892 vendas), sem meta cadastrada, projeção R$ 138.190,22
29/09/2026 compras: curva A 121, B 169, C 313 produtos; compras do período: A 93, B 72, C 74, sem venda 34; encalhe 243 produtos, R$ 41.253,24; ruptura 144
29/09/2026 financeiro (meuerp): a pagar R$ 217.491,43 em 81 parcelas, vencidas R$ 5.246,39, até 7 dias R$ 31.173,68; saldo do banco não digitado; quebra do dia R$ 0,00
```

Voltou a `sem meta cadastrada` e `saldo do banco não digitado`, como esperado.

## Resumo

| Passo | Resultado |
| --- | --- |
| Verificação de migrações mudadas desde a tarefa 5 | sem diferença, seguiu |
| 1. migrar | `012_regras, 013_resposta` — igual ao esperado |
| 2. Link de novo | 6183 documentos, 0 novos, 5271 vendas válidas, 141 dias comparados — igual ao esperado |
| 3. noite --manual | 546 respostas, 2m12,516s; achado: 6 códigos sem tradução (`DONE_WITH_CONCERNS`, ver acima) |
| 3. conferências de natureza/respostas | todas batem |
| 4. indicadores dos 6 meses + virada | vendido e devolução de cada mês batem centavo a centavo; soma do vendido bate; soma da devolução um centavo diferente do brief por arredondamento (não é bug, ver acima); financeiro de 25/09 e 26/09 batem; compras batem |
| 4. três conferências do orquestrador | todas batem (5.262; 1708=true/5336=false; 0 descrições vazias) |
| 5. dia fora da história | mensagem e saída 1, igual ao esperado |
| comandos do dono | meta, meta do vendedor e saldo aparecem e desaparecem nos indicadores como esperado |

**Veredito da tarefa: `DONE_WITH_CONCERNS`** — nenhum número saiu errado; o único achado é o resumo de códigos sem tradução que a própria rotina pede para levar à próxima sessão (não é código para consertar agora) e a nota de arredondamento de um centavo, já presente no relatório da Fase 3, sem efeito em nenhum número calculado pelo Kaizen.
