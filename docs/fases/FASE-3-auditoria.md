# Fase 3 — auditoria da fase inteira

**APROVADA.** O "pronto quando" da Fase 3 no `OBJETIVO.md` e os itens (1) a (5) e (8) que o dono pediu para o fecho em 28/09 têm evidência que eu mesmo produzi:

- a cópia final está no `erp` do Kaizen do PC, conferida e intocada desde a restauração;
- a história de abril a 25/09 está no esquema `kaizen`, ligada ao cadastro do ERP novo, com zero diferença dia a dia nos 141 dias com venda;
- a venda de junho e o pedido de 28/09 saem na mesma forma;
- os testes passam, 325 de 325.

Falta uma frase errada no relatório e os passos de fecho da lista abaixo; nenhum deles muda um número gravado.

Esta auditoria substitui a da construção (commit `7ed7b6f`), que deixou a tarefa 11 aberta de propósito. Foi feita em 28/09/2026, das 11h50 às 12h05 (Fortaleza), na branch `fase-3-final`, último commit `0329ccb`, ainda não mesclada em `main`.

O que eu fiz:

- rodei `npm run verificar`;
- no banco `kaizen`, só SELECT, como o usuário `kaizen`;
- no `link_postgres` (usuário `link`, banco `prumo`), só SELECT;
- li o arquivo da cópia com `sha256sum` e `pg_restore --list`, que não se conecta a banco nenhum;
- fiz 3 consultas só de leitura ao ERP novo, por `ferramentas/consultar-erp.mts`.

Não rodei `tradutor/link.mts` nem `tradutor/principal.mts`, não abri o `.env` e não fiz commit.

## O que falta ou deve ser corrigido

**Antes da mescla:**

1. **Corrigir uma frase do relatório.** Em `docs/fases/FASE-3-relatorio.md`, linha 38, está escrito "Pagamentos das vendas: 6.009". Os 6.009 são todos os pagamentos da Link. Conferido no banco:

   | Onde está o pagamento | Pagamentos |
   | --- | --- |
   | vendas válidas | 5.397 |
   | vendas canceladas | 35 |
   | sangrias | 420 |
   | suprimentos | 157 |
   | **total** | **6.009** |

   "Pagamentos das vendas" são 5.432. A frase seguinte está certa: em 5.270 das 5.271 vendas válidas, os pagamentos somam a venda menos a devolução.

**Fecho, depois desta auditoria, como o plano manda (tarefa 11, passo 5):**

2. **Linha `complete` da tarefa 11 no ledger.** Hoje ela não existe: a última linha da tarefa 11 é a do passo 5, e as tarefas 12 e 13 já têm `complete`. O ledger (`.superpowers/sdd/`) é ignorado pelo git, então a linha só existe no disco.
3. **Mesclar e commitar.**
   - Mesclar `fase-3-final` em `main`, com `npm run verificar` (325), e enviar ao GitHub.
   - Commitar a memória do implementador, que está sem commit: `.claude/agent-memory/implementador/MEMORY.md` (mudado) e `project_superpowers_sdd_gitignore.md` (novo). O `docs/AUTONOMIA.md` manda a memória para o git.
4. **Registrar uma lição em `docs/LICOES.md`: frase de composição errada, três vezes nesta fase.**
   - "As 7 decisões", na auditoria da construção.
   - "As outras 16", que eram 14, na revisão final.
   - "Pagamentos das vendas", nesta auditoria.

   Pelo `docs/AUTONOMIA.md`, lição repetida vira regra. A fase usou 2 das 3 mudanças de método (`20d3400` e `f51b99d`). Uma regra que se pode verificar: toda frase "X são A, B e C" do relatório aponta para a consulta que a produziu, no registro da rodada.

**Do dono:**

5. **Commitar a sua mudança no `OBJETIVO.md`** (a natureza de operação e o tipo do cadastro). Dois textos da branch citam "a decisão do dono de 28/09 no `OBJETIVO.md`": a entrada de `docs/DECISOES.md` sobre orçamento e pré-venda, e o `/goal` da Fase 4. Sem o commit, `main` cita uma decisão que não está em `main`.

