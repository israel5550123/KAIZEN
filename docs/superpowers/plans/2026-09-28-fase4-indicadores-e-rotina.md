# Fase 4 — indicadores e rotina: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As três perguntas (vendas, compras, financeiro) calculadas de hora em hora na VPS para hoje e para qualquer dia desde abril, gravadas em `kaizen.resposta`, com aviso ao dono quando o cálculo falha; o `implantar.sh` como a porta do agente para a VPS; a história da Link no Kaizen da VPS.

**Architecture:** O tradutor do ERP novo passa a ler as naturezas de operação e grava no documento a versão da época. Duas visões (migração 012) dizem o papel de cada documento e quais itens são vendido e devolvido; três consultas SQL em `sql/regras/` recebem um dia e devolvem a resposta em JSON; `tradutor/indicadores.mts` grava as respostas, e a execução de hora em hora (`tradutor/execucao.mts`) chama o cálculo depois da leitura. O script `publicacao/implantar.sh` publica um ramo do GitHub na stack `kaizen` e roda uma lista fechada de comandos no contêiner.

**Tech Stack:** Node 24.18.0 (TypeScript direto, sem build), `pg` 8.23.0, Postgres 16, bash (Git Bash no PC), Docker Swarm na VPS.

**Spec:** `docs/superpowers/specs/2026-09-28-fase4-indicadores-e-rotina-design.md`

## Global Constraints

- Português em tudo: código (nomes), mensagens, testes, commits. Commit pelo resultado, sem nome de modelo fixo na linha `Co-Authored-By` (cada agente usa a atribuição que o sistema lhe dá).
- Nada escreve no ERP; nada toca o esquema `erp` (a Link só é lida, pelo usuário `kaizen`). Consultas ao ERP só por `ferramentas/consultar-erp.mts` (só SELECT).
- Dinheiro e datas nunca viram `number` do JavaScript no caminho de produção: o JSON das regras sai do Postgres e vai para `kaizen.resposta` por `insert … select`.
- Dinheiro nas respostas: `round(soma, 2)` só no total; razões (ritmo, percentual, giro): 4 casas; nenhuma divisão por zero (sem divisor, o campo sai `null`).
- Datas: fuso `America/Fortaleza`; início da história `2026-04-01`; estoque conhecido a partir de `2026-09-26`; financeiro: a Link até `2026-09-25`, o ERP novo a partir de `2026-09-26`.
- Toda migração nova tem número maior que a última (`010`…`013`); migração já publicada na VPS não se edita (spec, decisão 19).
- Testes: `npm run verificar` (tipos + testes) com o Postgres local na porta 5434; todo teste com valor de referência concreto; nenhum `.skip`/`.only`; `testes-esperados.txt` recebe a contagem nova ao fim de cada tarefa (o número está em cada tarefa).
- O hook `.githooks/pre-commit` roda `npm run verificar` em todo commit: o commit só entra com todos os testes passando.
- `publicacao/implantar.sh`: só a stack `kaizen` e o esquema `kaizen`; nenhum `prumo`, `erp.`, `psql`, `secret`, `volume`, `network`, `rm`, `rmi`, `prune`, `scale`, `update`; todo argumento conferido antes do `ssh`; janela hh:10–hh:50, nunca 22h–22h59, para `publicar` e `rodar`.
- O cálculo não muda nada da leitura: a leitura de hora em hora da Fase 2 tem de continuar terminando `ok` (item 7 do `/goal`).

## Review Focus

- **Dia sem venda** (domingo, feriado, abril antes de 13/04): a noite calcula ~40 dias assim; qualquer divisão por zero derruba a leitura inteira. Tarefas 7, 8, 9 e 10 testam um dia sem venda.
- **`origem_id` é texto**: o último movimento de estoque é o de maior `origem_id::bigint`, não o maior texto ('9999' > '10000'). Tarefa 8 testa 9999 contra 10000.
- **Documento antigo sem natureza**: até a leitura da noite, um pedido do ERP novo gravado antes da Fase 4 fica sem natureza e não conta como venda; a conferência de códigos sem tradução não pode acusar isso como código desconhecido (natureza vazia não é código). Tarefa 4 testa.
- **Argumento malicioso no script** (`"main;id"`, `"2026-04-15;id"`, `"../x"`): o script para com 2 sem chamar o `ssh`. Tarefa 1 testa com um `ssh` falso no `PATH`.
- **A virada do financeiro** (25/09 → 26/09): a posição troca de fonte (94 parcelas R$ 245.864,76 → 81 parcelas R$ 217.491,43) e o mês de setembro soma os fluxos das duas fontes. Tarefa 9 testa.

