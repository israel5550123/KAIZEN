# Fase 2 — esquema próprio e tradutor do ERP novo

**Desenho aprovado seção por seção pelo dono em 27/09/2026, e a spec escrita aprovada no mesmo dia.** Este documento é a spec da Fase 2 do `OBJETIVO.md`. Ele diz o que se guarda, de onde vem cada coluna nas duas fontes, como o tradutor lê e grava, onde roda, como avisa, como se testa e quando a fase fecha. Depois de escrita, ela passou por uma revisão independente com cinco lentes e um verificador: dos 92 achados, 59 se sustentaram e estão incorporados aqui. O plano de implementação vem depois, a partir daqui.

## 1. Resumo

- O Kaizen passa a ter um banco próprio: o esquema `kaizen`, no Postgres da VPS. Ali ficam:
  - os documentos do ERP (venda, orçamento, troca, caixa, conta), com os itens, os pagamentos, as parcelas e as baixas;
  - a conferência do caixa;
  - os movimentos e a foto do estoque;
  - os cadastros.
- Um tradutor lê o ERP novo de hora em hora, das 8h às 19h, e relê tudo às 22h, de segunda a sábado. Ele só lê, pelo SQL da API, e nunca escreve no ERP.
- O tradutor copia; não decide regra. O que é "venda válida", "vendido" e "quebra" fica para a Fase 4. Os códigos do ERP ficam como vieram, e uma tabela de tradução diz o que cada um significa.
- Toda noite, os totais de cada dia no Kaizen são comparados com os do ERP. A fase fecha depois de seis dias seguidos de operação na VPS com diferença zero, todas as execuções registradas e o aviso de falha chegando pelo Telegram.
- **O que o dono vê no fim da fase:** ainda nenhum número da loja; os indicadores são da Fase 4, e o app, da Fase 5. Ele recebe no Telegram:
  - uma mensagem quando a leitura falha e outra quando volta;
  - às 22h, um resumo, só se houver aviso.

  E recebe um comando de conferência para comparar os dados copiados com os relatórios do ERP (seção 10).
- **Nada se perde até o tradutor ir ao ar.** A primeira execução lê tudo o que existe desde a virada. Só a hora em que cada venda foi vista pelo Kaizen começa a valer nesse dia.

## 2. Decisões

| # | Decisão | Quem e quando |
| --- | --- | --- |
| 1 | O tradutor lê o ERP novo **só pelo SQL** (`POST /api/consulta/sql/v1`, só SELECT), não pelos endpoints. Os endpoints não dispensam o SQL (caixa, contas pagas, fornecedor) e só filtram documento pela data de criação, o que traria duas exceções: o orçamento fechado dias depois no próprio documento e o cancelamento fora da janela. Proteção contra mudança do esquema interno: o tradutor confere as colunas a cada execução e para com aviso. | Dono, 27/09 (fecha a questão em aberto do `FONTES.md`) |
| 2 | Aviso de falha **pelo Telegram, mandado pelo próprio tradutor**. O dono aceitou o limite: se o tradutor nem rodar (VPS desligada, serviço parado, agendamento quebrado depois de uma atualização), não chega aviso na hora. Quando ele voltar a rodar, o resumo diz que houve leitura faltando. | Dono, 27/09 |
| 3 | Formato do esquema: **documento em palavras do negócio**. Uma tabela de documento para todos os tipos, com itens, pagamentos, parcelas e conferência. O tipo vem de uma tabela de tradução; "venda válida" é regra da Fase 4. | Dono, 27/09 |
| 4 | **Exceção declarada**, para a Fase 3: o tradutor da Link calcula o valor líquido do item com a conta da própria Link, porque ela não grava o valor por item. No item vendido, a conta é o arredondamento meio-par por item e o rateio do desconto e do acréscimo da negociação (`C:\Projetos\prumo\docs\DICIONARIO.md`), conferida contra `valor_total_venda`. No item devolvido, é `qtd × preco_liquido_unitario`, conferida contra `valor_total_devolucao`. É a única exceção a "o tradutor não recalcula". | Dono, 27/09 (o item devolvido foi incluído no aval da spec) |
| 5 | O tradutor roda numa **stack própria, `kaizen`**, ligada à rede do Postgres da stack `prumo`. O banco é o mesmo do `OBJETIVO.md`; o Kaizen nunca reimplanta a stack `prumo`. | Dono, 27/09 |
| 6 | O a pagar entra inteiro: todas as parcelas pendentes, de qualquer data, e não só as de 28/09 em diante. | Dono, 27/09 (responde à pergunta da Fase 1) |
| 7 | As conferências da operação real ("Na operação real, a partir de 28/09" no `FONTES.md`) viram tarefas desta fase (seção 9). A conferência da DRE sai da lista: o Kaizen não usa a DRE. | Dono, 27/09 |

### Alternativas consideradas

O critério que decidiu cada uma é o do `OBJETIVO.md`: menos peças, menos regras, menos dependências, nenhuma exceção para funcionar.

- **Endpoint onde existe, SQL só para o que falta** (decisão 1). O dono preferia de início. Perdeu porque o SQL continuaria necessário (caixa, contas pagas, fornecedor), e o endpoint traria duas exceções: orçamento fechado dias depois e cancelamento fora da janela.
- **Healthchecks.io avisando por e-mail ou Telegram** (decisão 2). Cobriria também o "nem rodou", mas é um serviço de fora a mais. O dono escolheu o Telegram direto, aceitando o limite.
- **E-mail direto pelo Gmail** (decisão 2). Pedia uma senha de app e não cobre o "nem rodou" melhor que o Telegram.
- **Uma tabela por fato: vendas, trocas, turnos, contas** (decisão 3). Deixaria as consultas mais diretas, mas faria o tradutor decidir o que é venda. Se a NFC-e sair como segundo documento, seria preciso mudar o tradutor e reler tudo.
- **Cópia das tabelas do ERP como estão** (decisão 3). Contraria o "esquema próprio" do `OBJETIVO.md`, e a Link não caberia.
- **Estoque diário por foto do saldo.** Perdeu para o histórico de movimentos: um dia sem leitura não se refaz, e o tradutor entra no ar dias depois de 28/09.
- **Reimplantar a stack `prumo` com o serviço do Kaizen dentro** (decisão 5). Arriscaria reiniciar ou alterar o banco, cuja definição mora no repositório arquivado do Prumo.
- **Guardar as partes do valor do item da Link e calcular na Fase 4** (decisão 4). Deixaria na Fase 4 uma regra que só vale para a Link.

## 3. O que o dono faz

**Hoje, 27/09, se ainda não fez.** Na VPS, como `root`, antes das 8h de segunda:

1. Parar o sync do Prumo (`docker service scale prumo_sync=0`) e conferir `0/0` em `docker service ls`.
2. Tirar `pg_dump -Fc -n erp` e copiar o arquivo para fora da VPS (para o PC). Conferir com `pg_restore --list` que as 26 tabelas estão lá. Esse arquivo é a única reserva da história da Link, de abril a 25/09.
3. Daqui em diante, se a stack `prumo` for reimplantada, é sempre com `PRUMO_SYNC_REPLICAS=0`. Ela nunca é removida (`docker stack rm prumo`), porque carrega o banco do Kaizen.

**Antes da implantação:**

4. Importar de novo as contas a pagar.
5. Criar um robô no BotFather do Telegram e mandar uma mensagem para ele. O token só vai para o segredo da VPS, no dia da implantação.
6. ~~Autorizar o ajuste no `OBJETIVO.md`~~: autorizado e feito em 27/09.
7. ~~Responder se a exceção da decisão 4 cobre o item devolvido~~: cobre (27/09).
8. ~~Tomar ciência do limite do estoque antes de 28/09 (seção 11)~~: ciente (27/09).
9. Conferir os documentos acima do corte com data anterior a 28/09 (seção 5.4). Os 44 ajustes de custo de 27/09, das 14h20 às 14h33, são reais (dono, 27/09; `FONTES.md`, decisão 13). O que aparecer depois disso até a abertura de 28/09 volta ao dono.

**Na implantação,** pelo roteiro do plano, na VPS, como `root`, entre hh:10 e hh:50, fora da hora em que o tradutor roda. Quem implementa não tem acesso à VPS.

