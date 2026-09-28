# Fase 3 — tradutor do ERP anterior (Link)

**Escrita e aprovada pelo orquestrador em 28/09/2026, em modo autônomo (`docs/AUTONOMIA.md`).** Este documento é a spec da Fase 3 do `OBJETIVO.md`. Ele diz como a história da Link, de abril a 25/09/2026, entra no esquema `kaizen`, ligada ao cadastro do ERP novo. Os números daqui foram medidos na cópia antiga da Link (container `link_postgres` do PC, sincronizada pela última vez em 25/09 às 13h29), só lendo. O plano de implementação vem depois, a partir daqui.

## 1. Resumo

- A Link é lida por SQL, **dentro do mesmo banco do Kaizen**, como fica na VPS: o esquema `erp` (a cópia da Link) ao lado do esquema `kaizen`. No PC, a cópia é restaurada no Postgres do Kaizen.
- Um comando só, `link`, lê o `erp` e grava no `kaizen` numa transação. Ele roda duas vezes sem duplicar. O usuário `kaizen` só tem permissão de leitura no `erp`, então não há como o tradutor mexer na cópia da Link.
- Entram as vendas (com os itens vendidos, os devolvidos e os pagamentos), os orçamentos, os fechamentos de caixa com a conferência, as sangrias e os suprimentos, as contas a pagar com as parcelas e as baixas, e as notas de entrada.
- Cada documento da Link fica **na mesma forma** de um documento do ERP novo: uma venda de junho e uma de 28/09 mostram o mesmo tipo, a mesma situação, o mesmo movimento, o mesmo financeiro, as mesmas formas de pagamento e os mesmos códigos de produto, cliente e vendedor, que são os do cadastro novo.
- **Ligação com o cadastro novo:** produto pelo código; cliente e fornecedor pelo CPF/CNPJ; vendedor pelo primeiro nome. Onde a ligação falha, a tabela `de_para` registra a falha, e o dono pode corrigi-la ali.
- A fase é construída e testada sobre a cópia antiga (decisão do dono de 28/09). A rodada contra a cópia final, que chega ao PC em 29/09, é a última tarefa do plano e fica aberta.

## 2. Decisões

| # | Decisão | Por quê |
| --- | --- | --- |
| 1 | A Link é lida **no mesmo banco** do Kaizen, esquema `erp`, por SQL que roda como o usuário `kaizen`, com permissão só de leitura no `erp`. No PC, a cópia (antiga hoje, final em 29/09) é restaurada por `pg_restore` no banco `kaizen` do Postgres do Kaizen (porta 5434); na VPS, o `erp` já está no banco `prumo`. | É o arranjo da VPS (spec da Fase 2, 5.1). A ligação vira um `join` entre os dois esquemas: nenhum JSON entre bancos, nenhum número passando pelo JavaScript, nenhuma segunda conexão. A permissão só de leitura é a trava mecânica de "nada toca o esquema `erp`". |
| 2 | Os documentos da Link guardam **os códigos do cadastro novo** em `documento.pessoa` e em `documento_item.produto` e `vendedor`. A ligação acontece uma vez, no tradutor. | "Uma venda de junho e uma de outubro têm a mesma forma" (`OBJETIVO.md`, Fase 3). Com os códigos da Link, toda regra da Fase 4 teria de traduzir o código conforme a fonte, uma exceção em cada indicador. |
| 3 | O que só existe na Link entra no cadastro do Kaizen com fonte `link` e o código `link:` seguido do código da Link (por exemplo, `link:7` para o Israel, que não existe no ERP novo). | O código da Link colide com o do ERP novo: o usuário 1 da Link é o "Sistema" e a pessoa 1 do ERP novo é o Igor; o cliente 53 da Link tem o código 1. O prefixo torna o código único e diz de onde ele veio. |
| 4 | A `de_para` guarda dois tipos de linha: as **decisões** (o código aponta para o cadastro do ERP novo) e as **falhas** (o código aponta para `link:`). As decisões nunca são tocadas pelo tradutor e valem antes de qualquer regra. As falhas são refeitas a cada rodada. O dono corrige uma falha trocando o `codigo_kaizen` por um código do ERP novo, e a linha vira decisão. | `OBJETIVO.md`: "onde a ligação falhar, tabela de-para". Uma tabela só, que o dono lê e corrige. |
| 5 | Decisões gravadas por migração: o Consumidor Final (cliente `10000502` da Link) é o `999007` do ERP novo; e os 20 clientes sem CPF/CNPJ que têm o mesmo código e o mesmo nome nos dois cadastros ficam ligados a esse código. | Consumidor Final: `FONTES.md`, linha 142; o CPF que a Link grava para ele não existe no ERP novo, que o guarda sem documento. Os 20: a migração manteve o código do cliente (`PLANO-MIGRACAO.md`, linha 119), os dois lados estão sem documento e o nome é igual. |
| 6 | O valor do item vendido é a conta da Link (decisão 4 da Fase 2): arredondamento meio-par do item e rateio do desconto e do acréscimo da negociação, **sem arredondar o rateio**. O item devolvido é `qtd × preco_liquido_unitario` **arredondado meio-par por linha**. | Medido na cópia antiga: com o rateio sem arredondar, o total arredondado bate com a Link nas 5.282 negociações, nos 141 dias, nos 365 pares de dia e vendedor e nos 6 meses. O devolvido arredondado por linha fecha `valor_total_devolucao` em 43 de 43 negociações; sem arredondar, em 22. Assim a Fase 4 soma itens das duas fontes do mesmo jeito. |
| 7 | Os pagamentos da venda da Link vêm do caixa (`caixa_parcela`) e, para o vale e a devolução em dinheiro, do razão, com o sinal do ERP novo: vale usado é pagamento positivo na forma troca; vale gerado e dinheiro devolvido são pagamentos negativos. | É a forma do ERP novo: o pedido 117 pagou R$ 77,00 com a forma troca, e o troco é uma linha negativa de dinheiro. A soma dos pagamentos de cada venda passa a ser venda − devolução, como no ERP novo. |
| 8 | A situação dos documentos da Link que não têm coluna de situação (fechamento, sangria, suprimento, conta e nota) vem da tradução pelo modelo, como já acontece com o movimento e o financeiro. A visão `documento_negocio` ganha o campo `situacao_pelo_modelo`. | A Link não grava situação nessas tabelas. Sem isso, a Fase 4 precisaria tratar a situação vazia como emitido só para a Link. |
| 9 | O comando da Link não grava em `kaizen.execucao` nem manda Telegram. Ele imprime um resumo e sai com código 0 ou 1. | A Link não muda mais: o comando roda uma vez hoje e uma vez com a cópia final. A tabela `execucao` alimenta o estado do Telegram do ERP novo; uma linha da Link mudaria esse estado. |