## Mapa de arquivos

| Arquivo | Tarefa | O quê |
| --- | --- | --- |
| `publicacao/implantar.sh` | 1 | o script |
| `tradutor/principal.mts` | 1, 10 | comandos `migrar`, `execucoes` (1) e `indicadores` (10) |
| `tradutor/comandos-vps.mts` | 1 | `migrarAgora`, `listarExecucoes` |
| `tradutor/implantar.test.mts`, `tradutor/comandos-vps.test.mts` | 1 | testes |
| `sql/erp/cadastros.sql`, `sql/erp/colunas-esperadas.txt` | 2, 4 | descrição (2); natureza (4) |
| `docs/fases/FASE-4-vps.md` | 3, 12 | registro do que rodou na VPS |
| `sql/erp/naturezas.sql`, `sql/erp/documentos.sql`, `sql/carga/naturezas.sql`, `sql/carga/documentos.sql`, `sql/migracoes/010_natureza.sql` | 4 | natureza no tradutor do ERP novo |
| `tradutor/natureza.mts`, `tradutor/natureza.test.mts` | 4 | leitura, versão e aviso |
| `sql/migracoes/011_natureza_link.sql`, `sql/link/gravar.sql` | 5 | natureza da Link |
| `sql/migracoes/012_regras.sql`, `tradutor/apoio-regras.mts`, `tradutor/papel.test.mts` | 6 | digitados, visões e o apoio dos testes das regras |
| `sql/regras/vendas.sql`, `tradutor/indicadores.mts`, `tradutor/regras-vendas.test.mts` | 7 | vendas |
| `sql/regras/compras.sql`, `tradutor/regras-compras.test.mts` | 8 | compras e estoque |
| `sql/regras/financeiro.sql`, `tradutor/regras-financeiro.test.mts` | 9 | financeiro |
| `sql/migracoes/013_resposta.sql`, `tradutor/indicadores.mts`, `tradutor/execucao.mts`, `tradutor/telegram.mts`, `tradutor/tipos.mts`, `tradutor/indicadores.test.mts`, `tradutor/execucao-indicadores.test.mts` | 10 | a rotina |
| `docs/fases/FASE-4-ensaio-pc.md` | 11 | o ensaio no PC |

## Interfaces compartilhadas

Estas definições valem para todas as tarefas; o texto exato das migrações está aqui porque várias tarefas (e os testes delas) dependem dele.

### `sql/migracoes/010_natureza.sql` (tarefa 4)

```sql
-- Naturezas de operação (spec da Fase 4, seção 6): uma versão por mudança; o documento guarda a versão da época.
create table kaizen.natureza (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  descricao text,
  categoria text,
  estoque boolean not null,
  reserva boolean not null,
  financeiro boolean not null,
  troca boolean not null,
  valida_desde timestamptz not null default now()
);

create index on kaizen.natureza (fonte, codigo, id);

alter table kaizen.documento
  add column natureza text,
  add column natureza_id bigint references kaizen.natureza (id);
```

### `sql/migracoes/011_natureza_link.sql` (tarefa 5)

```sql
-- As três naturezas da Link (spec da Fase 4, decisão 9): o comportamento que a Link tinha, fixo.
insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca, valida_desde) values
  ('link', 'pedido', 'PEDIDO DA LINK', 'V', true, false, true, false, '2026-04-01 00:00:00-03'),
  ('link', 'orcamento', 'ORÇAMENTO DA LINK', 'V', false, false, false, false, '2026-04-01 00:00:00-03'),
  ('link', 'nota_entrada', 'NOTA DE ENTRADA DA LINK', 'C', true, false, false, false, '2026-04-01 00:00:00-03');

insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('link', 'natureza_pelo_modelo', 'A/true', 'pedido'),
  ('link', 'natureza_pelo_modelo', 'T/true', 'pedido'),
  ('link', 'natureza_pelo_modelo', 'P/false', 'orcamento'),
  ('link', 'natureza_pelo_modelo', '55', 'nota_entrada');
```

### `sql/migracoes/012_regras.sql` (tarefa 6)