10. Criar a chave de implantação no GitHub.
11. Criar o usuário e o esquema `kaizen` no Postgres, com senha nova.
12. Criar o segredo `kaizen_env_v1`.
13. Publicar a stack `kaizen` e mandar a mensagem de teste.

**Na primeira semana:**

14. Conferir com a equipe a lista de vendas por vendedor (seção 9, item 5).
15. Avisar antes se o suporte for apagar algum documento direto no banco.

**No fechamento:**

16. Rodar o comando de conferência e comparar com o ERP (seção 10).

## 4. Escopo

**Entra na Fase 2:**

- o esquema `kaizen` inteiro, desenhado para receber as duas fontes;
- o tradutor do ERP novo;
- a rotina na VPS, o registro de cada execução e o aviso pelo Telegram;
- os testes e o ensaio com o ERP de verdade;
- as conferências da operação real (seção 9).

**Não entra:**

- o tradutor da Link (Fase 3). Aqui, o esquema só precisa ser capaz de receber a Link, e a coluna "Link" das tabelas abaixo diz de onde cada coisa virá;
- as regras dos indicadores (Fase 4);
- meta, saldo do banco, feriados, API e app (Fase 5).

## 5. Esquema `kaizen`

### 5.1 Convenções

- **Onde fica:** banco `prumo`, esquema `kaizen`, no Postgres 16 da stack `prumo`. É o mesmo banco da cópia da Link (esquema `erp`), para que a Fase 3 leia `erp` direto. O usuário `kaizen` é dono do esquema `kaizen` e não é superusuário. A leitura de `erp` só é dada na Fase 3, com o sync do Prumo parado: enquanto ele roda, recria `erp` a cada hora, e a permissão se perderia.
- **Nomes:** em português, snake_case.
- **Valores e quantidades:** `numeric` sem precisão fixa. Guarda exatamente o que a fonte gravou (no ERP novo, até 6 casas), sem arredondar.
- **Datas e horas das fontes:** `timestamp` sem fuso, na hora da loja, como as duas fontes gravam. Lançamento, vencimento e data de pagamento em `date`: os 10 primeiros caracteres do `timestamp` do ERP.
- **Carimbos do próprio Kaizen** (`visto_em`, `lido_em`, execução): `timestamptz`.
- **Fuso:** o tradutor fixa o fuso da sessão ao conectar (`set time zone 'America/Fortaleza'`), no PC e na VPS, sem depender da configuração do usuário. "Hoje" e "ontem" são calculados no Node, com `TZ=America/Fortaleza`, e vão às consultas como `'AAAA-MM-DD'`.
- **Códigos de cadastro** (produto, pessoa, funcionário): `text`. Na Link há produto com código "CFOP5949".
- **Códigos do ERP** (modelo, status, movimento, financeiro, forma, sentido): guardados crus, como vieram. O significado vem da tabela `traducao` (5.4).
- **Origem:**
  - O documento tem `fonte` (`meuerp` ou `link`), `origem_tabela` e `origem_id` (`text`). As linhas filhas têm `origem_tabela` e `origem_id` e herdam a fonte do documento.
  - No ERP novo, `origem_id` é o `oid` da linha. Cada tabela do ERP tem o seu contador de `oid`, que não voltou ao início na limpeza de 26/09. Já o número do documento (`_iddocumento`) usa outro contador, que o suporte zerou na limpeza. Por isso ele se repete: em 27/09 ele foi de 1 a 49 e depois pulou para 94.
  - Na Link, `origem_id` é a chave da tabela de origem.
- **Unicidade:**
  - `(fonte, origem_tabela, origem_id)` no documento e em `estoque_movimento`;
  - `(documento_id, origem_tabela, origem_id)` em item, pagamento, parcela e conferência;
  - `(parcela_id, origem_tabela, origem_id)` na baixa.

  `estoque_atual`, `estoque_virada` e os cadastros guardam estado e são chaveados por `(fonte, produto)` ou `(fonte, codigo)`.
- **Transformações que o tradutor do ERP novo faz,** e nenhuma outra:
  - zero que quer dizer "nenhum" (vendedor 0, turno 0) vira vazio;
  - datas de parcela e baixa viram `date`;
  - nos cadastros, junta nome e sobrenome e traduz a bandeira de inativo (5.3).
- **Só o que os indicadores precisam.** A releitura da noite relê tudo o que está acima do corte (6.4). Por isso, uma coluna acrescentada depois se preenche sozinha na primeira noite.

### 5.2 Tabelas de fato

#### `documento` — todo documento do ERP

| Coluna | Tipo | Significado | ERP novo (SQL) | Link (Fase 3) |
| --- | --- | --- | --- | --- |
| `id` | bigint identity | chave do Kaizen | — | — |
| `fonte`, `origem_tabela`, `origem_id` | text | de onde veio | `'documento'`, `documento.oid` | `'negociacao'` `id_negociacao`; `'caixa_fechamento'` `id_caixa_fechamento`; `'pc_lancamento'` `id_pc_lancamento` (sangria, suprimento, conta); `'nota_entrada'` `id_entrada` |
| `codigo` | text | número que as pessoas veem | `_iddocumento` | `venda_codigo` (venda), `orcamento_codigo` (orçamento); nos outros, o id |
| `modelo` | text | tipo do documento, cru | `modelo` | `negociacao.tipo` e `negociacao.venda`, crus e juntos, porque a Link só distingue venda de orçamento por `venda`. Nas outras tabelas, o que a Link grava (`pc_lancamento.obs` ou a conta de destino). Nunca uma palavra inventada |
| `status` | text | situação, crua | `status` | `caixa.inativo` |
| `movimento` | text, pode faltar | saída, entrada ou nenhum, cru | `tipomovimento` (S, E, N) | vazio; a tradução do modelo supre (5.4) |
| `financeiro` | text, pode faltar | recebe, paga ou nada, cru | `tipomovimentofinanceiro` (R, P, N) | vazio; a tradução do modelo supre (5.4) |
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
| `sentido` | text | S = saiu da loja; E = entrou; N = não mexe no estoque | `tipomovimento` do documento | S no item vendido; E no item devolvido e no item de nota |
| `produto` | text | código do produto | `idmercadoriavariacao` | `produto.produto_codigo` (via `id_produto`) |
| `quantidade` | numeric, pode faltar | | `qtd` (vazia no ajuste de custo `AC`) | `qtd` (nota: `qtd_produto`) |
| `valor_liquido` | numeric, pode faltar | valor do item depois do desconto | `valtotalliquido` (vazio nos ajustes `AS` e `AC`) | vendido: a conta da Link (decisão 4). Devolvido: `qtd × preco_liquido_unitario`, sem arredondar, conferido contra `valor_total_devolucao` arredondando linha a linha (decisão 4) |
| `vendedor` | text, pode faltar | código do vendedor | `idpessoafuncionario` (0 ou vazio → vazio) | `negociacao.id_usuario` |

#### `documento_pagamento` — forma e valor de cada documento

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `documento_id`, `origem_tabela`, `origem_id` | | | `'documento_pagamento'`, `oid` | `'caixa_parcela'` `id_caixa_parcela`; parcelas do razão |
| `forma` | text | forma de pagamento, crua | `idpagamento` (1 a 5) | `forma_pagamento` com `credito_ou_debito_cartao`. O vale usado é a conta do razão `2.1.2.03`, com valor negativo; a devolução em dinheiro, a conta `1.1.1.01`, com valor negativo. A `traducao` da Link diz que `2.1.2.03` é troca e `1.1.1.01` é dinheiro |
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
| `descricao` | text, pode faltar | | `descricao` | `documento` |

A Fase 3 acrescenta à parcela da Link a conta de destino e o sinal, para que a regra de conta a pagar da Link fique na Fase 4 e não no tradutor.