### Alternativas consideradas

O critério é o do `OBJETIVO.md`: menos peças, menos regras, menos dependências, nenhuma exceção para funcionar.

- **Ler a Link por uma conexão separada, com JSON, como o ERP novo** (decisão 1). No PC, exigiria a senha do `link_postgres` e duas conexões, e o JSON passaria de um banco para o outro. Perdeu porque a VPS já tem os dois esquemas no mesmo banco: o `join` direto é menos código e é o que roda lá.
- **Guardar nos documentos os códigos crus da Link e ligar na Fase 4, por uma `de_para` completa** (decisão 2). Era a leitura literal da spec da Fase 2 (colunas "Link"). Perdeu porque toda regra da Fase 4 teria de saber a fonte do código; é a exceção que o critério proíbe.
- **Arredondar cada item vendido a 2 casas, com uma regra para o centavo que sobra** (decisão 6). Inventaria uma regra que a Link não tem, e a medição mostrou que ela não é necessária: sem arredondar, todo total do dia, do vendedor e do mês bate.
- **Guardar o item devolvido sem arredondar** (decisão 6, como dizia a spec da Fase 2). Deixaria para a Fase 4 uma regra só da Link: arredondar a devolução linha a linha para bater com a Link.
- **Ligar os clientes sem CPF/CNPJ por uma regra no tradutor (mesmo código e mesmo nome)** (decisão 5). Seria uma segunda regra de ligação, além da do `OBJETIVO.md`. Perdeu para a `de_para`, que é o lugar que o `OBJETIVO.md` dá às ligações que o CPF/CNPJ não faz, e onde a decisão fica visível.
- **Classificar os produtos que só existem na Link pelas planilhas da migração** (spec da Fase 2, 5.3). Exigiria ler `.xlsx`, uma dependência nova, para 6 produtos sem nenhuma venda válida. Eles entram com o grupo e a marca da própria Link.
- **Levar a foto do estoque da Link (`produto.qtd_estoque`) para `estoque_atual`** (spec da Fase 2, 5.2). É a foto de 25/09, anterior ao inventário de 26/09, que já está em `estoque_virada`. Não é o "agora" de nada e nenhum indicador a usa.
- **Registrar a execução da Link em `kaizen.execucao`** (decisão 9). Misturaria uma carga única com o estado da rotina de hora em hora do ERP novo.