```sql
-- O que o dono digita (spec da Fase 4, seção 7).
create table kaizen.meta (
  id bigint generated always as identity primary key,
  mes date not null check (extract(day from mes) = 1),
  vendedor text,
  valor numeric not null check (valor > 0)
);

create unique index meta_mes_vendedor on kaizen.meta (mes, coalesce(vendedor, ''));

create table kaizen.feriado (
  data date primary key,
  descricao text not null
);

-- Os dias de segunda a sábado sem expediente desde abril (spec, decisão 11).
insert into kaizen.feriado (data, descricao) values
  ('2026-05-01', 'Dia do Trabalho; a loja não abriu'),
  ('2026-09-07', 'Independência; a loja não abriu'),
  ('2026-09-26', 'pausa da virada entre a Link e o ERP novo (inventário)');

create table kaizen.saldo_banco (
  data date primary key,
  valor numeric not null
);

-- A natureza do documento, no fim da visão (create or replace só acrescenta colunas no fim).
create or replace view kaizen.documento_negocio as
select
  d.id, d.fonte, d.origem_tabela, d.origem_id, d.codigo, d.modelo,
  tt.valor as tipo,
  d.status,
  coalesce(ts.valor, tsm.valor) as situacao,
  coalesce(tm.valor, tmm.valor) as movimento,
  coalesce(tf.valor, tfm.valor) as financeiro,
  d.criado_em, d.fechado_em, d.pessoa,
  d.turno_caixa, d.turno_usuario, d.turno_numero, d.visto_em,
  d.natureza, d.natureza_id, n.categoria, n.estoque as mexe_estoque, n.financeiro as mexe_financeiro, n.troca
from kaizen.documento d
left join kaizen.traducao tt on tt.fonte = d.fonte and tt.campo = 'tipo' and tt.codigo = d.modelo
left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'situacao' and ts.codigo = d.status
left join kaizen.traducao tsm on tsm.fonte = d.fonte and tsm.campo = 'situacao_pelo_modelo' and tsm.codigo = d.modelo
left join kaizen.traducao tm on tm.fonte = d.fonte and tm.campo = 'movimento' and tm.codigo = d.movimento
left join kaizen.traducao tmm on tmm.fonte = d.fonte and tmm.campo = 'movimento_pelo_modelo' and tmm.codigo = d.modelo
left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'financeiro' and tf.codigo = d.financeiro
left join kaizen.traducao tfm on tfm.fonte = d.fonte and tfm.campo = 'financeiro_pelo_modelo' and tfm.codigo = d.modelo
left join kaizen.natureza n on n.id = d.natureza_id;

-- O papel de cada documento emitido (spec, decisão 8): com natureza, pela natureza; sem, pelo tipo traduzido.
create view kaizen.documento_papel as
select
  dn.id, dn.fonte,
  coalesce(dn.fechado_em, dn.criado_em)::date as dia,
  case
    when dn.natureza_id is null then dn.tipo
    when dn.troca then 'troca'
    when dn.categoria = 'V' and dn.mexe_financeiro then 'venda'
    when dn.categoria = 'C' and dn.mexe_estoque then 'compra'
    else 'outro'
  end as papel
from kaizen.documento_negocio dn
where dn.situacao = 'emitido';

-- Os itens que contam como vendido e devolvido (docs/LOJA.md), iguais para as duas fontes.
create view kaizen.venda_item as
select
  p.id as documento, p.fonte, p.dia,
  extract(hour from coalesce(d.fechado_em, d.criado_em))::int as hora,
  d.pessoa, i.produto, i.vendedor, i.quantidade, i.valor_liquido as valor,
  case s.valor when 'saida' then 'vendido' else 'devolvido' end as sentido
from kaizen.documento_papel p
join kaizen.documento d on d.id = p.id
join kaizen.documento_item i on i.documento_id = d.id
join kaizen.traducao s on s.fonte = d.fonte and s.campo = 'sentido' and s.codigo = i.sentido
where p.papel in ('venda', 'troca') and i.vendedor is not null and s.valor in ('saida', 'entrada');
```

### `sql/migracoes/013_resposta.sql` (tarefa 10)

```sql
-- As respostas das três perguntas, uma por dia e pergunta (spec da Fase 4, seção 9).
create table kaizen.resposta (
  data date not null,
  pergunta text not null check (pergunta in ('vendas', 'compras', 'financeiro')),
  conteudo jsonb not null,
  calculado_em timestamptz not null default now(),
  primary key (data, pergunta)
);
```

### Regras (`sql/regras/*.sql`, tarefas 7 a 9)

Cada arquivo é **um único `select`** que recebe o dia em `$1` (`$1::date`) e devolve **uma linha com uma coluna `resposta` do tipo `jsonb`**, com as chaves da seção 8 da spec. Pode começar com `with`. Não termina com `;`. É usado assim pela tarefa 10:

