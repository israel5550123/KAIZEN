# Fase 2 — esquema próprio e tradutor do ERP novo

**Desenho aprovado seção por seção pelo dono em 27/09/2026.** Este documento é a spec da Fase 2 do `OBJETIVO.md`. Ele diz o que se guarda, de onde vem cada coluna nas duas fontes, como o tradutor lê e grava, onde roda, como avisa, como se testa e quando a fase fecha. O plano de implementação vem depois, a partir daqui.

## 1. Resumo

- O Kaizen passa a ter um banco próprio: o esquema `kaizen`, no Postgres da VPS. Ali ficam os documentos do ERP (venda, orçamento, troca, caixa, conta), os itens, os pagamentos, as parcelas e baixas, a conferência do caixa, os movimentos e a foto do estoque, e os cadastros.
- Um tradutor lê o ERP novo de hora em hora, das 8h às 19h, e relê tudo às 22h, de segunda a sábado. Ele só lê, pelo SQL da API, e nunca escreve no ERP.
- O tradutor copia; não decide regra. O que é "venda válida", "vendido" e "quebra" fica para a Fase 4. Os códigos do ERP ficam como vieram, e uma tabela de tradução diz o que cada um significa.
- Toda noite, os totais de cada dia no Kaizen são comparados com os do ERP. A fase fecha quando a diferença for zero em todos os dias desde 28/09, na VPS, com as execuções registradas e o aviso de falha chegando pelo Telegram.

## 2. Decisões

| # | Decisão | Quem e quando |
| --- | --- | --- |
| 1 | O tradutor lê o ERP novo **só pelo SQL** (`POST /api/consulta/sql/v1`, só SELECT), não pelos endpoints. Os endpoints não dispensam o SQL (caixa, contas pagas, fornecedor) e só filtram documento pela data de criação, o que traria duas exceções: o orçamento fechado dias depois no próprio documento e o cancelamento fora da janela. Proteção contra mudança do esquema interno: o tradutor confere as colunas a cada execução e para com aviso. | Dono, 27/09 (fecha a questão em aberto do `FONTES.md`) |
| 2 | Aviso de falha **pelo Telegram, mandado pelo próprio tradutor**. O dono aceitou o limite: se a VPS estiver desligada, não chega aviso. | Dono, 27/09 |
| 3 | Formato do esquema: **documento em palavras do negócio**. Uma tabela de documento para todos os tipos, com itens, pagamentos, parcelas e conferência. O tipo vem de uma tabela de tradução; "venda válida" é regra da Fase 4. | Dono, 27/09 |
| 4 | **Exceção declarada**, para a Fase 3: o tradutor da Link calcula o valor líquido do item com a conta da própria Link (arredondamento meio-par por item e rateio do desconto e do acréscimo da negociação, `C:\Projetos\prumo\docs\DICIONARIO.md`), conferindo contra o total gravado (`valor_total_venda`). É a única exceção a "o tradutor não recalcula". | Dono, 27/09 |
| 5 | O tradutor roda numa **stack própria, `kaizen`**, ligada à rede do Postgres da stack `prumo`. O banco é o mesmo do `OBJETIVO.md`; o Kaizen nunca reimplanta a stack `prumo`. | Dono, 27/09 |
| 6 | O a pagar entra inteiro: todas as parcelas pendentes, de qualquer data, e não só as de 28/09 em diante. | Dono, 27/09 (responde à pergunta da Fase 1) |
| 7 | Conferências da operação real ("Na operação real, a partir de 28/09" no `FONTES.md`) viram tarefas da primeira semana. A conferência da DRE sai da lista: o Kaizen não usa a DRE. | Dono, 27/09 |

## 3. Escopo

**Entra na Fase 2:**

- o esquema `kaizen` inteiro, desenhado para receber as duas fontes;
- o tradutor do ERP novo;
- a rotina na VPS, o registro de cada execução e o aviso pelo Telegram;
- os testes e o ensaio com o ERP de verdade;
- as conferências da primeira semana.

**Não entra:**

- o tradutor da Link (Fase 3). Aqui, o esquema só precisa ser capaz de receber a Link, e a coluna "Link" das tabelas abaixo diz de onde cada coisa virá;
- as regras dos indicadores (Fase 4);
- meta, saldo do banco, feriados, API e app (Fase 5).

## 4. Esquema `kaizen`

### 4.1 Convenções

- **Onde fica:** banco `prumo`, esquema `kaizen`, no Postgres 16 da stack `prumo`. É o mesmo banco da cópia da Link (esquema `erp`), para que a Fase 3 leia `erp` direto. O usuário `kaizen` é dono do esquema `kaizen` e não é superusuário. A leitura de `erp` só é dada na Fase 3, com o sync do Prumo parado; enquanto ele roda, recria `erp` a cada hora e a permissão se perderia.
- **Nomes:** em português, snake_case.
- **Valores e quantidades:** `numeric` sem precisão fixa. Guarda exatamente o que a fonte gravou (no ERP novo, até 6 casas), sem arredondar.
- **Datas e horas das fontes:** `timestamp` sem fuso, na hora da loja, como as duas fontes gravam. Vencimento e data de pagamento em `date`: os 10 primeiros caracteres do `timestamp` do ERP.
- **Carimbos do próprio Kaizen** (`visto_em`, `lido_em`, execução): `timestamptz`.
- **Códigos de cadastro** (produto, pessoa, funcionário): `text`. Na Link há produto com código "CFOP5949".
- **Códigos do ERP** (modelo, status, movimento, financeiro, forma): guardados crus, como vieram. O significado vem da tabela `traducao` (4.4).
- **Origem:** toda linha de fato tem `fonte` (`meuerp` ou `link`), `origem_tabela` e `origem_id` (`text`).
  - No ERP novo, `origem_id` é o `oid` da linha. Cada tabela do ERP tem o seu contador de `oid`, que não voltou ao início na limpeza de 26/09. Já o número do documento (`_iddocumento`) voltou: ele é o maior existente mais 1.
  - Na Link, `origem_id` é a chave da tabela de origem.
  - Unicidade: `(fonte, origem_tabela, origem_id)` no documento; `(documento_id, origem_tabela, origem_id)` nas linhas filhas.