**Remover:** nada.

## 1. Testes

- **O comando:** `npm run verificar`, rodado por mim.
  - `tsc -p .` terminou sem erro.
  - Resultado: "rodou 325 testes, esperados 325". Passaram 325; falharam 0; 0 pulados, 0 por fazer, 0 cancelados.
  - Os testes duraram 89,3 s (1 min 33 s com o `tsc`), e o comando saiu com 0.
- **A contagem do plano:** 280 da Fase 2, mais 44 da construção, mais 1 da tarefa 12, dá 325. É o que `testes-esperados.txt` diz.
- **Os 45 testes da Link, por arquivo:**

  | Arquivo | Testes |
  | --- | --- |
  | `link-migracao` | 6 (5 da construção e 1 da tarefa 12) |
  | `link-falsa` | 5 |
  | `link-ligar` | 7 |
  | `link-vendas` | 11 |
  | `link-caixa` | 3 |
  | `link-contas` | 4 |
  | `link-comando` | 7 |
  | `link-copia` | 2 |

- **Valor de referência concreto: 45 de 45.**
  - Os 44 da construção foram conferidos na auditoria anterior.
  - Nesta branch mudaram 5 arquivos de teste, todos da Link.
  - O teste novo confere o `999007`, o `link:900001` e a `de_para` com 24 linhas e 1 falha.
  - Os 4 testes ajustados conferem códigos, nomes (`CONSUMIDOR FINAL`, `CLIENTE 1`), contagens (36 pessoas, 38 linhas de resumo) e a linha "1 vendas válidas, R$ 10,00".
  - Nenhum `.skip`, `.only` ou `todo`.
- **Os 280 da Fase 2:** nenhum arquivo deles muda na branch (`git diff main...fase-3-final`).
- **Limite:** alguns testes dependem da ordem dentro do arquivo, e isso está escrito nos comentários.
  - Em `link-vendas.test.mts`, "a falha vira `link:`..." tem de rodar antes de "uma decisão nova...".
  - O teste da 008 tem de ser o último de `link-migracao.test.mts`.

  Trocar a ordem quebra o teste, não o produto.

## 2. O "pronto quando" do `OBJETIVO.md`

> A história de abril a 25/09 está no esquema próprio, ligada ao cadastro novo, e uma venda de junho e uma de outubro têm a mesma forma.

### 2.1 A história no esquema próprio

Está no Kaizen do PC: **6.183 documentos da Link**, de 02/04 às 19h32 a 25/09 às 17h48min23.

| Tipo | Situação | Documentos |
| --- | --- | --- |
| pedido | emitido | 5.271 |
| pedido | cancelado | 34 |
| orçamento | emitido | 4 |
| fechamento de caixa | emitido | 158 |
| sangria | emitido | 420 |
| suprimento | emitido | 157 |
| conta a pagar | emitido | 88 |
| nota de entrada | emitido | 51 |

- **Itens de venda:** 14.704 linhas de item vendido. São 14.606 nas vendas válidas, 89 nas canceladas e 9 nos orçamentos.
- **Outros itens:** 54 devolvidos e 530 de nota de entrada.
- **Pagamentos:** 6.009 (composição no item 1 da lista acima).
- **Conferência de caixa:** 632 linhas.
- **Contas a pagar:**
  - 221 parcelas, R$ 625.935,51, das quais 94 pendentes (R$ 245.864,76);
  - 127 baixas, R$ 380.070,75.
- **O resumo do comando confere:** rodei agora `sql/link/resumo.sql`, que só lê. As 47 linhas são iguais às do resumo da rodada 2.

**Na VPS, a história ainda não está.** Ela chega lá na Fase 4, pelo mesmo comando. Isso está na spec (13, "A VPS"), no `docs/AUTONOMIA.md` ("até a Fase 3, a VPS é do dono") e no item (3) do `/goal` da Fase 4.

### 2.2 Ligada ao cadastro novo