```sql
insert into kaizen.resposta (data, pergunta, conteudo)
select $1::date, $2, r.resposta from (<conteúdo do arquivo>) r
on conflict (data, pergunta) do update set conteudo = excluded.conteudo, calculado_em = now()
```

### `tradutor/indicadores.mts`

- Tarefa 7 cria: `export type Pergunta = 'vendas' | 'compras' | 'financeiro'`; `export const PERGUNTAS: Pergunta[] = ['vendas', 'compras', 'financeiro']`; `export function lerRegra(pergunta: Pergunta): string` (lê `sql/regras/<pergunta>.sql`); `export async function responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any>` (roda a regra com `[dia]` e devolve `rows[0].resposta`, o objeto que o `pg` monta do jsonb — só para testes e para imprimir).
- Tarefa 10 acrescenta: `export async function calcularRespostas(cliente: Cliente, dias: string[]): Promise<number>` e `export function diasDaHistoria(hoje: string): string[]` (de `2026-04-01` a `hoje`, inclusive).

### `tradutor/apoio-regras.mts` (tarefa 6; usado pelos testes das tarefas 6 a 10)

Funções que montam documentos à mão num banco de teste (`criarBancoKaizen()`), preenchendo `origem_tabela`/`origem_id` sozinhas (um contador):

```ts
export async function inserirNatureza(c: Cliente, n: { fonte?: 'meuerp' | 'link'; codigo: string; descricao?: string; categoria: string; estoque: boolean; reserva?: boolean; financeiro: boolean; troca?: boolean }): Promise<number>
export async function inserirDocumento(c: Cliente, d: { fonte?: 'meuerp' | 'link'; modelo: string; status?: string | null; criadoEm: string; fechadoEm?: string | null; pessoa?: string | null; naturezaId?: number | null; natureza?: string | null; codigo?: string }): Promise<number>
export async function inserirItem(c: Cliente, documentoId: number, i: { produto: string; sentido: 'S' | 'E' | 'N'; quantidade: string; valor: string; vendedor?: string | null }): Promise<void>
export async function inserirPagamento(c: Cliente, documentoId: number, p: { forma: string; valor: string }): Promise<void>
export async function inserirParcela(c: Cliente, documentoId: number, p: { lancadoEm: string; vencimento: string; valor: string; status: string }): Promise<number>
export async function inserirBaixa(c: Cliente, parcelaId: number, b: { pagoEm: string; valor: string; forma?: string | null; status: string }): Promise<void>
export async function inserirConferencia(c: Cliente, documentoId: number, f: { forma: string; calculado: string; informado: string }): Promise<void>
export async function inserirMovimento(c: Cliente, m: { produto: string; momento: string; saldoAntes: string; saldoDepois: string; origemId: string }): Promise<void>
export async function inserirVirada(c: Cliente, produto: string, quantidade: string): Promise<void>
export async function inserirProduto(c: Cliente, p: { codigo: string; descricao?: string; grupo?: string | null; marca?: string | null; custo?: string | null; ativo?: boolean; fonte?: 'meuerp' | 'link' }): Promise<void>
export async function inserirFuncionario(c: Cliente, f: { codigo: string; nome: string; tipo: string | null; fonte?: 'meuerp' | 'link' }): Promise<void>
export async function inserirFornecedor(c: Cliente, produto: string, fornecedor: string): Promise<void>
```

`status` do documento e das parcelas é o código cru da fonte (`'E'`, `'C'` no ERP novo; `'false'`/`'true'` na Link); `forma` e `sentido` também são os códigos crus, traduzidos por `kaizen.traducao`. Padrões: `fonte = 'meuerp'`; `status = 'E'` (na Link, passe `null`: a situação vem pelo modelo); `fechadoEm` ausente = igual a `criadoEm` (passe `null` para deixar vazio); `codigo` ausente = o número do contador; `natureza`/`naturezaId` ausentes = vazios; `vendedor` ausente = vazio; `ativo = true`; `reserva = false`; `troca = false`; `descricao` da natureza = o código. `inserirDocumento` grava `origem_tabela = 'documento'` e `origem_id` = contador; `movimento` e `financeiro` do documento ficam vazios (as regras não os usam). Datas e horas em texto `'AAAA-MM-DD HH:MI:SS'` (Fortaleza), valores em texto (`'150.00'`).

## Contagem de testes

| Ao fim da tarefa | Testes |
| --- | --- |
| início | 329 |
