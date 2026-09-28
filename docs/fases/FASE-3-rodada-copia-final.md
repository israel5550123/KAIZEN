# Fase 3 — rodada contra a cópia final da Link

**28/09/2026, das 10h38 às 11h15 (Fortaleza). Branch `fase-3-final`, commit `7b0caf0`** (a resposta do dono à `de_para`).

A cópia final chegou ao PC em 28/09, às 10h30, em `C:\Users\Israel\Documents\erp-link-2026-09-28.dump`, e foi copiada para `C:\Projetos\link-copias\erp-link-2026-09-28.dump` (fora do repositório), como diz o passo a passo do relatório. O `/goal` do dono mandou esta sessão fazer a restauração.

## 1. A cópia, conferida antes de usar

| Conferência | Esperado | Obtido |
| --- | --- | --- |
| sha256 do arquivo (nas duas pastas e dentro do container) | `449ea8aa005ef7a9e76b3aa28ee596309201b3406fa6a9c6a8d061a76233c1ef` | igual |
| Tabelas com dados no arquivo (`pg_restore --list`, `TABLE DATA erp`) | 26 | 26 |
| Entradas do arquivo fora do esquema `erp` | 0 | 0 (1 esquema, 26 tabelas, 26 dados) |
| Arquivo tirado em | depois de 25/09 | 28/09, 00h28 (Fortaleza), do banco `prumo` da VPS |

## 2. A restauração, pelo passo a passo do relatório

Passos 3 a 7 do passo a passo do relatório (na versão do commit `0336cc3`; este fecho reescreveu o relatório), no Postgres do Kaizen do PC (`kaizen-postgres-1`, banco `kaizen`): `docker cp`, `pg_restore -U postgres -d kaizen -n erp --clean --if-exists --no-owner --no-acl` (saída 0, sem aviso), `grant usage` e `grant select` ao usuário `kaizen` (`GRANT` duas vezes).

| Conferência (tarefa 11, passo 1) | Esperado | Obtido |
| --- | --- | --- |
| Negociações e a última | mais de 5.282, a última depois de 25/09 às 11h51 | 5.309, a última em 25/09 às 17h48min23 |
| Tabelas no esquema `erp` | 26 | 26 |
| Turno 190 | fechado | fechado em 25/09 às 17h50min04 |
| Parcelas de conta a pagar fora de `2.x` | 0 | 0 |
| O usuário `kaizen` pode escrever no `erp` | não | não (dono do esquema: `postgres`) |

**A trava de cópia pela metade passou:** o comando da Link confere, antes de abrir a transação, as 119 colunas, que nenhuma das 20 tabelas lidas está vazia e que nenhuma linha aponta para cliente, vendedor ou fornecedor que não está na cópia. As duas rodadas abaixo terminaram com `link ok`; com qualquer uma dessas falhas, o comando teria parado com `link falhou` sem gravar.

**A cópia final contra a antiga, tabela a tabela** (contagem e md5 do conteúdo de cada tabela; a antiga lida no `link_postgres`, só com SELECT):

| Tabela | Antiga | Final | Diferença |
| --- | --- | --- | --- |
| `negociacao` (vendas e orçamentos) | 5.282 | 5.309 | +27 |
| `caixa` | 5.278 | 5.305 | +27 |
| `caixa_parcela` (pagamentos do caixa) | 5.383 | 5.411 | +28 |
| `negociacao_item_vendido` | 14.636 | 14.704 | +68 |
| `negociacao_item_vendido_cancelado` | 731 | 734 | +3 |
| `pc_lancamento` e `pc_lancamento_fonte` | 11.359 | 11.413 | +54 |
| `pc_lancamento_parcela` | 11.616 | 11.671 | +55 |
| `caixa_fechamento` | 158 | 158 | 0 (o 190 passou de aberto a fechado) |
| `cliente`, `produto`, `pc_itens` | 417, 1.409, 228 | iguais | 0 (só campos atualizados) |
| as outras 14 | — | iguais | 0, conteúdo idêntico |

## 3. A resposta do dono à `de_para`, e a leitura de hora em hora depois dela

A migração 008 (`sql/migracoes/008_de_para_link_resposta_dono.sql`) liga o cliente 1 da Link ao Consumidor Final `999007` do ERP novo; as outras 10 falhas ficam como estão (`docs/DECISOES.md`, 28/09). Ela entrou no banco do PC pela própria leitura de hora em hora do ERP novo, que aplica as migrações antes de ler, com a falha do cliente 1 já gravada pela rodada da cópia antiga:

