# Boleto a receber — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (é a regra do `docs/AUTONOMIA.md`). Passos com `- [ ]`.

**Objetivo:** numa venda paga em boleto, a entrada do fluxo de caixa conta no dia em que o boleto é pago (baixa da parcela), e não no dia da venda; a meta continua contando a venda no dia da venda.

**Arquitetura:** o leitor do ERP passa a copiar a parcela a receber (documento com financeiro `R`) e a guardar a sequência do ERP no pagamento e na parcela; a comparação com o ERP passa a contar as duas; a releitura de hora em hora continua só para documento a pagar. A regra `sql/regras/financeiro.sql` tira o boleto das entradas do dia da venda e soma as baixas válidas da parcela do mesmo pagamento, no dia de cada baixa, na chave `outras`.

**Tecnologia:** Postgres (SQL das regras, da carga e da leitura do ERP), Node 24 com TypeScript (`.mts`, `node:test`), banco de teste no Docker do PC.

**Spec:** `docs/superpowers/specs/2026-09-29-boleto-a-receber-design.md` (leia antes de começar).

## Restrições globais

- Pré-requisito já em `main` (`e0f1f47`): migração 014, forma `9` → `boleto`.
- Migração nova: `sql/migracoes/015_sequencia.sql`. Nenhuma migração existente é editada.
- Nada escreve no ERP. Nada muda em `publicacao/`, `.claude/settings.json` ou `.claude/hooks/`.
- Dinheiro: soma sem arredondar e `round(…, 2)` só no total (como o resto de `financeiro.sql`).
- O formato da resposta do financeiro não muda (mesmas chaves).
- Todo teste compara com valor fixo; nada de `.skip`/`.only`. Atualizar `testes-esperados.txt` com a contagem nova.
- Português em comentários, testes e commits. Commit sem `--no-verify` (o pre-commit roda a suíte inteira, 6 a 11 min).

## Foco da revisão

1. **Venda mista (Pix + boleto):** a parcela do Pix nasce baixada no ato; essa baixa não pode entrar de novo nas entradas. Esperado: Pix contado uma vez, no dia da venda.
2. **Baixa parcial do boleto em dois dias:** cada baixa entra no seu dia, pelo valor pago.
3. **Baixa estornada** (status `C`, "cancelada"): não entra.
4. **Venda no crédito, parcela pendente para sempre:** não entra na releitura de hora em hora nem nas contas a pagar.
5. **Comparação com o ERP depois da mudança:** o pedido 87 e a venda no crédito 124 dão zero diferença, agora com as parcelas a receber dos dois lados.

---

### Task 1 — Tarefa 1: o leitor copia a parcela a receber, com a sequência

**Arquivos:**
- Criar: `sql/migracoes/015_sequencia.sql`
- Modificar: `sql/erp/documentos.sql` (pagamentos e parcelas: `sequencia`; filtro `d.tipomovimentofinanceiro = 'P'` → `in ('P', 'R')`)
- Modificar: `sql/carga/documentos.sql:66-75` (grava `sequencia` no pagamento e na parcela)
- Modificar: `sql/erp/totais.sql:26` e `:35` (`dq.financeiro = 'P'` → `in ('P', 'R')`, idem `db`)
- Modificar: `sql/kaizen/comparar.sql` (os dois `dc.financeiro = 'P'` → `in ('P', 'R')`)
- Modificar: `tradutor/kaizen.mts:34-42` (`oidsComParcelaAberta`: só documento com `d.financeiro = 'P'`)
- Testes: `tradutor/casos-reais.test.mts` (pedido 87), `tradutor/comparacao.test.mts` (venda 124), `tradutor/kaizen.test.mts` (`oidsComParcelaAberta`), e os que quebrarem por comparar pagamentos/parcelas inteiros (ajustar o valor esperado, nunca afrouxar a comparação).

**Interfaces:**
- Produz: colunas `kaizen.documento_pagamento.sequencia integer` e `kaizen.parcela.sequencia integer` (vazias na Link), preenchidas pela carga do ERP novo com `_idsequencia` do ERP. A Tarefa 2 liga parcela a pagamento por `documento_id` + `sequencia`.

- [ ] **Passo 1: testes que falham**

Em `tradutor/casos-reais.test.mts`, o teste do pedido 87 passa a se chamar "pedido 87: dinheiro, Pix e crédito na mesma venda; as parcelas a receber entram com a sequência, e a noite dá zero diferença", e a asserção de contagem vira:

```ts
assert.deepEqual(await linhas(
  `select pg.origem_id, pg.sequencia, pa.origem_id as parcela, pa.status, pa.valor,
          (select count(*) from kaizen.baixa b where b.parcela_id = pa.id) as baixas
     from kaizen.documento_pagamento pg
     join kaizen.documento d on d.id = pg.documento_id and d.codigo = '87'
     left join kaizen.parcela pa on pa.documento_id = pg.documento_id and pa.sequencia = pg.sequencia
    order by pg.sequencia`), [
  { origem_id: '3', sequencia: 1, parcela: null, status: null, valor: null, baixas: '0' },
  { origem_id: '4', sequencia: 2, parcela: '2', status: 'B', valor: '40.00', baixas: '1' },
  { origem_id: '5', sequencia: 3, parcela: '1', status: 'P', valor: '30.00', baixas: '0' },
])
```