- **Zero que quer dizer "nenhum"** (vendedor 0, turno 0) vira vazio. É a única transformação de valor que o tradutor do ERP novo faz, além de datas em `date`.
- **Só o que os indicadores precisam.** A releitura da noite relê tudo desde a virada. Por isso, uma coluna acrescentada depois se preenche sozinha na primeira noite.

### 4.2 Tabelas de fato

#### `documento` — todo documento do ERP

| Coluna | Tipo | Significado | ERP novo (SQL) | Link (Fase 3) |
| --- | --- | --- | --- | --- |
| `id` | bigint identity | chave do Kaizen | — | — |
| `fonte`, `origem_tabela`, `origem_id` | text | de onde veio | `'documento'`, `documento.oid` | `'negociacao'` `id_negociacao`; `'caixa_fechamento'` `id_caixa_fechamento`; `'pc_lancamento'` `id_pc_lancamento` (sangria, suprimento, conta); `'nota_entrada'` `id_entrada` |
| `codigo` | text | número que as pessoas veem | `_iddocumento` | `venda_codigo` (venda), `orcamento_codigo` (orçamento); nos outros, o id |
| `modelo` | text | tipo do documento, cru | `modelo` | `negociacao.tipo` (A, T, P); nas outras tabelas, o que a Link grava (a tabela de origem, `pc_lancamento.obs` ou a conta de destino). Nunca uma palavra inventada |
| `status` | text | situação, crua | `status` | `caixa.inativo` |
| `movimento` | text | saída ou entrada, cru | `tipomovimento` (S, E, N) | vazio (a Link não tem) |
| `financeiro` | text | recebe, paga ou nada, cru | `tipomovimentofinanceiro` (R, P, N) | vazio |
| `criado_em` | timestamp | quando o documento nasceu | `datahora` | `negociacao.data`; fechamento: `data_hora_abertura`; razão: `data_emissao`; nota: `data_hora_insert` |
| `fechado_em` | timestamp, pode faltar | quando foi fechado; é a data do vendido (decisão 7 do `FONTES.md`) | `datahoramovimento` | `caixa.data_hora`; fechamento: `data_hora` (vazio no turno aberto) |
| `pessoa` | text, pode faltar | cliente ou fornecedor | `idpessoa` | cliente: `cliente.cliente_codigo`; fornecedor: `fornecedor.fornecedor_codigo` + 900000 |
| `turno_caixa`, `turno_usuario`, `turno_numero` | integer, podem faltar | o turno de caixa | `idcaixaabertura`, `idusuarioabertura`, `idabertura` (0 → vazio) | vazios; no fechamento, `turno_usuario` = `caixa_fechamento.id_usuario`. A venda da Link liga ao turno por hora, e isso é regra |
| `visto_em` | timestamptz | primeira vez que o tradutor viu o documento; nunca muda | — | hora da carga |

#### `documento_item` — itens

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `documento_id` | bigint | | — | — |
| `origem_tabela`, `origem_id` | text | | `'documento_mercadoria'`, `oid` | `'negociacao_item_vendido'`, `'negociacao_item_devolvido'` ou `'nota_entrada_item'`, e o id |
| `sentido` | text | S = saiu da loja; E = entrou | `tipomovimento` do documento | S no item vendido; E no item devolvido e no item de nota |
| `produto` | text | código do produto | `idmercadoriavariacao` | `produto.produto_codigo` (via `id_produto`) |
| `quantidade` | numeric | | `qtd` | `qtd` (nota: `qtd_produto`) |
| `valor_liquido` | numeric | valor do item depois do desconto | `valtotalliquido` | vendido: a conta da Link (decisão 4); devolvido: `qtd × preco_liquido_unitario`, sem arredondar |
| `vendedor` | text, pode faltar | código do vendedor | `idpessoafuncionario` (0 ou vazio → vazio) | `negociacao.id_usuario` |

#### `documento_pagamento` — forma e valor de cada documento

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `documento_id`, `origem_tabela`, `origem_id` | | | `'documento_pagamento'`, `oid` | `'caixa_parcela'` `id_caixa_parcela`; parcelas do razão |
| `forma` | text | forma de pagamento, crua | `idpagamento` (1 a 5) | `forma_pagamento` + crédito/débito (`credito_ou_debito_cartao`); vale usado (razão `2.1.2.03`, negativa) → troca; devolução em dinheiro (razão `1.1.1.01`) → dinheiro negativo |
| `valor` | numeric | com sinal; o troco é negativo | `valor` | `valor` |

#### `parcela` — parcelas de documento que paga