## 3. O que o dono faz

**Em 29/09, com a cópia final no PC** (passo a passo no relatório da fase):

1. Guardar `erp-link-2026-09-28.dump` fora da pasta do repositório e conferir o sha256 (`449ea8aa005ef7a9e76b3aa28ee596309201b3406fa6a9c6a8d061a76233c1ef`).
2. Restaurá-lo no banco `kaizen` do Postgres do Kaizen, no lugar da cópia antiga, e dar ao usuário `kaizen` a leitura do `erp`.
3. Abrir uma sessão nova e colar o `/goal` da rodada final.

**Depois da fase, sem pressa:**

4. Ler a lista de falhas da `de_para` no relatório e, se quiser, apontar cada uma para um código do ERP novo.
5. Conferir, com os relatórios da Link que tiver guardados, os totais por mês que o relatório da fase traz.

**Na Fase 4 (VPS):** a história da Link entra no Kaizen da VPS rodando o comando `link` lá, com o sync do Prumo parado e o `erp` legível pelo usuário `kaizen`. Isso é tarefa da Fase 4.

## 4. Escopo

**Entra:**

- as vendas (válidas e canceladas) e os orçamentos, com itens vendidos, itens devolvidos e pagamentos;
- os fechamentos de caixa, com a conferência às cegas por forma;
- as sangrias e os suprimentos;
- as contas a pagar, com as parcelas (conta de destino e sinal incluídos) e as baixas;
- as notas de entrada, com os itens;
- no cadastro do Kaizen, só o que as vendas, contas e notas citam e não existe no ERP novo;
- a `de_para`, com as decisões e as falhas;
- a conferência por dia, Kaizen contra Link, e um resumo impresso.

**Não entra, e por quê:**

- os itens removidos antes de fechar a venda (`negociacao_item_vendido_cancelado`, 731 linhas): não são venda nem cancelamento, e a Link não os conta (`DICIONARIO.md` do Prumo, linha 25);
- os lançamentos do razão que só repetem o que já entra por outro lugar: o da venda (é o bruto; a venda sai da negociação), o custo da mercadoria vendida e devolvida (o custo por item é assunto da margem, Fase 8), o "Fechamento de Caixa" (a conferência já diz o turno) e as liquidações (entram como baixas);
- a ligação da venda ao turno, que na Link é pela hora: é regra, da Fase 4;
- a foto do estoque da Link e a classificação pelas planilhas (Alternativas);
- a rodada na VPS (Fase 4).

## 5. Onde a Link é lida

- **Esquema:** `erp`, as 26 tabelas da cópia da Link, sem chave primária nem índice (medido). As chaves usadas (`id_negociacao`, `id_caixa`, `id_pc_lancamento` etc.) são únicas e sem nulo na cópia antiga.
- **Permissão:** `grant usage on schema erp to kaizen` e `grant select on all tables in schema erp to kaizen`, dados pelo superusuário depois de cada restauração. O `kaizen` não é dono de nada no `erp`.
- **Colunas esperadas:** um arquivo do repositório lista cada par (tabela, coluna) do `erp` que o tradutor lê, com o tipo. O comando confere a lista antes de ler; faltando uma coluna, ele para sem gravar nada, com a tabela e a coluna na mensagem. Nos testes, uma "Link falsa" é criada **só com essas colunas**, então uma consulta que leia coluna fora da lista quebra no teste.
- **Datas:** as colunas da Link são `timestamp` sem fuso, na hora da loja, e vão direto para as colunas `timestamp` do Kaizen. As datas `date` do Kaizen (lançamento, vencimento, pagamento) são o dia do `timestamp` da Link.

## 6. Ligação com o cadastro novo

A ligação usa o cadastro do ERP novo que já está no Kaizen (`kaizen.produto`, `kaizen.pessoa` e `kaizen.funcionario`, fonte `meuerp`), gravado pelo tradutor da Fase 2. Sem nenhum produto `meuerp` no Kaizen, o comando para: o cadastro do ERP novo ainda não foi lido.

**Ordem, para cada código da Link citado por um documento que entra:**