(o fixture `pedidoTresFormas`, em `tradutor/fixtures.mts`, grava o dinheiro sem parcela, o Pix com parcela baixada e o crédito com parcela pendente; confira as sequências no fixture e ajuste os números acima se o fixture disser outra coisa, sem mudar o fixture). O `rodarSemAviso('noite', …)` do fim continua: prova zero diferença na comparação.

Em `tradutor/comparacao.test.mts`, o teste "parcelas e baixas de uma venda (financeiro R) não entram na comparação" passa a "parcelas e baixas de uma venda (financeiro R) entram nos dois lados da comparação": `kaizen.parcela` com 1 linha; os totais do ERP do dia com `parcelas:quantidade` 1, `parcelas:valor` 59.50, `baixas:quantidade` 1, `baixas:valor` 59.50 (confira a ordem e o formato exato das medidas pelo que `totaisDoErp` devolve); e `comparar()` continua `[]`.

Em `tradutor/kaizen.test.mts`, o `inserirDocumento` local ganha o financeiro (padrão `'P'`), e o teste de `oidsComParcelaAberta` ganha um documento `'meuerp'` com financeiro `'R'` e parcela `'P'` (a venda no crédito), que **não** aparece: o resultado continua `[185, 187, 1000]`.

- [ ] **Passo 2:** rodar os três arquivos e ver falhar pelo motivo certo (parcelas 0; `sequencia` não existe; o documento R aparece na releitura).

- [ ] **Passo 3: implementação**

`sql/migracoes/015_sequencia.sql`:

```sql
-- A sequência do ERP no pagamento e na parcela (_idsequencia): é ela que liga a parcela a receber ao pagamento que a
-- gerou (spec 2026-09-29-boleto-a-receber, seção 2). Na Link fica vazia.
alter table kaizen.documento_pagamento add column sequencia integer;
alter table kaizen.parcela add column sequencia integer;
```

`sql/erp/documentos.sql`: em `pagamentos`, acrescentar `'sequencia', p._idsequencia,`; em `parcelas`, `'sequencia', q._idsequencia,`; e trocar `and d.tipomovimentofinanceiro = 'P'` por `and d.tipomovimentofinanceiro in ('P', 'R')`.

`sql/carga/documentos.sql`:

```sql
insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor, sequencia)
select a.documento_id, 'documento_pagamento', p->>'oid', p->>'forma', (p->>'valor')::numeric, (p->>'sequencia')::integer
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'pagamentos') p;

insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao, sequencia)
select
  a.documento_id, 'documento_parcela', p->>'oid',
  left(p->>'lancado_em', 10)::date, left(p->>'vencimento', 10)::date,
  (p->>'valor')::numeric, p->>'status', p->>'descricao', (p->>'sequencia')::integer
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'parcelas') p;
```

`sql/erp/totais.sql` e `sql/kaizen/comparar.sql`: `financeiro = 'P'` → `financeiro in ('P', 'R')` nos blocos de parcelas e baixas (dois em cada arquivo).

`tradutor/kaizen.mts`, em `oidsComParcelaAberta`: `where d.fonte = 'meuerp' and d.financeiro = 'P' and p.status is distinct from 'B'`, com um comentário de uma linha: a parcela a receber (venda no crédito, boleto) entra pela leitura das 22h, que relê tudo.

Se o ERP falso (`tradutor/erp-falso.mts`) não tiver a coluna `_idsequencia` em `documento_pagamento` ou `documento_parcela`, acrescente-a lá (os fixtures já a preenchem). Se `sql/erp/colunas-esperadas.txt` listar as colunas lidas por tabela, acrescente as novas.

- [ ] **Passo 4:** rodar os três arquivos (passam) e a suíte inteira (`npm run verificar`); corrigir os testes que comparavam pagamentos ou parcelas inteiros e agora veem a `sequencia` (valor esperado novo, conferido contra o fixture).
- [ ] **Passo 5:** atualizar `testes-esperados.txt` (esta tarefa não cria teste novo: a contagem só muda se você criar um) e commitar: "Boleto a receber, tarefa 1: o leitor copia a parcela a receber, com a sequência do ERP".

### Task 2 — Tarefa 2: a entrada do boleto no dia em que ele é pago

**Arquivos:**
- Modificar: `sql/regras/financeiro.sql` (CTEs `pagamento` e `entrada`)
- Modificar: `tradutor/apoio-regras.mts` (`inserirPagamento` e `inserirParcela` aceitam `sequencia?: number`)
- Testes: `tradutor/regras-financeiro.test.mts` (novos) e `tradutor/regras-vendas.test.mts` (um novo)