#### `baixa` — pagamento de uma parcela

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `id`, `parcela_id`, `origem_tabela`, `origem_id` | | | `'documento_parcela_pagamento'`, `oid`. Liga à parcela por `_iddocumento`, `_idsequencia` e `_idparcela`, na própria consulta | o lançamento de liquidação (`pc_lancamento_fonte` → parcela) |
| `pago_em` | date | data da baixa no ERP | `dtpagamento` | `pc_lancamento.data_emissao` da liquidação |
| `valor` | numeric | | `valpagamento` | valor da fonte |
| `forma` | text, pode faltar | | `idpagamento` | vazio |
| `status` | text, pode faltar | situação, crua | `status` (E vale, C cancelada) | vazio (vale) |

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
| `id`, `fonte`, `origem_tabela`, `origem_id` | | | `'mercadoria_estoque_historico'`, `oid` | não existe |
| `produto` | text | | `idmercadoriavariacao` | |
| `documento` | text | número do documento que mexeu | `_iddocumento` | |
| `momento` | timestamp | data do documento. O ERP grava a hora do documento, e não a do movimento, inclusive no estorno de uma venda cancelada | `datahora` | |
| `saldo_antes`, `saldo_depois` | numeric | | `qtdsaldoatual`, `qtdnovosaldo` | |
| `visto_em` | timestamptz | primeira vez que o tradutor viu a linha; nunca muda. Guarda o dia real de um estorno, que `momento` não guarda | — | |

**Ordem.** O último movimento de um produto é o de maior `oid` (a ordem de gravação no ERP), e não o de maior `momento`. Uma venda do caixa sem internet e um orçamento convertido depois gravam movimento novo com hora antiga.

**Saldo esperado.** Ele se refaz daqui para qualquer dia, inclusive nos dias em que o tradutor não rodou, salvo depois de um salto sem linha (ver `estoque_atual`). É regra da Fase 4:

- vale o `saldo_depois` do último movimento;
- sem movimento acima do corte, vale a quantidade de `estoque_virada`;
- produto que não está na virada começa em 0.

#### `estoque_atual` — foto do saldo a cada execução

| Coluna | Tipo | Significado | ERP novo | Link |
| --- | --- | --- | --- | --- |
| `fonte`, `produto` | text | chave | `mercadoria_estoque._idmercadoriavariacao` (empresa 1, local 1) | `produto.produto_codigo` |
| `quantidade` | numeric | | `qtdsaldo` | `produto.qtd_estoque` da cópia final |
| `lido_em` | timestamptz | | hora da leitura | hora da cópia |

- **Troca inteira:** a parte do ERP novo é trocada inteira a cada execução.
- **Mesmo instante:** foto e movimentos saem da mesma consulta ao ERP, para serem do mesmo instante.
- **Para que serve:** mostra o "agora" e confere os movimentos. Quando o saldo esperado de um produto não bate com a foto, sai um aviso com o produto, o último `saldo_depois` e a foto. Isso acontece quando o saldo muda sem deixar linha, como já aconteceu no inventário "TESTE" (`FONTES.md`, "Simulação do dono").
- **Registro do salto:** esse aviso, guardado em `execucao.avisos` com a hora da execução, é o registro do salto para a Fase 4, que decide como usá-lo.

#### `estoque_virada` — saldo de cada produto na virada

Tem as colunas `produto` e `quantidade`. Vem de `docs/medicoes/estoque-virada-2026-09-27.json`, medido em 27/09 às 13h38, antes da operação: 1.029 produtos, 714 com estoque, 54.660,5 unidades, nenhum negativo.

Ela é o ponto de partida do saldo de cada produto e a base da conferência entre movimentos e foto. O que existia antes dela no histórico fica abaixo do corte e não é lido.

### 5.3 Cadastros

Os cadastros guardam o estado atual e são chaveados por `(fonte, codigo)`. O ERP novo manda. Da Link entram só os produtos e as pessoas que não existem no ERP novo (Fase 3).

#### Como se lê

- A tabela principal manda: `mercadoria_variacao`, `pessoa` e `pessoa_funcionario` da empresa 1. As outras entram por junção à esquerda; sem linha, a coluna fica vazia.
- De `pessoa_endereco` vale um endereço por pessoa: o principal e ativo (`flagprincipal` = T, `flaginativo` = F). Se houver mais de um, vale o de menor `_idendereco`.
- `ativo` = `flaginativo` diferente de `'T'`.
- `nome` = nome e sobrenome, separados por um espaço, sem espaço sobrando.

#### O que nunca se apaga

- Pessoa, produto e funcionário que somem da fonte ficam como estavam, com o `lido_em` da última leitura que os trouxe. A história precisa do nome.
- `produto_fornecedor` não guarda nome e é trocada inteira a cada execução, só com as ligações ativas.