```
antes: pessoa 1 → link:1, pessoa 900001 → link:900001
hora aviso: documentos_lidos=155, documentos_novos=96, apagados=0, movimentos=41, foto=1029, produtos=1029, pessoas=449, funcionarios=9, fornecedores=654, avisos=6
saida=0
migrações: 007_de_para_link.sql, 008_de_para_link_resposta_dono.sql
depois: pessoa 1 → 999007, pessoa 900001 → link:900001
```

(A linha "migrações" mostra as duas últimas do banco: a 007 entrou às 05h31 de 28/09, na construção; a 008, às 11h08.) A leitura das 11h08 terminou com saída 0 e resultado `aviso`. Os 6 avisos são códigos novos da operação real de 28/09 no ERP novo (formas 6 e 7, situação `S`, status de parcela `C`, tipos `EM` e `MN`), assunto da conferência da Fase 2; nenhum vem da `de_para`. O teste "a resposta do dono (008) entra num banco em que a falha do cliente 1 já está gravada, e a leitura de hora em hora aplica as migrações sem erro" (`tradutor/link-migracao.test.mts`) prova o mesmo em banco de teste.

O cadastro `link:1` (3D MOVEIS, fonte `link`), gravado pela rodada da cópia antiga, continua no Kaizen do PC sem nenhum documento, porque o cadastro só da Link nunca se apaga. No Kaizen da VPS, que vai rodar a Link já com a 008, ele não vai existir: na comparação PC × VPS da Fase 4, 1 pessoa a menos, nenhum documento diferente.

## 4. As duas rodadas

Primeira linha da rodada 1 (11h09):
```
link ok: documentos=6183, novos=28, itens=15288, pagamentos=6009, conferencias=632, parcelas=221, baixas=127
```

Primeira linha da rodada 2:
```
link ok: documentos=6183, novos=0, itens=15288, pagamentos=6009, conferencias=632, parcelas=221, baixas=127
```

Código de saída 0 nas duas. Resumo inteiro da rodada 1 (nomes de pessoa física trocados por "nome removido"):
```
documentos: 6183
documentos:conta_pagar: 88
documentos:fechamento_caixa: 158
documentos:nota_entrada: 51
documentos:orcamento: 4
documentos:pedido: 5305
documentos:sangria: 420
documentos:suprimento: 157
orcamentos: 4
vendas_canceladas: 34
vendas_validas: 5271
vendas_validas_sem_cliente: 31
itens_de_nota: 530
itens_devolvidos: 54
itens_vendidos: 14704
pagamentos: 6009
pagamentos_batem: 5270 de 5271 vendas válidas somam venda − devolução
pagamentos_nao_batem: negociação 100: pagamentos R$ 336,79, venda − devolução R$ 336,78
conferencia_linhas: 632
fechamentos: 158
turnos_abertos: 2
baixas: 127, R$ 380.070,75
parcelas: 221, R$ 625.935,51
parcelas_pendentes: 94, R$ 245.864,76
razao_fora: (sem obs) (orientação false): 129, R$ 380.185,75
razao_fora: Custo mercadoria devolvida referente ao código da venda: N (orientação true): 43, R$ 2.510,19
razao_fora: Custo mercadoria vendida referente ao código da venda: N (orientação false): 5151, R$ 425.636,17
razao_fora: Fechamento de Caixa (orientação true): 154, R$ 87.822,21
razao_fora: Venda - Caixa. Lançamento automático. (orientação false): 14, R$ 1.512,55
razao_fora: Venda - Caixa. Lançamento automático. (orientação true): 5257, R$ 776.409,02
ligacoes:cliente: regra 336, decisão 7, falha 0
ligacoes:fornecedor: regra 19, decisão 0, falha 1
ligacoes:produto: regra 784, decisão 0, falha 6
ligacoes:vendedor: regra 3, decisão 0, falha 3
vendas_com_falha:cliente: 0 vendas válidas, R$ 0,00
vendas_com_falha:vendedor: 5 vendas válidas, R$ 300,60
falha: funcionario 1 → link:1 (Sistema): 1 documentos, 0 vendas válidas, R$ 0,00
falha: funcionario 7 → link:7 (nome removido): 4 documentos, 4 vendas válidas, R$ 261,00
falha: funcionario 8 → link:8 (nome removido): 1 documentos, 1 vendas válidas, R$ 39,60
falha: pessoa 900001 → link:900001 (FORNECEDOR PADRÃO): 8 documentos, 0 vendas válidas, R$ 0,00
falha: produto 1993 → link:1993 (Acabamento P/espelho Cabeça Chata Branco Toro): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 2396 → link:2396 (Batente Silicone 10mm Cartela C/ 50 Toro): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 2758 → link:2758 (Fonte Driver Slim 36W 12V 2A Bivolt Renna): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 5218 → link:5218 (FITA EMPACOTAMENTO 48MM X 45M TRANSP): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 5239 → link:5239 (Fonte Driver Slim 120W 12V 3A Bivolt Metalnox): 2 documentos, 0 vendas válidas, R$ 0,00
falha: produto 5264 → link:5264 (BOMBA PERIFERICA 1/2CV 220V): 1 documentos, 0 vendas válidas, R$ 0,00
dias_comparados: 141
```