1. **Decisão na `de_para`** (entidade, `link`, código da Link), com `codigo_kaizen` fora de `link:`. Vale sempre. Se a decisão apontar para um código que não existe no cadastro `meuerp`, o comando para, com a linha na mensagem.
2. **A regra do `OBJETIVO.md`:**
   - **produto:** `produto.produto_codigo` igual a um `kaizen.produto.codigo` do `meuerp`;
   - **cliente e fornecedor:** o CPF/CNPJ só com dígitos, não vazio, igual ao de **exatamente uma** pessoa `meuerp` (também só dígitos). Na Link, o CPF/CNPJ do cliente é `coalesce(cpf, cnpj)`; o do fornecedor, `cpf_cnpj`;
   - **vendedor:** o nome da Link, em maiúsculas e sem acento, igual à primeira palavra do nome de **exatamente um** funcionário `meuerp`, também em maiúsculas e sem acento.
3. **Falha:** o código no Kaizen é `link:` seguido do código da Link; a entidade entra no cadastro do Kaizen com fonte `link` (seção 7.6), e a falha vai para a `de_para`.

**Código da Link, por entidade** (é o `codigo_origem` da `de_para`):

| Entidade | Código da Link |
| --- | --- |
| `produto` | `produto.produto_codigo` |
| `pessoa`, cliente | `cliente.cliente_codigo` |
| `pessoa`, fornecedor | `fornecedor.fornecedor_codigo + 900000`, o código que a migração deu aos fornecedores no ERP novo. Não colide com o código de cliente da Link (até 448 ou 8 dígitos) |
| `funcionario` | `usuario.id_usuario` |

**Falhas na `de_para`.** A cada rodada, o comando apaga as linhas da `de_para` da fonte `link` cujo `codigo_kaizen` começa com `link:` e grava as falhas desta rodada. As decisões ficam como estão.

**Decisões gravadas por migração** (decisão 5): `pessoa`/`link`/`10000502` → `999007`, e as 20 ligações de cliente sem documento, cada uma do código para ele mesmo: 21, 75, 84, 142, 145, 172, 212, 213, 214, 216, 236, 250, 274, 276, 279, 290, 298, 361, 384 e 409.

**Resultado esperado na cópia antiga** (medido na leitura de 28/09, sobre todos os cadastros da Link; o resumo do comando conta só o que os documentos citam, e o plano traz esses números):

- produtos: todos os produtos das vendas válidas ligam (725); falham 6, que só aparecem na venda cancelada 8 (1993 e 2396) e em notas de entrada (2758, 5218, 5239 e 5264);
- clientes: das 5.244 vendas válidas, 31 não têm cliente; ligam 393 clientes pelo CPF/CNPJ e 21 pela `de_para`; falham o cliente de código 1 (2 vendas, R$ 60,00) e o de código 10000199 (1 venda, R$ 163,00);
- vendedores: ligam Igor (6 → 1), Daniele (5 → 999005), Erleide (9 → 999006) e Wallace (4 → 999004); falham Sistema (1, só na venda cancelada 8 e em turnos zerados), Israel (7) e Luis Henrique (8), com as 5 vendas de teste que continuam somando (R$ 300,60).

## 7. O que entra, tabela por tabela

Todos os documentos têm `fonte = 'link'`. `visto_em` é a hora da primeira carga e nunca muda. As linhas filhas guardam `origem_tabela` e `origem_id` da linha da Link de onde vieram.

### 7.1 Documentos

| Família | Quais | `origem_tabela` / `origem_id` | `codigo` | `modelo` (cru) | `status` (cru) | `criado_em` | `fechado_em` | `pessoa` | `turno_usuario` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Venda e orçamento | toda `negociacao` | `negociacao` / `id_negociacao` | `coalesce(venda_codigo, orcamento_codigo)` | `tipo` e `venda` juntos: `A/true`, `T/true`, `P/false` | `caixa.inativo` (`false`, `true`); vazio sem caixa | `negociacao.data` | `caixa.data_hora` | cliente ligado (vazio sem cliente) | vazio |
| Fechamento de caixa | todo `caixa_fechamento` | `caixa_fechamento` / `id_caixa_fechamento` | o id | `caixa_fechamento` | vazio | `data_hora_abertura` | `data_hora` (vazio no turno aberto) | vazio | o `usuario` do ERP novo do funcionário ligado a `caixa_fechamento.id_usuario`; vazio se a ligação falhar ou se o funcionário não tiver usuário (zero) |
| Sangria e suprimento | `pc_lancamento` com `obs` `Sangria` ou `Suprimento` | `pc_lancamento` / `id_pc_lancamento` | o id | `obs` e `orientacao` juntos: `Sangria/true`, `Sangria/false`, `Suprimento/true` | vazio | `data_emissao` | `data_emissao` | vazio | vazio |
| Conta a pagar | `pc_lancamento` sem `id_caixa` que tem ao menos uma parcela com `pc_codigo_destino` começando com `2.` e `destino_positiva` | `pc_lancamento` / `id_pc_lancamento` | o id | a menor dessas contas de destino (`2.1.2.02` etc.) | vazio | `data_emissao` | vazio | fornecedor ligado, por `pc_lancamento_fonte.id_fornecedor` ou, sem ele, pela `compra` de `id_ped_entrada` | vazio |
| Nota de entrada | toda `nota_entrada` | `nota_entrada` / `id_nota_entrada` | o id | `nota_entrada.modelo` (`55`) | vazio | `data_hora_insert` | `data_hora_insert` | fornecedor ligado (`nota_entrada.id_fornecedor`) | vazio |