- Nenhuma venda válida tem cliente `link:`.
- Nenhum item de venda válida tem produto `link:`.
- 10 itens têm vendedor `link:`. São 5 vendas, R$ 300,60, dos usuários de teste 7 e 8, que o dono mandou ignorar.
- **Os códigos do cadastro novo existem:** conferi todo código citado pelos documentos da Link que não é `link:`, e nenhum falta no cadastro do ERP novo:
  - 362 pessoas: 343 clientes e 19 fornecedores;
  - 784 produtos;
  - 3 funcionários.
- **Vendas sem cliente:** 31 vendas válidas (R$ 2.339,00), como a Link as gravou.

### 2.3 A mesma forma

Rodei `sql/kaizen/ficha-venda.sql` para dois documentos:

- o 2508: a negociação 1992 da Link, de 17/06, venda 2124 na tela da Link;
- o 24855: o pedido 196 do ERP novo, de 28/09 às 09h07.

As duas fichas saíram iguais, byte a byte, às gravadas às 09h10 em `C:\Projetos\link-copias\ficha-2508.json` e `ficha-24855.json`.

- **O que é igual nas duas:**
  - `pedido`, `emitido`, `saida`, `recebe`;
  - os itens de sentido `saida`, com produto e vendedor no código do cadastro novo (vendedores `1` e `999005`, com nome);
  - as formas no mesmo vocabulário (`pix` e `dinheiro`).
- **O que muda é o fato:** valores, produtos, datas e cliente.
- **"Outubro" virou "28/09 em diante":** é o `/goal` do dono, e está em `docs/DECISOES.md` (28/09).

## 3. O que o dono pediu para o fecho (28/09)

### (1) A cópia final: conferida, restaurada, intocada