Entram as parcelas dos documentos com `financeiro` = P: conta a pagar, crédito de troca, devolução, sangria, nota de entrada. As parcelas das vendas (a receber) não entram: nenhum indicador as usa, e o cartão a receber segue a regra D+1.

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `documento_id`, `origem_tabela`, `origem_id` | | | `'documento_parcela'`, `oid` | `'pc_lancamento_parcela'` `id_pc_lancamento_parcela` |
| `lancado_em` | date, pode faltar | emissão da parcela | `dtlancamento` | `pc_lancamento.data_emissao` |
| `vencimento` | date, pode faltar | | `dtvencimento` | `data_vencimento` (0001-01-01 → vazio) |
| `valor` | numeric | | `valparcela` | `valor` |
| `status` | text | situação, crua | `status` (P pendente, B baixada) | `liquidada` |
| `descricao` | text | | `descricao` | `documento` |

A Fase 3 acrescenta à parcela da Link a conta de destino e o sinal, para a regra de conta a pagar da Link ficar na Fase 4, e não no tradutor.

#### `baixa` — pagamento de uma parcela

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `parcela_id`, `origem_tabela`, `origem_id` | | | `'documento_parcela_pagamento'`, `oid` (liga à parcela por `_iddocumento`, `_idsequencia`, `_idparcela` na própria consulta) | o lançamento de liquidação (`pc_lancamento_fonte` → parcela) |
| `pago_em` | date | data da baixa no ERP | `dtpagamento` | `pc_lancamento.data_emissao` da liquidação |
| `valor` | numeric | | `valpagamento` | valor da fonte |
| `forma` | text, pode faltar | | `idpagamento` | vazio |
| `status` | text | situação, crua | `status` (E vale, C cancelada) | vazio (vale) |

#### `conferencia_caixa` — fechamento às cegas, uma linha por forma

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `documento_id` (o fechamento), `origem_tabela`, `origem_id` | | | `'documento_conferencia_caixa'`, `oid` | `'caixa_fechamento'`, id + forma |
| `forma` | text | crua | `_idpagamento` | `dinheiro`, `pix`, `cartao` (crédito e débito juntos), `nota_promissoria` (o vale) |
| `calculado` | numeric | o que o sistema esperava | `valdisponivel` | `dinheiro`, `pix`, `cartao`, `nota_promissoria` |
| `informado` | numeric, pode faltar | o que o operador contou | `valconferido` | `<forma>_informado` (vazio quando nulo). Cheque e boleto, zerados nos dois lados, não viram linha |

O recontado não entra, pela decisão 2 do `FONTES.md`.

#### `estoque_movimento` — histórico de estoque

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `fonte`, `origem_id` | | | `mercadoria_estoque_historico.oid` | não existe |
| `produto` | text | | `idmercadoriavariacao` | |
| `documento` | text | número do documento que mexeu | `_iddocumento` | |
| `momento` | timestamp | data do documento (o ERP grava a hora do documento, não a do movimento) | `datahora` | |
| `saldo_antes`, `saldo_depois` | numeric | | `qtdsaldoatual`, `qtdnovosaldo` | |

O saldo de qualquer dia se refaz daqui, inclusive nos dias em que o tradutor não rodou. Isso é regra da Fase 4: vale o último `saldo_depois` até o dia; sem movimento, vale o saldo de `estoque_virada`.

#### `estoque_atual` — foto do saldo a cada execução

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `fonte`, `produto` | text | chave | `mercadoria_estoque._idmercadoriavariacao` (empresa 1, local 1) | `produto.produto_codigo` |
| `quantidade` | numeric | | `qtdsaldo` | `produto.qtd_estoque` da cópia final |
| `lido_em` | timestamptz | | hora da leitura | hora da cópia |

Serve para mostrar o "agora" e para conferir os movimentos: quando o último `saldo_depois` de um produto não bate com a foto, sai um aviso. Isso acontece quando o saldo muda sem deixar linha, como já aconteceu no inventário "TESTE" (`FONTES.md`, "Simulação do dono").

#### `estoque_virada` — saldo de cada produto na virada

Tem as colunas `produto` e `quantidade`. É carregada por uma migração gerada a partir de `docs/medicoes/estoque-virada-2026-09-27.json`, medido em 27/09 às 13h38, antes da operação: 1.029 produtos, 714 com estoque, 54.660,5 unidades, nenhum negativo.

Ela é o ponto de partida do saldo de cada produto. Um produto sem movimento desde a virada tem o saldo dela. Ela é também a base da conferência entre movimentos e foto. O que existia antes dela no histórico fica abaixo do corte e não é lido.

### 4.3 Cadastros

Os cadastros guardam o estado atual e são chaveados por `(fonte, codigo)`. O ERP novo manda. Da Link entram só os produtos e as pessoas que não existem no ERP novo (Fase 3). Um cadastro nunca é apagado: a história precisa do nome. Se ele sumir da fonte, fica como estava.

