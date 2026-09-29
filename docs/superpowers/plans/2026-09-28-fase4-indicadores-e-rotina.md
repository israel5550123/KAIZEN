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
| `docs/fases/FASE-4-vps.md` | 3, 12, 13 | registro do que rodou na VPS |
| `sql/erp/naturezas.sql`, `sql/erp/documentos.sql`, `sql/carga/naturezas.sql`, `sql/carga/documentos.sql`, `sql/migracoes/010_natureza.sql` | 4 | natureza no tradutor do ERP novo |
| `tradutor/natureza.mts`, `tradutor/natureza.test.mts`, `sql/carga/naturezas.sql` | 4 | leitura, versão e aviso |
| `tradutor/execucao.mts`, `tradutor/tipos.mts`, `tradutor/telegram.mts` | 4, 10 | natureza lida e gravada, aviso `natureza_mudou` (4); cálculo e motivo `indicadores` (10) |
| `tradutor/avisos.mts`, `tradutor/carga.mts`, `tradutor/conferencias.mts` e os testes `avisos`, `consulta-documentos`, `sql-erp`, `erp-falso`, `traducao-operacao-real` | 4 | aviso novo, carga das naturezas, código de natureza sem versão |
| `sql/migracoes/011_natureza_link.sql`, `sql/link/gravar.sql`, `tradutor/link-natureza.test.mts` | 5 | natureza da Link |
| `sql/migracoes/012_regras.sql`, `tradutor/apoio-regras.mts`, `tradutor/papel.test.mts` | 6 | digitados, visões e o apoio dos testes das regras |
| `sql/regras/vendas.sql`, `tradutor/indicadores.mts`, `tradutor/regras-vendas.test.mts` | 7 | vendas |
| `sql/regras/compras.sql`, `tradutor/regras-compras.test.mts` | 8 | compras e estoque |
| `sql/regras/financeiro.sql`, `tradutor/regras-financeiro.test.mts` | 9 | financeiro |
| `sql/migracoes/013_resposta.sql`, `tradutor/indicadores.mts`, `tradutor/indicadores.test.mts`, `tradutor/execucao-indicadores.test.mts`, `tradutor/principal.mts` | 10 | a rotina e o comando `indicadores` |
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

A contagem esperada em `testes-esperados.txt` ao fim de cada tarefa (329 no início da fase).

| Ao fim da tarefa | Acrescenta | Testes |
| --- | --- | --- |
| início | — | 329 |
| 1 | 12 | 341 |
| 2 | 2 | 343 |
| 3 | 0 | 343 |
| 4 | 12 | 355 |
| 5 | 3 | 358 |
| 6 | 9 | 367 |
| 7 | 13 | 380 |
| 8 | 11 | 391 |
| 9 | 16 | 407 |
| 10 | 12 | 419 |
| 11 | 0 | 419 |
| 12 | 0 | 419 |
| 13 | 0 | 419 |

## Revisão da branch no meio da fase

Depois da tarefa 10 (a leitura com a natureza, as regras e a rotina se ligam ali), e antes da tarefa 11, o orquestrador despacha uma revisão da branch inteira até aquele ponto (`docs/AUTONOMIA.md`, "Como uma fase roda"). Os achados viram correções antes do ensaio no PC.

## Tarefas

### Task 1: `publicacao/implantar.sh` e os comandos `migrar` e `execucoes`

**O que esta tarefa entrega, em resultado:** a única porta do agente para a VPS (spec, seção 5 e decisões 1 a 5). `bash publicacao/implantar.sh publicar [ramo]` publica na stack `kaizen` a versão de um ramo do GitHub e aplica as migrações do esquema `kaizen`; `log [horas]` lê o log da stack; `rodar <comando>` roda no contêiner do Kaizen um de cinco comandos fixos (`link`, `noite`, `indicadores <dia>…`, `execucoes [dia]`, `teste-telegram`). Todo argumento é conferido no PC antes de qualquer `ssh`: `"main;id"`, `"../x"`, `"2026-04-15;id"` ou `bash` param com código 2 sem falar com a VPS. `publicar` e `rodar` só vão de hh:10 a hh:50, nunca das 22h às 22h59, pela hora da VPS em Fortaleza. Um `stack.yml` diferente do conhecido para a publicação antes de mudar qualquer coisa. No contêiner, `principal.mts migrar` aplica as migrações com a mesma trava das leituras, e `principal.mts execucoes [dia]` lista `kaizen.execucao` por dia de Fortaleza, uma linha por execução, com a contagem por resultado no fim.

**Arquivos:**
- Criar: `publicacao/implantar.sh`, `tradutor/comandos-vps.mts`, `tradutor/implantar.test.mts`, `tradutor/comandos-vps.test.mts`
- Modificar: `tradutor/principal.mts` (dois `import`, a linha `USO` e dois blocos novos depois do comando `conferencia`), `testes-esperados.txt`

**Interfaces:**
- Consome (já existe, não muda): `aplicarMigracoes(cliente: Cliente, pasta?: string): Promise<string[]>` e `PASTA_MIGRACOES` de `tradutor/migracoes.mts` (já devolve os nomes aplicados, com `.sql`); `TRAVA` (`20260928`) de `tradutor/constantes.mts`; `emFortaleza(ms: number)` e `somarDias(data: string, dias: number)` de `tradutor/janela.mts`; `conectar(url)` e o tipo `Cliente` de `tradutor/banco.mts`; `lerConfig(env)` de `tradutor/config.mts`; `criarBancoKaizen({ migrar?: boolean })` de `tradutor/apoio-teste.mts`; a tabela `kaizen.execucao` (migração 001).
- Produz:
  - `publicacao/implantar.sh`, chamado pelo Git Bash a partir da raiz do repositório: `publicar [ramo]` (padrão `main`), `log [horas]` (padrão 24), `rodar link | noite | indicadores <AAAA-MM-DD>… | execucoes [AAAA-MM-DD] | teste-telegram`. Sai com 2 para argumento errado, 1 para falha (fora da janela, VPS sem resposta, passo que falhou), e no `rodar` com o código do comando no contêiner. A função `dentro_da_janela HH MM` (0 dentro, 1 fora) se testa com o script carregado por `source`, que não roda o principal. A linha `SHA256_STACK=<64 hex>` guarda o sha256 de `publicacao/stack.yml`.
  - `rodar indicadores <dia>…` vira `tradutor/principal.mts indicadores <dia>…`, que a tarefa 10 cria; até lá, o principal responde com o uso e sai com 2.
  - `tradutor/comandos-vps.mts`: `migrarAgora(cliente: Cliente, pasta?: string): Promise<{ codigo: number; texto: string }>` e `listarExecucoes(cliente: Cliente, desde: string): Promise<string[]>` (`desde` em `'AAAA-MM-DD'`).
  - `tradutor/principal.mts`: os comandos `migrar` e `execucoes [AAAA-MM-DD]`; a linha `USO` passa a terminar em `| migrar | execucoes [AAAA-MM-DD]` (a tarefa 10 acrescenta `indicadores`).
  - Esta tarefa acrescenta 12 testes: 8 em `tradutor/implantar.test.mts` e 4 em `tradutor/comandos-vps.test.mts`.

**Fora desta tarefa:** a regra do `allow` no `.claude/settings.json` e a entrada em `docs/DECISOES.md` sobre ela (o orquestrador faz, depois da aprovação do revisor; `docs/AUTONOMIA.md`, "Acesso à VPS"); a primeira chamada de verdade à VPS (tarefa 3).

**Antes de começar:** rode tudo no Git Bash, a partir de `C:\Projetos\KAIZEN`, na branch `fase-4`, com o Postgres local no ar (`docker compose up -d --wait`). **Nesta tarefa, não rode `publicacao/implantar.sh` fora dos testes**: a chave SSH do PC está autorizada na VPS, e o script falaria com ela de verdade. Os testes trocam o `ssh` por um falso, que só anota as chamadas. O bash do Git põe `/usr/bin` (onde está o `ssh` de verdade) na frente do `PATH` que o Windows passa; por isso o `ssh` falso entra no `PATH` dentro do próprio bash, e cada rodada confere `type -P ssh` antes de rodar o script (se não for o falso, sai com 99 sem rodar nada). O hook `.claude/hooks/guarda-bash.js` recusa comando com `ssh` ou `scp` soltos; nenhum comando desta tarefa tem.

- [ ] **Passo 1: Escrever os testes do script**

Crie `tradutor/implantar.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// O script roda no Git Bash (spec da Fase 4, decisão 5); no PowerShell deste PC, `bash` é o do WSL.
const BASH = 'C:\\Program Files\\Git\\bin\\bash.exe'
const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const VPS = '-o BatchMode=yes root@100.118.200.65'

function ler(caminho: string): string {
  return readFileSync(join(RAIZ, caminho), 'utf8')
}

// O ssh falso: anota cada chamada (os argumentos juntos, uma chamada por NUL) e responde o que a VPS responderia.
const SSH_FALSO = [
  '#!/bin/bash',
  'printf \'%s\\0\' "$*" >> "$(dirname "$0")/chamadas"',
  'case "$*" in',
  '  *"date +%H:%M"*) echo "$HORA_FALSA" ;;',
  '  *sha256sum*) echo "$SHA256_FALSO  -" ;;',
  '  *"rev-parse --short HEAD"*) echo "Already up to date."; echo abc1234 ;;',
  '  *"service inspect"*) echo "kaizen-tradutor:ecf9280 kaizen_env_v1" ;;',
  'esac',
  '',
].join('\n')

// O bash do Git põe /usr/bin, onde está o ssh de verdade, na frente do PATH que o Windows passa: o ssh falso
// entra no PATH dentro do próprio bash, e o script só roda se `ssh` for o falso (senão sai com 99 sem rodar nada).
const PREPARO = 'F="$(cygpath -u "$1")"; export PATH="$F:$PATH"; [ "$(type -P ssh)" = "$F/ssh" ] || exit 99; shift; exec bash publicacao/implantar.sh "$@"'

type Rodada = { codigo: number | null; saida: string; chamadas: string[] }

function rodarScript(argumentos: string[], opcoes: { hora?: string; sha256?: string } = {}): Rodada {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-ssh-'))
  try {
    writeFileSync(join(pasta, 'ssh'), SSH_FALSO)
    const r = spawnSync(BASH, ['-c', PREPARO, '_', pasta, ...argumentos], {
      cwd: RAIZ,
      encoding: 'utf8',
      env: { ...process.env, HORA_FALSA: opcoes.hora ?? '14:30', SHA256_FALSO: opcoes.sha256 ?? '' },
    })
    const arquivo = join(pasta, 'chamadas')
    const chamadas = existsSync(arquivo) ? readFileSync(arquivo, 'utf8').split('\0').filter((c) => c !== '') : []
    return { codigo: r.status, saida: r.stdout + r.stderr, chamadas }
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}

// O sha256 que a VPS calcula é o do arquivo como o git guarda: com .gitattributes (publicacao/* eol=lf), sem CR.
function sha256DoStack(): string {
  return createHash('sha256').update(ler('publicacao/stack.yml').replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

test('implantar.sh: em LF, só os docker da stack kaizen e nenhuma palavra proibida', () => {
  const script = ler('publicacao/implantar.sh')
  assert.ok(!script.includes('\r'), 'o implantar.sh tem CR: o bash do Git não lê CRLF')
  // Cada "docker " do script começa um dos comandos permitidos (spec, seção 5).
  const permitidos = [
    'build -f publicacao/Dockerfile -t kaizen-tradutor:',
    'stack deploy -c publicacao/stack.yml --resolve-image never kaizen',
    'service inspect kaizen_tradutor ',
    'service ls --filter name=kaizen_',
    'service logs --timestamps --since ',
    'ps -q -f name=kaizen_tradutor',
    'exec -w /kaizen ',
  ]
  const usados = new Set<string>()
  for (const m of script.matchAll(/docker\s+/g)) {
    const resto = script.slice(m.index + m[0].length)
    const permitido = permitidos.find((p) => resto.startsWith(p))
    assert.ok(permitido, `docker fora da lista: docker ${resto.split('\n')[0]}`)
    usados.add(permitido)
  }
  assert.equal(usados.size, permitidos.length, 'todos os comandos da lista aparecem no script')
  // Nem em comentário. Letras em volta não contam: ".Secrets" (o nome do segredo em uso) e "--format" passam.
  const proibida = /(?<![a-z])(prumo|erp\.|psql|secret|volume|network|rm|rmi|prune|scale|update)(?![a-z])/i
  const achada = proibida.exec(script)
  assert.equal(achada, null, `palavra proibida no script: ${achada?.[0]}`)
})

test('implantar.sh: o sha256 escrito nele é o do publicacao/stack.yml do repositório', () => {
  const escrito = /^SHA256_STACK=([0-9a-f]{64})$/m.exec(ler('publicacao/implantar.sh'))
  assert.ok(escrito, 'o script tem a linha SHA256_STACK=<64 letras e números>')
  assert.equal(escrito[1], sha256DoStack())
})

test('implantar.sh: a janela vai de hh:10 a hh:50, inclusive, e nunca das 22h às 22h59', () => {
  const horarios = ['14 09', '14 10', '14 50', '14 51', '22 30', '23 15']
  const laco = `for hm in ${horarios.map((h) => `"${h}"`).join(' ')}; do if dentro_da_janela $hm; then echo "$hm dentro"; else echo "$hm fora"; fi; done`
  // Carregado com source: as funções ficam disponíveis e o principal do script não roda.
  const r = spawnSync(BASH, ['-c', `source publicacao/implantar.sh && ${laco}`], { cwd: RAIZ, encoding: 'utf8' })
  assert.equal(r.stderr, '')
  assert.deepEqual(r.stdout.trim().split('\n'), ['14 09 fora', '14 10 dentro', '14 50 dentro', '14 51 fora', '22 30 fora', '23 15 dentro'])
})

test('implantar.sh: argumento fora do formato sai com 2 sem chamar o ssh', () => {
  const casos = [
    ['rodar', 'indicadores', '2026-04-15;id'],
    ['rodar', 'bash'],
    ['rodar', 'link', 'x'],
    ['publicar', 'main;id'],
    ['publicar', '../x'],
    ['publicar', 'fase-4/../main'],
    ['log', '24;id'],
    ['log', 'abc'],
  ]
  for (const argumentos of casos) {
    const r = rodarScript(argumentos)
    assert.equal(r.codigo, 2, `${argumentos.join(' ')}: ${r.saida}`)
    assert.deepEqual(r.chamadas, [], argumentos.join(' '))
    assert.match(r.saida, /^uso: bash publicacao\/implantar\.sh /)
  }
})

test('implantar.sh: log e rodar mandam à VPS as linhas fixas', () => {
  const log = rodarScript(['log', '24'])
  assert.equal(log.codigo, 0, log.saida)
  // O log só lê: não confere a janela.
  assert.deepEqual(log.chamadas, [
    `${VPS} docker service ls --filter name=kaizen_ && docker service logs --timestamps --since 24h kaizen_tradutor`,
  ])

  const execucoes = rodarScript(['rodar', 'execucoes', '2026-09-28'])
  assert.equal(execucoes.codigo, 0, execucoes.saida)
  assert.deepEqual(execucoes.chamadas, [
    `${VPS} TZ=America/Fortaleza date +%H:%M`,
    `${VPS} C=$(docker ps -q -f name=kaizen_tradutor | head -n 1); [ -n "$C" ] || { echo "nenhum contêiner do kaizen_tradutor rodando"; exit 1; }; `
      + 'docker exec -w /kaizen "$C" node --env-file=/run/secrets/kaizen_env tradutor/principal.mts execucoes 2026-09-28',
  ])
})

test('implantar.sh: fora da janela, rodar para depois de ler a hora e diz quando pode rodar', () => {
  const r = rodarScript(['rodar', 'execucoes', '2026-09-28'], { hora: '14:05' })
  assert.equal(r.codigo, 1)
  assert.deepEqual(r.chamadas, [`${VPS} TZ=America/Fortaleza date +%H:%M`])
  assert.equal(r.saida, 'fora da janela (agora 14h05): rode entre 14h10 e 14h50\n')
})

test('implantar.sh: publicar para sem mudar nada quando o stack.yml do ramo não é o que o script conhece', () => {
  const r = rodarScript(['publicar', 'fase-4'], { sha256: '0'.repeat(64) })
  assert.equal(r.codigo, 1)
  assert.deepEqual(r.chamadas, [
    `${VPS} TZ=America/Fortaleza date +%H:%M`,
    `${VPS} cd /opt/kaizen && git fetch origin && git show origin/fase-4:publicacao/stack.yml | sha256sum`,
  ])
  assert.match(r.saida, /publicar: o publicacao\/stack\.yml de origin\/fase-4 não é o que este script conhece \(sha256 0{64}\); nada mudou na VPS/)
})

test('implantar.sh: publicar manda à VPS os passos da spec, na ordem, e diz o que ficou no ar', () => {
  const r = rodarScript(['publicar', 'fase-4'], { sha256: sha256DoStack() })
  assert.equal(r.codigo, 0, r.saida)
  const novo = '-f name=kaizen_tradutor -f ancestor=kaizen-tradutor:abc1234'
  assert.deepEqual(r.chamadas, [
    `${VPS} TZ=America/Fortaleza date +%H:%M`,
    `${VPS} cd /opt/kaizen && git fetch origin && git show origin/fase-4:publicacao/stack.yml | sha256sum`,
    `${VPS} cd /opt/kaizen && git checkout fase-4 && git merge --ff-only origin/fase-4 && git rev-parse --short HEAD`,
    `${VPS} docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}} {{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}'`,
    `${VPS} cd /opt/kaizen && docker build -f publicacao/Dockerfile -t kaizen-tradutor:abc1234 .`,
    `${VPS} cd /opt/kaizen && KAIZEN_SHA=abc1234 KAIZEN_SEGREDO=kaizen_env_v1 docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen`,
    `${VPS} for i in $(seq 24); do [ "$(docker service ls --filter name=kaizen_tradutor --format '{{.Replicas}}')" = 1/1 ] && [ -n "$(docker ps -q ${novo})" ] && exit 0; sleep 5; done; exit 1`,
    `${VPS} C=$(docker ps -q ${novo} | head -n 1); docker exec -w /kaizen "$C" node --env-file=/run/secrets/kaizen_env tradutor/principal.mts migrar`,
    `${VPS} docker service ls --filter name=kaizen_`,
  ])
  assert.match(r.saida, /publicar: kaizen-tradutor:abc1234 no ar \(antes: kaizen-tradutor:ecf9280\)\n/)
})
```

O que cada teste prova:
- o primeiro lê o arquivo: cada `docker ` do script começa um dos sete comandos da seção 5 da spec, todos os sete aparecem, e nenhuma das palavras proibidas aparece, nem em comentário. A busca não diferencia maiúsculas e exige que não haja letra antes nem depois: assim `.Secrets` e `.SecretName` (o formato do passo 9 do roteiro, que lê o nome do segredo em uso), `/run/secrets/kaizen_env` (onde o segredo aparece dentro do contêiner) e `--format` passam, e `docker secret`, `rm -f`, `--update` ou `prumo_default` não;
- o segundo confere a linha `SHA256_STACK=` contra o sha256 de `publicacao/stack.yml`, calculado sem CR, que é o conteúdo que o git guarda (`.gitattributes`: `publicacao/* text eol=lf`) e o que a VPS calcula com `git show origin/<ramo>:publicacao/stack.yml | sha256sum`;
- o terceiro roda `dentro_da_janela` com as seis horas da spec (seção 12). `14 09` pega o erro do bash com `09` lido como octal (`value too great for base`): por isso a conferência de que a saída de erro está vazia;
- os outros rodam o script com o `ssh` falso. O falso responde `HORA_FALSA` (padrão `14:30`) ao `date`, `SHA256_FALSO` ao `sha256sum`, `abc1234` ao `rev-parse` e `kaizen-tradutor:ecf9280 kaizen_env_v1` ao `service inspect`; a qualquer outro comando, nada, com código 0. O caso `publicar fase-4/../main` está a mais na lista da spec porque `../x` já cai pela primeira letra e não prova a regra "sem `..`".

- [ ] **Passo 2: Escrever os testes dos comandos**

Crie `tradutor/comandos-vps.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import type { Cliente } from './banco.mts'
import { listarExecucoes, migrarAgora } from './comandos-vps.mts'
import { TRAVA } from './constantes.mts'
import { principal } from './principal.mts'

// Duas migrações de mentira, numa pasta própria: o teste não depende da lista de sql/migracoes, que cresce a cada fase.
function pastaComMigracoes(): string {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  writeFileSync(join(pasta, '001_primeira.sql'), 'create table kaizen.primeira (x int)')
  writeFileSync(join(pasta, '002_segunda.sql'), 'create table kaizen.segunda (x int)')
  return pasta
}

test('migrar aplica as migrações pendentes e diz quais; de novo, diz que não há nenhuma; e solta a trava', async () => {
  const banco = await criarBancoKaizen({ migrar: false })
  const pasta = pastaComMigracoes()
  const outra = await conectar(banco.url)
  try {
    assert.deepEqual(await migrarAgora(banco.cliente, pasta), { codigo: 0, texto: 'migrar: aplicadas 001_primeira, 002_segunda' })
    const tabelas = await banco.cliente.query(`select tablename from pg_tables where schemaname = 'kaizen' order by 1`)
    assert.deepEqual(tabelas.rows.map((l) => l.tablename), ['migracao', 'primeira', 'segunda'])
    assert.deepEqual(await migrarAgora(banco.cliente, pasta), { codigo: 0, texto: 'migrar: nenhuma migração pendente' })
    // A leitura seguinte, em outra conexão, pega a trava.
    const trava = await outra.query('select pg_try_advisory_lock($1) as ok', [TRAVA])
    assert.equal(trava.rows[0].ok, true)
  } finally {
    await outra.end()
    rmSync(pasta, { recursive: true, force: true })
    await banco.fechar()
  }
})

test('migrar com a trava presa por uma leitura sai com 1, diz para rodar de novo e não aplica nada', async () => {
  const banco = await criarBancoKaizen({ migrar: false })
  const pasta = pastaComMigracoes()
  const leitura = await conectar(banco.url)
  try {
    await leitura.query('select pg_advisory_lock($1)', [TRAVA])
    assert.deepEqual(await migrarAgora(banco.cliente, pasta), {
      codigo: 1,
      texto: 'migrar: uma leitura está rodando; rode de novo em alguns minutos',
    })
    const migracao = await banco.cliente.query(`select to_regclass('kaizen.migracao') is not null as existe`)
    assert.equal(migracao.rows[0].existe, false)
  } finally {
    await leitura.end()
    rmSync(pasta, { recursive: true, force: true })
    await banco.fechar()
  }
})

// 130 caracteres: a linha mostra os 120 primeiros e as reticências.
const LONGA = '0123456789'.repeat(13)

const LINHAS_DESDE_28_09 = [
  'id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem',
  '2 | noite | manual | 28/09 00:00 | aviso | 2 | sim | —',
  '3 | hora | agendada | 28/09 17:00 | pulada | 1 | — | —',
  `4 | hora | agendada | 28/09 18:00 | falha | 0 | não | ${'0123456789'.repeat(12)}…`,
  '5 | hora | agendada | 28/09 19:00 | ok | 0 | — | —',
  '6 | hora | agendada | 28/09 20:00 | — | 0 | — | —',
  'contagem desde 28/09/2026: ok 1, aviso 1, falha 1, pulada 1, sem resultado 1 (total 5)',
]

async function inserirExecucoes(cliente: Cliente): Promise<void> {
  // A 1 começa às 22h de 27/09 em Fortaleza, que já é 28/09 (1h) em UTC: fica de fora. A 2 começa à 0h de 28/09: entra.
  // A 6 ainda não terminou (sem resultado).
  await cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, mensagem, avisos, telegram_ok) values
       ('noite', false, '2026-09-27 22:00:00-03', '2026-09-27 22:04:00-03', 'ok', null, '[]', null),
       ('noite', true, '2026-09-28 00:00:00-03', '2026-09-28 00:03:00-03', 'aviso', null, '[{"tipo":"a"},{"tipo":"b"}]', true),
       ('hora', false, '2026-09-28 17:00:02-03', '2026-09-28 17:00:03-03', 'pulada', null, '[{"tipo":"execucao_pulada"}]', null),
       ('hora', false, '2026-09-28 18:00:01-03', '2026-09-28 18:00:40-03', 'falha', $1, '[]', false),
       ('hora', false, '2026-09-28 19:00:00-03', '2026-09-28 19:00:50-03', 'ok', null, '[]', null),
       ('hora', false, '2026-09-28 20:00:00-03', null, null, null, '[]', null)`,
    [LONGA],
  )
}

test('execucoes lista cada execução desde a 0h do dia em Fortaleza, uma por linha, e a contagem por resultado', async () => {
  const banco = await criarBancoKaizen()
  try {
    await inserirExecucoes(banco.cliente)
    assert.deepEqual(await listarExecucoes(banco.cliente, '2026-09-28'), LINHAS_DESDE_28_09)
  } finally {
    await banco.fechar()
  }
})

test('os comandos migrar e execucoes pelo principal: as mesmas linhas, os últimos 7 dias sem dia, e 2 com argumento errado', async (t) => {
  const banco = await criarBancoKaizen()
  try {
    const ambiente = { MEUERP_TOKEN: 'token-de-teste', KAIZEN_URL: banco.url }
    const impressos: string[] = []
    t.mock.method(console, 'log', (...partes: unknown[]) => {
      impressos.push(partes.join(' '))
    })

    assert.equal(await principal(['migrar'], ambiente), 0)
    assert.deepEqual(impressos.splice(0), ['migrar: nenhuma migração pendente'])

    await inserirExecucoes(banco.cliente)
    assert.equal(await principal(['execucoes', '2026-09-28'], ambiente), 0)
    assert.deepEqual(impressos.splice(0), LINHAS_DESDE_28_09)

    // Sem dia: desde 7 dias atrás. A de 8 dias atrás fica de fora; a de 6 dias atrás entra.
    await banco.cliente.query(`delete from kaizen.execucao`)
    await banco.cliente.query(
      `insert into kaizen.execucao (id, tipo, manual, inicio, fim, resultado) overriding system value values
         (7, 'hora', false, now() - interval '8 days', now() - interval '8 days', 'ok'),
         (8, 'hora', false, now() - interval '6 days', now() - interval '6 days', 'ok')`,
    )
    assert.equal(await principal(['execucoes'], ambiente), 0)
    const linhas = impressos.splice(0)
    assert.equal(linhas.length, 3)
    assert.match(linhas[1], /^8 \| hora \| agendada \| \d{2}\/\d{2} \d{2}:\d{2} \| ok \| 0 \| — \| —$/)
    assert.match(linhas[2], /^contagem desde \d{2}\/\d{2}\/\d{4}: ok 1, aviso 0, falha 0, pulada 0, sem resultado 0 \(total 1\)$/)

    assert.equal(await principal(['execucoes', 'ontem'], ambiente), 2)
    assert.equal(await principal(['execucoes', '2026-09-28', '2026-09-29'], ambiente), 2)
    assert.equal(await principal(['migrar', 'agora'], ambiente), 2)
  } finally {
    await banco.fechar()
  }
})
```

As contas dos valores esperados:
- `migrar` usa uma pasta com duas migrações de mentira, para não depender da lista de `sql/migracoes/`, que cresce nas tarefas 4 a 10. Pelo principal, num banco já migrado com a pasta de verdade, a resposta é `nenhuma migração pendente` com qualquer lista.
- `execucoes 2026-09-28`: a execução 1 começa às 22h de 27/09 em Fortaleza, que já é 01h de 28/09 em UTC; se o corte do dia fosse em UTC, ela entraria. A 2 começa exatamente à 0h de 28/09 e entra. A mensagem da 4 tem 130 caracteres (`'0123456789'` × 13); a linha mostra os 120 primeiros (× 12) e `…`. A 6 ainda não terminou: resultado vazio, `—`. Contagem: ok 1 (a 5), aviso 1 (a 2), falha 1 (a 4), pulada 1 (a 3), sem resultado 1 (a 6), total 5.
- Sem dia, `execucoes` lista desde a 0h de 7 dias atrás: `now() − 8 dias` cai num dia antes disso e fica de fora; `now() − 6 dias`, dentro. A hora exata depende de quando o teste roda, por isso só essa linha é conferida por padrão.

- [ ] **Passo 3: Rodar os testes e ver falhar**

Rode: `node --test tradutor/implantar.test.mts`
Saída esperada: `ℹ tests 8`, `ℹ pass 0`, `ℹ fail 8`. Os dois primeiros falham com `ENOENT: no such file or directory, open '...\publicacao\implantar.sh'`; os que rodam o script, com `bash: publicacao/implantar.sh: No such file or directory` na mensagem. Essa mensagem mostra que o `ssh` falso foi achado; se algum teste mostrar o código `99`, o `ssh` falso não entrou no `PATH`: pare e avise o orquestrador.

Rode: `node --test tradutor/comandos-vps.test.mts`
Saída esperada: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\comandos-vps.mts'`, `ℹ tests 1`, `ℹ fail 1`.

- [ ] **Passo 4: Conferir o sha256 do `stack.yml`**

Rode: `git show HEAD:publicacao/stack.yml | sha256sum`
Saída esperada: `ca0e773943418c2994ad8fa38ba3bfa1d4e54542a8c6fc8f214c3f495a526966  -`

É o valor da linha `SHA256_STACK=` do passo 5. Se sair outro, o `stack.yml` mudou depois deste plano: pare e avise o orquestrador (um `stack.yml` mudado precisa passar pelo revisor antes de ter o sha256 no script).

- [ ] **Passo 5: Escrever `publicacao/implantar.sh`**

Crie `publicacao/implantar.sh`, em LF (o `.gitattributes` já manda `*.sh` e `publicacao/*` em LF, e o teste confere):

```bash
#!/usr/bin/env bash
# A porta do agente para a VPS (spec da Fase 4, seção 5). Só a stack kaizen e o esquema kaizen: publica a versão
# de um ramo do GitHub, lê o log da stack e roda, no contêiner do Kaizen, uma lista fechada de comandos do Kaizen.
# Pelo Git Bash, a partir da raiz do repositório: bash publicacao/implantar.sh <subcomando> [argumentos]
# Todo argumento é conferido aqui, no PC, antes de qualquer ssh; fora do formato, sai com 2 sem falar com a VPS.

VPS=root@100.118.200.65
# sha256 de publicacao/stack.yml como o git o guarda: um stack.yml mudado não sobe sem passar pela revisão deste script.
SHA256_STACK=ca0e773943418c2994ad8fa38ba3bfa1d4e54542a8c6fc8f214c3f495a526966
NODE_KAIZEN='node --env-file=/run/secrets/kaizen_env'
USO='uso: bash publicacao/implantar.sh publicar [ramo] | log [horas] | rodar link | rodar noite | rodar indicadores AAAA-MM-DD... | rodar execucoes [AAAA-MM-DD] | rodar teste-telegram'

uso() {
  echo "$USO"
  exit 2
}

e_ramo() { [[ $1 =~ ^[a-z0-9][a-z0-9._/-]*$ && $1 != *..* ]]; }
e_horas() { [[ $1 =~ ^[0-9]{1,3}$ ]]; }
e_dia() { [[ $1 =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; }

# Um comando fixo por chamada.
vps() {
  ssh -o BatchMode=yes "$VPS" "$1"
}

# 0 dentro da janela, 1 fora: de hh:10 a hh:50, inclusive, e nunca das 22h às 22h59 (a leitura da noite).
dentro_da_janela() {
  local hora=$((10#$1)) minuto=$((10#$2))
  [ "$hora" -ne 22 ] && [ "$minuto" -ge 10 ] && [ "$minuto" -le 50 ]
}

# Pela hora da VPS em Fortaleza; fora da janela, para sem fazer nada e diz a partir de quando pode rodar.
conferir_janela() {
  local agora
  agora=$(vps 'TZ=America/Fortaleza date +%H:%M') || { echo 'a VPS não respondeu'; exit 1; }
  [[ $agora =~ ^([0-9]{2}):([0-9]{2})$ ]] || { echo "a VPS respondeu uma hora que não entendi: $agora"; exit 1; }
  local hora=$((10#${BASH_REMATCH[1]})) minuto=${BASH_REMATCH[2]}
  dentro_da_janela "$hora" "$minuto" && return 0
  local proxima=$hora
  [ "$((10#$minuto))" -gt 50 ] && proxima=$(( (hora + 1) % 24 ))
  [ "$proxima" -eq 22 ] && proxima=23
  echo "fora da janela (agora ${hora}h$minuto): rode entre ${proxima}h10 e ${proxima}h50"
  exit 1
}

parou() {
  echo "publicar: parou em $1"
  exit 1
}

publicar() {
  local ramo=$1 saida sha em_uso anterior segredo
  conferir_janela
  saida=$(vps "cd /opt/kaizen && git fetch origin && git show origin/$ramo:publicacao/stack.yml | sha256sum") || parou 'git fetch'
  if [ "${saida%% *}" != "$SHA256_STACK" ]; then
    echo "publicar: o publicacao/stack.yml de origin/$ramo não é o que este script conhece (sha256 ${saida%% *}); nada mudou na VPS"
    exit 1
  fi
  saida=$(vps "cd /opt/kaizen && git checkout $ramo && git merge --ff-only origin/$ramo && git rev-parse --short HEAD") \
    || parou "git checkout $ramo e git merge --ff-only origin/$ramo"
  echo "$saida"
  sha=${saida##*$'\n'}
  [[ $sha =~ ^[0-9a-f]{7,40}$ ]] || parou "o SHA do ramo ($sha)"
  em_uso=$(vps "docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}} {{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}'") \
    || parou 'a leitura da imagem e do segredo em uso'
  anterior=${em_uso%% *}
  segredo=${em_uso#* }
  [[ $anterior =~ ^kaizen-tradutor:[0-9a-f]{7,40}$ && $segredo =~ ^kaizen_env_v[0-9]+$ ]] \
    || parou "a leitura da imagem e do segredo em uso ($em_uso)"
  echo "publicar: em uso $anterior com o segredo $segredo; publicando kaizen-tradutor:$sha"
  vps "cd /opt/kaizen && docker build -f publicacao/Dockerfile -t kaizen-tradutor:$sha ." || parou 'a construção da imagem'
  vps "cd /opt/kaizen && KAIZEN_SHA=$sha KAIZEN_SEGREDO=$segredo docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen" \
    || parou 'o deploy da stack kaizen'
  echo "publicar: esperando o serviço em 1/1 com kaizen-tradutor:$sha (até 120 s)"
  # O contêiner novo é o da imagem nova: logo depois do deploy, o serviço ainda mostra 1/1 com o contêiner antigo.
  vps 'for i in $(seq 24); do [ "$(docker service ls --filter name=kaizen_tradutor --format '"'{{.Replicas}}'"')" = 1/1 ] && [ -n "$(docker ps -q -f name=kaizen_tradutor -f ancestor=kaizen-tradutor:'"$sha"')" ] && exit 0; sleep 5; done; exit 1' \
    || parou 'a espera do serviço em 1/1 com a imagem nova'
  vps 'C=$(docker ps -q -f name=kaizen_tradutor -f ancestor=kaizen-tradutor:'"$sha"' | head -n 1); docker exec -w /kaizen "$C" '"$NODE_KAIZEN"' tradutor/principal.mts migrar' \
    || parou 'as migrações (principal.mts migrar)'
  echo "publicar: kaizen-tradutor:$sha no ar (antes: $anterior)"
  vps 'docker service ls --filter name=kaizen_' || parou 'a leitura do estado do serviço'
}

ler_log() {
  vps "docker service ls --filter name=kaizen_ && docker service logs --timestamps --since ${1}h kaizen_tradutor"
}

# A lista fechada: cada comando vira uma linha fixa, rodada no contêiner do serviço kaizen_tradutor.
rodar() {
  local comando=${1-} linha dia
  shift
  case "$comando" in
    link) [ $# -eq 0 ] || uso; linha='tradutor/link.mts' ;;
    noite) [ $# -eq 0 ] || uso; linha='tradutor/principal.mts noite --manual' ;;
    indicadores)
      [ $# -ge 1 ] || uso
      for dia in "$@"; do e_dia "$dia" || uso; done
      linha="tradutor/principal.mts indicadores $*" ;;
    execucoes)
      [ $# -le 1 ] || uso
      [ $# -eq 0 ] || e_dia "$1" || uso
      linha="tradutor/principal.mts execucoes${1:+ $1}" ;;
    teste-telegram) [ $# -eq 0 ] || uso; linha='tradutor/principal.mts teste-telegram' ;;
    *) uso ;;
  esac
  conferir_janela
  vps 'C=$(docker ps -q -f name=kaizen_tradutor | head -n 1); [ -n "$C" ] || { echo "nenhum contêiner do kaizen_tradutor rodando"; exit 1; }; docker exec -w /kaizen "$C" '"$NODE_KAIZEN $linha"
}

principal() {
  local subcomando=${1-}
  [ $# -gt 0 ] && shift
  case "$subcomando" in
    publicar)
      [ $# -le 1 ] || uso
      e_ramo "${1-main}" || uso
      publicar "${1-main}" ;;
    log)
      [ $# -le 1 ] || uso
      e_horas "${1-24}" || uso
      ler_log "${1-24}" ;;
    rodar)
      [ $# -ge 1 ] || uso
      rodar "$@" ;;
    *) uso ;;
  esac
}

# Carregado com source (os testes), só define as funções.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  principal "$@"
fi
```

Pontos que o revisor vai olhar:
- os argumentos são conferidos em `principal` e `rodar` antes de `conferir_janela`, que é a primeira chamada ao `ssh`; o `log` não confere a janela (só lê);
- os valores que voltam da VPS e vão de novo a ela também são conferidos por formato: o SHA (`[0-9a-f]{7,40}`), a imagem em uso (`kaizen-tradutor:<sha>`) e o segredo em uso (`kaizen_env_v<n>`);
- a espera confere o `1/1` **e** um contêiner da imagem nova (`ancestor=kaizen-tradutor:<sha>`): logo depois do `stack deploy`, o serviço ainda mostra `1/1` com o contêiner antigo, e o `migrar` precisa rodar no novo;
- `docker exec -w /kaizen` faz o mesmo que o `sh -c 'cd /kaizen && …'` do roteiro, sem um shell a mais;
- `publicar` não apaga imagem nem contêiner (spec, decisão 3), e fora da janela sai com 1 (o 2 fica para argumento errado).

- [ ] **Passo 6: Rodar os testes do script e ver passar**

Rode: `node --test tradutor/implantar.test.mts`
Saída esperada: `ℹ pass 8`, `ℹ fail 0`, com:
```
✔ implantar.sh: em LF, só os docker da stack kaizen e nenhuma palavra proibida
✔ implantar.sh: o sha256 escrito nele é o do publicacao/stack.yml do repositório
✔ implantar.sh: a janela vai de hh:10 a hh:50, inclusive, e nunca das 22h às 22h59
✔ implantar.sh: argumento fora do formato sai com 2 sem chamar o ssh
✔ implantar.sh: log e rodar mandam à VPS as linhas fixas
✔ implantar.sh: fora da janela, rodar para depois de ler a hora e diz quando pode rodar
✔ implantar.sh: publicar para sem mudar nada quando o stack.yml do ramo não é o que o script conhece
✔ implantar.sh: publicar manda à VPS os passos da spec, na ordem, e diz o que ficou no ar
```
(cada rodada do Git Bash leva de 0,1 a 0,3 s; o arquivo todo, uns 4 s).

- [ ] **Passo 7: Escrever `tradutor/comandos-vps.mts`**

Crie `tradutor/comandos-vps.mts`:

```ts
// Os comandos que publicacao/implantar.sh roda no contêiner da VPS além das leituras (spec da Fase 4, seção 5).
import type { Cliente } from './banco.mts'
import { TRAVA } from './constantes.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'

// Com a mesma trava das leituras: nunca aplica migração no meio de uma leitura.
export async function migrarAgora(cliente: Cliente, pasta: string = PASTA_MIGRACOES): Promise<{ codigo: number; texto: string }> {
  const trava = await cliente.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [TRAVA])
  if (!trava.rows[0].ok) return { codigo: 1, texto: 'migrar: uma leitura está rodando; rode de novo em alguns minutos' }
  try {
    const aplicadas = await aplicarMigracoes(cliente, pasta)
    if (aplicadas.length === 0) return { codigo: 0, texto: 'migrar: nenhuma migração pendente' }
    return { codigo: 0, texto: `migrar: aplicadas ${aplicadas.map((nome) => nome.replace(/\.sql$/, '')).join(', ')}` }
  } finally {
    await cliente.query('select pg_advisory_unlock($1)', [TRAVA]).catch(() => undefined)
  }
}

const TAMANHO_MENSAGEM = 120
const RESULTADOS = ['ok', 'aviso', 'falha', 'pulada']

type Execucao = {
  id: string; tipo: string; manual: boolean; inicio: string; resultado: string | null
  avisos: number; telegram_ok: boolean | null; mensagem: string | null
}

function textoTelegram(ok: boolean | null): string {
  if (ok === null) return '—'
  return ok ? 'sim' : 'não'
}

// Só lê. As execuções com início a partir da 0h do dia em Fortaleza, uma por linha, e no fim a contagem por resultado.
export async function listarExecucoes(cliente: Cliente, desde: string): Promise<string[]> {
  const r = await cliente.query<Execucao>(
    `select id, tipo, manual, to_char(inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as inicio,
            resultado, jsonb_array_length(avisos) as avisos, telegram_ok, mensagem
       from kaizen.execucao
      where inicio >= $1::date::timestamp at time zone 'America/Fortaleza'
      order by id`,
    [desde],
  )
  const linhas = ['id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem']
  for (const e of r.rows) {
    let mensagem = e.mensagem ?? '—'
    if (mensagem.length > TAMANHO_MENSAGEM) mensagem = `${mensagem.slice(0, TAMANHO_MENSAGEM)}…`
    const colunas = [e.id, e.tipo, e.manual ? 'manual' : 'agendada', e.inicio, e.resultado ?? '—', e.avisos, textoTelegram(e.telegram_ok), mensagem]
    linhas.push(colunas.join(' | '))
  }
  const contagem = RESULTADOS.map((resultado) => `${resultado} ${r.rows.filter((e) => e.resultado === resultado).length}`)
  contagem.push(`sem resultado ${r.rows.filter((e) => e.resultado === null).length}`)
  const dia = `${desde.slice(8, 10)}/${desde.slice(5, 7)}/${desde.slice(0, 4)}`
  linhas.push(`contagem desde ${dia}: ${contagem.join(', ')} (total ${r.rows.length})`)
  return linhas
}
```

`id` é `bigint` e chega como texto (`tradutor/banco.mts`); `jsonb_array_length` é `int` e chega como `number`. O dia `desde` vira a 0h de Fortaleza no próprio SQL (`$1::date::timestamp at time zone 'America/Fortaleza'`), sem depender do fuso da sessão.

- [ ] **Passo 8: Os comandos `migrar` e `execucoes` em `tradutor/principal.mts`**

Três mudanças, cada uma identificada pelo texto em volta.

(a) Nos `import`, depois da linha `import { conectar } from './banco.mts'`, acrescente:

```ts
import { listarExecucoes, migrarAgora } from './comandos-vps.mts'
```

e depois da linha `import type { Dependencias, Saida } from './execucao.mts'`, acrescente:

```ts
import { emFortaleza, somarDias } from './janela.mts'
```

(b) Troque a linha

```ts
const USO = 'uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...]'
```

por

```ts
const USO = 'uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...] | migrar | execucoes [AAAA-MM-DD]'
```

(c) Na função `principal`, logo depois do bloco do comando `conferencia` (o que termina em `console.log(await rodarConferencia(config.kaizenUrl, resto, Date.now()))`, `return 0` e `}`) e antes da linha `const manual = resto.length === 1 && resto[0] === '--manual'`, acrescente:

```ts
  if (comando === 'migrar' && resto.length === 0) {
    const cliente = await conectar(lerConfig(env).kaizenUrl)
    try {
      const saida = await migrarAgora(cliente)
      console.log(saida.texto)
      return saida.codigo
    } finally {
      await cliente.end().catch(() => undefined)
    }
  }
  if (comando === 'execucoes' && (resto.length === 0 || (resto.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(resto[0])))) {
    // Sem dia: desde 7 dias atrás, em Fortaleza.
    const desde = resto[0] ?? somarDias(emFortaleza(Date.now()).data, -7)
    const cliente = await conectar(lerConfig(env).kaizenUrl)
    try {
      for (const linha of await listarExecucoes(cliente, desde)) console.log(linha)
      return 0
    } finally {
      await cliente.end().catch(() => undefined)
    }
  }
```

Argumento a mais ou fora do formato (`migrar agora`, `execucoes ontem`, dois dias) não entra em nenhum dos dois blocos e cai no uso, com 2. Uma migração que falha sobe como erro até o `import.meta.main`, que já imprime a mensagem (`a migração 010_x.sql não se aplicou: …`) e sai com 1, como o comando `conferencia`.

- [ ] **Passo 9: Rodar os testes dos comandos e ver passar**

Rode: `node --test tradutor/comandos-vps.test.mts tradutor/principal.test.mts`
Saída esperada: `ℹ tests 11`, `ℹ pass 11`, `ℹ fail 0`, com:
```
✔ migrar aplica as migrações pendentes e diz quais; de novo, diz que não há nenhuma; e solta a trava
✔ migrar com a trava presa por uma leitura sai com 1, diz para rodar de novo e não aplica nada
✔ execucoes lista cada execução desde a 0h do dia em Fortaleza, uma por linha, e a contagem por resultado
✔ os comandos migrar e execucoes pelo principal: as mesmas linhas, os últimos 7 dias sem dia, e 2 com argumento errado
```
e os 7 testes de `principal.test.mts`, que não mudaram.

- [ ] **Passo 10: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 12 testes (8 em `tradutor/implantar.test.mts` e 4 em `tradutor/comandos-vps.test.mts`). O arquivo fica com uma única linha:

```text
341
```

- [ ] **Passo 11: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: `tsc -p .` sem nenhuma linha de erro; última linha `rodou 341 testes, esperados 341` (leva uns 2 minutos).

- [ ] **Passo 12: Commit**

```bash
git add publicacao/implantar.sh tradutor/comandos-vps.mts tradutor/comandos-vps.test.mts tradutor/implantar.test.mts tradutor/principal.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 4: implantar.sh, a porta do agente para a VPS, e os comandos migrar e execucoes

publicacao/implantar.sh publica na stack kaizen a versão de um ramo do
GitHub, com as migrações, lê o log da stack e roda no contêiner uma lista
fechada de cinco comandos do Kaizen. Todo argumento é conferido no PC:
"main;id", "../x" ou um dia fora do formato param com 2 sem falar com a
VPS. Publicar e rodar só vão de hh:10 a hh:50, nunca às 22h, e um
stack.yml diferente do conhecido para a publicação antes de mudar
qualquer coisa. No contêiner, "migrar" aplica as migrações com a trava
das leituras, e "execucoes" lista as leituras por dia de Fortaleza, com a
contagem por resultado. Testado com um ssh falso, sem falar com a VPS:
12 testes novos; rodou 341, esperados 341.
EOF
```

Acrescente no fim da mensagem, depois de uma linha em branco, a linha de atribuição que o sistema lhe dá (o plano não fixa nome de modelo).
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 341 testes, esperados 341`; o commit sai.

---

DECISÃO: o teste do sha256 lê `publicacao/stack.yml` do disco e tira o CR, em vez de usar `git show HEAD:publicacao/stack.yml`. Os dois dão hoje `ca0e7739…6966` (conferido). O hook `pre-commit` roda antes do commit: com `git show HEAD:`, um commit que mudasse o `stack.yml` e o valor do script juntos seria recusado (o `HEAD` ainda teria o `stack.yml` antigo), e um que mudasse só o `stack.yml` passaria. Com `publicacao/* text eol=lf`, o conteúdo do disco sem CR é o que o git guarda e o que a VPS calcula.

DECISÃO: as palavras proibidas (seção 5 da spec) são procuradas sem diferenciar maiúsculas e sem letra antes nem depois. O formato do passo 9 do roteiro, que o escopo manda usar para anotar o segredo em uso, tem `.Secrets` e `.SecretName`, o caminho do segredo no contêiner é `/run/secrets/kaizen_env` (spec, decisão 1), e `rm` está dentro de `--format`. Uma busca por trecho reprovaria o próprio script; com a fronteira de letra, `docker secret`, `rm -f`, `--update` e `prumo_default` continuam reprovados.

DECISÃO: o `ssh` falso entra no `PATH` dentro do bash, e não no `env` do `spawnSync`. Medido neste PC: o `bash.exe` do Git põe `/mingw64/bin` e `/usr/bin` na frente do `PATH` que o Windows passa, e com o `PATH` prefixado pelo Node o `type -P ssh` achou `/usr/bin/ssh`, o de verdade, com a chave autorizada na VPS. Cada rodada confere `type -P ssh` antes de rodar o script e sai com 99 se não for o falso (conferido: com a pasta sem o falso, sai com 99 sem rodar nada).

DECISÃO: sem `LC_ALL=C` no script. Medido no Git Bash deste PC, `[a-z]` não casa maiúscula nem letra acentuada em nenhum local (`C`, `C.UTF-8`, `en_US.UTF-8`, `pt_BR.UTF-8`).

DECISÃO: pontos que a spec não fixa, na leitura mais simples: fora da janela sai com 1 (o 2 é de argumento errado); a hora da mensagem vai sem zero à esquerda (`8h05`), como `rotuloHora`; `migrar` imprime os nomes sem `.sql` (a spec mostra `010_natureza`). No `execucoes`: a primeira linha é o cabeçalho; `manual`/`agendada`; telegram `sim` (aceitou), `não` (recusou) ou `—` (nada enviado); resultado vazio (execução em andamento) e mensagem vazia saem `—`; mensagem acima de 120 caracteres sai com os 120 primeiros e `…`; a última linha é `contagem desde DD/MM/AAAA: ok N, aviso N, falha N, pulada N, sem resultado N (total N)`.

DECISÃO: a regra da decisão 19 (migração já publicada não se edita; `git diff --name-status --diff-filter=M <SHA publicado> HEAD -- sql/migracoes` vazio antes de cada `publicar` depois do primeiro) fica como passo do orquestrador (spec, seção 11, passo 3). O script não a confere: a tabela da seção 5 não a põe entre os passos do `publicar`.

DECISÃO: além do caso da spec (`publicar fase-4` chama o `ssh`), o teste roda o `publicar` inteiro com o `ssh` falso respondendo o sha256 certo, e fixa, na ordem, os nove comandos que vão à VPS. É o que mostra ao revisor, comando por comando, que nada sai da stack `kaizen`.

---

### Task 2: a descrição do produto do ERP novo vem da mercadoria

**O que esta tarefa entrega, em resultado:** os 1.029 produtos do ERP novo deixam de ficar no Kaizen com a descrição vazia (item 3 do `FASE-3-relatorio.md`; spec, seção 10). A consulta de cadastros lia a descrição da variação (`mercadoria_variacao.descricao`), que está vazia nas 1.029 variações; passa a ler a da mercadoria ligada a cada variação (`mercadoria.descricao`), que está preenchida nas 1.029 (medido no ERP em 28/09, só lendo). O produto 60 (mercadoria 730) passa a ser `BROCA CHATA P/ MADEIRA 1" X 6" WORKER`, e o 1436 (mercadoria 515), `COLA DE CONTATO 14 KG KISAFIX`. A lista de colunas que o Kaizen lê do ERP passa de 108 para 109, e a conferência de colunas de cada execução passa a cobrir a nova. A leitura de cadastros regrava todos os produtos a cada execução (`sql/carga/cadastros.sql` já faz `descricao = excluded.descricao`), então a primeira leitura na VPS depois da publicação corrige os 1.029, sem migração. Esta tarefa acrescenta 2 testes, num commit.

**Files:**
- Modify: `sql/erp/cadastros.sql` (a linha `'descricao', v.descricao,`)
- Modify: `sql/erp/colunas-esperadas.txt` (uma linha nova, logo depois de `mercadoria _idmercadoria integer`)
- Modify: `tradutor/sql-erp.test.mts` (108 → 109 colunas)
- Modify: `tradutor/erp-falso.test.mts` (108 → 109 colunas)
- Modify: `tradutor/consulta-estoque-cadastros.test.mts` (dois testes de cadastros ajustados, um novo)
- Modify: `tradutor/execucao.test.mts` (a função `montarLoja()` e um teste novo)
- Modify: `testes-esperados.txt`
- Não mude: `tradutor/execucao-noite.test.mts`, `tradutor/leitura.test.mts` e `tradutor/fixtures.mts`. Eles inserem uma descrição na variação (`'Produto 60'`, `'PARAFUSO'`, `` `PRODUTO ${p}` ``), mas nenhum confere a descrição; continuam passando como estão.

**Interfaces:**
- Consumes: nada de outra tarefa desta fase. Da Fase 2, sem mudar: `criarErpFalso()` (`tradutor/erp-falso.mts`), que cria uma tabela por tabela de `sql/erp/colunas-esperadas.txt`, só com as colunas listadas (inserir numa coluna fora da lista falha com `column "…" of relation "…" does not exist`); `lerColunasEsperadas()`, `modeloErp()` e `montar()` (`tradutor/sql-erp.mts`); `executar()` (`tradutor/execucao.mts`), que lê os cadastros e grava `kaizen.produto` (`fonte`, `codigo`, `descricao`…) em toda execução.
- Produces:
  - `sql/erp/colunas-esperadas.txt` com **109** linhas, entre elas `mercadoria descricao varchar`. A tarefa 4 acrescenta as colunas da natureza a partir daqui: as contagens de `tradutor/sql-erp.test.mts` e `tradutor/erp-falso.test.mts` partem de 109.
  - No ERP falso, a tabela `mercadoria` passa a ter a coluna `descricao`.
  - O formato que `sql/erp/cadastros.sql` devolve não muda: `produtos[].descricao` continua sendo texto ou `null`, agora vindo de `mercadoria.descricao` (vazio quando a variação não tem mercadoria ligada).
  - Em `tradutor/execucao.test.mts`, `montarLoja()` passa a inserir a mercadoria 730 e a variação 60 com descrição vazia. Tarefa que mexer em `montarLoja()` depois mantém essas duas linhas.

**Antes de começar:** rode tudo no Git Bash, a partir da raiz do repositório, na branch `fase-4`, com o Postgres local no ar (`docker compose up -d --wait`, porta 5434). `cat testes-esperados.txt` mostra o número que a tarefa anterior deixou.

- [ ] **Passo 1: Escrever os testes que falham**

**1a.** Em `tradutor/sql-erp.test.mts`, no teste `lerColunasEsperadas lê as 108 colunas…`, troque as duas primeiras linhas do teste. Substitua:

```ts
test('lerColunasEsperadas lê as 108 colunas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadas()
  assert.equal(colunas.length, 108)
```

por:

```ts
test('lerColunasEsperadas lê as 109 colunas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadas()
  assert.equal(colunas.length, 109)
```

O resto do teste fica como está (a primeira coluna continua `documento._iddocumento`, a última `pessoa_funcionario.tipo`, e as tabelas continuam 22: `mercadoria` já estava na lista).

**1b.** Em `tradutor/erp-falso.test.mts`, no teste `cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave`, substitua:

```ts
    assert.equal(r.rows.length, 108)
```

por:

```ts
    assert.equal(r.rows.length, 109)
```

**1c.** Em `tradutor/consulta-estoque-cadastros.test.mts`, substitua o teste inteiro que começa com `test('cadastros: o produto traz grupo, seção e subgrupo da mercadoria, a marca da variação e o custo em texto'` (até o `})` que o fecha) por:

```ts
test('cadastros: o produto traz descrição, grupo, seção e subgrupo da mercadoria, a marca da variação e o custo em texto', async () => {
  await falso.inserir('mercadoria_grupo', [{ _idgrupo: 1, descricao: 'FERRAGENS' }, { _idgrupo: 2, descricao: 'ELETRICA' }])
  await falso.inserir('mercadoria_secao', [{ _idsecao: 3, descricao: 'FERRAMENTAS' }])
  await falso.inserir('mercadoria_subgrupo', [{ _idsubgrupo: 4, descricao: 'CHAVES' }])
  await falso.inserir('mercadoria_marca', [{ _idmarca: 5, descricao: 'MARCA A' }, { _idmarca: 6, descricao: 'MARCA B' }])
  await falso.inserir('mercadoria', [
    { _idmercadoria: 10, descricao: 'CHAVE PHILIPS 1/4', idgrupo: 1, idsecao: 3, idsubgrupo: 4 },
    { _idmercadoria: 11, descricao: 'CHAVE PHILIPS 3/8', idgrupo: 1, idsecao: 3, idsubgrupo: 4 },
  ])
  // No ERP, cada variação tem a sua mercadoria e a descrição da variação está vazia (medido em 28/09: 1.029 de 1.029).
  await falso.inserir('mercadoria_variacao', [
    { _idmercadoriavariacao: 2139, idmercadoria: 11, descricao: '', idmarca: 6 },
    { _idmercadoriavariacao: 2138, idmercadoria: 10, descricao: '', idmarca: 5 },
  ])
  await falso.inserir('mercadoria_custo', [
    { _idempresa: 1, _idmercadoriavariacao: 2138, valcusto: '12.345600' },
    { _idempresa: 2, _idmercadoriavariacao: 2138, valcusto: '99.000000' },
    { _idempresa: 1, _idmercadoriavariacao: 2139, valcusto: '0.000000' },
  ])
  await falso.inserir('mercadoria_variacao_empresa', [
    { _idempresa: 1, _idmercadoriavariacao: 2138, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 2139, flaginativo: 'T' },
    { _idempresa: 2, _idmercadoriavariacao: 2139, flaginativo: 'F' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 2138, descricao: 'CHAVE PHILIPS 1/4', grupo: 'FERRAGENS', secao: 'FERRAMENTAS', subgrupo: 'CHAVES', marca: 'MARCA A', custo: '12.345600', inativo: 'F' },
    { codigo: 2139, descricao: 'CHAVE PHILIPS 3/8', grupo: 'FERRAGENS', secao: 'FERRAMENTAS', subgrupo: 'CHAVES', marca: 'MARCA B', custo: '0.000000', inativo: 'T' },
  ])
})
```

Depois, substitua o teste inteiro que começa com `test('cadastros: produto sem linha de custo vem com custo vazio, e não zero; o que não tem linha vem vazio'` (até o `})` que o fecha) por estes dois testes:

```ts
test('cadastros: produto sem linha de custo vem com custo vazio, e não zero; o que não tem linha vem vazio', async () => {
  // Sem a linha da mercadoria 99, a descrição vem vazia: o texto da variação não é lido.
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, idmercadoria: 99, descricao: 'PARAFUSO', idmarca: null }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 2, _idmercadoriavariacao: 60, valcusto: '5.000000' }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 2, _idmercadoriavariacao: 60, flaginativo: 'T' }])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 60, descricao: null, grupo: null, secao: null, subgrupo: null, marca: null, custo: null, inativo: null },
  ])
})

test('cadastros: a descrição do produto 60 é a da mercadoria 730, e não a da variação, vazia no ERP', async () => {
  // O produto 60 do ERP em 28/09: variação com descrição vazia, ligada à mercadoria 730.
  await falso.inserir('mercadoria', [{ _idmercadoria: 730, descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, idmercadoria: 730, descricao: '' }])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 60, descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER', grupo: null, secao: null, subgrupo: null, marca: null, custo: null, inativo: null },
  ])
})
```

**1d.** Em `tradutor/execucao.test.mts`, dentro de `async function montarLoja()`, substitua a linha:

```ts
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: 'Produto 60', idmercadoria: 60 }])
```

por:

```ts
  // Como no ERP em 28/09: a variação 60 tem a descrição vazia, e a descrição está na mercadoria 730.
  await falso.inserir('mercadoria', [{ _idmercadoria: 730, descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: '', idmercadoria: 730 }])
```

(A mesma linha existe em `tradutor/execucao-noite.test.mts`; lá ela fica como está.)

Depois, logo depois do fim do teste `execução ok grava os documentos e registra ok com as contagens` e antes de `test('a segunda execução sem mudança no ERP continua ok e não duplica nada'`, acrescente:

```ts
test('a execução grava o produto 60 no Kaizen com a descrição da mercadoria 730', async () => {
  await montarLoja()
  assert.equal((await rodar(horaEm(TERCA, 14))).resultado, 'ok')
  const produtos = await banco.cliente.query(`select fonte, codigo, descricao from kaizen.produto order by codigo`)
  assert.deepEqual(produtos.rows, [{ fonte: 'meuerp', codigo: '60', descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER' }])
})
```

As contagens do primeiro teste (`produtos: 1`, `documentos_lidos: 2`…) não mudam: a mercadoria não é contada, e a variação continua uma só.

- [ ] **Passo 2: Rodar os testes e ver falhar**

Run: `node --test tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts tradutor/consulta-estoque-cadastros.test.mts tradutor/execucao.test.mts`
Expected: falha, com `ℹ tests 47`, `ℹ pass 28`, `ℹ fail 19`:
- `✖ lerColunasEsperadas lê as 109 colunas, em ordem, sem repetição, com tipo conhecido` e `✖ cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave`: `108 !== 109`;
- `✖ cadastros: o produto traz descrição, grupo, seção…` e `✖ cadastros: a descrição do produto 60 é a da mercadoria 730…`: `error: column "descricao" of relation "mercadoria" does not exist` (o ERP falso ainda não tem a coluna);
- `✖ cadastros: produto sem linha de custo…`: `actual` com `descricao: 'PARAFUSO'`, `expected` com `descricao: null`;
- os 14 testes de `execucao.test.mts` que chamam `montarLoja()` (entre eles `✖ a execução grava o produto 60 no Kaizen com a descrição da mercadoria 730`): `column "descricao" of relation "mercadoria" does not exist`.

- [ ] **Passo 3: Acrescentar a coluna à lista e ver a falha que sobra**

Em `sql/erp/colunas-esperadas.txt`, substitua:

```text
mercadoria _idmercadoria integer
mercadoria idgrupo integer
```

por:

```text
mercadoria _idmercadoria integer
mercadoria descricao varchar
mercadoria idgrupo integer
```

A ordem é a de bytes (`collate "C"`): `_` vem antes de `d`, que vem antes de `i`. O tipo é o do ERP (`information_schema.columns` dá `character varying` para `mercadoria.descricao`, medido em 28/09).

Run: `node --test tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts tradutor/consulta-estoque-cadastros.test.mts tradutor/execucao.test.mts`
Expected: falha, com `ℹ tests 47`, `ℹ pass 43`, `ℹ fail 4`. Agora a falha é só a da consulta, que ainda lê a variação (trechos da saída; `…` são os outros campos, iguais aos esperados):
```
✖ cadastros: o produto traz descrição, grupo, seção e subgrupo da mercadoria, a marca da variação e o custo em texto
    actual: [ { codigo: 2138, descricao: '', … }, { codigo: 2139, descricao: '', … } ]
✖ cadastros: produto sem linha de custo vem com custo vazio, e não zero; o que não tem linha vem vazio
    actual: [ { codigo: 60, descricao: 'PARAFUSO', … } ]
✖ cadastros: a descrição do produto 60 é a da mercadoria 730, e não a da variação, vazia no ERP
    actual: [ { codigo: 60, descricao: '', … } ]
✖ a execução grava o produto 60 no Kaizen com a descrição da mercadoria 730
    actual: [ { fonte: 'meuerp', codigo: '60', descricao: '' } ]
```

- [ ] **Passo 4: Ler a descrição da mercadoria**

Em `sql/erp/cadastros.sql`, dentro do `json_build_object` dos produtos, substitua:

```sql
      'descricao', v.descricao,
```

por:

```sql
      'descricao', m.descricao,
```

O `m` já está na consulta: `left join mercadoria m on m._idmercadoria = v.idmercadoria` (a mesma ligação que dá o grupo, a seção e o subgrupo). Nada mais muda no arquivo.

Run: `node --test tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts tradutor/consulta-estoque-cadastros.test.mts tradutor/execucao.test.mts`
Expected: passa, com `ℹ tests 47`, `ℹ pass 47`, `ℹ fail 0`, e entre as linhas:
```
✔ cadastros: o produto traz descrição, grupo, seção e subgrupo da mercadoria, a marca da variação e o custo em texto
✔ cadastros: produto sem linha de custo vem com custo vazio, e não zero; o que não tem linha vem vazio
✔ cadastros: a descrição do produto 60 é a da mercadoria 730, e não a da variação, vazia no ERP
✔ a execução grava o produto 60 no Kaizen com a descrição da mercadoria 730
✔ lerColunasEsperadas lê as 109 colunas, em ordem, sem repetição, com tipo conhecido
✔ cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave
```

- [ ] **Passo 5: Conferir no ERP de verdade (só leitura)**

É conferência, não teste: mostra que a ligação da consulta dá, no ERP real, as descrições da spec. É um `select` pela ferramenta só de leitura.

Run: `node --env-file=C:/Projetos/KAIZEN/.env ferramentas/consultar-erp.mts "select v._idmercadoriavariacao as produto, v.descricao as na_variacao, m.descricao as na_mercadoria from mercadoria_variacao v left join mercadoria m on m._idmercadoria = v.idmercadoria where v._idmercadoriavariacao in (60, 1436) order by v._idmercadoriavariacao"`
Expected:
```
[{"produto":60,"na_variacao":"","na_mercadoria":"BROCA CHATA P/ MADEIRA 1\" X 6\" WORKER"}, 
 {"produto":1436,"na_variacao":"","na_mercadoria":"COLA DE CONTATO 14 KG KISAFIX"}]
2 linha(s)
```
Se o ERP não responder (erro de rede ou de token), siga sem este passo e diga isso no relatório da tarefa: a prova são os testes, e a VPS confere os 1.029 na tarefa 3.

- [ ] **Passo 6: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 2 testes (`cadastros: a descrição do produto 60 é a da mercadoria 730…`, em `tradutor/consulta-estoque-cadastros.test.mts`, e `a execução grava o produto 60 no Kaizen…`, em `tradutor/execucao.test.mts`); os outros quatro testes mudados já existiam. O arquivo fica com uma única linha:

```text
343
```

- [ ] **Passo 7: Rodar a verificação completa**

Run: `npm run verificar`
Expected: passa; `tsc -p .` sem nenhuma linha de erro; todos os testes com ✔; última linha `rodou 343 testes, esperados 343`.

- [ ] **Passo 8: Commit**

Acrescente ao fim da mensagem a linha de atribuição que o sistema lhe der.

```bash
git add sql/erp/cadastros.sql sql/erp/colunas-esperadas.txt tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts tradutor/consulta-estoque-cadastros.test.mts tradutor/execucao.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 4: a descrição dos produtos do ERP novo vem da mercadoria

Os 1.029 produtos do ERP novo estavam no Kaizen com a descrição vazia:
a consulta de cadastros lia a descrição da variação, que está vazia em
todos (medido em 28/09). Agora ela lê a descrição da mercadoria ligada
a cada variação. O produto 60, por exemplo, passa a ser BROCA CHATA P/
MADEIRA 1" X 6" WORKER. A leitura de cadastros regrava os produtos a
cada execução: a primeira leitura depois da publicação corrige os
1.029, sem migração. A lista de colunas lidas do ERP passa de 108 para
109, e a conferência de colunas de cada execução cobre a nova.

Testes: rodou 343, esperados 343.
EOF
```
Expected: o hook roda `npm run verificar` e termina com `rodou 343 testes, esperados 343`; o commit sai.

DECISÃO:
- `mercadoria_variacao descricao varchar` continua em `sql/erp/colunas-esperadas.txt`, embora `sql/erp/cadastros.sql` deixe de ler essa coluna. A spec (seção 10) só diz que a coluna nova "entra" na lista, e o esqueleto conta 108 → 109, base das contagens da tarefa 4. Efeito: se um dia o ERP tirar a descrição da variação, a conferência de colunas acusa uma coluna que o Kaizen não usa mais. Tirar a linha é uma troca de uma linha (e a contagem fica 108), se o orquestrador preferir.
- Sem recurso à descrição da variação (nada de `coalesce(nullif(v.descricao, ''), m.descricao)`): a spec manda ler de `mercadoria.descricao`, e as 1.029 variações estão vazias. O teste do `PARAFUSO` fixa isso: sem a mercadoria, a descrição vem vazia.
- O primeiro teste de cadastros passou a ter uma mercadoria por variação (10 e 11), como no ERP: medido em 28/09, as 1.029 variações apontam para 1.029 mercadorias distintas.
- A prova de ponta a ponta é um teste novo em `tradutor/execucao.test.mts` (e não uma asserção a mais no primeiro teste), para o nome do teste dizer o que ele prova; `montarLoja()` passou a ter o dado real (variação 60 vazia, mercadoria 730). Nenhum outro teste do arquivo confere a descrição.

---

### Task 3: a primeira publicação na VPS

Prova o `implantar.sh` de ponta a ponta com a versão das tarefas 1 e 2 (os comandos `migrar` e `execucoes`, e a descrição do produto), antes de a fase inteira ir para a VPS (spec, seção 11, passos 1 e 2). É uma tarefa de operação: não acrescenta código nem teste.

**Files:**
- Create: `docs/fases/FASE-4-vps.md`

**Interfaces:**
- Consumes: `publicacao/implantar.sh` (tarefa 1), com as regras de `allow` já no `.claude/settings.json` (o orquestrador as acrescenta depois da revisão da tarefa 1); `principal.mts execucoes` (tarefa 1).
- Produces: o SHA publicado anotado em `docs/fases/FASE-4-vps.md` (a tarefa 12 e o fecho conferem `git diff --diff-filter=M <SHA> HEAD -- sql/migracoes` contra ele).

**Regras desta tarefa:** a VPS só se toca pelo `implantar.sh`; `ssh`, `scp` e `docker` soltos continuam bloqueados. `publicar` e `rodar` só rodam de hh:10 a hh:50 e nunca das 22h às 22h59: fora da janela o script para e diz quando pode rodar; espere com `until` (por exemplo, `until [ "$(date +%M)" -ge 10 ] && [ "$(date +%M)" -le 45 ]; do sleep 30; done`, no Git Bash, onde `date` sem `TZ` já sai em Fortaleza) e rode de novo. Toda saída vai para o registro, com a hora de Fortaleza (`date` sem `TZ`, ou `git log --format=%ai`).

- [ ] **Passo 1: o estado da VPS antes de publicar**

Run: `bash publicacao/implantar.sh log 24`
Expected: `kaizen_tradutor` com `1/1` e a imagem `kaizen-tradutor:ecf9280` (ou posterior, com a migração 009); linhas `hora ok: ...` das leituras de hora em hora (a hora do log está em UTC: 3 horas a mais que Fortaleza). Anote a imagem.

- [ ] **Passo 2: a branch no GitHub**

Run: `git push origin fase-4`
Expected: a branch `fase-4` criada ou atualizada no GitHub, com o HEAD local (`git rev-parse --short HEAD`).

- [ ] **Passo 3: publicar**

Run: `bash publicacao/implantar.sh publicar fase-4`
Expected: o `git fetch`, o sha256 do `stack.yml` conferido, o `build`, o `deploy` e a espera terminam sem erro; `migrar: nenhuma migração pendente` (as tarefas 1 e 2 não trazem migração); o SHA publicado (igual ao `git rev-parse --short HEAD` do PC), a imagem anterior (a do passo 1) e o serviço em `1/1` com a imagem nova. Se falhar num passo, pare, anote a saída e devolva `BLOCKED` com ela: o orquestrador decide.

- [ ] **Passo 4: a tabela das execuções**

Run: `bash publicacao/implantar.sh rodar execucoes 2026-09-28`
Expected: as linhas de `kaizen.execucao` desde 28/09: a execução 1 (manual, 17h23) e as leituras anteriores à migração 009 em `aviso`; as seguintes em `ok`; no fim, a contagem por resultado.

- [ ] **Passo 5: a primeira leitura com a versão nova**

Espere a leitura agendada da hora cheia seguinte (das 8h às 19h, de segunda a sábado; às 22h a da noite). Depois, dentro da janela:

Run: `bash publicacao/implantar.sh log 2` e `bash publicacao/implantar.sh rodar execucoes 2026-09-28`
Expected: no log, a linha `hora ok: ...` depois do `crond` da hora cheia; na tabela, uma linha nova `hora`, não manual, `ok`, com início na hora cheia.

- [ ] **Passo 6: o registro**

Escreva `docs/fases/FASE-4-vps.md` com: título "Fase 4 — o que rodou na VPS"; seção "1. Primeira publicação" com a data e a hora de cada passo, o comando e a saída (cortando só linhas repetidas do log, dizendo quantas); o SHA publicado em destaque ("SHA publicado: `xxxxxxx`"); a imagem anterior; e a tabela das execuções do passo 5.

- [ ] **Passo 7: commit**

```bash
git add docs/fases/FASE-4-vps.md
git commit -m "Fase 4: primeira publicação na VPS pelo implantar.sh; a leitura seguinte terminou ok"
```

---

### Task 4: a natureza de operação no tradutor do ERP novo

**O que esta tarefa entrega, em resultado:** o Kaizen passa a saber, para cada documento do ERP novo, que comportamento o ERP configurou para ele (spec, seção 6 e decisões 6 e 7). A cada execução (hora e noite), o tradutor lê as 81 naturezas de operação da empresa 1 e a natureza de troca da configuração do ERP (hoje a 900), numa consulta a mais ao ERP (a hora passa de 6 para 7 consultas; o limite é 19 por minuto). Cada natureza ganha em `kaizen.natureza` uma **versão**: a primeira leitura grava as 81; depois, só grava versão nova quando alguma coisa muda no ERP. O documento passa a guardar o código da natureza (`530` no pedido, `520` no orçamento, vazio no caixa e nas contas, que o ERP grava com natureza 0) e a versão que valia quando ele entrou no Kaizen com aquele código; regravar o documento não troca a versão. Quando o dono muda uma natureza no ERP, a execução ganha um aviso, que chega no resumo das 22h: por exemplo, "A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não." Um documento com código de natureza que o Kaizen não conhece gera o aviso de código sem tradução que já existe; um documento sem natureza (o caixa, ou um pedido gravado antes desta fase, até a leitura da noite relê-lo) não é acusado. Esta tarefa acrescenta 12 testes, num commit.

**Files:**
- Create: `sql/migracoes/010_natureza.sql` (texto exato do esqueleto do plano)
- Create: `sql/erp/naturezas.sql` (consulta ao ERP)
- Create: `sql/carga/naturezas.sql` (gravação das versões)
- Create: `tradutor/natureza.mts` (`lerNaturezas`, `gravarNaturezas`)
- Create: `tradutor/natureza.test.mts` (11 testes)
- Modify: `sql/erp/documentos.sql` (uma linha: `'natureza'`)
- Modify: `sql/erp/colunas-esperadas.txt` (10 linhas novas)
- Modify: `sql/carga/documentos.sql` (grava `natureza` e `natureza_id`)
- Modify: `tradutor/carga.mts` (`rodarCarga` exportada; entrada `'naturezas'`)
- Modify: `tradutor/tipos.mts`, `tradutor/avisos.mts`, `tradutor/telegram.mts` (aviso `natureza_mudou`)
- Modify: `tradutor/conferencias.mts` (código de natureza sem versão)
- Modify: `tradutor/execucao.mts` (lê e grava as naturezas)
- Modify (testes existentes): `tradutor/avisos.test.mts` (1 teste novo e a lista dos tipos), `tradutor/consulta-documentos.test.mts`, `tradutor/sql-erp.test.mts`, `tradutor/erp-falso.test.mts`, `tradutor/traducao-operacao-real.test.mts`
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes: da tarefa 2, só a contagem de `sql/erp/colunas-esperadas.txt` (109 linhas, 22 tabelas) e os testes `lerColunasEsperadas lê as 109 colunas…` (`tradutor/sql-erp.test.mts`) e `cria uma tabela por tabela da lista…` (`tradutor/erp-falso.test.mts`, `assert.equal(r.rows.length, 109)`). Da Fase 2, sem mudar: `criarBancoKaizen()` (`tradutor/apoio-teste.mts`); `criarErpFalso()` (`tradutor/erp-falso.mts`), que cria as tabelas do ERP a partir de `colunas-esperadas.txt` e guarda cada SQL em `consultas`; `colocarEntrada(cliente, assunto, partes)` e `gravarDocumentos(cliente)` (`tradutor/carga.mts`); `lerDocumentosFaixa(erp, cortes, de, ate)` (`tradutor/leitura.mts`); `codigosSemTraducao(cliente)` (`tradutor/conferencias.mts`); `executar(opcoes, dependencias)` (`tradutor/execucao.mts`); `modeloErp`, `montar`, `lerColunasEsperadas` (`tradutor/sql-erp.mts`); `emTransacao`, `conectar` (`tradutor/banco.mts`).
- Produces:
  - Migração 010: `kaizen.natureza (id bigint identity, fonte 'meuerp'|'link', codigo text, descricao text, categoria text, estoque boolean, reserva boolean, financeiro boolean, troca boolean, valida_desde timestamptz default now())`, índice `(fonte, codigo, id)`; `kaizen.documento.natureza text` (o código cru; no ERP novo, `_idnatureza` em texto, vazio quando o ERP grava 0) e `kaizen.documento.natureza_id bigint references kaizen.natureza (id)` (a versão). A tarefa 5 grava essas duas colunas nos documentos da Link; a tarefa 6 lê `natureza_id` na visão `kaizen.documento_negocio`.
  - Regra da versão no documento (valem para a Link na tarefa 5): na primeira gravação, `natureza_id` = maior `id` de `kaizen.natureza` com a mesma fonte e código; regravado com o mesmo código, fica; com código novo, passa ao maior `id` do novo; código sem versão, vazio.
  - `tradutor/natureza.mts`:
    ```ts
    export async function lerNaturezas(erp: Erp): Promise<string>
    // o texto JSON que o ERP devolve: { naturezas: [{ codigo: number, descricao, categoria, estoque: 'T'|'F', reserva, financeiro }], troca: number | null }
    export async function gravarNaturezas(cliente: Cliente): Promise<Aviso[]>
    // dentro da transação, depois de colocarEntrada(cliente, 'naturezas', [texto]) e antes de gravarDocumentos
    ```
  - `tradutor/avisos.mts`: `export function avisoNaturezaMudou(codigo: string, descricao: string | null, versao: string, mudancas: string[]): Aviso` (tipo `natureza_mudou`, chave `natureza:<código>:<versão nova>`).
  - `tradutor/tipos.mts`: `TipoAviso` ganha `'natureza_mudou'` (segundo tipo do resumo, logo depois de `codigo_sem_traducao`).
  - `tradutor/carga.mts`: `export async function rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>>`; `colocarEntrada` aceita o assunto `'naturezas'`.
  - O documento que `sql/erp/documentos.sql` devolve ganha a chave `natureza: number | null`.
  - `sql/erp/colunas-esperadas.txt` com **119** linhas e 24 tabelas.

**Antes de começar:** rode tudo no Git Bash, a partir da raiz do repositório, na branch `fase-4`, com o Postgres local no ar (`docker compose up -d --wait`, porta 5434). `cat testes-esperados.txt` mostra o número que a tarefa anterior deixou, e `ls sql/migracoes` termina em `009_traducao_operacao_real.sql`. Os fatos dos testes foram medidos no ERP em 28/09, só lendo: 530 PEDIDO DE VENDA (V, estoque sim, reserva não, financeiro sim); 520 ORÇAMENTO (V, não, não, não); 500 PRE-VENDA (V, sim, sim, não); 5 COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO (C, sim, não, sim); 900 TROCA DE MERCADORIA (C, sim, não, sim), que é a troca da configuração (`config_entrada_saida.idnaturezatrocamercadoria = 900`); flags `'T'`/`'F'`, nenhum vazio nas 81; `documento.idnaturezaoperacao`, `natureza_operacao._idnatureza`, `natureza_operacao._idempresa`, `config_entrada_saida._idempresa` e `idnaturezatrocamercadoria` são `integer`; `descricao`, `tipocategoria` e os três flags, `character varying`.

- [ ] **Step 1: Escrever os testes que falham**

**1a.** Criar `tradutor/natureza.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar, emTransacao } from './banco.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import { codigosSemTraducao } from './conferencias.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { executar } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerDocumentosFaixa } from './leitura.mts'
import { gravarNaturezas, lerNaturezas } from './natureza.mts'
import { lerColunasEsperadas, modeloErp } from './sql-erp.mts'
import type { Aviso, Cortes } from './tipos.mts'

// As naturezas medidas no ERP em 28/09 (spec da Fase 4, seção 2.1), como natureza_operacao as grava: flags 'T'/'F'.
const NATUREZAS = [
  { _idempresa: 1, _idnatureza: 530, descricao: 'PEDIDO DE VENDA', tipocategoria: 'V', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
  { _idempresa: 1, _idnatureza: 520, descricao: 'ORÇAMENTO', tipocategoria: 'V', flagmovimentarestoque: 'F', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'F' },
  { _idempresa: 1, _idnatureza: 500, descricao: 'PRE-VENDA', tipocategoria: 'V', flagmovimentarestoque: 'T', flagreservaestoque: 'T', flagmovimentarfinanceiro: 'F' },
  { _idempresa: 1, _idnatureza: 5, descricao: 'COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO', tipocategoria: 'C', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
  { _idempresa: 1, _idnatureza: 900, descricao: 'TROCA DE MERCADORIA', tipocategoria: 'C', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
]

// A configuração do ERP desde 25/09: a troca de mercadoria é a natureza 900.
const TROCA_900 = [{ _idempresa: 1, idnaturezatrocamercadoria: 900 }]

// Só o corte do documento importa aqui; o dos filhos fica em 0.
const CORTES: Cortes = {
  documento: 184, documento_mercadoria: 0, documento_pagamento: 0, documento_parcela: 0,
  documento_parcela_pagamento: 0, documento_conferencia_caixa: 0, documento_cancelamento_historico: 0,
  mercadoria_estoque_historico: 0,
}

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
let banco: BancoTeste
let falso: ErpFalso

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  await falso.cliente.query(`truncate ${TABELAS_DO_ERP.join(', ')}`)
  // restart identity: as versões começam do 1 em cada teste.
  await banco.cliente.query('truncate kaizen.natureza, kaizen.documento, kaizen.execucao restart identity cascade')
})

// Um pedido do ERP novo, na forma da tabela documento; cada teste troca o que precisa.
function documento(oid: number, codigo: number, natureza: number | null, campos: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    oid, _iddocumento: codigo, idempresa: 1, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idnaturezaoperacao: natureza,
    ...campos,
  }
}

// A leitura como a execução faz: as duas consultas ao ERP, e na mesma transação as naturezas antes dos documentos.
async function lerEGravar(): Promise<Aviso[]> {
  const naturezas = await lerNaturezas(falso.erp)
  const documentos = await lerDocumentosFaixa(falso.erp, CORTES, 185, 300)
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'naturezas', [naturezas])
    await colocarEntrada(banco.cliente, 'documentos', [documentos])
    const avisos = await gravarNaturezas(banco.cliente)
    await gravarDocumentos(banco.cliente)
    return avisos
  })
}

async function versoes(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select id::int as id, fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca
       from kaizen.natureza order by id`,
  )
  return r.rows
}

async function documentosNoKaizen(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select origem_id, modelo, natureza, natureza_id::int as natureza_id from kaizen.documento order by origem_id::bigint`,
  )
  return r.rows
}

// As 5 versões da primeira leitura, em ordem de código: 5 → 1, 500 → 2, 520 → 3, 530 → 4, 900 → 5.
const PRIMEIRAS_VERSOES = [
  { id: 1, fonte: 'meuerp', codigo: '5', descricao: 'COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO', categoria: 'C', estoque: true, reserva: false, financeiro: true, troca: false },
  { id: 2, fonte: 'meuerp', codigo: '500', descricao: 'PRE-VENDA', categoria: 'V', estoque: true, reserva: true, financeiro: false, troca: false },
  { id: 3, fonte: 'meuerp', codigo: '520', descricao: 'ORÇAMENTO', categoria: 'V', estoque: false, reserva: false, financeiro: false, troca: false },
  { id: 4, fonte: 'meuerp', codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, reserva: false, financeiro: true, troca: false },
  { id: 5, fonte: 'meuerp', codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, reserva: false, financeiro: true, troca: true },
]

test('lerNaturezas: as naturezas da empresa 1 em ordem de código, com os flags crus, e a troca da configuração', async () => {
  assert.deepEqual(JSON.parse(await lerNaturezas(falso.erp)), { naturezas: [], troca: null })
  assert.equal(falso.consultas.at(-1), modeloErp('naturezas'))
  await falso.inserir('natureza_operacao', [
    ...NATUREZAS,
    { _idempresa: 2, _idnatureza: 530, descricao: 'DE OUTRA EMPRESA', tipocategoria: 'C', flagmovimentarestoque: 'F', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'F' },
  ])
  await falso.inserir('config_entrada_saida', [...TROCA_900, { _idempresa: 2, idnaturezatrocamercadoria: 5 }])
  assert.deepEqual(JSON.parse(await lerNaturezas(falso.erp)), {
    naturezas: [
      { codigo: 5, descricao: 'COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO', categoria: 'C', estoque: 'T', reserva: 'F', financeiro: 'T' },
      { codigo: 500, descricao: 'PRE-VENDA', categoria: 'V', estoque: 'T', reserva: 'T', financeiro: 'F' },
      { codigo: 520, descricao: 'ORÇAMENTO', categoria: 'V', estoque: 'F', reserva: 'F', financeiro: 'F' },
      { codigo: 530, descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: 'T', reserva: 'F', financeiro: 'T' },
      { codigo: 900, descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: 'T', reserva: 'F', financeiro: 'T' },
    ],
    troca: 900,
  })
})

test('documentos: a natureza sai como o código do ERP; 0 e vazia saem vazias', async () => {
  await falso.inserir('documento', [
    documento(185, 116, 530),
    documento(186, 120, 0, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(187, 121, null, { modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P' }),
  ])
  const lidos = JSON.parse(await lerDocumentosFaixa(falso.erp, CORTES, 185, 187)) as Array<{ oid: number; natureza: number | null }>
  assert.deepEqual(lidos.map((d) => [d.oid, d.natureza]), [[185, 530], [186, null], [187, null]])
})

test('primeira leitura: uma versão por natureza, flag T vira sim, a troca vem da configuração, e nada é avisado; a mesma leitura de novo não grava nada', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual(await versoes(), PRIMEIRAS_VERSOES)
  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual(await versoes(), PRIMEIRAS_VERSOES)
})

test('sem natureza de troca na configuração (o ERP antes de 25/09), nenhuma natureza é a troca', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual((await versoes()).map((v) => [v.codigo, v.troca]), [['5', false], ['500', false], ['520', false], ['530', false], ['900', false]])
})

test('um flag muda no ERP: versão nova só daquela natureza, a antiga fica, e o aviso diz o que mudou', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  await falso.cliente.query(`update natureza_operacao set flagmovimentarfinanceiro = 'F' where _idnatureza = 530`)

  assert.deepEqual(await lerEGravar(), [{
    tipo: 'natureza_mudou',
    chave: 'natureza:530:6',
    texto: 'A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não.',
  }])
  assert.deepEqual(await versoes(), [
    ...PRIMEIRAS_VERSOES,
    { id: 6, fonte: 'meuerp', codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, reserva: false, financeiro: false, troca: false },
  ])
})

test('várias mudanças numa natureza saem numa linha, na ordem do aviso; a troca que passa para outra natureza muda as duas', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  await falso.cliente.query(
    `update natureza_operacao set descricao = 'ORCAMENTO', tipocategoria = 'C', flagmovimentarestoque = 'T',
       flagreservaestoque = 'T', flagmovimentarfinanceiro = 'T' where _idnatureza = 520`,
  )
  await falso.cliente.query('update config_entrada_saida set idnaturezatrocamercadoria = 520')

  // As versões novas saem em ordem de código: 520 → 6, 900 → 7.
  assert.deepEqual(await lerEGravar(), [
    {
      tipo: 'natureza_mudou',
      chave: 'natureza:520:6',
      texto: 'A natureza 520 (ORCAMENTO) mudou no ERP: categoria: V → C; mexe no estoque: não → sim; reserva estoque: não → sim; '
        + 'mexe no financeiro: não → sim; é a troca: não → sim; descrição: ORÇAMENTO → ORCAMENTO.',
    },
    { tipo: 'natureza_mudou', chave: 'natureza:900:7', texto: 'A natureza 900 (TROCA DE MERCADORIA) mudou no ERP: é a troca: sim → não.' },
  ])
  assert.deepEqual((await versoes()).slice(5), [
    { id: 6, fonte: 'meuerp', codigo: '520', descricao: 'ORCAMENTO', categoria: 'C', estoque: true, reserva: true, financeiro: true, troca: true },
    { id: 7, fonte: 'meuerp', codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, reserva: false, financeiro: true, troca: false },
  ])
})

test('natureza que sumiu do ERP fica como está, e a natureza nova ganha versão sem aviso', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  await falso.cliente.query('delete from natureza_operacao where _idnatureza = 500')
  await falso.inserir('natureza_operacao', [
    { _idempresa: 1, _idnatureza: 1, descricao: 'VENDA DE MERCADORIA DENTRO DO ESTADO', tipocategoria: 'V', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
  ])

  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual(await versoes(), [
    ...PRIMEIRAS_VERSOES,
    { id: 6, fonte: 'meuerp', codigo: '1', descricao: 'VENDA DE MERCADORIA DENTRO DO ESTADO', categoria: 'V', estoque: true, reserva: false, financeiro: true, troca: false },
  ])
})

test('documento: guarda a versão da primeira gravação; regravar com o mesmo código não troca; código novo pega a última do novo', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await falso.inserir('documento', [
    documento(185, 116, 530),
    documento(186, 120, 520, { modelo: 'OC', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(187, 121, 0, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(188, 122, 777),
  ])
  await lerEGravar()
  assert.deepEqual(await documentosNoKaizen(), [
    { origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 },
    { origem_id: '186', modelo: 'OC', natureza: '520', natureza_id: 3 },
    { origem_id: '187', modelo: 'AX', natureza: null, natureza_id: null },
    { origem_id: '188', modelo: 'PA', natureza: '777', natureza_id: null },
  ])

  // O dono tira o financeiro do pedido (530 ganha a versão 6), e o orçamento 120 vira pedido no mesmo documento.
  await falso.cliente.query(`update natureza_operacao set flagmovimentarfinanceiro = 'F' where _idnatureza = 530`)
  await falso.cliente.query(
    `update documento set modelo = 'PA', tipomovimento = 'S', tipomovimentofinanceiro = 'R', idnaturezaoperacao = 530 where oid = 186`,
  )
  await lerEGravar()
  assert.deepEqual(await documentosNoKaizen(), [
    { origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 },
    { origem_id: '186', modelo: 'PA', natureza: '530', natureza_id: 6 },
    { origem_id: '187', modelo: 'AX', natureza: null, natureza_id: null },
    { origem_id: '188', modelo: 'PA', natureza: '777', natureza_id: null },
  ])
})

test('documento gravado antes da Fase 4, sem natureza: a conferência não o acusa, e a releitura grava a natureza da versão de agora', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  // Como a carga da Fase 2 gravou o pedido 116: sem as colunas da natureza.
  await banco.cliente.query(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
     values ('meuerp', 'documento', '185', '116', 'PA', 'E', 'S', 'R', '2026-09-28 10:15:00')`,
  )
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])

  // A leitura da noite relê o pedido, que no ERP tem a natureza 530.
  await falso.inserir('documento', [documento(185, 116, 530)])
  await lerEGravar()
  assert.deepEqual(await documentosNoKaizen(), [{ origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 }])
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])
})

test('conferência: código de natureza sem versão no Kaizen vira aviso de código sem tradução; natureza conhecida ou vazia, não', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await falso.inserir('documento', [
    documento(185, 116, 530),
    documento(186, 117, 0, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(187, 118, 777),
    documento(188, 119, 777),
  ])
  await lerEGravar()
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [{
    tipo: 'codigo_sem_traducao',
    chave: 'codigo:natureza:777',
    texto: 'o código "777" de natureza apareceu 2 vez(es) e não tem tradução no Kaizen',
  }])
})

// Hora cheia de Fortaleza (UTC−3), em milissegundos.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

// Roda uma execução com o relógio fingido e põe no registro a hora fingida, como em execucao.test.mts.
async function rodar(quando: number): Promise<Saida> {
  const saida = await executar(
    { tipo: 'hora', manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar: async () => true, agora: () => quando },
  )
  await banco.cliente.query(
    `update kaizen.execucao set inicio = to_timestamp($1::double precision / 1000),
       fim = to_timestamp($1::double precision / 1000) + interval '1 minute'
     where id = (select max(id) from kaizen.execucao)`,
    [quando],
  )
  return saida
}

test('execução da hora: uma consulta de naturezas, a versão gravada antes do documento, e o aviso na execução seguinte', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await falso.inserir('documento', [documento(185, 123, 530)])
  const antes = falso.consultas.length

  const primeira = await rodar(horaEm('2026-09-29', 14))
  assert.equal(primeira.resultado, 'ok')
  assert.deepEqual(primeira.avisos, [])
  assert.equal(falso.consultas.slice(antes).filter((sql) => sql.includes('from natureza_operacao')).length, 1)
  assert.deepEqual(await documentosNoKaizen(), [{ origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 }])

  await falso.cliente.query(`update natureza_operacao set flagmovimentarfinanceiro = 'F' where _idnatureza = 530`)
  const segunda = await rodar(horaEm('2026-09-29', 15))
  assert.equal(segunda.resultado, 'aviso')
  assert.deepEqual(segunda.avisos, [{
    tipo: 'natureza_mudou',
    chave: 'natureza:530:6',
    texto: 'A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não.',
  }])
  // O pedido foi relido às 15h e continua com a versão das 14h.
  assert.deepEqual(await documentosNoKaizen(), [{ origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 }])
})
```

Por que esses valores: o `beforeEach` recomeça a numeração das versões, e a gravação cria as versões em ordem numérica de código, então na primeira leitura 5, 500, 520, 530 e 900 ficam com as versões 1 a 5 (o pedido 530 aponta para a 4, o orçamento 520 para a 3). Cada versão nova seguinte recebe o próximo número (6, 7). O documento 186 vira pedido depois da mudança do 530: como o código dele mudou (520 → 530), ele pega a última versão do 530, que é a 6; o 185 já estava com o 530 e fica com a 4. O 777 não existe em `natureza_operacao`: o documento guarda o código e fica sem versão.

**1b.** Em `tradutor/avisos.test.mts`, no import do topo, substitua:

```ts
  avisoEstoqueDiverge, avisoMovimentoSumiu, avisoTotalDiferente, avisoExecucaoFaltou, avisoExecucaoPulada,
  TITULOS, O_QUE_FAZER,
```

por:

```ts
  avisoEstoqueDiverge, avisoMovimentoSumiu, avisoTotalDiferente, avisoExecucaoFaltou, avisoExecucaoPulada,
  avisoNaturezaMudou, TITULOS, O_QUE_FAZER,
```

Logo antes da linha `test('avisoDocumentoApagado diz tipo, número, dia, valor e vendedor', () => {`, acrescente:

```ts
test('avisoNaturezaMudou junta as mudanças com "; ", leva a versão nova na chave e deixa de fora a descrição vazia', () => {
  assert.deepEqual(avisoNaturezaMudou('530', 'PEDIDO DE VENDA', '6', ['mexe no financeiro: sim → não']), {
    tipo: 'natureza_mudou',
    chave: 'natureza:530:6',
    texto: 'A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não.',
  })
  assert.deepEqual(avisoNaturezaMudou('77', null, '12', ['categoria: V → C', 'mexe no estoque: não → sim']), {
    tipo: 'natureza_mudou',
    chave: 'natureza:77:12',
    texto: 'A natureza 77 mudou no ERP: categoria: V → C; mexe no estoque: não → sim.',
  })
})

```

No teste `TITULOS e O_QUE_FAZER têm um texto para cada tipo de aviso, na ordem do resumo`, logo depois da linha `    ['codigo_sem_traducao', 'Códigos novos no ERP'],` acrescente:

```ts
    ['natureza_mudou', 'Naturezas de operação que mudaram no ERP'],
```

e logo depois da linha `    ['codigo_sem_traducao', leve],` acrescente:

```ts
    ['natureza_mudou', 'os documentos novos já seguem a configuração nova; confira se foi de propósito'],
```

**1c.** Em `tradutor/consulta-documentos.test.mts`, no tipo `DocumentoErp` do topo, substitua:

```ts
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null
  itens: Item[]; pagamentos: Pagamento[]; parcelas: Parcela[]; conferencia: Conferencia[]; conferencia_abaixo_corte: number
```

por:

```ts
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null; natureza: number | null
  itens: Item[]; pagamentos: Pagamento[]; parcelas: Parcela[]; conferencia: Conferencia[]; conferencia_abaixo_corte: number
```

No teste `um documento completo sai com exatamente as chaves do DocumentoErp`, substitua:

```ts
    documento(185, 58, { idpessoa: null, idcaixaabertura: 0, idusuarioabertura: 0, idabertura: 0, datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:48:00' }),
```

por:

```ts
    documento(185, 58, {
      idpessoa: null, idcaixaabertura: 0, idusuarioabertura: 0, idabertura: 0, datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:48:00',
      idnaturezaoperacao: 530,
    }),
```

e, no mesmo teste, substitua:

```ts
    turno_caixa: 0, turno_usuario: 0, turno_numero: 0,
    itens: [{ oid: 1873, produto: 5278, quantidade: '1.000000', valor_liquido: '25.000000', vendedor: 1 }],
```

por:

```ts
    turno_caixa: 0, turno_usuario: 0, turno_numero: 0, natureza: 530,
    itens: [{ oid: 1873, produto: 5278, quantidade: '1.000000', valor_liquido: '25.000000', vendedor: 1 }],
```

**1d.** Em `tradutor/sql-erp.test.mts`, no teste `lerColunasEsperadas lê as 109 colunas…` (a tarefa 2 deixou 109), substitua:

```ts
test('lerColunasEsperadas lê as 109 colunas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadas()
  assert.equal(colunas.length, 109)
  assert.deepEqual(colunas[0], { tabela: 'documento', coluna: '_iddocumento', tipo: 'integer' })
```

por:

```ts
test('lerColunasEsperadas lê as 119 colunas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadas()
  // 109 até a tarefa 2 e 10 da natureza: documento.idnaturezaoperacao, 7 de natureza_operacao e 2 de config_entrada_saida.
  assert.equal(colunas.length, 119)
  assert.deepEqual(colunas[0], { tabela: 'config_entrada_saida', coluna: '_idempresa', tipo: 'integer' })
```

e, no fim do mesmo teste, substitua:

```ts
  assert.equal(new Set(colunas.map((c) => c.tabela)).size, 22)
```

por:

```ts
  assert.equal(new Set(colunas.map((c) => c.tabela)).size, 24)
```

**1e.** Em `tradutor/erp-falso.test.mts`, no teste `cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave`, substitua:

```ts
    assert.equal(r.rows.length, 109)
```

por:

```ts
    assert.equal(r.rows.length, 119)
```

**1f.** Em `tradutor/traducao-operacao-real.test.mts`, substitua:

```ts
// primeiro teste precisa ver os 7 avisos antes da 009, e só ela os resolve.
const ATE_A_008 = readdirSync(PASTA_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql') && nome <= '008_de_para_link_resposta_dono.sql')
  .sort()
```

por:

```ts
// primeiro teste precisa ver os 7 avisos antes da 009, e só ela os resolve. A 010 entra junto desde o começo: a
// conferência de códigos lê a natureza do documento, que só existe a partir dela.
const ATE_A_008 = readdirSync(PASTA_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql') && (nome <= '008_de_para_link_resposta_dono.sql' || nome === '010_natureza.sql'))
  .sort()
```

Esse arquivo monta o banco só até a 008 de propósito (ele confere o que a 009 resolve). A partir do Step 8, `codigosSemTraducao` lê `kaizen.documento.natureza`, que só existe com a 010; sem este ajuste, o primeiro teste dele cai com `column d.natureza does not exist`. A 010 é aplicada antes da 009 nesse banco, o que não muda nada: as duas não se tocam.

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `node --test tradutor/natureza.test.mts tradutor/avisos.test.mts tradutor/consulta-documentos.test.mts tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts`
Expected: falha, com estes motivos, cada um porque o código ainda não existe:
- `tradutor/natureza.test.mts` nem carrega: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\tradutor\natureza.mts'`;
- `tradutor/avisos.test.mts` nem carrega: `SyntaxError: The requested module './avisos.mts' does not provide an export named 'avisoNaturezaMudou'`;
- `✖ um documento completo sai com exatamente as chaves do DocumentoErp`: `column "idnaturezaoperacao" of relation "documento" does not exist` (o ERP falso ainda não tem a coluna);
- `✖ lerColunasEsperadas lê as 119 colunas, em ordem, sem repetição, com tipo conhecido` e `✖ cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave`: `109 !== 119`.

- [ ] **Step 3: Criar a migração `sql/migracoes/010_natureza.sql`**

Texto exato do esqueleto do plano (LF, terminando com `;` e uma quebra de linha):

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

- [ ] **Step 4: As consultas ao ERP**

**4a.** Criar `sql/erp/naturezas.sql` (como as outras de `sql/erp/`: um comando só, sem comentário, sem `;`, devolvendo o JSON na coluna `dados`):

```sql
select json_build_object(
  'naturezas', coalesce((
    select json_agg(json_build_object(
      'codigo', n._idnatureza,
      'descricao', n.descricao,
      'categoria', n.tipocategoria,
      'estoque', n.flagmovimentarestoque,
      'reserva', n.flagreservaestoque,
      'financeiro', n.flagmovimentarfinanceiro
    ) order by n._idnatureza)
    from natureza_operacao n
    where n._idempresa = 1
  ), '[]'),
  'troca', (
    select c.idnaturezatrocamercadoria
    from config_entrada_saida c
    where c._idempresa = 1
  )
)::text as dados
```

**4b.** Em `sql/erp/documentos.sql`, substitua:

```sql
  'turno_numero', d.idabertura,
  'itens', coalesce((
```

por:

```sql
  'turno_numero', d.idabertura,
  'natureza', nullif(d.idnaturezaoperacao, 0),
  'itens', coalesce((
```

**4c.** Em `sql/erp/colunas-esperadas.txt`, acrescente 10 linhas, mantendo a ordem do arquivo (tabela e coluna em ordem de byte, `_` antes das letras). No começo do arquivo, antes de `documento _iddocumento integer`:

```text
config_entrada_saida _idempresa integer
config_entrada_saida idnaturezatrocamercadoria integer
```

Logo depois de `documento idempresa integer`:

```text
documento idnaturezaoperacao integer
```

Logo depois de `municipio nome varchar`:

```text
natureza_operacao _idempresa integer
natureza_operacao _idnatureza integer
natureza_operacao descricao varchar
natureza_operacao flagmovimentarestoque varchar
natureza_operacao flagmovimentarfinanceiro varchar
natureza_operacao flagreservaestoque varchar
natureza_operacao tipocategoria varchar
```

Confira: `wc -l < sql/erp/colunas-esperadas.txt` dá `119`, e `LC_ALL=C sort -c -k1,1 -k2,2 sql/erp/colunas-esperadas.txt` não imprime nada.

- [ ] **Step 5: A gravação das versões e do documento**

**5a.** Criar `sql/carga/naturezas.sql`:

```sql
-- Uma versão nova para cada natureza lida que o Kaizen ainda não tem, ou cuja última versão difere em alguma
-- coluna (spec da Fase 4, seção 6). A natureza que sumiu do ERP fica como está. Devolve só as que mudaram,
-- com a versão anterior e a nova: a primeira versão de um código não é mudança.
with lida as (
  select
    n->>'codigo' as codigo,
    n->>'descricao' as descricao,
    n->>'categoria' as categoria,
    coalesce(n->>'estoque' = 'T', false) as estoque,
    coalesce(n->>'reserva' = 'T', false) as reserva,
    coalesce(n->>'financeiro' = 'T', false) as financeiro,
    -- a troca é a natureza que a configuração do ERP aponta, não uma categoria
    coalesce(n->>'codigo' = x.dados->>'troca', false) as troca
  from pg_temp.entrada x, jsonb_array_elements(x.dados->'naturezas') n
  where x.assunto = 'naturezas'
),
ultima as (
  select distinct on (v.codigo) v.codigo, v.descricao, v.categoria, v.estoque, v.reserva, v.financeiro, v.troca
  from kaizen.natureza v
  where v.fonte = 'meuerp'
  order by v.codigo, v.id desc
),
nova as (
  insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca)
  select 'meuerp', l.codigo, l.descricao, l.categoria, l.estoque, l.reserva, l.financeiro, l.troca
  from lida l
  left join ultima u on u.codigo = l.codigo
  where u.codigo is null
     or (l.descricao, l.categoria, l.estoque, l.reserva, l.financeiro, l.troca)
        is distinct from (u.descricao, u.categoria, u.estoque, u.reserva, u.financeiro, u.troca)
  order by l.codigo::bigint
  returning id, codigo, descricao, categoria, estoque, reserva, financeiro, troca
)
select
  nv.id,
  nv.codigo,
  jsonb_build_object('descricao', u.descricao, 'categoria', u.categoria, 'estoque', u.estoque,
    'reserva', u.reserva, 'financeiro', u.financeiro, 'troca', u.troca) as antes,
  jsonb_build_object('descricao', nv.descricao, 'categoria', nv.categoria, 'estoque', nv.estoque,
    'reserva', nv.reserva, 'financeiro', nv.financeiro, 'troca', nv.troca) as depois
from nova nv
join ultima u on u.codigo = nv.codigo
order by nv.codigo::bigint
```

É um comando só: `ultima` e o `select` final veem `kaizen.natureza` como estava antes do `insert` (todas as partes de um `with` leem a mesma fotografia), então o `join` final só acha as naturezas que já tinham versão, e a primeira versão de um código não sai como mudança.

**5b.** Em `sql/carga/documentos.sql`, no primeiro `insert into kaizen.documento`, substitua:

```sql
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero
)
```

por:

```sql
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero, natureza, natureza_id
)
```

substitua:

```sql
  nullif((l.j->>'turno_numero')::integer, 0)
from pg_temp.doc_lido l
```

por:

```sql
  nullif((l.j->>'turno_numero')::integer, 0),
  l.j->>'natureza',
  -- a última versão do código, gravada nesta mesma transação antes dos documentos; sem versão, fica vazia
  (select max(n.id) from kaizen.natureza n where n.fonte = 'meuerp' and n.codigo = l.j->>'natureza')
from pg_temp.doc_lido l
```

e substitua a última linha do `on conflict … do update set`:

```sql
  turno_numero = excluded.turno_numero;
```

por:

```sql
  turno_numero = excluded.turno_numero,
  natureza = excluded.natureza,
  -- a versão da natureza é a da primeira gravação com aquele código: regravar com o mesmo código não troca
  natureza_id = case
    when documento.natureza is not distinct from excluded.natureza then documento.natureza_id
    else excluded.natureza_id
  end;
```

No `do update set`, `documento.…` é a linha que já estava no Kaizen e `excluded.…` a que chegou agora; todas as expressões do `set` leem a linha antiga, então `documento.natureza` ainda é o código de antes.

**5c.** Em `tradutor/carga.mts`, substitua:

```ts
async function rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>> {
```

por:

```ts
export async function rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>> {
```

e substitua:

```ts
  assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros',
```

por:

```ts
  assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros' | 'naturezas',
```

- [ ] **Step 6: O aviso `natureza_mudou`**

**6a.** Em `tradutor/tipos.mts`, substitua:

```ts
  | 'codigo_sem_traducao' | 'documento_apagado' | 'fechamento_com_resto' | 'estoque_diverge'
```

por:

```ts
  | 'codigo_sem_traducao' | 'natureza_mudou' | 'documento_apagado' | 'fechamento_com_resto' | 'estoque_diverge'
```

**6b.** Em `tradutor/telegram.mts`, em `ORDEM_DOS_TIPOS`, substitua:

```ts
  'codigo_sem_traducao', 'documento_apagado', 'fechamento_com_resto', 'estoque_diverge',
```

por:

```ts
  'codigo_sem_traducao', 'natureza_mudou', 'documento_apagado', 'fechamento_com_resto', 'estoque_diverge',
```

**6c.** Em `tradutor/avisos.mts`, logo antes da linha `export function avisoDocumentoApagado(a: Apagado): Aviso {`, acrescente:

```ts
// Uma natureza que o Kaizen já tinha mudou no ERP. A versão nova vai na chave: cada mudança é um aviso só.
export function avisoNaturezaMudou(codigo: string, descricao: string | null, versao: string, mudancas: string[]): Aviso {
  return {
    tipo: 'natureza_mudou',
    chave: `natureza:${codigo}:${versao}`,
    texto: `A natureza ${codigo}${descricao === null ? '' : ` (${descricao})`} mudou no ERP: ${mudancas.join('; ')}.`,
  }
}

```

Em `TITULOS`, logo depois de `  codigo_sem_traducao: 'Códigos novos no ERP',`, acrescente:

```ts
  natureza_mudou: 'Naturezas de operação que mudaram no ERP',
```

Em `O_QUE_FAZER`, logo depois de `  codigo_sem_traducao: LEVAR_AO_CLAUDE,`, acrescente:

```ts
  natureza_mudou: 'os documentos novos já seguem a configuração nova; confira se foi de propósito',
```

- [ ] **Step 7: Criar `tradutor/natureza.mts`**

```ts
import { avisoNaturezaMudou } from './avisos.mts'
import type { Cliente } from './banco.mts'
import { rodarCarga } from './carga.mts'
import type { Erp } from './erp.mts'
import { modeloErp, montar } from './sql-erp.mts'
import type { Aviso } from './tipos.mts'

// Uma consulta a mais por execução: as naturezas da empresa 1 e a natureza de troca da configuração do ERP.
export async function lerNaturezas(erp: Erp): Promise<string> {
  return erp.consultar(montar(modeloErp('naturezas'), {}))
}

type Versao = {
  descricao: string | null; categoria: string | null
  estoque: boolean; reserva: boolean; financeiro: boolean; troca: boolean
}

// Na ordem do aviso (spec da Fase 4, seção 6).
const COLUNAS: Array<[keyof Versao, string]> = [
  ['categoria', 'categoria'],
  ['estoque', 'mexe no estoque'],
  ['reserva', 'reserva estoque'],
  ['financeiro', 'mexe no financeiro'],
  ['troca', 'é a troca'],
  ['descricao', 'descrição'],
]

function emPalavras(valor: string | boolean | null): string {
  if (valor === true) return 'sim'
  if (valor === false) return 'não'
  return valor ?? 'vazia'
}

// Roda dentro da transação da leitura, depois de colocarEntrada('naturezas') e antes de gravarDocumentos:
// o documento novo recebe a versão gravada aqui. Devolve um aviso por natureza que o Kaizen já tinha e mudou.
export async function gravarNaturezas(cliente: Cliente): Promise<Aviso[]> {
  const linhas = (await rodarCarga(cliente, 'naturezas')) as Array<{ id: string; codigo: string; antes: Versao; depois: Versao }>
  return linhas.map((l) => {
    const mudancas = COLUNAS
      .filter(([coluna]) => l.antes[coluna] !== l.depois[coluna])
      .map(([coluna, nome]) => `${nome}: ${emPalavras(l.antes[coluna])} → ${emPalavras(l.depois[coluna])}`)
    return avisoNaturezaMudou(l.codigo, l.depois.descricao, l.id, mudancas)
  })
}
```

O `id` chega como texto (o `tradutor/banco.mts` lê `bigint` como texto) e o `jsonb` chega como objeto, com os booleanos como `true`/`false`.

- [ ] **Step 8: A conferência de códigos sem tradução olha a natureza**

Em `tradutor/conferencias.mts`, substitua:

```ts
// Cada código cru do ERP novo e o campo de kaizen.traducao que o explica.
```

por:

```ts
// Cada código cru do ERP novo e o campo de kaizen.traducao que o explica; o código da natureza é explicado por
// kaizen.natureza. Natureza vazia (documento sem natureza no ERP, ou gravado antes da Fase 4) não é código.
```

dentro de `SQL_CODIGOS_SEM_TRADUCAO`, substitua:

```sql
  union all
  select 'financeiro', d.financeiro from kaizen.documento d where d.fonte = 'meuerp'
```

por:

```sql
  union all
  select 'financeiro', d.financeiro from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'natureza', d.natureza from kaizen.documento d where d.fonte = 'meuerp'
```

e substitua:

```sql
  and not exists (
    select 1 from kaizen.traducao t
    where t.fonte = 'meuerp' and t.campo = c.campo and t.codigo = c.codigo
  )
```

por:

```sql
  and case c.campo
    when 'natureza' then not exists (
      select 1 from kaizen.natureza n
      where n.fonte = 'meuerp' and n.codigo = c.codigo
    )
    else not exists (
      select 1 from kaizen.traducao t
      where t.fonte = 'meuerp' and t.campo = c.campo and t.codigo = c.codigo
    )
  end
```

A natureza vazia já fica de fora pelo `where c.codigo is not null` que existe.

- [ ] **Step 9: A execução lê e grava as naturezas**

Em `tradutor/execucao.mts`, logo depois da linha `import { aplicarMigracoes } from './migracoes.mts'`, acrescente:

```ts
import { gravarNaturezas, lerNaturezas } from './natureza.mts'
```

Em `rodar`, substitua:

```ts
  const textoCadastros = await lerCadastros(erp)
```

por:

```ts
  const textoCadastros = await lerCadastros(erp)
  // Depois dos documentos: a natureza que um documento lido usa já existe no ERP quando as naturezas são lidas.
  const textoNaturezas = await lerNaturezas(erp)
```

e, dentro da transação da carga, substitua:

```ts
    await colocarEntrada(cliente, 'cadastros', [textoCadastros])
    // Cadastros antes, para o aviso de documento apagado já ter o nome do vendedor.
    const cadastros = await gravarCadastros(cliente)
    const lidos = await gravarDocumentos(cliente)
```

por:

```ts
    await colocarEntrada(cliente, 'cadastros', [textoCadastros])
    await colocarEntrada(cliente, 'naturezas', [textoNaturezas])
    // Cadastros antes, para o aviso de documento apagado já ter o nome do vendedor.
    const cadastros = await gravarCadastros(cliente)
    // Naturezas antes dos documentos, para o documento novo receber a versão desta leitura.
    avisosDaCarga.push(...(await gravarNaturezas(cliente)))
    const lidos = await gravarDocumentos(cliente)
```

O aviso da natureza vai para `avisosDaCarga`: só vale se a carga for gravada, como os outros avisos da carga.

- [ ] **Step 10: Rodar os testes e ver passar**

Run: `node --test tradutor/natureza.test.mts tradutor/avisos.test.mts tradutor/consulta-documentos.test.mts tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts tradutor/conferencias.test.mts tradutor/traducao-operacao-real.test.mts tradutor/execucao.test.mts tradutor/execucao-noite.test.mts tradutor/consultas-erp.test.mts`
Expected: passa, com `ℹ fail 0`, e entre as linhas:

```
✔ lerNaturezas: as naturezas da empresa 1 em ordem de código, com os flags crus, e a troca da configuração
✔ documentos: a natureza sai como o código do ERP; 0 e vazia saem vazias
✔ primeira leitura: uma versão por natureza, flag T vira sim, a troca vem da configuração, e nada é avisado; a mesma leitura de novo não grava nada
✔ sem natureza de troca na configuração (o ERP antes de 25/09), nenhuma natureza é a troca
✔ um flag muda no ERP: versão nova só daquela natureza, a antiga fica, e o aviso diz o que mudou
✔ várias mudanças numa natureza saem numa linha, na ordem do aviso; a troca que passa para outra natureza muda as duas
✔ natureza que sumiu do ERP fica como está, e a natureza nova ganha versão sem aviso
✔ documento: guarda a versão da primeira gravação; regravar com o mesmo código não troca; código novo pega a última do novo
✔ documento gravado antes da Fase 4, sem natureza: a conferência não o acusa, e a releitura grava a natureza da versão de agora
✔ conferência: código de natureza sem versão no Kaizen vira aviso de código sem tradução; natureza conhecida ou vazia, não
✔ execução da hora: uma consulta de naturezas, a versão gravada antes do documento, e o aviso na execução seguinte
✔ avisoNaturezaMudou junta as mudanças com "; ", leva a versão nova na chave e deixa de fora a descrição vazia
✔ lerColunasEsperadas lê as 119 colunas, em ordem, sem repetição, com tipo conhecido
```

`tradutor/consultas-erp.test.mts` passa a conferir também `sql/erp/naturezas.sql` sozinho (um comando, sem comentário, só leitura, sem sintaxe do Postgres 15/16, e roda no ERP falso vazio devolvendo JSON). As execuções dos testes da Fase 2 continuam `ok`: no ERP falso deles as tabelas de natureza existem vazias, a leitura devolve `{ naturezas: [], troca: null }` e nada é gravado.

Se `✔ um flag muda no ERP…` passar mas `✔ documento: guarda a versão da primeira gravação…` falhar com o 185 apontando para a versão 6, o `case` do Step 5b está trocando a versão ao regravar: confira o `is not distinct from`.

- [ ] **Step 11: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 12 testes: os 11 de `tradutor/natureza.test.mts` e `avisoNaturezaMudou junta as mudanças…`, em `tradutor/avisos.test.mts`; os outros testes mudados já existiam. O arquivo fica com uma única linha:

```text
355
```

- [ ] **Step 12: Rodar a verificação completa**

Run: `npm run verificar`
Expected: passa; `tsc -p .` sem nenhuma linha de erro; todos os testes com ✔; última linha `rodou 355 testes, esperados 355`.

- [ ] **Step 13: Commit**

```bash
git add sql/migracoes/010_natureza.sql sql/erp/naturezas.sql sql/erp/documentos.sql sql/erp/colunas-esperadas.txt \
  sql/carga/naturezas.sql sql/carga/documentos.sql tradutor/natureza.mts tradutor/natureza.test.mts tradutor/carga.mts \
  tradutor/tipos.mts tradutor/avisos.mts tradutor/telegram.mts tradutor/conferencias.mts tradutor/execucao.mts \
  tradutor/avisos.test.mts tradutor/consulta-documentos.test.mts tradutor/sql-erp.test.mts tradutor/erp-falso.test.mts \
  tradutor/traducao-operacao-real.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 4: o Kaizen lê a natureza de operação do ERP e guarda no documento a da época

A cada leitura (hora e noite), o tradutor do ERP novo lê as naturezas de
operação da empresa 1 e a natureza de troca da configuração (hoje a 900),
numa consulta a mais ao ERP. Cada natureza ganha uma versão em
kaizen.natureza, e só ganha outra quando algo muda no ERP. O documento
passa a guardar o código da natureza (530 no pedido, 520 no orçamento,
vazio no caixa e nas contas) e a versão que valia quando ele entrou no
Kaizen; regravar o documento não troca a versão.

Quando o dono muda uma natureza no ERP, o resumo das 22h avisa o quê,
por exemplo: "A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no
financeiro: sim → não." Código de natureza desconhecido vira aviso de
código sem tradução; documento sem natureza não é acusado.
Testes: rodou 355, esperados 355.
EOF
```

Acrescente ao fim da mensagem a linha de atribuição que o sistema lhe dá. Expected: o hook roda `npm run verificar` e termina com `rodou 355 testes, esperados 355`; o commit sai.

---

DECISÃO (pontos que a spec e o esqueleto não fixam; escolhi a leitura mais simples e segui):

1. **Descrição no aviso.** O parêntese leva a descrição que está agora no ERP (a nova, quando a descrição também mudou); descrição vazia sai sem parêntese ("A natureza 77 mudou no ERP: …"). Valor vazio de categoria ou descrição aparece como `vazia`. Os booleanos saem `sim`/`não`, como no exemplo da spec.
2. **Chave do aviso `natureza:<código>:<versão nova>`.** Com só o código, uma segunda mudança da mesma natureza, dias depois, cairia em "Continuam N avisos já informados" no resumo das 22h (o resumo esconde chave já mandada). Com a versão, cada mudança aparece uma vez.
3. **Lugar e textos no resumo.** `natureza_mudou` é o segundo grupo, logo depois de "Códigos novos no ERP" (os dois são o ERP mudando por fora). Título "Naturezas de operação que mudaram no ERP"; o que fazer: "os documentos novos já seguem a configuração nova; confira se foi de propósito". A spec não dá o texto.
4. **Documento regravado com o mesmo código, que ficou sem versão na primeira gravação** (código que não estava em `kaizen.natureza`): continua sem versão, pela letra da spec ("regravar com o mesmo código não troca"). O aviso de código sem tradução acusa esse código a cada execução enquanto ele não tiver versão. Na prática não acontece: as naturezas são lidas depois dos documentos (Step 9), então toda natureza que um documento lido usa já está na leitura; só uma natureza apagada do ERP deixaria o código sem versão.
5. **Ordem das consultas.** `lerNaturezas` roda depois de `lerCadastros` (e, portanto, depois dos documentos), pelo motivo do item 4. A gravação das versões fica antes de `gravarDocumentos`, dentro da mesma transação, como a spec pede.
6. **Flag vazio** conta como "não" (`coalesce(… = 'T', false)`), como o `inativo` dos cadastros; hoje nenhuma das 81 naturezas tem flag vazio (medido em 28/09). **Troca vazia na configuração**: nenhuma natureza é a troca (testado: é o ERP de antes de 25/09).
7. **A troca é uma subconsulta de um valor só** (`config_entrada_saida` da empresa 1, uma linha no ERP hoje). Se um dia houver duas linhas da empresa 1, a consulta dá erro no ERP e a leitura falha com a mensagem do Postgres, em vez de escolher uma troca por conta própria.
8. **`rodarCarga` exportada** de `tradutor/carga.mts` para `tradutor/natureza.mts` rodar `sql/carga/naturezas.sql` (um comando só), em vez de repetir a leitura do arquivo.
9. **As chaves do JSON do ERP** (`codigo`, `descricao`, `categoria`, `estoque`, `reserva`, `financeiro`) são os nomes das colunas de `kaizen.natureza`, e não os nomes do ERP (`_idnatureza`, `tipocategoria`, flags), como as outras consultas de `sql/erp/` já fazem com `documento` (`codigo`, `modelo`, `movimento`…).
10. **`tradutor/traducao-operacao-real.test.mts`** passa a montar o banco com a 010 além das migrações até a 008: a conferência de códigos lê `kaizen.documento.natureza`. É o único teste de conteúdo de migração antiga que roda `codigosSemTraducao`.
11. **Sem contagem nova em `contagens`** da execução (por exemplo, `naturezas`): a spec não pede.

---

### Task 5: a natureza da Link

A Link ganha as três naturezas fixas da decisão 9 da spec (`pedido`, `orcamento`, `nota_entrada`, fonte `link`, válidas desde 01/04/2026) e o comando da Link (`tradutor/link.mts`) passa a gravar `natureza` e `natureza_id` nos documentos, pela tradução `natureza_pelo_modelo`: `A/true` e `T/true` → `pedido`, `P/false` → `orcamento`, `55` → `nota_entrada`. Fechamento de caixa, sangria, suprimento e conta a pagar ficam sem natureza, como no ERP novo. Na primeira gravação, `natureza_id` é a última versão daquele código em `kaizen.natureza`; regravado com a mesma natureza, o documento guarda a versão que tinha (spec, seção 6, "Documento"). `tradutor/link.mts` não muda: todo o trabalho é o primeiro comando de `sql/link/gravar.sql`.

Com a Link falsa da Fase 3 (26 documentos): 15 pedidos, 1 orçamento e 2 notas de entrada com natureza; 3 fechamentos, 2 sangrias, 1 suprimento e 2 contas sem natureza. No banco do PC (6.183 documentos): 5.305 pedidos, 4 orçamentos e 51 notas de entrada com natureza; 823 sem (158 fechamentos + 420 sangrias + 157 suprimentos + 88 contas).

**Files:**
- Create: `sql/migracoes/011_natureza_link.sql`
- Create: `tradutor/link-natureza.test.mts`
- Modify: `sql/link/gravar.sql` (só o primeiro comando, o `insert into kaizen.documento … on conflict … do update set …;`)
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes: a migração 010 (tarefa 4): a tabela `kaizen.natureza (id bigint identity, fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca, valida_desde)` e as colunas `kaizen.documento.natureza text` e `kaizen.documento.natureza_id bigint references kaizen.natureza (id)`. Da Fase 3: `traduzirLink(cliente: Cliente): Promise<ContagensLink>` (`tradutor/link.mts`); `criarLinkFalsa(banco: BancoTeste): Promise<LinkFalsa>` e `carregarCasosLink(falsa: LinkFalsa, cliente: Cliente): Promise<void>` (`tradutor/link-falsa.mts`); `criarBancoKaizen(): Promise<BancoTeste>` (`tradutor/apoio-teste.mts`).
- Produces: em `kaizen.natureza`, as três versões da Link (`fonte = 'link'`, `codigo` `pedido` V/estoque/financeiro, `orcamento` V/sem estoque/sem financeiro, `nota_entrada` C/estoque/sem financeiro; `reserva` e `troca` falsos); em `kaizen.traducao`, o campo `natureza_pelo_modelo` da fonte `link`; e os documentos da Link com `natureza` e `natureza_id` gravados. A tarefa 6 (`kaizen.documento_papel`) lê isso: o pedido da Link sai com papel `venda`, a nota de entrada com `compra`, o orçamento com `outro`, e caixa e contas pelo tipo traduzido.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `tradutor/link-natureza.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

// A natureza da Link (spec da Fase 4, seção 6 e decisão 9), com os 26 documentos da Link falsa da Fase 3:
// 15 pedidos (14 vendas válidas e 1 cancelada), 1 orçamento, 2 notas de entrada, 3 fechamentos de caixa,
// 2 sangrias, 1 suprimento e 2 contas a pagar.

let banco: BancoTeste
let falsa: LinkFalsa
before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
})
after(async () => {
  await falsa.fechar()
  await banco.fechar()
})

// Os documentos da Link por tipo e natureza, com a versão para a qual o documento aponta.
async function porNatureza(): Promise<Array<Record<string, unknown>>> {
  const resultado = await banco.cliente.query(`
    select dn.tipo, d.natureza, n.fonte as versao_fonte, n.codigo as versao_codigo,
           n.categoria, n.estoque, n.financeiro, count(*)::int as documentos
      from kaizen.documento d
      join kaizen.documento_negocio dn on dn.id = d.id
      left join kaizen.natureza n on n.id = d.natureza_id
     where d.fonte = 'link'
     group by 1, 2, 3, 4, 5, 6, 7
     order by dn.tipo collate "C"`)
  return resultado.rows
}

// A natureza de cada documento da Link, na ordem do id.
async function naturezas(): Promise<Array<Record<string, unknown>>> {
  const resultado = await banco.cliente.query(
    `select id, natureza, natureza_id from kaizen.documento where fonte = 'link' order by id`,
  )
  return resultado.rows
}

// Com os casos da Link falsa: 15 + 1 + 2 = 18 documentos com natureza; 3 + 2 + 1 + 2 = 8 sem.
const ESPERADO = [
  { tipo: 'conta_pagar', natureza: null, versao_fonte: null, versao_codigo: null, categoria: null, estoque: null, financeiro: null, documentos: 2 },
  { tipo: 'fechamento_caixa', natureza: null, versao_fonte: null, versao_codigo: null, categoria: null, estoque: null, financeiro: null, documentos: 3 },
  { tipo: 'nota_entrada', natureza: 'nota_entrada', versao_fonte: 'link', versao_codigo: 'nota_entrada', categoria: 'C', estoque: true, financeiro: false, documentos: 2 },
  { tipo: 'orcamento', natureza: 'orcamento', versao_fonte: 'link', versao_codigo: 'orcamento', categoria: 'V', estoque: false, financeiro: false, documentos: 1 },
  { tipo: 'pedido', natureza: 'pedido', versao_fonte: 'link', versao_codigo: 'pedido', categoria: 'V', estoque: true, financeiro: true, documentos: 15 },
  { tipo: 'sangria', natureza: null, versao_fonte: null, versao_codigo: null, categoria: null, estoque: null, financeiro: null, documentos: 2 },
  { tipo: 'suprimento', natureza: null, versao_fonte: null, versao_codigo: null, categoria: null, estoque: null, financeiro: null, documentos: 1 },
]

test('a Link grava a natureza pelo modelo: 15 pedidos, 1 orçamento e 2 notas de entrada com a versão da Link; caixa e contas ficam sem natureza', async () => {
  await traduzirLink(banco.cliente)
  assert.deepEqual(await porNatureza(), ESPERADO)
})

test('os documentos gravados sem natureza (a história da Fase 3) ganham a natureza na rodada seguinte, e rodar de novo não muda nada', async () => {
  await traduzirLink(banco.cliente)
  // O estado do banco do PC depois da migração 010: os 26 documentos já gravados, com a natureza vazia.
  await banco.cliente.query(`update kaizen.documento set natureza = null, natureza_id = null where fonte = 'link'`)
  const primeira = await traduzirLink(banco.cliente)
  assert.equal(primeira.novos, '0')
  assert.deepEqual(await porNatureza(), ESPERADO)
  const depoisDaPrimeira = await naturezas()
  const segunda = await traduzirLink(banco.cliente)
  assert.deepEqual(segunda, primeira)
  assert.deepEqual(await naturezas(), depoisDaPrimeira)
})

// Último teste do arquivo: deixa no banco a versão nova da natureza pedido.
test('regravar não troca a versão: com uma versão nova da natureza pedido, os 15 pedidos continuam com a da migração', async () => {
  await traduzirLink(banco.cliente)
  const daMigracao = await banco.cliente.query<{ id: string }>(
    `select id from kaizen.natureza where fonte = 'link' and codigo = 'pedido'`,
  )
  assert.equal(daMigracao.rows.length, 1)
  const nova = await banco.cliente.query<{ id: string }>(`
    insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca)
    values ('link', 'pedido', 'PEDIDO DA LINK', 'V', true, false, false, false)
    returning id`)
  assert.notEqual(nova.rows[0].id, daMigracao.rows[0].id)
  await traduzirLink(banco.cliente)
  const pedidos = await banco.cliente.query(`
    select natureza_id, count(*)::int as documentos
      from kaizen.documento
     where fonte = 'link' and natureza = 'pedido'
     group by 1`)
  assert.deepEqual(pedidos.rows, [{ natureza_id: daMigracao.rows[0].id, documentos: 15 }])
})
```

As contagens do `ESPERADO` são as do resumo da Link falsa que a Fase 3 já prova em `tradutor/link-comando.test.mts` (`documentos:pedido 15`, `documentos:orcamento 1`, `documentos:nota_entrada 2`, `documentos:fechamento_caixa 3`, `documentos:sangria 2`, `documentos:suprimento 1`, `documentos:conta_pagar 2`); o que este teste acrescenta é a natureza e a versão de cada grupo. O terceiro teste é o único que separa "última versão" de "versão da época": sem o `case` do passo 4, os 15 pedidos passariam para a versão nova.

- [ ] **Passo 2: Rodar o teste e ver falhar**

Run: `node --test tradutor/link-natureza.test.mts`
Expected: FAIL, `ℹ tests 3`, `ℹ pass 0`, `ℹ fail 3`. Os dois primeiros com `Expected values to be strictly deep-equal` (os grupos `pedido`, `orcamento` e `nota_entrada` saem com `natureza: null` e `versao_fonte: null`); o terceiro com `0 !== 1` (ainda não há natureza `pedido` da Link em `kaizen.natureza`).

- [ ] **Passo 3: Criar a migração 011**

Criar `sql/migracoes/011_natureza_link.sql`, exatamente com este texto (o do esqueleto do plano):

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

- [ ] **Passo 4: Gravar a natureza no comando da Link**

Em `sql/link/gravar.sql`, substituir o primeiro comando do arquivo inteiro — do comentário `-- O documento é atualizado no lugar pela chave (fonte, origem_tabela, origem_id): id e visto_em não mudam.` até a linha `  turno_numero = excluded.turno_numero;`, antes do comentário `-- documento da Link que não voltou na leitura sai, com os filhos` — por:

```sql
-- O documento é atualizado no lugar pela chave (fonte, origem_tabela, origem_id): id e visto_em não mudam.
-- Movimento, financeiro e turno de caixa ficam vazios; vêm da tradução pelo modelo.
-- A natureza vem da tradução natureza_pelo_modelo (só pedido, orçamento e nota de entrada têm; caixa e contas ficam
-- sem), com a última versão dela em kaizen.natureza. Regravado com a mesma natureza, o documento guarda a versão que tinha.
insert into kaizen.documento as k (
  fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro,
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero, natureza, natureza_id
)
select
  'link', d.origem_tabela, d.origem_id, d.codigo, d.modelo, d.status, null, null,
  d.criado_em, d.fechado_em, d.pessoa, null, d.turno_usuario, null,
  tn.valor, (select max(n.id) from kaizen.natureza n where n.fonte = 'link' and n.codigo = tn.valor)
from pg_temp.link_doc d
left join kaizen.traducao tn on tn.fonte = 'link' and tn.campo = 'natureza_pelo_modelo' and tn.codigo = d.modelo
order by d.criado_em, d.origem_tabela, d.origem_id
on conflict (fonte, origem_tabela, origem_id) do update set
  codigo = excluded.codigo,
  modelo = excluded.modelo,
  status = excluded.status,
  movimento = excluded.movimento,
  financeiro = excluded.financeiro,
  criado_em = excluded.criado_em,
  fechado_em = excluded.fechado_em,
  pessoa = excluded.pessoa,
  turno_caixa = excluded.turno_caixa,
  turno_usuario = excluded.turno_usuario,
  turno_numero = excluded.turno_numero,
  natureza = excluded.natureza,
  natureza_id = case when k.natureza is not distinct from excluded.natureza then k.natureza_id else excluded.natureza_id end;
```

O resto do arquivo (os `delete`, os `insert` dos filhos e o `select` das contagens) não muda.

- [ ] **Passo 5: Rodar o teste e ver passar**

Run: `node --test tradutor/link-natureza.test.mts`
Expected: PASS, `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

- [ ] **Passo 6: Atualizar a contagem e rodar tudo**

Esta tarefa acrescenta 3 testes. Escrever em `testes-esperados.txt` só o número:

```
358
```

Run: `npm run verificar`
Expected: os tipos passam, nenhum teste falha, e a última linha é `rodou 358 testes, esperados 358`. Os testes da Link da Fase 3 (`tradutor/link-*.test.mts`) continuam passando sem mudança: a comparação por dia, as contagens `documentos=26, novos=0, itens=57, pagamentos=22, conferencias=12, parcelas=8, baixas=4` e as duas rodadas iguais em todas as tabelas.

- [ ] **Passo 7: Commit**

```bash
git add sql/migracoes/011_natureza_link.sql sql/link/gravar.sql tradutor/link-natureza.test.mts testes-esperados.txt
git commit -m "Fase 4: a Link grava a natureza nos documentos (pedido, orçamento e nota de entrada); caixa e contas ficam sem"
```

(O hook `pre-commit` roda `npm run verificar` de novo. A linha de atribuição do commit é a que o sistema dá ao agente.)

- [ ] **Passo 8: No banco do PC (não é teste)**

Rodar na raiz do repositório, com o código desta tarefa e o `.env` do PC (`KAIZEN_URL` aponta para o banco `kaizen` do PC; num worktree, use `--env-file=C:/Projetos/KAIZEN/.env`). Na ordem:

Run: `node --env-file=.env tradutor/principal.mts migrar` (o comando da tarefa 1)
Expected: uma linha `migrar: aplicadas …` cuja lista termina em `011_natureza_link`. Em 28/09 o banco do PC estava na 008: a lista é 009, 010 e 011, a não ser que uma tarefa anterior já tenha aplicado a 009 e a 010. Saída 0.

Run: `node --env-file=.env tradutor/link.mts`
Expected: saída 0; a primeira linha é

```
link ok: documentos=6183, novos=0, itens=15288, pagamentos=6009, conferencias=632, parcelas=221, baixas=127
```

e o resumo que vem depois traz, entre outras, `documentos: 6183`, `documentos:pedido: 5305`, `documentos:orcamento: 4`, `documentos:nota_entrada: 51` e `vendas_validas: 5271`. O `link ok` só sai se a comparação por dia com a Link não tiver diferença.

Run (só leitura):

```bash
echo "select d.natureza, dn.tipo, n.fonte, count(*) from kaizen.documento d join kaizen.documento_negocio dn on dn.id = d.id left join kaizen.natureza n on n.id = d.natureza_id where d.fonte = 'link' group by d.natureza, dn.tipo, n.fonte order by d.natureza nulls first, dn.tipo collate \"C\";" | docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At
```

Expected (natureza | tipo | fonte da versão | documentos):

```
|conta_pagar||88
|fechamento_caixa||158
|sangria||420
|suprimento||157
nota_entrada|nota_entrada|link|51
orcamento|orcamento|link|4
pedido|pedido|link|5305
```

Com natureza: 5.305 + 4 + 51 = 5.360; sem natureza: 88 + 158 + 420 + 157 = 823; ao todo 6.183. Os 5.305 pedidos são os 2.069 de modelo `A/true` mais os 3.236 de `T/true` (medido por SELECT no banco do PC em 28/09); as 420 sangrias são 403 `Sangria/true` e 17 `Sangria/false`; as 88 contas são 80 `2.1.2.02`, 6 `2.1.4.10`, 1 `2.1.3.07` e 1 `2.1.5.02`. Anotar as três saídas no registro da tarefa.

DECISÃO: `natureza_id` do documento da Link segue a regra geral da spec (seção 6, "Documento"): na primeira gravação, a última versão do código (`max(id)` da fonte `link`); regravado com a mesma natureza, fica a versão que ele tinha; se a natureza mudou (inclusive de vazia para `pedido`, que é o caso dos 6.183 documentos que a Fase 3 gravou no PC), passa à última versão da nova. Com as três naturezas fixas da migração 011 isso dá hoje o mesmo número que "a versão da Link com esse código"; o `case` só faz diferença se um dia entrar uma segunda versão de uma natureza da Link, e o terceiro teste prova esse caso. A regra é a mesma do tradutor do ERP novo (tarefa 4), para as duas fontes não se comportarem diferente.

DECISÃO: `sql/link/sem-traducao.sql` não passa a exigir `natureza_pelo_modelo`: caixa e contas ficam sem natureza de propósito (spec, seção 6, "Link"), e um modelo novo da Link já para o comando pela falta da tradução `tipo`, que o arquivo confere em todo documento.

DECISÃO: os testes ficam num arquivo novo, `tradutor/link-natureza.test.mts`, que o mapa de arquivos do plano não lista para a tarefa 5 (lá estão só `011_natureza_link.sql` e `gravar.sql`). Os testes da Link da Fase 3 continuam como estão.

---

### Task 6: A base das regras: o papel de cada documento, os itens vendidos e devolvidos, e o que o dono digita

**O que esta tarefa entrega, em resultado:** o Kaizen passa a dizer, num lugar só, o que cada documento é para as regras. Com natureza, o pedido 530 é venda; o orçamento 520 e a pré-venda 500 são "outro" (são de venda, mas não mexem no financeiro); a troca 900 é troca; a nota 5 é compra. Sem natureza (caixa e contas), vale o tipo traduzido: conta a pagar, sangria (RS e RT), suprimento, suprimento adicional, fechamento de caixa. Na Link, pelas três naturezas da migração 011, o pedido é venda, o orçamento é outro e a nota é compra; a conta a pagar segue o tipo. O documento cancelado fica de fora. O pedido do ERP novo gravado antes da Fase 4, ainda sem natureza, aparece como "pedido", não como venda, até a leitura da noite regravá-lo. O dia de cada documento é o do fechamento, ou o da criação quando ele não tem fechamento. Uma segunda visão lista os itens que contam como vendido e devolvido, iguais nas duas fontes, com o dia e a hora da venda. O dono ganha as tabelas de meta (uma por mês para a loja e uma para cada vendedor), feriado (já com 01/05, 07/09 e 26/09) e saldo do banco. Fica pronto também o apoio que monta documentos à mão nos testes das regras (tarefas 7 a 10). São 9 testes novos, num commit.

**Files:**
- Create: `sql/migracoes/012_regras.sql`
- Create: `tradutor/apoio-regras.mts`
- Test: `tradutor/papel.test.mts`
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes:
  - `kaizen.natureza` (`id bigint`, `fonte`, `codigo`, `descricao`, `categoria`, `estoque`, `reserva`, `financeiro`, `troca`, `valida_desde`) e as colunas `kaizen.documento.natureza text` e `kaizen.documento.natureza_id bigint`, da migração `010_natureza.sql` (tarefa 4).
  - As três naturezas da Link (`pedido`, `orcamento`, `nota_entrada`, fonte `link`), da migração `011_natureza_link.sql` (tarefa 5).
  - `criarBancoKaizen(): Promise<BancoTeste>` de `tradutor/apoio-teste.mts` (um banco de teste novo, com todas as migrações) e `type Cliente` de `tradutor/banco.mts`.
  - As traduções de `kaizen.traducao` das migrações 002, 006 e 009. Tipo: `PA` pedido, `OC` orcamento, `PV` pre_venda, `TM` troca, `CP` conta_pagar, `RS` e `RT` sangria, `SF` suprimento, `SD` suprimento_adicional, `FC` fechamento_caixa; na Link, `A/true` pedido, `P/false` orcamento, `55` nota_entrada, `2.1.2.02` conta_pagar. Situação: `E` emitido e `C` cancelado; na Link, `false` emitido, e o documento sem status fica emitido pela situação do modelo. Sentido do item: `S` saida, `E` entrada, `N` nenhum, nas duas fontes.
- Produces (usado pelas tarefas 7 a 10):
  - `kaizen.meta (id, mes date, vendedor text, valor numeric)`: `mes` é sempre dia 1, `vendedor` vazio é a loja, `valor` maior que zero; o índice único `meta_mes_vendedor`, em `(mes, coalesce(vendedor, ''))`, aceita uma meta por mês e vendedor.
  - `kaizen.feriado (data date chave, descricao text)`, já com 2026-05-01, 2026-09-07 e 2026-09-26; `kaizen.saldo_banco (data date chave, valor numeric)`, vazia.
  - `kaizen.documento_negocio` com as 18 colunas de antes e, no fim, `natureza`, `natureza_id`, `categoria`, `mexe_estoque`, `mexe_financeiro`, `troca`, vazias quando o documento não tem natureza.
  - `kaizen.documento_papel (id bigint, fonte text, dia date, papel text)`: só os documentos emitidos. `papel` é `venda`, `troca`, `compra` ou `outro` para quem tem natureza, e o tipo traduzido para quem não tem (`conta_pagar`, `sangria`, `suprimento`, `suprimento_adicional`, `fechamento_caixa`, `pedido`…).
  - `kaizen.venda_item (documento bigint, fonte text, dia date, hora int, pessoa text, produto text, vendedor text, quantidade numeric, valor numeric, sentido text)`: os itens com vendedor dos documentos de papel `venda` ou `troca`; `sentido` é `vendido` (item de saída) ou `devolvido` (item de entrada). Pelo `pg`, `documento`, `dia`, `quantidade` e `valor` chegam como texto e `hora` como número.
  - `tradutor/apoio-regras.mts`, com as assinaturas e os padrões do esqueleto do plano: `inserirNatureza`, `inserirDocumento`, `inserirItem`, `inserirPagamento`, `inserirParcela`, `inserirBaixa`, `inserirConferencia`, `inserirMovimento`, `inserirVirada`, `inserirProduto`, `inserirFuncionario`, `inserirFornecedor`. O que o esqueleto não fixou fica assim: os filhos do documento gravam `origem_tabela` com o nome da tabela do ERP (`documento_mercadoria`, `documento_pagamento`, `documento_parcela`, `documento_parcela_pagamento`, `documento_conferencia_caixa`); o movimento de estoque é da fonte `meuerp`, com `origem_tabela = 'mercadoria_estoque_historico'`, o `origem_id` que o teste passa e `documento` vazio; produto sem `descricao` fica com ela vazia; o funcionário entra ativo e sem usuário; o fornecedor é da fonte `meuerp`.
  - **O banco de teste já traz a foto da virada da migração 004** (1.029 produtos, 714 com estoque, 54.660,5 unidades). `inserirVirada` troca a quantidade do produto que já está nela, ou acrescenta um produto novo.

- [ ] **Passo 1: Criar o apoio dos testes das regras**

As funções montam, num banco de teste, os documentos que os testes das regras precisam, sem passar pelo tradutor. Datas vão em texto (`'2026-09-28 10:19:52'`, hora de Fortaleza) e valores em texto (`'59.80'`): nada vira `number`. Cada documento, item, pagamento, parcela, baixa e conferência ganha `origem_id` de um contador; o movimento de estoque recebe o `origem_id` do teste, porque a ordem dele é o que a tarefa 8 testa (`'9999'` contra `'10000'`).

Crie `tradutor/apoio-regras.mts`:

```ts
import type { Cliente } from './banco.mts'

// Monta documentos à mão num banco de teste (criarBancoKaizen), para os testes das regras da Fase 4.
// Datas e horas vão em texto 'AAAA-MM-DD HH:MI:SS' (Fortaleza) e valores em texto ('150.00'): nada vira number.
// Status, forma e sentido são os códigos crus da fonte, traduzidos por kaizen.traducao.
// origem_tabela e origem_id saem sozinhos, de um contador (menos no movimento de estoque, em que a ordem é o teste).

type Fonte = 'meuerp' | 'link'

let contador = 0

function proximo(): string {
  contador += 1
  return String(contador)
}

export async function inserirNatureza(
  c: Cliente,
  n: { fonte?: Fonte; codigo: string; descricao?: string; categoria: string; estoque: boolean; reserva?: boolean; financeiro: boolean; troca?: boolean },
): Promise<number> {
  const { rows } = await c.query<{ id: string }>(
    `insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [n.fonte ?? 'meuerp', n.codigo, n.descricao ?? n.codigo, n.categoria, n.estoque, n.reserva ?? false, n.financeiro, n.troca ?? false],
  )
  return Number(rows[0].id)
}

// status ausente = 'E' (emitido no ERP novo); na Link, passe null e a situação vem pelo modelo.
// fechadoEm ausente = igual a criadoEm; null deixa vazio. codigo ausente = o número do contador.
export async function inserirDocumento(
  c: Cliente,
  d: {
    fonte?: Fonte; modelo: string; status?: string | null; criadoEm: string; fechadoEm?: string | null
    pessoa?: string | null; naturezaId?: number | null; natureza?: string | null; codigo?: string
  },
): Promise<number> {
  const origemId = proximo()
  const { rows } = await c.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, natureza, natureza_id)
     values ($1, 'documento', $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [
      d.fonte ?? 'meuerp', origemId, d.codigo ?? origemId, d.modelo,
      d.status === undefined ? 'E' : d.status,
      d.criadoEm,
      d.fechadoEm === undefined ? d.criadoEm : d.fechadoEm,
      d.pessoa ?? null, d.natureza ?? null, d.naturezaId ?? null,
    ],
  )
  return Number(rows[0].id)
}

export async function inserirItem(
  c: Cliente,
  documentoId: number,
  i: { produto: string; sentido: 'S' | 'E' | 'N'; quantidade: string; valor: string; vendedor?: string | null },
): Promise<void> {
  await c.query(
    `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
     values ($1, 'documento_mercadoria', $2, $3, $4, $5, $6, $7)`,
    [documentoId, proximo(), i.sentido, i.produto, i.quantidade, i.valor, i.vendedor ?? null],
  )
}

export async function inserirPagamento(c: Cliente, documentoId: number, p: { forma: string; valor: string }): Promise<void> {
  await c.query(
    `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
     values ($1, 'documento_pagamento', $2, $3, $4)`,
    [documentoId, proximo(), p.forma, p.valor],
  )
}

export async function inserirParcela(
  c: Cliente,
  documentoId: number,
  p: { lancadoEm: string; vencimento: string; valor: string; status: string },
): Promise<number> {
  const { rows } = await c.query<{ id: string }>(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status)
     values ($1, 'documento_parcela', $2, $3, $4, $5, $6) returning id`,
    [documentoId, proximo(), p.lancadoEm, p.vencimento, p.valor, p.status],
  )
  return Number(rows[0].id)
}

export async function inserirBaixa(
  c: Cliente,
  parcelaId: number,
  b: { pagoEm: string; valor: string; forma?: string | null; status: string },
): Promise<void> {
  await c.query(
    `insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
     values ($1, 'documento_parcela_pagamento', $2, $3, $4, $5, $6)`,
    [parcelaId, proximo(), b.pagoEm, b.valor, b.forma ?? null, b.status],
  )
}

export async function inserirConferencia(
  c: Cliente,
  documentoId: number,
  f: { forma: string; calculado: string; informado: string },
): Promise<void> {
  await c.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, $4, $5)`,
    [documentoId, proximo(), f.forma, f.calculado, f.informado],
  )
}

// O movimento é do ERP novo (a Link não tem histórico de estoque); origemId vem do teste.
export async function inserirMovimento(
  c: Cliente,
  m: { produto: string; momento: string; saldoAntes: string; saldoDepois: string; origemId: string },
): Promise<void> {
  await c.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, momento, saldo_antes, saldo_depois)
     values ('meuerp', 'mercadoria_estoque_historico', $1, $2, $3, $4, $5)`,
    [m.origemId, m.produto, m.momento, m.saldoAntes, m.saldoDepois],
  )
}

// A migração 004 já grava a foto da virada (1.029 produtos): aqui a quantidade do produto é trocada, ou acrescentada.
export async function inserirVirada(c: Cliente, produto: string, quantidade: string): Promise<void> {
  await c.query(
    `insert into kaizen.estoque_virada (produto, quantidade) values ($1, $2)
     on conflict (produto) do update set quantidade = excluded.quantidade`,
    [produto, quantidade],
  )
}

export async function inserirProduto(
  c: Cliente,
  p: { codigo: string; descricao?: string; grupo?: string | null; marca?: string | null; custo?: string | null; ativo?: boolean; fonte?: Fonte },
): Promise<void> {
  await c.query(
    `insert into kaizen.produto (fonte, codigo, descricao, grupo, marca, custo, ativo)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [p.fonte ?? 'meuerp', p.codigo, p.descricao ?? null, p.grupo ?? null, p.marca ?? null, p.custo ?? null, p.ativo ?? true],
  )
}

export async function inserirFuncionario(
  c: Cliente,
  f: { codigo: string; nome: string; tipo: string | null; fonte?: Fonte },
): Promise<void> {
  await c.query(
    `insert into kaizen.funcionario (fonte, codigo, nome, tipo, ativo) values ($1, $2, $3, $4, true)`,
    [f.fonte ?? 'meuerp', f.codigo, f.nome, f.tipo],
  )
}

export async function inserirFornecedor(c: Cliente, produto: string, fornecedor: string): Promise<void> {
  await c.query(
    `insert into kaizen.produto_fornecedor (fonte, produto, fornecedor) values ('meuerp', $1, $2)`,
    [produto, fornecedor],
  )
}
```

- [ ] **Passo 2: Escrever o teste**

O arquivo monta os documentos à mão e confere o papel, o dia, os itens vendidos e devolvidos, os feriados, a meta e as colunas novas de `documento_negocio`. As naturezas do ERP novo levam os flags medidos em 28/09 (spec, seção 2.1): 530 (V, estoque, financeiro), 520 (V, sem estoque, sem financeiro), 500 (V, estoque, reserva, sem financeiro), 5 (C, estoque, financeiro) e 900 (C, estoque, financeiro, e é a troca). As da Link vêm da migração 011. Os códigos de pessoa, produto e vendedor são do cadastro real: 484 é um cliente, 999007 o Consumidor Final, 60 e 1436 são produtos, 1 é Igor e 999005 é Daniele.

Crie `tradutor/papel.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import { inserirDocumento, inserirItem, inserirNatureza } from './apoio-regras.mts'

// A migração 012: o papel de cada documento (documento_papel), os itens vendidos e devolvidos (venda_item) e as
// tabelas do que o dono digita. Os documentos são montados à mão; cada teste só olha os documentos que ele gravou.
let banco: BancoTeste
let c: Cliente
const natureza: Record<string, number> = {}

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo usadas até 28/09, com os flags de lá (spec, seção 2.1).
  natureza['530'] = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza['520'] = await inserirNatureza(c, { codigo: '520', descricao: 'ORÇAMENTO', categoria: 'V', estoque: false, financeiro: false })
  natureza['500'] = await inserirNatureza(c, { codigo: '500', descricao: 'PRE-VENDA', categoria: 'V', estoque: true, reserva: true, financeiro: false })
  natureza['5'] = await inserirNatureza(c, { codigo: '5', categoria: 'C', estoque: true, financeiro: true })
  // A troca é de categoria C, como a compra: quem diz que ela é a troca é a configuração do ERP.
  natureza['900'] = await inserirNatureza(c, { codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, financeiro: true, troca: true })
  // As três naturezas da Link vêm da migração 011.
  const { rows } = await c.query<{ codigo: string; id: string }>(`select codigo, id from kaizen.natureza where fonte = 'link'`)
  for (const linha of rows) natureza[`link:${linha.codigo}`] = Number(linha.id)
})

after(async () => {
  await banco?.fechar()
})

// O papel de cada documento pelo nome que o teste deu a ele; quem não está na visão sai '(fora da visão)'.
async function papelDe(documentos: Record<string, number>): Promise<Record<string, string | null>> {
  const { rows } = await c.query<{ id: string; papel: string | null }>(
    'select id, papel from kaizen.documento_papel where id = any($1::bigint[])',
    [Object.values(documentos)],
  )
  const papel = new Map(rows.map((linha) => [Number(linha.id), linha.papel]))
  return Object.fromEntries(
    Object.entries(documentos).map(([nome, id]) => [nome, papel.has(id) ? (papel.get(id) ?? null) : '(fora da visão)']),
  )
}

test('com natureza, o papel vem dela: pedido 530 é venda, orçamento 520 e pré-venda 500 são outro, troca 900 é troca, nota 5 é compra', async () => {
  const documentos = {
    pedido: await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 10:19:52' }),
    orcamento: await inserirDocumento(c, { modelo: 'OC', natureza: '520', naturezaId: natureza['520'], criadoEm: '2026-09-28 10:30:00' }),
    preVenda: await inserirDocumento(c, { modelo: 'PV', natureza: '500', naturezaId: natureza['500'], criadoEm: '2026-09-28 10:40:00' }),
    troca: await inserirDocumento(c, { modelo: 'TM', natureza: '900', naturezaId: natureza['900'], criadoEm: '2026-09-28 11:00:00' }),
    nota: await inserirDocumento(c, { modelo: '55', natureza: '5', naturezaId: natureza['5'], criadoEm: '2026-09-28 11:10:00' }),
  }
  // Orçamento e pré-venda são categoria V, mas não mexem no financeiro: por isso não são venda.
  assert.deepEqual(await papelDe(documentos), {
    pedido: 'venda', orcamento: 'outro', preVenda: 'outro', troca: 'troca', nota: 'compra',
  })
})

test('sem natureza, o papel é o tipo traduzido: conta a pagar, sangria (RS e RT), suprimentos, fechamento e o pedido antigo', async () => {
  const documentos = {
    conta: await inserirDocumento(c, { modelo: 'CP', criadoEm: '2026-09-28 00:00:00' }),
    sangriaRS: await inserirDocumento(c, { modelo: 'RS', criadoEm: '2026-09-28 12:00:00' }),
    sangriaRT: await inserirDocumento(c, { modelo: 'RT', criadoEm: '2026-09-28 12:05:00' }),
    suprimento: await inserirDocumento(c, { modelo: 'SF', criadoEm: '2026-09-28 08:00:00' }),
    suprimentoAdicional: await inserirDocumento(c, { modelo: 'SD', criadoEm: '2026-09-28 13:00:00' }),
    fechamento: await inserirDocumento(c, { modelo: 'FC', criadoEm: '2026-09-28 17:55:09' }),
    // Pedido gravado antes da Fase 4, ainda sem natureza: até a leitura da noite regravá-lo, não conta como venda.
    pedidoAntigo: await inserirDocumento(c, { modelo: 'PA', criadoEm: '2026-09-28 09:05:00' }),
  }
  assert.deepEqual(await papelDe(documentos), {
    conta: 'conta_pagar',
    sangriaRS: 'sangria',
    sangriaRT: 'sangria',
    suprimento: 'suprimento',
    suprimentoAdicional: 'suprimento_adicional',
    fechamento: 'fechamento_caixa',
    pedidoAntigo: 'pedido',
  })
})

test('o pedido cancelado (status C) está em documento_negocio, mas fica fora de documento_papel', async () => {
  const cancelado = await inserirDocumento(c, {
    modelo: 'PA', status: 'C', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 14:00:00',
  })
  const { rows } = await c.query('select tipo, situacao from kaizen.documento_negocio where id = $1', [cancelado])
  assert.deepEqual(rows, [{ tipo: 'pedido', situacao: 'cancelado' }])
  assert.deepEqual(await papelDe({ cancelado }), { cancelado: '(fora da visão)' })
})

test('na Link, o pedido é venda, o orçamento é outro e a nota é compra (naturezas da 011); a conta, sem natureza, é conta_pagar', async () => {
  const documentos = {
    // Venda com o caixa ativo: status 'false'.
    pedido: await inserirDocumento(c, {
      fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'pedido', naturezaId: natureza['link:pedido'],
      criadoEm: '2026-06-15 16:20:00', fechadoEm: '2026-06-15 16:25:00',
    }),
    orcamento: await inserirDocumento(c, {
      fonte: 'link', modelo: 'P/false', status: null, natureza: 'orcamento', naturezaId: natureza['link:orcamento'],
      criadoEm: '2026-06-15 11:00:00', fechadoEm: null,
    }),
    nota: await inserirDocumento(c, {
      fonte: 'link', modelo: '55', status: null, natureza: 'nota_entrada', naturezaId: natureza['link:nota_entrada'],
      criadoEm: '2026-08-26 09:00:00',
    }),
    conta: await inserirDocumento(c, { fonte: 'link', modelo: '2.1.2.02', status: null, criadoEm: '2026-09-10 00:00:00', fechadoEm: null }),
  }
  assert.deepEqual(await papelDe(documentos), { pedido: 'venda', orcamento: 'outro', nota: 'compra', conta: 'conta_pagar' })
})

test('o dia do documento é o do fechamento, ou o da criação quando o fechamento está vazio', async () => {
  const fechadoNoDiaSeguinte = await inserirDocumento(c, {
    modelo: 'PA', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 18:40:00', fechadoEm: '2026-09-29 08:03:00',
  })
  const semFechamento = await inserirDocumento(c, {
    fonte: 'link', modelo: '2.1.2.02', status: null, criadoEm: '2026-09-10 00:00:00', fechadoEm: null,
  })
  const { rows } = await c.query(
    'select fonte, dia, papel from kaizen.documento_papel where id = any($1::bigint[]) order by id',
    [[fechadoNoDiaSeguinte, semFechamento]],
  )
  assert.deepEqual(rows, [
    { fonte: 'meuerp', dia: '2026-09-29', papel: 'venda' },
    { fonte: 'link', dia: '2026-09-10', papel: 'conta_pagar' },
  ])
})

test('venda_item: saída da venda é vendido; entrada da venda (Link) e da troca (ERP novo) é devolvido; o resto fica fora', async () => {
  // Pedido criado às 9h58 e fechado às 10h02: a hora da venda é a do fechamento, 10.
  const venda = await inserirDocumento(c, {
    modelo: 'PA', natureza: '530', naturezaId: natureza['530'], pessoa: '484',
    criadoEm: '2026-09-28 09:58:00', fechadoEm: '2026-09-28 10:02:00',
  })
  await inserirItem(c, venda, { produto: '60', sentido: 'S', quantidade: '2', valor: '59.80', vendedor: '1' })
  await inserirItem(c, venda, { produto: '1436', sentido: 'N', quantidade: '1', valor: '120.00', vendedor: '1' }) // fora: sentido N
  await inserirItem(c, venda, { produto: '1436', sentido: 'S', quantidade: '1', valor: '120.00' }) // fora: sem vendedor

  // Na Link, a devolução é item de entrada dentro da própria venda.
  const vendaLink = await inserirDocumento(c, {
    fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'pedido', naturezaId: natureza['link:pedido'], pessoa: '999007',
    criadoEm: '2026-06-15 16:20:00', fechadoEm: '2026-06-15 16:25:00',
  })
  await inserirItem(c, vendaLink, { produto: '60', sentido: 'S', quantidade: '1', valor: '29.90', vendedor: '999005' })
  await inserirItem(c, vendaLink, { produto: '1436', sentido: 'E', quantidade: '1', valor: '118.50', vendedor: '999005' })

  // No ERP novo, a devolução é item de entrada da troca.
  const troca = await inserirDocumento(c, {
    modelo: 'TM', natureza: '900', naturezaId: natureza['900'], pessoa: '484', criadoEm: '2026-09-29 11:30:00',
  })
  await inserirItem(c, troca, { produto: '60', sentido: 'E', quantidade: '1', valor: '29.90', vendedor: '999005' })

  // Fora: o orçamento (papel outro) e o pedido cancelado (fora de documento_papel).
  const orcamento = await inserirDocumento(c, { modelo: 'OC', natureza: '520', naturezaId: natureza['520'], criadoEm: '2026-09-28 15:00:00' })
  await inserirItem(c, orcamento, { produto: '60', sentido: 'S', quantidade: '1', valor: '29.90', vendedor: '1' })
  const cancelado = await inserirDocumento(c, {
    modelo: 'PA', status: 'C', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 15:10:00',
  })
  await inserirItem(c, cancelado, { produto: '60', sentido: 'S', quantidade: '3', valor: '89.70', vendedor: '1' })

  const { rows } = await c.query(
    `select documento, fonte, dia, hora, pessoa, produto, vendedor, quantidade, valor, sentido
     from kaizen.venda_item where documento = any($1::bigint[]) order by documento, produto`,
    [[venda, vendaLink, troca, orcamento, cancelado]],
  )
  assert.deepEqual(rows, [
    {
      documento: String(venda), fonte: 'meuerp', dia: '2026-09-28', hora: 10, pessoa: '484',
      produto: '60', vendedor: '1', quantidade: '2', valor: '59.80', sentido: 'vendido',
    },
    {
      documento: String(vendaLink), fonte: 'link', dia: '2026-06-15', hora: 16, pessoa: '999007',
      produto: '1436', vendedor: '999005', quantidade: '1', valor: '118.50', sentido: 'devolvido',
    },
    {
      documento: String(vendaLink), fonte: 'link', dia: '2026-06-15', hora: 16, pessoa: '999007',
      produto: '60', vendedor: '999005', quantidade: '1', valor: '29.90', sentido: 'vendido',
    },
    {
      documento: String(troca), fonte: 'meuerp', dia: '2026-09-29', hora: 11, pessoa: '484',
      produto: '60', vendedor: '999005', quantidade: '1', valor: '29.90', sentido: 'devolvido',
    },
  ])
})

test('a migração grava como feriado os 3 dias de segunda a sábado sem expediente desde abril', async () => {
  const { rows } = await c.query(
    'select data, extract(isodow from data)::int as dia_da_semana, descricao from kaizen.feriado order by data',
  )
  // dia_da_semana: 1 = segunda … 6 = sábado.
  assert.deepEqual(rows, [
    { data: '2026-05-01', dia_da_semana: 5, descricao: 'Dia do Trabalho; a loja não abriu' },
    { data: '2026-09-07', dia_da_semana: 1, descricao: 'Independência; a loja não abriu' },
    { data: '2026-09-26', dia_da_semana: 6, descricao: 'pausa da virada entre a Link e o ERP novo (inventário)' },
  ])
})

test('a meta da loja é uma por mês: a segunda de outubro é recusada pelo índice, e a de um vendedor no mesmo mês entra', async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', null, '60000.00')`)
  await assert.rejects(
    c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', null, '65000.00')`),
    (erro) => {
      const { code, constraint } = erro as { code?: string; constraint?: string }
      assert.equal(code, '23505') // chave repetida
      assert.equal(constraint, 'meta_mes_vendedor')
      return true
    },
  )
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', '1', '30000.00')`)
  const { rows } = await c.query('select mes, vendedor, valor from kaizen.meta order by id')
  assert.deepEqual(rows, [
    { mes: '2026-10-01', vendedor: null, valor: '60000.00' },
    { mes: '2026-10-01', vendedor: '1', valor: '30000.00' },
  ])
})

test('documento_negocio mantém as 18 colunas de antes, na mesma ordem, e ganha no fim as da natureza, vazias sem natureza', async () => {
  const colunas = await c.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'kaizen' and table_name = 'documento_negocio' order by ordinal_position`,
  )
  assert.deepEqual(colunas.rows.map((linha) => linha.column_name), [
    'id', 'fonte', 'origem_tabela', 'origem_id', 'codigo', 'modelo', 'tipo', 'status', 'situacao', 'movimento', 'financeiro',
    'criado_em', 'fechado_em', 'pessoa', 'turno_caixa', 'turno_usuario', 'turno_numero', 'visto_em',
    'natureza', 'natureza_id', 'categoria', 'mexe_estoque', 'mexe_financeiro', 'troca',
  ])
  const comNatureza = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 16:00:00' })
  const semNatureza = await inserirDocumento(c, { modelo: 'SF', criadoEm: '2026-09-28 16:05:00' })
  const { rows } = await c.query(
    `select tipo, natureza, natureza_id, categoria, mexe_estoque, mexe_financeiro, troca
     from kaizen.documento_negocio where id = any($1::bigint[]) order by id`,
    [[comNatureza, semNatureza]],
  )
  assert.deepEqual(rows, [
    {
      tipo: 'pedido', natureza: '530', natureza_id: String(natureza['530']), categoria: 'V',
      mexe_estoque: true, mexe_financeiro: true, troca: false,
    },
    {
      tipo: 'suprimento', natureza: null, natureza_id: null, categoria: null,
      mexe_estoque: null, mexe_financeiro: null, troca: null,
    },
  ])
})
```

Por que cada valor é o certo, pela spec:
- **Papel com natureza** (decisão 8, seção 6): a troca vem antes de tudo (a 900 é de categoria C e, sem isso, seria compra); venda é categoria V **e** mexe no financeiro (a 530 sim; a 520 e a 500 não, e ficam `outro`); compra é categoria C e mexe no estoque (a 5, e a `nota_entrada` da Link).
- **Papel sem natureza**: o tipo traduzido pela migração 002 (`CP` → `conta_pagar`, `RS` e `RT` → `sangria`, `SF` → `suprimento`, `SD` → `suprimento_adicional`, `FC` → `fechamento_caixa`, `PA` → `pedido`) e pela 006 na Link (`2.1.2.02` → `conta_pagar`).
- **Dia**: `coalesce(fechado_em, criado_em)::date`; o pedido criado em 28/09 às 18h40 e fechado em 29/09 às 8h03 é do dia 29.
- **venda_item**: dos 10 itens gravados, entram 4. O item S com vendedor do pedido é vendido; o item S da venda da Link é vendido; o item E da venda da Link e o item E da troca são devolvidos. Ficam fora o item N, o item sem vendedor, o item do orçamento (papel `outro`) e o do pedido cancelado (fora de `documento_papel`). A hora é a do fechamento: o pedido criado às 9h58 e fechado às 10h02 é da hora 10.
- **Feriados** (decisão 11): 01/05/2026 é sexta (5), 07/09/2026 é segunda (1), 26/09/2026 é sábado (6).
- **Meta** (seção 7): o índice único em `(mes, coalesce(vendedor, ''))` recusa a segunda meta da loja em outubro com o código `23505` do Postgres (chave repetida), e aceita a do vendedor 1 no mesmo mês.

- [ ] **Passo 3: Rodar o teste e ver falhar**

Rode: `node --test tradutor/papel.test.mts`
Saída esperada: falha, com `ℹ tests 9`, `ℹ pass 0` e `ℹ fail 9`:
```
✖ com natureza, o papel vem dela: pedido 530 é venda, orçamento 520 e pré-venda 500 são outro, troca 900 é troca, nota 5 é compra
✖ sem natureza, o papel é o tipo traduzido: conta a pagar, sangria (RS e RT), suprimentos, fechamento e o pedido antigo
✖ o pedido cancelado (status C) está em documento_negocio, mas fica fora de documento_papel
✖ na Link, o pedido é venda, o orçamento é outro e a nota é compra (naturezas da 011); a conta, sem natureza, é conta_pagar
✖ o dia do documento é o do fechamento, ou o da criação quando o fechamento está vazio
✖ venda_item: saída da venda é vendido; entrada da venda (Link) e da troca (ERP novo) é devolvido; o resto fica fora
✖ a migração grava como feriado os 3 dias de segunda a sábado sem expediente desde abril
✖ a meta da loja é uma por mês: a segunda de outubro é recusada pelo índice, e a de um vendedor no mesmo mês entra
✖ documento_negocio mantém as 18 colunas de antes, na mesma ordem, e ganha no fim as da natureza, vazias sem natureza
```
com estes motivos, cada um porque a migração 012 ainda não existe:
- do 1º ao 5º, `error: relation "kaizen.documento_papel" does not exist` (o 3º passa pela primeira conferência, em `documento_negocio`, e cai na segunda);
- o 6º, `error: relation "kaizen.venda_item" does not exist`;
- o 7º, `error: relation "kaizen.feriado" does not exist`;
- o 8º, `error: relation "kaizen.meta" does not exist`;
- o 9º, `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal`, com a lista de colunas terminando em `'visto_em'` (faltam as 6 da natureza).

Se a falha for outra (`relation "kaizen.natureza" does not exist`, ou `column "natureza" of relation "documento" does not exist`), as migrações 010 e 011 das tarefas 4 e 5 não estão na branch: pare e avise o orquestrador.

- [ ] **Passo 4: Escrever a migração 012**

O texto é o do esqueleto do plano (seção "Interfaces compartilhadas"), ao pé da letra. Crie `sql/migracoes/012_regras.sql`:

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

Confira a cópia: `sha256sum sql/migracoes/012_regras.sql` dá `6392049bfab6e9af66f1a0a2b2a39bbfe0449c4394561674d95baa27b98bc7f4`. Se não bater, a diferença mais comum é a quebra de linha: o arquivo tem de estar em LF (`grep -c $'\r' sql/migracoes/012_regras.sql` dá `0`) e terminar com `;` e uma quebra de linha. Corrija copiando o bloco de novo; não mude o conteúdo para o teste passar.

- [ ] **Passo 5: Rodar o teste e ver passar**

Rode: `node --test tradutor/papel.test.mts`
Saída esperada: passa, com `ℹ tests 9`, `ℹ pass 9`, `ℹ fail 0` e:
```
✔ com natureza, o papel vem dela: pedido 530 é venda, orçamento 520 e pré-venda 500 são outro, troca 900 é troca, nota 5 é compra
✔ sem natureza, o papel é o tipo traduzido: conta a pagar, sangria (RS e RT), suprimentos, fechamento e o pedido antigo
✔ o pedido cancelado (status C) está em documento_negocio, mas fica fora de documento_papel
✔ na Link, o pedido é venda, o orçamento é outro e a nota é compra (naturezas da 011); a conta, sem natureza, é conta_pagar
✔ o dia do documento é o do fechamento, ou o da criação quando o fechamento está vazio
✔ venda_item: saída da venda é vendido; entrada da venda (Link) e da troca (ERP novo) é devolvido; o resto fica fora
✔ a migração grava como feriado os 3 dias de segunda a sábado sem expediente desde abril
✔ a meta da loja é uma por mês: a segunda de outubro é recusada pelo índice, e a de um vendedor no mesmo mês entra
✔ documento_negocio mantém as 18 colunas de antes, na mesma ordem, e ganha no fim as da natureza, vazias sem natureza
```

- [ ] **Passo 6: Conferir que os testes antigos que leem `documento_negocio` continuam passando**

A 012 troca a visão `documento_negocio` por uma com 6 colunas a mais no fim. Com todas as migrações aplicadas, leem a visão: a conferência do dono (`sql/kaizen/conferencia-dono.sql`), a ficha da venda (`sql/kaizen/ficha-venda.sql`), a comparação e o resumo da Link (`sql/link/comparar.sql`, `sql/link/resumo.sql`) e os testes da Link que conferem a tradução. Os testes de `tradutor/traducao-operacao-real.test.mts` e `tradutor/link-migracao.test.mts` montam o banco só até a 009 e a 007 e não veem a 012; eles rodam no passo 8.

Rode: `node --test tradutor/conferencia-dono.test.mts tradutor/link-vendas.test.mts tradutor/link-caixa.test.mts tradutor/link-contas.test.mts tradutor/link-comando.test.mts tradutor/migracoes.test.mts`
Saída esperada: passa, com `ℹ fail 0` e `ℹ pass` igual a `ℹ tests`. No início da fase eram 41 testes nesses 6 arquivos (5 + 11 + 3 + 4 + 7 + 11); se uma tarefa anterior acrescentou testes a algum deles, o total é maior, e todos passam.

- [ ] **Passo 7: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 9 testes, todos em `tradutor/papel.test.mts`. O arquivo fica com uma única linha:

```text
367
```

- [ ] **Passo 8: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; nenhum `✖`; última linha `rodou 367 testes, esperados 367`.

- [ ] **Passo 9: Commit**

Antes do `EOF`, depois de uma linha em branco, acrescente a linha de atribuição (`Co-Authored-By: …`) que o sistema lhe dá: o plano não fixa nome de modelo.

```bash
git add sql/migracoes/012_regras.sql tradutor/apoio-regras.mts tradutor/papel.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Regras: o papel de cada documento, os itens vendidos e devolvidos, e meta, feriado e saldo

A migração 012 diz, num lugar só, o que cada documento é para as
regras. Com natureza, o pedido 530 é venda, o orçamento 520 e a
pré-venda 500 são "outro" (não mexem no financeiro), a troca 900 é
troca e a nota 5 é compra. Sem natureza, vale o tipo: conta a pagar,
sangria, suprimento, fechamento de caixa. Na Link, pelas naturezas da
011, o pedido é venda, o orçamento é outro e a nota é compra. O
documento cancelado fica de fora, e o pedido gravado antes da Fase 4,
sem natureza, ainda não conta como venda.

A visão venda_item junta os itens com vendedor das vendas e das
trocas: a saída é vendido e a entrada é devolvido, nas duas fontes,
com o dia e a hora da venda.

O dono ganha as tabelas de meta (uma por mês para a loja e para cada
vendedor), feriado e saldo do banco; 01/05, 07/09 e 26/09 já vêm
gravados como feriado.
Testes: rodou 367, esperados 367.
EOF
```
Saída esperada: o `git add` pode avisar `LF will be replaced by CRLF` para `testes-esperados.txt` (é só aviso); o hook roda `npm run verificar` e termina com `rodou 367 testes, esperados 367`; o commit sai.

DECISÃO:
- **A migração 012 é a do esqueleto, sem mudança.** Não achei erro nela: aplicada depois da 010 e da 011, o `create or replace view` aceita as 6 colunas novas no fim de `documento_negocio`, e os 41 testes antigos que leem a visão com todas as migrações passam.
- **`inserirVirada` grava com `on conflict (produto) do update`.** A migração 004 já põe no banco de teste a foto da virada com os 1.029 produtos reais; um `insert` simples falharia em qualquer produto real (o 60, o 1708 e o 5336 dos exemplos da spec). Quem monta estoque na tarefa 8 precisa saber que os outros produtos da foto continuam lá.
- **Os padrões que o esqueleto não fixou** (o `origem_tabela` dos filhos, a fonte e a tabela do movimento de estoque, a descrição vazia do produto, o funcionário ativo sem usuário, o fornecedor do `meuerp`) ficaram na forma mais simples e estão escritos no bloco "Produces". Todas as funções do apoio foram rodadas uma vez, fora dos testes, e gravam o que dizem.
- **O pedido da Link no teste leva `status: 'false'`**, e não `null` como sugere o esqueleto: é o valor que o tradutor da Link grava para a venda com o caixa ativo (`sql/link/vendas.sql`). O orçamento, a nota e a conta da Link levam `null`, como o tradutor grava. Os dois caminhos dão `emitido`.
- **O teste da venda_item tem dois casos além da lista da tarefa**: o item do orçamento e o do pedido cancelado, ambos fora. Eles provam as duas condições da visão que a lista não cobre (papel `venda` ou `troca`, e só documento emitido), sem código a mais.
- **O teste das colunas de `documento_negocio`** confere a frase da spec (seção 6) "ganha, no fim, as colunas da natureza": as 24 colunas na ordem, e as novas vazias sem natureza.

---

### Task 7: as regras de vendas

**Ajustes do orquestrador (revisão do plano inteiro, 29/09) — valem sobre o texto abaixo, e o revisor confere contra eles:**
- `percentual_meta` com meta e sem venda no mês sai 0, não vazio: `round(coalesce(r.realizado, 0) / nullif(lm.valor, 0), 4)` (o divisor é a meta; a spec só esvazia sem divisor). Acrescente ao teste do mês sem venda um caso com meta da loja num dia útil: `percentual_meta` 0 e `ritmo` 0. Se isso mudar a contagem de testes desta tarefa, diga no relatório (o orquestrador reconta o total).
- A soma de `vendedores[].realizado_mes` com `outros.realizado_mes` fica como está (cada parte arredondada por si): pode diferir do `mes.realizado` em até 1 centavo por parte. A spec foi ajustada para dizer isso. Não calcule `outros` por diferença.

**O que esta tarefa entrega, em resultado:** a primeira das três perguntas passa a ter resposta. Para qualquer dia desde abril, a regra de vendas diz, em JSON: o vendido, as devoluções, o realizado, o número de vendas, o ticket médio e os itens por venda do dia e do mês até o dia; a meta da loja, o percentual da meta, os dias úteis do mês e os já decorridos, o ritmo e a projeção do mês; a mesma conta para cada vendedor do tipo V do ERP novo (com meta, ritmo, clientes atendidos e o mix por grupo de produto) e uma linha "outros" para quem não é vendedor; e as vendas e o realizado do mês por hora e por dia da semana. Com os números do teste: em 15/06/2026, com meta de R$ 1.000,00 e R$ 384,60 realizados em 13 de 26 dias úteis, o ritmo é 0,7692. Uma venda com itens de dois vendedores conta uma vez na loja e uma vez para cada um. A troca do ERP novo e a venda só de devolução da Link entram nas devoluções e não contam como venda. O Consumidor Final não é cliente atendido. Feriado não é dia útil, nem no ritmo nem na média da projeção. Dia sem venda sai com zeros e com ticket, itens por venda, meta e ritmo vazios, sem erro. Na Link falsa, o dia 17/06 (venda 1992) tem R$ 150,00 vendidos, e o orçamento de R$ 8.580,00 do mesmo mês não conta. Nasce também `tradutor/indicadores.mts`, com a lista das perguntas e a função que lê e roda uma regra (a tarefa 10 acrescenta o cálculo da rotina). São 12 testes novos, num commit.

**Files:**
- Create: `sql/regras/vendas.sql`
- Create: `tradutor/indicadores.mts`
- Test: `tradutor/regras-vendas.test.mts`
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes:
  - Da migração `012_regras.sql` (tarefa 6): `kaizen.venda_item (documento bigint, fonte, dia date, hora int, pessoa, produto, vendedor, quantidade, valor numeric, sentido 'vendido'|'devolvido')`, `kaizen.documento_papel (id, fonte, dia, papel)`, `kaizen.meta (mes date dia 1, vendedor text vazio = loja, valor numeric)` e `kaizen.feriado (data, descricao)`, que já traz 2026-05-01, 2026-09-07 e 2026-09-26.
  - Das migrações `010_natureza.sql` e `011_natureza_link.sql` (tarefas 4 e 5): `kaizen.natureza` e `documento.natureza`/`natureza_id`; e, da tarefa 5, `sql/link/gravar.sql` gravando a natureza nos documentos da Link (sem isso o pedido da Link não é venda e os dois testes da Link falsa saem com vendido 0).
  - Da Fase 2: `kaizen.funcionario (fonte, codigo, nome, tipo)` e `kaizen.produto (fonte, codigo, grupo)`.
  - `tradutor/apoio-regras.mts` (tarefa 6): `inserirNatureza`, `inserirDocumento`, `inserirItem`, `inserirFuncionario`, `inserirProduto`, com as assinaturas e os padrões do esqueleto.
  - `criarBancoKaizen(): Promise<BancoTeste>` (`tradutor/apoio-teste.mts`); `criarLinkFalsa(banco)`, `carregarCasosLink(falsa, cliente)` (`tradutor/link-falsa.mts`) e `traduzirLink(cliente)` (`tradutor/link.mts`), da Fase 3; `type Cliente` (`tradutor/banco.mts`).
- Produces (usado pelas tarefas 8 a 10):
  - `tradutor/indicadores.mts`: `export type Pergunta = 'vendas' | 'compras' | 'financeiro'`; `export const PERGUNTAS: Pergunta[] = ['vendas', 'compras', 'financeiro']`; `export function lerRegra(pergunta: Pergunta): string` (o texto de `sql/regras/<pergunta>.sql`); `export async function responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any>` (roda `select r.resposta from (<regra>) r` com `[dia]` e devolve `rows[0].resposta`, o objeto que o `pg` monta do jsonb: os números chegam como `number`). Os testes das tarefas 8 e 9 chamam `responder(c, 'compras', dia)` e `responder(c, 'financeiro', dia)`; a tarefa 10 acrescenta `calcularRespostas` e `diasDaHistoria` a este arquivo.
  - `sql/regras/vendas.sql`: um único `select`, com o dia em `$1` (sempre escrito `$1::date`), que devolve uma linha com a coluna `resposta` (jsonb). O arquivo termina com `) as resposta` e uma quebra de linha, sem `;` e sem comentário na última linha: dá para embrulhá-lo em `(…) r`, como a tarefa 10 grava. As chaves: `dia` {`vendido`, `devolucoes`, `realizado`, `vendas`, `ticket_medio`, `itens_por_venda`}; `mes` {os mesmos seis, `meta`, `percentual_meta`, `dias_uteis`, `dias_uteis_decorridos`, `ritmo`, `projecao`}; `vendedores` [{`codigo`, `nome`, `realizado_dia`, `realizado_mes`, `vendas_mes`, `meta`, `ritmo`, `clientes_atendidos`, `mix` [{`grupo`, `realizado`}]}]; `outros` {`realizado_dia`, `realizado_mes`, `vendas_mes`}; `por_hora` [{`hora`, `vendas`, `realizado`}]; `por_dia_da_semana` [{`dia_da_semana`, `vendas`, `realizado`}]. Dinheiro sai como número do JSON com 2 casas (`round` só no total); `percentual_meta`, `ritmo` e `itens_por_venda` com 4 casas; `meta` como foi digitada; contagens inteiras; sem divisor, `null`.

- [ ] **Passo 1: Escrever o teste**

O arquivo usa dois bancos de teste. No primeiro, os documentos são montados à mão com o apoio da tarefa 6, e cada teste grava numa transação que ele mesmo desfaz no fim (`isolado`): a projeção olha a história inteira, e a venda de um teste mudaria a média do outro. O `before` grava, fora das transações, as naturezas 530 (venda) e 900 (troca) com os flags medidos no ERP (spec, seção 2.1), o cadastro dos três funcionários (Igor e Daniele do tipo V, Erleide do tipo N, como no ERP em 28/09) e o grupo de dois produtos reais (60 é FERRAMENTAS, 1436 é COLAS, no cadastro do banco do PC). O segundo banco tem a Link falsa da Fase 3 traduzida pelo comando da Link. As contas de cada valor esperado estão nos comentários.

Crie `tradutor/regras-vendas.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import { inserirDocumento, inserirFuncionario, inserirItem, inserirNatureza, inserirProduto } from './apoio-regras.mts'
import { carregarCasosLink, criarLinkFalsa } from './link-falsa.mts'
import type { LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'
import { responder } from './indicadores.mts'

// A regra de vendas (sql/regras/vendas.sql, spec da Fase 4, seção 8.2). Dois bancos: um com documentos montados à mão,
// em que cada teste grava numa transação desfeita no fim (um teste não vê os documentos do outro), e um com a Link
// falsa da Fase 3 traduzida. O JSON chega pelo pg: os números viram number do JavaScript (150.00 chega 150).
let banco: BancoTeste
let c: Cliente
let bancoLink: BancoTeste
let falsa: LinkFalsa
let natureza530 = 0
let natureza900 = 0

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo (spec, seção 2.1): 530 é venda (V, mexe no financeiro); 900 é a troca da configuração.
  natureza530 = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza900 = await inserirNatureza(c, {
    codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, financeiro: true, troca: true,
  })
  // O cadastro do ERP novo: Igor e Daniele são do tipo vendedor (V); Erleide não (N).
  await inserirFuncionario(c, { codigo: '1', nome: 'Igor Mendes Ribeiro', tipo: 'V' })
  await inserirFuncionario(c, { codigo: '999005', nome: 'Daniele Fonseca Lima', tipo: 'V' })
  await inserirFuncionario(c, { codigo: '999006', nome: 'Erleide Alves Pereira', tipo: 'N' })
  await inserirProduto(c, { codigo: '60', grupo: 'FERRAMENTAS' })
  await inserirProduto(c, { codigo: '1436', grupo: 'COLAS' })

  bancoLink = await criarBancoKaizen()
  falsa = await criarLinkFalsa(bancoLink)
  await carregarCasosLink(falsa, bancoLink.cliente)
  await traduzirLink(bancoLink.cliente)
})

after(async () => {
  await falsa?.fechar()
  await bancoLink?.fechar()
  await banco?.fechar()
})

// Grava os documentos do teste numa transação e a desfaz no fim.
async function isolado(fazer: () => Promise<void>): Promise<void> {
  await c.query('begin')
  try {
    await fazer()
  } finally {
    await c.query('rollback')
  }
}

type Item = { produto: string; valor: string; vendedor: string; sentido?: 'S' | 'E' }

// Uma venda do ERP novo: pedido de natureza 530, fechado em `quando`, com os itens vendidos (saída), de quantidade 1.
async function venda(quando: string, pessoa: string, itens: Item[]): Promise<void> {
  const id = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza530, pessoa, criadoEm: quando })
  for (const item of itens) await inserirItem(c, id, { ...item, sentido: item.sentido ?? 'S', quantidade: '1' })
}

// Uma troca do ERP novo: natureza 900; os itens são devolvidos (entrada), menos os marcados com sentido 'S'.
async function troca(quando: string, pessoa: string, itens: Item[]): Promise<void> {
  const id = await inserirDocumento(c, { modelo: 'TM', natureza: '900', naturezaId: natureza900, pessoa, criadoEm: quando })
  for (const item of itens) await inserirItem(c, id, { ...item, sentido: item.sentido ?? 'E', quantidade: '1' })
}

// Junho de 2026, calculado em 15/06 (segunda-feira). Igor tem meta de R$ 600,00; Daniele não tem meta.
async function montarJunho(): Promise<void> {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-06-01', '1', 600.00)`)
  await venda('2026-05-29 10:00:00', '484', [{ produto: '60', valor: '1000.00', vendedor: '999005' }]) // fora: mês anterior
  await venda('2026-06-02 10:15:00', '484', [
    { produto: '60', valor: '59.80', vendedor: '1' },
    { produto: '1436', valor: '140.20', vendedor: '999005' },
  ])
  await troca('2026-06-10 11:20:00', '484', [{ produto: '60', valor: '29.90', vendedor: '1' }])
  await venda('2026-06-15 09:30:00', '999007', [
    { produto: '60', valor: '29.90', vendedor: '999005' },
    { produto: '7777', valor: '35.00', vendedor: '999005' }, // produto fora do cadastro: sem grupo
  ])
  await venda('2026-06-15 16:45:00', '484', [
    { produto: '1436', valor: '50.00', vendedor: '999006' }, // Erleide, tipo N
    { produto: '1436', valor: '70.10', vendedor: '1' },
  ])
  await venda('2026-06-16 10:00:00', '484', [{ produto: '60', valor: '1000.00', vendedor: '1' }]) // fora: depois do dia
}

const centavos = (reais: number): number => Math.round(reais * 100)

test('o ritmo do exemplo da spec: 15/06/2026, meta R$ 1.000,00, realizado R$ 384,60, 13 de 26 dias úteis → 0,7692', () => isolado(async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-06-01', null, 1000.00)`)
  await venda('2026-06-02 10:15:00', '484', [{ produto: '60', valor: '200.00', vendedor: '1' }])
  await venda('2026-06-15 09:30:00', '484', [{ produto: '1436', valor: '184.60', vendedor: '999005' }])
  const { mes } = await responder(c, 'vendas', '2026-06-15')
  // Junho de 2026 começa numa segunda e não tem feriado: 30 dias − 4 domingos = 26 dias úteis; de 01 a 15, 13.
  // (384,60 ÷ 1.000,00) ÷ (13 ÷ 26) = 0,3846 ÷ 0,5 = 0,7692.
  assert.deepEqual(
    {
      realizado: mes.realizado, meta: mes.meta, percentual_meta: mes.percentual_meta,
      dias_uteis: mes.dias_uteis, dias_uteis_decorridos: mes.dias_uteis_decorridos, ritmo: mes.ritmo,
    },
    { realizado: 384.6, meta: 1000, percentual_meta: 0.3846, dias_uteis: 26, dias_uteis_decorridos: 13, ritmo: 0.7692 },
  )
}))

test('a projeção: realizado do mês até a véspera + a média dos últimos 8 dias úteis do mesmo dia da semana, desde a primeira venda', () => isolado(async () => {
  // Segundas 20/04 e 27/04 com R$ 1.000,00; as 8 segundas seguintes, de 04/05 a 22/06, com R$ 100,00; a terça 23/06 com R$ 80,00.
  for (const dia of ['2026-04-20', '2026-04-27']) {
    await venda(`${dia} 10:00:00`, '484', [{ produto: '60', valor: '1000.00', vendedor: '1' }])
  }
  for (const dia of ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25', '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22']) {
    await venda(`${dia} 10:00:00`, '484', [{ produto: '60', valor: '100.00', vendedor: '1' }])
  }
  await venda('2026-06-23 10:00:00', '484', [{ produto: '60', valor: '80.00', vendedor: '1' }])
  await venda('2026-06-29 09:00:00', '484', [{ produto: '60', valor: '50.00', vendedor: '1' }])

  // Em 29/06 (segunda): até a véspera, junho tem 4 × 100,00 + 80,00 = 480,00 (os 50,00 do próprio dia 29 não entram).
  // Faltam a segunda 29 e a terça 30. Segunda: as 8 últimas são as de 04/05 a 22/06 (as de abril ficam fora), média
  // 100,00. Terça: as 8 últimas vão de 05/05 a 23/06, só uma com venda, média 80,00 ÷ 8 = 10,00. 480 + 100 + 10 = 590,00.
  assert.equal((await responder(c, 'vendas', '2026-06-29')).mes.projecao, 590)

  // Em 26/04 (domingo): até a véspera, abril tem 1.000,00 (20/04). A primeira venda é de 20/04: antes dela não há dia
  // na média. Segunda: só 20/04, média 1.000,00; os outros dias da semana, 0. Falta uma segunda (27/04): 1.000 + 1.000.
  assert.equal((await responder(c, 'vendas', '2026-04-26')).mes.projecao, 2000)
}))

test('dia sem venda num mês com venda: o dia sai com 0 vendas e ticket e itens por venda vazios; o mês, com os dois', () => isolado(async () => {
  await venda('2026-06-02 10:15:00', '484', [
    { produto: '60', valor: '59.80', vendedor: '1' },
    { produto: '1436', valor: '140.20', vendedor: '999005' },
  ])
  await venda('2026-06-03 16:40:00', '484', [{ produto: '60', valor: '29.90', vendedor: '1' }])
  const { dia, mes } = await responder(c, 'vendas', '2026-06-04')
  assert.deepEqual(dia, { vendido: 0, devolucoes: 0, realizado: 0, vendas: 0, ticket_medio: null, itens_por_venda: null })
  // 229,90 ÷ 2 vendas = 114,95; (2 produtos + 1 produto) ÷ 2 vendas = 1,5.
  assert.deepEqual(
    {
      vendido: mes.vendido, devolucoes: mes.devolucoes, realizado: mes.realizado, vendas: mes.vendas,
      ticket_medio: mes.ticket_medio, itens_por_venda: mes.itens_por_venda,
    },
    { vendido: 229.9, devolucoes: 0, realizado: 229.9, vendas: 2, ticket_medio: 114.95, itens_por_venda: 1.5 },
  )
}))

test('dia sem venda num mês ainda sem venda (05/04/2026): zeros, e ticket, itens, meta e ritmo vazios, sem erro', () => isolado(async () => {
  // Abril de 2026: 30 dias − 4 domingos = 26 dias úteis; de 01 a 05, 4 (quarta a sábado). Sem venda, a projeção é 0.
  assert.deepEqual(await responder(c, 'vendas', '2026-04-05'), {
    dia: { vendido: 0, devolucoes: 0, realizado: 0, vendas: 0, ticket_medio: null, itens_por_venda: null },
    mes: {
      vendido: 0, devolucoes: 0, realizado: 0, vendas: 0, ticket_medio: null, itens_por_venda: null,
      meta: null, percentual_meta: null, dias_uteis: 26, dias_uteis_decorridos: 4, ritmo: null, projecao: 0,
    },
    vendedores: [
      {
        codigo: '1', nome: 'Igor Mendes Ribeiro', realizado_dia: 0, realizado_mes: 0, vendas_mes: 0,
        meta: null, ritmo: null, clientes_atendidos: 0, mix: [],
      },
      {
        codigo: '999005', nome: 'Daniele Fonseca Lima', realizado_dia: 0, realizado_mes: 0, vendas_mes: 0,
        meta: null, ritmo: null, clientes_atendidos: 0, mix: [],
      },
    ],
    outros: { realizado_dia: 0, realizado_mes: 0, vendas_mes: 0 },
    por_hora: [],
    por_dia_da_semana: [],
  })
}))

test('vendedores: Igor e Daniele (tipo V) com realizado, meta e ritmo; Erleide (tipo N) em outros; a soma é o realizado do mês', () => isolado(async () => {
  await montarJunho()
  const resposta = await responder(c, 'vendas', '2026-06-15')
  // Igor: vendeu 59,80 + 70,10 e teve 29,90 devolvidos = 100,00; ritmo (100 ÷ 600) ÷ (13 ÷ 26) = 0,3333.
  // Daniele: 140,20 + 29,90 + 35,00 = 205,10, sem meta. Erleide: 50,00.
  assert.deepEqual(
    resposta.vendedores.map((v: Record<string, unknown>) => ({
      codigo: v.codigo, nome: v.nome, realizado_dia: v.realizado_dia, realizado_mes: v.realizado_mes,
      vendas_mes: v.vendas_mes, meta: v.meta, ritmo: v.ritmo,
    })),
    [
      { codigo: '1', nome: 'Igor Mendes Ribeiro', realizado_dia: 70.1, realizado_mes: 100, vendas_mes: 2, meta: 600, ritmo: 0.3333 },
      { codigo: '999005', nome: 'Daniele Fonseca Lima', realizado_dia: 64.9, realizado_mes: 205.1, vendas_mes: 2, meta: null, ritmo: null },
    ],
  )
  assert.deepEqual(resposta.outros, { realizado_dia: 50, realizado_mes: 50, vendas_mes: 1 })
  // 100,00 + 205,10 + 50,00 = 355,10 = vendido 385,00 − devoluções 29,90.
  assert.equal(resposta.mes.realizado, 355.1)
  assert.equal(
    centavos(resposta.vendedores[0].realizado_mes) + centavos(resposta.vendedores[1].realizado_mes) + centavos(resposta.outros.realizado_mes),
    centavos(resposta.mes.realizado),
  )
}))

test('a venda com itens de dois vendedores conta uma vez nas vendas do mês e do dia, e uma vez para cada vendedor', () => isolado(async () => {
  await montarJunho()
  const { dia, mes, vendedores, outros } = await responder(c, 'vendas', '2026-06-15')
  // Vendas do mês: 02/06 (Igor e Daniele), 15/06 às 9h30 (Daniele) e 15/06 às 16h45 (Erleide e Igor) = 3; a troca não é venda.
  // Por vendedor: Igor 2, Daniele 2, outros 1 (somam 5).
  assert.equal(mes.vendas, 3)
  assert.deepEqual([vendedores[0].vendas_mes, vendedores[1].vendas_mes, outros.vendas_mes], [2, 2, 1])
  // No dia: 2 vendas, 185,00; a das 16h45 tem dois itens do mesmo produto (1436): 1 produto. (2 + 1) ÷ 2 = 1,5.
  assert.deepEqual(dia, { vendido: 185, devolucoes: 0, realizado: 185, vendas: 2, ticket_medio: 92.5, itens_por_venda: 1.5 })
}))

test('clientes atendidos sem o Consumidor Final (999007), e o mix do mês por grupo do produto, do maior para o menor', () => isolado(async () => {
  await montarJunho()
  const { vendedores } = await responder(c, 'vendas', '2026-06-15')
  // Igor vendeu duas vezes ao 484: 1 cliente. Daniele vendeu ao 484 e ao Consumidor Final: 1 cliente.
  // Mix do Igor: COLAS 70,10; FERRAMENTAS 59,80 − 29,90 devolvidos = 29,90. O produto 7777 não tem cadastro: sem grupo.
  // Na Daniele, "sem grupo" (35,00) vem antes de FERRAMENTAS (29,90): a ordem é a do valor, não a do nome.
  assert.deepEqual(
    vendedores.map((v: Record<string, unknown>) => ({ codigo: v.codigo, clientes_atendidos: v.clientes_atendidos, mix: v.mix })),
    [
      {
        codigo: '1', clientes_atendidos: 1,
        mix: [{ grupo: 'COLAS', realizado: 70.1 }, { grupo: 'FERRAMENTAS', realizado: 29.9 }],
      },
      {
        codigo: '999005', clientes_atendidos: 1,
        mix: [{ grupo: 'COLAS', realizado: 140.2 }, { grupo: 'sem grupo', realizado: 35 }, { grupo: 'FERRAMENTAS', realizado: 29.9 }],
      },
    ],
  )
}))

test('por hora e por dia da semana: do mês até o dia, com as vendas e o realizado (a troca entra no realizado)', () => isolado(async () => {
  await montarJunho()
  const { por_hora: porHora, por_dia_da_semana: porDiaDaSemana } = await responder(c, 'vendas', '2026-06-15')
  // 02/06 (terça) às 10h: 200,00; 10/06 (quarta) às 11h: a troca, −29,90; 15/06 (segunda) às 9h: 64,90 e às 16h: 120,10.
  // As vendas de 29/05 e de 16/06, de R$ 1.000,00 às 10h, ficam fora.
  assert.deepEqual(porHora, [
    { hora: 9, vendas: 1, realizado: 64.9 },
    { hora: 10, vendas: 1, realizado: 200 },
    { hora: 11, vendas: 0, realizado: -29.9 },
    { hora: 16, vendas: 1, realizado: 120.1 },
  ])
  assert.deepEqual(porDiaDaSemana, [
    { dia_da_semana: 1, vendas: 2, realizado: 185 },
    { dia_da_semana: 2, vendas: 1, realizado: 200 },
    { dia_da_semana: 3, vendas: 0, realizado: -29.9 },
  ])
}))

test('a troca do ERP novo (natureza 900) entra nas devoluções do dia dela e do vendedor, e não é venda', () => isolado(async () => {
  await montarJunho()
  const { dia, mes, vendedores } = await responder(c, 'vendas', '2026-06-10')
  assert.deepEqual(dia, { vendido: 0, devolucoes: 29.9, realizado: -29.9, vendas: 0, ticket_medio: null, itens_por_venda: null })
  // No mês até 10/06: a venda de 02/06 (200,00) menos a troca: 170,10 numa venda só.
  assert.deepEqual(
    { vendido: mes.vendido, devolucoes: mes.devolucoes, realizado: mes.realizado, vendas: mes.vendas, ticket_medio: mes.ticket_medio },
    { vendido: 200, devolucoes: 29.9, realizado: 170.1, vendas: 1, ticket_medio: 170.1 },
  )
  assert.equal(vendedores[0].realizado_dia, -29.9) // Igor

  // Uma troca em que o cliente devolve um produto e leva outro: o item levado (saída) é vendido, mas a troca não é venda.
  await troca('2026-06-11 15:00:00', '484', [
    { produto: '60', valor: '29.90', vendedor: '999005' },
    { produto: '1436', valor: '45.00', vendedor: '999005', sentido: 'S' },
  ])
  const onze = await responder(c, 'vendas', '2026-06-11')
  assert.deepEqual(onze.dia, { vendido: 45, devolucoes: 29.9, realizado: 15.1, vendas: 0, ticket_medio: null, itens_por_venda: null })
}))

test('feriado fica fora dos dias úteis, no ritmo e na projeção (07/09 e 26/09 de 2026 são feriados da migração)', () => isolado(async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-09-01', null, 2400.00)`)
  await venda('2026-08-31 10:00:00', '484', [{ produto: '60', valor: '300.00', vendedor: '1' }]) // segunda, em agosto
  await venda('2026-09-08 10:00:00', '484', [{ produto: '60', valor: '400.00', vendedor: '1' }]) // terça
  const dez = (await responder(c, 'vendas', '2026-09-10')).mes
  // Setembro: 30 dias − 4 domingos − 2 feriados = 24; de 01 a 10: 10 − 1 domingo (06) − 1 feriado (07) = 8.
  // (400 ÷ 2.400) ÷ (8 ÷ 24) = 0,5. Contando os feriados como dias úteis, daria (1/6) ÷ (9 ÷ 26) = 0,4815.
  assert.deepEqual(
    { dias_uteis: dez.dias_uteis, dias_uteis_decorridos: dez.dias_uteis_decorridos, percentual_meta: dez.percentual_meta, ritmo: dez.ritmo },
    { dias_uteis: 24, dias_uteis_decorridos: 8, percentual_meta: 0.1667, ritmo: 0.5 },
  )
  // Em 14/09 (segunda), desde a primeira venda (31/08): a segunda 07/09 é feriado e fica fora da média, que é 300,00
  // (com ela, seria 150,00); terça: 01/09 e 08/09, média 200,00. Até a véspera, setembro tem 400,00.
  // Faltam as segundas 14, 21 e 28 (900,00) e as terças 15, 22 e 29 (600,00): 400 + 900 + 600 = 1.900,00.
  assert.equal((await responder(c, 'vendas', '2026-09-14')).mes.projecao, 1900)
}))

test('Link falsa: em 17/06/2026, o dia da venda 1992, o vendido é R$ 150,00; o orçamento 1771 de junho não conta', async () => {
  const { dia, mes } = await responder(bancoLink.cliente, 'vendas', '2026-06-17')
  // Os itens da 1992 somam 150,000006772 (rateio do desconto sem arredondar): o total sai arredondado, 150,00.
  assert.deepEqual(dia, { vendido: 150, devolucoes: 0, realizado: 150, vendas: 1, ticket_medio: 150, itens_por_venda: 2 })
  // Junho até 17/06 na Link falsa: a 1992 e o orçamento 1771 (10/06, R$ 8.580,00), que não é venda.
  assert.deepEqual({ vendido: mes.vendido, vendas: mes.vendas }, { vendido: 150, vendas: 1 })
})

test('Link falsa: a negociação 434, só de devolução (R$ 742,90 em 28/04), entra nas devoluções e não nas vendas', async () => {
  const { dia, mes } = await responder(bancoLink.cliente, 'vendas', '2026-04-28')
  // 28/04: a 427 vende 51,30; a 434 só devolve 742,90; a 435 vende 742,90. Vendas: 427 e 435.
  // Ticket 51,30 ÷ 2 = 25,65; produtos: 1 (427) + 5 (435) = 6, 6 ÷ 2 = 3.
  assert.deepEqual(dia, { vendido: 794.2, devolucoes: 742.9, realizado: 51.3, vendas: 2, ticket_medio: 25.65, itens_por_venda: 3 })
  // Abril até 28/04: 7 negociações com item; a 108 (15/04, 97,0002 devolvidos) e a 434 são só de devolução: 5 vendas.
  // Devoluções: 97,0002 + 742,90 = 839,9002, que sai 839,90.
  assert.deepEqual({ vendas: mes.vendas, devolucoes: mes.devolucoes }, { vendas: 5, devolucoes: 839.9 })
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/regras-vendas.test.mts`
Saída esperada: falha antes de rodar qualquer teste, porque o módulo ainda não existe:
```
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///…/tradutor/indicadores.mts'
✖ tradutor\regras-vendas.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 3: Criar o módulo das perguntas**

Crie `tradutor/indicadores.mts`:

```ts
import { readFileSync } from 'node:fs'
import type { Cliente } from './banco.mts'

// As três perguntas da Fase 4. A regra de cada uma é um select em sql/regras/<pergunta>.sql, que recebe o dia em $1 e
// devolve uma linha com a coluna resposta (jsonb).
export type Pergunta = 'vendas' | 'compras' | 'financeiro'

export const PERGUNTAS: Pergunta[] = ['vendas', 'compras', 'financeiro']

export function lerRegra(pergunta: Pergunta): string {
  return readFileSync(new URL(`../sql/regras/${pergunta}.sql`, import.meta.url), 'utf8')
}

// Só para testes e para imprimir: o objeto que o pg monta do jsonb (os números viram number do JavaScript). A regra roda
// dentro de outro select, como é gravada em kaizen.resposta: por isso o arquivo não pode terminar com ;.
export async function responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any> {
  const { rows } = await cliente.query<{ resposta: unknown }>(`select r.resposta from (${lerRegra(pergunta)}) r`, [dia])
  return rows[0].resposta
}
```

- [ ] **Passo 4: Rodar o teste e ver falhar pela regra**

Rode: `node --test tradutor/regras-vendas.test.mts`
Saída esperada: falha, com `ℹ tests 12`, `ℹ pass 0` e `ℹ fail 12`, cada teste com
```
Error: ENOENT: no such file or directory, open '…\sql\regras\vendas.sql'
```
Se a falha for outra — `relation "kaizen.venda_item" does not exist`, `relation "kaizen.natureza" does not exist` ou `column "natureza" of relation "documento" does not exist` —, as tarefas 4 a 6 não estão na branch: pare e avise o orquestrador.

- [ ] **Passo 5: Escrever a regra de vendas**

Cada parte da consulta é uma frase da spec (seção 8):
- `item`: os itens de `kaizen.venda_item` até o dia, com o valor com sinal (o devolvido entra negativo, e a soma é o realizado) e a marca `conta_venda`, o item vendido de documento de papel `venda` (seção 8.1, "Vendas": a troca e a venda só de devolução não contam). A lista `venda`, dos documentos de papel venda, é calculada uma vez só (`as materialized`): juntar `documento_papel` direto com `venda_item` levou 138 segundos para um dia na cópia do banco do PC, e assim leva 0,17 segundo.
- `total` e `resumo`: o dia e o mês até o dia. Vendido, devoluções e realizado somam sem arredondar e arredondam no fim; ticket é realizado ÷ vendas; itens por venda é a soma dos produtos distintos de cada venda ÷ vendas; sem venda, os dois saem `null` (`nullif`).
- `calendario` e `uteis`: os dias do mês, útil de segunda a sábado menos `kaizen.feriado`; os decorridos vão do dia 1 ao dia, inclusive.
- `por_dia`, `historia`, `media` e `projecao`: o realizado do mês até a véspera, mais, para cada dia útil do dia até o fim do mês, a média do realizado dos 8 últimos dias úteis com o mesmo dia da semana, antes do dia e a partir do primeiro dia com venda (dia útil sem venda entra com 0); sem nenhum dia assim, a média é 0.
- Ritmo (loja e vendedor): (realizado ÷ meta) ÷ (decorridos ÷ dias úteis), escrito como realizado × dias úteis ÷ (meta × decorridos), a mesma conta com uma divisão só; sem meta ou sem dia útil decorrido, `null`.
- `vendedor`: o funcionário do ERP novo com tipo V (spec, decisão 10), em ordem numérica de código. `outros` junta os itens de quem não está nessa lista. Clientes atendidos: pessoas distintas das vendas do vendedor no mês, menos o 999007. Mix: o realizado do mês do vendedor por grupo do produto, pelo código e de qualquer fonte (os produtos só da Link têm código `link:…`), com `sem grupo` para o produto sem grupo ou fora do cadastro.

Crie `sql/regras/vendas.sql`:

```sql
-- Vendas de um dia (spec da Fase 4, seção 8.2). $1 = o dia calculado (date). Um único select, que devolve uma linha
-- com a coluna resposta (jsonb). Dinheiro: soma sem arredondar e round(…, 2) só no total; razões com 4 casas. Sem
-- divisor (nenhuma venda, nenhuma meta, nenhum dia útil decorrido), o campo sai vazio: o dia sem venda não dá erro.
with
periodo as (
  select $1::date as dia,
         date_trunc('month', $1::date)::date as inicio,
         (date_trunc('month', $1::date) + interval '1 month' - interval '1 day')::date as fim
),
-- Os documentos de papel venda, calculados uma vez só: juntar documento_papel direto com venda_item (que já passa por
-- ela) leva o Postgres a um laço aninhado que, com os 6.338 documentos do banco do PC, passa de 2 minutos por dia.
venda as materialized (
  select p.id from kaizen.documento_papel p where p.papel = 'venda'
),
-- Os itens vendidos e devolvidos até o dia (kaizen.venda_item). realizado é o valor com sinal: o devolvido entra
-- negativo. conta_venda marca o item vendido de documento de papel venda: só ele conta nas vendas e nos itens por venda.
item as (
  select v.documento, v.dia, v.hora, v.pessoa, v.produto, v.vendedor, v.sentido,
         case v.sentido when 'vendido' then v.valor else -v.valor end as realizado,
         v.sentido = 'vendido' and v.documento in (select vd.id from venda vd) as conta_venda
  from kaizen.venda_item v
  where v.dia <= $1::date
),
item_mes as (
  select i.* from item i, periodo pr where i.dia >= pr.inicio
),
-- O dia e o mês até o dia, com as mesmas contas.
total as (
  select t.nome,
         sum(i.realizado) filter (where i.sentido = 'vendido') as vendido,
         -sum(i.realizado) filter (where i.sentido = 'devolvido') as devolucoes,
         sum(i.realizado) as realizado,
         count(distinct i.documento) filter (where i.conta_venda) as vendas,
         count(distinct (i.documento, i.produto)) filter (where i.conta_venda) as produtos
  from (values ('dia'), ('mes')) t (nome)
  cross join periodo pr
  left join item_mes i on t.nome = 'mes' or i.dia = pr.dia
  group by t.nome
),
resumo as (
  select t.nome, t.realizado, jsonb_build_object(
    'vendido', round(coalesce(t.vendido, 0), 2),
    'devolucoes', round(coalesce(t.devolucoes, 0), 2),
    'realizado', round(coalesce(t.realizado, 0), 2),
    'vendas', t.vendas,
    'ticket_medio', round(t.realizado / nullif(t.vendas, 0), 2),
    'itens_por_venda', round(t.produtos::numeric / nullif(t.vendas, 0), 4)
  ) as conteudo
  from total t
),
-- Dia útil: segunda a sábado, menos os feriados cadastrados.
calendario as (
  select d.data, extract(isodow from d.data)::int as dia_da_semana,
         extract(isodow from d.data) < 7 and not exists (select 1 from kaizen.feriado f where f.data = d.data) as util
  from periodo pr
  cross join lateral (select pr.inicio + n as data from generate_series(0, pr.fim - pr.inicio) n) d
),
uteis as (
  select count(*) filter (where c.util) as do_mes,
         count(*) filter (where c.util and c.data <= pr.dia) as decorridos
  from calendario c, periodo pr
),
meta as (
  select m.vendedor, m.valor from kaizen.meta m, periodo pr where m.mes = pr.inicio
),
-- Projeção: o realizado de cada dia antes do dia calculado; e os dias úteis antes dele, a partir do primeiro dia com
-- venda, cada um com o seu realizado (0 sem venda). ordem = 1 é o mais recente de cada dia da semana.
por_dia as (
  select i.dia, sum(i.realizado) as realizado from item i where i.dia < $1::date group by i.dia
),
historia as (
  select h.data, extract(isodow from h.data)::int as dia_da_semana, coalesce(pd.realizado, 0) as realizado,
         row_number() over (partition by extract(isodow from h.data) order by h.data desc) as ordem
  from periodo pr
  cross join (select min(i.dia) as primeiro from item i where i.conta_venda) pv
  cross join lateral (select pv.primeiro + n as data from generate_series(0, pr.dia - 1 - pv.primeiro) n) h
  left join por_dia pd on pd.dia = h.data
  where extract(isodow from h.data) < 7 and not exists (select 1 from kaizen.feriado f where f.data = h.data)
),
media as (
  select h.dia_da_semana, avg(h.realizado) as valor from historia h where h.ordem <= 8 group by h.dia_da_semana
),
projecao as (
  select coalesce((select sum(pd.realizado) from por_dia pd, periodo pr where pd.dia >= pr.inicio), 0)
       + coalesce((select sum(m.valor)
                   from calendario c
                   join media m on m.dia_da_semana = c.dia_da_semana
                   cross join periodo pr
                   where c.util and c.data >= pr.dia), 0) as valor
),
-- Vendedor com meta e ritmo: funcionário do ERP novo com tipo V no cadastro lido por último. Os outros vão para outros.
vendedor as (
  select f.codigo, f.nome from kaizen.funcionario f where f.fonte = 'meuerp' and f.tipo = 'V'
),
por_vendedor as (
  select i.vendedor,
         sum(i.realizado) filter (where i.dia = $1::date) as realizado_dia,
         sum(i.realizado) as realizado_mes,
         count(distinct i.documento) filter (where i.conta_venda) as vendas_mes,
         count(distinct i.pessoa) filter (where i.conta_venda and i.pessoa <> '999007') as clientes
  from item_mes i
  group by i.vendedor
),
-- O grupo vem do cadastro do produto pelo código, de qualquer fonte (os produtos só da Link têm código 'link:…').
mix as (
  select i.vendedor, coalesce(pd.grupo, 'sem grupo') as grupo, sum(i.realizado) as realizado
  from item_mes i
  left join kaizen.produto pd on pd.codigo = i.produto
  group by i.vendedor, coalesce(pd.grupo, 'sem grupo')
)
select jsonb_build_object(
  'dia', (select r.conteudo from resumo r where r.nome = 'dia'),
  'mes', (select r.conteudo || jsonb_build_object(
            'meta', lm.valor,
            'percentual_meta', round(r.realizado / nullif(lm.valor, 0), 4),
            'dias_uteis', u.do_mes,
            'dias_uteis_decorridos', u.decorridos,
            'ritmo', round(coalesce(r.realizado, 0) * u.do_mes / nullif(lm.valor * u.decorridos, 0), 4),
            'projecao', round((select p.valor from projecao p), 2))
          from resumo r
          cross join uteis u
          left join meta lm on lm.vendedor is null
          where r.nome = 'mes'),
  'vendedores', coalesce((
    select jsonb_agg(jsonb_build_object(
      'codigo', v.codigo,
      'nome', v.nome,
      'realizado_dia', round(coalesce(pv.realizado_dia, 0), 2),
      'realizado_mes', round(coalesce(pv.realizado_mes, 0), 2),
      'vendas_mes', coalesce(pv.vendas_mes, 0),
      'meta', m.valor,
      'ritmo', round(coalesce(pv.realizado_mes, 0) * u.do_mes / nullif(m.valor * u.decorridos, 0), 4),
      'clientes_atendidos', coalesce(pv.clientes, 0),
      'mix', coalesce((
        select jsonb_agg(jsonb_build_object('grupo', x.grupo, 'realizado', round(x.realizado, 2))
                         order by x.realizado desc, x.grupo)
        from mix x where x.vendedor = v.codigo), '[]'::jsonb)
    ) order by v.codigo::bigint)
    from vendedor v
    cross join uteis u
    left join por_vendedor pv on pv.vendedor = v.codigo
    left join meta m on m.vendedor = v.codigo), '[]'::jsonb),
  'outros', (
    select jsonb_build_object(
      'realizado_dia', round(coalesce(sum(i.realizado) filter (where i.dia = $1::date), 0), 2),
      'realizado_mes', round(coalesce(sum(i.realizado), 0), 2),
      'vendas_mes', count(distinct i.documento) filter (where i.conta_venda))
    from item_mes i
    where not exists (select 1 from vendedor v where v.codigo = i.vendedor)),
  'por_hora', coalesce((
    select jsonb_agg(jsonb_build_object('hora', h.hora, 'vendas', h.vendas, 'realizado', round(h.realizado, 2)) order by h.hora)
    from (
      select i.hora, count(distinct i.documento) filter (where i.conta_venda) as vendas, sum(i.realizado) as realizado
      from item_mes i group by i.hora
    ) h), '[]'::jsonb),
  'por_dia_da_semana', coalesce((
    select jsonb_agg(jsonb_build_object('dia_da_semana', s.dia_da_semana, 'vendas', s.vendas, 'realizado', round(s.realizado, 2))
                     order by s.dia_da_semana)
    from (
      select extract(isodow from i.dia)::int as dia_da_semana,
             count(distinct i.documento) filter (where i.conta_venda) as vendas, sum(i.realizado) as realizado
      from item_mes i group by 1
    ) s), '[]'::jsonb)
) as resposta
```

O arquivo tem de terminar na linha `) as resposta`, seguida de uma quebra de linha: o `responder` o roda dentro de `select r.resposta from (…) r`, e um `;` no fim quebraria o teste.

- [ ] **Passo 6: Rodar o teste e ver passar**

Rode: `node --test tradutor/regras-vendas.test.mts`
Saída esperada: passa, com `ℹ tests 12`, `ℹ pass 12`, `ℹ fail 0` e:
```
✔ o ritmo do exemplo da spec: 15/06/2026, meta R$ 1.000,00, realizado R$ 384,60, 13 de 26 dias úteis → 0,7692
✔ a projeção: realizado do mês até a véspera + a média dos últimos 8 dias úteis do mesmo dia da semana, desde a primeira venda
✔ dia sem venda num mês com venda: o dia sai com 0 vendas e ticket e itens por venda vazios; o mês, com os dois
✔ dia sem venda num mês ainda sem venda (05/04/2026): zeros, e ticket, itens, meta e ritmo vazios, sem erro
✔ vendedores: Igor e Daniele (tipo V) com realizado, meta e ritmo; Erleide (tipo N) em outros; a soma é o realizado do mês
✔ a venda com itens de dois vendedores conta uma vez nas vendas do mês e do dia, e uma vez para cada vendedor
✔ clientes atendidos sem o Consumidor Final (999007), e o mix do mês por grupo do produto, do maior para o menor
✔ por hora e por dia da semana: do mês até o dia, com as vendas e o realizado (a troca entra no realizado)
✔ a troca do ERP novo (natureza 900) entra nas devoluções do dia dela e do vendedor, e não é venda
✔ feriado fica fora dos dias úteis, no ritmo e na projeção (07/09 e 26/09 de 2026 são feriados da migração)
✔ Link falsa: em 17/06/2026, o dia da venda 1992, o vendido é R$ 150,00; o orçamento 1771 de junho não conta
✔ Link falsa: a negociação 434, só de devolução (R$ 742,90 em 28/04), entra nas devoluções e não nas vendas
```

- [ ] **Passo 7: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 12 testes, todos em `tradutor/regras-vendas.test.mts`. O arquivo fica com uma única linha:

```text
380
```

- [ ] **Passo 8: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; nenhum `✖`; última linha `rodou 380 testes, esperados 380`.

- [ ] **Passo 9: Commit**

Antes do `EOF`, depois de uma linha em branco, acrescente a linha de atribuição (`Co-Authored-By: …`) que o sistema lhe dá: o plano não fixa nome de modelo.

```bash
git add sql/regras/vendas.sql tradutor/indicadores.mts tradutor/regras-vendas.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Regras: a resposta de vendas de qualquer dia, da loja e de cada vendedor

A regra de vendas diz, para um dia, o vendido, as devoluções, o
realizado, as vendas, o ticket e os itens por venda do dia e do mês;
a meta, o percentual, os dias úteis, o ritmo e a projeção do mês; o
mesmo para cada vendedor do tipo V (com clientes atendidos e o mix por
grupo), uma linha de outros, e o mês por hora e por dia da semana.

Em 15/06/2026, com meta de R$ 1.000,00 e R$ 384,60 realizados em 13
de 26 dias úteis, o ritmo é 0,7692. A troca e a venda só de devolução
contam nas devoluções e não como venda; feriado não é dia útil; o dia
sem venda sai com zeros e ticket vazio, sem erro. Na Link falsa, o dia
da venda 1992 tem R$ 150,00 vendidos.
Testes: rodou 380, esperados 380.
EOF
```
Saída esperada: o `git add` pode avisar `LF will be replaced by CRLF` para `testes-esperados.txt` (é só aviso); o hook roda `npm run verificar` e termina com `rodou 380 testes, esperados 380`; o commit sai.

DECISÃO:
- **Dia sem venda: somas e contagens saem 0; o que divide sai vazio.** A spec diz que o dia sem venda num mês com venda sai com "`vendas` 0 e ticket vazio", e que o mês ainda sem venda sai com "tudo vazio". Li "tudo vazio" como o que depende de divisor (ticket, itens por venda, percentual, ritmo) e as listas (`por_hora`, `por_dia_da_semana`, `mix`), com vendido, devoluções, realizado e vendas em 0, como no dia sem venda; a projeção sem história é 0 (spec: "sem nenhum dia assim, a média é 0"). Meta e ritmo ficam vazios por falta de meta, não por falta de venda.
- **Os números vão no JSON como número, não como texto.** O `round(…, 2)` do Postgres vai para o jsonb como número exato e é gravado sem passar pelo JavaScript. Só o `responder` (testes e impressão) os lê como `number`: por isso o teste compara `150` com o R$ 150,00 arredondado de 150,000006772. `percentual_meta` é a razão (0,3846), com 4 casas, como diz a spec ("realizado ÷ meta"); o "%" é da impressão, na tarefa 10.
- **A soma de vendedores e outros pode diferir do realizado do mês em 1 centavo.** Cada total é arredondado por si (spec, decisão 15). No teste, os valores têm centavos exatos e a soma bate; na cópia do banco do PC, em 25/09/2026, 65.895,87 + 51.114,40 + 530,99 = 117.541,26, contra 117.541,25 no mês. Sem arredondar, as três somas dão exatamente o realizado do mês.
- **"Vendas" pelo papel do documento.** A visão `venda_item` não traz o papel, e a spec conta como venda só o documento de papel `venda` com item vendido. A regra olha a lista dos documentos de papel venda, calculada uma vez (`as materialized`). A primeira versão, que juntava `documento_papel` direto, levou 138 s para um dia na cópia do banco do PC: o Postgres estima 1 linha para a visão (o filtro `situacao = 'emitido'` passa por um `coalesce`) e faz um laço aninhado de documento contra documento. Para provar a regra, o teste da troca tem uma troca em que o cliente devolve um produto e leva outro: o item levado é vendido, mas a troca não é venda. Esse formato ainda não foi visto no ERP (nenhuma troca até 28/09).
- **Tempo, medido numa cópia do banco do PC** (só leitura do banco `kaizen`, copiado por `pg_dump` para um banco de teste, com as migrações 009 a 012 e a natureza gravada nos documentos como a noite e o comando da Link gravariam): o dia 25/09/2026 levou 170 ms (`EXPLAIN ANALYZE`), e os 182 dias de 01/04 a 29/09 levaram 20,8 s, 114 ms por dia. Na mesma cópia, o vendido do mês nos últimos dias de abril a 25/09 deu os seis números do `FASE-3-relatorio.md` (58.825,56; 132.684,79; 140.882,93; 145.743,81; 140.782,78; 118.204,98), e as vendas dos seis meses somam 5.262, o número da spec (seção 8.1).
- **Primeiro dia com venda.** A regra toma o primeiro dia com venda entre os dias até o calculado. Dá o mesmo que "na história" inteira: a média só usa dias anteriores ao calculado, e se a primeira venda é depois dele, nenhum dia entra.
- **Ordem e forma das listas, que a spec não fixa.** Os vendedores vão em ordem numérica de código (`codigo::bigint`; no ERP novo o código é o número da pessoa, e em texto '1000000' viria antes de '999005'). O mix é `{grupo, realizado}`, do maior para o menor e, no empate, pelo nome; inclui as devoluções do vendedor (é o realizado). `por_hora` e `por_dia_da_semana` só trazem as horas e os dias com algum item, vendido ou devolvido; a hora só de troca sai com 0 vendas e realizado negativo. Clientes atendidos contam só as vendas (não as trocas) e deixam de fora a pessoa vazia.
- **O `responder` embrulha a regra** em `select r.resposta from (…) r`, como a tarefa 10 grava: todo teste de regra prova o contrato do esqueleto (um `select` só, sem `;` no fim).
- **Os testes desfazem o que gravam** (`begin`/`rollback`), e a Link falsa fica num segundo banco: a projeção olha a história inteira, e a Link falsa tem vendas de abril a setembro, que mudariam as médias dos outros testes. Todas as regras da consulta foram conferidas com mutações (13 trocas na regra, cada uma derrubando pelo menos um teste: sem o limite de 8 dias, com a história desde 01/04, feriado contando como dia útil no mês ou na história, o Consumidor Final como cliente, venda sem o papel, contagem de qualquer documento, produtos não distintos, vendido sem arredondar, vendedor sem o tipo V, o próprio dia na projeção, o mês sem o dia 1, e o mix pelo nome).

---

### Task 8: as regras de compras e estoque

**O que esta tarefa entrega, em resultado:** a resposta da pergunta 2, "estou comprando o que gira ou o que encalha?", para qualquer dia desde abril (spec, seção 8.3). Para o dia pedido, olhando os 90 dias que terminam nele, sai a curva ABC dos produtos por valor e por quantidade; quantos dos produtos comprados no período são A, B, C ou não tiveram venda; e, de 26/09/2026 em diante, o estoque de cada produto no fim do dia, o estoque médio, o giro, a cobertura em dias, o encalhe (quantos produtos e quanto vale o estoque parado, pelo custo atual), a ruptura, o estoque negativo, o giro por grupo, por marca e por fornecedor, e os produtos ativos com custo zero. Antes de 26/09, o que depende do estoque sai vazio, porque a Link não guardou histórico de estoque. No banco do PC, em 28/09/2026, o produto 1708 (164 unidades, sem venda, que só aparece num ajuste de custo) sai em encalhe, e o 5336 (57 unidades, comprado na nota da Link de 26/08) sai como produto novo, fora do encalhe, como a spec diz. A consulta leva cerca de meio segundo por dia com os dados do PC; a noite a roda uma vez para cada dia desde abril (cerca de 182). São 11 testes novos, num commit.

**Files:**
- Create: `sql/regras/compras.sql`
- Test: `tradutor/regras-compras.test.mts`
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes:
  - Da migração `012_regras.sql` (tarefa 6): `kaizen.documento_papel (id, fonte, dia, papel)`, com `papel = 'compra'` para o documento de natureza de categoria C que mexe no estoque (a nota 5 do ERP novo e a `nota_entrada` da Link) e o tipo traduzido para quem não tem natureza (`ajuste_custo`, `ajuste_estoque`, `inventario`…); `kaizen.venda_item (documento, fonte, dia, hora, pessoa, produto, vendedor, quantidade, valor, sentido)`, com `sentido` `vendido` ou `devolvido`.
  - Das migrações 010 e 011 (tarefas 4 e 5): `kaizen.natureza` e as três naturezas da Link (`pedido`, `orcamento`, `nota_entrada`).
  - Da Fase 2: `kaizen.estoque_movimento (produto, momento timestamp, origem_id text, saldo_depois numeric)`, `kaizen.estoque_virada (produto, quantidade)` (o banco de teste já traz os 1.029 produtos da migração 004), `kaizen.produto (fonte, codigo, descricao, grupo, marca, custo, ativo)`, `kaizen.produto_fornecedor (fonte, produto, fornecedor)`, `kaizen.pessoa (fonte, codigo, nome)` e a tradução `sentido` de `kaizen.traducao` (`S` saida, `E` entrada, `N` nenhum, nas duas fontes).
  - Da tarefa 6, `tradutor/apoio-regras.mts`: `inserirNatureza`, `inserirDocumento`, `inserirItem`, `inserirMovimento`, `inserirVirada`, `inserirProduto`, `inserirFornecedor`, com as assinaturas e os padrões do esqueleto do plano.
  - Da tarefa 7, `tradutor/indicadores.mts`: `responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any>`, que lê `sql/regras/<pergunta>.sql` (por `lerRegra`), roda com `[dia]` e devolve `rows[0].resposta`.
- Produces (usado pela tarefa 10, no `insert … select` e na linha de compras do comando `indicadores`):
  - `sql/regras/compras.sql`: um único `select`, com o dia em `$1` (`$1::date`), que devolve uma linha com a coluna `resposta` (`jsonb`), sem `;` no fim, com estas chaves:
    ```text
    periodo              { de: 'AAAA-MM-DD' (dia − 89), ate: 'AAAA-MM-DD' (o dia) }
    estoque_conhecido    true de 26/09/2026 em diante
    abc_valor            { A, B, C: { produtos, liquido (2 casas) } }
    abc_quantidade       { A, B, C: { produtos, quantidade } }
    compras_por_classe   { A, B, C, sem_venda }            (contagens de produtos)
    encalhe              { produtos, valor (2 casas) }      ou null antes de 26/09
    ruptura              { produtos }                        ou null antes de 26/09
    produtos             [ { codigo, descricao, classe_valor, classe_quantidade, liquido, quantidade, estoque,
                             estoque_medio, giro, cobertura_dias, encalhe, ruptura } ]
    giro_por_grupo       [ { nome, quantidade, estoque_medio, giro, cobertura_dias } ]   ou null antes de 26/09
    giro_por_marca       idem
    giro_por_fornecedor  idem
    custo_zero           [ códigos ]
    estoque_negativo     [ códigos ]                         ou null antes de 26/09
    ```
  - A linha de compras da tarefa 10 lê `abc_valor.A.produtos` (e B, C), `compras_por_classe.A` (e B, C, `sem_venda`), `estoque_conhecido`, `encalhe.produtos`, `encalhe.valor` e `ruptura.produtos`.

**Antes de começar:** rode tudo no Git Bash, a partir da raiz do repositório, na branch `fase-4`, com o Postgres local no ar (`docker compose up -d --wait`, porta 5434). `ls sql/migracoes` termina em `012_regras.sql`, `ls sql/regras` mostra o `vendas.sql` da tarefa 7, e `tradutor/indicadores.mts` e `tradutor/apoio-regras.mts` existem. `cat testes-esperados.txt` mostra o número que a tarefa anterior deixou.

- [ ] **Passo 1: Escrever o teste**

Cada teste monta seus documentos à mão e compara a resposta com o valor escrito no teste; a conta de cada número está no comentário ao lado. Antes de cada teste, o banco fica sem documentos, movimentos, cadastros e **sem a foto da virada**: a migração 004 grava no banco de teste os 1.029 produtos reais da virada (714 com estoque), que entrariam em toda resposta de 26/09 em diante. Os códigos de produto e de fornecedor são do cadastro real, e o 1708 e o 5336 são os dois exemplos da spec.

Crie `tradutor/regras-compras.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import {
  inserirDocumento, inserirFornecedor, inserirItem, inserirMovimento, inserirNatureza, inserirProduto, inserirVirada,
} from './apoio-regras.mts'
import { responder } from './indicadores.mts'

// A regra de compras e estoque (sql/regras/compras.sql, spec da Fase 4, seção 8.3), sobre documentos montados à mão.
let banco: BancoTeste
let c: Cliente
const natureza: Record<string, number> = {}

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo com os flags de 28/09 (spec, seção 2.1); as da Link vêm da migração 011.
  natureza['530'] = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza['5'] = await inserirNatureza(c, { codigo: '5', categoria: 'C', estoque: true, financeiro: true })
  const { rows } = await c.query<{ codigo: string; id: string }>(`select codigo, id from kaizen.natureza where fonte = 'link'`)
  for (const linha of rows) natureza[`link:${linha.codigo}`] = Number(linha.id)
})

after(async () => {
  await banco?.fechar()
})

// Cada teste começa sem documentos, movimentos, cadastros e sem a foto da virada: a migração 004 grava no banco de
// teste os 1.029 produtos reais da virada, que entrariam em toda resposta de 26/09/2026 em diante.
beforeEach(async () => {
  await c.query(
    'truncate kaizen.documento, kaizen.estoque_movimento, kaizen.estoque_virada, kaizen.produto, kaizen.produto_fornecedor, kaizen.pessoa restart identity cascade',
  )
})

// Os documentos pelo papel que têm nas regras (tarefa 6): a venda (530) e a nota (5) do ERP novo, a venda e a nota da
// Link, e o ajuste de custo, que não tem natureza. A venda leva o vendedor 1 (Igor) em cada item; a nota e o ajuste,
// nenhum. A devolução vem como na Link: item de entrada (E) dentro da venda.
const MODELO = {
  vendaLink: { fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'link:pedido', vendedor: '1' },
  notaLink: { fonte: 'link', modelo: '55', status: null, natureza: 'link:nota_entrada', vendedor: null },
  venda: { fonte: 'meuerp', modelo: 'PA', status: 'E', natureza: '530', vendedor: '1' },
  nota: { fonte: 'meuerp', modelo: '55', status: 'E', natureza: '5', vendedor: null },
  ajusteCusto: { fonte: 'meuerp', modelo: 'AC', status: 'E', natureza: null, vendedor: null },
} as const

type Item = [produto: string, sentido: 'S' | 'E' | 'N', quantidade: string, valor: string]

async function documento(tipo: keyof typeof MODELO, dia: string, itens: Item[]): Promise<void> {
  const m = MODELO[tipo]
  const id = await inserirDocumento(c, {
    fonte: m.fonte, modelo: m.modelo, status: m.status, criadoEm: `${dia} 10:00:00`,
    natureza: m.natureza === null ? null : m.natureza.replace('link:', ''),
    naturezaId: m.natureza === null ? null : natureza[m.natureza],
  })
  for (const [produto, sentido, quantidade, valor] of itens) {
    await inserirItem(c, id, { produto, sentido, quantidade, valor, vendedor: m.vendedor })
  }
}

async function compras(dia: string): Promise<any> {
  return responder(c, 'compras', dia)
}

type Linha = { codigo: string } & Record<string, unknown>

// Um campo de cada produto da lista, pelo código.
function campo(r: { produtos: Linha[] }, nome: string): Record<string, unknown> {
  return Object.fromEntries(r.produtos.map((p) => [p.codigo, p[nome]]))
}

test('estoque no fim do dia: vale o movimento de maior origem_id como número (10000 vence 9999); sem movimento, a virada; sem virada, 0', async () => {
  await inserirVirada(c, '1426', '8')
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-27 16:00:00', saldoAntes: '8', saldoDepois: '7', origemId: '9998' })
  // O ERP gravou o 9999 antes do 10000, mas o 9999 tem a hora mais tarde (a venda do caixa sem internet): pela hora,
  // ou pelo origem_id comparado como texto ('9999' > '10000'), o estoque de 28/09 sairia 5; e, como texto, o '9998'
  // de 27/09 ficaria acima do '10000', e o de 28/09 sairia 7.
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 15:00:00', saldoAntes: '7', saldoDepois: '5', origemId: '9999' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 09:00:00', saldoAntes: '5', saldoDepois: '3', origemId: '10000' })
  await inserirVirada(c, '1427', '12')
  await documento('venda', '2026-09-28', [['1428', 'S', '1', '25.00']])

  const r = await compras('2026-09-28')
  // 1426: estoque 8 em 26/09 (virada), 7 em 27/09 e 3 em 28/09; médio (8 + 7 + 3) ÷ 3 = 6; sem venda, giro 0 e
  // cobertura vazia; estoque positivo sem venda e sem compra: encalhe. 1427: sem movimento, a virada nos três dias.
  // 1428: sem virada nem movimento, estoque 0 nos três dias; giro vazio (estoque médio 0), cobertura 0 e ruptura.
  // Sozinho na curva, o 1428 tem 100% do acumulado: passa de 95% e é C.
  assert.deepEqual(r.produtos, [
    {
      codigo: '1428', descricao: null, classe_valor: 'C', classe_quantidade: 'C', liquido: 25, quantidade: 1,
      estoque: 0, estoque_medio: 0, giro: null, cobertura_dias: 0, encalhe: false, ruptura: true,
    },
    {
      codigo: '1426', descricao: null, classe_valor: null, classe_quantidade: null, liquido: 0, quantidade: 0,
      estoque: 3, estoque_medio: 6, giro: 0, cobertura_dias: null, encalhe: true, ruptura: false,
    },
    {
      codigo: '1427', descricao: null, classe_valor: null, classe_quantidade: null, liquido: 0, quantidade: 0,
      estoque: 12, estoque_medio: 12, giro: 0, cobertura_dias: null, encalhe: true, ruptura: false,
    },
  ])
})

// Sete produtos vendidos na Link. O período de 31/08/2026 vai de 03/06 a 31/08.
async function montarCurvas(): Promise<void> {
  // 2229: vendeu 9 por 749,992 e voltou 1 por 50,00: líquido 699,992, quantidade 8.
  await documento('vendaLink', '2026-08-10', [['2229', 'S', '9', '749.992'], ['2229', 'E', '1', '50.00']])
  // 1436 e 60 empatam no líquido (100,004).
  await documento('vendaLink', '2026-08-12', [['1436', 'S', '8', '100.004'], ['60', 'S', '12', '100.004']])
  // 1723 no primeiro dia do período; 1765 empata com ele no líquido (50,00) e na quantidade (1).
  await documento('vendaLink', '2026-06-03', [['1723', 'S', '1', '50.00']])
  await documento('vendaLink', '2026-08-20', [['1765', 'S', '1', '50.00']])
  // Fora do período: a véspera do primeiro dia e o dia seguinte ao calculado.
  await documento('vendaLink', '2026-06-02', [['1765', 'S', '5', '500.00']])
  await documento('vendaLink', '2026-09-01', [['1723', 'S', '3', '300.00']])
  // Fora das curvas: 1368 vendeu e voltou (líquido 0, quantidade 0); 1370 só voltou (líquido -15,00, quantidade -1).
  await documento('vendaLink', '2026-08-25', [['1368', 'S', '1', '20.00'], ['1368', 'E', '1', '20.00']])
  await documento('vendaLink', '2026-08-26', [['1370', 'E', '1', '15.00']])
}

test('curva ABC por valor: 1436 e 60 empatam no líquido e atravessam o corte de 80%; o de menor código fica A, o outro B', async () => {
  await montarCurvas()
  const r = await compras('2026-08-31')
  // Total da curva 1.000,000, na ordem líquido decrescente e código crescente (como texto: '1436' antes de '60'):
  // 2229 699,992 (acumulado 69,9992%, A); 1436 100,004 (79,9996%, A); 60 100,004 (90%, B); 1723 50 (95%, B: não passa
  // de 95%); 1765 50 (100%, C). Com o 1370 (-15,00) na conta, o total seria 985 e o 1436 (799,996 > 788) seria B.
  assert.deepEqual(campo(r, 'classe_valor'), { '2229': 'A', '1436': 'A', '60': 'B', '1723': 'B', '1765': 'C', '1368': null })
  // Arredonda só o total da classe: A = 699,992 + 100,004 = 799,996 → 800,00 (produto a produto, 699,99 + 100,00 = 799,99).
  assert.deepEqual(r.abc_valor, {
    A: { produtos: 2, liquido: 800 },
    B: { produtos: 2, liquido: 150 },
    C: { produtos: 1, liquido: 50 },
  })
})

test('curva ABC por quantidade: no empate de quantidade vence o maior líquido, depois o menor código', async () => {
  await montarCurvas()
  const r = await compras('2026-08-31')
  // Total 30, na ordem quantidade, líquido, código: 60 12 (40%, A); 2229 8 com líquido 699,992 (66,67%, A); 1436 8 com
  // 100,004 (93,33%, B); 1723 1 (96,67%, C); 1765 1 (C). Pelo código, o 1436 viria antes do 2229 e seria A. Com o 1370
  // (-1) na conta, o total seria 29 e o 1436 (28 > 27,55) seria C; com o 1368 (0), a classe C teria 3 produtos.
  assert.deepEqual(campo(r, 'classe_quantidade'), { '60': 'A', '2229': 'A', '1436': 'B', '1723': 'C', '1765': 'C', '1368': null })
  assert.deepEqual(r.abc_quantidade, {
    A: { produtos: 2, quantidade: 20 },
    B: { produtos: 1, quantidade: 8 },
    C: { produtos: 2, quantidade: 2 },
  })
})

test('dia antes de 26/09/2026: estoque desconhecido, campos de estoque vazios; a curva, as compras e o custo zero saem', async () => {
  await montarCurvas()
  await inserirProduto(c, { codigo: '60', descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER', custo: '5.10' })
  await inserirProduto(c, { codigo: '61', custo: null })
  // A virada existe, mas não vale antes dela.
  await inserirVirada(c, '60', '3')
  await documento('notaLink', '2026-08-15', [['1765', 'E', '4', '0']])

  const semEstoque = { estoque: null, estoque_medio: null, giro: null, cobertura_dias: null, encalhe: null, ruptura: null }
  assert.deepEqual(await compras('2026-08-31'), {
    periodo: { de: '2026-06-03', ate: '2026-08-31' },
    estoque_conhecido: false,
    abc_valor: { A: { produtos: 2, liquido: 800 }, B: { produtos: 2, liquido: 150 }, C: { produtos: 1, liquido: 50 } },
    abc_quantidade: { A: { produtos: 2, quantidade: 20 }, B: { produtos: 1, quantidade: 8 }, C: { produtos: 2, quantidade: 2 } },
    compras_por_classe: { A: 0, B: 0, C: 1, sem_venda: 0 },
    encalhe: null,
    ruptura: null,
    // O 1370 só teve devolução: sem item vendido e sem estoque conhecido, fica fora da lista.
    produtos: [
      { codigo: '2229', descricao: null, classe_valor: 'A', classe_quantidade: 'A', liquido: 699.99, quantidade: 8, ...semEstoque },
      { codigo: '1436', descricao: null, classe_valor: 'A', classe_quantidade: 'B', liquido: 100, quantidade: 8, ...semEstoque },
      {
        codigo: '60', descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER', classe_valor: 'B', classe_quantidade: 'A',
        liquido: 100, quantidade: 12, ...semEstoque,
      },
      { codigo: '1723', descricao: null, classe_valor: 'B', classe_quantidade: 'C', liquido: 50, quantidade: 1, ...semEstoque },
      { codigo: '1765', descricao: null, classe_valor: 'C', classe_quantidade: 'C', liquido: 50, quantidade: 1, ...semEstoque },
      { codigo: '1368', descricao: null, classe_valor: null, classe_quantidade: null, liquido: 0, quantidade: 0, ...semEstoque },
    ],
    giro_por_grupo: null,
    giro_por_marca: null,
    giro_por_fornecedor: null,
    custo_zero: ['61'],
    estoque_negativo: null,
  })
})

test('estoque médio, giro e cobertura em 30/09/2026: média dos dias desde 26/09, giro pela quantidade de 90 dias', async () => {
  // 1426: virada 10; fim de 26/09 10, 27/09 10, 28/09 7, 29/09 4, 30/09 2. Vendeu 13 na Link e 3 + 3 + 2 no ERP novo.
  await inserirVirada(c, '1426', '10')
  await documento('vendaLink', '2026-08-10', [['1426', 'S', '13', '130.00']])
  await documento('venda', '2026-09-28', [['1426', 'S', '3', '30.00']])
  await documento('venda', '2026-09-29', [['1426', 'S', '3', '30.00']])
  await documento('venda', '2026-09-30', [['1426', 'S', '2', '20.00']])
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 10:00:00', saldoAntes: '10', saldoDepois: '7', origemId: '2001' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-29 10:00:00', saldoAntes: '7', saldoDepois: '4', origemId: '2002' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-30 10:00:00', saldoAntes: '4', saldoDepois: '2', origemId: '2003' })
  // 1427: estoque 5 sem venda. 1428: virada 1, vendeu 1 em 29/09 e zerou. 1429: vendeu 2 sem nunca ter estoque.
  await inserirVirada(c, '1427', '5')
  await inserirVirada(c, '1428', '1')
  await documento('venda', '2026-09-29', [['1428', 'S', '1', '12.00']])
  await inserirMovimento(c, { produto: '1428', momento: '2026-09-29 11:00:00', saldoAntes: '1', saldoDepois: '0', origemId: '2004' })
  await documento('venda', '2026-09-30', [['1429', 'S', '2', '40.00']])

  const r = await compras('2026-09-30')
  const medidas = r.produtos.map((p: Linha) => ({
    codigo: p.codigo, quantidade: p.quantidade, estoque: p.estoque, estoque_medio: p.estoque_medio, giro: p.giro, cobertura_dias: p.cobertura_dias,
  }))
  assert.deepEqual(medidas, [
    // médio 33 ÷ 5 = 6,6; giro 21 ÷ 6,6 = 3,1818; cobertura 2 ÷ (21 ÷ 90) = 8,5714 dias.
    { codigo: '1426', quantidade: 21, estoque: 2, estoque_medio: 6.6, giro: 3.1818, cobertura_dias: 8.5714 },
    // médio 0: giro vazio; estoque 0: cobertura 0.
    { codigo: '1429', quantidade: 2, estoque: 0, estoque_medio: 0, giro: null, cobertura_dias: 0 },
    // médio (1 + 1 + 1 + 0 + 0) ÷ 5 = 0,6; giro 1 ÷ 0,6 = 1,6667; estoque 0: cobertura 0.
    { codigo: '1428', quantidade: 1, estoque: 0, estoque_medio: 0.6, giro: 1.6667, cobertura_dias: 0 },
    // sem venda: giro 0 ÷ 5 = 0 e cobertura vazia.
    { codigo: '1427', quantidade: 0, estoque: 5, estoque_medio: 5, giro: 0, cobertura_dias: null },
  ])
})

test('estoque médio em 30/12/2026: o movimento de antes do período vale até o movimento seguinte', async () => {
  // O período vai de 02/10 a 30/12 (90 dias). O saldo 5 de 28/09 vale de 02/10 a 09/10 (8 dias), e o 4 de 10/10 até
  // 30/12 (82 dias): médio (8 × 5 + 82 × 4) ÷ 90 = 368 ÷ 90 = 4,0889. Pela virada (9) nos 8 primeiros dias, sairia 4,4444.
  await inserirVirada(c, '1426', '9')
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 10:00:00', saldoAntes: '9', saldoDepois: '5', origemId: '3001' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-10-10 10:00:00', saldoAntes: '5', saldoDepois: '4', origemId: '3002' })
  await documento('venda', '2026-11-16', [['1426', 'S', '9', '90.00']])

  const r = await compras('2026-12-30')
  assert.deepEqual(r.periodo, { de: '2026-10-02', ate: '2026-12-30' })
  // giro 9 ÷ 4,0889 = 2,2011; cobertura 4 ÷ (9 ÷ 90) = 40 dias.
  assert.deepEqual(
    r.produtos.map((p: Linha) => ({ codigo: p.codigo, estoque: p.estoque, estoque_medio: p.estoque_medio, giro: p.giro, cobertura_dias: p.cobertura_dias })),
    [{ codigo: '1426', estoque: 4, estoque_medio: 4.0889, giro: 2.2011, cobertura_dias: 40 }],
  )
})

test('encalhe e produto novo em 28/09/2026: o 1708 (só ajuste de custo) é encalhe; o 5336 (nota de 26/08) é novo', async () => {
  // 1708: 164 na virada, sem venda, só aparece num ajuste de custo (no ERP, o 115, de 27/09): ajuste não é entrada, e
  // produto sem entrada de compra não é novo.
  await inserirVirada(c, '1708', '164')
  await inserirProduto(c, { codigo: '1708', grupo: 'CORREDIÇAS', marca: 'RENNA', custo: '8.29' })
  await documento('ajusteCusto', '2026-09-27', [['1708', 'E', '0', '0']])
  // 5336: 57 na virada, sem venda, entrada na nota da Link de 26/08 (33 dias antes): novo.
  await inserirVirada(c, '5336', '57')
  await inserirProduto(c, { codigo: '5336', grupo: 'PUXADORES', marca: 'RENNA', custo: '5.12' })
  await documento('notaLink', '2026-08-26', [['5336', 'E', '60', '0']])
  // Primeira entrada 60 dias antes (30/07): não é "menos de 60 dias", não é novo. 59 dias antes (31/07): novo.
  await inserirVirada(c, '1437', '10')
  await inserirProduto(c, { codigo: '1437', custo: '2.5006' })
  await documento('notaLink', '2026-07-30', [['1437', 'E', '10', '0']])
  await inserirVirada(c, '1438', '6')
  await inserirProduto(c, { codigo: '1438', custo: '1.00' })
  await documento('notaLink', '2026-07-31', [['1438', 'E', '6', '0']])
  // 1429: vendeu em 10/05, antes da primeira entrada (01/09): não é novo. Sem custo no cadastro.
  await inserirVirada(c, '1429', '4')
  await inserirProduto(c, { codigo: '1429', custo: null })
  await documento('vendaLink', '2026-05-10', [['1429', 'S', '1', '10.00']])
  await documento('notaLink', '2026-09-01', [['1429', 'E', '5', '0']])
  // 1430 e 1431: primeira entrada numa nota do ERP novo em 28/09. O 1430 tinha 3 no fim de 27/09 (virada): não é
  // novo. O 1431 tinha 0: novo.
  await inserirVirada(c, '1430', '3')
  await inserirProduto(c, { codigo: '1430', custo: '3.333333' })
  await documento('nota', '2026-09-28', [['1430', 'E', '5', '0']])
  await inserirMovimento(c, { produto: '1430', momento: '2026-09-28 10:00:00', saldoAntes: '3', saldoDepois: '8', origemId: '4001' })
  await inserirVirada(c, '1431', '0')
  await inserirProduto(c, { codigo: '1431', custo: '4.00' })
  await documento('nota', '2026-09-28', [['1431', 'E', '5', '0']])
  await inserirMovimento(c, { produto: '1431', momento: '2026-09-28 10:00:00', saldoAntes: '0', saldoDepois: '5', origemId: '4002' })
  // 1435: estoque 9 e venda no período (15/07): não é encalhe.
  await inserirVirada(c, '1435', '9')
  await inserirProduto(c, { codigo: '1435', custo: '7.00' })
  await documento('vendaLink', '2026-07-15', [['1435', 'S', '1', '30.00']])

  const r = await compras('2026-09-28')
  assert.deepEqual(campo(r, 'encalhe'), {
    '1435': false, '1708': true, '5336': false, '1437': true, '1438': false, '1429': true, '1430': true, '1431': false,
  })
  // 164 × 8,29 + 10 × 2,5006 + 4 × (sem custo) + 8 × 3,333333 = 1.359,56 + 25,006 + 26,666664 = 1.411,232664; arredonda
  // só o total (produto a produto, 1.359,56 + 25,01 + 26,67 = 1.411,24).
  assert.deepEqual(r.encalhe, { produtos: 4, valor: 1411.23 })
  // Compras do período (01/07 a 28/09): 5336, 1437, 1438, 1429 (Link), 1430 e 1431 (ERP novo), nenhum com venda no
  // período. O ajuste de custo do 1708 não é compra.
  assert.deepEqual(r.compras_por_classe, { A: 0, B: 0, C: 0, sem_venda: 6 })
})

test('ruptura, estoque negativo e custo zero em 28/09/2026', async () => {
  // 61 vendeu e zerou; 62 vendeu e ficou em -1; 1352 vendeu e ficou com 4; 1360 não vendeu e ficou em -2 (ajuste).
  for (const [produto, virada, vendeu, depois, origemId] of [
    ['61', '1', '1', '0', '5001'], ['62', '1', '2', '-1', '5002'], ['1352', '5', '1', '4', '5003'], ['1360', '0', null, '-2', '5004'],
  ] as const) {
    await inserirVirada(c, produto, virada)
    if (vendeu !== null) await documento('venda', '2026-09-28', [[produto, 'S', vendeu, '10.00']])
    await inserirMovimento(c, { produto, momento: '2026-09-28 11:00:00', saldoAntes: virada, saldoDepois: depois, origemId })
  }
  // Custo zero é do cadastro atual, ativo, do ERP novo, com custo vazio ou zero, com ou sem estoque e venda.
  await inserirProduto(c, { codigo: '61', custo: null })
  await inserirProduto(c, { codigo: '62', custo: '0' })
  await inserirProduto(c, { codigo: '1363', custo: '0.00' })
  await inserirProduto(c, { codigo: '1352', custo: '0', ativo: false })
  await inserirProduto(c, { codigo: '1360', custo: '5.10' })
  await inserirProduto(c, { codigo: 'link:1993', custo: '0', fonte: 'link' })

  const r = await compras('2026-09-28')
  assert.deepEqual(campo(r, 'ruptura'), { '61': true, '62': true, '1352': false, '1360': false })
  // Cobertura 0 com estoque zero ou negativo (e não -1 ÷ (2 ÷ 90) = -45 no 62); 1352: 4 ÷ (1 ÷ 90) = 360; 1360 sem venda.
  assert.deepEqual(campo(r, 'cobertura_dias'), { '61': 0, '62': 0, '1352': 360, '1360': null })
  assert.deepEqual(r.ruptura, { produtos: 2 })
  assert.deepEqual(r.estoque_negativo, ['1360', '62'])
  assert.deepEqual(r.custo_zero, ['1363', '61', '62'])
})

test('compras por classe em 25/09/2026: a nota da Link com item N (entrada não concluída) não conta; a com item E conta', async () => {
  // Curva do período (28/06 a 25/09), total 1.000: 1436 800 (80%, A); 60 150 (95%, B); 1370 50 (C).
  await documento('vendaLink', '2026-09-10', [['1436', 'S', '1', '800.00']])
  await documento('vendaLink', '2026-09-11', [['60', 'S', '1', '150.00']])
  await documento('vendaLink', '2026-09-12', [['1370', 'S', '1', '50.00']])
  // Como as 5 notas de 22/09: só itens N. Não é entrada: o 1436 não conta como compra A.
  await documento('notaLink', '2026-09-22', [['1436', 'N', '5', '0'], ['1437', 'N', '5', '0']])
  await documento('notaLink', '2026-09-10', [['60', 'E', '10', '0'], ['1370', 'E', '4', '0'], ['1437', 'E', '3', '0']])
  // No primeiro dia do período conta; na véspera, não.
  await documento('notaLink', '2026-06-28', [['1372', 'E', '2', '0']])
  await documento('notaLink', '2026-06-27', [['1371', 'E', '2', '0']])
  // A devolução é item de entrada, mas numa venda: não é compra.
  await documento('vendaLink', '2026-09-15', [['1438', 'E', '1', '10.00']])

  const r = await compras('2026-09-25')
  // O 1436 fecha em exatamente 80% do acumulado: não passa de 80%, é A.
  assert.deepEqual(campo(r, 'classe_valor'), { '1436': 'A', '60': 'B', '1370': 'C' })
  // Das compras, 60 é B, 1370 é C; 1437 e 1372 não tiveram venda.
  assert.deepEqual(r.compras_por_classe, { A: 0, B: 1, C: 1, sem_venda: 2 })
})

test('giro por grupo, por marca e por fornecedor em 30/09/2026: somas dos produtos da lista', async () => {
  // 1426 (PUXADORES, RENNA; fornecedores 900011 e 900008): 20, 20, 11, 11, 11 → médio 14,6, estoque 11, vendeu 9.
  // 1427 (PUXADORES, TOTAL; fornecedor 900011): 10, 10, 10, 4, 4 → médio 7,6, estoque 4, vendeu 6.
  // 1428 (CORREDIÇAS, RENNA; sem fornecedor): 5 nos cinco dias, sem venda.
  await inserirProduto(c, { codigo: '1426', grupo: 'PUXADORES', marca: 'RENNA' })
  await inserirProduto(c, { codigo: '1427', grupo: 'PUXADORES', marca: 'TOTAL' })
  await inserirProduto(c, { codigo: '1428', grupo: 'CORREDIÇAS', marca: 'RENNA' })
  await inserirFornecedor(c, '1426', '900011')
  await inserirFornecedor(c, '1426', '900008')
  await inserirFornecedor(c, '1427', '900011')
  await c.query(
    `insert into kaizen.pessoa (fonte, codigo, nome, ativo) values
       ('meuerp', '900011', 'CRUZEIRO PAPEIS INDUSTRIAIS LTDA', true), ('meuerp', '900008', 'JJI COMERCIO ATACADISTA LTDA', true)`,
  )
  await inserirVirada(c, '1426', '20')
  await inserirVirada(c, '1427', '10')
  await inserirVirada(c, '1428', '5')
  await documento('venda', '2026-09-28', [['1426', 'S', '9', '90.00']])
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 10:00:00', saldoAntes: '20', saldoDepois: '11', origemId: '6001' })
  await documento('venda', '2026-09-29', [['1427', 'S', '6', '60.00']])
  await inserirMovimento(c, { produto: '1427', momento: '2026-09-29 10:00:00', saldoAntes: '10', saldoDepois: '4', origemId: '6002' })

  const r = await compras('2026-09-30')
  assert.deepEqual(r.giro_por_grupo, [
    { nome: 'CORREDIÇAS', quantidade: 0, estoque_medio: 5, giro: 0, cobertura_dias: null },
    // giro 15 ÷ 22,2 = 0,6757; cobertura 15 ÷ (15 ÷ 90) = 90.
    { nome: 'PUXADORES', quantidade: 15, estoque_medio: 22.2, giro: 0.6757, cobertura_dias: 90 },
  ])
  assert.deepEqual(r.giro_por_marca, [
    // 9 ÷ 19,6 = 0,4592; 16 ÷ (9 ÷ 90) = 160.
    { nome: 'RENNA', quantidade: 9, estoque_medio: 19.6, giro: 0.4592, cobertura_dias: 160 },
    // 6 ÷ 7,6 = 0,7895; 4 ÷ (6 ÷ 90) = 60.
    { nome: 'TOTAL', quantidade: 6, estoque_medio: 7.6, giro: 0.7895, cobertura_dias: 60 },
  ])
  assert.deepEqual(r.giro_por_fornecedor, [
    { nome: 'CRUZEIRO PAPEIS INDUSTRIAIS LTDA', quantidade: 15, estoque_medio: 22.2, giro: 0.6757, cobertura_dias: 90 },
    // 9 ÷ 14,6 = 0,6164; 11 ÷ (9 ÷ 90) = 110.
    { nome: 'JJI COMERCIO ATACADISTA LTDA', quantidade: 9, estoque_medio: 14.6, giro: 0.6164, cobertura_dias: 110 },
    // O produto sem fornecedor fica numa linha sem nome.
    { nome: null, quantidade: 0, estoque_medio: 5, giro: 0, cobertura_dias: null },
  ])
})

test('dia sem venda e sem estoque, antes e depois da virada: responde sem erro, com zeros e listas vazias', async () => {
  const zeros = {
    abc_valor: { A: { produtos: 0, liquido: 0 }, B: { produtos: 0, liquido: 0 }, C: { produtos: 0, liquido: 0 } },
    abc_quantidade: { A: { produtos: 0, quantidade: 0 }, B: { produtos: 0, quantidade: 0 }, C: { produtos: 0, quantidade: 0 } },
    compras_por_classe: { A: 0, B: 0, C: 0, sem_venda: 0 },
    produtos: [],
    custo_zero: [],
  }
  // Domingo, antes da primeira venda da história.
  assert.deepEqual(await compras('2026-04-05'), {
    periodo: { de: '2026-01-06', ate: '2026-04-05' },
    estoque_conhecido: false,
    ...zeros,
    encalhe: null,
    ruptura: null,
    giro_por_grupo: null,
    giro_por_marca: null,
    giro_por_fornecedor: null,
    estoque_negativo: null,
  })
  // Domingo depois da virada, sem nenhum estoque.
  assert.deepEqual(await compras('2026-09-27'), {
    periodo: { de: '2026-06-30', ate: '2026-09-27' },
    estoque_conhecido: true,
    ...zeros,
    encalhe: { produtos: 0, valor: 0 },
    ruptura: { produtos: 0 },
    giro_por_grupo: [],
    giro_por_marca: [],
    giro_por_fornecedor: [],
    estoque_negativo: [],
  })
})
```

O que cada teste prova, pela spec (seções 8.1 e 8.3):
- **Estoque no fim do dia**: o último movimento é o de maior `origem_id` como número. O `9999` tem a hora mais tarde e, como texto, fica acima do `10000`; o `9998` de 27/09 também fica acima do `10000` como texto. Pelos dois caminhos errados o estoque de 28/09 sairia 5 ou 7; o certo é 3. Sem movimento vale a virada (1427, 12); sem virada, 0 (1428).
- **Curva por valor**: 1436 e 60 empatam em 100,004 e atravessam o corte de 80%; o de menor código (como texto) fica A e o outro B. O 1723 fecha em exatamente 95% e fica B. O 1368 (líquido 0) e o 1370 (líquido −15,00) ficam fora; se o 1370 entrasse, o total cairia para 985 e o 1436 seria B. O total da classe A arredonda só no fim (800,00, e não 799,99). As vendas de 02/06 e 01/09 estão fora do período.
- **Curva por quantidade**: 2229 e 1436 empatam em 8 unidades; vence o maior líquido (2229, A), e o 1436 fica B. Pelo código, seria o contrário.
- **Dia antes de 26/09**: estoque, estoque médio, giro, cobertura, encalhe, ruptura, `estoque_negativo` e `giro_por_*` vazios, mesmo com a virada gravada; a curva, as compras por classe e o custo zero saem.
- **Estoque médio, giro e cobertura**: a média dos dias desde 26/09 (5 dias em 30/09); o giro divide a quantidade de 90 dias, que inclui a venda da Link de agosto; a cobertura é estoque ÷ (quantidade ÷ 90).
- **30/12/2026**: o período já começa depois da virada (02/10); o saldo do movimento de 28/09 vale até o próximo movimento, e não a virada.
- **Encalhe e produto novo**: os exemplos da spec (1708 em encalhe; 5336 novo); a carência de 60 dias no limite (30/07, 60 dias antes: não é novo; 31/07, 59 dias: novo); a venda antes da primeira entrada (1429); a entrada do ERP novo de 28/09 com e sem estoque na véspera (1430 e 1431). O valor do encalhe arredonda só no total (1.411,23; produto a produto, 1.411,24), e o produto sem custo conta como produto e não soma valor.
- **Ruptura, estoque negativo e custo zero**: ruptura só com venda no período e estoque zero ou negativo; cobertura 0 com estoque negativo (e não −45); custo zero só do ERP novo, ativo, com custo vazio ou zero.
- **Compras por classe**: a nota da Link com item `N` (como as 5 de 22/09) não conta; a com item `E` conta; o primeiro dia do período conta e a véspera não; a devolução (item de entrada numa venda) não é compra. O 1436 fecha em exatamente 80% e é A.
- **Giro por grupo, marca e fornecedor**: somas dos produtos da lista; o produto com dois fornecedores conta nos dois; o sem fornecedor fica numa linha sem nome.
- **Dia sem venda e sem estoque**, antes e depois da virada: nenhuma divisão por zero; zeros nas classes, listas vazias.

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/regras-compras.test.mts`
Saída esperada: falha, com `ℹ tests 11`, `ℹ pass 0` e `ℹ fail 11`:
```
✖ estoque no fim do dia: vale o movimento de maior origem_id como número (10000 vence 9999); sem movimento, a virada; sem virada, 0
✖ curva ABC por valor: 1436 e 60 empatam no líquido e atravessam o corte de 80%; o de menor código fica A, o outro B
✖ curva ABC por quantidade: no empate de quantidade vence o maior líquido, depois o menor código
✖ dia antes de 26/09/2026: estoque desconhecido, campos de estoque vazios; a curva, as compras e o custo zero saem
✖ estoque médio, giro e cobertura em 30/09/2026: média dos dias desde 26/09, giro pela quantidade de 90 dias
✖ estoque médio em 30/12/2026: o movimento de antes do período vale até o movimento seguinte
✖ encalhe e produto novo em 28/09/2026: o 1708 (só ajuste de custo) é encalhe; o 5336 (nota de 26/08) é novo
✖ ruptura, estoque negativo e custo zero em 28/09/2026
✖ compras por classe em 25/09/2026: a nota da Link com item N (entrada não concluída) não conta; a com item E conta
✖ giro por grupo, por marca e por fornecedor em 30/09/2026: somas dos produtos da lista
✖ dia sem venda e sem estoque, antes e depois da virada: responde sem erro, com zeros e listas vazias
```
todos com o mesmo motivo, porque a regra ainda não existe: `Error: ENOENT: no such file or directory, open '…\sql\regras\compras.sql'`.

Se o motivo for outro (`relation "kaizen.venda_item" does not exist`, `relation "kaizen.natureza" does not exist`, ou `Cannot find module` para `indicadores.mts` ou `apoio-regras.mts`), falta uma tarefa anterior na branch: pare e avise o orquestrador.

- [ ] **Passo 3: Escrever a regra**

Crie `sql/regras/compras.sql`, exatamente com este texto (um único `select`, sem `;` no fim; o arquivo termina com uma quebra de linha depois de `from periodo`):

```sql
-- Compras e estoque do dia $1 (spec da Fase 4, seção 8.3): uma linha, com a resposta em jsonb na coluna resposta.
-- Período: os 90 dias que terminam no dia. O estoque só é conhecido a partir de 26/09/2026 (a virada).
with periodo as (
  select $1::date - 89 as de, $1::date as ate, $1::date >= date '2026-09-26' as conhecido
),
-- Os dias do período com estoque conhecido: nenhum antes de 26/09/2026. Direto de $1, o Postgres sabe quantos são;
-- vindo de outra CTE, ele supõe 1.000 dias e liga a compilação JIT, que custa mais que a própria conta.
dias as (
  select $1::date - n as dia
  from generate_series(0, least(89, $1::date - date '2026-09-26')) as n
),
-- Por produto, o vendido menos o devolvido no período, em valor e em quantidade (spec 8.1).
venda as (
  select
    v.produto,
    sum(case v.sentido when 'vendido' then v.valor else -v.valor end) as liquido,
    sum(case v.sentido when 'vendido' then v.quantidade else -v.quantidade end) as quantidade,
    bool_or(v.sentido = 'vendido') as vendeu
  from kaizen.venda_item v, periodo
  where v.dia between periodo.de and periodo.ate
  group by v.produto
),
-- Curva ABC (docs/LOJA.md): é A enquanto o acumulado, contando o próprio produto, não passa de 80%; B até 95%; C o
-- resto. O código desempata como texto: há códigos que não são número ('link:1993').
curva_valor as (
  select produto, liquido,
    case
      when sum(liquido) over acumulado <= 0.80 * sum(liquido) over () then 'A'
      when sum(liquido) over acumulado <= 0.95 * sum(liquido) over () then 'B'
      else 'C'
    end as classe
  from venda
  where liquido > 0
  window acumulado as (order by liquido desc, produto collate "C" rows unbounded preceding)
),
curva_quantidade as (
  select produto, quantidade,
    case
      when sum(quantidade) over acumulado <= 0.80 * sum(quantidade) over () then 'A'
      when sum(quantidade) over acumulado <= 0.95 * sum(quantidade) over () then 'B'
      else 'C'
    end as classe
  from venda
  where quantidade > 0
  window acumulado as (order by quantidade desc, liquido desc, produto collate "C" rows unbounded preceding)
),
-- Estoque no fim do dia (spec 8.1): o saldo do movimento de maior origem_id::bigint com momento até o fim do dia
-- (como texto, '9999' ficaria acima de '10000'); sem movimento, a virada; sem virada, 0. Aqui, o último movimento de
-- cada produto em cada dia; os de antes do primeiro dia do período contam nele.
movimento as (
  select distinct on (m.produto, greatest(m.momento::date, p.primeiro))
    m.produto, greatest(m.momento::date, p.primeiro) as dia, m.origem_id::bigint as ordem, m.saldo_depois
  from kaizen.estoque_movimento m, (select min(dia) as primeiro from dias) p, periodo
  where m.momento < periodo.ate + 1
  order by m.produto, greatest(m.momento::date, p.primeiro), m.origem_id::bigint desc
),
com_estoque as (
  select produto from kaizen.estoque_virada
  union
  select produto from movimento
  union
  select produto from venda
),
-- Em cada dia, o maior origem_id até ali.
grade as (
  select c.produto, d.dia, max(m.ordem) over (partition by c.produto order by d.dia) as ordem
  from com_estoque c
  cross join dias d
  left join movimento m on m.produto = c.produto and m.dia = d.dia
),
estoque as (
  select
    g.produto,
    avg(coalesce(m.saldo_depois, v.quantidade, 0)) as medio,
    max(coalesce(m.saldo_depois, v.quantidade, 0)) filter (where g.dia = periodo.ate) as atual
  from grade g
  cross join periodo
  left join movimento m on m.produto = g.produto and m.ordem = g.ordem
  left join kaizen.estoque_virada v on v.produto = g.produto
  group by g.produto
),
-- Entrada de compra (spec 8.3): item de entrada em documento de papel compra, até o dia. O item N da Link (entrada
-- não concluída) não é entrada; ajuste, inventário, orçamento, pré-venda e a virada não são compra.
entrada as (
  select i.produto, p.dia
  from kaizen.documento_papel p
  join kaizen.documento_item i on i.documento_id = p.id
  join kaizen.traducao s on s.fonte = p.fonte and s.campo = 'sentido' and s.codigo = i.sentido
  cross join periodo
  where p.papel = 'compra' and s.valor = 'entrada' and p.dia <= periodo.ate
),
-- O primeiro dia com item vendido de cada produto. Calculado uma vez (materialized): consultada produto a produto,
-- a visão venda_item seria refeita para cada um.
primeira_venda as materialized (
  select v.produto, min(v.dia) as dia from kaizen.venda_item v where v.sentido = 'vendido' group by v.produto
),
-- Produto novo: a primeira entrada de compra é de menos de 60 dias antes do dia, e antes dela ele não vendeu; se ela é
-- de 26/09/2026 em diante, o estoque no fim da véspera dela era zero ou menos.
novo as (
  select f.produto
  from (select produto, min(dia) as dia from entrada group by produto) f
  cross join periodo
  left join primeira_venda pv on pv.produto = f.produto
  where f.dia > periodo.ate - 60
    and (pv.dia is null or pv.dia >= f.dia)
    and (
      f.dia < date '2026-09-26'
      or coalesce(
        (select m.saldo_depois from kaizen.estoque_movimento m
         where m.produto = f.produto and m.momento < f.dia
         order by m.origem_id::bigint desc limit 1),
        (select v.quantidade from kaizen.estoque_virada v where v.produto = f.produto),
        0
      ) <= 0
    )
),
-- Cada produto com venda no período ou estoque diferente de zero. O cadastro vem pelo código: o produto que só existe
-- na Link tem código próprio ('link:…'), que não se repete no ERP novo.
linha as (
  select
    x.produto, c.descricao, c.grupo, c.marca, c.custo,
    cv.classe as classe_valor, cq.classe as classe_quantidade,
    coalesce(v.liquido, 0) as liquido, coalesce(v.quantidade, 0) as quantidade,
    e.atual as estoque, e.medio as estoque_medio,
    case when periodo.conhecido then e.atual > 0 and not coalesce(v.vendeu, false) and n.produto is null end as encalhe,
    case when periodo.conhecido then coalesce(v.vendeu, false) and e.atual <= 0 end as ruptura
  from (select produto from venda union select produto from estoque) x
  cross join periodo
  left join venda v on v.produto = x.produto
  left join estoque e on e.produto = x.produto
  left join kaizen.produto c on c.codigo = x.produto
  left join curva_valor cv on cv.produto = x.produto
  left join curva_quantidade cq on cq.produto = x.produto
  left join novo n on n.produto = x.produto
  where v.vendeu or e.atual <> 0
),
-- Giro por grupo, marca e fornecedor: as somas dos produtos da lista. O fornecedor sai pelo nome do cadastro de pessoas.
giro as (
  select x.por, x.nome, sum(x.quantidade) as quantidade, sum(x.estoque_medio) as estoque_medio, sum(x.estoque) as estoque
  from (
    select 'grupo' as por, l.grupo as nome, l.quantidade, l.estoque_medio, l.estoque from linha l
    union all
    select 'marca', l.marca, l.quantidade, l.estoque_medio, l.estoque from linha l
    union all
    select 'fornecedor', pe.nome, l.quantidade, l.estoque_medio, l.estoque
    from linha l
    left join kaizen.produto_fornecedor f on f.produto = l.produto
    left join kaizen.pessoa pe on pe.fonte = f.fonte and pe.codigo = f.fornecedor
  ) x
  group by x.por, x.nome
),
giro_lista as (
  select g.por, jsonb_agg(jsonb_build_object(
    'nome', g.nome,
    'quantidade', g.quantidade,
    'estoque_medio', round(g.estoque_medio, 4),
    'giro', round(g.quantidade / nullif(g.estoque_medio, 0), 4),
    'cobertura_dias', case when g.quantidade > 0 then case when g.estoque <= 0 then 0 else round(g.estoque * 90 / g.quantidade, 4) end end
  ) order by g.nome) as lista
  from giro g
  group by g.por
)
select jsonb_build_object(
  'periodo', jsonb_build_object('de', periodo.de, 'ate', periodo.ate),
  'estoque_conhecido', periodo.conhecido,
  'abc_valor', (
    select jsonb_object_agg(k.classe, jsonb_build_object('produtos', k.produtos, 'liquido', k.liquido))
    from (
      select k.classe, count(cv.produto) as produtos, round(coalesce(sum(cv.liquido), 0), 2) as liquido
      from (values ('A'), ('B'), ('C')) as k (classe)
      left join curva_valor cv on cv.classe = k.classe
      group by k.classe
    ) k
  ),
  'abc_quantidade', (
    select jsonb_object_agg(k.classe, jsonb_build_object('produtos', k.produtos, 'quantidade', k.quantidade))
    from (
      select k.classe, count(cq.produto) as produtos, coalesce(sum(cq.quantidade), 0) as quantidade
      from (values ('A'), ('B'), ('C')) as k (classe)
      left join curva_quantidade cq on cq.classe = k.classe
      group by k.classe
    ) k
  ),
  'compras_por_classe', (
    select jsonb_build_object(
      'A', count(*) filter (where cv.classe = 'A'),
      'B', count(*) filter (where cv.classe = 'B'),
      'C', count(*) filter (where cv.classe = 'C'),
      'sem_venda', count(*) filter (where cv.classe is null)
    )
    from (select distinct e.produto from entrada e where e.dia >= periodo.de) cp
    left join curva_valor cv on cv.produto = cp.produto
  ),
  'encalhe', case when periodo.conhecido then (
    select jsonb_build_object('produtos', count(*), 'valor', round(coalesce(sum(l.estoque * l.custo), 0), 2))
    from linha l where l.encalhe
  ) end,
  'ruptura', case when periodo.conhecido then (
    select jsonb_build_object('produtos', count(*)) from linha l where l.ruptura
  ) end,
  'produtos', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'codigo', l.produto,
      'descricao', l.descricao,
      'classe_valor', l.classe_valor,
      'classe_quantidade', l.classe_quantidade,
      'liquido', round(l.liquido, 2),
      'quantidade', l.quantidade,
      'estoque', l.estoque,
      'estoque_medio', round(l.estoque_medio, 4),
      'giro', round(l.quantidade / nullif(l.estoque_medio, 0), 4),
      'cobertura_dias', case when l.quantidade > 0 then case when l.estoque <= 0 then 0 else round(l.estoque * 90 / l.quantidade, 4) end end,
      'encalhe', l.encalhe,
      'ruptura', l.ruptura
    ) order by l.liquido desc, l.produto collate "C"), '[]')
    from linha l
  ),
  'giro_por_grupo', case when periodo.conhecido then coalesce((select lista from giro_lista where por = 'grupo'), '[]') end,
  'giro_por_marca', case when periodo.conhecido then coalesce((select lista from giro_lista where por = 'marca'), '[]') end,
  'giro_por_fornecedor', case when periodo.conhecido then coalesce((select lista from giro_lista where por = 'fornecedor'), '[]') end,
  'custo_zero', (
    select coalesce(jsonb_agg(p.codigo order by p.codigo collate "C"), '[]')
    from kaizen.produto p
    where p.fonte = 'meuerp' and p.ativo and coalesce(p.custo, 0) = 0
  ),
  'estoque_negativo', case when periodo.conhecido then (
    select coalesce(jsonb_agg(l.produto order by l.produto collate "C"), '[]') from linha l where l.estoque < 0
  ) end
) as resposta
from periodo
```

Por que o SQL é assim, além da regra da spec:
- **`dias` vem direto de `$1`.** Com os dias tirados da CTE `periodo`, o Postgres supõe 1.000 linhas no `generate_series`, estima a grade produto × dia em quase um milhão de linhas e liga a compilação JIT, que custou de 0,3 a 0,7 s por consulta, mais que a própria conta. Com `$1`, ele sabe quantos dias são e não compila.
- **`primeira_venda` é `materialized`.** Consultada produto a produto (um `not exists` em `kaizen.venda_item`), a visão, com as traduções, era refeita para cada produto com entrada recente: 56 s por dia com os dados do PC. Calculada uma vez, 0,14 s.
- **O último movimento sai de uma grade produto × dia**, com o maior `origem_id::bigint` até cada dia (`max … over`). Os movimentos de antes do primeiro dia do período entram nesse primeiro dia; é o que faz o saldo de 28/09 valer em 02/10 no teste de 30/12.
- **`encalhe` e `ruptura` saem vazios pela condição `periodo.conhecido`**, e não pelo estoque vazio: sem ela, `null > 0 and false` dá `false`, e o produto vendido antes de 26/09 apareceria com `encalhe: false`.

- [ ] **Passo 4: Rodar o teste e ver passar**

Rode: `node --test tradutor/regras-compras.test.mts`
Saída esperada: passa, com `ℹ tests 11`, `ℹ pass 11`, `ℹ fail 0` e:
```
✔ estoque no fim do dia: vale o movimento de maior origem_id como número (10000 vence 9999); sem movimento, a virada; sem virada, 0
✔ curva ABC por valor: 1436 e 60 empatam no líquido e atravessam o corte de 80%; o de menor código fica A, o outro B
✔ curva ABC por quantidade: no empate de quantidade vence o maior líquido, depois o menor código
✔ dia antes de 26/09/2026: estoque desconhecido, campos de estoque vazios; a curva, as compras e o custo zero saem
✔ estoque médio, giro e cobertura em 30/09/2026: média dos dias desde 26/09, giro pela quantidade de 90 dias
✔ estoque médio em 30/12/2026: o movimento de antes do período vale até o movimento seguinte
✔ encalhe e produto novo em 28/09/2026: o 1708 (só ajuste de custo) é encalhe; o 5336 (nota de 26/08) é novo
✔ ruptura, estoque negativo e custo zero em 28/09/2026
✔ compras por classe em 25/09/2026: a nota da Link com item N (entrada não concluída) não conta; a com item E conta
✔ giro por grupo, por marca e por fornecedor em 30/09/2026: somas dos produtos da lista
✔ dia sem venda e sem estoque, antes e depois da virada: responde sem erro, com zeros e listas vazias
```

Se um teste falhar, confira primeiro se o arquivo foi copiado inteiro (`grep -c $'\r' sql/regras/compras.sql` dá `0`; a última linha é `from periodo`). Não mude o valor esperado do teste para ele passar: cada número tem a conta no comentário.

- [ ] **Passo 5: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 11 testes, todos em `tradutor/regras-compras.test.mts`. O arquivo fica com uma única linha:

```text
391
```

- [ ] **Passo 6: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; nenhum `✖`; última linha `rodou 391 testes, esperados 391`.

- [ ] **Passo 7: Commit**

Antes do `EOF`, depois de uma linha em branco, acrescente a linha de atribuição (`Co-Authored-By: …`) que o sistema lhe dá: o plano não fixa nome de modelo.

```bash
git add sql/regras/compras.sql tradutor/regras-compras.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Regras: compras e estoque do dia, com curva ABC, giro, encalhe e ruptura

A regra de compras responde, para qualquer dia desde abril, olhando os
90 dias até ele: a curva ABC dos produtos por valor e por quantidade,
e quantos dos produtos comprados no período são A, B, C ou não tiveram
venda (a nota da Link com entrada não concluída não conta).

De 26/09/2026 em diante, com o estoque da virada e os movimentos do
ERP novo, saem também o estoque de cada produto no fim do dia, o
estoque médio, o giro, a cobertura em dias, o encalhe (quantos e
quanto vale, pelo custo atual), a ruptura, o estoque negativo, o giro
por grupo, marca e fornecedor e os produtos ativos com custo zero.
Antes disso, o que depende do estoque sai vazio.

O produto novo (primeira compra há menos de 60 dias) não é encalhe: o
5336, comprado em 26/08, fica fora; o 1708, que só aparece num ajuste
de custo, entra. Um dia sem venda e sem estoque responde sem erro.
Testes: rodou 391, esperados 391.
EOF
```
Saída esperada: o `git add` pode avisar `LF will be replaced by CRLF` para `testes-esperados.txt` (é só aviso); o hook roda `npm run verificar` e termina com `rodou 391 testes, esperados 391`; o commit sai.

DECISÃO:
- **Cada curva entra pela sua medida.** A spec diz que, por quantidade, "vale o mesmo com a quantidade líquida", e termina com "produto com líquido zero ou negativo fica fora da curva". Li o "líquido" da última frase como a medida de cada curva: na curva por valor entram os produtos com líquido maior que zero; na por quantidade, os com quantidade líquida maior que zero. Um brinde (valor 0, quantidade 2) entra só na curva por quantidade. Nos testes, o 1368 (líquido 0, quantidade 0) e o 1370 (−15,00, −1) ficam fora das duas.
- **O código desempata como texto (`collate "C"`)**, na curva, na lista de produtos e nas listas de códigos. No banco do PC há 6 produtos com código `link:…`; um `::bigint` derrubaria a noite. Por isso `'1436'` vem antes de `'60'`, e o teste fixa isso.
- **A regra da curva vale ao pé da letra, também para o primeiro produto**: "é A enquanto o acumulado, contando o próprio produto, não passa de 80%". O produto sozinho na curva tem 100% e é C, como o 1428 no primeiro teste. Com a loja real isso não acontece: em 28/09, no PC, a curva por valor tem 120 produtos A, 169 B e 312 C.
- **`sem_venda` é o produto comprado sem classe na curva por valor**, isto é, sem venda ou com líquido zero ou negativo no período. Assim A + B + C + `sem_venda` é o total de produtos comprados no período.
- **"Produto com venda no período" é o que teve item vendido** (a mesma ideia de "vendas" da seção 8.1). O produto só com devolução no período entra na lista apenas se tiver estoque diferente de zero; antes de 26/09 ele não aparece (o 1370 no teste do dia antes da virada). A lista sai na ordem da curva: líquido decrescente, depois código. A spec não diz a ordem.
- **Casas decimais**: `liquido` (do produto e das classes) e o valor do encalhe com 2 casas, arredondados só no total; `estoque_medio`, `giro` e `cobertura_dias` com 4 casas, porque são médias e razões; `estoque` e `quantidade` como gravados.
- **Cobertura**: sem venda (quantidade líquida zero ou negativa) sai vazia antes de olhar o estoque; com venda, sai 0 com estoque zero ou negativo. O produto sem venda e sem estoque tem cobertura vazia. **Giro** com estoque médio negativo sai negativo: a spec só esvazia com estoque médio zero ou desconhecido (não há teste com esse caso).
- **Giro por grupo, marca e fornecedor**: as somas dos produtos da lista (quantidade, estoque médio e estoque do dia), com o giro e a cobertura pela mesma conta do produto. O fornecedor sai pelo nome de `kaizen.pessoa`; o produto com dois fornecedores conta nos dois; o produto sem grupo, marca ou fornecedor fica numa linha com `nome` vazio. A ordem é pelo nome. A spec não diz nada disso.
- **`custo_zero` sai também antes de 26/09**: é do cadastro atual, não é lista de estoque. As "listas de estoque" que saem vazias antes da virada são `estoque_negativo` e as de `giro_por_*`.
- **Encalhe**: o produto sem custo no cadastro conta nos produtos e não soma no valor. Depois da virada, sem encalhe, sai `{ produtos: 0, valor: 0 }`.
- **Produto novo**: "antes dela" é por dia (uma venda no mesmo dia da primeira entrada não tira o novo); só contam entradas até o dia calculado; o estoque "no fim do dia anterior" à entrada de 26/09 em diante segue a regra da seção 8.1 (o movimento de maior `origem_id` com momento antes do dia da entrada; sem ele, a virada; sem virada, 0).
- **O cadastro é achado pelo código, sem olhar a fonte**: o produto que só existe na Link tem código `link:…`, que não se repete no ERP novo (no PC, nenhum código aparece nas duas fontes). Os movimentos também não filtram a fonte: só o ERP novo grava movimento.
- **O período de um dia do começo de abril começa antes da história** (em 05/04/2026, de 06/01 a 05/04), como a spec diz ("os 90 dias que terminam no dia"); não há documento antes de abril.
- **Conferência no banco do PC (só leitura)**: o banco do PC vai só até a migração 008, sem natureza nem as visões da 012. Rodei a regra num `select` que troca as duas visões por CTEs `not materialized` com o mesmo texto, com o papel pelo modelo (pedido e venda da Link são venda; nota é compra). Em 28/09/2026: o 1708 sai com estoque 164 e `encalhe: true`; o 5336, com estoque 57 e `encalhe: false` (novo: nota da Link de 26/08, 33 dias antes). A resposta tem 859 produtos na lista, encalhe de 248 produtos (R$ 43.237,40), ruptura de 146, compras por classe A 92, B 71, C 74, sem venda 36, e 102 produtos com custo zero.
- **Tempo** (`explain analyze` no banco do PC, com as visões como CTEs): 0,54 s em 31/08, 0,51 s em 28/09 e 0,45 s em 30/12/2026, sem JIT. A noite roda a consulta cerca de 182 vezes: cerca de 1,5 minuto só de compras. A primeira versão levava 56 s por dia (o `not exists` na visão) e compilava JIT em toda consulta; as duas correções estão descritas no passo 3.

---

### Task 9: As regras do financeiro: o que a loja deve, a folga, o dinheiro que entrou e saiu, e o caixa do dia

**O que esta tarefa entrega, em resultado:** a terceira pergunta ("tenho dinheiro para pagar o que devo?") ganha a resposta de qualquer dia desde abril, numa consulta só. Para o dia pedido, ela diz: as contas a pagar em aberto no fim do dia (vencidas, que vencem em até 7 e em até 30 dias, o total e a lista por vencimento); o saldo do banco que o dono digitou por último e a folga em 7 e em 30 dias (saldo menos o que já venceu e o que vence no prazo); o dinheiro que entrou no dia e no mês, por forma (dinheiro, Pix, crédito, débito, cartão e outras), e o que saiu; o cartão a receber no dia seguinte; os próximos 30 dias, com o cartão a receber e as contas que vencem em cada um; e o caixa do dia, com a quebra de cada fechamento por forma e a gaveta. Até 25/09/2026 a posição (o que se deve, a folga, o previsto) é a da Link, e a partir de 26/09/2026 a do ERP novo, porque a mesma dívida está nas duas fontes; o dinheiro que entrou e saiu usa a fonte de cada dia, e setembro soma as duas. Conferido só lendo o banco do PC: em 25/09/2026 a regra dá 94 parcelas em aberto, R$ 245.864,76, pela Link (o número da spec); e a gaveta calculada pela regra é igual ao dinheiro que a própria Link calculou nos fechamentos em 140 dos 142 dias com caixa (os outros dois: 11/04, sem movimento, zero nos dois, e 15/04, R$ 0,01 de diferença). São 16 testes novos, num commit.

**Files:**
- Create: `sql/regras/financeiro.sql`
- Test: `tradutor/regras-financeiro.test.mts`
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes:
  - `kaizen.documento_papel (id bigint, fonte text, dia date, papel text)` e `kaizen.saldo_banco (data date chave, valor numeric)`, da migração `012_regras.sql` (tarefa 6). Os papéis usados aqui: `venda`, `troca`, `compra` (pela natureza) e, sem natureza, `conta_pagar`, `sangria`, `suprimento`, `suprimento_adicional`, `fechamento_caixa`.
  - A natureza `pedido` da Link (fonte `link`), da migração `011_natureza_link.sql` (tarefa 5).
  - As tabelas da migração 001: `kaizen.parcela` (`documento_id`, `lancado_em date`, `vencimento date`, `valor`, `status`), `kaizen.baixa` (`parcela_id`, `pago_em date`, `valor`, `forma`, `status`), `kaizen.documento_pagamento` (`documento_id`, `forma`, `valor`), `kaizen.conferencia_caixa` (`documento_id`, `forma`, `calculado`, `informado`) e `kaizen.documento` (`codigo`, `criado_em`, `fechado_em`).
  - As traduções de `kaizen.traducao` das migrações 002, 006 e 009. Campo `forma`: no ERP novo `1` dinheiro, `2` e `6` pix, `3` e `7` credito, `4` e `8` debito, `5` troca; na Link `Dinheiro`, `dinheiro` e `1.1.1.01` dinheiro, `Pix` e `pix` pix, `Cartao/true` credito, `Cartao/false` debito, `cartao` cartao, `2.1.2.03` e `nota_promissoria` troca, `1.1.1.02.01` banco, `cheque`, `boleto`. Campo `status_parcela`: `P` pendente, `B` baixada, `C` cancelada (Link: `false` pendente, `true` baixada). Campo `status_baixa`: `E` valida, `C` cancelada (Link: `true` valida).
  - `responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any>` de `tradutor/indicadores.mts` (tarefa 7): roda `sql/regras/<pergunta>.sql` com `[dia]` e devolve o objeto que o `pg` monta do jsonb (os números do JSON chegam como `number`).
  - `tradutor/apoio-regras.mts` (tarefa 6): `inserirNatureza`, `inserirDocumento`, `inserirPagamento`, `inserirParcela`, `inserirBaixa`, `inserirConferencia`; e `criarBancoKaizen(): Promise<BancoTeste>` de `tradutor/apoio-teste.mts`.
- Produces (usado pela tarefa 10, que grava a resposta e imprime o resumo do dia):
  - `sql/regras/financeiro.sql`: um único `select` (começa com `with`, sem `;` no fim) que recebe o dia em `$1` e devolve uma linha com a coluna `resposta jsonb`:
    - `fonte`: `'link'` (dia até 2026-09-25) ou `'meuerp'` (a partir de 2026-09-26);
    - `contas_a_pagar`: `vencidas`, `ate_7_dias`, `ate_30_dias` e `total`, cada um `{ parcelas, valor }`; e `por_vencimento`: lista de `{ vencimento: 'AAAA-MM-DD', parcelas, valor }`, por vencimento crescente (vazia: `[]`);
    - `saldo_banco`: `{ data: 'AAAA-MM-DD', valor }` ou `null`; `folga_7` e `folga_30`: número ou `null` (sem saldo);
    - `fluxo_realizado`: `{ dia: { entradas, saidas }, mes: { entradas, saidas } }`, com `entradas` = `{ dinheiro, pix, credito, debito, cartao, outras }`;
    - `recebiveis_cartao`: `{ credito_em: 'AAAA-MM-DD', valor }`;
    - `fluxo_previsto`: sempre 30 linhas `{ data: 'AAAA-MM-DD', entradas, saidas }`, do dia seguinte ao 30º dia depois;
    - `caixa`: `{ fechamentos: [{ codigo, quebra, formas: [{ forma, calculado, informado, quebra }] }], gaveta: { vendas_dinheiro, suprimentos, sangrias, devolucoes_dinheiro, gaveta } }`.
  - Dinheiro com 2 casas (`round` só no total); soma sem nenhum valor sai `0`, nunca `null`. A consulta não tem divisão.
  - Para a linha do comando `indicadores` (spec, seção 9): o a pagar é `contas_a_pagar.total.valor` em `contas_a_pagar.total.parcelas` parcelas; vencidas, `contas_a_pagar.vencidas.valor`; até 7 dias, `contas_a_pagar.ate_7_dias.valor`; a folga, `folga_7` (`null` = "saldo do banco não digitado"); a quebra do dia é a soma de `caixa.fechamentos[].quebra` (o JSON não traz essa soma pronta).

- [ ] **Passo 1: Escrever o teste**

Cada teste monta, num banco de teste, só os documentos de que precisa, dentro de uma transação que o `afterEach` desfaz: um teste não vê o que o outro gravou, e o saldo do banco digitado num teste some no fim dele. As naturezas do ERP novo levam os flags medidos em 28/09 (spec, seção 2.1): 530 é venda, 5 é compra e 900 é a troca; a da Link vem da migração 011. Os documentos sem natureza (conta, sangria, suprimento, fechamento) seguem o modelo cru da fonte. As datas são de dias úteis de setembro e outubro de 2026 (06/10 é uma terça).

Crie `tradutor/regras-financeiro.test.mts`:

```ts
import { after, afterEach, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import {
  inserirBaixa, inserirConferencia, inserirDocumento, inserirNatureza, inserirPagamento, inserirParcela,
} from './apoio-regras.mts'
import { responder } from './indicadores.mts'

// A regra do financeiro (sql/regras/financeiro.sql; spec da Fase 4, seção 8.4 e decisão 16), num banco de teste
// com documentos montados à mão. Cada teste roda numa transação desfeita no fim: um não vê os documentos do outro.
// Formas cruas do ERP novo: 1 dinheiro, 2 e 6 pix, 3 e 7 crédito, 4 e 8 débito, 5 troca (vale).
// Da Link: Dinheiro e 1.1.1.01 dinheiro, Pix, Cartao/true crédito, Cartao/false débito, cartao, cheque,
// 1.1.1.02.01 banco, 2.1.2.03 troca. Parcela: P pendente e C cancelada (Link: false pendente); baixa: E válida
// e C cancelada (Link: true válida).
let banco: BancoTeste
let c: Cliente
const natureza: Record<string, number> = {}

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo com os flags medidos em 28/09 (spec, seção 2.1); a da Link vem da migração 011.
  natureza.pedido = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza.nota = await inserirNatureza(c, { codigo: '5', categoria: 'C', estoque: true, financeiro: true })
  natureza.troca = await inserirNatureza(c, {
    codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, financeiro: true, troca: true,
  })
  const { rows } = await c.query<{ id: string }>(`select id from kaizen.natureza where fonte = 'link' and codigo = 'pedido'`)
  natureza.pedidoLink = Number(rows[0].id)
})

beforeEach(async () => {
  await c.query('begin')
})

afterEach(async () => {
  await c.query('rollback')
})

after(async () => {
  await banco?.fechar()
})

type Fonte = 'meuerp' | 'link'
type Pagamentos = Array<[forma: string, valor: string]>

async function pagar(documento: number, pagamentos: Pagamentos): Promise<number> {
  for (const [forma, valor] of pagamentos) await inserirPagamento(c, documento, { forma, valor })
  return documento
}

// Venda: o pedido 530 no ERP novo; na Link, o pedido com o caixa ativo (status 'false').
async function venda(momento: string, pagamentos: Pagamentos, fonte: Fonte = 'meuerp'): Promise<number> {
  const id = fonte === 'meuerp'
    ? await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza.pedido, criadoEm: momento })
    : await inserirDocumento(c, {
        fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'pedido', naturezaId: natureza.pedidoLink, criadoEm: momento,
      })
  return pagar(id, pagamentos)
}

// Troca do ERP novo (natureza 900): o dinheiro devolvido é o pagamento na forma 1.
async function troca(momento: string, pagamentos: Pagamentos): Promise<number> {
  const id = await inserirDocumento(c, { modelo: 'TM', natureza: '900', naturezaId: natureza.troca, criadoEm: momento })
  return pagar(id, pagamentos)
}

// Documento sem natureza (sangria, suprimento, fechamento, conta), pelo modelo cru da fonte.
async function semNatureza(modelo: string, momento: string, pagamentos: Pagamentos = [], fonte: Fonte = 'meuerp'): Promise<number> {
  const id = await inserirDocumento(c, { fonte, modelo, status: fonte === 'link' ? null : 'E', criadoEm: momento })
  return pagar(id, pagamentos)
}

// Conta a pagar como as da virada: lançada em 01/09 (CP no ERP novo, 2.1.2.02 na Link). No ERP novo, o documento
// importado fecha em 28/09, e a parcela guarda a data do lançamento: a posição olha a data da parcela.
async function conta(fonte: Fonte = 'meuerp'): Promise<number> {
  return fonte === 'meuerp'
    ? inserirDocumento(c, { modelo: 'CP', criadoEm: '2026-09-01 00:00:00', fechadoEm: '2026-09-28 10:00:00' })
    : inserirDocumento(c, { fonte: 'link', modelo: '2.1.2.02', status: null, criadoEm: '2026-09-01 00:00:00', fechadoEm: null })
}

async function parcela(documento: number, vencimento: string, valor: string, status = 'P', lancadoEm = '2026-09-01'): Promise<number> {
  return inserirParcela(c, documento, { lancadoEm, vencimento, valor, status })
}

const semEntrada = { dinheiro: 0, pix: 0, credito: 0, debito: 0, cartao: 0, outras: 0 }

// O dia n dias depois de `dia` (AAAA-MM-DD): só a conta do calendário.
function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, d + n)).toISOString().slice(0, 10)
}

// Os 30 dias do fluxo previsto depois de `dia`, zerados, com as linhas pedidas trocadas.
function previsto(dia: string, linhas: Record<string, { entradas?: number; saidas?: number }> = {}) {
  return Array.from({ length: 30 }, (_, i) => {
    const data = somarDias(dia, i + 1)
    return { data, entradas: linhas[data]?.entradas ?? 0, saidas: linhas[data]?.saidas ?? 0 }
  })
}

test('um dia sem nada (domingo, 04/10/2026) sai inteiro, com zeros, listas vazias e saldo e folgas vazios, sem erro', async () => {
  const zero = { parcelas: 0, valor: 0 }
  assert.deepEqual(await responder(c, 'financeiro', '2026-10-04'), {
    fonte: 'meuerp',
    contas_a_pagar: { vencidas: zero, ate_7_dias: zero, ate_30_dias: zero, total: zero, por_vencimento: [] },
    saldo_banco: null,
    folga_7: null,
    folga_30: null,
    fluxo_realizado: { dia: { entradas: semEntrada, saidas: 0 }, mes: { entradas: semEntrada, saidas: 0 } },
    recebiveis_cartao: { credito_em: '2026-10-05', valor: 0 },
    fluxo_previsto: previsto('2026-10-04'),
    caixa: { fechamentos: [], gaveta: { vendas_dinheiro: 0, suprimentos: 0, sangrias: 0, devolucoes_dinheiro: 0, gaveta: 0 } },
  })
})

test('a posição troca de fonte na virada: da mesma dívida, 25/09 usa só a Link e 26/09 só o ERP novo', async () => {
  // A Link com as 3 parcelas abertas em 25/09; no ERP novo, as 2 que venciam antes de 28/09 foram excluídas (C).
  const link = await conta('link')
  await parcela(link, '2026-09-24', '1000.00', 'false')
  await parcela(link, '2026-09-27', '2000.00', 'false')
  await parcela(link, '2026-10-20', '3000.00', 'false')
  const erp = await conta()
  await parcela(erp, '2026-09-24', '1000.00', 'C')
  await parcela(erp, '2026-09-27', '2000.00', 'C')
  await parcela(erp, '2026-10-20', '3000.00')

  const dia25 = await responder(c, 'financeiro', '2026-09-25')
  assert.equal(dia25.fonte, 'link')
  // 25/09: vencida a de 24/09; até 7 dias (25/09 a 02/10) a de 27/09; até 30 (até 25/10) a de 27/09 e a de 20/10.
  assert.deepEqual(dia25.contas_a_pagar, {
    vencidas: { parcelas: 1, valor: 1000 },
    ate_7_dias: { parcelas: 1, valor: 2000 },
    ate_30_dias: { parcelas: 2, valor: 5000 },
    total: { parcelas: 3, valor: 6000 },
    por_vencimento: [
      { vencimento: '2026-09-24', parcelas: 1, valor: 1000 },
      { vencimento: '2026-09-27', parcelas: 1, valor: 2000 },
      { vencimento: '2026-10-20', parcelas: 1, valor: 3000 },
    ],
  })

  const dia26 = await responder(c, 'financeiro', '2026-09-26')
  assert.equal(dia26.fonte, 'meuerp')
  // 26/09: só a de 20/10 do ERP novo, dentro de 30 dias (até 26/10) e fora de 7 (até 03/10).
  assert.deepEqual(dia26.contas_a_pagar, {
    vencidas: { parcelas: 0, valor: 0 },
    ate_7_dias: { parcelas: 0, valor: 0 },
    ate_30_dias: { parcelas: 1, valor: 3000 },
    total: { parcelas: 1, valor: 3000 },
    por_vencimento: [{ vencimento: '2026-10-20', parcelas: 1, valor: 3000 }],
  })
})

test('contas a pagar em 06/10: vencidas, até 7 dias, até 30 dias e total, com os limites, e por vencimento', async () => {
  const cp = await conta()
  await parcela(cp, '2026-10-01', '100.00') // vencida
  await parcela(cp, '2026-10-05', '200.50') // vencida
  await parcela(cp, '2026-10-06', '300.00') // vence no dia: até 7 e até 30
  await parcela(cp, '2026-10-13', '400.00') // dia + 7: até 7 e até 30
  await parcela(cp, '2026-10-14', '500.00') // dia + 8: só até 30
  await parcela(cp, '2026-11-05', '600.00') // dia + 30: até 30
  await parcela(cp, '2026-11-06', '700.00') // dia + 31: só no total
  // A nota de entrada (natureza 5, papel compra) também é conta, e vence no mesmo dia que a de 400,00.
  const nota = await inserirDocumento(c, { modelo: '55', natureza: '5', naturezaId: natureza.nota, criadoEm: '2026-10-02 09:00:00' })
  await parcela(nota, '2026-10-13', '50.25', 'P', '2026-10-02')

  const { contas_a_pagar } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(contas_a_pagar, {
    vencidas: { parcelas: 2, valor: 300.5 }, // 100,00 + 200,50
    ate_7_dias: { parcelas: 3, valor: 750.25 }, // 300,00 + 400,00 + 50,25
    ate_30_dias: { parcelas: 5, valor: 1850.25 }, // 750,25 + 500,00 + 600,00
    total: { parcelas: 8, valor: 2850.75 }, // 300,50 + 1.850,25 + 700,00
    por_vencimento: [
      { vencimento: '2026-10-01', parcelas: 1, valor: 100 },
      { vencimento: '2026-10-05', parcelas: 1, valor: 200.5 },
      { vencimento: '2026-10-06', parcelas: 1, valor: 300 },
      { vencimento: '2026-10-13', parcelas: 2, valor: 450.25 },
      { vencimento: '2026-10-14', parcelas: 1, valor: 500 },
      { vencimento: '2026-11-05', parcelas: 1, valor: 600 },
      { vencimento: '2026-11-06', parcelas: 1, valor: 700 },
    ],
  })
})

test('fora da posição: parcela cancelada, conta cancelada, lançada depois do dia, já quitada, crédito de troca e sangria', async () => {
  const cp = await conta()
  await parcela(cp, '2026-10-10', '999.00', 'C') // parcela cancelada
  await parcela(cp, '2026-10-10', '777.00', 'P', '2026-10-07') // lançada depois do dia
  const quitada = await parcela(cp, '2026-10-10', '500.00')
  await inserirBaixa(c, quitada, { pagoEm: '2026-10-02', valor: '500.00', forma: '2', status: 'E' })
  await parcela(cp, '2026-10-20', '123.45') // a única em aberto
  const cancelada = await inserirDocumento(c, { modelo: 'CP', status: 'C', criadoEm: '2026-09-01 00:00:00' })
  await parcela(cancelada, '2026-10-10', '888.00')
  // O crédito de troca e a sangria têm parcela, mas não são conta.
  const credito = await troca('2026-10-03 10:00:00', [['5', '666.00']])
  await parcela(credito, '2026-10-10', '666.00', 'P', '2026-10-03')
  const sangria = await semNatureza('RS', '2026-10-03 11:00:00', [['1', '55.00']])
  await parcela(sangria, '2026-10-10', '55.00', 'P', '2026-10-03')

  const { contas_a_pagar } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(contas_a_pagar.total, { parcelas: 1, valor: 123.45 })
  assert.deepEqual(contas_a_pagar.por_vencimento, [{ vencimento: '2026-10-20', parcelas: 1, valor: 123.45 }])
})

test('baixa parcial: fica em aberto o que falta; a baixa cancelada e a baixa depois do dia não contam', async () => {
  const cp = await conta()
  const p = await parcela(cp, '2026-10-10', '1000.00')
  await inserirBaixa(c, p, { pagoEm: '2026-10-02', valor: '400.00', forma: '2', status: 'E' })
  await inserirBaixa(c, p, { pagoEm: '2026-10-03', valor: '250.00', forma: '2', status: 'C' }) // cancelada
  await inserirBaixa(c, p, { pagoEm: '2026-10-07', valor: '100.00', forma: '2', status: 'E' }) // depois de 06/10

  // 06/10: 1.000,00 − 400,00 = 600,00, que vence em 10/10 (até 7 dias). 07/10: − 100,00 = 500,00.
  const dia6 = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(dia6.contas_a_pagar.ate_7_dias, { parcelas: 1, valor: 600 })
  assert.deepEqual(dia6.contas_a_pagar.total, { parcelas: 1, valor: 600 })
  const dia7 = await responder(c, 'financeiro', '2026-10-07')
  assert.deepEqual(dia7.contas_a_pagar.total, { parcelas: 1, valor: 500 })
})

test('saldo do banco e folga: vale o último saldo digitado até o dia; sem saldo, saldo e folgas vazios', async () => {
  const cp = await conta()
  await parcela(cp, '2026-10-02', '1000.00') // vencida em 06/10
  await parcela(cp, '2026-10-10', '2000.00') // até 7 dias
  await parcela(cp, '2026-10-30', '4000.00') // até 30 dias
  await parcela(cp, '2026-11-20', '8000.00') // depois de 30 dias

  const semSaldo = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual([semSaldo.saldo_banco, semSaldo.folga_7, semSaldo.folga_30], [null, null, null])

  await c.query(`insert into kaizen.saldo_banco (data, valor) values ('2026-10-05', '5000.00'), ('2026-10-07', '99999.00')`)
  const comSaldo = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(comSaldo.saldo_banco, { data: '2026-10-05', valor: 5000 })
  assert.equal(comSaldo.folga_7, 2000) // 5.000,00 − (1.000,00 + 2.000,00)
  assert.equal(comSaldo.folga_30, -2000) // 5.000,00 − (1.000,00 + 2.000,00 + 4.000,00)
})

test('a venda no cartão do dia D entra no realizado e no previsto de D+1, e não no realizado de D', async () => {
  await venda('2026-10-05 10:00:00', [['2', '70.00'], ['3', '150.00'], ['4', '25.00']])

  const d = await responder(c, 'financeiro', '2026-10-05')
  assert.deepEqual(d.fluxo_realizado.dia.entradas, { ...semEntrada, pix: 70 })
  assert.deepEqual(d.recebiveis_cartao, { credito_em: '2026-10-06', valor: 175 }) // 150,00 + 25,00
  assert.deepEqual(d.fluxo_previsto[0], { data: '2026-10-06', entradas: 175, saidas: 0 })

  const d1 = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(d1.fluxo_realizado.dia.entradas, { ...semEntrada, credito: 150, debito: 25 })
  assert.deepEqual(d1.fluxo_realizado.mes.entradas, { ...semEntrada, pix: 70, credito: 150, debito: 25 })
})

test('entradas por forma no ERP novo: pix 2 e 6, crédito 3 e 7, débito 4 e 8, dinheiro 1; o vale (5) fica fora', async () => {
  await venda('2026-10-05 10:00:00', [['2', '70.00'], ['3', '150.00'], ['4', '25.00']])
  await venda('2026-10-06 09:30:00', [
    ['1', '100.00'], ['2', '200.00'], ['6', '50.00'], ['3', '300.00'], ['7', '20.00'], ['4', '80.00'], ['8', '10.00'], ['5', '40.00'],
  ])

  const d6 = await responder(c, 'financeiro', '2026-10-06')
  // Dia: dinheiro e pix de 06/10; crédito e débito da venda de 05/10.
  assert.deepEqual(d6.fluxo_realizado.dia, { entradas: { ...semEntrada, dinheiro: 100, pix: 250, credito: 150, debito: 25 }, saidas: 0 })
  // Mês até 06/10: pix 70,00 + 250,00; o cartão de 06/10 só entra em 07/10.
  assert.deepEqual(d6.fluxo_realizado.mes, { entradas: { ...semEntrada, dinheiro: 100, pix: 320, credito: 150, debito: 25 }, saidas: 0 })
  assert.deepEqual(d6.recebiveis_cartao, { credito_em: '2026-10-07', valor: 410 }) // 300 + 20 + 80 + 10

  const d7 = await responder(c, 'financeiro', '2026-10-07')
  assert.deepEqual(d7.fluxo_realizado.dia.entradas, { ...semEntrada, credito: 320, debito: 90 })
})

test('entradas da Link: o dinheiro devolvido já vem negativo, cheque e banco vão para outras, o vale (2.1.2.03) fica fora', async () => {
  await venda('2026-09-15 16:20:00', [
    ['Dinheiro', '30.00'], ['1.1.1.01', '-10.00'], ['Pix', '40.00'], ['Cartao/true', '50.00'], ['Cartao/false', '60.00'],
    ['cartao', '70.00'], ['cheque', '80.00'], ['1.1.1.02.01', '90.00'], ['2.1.2.03', '25.00'],
  ], 'link')

  const d15 = await responder(c, 'financeiro', '2026-09-15')
  assert.deepEqual(d15.fluxo_realizado.dia.entradas, { ...semEntrada, dinheiro: 20, pix: 40, outras: 170 }) // 30 − 10; 80 + 90
  assert.deepEqual(d15.recebiveis_cartao, { credito_em: '2026-09-16', valor: 180 }) // 50 + 60 + 70
  const d16 = await responder(c, 'financeiro', '2026-09-16')
  assert.deepEqual(d16.fluxo_realizado.dia.entradas, { ...semEntrada, credito: 50, debito: 60, cartao: 70 })
})

test('os pagamentos das contas a pagar (CP, forma 1) não entram nas entradas nem na gaveta', async () => {
  const cp = await inserirDocumento(c, { modelo: 'CP', criadoEm: '2026-10-06 08:00:00' })
  await inserirPagamento(c, cp, { forma: '1', valor: '5000.00' })
  await parcela(cp, '2026-10-30', '5000.00', 'P', '2026-10-06')
  await venda('2026-10-06 09:00:00', [['1', '100.00']])

  const r = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(r.fluxo_realizado.dia.entradas, { ...semEntrada, dinheiro: 100 })
  assert.deepEqual(r.caixa.gaveta, { vendas_dinheiro: 100, suprimentos: 0, sangrias: 0, devolucoes_dinheiro: 0, gaveta: 100 })
})

test('saídas: baixas válidas das contas pela data da baixa, menos a forma troca, mais o dinheiro devolvido nas trocas', async () => {
  const cp = await conta()
  const p = await parcela(cp, '2026-10-10', '1000.00')
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '300.00', forma: '1', status: 'E' })
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '200.00', forma: '2', status: 'E' })
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '150.00', forma: '2', status: 'C' }) // cancelada
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '50.00', forma: '5', status: 'E' }) // forma troca
  await inserirBaixa(c, p, { pagoEm: '2026-10-05', valor: '100.00', forma: '2', status: 'E' }) // outro dia do mês
  const nota = await inserirDocumento(c, { modelo: '55', natureza: '5', naturezaId: natureza.nota, criadoEm: '2026-10-01 09:00:00' })
  const pn = await parcela(nota, '2026-10-06', '70.00', 'P', '2026-10-01')
  await inserirBaixa(c, pn, { pagoEm: '2026-10-06', valor: '70.00', forma: '2', status: 'E' })
  // A baixa da sangria não é saída: a sangria não é conta.
  const sangria = await semNatureza('RS', '2026-10-06 11:00:00', [['1', '96.00']])
  const ps = await parcela(sangria, '2026-10-06', '96.00', 'B', '2026-10-06')
  await inserirBaixa(c, ps, { pagoEm: '2026-10-06', valor: '96.00', forma: '1', status: 'E' })
  // A troca devolveu 18,00 em dinheiro; os 30,00 de vale (forma 5) não são saída.
  await troca('2026-10-06 15:00:00', [['1', '18.00'], ['5', '30.00']])

  const r = await responder(c, 'financeiro', '2026-10-06')
  assert.equal(r.fluxo_realizado.dia.saidas, 588) // 300 + 200 + 70 + 18
  assert.equal(r.fluxo_realizado.mes.saidas, 688) // 588 + 100 de 05/10
})

test('uma troca com R$ 18,00 devolvidos em dinheiro aumenta as saídas em 18,00 e diminui a gaveta em 18,00', async () => {
  await venda('2026-10-06 09:00:00', [['1', '100.00']])
  const cp = await conta()
  const p = await parcela(cp, '2026-10-10', '300.00')
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '300.00', forma: '2', status: 'E' })

  const antes = await responder(c, 'financeiro', '2026-10-06')
  assert.equal(antes.fluxo_realizado.dia.saidas, 300)
  assert.equal(antes.caixa.gaveta.gaveta, 100)

  await troca('2026-10-06 15:00:00', [['1', '18.00']])
  const depois = await responder(c, 'financeiro', '2026-10-06')
  assert.equal(depois.fluxo_realizado.dia.saidas, 318)
  assert.deepEqual(depois.caixa.gaveta, { vendas_dinheiro: 100, suprimentos: 0, sangrias: 0, devolucoes_dinheiro: 18, gaveta: 82 })
})

test('gaveta: vendas em dinheiro com o troco negativo + suprimentos − sangrias − dinheiro das trocas, nas duas fontes', async () => {
  // ERP novo, 06/10: 150,00 − 20,00 de troco; o pix não é gaveta; a venda de 05/10 é de outro dia.
  await venda('2026-10-06 09:00:00', [['1', '150.00'], ['1', '-20.00'], ['2', '45.00']])
  await venda('2026-10-05 09:00:00', [['1', '999.00']])
  await semNatureza('SF', '2026-10-06 07:00:00', [['1', '200.00']])
  await semNatureza('SD', '2026-10-06 13:00:00', [['1', '50.00']])
  await semNatureza('RS', '2026-10-06 11:00:00', [['1', '96.00']])
  await semNatureza('RT', '2026-10-06 17:00:00', [['1', '104.00']])
  await troca('2026-10-06 15:00:00', [['1', '18.00']])
  const erp = await responder(c, 'financeiro', '2026-10-06')
  // 130 + 250 − 200 − 18 = 162
  assert.deepEqual(erp.caixa.gaveta, { vendas_dinheiro: 130, suprimentos: 250, sangrias: 200, devolucoes_dinheiro: 18, gaveta: 162 })

  // Link, 15/09: 50,00 − 30,00 devolvidos (1.1.1.01 negativo); suprimento e sangria no 1.1.1.01.
  await venda('2026-09-15 10:00:00', [['Dinheiro', '50.00'], ['1.1.1.01', '-30.00']], 'link')
  await semNatureza('Suprimento/true', '2026-09-15 07:30:00', [['1.1.1.01', '100.00']], 'link')
  await semNatureza('Sangria/true', '2026-09-15 12:00:00', [['1.1.1.01', '40.00']], 'link')
  const link = await responder(c, 'financeiro', '2026-09-15')
  // 20 + 100 − 40 − 0 = 80
  assert.deepEqual(link.caixa.gaveta, { vendas_dinheiro: 20, suprimentos: 100, sangrias: 40, devolucoes_dinheiro: 0, gaveta: 80 })
})

test('fechamentos do dia: quebra = informado − calculado, por forma e por fechamento, sem a forma troca', async () => {
  const f1 = await inserirDocumento(c, { modelo: 'FC', codigo: '301', criadoEm: '2026-10-06 12:00:00' })
  await inserirConferencia(c, f1, { forma: '1', calculado: '500.00', informado: '495.00' })
  await inserirConferencia(c, f1, { forma: '2', calculado: '1200.00', informado: '1200.00' })
  await inserirConferencia(c, f1, { forma: '6', calculado: '100.00', informado: '110.00' }) // também pix
  await inserirConferencia(c, f1, { forma: '3', calculado: '30.50', informado: '0.00' })
  await inserirConferencia(c, f1, { forma: '4', calculado: '63.00', informado: '63.00' })
  await inserirConferencia(c, f1, { forma: '5', calculado: '40.00', informado: '0.00' }) // troca: fora
  const f2 = await inserirDocumento(c, { modelo: 'FC', codigo: '305', criadoEm: '2026-10-06 18:00:00' })
  await inserirConferencia(c, f2, { forma: '1', calculado: '80.00', informado: '80.00' })
  // Fora: o fechamento cancelado e o de outro dia.
  const cancelado = await inserirDocumento(c, { modelo: 'FC', codigo: '302', status: 'C', criadoEm: '2026-10-06 12:05:00' })
  await inserirConferencia(c, cancelado, { forma: '1', calculado: '10.00', informado: '0.00' })
  const outroDia = await inserirDocumento(c, { modelo: 'FC', codigo: '290', criadoEm: '2026-10-05 18:00:00' })
  await inserirConferencia(c, outroDia, { forma: '1', calculado: '10.00', informado: '0.00' })

  const { caixa } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(caixa.fechamentos, [
    {
      codigo: '301',
      quebra: -25.5, // −30,50 + 0 − 5,00 + 10,00
      formas: [
        { forma: 'credito', calculado: 30.5, informado: 0, quebra: -30.5 },
        { forma: 'debito', calculado: 63, informado: 63, quebra: 0 },
        { forma: 'dinheiro', calculado: 500, informado: 495, quebra: -5 },
        { forma: 'pix', calculado: 1300, informado: 1310, quebra: 10 }, // formas 2 e 6
      ],
    },
    { codigo: '305', quebra: 0, formas: [{ forma: 'dinheiro', calculado: 80, informado: 80, quebra: 0 }] },
  ])
})

test('um mês que começa na Link e termina no ERP novo soma as entradas e as saídas das duas fontes', async () => {
  // Link: pix em 02/09; débito em 25/09, que entra em 26/09; uma baixa em 10/09.
  await venda('2026-09-02 10:00:00', [['Pix', '1000.00']], 'link')
  await venda('2026-09-25 17:00:00', [['Cartao/false', '200.00']], 'link')
  const contaLink = await conta('link')
  const pl = await parcela(contaLink, '2026-09-10', '500.00', 'true')
  await inserirBaixa(c, pl, { pagoEm: '2026-09-10', valor: '500.00', forma: '1.1.1.02.01', status: 'true' })
  // ERP novo: venda e baixa em 28/09.
  await venda('2026-09-28 09:00:00', [['2', '300.00'], ['1', '40.00']])
  const cp = await conta()
  const pe = await parcela(cp, '2026-10-10', '1000.00')
  await inserirBaixa(c, pe, { pagoEm: '2026-09-28', valor: '250.00', forma: '2', status: 'E' })
  // Fora: o teste do dono no ERP novo em 25/09, dia da Link.
  await venda('2026-09-25 11:00:00', [['2', '999.00']])
  await inserirBaixa(c, pe, { pagoEm: '2026-09-25', valor: '88.00', forma: '2', status: 'E' })

  const d26 = await responder(c, 'financeiro', '2026-09-26')
  assert.deepEqual(d26.fluxo_realizado.dia.entradas, { ...semEntrada, debito: 200 }) // o cartão da Link de 25/09

  const d29 = await responder(c, 'financeiro', '2026-09-29')
  assert.equal(d29.fonte, 'meuerp')
  assert.deepEqual(d29.fluxo_realizado, {
    dia: { entradas: semEntrada, saidas: 0 },
    // pix 1.000,00 (Link) + 300,00 (ERP novo); saídas 500,00 (Link) + 250,00 (ERP novo)
    mes: { entradas: { ...semEntrada, dinheiro: 40, pix: 1300, debito: 200 }, saidas: 750 },
  })
})

test('fluxo previsto: os 30 dias depois do dia, com os recebíveis de cartão e as contas que vencem em cada um', async () => {
  await venda('2026-10-06 10:00:00', [['3', '300.00']])
  const cp = await conta()
  await parcela(cp, '2026-10-01', '100.00') // vencida: fora do previsto
  await parcela(cp, '2026-10-06', '200.00') // vence no próprio dia: fora do previsto
  await parcela(cp, '2026-10-07', '400.00')
  await parcela(cp, '2026-10-20', '500.00')
  await parcela(cp, '2026-10-20', '60.00')
  await parcela(cp, '2026-11-05', '600.00') // dia + 30: o último do previsto
  await parcela(cp, '2026-11-06', '700.00') // dia + 31: fora

  const { fluxo_previsto } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(fluxo_previsto, previsto('2026-10-06', {
    '2026-10-07': { entradas: 300, saidas: 400 },
    '2026-10-20': { saidas: 560 },
    '2026-11-05': { saidas: 600 },
  }))
})
```

Por que cada valor é o certo, pela spec (seção 8.4 e decisão 16):
- **Fonte da posição**: até 25/09/2026 a Link, a partir de 26/09/2026 o ERP novo. No teste da virada, a mesma dívida está nas duas fontes; em 25/09 só as 3 parcelas da Link contam (R$ 6.000,00), e em 26/09 só a parcela pendente do ERP novo (R$ 3.000,00), porque as outras duas estão canceladas lá (a exclusão do dono). O documento CP do ERP novo fecha em 28/09, e mesmo assim as parcelas dele contam em 26/09: a data que vale é a do lançamento da parcela (`lancado_em`, 01/09).
- **Faixas**: vencida é a que venceu antes do dia; "até 7 dias" vai do próprio dia até o dia + 7, e "até 30 dias" do próprio dia até o dia + 30 (contém a de até 7). Em 06/10: a de 06/10 e a de 13/10 são de até 7; a de 14/10 só de até 30; a de 05/11 (dia + 30) ainda é de até 30; a de 06/11 só entra no total.
- **Em aberto**: valor menos as baixas válidas com data até o dia, se maior que zero. A baixa parcial de 400,00 deixa 600,00; a cancelada (250,00) não conta; a de 07/10 só conta a partir de 07/10. Parcela cancelada, documento cancelado (fora de `documento_papel`), parcela lançada depois do dia e parcela quitada ficam fora; o crédito de troca (papel `troca`) e a sangria têm parcela, mas não são conta.
- **Folga**: com saldo de 5.000,00 em 05/10, em 06/10: 5.000,00 − (1.000,00 vencida + 2.000,00 até 7 dias) = 2.000,00; em 30 dias, − 4.000,00 a mais = −2.000,00. O saldo de 07/10 é depois do dia e não vale.
- **Entradas**: pagamentos das vendas, menos a forma troca. Dinheiro, Pix e outras entram no dia da venda; crédito, débito e cartão no dia seguinte, pela fonte do dia da venda (o débito da Link de 25/09 entra em 26/09). Na Link, o dinheiro devolvido (1.1.1.01) já vem negativo: 30,00 − 10,00 = 20,00; cheque e banco (1.1.1.02.01) vão para outras: 80,00 + 90,00 = 170,00.
- **Saídas**: em 06/10, 300,00 + 200,00 (baixas válidas da conta) + 70,00 (baixa da nota, papel compra) + 18,00 (dinheiro da troca) = 588,00; ficam fora a baixa cancelada (150,00), a baixa na forma troca (50,00), a baixa da sangria (96,00) e o vale da troca (30,00). O mês soma a baixa de 05/10: 688,00.
- **Mês da virada**: em 29/09, pix 1.000,00 (Link, 02/09) + 300,00 (ERP novo, 28/09); saídas 500,00 (Link, 10/09) + 250,00 (ERP novo, 28/09) = 750,00. A venda e a baixa do ERP novo com data de 25/09 (o teste do dono) ficam fora: 25/09 é dia da Link.
- **Gaveta**: ERP novo, 06/10: (150,00 − 20,00 de troco) + (200,00 + 50,00) − (96,00 + 104,00) − 18,00 = 162,00. Link, 15/09: (50,00 − 30,00 devolvidos) + 100,00 − 40,00 = 80,00.
- **Fechamentos**: quebra = informado − calculado por forma traduzida, sem a troca; as formas 2 e 6 são uma linha de pix (1.300,00 calculado, 1.310,00 informado). No 301: −30,50 (crédito) + 0 (débito) − 5,00 (dinheiro) + 10,00 (pix) = −25,50. O fechamento cancelado e o de 05/10 ficam fora.
- **Fluxo previsto**: de 07/10 a 05/11 (30 linhas). Em 07/10, entradas 300,00 (o crédito vendido em 06/10) e saídas 400,00; em 20/10, 500,00 + 60,00 = 560,00; em 05/11, 600,00. A vencida (01/10), a que vence no próprio dia (06/10) e a de 06/11 não estão no previsto.

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/regras-financeiro.test.mts`
Saída esperada: falha, com `ℹ tests 16`, `ℹ pass 0` e `ℹ fail 16`:
```
✖ um dia sem nada (domingo, 04/10/2026) sai inteiro, com zeros, listas vazias e saldo e folgas vazios, sem erro
✖ a posição troca de fonte na virada: da mesma dívida, 25/09 usa só a Link e 26/09 só o ERP novo
✖ contas a pagar em 06/10: vencidas, até 7 dias, até 30 dias e total, com os limites, e por vencimento
✖ fora da posição: parcela cancelada, conta cancelada, lançada depois do dia, já quitada, crédito de troca e sangria
✖ baixa parcial: fica em aberto o que falta; a baixa cancelada e a baixa depois do dia não contam
✖ saldo do banco e folga: vale o último saldo digitado até o dia; sem saldo, saldo e folgas vazios
✖ a venda no cartão do dia D entra no realizado e no previsto de D+1, e não no realizado de D
✖ entradas por forma no ERP novo: pix 2 e 6, crédito 3 e 7, débito 4 e 8, dinheiro 1; o vale (5) fica fora
✖ entradas da Link: o dinheiro devolvido já vem negativo, cheque e banco vão para outras, o vale (2.1.2.03) fica fora
✖ os pagamentos das contas a pagar (CP, forma 1) não entram nas entradas nem na gaveta
✖ saídas: baixas válidas das contas pela data da baixa, menos a forma troca, mais o dinheiro devolvido nas trocas
✖ uma troca com R$ 18,00 devolvidos em dinheiro aumenta as saídas em 18,00 e diminui a gaveta em 18,00
✖ gaveta: vendas em dinheiro com o troco negativo + suprimentos − sangrias − dinheiro das trocas, nas duas fontes
✖ fechamentos do dia: quebra = informado − calculado, por forma e por fechamento, sem a forma troca
✖ um mês que começa na Link e termina no ERP novo soma as entradas e as saídas das duas fontes
✖ fluxo previsto: os 30 dias depois do dia, com os recebíveis de cartão e as contas que vencem em cada um
```
todos com o mesmo motivo, porque a regra ainda não existe: `Error: ENOENT: no such file or directory, open '…\sql\regras\financeiro.sql'` (no Windows; em outro sistema, `…/sql/regras/financeiro.sql`).

Se o motivo for outro, pare e avise o orquestrador: `Cannot find module …/tradutor/indicadores.mts` ou `…/tradutor/apoio-regras.mts` quer dizer que a tarefa 7 ou a 6 não está na branch; `relation "kaizen.documento_papel" does not exist`, que a migração 012 não está.

- [ ] **Passo 3: Escrever a regra**

Um único `select` com o dia em `$1`, que devolve uma linha com a coluna `resposta`, sem `;` no fim (a tarefa 10 põe o arquivo dentro de um `insert … select … from (<arquivo>) r`). A fonte de cada documento é conferida pela data dele, com a mesma expressão (`case when <data> <= date '2026-09-25' then 'link' else 'meuerp' end`): na posição, pela data do dia pedido; nas entradas e na gaveta, pelo dia do documento; nas saídas, pela data da baixa. Nenhum número passa pelo JavaScript.

Crie `sql/regras/financeiro.sql`:

```sql
-- Financeiro do dia $1 (spec da Fase 4, seção 8.4). Dois cortes (decisão 16): a posição do dia (contas a pagar,
-- folgas, fluxo previsto) usa uma fonte só, a Link até 25/09/2026 e o ERP novo a partir de 26/09/2026; os fluxos
-- (realizado, recebíveis, caixa) usam a fonte de cada dia, e o mês soma os dias, cada um pela sua fonte.
-- Dinheiro: soma sem arredondar e round(…, 2) só no total.
with dia as (
  select
    $1::date as d,
    date_trunc('month', $1::date::timestamp)::date as inicio_mes,
    case when $1::date <= date '2026-09-25' then 'link' else 'meuerp' end as fonte
),
-- Parcela em aberto no fim do dia: de conta a pagar ou compra, lançada até o dia, não cancelada, e com o valor
-- menos as baixas válidas até o dia maior que zero. O valor dela é o que falta pagar.
aberta as (
  select pa.vencimento, pa.valor - coalesce(bx.pago, 0) as valor
  from dia
  join kaizen.documento_papel dp on dp.fonte = dia.fonte and dp.papel in ('conta_pagar', 'compra')
  join kaizen.parcela pa on pa.documento_id = dp.id
  left join kaizen.traducao tp on tp.fonte = dp.fonte and tp.campo = 'status_parcela' and tp.codigo = pa.status
  cross join lateral (
    select sum(b.valor) as pago
    from kaizen.baixa b
    join kaizen.traducao tb on tb.fonte = dp.fonte and tb.campo = 'status_baixa' and tb.codigo = b.status
    where b.parcela_id = pa.id and tb.valor = 'valida' and b.pago_em <= dia.d
  ) bx
  where pa.lancado_em <= dia.d and tp.valor is distinct from 'cancelada' and pa.valor - coalesce(bx.pago, 0) > 0
),
posicao as (
  select
    count(*) filter (where a.vencimento < dia.d) as vencidas_parcelas,
    coalesce(sum(a.valor) filter (where a.vencimento < dia.d), 0) as vencidas,
    count(*) filter (where a.vencimento between dia.d and dia.d + 7) as ate_7_parcelas,
    coalesce(sum(a.valor) filter (where a.vencimento between dia.d and dia.d + 7), 0) as ate_7,
    count(*) filter (where a.vencimento between dia.d and dia.d + 30) as ate_30_parcelas,
    coalesce(sum(a.valor) filter (where a.vencimento between dia.d and dia.d + 30), 0) as ate_30,
    count(*) as total_parcelas,
    coalesce(sum(a.valor), 0) as total
  from aberta a
  cross join dia
),
saldo as (
  select s.data, s.valor
  from dia
  join kaizen.saldo_banco s on s.data <= dia.d
  order by s.data desc
  limit 1
),
-- Pagamentos dos documentos do caixa, cada documento pela fonte do dia dele, com a forma traduzida.
pagamento as (
  select dp.dia, dp.papel, tf.valor as forma, pg.valor
  from kaizen.documento_papel dp
  join kaizen.documento_pagamento pg on pg.documento_id = dp.id
  left join kaizen.traducao tf on tf.fonte = dp.fonte and tf.campo = 'forma' and tf.codigo = pg.forma
  where dp.papel in ('venda', 'troca', 'suprimento', 'suprimento_adicional', 'sangria')
    and dp.fonte = case when dp.dia <= date '2026-09-25' then 'link' else 'meuerp' end
),
-- Entradas: pagamentos das vendas, menos o vale (forma troca). Crédito, débito e cartão entram no dia seguinte
-- ao da venda (o recebível); dinheiro, Pix e as outras formas, no dia da venda.
entrada as (
  select
    case when p.forma in ('credito', 'debito', 'cartao') then p.dia + 1 else p.dia end as dia,
    case when p.forma in ('dinheiro', 'pix', 'credito', 'debito', 'cartao') then p.forma else 'outras' end as forma,
    p.valor
  from pagamento p
  where p.papel = 'venda' and p.forma is distinct from 'troca'
),
-- Saídas: baixas válidas das contas a pagar, pela data da baixa e pela fonte desse dia, menos a forma troca;
-- mais o dinheiro devolvido nas trocas, no dia da troca.
saida as (
  select b.pago_em as dia, b.valor
  from kaizen.documento_papel dp
  join kaizen.parcela pa on pa.documento_id = dp.id
  join kaizen.baixa b on b.parcela_id = pa.id
  join kaizen.traducao tb on tb.fonte = dp.fonte and tb.campo = 'status_baixa' and tb.codigo = b.status
  left join kaizen.traducao tf on tf.fonte = dp.fonte and tf.campo = 'forma' and tf.codigo = b.forma
  where dp.papel in ('conta_pagar', 'compra') and tb.valor = 'valida' and tf.valor is distinct from 'troca'
    and dp.fonte = case when b.pago_em <= date '2026-09-25' then 'link' else 'meuerp' end
  union all
  select p.dia, p.valor
  from pagamento p
  where p.papel = 'troca' and p.forma = 'dinheiro'
),
fluxo as (
  select
    periodo.nome,
    jsonb_build_object(
      'entradas', (
        select jsonb_build_object(
          'dinheiro', round(coalesce(sum(e.valor) filter (where e.forma = 'dinheiro'), 0), 2),
          'pix', round(coalesce(sum(e.valor) filter (where e.forma = 'pix'), 0), 2),
          'credito', round(coalesce(sum(e.valor) filter (where e.forma = 'credito'), 0), 2),
          'debito', round(coalesce(sum(e.valor) filter (where e.forma = 'debito'), 0), 2),
          'cartao', round(coalesce(sum(e.valor) filter (where e.forma = 'cartao'), 0), 2),
          'outras', round(coalesce(sum(e.valor) filter (where e.forma = 'outras'), 0), 2)
        )
        from entrada e
        where e.dia between periodo.de and dia.d
      ),
      'saidas', (
        select round(coalesce(sum(s.valor), 0), 2)
        from saida s
        where s.dia between periodo.de and dia.d
      )
    ) as conteudo
  from dia
  cross join lateral (values ('dia', dia.d), ('mes', dia.inicio_mes)) as periodo (nome, de)
),
-- Recebível de cartão: as vendas no crédito, no débito ou em cartão do dia, a creditar no dia seguinte.
recebivel as (
  select round(coalesce(sum(p.valor), 0), 2) as valor
  from dia
  join pagamento p on p.dia = dia.d
  where p.papel = 'venda' and p.forma in ('credito', 'debito', 'cartao')
),
fechamento as (
  select d.id, d.fonte, d.codigo, coalesce(d.fechado_em, d.criado_em) as momento
  from dia
  join kaizen.documento_papel dp on dp.fonte = dia.fonte and dp.dia = dia.d and dp.papel = 'fechamento_caixa'
  join kaizen.documento d on d.id = dp.id
),
-- Gaveta do dia, só o dinheiro: o das vendas (com o troco e o dinheiro devolvido da Link, que já vêm negativos),
-- os suprimentos, as sangrias e o dinheiro devolvido nas trocas.
gaveta as (
  select
    coalesce(sum(p.valor) filter (where p.papel = 'venda'), 0) as vendas,
    coalesce(sum(p.valor) filter (where p.papel in ('suprimento', 'suprimento_adicional')), 0) as suprimentos,
    coalesce(sum(p.valor) filter (where p.papel = 'sangria'), 0) as sangrias,
    coalesce(sum(p.valor) filter (where p.papel = 'troca'), 0) as trocas
  from dia
  join pagamento p on p.dia = dia.d
  where p.forma = 'dinheiro'
)
select jsonb_build_object(
  'fonte', dia.fonte,
  'contas_a_pagar', jsonb_build_object(
    'vencidas', jsonb_build_object('parcelas', po.vencidas_parcelas, 'valor', round(po.vencidas, 2)),
    'ate_7_dias', jsonb_build_object('parcelas', po.ate_7_parcelas, 'valor', round(po.ate_7, 2)),
    'ate_30_dias', jsonb_build_object('parcelas', po.ate_30_parcelas, 'valor', round(po.ate_30, 2)),
    'total', jsonb_build_object('parcelas', po.total_parcelas, 'valor', round(po.total, 2)),
    'por_vencimento', coalesce((
      select jsonb_agg(jsonb_build_object(
        'vencimento', to_char(v.vencimento, 'YYYY-MM-DD'), 'parcelas', v.parcelas, 'valor', round(v.valor, 2)
      ) order by v.vencimento)
      from (select a.vencimento, count(*) as parcelas, sum(a.valor) as valor from aberta a group by a.vencimento) v
    ), '[]'::jsonb)
  ),
  'saldo_banco', case when sb.data is not null
    then jsonb_build_object('data', to_char(sb.data, 'YYYY-MM-DD'), 'valor', round(sb.valor, 2)) end,
  'folga_7', round(sb.valor - (po.vencidas + po.ate_7), 2),
  'folga_30', round(sb.valor - (po.vencidas + po.ate_30), 2),
  'fluxo_realizado', (select jsonb_object_agg(f.nome, f.conteudo) from fluxo f),
  'recebiveis_cartao', jsonb_build_object('credito_em', to_char(dia.d + 1, 'YYYY-MM-DD'), 'valor', (select r.valor from recebivel r)),
  'fluxo_previsto', (
    select jsonb_agg(jsonb_build_object(
      'data', to_char(dia.d + n, 'YYYY-MM-DD'),
      'entradas', case when n = 1 then (select r.valor from recebivel r) else 0 end,
      'saidas', round(coalesce((select sum(a.valor) from aberta a where a.vencimento = dia.d + n), 0), 2)
    ) order by n)
    from generate_series(1, 30) as n
  ),
  'caixa', jsonb_build_object(
    'fechamentos', coalesce((
      select jsonb_agg(jsonb_build_object('codigo', f.codigo, 'quebra', q.quebra, 'formas', q.formas) order by f.momento, f.id)
      from fechamento f
      cross join lateral (
        select
          coalesce(jsonb_agg(jsonb_build_object(
            'forma', x.forma, 'calculado', round(x.calculado, 2), 'informado', round(x.informado, 2),
            'quebra', round(x.informado - x.calculado, 2)
          ) order by x.forma), '[]'::jsonb) as formas,
          round(coalesce(sum(x.informado - x.calculado), 0), 2) as quebra
        from (
          -- por forma traduzida (2 e 6 são as duas pix), sem a linha da troca
          select tf.valor as forma, sum(coalesce(cc.calculado, 0)) as calculado, sum(coalesce(cc.informado, 0)) as informado
          from kaizen.conferencia_caixa cc
          left join kaizen.traducao tf on tf.fonte = f.fonte and tf.campo = 'forma' and tf.codigo = cc.forma
          where cc.documento_id = f.id and tf.valor is distinct from 'troca'
          group by tf.valor
        ) x
      ) q
    ), '[]'::jsonb),
    'gaveta', jsonb_build_object(
      'vendas_dinheiro', round(g.vendas, 2),
      'suprimentos', round(g.suprimentos, 2),
      'sangrias', round(g.sangrias, 2),
      'devolucoes_dinheiro', round(g.trocas, 2),
      'gaveta', round(g.vendas + g.suprimentos - g.sangrias - g.trocas, 2)
    )
  )
) as resposta
from dia
cross join posicao po
cross join gaveta g
left join saldo sb on true
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rode: `node --test tradutor/regras-financeiro.test.mts`
Saída esperada: passa, com `ℹ tests 16`, `ℹ pass 16`, `ℹ fail 0` e:
```
✔ um dia sem nada (domingo, 04/10/2026) sai inteiro, com zeros, listas vazias e saldo e folgas vazios, sem erro
✔ a posição troca de fonte na virada: da mesma dívida, 25/09 usa só a Link e 26/09 só o ERP novo
✔ contas a pagar em 06/10: vencidas, até 7 dias, até 30 dias e total, com os limites, e por vencimento
✔ fora da posição: parcela cancelada, conta cancelada, lançada depois do dia, já quitada, crédito de troca e sangria
✔ baixa parcial: fica em aberto o que falta; a baixa cancelada e a baixa depois do dia não contam
✔ saldo do banco e folga: vale o último saldo digitado até o dia; sem saldo, saldo e folgas vazios
✔ a venda no cartão do dia D entra no realizado e no previsto de D+1, e não no realizado de D
✔ entradas por forma no ERP novo: pix 2 e 6, crédito 3 e 7, débito 4 e 8, dinheiro 1; o vale (5) fica fora
✔ entradas da Link: o dinheiro devolvido já vem negativo, cheque e banco vão para outras, o vale (2.1.2.03) fica fora
✔ os pagamentos das contas a pagar (CP, forma 1) não entram nas entradas nem na gaveta
✔ saídas: baixas válidas das contas pela data da baixa, menos a forma troca, mais o dinheiro devolvido nas trocas
✔ uma troca com R$ 18,00 devolvidos em dinheiro aumenta as saídas em 18,00 e diminui a gaveta em 18,00
✔ gaveta: vendas em dinheiro com o troco negativo + suprimentos − sangrias − dinheiro das trocas, nas duas fontes
✔ fechamentos do dia: quebra = informado − calculado, por forma e por fechamento, sem a forma troca
✔ um mês que começa na Link e termina no ERP novo soma as entradas e as saídas das duas fontes
✔ fluxo previsto: os 30 dias depois do dia, com os recebíveis de cartão e as contas que vencem em cada um
```

- [ ] **Passo 5: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 16 testes, todos em `tradutor/regras-financeiro.test.mts`. O arquivo fica com uma única linha:

```text
407
```

- [ ] **Passo 6: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; nenhum `✖`; última linha `rodou 407 testes, esperados 407`.

- [ ] **Passo 7: Commit**

Antes do `EOF`, depois de uma linha em branco, acrescente a linha de atribuição (`Co-Authored-By: …`) que o sistema lhe dá: o plano não fixa nome de modelo.

```bash
git add sql/regras/financeiro.sql tradutor/regras-financeiro.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Regras: o financeiro do dia, com o que se deve, a folga, o dinheiro que entrou e saiu, e o caixa

A consulta sql/regras/financeiro.sql responde, para qualquer dia desde
abril, se a loja tem dinheiro para pagar o que deve: as contas em
aberto no fim do dia (vencidas, até 7 e até 30 dias, total e por
vencimento), o saldo do banco digitado e a folga em 7 e 30 dias, as
entradas por forma e as saídas do dia e do mês, o cartão a receber
amanhã, os próximos 30 dias e o caixa do dia (quebra de cada
fechamento por forma, sem a troca, e a gaveta).

A posição usa a Link até 25/09/2026 e o ERP novo a partir de 26/09,
porque a mesma dívida está nas duas; as entradas e as saídas usam a
fonte de cada dia, e setembro soma as duas. O cartão entra no dia
seguinte ao da venda; os pagamentos das contas a pagar não são
entrada; a troca devolvida em dinheiro é saída e sai da gaveta.
Testes: rodou 407, esperados 407.
EOF
```
Saída esperada: o `git add` pode avisar `LF will be replaced by CRLF` para `testes-esperados.txt` (é só aviso); o hook roda `npm run verificar` e termina com `rodou 407 testes, esperados 407`; o commit sai.

DECISÃO:
- **"Até 7 dias" e "até 30 dias" contam do próprio dia em diante, e a de 30 contém a de 7; vencida é a que venceu antes do dia.** A spec define a folga como "saldo − (vencidas + as que vencem até dia+7 / dia+30)": para a soma não contar a mesma parcela duas vezes, as vencidas ficam fora das faixas, e a parcela que vence no próprio dia, ainda em aberto no fim dele, entra na faixa (ainda não venceu).
- **"Lançada até o dia" é a data da parcela (`parcela.lancado_em`), não o dia do documento.** No ERP novo, as contas importadas estão com o documento fechado em 28/09 e a parcela com a data do lançamento original; pelo dia do documento, 26/09 daria 0 parcelas, e não as 81 da spec. Parcela sem `lancado_em` não entra; no banco do PC, nenhuma parcela de conta está assim.
- **O fluxo previsto tem sempre 30 linhas, do dia seguinte ao 30º dia depois**, com zero nos dias sem nada. "Os próximos 30 dias" começa amanhã, como o recebível de cartão (D+1). A parcela que vence no próprio dia e ainda está em aberto não aparece no previsto; ela está em "até 7 dias", na posição.
- **A gaveta só soma dinheiro**, nas quatro partes (vendas, suprimentos, sangrias e trocas). A spec chama de gaveta o dinheiro na gaveta; hoje todas as sangrias e suprimentos das duas fontes são em dinheiro (forma 1 e 1.1.1.01), então o filtro não muda nenhum número. No banco do PC, a gaveta da regra bate com o dinheiro calculado pelos fechamentos da Link em 140 dos 142 dias com caixa (11/04 sem movimento, zero nos dois; 15/04 com R$ 0,01 de diferença).
- **O dinheiro da troca entra com o sinal gravado**: positivo é dinheiro que saiu da loja (soma nas saídas e desconta da gaveta). O sinal real do ERP novo ainda não foi visto, porque não houve troca até 28/09; se a primeira troca vier negativa, a correção é trocar o sinal nas saídas e na gaveta, na conferência da Fase 2 (spec, seção 8.4 e seção 13).
- **As formas de cada fechamento são agrupadas pela forma traduzida** (2 e 6 viram uma linha de pix; 3 e 7, de crédito; 4 e 8, de débito), em ordem alfabética; os fechamentos vêm pela hora do fechamento. A spec pede "cada forma com forma, calculado, informado, quebra", e duas linhas de pix no mesmo fechamento não seriam uma forma.
- **Soma sem nenhum valor sai 0, não vazia**; vazios são só o saldo e as folgas sem saldo digitado. A regra não tem divisão.
- **`fonte` sai com o código do Kaizen** (`link` ou `meuerp`), o mesmo das tabelas.
- **Forma sem tradução vai para "outras"** nas entradas, no dia da venda. O aviso de código sem tradução da Fase 2 já avisa o dono desse código.
- **Tempo da consulta**, medido só lendo o banco do PC (com as visões da 012 emuladas, porque o banco do PC ainda não tem as migrações 009 a 012): 108 ms de execução mais 18 ms de planejamento em 25/09/2026, e 172 ms mais 29 ms em 15/07/2026. A noite roda a consulta cerca de 182 vezes: de 20 a 37 segundos para o financeiro.

---

### Task 10: a rotina — o cálculo das três respostas na leitura de hora em hora, o aviso de falha e o comando `indicadores`

**Ajustes do orquestrador (revisão do plano inteiro, 29/09) — valem sobre o texto abaixo, e o revisor confere contra eles:**
- Em `calcularRespostas`, a primeira coisa dentro da transação de cada dia é `set local jit = off`: as regras são consultas curtas, e o JIT do Postgres custou de 0,3 a 0,7 s por chamada na tarefa 8; o `set local` vale só para aquela transação, no PC, nos testes e na VPS. Prove com valor concreto que o JIT fica desligado dentro do cálculo (por exemplo, `show jit` na mesma transação num teste, esperando `off`), do jeito mais simples que prove.
- Tire do `execucao-indicadores.test.mts` o `await falso.cliente.query('set jit = off')`: ele cai no ERP falso, que já nasce sem JIT.
- No passo do `npm run verificar`, anote no relatório o tempo total da suíte com as três regras de verdade (use `time`). Acima de 10 minutos, pare e devolva `BLOCKED` com a medição e os arquivos mais lentos.
- Antes de começar, as tarefas 1, 4, 5, 6, 7, 8 e 9 já estão na branch `fase-4`.

**O que esta tarefa entrega, em resultado:** a partir desta tarefa, toda leitura de hora em hora, depois de gravar o que leu do ERP e de conferir, calcula as três respostas do dia (vendas, compras, financeiro) e as grava em `kaizen.resposta`, uma por dia e pergunta, trocando a que havia. A leitura das 22h recalcula todos os dias desde 01/04/2026 (182 dias em 29/09/2026, 546 respostas), para que um feriado ou uma meta digitados depois, ou uma venda que chegou atrasada, apareçam nos dias passados. O registro de cada leitura ganha a contagem `respostas` (3 na hora, 546 na noite de 29/09). Se o cálculo falha, a leitura falha, e o dono recebe pelo Telegram, uma vez só: "Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — (o motivo). Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem."; quando voltar a funcionar, "Kaizen: voltou a funcionar às 15h.". O comando `principal.mts indicadores <dia>…` calcula e grava os dias pedidos e imprime três linhas por dia (o realizado do dia e do mês, a meta, o ritmo e a projeção; a curva ABC, as compras por classe, o encalhe e a ruptura; o a pagar, a folga e a quebra do caixa); um dia antes de 01/04/2026 ou depois de hoje é recusado ("fora da história") e nada é calculado. O comando não entra no registro das leituras e não manda Telegram. São 12 testes novos, num commit.

**Files:**
- Create: `sql/migracoes/013_resposta.sql`
- Create: `tradutor/indicadores.test.mts`, `tradutor/execucao-indicadores.test.mts`
- Modify: `tradutor/indicadores.mts` (três `import` e três funções no fim; o arquivo é da tarefa 7)
- Modify: `tradutor/execucao.mts` (um `import`, o cálculo depois das conferências, a contagem `respostas` e a hora dos dados na falha)
- Modify: `tradutor/tipos.mts` (motivo de falha `indicadores`), `tradutor/telegram.mts` (o texto dele)
- Modify: `tradutor/principal.mts` (um `import`, a linha `USO` e o bloco do comando `indicadores`)
- Modify: `tradutor/telegram.test.mts` (1 teste novo), `tradutor/execucao.test.mts` e `tradutor/principal.test.mts` (a contagem `respostas` em 1 teste de cada)
- Modify: `testes-esperados.txt`

**Interfaces:**
- Consumes:
  - Da tarefa 7, em `tradutor/indicadores.mts`: `export type Pergunta = 'vendas' | 'compras' | 'financeiro'`; `export const PERGUNTAS: Pergunta[] = ['vendas', 'compras', 'financeiro']`; `export function lerRegra(pergunta: Pergunta): string` (o texto de `sql/regras/<pergunta>.sql`); `export async function responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any>` (roda a regra com `[dia]` e devolve `rows[0].resposta`).
  - Das tarefas 7, 8 e 9: `sql/regras/vendas.sql`, `compras.sql` e `financeiro.sql`, cada um **um único `select`**, com o dia em `$1` (`$1::date`), sem `;` no fim, que devolve uma linha com a coluna `resposta` (`jsonb`) com as chaves da seção 8 da spec. As que esta tarefa lê para imprimir: `vendas.dia.realizado`, `vendas.dia.vendas`; `vendas.mes.vendido`, `.devolucoes`, `.realizado`, `.vendas`, `.meta`, `.percentual_meta`, `.ritmo`, `.projecao`; `compras.abc_valor.A/B/C.produtos`; `compras.compras_por_classe.A/B/C/sem_venda`; `compras.estoque_conhecido`; `compras.encalhe.produtos/valor`; `compras.ruptura.produtos`; `financeiro.fonte` (`link` ou `meuerp`); `financeiro.contas_a_pagar.total/vencidas/ate_7_dias` (cada um com `parcelas` e `valor`); `financeiro.saldo_banco` (vazio sem saldo); `financeiro.folga_7`; `financeiro.caixa.fechamentos[].quebra`.
  - Da tarefa 6: `tradutor/apoio-regras.mts` (`inserirNatureza`, `inserirDocumento`, `inserirItem`) e as visões `kaizen.documento_papel` e `kaizen.venda_item` (migração 012).
  - Da tarefa 1, em `tradutor/principal.mts`: os blocos dos comandos `migrar` e `execucoes`, a linha `import { emFortaleza, somarDias } from './janela.mts'` e a linha `USO` terminando em `| migrar | execucoes [AAAA-MM-DD]'`.
  - Da Fase 2, sem mudar: `emTransacao(cliente, fazer)` e `conectar(url)` (`tradutor/banco.mts`); `somarDias(data, dias)` e `emFortaleza(ms)` (`tradutor/janela.mts`); `formatarReais(valor: string)` (`tradutor/avisos.mts`); `executar(opcoes, dependencias)` e o caminho `falhar` (`tradutor/execucao.mts`); `criarBancoKaizen()` (`tradutor/apoio-teste.mts`); `criarErpFalso()` (`tradutor/erp-falso.mts`).
- Produces:
  - A tabela `kaizen.resposta (data date, pergunta text, conteudo jsonb, calculado_em timestamptz)`, chave `(data, pergunta)`, pela migração `013_resposta.sql` (texto do esqueleto).
  - Em `tradutor/indicadores.mts`: `export function diasDaHistoria(hoje: string): string[]` (de `2026-04-01` a `hoje`, inclusive; vazia se `hoje` é antes de 01/04/2026); `export async function calcularRespostas(cliente: Cliente, dias: string[]): Promise<number>` (grava as três perguntas de cada dia, uma transação por dia, sobrescrevendo, e devolve quantas gravou); `export async function linhasDoDia(cliente: Cliente, dia: string): Promise<string[]>` (as três linhas do comando, lidas de `kaizen.resposta`).
  - `TipoFalha` ganha `'indicadores'`; `textoFalha` ganha o texto dele.
  - Em toda execução `ok` ou `aviso`, `contagens.respostas` (a última chave): 3 na `hora`, 3 × os dias da história na `noite`. A linha impressa pelo comando termina em `…, avisos=N, respostas=R`.
  - O comando `node tradutor/principal.mts indicadores AAAA-MM-DD…`: sai com 0 e imprime três linhas por dia; com dia fora da história, sai com 1 e não calcula nenhum; sem dia ou com dia fora do formato `AAAA-MM-DD`, mostra o uso e sai com 2. Com erro no cálculo, imprime `indicadores falha: <motivo>` e sai com 1.

**Antes de começar:** as tarefas 1, 6, 7, 8 e 9 já estão na branch `fase-4` (os testes desta tarefa rodam as três regras de verdade). Rode tudo no Git Bash, a partir da raiz do repositório, com o Postgres local no ar (`docker compose up -d --wait`).

- [ ] **Passo 1: Escrever os testes do cálculo, da impressão e do comando**

Crie `tradutor/indicadores.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { inserirDocumento, inserirItem, inserirNatureza } from './apoio-regras.mts'
import type { Cliente } from './banco.mts'
import { calcularRespostas, diasDaHistoria, linhasDoDia, PERGUNTAS, responder } from './indicadores.mts'
import { principal } from './principal.mts'

// A rotina das respostas (spec da Fase 4, seção 9): a gravação em kaizen.resposta e as três linhas do comando indicadores.
let banco: BancoTeste
let c: Cliente

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
})

after(async () => {
  await banco?.fechar()
})

beforeEach(async () => {
  await c.query('truncate kaizen.resposta, kaizen.documento restart identity cascade')
})

// Uma venda do ERP novo de R$ 150,00 em 28/09/2026 (segunda), pedido 530, produto 60, vendedor Igor (1).
async function vendaDe150(): Promise<void> {
  const n530 = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  const pedido = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: n530, criadoEm: '2026-09-28 10:15:00' })
  await inserirItem(c, pedido, { produto: '60', sentido: 'S', quantidade: '1', valor: '150.00', vendedor: '1' })
}

// Grava uma resposta montada à mão: o JSON vai como texto, com os números escritos como a regra os escreve.
async function gravarResposta(dia: string, pergunta: string, conteudo: string): Promise<void> {
  await c.query('insert into kaizen.resposta (data, pergunta, conteudo) values ($1, $2, $3::jsonb)', [dia, pergunta, conteudo])
}

test('diasDaHistoria vai de 01/04/2026 até o dia pedido, inclusive: 3 dias em 03/04 e 182 em 29/09', () => {
  assert.deepEqual(diasDaHistoria('2026-04-03'), ['2026-04-01', '2026-04-02', '2026-04-03'])
  assert.deepEqual(diasDaHistoria('2026-04-01'), ['2026-04-01'])
  const ate2909 = diasDaHistoria('2026-09-29')
  // abril 30 + maio 31 + junho 30 + julho 31 + agosto 31 + setembro até o dia 29 = 182
  assert.equal(ate2909.length, 182)
  assert.deepEqual(ate2909.slice(29, 32), ['2026-04-30', '2026-05-01', '2026-05-02'])
  assert.equal(ate2909[181], '2026-09-29')
})

test('calcularRespostas grava as três perguntas de cada dia como a regra as devolve, e devolve quantas gravou', async () => {
  await vendaDe150()

  assert.equal(await calcularRespostas(c, ['2026-09-27', '2026-09-28']), 6)

  const { rows } = await c.query('select data, pergunta from kaizen.resposta order by data, pergunta')
  assert.deepEqual(rows, [
    { data: '2026-09-27', pergunta: 'compras' }, { data: '2026-09-27', pergunta: 'financeiro' }, { data: '2026-09-27', pergunta: 'vendas' },
    { data: '2026-09-28', pergunta: 'compras' }, { data: '2026-09-28', pergunta: 'financeiro' }, { data: '2026-09-28', pergunta: 'vendas' },
  ])
  // O conteúdo é o JSON da regra, gravado como veio: igual ao que a regra devolve para o mesmo dia.
  for (const dia of ['2026-09-27', '2026-09-28']) {
    for (const pergunta of PERGUNTAS) {
      const gravada = await c.query('select conteudo from kaizen.resposta where data = $1 and pergunta = $2', [dia, pergunta])
      assert.deepEqual(gravada.rows[0].conteudo, await responder(c, pergunta, dia), `${pergunta} de ${dia}`)
    }
  }
  // A venda de R$ 150,00 é o realizado do dia 28 (spec, seção 8.1).
  const realizado = await c.query(
    `select (conteudo->'dia'->>'realizado')::numeric = 150 as bate from kaizen.resposta where data = '2026-09-28' and pergunta = 'vendas'`,
  )
  assert.equal(realizado.rows[0].bate, true)
})

test('calcularRespostas sobrescreve a resposta que já estava gravada e renova calculado_em; o outro dia fica como estava', async () => {
  const velha = '{"velha": true}'
  await c.query(
    `insert into kaizen.resposta (data, pergunta, conteudo, calculado_em) values
       ('2026-09-27', 'vendas', $1::jsonb, '2000-01-01 00:00:00-03'),
       ('2026-09-28', 'vendas', $1::jsonb, '2000-01-01 00:00:00-03'),
       ('2026-09-28', 'compras', $1::jsonb, '2000-01-01 00:00:00-03'),
       ('2026-09-28', 'financeiro', $1::jsonb, '2000-01-01 00:00:00-03')`,
    [velha],
  )

  assert.equal(await calcularRespostas(c, ['2026-09-28']), 3)

  const { rows } = await c.query(
    `select data, pergunta, conteudo ? 'velha' as velha, calculado_em > '2000-01-01 00:00:00-03' as renovada
       from kaizen.resposta order by data, pergunta`,
  )
  assert.deepEqual(rows, [
    { data: '2026-09-27', pergunta: 'vendas', velha: true, renovada: false },
    { data: '2026-09-28', pergunta: 'compras', velha: false, renovada: true },
    { data: '2026-09-28', pergunta: 'financeiro', velha: false, renovada: true },
    { data: '2026-09-28', pergunta: 'vendas', velha: false, renovada: true },
  ])
})

test('cada dia é gravado numa transação: o dia em que uma resposta falha fica sem nenhuma, e o dia anterior fica gravado', async () => {
  // Só neste teste: o banco recusa a resposta financeira de 28/09.
  await c.query(`alter table kaizen.resposta add constraint recusa_teste check (not (data = '2026-09-28' and pergunta = 'financeiro'))`)
  try {
    await assert.rejects(calcularRespostas(c, ['2026-09-27', '2026-09-28', '2026-09-29']), /recusa_teste/)
    // 27/09: as três. 28/09: vendas e compras foram desfeitas junto com a financeira. 29/09: não chegou a ser calculado.
    const { rows } = await c.query('select data, count(*)::int as respostas from kaizen.resposta group by data order by data')
    assert.deepEqual(rows, [{ data: '2026-09-27', respostas: 3 }])
  } finally {
    await c.query('alter table kaizen.resposta drop constraint recusa_teste')
  }
})

test('as três linhas de um dia com meta, estoque conhecido e saldo do banco; num domingo, ritmo vazio sai "—" e sem fechamento a quebra é zero', async () => {
  // 28/09/2026. Percentual: 44.900,35 ÷ 60.000,00 = 0,7483 → 74,83%. Ritmo: 0,7483 ÷ (22 ÷ 24 dias úteis) = 0,8164
  // (setembro: 26 dias de segunda a sábado, menos 07/09 e 26/09 = 24; até 28/09: 24 − 2 = 22).
  await gravarResposta('2026-09-28', 'vendas', `{
    "dia": {"vendido": 1234.50, "devolucoes": 0, "realizado": 1234.50, "vendas": 7},
    "mes": {"vendido": 45210.35, "devolucoes": 310.00, "realizado": 44900.35, "vendas": 203,
            "meta": 60000.00, "percentual_meta": 0.7483, "ritmo": 0.8164, "projecao": 58300.20}}`)
  await gravarResposta('2026-09-28', 'compras', `{
    "abc_valor": {"A": {"produtos": 212}, "B": {"produtos": 187}, "C": {"produtos": 391}},
    "compras_por_classe": {"A": 14, "B": 9, "C": 11, "sem_venda": 23},
    "estoque_conhecido": true, "encalhe": {"produtos": 312, "valor": 48213.77}, "ruptura": {"produtos": 17}}`)
  // Folga: 20.000,00 − (0,00 vencidas + 15.230,10 até 7 dias) = 4.769,90. Quebra do dia: −3,50 + 1,25 = −2,25.
  await gravarResposta('2026-09-28', 'financeiro', `{
    "fonte": "meuerp",
    "contas_a_pagar": {"total": {"parcelas": 81, "valor": 217491.43}, "vencidas": {"parcelas": 0, "valor": 0},
                       "ate_7_dias": {"parcelas": 6, "valor": 15230.10}},
    "saldo_banco": {"data": "2026-09-28", "valor": 20000.00}, "folga_7": 4769.90,
    "caixa": {"fechamentos": [{"codigo": "2", "quebra": -3.50, "formas": []}, {"codigo": "3", "quebra": 1.25, "formas": []}]}}`)

  assert.deepEqual(await linhasDoDia(c, '2026-09-28'), [
    '28/09/2026 vendas: realizado do dia R$ 1.234,50 (7 vendas); no mês vendido R$ 45.210,35, devoluções R$ 310,00, realizado R$ 44.900,35 (203 vendas), meta R$ 60.000,00 (74,83%), ritmo 0,8164, projeção R$ 58.300,20',
    '28/09/2026 compras: curva A 212, B 187, C 391 produtos; compras do período: A 14, B 9, C 11, sem venda 23; encalhe 312 produtos, R$ 48.213,77; ruptura 17',
    '28/09/2026 financeiro (meuerp): a pagar R$ 217.491,43 em 81 parcelas, vencidas R$ 0,00, até 7 dias R$ 15.230,10; folga em 7 dias R$ 4.769,90; quebra do dia −R$ 2,25',
  ])

  // 01/11/2026 é domingo: com meta e nenhum dia útil decorrido, o ritmo sai vazio (spec, seção 8.2) e a linha diz "—";
  // sem fechamento de caixa, a lista pode vir null, e a quebra do dia é zero.
  await gravarResposta('2026-11-01', 'vendas', `{
    "dia": {"realizado": 0, "vendas": 0},
    "mes": {"vendido": 0, "devolucoes": 0, "realizado": 0, "vendas": 0,
            "meta": 65000.00, "percentual_meta": 0.0000, "ritmo": null, "projecao": 61200.00}}`)
  await gravarResposta('2026-11-01', 'compras', '{}')
  await gravarResposta('2026-11-01', 'financeiro', `{
    "fonte": "meuerp",
    "contas_a_pagar": {"total": {"parcelas": 64, "valor": 171250.00}, "vencidas": {"parcelas": 0, "valor": 0},
                       "ate_7_dias": {"parcelas": 5, "valor": 12400.00}},
    "saldo_banco": null, "folga_7": null, "caixa": {"fechamentos": null}}`)
  const [vendas, , financeiro] = await linhasDoDia(c, '2026-11-01')
  assert.equal(
    vendas,
    '01/11/2026 vendas: realizado do dia R$ 0,00 (0 vendas); no mês vendido R$ 0,00, devoluções R$ 0,00, realizado R$ 0,00 (0 vendas), meta R$ 65.000,00 (0,00%), ritmo —, projeção R$ 61.200,00',
  )
  assert.equal(
    financeiro,
    '01/11/2026 financeiro (meuerp): a pagar R$ 171.250,00 em 64 parcelas, vencidas R$ 0,00, até 7 dias R$ 12.400,00; saldo do banco não digitado; quebra do dia R$ 0,00',
  )
})

test('as três linhas de um dia da Link sem meta, antes de 26/09 e sem saldo do banco', async () => {
  await gravarResposta('2026-06-15', 'vendas', `{
    "dia": {"realizado": 5516.80, "vendas": 41},
    "mes": {"vendido": 70210.45, "devolucoes": 180.00, "realizado": 70030.45, "vendas": 530,
            "meta": null, "percentual_meta": null, "ritmo": null, "projecao": 140120.90}}`)
  await gravarResposta('2026-06-15', 'compras', `{
    "abc_valor": {"A": {"produtos": 198}, "B": {"produtos": 176}, "C": {"produtos": 402}},
    "compras_por_classe": {"A": 20, "B": 12, "C": 8, "sem_venda": 31},
    "estoque_conhecido": false, "encalhe": null, "ruptura": null}`)
  await gravarResposta('2026-06-15', 'financeiro', `{
    "fonte": "link",
    "contas_a_pagar": {"total": {"parcelas": 102, "valor": 263410.08}, "vencidas": {"parcelas": 3, "valor": 4120.00},
                       "ate_7_dias": {"parcelas": 9, "valor": 18650.37}},
    "saldo_banco": null, "folga_7": null, "caixa": {"fechamentos": []}}`)

  assert.deepEqual(await linhasDoDia(c, '2026-06-15'), [
    '15/06/2026 vendas: realizado do dia R$ 5.516,80 (41 vendas); no mês vendido R$ 70.210,45, devoluções R$ 180,00, realizado R$ 70.030,45 (530 vendas), sem meta cadastrada, projeção R$ 140.120,90',
    '15/06/2026 compras: curva A 198, B 176, C 402 produtos; compras do período: A 20, B 12, C 8, sem venda 31; estoque desconhecido antes de 26/09/2026',
    '15/06/2026 financeiro (link): a pagar R$ 263.410,08 em 102 parcelas, vencidas R$ 4.120,00, até 7 dias R$ 18.650,37; saldo do banco não digitado; quebra do dia R$ 0,00',
  ])
})

test('o comando indicadores calcula, grava e imprime as três linhas de cada dia, sem registrar execução nem mandar Telegram', async (t) => {
  await vendaDe150()
  const chamadas: string[] = []
  const fetchFalso = (async (url: string | URL | Request) => {
    chamadas.push(String(url))
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }) as typeof fetch
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  const ambiente = { MEUERP_TOKEN: 'token-de-teste', KAIZEN_URL: banco.url, TELEGRAM_TOKEN: '123:abc', TELEGRAM_CHAT: '42' }

  assert.equal(await principal(['indicadores', '2026-09-28', '2026-06-15'], ambiente, fetchFalso), 0)

  // As linhas impressas são as de kaizen.resposta, na ordem dos dias pedidos.
  assert.deepEqual(impressos, [...(await linhasDoDia(c, '2026-09-28')), ...(await linhasDoDia(c, '2026-06-15'))])
  assert.equal(impressos.length, 6)
  assert.ok(impressos[0].startsWith('28/09/2026 vendas: realizado do dia R$ 150,00 (1 vendas); '), impressos[0])
  assert.ok(impressos[1].startsWith('28/09/2026 compras: curva A '), impressos[1])
  // A posição do financeiro vem do ERP novo a partir de 26/09 e da Link até 25/09 (spec, decisão 16).
  assert.ok(impressos[2].startsWith('28/09/2026 financeiro (meuerp): a pagar '), impressos[2])
  // Antes de 26/09 o estoque é desconhecido (spec, decisão 17).
  assert.ok(impressos[4].endsWith('; estoque desconhecido antes de 26/09/2026'), impressos[4])
  assert.ok(impressos[5].startsWith('15/06/2026 financeiro (link): a pagar '), impressos[5])
  const contas = await c.query(
    'select (select count(*)::int from kaizen.resposta) as respostas, (select count(*)::int from kaizen.execucao) as execucoes',
  )
  assert.deepEqual(contas.rows[0], { respostas: 6, execucoes: 0 })
  assert.deepEqual(chamadas, [])
})

test('o comando indicadores com dia fora da história sai com 1, diz quais, e não calcula nenhum; sem dia ou fora do formato, sai com 2', async (t) => {
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  const ambiente = { MEUERP_TOKEN: 'token-de-teste', KAIZEN_URL: banco.url }

  assert.equal(await principal(['indicadores', '2026-09-28', '2026-03-31', '2099-12-31'], ambiente), 1)
  assert.deepEqual(impressos.splice(0), [
    'indicadores falha: fora da história (de 01/04/2026 até hoje): 2026-03-31, 2099-12-31; nada foi calculado',
  ])
  assert.equal((await c.query('select count(*)::int as n from kaizen.resposta')).rows[0].n, 0)

  assert.equal(await principal(['indicadores'], ambiente), 2)
  assert.equal(await principal(['indicadores', '28/09/2026'], ambiente), 2)
  assert.equal(await principal(['indicadores', '2026-09-28', 'hoje'], ambiente), 2)
})
```

Por que cada valor é o certo:
- **182 dias em 29/09**: abril 30 + maio 31 + junho 30 + julho 31 + agosto 31 + setembro até o dia 29 = 182; o 30º dia é 30/04 e o 31º é 01/05. A noite de 29/09 grava 3 × 182 = 546 respostas.
- **calcularRespostas**: dois dias × três perguntas = 6. O conteúdo gravado é o JSON que a regra devolve para o mesmo dia (`responder`), sem passar pelo JavaScript. O pedido 530 de R$ 150,00 é venda (categoria V, mexe no financeiro), e o item de saída com vendedor é vendido: o realizado de 28/09 é 150 (spec, seção 8.1).
- **Sobrescreve**: das quatro respostas "velhas", as três de 28/09 são trocadas pelo cálculo e ganham `calculado_em` de agora; a de 27/09, que não foi pedida, fica como estava.
- **Transação por dia**: a restrição `recusa_teste`, só deste teste, faz o banco recusar a resposta financeira de 28/09. 27/09 é gravado inteiro antes; em 28/09, vendas e compras entram e são desfeitas junto com a financeira; 29/09 nem começa. Fica só 27/09, com 3.
- **As linhas de 28/09**: dinheiro por `formatarReais` (`R$ 1.234,50`, negativo com `−R$`); o percentual é `percentual_meta` × 100 com 2 casas (0,7483 → 74,83%); o ritmo sai com as 4 casas da regra e vírgula (0,8164); as contagens saem como gravadas. A folga (4.769,90) e o encalhe vêm prontos da regra; a quebra do dia é a soma das quebras dos fechamentos: −3,50 + 1,25 = −2,25.
- **01/11/2026 (domingo)**: com meta e nenhum dia útil decorrido, o ritmo é vazio (spec, 8.2) e sai `—`; 0/65.000 = 0,0000 → `0,00%`. Sem fechamento, a lista de fechamentos pode vir `null`, e a quebra do dia é R$ 0,00.
- **15/06/2026 (Link)**: sem meta → `sem meta cadastrada` no lugar da meta, do percentual e do ritmo; `estoque_conhecido` falso → `estoque desconhecido antes de 26/09/2026`; `saldo_banco` vazio → `saldo do banco não digitado`; fechamentos vazios → quebra R$ 0,00.
- **O comando**: 28/09 é do ERP novo e 15/06 é da Link na posição do financeiro (spec, decisão 16); antes de 26/09 o estoque é desconhecido (decisão 17). Seis linhas (dois dias × três), seis respostas gravadas, nenhuma linha em `kaizen.execucao` e nenhuma chamada ao `fetch` (o Telegram está configurado no ambiente do teste, e mesmo assim nada sai).
- **Fora da história**: 2026-03-31 é antes de 01/04/2026 e 2099-12-31 é depois de hoje; os dois aparecem na mensagem, e nem o dia bom (28/09) é calculado. Sem dia, `28/09/2026` ou `hoje` são comando errado (2), como `execucoes ontem`.

Crie `tradutor/execucao-indicadores.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { executar } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import type { TipoExecucao } from './tipos.mts'

// O cálculo das respostas dentro da execução de hora em hora (spec da Fase 4, seção 9 e seção 12, "Rotina").
let banco: BancoTeste
let falso: ErpFalso
let enviadas: string[] = []

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
  // Sem estatísticas, o Postgres compila a consulta de cadastros com JIT: 1,5 s por chamada em vez de milissegundos.
  await falso.cliente.query('set jit = off')
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  enviadas = []
  await falso.cliente.query(TABELAS_DO_ERP.map((tabela) => `delete from ${tabela}`).join('; '))
  await banco.cliente.query(
    `truncate kaizen.documento, kaizen.estoque_movimento, kaizen.estoque_atual, kaizen.produto,
       kaizen.produto_fornecedor, kaizen.pessoa, kaizen.funcionario, kaizen.execucao, kaizen.resposta restart identity cascade`,
  )
})

// Telegram falso: guarda cada mensagem e diz que o Telegram aceitou.
async function enviar(texto: string): Promise<boolean> {
  enviadas.push(texto)
  return true
}

// Hora cheia de Fortaleza (UTC−3), em milissegundos: horaEm('2026-09-29', 14) é terça, 14h.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

async function maiorId(): Promise<number> {
  const r = await banco.cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao')
  return Number(r.rows[0].id ?? 0)
}

// Roda uma execução com o relógio fingido e, depois, põe no registro a hora fingida (o Postgres grava a hora de verdade).
async function rodar(quando: number, tipo: TipoExecucao = 'hora'): Promise<Saida> {
  const antes = await maiorId()
  const saida = await executar(
    { tipo, manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => quando },
  )
  await banco.cliente.query(
    `update kaizen.execucao
        set inicio = to_timestamp($1::double precision / 1000),
            fim = to_timestamp($1::double precision / 1000) + interval '1 minute'
      where id > $2 and fim is not null`,
    [quando, antes],
  )
  return saida
}

async function respostasPorDia(): Promise<Array<{ data: string; perguntas: string }>> {
  const r = await banco.cliente.query(
    `select data, string_agg(pergunta, ',' order by pergunta) as perguntas from kaizen.resposta group by data order by data`,
  )
  return r.rows
}

// A abertura do caixa às 8h02 de terça, 29/09: um documento, nenhuma venda.
async function montarAbertura(): Promise<void> {
  await falso.inserir('documento', [{
    oid: 185, _iddocumento: 120, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-29 08:02:00', datahoramovimento: '2026-09-29 08:02:00', idempresa: 1, idpessoa: 999007,
    idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
  }])
}

test('a hora das 14h com o cálculo falhando depois da carga: falha com o detalhe, uma mensagem com os dados das 13h; às 15h, a volta', async () => {
  await montarAbertura()
  const as13 = await rodar(horaEm('2026-09-29', 13))
  assert.equal(as13.resultado, 'ok')
  assert.equal(as13.contagens.respostas, 3)

  // Depois das 13h chega a sangria 121 no ERP; e o cálculo passa a falhar de verdade: a tabela das respostas some.
  await falso.inserir('documento', [{
    oid: 186, _iddocumento: 121, modelo: 'RS', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-29 13:40:00', datahoramovimento: '2026-09-29 13:40:00', idempresa: 1,
  }])
  await banco.cliente.query('alter table kaizen.resposta rename to resposta_escondida')
  let as14: Saida
  try {
    as14 = await rodar(horaEm('2026-09-29', 14))
  } finally {
    await banco.cliente.query('alter table kaizen.resposta_escondida rename to resposta')
  }

  const detalhe = 'relation "kaizen.resposta" does not exist'
  assert.equal(as14.resultado, 'falha')
  assert.equal(as14.mensagem, detalhe)
  // A leitura das 14h terminou: a sangria 121 está gravada.
  const docs = await banco.cliente.query('select codigo from kaizen.documento order by codigo')
  assert.deepEqual(docs.rows, [{ codigo: '120' }, { codigo: '121' }])
  // As respostas continuam as da leitura das 13h: a mensagem diz 13h, não 14h.
  assert.deepEqual(enviadas, [
    `Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — ${detalhe}. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.`,
  ])
  const linha = await banco.cliente.query(`select resultado, mensagem, telegram_ok from kaizen.execucao where id = 2`)
  assert.deepEqual(linha.rows, [{ resultado: 'falha', mensagem: detalhe, telegram_ok: true }])

  const as15 = await rodar(horaEm('2026-09-29', 15))
  assert.equal(as15.resultado, 'ok')
  assert.equal(as15.contagens.respostas, 3)
  assert.deepEqual(enviadas.slice(1), ['Kaizen: voltou a funcionar às 15h.'])
})

test('a hora num dia sem venda até aquele momento termina ok e grava as três respostas de hoje, só de hoje', async () => {
  await montarAbertura()
  const saida = await rodar(horaEm('2026-09-29', 8))

  assert.equal(saida.resultado, 'ok')
  assert.deepEqual(saida.avisos, [])
  assert.equal(saida.contagens.respostas, 3)
  assert.deepEqual(await respostasPorDia(), [{ data: '2026-09-29', perguntas: 'compras,financeiro,vendas' }])
  const registro = await banco.cliente.query(`select resultado, contagens->'respostas' as respostas from kaizen.execucao`)
  assert.deepEqual(registro.rows, [{ resultado: 'ok', respostas: 3 }])
  assert.deepEqual(enviadas, [])
})

test('a noite calcula todos os dias da história: em 03/04/2026, as três respostas de 01/04, 02/04 e 03/04, 9 no total', async () => {
  const saida = await rodar(horaEm('2026-04-03', 22), 'noite')

  assert.equal(saida.resultado, 'ok')
  assert.equal(saida.contagens.respostas, 9)
  assert.deepEqual(await respostasPorDia(), [
    { data: '2026-04-01', perguntas: 'compras,financeiro,vendas' },
    { data: '2026-04-02', perguntas: 'compras,financeiro,vendas' },
    { data: '2026-04-03', perguntas: 'compras,financeiro,vendas' },
  ])
})
```

Por que cada valor é o certo:
- **Falha às 14h**: o cálculo falha de verdade, sem costura no código: a tabela `kaizen.resposta` é renomeada, e o `insert` da primeira resposta dá `relation "kaizen.resposta" does not exist`. Esse é o detalhe na mensagem e na linha de `kaizen.execucao` (a 2ª execução). A carga das 14h já tinha sido gravada (a sangria 121 está no Kaizen): por isso a mensagem diz "terminou". Os dados que o dono vê são as respostas, e essas continuam as das 13h, a última execução boa. A falha anterior não existe, então a mensagem sai, e `telegram_ok` é `true` (o Telegram falso aceita).
- **15h**: a tabela voltou; a execução é `ok`, com 3 respostas, e, como a anterior falhou, sai "Kaizen: voltou a funcionar às 15h." (spec, seção 12, "Rotina").
- **Dia sem venda às 8h**: só a abertura do caixa; a execução é `ok`, sem aviso, com 3 respostas, todas de 29/09 (a `hora` calcula só hoje).
- **Noite de 03/04/2026**: 01/04, 02/04 e 03/04 × 3 perguntas = 9. É um dia perto do início da história para o teste ser rápido; a noite de 29/09 calcula 546.

Em `tradutor/telegram.test.mts`, logo antes da linha `test('textoFalha com um detalhe enorme cabe no Telegram e mantém o que fazer no fim', () => {`, acrescente:

```ts
test('textoFalha do cálculo dos indicadores: a leitura terminou, com e sem a hora da última leitura boa', () => {
  const motivo = { tipo: 'indicadores', detalhe: 'division by zero' } as const
  assert.equal(
    textoFalha(14, motivo, 13, 'às 15h'),
    'Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — division by zero. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.',
  )
  assert.equal(
    textoFalha(22, motivo, null, 'em 30/09 às 8h'),
    'Kaizen: a leitura das 22h terminou, mas o cálculo dos indicadores falhou — division by zero. Abra uma sessão com o Claude e cole esta mensagem.',
  )
})
```

- [ ] **Passo 2: Rodar os testes novos e ver falhar**

Run: `node --test tradutor/indicadores.test.mts`
Expected: FAIL, `ℹ tests 1`, `ℹ fail 1`, com `SyntaxError: The requested module './indicadores.mts' does not provide an export named 'calcularRespostas'`.

Run: `node --test tradutor/execucao-indicadores.test.mts`
Expected: FAIL, `ℹ tests 3`, `ℹ fail 3`, os três com `error: relation "kaizen.resposta" does not exist` (o `truncate` do `beforeEach`).

Run: `node --test tradutor/telegram.test.mts`
Expected: FAIL, `ℹ tests 19`, `ℹ pass 18`, `ℹ fail 1`: `✖ textoFalha do cálculo dos indicadores: a leitura terminou, com e sem a hora da última leitura boa`, com `+ undefined` (o `switch` de `textoFalha` ainda não tem o motivo).

- [ ] **Passo 3: A migração 013**

O texto é o do esqueleto do plano, ao pé da letra. Crie `sql/migracoes/013_resposta.sql`:

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

Confira a cópia: `sha256sum sql/migracoes/013_resposta.sql` dá `756d643579e27b32869f2f5bf52f5a450f91f62a43b9cc8c2bad3297495ab669`, e `grep -c $'\r' sql/migracoes/013_resposta.sql` dá `0` (o arquivo em LF, terminando em `);` e uma quebra de linha).

- [ ] **Passo 4: O motivo de falha `indicadores` e o texto dele**

Em `tradutor/tipos.mts`, substitua:

```ts
export type TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'outra'
```

por:

```ts
export type TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'indicadores' | 'outra'
```

Em `tradutor/telegram.mts`, na função `textoFalha`, substitua:

```ts
    case 'banco_fora':
      return `Kaizen: a leitura das ${h}h falhou — o banco do Kaizen não respondeu.`
    case 'outra':
```

por:

```ts
    case 'banco_fora':
      return `Kaizen: a leitura das ${h}h falhou — o banco do Kaizen não respondeu.`
    case 'indicadores':
      return `Kaizen: a leitura das ${h}h terminou, mas o cálculo dos indicadores falhou — ${detalhe}. ${continuam}Abra uma sessão com o Claude e cole esta mensagem.`
    case 'outra':
```

`detalhe` (cortado em 3.000 caracteres) e `continuam` (`Os dados do Kaizen continuam os das Xh. `, ou vazio sem leitura boa) já existem na função.

- [ ] **Passo 5: O cálculo, a gravação e as linhas em `tradutor/indicadores.mts`**

O arquivo é da tarefa 7. No topo, junto dos `import` que ele já tem, acrescente (se já houver um `import` de valor do mesmo módulo, junte o nome nele; um `import type { Cliente } from './banco.mts'` pode ficar como está, ao lado do novo):

```ts
import { formatarReais } from './avisos.mts'
import { emTransacao } from './banco.mts'
import { somarDias } from './janela.mts'
```

No fim do arquivo, depois de `responder`, acrescente:

```ts
const INICIO_DA_HISTORIA = '2026-04-01'

// Os dias de 01/04/2026 até hoje, inclusive: a noite recalcula todos eles.
export function diasDaHistoria(hoje: string): string[] {
  const dias: string[] = []
  // datas 'AAAA-MM-DD' comparadas como texto ficam na ordem do calendário
  for (let dia = INICIO_DA_HISTORIA; dia <= hoje; dia = somarDias(dia, 1)) dias.push(dia)
  return dias
}

// A regra é um select só, com o dia em $1. A quebra de linha antes do ")" protege de um comentário na última linha dela.
function sqlDeGravar(regra: string): string {
  return `insert into kaizen.resposta (data, pergunta, conteudo)
select $1::date, $2, r.resposta from (
${regra}
) r
on conflict (data, pergunta) do update set conteudo = excluded.conteudo, calculado_em = now()`
}

// Grava as três respostas de cada dia, sobrescrevendo as que havia. O JSON vai da regra para a tabela sem passar
// pelo JavaScript (insert … select). Cada dia é uma transação. Devolve quantas respostas gravou.
export async function calcularRespostas(cliente: Cliente, dias: string[]): Promise<number> {
  const gravar = PERGUNTAS.map((pergunta) => ({ pergunta, sql: sqlDeGravar(lerRegra(pergunta)) }))
  let gravadas = 0
  for (const dia of dias) {
    gravadas += await emTransacao(cliente, async () => {
      let doDia = 0
      for (const { pergunta, sql } of gravar) {
        const r = await cliente.query(sql, [dia, pergunta])
        doDia += r.rowCount ?? 0
      }
      return doDia
    })
  }
  return gravadas
}

// O que as três linhas do comando indicadores mostram, lido de kaizen.resposta (spec, seção 9). Tudo sai como texto.
const SQL_LINHAS = `
with r as (
  select
    (select conteudo from kaizen.resposta where data = $1::date and pergunta = 'vendas') as v,
    (select conteudo from kaizen.resposta where data = $1::date and pergunta = 'compras') as c,
    (select conteudo from kaizen.resposta where data = $1::date and pergunta = 'financeiro') as f
)
select
  v->'dia'->>'realizado' as realizado_dia,
  v->'dia'->>'vendas' as vendas_dia,
  v->'mes'->>'vendido' as vendido_mes,
  v->'mes'->>'devolucoes' as devolucoes_mes,
  v->'mes'->>'realizado' as realizado_mes,
  v->'mes'->>'vendas' as vendas_mes,
  v->'mes'->>'meta' as meta,
  round((v->'mes'->>'percentual_meta')::numeric * 100, 2)::text as percentual,
  v->'mes'->>'ritmo' as ritmo,
  v->'mes'->>'projecao' as projecao,
  c->'abc_valor'->'A'->>'produtos' as curva_a,
  c->'abc_valor'->'B'->>'produtos' as curva_b,
  c->'abc_valor'->'C'->>'produtos' as curva_c,
  c->'compras_por_classe'->>'A' as compras_a,
  c->'compras_por_classe'->>'B' as compras_b,
  c->'compras_por_classe'->>'C' as compras_c,
  c->'compras_por_classe'->>'sem_venda' as compras_sem_venda,
  coalesce((c->>'estoque_conhecido')::boolean, false) as estoque_conhecido,
  c->'encalhe'->>'produtos' as encalhe_produtos,
  c->'encalhe'->>'valor' as encalhe_valor,
  c->'ruptura'->>'produtos' as ruptura,
  f->>'fonte' as fonte,
  f->'contas_a_pagar'->'total'->>'valor' as a_pagar,
  f->'contas_a_pagar'->'total'->>'parcelas' as parcelas,
  f->'contas_a_pagar'->'vencidas'->>'valor' as vencidas,
  f->'contas_a_pagar'->'ate_7_dias'->>'valor' as ate_7_dias,
  f->>'saldo_banco' is not null as tem_saldo,
  f->>'folga_7' as folga_7,
  -- O jsonpath (lax) dá lista vazia também quando fechamentos vem null: o dia sem fechamento tem quebra 0.
  (select coalesce(sum((x->>'quebra')::numeric), 0) from jsonb_path_query(f, '$.caixa.fechamentos[*]') x)::text as quebra
from r`

type Valores = Record<
  | 'realizado_dia' | 'vendas_dia' | 'vendido_mes' | 'devolucoes_mes' | 'realizado_mes' | 'vendas_mes' | 'meta'
  | 'percentual' | 'ritmo' | 'projecao' | 'curva_a' | 'curva_b' | 'curva_c' | 'compras_a' | 'compras_b' | 'compras_c'
  | 'compras_sem_venda' | 'encalhe_produtos' | 'encalhe_valor' | 'ruptura' | 'fonte' | 'a_pagar' | 'parcelas'
  | 'vencidas' | 'ate_7_dias' | 'folga_7' | 'quebra',
  string | null
> & { estoque_conhecido: boolean; tem_saldo: boolean }

// Campo vazio na resposta (sem divisor, sem dado) sai "—".
function reais(valor: string | null): string {
  return valor === null ? '—' : formatarReais(valor)
}

function numero(valor: string | null): string {
  return valor === null ? '—' : valor.replace('.', ',')
}

export async function linhasDoDia(cliente: Cliente, dia: string): Promise<string[]> {
  const r = (await cliente.query<Valores>(SQL_LINHAS, [dia])).rows[0]
  const data = `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`
  const meta = r.meta === null
    ? 'sem meta cadastrada'
    : `meta ${reais(r.meta)} (${numero(r.percentual)}%), ritmo ${numero(r.ritmo)}`
  const estoque = r.estoque_conhecido
    ? `encalhe ${numero(r.encalhe_produtos)} produtos, ${reais(r.encalhe_valor)}; ruptura ${numero(r.ruptura)}`
    : 'estoque desconhecido antes de 26/09/2026'
  const folga = r.tem_saldo ? `folga em 7 dias ${reais(r.folga_7)}` : 'saldo do banco não digitado'
  return [
    `${data} vendas: realizado do dia ${reais(r.realizado_dia)} (${numero(r.vendas_dia)} vendas); no mês vendido ${reais(r.vendido_mes)}, `
      + `devoluções ${reais(r.devolucoes_mes)}, realizado ${reais(r.realizado_mes)} (${numero(r.vendas_mes)} vendas), ${meta}, `
      + `projeção ${reais(r.projecao)}`,
    `${data} compras: curva A ${numero(r.curva_a)}, B ${numero(r.curva_b)}, C ${numero(r.curva_c)} produtos; compras do período: `
      + `A ${numero(r.compras_a)}, B ${numero(r.compras_b)}, C ${numero(r.compras_c)}, sem venda ${numero(r.compras_sem_venda)}; ${estoque}`,
    `${data} financeiro (${r.fonte ?? '—'}): a pagar ${reais(r.a_pagar)} em ${numero(r.parcelas)} parcelas, vencidas ${reais(r.vencidas)}, `
      + `até 7 dias ${reais(r.ate_7_dias)}; ${folga}; quebra do dia ${reais(r.quebra)}`,
  ]
}
```

Como funciona:
- **`diasDaHistoria`** compara datas `AAAA-MM-DD` como texto, que ficam na ordem do calendário, e anda com `somarDias` (sem `Date` do fuso da máquina).
- **`calcularRespostas`** monta, para cada pergunta, o `insert … select` do esqueleto, com a regra dentro dos parênteses. A quebra de linha antes do `)` é de propósito: se a regra terminar com um comentário `--` na última linha, o `) r` não fica comentado. O `$1` é o dia e o `$2` a pergunta; o Postgres entende o `$2` como texto pela coluna `pergunta` (conferido). Cada dia é uma transação (`emTransacao`): as três respostas de um dia entram juntas ou nenhuma; um dia que falha desfaz só ele, e os anteriores ficam gravados. `rowCount` do `insert … on conflict do update` é 1 por resposta, gravada ou trocada.
- **`linhasDoDia`** lê as três respostas do dia numa consulta só, com `->>` (tudo sai como texto do Postgres: nenhum valor vira `number`), e formata: dinheiro com `formatarReais`; percentual × 100 com 2 casas; razões e contagens como gravadas, com vírgula no lugar do ponto; campo vazio sai `—`. A quebra do dia é a soma de `caixa.fechamentos[].quebra`, pelo `jsonb_path_query` em modo lax: com a lista vazia, `null` ou ausente, dá 0 (`jsonb_array_elements` daria erro com `null`: conferido no Postgres).

- [ ] **Passo 6: O cálculo na execução**

Em `tradutor/execucao.mts`, logo depois da linha `import type { Erp } from './erp.mts'`, acrescente:

```ts
import { calcularRespostas, diasDaHistoria } from './indicadores.mts'
```

Em `rodar`, substitua:

```ts
    estado.avisos.push(...(await compararTotais(cliente, totais, maiorVivo, movimentoAte)))
  }

  const contagens: Record<string, number> = {
```

por:

```ts
    estado.avisos.push(...(await compararTotais(cliente, totais, maiorVivo, movimentoAte)))
  }

  // Depois das conferências, as três respostas: a hora calcula hoje; a noite, todos os dias desde 01/04/2026.
  const hoje = emFortaleza(agora).data
  let respostas: number
  try {
    respostas = await calcularRespostas(cliente, noite ? diasDaHistoria(hoje) : [hoje])
  } catch (erro) {
    throw new ErroKaizen({ tipo: 'indicadores', detalhe: mensagemDe(erro) })
  }

  const contagens: Record<string, number> = {
```

e, no mesmo objeto `contagens`, substitua:

```ts
    avisos: estado.avisos.length,
  }
```

por:

```ts
    avisos: estado.avisos.length,
    respostas,
  }
```

Em `falhar`, substitua:

```ts
  if (estado.gravou) {
    // A carga desta execução foi gravada e a falha veio depois (a comparação da noite): os dados são os desta hora.
    horaBoa = emFortaleza(agora).hora
```

por:

```ts
  if (estado.gravou && motivo.tipo !== 'indicadores') {
    // A carga desta execução foi gravada e a falha veio depois (a comparação da noite): os dados são os desta hora.
    // Se o que falhou foi o cálculo, as respostas continuam as da última execução boa.
    horaBoa = emFortaleza(agora).hora
```

O cálculo fica depois das conferências (`codigosSemTraducao`, `estoqueDiverge` e, na noite, `compararTotais`) e antes de `registrarFim`: a execução só termina `ok` ou `aviso` com as respostas gravadas. Qualquer erro do cálculo (uma regra que divide por zero, a tabela que sumiu, a conexão que caiu no meio) vira o motivo `indicadores`, com a mensagem do Postgres como detalhe. A carga já foi gravada nesse ponto; as respostas desta hora não: por isso a mensagem diz a hora da última execução boa, e não a desta (a comparação da noite, que falha depois da carga, continua dizendo a desta hora). `emFortaleza`, `ErroKaizen` e `mensagemDe` já estão no arquivo.

- [ ] **Passo 7: O comando `indicadores`**

Em `tradutor/principal.mts`, logo depois da linha `import type { Dependencias, Saida } from './execucao.mts'`, acrescente:

```ts
import { calcularRespostas, diasDaHistoria, linhasDoDia } from './indicadores.mts'
```

Na linha `USO`, substitua o fim:

```ts
| migrar | execucoes [AAAA-MM-DD]'
```

por:

```ts
| migrar | execucoes [AAAA-MM-DD] | indicadores AAAA-MM-DD...'
```

Na função `principal`, logo antes da linha `  const manual = resto.length === 1 && resto[0] === '--manual'` (depois dos blocos `migrar` e `execucoes` da tarefa 1), acrescente:

```ts
  if (comando === 'indicadores' && resto.length > 0 && resto.every((dia) => /^\d{4}-\d{2}-\d{2}$/.test(dia))) {
    // Só os dias de 01/04/2026 até hoje, em Fortaleza; fora disso, nada é calculado. Não registra execução nem manda Telegram.
    const historia = diasDaHistoria(emFortaleza(Date.now()).data)
    const fora = resto.filter((dia) => !historia.includes(dia))
    if (fora.length > 0) {
      console.log(`indicadores falha: fora da história (de 01/04/2026 até hoje): ${fora.join(', ')}; nada foi calculado`)
      return 1
    }
    const cliente = await conectar(lerConfig(env).kaizenUrl)
    try {
      await calcularRespostas(cliente, resto)
      for (const dia of resto) {
        for (const linha of await linhasDoDia(cliente, dia)) console.log(linha)
      }
      return 0
    } catch (erro) {
      console.log(`indicadores falha: ${erro instanceof Error ? erro.message : String(erro)}`)
      return 1
    } finally {
      await cliente.end().catch(() => undefined)
    }
  }
```

Um dia está na história se está em `diasDaHistoria(hoje)`: isso recusa o dia antes de 01/04/2026, o dia depois de hoje (em Fortaleza) e a data que não existe (`2026-09-31`), sem outra conta. Todos os dias são conferidos antes de calcular qualquer um. Sem dia, ou com um argumento fora do formato, nenhum bloco é escolhido e o principal mostra o uso e sai com 2, como `execucoes ontem`. Uma falha de conexão sobe até o `import.meta.main`, que já imprime o motivo e sai com 1, como nos comandos `migrar` e `execucoes`.

- [ ] **Passo 8: Rodar os testes novos e ver passar**

Run: `node --test tradutor/indicadores.test.mts tradutor/execucao-indicadores.test.mts tradutor/telegram.test.mts`
Expected: PASS, `ℹ tests 30`, `ℹ pass 30`, `ℹ fail 0`, com:

```
✔ a hora das 14h com o cálculo falhando depois da carga: falha com o detalhe, uma mensagem com os dados das 13h; às 15h, a volta
✔ a hora num dia sem venda até aquele momento termina ok e grava as três respostas de hoje, só de hoje
✔ a noite calcula todos os dias da história: em 03/04/2026, as três respostas de 01/04, 02/04 e 03/04, 9 no total
✔ diasDaHistoria vai de 01/04/2026 até o dia pedido, inclusive: 3 dias em 03/04 e 182 em 29/09
✔ calcularRespostas grava as três perguntas de cada dia como a regra as devolve, e devolve quantas gravou
✔ calcularRespostas sobrescreve a resposta que já estava gravada e renova calculado_em; o outro dia fica como estava
✔ cada dia é gravado numa transação: o dia em que uma resposta falha fica sem nenhuma, e o dia anterior fica gravado
✔ as três linhas de um dia com meta, estoque conhecido e saldo do banco; num domingo, ritmo vazio sai "—" e sem fechamento a quebra é zero
✔ as três linhas de um dia da Link sem meta, antes de 26/09 e sem saldo do banco
✔ o comando indicadores calcula, grava e imprime as três linhas de cada dia, sem registrar execução nem mandar Telegram
✔ o comando indicadores com dia fora da história sai com 1, diz quais, e não calcula nenhum; sem dia ou fora do formato, sai com 2
✔ textoFalha do cálculo dos indicadores: a leitura terminou, com e sem a hora da última leitura boa
```

e os outros 18 testes de `tradutor/telegram.test.mts`, que não mudaram.

Se `✔ o comando indicadores calcula…` falhar em `realizado do dia R$ 150,00 (1 vendas)`, em `financeiro (meuerp)` ou em `estoque desconhecido antes de 26/09/2026`, a regra da tarefa 7, 9 ou 8 está devolvendo outra chave ou outro valor para o que a spec fixa (seções 8.1, decisão 16 e decisão 17): pare e avise o orquestrador, sem mudar o teste.

- [ ] **Passo 9: Os testes antigos que veem a contagem nova**

Run: `node --test tradutor/execucao.test.mts tradutor/principal.test.mts`
Expected: FAIL, 2 testes, cada um porque a execução agora conta as respostas:
- `✖ execução ok grava os documentos e registra ok com as contagens`, com `+     respostas: 3`;
- `✖ o comando "hora" lê o ERP pela API, …`, com a linha `+   'hora ok: …, avisos=0, respostas=3'`.

Em `tradutor/execucao.test.mts`, no teste `execução ok grava os documentos e registra ok com as contagens`, substitua:

```ts
    produtos: 1, pessoas: 1, funcionarios: 1, fornecedores: 0, avisos: 0,
  }
```

por:

```ts
    produtos: 1, pessoas: 1, funcionarios: 1, fornecedores: 0, avisos: 0, respostas: 3,
  }
```

Em `tradutor/principal.test.mts`, substitua:

```ts
      'hora ok: documentos_lidos=1, documentos_novos=1, apagados=0, movimentos=0, foto=0, produtos=0, pessoas=0, funcionarios=0, fornecedores=0, avisos=0',
```

por:

```ts
      'hora ok: documentos_lidos=1, documentos_novos=1, apagados=0, movimentos=0, foto=0, produtos=0, pessoas=0, funcionarios=0, fornecedores=0, avisos=0, respostas=3',
```

(O comando `hora` usa o relógio de verdade: hoje, qualquer que seja o dia, dá 3 respostas.)

Run: `node --test tradutor/execucao.test.mts tradutor/principal.test.mts tradutor/execucao-noite.test.mts tradutor/casos-reais.test.mts`
Expected: PASS, `ℹ fail 0`. Nenhum teste de `tradutor/execucao-noite.test.mts` e de `tradutor/casos-reais.test.mts` muda: eles não conferem a contagem inteira. Mas cada leitura da noite deles (em setembro) passa a calcular os 182 dias da história, e esses dois arquivos ficam mais lentos (medido com regras mínimas: de 8 s para 56 s e de 16 s para 107 s; com as regras de verdade, mais).

- [ ] **Passo 10: Atualizar `testes-esperados.txt`**

Esta tarefa acrescenta 12 testes: 8 em `tradutor/indicadores.test.mts`, 3 em `tradutor/execucao-indicadores.test.mts` e 1 em `tradutor/telegram.test.mts`. Os 2 testes mudados no Passo 9 já existiam. O arquivo fica com uma única linha:

```text
419
```

- [ ] **Passo 11: Rodar a verificação completa**

Run: `npm run verificar`
Expected: PASS; `tsc -p .` sem nenhuma linha de erro; nenhum `✖`; última linha `rodou 419 testes, esperados 419`. Leva mais que antes desta tarefa: as leituras da noite dos testes da Fase 2 passam a calcular 182 dias cada (medido com regras mínimas no PC: de uns 2 minutos para 4,5 a 6 minutos).

- [ ] **Passo 12: Commit**

```bash
git add sql/migracoes/013_resposta.sql tradutor/indicadores.mts tradutor/indicadores.test.mts \
  tradutor/execucao-indicadores.test.mts tradutor/execucao.mts tradutor/tipos.mts tradutor/telegram.mts \
  tradutor/principal.mts tradutor/telegram.test.mts tradutor/execucao.test.mts tradutor/principal.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 4: a leitura de hora em hora calcula as três respostas, e o dono é avisado se o cálculo falhar

Depois de gravar o que leu do ERP e de conferir, cada leitura calcula as
respostas de vendas, compras e financeiro do dia e as grava em
kaizen.resposta, trocando as que havia; a leitura das 22h recalcula
todos os dias desde 01/04/2026 (546 respostas em 29/09). O registro de
cada leitura ganha a contagem "respostas". Se o cálculo falha, a leitura
falha e o Telegram recebe uma mensagem só: "a leitura das 14h terminou,
mas o cálculo dos indicadores falhou — (motivo). Os dados do Kaizen
continuam os das 13h."; e, depois, "voltou a funcionar".

O comando "indicadores <dia>…" calcula os dias pedidos e imprime, por
dia, o realizado e a meta, a curva e as compras, o a pagar e a quebra
do caixa. Dia antes de 01/04/2026 ou depois de hoje é recusado, sem
calcular nada. O comando não entra no registro nem manda Telegram.
12 testes novos; rodou 419, esperados 419.
EOF
```

Acrescente no fim da mensagem, depois de uma linha em branco, a linha de atribuição que o sistema lhe dá (o plano não fixa nome de modelo).
Expected: o hook roda `npm run verificar` e termina com `rodou 419 testes, esperados 419`; o commit sai.

---

DECISÃO (pontos que a spec não fixa, ou que precisaram de uma leitura; escolhi a mais simples e segui):

1. **A hora dos dados na mensagem de falha do cálculo é a da última execução boa**, não a desta, mesmo com a carga desta hora já gravada. É o que o teste da spec (seção 12) pede ("Os dados do Kaizen continuam os das 13h" na falha das 14h), e é o certo: o dono vê as respostas, e as desta hora não foram gravadas. Para isso, `falhar` usa a hora desta execução só quando a carga foi gravada **e** o motivo não é `indicadores`; a comparação da noite que falha depois da carga continua dizendo a hora desta (teste da Fase 2 que não mudou).
2. **O detalhe da mensagem é a mensagem do Postgres, sem o dia** em que o cálculo parou. A spec só diz `{detalhe}`. Na noite, o dia que falhou não aparece; a regra que falha num dia costuma falhar em todos os dias iguais (um domingo, um feriado), e o `indicadores <dia>` reproduz um dia na hora.
3. **`respostas` é a última chave de `contagens`**: a linha impressa termina em `…, avisos=N, respostas=R`, como as tarefas 11 e 12 esperam (`noite ok: …, respostas=R`).
4. **O comando `indicadores`**: sem dia ou com argumento fora de `AAAA-MM-DD`, é comando errado (uso e código 2), como `execucoes ontem` na tarefa 1 (o `implantar.sh` já barra esses antes da VPS). Dia no formato, mas fora de 01/04/2026 a hoje (em Fortaleza), é a falha "fora da história" (código 1, decisão 14): a mensagem é `indicadores falha: fora da história (de 01/04/2026 até hoje): <dias>; nada foi calculado`, com todos os dias recusados, e nenhum dia é calculado se um estiver fora. Uma data que não existe (`2026-09-31`) cai no mesmo "fora da história". Erro no cálculo imprime `indicadores falha: <mensagem>` e sai com 1. O comando não pega a trava das leituras (a spec não pede; o `insert … on conflict` aguenta uma leitura ao mesmo tempo, e o `implantar.sh` não roda às 22h).
5. **As três linhas**: dinheiro por `formatarReais` (`R$ 1.234,50`, `−R$ 2,25`); percentual da meta = `percentual_meta` × 100 com 2 casas e `%`; ritmo com as 4 casas da regra; contagens como gravadas; vírgula decimal. **Campo vazio sai `—`**: acontece de verdade no ritmo com meta no dia 1 de um mês que começa num domingo ou feriado (nenhum dia útil decorrido; 01/11/2026 é domingo) e evita que o comando quebre num `null`. "Sem meta" é pela `meta` vazia; "saldo do banco não digitado" é pelo `saldo_banco` vazio; "estoque desconhecido" é pelo `estoque_conhecido` falso. A quebra do dia é a soma das quebras de `caixa.fechamentos` (a spec não tem uma quebra do dia pronta), e dá R$ 0,00 sem fechamento, com a lista vazia ou `null`.
6. **A impressão fica em `linhasDoDia(cliente, dia)`**, em `tradutor/indicadores.mts`, separada do comando, para ser testada com respostas montadas à mão (os textos exatos não dependem das regras). O comando é testado com as regras de verdade só no que a spec fixa (o realizado de uma venda, a fonte do financeiro, o estoque desconhecido antes de 26/09) e comparando as linhas impressas com `linhasDoDia`.
7. **O teste de "cada dia numa transação"** (spec, seção 9) usa uma restrição `check` só do teste, que recusa uma resposta de um dia; o da falha na execução renomeia `kaizen.resposta`. Nenhum dos dois precisa de costura no código.
8. **O teste do texto de falha do cálculo** fica em `tradutor/telegram.test.mts`, ao lado dos outros motivos, com e sem a hora da última leitura boa (o "sem hora boa" só aparece ali).
9. **Custo nos testes.** Os testes antigos da noite (`execucao-noite`, `casos-reais`) rodam em setembro e passam a calcular de 181 a 184 dias por leitura, sem mudar: são 21 leituras da noite que chegam ao cálculo (7 em `execucao-noite`, 14 em `casos-reais`), cerca de 550 cálculos de regra cada. Medido com regras mínimas: cerca de 5 ms por dia só de transação e ida ao banco, e a suíte foi de uns 2 min para 4,5 a 6 min. Com as regras de verdade, o tempo cresce com o custo de cada regra num banco de teste. O Postgres local tem `jit = on`: uma regra que o planejador estima cara num banco sem estatísticas pode pagar a compilação JIT em cada chamada (a Fase 2 já viu 1,5 s por chamada no ERP falso). Não mexi nisso aqui: é conta das regras (tarefas 7 a 9) e do ensaio (tarefa 11), que mede a noite de verdade.

---

### Task 11: o ensaio no PC

**Ajustes do orquestrador (revisão do plano inteiro, 29/09) — valem sobre o texto abaixo, e o revisor confere contra eles:**
- **Antes do passo 1:** `git diff --name-status --diff-filter=M <commit da tarefa 5> HEAD -- sql/migracoes` (o commit da tarefa 5 está no `git log`). Se a 010 ou a 011 tiverem mudado depois de aplicadas no banco do PC (tarefa 5, passo 8), pare e devolva `BLOCKED`: `migrar` reconhece a migração só pelo nome, e o ensaio rodaria com o SQL antigo.
- **Depois do passo 4**, três conferências só de leitura no banco do PC (`docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At`), com o esperado ao lado no registro: (1) a soma de `(conteudo->'mes'->>'vendas')::int` nas respostas de vendas de 30/04, 31/05, 30/06, 31/07, 31/08 e 25/09 é 5.262 (das 5.271 vendas válidas da Link, as 9 só de devolução não contam); (2) na resposta de compras de 28/09/2026, o produto 1708 tem `encalhe` verdadeiro e o 5336 falso; (3) em `kaizen.produto`, fonte `meuerp`, zero produtos com descrição vazia ou nula (tarefa 2).
- **Um passo novo, antes do registro: os comandos do dono.** Rode no banco do PC (`docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen`) os comandos exatos que irão para o relatório da fase: a meta do mês corrente da loja (`insert into kaizen.meta (mes, valor) values (date_trunc('month', current_date)::date, 150000);`), a do vendedor 1 (`insert into kaizen.meta (mes, vendedor, valor) values (date_trunc('month', current_date)::date, '1', 70000);`) e o saldo do banco de hoje (`insert into kaizen.saldo_banco (data, valor) values (current_date, 50000);`). Depois, `indicadores` de hoje: a linha de vendas mostra a meta, o percentual e o ritmo; a de financeiro, a folga em 7 dias. Em seguida apague as três linhas (`delete` pelas mesmas chaves) e rode `indicadores` de hoje de novo: volta `sem meta cadastrada` e `saldo do banco não digitado`. Copie os comandos e as duas saídas para o registro.

Roda a fase inteira no banco do PC, com o ERP de verdade (só leitura), antes de ir para a VPS: é o último passo antes da publicação (`docs/LICOES.md`, Fase 2: se o código mudar depois do ensaio, a leitura da noite roda de novo no PC). Não acrescenta código nem teste. Se um número sair diferente do esperado, pare e devolva `BLOCKED` com o esperado e o obtido: o orquestrador abre uma tarefa de correção.

**Files:**
- Create: `docs/fases/FASE-4-ensaio-pc.md`

**Interfaces:**
- Consumes: os comandos `migrar` (tarefa 1), `noite` com o cálculo (tarefa 10), `indicadores` (tarefa 10); `tradutor/link.mts` com a natureza (tarefa 5). O `.env` do PC tem `MEUERP_TOKEN` e `KAIZEN_URL` (o banco `kaizen` do Postgres do PC, porta 5434), e não tem Telegram: as mensagens saem só no console.
- Produces: os números do PC que a tarefa 12 reproduz na VPS.

- [ ] **Passo 1: as migrações**

Run: `node --env-file=.env tradutor/principal.mts migrar`
Expected: `migrar: aplicadas 012_regras, 013_resposta` (a 010 e a 011 já foram aplicadas na tarefa 5; se o banco estiver atrás, aparecem também).

- [ ] **Passo 2: a Link, de novo**

Run: `node --env-file=.env tradutor/link.mts`
Expected: `link ok: documentos=6183, novos=0, ...` e, no resumo, `vendas_validas: 5271` e `dias_comparados: 141`.

- [ ] **Passo 3: a leitura da noite, com o cálculo de todos os dias**

Run (no Git Bash, medindo o tempo): `time node --env-file=.env tradutor/principal.mts noite --manual`
Expected: `noite ok: documentos_lidos=..., ..., respostas=R` (ou `noite aviso:` com os avisos listados; aviso de natureza ou de código sem tradução é achado: anote e devolva `DONE_WITH_CONCERNS`). R é 3 × o número de dias de 01/04/2026 até hoje, inclusive (por exemplo, 3 × 182 = 546 em 29/09/2026). Anote o tempo total.

Depois, só lendo, no banco do PC:

```bash
docker exec -i kaizen-postgres-1 psql -U postgres -d kaizen -At <<'SQL'
select 'naturezas', fonte, count(distinct codigo), count(*) from kaizen.natureza group by fonte order by fonte;
select 'documentos meuerp sem natureza com modelo de venda', count(*) from kaizen.documento where fonte = 'meuerp' and modelo in ('PA', 'OC', 'PV', 'TM', '55', '65') and natureza_id is null;
select 'respostas', count(*), min(data), max(data) from kaizen.resposta;
SQL
```

Expected: `naturezas|link|3|3` e `naturezas|meuerp|81|81` (ou mais versões, se alguma mudou); zero documentos de venda do ERP novo sem natureza; `respostas|R|2026-04-01|<hoje>`.

- [ ] **Passo 4: um dia de cada mês, e a virada**

Run: `node --env-file=.env tradutor/principal.mts indicadores 2026-04-30 2026-05-31 2026-06-30 2026-07-31 2026-08-31 2026-09-25 2026-09-26 $(date +%F)`
Expected, nas linhas `vendas` (o vendido do mês é o da tabela por mês do `FASE-3-relatorio.md`):

| Dia | Vendido do mês | Devoluções do mês |
| --- | --- | --- |
| 30/04 | R$ 58.825,56 | R$ 1.322,12 |
| 31/05 | R$ 132.684,79 | R$ 1.141,42 |
| 30/06 | R$ 140.882,93 | R$ 437,16 |
| 31/07 | R$ 145.743,81 | R$ 352,83 |
| 31/08 | R$ 140.782,78 | R$ 279,11 |
| 25/09 | R$ 118.204,98 | R$ 663,73 |
| soma | R$ 737.124,85 | R$ 4.196,36 |

E nas linhas `financeiro`: 25/09 `(link)`, a pagar R$ 245.864,76 em 94 parcelas; 26/09 `(meuerp)`, a pagar R$ 217.491,43 em 81 parcelas (se o ERP tiver mudado desde 28/09, anote o número do ERP pela consulta só de leitura `node --env-file=.env ferramentas/consultar-erp.mts "select count(*), sum(p.valparcela) from documento_parcela p join documento d on d._iddocumento = p._iddocumento where d.modelo = 'CP' and p.status = 'P'"` e compare com ele). Nas linhas `compras`: 30/04 a 25/09 com `estoque desconhecido antes de 26/09/2026`; 26/09 e hoje com encalhe e ruptura.

- [ ] **Passo 5: um dia fora da história**

Run: `node --env-file=.env tradutor/principal.mts indicadores 2026-03-31; echo "saída $?"`
Expected: a mensagem "fora da história" e `saída 1`.

- [ ] **Passo 6: o registro**

Escreva `docs/fases/FASE-4-ensaio-pc.md` com: data e hora de cada passo, o commit (`git rev-parse --short HEAD`), cada comando e a saída, o tempo da noite, e uma tabela esperado × obtido de cada número dos passos 3 e 4. Todo número composto é escrito com as partes que o somam.

- [ ] **Passo 7: commit**

```bash
git add docs/fases/FASE-4-ensaio-pc.md
git commit -m "Fase 4: ensaio no PC — o vendido de cada mês da Link bate com a Fase 3 e a noite calcula todos os dias"
```

---

### Task 12: a fase na VPS

Publica a fase inteira na VPS, leva a história da Link ao Kaizen da VPS, lê de novo todos os documentos (para gravar a natureza dos antigos e calcular todos os dias) e calcula lá as três respostas de hoje e do último dia de cada mês desde abril (spec, seção 11, passos 3 a 8). É uma tarefa de operação: não acrescenta código nem teste. Se um número sair diferente do ensaio do PC (`docs/fases/FASE-4-ensaio-pc.md`), pare e devolva `BLOCKED` com o esperado e o obtido.

**Files:**
- Modify: `docs/fases/FASE-4-vps.md` (seção 2)

**Interfaces:**
- Consumes: `publicacao/implantar.sh` (tarefa 1); os números do ensaio no PC (tarefa 11); o SHA da primeira publicação, em `docs/fases/FASE-4-vps.md` (tarefa 3).
- Produces: a VPS na versão da branch `fase-4`, com a Link e as respostas.

**Regras desta tarefa:** as mesmas da tarefa 3 (só o `implantar.sh`; janela de hh:10 a hh:50, nunca das 22h às 22h59; espere com `until` e rode de novo). A `noite` precisa começar logo depois de hh:10 e terminar antes da hora cheia seguinte; se, ao terminar a `noite`, faltarem menos de 5 minutos para a hora cheia, espere a próxima janela para os passos seguintes.

- [ ] **Passo 1: nenhuma migração publicada foi editada**

Run: `git diff --name-status --diff-filter=M <SHA da tarefa 3> HEAD -- sql/migracoes`
Expected: nenhuma linha (spec, decisão 19). Com alguma linha, pare e devolva `BLOCKED`.

- [ ] **Passo 2: publicar a fase**

Run: `git push origin fase-4` e, dentro da janela, `bash publicacao/implantar.sh publicar fase-4`
Expected: `migrar: aplicadas 010_natureza, 011_natureza_link, 012_regras, 013_resposta`; o SHA publicado igual ao `git rev-parse --short HEAD`; o serviço em `1/1` com a imagem nova.

- [ ] **Passo 3: a história da Link**

Run: `bash publicacao/implantar.sh rodar link`
Expected: `link ok: documentos=6183, novos=6183, ...` e, no resumo, `documentos: 6183`, `vendas_validas: 5271`, `dias_comparados: 141`. O comando só termina com `link ok` se os 141 dias baterem com a Link: é a comparação por dia sem diferença. As linhas `ligacoes:*` podem diferir do PC se o cadastro do ERP novo mudou; anote.

- [ ] **Passo 4: a leitura da noite, manual**

Run (às hh:10): `bash publicacao/implantar.sh rodar noite`
Expected: `noite ok: ..., respostas=R` (R = 3 × os dias de 01/04/2026 até hoje, já com a Link: a noite grava a natureza dos documentos antigos do ERP novo e calcula todos os dias). Com `noite aviso:`, anote os avisos: aviso de natureza ou de código sem tradução é achado (devolva `DONE_WITH_CONCERNS`).

- [ ] **Passo 5: as três perguntas, hoje e um dia de cada mês**

Run: `bash publicacao/implantar.sh rodar indicadores 2026-04-30 2026-05-31 2026-06-30 2026-07-31 2026-08-31 2026-09-25 2026-09-26 $(date +%F)`
Expected: as mesmas linhas do passo 4 do ensaio no PC para 30/04 a 25/09 (o vendido de cada mês: 58.825,56; 132.684,79; 140.882,93; 145.743,81; 140.782,78; 118.204,98 — soma R$ 737.124,85); 25/09 `(link)` a pagar R$ 245.864,76 em 94 parcelas; 26/09 `(meuerp)` a pagar igual ao do ERP (81 parcelas, R$ 217.491,43 em 28/09); hoje, com os números da VPS.

- [ ] **Passo 6: o Telegram**

Run: `bash publicacao/implantar.sh rodar teste-telegram`
Expected: `teste-telegram: o Telegram aceitou a mensagem`.

- [ ] **Passo 7: as leituras da fase**

Run: `bash publicacao/implantar.sh rodar execucoes 2026-09-28`
Expected: todas as leituras agendadas (`manual` falso) com início depois de 28/09 às 19h28 com resultado `ok`; as manuais desta tarefa (a `noite` do passo 3) também `ok`.

- [ ] **Passo 8: o registro**

Acrescente a `docs/fases/FASE-4-vps.md` a seção "2. A fase na VPS", com a data e a hora de cada passo, os comandos e as saídas, o SHA publicado em destaque, e uma tabela esperado (ensaio no PC) × obtido (VPS) de cada número do passo 5. Todo número composto é escrito com as partes que o somam.

- [ ] **Passo 9: commit**

```bash
git add docs/fases/FASE-4-vps.md
git commit -m "Fase 4: a fase na VPS — a Link com 6.183 documentos e as três perguntas calculadas lá"
```

---

### Task 13: o fecho na VPS, depois do merge

Depois da auditoria e do merge da `fase-4` em `main` (feitos pelo orquestrador), a VPS volta para `main` pelo `implantar.sh`, e a leitura agendada seguinte prova que a versão final roda (spec, seção 11, passo 9). É uma tarefa de operação: não acrescenta código nem teste.

**Files:**
- Modify: `docs/fases/FASE-4-vps.md` (seção 3)

**Interfaces:**
- Consumes: `publicacao/implantar.sh` (tarefa 1); o SHA publicado na tarefa 12 (em `docs/fases/FASE-4-vps.md`); `main` já com a fase mesclada e enviada ao GitHub.
- Produces: a VPS em `main`, com `/opt/kaizen` no ramo `main` (o `git pull` do roteiro do dono volta a funcionar).

**Regras desta tarefa:** as mesmas das tarefas 3 e 12 (só o `implantar.sh`; janela de hh:10 a hh:50, nunca das 22h às 22h59; espere com `until`).

- [ ] **Passo 1: nenhuma migração publicada foi editada**

Run: `git diff --name-status --diff-filter=M <SHA da tarefa 12> main -- sql/migracoes`
Expected: nenhuma linha. Com alguma, pare e devolva `BLOCKED`.

- [ ] **Passo 2: publicar main**

Run (na janela): `bash publicacao/implantar.sh publicar`
Expected: `migrar: nenhuma migração pendente` (ou só as migrações novas desde a tarefa 12, se houver); o SHA publicado igual ao `git rev-parse --short main`; o serviço em `1/1` com a imagem nova.

- [ ] **Passo 3: a leitura seguinte**

Espere a leitura agendada da hora cheia seguinte (das 8h às 19h, de segunda a sábado; se a publicação for depois das 19h, a das 22h ou a das 8h do dia útil seguinte). Depois, na janela:

Run: `bash publicacao/implantar.sh log 2` e `bash publicacao/implantar.sh rodar execucoes 2026-09-28`
Expected: no log, a linha `hora ok: …, respostas=3` (ou `noite ok: …`) depois do `crond`; na tabela, todas as leituras agendadas desde o início da fase (28/09, depois das 19h28) com resultado `ok`, inclusive a primeira com a imagem de `main`.

- [ ] **Passo 4: o registro**

Acrescente a `docs/fases/FASE-4-vps.md` a seção "3. A versão final", com a hora de cada passo, os comandos, as saídas e o SHA publicado.

- [ ] **Passo 5: commit (em main)**

```bash
git add docs/fases/FASE-4-vps.md
git commit -m "Fase 4: a VPS na versão final de main; a leitura seguinte terminou ok"
```