`movimento`, `financeiro`, `turno_caixa` e `turno_numero` ficam vazios em todos. `id_nota_entrada` substitui o `id_entrada` da spec da Fase 2, que falta em 5 das 51 notas.

Os lançamentos que não são de nenhuma família não entram (seção 4). O resumo diz quantos são.

### 7.2 Itens

| De onde | `origem_tabela` | `sentido` | `produto` | `quantidade` | `valor_liquido` | `vendedor` |
| --- | --- | --- | --- | --- | --- | --- |
| `negociacao_item_vendido` | `negociacao_item_vendido` | `S` | ligado | `qtd` | `meio_par(qtd × (preco_bruto_unitario + valor_acrescimo_padrao) × (1 − desconto_percentual/100), 2) × (1 − n.desconto_percentual/100) × (1 + n.acrescimo_percentual/100)`, sem arredondar o resultado | ligado a `negociacao.id_usuario` |
| `negociacao_item_devolvido` (na negociação da troca) | `negociacao_item_devolvido` | `E` | ligado | `qtd` | `meio_par(qtd × preco_liquido_unitario, 2)` | ligado a `negociacao.id_usuario` da troca |
| `compra_item` da `compra` da nota (`compra.id_nota_entrada`) | `compra_item` | `E` se `entrada_concluida`, senão `N` | ligado | `qtd` (já na unidade do estoque) | vazio | vazio |

`meio_par(x, 2)` arredonda a 2 casas e, no empate exato de meio centavo, vai para o centavo par: 109,725 → 109,72; 142,405 → 142,40; 90,915 → 90,92; 68,875 → 68,88; 206,625 → 206,62. É a função `kaizen.meio_par`, criada por migração.

### 7.3 Pagamentos (`documento_pagamento`)

| De onde | Documento | `origem_tabela` | `forma` (crua) | `valor` |
| --- | --- | --- | --- | --- |
| `caixa_parcela` do caixa da venda | venda | `caixa_parcela` | `forma_pagamento`, e no cartão também o crédito ou débito: `Pix`, `Dinheiro`, `Cartao/true` (crédito), `Cartao/false` (débito) | `valor` |
| parcela `2.1.2.03` do lançamento do caixa da venda (`pc_lancamento.id_caixa`) | venda | `pc_lancamento_parcela` | `2.1.2.03` | `valor` se `destino_positiva` é falso (vale usado); `−valor` se verdadeiro (vale gerado) |
| parcela `1.1.1.01` com `destino_positiva` falso do lançamento do caixa da venda | venda | `pc_lancamento_parcela` | `1.1.1.01` | `−valor` (dinheiro devolvido) |
| fonte `2.1.2.03` do lançamento do caixa da venda (a venda 358, paga com bonificação) | venda | `pc_lancamento_fonte` | `2.1.2.03` | `valor` se `origem_positiva` é falso; `−valor` se verdadeiro |
| o próprio lançamento | sangria, suprimento | `pc_lancamento` | `1.1.1.01` | `pc_lancamento.valor` |

As parcelas `1.1.1.01` positivas do lançamento da venda não entram: repetem o dinheiro do `caixa_parcela`.

**Conferência:** em cada venda válida, a soma dos pagamentos é `valor_total_venda − valor_total_devolucao`. A exceção conhecida é a negociação 100, cujo troco de R$ 0,01 a Link não grava em linha nenhuma (Pix 336,78 e dinheiro 0,01 para 336,78). O resumo diz em quantas vendas a soma bate.

### 7.4 Conferência de caixa

Uma linha por forma de cada `caixa_fechamento`: `dinheiro`, `pix`, `cartao` e `nota_promissoria` sempre; `cheque` e `boleto` só quando o calculado ou o informado não é zero (hoje, nunca).