As 10 linhas `falha` são as 10 que o dono mandou ignorar; nenhuma falha nova apareceu na cópia final. Os `itens_vendidos` são todas as linhas de item vendido da Link: 14.606 nas vendas válidas, 89 nas 34 canceladas e 9 nos 4 orçamentos. Os números de negociação (1073, 1730, 100) são os internos da Link; na tela da Link, as vendas são 1194, 1855 e 161.

## 5. Rodar duas vezes não duplica

A foto do Kaizen inteiro (a mesma consulta da rodada antiga, `C:\Projetos\link-copias\foto.sql`) depois da rodada 1 e depois da rodada 2:

```
          tabela           | linhas |               md5
---------------------------+--------+----------------------------------
 baixa                     |    129 | 0de8973d3fc30691fa8b8a51a3966413
 conferencia_caixa         |    642 | 05c1fbb31138930f3c0e7ce56fa0c312
 de_para                   |     33 | c22e038e51bde1bfbb8678b250bce635
 documento                 |   6338 | 5830cb505ff8c87913676cda50c04e8b
 documento (id e visto_em) |   6338 | e9fd661f2efb1b363fe5ad5083374703
 documento_item            |  15434 | c0af78f94a010fd8150dd2cdf6a86604
 documento_pagamento       |   6078 | c4651c19ccd42e7eaa31745e18438b6e
 funcionario               |     12 | a35546096888d6ead1c71fdab37bba85
 parcela                   |    317 | 4543ef512bdf2ffb0a64bac3c32c1dc9
 pessoa                    |    451 | adee0b8a53ba66b54d5f97dc08c33967
 produto                   |   1035 | 71d9109647ae2fe540bc584fc0b4195b
 traducao                  |    117 | a51879e3f10fdbe7e09dc46aadbb59b0
```

O `diff` entre as duas fotos não achou nenhuma diferença, e o `diff` entre os dois resumos (sem a primeira linha, que muda só em `novos`) também não. **Rodar duas vezes não duplica: as fotos da primeira e da segunda rodada são iguais.** A foto inclui os documentos do ERP novo (155 lidos até 11h08), por isso passa dos 6.183 da Link.

E os documentos que a cópia antiga já tinha não foram apagados e gravados de novo: dos 6.183 documentos da Link, 6.155 continuam com o `visto_em` da primeira rodada da cópia antiga (28/09, 05h34) e 28 têm o desta rodada (11h09). O fechamento do turno 190 é um dos 6.155: foi atualizado no lugar (ganhou a hora de fechamento e os valores da conferência), com o mesmo `id` e o mesmo `visto_em`.

## 6. O que mudou em relação à rodada da cópia antiga, número por número