| Tabela | Colunas | ERP novo | Link (Fase 3) |
| --- | --- | --- | --- |
| `produto` | `codigo`, `descricao`, `grupo`, `secao`, `subgrupo`, `marca`, `custo` (pode faltar), `ativo`, `lido_em` | `mercadoria_variacao` (`_idmercadoriavariacao`, `descricao`, `idmarca` → `mercadoria_marca.descricao`); `mercadoria` via `idmercadoria` (`idgrupo`, `idsecao`, `idsubgrupo` → `descricao` de cada tabela); `mercadoria_custo.valcusto` (sem linha → vazio, não zero); `mercadoria_variacao_empresa.flaginativo` | só os produtos que não existem no ERP novo, classificados pelas mesmas planilhas de-para da migração (`C:\Projetos\migrção erp\depara\`) |
| `produto_fornecedor` | `produto`, `fornecedor` | `mercadoria_variacao_pessoa` (`flaginativo` = F) | não entra: os produtos só da Link não têm estoque |
| `pessoa` | `codigo`, `nome`, `cpf_cnpj`, `bairro`, `municipio`, `ibge`, `uf`, `ativo`, `lido_em` | `pessoa` (`nome`, `sobrenome`, `cnpjcpf`, `flaginativo`); `pessoa_endereco` (`bairro`, `idibgemunicipio`, `uf`); `municipio.nome` por `idibgemunicipio` = `_idmunicipio` | `cliente` (`cpf`/`cnpj`, `bairro`, `id_cidade` → `cidade.cod_cidade`, que já é o IBGE) |
| `funcionario` | `codigo`, `nome`, `usuario`, `tipo`, `ativo`, `lido_em` | `pessoa_funcionario` (`_idpessoa`, `idusuario`, `tipo` cru, `flaginativo`) + `pessoa.nome` | `usuario` (id e primeiro nome; Israel, Luis Henrique e Sistema só existem lá) |
| `de_para` | `entidade`, `fonte`, `codigo_origem`, `codigo_kaizen` | — | liga a mesma pessoa ou produto entre as fontes: vendedores da Link, Consumidor Final 1229 → 999007. Preenchida na Fase 3 |

O CPF/CNPJ fica porque a Fase 3 liga o cliente por ele (`OBJETIVO.md`). Latitude e longitude não entram: a geolocalização é dado do Kaizen (Fase 7), e o ERP não tem nenhuma.

### 5.4 Controle

**`traducao` (fonte, campo, codigo, valor)** — o que cada código cru significa.

- A visão `documento_negocio` (5.5) e as regras da Fase 4 leem por aqui.
- Código que aparece sem tradução vira aviso.
- Corrigir ou acrescentar uma linha corrige o passado sem reler o ERP.
- Na fonte `link`, a `traducao` dá também, pelo modelo, o movimento e o financeiro (campos `movimento_pelo_modelo` e `financeiro_pelo_modelo`), porque a Link não os tem.

Carga inicial, ERP novo:

| Campo | Código → valor |
| --- | --- |
| `tipo` (pelo `modelo`) | PA pedido · 65 nfce · 55 nfe · 59 cfe · PV pre_venda · OC orcamento · CN condicional · TM troca · AX abertura_caixa · SF suprimento · SD suprimento_adicional · RS sangria · RT sangria · FC fechamento_caixa · CP conta_pagar · LE inventario · PE perda · TS transferencia · AS ajuste_estoque · AC ajuste_custo · LP liberacao · IM importacao |
| `situacao` (pelo `status` do documento) | E emitido · C cancelado · R rascunho · O conferido · V enviado · X excluido · I inutilizado · Z contingencia |
| `movimento` | S saida · E entrada · N nenhum |
| `financeiro` | R recebe · P paga · N nenhum |
| `forma` | 1 dinheiro · 2 pix · 3 credito · 4 debito · 5 troca |
| `status_parcela` | P pendente · B baixada |
| `status_baixa` | E valida · C cancelada |
| `sentido` | S saida · E entrada · N nenhum |

Ficam de fora de propósito, e geram aviso se aparecerem acima do corte: os modelos AM, EM e RU, o financeiro E e o status C de parcela. Nenhum deles tem significado conhecido. O RT tem nome no próprio ERP ("retirada transferência") e fica traduzido, com conferência na seção 9.

**`corte` (fonte, tabela, oid)** — o corte da virada. Linha do ERP novo com `oid` até o corte da sua tabela não entra.

- **O que fica abaixo do corte:** os testes, a importação e os restos da limpeza. Ficam também documentos reais de antes da operação: o `LE` 48 (a carga do estoque), os 5 `AS` das 22h40 e os ajustes de custo.
- **Por que isso não se perde:** o efeito deles no estoque está em `estoque_virada`. No Kaizen, ela substitui a regra de data da decisão 12 do `FONTES.md` e a leitura da carga do estoque do `LOJA.md`.

O corte foi medido em 27/09/2026 às 13h13 (o histórico, às 13h38):

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
- **Documentos entre o corte e a abertura de 28/09.** Antes do ensaio e antes da primeira execução na VPS, uma consulta lista os documentos acima do corte com `datahora` anterior a 2026-09-28.
  - As contas a pagar reimportadas (modelo `CP`) são esperadas.
  - Qualquer outro vai para o dono, que decide. Em 27/09 já são 44 ajustes de custo (`AC`), feitos das 14h20 às 14h33, com números 94 a 137 e `oid` 185 a 228.
  - A decisão fica registrada no `FONTES.md`. Se for para excluir, o corte muda por migração, antes da primeira execução.
- **Restos da conferência de caixa.** As 30 linhas de teste estão guardadas com os seus valores em `docs/medicoes/conferencia-restos-2026-09-27.json` (14h34). Às 14h34, três delas (dos números 98, 99 e 118) já estavam penduradas em ajustes de custo novos.
  - Se um fechamento novo tiver linha de conferência no corte ou abaixo com valor diferente do medido, o ERP regravou a linha de teste. O aviso (6.5) diz isso ao dono, que decide por migração se ela entra.
  - Se o ERP recusar o fechamento, o dono pede ao suporte que apague as 30 linhas.

**`execucao`** — uma linha por execução:

- `id`, `tipo` (hora ou noite, conforme o que foi feito) e `manual` (sim ou não). A execução manual não substitui a execução esperada.
- `inicio`, `fim`.
- `resultado`: ok, aviso, falha ou pulada.
- `mensagem` (o motivo da falha), `contagens` (jsonb, por assunto) e `avisos` (jsonb).
- `telegram_ok`: se a mensagem desta execução foi aceita pelo Telegram.

A linha é gravada fora da transação da carga, para que a falha também fique registrada. Linha sem `fim` de outra execução, que não esteja rodando, é tratada como falha pela execução seguinte.

**`migracao` (nome, aplicada_em)** — as mudanças de estrutura já aplicadas.

- `corte`, `traducao` e `estoque_virada` também entram por migrações versionadas no repositório.
- O SQL da virada é gerado uma vez a partir do arquivo de medição e commitado. Um teste confere 1.029 produtos, 714 com estoque e 54.660,5 unidades.
- Mudança de tradução ou de corte é uma migração nova.

### 5.5 Visão `documento_negocio`

É o documento em palavras do negócio: `documento` mais `tipo`, `situacao`, `movimento` e `financeiro`, tirados de `traducao`. Quando a coluna crua vem vazia (Link), usa a tradução pelo modelo. Assim a regra do vendido da Fase 4 é a mesma nas duas fontes. É o que as regras da Fase 4 leem.

### 5.6 Como cada indicador sai daqui

Esta é a conferência de que o esquema responde o destino. As regras em si são da Fase 4.

#### Vendas

- **Vendido:** itens de sentido S de documento emitido, de saída, que recebe, com vendedor, pela data de `fechado_em`. Quando `fechado_em` faltar, a Fase 4 decide, com aviso.
- **Devoluções:** itens de sentido E de documento de tipo venda ou troca, na data e no vendedor do documento.
- **Líquido:** vendido − devoluções. Meta, ritmo e projeção leem o líquido, mais os feriados e as metas do Kaizen.
- **Ticket médio, itens por venda, venda por hora e por dia da semana:** documento e itens. Se a NFC-e sair como um segundo documento da mesma venda, a ligação entre os dois entra como coluna nova (seção 9).
- **ABC de clientes, RFV, clientes que pararam e região:** `documento.pessoa` e `pessoa`, sem o Consumidor Final.
- **Venda, mix e clientes por vendedor:** itens, produto e `de_para`.

#### Compras e estoque

- **ABC de produtos:** itens.
- **Giro:** vendido ÷ estoque médio, com o estoque médio refeito de `estoque_movimento`.
- **Cobertura e ruptura:** `estoque_atual` e a venda.
- **Encalhe:** saldo, última venda e primeira entrada.
  - Produto novo: o primeiro movimento que sobe o saldo.
  - Produto migrado: a primeira nota de entrada da Link (Fase 3).
  - O inventário de 26/09 não conta como entrada.
- **Custo zero:** `produto.custo` = 0 ou vazio.
- **Estoque negativo:** `estoque_atual`.
- **Por grupo, marca e fornecedor:** `produto` e `produto_fornecedor`.

#### Financeiro

- **Contas a pagar e folga:** parcelas pendentes de documento que paga, sem troca, mais o saldo digitado (Fase 5).
- **Fluxo realizado:**
  - entradas: pagamentos das vendas, sem a forma troca, com o cartão em D+1;
  - saídas: baixas válidas, sem a forma troca e sem sangria e suprimento. Se a sangria que paga despesa conta como saída é pergunta aberta do `FONTES.md`.
- **Fluxo previsto:** parcelas pendentes e o cartão em D+1.
- **Quebra por turno e forma:** `conferencia_caixa`, informado − calculado, sem a forma troca.
- **Gaveta e sangrias:** pagamentos dos documentos de caixa.
- **Recebíveis de cartão:** pagamentos em crédito e débito, com D+1.

## 6. Tradutor

### 6.1 Peças

Cada peça faz uma coisa e pode ser testada sozinha. Pastas:
- **`tradutor/`:** o código em TypeScript, com o teste de cada arquivo ao lado. Na Fase 3, o tradutor da Link reaproveita as peças comuns daqui: banco, migrações, registro, Telegram e janela.
- **`sql/`:** as migrações, as consultas ao ERP (`sql/erp/`), a carga (`sql/carga/`) e as consultas ao Kaizen (`sql/kaizen/`).
- **`ferramentas/`:** o contador de testes, o gerador da virada, o ensaio e a consulta livre ao ERP.
- **`publicacao/`:** Dockerfile, crontab, stack e o roteiro do dono.

1. **Cliente do ERP.** Faz as chamadas HTTP com o token.
   - Só deixa sair `POST /api/consulta/sql/v1` com um único SELECT ou WITH, sem `;`.
   - Antes de sair, recusa qualquer SQL que contenha, como palavra, `insert`, `update`, `delete`, `merge`, `truncate`, `drop`, `alter`, `create`, `grant`, `revoke`, `copy`, `call`, `do`, `execute`, `lock`, `set`, `reset`, `refresh`, `comment`, `nextval`, `setval`, `pg_sleep`, `lo_` ou `dblink`, como fazia a sonda da Fase 1. Um WITH que esconda um DELETE também é recusado.
   - Chama em série, no máximo 19 vezes por minuto, com prazo de resposta acima de 60 s. No erro 429, espera a virada do minuto e repete.
   - Nunca imprime o token. Devolve o corpo da resposta como texto.
2. **Consultas por assunto.** Arquivos `.sql`, um por assunto:
   - conferência de colunas;
   - conferência de empresa e local;
   - documentos com filhos;
   - lista de documentos vivos;
   - movimentos e foto do estoque, juntos;
   - produtos, pessoas, funcionários e fornecedores do produto;
   - comparação de totais.
3. **Carga.** Arquivos `.sql` que recebem o texto JSON da consulta e gravam no esquema `kaizen`, tudo numa transação.
4. **Comparação de totais,** na execução da noite.
5. **Registro e aviso:** a linha em `execucao` e as mensagens do Telegram.
6. **Migrações:** aplica as que faltam, na ordem, logo depois de pegar a trava e antes de registrar a execução.
7. **Publicação:** Dockerfile, agendamento, stack e segredos.

### 6.2 Como as consultas falam com o ERP

- **Uma chamada por assunto.** O SQL monta um JSON só.
  - Todo `json_agg` vai como `coalesce(json_agg(...), '[]')`, no documento, em cada lista de filhos e na lista de vivos. Sem isso, um documento sem pagamentos devolve `null`, e a carga cai.
  - Números vão como texto (`valtotalliquido::text`).
  - Datas vão sem conversão: dentro do JSON, o Postgres escreve `timestamp` sempre como `AAAA-MM-DDTHH:MM:SS.ffffff`, qualquer que seja a configuração de datas da sessão. Nunca `datahora::text`, que depende dessa configuração, que é do fornecedor.
- **Nada passa por número do JavaScript.** A API devolve o JSON como texto dentro da resposta. O tradutor o passa inteiro ao Postgres do Kaizen, que o lê como `jsonb` e grava. Nenhum valor passa por número do JavaScript, e nenhuma data passa por `Date`. Assim nada se arredonda nem muda de fuso.
- **Leitura consistente.** O documento vem com os filhos dentro: itens, pagamentos, parcelas com as suas baixas, e conferência. Cada fechamento vem também com o número de linhas de conferência dele no corte ou abaixo. Numa consulta só, a leitura é consistente. Movimentos e foto do estoque também saem juntos.
- **Números medidos em 27/09:**
  - uma tabela de 1.029 linhas voltou inteira numa chamada, em menos de 1 s;
  - os 10 documentos da época, com os 802 itens aninhados, em 16 ms de consulta;
  - um valor de 60 milhões de caracteres voltou completo;
  - cada consulta tem no máximo 30 s (`statement_timeout`).
- **O ERP roda PostgreSQL 14.17.** As consultas ao ERP não usam nada do 15 ou do 16 (`JSON_OBJECT`, `JSON_ARRAY` e `IS JSON` do padrão SQL, `any_value`, `MERGE`).
- **Cuidados com o SQL que vai para a API:**
  - colunas sempre com apelido único;
  - nada de `select *`, comentário ou `;`;
  - datas escritas como `'AAAA-MM-DD'`, porque a sessão do ERP está em `DMY`;
  - nenhuma conta que gere `numeric` gigante ou `NaN`, porque isso derruba a consulta com um erro 400 genérico;
  - listas de `oid` escritas como números inteiros, conferidos pelo tradutor antes, porque o SQL da API não aceita parâmetro.

### 6.3 Execução de hora em hora

1. **Trava.** Abre uma conexão dedicada ao banco do Kaizen, que vive até o fim, e nela pede `pg_try_advisory_lock` com uma constante do Kaizen.
   - Sem a trava, grava `pulada` (se a tabela `execucao` já existir) e sai. Se a execução que segura a trava começou há mais tempo que o prazo (passo 12), grava falha e manda o Telegram na hora, em vez de `pulada`.
   - A trava cai sozinha se o processo morrer.
2. **Migrações.** Cria `kaizen.migracao` se não existir e aplica as migrações que faltam, cada uma na sua transação. Migração que falha é falha da execução, com Telegram.
3. **Registro.** Grava o início em `execucao`.
4. **Confere as colunas.** Uma consulta recebe a lista esperada de pares (tabela, coluna) e devolve, num `json_agg`, só os que faltam; lista vazia quer dizer que está tudo certo.
   - A lista esperada fica num arquivo do repositório. Um teste confere que toda coluna usada nos `.sql` de consulta está nela.
   - A lista conferida em 27/09 tem 107 pares, e todos existem.
   - Se faltar um, é falha.
5. **Confere empresa e local.**
   - Nas linhas acima do corte: `documento.idempresa` e `mercadoria_estoque_historico._idlocalestoque`.
   - Em todas as linhas: `_idempresa` e `_idlocalestoque` de `mercadoria_estoque`, e `_idempresa` de `mercadoria_custo`, `mercadoria_variacao_empresa`, `mercadoria_variacao_pessoa` e `pessoa_funcionario`.
   - Qualquer valor diferente de 1 é falha, com a tabela e o valor na mensagem.
6. **Lê os documentos,** sempre acima do corte. Entram:
   - **Os novos:** `oid` acima de (maior `oid` já visto − 200), sem descer abaixo do corte.
     - O maior já visto é `max(origem_id::bigint)` dos documentos do ERP novo no Kaizen; sem nenhum, vale o corte.
     - A folga de 200 pega linha gravada fora de ordem no ERP, por exemplo por dois caixas ao mesmo tempo ou pelo caixa sem internet sincronizando. As linhas relidas só são regravadas.
   - **Os que mudaram desde o início da janela:** `datahora` ou `datahoramovimento` a partir do início, ou linha em `documento_cancelamento_historico` acima do corte com `datahora` a partir do início.
     - O início é calculado pelo tradutor, em Fortaleza. É o mais cedo entre ontem e a data do início da última execução da noite que terminou em ok ou aviso. Sem nenhuma noite registrada, é 2026-09-27.
     - Assim a segunda-feira pega o sábado, e o dia seguinte a uma noite que falhou pega o que ela perdeu.
   - **Os que no Kaizen têm alguma parcela com status diferente de `B`,** para ver se foram pagos.
     - Parcela e baixa só mudam no Kaizen quando o seu documento é relido.
     - Documento com todas as parcelas baixadas só é relido à noite. É lá que aparece uma baixa estornada numa conta já paga.
7. **Lê a lista de documentos vivos:** todos os `oid` de documento acima do corte. Um documento do ERP novo no Kaizen que não está na lista foi apagado no ERP.
   - **Quem sai:** o documento sai com os filhos (itens, pagamentos, parcelas, baixas, conferência), e cada um vira um aviso com número, tipo, data, valor e vendedor. Os movimentos de estoque ficam.
   - **Quem nunca sai:** só se comparam documentos com fonte `meuerp`, e documento lido nesta execução nunca é apagado.
   - **Proteção contra uma lista que veio errada:**
     - com 20 ou mais documentos do ERP novo no Kaizen, lista vazia ou com menos da metade deles é falha, e nada é apagado;
     - com menos de 20, só é falha a lista vazia quando o Kaizen já tem algum documento do ERP novo;
     - com o Kaizen vazio, lista vazia é normal.
8. **Lê os movimentos de estoque e a foto, juntos.** Movimentos acima de (maior `oid` já visto − 200), sem descer abaixo do corte, e a foto inteira.
9. **Lê os cadastros** inteiros; são pequenos.
10. **Grava tudo numa transação.**
    - Cada documento lido é atualizado, e os seus filhos são trocados por inteiro. O que sumiu do documento sai, como um item trocado numa regravação ou uma baixa estornada.
    - `visto_em` só é preenchido na primeira vez.
    - A parte do ERP novo em `estoque_atual` e em `produto_fornecedor` é trocada inteira.
    - Se algo falhar, a transação é desfeita, e o Kaizen fica como na execução anterior.
11. **Confere e registra.**
    - Viram avisos: código sem tradução, fechamento com linha de conferência no corte ou abaixo, movimento que não bate com a foto e execução esperada que faltou (6.6).
    - Registra o fim, as contagens e o resultado. Manda o Telegram quando for o caso (7.2).
12. **Prazo.** Cada execução tem um prazo total: 10 minutos na da hora, 30 na da noite. Passado o prazo, o processo registra falha ("a leitura das 14h passou do prazo") e termina, soltando a trava.

São de 10 a 11 chamadas por execução, de 0,1 a 1,2 s cada (`FONTES.md`). O tempo total, com a gravação, é medido no ensaio.

### 6.4 Execução da noite (22h)

1. A noite é a execução da hora com dois conjuntos maiores:
   - todos os documentos acima do corte, qualquer que seja a data deles, porque as contas a pagar reimportadas têm datas de abril a setembro;
   - todos os movimentos acima do corte.

   Os documentos vêm em fatias por faixa de `oid`, de tamanho fixo no código. Uma fatia que passe de 30 s é falha, com a faixa na mensagem.
2. Lê todas as fatias primeiro e grava tudo numa só transação, do mesmo jeito que a hora: documento atualizado, filhos trocados por inteiro. Movimento do Kaizen que não voltou na leitura completa sai, com aviso. A mesma proteção da lista de vivos (6.3, passo 7) vale para a lista completa de movimentos: vazia ou com menos da metade dos movimentos do Kaizen é falha, e nada é apagado.
3. **Compara os totais,** depois de gravar, só lendo. Os dois lados usam os mesmos filtros da carga:
   - **Documento:** `oid` acima do corte e até o maior `oid` lido nesta execução.
   - **Linha filha:** `oid` acima do corte da sua tabela, ligada por `_iddocumento`.
   - **Parcelas e baixas:** só de documento com `tipomovimentofinanceiro = 'P'`, como em 5.2. As das vendas não entram.
   - **Chave:** o dia de `datahora` (no Kaizen, `criado_em::date`), em todo dia que tenha documento acima do corte, inclusive os anteriores a 28/09.
   - **O que se compara, por dia:**
     - número de documentos, por modelo e status;
     - soma de `valtotalliquido` dos itens;
     - soma de `valor` dos pagamentos;
     - número e soma das parcelas e das baixas;
     - soma do calculado e do informado da conferência de caixa;
     - número de movimentos de estoque e soma das variações (`saldo_depois − saldo_antes`), por dia de `momento`.
   - **O que é "igual":** exatamente igual, em `numeric`. Soma sem linha vale 0. Um dia que só existe de um lado é comparado com zeros.
   - Todo dia diferente vira aviso, com os dois números de cada medida.
4. Manda o resumo de avisos (7.2).

### 6.5 Falha e aviso

**Falha:** o tradutor parou, e o Kaizen ficou com os dados da execução anterior.

- o ERP não respondeu ou respondeu com erro;
- o ERP recusou o token (resposta 401 ou 403): é preciso trocar o segredo na VPS;
- uma coluna esperada sumiu;
- apareceu outra empresa ou outro local de estoque;
- a lista de documentos vivos veio vazia ou caiu mais da metade (6.3, passo 7); na noite, o mesmo vale para a lista completa de movimentos de estoque (6.4, passo 2);
- uma migração não se aplicou;
- erro ao gravar no banco do Kaizen;
- a execução passou do prazo, ou a trava ficou presa além dele;
- uma fatia da noite passou de 30 s;
- **o banco do Kaizen não respondeu** (sem conexão ou senha recusada). Sem banco não há trava, registro nem estado. O tradutor manda o Telegram a cada execução enquanto durar a queda, e nenhum erro escapa antes do envio. A primeira execução que voltar a gravar manda "voltou a funcionar".

**Aviso:** os dados entraram, mas algo pede atenção.

- código sem tradução;
- documento apagado no ERP;
- fechamento de caixa com linha de conferência no corte ou abaixo (5.4);
- movimento de estoque que não bate com a foto;
- movimento que sumiu do ERP (noite);
- total do dia diferente do ERP;
- execução esperada que não aconteceu;
- execução pulada por sobreposição.

### 6.6 Execução que faltou

Cada execução lista todos os horários esperados entre a última linha de `execucao` e agora: das 8h às 19h e às 22h, de segunda a sábado, em Fortaleza.

- O horário conta como feito se houver linha de qualquer resultado com início naquela hora.
- Antes da primeira linha de `execucao`, nada falta. A conferência começa com a primeira execução registrada na VPS; as execuções do PC não contam.

## 7. Onde roda

### 7.1 VPS

- **Stack `kaizen`,** com um serviço, `tradutor`, ligado à rede padrão da stack `prumo` (`prumo_default`, declarada como externa) para alcançar o `postgres:5432`. O Kaizen nunca faz `docker stack deploy` da stack `prumo`.
- **Imagem:**
  - `node:24.18.0-alpine`, com a tag exata, porque o Node 24.0 e 24.1 não têm `import.meta.main`;
  - `tzdata` e `TZ=America/Fortaleza`;
  - `crond` do Alpine em primeiro plano;
  - TypeScript rodado direto pelo Node, sem compilação, como no Prumo.
- **Construção:** a imagem é construída na VPS, com a tag do SHA do commit, e publicada com `--resolve-image never`. O código chega por `git clone` do repositório do Kaizen em `/opt/kaizen`, com uma chave de implantação nova, só de leitura; a chave do Prumo vale para outro repositório.
- **Horário** (crontab, com quebras de linha LF):
  - `0 8-19 * * 1-6`: execução da hora;
  - `0 22 * * 1-6`: execução da noite.
- **Segredo:** `kaizen_env_v1`, montado com nome fixo (`target: kaizen_env`).
  - Traz `MEUERP_TOKEN`, `KAIZEN_URL` (o banco, com o usuário `kaizen`), `TELEGRAM_TOKEN` e `TELEGRAM_CHAT`.
  - O Node o lê com `--env-file=/run/secrets/kaizen_env`.
  - O `stack.yml` lê o nome do segredo de uma variável (`${KAIZEN_SEGREDO:-kaizen_env_v1}`). Trocar é: criar `kaizen_env_v2` com as quatro linhas, reimplantar com `KAIZEN_SEGREDO=kaizen_env_v2`, rodar uma execução manual e apagar o `_v1`. O `.env` do PC é trocado junto.
  - Nenhum valor vai para arquivo nem para o repositório.
- **Banco:**
  - Uma única vez, antes de tudo, o dono cria o usuário `kaizen` (sem superusuário) e o esquema `kaizen`, com dono `kaizen`. Usa o mesmo arquivo SQL que o PC usa (7.3).
  - A partir daí, o próprio tradutor aplica as migrações (`sql/migracoes/NNN_*.sql`), em ordem, cada uma na sua transação, registradas em `kaizen.migracao`.
- **Implantação:**
  - Feita pelo dono, na VPS, como `root`, comando por comando, entre hh:10 e hh:50. O plano traz o roteiro. Quem implementa não tem acesso à VPS.
  - O roteiro registra `df -h` antes da primeira implantação.
  - A cada atualização, apaga as imagens antigas do tradutor e guarda só a anterior, para poder voltar atrás.
  - O `stack.yml` limita o log do serviço (`json-file`, `max-size` 10m, `max-file` 3).
- **A stack `prumo` carrega o banco do Kaizen.** Parar o Prumo é `docker service scale prumo_sync=0`, nunca `docker stack rm prumo`.
- **Backup:**
  - O esquema `kaizen` não precisa de backup nesta fase, porque a execução da noite o refaz inteiro a partir do ERP. Só os `visto_em`, do documento e do movimento, não se refazem.
  - A cópia da Link (esquema `erp`) depende do `pg_dump` guardado fora da VPS (seção 3).

### 7.2 Telegram

**As mensagens dizem o que fazer, em uma frase.** São texto puro, sem formatação:

- **ERP fora:** "Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h."
- **Token recusado:** "Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude."
- **Coluna, empresa ou local:** "Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem."
- **Banco do Kaizen fora:** "Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu."
- **Documento apagado:** "o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP". Aqui o dono pergunta à gerente ou ao suporte.
- **Fechamento com linha de teste:** "o fechamento 98 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável".
- **Outros avisos:** "precisa de ajuste no Kaizen; leve este resumo à próxima sessão com o Claude".

**Estado.** Vem de `execucao`, sem as linhas `pulada`. A anterior é a última execução com resultado ok, aviso ou falha.

- **Falha:** manda mensagem quando a anterior não é falha, ou quando a mensagem da anterior não foi aceita pelo Telegram (`telegram_ok`). Enquanto continuar falhando, com a mensagem entregue, não repete.
- **Volta:** manda "voltou a funcionar às HHh" quando esta execução é ok ou aviso e a anterior é falha, ou quando faltam execuções desde a última linha.
- "Os dados continuam os das HHh" usa o início da última execução ok ou aviso.

**Resumo das 22h:**

- Junta os avisos de todas as execuções desde o último resumo enviado, inclusive a das 22h, sem repetir texto igual e com o número de vezes.
- Se a das 22h falhar depois de gravar a sua linha, o resumo sai mesmo assim. Se ela não rodar, os avisos vão para o resumo seguinte.
- Um aviso que continua igual (o mesmo código sem tradução; o mesmo produto, com o mesmo último movimento e a mesma foto) entra por inteiro só no primeiro resumo. Nos seguintes, vira uma linha: "continuam N avisos já informados".
- Agrupa por tipo de aviso, com a contagem e até 5 exemplos em cada, e é cortado em 4.000 caracteres com "e mais N". O Telegram aceita no máximo 4.096. O detalhe completo fica em `execucao.avisos`.
- Se o dia foi limpo, não chega nada.

**Se o próprio Telegram falhar,** a falha fica registrada (`telegram_ok` = não), e a próxima execução tenta de novo.

### 7.3 No PC

- **Postgres próprio:** um Postgres 16 só do Kaizen, em Docker (`docker-compose.yml` no repositório), numa porta própria, separado do `link_postgres` do Prumo (porta 5433).
- **Usuário e esquema:** o `docker-compose.yml` cria, na subida, o usuário `kaizen` (sem superusuário) e o esquema `kaizen`, com o mesmo arquivo SQL que o dono roda na VPS.
- **Testes:**
  - podem criar e apagar bancos com o superusuário, mas aplicam as migrações e rodam o tradutor conectados como `kaizen`;
  - só conectam em `localhost`: uma guarda recusa qualquer outro endereço antes de conectar.
- **Na primeira tarefa do plano,** o repositório ganha:
  - `.gitignore` para arquivos de segredo (`.env*`, `*.pem`, `*.key`);
  - `.gitattributes` com LF para crontab e scripts;
  - as travas mecânicas ficam com o dono: `.claude/settings.json` e `.claude/hooks/`, do modo autônomo (`docs/AUTONOMIA.md`). O plano não mexe nelas.

## 8. Testes

Os testes usam `node:test`, rodam contra o Postgres local, e a contagem é conferida ("rodou N testes, esperados N"). Todos rodam antes de cada commit. Os exemplos de resposta do ERP são montados a partir dos casos reais do `FONTES.md`, no formato em que o ERP os devolve, e sem nenhum dado de pessoa.

- **Só leitura:** o cliente recusa qualquer método ou caminho diferente do permitido, qualquer SQL que não seja um único SELECT ou WITH, e um WITH com DELETE dentro.
- **Rodar duas vezes:** com o ERP igual, duas execuções seguidas deixam as tabelas de fato, os cadastros e `estoque_atual` com o mesmo conteúdo, comparado sem as colunas `id`, `parcela_id` e `lido_em`. `visto_em` e `documento.id` não mudam. `execucao` ganha uma linha por execução e fica fora da comparação.
- **Casos reais:**
  - troco (pedido 116) e três formas de pagamento (pedido 87);
  - troca com crédito e uso do crédito (TM 61 e pedido 117);
  - devolução em dinheiro (TM 63);
  - orçamento fechado dias depois: o mesmo `oid` muda de OC para PA e ganha `fechado_em` novo;
  - venda cancelada depois de lida;
  - item trocado numa regravação (pedido 58);
  - documento apagado;
  - fechamento refeito (FC 118);
  - sangria (RS 97);
  - conta paga depois e baixa estornada;
  - ajuste de custo e ajuste de estoque, com item sem quantidade ou sem valor;
  - documento sem pagamentos, sem parcelas e sem conferência, com as listas vindo vazias como o ERP as devolve.
- **Corte:** linha no corte ou abaixo não entra; tabela com corte 0 deixa entrar a primeira linha. A migração da virada tem 1.029 produtos, 714 com estoque e 54.660,5 unidades.
- **Números e datas:**
  - `numeric(16,6)` e valores acima de 2^53 passam sem perder algarismo;
  - `timestamp` sem fuso não se desloca, com a máquina em UTC ou em −03;
  - com o Postgres em UTC, a execução das 22h trata "hoje" como o dia de Fortaleza.
- **Leitura:** a folga de 200 pega uma linha gravada fora de ordem; o início da janela na segunda-feira e depois de uma noite que falhou, com o relógio fixado no teste.
- **Falhas:**
  - coluna sumida;
  - ERP fora do ar, e token recusado (401);
  - empresa ou local de estoque diferente de 1;
  - lista de vivos vazia, e com menos da metade dos documentos do Kaizen: nada é apagado. Com o Kaizen vazio, lista vazia não é falha;
  - erro no meio da carga: nada muda;
  - trava presa além do prazo: gera falha e mensagem;
  - banco do Kaizen desligado: sai mensagem.
- **Avisos:**
  - código sem tradução;
  - movimento que não bate com a foto;
  - fechamento com linha de conferência no corte ou abaixo;
  - execução que faltou, inclusive uma parada de várias horas;
  - execução pulada quando outra tem a trava;
  - total diferente. Uma venda com parcela e baixa a receber não gera diferença na comparação.
- **Migrações:** aplica só as que faltam, na ordem, cada uma registrada em `migracao`; rodar de novo não aplica nada.
- **Cliente do ERP:** a 20ª chamada no mesmo minuto espera a virada do minuto; no 429, espera e repete.
- **Telegram:**
  - falha manda uma vez e a volta manda uma vez;
  - falha cuja mensagem não saiu manda de novo;
  - resumo só com aviso, agrupado e cortado em 4.000 caracteres;
  - aviso repetido vira "continuam N avisos".
- **Publicação:** crontab em LF, com o horário e o fuso certos; stack com o segredo em nome fixo, lido de variável, com a rede externa e o limite de log; Dockerfile com a tag exata do Node.
- **Conferência de colunas:** toda coluna usada nos `.sql` de consulta está na lista esperada.

**Ensaio com o ERP de verdade,** antes da VPS:

1. Cada arquivo `.sql` de consulta roda uma vez no ERP de verdade.
2. O tradutor roda no PC, lendo o ERP, e grava no Postgres local.
3. A comparação de totais precisa dar zero diferença.
4. Antes do ensaio, a lista de documentos acima do corte com data anterior a 28/09 é conferida com o dono (5.4).

## 9. Conferências da operação real

Quem implementa faz cada conferência lendo o ERP pelo SQL, só leitura, assim que o caso acontece, sem esperar o tradutor na VPS. Cada resposta é registrada no `FONTES.md`. Se alguma pedir coluna ou tradução nova, entra como migração, e a noite preenche o passado. O que não tiver acontecido até o fechamento fica listado como aberto no `FONTES.md` e não segura a fase.

1. **A primeira NFC-e e a primeira NF-e:** modelo, status final, e se a venda fica um documento só ou dois. Se forem dois, entra a ligação entre eles (`documento_mercadoria.iddocumentoorigem` ou o que a nota usar).
2. **O primeiro orçamento fechado em outro dia:** `datahoramovimento` leva a data do fechamento? E `datahoramovimento` vem sempre preenchido na venda do caixa?
3. **Venda e turno:** o trio `idcaixaabertura` + `idusuarioabertura` + `idabertura` identifica um turno só?
4. **Cartão de crédito:** no primeiro fechamento com venda no crédito, o calculado da linha "Cartão Crédito" soma essas vendas?
5. **Vendedor, com o dono:** as vendas de cada vendedor saem com o código dele?
6. **Troca:** o item da troca (`TM`) traz vendedor?
7. **Cancelamentos:** os primeiros, da venda inteira e de item antes de fechar.
8. **Pré-venda:** ela reserva estoque?
9. **Números da operação:**
   - proporção de vendas para o Consumidor Final 999007;
   - itens por venda;
   - a coluna `documento.gmt` na venda do caixa;
   - o atraso do caixa sem internet (`visto_em` − `criado_em`), medido só com documentos cujo `visto_em` seja posterior à primeira execução da hora na VPS. Os carregados na primeira execução ficam fora da conta.
10. **Números dos restos de teste:** o primeiro fechamento que pegar um dos números 68, 71, 74, 98, 99 ou 118. O ERP cria linha nova de conferência, regrava a de teste ou recusa? A comparação é com os valores medidos em `docs/medicoes/conferencia-restos-2026-09-27.json`.
11. **Contas a pagar:** as reimportadas vêm com que número e que datas, e todas entram acima do corte?
12. **Sangria RT:** o primeiro RT é mesmo sangria (`FONTES.md`, "RT (confirmar)")?
13. **Documentos apagados:** quantos são apagados por semana, e com que status. Se o apagamento de rascunho (status R) for rotina, ele passa a entrar só nas contagens da execução, sem aviso, por mudança na spec.

## 10. Pronto quando

1. Na VPS, seis dias seguidos de operação (segunda a sábado), com todas as execuções esperadas registradas em `kaizen.execucao` e nenhuma faltando. Falha do ERP é aceita, desde que o Telegram tenha avisado.
2. Nesses seis dias, as vendas e o estoque desde 28/09 e o a pagar inteiro (decisão 6) estão no esquema `kaizen`, e toda noite a comparação dá zero diferença em todos os dias com documento acima do corte (6.4).
3. Uma mensagem de teste, mandada pelo serviço `tradutor` na VPS com o segredo `kaizen_env_v1`, chega ao Telegram do dono. No PC, uma falha provocada gera o texto certo, conferido por teste, sem mandar mensagem de verdade.
4. Os testes passam, com a contagem conferida.
5. As contas a pagar que o dono importar de novo (eram 94 parcelas, R$ 245.864,76, na fotografia de 26/09) aparecem no Kaizen com o mesmo número e a mesma soma das parcelas pendentes dos documentos `CP` no ERP, no mesmo dia. Isso depende do dono. Se atrasar, fica como item à parte e não segura os outros.
6. As conferências da seção 9 que já aconteceram estão respondidas no `FONTES.md`, e as outras estão listadas como abertas.

**Conferência do dono,** fora do fluxo de quem implementa (`OBJETIVO.md`, "Qualidade"). O roteiro traz um comando que o dono roda na VPS; quem implementa não tem acesso a ela. O comando imprime, em palavras, os números do Kaizen e onde conferir cada um no ERP:

- por dia desde 28/09, a quantidade de vendas e o total dos itens com vendedor, pela regra do relatório 154 (data do documento): conferir no relatório 154;
- as contas a pagar pendentes, número e total: conferir na tela de contas a pagar;
- a quebra de cada fechamento de caixa: conferir na tela do fechamento;
- o saldo atual de 10 produtos escolhidos pelo dono: conferir na tela do produto.

O comando também imprime as execuções esperadas e feitas e o resultado da comparação da noite. É conferência da cópia, não do indicador, que é da Fase 4.

## 11. Riscos e limites conhecidos

- **Estoque antes de 28/09.** A Link só guardou a foto final do estoque, sem histórico de movimento. Giro, cobertura e encalhe de dias antes de 28/09 não têm estoque registrado; a Fase 4 decide se dá para reconstruí-lo ou se ficam sem resposta. Vendas e financeiro têm resposta desde abril. O `OBJETIVO.md` (Fase 4) promete "qualquer dia passado desde abril" para as três perguntas, e o dono precisa saber desse limite ao aprovar a spec.
- **O tradutor que nem roda.** VPS desligada, serviço parado ou agendamento quebrado depois de uma atualização não geram aviso na hora (decisão 2). Quando ele voltar a rodar, o resumo diz que houve leitura faltando. A Fase 5 mostra no app a hora da última atualização.
- **Mudança do esquema interno do ERP:** o tradutor para e manda na hora a mensagem de falha (6.5), até a consulta ser corrigida. Não grava número errado sem avisar.
- **Cota de chamadas:** o limite de cerca de 20 por minuto vale para quem usa o mesmo token; se é por token ou por conta, não foi medido. Consultas manuais durante uma execução a atrasam, sem errar.
- **30 s por consulta no ERP:** a releitura da noite vai em fatias por faixa de `oid`. Se uma fatia passar de 30 s, é falha, e o tamanho da fatia no código diminui.
- **Saldo que muda sem linha no histórico:** aparece como aviso de movimento que não bate com a foto. Para o "agora", vale a foto. O saldo refeito dos movimentos fica errado a partir do salto, e o aviso registra quando.
- **Restos de teste:** 30 linhas de conferência e 25 de histórico, com números de documento que já estão se repetindo. O corte as ignora; a regravação vira aviso (5.4).
- **Números de documento repetidos:** se um documento for apagado e o seu número reaproveitado, os filhos que o suporte deixar para trás grudam no novo. O corte só protege os restos de 26/09. Nos novos, a comparação da noite e os avisos de conferência mostram a diferença.
- **postgres.js 3.4.9**, se for o driver, tem armadilhas registradas no Prumo:
  - rollback depois de a conexão cair derruba o processo;
  - `end()` sem prazo não termina;
  - `begin` com mais de uma conexão é recusado;
  - parâmetro `date` vira `Date` do JavaScript.

  O plano escolhe o driver com isso à vista. O prazo total da execução (6.3) cobre o `end()` que não termina.
- **Horário de verão:** o banco do ERP está em `America/Sao_Paulo`, igual a Fortaleza enquanto não houver horário de verão. Não há alarme automático: se ele voltar, é mudança de estrutura, decidida com o dono antes de valer.
- **Sync do Prumo:** enquanto continuar agendado, ele troca o esquema `erp` a cada hora. Se voltar a rodar, a cópia final pode ser trocada. O dump fora da VPS é a garantia da Fase 3. O Kaizen não cria nada que dependa de `erp` nesta fase.

## 12. Para as próximas fases

- **Fase 3 (Link):**
  - o valor do item pela conta da Link, vendido e devolvido (decisão 4);
  - o vale-crédito e a devolução em dinheiro, que vêm do razão;
  - a regra de conta a pagar da Link, com conta de destino e sinal na parcela;
  - a fronteira do a pagar: as contas abertas da Link foram migradas para o ERP novo, então a mesma conta existe nas duas fontes;
  - as notas de entrada, para a primeira entrada;
  - a `de_para` de vendedores e do Consumidor Final;
  - a classificação dos produtos só da Link pelas planilhas da migração;
  - a data de parcela zero (0001-01-01);
  - os 5 testes da implantação que continuam somando (a negociação 8 está cancelada);
  - a leitura de `erp` pelo usuário `kaizen`, com o sync parado.
- **Fase 4 (regras):**
  - "venda válida", vendido, devoluções e líquido;
  - `fechado_em` vazio;
  - sangria que paga despesa;
  - Consumidor Final fora da carteira;
  - saldo por dia refeito dos movimentos, e o salto sem linha;
  - primeira entrada;
  - D+1 do cartão;
  - estoque antes de 28/09.

## Anexo — medições de 27/09/2026 usadas aqui

- **Corte por tabela:** seção 5.4. A consulta usou `max(oid)` e `count(*)` por tabela, às 13h13.
- **Foto do estoque na virada:** `docs/medicoes/estoque-virada-2026-09-27.json` (13h38).
- **Restos da conferência de caixa:** `docs/medicoes/conferencia-restos-2026-09-27.json` (14h34). São 30 linhas, dos números 68, 71, 74, 98, 99 e 118, com `oid` 1 a 30.
- **Colunas conferidas no `information_schema`:** 107 pares (tabela, coluna), todos existentes. Os tipos:
  - valores em `numeric(14,2)`, `numeric(14,6)`, `numeric(16,3)` e `numeric(16,6)`;
  - datas em `timestamp` sem fuso, inclusive `dtvencimento`, `dtpagamento` e `dtlancamento`.
- **O ERP:** PostgreSQL 14.17, sessão em `America/Sao_Paulo`, com `DateStyle` `ISO, DMY`.
- **Formato das respostas do SQL:**
  - `numeric` como número JSON cru;
  - `timestamp` dentro do JSON como `"AAAA-MM-DDTHH:MM:SS.ffffff"`;
  - `json_agg` como texto com o JSON dentro, e `null` quando não há linha;
  - no máximo 100 linhas por página;
  - 30 s por consulta.
- **Estado do ERP às 13h13:**
  - 10 documentos, com `_iddocumento` até 49;
  - nenhum pagamento, parcela ou baixa, e nenhuma conta a pagar;
  - 1.847 linhas de histórico de estoque.
- **Às 14h34:** mais 44 ajustes de custo (`AC`), feitos das 14h20 às 14h33, com números 94 a 137 e `oid` 185 a 228.
- **Restos:** estão em `documento_conferencia_caixa` (30), `mercadoria_estoque_historico` (25) e `documento_auditoria` (3). O `FONTES.md` fala em 6 linhas do documento 58, 3 delas em `documento_auditoria`. Nenhuma entra: o corte de cada tabela lida é o maior `oid` medido às 13h13, e as de corte 0 estavam vazias.