- `origem_tabela` = `caixa_fechamento`; `origem_id` = o id, uma barra e a forma (`12/pix`);
- `forma` = o nome da forma;
- `calculado` = a coluna da forma; `informado` = `<forma>_informado` (vazio quando vazio). O recontado não entra (decisão 2 do `FONTES.md`).

### 7.5 Parcelas e baixas das contas a pagar

- **Parcelas:** todas as `pc_lancamento_parcela` do lançamento da conta. `origem_tabela` `pc_lancamento_parcela`; `lancado_em` = dia de `pc_lancamento.data_emissao`; `vencimento` = `data_vencimento`, com `0001-01-01` virando vazio; `valor`; `status` = `liquidada` (`true`, `false`); `descricao` = `documento`; e as duas colunas novas: **`conta`** = `pc_codigo_destino` e **`conta_positiva`** = `destino_positiva`. No ERP novo, as duas ficam vazias.
- **Baixas:** cada `pc_lancamento_fonte` de outro lançamento cujo `id_pc_lancamento_parcela` aponta para a parcela. `origem_tabela` `pc_lancamento_fonte`; `pago_em` = dia do `data_emissao` desse outro lançamento; `valor` = `pc_lancamento_fonte.valor`; `forma` e `status` vazios.

A regra "conta a pagar em aberto no dia D" é da Fase 4. Os dados já permitem a do Prumo: conta `2.%`, positiva, com vencimento.

### 7.6 Cadastro do que só existe na Link

Entra, com fonte `link` e código `link:<código da Link>`, só o que um documento carregado cita e não ligou. Upsert por `(fonte, codigo)`, com `lido_em` da rodada; nada se apaga.

- **produto:** `descricao`; `grupo` e `subgrupo` = a descrição de `prod_grupo` e `prod_subgrupo` do produto; `secao` vazia; `marca` = `marca.descricao`; `custo` = `preco_custo`; `ativo` = não `inativo`.
- **pessoa (cliente):** `nome`; `cpf_cnpj` = `coalesce(cpf, cnpj)`; `bairro`; `municipio`, `ibge` e `uf` da `cidade` (`descricao`, `cod_cidade`, `sigla_estado`); `ativo`.
- **pessoa (fornecedor):** `nome` = `razao_social`; `cpf_cnpj`; `bairro`; cidade como no cliente; `ativo`.
- **funcionario:** `nome`; `usuario` e `tipo` vazios; `ativo`.

### 7.7 Rodar duas vezes

- O documento é atualizado no lugar pela chave `(fonte, origem_tabela, origem_id)`, sem tocar em `id` e `visto_em`.
- Os filhos de todo documento da Link são trocados por inteiro.
- Documento da Link que está no Kaizen e não voltou na leitura sai, com os filhos. Se a leitura trouxer zero negociações, o comando para sem gravar nada, para que uma restauração que falhou não apague a história.
- Com a mesma cópia, duas rodadas deixam o mesmo conteúdo em todas as tabelas, comparado sem os `id` e `parcela_id` dos filhos e sem `lido_em`.

## 8. Tradução

Migração nova com as linhas da fonte `link` em `kaizen.traducao`, no vocabulário que o ERP novo já usa:

| Campo | Código → valor |
| --- | --- |
| `tipo` | `A/true` pedido · `T/true` pedido · `P/false` orcamento · `caixa_fechamento` fechamento_caixa · `Sangria/true` sangria · `Sangria/false` sangria · `Suprimento/true` suprimento · `2.1.2.02`, `2.1.2.03`, `2.1.3.07`, `2.1.4.10`, `2.1.5.02` conta_pagar · `55` nota_entrada |
| `situacao` | `false` emitido · `true` cancelado |
| `situacao_pelo_modelo` | todos os modelos acima: emitido |
| `movimento_pelo_modelo` | `A/true`, `T/true` saida · `55` entrada · os outros nenhum |
| `financeiro_pelo_modelo` | `A/true`, `T/true` recebe · `Sangria/true`, `Sangria/false` e as contas paga · os outros nenhum |
| `forma` | `Dinheiro` dinheiro · `Pix` pix · `Cartao/true` credito · `Cartao/false` debito · `2.1.2.03` troca · `1.1.1.01` dinheiro · `dinheiro` dinheiro · `pix` pix · `cartao` cartao · `nota_promissoria` troca · `cheque` cheque · `boleto` boleto |
| `status_parcela` | `false` pendente · `true` baixada |
| `sentido` | `S` saida · `E` entrada · `N` nenhum |