| Número | Cópia antiga | Cópia final | Por quê |
| --- | --- | --- | --- |
| Documentos | 6.155 | 6.183 | +27 vendas e +1 sangria, todas de 25/09 depois das 11h51 |
| Pedidos (vendas) | 5.278 | 5.305 | +27 vendas da tarde de 25/09, das 13h53 às 17h48 |
| Vendas válidas | 5.244 | 5.271 | as mesmas 27; nenhuma cancelada |
| Vendas canceladas | 34 | 34 | nenhuma cancelada na tarde |
| Sangrias | 419 | 420 | +1 sangria de 25/09 às 17h31 |
| Itens vendidos | 14.636 | 14.704 | +68 itens das 27 vendas (os 3 itens a mais em `negociacao_item_vendido_cancelado`, em 2 vendas da tarde, são itens tirados antes de fechar a venda; não são venda e não entram, spec, seção 4) |
| Pagamentos | 5.980 | 6.009 | +28 pagamentos do caixa (`caixa_parcela`) das 27 vendas e +1 da sangria (`pc_lancamento`) |
| Pagamentos que somam venda − devolução | 5.243 de 5.244 | 5.270 de 5.271 | as 27 novas batem; a exceção continua a 100 (troco de R$ 0,01) |
| Turnos abertos | 3 | 2 | o turno 190 (25/09, das 07h55 às 17h50) fechou; ficam os dois de 13/04 que nunca fecharam |
| Linhas de conferência de caixa | 632 | 632 | o turno 190 já tinha as 4 linhas; mudaram os valores: dinheiro calculado R$ 892,99 e informado R$ 893,00, Pix R$ 3.945,06, cartão R$ 1.751,00 |
| Contas a pagar, parcelas e baixas | 88, 221, 127 | iguais | nenhuma conta nova na tarde de 25/09 |
| Clientes ligados pela regra | 335 | 336 | o cliente 211, que só aparece numa venda da tarde, ligou pelo CPF/CNPJ |
| Clientes que falham | 1 | 0 | a resposta do dono: o cliente 1 (2 vendas, R$ 60,00, a 1073 de 21/05 e a 1730 de 09/06) agora é o Consumidor Final 999007 |
| Produtos ligados pela regra | 782 | 784 | os produtos 2186 e 1743, que só aparecem na tarde, ligaram pelo código |
| Dias comparados | 141 | 141 | 25/09 já tinha venda na cópia antiga; agora tem as 52 do dia |
| Razão fora dos documentos | — | +25 custo de mercadoria vendida, +1 fechamento de caixa, +27 vendas do caixa | lançamentos automáticos do razão da Link, que só repetem o que já entra pela venda e pelo fechamento (spec, seção 4) |

## 7. As vendas por mês, Kaizen contra Link

Vendido e devolução como no relatório de vendas da Link (a devolução sem arredondar item a item); "Link" é o que a Link gravou em `valor_total_venda` das vendas com caixa ativo.

| Mês | Vendas | Vendido (Kaizen) | Vendido (Link) | Devolução | Líquido |
| --- | --- | --- | --- | --- | --- |
| abril | 489 | 58.825,56 | 58.825,56 | 1.322,12 | 57.503,44 |
| maio | 905 | 132.684,79 | 132.684,79 | 1.141,42 | 131.543,37 |
| junho | 961 | 140.882,93 | 140.882,93 | 437,16 | 140.445,77 |
| julho | 1.072 | 145.743,81 | 145.743,81 | 352,83 | 145.390,98 |
| agosto | 1.008 | 140.782,78 | 140.782,78 | 279,11 | 140.503,67 |
| setembro (até 25/09) | 836 | 118.204,98 | 118.204,98 | 663,73 | 117.541,25 |
| **total** | **5.271** | **737.124,85** | **737.124,85** | **4.196,36** | **732.928,49** |

Abril a agosto não mudaram em relação à cópia antiga. Setembro ganhou as 27 vendas da tarde de 25/09 (R$ 4.288,09). 25/09 inteiro: 52 vendas, R$ 6.258,55, igual à Link.

## 8. A comparação dia a dia

`sql/link/comparar.sql`, rodado de novo depois das duas rodadas: **0 dias com diferença** nos 141 dias com venda válida (quantidade de vendas, vendido e devolução gravada, dia a dia, Kaizen contra Link). O comando já roda essa comparação dentro da transação, antes de gravar; com um dia diferente, nada teria sido gravado.

## 9. Nada foi gravado no `erp` nem no `link_postgres`

- **O `erp` do Kaizen do PC:** a impressão (contagem e md5 de cada uma das 26 tabelas, mais os contadores de escrita do Postgres) tirada logo depois da restauração é idêntica à tirada no fim, depois das duas rodadas: `contadores erp: ins=75236 upd=0 del=0` nas duas. As 75.236 inserções são as da própria restauração.
- **O `link_postgres`:** só recebeu SELECT nesta sessão. Os contadores de escrita do esquema `erp` (`tabelas=26 ins=74920 upd=0 del=0`) e as 5.282 negociações, a última às 11h51 de 25/09, são os mesmos antes da restauração e no fim.