| Tabela | Colunas | ERP novo | Link (Fase 3) |
| --- | --- | --- | --- |
| `produto` | `codigo`, `descricao`, `grupo`, `secao`, `subgrupo`, `marca`, `custo` (pode faltar), `ativo`, `lido_em` | `mercadoria_variacao` (`_idmercadoriavariacao`, `descricao`, `idmarca` → `mercadoria_marca.descricao`); `mercadoria` via `idmercadoria` (`idgrupo`, `idsecao`, `idsubgrupo` → `descricao` de cada tabela); `mercadoria_custo.valcusto` (sem linha → vazio, não zero); `mercadoria_variacao_empresa.flaginativo` | só os produtos que não existem no ERP novo, classificados pelas mesmas planilhas de-para da migração (`C:\Projetos\migrção erp\depara\`) |
| `produto_fornecedor` | `produto`, `fornecedor` | `mercadoria_variacao_pessoa` (`flaginativo` = F) | não entra: os produtos só da Link não têm estoque |
| `pessoa` | `codigo`, `nome`, `cpf_cnpj`, `bairro`, `municipio`, `ibge`, `uf`, `ativo`, `lido_em` | `pessoa` (`nome` + `sobrenome`, `cnpjcpf`, `flaginativo`); `pessoa_endereco` principal e ativo (`flagprincipal` = T, `flaginativo` = F: `bairro`, `idibgemunicipio`, `uf`); `municipio.nome` por `idibgemunicipio` = `_idmunicipio` | `cliente` (`cpf`/`cnpj`, `bairro`, `id_cidade` → `cidade.cod_cidade`, que já é o IBGE) |
| `funcionario` | `codigo`, `nome`, `usuario`, `tipo`, `ativo`, `lido_em` | `pessoa_funcionario` (`_idpessoa`, `idusuario`, `tipo` cru, `flaginativo`) + `pessoa.nome` | `usuario` (id e primeiro nome; Israel, Luis Henrique e Sistema só existem lá) |
| `de_para` | `entidade`, `fonte`, `codigo_origem`, `codigo_kaizen` | — | liga a mesma pessoa ou produto entre as fontes: vendedores da Link, Consumidor Final 1229 → 999007. Preenchida na Fase 3 |

O CPF/CNPJ fica porque a Fase 3 liga o cliente por ele (`OBJETIVO.md`). Latitude e longitude não entram: a geolocalização é dado do Kaizen (Fase 7), e o ERP não tem nenhuma.

### 4.4 Controle

**`traducao` (fonte, campo, codigo, valor)** — o que cada código cru significa. A visão `documento_negocio` (4.5) e as regras da Fase 4 leem por aqui. Código que aparece sem tradução vira aviso. Corrigir ou acrescentar uma linha corrige o passado sem reler o ERP. Carga inicial, ERP novo:

| Campo | Código → valor |
| --- | --- |
| `tipo` (pelo `modelo`) | PA pedido · 65 nfce · 55 nfe · 59 cfe · PV pre_venda · OC orcamento · CN condicional · TM troca · AX abertura_caixa · SF suprimento · SD suprimento_adicional · RS sangria · RT sangria · FC fechamento_caixa · CP conta_pagar · LE inventario · PE perda · TS transferencia · AS ajuste_estoque · AC ajuste_custo · LP liberacao · IM importacao |
| `situacao` (pelo `status` do documento) | E emitido · C cancelado · R rascunho · O conferido · V enviado · X excluido · I inutilizado · Z contingencia |
| `movimento` | S saida · E entrada · N nenhum |
| `financeiro` | R recebe · P paga · N nenhum |
| `forma` | 1 dinheiro · 2 pix · 3 credito · 4 debito · 5 troca |
| `status_parcela` | P pendente · B baixada |
| `status_baixa` | E valida · C cancelada |
| `sentido` | S saida · E entrada |

Ficam de fora de propósito, e geram aviso se aparecerem depois da virada: os modelos AM, EM e RU, o financeiro E e o status C de parcela. Nenhum deles tem significado conferido.

**`corte` (fonte, tabela, oid)** — o corte da virada. Linha do ERP novo com `oid` até o corte da sua tabela não entra: é teste, importação ou resto da limpeza (decisão 12 do `FONTES.md`). Medido em 27/09/2026 às 13h13 (histórico às 13h38), antes da operação:

| Tabela | Linhas | Corte (`oid`) |
| --- | --- | --- |
| `documento` | 10 | 184 |
| `documento_mercadoria` | 802 | 1.872 |
| `documento_conferencia_caixa` | 30 (todas restos) | 30 |
| `mercadoria_estoque_historico` | 1.847 | 1.847 |
| `documento_pagamento`, `documento_parcela`, `documento_parcela_pagamento`, `documento_cancelamento_historico` | 0 | 0 |

- O corte nunca é vazio: tabela vazia tem corte 0, senão nada entraria.
- Cadastros e `mercadoria_estoque` não têm corte, porque são estado atual.
- As contas a pagar que o dono ainda vai importar de novo ficam acima do corte e entram.

**`execucao`** — uma linha por execução:

- `id`, `tipo` (hora, noite ou manual), `inicio`, `fim`;
- `resultado`: ok, aviso, falha ou pulada;
- `mensagem` (o motivo da falha), `contagens` (jsonb, por assunto), `avisos` (jsonb).

A linha é gravada fora da transação da carga, para que a falha também fique registrada.

**`migracao` (nome, aplicada_em)** — as mudanças de estrutura já aplicadas (6.1).

### 4.5 Visão `documento_negocio`

É o documento em palavras do negócio: `documento` mais `tipo`, `situacao`, `movimento` e `financeiro` tirados de `traducao`. É o que as regras da Fase 4 leem.

### 4.6 Como cada indicador sai daqui

Esta é a conferência de que o esquema responde o destino. As regras em si são da Fase 4.

#### Vendas

- **Vendido:** itens de sentido S de documento emitido, de saída, que recebe, com vendedor, pela data de `fechado_em`. Quando `fechado_em` faltar, a Fase 4 decide com aviso.
- **Devoluções:** itens de sentido E de documento de tipo venda ou troca, na data e no vendedor do documento.
- **Líquido:** vendido − devoluções. Meta, ritmo e projeção leem o líquido, mais os feriados e as metas do Kaizen.
- **Ticket médio, itens por venda, venda por hora e por dia da semana:** documento e itens. Se a NFC-e sair como um segundo documento da mesma venda, a ligação entre os dois entra como coluna nova (seção 8).
- **ABC de clientes, RFV, clientes que pararam, região:** `documento.pessoa` e `pessoa`, sem o Consumidor Final.
- **Venda, mix e clientes por vendedor:** itens, produto e `de_para`.

#### Compras e estoque

- **ABC de produtos:** itens.
- **Giro:** vendido ÷ estoque médio, refeito de `estoque_movimento`.
- **Cobertura e ruptura:** `estoque_atual` e a venda.
- **Encalhe:** saldo, última venda e primeira entrada. Para produto novo, a primeira entrada é o primeiro movimento que sobe o saldo. Para produto migrado, é a primeira nota de entrada da Link (Fase 3). O inventário de 26/09 não conta como entrada.
- **Custo zero:** `produto.custo` = 0 ou vazio.
- **Estoque negativo:** `estoque_atual`.
- **Por grupo, marca e fornecedor:** `produto` e `produto_fornecedor`.

#### Financeiro

- **Contas a pagar e folga:** parcelas pendentes de documento que paga, sem troca, mais o saldo digitado (Fase 5).
- **Fluxo realizado:**
  - entradas: pagamentos das vendas, sem a forma troca, com o cartão em D+1;
  - saídas: baixas válidas, sem a forma troca e sem sangria e suprimento. Se a sangria que paga despesa conta como saída é pergunta aberta do `FONTES.md`.
- **Fluxo previsto:** parcelas pendentes e cartão em D+1.
- **Quebra por turno e forma:** `conferencia_caixa`, informado − calculado, sem a forma troca.
- **Gaveta e sangrias:** pagamentos dos documentos de caixa.
- **Recebíveis de cartão:** pagamentos em crédito e débito, com D+1.

**Limite da fonte, não do esquema:** giro, cobertura e encalhe de dias antes de 28/09 não têm estoque médio em lugar nenhum, porque a Link só tem a foto final do estoque.

## 5. Tradutor

### 5.1 Peças

Cada peça faz uma coisa e pode ser testada sozinha.

1. **Cliente do ERP.** Faz as chamadas HTTP com o token. Só deixa sair `POST /api/consulta/sql/v1` com um único SELECT ou WITH; qualquer outra coisa é recusada antes de sair. Chama em série, no máximo 19 vezes por minuto, com prazo de resposta acima de 60 s. No erro 429, espera a virada do minuto. Nunca imprime o token. Devolve o corpo da resposta como texto.
2. **Consultas por assunto.** Arquivos `.sql`, um por assunto:
   - conferência de colunas;
   - documentos com filhos;
   - lista de documentos vivos;
   - movimentos de estoque;
   - foto do estoque;
   - produtos, pessoas, funcionários e fornecedores do produto.
3. **Carga.** Arquivos `.sql` que recebem o texto JSON da consulta e gravam no esquema `kaizen`, tudo numa transação.
4. **Comparação de totais,** na execução da noite.
5. **Registro e aviso:** a linha em `execucao` e as mensagens do Telegram.
6. **Migrações:** aplica as que faltam, na ordem, antes de cada execução.
7. **Publicação:** Dockerfile, agendamento, stack e segredos.

### 5.2 Como as consultas falam com o ERP

- Uma chamada por assunto. O SQL monta um JSON só (`json_agg`), com números e datas convertidos em texto dentro dele (`valtotalliquido::text`, `datahora::text`).
- A API devolve esse JSON como texto dentro da resposta. O tradutor o passa inteiro ao Postgres do Kaizen, que o lê como `jsonb` e grava. Nenhum valor passa por número do JavaScript, e nenhuma data passa por `Date`. Assim nada se arredonda nem muda de fuso.
- O documento vem com os filhos dentro: itens, pagamentos, parcelas com as suas baixas, e conferência. Numa consulta só, a leitura é consistente.
- Medido em 27/09:
  - uma tabela de 1.029 linhas voltou inteira numa chamada, em menos de 1 s;
  - um valor de 60 milhões de caracteres voltou completo;
  - cada consulta tem no máximo 30 s (`statement_timeout`).
- Cuidados com o SQL que vai para a API:
  - colunas sempre com apelido único;
  - nada de `select *`, comentário ou `;`;
  - datas escritas como `'AAAA-MM-DD'`, porque a sessão do ERP está em `DMY`;
  - nenhuma conta que gere `numeric` gigante ou `NaN`, porque derruba a consulta com um erro 400 genérico.

### 5.3 Execução de hora em hora

1. Pega a trava (`pg_try_advisory_lock`). Se outra execução estiver rodando, registra `pulada` e sai.
2. Registra o início em `execucao`. Aplica as migrações que faltam.
3. **Confere as colunas.** Uma consulta ao `information_schema` com a lista de pares (tabela, coluna) que as consultas usam. Se faltar um, é falha: "o ERP mudou a coluna X". A lista conferida em 27/09 tem 107 pares, e todos existem.
4. **Confere empresa e local.** Se aparecer empresa ou local de estoque diferente de 1, é falha: é mudança de estrutura, que precisa de decisão.
5. **Lê os documentos,** sempre acima do corte. Entram:
   - os novos: `oid` acima do maior já visto. Isso pega a venda do caixa sem internet que chega horas depois;
   - os criados, fechados ou cancelados hoje ou ontem: `datahora` ou `datahoramovimento` a partir de ontem, ou com linha em `documento_cancelamento_historico` a partir de ontem;
   - os que no Kaizen ainda têm parcela pendente, para ver se foram pagos.
6. **Lê a lista de documentos vivos:** todos os `oid` de documento acima do corte.
   - Documento do Kaizen que não está na lista foi apagado no ERP. Sai do Kaizen, com aviso (número, tipo, data).
   - Se a lista vier vazia ou com menos da metade dos documentos do Kaizen, é falha, e nada é apagado.
7. **Lê os movimentos de estoque novos** (acima do maior `oid` já visto e do corte), **a foto do estoque** e **os cadastros** (inteiros; são pequenos).
8. **Grava tudo numa transação.**
   - Cada documento lido é atualizado, e os seus filhos são trocados por inteiro. O que sumiu do documento (item trocado numa regravação, baixa estornada) sai.
   - `visto_em` só é preenchido na primeira vez.
   - Rodar duas vezes dá o mesmo resultado.
   - Se algo falhar, a transação é desfeita e o Kaizen fica como na hora anterior.
9. **Confere e registra.** Códigos sem tradução, movimentos que não batem com a foto e fechamento que só tem linhas abaixo do corte viram avisos. Registra o fim, as contagens e o resultado, e manda o Telegram quando for o caso (6.2).

São cerca de 10 chamadas por execução, perto de meio minuto.

### 5.4 Execução da noite (22h)

1. Faz tudo o que a execução da hora faz.
2. **Relê todos os documentos desde a virada,** em fatias de um mês para caber nos 30 s por consulta, e todos os movimentos de estoque acima do corte, trocando o que estiver diferente. Isso pega qualquer mudança antiga e preenche as colunas novas.
3. **Compara os totais por dia desde 28/09.** O ERP, numa consulta, e o Kaizen, no banco dele, calculam por `datahora::date`:
   - número de documentos por modelo e status;
   - soma de `valtotalliquido` dos itens;
   - soma de `valor` dos pagamentos;
   - número e soma das parcelas e das baixas.

   Todo dia diferente vira aviso, com os dois números.
4. Manda o resumo de avisos do dia (6.2).

### 5.5 Falha e aviso

**Falha:** o tradutor parou, e o Kaizen ficou com os dados da execução anterior.

- o ERP não respondeu, ou respondeu com erro;
- uma coluna esperada sumiu;
- apareceu outra empresa ou outro local de estoque;
- a lista de documentos vivos veio vazia ou caiu mais da metade;
- erro ao gravar no banco do Kaizen.

**Aviso:** os dados entraram, mas algo pede atenção.

- código sem tradução;
- documento apagado no ERP;
- fechamento de caixa só com linhas abaixo do corte. É o caso de um fechamento novo que pegue os números 68, 71, 74, 98, 99 ou 118 e em que o ERP regrave a linha de teste em vez de criar outra;
- movimento de estoque que não bate com a foto;
- total do dia diferente do ERP;
- execução esperada que não aconteceu;
- execução pulada por sobreposição.

## 6. Onde roda

### 6.1 VPS

- **Stack `kaizen`,** com um serviço, `tradutor`, ligado à rede padrão da stack `prumo` (`prumo_default`, declarada como externa) para alcançar o `postgres:5432`. O Kaizen nunca faz `docker stack deploy` da stack `prumo`.
- **Imagem:**
  - `node:24.18.0-alpine`, com a tag exata, porque o Node 24.0 e 24.1 não têm `import.meta.main`;
  - `tzdata` e `TZ=America/Fortaleza`;
  - `crond` do Alpine em primeiro plano;
  - TypeScript rodado direto pelo Node, sem compilação, como no Prumo.
  - A imagem é construída na VPS, com a tag do SHA do commit, e publicada com `--resolve-image never`. O código chega por `git clone` do repositório do Kaizen em `/opt/kaizen`, com uma chave de implantação nova, só de leitura, porque a chave do Prumo vale para outro repositório.
- **Horário** (crontab, com quebras de linha LF):
  - `0 8-19 * * 1-6`: execução da hora;
  - `0 22 * * 1-6`: execução da noite.
- **Segredo:** `kaizen_env_v1`, montado com nome fixo (`target: kaizen_env`), para que trocar por um `_v2` não exija mudar o código. Traz `MEUERP_TOKEN`, `KAIZEN_URL` (o banco, com o usuário `kaizen`), `TELEGRAM_TOKEN` e `TELEGRAM_CHAT`. O Node o lê com `--env-file=/run/secrets/kaizen_env`. Nenhum valor vai para arquivo nem para o repositório.
- **Banco:** uma única vez, antes de tudo, o dono cria o usuário `kaizen` (sem superusuário, com o fuso `America/Fortaleza`) e o esquema `kaizen` com dono `kaizen`. A partir daí, o próprio tradutor aplica as migrações (`sql/migracoes/NNN_*.sql`, em ordem, cada uma na sua transação, registrada em `kaizen.migracao`).
- **Implantação:** feita pelo dono, na VPS, como `root`, comando por comando, longe do minuto zero. O plano traz o roteiro. Eu não tenho acesso à VPS.
- **Backup:** o esquema `kaizen` não precisa de backup nesta fase, porque a execução da noite o refaz inteiro a partir do ERP. Só `visto_em` não se refaz. A cópia da Link (esquema `erp`) precisa do `pg_dump` único que o dono ficou de tirar em 27/09, com o sync do Prumo parado.

### 6.2 Telegram

- **Falha:** a mensagem sai na hora, em uma frase, por exemplo: "Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os números continuam os das 13h."
  - Enquanto continuar falhando, não repete.
  - Quando voltar, manda uma mensagem: "Kaizen: voltou a funcionar às 16h."
- **Avisos:** um resumo por dia, na execução das 22h, só se houver algum. Se o dia foi limpo, não chega nada.
- **Execução que faltou:** cada execução confere se a execução esperada anterior tem linha em `execucao`. Se não tiver, entra no resumo: "a leitura das 10h não aconteceu."
- **Se o próprio Telegram falhar,** a falha fica só no registro da execução.
- **O dono prepara:** um robô criado no BotFather e uma mensagem mandada para ele. O token e o número da conversa vão para o segredo.

### 6.3 No PC

- **Um Postgres 16 só do Kaizen** em Docker (`docker-compose.yml` no repositório), numa porta própria, separado do `link_postgres` do Prumo (porta 5433).
- **Testes:** só conectam em `localhost`. Uma guarda recusa qualquer outro endereço antes de conectar.
- **Na primeira tarefa do plano,** o repositório ganha:
  - `.gitignore` para arquivos de segredo (`.env*`, `*.pem`, `*.key`);
  - `.gitattributes` com LF para crontab e scripts;
  - `.claude/settings.json` bloqueando `ssh`, `scp`, `docker service`, `docker stack` e `docker secret`, como havia no Prumo.

## 7. Testes

Os testes usam `node:test`, rodam contra o Postgres local, e a contagem é conferida ("rodou N testes, esperados N"). Todos rodam antes de cada commit. Os exemplos de resposta do ERP são montados a partir dos casos reais do `FONTES.md`, sem nenhum dado de pessoa.

- **Só leitura:** o cliente recusa qualquer método ou caminho diferente do permitido, e qualquer SQL que não seja um único SELECT ou WITH.
- **Rodar duas vezes:** o esquema fica idêntico.
- **Casos reais:**
  - troco (pedido 116);
  - três formas de pagamento (pedido 87);
  - troca com crédito e uso do crédito (TM 61 e pedido 117);
  - devolução em dinheiro (TM 63);
  - orçamento fechado dias depois (o mesmo `oid` muda de OC para PA e ganha `fechado_em` novo);
  - venda cancelada depois de lida;
  - item trocado numa regravação (pedido 58);
  - documento apagado;
  - fechamento refeito (FC 118);
  - sangria (RS 97);
  - conta paga depois e baixa estornada.
- **Corte:** linha no corte ou abaixo não entra; tabela com corte 0 deixa entrar a primeira linha.
- **Números e datas:** `numeric(16,6)` e valores acima de 2^53 passam sem perder algarismo; `timestamp` sem fuso não se desloca, com a máquina em UTC ou em −03.
- **Falhas:** coluna sumida, ERP fora do ar, lista de vivos vazia (nada é apagado), erro no meio da carga (nada muda).
- **Avisos:** código sem tradução, movimento que não bate com a foto, execução que faltou, total diferente.
- **Telegram:** falha manda uma vez e a volta manda uma vez; resumo só com aviso.
- **Publicação:** crontab em LF, com o horário e o fuso certos; stack com o segredo em nome fixo e a rede externa; Dockerfile com a tag exata do Node.

**Ensaio com o ERP de verdade,** antes da VPS: o tradutor roda no PC, lendo o ERP, grava no Postgres local, e a comparação de totais precisa dar zero diferença.

## 8. Primeira semana de operação

As conferências que ficaram da Fase 1 viram tarefas do plano. Cada resposta é registrada no `FONTES.md`. Se alguma pedir coluna ou tradução nova, entra como migração, e a noite preenche o passado.

1. A primeira NFC-e e a primeira NF-e: modelo, status final, e se a venda fica um documento só ou dois. Se forem dois, entra a ligação entre eles (`documento_mercadoria.iddocumentoorigem` ou o que a nota usar).
2. O primeiro orçamento fechado em outro dia: `datahoramovimento` leva a data do fechamento? `datahoramovimento` vem sempre preenchido na venda do caixa?
3. Como cada venda se liga ao seu turno: o trio `idcaixaabertura` + `idusuarioabertura` + `idabertura` é único?
4. No primeiro fechamento com venda no crédito: o calculado da linha "Cartão Crédito" soma essas vendas?
5. Com o dono: as vendas de cada vendedor saem com o código dele?
6. O item da troca (`TM`) traz vendedor?
7. Os primeiros cancelamentos: da venda inteira e de item antes de fechar.
8. Se a pré-venda reserva estoque.
9. Proporção de vendas para o Consumidor Final 999007; itens por venda; atraso do caixa sem internet (`visto_em` − `criado_em`); a coluna `documento.gmt` na venda do caixa.
10. O primeiro fechamento que pegar um dos números 68, 71, 74, 98, 99 ou 118: o ERP cria linha nova de conferência, regrava a de teste ou falha?
11. As contas a pagar importadas de novo: número, datas e se todas entram acima do corte.

## 9. Pronto quando

1. Na VPS, a execução da hora roda das 8h às 19h e a da noite às 22h, de segunda a sábado, cada uma com a sua linha em `kaizen.execucao`.
2. As vendas, o estoque e o a pagar desde 28/09 estão no esquema `kaizen`, e a comparação da noite dá zero diferença em todos os dias desde 28/09.
3. Uma mensagem de teste chega ao Telegram do dono, e uma falha provocada no PC gera a mensagem certa.
4. Os testes passam, com a contagem conferida.
5. As 94 contas a pagar aparecem no Kaizen depois que o dono importá-las de novo. Isso depende do dono; se atrasar, fica como item à parte e não segura os outros quatro.

Depois disso, o dono confere com os relatórios do ERP, fora do fluxo de quem implementa (`OBJETIVO.md`, "Qualidade").

## 10. Riscos e limites conhecidos

- **VPS desligada:** nenhum aviso chega (decisão 2). A Fase 5 mostra no app a hora da última atualização.
- **Mudança do esquema interno do ERP:** o tradutor para, com aviso, até a consulta ser corrigida. Não grava número errado sem avisar.
- **Cota de chamadas compartilhada:** o limite de cerca de 20 por minuto é por token. Consultas manuais durante uma execução a atrasam, sem errar.
- **30 s por consulta no ERP:** a releitura da noite vai em fatias de um mês. Se um mês passar de 30 s, a fatia diminui.
- **Saldo que muda sem linha no histórico:** aparece como aviso de movimento que não bate com a foto. Para o "agora", vale a foto.
- **Restos de teste:** 30 linhas de conferência e 25 de histórico com números de documento que vão se repetir já nesta semana. O corte as ignora; o caso de regravação vira aviso (5.5).
- **Números de documento repetidos:** se um documento for apagado e o seu número reaproveitado, os filhos que o suporte deixar para trás grudam no novo. O corte só protege os restos de 26/09; nos novos, a comparação da noite e os avisos de conferência mostram a diferença.
- **postgres.js 3.4.9**, se for o driver, tem armadilhas registradas no Prumo:
  - rollback depois de a conexão cair derruba o processo;
  - `end()` sem prazo não termina;
  - `begin` com mais de uma conexão é recusado;
  - parâmetro `date` vira `Date` do JavaScript.

  O plano escolhe o driver com isso à vista.
- **Horário de verão:** o banco do ERP está em `America/Sao_Paulo`, igual a Fortaleza enquanto não houver horário de verão. Se ele voltar, as horas gravadas pelo ERP mudam de sentido. O teste de datas e a coluna `gmt` (seção 8) servem de alarme.
- **Sync do Prumo:** enquanto continuar agendado, ele troca o esquema `erp` a cada hora. O Kaizen não cria nada que dependa de `erp` nesta fase.

## 11. Para as próximas fases

- **Fase 3 (Link):**
  - o valor do item pela conta da Link (decisão 4);
  - o vale-crédito e a devolução em dinheiro, que vêm do razão;
  - a regra de conta a pagar da Link, com conta de destino e sinal na parcela;
  - a fronteira do a pagar: as contas abertas da Link foram migradas para o ERP novo, então a mesma conta existe nas duas fontes;
  - as notas de entrada, para a primeira entrada;
  - a `de_para` de vendedores e do Consumidor Final;
  - a classificação dos produtos só da Link pelas planilhas da migração;
  - a data de parcela zero (0001-01-01);
  - os 5 testes da implantação que continuam somando (a negociação 8 está cancelada).
- **Fase 4 (regras):**
  - "venda válida", vendido, devoluções e líquido;
  - `fechado_em` vazio;
  - sangria que paga despesa;
  - Consumidor Final fora da carteira;
  - saldo por dia refeito dos movimentos;
  - primeira entrada;
  - D+1 do cartão.

## Anexo — medições de 27/09/2026 usadas aqui

- Corte por tabela: seção 4.4. A consulta usou `max(oid)` e `count(*)` por tabela, às 13h13.
- Foto do estoque na virada: `docs/medicoes/estoque-virada-2026-09-27.json` (13h38).
- Colunas conferidas no `information_schema`: 107 pares (tabela, coluna), todos existentes. Valores em `numeric(14,2)`, `numeric(14,6)`, `numeric(16,3)` e `numeric(16,6)`; datas em `timestamp` sem fuso, inclusive `dtvencimento`, `dtpagamento` e `dtlancamento`.
- Formato das respostas do SQL:
  - `numeric` como número JSON cru;
  - `timestamp` sem fuso como `"AAAA-MM-DDTHH:MM:SS.ffffff"`;
  - `json_agg` como texto com o JSON dentro;
  - no máximo 100 linhas por página;
  - 30 s por consulta;
  - sessão em `America/Sao_Paulo` e `DMY`.
- Estado do ERP em 27/09: 10 documentos (máximo `_iddocumento` 49); nenhum pagamento, parcela ou baixa; nenhuma conta a pagar; 1.847 linhas de histórico de estoque; os restos estão em `documento_conferencia_caixa` (30), `mercadoria_estoque_historico` (25) e `documento_auditoria` (3, do documento 58).