**Interfaces:**
- Consome: `kaizen.documento_pagamento.sequencia` e `kaizen.parcela.sequencia` (Tarefa 1); tradução `meuerp/forma/9 = boleto` (migração 014).

- [ ] **Passo 1: testes que falham.** Em `regras-financeiro.test.mts`, no molde dos testes de entradas que já existem (mesma natureza de venda, mesmos apoios), um documento de venda do ERP novo em 05/10/2026 10:00 com:
  - pagamento forma `'2'` (Pix) R$ 100.00, sequência 1, parcela sequência 1 baixada no ato (lançada e vencida em 05/10, status `'B'`, baixa em 05/10, R$ 100.00, forma `'2'`, status `'E'`);
  - pagamento forma `'9'` (boleto) R$ 400.00, sequência 2, parcela sequência 2 pendente (lançada 05/10, vencimento 20/10, status `'P'`);
  - itens vendidos que somam R$ 500.00.

  Testes, cada um com o número fixo:
  1. entradas de 05/10: `pix` "100.00", `outras` "0.00"; de 18/10, sem baixa ainda: `outras` "0.00";
  2. com a baixa de R$ 400.00 em 18/10 (forma `'9'`, status `'E'`): `outras` de 18/10 "400.00"; `mes` de outubro no dia 18/10: `pix` "100.00", `outras` "400.00";
  3. baixa parcial: R$ 150.00 em 10/10 e R$ 250.00 em 18/10: `outras` de 10/10 "150.00", de 18/10 "250.00", mês no dia 18/10 "400.00";
  4. baixa estornada: a de 18/10 com status `'C'`: `outras` de 18/10 "0.00";
  5. a parcela do boleto pendente não entra nas contas a pagar: `contas_a_pagar.total` do dia 05/10 igual ao mesmo dia sem a venda (confira o valor do cenário do arquivo).

  Em `regras-vendas.test.mts`: a mesma venda (itens R$ 500.00, boleto R$ 400.00) conta R$ 500.00 no vendido de 05/10.
- [ ] **Passo 2:** rodar e ver falhar (hoje o boleto entra em `outras` de 05/10: 400.00).
- [ ] **Passo 3: implementação** em `sql/regras/financeiro.sql`:

```sql
pagamento as (
  select dp.id as documento_id, dp.fonte, dp.dia, dp.papel, tf.valor as forma, pg.sequencia, pg.valor
  ...  -- o resto como está
),
-- Entradas: pagamentos das vendas, menos o vale (forma troca) e o boleto. Crédito, débito e cartão entram no dia seguinte
-- ao da venda (o recebível); dinheiro, Pix e as outras formas, no dia da venda. O boleto entra no dia em que é pago
-- (decisão do dono, 29/09): cada baixa válida da parcela do mesmo pagamento (a mesma sequência), em `outras`.
entrada as (
  select
    case when p.forma in ('credito', 'debito', 'cartao') then p.dia + 1 else p.dia end as dia,
    case when p.forma in ('dinheiro', 'pix', 'credito', 'debito', 'cartao') then p.forma else 'outras' end as forma,
    p.valor
  from pagamento p
  where p.papel = 'venda' and p.forma is distinct from 'troca' and p.forma is distinct from 'boleto'
  union all
  select b.pago_em, 'outras', b.valor
  from pagamento p
  join kaizen.parcela pa on pa.documento_id = p.documento_id and pa.sequencia = p.sequencia
  join kaizen.baixa b on b.parcela_id = pa.id
  join kaizen.traducao tb on tb.fonte = p.fonte and tb.campo = 'status_baixa' and tb.codigo = b.status
  where p.papel = 'venda' and p.forma = 'boleto' and tb.valor = 'valida'
),
```

`tradutor/apoio-regras.mts`: `inserirPagamento(c, documentoId, p: { forma; valor; sequencia?: number })` e `inserirParcela(c, documentoId, p: { …; sequencia?: number })` gravam `sequencia` (vazia quando ausente).

- [ ] **Passo 4:** rodar os dois arquivos (passam) e a suíte inteira.
- [ ] **Passo 5:** `testes-esperados.txt` com a contagem nova e commit: "Boleto a receber, tarefa 2: a entrada do boleto conta no dia em que ele é pago".

### Depois das tarefas (orquestrador)

1. Revisão da branch inteira (`requesting-code-review`), mescla em `main`, envio.
2. Publicar pelo `implantar.sh` numa janela (hh:10–hh:50, nunca 22h); rodar a noite manual (passo 8 do roteiro): ela relê todos os documentos e copia as parcelas a receber das vendas desde 26/09.
3. Conferir na VPS: a noite termina `ok`, zero diferença; e as entradas de 28/09 e 29/09 não mudam (nenhuma venda em boleto): `rodar indicadores 2026-09-28 2026-09-29` antes e depois, mesmos números.
4. Registrar em `docs/DECISOES.md`.
