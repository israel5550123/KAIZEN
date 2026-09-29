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
| 7 | 0 | 367 |
| 8 | 0 | 367 |
| 9 | 0 | 367 |
| 10 | 0 | 367 |
| 11 | 0 | 367 |
| 12 | 0 | 367 |

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

### Task 7: (em redação)

---

### Task 8: (em redação)

---

### Task 9: (em redação)

---

### Task 10: (em redação)

---

### Task 11: o ensaio no PC

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