| Conferência | Obtido por mim |
| --- | --- |
| sha256 de `C:\Users\Israel\Documents\erp-link-2026-09-28.dump` | `449ea8aa005ef7a9e76b3aa28ee596309201b3406fa6a9c6a8d061a76233c1ef`, igual ao esperado |
| sha256 da cópia em `C:\Projetos\link-copias\` e de `/tmp/erp-final.dump` no container | o mesmo |
| `pg_restore --list` | 26 `TABLE DATA erp`, 26 `TABLE erp`, 1 `SCHEMA erp`, 0 entradas de outro esquema |
| Quando o arquivo foi tirado | 28/09 às 03h28min59 UTC (00h28 em Fortaleza), do banco `prumo` |
| Negociações no `erp` e a última | 5.309, a última em 25/09 às 17h48min23 |
| Tabelas no `erp` | 26 |
| Turno 190 | fechado em 25/09 às 17h50min04 |
| Parcelas de conta a pagar fora de `2.x` (a consulta do plano) | 0 |
| O usuário `kaizen` no `erp` | sem CREATE, 0 permissões além de SELECT, SELECT nas 26 tabelas, dono de nenhuma; o dono do esquema é `postgres` |

**A restauração só trocou o `erp`.** As migrações 001 a 005 do esquema `kaizen` continuam com a data de 27/09 às 20h44, e os 6.155 documentos da cópia antiga, com o `visto_em` das 05h34. O `--clean` não apagou o `kaizen`.

**A trava de cópia pela metade passou:**

- as 20 tabelas que o comando lê estão cheias; a única vazia do `erp` é `negociacao_parcela`, que não está na lista das 119 colunas;
- `sql/link/referencias.sql`, rodado agora, dá 0 nas 6 ligações;
- as duas rodadas terminaram com `link ok` (`final-rodada-1.txt` e `final-rodada-2.txt`).

**Nada foi gravado no `erp` depois da restauração:**

- os contadores de escrita do esquema `erp` são `ins=75236 upd=0 del=0`;
- 75.236 é a soma exata das linhas das 26 tabelas restauradas;
- rodei agora a impressão digital (`erp-impressao.sql`: contagem e md5 de cada tabela) e ela é idêntica à de `final-erp-depois-restauracao.txt` e à de `final-erp-no-fim.txt`.

**Nada foi gravado no `link_postgres`:**

- agora: `tabelas=26 ins=74920 upd=0 del=0`, e 5.282 negociações, a última em 25/09 às 11h51min03;
- é o que dizem `final-link-postgres-antes.txt` e `-depois.txt`;
- o servidor está no ar desde 24/09 às 20h59 UTC, sem reinício.

### (2) A `de_para` com a resposta do dono

- **As linhas da Link:** 23 decisões e 10 falhas.
- **As 10 falhas são as que o dono mandou ignorar:**
  - os funcionários 1, 7 e 8;
  - a pessoa 900001 (FORNECEDOR PADRÃO);
  - os produtos 1993, 2396, 2758, 5218, 5239 e 5264, todos com 0 venda válida.

  Nenhuma falha nova apareceu.
- **O cliente de R$ 60,00 ligou:**
  - a pessoa 1 da Link aponta para o `999007`, que existe no cadastro do ERP novo (fonte `meuerp`) como `CONSUMIDOR FINAL`, sem CPF/CNPJ;
  - as duas vendas dele têm pessoa `999007`: a 1073 (1194 na tela, 21/05, R$ 10,00) e a 1730 (1855 na tela, 09/06, R$ 50,00);
  - nenhum documento ficou com `link:1`.
- **A leitura de hora em hora continua funcionando:**
  - a migração 008 entrou no banco às 11h08min36,185;
  - a execução 6 do ERP novo começou 11 milésimos depois, terminou às 11h08min38 com resultado `aviso` e leu 155 documentos;
  - os 6 avisos são códigos novos do ERP novo: formas 6 e 7, situação `S`, status de parcela `C`, tipos `EM` e `MN`; nenhum vem da `de_para`;
  - o teste da 008 passa.
- **Limite:** a prova é uma execução manual e um teste. No PC não há leitura automática.
- **"Ignorado, se não existir":** o `999007` existe. A migração 008 não tem condição; se um dia o `999007` sumir, o comando da Link para, em vez de ignorar. Isso está registrado em `docs/DECISOES.md`, na entrada da resposta do dono.

### (3) O tradutor contra a cópia final

| Número | Cópia antiga | Cópia final (conferido por mim) |
| --- | --- | --- |
| Documentos | 6.155 | 6.183 |
| Vendas válidas | 5.244 | 5.271 |
| Vendas canceladas | 34 | 34 |
| Sangrias | 419 | 420 |
| Itens vendidos | 14.636 | 14.704 |
| Pagamentos | 5.980 | 6.009 |
| Turnos abertos | 3 | 2 (os turnos 3 e 4, de 13/04) |

**A diferença é a tarde de 25/09.** Os 28 documentos novos têm o `visto_em` desta rodada (11h09min03):

- 27 vendas, das 13h53 às 17h48, com 68 itens e R$ 4.288,09;
- 1 sangria, às 17h31;
- 29 pagamentos: 28 das vendas e 1 da sangria.

Só a tarde cita 1 cliente e 2 produtos que a cópia antiga não citava: o cliente 211 e os produtos 2186 e 1743, e os três ligaram pela regra. O turno 190 foi atualizado no lugar (documento 6304, com o `visto_em` das 05h34). A conferência dele: dinheiro calculado 892,99 e informado 893,00; Pix 3.945,06; cartão 1.751,00. O dia 25/09 inteiro tem 52 vendas, R$ 6.258,55.

**O vendido de abril a 25/09, por mês.** Consulta minha, independente da `meses.sql`: o Kaizen contra o `valor_total_venda` das vendas com caixa ativo da Link.

| Mês | Vendas (Kaizen = Link) | Vendido no Kaizen | Vendido na Link | Devolução no Kaizen | Devolução gravada pela Link | Líquido |
| --- | --- | --- | --- | --- | --- | --- |
| abril | 489 | 58.825,56 | 58.825,56 | 1.322,12 | 1.322,11 | 57.503,44 |
| maio | 905 | 132.684,79 | 132.684,79 | 1.141,42 | 1.141,42 | 131.543,37 |
| junho | 961 | 140.882,93 | 140.882,93 | 437,16 | 437,16 | 140.445,77 |
| julho | 1.072 | 145.743,81 | 145.743,81 | 352,83 | 352,83 | 145.390,98 |
| agosto | 1.008 | 140.782,78 | 140.782,78 | 279,11 | 279,11 | 140.503,67 |
| setembro (até 25/09) | 836 | 118.204,98 | 118.204,98 | 663,73 | 663,72 | 117.541,25 |
| **total** | **5.271** | **737.124,85** | **737.124,85** | **4.196,36** | **4.196,35** | **732.928,49** |

- É a tabela do relatório.
- O centavo de abril e o de setembro vêm da devolução sem arredondar, e o relatório explica.
- **Diferença dia a dia:** rodei `sql/link/comparar.sql` agora e ela devolveu 0 linhas. O Kaizen tem 141 dias com venda válida, e a Link também tem 141.

**Rodar duas vezes não duplica:**

- **Os documentos não foram gravados de novo.**
  - Dos 6.183 documentos da Link, 6.155 têm o `visto_em` de 05h34min15 (a primeira rodada da cópia antiga) e 28 o de 11h09min03 (a primeira rodada da cópia final).
  - O cadastro só da Link (6 produtos, 3 funcionários e a pessoa 900001) tem `lido_em` de 11h09min24, a segunda rodada da cópia final.
  - Portanto, a segunda rodada passou e não gravou nenhum documento de novo.
- **Nenhuma chave de origem repete:** 0 em documento, 0 em item e 0 em pagamento.
- **As rodadas:**
  - a primeira linha da rodada 1 diz `novos=28`, e a da rodada 2, `novos=0`;
  - os dois resumos são iguais, fora a primeira linha;
  - `final-foto-1.txt` é igual a `final-foto-2.txt`.
- **O Kaizen não mudou desde a rodada:** `foto.sql`, rodado agora, dá o mesmo que `final-foto-2.txt`.

### (4) Orçamento e pré-venda no estoque

Três consultas minhas ao ERP novo, só de leitura, por volta das 11h55. As contagens são maiores que as do relatório (10h45) porque o dia corre.

| Modelo | Documentos desde a virada (todos de 28/09) | Itens | Linhas no histórico de estoque | `tipomovimento` | `flagreservaestoque` |
| --- | --- | --- | --- | --- | --- |
| Orçamento (`OC`) | 15 | 50 | 0 | `S` | `F` |
| Pré-venda (`PV`) | 5 | 28 | 0 | `S` | `T` |
| Pedido (`PA`) | 19 | 53 | 53 | `S` | `F` |

- **Os exemplos do relatório:**
  - o orçamento 146 (08h44; produtos 1723 × 12, 1556 × 4 e 1765 × 4) não tem linha de estoque;
  - a pré-venda 143 (08h37; produto 5310 × 2) também não;
  - o pedido 196 levou o produto 5211 de 319 a 315.
- **Reserva:** as 1.029 linhas de `mercadoria_estoque` têm `qtdsaldoreserva` e `qtdsaldoreservaoff` zerados.
- **A resposta do relatório se sustenta:** orçamento e pré-venda não baixam nem reservam estoque.
- **A frase para o suporte** está no relatório, numa frase só, na seção "Orçamento e pré-venda no estoque".

### (5) `npm run verificar`

Passa, com 325 de 325 (seção 1).

### (8) O relatório

`docs/fases/FASE-3-relatorio.md` tem:

- **Os números finais:** conferi um por um contra as minhas consultas, e só a frase do item 1 da lista acima está errada.
- **A lista dos meses para o dono conferir.**
- **O `/goal` da Fase 4 pronto para colar.** O item (1) dele é `publicacao/implantar.sh` como primeira tarefa, com o que o script pode e não pode fazer, como está no `docs/AUTONOMIA.md`.

**Uma observação sobre o `/goal`:** ele pede as três perguntas "para hoje e para um dia passado de cada mês desde abril". O "pronto quando" da Fase 4 diz "qualquer dia passado". Um dia por mês é a amostra da evidência; a regra tem de valer para qualquer dia.

## 4. Código a mais

**Nenhum.** A branch muda 14 arquivos em relação a `main`:

- a migração 008 (tarefa 12, uma linha de dado na `de_para`);
- 5 arquivos de teste da Link (tarefa 12 e a correção da revisão final);
- `testes-esperados.txt`;
- 7 documentos: o relatório, o registro da rodada final, `DECISOES`, `LICOES`, `AUTONOMIA` (commit `método:`), a spec (nota em 7.2) e o plano (tarefas 12 e 13).

`tradutor/link.mts`, `sql/link/` e `sql/erp/` não mudaram. Depois da rodada das 11h09 (código do `7b0caf0`), só mudaram testes e documentos, então a rodada não precisava repetir.

## 5. Regras

- **Escrita no ERP:** nenhuma.
  - A branch não mexe em código que fala com o ERP.
  - A leitura das 11h08 é do tradutor da Fase 2, que só lê.
  - As minhas 3 consultas passaram pela trava `verificarSomenteLeitura`.
- **Esquema `erp`:** a restauração foi feita pelo superusuário, com `-n erp`. A sessão restaurou, e não o dono, por ordem do `/goal` dele; isso está em `docs/DECISOES.md`. Depois disso, nenhuma escrita (seção 3, item 1). O `kaizen` só lê.
- **Regra de negócio no tradutor:** nenhuma nova. A resposta do dono é dado (uma linha na `de_para`), não código.
- **Dependências e serviços:** o `package.json` não mudou, nenhum serviço entrou, e o comando da Link não chama o Telegram.
- **Método:**
  - houve 2 commits `método:` na fase (`20d3400` e `f51b99d`), cada um citando a sua lição; o limite é 3;
  - o `docs/AUTONOMIA.md` só mudou por eles;
  - `OBJETIVO.md`, `CLAUDE.md`, `.claude/settings.json` e os hooks não estão em nenhum commit da branch;
  - a mudança sem commit no `OBJETIVO.md` fica fora da branch, como deve.

## 6. `docs/DECISOES.md`

- **A branch acrescenta 4 entradas:**
  - a resposta do dono à `de_para`;
  - a restauração feita pela sessão;
  - orçamento e pré-venda no estoque;
  - os 6 códigos novos do ERP novo.

  Nenhuma contraria o `OBJETIVO.md` ou a spec.
- **A resposta do dono foi gravada como ele disse.** O "ignorado" ficou como a falha com código `link:`, sem marca nova, e a entrada diz o que muda se ele queria outra coisa. O cliente de R$ 60,00 foi para o `999007`.
- **As três lacunas da auditoria da construção estão preenchidas:** as contas a pagar nas duas fontes, o vendedor pelo primeiro nome e a regra `2.x`, que deu 0 na cópia final.
- **Para a Fase 4, sem entrada ainda.** A decisão nova do dono (as regras decidem pela natureza de operação do ERP) não diz como tratar os 6.183 documentos da Link.
  - Eles não têm natureza de operação.
  - O tipo, o movimento e o financeiro deles vêm da tradução pelo modelo (migração 006).

  É pergunta para a spec da Fase 4, com entrada em `DECISOES.md` lá.

## 7. Organização

- **Quem não lê código entende a fase por quatro arquivos:**
  - `docs/fases/FASE-3-relatorio.md`: os números, o que é do dono, a frase para o suporte e o `/goal` da Fase 4;
  - `docs/fases/FASE-3-rodada-copia-final.md`: cada conferência da rodada, e a diferença para a cópia antiga número por número;
  - `docs/fases/FASE-3-rodada-copia-antiga.md`: as fichas da mesma forma;
  - `docs/DECISOES.md`.
- **Os números batem com as minhas consultas**, fora a frase do item 1 da lista acima.
- **Uma observação para o dono conferir os meses:** as 5.271 "vendas" contam 9 negociações que são só devolução, sem item vendido.
  - São 8 em abril (108, 271, 296, 424, 425, 434, 495 e 507) e 1 em maio (696).
  - A Link conta essas 9 como venda, e o Kaizen bate com ela.
  - A Fase 4 vai contar só o pedido com item vendido: 481 em abril e 904 em maio.
  - O relatório diz isso em "Limites conhecidos", mas não na tabela dos meses.
