# Fase 3 — Tradutor do ERP anterior (Link): plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development para executar este plano tarefa por tarefa, na branch `fase-3`, com os subagentes `implementador` e `revisor` de `.claude/agents/` (sem passar `model` na chamada; `docs/AUTONOMIA.md`). Os passos usam caixas (`- [ ]`) para o acompanhamento.

**Objetivo:** levar a história da Link, de abril a 25/09/2026, para o esquema próprio `kaizen`, ligada ao cadastro do ERP novo e na mesma forma dos documentos do ERP novo.

**Arquitetura:**
- **Leitura:** a cópia da Link fica no esquema `erp`, no mesmo banco do `kaizen`, como na VPS. O usuário `kaizen` só tem leitura nele.
- **Tradução:** arquivos SQL em `sql/link/`, rodados em sequência numa transação só, montam tabelas temporárias de trabalho (`pg_temp.link_*`) a partir do `erp` e do cadastro do ERP novo, e o último grava tudo no `kaizen`. Nenhum número passa pelo JavaScript.
- **Comando:** `node --env-file=.env tradutor/link.mts` confere a cópia, roda a transação, compara por dia com a Link antes do commit e imprime um resumo.
- **Testes:** `node:test` contra o Postgres local, com uma "Link falsa" (esquema `erp` do banco de teste, só com as colunas da lista) carregada com casos reais da cópia antiga, com nomes e documentos inventados.

**Tecnologia:** Node `24.18.0` (arquivos `.mts` rodados direto), `pg` `8.23.0`, TypeScript `7.0.2` (só para conferir tipos), Postgres 16. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-09-28-fase3-tradutor-link-design.md`. O plano argumenta a partir dela, e quem executa lê as duas.

## Restrições globais

Valem para toda tarefa, mesmo quando ela não as repete.

**Língua e commits**
- Português em tudo: nomes (camelCase no código, snake_case no banco), testes, mensagens, comentários e commits.
- Commit pelo resultado, com `git commit -F -` e heredoc no Git Bash, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nunca `git add -A` nem `git add .`: sempre os caminhos da tarefa.
- TypeScript só com sintaxe apagável: nada de `enum`, `namespace`, nem parâmetro de construtor com `public`/`private`. Imports com a extensão `.mts`, e `import type` para tipos.

**A Link, só leitura**
- Nada escreve no ERP novo nem no esquema `erp`. O tradutor roda como o usuário `kaizen`, que só tem `select` no `erp`.
- O `erp` da cópia antiga está no container `link_postgres` (porta 5433, banco `prumo`); nele só se roda `pg_dump` e SELECT.
- O gancho `.claude/hooks/guarda-bash.js` recusa comando com `drop` ou `truncate` seguido de `erp`. Não se apaga o esquema `erp` pela linha de comando; a restauração usa `pg_restore` (tarefa 9).

**Números e datas**
- Nenhum valor de dinheiro, quantidade ou data passa por `number` ou `Date` do JavaScript: a tradução é SQL, de esquema para esquema. Nos testes, os valores são comparados como o texto que o Postgres escreve (`numeric` e `timestamp` chegam como texto, pelo `tradutor/banco.mts`).
- As colunas `timestamp` da Link vão direto para as colunas `timestamp` do Kaizen; `date` é o dia do `timestamp`.

**SQL de `sql/link/`**
- Todo arquivo roda como `kaizen`, dentro da transação do comando; as temporárias de trabalho começam com `link_` e são `on commit drop`.
- Nada de `select *`. Cada coluna do `erp` que um arquivo lê está em `sql/link/colunas-esperadas.txt`, e a Link falsa só tem essas colunas.
- Os documentos e cadastros da Link têm `fonte = 'link'`; o código do ERP novo nunca apaga nem muda linha da fonte `link`, e o da Link nunca muda linha da fonte `meuerp`.

**Testes**
- Só conectam em `localhost:5434` (`garantirLocal`). O Postgres local sobe com `docker compose up -d --wait`.
- O hook de commit roda `npm run verificar` (tipos e testes).
- `testes-esperados.txt`: cada tarefa soma os testes que acrescentou. A fase começa com **280**.
- Os casos de teste vêm de `tradutor/link-casos.json` (tarefa 2): linhas reais da cópia antiga, com nomes, CPF e CNPJ inventados.

**Arquivos e comandos do dono**
- Não mexer e não commitar: `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `CLAUDE.md`, `OBJETIVO.md` e `docs/AUTONOMIA.md`.
- `docs/DECISOES.md`, `docs/LICOES.md` e `docs/FONTES.md` só recebem entradas novas, nas tarefas que dizem isso.
- Segredos: nunca abra nem imprima o `.env`. Ele só é lido pelo Node com `--env-file=.env`. A `KAIZEN_URL` dele aponta para o banco `kaizen` do Postgres local (`localhost:5434/kaizen`).
- Nada roda na VPS nesta fase.

## Foco da revisão

Os casos que a spec implica e que mais podem pegar o dono de surpresa. Cada um tem um teste na tarefa dona do código:

1. **Restauração pela metade da cópia final** (uma tabela vazia, uma venda que aponta para cliente que não está na cópia, uma venda que não fecha). O comando para antes de gravar, com a tabela ou o dia na mensagem. Testes da tarefa 8: "uma tabela vazia na cópia para o comando antes de gravar, com a tabela na mensagem" e "uma venda que aponta para cliente que não está na cópia para o comando antes de gravar"; da tarefa 7: "valor_total_venda que não fecha com os itens para o comando com o dia e os dois números, e nada é gravado".
2. **Código novo na cópia final** (uma forma ou um tipo que a cópia antiga não tinha). O comando para e diz o campo e o código. Teste da tarefa 7: "código da Link sem tradução para o comando com o campo e o código, e nada é gravado".
3. **A cópia final com uma coluna a menos.** O comando para antes de abrir a transação, com a coluna na mensagem. Teste da tarefa 2: "conferirColunasLink não acusa nada com a lista inteira e acusa a coluna que falta".
4. **O dono responde uma falha da `de_para`** e a decisão entra por migração. A rodada seguinte usa a decisão e tira a falha. Teste da tarefa 4: "uma decisão nova na de_para vale na rodada seguinte e tira a falha".
5. **A cópia final no lugar da antiga** (rodar de novo, com documentos a mais ou a menos). Nada duplica, o `visto_em` fica, e o que sumiu da Link sai. Teste da tarefa 4: "rodar duas vezes deixa o mesmo conteúdo, com os mesmos id e visto_em, e o documento que sumiu da Link sai".

## Tarefas

| # | Tarefa | Testes novos | Total no fim | Quem faz |
| --- | --- | --- | --- | --- |
| 1 | Migrações da Link: meio-par, situação pelo modelo, tradução e decisões | 4 | 284 | implementador |
| 2 | Link falsa, casos reais e conferências de entrada | 5 | 289 | implementador |
| 3 | Ligação com o cadastro novo | 7 | 296 | implementador |
| 4 | Vendas gravadas no Kaizen | 11 | 307 | implementador |
| 5 | Caixa: fechamentos, sangrias e suprimentos | 3 | 310 | implementador |
| 6 | Contas a pagar e notas de entrada | 4 | 314 | implementador |
| 7 | Conferências de saída, resumo, comando e a ficha da venda | 7 | 321 | implementador |
| 8 | Travas contra uma cópia restaurada pela metade (achado da revisão do meio da fase) | 2 | 323 | implementador |
| 9 | Rodada contra a cópia antiga | — | 323 | implementador |
| 10 | Fechamento da construção | — | 323 | orquestrador |
| 11 | Rodada contra a cópia final (29/09, sessão nova; fica aberta nesta sessão) | — | 323 | orquestrador da sessão de 29/09 |

Depois da tarefa 4, o orquestrador pede uma revisão da branch inteira (`docs/LICOES.md`, Fase 2: revisar no meio da fase, logo depois das tarefas que se ligam).

A ordem dos arquivos de `sql/link/` numa rodada, numa transação só, como o usuário `kaizen`: `preparar` → `ligar` (o último comando devolve as decisões inválidas) → `vendas` → `caixa` → `contas` → `notas` → `cadastros` → `gravar` (o último comando devolve as contagens) → `sem-traducao` (tem de voltar vazio) → `comparar` (tem de voltar vazio) → commit → `resumo`.

---

### Tarefa 1: Migrações da Link: meio-par, situação pelo modelo, tradução e decisões

**O que esta tarefa entrega, em resultado:** o Kaizen passa a entender os códigos da Link no vocabulário do ERP novo, antes de qualquer documento da Link entrar. São 69 linhas de tradução, exatamente as da seção 8 da spec: a venda da Link vira `pedido`, o orçamento vira `orcamento`, a forma `Cartao/true` vira `credito`, e assim por diante. Os documentos da Link que não têm coluna de situação (orçamento, fechamento, sangria, suprimento, conta e nota) passam a aparecer como `emitido`, pela tradução do modelo; nos documentos do ERP novo nada muda. O Kaizen ganha também o arredondamento meio-par da Link (109,725 vira 109,72; 90,915 vira 90,92), que o valor do item usa na tarefa 4 e a comparação por dia usa na tarefa 7. E a `de_para` recebe as 22 decisões de ligação de cliente da spec (seção 6): o Consumidor Final da Link (10000502) é o 999007 do ERP novo, o 10000199 é o 484, e 20 clientes sem CPF/CNPJ ficam com o próprio código. São 4 testes novos, num commit.

**Arquivos:**
- Criar: `sql/migracoes/006_link.sql` (função `kaizen.meio_par`, visão `kaizen.documento_negocio` com a situação pelo modelo, 69 linhas de `kaizen.traducao` da fonte `link`)
- Criar: `sql/migracoes/007_de_para_link.sql` (22 decisões da `kaizen.de_para`)
- Testar: `tradutor/link-migracao.test.mts`
- Modificar: `testes-esperados.txt` (de `280` para `284`)
- Ler, sem mudar: `sql/migracoes/005_documento_negocio.sql` (a visão que a 006 substitui, com as mesmas 18 colunas na mesma ordem) e `tradutor/migracoes.test.mts` (o teste da visão que continua passando)

**Interfaces:**
- Consome (Fase 2, sem mudar nada):
  ```ts
  // tradutor/apoio-teste.mts
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>
  // banco de teste próprio em localhost:5434 (garantirLocal), conectado como kaizen; com migrar: false, só o esquema vazio

  // tradutor/migracoes.mts
  export const PASTA_MIGRACOES: string // caminho absoluto de sql/migracoes/
  export async function aplicarMigracoes(cliente: Cliente, pasta?: string): Promise<string[]>
  // aplica, em ordem de nome, os .sql da pasta que ainda não estão em kaizen.migracao, cada um numa transação
  ```
  e as tabelas da migração 001: `kaizen.traducao (fonte, campo, codigo, valor)`, chave `(fonte, campo, codigo)`; `kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen)`, chave `(entidade, fonte, codigo_origem)`; `kaizen.documento` (colunas cruas `modelo`, `status`, `movimento`, `financeiro`). Pelo `tradutor/banco.mts`, `numeric` chega como texto e `count(*)::int` chega como `number`.
- Produz (para as tarefas 2 a 7, que usam `criarBancoKaizen()` com todas as migrações):
  ```sql
  kaizen.meio_par(valor numeric, casas integer) returns numeric  -- immutable; a 2 casas, 109.725 -> 109.72, 90.915 -> 90.92
  -- usada por sql/link/vendas.sql (valor do item vendido, tarefa 4) e sql/link/comparar.sql e resumo.sql (tarefa 7)
  ```
  - `kaizen.documento_negocio`: as mesmas 18 colunas da 005, na mesma ordem; `situacao` passa a ser `coalesce(tradução de situacao pelo status, tradução de situacao_pelo_modelo pelo modelo)`, como já eram `movimento` e `financeiro`.
  - `kaizen.traducao` da fonte `link`, 69 linhas: `tipo` 12, `situacao` 2, `situacao_pelo_modelo` 12, `movimento_pelo_modelo` 12, `financeiro_pelo_modelo` 12, `forma` 13, `status_parcela` 2, `status_baixa` 1, `sentido` 3. Todo código cru que os arquivos de `sql/link/` gravam no Kaizen (tarefas 4 a 6) tem de estar nesta lista, e `sql/link/sem-traducao.sql` (tarefa 7) confere que nenhum fica de fora.
  - `kaizen.de_para`: 22 decisões, todas `('pessoa', 'link', <código do cliente na Link>, <código do ERP novo>)`, nenhuma com `codigo_kaizen` começando com `link:`. O `sql/link/ligar.sql` (tarefa 3) as lê antes da regra do CPF/CNPJ.
- `testes-esperados.txt` passa de `280` para `284`.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, no Git Bash, na branch `fase-3`, com o Postgres local no ar (`docker compose up -d --wait`). Confira o ponto de partida: `cat testes-esperados.txt` mostra `280`, e `ls sql/migracoes` mostra só `001_estrutura.sql` a `005_documento_negocio.sql`. Os dois SQL desta tarefa vêm do protótipo que rodou contra a cópia antiga da Link: copie cada bloco inteiro, sem mudar nem uma letra, com quebras de linha LF (o `.gitattributes` já manda `*.sql` em LF) e terminando com `;` seguido de uma quebra de linha. Depois que uma migração é aplicada em qualquer banco, ela não muda mais: uma tradução nova (por exemplo, um código novo na cópia final, spec seção 13) ou uma decisão nova na `de_para` (spec seção 3, passo 4) é migração nova, com número maior. Por isso o teste desta tarefa monta o seu banco só com as migrações até a 007, como o `tradutor/migracoes.test.mts` faz com as dele: uma migração de depois não quebra a conferência do conteúdo destas duas.

- [ ] **Passo 1: Escrever o teste das migrações da Link**

Crie `tradutor/link-migracao.test.mts`. Os valores esperados vêm da spec (seções 6, 7.2 e 8) e foram conferidos no banco do protótipo, com a tradução já aplicada. No teste 3, os documentos da Link têm os códigos, os modelos, os status e as datas que o tradutor grava para as negociações 1095, 8 e 1771, o fechamento 7 e a nota 15 da cópia antiga (`casos-esperados.json` do protótipo); o teste abre uma transação e a desfaz no fim, para o banco ficar como estava.

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'

// O banco recebe as migrações até a 007, e só elas, como no migracoes.test.mts: uma migração de depois (uma tradução
// nova para a cópia final, uma decisão nova na de_para) não pode quebrar a conferência do conteúdo destas duas.
const ATE_ESTA_TAREFA = readdirSync(PASTA_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql') && nome <= '007_de_para_link.sql')
  .sort()

let banco: BancoTeste
let pasta: string

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const nome of ATE_ESTA_TAREFA) copyFileSync(join(PASTA_MIGRACOES, nome), join(pasta, nome))
  banco = await criarBancoKaizen({ migrar: false })
  await aplicarMigracoes(banco.cliente, pasta)
})

after(async () => {
  await banco?.fechar()
  if (pasta) rmSync(pasta, { recursive: true, force: true })
})

test('meio_par arredonda a 2 casas e, no empate de meio centavo, vai para o par', async () => {
  const { rows } = await banco.cliente.query(`
    select v.valor::text as valor, kaizen.meio_par(v.valor, 2) as arredondado
    from (values (1, 109.725), (2, 142.405), (3, 90.915), (4, 68.875), (5, 206.625), (6, -109.725),
                 (7, 44.0466), (8, 23.7174), (9, 90.9151), (10, 150)) as v(ordem, valor)
    order by v.ordem`)
  assert.deepEqual(rows, [
    // Os empates de meio centavo da spec (seção 7.2): fica o centavo par.
    { valor: '109.725', arredondado: '109.72' },
    { valor: '142.405', arredondado: '142.40' },
    { valor: '90.915', arredondado: '90.92' },
    { valor: '68.875', arredondado: '68.88' },
    { valor: '206.625', arredondado: '206.62' },
    // O empate negativo também vai para o par.
    { valor: '-109.725', arredondado: '-109.72' },
    // Fora do empate, é o arredondamento comum: os dois itens devolvidos da 1095 dão 44,05 + 23,72 = 67,77.
    { valor: '44.0466', arredondado: '44.05' },
    { valor: '23.7174', arredondado: '23.72' },
    { valor: '90.9151', arredondado: '90.92' },
    { valor: '150', arredondado: '150.00' },
  ])
})

test('a traducao da Link tem as 69 linhas da seção 8 da spec', async () => {
  const porFonte = await banco.cliente.query(
    'select fonte, count(*)::int as linhas from kaizen.traducao group by fonte order by fonte collate "C"',
  )
  // A tradução do ERP novo continua com as 48 linhas da Fase 2.
  assert.deepEqual(porFonte.rows, [
    { fonte: 'link', linhas: 69 },
    { fonte: 'meuerp', linhas: 48 },
  ])
  const { rows } = await banco.cliente.query(
    `select campo, codigo, valor from kaizen.traducao where fonte = 'link' order by campo collate "C", codigo collate "C"`,
  )
  assert.deepEqual(rows.map((linha) => [linha.campo, linha.codigo, linha.valor]), [
    ['financeiro_pelo_modelo', '2.1.2.02', 'paga'],
    ['financeiro_pelo_modelo', '2.1.3.07', 'paga'],
    ['financeiro_pelo_modelo', '2.1.4.10', 'paga'],
    ['financeiro_pelo_modelo', '2.1.5.02', 'paga'],
    ['financeiro_pelo_modelo', '55', 'nenhum'],
    ['financeiro_pelo_modelo', 'A/true', 'recebe'],
    ['financeiro_pelo_modelo', 'P/false', 'nenhum'],
    ['financeiro_pelo_modelo', 'Sangria/false', 'paga'],
    ['financeiro_pelo_modelo', 'Sangria/true', 'paga'],
    ['financeiro_pelo_modelo', 'Suprimento/true', 'nenhum'],
    ['financeiro_pelo_modelo', 'T/true', 'recebe'],
    ['financeiro_pelo_modelo', 'caixa_fechamento', 'nenhum'],
    ['forma', '1.1.1.01', 'dinheiro'],
    ['forma', '1.1.1.02.01', 'banco'],
    ['forma', '2.1.2.03', 'troca'],
    ['forma', 'Cartao/false', 'debito'],
    ['forma', 'Cartao/true', 'credito'],
    ['forma', 'Dinheiro', 'dinheiro'],
    ['forma', 'Pix', 'pix'],
    ['forma', 'boleto', 'boleto'],
    ['forma', 'cartao', 'cartao'],
    ['forma', 'cheque', 'cheque'],
    ['forma', 'dinheiro', 'dinheiro'],
    ['forma', 'nota_promissoria', 'troca'],
    ['forma', 'pix', 'pix'],
    ['movimento_pelo_modelo', '2.1.2.02', 'nenhum'],
    ['movimento_pelo_modelo', '2.1.3.07', 'nenhum'],
    ['movimento_pelo_modelo', '2.1.4.10', 'nenhum'],
    ['movimento_pelo_modelo', '2.1.5.02', 'nenhum'],
    ['movimento_pelo_modelo', '55', 'entrada'],
    ['movimento_pelo_modelo', 'A/true', 'saida'],
    ['movimento_pelo_modelo', 'P/false', 'nenhum'],
    ['movimento_pelo_modelo', 'Sangria/false', 'nenhum'],
    ['movimento_pelo_modelo', 'Sangria/true', 'nenhum'],
    ['movimento_pelo_modelo', 'Suprimento/true', 'nenhum'],
    ['movimento_pelo_modelo', 'T/true', 'saida'],
    ['movimento_pelo_modelo', 'caixa_fechamento', 'nenhum'],
    ['sentido', 'E', 'entrada'],
    ['sentido', 'N', 'nenhum'],
    ['sentido', 'S', 'saida'],
    ['situacao', 'false', 'emitido'],
    ['situacao', 'true', 'cancelado'],
    ['situacao_pelo_modelo', '2.1.2.02', 'emitido'],
    ['situacao_pelo_modelo', '2.1.3.07', 'emitido'],
    ['situacao_pelo_modelo', '2.1.4.10', 'emitido'],
    ['situacao_pelo_modelo', '2.1.5.02', 'emitido'],
    ['situacao_pelo_modelo', '55', 'emitido'],
    ['situacao_pelo_modelo', 'A/true', 'emitido'],
    ['situacao_pelo_modelo', 'P/false', 'emitido'],
    ['situacao_pelo_modelo', 'Sangria/false', 'emitido'],
    ['situacao_pelo_modelo', 'Sangria/true', 'emitido'],
    ['situacao_pelo_modelo', 'Suprimento/true', 'emitido'],
    ['situacao_pelo_modelo', 'T/true', 'emitido'],
    ['situacao_pelo_modelo', 'caixa_fechamento', 'emitido'],
    ['status_baixa', 'true', 'valida'],
    ['status_parcela', 'false', 'pendente'],
    ['status_parcela', 'true', 'baixada'],
    ['tipo', '2.1.2.02', 'conta_pagar'],
    ['tipo', '2.1.3.07', 'conta_pagar'],
    ['tipo', '2.1.4.10', 'conta_pagar'],
    ['tipo', '2.1.5.02', 'conta_pagar'],
    ['tipo', '55', 'nota_entrada'],
    ['tipo', 'A/true', 'pedido'],
    ['tipo', 'P/false', 'orcamento'],
    ['tipo', 'Sangria/false', 'sangria'],
    ['tipo', 'Sangria/true', 'sangria'],
    ['tipo', 'Suprimento/true', 'suprimento'],
    ['tipo', 'T/true', 'pedido'],
    ['tipo', 'caixa_fechamento', 'fechamento_caixa'],
  ])
})

test('documento_negocio usa a situação pelo modelo quando o status vem vazio, e nada muda no ERP novo', async () => {
  const q = banco.cliente
  await q.query('begin')
  try {
    // Documentos da Link como o tradutor grava (spec 7.1; códigos e datas reais da cópia antiga) e dois do ERP novo.
    await q.query(`
      insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
      values ('link', 'negociacao', '1095', '1216', 'A/true', 'false', null, null, '2026-05-21 14:56:02.172769'),
             ('link', 'negociacao', '8', '2', 'A/true', 'true', null, null, '2026-04-11 19:07:18.453891'),
             ('link', 'negociacao', '1771', '5', 'P/false', null, null, null, '2026-06-10 15:16:04.450986'),
             ('link', 'caixa_fechamento', '7', '7', 'caixa_fechamento', null, null, null, '2026-04-13 13:42:21.195448'),
             ('link', 'nota_entrada', '15', '15', '55', null, null, null, '2026-05-20 15:38:20.752567'),
             ('meuerp', 'documento', '185', '50', 'PA', 'E', 'S', 'R', '2026-09-28 09:15:00'),
             ('meuerp', 'documento', '186', '51', '55', 'A', 'S', 'R', '2026-09-28 09:20:00')`)
    const { rows } = await q.query(`
      select fonte, origem_tabela, origem_id, tipo, status, situacao, movimento, financeiro
      from kaizen.documento_negocio order by id`)
    const linha = (
      fonte: string, origem_tabela: string, origem_id: string, tipo: string,
      status: string | null, situacao: string | null, movimento: string, financeiro: string,
    ) => ({ fonte, origem_tabela, origem_id, tipo, status, situacao, movimento, financeiro })
    assert.deepEqual(rows, [
      // Venda válida (caixa ativo) e venda cancelada (caixa inativo): a situação vem do status.
      linha('link', 'negociacao', '1095', 'pedido', 'false', 'emitido', 'saida', 'recebe'),
      linha('link', 'negociacao', '8', 'pedido', 'true', 'cancelado', 'saida', 'recebe'),
      // Sem status (orçamento, fechamento, nota), a situação vem pelo modelo.
      linha('link', 'negociacao', '1771', 'orcamento', null, 'emitido', 'nenhum', 'nenhum'),
      linha('link', 'caixa_fechamento', '7', 'fechamento_caixa', null, 'emitido', 'nenhum', 'nenhum'),
      linha('link', 'nota_entrada', '15', 'nota_entrada', null, 'emitido', 'entrada', 'nenhum'),
      // No ERP novo, nada muda: o pedido emitido segue emitido, e o 55 (a NF-e dele) com um status que a tradução
      // não tem fica com a situação vazia, como antes; a linha 55 da Link não vale para ele.
      linha('meuerp', 'documento', '185', 'pedido', 'E', 'emitido', 'saida', 'recebe'),
      linha('meuerp', 'documento', '186', 'nfe', 'A', null, 'saida', 'recebe'),
    ])
  } finally {
    await q.query('rollback')
  }
})

test('a de_para tem as 22 decisões da Link, todas de pessoa', async () => {
  const resumo = await banco.cliente.query(`
    select entidade, fonte, count(*)::int as linhas,
           count(*) filter (where codigo_kaizen like 'link:%')::int as falhas
    from kaizen.de_para group by entidade, fonte`)
  // Só decisões: nenhuma aponta para link:, que é como o tradutor grava as falhas.
  assert.deepEqual(resumo.rows, [{ entidade: 'pessoa', fonte: 'link', linhas: 22, falhas: 0 }])
  const { rows } = await banco.cliente.query(
    'select codigo_origem, codigo_kaizen from kaizen.de_para order by codigo_origem::bigint',
  )
  // Os 20 clientes sem CPF/CNPJ que têm o mesmo código e o mesmo nome nos dois cadastros ficam com o próprio código.
  const mesmoCodigo = ['21', '75', '84', '142', '145', '172', '212', '213', '214', '216',
    '236', '250', '274', '276', '279', '290', '298', '361', '384', '409'].map((codigo) => [codigo, codigo])
  assert.deepEqual(rows.map((linha) => [linha.codigo_origem, linha.codigo_kaizen]), [
    ...mesmoCodigo,
    ['10000199', '484'], // renumerado na migração para o ERP novo
    ['10000502', '999007'], // o Consumidor Final
  ])
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-migracao.test.mts`
Saída esperada: falha, com `ℹ tests 4`, `ℹ pass 0` e `ℹ fail 4`:
```
✖ meio_par arredonda a 2 casas e, no empate de meio centavo, vai para o par
✖ a traducao da Link tem as 69 linhas da seção 8 da spec
✖ documento_negocio usa a situação pelo modelo quando o status vem vazio, e nada muda no ERP novo
✖ a de_para tem as 22 decisões da Link, todas de pessoa
```
com estes motivos, cada um porque a migração ainda não existe:
- o 1º, `error: function kaizen.meio_par(numeric, integer) does not exist` (código `42883`);
- o 2º, `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal`, com `actual: [ { fonte: 'meuerp', linhas: 48 } ]` (só a tradução do ERP novo);
- o 3º, o mesmo `AssertionError`, com `tipo`, `situacao`, `movimento` e `financeiro` vazios (`null`) nos cinco documentos da Link;
- o 4º, o mesmo `AssertionError`, com `+ []` (a `de_para` vazia).

Se o 1º falhar com outra mensagem (conexão recusada, por exemplo), o Postgres local não está no ar: `docker compose up -d --wait` e rode de novo.

- [ ] **Passo 3: Criar `sql/migracoes/006_link.sql`**

Três peças, numa migração só: a função do arredondamento meio-par, a visão `documento_negocio` com a situação pelo modelo e as 69 linhas de tradução da fonte `link`. A visão troca só a coluna `situacao` (de `ts.valor` para `coalesce(ts.valor, tsm.valor)`, com o `left join` novo `tsm`); todo `join` compara `fonte`, então a linha `55` da Link nunca vale para o `55` (NF-e) do ERP novo.

```sql
-- arredonda a <casas> casas; no empate exato de meio, vai para o par (109,725 -> 109,72; 90,915 -> 90,92)
create function kaizen.meio_par(valor numeric, casas integer) returns numeric
language sql immutable
as $$
  select case
    when abs(valor * power(10::numeric, casas) % 1) = 0.5
      then round(round(valor * power(10::numeric, casas) / 2) * 2 / power(10::numeric, casas), casas)
    else round(valor, casas)
  end
$$;

-- a situação sem coluna própria (orçamento, fechamento, sangria, suprimento, conta, nota da Link) vem pelo modelo
create or replace view kaizen.documento_negocio as
select
  d.id, d.fonte, d.origem_tabela, d.origem_id, d.codigo, d.modelo,
  tt.valor as tipo,
  d.status,
  coalesce(ts.valor, tsm.valor) as situacao,
  coalesce(tm.valor, tmm.valor) as movimento,
  coalesce(tf.valor, tfm.valor) as financeiro,
  d.criado_em, d.fechado_em, d.pessoa,
  d.turno_caixa, d.turno_usuario, d.turno_numero, d.visto_em
from kaizen.documento d
left join kaizen.traducao tt on tt.fonte = d.fonte and tt.campo = 'tipo' and tt.codigo = d.modelo
left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'situacao' and ts.codigo = d.status
left join kaizen.traducao tsm on tsm.fonte = d.fonte and tsm.campo = 'situacao_pelo_modelo' and tsm.codigo = d.modelo
left join kaizen.traducao tm on tm.fonte = d.fonte and tm.campo = 'movimento' and tm.codigo = d.movimento
left join kaizen.traducao tmm on tmm.fonte = d.fonte and tmm.campo = 'movimento_pelo_modelo' and tmm.codigo = d.modelo
left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'financeiro' and tf.codigo = d.financeiro
left join kaizen.traducao tfm on tfm.fonte = d.fonte and tfm.campo = 'financeiro_pelo_modelo' and tfm.codigo = d.modelo;

-- os códigos da Link no vocabulário do ERP novo; cartao, banco e nota_entrada são os três valores que ele não tem
insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('link', 'tipo', 'A/true', 'pedido'),
  ('link', 'tipo', 'T/true', 'pedido'),
  ('link', 'tipo', 'P/false', 'orcamento'),
  ('link', 'tipo', 'caixa_fechamento', 'fechamento_caixa'),
  ('link', 'tipo', 'Sangria/true', 'sangria'),
  ('link', 'tipo', 'Sangria/false', 'sangria'),
  ('link', 'tipo', 'Suprimento/true', 'suprimento'),
  ('link', 'tipo', '2.1.2.02', 'conta_pagar'),
  ('link', 'tipo', '2.1.3.07', 'conta_pagar'),
  ('link', 'tipo', '2.1.4.10', 'conta_pagar'),
  ('link', 'tipo', '2.1.5.02', 'conta_pagar'),
  ('link', 'tipo', '55', 'nota_entrada'),
  ('link', 'situacao', 'false', 'emitido'),
  ('link', 'situacao', 'true', 'cancelado'),
  ('link', 'situacao_pelo_modelo', 'A/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'T/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'P/false', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'caixa_fechamento', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'Sangria/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'Sangria/false', 'emitido'),
  ('link', 'situacao_pelo_modelo', 'Suprimento/true', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.2.02', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.3.07', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.4.10', 'emitido'),
  ('link', 'situacao_pelo_modelo', '2.1.5.02', 'emitido'),
  ('link', 'situacao_pelo_modelo', '55', 'emitido'),
  ('link', 'movimento_pelo_modelo', 'A/true', 'saida'),
  ('link', 'movimento_pelo_modelo', 'T/true', 'saida'),
  ('link', 'movimento_pelo_modelo', 'P/false', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'caixa_fechamento', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'Sangria/true', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'Sangria/false', 'nenhum'),
  ('link', 'movimento_pelo_modelo', 'Suprimento/true', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.2.02', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.3.07', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.4.10', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '2.1.5.02', 'nenhum'),
  ('link', 'movimento_pelo_modelo', '55', 'entrada'),
  ('link', 'financeiro_pelo_modelo', 'A/true', 'recebe'),
  ('link', 'financeiro_pelo_modelo', 'T/true', 'recebe'),
  ('link', 'financeiro_pelo_modelo', 'P/false', 'nenhum'),
  ('link', 'financeiro_pelo_modelo', 'caixa_fechamento', 'nenhum'),
  ('link', 'financeiro_pelo_modelo', 'Sangria/true', 'paga'),
  ('link', 'financeiro_pelo_modelo', 'Sangria/false', 'paga'),
  ('link', 'financeiro_pelo_modelo', 'Suprimento/true', 'nenhum'),
  ('link', 'financeiro_pelo_modelo', '2.1.2.02', 'paga'),
  ('link', 'financeiro_pelo_modelo', '2.1.3.07', 'paga'),
  ('link', 'financeiro_pelo_modelo', '2.1.4.10', 'paga'),
  ('link', 'financeiro_pelo_modelo', '2.1.5.02', 'paga'),
  ('link', 'financeiro_pelo_modelo', '55', 'nenhum'),
  ('link', 'forma', 'Dinheiro', 'dinheiro'),
  ('link', 'forma', 'Pix', 'pix'),
  ('link', 'forma', 'Cartao/true', 'credito'),
  ('link', 'forma', 'Cartao/false', 'debito'),
  ('link', 'forma', '2.1.2.03', 'troca'),
  ('link', 'forma', '1.1.1.01', 'dinheiro'),
  ('link', 'forma', '1.1.1.02.01', 'banco'),
  ('link', 'forma', 'dinheiro', 'dinheiro'),
  ('link', 'forma', 'pix', 'pix'),
  ('link', 'forma', 'cartao', 'cartao'),
  ('link', 'forma', 'nota_promissoria', 'troca'),
  ('link', 'forma', 'cheque', 'cheque'),
  ('link', 'forma', 'boleto', 'boleto'),
  ('link', 'status_parcela', 'false', 'pendente'),
  ('link', 'status_parcela', 'true', 'baixada'),
  ('link', 'status_baixa', 'true', 'valida'),
  ('link', 'sentido', 'S', 'saida'),
  ('link', 'sentido', 'E', 'entrada'),
  ('link', 'sentido', 'N', 'nenhum');
```

- [ ] **Passo 4: Criar `sql/migracoes/007_de_para_link.sql`**

As decisões da spec (decisão 5 e seção 6), todas de pessoa. O tradutor nunca as apaga: ele só refaz as linhas cujo `codigo_kaizen` começa com `link:` (as falhas).

```sql
-- Decisões de ligação dos clientes da Link (spec da Fase 3, seção 6): valem antes da regra do CPF/CNPJ.
-- 10000502 é o Consumidor Final; 10000199 foi renumerado para 484 na migração;
-- os outros 20 estão sem CPF/CNPJ nos dois cadastros, com o mesmo código e o mesmo nome.
insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen) values
  ('pessoa', 'link', '10000502', '999007'),
  ('pessoa', 'link', '10000199', '484'),
  ('pessoa', 'link', '21', '21'),
  ('pessoa', 'link', '75', '75'),
  ('pessoa', 'link', '84', '84'),
  ('pessoa', 'link', '142', '142'),
  ('pessoa', 'link', '145', '145'),
  ('pessoa', 'link', '172', '172'),
  ('pessoa', 'link', '212', '212'),
  ('pessoa', 'link', '213', '213'),
  ('pessoa', 'link', '214', '214'),
  ('pessoa', 'link', '216', '216'),
  ('pessoa', 'link', '236', '236'),
  ('pessoa', 'link', '250', '250'),
  ('pessoa', 'link', '274', '274'),
  ('pessoa', 'link', '276', '276'),
  ('pessoa', 'link', '279', '279'),
  ('pessoa', 'link', '290', '290'),
  ('pessoa', 'link', '298', '298'),
  ('pessoa', 'link', '361', '361'),
  ('pessoa', 'link', '384', '384'),
  ('pessoa', 'link', '409', '409');
```

- [ ] **Passo 5: Conferir que os dois arquivos são os do plano**

Rode (Git Bash): `grep -c "^  ('link', " sql/migracoes/006_link.sql; grep -c "^  ('pessoa', 'link', " sql/migracoes/007_de_para_link.sql; wc -l sql/migracoes/006_link.sql sql/migracoes/007_de_para_link.sql; sha256sum sql/migracoes/006_link.sql sql/migracoes/007_de_para_link.sql`
Saída esperada:
```
69
22
 102 sql/migracoes/006_link.sql
  26 sql/migracoes/007_de_para_link.sql
 128 total
ceb437c4ac186ea47c225eaa5b71eab0e115433499d5103e075b97989dff29ce *sql/migracoes/006_link.sql
377f2c5633600c725a6886af2b0e5e85885d3426e16a3bda15c9b771e7eb2f92 *sql/migracoes/007_de_para_link.sql
```
(69 linhas de tradução, 22 decisões; o sha256 é o dos arquivos do protótipo.) Se o sha256 não bater, a diferença mais comum é a quebra de linha: o arquivo tem de estar em LF (`grep -c $'\r' sql/migracoes/006_link.sql` dá `0`) e terminar com `;` e uma quebra de linha. Corrija o arquivo copiando o bloco de novo; não mude o conteúdo para fazer o teste passar.

- [ ] **Passo 6: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-migracao.test.mts`
Saída esperada: passa, com `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0` e:
```
✔ meio_par arredonda a 2 casas e, no empate de meio centavo, vai para o par
✔ a traducao da Link tem as 69 linhas da seção 8 da spec
✔ documento_negocio usa a situação pelo modelo quando o status vem vazio, e nada muda no ERP novo
✔ a de_para tem as 22 decisões da Link, todas de pessoa
```

- [ ] **Passo 7: Conferir que os testes das migrações da Fase 2 continuam passando**

A 006 substitui a visão da 005. O teste da Fase 2 sobre a visão (`a visão documento_negocio traduz os códigos e, na Link, usa a tradução pelo modelo`) monta o banco dele só com as migrações da tarefa dele (001, 002, 003 e 005), então continua conferindo a visão da 005; a visão nova é conferida pelo teste 3 desta tarefa. O teste `aplica todas as migrações do repositório, na ordem do nome, e registra cada uma` agora aplica também a 006 e a 007.

Rode: `node --test tradutor/migracoes.test.mts`
Saída esperada: passa, com `ℹ tests 11`, `ℹ pass 11`, `ℹ fail 0` e:
```
✔ aplica as migrações de uma pasta na ordem do nome, registra cada uma e depois só as que faltam
✔ aplica todas as migrações do repositório, na ordem do nome, e registra cada uma
✔ as migrações desta tarefa criam as 17 tabelas do Kaizen, o registro e a visão
✔ rodar as migrações de novo não aplica nada
✔ as migrações rodam como kaizen, que não é superusuário e é dono das tabelas
✔ traducao tem as 48 linhas da carga inicial, com os significados combinados
✔ corte tem as 8 tabelas do ERP, sem nulo, com o documento em 184
✔ a visão documento_negocio traduz os códigos e, na Link, usa a tradução pelo modelo
✔ apagar um documento apaga itens, pagamentos, parcelas, baixas e conferência; o movimento de estoque fica
✔ migração com erro vira ErroKaizen, desfaz o que ela fez e não fica registrada
✔ o banco de teste é só do teste, conecta como kaizen e some ao fechar
```

- [ ] **Passo 8: Atualizar `testes-esperados.txt` (N = 4)**

Esta tarefa acrescentou 4 `test(` (todos em `tradutor/link-migracao.test.mts`). Some ao número atual: 280 + 4 = 284. O arquivo fica com uma única linha:

```text
284
```

- [ ] **Passo 9: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 284 testes com ✔ (os da Fase 2 continuam passando com a 006 e a 007 aplicadas em todo banco de teste); última linha `rodou 284 testes, esperados 284`.

- [ ] **Passo 10: Commit**

```bash
git add sql/migracoes/006_link.sql sql/migracoes/007_de_para_link.sql tradutor/link-migracao.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Link: o Kaizen entende os códigos da Link e tem as 22 decisões de cliente

A migração 006 põe no Kaizen as 69 linhas de tradução da Link,
exatamente as da seção 8 da spec: a venda da Link vira pedido, o
orçamento vira orcamento, o cartão de crédito vira credito, e assim por
diante, no vocabulário do ERP novo. Os documentos da Link sem coluna de
situação (orçamento, fechamento, sangria, suprimento, conta e nota)
passam a aparecer como emitidos, pelo modelo; nos documentos do ERP novo
nada muda. Ela cria também o arredondamento meio-par da Link, que leva
109,725 a 109,72 e 90,915 a 90,92.

A migração 007 grava as 22 decisões de ligação de cliente: o Consumidor
Final da Link (10000502) é o 999007 do ERP novo, o 10000199 é o 484, e
20 clientes sem CPF/CNPJ ficam com o próprio código.
Testes: rodou 284, esperados 284.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 284 testes, esperados 284`; o commit sai.


### Tarefa 2: Link falsa, casos reais e conferências de entrada

**O que esta tarefa entrega, em resultado:** o comando da Link passa a ter a porta de entrada. Antes de ler qualquer coisa, ele confere a cópia da Link e para, com a razão numa frase e sem gravar nada, em três casos: falta na cópia uma das 119 colunas (de 20 tabelas) que o tradutor lê, e a mensagem diz qual (`negociacao.venda`, por exemplo); o Kaizen ainda não tem o cadastro do ERP novo; ou a cópia não tem nenhuma negociação (uma restauração que falhou). Para os testes das tarefas seguintes, fica pronta a "Link falsa": o esquema `erp` do banco de teste, só com essas 119 colunas, carregado com 290 linhas reais da cópia antiga (16 negociações, 45 itens vendidos, 10 devolvidos, 12 pagamentos do caixa, 3 fechamentos, 24 lançamentos, 2 notas de entrada, com nomes, CPF e CNPJ inventados), e o cadastro do ERP novo desses casos no Kaizen (40 produtos, 35 pessoas, 9 funcionários). Os testes provam que cada valor volta do banco com o mesmo texto do arquivo e que o usuário `kaizen` lê o `erp` mas não consegue escrever nele. São 5 testes novos, num commit.

**Arquivos:**
- Criar: `sql/link/colunas-esperadas.txt` (as 119 colunas do `erp` que o tradutor lê, uma por linha: tabela, coluna e tipo)
- Criar: `sql/link/colunas.sql` (a consulta que devolve as colunas da lista que faltam no `erp`)
- Criar (cópia do protótipo, nunca à mão): `tradutor/link-casos.json`
- Criar: `tradutor/link.mts` (primeira versão: só as conferências de entrada)
- Criar: `tradutor/link-falsa.mts` (só para testes)
- Testar: `tradutor/link-falsa.test.mts`
- Modificar: `testes-esperados.txt` (de `284` para `289`)

**Interfaces:**
- Consome (Fase 2, sem mudar):
  ```ts
  // tradutor/apoio-teste.mts
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste> // banco próprio, conectado como kaizen, com todas as migrações
  export function urlDoBanco(nome: string, usuario: 'postgres' | 'kaizen'): string
  // tradutor/banco.mts
  export type Cliente = pg.Client
  export function garantirLocal(url: string): void // só localhost:5434
  export async function conectar(url: string): Promise<Cliente> // já com time zone America/Fortaleza e datestyle ISO, YMD
  ```
  Os parsers do `banco.mts`: `numeric`, `bigint`, `timestamp` e `date` chegam como texto; `count(*)::int` e `integer` chegam como `number`; `boolean` chega como `true`/`false`. As tabelas `kaizen.produto`, `kaizen.pessoa` e `kaizen.funcionario` da migração 001 (chave `(fonte, codigo)`, `lido_em` com `default now()`). Da Tarefa 1, nada diretamente: `criarBancoKaizen` aplica as migrações 006 e 007 junto com as outras, e nada aqui depende delas.
- Produz (as tarefas 3 a 7 usam; os nomes e as mensagens são os do esqueleto, ao pé da letra):
  ```ts
  // tradutor/link.mts
  export class ErroLink extends Error {}
  export type ColunaLink = { tabela: string; coluna: string; tipo: string }
  export function lerColunasEsperadasLink(): ColunaLink[] // sql/link/colunas-esperadas.txt, na ordem do arquivo
  export async function conferirColunasLink(cliente: Cliente): Promise<string[]> // 'tabela.coluna' de cada coluna que falta no erp
  export async function conferirEntradaLink(cliente: Cliente): Promise<void>
  // lança ErroLink, nesta ordem de conferência, com exatamente:
  //   `a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`
  //   'o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo'
  //   'a cópia da Link não tem nenhuma negociação: a restauração deu certo?'
  // tradutor/link-falsa.mts
  export type LinhaCaso = Record<string, string | null>
  export type CasosLink = Record<string, LinhaCaso[]> // chaves: as 20 tabelas do erp e 'kaizen.produto', 'kaizen.pessoa', 'kaizen.funcionario'
  export function lerCasosLink(): CasosLink // lê tradutor/link-casos.json; recusa valor que não seja texto ou null
  export type LinkFalsa = {
    inserir(tabela: string, linhas: LinhaCaso[]): Promise<void> // no esquema erp do banco de teste, como postgres
    executar(sql: string): Promise<void> // um comando qualquer como postgres no banco de teste
    fechar(): Promise<void> // fecha a conexão de postgres; o esquema some com o banco de teste
  }
  export async function criarLinkFalsa(banco: BancoTeste): Promise<LinkFalsa>
  export async function carregarCasosLink(falsa: LinkFalsa, cliente: Cliente, casos?: CasosLink): Promise<void>
  ```
  `sql/link/colunas.sql` é um comando só, com `$1` (tabelas) e `$2` (colunas), par a par, sem `;` no fim.
- `testes-esperados.txt` passa de `284` para `289`.

**Antes de começar:** rode tudo no Git Bash, a partir de `C:\Projetos\KAIZEN`, na branch `fase-3`, com a Tarefa 1 já commitada (`testes-esperados.txt` com `284`) e o Postgres local no ar (`docker compose up -d --wait`). O arquivo dos casos vem da pasta do protótipo desta sessão; se `C:/Users/Israel/AppData/Local/Temp/claude/c--Projetos-KAIZEN/845bc9f5-0cea-4a5c-8650-0bc3abcb587c/scratchpad/prototipo/casos-reais.json` não existir, pare e avise o orquestrador: os casos não se inventam. Os testes mexem na Link falsa (apagam uma coluna, esvaziam a negociação) só pela `LinkFalsa.executar`, dentro do banco de teste; nada de `drop` ou `alter` no `erp` pelo terminal (o gancho `guarda-bash.js` recusa, e o `erp` de verdade não se toca). O `.gitattributes` não cobre `.txt` nem `.json`: no `git add`, o Git avisa `LF will be replaced by CRLF` para esses dois; é aviso, não erro, e não muda nada aqui (`lerColunasEsperadasLink` tira o `\r` de cada linha, e o `JSON.parse` ignora).

- [ ] **Passo 1: Criar a lista das colunas e a consulta que confere**

A lista tem cada par (tabela, coluna) do `erp` que alguma consulta de `sql/link/` lê, com o tipo que a cópia da Link tem, em ordem de tabela e coluna. `character` é o `bpchar` da Link (a UF e o tipo da negociação). O comando confere a lista antes de ler; a Link falsa dos testes é criada só com ela, então uma consulta que leia coluna fora da lista quebra no teste.

Crie `sql/link/colunas-esperadas.txt` exatamente com estas 119 linhas (quebras de linha LF, uma no fim):

```text
caixa data_hora timestamp
caixa id_caixa bigint
caixa id_negociacao bigint
caixa inativo boolean
caixa_fechamento boleto numeric
caixa_fechamento boleto_informado numeric
caixa_fechamento cartao numeric
caixa_fechamento cartao_informado numeric
caixa_fechamento cheque numeric
caixa_fechamento cheque_informado numeric
caixa_fechamento data_hora timestamp
caixa_fechamento data_hora_abertura timestamp
caixa_fechamento dinheiro numeric
caixa_fechamento dinheiro_informado numeric
caixa_fechamento id_caixa_fechamento bigint
caixa_fechamento id_usuario bigint
caixa_fechamento nota_promissoria numeric
caixa_fechamento nota_promissoria_informado numeric
caixa_fechamento pix numeric
caixa_fechamento pix_informado numeric
caixa_parcela credito_ou_debito_cartao boolean
caixa_parcela forma_pagamento varchar
caixa_parcela id_caixa bigint
caixa_parcela id_caixa_parcela bigint
caixa_parcela valor numeric
cidade cod_cidade integer
cidade descricao varchar
cidade id_cidade bigint
cidade sigla_estado character
cliente bairro varchar
cliente cliente_codigo varchar
cliente cnpj varchar
cliente cpf varchar
cliente id_cidade bigint
cliente id_cliente bigint
cliente inativo boolean
cliente nome varchar
compra id_compra bigint
compra id_fornecedor bigint
compra id_nota_entrada bigint
compra_item entrada_concluida boolean
compra_item id_compra bigint
compra_item id_compra_item bigint
compra_item id_produto bigint
compra_item qtd numeric
fornecedor bairro varchar
fornecedor cpf_cnpj varchar
fornecedor fornecedor_codigo bigint
fornecedor id_cidade bigint
fornecedor id_fornecedor bigint
fornecedor inativo boolean
fornecedor razao_social varchar
marca descricao varchar
marca id_marca bigint
negociacao acrescimo_percentual numeric
negociacao data timestamp
negociacao desconto_percentual numeric
negociacao id_cliente bigint
negociacao id_negociacao bigint
negociacao id_usuario bigint
negociacao orcamento_codigo bigint
negociacao tipo character
negociacao valor_total_devolucao numeric
negociacao valor_total_venda numeric
negociacao venda boolean
negociacao venda_codigo bigint
negociacao_item_devolvido id_negociacao bigint
negociacao_item_devolvido id_negociacao_item_devolvido bigint
negociacao_item_devolvido id_produto bigint
negociacao_item_devolvido preco_liquido_unitario numeric
negociacao_item_devolvido qtd numeric
negociacao_item_vendido desconto_percentual numeric
negociacao_item_vendido id_negociacao bigint
negociacao_item_vendido id_negociacao_item_vendido bigint
negociacao_item_vendido id_produto bigint
negociacao_item_vendido preco_bruto_unitario numeric
negociacao_item_vendido qtd numeric
negociacao_item_vendido valor_acrescimo_padrao numeric
nota_entrada data_hora_insert timestamp
nota_entrada id_fornecedor bigint
nota_entrada id_nota_entrada bigint
nota_entrada modelo varchar
pc_lancamento data_emissao timestamp
pc_lancamento id_caixa bigint
pc_lancamento id_pc_lancamento bigint
pc_lancamento obs varchar
pc_lancamento orientacao boolean
pc_lancamento valor numeric
pc_lancamento_fonte id_fornecedor bigint
pc_lancamento_fonte id_pc_lancamento bigint
pc_lancamento_fonte id_pc_lancamento_fonte bigint
pc_lancamento_fonte id_pc_lancamento_parcela bigint
pc_lancamento_fonte id_ped_entrada bigint
pc_lancamento_fonte origem_positiva boolean
pc_lancamento_fonte pc_codigo_origem varchar
pc_lancamento_fonte valor numeric
pc_lancamento_parcela data_vencimento date
pc_lancamento_parcela destino_positiva boolean
pc_lancamento_parcela documento varchar
pc_lancamento_parcela id_pc_lancamento bigint
pc_lancamento_parcela id_pc_lancamento_parcela bigint
pc_lancamento_parcela liquidada boolean
pc_lancamento_parcela pc_codigo_destino varchar
pc_lancamento_parcela valor numeric
prod_grupo descricao varchar
prod_grupo id_prod_grupo bigint
prod_subgrupo descricao varchar
prod_subgrupo id_prod_grupo bigint
prod_subgrupo id_prod_subgrupo bigint
produto descricao varchar
produto id_marca bigint
produto id_prod_subgrupo bigint
produto id_produto bigint
produto inativo boolean
produto preco_custo numeric
produto produto_codigo varchar
usuario id_usuario bigint
usuario inativo boolean
usuario nome varchar
```

Crie `sql/link/colunas.sql` exatamente assim (um comando só, sem `;` no fim, com uma quebra de linha depois do `collate "C"`):

```sql
-- $1: tabelas; $2: colunas, par a par (sql/link/colunas-esperadas.txt). Devolve os pares que faltam no esquema erp.
select e.tabela, e.coluna
from unnest($1::text[], $2::text[]) as e (tabela, coluna)
where not exists (
  select 1
  from information_schema.columns c
  where c.table_schema = 'erp' and c.table_name = e.tabela and c.column_name = e.coluna
)
order by e.tabela collate "C", e.coluna collate "C"
```

Rode: `wc -l sql/link/colunas-esperadas.txt; sha256sum sql/link/colunas-esperadas.txt sql/link/colunas.sql`
Saída esperada (os dois arquivos são os do protótipo, byte a byte):
```
119 sql/link/colunas-esperadas.txt
471b058a8f071a378421c4c6b71db95d9cfddb43123d6398b69d41841e342089 *sql/link/colunas-esperadas.txt
11a84feed8f701bf6a27617ee79619a3b60df1eff5b3563824408be61b179113 *sql/link/colunas.sql
```
Se um sha256 não bater, o arquivo não está igual ao bloco acima (um espaço, uma linha a mais, CRLF): corrija até bater.

- [ ] **Passo 2: Copiar os casos reais e conferir**

Os casos são linhas reais da cópia antiga, escolhidas pelo protótipo (as vendas 1992, 1095, 434, 435, 108, 358, 427, 3613, 392, 5061, 2492, 8, 1771, 556, 1073 e 100; os fechamentos 7, 1 e 3; as sangrias 91 e 31; o suprimento 12; as contas 1396 e 8396; a bonificação 790; as notas 15 e 58), só com as colunas da lista, e com nomes, razões sociais, CPF e CNPJ trocados por inventados. Nas chaves `kaizen.*` está o cadastro do ERP novo que esses casos citam, também anonimizado. Todo valor é texto ou `null`: nenhum número passa pelo JavaScript. O arquivo é copiado, nunca editado à mão.

Rode:
```bash
cp "C:/Users/Israel/AppData/Local/Temp/claude/c--Projetos-KAIZEN/845bc9f5-0cea-4a5c-8650-0bc3abcb587c/scratchpad/prototipo/casos-reais.json" tradutor/link-casos.json
sha256sum tradutor/link-casos.json
node -e "const casos = JSON.parse(require('node:fs').readFileSync('tradutor/link-casos.json', 'utf8')); let linhas = 0; for (const [chave, lista] of Object.entries(casos)) { console.log(chave, lista.length); if (!chave.startsWith('kaizen.')) linhas += lista.length } console.log('tabelas do erp:', Object.keys(casos).filter((chave) => !chave.startsWith('kaizen.')).length, '- linhas do erp:', linhas)"
```
Saída esperada:
```
032abd95a35d5a3df545d20a0054a104493fd9f2c89f554f4906a49af2199481 *tradutor/link-casos.json
caixa 15
caixa_fechamento 3
caixa_parcela 12
cidade 6
cliente 12
compra 3
compra_item 2
fornecedor 4
marca 11
negociacao 16
negociacao_item_devolvido 10
negociacao_item_vendido 45
nota_entrada 2
pc_lancamento 24
pc_lancamento_fonte 24
pc_lancamento_parcela 33
prod_grupo 11
prod_subgrupo 11
produto 42
usuario 4
kaizen.produto 40
kaizen.pessoa 35
kaizen.funcionario 9
tabelas do erp: 20 - linhas do erp: 290
```
São as 20 tabelas de `sql/link/colunas-esperadas.txt` e as 3 chaves do cadastro do ERP novo (84 linhas). Se o sha256 não bater, o protótipo mudou depois deste plano: pare e avise o orquestrador, não siga com outro arquivo.

- [ ] **Passo 3: Escrever o teste da Link falsa**

Um banco de teste para o arquivo, com a Link falsa carregada no `before`. Os testes que mexem na Link falsa desfazem a mudança no `finally`; o teste 5 usa, para o caso sem cadastro, um banco só dele.

Crie `tradutor/link-falsa.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinhaCaso, type LinkFalsa } from './link-falsa.mts'
import { conferirColunasLink, conferirEntradaLink, ErroLink, lerColunasEsperadasLink } from './link.mts'

let banco: BancoTeste
let falsa: LinkFalsa

before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
})

after(async () => {
  await falsa?.fechar()
  await banco?.fechar()
})

// Cada linha como o texto que o Postgres escreve (coluna::text), em JSON, em ordem: para comparar com o arquivo sem ordem de linha.
async function comoTexto(tabela: string, colunas: string[]): Promise<string[]> {
  const { rows } = await banco.cliente.query(`select ${colunas.map((c) => `${c}::text as ${c}`).join(', ')} from ${tabela}`)
  return rows.map((linha) => JSON.stringify(linha)).sort()
}

function doArquivo(linhas: LinhaCaso[], colunas: string[]): string[] {
  return linhas.map((linha) => JSON.stringify(Object.fromEntries(colunas.map((c) => [c, linha[c] ?? null])))).sort()
}

// O erro é um ErroLink com exatamente esta mensagem.
function erroLink(mensagem: string) {
  return (erro: unknown) => {
    assert.ok(erro instanceof ErroLink)
    assert.equal(erro.message, mensagem)
    return true
  }
}

test('lerColunasEsperadasLink lê as 119 colunas de 20 tabelas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadasLink()
  assert.equal(colunas.length, 119)
  assert.equal(new Set(colunas.map((c) => c.tabela)).size, 20)
  assert.deepEqual(colunas[0], { tabela: 'caixa', coluna: 'data_hora', tipo: 'timestamp' })
  assert.deepEqual(colunas[118], { tabela: 'usuario', coluna: 'nome', tipo: 'varchar' })
  // Cada par (tabela, coluna) é maior que o anterior: a lista está em ordem e nada se repete.
  for (let i = 1; i < colunas.length; i++) {
    const a = colunas[i - 1]
    const b = colunas[i]
    assert.ok(
      a.tabela < b.tabela || (a.tabela === b.tabela && a.coluna < b.coluna),
      `${a.tabela}.${a.coluna} vem antes de ${b.tabela}.${b.coluna}`,
    )
  }
  const porTipo: Record<string, number> = {}
  for (const { tipo } of colunas) porTipo[tipo] = (porTipo[tipo] ?? 0) + 1
  assert.deepEqual(porTipo, { bigint: 48, boolean: 12, character: 2, date: 1, integer: 1, numeric: 28, timestamp: 6, varchar: 21 })
  // As duas colunas 'character' da Link: a UF (2 letras) e o tipo da negociação (1 letra).
  assert.deepEqual(
    colunas.filter((c) => c.tipo === 'character').map((c) => `${c.tabela}.${c.coluna}`),
    ['cidade.sigla_estado', 'negociacao.tipo'],
  )
})

test('a Link falsa tem só as colunas da lista, e o kaizen lê mas não escreve nela', async () => {
  // O information_schema só mostra ao kaizen as colunas que ele pode ler: ver todas prova também a leitura.
  const tipoNoBanco: Record<string, string> = {
    bigint: 'int8', boolean: 'bool', character: 'bpchar', date: 'date',
    integer: 'int4', numeric: 'numeric', timestamp: 'timestamp', varchar: 'varchar',
  }
  const colunas = await banco.cliente.query(`
    select table_name as tabela, column_name as coluna, udt_name as tipo, is_nullable as aceita_nulo
    from information_schema.columns
    where table_schema = 'erp'
    order by table_name collate "C", column_name collate "C"`)
  assert.deepEqual(
    colunas.rows,
    lerColunasEsperadasLink().map((c) => ({ tabela: c.tabela, coluna: c.coluna, tipo: tipoNoBanco[c.tipo], aceita_nulo: 'YES' })),
  )
  // Sem chave nem índice, e tudo é do postgres: o kaizen não é dono de nada no erp.
  const estrutura = await banco.cliente.query(`
    select (select count(*)::int from pg_constraint where connamespace = 'erp'::regnamespace) as restricoes,
           (select count(*)::int from pg_indexes where schemaname = 'erp') as indices,
           (select string_agg(distinct tableowner, ', ') from pg_tables where schemaname = 'erp') as donos`)
  assert.deepEqual(estrutura.rows, [{ restricoes: 0, indices: 0, donos: 'postgres' }])
  await assert.rejects(banco.cliente.query('insert into erp.negociacao (id_negociacao) values (9999)'), {
    message: 'permission denied for table negociacao',
  })
  await assert.rejects(banco.cliente.query('create table erp.outra (n integer)'), { message: 'permission denied for schema erp' })
  const negociacoes = await banco.cliente.query('select count(*)::int as n from erp.negociacao')
  assert.deepEqual(negociacoes.rows, [{ n: 16 }])
})

test('carregarCasosLink põe na Link falsa as 290 linhas dos casos e no Kaizen o cadastro do ERP novo', async () => {
  const casos = lerCasosLink()
  const porTabela = new Map<string, string[]>()
  for (const { tabela, coluna } of lerColunasEsperadasLink()) porTabela.set(tabela, [...(porTabela.get(tabela) ?? []), coluna])
  // Cada valor da Link falsa, lido de volta como texto, é o texto do arquivo: nada se perdeu nem mudou no caminho.
  const linhasPorTabela: Record<string, number> = {}
  for (const [tabela, colunas] of porTabela) {
    const noBanco = await comoTexto(`erp.${tabela}`, colunas)
    assert.deepEqual(noBanco, doArquivo(casos[tabela], colunas), tabela)
    linhasPorTabela[tabela] = noBanco.length
  }
  assert.deepEqual(linhasPorTabela, {
    caixa: 15, caixa_fechamento: 3, caixa_parcela: 12, cidade: 6, cliente: 12, compra: 3, compra_item: 2,
    fornecedor: 4, marca: 11, negociacao: 16, negociacao_item_devolvido: 10, negociacao_item_vendido: 45,
    nota_entrada: 2, pc_lancamento: 24, pc_lancamento_fonte: 24, pc_lancamento_parcela: 33, prod_grupo: 11,
    prod_subgrupo: 11, produto: 42, usuario: 4,
  })
  assert.equal(Object.values(linhasPorTabela).reduce((soma, n) => soma + n, 0), 290)
  // A venda de junho, com os tipos da Link: número e data como texto, tipo de uma letra, venda verdadeira.
  const venda = await banco.cliente.query(`
    select id_negociacao, tipo, venda, data, desconto_percentual, valor_total_venda, valor_total_devolucao
    from erp.negociacao where id_negociacao = 1992`)
  assert.deepEqual(venda.rows, [{
    id_negociacao: '1992', tipo: 'T', venda: true, data: '2026-06-17 13:58:20.706517',
    desconto_percentual: '0.60959', valor_total_venda: '150.00', valor_total_devolucao: '0.00',
  }])

  // O cadastro do ERP novo, gravado pelo kaizen com as colunas do arquivo.
  for (const tabela of ['produto', 'pessoa', 'funcionario']) {
    const linhas = casos[`kaizen.${tabela}`]
    const colunas = Object.keys(linhas[0])
    assert.deepEqual(await comoTexto(`kaizen.${tabela}`, colunas), doArquivo(linhas, colunas), tabela)
  }
  const cadastro = await banco.cliente.query(`
    select 'funcionario' as tabela, fonte, count(*)::int as linhas from kaizen.funcionario group by fonte
    union all select 'pessoa', fonte, count(*)::int from kaizen.pessoa group by fonte
    union all select 'produto', fonte, count(*)::int from kaizen.produto group by fonte
    order by tabela`)
  assert.deepEqual(cadastro.rows, [
    { tabela: 'funcionario', fonte: 'meuerp', linhas: 9 },
    { tabela: 'pessoa', fonte: 'meuerp', linhas: 35 },
    { tabela: 'produto', fonte: 'meuerp', linhas: 40 },
  ])
  const vendedor = await banco.cliente.query(`select codigo, nome, usuario, tipo, ativo from kaizen.funcionario where codigo = '1'`)
  assert.deepEqual(vendedor.rows, [{ codigo: '1', nome: 'Caio Mendes Rocha', usuario: 18152, tipo: 'V', ativo: true }])
})

test('conferirColunasLink não acusa nada com a lista inteira e acusa a coluna que falta', async () => {
  const casos = lerCasosLink()
  assert.deepEqual(await conferirColunasLink(banco.cliente), [])
  await falsa.executar('alter table erp.negociacao drop column venda')
  try {
    assert.deepEqual(await conferirColunasLink(banco.cliente), ['negociacao.venda'])
    await assert.rejects(
      conferirEntradaLink(banco.cliente),
      erroLink('a cópia da Link não tem as colunas esperadas: negociacao.venda'),
    )
  } finally {
    // Desfaz: a coluna volta, e a negociação volta inteira, com os valores do arquivo.
    await falsa.executar('alter table erp.negociacao add column venda boolean')
    await falsa.executar('delete from erp.negociacao')
    await falsa.inserir('negociacao', casos.negociacao)
  }
  assert.deepEqual(await conferirColunasLink(banco.cliente), [])
})

test('conferirEntradaLink para sem o cadastro do ERP novo e com a Link sem negociação', async () => {
  const casos = lerCasosLink()
  // Um banco só deste teste: a Link falsa com todos os casos, e o Kaizen sem nenhum produto do ERP novo.
  const outro = await criarBancoKaizen()
  const outraFalsa = await criarLinkFalsa(outro)
  try {
    const semCadastro = Object.fromEntries(Object.entries(casos).filter(([chave]) => !chave.startsWith('kaizen.')))
    await carregarCasosLink(outraFalsa, outro.cliente, semCadastro)
    await assert.rejects(
      conferirEntradaLink(outro.cliente),
      erroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo'),
    )
  } finally {
    await outraFalsa.fechar()
    await outro.fechar()
  }

  // Na Link falsa do arquivo, com o cadastro: a entrada passa; sem nenhuma negociação, para.
  await conferirEntradaLink(banco.cliente)
  await falsa.executar('delete from erp.negociacao')
  try {
    await assert.rejects(
      conferirEntradaLink(banco.cliente),
      erroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?'),
    )
  } finally {
    await falsa.inserir('negociacao', casos.negociacao)
  }
  await conferirEntradaLink(banco.cliente)
})
```

- [ ] **Passo 4: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-falsa.test.mts`
Saída esperada: falha, com `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Projetos\KAIZEN\tradutor\link-falsa.mts' imported from C:\Projetos\KAIZEN\tradutor\link-falsa.test.mts`, `✖ tradutor\link-falsa.test.mts` e `ℹ fail 1`.

- [ ] **Passo 5: Criar `tradutor/link.mts`, primeira versão**

Só a entrada do comando: a leitura da lista, a conferência das colunas e a conferência de entrada, que roda antes de abrir a transação. As três perguntas são feitas ao próprio banco, como o usuário `kaizen`: as colunas pelo `information_schema` (que só mostra ao `kaizen` o que ele pode ler, então uma cópia restaurada sem o `grant select` ao `kaizen` também acusa as colunas, as da tabela sem leitura), o cadastro pela contagem de produtos `meuerp`, e as negociações pela contagem de `erp.negociacao`. A tarefa 3 acrescenta `rodar` e `ligarLink`; a 4, `FAMILIAS`, `ContagensLink` e `traduzirLink`; a 7, o resto (esqueleto do plano). Os comentários `// tarefa N` do esqueleto são anotações do plano e não entram no arquivo.

Crie `tradutor/link.mts`:

```ts
// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}
```

- [ ] **Passo 6: Criar `tradutor/link-falsa.mts`**

No molde do `tradutor/erp-falso.mts`: as tabelas saem da lista, só com as colunas dela, todas aceitando nulo e sem chave nem índice, como a cópia restaurada da Link. O esquema `erp` é criado pelo `postgres` (como o `pg_restore` faz), e o `kaizen` recebe só `usage` e `select`, como depois de cada restauração (spec, seção 5). Os valores vão como o texto do arquivo, em lotes com parâmetros, e o Postgres os converte para o tipo da coluna. O cadastro do ERP novo entra pelo cliente do `kaizen`, com as colunas que vierem no arquivo (`lido_em` fica com o `default now()`).

Crie `tradutor/link-falsa.mts`:

```ts
// Só para testes: a "Link falsa", o esquema erp do banco de teste só com as colunas de sql/link/colunas-esperadas.txt,
// e os casos reais da cópia antiga (tradutor/link-casos.json, com nomes, CPF e CNPJ inventados).
import { readFileSync } from 'node:fs'
import { conectar, garantirLocal } from './banco.mts'
import type { Cliente } from './banco.mts'
import { urlDoBanco } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { lerColunasEsperadasLink } from './link.mts'

export type LinhaCaso = Record<string, string | null>
// As chaves são os nomes das tabelas do erp ('negociacao', 'caixa', ...) e 'kaizen.produto', 'kaizen.pessoa', 'kaizen.funcionario'.
export type CasosLink = Record<string, LinhaCaso[]>

export type LinkFalsa = {
  inserir(tabela: string, linhas: LinhaCaso[]): Promise<void> // no esquema erp do banco de teste, como postgres
  executar(sql: string): Promise<void> // um comando qualquer como postgres no banco de teste (para os testes mexerem na Link)
  fechar(): Promise<void> // fecha a conexão de postgres; o esquema some com o banco de teste
}

const NOME = /^[a-z_][a-z0-9_]*$/
const LINHAS_POR_INSERT = 500
// O tipo da lista no create table. 'character' sem tamanho seria char(1), e a UF tem 2 letras: bpchar não tem tamanho.
const TIPO_NA_TABELA: Record<string, string> = {
  bigint: 'bigint',
  boolean: 'boolean',
  character: 'bpchar',
  date: 'date',
  integer: 'integer',
  numeric: 'numeric',
  timestamp: 'timestamp',
  varchar: 'varchar',
}
// O cadastro do ERP novo dos casos, gravado no Kaizen pelo cliente do kaizen, como o tradutor da Fase 2 o grava.
const CADASTRO_DO_ERP_NOVO = ['kaizen.produto', 'kaizen.pessoa', 'kaizen.funcionario']

export function lerCasosLink(): CasosLink {
  const texto = readFileSync(new URL('./link-casos.json', import.meta.url), 'utf8')
  const casos = JSON.parse(texto) as Record<string, Array<Record<string, unknown>>>
  // Nenhum valor passa por número do JavaScript: no arquivo, todo valor é texto ou vazio.
  for (const [chave, linhas] of Object.entries(casos)) {
    for (const linha of linhas) {
      for (const [coluna, valor] of Object.entries(linha)) {
        if (valor !== null && typeof valor !== 'string') {
          throw new Error(`link-casos.json: ${chave}.${coluna} não é texto: ${JSON.stringify(valor)}`)
        }
      }
    }
  }
  return casos as CasosLink
}

// Insere em lotes, com parâmetros: cada valor vai como o texto do arquivo, e o Postgres o converte para o tipo da coluna.
async function inserirEmLotes(cliente: Cliente, esquema: string, tabela: string, linhas: LinhaCaso[]): Promise<void> {
  if (!NOME.test(esquema) || !NOME.test(tabela)) throw new Error(`nome de tabela inválido: ${esquema}.${tabela}`)
  for (let inicio = 0; inicio < linhas.length; inicio += LINHAS_POR_INSERT) {
    const lote = linhas.slice(inicio, inicio + LINHAS_POR_INSERT)
    const colunas: string[] = []
    for (const linha of lote) {
      for (const coluna of Object.keys(linha)) if (!colunas.includes(coluna)) colunas.push(coluna)
    }
    for (const coluna of colunas) if (!NOME.test(coluna)) throw new Error(`nome de coluna inválido: ${coluna}`)
    const valores: Array<string | null> = []
    const tuplas = lote.map((linha) => {
      const marcadores = colunas.map((coluna) => {
        valores.push(linha[coluna] ?? null)
        return `$${valores.length}`
      })
      return `(${marcadores.join(', ')})`
    })
    await cliente.query(`insert into ${esquema}.${tabela} (${colunas.join(', ')}) values ${tuplas.join(', ')}`, valores)
  }
}

// Cria o esquema erp no banco de teste (como postgres), uma tabela por tabela de sql/link/colunas-esperadas.txt, só com as
// colunas da lista, todas aceitando nulo e sem chave, e dá usage e select ao kaizen, como depois de uma restauração.
export async function criarLinkFalsa(banco: BancoTeste): Promise<LinkFalsa> {
  const url = urlDoBanco(banco.nome, 'postgres')
  garantirLocal(url)
  const admin = await conectar(url)
  try {
    const colunasPorTabela = new Map<string, string[]>()
    for (const { tabela, coluna, tipo } of lerColunasEsperadasLink()) {
      if (!NOME.test(tabela) || !NOME.test(coluna) || !Object.hasOwn(TIPO_NA_TABELA, tipo)) {
        throw new Error(`linha inválida em sql/link/colunas-esperadas.txt: ${tabela} ${coluna} ${tipo}`)
      }
      colunasPorTabela.set(tabela, [...(colunasPorTabela.get(tabela) ?? []), `${coluna} ${TIPO_NA_TABELA[tipo]}`])
    }
    await admin.query('create schema erp')
    for (const [tabela, colunas] of colunasPorTabela) {
      await admin.query(`create table erp.${tabela} (${colunas.join(', ')})`)
    }
    await admin.query('grant usage on schema erp to kaizen')
    await admin.query('grant select on all tables in schema erp to kaizen')
  } catch (erro) {
    await admin.end().catch(() => undefined)
    throw erro
  }
  return {
    async inserir(tabela: string, linhas: LinhaCaso[]): Promise<void> {
      await inserirEmLotes(admin, 'erp', tabela, linhas)
    },
    async executar(sql: string): Promise<void> {
      await admin.query(sql)
    },
    async fechar(): Promise<void> {
      await admin.end().catch(() => undefined)
    },
  }
}

// Insere todas as linhas do erp dos casos na Link falsa, e o cadastro do ERP novo dos casos (kaizen.produto, kaizen.pessoa,
// kaizen.funcionario, fonte meuerp) pelo cliente do kaizen, com as colunas que vierem no arquivo.
export async function carregarCasosLink(falsa: LinkFalsa, cliente: Cliente, casos: CasosLink = lerCasosLink()): Promise<void> {
  for (const [chave, linhas] of Object.entries(casos)) {
    if (!CADASTRO_DO_ERP_NOVO.includes(chave)) await falsa.inserir(chave, linhas)
  }
  for (const chave of CADASTRO_DO_ERP_NOVO) {
    const [esquema, tabela] = chave.split('.')
    await inserirEmLotes(cliente, esquema, tabela, casos[chave] ?? [])
  }
}
```

- [ ] **Passo 7: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-falsa.test.mts`
Saída esperada: passa, com `ℹ pass 5`, `ℹ fail 0` e:
```
✔ lerColunasEsperadasLink lê as 119 colunas de 20 tabelas, em ordem, sem repetição, com tipo conhecido
✔ a Link falsa tem só as colunas da lista, e o kaizen lê mas não escreve nela
✔ carregarCasosLink põe na Link falsa as 290 linhas dos casos e no Kaizen o cadastro do ERP novo
✔ conferirColunasLink não acusa nada com a lista inteira e acusa a coluna que falta
✔ conferirEntradaLink para sem o cadastro do ERP novo e com a Link sem negociação
```
(cada linha seguida do tempo, entre parênteses). Se o teste 3 falhar numa tabela, a mensagem de `assert.deepEqual` traz o nome dela: o valor do banco, como texto, não é o do arquivo.

- [ ] **Passo 8: Atualizar `testes-esperados.txt` (N = 5)**

Esta tarefa acrescentou 5 `test(` (todos em `tradutor/link-falsa.test.mts`). Some ao número atual: 284 + 5 = 289. O arquivo fica com uma única linha:

```text
289
```

- [ ] **Passo 9: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 289 testes com ✔, `ℹ fail 0`; última linha `rodou 289 testes, esperados 289`.

- [ ] **Passo 10: Commit**

```bash
git add sql/link/colunas-esperadas.txt sql/link/colunas.sql tradutor/link-casos.json tradutor/link.mts tradutor/link-falsa.mts tradutor/link-falsa.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Link: conferência de entrada e Link falsa com 290 linhas de casos reais

O tradutor da Link passa a conferir a cópia antes de ler: se faltar uma
das 119 colunas (de 20 tabelas) que ele lê, se o cadastro do ERP novo
ainda não estiver no Kaizen ou se a cópia não tiver nenhuma negociação,
ele para com a razão numa frase, antes de gravar qualquer coisa. Na falta
de coluna, a frase diz qual (negociacao.venda, por exemplo).

Para os testes, a Link falsa: o esquema erp do banco de teste só com
essas colunas, carregado com 290 linhas reais da cópia antiga (16
negociações, 45 itens vendidos, 10 devolvidos, 3 fechamentos, 24
lançamentos, 2 notas de entrada), com nomes, CPF e CNPJ inventados, e o
cadastro do ERP novo desses casos (40 produtos, 35 pessoas, 9
funcionários). Cada valor volta do banco com o mesmo texto do arquivo, e
o usuário kaizen lê o erp mas não consegue escrever nele.
Testes: rodou 289, esperados 289.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o `git add` pode avisar `LF will be replaced by CRLF` para `sql/link/colunas-esperadas.txt`, `tradutor/link-casos.json` e `testes-esperados.txt` (é só aviso); o hook roda `npm run verificar` e termina com `rodou 289 testes, esperados 289`; o commit sai.


### Tarefa 3: Ligação com o cadastro novo

**O que esta tarefa entrega, em resultado:** cada código que a Link usa (produto, cliente, fornecedor e vendedor) passa a ter o código do cadastro do ERP novo que o Kaizen já guarda, ou uma falha marcada `link:<código>`. A ordem é a da spec (seção 6): primeiro a decisão da `de_para`; depois a regra do `OBJETIVO.md` (produto pelo código; cliente e fornecedor pelo CPF/CNPJ só com dígitos, quando ele acha exatamente uma pessoa; vendedor pela primeira palavra do nome, sem acento); só então a falha. Nos casos da cópia antiga: 40 dos 42 produtos ligam pelo código e 2 falham (1993 e 2396, que só aparecem na venda cancelada 8); dos 12 clientes, 10 ligam pelo CPF/CNPJ, o Consumidor Final vai para o 999007 pela decisão e o cliente 1 falha; 3 dos 4 fornecedores ligam pelo CNPJ e o FORNECEDOR PADRÃO vira `link:900001`; Caio, Débora e Neide ligam aos funcionários 1, 999005 e 999006, e o Sistema (usuário 1 da Link) falha, em vez de virar o funcionário 1 do ERP novo, que é o Caio. CPF/CNPJ vazio não liga nada, e CPF/CNPJ que acha duas pessoas vira falha. Uma decisão da `de_para` que aponta para código inexistente no ERP novo para o comando, com a linha na mensagem. A ligação fica numa tabela temporária da transação (`pg_temp.link_liga`); nada é gravado no Kaizen nesta tarefa (quem grava é a tarefa 4). São 7 testes novos.

**Arquivos:**
- Criar: `sql/link/preparar.sql` (do protótipo, sem mudar nada)
- Criar: `sql/link/ligar.sql` (do protótipo, sem mudar nada)
- Modificar: `tradutor/link.mts` (acrescenta `import type { QueryResult } from 'pg'`, a função privada `rodar` e `ligarLink`)
- Testar: `tradutor/link-ligar.test.mts`
- Modificar: `testes-esperados.txt` (de `289` para `296`)

**Interfaces:**
- Consome (Tarefa 1): `kaizen.de_para` com as 22 decisões da migração `007_de_para_link.sql`, todas da entidade `pessoa`, fonte `link` (`10000502` → `999007`, `10000199` → `484` e os 20 códigos que apontam para eles mesmos). Num banco de teste recém-criado, a `de_para` só tem essas 22 linhas: as falhas só aparecem depois que a tarefa 4 grava.
- Consome (Tarefa 2, `tradutor/link.mts`): `ErroLink`, `lerSql(caminho)` (lê `sql/<caminho>`); (Tarefa 2, `tradutor/link-falsa.mts`):
  ```ts
  export type LinkFalsa = {
    inserir(tabela: string, linhas: LinhaCaso[]): Promise<void>
    executar(sql: string): Promise<void> // um comando qualquer como postgres no banco de teste (para os testes mexerem na Link)
    fechar(): Promise<void>
  }
  export async function criarLinkFalsa(banco: BancoTeste): Promise<LinkFalsa>
  export async function carregarCasosLink(falsa: LinkFalsa, cliente: Cliente, casos?: CasosLink): Promise<void>
  ```
  e os casos de `tradutor/link-casos.json` que os testes usam: na Link, os produtos (42, entre eles 1440, 1993, 2396 e 2400), os clientes 1, 65, 167, 170, 188, 281, 288, 303, 313, 373, 10000045 e 10000502 (Consumidor Final, CPF `18943884060`), os fornecedores 1 (FORNECEDOR PADRÃO, sem CNPJ), 7, 9 e 14, e os usuários 1 Sistema, 5 Débora, 6 Caio e 9 Neide; no cadastro do ERP novo (fonte `meuerp`), 40 produtos (sem o 1993 e o 2396), 35 pessoas (entre elas a 451 com o CPF do cliente 10000045, as 21 com CPF/CNPJ vazio e a 999007 sem CPF) e 9 funcionários (1 Caio Mendes Rocha, 999005 Debora Fonseca Lima, 999006 Neide Alves Pereira). As colunas que `ligar.sql` lê do `erp` (`produto.produto_codigo`, `cliente.cliente_codigo`, `cliente.cpf`, `cliente.cnpj`, `fornecedor.fornecedor_codigo`, `fornecedor.cpf_cnpj`, `usuario.id_usuario`, `usuario.nome`) já estão em `sql/link/colunas-esperadas.txt`.
- Produz:
  ```ts
  // tradutor/link.mts
  // Privada: roda sql/link/<nome>.sql (vários comandos, sem parâmetro) e devolve as linhas do último comando.
  async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>>
  // Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
  // Lança ErroLink('decisão da de_para aponta para código que não existe no ERP novo: <entidade> <código da Link> → <código>, ...').
  export async function ligarLink(cliente: Cliente): Promise<void>
  ```
  e, dentro da transação de quem chamou, as sete tabelas de trabalho de `preparar.sql`, todas `on commit drop`: `pg_temp.link_liga (entidade, codigo_origem, codigo_kaizen, como)`, cheia por esta tarefa, com `como` em `decisao`, `regra` ou `falha` e uma linha por código de `erp.produto`, `erp.cliente`, `erp.fornecedor` (código + 900000) e `erp.usuario`; e `link_doc`, `link_item`, `link_pagamento`, `link_conferencia`, `link_parcela` e `link_baixa`, vazias, que as tarefas 4 a 6 enchem, com as colunas de `preparar.sql`.
- `testes-esperados.txt` passa de `289` para `296`.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, na branch `fase-3`, com as tarefas 1 e 2 já commitadas (289 testes) e o Postgres local no ar (`docker compose up -d --wait`). Os dois arquivos SQL são os do protótipo, provados contra a cópia antiga: copie-os exatamente como estão aqui (o passo 5 confere pelo sha256). A `link_liga` tem todos os códigos do cadastro da Link, citados ou não por um documento; o filtro "só o que um documento cita" (cadastro fonte `link` e falhas da `de_para`) é da tarefa 4, em `cadastros.sql`. Nos testes, toda mudança no Kaizen acontece dentro de uma transação que termina em `rollback`, e a única mudança na Link falsa (teste 2) é desfeita no `finally`. Commits no Git Bash.

- [ ] **Passo 1: Escrever o teste da ligação**

Crie `tradutor/link-ligar.test.mts`. Cada teste abre uma transação, faz o preparo dele (quando há), chama `ligarLink`, lê a `pg_temp.link_liga` e desfaz tudo com `rollback`. Os valores esperados são os dos casos, conferidos rodando `preparar.sql` e `ligar.sql` sobre a Link falsa dos casos. Nos testes 3, 4 e 5, a mesma leitura é feita sem e com a mudança, para mostrar que o resultado vem dela (no 5, um segundo funcionário do ERP novo com o primeiro nome Caio faz o usuário 6 da Link virar falha).

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { ErroLink, ligarLink } from './link.mts'

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

// Numa transação: roda o preparo do teste (mudanças no Kaizen), liga os códigos da Link e devolve o que `ler` leu da
// pg_temp.link_liga. O rollback no fim desfaz o preparo e apaga as temporárias.
async function ligarELer<T>(ler: () => Promise<T>, preparo: string[] = []): Promise<T> {
  await banco.cliente.query('begin')
  try {
    for (const sql of preparo) await banco.cliente.query(sql)
    await ligarLink(banco.cliente)
    return await ler()
  } finally {
    await banco.cliente.query('rollback')
  }
}

async function ligacoes(onde: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await banco.cliente.query(
    `select entidade, codigo_origem, codigo_kaizen, como from pg_temp.link_liga
      where ${onde} order by entidade, codigo_origem collate "C"`,
  )
  return rows
}

test('produto liga pelo código, e o que não existe no ERP novo vira falha link:<código>', async () => {
  const lido = await ligarELer(async () => ({
    exemplos: await ligacoes(`entidade = 'produto' and codigo_origem in ('1440', '1993', '2396', '2400')`),
    porComo: (
      await banco.cliente.query(
        `select como, count(*)::int as n from pg_temp.link_liga where entidade = 'produto' group by como order by como`,
      )
    ).rows,
  }))
  // 1993 e 2396 só existem na Link (os dois só aparecem na venda cancelada 8).
  assert.deepEqual(lido.exemplos, [
    { entidade: 'produto', codigo_origem: '1440', codigo_kaizen: '1440', como: 'regra' },
    { entidade: 'produto', codigo_origem: '1993', codigo_kaizen: 'link:1993', como: 'falha' },
    { entidade: 'produto', codigo_origem: '2396', codigo_kaizen: 'link:2396', como: 'falha' },
    { entidade: 'produto', codigo_origem: '2400', codigo_kaizen: '2400', como: 'regra' },
  ])
  // Os 42 produtos da Link dos casos: 40 no cadastro do ERP novo, 2 só na Link.
  assert.deepEqual(lido.porComo, [
    { como: 'falha', n: 2 },
    { como: 'regra', n: 40 },
  ])
})

test('cliente liga pelo CPF/CNPJ só com dígitos, e CPF/CNPJ vazio não liga nada', async () => {
  // Na Link falsa, o CPF do cliente 288 passa a ter pontos e traço, e o do cliente 313 fica vazio.
  await falsa.executar(
    `update erp.cliente set cpf = case cliente_codigo when '288' then '051.504.253-73' else '' end
      where cliente_codigo in ('288', '313')`,
  )
  try {
    const lido = await ligarELer(
      () => ligacoes(`entidade = 'pessoa' and codigo_origem in ('10000045', '170', '288', '313')`),
      [
        // No ERP novo, o CNPJ da pessoa 170 passa a ter pontos, barra e traço.
        `update kaizen.pessoa set cpf_cnpj = '22.623.048/5248-26' where fonte = 'meuerp' and codigo = '170'`,
        // Fica uma só pessoa do ERP novo com CPF/CNPJ vazio (a 21): sem a trava do vazio, o cliente 313 ligaria a ela.
        `update kaizen.pessoa set cpf_cnpj = null where fonte = 'meuerp' and cpf_cnpj = '' and codigo <> '21'`,
      ],
    )
    assert.deepEqual(lido, [
      // O CPF do cliente 10000045 é o da pessoa 451 do ERP novo: a ligação segue o documento, não o código.
      { entidade: 'pessoa', codigo_origem: '10000045', codigo_kaizen: '451', como: 'regra' },
      { entidade: 'pessoa', codigo_origem: '170', codigo_kaizen: '170', como: 'regra' },
      { entidade: 'pessoa', codigo_origem: '288', codigo_kaizen: '288', como: 'regra' },
      { entidade: 'pessoa', codigo_origem: '313', codigo_kaizen: 'link:313', como: 'falha' },
    ])
  } finally {
    await falsa.executar(
      `update erp.cliente set cpf = case cliente_codigo when '288' then '05150425373' else '45143201292' end
        where cliente_codigo in ('288', '313')`,
    )
  }
})

test('CPF/CNPJ que acha duas pessoas do ERP novo vira falha', async () => {
  const onde = `entidade = 'pessoa' and codigo_origem in ('65', '288')`
  // Com uma pessoa só por CPF, o cliente 65 liga.
  assert.deepEqual(await ligarELer(() => ligacoes(onde)), [
    { entidade: 'pessoa', codigo_origem: '288', codigo_kaizen: '288', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '65', codigo_kaizen: '65', como: 'regra' },
  ])
  // Uma segunda pessoa do ERP novo com o CPF do cliente 65: a regra não escolhe entre as duas.
  const repetido = `insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, ativo)
    values ('meuerp', '500', 'CLIENTE 65 REPETIDO', '54090830660', true)`
  assert.deepEqual(await ligarELer(() => ligacoes(onde), [repetido]), [
    { entidade: 'pessoa', codigo_origem: '288', codigo_kaizen: '288', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '65', codigo_kaizen: 'link:65', como: 'falha' },
  ])
})

test('a decisão da de_para vale antes do CPF: o Consumidor Final 10000502 vai para 999007', async () => {
  const onde = `entidade = 'pessoa' and codigo_origem = '10000502'`
  // Uma pessoa do ERP novo com o CPF que a Link grava para o Consumidor Final: pela regra, ele ligaria a ela.
  const mesmoCpf = `insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, ativo)
    values ('meuerp', '501', 'CLIENTE COM O CPF DO CONSUMIDOR FINAL', '18943884060', true)`
  assert.deepEqual(await ligarELer(() => ligacoes(onde), [mesmoCpf]), [
    { entidade: 'pessoa', codigo_origem: '10000502', codigo_kaizen: '999007', como: 'decisao' },
  ])
  // Sem a decisão (tirada só dentro da transação), a regra do CPF é que liga.
  const semDecisao = `delete from kaizen.de_para where entidade = 'pessoa' and fonte = 'link' and codigo_origem = '10000502'`
  assert.deepEqual(await ligarELer(() => ligacoes(onde), [mesmoCpf, semDecisao]), [
    { entidade: 'pessoa', codigo_origem: '10000502', codigo_kaizen: '501', como: 'regra' },
  ])
})

test('vendedor liga pela primeira palavra do nome, sem acento, e o Sistema (1) não vira o funcionário 1 do ERP novo', async () => {
  // Na Link: 1 Sistema, 5 Débora, 6 Caio, 9 Neide. No ERP novo: 1 Caio Mendes Rocha, 999005 Debora Fonseca Lima,
  // 999006 Neide Alves Pereira.
  assert.deepEqual(await ligarELer(() => ligacoes(`entidade = 'funcionario'`)), [
    { entidade: 'funcionario', codigo_origem: '1', codigo_kaizen: 'link:1', como: 'falha' },
    { entidade: 'funcionario', codigo_origem: '5', codigo_kaizen: '999005', como: 'regra' },
    { entidade: 'funcionario', codigo_origem: '6', codigo_kaizen: '1', como: 'regra' },
    { entidade: 'funcionario', codigo_origem: '9', codigo_kaizen: '999006', como: 'regra' },
  ])
  // Um segundo Caio no ERP novo (só dentro da transação): o primeiro nome repetido não escolhe entre os dois, e o
  // usuário 6 da Link vira falha.
  const outroCaio = `insert into kaizen.funcionario (fonte, codigo, nome, ativo) values ('meuerp', '999099', 'Caio Outro', true)`
  assert.deepEqual(await ligarELer(() => ligacoes(`entidade = 'funcionario' and codigo_origem = '6'`), [outroCaio]), [
    { entidade: 'funcionario', codigo_origem: '6', codigo_kaizen: 'link:6', como: 'falha' },
  ])
})

test('fornecedor liga pelo CNPJ com o código + 900000, e o FORNECEDOR PADRÃO vira link:900001', async () => {
  // O fornecedor 900009 do ERP novo ganha outro código dentro da transação: a ligação segue o CNPJ, não o código.
  const outroCodigo = `update kaizen.pessoa set codigo = '900090' where fonte = 'meuerp' and codigo = '900009'`
  const lido = await ligarELer(
    () => ligacoes(`entidade = 'pessoa' and codigo_origem in ('900001', '900007', '900009', '900014')`),
    [outroCodigo],
  )
  // Fornecedores 1, 7, 9 e 14 da Link; o 1 (FORNECEDOR PADRÃO) não tem CNPJ.
  assert.deepEqual(lido, [
    { entidade: 'pessoa', codigo_origem: '900001', codigo_kaizen: 'link:900001', como: 'falha' },
    { entidade: 'pessoa', codigo_origem: '900007', codigo_kaizen: '900007', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '900009', codigo_kaizen: '900090', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '900014', codigo_kaizen: '900014', como: 'regra' },
  ])
})

test('decisão que aponta para código que não existe no ERP novo para com ErroLink, com a linha na mensagem', async () => {
  await banco.cliente.query('begin')
  try {
    // O cliente 1 da Link, que falha, ganha uma decisão para um código que o ERP novo não tem.
    await banco.cliente.query(
      `insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen) values ('pessoa', 'link', '1', '999999')`,
    )
    await assert.rejects(ligarLink(banco.cliente), (erro: unknown) => {
      assert.ok(erro instanceof ErroLink)
      // Só a decisão errada: as 22 decisões da migração apontam para pessoas que existem.
      assert.equal(erro.message, 'decisão da de_para aponta para código que não existe no ERP novo: pessoa 1 → 999999')
      return true
    })
  } finally {
    await banco.cliente.query('rollback')
  }
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-ligar.test.mts`
Saída esperada: falha antes de rodar qualquer teste, com `SyntaxError: The requested module './link.mts' does not provide an export named 'ligarLink'` e `ℹ fail 1` (o arquivo de teste inteiro conta como a falha). O `ErroLink` já existe desde a tarefa 2; o que falta é o `ligarLink`.

- [ ] **Passo 3: Criar `sql/link/preparar.sql`**

Ele cria, dentro da transação, as sete tabelas de trabalho da tradução: a `link_liga` desta tarefa e as seis que as tarefas 4 a 6 enchem. Todas são `on commit drop`, então somem no commit ou no rollback. Os `drop table if exists` do começo deixam o arquivo rodar duas vezes na mesma transação; na primeira vez de uma conexão, o Postgres manda o aviso `schema "pg_temp" does not exist, skipping` (é só aviso, e o `pg` não o mostra).

Crie `sql/link/preparar.sql` com exatamente este conteúdo:

```sql
-- As tabelas de trabalho do tradutor da Link: vivem só dentro da transação do comando.
drop table if exists pg_temp.link_liga;
drop table if exists pg_temp.link_doc;
drop table if exists pg_temp.link_item;
drop table if exists pg_temp.link_pagamento;
drop table if exists pg_temp.link_conferencia;
drop table if exists pg_temp.link_parcela;
drop table if exists pg_temp.link_baixa;

-- cada código da Link, com o código do Kaizen e como foi ligado
create temp table link_liga (
  entidade text,
  codigo_origem text,
  codigo_kaizen text not null,
  como text not null check (como in ('decisao', 'regra', 'falha')),
  primary key (entidade, codigo_origem)
) on commit drop;

create temp table link_doc (
  origem_tabela text,
  origem_id text,
  codigo text not null,
  modelo text not null,
  status text,
  criado_em timestamp not null,
  fechado_em timestamp,
  pessoa text,
  turno_usuario integer,
  primary key (origem_tabela, origem_id)
) on commit drop;

create temp table link_item (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  sentido text,
  produto text not null,
  quantidade numeric,
  valor_liquido numeric,
  vendedor text,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_pagamento (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  forma text not null,
  valor numeric not null,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_conferencia (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  forma text not null,
  calculado numeric,
  informado numeric,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_parcela (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  lancado_em date,
  vencimento date,
  valor numeric not null,
  status text,
  descricao text,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_baixa (
  doc_tabela text,
  doc_id text,
  parcela_origem_id text,
  origem_tabela text,
  origem_id text,
  pago_em date,
  valor numeric not null,
  forma text,
  status text,
  primary key (doc_tabela, doc_id, parcela_origem_id, origem_tabela, origem_id)
) on commit drop;
```

- [ ] **Passo 4: Criar `sql/link/ligar.sql`**

O primeiro comando enche a `link_liga`, código por código, na ordem da spec: decisão da `de_para` (só as que não começam com `link:`), regra, falha. A regra de pessoa e a de vendedor só ligam quando acham exatamente um no cadastro do ERP novo (`having count(*) = 1`), e a de pessoa ignora o CPF/CNPJ vazio (`o.documento <> ''`), que no ERP novo é o de 21 pessoas. O segundo comando devolve as decisões da `de_para` que apontam para código que não existe no cadastro do ERP novo; vazio quando está tudo certo. É esse o resultado que `rodar` devolve para `ligarLink`.

Crie `sql/link/ligar.sql` com exatamente este conteúdo:

```sql
-- Liga todo código da Link ao cadastro do ERP novo (fonte meuerp), nesta ordem:
-- 1) decisão da de_para; 2) a regra: produto pelo código, pessoa pelo CPF/CNPJ só com dígitos,
-- vendedor pelo primeiro nome, sem acento e em maiúsculas; 3) falha: 'link:' e o código da Link.
-- O fornecedor ganha 900000 no código, como a migração fez no ERP novo.
insert into pg_temp.link_liga (entidade, codigo_origem, codigo_kaizen, como)
with origem (entidade, codigo_origem, documento, nome) as (
  select 'produto', p.produto_codigo, null::text, null::text
  from erp.produto p
  union all
  select 'pessoa', c.cliente_codigo, regexp_replace(coalesce(c.cpf, c.cnpj), '[^0-9]', '', 'g'), null
  from erp.cliente c
  union all
  select 'pessoa', (f.fornecedor_codigo + 900000)::text, regexp_replace(f.cpf_cnpj, '[^0-9]', '', 'g'), null
  from erp.fornecedor f
  union all
  select 'funcionario', u.id_usuario::text, null,
    upper(translate(btrim(u.nome),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
  from erp.usuario u
),
pessoa_meuerp as (
  select p.codigo, regexp_replace(p.cpf_cnpj, '[^0-9]', '', 'g') as documento
  from kaizen.pessoa p
  where p.fonte = 'meuerp'
),
funcionario_meuerp as (
  select f.codigo,
    upper(translate(split_part(btrim(f.nome), ' ', 1),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) as primeiro_nome
  from kaizen.funcionario f
  where f.fonte = 'meuerp'
),
-- a regra só liga quando acha exatamente um no cadastro do ERP novo
regra (entidade, codigo_origem, codigo_kaizen) as (
  select o.entidade, o.codigo_origem, p.codigo
  from origem o
  join kaizen.produto p on p.fonte = 'meuerp' and p.codigo = o.codigo_origem
  where o.entidade = 'produto'
  union all
  select o.entidade, o.codigo_origem, min(p.codigo)
  from origem o
  join pessoa_meuerp p on p.documento = o.documento
  where o.entidade = 'pessoa' and o.documento <> ''
  group by o.entidade, o.codigo_origem
  having count(*) = 1
  union all
  select o.entidade, o.codigo_origem, min(f.codigo)
  from origem o
  join funcionario_meuerp f on f.primeiro_nome = o.nome
  where o.entidade = 'funcionario' and o.nome <> ''
  group by o.entidade, o.codigo_origem
  having count(*) = 1
)
select
  o.entidade, o.codigo_origem,
  coalesce(d.codigo_kaizen, r.codigo_kaizen, 'link:' || o.codigo_origem),
  case
    when d.codigo_kaizen is not null then 'decisao'
    when r.codigo_kaizen is not null then 'regra'
    else 'falha'
  end
from origem o
left join kaizen.de_para d
  on d.entidade = o.entidade and d.fonte = 'link' and d.codigo_origem = o.codigo_origem
 and d.codigo_kaizen not like 'link:%'
left join regra r on r.entidade = o.entidade and r.codigo_origem = o.codigo_origem;

-- decisões que apontam para código inexistente no cadastro do ERP novo: vazio quando está tudo certo
select d.entidade, d.codigo_origem, d.codigo_kaizen
from kaizen.de_para d
where d.fonte = 'link'
  and d.codigo_kaizen not like 'link:%'
  and not exists (select 1 from kaizen.produto p where d.entidade = 'produto' and p.fonte = 'meuerp' and p.codigo = d.codigo_kaizen)
  and not exists (select 1 from kaizen.pessoa p where d.entidade = 'pessoa' and p.fonte = 'meuerp' and p.codigo = d.codigo_kaizen)
  and not exists (select 1 from kaizen.funcionario f where d.entidade = 'funcionario' and f.fonte = 'meuerp' and f.codigo = d.codigo_kaizen)
order by d.entidade, d.codigo_origem;
```

- [ ] **Passo 5: Conferir os dois arquivos SQL**

Rode (Git Bash): `sha256sum sql/link/preparar.sql sql/link/ligar.sql`
Saída esperada:
```
bb44a1d78317e467211d617dee6d39abfaee2a10392fbff7ba9b75ade8e0d07c *sql/link/preparar.sql
849fa39485abbdf183ba000038cae03a7e26dda3a6a5b0914bb69a15dcb5cfee *sql/link/ligar.sql
```
Um hash diferente quer dizer que o arquivo não é o do protótipo (uma linha mudada, CRLF no lugar de LF, falta da quebra de linha no fim): corrija até bater.

Rode (Git Bash): `for par in 'produto produto_codigo' 'cliente cliente_codigo' 'cliente cpf' 'cliente cnpj' 'fornecedor fornecedor_codigo' 'fornecedor cpf_cnpj' 'usuario id_usuario' 'usuario nome'; do grep -c "^$par " sql/link/colunas-esperadas.txt; done | tr '\n' ' '`
Saída esperada: `1 1 1 1 1 1 1 1 ` (cada coluna do `erp` que `ligar.sql` lê está na lista uma vez; a Link falsa só tem as colunas da lista).

- [ ] **Passo 6: Acrescentar `rodar` e `ligarLink` a `tradutor/link.mts`**

Três acréscimos ao arquivo da tarefa 2, sem mudar o que já está lá: o `import type { QueryResult } from 'pg'` depois do import de `node:fs`; a função privada `rodar` logo depois de `lerSql`; e `ligarLink` no fim do arquivo, depois de `conferirEntradaLink`. O `rodar` manda o arquivo inteiro numa consulta só, sem parâmetro (o protocolo simples do Postgres aceita vários comandos assim), e o `pg` devolve um resultado por comando; o que interessa é o último. O `colunas.sql` da tarefa 2 continua fora do `rodar`, porque é um comando só, com parâmetros.

O arquivo inteiro fica assim no fim desta tarefa:

```ts
// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// Os arquivos de sql/link têm vários comandos; o pg devolve um resultado por comando, e o que importa é o do último.
async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>> {
  const resultado = (await cliente.query(lerSql(`link/${nome}.sql`))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}

// Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
export async function ligarLink(cliente: Cliente): Promise<void> {
  await rodar(cliente, 'preparar')
  const invalidas = await rodar(cliente, 'ligar')
  if (invalidas.length > 0) {
    const lista = invalidas.map((l) => `${l.entidade} ${l.codigo_origem} → ${l.codigo_kaizen}`).join(', ')
    throw new ErroLink(`decisão da de_para aponta para código que não existe no ERP novo: ${lista}`)
  }
}
```

- [ ] **Passo 7: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-ligar.test.mts`
Saída esperada: passa, com `ℹ pass 7`, `ℹ fail 0` e:
```
✔ produto liga pelo código, e o que não existe no ERP novo vira falha link:<código>
✔ cliente liga pelo CPF/CNPJ só com dígitos, e CPF/CNPJ vazio não liga nada
✔ CPF/CNPJ que acha duas pessoas do ERP novo vira falha
✔ a decisão da de_para vale antes do CPF: o Consumidor Final 10000502 vai para 999007
✔ vendedor liga pela primeira palavra do nome, sem acento, e o Sistema (1) não vira o funcionário 1 do ERP novo
✔ fornecedor liga pelo CNPJ com o código + 900000, e o FORNECEDOR PADRÃO vira link:900001
✔ decisão que aponta para código que não existe no ERP novo para com ErroLink, com a linha na mensagem
```

- [ ] **Passo 8: Atualizar `testes-esperados.txt` (N = 7)**

Esta tarefa acrescentou 7 `test(` (todos em `tradutor/link-ligar.test.mts`). Some ao número atual: 289 + 7 = 296. O arquivo fica com uma única linha:

```text
296
```

- [ ] **Passo 9: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 296 testes com ✔ (os 5 de `tradutor/link-falsa.test.mts` da tarefa 2 continuam passando: `conferirEntradaLink` não mudou); última linha `rodou 296 testes, esperados 296`.

- [ ] **Passo 10: Commit**

```bash
git add sql/link/preparar.sql sql/link/ligar.sql tradutor/link.mts tradutor/link-ligar.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Link: cada código ganha o código do cadastro do ERP novo, ou vira falha link:

Cada produto, cliente, fornecedor e vendedor da Link passa a ter o código
do cadastro do ERP novo que o Kaizen guarda, nesta ordem: a decisão da
de_para, a regra (produto pelo código; cliente e fornecedor pelo CPF/CNPJ
só com dígitos, quando acha exatamente uma pessoa; vendedor pela primeira
palavra do nome, sem acento) e, se nada ligar, a falha link:<código>.

Nos casos da cópia antiga: 40 dos 42 produtos ligam pelo código (1993 e
2396 só existem na Link); 10 clientes ligam pelo CPF/CNPJ, o Consumidor
Final vai para o 999007 pela decisão e o cliente 1 falha; 3 fornecedores
ligam pelo CNPJ e o FORNECEDOR PADRÃO vira link:900001; Caio, Débora e
Neide ligam, e o Sistema não vira o funcionário 1 do ERP novo. CPF/CNPJ
vazio não liga nada, CPF/CNPJ que acha duas pessoas vira falha, e uma
decisão que aponta para código inexistente para o comando, com a linha na
mensagem.

A ligação fica numa tabela temporária da transação; nada é gravado no
Kaizen ainda. Testes: rodou 296, esperados 296.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 296 testes, esperados 296`; o commit sai.


### Tarefa 4: Vendas gravadas no Kaizen

**O que esta tarefa entrega, em resultado:** o comando da Link passa a gravar no Kaizen as vendas e os orçamentos da Link, na forma do pedido e do orçamento do ERP novo: o mesmo tipo, a mesma situação, o mesmo movimento e o mesmo financeiro, o cliente, o produto e o vendedor com os códigos do cadastro novo, os itens vendidos e devolvidos, e os pagamentos com o sinal que o ERP novo usa num pedido. Nos 16 casos reais da cópia antiga: a venda de junho 1992 soma exatamente os R$ 150,00 que a Link gravou; os três empates de meio centavo (392, 3613 e 5061) dão o vendido da Link, onde o arredondamento comum erraria um centavo em cada um; a devolução da 1095 fica em 67,764 sem arredondar e fecha com os 67,77 da Link arredondando linha a linha; os pagamentos somam venda − devolução em 13 das 14 vendas válidas (a exceção é a 100, cujo troco de R$ 0,01 a Link não grava em linha nenhuma); o que não liga ao cadastro novo (o cliente 1, os produtos 1993 e 2396 e o vendedor Sistema) vira `link:<código>` no documento, no cadastro e na `de_para`, e uma decisão nova na `de_para` vale na rodada seguinte. Rodar duas vezes não muda nada, e a venda que some da Link sai do Kaizen. São 11 testes novos.

**Arquivos:**
- Criar: `sql/link/vendas.sql` (do protótipo, sem mudar nada)
- Criar: `sql/link/cadastros.sql` (do protótipo, sem mudar nada)
- Criar: `sql/link/gravar.sql` (do protótipo, sem mudar nada)
- Modificar: `tradutor/link.mts` (acrescenta o import de `emTransacao`, `FAMILIAS`, `ContagensLink` e `traduzirLink`)
- Testar: `tradutor/link-vendas.test.mts`
- Modificar: `testes-esperados.txt` (de `296` para `307`)

**Interfaces:**
- Consome:
  - Tarefa 1 (migrações `006_link.sql` e `007_de_para_link.sql`): a função `kaizen.meio_par(valor numeric, casas integer) returns numeric`; as linhas `fonte = 'link'` de `kaizen.traducao` (entre elas `tipo` `A/true` e `T/true` → `pedido`, `P/false` → `orcamento`; `situacao` `false` → `emitido`, `true` → `cancelado`; `situacao_pelo_modelo` `P/false` → `emitido`; `forma` `Pix` → `pix`, `Cartao/false` → `debito`, `2.1.2.03` → `troca`, `1.1.1.01` → `dinheiro`); a visão `kaizen.documento_negocio` com `situacao = coalesce(situação traduzida, situação pelo modelo)`; as 22 decisões da Link na `kaizen.de_para` (entre elas `pessoa` `10000502` → `999007`, o Consumidor Final).
  - Tarefa 2: `tradutor/link-falsa.mts` (`criarLinkFalsa`, `carregarCasosLink`, `lerCasosLink` e o tipo `LinkFalsa`, com `inserir` e `executar` como `postgres` no esquema `erp` do banco de teste), `tradutor/link-casos.json`, e em `tradutor/link.mts`: `ErroLink`, `lerSql` e `conferirEntradaLink(cliente)`.
  - Tarefa 3: `sql/link/preparar.sql` (cria as temporárias `pg_temp.link_liga`, `link_doc`, `link_item`, `link_pagamento`, `link_conferencia`, `link_parcela` e `link_baixa`, todas `on commit drop`), `sql/link/ligar.sql` (enche `pg_temp.link_liga (entidade, codigo_origem, codigo_kaizen, como)`, com `como` em `decisao`, `regra` ou `falha`), e em `tradutor/link.mts`: `rodar(cliente, nome)` (privada; devolve as linhas do último comando do arquivo) e `ligarLink(cliente)`.
  - `tradutor/banco.mts`: `emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>` (abre `begin`; faz `commit` no fim, ou `rollback` e relança o erro).
  - `tradutor/apoio-teste.mts`: `criarBancoKaizen(): Promise<BancoTeste>` e o tipo `BancoTeste`.
- Produz:
  ```ts
  // tradutor/link.mts
  export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }
  export async function traduzirLink(cliente: Cliente): Promise<ContagensLink>
  // Confere a entrada (conferirEntradaLink) e, numa transação só (emTransacao): liga (ligarLink), roda cada família de
  // FAMILIAS (nesta tarefa, só 'vendas'), depois 'cadastros' e 'gravar'. Devolve a última linha do gravar: as contagens
  // da fonte link no Kaizen, em texto (count de bigint). Qualquer erro desfaz a transação inteira e é relançado.
  ```
  e, nas temporárias, o contrato que as tarefas 5 e 6 seguem: cada família só acrescenta linhas a `link_doc`, `link_item`, `link_pagamento`, `link_conferencia`, `link_parcela` e `link_baixa`; o `gravar.sql` já grava todas elas. O `cadastros.sql` grava o cadastro e as falhas só do que `link_doc` e `link_item` citam, por isso roda depois de todas as famílias.
- Resultado nos casos, só com a família das vendas (conferido rodando `preparar`, `ligar`, `vendas`, `cadastros` e `gravar` sobre os casos): 16 documentos (todos novos na primeira rodada), 55 itens, 19 pagamentos, 0 conferências, 0 parcelas e 0 baixas; no cadastro fonte `link`, 2 produtos, 1 pessoa e 1 funcionário; 4 falhas na `de_para`.
- `testes-esperados.txt` passa de `296` para `307`.

**Antes de começar:** as tarefas 1 a 3 estão feitas e commitadas na branch `fase-3`, e o Postgres local está no ar (`docker compose up -d --wait`). Rode tudo a partir de `C:\Projetos\KAIZEN`, no Git Bash. Os três arquivos SQL são os do protótipo que rodou contra a cópia antiga inteira (6.155 documentos, as duas rodadas iguais, a comparação por dia sem diferença): copie-os exatamente como estão aqui; o passo 6 confere o sha256 de cada um. O `.gitattributes` já manda o `*.sql` em LF. Os testes deste arquivo olham só as negociações (`origem_tabela = 'negociacao'`) e as falhas das vendas pelos códigos, sem contar o total de documentos: a Link falsa tem todos os casos, e as tarefas 5 e 6 acrescentam caixa, contas e notas ao mesmo comando (a conta 8396 traz uma quinta falha, `link:900001`) sem quebrar estes testes.

- [ ] **Passo 1: Escrever o teste das vendas**

Crie `tradutor/link-vendas.test.mts`. Cada teste chama `traduzirLink(banco.cliente)` (o comando é idempotente) e lê o que ficou no Kaizen. Os testes 10 e 11 mudam a `de_para` e a Link falsa, e desfazem a mudança no `finally`.

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

// Cada teste roda o comando de novo (ele é idempotente) e lê o que ficou no Kaizen. Os valores esperados são os que
// este mesmo SQL gravou, no protótipo, para estes casos reais da cópia antiga. As consultas olham só as negociações
// (origem_tabela 'negociacao'): as tarefas 5 e 6 acrescentam caixa, contas e notas ao mesmo comando e aos mesmos casos.

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

async function linhas(sql: string, parametros: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, parametros)).rows
}

// Os itens de uma negociação no Kaizen: primeiro os devolvidos, depois os vendidos, cada um na ordem da Link.
async function itens(negociacao: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
       from kaizen.documento_item i
       join kaizen.documento k on k.id = i.documento_id
      where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = $1
      order by i.origem_tabela, i.origem_id::bigint`,
    [negociacao],
  )
}

// Os pagamentos das negociações, com a forma crua e a forma no vocabulário do ERP novo.
async function pagamentos(negociacoes: string[]): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select k.origem_id as negociacao, p.origem_tabela, p.origem_id, p.forma, t.valor as forma_traduzida, p.valor
       from kaizen.documento_pagamento p
       join kaizen.documento k on k.id = p.documento_id
       left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = p.forma
      where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = any($1::text[])
      order by k.criado_em, p.origem_tabela, p.origem_id::bigint`,
    [negociacoes],
  )
}

// A soma dos pagamentos de cada negociação no Kaizen, ao lado de venda − devolução como a Link gravou.
async function somas(negociacoes: string[]): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select k.origem_id as negociacao, coalesce(sum(p.valor), 0) as pagamentos,
            n.valor_total_venda - n.valor_total_devolucao as venda_menos_devolucao
       from kaizen.documento k
       join erp.negociacao n on n.id_negociacao::text = k.origem_id
       left join kaizen.documento_pagamento p on p.documento_id = k.id
      where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = any($1::text[])
      group by k.origem_id, k.criado_em, n.valor_total_venda, n.valor_total_devolucao
      order by k.criado_em`,
    [negociacoes],
  )
}

// As falhas que as vendas dos casos produzem: o cliente 1, os produtos 1993 e 2396 e o vendedor Sistema (usuário 1).
const FALHAS_DAS_VENDAS = `
  select entidade, codigo_origem, codigo_kaizen
    from kaizen.de_para
   where fonte = 'link'
     and (entidade, codigo_origem) in (('pessoa', '1'), ('produto', '1993'), ('produto', '2396'), ('funcionario', '1'))
   order by entidade, codigo_origem`

test('a venda de junho 1992 vira pedido emitido, de saída, que recebe, com o cliente e o vendedor do ERP novo', async () => {
  // A primeira rodada deste banco: todo documento é novo.
  const contagens = await traduzirLink(banco.cliente)
  assert.equal(contagens.novos, contagens.documentos)
  // As 16 negociações dos casos (15 vendas e 1 orçamento), com 55 itens e 19 pagamentos.
  assert.deepEqual(await linhas(`
      select
        (select count(*)::int from kaizen.documento k
          where k.fonte = 'link' and k.origem_tabela = 'negociacao') as documentos,
        (select count(*)::int from kaizen.documento_item i join kaizen.documento k on k.id = i.documento_id
          where k.fonte = 'link' and k.origem_tabela = 'negociacao') as itens,
        (select count(*)::int from kaizen.documento_pagamento p join kaizen.documento k on k.id = p.documento_id
          where k.fonte = 'link' and k.origem_tabela = 'negociacao') as pagamentos`), [{ documentos: 16, itens: 55, pagamentos: 19 }])

  // O documento guarda o código cru da Link (modelo T/true, status false) e a visão traduz no vocabulário do ERP novo.
  // O cliente é o código do ERP novo, ligado pelo CPF: o 303, com o nome do cadastro do ERP novo.
  assert.deepEqual(await linhas(`
      select k.codigo, k.modelo, k.status, k.movimento, k.financeiro,
             n.tipo, n.situacao, n.movimento as movimento_traduzido, n.financeiro as financeiro_traduzido,
             k.criado_em, k.fechado_em, k.pessoa, p.nome as cliente, k.turno_caixa, k.turno_usuario, k.turno_numero
        from kaizen.documento k
        join kaizen.documento_negocio n on n.id = k.id
        left join kaizen.pessoa p on p.fonte = 'meuerp' and p.codigo = k.pessoa
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1992'`), [{
    codigo: '2124', modelo: 'T/true', status: 'false', movimento: null, financeiro: null,
    tipo: 'pedido', situacao: 'emitido', movimento_traduzido: 'saida', financeiro_traduzido: 'recebe',
    criado_em: '2026-06-17 13:58:20.706517', fechado_em: '2026-06-17 13:58:21.050114',
    pessoa: '303', cliente: 'CLIENTE 303', turno_caixa: null, turno_usuario: null, turno_numero: null,
  }])

  // O vendedor também é o código do ERP novo: o Caio da Link (usuário 6) é o funcionário 1 do ERP novo.
  assert.deepEqual(await linhas(`
      select distinct i.vendedor, f.nome as vendedor_nome
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        left join kaizen.funcionario f on f.fonte = 'meuerp' and f.codigo = i.vendedor
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1992'`), [
    { vendedor: '1', vendedor_nome: 'Caio Mendes Rocha' },
  ])
})

test('valor do item: meio-par no item e rateio do desconto da negociação sem arredondar (1992 soma 150,00)', async () => {
  await traduzirLink(banco.cliente)
  // 95,70 com 5% de desconto no item dá 90,915, que o meio-par leva a 90,92; o outro item é 60,00. O desconto de
  // 0,60959% da negociação entra depois, sem arredondar: 90,92 × 0,9939041 e 60,00 × 0,9939041.
  assert.deepEqual(await itens('1992'), [
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '5395', sentido: 'S', produto: '1369', quantidade: '1',
      valor_liquido: '90.365760772', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '5396', sentido: 'S', produto: '1438', quantidade: '1',
      valor_liquido: '59.634246', vendedor: '1',
    },
  ])
  // A soma fica sem arredondar; arredondada pelo meio-par, é o valor_total_venda que a Link gravou.
  assert.deepEqual(await linhas(`
      select sum(i.valor_liquido) as soma, kaizen.meio_par(sum(i.valor_liquido), 2) as vendido, n.valor_total_venda
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1992'
       group by n.valor_total_venda`), [{ soma: '150.000006772', vendido: '150.00', valor_total_venda: '150.00' }])
})

test('empate de meio centavo no item vai para o par (392, 3613 e 5061)', async () => {
  await traduzirLink(banco.cliente)
  // Antes do rateio da negociação, os três itens caem exatamente no meio centavo: 109,725 (392), 142,405 (3613) e
  // 206,625 (5061). O meio-par os leva a 109,72, 142,40 e 206,62. Depois vem o desconto da negociação, sem
  // arredondar: nenhum na 392; 4,77979% na 3613 (142,40 × 0,9522021); 2,79773% na 5061 (206,62 × 0,9720227).
  assert.deepEqual(await linhas(`
      select k.origem_id as negociacao, i.origem_id, i.valor_liquido
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
       where k.fonte = 'link' and i.origem_tabela = 'negociacao_item_vendido' and i.origem_id in ('986', '9947', '13997')
       order by k.criado_em`), [
    { negociacao: '392', origem_id: '986', valor_liquido: '109.72' },
    { negociacao: '3613', origem_id: '9947', valor_liquido: '135.59357904' },
    { negociacao: '5061', origem_id: '13997', valor_liquido: '200.839330274' },
  ])
  // Com o meio-par, o vendido de cada venda é o que a Link gravou. Com o arredondamento comum (109,73, 142,41 e
  // 206,63), daria 129,73, 507,01 e 230,01.
  assert.deepEqual(await linhas(`
      select k.origem_id as negociacao, kaizen.meio_par(sum(i.valor_liquido), 2) as vendido, n.valor_total_venda
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id in ('392', '3613', '5061') and i.sentido = 'S'
       group by k.origem_id, k.criado_em, n.valor_total_venda
       order by k.criado_em`), [
    { negociacao: '392', vendido: '129.72', valor_total_venda: '129.72' },
    { negociacao: '3613', vendido: '507.00', valor_total_venda: '507.00' },
    { negociacao: '5061', vendido: '230.00', valor_total_venda: '230.00' },
  ])
})

test('acréscimo da negociação entra no rateio (2492)', async () => {
  await traduzirLink(banco.cliente)
  // A 2492 tem 3,5197% de acréscimo na negociação: cada item é o meio-par dele × 1,035197, sem arredondar
  // (100 × 0,08 = 8,00 vira 8,281576; 10 × 2,70 = 27,00 vira 27,950319; e assim por diante).
  const item = (origem_id: string, produto: string, quantidade: string, valor_liquido: string) => ({
    origem_tabela: 'negociacao_item_vendido', origem_id, sentido: 'S', produto, quantidade, valor_liquido, vendedor: '999005',
  })
  assert.deepEqual(await itens('2492'), [
    item('6769', '2020', '100', '8.281576'),
    item('6770', '1718', '10', '27.950319'),
    item('6771', '1722', '6', '15.527955'),
    item('6772', '2711', '2', '15.1138762'),
    item('6773', '2443', '1', '20.70394'),
    item('6774', '2019', '1', '12.422364'),
  ])
  // 96,60 × 1,035197 = 100,0000302, que o meio-par leva aos 100,00 que a Link gravou.
  assert.deepEqual(await linhas(`
      select sum(i.valor_liquido) as soma, kaizen.meio_par(sum(i.valor_liquido), 2) as vendido, n.valor_total_venda
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '2492'
       group by n.valor_total_venda`), [{ soma: '100.0000302', vendido: '100.00', valor_total_venda: '100.00' }])
})

test('devolução 1095: itens de entrada sem arredondar, com o vendedor da troca', async () => {
  await traduzirLink(banco.cliente)
  // A 1095 é uma troca: voltam 26 e 14 unidades a 1,6941 e saem dois itens. O devolvido é qtd × preço líquido, sem
  // arredondar, e leva o vendedor da negociação da troca (o Caio, funcionário 1 do ERP novo).
  assert.deepEqual(await itens('1095'), [
    {
      origem_tabela: 'negociacao_item_devolvido', origem_id: '27', sentido: 'E', produto: '2701', quantidade: '26',
      valor_liquido: '44.0466', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_devolvido', origem_id: '28', sentido: 'E', produto: '2702', quantidade: '14',
      valor_liquido: '23.7174', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '2993', sentido: 'S', produto: '1718', quantidade: '14',
      valor_liquido: '37.8', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '2994', sentido: 'S', produto: '2020', quantidade: '90',
      valor_liquido: '9', vendedor: '1',
    },
  ])
  // Sem arredondar, a devolução é 67,764 (os relatórios da Link mostram 67,76). Arredondando linha a linha,
  // 44,05 + 23,72 = 67,77, o valor_total_devolucao que a Link gravou.
  assert.deepEqual(await linhas(`
      select sum(i.valor_liquido) as devolucao, sum(kaizen.meio_par(i.valor_liquido, 2)) as linha_a_linha, n.valor_total_devolucao
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1095' and i.sentido = 'E'
       group by n.valor_total_devolucao`), [{ devolucao: '67.7640', linha_a_linha: '67.77', valor_total_devolucao: '67.77' }])
})

test('venda cancelada fica cancelado, e o orçamento fica emitido pelo modelo com itens de sentido N', async () => {
  await traduzirLink(banco.cliente)
  // A 8 foi cancelada no caixa (caixa.inativo verdadeiro). O orçamento 1771 não tem caixa, então não tem status: a
  // situação vem do modelo P/false, e ele não mexe no estoque nem no dinheiro. O cliente dele é o Consumidor Final,
  // ligado pela decisão da de_para (10000502 → 999007).
  assert.deepEqual(await linhas(`
      select k.origem_id, k.codigo, k.modelo, n.tipo, k.status, n.situacao, n.movimento, n.financeiro, k.fechado_em, k.pessoa
        from kaizen.documento k
        join kaizen.documento_negocio n on n.id = k.id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id in ('8', '1771')
       order by k.criado_em`), [
    {
      origem_id: '8', codigo: '2', modelo: 'A/true', tipo: 'pedido', status: 'true', situacao: 'cancelado',
      movimento: 'saida', financeiro: 'recebe', fechado_em: '2026-04-11 19:07:58.647319', pessoa: null,
    },
    {
      origem_id: '1771', codigo: '5', modelo: 'P/false', tipo: 'orcamento', status: null, situacao: 'emitido',
      movimento: 'nenhum', financeiro: 'nenhum', fechado_em: null, pessoa: '999007',
    },
  ])
  // 150 × 65,00 com 12% de desconto na negociação: 8.580,00, de sentido N.
  assert.deepEqual(await itens('1771'), [
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '4808', sentido: 'N', produto: '2805', quantidade: '150',
      valor_liquido: '8580', vendedor: '1',
    },
  ])
  // A cancelada guarda os 8 itens como a Link os gravou, de sentido S: quem conta a venda olha a situação.
  assert.deepEqual(await linhas(`
      select i.sentido, count(*)::int as itens
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '8'
       group by i.sentido`), [{ sentido: 'S', itens: 8 }])
})

test('Pix e débito na mesma venda (556), com a forma traduzida', async () => {
  await traduzirLink(banco.cliente)
  // No caixa_parcela, o cartão leva na forma crua o crédito (true) ou o débito (false): Cartao/false é débito.
  assert.deepEqual(await pagamentos(['556']), [
    { negociacao: '556', origem_tabela: 'caixa_parcela', origem_id: '542', forma: 'Cartao/false', forma_traduzida: 'debito', valor: '60.00' },
    { negociacao: '556', origem_tabela: 'caixa_parcela', origem_id: '543', forma: 'Pix', forma_traduzida: 'pix', valor: '11.00' },
  ])
  assert.deepEqual(await somas(['556']), [{ negociacao: '556', pagamentos: '71.00', venda_menos_devolucao: '71.00' }])
})

test('vale gerado e usado, dinheiro devolvido, bonificação e resto do vale: os pagamentos somam venda − devolução', async () => {
  await traduzirLink(banco.cliente)
  const pagamento = (negociacao: string, origem_tabela: string, origem_id: string, forma: string, forma_traduzida: string, valor: string) =>
    ({ negociacao, origem_tabela, origem_id, forma, forma_traduzida, valor })
  assert.deepEqual(await pagamentos(['108', '358', '427', '434', '435', '1095']), [
    // 108: só devolução, com R$ 97,00 devolvidos em dinheiro ao cliente; entra negativo, como o troco.
    pagamento('108', 'pc_lancamento_parcela', '278', '1.1.1.01', 'dinheiro', '-97.00'),
    // 358: paga com a bonificação, que aparece como fonte 2.1.2.03 do lançamento da venda.
    pagamento('358', 'pc_lancamento_fonte', '791', '2.1.2.03', 'troca', '60.00'),
    // 427: usa 51,45 de vale, e o resto, 0,15, volta como vale.
    pagamento('427', 'pc_lancamento_parcela', '966', '2.1.2.03', 'troca', '51.45'),
    pagamento('427', 'pc_lancamento_parcela', '967', '2.1.2.03', 'troca', '-0.15'),
    // 434: a devolução de 742,90 vira vale (negativo); 435: o vale é usado na compra seguinte (positivo).
    pagamento('434', 'pc_lancamento_parcela', '981', '2.1.2.03', 'troca', '-742.90'),
    pagamento('435', 'pc_lancamento_parcela', '984', '2.1.2.03', 'troca', '742.90'),
    // 1095: a troca devolve 67,77 e leva 46,80; a diferença, 20,97, vira vale.
    pagamento('1095', 'pc_lancamento_parcela', '2457', '2.1.2.03', 'troca', '-20.97'),
  ])
  assert.deepEqual(await somas(['108', '358', '427', '434', '435', '1095']), [
    { negociacao: '108', pagamentos: '-97.00', venda_menos_devolucao: '-97.00' },
    { negociacao: '358', pagamentos: '60.00', venda_menos_devolucao: '60.00' },
    { negociacao: '427', pagamentos: '51.30', venda_menos_devolucao: '51.30' },
    { negociacao: '434', pagamentos: '-742.90', venda_menos_devolucao: '-742.90' },
    { negociacao: '435', pagamentos: '742.90', venda_menos_devolucao: '742.90' },
    { negociacao: '1095', pagamentos: '-20.97', venda_menos_devolucao: '-20.97' },
  ])
  // Nas 14 vendas válidas dos casos, a soma bate em 13. A exceção é a 100: Pix 336,78 e dinheiro 0,01 para uma venda
  // de 336,78, porque a Link não grava o troco de R$ 0,01 em linha nenhuma.
  assert.deepEqual(await linhas(`
      with soma as (
        select k.origem_id, coalesce(sum(p.valor), 0) as pagamentos,
               n.valor_total_venda - n.valor_total_devolucao as venda_menos_devolucao
          from kaizen.documento k
          join erp.negociacao n on n.id_negociacao::text = k.origem_id
          join erp.caixa c on c.id_negociacao = n.id_negociacao
          left join kaizen.documento_pagamento p on p.documento_id = k.id
         where k.fonte = 'link' and k.origem_tabela = 'negociacao' and n.venda and not c.inativo
         group by k.origem_id, n.valor_total_venda, n.valor_total_devolucao
      )
      select count(*)::int as vendas_validas,
             count(*) filter (where pagamentos = venda_menos_devolucao)::int as batem,
             string_agg(origem_id || ': ' || pagamentos || ' para ' || venda_menos_devolucao, ', ')
               filter (where pagamentos <> venda_menos_devolucao) as nao_batem
        from soma`), [{ vendas_validas: 14, batem: 13, nao_batem: '100: 336.79 para 336.78' }])
})

test('a falha vira link:<código> no documento, no cadastro fonte link e na de_para', async () => {
  await traduzirLink(banco.cliente)
  // Nas vendas dos casos, falha o cliente de código 1 (o CNPJ dele não existe no ERP novo), na venda 1073...
  assert.deepEqual(await linhas(`
      select origem_id, pessoa from kaizen.documento
       where fonte = 'link' and origem_tabela = 'negociacao' and pessoa like 'link:%'`), [{ origem_id: '1073', pessoa: 'link:1' }])
  // ...e, só na venda cancelada 8, o vendedor Sistema (usuário 1 da Link, que não vira o funcionário 1 do ERP novo),
  // nos 8 itens, e os produtos 1993 e 2396, que o ERP novo não tem, em 3 deles.
  const item = (origem_id: string, produto: string) => ({ negociacao: '8', origem_id, produto, vendedor: 'link:1' })
  assert.deepEqual(await linhas(`
      select k.origem_id as negociacao, i.origem_id, i.produto, i.vendedor
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and (i.produto like 'link:%' or i.vendedor like 'link:%')
       order by i.origem_id::bigint`), [
    item('9', 'link:1993'),
    item('10', 'link:1993'),
    item('11', '1994'),
    item('12', '1440'),
    item('13', '1440'),
    item('14', '1366'),
    item('15', '1442'),
    item('16', 'link:2396'),
  ])
  // O cadastro do Kaizen ganha, com fonte link, cada código que falhou, com os dados da Link.
  assert.deepEqual(await linhas(`
      select codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo
        from kaizen.produto where fonte = 'link' and codigo in ('link:1993', 'link:2396') order by codigo`), [
    {
      codigo: 'link:1993', descricao: 'Acabamento P/espelho Cabeça Chata Branco Toro', grupo: 'Acessórios', secao: null,
      subgrupo: 'SUBGRUPO PADRÃO', marca: 'Toro', custo: '0.00', ativo: true,
    },
    {
      codigo: 'link:2396', descricao: 'Batente Silicone 10mm Cartela C/ 50 Toro', grupo: 'Acessórios', secao: null,
      subgrupo: 'SUBGRUPO PADRÃO', marca: 'Toro', custo: '7.90', ativo: true,
    },
  ])
  assert.deepEqual(await linhas(`
      select codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo
        from kaizen.pessoa where fonte = 'link' and codigo = 'link:1'`), [{
    codigo: 'link:1', nome: 'CLIENTE 1', cpf_cnpj: '91156329194820', bairro: 'CAMBOA',
    municipio: 'Sao Jose de Ribamar', ibge: '2111201', uf: 'MA', ativo: true,
  }])
  assert.deepEqual(await linhas(`
      select codigo, nome, usuario, tipo, ativo from kaizen.funcionario where fonte = 'link' and codigo = 'link:1'`), [
    { codigo: 'link:1', nome: 'Sistema', usuario: null, tipo: null, ativo: true },
  ])
  // E a de_para registra cada falha, com o código da Link e o link:<código> que ele ganhou.
  assert.deepEqual(await linhas(FALHAS_DAS_VENDAS), [
    { entidade: 'funcionario', codigo_origem: '1', codigo_kaizen: 'link:1' },
    { entidade: 'pessoa', codigo_origem: '1', codigo_kaizen: 'link:1' },
    { entidade: 'produto', codigo_origem: '1993', codigo_kaizen: 'link:1993' },
    { entidade: 'produto', codigo_origem: '2396', codigo_kaizen: 'link:2396' },
  ])
})

test('uma decisão nova na de_para vale na rodada seguinte e tira a falha', async () => {
  await traduzirLink(banco.cliente)
  const pessoaDa1073 = `
    select k.pessoa, p.nome
      from kaizen.documento k
      left join kaizen.pessoa p on p.fonte = 'meuerp' and p.codigo = k.pessoa
     where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1073'`
  assert.deepEqual(await linhas(pessoaDa1073), [{ pessoa: 'link:1', nome: null }])
  // Alguém decide que o cliente 1 da Link é o Consumidor Final (999007) do ERP novo. A falha já ocupa a mesma chave
  // na de_para, e a decisão toma o lugar dela. (Na vida real, a decisão entra por migração.)
  await banco.cliente.query(`
    insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen)
    values ('pessoa', 'link', '1', '999007')
    on conflict (entidade, fonte, codigo_origem) do update set codigo_kaizen = excluded.codigo_kaizen`)
  try {
    await traduzirLink(banco.cliente)
    assert.deepEqual(await linhas(pessoaDa1073), [{ pessoa: '999007', nome: 'CONSUMIDOR FINAL' }])
    // O cliente 1 fica só com a decisão; as outras falhas das vendas continuam.
    assert.deepEqual(await linhas(FALHAS_DAS_VENDAS), [
      { entidade: 'funcionario', codigo_origem: '1', codigo_kaizen: 'link:1' },
      { entidade: 'pessoa', codigo_origem: '1', codigo_kaizen: '999007' },
      { entidade: 'produto', codigo_origem: '1993', codigo_kaizen: 'link:1993' },
      { entidade: 'produto', codigo_origem: '2396', codigo_kaizen: 'link:2396' },
    ])
    // O cadastro link:1 continua lá: o cadastro só da Link nunca se apaga.
    assert.deepEqual(await linhas(`select codigo, nome from kaizen.pessoa where fonte = 'link' and codigo = 'link:1'`), [
      { codigo: 'link:1', nome: 'CLIENTE 1' },
    ])
  } finally {
    await banco.cliente.query(`delete from kaizen.de_para where entidade = 'pessoa' and fonte = 'link' and codigo_origem = '1'`)
    await traduzirLink(banco.cliente)
  }
})

test('rodar duas vezes deixa o mesmo conteúdo, com os mesmos id e visto_em, e o documento que sumiu da Link sai', async () => {
  // O conteúdo das tabelas que as vendas gravam, linha a linha, como texto. Ficam de fora o id dos filhos (eles são
  // trocados por inteiro a cada rodada) e o lido_em do cadastro; o filho leva a origem do documento no lugar do
  // documento_id. O id e o visto_em dos documentos são conferidos à parte.
  const foto = () => linhas(`
      with d as (select id, jsonb_build_object('documento', origem_tabela || '/' || origem_id) as origem from kaizen.documento)
      select tabela, linha from (
        select 'documento' as tabela, (to_jsonb(k) - 'id' - 'visto_em')::text as linha from kaizen.documento k
        union all
        select 'documento_item', ((to_jsonb(i) - 'id' - 'documento_id') || d.origem)::text
          from kaizen.documento_item i join d on d.id = i.documento_id
        union all
        select 'documento_pagamento', ((to_jsonb(p) - 'id' - 'documento_id') || d.origem)::text
          from kaizen.documento_pagamento p join d on d.id = p.documento_id
        union all
        select 'produto', (to_jsonb(x) - 'lido_em')::text from kaizen.produto x
        union all
        select 'pessoa', (to_jsonb(x) - 'lido_em')::text from kaizen.pessoa x
        union all
        select 'funcionario', (to_jsonb(x) - 'lido_em')::text from kaizen.funcionario x
        union all
        select 'de_para', to_jsonb(x)::text from kaizen.de_para x
      ) foto
      order by tabela collate "C", linha collate "C"`)
  const idsEVistos = () => linhas(`select origem_tabela, origem_id, id, visto_em from kaizen.documento where fonte = 'link' order by id`)

  const primeira = await traduzirLink(banco.cliente)
  const conteudo = await foto()
  const ids = await idsEVistos()
  const segunda = await traduzirLink(banco.cliente)
  assert.deepEqual(segunda, { ...primeira, novos: '0' })
  assert.deepEqual(await foto(), conteudo)
  assert.deepEqual(await idsEVistos(), ids)
  // A foto não está vazia: cada uma das 7 tabelas tem linhas.
  assert.deepEqual([...new Set(conteudo.map((l) => l.tabela))], [
    'de_para', 'documento', 'documento_item', 'documento_pagamento', 'funcionario', 'pessoa', 'produto',
  ])

  // A venda 100 some da Link: a negociação, os itens, o caixa e as parcelas do caixa.
  await falsa.executar('delete from erp.caixa_parcela where id_caixa = 97')
  await falsa.executar('delete from erp.caixa where id_negociacao = 100')
  await falsa.executar('delete from erp.negociacao_item_vendido where id_negociacao = 100')
  await falsa.executar('delete from erp.negociacao where id_negociacao = 100')
  try {
    await traduzirLink(banco.cliente)
    // O documento 100 sai do Kaizen, com os 3 itens e os 2 pagamentos; as outras 15 negociações ficam.
    assert.deepEqual(await linhas(`
        select
          (select count(*)::int from kaizen.documento
            where fonte = 'link' and origem_tabela = 'negociacao' and origem_id = '100') as documento_100,
          (select count(*)::int from kaizen.documento_item
            where origem_tabela = 'negociacao_item_vendido' and origem_id in ('205', '206', '207')) as itens_da_100,
          (select count(*)::int from kaizen.documento_pagamento
            where origem_tabela = 'caixa_parcela' and origem_id in ('90', '91')) as pagamentos_da_100,
          (select count(*)::int from kaizen.documento
            where fonte = 'link' and origem_tabela = 'negociacao') as negociacoes`), [
      { documento_100: 0, itens_da_100: 0, pagamentos_da_100: 0, negociacoes: 15 },
    ])
  } finally {
    // A venda 100 volta à Link falsa como veio dos casos, e o Kaizen a lê de novo.
    const casos = lerCasosLink()
    await falsa.inserir('negociacao', casos.negociacao.filter((l) => l.id_negociacao === '100'))
    await falsa.inserir('negociacao_item_vendido', casos.negociacao_item_vendido.filter((l) => l.id_negociacao === '100'))
    await falsa.inserir('caixa', casos.caixa.filter((l) => l.id_negociacao === '100'))
    await falsa.inserir('caixa_parcela', casos.caixa_parcela.filter((l) => l.id_caixa === '97'))
    await traduzirLink(banco.cliente)
  }
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-vendas.test.mts`
Saída esperada: falha, com `SyntaxError: The requested module './link.mts' does not provide an export named 'traduzirLink'`, `✖ tradutor\link-vendas.test.mts`, `ℹ tests 1` e `ℹ fail 1`.

- [ ] **Passo 3: Criar `sql/link/vendas.sql`**

Monta, nas temporárias, cada negociação da Link como documento, com os itens e os pagamentos; nada vai ao Kaizen aqui (quem grava é o `gravar.sql`). Em palavras:
- **documento:** toda negociação; o código é o da venda ou o do orçamento; o modelo cru junta o `tipo` e o `venda` (`A/true`, `T/true`, `P/false`); o status cru é o `caixa.inativo` (vazio no orçamento, que não tem caixa); o cliente é o código ligado pela tarefa 3;
- **item vendido:** o meio-par do item e depois o desconto e o acréscimo da negociação, sem arredondar o resultado (decisão 6 da spec); sentido `S` na venda e `N` no orçamento; o vendedor ligado ao `negociacao.id_usuario`;
- **item devolvido:** sentido `E`, `qtd × preco_liquido_unitario`, sem arredondar, com o vendedor da negociação da troca;
- **pagamentos** (decisão 7 da spec): o `caixa_parcela` (no cartão, a forma crua leva o crédito ou o débito: `Cartao/true`, `Cartao/false`); do razão da venda, a parcela `2.1.2.03` (vale usado positivo, vale gerado negativo) e a parcela `1.1.1.01` não positiva (dinheiro devolvido, negativo); e a fonte `2.1.2.03` (a bonificação usada na 358).

```sql
-- Toda negociação da Link vira documento: venda (A/true, T/true) ou orçamento (P/false).
-- A situação crua é o caixa.inativo; o orçamento não tem caixa e fica sem status.
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'negociacao', n.id_negociacao::text,
  coalesce(n.venda_codigo, n.orcamento_codigo)::text,
  n.tipo || '/' || n.venda::text,
  c.inativo::text,
  n.data, c.data_hora,
  lp.codigo_kaizen,
  null
from erp.negociacao n
left join erp.caixa c on c.id_negociacao = n.id_negociacao
left join erp.cliente cl on cl.id_cliente = n.id_cliente
left join pg_temp.link_liga lp on lp.entidade = 'pessoa' and lp.codigo_origem = cl.cliente_codigo;

-- Item vendido: o meio-par do item, depois o desconto e o acréscimo da negociação, sem arredondar o resultado.
-- O trim_scale só tira os zeros à direita que a divisão por 100 deixa (até 46 casas); o valor não muda.
-- Sentido S na venda e N no orçamento, como o movimento do documento no ERP novo.
insert into pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  'negociacao', n.id_negociacao::text,
  'negociacao_item_vendido', v.id_negociacao_item_vendido::text,
  case when n.venda then 'S' else 'N' end,
  lpr.codigo_kaizen,
  v.qtd,
  trim_scale(
    kaizen.meio_par(v.qtd * (v.preco_bruto_unitario + v.valor_acrescimo_padrao) * (1 - v.desconto_percentual / 100), 2)
      * (1 - n.desconto_percentual / 100) * (1 + n.acrescimo_percentual / 100)
  ),
  lf.codigo_kaizen
from erp.negociacao_item_vendido v
join erp.negociacao n on n.id_negociacao = v.id_negociacao
left join erp.produto p on p.id_produto = v.id_produto
left join pg_temp.link_liga lpr on lpr.entidade = 'produto' and lpr.codigo_origem = p.produto_codigo
left join pg_temp.link_liga lf on lf.entidade = 'funcionario' and lf.codigo_origem = n.id_usuario::text;

-- Item devolvido: entra na negociação da troca, com qtd × preço líquido, sem arredondar.
insert into pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  'negociacao', n.id_negociacao::text,
  'negociacao_item_devolvido', d.id_negociacao_item_devolvido::text,
  'E',
  lpr.codigo_kaizen,
  d.qtd,
  d.qtd * d.preco_liquido_unitario,
  lf.codigo_kaizen
from erp.negociacao_item_devolvido d
join erp.negociacao n on n.id_negociacao = d.id_negociacao
left join erp.produto p on p.id_produto = d.id_produto
left join pg_temp.link_liga lpr on lpr.entidade = 'produto' and lpr.codigo_origem = p.produto_codigo
left join pg_temp.link_liga lf on lf.entidade = 'funcionario' and lf.codigo_origem = n.id_usuario::text;

-- Pagamentos do caixa da venda; no cartão, a forma crua leva também o crédito (true) ou débito (false).
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'caixa_parcela', cp.id_caixa_parcela::text,
  case when cp.forma_pagamento = 'Cartao' then 'Cartao/' || cp.credito_ou_debito_cartao::text else cp.forma_pagamento end,
  cp.valor
from erp.caixa_parcela cp
join erp.caixa c on c.id_caixa = cp.id_caixa;

-- Do razão da venda, com o sinal do pedido do ERP novo: na conta 2.1.2.03, o vale usado entra positivo
-- e o vale gerado, negativo.
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'pc_lancamento_parcela', pp.id_pc_lancamento_parcela::text,
  pp.pc_codigo_destino,
  case when pp.destino_positiva then -pp.valor else pp.valor end
from erp.pc_lancamento l
join erp.caixa c on c.id_caixa = l.id_caixa
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento = l.id_pc_lancamento
where pp.pc_codigo_destino = '2.1.2.03';

-- O dinheiro devolvido ao cliente (parcela 1.1.1.01 não positiva) entra negativo, como o troco.
-- As parcelas 1.1.1.01 positivas repetem o dinheiro do caixa_parcela e não entram.
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'pc_lancamento_parcela', pp.id_pc_lancamento_parcela::text,
  pp.pc_codigo_destino,
  -pp.valor
from erp.pc_lancamento l
join erp.caixa c on c.id_caixa = l.id_caixa
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento = l.id_pc_lancamento
where pp.pc_codigo_destino = '1.1.1.01' and not pp.destino_positiva;

-- A bonificação usada na venda (a 358) aparece como fonte 2.1.2.03 do lançamento da venda.
insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'negociacao', c.id_negociacao::text,
  'pc_lancamento_fonte', f.id_pc_lancamento_fonte::text,
  f.pc_codigo_origem,
  case when f.origem_positiva then -f.valor else f.valor end
from erp.pc_lancamento l
join erp.caixa c on c.id_caixa = l.id_caixa
join erp.pc_lancamento_fonte f on f.id_pc_lancamento = l.id_pc_lancamento
where f.pc_codigo_origem = '2.1.2.03';
```

- [ ] **Passo 4: Criar `sql/link/cadastros.sql`**

Grava no cadastro do Kaizen, com fonte `link` e o código `link:<código da Link>`, só o que um documento carregado cita e não ligou (spec, 7.6): o produto com o grupo, o subgrupo e a marca da Link; o cliente, ou o fornecedor com o código + 900000, com a cidade da Link; o funcionário só com o nome. É upsert pela chave `(fonte, codigo)`, e nada se apaga. Depois refaz as falhas da `de_para`: apaga as linhas da fonte `link` que apontam para `link:` e grava as desta rodada; as decisões ficam como estão.

```sql
-- Entra no cadastro do Kaizen, com fonte link, só o que um documento carregado cita e não ligou.
-- Nada se apaga: quem não é mais citado fica com o lido_em da última rodada que o citou.
insert into kaizen.produto (fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo, lido_em)
select
  'link', l.codigo_kaizen, p.descricao, g.descricao, null, s.descricao, m.descricao,
  p.preco_custo, not p.inativo, now()
from pg_temp.link_liga l
join erp.produto p on p.produto_codigo = l.codigo_origem
left join erp.prod_subgrupo s on s.id_prod_subgrupo = p.id_prod_subgrupo
left join erp.prod_grupo g on g.id_prod_grupo = s.id_prod_grupo
left join erp.marca m on m.id_marca = p.id_marca
where l.entidade = 'produto' and l.como = 'falha'
  and l.codigo_kaizen in (select i.produto from pg_temp.link_item i)
on conflict (fonte, codigo) do update set
  descricao = excluded.descricao,
  grupo = excluded.grupo,
  secao = excluded.secao,
  subgrupo = excluded.subgrupo,
  marca = excluded.marca,
  custo = excluded.custo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

-- cliente pelo cliente_codigo; fornecedor pelo fornecedor_codigo + 900000
insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo, lido_em)
select
  'link', l.codigo_kaizen, x.nome, x.cpf_cnpj, x.bairro,
  ci.descricao, ci.cod_cidade::text, ci.sigla_estado::text, x.ativo, now()
from pg_temp.link_liga l
join (
  select c.cliente_codigo as codigo_origem, c.nome, coalesce(c.cpf, c.cnpj) as cpf_cnpj, c.bairro, c.id_cidade, not c.inativo as ativo
  from erp.cliente c
  union all
  select (f.fornecedor_codigo + 900000)::text, f.razao_social, f.cpf_cnpj, f.bairro, f.id_cidade, not f.inativo
  from erp.fornecedor f
) x on x.codigo_origem = l.codigo_origem
left join erp.cidade ci on ci.id_cidade = x.id_cidade
where l.entidade = 'pessoa' and l.como = 'falha'
  and l.codigo_kaizen in (select d.pessoa from pg_temp.link_doc d)
on conflict (fonte, codigo) do update set
  nome = excluded.nome,
  cpf_cnpj = excluded.cpf_cnpj,
  bairro = excluded.bairro,
  municipio = excluded.municipio,
  ibge = excluded.ibge,
  uf = excluded.uf,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

insert into kaizen.funcionario (fonte, codigo, nome, usuario, tipo, ativo, lido_em)
select 'link', l.codigo_kaizen, u.nome, null, null, not u.inativo, now()
from pg_temp.link_liga l
join erp.usuario u on u.id_usuario::text = l.codigo_origem
where l.entidade = 'funcionario' and l.como = 'falha'
  and l.codigo_kaizen in (select i.vendedor from pg_temp.link_item i)
on conflict (fonte, codigo) do update set
  nome = excluded.nome,
  usuario = excluded.usuario,
  tipo = excluded.tipo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

-- As falhas da de_para são refeitas a cada rodada; as decisões ficam como estão.
delete from kaizen.de_para where fonte = 'link' and codigo_kaizen like 'link:%';

insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen)
select l.entidade, 'link', l.codigo_origem, l.codigo_kaizen
from pg_temp.link_liga l
where l.como = 'falha'
  and (
    (l.entidade = 'produto' and l.codigo_kaizen in (select i.produto from pg_temp.link_item i))
    or (l.entidade = 'pessoa' and l.codigo_kaizen in (select d.pessoa from pg_temp.link_doc d))
    or (l.entidade = 'funcionario' and l.codigo_kaizen in (select i.vendedor from pg_temp.link_item i))
  );
```

- [ ] **Passo 5: Criar `sql/link/gravar.sql`**

Grava as temporárias no Kaizen (spec, 7.7): o documento é atualizado no lugar pela chave `(fonte, origem_tabela, origem_id)`, sem tocar em `id` e `visto_em`; o documento da Link que não voltou na leitura sai, com os filhos; os filhos de todo documento da Link são trocados por inteiro. O `left join` dos filhos é de propósito: um filho sem documento para o comando no `not null`, em vez de sumir calado. O último comando devolve as contagens. O arquivo já grava conferência de caixa, parcela e baixa; nesta tarefa essas temporárias ficam vazias, e quem exercita essas partes são os testes das tarefas 5 (conferência) e 6 (parcela e baixa).

```sql
-- O documento é atualizado no lugar pela chave (fonte, origem_tabela, origem_id): id e visto_em não mudam.
-- Movimento, financeiro e turno de caixa ficam vazios; vêm da tradução pelo modelo.
insert into kaizen.documento (
  fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro,
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero
)
select
  'link', d.origem_tabela, d.origem_id, d.codigo, d.modelo, d.status, null, null,
  d.criado_em, d.fechado_em, d.pessoa, null, d.turno_usuario, null
from pg_temp.link_doc d
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
  turno_numero = excluded.turno_numero;

-- documento da Link que não voltou na leitura sai, com os filhos
delete from kaizen.documento k
where k.fonte = 'link'
  and not exists (
    select 1 from pg_temp.link_doc d
    where d.origem_tabela = k.origem_tabela and d.origem_id = k.origem_id
  );

-- os filhos são trocados por inteiro (a baixa sai junto com a parcela)
delete from kaizen.documento_item where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');
delete from kaizen.documento_pagamento where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');
delete from kaizen.parcela where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');
delete from kaizen.conferencia_caixa where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');

-- left join de propósito: um filho sem documento (ou baixa sem parcela) para o comando no not null, em vez de sumir
insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select k.id, i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
from pg_temp.link_item i
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = i.doc_tabela and k.origem_id = i.doc_id
order by k.id, i.origem_tabela, length(i.origem_id), i.origem_id;

insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
select k.id, p.origem_tabela, p.origem_id, p.forma, p.valor
from pg_temp.link_pagamento p
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = p.doc_tabela and k.origem_id = p.doc_id
order by k.id, p.origem_tabela, length(p.origem_id), p.origem_id;

insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
select k.id, c.origem_tabela, c.origem_id, c.forma, c.calculado, c.informado
from pg_temp.link_conferencia c
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = c.doc_tabela and k.origem_id = c.doc_id
order by k.id, c.origem_tabela, length(c.origem_id), c.origem_id;

insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao)
select k.id, p.origem_tabela, p.origem_id, p.lancado_em, p.vencimento, p.valor, p.status, p.descricao
from pg_temp.link_parcela p
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = p.doc_tabela and k.origem_id = p.doc_id
order by k.id, p.origem_tabela, length(p.origem_id), p.origem_id;

-- a baixa liga à parcela recém-inserida pelo documento e pela origem da parcela
insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
select pa.id, b.origem_tabela, b.origem_id, b.pago_em, b.valor, b.forma, b.status
from pg_temp.link_baixa b
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = b.doc_tabela and k.origem_id = b.doc_id
left join kaizen.parcela pa
  on pa.documento_id = k.id
 and pa.origem_tabela = 'pc_lancamento_parcela'
 and pa.origem_id = b.parcela_origem_id
order by pa.id, b.origem_tabela, length(b.origem_id), b.origem_id;

-- visto_em só é gravado na primeira vez, com o now() (início) desta transação
select
  (select count(*) from kaizen.documento k where k.fonte = 'link') as documentos,
  (select count(*) from kaizen.documento k where k.fonte = 'link' and k.visto_em = now()) as novos,
  (select count(*) from kaizen.documento_item i join kaizen.documento k on k.id = i.documento_id where k.fonte = 'link') as itens,
  (select count(*) from kaizen.documento_pagamento p join kaizen.documento k on k.id = p.documento_id where k.fonte = 'link') as pagamentos,
  (select count(*) from kaizen.conferencia_caixa c join kaizen.documento k on k.id = c.documento_id where k.fonte = 'link') as conferencias,
  (select count(*) from kaizen.parcela p join kaizen.documento k on k.id = p.documento_id where k.fonte = 'link') as parcelas,
  (select count(*) from kaizen.baixa b join kaizen.parcela p on p.id = b.parcela_id join kaizen.documento k on k.id = p.documento_id where k.fonte = 'link') as baixas;
```

- [ ] **Passo 6: Conferir que os três arquivos são os do protótipo**

Rode: `sha256sum sql/link/vendas.sql sql/link/cadastros.sql sql/link/gravar.sql; wc -l sql/link/vendas.sql sql/link/cadastros.sql sql/link/gravar.sql`
Saída esperada:
```
63dd1054e9c7e792073d65e11fa46d4843da0ad7c544007718d306915a3f6563 *sql/link/vendas.sql
d7a9a8dd32910c8ea682c505da82cb698f0393328f1accbd86c49be9900c7751 *sql/link/cadastros.sql
ea0d6db4b18ae369d67ad38738b44cea53be8c7d1e86b158667e0941f043f1b4 *sql/link/gravar.sql
  100 sql/link/vendas.sql
   74 sql/link/cadastros.sql
   83 sql/link/gravar.sql
  257 total
```
Um hash diferente quer dizer que o arquivo não é o do protótipo (uma linha a mais, um espaço, CRLF): refaça o arquivo a partir do bloco do passo.

- [ ] **Passo 7: Acrescentar `traduzirLink` a `tradutor/link.mts`**

Duas peças. No topo, o import de `emTransacao`, logo acima do `import type { Cliente }` que já existe:

```ts
import { emTransacao } from './banco.mts'
```

E, depois de `ligarLink`, no fim do arquivo:

```ts
// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    return contagens as unknown as ContagensLink
  })
}
```

O arquivo inteiro fica assim no fim desta tarefa (a tarefa 5 põe `'caixa'` em `FAMILIAS`, a 6 põe `'contas', 'notas'`, e a 7 acrescenta as conferências de saída depois do `gravar`, `resumoLink`, `principalLink` e o `import.meta.main`). Esta tarefa só acrescenta as duas peças acima: se um comentário das partes das tarefas 2 e 3 estiver escrito diferente no repositório, fica o do repositório.

```ts
// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// Os arquivos de sql/link têm vários comandos; o pg devolve um resultado por comando, e o que importa é o do último.
async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>> {
  const resultado = (await cliente.query(lerSql(`link/${nome}.sql`))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}

// Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
export async function ligarLink(cliente: Cliente): Promise<void> {
  await rodar(cliente, 'preparar')
  const invalidas = await rodar(cliente, 'ligar')
  if (invalidas.length > 0) {
    const lista = invalidas.map((l) => `${l.entidade} ${l.codigo_origem} → ${l.codigo_kaizen}`).join(', ')
    throw new ErroLink(`decisão da de_para aponta para código que não existe no ERP novo: ${lista}`)
  }
}

// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    return contagens as unknown as ContagensLink
  })
}
```

- [ ] **Passo 8: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-vendas.test.mts`
Saída esperada: passa, com `ℹ pass 11`, `ℹ fail 0` e:
```
✔ a venda de junho 1992 vira pedido emitido, de saída, que recebe, com o cliente e o vendedor do ERP novo
✔ valor do item: meio-par no item e rateio do desconto da negociação sem arredondar (1992 soma 150,00)
✔ empate de meio centavo no item vai para o par (392, 3613 e 5061)
✔ acréscimo da negociação entra no rateio (2492)
✔ devolução 1095: itens de entrada sem arredondar, com o vendedor da troca
✔ venda cancelada fica cancelado, e o orçamento fica emitido pelo modelo com itens de sentido N
✔ Pix e débito na mesma venda (556), com a forma traduzida
✔ vale gerado e usado, dinheiro devolvido, bonificação e resto do vale: os pagamentos somam venda − devolução
✔ a falha vira link:<código> no documento, no cadastro fonte link e na de_para
✔ uma decisão nova na de_para vale na rodada seguinte e tira a falha
✔ rodar duas vezes deixa o mesmo conteúdo, com os mesmos id e visto_em, e o documento que sumiu da Link sai
```

- [ ] **Passo 9: Atualizar `testes-esperados.txt` (N = 11)**

Esta tarefa acrescentou 11 `test(` (todos em `tradutor/link-vendas.test.mts`). Some ao número atual: 296 + 11 = 307. O arquivo fica com uma única linha:

```text
307
```

- [ ] **Passo 10: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 307 testes com ✔ (os das tarefas 1 a 3 continuam passando: esta tarefa não mexe no `preparar.sql` nem no `ligar.sql`); última linha `rodou 307 testes, esperados 307`.

- [ ] **Passo 11: Commit**

```bash
git add sql/link/vendas.sql sql/link/cadastros.sql sql/link/gravar.sql tradutor/link.mts tradutor/link-vendas.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Vendas da Link no Kaizen, na forma do pedido do ERP novo

O comando da Link passa a gravar no Kaizen as vendas e os orçamentos da
Link com o mesmo tipo, situação, movimento e financeiro do ERP novo, e com
o cliente, o produto e o vendedor nos códigos do cadastro novo. Nos 16
casos reais da cópia antiga:

- a venda de junho 1992 soma 150,00, como a Link gravou; os três empates
  de meio centavo (392, 3613 e 5061) dão 129,72, 507,00 e 230,00, onde o
  arredondamento comum daria 129,73, 507,01 e 230,01;
- a devolução da 1095 fica em 67,764 sem arredondar e fecha com os 67,77
  da Link arredondando linha a linha;
- os pagamentos (Pix, cartão, dinheiro devolvido, vale gerado e usado,
  bonificação) somam venda menos devolução em 13 das 14 vendas válidas;
  a exceção é a 100, cujo troco de R$ 0,01 a Link não grava;
- o que não liga ao cadastro novo (o cliente 1, os produtos 1993 e 2396 e
  o vendedor Sistema) vira link:<código> no documento, no cadastro e na
  de_para, e uma decisão nova na de_para vale na rodada seguinte.

Rodar duas vezes deixa tudo igual, com os mesmos documentos, e a venda
que some da Link sai do Kaizen. Testes: rodou 307, esperados 307.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 307 testes, esperados 307`; o commit sai.

Depois deste commit, o orquestrador pede a revisão da branch inteira, antes da tarefa 5.


### Tarefa 5: Caixa: fechamentos, sangrias e suprimentos

**O que esta tarefa entrega, em resultado:** o turno de caixa da Link entra no Kaizen na forma do ERP novo. Cada fechamento de caixa vira um documento `fechamento_caixa`, emitido, sem movimento nem financeiro, com a conferência às cegas numa linha por forma (dinheiro, pix, cartão e nota promissória sempre; cheque e boleto só quando não são zero, o que na Link nunca acontece), o calculado e o informado como a Link gravou, e o turno com o usuário do ERP novo do operador. Cada sangria e cada suprimento vira um documento (`sangria`, que paga; `suprimento`, sem financeiro) com um pagamento em dinheiro do valor do lançamento. Nos casos da cópia antiga: o fechamento 7, do Caio, fica com o usuário 18152 do ERP novo e mostra no pix R$ 922,38 calculados contra R$ 817,38 informados; o fechamento 1, do Sistema, fica sem usuário e com o informado vazio nas quatro formas; o turno 3, ainda aberto, fica sem `fechado_em`; as sangrias 91 (R$ 50,00) e 31 (R$ 6,00) e o suprimento 12 (R$ 171,50) entram com o pagamento em dinheiro. São 6 documentos, 12 linhas de conferência e 3 pagamentos a mais nos casos, e 3 testes novos.

**Arquivos:**
- Criar: `sql/link/caixa.sql` (do protótipo, sem mudar nada)
- Modificar: `tradutor/link.mts` (só a linha do `FAMILIAS`: passa de `['vendas']` a `['vendas', 'caixa']`)
- Testar: `tradutor/link-caixa.test.mts`
- Modificar: `testes-esperados.txt` (de `307` para `310`)

**Interfaces:**
- Consome (Tarefa 3, `sql/link/preparar.sql` e `sql/link/ligar.sql`), dentro da transação do comando:
  - `pg_temp.link_liga (entidade, codigo_origem, codigo_kaizen, como)`, com uma linha por `erp.usuario` na entidade `funcionario` (código da Link = `id_usuario`). Nos casos: `1` Sistema → `link:1` (falha), `5` Débora → `999005`, `6` Caio → `1`, `9` Neide → `999006`.
  - As temporárias que esta tarefa enche: `pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario integer)`, `pg_temp.link_conferencia (doc_tabela, doc_id, origem_tabela, origem_id, forma, calculado, informado)` e `pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)`.
- Consome (Tarefa 4, `tradutor/link.mts`): `traduzirLink(cliente)`, que roda `preparar` → `ligar` → cada arquivo de `FAMILIAS` → `cadastros` → `gravar` numa transação e devolve `ContagensLink`. O `gravar.sql` da tarefa 4 já grava `link_doc` em `kaizen.documento`, `link_conferencia` em `kaizen.conferencia_caixa` e `link_pagamento` em `kaizen.documento_pagamento`: esta tarefa não mexe nele.
- Consome (Tarefa 1): em `kaizen.traducao`, fonte `link`, as linhas de `caixa_fechamento`, `Sangria/true`, `Sangria/false` e `Suprimento/true` (tipo, situação pelo modelo, movimento e financeiro pelo modelo) e as formas `1.1.1.01` → `dinheiro`, `dinheiro`, `pix`, `cartao` e `nota_promissoria` → `troca`; e a visão `kaizen.documento_negocio` com a situação pelo modelo.
- Consome (Tarefa 2, `tradutor/link-falsa.mts` e `tradutor/link-casos.json`): `criarLinkFalsa`, `carregarCasosLink`, e nos casos os fechamentos 1 (usuário 1, tudo zero, informado vazio), 3 (usuário 5, sem `data_hora`, informado vazio) e 7 (usuário 6, com os informados), os lançamentos 12 (`Suprimento`, orientação verdadeira, R$ 171,50), 31 (`Sangria`, falsa, R$ 6,00) e 91 (`Sangria`, verdadeira, R$ 50,00), e no cadastro do ERP novo os funcionários `1` Caio Mendes Rocha (usuário 18152) e `999005` Debora Fonseca Lima (usuário 18153). As colunas que `caixa.sql` lê do `erp` já estão em `sql/link/colunas-esperadas.txt` (o passo 4 confere).
- Produz: `sql/link/caixa.sql`, a família `caixa`, que `traduzirLink` passa a rodar depois de `vendas`. Nos casos, as contagens de `traduzirLink` passam de 16 para 22 documentos, de 19 para 22 pagamentos e de 0 para 12 conferências (itens, parcelas e baixas não mudam).
- `testes-esperados.txt` passa de `307` para `310`.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, no Git Bash, na branch `fase-3`, com as tarefas 1 a 4 já commitadas (`cat testes-esperados.txt` mostra `307`) e o Postgres local no ar (`docker compose up -d --wait`). O `caixa.sql` é o do protótipo, provado contra a cópia antiga: copie o bloco inteiro, sem mudar nem uma letra, em LF, terminando com `;` e uma quebra de linha (o passo 4 confere pelo sha256). Cada teste chama `traduzirLink` no começo, que roda duas vezes sem duplicar, então a ordem dos testes não importa. O único teste que muda alguma coisa é o 1: primeiro põe R$ 10 de cheque no fechamento 7 da Link falsa (pela `LinkFalsa.executar`), para ver o cheque entrar; depois põe o usuário do funcionário 1 do ERP novo em zero, no Kaizen. Ele desfaz cada mudança no `finally` e roda `traduzirLink` de novo, para os outros testes verem os casos como vieram. Commits no Git Bash.

- [ ] **Passo 1: Escrever o teste do caixa**

Crie `tradutor/link-caixa.test.mts`. Os valores esperados são os de `casos-esperados.json` do protótipo, conferidos rodando `preparar`, `ligar`, `vendas`, `caixa`, `cadastros` e `gravar` sobre a Link falsa dos casos e lendo o resultado pelo `tradutor/banco.mts` (é assim que os números chegam como texto e o `turno_usuario`, que é `integer`, como número).

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

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

// Os documentos da Link gravados no Kaizen, com as colunas cruas e a tradução da visão documento_negocio.
async function documentos(onde: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await banco.cliente.query(`
    select d.origem_tabela, d.origem_id, d.codigo, d.modelo, d.status, d.movimento, d.financeiro, d.criado_em, d.fechado_em,
           d.pessoa, d.turno_caixa, d.turno_usuario, d.turno_numero,
           n.tipo, n.situacao, n.movimento as movimento_traduzido, n.financeiro as financeiro_traduzido
      from kaizen.documento d
      join kaizen.documento_negocio n on n.id = d.id
     where d.fonte = 'link' and ${onde}
     order by d.criado_em`)
  return rows
}

// As linhas de conferência dos fechamentos da Link, com a forma traduzida.
async function conferencias(onde: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await banco.cliente.query(`
    select c.origem_tabela, c.origem_id, c.forma, t.valor as forma_traduzida, c.calculado, c.informado
      from kaizen.conferencia_caixa c
      join kaizen.documento d on d.id = c.documento_id
      left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = c.forma
     where d.fonte = 'link' and d.origem_tabela = 'caixa_fechamento' and ${onde}
     order by c.origem_id collate "C"`)
  return rows
}

test('fechamento 7: uma linha de conferência por forma, com calculado e informado, e o turno com o usuário do ERP novo', async () => {
  await traduzirLink(banco.cliente)
  assert.deepEqual(await documentos(`d.origem_tabela = 'caixa_fechamento' and d.origem_id = '7'`), [
    {
      origem_tabela: 'caixa_fechamento', origem_id: '7', codigo: '7', modelo: 'caixa_fechamento', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 13:42:21.195448', fechado_em: '2026-04-13 17:59:58.613109',
      pessoa: null, turno_caixa: null, turno_usuario: 18152, turno_numero: null,
      tipo: 'fechamento_caixa', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
  ])
  // O operador do turno 7 é o usuário 6 da Link (Caio), ligado pelo primeiro nome ao funcionário 1 do ERP novo:
  // o turno_usuario é o usuário desse funcionário no ERP novo, não o código da Link.
  const operador = await banco.cliente.query(`
    select f.codigo, f.nome
      from kaizen.documento d
      join kaizen.funcionario f on f.fonte = 'meuerp' and f.usuario = d.turno_usuario
     where d.fonte = 'link' and d.origem_tabela = 'caixa_fechamento' and d.origem_id = '7'`)
  assert.deepEqual(operador.rows, [{ codigo: '1', nome: 'Caio Mendes Rocha' }])
  // Quatro formas, na forma do ERP novo (a nota promissória é troca). Cheque e boleto são zero no calculado e no
  // informado, e não entram. O pix fica como a Link gravou: 922,38 calculados, 817,38 informados.
  assert.deepEqual(await conferencias(`d.origem_id = '7'`), [
    { origem_tabela: 'caixa_fechamento', origem_id: '7/cartao', forma: 'cartao', forma_traduzida: 'cartao', calculado: '503.15', informado: '503.15' },
    { origem_tabela: 'caixa_fechamento', origem_id: '7/dinheiro', forma: 'dinheiro', forma_traduzida: 'dinheiro', calculado: '206.50', informado: '206.50' },
    { origem_tabela: 'caixa_fechamento', origem_id: '7/nota_promissoria', forma: 'nota_promissoria', forma_traduzida: 'troca', calculado: '0.00', informado: '0.00' },
    { origem_tabela: 'caixa_fechamento', origem_id: '7/pix', forma: 'pix', forma_traduzida: 'pix', calculado: '922.38', informado: '817.38' },
  ])
  // Com R$ 10 de cheque calculado no fechamento 7, o cheque entra, com o informado zero como a Link gravou; o boleto,
  // ainda zero nos dois, continua fora.
  await falsa.executar('update erp.caixa_fechamento set cheque = 10 where id_caixa_fechamento = 7')
  try {
    await traduzirLink(banco.cliente)
    assert.deepEqual(await conferencias(`c.origem_id in ('7/cheque', '7/boleto')`), [
      { origem_tabela: 'caixa_fechamento', origem_id: '7/cheque', forma: 'cheque', forma_traduzida: 'cheque', calculado: '10', informado: '0.00' },
    ])
  } finally {
    await falsa.executar('update erp.caixa_fechamento set cheque = 0.00 where id_caixa_fechamento = 7')
    await traduzirLink(banco.cliente)
  }
  // Funcionário do ERP novo sem usuário (zero): o turno fica vazio, e não zero.
  await banco.cliente.query(`update kaizen.funcionario set usuario = 0 where fonte = 'meuerp' and codigo = '1'`)
  try {
    await traduzirLink(banco.cliente)
    const semUsuario = await banco.cliente.query(
      `select turno_usuario from kaizen.documento where fonte = 'link' and origem_tabela = 'caixa_fechamento' and origem_id = '7'`,
    )
    assert.deepEqual(semUsuario.rows, [{ turno_usuario: null }])
  } finally {
    await banco.cliente.query(`update kaizen.funcionario set usuario = 18152 where fonte = 'meuerp' and codigo = '1'`)
    await traduzirLink(banco.cliente)
  }
})

test('fechamento 1 com informado vazio e operador Sistema, e o turno aberto 3 sem fechado_em', async () => {
  await traduzirLink(banco.cliente)
  // O operador do fechamento 1 é o usuário 1 da Link, o Sistema, que não existe no ERP novo.
  const operador = await banco.cliente.query(`
    select u.id_usuario, u.nome
      from erp.caixa_fechamento f
      join erp.usuario u on u.id_usuario = f.id_usuario
     where f.id_caixa_fechamento = 1`)
  assert.deepEqual(operador.rows, [{ id_usuario: '1', nome: 'Sistema' }])
  // A ligação do Sistema falha, e o turno fica sem usuário: não vira o 18152 do funcionário 1 do ERP novo (o Caio).
  // O turno 3 é da Débora (usuário 5 da Link, 999005 no ERP novo, usuário 18153), e ainda estava aberto na cópia.
  assert.deepEqual(await documentos(`d.origem_tabela = 'caixa_fechamento' and d.origem_id in ('1', '3')`), [
    {
      origem_tabela: 'caixa_fechamento', origem_id: '1', codigo: '1', modelo: 'caixa_fechamento', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-11 18:53:16.892942', fechado_em: '2026-04-11 19:28:54.133281',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'fechamento_caixa', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
    {
      origem_tabela: 'caixa_fechamento', origem_id: '3', codigo: '3', modelo: 'caixa_fechamento', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 08:10:56.864944', fechado_em: null,
      pessoa: null, turno_caixa: null, turno_usuario: 18153, turno_numero: null,
      tipo: 'fechamento_caixa', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
  ])
  // Nos dois, as quatro formas com o calculado zero e o informado vazio (e não zero), como a Link gravou.
  const formas = [['cartao', 'cartao'], ['dinheiro', 'dinheiro'], ['nota_promissoria', 'troca'], ['pix', 'pix']]
  const vazias = (fechamento: string) =>
    formas.map(([forma, traduzida]) => ({
      origem_tabela: 'caixa_fechamento', origem_id: `${fechamento}/${forma}`, forma, forma_traduzida: traduzida,
      calculado: '0.00', informado: null,
    }))
  assert.deepEqual(await conferencias(`d.origem_id in ('1', '3')`), [...vazias('1'), ...vazias('3')])
})

test('sangria das duas orientações e suprimento: tipo, financeiro e um pagamento em dinheiro do valor do lançamento', async () => {
  await traduzirLink(banco.cliente)
  // Só os lançamentos com obs Sangria ou Suprimento: os da venda, a bonificação 790 e as contas não viram sangria.
  // O modelo cru é a obs e a orientação; a sangria paga, nas duas orientações, e o suprimento não tem financeiro.
  assert.deepEqual(await documentos(`n.tipo in ('sangria', 'suprimento')`), [
    {
      origem_tabela: 'pc_lancamento', origem_id: '12', codigo: '12', modelo: 'Suprimento/true', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 08:33:04.221284', fechado_em: '2026-04-13 08:33:04.221284',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'suprimento', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
    {
      origem_tabela: 'pc_lancamento', origem_id: '31', codigo: '31', modelo: 'Sangria/false', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 10:06:59.277768', fechado_em: '2026-04-13 10:06:59.277768',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'sangria', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
    {
      origem_tabela: 'pc_lancamento', origem_id: '91', codigo: '91', modelo: 'Sangria/true', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 16:37:51.594194', fechado_em: '2026-04-13 16:37:51.594194',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'sangria', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
  ])
  // Um pagamento por lançamento, o próprio lançamento, em dinheiro (1.1.1.01, o caixa), com o valor dele.
  const pagamentos = await banco.cliente.query(`
    select d.origem_id as documento, p.origem_tabela, p.origem_id, p.forma, t.valor as forma_traduzida, p.valor
      from kaizen.documento_pagamento p
      join kaizen.documento d on d.id = p.documento_id
      join kaizen.documento_negocio n on n.id = d.id
      left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = p.forma
     where d.fonte = 'link' and n.tipo in ('sangria', 'suprimento')
     order by d.criado_em`)
  assert.deepEqual(pagamentos.rows, [
    { documento: '12', origem_tabela: 'pc_lancamento', origem_id: '12', forma: '1.1.1.01', forma_traduzida: 'dinheiro', valor: '171.50' },
    { documento: '31', origem_tabela: 'pc_lancamento', origem_id: '31', forma: '1.1.1.01', forma_traduzida: 'dinheiro', valor: '6.00' },
    { documento: '91', origem_tabela: 'pc_lancamento', origem_id: '91', forma: '1.1.1.01', forma_traduzida: 'dinheiro', valor: '50.00' },
  ])
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-caixa.test.mts`
Saída esperada: falha, com `ℹ pass 0` e `ℹ fail 3`. O `traduzirLink` da tarefa 4 roda sem erro, mas ainda só com a família `vendas`: o Kaizen não tem nenhum fechamento, sangria ou suprimento da Link. Cada teste falha na primeira leitura de `documentos` com `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:` e `+ []` do lado do `actual` (no teste 2, a leitura do operador na Link falsa passa antes, porque o fechamento 1 do Sistema está nos casos).

- [ ] **Passo 3: Criar `sql/link/caixa.sql`**

São quatro comandos, que enchem as temporárias da transação; quem grava no Kaizen é o `gravar.sql` da tarefa 4.
1. Um documento por `caixa_fechamento`: o modelo cru é `caixa_fechamento`, `criado_em` é a abertura e `fechado_em` o fechamento (vazio no turno aberto). O `turno_usuario` vem do funcionário do ERP novo ligado ao operador (`link_liga`, entidade `funcionario`); fica vazio se a ligação falhou (o `left join` com `kaizen.funcionario` fonte `meuerp` não acha o `link:1`) ou se o funcionário não tem usuário (`nullif(..., 0)`).
2. A conferência às cegas: uma linha por forma, com `origem_id` = o id, uma barra e a forma (`7/pix`); cheque e boleto só entram quando o calculado ou o informado não é zero. O recontado não entra (decisão 2 do `FONTES.md`).
3. Um documento por lançamento com `obs` `Sangria` ou `Suprimento`: o modelo cru é a `obs` e a orientação (`Sangria/true`, `Sangria/false`, `Suprimento/true`), e as duas datas são a `data_emissao`.
4. O pagamento de cada um desses lançamentos: o próprio lançamento, na forma `1.1.1.01` (a conta do caixa, que a tradução leva a `dinheiro`), com o `valor` dele.

Crie `sql/link/caixa.sql` com exatamente este conteúdo:

```sql
-- Fechamento de caixa: o turno aberto fica sem fechado_em. O turno_usuario é o usuário do ERP novo
-- do funcionário ligado; fica vazio se a ligação falhou ou se o funcionário não tem usuário (zero).
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'caixa_fechamento', f.id_caixa_fechamento::text,
  f.id_caixa_fechamento::text,
  'caixa_fechamento',
  null,
  f.data_hora_abertura, f.data_hora,
  null,
  nullif(fu.usuario, 0)
from erp.caixa_fechamento f
left join pg_temp.link_liga lf on lf.entidade = 'funcionario' and lf.codigo_origem = f.id_usuario::text
left join kaizen.funcionario fu on fu.fonte = 'meuerp' and fu.codigo = lf.codigo_kaizen;

-- Conferência às cegas: dinheiro, pix, cartão e nota promissória sempre; cheque e boleto só quando não são zero.
-- O recontado não entra.
insert into pg_temp.link_conferencia (doc_tabela, doc_id, origem_tabela, origem_id, forma, calculado, informado)
select
  'caixa_fechamento', f.id_caixa_fechamento::text,
  'caixa_fechamento', f.id_caixa_fechamento::text || '/' || v.forma,
  v.forma, v.calculado, v.informado
from erp.caixa_fechamento f
cross join lateral (values
  ('dinheiro', f.dinheiro, f.dinheiro_informado),
  ('pix', f.pix, f.pix_informado),
  ('cartao', f.cartao, f.cartao_informado),
  ('nota_promissoria', f.nota_promissoria, f.nota_promissoria_informado),
  ('cheque', f.cheque, f.cheque_informado),
  ('boleto', f.boleto, f.boleto_informado)
) as v (forma, calculado, informado)
where v.forma not in ('cheque', 'boleto')
   or coalesce(v.calculado, 0) <> 0
   or coalesce(v.informado, 0) <> 0;

-- Sangria e suprimento: o modelo cru é a obs e a orientação; o próprio lançamento é o pagamento em dinheiro.
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'pc_lancamento', l.id_pc_lancamento::text,
  l.id_pc_lancamento::text,
  l.obs || '/' || l.orientacao::text,
  null,
  l.data_emissao, l.data_emissao,
  null,
  null
from erp.pc_lancamento l
where l.obs in ('Sangria', 'Suprimento');

insert into pg_temp.link_pagamento (doc_tabela, doc_id, origem_tabela, origem_id, forma, valor)
select
  'pc_lancamento', l.id_pc_lancamento::text,
  'pc_lancamento', l.id_pc_lancamento::text,
  '1.1.1.01',
  l.valor
from erp.pc_lancamento l
where l.obs in ('Sangria', 'Suprimento');
```

- [ ] **Passo 4: Conferir o arquivo SQL**

Rode (Git Bash): `sha256sum sql/link/caixa.sql; grep -c $'\r' sql/link/caixa.sql; wc -l sql/link/caixa.sql`
Saída esperada:
```
9cb35c45d8aec114f24346a5e21a195ea9e599d118f08b5b6ff6045c4cbdf753 *sql/link/caixa.sql
0
56 sql/link/caixa.sql
```
Um hash diferente quer dizer que o arquivo não é o do protótipo (uma linha mudada, CRLF no lugar de LF, falta da quebra de linha no fim): corrija copiando o bloco de novo até bater; não mude o conteúdo.

Rode (Git Bash): `for par in 'caixa_fechamento id_caixa_fechamento' 'caixa_fechamento id_usuario' 'caixa_fechamento data_hora_abertura' 'caixa_fechamento data_hora' 'caixa_fechamento dinheiro' 'caixa_fechamento dinheiro_informado' 'caixa_fechamento pix' 'caixa_fechamento pix_informado' 'caixa_fechamento cartao' 'caixa_fechamento cartao_informado' 'caixa_fechamento nota_promissoria' 'caixa_fechamento nota_promissoria_informado' 'caixa_fechamento cheque' 'caixa_fechamento cheque_informado' 'caixa_fechamento boleto' 'caixa_fechamento boleto_informado' 'pc_lancamento id_pc_lancamento' 'pc_lancamento obs' 'pc_lancamento orientacao' 'pc_lancamento data_emissao' 'pc_lancamento valor'; do grep -c "^$par " sql/link/colunas-esperadas.txt; done | tr '\n' ' '`
Saída esperada: `1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ` (vinte e um `1`: cada coluna do `erp` que `caixa.sql` lê está na lista uma vez; a Link falsa só tem as colunas da lista, e a conferência de entrada do comando para se uma delas faltar na cópia).

- [ ] **Passo 5: Pôr a família `caixa` em `tradutor/link.mts`**

Uma linha muda: o `FAMILIAS` da tarefa 4 ganha `'caixa'`, depois de `'vendas'` (a ordem da rodada é `vendas` → `caixa` → `contas` → `notas`, e o `cadastros` vem depois de todas, porque junta o que elas citam).

Antes (tarefa 4):
```ts
const FAMILIAS = ['vendas']
```
Depois:
```ts
const FAMILIAS = ['vendas', 'caixa']
```

O trecho de `FAMILIAS` a `traduzirLink` fica assim:
```ts
// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas', 'caixa']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    return contagens as unknown as ContagensLink
  })
}
```

O arquivo inteiro fica assim no fim desta tarefa. Ele é o da tarefa 4 com a linha do `FAMILIAS` trocada; se o texto de algum comentário da tarefa 4 estiver diferente do que vai abaixo, fica o da tarefa 4: esta tarefa só muda aquela linha.

```ts
// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// Os arquivos de sql/link têm vários comandos; o pg devolve um resultado por comando, e o que importa é o do último.
async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>> {
  const resultado = (await cliente.query(lerSql(`link/${nome}.sql`))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}

// Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
export async function ligarLink(cliente: Cliente): Promise<void> {
  await rodar(cliente, 'preparar')
  const invalidas = await rodar(cliente, 'ligar')
  if (invalidas.length > 0) {
    const lista = invalidas.map((l) => `${l.entidade} ${l.codigo_origem} → ${l.codigo_kaizen}`).join(', ')
    throw new ErroLink(`decisão da de_para aponta para código que não existe no ERP novo: ${lista}`)
  }
}

// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas', 'caixa']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    return contagens as unknown as ContagensLink
  })
}
```

Rode (Git Bash): `git diff --stat tradutor/link.mts; git diff tradutor/link.mts | grep '^[-+][^-+]'`
Saída esperada:
```
 tradutor/link.mts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
-const FAMILIAS = ['vendas']
+const FAMILIAS = ['vendas', 'caixa']
```

- [ ] **Passo 6: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-caixa.test.mts`
Saída esperada: passa, com `ℹ pass 3`, `ℹ fail 0` e:
```
✔ fechamento 7: uma linha de conferência por forma, com calculado e informado, e o turno com o usuário do ERP novo
✔ fechamento 1 com informado vazio e operador Sistema, e o turno aberto 3 sem fechado_em
✔ sangria das duas orientações e suprimento: tipo, financeiro e um pagamento em dinheiro do valor do lançamento
```

- [ ] **Passo 7: Atualizar `testes-esperados.txt` (N = 3)**

Esta tarefa acrescentou 3 `test(` (todos em `tradutor/link-caixa.test.mts`). Some ao número atual: 307 + 3 = 310. O arquivo fica com uma única linha:

```text
310
```

- [ ] **Passo 8: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 310 testes com ✔ (os 11 de `tradutor/link-vendas.test.mts` da tarefa 4 continuam passando: a família `caixa` só acrescenta documentos de `caixa_fechamento` e de lançamentos de sangria e suprimento, e não toca nas negociações); última linha `rodou 310 testes, esperados 310`.

- [ ] **Passo 9: Commit**

```bash
git add sql/link/caixa.sql tradutor/link.mts tradutor/link-caixa.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Link: fechamentos de caixa, sangrias e suprimentos entram no Kaizen

Cada fechamento de caixa da Link vira um documento de fechamento de caixa,
emitido, com a conferência às cegas numa linha por forma (dinheiro, pix,
cartão e nota promissória; cheque e boleto só quando não são zero), o
calculado e o informado como a Link gravou, e o turno com o usuário do ERP
novo de quem operou o caixa.

Nos casos da cópia antiga: o fechamento 7, do Caio, fica com o usuário
18152 do ERP novo e mostra no pix R$ 922,38 calculados contra R$ 817,38
informados; o fechamento 1, do Sistema, fica sem usuário e com o informado
vazio; o turno 3, ainda aberto, fica sem data de fechamento. As sangrias 91
(R$ 50,00) e 31 (R$ 6,00), das duas orientações, pagam; o suprimento 12
(R$ 171,50) não tem financeiro; cada um tem um pagamento em dinheiro do
valor do lançamento. Testes: rodou 310, esperados 310.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 310 testes, esperados 310`; o commit sai.


### Tarefa 6: Contas a pagar e notas de entrada

**O que esta tarefa entrega, em resultado:** as contas a pagar e as notas de entrada da Link entram no Kaizen na forma do ERP novo. Cada conta vira um documento `conta_pagar`, emitido, sem movimento, que paga, com o fornecedor do cadastro novo, as parcelas (dia do lançamento, vencimento, valor, baixada ou pendente) e as baixas (o dia em que outro lançamento pagou a parcela, o valor e o banco de onde o dinheiro saiu). Cada nota de entrada vira um documento `nota_entrada`, emitido, de entrada, sem financeiro, com o fornecedor ligado e os itens da compra na unidade do estoque: sentido de entrada quando a entrada foi concluída, nenhum quando não foi. Nos casos da cópia antiga: a conta 1396 (R$ 10.031,64 em três parcelas de R$ 3.343,88) fica com o FORNECEDOR 7, que vem pela compra 5 e não pela fonte; duas parcelas foram baixadas em 26/05, pelo banco, e a de 29/05 está pendente. A conta 8396 (cinco parcelas de R$ 100,00, duas baixadas) é do FORNECEDOR PADRÃO, que não tem CNPJ: ele vira `link:900001` no documento, no cadastro do Kaizen e na `de_para`. A bonificação 790 (R$ 60,00, conta 2.1.2.03) não vira conta: é crédito dado ao cliente, e o uso dela continua como pagamento da venda 358, na forma troca. A nota 15 tem 40 unidades de entrada; a 58, cuja entrada não foi concluída, 5 unidades que não mexem no estoque. Na cópia antiga inteira, o protótipo deste mesmo SQL deu 88 contas, 221 parcelas (R$ 625.935,51), das quais 94 pendentes (R$ 245.864,76, o total que a migração levou ao ERP novo), 127 baixas (R$ 380.070,75) e 51 notas com 530 itens; a tarefa 9 confere. São 4 testes novos.

**Arquivos:**
- Criar: `sql/link/contas.sql` (do protótipo, sem mudar nada)
- Criar: `sql/link/notas.sql` (do protótipo, sem mudar nada)
- Modificar: `tradutor/link.mts` (só a linha do `FAMILIAS`: passa de `['vendas', 'caixa']` a `['vendas', 'caixa', 'contas', 'notas']`)
- Testar: `tradutor/link-contas.test.mts`
- Modificar: `testes-esperados.txt` (de `310` para `314`)

**Interfaces:**
- Consome (Tarefa 3, `sql/link/preparar.sql` e `sql/link/ligar.sql`), dentro da transação do comando:
  - `pg_temp.link_liga (entidade, codigo_origem, codigo_kaizen, como)`: na entidade `pessoa`, cada fornecedor com o código da Link + 900000 (nos casos, `900001` → `link:900001`, falha; `900007`, `900009` e `900014` → os mesmos códigos do ERP novo, pelo CNPJ); na entidade `produto`, o `produto_codigo` (nos casos, `2889` e `5262` ligam pelo código).
  - As temporárias que esta tarefa enche: `pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)`, `pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)`, `pg_temp.link_parcela (doc_tabela, doc_id, origem_tabela, origem_id, lancado_em date, vencimento date, valor, status, descricao)` e `pg_temp.link_baixa (doc_tabela, doc_id, parcela_origem_id, origem_tabela, origem_id, pago_em date, valor, forma, status)`.
- Consome (Tarefa 4, `tradutor/link.mts` e `sql/link/`): `traduzirLink(cliente)`, que roda `preparar` → `ligar` → cada arquivo de `FAMILIAS` → `cadastros` → `gravar` numa transação e devolve `ContagensLink` (`{ documentos, novos, itens, pagamentos, conferencias, parcelas, baixas }`, cada um o texto de um `count(*)`). O `gravar.sql` já grava `link_item` em `kaizen.documento_item`, `link_parcela` em `kaizen.parcela` e `link_baixa` em `kaizen.baixa` (a baixa acha a parcela pelo documento e pela `parcela_origem_id`); o `cadastros.sql` já grava, com fonte `link`, a pessoa que falhou e que um documento cita, e refaz as falhas da `de_para`. Esta tarefa não mexe em nenhum dos dois.
- Consome (Tarefa 5): `FAMILIAS = ['vendas', 'caixa']` e o `caixa.sql`, que já põe na `link_doc` as sangrias e o suprimento com `origem_tabela = 'pc_lancamento'` e modelo `Sangria/...` ou `Suprimento/...`.
- Consome (Tarefa 1): em `kaizen.traducao`, fonte `link`: `tipo` `2.1.2.02`, `2.1.3.07`, `2.1.4.10`, `2.1.5.02` → `conta_pagar` e `55` → `nota_entrada`; `situacao_pelo_modelo` → `emitido` nos dois; `movimento_pelo_modelo` → `nenhum` nas contas e `entrada` no `55`; `financeiro_pelo_modelo` → `paga` nas contas e `nenhum` no `55`; `forma` `1.1.1.02.01` → `banco` e `2.1.2.03` → `troca`; `status_parcela` `false` → `pendente` e `true` → `baixada`; `status_baixa` `true` → `valida`; `sentido` `E` → `entrada` e `N` → `nenhum`. E a visão `kaizen.documento_negocio` com a situação pelo modelo.
- Consome (Tarefa 2, `tradutor/link-falsa.mts` e `tradutor/link-casos.json`): `criarLinkFalsa`, `carregarCasosLink`, e nos casos: os 10 lançamentos sem caixa (12, 31 e 91 do caixa; 790, a bonificação; 1396 e 8396, as contas; 2740, 2747, 9768 e 11284, que pagam parcelas das contas); as parcelas deles; as fontes (a da 1396 sem fornecedor e com `id_ped_entrada` 5; a 8400, da 8396, com o fornecedor 1; as 2740, 2747, 9772 e 11288, que apontam para as parcelas 1432, 1433, 8574 e 8575; a 791, uso da bonificação, que aponta para a parcela 814 da 790); as compras 5 (fornecedor 739), 12 (fornecedor 741, nota 15) e 50 (fornecedor 746, nota 58); os itens de compra 106 (compra 12, produto de código 2889, 40 unidades, entrada concluída) e 521 (compra 50, produto de código 5262, 5 unidades, entrada vazia); as notas 15 e 58; os fornecedores 1 (FORNECEDOR PADRÃO, sem CNPJ), 7, 9 e 14; e no cadastro do ERP novo as pessoas 900007, 900009 e 900014, com os CNPJs dos fornecedores 7, 9 e 14, e os produtos 2889 e 5262. As colunas que os dois arquivos leem do `erp` já estão em `sql/link/colunas-esperadas.txt` (o passo 5 confere).
- Produz: `sql/link/contas.sql` e `sql/link/notas.sql`, as famílias `contas` e `notas`, que `traduzirLink` passa a rodar depois de `caixa`. Nos casos, as contagens de `traduzirLink` passam de 22 para 26 documentos, de 55 para 57 itens, de 0 para 8 parcelas e de 0 para 4 baixas (pagamentos, 22, e conferências, 12, não mudam); a `de_para` passa de 4 para 5 falhas (entra `pessoa 900001 → link:900001`), e o cadastro fonte `link` ganha a pessoa `link:900001`. São os números finais dos casos (26 documentos, 57 itens, 22 pagamentos, 12 conferências, 8 parcelas, 4 baixas, 5 falhas).
- `testes-esperados.txt` passa de `310` para `314`.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, no Git Bash, na branch `fase-3`, com as tarefas 1 a 5 já commitadas (`cat testes-esperados.txt` mostra `310`) e o Postgres local no ar (`docker compose up -d --wait`). Os dois arquivos SQL são os do protótipo, provados contra a cópia antiga inteira: copie cada bloco inteiro, sem mudar nem uma letra, em LF, terminando com `;` e uma quebra de linha (o passo 5 confere pelo sha256). Cada teste chama `traduzirLink` no começo; o comando roda duas vezes sem duplicar, então a ordem dos testes não importa. Nenhum teste muda o Kaizen por fora do comando. Só o teste 2 muda a Link falsa (pela `LinkFalsa.executar`): tira o fornecedor da fonte 8400 da conta 8396 e põe `0001-01-01` no vencimento da parcela 8578, para ver a conta ficar sem pessoa, o FORNECEDOR PADRÃO sair da `de_para` e o vencimento virar vazio; no `finally`, devolve os dois valores e roda `traduzirLink` de novo. As consultas dos testes olham só as contas, as notas e a bonificação, e os testes das tarefas 4 e 5 olham só as negociações e o caixa: as duas famílias novas não quebram nenhum deles. Commits no Git Bash.

- [ ] **Passo 1: Escrever o teste das contas e das notas**

Crie `tradutor/link-contas.test.mts`. Os valores esperados são os de `casos-esperados.json` do protótipo, conferidos rodando `preparar`, `ligar`, `vendas`, `caixa`, `contas`, `notas`, `cadastros` e `gravar` sobre a Link falsa dos casos e lendo o resultado pelo `tradutor/banco.mts`: é assim que valores, datas e o `id` da Link (`bigint`) chegam como texto, o `ativo` e o `destino_positiva` (`boolean`) como `true`, e o `turno_usuario` (`integer`) como número ou `null`. Os testes 1 e 3 leem também a Link falsa (o `kaizen` tem leitura no `erp`), para mostrar de onde vem o que o Kaizen gravou.

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

// Cada teste roda o comando (ele é idempotente) e lê o que ficou no Kaizen. Nenhum muda o Kaizen por fora do comando; só
// o da conta 8396 muda a Link falsa, e no fim a devolve como era e roda o comando de novo. As consultas olham só as
// contas, as notas e a bonificação: as vendas e o caixa são das tarefas 4 e 5.

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

async function linhas(sql: string, parametros: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, parametros)).rows
}

// O documento como foi gravado, a pessoa dele no cadastro do Kaizen e o que a visão documento_negocio traduz.
async function documento(origemTabela: string, origemId: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select d.codigo, d.modelo, d.status, d.movimento, d.financeiro, d.criado_em, d.fechado_em, d.pessoa, d.turno_usuario,
            p.fonte as pessoa_fonte, p.nome as pessoa_nome,
            n.tipo, n.situacao, n.movimento as movimento_traduzido, n.financeiro as financeiro_traduzido
       from kaizen.documento d
       join kaizen.documento_negocio n on n.id = d.id
       left join kaizen.pessoa p on p.codigo = d.pessoa
      where d.fonte = 'link' and d.origem_tabela = $1 and d.origem_id = $2`,
    [origemTabela, origemId],
  )
}

// As parcelas de uma conta, com a situação traduzida.
async function parcelas(conta: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select pa.origem_tabela, pa.origem_id, pa.lancado_em, pa.vencimento, pa.valor, pa.status,
            t.valor as status_traduzido, pa.descricao
       from kaizen.parcela pa
       join kaizen.documento d on d.id = pa.documento_id
       left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'status_parcela' and t.codigo = pa.status
      where d.fonte = 'link' and d.origem_tabela = 'pc_lancamento' and d.origem_id = $1
      order by pa.origem_id collate "C"`,
    [conta],
  )
}

// As baixas das parcelas de uma conta, com a forma e a situação traduzidas.
async function baixas(conta: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select pa.origem_id as parcela, b.origem_tabela, b.origem_id, b.pago_em, b.valor,
            b.forma, tf.valor as forma_traduzida, b.status, ts.valor as status_traduzido
       from kaizen.baixa b
       join kaizen.parcela pa on pa.id = b.parcela_id
       join kaizen.documento d on d.id = pa.documento_id
       left join kaizen.traducao tf on tf.fonte = 'link' and tf.campo = 'forma' and tf.codigo = b.forma
       left join kaizen.traducao ts on ts.fonte = 'link' and ts.campo = 'status_baixa' and ts.codigo = b.status
      where d.fonte = 'link' and d.origem_tabela = 'pc_lancamento' and d.origem_id = $1
      order by pa.origem_id collate "C", b.origem_id collate "C"`,
    [conta],
  )
}

test('conta 1396: fornecedor pela compra, parcelas com vencimento e as baixas com o dia do lançamento que baixa, válidas e pelo banco', async () => {
  await traduzirLink(banco.cliente)
  // Na Link, a fonte do lançamento 1396 não tem fornecedor; ela aponta para a compra 5 (id_ped_entrada), que é do
  // fornecedor 7.
  assert.deepEqual(
    await linhas(
      `select f.id_fornecedor as fornecedor_da_fonte, f.id_ped_entrada as compra, fo.fornecedor_codigo as fornecedor_da_compra
         from erp.pc_lancamento_fonte f
         join erp.compra co on co.id_compra = f.id_ped_entrada
         join erp.fornecedor fo on fo.id_fornecedor = co.id_fornecedor
        where f.id_pc_lancamento = 1396`,
    ),
    [{ fornecedor_da_fonte: null, compra: '5', fornecedor_da_compra: '7' }],
  )
  // No Kaizen, a conta fica com o fornecedor 7 pelo CNPJ dele, que é o da pessoa 900007 do ERP novo. A conta de destino
  // das parcelas, 2.1.2.02, é o modelo.
  assert.deepEqual(await documento('pc_lancamento', '1396'), [
    {
      codigo: '1396', modelo: '2.1.2.02', status: null, movimento: null, financeiro: null,
      criado_em: '2026-05-06 21:12:21.765427', fechado_em: null, pessoa: '900007', turno_usuario: null,
      pessoa_fonte: 'meuerp', pessoa_nome: 'FORNECEDOR 7 LTDA',
      tipo: 'conta_pagar', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
  ])
  // Três parcelas de 3.343,88 (10.031,64 no total), lançadas no dia da conta, cada uma com o seu vencimento.
  // As duas primeiras foram baixadas; a de 29/05 está pendente.
  assert.deepEqual(await parcelas('1396'), [
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '1432', lancado_em: '2026-05-06', vencimento: '2026-05-15',
      valor: '3343.88', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '1433', lancado_em: '2026-05-06', vencimento: '2026-05-22',
      valor: '3343.88', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '1434', lancado_em: '2026-05-06', vencimento: '2026-05-29',
      valor: '3343.88', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
  ])
  // Cada baixa é a fonte de outro lançamento (2740 e 2747, os dois de 26/05) que aponta para a parcela: paga no dia desse
  // lançamento, e não no vencimento, pela conta de onde o dinheiro saiu (1.1.1.02.01, o Banco do Brasil).
  assert.deepEqual(await baixas('1396'), [
    {
      parcela: '1432', origem_tabela: 'pc_lancamento_fonte', origem_id: '2740', pago_em: '2026-05-26', valor: '3343.88',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
    {
      parcela: '1433', origem_tabela: 'pc_lancamento_fonte', origem_id: '2747', pago_em: '2026-05-26', valor: '3343.88',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
  ])
})

test('conta 8396: o FORNECEDOR PADRÃO vira link:900001, no documento, no cadastro e na de_para', async () => {
  await traduzirLink(banco.cliente)
  // A fonte do lançamento 8396 aponta direto para o fornecedor 1 da Link, o FORNECEDOR PADRÃO, que não tem CNPJ: nada
  // liga, e o código dele no Kaizen é link: seguido de 1 + 900000.
  assert.deepEqual(await documento('pc_lancamento', '8396'), [
    {
      codigo: '8396', modelo: '2.1.3.07', status: null, movimento: null, financeiro: null,
      criado_em: '2026-08-12 17:02:13.699394', fechado_em: null, pessoa: 'link:900001', turno_usuario: null,
      pessoa_fonte: 'link', pessoa_nome: 'FORNECEDOR PADRÃO',
      tipo: 'conta_pagar', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
  ])
  // No cadastro do Kaizen, com fonte link e só o que a Link sabe dele: o nome.
  assert.deepEqual(
    await linhas(
      `select codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo from kaizen.pessoa
        where fonte = 'link' and codigo = 'link:900001'`,
    ),
    [{ codigo: 'link:900001', nome: 'FORNECEDOR PADRÃO', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null, ativo: true }],
  )
  // Na de_para, as falhas de pessoa são o cliente 1 e o FORNECEDOR PADRÃO: os fornecedores 7, 9 e 14, das contas e das
  // notas, ligaram pelo CNPJ.
  assert.deepEqual(
    await linhas(
      `select entidade, codigo_origem, codigo_kaizen from kaizen.de_para
        where fonte = 'link' and entidade = 'pessoa' and codigo_kaizen like 'link:%'
        order by codigo_origem collate "C"`,
    ),
    [
      { entidade: 'pessoa', codigo_origem: '1', codigo_kaizen: 'link:1' },
      { entidade: 'pessoa', codigo_origem: '900001', codigo_kaizen: 'link:900001' },
    ],
  )
  // Cinco parcelas de 100,00, uma por mês: as de agosto e setembro baixadas, as de outubro a dezembro pendentes.
  assert.deepEqual(await parcelas('8396'), [
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8574', lancado_em: '2026-08-12', vencimento: '2026-08-20',
      valor: '100.00', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8575', lancado_em: '2026-08-12', vencimento: '2026-09-20',
      valor: '100.00', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8576', lancado_em: '2026-08-12', vencimento: '2026-10-20',
      valor: '100.00', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8577', lancado_em: '2026-08-12', vencimento: '2026-11-20',
      valor: '100.00', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8578', lancado_em: '2026-08-12', vencimento: '2026-12-20',
      valor: '100.00', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
  ])
  // As duas baixas: pelos lançamentos 9768 (31/08) e 11284 (22/09), pelo banco.
  assert.deepEqual(await baixas('8396'), [
    {
      parcela: '8574', origem_tabela: 'pc_lancamento_fonte', origem_id: '9772', pago_em: '2026-08-31', valor: '100.00',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
    {
      parcela: '8575', origem_tabela: 'pc_lancamento_fonte', origem_id: '11288', pago_em: '2026-09-22', valor: '100.00',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
  ])
  // Na Link falsa, a fonte 8400 da conta perde o fornecedor, e a parcela de dezembro ganha o vencimento 0001-01-01.
  await falsa.executar('update erp.pc_lancamento_fonte set id_fornecedor = null where id_pc_lancamento_fonte = 8400')
  await falsa.executar(`update erp.pc_lancamento_parcela set data_vencimento = '0001-01-01' where id_pc_lancamento_parcela = 8578`)
  try {
    await traduzirLink(banco.cliente)
    // Conta sem fornecedor fica sem pessoa, e o FORNECEDOR PADRÃO, que nenhum documento cita mais, sai da de_para.
    assert.deepEqual(
      await linhas(`select pessoa from kaizen.documento where fonte = 'link' and origem_tabela = 'pc_lancamento' and origem_id = '8396'`),
      [{ pessoa: null }],
    )
    assert.deepEqual(await linhas(`select entidade, codigo_kaizen from kaizen.de_para where fonte = 'link' and codigo_origem = '900001'`), [])
    // O vencimento 0001-01-01 vira vazio.
    assert.deepEqual(
      await linhas(`select origem_id, vencimento from kaizen.parcela where origem_tabela = 'pc_lancamento_parcela' and origem_id = '8578'`),
      [{ origem_id: '8578', vencimento: null }],
    )
  } finally {
    await falsa.executar('update erp.pc_lancamento_fonte set id_fornecedor = 1 where id_pc_lancamento_fonte = 8400')
    await falsa.executar(`update erp.pc_lancamento_parcela set data_vencimento = '2026-12-20' where id_pc_lancamento_parcela = 8578`)
    await traduzirLink(banco.cliente)
  }
})

test('a bonificação 790 (conta 2.1.2.03) não entra como conta', async () => {
  const contagens = await traduzirLink(banco.cliente)
  // Na Link, o lançamento 790 tem a forma de uma conta: sem caixa, com uma parcela positiva numa conta 2.x. Mas a conta
  // é a 2.1.2.03, a dos vales e bonificações: é crédito dado ao cliente, e crédito de cliente não é conta a pagar.
  assert.deepEqual(
    await linhas(
      `select l.id_caixa, pp.id_pc_lancamento_parcela as parcela, pp.pc_codigo_destino, pp.destino_positiva, pp.valor
         from erp.pc_lancamento l
         join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento = l.id_pc_lancamento
        where l.id_pc_lancamento = 790`,
    ),
    [{ id_caixa: null, parcela: '814', pc_codigo_destino: '2.1.2.03', destino_positiva: true, valor: '60.00' }],
  )
  // Os 10 lançamentos sem caixa dos casos: viram documento as 2 contas, as 2 sangrias e o suprimento. A bonificação não
  // vira, nem os 4 lançamentos que pagam parcelas das contas (2740, 2747, 9768 e 11284), que entram como baixas.
  assert.deepEqual(
    await linhas(
      `select l.id_pc_lancamento as lancamento, n.tipo
         from erp.pc_lancamento l
         left join kaizen.documento_negocio n
           on n.fonte = 'link' and n.origem_tabela = 'pc_lancamento' and n.origem_id = l.id_pc_lancamento::text
        where l.id_caixa is null
        order by l.id_pc_lancamento`,
    ),
    [
      { lancamento: '12', tipo: 'suprimento' },
      { lancamento: '31', tipo: 'sangria' },
      { lancamento: '91', tipo: 'sangria' },
      { lancamento: '790', tipo: null },
      { lancamento: '1396', tipo: 'conta_pagar' },
      { lancamento: '2740', tipo: null },
      { lancamento: '2747', tipo: null },
      { lancamento: '8396', tipo: 'conta_pagar' },
      { lancamento: '9768', tipo: null },
      { lancamento: '11284', tipo: null },
    ],
  )
  // A parcela 814 da bonificação não vira parcela, e o uso dela (a fonte 791, que aponta para a 814) não vira baixa: a
  // rodada grava só as 8 parcelas e as 4 baixas das duas contas. O uso entra como pagamento da venda 358, na forma troca.
  assert.equal(contagens.parcelas, '8')
  assert.equal(contagens.baixas, '4')
  assert.deepEqual(
    await linhas(
      `select d.origem_id as documento, p.origem_tabela, p.origem_id, p.forma, t.valor as forma_traduzida, p.valor
         from kaizen.documento_pagamento p
         join kaizen.documento d on d.id = p.documento_id
         left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = p.forma
        where d.fonte = 'link' and p.origem_tabela = 'pc_lancamento_fonte' and p.origem_id = '791'`,
    ),
    [{ documento: '358', origem_tabela: 'pc_lancamento_fonte', origem_id: '791', forma: '2.1.2.03', forma_traduzida: 'troca', valor: '60.00' }],
  )
})

test('nota 15 com itens de entrada da compra e o fornecedor ligado, e nota 58 com itens de sentido N', async () => {
  await traduzirLink(banco.cliente)
  // O fornecedor da nota é o da própria nota, ligado pelo CNPJ: o 9 da Link é a pessoa 900009 do ERP novo, e o 14 é a
  // 900014. A nota não tem hora de fechamento na Link; ela é criada e fechada no mesmo momento.
  assert.deepEqual(await documento('nota_entrada', '15'), [
    {
      codigo: '15', modelo: '55', status: null, movimento: null, financeiro: null,
      criado_em: '2026-05-20 15:38:20.752567', fechado_em: '2026-05-20 15:38:20.752567', pessoa: '900009', turno_usuario: null,
      pessoa_fonte: 'meuerp', pessoa_nome: 'FORNECEDOR 9 LTDA',
      tipo: 'nota_entrada', situacao: 'emitido', movimento_traduzido: 'entrada', financeiro_traduzido: 'nenhum',
    },
  ])
  assert.deepEqual(await documento('nota_entrada', '58'), [
    {
      codigo: '58', modelo: '55', status: null, movimento: null, financeiro: null,
      criado_em: '2026-09-22 10:09:56.114565', fechado_em: '2026-09-22 10:09:56.114565', pessoa: '900014', turno_usuario: null,
      pessoa_fonte: 'meuerp', pessoa_nome: 'FORNECEDOR 14 LTDA',
      tipo: 'nota_entrada', situacao: 'emitido', movimento_traduzido: 'entrada', financeiro_traduzido: 'nenhum',
    },
  ])
  // Os itens vêm da compra de cada nota (a compra 12 é da nota 15; a 50, da nota 58), com a quantidade já na unidade do
  // estoque, sem valor e sem vendedor, e o produto do ERP novo pelo código. A entrada da compra 12 foi concluída: sentido
  // E. A da compra 50 está vazia na Link: sentido N, o item não mexeu no estoque.
  assert.deepEqual(
    await linhas(
      `select d.origem_id as nota, i.origem_tabela, i.origem_id, i.sentido, t.valor as sentido_traduzido,
              i.produto, pr.fonte as produto_fonte, i.quantidade, i.valor_liquido, i.vendedor
         from kaizen.documento_item i
         join kaizen.documento d on d.id = i.documento_id
         left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'sentido' and t.codigo = i.sentido
         left join kaizen.produto pr on pr.codigo = i.produto
        where d.fonte = 'link' and d.origem_tabela = 'nota_entrada'
        order by d.origem_id collate "C", i.origem_id collate "C"`,
    ),
    [
      {
        nota: '15', origem_tabela: 'compra_item', origem_id: '106', sentido: 'E', sentido_traduzido: 'entrada',
        produto: '2889', produto_fonte: 'meuerp', quantidade: '40', valor_liquido: null, vendedor: null,
      },
      {
        nota: '58', origem_tabela: 'compra_item', origem_id: '521', sentido: 'N', sentido_traduzido: 'nenhum',
        produto: '5262', produto_fonte: 'meuerp', quantidade: '5', valor_liquido: null, vendedor: null,
      },
    ],
  )
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-contas.test.mts`
Saída esperada: falha, com `ℹ tests 4`, `ℹ pass 0` e `ℹ fail 4`. O `traduzirLink` da tarefa 5 roda sem erro, mas só com as famílias `vendas` e `caixa`: o Kaizen não tem nenhuma conta nem nota da Link. Os testes 1, 2 e 4 falham na leitura do documento com `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:` e `+ []` do lado do `actual` (no teste 1, a leitura da Link falsa, antes dela, passa: a compra 5 e o fornecedor 7 estão nos casos). O teste 3 passa a leitura da Link falsa (a bonificação 790 está nos casos) e falha na lista dos lançamentos sem caixa, com `+     tipo: null` no lugar de `-     tipo: 'conta_pagar'` nos lançamentos 1396 e 8396.

- [ ] **Passo 3: Criar `sql/link/contas.sql`**

Três comandos, que enchem as temporárias da transação; quem grava no Kaizen é o `gravar.sql` da tarefa 4.
1. **A conta:** um documento por lançamento **sem caixa** que tem ao menos uma parcela positiva numa conta que começa com `2.`, fora a `2.1.2.03` (vales e bonificações são crédito de cliente, não conta; é o que deixa a bonificação 790 de fora). O lançamento com caixa é o da venda: as parcelas `2.1.2.03` dele são o vale gerado ou usado, que a tarefa 4 já leva como pagamento da venda. O modelo cru é a menor dessas contas (`2.1.2.02`, `2.1.3.07` etc.), `criado_em` é a `data_emissao` e `fechado_em` fica vazio. O fornecedor é o da fonte do lançamento; sem ele, o da compra com `compra.id_compra = pc_lancamento_fonte.id_ped_entrada` (spec, 7.1: pela `id_entrada` do `DICIONARIO.md` do Prumo, a 1396 ficaria com o fornecedor errado). O código é o do fornecedor + 900000, ligado pela `link_liga`; conta sem fornecedor (as 6 de imposto, `2.1.4.10`) fica sem pessoa e sem falha.
2. **As parcelas:** todas as do lançamento da conta; `lancado_em` é o dia da conta, `vencimento` é a `data_vencimento` (com `0001-01-01` virando vazio), `status` é o `liquidada` e `descricao` o `documento`. O filtro `modelo like '2.%'` separa as contas das sangrias e do suprimento, que também têm `origem_tabela = 'pc_lancamento'`.
3. **As baixas:** cada fonte de **outro** lançamento que aponta para a parcela. `pago_em` é o dia desse outro lançamento (e não o vencimento), `valor` o da fonte, `forma` a conta de destino da parcela dele, de onde o dinheiro saiu (a menor, se houver mais de uma; hoje sempre `1.1.1.02.01`, o Banco do Brasil), e `status` o `liquidada` da parcela baixada.

Crie `sql/link/contas.sql` com exatamente este conteúdo:

```sql
-- Conta a pagar: lançamento sem caixa com ao menos uma parcela positiva numa conta 2.x, fora a 2.1.2.03
-- (vale e bonificação são crédito de cliente, não conta). O modelo cru é a menor dessas contas.
-- O fornecedor é o da fonte do lançamento; sem ele, o da compra (compra.id_compra = id_ped_entrada).
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
with conta as (
  select pp.id_pc_lancamento, min(pp.pc_codigo_destino) as modelo
  from erp.pc_lancamento_parcela pp
  where pp.destino_positiva and pp.pc_codigo_destino like '2.%' and pp.pc_codigo_destino <> '2.1.2.03'
  group by pp.id_pc_lancamento
)
select
  'pc_lancamento', l.id_pc_lancamento::text,
  l.id_pc_lancamento::text,
  ct.modelo,
  null,
  l.data_emissao, null,
  lp.codigo_kaizen,
  null
from conta ct
join erp.pc_lancamento l on l.id_pc_lancamento = ct.id_pc_lancamento
left join erp.pc_lancamento_fonte f on f.id_pc_lancamento = l.id_pc_lancamento
left join erp.compra co on co.id_compra = f.id_ped_entrada
left join erp.fornecedor fo on fo.id_fornecedor = coalesce(f.id_fornecedor, co.id_fornecedor)
left join pg_temp.link_liga lp on lp.entidade = 'pessoa' and lp.codigo_origem = (fo.fornecedor_codigo + 900000)::text
where l.id_caixa is null;

-- Parcelas: todas as do lançamento da conta (as contas já estão em link_doc, com o modelo 2.x).
insert into pg_temp.link_parcela (doc_tabela, doc_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao)
select
  d.origem_tabela, d.origem_id,
  'pc_lancamento_parcela', pp.id_pc_lancamento_parcela::text,
  d.criado_em::date,
  nullif(pp.data_vencimento, date '0001-01-01'),
  pp.valor,
  pp.liquidada::text,
  pp.documento
from pg_temp.link_doc d
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento::text = d.origem_id
where d.origem_tabela = 'pc_lancamento' and d.modelo like '2.%';

-- Baixas: a fonte de outro lançamento que aponta para a parcela. Paga no dia desse lançamento,
-- pela conta de destino da parcela dele (a menor, se houver mais de uma).
insert into pg_temp.link_baixa (doc_tabela, doc_id, parcela_origem_id, origem_tabela, origem_id, pago_em, valor, forma, status)
with forma as (
  select x.id_pc_lancamento, min(x.pc_codigo_destino) as forma
  from erp.pc_lancamento_parcela x
  group by x.id_pc_lancamento
)
select
  d.origem_tabela, d.origem_id,
  pp.id_pc_lancamento_parcela::text,
  'pc_lancamento_fonte', f.id_pc_lancamento_fonte::text,
  pg.data_emissao::date,
  f.valor,
  fm.forma,
  pp.liquidada::text
from pg_temp.link_doc d
join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento::text = d.origem_id
join erp.pc_lancamento_fonte f on f.id_pc_lancamento_parcela = pp.id_pc_lancamento_parcela and f.id_pc_lancamento <> pp.id_pc_lancamento
join erp.pc_lancamento pg on pg.id_pc_lancamento = f.id_pc_lancamento
left join forma fm on fm.id_pc_lancamento = f.id_pc_lancamento
where d.origem_tabela = 'pc_lancamento' and d.modelo like '2.%';
```

- [ ] **Passo 4: Criar `sql/link/notas.sql`**

Dois comandos:
1. **A nota:** um documento por `nota_entrada`, com o modelo cru `nota_entrada.modelo` (`55`), `criado_em` e `fechado_em` iguais à `data_hora_insert`, e o fornecedor da própria nota, com o código + 900000, ligado pela `link_liga`.
2. **Os itens:** os `compra_item` da compra da nota (`compra.id_nota_entrada`; spec, 7.1: a `id_entrada` da spec da Fase 2 falta em 5 das 51 notas), com a quantidade já na unidade do estoque, sem valor e sem vendedor, e o produto ligado pelo código. Sentido `E` quando `entrada_concluida` é verdadeiro; `N` quando é falso ou vazio (a entrada que não foi concluída não mexeu no estoque).

Crie `sql/link/notas.sql` com exatamente este conteúdo:

```sql
-- Nota de entrada: o fornecedor ganha 900000 no código, como no ERP novo.
insert into pg_temp.link_doc (origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, turno_usuario)
select
  'nota_entrada', ne.id_nota_entrada::text,
  ne.id_nota_entrada::text,
  ne.modelo,
  null,
  ne.data_hora_insert, ne.data_hora_insert,
  lp.codigo_kaizen,
  null
from erp.nota_entrada ne
left join erp.fornecedor fo on fo.id_fornecedor = ne.id_fornecedor
left join pg_temp.link_liga lp on lp.entidade = 'pessoa' and lp.codigo_origem = (fo.fornecedor_codigo + 900000)::text;

-- Itens da compra da nota, já na unidade do estoque: E quando a entrada foi concluída, senão N.
insert into pg_temp.link_item (doc_tabela, doc_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  'nota_entrada', co.id_nota_entrada::text,
  'compra_item', ci.id_compra_item::text,
  case when ci.entrada_concluida then 'E' else 'N' end,
  lpr.codigo_kaizen,
  ci.qtd,
  null,
  null
from erp.compra_item ci
join erp.compra co on co.id_compra = ci.id_compra
join pg_temp.link_doc d on d.origem_tabela = 'nota_entrada' and d.origem_id = co.id_nota_entrada::text
left join erp.produto p on p.id_produto = ci.id_produto
left join pg_temp.link_liga lpr on lpr.entidade = 'produto' and lpr.codigo_origem = p.produto_codigo;
```

- [ ] **Passo 5: Conferir os dois arquivos SQL**

Rode (Git Bash): `sha256sum sql/link/contas.sql sql/link/notas.sql`
Saída esperada:
```
ca8192cfc438a995ab3c0d41f3e7323610ad2506a5f037290d9a19c8b15a0055 *sql/link/contas.sql
f64db21b9f22bd9db60721b3657b9606bf5a76a44a38496e1a82877684691228 *sql/link/notas.sql
```
Um hash diferente quer dizer que o arquivo não é o do protótipo (uma linha mudada, CRLF no lugar de LF, falta da quebra de linha no fim): corrija copiando o bloco de novo até bater; não mude o conteúdo.

Rode (Git Bash): `for par in 'pc_lancamento id_pc_lancamento' 'pc_lancamento data_emissao' 'pc_lancamento id_caixa' 'pc_lancamento_parcela id_pc_lancamento' 'pc_lancamento_parcela id_pc_lancamento_parcela' 'pc_lancamento_parcela pc_codigo_destino' 'pc_lancamento_parcela destino_positiva' 'pc_lancamento_parcela data_vencimento' 'pc_lancamento_parcela valor' 'pc_lancamento_parcela liquidada' 'pc_lancamento_parcela documento' 'pc_lancamento_fonte id_pc_lancamento' 'pc_lancamento_fonte id_pc_lancamento_fonte' 'pc_lancamento_fonte id_pc_lancamento_parcela' 'pc_lancamento_fonte id_ped_entrada' 'pc_lancamento_fonte id_fornecedor' 'pc_lancamento_fonte valor' 'compra id_compra' 'compra id_fornecedor' 'compra id_nota_entrada' 'compra_item id_compra_item' 'compra_item id_compra' 'compra_item id_produto' 'compra_item qtd' 'compra_item entrada_concluida' 'fornecedor id_fornecedor' 'fornecedor fornecedor_codigo' 'nota_entrada id_nota_entrada' 'nota_entrada modelo' 'nota_entrada data_hora_insert' 'nota_entrada id_fornecedor' 'produto id_produto' 'produto produto_codigo'; do grep -c "^$par " sql/link/colunas-esperadas.txt; done | tr '\n' ' '`
Saída esperada: `1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ` (trinta e três `1`: cada coluna do `erp` que `contas.sql` e `notas.sql` leem está na lista uma vez; a Link falsa só tem as colunas da lista, e a conferência de entrada do comando para se uma delas faltar na cópia).

- [ ] **Passo 6: Pôr as famílias `contas` e `notas` em `tradutor/link.mts`**

Uma linha muda: o `FAMILIAS` da tarefa 5 ganha `'contas'` e `'notas'`, nesta ordem, depois de `'caixa'`. A ordem importa em dois pontos: o `contas.sql` e o `notas.sql` leem a `link_doc` que eles mesmos encheram, e o `cadastros`, que vem depois de todas as famílias, só grava o FORNECEDOR PADRÃO e a falha dele porque a conta 8396 já está na `link_doc`.

Antes (tarefa 5):
```ts
const FAMILIAS = ['vendas', 'caixa']
```
Depois:
```ts
const FAMILIAS = ['vendas', 'caixa', 'contas', 'notas']
```

O arquivo inteiro fica assim no fim desta tarefa. Ele é o da tarefa 5 com a linha do `FAMILIAS` trocada; se o texto de algum comentário das tarefas anteriores estiver diferente do que vai abaixo, fica o do repositório: esta tarefa só muda aquela linha. A tarefa 7 acrescenta depois as conferências de saída (`sem-traducao` e `comparar`), `resumoLink`, `principalLink` e o `import.meta.main`.

```ts
// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// Os arquivos de sql/link têm vários comandos; o pg devolve um resultado por comando, e o que importa é o do último.
async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>> {
  const resultado = (await cliente.query(lerSql(`link/${nome}.sql`))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}

// Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
export async function ligarLink(cliente: Cliente): Promise<void> {
  await rodar(cliente, 'preparar')
  const invalidas = await rodar(cliente, 'ligar')
  if (invalidas.length > 0) {
    const lista = invalidas.map((l) => `${l.entidade} ${l.codigo_origem} → ${l.codigo_kaizen}`).join(', ')
    throw new ErroLink(`decisão da de_para aponta para código que não existe no ERP novo: ${lista}`)
  }
}

// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas', 'caixa', 'contas', 'notas']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    return contagens as unknown as ContagensLink
  })
}
```

Rode (Git Bash): `git diff --stat tradutor/link.mts; git diff tradutor/link.mts | grep '^[-+][^-+]'`
Saída esperada: ` tradutor/link.mts | 2 +-`, `1 file changed, 1 insertion(+), 1 deletion(-)` e as duas linhas `-const FAMILIAS = ['vendas', 'caixa']` e `+const FAMILIAS = ['vendas', 'caixa', 'contas', 'notas']`.

- [ ] **Passo 7: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-contas.test.mts`
Saída esperada: passa, com `ℹ pass 4`, `ℹ fail 0` e:
```
✔ conta 1396: fornecedor pela compra, parcelas com vencimento e as baixas com o dia do lançamento que baixa, válidas e pelo banco
✔ conta 8396: o FORNECEDOR PADRÃO vira link:900001, no documento, no cadastro e na de_para
✔ a bonificação 790 (conta 2.1.2.03) não entra como conta
✔ nota 15 com itens de entrada da compra e o fornecedor ligado, e nota 58 com itens de sentido N
```

- [ ] **Passo 8: Atualizar `testes-esperados.txt` (N = 4)**

Esta tarefa acrescentou 4 `test(` (todos em `tradutor/link-contas.test.mts`). Some ao número atual: 310 + 4 = 314. O arquivo fica com uma única linha:

```text
314
```

- [ ] **Passo 9: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 314 testes com ✔ (os 11 de `tradutor/link-vendas.test.mts` da tarefa 4 e os 3 de `tradutor/link-caixa.test.mts` da tarefa 5 continuam passando: eles filtram as negociações, os fechamentos e os tipos `sangria` e `suprimento`, e as falhas das vendas pelos códigos; a conta 8396 traz a quinta falha, `link:900001`, que eles não contam); última linha `rodou 314 testes, esperados 314`.

- [ ] **Passo 10: Commit**

```bash
git add sql/link/contas.sql sql/link/notas.sql tradutor/link.mts tradutor/link-contas.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Link: contas a pagar e notas de entrada entram no Kaizen

As contas a pagar da Link entram no Kaizen como conta a pagar, emitida,
que paga, com o fornecedor do cadastro do ERP novo, as parcelas (dia do
lançamento, vencimento, valor, baixada ou pendente) e as baixas (o dia
em que outro lançamento pagou a parcela, o valor e o banco de onde o
dinheiro saiu). As notas de entrada entram como nota de entrada, com o
fornecedor ligado e os itens da compra na unidade do estoque: de entrada
quando a entrada foi concluída, sem movimento quando não foi.

Nos casos da cópia antiga: a conta 1396 (10.031,64 em três parcelas)
fica com o FORNECEDOR 7, que vem pela compra, e não pela fonte; duas
parcelas foram baixadas em 26/05, pelo banco, e a de 29/05 está
pendente. A conta 8396, do FORNECEDOR PADRÃO (sem CNPJ), fica com
link:900001 no documento, no cadastro e na de_para. A bonificação 790
(conta 2.1.2.03) não vira conta: é crédito dado ao cliente, e o uso dela
continua como pagamento da venda 358, na forma troca. A nota 15 tem 40
unidades de entrada; a 58, cuja entrada não foi concluída, 5 unidades
que não mexem no estoque.

Testes: rodou 314, esperados 314.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 314 testes, esperados 314`; o commit sai.


### Tarefa 7: Conferências de saída, resumo, comando e a ficha da venda

**O que esta tarefa entrega, em resultado:** o comando da Link fica pronto: `node --env-file=.env tradutor/link.mts` grava a história da Link numa transação só e, antes do commit, confere duas coisas. Primeiro, que todo código da Link gravado (tipo, situação, forma, sentido etc.) tem tradução; senão para com o campo, o código e quantas linhas o usam (`código da Link sem tradução: forma Pix (8)`). Depois, dia a dia, que o Kaizen e a Link dão o mesmo número de vendas válidas, o mesmo vendido e a mesma devolução; senão para com o dia e os dois números (`2026-06-17: vendas 1 × 1, vendido 150.00 × 150.01, ...`). Nos dois casos nada é gravado, e o comando sai com 1. Com tudo certo, ele imprime `link ok:` com as contagens e o resumo (documentos por família, vendas, itens, pagamentos que somam venda − devolução, parcelas e baixas, lançamentos do razão que não entram, ligações, as falhas da `de_para` com o que depende de cada uma, e os dias comparados), e sai com 0. Nos casos reais da cópia antiga: 26 documentos, 57 itens, 22 pagamentos, 10 dias com as 14 vendas válidas iguais à Link, 13 de 14 vendas com os pagamentos fechando (a exceção é a 100, o troco de R$ 0,01 que a Link não grava), 5 falhas na `de_para`, e duas rodadas deixam todas as tabelas do Kaizen iguais, sem nenhuma linha em `execucao`. Por fim, a ficha da venda (`sql/kaizen/ficha-venda.sql`) mostra, lado a lado, a venda de junho 1992 da Link e o pedido 87 do ERP novo na mesma forma: pedido, emitido, saída, recebe, itens de saída com o vendedor e o nome do cadastro novo, formas no mesmo vocabulário (`pix`; `dinheiro`, `pix` e `credito`). São 7 testes novos, num commit.

**Arquivos:**
- Criar (do protótipo, sem mudar nada): `sql/link/sem-traducao.sql`
- Criar (do protótipo, sem mudar nada): `sql/link/comparar.sql`
- Criar (do protótipo, sem mudar nada): `sql/link/resumo.sql`
- Criar (do protótipo, sem mudar nada): `sql/kaizen/ficha-venda.sql`
- Modificar: `tradutor/link.mts` (o import de `conectar`, as duas conferências de saída no fim de `traduzirLink`, `resumoLink`, `principalLink` e o `import.meta.main`: é a versão final do arquivo)
- Testar: `tradutor/link-comando.test.mts`
- Modificar: `testes-esperados.txt` (de `314` para `321`)

**Interfaces:**
- Consome (Fase 2, sem mudar):
  ```ts
  // tradutor/banco.mts
  export async function conectar(url: string): Promise<Cliente> // já com time zone America/Fortaleza e datestyle ISO, YMD
  export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T> // begin, commit; rollback no erro
  export function garantirLocal(url: string): void // só localhost:5434
  // tradutor/carga.mts
  export async function colocarEntrada(cliente: Cliente, assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros', partes: string[]): Promise<void>
  export async function gravarDocumentos(cliente: Cliente): Promise<{ lidos: number; novos: number }> // sql/carga/documentos.sql
  // tradutor/apoio-teste.mts
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>
  ```
  O documento que `gravarDocumentos` lê de `pg_temp.entrada` tem o formato que `sql/erp/documentos.sql` devolve (o `DocumentoErp` de `tradutor/carga.test.mts`: `oid`, `codigo`, `modelo`, `status`, `movimento`, `financeiro`, `criado_em`, `fechado_em`, `pessoa`, `turno_caixa`, `turno_usuario`, `turno_numero`, `itens`, `pagamentos`, `parcelas`, `conferencia`, `conferencia_abaixo_corte`). A tradução da fonte `meuerp` (migração 002) tem `forma` `1` dinheiro, `2` pix, `3` credito; `tipo` `PA` pedido; `situacao` `E` emitido; `movimento` `S` saida; `financeiro` `R` recebe; `sentido` `S` saida. O pedido 87 é o de `tradutor/fixtures.mts` (`pedidoTresFormas`): oid 186, cliente 999007, turno da Daniele (caixa 3, usuário 18153, abertura 1), `datahora` `2026-09-29 11:00:00`, item 1874 do produto 2962 (1 unidade, R$ 120,00, vendedora 999005), pagamentos 3, 4 e 5 (R$ 50,00 em dinheiro, R$ 40,00 em Pix e R$ 30,00 no crédito); as parcelas dele não entram (financeiro `R`).
- Consome (tarefas 1 a 6): a função `kaizen.meio_par(valor, casas)` e a visão `kaizen.documento_negocio` com a situação pelo modelo (migração 006), as 69 linhas da fonte `link` em `kaizen.traducao`, as 22 decisões da `de_para` (007); a Link falsa e os casos (`criarLinkFalsa`, `carregarCasosLink`, `LinkFalsa.executar` como `postgres`); em `tradutor/link.mts`, `ErroLink`, `lerSql`, `rodar` (privada), `conferirEntradaLink`, `ligarLink`, `FAMILIAS` com `'vendas', 'caixa', 'contas', 'notas'`, `ContagensLink` e `traduzirLink`, que hoje termina no `return` das contagens do `gravar.sql` (`documentos`, `novos`, `itens`, `pagamentos`, `conferencias`, `parcelas`, `baixas`, todas como texto). Nos casos, o `gravar` dá 26 documentos, 57 itens, 22 pagamentos, 12 linhas de conferência, 8 parcelas e 4 baixas; o cadastro dos casos tem a pessoa 999007 (CONSUMIDOR FINAL) e a funcionária 999005 (Debora Fonseca Lima), e não tem o produto 2962.
- Produz:
  ```ts
  // tradutor/link.mts
  // traduzirLink passa a rodar sem-traducao.sql e comparar.sql depois do gravar, dentro da transação, e lança
  //   ErroLink(`código da Link sem tradução: ${campo} ${codigo} (${quantos}), ...`)
  //   ErroLink(`a comparação com a Link deu diferença em ${n} dia(s), Kaizen × Link: ${dia}: vendas ${k} × ${l}, vendido ${k} × ${l}, devolução ${k} × ${l}; ...`)
  export async function resumoLink(cliente: Cliente): Promise<Array<{ chave: string; valor: string }>> // sql/link/resumo.sql, depois do commit
  export async function principalLink(env: Record<string, string | undefined>): Promise<number> // 0 gravou; 1 falhou
  // imprime 'link ok: documentos=…, novos=…, itens=…, pagamentos=…, conferencias=…, parcelas=…, baixas=…' e uma linha
  // 'chave: valor' por linha do resumo; ou 'link falhou: <motivo>' (sem KAIZEN_URL: 'link falhou: falta KAIZEN_URL')
  ```
  e o comando `node --env-file=.env tradutor/link.mts` (lê só `KAIZEN_URL`). Os arquivos SQL: `sem-traducao.sql` devolve `(campo, codigo, quantos)` dos códigos crus da Link sem linha em `kaizen.traducao` (vazio quando está tudo traduzido); `comparar.sql` devolve `(dia, vendas_kaizen, vendas_link, vendido_kaizen, vendido_link, devolucao_kaizen, devolucao_link)` só dos dias diferentes (vazio quando tudo bate); `resumo.sql` devolve `(ordem, chave, valor)`, uma linha por número; `ficha-venda.sql` é um comando só, com `$1` (o `kaizen.documento.id`), sem `;` no fim, e devolve uma linha com `ficha` (jsonb: `documento` com `fonte`, `codigo`, `tipo`, `situacao`, `movimento`, `financeiro`, `criado_em`, `fechado_em`, `pessoa` e `pessoa_nome`; `itens` com `sentido`, `produto`, `descricao`, `quantidade`, `valor_liquido`, `vendedor` e `vendedor_nome`; `pagamentos` com `forma` e `valor`; todo valor em texto). A tarefa 9 usa o comando e a ficha contra a cópia antiga.
- `testes-esperados.txt` passa de `314` para `321`.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, no Git Bash, na branch `fase-3`, com as tarefas 1 a 6 já commitadas (`cat testes-esperados.txt` mostra `314`) e o Postgres local no ar (`docker compose up -d --wait`). Os quatro arquivos SQL são os do protótipo, que rodou contra a cópia antiga inteira (6.155 documentos, 141 dias comparados sem diferença, duas rodadas iguais): copie cada bloco inteiro, sem mudar nem uma letra, em LF (o passo 7 confere pelo sha256). O `.gitattributes` já manda o `*.sql` em LF. Os valores esperados dos testes foram conferidos rodando esses arquivos sobre a Link falsa dos casos. Os testes 2 a 7 chamam `traduzirLink` no começo, que roda duas vezes sem duplicar, então a ordem deles não importa. Quatro testes mudam alguma coisa e desfazem no `finally`: o 1 apaga a tradução da forma `Pix` da Link e a devolve; o 3 muda o `valor_total_venda` da 1992 na Link falsa (pela `LinkFalsa.executar`, dentro do banco de teste) e o devolve a 150.00, e depois apaga todas as negociações da Link falsa e as insere de novo a partir dos casos (`LinkFalsa.inserir` com `lerCasosLink().negociacao`); o 6 apaga de novo a tradução da forma `Pix` e a devolve; o 7 grava o produto 2962 e o pedido 87 do ERP novo no Kaizen do teste e os apaga. Nesta tarefa o comando não roda contra o banco `kaizen` de verdade (é a tarefa 9): só roda sem `KAIZEN_URL`, para ver a saída 1. Não abra nem imprima o `.env`. Commits no Git Bash.

- [ ] **Passo 1: Escrever o teste do comando**

Crie `tradutor/link-comando.test.mts`. Um banco de teste para o arquivo, com a Link falsa dos casos no `before`, como nos outros testes da Link. Os testes 1 e 3 provam que "nada é gravado" com a foto inteira do Kaizen (todas as tabelas, com os `id` e o `lido_em`), tirada antes e depois: uma rodada que chegasse ao commit mudaria ao menos os `id` dos filhos (trocados por inteiro a cada rodada) e o `lido_em` do cadastro só da Link, ou gravaria os 26 documentos num banco ainda sem eles. O teste 3 prova também a trava da spec (seção 7.7): com a cópia sem nenhuma negociação, o comando para antes de abrir a transação, e os 26 documentos já gravados pela primeira rodada do teste ficam (a mesma foto). O teste 6 prova que, numa falha, o comando imprime só a linha `link falhou: ...` e sai com 1. O teste 4 compara as tabelas sem o que muda por construção (`id` e `parcela_id` dos filhos, `lido_em`); o documento guarda o `id` e o `visto_em`. O teste 7 grava o pedido 87 pelo caminho de carga da Fase 2 (`colocarEntrada` e `gravarDocumentos`, numa transação), no formato que `sql/erp/documentos.sql` devolve.

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emTransacao, garantirLocal } from './banco.mts'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinkFalsa } from './link-falsa.mts'
import { ErroLink, principalLink, resumoLink, traduzirLink } from './link.mts'

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

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// O erro é um ErroLink com exatamente esta mensagem.
function erroLink(mensagem: string) {
  return (erro: unknown) => {
    assert.ok(erro instanceof ErroLink)
    assert.equal(erro.message, mensagem)
    return true
  }
}

// Todas as tabelas do esquema kaizen, cada linha em JSON, em ordem. As colunas de `sem` saem de toda tabela menos do
// documento, que guarda o id e o visto_em de uma rodada para a outra.
async function foto(sem: string[]): Promise<Record<string, string[]>> {
  const tabelas = await banco.cliente.query<{ tabela: string }>(
    `select table_name as tabela from information_schema.tables
      where table_schema = 'kaizen' and table_type = 'BASE TABLE'
      order by table_name collate "C"`,
  )
  const resultado: Record<string, string[]> = {}
  for (const { tabela } of tabelas.rows) {
    const linhas = await banco.cliente.query<{ linha: string }>(
      `select (to_jsonb(x) - $1::text[])::text as linha from kaizen.${tabela} x order by 1`,
      [tabela === 'documento' ? [] : sem],
    )
    resultado[tabela] = linhas.rows.map((l) => l.linha)
  }
  return resultado
}

test('código da Link sem tradução para o comando com o campo e o código, e nada é gravado', async () => {
  // A foto inteira, com os id e o lido_em: uma rodada gravada mudaria ao menos isso (documentos novos, os filhos com
  // id novos, o cadastro só da Link com o lido_em da rodada).
  const antes = await foto([])
  // Como se a cópia trouxesse uma forma que ninguém traduziu: os 8 pagamentos em Pix dos casos ficam sem tradução.
  await banco.cliente.query(`delete from kaizen.traducao where fonte = 'link' and campo = 'forma' and codigo = 'Pix'`)
  try {
    await assert.rejects(traduzirLink(banco.cliente), erroLink('código da Link sem tradução: forma Pix (8)'))
  } finally {
    await banco.cliente.query(`insert into kaizen.traducao (fonte, campo, codigo, valor) values ('link', 'forma', 'Pix', 'pix')`)
  }
  assert.deepEqual(await foto([]), antes)
})

test('com os casos, a comparação por dia não acha diferença', async () => {
  await traduzirLink(banco.cliente)
  // A comparação do comando, rodada de novo sobre o que ficou gravado: nenhum dia com diferença.
  assert.deepEqual((await banco.cliente.query(lerSql('link/comparar.sql'))).rows, [])
  // E ela teve o que comparar: as 14 vendas válidas dos casos, em 10 dias, com os mesmos números dos dois lados.
  const esperado = [
    { dia: '2026-04-15', vendas: 2, vendido: '336.78', devolucao: '97.00' },
    { dia: '2026-04-24', vendas: 1, vendido: '60.00', devolucao: '0.00' },
    { dia: '2026-04-27', vendas: 1, vendido: '129.72', devolucao: '0.00' },
    { dia: '2026-04-28', vendas: 3, vendido: '794.20', devolucao: '742.90' },
    { dia: '2026-05-04', vendas: 1, vendido: '71.00', devolucao: '0.00' },
    { dia: '2026-05-21', vendas: 2, vendido: '56.80', devolucao: '67.77' },
    { dia: '2026-06-17', vendas: 1, vendido: '150.00', devolucao: '0.00' },
    { dia: '2026-07-03', vendas: 1, vendido: '100.00', devolucao: '0.00' },
    { dia: '2026-08-05', vendas: 1, vendido: '507.00', devolucao: '0.00' },
    { dia: '2026-09-17', vendas: 1, vendido: '230.00', devolucao: '0.00' },
  ]
  const kaizen = await banco.cliente.query(`
    select d.criado_em::date as dia, count(distinct d.id)::int as vendas,
           kaizen.meio_par(coalesce(sum(i.valor_liquido) filter (where i.sentido = 'S'), 0), 2) as vendido,
           coalesce(sum(kaizen.meio_par(i.valor_liquido, 2)) filter (where i.sentido = 'E'), 0.00) as devolucao
    from kaizen.documento_negocio d
    join kaizen.documento_item i on i.documento_id = d.id
    where d.fonte = 'link' and d.tipo = 'pedido' and d.situacao = 'emitido'
    group by 1 order by 1`)
  assert.deepEqual(kaizen.rows, esperado)
  const link = await banco.cliente.query(`
    select n.data::date as dia, count(*)::int as vendas,
           sum(n.valor_total_venda) as vendido, sum(n.valor_total_devolucao) as devolucao
    from erp.negociacao n
    join erp.caixa c on c.id_negociacao = n.id_negociacao
    where n.venda and not c.inativo
    group by 1 order by 1`)
  assert.deepEqual(link.rows, esperado)
})

test('valor_total_venda que não fecha com os itens para o comando com o dia e os dois números, e nada é gravado', async () => {
  // Com a história dos casos já gravada, a foto inteira, com os id e o lido_em.
  await traduzirLink(banco.cliente)
  const antes = await foto([])
  // A venda de junho 1992, a única de 17/06, tem itens que somam 150,00; a Link passa a dizer que ela vendeu 150,01.
  await falsa.executar('update erp.negociacao set valor_total_venda = 150.01 where id_negociacao = 1992')
  try {
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink(
        'a comparação com a Link deu diferença em 1 dia(s), Kaizen × Link: ' +
          '2026-06-17: vendas 1 × 1, vendido 150.00 × 150.01, devolução 0 × 0.00',
      ),
    )
  } finally {
    await falsa.executar('update erp.negociacao set valor_total_venda = 150.00 where id_negociacao = 1992')
  }
  assert.deepEqual(await foto([]), antes)

  // Uma cópia sem nenhuma negociação (restauração que deu errado) para o comando antes de abrir a transação: os 26
  // documentos já gravados ficam, em vez de saírem como documentos que não voltaram na leitura.
  assert.equal(antes.documento.length, 26)
  await falsa.executar('delete from erp.negociacao')
  try {
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?'),
    )
    assert.deepEqual(await foto([]), antes)
  } finally {
    await falsa.inserir('negociacao', lerCasosLink().negociacao)
  }
})

test('todos os casos juntos: duas rodadas deixam o mesmo conteúdo em todas as tabelas', async () => {
  await traduzirLink(banco.cliente)
  // Sem o id e o parcela_id dos filhos (trocados por inteiro a cada rodada) e sem o lido_em do cadastro.
  const primeira = await foto(['id', 'parcela_id', 'lido_em'])
  const contagens = await traduzirLink(banco.cliente)
  const segunda = await foto(['id', 'parcela_id', 'lido_em'])
  assert.deepEqual(contagens, {
    documentos: '26', novos: '0', itens: '57', pagamentos: '22', conferencias: '12', parcelas: '8', baixas: '4',
  })
  assert.deepEqual(segunda, primeira)
  // Igual e cheio: os 26 documentos com os filhos, o cadastro com o que só existe na Link, a de_para com as
  // 22 decisões e as 5 falhas. E nenhuma linha em execucao: o comando da Link não mexe no estado do ERP novo.
  assert.deepEqual(
    Object.fromEntries(
      ['documento', 'documento_item', 'documento_pagamento', 'conferencia_caixa', 'parcela', 'baixa', 'produto', 'pessoa', 'funcionario', 'de_para', 'execucao']
        .map((tabela) => [tabela, segunda[tabela].length]),
    ),
    {
      documento: 26, documento_item: 57, documento_pagamento: 22, conferencia_caixa: 12, parcela: 8, baixa: 4,
      produto: 42, pessoa: 37, funcionario: 10, de_para: 27, execucao: 0,
    },
  )
})

test('resumoLink lista os documentos por família, as ligações e as falhas dos casos', async () => {
  await traduzirLink(banco.cliente)
  assert.deepEqual(await resumoLink(banco.cliente), [
    { chave: 'documentos', valor: '26' },
    { chave: 'documentos:conta_pagar', valor: '2' },
    { chave: 'documentos:fechamento_caixa', valor: '3' },
    { chave: 'documentos:nota_entrada', valor: '2' },
    { chave: 'documentos:orcamento', valor: '1' },
    { chave: 'documentos:pedido', valor: '15' },
    { chave: 'documentos:sangria', valor: '2' },
    { chave: 'documentos:suprimento', valor: '1' },
    { chave: 'orcamentos', valor: '1' },
    { chave: 'vendas_canceladas', valor: '1' },
    { chave: 'vendas_validas', valor: '14' },
    { chave: 'vendas_validas_sem_cliente', valor: '1' },
    { chave: 'itens_de_nota', valor: '2' },
    { chave: 'itens_devolvidos', valor: '10' },
    { chave: 'itens_vendidos', valor: '45' },
    { chave: 'pagamentos', valor: '22' },
    { chave: 'pagamentos_batem', valor: '13 de 14 vendas válidas somam venda − devolução' },
    { chave: 'pagamentos_nao_batem', valor: 'negociação 100: pagamentos R$ 336,79, venda − devolução R$ 336,78' },
    { chave: 'conferencia_linhas', valor: '12' },
    { chave: 'fechamentos', valor: '3' },
    { chave: 'turnos_abertos', valor: '1' },
    { chave: 'baixas', valor: '4, R$ 6.887,76' },
    { chave: 'parcelas', valor: '8, R$ 10.531,64' },
    { chave: 'parcelas_pendentes', valor: '4, R$ 3.643,88' },
    { chave: 'razao_fora', valor: '(sem obs) (orientação false): 5, R$ 6.947,76' },
    { chave: 'razao_fora', valor: 'Venda - Caixa. Lançamento automático. (orientação false): 4, R$ 967,67' },
    { chave: 'razao_fora', valor: 'Venda - Caixa. Lançamento automático. (orientação true): 10, R$ 2.450,70' },
    { chave: 'ligacoes:cliente', valor: 'regra 10, decisão 1, falha 1' },
    { chave: 'ligacoes:fornecedor', valor: 'regra 3, decisão 0, falha 1' },
    { chave: 'ligacoes:produto', valor: 'regra 40, decisão 0, falha 2' },
    { chave: 'ligacoes:vendedor', valor: 'regra 3, decisão 0, falha 1' },
    { chave: 'vendas_com_falha:cliente', valor: '1 vendas válidas, R$ 10,00' },
    { chave: 'vendas_com_falha:vendedor', valor: '0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'funcionario 1 → link:1 (Sistema): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'pessoa 1 → link:1 (CLIENTE 1): 1 documentos, 1 vendas válidas, R$ 10,00' },
    { chave: 'falha', valor: 'pessoa 900001 → link:900001 (FORNECEDOR PADRÃO): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'produto 1993 → link:1993 (Acabamento P/espelho Cabeça Chata Branco Toro): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'produto 2396 → link:2396 (Batente Silicone 10mm Cartela C/ 50 Toro): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'dias_comparados', valor: '10' },
  ])
})

test('o comando imprime link ok e o resumo e sai com 0; sem KAIZEN_URL, sai com 1', async (t) => {
  // A história dos casos já está gravada: o comando roda de novo, sem documento novo.
  await traduzirLink(banco.cliente)
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  garantirLocal(banco.url)
  assert.equal(await principalLink({ KAIZEN_URL: banco.url }), 0)
  const resumo = (await resumoLink(banco.cliente)).map(({ chave, valor }) => `${chave}: ${valor}`)
  assert.equal(resumo.length, 39)
  assert.deepEqual(impressos, [
    'link ok: documentos=26, novos=0, itens=57, pagamentos=22, conferencias=12, parcelas=8, baixas=4',
    ...resumo,
  ])
  assert.equal(impressos[1], 'documentos: 26')
  assert.equal(impressos[39], 'dias_comparados: 10')

  impressos.length = 0
  assert.equal(await principalLink({}), 1)
  assert.deepEqual(impressos, ['link falhou: falta KAIZEN_URL'])

  // Com um código sem tradução, o comando imprime só a falha, sem link ok nem resumo, e sai com 1.
  impressos.length = 0
  await banco.cliente.query(`delete from kaizen.traducao where fonte = 'link' and campo = 'forma' and codigo = 'Pix'`)
  try {
    assert.equal(await principalLink({ KAIZEN_URL: banco.url }), 1)
    assert.deepEqual(impressos, ['link falhou: código da Link sem tradução: forma Pix (8)'])
  } finally {
    await banco.cliente.query(`insert into kaizen.traducao (fonte, campo, codigo, valor) values ('link', 'forma', 'Pix', 'pix')`)
  }
})

test('a mesma forma: a venda 1992 da Link e o pedido 87 do ERP novo dão fichas com as mesmas chaves e o mesmo vocabulário', async () => {
  await traduzirLink(banco.cliente)
  // O pedido 87 do ERP novo (tradutor/fixtures.mts), no formato que sql/erp/documentos.sql devolve, pelo caminho de
  // carga da Fase 2. O cliente 999007 e a vendedora 999005 estão no cadastro dos casos; o produto 2962 não está, e
  // entra só para este teste.
  const pedido87 = {
    oid: 186, codigo: 87, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29T11:00:00', fechado_em: '2026-09-29T11:02:00', pessoa: 999007,
    turno_caixa: 3, turno_usuario: 18153, turno_numero: 1,
    itens: [{ oid: 1874, produto: 2962, quantidade: '1.000000', valor_liquido: '120.00', vendedor: 999005 }],
    pagamentos: [{ oid: 3, forma: 1, valor: '50.00' }, { oid: 4, forma: 2, valor: '40.00' }, { oid: 5, forma: 3, valor: '30.00' }],
    parcelas: [], conferencia: [], conferencia_abaixo_corte: 0,
  }
  const cadastro = await banco.cliente.query(`
    select (select count(*)::int from kaizen.pessoa where fonte = 'meuerp' and codigo = '999007') as cliente,
           (select count(*)::int from kaizen.funcionario where fonte = 'meuerp' and codigo = '999005') as vendedora,
           (select count(*)::int from kaizen.produto where fonte = 'meuerp' and codigo = '2962') as produto`)
  assert.deepEqual(cadastro.rows, [{ cliente: 1, vendedora: 1, produto: 0 }])
  await banco.cliente.query(
    `insert into kaizen.produto (fonte, codigo, descricao, ativo) values ('meuerp', '2962', 'PRODUTO 2962', true)`,
  )
  try {
    const carga = await emTransacao(banco.cliente, async () => {
      await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([pedido87])])
      return gravarDocumentos(banco.cliente)
    })
    assert.deepEqual(carga, { lidos: 1, novos: 1 })

    const ficha = async (fonte: string, origemTabela: string, origemId: string) => {
      const documento = await banco.cliente.query<{ id: string }>(
        'select id from kaizen.documento where fonte = $1 and origem_tabela = $2 and origem_id = $3',
        [fonte, origemTabela, origemId],
      )
      const resultado = await banco.cliente.query(lerSql('kaizen/ficha-venda.sql'), [documento.rows[0].id])
      return resultado.rows[0].ficha as {
        documento: Record<string, string | null>
        itens: Array<Record<string, string | null>>
        pagamentos: Array<Record<string, string | null>>
      }
    }
    const link = await ficha('link', 'negociacao', '1992')
    const erpNovo = await ficha('meuerp', 'documento', '186')

    assert.deepEqual(link, {
      documento: {
        fonte: 'link', codigo: '2124', tipo: 'pedido', situacao: 'emitido', movimento: 'saida', financeiro: 'recebe',
        criado_em: '2026-06-17T13:58:20.706517', fechado_em: '2026-06-17T13:58:21.050114',
        pessoa: '303', pessoa_nome: 'CLIENTE 303',
      },
      itens: [
        {
          sentido: 'saida', produto: '1369', descricao: '', quantidade: '1', valor_liquido: '90.365760772',
          vendedor: '1', vendedor_nome: 'Caio Mendes Rocha',
        },
        {
          sentido: 'saida', produto: '1438', descricao: '', quantidade: '1', valor_liquido: '59.634246',
          vendedor: '1', vendedor_nome: 'Caio Mendes Rocha',
        },
      ],
      pagamentos: [{ forma: 'pix', valor: '150.00' }],
    })
    assert.deepEqual(erpNovo, {
      documento: {
        fonte: 'meuerp', codigo: '87', tipo: 'pedido', situacao: 'emitido', movimento: 'saida', financeiro: 'recebe',
        criado_em: '2026-09-29T11:00:00', fechado_em: '2026-09-29T11:02:00',
        pessoa: '999007', pessoa_nome: 'CONSUMIDOR FINAL',
      },
      itens: [
        {
          sentido: 'saida', produto: '2962', descricao: 'PRODUTO 2962', quantidade: '1.000000', valor_liquido: '120.00',
          vendedor: '999005', vendedor_nome: 'Debora Fonseca Lima',
        },
      ],
      pagamentos: [
        { forma: 'dinheiro', valor: '50.00' },
        { forma: 'pix', valor: '40.00' },
        { forma: 'credito', valor: '30.00' },
      ],
    })

    // As mesmas chaves: no documento, em cada item e em cada pagamento, nas duas fontes.
    const chaves = (objeto: object) => Object.keys(objeto).sort()
    assert.deepEqual(chaves(link), chaves(erpNovo))
    assert.deepEqual(chaves(link.documento), chaves(erpNovo.documento))
    for (const item of [...link.itens, ...erpNovo.itens]) assert.deepEqual(chaves(item), chaves(erpNovo.itens[0]))
    for (const pagamento of [...link.pagamentos, ...erpNovo.pagamentos]) {
      assert.deepEqual(chaves(pagamento), chaves(erpNovo.pagamentos[0]))
    }

    // O mesmo vocabulário: toda palavra das duas fichas é uma das que o ERP novo usa, na tradução da fonte meuerp.
    const vocabulario = await banco.cliente.query<{ campo: string; valores: string[] }>(
      `select campo, array_agg(distinct valor order by valor) as valores
       from kaizen.traducao where fonte = 'meuerp' group by campo`,
    )
    const doErpNovo = Object.fromEntries(vocabulario.rows.map((l) => [l.campo, l.valores]))
    for (const f of [link, erpNovo]) {
      for (const campo of ['tipo', 'situacao', 'movimento', 'financeiro'] as const) {
        assert.ok(doErpNovo[campo].includes(String(f.documento[campo])), `${f.documento.fonte} ${campo}`)
      }
      for (const item of f.itens) assert.ok(doErpNovo.sentido.includes(String(item.sentido)), `${f.documento.fonte} sentido`)
      for (const pagamento of f.pagamentos) assert.ok(doErpNovo.forma.includes(String(pagamento.forma)), `${f.documento.fonte} forma`)
    }
  } finally {
    await banco.cliente.query(`delete from kaizen.documento where fonte = 'meuerp' and origem_tabela = 'documento' and origem_id = '186'`)
    await banco.cliente.query(`delete from kaizen.produto where fonte = 'meuerp' and codigo = '2962'`)
  }
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-comando.test.mts`
Saída esperada: falha, com `SyntaxError: The requested module './link.mts' does not provide an export named 'principalLink'`, `✖ tradutor\link-comando.test.mts`, `ℹ tests 1` e `ℹ fail 1`.

- [ ] **Passo 3: Criar `sql/link/sem-traducao.sql`**

Todo código cru que os documentos da Link e os filhos guardam precisa de uma linha em `kaizen.traducao`. O modelo é conferido quatro vezes (tipo, situação, movimento e financeiro pelo modelo), porque a visão `documento_negocio` traduz o modelo nos quatro. Roda depois do `gravar`, sobre o que acabou de ser gravado, ainda dentro da transação. É uma consulta só, que termina em `;`.

Crie `sql/link/sem-traducao.sql` exatamente assim:

```sql
-- Todo código cru dos documentos da Link e dos filhos precisa de linha na tradução: vazio quando está tudo certo.
-- O modelo é traduzido quatro vezes (tipo, situação, movimento e financeiro pelo modelo); o status, quando existe.
with doc as (
  select k.id, k.modelo, k.status
  from kaizen.documento k
  where k.fonte = 'link'
),
cru (campo, codigo) as (
  select 'tipo', d.modelo from doc d
  union all
  select 'situacao_pelo_modelo', d.modelo from doc d
  union all
  select 'movimento_pelo_modelo', d.modelo from doc d
  union all
  select 'financeiro_pelo_modelo', d.modelo from doc d
  union all
  select 'situacao', d.status from doc d where d.status <> ''
  union all
  select 'forma', p.forma from doc d join kaizen.documento_pagamento p on p.documento_id = d.id
  union all
  select 'forma', c.forma from doc d join kaizen.conferencia_caixa c on c.documento_id = d.id
  union all
  select 'forma', b.forma from doc d join kaizen.parcela pa on pa.documento_id = d.id join kaizen.baixa b on b.parcela_id = pa.id
  union all
  select 'status_parcela', pa.status from doc d join kaizen.parcela pa on pa.documento_id = d.id
  union all
  select 'status_baixa', b.status from doc d join kaizen.parcela pa on pa.documento_id = d.id join kaizen.baixa b on b.parcela_id = pa.id
  union all
  select 'sentido', i.sentido from doc d join kaizen.documento_item i on i.documento_id = d.id
)
select c.campo, c.codigo, count(*) as quantos
from cru c
where not exists (
  select 1 from kaizen.traducao t
  where t.fonte = 'link' and t.campo = c.campo and t.codigo = c.codigo
)
group by c.campo, c.codigo
order by c.campo, c.codigo;
```

- [ ] **Passo 4: Criar `sql/link/comparar.sql`**

A comparação por dia da spec (seção 9): no Kaizen, os pedidos emitidos da fonte `link`; na Link, as negociações com `venda` verdadeiro e o caixa ativo. O vendido do Kaizen é o meio-par da soma dos itens `S` do dia (o item fica sem arredondar); a devolução é a soma do meio-par de cada item `E`, porque a Link grava o total da troca arredondando linha a linha (a 1095: 44,05 + 23,72 = 67,77). "Igual" é exatamente igual. Devolve só os dias com diferença.

Crie `sql/link/comparar.sql` exatamente assim:

```sql
-- Kaizen contra Link, por dia da venda, só as vendas válidas (no Kaizen, pedido emitido; na Link, venda com caixa ativo).
-- Vendido: meio-par da soma dos itens S, contra a soma de valor_total_venda.
-- Devolução: soma do meio-par de cada item E (a Link arredonda linha a linha), contra a soma de valor_total_devolucao.
-- Igual é exatamente igual: devolve só os dias com diferença, vazio quando tudo bate.
with venda_kaizen as (
  select d.id, d.criado_em::date as dia
  from kaizen.documento_negocio d
  where d.fonte = 'link' and d.tipo = 'pedido' and d.situacao = 'emitido'
),
kaizen_dia as (
  select
    v.dia,
    count(*) as vendas,
    kaizen.meio_par(coalesce(sum(i.vendido), 0), 2) as vendido,
    coalesce(sum(i.devolucao), 0) as devolucao
  from venda_kaizen v
  cross join lateral (
    select
      sum(x.valor_liquido) filter (where x.sentido = 'S') as vendido,
      sum(kaizen.meio_par(x.valor_liquido, 2)) filter (where x.sentido = 'E') as devolucao
    from kaizen.documento_item x
    where x.documento_id = v.id
  ) i
  group by v.dia
),
link_dia as (
  select
    n.data::date as dia,
    count(*) as vendas,
    sum(n.valor_total_venda) as vendido,
    sum(n.valor_total_devolucao) as devolucao
  from erp.negociacao n
  join erp.caixa c on c.id_negociacao = n.id_negociacao
  where n.venda and not c.inativo
  group by n.data::date
)
select
  coalesce(k.dia, l.dia) as dia,
  coalesce(k.vendas, 0) as vendas_kaizen,
  coalesce(l.vendas, 0) as vendas_link,
  coalesce(k.vendido, 0) as vendido_kaizen,
  coalesce(l.vendido, 0) as vendido_link,
  coalesce(k.devolucao, 0) as devolucao_kaizen,
  coalesce(l.devolucao, 0) as devolucao_link
from kaizen_dia k
full outer join link_dia l on l.dia = k.dia
where coalesce(k.vendas, 0) <> coalesce(l.vendas, 0)
   or coalesce(k.vendido, 0) <> coalesce(l.vendido, 0)
   or coalesce(k.devolucao, 0) <> coalesce(l.devolucao, 0)
order by 1;
```

- [ ] **Passo 5: Criar `sql/link/resumo.sql`**

O resumo da spec (seção 9), lido do `kaizen` já gravado e do `erp`, uma linha por número, com os valores em reais no formato da loja (`R$ 1.234,56`). As ligações contam os códigos citados pelos documentos, por papel: o cliente é a pessoa da venda ou do orçamento; o fornecedor, a da conta ou da nota. Cada falha da `de_para` vem com o nome do cadastro só da Link e com o que depende dela: documentos, vendas válidas e o vendido.

Crie `sql/link/resumo.sql` exatamente assim:

```sql
-- O resumo do comando link (spec, seção 9), lido do kaizen já gravado e do erp: uma linha por número.
-- Valores em reais no formato da loja (R$ 1.234,56).
with doc as (
  select d.id, d.origem_tabela, d.origem_id, d.modelo, d.tipo, d.situacao, d.criado_em, d.fechado_em, d.pessoa
  from kaizen.documento_negocio d
  where d.fonte = 'link'
),
venda as (
  select d.id, d.origem_id, d.pessoa, d.criado_em
  from doc d
  where d.tipo = 'pedido' and d.situacao = 'emitido'
),
item as (
  select i.documento_id, i.origem_tabela, i.sentido, i.produto, i.valor_liquido, i.vendedor
  from kaizen.documento_item i
  join doc d on d.id = i.documento_id
),
pagamento_venda as (
  select v.origem_id, coalesce(sum(p.valor), 0) as pago
  from venda v
  left join kaizen.documento_pagamento p on p.documento_id = v.id
  group by v.origem_id
),
confere as (
  select pv.origem_id, pv.pago, n.valor_total_venda - n.valor_total_devolucao as devido
  from pagamento_venda pv
  join erp.negociacao n on n.id_negociacao::text = pv.origem_id
),
parcela as (
  select pa.id, pa.valor, pa.status
  from kaizen.parcela pa
  join doc d on d.id = pa.documento_id
),
baixa as (
  select b.valor
  from kaizen.baixa b
  join parcela pa on pa.id = b.parcela_id
),
razao_fora as (
  select
    coalesce(regexp_replace(l.obs, '[0-9]+', 'N', 'g'), '(sem obs)') as obs,
    l.orientacao,
    count(*) as quantos,
    sum(l.valor) as valor
  from erp.pc_lancamento l
  where not exists (
    select 1 from kaizen.documento k
    where k.fonte = 'link' and k.origem_tabela = 'pc_lancamento' and k.origem_id = l.id_pc_lancamento::text
  )
  group by 1, 2
),
-- cada código citado, com o papel: o cliente é a pessoa da venda ou do orçamento; o fornecedor, a da conta ou da nota
citado as (
  select distinct 'cliente' as papel, 'pessoa' as entidade, d.pessoa as codigo from doc d where d.origem_tabela = 'negociacao' and d.pessoa is not null
  union
  select distinct 'fornecedor', 'pessoa', d.pessoa from doc d where d.origem_tabela <> 'negociacao' and d.pessoa is not null
  union
  select distinct 'produto', 'produto', i.produto from item i
  union
  select distinct 'vendedor', 'funcionario', i.vendedor from item i where i.vendedor is not null
),
ligacao as (
  select
    c.papel,
    case
      when c.codigo like 'link:%' then 'falha'
      when exists (
        select 1 from kaizen.de_para dp
        where dp.fonte = 'link' and dp.entidade = c.entidade and dp.codigo_kaizen = c.codigo
      ) then 'decisao'
      else 'regra'
    end as como
  from citado c
),
de_para_falha as (
  select dp.entidade, dp.codigo_origem, dp.codigo_kaizen
  from kaizen.de_para dp
  where dp.fonte = 'link' and dp.codigo_kaizen like 'link:%'
),
-- os itens que dependem de cada falha: todos os do documento da pessoa; só os do produto ou do vendedor
falha_item as (
  select f.entidade, f.codigo_kaizen, d.id as documento_id, i.sentido, i.valor_liquido
  from de_para_falha f
  join doc d on d.pessoa = f.codigo_kaizen
  left join item i on i.documento_id = d.id
  where f.entidade = 'pessoa'
  union all
  select f.entidade, f.codigo_kaizen, i.documento_id, i.sentido, i.valor_liquido
  from de_para_falha f
  join item i
    on (f.entidade = 'produto' and i.produto = f.codigo_kaizen)
    or (f.entidade = 'funcionario' and i.vendedor = f.codigo_kaizen)
),
-- cada falha da de_para, com o que a cita: documentos, vendas válidas e o vendido que depende dela
falha as (
  select
    f.entidade, f.codigo_origem, f.codigo_kaizen,
    coalesce(
      (select p.nome from kaizen.pessoa p where f.entidade = 'pessoa' and p.fonte = 'link' and p.codigo = f.codigo_kaizen),
      (select pr.descricao from kaizen.produto pr where f.entidade = 'produto' and pr.fonte = 'link' and pr.codigo = f.codigo_kaizen),
      (select fu.nome from kaizen.funcionario fu where f.entidade = 'funcionario' and fu.fonte = 'link' and fu.codigo = f.codigo_kaizen)
    ) as nome,
    count(distinct fi.documento_id) as documentos,
    count(distinct v.id) as vendas,
    kaizen.meio_par(coalesce(sum(fi.valor_liquido) filter (where v.id is not null and fi.sentido = 'S'), 0), 2) as vendido
  from de_para_falha f
  left join falha_item fi on fi.entidade = f.entidade and fi.codigo_kaizen = f.codigo_kaizen
  left join venda v on v.id = fi.documento_id
  group by f.entidade, f.codigo_origem, f.codigo_kaizen
),
-- as vendas válidas cujo cliente ou vendedor falhou, e o vendido que depende da falha
venda_falha as (
  select
    'cliente' as papel,
    count(distinct v.id) as vendas,
    kaizen.meio_par(coalesce(sum(i.valor_liquido) filter (where i.sentido = 'S'), 0), 2) as vendido
  from venda v
  left join item i on i.documento_id = v.id
  where v.pessoa like 'link:%'
  union all
  select
    'vendedor',
    count(distinct i.documento_id),
    kaizen.meio_par(coalesce(sum(i.valor_liquido) filter (where i.sentido = 'S'), 0), 2)
  from item i
  where i.vendedor like 'link:%'
    and i.documento_id in (select v.id from venda v)
),
dia as (
  select v.criado_em::date as dia from venda v
  union
  select n.data::date
  from erp.negociacao n
  join erp.caixa c on c.id_negociacao = n.id_negociacao
  where n.venda and not c.inativo
),
linha (ordem, chave, valor) as (
  select 1, 'documentos', count(*)::text from doc
  union all
  select 1, 'documentos:' || coalesce(d.tipo, d.modelo), count(*)::text from doc d group by coalesce(d.tipo, d.modelo)
  union all
  select 2, 'vendas_validas', count(*)::text from venda
  union all
  select 2, 'vendas_canceladas', count(*)::text from doc d where d.tipo = 'pedido' and d.situacao = 'cancelado'
  union all
  select 2, 'orcamentos', count(*)::text from doc d where d.tipo = 'orcamento'
  union all
  select 2, 'vendas_validas_sem_cliente', count(*)::text from venda v where v.pessoa is null
  union all
  select 3, 'itens_vendidos', count(*)::text from item i where i.origem_tabela = 'negociacao_item_vendido'
  union all
  select 3, 'itens_devolvidos', count(*)::text from item i where i.origem_tabela = 'negociacao_item_devolvido'
  union all
  select 3, 'itens_de_nota', count(*)::text from item i where i.origem_tabela = 'compra_item'
  union all
  select 4, 'pagamentos', count(*)::text from kaizen.documento_pagamento p join doc d on d.id = p.documento_id
  union all
  select 4, 'pagamentos_batem',
    count(*) filter (where c.pago = c.devido)::text || ' de ' || count(*)::text || ' vendas válidas somam venda − devolução'
  from confere c
  union all
  select 4, 'pagamentos_nao_batem',
    'negociação ' || c.origem_id
      || ': pagamentos R$ ' || translate(to_char(c.pago, 'FM999,999,999,990.00'), ',.', '.,')
      || ', venda − devolução R$ ' || translate(to_char(c.devido, 'FM999,999,999,990.00'), ',.', '.,')
  from confere c
  where c.pago <> c.devido
  union all
  select 5, 'fechamentos', count(*)::text from doc d where d.tipo = 'fechamento_caixa'
  union all
  select 5, 'turnos_abertos', count(*)::text from doc d where d.tipo = 'fechamento_caixa' and d.fechado_em is null
  union all
  select 5, 'conferencia_linhas', count(*)::text from kaizen.conferencia_caixa c join doc d on d.id = c.documento_id
  union all
  select 6, 'parcelas',
    count(*)::text || ', R$ ' || translate(to_char(coalesce(sum(pa.valor), 0), 'FM999,999,999,990.00'), ',.', '.,')
  from parcela pa
  union all
  select 6, 'parcelas_pendentes',
    count(*)::text || ', R$ ' || translate(to_char(coalesce(sum(pa.valor), 0), 'FM999,999,999,990.00'), ',.', '.,')
  from parcela pa
  where pa.status = 'false'
  union all
  select 6, 'baixas',
    count(*)::text || ', R$ ' || translate(to_char(coalesce(sum(b.valor), 0), 'FM999,999,999,990.00'), ',.', '.,')
  from baixa b
  union all
  select 7, 'razao_fora',
    r.obs || ' (orientação ' || r.orientacao::text || '): ' || r.quantos::text
      || ', R$ ' || translate(to_char(r.valor, 'FM999,999,999,990.00'), ',.', '.,')
  from razao_fora r
  union all
  select 8, 'ligacoes:' || g.papel,
    'regra ' || count(*) filter (where g.como = 'regra')::text
      || ', decisão ' || count(*) filter (where g.como = 'decisao')::text
      || ', falha ' || count(*) filter (where g.como = 'falha')::text
  from ligacao g
  group by g.papel
  union all
  select 8, 'vendas_com_falha:' || vf.papel,
    vf.vendas::text || ' vendas válidas, R$ ' || translate(to_char(vf.vendido, 'FM999,999,999,990.00'), ',.', '.,')
  from venda_falha vf
  union all
  select 9, 'falha',
    f.entidade || ' ' || f.codigo_origem || ' → ' || f.codigo_kaizen || coalesce(' (' || f.nome || ')', '')
      || ': ' || f.documentos::text || ' documentos, ' || f.vendas::text || ' vendas válidas, R$ '
      || translate(to_char(f.vendido, 'FM999,999,999,990.00'), ',.', '.,')
  from falha f
  union all
  select 10, 'dias_comparados', count(*)::text from dia
)
select l.ordem, l.chave, l.valor
from linha l
order by l.ordem, l.chave, l.valor;
```

- [ ] **Passo 6: Criar `sql/kaizen/ficha-venda.sql`**

Um documento em palavras do negócio, a mesma consulta para as duas fontes: a situação, o movimento e o financeiro vêm da visão `documento_negocio`; o sentido do item e a forma do pagamento, da tradução da fonte do documento; o nome do cliente, do produto e do vendedor, do cadastro pelo código, de qualquer fonte (os códigos `link:` não colidem com os do ERP novo). É um comando só, com `$1`, sem `;` no fim (termina em `where d.id = $1::bigint` e uma quebra de linha).

Crie `sql/kaizen/ficha-venda.sql` exatamente assim:

```sql
-- $1: kaizen.documento.id. Um documento em palavras do negócio, igual para a Link e para o ERP novo.
-- O nome vem do cadastro pelo código, de qualquer fonte (os códigos link: não colidem com os do ERP novo).
-- Quantidades e valores saem como texto, para não passar por número de ponto flutuante.
select jsonb_build_object(
  'documento', jsonb_build_object(
    'fonte', d.fonte,
    'codigo', d.codigo,
    'tipo', d.tipo,
    'situacao', d.situacao,
    'movimento', d.movimento,
    'financeiro', d.financeiro,
    'criado_em', d.criado_em,
    'fechado_em', d.fechado_em,
    'pessoa', d.pessoa,
    'pessoa_nome', (select p.nome from kaizen.pessoa p where p.codigo = d.pessoa)
  ),
  'itens', coalesce((
    select jsonb_agg(jsonb_build_object(
      'sentido', ts.valor,
      'produto', i.produto,
      'descricao', (select pr.descricao from kaizen.produto pr where pr.codigo = i.produto),
      'quantidade', i.quantidade::text,
      'valor_liquido', i.valor_liquido::text,
      'vendedor', i.vendedor,
      'vendedor_nome', (select f.nome from kaizen.funcionario f where f.codigo = i.vendedor)
    ) order by i.origem_tabela, length(i.origem_id), i.origem_id)
    from kaizen.documento_item i
    left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'sentido' and ts.codigo = i.sentido
    where i.documento_id = d.id
  ), '[]'::jsonb),
  'pagamentos', coalesce((
    select jsonb_agg(jsonb_build_object(
      'forma', tf.valor,
      'valor', p.valor::text
    ) order by p.origem_tabela, length(p.origem_id), p.origem_id)
    from kaizen.documento_pagamento p
    left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'forma' and tf.codigo = p.forma
    where p.documento_id = d.id
  ), '[]'::jsonb)
) as ficha
from kaizen.documento_negocio d
where d.id = $1::bigint
```

- [ ] **Passo 7: Conferir que os quatro arquivos são os do protótipo**

Rode: `sha256sum sql/link/sem-traducao.sql sql/link/comparar.sql sql/link/resumo.sql sql/kaizen/ficha-venda.sql; grep -c $'\r' sql/link/sem-traducao.sql sql/link/comparar.sql sql/link/resumo.sql sql/kaizen/ficha-venda.sql; wc -l sql/link/sem-traducao.sql sql/link/comparar.sql sql/link/resumo.sql sql/kaizen/ficha-venda.sql`
Saída esperada:
```
ef18f31e0b09a914451c8eeb8c13c118e3285812a958be6aecbf64520f9d7c79 *sql/link/sem-traducao.sql
a33443acf5e53fc7743b1d6a0eedd2d6f2abc1378b1c12172da690694ee27214 *sql/link/comparar.sql
3fcf781f4f4e9531ccf4fc84b512e551dcfc7016436ad06e62d92989cf4d16da *sql/link/resumo.sql
633e44767a033fe781e07c4d83839ab2bd8404c3b0c8a4e1f404c0a62523bc7c *sql/kaizen/ficha-venda.sql
sql/link/sem-traducao.sql:0
sql/link/comparar.sql:0
sql/link/resumo.sql:0
sql/kaizen/ficha-venda.sql:0
   38 sql/link/sem-traducao.sql
   50 sql/link/comparar.sql
  214 sql/link/resumo.sql
   42 sql/kaizen/ficha-venda.sql
  344 total
```
Um hash diferente quer dizer que o arquivo não é o do protótipo (uma linha a mais, um espaço, CRLF, um `;` no fim da ficha): refaça o arquivo a partir do bloco do passo.

- [ ] **Passo 8: Completar `tradutor/link.mts`**

Três peças, e nada mais muda no arquivo.

No topo, o import de `emTransacao` da tarefa 4 passa a trazer também `conectar`:

```ts
import { emTransacao } from './banco.mts'
```

vira

```ts
import { conectar, emTransacao } from './banco.mts'
```

Em `traduzirLink`, entre `const [contagens] = await rodar(cliente, 'gravar')` e `return contagens as unknown as ContagensLink`, as duas conferências de saída, ainda dentro da transação (um `ErroLink` lançado aqui faz o `emTransacao` desfazer tudo):

```ts
    // As duas conferências de saída, ainda dentro da transação: qualquer linha delas desfaz tudo o que foi gravado.
    const semTraducao = await rodar(cliente, 'sem-traducao')
    if (semTraducao.length > 0) {
      const lista = semTraducao.map((l) => `${l.campo} ${l.codigo} (${l.quantos})`).join(', ')
      throw new ErroLink(`código da Link sem tradução: ${lista}`)
    }
    const diferencas = await rodar(cliente, 'comparar')
    if (diferencas.length > 0) {
      const lista = diferencas
        .map((d) => `${d.dia}: vendas ${d.vendas_kaizen} × ${d.vendas_link}, vendido ${d.vendido_kaizen} × ${d.vendido_link}, devolução ${d.devolucao_kaizen} × ${d.devolucao_link}`)
        .join('; ')
      throw new ErroLink(`a comparação com a Link deu diferença em ${diferencas.length} dia(s), Kaizen × Link: ${lista}`)
    }
```

E, no fim do arquivo, depois de `traduzirLink`, o resumo, o comando e a linha que o roda quando o arquivo é chamado direto (`node tradutor/link.mts`); importado pelos testes, `import.meta.main` é falso e nada roda:

```ts
// O resumo lê o que ficou gravado, depois do commit: uma linha por número, na ordem de sql/link/resumo.sql.
export async function resumoLink(cliente: Cliente): Promise<Array<{ chave: string; valor: string }>> {
  const linhas = await rodar(cliente, 'resumo')
  return linhas.map((l) => ({ chave: String(l.chave), valor: String(l.valor) }))
}

// O comando. Devolve o código de saída: 0 quando gravou e imprimiu o resumo; 1 quando falhou.
export async function principalLink(env: Record<string, string | undefined>): Promise<number> {
  const url = env.KAIZEN_URL
  if (!url) {
    console.log('link falhou: falta KAIZEN_URL')
    return 1
  }
  let cliente: Cliente | undefined
  try {
    cliente = await conectar(url)
    const contagens = await traduzirLink(cliente)
    console.log(`link ok: ${Object.entries(contagens).map(([nome, n]) => `${nome}=${n}`).join(', ')}`)
    for (const { chave, valor } of await resumoLink(cliente)) console.log(`${chave}: ${valor}`)
    return 0
  } catch (erro) {
    console.log(`link falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
    return 1
  } finally {
    await cliente?.end().catch(() => undefined)
  }
}

if (import.meta.main) process.exitCode = await principalLink(process.env)
```

O arquivo inteiro fica assim no fim desta tarefa (é a versão final do plano). Se um comentário das partes das tarefas 2 a 6 estiver escrito diferente no repositório, fica o do repositório; o código tem de ser este.

```ts
// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import { conectar, emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// Os arquivos de sql/link têm vários comandos; o pg devolve um resultado por comando, e o que importa é o do último.
async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>> {
  const resultado = (await cliente.query(lerSql(`link/${nome}.sql`))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}

// Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
export async function ligarLink(cliente: Cliente): Promise<void> {
  await rodar(cliente, 'preparar')
  const invalidas = await rodar(cliente, 'ligar')
  if (invalidas.length > 0) {
    const lista = invalidas.map((l) => `${l.entidade} ${l.codigo_origem} → ${l.codigo_kaizen}`).join(', ')
    throw new ErroLink(`decisão da de_para aponta para código que não existe no ERP novo: ${lista}`)
  }
}

// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas', 'caixa', 'contas', 'notas']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    // As duas conferências de saída, ainda dentro da transação: qualquer linha delas desfaz tudo o que foi gravado.
    const semTraducao = await rodar(cliente, 'sem-traducao')
    if (semTraducao.length > 0) {
      const lista = semTraducao.map((l) => `${l.campo} ${l.codigo} (${l.quantos})`).join(', ')
      throw new ErroLink(`código da Link sem tradução: ${lista}`)
    }
    const diferencas = await rodar(cliente, 'comparar')
    if (diferencas.length > 0) {
      const lista = diferencas
        .map((d) => `${d.dia}: vendas ${d.vendas_kaizen} × ${d.vendas_link}, vendido ${d.vendido_kaizen} × ${d.vendido_link}, devolução ${d.devolucao_kaizen} × ${d.devolucao_link}`)
        .join('; ')
      throw new ErroLink(`a comparação com a Link deu diferença em ${diferencas.length} dia(s), Kaizen × Link: ${lista}`)
    }
    return contagens as unknown as ContagensLink
  })
}

// O resumo lê o que ficou gravado, depois do commit: uma linha por número, na ordem de sql/link/resumo.sql.
export async function resumoLink(cliente: Cliente): Promise<Array<{ chave: string; valor: string }>> {
  const linhas = await rodar(cliente, 'resumo')
  return linhas.map((l) => ({ chave: String(l.chave), valor: String(l.valor) }))
}

// O comando. Devolve o código de saída: 0 quando gravou e imprimiu o resumo; 1 quando falhou.
export async function principalLink(env: Record<string, string | undefined>): Promise<number> {
  const url = env.KAIZEN_URL
  if (!url) {
    console.log('link falhou: falta KAIZEN_URL')
    return 1
  }
  let cliente: Cliente | undefined
  try {
    cliente = await conectar(url)
    const contagens = await traduzirLink(cliente)
    console.log(`link ok: ${Object.entries(contagens).map(([nome, n]) => `${nome}=${n}`).join(', ')}`)
    for (const { chave, valor } of await resumoLink(cliente)) console.log(`${chave}: ${valor}`)
    return 0
  } catch (erro) {
    console.log(`link falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
    return 1
  } finally {
    await cliente?.end().catch(() => undefined)
  }
}

if (import.meta.main) process.exitCode = await principalLink(process.env)
```

- [ ] **Passo 9: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-comando.test.mts`
Saída esperada: passa, com `ℹ pass 7`, `ℹ fail 0` e:
```
✔ código da Link sem tradução para o comando com o campo e o código, e nada é gravado
✔ com os casos, a comparação por dia não acha diferença
✔ valor_total_venda que não fecha com os itens para o comando com o dia e os dois números, e nada é gravado
✔ todos os casos juntos: duas rodadas deixam o mesmo conteúdo em todas as tabelas
✔ resumoLink lista os documentos por família, as ligações e as falhas dos casos
✔ o comando imprime link ok e o resumo e sai com 0; sem KAIZEN_URL, sai com 1
✔ a mesma forma: a venda 1992 da Link e o pedido 87 do ERP novo dão fichas com as mesmas chaves e o mesmo vocabulário
```
(cada linha seguida do tempo, entre parênteses). Se o teste 5 falhar, a diferença de `assert.deepEqual` mostra a linha do resumo que mudou; o texto esperado é o que `resumo.sql` escreve para os casos, e não se ajusta o teste ao resultado sem entender a diferença.

- [ ] **Passo 10: Rodar o comando sem `KAIZEN_URL`**

Confere que o arquivo roda como programa e sai com 1 sem tocar em banco nenhum (sem `--env-file`, e com a variável tirada do ambiente).

Rode: `env -u KAIZEN_URL node tradutor/link.mts; echo "saida=$?"`
Saída esperada:
```
link falhou: falta KAIZEN_URL
saida=1
```

- [ ] **Passo 11: Atualizar `testes-esperados.txt` (N = 7)**

Esta tarefa acrescentou 7 `test(` (todos em `tradutor/link-comando.test.mts`). Some ao número atual: 314 + 7 = 321. O arquivo fica com uma única linha:

```text
321
```

- [ ] **Passo 12: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 321 testes com ✔, `ℹ fail 0` (os das tarefas 1 a 6 continuam passando: as conferências de saída não acham nada nos casos, e os testes que chamam `traduzirLink` seguem com o mesmo resultado); última linha `rodou 321 testes, esperados 321`.

- [ ] **Passo 13: Commit**

```bash
git add sql/link/sem-traducao.sql sql/link/comparar.sql sql/link/resumo.sql sql/kaizen/ficha-venda.sql tradutor/link.mts tradutor/link-comando.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Comando da Link: só grava se tudo tiver tradução e cada dia bater com a Link

O comando node --env-file=.env tradutor/link.mts passa a existir. Ele
grava a história da Link numa transação só e, antes do commit, confere
duas coisas: que todo código da Link tem tradução, e que cada dia de
venda bate com a Link em número de vendas, vendido e devolução. Com
qualquer falha, nada é gravado, o comando diz o motivo numa frase (o
campo e o código, ou o dia e os dois números) e sai com 1.

Nos casos reais da cópia antiga: 26 documentos, 57 itens, 22 pagamentos,
os 10 dias das 14 vendas válidas iguais à Link, e duas rodadas deixam
todas as tabelas do Kaizen iguais. O resumo impresso lista os documentos
por família, as ligações (clientes: 10 pelo CPF/CNPJ, 1 pela decisão, 1
falha), as 5 falhas da de_para com o que depende de cada uma, e os 13 de
14 pagamentos que somam venda menos devolução (a exceção é a 100, o troco
de R$ 0,01 que a Link não grava).

A ficha da venda (sql/kaizen/ficha-venda.sql) mostra a venda de junho
1992 da Link e o pedido 87 do ERP novo na mesma forma: pedido, emitido,
saída, recebe, itens de saída com o vendedor do cadastro novo, e as
formas no mesmo vocabulário (pix; dinheiro, pix e crédito).
Testes: rodou 321, esperados 321.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o `git add` pode avisar `LF will be replaced by CRLF` para `testes-esperados.txt` (é só aviso); o hook roda `npm run verificar` e termina com `rodou 321 testes, esperados 321`; o commit sai.


### Tarefa 8: Travas contra uma cópia restaurada pela metade

**O que esta tarefa entrega, em resultado:** o comando da Link para, antes de gravar qualquer coisa, quando a cópia foi restaurada pela metade: uma das 20 tabelas que ele lê está vazia, ou uma venda, um fechamento, uma conta, uma nota ou uma compra aponta para cliente, vendedor ou fornecedor que não está na cópia. Sem isso, o `join` à esquerda gravaria a venda sem cliente ou sem vendedor, e a família de uma tabela vazia sumiria do Kaizen, sem aviso, e a comparação por dia não pegaria (achado da revisão do meio da fase; spec, decisão 10: "uma restauração pela metade ... trocaria a história boa por uma incompleta"). Na cópia antiga e nos casos, nenhuma das 20 tabelas está vazia e nenhuma referência está quebrada (medido em 28/09).

**Arquivos:**
- Criar: `sql/link/referencias.sql`, `tradutor/link-copia.test.mts`
- Modificar: `tradutor/link.mts` (só a função `conferirEntradaLink`), `testes-esperados.txt` (de `321` para `323`)

**Interfaces:**
- Consome: `conferirEntradaLink`, `lerColunasEsperadasLink`, `lerSql` e `ErroLink` de `tradutor/link.mts` (tarefa 2); `traduzirLink` (tarefa 7); `criarLinkFalsa`, `carregarCasosLink` e `lerCasosLink` de `tradutor/link-falsa.mts` (tarefa 2).
- Produz: `conferirEntradaLink` com duas conferências a mais, depois da conferência das negociações (a ordem das mensagens antigas não muda): tabelas vazias e referências quebradas.
- `testes-esperados.txt` passa de `321` para `323`.

**Antes de começar:** rode tudo no Git Bash, a partir de `C:\Projetos\KAIZEN`, com o Postgres local no ar. As colunas que `referencias.sql` lê já estão em `sql/link/colunas-esperadas.txt` (são as que `vendas.sql`, `caixa.sql`, `contas.sql` e `notas.sql` já leem); confira no passo 3. As duas conferências novas vêm **depois** da conferência de "nenhuma negociação", para que os testes das tarefas 2 e 7 que esvaziam `erp.negociacao` continuem recebendo a mesma mensagem.

- [ ] **Passo 1: Escrever o teste**

Crie `tradutor/link-copia.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinkFalsa } from './link-falsa.mts'
import { ErroLink, traduzirLink } from './link.mts'

// Uma cópia restaurada pela metade: tabela vazia, ou venda que aponta para cliente que não está na cópia.
// O comando para antes de gravar; cada teste devolve a Link falsa como era.
let banco: BancoTeste
let falsa: LinkFalsa
before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
  await traduzirLink(banco.cliente)
})
after(async () => {
  await falsa.fechar()
  await banco.fechar()
})

async function documentosDaLink(): Promise<number> {
  const r = await banco.cliente.query(`select count(*)::int as n from kaizen.documento where fonte = 'link'`)
  return r.rows[0].n
}

function erroLink(mensagem: string) {
  return (erro: unknown) => erro instanceof ErroLink && erro.message === mensagem
}

test('uma tabela vazia na cópia para o comando antes de gravar, com a tabela na mensagem', async () => {
  assert.equal(await documentosDaLink(), 26)
  try {
    await falsa.executar('delete from erp.caixa_parcela')
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink('a cópia da Link tem tabelas vazias (caixa_parcela): a restauração deu certo?'),
    )
    assert.equal(await documentosDaLink(), 26)
  } finally {
    await falsa.inserir('caixa_parcela', lerCasosLink().caixa_parcela)
  }
  await traduzirLink(banco.cliente)
})

test('uma venda que aponta para cliente que não está na cópia para o comando antes de gravar', async () => {
  const cliente899 = lerCasosLink().cliente.filter((c) => c.id_cliente === '899')
  assert.equal(cliente899.length, 1)
  try {
    await falsa.executar(`delete from erp.cliente where id_cliente = 899`)
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink('a cópia da Link tem linhas que apontam para o que não está nela: negociacao.id_cliente sem cliente (1). A restauração deu certo?'),
    )
    assert.equal(await documentosDaLink(), 26)
  } finally {
    await falsa.inserir('cliente', cliente899)
  }
  await traduzirLink(banco.cliente)
})
```

A venda de junho 1992 é a única dos casos do cliente 899 (conferido em `tradutor/link-casos.json`).

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/link-copia.test.mts`
Saída esperada: falha, com `ℹ tests 2`, `ℹ fail 2`: nos dois, a rejeição esperada não acontece (`Missing expected rejection`), porque `traduzirLink` grava sem reclamar.

- [ ] **Passo 3: Escrever `sql/link/referencias.sql` e conferir as colunas**

Crie `sql/link/referencias.sql` (um comando só, sem parâmetro e sem `;` no fim):

```sql
select 'negociacao.id_cliente' as onde, 'cliente' as tabela, count(*)::int as quantas
from erp.negociacao n
where n.id_cliente is not null and not exists (select 1 from erp.cliente c where c.id_cliente = n.id_cliente)
union all
select 'negociacao.id_usuario', 'usuario', count(*)::int
from erp.negociacao n
where n.id_usuario is not null and not exists (select 1 from erp.usuario u where u.id_usuario = n.id_usuario)
union all
select 'caixa_fechamento.id_usuario', 'usuario', count(*)::int
from erp.caixa_fechamento f
where f.id_usuario is not null and not exists (select 1 from erp.usuario u where u.id_usuario = f.id_usuario)
union all
select 'pc_lancamento_fonte.id_fornecedor', 'fornecedor', count(*)::int
from erp.pc_lancamento_fonte f
where f.id_fornecedor is not null and not exists (select 1 from erp.fornecedor o where o.id_fornecedor = f.id_fornecedor)
union all
select 'nota_entrada.id_fornecedor', 'fornecedor', count(*)::int
from erp.nota_entrada n
where n.id_fornecedor is not null and not exists (select 1 from erp.fornecedor o where o.id_fornecedor = n.id_fornecedor)
union all
select 'compra.id_fornecedor', 'fornecedor', count(*)::int
from erp.compra c
where c.id_fornecedor is not null and not exists (select 1 from erp.fornecedor o where o.id_fornecedor = c.id_fornecedor)
```

Rode, para conferir que as 10 colunas lidas estão na lista:
```bash
for c in "negociacao id_cliente" "negociacao id_usuario" "cliente id_cliente" "usuario id_usuario" "caixa_fechamento id_usuario" "pc_lancamento_fonte id_fornecedor" "fornecedor id_fornecedor" "nota_entrada id_fornecedor" "compra id_fornecedor"; do grep -c "^$c " sql/link/colunas-esperadas.txt; done
```
Saída esperada: nove linhas `1`.

- [ ] **Passo 4: As duas conferências em `conferirEntradaLink`**

Em `tradutor/link.mts`, na função `conferirEntradaLink`, depois da linha que lança `'a cópia da Link não tem nenhuma negociação: a restauração deu certo?'` e antes do fecho da função, acrescente:

```ts
  // Uma restauração pela metade deixa tabela vazia, ou linha que aponta para quem não está na cópia; o join à esquerda
  // gravaria a venda sem cliente ou sem vendedor, calado. O comando para antes de gravar.
  const tabelas = [...new Set(lerColunasEsperadasLink().map((c) => c.tabela))]
  const vazias: string[] = []
  for (const tabela of tabelas) {
    const tem = await cliente.query(`select exists (select 1 from erp.${tabela}) as tem`)
    if (!tem.rows[0].tem) vazias.push(tabela)
  }
  if (vazias.length > 0) throw new ErroLink(`a cópia da Link tem tabelas vazias (${vazias.join(', ')}): a restauração deu certo?`)
  const quebradas = (await cliente.query(lerSql('link/referencias.sql'))).rows.filter((linha) => linha.quantas > 0)
  if (quebradas.length > 0) {
    const lista = quebradas.map((linha) => `${linha.onde} sem ${linha.tabela} (${linha.quantas})`).join(', ')
    throw new ErroLink(`a cópia da Link tem linhas que apontam para o que não está nela: ${lista}. A restauração deu certo?`)
  }
```

Os nomes das tabelas vêm do arquivo do repositório (`sql/link/colunas-esperadas.txt`), não de fora; `count(*)::int` chega como `number`.

- [ ] **Passo 5: Rodar o teste e ver passar**

Rode: `node --test tradutor/link-copia.test.mts`
Saída esperada: passa, com `ℹ pass 2`, `ℹ fail 0` e:
```
✔ uma tabela vazia na cópia para o comando antes de gravar, com a tabela na mensagem
✔ uma venda que aponta para cliente que não está na cópia para o comando antes de gravar
```

Rode também: `node --test tradutor/link-falsa.test.mts tradutor/link-comando.test.mts`
Saída esperada: `ℹ fail 0` (as mensagens antigas das conferências de entrada não mudaram).

- [ ] **Passo 6: Atualizar `testes-esperados.txt` (N = 2)**

Esta tarefa acrescentou 2 `test(` (em `tradutor/link-copia.test.mts`). 321 + 2 = 323. O arquivo fica com uma única linha:

```text
323
```

- [ ] **Passo 7: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: `tsc -p .` sem nenhuma linha de erro; última linha `rodou 323 testes, esperados 323`.

- [ ] **Passo 8: Commit**

```bash
git add sql/link/referencias.sql tradutor/link.mts tradutor/link-copia.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Link: o comando para antes de gravar uma cópia restaurada pela metade

Se uma das 20 tabelas que o tradutor lê da cópia da Link estiver vazia,
ou se uma venda, um fechamento, uma conta, uma nota ou uma compra apontar
para cliente, vendedor ou fornecedor que não está na cópia, o comando para
e diz o quê, sem gravar nada. Antes, a venda entraria sem cliente ou sem
vendedor, calada, e a comparação por dia não pegaria. Na cópia antiga e
nos casos de teste, nada disso acontece. Testes: rodou 323, esperados 323.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 323 testes, esperados 323`; o commit sai.

### Tarefa 9: Rodada contra a cópia antiga

**O que esta tarefa entrega, em resultado:** a história da Link, da cópia antiga do PC (até 25/09 às 11h51), gravada no banco `kaizen` do Postgres local, pelo comando da tarefa 7, duas vezes, com o mesmo conteúdo nas duas. O registro da rodada fica em `docs/fases/FASE-3-rodada-copia-antiga.md`, com os números que o dono lê no relatório: documentos por família, vendas, itens, ligações, falhas da `de_para`, a comparação por dia sem diferença e a ficha de uma venda de junho.

**Arquivos:**
- Criar: `docs/fases/FASE-3-rodada-copia-antiga.md`
- Fora do repositório (não entram no git): `C:\Projetos\link-copias\erp-antiga-2026-09-28.dump`
- Ler, sem mudar: o resto do repositório. Nenhum código muda nesta tarefa; se algum número sair diferente do esperado, pare e relate (status `DONE_WITH_CONCERNS` ou `BLOCKED`), sem corrigir código.

**Interfaces:**
- Consome: o comando `node --env-file=.env tradutor/link.mts` (tarefa 7), `sql/kaizen/ficha-venda.sql` (tarefa 7), o comando da Fase 2 `node --env-file=.env tradutor/principal.mts hora --manual`, que aplica as migrações que faltam (a 006 e a 007) e relê o cadastro do ERP novo, só lendo o ERP.
- Produz: o banco `kaizen` do PC com o esquema `erp` (cópia antiga) e a história da Link no `kaizen`; o registro da rodada.
- `testes-esperados.txt` continua `323`.

**Antes de começar:** rode tudo no Git Bash, a partir de `C:\Projetos\KAIZEN`, com o Postgres local no ar (`docker compose up -d --wait`) e o container `link_postgres` no ar (`docker ps` mostra os dois). Use `export MSYS_NO_PATHCONV=1` antes dos comandos `docker` com caminho `/tmp`, senão o Git Bash troca o caminho. No `link_postgres` só se roda `pg_dump`. Nunca abra nem imprima o `.env`. Nenhum comando desta tarefa tem `drop` ou `truncate`: a restauração usa `pg_restore --clean --if-exists`, que troca o esquema `erp` do banco `kaizen` do PC (a cópia local, não a Link).

- [ ] **Passo 1: Conferir o ponto de partida**

Rode: `git status --short && git log --oneline -1 && npm run verificar 2>&1 | tail -1`
Saída esperada: nada no `git status`; o último commit é o da tarefa 8; `rodou 323 testes, esperados 323`.

- [ ] **Passo 2: Aplicar as migrações e reler o cadastro do ERP novo**

Rode: `node --env-file=.env tradutor/principal.mts hora --manual`
Saída esperada: uma linha `hora ok: ...` ou `hora aviso: ...`, e código de saída 0. Depois:

Rode: `docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -At -c "select nome from kaizen.migracao order by nome" -c "select count(*) from kaizen.produto where fonte = 'meuerp'"`
Saída esperada: as 7 migrações, de `001_estrutura.sql` a `007_de_para_link.sql`, e um número de produtos maior ou igual a `1029`.

Se o ERP estiver fora do ar (`hora falha: ... o ERP não respondeu`), as migrações já foram aplicadas antes da leitura: confira com a mesma consulta e siga.

- [ ] **Passo 3: Tirar a cópia antiga do `link_postgres`**

Rode:
```bash
export MSYS_NO_PATHCONV=1
mkdir -p /c/Projetos/link-copias
docker exec link_postgres pg_dump -U link -d prumo -n erp -Fc -f /tmp/erp-antiga.dump
docker cp link_postgres:/tmp/erp-antiga.dump /c/Projetos/link-copias/erp-antiga-2026-09-28.dump
sha256sum /c/Projetos/link-copias/erp-antiga-2026-09-28.dump
docker exec kaizen-postgres-1 true && docker cp /c/Projetos/link-copias/erp-antiga-2026-09-28.dump kaizen-postgres-1:/tmp/erp-antiga.dump
docker exec kaizen-postgres-1 pg_restore --list /tmp/erp-antiga.dump | grep -c "TABLE DATA erp"
```
Saída esperada: o sha256 do arquivo (anote para o registro) e `26`.

- [ ] **Passo 4: Restaurar no banco `kaizen` do Postgres local e dar a leitura ao `kaizen`**

Rode:
```bash
export MSYS_NO_PATHCONV=1
docker exec kaizen-postgres-1 pg_restore -U postgres -d kaizen --clean --if-exists --no-owner --no-acl /tmp/erp-antiga.dump
docker exec kaizen-postgres-1 psql -U postgres -d kaizen -c "grant usage on schema erp to kaizen" -c "grant select on all tables in schema erp to kaizen"
docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -At -c "select count(*), max(data) from erp.negociacao" -c "select count(*) from information_schema.tables where table_schema = 'erp'"
```
Saída esperada: `5282|2026-09-25 11:51:03...` e `26`. (O `pg_restore` pode avisar que o esquema não existia na primeira vez; não é erro.)

- [ ] **Passo 5: A foto do Kaizen antes da primeira rodada da Link**

Crie o arquivo de consulta fora do repositório, em `/c/Projetos/link-copias/foto.sql`, com a ferramenta de escrita de arquivos, com este conteúdo:

```sql
-- Fotografia do conteúdo: por tabela, linhas e md5 das linhas ordenadas, sem id, parcela_id, documento_id e lido_em
-- (o filho leva a chave de origem do pai no lugar do id). A última linha fotografa id e visto_em dos documentos.
with d as (select id, fonte, origem_tabela, origem_id from kaizen.documento),
foto (tabela, linha) as (
  select 'documento', concat_ws('|', k.fonte, k.origem_tabela, k.origem_id, k.codigo, k.modelo, k.status, k.movimento, k.financeiro, k.criado_em, k.fechado_em, k.pessoa, k.turno_caixa, k.turno_usuario, k.turno_numero) from kaizen.documento k
  union all
  select 'documento_item', concat_ws('|', d.fonte, d.origem_tabela, d.origem_id, i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor) from kaizen.documento_item i join d on d.id = i.documento_id
  union all
  select 'documento_pagamento', concat_ws('|', d.fonte, d.origem_tabela, d.origem_id, p.origem_tabela, p.origem_id, p.forma, p.valor) from kaizen.documento_pagamento p join d on d.id = p.documento_id
  union all
  select 'parcela', concat_ws('|', d.fonte, d.origem_tabela, d.origem_id, p.origem_tabela, p.origem_id, p.lancado_em, p.vencimento, p.valor, p.status, p.descricao) from kaizen.parcela p join d on d.id = p.documento_id
  union all
  select 'baixa', concat_ws('|', d.fonte, d.origem_tabela, d.origem_id, p.origem_tabela, p.origem_id, b.origem_tabela, b.origem_id, b.pago_em, b.valor, b.forma, b.status) from kaizen.baixa b join kaizen.parcela p on p.id = b.parcela_id join d on d.id = p.documento_id
  union all
  select 'conferencia_caixa', concat_ws('|', d.fonte, d.origem_tabela, d.origem_id, c.origem_tabela, c.origem_id, c.forma, c.calculado, c.informado) from kaizen.conferencia_caixa c join d on d.id = c.documento_id
  union all
  select 'produto', concat_ws('|', fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo) from kaizen.produto
  union all
  select 'pessoa', concat_ws('|', fonte, codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo) from kaizen.pessoa
  union all
  select 'funcionario', concat_ws('|', fonte, codigo, nome, usuario, tipo, ativo) from kaizen.funcionario
  union all
  select 'de_para', concat_ws('|', entidade, fonte, codigo_origem, codigo_kaizen) from kaizen.de_para
  union all
  select 'traducao', concat_ws('|', fonte, campo, codigo, valor) from kaizen.traducao
  union all
  select 'documento (id e visto_em)', concat_ws('|', fonte, origem_tabela, origem_id, id, visto_em) from kaizen.documento
)
select tabela, count(*) as linhas, md5(string_agg(linha, E'\n' order by linha collate "C")) as md5
from foto
group by tabela
order by tabela
```

Rode: `docker exec -i kaizen-postgres-1 psql -U kaizen -d kaizen < /c/Projetos/link-copias/foto.sql > /c/Projetos/link-copias/foto-0.txt && cat /c/Projetos/link-copias/foto-0.txt`
Saída esperada: uma linha por tabela; os documentos são só os do ERP novo.

- [ ] **Passo 6: Primeira rodada do comando da Link**

Rode: `node --env-file=.env tradutor/link.mts | tee /c/Projetos/link-copias/rodada-1.txt; echo "saida=${PIPESTATUS[0]}"`
Saída esperada: a primeira linha é
```
link ok: documentos=6155, novos=6155, itens=15220, pagamentos=5980, conferencias=632, parcelas=221, baixas=127
```
seguida do resumo, com, entre outras, estas linhas:
```
documentos:pedido: 5278
documentos:orcamento: 4
documentos:fechamento_caixa: 158
documentos:sangria: 419
documentos:suprimento: 157
documentos:conta_pagar: 88
documentos:nota_entrada: 51
vendas_validas: 5244
vendas_canceladas: 34
itens_vendidos: 14636
itens_devolvidos: 54
itens_de_nota: 530
pagamentos_batem: 5243 de 5244 vendas válidas somam venda − devolução
parcelas_pendentes: 94, R$ 245.864,76
baixas: 127, R$ 380.070,75
ligacoes:produto: regra 782, decisão 0, falha 6
ligacoes:cliente: regra 335, decisão 7, falha 1
ligacoes:fornecedor: regra 19, decisão 0, falha 1
ligacoes:vendedor: regra 3, decisão 0, falha 3
dias_comparados: 141
```
e `saida=0`. Se o cadastro do ERP novo tiver mudado desde 27/09, as ligações podem mudar; nesse caso relate os números obtidos e a diferença, sem corrigir nada.

- [ ] **Passo 7: Segunda rodada e a foto das duas**

Rode:
```bash
docker exec -i kaizen-postgres-1 psql -U kaizen -d kaizen < /c/Projetos/link-copias/foto.sql > /c/Projetos/link-copias/foto-1.txt
node --env-file=.env tradutor/link.mts > /c/Projetos/link-copias/rodada-2.txt; echo "saida=$?"
head -1 /c/Projetos/link-copias/rodada-2.txt
docker exec -i kaizen-postgres-1 psql -U kaizen -d kaizen < /c/Projetos/link-copias/foto.sql > /c/Projetos/link-copias/foto-2.txt
diff /c/Projetos/link-copias/foto-1.txt /c/Projetos/link-copias/foto-2.txt && echo "fotos iguais"
diff <(tail -n +2 /c/Projetos/link-copias/rodada-1.txt) <(tail -n +2 /c/Projetos/link-copias/rodada-2.txt) && echo "resumos iguais"
```
Saída esperada: `saida=0`; `link ok: documentos=6155, novos=0, itens=15220, pagamentos=5980, conferencias=632, parcelas=221, baixas=127`; `fotos iguais`; `resumos iguais`.

- [ ] **Passo 8: A ficha da venda de junho 1992**

Rode:
```bash
ID=$(docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -At -c "select id from kaizen.documento where fonte = 'link' and origem_tabela = 'negociacao' and origem_id = '1992'")
(echo "prepare ficha(bigint) as"; cat sql/kaizen/ficha-venda.sql; echo ";"; echo "execute ficha($ID);") | docker exec -i kaizen-postgres-1 psql -U kaizen -d kaizen -At > /c/Projetos/link-copias/ficha-1992.json
cat /c/Projetos/link-copias/ficha-1992.json
```
Saída esperada: um JSON com o documento (`tipo` pedido, `situacao` emitido, `movimento` saida, `financeiro` recebe, criado em 17/06/2026), dois itens de sentido `saida` do vendedor `1` (valores `90.365760772` e `59.634246`) e um pagamento `pix` de `150.00`.

- [ ] **Passo 9: Escrever o registro da rodada**

Crie `docs/fases/FASE-3-rodada-copia-antiga.md`, em português, com:
- título "Fase 3 — rodada contra a cópia antiga da Link";
- quando (data e hora de Fortaleza), o commit (`git log --oneline -1`), de onde veio a cópia (`link_postgres`, esquema `erp`, última venda em 25/09 às 11h51) e o sha256 do dump do passo 3;
- a primeira linha das duas rodadas e o resumo inteiro da primeira, num bloco de código;
- as duas fotos iguais (a `foto-2.txt` num bloco) e a frase "rodar duas vezes não duplica: as fotos da primeira e da segunda rodada são iguais";
- a ficha da venda 1992, num bloco;
- uma seção "O que falta da cópia final", com uma linha: a tarde de 25/09 e o fechamento do turno 190, que chegam com a cópia final em 29/09 (tarefa 11).

Não copie para o registro nomes de pessoas físicas; o resumo traz nomes de empresa e de produto, que podem ficar.

- [ ] **Passo 10: Commit**

```bash
git add docs/fases/FASE-3-rodada-copia-antiga.md
git commit -F - <<'EOF'
Fase 3: a história da Link, da cópia antiga, gravada no Kaizen do PC

O comando da Link rodou duas vezes contra a cópia antiga (até 25/09 às
11h51): 6.155 documentos, 5.244 vendas válidas, 15.220 itens e 5.980
pagamentos. Todos os produtos das vendas ligam ao cadastro novo; falham
6 produtos sem venda, 1 cliente (R$ 60,00), o fornecedor padrão e os 3
usuários de teste, que ficam na de_para. A comparação por dia com a Link
deu zero diferença em 141 dias, e as duas rodadas deixaram o mesmo
conteúdo. Testes: rodou 323, esperados 323.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 323 testes, esperados 323`; o commit sai.


### Tarefa 10: Fechamento da construção (orquestrador)

**O que esta tarefa entrega, em resultado:** a construção da Fase 3 fechada nesta sessão: a mesma forma provada com uma venda do ERP novo de 28/09 em diante, a revisão final da branch, as decisões e lições registradas, o relatório do dono com o passo a passo da cópia final e o `/goal` da rodada final, a auditoria de fase e a branch `fase-3` mesclada em `main` e enviada ao GitHub. Quem faz é o orquestrador, não o implementador.

**Arquivos:**
- Modificar: `docs/fases/FASE-3-rodada-copia-antiga.md` (seção "A mesma forma"), `docs/DECISOES.md` (seção "Fase 3"), `docs/LICOES.md` (seção "Fase 3")
- Criar: `docs/fases/FASE-3-relatorio.md`
- Criado pelo auditor: `docs/fases/FASE-3-auditoria.md`

**Antes de começar:** as tarefas 1 a 9 com linha `complete` no ledger.

- [ ] **Passo 1: A mesma forma, com uma venda do ERP novo de 28/09 em diante**

Depois que a loja vender (a partir das 8h de 28/09), rode `node --env-file=.env tradutor/principal.mts hora --manual` (só lê o ERP) e escolha um pedido `PA` emitido de 28/09 em diante:

```bash
docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -At -c "select id, codigo, criado_em from kaizen.documento_negocio where fonte = 'meuerp' and tipo = 'pedido' and situacao = 'emitido' and criado_em >= '2026-09-28' order by criado_em limit 3"
```

Rode a `ficha-venda.sql` para ele (como no passo 8 da tarefa 9) e acrescente ao registro da rodada a seção "A mesma forma": as duas fichas lado a lado (a 1992 da Link e a do ERP novo) e uma frase dizendo o que é igual (as chaves, o tipo, a situação, o movimento, o financeiro, o vendedor com nome, as formas no mesmo vocabulário) e o que difere por ser outro fato (valores, produtos, datas; e a descrição vazia do produto no ERP novo, que é o bug da Fase 2 registrado na spec, seção 13). Commit do registro.

- [ ] **Passo 2: Revisão final da branch**

Pacote da branch inteira (`bash .claude/skills/subagent-driven-development/scripts/review-package <plano> <merge-base> HEAD`) e um revisor final no modelo mais capaz, com o ledger (achados menores guardados e decisões). Uma rodada de correção, uma re-revisão. Se algum arquivo de `tradutor/` ou `sql/` mudar depois da tarefa 9, a rodada da tarefa 9 roda de novo (passos 6 e 7) e o registro é atualizado (`docs/LICOES.md`, Fase 2: o ensaio é o último passo).

- [ ] **Passo 3: `docs/DECISOES.md`, seção "Fase 3"**

Uma entrada por decisão que o dono poderia querer tomar, no formato do arquivo (data · fase · o quê · por quê · o que muda se estiver errado), no mínimo: as decisões 1 a 10 da spec que mudam o que a spec da Fase 2 dizia (códigos do cadastro novo nos documentos; `link:` para o que só existe na Link; a `de_para` com decisões e falhas; as 22 decisões gravadas; o devolvido sem arredondar e a comparação linha a linha; os sinais dos pagamentos; a situação pelo modelo; o comando fora da `execucao`; a comparação como trava antes do commit; as colunas de conta e sinal que não entraram; a foto do estoque e as planilhas que não entraram; as bonificações fora das contas); a restauração da cópia no banco `kaizen` do PC; "28/09 em diante" no lugar de "outubro" no "pronto quando"; a rodada final como última tarefa aberta; as 11 falhas da `de_para` à espera do dono; e as decisões tomadas durante a execução (rulings do ledger).

- [ ] **Passo 4: `docs/LICOES.md`, seção "Fase 3"**

O que deu errado nesta fase e que regra evitaria, com evidência. Mudança de método só em commit separado começando com `método:`, no máximo três, cada uma citando a lição.

- [ ] **Passo 5: O relatório do dono**

`docs/fases/FASE-3-relatorio.md`, em português, por números, para quem não lê código: o que ficou pronto; os números da rodada (documentos por família, vendas por mês com o vendido e a devolução, ligações, falhas da `de_para` com o valor de cada uma); a mesma forma; os testes (comando e contagem); o que falta (a rodada final) e o que é do dono (as falhas da `de_para`, conferir os meses com os relatórios da Link, o bug da descrição da Fase 2); o **passo a passo para restaurar a cópia final no Postgres do PC em 29/09**, comando por comando, no PowerShell, com o que cada um deve mostrar:

1. Guardar o arquivo em `C:\Projetos\link-copias\erp-link-2026-09-28.dump` (fora do repositório).
2. `Get-FileHash C:\Projetos\link-copias\erp-link-2026-09-28.dump -Algorithm SHA256` → `449EA8AA005EF7A9E76B3AA28EE596309201B3406FA6A9C6A8D061A76233C1EF`. Se for outro, parar.
3. `docker cp C:\Projetos\link-copias\erp-link-2026-09-28.dump kaizen-postgres-1:/tmp/erp-final.dump`
4. `docker exec kaizen-postgres-1 pg_restore --list /tmp/erp-final.dump | Select-String "TABLE DATA erp" | Measure-Object` → `Count : 26`.
5. `docker exec kaizen-postgres-1 pg_restore -U postgres -d kaizen --clean --if-exists --no-owner --no-acl /tmp/erp-final.dump`
6. `docker exec kaizen-postgres-1 psql -U postgres -d kaizen -c "grant usage on schema erp to kaizen" -c "grant select on all tables in schema erp to kaizen"`
7. `docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -c "select count(*), max(data) from erp.negociacao"` → mais de 5.282 negociações, a última depois de 25/09 às 11h51.

E, no fim, o `/goal` curto da rodada final (tarefa 11), pronto para colar numa sessão nova.

- [ ] **Passo 6: Auditoria de fase**

Despachar o `auditor-de-fase` (sem passar `model`), dizendo que audita a **construção** da Fase 3, que a rodada contra a cópia final (tarefa 11) fica aberta de propósito, pelo `/goal` do dono, e que ele escreve `docs/fases/FASE-3-auditoria.md` com o veredito. Se reprovar, corrigir pelo ciclo normal (implementador e revisor) e despachar de novo; na segunda reprovação do mesmo item sem ideia nova, parar (`docs/AUTONOMIA.md`, paradas).

- [ ] **Passo 7: Mesclar e enviar**

`superpowers:finishing-a-development-branch`: `git checkout main && git merge --no-ff fase-3`, `npm run verificar` em `main` (`rodou 323 testes, esperados 323`), `git push origin main`. O ledger da fase fica no disco (a tarefa 11 continua aberta nele).


### Tarefa 11: Rodada contra a cópia final (29/09, sessão nova; fica aberta ao fim da sessão de 28/09)

**O que esta tarefa entrega, em resultado:** a história da Link no Kaizen do PC passa a ser a da cópia final (até o fim de 25/09, com o fechamento do turno 190), com os mesmos números conferidos da tarefa 9 e a diferença para a cópia antiga explicada. Com ela, o "pronto quando" da Fase 3 no `OBJETIVO.md` fica cumprido no PC.

**Arquivos:**
- Criar: `docs/fases/FASE-3-rodada-copia-final.md`
- Modificar: `docs/fases/FASE-3-relatorio.md` (seção "Rodada final"), `docs/DECISOES.md` (se a rodada pedir decisão)

**Pré-condição:** o dono já restaurou a cópia final no banco `kaizen` do Postgres do PC, pelo passo a passo do relatório (tarefa 10, passo 5), com o sha256 conferido. Se a consulta do passo 1 mostrar a cópia antiga (5.282 negociações, a última às 11h51 de 25/09), a restauração não foi feita: escreva isso no relatório e pare.

**Antes de começar:** sessão nova, na branch `fase-3-final` criada a partir de `main`. Nenhum código muda. Se o comando parar (coluna faltando, código sem tradução, diferença na comparação), a correção é uma migração ou uma linha na lista de colunas, com teste, pelo ciclo normal (implementador e revisor), e a rodada recomeça.

- [ ] **Passo 1: Conferir a restauração**

Rode: `docker exec kaizen-postgres-1 psql -U kaizen -d kaizen -At -c "select count(*), max(data) from erp.negociacao" -c "select count(*) from information_schema.tables where table_schema = 'erp'" -c "select id_caixa_fechamento, data_hora from erp.caixa_fechamento where id_caixa_fechamento = 190"`
Saída esperada: mais de 5.282 negociações, a última depois das 11h51 de 25/09; `26`; o turno 190 com `data_hora` preenchida.

- [ ] **Passo 2: Migrações e cadastro do ERP novo**

Rode: `node --env-file=.env tradutor/principal.mts hora --manual` (só lê o ERP).
Saída esperada: `hora ok` ou `hora aviso`, código 0.

- [ ] **Passo 3: Duas rodadas e as fotos**

Os passos 5 a 7 da tarefa 9, com os arquivos `/c/Projetos/link-copias/foto.sql` e as saídas em `/c/Projetos/link-copias/final-*.txt`. Saída esperada: `link ok` nas duas; na segunda, `novos=0`; `fotos iguais`; `resumos iguais`; `dias_comparados` maior ou igual a 141, sem diferença.

- [ ] **Passo 4: A diferença para a cópia antiga**

Compare o resumo desta rodada com o da tarefa 9 (`docs/fases/FASE-3-rodada-copia-antiga.md`) e explique cada número que mudou. O esperado: mais vendas e itens de 25/09 (a tarde), mais pagamentos, o turno 190 fechado (`turnos_abertos` de 3 para 2), talvez sangrias do fim do dia; as ligações e as falhas da `de_para` iguais, salvo cliente novo de 25/09.

- [ ] **Passo 5: Registro, relatório e fechamento**

Escreva `docs/fases/FASE-3-rodada-copia-final.md` como o registro da tarefa 9, atualize a seção "Rodada final" do relatório da fase com os números e a frase "a Fase 3 está pronta", commit, mescle `fase-3-final` em `main` com `npm run verificar` passando e `git push origin main`. Marque esta tarefa `complete` no ledger.