- `A/true` e `T/true` são pedido: as duas são venda finalizada no caixa (A digitada no caixa, T vinda de atendimento), como o pedido `PA` do ERP novo. `P/false` é orçamento, como o `OC`.
- O fechamento, a sangria e o suprimento seguem `FC`, `RS` e `SF` do ERP novo: fechamento sem movimento nem financeiro; sangria paga; suprimento sem financeiro.
- A conferência da Link junta crédito e débito em `cartao`, um valor que o ERP novo não tem; a Fase 4 lê a quebra de cartão da Link junta.
- **A visão `documento_negocio`** passa a usar `coalesce(situação traduzida, situação pelo modelo)`, como já faz com o movimento e o financeiro.
- Um código da Link sem tradução faz o comando parar, com o campo e o código na mensagem. A cópia final não recebe código novo sem que alguém veja.

## 9. O comando

`node --env-file=.env tradutor/link.mts`, com `KAIZEN_URL` apontando para o banco onde estão o `kaizen` e o `erp`. Ele não precisa de `MEUERP_TOKEN`.

1. Confere as colunas esperadas do `erp`.
2. Confere que o cadastro `meuerp` existe no Kaizen e que o `erp` tem negociações.
3. Numa transação: confere as decisões da `de_para`; liga produtos, pessoas e funcionários; grava o cadastro só da Link e as falhas da `de_para`; monta os documentos e os filhos; grava; confere que todo código cru da Link tem tradução.
4. Depois do commit, só lendo: compara por dia, Kaizen contra Link, e imprime o resumo.

Qualquer falha desfaz a transação inteira, imprime o motivo em uma frase e sai com código 1.

**Comparação por dia** (dia de `negociacao.data`, vendas válidas: `venda` verdadeiro e caixa com `inativo` falso):

- número de vendas;
- vendido: no Kaizen, `meio_par(soma dos itens S, 2)`; na Link, soma de `valor_total_venda`;
- devolução: no Kaizen, soma dos itens E; na Link, soma de `valor_total_devolucao`.

"Igual" é exatamente igual. O resumo diz quantos dias foram comparados e quantos diferem, com os números de cada um que diferir.

**Resumo impresso:** documentos por família; vendas válidas, canceladas e orçamentos; itens vendidos, devolvidos e de nota; pagamentos e em quantas vendas eles somam venda − devolução; fechamentos e linhas de conferência; parcelas e baixas; ligações por entidade (pela regra, pela decisão, falhas), com as vendas e o valor das vendas cujo cliente ou vendedor falhou; e a lista das falhas gravadas na `de_para`; a comparação por dia.

**A mesma forma.** Uma consulta do repositório (`sql/kaizen/ficha-venda.sql`) devolve um documento em palavras do negócio: tipo, situação, movimento, financeiro, datas, cliente (código e nome), itens (sentido, produto e descrição, quantidade, valor, vendedor e nome) e pagamentos (forma traduzida e valor). A mesma consulta serve para uma venda da Link e uma do ERP novo.

## 10. Testes

`node:test` contra o Postgres local (5434), com a contagem conferida (`testes-esperados.txt`). A "Link falsa" é o esquema `erp` criado no banco de teste, só com as colunas da lista, com leitura dada ao `kaizen`. Os casos vêm da cópia antiga, com os números reais e nomes inventados:

- **valor do item:** os empates de meio centavo (109,725 → 109,72; 142,405 → 142,40; 90,915 → 90,92); a venda de junho 1992 (itens 90,92 e 60,00, desconto de 0,60959% na negociação, total 150,00); acréscimo na negociação;
- **devolução:** a 1095 (44,0466 + 23,7174 → 44,05 + 23,72 = 67,77);
- **pagamentos:** Pix e débito na mesma venda; vale gerado (434) e usado (435); dinheiro devolvido (108); a 358 paga com bonificação; a 427 com o resto do vale; em cada uma, soma = venda − devolução;
- **cancelada e orçamento:** situação `cancelado` e `orcamento` pela visão;
- **caixa:** fechamento com as quatro formas e informado vazio; turno aberto; sangria das duas orientações; suprimento;
- **contas:** conta com duas parcelas, uma baixada por outro lançamento (a baixa com o dia desse lançamento), `conta` e `conta_positiva`; a bonificação (conta `2.1.2.03`) baixada pela fonte da venda 358;
- **nota:** itens da `compra`, sentido `E` e `N`;
- **ligação:** produto pelo código; cliente pelo CPF/CNPJ; CPF/CNPJ vazio que não liga nada; CPF/CNPJ que acha duas pessoas vira falha; decisão da `de_para` vale antes do CPF; falha vira `link:` no documento, no cadastro e na `de_para`; a falha corrigida pelo dono vira decisão e a rodada seguinte a usa; decisão que aponta para código inexistente para o comando; vendedor pelo primeiro nome; Sistema e o usuário 1 do ERP novo não se confundem;
- **rodar duas vezes:** mesmo conteúdo, mesmos `id` e `visto_em`; documento que sumiu da Link sai; `erp` sem negociação para sem apagar nada;
- **falhas:** coluna faltando; cadastro `meuerp` vazio; código sem tradução;
- **comparação:** zero diferença nos casos; um item alterado à mão aparece como diferença do dia;
- **a mesma forma:** uma venda da Link e uma do ERP novo (pelos casos da Fase 2) no mesmo banco dão, pela `ficha-venda.sql`, o mesmo tipo, situação, movimento, financeiro, vendedor e formas traduzidas.

## 11. As duas rodadas

**Rodada contra a cópia antiga (28/09), dentro da fase:**

1. `pg_dump -Fc -n erp` do `link_postgres` (só leitura) e `pg_restore --no-owner --no-acl` no banco `kaizen` do Postgres do Kaizen; a permissão de leitura do `erp` ao `kaizen`.
2. O comando `link` duas vezes, com o resumo das duas no registro da fase.
3. A comparação por dia sem diferença; as contagens por tabela iguais nas duas rodadas.
4. Uma venda de junho e uma venda do ERP novo de 28/09 em diante (lida pelo tradutor da Fase 2, só leitura, depois que a loja vender) pela `ficha-venda.sql`, lado a lado.

**Rodada contra a cópia final (29/09), última tarefa do plano, aberta ao fim desta sessão:** conferir o sha256, restaurar no lugar da antiga (`pg_restore --clean --if-exists`), dar a permissão, rodar o comando duas vezes e registrar as contagens, as falhas da `de_para`, a comparação e a diferença para a cópia antiga (a tarde de 25/09 e o fechamento do turno 190).

## 12. Pronto quando

**Desta sessão (construção):**

1. Os testes passam, com a contagem conferida.
2. O comando rodou duas vezes contra a cópia antiga, gravou a história no `kaizen` do PC, e o resumo mostra vendas, itens, clientes e produtos ligados, as falhas da `de_para` e zero diferença na comparação por dia.
3. A venda de junho e a de 28/09 em diante mostram a mesma forma.
4. O auditor de fase aprova a construção, sabendo que a rodada final fica aberta.

**Da fase (`OBJETIVO.md`):** o mesmo, contra a cópia final.

## 13. Riscos e limites

- **Estrutura da cópia final.** Se ela tiver coluna a menos, o comando para na conferência de colunas; se tiver código novo (um `tipo` de negociação, uma forma), ele para na tradução. Nos dois casos nada é gravado, e a correção é uma migração ou uma linha na lista.
- **Vale e bonificação de abril e maio.** A forma de pagamento dos vales foi deduzida do razão e conferida pela soma de cada venda; são 10 vales e 9 usos, de 15/04 a 22/05.
- **Troco sem linha:** 2 vendas, a 8 (cancelada) e a 100 (R$ 0,01).
- **Contas a pagar nas duas fontes.** As contas abertas da Link em 25/09 foram migradas para o ERP novo. Cada fonte vale no seu período (a Link até 25/09, o ERP novo a partir de 28/09); é regra da Fase 4.
- **Descrição vazia no cadastro do ERP novo.** Em 27/09, os 1.029 produtos `meuerp` no Kaizen estavam com a descrição vazia (a Fase 2 lê `mercadoria_variacao.descricao`). A ficha da venda do ERP novo mostra a descrição vazia até isso ser corrigido; é um bug da Fase 2, registrado para o dono.
- **A VPS.** A história da Link só chega ao Kaizen da VPS na Fase 4, rodando o comando lá.

## 14. Para a Fase 4

- cada fonte vale no seu período: Link de 11/04 a 25/09, ERP novo a partir de 28/09; 26/09 é a pausa da virada;
- venda da Link no turno: pela hora (`caixa.data_hora` entre a abertura e o fechamento, só nos turnos fechados);
- conta a pagar da Link: conta `2.%`, `conta_positiva`, com vencimento;
- a quebra de cartão da Link vem junta (`cartao`);
- a primeira entrada do produto migrado: a primeira nota da Link (`criado_em` do documento de tipo `nota_entrada`, item de sentido `E`);
- levar a história da Link à VPS: permissão de leitura do `erp` ao `kaizen` e o comando `link` rodado lá.
