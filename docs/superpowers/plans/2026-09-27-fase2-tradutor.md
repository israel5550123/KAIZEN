# Fase 2 — Tradutor do ERP novo: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development para executar este plano tarefa por tarefa, na branch `fase-2`, com os subagentes `implementador` e `revisor` de `.claude/agents/` (sem passar `model` na chamada; `docs/AUTONOMIA.md`). Os passos usam caixas (`- [ ]`) para o acompanhamento.

**Objetivo:** levar as vendas, o estoque e o a pagar do ERP novo para o esquema próprio `kaizen`. A leitura roda de hora em hora na VPS, com registro de cada execução, aviso pelo Telegram quando falha e conferência noturna contra o próprio ERP.

**Arquitetura:**
- **Leitura:** um tradutor em TypeScript (Node 24, sem compilação) lê o ERP só por SELECT no endpoint `consulta/sql`. É uma consulta por assunto, e cada uma devolve um JSON em texto.
- **Gravação:** esse texto vai direto ao Postgres do Kaizen, que o grava numa transação. Os códigos do ERP ficam crus, e uma tabela de tradução diz o que cada um significa.
- **Execução:** o tradutor roda num container com `crond`, numa stack própria na VPS.
- **Testes:** `node:test` contra um Postgres local e um ERP falso gerado da lista de colunas que o tradutor lê.

**Tecnologia:** Node `24.18.0` (arquivos `.mts` rodados direto), `pg` `8.23.0`, TypeScript `7.0.2` (só para conferir tipos), Postgres 16 (Kaizen) e 14.17 (ERP), Docker Swarm, API do Telegram.

**Spec:** `docs/superpowers/specs/2026-09-27-fase2-esquema-e-tradutor-design.md`. O plano argumenta a partir dela, e quem executa lê as duas.

## Restrições globais

Valem para toda tarefa, mesmo quando ela não as repete.

**Versões**
- Node `v24.18.0` exato, no PC e na imagem `node:24.18.0-alpine`.
- `pg@8.23.0`; em desenvolvimento, `typescript@7.0.2`, `@types/pg@8.23.1` e `@types/node@24.19.0`, todos com `--save-exact`.
- TypeScript só com sintaxe apagável: nada de `enum`, `namespace`, nem parâmetro de construtor com `public`/`private`. Imports com a extensão `.mts`, e `import type` para tipos.

**Língua e commits**
- Português em tudo: nomes (camelCase no código, snake_case no banco), testes, mensagens, comentários e commits.
- Commit pelo resultado, com `git commit -F -` e heredoc no Git Bash, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nunca `git add -A` nem `git add .`: sempre os caminhos da tarefa.

**ERP, só leitura**
- Nada escreve no ERP. O ERP só recebe SELECT, pelo cliente travado da tarefa 4.
- Nada toca o esquema `erp` (a cópia final da Link).

**Números e datas**
- Nenhum valor de dinheiro, quantidade ou data do ERP passa por `number` ou `Date` do JavaScript. Os números saem do ERP como texto (`::text`), e o JSON vai como texto ao Postgres do Kaizen (`$n::jsonb`).
- Contagens e `oid` podem ser `number`.
- Fuso `America/Fortaleza`: a sessão do Postgres do Kaizen é fixada ao conectar, e o Node calcula dias e horas com −3 h fixo.

**Consultas ao ERP (`sql/erp/`)**
- Um único comando por arquivo, com a coluna de saída `dados`.
- Sem comentário, sem `;` e sem sintaxe do Postgres 15 ou 16. Todo `json_agg` vai dentro de `coalesce(..., '[]')`.

**Testes**
- Só conectam em `localhost:5434` (`garantirLocal`). O Postgres local sobe com `docker compose up -d --wait`.
- O hook de commit roda `npm run verificar` (tipos e testes).
- `testes-esperados.txt`: cada tarefa soma os testes que acrescentou. No fim da tarefa 18, o total é **274**.

**Arquivos e comandos do dono**
- Não mexer e não commitar: `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `CLAUDE.md`, `OBJETIVO.md` e `docs/AUTONOMIA.md`.
- `docs/DECISOES.md` e `docs/LICOES.md` só recebem entradas novas, nas tarefas que dizem isso.
- O gancho `.claude/hooks/guarda-bash.js` recusa todo comando Bash que contenha, entre outros, o texto do comando que remove stack ou serviço do Docker. Arquivos que citam esse texto (o roteiro e o seu teste, na tarefa 17) são criados com a ferramenta de escrita de arquivos, nunca por `cat`/heredoc.
- Segredos: nunca abra nem imprima o `.env`. Ele guarda o token do ERP e só é lido pelo Node com `--env-file=.env`.
- Quem implementa não tem acesso à VPS e não roda nada lá. Quem implanta é o dono, pelo roteiro da tarefa 17.

## Foco da revisão

Os casos que a spec implica e que mais podem pegar o dono de surpresa. Cada um tem um teste na tarefa dona do código:

1. **Linha gravada fora de ordem no ERP** (dois caixas ao mesmo tempo, caixa sem internet sincronizando). A leitura da hora relê com a folga de 200 `oid`, e nada se perde. Teste da tarefa 13: "a folga de 200 relê o documento e o movimento gravados fora de ordem".
2. **Falha que continua por horas** (ERP fora uma manhã inteira). Sai uma mensagem só no Telegram e outra quando voltar. Testes da tarefa 13: "falha que continua por várias horas manda uma mensagem só" e "falha e depois ok manda a mensagem de volta".
3. **Resposta do ERP vazia ou cortada.** Nada é apagado do Kaizen, e a execução falha com aviso. Testes: tarefa 13, "lista de vivos vazia com 25 documentos no Kaizen é falha, e nada é apagado"; tarefa 14, "movimentos que somem todos de uma vez são falha, e nada é apagado".
4. **Loja sem nenhum documento** (primeira execução, domingo, ensaio antes da primeira venda). As listas vêm vazias, e não nulas, e nada falha. Testes: tarefa 6, "documento sem filhos traz as listas vazias, e não null"; tarefa 8, "documento com as listas vazias grava só o cabeçalho"; tarefa 9, `podeApagar` com 0 e 0.
5. **A noite de Fortaleza, que já é outro dia em UTC** (22h = 01h UTC). Janela, última noite boa e "hoje" usam o dia de Fortaleza. Testes: tarefa 10, "emFortaleza: 01h30 em UTC ainda é 22h30 do dia anterior em Fortaleza"; tarefa 12, "ultimaNoiteBoa devolve o dia de Fortaleza da última noite ok ou aviso, mesmo começada às 22h30 (01h30 em UTC)".

## Tarefas

| # | Tarefa | Testes novos | Quem faz |
| --- | --- | --- | --- |
| 1 | Fundação do repositório e Postgres local | 7 | implementador |
| 2 | Estrutura do banco e migrações | 11 | implementador |
| 3 | Estoque da virada | 3 | implementador |
| 4 | Trava de só leitura e cliente do ERP | 23 | implementador |
| 5 | ERP falso e consultas simples | 28 | implementador |
| 6 | Consulta de documentos | 17 | implementador |
| 7 | Consultas de estoque e cadastros, e a leitura | 18 | implementador |
| 8 | Carga dos documentos | 17 | implementador |
| 9 | Carga de apagados, estoque e cadastros | 11 | implementador |
| 10 | Janela, horários e textos dos avisos | 31 | implementador |
| 11 | Conferências | 13 | implementador |
| 12 | Registro e Telegram | 31 | implementador |
| 13 | Execução da hora e o comando | 25 | implementador |
| 14 | Execução da noite e comparação de totais | 16 | implementador |
| 15 | Casos reais de ponta a ponta | 13 | implementador |
| 16 | Comando de conferência do dono | 4 | implementador |
| 17 | Publicação na VPS (arquivos e roteiro; não implanta) | 4 | implementador |
| 18 | Ensaio com o ERP de verdade | 2 | implementador |
| 19 | Conferências da operação real | — | implementador |
| 20 | Fechamento da fase e implantação preparada para o dono | — | orquestrador |

A ordem importa: cada tarefa usa o que as anteriores criaram, com os nomes das seções "Interfaces".

---

### Tarefa 1: Fundação do repositório e Postgres local

**O que esta tarefa entrega, em resultado:** o repositório passa a proteger arquivos de segredo, tem um Postgres 16 local (porta 5434) que cria sozinho o usuário `kaizen` (sem superusuário) e o esquema `kaizen`, uma conexão ao banco que fixa o fuso de Fortaleza e recebe datas, valores e quantidades como texto (nada arredonda), uma transação que desfaz tudo quando algo falha, e um `npm test` que confere quantos testes rodaram. A partir daqui, todo commit roda tipos e testes antes.

**Arquivos:**
- Modificar: `.gitignore` (acrescentar 4 linhas no fim; as 2 linhas que já existem, `.claude/skills/` e `.env`, ficam)
- Criar: `.gitattributes`
- Criar: `sql/criar-usuario-e-esquema.sql`
- Criar: `sql/local/iniciar.sh`
- Criar: `docker-compose.yml`
- Criar: `package.json`
- Criar (gerado pelo `npm install`, não à mão): `package-lock.json`
- Criar: `tsconfig.json`
- Criar: `tradutor/banco.mts`
- Testar: `tradutor/banco.test.mts`
- Criar: `ferramentas/testar.mts`
- Criar: `testes-esperados.txt`
- Criar: `.githooks/pre-commit`
- **Não mexer:** `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `CLAUDE.md`, `OBJETIVO.md` e `docs/AUTONOMIA.md` são do dono (`docs/AUTONOMIA.md`, "Limites"). As travas mecânicas deles já valem neste repositório.
- Não criar: `README.md` (o repositório não ganha README nesta tarefa) nem nenhum `.env` (e não abra o `.env` que já existe: ele guarda o token do ERP).

**Interfaces:**
- Consome: nada; é a primeira tarefa. O repositório hoje tem `.gitignore` (2 linhas), `CLAUDE.md`, `OBJETIVO.md` e `docs/`.
- Produz (as tarefas seguintes usam exatamente isto):
  ```ts
  // tradutor/banco.mts
  import pg from 'pg'
  export type Cliente = pg.Client
  // No carregamento do módulo: pg.types.setTypeParser para 1114 (timestamp), 1184 (timestamptz),
  // 1082 (date), 1700 (numeric) e 20 (int8) devolverem o texto cru.
  export function garantirLocal(url: string): void
  // lança Error('recusado: só localhost:5434 nos testes') se o host não for localhost/127.0.0.1,
  // se a porta não for 5434 (inclusive sem porta) ou se o endereço for inválido
  export async function conectar(url: string): Promise<Cliente>
  // conecta e roda `set time zone 'America/Fortaleza'`; não chama garantirLocal (na VPS o endereço é outro)
  export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>
  // begin; fazer; commit; em erro: rollback (ignorando erro do rollback) e relança o mesmo erro.
  // Se o commit voltar como ROLLBACK (um comando falhou lá dentro e o erro foi engolido), lança
  // Error('a transação foi desfeita pelo Postgres: um comando falhou dentro dela').
  ```
- Consequências dos parsers, que valem para todo o código: `count(*)` e qualquer `bigint` chegam como texto (`'3'`), e só contagens e `oid` viram `number` (com `Number()`); `numeric` chega como texto e fica texto; `timestamp`, `timestamptz` e `date` chegam como o texto do Postgres com a sessão em `America/Fortaleza` (ex.: `'2026-09-28 14:00:03.123-03'`); `json`/`jsonb` chegam já como objeto JS. Um `count(*)::int` chega como `number`.
- Comandos que passam a existir: `npm test` (roda todos os `*.test.mts` de `tradutor/` e `ferramentas/`, imprime `rodou N testes, esperados M` e sai com erro se algum falhar ou se N ≠ M), `npm run tipos` (`tsc -p .`), `npm run verificar` (tipos e testes), `npm run preparar` (liga o hook), e um arquivo só: `node --test tradutor/<arquivo>.test.mts`.
- `testes-esperados.txt` termina esta tarefa com `7`.

**Antes de começar:** rode tudo a partir da raiz do repositório, `C:\Projetos\KAIZEN`. Os commits usam `git commit -F -` com heredoc, então rode-os no Git Bash. Precisa do Docker Desktop no ar e da porta 5434 livre. Nada nesta tarefa fala com o ERP.

**Pré-condição:** a árvore pode ter pendentes os arquivos do modo autônomo, que são do dono: `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `CLAUDE.md`, `OBJETIVO.md`, `docs/AUTONOMIA.md` e `docs/LICOES.md` (e `docs/DECISOES.md`, que só o orquestrador commita). Nunca os inclua num commit desta tarefa. Todo `git add` desta tarefa usa os caminhos listados, nunca `git add -A` nem `git add .`. Nas saídas esperadas de `git status --short` abaixo, as linhas desses arquivos podem aparecer a mais e ficam de fora.

- [ ] **Passo 1: Proteger os segredos antes de qualquer outra coisa**

Regra do projeto: segredo só depois de o `.gitignore` provar que o protege. Acrescente estas 4 linhas ao fim do `.gitignore` (as duas primeiras já existem e ficam). O arquivo fica assim, inteiro:

```gitignore
.claude/skills/
.env
.env*
*.pem
*.key
node_modules/
```

Prove que as regras pegam (os arquivos não precisam existir):

Rode: `git check-ignore -v .env.teste chave.pem x.key .env node_modules/pg/package.json`
Saída esperada (5 linhas, nessa ordem; entre o padrão e o caminho há um TAB):
```
.gitignore:3:.env*	.env.teste
.gitignore:4:*.pem	chave.pem
.gitignore:5:*.key	x.key
.gitignore:3:.env*	.env
.gitignore:6:node_modules/	node_modules/pg/package.json
```

Rode: `git status --short`
Saída esperada: ` M .gitignore` (o `.env` que já existe continua fora), mais, se ainda estiverem pendentes, as linhas dos arquivos do dono, que ficam fora do commit.

Commit (Git Bash):
```bash
git add .gitignore
git commit -F - <<'EOF'
Segredos protegidos antes de tudo

O git passa a ignorar qualquer .env (.env, .env.teste, .env.qualquer), chaves
(*.pem, *.key) e node_modules/. Provado com git check-ignore antes de criar
qualquer outro arquivo: nenhum token ou chave vai parar no repositório.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Passo 2: Subir o Postgres local e conferir o usuário, o esquema e o fuso**

Crie `.gitattributes` (LF no crontab da VPS, no hook, nos scripts, no TypeScript e no SQL; nesta máquina o git converte para CRLF por padrão, e um `iniciar.sh` com CRLF quebra dentro do contêiner):

```gitattributes
publicacao/crontab text eol=lf
.githooks/* text eol=lf
*.sh text eol=lf
*.mts text eol=lf
*.sql text eol=lf
```

Crie `sql/criar-usuario-e-esquema.sql`. É o mesmo arquivo que o dono vai rodar na VPS (no banco `prumo`, com `-v senha=<a senha nova>`); não mude uma vírgula:

```sql
create role kaizen login password :'senha' nosuperuser nocreatedb nocreaterole;
alter role kaizen set timezone = 'America/Fortaleza';
create schema kaizen authorization kaizen;
```

Crie `sql/local/iniciar.sh`. O Postgres roda este script uma única vez, na primeira subida (volume vazio):

```sh
#!/bin/sh
# Roda uma vez, na primeira subida do Postgres local: cria o usuário kaizen e o esquema kaizen, como na VPS.
set -e
psql -v ON_ERROR_STOP=1 -v senha=kaizen-local --username postgres --dbname kaizen -f /kaizen/criar-usuario-e-esquema.sql
```

Crie `docker-compose.yml`. A porta só abre em `127.0.0.1`, a autenticação `trust` só vale nesta máquina, e o `healthcheck` pergunta por TCP (que só abre depois de o `iniciar.sh` terminar), para o `--wait` só voltar com o usuário e o esquema criados:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "127.0.0.1:5434:5432"
    environment:
      POSTGRES_HOST_AUTH_METHOD: trust
      POSTGRES_DB: kaizen
    volumes:
      - kaizen_pg_local:/var/lib/postgresql/data
      - ./sql/criar-usuario-e-esquema.sql:/kaizen/criar-usuario-e-esquema.sql:ro
      - ./sql/local/iniciar.sh:/docker-entrypoint-initdb.d/iniciar.sh:ro
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "127.0.0.1", "-U", "postgres", "-d", "kaizen"]
      interval: 2s
      timeout: 5s
      retries: 30

volumes:
  kaizen_pg_local:
```

Rode: `docker compose up -d --wait`
Saída esperada: termina com uma linha `Container kaizen-postgres-1 Healthy`.

Rode: `docker compose exec -T postgres psql -U postgres -d kaizen -At -c "select rolname, rolsuper, rolcreatedb, rolcreaterole from pg_roles where rolname = 'kaizen'" -c "select pg_get_userbyid(nspowner) from pg_namespace where nspname = 'kaizen'"`
Saída esperada:
```
kaizen|f|f|f
kaizen
```
(o usuário `kaizen` existe e não é superusuário; o esquema `kaizen` é dele)

Rode: `docker compose exec -T postgres psql -U kaizen -d kaizen -At -c "show timezone"`
Saída esperada: `America/Fortaleza`

Se a primeira consulta vier vazia, o volume é de uma subida antiga e o `iniciar.sh` não rodou: `docker compose down -v`, depois `docker compose up -d --wait` de novo.

- [ ] **Passo 3: package.json, tsconfig.json e as dependências com versão exata**

Crie `package.json` exatamente assim:

```json
{
  "name": "kaizen",
  "private": true,
  "type": "module",
  "engines": { "node": "24.18.0" },
  "scripts": {
    "test": "node ferramentas/testar.mts",
    "tipos": "tsc -p .",
    "verificar": "npm run tipos && npm test",
    "preparar": "git config core.hooksPath .githooks"
  },
  "dependencies": { "pg": "8.23.0" },
  "devDependencies": { "@types/node": "24.19.0", "@types/pg": "8.23.1", "typescript": "7.0.2" }
}
```

Crie `tsconfig.json` exatamente assim:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "skipLibCheck": true
  },
  "include": ["tradutor/**/*.mts", "ferramentas/**/*.mts"]
}
```

Rode: `npm install`
Saída esperada: `added 19 packages` e `found 0 vulnerabilities`; o `package.json` não muda; nasce o `package-lock.json`.

Rode: `npm ls --depth=0`
Saída esperada (a primeira linha traz o caminho da pasta):
```
+-- @types/node@24.19.0
+-- @types/pg@8.23.1
+-- pg@8.23.0
`-- typescript@7.0.2
```

Rode: `git status --short`
Saída esperada: aparecem `.gitattributes`, `docker-compose.yml`, `package-lock.json`, `package.json`, `sql/` e `tsconfig.json`; **não** aparece `node_modules/`.

- [ ] **Passo 4: Escrever o teste do banco (ainda sem o módulo)**

Crie `tradutor/banco.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conectar, emTransacao, garantirLocal } from './banco.mts'

// Superusuário do Postgres local (docker-compose.yml).
const URL_LOCAL = 'postgres://postgres@localhost:5434/postgres'
const RECUSADO = { message: 'recusado: só localhost:5434 nos testes' }

test('garantirLocal aceita só localhost e 127.0.0.1 na porta 5434', () => {
  assert.doesNotThrow(() => garantirLocal('postgres://postgres@localhost:5434/postgres'))
  assert.doesNotThrow(() => garantirLocal('postgres://kaizen:kaizen-local@127.0.0.1:5434/kaizen'))
  assert.doesNotThrow(() => garantirLocal('postgresql://kaizen@localhost:5434/kaizen_teste_1_1'))
})

test('garantirLocal recusa outro endereço, outra porta, porta ausente e endereço inválido', () => {
  const recusados = [
    'postgres://kaizen:senha@postgres:5432/prumo',
    'postgres://postgres@localhost:5433/postgres',
    'postgres://postgres@localhost/postgres',
    'postgres://postgres@192.168.0.10:5434/postgres',
    'postgres://postgres@localhost.exemplo.com:5434/postgres',
    'isto não é um endereço',
  ]
  for (const url of recusados) {
    assert.throws(() => garantirLocal(url), RECUSADO, url)
  }
})

test('conectar fixa o fuso da sessão em America/Fortaleza, mesmo para quem não tem esse fuso', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    const { rows } = await cliente.query('show timezone')
    assert.equal(rows[0].TimeZone, 'America/Fortaleza')
  } finally {
    await cliente.end()
  }
})

test('datas, horas, numeric e bigint chegam como o texto que o Postgres escreveu', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    const { rows } = await cliente.query(`
      select
        '2026-09-28 14:00:03.123'::timestamp as momento,
        '2026-09-28 17:00:03.123+00'::timestamptz as carimbo,
        '2026-09-28'::date as dia,
        '1234567890.123456'::numeric(16,6) as valor,
        '123456789012345678901234.5'::numeric as valor_grande,
        9007199254740993::int8 as inteiro_grande,
        (select count(*) from (values (1), (2)) v) as contagem`)
    assert.deepEqual(rows[0], {
      momento: '2026-09-28 14:00:03.123',
      carimbo: '2026-09-28 14:00:03.123-03',
      dia: '2026-09-28',
      valor: '1234567890.123456',
      valor_grande: '123456789012345678901234.5',
      inteiro_grande: '9007199254740993',
      contagem: '2',
    })
  } finally {
    await cliente.end()
  }
})

test('emTransacao grava quando tudo dá certo e devolve o resultado', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    await cliente.query('create temp table caixa (valor numeric not null)')
    const devolvido = await emTransacao(cliente, async () => {
      await cliente.query(`insert into caixa values ('10.50')`)
      return 'gravado'
    })
    assert.equal(devolvido, 'gravado')
    const { rows } = await cliente.query('select count(*) as linhas from caixa')
    assert.equal(rows[0].linhas, '1')
  } finally {
    await cliente.end()
  }
})

test('emTransacao desfaz tudo e relança o mesmo erro quando algo falha', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    await cliente.query('create temp table caixa (valor numeric not null)')
    const erro = new Error('falhou no meio da carga')
    await assert.rejects(
      emTransacao(cliente, async () => {
        await cliente.query(`insert into caixa values ('10.50')`)
        throw erro
      }),
      (recebido) => recebido === erro,
    )
    const { rows } = await cliente.query('select count(*) as linhas from caixa')
    assert.equal(rows[0].linhas, '0')
  } finally {
    await cliente.end()
  }
})

test('emTransacao não finge sucesso quando um comando falhou dentro dela e o erro foi engolido', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    await cliente.query('create temp table caixa (valor numeric not null)')
    await assert.rejects(
      emTransacao(cliente, async () => {
        await cliente.query(`insert into caixa values ('10.50')`)
        await cliente.query('select 1 / 0').catch(() => undefined)
        return 'parece que deu certo'
      }),
      { message: 'a transação foi desfeita pelo Postgres: um comando falhou dentro dela' },
    )
    const { rows } = await cliente.query('select count(*) as linhas from caixa')
    assert.equal(rows[0].linhas, '0')
  } finally {
    await cliente.end()
  }
})
```

- [ ] **Passo 5: Rodar o teste e ver falhar**

Rode: `node --test tradutor/banco.test.mts`
Saída esperada: falha, com `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Projetos\KAIZEN\tradutor\banco.mts' imported from C:\Projetos\KAIZEN\tradutor\banco.test.mts` e, no fim, `ℹ tests 1` e `ℹ fail 1` (o arquivo inteiro conta como um teste que falhou).

- [ ] **Passo 6: Implementar `tradutor/banco.mts`**

Crie `tradutor/banco.mts`:

```ts
import pg from 'pg'

export type Cliente = pg.Client

// Nada de dinheiro, quantidade ou data vira number ou Date do JavaScript: chegam como o texto do Postgres.
for (const oid of [1114, 1184, 1082, 1700, 20]) {
  pg.types.setTypeParser(oid, (texto: string) => texto)
}

export function garantirLocal(url: string): void {
  let endereco: URL
  try {
    endereco = new URL(url)
  } catch {
    throw new Error('recusado: só localhost:5434 nos testes')
  }
  const hostLocal = endereco.hostname === 'localhost' || endereco.hostname === '127.0.0.1'
  if (!hostLocal || endereco.port !== '5434') {
    throw new Error('recusado: só localhost:5434 nos testes')
  }
}

export async function conectar(url: string): Promise<Cliente> {
  const cliente = new pg.Client({ connectionString: url })
  // Sem este ouvinte, uma queda da conexão com o cliente parado derruba o processo; a próxima consulta falha e o erro segue o caminho normal.
  cliente.on('error', () => undefined)
  await cliente.connect()
  try {
    await cliente.query(`set time zone 'America/Fortaleza'`)
  } catch (erro) {
    await cliente.end().catch(() => undefined)
    throw erro
  }
  return cliente
}

export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T> {
  await cliente.query('begin')
  try {
    const resultado = await fazer()
    // Se um comando falhou lá dentro e o erro foi engolido, o Postgres responde ao commit com ROLLBACK, sem erro.
    const fim = await cliente.query('commit')
    if (fim.command === 'ROLLBACK') {
      throw new Error('a transação foi desfeita pelo Postgres: um comando falhou dentro dela')
    }
    return resultado
  } catch (erro) {
    await cliente.query('rollback').catch(() => undefined)
    throw erro
  }
}
```

- [ ] **Passo 7: Rodar o teste e ver passar**

Rode: `node --test tradutor/banco.test.mts`
Saída esperada: passa, com as 7 linhas abaixo (os tempos variam) e `ℹ pass 7`, `ℹ fail 0`:
```
✔ garantirLocal aceita só localhost e 127.0.0.1 na porta 5434
✔ garantirLocal recusa outro endereço, outra porta, porta ausente e endereço inválido
✔ conectar fixa o fuso da sessão em America/Fortaleza, mesmo para quem não tem esse fuso
✔ datas, horas, numeric e bigint chegam como o texto que o Postgres escreveu
✔ emTransacao grava quando tudo dá certo e devolve o resultado
✔ emTransacao desfaz tudo e relança o mesmo erro quando algo falha
✔ emTransacao não finge sucesso quando um comando falhou dentro dela e o erro foi engolido
```

- [ ] **Passo 8: O contador de testes, vendo-o recusar uma contagem errada**

Crie `testes-esperados.txt` com uma única linha, `0` (ainda não somamos os testes desta tarefa):

```text
0
```

Crie `ferramentas/testar.mts`. Ele roda os arquivos um de cada vez, conta os testes que não são grupo (`describe`), e um arquivo que nem carrega conta como um teste que falhou:

```ts
import { run } from 'node:test'
import { spec } from 'node:test/reporters'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { finished } from 'node:stream/promises'

// Roda todos os *.test.mts de tradutor/ e ferramentas/, um arquivo por vez, e confere quantos testes rodaram.
const raiz = fileURLToPath(new URL('../', import.meta.url))
const arquivos = ['tradutor', 'ferramentas'].flatMap((pasta) =>
  readdirSync(join(raiz, pasta))
    .filter((nome) => nome.endsWith('.test.mts'))
    .sort()
    .map((nome) => join(raiz, pasta, nome)),
)
const esperados = Number(readFileSync(join(raiz, 'testes-esperados.txt'), 'utf8').trim())

let rodados = 0
let falhas = 0
const fluxo = run({ files: arquivos, concurrency: false })
fluxo.on('test:pass', (dados) => {
  if (dados.details.type !== 'suite') rodados += 1
})
fluxo.on('test:fail', (dados) => {
  if (dados.details.type !== 'suite') {
    rodados += 1
    falhas += 1
  }
})
const relatorio = fluxo.compose(new spec())
relatorio.pipe(process.stdout, { end: false })
await finished(relatorio)

console.log(`rodou ${rodados} testes, esperados ${esperados}`)
if (falhas > 0) console.log(`${falhas} teste(s) falharam`)
if (!Number.isInteger(esperados)) console.log('testes-esperados.txt não tem um número')
process.exitCode = falhas === 0 && rodados === esperados ? 0 : 1
```

Rode (Git Bash): `npm test; echo "saída: $?"`  (no PowerShell: `npm test; $LASTEXITCODE`)
Saída esperada: falha. Os 7 testes aparecem com ✔, e o fim é:
```
rodou 7 testes, esperados 0
saída: 1
```

- [ ] **Passo 9: Atualizar `testes-esperados.txt` (N = 7)**

Esta tarefa acrescentou 7 `test(` (todos em `tradutor/banco.test.mts`). Some ao número atual: 0 + 7 = 7. O arquivo fica com uma única linha:

```text
7
```

Rode (Git Bash): `npm test; echo "saída: $?"`
Saída esperada: passa, terminando com:
```
rodou 7 testes, esperados 7
saída: 0
```

- [ ] **Passo 10: O hook de commit**

Crie `.githooks/pre-commit` (o commit só passa com tipos e testes certos; precisa do Postgres local no ar):

```sh
#!/bin/sh
# Antes de cada commit: tipos e todos os testes. Os testes precisam do Postgres local no ar (docker compose up -d --wait).
npm run verificar || {
  echo "commit recusado: npm run verificar falhou. O Postgres local está no ar? Rode: docker compose up -d --wait" >&2
  exit 1
}
```

Rode: `npm run preparar`
Rode: `git config core.hooksPath`
Saída esperada: `.githooks`

- [ ] **Passo 11: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa. O `tsc -p .` não imprime nada (nenhum erro de tipo), os 7 testes passam e a última linha é `rodou 7 testes, esperados 7`.

- [ ] **Passo 12: Commit**

```bash
git add .gitattributes docker-compose.yml sql/criar-usuario-e-esquema.sql sql/local/iniciar.sh package.json package-lock.json tsconfig.json tradutor/banco.mts tradutor/banco.test.mts ferramentas/testar.mts testes-esperados.txt .githooks/pre-commit
git add --chmod=+x .githooks/pre-commit
git status --short
```
Saída esperada do `git status --short`: 12 linhas começando com `A ` (os arquivos novos acima), mais, se ainda estiverem pendentes, as linhas dos arquivos do dono (` M CLAUDE.md`, `?? .claude/` e outras), que ficam fora do commit; nenhum `node_modules/`, nenhum `.env`.

```bash
git commit -F - <<'EOF'
Fundação do Kaizen: Postgres local e testes que se contam

O repositório ganha um Postgres 16 só do Kaizen (porta 5434, só nesta
máquina), que na primeira subida cria o usuário kaizen, sem poder de
superusuário, e o esquema kaizen, com o mesmo arquivo que o dono vai rodar
na VPS.

A conexão do Kaizen fixa o fuso de Fortaleza e recebe datas, valores e
quantidades como o texto do banco, sem arredondar: 9007199254740993 e
1234567890.123456 voltam iguais, e 17h00 em UTC aparece como 14h00-03. Uma
transação que falha não grava nada, e uma que falhou por dentro não passa
por sucesso. Os testes só aceitam o banco local.

npm test roda todos os testes e confere a contagem: rodou 7, esperados 7.
Antes de cada commit, tipos e testes rodam sozinhos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: antes de o commit terminar, o hook imprime a saída de `npm run verificar`, terminando com `rodou 7 testes, esperados 7`. Se aparecer `commit recusado: npm run verificar falhou`, suba o Postgres (`docker compose up -d --wait`) e repita o commit.

---

### Tarefa 2: Estrutura do banco e migrações

**O que esta tarefa entrega, em resultado:** o banco do Kaizen ganha as suas tabelas (documento, itens, pagamentos, parcelas, baixas, conferência de caixa, movimentos e foto do estoque, estoque da virada, cadastros e controle), as 48 traduções dos códigos do ERP (PA é pedido, RT é sangria, forma 5 é troca), o corte da virada (documento 184, itens 1.872, conferência 30, histórico de estoque 1.847) e a visão `documento_negocio`, que mostra cada documento em palavras do negócio. As mudanças de estrutura entram por migrações numeradas, aplicadas na ordem, uma vez só, e registradas; uma migração com erro não grava nada. Tudo roda como o usuário `kaizen`, sem superusuário.

**Arquivos:**
- Criar: `tradutor/tipos.mts`
- Criar: `tradutor/migracoes.mts`
- Criar: `tradutor/apoio-teste.mts`
- Criar: `sql/migracoes/001_estrutura.sql`
- Criar: `sql/migracoes/002_traducao.sql`
- Criar: `sql/migracoes/003_corte.sql`
- Criar: `sql/migracoes/005_documento_negocio.sql`
- Testar: `tradutor/migracoes.test.mts`
- Não criar: `sql/migracoes/004_estoque_virada.sql` (é da Tarefa 3, gerado por ferramenta; o buraco no número é de propósito).

**Interfaces:**
- Consome (Tarefa 1, `tradutor/banco.mts`):
  ```ts
  export type Cliente = pg.Client
  export function garantirLocal(url: string): void            // lança Error('recusado: só localhost:5434 nos testes')
  export async function conectar(url: string): Promise<Cliente> // conecta e fixa o fuso em America/Fortaleza
  export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T> // begin; fazer; commit; erro → rollback e relança
  ```
  Lembrete dos parsers da Tarefa 1: `count(*)` e `bigint` (inclusive `id` e `corte.oid`) chegam como texto (`'48'`); `numeric`, `date`, `timestamp` e `timestamptz` chegam como texto; `count(*)::int` chega como `number`; `boolean` chega como `boolean`.
- Produz:
  ```ts
  // tradutor/tipos.mts — só tipos e uma classe de erro
  export type Fonte = 'meuerp' | 'link'
  export type TipoExecucao = 'hora' | 'noite'
  export type Resultado = 'ok' | 'aviso' | 'falha' | 'pulada'
  export type TabelaCorte = 'documento' | 'documento_mercadoria' | 'documento_pagamento' | 'documento_parcela'
    | 'documento_parcela_pagamento' | 'documento_conferencia_caixa' | 'documento_cancelamento_historico' | 'mercadoria_estoque_historico'
  export type Cortes = Record<TabelaCorte, number>
  export type TipoAviso = 'codigo_sem_traducao' | 'documento_apagado' | 'fechamento_com_resto' | 'estoque_diverge'
    | 'movimento_sumiu' | 'total_diferente' | 'execucao_faltou' | 'execucao_pulada'
  export type Aviso = { tipo: TipoAviso; chave: string; texto: string }
  export type TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'outra'
  export type MotivoFalha = { tipo: TipoFalha; detalhe: string }
  export class ErroKaizen extends Error { motivo: MotivoFalha; constructor(motivo: MotivoFalha) }

  // tradutor/migracoes.mts
  export const PASTA_MIGRACOES: string   // caminho absoluto de sql/migracoes/
  export async function aplicarMigracoes(cliente: Cliente, pasta?: string): Promise<string[]>
  // cria kaizen.migracao (nome text primary key, aplicada_em timestamptz not null default now()) se não existir;
  // lê os *.sql da pasta em ordem de nome; aplica cada um que falta numa transação própria (emTransacao) e registra o nome;
  // devolve os nomes aplicados agora ([] se nada faltava). Erro numa migração: lança
  // ErroKaizen({ tipo: 'outra', detalhe: `a migração ${nome} não se aplicou: ${erro.message}` }) e ela não fica registrada.

  // tradutor/apoio-teste.mts (só para testes)
  export const URL_ADMIN = 'postgres://postgres@localhost:5434/postgres'
  export const SENHA_KAIZEN_LOCAL = 'kaizen-local'
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>
  // garantirLocal; apaga um resto com o mesmo nome e cria o banco `kaizen_teste_<pid>_<contador>` como admin;
  // nele, `create schema kaizen authorization kaizen`; conecta como kaizen com conectar(); se migrar !== false,
  // aplicarMigracoes. fechar() encerra o cliente e apaga o banco (`drop database <nome> with (force)`).
  export function urlDoBanco(nome: string, usuario: 'postgres' | 'kaizen'): string
  // 'postgres://postgres@localhost:5434/<nome>' ou 'postgres://kaizen:kaizen-local@localhost:5434/<nome>'
  ```
- O esquema `kaizen` depois das migrações: 17 tabelas (`baixa`, `conferencia_caixa`, `corte`, `de_para`, `documento`, `documento_item`, `documento_pagamento`, `estoque_atual`, `estoque_movimento`, `estoque_virada`, `execucao`, `funcionario`, `parcela`, `pessoa`, `produto`, `produto_fornecedor`, `traducao`), mais `migracao` e a visão `documento_negocio`. `estoque_virada` fica vazia até a Tarefa 3. Apagar um `documento` apaga, em cascata, itens, pagamentos, parcelas (e as baixas delas) e conferência; `estoque_movimento` não tem ligação e fica.
- `testes-esperados.txt` passa de `7` para `18`.
- Os testes do conteúdo (tabelas, 48 traduções, corte, visão, cascata) rodam num banco que recebe só as migrações desta tarefa (001, 002, 003 e 005, copiadas para uma pasta temporária). Assim, uma migração futura que mude o corte (a spec prevê isso se o dono mandar excluir documentos antes de 28/09) ou acrescente uma tradução não quebra estes testes; quem fizer a migração nova testa o efeito dela no teste da própria tarefa.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Postgres local no ar (`docker compose up -d --wait`; os testes criam e apagam bancos próprios nele e nunca tocam no banco `kaizen`). O hook de commit roda `npm run verificar`. Commits no Git Bash.

- [ ] **Passo 1: Escrever o teste das migrações**

Crie `tradutor/migracoes.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { conectar, garantirLocal } from './banco.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'
import { criarBancoKaizen, URL_ADMIN } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { ErroKaizen } from './tipos.mts'
import type { Cortes } from './tipos.mts'

function pastaComMigracoes(arquivos: Record<string, string>): string {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const [nome, sql] of Object.entries(arquivos)) writeFileSync(join(pasta, nome), sql)
  return pasta
}

const DESTA_TAREFA = ['001_estrutura.sql', '002_traducao.sql', '003_corte.sql', '005_documento_negocio.sql']
const doRepositorio = readdirSync(PASTA_MIGRACOES).filter((nome) => nome.endsWith('.sql')).sort()

// `banco` recebe todas as migrações do repositório. `estrutura` recebe só as desta tarefa, para conferir o
// conteúdo delas sem depender das que vierem depois (uma migração nova pode mudar o corte ou acrescentar tradução).
let banco: BancoTeste
let aplicadasNaPrimeira: string[]
let estrutura: BancoTeste
let pastaEstrutura: string

before(async () => {
  banco = await criarBancoKaizen({ migrar: false })
  aplicadasNaPrimeira = await aplicarMigracoes(banco.cliente)
  pastaEstrutura = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const nome of DESTA_TAREFA) copyFileSync(join(PASTA_MIGRACOES, nome), join(pastaEstrutura, nome))
  estrutura = await criarBancoKaizen({ migrar: false })
  await aplicarMigracoes(estrutura.cliente, pastaEstrutura)
})

after(async () => {
  await banco?.fechar()
  await estrutura?.fechar()
  if (pastaEstrutura) rmSync(pastaEstrutura, { recursive: true, force: true })
})

test('aplica as migrações de uma pasta na ordem do nome, registra cada uma e depois só as que faltam', async () => {
  const pasta = pastaComMigracoes({
    '010_c.sql': `insert into kaizen.ordem (passo) values ('c');`,
    '001_a.sql': `create table kaizen.ordem (n integer generated always as identity, passo text not null); insert into kaizen.ordem (passo) values ('a');`,
    '002_b.sql': `insert into kaizen.ordem (passo) values ('b');`,
    'leia-me.txt': 'não é migração',
  })
  const outro = await criarBancoKaizen({ migrar: false })
  try {
    assert.deepEqual(await aplicarMigracoes(outro.cliente, pasta), ['001_a.sql', '002_b.sql', '010_c.sql'])
    const ordem = await outro.cliente.query('select passo from kaizen.ordem order by n')
    assert.deepEqual(ordem.rows.map((linha) => linha.passo), ['a', 'b', 'c'])

    writeFileSync(join(pasta, '011_d.sql'), `insert into kaizen.ordem (passo) values ('d');`)
    assert.deepEqual(await aplicarMigracoes(outro.cliente, pasta), ['011_d.sql'])
    const registro = await outro.cliente.query('select nome from kaizen.migracao order by nome')
    assert.deepEqual(registro.rows.map((linha) => linha.nome), ['001_a.sql', '002_b.sql', '010_c.sql', '011_d.sql'])
  } finally {
    await outro.fechar()
    rmSync(pasta, { recursive: true, force: true })
  }
})

test('aplica todas as migrações do repositório, na ordem do nome, e registra cada uma', async () => {
  assert.deepEqual(aplicadasNaPrimeira, doRepositorio)
  for (const nome of DESTA_TAREFA) assert.ok(doRepositorio.includes(nome), nome)
  const registro = await banco.cliente.query('select nome from kaizen.migracao order by nome')
  assert.deepEqual(registro.rows.map((linha) => linha.nome), doRepositorio)
})

test('as migrações desta tarefa criam as 17 tabelas do Kaizen, o registro e a visão', async () => {
  const tabelas = await estrutura.cliente.query(
    `select table_name as nome, table_type as tipo from information_schema.tables
     where table_schema = 'kaizen' order by table_name collate "C"`,
  )
  const tabela = (nome: string) => ({ nome, tipo: 'BASE TABLE' })
  assert.deepEqual(tabelas.rows, [
    tabela('baixa'),
    tabela('conferencia_caixa'),
    tabela('corte'),
    tabela('de_para'),
    tabela('documento'),
    tabela('documento_item'),
    { nome: 'documento_negocio', tipo: 'VIEW' },
    tabela('documento_pagamento'),
    tabela('estoque_atual'),
    tabela('estoque_movimento'),
    tabela('estoque_virada'),
    tabela('execucao'),
    tabela('funcionario'),
    tabela('migracao'),
    tabela('parcela'),
    tabela('pessoa'),
    tabela('produto'),
    tabela('produto_fornecedor'),
    tabela('traducao'),
  ])
})

test('rodar as migrações de novo não aplica nada', async () => {
  assert.deepEqual(await aplicarMigracoes(banco.cliente), [])
  const { rows } = await banco.cliente.query('select count(*) as registradas from kaizen.migracao')
  assert.equal(rows[0].registradas, String(doRepositorio.length))
})

test('as migrações rodam como kaizen, que não é superusuário e é dono das tabelas', async () => {
  const quem = await banco.cliente.query(
    'select current_user as usuario, r.rolsuper as superusuario from pg_roles r where r.rolname = current_user',
  )
  assert.deepEqual(quem.rows, [{ usuario: 'kaizen', superusuario: false }])
  const donos = await banco.cliente.query(`select distinct tableowner as dono from pg_tables where schemaname = 'kaizen'`)
  assert.deepEqual(donos.rows, [{ dono: 'kaizen' }])
})

test('traducao tem as 48 linhas da carga inicial, com os significados combinados', async () => {
  const total = await estrutura.cliente.query(
    `select count(*) as linhas, count(*) filter (where fonte = 'meuerp') as do_erp_novo from kaizen.traducao`,
  )
  assert.deepEqual(total.rows[0], { linhas: '48', do_erp_novo: '48' })
  const porCampo = await estrutura.cliente.query(
    'select campo, count(*)::int as codigos from kaizen.traducao group by campo order by campo collate "C"',
  )
  assert.deepEqual(porCampo.rows, [
    { campo: 'financeiro', codigos: 3 },
    { campo: 'forma', codigos: 5 },
    { campo: 'movimento', codigos: 3 },
    { campo: 'sentido', codigos: 3 },
    { campo: 'situacao', codigos: 8 },
    { campo: 'status_baixa', codigos: 2 },
    { campo: 'status_parcela', codigos: 2 },
    { campo: 'tipo', codigos: 22 },
  ])
  const { rows } = await estrutura.cliente.query(`select campo || ':' || codigo as chave, valor from kaizen.traducao`)
  const traducao: Record<string, string> = Object.fromEntries(rows.map((linha) => [linha.chave, linha.valor]))
  assert.equal(traducao['tipo:PA'], 'pedido')
  assert.equal(traducao['tipo:65'], 'nfce')
  assert.equal(traducao['tipo:TM'], 'troca')
  assert.equal(traducao['tipo:RS'], 'sangria')
  assert.equal(traducao['tipo:RT'], 'sangria')
  assert.equal(traducao['tipo:CP'], 'conta_pagar')
  assert.equal(traducao['tipo:AC'], 'ajuste_custo')
  assert.equal(traducao['situacao:C'], 'cancelado')
  assert.equal(traducao['situacao:Z'], 'contingencia')
  assert.equal(traducao['movimento:S'], 'saida')
  assert.equal(traducao['financeiro:P'], 'paga')
  assert.equal(traducao['forma:5'], 'troca')
  assert.equal(traducao['status_parcela:B'], 'baixada')
  assert.equal(traducao['status_baixa:E'], 'valida')
  assert.equal(traducao['sentido:N'], 'nenhum')
  // Ficam de fora de propósito (spec 5.4): se aparecerem acima do corte, viram aviso.
  for (const chave of ['tipo:AM', 'tipo:EM', 'tipo:RU', 'financeiro:E', 'status_parcela:C']) {
    assert.equal(traducao[chave], undefined, chave)
  }
})

test('corte tem as 8 tabelas do ERP, sem nulo, com o documento em 184', async () => {
  const { rows } = await estrutura.cliente.query('select fonte, tabela, oid from kaizen.corte')
  assert.equal(rows.length, 8)
  assert.ok(rows.every((linha) => linha.fonte === 'meuerp' && typeof linha.oid === 'string'))
  const esperado: Cortes = {
    documento: 184,
    documento_mercadoria: 1872,
    documento_pagamento: 0,
    documento_parcela: 0,
    documento_parcela_pagamento: 0,
    documento_conferencia_caixa: 30,
    documento_cancelamento_historico: 0,
    mercadoria_estoque_historico: 1847,
  }
  assert.deepEqual(Object.fromEntries(rows.map((linha) => [linha.tabela, Number(linha.oid)])), esperado)
})

test('a visão documento_negocio traduz os códigos e, na Link, usa a tradução pelo modelo', async () => {
  const q = estrutura.cliente
  await q.query('begin')
  try {
    await q.query(`
      insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
      values ('meuerp', 'documento', '185', '50', 'PA', 'E', 'S', 'R', '2026-09-28 09:15:00'),
             ('meuerp', 'documento', '186', '51', 'AM', 'E', null, 'E', '2026-09-28 09:20:00'),
             ('link', 'negociacao', '9001', '777', 'teste_link', 'N', null, null, '2026-04-10 10:00:00')`)
    await q.query(`
      insert into kaizen.traducao (fonte, campo, codigo, valor)
      values ('link', 'tipo', 'teste_link', 'venda'),
             ('link', 'movimento_pelo_modelo', 'teste_link', 'saida'),
             ('link', 'financeiro_pelo_modelo', 'teste_link', 'recebe')`)
    const { rows } = await q.query(`
      select fonte, origem_id, modelo, tipo, status, situacao, movimento, financeiro, criado_em
      from kaizen.documento_negocio order by origem_id`)
    assert.deepEqual(rows, [
      {
        fonte: 'meuerp', origem_id: '185', modelo: 'PA', tipo: 'pedido', status: 'E', situacao: 'emitido',
        movimento: 'saida', financeiro: 'recebe', criado_em: '2026-09-28 09:15:00',
      },
      {
        fonte: 'meuerp', origem_id: '186', modelo: 'AM', tipo: null, status: 'E', situacao: 'emitido',
        movimento: null, financeiro: null, criado_em: '2026-09-28 09:20:00',
      },
      {
        fonte: 'link', origem_id: '9001', modelo: 'teste_link', tipo: 'venda', status: 'N', situacao: null,
        movimento: 'saida', financeiro: 'recebe', criado_em: '2026-04-10 10:00:00',
      },
    ])
  } finally {
    await q.query('rollback')
  }
})

test('apagar um documento apaga itens, pagamentos, parcelas, baixas e conferência; o movimento de estoque fica', async () => {
  const q = estrutura.cliente
  await q.query('begin')
  try {
    const documento = await q.query(`
      insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
      values ('meuerp', 'documento', '300', '60', 'CP', 'E', 'N', 'P', '2026-09-28 10:00:00') returning id`)
    const id = documento.rows[0].id
    await q.query(
      `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido)
       values ($1, 'documento_mercadoria', '1900', 'N', '60', '1', '10.00')`,
      [id],
    )
    await q.query(
      `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
       values ($1, 'documento_pagamento', '1', '1', '10.00')`,
      [id],
    )
    const parcela = await q.query(
      `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status)
       values ($1, 'documento_parcela', '1', '2026-09-28', '2026-10-05', '10.00', 'B') returning id`,
      [id],
    )
    const parcelaId = parcela.rows[0].id
    await q.query(
      `insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
       values ($1, 'documento_parcela_pagamento', '1', '2026-09-29', '10.00', '1', 'E')`,
      [parcelaId],
    )
    await q.query(
      `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
       values ($1, 'documento_conferencia_caixa', '31', '1', '58.00', '20.00')`,
      [id],
    )
    await q.query(`
      insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois)
      values ('meuerp', 'mercadoria_estoque_historico', '1848', '60', '60', '2026-09-28 10:00:00', '3', '2')`)
    const contar = async () =>
      (
        await q.query(
          `select
             (select count(*) from kaizen.documento_item where documento_id = $1) as itens,
             (select count(*) from kaizen.documento_pagamento where documento_id = $1) as pagamentos,
             (select count(*) from kaizen.parcela where documento_id = $1) as parcelas,
             (select count(*) from kaizen.baixa where parcela_id = $2) as baixas,
             (select count(*) from kaizen.conferencia_caixa where documento_id = $1) as conferencias,
             (select count(*) from kaizen.estoque_movimento where origem_id = '1848') as movimentos`,
          [id, parcelaId],
        )
      ).rows[0]
    assert.deepEqual(await contar(), { itens: '1', pagamentos: '1', parcelas: '1', baixas: '1', conferencias: '1', movimentos: '1' })
    await q.query('delete from kaizen.documento where id = $1', [id])
    assert.deepEqual(await contar(), { itens: '0', pagamentos: '0', parcelas: '0', baixas: '0', conferencias: '0', movimentos: '1' })
  } finally {
    await q.query('rollback')
  }
})

test('migração com erro vira ErroKaizen, desfaz o que ela fez e não fica registrada', async () => {
  const pasta = pastaComMigracoes({
    '001_boa.sql': 'create table kaizen.boa (n integer);',
    '002_ruim.sql': 'create table kaizen.ruim (n integer); select 1 / 0;',
    '003_depois.sql': 'create table kaizen.depois (n integer);',
  })
  const outro = await criarBancoKaizen({ migrar: false })
  try {
    await assert.rejects(aplicarMigracoes(outro.cliente, pasta), (erro) => {
      assert.ok(erro instanceof ErroKaizen)
      assert.equal(erro.motivo.tipo, 'outra')
      assert.match(erro.motivo.detalhe, /^a migração 002_ruim\.sql não se aplicou: .+/)
      assert.equal(erro.message, erro.motivo.detalhe)
      return true
    })
    const registro = await outro.cliente.query('select nome from kaizen.migracao order by nome')
    assert.deepEqual(registro.rows.map((linha) => linha.nome), ['001_boa.sql'])
    const tabelas = await outro.cliente.query(
      `select table_name as nome from information_schema.tables where table_schema = 'kaizen' order by table_name collate "C"`,
    )
    assert.deepEqual(tabelas.rows.map((linha) => linha.nome), ['boa', 'migracao'])
  } finally {
    await outro.fechar()
    rmSync(pasta, { recursive: true, force: true })
  }
})

test('o banco de teste é só do teste, conecta como kaizen e some ao fechar', async () => {
  const outro = await criarBancoKaizen({ migrar: false })
  const nome = outro.nome
  try {
    assert.match(nome, /^kaizen_teste_\d+_\d+$/)
    assert.equal(outro.url, `postgres://kaizen:kaizen-local@localhost:5434/${nome}`)
    const { rows } = await outro.cliente.query(
      `select current_user as usuario, current_database() as banco,
              (select count(*) from information_schema.tables where table_schema = 'kaizen') as tabelas`,
    )
    assert.deepEqual(rows[0], { usuario: 'kaizen', banco: nome, tabelas: '0' })
  } finally {
    await outro.fechar()
  }
  garantirLocal(URL_ADMIN)
  const admin = await conectar(URL_ADMIN)
  try {
    const { rows } = await admin.query('select count(*) as bancos from pg_database where datname = $1', [nome])
    assert.equal(rows[0].bancos, '0')
  } finally {
    await admin.end()
  }
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/migracoes.test.mts`
Saída esperada: falha, com `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Projetos\KAIZEN\tradutor\migracoes.mts' imported from C:\Projetos\KAIZEN\tradutor\migracoes.test.mts` e `ℹ fail 1`.

- [ ] **Passo 3: Criar `tradutor/tipos.mts`**

Copiado do contrato, sem mudar nada (a classe fica numa linha só, como está):

```ts
export type Fonte = 'meuerp' | 'link'
export type TipoExecucao = 'hora' | 'noite'
export type Resultado = 'ok' | 'aviso' | 'falha' | 'pulada'
export type TabelaCorte =
  | 'documento' | 'documento_mercadoria' | 'documento_pagamento' | 'documento_parcela'
  | 'documento_parcela_pagamento' | 'documento_conferencia_caixa'
  | 'documento_cancelamento_historico' | 'mercadoria_estoque_historico'
export type Cortes = Record<TabelaCorte, number>
export type TipoAviso =
  | 'codigo_sem_traducao' | 'documento_apagado' | 'fechamento_com_resto' | 'estoque_diverge'
  | 'movimento_sumiu' | 'total_diferente' | 'execucao_faltou' | 'execucao_pulada'
export type Aviso = { tipo: TipoAviso; chave: string; texto: string }
export type TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'outra'
export type MotivoFalha = { tipo: TipoFalha; detalhe: string }
export class ErroKaizen extends Error {
  motivo: MotivoFalha
  constructor(motivo: MotivoFalha) { super(motivo.detalhe); this.name = 'ErroKaizen'; this.motivo = motivo }
}
```

- [ ] **Passo 4: Criar `tradutor/migracoes.mts`**

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'
import { ErroKaizen } from './tipos.mts'

export const PASTA_MIGRACOES: string = fileURLToPath(new URL('../sql/migracoes/', import.meta.url))

export async function aplicarMigracoes(cliente: Cliente, pasta: string = PASTA_MIGRACOES): Promise<string[]> {
  await cliente.query(
    'create table if not exists kaizen.migracao (nome text primary key, aplicada_em timestamptz not null default now())',
  )
  const { rows } = await cliente.query<{ nome: string }>('select nome from kaizen.migracao')
  const jaAplicadas = new Set(rows.map((linha) => linha.nome))
  const nomes = readdirSync(pasta).filter((nome) => nome.endsWith('.sql')).sort()
  const aplicadasAgora: string[] = []
  for (const nome of nomes) {
    if (jaAplicadas.has(nome)) continue
    const sql = readFileSync(join(pasta, nome), 'utf8')
    try {
      await emTransacao(cliente, async () => {
        await cliente.query(sql)
        await cliente.query('insert into kaizen.migracao (nome) values ($1)', [nome])
      })
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      throw new ErroKaizen({ tipo: 'outra', detalhe: `a migração ${nome} não se aplicou: ${mensagem}` })
    }
    aplicadasAgora.push(nome)
  }
  return aplicadasAgora
}
```

- [ ] **Passo 5: Criar `tradutor/apoio-teste.mts`**

```ts
import { conectar, garantirLocal } from './banco.mts'
import type { Cliente } from './banco.mts'
import { aplicarMigracoes } from './migracoes.mts'

export const URL_ADMIN = 'postgres://postgres@localhost:5434/postgres'
export const SENHA_KAIZEN_LOCAL = 'kaizen-local'

export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }

let contador = 0

export function urlDoBanco(nome: string, usuario: 'postgres' | 'kaizen'): string {
  if (usuario === 'kaizen') return `postgres://kaizen:${SENHA_KAIZEN_LOCAL}@localhost:5434/${nome}`
  return `postgres://postgres@localhost:5434/${nome}`
}

async function comoAdmin(url: string, sql: string): Promise<void> {
  garantirLocal(url)
  const admin = await conectar(url)
  try {
    await admin.query(sql)
  } finally {
    await admin.end()
  }
}

export async function criarBancoKaizen(opcoes: { migrar?: boolean } = {}): Promise<BancoTeste> {
  garantirLocal(URL_ADMIN)
  contador += 1
  const nome = `kaizen_teste_${process.pid}_${contador}`
  // Um banco com o mesmo nome só sobra de uma rodada que morreu no meio; é lixo de teste.
  await comoAdmin(URL_ADMIN, `drop database if exists ${nome} with (force)`)
  await comoAdmin(URL_ADMIN, `create database ${nome}`)
  await comoAdmin(urlDoBanco(nome, 'postgres'), 'create schema kaizen authorization kaizen')
  const url = urlDoBanco(nome, 'kaizen')
  garantirLocal(url)
  const cliente = await conectar(url)
  const banco: BancoTeste = {
    nome,
    url,
    cliente,
    async fechar() {
      await cliente.end().catch(() => undefined)
      await comoAdmin(URL_ADMIN, `drop database if exists ${nome} with (force)`)
    },
  }
  if (opcoes.migrar !== false) {
    try {
      await aplicarMigracoes(cliente)
    } catch (erro) {
      await banco.fechar()
      throw erro
    }
  }
  return banco
}
```

- [ ] **Passo 6: Criar as migrações 001, 002, 003 e 005**

`sql/migracoes/001_estrutura.sql` (exatamente assim):

```sql
create table kaizen.documento (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('meuerp', 'link')),
  origem_tabela text not null,
  origem_id text not null,
  codigo text not null,
  modelo text not null,
  status text,
  movimento text,
  financeiro text,
  criado_em timestamp not null,
  fechado_em timestamp,
  pessoa text,
  turno_caixa integer,
  turno_usuario integer,
  turno_numero integer,
  visto_em timestamptz not null default now(),
  unique (fonte, origem_tabela, origem_id)
);

create table kaizen.documento_item (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  sentido text,
  produto text not null,
  quantidade numeric,
  valor_liquido numeric,
  vendedor text,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.documento_pagamento (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  forma text not null,
  valor numeric not null,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.parcela (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  lancado_em date,
  vencimento date,
  valor numeric not null,
  status text,
  descricao text,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.baixa (
  id bigint generated always as identity primary key,
  parcela_id bigint not null references kaizen.parcela (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  pago_em date,
  valor numeric not null,
  forma text,
  status text,
  unique (parcela_id, origem_tabela, origem_id)
);

create table kaizen.conferencia_caixa (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  forma text not null,
  calculado numeric,
  informado numeric,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.estoque_movimento (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('meuerp', 'link')),
  origem_tabela text not null,
  origem_id text not null,
  produto text not null,
  documento text,
  momento timestamp not null,
  saldo_antes numeric,
  saldo_depois numeric,
  visto_em timestamptz not null default now(),
  unique (fonte, origem_tabela, origem_id)
);

create table kaizen.estoque_atual (
  fonte text not null check (fonte in ('meuerp', 'link')),
  produto text not null,
  quantidade numeric,
  lido_em timestamptz not null default now(),
  primary key (fonte, produto)
);

create table kaizen.estoque_virada (
  produto text primary key,
  quantidade numeric not null
);

create table kaizen.produto (
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  descricao text,
  grupo text,
  secao text,
  subgrupo text,
  marca text,
  custo numeric,
  ativo boolean not null,
  lido_em timestamptz not null default now(),
  primary key (fonte, codigo)
);

create table kaizen.produto_fornecedor (
  fonte text not null check (fonte in ('meuerp', 'link')),
  produto text not null,
  fornecedor text not null,
  primary key (fonte, produto, fornecedor)
);

create table kaizen.pessoa (
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  nome text,
  cpf_cnpj text,
  bairro text,
  municipio text,
  ibge text,
  uf text,
  ativo boolean not null,
  lido_em timestamptz not null default now(),
  primary key (fonte, codigo)
);

create table kaizen.funcionario (
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  nome text,
  usuario integer,
  tipo text,
  ativo boolean not null,
  lido_em timestamptz not null default now(),
  primary key (fonte, codigo)
);

create table kaizen.de_para (
  entidade text not null,
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo_origem text not null,
  codigo_kaizen text not null,
  primary key (entidade, fonte, codigo_origem)
);

create table kaizen.traducao (
  fonte text not null check (fonte in ('meuerp', 'link')),
  campo text not null,
  codigo text not null,
  valor text not null,
  primary key (fonte, campo, codigo)
);

create table kaizen.corte (
  fonte text not null check (fonte in ('meuerp', 'link')),
  tabela text not null,
  oid bigint not null,
  primary key (fonte, tabela)
);

create table kaizen.execucao (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('hora', 'noite')),
  manual boolean not null default false,
  inicio timestamptz not null default now(),
  fim timestamptz,
  resultado text check (resultado in ('ok', 'aviso', 'falha', 'pulada')),
  mensagem text,
  contagens jsonb,
  avisos jsonb not null default '[]',
  telegram_ok boolean,
  resumo_ok boolean not null default false,
  resumo_chaves jsonb
);

create index on kaizen.documento_item (documento_id);
create index on kaizen.documento_pagamento (documento_id);
create index on kaizen.parcela (documento_id);
create index on kaizen.baixa (parcela_id);
create index on kaizen.conferencia_caixa (documento_id);
create index on kaizen.estoque_movimento (fonte, produto);
```

`sql/migracoes/002_traducao.sql` (22 tipos + 8 situações + 3 movimentos + 3 financeiros + 5 formas + 2 status de parcela + 2 status de baixa + 3 sentidos = 48 linhas; AM, EM, RU, o financeiro E e o status C de parcela ficam de fora de propósito):

```sql
insert into kaizen.traducao (fonte, campo, codigo, valor) values
  ('meuerp', 'tipo', 'PA', 'pedido'),
  ('meuerp', 'tipo', '65', 'nfce'),
  ('meuerp', 'tipo', '55', 'nfe'),
  ('meuerp', 'tipo', '59', 'cfe'),
  ('meuerp', 'tipo', 'PV', 'pre_venda'),
  ('meuerp', 'tipo', 'OC', 'orcamento'),
  ('meuerp', 'tipo', 'CN', 'condicional'),
  ('meuerp', 'tipo', 'TM', 'troca'),
  ('meuerp', 'tipo', 'AX', 'abertura_caixa'),
  ('meuerp', 'tipo', 'SF', 'suprimento'),
  ('meuerp', 'tipo', 'SD', 'suprimento_adicional'),
  ('meuerp', 'tipo', 'RS', 'sangria'),
  ('meuerp', 'tipo', 'RT', 'sangria'),
  ('meuerp', 'tipo', 'FC', 'fechamento_caixa'),
  ('meuerp', 'tipo', 'CP', 'conta_pagar'),
  ('meuerp', 'tipo', 'LE', 'inventario'),
  ('meuerp', 'tipo', 'PE', 'perda'),
  ('meuerp', 'tipo', 'TS', 'transferencia'),
  ('meuerp', 'tipo', 'AS', 'ajuste_estoque'),
  ('meuerp', 'tipo', 'AC', 'ajuste_custo'),
  ('meuerp', 'tipo', 'LP', 'liberacao'),
  ('meuerp', 'tipo', 'IM', 'importacao'),
  ('meuerp', 'situacao', 'E', 'emitido'),
  ('meuerp', 'situacao', 'C', 'cancelado'),
  ('meuerp', 'situacao', 'R', 'rascunho'),
  ('meuerp', 'situacao', 'O', 'conferido'),
  ('meuerp', 'situacao', 'V', 'enviado'),
  ('meuerp', 'situacao', 'X', 'excluido'),
  ('meuerp', 'situacao', 'I', 'inutilizado'),
  ('meuerp', 'situacao', 'Z', 'contingencia'),
  ('meuerp', 'movimento', 'S', 'saida'),
  ('meuerp', 'movimento', 'E', 'entrada'),
  ('meuerp', 'movimento', 'N', 'nenhum'),
  ('meuerp', 'financeiro', 'R', 'recebe'),
  ('meuerp', 'financeiro', 'P', 'paga'),
  ('meuerp', 'financeiro', 'N', 'nenhum'),
  ('meuerp', 'forma', '1', 'dinheiro'),
  ('meuerp', 'forma', '2', 'pix'),
  ('meuerp', 'forma', '3', 'credito'),
  ('meuerp', 'forma', '4', 'debito'),
  ('meuerp', 'forma', '5', 'troca'),
  ('meuerp', 'status_parcela', 'P', 'pendente'),
  ('meuerp', 'status_parcela', 'B', 'baixada'),
  ('meuerp', 'status_baixa', 'E', 'valida'),
  ('meuerp', 'status_baixa', 'C', 'cancelada'),
  ('meuerp', 'sentido', 'S', 'saida'),
  ('meuerp', 'sentido', 'E', 'entrada'),
  ('meuerp', 'sentido', 'N', 'nenhum');
```

`sql/migracoes/003_corte.sql`:

```sql
insert into kaizen.corte (fonte, tabela, oid) values
  ('meuerp', 'documento', 184),
  ('meuerp', 'documento_mercadoria', 1872),
  ('meuerp', 'documento_pagamento', 0),
  ('meuerp', 'documento_parcela', 0),
  ('meuerp', 'documento_parcela_pagamento', 0),
  ('meuerp', 'documento_conferencia_caixa', 30),
  ('meuerp', 'documento_cancelamento_historico', 0),
  ('meuerp', 'mercadoria_estoque_historico', 1847);
```

`sql/migracoes/005_documento_negocio.sql` (exatamente assim):

```sql
create view kaizen.documento_negocio as
select
  d.id, d.fonte, d.origem_tabela, d.origem_id, d.codigo, d.modelo,
  tt.valor as tipo,
  d.status,
  ts.valor as situacao,
  coalesce(tm.valor, tmm.valor) as movimento,
  coalesce(tf.valor, tfm.valor) as financeiro,
  d.criado_em, d.fechado_em, d.pessoa,
  d.turno_caixa, d.turno_usuario, d.turno_numero, d.visto_em
from kaizen.documento d
left join kaizen.traducao tt on tt.fonte = d.fonte and tt.campo = 'tipo' and tt.codigo = d.modelo
left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'situacao' and ts.codigo = d.status
left join kaizen.traducao tm on tm.fonte = d.fonte and tm.campo = 'movimento' and tm.codigo = d.movimento
left join kaizen.traducao tmm on tmm.fonte = d.fonte and tmm.campo = 'movimento_pelo_modelo' and tmm.codigo = d.modelo
left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'financeiro' and tf.codigo = d.financeiro
left join kaizen.traducao tfm on tfm.fonte = d.fonte and tfm.campo = 'financeiro_pelo_modelo' and tfm.codigo = d.modelo;
```

- [ ] **Passo 7: Rodar o teste e ver passar**

Rode: `node --test tradutor/migracoes.test.mts`
Saída esperada: passa, com as 11 linhas abaixo (os tempos variam; criar um banco leva de 0,5 a 6 s no Docker Desktop) e `ℹ pass 11`, `ℹ fail 0`:
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

Confira que nenhum banco de teste sobrou:

Rode: `docker compose exec -T postgres psql -U postgres -At -c "select count(*) from pg_database where datname like 'kaizen_teste_%'"`
Saída esperada: `0`

- [ ] **Passo 8: Atualizar `testes-esperados.txt` (N = 11)**

Esta tarefa acrescentou 11 `test(` (todos em `tradutor/migracoes.test.mts`). Some ao número atual: 7 + 11 = 18. O arquivo fica com uma única linha:

```text
18
```

- [ ] **Passo 9: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 18 testes com ✔; última linha `rodou 18 testes, esperados 18`.

- [ ] **Passo 10: Commit**

```bash
git add tradutor/tipos.mts tradutor/migracoes.mts tradutor/migracoes.test.mts tradutor/apoio-teste.mts sql/migracoes/001_estrutura.sql sql/migracoes/002_traducao.sql sql/migracoes/003_corte.sql sql/migracoes/005_documento_negocio.sql testes-esperados.txt
git commit -F - <<'EOF'
Estrutura do banco do Kaizen, tradução dos códigos e corte da virada

As migrações criam as 17 tabelas do Kaizen: documento com itens,
pagamentos, parcelas, baixas e conferência de caixa; movimentos, foto e
virada do estoque; produtos, pessoas, funcionários e fornecedores; tradução,
corte, de-para e o registro de cada execução.

Carregam as 48 traduções dos códigos do ERP (PA é pedido, RT é sangria,
forma 5 é troca) e o corte da virada: documento 184, itens 1.872,
conferência 30, histórico de estoque 1.847, e 0 nas tabelas que estavam
vazias. A visão documento_negocio mostra cada documento em palavras do
negócio; na Link, que não grava movimento, usa a tradução pelo modelo.

Rodar as migrações de novo não muda nada; uma migração com erro não grava
nada e vira falha com o nome dela. Tudo roda como o usuário kaizen, sem
superusuário. Apagar um documento leva junto os itens, pagamentos,
parcelas, baixas e conferência; os movimentos de estoque ficam.
Testes: rodou 18, esperados 18.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 18 testes, esperados 18`; o commit sai.

---

### Tarefa 3: Estoque da virada

**O que esta tarefa entrega, em resultado:** o Kaizen passa a saber o saldo de cada produto na virada, medido em 27/09 às 13h38, antes da operação: 1.029 produtos, 714 com estoque, 54.660,5 unidades, nenhum negativo. É o ponto de partida do saldo de cada produto e a base da conferência entre os movimentos e a foto do estoque. O SQL é gerado uma vez a partir do arquivo de medição e commitado; rodar o gerador de novo produz o mesmo arquivo.

**Arquivos:**
- Criar: `ferramentas/gerar-virada.mts`
- Criar (gerado pelo `ferramentas/gerar-virada.mts`, nunca à mão): `sql/migracoes/004_estoque_virada.sql`
- Testar: `tradutor/virada.test.mts`
- Ler, sem mudar: `docs/medicoes/estoque-virada-2026-09-27.json` (campo `produtos[]`, cada um com `produto` e `saldo` em texto, por exemplo `{ "produto": "60", "saldo": "3.000000", "reserva": "0.000000", "datahora": "2026-09-26 22:47:19.528412" }`; os outros campos não entram)

**Interfaces:**
- Consome (Tarefa 2, `tradutor/apoio-teste.mts`):
  ```ts
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>
  // banco de teste próprio, conectado como kaizen, com todas as migrações de sql/migracoes/ aplicadas em ordem de nome
  ```
  e a tabela da Tarefa 2: `kaizen.estoque_virada (produto text primary key, quantidade numeric not null)`. `aplicarMigracoes` pega sozinho o arquivo novo `004_estoque_virada.sql`, entre o 003 e o 005. Parsers da Tarefa 1: `numeric` e `sum(quantidade)` chegam como texto; `count(*)::int` chega como `number`.
- Produz:
  ```ts
  // ferramentas/gerar-virada.mts
  export const ARQUIVO_MEDICAO: string   // caminho absoluto de docs/medicoes/estoque-virada-2026-09-27.json
  export const ARQUIVO_MIGRACAO: string  // caminho absoluto de sql/migracoes/004_estoque_virada.sql
  export function gerarSqlVirada(textoJson: string): string
  // um comentário de 1 linha dizendo de onde veio; `insert into kaizen.estoque_virada (produto, quantidade) values`;
  // uma linha por produto, na ordem do arquivo: `  ('60', 3.000000),` (a última termina em `;`); termina com quebra de linha (LF).
  // Lança Error se: não houver produtos ('a medição não tem produtos'); produto não for texto só de dígitos
  // (`produto inválido na posição ${i}: ${JSON.stringify(produto)}`); saldo não for texto de número
  // (`saldo inválido do produto ${produto}: ${JSON.stringify(saldo)}`); produto repetido (`produto repetido: ${produto}`).
  // Rodado como programa (`node ferramentas/gerar-virada.mts`), escreve ARQUIVO_MIGRACAO.
  ```
  e `kaizen.estoque_virada` preenchida em todo banco migrado (1.029 linhas).
- `testes-esperados.txt` passa de `18` para `21`.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Postgres local no ar (`docker compose up -d --wait`). O `.gitattributes` da Tarefa 1 já manda o `*.sql` em LF, que é como o gerador escreve; não abra o `004` num editor que troque as quebras de linha. Depois que a migração 004 for aplicada em qualquer banco, ela não muda mais: correção de saldo da virada é migração nova. Commits no Git Bash.

- [ ] **Passo 1: Escrever o teste da virada**

Crie `tradutor/virada.test.mts`:

```ts
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { ARQUIVO_MEDICAO, ARQUIVO_MIGRACAO, gerarSqlVirada } from '../ferramentas/gerar-virada.mts'

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco?.fechar()
})

test('a virada tem 1.029 produtos, 714 com estoque, 54.660,5 unidades e nenhum negativo', async () => {
  const totais = await banco.cliente.query(`
    select count(*)::int as produtos,
           count(*) filter (where quantidade > 0)::int as com_estoque,
           count(*) filter (where quantidade < 0)::int as negativos,
           sum(quantidade) = 54660.5 as soma_certa,
           sum(quantidade) as soma
    from kaizen.estoque_virada`)
  assert.deepEqual(totais.rows[0], {
    produtos: 1029,
    com_estoque: 714,
    negativos: 0,
    soma_certa: true,
    soma: '54660.500000',
  })
  // O primeiro e o último produto da medição, com o saldo exatamente como foi medido.
  const pontas = await banco.cliente.query(
    `select produto, quantidade from kaizen.estoque_virada where produto in ('60', '5369') order by produto collate "C"`,
  )
  assert.deepEqual(pontas.rows, [
    { produto: '5369', quantidade: '16.000000' },
    { produto: '60', quantidade: '3.000000' },
  ])
})

test('o gerador, rodado de novo, produz exatamente o arquivo que está no repositório', () => {
  const gerado = gerarSqlVirada(readFileSync(ARQUIVO_MEDICAO, 'utf8'))
  assert.equal(gerado, readFileSync(ARQUIVO_MIGRACAO, 'utf8'))
  assert.equal(gerarSqlVirada(readFileSync(ARQUIVO_MEDICAO, 'utf8')), gerado)
  assert.equal(gerado.split('\n').filter((linha) => linha.startsWith("  ('")).length, 1029)
})

test('o gerador recusa produto ou saldo que não sejam o número em texto', () => {
  const medicao = (produtos: unknown[]) => JSON.stringify({ produtos })
  assert.throws(() => gerarSqlVirada(medicao([])), { message: 'a medição não tem produtos' })
  assert.throws(
    () => gerarSqlVirada(medicao([{ produto: '60', saldo: '1); drop table kaizen.corte; --' }])),
    { message: 'saldo inválido do produto 60: "1); drop table kaizen.corte; --"' },
  )
  assert.throws(() => gerarSqlVirada(medicao([{ produto: '60', saldo: 3 }])), { message: 'saldo inválido do produto 60: 3' })
  assert.throws(
    () => gerarSqlVirada(medicao([{ produto: "60'", saldo: '1.000000' }])),
    { message: `produto inválido na posição 0: "60'"` },
  )
  assert.throws(
    () => gerarSqlVirada(medicao([{ produto: '60', saldo: '1.000000' }, { produto: '60', saldo: '2.000000' }])),
    { message: 'produto repetido: 60' },
  )
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rode: `node --test tradutor/virada.test.mts`
Saída esperada: falha, com `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Projetos\KAIZEN\ferramentas\gerar-virada.mts' imported from C:\Projetos\KAIZEN\tradutor\virada.test.mts` e `ℹ fail 1`.

- [ ] **Passo 3: Criar o gerador `ferramentas/gerar-virada.mts`**

O saldo vai do texto da medição direto para o SQL, sem passar por número do JavaScript; por isso o gerador confere que produto e saldo são texto de número antes de escrever.

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Gera, uma vez, a migração com o saldo de cada produto na virada. O SQL gerado é commitado.
export const ARQUIVO_MEDICAO: string = fileURLToPath(new URL('../docs/medicoes/estoque-virada-2026-09-27.json', import.meta.url))
export const ARQUIVO_MIGRACAO: string = fileURLToPath(new URL('../sql/migracoes/004_estoque_virada.sql', import.meta.url))

type Medicao = { produtos?: Array<{ produto?: unknown; saldo?: unknown }> }

export function gerarSqlVirada(textoJson: string): string {
  const medicao = JSON.parse(textoJson) as Medicao
  if (!Array.isArray(medicao.produtos) || medicao.produtos.length === 0) {
    throw new Error('a medição não tem produtos')
  }
  const vistos = new Set<string>()
  // O saldo vai para o SQL como o texto medido, sem passar por número do JavaScript.
  const linhas = medicao.produtos.map(({ produto, saldo }, posicao) => {
    if (typeof produto !== 'string' || !/^[0-9]+$/.test(produto)) {
      throw new Error(`produto inválido na posição ${posicao}: ${JSON.stringify(produto)}`)
    }
    if (typeof saldo !== 'string' || !/^-?[0-9]+(\.[0-9]+)?$/.test(saldo)) {
      throw new Error(`saldo inválido do produto ${produto}: ${JSON.stringify(saldo)}`)
    }
    if (vistos.has(produto)) throw new Error(`produto repetido: ${produto}`)
    vistos.add(produto)
    return `  ('${produto}', ${saldo})`
  })
  return [
    '-- Gerado por ferramentas/gerar-virada.mts a partir de docs/medicoes/estoque-virada-2026-09-27.json (saldo de cada produto na virada, medido em 27/09/2026 às 13h38).',
    'insert into kaizen.estoque_virada (produto, quantidade) values',
    `${linhas.join(',\n')};`,
    '',
  ].join('\n')
}

if (import.meta.main) {
  const sql = gerarSqlVirada(readFileSync(ARQUIVO_MEDICAO, 'utf8'))
  writeFileSync(ARQUIVO_MIGRACAO, sql)
  const produtos = sql.split('\n').filter((linha) => linha.startsWith("  ('")).length
  console.log(`escrito sql/migracoes/004_estoque_virada.sql com ${produtos} produtos`)
}
```

- [ ] **Passo 4: Rodar o gerador e conferir o SQL gerado**

Rode: `node ferramentas/gerar-virada.mts`
Saída esperada: `escrito sql/migracoes/004_estoque_virada.sql com 1029 produtos`

Rode (Git Bash): `head -n 3 sql/migracoes/004_estoque_virada.sql; tail -n 2 sql/migracoes/004_estoque_virada.sql; wc -l sql/migracoes/004_estoque_virada.sql`
Saída esperada:
```
-- Gerado por ferramentas/gerar-virada.mts a partir de docs/medicoes/estoque-virada-2026-09-27.json (saldo de cada produto na virada, medido em 27/09/2026 às 13h38).
insert into kaizen.estoque_virada (produto, quantidade) values
  ('60', 3.000000),
  ('5368', 51.000000),
  ('5369', 16.000000);
1031 sql/migracoes/004_estoque_virada.sql
```
(1 linha de comentário + 1 do `insert` + 1.029 de produtos = 1.031.) Não cole nem edite este arquivo à mão: ele é o que o gerador escreveu.

- [ ] **Passo 5: Rodar o teste e ver passar**

Rode: `node --test tradutor/virada.test.mts`
Saída esperada: passa, com `ℹ pass 3`, `ℹ fail 0` e:
```
✔ a virada tem 1.029 produtos, 714 com estoque, 54.660,5 unidades e nenhum negativo
✔ o gerador, rodado de novo, produz exatamente o arquivo que está no repositório
✔ o gerador recusa produto ou saldo que não sejam o número em texto
```

- [ ] **Passo 6: Atualizar `testes-esperados.txt` (N = 3)**

Esta tarefa acrescentou 3 `test(` (todos em `tradutor/virada.test.mts`). Some ao número atual: 18 + 3 = 21. O arquivo fica com uma única linha:

```text
21
```

- [ ] **Passo 7: Rodar a verificação completa**

Rode: `npm run verificar`
Saída esperada: passa; `tsc -p .` sem nenhuma linha de erro; 21 testes com ✔ (o teste da Tarefa 2 `aplica todas as migrações do repositório, na ordem do nome, e registra cada uma` continua passando, agora com o `004_estoque_virada.sql` na lista); última linha `rodou 21 testes, esperados 21`.

- [ ] **Passo 8: Commit**

```bash
git add ferramentas/gerar-virada.mts sql/migracoes/004_estoque_virada.sql tradutor/virada.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Estoque da virada: 1.029 produtos, 714 com estoque, 54.660,5 unidades

A migração 004 grava no Kaizen o saldo de cada produto medido em 27/09 às
13h38, antes da operação: 1.029 produtos, 714 com estoque, 54.660,5
unidades, nenhum negativo. É o ponto de partida do saldo de cada produto e
a base para conferir os movimentos contra a foto do estoque.

O SQL foi gerado pelo ferramentas/gerar-virada.mts a partir do arquivo de
medição, com o saldo copiado como texto, sem arredondar. Rodar o gerador de
novo produz exatamente o mesmo arquivo, e ele recusa produto ou saldo que
não sejam número. Testes: rodou 21, esperados 21.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Saída esperada: o hook roda `npm run verificar` e termina com `rodou 21 testes, esperados 21`; o commit sai.

---

### Tarefa 4: Trava de só leitura e cliente do ERP

**O que esta tarefa entrega, em resultado:** o Kaizen passa a ter a única porta de saída para o ERP. Ela só deixa passar um SELECT ou WITH sozinho (nada de escrita, `;`, comentário ou função de arquivo), chama o ERP no ritmo da cota (19 por minuto; a 20ª espera o minuto seguinte), repete sozinha quando o ERP responde 429, e transforma cada problema (token recusado, consulta com erro, ERP fora, resposta sem dados) num erro com nome, sem nunca mostrar o token. Tudo testado com relógio e ERP falsos: nenhum teste chama a API de verdade. São 23 testes novos (9 + 14), em dois commits.

**Arquivos:**
- Criar: `tradutor/somente-leitura.mts`
- Criar: `tradutor/erp.mts`
- Testar: `tradutor/somente-leitura.test.mts`
- Testar: `tradutor/erp.test.mts`
- Modificar: `testes-esperados.txt` (soma 9 no primeiro commit e 14 no segundo: de 21 para 44, seguindo o plano em ordem)

**Interfaces:**
- Consome: nada de tarefas anteriores no código. Da tarefa 1 usa só a infraestrutura: `npm run verificar` (= `npm run tipos && npm test`), o arquivo `testes-esperados.txt` e o gancho de pre-commit.
- Produz (outras tarefas importam exatamente estes nomes):
  ```ts
  // tradutor/somente-leitura.mts
  export function verificarSomenteLeitura(sql: string): string
  // devolve o SQL aparado e sem o ';' final; lança Error('recusado: ...') se: vazio; tem ';' no meio;
  // tem '--' ou '/*'; não começa por select ou with (sem diferenciar maiúsculas); tem, como palavra inteira,
  // insert, update, delete, merge, truncate, drop, alter, create, grant, revoke, copy, call, do, execute,
  // lock, set, reset, refresh, comment, nextval, setval, pg_sleep, dblink; ou tem palavra que começa por lo_.

  // tradutor/erp.mts
  export type TipoErroErp = 'rede' | 'http' | 'token' | 'consulta' | 'recusado'
  export class ErroErp extends Error {
    tipo: TipoErroErp
    status: number | null
    constructor(tipo: TipoErroErp, mensagem: string, status: number | null = null)
  }
  export type Erp = { consultar(sql: string): Promise<string> }   // devolve o texto da coluna `dados` da única linha
  export type OpcoesErp = {
    url: string; token: string
    fetch?: typeof fetch
    agora?: () => number                 // ms; padrão Date.now
    esperar?: (ms: number) => Promise<void>
    limitePorMinuto?: number             // padrão 19
    prazoMs?: number                     // padrão 90_000
  }
  export function criarErp(opcoes: OpcoesErp): Erp
  ```

**Regras desta tarefa (repetidas das seções globais):**
- Tudo em português: nomes, testes, mensagens, commits. TypeScript rodado direto pelo Node (`.mts`), só com sintaxe apagável: nada de `enum`, `namespace` nem parâmetro de construtor com `public`/`private`. Imports com a extensão `.mts`; tipos importados com `import type` (ou `type` dentro das chaves).
- Testes com `node:test` e `node:assert/strict`, um arquivo `*.test.mts` ao lado do arquivo testado, só `test(` no nível de cima (sem `describe`).
- Os testes desta tarefa não precisam de banco, nem de rede: o `fetch`, o relógio (`agora`) e a espera (`esperar`) são falsos.
- "Palavra inteira", na trava, é uma sequência de letras, dígitos, `_` e `$` que começa por letra ou `_`, como um nome do SQL. Por isso `offset`, `dataset`, `datahora_set`, `updated_at` e `lock_id` passam, e `set`, `SET` e `lo_import` não. A trava é conservadora de propósito: um texto entre aspas que contenha uma dessas palavras (por exemplo `'data do pedido'`, que tem `do`) também é recusado; as consultas do Kaizen não usam texto assim.
- Como o cliente se comporta (e o teste confere cada item):
  - `POST ${url}/api/consulta/sql/v1?offset=0&limit=100` (uma barra no fim de `url` é tirada), cabeçalhos `Authorization: Authentication ${token}` e `Content-Type: application/json`, corpo `JSON.stringify({ sql })` com o SQL já aparado pela trava, `signal: AbortSignal.timeout(prazoMs)`.
  - Cota pelo minuto do relógio: se já houve `limitePorMinuto` chamadas no minuto corrente, espera até o início do minuto seguinte mais 1 s. Com o relógio em 14h00m10s, a espera é de 51.000 ms.
  - 429: espera a virada do minuto (mais 1 s) e repete, no máximo 3 vezes. São até 4 chamadas; se a quarta também for 429, lança `ErroErp('http', ..., 429)`.
  - 401 e 403 → `ErroErp('token', ..., status)`; 400 → `ErroErp('consulta', <corpo da resposta>, 400)`; outro não-2xx → `ErroErp('http', ..., status)`; erro de rede ou prazo → `ErroErp('rede', ...)` com `status` nulo.
  - 2xx: lê o envelope `{ offset, limit, total, hasNext, items }`; exige `items.length === 1` e `items[0].dados` em texto, senão `ErroErp('consulta', 'resposta sem a coluna dados')` (também quando o corpo não é JSON).
  - SQL recusado pela trava → `ErroErp('recusado', <mensagem da trava>)`, sem chamar o `fetch`.
  - Chama em série: se duas consultas forem pedidas ao mesmo tempo, a segunda só sai quando a primeira terminar (com erro ou não).
  - O token nunca aparece em mensagem de erro: qualquer texto vindo de fora (corpo do 400, mensagem do erro de rede) tem o token trocado por `[token]`.

- [ ] **Passo 1: Escrever o teste da trava de só leitura**

Criar `tradutor/somente-leitura.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verificarSomenteLeitura } from './somente-leitura.mts'

const PALAVRAS_PROIBIDAS = [
  'insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke',
  'copy', 'call', 'do', 'execute', 'lock', 'set', 'reset', 'refresh', 'comment', 'nextval', 'setval',
  'pg_sleep', 'dblink',
]

function recusa(sql: string): void {
  assert.throws(() => verificarSomenteLeitura(sql), { message: /^recusado: / }, `deveria recusar: ${sql}`)
}

test('aceita select e with, sem diferenciar maiúsculas, e devolve o SQL aparado', () => {
  assert.equal(verificarSomenteLeitura('  select 1 as dados  '), 'select 1 as dados')
  assert.equal(verificarSomenteLeitura('SELECT 1 AS dados'), 'SELECT 1 AS dados')
  assert.equal(
    verificarSomenteLeitura('\n\twith x as (select 1 as n) select n as dados from x\n'),
    'with x as (select 1 as n) select n as dados from x',
  )
  assert.equal(verificarSomenteLeitura('With x as (select 1 as n) select n as dados from x'), 'With x as (select 1 as n) select n as dados from x')
})

test('tira um ponto e vírgula final e recusa qualquer outro', () => {
  assert.equal(verificarSomenteLeitura('select 1 as dados;'), 'select 1 as dados')
  assert.equal(verificarSomenteLeitura('  select 1 as dados ;  \n'), 'select 1 as dados')
  recusa('select 1 as dados;;')
  recusa('select 1 as a; select 2 as b')
  recusa("select ';' as dados")
})

test('recusa SQL vazio', () => {
  for (const sql of ['', '   ', ';', ' ;\n']) recusa(sql)
})

test('recusa o que não começa por select ou with', () => {
  for (const sql of ['explain select 1', 'values (1)', 'table documento', '(select 1)', 'show all', 'selectx 1', 'withx as (select 1) select 1']) recusa(sql)
})

test('recusa comentário de linha e de bloco', () => {
  recusa('select 1 as dados -- comentário')
  recusa('select 1 as dados --')
  recusa('select /* comentário */ 1 as dados')
  recusa('select 1 as dados /*')
})

test('recusa cada palavra proibida, em minúscula e em maiúscula', () => {
  for (const palavra of PALAVRAS_PROIBIDAS) {
    recusa(`select 1 as dados from documento where ${palavra} is not null`)
    recusa(`SELECT 1 AS dados FROM documento WHERE ${palavra.toUpperCase()} IS NOT NULL`)
  }
})

test('recusa escrita escondida dentro de um select ou de um with', () => {
  recusa('with apagados as (delete from documento returning oid) select oid as dados from apagados')
  recusa('WITH x AS (UPDATE documento SET status = 1 RETURNING oid) SELECT oid AS dados FROM x')
  recusa('with x as (insert into documento (oid) values (1) returning oid) select oid as dados from x')
  recusa('select oid as dados from documento for update')
  recusa('select pg_sleep(40) as dados')
  recusa("select nextval('s') as dados")
  recusa("select 1 as dados, 2 as set")
})

test("recusa função de objeto grande: 'lo_' no início de uma palavra", () => {
  recusa("select lo_import('/etc/passwd') as dados")
  recusa("select pg_catalog.lo_export(1, '/tmp/x') as dados")
  recusa("SELECT LO_UNLINK(1) AS dados")
})

test('aceita palavras que só contêm uma palavra proibida dentro de outra', () => {
  const sql = 'select dataset, datahora_set, reseta, updated_at, deleted, docall, lock_id, colo_x, halo_y, _iddocumento as dados from documento order by 1 offset 10 limit 5'
  assert.equal(verificarSomenteLeitura(sql), sql)
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/somente-leitura.test.mts`

Esperado: FAIL. O arquivo testado ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\somente-leitura.mts' imported from ...\tradutor\somente-leitura.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 3: Implementar a trava**

Criar `tradutor/somente-leitura.mts`:

```ts
const PROIBIDAS = new Set([
  'insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke',
  'copy', 'call', 'do', 'execute', 'lock', 'set', 'reset', 'refresh', 'comment', 'nextval', 'setval',
  'pg_sleep', 'dblink',
])

// Palavra = sequência de letras, dígitos, _ e $ que começa por letra ou _ (como um nome no SQL).
// Assim "offset", "dataset" e "datahora_set" não são a palavra "set".
const PALAVRA = /[a-z_][a-z0-9_$]*/g

export function verificarSomenteLeitura(sql: string): string {
  let texto = sql.trim()
  if (texto.endsWith(';')) texto = texto.slice(0, -1).trim()
  if (texto === '') throw new Error('recusado: SQL vazio')
  if (texto.includes(';')) throw new Error('recusado: mais de um comando (;)')
  if (texto.includes('--') || texto.includes('/*')) throw new Error('recusado: comentário no SQL')
  const minusculo = texto.toLowerCase()
  if (!/^(select|with)\b/.test(minusculo)) throw new Error('recusado: só SELECT ou WITH')
  for (const palavra of minusculo.match(PALAVRA) ?? []) {
    if (PROIBIDAS.has(palavra)) throw new Error(`recusado: contém a palavra ${palavra}`)
    if (palavra.startsWith('lo_')) throw new Error(`recusado: contém ${palavra} (objeto grande)`)
  }
  return texto
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test tradutor/somente-leitura.test.mts`

Esperado: PASS.
```
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

- [ ] **Passo 5: Somar 9 em `testes-esperados.txt`, verificar e fazer o commit**

N = 9 (os 9 `test(` de `tradutor/somente-leitura.test.mts`). Seguindo o plano em ordem, o arquivo passa de `21` para `30`. Ele guarda só um número; este comando soma N e imprime o novo valor:

```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+9;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Run: `npm run verificar`

Esperado: `tsc -p .` sem nenhum erro e, no fim, `rodou M testes, esperados M`, com M igual ao número impresso pelo comando acima.

```bash
git add tradutor/somente-leitura.mts tradutor/somente-leitura.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Trava de só leitura: ao ERP só vai um SELECT ou WITH sozinho

Antes de qualquer SQL sair para o ERP, a trava recusa escrita (insert,
update, delete, drop e mais 19 palavras, inclusive um DELETE escondido
dentro de um WITH), ponto e vírgula no meio, comentário e função de
arquivo (lo_). Ela olha palavras inteiras: offset, dataset e
datahora_set continuam passando. 9 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Passo 6: Escrever o teste do cliente do ERP**

Criar `tradutor/erp.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarErp, ErroErp, type OpcoesErp } from './erp.mts'

const URL_ERP = 'https://erp.teste/publica'
const TOKEN = 'tok-segredo-123'
// 14h00m10s de terça, 29/09/2026, em Fortaleza
const INICIO = Date.parse('2026-09-29T17:00:10Z')

type Resposta = { status: number; corpo: string } | Error
type Chamada = { url: string; init: RequestInit }

function envelope(dados: string): string {
  return JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ dados }] })
}

// fetch falso: devolve as respostas na ordem, e a última se repete; o relógio só anda quando o cliente espera
function montar(respostas: Resposta[], extra: Partial<OpcoesErp> = {}) {
  const chamadas: Chamada[] = []
  const esperas: number[] = []
  let relogio = INICIO
  let proxima = 0
  const fetchFalso = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    chamadas.push({ url: String(url), init: init ?? {} })
    const r = respostas[Math.min(proxima++, respostas.length - 1)]
    if (r instanceof Error) throw r
    return new Response(r.corpo, { status: r.status })
  }
  const erp = criarErp({
    url: URL_ERP,
    token: TOKEN,
    fetch: fetchFalso as typeof fetch,
    agora: () => relogio,
    esperar: async (ms: number) => { esperas.push(ms); relogio += ms },
    ...extra,
  })
  return { erp, chamadas, esperas, avancar: (ms: number) => { relogio += ms } }
}

async function erroDe(promessa: Promise<unknown>): Promise<ErroErp> {
  try {
    await promessa
  } catch (erro) {
    assert.ok(erro instanceof ErroErp, `esperava ErroErp, veio ${String(erro)}`)
    return erro
  }
  assert.fail('a consulta deveria ter falhado')
}

test('envia o POST certo e devolve o texto da coluna dados', async () => {
  const { erp, chamadas } = montar([{ status: 200, corpo: envelope('[185, 186]') }])
  const dados = await erp.consultar('  select 1 as dados;  ')
  assert.equal(dados, '[185, 186]')
  assert.equal(chamadas.length, 1)
  assert.equal(chamadas[0].url, 'https://erp.teste/publica/api/consulta/sql/v1?offset=0&limit=100')
  assert.equal(chamadas[0].init.method, 'POST')
  const cabecalhos = chamadas[0].init.headers as Record<string, string>
  assert.equal(cabecalhos['Authorization'], `Authentication ${TOKEN}`)
  assert.equal(cabecalhos['Content-Type'], 'application/json')
  assert.equal(chamadas[0].init.body, JSON.stringify({ sql: 'select 1 as dados' }))
  assert.ok(chamadas[0].init.signal instanceof AbortSignal)

  // a URL do ERP com barra no fim leva ao mesmo endereço
  const comBarra = montar([{ status: 200, corpo: envelope('[]') }], { url: `${URL_ERP}/` })
  await comBarra.erp.consultar('select 1 as dados')
  assert.equal(comBarra.chamadas[0].url, 'https://erp.teste/publica/api/consulta/sql/v1?offset=0&limit=100')
})

test('SQL de escrita é recusado sem chamar o ERP', async () => {
  const { erp, chamadas } = montar([{ status: 200, corpo: envelope('[]') }])
  const erro = await erroDe(erp.consultar('with x as (delete from documento returning oid) select oid as dados from x'))
  assert.equal(erro.tipo, 'recusado')
  assert.match(erro.message, /^recusado: /)
  assert.equal(chamadas.length, 0)
})

test('19 chamadas no mesmo minuto passam e a 20ª espera a virada do minuto mais 1 s', async () => {
  const { erp, chamadas, esperas } = montar([{ status: 200, corpo: envelope('[]') }])
  for (let i = 0; i < 19; i++) await erp.consultar('select 1 as dados')
  assert.deepEqual(esperas, [])
  await erp.consultar('select 1 as dados')
  // relógio em 14h00m10s: até 14h01m00s são 50 s, mais 1 s de folga
  assert.deepEqual(esperas, [51_000])
  assert.equal(chamadas.length, 20)
})

test('a contagem recomeça quando o minuto do relógio vira', async () => {
  const { erp, esperas, avancar } = montar([{ status: 200, corpo: envelope('[]') }])
  for (let i = 0; i < 19; i++) await erp.consultar('select 1 as dados')
  avancar(50_000)
  for (let i = 0; i < 19; i++) await erp.consultar('select 1 as dados')
  assert.deepEqual(esperas, [])
})

test('no 429, espera a virada do minuto e repete', async () => {
  const { erp, chamadas, esperas } = montar([
    { status: 429, corpo: 'muitas chamadas' },
    { status: 429, corpo: 'muitas chamadas' },
    { status: 200, corpo: envelope('[1]') },
  ])
  assert.equal(await erp.consultar('select 1 as dados'), '[1]')
  assert.equal(chamadas.length, 3)
  // 14h00m10s → 14h01m01s (51 s); 14h01m01s → 14h02m01s (60 s)
  assert.deepEqual(esperas, [51_000, 60_000])
})

test('depois de 3 repetições com 429, desiste com ErroErp http 429', async () => {
  const { erp, chamadas, esperas } = montar([{ status: 429, corpo: 'muitas chamadas' }])
  const erro = await erroDe(erp.consultar('select 1 as dados'))
  assert.equal(erro.tipo, 'http')
  assert.equal(erro.status, 429)
  assert.equal(chamadas.length, 4)
  assert.deepEqual(esperas, [51_000, 60_000, 60_000])
})

test('401 e 403 viram erro de token', async () => {
  for (const status of [401, 403]) {
    const { erp } = montar([{ status, corpo: 'não autorizado' }])
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.equal(erro.tipo, 'token')
    assert.equal(erro.status, status)
  }
})

test('400 vira erro de consulta com o corpo da resposta', async () => {
  const { erp } = montar([{ status: 400, corpo: 'column "idloja" does not exist' }])
  const erro = await erroDe(erp.consultar('select idloja as dados from documento'))
  assert.equal(erro.tipo, 'consulta')
  assert.equal(erro.status, 400)
  assert.equal(erro.message, 'column "idloja" does not exist')
})

test('outro status de erro vira erro http com o status', async () => {
  const { erp } = montar([{ status: 502, corpo: 'bad gateway' }])
  const erro = await erroDe(erp.consultar('select 1 as dados'))
  assert.equal(erro.tipo, 'http')
  assert.equal(erro.status, 502)
})

test('erro de rede e prazo estourado viram erro de rede', async () => {
  const falhas = [new TypeError('fetch failed'), new DOMException('The operation was aborted due to timeout', 'TimeoutError')]
  for (const falha of falhas) {
    const { erp } = montar([falha])
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.equal(erro.tipo, 'rede')
    assert.equal(erro.status, null)
  }
})

test('resposta sem a coluna dados vira erro de consulta', async () => {
  const corpos = [
    JSON.stringify({ offset: 0, limit: 100, total: 0, hasNext: false, items: [] }),
    JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ outra: '[]' }] }),
    JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ dados: 5 }] }),
    JSON.stringify({ offset: 0, limit: 100, total: 2, hasNext: false, items: [{ dados: '[]' }, { dados: '[]' }] }),
    JSON.stringify({ mensagem: 'sem items' }),
    'isto não é JSON',
  ]
  for (const corpo of corpos) {
    const { erp } = montar([{ status: 200, corpo }])
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.equal(erro.tipo, 'consulta')
    assert.equal(erro.message, 'resposta sem a coluna dados')
  }
})

test('o token nunca aparece na mensagem de erro', async () => {
  const cenarios: Resposta[][] = [
    [{ status: 401, corpo: `token ${TOKEN} inválido` }],
    [{ status: 400, corpo: `erro com ${TOKEN} no corpo` }],
    [{ status: 500, corpo: TOKEN }],
    [{ status: 429, corpo: TOKEN }],
    [new TypeError(`falhou ao enviar Authentication ${TOKEN}`)],
  ]
  for (const respostas of cenarios) {
    const { erp } = montar(respostas)
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.ok(!erro.message.includes(TOKEN), `token na mensagem: ${erro.message}`)
    assert.ok(!String(erro.stack).includes(TOKEN), 'token na pilha do erro')
  }
})

test('chama em série: três consultas ao mesmo tempo não se sobrepõem', async () => {
  let abertas = 0
  let maximo = 0
  const fetchLento = async (): Promise<Response> => {
    abertas++
    maximo = Math.max(maximo, abertas)
    await new Promise((resolver) => setTimeout(resolver, 20))
    abertas--
    return new Response(envelope('[]'), { status: 200 })
  }
  const erp = criarErp({ url: URL_ERP, token: TOKEN, fetch: fetchLento as typeof fetch, agora: () => INICIO, esperar: async () => {} })
  const resultados = await Promise.all([
    erp.consultar('select 1 as dados'),
    erp.consultar('select 2 as dados'),
    erp.consultar('select 3 as dados'),
  ])
  assert.deepEqual(resultados, ['[]', '[]', '[]'])
  assert.equal(maximo, 1)
})

test('uma consulta que falha não trava as seguintes', async () => {
  const { erp } = montar([
    { status: 502, corpo: 'bad gateway' },
    { status: 200, corpo: envelope('[7]') },
  ])
  await erroDe(erp.consultar('select 1 as dados'))
  assert.equal(await erp.consultar('select 1 as dados'), '[7]')
})
```

- [ ] **Passo 7: Rodar e ver falhar**

Run: `node --test tradutor/erp.test.mts`

Esperado: FAIL.
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\erp.mts' imported from ...\tradutor\erp.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 8: Implementar o cliente do ERP**

Criar `tradutor/erp.mts`:

```ts
import { verificarSomenteLeitura } from './somente-leitura.mts'

export type TipoErroErp = 'rede' | 'http' | 'token' | 'consulta' | 'recusado'

export class ErroErp extends Error {
  tipo: TipoErroErp
  status: number | null
  constructor(tipo: TipoErroErp, mensagem: string, status: number | null = null) {
    super(mensagem)
    this.name = 'ErroErp'
    this.tipo = tipo
    this.status = status
  }
}

export type Erp = { consultar(sql: string): Promise<string> }

export type OpcoesErp = {
  url: string
  token: string
  fetch?: typeof fetch
  agora?: () => number
  esperar?: (ms: number) => Promise<void>
  limitePorMinuto?: number
  prazoMs?: number
}

const MINUTO = 60_000
const REPETICOES_429 = 3

export function criarErp(opcoes: OpcoesErp): Erp {
  const buscar = opcoes.fetch ?? fetch
  const agora = opcoes.agora ?? Date.now
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms)))
  const limite = opcoes.limitePorMinuto ?? 19
  const prazoMs = opcoes.prazoMs ?? 90_000
  const endereco = `${opcoes.url.replace(/\/+$/, '')}/api/consulta/sql/v1?offset=0&limit=100`
  const token = opcoes.token

  let minutoAtual = -1
  let chamadasNoMinuto = 0
  let fila: Promise<unknown> = Promise.resolve()

  // Tira o token de qualquer texto que vá virar mensagem de erro.
  function semToken(texto: string): string {
    return token === '' ? texto : texto.split(token).join('[token]')
  }

  async function esperarVirada(): Promise<void> {
    const t = agora()
    await esperar((Math.floor(t / MINUTO) + 1) * MINUTO + 1000 - t)
  }

  // A cota do ERP é por minuto do relógio: a 20ª chamada no mesmo minuto espera o minuto seguinte.
  async function aguardarVez(): Promise<void> {
    const minuto = Math.floor(agora() / MINUTO)
    if (minuto !== minutoAtual) {
      minutoAtual = minuto
      chamadasNoMinuto = 0
    }
    if (chamadasNoMinuto >= limite) {
      await esperarVirada()
      minutoAtual = Math.floor(agora() / MINUTO)
      chamadasNoMinuto = 0
    }
    chamadasNoMinuto++
  }

  async function chamar(sql: string): Promise<{ status: number; corpo: string }> {
    try {
      const resposta = await buscar(endereco, {
        method: 'POST',
        headers: { Authorization: `Authentication ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
        signal: AbortSignal.timeout(prazoMs),
      })
      return { status: resposta.status, corpo: await resposta.text() }
    } catch (erro) {
      const prazo = erro instanceof Error && (erro.name === 'TimeoutError' || erro.name === 'AbortError')
      const detalhe = prazo ? `sem resposta em ${Math.round(prazoMs / 1000)} s` : erro instanceof Error ? erro.message : String(erro)
      throw new ErroErp('rede', semToken(`o ERP não respondeu: ${detalhe}`))
    }
  }

  function lerDados(corpo: string): string {
    try {
      const envelope = JSON.parse(corpo) as { items?: unknown }
      const itens = envelope?.items
      if (Array.isArray(itens) && itens.length === 1) {
        const dados = (itens[0] as { dados?: unknown } | null)?.dados
        if (typeof dados === 'string') return dados
      }
    } catch {
      // corpo que não é JSON cai no mesmo erro abaixo
    }
    throw new ErroErp('consulta', 'resposta sem a coluna dados')
  }

  async function executarConsulta(sqlOriginal: string): Promise<string> {
    let sql: string
    try {
      sql = verificarSomenteLeitura(sqlOriginal)
    } catch (erro) {
      throw new ErroErp('recusado', erro instanceof Error ? erro.message : String(erro))
    }
    let repeticoes = 0
    for (;;) {
      await aguardarVez()
      const { status, corpo } = await chamar(sql)
      if (status === 429) {
        if (repeticoes >= REPETICOES_429) {
          throw new ErroErp('http', `o ERP recusou por excesso de chamadas (HTTP 429) depois de ${REPETICOES_429} novas tentativas`, 429)
        }
        repeticoes++
        await esperarVirada()
        continue
      }
      if (status === 401 || status === 403) throw new ErroErp('token', `o ERP recusou o token de acesso (HTTP ${status})`, status)
      if (status === 400) throw new ErroErp('consulta', semToken(corpo), 400)
      if (status < 200 || status > 299) throw new ErroErp('http', `o ERP respondeu com erro (HTTP ${status})`, status)
      return lerDados(corpo)
    }
  }

  return {
    consultar(sql: string): Promise<string> {
      // Em série: cada consulta só sai depois que a anterior terminou, com erro ou não.
      const vez = fila.then(() => executarConsulta(sql))
      fila = vez.catch(() => undefined)
      return vez
    },
  }
}
```

- [ ] **Passo 9: Rodar e ver passar**

Run: `node --test tradutor/erp.test.mts`

Esperado: PASS, em menos de 1 s (as esperas são falsas; só o teste "chama em série" usa 3 pausas reais de 20 ms).
```
ℹ tests 14
ℹ pass 14
ℹ fail 0
```

- [ ] **Passo 10: Somar 14 em `testes-esperados.txt`, verificar e fazer o commit**

N = 14 (os 14 `test(` de `tradutor/erp.test.mts`). Seguindo o plano em ordem, o arquivo passa de `30` para `44`.

```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+14;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Run: `npm run verificar`

Esperado: `tsc -p .` sem nenhum erro e `rodou M testes, esperados M`, com M igual ao número impresso acima.

```bash
git add tradutor/erp.mts tradutor/erp.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Cliente do ERP: só leitura, no ritmo da cota e sem mostrar o token

A 20ª chamada no mesmo minuto espera a virada do minuto; no erro 429
ele espera e repete até 3 vezes. Token recusado (401 ou 403), consulta
com erro (400), ERP fora do ar ou lento demais e resposta sem a coluna
de dados viram erros com nome próprio, que a execução vai transformar
na mensagem certa para o dono. O token nunca aparece numa mensagem de
erro, e as consultas saem uma de cada vez. 14 testes novos, todos com
relógio e ERP falsos: nenhuma chamada de verdade.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 5: ERP falso e consultas simples

**O que esta tarefa entrega, em resultado:** (1) a lista das 108 colunas que o Kaizen lê do ERP vira um arquivo do repositório, e todo valor que entra no SQL do ERP (número, data, lista) passa antes por uma conferência, porque a API não aceita parâmetro; (2) os testes ganham um "ERP falso": um banco local com as 22 tabelas do ERP reduzidas às 108 colunas da lista, com a sessão em DMY e no fuso de São Paulo como o ERP de verdade, e a mesma trava de só leitura; uma consulta que use coluna fora da lista falha já no teste; (3) ficam prontas e conferidas as quatro consultas simples: colunas que sumiram, empresa e local diferentes de 1, documentos vivos e documentos acima do corte com data anterior a 28/09. Todo arquivo de `sql/erp/`, os de hoje e os que as tarefas 6, 7 e 14 vão criar, passa a ser conferido por teste. São 28 testes novos (7 + 8 + 13), em três commits.

**Arquivos:**
- Criar: `sql/erp/colunas-esperadas.txt`
- Criar: `tradutor/sql-erp.mts`
- Criar: `tradutor/erp-falso.mts`
- Criar: `sql/erp/colunas.sql`, `sql/erp/empresa-local.sql`, `sql/erp/vivos.sql`, `sql/erp/antes-da-virada.sql`
- Testar: `tradutor/sql-erp.test.mts`
- Testar: `tradutor/erp-falso.test.mts`
- Testar: `tradutor/consultas-erp.test.mts` (os testes das consultas de `sql/erp/`)
- Modificar: `testes-esperados.txt` (soma 7, depois 8, depois 13: de 44 para 72, seguindo o plano em ordem)

**Interfaces:**
- Consome:
  ```ts
  // tradutor/banco.mts (tarefa 1)
  export type Cliente = pg.Client
  export function garantirLocal(url: string): void            // lança Error('recusado: só localhost:5434 nos testes') fora de localhost:5434
  export async function conectar(url: string): Promise<Cliente> // conecta e roda `set time zone 'America/Fortaleza'`
  // Ao carregar banco.mts, timestamp, timestamptz, date, numeric e bigint chegam como texto (count(*) chega como '3').

  // tradutor/apoio-teste.mts (tarefa 2)
  export const URL_ADMIN = 'postgres://postgres@localhost:5434/postgres'
  export function urlDoBanco(nome: string, usuario: 'postgres' | 'kaizen'): string

  // tradutor/somente-leitura.mts e tradutor/erp.mts (tarefa 4)
  export function verificarSomenteLeitura(sql: string): string   // devolve o SQL aparado; lança Error('recusado: ...')
  export type TipoErroErp = 'rede' | 'http' | 'token' | 'consulta' | 'recusado'
  export class ErroErp extends Error { tipo: TipoErroErp; status: number | null; constructor(tipo: TipoErroErp, mensagem: string, status: number | null = null) }
  export type Erp = { consultar(sql: string): Promise<string> }
  ```
- Produz:
  ```ts
  // tradutor/sql-erp.mts
  export const PASTA_SQL_ERP: string  // caminho absoluto de sql/erp/
  export function modeloErp(nome: string): string          // lê sql/erp/<nome>.sql (utf8), aparado
  export function inteiro(n: number): string               // Number.isSafeInteger && n >= 0, senão lança; devolve String(n)
  export function data(d: string): string                  // /^\d{4}-\d{2}-\d{2}$/, senão lança; devolve `'${d}'`
  export function inteiros(ns: number[]): string           // cada um como inteiro(); `array[1,2,3]::integer[]` ou `array[]::integer[]`
  export function pares(ps: Array<[string, string]>): string // nomes /^[a-z_][a-z0-9_]*$/; `('t','c'),('t2','c2')`; lista vazia lança
  export function montar(modelo: string, valores: Record<string, string>): string
  // troca cada {{nome}} pelo valor; lança se sobrar {{...}} sem valor, valor sem {{...}} ou marcador malformado
  export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }> // sql/erp/colunas-esperadas.txt

  // tradutor/erp-falso.mts (só para testes)
  export type ErpFalso = {
    erp: Erp                 // consultar(sql): trava de só leitura; roda no banco falso; devolve rows[0].dados (exige texto); guarda o SQL em `consultas`
    cliente: Cliente         // superusuário, conectado ao banco falso (para alter table, drop, conferências)
    consultas: string[]      // cada SQL que passou pela trava, já aparado, na ordem
    inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>  // insert parametrizado; colunas = chaves; chave que falta numa linha fica nula
    fechar(): Promise<void>  // fecha o cliente e apaga o banco
  }
  export async function criarErpFalso(): Promise<ErpFalso>
  // cria o banco erp_teste_<pid>_<n> com `jit = off` (alter database: vale para toda conexão a ele) e as 22 tabelas
  ```
  Consultas de `sql/erp/` (cada uma devolve uma linha com a coluna `dados` em texto):

  | Arquivo | Marcadores | `dados` |
  | --- | --- | --- |
  | `colunas.sql` | `pares` | array de `'tabela.coluna'` que não existem em `information_schema.columns` com `table_schema = 'public'`; `[]` quando estão todas lá |
  | `empresa-local.sql` | `corte_documento`, `corte_historico` | array de `{ "tabela": "documento.idempresa", "valor": 2 }`, um por valor distinto de 1, em: `documento.idempresa` (oid > corte_documento), `mercadoria_estoque_historico._idlocalestoque` (oid > corte_historico) e, em todas as linhas, `mercadoria_estoque._idempresa`, `mercadoria_estoque._idlocalestoque`, `mercadoria_custo._idempresa`, `mercadoria_variacao_empresa._idempresa`, `mercadoria_variacao_pessoa._idempresa`, `pessoa_funcionario._idempresa` |
  | `vivos.sql` | `corte_documento` | array de inteiros: `documento.oid` > corte, em ordem crescente |
  | `antes-da-virada.sql` | `corte_documento` | array de `{ "modelo", "quantidade", "primeiro_codigo", "ultimo_codigo", "primeira_datahora", "ultima_datahora" }` dos documentos com oid > corte e `datahora < '2026-09-28'`, um por modelo, em ordem de modelo |

**Regras desta tarefa (repetidas das seções globais e do contrato):**
- Tudo em português. TypeScript só com sintaxe apagável, imports com `.mts`, `import type` para tipos. Testes com `node:test` e `node:assert/strict`, só `test(` no nível de cima.
- Os testes das partes B e C precisam do Postgres local de pé: `docker compose up -d` (tarefa 1). Eles criam e apagam bancos `erp_teste_<pid>_<n>` como `postgres`; só conectam em `localhost:5434` (`garantirLocal`).
- Consultas ao ERP (`sql/erp/*.sql`): um único comando, coluna de saída `dados` em texto (`coalesce(json_agg(...), '[]')::text as dados`), sem comentário, sem `;`, sem `select *`, sem nada do Postgres 15 ou 16 (o ERP roda o 14.17), apelidos de tabela únicos, datas escritas `'AAAA-MM-DD'` (a sessão do ERP está em DMY), inteiros e datas crus dentro do JSON, nunca `datahora::text`. Toda ordenação por texto dentro de `json_agg` usa `collate "C"`, para que a ordem seja a mesma no ERP e no ERP falso.
- O ERP falso imita o ERP de verdade no que importa para os testes: só as 108 colunas da lista, tipos `integer`, `numeric`, `timestamp`, `varchar` e `text`, todas aceitando nulo, sem chave; sessão com `DateStyle = 'ISO, DMY'` e fuso `America/Sao_Paulo`; e erros no mesmo formato do cliente real (`ErroErp('recusado', ...)` para SQL recusado pela trava, `ErroErp('consulta', <mensagem do Postgres>, 400)` para SQL que falha, `ErroErp('consulta', 'resposta sem a coluna dados')` sem a coluna `dados` em texto).
- O banco falso nasce com o JIT desligado (`alter database ... set jit = off`, logo depois de criá-lo). Ele não tem estatísticas, e o Postgres estima custo alto para as consultas grandes (a de cadastros, da tarefa 7) e as compila com JIT: 1,5 s por chamada, contra milissegundos sem JIT. Desligado no banco, e não na sessão, vale para qualquer conexão a ele; os testes das próximas tarefas não precisam de `set jit = off`.
- Para quem escrever as próximas consultas (tarefas 6, 7 e 14): três testes de `tradutor/consultas-erp.test.mts` percorrem todo `sql/erp/*.sql` e conferem cada arquivo sem que ninguém precise mexer neles. Cada consulta é montada com estes valores de exemplo: `pares` → as 108 colunas; `inicio` → `'2026-09-27'`; `pendentes` → `array[185,186]::integer[]`; qualquer outro marcador → `184`. Montada, ela tem de passar na trava de só leitura e rodar no ERP falso vazio devolvendo JSON. Um marcador novo que não seja inteiro precisa de uma linha nova em `valorDeExemplo`.

#### Parte A — lista de colunas e montagem do SQL (7 testes)

- [ ] **Passo 1: Criar a lista das 108 colunas**

Criar `sql/erp/colunas-esperadas.txt` com exatamente estas 108 linhas (`tabela coluna tipo`, separados por um espaço, ordenadas por tabela e coluna em ordem de bytes, terminando com uma quebra de linha):

```
documento _iddocumento integer
documento datahora timestamp
documento datahoramovimento timestamp
documento idabertura integer
documento idcaixaabertura integer
documento idempresa integer
documento idpessoa integer
documento idusuarioabertura integer
documento modelo varchar
documento oid integer
documento status varchar
documento tipomovimento varchar
documento tipomovimentofinanceiro varchar
documento_cancelamento_historico _iddocumento integer
documento_cancelamento_historico datahora timestamp
documento_cancelamento_historico oid integer
documento_conferencia_caixa _iddocumento integer
documento_conferencia_caixa _idpagamento integer
documento_conferencia_caixa oid integer
documento_conferencia_caixa valconferido numeric
documento_conferencia_caixa valdisponivel numeric
documento_mercadoria _iddocumento integer
documento_mercadoria _idsequencia integer
documento_mercadoria idmercadoriavariacao integer
documento_mercadoria idpessoafuncionario integer
documento_mercadoria oid integer
documento_mercadoria qtd numeric
documento_mercadoria valtotalliquido numeric
documento_pagamento _iddocumento integer
documento_pagamento _idsequencia integer
documento_pagamento idpagamento integer
documento_pagamento oid integer
documento_pagamento valor numeric
documento_parcela _iddocumento integer
documento_parcela _idparcela integer
documento_parcela _idsequencia integer
documento_parcela descricao text
documento_parcela dtlancamento timestamp
documento_parcela dtvencimento timestamp
documento_parcela oid integer
documento_parcela status varchar
documento_parcela valparcela numeric
documento_parcela_pagamento _iddocumento integer
documento_parcela_pagamento _idparcela integer
documento_parcela_pagamento _idsequencia integer
documento_parcela_pagamento _idsequenciapagamento integer
documento_parcela_pagamento dtpagamento timestamp
documento_parcela_pagamento idpagamento integer
documento_parcela_pagamento oid integer
documento_parcela_pagamento status varchar
documento_parcela_pagamento valpagamento numeric
mercadoria _idmercadoria integer
mercadoria idgrupo integer
mercadoria idsecao integer
mercadoria idsubgrupo integer
mercadoria_custo _idempresa integer
mercadoria_custo _idmercadoriavariacao integer
mercadoria_custo valcusto numeric
mercadoria_estoque _idempresa integer
mercadoria_estoque _idlocalestoque integer
mercadoria_estoque _idmercadoriavariacao integer
mercadoria_estoque oid integer
mercadoria_estoque qtdsaldo numeric
mercadoria_estoque_historico _iddocumento integer
mercadoria_estoque_historico _idlocalestoque integer
mercadoria_estoque_historico datahora timestamp
mercadoria_estoque_historico idmercadoriavariacao integer
mercadoria_estoque_historico oid integer
mercadoria_estoque_historico qtdnovosaldo numeric
mercadoria_estoque_historico qtdsaldoatual numeric
mercadoria_grupo _idgrupo integer
mercadoria_grupo descricao varchar
mercadoria_marca _idmarca integer
mercadoria_marca descricao varchar
mercadoria_secao _idsecao integer
mercadoria_secao descricao varchar
mercadoria_subgrupo _idsubgrupo integer
mercadoria_subgrupo descricao varchar
mercadoria_variacao _idmercadoriavariacao integer
mercadoria_variacao descricao varchar
mercadoria_variacao idmarca integer
mercadoria_variacao idmercadoria integer
mercadoria_variacao_empresa _idempresa integer
mercadoria_variacao_empresa _idmercadoriavariacao integer
mercadoria_variacao_empresa flaginativo varchar
mercadoria_variacao_pessoa _idempresa integer
mercadoria_variacao_pessoa _idmercadoriavariacao integer
mercadoria_variacao_pessoa _idpessoa integer
mercadoria_variacao_pessoa flaginativo varchar
municipio _idmunicipio integer
municipio nome varchar
pessoa _idpessoa integer
pessoa cnpjcpf varchar
pessoa flaginativo varchar
pessoa nome varchar
pessoa sobrenome varchar
pessoa_endereco _idendereco integer
pessoa_endereco _idpessoa integer
pessoa_endereco bairro varchar
pessoa_endereco flaginativo varchar
pessoa_endereco flagprincipal varchar
pessoa_endereco idibgemunicipio integer
pessoa_endereco uf varchar
pessoa_funcionario _idempresa integer
pessoa_funcionario _idpessoa integer
pessoa_funcionario flaginativo varchar
pessoa_funcionario idusuario integer
pessoa_funcionario tipo varchar
```

- [ ] **Passo 2: Escrever o teste da montagem do SQL**

Criar `tradutor/sql-erp.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inteiro, data, inteiros, pares, montar, lerColunasEsperadas } from './sql-erp.mts'

test('inteiro aceita inteiro seguro e não negativo, e recusa o resto', () => {
  assert.equal(inteiro(0), '0')
  assert.equal(inteiro(184), '184')
  assert.equal(inteiro(2147483647), '2147483647')
  for (const n of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
    assert.throws(() => inteiro(n), /inteiro inválido/, `deveria recusar ${n}`)
  }
})

test("data aceita só AAAA-MM-DD e devolve entre aspas simples", () => {
  assert.equal(data('2026-09-27'), "'2026-09-27'")
  for (const d of ['27/09/2026', '2026-9-27', '2026-09-27 00:00', "2026-09-27'; select 1", '']) {
    assert.throws(() => data(d), /data inválida/, `deveria recusar ${d}`)
  }
})

test('inteiros monta a lista do SQL, vazia ou não, e recusa valor inválido', () => {
  assert.equal(inteiros([185, 186, 190]), 'array[185,186,190]::integer[]')
  assert.equal(inteiros([]), 'array[]::integer[]')
  assert.throws(() => inteiros([185, -1]))
  assert.throws(() => inteiros([185, 1.5]))
})

test('pares monta a lista de valores e recusa nome fora do padrão ou lista vazia', () => {
  assert.equal(pares([['documento', 'oid'], ['pessoa', '_idpessoa']]), "('documento','oid'),('pessoa','_idpessoa')")
  assert.throws(() => pares([['documento', "oid'),('x"]]))
  assert.throws(() => pares([['Documento', 'oid']]))
  assert.throws(() => pares([['1documento', 'oid']]))
  assert.throws(() => pares([]))
})

test('montar troca cada marcador pelo seu valor, quantas vezes ele aparecer', () => {
  assert.equal(
    montar('select {{a}} as x, {{b}} as y, {{a}} as z', { a: '1', b: "'2026-09-27'" }),
    "select 1 as x, '2026-09-27' as y, 1 as z",
  )
  // o valor entra como está, sem os padrões especiais de substituição ($&, $1)
  assert.equal(montar('select {{a}} as x', { a: "'$&$1'" }), "select '$&$1' as x")
})

test('montar recusa marcador sem valor, valor sem marcador e marcador malformado', () => {
  assert.throws(() => montar('select {{a}}, {{b}}', { a: '1' }), /falta valor para \{\{b\}\}/)
  assert.throws(() => montar('select {{a}}', { a: '1', b: '2' }), /valor sem marcador no SQL: b$/)
  assert.throws(() => montar('select {{Maiuscula}}', {}), /malformado/)
})

test('lerColunasEsperadas lê as 108 colunas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadas()
  assert.equal(colunas.length, 108)
  assert.deepEqual(colunas[0], { tabela: 'documento', coluna: '_iddocumento', tipo: 'integer' })
  assert.deepEqual(colunas[colunas.length - 1], { tabela: 'pessoa_funcionario', coluna: 'tipo', tipo: 'varchar' })
  for (let i = 1; i < colunas.length; i++) {
    const a = colunas[i - 1]
    const b = colunas[i]
    assert.ok(a.tabela < b.tabela || (a.tabela === b.tabela && a.coluna < b.coluna), `fora de ordem ou repetida: ${b.tabela}.${b.coluna}`)
  }
  assert.deepEqual([...new Set(colunas.map((c) => c.tipo))].sort(), ['integer', 'numeric', 'text', 'timestamp', 'varchar'])
  assert.equal(new Set(colunas.map((c) => c.tabela)).size, 22)
})
```

- [ ] **Passo 3: Rodar e ver falhar**

Run: `node --test tradutor/sql-erp.test.mts`

Esperado: FAIL.
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\sql-erp.mts' imported from ...\tradutor\sql-erp.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 4: Implementar a montagem do SQL**

Criar `tradutor/sql-erp.mts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PASTA_SQL_ERP = fileURLToPath(new URL('../sql/erp/', import.meta.url))

const NOME = /^[a-z_][a-z0-9_]*$/
const TIPOS = new Set(['integer', 'numeric', 'timestamp', 'varchar', 'text'])

export function modeloErp(nome: string): string {
  return readFileSync(join(PASTA_SQL_ERP, `${nome}.sql`), 'utf8').trim()
}

// O SQL da API do ERP não aceita parâmetro: todo valor entra no texto, e só depois de conferido aqui.
export function inteiro(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`inteiro inválido para o SQL do ERP: ${n}`)
  return String(n)
}

export function data(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`data inválida para o SQL do ERP: ${d}`)
  return `'${d}'`
}

export function inteiros(ns: number[]): string {
  return `array[${ns.map(inteiro).join(',')}]::integer[]`
}

export function pares(ps: Array<[string, string]>): string {
  if (ps.length === 0) throw new Error('lista de pares vazia')
  return ps
    .map(([tabela, coluna]) => {
      if (!NOME.test(tabela) || !NOME.test(coluna)) throw new Error(`nome inválido para o SQL do ERP: ${tabela}.${coluna}`)
      return `('${tabela}','${coluna}')`
    })
    .join(',')
}

export function montar(modelo: string, valores: Record<string, string>): string {
  const usados = new Set<string>()
  const texto = modelo.replace(/\{\{([a-z_][a-z0-9_]*)\}\}/g, (_marcador: string, nome: string) => {
    if (!Object.hasOwn(valores, nome)) throw new Error(`falta valor para {{${nome}}}`)
    usados.add(nome)
    return valores[nome]
  })
  if (texto.includes('{{') || texto.includes('}}')) throw new Error('sobrou marcador {{...}} malformado no SQL')
  for (const nome of Object.keys(valores)) {
    if (!usados.has(nome)) throw new Error(`valor sem marcador no SQL: ${nome}`)
  }
  return texto
}

export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }> {
  const texto = readFileSync(join(PASTA_SQL_ERP, 'colunas-esperadas.txt'), 'utf8')
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const partes = linha.split(/\s+/)
      const [tabela, coluna, tipo] = partes
      if (partes.length !== 3 || !NOME.test(tabela) || !NOME.test(coluna) || !TIPOS.has(tipo)) {
        throw new Error(`linha inválida em colunas-esperadas.txt: ${linha}`)
      }
      return { tabela, coluna, tipo }
    })
}
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `node --test tradutor/sql-erp.test.mts`

Esperado: PASS.
```
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

- [ ] **Passo 6: Somar 7 em `testes-esperados.txt`, verificar e fazer o commit**

N = 7 (os 7 `test(` de `tradutor/sql-erp.test.mts`). Seguindo o plano em ordem, o arquivo passa de `44` para `51`. Ele guarda só um número; este comando soma N e imprime o novo valor:

```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+7;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Run: `npm run verificar`

Esperado: `tsc -p .` sem nenhum erro e `rodou M testes, esperados M`, com M igual ao número impresso acima.

```bash
git add sql/erp/colunas-esperadas.txt tradutor/sql-erp.mts tradutor/sql-erp.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Lista das 108 colunas do ERP e montagem conferida do SQL

A API do ERP não aceita parâmetro, então todo número, data e lista
entra no texto do SQL, e agora só depois de conferido: inteiro não
negativo, data no formato AAAA-MM-DD, nomes só com minúsculas, dígitos
e _. Marcador sem valor, ou valor sem marcador, para a montagem em vez
de mandar SQL errado. A lista das 108 colunas que o Kaizen lê do ERP
virou arquivo do repositório. 7 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

#### Parte B — ERP falso (8 testes)

- [ ] **Passo 7: Escrever o teste do ERP falso**

Criar `tradutor/erp-falso.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { ErroErp } from './erp.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import { conectar } from './banco.mts'
import { URL_ADMIN, urlDoBanco } from './apoio-teste.mts'

const TIPO_NO_POSTGRES: Record<string, string> = {
  integer: 'integer',
  numeric: 'numeric',
  timestamp: 'timestamp without time zone',
  varchar: 'character varying',
  text: 'text',
}

async function comErpFalso(fazer: (falso: ErpFalso) => Promise<void>): Promise<void> {
  const falso = await criarErpFalso()
  try {
    await fazer(falso)
  } finally {
    await falso.fechar()
  }
}

function erroErp(tipo: string, mensagem: RegExp) {
  return (erro: unknown): boolean => {
    assert.ok(erro instanceof ErroErp, `esperava ErroErp, veio ${String(erro)}`)
    assert.equal(erro.tipo, tipo)
    assert.match(erro.message, mensagem)
    return true
  }
}

test('cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave', async () => {
  await comErpFalso(async (falso) => {
    const r = await falso.cliente.query(
      `select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nulo
       from information_schema.columns where table_schema = 'public'
       order by table_name::text collate "C", column_name::text collate "C"`,
    )
    const esperadas = lerColunasEsperadas().map((c) => ({ tabela: c.tabela, coluna: c.coluna, tipo: TIPO_NO_POSTGRES[c.tipo], nulo: 'YES' }))
    assert.equal(r.rows.length, 108)
    assert.deepEqual(r.rows, esperadas)
    const restricoes = await falso.cliente.query(`select count(*) as n from information_schema.table_constraints where table_schema = 'public'`)
    assert.equal(restricoes.rows[0].n, '0')
  })
})

test('a sessão imita a do ERP (DateStyle ISO, DMY e fuso America/Sao_Paulo) e o banco falso roda sem JIT', async () => {
  await comErpFalso(async (falso) => {
    assert.equal((await falso.cliente.query('show datestyle')).rows[0].DateStyle, 'ISO, DMY')
    assert.equal((await falso.cliente.query('show timezone')).rows[0].TimeZone, 'America/Sao_Paulo')
    assert.equal((await falso.cliente.query('show jit')).rows[0].jit, 'off')
    // Desligado no banco, e não só nesta sessão: uma conexão nova também vem sem JIT.
    const nome: string = (await falso.cliente.query('select current_database() as nome')).rows[0].nome
    const outra = await conectar(urlDoBanco(nome, 'postgres'))
    try {
      assert.equal((await outra.query('show jit')).rows[0].jit, 'off')
    } finally {
      await outra.end()
    }
  })
})

test('consulta com coluna fora da lista falha como erro de consulta', async () => {
  await comErpFalso(async (falso) => {
    const sql = `select coalesce(json_agg(d.idloja), '[]')::text as dados from documento d`
    await assert.rejects(falso.erp.consultar(sql), erroErp('consulta', /idloja/))
  })
})

test('devolve o texto da coluna dados e guarda cada consulta', async () => {
  await comErpFalso(async (falso) => {
    await falso.inserir('documento', [
      { oid: 186, modelo: 'PA', datahora: '2026-09-28 10:00:00' },
      { oid: 185, modelo: 'AC' },
    ])
    const sql = `select coalesce(json_agg(json_build_object('oid', d.oid, 'modelo', d.modelo, 'datahora', d.datahora) order by d.oid), '[]')::text as dados from documento d`
    const dados = await falso.erp.consultar(`  ${sql};  `)
    assert.equal(typeof dados, 'string')
    assert.deepEqual(JSON.parse(dados), [
      { oid: 185, modelo: 'AC', datahora: null },
      { oid: 186, modelo: 'PA', datahora: '2026-09-28T10:00:00' },
    ])
    assert.deepEqual(falso.consultas, [sql])
  })
})

test('inserir aceita linhas com colunas diferentes e grava o número como veio', async () => {
  await comErpFalso(async (falso) => {
    await falso.inserir('documento_mercadoria', [
      { oid: 1873, _iddocumento: 94, qtd: '123456789012345678.123456' },
      { oid: 1874, valtotalliquido: '0.000001' },
    ])
    const r = await falso.cliente.query(
      'select oid, _iddocumento, qtd::text as qtd, valtotalliquido::text as valor from documento_mercadoria order by oid',
    )
    assert.deepEqual(r.rows, [
      { oid: 1873, _iddocumento: 94, qtd: '123456789012345678.123456', valor: null },
      { oid: 1874, _iddocumento: null, qtd: null, valor: '0.000001' },
    ])
  })
})

test('recusa SQL de escrita sem rodar nada', async () => {
  await comErpFalso(async (falso) => {
    await falso.inserir('documento', [{ oid: 185 }])
    await assert.rejects(falso.erp.consultar('delete from documento'), erroErp('recusado', /^recusado: /))
    await assert.rejects(
      falso.erp.consultar(`with x as (delete from documento returning oid) select coalesce(json_agg(oid), '[]')::text as dados from x`),
      erroErp('recusado', /^recusado: /),
    )
    const r = await falso.cliente.query('select count(*) as n from documento')
    assert.equal(r.rows[0].n, '1')
    assert.deepEqual(falso.consultas, [])
  })
})

test('exige uma linha só, com a coluna dados em texto', async () => {
  await comErpFalso(async (falso) => {
    for (const sql of ['select 1 as dados', "select 'x' as outra", "select 'x' as dados from documento where false"]) {
      await assert.rejects(falso.erp.consultar(sql), erroErp('consulta', /^resposta sem a coluna dados$/))
    }
  })
})

test('fechar apaga o banco falso', async () => {
  const falso = await criarErpFalso()
  const nome: string = (await falso.cliente.query('select current_database() as nome')).rows[0].nome
  assert.match(nome, new RegExp(`^erp_teste_${process.pid}_\\d+$`))
  await falso.fechar()
  const admin = await conectar(URL_ADMIN)
  try {
    const r = await admin.query('select count(*) as n from pg_database where datname = $1', [nome])
    assert.equal(r.rows[0].n, '0')
  } finally {
    await admin.end()
  }
})
```

- [ ] **Passo 8: Rodar e ver falhar**

Run: `node --test tradutor/erp-falso.test.mts`

Esperado: FAIL.
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\erp-falso.mts' imported from ...\tradutor\erp-falso.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 9: Implementar o ERP falso**

Criar `tradutor/erp-falso.mts`:

```ts
// Só para testes: um Postgres com as tabelas do ERP, reduzidas às colunas de colunas-esperadas.txt.
import { conectar, garantirLocal, type Cliente } from './banco.mts'
import { URL_ADMIN, urlDoBanco } from './apoio-teste.mts'
import { ErroErp, type Erp } from './erp.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import { verificarSomenteLeitura } from './somente-leitura.mts'

export type ErpFalso = {
  erp: Erp
  cliente: Cliente
  consultas: string[]
  inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>
  fechar(): Promise<void>
}

const NOME = /^[a-z_][a-z0-9_]*$/
const LINHAS_POR_INSERT = 500
let contador = 0

async function comoAdmin(sql: string): Promise<void> {
  garantirLocal(URL_ADMIN)
  const admin = await conectar(URL_ADMIN)
  try {
    await admin.query(sql)
  } finally {
    await admin.end()
  }
}

export async function criarErpFalso(): Promise<ErpFalso> {
  contador++
  const nome = `erp_teste_${process.pid}_${contador}`
  await comoAdmin(`drop database if exists ${nome} with (force)`)
  await comoAdmin(`create database ${nome}`)
  // Sem estatísticas, o Postgres estima custo alto e compila as consultas grandes (cadastros) com JIT:
  // 1,5 s por chamada em vez de milissegundos. Desligado no banco, vale para toda conexão a ele.
  await comoAdmin(`alter database ${nome} set jit = off`)
  const url = urlDoBanco(nome, 'postgres')
  garantirLocal(url)
  const cliente = await conectar(url)
  // A sessão do ERP de verdade está em America/Sao_Paulo, com DateStyle ISO, DMY.
  await cliente.query(`set time zone 'America/Sao_Paulo'`)
  await cliente.query(`set datestyle = 'ISO, DMY'`)

  const colunasPorTabela = new Map<string, string[]>()
  for (const c of lerColunasEsperadas()) {
    const colunas = colunasPorTabela.get(c.tabela) ?? []
    colunas.push(`${c.coluna} ${c.tipo}`)
    colunasPorTabela.set(c.tabela, colunas)
  }
  for (const [tabela, colunas] of colunasPorTabela) {
    await cliente.query(`create table public.${tabela} (${colunas.join(', ')})`)
  }

  const consultas: string[] = []

  const erp: Erp = {
    async consultar(sql: string): Promise<string> {
      let texto: string
      try {
        texto = verificarSomenteLeitura(sql)
      } catch (erro) {
        throw new ErroErp('recusado', erro instanceof Error ? erro.message : String(erro))
      }
      consultas.push(texto)
      let linhas: Array<Record<string, unknown>>
      try {
        linhas = (await cliente.query(texto)).rows
      } catch (erro) {
        // A API do ERP responde 400 quando o SQL falha.
        throw new ErroErp('consulta', erro instanceof Error ? erro.message : String(erro), 400)
      }
      const dados = linhas.length === 1 ? linhas[0].dados : undefined
      if (typeof dados !== 'string') throw new ErroErp('consulta', 'resposta sem a coluna dados')
      return dados
    },
  }

  async function inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void> {
    if (!NOME.test(tabela)) throw new Error(`nome de tabela inválido: ${tabela}`)
    for (let inicio = 0; inicio < linhas.length; inicio += LINHAS_POR_INSERT) {
      const lote = linhas.slice(inicio, inicio + LINHAS_POR_INSERT)
      const colunas: string[] = []
      for (const linha of lote) {
        for (const chave of Object.keys(linha)) if (!colunas.includes(chave)) colunas.push(chave)
      }
      for (const coluna of colunas) if (!NOME.test(coluna)) throw new Error(`nome de coluna inválido: ${coluna}`)
      const valores: unknown[] = []
      const tuplas = lote.map((linha) => {
        const marcadores = colunas.map((coluna) => {
          valores.push(linha[coluna] ?? null)
          return `$${valores.length}`
        })
        return `(${marcadores.join(', ')})`
      })
      await cliente.query(`insert into public.${tabela} (${colunas.join(', ')}) values ${tuplas.join(', ')}`, valores)
    }
  }

  async function fechar(): Promise<void> {
    await cliente.end()
    await comoAdmin(`drop database if exists ${nome} with (force)`)
  }

  return { erp, cliente, consultas, inserir, fechar }
}
```

- [ ] **Passo 10: Rodar e ver passar**

Run: `node --test tradutor/erp-falso.test.mts` (com o Postgres local de pé)

Esperado: PASS; cada teste leva menos de 1 s (cria e apaga um banco). O teste `a sessão imita a do ERP (DateStyle ISO, DMY e fuso America/Sao_Paulo) e o banco falso roda sem JIT` confere o `jit = off` na conexão do ERP falso e numa conexão nova ao mesmo banco; se ele falhar com `actual: 'on'`, falta o `alter database ... set jit = off` logo depois do `create database`.
```
ℹ tests 8
ℹ pass 8
ℹ fail 0
```

- [ ] **Passo 11: Somar 8 em `testes-esperados.txt`, verificar e fazer o commit**

N = 8 (os 8 `test(` de `tradutor/erp-falso.test.mts`). Seguindo o plano em ordem, o arquivo passa de `51` para `59`.

```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+8;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Run: `npm run verificar`

Esperado: `tsc -p .` sem nenhum erro e `rodou M testes, esperados M`, com M igual ao número impresso acima.

```bash
git add tradutor/erp-falso.mts tradutor/erp-falso.test.mts testes-esperados.txt
git commit -F - <<'EOF'
ERP falso para os testes, só com as 108 colunas da lista

Os testes passam a ter um ERP de mentira num Postgres local: as 22
tabelas do ERP com exatamente as colunas da lista, a sessão em DMY e
no fuso de São Paulo como o ERP de verdade, e a mesma trava de só
leitura do cliente real. Uma consulta que use uma coluna fora da lista
falha já no teste, antes de chegar ao ERP. O banco de mentira nasce com
o JIT do Postgres desligado: sem ele, a consulta de cadastros levaria
1,5 s por chamada nos testes, em vez de milissegundos. 8 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

#### Parte C — as quatro consultas simples (13 testes)

- [ ] **Passo 12: Escrever o teste das consultas de `sql/erp/`**

Criar `tradutor/consultas-erp.test.mts`:

```ts
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { PASTA_SQL_ERP, modeloErp, montar, inteiro, data, inteiros, pares, lerColunasEsperadas } from './sql-erp.mts'
import { verificarSomenteLeitura } from './somente-leitura.mts'

let falso: ErpFalso

before(async () => {
  falso = await criarErpFalso()
})

after(async () => {
  await falso?.fechar()
})

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

async function limpar(): Promise<void> {
  await falso.cliente.query(TABELAS_DO_ERP.map((tabela) => `delete from ${tabela}`).join('; '))
}

function todosOsPares(): string {
  return pares(lerColunasEsperadas().map((c): [string, string] => [c.tabela, c.coluna]))
}

// Um valor válido para cada marcador das consultas (contrato, seção 6). Marcador novo que não seja
// inteiro precisa entrar aqui.
function valorDeExemplo(marcador: string): string {
  if (marcador === 'pares') return todosOsPares()
  if (marcador === 'inicio') return data('2026-09-27')
  if (marcador === 'pendentes') return inteiros([185, 186])
  return inteiro(184)
}

function consultasDoErp(): string[] {
  return readdirSync(PASTA_SQL_ERP)
    .filter((arquivo) => arquivo.endsWith('.sql'))
    .map((arquivo) => arquivo.slice(0, -'.sql'.length))
    .sort()
}

function montarComExemplos(nome: string): string {
  const modelo = modeloErp(nome)
  const marcadores = [...new Set([...modelo.matchAll(/\{\{([a-z_][a-z0-9_]*)\}\}/g)].map((m) => m[1]))]
  return montar(modelo, Object.fromEntries(marcadores.map((m) => [m, valorDeExemplo(m)])))
}

function consultarEmpresaLocal(): Promise<string> {
  return falso.erp.consultar(montar(modeloErp('empresa-local'), { corte_documento: inteiro(184), corte_historico: inteiro(1847) }))
}

async function inserirTudoNaEmpresaUm(): Promise<void> {
  await falso.inserir('documento', [{ oid: 185, idempresa: 1 }])
  await falso.inserir('mercadoria_estoque_historico', [{ oid: 1848, _idlocalestoque: 1 }])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '3.000000' }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 1, _idmercadoriavariacao: 60, valcusto: '10.50' }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 1, _idmercadoriavariacao: 60, flaginativo: 'F' }])
  await falso.inserir('mercadoria_variacao_pessoa', [{ _idempresa: 1, _idmercadoriavariacao: 60, _idpessoa: 7, flaginativo: 'F' }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' }])
}

test('modeloErp lê o arquivo de sql/erp sem espaço sobrando', () => {
  const texto = modeloErp('vivos')
  assert.ok(texto.startsWith('select '))
  assert.equal(texto, texto.trim())
})

test('colunas: lista vazia quando todas as colunas esperadas existem', async () => {
  const dados = await falso.erp.consultar(montar(modeloErp('colunas'), { pares: todosOsPares() }))
  assert.equal(dados, '[]')
})

test('colunas: acusa a coluna apagada e as colunas de uma tabela que sumiu', async () => {
  const outro = await criarErpFalso()
  try {
    await outro.cliente.query('alter table documento drop column idempresa')
    await outro.cliente.query('drop table municipio')
    const dados = await outro.erp.consultar(montar(modeloErp('colunas'), { pares: todosOsPares() }))
    assert.deepEqual(JSON.parse(dados), ['documento.idempresa', 'municipio._idmunicipio', 'municipio.nome'])
  } finally {
    await outro.fechar()
  }
})

test('empresa-local: lista vazia quando empresa e local são todos 1', async () => {
  await limpar()
  await inserirTudoNaEmpresaUm()
  assert.equal(await consultarEmpresaLocal(), '[]')
})

test('empresa-local: acusa idempresa 2 acima do corte e ignora abaixo dele', async () => {
  await limpar()
  await inserirTudoNaEmpresaUm()
  await falso.inserir('documento', [{ oid: 184, idempresa: 2 }, { oid: 30, idempresa: 3 }])
  assert.equal(await consultarEmpresaLocal(), '[]')
  await falso.inserir('documento', [{ oid: 186, idempresa: 2 }, { oid: 187, idempresa: 2 }])
  assert.deepEqual(JSON.parse(await consultarEmpresaLocal()), [{ tabela: 'documento.idempresa', valor: 2 }])
})

test('empresa-local: acusa cada uma das oito colunas conferidas, uma vez por valor', async () => {
  await limpar()
  await inserirTudoNaEmpresaUm()
  await falso.inserir('documento', [{ oid: 188, idempresa: 2 }])
  await falso.inserir('mercadoria_estoque_historico', [{ oid: 1847, _idlocalestoque: 9 }, { oid: 1849, _idlocalestoque: 2 }])
  await falso.inserir('mercadoria_estoque', [{ oid: 2, _idempresa: 3, _idlocalestoque: 1 }, { oid: 3, _idempresa: 1, _idlocalestoque: 4 }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 5 }, { _idempresa: 5 }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 6 }])
  await falso.inserir('mercadoria_variacao_pessoa', [{ _idempresa: 7 }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 8 }])
  assert.deepEqual(JSON.parse(await consultarEmpresaLocal()), [
    { tabela: 'documento.idempresa', valor: 2 },
    { tabela: 'mercadoria_custo._idempresa', valor: 5 },
    { tabela: 'mercadoria_estoque._idempresa', valor: 3 },
    { tabela: 'mercadoria_estoque._idlocalestoque', valor: 4 },
    { tabela: 'mercadoria_estoque_historico._idlocalestoque', valor: 2 },
    { tabela: 'mercadoria_variacao_empresa._idempresa', valor: 6 },
    { tabela: 'mercadoria_variacao_pessoa._idempresa', valor: 7 },
    { tabela: 'pessoa_funcionario._idempresa', valor: 8 },
  ])
})

test('vivos: só os documentos acima do corte, em ordem de oid', async () => {
  await limpar()
  await falso.inserir('documento', [{ oid: 190 }, { oid: 184 }, { oid: 185 }, { oid: 30 }, { oid: 186 }])
  const dados = await falso.erp.consultar(montar(modeloErp('vivos'), { corte_documento: inteiro(184) }))
  assert.deepEqual(JSON.parse(dados), [185, 186, 190])
})

test("vivos: '[]' quando não há documento acima do corte", async () => {
  await limpar()
  await falso.inserir('documento', [{ oid: 184 }, { oid: 10 }])
  const dados = await falso.erp.consultar(montar(modeloErp('vivos'), { corte_documento: inteiro(184) }))
  assert.equal(dados, '[]')
})

test('antes-da-virada: agrupa por modelo só os documentos acima do corte e anteriores a 28/09', async () => {
  await limpar()
  await falso.inserir('documento', [
    { oid: 150, _iddocumento: 48, modelo: 'LE', datahora: '2026-09-26 22:47:00' },
    { oid: 184, _iddocumento: 49, modelo: 'AS', datahora: '2026-09-26 22:40:00' },
    { oid: 185, _iddocumento: 94, modelo: 'AC', datahora: '2026-09-27 14:20:00' },
    { oid: 186, _iddocumento: 95, modelo: 'AC', datahora: '2026-09-27 14:21:30.5' },
    { oid: 228, _iddocumento: 137, modelo: 'AC', datahora: '2026-09-27 14:33:00' },
    { oid: 229, _iddocumento: 2, modelo: 'CP', datahora: '2026-04-10 00:00:00' },
    { oid: 230, _iddocumento: 3, modelo: 'CP', datahora: '2026-09-27 23:59:59.999999' },
    { oid: 231, _iddocumento: 50, modelo: 'PA', datahora: '2026-09-28 00:00:00' },
    { oid: 232, _iddocumento: 51, modelo: 'AX', datahora: '2026-09-28 07:55:00' },
  ])
  const dados = await falso.erp.consultar(montar(modeloErp('antes-da-virada'), { corte_documento: inteiro(184) }))
  assert.deepEqual(JSON.parse(dados), [
    {
      modelo: 'AC', quantidade: 3, primeiro_codigo: 94, ultimo_codigo: 137,
      primeira_datahora: '2026-09-27T14:20:00', ultima_datahora: '2026-09-27T14:33:00',
    },
    {
      modelo: 'CP', quantidade: 2, primeiro_codigo: 2, ultimo_codigo: 3,
      primeira_datahora: '2026-04-10T00:00:00', ultima_datahora: '2026-09-27T23:59:59.999999',
    },
  ])
})

test("antes-da-virada: '[]' quando todo documento acima do corte já é de 28/09 em diante", async () => {
  await limpar()
  await falso.inserir('documento', [
    { oid: 184, _iddocumento: 49, modelo: 'AS', datahora: '2026-09-26 22:40:00' },
    { oid: 231, _iddocumento: 50, modelo: 'PA', datahora: '2026-09-28 08:05:00' },
  ])
  const dados = await falso.erp.consultar(montar(modeloErp('antes-da-virada'), { corte_documento: inteiro(184) }))
  assert.equal(dados, '[]')
})

test('toda consulta de sql/erp é um comando só, sem comentário, e passa na trava de só leitura depois de montada', () => {
  const nomes = consultasDoErp()
  assert.ok(nomes.length >= 4, `achou só ${nomes.length} consultas em sql/erp`)
  for (const nome of nomes) {
    const texto = modeloErp(nome)
    assert.ok(!texto.includes('--'), `${nome}.sql tem comentário --`)
    assert.ok(!texto.includes('/*'), `${nome}.sql tem comentário /*`)
    assert.ok(!texto.includes(';'), `${nome}.sql tem ;`)
    const montado = montarComExemplos(nome)
    assert.doesNotThrow(() => verificarSomenteLeitura(montado), `${nome}.sql não passa na trava de só leitura`)
  }
})

test('nenhuma consulta de sql/erp usa select *, sintaxe do Postgres 15 ou 16, nem data convertida em texto', () => {
  const colunasDeData = lerColunasEsperadas().filter((c) => c.tipo === 'timestamp').map((c) => c.coluna)
  // O ERP roda Postgres 14; o ERP falso roda 16 e aceitaria estas. json_object e json_array existem
  // no 14 com outro sentido ou nem existem: use json_build_object, json_build_array e json_agg.
  const soDoPostgres15ou16 = [
    'json_object', 'json_array', 'json_objectagg', 'json_arrayagg', 'json_scalar', 'json_serialize', 'any_value',
    'regexp_count', 'regexp_like', 'regexp_instr', 'regexp_substr', 'array_shuffle', 'array_sample',
    'random_normal', 'pg_input_is_valid', 'date_add', 'date_subtract', 'system_user',
  ]
  const nomes = consultasDoErp()
  assert.ok(nomes.length >= 4, `achou só ${nomes.length} consultas em sql/erp`)
  for (const nome of nomes) {
    const texto = modeloErp(nome).toLowerCase()
    assert.ok(!/select\s+\*/.test(texto), `${nome}.sql usa select *`)
    for (const palavra of soDoPostgres15ou16) {
      assert.ok(!new RegExp(`\\b${palavra}\\b`).test(texto), `${nome}.sql usa ${palavra}, que não serve no Postgres 14 do ERP`)
    }
    assert.ok(!/\bis\s+(not\s+)?json\b/.test(texto), `${nome}.sql usa IS JSON, que o Postgres 14 do ERP não tem`)
    for (const coluna of colunasDeData) {
      assert.ok(!new RegExp(`\\b${coluna}\\s*::\\s*(text|varchar)`).test(texto), `${nome}.sql converte ${coluna} em texto`)
    }
  }
})

test('toda consulta de sql/erp roda no ERP falso vazio, só com as colunas esperadas, e devolve JSON', async () => {
  await limpar()
  const nomes = consultasDoErp()
  assert.ok(nomes.length >= 4, `achou só ${nomes.length} consultas em sql/erp`)
  for (const nome of nomes) {
    let dados: string
    try {
      dados = await falso.erp.consultar(montarComExemplos(nome))
    } catch (erro) {
      assert.fail(`${nome}.sql não rodou no ERP falso: ${erro instanceof Error ? erro.message : String(erro)}`)
    }
    assert.doesNotThrow(() => JSON.parse(dados), `${nome}.sql não devolveu JSON`)
  }
})
```

- [ ] **Passo 13: Rodar e ver falhar**

Run: `node --test tradutor/consultas-erp.test.mts` (com o Postgres local de pé)

Esperado: FAIL nos 13. Os testes de cada consulta caem em `ENOENT: no such file or directory, open '...\sql\erp\vivos.sql'` (ou `colunas.sql`, `empresa-local.sql`, `antes-da-virada.sql`), e os três que percorrem a pasta caem em `achou só 0 consultas em sql/erp`.
```
ℹ tests 13
ℹ pass 0
ℹ fail 13
```

- [ ] **Passo 14: Escrever as quatro consultas**

Criar `sql/erp/colunas.sql`:

```sql
select coalesce(json_agg(e.tabela || '.' || e.coluna order by e.tabela collate "C", e.coluna collate "C"), '[]')::text as dados
from (values {{pares}}) as e (tabela, coluna)
where not exists (
  select 1
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = e.tabela and c.column_name = e.coluna
)
```

Criar `sql/erp/empresa-local.sql`:

```sql
select coalesce(json_agg(json_build_object('tabela', v.tabela, 'valor', v.valor) order by v.tabela collate "C", v.valor), '[]')::text as dados
from (
  select 'documento.idempresa' as tabela, d.idempresa as valor
  from documento d where d.oid > {{corte_documento}} and d.idempresa <> 1
  union
  select 'mercadoria_estoque_historico._idlocalestoque', h._idlocalestoque
  from mercadoria_estoque_historico h where h.oid > {{corte_historico}} and h._idlocalestoque <> 1
  union
  select 'mercadoria_estoque._idempresa', me._idempresa
  from mercadoria_estoque me where me._idempresa <> 1
  union
  select 'mercadoria_estoque._idlocalestoque', ml._idlocalestoque
  from mercadoria_estoque ml where ml._idlocalestoque <> 1
  union
  select 'mercadoria_custo._idempresa', mc._idempresa
  from mercadoria_custo mc where mc._idempresa <> 1
  union
  select 'mercadoria_variacao_empresa._idempresa', ve._idempresa
  from mercadoria_variacao_empresa ve where ve._idempresa <> 1
  union
  select 'mercadoria_variacao_pessoa._idempresa', vp._idempresa
  from mercadoria_variacao_pessoa vp where vp._idempresa <> 1
  union
  select 'pessoa_funcionario._idempresa', pf._idempresa
  from pessoa_funcionario pf where pf._idempresa <> 1
) as v
```

Criar `sql/erp/vivos.sql`:

```sql
select coalesce(json_agg(d.oid order by d.oid), '[]')::text as dados
from documento d
where d.oid > {{corte_documento}}
```

Criar `sql/erp/antes-da-virada.sql`:

```sql
select coalesce(json_agg(json_build_object(
  'modelo', g.modelo,
  'quantidade', g.quantidade,
  'primeiro_codigo', g.primeiro_codigo,
  'ultimo_codigo', g.ultimo_codigo,
  'primeira_datahora', g.primeira_datahora,
  'ultima_datahora', g.ultima_datahora
) order by g.modelo collate "C"), '[]')::text as dados
from (
  select d.modelo as modelo,
    count(*) as quantidade,
    min(d._iddocumento) as primeiro_codigo,
    max(d._iddocumento) as ultimo_codigo,
    min(d.datahora) as primeira_datahora,
    max(d.datahora) as ultima_datahora
  from documento d
  where d.oid > {{corte_documento}} and d.datahora < '2026-09-28'
  group by d.modelo
) as g
```

- [ ] **Passo 15: Rodar e ver passar**

Run: `node --test tradutor/consultas-erp.test.mts`

Esperado: PASS.
```
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

- [ ] **Passo 16: Somar 13 em `testes-esperados.txt`, verificar e fazer o commit**

N = 13 (os 13 `test(` de `tradutor/consultas-erp.test.mts`). Seguindo o plano em ordem, o arquivo passa de `59` para `72`.

```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+13;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Run: `npm run verificar`

Esperado: `tsc -p .` sem nenhum erro e `rodou M testes, esperados M`, com M igual ao número impresso acima.

```bash
git add sql/erp/colunas.sql sql/erp/empresa-local.sql sql/erp/vivos.sql sql/erp/antes-da-virada.sql tradutor/consultas-erp.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Consultas de colunas, empresa e local, documentos vivos e antes da virada

Quatro consultas ao ERP prontas e conferidas no ERP falso:
- colunas: lista vazia quando as 108 colunas existem; acusa a coluna
  apagada e as colunas de uma tabela que sumiu;
- empresa e local: acusa qualquer valor diferente de 1 (no documento e
  no histórico de estoque, só acima do corte);
- vivos: os documentos acima do corte, em ordem;
- antes da virada: agrupa por modelo os documentos acima do corte com
  data anterior a 28/09 (em 27/09, os 44 ajustes de custo).
Todo arquivo de sql/erp, os de hoje e os que vierem, passa a ser
conferido: um comando só, sem comentário, aceito pela trava de só
leitura, sem nada do Postgres 15 ou 16, sem data convertida em texto,
e rodando no ERP falso só com as colunas da lista. 13 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 6: Consulta de documentos

**O que esta tarefa entrega:** a consulta `sql/erp/documentos.sql`, que lê do ERP, numa chamada só, cada documento acima do corte com os seus filhos (itens, pagamentos, parcelas com as baixas, conferência do caixa), no formato `DocumentoErp`. Ela é testada contra o ERP falso da Tarefa 5, que tem só as colunas de `sql/erp/colunas-esperadas.txt`. Nenhum código TypeScript de produção muda aqui: quem monta e chama a consulta é `tradutor/leitura.mts`, na Tarefa 7. Neste teste, a consulta é montada à mão com `montar()`, `inteiro()`, `data()` e `inteiros()`.

**Antes de começar:** o Postgres local precisa estar de pé (`docker compose up -d --wait`, Tarefa 1). O ERP falso cria e apaga o seu próprio banco em `localhost:5434`.

**Arquivos:**
- Criar: `sql/erp/documentos.sql`
- Criar (teste): `tradutor/consulta-documentos.test.mts`
- Modificar: `testes-esperados.txt` (soma 17)

**Interfaces:**
- Consome, de `tradutor/erp-falso.mts` (Tarefa 5):
  ```ts
  export type ErpFalso = {
    erp: Erp            // consultar(sql): verificarSomenteLeitura; roda o SQL no banco falso; devolve rows[0].dados (exige string); guarda o SQL em `consultas`
    cliente: Cliente    // superusuário, conectado ao banco falso
    consultas: string[]
    inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>  // insert parametrizado, colunas pelos nomes das chaves
    fechar(): Promise<void>
  }
  export async function criarErpFalso(): Promise<ErpFalso>
  // cria o banco `erp_teste_<pid>_<contador>` com uma tabela por tabela de colunas-esperadas.txt, no esquema public, só com as colunas listadas, todas aceitando nulo, sem chave
  ```
- Consome, de `tradutor/sql-erp.mts` (Tarefa 5):
  ```ts
  export function modeloErp(nome: string): string          // lê sql/erp/<nome>.sql (utf8), aparado
  export function inteiro(n: number): string               // Number.isSafeInteger && n >= 0, senão lança; devolve String(n)
  export function data(d: string): string                  // /^\d{4}-\d{2}-\d{2}$/, senão lança; devolve `'${d}'` (com as aspas)
  export function inteiros(ns: number[]): string           // `array[1,2,3]::integer[]` ou `array[]::integer[]`
  export function montar(modelo: string, valores: Record<string, string>): string
  // troca cada {{nome}} pelo valor; lança se sobrar {{...}} sem valor ou se sobrar valor sem {{...}}
  export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }>
  ```
- Produz: `sql/erp/documentos.sql`, com exatamente estes 12 marcadores: `{{corte_documento}}`, `{{corte_item}}`, `{{corte_pagamento}}`, `{{corte_parcela}}`, `{{corte_baixa}}`, `{{corte_conferencia}}`, `{{corte_cancelamento}}`, `{{novos_acima_de}}`, `{{inicio}}`, `{{pendentes}}`, `{{faixa_de}}`, `{{faixa_ate}}`. Devolve uma linha com a coluna `dados` (texto): um array de `DocumentoErp`, ordenado por `oid`:
  ```
  { "oid": int, "codigo": int, "modelo": str, "status": str|null, "movimento": str|null, "financeiro": str|null,
    "criado_em": ts, "fechado_em": ts|null, "pessoa": int|null,
    "turno_caixa": int|null, "turno_usuario": int|null, "turno_numero": int|null,
    "itens": [ { "oid": int, "produto": int, "quantidade": str|null, "valor_liquido": str|null, "vendedor": int|null } ],
    "pagamentos": [ { "oid": int, "forma": int, "valor": str } ],
    "parcelas": [ { "oid": int, "lancado_em": ts|null, "vencimento": ts|null, "valor": str, "status": str|null, "descricao": str|null,
                    "baixas": [ { "oid": int, "pago_em": ts|null, "valor": str, "forma": int|null, "status": str|null } ] } ],
    "conferencia": [ { "oid": int, "forma": int, "calculado": str|null, "informado": str|null } ],
    "conferencia_abaixo_corte": int }
  ```
  Quem usa: `lerDocumentosHora` e `lerDocumentosFaixa` (Tarefa 7) e a carga `sql/carga/documentos.sql` (Tarefa 8), que lê estas chaves.

**Regras de toda consulta ao ERP (`sql/erp/*.sql`):**
- um único comando; nada de `;`, comentário (`--`, `/*`) ou `select *`; nada do Postgres 15 ou 16 (o ERP roda o 14.17);
- todo `json_agg` dentro de `coalesce(..., '[]')`, para que documento sem filhos traga `[]` e não `null`;
- `numeric` sai como `x::text`; inteiros e datas saem crus. Dentro do JSON, o Postgres escreve `timestamp` como `AAAA-MM-DDTHH:MM:SS` (com a fração só quando ela existe, por exemplo `.5` ou `.123456`), qualquer que seja o `DateStyle` da sessão do ERP. Nunca `datahora::text`;
- a saída é uma linha só, com a coluna `dados` em texto (`...::text as dados`): o cliente do ERP e o ERP falso exigem texto;
- só colunas de `sql/erp/colunas-esperadas.txt`. O ERP falso não tem outras, e a consulta falha se usar;
- nenhuma palavra que a trava de só leitura recusa (`do`, `set`, `lock`, `comment` e as outras da Tarefa 4), nem como apelido.

**Como a consulta escolhe e monta:**
- Entra o documento com `oid > {{corte_documento}}` que case com pelo menos um critério: novo (`oid > {{novos_acima_de}}`); criado ou fechado desde o início da janela (`datahora` ou `datahoramovimento >= {{inicio}}::timestamp`); cancelado desde o início (linha em `documento_cancelamento_historico` com `oid > {{corte_cancelamento}}` e `datahora >= {{inicio}}`); com parcela aberta no Kaizen (`oid = any({{pendentes}})`); ou na faixa da noite (`oid between {{faixa_de}} and {{faixa_ate}}`).
- Critério desligado: a hora passa a faixa `1..0` (vazia); a noite passa `novos_acima_de = 2147483647`, `inicio = '9999-12-31'` e `pendentes = array[]::integer[]`.
- Os filhos ligam ao documento por `_iddocumento`, cada um acima do corte da sua própria tabela (`{{corte_item}}`, `{{corte_pagamento}}`, `{{corte_parcela}}`, `{{corte_baixa}}`, `{{corte_conferencia}}`).
- Ordem: documentos por `oid`; itens por `_idsequencia` (e `oid` no empate); pagamentos, parcelas, baixas e conferência por `oid`.
- Parcelas só no documento que paga: a condição `d.tipomovimentofinanceiro = 'P'` fica dentro da subconsulta das parcelas.
- A baixa liga à parcela pelos três campos: `_iddocumento`, `_idsequencia` e `_idparcela`.
- `conferencia_abaixo_corte` conta as linhas de conferência do documento com `oid <= {{corte_conferencia}}` (os restos de teste de 26/09). Elas não entram na lista `conferencia`; a Tarefa 11 transforma a contagem em aviso.
- O tradutor copia: vendedor 0, turno 0 e `idpessoa` vazio saem como vieram. Quem troca 0 por vazio é a carga (Tarefa 8).

- [ ] **Passo 1: Escrever o teste que falha**

Crie `tradutor/consulta-documentos.test.mts` com exatamente este conteúdo. Cada teste começa com o ERP falso vazio (o `beforeEach` esvazia todas as tabelas) e liga só o critério que quer ver; os demais ficam desligados (`NENHUM`).

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { data, inteiro, inteiros, lerColunasEsperadas, modeloErp, montar } from './sql-erp.mts'

// Formato que sql/erp/documentos.sql devolve (DocumentoErp do contrato).
type Item = { oid: number; produto: number; quantidade: string | null; valor_liquido: string | null; vendedor: number | null }
type Pagamento = { oid: number; forma: number; valor: string }
type Baixa = { oid: number; pago_em: string | null; valor: string; forma: number | null; status: string | null }
type Parcela = { oid: number; lancado_em: string | null; vencimento: string | null; valor: string; status: string | null; descricao: string | null; baixas: Baixa[] }
type Conferencia = { oid: number; forma: number; calculado: string | null; informado: string | null }
type DocumentoErp = {
  oid: number; codigo: number; modelo: string; status: string | null; movimento: string | null; financeiro: string | null
  criado_em: string; fechado_em: string | null; pessoa: number | null
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null
  itens: Item[]; pagamentos: Pagamento[]; parcelas: Parcela[]; conferencia: Conferencia[]; conferencia_abaixo_corte: number
}

type CortesDocumento = { documento: number; item: number; pagamento: number; parcela: number; baixa: number; conferencia: number; cancelamento: number }
type Selecao = { novosAcimaDe: number; inicio: string; pendentes: number[]; faixaDe: number; faixaAte: number }

// Cortes da virada (sql/migracoes/003_corte.sql).
const CORTES: CortesDocumento = { documento: 184, item: 1872, pagamento: 0, parcela: 0, baixa: 0, conferencia: 30, cancelamento: 0 }
// Todos os critérios desligados: cada teste liga só o que quer ver.
const NENHUM: Selecao = { novosAcimaDe: 2147483647, inicio: '9999-12-31', pendentes: [], faixaDe: 1, faixaAte: 0 }

function sqlDocumentos(selecao: Partial<Selecao>, cortes: Partial<CortesDocumento> = {}): string {
  const s = { ...NENHUM, ...selecao }
  const c = { ...CORTES, ...cortes }
  return montar(modeloErp('documentos'), {
    corte_documento: inteiro(c.documento),
    corte_item: inteiro(c.item),
    corte_pagamento: inteiro(c.pagamento),
    corte_parcela: inteiro(c.parcela),
    corte_baixa: inteiro(c.baixa),
    corte_conferencia: inteiro(c.conferencia),
    corte_cancelamento: inteiro(c.cancelamento),
    novos_acima_de: inteiro(s.novosAcimaDe),
    inicio: data(s.inicio),
    pendentes: inteiros(s.pendentes),
    faixa_de: inteiro(s.faixaDe),
    faixa_ate: inteiro(s.faixaAte),
  })
}

const TABELAS = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
let falso: ErpFalso

before(async () => { falso = await criarErpFalso() })
after(async () => { await falso.fechar() })
beforeEach(async () => { await falso.cliente.query(`truncate ${TABELAS.join(', ')}`) })

async function ler(selecao: Partial<Selecao>, cortes: Partial<CortesDocumento> = {}): Promise<DocumentoErp[]> {
  return JSON.parse(await falso.erp.consultar(sqlDocumentos(selecao, cortes))) as DocumentoErp[]
}

async function oids(selecao: Partial<Selecao>, cortes: Partial<CortesDocumento> = {}): Promise<number[]> {
  return (await ler(selecao, cortes)).map((d) => d.oid)
}

// Um pedido de venda comum, criado antes da janela; cada teste troca o que precisa.
function documento(oid: number, codigo: number, campos: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    oid, _iddocumento: codigo, idempresa: 1, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    datahora: '2026-09-20 10:00:00', datahoramovimento: '2026-09-20 10:05:00', idpessoa: 999007,
    idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 3,
    ...campos,
  }
}

test('novos: entra o documento com oid acima de novos_acima_de; o de oid igual fica de fora', async () => {
  await falso.inserir('documento', [documento(185, 94), documento(186, 95), documento(187, 96)])
  assert.deepEqual(await oids({ novosAcimaDe: 185 }), [186, 187])
})

test('janela: entra o documento criado a partir do início; o criado na véspera fica de fora', async () => {
  await falso.inserir('documento', [
    documento(185, 94, { datahora: '2026-09-27 23:59:59', datahoramovimento: '2026-09-27 23:59:59' }),
    documento(186, 95, { datahora: '2026-09-28 00:00:00', datahoramovimento: null }),
    documento(187, 96, { datahora: '2026-09-29 14:05:03', datahoramovimento: '2026-09-29 14:05:03' }),
  ])
  assert.deepEqual(await oids({ inicio: '2026-09-28' }), [186, 187])
})

test('janela: orçamento criado antes do início e fechado depois dele entra pelo fechamento', async () => {
  await falso.inserir('documento', [
    documento(185, 94, { datahora: '2026-09-25 15:09:00', datahoramovimento: '2026-09-29 10:00:00' }),
    documento(186, 95, { modelo: 'OC', datahora: '2026-09-25 15:09:00', datahoramovimento: '2026-09-27 18:00:00' }),
    documento(187, 96, { modelo: 'OC', datahora: '2026-09-25 15:09:00', datahoramovimento: null }),
  ])
  assert.deepEqual(await oids({ inicio: '2026-09-28' }), [185])
})

test('janela: venda cancelada a partir do início entra pela linha de cancelamento acima do corte', async () => {
  await falso.inserir('documento', [documento(185, 58), documento(186, 59), documento(187, 60)])
  await falso.inserir('documento_cancelamento_historico', [
    { oid: 6, _iddocumento: 58, datahora: '2026-09-29 11:00:00' },
    { oid: 5, _iddocumento: 59, datahora: '2026-09-29 11:00:00' },
    { oid: 7, _iddocumento: 60, datahora: '2026-09-27 11:00:00' },
  ])
  assert.deepEqual(await oids({ inicio: '2026-09-28' }, { cancelamento: 5 }), [185])
})

test('pendentes: entram os oids da lista, e só eles', async () => {
  await falso.inserir('documento', [
    documento(185, 94, { modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P' }),
    documento(186, 95),
    documento(187, 96, { modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P' }),
  ])
  assert.deepEqual(await oids({ pendentes: [185, 187] }), [185, 187])
})

test('faixa: entram os oids de faixa_de até faixa_ate, com as duas pontas', async () => {
  await falso.inserir('documento', [documento(185, 94), documento(186, 95), documento(187, 96), documento(188, 97), documento(189, 98)])
  assert.deepEqual(await oids({ faixaDe: 186, faixaAte: 188 }), [186, 187, 188])
})

test('corte: documento no corte ou abaixo nunca entra, mesmo casando todos os critérios', async () => {
  await falso.inserir('documento', [
    documento(183, 93, { datahora: '2026-09-29 10:00:00' }),
    documento(184, 94, { datahora: '2026-09-29 10:00:00' }),
    documento(185, 95, { datahora: '2026-09-29 10:00:00' }),
  ])
  await falso.inserir('documento_cancelamento_historico', [{ oid: 1, _iddocumento: 94, datahora: '2026-09-29 11:00:00' }])
  assert.deepEqual(await oids({ novosAcimaDe: 0, inicio: '2026-09-28', pendentes: [183, 184], faixaDe: 1, faixaAte: 1000 }), [185])
})

test('fora de todos os critérios não entra; sem documento nenhum, a resposta é []', async () => {
  assert.equal(await falso.erp.consultar(sqlDocumentos({ novosAcimaDe: 0 })), '[]')
  await falso.inserir('documento', [documento(185, 94), documento(186, 95)])
  const texto = await falso.erp.consultar(sqlDocumentos({ novosAcimaDe: 186, inicio: '2026-09-28', pendentes: [187], faixaDe: 300, faixaAte: 400 }))
  assert.equal(texto, '[]')
})

test('os documentos saem em ordem de oid, qualquer que seja a ordem de gravação', async () => {
  await falso.inserir('documento', [documento(190, 99), documento(185, 94), documento(188, 97)])
  assert.deepEqual(await oids({ novosAcimaDe: 0 }), [185, 188, 190])
})

test('itens: o do corte ou abaixo não vem; os outros vêm na ordem de _idsequencia', async () => {
  await falso.inserir('documento', [documento(185, 58)])
  await falso.inserir('documento_mercadoria', [
    { oid: 1872, _iddocumento: 58, _idsequencia: 1, idmercadoriavariacao: 2138, qtd: '1.000000', valtotalliquido: '144.000000', idpessoafuncionario: 1 },
    { oid: 1874, _iddocumento: 58, _idsequencia: 3, idmercadoriavariacao: 5278, qtd: '1.000000', valtotalliquido: '25.000000', idpessoafuncionario: 1 },
    { oid: 1873, _iddocumento: 58, _idsequencia: 2, idmercadoriavariacao: 2138, qtd: '2.000000', valtotalliquido: '119.000000', idpessoafuncionario: 0 },
  ])
  const [d] = await ler({ novosAcimaDe: 0 })
  assert.deepEqual(d.itens, [
    { oid: 1873, produto: 2138, quantidade: '2.000000', valor_liquido: '119.000000', vendedor: 0 },
    { oid: 1874, produto: 5278, quantidade: '1.000000', valor_liquido: '25.000000', vendedor: 1 },
  ])
})

test('conferência: linha no corte ou abaixo não vem e só entra na contagem conferencia_abaixo_corte', async () => {
  await falso.inserir('documento', [
    documento(185, 98, { modelo: 'FC', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(186, 140, { modelo: 'FC', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
  ])
  await falso.inserir('documento_conferencia_caixa', [
    { oid: 16, _iddocumento: 98, _idpagamento: 1, valdisponivel: '58.00', valconferido: '20.00' },
    { oid: 17, _iddocumento: 98, _idpagamento: 2, valdisponivel: '0.60', valconferido: '0.00' },
    { oid: 30, _iddocumento: 118, _idpagamento: 5, valdisponivel: '77.00', valconferido: '0.00' },
    { oid: 31, _iddocumento: 98, _idpagamento: 1, valdisponivel: '310.500000', valconferido: '300.000000' },
    { oid: 32, _iddocumento: 98, _idpagamento: 5, valdisponivel: '-77.000000', valconferido: null },
  ])
  const [refeito, novo] = await ler({ novosAcimaDe: 0 })
  assert.deepEqual(refeito.conferencia, [
    { oid: 31, forma: 1, calculado: '310.500000', informado: '300.000000' },
    { oid: 32, forma: 5, calculado: '-77.000000', informado: null },
  ])
  assert.equal(refeito.conferencia_abaixo_corte, 2)
  assert.deepEqual(novo.conferencia, [])
  assert.equal(novo.conferencia_abaixo_corte, 0)
})

test('pagamento, parcela e baixa respeitam cada um o corte da sua tabela', async () => {
  await falso.inserir('documento', [documento(185, 61, { modelo: 'TM', tipomovimento: 'E', tipomovimentofinanceiro: 'P' })])
  await falso.inserir('documento_pagamento', [
    { oid: 10, _iddocumento: 61, _idsequencia: 1, idpagamento: 5, valor: '77.000000' },
    { oid: 11, _iddocumento: 61, _idsequencia: 2, idpagamento: 5, valor: '77.000000' },
  ])
  await falso.inserir('documento_parcela', [
    { oid: 20, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, valparcela: '77.000000', status: 'P' },
    { oid: 21, _iddocumento: 61, _idsequencia: 2, _idparcela: 1, valparcela: '77.000000', status: 'B' },
  ])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 30, _iddocumento: 61, _idsequencia: 2, _idparcela: 1, _idsequenciapagamento: 1, valpagamento: '77.000000', idpagamento: 5, status: 'E' },
    { oid: 31, _iddocumento: 61, _idsequencia: 2, _idparcela: 1, _idsequenciapagamento: 2, valpagamento: '77.000000', idpagamento: 5, status: 'E' },
  ])
  const [d] = await ler({ novosAcimaDe: 0 }, { pagamento: 10, parcela: 20, baixa: 30 })
  assert.deepEqual(d.pagamentos.map((p) => p.oid), [11])
  assert.deepEqual(d.parcelas.map((q) => q.oid), [21])
  assert.deepEqual(d.parcelas[0].baixas.map((b) => b.oid), [31])
})

test('parcelas só vêm em documento que paga; cada baixa vai para a parcela do mesmo documento, sequência e parcela', async () => {
  await falso.inserir('documento', [
    documento(185, 61, { modelo: 'TM', tipomovimento: 'E', tipomovimentofinanceiro: 'P' }),
    documento(186, 117, { modelo: 'PA', tipomovimento: 'S', tipomovimentofinanceiro: 'R' }),
  ])
  await falso.inserir('documento_parcela', [
    { oid: 1, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-28 10:00:00', dtvencimento: '2026-09-28 00:00:00', valparcela: '77.000000', status: 'B', descricao: 'Troca de Mercadoria - Adiantamento' },
    { oid: 2, _iddocumento: 61, _idsequencia: 1, _idparcela: 2, dtlancamento: '2026-09-28 10:00:00', dtvencimento: '2026-10-28 00:00:00', valparcela: '10.000000', status: 'P', descricao: null },
    { oid: 3, _iddocumento: 117, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-28 11:00:00', dtvencimento: '2026-09-28 11:00:00', valparcela: '77.000000', status: 'B', descricao: null },
  ])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 1, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-28 11:00:00', valpagamento: '77.000000', idpagamento: 5, status: 'E' },
    { oid: 2, _iddocumento: 61, _idsequencia: 2, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-28 11:00:00', valpagamento: '1.000000', idpagamento: 1, status: 'E' },
    { oid: 3, _iddocumento: 117, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-28 11:00:00', valpagamento: '77.000000', idpagamento: 5, status: 'E' },
    { oid: 4, _iddocumento: 61, _idsequencia: 1, _idparcela: 2, _idsequenciapagamento: 1, dtpagamento: '2026-09-29 09:00:00', valpagamento: '10.000000', idpagamento: 1, status: 'C' },
  ])
  const [troca, pedido] = await ler({ novosAcimaDe: 0 })
  assert.deepEqual(troca.parcelas, [
    {
      oid: 1, lancado_em: '2026-09-28T10:00:00', vencimento: '2026-09-28T00:00:00', valor: '77.000000', status: 'B', descricao: 'Troca de Mercadoria - Adiantamento',
      baixas: [{ oid: 1, pago_em: '2026-09-28T11:00:00', valor: '77.000000', forma: 5, status: 'E' }],
    },
    {
      oid: 2, lancado_em: '2026-09-28T10:00:00', vencimento: '2026-10-28T00:00:00', valor: '10.000000', status: 'P', descricao: null,
      baixas: [{ oid: 4, pago_em: '2026-09-29T09:00:00', valor: '10.000000', forma: 1, status: 'C' }],
    },
  ])
  assert.deepEqual(pedido.parcelas, [])
})

test('documento sem filhos traz as listas vazias, e não null', async () => {
  await falso.inserir('documento', [
    documento(185, 100, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(186, 101, { modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P' }),
  ])
  await falso.inserir('documento_parcela', [{ oid: 1, _iddocumento: 101, _idsequencia: 1, _idparcela: 1, valparcela: '10.000000', status: 'P' }])
  const [abertura, conta] = await ler({ novosAcimaDe: 0 })
  assert.deepEqual(abertura.itens, [])
  assert.deepEqual(abertura.pagamentos, [])
  assert.deepEqual(abertura.parcelas, [])
  assert.deepEqual(abertura.conferencia, [])
  assert.equal(abertura.conferencia_abaixo_corte, 0)
  assert.deepEqual(conta.parcelas[0].baixas, [])
})

test('valores numeric chegam como texto exato, sem perder casas nem algarismos', async () => {
  await falso.inserir('documento', [documento(185, 116)])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 116, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '0.100000', valtotalliquido: '117.200000', idpessoafuncionario: 1 },
    { oid: 1874, _iddocumento: 116, _idsequencia: 2, idmercadoriavariacao: 61, qtd: '1.123456789', valtotalliquido: '12345678901234567.123456', idpessoafuncionario: 1 },
    { oid: 1875, _iddocumento: 116, _idsequencia: 3, idmercadoriavariacao: 62, qtd: null, valtotalliquido: null, idpessoafuncionario: null },
  ])
  await falso.inserir('documento_pagamento', [
    { oid: 1, _iddocumento: 116, _idsequencia: 2, idpagamento: 1, valor: '50.000000' },
    { oid: 2, _iddocumento: 116, _idsequencia: 3, idpagamento: 1, valor: '-5.000000' },
  ])
  const [d] = await ler({ novosAcimaDe: 0 })
  assert.deepEqual(d.itens.map((i) => [i.quantidade, i.valor_liquido, i.vendedor]), [
    ['0.100000', '117.200000', 1],
    ['1.123456789', '12345678901234567.123456', 1],
    [null, null, null],
  ])
  assert.deepEqual(d.pagamentos, [{ oid: 1, forma: 1, valor: '50.000000' }, { oid: 2, forma: 1, valor: '-5.000000' }])
})

test('datas saem como AAAA-MM-DDTHH:MM:SS, sem fuso, e as vazias como null', async () => {
  await falso.inserir('documento', [
    documento(185, 94, { datahora: '2026-09-28 14:05:03', datahoramovimento: '2026-09-28 14:07:09.123456' }),
    documento(186, 95, { datahora: '2026-09-28 08:00:00', datahoramovimento: null }),
  ])
  const [a, b] = await ler({ novosAcimaDe: 0 })
  assert.equal(a.criado_em, '2026-09-28T14:05:03')
  assert.equal(a.fechado_em, '2026-09-28T14:07:09.123456')
  assert.equal(b.criado_em, '2026-09-28T08:00:00')
  assert.equal(b.fechado_em, null)
})

test('um documento completo sai com exatamente as chaves do DocumentoErp', async () => {
  await falso.inserir('documento', [
    documento(185, 58, { idpessoa: null, idcaixaabertura: 0, idusuarioabertura: 0, idabertura: 0, datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:48:00' }),
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 58, _idsequencia: 1, idmercadoriavariacao: 5278, qtd: '1.000000', valtotalliquido: '25.000000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 1, _iddocumento: 58, _idsequencia: 1, idpagamento: 2, valor: '25.000000' }])
  const [d] = await ler({ novosAcimaDe: 0 })
  assert.deepEqual(d, {
    oid: 185, codigo: 58, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-28T15:09:00', fechado_em: '2026-09-28T15:48:00', pessoa: null,
    turno_caixa: 0, turno_usuario: 0, turno_numero: 0,
    itens: [{ oid: 1873, produto: 5278, quantidade: '1.000000', valor_liquido: '25.000000', vendedor: 1 }],
    pagamentos: [{ oid: 1, forma: 2, valor: '25.000000' }],
    parcelas: [],
    conferencia: [],
    conferencia_abaixo_corte: 0,
  })
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Comando: `node --test tradutor/consulta-documentos.test.mts`

Saída esperada: os 17 testes falham com `Error: ENOENT: no such file or directory, open '...\sql\erp\documentos.sql'`, e o resumo mostra `ℹ tests 17`, `ℹ pass 0`, `ℹ fail 17`.

- [ ] **Passo 3: Escrever a consulta**

Crie `sql/erp/documentos.sql` com exatamente este conteúdo (sem `;` no fim e sem comentário):

```sql
select coalesce(json_agg(json_build_object(
  'oid', d.oid,
  'codigo', d._iddocumento,
  'modelo', d.modelo,
  'status', d.status,
  'movimento', d.tipomovimento,
  'financeiro', d.tipomovimentofinanceiro,
  'criado_em', d.datahora,
  'fechado_em', d.datahoramovimento,
  'pessoa', d.idpessoa,
  'turno_caixa', d.idcaixaabertura,
  'turno_usuario', d.idusuarioabertura,
  'turno_numero', d.idabertura,
  'itens', coalesce((
    select json_agg(json_build_object(
      'oid', m.oid,
      'produto', m.idmercadoriavariacao,
      'quantidade', m.qtd::text,
      'valor_liquido', m.valtotalliquido::text,
      'vendedor', m.idpessoafuncionario
    ) order by m._idsequencia, m.oid)
    from documento_mercadoria m
    where m._iddocumento = d._iddocumento and m.oid > {{corte_item}}
  ), '[]'),
  'pagamentos', coalesce((
    select json_agg(json_build_object(
      'oid', p.oid,
      'forma', p.idpagamento,
      'valor', p.valor::text
    ) order by p.oid)
    from documento_pagamento p
    where p._iddocumento = d._iddocumento and p.oid > {{corte_pagamento}}
  ), '[]'),
  'parcelas', coalesce((
    select json_agg(json_build_object(
      'oid', q.oid,
      'lancado_em', q.dtlancamento,
      'vencimento', q.dtvencimento,
      'valor', q.valparcela::text,
      'status', q.status,
      'descricao', q.descricao,
      'baixas', coalesce((
        select json_agg(json_build_object(
          'oid', b.oid,
          'pago_em', b.dtpagamento,
          'valor', b.valpagamento::text,
          'forma', b.idpagamento,
          'status', b.status
        ) order by b.oid)
        from documento_parcela_pagamento b
        where b._iddocumento = q._iddocumento and b._idsequencia = q._idsequencia and b._idparcela = q._idparcela
          and b.oid > {{corte_baixa}}
      ), '[]')
    ) order by q.oid)
    from documento_parcela q
    where q._iddocumento = d._iddocumento and q.oid > {{corte_parcela}} and d.tipomovimentofinanceiro = 'P'
  ), '[]'),
  'conferencia', coalesce((
    select json_agg(json_build_object(
      'oid', c.oid,
      'forma', c._idpagamento,
      'calculado', c.valdisponivel::text,
      'informado', c.valconferido::text
    ) order by c.oid)
    from documento_conferencia_caixa c
    where c._iddocumento = d._iddocumento and c.oid > {{corte_conferencia}}
  ), '[]'),
  'conferencia_abaixo_corte', (
    select count(*)
    from documento_conferencia_caixa r
    where r._iddocumento = d._iddocumento and r.oid <= {{corte_conferencia}}
  )
) order by d.oid), '[]')::text as dados
from documento d
where d.oid > {{corte_documento}}
  and (
    d.oid > {{novos_acima_de}}
    or d.datahora >= {{inicio}}::timestamp
    or d.datahoramovimento >= {{inicio}}::timestamp
    or d._iddocumento in (
      select x._iddocumento
      from documento_cancelamento_historico x
      where x.oid > {{corte_cancelamento}} and x.datahora >= {{inicio}}::timestamp
    )
    or d.oid = any({{pendentes}})
    or d.oid between {{faixa_de}} and {{faixa_ate}}
  )
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Comando: `node --test tradutor/consulta-documentos.test.mts`

Saída esperada: 17 linhas com `✔`, e o resumo `ℹ tests 17`, `ℹ pass 17`, `ℹ fail 0`.

- [ ] **Passo 5: Atualizar a contagem de testes (N = 17)**

Esta tarefa acrescentou 17 `test(`. Some 17 ao número de `testes-esperados.txt`:

```bash
node -e "const fs = require('node:fs'); const n = Number(fs.readFileSync('testes-esperados.txt', 'utf8').trim()) + 17; fs.writeFileSync('testes-esperados.txt', n + '\n'); console.log('testes esperados agora: ' + n)"
```

Saída esperada: `testes esperados agora: M`, com M = número anterior + 17.

- [ ] **Passo 6: Rodar a verificação completa**

Comando: `npm run verificar`

Saída esperada: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com o mesmo M do passo 5.

- [ ] **Passo 7: Commit**

```bash
git add sql/erp/documentos.sql tradutor/consulta-documentos.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 2: consulta dos documentos do ERP

A consulta que lê os documentos do ERP novo está pronta e conferida num
ERP de teste com as mesmas colunas do de verdade. Numa chamada só, ela
traz cada documento acima do corte com os itens, os pagamentos, as
parcelas com as baixas e a conferência do caixa.

Entram o documento novo, o criado, fechado ou cancelado desde o início
da janela, o que ainda tem conta em aberto no Kaizen e a faixa pedida
pela releitura da noite; nada abaixo do corte entra. Parcelas só vêm de
documento que paga. As linhas de conferência de teste de 26/09 não
entram, só são contadas, para virar aviso depois.

Valores saem como texto exato: 117,200000 continua 117,200000, e um
valor de 17 algarismos não perde nenhum. Datas saem sem fuso, e um
documento sem filhos traz listas vazias. 17 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 7: Consultas de estoque e cadastros, e a leitura

**O que esta tarefa entrega:**
- `sql/erp/estoque.sql`: os movimentos de estoque acima de um `oid` e a foto do saldo (empresa 1, local 1), juntos, numa consulta só, para serem do mesmo instante;
- `sql/erp/cadastros.sql`: produtos, pessoas, funcionários e fornecedores do produto, numa consulta só;
- `tradutor/leitura.mts`: as funções que montam cada consulta ao ERP com os cortes certos e a chamam. Só elas montam SQL para o ERP; o resto do tradutor usa estas funções.

São dois ciclos de teste, cada um com o seu commit: primeiro as duas consultas (passos 1 a 8), depois a leitura (passos 9 a 15).

**Antes de começar:** o Postgres local precisa estar de pé (`docker compose up -d --wait`, Tarefa 1). O ERP falso cria e apaga o seu próprio banco em `localhost:5434`.

**Arquivos:**
- Criar: `sql/erp/estoque.sql`
- Criar: `sql/erp/cadastros.sql`
- Criar (teste): `tradutor/consulta-estoque-cadastros.test.mts`
- Criar: `tradutor/leitura.mts`
- Criar (teste): `tradutor/leitura.test.mts`
- Modificar: `testes-esperados.txt` (soma 9 no passo 6 e mais 9 no passo 13; 18 no total)

**Interfaces:**
- Consome, de `tradutor/erp-falso.mts` (Tarefa 5):
  ```ts
  export type ErpFalso = {
    erp: Erp            // consultar(sql): verificarSomenteLeitura; roda o SQL no banco falso; devolve rows[0].dados (exige string); guarda o SQL em `consultas`
    cliente: Cliente    // superusuário, conectado ao banco falso
    consultas: string[]
    inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>  // insert parametrizado, colunas pelos nomes das chaves
    fechar(): Promise<void>
  }
  export async function criarErpFalso(): Promise<ErpFalso>
  ```
- Consome, de `tradutor/sql-erp.mts` (Tarefa 5):
  ```ts
  export function modeloErp(nome: string): string          // lê sql/erp/<nome>.sql (utf8), aparado
  export function inteiro(n: number): string               // Number.isSafeInteger && n >= 0, senão lança; devolve String(n)
  export function data(d: string): string                  // /^\d{4}-\d{2}-\d{2}$/, senão lança; devolve `'${d}'` (com as aspas)
  export function inteiros(ns: number[]): string           // `array[1,2,3]::integer[]` ou `array[]::integer[]`
  export function pares(ps: Array<[string, string]>): string // `('t','c'),('t2','c2')`
  export function montar(modelo: string, valores: Record<string, string>): string
  // troca cada {{nome}} pelo valor; lança se sobrar {{...}} sem valor ou se sobrar valor sem {{...}}
  export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }>
  ```
- Consome, de `tradutor/erp.mts` (Tarefa 4): `export type Erp = { consultar(sql: string): Promise<string> }` (devolve o texto da coluna `dados`).
- Consome, de `tradutor/tipos.mts` (Tarefa 2):
  ```ts
  export type TabelaCorte =
    | 'documento' | 'documento_mercadoria' | 'documento_pagamento' | 'documento_parcela'
    | 'documento_parcela_pagamento' | 'documento_conferencia_caixa'
    | 'documento_cancelamento_historico' | 'mercadoria_estoque_historico'
  export type Cortes = Record<TabelaCorte, number>
  ```
- Consome, as consultas já prontas em `sql/erp/` (marcador → valor):
  - `colunas.sql` (Tarefa 5): `{{pares}}`; devolve o array de `'tabela.coluna'` que faltam no ERP;
  - `empresa-local.sql` (Tarefa 5): `{{corte_documento}}`, `{{corte_historico}}`; devolve o array de `{ "tabela": "documento.idempresa", "valor": 2 }`;
  - `vivos.sql` (Tarefa 5): `{{corte_documento}}`; devolve o array dos `oid` de documento acima do corte, em ordem;
  - `antes-da-virada.sql` (Tarefa 5): `{{corte_documento}}`; devolve o array de `{ "modelo", "quantidade", "primeiro_codigo", "ultimo_codigo", "primeira_datahora", "ultima_datahora" }`;
  - `documentos.sql` (Tarefa 6): `{{corte_documento}}`, `{{corte_item}}`, `{{corte_pagamento}}`, `{{corte_parcela}}`, `{{corte_baixa}}`, `{{corte_conferencia}}`, `{{corte_cancelamento}}`, `{{novos_acima_de}}`, `{{inicio}}`, `{{pendentes}}`, `{{faixa_de}}`, `{{faixa_ate}}`; devolve o array de `DocumentoErp`.
- Produz `sql/erp/estoque.sql` (marcador `{{movimentos_acima_de}}`), com `dados` =
  ```
  { "movimentos": [ { "oid": int, "produto": int, "documento": int|null, "momento": ts, "saldo_antes": str|null, "saldo_depois": str|null } ],
    "foto": [ { "produto": int, "quantidade": str|null } ] }
  ```
  Movimentos com `oid > movimentos_acima_de`, ordenados por `oid` (a ordem de gravação no ERP, e não a data); foto de `mercadoria_estoque` com `_idempresa = 1 and _idlocalestoque = 1`, ordenada por produto.
- Produz `sql/erp/cadastros.sql` (sem marcador), com `dados` =
  ```
  { "produtos": [ { "codigo", "descricao", "grupo", "secao", "subgrupo", "marca", "custo", "inativo" } ],
    "pessoas": [ { "codigo", "nome", "sobrenome", "cpf_cnpj", "bairro", "municipio", "ibge", "uf", "inativo" } ],
    "funcionarios": [ { "codigo", "nome", "sobrenome", "usuario", "tipo", "inativo" } ],
    "fornecedores": [ { "produto", "fornecedor" } ] }
  ```
  Códigos, `ibge` e `usuario` saem como inteiros; `custo` em texto; `inativo` é a bandeira crua (`'T'`, `'F'` ou `null`). Cada lista ordenada pelo código (fornecedores por produto e fornecedor).
- Produz `tradutor/leitura.mts` (usado pelas Tarefas 13, 14, 17 e 18):
  ```ts
  export async function conferirColunas(erp: Erp): Promise<string[]>                       // 'tabela.coluna' que faltam
  export async function conferirEmpresaLocal(erp: Erp, cortes: Cortes): Promise<Array<{ tabela: string; valor: number }>>
  export type SelecaoHora = { novosAcimaDe: number; inicio: string; pendentes: number[] }
  export async function lerDocumentosHora(erp: Erp, cortes: Cortes, selecao: SelecaoHora): Promise<string>
  export async function lerDocumentosFaixa(erp: Erp, cortes: Cortes, de: number, ate: number): Promise<string>
  export async function lerVivos(erp: Erp, cortes: Cortes): Promise<string>
  export async function lerEstoque(erp: Erp, cortes: Cortes, movimentosAcimaDe: number): Promise<string>
  export async function lerCadastros(erp: Erp): Promise<string>
  export async function lerAntesDaVirada(erp: Erp, cortes: Cortes): Promise<string>
  ```
  `lerTotaisErp` **não** entra nesta tarefa: a Tarefa 14 a acrescenta a este arquivo.

**Regras de toda consulta ao ERP (`sql/erp/*.sql`):**
- um único comando; nada de `;`, comentário (`--`, `/*`) ou `select *`; nada do Postgres 15 ou 16 (o ERP roda o 14.17);
- todo `json_agg` dentro de `coalesce(..., '[]')`, para que uma lista vazia venha `[]` e não `null`;
- `numeric` sai como `x::text`; inteiros e datas saem crus. Dentro do JSON, o Postgres escreve `timestamp` como `AAAA-MM-DDTHH:MM:SS` (com a fração só quando ela existe), qualquer que seja o `DateStyle` da sessão do ERP. Nunca `datahora::text`;
- a saída é uma linha só, com a coluna `dados` em texto (`...::text as dados`);
- só colunas de `sql/erp/colunas-esperadas.txt`. O ERP falso não tem outras, e a consulta falha se usar;
- nenhuma palavra que a trava de só leitura recusa (`do`, `set`, `lock`, `comment` e as outras da Tarefa 4), nem como apelido.

**Como os cadastros se leem (spec 5.3):**
- a tabela principal manda: `mercadoria_variacao`, `pessoa` e `pessoa_funcionario` com `_idempresa = 1`. As outras entram por junção à esquerda; sem linha, o campo vem `null`;
- grupo, seção e subgrupo vêm da `mercadoria` da variação; a marca vem da própria variação (`idmarca`);
- `custo` vem de `mercadoria_custo` da empresa 1. Sem linha, vem `null`, e não zero: "custo zero" e "sem custo" são coisas diferentes para a Fase 4;
- `inativo` do produto vem de `mercadoria_variacao_empresa` da empresa 1;
- o endereço da pessoa é um só, por `left join lateral`: o principal (`flagprincipal = 'T'`) e ativo (`flaginativo = 'F'`) de menor `_idendereco`. Pessoa sem endereço assim vem com bairro, município, IBGE e UF `null`;
- funcionários: `pessoa_funcionario` da empresa 1, com nome e sobrenome da `pessoa`;
- fornecedores: `mercadoria_variacao_pessoa` da empresa 1 com `flaginativo = 'F'`.
- O tradutor copia: juntar nome e sobrenome e traduzir a bandeira de inativo é da carga (Tarefa 9).

**Por que `set jit = off` nos testes:** o banco falso não tem estatísticas, e o Postgres estima custo alto para a consulta de cadastros e a compila com JIT: 1,5 s por chamada, contra 6 ms sem JIT. O teste desliga o JIT na sessão do banco falso.

- [ ] **Passo 1: Escrever o teste das consultas de estoque e cadastros**

Crie `tradutor/consulta-estoque-cadastros.test.mts` com exatamente este conteúdo. Cada teste começa com o ERP falso vazio.

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { inteiro, lerColunasEsperadas, modeloErp, montar } from './sql-erp.mts'

// Formatos que sql/erp/estoque.sql e sql/erp/cadastros.sql devolvem (contrato, seção 6).
type Movimento = { oid: number; produto: number; documento: number | null; momento: string; saldo_antes: string | null; saldo_depois: string | null }
type Estoque = { movimentos: Movimento[]; foto: Array<{ produto: number; quantidade: string | null }> }
type Produto = { codigo: number; descricao: string | null; grupo: string | null; secao: string | null; subgrupo: string | null; marca: string | null; custo: string | null; inativo: string | null }
type Pessoa = { codigo: number; nome: string | null; sobrenome: string | null; cpf_cnpj: string | null; bairro: string | null; municipio: string | null; ibge: number | null; uf: string | null; inativo: string | null }
type Funcionario = { codigo: number; nome: string | null; sobrenome: string | null; usuario: number | null; tipo: string | null; inativo: string | null }
type Cadastros = { produtos: Produto[]; pessoas: Pessoa[]; funcionarios: Funcionario[]; fornecedores: Array<{ produto: number; fornecedor: number }> }

const TABELAS = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
let falso: ErpFalso

before(async () => {
  falso = await criarErpFalso()
  // Sem estatísticas, o banco falso compila a consulta de cadastros com JIT (1,5 s por chamada).
  await falso.cliente.query('set jit = off')
})
after(async () => { await falso.fechar() })
beforeEach(async () => { await falso.cliente.query(`truncate ${TABELAS.join(', ')}`) })

async function lerEstoqueFalso(acimaDe: number): Promise<Estoque> {
  return JSON.parse(await falso.erp.consultar(montar(modeloErp('estoque'), { movimentos_acima_de: inteiro(acimaDe) }))) as Estoque
}

async function lerCadastrosFalso(): Promise<Cadastros> {
  return JSON.parse(await falso.erp.consultar(montar(modeloErp('cadastros'), {}))) as Cadastros
}

test('estoque: vêm os movimentos acima do valor dado, em ordem de oid e não de data, com os saldos em texto exato', async () => {
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1849, _iddocumento: 58, _idlocalestoque: 1, idmercadoriavariacao: 2138, datahora: '2026-09-25 15:09:00', qtdsaldoatual: '0.100000', qtdnovosaldo: '-0.900000' },
    { oid: 1847, _iddocumento: 48, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-26 22:40:00', qtdsaldoatual: '0.000000', qtdnovosaldo: '3.000000' },
    { oid: 1848, _iddocumento: 116, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-28 10:15:00', qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
    { oid: 1850, _iddocumento: 117, _idlocalestoque: 1, idmercadoriavariacao: 61, datahora: '2026-09-28 11:00:00.5', qtdsaldoatual: '12345678901234567.123456', qtdnovosaldo: null },
  ])
  assert.deepEqual((await lerEstoqueFalso(1847)).movimentos, [
    { oid: 1848, produto: 60, documento: 116, momento: '2026-09-28T10:15:00', saldo_antes: '3.000000', saldo_depois: '2.000000' },
    { oid: 1849, produto: 2138, documento: 58, momento: '2026-09-25T15:09:00', saldo_antes: '0.100000', saldo_depois: '-0.900000' },
    { oid: 1850, produto: 61, documento: 117, momento: '2026-09-28T11:00:00.5', saldo_antes: '12345678901234567.123456', saldo_depois: null },
  ])
  assert.deepEqual((await lerEstoqueFalso(1848)).movimentos.map((m) => m.oid), [1849, 1850])
})

test('estoque: a foto é só da empresa 1, local 1, ordenada por produto, com a quantidade em texto', async () => {
  await falso.inserir('mercadoria_estoque', [
    { oid: 3, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 1362, qtdsaldo: '1.000000' },
    { oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '-2.000000' },
    { oid: 2, _idempresa: 2, _idlocalestoque: 1, _idmercadoriavariacao: 61, qtdsaldo: '5.000000' },
    { oid: 4, _idempresa: 1, _idlocalestoque: 2, _idmercadoriavariacao: 62, qtdsaldo: '7.000000' },
    { oid: 5, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 5278, qtdsaldo: '0.123456789' },
  ])
  assert.deepEqual((await lerEstoqueFalso(1847)).foto, [
    { produto: 60, quantidade: '-2.000000' },
    { produto: 1362, quantidade: '1.000000' },
    { produto: 5278, quantidade: '0.123456789' },
  ])
})

test('estoque: sem movimentos e sem foto, as duas listas vêm vazias, e não null', async () => {
  assert.deepEqual(await lerEstoqueFalso(1847), { movimentos: [], foto: [] })
})

test('cadastros: o produto traz grupo, seção e subgrupo da mercadoria, a marca da variação e o custo em texto', async () => {
  await falso.inserir('mercadoria_grupo', [{ _idgrupo: 1, descricao: 'FERRAGENS' }, { _idgrupo: 2, descricao: 'ELETRICA' }])
  await falso.inserir('mercadoria_secao', [{ _idsecao: 3, descricao: 'FERRAMENTAS' }])
  await falso.inserir('mercadoria_subgrupo', [{ _idsubgrupo: 4, descricao: 'CHAVES' }])
  await falso.inserir('mercadoria_marca', [{ _idmarca: 5, descricao: 'MARCA A' }, { _idmarca: 6, descricao: 'MARCA B' }])
  await falso.inserir('mercadoria', [{ _idmercadoria: 10, idgrupo: 1, idsecao: 3, idsubgrupo: 4 }])
  await falso.inserir('mercadoria_variacao', [
    { _idmercadoriavariacao: 2139, idmercadoria: 10, descricao: 'CHAVE PHILIPS 3/8', idmarca: 6 },
    { _idmercadoriavariacao: 2138, idmercadoria: 10, descricao: 'CHAVE PHILIPS 1/4', idmarca: 5 },
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

test('cadastros: produto sem linha de custo vem com custo vazio, e não zero; o que não tem linha vem vazio', async () => {
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, idmercadoria: 99, descricao: 'PARAFUSO', idmarca: null }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 2, _idmercadoriavariacao: 60, valcusto: '5.000000' }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 2, _idmercadoriavariacao: 60, flaginativo: 'T' }])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 60, descricao: 'PARAFUSO', grupo: null, secao: null, subgrupo: null, marca: null, custo: null, inativo: null },
  ])
})

test('cadastros: vale o endereço principal e ativo de menor _idendereco; pessoa sem endereço vem com bairro vazio', async () => {
  await falso.inserir('municipio', [{ _idmunicipio: 2304400, nome: 'Fortaleza' }, { _idmunicipio: 2303709, nome: 'Caucaia' }])
  await falso.inserir('pessoa', [
    { _idpessoa: 999007, nome: 'CONSUMIDOR', sobrenome: 'FINAL', cnpjcpf: null, flaginativo: 'F' },
    { _idpessoa: 1001, nome: 'CLIENTE', sobrenome: 'UM', cnpjcpf: '00000000000', flaginativo: 'F' },
    { _idpessoa: 1002, nome: 'CLIENTE', sobrenome: null, cnpjcpf: '00000000000000', flaginativo: 'T' },
  ])
  await falso.inserir('pessoa_endereco', [
    { _idpessoa: 1001, _idendereco: 3, bairro: 'CENTRO', idibgemunicipio: 2304400, uf: 'CE', flagprincipal: 'T', flaginativo: 'F' },
    { _idpessoa: 1001, _idendereco: 2, bairro: 'ALDEOTA', idibgemunicipio: 2304400, uf: 'CE', flagprincipal: 'T', flaginativo: 'F' },
    { _idpessoa: 1001, _idendereco: 1, bairro: 'ANTIGO', idibgemunicipio: 2303709, uf: 'CE', flagprincipal: 'T', flaginativo: 'T' },
    { _idpessoa: 1002, _idendereco: 1, bairro: 'JUREMA', idibgemunicipio: 2303709, uf: 'CE', flagprincipal: 'F', flaginativo: 'F' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).pessoas, [
    { codigo: 1001, nome: 'CLIENTE', sobrenome: 'UM', cpf_cnpj: '00000000000', bairro: 'ALDEOTA', municipio: 'Fortaleza', ibge: 2304400, uf: 'CE', inativo: 'F' },
    { codigo: 1002, nome: 'CLIENTE', sobrenome: null, cpf_cnpj: '00000000000000', bairro: null, municipio: null, ibge: null, uf: null, inativo: 'T' },
    { codigo: 999007, nome: 'CONSUMIDOR', sobrenome: 'FINAL', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null, inativo: 'F' },
  ])
})

test('cadastros: funcionários só da empresa 1, com nome e sobrenome da pessoa', async () => {
  await falso.inserir('pessoa', [
    { _idpessoa: 1, nome: 'VENDEDOR', sobrenome: 'UM', flaginativo: 'F' },
    { _idpessoa: 999005, nome: 'VENDEDORA', sobrenome: 'DOIS', flaginativo: 'F' },
  ])
  await falso.inserir('pessoa_funcionario', [
    { _idempresa: 1, _idpessoa: 999005, idusuario: 18153, tipo: 'V', flaginativo: 'F' },
    { _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' },
    { _idempresa: 2, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'T' },
    { _idempresa: 1, _idpessoa: 7, idusuario: null, tipo: 'O', flaginativo: 'T' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).funcionarios, [
    { codigo: 1, nome: 'VENDEDOR', sobrenome: 'UM', usuario: 18152, tipo: 'V', inativo: 'F' },
    { codigo: 7, nome: null, sobrenome: null, usuario: null, tipo: 'O', inativo: 'T' },
    { codigo: 999005, nome: 'VENDEDORA', sobrenome: 'DOIS', usuario: 18153, tipo: 'V', inativo: 'F' },
  ])
})

test('cadastros: fornecedores só com flaginativo F, da empresa 1, ordenados por produto e fornecedor', async () => {
  await falso.inserir('mercadoria_variacao_pessoa', [
    { _idempresa: 1, _idmercadoriavariacao: 2138, _idpessoa: 900010, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 60, _idpessoa: 900020, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 60, _idpessoa: 900010, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 61, _idpessoa: 900010, flaginativo: 'T' },
    { _idempresa: 2, _idmercadoriavariacao: 62, _idpessoa: 900010, flaginativo: 'F' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).fornecedores, [
    { produto: 60, fornecedor: 900010 },
    { produto: 60, fornecedor: 900020 },
    { produto: 2138, fornecedor: 900010 },
  ])
})

test('cadastros: com tudo vazio, as quatro listas vêm vazias, e não null', async () => {
  assert.deepEqual(await lerCadastrosFalso(), { produtos: [], pessoas: [], funcionarios: [], fornecedores: [] })
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Comando: `node --test tradutor/consulta-estoque-cadastros.test.mts`

Saída esperada: os 9 testes falham; 3 com `Error: ENOENT: no such file or directory, open '...\sql\erp\estoque.sql'` e 6 com o mesmo erro para `...\sql\erp\cadastros.sql`. O resumo mostra `ℹ tests 9`, `ℹ pass 0`, `ℹ fail 9`.

- [ ] **Passo 3: Escrever a consulta de estoque**

Crie `sql/erp/estoque.sql` com exatamente este conteúdo (sem `;` no fim e sem comentário):

```sql
select json_build_object(
  'movimentos', coalesce((
    select json_agg(json_build_object(
      'oid', h.oid,
      'produto', h.idmercadoriavariacao,
      'documento', h._iddocumento,
      'momento', h.datahora,
      'saldo_antes', h.qtdsaldoatual::text,
      'saldo_depois', h.qtdnovosaldo::text
    ) order by h.oid)
    from mercadoria_estoque_historico h
    where h.oid > {{movimentos_acima_de}}
  ), '[]'),
  'foto', coalesce((
    select json_agg(json_build_object(
      'produto', e._idmercadoriavariacao,
      'quantidade', e.qtdsaldo::text
    ) order by e._idmercadoriavariacao)
    from mercadoria_estoque e
    where e._idempresa = 1 and e._idlocalestoque = 1
  ), '[]')
)::text as dados
```

- [ ] **Passo 4: Escrever a consulta de cadastros**

Crie `sql/erp/cadastros.sql` com exatamente este conteúdo (sem `;` no fim e sem comentário). Os apelidos são todos diferentes entre si; `en` é o endereço escolhido pelo `left join lateral`, com as colunas de `pessoa_endereco` sob os mesmos nomes.

```sql
select json_build_object(
  'produtos', coalesce((
    select json_agg(json_build_object(
      'codigo', v._idmercadoriavariacao,
      'descricao', v.descricao,
      'grupo', g.descricao,
      'secao', s.descricao,
      'subgrupo', sg.descricao,
      'marca', ma.descricao,
      'custo', cu.valcusto::text,
      'inativo', ve.flaginativo
    ) order by v._idmercadoriavariacao)
    from mercadoria_variacao v
    left join mercadoria m on m._idmercadoria = v.idmercadoria
    left join mercadoria_grupo g on g._idgrupo = m.idgrupo
    left join mercadoria_secao s on s._idsecao = m.idsecao
    left join mercadoria_subgrupo sg on sg._idsubgrupo = m.idsubgrupo
    left join mercadoria_marca ma on ma._idmarca = v.idmarca
    left join mercadoria_custo cu on cu._idmercadoriavariacao = v._idmercadoriavariacao and cu._idempresa = 1
    left join mercadoria_variacao_empresa ve on ve._idmercadoriavariacao = v._idmercadoriavariacao and ve._idempresa = 1
  ), '[]'),
  'pessoas', coalesce((
    select json_agg(json_build_object(
      'codigo', p._idpessoa,
      'nome', p.nome,
      'sobrenome', p.sobrenome,
      'cpf_cnpj', p.cnpjcpf,
      'bairro', en.bairro,
      'municipio', mu.nome,
      'ibge', en.idibgemunicipio,
      'uf', en.uf,
      'inativo', p.flaginativo
    ) order by p._idpessoa)
    from pessoa p
    left join lateral (
      select pe.bairro, pe.idibgemunicipio, pe.uf
      from pessoa_endereco pe
      where pe._idpessoa = p._idpessoa and pe.flagprincipal = 'T' and pe.flaginativo = 'F'
      order by pe._idendereco
      limit 1
    ) en on true
    left join municipio mu on mu._idmunicipio = en.idibgemunicipio
  ), '[]'),
  'funcionarios', coalesce((
    select json_agg(json_build_object(
      'codigo', f._idpessoa,
      'nome', fp.nome,
      'sobrenome', fp.sobrenome,
      'usuario', f.idusuario,
      'tipo', f.tipo,
      'inativo', f.flaginativo
    ) order by f._idpessoa)
    from pessoa_funcionario f
    left join pessoa fp on fp._idpessoa = f._idpessoa
    where f._idempresa = 1
  ), '[]'),
  'fornecedores', coalesce((
    select json_agg(json_build_object(
      'produto', vp._idmercadoriavariacao,
      'fornecedor', vp._idpessoa
    ) order by vp._idmercadoriavariacao, vp._idpessoa)
    from mercadoria_variacao_pessoa vp
    where vp._idempresa = 1 and vp.flaginativo = 'F'
  ), '[]')
)::text as dados
```

- [ ] **Passo 5: Rodar o teste e ver passar**

Comando: `node --test tradutor/consulta-estoque-cadastros.test.mts`

Saída esperada: 9 linhas com `✔`, e o resumo `ℹ tests 9`, `ℹ pass 9`, `ℹ fail 0`. Cada teste leva perto de 0,1 s; se os de cadastros levarem mais de 1 s cada, o `set jit = off` não chegou à conexão que roda a consulta (veja o `before` do teste).

- [ ] **Passo 6: Atualizar a contagem de testes (N = 9)**

Este ciclo acrescentou 9 `test(`. Some 9 ao número de `testes-esperados.txt`:

```bash
node -e "const fs = require('node:fs'); const n = Number(fs.readFileSync('testes-esperados.txt', 'utf8').trim()) + 9; fs.writeFileSync('testes-esperados.txt', n + '\n'); console.log('testes esperados agora: ' + n)"
```

Saída esperada: `testes esperados agora: M`, com M = número anterior + 9.

- [ ] **Passo 7: Rodar a verificação completa**

Comando: `npm run verificar`

Saída esperada: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com o mesmo M do passo 6.

- [ ] **Passo 8: Commit das consultas**

```bash
git add sql/erp/estoque.sql sql/erp/cadastros.sql tradutor/consulta-estoque-cadastros.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 2: consultas de estoque e de cadastros do ERP

A consulta de estoque traz, numa chamada só e do mesmo instante, os
movimentos acima do corte, na ordem em que o ERP os gravou (e não pela
data, que pode ser antiga num orçamento convertido), e a foto do saldo
da loja (empresa 1, local 1). Saldos saem como texto exato, até com 9
casas ou 17 algarismos.

A consulta de cadastros traz produtos (com grupo, seção, subgrupo,
marca e custo), clientes (com um endereço só: o principal e ativo),
funcionários e fornecedores do produto, só da empresa 1. Produto sem
custo cadastrado vem sem custo, e não com zero. 9 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Passo 9: Escrever o teste da leitura**

Crie `tradutor/leitura.test.mts` com exatamente este conteúdo. Cada teste confere duas coisas: que a função mandou ao ERP exatamente o SQL montado com os cortes e valores certos (a última linha de `falso.consultas`), e que devolveu, sem mexer, o texto que o banco dá para esse SQL. Os cortes de teste são diferentes em cada tabela, para que trocar um pelo outro apareça.

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import {
  conferirColunas, conferirEmpresaLocal, lerAntesDaVirada, lerCadastros, lerDocumentosFaixa, lerDocumentosHora, lerEstoque, lerVivos,
} from './leitura.mts'
import { data, inteiros, lerColunasEsperadas, modeloErp, montar, pares } from './sql-erp.mts'
import type { Cortes } from './tipos.mts'

// Um corte diferente por tabela, para que trocar um pelo outro apareça no SQL.
const CORTES: Cortes = {
  documento: 184,
  documento_mercadoria: 1872,
  documento_pagamento: 3,
  documento_parcela: 4,
  documento_parcela_pagamento: 5,
  documento_conferencia_caixa: 30,
  documento_cancelamento_historico: 7,
  mercadoria_estoque_historico: 1847,
}

const TABELAS = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
let falso: ErpFalso

before(async () => {
  falso = await criarErpFalso()
  // Sem estatísticas, o banco falso compila a consulta de cadastros com JIT (1,5 s por chamada).
  await falso.cliente.query('set jit = off')
})
after(async () => { await falso.fechar() })
beforeEach(async () => { await falso.cliente.query(`truncate ${TABELAS.join(', ')}`) })

function ultimaConsulta(): string {
  return falso.consultas[falso.consultas.length - 1]
}

// O texto que o banco falso devolve para o SQL esperado, lido direto, sem passar pela leitura.
async function direto(sql: string): Promise<string> {
  const r = await falso.cliente.query(sql)
  return r.rows[0].dados as string
}

test('conferirColunas: monta com a lista de colunas esperadas e devolve as que faltam', async () => {
  const esperado = montar(modeloErp('colunas'), { pares: pares(lerColunasEsperadas().map((c): [string, string] => [c.tabela, c.coluna])) })
  assert.deepEqual(await conferirColunas(falso.erp), [])
  assert.equal(ultimaConsulta(), esperado)
  await falso.cliente.query('alter table documento_parcela drop column descricao')
  try {
    assert.deepEqual(await conferirColunas(falso.erp), ['documento_parcela.descricao'])
  } finally {
    await falso.cliente.query('alter table documento_parcela add column descricao text')
  }
})

test('conferirEmpresaLocal: usa os cortes do documento e do histórico e devolve a lista', async () => {
  await falso.inserir('documento', [
    { oid: 184, _iddocumento: 90, idempresa: 3 },
    { oid: 185, _iddocumento: 94, idempresa: 1 },
    { oid: 186, _iddocumento: 95, idempresa: 2 },
  ])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1847, _iddocumento: 48, _idlocalestoque: 9 },
    { oid: 1848, _iddocumento: 94, _idlocalestoque: 2 },
  ])
  const lista = await conferirEmpresaLocal(falso.erp, CORTES)
  assert.equal(ultimaConsulta(), montar(modeloErp('empresa-local'), { corte_documento: '184', corte_historico: '1847' }))
  const ordenada = [...lista].sort((a, b) => a.tabela.localeCompare(b.tabela) || a.valor - b.valor)
  assert.deepEqual(ordenada, [
    { tabela: 'documento.idempresa', valor: 2 },
    { tabela: 'mercadoria_estoque_historico._idlocalestoque', valor: 2 },
  ])
})

test('lerDocumentosHora: usa o corte de cada tabela, a seleção dada e desliga a faixa', async () => {
  await falso.inserir('documento', [
    { oid: 185, _iddocumento: 94, modelo: 'CP', tipomovimentofinanceiro: 'P', datahora: '2026-09-20 10:00:00' },
    { oid: 186, _iddocumento: 95, modelo: 'PA', datahora: '2026-09-28 09:00:00' },
    { oid: 187, _iddocumento: 96, modelo: 'PA', datahora: '2026-09-20 10:00:00' },
    { oid: 190, _iddocumento: 99, modelo: 'PA', datahora: '2026-09-20 10:00:00' },
  ])
  const texto = await lerDocumentosHora(falso.erp, CORTES, { novosAcimaDe: 188, inicio: '2026-09-28', pendentes: [185] })
  const esperado = montar(modeloErp('documentos'), {
    corte_documento: '184',
    corte_item: '1872',
    corte_pagamento: '3',
    corte_parcela: '4',
    corte_baixa: '5',
    corte_conferencia: '30',
    corte_cancelamento: '7',
    novos_acima_de: '188',
    inicio: data('2026-09-28'),
    pendentes: inteiros([185]),
    faixa_de: '1',
    faixa_ate: '0',
  })
  assert.equal(ultimaConsulta(), esperado)
  assert.equal(texto, await direto(esperado))
  assert.deepEqual(JSON.parse(texto).map((d: { oid: number }) => d.oid), [185, 186, 190])
})

test('lerDocumentosFaixa: lê só a faixa, com novos, janela e pendentes desligados', async () => {
  await falso.inserir('documento', [
    { oid: 185, _iddocumento: 94, modelo: 'PA', datahora: '2026-09-29 10:00:00' },
    { oid: 300, _iddocumento: 95, modelo: 'CP', datahora: '2026-04-10 00:00:00' },
    { oid: 5185, _iddocumento: 96, modelo: 'PA', datahora: '2026-09-29 10:00:00' },
    { oid: 5186, _iddocumento: 97, modelo: 'PA', datahora: '2026-09-29 10:00:00' },
  ])
  await falso.inserir('documento_cancelamento_historico', [{ oid: 8, _iddocumento: 94, datahora: '2026-09-29 11:00:00' }])
  const texto = await lerDocumentosFaixa(falso.erp, CORTES, 186, 5185)
  const esperado = montar(modeloErp('documentos'), {
    corte_documento: '184',
    corte_item: '1872',
    corte_pagamento: '3',
    corte_parcela: '4',
    corte_baixa: '5',
    corte_conferencia: '30',
    corte_cancelamento: '7',
    novos_acima_de: '2147483647',
    inicio: data('9999-12-31'),
    pendentes: inteiros([]),
    faixa_de: '186',
    faixa_ate: '5185',
  })
  assert.equal(ultimaConsulta(), esperado)
  assert.equal(texto, await direto(esperado))
  assert.deepEqual(JSON.parse(texto).map((d: { oid: number }) => d.oid), [300, 5185])
})

test('lerVivos: usa o corte do documento e devolve o texto da lista', async () => {
  await falso.inserir('documento', [{ oid: 184, _iddocumento: 1 }, { oid: 186, _iddocumento: 2 }, { oid: 185, _iddocumento: 3 }])
  const texto = await lerVivos(falso.erp, CORTES)
  const esperado = montar(modeloErp('vivos'), { corte_documento: '184' })
  assert.equal(ultimaConsulta(), esperado)
  assert.equal(texto, await direto(esperado))
  assert.deepEqual(JSON.parse(texto), [185, 186])
})

test('lerEstoque: usa o valor dado e nunca desce abaixo do corte do histórico', async () => {
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1847, _iddocumento: 48, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-26 22:40:00', qtdsaldoatual: '0.000000', qtdnovosaldo: '3.000000' },
    { oid: 1848, _iddocumento: 94, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-28 10:00:00', qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
    { oid: 1900, _iddocumento: 95, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-28 11:00:00', qtdsaldoatual: '2.000000', qtdnovosaldo: '1.000000' },
  ])
  const texto = await lerEstoque(falso.erp, CORTES, 1848)
  const esperado = montar(modeloErp('estoque'), { movimentos_acima_de: '1848' })
  assert.equal(ultimaConsulta(), esperado)
  assert.equal(texto, await direto(esperado))
  assert.deepEqual(JSON.parse(texto).movimentos.map((m: { oid: number }) => m.oid), [1900])
  const abaixo = await lerEstoque(falso.erp, CORTES, 1000)
  assert.equal(ultimaConsulta(), montar(modeloErp('estoque'), { movimentos_acima_de: '1847' }))
  assert.deepEqual(JSON.parse(abaixo).movimentos.map((m: { oid: number }) => m.oid), [1848, 1900])
})

test('lerCadastros: roda a consulta de cadastros e devolve o texto', async () => {
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: 'PARAFUSO' }])
  const texto = await lerCadastros(falso.erp)
  assert.equal(ultimaConsulta(), modeloErp('cadastros'))
  assert.equal(texto, await direto(modeloErp('cadastros')))
  assert.deepEqual(JSON.parse(texto).produtos.map((p: { codigo: number }) => p.codigo), [60])
})

test('lerAntesDaVirada: usa o corte do documento e devolve o texto', async () => {
  await falso.inserir('documento', [
    { oid: 184, _iddocumento: 48, modelo: 'LE', datahora: '2026-09-26 22:40:00' },
    { oid: 185, _iddocumento: 94, modelo: 'AC', datahora: '2026-09-27 14:20:00' },
    { oid: 228, _iddocumento: 137, modelo: 'AC', datahora: '2026-09-27 14:33:00' },
    { oid: 229, _iddocumento: 138, modelo: 'PA', datahora: '2026-09-28 08:00:00' },
  ])
  const texto = await lerAntesDaVirada(falso.erp, CORTES)
  const esperado = montar(modeloErp('antes-da-virada'), { corte_documento: '184' })
  assert.equal(ultimaConsulta(), esperado)
  assert.equal(texto, await direto(esperado))
  const grupos = JSON.parse(texto) as Array<{ modelo: string; quantidade: number | string }>
  assert.deepEqual(grupos.map((g) => [g.modelo, Number(g.quantidade)]), [['AC', 2]])
})

test('valores fora do formato são recusados antes de a consulta sair para o ERP', async () => {
  const antes = falso.consultas.length
  await assert.rejects(lerDocumentosHora(falso.erp, CORTES, { novosAcimaDe: 188, inicio: '28/09/2026', pendentes: [] }))
  await assert.rejects(lerDocumentosHora(falso.erp, CORTES, { novosAcimaDe: 188, inicio: '2026-09-28', pendentes: [1.5] }))
  await assert.rejects(lerDocumentosFaixa(falso.erp, CORTES, -1, 10))
  await assert.rejects(lerEstoque(falso.erp, CORTES, Number.NaN))
  assert.equal(falso.consultas.length, antes)
})
```

- [ ] **Passo 10: Rodar o teste e ver falhar**

Comando: `node --test tradutor/leitura.test.mts`

Saída esperada: o arquivo inteiro falha ao carregar, com `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\leitura.mts' imported from ...\tradutor\leitura.test.mts`; o resumo mostra `ℹ tests 1`, `ℹ fail 1`.

- [ ] **Passo 11: Escrever a leitura**

Crie `tradutor/leitura.mts` com exatamente este conteúdo. `lerEstoque` nunca desce abaixo do corte do histórico, mesmo que o chamador erre a conta; os outros valores passam pelas funções de `sql-erp.mts`, que recusam o que não for inteiro não negativo ou data `AAAA-MM-DD` antes de a consulta sair.

```ts
import type { Erp } from './erp.mts'
import type { Cortes } from './tipos.mts'
import { data, inteiro, inteiros, lerColunasEsperadas, modeloErp, montar, pares } from './sql-erp.mts'

export type SelecaoHora = { novosAcimaDe: number; inicio: string; pendentes: number[] }

type SelecaoDocumentos = SelecaoHora & { faixaDe: number; faixaAte: number }

// Valores que desligam um critério da consulta de documentos: nenhum oid passa de 2147483647
// (maior integer do Postgres), nenhuma data chega a 9999-12-31, e a faixa 1..0 é vazia.
const NENHUM_OID = 2147483647
const NENHUMA_DATA = '9999-12-31'

// O SQL da API não aceita parâmetro: todo valor passa por inteiro(), data() ou inteiros(),
// que recusam o que não for número inteiro ou data 'AAAA-MM-DD' antes de a consulta sair.
function valoresDocumentos(cortes: Cortes, s: SelecaoDocumentos): Record<string, string> {
  return {
    corte_documento: inteiro(cortes.documento),
    corte_item: inteiro(cortes.documento_mercadoria),
    corte_pagamento: inteiro(cortes.documento_pagamento),
    corte_parcela: inteiro(cortes.documento_parcela),
    corte_baixa: inteiro(cortes.documento_parcela_pagamento),
    corte_conferencia: inteiro(cortes.documento_conferencia_caixa),
    corte_cancelamento: inteiro(cortes.documento_cancelamento_historico),
    novos_acima_de: inteiro(s.novosAcimaDe),
    inicio: data(s.inicio),
    pendentes: inteiros(s.pendentes),
    faixa_de: inteiro(s.faixaDe),
    faixa_ate: inteiro(s.faixaAte),
  }
}

export async function conferirColunas(erp: Erp): Promise<string[]> {
  const lista = lerColunasEsperadas().map((c): [string, string] => [c.tabela, c.coluna])
  const texto = await erp.consultar(montar(modeloErp('colunas'), { pares: pares(lista) }))
  return JSON.parse(texto) as string[]
}

export async function conferirEmpresaLocal(erp: Erp, cortes: Cortes): Promise<Array<{ tabela: string; valor: number }>> {
  const sql = montar(modeloErp('empresa-local'), {
    corte_documento: inteiro(cortes.documento),
    corte_historico: inteiro(cortes.mercadoria_estoque_historico),
  })
  return JSON.parse(await erp.consultar(sql)) as Array<{ tabela: string; valor: number }>
}

export async function lerDocumentosHora(erp: Erp, cortes: Cortes, selecao: SelecaoHora): Promise<string> {
  const valores = valoresDocumentos(cortes, { ...selecao, faixaDe: 1, faixaAte: 0 })
  return erp.consultar(montar(modeloErp('documentos'), valores))
}

export async function lerDocumentosFaixa(erp: Erp, cortes: Cortes, de: number, ate: number): Promise<string> {
  const valores = valoresDocumentos(cortes, { novosAcimaDe: NENHUM_OID, inicio: NENHUMA_DATA, pendentes: [], faixaDe: de, faixaAte: ate })
  return erp.consultar(montar(modeloErp('documentos'), valores))
}

export async function lerVivos(erp: Erp, cortes: Cortes): Promise<string> {
  return erp.consultar(montar(modeloErp('vivos'), { corte_documento: inteiro(cortes.documento) }))
}

export async function lerEstoque(erp: Erp, cortes: Cortes, movimentosAcimaDe: number): Promise<string> {
  // Nunca desce abaixo do corte, mesmo que o chamador erre a conta.
  const acimaDe = Math.max(cortes.mercadoria_estoque_historico, movimentosAcimaDe)
  return erp.consultar(montar(modeloErp('estoque'), { movimentos_acima_de: inteiro(acimaDe) }))
}

export async function lerCadastros(erp: Erp): Promise<string> {
  return erp.consultar(montar(modeloErp('cadastros'), {}))
}

export async function lerAntesDaVirada(erp: Erp, cortes: Cortes): Promise<string> {
  return erp.consultar(montar(modeloErp('antes-da-virada'), { corte_documento: inteiro(cortes.documento) }))
}
```

- [ ] **Passo 12: Rodar o teste e ver passar**

Comando: `node --test tradutor/leitura.test.mts`

Saída esperada: 9 linhas com `✔`, e o resumo `ℹ tests 9`, `ℹ pass 9`, `ℹ fail 0`.

- [ ] **Passo 13: Atualizar a contagem de testes (N = 9)**

Este ciclo acrescentou 9 `test(`. Some 9 ao número de `testes-esperados.txt`:

```bash
node -e "const fs = require('node:fs'); const n = Number(fs.readFileSync('testes-esperados.txt', 'utf8').trim()) + 9; fs.writeFileSync('testes-esperados.txt', n + '\n'); console.log('testes esperados agora: ' + n)"
```

Saída esperada: `testes esperados agora: M`, com M = número anterior + 9.

- [ ] **Passo 14: Rodar a verificação completa**

Comando: `npm run verificar`

Saída esperada: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com o mesmo M do passo 13.

- [ ] **Passo 15: Commit da leitura**

```bash
git add tradutor/leitura.mts tradutor/leitura.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Fase 2: leitura do ERP com os cortes certos

O tradutor agora tem um lugar só que monta e manda cada consulta ao
ERP: conferência de colunas, de empresa e local, documentos da hora,
fatias da noite, lista de vivos, estoque, cadastros e documentos
anteriores à virada. Cada consulta sai com o corte certo de cada
tabela, e o teste confere o SQL que foi de fato enviado.

A leitura da hora desliga a faixa da noite, e a da noite desliga os
critérios da hora. Um valor fora do formato (uma data 28/09/2026, um
número quebrado ou negativo) é recusado antes de sair para o ERP, e o
estoque nunca é lido abaixo do corte da virada. 9 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 8: Carga dos documentos

**O que esta tarefa entrega, em resultado:** o Kaizen passa a gravar os documentos lidos do ERP, com itens, pagamentos, parcelas com as baixas e a conferência do caixa. Reler um documento troca os filhos por inteiro (um item que sumiu do ERP sai daqui; uma baixa estornada sai). A hora em que o Kaizen viu o documento pela primeira vez (`visto_em`) nunca muda. Rodar duas vezes com o mesmo ERP deixa o mesmo conteúdo. Também ficam prontas as consultas simples ao banco do Kaizen que a leitura de hora em hora usa: os cortes, o maior `oid` já visto e os documentos com parcela em aberto.

**Antes de começar:** o Postgres local precisa estar de pé (`docker compose up -d`, tarefa 1). Os testes criam e apagam um banco próprio (`criarBancoKaizen`, tarefa 2); não mexem no banco `kaizen`.

**Arquivos:**
- Criar: `tradutor/kaizen.mts`
- Testar: `tradutor/kaizen.test.mts`
- Criar: `sql/carga/entrada.sql`
- Criar: `sql/carga/documentos.sql`
- Criar: `tradutor/carga.mts`
- Testar: `tradutor/carga.test.mts`
- Modificar: `testes-esperados.txt` (soma 17)

**Interfaces:**
- Consome:
  - `tradutor/banco.mts` (tarefa 1): `export type Cliente = pg.Client`; `export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>` (begin; fazer; commit; em erro, rollback e relança). Com os parsers da tarefa 1, `numeric`, `bigint`, `count(*)`, `timestamp`, `timestamptz` e `date` chegam como **texto**; `integer` chega como número; `boolean` como `true`/`false`; `jsonb` já como objeto.
  - `tradutor/tipos.mts` (tarefa 2): `export type TabelaCorte = 'documento' | 'documento_mercadoria' | 'documento_pagamento' | 'documento_parcela' | 'documento_parcela_pagamento' | 'documento_conferencia_caixa' | 'documento_cancelamento_historico' | 'mercadoria_estoque_historico'`; `export type Cortes = Record<TabelaCorte, number>`.
  - `tradutor/apoio-teste.mts` (tarefa 2): `export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }`; `export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>` (banco novo, conectado como `kaizen`, com todas as migrações aplicadas; `fechar()` apaga o banco).
  - Tabelas da tarefa 2 (`sql/migracoes/001_estrutura.sql`): `kaizen.documento`, `kaizen.documento_item`, `kaizen.documento_pagamento`, `kaizen.parcela`, `kaizen.baixa` (liga à parcela por `parcela_id`, com `on delete cascade`), `kaizen.conferencia_caixa`, `kaizen.estoque_movimento`, `kaizen.corte`. Os filhos do documento têm `on delete cascade`. Cortes da migração `003_corte.sql` (fonte `meuerp`): documento 184, documento_mercadoria 1872, documento_pagamento 0, documento_parcela 0, documento_parcela_pagamento 0, documento_conferencia_caixa 30, documento_cancelamento_historico 0, mercadoria_estoque_historico 1847.
  - O formato de cada documento que vem do ERP (DocumentoErp, contrato seção 6). O texto de uma parte é um array JSON desses objetos:
    ```
    { "oid": int, "codigo": int, "modelo": str, "status": str|null, "movimento": str|null, "financeiro": str|null,
      "criado_em": ts, "fechado_em": ts|null, "pessoa": int|null,
      "turno_caixa": int|null, "turno_usuario": int|null, "turno_numero": int|null,
      "itens": [ { "oid": int, "produto": int, "quantidade": str|null, "valor_liquido": str|null, "vendedor": int|null } ],
      "pagamentos": [ { "oid": int, "forma": int, "valor": str } ],
      "parcelas": [ { "oid": int, "lancado_em": ts|null, "vencimento": ts|null, "valor": str, "status": str|null, "descricao": str|null,
                      "baixas": [ { "oid": int, "pago_em": ts|null, "valor": str, "forma": int|null, "status": str|null } ] } ],
      "conferencia": [ { "oid": int, "forma": int, "calculado": str|null, "informado": str|null } ],
      "conferencia_abaixo_corte": int }
    ```
    `ts` é o texto que o Postgres do ERP escreve dentro do JSON: `AAAA-MM-DDTHH:MM:SS`, com a fração de segundo só quando ela existe (ex.: `2026-09-28T14:05:03`, `2026-09-28T11:00:00.5`, `2026-09-28T14:07:09.123456`), sem fuso. A carga aceita as duas formas: `::timestamp` no horário do documento e `left(x, 10)::date` nas datas de parcela e de baixa. As listas vêm sempre como array (vazias como `[]`).
- Produz (outras tarefas usam exatamente estes nomes):
  - `tradutor/kaizen.mts`:
    - `export async function lerCortes(cliente: Cliente): Promise<Cortes>` — lê `kaizen.corte` da fonte `meuerp`; lança `Error('falta o corte da tabela <tabela> no Kaizen')` se faltar uma das oito tabelas.
    - `export async function maiorOid(cliente: Cliente, tabela: 'documento' | 'estoque_movimento'): Promise<number | null>` — `max(origem_id::bigint)` da fonte `meuerp`; `null` se não houver linha.
    - `export async function oidsComParcelaAberta(cliente: Cliente): Promise<number[]>` — `oid` dos documentos `meuerp` com alguma parcela de status diferente de `'B'` ou vazio, em ordem crescente.
    - `export async function contarDocumentosErp(cliente: Cliente): Promise<number>` — documentos da fonte `meuerp`.
  - `tradutor/carga.mts` (a tarefa 9 acrescenta funções no fim deste arquivo):
    - `export async function colocarEntrada(cliente: Cliente, assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros', partes: string[]): Promise<void>` — cria `pg_temp.entrada` se ainda não existir nesta transação e insere uma linha por parte, numerando as partes a partir de 1. Chame uma vez por assunto em cada transação (a mesma parte duas vezes viola a chave).
    - `export type CargaDocumentos = { lidos: number; novos: number }`
    - `export async function gravarDocumentos(cliente: Cliente): Promise<CargaDocumentos>`
    - Funções internas (não exportadas), que a tarefa 9 reusa no mesmo arquivo: `lerCarga(nome: string): string` (lê `sql/carga/<nome>.sql`) e `rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>>` (roda o arquivo inteiro e devolve as linhas do último comando).
  - Tabelas temporárias, que existem só até o commit da transação:
    - `pg_temp.entrada (assunto text, parte integer, dados jsonb)`;
    - `pg_temp.doc_lido (origem_id text, j jsonb)` — uma linha por documento lido nesta transação (o `oid` em texto e o DocumentoErp inteiro). A tarefa 9 (`apagar.sql`) e a tarefa 11 (`fechamentosComResto`) leem dela.

**Por que o código é assim (para não "consertar" sem querer):**
- Todas as funções de `carga.mts` rodam dentro de uma transação aberta pelo chamador (`emTransacao`): as tabelas temporárias são `on commit drop`, e `novos` compara `visto_em` com `now()`, que é a hora do início da transação. Um documento gravado agora tem `visto_em = now()`; um relido guarda o `visto_em` antigo, porque o `do update` do `on conflict` não toca nessa coluna.
- O mesmo `oid` em duas partes (fatias da noite que se sobrepõem) vira uma linha só em `doc_lido`, e vale a parte de número maior, que é a leitura mais recente.
- Os `drop table if exists` usam `pg_temp.` na frente: o `search_path` do usuário `kaizen` é `"$user", public`, isto é, começa pelo esquema `kaizen`. Sem o prefixo, numa transação em que a temporária ainda não existe, o `drop` iria atrás de uma tabela `kaizen.<nome>`.
- Os filhos são apagados e inseridos de novo a cada leitura; a baixa sai junto com a parcela (cascata) e é ligada de volta à parcela recém-inserida pelo `documento_id` e pelo `origem_id` da parcela.
- Nenhum valor passa por número do JavaScript: o texto do ERP vai inteiro como parâmetro `$3::jsonb`, e o Postgres converte (`::numeric`, `::timestamp`, `left(x, 10)::date`).

- [ ] **Passo 1: Escrever o teste que falha das consultas ao Kaizen**

Criar `tradutor/kaizen.test.mts`:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { lerCortes, maiorOid, oidsComParcelaAberta, contarDocumentosErp } from './kaizen.mts'

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.cliente.query('delete from kaizen.documento')
  await banco.cliente.query('delete from kaizen.estoque_movimento')
})

async function inserirDocumento(fonte: 'meuerp' | 'link', origemId: string): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, criado_em)
     values ($1, 'documento', $2, '1', 'CP', '2026-09-28 10:00:00') returning id`,
    [fonte, origemId],
  )
  return r.rows[0].id
}

async function inserirParcela(documentoId: string, origemId: string, status: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, valor, status)
     values ($1, 'documento_parcela', $2, 10.00, $3)`,
    [documentoId, origemId, status],
  )
}

async function inserirMovimento(fonte: 'meuerp' | 'link', origemId: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, momento)
     values ($1, 'mercadoria_estoque_historico', $2, '60', '2026-09-28 10:00:00')`,
    [fonte, origemId],
  )
}

test('lerCortes devolve os oito cortes medidos em 27/09', async () => {
  assert.deepEqual(await lerCortes(banco.cliente), {
    documento: 184,
    documento_mercadoria: 1872,
    documento_pagamento: 0,
    documento_parcela: 0,
    documento_parcela_pagamento: 0,
    documento_conferencia_caixa: 30,
    documento_cancelamento_historico: 0,
    mercadoria_estoque_historico: 1847,
  })
})

test('lerCortes para quando falta o corte de uma tabela', async () => {
  await banco.cliente.query('begin')
  try {
    await banco.cliente.query(`delete from kaizen.corte where fonte = 'meuerp' and tabela = 'documento_parcela'`)
    await assert.rejects(lerCortes(banco.cliente), /falta o corte da tabela documento_parcela no Kaizen/)
  } finally {
    await banco.cliente.query('rollback')
  }
})

test('maiorOid de documento compara como número e só olha o ERP novo', async () => {
  assert.equal(await maiorOid(banco.cliente, 'documento'), null)
  await inserirDocumento('meuerp', '999')
  await inserirDocumento('meuerp', '1000')
  await inserirDocumento('meuerp', '185')
  await inserirDocumento('link', '5000')
  assert.equal(await maiorOid(banco.cliente, 'documento'), 1000)
})

test('maiorOid de estoque compara como número e só olha o ERP novo', async () => {
  assert.equal(await maiorOid(banco.cliente, 'estoque_movimento'), null)
  await inserirMovimento('meuerp', '1848')
  await inserirMovimento('meuerp', '10000')
  await inserirMovimento('meuerp', '9999')
  await inserirMovimento('link', '20000')
  assert.equal(await maiorOid(banco.cliente, 'estoque_movimento'), 10000)
})

test('oidsComParcelaAberta pega status diferente de B e vazio, só do ERP novo, em ordem numérica', async () => {
  const pendente = await inserirDocumento('meuerp', '185')
  await inserirParcela(pendente, '1', 'P')
  const baixada = await inserirDocumento('meuerp', '186')
  await inserirParcela(baixada, '2', 'B')
  const misturada = await inserirDocumento('meuerp', '187')
  await inserirParcela(misturada, '3', 'B')
  await inserirParcela(misturada, '4', null)
  const cancelada = await inserirDocumento('meuerp', '1000')
  await inserirParcela(cancelada, '5', 'C')
  await inserirParcela(cancelada, '6', 'P')
  await inserirDocumento('meuerp', '188')
  const daLink = await inserirDocumento('link', '190')
  await inserirParcela(daLink, '7', 'P')
  assert.deepEqual(await oidsComParcelaAberta(banco.cliente), [185, 187, 1000])
})

test('contarDocumentosErp conta só os documentos do ERP novo', async () => {
  assert.equal(await contarDocumentosErp(banco.cliente), 0)
  await inserirDocumento('meuerp', '185')
  await inserirDocumento('meuerp', '186')
  await inserirDocumento('link', '185')
  assert.equal(await contarDocumentosErp(banco.cliente), 2)
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/kaizen.test.mts`

Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\kaizen.mts' imported from <repositório>\tradutor\kaizen.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 3: Implementar `tradutor/kaizen.mts`**

```ts
import type { Cliente } from './banco.mts'
import type { Cortes, TabelaCorte } from './tipos.mts'

const TABELAS_CORTE: TabelaCorte[] = [
  'documento', 'documento_mercadoria', 'documento_pagamento', 'documento_parcela',
  'documento_parcela_pagamento', 'documento_conferencia_caixa',
  'documento_cancelamento_historico', 'mercadoria_estoque_historico',
]

export async function lerCortes(cliente: Cliente): Promise<Cortes> {
  const r = await cliente.query<{ tabela: string; oid: string }>(
    `select tabela, oid from kaizen.corte where fonte = 'meuerp'`,
  )
  const lidos = new Map(r.rows.map((l) => [l.tabela, Number(l.oid)]))
  const cortes = {} as Cortes
  for (const tabela of TABELAS_CORTE) {
    const oid = lidos.get(tabela)
    if (oid === undefined) throw new Error(`falta o corte da tabela ${tabela} no Kaizen`)
    cortes[tabela] = oid
  }
  return cortes
}

export async function maiorOid(cliente: Cliente, tabela: 'documento' | 'estoque_movimento'): Promise<number | null> {
  // origem_id é texto: o máximo precisa ser numérico, senão '999' ganharia de '1000'
  const sql = tabela === 'documento'
    ? `select max(origem_id::bigint) as maior from kaizen.documento where fonte = 'meuerp'`
    : `select max(origem_id::bigint) as maior from kaizen.estoque_movimento where fonte = 'meuerp'`
  const r = await cliente.query<{ maior: string | null }>(sql)
  const maior = r.rows[0].maior
  return maior === null ? null : Number(maior)
}

export async function oidsComParcelaAberta(cliente: Cliente): Promise<number[]> {
  const r = await cliente.query<{ oid: string }>(
    `select distinct d.origem_id::bigint as oid
       from kaizen.documento d
       join kaizen.parcela p on p.documento_id = d.id
      where d.fonte = 'meuerp' and p.status is distinct from 'B'
      order by 1`,
  )
  return r.rows.map((l) => Number(l.oid))
}

export async function contarDocumentosErp(cliente: Cliente): Promise<number> {
  const r = await cliente.query<{ quantos: string }>(
    `select count(*) as quantos from kaizen.documento where fonte = 'meuerp'`,
  )
  return Number(r.rows[0].quantos)
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test tradutor/kaizen.test.mts`

Expected: PASS, 6 testes:
```
✔ lerCortes devolve os oito cortes medidos em 27/09
✔ lerCortes para quando falta o corte de uma tabela
✔ maiorOid de documento compara como número e só olha o ERP novo
✔ maiorOid de estoque compara como número e só olha o ERP novo
✔ oidsComParcelaAberta pega status diferente de B e vazio, só do ERP novo, em ordem numérica
✔ contarDocumentosErp conta só os documentos do ERP novo
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

- [ ] **Passo 5: Escrever o teste que falha da carga dos documentos**

Criar `tradutor/carga.test.mts`. Os documentos são montados à mão no formato DocumentoErp, a partir dos casos reais do `docs/FONTES.md` (devolução em dinheiro como o TM 63, fechamento como o FC 98, pedido com troco como o 116, pedido regravado como o 58), sem dado de pessoa:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { emTransacao } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import type { CargaDocumentos } from './carga.mts'

// O formato é o DocumentoErp do contrato: inteiros crus, valores em texto, datas como o ERP escreve dentro do JSON.
type ItemErp = { oid: number; produto: number; quantidade: string | null; valor_liquido: string | null; vendedor: number | null }
type PagamentoErp = { oid: number; forma: number; valor: string }
type BaixaErp = { oid: number; pago_em: string | null; valor: string; forma: number | null; status: string | null }
type ParcelaErp = {
  oid: number; lancado_em: string | null; vencimento: string | null; valor: string
  status: string | null; descricao: string | null; baixas: BaixaErp[]
}
type ConferenciaErp = { oid: number; forma: number; calculado: string | null; informado: string | null }
type DocumentoErp = {
  oid: number; codigo: number; modelo: string; status: string | null; movimento: string | null; financeiro: string | null
  criado_em: string; fechado_em: string | null; pessoa: number | null
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null
  itens: ItemErp[]; pagamentos: PagamentoErp[]; parcelas: ParcelaErp[]; conferencia: ConferenciaErp[]
  conferencia_abaixo_corte: number
}

function documento(oid: number, codigo: number, resto: Partial<DocumentoErp> = {}): DocumentoErp {
  return {
    oid, codigo, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-28T14:00:03.123456', fechado_em: '2026-09-28T14:05:10', pessoa: 999007,
    turno_caixa: 10, turno_usuario: 18152, turno_numero: 3,
    itens: [], pagamentos: [], parcelas: [], conferencia: [], conferencia_abaixo_corte: 0,
    ...resto,
  }
}

// Devolução em dinheiro (como o TM 63): item volta, parcela a pagar baixada na hora em dinheiro.
const devolucao = documento(185, 63, {
  modelo: 'TM', movimento: 'E', financeiro: 'P',
  criado_em: '2026-09-28T15:30:00', fechado_em: '2026-09-28T15:30:00',
  turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
  itens: [{ oid: 1873, produto: 1362, quantidade: '1.000000', valor_liquido: '18.00', vendedor: 1 }],
  pagamentos: [{ oid: 1, forma: 1, valor: '18.00' }],
  parcelas: [{
    oid: 1, lancado_em: '2026-09-28T15:30:00', vencimento: '2026-09-28T00:00:00', valor: '18.00',
    status: 'B', descricao: 'Troca de Mercadoria - Retirada',
    baixas: [{ oid: 1, pago_em: '2026-09-28T15:30:00', valor: '18.00', forma: 1, status: 'E' }],
  }],
})

// Fechamento de caixa (como o FC 98): conferência às cegas, uma linha por forma.
const fechamento = documento(186, 98, {
  modelo: 'FC', movimento: 'N', financeiro: 'N', pessoa: null,
  criado_em: '2026-09-28T18:00:00', fechado_em: '2026-09-28T18:00:00',
  turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
  conferencia: [
    { oid: 31, forma: 1, calculado: '58.00', informado: '20.00' },
    { oid: 32, forma: 5, calculado: '77.00', informado: null },
  ],
})

// Pedido com troco (como o 116): dinheiro positivo e o troco negativo.
const pedidoComTroco = documento(187, 116, {
  itens: [{ oid: 1874, produto: 2138, quantidade: '1.000000', valor_liquido: '45.00', vendedor: 1 }],
  pagamentos: [{ oid: 2, forma: 1, valor: '50.00' }, { oid: 3, forma: 1, valor: '-5.00' }],
})

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.cliente.query('delete from kaizen.documento')
})

async function carregar(...partes: DocumentoErp[][]): Promise<CargaDocumentos> {
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', partes.map((p) => JSON.stringify(p)))
    return gravarDocumentos(banco.cliente)
  })
}

async function linhas(sql: string): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql)).rows
}

test('grava documento com itens, pagamentos, parcelas com baixas e conferência', async () => {
  assert.deepEqual(await carregar([devolucao, fechamento]), { lidos: 2, novos: 2 })

  assert.deepEqual(await linhas(
    `select fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em, fechado_em,
            pessoa, turno_caixa, turno_usuario, turno_numero
       from kaizen.documento order by origem_id`,
  ), [
    {
      fonte: 'meuerp', origem_tabela: 'documento', origem_id: '185', codigo: '63', modelo: 'TM', status: 'E',
      movimento: 'E', financeiro: 'P', criado_em: '2026-09-28 15:30:00', fechado_em: '2026-09-28 15:30:00',
      pessoa: '999007', turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
    },
    {
      fonte: 'meuerp', origem_tabela: 'documento', origem_id: '186', codigo: '98', modelo: 'FC', status: 'E',
      movimento: 'N', financeiro: 'N', criado_em: '2026-09-28 18:00:00', fechado_em: '2026-09-28 18:00:00',
      pessoa: null, turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
    },
  ])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
       from kaizen.documento_item i join kaizen.documento d on d.id = i.documento_id`,
  ), [{
    documento: '185', origem_tabela: 'documento_mercadoria', origem_id: '1873', sentido: 'E', produto: '1362',
    quantidade: '1.000000', valor_liquido: '18.00', vendedor: '1',
  }])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, p.origem_tabela, p.origem_id, p.forma, p.valor
       from kaizen.documento_pagamento p join kaizen.documento d on d.id = p.documento_id`,
  ), [{ documento: '185', origem_tabela: 'documento_pagamento', origem_id: '1', forma: '1', valor: '18.00' }])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, p.origem_tabela, p.origem_id, p.lancado_em, p.vencimento, p.valor, p.status, p.descricao
       from kaizen.parcela p join kaizen.documento d on d.id = p.documento_id`,
  ), [{
    documento: '185', origem_tabela: 'documento_parcela', origem_id: '1', lancado_em: '2026-09-28',
    vencimento: '2026-09-28', valor: '18.00', status: 'B', descricao: 'Troca de Mercadoria - Retirada',
  }])

  assert.deepEqual(await linhas(
    `select p.origem_id as parcela, b.origem_tabela, b.origem_id, b.pago_em, b.valor, b.forma, b.status
       from kaizen.baixa b join kaizen.parcela p on p.id = b.parcela_id`,
  ), [{
    parcela: '1', origem_tabela: 'documento_parcela_pagamento', origem_id: '1', pago_em: '2026-09-28',
    valor: '18.00', forma: '1', status: 'E',
  }])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, c.origem_tabela, c.origem_id, c.forma, c.calculado, c.informado
       from kaizen.conferencia_caixa c join kaizen.documento d on d.id = c.documento_id order by c.origem_id`,
  ), [
    { documento: '186', origem_tabela: 'documento_conferencia_caixa', origem_id: '31', forma: '1', calculado: '58.00', informado: '20.00' },
    { documento: '186', origem_tabela: 'documento_conferencia_caixa', origem_id: '32', forma: '5', calculado: '77.00', informado: null },
  ])
})

test('zero vira vazio no vendedor e nos turnos', async () => {
  await carregar([documento(185, 54, {
    turno_caixa: 0, turno_usuario: 0, turno_numero: 0,
    itens: [
      { oid: 1873, produto: 60, quantidade: '1.000000', valor_liquido: '77.00', vendedor: 0 },
      { oid: 1874, produto: 61, quantidade: '1.000000', valor_liquido: '10.00', vendedor: null },
      { oid: 1875, produto: 62, quantidade: '1.000000', valor_liquido: '10.00', vendedor: 999005 },
    ],
  })])
  assert.deepEqual(
    await linhas('select turno_caixa, turno_usuario, turno_numero from kaizen.documento'),
    [{ turno_caixa: null, turno_usuario: null, turno_numero: null }],
  )
  assert.deepEqual(
    await linhas('select origem_id, vendedor from kaizen.documento_item order by origem_id'),
    [{ origem_id: '1873', vendedor: null }, { origem_id: '1874', vendedor: null }, { origem_id: '1875', vendedor: '999005' }],
  )
})

test('datas com e sem fração de segundo: parcela e baixa viram date, e o horário do documento não se desloca', async () => {
  // Dentro do JSON o ERP escreve a fração só quando ela existe: '...T11:05:03', '...T11:00:00.5', '...T23:59:59.999999'.
  await carregar([
    documento(185, 5, {
      modelo: 'CP', movimento: 'N', financeiro: 'P',
      criado_em: '2026-09-28T23:59:59.999999', fechado_em: null,
      parcelas: [{
        oid: 1, lancado_em: '2026-04-15T10:20:30', vencimento: '2026-10-05T00:00:00', valor: '1500.00',
        status: 'B', descricao: 'aluguel',
        baixas: [{ oid: 1, pago_em: '2026-09-29T23:59:59.999999', valor: '1500.00', forma: 2, status: 'E' }],
      }, {
        oid: 2, lancado_em: '2026-04-15T10:20:30.5', vencimento: null, valor: '10.00',
        status: 'P', descricao: null, baixas: [],
      }],
    }),
    documento(186, 6, { criado_em: '2026-09-28T11:00:00.5', fechado_em: '2026-09-28T11:05:03' }),
  ])
  assert.deepEqual(
    await linhas('select origem_id, criado_em, fechado_em from kaizen.documento order by origem_id'),
    [
      { origem_id: '185', criado_em: '2026-09-28 23:59:59.999999', fechado_em: null },
      { origem_id: '186', criado_em: '2026-09-28 11:00:00.5', fechado_em: '2026-09-28 11:05:03' },
    ],
  )
  assert.deepEqual(
    await linhas('select origem_id, lancado_em, vencimento from kaizen.parcela order by origem_id'),
    [
      { origem_id: '1', lancado_em: '2026-04-15', vencimento: '2026-10-05' },
      { origem_id: '2', lancado_em: '2026-04-15', vencimento: null },
    ],
  )
  assert.deepEqual(await linhas('select pago_em from kaizen.baixa'), [{ pago_em: '2026-09-29' }])
})

test('cada baixa fica ligada à sua parcela', async () => {
  const baixa = (oid: number): BaixaErp => ({ oid, pago_em: '2026-09-30T09:00:00', valor: '100.00', forma: 1, status: 'E' })
  const parcela = (oid: number, baixas: BaixaErp[]): ParcelaErp => ({
    oid, lancado_em: '2026-09-01T00:00:00', vencimento: '2026-09-30T00:00:00', valor: '100.00',
    status: 'B', descricao: null, baixas,
  })
  await carregar([
    documento(185, 5, { modelo: 'CP', movimento: 'N', financeiro: 'P', parcelas: [parcela(10, [baixa(20)]), parcela(11, [baixa(21), baixa(22)])] }),
    documento(186, 6, { modelo: 'CP', movimento: 'N', financeiro: 'P', parcelas: [parcela(12, [baixa(23)])] }),
  ])
  assert.deepEqual(await linhas(
    `select d.origem_id as documento, p.origem_id as parcela, b.origem_id as baixa
       from kaizen.baixa b
       join kaizen.parcela p on p.id = b.parcela_id
       join kaizen.documento d on d.id = p.documento_id
      order by b.origem_id`,
  ), [
    { documento: '185', parcela: '10', baixa: '20' },
    { documento: '185', parcela: '11', baixa: '21' },
    { documento: '185', parcela: '11', baixa: '22' },
    { documento: '186', parcela: '12', baixa: '23' },
  ])
})

test('reler o documento com um item a menos, outro pagamento e a baixa estornada troca os filhos inteiros', async () => {
  const parcela = (status: string, baixas: BaixaErp[]): ParcelaErp => ({
    oid: 50, lancado_em: '2026-09-28T15:09:00', vencimento: '2026-09-28T00:00:00', valor: '144.00',
    status, descricao: null, baixas,
  })
  await carregar([documento(185, 58, {
    itens: [
      { oid: 1900, produto: 2138, quantidade: '1.000000', valor_liquido: '119.00', vendedor: 1 },
      { oid: 1901, produto: 5278, quantidade: '1.000000', valor_liquido: '25.00', vendedor: 1 },
    ],
    pagamentos: [{ oid: 40, forma: 1, valor: '144.00' }],
    parcelas: [parcela('B', [{ oid: 60, pago_em: '2026-09-28T15:48:00', valor: '144.00', forma: 1, status: 'E' }])],
  })])
  await carregar([documento(185, 58, {
    itens: [{ oid: 1900, produto: 2138, quantidade: '1.000000', valor_liquido: '119.00', vendedor: 1 }],
    pagamentos: [{ oid: 41, forma: 2, valor: '119.00' }],
    parcelas: [parcela('P', [])],
  })])
  assert.deepEqual(await linhas('select origem_id, produto from kaizen.documento_item'), [{ origem_id: '1900', produto: '2138' }])
  assert.deepEqual(await linhas('select origem_id, forma, valor from kaizen.documento_pagamento'), [{ origem_id: '41', forma: '2', valor: '119.00' }])
  assert.deepEqual(await linhas('select origem_id, status from kaizen.parcela'), [{ origem_id: '50', status: 'P' }])
  assert.deepEqual(await linhas('select count(*) as quantas from kaizen.baixa'), [{ quantas: '0' }])
})

test('na releitura, visto_em e o id do documento não mudam, e o documento não conta como novo', async () => {
  assert.deepEqual(await carregar([pedidoComTroco]), { lidos: 1, novos: 1 })
  const [antes] = await linhas('select id, visto_em from kaizen.documento')
  // venda cancelada depois de lida: o mesmo oid volta com outro status
  assert.deepEqual(await carregar([{ ...pedidoComTroco, status: 'C' }]), { lidos: 1, novos: 0 })
  const [depois] = await linhas('select id, visto_em, status from kaizen.documento')
  assert.deepEqual(depois, { id: antes.id, visto_em: antes.visto_em, status: 'C' })
})

test('rodar duas vezes com o mesmo ERP deixa o mesmo conteúdo', async () => {
  const tabelas = ['documento', 'documento_item', 'documento_pagamento', 'parcela', 'baixa', 'conferencia_caixa']
  async function foto(): Promise<Record<string, string[]>> {
    const resultado: Record<string, string[]> = {}
    for (const tabela of tabelas) {
      const r = await banco.cliente.query<{ linha: string }>(
        `select (to_jsonb(x) - 'id' - 'parcela_id' - 'lido_em')::text as linha from kaizen.${tabela} x order by 1`,
      )
      resultado[tabela] = r.rows.map((l) => l.linha)
    }
    return resultado
  }
  await carregar([devolucao, fechamento, pedidoComTroco])
  const primeira = await foto()
  await carregar([devolucao, fechamento, pedidoComTroco])
  const segunda = await foto()
  assert.equal(primeira.documento.length, 3)
  assert.equal(primeira.documento_pagamento.length, 3)
  assert.equal(primeira.baixa.length, 1)
  assert.deepEqual(segunda, primeira)
})

test('o mesmo oid em duas partes vira um documento só, com a leitura da última parte', async () => {
  const rascunho = documento(185, 70, {
    status: 'R',
    itens: [{ oid: 1873, produto: 60, quantidade: '1.000000', valor_liquido: '10.00', vendedor: 1 }],
  })
  const emitido = documento(185, 70, {
    status: 'E',
    itens: [
      { oid: 1873, produto: 60, quantidade: '1.000000', valor_liquido: '10.00', vendedor: 1 },
      { oid: 1874, produto: 61, quantidade: '2.000000', valor_liquido: '20.00', vendedor: 1 },
    ],
  })
  assert.deepEqual(await carregar([rascunho], [emitido, pedidoComTroco]), { lidos: 2, novos: 2 })
  assert.deepEqual(await linhas('select origem_id, status from kaizen.documento order by origem_id'), [
    { origem_id: '185', status: 'E' },
    { origem_id: '187', status: 'E' },
  ])
  assert.deepEqual(await linhas(
    `select count(*) as itens from kaizen.documento_item i join kaizen.documento d on d.id = i.documento_id where d.origem_id = '185'`,
  ), [{ itens: '2' }])
})

test('documento com as listas vazias grava só o cabeçalho', async () => {
  assert.deepEqual(await carregar([documento(185, 84, { modelo: 'LP', movimento: 'N', financeiro: 'N' })]), { lidos: 1, novos: 1 })
  assert.deepEqual(await linhas(
    `select (select count(*) from kaizen.documento) as documentos,
            (select count(*) from kaizen.documento_item) as itens,
            (select count(*) from kaizen.documento_pagamento) as pagamentos,
            (select count(*) from kaizen.parcela) as parcelas,
            (select count(*) from kaizen.baixa) as baixas,
            (select count(*) from kaizen.conferencia_caixa) as conferencias`,
  ), [{ documentos: '1', itens: '0', pagamentos: '0', parcelas: '0', baixas: '0', conferencias: '0' }])
})

test('item sem quantidade e sem valor (ajuste de custo AC) e item sem valor (ajuste de estoque AS) gravam', async () => {
  await carregar([
    documento(185, 94, {
      modelo: 'AC', movimento: 'N', financeiro: 'N', turno_caixa: null, turno_usuario: null, turno_numero: null,
      itens: [{ oid: 1873, produto: 60, quantidade: null, valor_liquido: null, vendedor: null }],
    }),
    documento(186, 138, {
      modelo: 'AS', movimento: 'E', financeiro: 'N', turno_caixa: null, turno_usuario: null, turno_numero: null,
      itens: [{ oid: 1874, produto: 61, quantidade: '2.000000', valor_liquido: null, vendedor: null }],
    }),
  ])
  assert.deepEqual(await linhas('select origem_id, sentido, produto, quantidade, valor_liquido, vendedor from kaizen.documento_item order by origem_id'), [
    { origem_id: '1873', sentido: 'N', produto: '60', quantidade: null, valor_liquido: null, vendedor: null },
    { origem_id: '1874', sentido: 'E', produto: '61', quantidade: '2.000000', valor_liquido: null, vendedor: null },
  ])
})

test('valores com 6 casas e acima de 2^53 ficam exatos', async () => {
  await carregar([documento(185, 200, {
    itens: [{ oid: 1873, produto: 60, quantidade: '0.123456', valor_liquido: '12345678901234.123456', vendedor: 1 }],
    pagamentos: [{ oid: 1, forma: 1, valor: '-0.000001' }],
    conferencia: [{ oid: 31, forma: 1, calculado: '99999999.999999', informado: '0.000000' }],
  })])
  assert.deepEqual(await linhas('select quantidade, valor_liquido from kaizen.documento_item'), [
    { quantidade: '0.123456', valor_liquido: '12345678901234.123456' },
  ])
  assert.deepEqual(await linhas('select valor from kaizen.documento_pagamento'), [{ valor: '-0.000001' }])
  assert.deepEqual(await linhas('select calculado, informado from kaizen.conferencia_caixa'), [
    { calculado: '99999999.999999', informado: '0.000000' },
  ])
})
```

- [ ] **Passo 6: Rodar e ver falhar**

Run: `node --test tradutor/carga.test.mts`

Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\carga.mts' imported from <repositório>\tradutor\carga.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 7: Criar `sql/carga/entrada.sql`**

Uma linha, exatamente como no contrato:

```sql
create temp table if not exists entrada (assunto text not null, parte integer not null, dados jsonb not null, primary key (assunto, parte)) on commit drop;
```

- [ ] **Passo 8: Criar `sql/carga/documentos.sql`**

Vários comandos, rodados de uma vez sem parâmetro; o último é o `select` do resumo:

```sql
drop table if exists pg_temp.doc_lido;

-- o mesmo oid em duas partes vira uma linha só; vale a parte de número maior
create temp table doc_lido on commit drop as
select distinct on (e->>'oid') e->>'oid' as origem_id, e as j
from pg_temp.entrada x, jsonb_array_elements(x.dados) e
where x.assunto = 'documentos'
order by e->>'oid', x.parte desc;

insert into kaizen.documento (
  fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro,
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero
)
select
  'meuerp', 'documento', l.origem_id,
  l.j->>'codigo', l.j->>'modelo', l.j->>'status', l.j->>'movimento', l.j->>'financeiro',
  (l.j->>'criado_em')::timestamp, (l.j->>'fechado_em')::timestamp, l.j->>'pessoa',
  nullif((l.j->>'turno_caixa')::integer, 0),
  nullif((l.j->>'turno_usuario')::integer, 0),
  nullif((l.j->>'turno_numero')::integer, 0)
from pg_temp.doc_lido l
order by l.origem_id::bigint
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

drop table if exists pg_temp.doc_alvo;

create temp table doc_alvo on commit drop as
select d.id as documento_id, l.origem_id, l.j
from pg_temp.doc_lido l
join kaizen.documento d
  on d.fonte = 'meuerp' and d.origem_tabela = 'documento' and d.origem_id = l.origem_id;

-- os filhos são trocados por inteiro: o que sumiu do documento no ERP sai daqui (a baixa vai junto com a parcela)
delete from kaizen.documento_item where documento_id in (select documento_id from pg_temp.doc_alvo);
delete from kaizen.documento_pagamento where documento_id in (select documento_id from pg_temp.doc_alvo);
delete from kaizen.parcela where documento_id in (select documento_id from pg_temp.doc_alvo);
delete from kaizen.conferencia_caixa where documento_id in (select documento_id from pg_temp.doc_alvo);

insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  a.documento_id, 'documento_mercadoria', i->>'oid', a.j->>'movimento', i->>'produto',
  (i->>'quantidade')::numeric, (i->>'valor_liquido')::numeric, nullif(i->>'vendedor', '0')
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'itens') i;

insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
select a.documento_id, 'documento_pagamento', p->>'oid', p->>'forma', (p->>'valor')::numeric
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'pagamentos') p;

insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao)
select
  a.documento_id, 'documento_parcela', p->>'oid',
  left(p->>'lancado_em', 10)::date, left(p->>'vencimento', 10)::date,
  (p->>'valor')::numeric, p->>'status', p->>'descricao'
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'parcelas') p;

insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
select
  pa.id, 'documento_parcela_pagamento', b->>'oid',
  left(b->>'pago_em', 10)::date, (b->>'valor')::numeric, b->>'forma', b->>'status'
from pg_temp.doc_alvo a
cross join jsonb_array_elements(a.j->'parcelas') p
cross join jsonb_array_elements(p->'baixas') b
join kaizen.parcela pa
  on pa.documento_id = a.documento_id
 and pa.origem_tabela = 'documento_parcela'
 and pa.origem_id = p->>'oid';

insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
select
  a.documento_id, 'documento_conferencia_caixa', c->>'oid', c->>'forma',
  (c->>'calculado')::numeric, (c->>'informado')::numeric
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'conferencia') c;

-- visto_em só é gravado na primeira vez, com o now() (início) desta transação
select count(*) as lidos, count(*) filter (where d.visto_em = now()) as novos
from pg_temp.doc_alvo a
join kaizen.documento d on d.id = a.documento_id;
```

- [ ] **Passo 9: Criar `tradutor/carga.mts`**

```ts
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import type { Cliente } from './banco.mts'

function lerCarga(nome: string): string {
  return readFileSync(new URL(`../sql/carga/${nome}.sql`, import.meta.url), 'utf8')
}

// Os arquivos de sql/carga têm vários comandos; o pg devolve um resultado por comando, e o resumo é o do último.
async function rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>> {
  const resultado = (await cliente.query(lerCarga(nome))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export async function colocarEntrada(
  cliente: Cliente,
  assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros',
  partes: string[],
): Promise<void> {
  await cliente.query(lerCarga('entrada'))
  for (const [i, parte] of partes.entries()) {
    // o texto do ERP vai inteiro ao Postgres, que o lê como jsonb: nenhum valor vira número do JavaScript
    await cliente.query(
      'insert into pg_temp.entrada (assunto, parte, dados) values ($1, $2, $3::jsonb)',
      [assunto, i + 1, parte],
    )
  }
}

export type CargaDocumentos = { lidos: number; novos: number }

export async function gravarDocumentos(cliente: Cliente): Promise<CargaDocumentos> {
  const [resumo] = await rodarCarga(cliente, 'documentos')
  return { lidos: Number(resumo.lidos), novos: Number(resumo.novos) }
}
```

- [ ] **Passo 10: Rodar e ver passar**

Run: `node --test tradutor/carga.test.mts`

Expected: PASS, 11 testes:
```
✔ grava documento com itens, pagamentos, parcelas com baixas e conferência
✔ zero vira vazio no vendedor e nos turnos
✔ datas com e sem fração de segundo: parcela e baixa viram date, e o horário do documento não se desloca
✔ cada baixa fica ligada à sua parcela
✔ reler o documento com um item a menos, outro pagamento e a baixa estornada troca os filhos inteiros
✔ na releitura, visto_em e o id do documento não mudam, e o documento não conta como novo
✔ rodar duas vezes com o mesmo ERP deixa o mesmo conteúdo
✔ o mesmo oid em duas partes vira um documento só, com a leitura da última parte
✔ documento com as listas vazias grava só o cabeçalho
✔ item sem quantidade e sem valor (ajuste de custo AC) e item sem valor (ajuste de estoque AS) gravam
✔ valores com 6 casas e acima de 2^53 ficam exatos
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Se algum falhar, não mude o teste: ele descreve o que a spec pede (seções 5.1, 5.2 e 6.3, passo 10).

- [ ] **Passo 11: Atualizar `testes-esperados.txt` (N = 17: 6 em `kaizen.test.mts` e 11 em `carga.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+17;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 17.

- [ ] **Passo 12: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 13: Commit**

```bash
git add tradutor/kaizen.mts tradutor/kaizen.test.mts sql/carga/entrada.sql sql/carga/documentos.sql tradutor/carga.mts tradutor/carga.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Carga dos documentos do ERP no Kaizen

O Kaizen agora grava os documentos lidos do ERP com os itens, os
pagamentos, as parcelas com as baixas e a conferência do caixa. Reler
um documento troca os filhos por inteiro: um item que saiu do pedido
no ERP sai daqui, e uma baixa estornada some. A hora em que o Kaizen
viu o documento pela primeira vez não muda na releitura, e rodar duas
vezes com o mesmo ERP deixa exatamente o mesmo conteúdo. Vendedor e
turno zero viram vazio; valores com 6 casas, e maiores que o limite
dos números do JavaScript, ficam exatos.

Também ficam prontas as consultas ao Kaizen que a leitura de hora em
hora usa: os cortes da virada, o maior número já visto (comparado
como número: 1000 é maior que 999) e os documentos com parcela em
aberto.

17 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 9: Carga de apagados, estoque e cadastros

**O que esta tarefa entrega, em resultado:**
- Documento do ERP novo que sumiu do ERP sai do Kaizen com os filhos (itens, pagamentos, parcelas, baixas, conferência) e volta para o aviso com número, tipo em palavras, data, valor em 2 casas e o nome do vendedor. Os movimentos de estoque ficam. Só se compara documento da fonte `meuerp`, e documento lido nesta execução nunca sai.
- A proteção contra uma lista de vivos errada: com 20 ou mais documentos do ERP novo no Kaizen, lista vazia ou com menos da metade é recusada; abaixo de 20, só a lista vazia (e só se o Kaizen já tiver algum); com o Kaizen vazio, lista vazia é normal.
- Estoque: os movimentos são gravados e atualizados sem perder a hora em que foram vistos; a foto do ERP novo é trocada inteira; na leitura completa (noite), o movimento que sumiu do ERP sai e é devolvido para o aviso.
- Cadastros: nome e sobrenome juntos, sem espaço sobrando; ativo quando a bandeira de inativo não é `T` (vazia conta como ativo); quem não veio na leitura fica como estava; `produto_fornecedor` do ERP novo trocada inteira; custo vazio fica vazio, não zero.

**Antes de começar:** o Postgres local precisa estar de pé (`docker compose up -d`, tarefa 1). A tarefa 8 precisa estar feita (`tradutor/carga.mts`, `sql/carga/entrada.sql`, `sql/carga/documentos.sql`).

**Arquivos:**
- Criar: `sql/carga/apagar.sql`
- Criar: `sql/carga/estoque.sql`
- Criar: `sql/carga/cadastros.sql`
- Modificar: `tradutor/carga.mts` (acrescentar no fim, depois de `gravarDocumentos`)
- Testar: `tradutor/carga-estado.test.mts`
- Modificar: `testes-esperados.txt` (soma 11)

**Interfaces:**
- Consome:
  - `tradutor/banco.mts` (tarefa 1): `export type Cliente = pg.Client`; `export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>`. Com os parsers da tarefa 1, `numeric`, `bigint`, `count(*)`, `timestamp`, `timestamptz` e `date` chegam como **texto**; `integer` chega como número; `boolean` como `true`/`false`; `jsonb` já como objeto.
  - `tradutor/apoio-teste.mts` (tarefa 2): `export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }`; `export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>`.
  - Tabelas da tarefa 2: `kaizen.documento` e filhos (com `on delete cascade`), `kaizen.estoque_movimento`, `kaizen.estoque_atual`, `kaizen.produto`, `kaizen.produto_fornecedor`, `kaizen.pessoa`, `kaizen.funcionario`, `kaizen.traducao` (campo `tipo`: PA pedido, FC fechamento_caixa, TM troca, e os demais da migração `002_traducao.sql`).
  - `tradutor/carga.mts` (tarefa 8), já no arquivo que esta tarefa modifica:
    - `export async function colocarEntrada(cliente: Cliente, assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros', partes: string[]): Promise<void>` — cria `pg_temp.entrada (assunto, parte, dados jsonb)` e insere as partes, numeradas a partir de 1.
    - `export async function gravarDocumentos(cliente: Cliente): Promise<CargaDocumentos>` — grava os documentos e deixa `pg_temp.doc_lido (origem_id text, j jsonb)` com os documentos lidos nesta transação.
    - Internas, não exportadas: `lerCarga(nome: string): string` e `rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>>` (roda `sql/carga/<nome>.sql` inteiro e devolve as linhas do último comando). O código novo usa `rodarCarga`; não precisa de import novo.
  - Formatos que vêm do ERP (contrato, seção 6), montados à mão nos testes:
    - vivos: array de inteiros, os `oid` de documento acima do corte (`[185, 186]`);
    - estoque: `{ "movimentos": [ { "oid": int, "produto": int, "documento": int|null, "momento": ts, "saldo_antes": str|null, "saldo_depois": str|null } ], "foto": [ { "produto": int, "quantidade": str|null } ] }`;
    - cadastros: `{ "produtos": [ { "codigo", "descricao", "grupo", "secao", "subgrupo", "marca", "custo", "inativo" } ], "pessoas": [ { "codigo", "nome", "sobrenome", "cpf_cnpj", "bairro", "municipio", "ibge", "uf", "inativo" } ], "funcionarios": [ { "codigo", "nome", "sobrenome", "usuario", "tipo", "inativo" } ], "fornecedores": [ { "produto", "fornecedor" } ] }` — `codigo`, `ibge`, `usuario`, `produto` e `fornecedor` inteiros; `custo` em texto; o resto texto ou `null`;
    - documentos: o DocumentoErp da tarefa 8 (repetido como tipo no teste abaixo);
    - `ts` (em `momento` e nas datas do DocumentoErp) é o texto que o Postgres do ERP escreve dentro do JSON: `AAAA-MM-DDTHH:MM:SS`, com a fração de segundo só quando ela existe (ex.: `2026-09-28T14:05:03`, `2026-09-28T14:00:03.123456`), sem fuso. `estoque.sql` o converte com `::timestamp`, que aceita as duas formas.
- Produz (acrescentado a `tradutor/carga.mts`; a tarefa 13 usa estes nomes):
  - `export type Apagado = { origem_id: string; codigo: string; tipo: string | null; criado_em: string; valor: string; vendedores: string | null }`
  - `export function podeApagar(noKaizen: number, vivos: number): { ok: true } | { ok: false; motivo: string }` — o motivo é sempre `'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'`.
  - `export async function apagarSumidos(cliente: Cliente): Promise<Apagado[]>` — usa a entrada `'vivos'` e `pg_temp.doc_lido` (portanto roda depois de `gravarDocumentos`, na mesma transação); devolve em ordem de `oid`.
  - `export type CargaEstoque = { movimentos: number; foto: number; sumidos: Array<{ origem_id: string; produto: string }> }`
  - `export async function gravarEstoque(cliente: Cliente, completo: boolean): Promise<CargaEstoque>` — `movimentos` = movimentos lidos; `foto` = linhas da foto do ERP novo depois da troca; `sumidos` só com `completo = true`.
  - `export type CargaCadastros = { produtos: number; pessoas: number; funcionarios: number; fornecedores: number }`
  - `export async function gravarCadastros(cliente: Cliente): Promise<CargaCadastros>` — contagens do que veio nesta leitura (fornecedores: ligações do ERP novo gravadas).

**Por que o código é assim (para não "consertar" sem querer):**
- Tudo roda dentro da transação do chamador (`emTransacao`); as tabelas de trabalho (`vivo`, `movimento_lido`, `parametro`) são `on commit drop`, e os `drop table if exists` levam `pg_temp.` na frente porque o `search_path` do usuário `kaizen` começa pelo esquema `kaizen`.
- `apagar.sql` monta o resumo e apaga no mesmo comando (um `with` em que `apagados` é um `delete` com `returning`): o resumo lê os itens antes de a cascata levar os filhos. `vendedores` usa o nome do funcionário do ERP novo e, sem cadastro, o código cru.
- `gravarEstoque` passa o marcador da leitura completa por uma tabela temporária `parametro (completo boolean)`, criada antes de rodar o arquivo, porque os arquivos de `sql/carga/` rodam sem parâmetro.
- O limiar 20 fica numa constante local de `carga.mts` porque `tradutor/constantes.mts` só nasce na tarefa 10, e a tarefa 10 troca essa constante pelo import de `constantes.mts`.
- Em cadastros, `nome` é `nullif(btrim(concat_ws(' ', nullif(btrim(nome),''), nullif(btrim(sobrenome),''))), '')`: sem nome e sem sobrenome fica vazio (e não texto vazio), para o aviso de apagado cair no código do vendedor.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `tradutor/carga-estado.test.mts`. Os nomes de pessoa e de funcionário são inventados:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { emTransacao } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos, podeApagar, apagarSumidos, gravarEstoque, gravarCadastros } from './carga.mts'
import type { Apagado, CargaEstoque, CargaCadastros } from './carga.mts'

// Formatos do contrato (seção 6): inteiros crus, valores em texto, datas como o ERP escreve dentro do JSON.
type ItemErp = { oid: number; produto: number; quantidade: string | null; valor_liquido: string | null; vendedor: number | null }
type PagamentoErp = { oid: number; forma: number; valor: string }
type BaixaErp = { oid: number; pago_em: string | null; valor: string; forma: number | null; status: string | null }
type ParcelaErp = {
  oid: number; lancado_em: string | null; vencimento: string | null; valor: string
  status: string | null; descricao: string | null; baixas: BaixaErp[]
}
type ConferenciaErp = { oid: number; forma: number; calculado: string | null; informado: string | null }
type DocumentoErp = {
  oid: number; codigo: number; modelo: string; status: string | null; movimento: string | null; financeiro: string | null
  criado_em: string; fechado_em: string | null; pessoa: number | null
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null
  itens: ItemErp[]; pagamentos: PagamentoErp[]; parcelas: ParcelaErp[]; conferencia: ConferenciaErp[]
  conferencia_abaixo_corte: number
}
type MovimentoErp = {
  oid: number; produto: number; documento: number | null; momento: string
  saldo_antes: string | null; saldo_depois: string | null
}
type FotoErp = { produto: number; quantidade: string | null }
type ProdutoErp = {
  codigo: number; descricao: string | null; grupo: string | null; secao: string | null; subgrupo: string | null
  marca: string | null; custo: string | null; inativo: string | null
}
type PessoaErp = {
  codigo: number; nome: string | null; sobrenome: string | null; cpf_cnpj: string | null; bairro: string | null
  municipio: string | null; ibge: number | null; uf: string | null; inativo: string | null
}
type FuncionarioErp = { codigo: number; nome: string | null; sobrenome: string | null; usuario: number | null; tipo: string | null; inativo: string | null }
type FornecedorErp = { produto: number; fornecedor: number }
type CadastrosErp = { produtos: ProdutoErp[]; pessoas: PessoaErp[]; funcionarios: FuncionarioErp[]; fornecedores: FornecedorErp[] }

function documento(oid: number, codigo: number, resto: Partial<DocumentoErp> = {}): DocumentoErp {
  return {
    oid, codigo, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29T10:15:00', fechado_em: '2026-09-29T10:20:00', pessoa: 999007,
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 1,
    itens: [], pagamentos: [], parcelas: [], conferencia: [], conferencia_abaixo_corte: 0,
    ...resto,
  }
}

function item(oid: number, produto: number, valor: string, vendedor: number | null): ItemErp {
  return { oid, produto, quantidade: '1.000000', valor_liquido: valor, vendedor }
}

function movimento(oid: number, produto: number, saldoAntes: string, saldoDepois: string): MovimentoErp {
  return { oid, produto, documento: 116, momento: '2026-09-28T14:00:03.123456', saldo_antes: saldoAntes, saldo_depois: saldoDepois }
}

function produto(codigo: number, resto: Partial<ProdutoErp> = {}): ProdutoErp {
  return {
    codigo, descricao: 'CANECA', grupo: 'CASA', secao: 'COZINHA', subgrupo: 'LOUCA', marca: 'SEM MARCA',
    custo: '12.345600', inativo: 'F', ...resto,
  }
}

function pessoa(codigo: number, resto: Partial<PessoaErp> = {}): PessoaErp {
  return {
    codigo, nome: 'CLIENTE', sobrenome: 'TESTE', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null,
    inativo: 'F', ...resto,
  }
}

function funcionario(codigo: number, resto: Partial<FuncionarioErp> = {}): FuncionarioErp {
  return { codigo, nome: 'Ana', sobrenome: 'Teste', usuario: 18152, tipo: 'V', inativo: 'F', ...resto }
}

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  for (const tabela of ['documento', 'estoque_movimento', 'estoque_atual', 'produto', 'produto_fornecedor', 'pessoa', 'funcionario']) {
    await banco.cliente.query(`delete from kaizen.${tabela}`)
  }
})

async function linhas(sql: string, valores: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, valores)).rows
}

async function carregarDocumentos(docs: DocumentoErp[]): Promise<void> {
  await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify(docs)])
    await gravarDocumentos(banco.cliente)
  })
}

async function lerEApagar(docs: DocumentoErp[], vivos: number[]): Promise<Apagado[]> {
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify(docs)])
    await colocarEntrada(banco.cliente, 'vivos', [JSON.stringify(vivos)])
    await gravarDocumentos(banco.cliente)
    return apagarSumidos(banco.cliente)
  })
}

async function carregarEstoque(movimentos: MovimentoErp[], foto: FotoErp[], completo: boolean): Promise<CargaEstoque> {
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'estoque', [JSON.stringify({ movimentos, foto })])
    return gravarEstoque(banco.cliente, completo)
  })
}

async function carregarCadastros(cadastros: Partial<CadastrosErp>): Promise<CargaCadastros> {
  const completo: CadastrosErp = { produtos: [], pessoas: [], funcionarios: [], fornecedores: [], ...cadastros }
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'cadastros', [JSON.stringify(completo)])
    return gravarCadastros(banco.cliente)
  })
}

test('podeApagar só recusa lista vazia, ou menor que a metade com 20 ou mais documentos no Kaizen', () => {
  const recusa = { ok: false, motivo: 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado' }
  const casos: Array<[number, number, boolean]> = [
    [0, 0, true],
    [0, 5, true],
    [3, 1, true],
    [3, 0, false],
    [19, 1, true],
    [20, 10, true],
    [20, 9, false],
    [25, 13, true],
    [25, 12, false],
    [25, 0, false],
  ]
  for (const [noKaizen, vivos, pode] of casos) {
    assert.deepEqual(podeApagar(noKaizen, vivos), pode ? { ok: true } : recusa, `${noKaizen} no Kaizen e ${vivos} vivos`)
  }
})

test('apagarSumidos apaga só o documento do ERP novo que sumiu e devolve o que o aviso precisa', async () => {
  await carregarDocumentos([
    documento(185, 123, {
      itens: [item(1873, 2138, '100.000000', 1), item(1874, 5278, '25.000000', 1), item(1875, 60, '25.004999', 999005)],
    }),
    documento(186, 124, { itens: [item(1876, 60, '10.00', 1)], pagamentos: [{ oid: 1, forma: 2, valor: '10.00' }] }),
    documento(187, 125, { itens: [item(1877, 61, '12.00', 1)] }),
    documento(188, 98, {
      modelo: 'FC', movimento: 'N', financeiro: 'N', criado_em: '2026-09-29T18:00:00',
      conferencia: [{ oid: 31, forma: 1, calculado: '58.00', informado: '20.00' }],
    }),
    documento(189, 63, {
      modelo: 'TM', movimento: 'E', financeiro: 'P', criado_em: '2026-09-29T15:30:00',
      itens: [item(1878, 1362, '18.00', 777)],
      pagamentos: [{ oid: 2, forma: 1, valor: '18.00' }],
      parcelas: [{
        oid: 1, lancado_em: '2026-09-29T15:30:00', vencimento: '2026-09-29T00:00:00', valor: '18.00',
        status: 'B', descricao: null,
        baixas: [{ oid: 1, pago_em: '2026-09-29T15:30:00', valor: '18.00', forma: 1, status: 'E' }],
      }],
    }),
    documento(190, 140, { modelo: 'AM', movimento: 'N', financeiro: 'N', criado_em: '2026-09-29T16:00:00' }),
  ])
  await banco.cliente.query(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, criado_em)
     values ('link', 'negociacao', '185', '9001', 'V', '2026-04-10 10:00:00')`,
  )
  await banco.cliente.query(
    `insert into kaizen.funcionario (fonte, codigo, nome, ativo) values
       ('meuerp', '1', 'Ana Teste', true), ('meuerp', '999005', 'Bruno Teste', true), ('link', '777', 'Da Link', true)`,
  )
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento)
     values ('meuerp', 'mercadoria_estoque_historico', '1848', '2138', '123', '2026-09-29 10:15:00')`,
  )

  // 186 continua vivo no ERP; 187 não veio na lista, mas foi lido nesta execução
  const apagados = await lerEApagar([documento(187, 125, { itens: [item(1877, 61, '12.00', 1)] })], [186])

  assert.deepEqual(apagados, [
    { origem_id: '185', codigo: '123', tipo: 'pedido', criado_em: '2026-09-29 10:15:00', valor: '150.00', vendedores: 'Ana Teste, Bruno Teste' },
    { origem_id: '188', codigo: '98', tipo: 'fechamento_caixa', criado_em: '2026-09-29 18:00:00', valor: '0.00', vendedores: null },
    { origem_id: '189', codigo: '63', tipo: 'troca', criado_em: '2026-09-29 15:30:00', valor: '18.00', vendedores: '777' },
    { origem_id: '190', codigo: '140', tipo: null, criado_em: '2026-09-29 16:00:00', valor: '0.00', vendedores: null },
  ])
  assert.deepEqual(await linhas('select fonte, origem_id from kaizen.documento order by fonte, origem_id'), [
    { fonte: 'link', origem_id: '185' },
    { fonte: 'meuerp', origem_id: '186' },
    { fonte: 'meuerp', origem_id: '187' },
  ])
  assert.deepEqual(await linhas(
    `select (select count(*) from kaizen.documento_item) as itens,
            (select count(*) from kaizen.documento_pagamento) as pagamentos,
            (select count(*) from kaizen.parcela) as parcelas,
            (select count(*) from kaizen.baixa) as baixas,
            (select count(*) from kaizen.conferencia_caixa) as conferencias,
            (select count(*) from kaizen.estoque_movimento) as movimentos`,
  ), [{ itens: '2', pagamentos: '1', parcelas: '0', baixas: '0', conferencias: '0', movimentos: '1' }])
})

test('apagarSumidos não apaga nada quando todos continuam vivos', async () => {
  await carregarDocumentos([documento(185, 123), documento(186, 124)])
  assert.deepEqual(await lerEApagar([], [185, 186]), [])
  assert.deepEqual(await linhas('select count(*) as documentos from kaizen.documento'), [{ documentos: '2' }])
})

test('gravarEstoque grava os movimentos e, na releitura, atualiza sem mudar visto_em', async () => {
  assert.deepEqual(
    await carregarEstoque([movimento(1848, 60, '0.000000', '-1.000000'), movimento(1849, 2138, '0.000000', '-10.000000')], [], false),
    { movimentos: 2, foto: 0, sumidos: [] },
  )
  assert.deepEqual(await linhas(
    `select fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois
       from kaizen.estoque_movimento where origem_id = '1848'`,
  ), [{
    fonte: 'meuerp', origem_tabela: 'mercadoria_estoque_historico', origem_id: '1848', produto: '60', documento: '116',
    momento: '2026-09-28 14:00:03.123456', saldo_antes: '0.000000', saldo_depois: '-1.000000',
  }])
  const [antes] = await linhas(`select visto_em from kaizen.estoque_movimento where origem_id = '1848'`)

  assert.deepEqual(
    await carregarEstoque([movimento(1848, 60, '0.000000', '-2.000000'), movimento(1850, 60, '-2.000000', '-3.000000')], [], false),
    { movimentos: 2, foto: 0, sumidos: [] },
  )
  assert.deepEqual(await linhas('select origem_id, saldo_depois from kaizen.estoque_movimento order by origem_id'), [
    { origem_id: '1848', saldo_depois: '-2.000000' },
    { origem_id: '1849', saldo_depois: '-10.000000' },
    { origem_id: '1850', saldo_depois: '-3.000000' },
  ])
  const [depois] = await linhas(`select visto_em from kaizen.estoque_movimento where origem_id = '1848'`)
  assert.equal(depois.visto_em, antes.visto_em)
})

test('gravarEstoque troca inteira a foto do ERP novo e não mexe na da Link', async () => {
  await banco.cliente.query(`insert into kaizen.estoque_atual (fonte, produto, quantidade) values ('link', '60', 7)`)
  assert.deepEqual(
    await carregarEstoque([], [{ produto: 60, quantidade: '3.000000' }, { produto: 1362, quantidade: '1.000000' }], false),
    { movimentos: 0, foto: 2, sumidos: [] },
  )
  assert.deepEqual(
    await carregarEstoque([], [
      { produto: 60, quantidade: '2.000000' }, { produto: 2138, quantidade: '-10.000000' }, { produto: 5278, quantidade: null },
    ], false),
    { movimentos: 0, foto: 3, sumidos: [] },
  )
  assert.deepEqual(await linhas('select fonte, produto, quantidade from kaizen.estoque_atual order by fonte, produto'), [
    { fonte: 'link', produto: '60', quantidade: '7' },
    { fonte: 'meuerp', produto: '2138', quantidade: '-10.000000' },
    { fonte: 'meuerp', produto: '5278', quantidade: null },
    { fonte: 'meuerp', produto: '60', quantidade: '2.000000' },
  ])
})

test('na leitura completa, o movimento do ERP novo que não voltou sai e é devolvido', async () => {
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, momento)
     values ('link', 'mercadoria_estoque_historico', '1849', '60', '2026-09-28 10:00:00')`,
  )
  await carregarEstoque([
    movimento(1848, 60, '0.000000', '-1.000000'), movimento(1849, 2138, '0.000000', '-10.000000'), movimento(1850, 60, '-1.000000', '-2.000000'),
  ], [], false)
  assert.deepEqual(
    await carregarEstoque([movimento(1848, 60, '0.000000', '-1.000000'), movimento(1850, 60, '-1.000000', '-2.000000')], [], true),
    { movimentos: 2, foto: 0, sumidos: [{ origem_id: '1849', produto: '2138' }] },
  )
  assert.deepEqual(await linhas('select fonte, origem_id from kaizen.estoque_movimento order by fonte, origem_id'), [
    { fonte: 'link', origem_id: '1849' },
    { fonte: 'meuerp', origem_id: '1848' },
    { fonte: 'meuerp', origem_id: '1850' },
  ])
})

test('gravarCadastros junta nome e sobrenome sem espaço sobrando e grava o resto como veio', async () => {
  assert.deepEqual(await carregarCadastros({
    produtos: [produto(60)],
    pessoas: [
      pessoa(999007, { nome: 'CONSUMIDOR', sobrenome: 'FINAL' }),
      pessoa(10, { nome: '  Maria ', sobrenome: null, cpf_cnpj: '00000000000', bairro: 'Centro', municipio: 'Fortaleza', ibge: 2304400, uf: 'CE' }),
      pessoa(11, { nome: 'Loja Exemplo', sobrenome: '' }),
      pessoa(12, { nome: null, sobrenome: ' Souza ' }),
      pessoa(13, { nome: '', sobrenome: null }),
    ],
    funcionarios: [funcionario(1, { nome: 'Ana ', sobrenome: 'Teste' })],
    fornecedores: [{ produto: 60, fornecedor: 500 }],
  }), { produtos: 1, pessoas: 5, funcionarios: 1, fornecedores: 1 })

  assert.deepEqual(await linhas(
    'select codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf from kaizen.pessoa order by codigo::bigint',
  ), [
    { codigo: '10', nome: 'Maria', cpf_cnpj: '00000000000', bairro: 'Centro', municipio: 'Fortaleza', ibge: '2304400', uf: 'CE' },
    { codigo: '11', nome: 'Loja Exemplo', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
    { codigo: '12', nome: 'Souza', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
    { codigo: '13', nome: null, cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
    { codigo: '999007', nome: 'CONSUMIDOR FINAL', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
  ])
  assert.deepEqual(await linhas('select fonte, codigo, nome, usuario, tipo from kaizen.funcionario'), [
    { fonte: 'meuerp', codigo: '1', nome: 'Ana Teste', usuario: 18152, tipo: 'V' },
  ])
  assert.deepEqual(await linhas('select fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo from kaizen.produto'), [
    { fonte: 'meuerp', codigo: '60', descricao: 'CANECA', grupo: 'CASA', secao: 'COZINHA', subgrupo: 'LOUCA', marca: 'SEM MARCA', custo: '12.345600' },
  ])
})

test('ativo é inativo diferente de T, e inativo vazio é ativo', async () => {
  await carregarCadastros({
    produtos: [produto(60, { inativo: 'T' }), produto(61, { inativo: 'F' }), produto(62, { inativo: null })],
    pessoas: [pessoa(10, { inativo: 'T' }), pessoa(11, { inativo: null })],
    funcionarios: [funcionario(1, { inativo: 'T' }), funcionario(2, { inativo: null })],
  })
  assert.deepEqual(await linhas('select codigo, ativo from kaizen.produto order by codigo'), [
    { codigo: '60', ativo: false }, { codigo: '61', ativo: true }, { codigo: '62', ativo: true },
  ])
  assert.deepEqual(await linhas('select codigo, ativo from kaizen.pessoa order by codigo'), [
    { codigo: '10', ativo: false }, { codigo: '11', ativo: true },
  ])
  assert.deepEqual(await linhas('select codigo, ativo from kaizen.funcionario order by codigo'), [
    { codigo: '1', ativo: false }, { codigo: '2', ativo: true },
  ])
})

test('quem veio na leitura é atualizado com lido_em novo, e quem não veio fica como estava', async () => {
  await carregarCadastros({
    produtos: [produto(60, { descricao: 'CANECA' }), produto(61, { descricao: 'PRATO' })],
    pessoas: [pessoa(10)],
    funcionarios: [funcionario(1)],
  })
  const [primeira] = await linhas(`select lido_em from kaizen.produto where codigo = '60'`)

  assert.deepEqual(
    await carregarCadastros({ produtos: [produto(60, { descricao: 'CANECA AZUL' })] }),
    { produtos: 1, pessoas: 0, funcionarios: 0, fornecedores: 0 },
  )
  assert.deepEqual(await linhas(
    'select codigo, descricao, lido_em > $1::timestamptz as relido from kaizen.produto order by codigo',
    [primeira.lido_em],
  ), [
    { codigo: '60', descricao: 'CANECA AZUL', relido: true },
    { codigo: '61', descricao: 'PRATO', relido: false },
  ])
  assert.deepEqual(await linhas('select codigo, nome, lido_em = $1::timestamptz as intacto from kaizen.pessoa', [primeira.lido_em]), [
    { codigo: '10', nome: 'CLIENTE TESTE', intacto: true },
  ])
  assert.deepEqual(await linhas('select codigo, nome, lido_em = $1::timestamptz as intacto from kaizen.funcionario', [primeira.lido_em]), [
    { codigo: '1', nome: 'Ana Teste', intacto: true },
  ])
})

test('produto_fornecedor do ERP novo é trocada inteira, e a da Link fica', async () => {
  await banco.cliente.query(`insert into kaizen.produto_fornecedor (fonte, produto, fornecedor) values ('link', '60', '900001')`)
  assert.equal((await carregarCadastros({
    fornecedores: [{ produto: 60, fornecedor: 500 }, { produto: 60, fornecedor: 501 }, { produto: 2138, fornecedor: 500 }],
  })).fornecedores, 3)
  assert.equal((await carregarCadastros({
    fornecedores: [{ produto: 60, fornecedor: 501 }, { produto: 5278, fornecedor: 502 }],
  })).fornecedores, 2)
  assert.deepEqual(await linhas('select fonte, produto, fornecedor from kaizen.produto_fornecedor order by fonte, produto, fornecedor'), [
    { fonte: 'link', produto: '60', fornecedor: '900001' },
    { fonte: 'meuerp', produto: '5278', fornecedor: '502' },
    { fonte: 'meuerp', produto: '60', fornecedor: '501' },
  ])
})

test('custo vazio fica vazio, e não zero', async () => {
  await carregarCadastros({
    produtos: [produto(60, { custo: null }), produto(61, { custo: '0.000000' }), produto(62, { custo: '12.345600' })],
  })
  assert.deepEqual(await linhas('select codigo, custo from kaizen.produto order by codigo'), [
    { codigo: '60', custo: null }, { codigo: '61', custo: '0.000000' }, { codigo: '62', custo: '12.345600' },
  ])
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/carga-estado.test.mts`

Expected: FAIL, porque `carga.mts` ainda não tem as funções novas:
```
SyntaxError: The requested module './carga.mts' does not provide an export named 'apagarSumidos'
ℹ tests 1
ℹ fail 1
```
(O nome citado pode ser outro dos novos, como `podeApagar`.)

- [ ] **Passo 3: Criar `sql/carga/apagar.sql`**

```sql
drop table if exists pg_temp.vivo;

create temp table vivo on commit drop as
select distinct v.oid as origem_id
from pg_temp.entrada x, jsonb_array_elements_text(x.dados) v(oid)
where x.assunto = 'vivos';

-- só o ERP novo é comparado, e documento lido nesta execução nunca sai; os movimentos de estoque ficam
with alvo as (
  select d.id, d.origem_id, d.codigo, d.modelo, d.criado_em
  from kaizen.documento d
  where d.fonte = 'meuerp'
    and not exists (select 1 from pg_temp.vivo v where v.origem_id = d.origem_id)
    and not exists (select 1 from pg_temp.doc_lido l where l.origem_id = d.origem_id)
),
resumo as (
  select
    a.id,
    a.origem_id,
    a.codigo,
    t.valor as tipo,
    a.criado_em::text as criado_em,
    (select round(coalesce(sum(i.valor_liquido), 0), 2)::text
       from kaizen.documento_item i
      where i.documento_id = a.id) as valor,
    (select string_agg(distinct coalesce(f.nome, i.vendedor), ', ' order by coalesce(f.nome, i.vendedor))
       from kaizen.documento_item i
       left join kaizen.funcionario f on f.fonte = 'meuerp' and f.codigo = i.vendedor
      where i.documento_id = a.id) as vendedores
  from alvo a
  left join kaizen.traducao t on t.fonte = 'meuerp' and t.campo = 'tipo' and t.codigo = a.modelo
),
apagados as (
  delete from kaizen.documento d
  using resumo r
  where d.id = r.id
  returning d.id
)
select r.origem_id, r.codigo, r.tipo, r.criado_em, r.valor, r.vendedores
from resumo r
join apagados a on a.id = r.id
order by r.origem_id::bigint;
```

- [ ] **Passo 4: Criar `sql/carga/estoque.sql`**

```sql
drop table if exists pg_temp.movimento_lido;

create temp table movimento_lido on commit drop as
select distinct on (m->>'oid') m->>'oid' as origem_id, m
from pg_temp.entrada x, jsonb_array_elements(x.dados->'movimentos') m
where x.assunto = 'estoque'
order by m->>'oid', x.parte desc;

-- visto_em fica de fora do update: guarda o dia em que o Kaizen viu o movimento pela primeira vez
insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois)
select
  'meuerp', 'mercadoria_estoque_historico', l.origem_id,
  l.m->>'produto', l.m->>'documento', (l.m->>'momento')::timestamp,
  (l.m->>'saldo_antes')::numeric, (l.m->>'saldo_depois')::numeric
from pg_temp.movimento_lido l
order by l.origem_id::bigint
on conflict (fonte, origem_tabela, origem_id) do update set
  produto = excluded.produto,
  documento = excluded.documento,
  momento = excluded.momento,
  saldo_antes = excluded.saldo_antes,
  saldo_depois = excluded.saldo_depois;

delete from kaizen.estoque_atual where fonte = 'meuerp';

insert into kaizen.estoque_atual (fonte, produto, quantidade, lido_em)
select distinct on (f->>'produto') 'meuerp', f->>'produto', (f->>'quantidade')::numeric, now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'foto') f
where x.assunto = 'estoque'
order by f->>'produto', x.parte desc;

-- só na leitura completa (noite): movimento do ERP novo que não voltou sumiu do ERP
with sumidos as (
  delete from kaizen.estoque_movimento e
  where e.fonte = 'meuerp'
    and (select p.completo from pg_temp.parametro p)
    and not exists (select 1 from pg_temp.movimento_lido l where l.origem_id = e.origem_id)
  returning e.origem_id, e.produto
)
select
  (select count(*) from pg_temp.movimento_lido) as movimentos,
  (select count(*) from kaizen.estoque_atual where fonte = 'meuerp') as foto,
  coalesce(
    (select jsonb_agg(jsonb_build_object('origem_id', s.origem_id, 'produto', s.produto) order by s.origem_id::bigint) from sumidos s),
    '[]'::jsonb
  ) as sumidos;
```

- [ ] **Passo 5: Criar `sql/carga/cadastros.sql`**

```sql
-- quem não veio nesta leitura fica como está, com o lido_em da última leitura que o trouxe
insert into kaizen.produto (fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo, lido_em)
select distinct on (p->>'codigo')
  'meuerp', p->>'codigo', p->>'descricao', p->>'grupo', p->>'secao', p->>'subgrupo', p->>'marca',
  (p->>'custo')::numeric, coalesce(p->>'inativo', 'F') <> 'T', now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'produtos') p
where x.assunto = 'cadastros'
order by p->>'codigo', x.parte desc
on conflict (fonte, codigo) do update set
  descricao = excluded.descricao,
  grupo = excluded.grupo,
  secao = excluded.secao,
  subgrupo = excluded.subgrupo,
  marca = excluded.marca,
  custo = excluded.custo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo, lido_em)
select distinct on (p->>'codigo')
  'meuerp', p->>'codigo',
  nullif(btrim(concat_ws(' ', nullif(btrim(p->>'nome'), ''), nullif(btrim(p->>'sobrenome'), ''))), ''),
  p->>'cpf_cnpj', p->>'bairro', p->>'municipio', p->>'ibge', p->>'uf',
  coalesce(p->>'inativo', 'F') <> 'T', now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'pessoas') p
where x.assunto = 'cadastros'
order by p->>'codigo', x.parte desc
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
select distinct on (f->>'codigo')
  'meuerp', f->>'codigo',
  nullif(btrim(concat_ws(' ', nullif(btrim(f->>'nome'), ''), nullif(btrim(f->>'sobrenome'), ''))), ''),
  (f->>'usuario')::integer, f->>'tipo',
  coalesce(f->>'inativo', 'F') <> 'T', now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'funcionarios') f
where x.assunto = 'cadastros'
order by f->>'codigo', x.parte desc
on conflict (fonte, codigo) do update set
  nome = excluded.nome,
  usuario = excluded.usuario,
  tipo = excluded.tipo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

-- a ligação produto-fornecedor não guarda nome: a parte do ERP novo é trocada inteira
delete from kaizen.produto_fornecedor where fonte = 'meuerp';

insert into kaizen.produto_fornecedor (fonte, produto, fornecedor)
select distinct 'meuerp', f->>'produto', f->>'fornecedor'
from pg_temp.entrada x, jsonb_array_elements(x.dados->'fornecedores') f
where x.assunto = 'cadastros';

select
  (select count(distinct p->>'codigo') from pg_temp.entrada x, jsonb_array_elements(x.dados->'produtos') p where x.assunto = 'cadastros') as produtos,
  (select count(distinct p->>'codigo') from pg_temp.entrada x, jsonb_array_elements(x.dados->'pessoas') p where x.assunto = 'cadastros') as pessoas,
  (select count(distinct f->>'codigo') from pg_temp.entrada x, jsonb_array_elements(x.dados->'funcionarios') f where x.assunto = 'cadastros') as funcionarios,
  (select count(*) from kaizen.produto_fornecedor where fonte = 'meuerp') as fornecedores;
```

- [ ] **Passo 6: Acrescentar as funções no fim de `tradutor/carga.mts`**

Cole este trecho depois da última linha do arquivo (o `}` que fecha `gravarDocumentos`), com uma linha em branco antes. Os imports do topo não mudam.

```ts
export type Apagado = { origem_id: string; codigo: string; tipo: string | null; criado_em: string; valor: string; vendedores: string | null }

// Spec 6.3, passo 7: com menos de 20 documentos do ERP novo no Kaizen, só a lista vazia é recusada.
const LIMIAR_VIVOS = 20
const MOTIVO_VIVOS = 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'

export function podeApagar(noKaizen: number, vivos: number): { ok: true } | { ok: false; motivo: string } {
  if (noKaizen === 0) return { ok: true }
  if (vivos === 0) return { ok: false, motivo: MOTIVO_VIVOS }
  if (noKaizen >= LIMIAR_VIVOS && vivos * 2 < noKaizen) return { ok: false, motivo: MOTIVO_VIVOS }
  return { ok: true }
}

export async function apagarSumidos(cliente: Cliente): Promise<Apagado[]> {
  return (await rodarCarga(cliente, 'apagar')) as Apagado[]
}

export type CargaEstoque = { movimentos: number; foto: number; sumidos: Array<{ origem_id: string; produto: string }> }

export async function gravarEstoque(cliente: Cliente, completo: boolean): Promise<CargaEstoque> {
  // o arquivo SQL roda sem parâmetro; o marcador da leitura completa vai por esta tabela
  await cliente.query('drop table if exists pg_temp.parametro')
  await cliente.query('create temp table parametro (completo boolean not null) on commit drop')
  await cliente.query('insert into pg_temp.parametro (completo) values ($1)', [completo])
  const [resumo] = await rodarCarga(cliente, 'estoque')
  return {
    movimentos: Number(resumo.movimentos),
    foto: Number(resumo.foto),
    sumidos: resumo.sumidos as Array<{ origem_id: string; produto: string }>,
  }
}

export type CargaCadastros = { produtos: number; pessoas: number; funcionarios: number; fornecedores: number }

export async function gravarCadastros(cliente: Cliente): Promise<CargaCadastros> {
  const [resumo] = await rodarCarga(cliente, 'cadastros')
  return {
    produtos: Number(resumo.produtos),
    pessoas: Number(resumo.pessoas),
    funcionarios: Number(resumo.funcionarios),
    fornecedores: Number(resumo.fornecedores),
  }
}
```

Conferência: o arquivo fica, nesta ordem, com `lerCarga`, `rodarCarga`, `colocarEntrada`, `CargaDocumentos`, `gravarDocumentos`, `Apagado`, `LIMIAR_VIVOS`, `MOTIVO_VIVOS`, `podeApagar`, `apagarSumidos`, `CargaEstoque`, `gravarEstoque`, `CargaCadastros`, `gravarCadastros`.

- [ ] **Passo 7: Rodar e ver passar**

Run: `node --test tradutor/carga-estado.test.mts`

Expected: PASS, 11 testes:
```
✔ podeApagar só recusa lista vazia, ou menor que a metade com 20 ou mais documentos no Kaizen
✔ apagarSumidos apaga só o documento do ERP novo que sumiu e devolve o que o aviso precisa
✔ apagarSumidos não apaga nada quando todos continuam vivos
✔ gravarEstoque grava os movimentos e, na releitura, atualiza sem mudar visto_em
✔ gravarEstoque troca inteira a foto do ERP novo e não mexe na da Link
✔ na leitura completa, o movimento do ERP novo que não voltou sai e é devolvido
✔ gravarCadastros junta nome e sobrenome sem espaço sobrando e grava o resto como veio
✔ ativo é inativo diferente de T, e inativo vazio é ativo
✔ quem veio na leitura é atualizado com lido_em novo, e quem não veio fica como estava
✔ produto_fornecedor do ERP novo é trocada inteira, e a da Link fica
✔ custo vazio fica vazio, e não zero
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Se algum falhar, não mude o teste: ele descreve o que a spec pede (seções 5.2, 5.3 e 6.3, passos 7 e 10, e 6.4, passo 2).

- [ ] **Passo 8: Rodar junto os testes da carga da tarefa 8**

Run: `node --test tradutor/kaizen.test.mts tradutor/carga.test.mts tradutor/carga-estado.test.mts`

Expected: PASS, `ℹ tests 28`, `ℹ pass 28`, `ℹ fail 0` (6 + 11 da tarefa 8 e 11 desta).

- [ ] **Passo 9: Atualizar `testes-esperados.txt` (N = 11, todos em `carga-estado.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+11;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 11.

- [ ] **Passo 10: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 11: Commit**

```bash
git add sql/carga/apagar.sql sql/carga/estoque.sql sql/carga/cadastros.sql tradutor/carga.mts tradutor/carga-estado.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Carga de apagados, estoque e cadastros

Documento que sumiu do ERP sai do Kaizen com os itens, os pagamentos,
as parcelas, as baixas e a conferência, e volta para o aviso com o
número, o tipo em palavras, a data, o valor em reais e o nome do
vendedor. Os movimentos de estoque ficam. Documento lido na mesma
leitura nunca sai, e a lista do ERP só apaga se não vier vazia nem,
com 20 ou mais documentos no Kaizen, menor que a metade.

Estoque: os movimentos entram e são atualizados sem perder a hora em
que o Kaizen os viu; a foto do ERP é trocada inteira a cada leitura;
na leitura completa da noite, o movimento que sumiu do ERP sai e vira
aviso.

Cadastros: nome e sobrenome juntos, sem espaço sobrando; ativo quando
não está marcado como inativo; quem não veio na leitura fica como
estava; custo vazio fica vazio, e não zero; os fornecedores de cada
produto são trocados inteiros.

11 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 10: Janela, horários e textos dos avisos

**O que esta tarefa entrega, em resultado:**
- O Kaizen sabe que dia e que hora é em Fortaleza, qualquer que seja o fuso da máquina: 01h30 em UTC ainda é 22h30 do dia anterior na loja.
- A janela de leitura de hora em hora começa ontem ou, se a noite anterior falhou, na última noite boa. Na segunda-feira, com a última noite boa no sábado, começa no sábado. Sem nenhuma noite registrada, começa em 27/09.
- A lista das leituras que deviam ter acontecido e não aconteceram: das 8h às 19h e às 22h, de segunda a sábado; o domingo não conta. Uma parada do sábado 12h à segunda 9h lista nove horários. Também a próxima leitura esperada: depois das 22h de sábado, é segunda às 8h.
- Os textos de cada aviso, com a chave que impede repetir o mesmo aviso no resumo. O documento apagado sai como "o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP". O valor em reais é arredondado meio-par em 2 casas sem passar por número do JavaScript: R$ 12.345.678.901.234,12 sai exato.
- O limiar de 20 documentos que protege a limpeza dos apagados passa a morar num lugar só, junto das outras constantes. Os 11 testes da carga de apagados, estoque e cadastros continuam passando.

**Antes de começar:** rode tudo a partir da raiz do repositório. Os testes novos desta tarefa não usam banco, mas o passo 5 roda `tradutor/carga-estado.test.mts`, que usa, e o `npm run verificar` e o hook de commit rodam todos os testes: o Postgres local precisa estar no ar (`docker compose up -d --wait`). As tarefas 1 a 9 precisam estar feitas (esta tarefa importa tipos de `tradutor/tipos.mts` e o tipo `Apagado` de `tradutor/carga.mts`, e mexe em duas linhas de `tradutor/carga.mts`). Commits no Git Bash.

**Arquivos:**
- Criar: `tradutor/constantes.mts`
- Modificar: `tradutor/carga.mts` (a constante local `LIMIAR_VIVOS` da tarefa 9 dá lugar ao import de `constantes.mts`; nada mais muda)
- Criar: `tradutor/janela.mts`
- Testar: `tradutor/janela.test.mts`
- Criar: `tradutor/avisos.mts`
- Testar: `tradutor/avisos.test.mts`
- Modificar: `testes-esperados.txt` (soma 31)

**Interfaces:**
- Consome:
  - `tradutor/tipos.mts` (tarefa 2):
    ```ts
    export type TipoExecucao = 'hora' | 'noite'
    export type TipoAviso =
      | 'codigo_sem_traducao' | 'documento_apagado' | 'fechamento_com_resto' | 'estoque_diverge'
      | 'movimento_sumiu' | 'total_diferente' | 'execucao_faltou' | 'execucao_pulada'
    export type Aviso = { tipo: TipoAviso; chave: string; texto: string }
    ```
  - `tradutor/carga.mts` (tarefa 9), o tipo:
    ```ts
    export type Apagado = { origem_id: string; codigo: string; tipo: string | null; criado_em: string; valor: string; vendedores: string | null }
    ```
    (`criado_em` vem como `'2026-09-29 10:15:00'`; `valor` como `'150.00'`, já em 2 casas; `tipo` é a tradução do modelo, como `'pedido'`, ou vazio.)
  - `tradutor/carga.mts` (tarefas 8 e 9), as linhas que o passo 5 muda. O topo do arquivo começa assim:
    ```ts
    import { readFileSync } from 'node:fs'
    import type { QueryResult } from 'pg'
    import type { Cliente } from './banco.mts'
    ```
    e, depois de `export type Apagado`, vêm estas três linhas (a do meio é a que sai):
    ```ts
    // Spec 6.3, passo 7: com menos de 20 documentos do ERP novo no Kaizen, só a lista vazia é recusada.
    const LIMIAR_VIVOS = 20
    const MOTIVO_VIVOS = 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'
    ```
    `podeApagar` usa `LIMIAR_VIVOS` na linha `if (noKaizen >= LIMIAR_VIVOS && vivos * 2 < noKaizen) return { ok: false, motivo: MOTIVO_VIVOS }`, que não muda.
- Produz (as tarefas 11 a 14 usam exatamente isto):
  ```ts
  // tradutor/constantes.mts
  export const TRAVA = 20260928          // chave do pg_try_advisory_lock
  export const FOLGA_OID = 200
  export const LIMIAR_VIVOS = 20
  export const PRAZO_MIN: Record<TipoExecucao, number> = { hora: 10, noite: 30 }
  export const TAMANHO_FATIA = 5000      // faixa de oid por fatia da noite
  export const PRIMEIRO_INICIO = '2026-09-27'
  export const HORAS_DA_HORA = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  export const HORA_DA_NOITE = 22

  // tradutor/janela.mts — puro, sem banco
  export type Instante = { data: string; hora: number; minuto: number; diaSemana: number } // data 'AAAA-MM-DD' em Fortaleza; diaSemana 0 = domingo
  export function emFortaleza(ms: number): Instante                 // tira 3 h e lê em UTC
  export function somarDias(data: string, dias: number): string
  export function inicioDaJanela(agoraMs: number, ultimaNoiteBoa: string | null): string
  //   a menor entre ontem (em Fortaleza) e ultimaNoiteBoa ?? PRIMEIRO_INICIO
  export type Horario = { data: string; hora: number }              // um horário esperado
  export function horarioEsperado(i: Instante): boolean              // segunda a sábado e hora em HORAS_DA_HORA ou HORA_DA_NOITE
  export function horariosFaltando(ultimoInicioMs: number | null, agoraMs: number): Horario[]
  //   null → []; senão, os horários esperados (hora cheia) estritamente depois da hora cheia do último início
  //   e estritamente antes da hora cheia de agora
  export function proximoHorario(agoraMs: number): Horario            // primeiro horário esperado depois da hora cheia de agora
  export function rotuloHora(h: Horario, hojeData: string): string    // '15h' se h.data === hojeData, senão '28/09 às 8h'

  // tradutor/avisos.mts — puro
  export function formatarReais(valor: string): string   // '150.000000' → 'R$ 150,00'; '-18' → '−R$ 18,00'; lança Error(`valor que não é número: ${valor}`)
  export function diaMes(dataOuTimestamp: string): string // '2026-09-29...' → '29/09'; lança Error(`data que não começa por AAAA-MM-DD: ${x}`)
  export function avisoCodigoSemTraducao(campo: string, codigo: string, quantidade: number): Aviso
  export function avisoDocumentoApagado(a: Apagado): Aviso
  export function avisoFechamentoComResto(codigo: string, criadoEm: string, origemId: string): Aviso
  export function avisoEstoqueDiverge(produto: string, esperado: string, foto: string, ultimoOid: string | null): Aviso
  export function avisoMovimentoSumiu(origemId: string, produto: string): Aviso
  export function avisoTotalDiferente(dia: string, medida: string, erp: string, kaizen: string): Aviso
  export function avisoExecucaoFaltou(h: Horario): Aviso
  export function avisoExecucaoPulada(idQueSegura: number): Aviso
  export const TITULOS: Record<TipoAviso, string>        // títulos dos grupos do resumo, na ordem de TipoAviso
  export const O_QUE_FAZER: Record<TipoAviso, string>
  ```
  Chaves e textos exatos de cada aviso:

  | Função | `chave` | `texto` |
  | --- | --- | --- |
  | `avisoCodigoSemTraducao` | `codigo:${campo}:${codigo}` | `o código "${codigo}" de ${campo} apareceu ${quantidade} vez(es) e não tem tradução no Kaizen` |
  | `avisoDocumentoApagado` | `apagado:${a.origem_id}` | ``o ${a.tipo ?? 'documento'} ${a.codigo} de ${diaMes(a.criado_em)} (${formatarReais(a.valor)}${a.vendedores ? `, vendedor ${a.vendedores}` : ''}) sumiu do ERP`` |
  | `avisoFechamentoComResto` | `fechamento:${origemId}` | `o fechamento ${codigo} de ${diaMes(criadoEm)} pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável` |
  | `avisoEstoqueDiverge` | `estoque:${produto}:${ultimoOid ?? 'virada'}:${foto}` | `o saldo do produto ${produto} no ERP (${foto}) não bate com os movimentos (${esperado})` |
  | `avisoMovimentoSumiu` | `movimento:${origemId}` | `um movimento de estoque do produto ${produto} sumiu do ERP` |
  | `avisoTotalDiferente` | `total:${dia}:${medida}:${erp}:${kaizen}` | `em ${diaMes(dia)}, ${medida}: ERP ${erp}, Kaizen ${kaizen}` |
  | `avisoExecucaoFaltou` | `faltou:${h.data}:${h.hora}` | `a leitura das ${h.hora}h de ${diaMes(h.data)} não aconteceu` |
  | `avisoExecucaoPulada` | `pulada:${idQueSegura}` | `uma leitura foi pulada porque a anterior ainda estava rodando` |

**Por que o código é assim (para não "consertar" sem querer):**
- Fortaleza é UTC−3 o ano inteiro. `emFortaleza` tira 3 horas do instante e lê a data e a hora em UTC (`getUTCHours`, `toISOString`), e por isso não depende do fuso da máquina nem do `TZ`. Nunca use `getHours()` ou `toLocaleString` aqui.
- `horariosFaltando` e `proximoHorario` andam de hora cheia em hora cheia. Como o deslocamento é de horas inteiras, a hora cheia em UTC é também a hora cheia em Fortaleza.
- As datas `'AAAA-MM-DD'` comparadas como texto ficam na ordem do calendário. Por isso `inicioDaJanela` compara com `<`.
- `formatarReais` recebe o texto do Postgres e arredonda com `BigInt`: nenhum valor passa por `number`. O sinal de menos é o caractere `−` (U+2212), antes do `R$`. Um valor que arredonda para zero sai sem sinal (`R$ 0,00`).
- A chave do aviso é o que o resumo das 22h usa para saber se o aviso já foi informado. Por isso ela não leva a contagem do código sem tradução, e leva o último movimento e a foto no estoque: o mesmo produto, com o mesmo último movimento e a mesma foto, é o mesmo aviso.
- `TITULOS` e `O_QUE_FAZER` ficam na ordem de `TipoAviso`: é a ordem dos grupos no resumo.
- `carga.mts` nasceu na tarefa 9 com uma constante local `LIMIAR_VIVOS = 20`, porque `constantes.mts` ainda não existia. O passo 5 apaga essa constante e importa a de `constantes.mts`, para o limiar ficar num lugar só. É só isso em `carga.mts`: nenhuma outra linha muda, e os 11 testes de `carga-estado.test.mts` continuam passando sem mexer neles.

- [ ] **Passo 1: Escrever o teste da janela e dos horários**

Crie `tradutor/janela.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emFortaleza, somarDias, inicioDaJanela, horarioEsperado, horariosFaltando, proximoHorario, rotuloHora,
} from './janela.mts'

// Instantes fixos em UTC; o comentário diz a hora de Fortaleza (UTC−3). 27/09/2026 é domingo.
const TERCA_14H = Date.parse('2026-09-29T17:00:00Z')

test('emFortaleza tira 3 horas e lê dia, hora, minuto e dia da semana de Fortaleza', () => {
  assert.deepEqual(emFortaleza(TERCA_14H), { data: '2026-09-29', hora: 14, minuto: 0, diaSemana: 2 })
  assert.deepEqual(emFortaleza(Date.parse('2026-09-28T11:05:59Z')), { data: '2026-09-28', hora: 8, minuto: 5, diaSemana: 1 })
  assert.deepEqual(emFortaleza(Date.parse('2026-09-28T03:00:00Z')), { data: '2026-09-28', hora: 0, minuto: 0, diaSemana: 1 })
  assert.deepEqual(emFortaleza(Date.parse('2026-10-04T11:00:00Z')), { data: '2026-10-04', hora: 8, minuto: 0, diaSemana: 0 })
})

test('emFortaleza: 01h30 em UTC ainda é 22h30 do dia anterior em Fortaleza', () => {
  assert.deepEqual(emFortaleza(Date.parse('2026-09-30T01:30:00Z')), { data: '2026-09-29', hora: 22, minuto: 30, diaSemana: 2 })
  assert.deepEqual(emFortaleza(Date.parse('2026-09-28T02:59:00Z')), { data: '2026-09-27', hora: 23, minuto: 59, diaSemana: 0 })
})

test('somarDias atravessa o mês, o ano e fevereiro', () => {
  assert.equal(somarDias('2026-09-30', 1), '2026-10-01')
  assert.equal(somarDias('2026-10-01', -1), '2026-09-30')
  assert.equal(somarDias('2026-10-05', -2), '2026-10-03')
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01')
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28')
  assert.equal(somarDias('2026-09-28', 0), '2026-09-28')
})

test('inicioDaJanela: com a noite de ontem boa, começa ontem', () => {
  assert.equal(inicioDaJanela(TERCA_14H, '2026-09-28'), '2026-09-28')
})

test('inicioDaJanela: na segunda-feira, com a última noite boa no sábado, começa no sábado', () => {
  const segunda9h = Date.parse('2026-10-05T12:00:00Z')
  assert.equal(inicioDaJanela(segunda9h, '2026-10-03'), '2026-10-03')
})

test('inicioDaJanela: depois de uma noite que falhou, começa na última noite boa', () => {
  const quinta10h = Date.parse('2026-10-01T13:00:00Z')
  assert.equal(inicioDaJanela(quinta10h, '2026-09-29'), '2026-09-29')
})

test('inicioDaJanela: sem nenhuma noite registrada, começa em 27/09', () => {
  assert.equal(inicioDaJanela(TERCA_14H, null), '2026-09-27')
  const primeiraSegunda8h = Date.parse('2026-09-28T11:00:00Z')
  assert.equal(inicioDaJanela(primeiraSegunda8h, null), '2026-09-27')
})

test('inicioDaJanela às 22h30 (01h30 em UTC) usa o dia de Fortaleza', () => {
  const terca22h30 = Date.parse('2026-09-30T01:30:00Z')
  assert.equal(inicioDaJanela(terca22h30, '2026-09-28'), '2026-09-28')
  assert.equal(inicioDaJanela(terca22h30, '2026-09-29'), '2026-09-28')
})

test('horarioEsperado: segunda a sábado, das 8h às 19h e às 22h', () => {
  const em = (diaSemana: number, hora: number) => horarioEsperado({ data: '2026-09-29', hora, minuto: 0, diaSemana })
  assert.equal(em(1, 8), true)
  assert.equal(em(2, 14), true)
  assert.equal(em(6, 19), true)
  assert.equal(em(6, 22), true)
  assert.equal(em(2, 7), false)
  assert.equal(em(2, 20), false)
  assert.equal(em(2, 21), false)
  assert.equal(em(2, 23), false)
  assert.equal(em(0, 10), false)
  assert.equal(em(0, 22), false)
})

test('horariosFaltando sem execução anterior não lista nada', () => {
  assert.deepEqual(horariosFaltando(null, TERCA_14H), [])
})

test('horariosFaltando na mesma terça, do último às 10h até agora às 14h, lista 11h, 12h e 13h', () => {
  const terca10h = Date.parse('2026-09-29T13:00:05Z')
  assert.deepEqual(horariosFaltando(terca10h, Date.parse('2026-09-29T17:00:02Z')), [
    { data: '2026-09-29', hora: 11 },
    { data: '2026-09-29', hora: 12 },
    { data: '2026-09-29', hora: 13 },
  ])
})

test('horariosFaltando na hora seguinte, mesmo com minutos de atraso, não lista nada', () => {
  assert.deepEqual(horariosFaltando(Date.parse('2026-09-29T16:00:04Z'), TERCA_14H), [])
  assert.deepEqual(horariosFaltando(Date.parse('2026-09-29T16:09:00Z'), Date.parse('2026-09-29T17:08:00Z')), [])
  // uma execução manual às 13h37 não esconde a das 14h: a lista só vai até antes da hora cheia de agora
  assert.deepEqual(horariosFaltando(Date.parse('2026-09-29T16:37:00Z'), Date.parse('2026-09-29T17:00:01Z')), [])
})

test('horariosFaltando atravessando a noite (último às 19h, agora às 9h do dia seguinte) lista 22h e 8h', () => {
  const terca19h = Date.parse('2026-09-29T22:00:03Z')
  const quarta9h = Date.parse('2026-09-30T12:00:01Z')
  assert.deepEqual(horariosFaltando(terca19h, quarta9h), [
    { data: '2026-09-29', hora: 22 },
    { data: '2026-09-30', hora: 8 },
  ])
})

test('horariosFaltando numa parada do sábado 12h à segunda 9h lista o sábado e a segunda 8h, e nada no domingo', () => {
  const sabado12h = Date.parse('2026-10-03T15:00:02Z')
  const segunda9h = Date.parse('2026-10-05T12:00:02Z')
  assert.deepEqual(horariosFaltando(sabado12h, segunda9h), [
    { data: '2026-10-03', hora: 13 },
    { data: '2026-10-03', hora: 14 },
    { data: '2026-10-03', hora: 15 },
    { data: '2026-10-03', hora: 16 },
    { data: '2026-10-03', hora: 17 },
    { data: '2026-10-03', hora: 18 },
    { data: '2026-10-03', hora: 19 },
    { data: '2026-10-03', hora: 22 },
    { data: '2026-10-05', hora: 8 },
  ])
  // a noite de sábado rodou: segunda às 8h nada falta
  assert.deepEqual(horariosFaltando(Date.parse('2026-10-04T01:00:02Z'), Date.parse('2026-10-05T11:00:02Z')), [])
})

test('proximoHorario: a próxima hora esperada depois da hora cheia de agora', () => {
  assert.deepEqual(proximoHorario(TERCA_14H), { data: '2026-09-29', hora: 15 })
  assert.deepEqual(proximoHorario(Date.parse('2026-09-29T17:37:00Z')), { data: '2026-09-29', hora: 15 })
  assert.deepEqual(proximoHorario(Date.parse('2026-09-29T22:00:00Z')), { data: '2026-09-29', hora: 22 })
  assert.deepEqual(proximoHorario(Date.parse('2026-09-30T01:00:00Z')), { data: '2026-09-30', hora: 8 })
  assert.deepEqual(proximoHorario(Date.parse('2026-10-03T22:00:00Z')), { data: '2026-10-03', hora: 22 })
  assert.deepEqual(proximoHorario(Date.parse('2026-10-04T01:00:00Z')), { data: '2026-10-05', hora: 8 })
  assert.deepEqual(proximoHorario(Date.parse('2026-10-04T13:00:00Z')), { data: '2026-10-05', hora: 8 })
})

test('rotuloHora: só a hora no mesmo dia, e dia e hora em outro dia', () => {
  assert.equal(rotuloHora({ data: '2026-09-29', hora: 15 }, '2026-09-29'), '15h')
  assert.equal(rotuloHora({ data: '2026-09-28', hora: 8 }, '2026-09-27'), '28/09 às 8h')
  assert.equal(rotuloHora({ data: '2026-10-05', hora: 8 }, '2026-10-03'), '05/10 às 8h')
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Run: `node --test tradutor/janela.test.mts`
Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\janela.mts' imported from <repositório>\tradutor\janela.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 3: Criar `tradutor/constantes.mts` e `tradutor/janela.mts`**

Crie `tradutor/constantes.mts` (os valores são os do contrato; o passo 5 põe `carga.mts` para usar `LIMIAR_VIVOS`, e as tarefas seguintes usam as outras):

```ts
import type { TipoExecucao } from './tipos.mts'

export const TRAVA = 20260928          // chave do pg_try_advisory_lock
export const FOLGA_OID = 200
export const LIMIAR_VIVOS = 20
export const PRAZO_MIN: Record<TipoExecucao, number> = { hora: 10, noite: 30 }
export const TAMANHO_FATIA = 5000      // faixa de oid por fatia da noite
export const PRIMEIRO_INICIO = '2026-09-27'
export const HORAS_DA_HORA = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
export const HORA_DA_NOITE = 22
```

Crie `tradutor/janela.mts`:

```ts
import { HORA_DA_NOITE, HORAS_DA_HORA, PRIMEIRO_INICIO } from './constantes.mts'

export type Instante = { data: string; hora: number; minuto: number; diaSemana: number } // data 'AAAA-MM-DD' em Fortaleza; diaSemana 0 = domingo
export type Horario = { data: string; hora: number }              // um horário esperado

const HORA_MS = 60 * 60 * 1000
// Fortaleza é UTC−3 o ano inteiro, sem horário de verão: tirar 3 h e ler em UTC dá a hora da loja, qualquer que seja o fuso da máquina.
const DESLOCAMENTO_MS = 3 * HORA_MS

export function emFortaleza(ms: number): Instante {
  const d = new Date(ms - DESLOCAMENTO_MS)
  return { data: d.toISOString().slice(0, 10), hora: d.getUTCHours(), minuto: d.getUTCMinutes(), diaSemana: d.getUTCDay() }
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

export function inicioDaJanela(agoraMs: number, ultimaNoiteBoa: string | null): string {
  const ontem = somarDias(emFortaleza(agoraMs).data, -1)
  const base = ultimaNoiteBoa ?? PRIMEIRO_INICIO
  // datas 'AAAA-MM-DD' comparadas como texto ficam na ordem do calendário
  return base < ontem ? base : ontem
}

export function horarioEsperado(i: Instante): boolean {
  const segundaASabado = i.diaSemana >= 1 && i.diaSemana <= 6
  return segundaASabado && (HORAS_DA_HORA.includes(i.hora) || i.hora === HORA_DA_NOITE)
}

// O deslocamento de Fortaleza é de horas inteiras: a hora cheia em UTC é também a hora cheia em Fortaleza.
function horaCheia(ms: number): number {
  return Math.floor(ms / HORA_MS) * HORA_MS
}

export function horariosFaltando(ultimoInicioMs: number | null, agoraMs: number): Horario[] {
  if (ultimoInicioMs === null) return []
  const faltando: Horario[] = []
  const ate = horaCheia(agoraMs)
  for (let t = horaCheia(ultimoInicioMs) + HORA_MS; t < ate; t += HORA_MS) {
    const i = emFortaleza(t)
    if (horarioEsperado(i)) faltando.push({ data: i.data, hora: i.hora })
  }
  return faltando
}

export function proximoHorario(agoraMs: number): Horario {
  let t = horaCheia(agoraMs) + HORA_MS
  while (!horarioEsperado(emFortaleza(t))) t += HORA_MS
  const i = emFortaleza(t)
  return { data: i.data, hora: i.hora }
}

export function rotuloHora(h: Horario, hojeData: string): string {
  if (h.data === hojeData) return `${h.hora}h`
  return `${h.data.slice(8, 10)}/${h.data.slice(5, 7)} às ${h.hora}h`
}
```

- [ ] **Passo 4: Rodar o teste e ver passar, inclusive com a máquina em outro fuso**

Run: `node --test tradutor/janela.test.mts`
Expected: PASS, com as 16 linhas abaixo (os tempos variam) e `ℹ pass 16`, `ℹ fail 0`:
```
✔ emFortaleza tira 3 horas e lê dia, hora, minuto e dia da semana de Fortaleza
✔ emFortaleza: 01h30 em UTC ainda é 22h30 do dia anterior em Fortaleza
✔ somarDias atravessa o mês, o ano e fevereiro
✔ inicioDaJanela: com a noite de ontem boa, começa ontem
✔ inicioDaJanela: na segunda-feira, com a última noite boa no sábado, começa no sábado
✔ inicioDaJanela: depois de uma noite que falhou, começa na última noite boa
✔ inicioDaJanela: sem nenhuma noite registrada, começa em 27/09
✔ inicioDaJanela às 22h30 (01h30 em UTC) usa o dia de Fortaleza
✔ horarioEsperado: segunda a sábado, das 8h às 19h e às 22h
✔ horariosFaltando sem execução anterior não lista nada
✔ horariosFaltando na mesma terça, do último às 10h até agora às 14h, lista 11h, 12h e 13h
✔ horariosFaltando na hora seguinte, mesmo com minutos de atraso, não lista nada
✔ horariosFaltando atravessando a noite (último às 19h, agora às 9h do dia seguinte) lista 22h e 8h
✔ horariosFaltando numa parada do sábado 12h à segunda 9h lista o sábado e a segunda 8h, e nada no domingo
✔ proximoHorario: a próxima hora esperada depois da hora cheia de agora
✔ rotuloHora: só a hora no mesmo dia, e dia e hora em outro dia
```

Run (Git Bash): `for tz in UTC America/Fortaleza Asia/Tokyo America/Los_Angeles; do echo "$tz: $(TZ=$tz node --test tradutor/janela.test.mts 2>&1 | grep -E '^ℹ (pass|fail)' | tr '\n' ' ')"; done`
Expected (o resultado não depende do fuso da máquina):
```
UTC: ℹ pass 16 ℹ fail 0 
America/Fortaleza: ℹ pass 16 ℹ fail 0 
Asia/Tokyo: ℹ pass 16 ℹ fail 0 
America/Los_Angeles: ℹ pass 16 ℹ fail 0 
```

- [ ] **Passo 5: Trazer o limiar de `carga.mts` para `constantes.mts`**

Este passo não tem teste novo: os 11 testes de `tradutor/carga-estado.test.mts` (tarefa 9) já conferem o limiar, e têm de continuar passando sem mudar nada neles. Precisa do Postgres local no ar.

Antes, confira que o limiar está hoje em dois lugares:

Run: `grep -n "LIMIAR_VIVOS" tradutor/*.mts`
Expected:
```
tradutor/carga.mts:41:const LIMIAR_VIVOS = 20
tradutor/carga.mts:47:  if (noKaizen >= LIMIAR_VIVOS && vivos * 2 < noKaizen) return { ok: false, motivo: MOTIVO_VIVOS }
tradutor/constantes.mts:5:export const LIMIAR_VIVOS = 20
```

Em `tradutor/carga.mts`, faça duas mudanças e mais nenhuma:

1. No topo, logo depois da linha `import type { Cliente } from './banco.mts'`, acrescente uma linha. O topo fica assim:

```ts
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import type { Cliente } from './banco.mts'
import { LIMIAR_VIVOS } from './constantes.mts'
```

2. Apague a linha `const LIMIAR_VIVOS = 20` (a que vem logo depois do comentário `// Spec 6.3, passo 7: ...`). O comentário e a linha do `MOTIVO_VIVOS` ficam. Depois de `export type Apagado`, o trecho fica assim:

```ts
// Spec 6.3, passo 7: com menos de 20 documentos do ERP novo no Kaizen, só a lista vazia é recusada.
const MOTIVO_VIVOS = 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'
```

`podeApagar` não muda: continua usando `LIMIAR_VIVOS`, que agora vem de `constantes.mts`.

Run: `grep -n "LIMIAR_VIVOS" tradutor/*.mts`
Expected (o valor 20 só aparece em `constantes.mts`):
```
tradutor/carga.mts:4:import { LIMIAR_VIVOS } from './constantes.mts'
tradutor/carga.mts:47:  if (noKaizen >= LIMIAR_VIVOS && vivos * 2 < noKaizen) return { ok: false, motivo: MOTIVO_VIVOS }
tradutor/constantes.mts:5:export const LIMIAR_VIVOS = 20
```

Run: `git diff --stat tradutor/carga.mts`
Expected: `tradutor/carga.mts | 2 +-` e `1 file changed, 1 insertion(+), 1 deletion(-)`.

Run: `node --test tradutor/carga-estado.test.mts`
Expected: PASS, as mesmas 11 linhas da tarefa 9 (os tempos variam), com `ℹ tests 11`, `ℹ pass 11`, `ℹ fail 0`:
```
✔ podeApagar só recusa lista vazia, ou menor que a metade com 20 ou mais documentos no Kaizen
✔ apagarSumidos apaga só o documento do ERP novo que sumiu e devolve o que o aviso precisa
✔ apagarSumidos não apaga nada quando todos continuam vivos
✔ gravarEstoque grava os movimentos e, na releitura, atualiza sem mudar visto_em
✔ gravarEstoque troca inteira a foto do ERP novo e não mexe na da Link
✔ na leitura completa, o movimento do ERP novo que não voltou sai e é devolvido
✔ gravarCadastros junta nome e sobrenome sem espaço sobrando e grava o resto como veio
✔ ativo é inativo diferente de T, e inativo vazio é ativo
✔ quem veio na leitura é atualizado com lido_em novo, e quem não veio fica como estava
✔ produto_fornecedor do ERP novo é trocada inteira, e a da Link fica
✔ custo vazio fica vazio, e não zero
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Run: `npm run tipos`
Expected: termina sem nenhuma linha `error TS`.

Se o `tsc` disser `tradutor/carga.mts(46,19): error TS2304: Cannot find name 'LIMIAR_VIVOS'.` e o teste do `podeApagar` falhar, a linha do import não entrou: volte à mudança 1. Não mexa no teste.

- [ ] **Passo 6: Escrever o teste dos textos dos avisos**

Crie `tradutor/avisos.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatarReais, diaMes, avisoCodigoSemTraducao, avisoDocumentoApagado, avisoFechamentoComResto,
  avisoEstoqueDiverge, avisoMovimentoSumiu, avisoTotalDiferente, avisoExecucaoFaltou, avisoExecucaoPulada,
  TITULOS, O_QUE_FAZER,
} from './avisos.mts'

test('formatarReais escreve reais com vírgula e ponto de milhar, a partir do texto do Postgres', () => {
  assert.equal(formatarReais('150.000000'), 'R$ 150,00')
  assert.equal(formatarReais('150.00'), 'R$ 150,00')
  assert.equal(formatarReais('1234.5'), 'R$ 1.234,50')
  assert.equal(formatarReais('1000000'), 'R$ 1.000.000,00')
  assert.equal(formatarReais('245864.76'), 'R$ 245.864,76')
  assert.equal(formatarReais('0'), 'R$ 0,00')
  assert.equal(formatarReais('0.5'), 'R$ 0,50')
})

test('formatarReais arredonda meio-par em 2 casas', () => {
  assert.equal(formatarReais('0.005'), 'R$ 0,00')
  assert.equal(formatarReais('0.015'), 'R$ 0,02')
  assert.equal(formatarReais('2.345'), 'R$ 2,34')
  assert.equal(formatarReais('2.355'), 'R$ 2,36')
  assert.equal(formatarReais('0.0051'), 'R$ 0,01')
  assert.equal(formatarReais('0.004999'), 'R$ 0,00')
  assert.equal(formatarReais('9.995000'), 'R$ 10,00')
})

test('formatarReais põe o sinal de menos antes do R$, e zero não leva sinal', () => {
  assert.equal(formatarReais('-18'), '−R$ 18,00')
  assert.equal(formatarReais('-5.00'), '−R$ 5,00')
  assert.equal(formatarReais('-1234.565'), '−R$ 1.234,56')
  assert.equal(formatarReais('-0.004'), 'R$ 0,00')
})

test('formatarReais não perde algarismo acima de 2^53', () => {
  assert.equal(formatarReais('12345678901234.125'), 'R$ 12.345.678.901.234,12')
  assert.equal(formatarReais('9007199254740993.000001'), 'R$ 9.007.199.254.740.993,00')
})

test('formatarReais recusa o que não é número', () => {
  for (const valor of ['', 'abc', '1,50', '1.2.3', 'NaN', ' 10']) {
    assert.throws(() => formatarReais(valor), { message: `valor que não é número: ${valor}` }, valor)
  }
})

test('diaMes lê o dia e o mês de uma data ou de um timestamp', () => {
  assert.equal(diaMes('2026-09-29'), '29/09')
  assert.equal(diaMes('2026-09-28 15:30:00'), '28/09')
  assert.equal(diaMes('2026-09-28T15:30:00.000000'), '28/09')
  assert.equal(diaMes('2026-10-01 00:00:00-03'), '01/10')
  assert.throws(() => diaMes('29/09/2026'), { message: 'data que não começa por AAAA-MM-DD: 29/09/2026' })
})

test('avisoCodigoSemTraducao: a chave não leva a contagem, para o mesmo código não repetir no resumo', () => {
  assert.deepEqual(avisoCodigoSemTraducao('tipo', 'AM', 3), {
    tipo: 'codigo_sem_traducao',
    chave: 'codigo:tipo:AM',
    texto: 'o código "AM" de tipo apareceu 3 vez(es) e não tem tradução no Kaizen',
  })
})

test('avisoDocumentoApagado diz tipo, número, dia, valor e vendedor', () => {
  assert.deepEqual(avisoDocumentoApagado({
    origem_id: '300', codigo: '123', tipo: 'pedido', criado_em: '2026-09-29 10:15:00', valor: '150.00', vendedores: 'Igor',
  }), {
    tipo: 'documento_apagado',
    chave: 'apagado:300',
    texto: 'o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP',
  })
  assert.deepEqual(avisoDocumentoApagado({
    origem_id: '301', codigo: '7', tipo: null, criado_em: '2026-09-28 08:00:00', valor: '0.00', vendedores: null,
  }), {
    tipo: 'documento_apagado',
    chave: 'apagado:301',
    texto: 'o documento 7 de 28/09 (R$ 0,00) sumiu do ERP',
  })
})

test('avisoFechamentoComResto avisa que a quebra do turno não é confiável', () => {
  assert.deepEqual(avisoFechamentoComResto('98', '2026-09-29T18:00:00.000000', '250'), {
    tipo: 'fechamento_com_resto',
    chave: 'fechamento:250',
    texto: 'o fechamento 98 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável',
  })
})

test('avisoEstoqueDiverge: a chave leva o último movimento e a foto, ou "virada" sem movimento', () => {
  assert.deepEqual(avisoEstoqueDiverge('2138', '-10.000000', '-9.000000', '1900'), {
    tipo: 'estoque_diverge',
    chave: 'estoque:2138:1900:-9.000000',
    texto: 'o saldo do produto 2138 no ERP (-9.000000) não bate com os movimentos (-10.000000)',
  })
  assert.deepEqual(avisoEstoqueDiverge('60', '3.000000', '0.000000', null), {
    tipo: 'estoque_diverge',
    chave: 'estoque:60:virada:0.000000',
    texto: 'o saldo do produto 60 no ERP (0.000000) não bate com os movimentos (3.000000)',
  })
})

test('avisoMovimentoSumiu', () => {
  assert.deepEqual(avisoMovimentoSumiu('1900', '2138'), {
    tipo: 'movimento_sumiu',
    chave: 'movimento:1900',
    texto: 'um movimento de estoque do produto 2138 sumiu do ERP',
  })
})

test('avisoTotalDiferente mostra os dois números', () => {
  assert.deepEqual(avisoTotalDiferente('2026-09-29', 'itens:valor', '1234.50', '1200.00'), {
    tipo: 'total_diferente',
    chave: 'total:2026-09-29:itens:valor:1234.50:1200.00',
    texto: 'em 29/09, itens:valor: ERP 1234.50, Kaizen 1200.00',
  })
})

test('avisoExecucaoFaltou diz a hora e o dia', () => {
  assert.deepEqual(avisoExecucaoFaltou({ data: '2026-09-29', hora: 22 }), {
    tipo: 'execucao_faltou',
    chave: 'faltou:2026-09-29:22',
    texto: 'a leitura das 22h de 29/09 não aconteceu',
  })
})

test('avisoExecucaoPulada leva na chave a execução que segurava a trava', () => {
  assert.deepEqual(avisoExecucaoPulada(41), {
    tipo: 'execucao_pulada',
    chave: 'pulada:41',
    texto: 'uma leitura foi pulada porque a anterior ainda estava rodando',
  })
})

test('TITULOS e O_QUE_FAZER têm um texto para cada tipo de aviso, na ordem do resumo', () => {
  assert.deepEqual(Object.entries(TITULOS), [
    ['codigo_sem_traducao', 'Códigos novos no ERP'],
    ['documento_apagado', 'Documentos apagados no ERP'],
    ['fechamento_com_resto', 'Fechamentos com linha de teste'],
    ['estoque_diverge', 'Estoque que não bate'],
    ['movimento_sumiu', 'Movimentos de estoque sumidos'],
    ['total_diferente', 'Totais diferentes do ERP'],
    ['execucao_faltou', 'Leituras que não aconteceram'],
    ['execucao_pulada', 'Leituras puladas'],
  ])
  const leve = 'leve este resumo à próxima sessão com o Claude'
  assert.deepEqual(Object.entries(O_QUE_FAZER), [
    ['codigo_sem_traducao', leve],
    ['documento_apagado', 'pergunte à gerente ou ao suporte'],
    ['fechamento_com_resto', 'a quebra desse turno não é confiável'],
    ['estoque_diverge', leve],
    ['movimento_sumiu', leve],
    ['total_diferente', leve],
    ['execucao_faltou', leve],
    ['execucao_pulada', leve],
  ])
})
```

- [ ] **Passo 7: Rodar o teste e ver falhar**

Run: `node --test tradutor/avisos.test.mts`
Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\avisos.mts' imported from <repositório>\tradutor\avisos.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 8: Criar `tradutor/avisos.mts`**

```ts
import type { Apagado } from './carga.mts'
import type { Horario } from './janela.mts'
import type { Aviso, TipoAviso } from './tipos.mts'

// Arredonda meio-par em 2 casas só com inteiros (BigInt): o texto do Postgres nunca passa por number do JavaScript.
export function formatarReais(valor: string): string {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(valor)
  if (!partes) throw new Error(`valor que não é número: ${valor}`)
  const [, sinal, inteira, fracao = ''] = partes
  let centavos: bigint
  if (fracao.length <= 2) {
    centavos = BigInt(inteira + fracao.padEnd(2, '0'))
  } else {
    const escala = 10n ** BigInt(fracao.length - 2)
    const bruto = BigInt(inteira + fracao)
    const quociente = bruto / escala
    const dobroDoResto = (bruto % escala) * 2n
    const sobe = dobroDoResto > escala || (dobroDoResto === escala && quociente % 2n === 1n)
    centavos = sobe ? quociente + 1n : quociente
  }
  const digitos = centavos.toString().padStart(3, '0')
  const reais = digitos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const negativo = sinal === '-' && centavos !== 0n
  return `${negativo ? '−' : ''}R$ ${reais},${digitos.slice(-2)}`
}

export function diaMes(dataOuTimestamp: string): string {
  const partes = /^\d{4}-(\d{2})-(\d{2})/.exec(dataOuTimestamp)
  if (!partes) throw new Error(`data que não começa por AAAA-MM-DD: ${dataOuTimestamp}`)
  return `${partes[2]}/${partes[1]}`
}

export function avisoCodigoSemTraducao(campo: string, codigo: string, quantidade: number): Aviso {
  return {
    tipo: 'codigo_sem_traducao',
    chave: `codigo:${campo}:${codigo}`,
    texto: `o código "${codigo}" de ${campo} apareceu ${quantidade} vez(es) e não tem tradução no Kaizen`,
  }
}

export function avisoDocumentoApagado(a: Apagado): Aviso {
  return {
    tipo: 'documento_apagado',
    chave: `apagado:${a.origem_id}`,
    texto: `o ${a.tipo ?? 'documento'} ${a.codigo} de ${diaMes(a.criado_em)} (${formatarReais(a.valor)}${a.vendedores ? `, vendedor ${a.vendedores}` : ''}) sumiu do ERP`,
  }
}

export function avisoFechamentoComResto(codigo: string, criadoEm: string, origemId: string): Aviso {
  return {
    tipo: 'fechamento_com_resto',
    chave: `fechamento:${origemId}`,
    texto: `o fechamento ${codigo} de ${diaMes(criadoEm)} pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável`,
  }
}

export function avisoEstoqueDiverge(produto: string, esperado: string, foto: string, ultimoOid: string | null): Aviso {
  return {
    tipo: 'estoque_diverge',
    chave: `estoque:${produto}:${ultimoOid ?? 'virada'}:${foto}`,
    texto: `o saldo do produto ${produto} no ERP (${foto}) não bate com os movimentos (${esperado})`,
  }
}

export function avisoMovimentoSumiu(origemId: string, produto: string): Aviso {
  return {
    tipo: 'movimento_sumiu',
    chave: `movimento:${origemId}`,
    texto: `um movimento de estoque do produto ${produto} sumiu do ERP`,
  }
}

export function avisoTotalDiferente(dia: string, medida: string, erp: string, kaizen: string): Aviso {
  return {
    tipo: 'total_diferente',
    chave: `total:${dia}:${medida}:${erp}:${kaizen}`,
    texto: `em ${diaMes(dia)}, ${medida}: ERP ${erp}, Kaizen ${kaizen}`,
  }
}

export function avisoExecucaoFaltou(h: Horario): Aviso {
  return {
    tipo: 'execucao_faltou',
    chave: `faltou:${h.data}:${h.hora}`,
    texto: `a leitura das ${h.hora}h de ${diaMes(h.data)} não aconteceu`,
  }
}

export function avisoExecucaoPulada(idQueSegura: number): Aviso {
  return {
    tipo: 'execucao_pulada',
    chave: `pulada:${idQueSegura}`,
    texto: 'uma leitura foi pulada porque a anterior ainda estava rodando',
  }
}

// Na ordem de TipoAviso: é a ordem dos grupos no resumo das 22h.
export const TITULOS: Record<TipoAviso, string> = {
  codigo_sem_traducao: 'Códigos novos no ERP',
  documento_apagado: 'Documentos apagados no ERP',
  fechamento_com_resto: 'Fechamentos com linha de teste',
  estoque_diverge: 'Estoque que não bate',
  movimento_sumiu: 'Movimentos de estoque sumidos',
  total_diferente: 'Totais diferentes do ERP',
  execucao_faltou: 'Leituras que não aconteceram',
  execucao_pulada: 'Leituras puladas',
}

const LEVAR_AO_CLAUDE = 'leve este resumo à próxima sessão com o Claude'

export const O_QUE_FAZER: Record<TipoAviso, string> = {
  codigo_sem_traducao: LEVAR_AO_CLAUDE,
  documento_apagado: 'pergunte à gerente ou ao suporte',
  fechamento_com_resto: 'a quebra desse turno não é confiável',
  estoque_diverge: LEVAR_AO_CLAUDE,
  movimento_sumiu: LEVAR_AO_CLAUDE,
  total_diferente: LEVAR_AO_CLAUDE,
  execucao_faltou: LEVAR_AO_CLAUDE,
  execucao_pulada: LEVAR_AO_CLAUDE,
}
```

- [ ] **Passo 9: Rodar o teste e ver passar**

Run: `node --test tradutor/avisos.test.mts`
Expected: PASS, com as 15 linhas abaixo e `ℹ pass 15`, `ℹ fail 0`:
```
✔ formatarReais escreve reais com vírgula e ponto de milhar, a partir do texto do Postgres
✔ formatarReais arredonda meio-par em 2 casas
✔ formatarReais põe o sinal de menos antes do R$, e zero não leva sinal
✔ formatarReais não perde algarismo acima de 2^53
✔ formatarReais recusa o que não é número
✔ diaMes lê o dia e o mês de uma data ou de um timestamp
✔ avisoCodigoSemTraducao: a chave não leva a contagem, para o mesmo código não repetir no resumo
✔ avisoDocumentoApagado diz tipo, número, dia, valor e vendedor
✔ avisoFechamentoComResto avisa que a quebra do turno não é confiável
✔ avisoEstoqueDiverge: a chave leva o último movimento e a foto, ou "virada" sem movimento
✔ avisoMovimentoSumiu
✔ avisoTotalDiferente mostra os dois números
✔ avisoExecucaoFaltou diz a hora e o dia
✔ avisoExecucaoPulada leva na chave a execução que segurava a trava
✔ TITULOS e O_QUE_FAZER têm um texto para cada tipo de aviso, na ordem do resumo
```

Se algum falhar, não mude o teste: os textos e as chaves são os do contrato, e os exemplos do documento apagado e do fechamento são os da spec (seção 7.2).

- [ ] **Passo 10: Atualizar `testes-esperados.txt` (N = 31: 16 em `janela.test.mts` e 15 em `avisos.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+31;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 31.

- [ ] **Passo 11: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 12: Commit**

```bash
git add tradutor/constantes.mts tradutor/carga.mts tradutor/janela.mts tradutor/janela.test.mts tradutor/avisos.mts tradutor/avisos.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Hora de Fortaleza, leituras que faltaram e textos dos avisos

O Kaizen passa a saber que dia e que hora é na loja, qualquer que seja o
fuso da máquina: 01h30 em UTC ainda é 22h30 do dia anterior em Fortaleza.

A leitura de hora em hora começa ontem ou, se a noite anterior falhou, na
última noite boa. Na segunda-feira começa no sábado, e sem nenhuma noite
registrada começa em 27/09. A lista das leituras que faltaram segue o
horário da loja: das 8h às 19h e às 22h, de segunda a sábado. Uma parada
do sábado 12h à segunda 9h lista nove horários e nenhum no domingo.
Depois das 22h de sábado, a próxima leitura é segunda às 8h.

Cada aviso ganha o seu texto e uma chave que impede repetir o mesmo aviso
no resumo das 22h. O documento apagado sai como "o pedido 123 de 29/09
(R$ 150,00, vendedor Igor) sumiu do ERP". O valor em reais é arredondado
meio-par sem passar por número do JavaScript: R$ 12.345.678.901.234,12
sai exato.

O limiar de 20 documentos que protege a limpeza dos apagados passa a
morar num lugar só, junto das outras constantes; os 11 testes da carga
de apagados, estoque e cadastros continuam passando.

31 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit sai.

---

### Tarefa 11: Conferências

**O que esta tarefa entrega, em resultado:** as quatro conferências que o Kaizen faz em si mesmo a cada execução, cada uma devolvendo avisos prontos para o registro e para o resumo das 22h:
- **Código sem tradução:** um código do ERP novo que o Kaizen não sabe o que significa (um modelo `ZZ`, uma forma de pagamento `9`, e também os que a spec deixou de fora de propósito: modelos `AM`, `EM` e `RU`, financeiro `E`, parcela `C`) vira um aviso, com quantas vezes apareceu.
- **Fechamento com linha de teste:** um fechamento de caixa (`FC`) que pegou uma das 30 linhas de conferência dos testes de 26/09 vira o aviso "o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável". Os ajustes de custo que já pegaram os números 98, 99 e 118 não avisam: não têm quebra de caixa.
- **Estoque que não bate:** para cada produto, o saldo esperado é o do último movimento (o de maior `oid`, não o de hora mais tarde), ou o da virada se não houve movimento, ou 0 se o produto nem estava na virada. Quando ele não bate com a foto do ERP, sai um aviso com o produto, o último movimento e a foto. É o registro de um saldo que mudou sem deixar linha, como no inventário "TESTE" de 26/09.
- **Leituras que faltaram:** um aviso para cada horário esperado que não aconteceu.

**Antes de começar:** rode a partir da raiz do repositório, com o Postgres local no ar (`docker compose up -d --wait`). Os testes criam e apagam um banco próprio (`criarBancoKaizen`) e nunca tocam no banco `kaizen`. As tarefas 1 a 10 precisam estar feitas; em particular, a migração `004_estoque_virada.sql` (tarefa 3) precisa existir, porque os testes de estoque usam o saldo real da virada (produto 60 = 3, produto 2138 = 48, produto 61 = 0). Commits no Git Bash.

**Arquivos:**
- Criar: `tradutor/conferencias.mts`
- Testar: `tradutor/conferencias.test.mts`
- Modificar: `testes-esperados.txt` (soma 13)

**Interfaces:**
- Consome:
  - `tradutor/banco.mts` (tarefa 1): `export type Cliente = pg.Client`; `export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>`. Com os parsers da tarefa 1, `numeric`, `bigint`, `count(*)`, `timestamp`, `timestamptz` e `date` chegam como texto; `count(*)::int` chega como `number`; `jsonb` já como objeto.
  - `tradutor/apoio-teste.mts` (tarefa 2): `export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }`; `export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>` (banco novo, conectado como `kaizen`, com todas as migrações aplicadas).
  - `tradutor/tipos.mts` (tarefa 2): `export type Aviso = { tipo: TipoAviso; chave: string; texto: string }`.
  - `tradutor/carga.mts` (tarefa 8): `export async function colocarEntrada(cliente: Cliente, assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros', partes: string[]): Promise<void>` e `export async function gravarDocumentos(cliente: Cliente): Promise<CargaDocumentos>`. `gravarDocumentos` deixa, até o commit da transação, a tabela temporária `pg_temp.doc_lido (origem_id text, j jsonb)`, com uma linha por documento lido (o `oid` em texto e o DocumentoErp inteiro, com `j->>'codigo'`, `j->>'modelo'`, `j->>'criado_em'` no formato `AAAA-MM-DDTHH:MM:SS`, com a fração de segundo só quando ela existe (ex.: `2026-09-28T14:05:03`, `2026-09-28T11:00:00.5`), sem fuso e `j->>'conferencia_abaixo_corte'`).
  - `tradutor/avisos.mts` (tarefa 10): `avisoCodigoSemTraducao(campo: string, codigo: string, quantidade: number): Aviso`, `avisoFechamentoComResto(codigo: string, criadoEm: string, origemId: string): Aviso`, `avisoEstoqueDiverge(produto: string, esperado: string, foto: string, ultimoOid: string | null): Aviso`, `avisoExecucaoFaltou(h: Horario): Aviso`.
  - `tradutor/janela.mts` (tarefa 10): `export type Horario = { data: string; hora: number }`.
  - Tabelas (tarefa 2): `kaizen.documento`, `documento_item`, `documento_pagamento`, `parcela`, `baixa`, `conferencia_caixa`, `estoque_movimento`, `estoque_atual`, `estoque_virada` (1.029 produtos da migração 004), `traducao` (48 linhas da migração 002: `tipo`, `situacao`, `movimento`, `financeiro`, `forma`, `status_parcela`, `status_baixa`, `sentido`).
- Produz (a tarefa 13 chama estas funções):
  ```ts
  // tradutor/conferencias.mts
  export async function codigosSemTraducao(cliente: Cliente): Promise<Aviso[]>
  // fonte meuerp: documento.modelo ('tipo'), documento.status ('situacao'), documento.movimento ('movimento'),
  // documento.financeiro ('financeiro'), documento_item.sentido ('sentido'), documento_pagamento.forma,
  // baixa.forma e conferencia_caixa.forma ('forma'), parcela.status ('status_parcela'), baixa.status ('status_baixa');
  // códigos não nulos sem linha em traducao; um aviso por (campo, codigo) com a contagem, em ordem de campo e código
  export async function fechamentosComResto(cliente: Cliente): Promise<Aviso[]>
  // dentro da transação da carga, depois de gravarDocumentos: linhas de pg_temp.doc_lido com modelo 'FC' e
  // (j->>'conferencia_abaixo_corte')::int > 0, em ordem de oid. Fora da transação, falha (a tabela não existe).
  export async function estoqueDiverge(cliente: Cliente): Promise<Aviso[]>
  // por produto da foto (estoque_atual, fonte meuerp) e por produto com movimento meuerp: esperado = saldo_depois do
  // movimento de maior origem_id::bigint; sem movimento, estoque_virada.quantidade; sem virada, 0. Avisa quando
  // esperado e foto diferem (comparação numeric); produto com movimento e sem foto avisa com foto 'sem foto';
  // um saldo vazio aparece como 'vazio'. Em ordem de produto.
  export function avisosDeFaltas(faltando: Horario[]): Aviso[]
  ```

**Por que o código é assim (para não "consertar" sem querer):**
- **Só `FC` avisa em `fechamentosComResto`.** A linha de conferência se liga ao documento pelo número (`_iddocumento`), que o suporte zerou em 26/09. Às 14h34 de 27/09, três das 30 linhas de teste (números 98, 99 e 118) já estavam penduradas em ajustes de custo novos (spec, anexo). Sem o filtro, toda noite sairia "o fechamento 98 ..." para um ajuste de custo, que não tem quebra de caixa.
- `fechamentosComResto` lê `pg_temp.doc_lido`, que só existe dentro da transação da carga (`on commit drop`). A tarefa 13 a chama logo depois de `gravarDocumentos`, na mesma `emTransacao`.
- **O último movimento é o de maior `oid`, comparado como número.** A ordem de gravação no ERP é a do `oid`, e não a de `momento`: o caixa sem internet e o orçamento convertido gravam movimento novo com hora antiga (spec 5.2). E `origem_id` é texto: sem `::bigint`, `'9999'` ganharia de `'10000'`.
- A comparação é em `numeric` (`is distinct from`): `47` e `47.000000` são o mesmo saldo.
- A chave do aviso de estoque leva o último movimento e a foto. O mesmo produto, com o mesmo último movimento e a mesma foto, é o mesmo aviso, e no resumo seguinte vira "continuam N avisos já informados".
- `order by ... collate "C"`: a ordem não depende do idioma configurado no Postgres.
- A contagem do código sem tradução é de todo o Kaizen, não só desta execução. A chave (`codigo:tipo:ZZ`) não muda quando a contagem cresce.

- [ ] **Passo 1: Escrever o teste que falha**

Crie `tradutor/conferencias.test.mts`:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { emTransacao } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import { codigosSemTraducao, fechamentosComResto, estoqueDiverge, avisosDeFaltas } from './conferencias.mts'

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.cliente.query('delete from kaizen.documento')
  await banco.cliente.query('delete from kaizen.estoque_movimento')
  await banco.cliente.query('delete from kaizen.estoque_atual')
})

async function inserirDocumento(
  fonte: 'meuerp' | 'link', origemId: string, modelo: string,
  status: string | null, movimento: string | null, financeiro: string | null,
): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
     values ($1, 'documento', $2, $2, $3, $4, $5, $6, '2026-09-29 10:00:00') returning id`,
    [fonte, origemId, modelo, status, movimento, financeiro],
  )
  return r.rows[0].id
}

async function inserirItem(documentoId: string, origemId: string, sentido: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido)
     values ($1, 'documento_mercadoria', $2, $3, '60', 1, 10.00)`,
    [documentoId, origemId, sentido],
  )
}

async function inserirPagamento(documentoId: string, origemId: string, forma: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
     values ($1, 'documento_pagamento', $2, $3, 10.00)`,
    [documentoId, origemId, forma],
  )
}

async function inserirConferencia(documentoId: string, origemId: string, forma: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, 58.00, 20.00)`,
    [documentoId, origemId, forma],
  )
}

async function inserirParcela(documentoId: string, origemId: string, status: string | null): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, valor, status)
     values ($1, 'documento_parcela', $2, 10.00, $3) returning id`,
    [documentoId, origemId, status],
  )
  return r.rows[0].id
}

async function inserirBaixa(parcelaId: string, origemId: string, forma: string | null, status: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
     values ($1, 'documento_parcela_pagamento', $2, '2026-09-29', 10.00, $3, $4)`,
    [parcelaId, origemId, forma, status],
  )
}

async function inserirMovimento(origemId: string, produto: string, momento: string, saldoAntes: string, saldoDepois: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois)
     values ('meuerp', 'mercadoria_estoque_historico', $1, $2, '1', $3, $4, $5)`,
    [origemId, produto, momento, saldoAntes, saldoDepois],
  )
}

async function inserirFoto(fonte: 'meuerp' | 'link', produto: string, quantidade: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.estoque_atual (fonte, produto, quantidade) values ($1, $2, $3)
     on conflict (fonte, produto) do update set quantidade = excluded.quantidade`,
    [fonte, produto, quantidade],
  )
}

// Um documento no formato em que o ERP o devolve (DocumentoErp, contrato seção 6), com as listas vazias.
function documentoErp(oid: number, codigo: number, modelo: string, conferenciaAbaixoCorte: number) {
  return {
    oid, codigo, modelo, status: 'E', movimento: 'N', financeiro: 'N',
    criado_em: '2026-09-29T18:00:00.000000', fechado_em: '2026-09-29T18:00:00.000000', pessoa: null,
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 3,
    itens: [], pagamentos: [], parcelas: [], conferencia: [],
    conferencia_abaixo_corte: conferenciaAbaixoCorte,
  }
}

test('codigosSemTraducao acha o modelo ZZ e a forma 9 com a contagem, e ignora traduzidos, vazios e os da Link', async () => {
  const a = await inserirDocumento('meuerp', '185', 'ZZ', 'E', 'S', 'R')
  await inserirItem(a, '1873', 'S')
  await inserirPagamento(a, '1', '9')
  await inserirPagamento(a, '2', '1')
  const b = await inserirDocumento('meuerp', '186', 'ZZ', null, null, null)
  await inserirItem(b, '1874', null)
  await inserirConferencia(b, '31', '9')
  await inserirConferencia(b, '32', '5')
  const c = await inserirDocumento('meuerp', '187', 'CP', 'E', 'N', 'P')
  const parcela = await inserirParcela(c, '1', 'P')
  await inserirBaixa(parcela, '1', '9', 'E')
  await inserirBaixa(parcela, '2', null, null)
  const daLink = await inserirDocumento('link', '9001', 'XX', 'Q', null, null)
  await inserirPagamento(daLink, '3', '77')

  assert.deepEqual(await codigosSemTraducao(banco.cliente), [
    {
      tipo: 'codigo_sem_traducao',
      chave: 'codigo:forma:9',
      texto: 'o código "9" de forma apareceu 3 vez(es) e não tem tradução no Kaizen',
    },
    {
      tipo: 'codigo_sem_traducao',
      chave: 'codigo:tipo:ZZ',
      texto: 'o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen',
    },
  ])
})

test('codigosSemTraducao avisa os códigos deixados de fora de propósito: modelos AM e RU, financeiro E, parcela C, baixa X', async () => {
  const a = await inserirDocumento('meuerp', '185', 'AM', 'E', 'N', 'E')
  const parcela = await inserirParcela(a, '1', 'C')
  await inserirBaixa(parcela, '1', '1', 'X')
  await inserirDocumento('meuerp', '186', 'RU', 'E', 'N', 'N')

  const avisos = await codigosSemTraducao(banco.cliente)
  assert.deepEqual(avisos.map((a) => a.chave), [
    'codigo:financeiro:E',
    'codigo:status_baixa:X',
    'codigo:status_parcela:C',
    'codigo:tipo:AM',
    'codigo:tipo:RU',
  ])
})

test('codigosSemTraducao sem código novo não avisa nada', async () => {
  const a = await inserirDocumento('meuerp', '185', 'PA', 'E', 'S', 'R')
  await inserirItem(a, '1873', 'S')
  await inserirPagamento(a, '1', '1')
  await inserirPagamento(a, '2', '2')
  const fc = await inserirDocumento('meuerp', '186', 'FC', 'E', 'N', 'N')
  await inserirConferencia(fc, '31', '5')
  const tm = await inserirDocumento('meuerp', '187', 'TM', 'E', 'E', 'P')
  const parcela = await inserirParcela(tm, '1', 'B')
  await inserirBaixa(parcela, '1', '1', 'C')
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])
})

test('fechamentosComResto, dentro da transação da carga, avisa o fechamento com 2 linhas de conferência de teste', async () => {
  const avisos = await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([
      documentoErp(230, 118, 'FC', 2),
      documentoErp(231, 140, 'FC', 0),
      documentoErp(232, 141, 'PA', 0),
    ])])
    await gravarDocumentos(banco.cliente)
    return fechamentosComResto(banco.cliente)
  })
  assert.deepEqual(avisos, [{
    tipo: 'fechamento_com_resto',
    chave: 'fechamento:230',
    texto: 'o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável',
  }])
})

test('fechamentosComResto não avisa o ajuste de custo que pegou o número 98 de um resto de teste', async () => {
  const avisos = await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([documentoErp(189, 98, 'AC', 3)])])
    await gravarDocumentos(banco.cliente)
    return fechamentosComResto(banco.cliente)
  })
  assert.deepEqual(avisos, [])
})

test('fechamentosComResto fora da transação da carga falha: os documentos lidos só existem até o commit', async () => {
  await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([documentoErp(230, 118, 'FC', 2)])])
    await gravarDocumentos(banco.cliente)
  })
  await assert.rejects(fechamentosComResto(banco.cliente), /relation "pg_temp\.doc_lido" does not exist/)
})

test('estoqueDiverge: o último movimento que bate com a foto não avisa, mesmo com outra quantidade de casas', async () => {
  await inserirMovimento('1848', '2138', '2026-09-28 10:00:00', '48.000000', '47.000000')
  await inserirFoto('meuerp', '2138', '47')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [])
})

test('estoqueDiverge: o último movimento que não bate com a foto avisa com o produto, o movimento e a foto', async () => {
  await inserirMovimento('1848', '2138', '2026-09-28 10:00:00', '48.000000', '47.000000')
  await inserirMovimento('1900', '2138', '2026-09-28 15:48:00', '-9.000000', '-10.000000')
  await inserirFoto('meuerp', '2138', '-9.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:2138:1900:-9.000000',
    texto: 'o saldo do produto 2138 no ERP (-9.000000) não bate com os movimentos (-10.000000)',
  }])
})

test('estoqueDiverge: sem movimento, vale o saldo da virada (produto 60 tinha 3)', async () => {
  await inserirFoto('meuerp', '2138', '48.000000')
  await inserirFoto('meuerp', '61', '0')
  await inserirFoto('link', '60', '999')
  await inserirFoto('meuerp', '60', '3')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [])

  // o saldo mudou no ERP sem deixar linha no histórico, como no inventário "TESTE" de 26/09
  await inserirFoto('meuerp', '60', '0.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:60:virada:0.000000',
    texto: 'o saldo do produto 60 no ERP (0.000000) não bate com os movimentos (3.000000)',
  }])
})

test('estoqueDiverge: fora da virada e sem movimento, o saldo esperado é 0', async () => {
  await inserirFoto('meuerp', '99999', '0.000000')
  await inserirFoto('meuerp', '88888', '2.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:88888:virada:2.000000',
    texto: 'o saldo do produto 88888 no ERP (2.000000) não bate com os movimentos (0)',
  }])
})

test('estoqueDiverge: o último movimento é o de maior oid, não o de maior momento', async () => {
  // o 10000 foi gravado depois, com a hora antiga do orçamento; 9999 viria antes em ordem de texto
  await inserirMovimento('9999', '5278', '2026-09-28 15:48:00', '0.000000', '-1.000000')
  await inserirMovimento('10000', '5278', '2026-09-28 15:09:00', '-1.000000', '-2.000000')
  await inserirFoto('meuerp', '5278', '-2.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [])

  await inserirFoto('meuerp', '5278', '-1.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:5278:10000:-1.000000',
    texto: 'o saldo do produto 5278 no ERP (-1.000000) não bate com os movimentos (-2.000000)',
  }])
})

test('estoqueDiverge: produto com movimento e sem foto avisa com "sem foto"', async () => {
  await inserirMovimento('1849', '1418', '2026-09-28 11:00:00', '0.000000', '-1.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:1418:1849:sem foto',
    texto: 'o saldo do produto 1418 no ERP (sem foto) não bate com os movimentos (-1.000000)',
  }])
})

test('avisosDeFaltas dá um aviso por horário que não aconteceu', () => {
  assert.deepEqual(avisosDeFaltas([]), [])
  assert.deepEqual(avisosDeFaltas([{ data: '2026-09-29', hora: 22 }, { data: '2026-09-30', hora: 8 }]), [
    { tipo: 'execucao_faltou', chave: 'faltou:2026-09-29:22', texto: 'a leitura das 22h de 29/09 não aconteceu' },
    { tipo: 'execucao_faltou', chave: 'faltou:2026-09-30:8', texto: 'a leitura das 8h de 30/09 não aconteceu' },
  ])
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Run: `node --test tradutor/conferencias.test.mts`
Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\conferencias.mts' imported from <repositório>\tradutor\conferencias.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 3: Criar `tradutor/conferencias.mts`**

```ts
import type { Cliente } from './banco.mts'
import type { Horario } from './janela.mts'
import type { Aviso } from './tipos.mts'
import {
  avisoCodigoSemTraducao, avisoEstoqueDiverge, avisoExecucaoFaltou, avisoFechamentoComResto,
} from './avisos.mts'

// Cada código cru do ERP novo e o campo de kaizen.traducao que o explica.
const SQL_CODIGOS_SEM_TRADUCAO = `
with documento_erp as (
  select id from kaizen.documento where fonte = 'meuerp'
),
achado (campo, codigo) as (
  select 'tipo', d.modelo from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'situacao', d.status from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'movimento', d.movimento from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'financeiro', d.financeiro from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'sentido', i.sentido from kaizen.documento_item i join documento_erp d on d.id = i.documento_id
  union all
  select 'forma', p.forma from kaizen.documento_pagamento p join documento_erp d on d.id = p.documento_id
  union all
  select 'forma', c.forma from kaizen.conferencia_caixa c join documento_erp d on d.id = c.documento_id
  union all
  select 'status_parcela', pa.status from kaizen.parcela pa join documento_erp d on d.id = pa.documento_id
  union all
  select b.campo, b.codigo
  from kaizen.baixa x
  join kaizen.parcela pa on pa.id = x.parcela_id
  join documento_erp d on d.id = pa.documento_id
  cross join lateral (values ('forma', x.forma), ('status_baixa', x.status)) b (campo, codigo)
)
select c.campo, c.codigo, count(*)::int as quantidade
from achado c
where c.codigo is not null
  and not exists (
    select 1 from kaizen.traducao t
    where t.fonte = 'meuerp' and t.campo = c.campo and t.codigo = c.codigo
  )
group by c.campo, c.codigo
order by c.campo collate "C", c.codigo collate "C"`

export async function codigosSemTraducao(cliente: Cliente): Promise<Aviso[]> {
  const r = await cliente.query<{ campo: string; codigo: string; quantidade: number }>(SQL_CODIGOS_SEM_TRADUCAO)
  return r.rows.map((l) => avisoCodigoSemTraducao(l.campo, l.codigo, l.quantidade))
}

// Roda dentro da transação da carga, depois de gravarDocumentos: pg_temp.doc_lido só existe até o commit.
// Só o fechamento (FC) avisa: os números 98, 99 e 118 dos restos de 26/09 também caem em ajustes de custo (AC),
// que não têm quebra de caixa.
export async function fechamentosComResto(cliente: Cliente): Promise<Aviso[]> {
  const r = await cliente.query<{ origem_id: string; codigo: string; criado_em: string }>(`
    select l.origem_id, l.j->>'codigo' as codigo, l.j->>'criado_em' as criado_em
    from pg_temp.doc_lido l
    where l.j->>'modelo' = 'FC' and (l.j->>'conferencia_abaixo_corte')::int > 0
    order by l.origem_id::bigint`)
  return r.rows.map((l) => avisoFechamentoComResto(l.codigo, l.criado_em, l.origem_id))
}

// O último movimento de um produto é o de maior oid (ordem de gravação no ERP), não o de maior momento:
// o caixa sem internet e o orçamento convertido gravam movimento novo com hora antiga.
const SQL_ESTOQUE_DIVERGE = `
with ultimo as (
  select distinct on (m.produto) m.produto, m.origem_id, m.saldo_depois
  from kaizen.estoque_movimento m
  where m.fonte = 'meuerp'
  order by m.produto, m.origem_id::bigint desc
),
foto as (
  select a.produto, a.quantidade from kaizen.estoque_atual a where a.fonte = 'meuerp'
),
comparado as (
  select
    coalesce(f.produto, u.produto) as produto,
    case when u.produto is not null then u.saldo_depois else coalesce(v.quantidade, 0) end as esperado,
    u.origem_id as ultimo_oid,
    f.produto is not null as tem_foto,
    f.quantidade as foto
  from foto f
  full join ultimo u on u.produto = f.produto
  left join kaizen.estoque_virada v on v.produto = coalesce(f.produto, u.produto)
)
select
  produto,
  coalesce(esperado::text, 'vazio') as esperado,
  case when tem_foto then coalesce(foto::text, 'vazio') else 'sem foto' end as foto,
  ultimo_oid
from comparado
where not tem_foto or esperado is distinct from foto
order by produto collate "C"`

export async function estoqueDiverge(cliente: Cliente): Promise<Aviso[]> {
  const r = await cliente.query<{ produto: string; esperado: string; foto: string; ultimo_oid: string | null }>(SQL_ESTOQUE_DIVERGE)
  return r.rows.map((l) => avisoEstoqueDiverge(l.produto, l.esperado, l.foto, l.ultimo_oid))
}

export function avisosDeFaltas(faltando: Horario[]): Aviso[] {
  return faltando.map(avisoExecucaoFaltou)
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Run: `node --test tradutor/conferencias.test.mts`
Expected: PASS, com as 13 linhas abaixo (os tempos variam; criar o banco leva de 0,5 a 6 s) e `ℹ pass 13`, `ℹ fail 0`:
```
✔ codigosSemTraducao acha o modelo ZZ e a forma 9 com a contagem, e ignora traduzidos, vazios e os da Link
✔ codigosSemTraducao avisa os códigos deixados de fora de propósito: modelos AM e RU, financeiro E, parcela C, baixa X
✔ codigosSemTraducao sem código novo não avisa nada
✔ fechamentosComResto, dentro da transação da carga, avisa o fechamento com 2 linhas de conferência de teste
✔ fechamentosComResto não avisa o ajuste de custo que pegou o número 98 de um resto de teste
✔ fechamentosComResto fora da transação da carga falha: os documentos lidos só existem até o commit
✔ estoqueDiverge: o último movimento que bate com a foto não avisa, mesmo com outra quantidade de casas
✔ estoqueDiverge: o último movimento que não bate com a foto avisa com o produto, o movimento e a foto
✔ estoqueDiverge: sem movimento, vale o saldo da virada (produto 60 tinha 3)
✔ estoqueDiverge: fora da virada e sem movimento, o saldo esperado é 0
✔ estoqueDiverge: o último movimento é o de maior oid, não o de maior momento
✔ estoqueDiverge: produto com movimento e sem foto avisa com "sem foto"
✔ avisosDeFaltas dá um aviso por horário que não aconteceu
```

Se "sem movimento, vale o saldo da virada" falhar com o produto 60 esperado em algo diferente de `3.000000`, a migração `004_estoque_virada.sql` da tarefa 3 não é a gerada do arquivo de medição: confira a tarefa 3 antes de mexer aqui. Se outro teste falhar, não mude o teste: ele descreve a spec (seções 5.2, 5.4 e 6.5).

Confira que nenhum banco de teste sobrou:

Run: `docker compose exec -T postgres psql -U postgres -At -c "select count(*) from pg_database where datname like 'kaizen_teste_%'"`
Expected: `0`

- [ ] **Passo 5: Atualizar `testes-esperados.txt` (N = 13, todos em `conferencias.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+13;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 13.

- [ ] **Passo 6: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 7: Commit**

```bash
git add tradutor/conferencias.mts tradutor/conferencias.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Conferências do Kaizen: códigos novos, fechamentos com teste e estoque

A cada execução o Kaizen passa a conferir a si mesmo e a devolver avisos
prontos para o registro e o resumo das 22h:

- código do ERP que o Kaizen não sabe traduzir, como um modelo ZZ ou uma
  forma de pagamento 9, com quantas vezes apareceu (inclusive os que a
  spec deixou de fora de propósito: AM, RU, financeiro E, parcela C);
- fechamento de caixa que pegou uma linha de conferência dos testes de
  26/09: "o fechamento 118 de 29/09 pode estar com a conferência de um
  teste de 26/09; a quebra desse turno não é confiável". Os ajustes de
  custo que pegaram os números 98, 99 e 118 não avisam, porque não têm
  quebra de caixa;
- produto cujo saldo no ERP não bate com os movimentos. Vale o último
  movimento gravado (e não o de hora mais tarde), depois o saldo da
  virada (o produto 60 tinha 3) e, fora da virada, zero. É o registro de
  um saldo que mudou sem deixar linha, como no inventário "TESTE";
- leitura esperada que não aconteceu.

13 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit sai.

---

### Tarefa 12: Registro e Telegram

**O que esta tarefa entrega, em resultado:**
- **Registro de cada execução** em `kaizen.execucao`, fora da transação da carga, para que a falha também fique gravada: início, fim, resultado, mensagem, contagens e avisos. Uma execução que morreu no meio vira falha ("interrompida antes de terminar") na execução seguinte. Uma execução que segura a trava além do prazo é achada.
- **O estado que decide as mensagens:** a última execução válida (sem as puladas), o início da última execução agendada (para achar as leituras que faltaram), o dia da última noite boa (para a janela de leitura) e a hora da última leitura boa ("os dados continuam os das 13h"). O dia e a hora saem em Fortaleza mesmo com o Postgres em UTC: a noite que começou às 22h30 é do dia 29, e não do 30.
- **As mensagens do Telegram**, em texto puro, uma frase dizendo o que fazer: "Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h." A falha avisa uma vez por queda e repete só se a mensagem anterior não chegou; a volta avisa uma vez. Sem o robô configurado, o texto só é impresso.
- **O resumo das 22h:** junta os avisos desde o último resumo, agrupa por tipo com até 5 exemplos, conta as repetições ("(3 vezes)"), põe numa linha só os que já foram informados ("Continuam 2 avisos já informados.") e nunca passa de 4.000 caracteres. Dia limpo não manda nada.

**Antes de começar:** rode a partir da raiz do repositório, com o Postgres local no ar (`docker compose up -d --wait`). Os testes de registro criam e apagam um banco próprio (`criarBancoKaizen`); os do Telegram usam um `fetch` falso e nunca falam com o Telegram de verdade. As tarefas 1 a 11 precisam estar feitas. Commits no Git Bash.

**Arquivos:**
- Criar: `tradutor/registro.mts`
- Testar: `tradutor/registro.test.mts`
- Criar: `tradutor/telegram.mts`
- Testar: `tradutor/telegram.test.mts`
- Modificar: `testes-esperados.txt` (soma 31)

**Interfaces:**
- Consome:
  - `tradutor/banco.mts` (tarefa 1): `export type Cliente = pg.Client`. Com os parsers da tarefa 1, `bigint` (o `id` da execução) e `timestamptz` chegam como texto; `integer` (e `::int`) como `number`; `boolean` como `true`/`false`; `jsonb` já como objeto (arrays e objetos do JS). Um array do JS passado cru como parâmetro vira array do Postgres, e não `jsonb`: por isso os parâmetros `jsonb` vão com `JSON.stringify` e `$n::jsonb`.
  - `tradutor/apoio-teste.mts` (tarefa 2): `export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }`; `export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>`.
  - `tradutor/tipos.mts` (tarefa 2): `TipoExecucao = 'hora' | 'noite'`; `Resultado = 'ok' | 'aviso' | 'falha' | 'pulada'`; `TipoAviso` (os 8 tipos, nesta ordem: `codigo_sem_traducao`, `documento_apagado`, `fechamento_com_resto`, `estoque_diverge`, `movimento_sumiu`, `total_diferente`, `execucao_faltou`, `execucao_pulada`); `Aviso = { tipo: TipoAviso; chave: string; texto: string }`; `TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'outra'`; `MotivoFalha = { tipo: TipoFalha; detalhe: string }`.
  - `tradutor/avisos.mts` (tarefa 10): `diaMes(dataOuTimestamp: string): string` (`'2026-09-29'` → `'29/09'`); `TITULOS: Record<TipoAviso, string>`; `O_QUE_FAZER: Record<TipoAviso, string>`.
  - Tabela `kaizen.execucao` (tarefa 2): `id bigint identity`, `tipo` ('hora'|'noite'), `manual boolean default false`, `inicio timestamptz default now()`, `fim timestamptz`, `resultado` ('ok'|'aviso'|'falha'|'pulada'), `mensagem text`, `contagens jsonb`, `avisos jsonb not null default '[]'`, `telegram_ok boolean`, `resumo_ok boolean not null default false`, `resumo_chaves jsonb`.
- Produz (a tarefa 13 usa exatamente isto):
  ```ts
  // tradutor/registro.mts
  export async function registrarInicio(cliente: Cliente, tipo: TipoExecucao, manual: boolean): Promise<number>
  export async function registrarFim(cliente: Cliente, id: number, r: { resultado: Resultado; mensagem?: string | null; contagens?: Record<string, number>; avisos: Aviso[] }): Promise<void>
  export async function registrarPulada(cliente: Cliente, tipo: TipoExecucao, manual: boolean, aviso: Aviso): Promise<void>
  export async function marcarInterrompidas(cliente: Cliente, idAtual: number): Promise<number>
  //   linhas com fim vazio e id <> idAtual viram resultado 'falha', mensagem 'interrompida antes de terminar', fim now(); devolve quantas
  export async function execucaoPresa(cliente: Cliente, prazoMin: number): Promise<{ id: number } | null>
  //   a linha mais recente com fim vazio e inicio < now() - prazoMin minutos
  export type Anterior = { id: number; resultado: 'ok' | 'aviso' | 'falha'; telegramOk: boolean | null }
  export async function anteriorValida(cliente: Cliente, idAtual: number | null): Promise<Anterior | null>
  //   última linha com resultado ok, aviso ou falha e id <> idAtual
  export async function ultimoInicioNaoManualMs(cliente: Cliente, idAtual: number | null): Promise<number | null>
  //   início (ms) da última linha não manual com id <> idAtual, de qualquer resultado (inclusive pulada)
  export async function ultimaNoiteBoa(cliente: Cliente): Promise<string | null>
  //   'AAAA-MM-DD' (Fortaleza) do início da última linha tipo 'noite' com resultado ok ou aviso
  export async function horaDaUltimaBoa(cliente: Cliente, idAtual: number | null): Promise<number | null>
  //   hora (Fortaleza) do início da última linha ok ou aviso com id <> idAtual
  export async function marcarTelegram(cliente: Cliente, id: number, ok: boolean | null): Promise<void>
  export async function avisosParaResumo(cliente: Cliente): Promise<{ avisos: Aviso[]; chavesAnteriores: string[] }>
  //   avisos de todas as linhas (de qualquer resultado) com id > id da última linha com resumo_ok, em ordem de id
  //   (todas, se nenhuma); chavesAnteriores = resumo_chaves daquela linha (ou [])
  export async function marcarResumo(cliente: Cliente, id: number, chaves: string[]): Promise<void>  // resumo_ok = true, resumo_chaves

  // tradutor/telegram.mts
  export type Enviar = (texto: string) => Promise<boolean | null>   // null = Telegram não configurado
  export function criarEnvioTelegram(token: string | undefined, chat: string | undefined, fetchFn?: typeof fetch): Enviar
  //   sem token ou chat: console.log(texto) e devolve null. Senão POST https://api.telegram.org/bot${token}/sendMessage,
  //   JSON { chat_id, text }, sem parse_mode, prazo 30 s; devolve json.ok === true; erro de rede ou resposta sem JSON → false.
  //   Nunca imprime o token.
  export function textoFalha(horaExecucao: number, motivo: MotivoFalha, horaUltimaBoa: number | null, proximo: string): string
  //   proximo já vem prefixado pela tarefa 13: 'às 15h' ou 'em 29/09 às 8h'
  export function textoVolta(horaExecucao: number): string              // `Kaizen: voltou a funcionar às ${h}h.`
  export function textoTeste(): string                                    // 'Kaizen: mensagem de teste. O aviso de falha chega por aqui.'
  export function deveAvisarFalha(anterior: Anterior | null): boolean     // anterior nula ou não falha, ou falha com telegramOk !== true
  export function deveAvisarVolta(resultadoAtual: Resultado, anterior: Anterior | null, faltaram: boolean): boolean // atual ok/aviso e (anterior falha ou faltaram)
  export function textoResumo(avisos: Aviso[], chavesAnteriores: string[], hoje: string): { texto: string | null; chaves: string[] }
  ```
  Textos de `textoFalha` (h = horaExecucao; u = horaUltimaBoa; o `—` é o travessão U+2014):

  | `motivo.tipo` | texto |
  | --- | --- |
  | `erp_fora` | ``Kaizen: a leitura das ${h}h falhou — o ERP não respondeu. ${u !== null ? `Os dados do Kaizen continuam os das ${u}h. ` : ''}Nada a fazer: ele tenta de novo ${proximo}.`` |
  | `token` | `Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.` |
  | `estrutura` | `Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: ${detalhe}` |
  | `banco_fora` | `Kaizen: a leitura das ${h}h falhou — o banco do Kaizen não respondeu.` |
  | `outra` | ``Kaizen: a leitura das ${h}h falhou — ${detalhe}. ${u !== null ? `Os dados do Kaizen continuam os das ${u}h. ` : ''}Abra uma sessão com o Claude e cole esta mensagem.`` |

  `detalhe` é `motivo.detalhe`; se passar de 3.000 caracteres, fica nos 3.000 primeiros seguidos de ` (…)`.

  `textoResumo`: sem avisos → `{ texto: null, chaves: [] }`. Senão, tira os duplicados por chave (contando as vezes e ficando com o texto mais recente), separa os que têm chave em `chavesAnteriores` (já informados) e monta `Kaizen — resumo de ${diaMes(hoje)}:`; depois, por tipo na ordem de `TipoAviso`, só com os novos, `\n${TITULOS[t]} (${n}) — ${O_QUE_FAZER[t]}:`, até 5 linhas `\n- ${texto}${vezes > 1 ? ` (${vezes} vezes)` : ''}` e `\n- e mais ${k}` se houver mais; no fim, se houver já informados, `\nContinuam ${m} avisos já informados.`. Acima de 4.000 caracteres, corta na última quebra de linha que cabe e termina com `\n(e mais; o detalhe está no registro da execução)`. `chaves` = todas as chaves distintas deste resumo (novas e já informadas), na ordem em que apareceram.

**Por que o código é assim (para não "consertar" sem querer):**
- Cada função de `registro.mts` é um comando só, sem transação própria: a tarefa 13 as chama fora da transação da carga, para a linha ficar gravada mesmo quando a carga é desfeita.
- `ultimaNoiteBoa` e `horaDaUltimaBoa` usam `at time zone 'America/Fortaleza'` explícito. A conexão do Kaizen já fixa o fuso, mas assim o dia e a hora saem certos mesmo numa sessão em UTC (o teste troca o fuso da sessão para provar).
- `anteriorValida`, `ultimoInicioNaoManualMs` e `horaDaUltimaBoa` aceitam `idAtual` nulo (`$1::bigint is null or id <> $1::bigint`): com `id <> null`, nenhuma linha passaria.
- `ultimoInicioNaoManualMs` pede os milissegundos ao Postgres (`(extract(epoch from inicio) * 1000)::bigint::text`) e só converte a contagem com `Number()`: nenhuma data passa por `Date`.
- O resumo das 22h também junta os avisos das linhas puladas e das que falharam: "junta os avisos de todas as execuções desde o último resumo enviado" (spec 7.2).
- `criarEnvioTelegram` não imprime nada no erro: a mensagem de erro do `fetch` pode trazer o endereço, e o endereço leva o token.
- `textoFalha` corta um `detalhe` enorme (o corpo de um erro 400 do ERP pode ter milhares de caracteres). Sem o corte, o Telegram recusaria a mensagem, e como a falha continua, a próxima execução tentaria de novo sem nunca chegar.
- O resumo corta numa quebra de linha, para nenhum aviso sair pela metade; o Telegram aceita até 4.096 caracteres, e o resumo fica em 4.000.
- Os textos, o travessão `—` e o `−` dos reais são exatos: os testes comparam caractere por caractere.

- [ ] **Passo 1: Escrever o teste do registro**

Crie `tradutor/registro.test.mts`:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import {
  registrarInicio, registrarFim, registrarPulada, marcarInterrompidas, execucaoPresa, anteriorValida,
  ultimoInicioNaoManualMs, ultimaNoiteBoa, horaDaUltimaBoa, marcarTelegram, avisosParaResumo, marcarResumo,
} from './registro.mts'
import type { Aviso } from './tipos.mts'

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.cliente.query('delete from kaizen.execucao')
})

type LinhaExecucao = {
  tipo?: 'hora' | 'noite'
  manual?: boolean
  inicio?: string
  fim?: string | null
  resultado?: 'ok' | 'aviso' | 'falha' | 'pulada' | null
  avisos?: Aviso[]
  telegramOk?: boolean | null
  resumoOk?: boolean
  resumoChaves?: string[] | null
}

// Uma linha de execucao escrita à mão. O início é um instante com fuso ('2026-09-29 17:00:00+00'); sem ele, agora.
// Sem fim informado, a linha termina no próprio início; com fim: null, fica sem fim (ainda rodando).
async function linha(l: LinhaExecucao): Promise<number> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, avisos, telegram_ok, resumo_ok, resumo_chaves)
     values ($1, $2, coalesce($3::timestamptz, now()),
             case when $10::boolean then null else coalesce($4::timestamptz, $3::timestamptz, now()) end,
             $5, $6::jsonb, $7, $8, $9::jsonb)
     returning id`,
    [
      l.tipo ?? 'hora',
      l.manual ?? false,
      l.inicio ?? null,
      l.fim ?? null,
      l.resultado === undefined ? 'ok' : l.resultado,
      JSON.stringify(l.avisos ?? []),
      l.telegramOk ?? null,
      l.resumoOk ?? false,
      l.resumoChaves ? JSON.stringify(l.resumoChaves) : null,
      l.fim === null,
    ],
  )
  return Number(r.rows[0].id)
}

async function ler(id: number): Promise<Record<string, unknown>> {
  const r = await banco.cliente.query(
    `select tipo, manual, fim is not null as terminou, resultado, mensagem, contagens, avisos, telegram_ok, resumo_ok, resumo_chaves
       from kaizen.execucao where id = $1`,
    [id],
  )
  return r.rows[0]
}

const avisoA: Aviso = { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:AM', texto: 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen' }
const avisoB: Aviso = { tipo: 'execucao_faltou', chave: 'faltou:2026-09-29:10', texto: 'a leitura das 10h de 29/09 não aconteceu' }
const avisoC: Aviso = { tipo: 'estoque_diverge', chave: 'estoque:60:virada:0', texto: 'o saldo do produto 60 no ERP (0) não bate com os movimentos (3.000000)' }

test('registrarInicio grava o tipo e se é manual, sem fim e sem resultado, e devolve o id', async () => {
  const hora = await registrarInicio(banco.cliente, 'hora', false)
  const noite = await registrarInicio(banco.cliente, 'noite', true)
  assert.equal(typeof hora, 'number')
  assert.ok(noite > hora)
  assert.deepEqual(await ler(hora), {
    tipo: 'hora', manual: false, terminou: false, resultado: null, mensagem: null, contagens: null,
    avisos: [], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
  assert.deepEqual(await ler(noite), {
    tipo: 'noite', manual: true, terminou: false, resultado: null, mensagem: null, contagens: null,
    avisos: [], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
})

test('registrarFim grava o fim, o resultado, a mensagem, as contagens e os avisos inteiros', async () => {
  const id = await registrarInicio(banco.cliente, 'hora', false)
  await registrarFim(banco.cliente, id, {
    resultado: 'aviso',
    mensagem: 'uma mensagem com "aspas" e acentuação',
    contagens: { documentos_lidos: 12, documentos_novos: 3, apagados: 0 },
    avisos: [avisoA, avisoB],
  })
  assert.deepEqual(await ler(id), {
    tipo: 'hora', manual: false, terminou: true, resultado: 'aviso', mensagem: 'uma mensagem com "aspas" e acentuação',
    contagens: { documentos_lidos: 12, documentos_novos: 3, apagados: 0 },
    avisos: [avisoA, avisoB], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
})

test('registrarFim sem mensagem e sem contagens deixa as duas vazias', async () => {
  const id = await registrarInicio(banco.cliente, 'noite', false)
  await registrarFim(banco.cliente, id, { resultado: 'ok', avisos: [] })
  const lido = await ler(id)
  assert.equal(lido.terminou, true)
  assert.equal(lido.resultado, 'ok')
  assert.equal(lido.mensagem, null)
  assert.equal(lido.contagens, null)
  assert.deepEqual(lido.avisos, [])
})

test('registrarPulada grava uma linha já terminada, com o aviso da pulada', async () => {
  const aviso: Aviso = { tipo: 'execucao_pulada', chave: 'pulada:41', texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' }
  await registrarPulada(banco.cliente, 'hora', true, aviso)
  const r = await banco.cliente.query('select id from kaizen.execucao')
  assert.equal(r.rows.length, 1)
  assert.deepEqual(await ler(Number(r.rows[0].id)), {
    tipo: 'hora', manual: true, terminou: true, resultado: 'pulada', mensagem: null, contagens: null,
    avisos: [aviso], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
})

test('marcarInterrompidas marca como falha as outras linhas sem fim e devolve quantas', async () => {
  const velha = await linha({ fim: null, resultado: null })
  const terminada = await linha({ resultado: 'ok' })
  const atual = await registrarInicio(banco.cliente, 'hora', false)
  assert.equal(await marcarInterrompidas(banco.cliente, atual), 1)
  const lida = await ler(velha)
  assert.equal(lida.resultado, 'falha')
  assert.equal(lida.mensagem, 'interrompida antes de terminar')
  assert.equal(lida.terminou, true)
  assert.equal((await ler(terminada)).resultado, 'ok')
  assert.equal((await ler(atual)).terminou, false)
  assert.equal(await marcarInterrompidas(banco.cliente, atual), 0)
})

test('execucaoPresa acha só a linha sem fim que começou antes do prazo', async () => {
  assert.equal(await execucaoPresa(banco.cliente, 10), null)
  await banco.cliente.query(`insert into kaizen.execucao (tipo, inicio) values ('hora', now() - interval '5 minutes')`)
  assert.equal(await execucaoPresa(banco.cliente, 10), null)
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.execucao (tipo, inicio) values ('noite', now() - interval '31 minutes') returning id`,
  )
  assert.deepEqual(await execucaoPresa(banco.cliente, 30), { id: Number(r.rows[0].id) })
  await banco.cliente.query(`insert into kaizen.execucao (tipo, inicio, fim, resultado) values ('hora', now() - interval '2 hours', now(), 'ok')`)
  assert.deepEqual(await execucaoPresa(banco.cliente, 30), { id: Number(r.rows[0].id) })
})

test('anteriorValida pega a última ok, aviso ou falha, pulando as puladas e a execução atual', async () => {
  assert.equal(await anteriorValida(banco.cliente, null), null)
  const falha = await linha({ resultado: 'falha', telegramOk: true })
  await linha({ resultado: 'pulada' })
  const atual = await registrarInicio(banco.cliente, 'hora', false)
  assert.deepEqual(await anteriorValida(banco.cliente, atual), { id: falha, resultado: 'falha', telegramOk: true })
  await registrarFim(banco.cliente, atual, { resultado: 'aviso', avisos: [] })
  assert.deepEqual(await anteriorValida(banco.cliente, null), { id: atual, resultado: 'aviso', telegramOk: null })
  assert.deepEqual(await anteriorValida(banco.cliente, atual), { id: falha, resultado: 'falha', telegramOk: true })
})

test('ultimoInicioNaoManualMs devolve o início da última não manual, de qualquer resultado, sem a atual', async () => {
  assert.equal(await ultimoInicioNaoManualMs(banco.cliente, null), null)
  await linha({ inicio: '2026-09-29 16:00:00.123+00', resultado: 'ok' })
  await linha({ inicio: '2026-09-29 17:00:00.456+00', resultado: 'pulada' })
  await linha({ inicio: '2026-09-29 17:37:00+00', manual: true, resultado: 'ok' })
  const atual = await linha({ inicio: '2026-09-29 18:00:00+00', fim: null, resultado: null })
  assert.equal(await ultimoInicioNaoManualMs(banco.cliente, atual), Date.parse('2026-09-29T17:00:00.456Z'))
  assert.equal(await ultimoInicioNaoManualMs(banco.cliente, null), Date.parse('2026-09-29T18:00:00Z'))
})

test('ultimaNoiteBoa devolve o dia de Fortaleza da última noite ok ou aviso, mesmo começada às 22h30 (01h30 em UTC)', async () => {
  assert.equal(await ultimaNoiteBoa(banco.cliente), null)
  await linha({ tipo: 'noite', inicio: '2026-09-29 01:30:00+00', resultado: 'ok' })
  await linha({ tipo: 'noite', inicio: '2026-09-30 01:30:00+00', resultado: 'aviso' })
  await linha({ tipo: 'noite', inicio: '2026-10-01 01:30:00+00', resultado: 'falha' })
  await linha({ tipo: 'hora', inicio: '2026-10-01 11:00:00+00', resultado: 'ok' })
  assert.equal(await ultimaNoiteBoa(banco.cliente), '2026-09-29')
  // com a sessão do Postgres em UTC, o dia continua o de Fortaleza
  await banco.cliente.query(`set time zone 'UTC'`)
  try {
    assert.equal(await ultimaNoiteBoa(banco.cliente), '2026-09-29')
  } finally {
    await banco.cliente.query(`set time zone 'America/Fortaleza'`)
  }
})

test('horaDaUltimaBoa devolve a hora de Fortaleza da última ok ou aviso, sem a atual', async () => {
  assert.equal(await horaDaUltimaBoa(banco.cliente, null), null)
  await linha({ inicio: '2026-09-29 16:00:02+00', resultado: 'aviso' })
  await linha({ inicio: '2026-09-29 17:00:02+00', resultado: 'falha' })
  await linha({ inicio: '2026-09-29 17:30:00+00', resultado: 'pulada' })
  const atual = await linha({ inicio: '2026-09-29 18:00:02+00', resultado: 'ok' })
  assert.equal(await horaDaUltimaBoa(banco.cliente, atual), 13)
  assert.equal(await horaDaUltimaBoa(banco.cliente, null), 15)
  await banco.cliente.query(`set time zone 'UTC'`)
  try {
    assert.equal(await horaDaUltimaBoa(banco.cliente, atual), 13)
  } finally {
    await banco.cliente.query(`set time zone 'America/Fortaleza'`)
  }
})

test('marcarTelegram grava se a mensagem foi aceita, recusada ou não foi mandada', async () => {
  const id = await registrarInicio(banco.cliente, 'hora', false)
  await marcarTelegram(banco.cliente, id, true)
  assert.equal((await ler(id)).telegram_ok, true)
  await marcarTelegram(banco.cliente, id, false)
  assert.equal((await ler(id)).telegram_ok, false)
  await marcarTelegram(banco.cliente, id, null)
  assert.equal((await ler(id)).telegram_ok, null)
})

test('avisosParaResumo junta os avisos desde o último resumo enviado e devolve as chaves dele', async () => {
  // sem resumo nenhum: todos os avisos, e nenhuma chave anterior
  await linha({ avisos: [avisoA] })
  await linha({ avisos: [avisoB, avisoC] })
  assert.deepEqual(await avisosParaResumo(banco.cliente), { avisos: [avisoA, avisoB, avisoC], chavesAnteriores: [] })

  await linha({ tipo: 'noite', avisos: [avisoC], resumoOk: true, resumoChaves: ['codigo:tipo:AM', 'estoque:60:virada:0'] })
  await linha({ avisos: [avisoA], resultado: 'aviso' })
  await linha({ resultado: 'pulada', avisos: [{ tipo: 'execucao_pulada', chave: 'pulada:9', texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' }] })
  await linha({ tipo: 'noite', resultado: 'falha', avisos: [avisoC] })
  assert.deepEqual(await avisosParaResumo(banco.cliente), {
    avisos: [
      avisoA,
      { tipo: 'execucao_pulada', chave: 'pulada:9', texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' },
      avisoC,
    ],
    chavesAnteriores: ['codigo:tipo:AM', 'estoque:60:virada:0'],
  })
})

test('marcarResumo marca o resumo como enviado e guarda as chaves, e o próximo resumo começa depois dele', async () => {
  const id = await linha({ tipo: 'noite', avisos: [avisoA, avisoB] })
  await marcarResumo(banco.cliente, id, ['codigo:tipo:AM', 'faltou:2026-09-29:10'])
  const lido = await ler(id)
  assert.equal(lido.resumo_ok, true)
  assert.deepEqual(lido.resumo_chaves, ['codigo:tipo:AM', 'faltou:2026-09-29:10'])
  assert.deepEqual(await avisosParaResumo(banco.cliente), { avisos: [], chavesAnteriores: ['codigo:tipo:AM', 'faltou:2026-09-29:10'] })

  const limpo = await linha({ tipo: 'noite' })
  await marcarResumo(banco.cliente, limpo, [])
  assert.deepEqual(await avisosParaResumo(banco.cliente), { avisos: [], chavesAnteriores: [] })
})
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Run: `node --test tradutor/registro.test.mts`
Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\registro.mts' imported from <repositório>\tradutor\registro.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 3: Criar `tradutor/registro.mts`**

```ts
import type { Cliente } from './banco.mts'
import type { Aviso, Resultado, TipoExecucao } from './tipos.mts'

// Cada função faz um comando só, fora da transação da carga: a linha de execucao fica gravada mesmo quando a carga falha.

export async function registrarInicio(cliente: Cliente, tipo: TipoExecucao, manual: boolean): Promise<number> {
  const r = await cliente.query<{ id: string }>(
    'insert into kaizen.execucao (tipo, manual) values ($1, $2) returning id',
    [tipo, manual],
  )
  return Number(r.rows[0].id)
}

export async function registrarFim(
  cliente: Cliente,
  id: number,
  r: { resultado: Resultado; mensagem?: string | null; contagens?: Record<string, number>; avisos: Aviso[] },
): Promise<void> {
  // jsonb vai como texto JSON: um array passado cru ao pg viraria array do Postgres, não jsonb
  await cliente.query(
    `update kaizen.execucao
        set fim = now(), resultado = $2, mensagem = $3, contagens = $4::jsonb, avisos = $5::jsonb
      where id = $1`,
    [id, r.resultado, r.mensagem ?? null, r.contagens === undefined ? null : JSON.stringify(r.contagens), JSON.stringify(r.avisos)],
  )
}

export async function registrarPulada(cliente: Cliente, tipo: TipoExecucao, manual: boolean, aviso: Aviso): Promise<void> {
  await cliente.query(
    `insert into kaizen.execucao (tipo, manual, fim, resultado, avisos)
     values ($1, $2, now(), 'pulada', $3::jsonb)`,
    [tipo, manual, JSON.stringify([aviso])],
  )
}

export async function marcarInterrompidas(cliente: Cliente, idAtual: number): Promise<number> {
  const r = await cliente.query(
    `update kaizen.execucao
        set resultado = 'falha', mensagem = 'interrompida antes de terminar', fim = now()
      where fim is null and id <> $1`,
    [idAtual],
  )
  return r.rowCount ?? 0
}

export async function execucaoPresa(cliente: Cliente, prazoMin: number): Promise<{ id: number } | null> {
  const r = await cliente.query<{ id: string }>(
    `select id from kaizen.execucao
      where fim is null and inicio < now() - make_interval(mins => $1::int)
      order by id desc limit 1`,
    [prazoMin],
  )
  return r.rows.length === 0 ? null : { id: Number(r.rows[0].id) }
}

export type Anterior = { id: number; resultado: 'ok' | 'aviso' | 'falha'; telegramOk: boolean | null }

export async function anteriorValida(cliente: Cliente, idAtual: number | null): Promise<Anterior | null> {
  const r = await cliente.query<{ id: string; resultado: 'ok' | 'aviso' | 'falha'; telegram_ok: boolean | null }>(
    `select id, resultado, telegram_ok from kaizen.execucao
      where resultado in ('ok', 'aviso', 'falha') and ($1::bigint is null or id <> $1::bigint)
      order by id desc limit 1`,
    [idAtual],
  )
  if (r.rows.length === 0) return null
  const l = r.rows[0]
  return { id: Number(l.id), resultado: l.resultado, telegramOk: l.telegram_ok }
}

export async function ultimoInicioNaoManualMs(cliente: Cliente, idAtual: number | null): Promise<number | null> {
  const r = await cliente.query<{ ms: string }>(
    `select (extract(epoch from inicio) * 1000)::bigint::text as ms from kaizen.execucao
      where not manual and ($1::bigint is null or id <> $1::bigint)
      order by id desc limit 1`,
    [idAtual],
  )
  return r.rows.length === 0 ? null : Number(r.rows[0].ms)
}

// "at time zone" explícito: a data e a hora saem em Fortaleza mesmo se a sessão estiver em outro fuso.
export async function ultimaNoiteBoa(cliente: Cliente): Promise<string | null> {
  const r = await cliente.query<{ data: string }>(
    `select to_char(inicio at time zone 'America/Fortaleza', 'YYYY-MM-DD') as data from kaizen.execucao
      where tipo = 'noite' and resultado in ('ok', 'aviso')
      order by id desc limit 1`,
  )
  return r.rows.length === 0 ? null : r.rows[0].data
}

export async function horaDaUltimaBoa(cliente: Cliente, idAtual: number | null): Promise<number | null> {
  const r = await cliente.query<{ hora: number }>(
    `select extract(hour from inicio at time zone 'America/Fortaleza')::int as hora from kaizen.execucao
      where resultado in ('ok', 'aviso') and ($1::bigint is null or id <> $1::bigint)
      order by id desc limit 1`,
    [idAtual],
  )
  return r.rows.length === 0 ? null : r.rows[0].hora
}

export async function marcarTelegram(cliente: Cliente, id: number, ok: boolean | null): Promise<void> {
  await cliente.query('update kaizen.execucao set telegram_ok = $2 where id = $1', [id, ok])
}

export async function avisosParaResumo(cliente: Cliente): Promise<{ avisos: Aviso[]; chavesAnteriores: string[] }> {
  const ultimo = await cliente.query<{ id: string; resumo_chaves: string[] | null }>(
    'select id, resumo_chaves from kaizen.execucao where resumo_ok order by id desc limit 1',
  )
  const desde = ultimo.rows.length === 0 ? '0' : ultimo.rows[0].id
  const r = await cliente.query<{ avisos: Aviso[] }>(
    'select avisos from kaizen.execucao where id > $1::bigint order by id',
    [desde],
  )
  return {
    avisos: r.rows.flatMap((l) => l.avisos),
    chavesAnteriores: ultimo.rows[0]?.resumo_chaves ?? [],
  }
}

export async function marcarResumo(cliente: Cliente, id: number, chaves: string[]): Promise<void> {
  await cliente.query(
    'update kaizen.execucao set resumo_ok = true, resumo_chaves = $2::jsonb where id = $1',
    [id, JSON.stringify(chaves)],
  )
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Run: `node --test tradutor/registro.test.mts`
Expected: PASS, com as 13 linhas abaixo (os tempos variam) e `ℹ pass 13`, `ℹ fail 0`:
```
✔ registrarInicio grava o tipo e se é manual, sem fim e sem resultado, e devolve o id
✔ registrarFim grava o fim, o resultado, a mensagem, as contagens e os avisos inteiros
✔ registrarFim sem mensagem e sem contagens deixa as duas vazias
✔ registrarPulada grava uma linha já terminada, com o aviso da pulada
✔ marcarInterrompidas marca como falha as outras linhas sem fim e devolve quantas
✔ execucaoPresa acha só a linha sem fim que começou antes do prazo
✔ anteriorValida pega a última ok, aviso ou falha, pulando as puladas e a execução atual
✔ ultimoInicioNaoManualMs devolve o início da última não manual, de qualquer resultado, sem a atual
✔ ultimaNoiteBoa devolve o dia de Fortaleza da última noite ok ou aviso, mesmo começada às 22h30 (01h30 em UTC)
✔ horaDaUltimaBoa devolve a hora de Fortaleza da última ok ou aviso, sem a atual
✔ marcarTelegram grava se a mensagem foi aceita, recusada ou não foi mandada
✔ avisosParaResumo junta os avisos desde o último resumo enviado e devolve as chaves dele
✔ marcarResumo marca o resumo como enviado e guarda as chaves, e o próximo resumo começa depois dele
```

- [ ] **Passo 5: Escrever o teste do Telegram**

Crie `tradutor/telegram.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  criarEnvioTelegram, textoFalha, textoVolta, textoTeste, deveAvisarFalha, deveAvisarVolta, textoResumo,
} from './telegram.mts'
import type { Anterior } from './registro.mts'
import type { Aviso, Resultado, TipoAviso } from './tipos.mts'

const TOKEN = '123456:segredo-do-robo'

type Chamada = { url: string; init: RequestInit }

// fetch falso: guarda cada chamada e responde o que o teste mandar; nunca sai para a internet.
function fetchFalso(responder: () => Promise<Response>): { fetchFn: typeof fetch; chamadas: Chamada[] } {
  const chamadas: Chamada[] = []
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(url), init: init ?? {} })
    return responder()
  }) as typeof fetch
  return { fetchFn, chamadas }
}

function respostaJson(corpo: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))
}

test('criarEnvioTelegram manda POST ao robô com o chat e o texto puro, sem formatação, e devolve true', async () => {
  const { fetchFn, chamadas } = fetchFalso(() => respostaJson({ ok: true, result: { message_id: 7 } }))
  const enviar = criarEnvioTelegram(TOKEN, '424242', fetchFn)
  assert.equal(await enviar('Kaizen: voltou a funcionar às 15h.'), true)
  assert.equal(chamadas.length, 1)
  const { url, init } = chamadas[0]
  assert.equal(url, `https://api.telegram.org/bot${TOKEN}/sendMessage`)
  assert.equal(init.method, 'POST')
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json' })
  assert.deepEqual(JSON.parse(String(init.body)), { chat_id: '424242', text: 'Kaizen: voltou a funcionar às 15h.' })
  assert.ok(init.signal instanceof AbortSignal)
})

test('criarEnvioTelegram devolve false quando o Telegram não aceita a mensagem', async () => {
  const recusa = fetchFalso(() => respostaJson({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }, 400))
  assert.equal(await criarEnvioTelegram(TOKEN, '424242', recusa.fetchFn)('oi'), false)
  const semJson = fetchFalso(() => Promise.resolve(new Response('<html>502</html>', { status: 502 })))
  assert.equal(await criarEnvioTelegram(TOKEN, '424242', semJson.fetchFn)('oi'), false)
})

test('criarEnvioTelegram devolve false no erro de rede e não imprime o token', async (t) => {
  const log = t.mock.method(console, 'log', () => undefined)
  const erro = t.mock.method(console, 'error', () => undefined)
  const { fetchFn } = fetchFalso(() => Promise.reject(new TypeError(`fetch failed: https://api.telegram.org/bot${TOKEN}/sendMessage`)))
  assert.equal(await criarEnvioTelegram(TOKEN, '424242', fetchFn)('oi'), false)
  const impresso = [...log.mock.calls, ...erro.mock.calls].map((c) => c.arguments.join(' ')).join('\n')
  assert.ok(!impresso.includes(TOKEN))
})

test('criarEnvioTelegram sem token ou sem chat imprime o texto, não chama a rede e devolve null', async (t) => {
  const log = t.mock.method(console, 'log', () => undefined)
  const { fetchFn, chamadas } = fetchFalso(() => respostaJson({ ok: true }))
  assert.equal(await criarEnvioTelegram(undefined, '424242', fetchFn)('Kaizen: mensagem de teste.'), null)
  assert.equal(await criarEnvioTelegram(TOKEN, undefined, fetchFn)('segunda'), null)
  assert.equal(await criarEnvioTelegram('', '', fetchFn)('terceira'), null)
  assert.equal(chamadas.length, 0)
  assert.deepEqual(log.mock.calls.map((c) => c.arguments), [['Kaizen: mensagem de teste.'], ['segunda'], ['terceira']])
})

test('textoFalha do ERP fora, com e sem a hora da última leitura boa', () => {
  const motivo = { tipo: 'erp_fora', detalhe: 'fetch failed' } as const
  assert.equal(
    textoFalha(14, motivo, 13, 'às 15h'),
    'Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h.',
  )
  assert.equal(
    textoFalha(22, motivo, null, 'em 29/09 às 8h'),
    'Kaizen: a leitura das 22h falhou — o ERP não respondeu. Nada a fazer: ele tenta de novo em 29/09 às 8h.',
  )
})

test('textoFalha do token recusado, do ERP que mudou por dentro e do banco fora', () => {
  assert.equal(
    textoFalha(14, { tipo: 'token', detalhe: 'resposta 401' }, 13, 'às 15h'),
    'Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.',
  )
  assert.equal(
    textoFalha(14, { tipo: 'estrutura', detalhe: 'colunas que sumiram do ERP: documento.idempresa' }, 13, 'às 15h'),
    'Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: colunas que sumiram do ERP: documento.idempresa',
  )
  assert.equal(
    textoFalha(14, { tipo: 'banco_fora', detalhe: 'connect ECONNREFUSED' }, 13, 'às 15h'),
    'Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu.',
  )
})

test('textoFalha de outro motivo, com e sem a hora da última leitura boa', () => {
  const motivo = { tipo: 'outra', detalhe: 'a leitura das 14h passou do prazo' } as const
  assert.equal(
    textoFalha(14, motivo, 13, 'às 15h'),
    'Kaizen: a leitura das 14h falhou — a leitura das 14h passou do prazo. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.',
  )
  assert.equal(
    textoFalha(8, motivo, null, 'às 9h'),
    'Kaizen: a leitura das 8h falhou — a leitura das 14h passou do prazo. Abra uma sessão com o Claude e cole esta mensagem.',
  )
})

test('textoFalha com um detalhe enorme cabe no Telegram e mantém o que fazer no fim', () => {
  const detalhe = 'x'.repeat(10_000)
  const outra = textoFalha(14, { tipo: 'outra', detalhe }, 13, 'às 15h')
  assert.ok(outra.length <= 4000, `tem ${outra.length} caracteres`)
  assert.ok(outra.endsWith('x (…). Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.'))
  const estrutura = textoFalha(14, { tipo: 'estrutura', detalhe }, 13, 'às 15h')
  assert.ok(estrutura.length <= 4000, `tem ${estrutura.length} caracteres`)
  assert.ok(estrutura.endsWith('x (…)'))
})

test('textoVolta e textoTeste', () => {
  assert.equal(textoVolta(15), 'Kaizen: voltou a funcionar às 15h.')
  assert.equal(textoTeste(), 'Kaizen: mensagem de teste. O aviso de falha chega por aqui.')
})

test('deveAvisarFalha: avisa uma vez por queda e de novo se a mensagem anterior não chegou', () => {
  const casos: Array<[Anterior | null, boolean]> = [
    [null, true],
    [{ id: 1, resultado: 'ok', telegramOk: null }, true],
    [{ id: 1, resultado: 'aviso', telegramOk: true }, true],
    [{ id: 1, resultado: 'falha', telegramOk: true }, false],
    [{ id: 1, resultado: 'falha', telegramOk: false }, true],
    [{ id: 1, resultado: 'falha', telegramOk: null }, true],
  ]
  for (const [anterior, esperado] of casos) {
    assert.equal(deveAvisarFalha(anterior), esperado, JSON.stringify(anterior))
  }
})

test('deveAvisarVolta: só quando esta deu certo e a anterior falhou ou faltou leitura', () => {
  const falha: Anterior = { id: 1, resultado: 'falha', telegramOk: true }
  const ok: Anterior = { id: 1, resultado: 'ok', telegramOk: null }
  const casos: Array<[Resultado, Anterior | null, boolean, boolean]> = [
    ['ok', falha, false, true],
    ['aviso', falha, false, true],
    ['ok', ok, true, true],
    ['aviso', null, true, true],
    ['ok', ok, false, false],
    ['ok', null, false, false],
    ['falha', falha, true, false],
    ['pulada', falha, true, false],
  ]
  for (const [atual, anterior, faltaram, esperado] of casos) {
    assert.equal(deveAvisarVolta(atual, anterior, faltaram), esperado, `${atual} ${JSON.stringify(anterior)} ${faltaram}`)
  }
})

function aviso(tipo: TipoAviso, chave: string, texto: string): Aviso {
  return { tipo, chave, texto }
}

test('textoResumo sem avisos não manda nada', () => {
  assert.deepEqual(textoResumo([], ['codigo:tipo:AM'], '2026-09-29'), { texto: null, chaves: [] })
})

test('textoResumo agrupa por tipo, na ordem dos tipos, com título, contagem e o que fazer', () => {
  const avisos = [
    aviso('execucao_faltou', 'faltou:2026-09-29:10', 'a leitura das 10h de 29/09 não aconteceu'),
    aviso('documento_apagado', 'apagado:300', 'o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP'),
    aviso('execucao_faltou', 'faltou:2026-09-29:11', 'a leitura das 11h de 29/09 não aconteceu'),
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen'),
    aviso('fechamento_com_resto', 'fechamento:230', 'o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável'),
  ]
  assert.deepEqual(textoResumo(avisos, [], '2026-09-29'), {
    texto: [
      'Kaizen — resumo de 29/09:',
      'Códigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:',
      '- o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen',
      'Documentos apagados no ERP (1) — pergunte à gerente ou ao suporte:',
      '- o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP',
      'Fechamentos com linha de teste (1) — a quebra desse turno não é confiável:',
      '- o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável',
      'Leituras que não aconteceram (2) — leve este resumo à próxima sessão com o Claude:',
      '- a leitura das 10h de 29/09 não aconteceu',
      '- a leitura das 11h de 29/09 não aconteceu',
    ].join('\n'),
    chaves: ['faltou:2026-09-29:10', 'apagado:300', 'faltou:2026-09-29:11', 'codigo:tipo:ZZ', 'fechamento:230'],
  })
})

test('textoResumo mostra até 5 exemplos por tipo e diz quantos ficaram de fora', () => {
  const avisos = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
    aviso('estoque_diverge', `estoque:${n}:virada:1`, `o saldo do produto ${n} no ERP (1) não bate com os movimentos (0)`))
  const { texto } = textoResumo(avisos, [], '2026-09-29')
  assert.equal(texto, [
    'Kaizen — resumo de 29/09:',
    'Estoque que não bate (8) — leve este resumo à próxima sessão com o Claude:',
    '- o saldo do produto 1 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 2 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 3 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 4 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 5 no ERP (1) não bate com os movimentos (0)',
    '- e mais 3',
  ].join('\n'))
})

test('textoResumo junta a mesma chave vinda de várias execuções e diz quantas vezes', () => {
  const avisos = [
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen'),
    aviso('execucao_pulada', 'pulada:41', 'uma leitura foi pulada porque a anterior ainda estava rodando'),
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen'),
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 3 vez(es) e não tem tradução no Kaizen'),
  ]
  assert.deepEqual(textoResumo(avisos, [], '2026-10-03'), {
    texto: [
      'Kaizen — resumo de 03/10:',
      'Códigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:',
      '- o código "ZZ" de tipo apareceu 3 vez(es) e não tem tradução no Kaizen (3 vezes)',
      'Leituras puladas (1) — leve este resumo à próxima sessão com o Claude:',
      '- uma leitura foi pulada porque a anterior ainda estava rodando',
    ].join('\n'),
    chaves: ['codigo:tipo:ZZ', 'pulada:41'],
  })
})

test('textoResumo põe os avisos já informados numa linha só e devolve também as chaves deles', () => {
  const avisos = [
    aviso('estoque_diverge', 'estoque:60:virada:0', 'o saldo do produto 60 no ERP (0) não bate com os movimentos (3.000000)'),
    aviso('codigo_sem_traducao', 'codigo:tipo:AM', 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen'),
    aviso('total_diferente', 'total:2026-09-29:itens:valor:10:9', 'em 29/09, itens:valor: ERP 10, Kaizen 9'),
    aviso('estoque_diverge', 'estoque:60:virada:0', 'o saldo do produto 60 no ERP (0) não bate com os movimentos (3.000000)'),
  ]
  assert.deepEqual(textoResumo(avisos, ['estoque:60:virada:0', 'codigo:tipo:AM', 'apagado:1'], '2026-09-30'), {
    texto: [
      'Kaizen — resumo de 30/09:',
      'Totais diferentes do ERP (1) — leve este resumo à próxima sessão com o Claude:',
      '- em 29/09, itens:valor: ERP 10, Kaizen 9',
      'Continuam 2 avisos já informados.',
    ].join('\n'),
    chaves: ['estoque:60:virada:0', 'codigo:tipo:AM', 'total:2026-09-29:itens:valor:10:9'],
  })
})

test('textoResumo só com avisos já informados traz o cabeçalho e a linha dos que continuam', () => {
  const avisos = [aviso('codigo_sem_traducao', 'codigo:tipo:AM', 'o código "AM" de tipo apareceu 4 vez(es) e não tem tradução no Kaizen')]
  assert.deepEqual(textoResumo(avisos, ['codigo:tipo:AM'], '2026-09-30'), {
    texto: 'Kaizen — resumo de 30/09:\nContinuam 1 avisos já informados.',
    chaves: ['codigo:tipo:AM'],
  })
})

test('textoResumo passa de 4.000 caracteres: corta numa quebra de linha e avisa que há mais', () => {
  const tipos: TipoAviso[] = [
    'codigo_sem_traducao', 'documento_apagado', 'fechamento_com_resto', 'estoque_diverge',
    'movimento_sumiu', 'total_diferente', 'execucao_faltou', 'execucao_pulada',
  ]
  const avisos = tipos.flatMap((tipo) =>
    [1, 2, 3, 4, 5, 6].map((n) => aviso(tipo, `${tipo}:${n}`, `aviso ${n} de ${tipo} `.padEnd(150, '.'))))
  const { texto, chaves } = textoResumo(avisos, [], '2026-09-29')
  assert.ok(texto !== null)
  assert.ok(texto.length <= 4000, `tem ${texto.length} caracteres`)
  assert.ok(texto.startsWith('Kaizen — resumo de 29/09:\nCódigos novos no ERP (6) — '))
  assert.ok(texto.endsWith('\n(e mais; o detalhe está no registro da execução)'))
  // nenhuma linha sai pela metade: toda linha de aviso tem os 150 caracteres
  for (const linha of texto.split('\n').filter((l) => l.startsWith('- aviso'))) assert.equal(linha.length, 152)
  assert.equal(chaves.length, 48)
})
```

- [ ] **Passo 6: Rodar o teste e ver falhar**

Run: `node --test tradutor/telegram.test.mts`
Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repositório>\tradutor\telegram.mts' imported from <repositório>\tradutor\telegram.test.mts
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

- [ ] **Passo 7: Criar `tradutor/telegram.mts`**

```ts
import { diaMes, O_QUE_FAZER, TITULOS } from './avisos.mts'
import type { Anterior } from './registro.mts'
import type { Aviso, MotivoFalha, Resultado, TipoAviso } from './tipos.mts'

export type Enviar = (texto: string) => Promise<boolean | null>   // null = Telegram não configurado

// O Telegram recusa mensagem acima de 4.096 caracteres.
const LIMITE = 4000
const FIM_DO_RESUMO = '\n(e mais; o detalhe está no registro da execução)'
// O resto da mensagem de falha tem menos de 300 caracteres: com o detalhe cortado aqui, ela cabe no Telegram.
const DETALHE_MAXIMO = 3000

const ORDEM_DOS_TIPOS: TipoAviso[] = [
  'codigo_sem_traducao', 'documento_apagado', 'fechamento_com_resto', 'estoque_diverge',
  'movimento_sumiu', 'total_diferente', 'execucao_faltou', 'execucao_pulada',
]

export function criarEnvioTelegram(token: string | undefined, chat: string | undefined, fetchFn: typeof fetch = fetch): Enviar {
  if (!token || !chat) {
    return async (texto) => {
      console.log(texto)
      return null
    }
  }
  return async (texto) => {
    try {
      const resposta = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: texto }),
        signal: AbortSignal.timeout(30_000),
      })
      const corpo = (await resposta.json()) as { ok?: unknown }
      return corpo.ok === true
    } catch {
      // Nada é impresso aqui: a mensagem de erro do fetch pode trazer o endereço, que leva o token.
      return false
    }
  }
}

export function textoFalha(horaExecucao: number, motivo: MotivoFalha, horaUltimaBoa: number | null, proximo: string): string {
  const h = horaExecucao
  const continuam = horaUltimaBoa !== null ? `Os dados do Kaizen continuam os das ${horaUltimaBoa}h. ` : ''
  // Um detalhe enorme (o corpo de um erro do ERP) faria o Telegram recusar a mensagem a cada hora.
  const detalhe = motivo.detalhe.length > DETALHE_MAXIMO ? `${motivo.detalhe.slice(0, DETALHE_MAXIMO)} (…)` : motivo.detalhe
  switch (motivo.tipo) {
    case 'erp_fora':
      return `Kaizen: a leitura das ${h}h falhou — o ERP não respondeu. ${continuam}Nada a fazer: ele tenta de novo ${proximo}.`
    case 'token':
      return 'Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.'
    case 'estrutura':
      return `Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: ${detalhe}`
    case 'banco_fora':
      return `Kaizen: a leitura das ${h}h falhou — o banco do Kaizen não respondeu.`
    case 'outra':
      return `Kaizen: a leitura das ${h}h falhou — ${detalhe}. ${continuam}Abra uma sessão com o Claude e cole esta mensagem.`
  }
}

export function textoVolta(horaExecucao: number): string {
  return `Kaizen: voltou a funcionar às ${horaExecucao}h.`
}

export function textoTeste(): string {
  return 'Kaizen: mensagem de teste. O aviso de falha chega por aqui.'
}

export function deveAvisarFalha(anterior: Anterior | null): boolean {
  return anterior === null || anterior.resultado !== 'falha' || anterior.telegramOk !== true
}

export function deveAvisarVolta(resultadoAtual: Resultado, anterior: Anterior | null, faltaram: boolean): boolean {
  const atualBoa = resultadoAtual === 'ok' || resultadoAtual === 'aviso'
  return atualBoa && (anterior?.resultado === 'falha' || faltaram)
}

export function textoResumo(avisos: Aviso[], chavesAnteriores: string[], hoje: string): { texto: string | null; chaves: string[] } {
  if (avisos.length === 0) return { texto: null, chaves: [] }
  // Uma linha por chave, na ordem em que apareceu, com o texto mais recente e o número de vezes.
  const porChave = new Map<string, { aviso: Aviso; vezes: number }>()
  for (const aviso of avisos) {
    const visto = porChave.get(aviso.chave)
    if (visto) {
      visto.aviso = aviso
      visto.vezes += 1
    } else {
      porChave.set(aviso.chave, { aviso, vezes: 1 })
    }
  }
  const anteriores = new Set(chavesAnteriores)
  const unicos = [...porChave.values()]
  const novos = unicos.filter((u) => !anteriores.has(u.aviso.chave))
  const repetidos = unicos.length - novos.length

  let texto = `Kaizen — resumo de ${diaMes(hoje)}:`
  for (const tipo of ORDEM_DOS_TIPOS) {
    const doTipo = novos.filter((u) => u.aviso.tipo === tipo)
    if (doTipo.length === 0) continue
    texto += `\n${TITULOS[tipo]} (${doTipo.length}) — ${O_QUE_FAZER[tipo]}:`
    for (const { aviso, vezes } of doTipo.slice(0, 5)) {
      texto += `\n- ${aviso.texto}${vezes > 1 ? ` (${vezes} vezes)` : ''}`
    }
    if (doTipo.length > 5) texto += `\n- e mais ${doTipo.length - 5}`
  }
  if (repetidos > 0) texto += `\nContinuam ${repetidos} avisos já informados.`
  if (texto.length > LIMITE) {
    // corta numa quebra de linha, para nenhum aviso sair pela metade
    const quebra = texto.lastIndexOf('\n', LIMITE - FIM_DO_RESUMO.length)
    texto = texto.slice(0, quebra) + FIM_DO_RESUMO
  }
  return { texto, chaves: [...porChave.keys()] }
}
```

- [ ] **Passo 8: Rodar o teste e ver passar**

Run: `node --test tradutor/telegram.test.mts`
Expected: PASS, com as 18 linhas abaixo e `ℹ pass 18`, `ℹ fail 0`:
```
✔ criarEnvioTelegram manda POST ao robô com o chat e o texto puro, sem formatação, e devolve true
✔ criarEnvioTelegram devolve false quando o Telegram não aceita a mensagem
✔ criarEnvioTelegram devolve false no erro de rede e não imprime o token
✔ criarEnvioTelegram sem token ou sem chat imprime o texto, não chama a rede e devolve null
✔ textoFalha do ERP fora, com e sem a hora da última leitura boa
✔ textoFalha do token recusado, do ERP que mudou por dentro e do banco fora
✔ textoFalha de outro motivo, com e sem a hora da última leitura boa
✔ textoFalha com um detalhe enorme cabe no Telegram e mantém o que fazer no fim
✔ textoVolta e textoTeste
✔ deveAvisarFalha: avisa uma vez por queda e de novo se a mensagem anterior não chegou
✔ deveAvisarVolta: só quando esta deu certo e a anterior falhou ou faltou leitura
✔ textoResumo sem avisos não manda nada
✔ textoResumo agrupa por tipo, na ordem dos tipos, com título, contagem e o que fazer
✔ textoResumo mostra até 5 exemplos por tipo e diz quantos ficaram de fora
✔ textoResumo junta a mesma chave vinda de várias execuções e diz quantas vezes
✔ textoResumo põe os avisos já informados numa linha só e devolve também as chaves deles
✔ textoResumo só com avisos já informados traz o cabeçalho e a linha dos que continuam
✔ textoResumo passa de 4.000 caracteres: corta numa quebra de linha e avisa que há mais
```

Se algum falhar, não mude o teste: os textos são os do contrato e os exemplos da spec (seção 7.2).

Confira que nenhum banco de teste sobrou:

Run: `docker compose exec -T postgres psql -U postgres -At -c "select count(*) from pg_database where datname like 'kaizen_teste_%'"`
Expected: `0`

- [ ] **Passo 9: Atualizar `testes-esperados.txt` (N = 31: 13 em `registro.test.mts` e 18 em `telegram.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+31;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 31.

- [ ] **Passo 10: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 11: Commit**

```bash
git add tradutor/registro.mts tradutor/registro.test.mts tradutor/telegram.mts tradutor/telegram.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Registro de cada execução e mensagens do Telegram

Cada execução passa a deixar uma linha no Kaizen, gravada fora da carga
para a falha também ficar registrada: início, fim, resultado, mensagem,
contagens e avisos. Uma execução que morreu no meio vira falha na
seguinte, e uma que segura a trava além do prazo é achada. O dia e a hora
saem em Fortaleza mesmo com o Postgres em UTC: a noite que começou às
22h30 do dia 29 é do dia 29.

As mensagens do Telegram dizem o que fazer, em uma frase, sem formatação:
"Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do
Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h."
A falha avisa uma vez por queda e repete só se a mensagem anterior não
chegou; a volta avisa uma vez. Um erro enorme do ERP é cortado para a
mensagem caber no Telegram. Sem o robô configurado, o texto só é
impresso, e o token nunca aparece na tela.

O resumo das 22h junta os avisos desde o último resumo, agrupa por tipo
com até 5 exemplos, conta as repetições e põe numa linha só os avisos já
informados. Nunca passa de 4.000 caracteres, e dia limpo não manda nada.

31 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit sai.

---

### Tarefa 13: Execução da hora e o comando

**O que esta tarefa entrega, em resultado:** o tradutor passa a fazer a leitura de hora em hora de ponta a ponta. Ele pega a trava (duas leituras nunca gravam juntas; a segunda fica registrada como pulada), aplica as migrações, registra o início, confere colunas e empresa, lê os documentos novos e mudados, a lista de documentos vivos, o estoque e os cadastros, grava tudo numa transação só e registra o fim, com as contagens e os avisos. Quando algo dá errado, o Kaizen fica como estava, o motivo fica registrado e sai uma mensagem só pelo Telegram, dizendo o que fazer, por mais horas que a falha dure; quando volta a funcionar, sai uma mensagem de volta. Uma linha gravada fora de ordem no ERP (número menor que o maior já visto, até 200 abaixo) é relida. Uma leitura esperada que não aconteceu vira aviso. E nasce o comando que a VPS vai chamar (`node tradutor/principal.mts hora`), com prazo de 10 minutos, código de saída e uma linha de resumo. São 25 testes novos (19 + 6), em dois commits. A noite (releitura completa, comparação de totais e resumo) é a tarefa 14: até lá, pedir `noite` dá falha registrada.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Postgres local de pé (`docker compose up -d --wait`, tarefa 1). As tarefas 1 a 12 precisam estar feitas. Os testes criam e apagam um banco do Kaizen (`criarBancoKaizen`) e um ERP falso (`criarErpFalso`); nenhum teste fala com o ERP de verdade nem com o Telegram. Commits no Git Bash. Não abra o `.env`.

**Arquivos:**
- Criar: `tradutor/execucao.mts`
- Testar: `tradutor/execucao.test.mts`
- Criar: `tradutor/config.mts`
- Criar: `tradutor/principal.mts`
- Testar: `tradutor/principal.test.mts`
- Modificar: `testes-esperados.txt` (soma 19 no primeiro commit e 6 no segundo)

**Interfaces:**
- Consome (tarefas 1 a 12; exatamente estes nomes):
  ```ts
  // tradutor/banco.mts (T1)
  export type Cliente = pg.Client
  export async function conectar(url: string): Promise<Cliente>            // conecta e fixa o fuso em America/Fortaleza
  export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>  // begin; fazer; commit; erro → rollback e relança
  // Parsers da T1: count(*), bigint, numeric, date, timestamp e timestamptz chegam como texto; integer como número; jsonb já como objeto.

  // tradutor/tipos.mts (T2)
  export type TipoExecucao = 'hora' | 'noite'
  export type Resultado = 'ok' | 'aviso' | 'falha' | 'pulada'
  export type Aviso = { tipo: TipoAviso; chave: string; texto: string }
  export type TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'outra'
  export type MotivoFalha = { tipo: TipoFalha; detalhe: string }
  export class ErroKaizen extends Error { motivo: MotivoFalha; constructor(motivo: MotivoFalha) }

  // tradutor/migracoes.mts (T2)
  export async function aplicarMigracoes(cliente: Cliente, pasta?: string): Promise<string[]>
  // erro numa migração: ErroKaizen({ tipo: 'outra', detalhe: `a migração ${nome} não se aplicou: ${erro.message}` })

  // tradutor/apoio-teste.mts (T2, só testes)
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>

  // tradutor/erp.mts (T4)
  export class ErroErp extends Error { tipo: TipoErroErp; status: number | null; constructor(tipo: TipoErroErp, mensagem: string, status: number | null = null) }
  export type Erp = { consultar(sql: string): Promise<string> }
  export function criarErp(opcoes: OpcoesErp): Erp   // OpcoesErp = { url, token, fetch?, agora?, esperar?, limitePorMinuto?, prazoMs? }

  // tradutor/erp-falso.mts e tradutor/sql-erp.mts (T5, só testes)
  export type ErpFalso = { erp: Erp; cliente: Cliente; consultas: string[]; inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>; fechar(): Promise<void> }
  export async function criarErpFalso(): Promise<ErpFalso>
  export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }>

  // tradutor/leitura.mts (T7)
  export async function conferirColunas(erp: Erp): Promise<string[]>                       // 'tabela.coluna' que faltam
  export async function conferirEmpresaLocal(erp: Erp, cortes: Cortes): Promise<Array<{ tabela: string; valor: number }>>
  export type SelecaoHora = { novosAcimaDe: number; inicio: string; pendentes: number[] }
  export async function lerDocumentosHora(erp: Erp, cortes: Cortes, selecao: SelecaoHora): Promise<string>
  export async function lerVivos(erp: Erp, cortes: Cortes): Promise<string>                 // array JSON de oids
  export async function lerEstoque(erp: Erp, cortes: Cortes, movimentosAcimaDe: number): Promise<string>
  export async function lerCadastros(erp: Erp): Promise<string>

  // tradutor/kaizen.mts (T8)
  export async function lerCortes(cliente: Cliente): Promise<Cortes>
  export async function maiorOid(cliente: Cliente, tabela: 'documento' | 'estoque_movimento'): Promise<number | null>
  export async function oidsComParcelaAberta(cliente: Cliente): Promise<number[]>
  export async function contarDocumentosErp(cliente: Cliente): Promise<number>

  // tradutor/carga.mts (T8 e T9) — sempre dentro de uma transação aberta pelo chamador
  export async function colocarEntrada(cliente: Cliente, assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros', partes: string[]): Promise<void>
  export async function gravarDocumentos(cliente: Cliente): Promise<{ lidos: number; novos: number }>
  export function podeApagar(noKaizen: number, vivos: number): { ok: true } | { ok: false; motivo: string }
  export async function apagarSumidos(cliente: Cliente): Promise<Apagado[]>
  export async function gravarEstoque(cliente: Cliente, completo: boolean): Promise<{ movimentos: number; foto: number; sumidos: Array<{ origem_id: string; produto: string }> }>
  export async function gravarCadastros(cliente: Cliente): Promise<{ produtos: number; pessoas: number; funcionarios: number; fornecedores: number }>

  // tradutor/constantes.mts (T10)
  export const TRAVA = 20260928
  export const FOLGA_OID = 200
  export const PRAZO_MIN: Record<TipoExecucao, number> = { hora: 10, noite: 30 }

  // tradutor/janela.mts (T10)
  export function emFortaleza(ms: number): Instante                 // { data: 'AAAA-MM-DD', hora, minuto, diaSemana }
  export function inicioDaJanela(agoraMs: number, ultimaNoiteBoa: string | null): string
  export function horariosFaltando(ultimoInicioMs: number | null, agoraMs: number): Horario[]
  export function proximoHorario(agoraMs: number): Horario
  export function rotuloHora(h: Horario, hojeData: string): string    // '15h' no mesmo dia; '30/09 às 8h' em outro

  // tradutor/avisos.mts (T10)
  export function avisoDocumentoApagado(a: Apagado): Aviso
  export function avisoMovimentoSumiu(origemId: string, produto: string): Aviso
  export function avisoExecucaoPulada(idQueSegura: number): Aviso

  // tradutor/conferencias.mts (T11)
  export async function codigosSemTraducao(cliente: Cliente): Promise<Aviso[]>
  export async function fechamentosComResto(cliente: Cliente): Promise<Aviso[]>   // dentro da transação da carga
  export async function estoqueDiverge(cliente: Cliente): Promise<Aviso[]>
  export function avisosDeFaltas(faltando: Horario[]): Aviso[]

  // tradutor/registro.mts (T12)
  export async function registrarInicio(cliente: Cliente, tipo: TipoExecucao, manual: boolean): Promise<number>
  export async function registrarFim(cliente: Cliente, id: number, r: { resultado: Resultado; mensagem?: string | null; contagens?: Record<string, number>; avisos: Aviso[] }): Promise<void>
  export async function registrarPulada(cliente: Cliente, tipo: TipoExecucao, manual: boolean, aviso: Aviso): Promise<void>
  export async function marcarInterrompidas(cliente: Cliente, idAtual: number): Promise<number>
  export async function execucaoPresa(cliente: Cliente, prazoMin: number): Promise<{ id: number } | null>
  export type Anterior = { id: number; resultado: 'ok' | 'aviso' | 'falha'; telegramOk: boolean | null }
  export async function anteriorValida(cliente: Cliente, idAtual: number | null): Promise<Anterior | null>
  export async function ultimoInicioNaoManualMs(cliente: Cliente, idAtual: number | null): Promise<number | null>
  export async function ultimaNoiteBoa(cliente: Cliente): Promise<string | null>
  export async function horaDaUltimaBoa(cliente: Cliente, idAtual: number | null): Promise<number | null>
  export async function marcarTelegram(cliente: Cliente, id: number, ok: boolean | null): Promise<void>

  // tradutor/telegram.mts (T12)
  export type Enviar = (texto: string) => Promise<boolean | null>   // null = Telegram não configurado
  export function criarEnvioTelegram(token: string | undefined, chat: string | undefined, fetchFn?: typeof fetch): Enviar
  export function textoFalha(horaExecucao: number, motivo: MotivoFalha, horaUltimaBoa: number | null, proximo: string): string
  export function textoVolta(horaExecucao: number): string
  export function textoTeste(): string
  export function deveAvisarFalha(anterior: Anterior | null): boolean
  export function deveAvisarVolta(resultadoAtual: Resultado, anterior: Anterior | null, faltaram: boolean): boolean
  ```
- Produz (a tarefa 14 substitui `execucao.mts` inteiro mantendo estes nomes; as tarefas 15 a 18 usam estes nomes):
  ```ts
  // tradutor/execucao.mts
  export type Dependencias = { erp: Erp; conectarKaizen: () => Promise<Cliente>; enviar: Enviar; agora: () => number; pastaMigracoes?: string }
  export type Saida = { resultado: Resultado; avisos: Aviso[]; mensagem: string | null; contagens: Record<string, number> }
  export async function executar(opcoes: { tipo: TipoExecucao; manual: boolean }, dep: Dependencias): Promise<Saida>
  export function motivoDe(erro: unknown): MotivoFalha
  export async function registrarEstouro(opcoes: { tipo: TipoExecucao; manual: boolean }, dep: Dependencias): Promise<void>
  // registrarEstouro: com uma conexão nova, marca a execução aberta como falha ('a leitura das ${h}h passou do prazo') e manda o Telegram se deveAvisarFalha;
  // senão, a linha herda o telegram_ok da anterior (o "já avisado")

  // tradutor/config.mts
  export type Config = { erpUrl: string; erpToken: string; kaizenUrl: string; telegramToken?: string; telegramChat?: string }
  export function lerConfig(env: Record<string, string | undefined>): Config   // lança Error('falta MEUERP_TOKEN') / Error('falta KAIZEN_URL')

  // tradutor/principal.mts
  export async function comPrazo<T>(fazer: () => Promise<T>, prazoMs: number, aoEstourar: () => Promise<void>): Promise<T>
  export async function principal(argumentos: string[], env: Record<string, string | undefined>, fetchFn?: typeof fetch): Promise<number>
  // devolve o código de saída: 0 (ok, aviso, pulada), 1 (falha), 2 (comando errado). A T16 acrescenta o comando `conferencia`.
  ```
  `contagens` tem sempre estas chaves (ok e aviso): `documentos_lidos`, `documentos_novos`, `apagados`, `movimentos`, `foto`, `produtos`, `pessoas`, `funcionarios`, `fornecedores`, `avisos`. Na falha e na pulada, `contagens` é `{}`. `mensagem` é o `detalhe` do motivo na falha e `null` no resto.

**Regras desta tarefa (repetidas das seções globais):**
- Tudo em português: nomes, testes, mensagens, commits. TypeScript rodado direto pelo Node, só com sintaxe apagável (nada de `enum`, `namespace`, parâmetro de construtor com `public`/`private`), imports com a extensão `.mts`, tipos com `import type`.
- Testes com `node:test` e `node:assert/strict`, um arquivo `*.test.mts` ao lado do arquivo testado, só `test(` no nível de cima (sem `describe`).
- Nada escreve no ERP. Nenhum valor de dinheiro, quantidade ou data passa por `number` ou `Date`: os textos do ERP vão inteiros ao Postgres (`colocarEntrada`). Só contagens e `oid` viram `number`.
- Fuso de Fortaleza (UTC−3, sem horário de verão). Testes só em `localhost:5434`.

**Como a execução funciona (contrato, seção 9), para não "consertar" sem querer:**
1. `conectarKaizen()`. Se falhar, o motivo é `banco_fora`: sai `textoFalha` sem estado (`Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu.`) e nenhuma linha é gravada. Sem banco não há trava nem registro, e por isso a mensagem sai a cada execução enquanto durar a queda.
2. Trava (`pg_try_advisory_lock(TRAVA)`) na mesma conexão, que vive até o fim. Sem a trava:
   - se a tabela `kaizen.execucao` ainda não existe (a primeira execução de todas está aplicando as migrações), devolve `pulada` sem gravar nada;
   - se a execução aberta começou há mais que o prazo (`execucaoPresa`), é falha: grava uma linha nova com `a leitura anterior ficou presa além do prazo` e manda o Telegram se `deveAvisarFalha`;
   - senão, grava `pulada` com `avisoExecucaoPulada(id da execução aberta)` (a de maior `id` sem `fim`; `0` se não houver).
3. `aplicarMigracoes(cliente, dep.pastaMigracoes)`; sem `pastaMigracoes`, a pasta do repositório. Migração que falha é falha registrada (se a tabela existir) e com mensagem.
4. `registrarInicio`; `marcarInterrompidas` (linha sem fim de outra execução, que já não segura a trava, vira falha); `anterior = anteriorValida`.
5. Só na execução não manual: `horariosFaltando(ultimoInicioNaoManualMs, agora)` vira avisos de falta. Havendo falta, a volta é avisada ("voltou a funcionar").
6. `lerCortes`; `conferirColunas` (faltou coluna → falha `estrutura` com `colunas que sumiram do ERP: tabela.coluna, ...`); `conferirEmpresaLocal` (outro valor → falha `estrutura` com `apareceu outra empresa ou local de estoque: tabela=valor, ...`).
7. Hora: `novosAcimaDe = max(corte, maior oid já visto − FOLGA_OID)`; `inicio = inicioDaJanela(agora, ultimaNoiteBoa)`; `pendentes = oidsComParcelaAberta`; `lerDocumentosHora`. Noite: falha `a leitura da noite ainda não existe nesta versão do tradutor` (a tarefa 14 troca isso pela noite de verdade).
8. `lerVivos`; `podeApagar(contarDocumentosErp, vivos)`; se não pode, falha `outra` com o motivo (`a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado`).
9. `lerEstoque` acima de `max(corte do histórico, maior movimento já visto − FOLGA_OID)`; `lerCadastros`.
10. Numa transação: `colocarEntrada` dos quatro assuntos; `gravarCadastros` antes dos documentos (o aviso de apagado já sai com o nome do vendedor); `gravarDocumentos`; `fechamentosComResto`; `apagarSumidos`; `gravarEstoque(cliente, false)`. Os avisos da carga só entram depois do commit: se a transação cair, eles não aconteceram.
11. Depois do commit: `codigosSemTraducao` e `estoqueDiverge`.
12. Resultado `aviso` se houver aviso, senão `ok`; `registrarFim`; se `deveAvisarVolta`, manda `textoVolta` e `marcarTelegram`. Depois do `registrarFim`, um erro no Telegram não vira falha da leitura: os dados já estão gravados.
- Qualquer erro dos passos 2 a 11: `motivoDe(erro)`; `registrarFim(falha, mensagem = detalhe, avisos até ali)`; se `deveAvisarFalha(anterior)`, `textoFalha(hora, motivo, horaDaUltimaBoa, próximo)` e `marcarTelegram`. Se não avisa (a anterior é uma falha cuja mensagem chegou), a linha desta falha recebe o `telegram_ok` da anterior (`true`) com `marcarTelegram`: é esse "já avisado" herdado que impede a falha seguinte de avisar de novo. Sem ele, a falha das 15h ficaria com `telegram_ok` vazio e a das 16h mandaria a mensagem outra vez, de duas em duas horas enquanto a queda durasse (spec 7.2). O "próximo" é `às 15h` no mesmo dia e `em 30/09 às 8h` em outro dia (`rotuloHora` com o prefixo). Nenhum erro do registro ou do envio escapa: cada um é engolido para a mensagem sair. Sempre, no fim: solta a trava e fecha a conexão.
- `registrarEstouro` é o que o comando chama quando o prazo estoura: conexão nova, marca a execução aberta como falha (`a leitura das 14h passou do prazo`), manda `textoFalha` com o detalhe `passou do prazo` se `deveAvisarFalha`; se não avisa, herda o `telegram_ok` da anterior, como na falha comum. Sem banco, a mensagem sai mesmo assim.
- `principal.mts`: `hora | noite [--manual]` e `teste-telegram`; qualquer outra coisa imprime o uso e sai com 2. A execução roda dentro de `comPrazo` (10 min na hora, 30 na noite). No estouro, `registrarEstouro` e código 1; o processo termina com `process.exit`, que fecha a conexão presa e solta a trava. Imprime uma linha: `${tipo} ${resultado}: ${nome=valor, ...}${mensagem ? ' — ' + mensagem : ''}` (sem contagens, `sem contagens`).

**Por que os testes são assim:**
- O Postgres grava `inicio` com a hora de verdade, mas o teste finge o relógio (`agora`). A função `rodar` do teste, depois de cada execução, troca o `inicio` (e o `fim`) das linhas novas pela hora fingida. Sem isso, a conta de leituras que faltaram, a "hora da última boa" e a data da última noite usariam o relógio de verdade.
- O banco do Kaizen e o ERP falso são criados uma vez por arquivo e limpos antes de cada teste (`beforeEach`): cada criação custa perto de 1 s.
- `set jit = off` no ERP falso: sem estatísticas, o Postgres compila a consulta de cadastros com JIT, 1,5 s por chamada.
- `falso.consultas` acumula entre os testes: compare o tamanho antes e depois.
- O teste da folga usa números altos (documento 400, movimento 2500) para que "maior − 200" (200 e 2300) fique acima do corte (184 e 1847): só assim é a folga, e não o corte, que decide o que é relido. As linhas fora de ordem têm data de 20/09, fora da janela, para só a folga poder trazê-las. Tirar o `- FOLGA_OID` de qualquer das duas contas, ou trocar a conta pelo corte puro, faz o teste falhar.
- O teste "falha que continua" roda três falhas seguidas (14h, 15h e 16h): com duas só, o defeito do "já avisado" que não passa adiante não aparece.
- Os testes conferem os textos exatos das tarefas 10 e 12 (contrato, seções 5): `textoFalha`, `textoVolta`, `avisoExecucaoPulada`, `avisoExecucaoFaltou`, `avisoDocumentoApagado` com `formatarReais`. Se um teste daqui falhar só por um texto, compare a tarefa 10 ou 12 com o contrato antes de mexer no teste.

- [ ] **Passo 1: Escrever o teste da execução**

Criar `tradutor/execucao.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import type { Cliente } from './banco.mts'
import { TRAVA } from './constantes.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { executar, motivoDe, registrarEstouro } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import { ErroKaizen } from './tipos.mts'
import type { MotivoFalha, TipoExecucao } from './tipos.mts'

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
       kaizen.produto_fornecedor, kaizen.pessoa, kaizen.funcionario, kaizen.execucao restart identity cascade`,
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

const TERCA = '2026-09-29'

async function maiorId(): Promise<number> {
  const r = await banco.cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao')
  return Number(r.rows[0].id ?? 0)
}

type OpcoesRodar = { tipo?: TipoExecucao; manual?: boolean; pastaMigracoes?: string; conectarKaizen?: () => Promise<Cliente> }

// Roda uma execução com o relógio fingido e, depois, põe no registro a hora fingida (o Postgres grava a hora de verdade).
async function rodar(quando: number, erp: Erp = falso.erp, opcoes: OpcoesRodar = {}): Promise<Saida> {
  const antes = await maiorId()
  const saida = await executar(
    { tipo: opcoes.tipo ?? 'hora', manual: opcoes.manual ?? false },
    {
      erp,
      conectarKaizen: opcoes.conectarKaizen ?? (() => conectar(banco.url)),
      enviar,
      agora: () => quando,
      pastaMigracoes: opcoes.pastaMigracoes,
    },
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

async function execucoes(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select id::int as id, tipo, manual, resultado, mensagem, contagens, avisos, telegram_ok, fim is not null as terminou
       from kaizen.execucao order by id`,
  )
  return r.rows
}

// O conteúdo do Kaizen que uma falha não pode mudar.
async function fotografia(): Promise<unknown> {
  const r = await banco.cliente.query(`
    select
      (select coalesce(json_agg(json_build_object('id', d.id, 'origem_id', d.origem_id, 'status', d.status, 'visto_em', d.visto_em::text) order by d.id), '[]')
         from kaizen.documento d) as documentos,
      (select coalesce(json_agg(json_build_object('documento_id', i.documento_id, 'produto', i.produto, 'valor', i.valor_liquido::text) order by i.id), '[]')
         from kaizen.documento_item i) as itens,
      (select coalesce(json_agg(json_build_object('produto', a.produto, 'quantidade', a.quantidade::text) order by a.produto), '[]')
         from kaizen.estoque_atual a) as foto,
      (select count(*) from kaizen.estoque_movimento) as movimentos`)
  return r.rows[0]
}

// Uma terça de loja no ERP falso: a abertura do caixa, o pedido 123 (R$ 150,00 em dinheiro, vendedor Igor),
// o movimento de estoque dele, a foto do estoque que bate com o movimento, e os cadastros.
async function montarLoja(): Promise<void> {
  await falso.inserir('documento', [
    {
      oid: 185, _iddocumento: 120, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
      datahora: '2026-09-29 08:02:00', datahoramovimento: '2026-09-29 08:02:00', idempresa: 1, idpessoa: 999007,
      idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
    },
    {
      oid: 186, _iddocumento: 123, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
      datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idempresa: 1, idpessoa: 999007,
      idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
    },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 123, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '1.000000', valtotalliquido: '150.000000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 1, _iddocumento: 123, _idsequencia: 1, idpagamento: 1, valor: '150.00' }])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1848, _iddocumento: 123, _idlocalestoque: 1, datahora: '2026-09-29 10:15:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '2.000000' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: 'Produto 60', idmercadoria: 60 }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 1, _idmercadoriavariacao: 60, flaginativo: 'F' }])
  await falso.inserir('pessoa', [{ _idpessoa: 1, nome: 'Igor', flaginativo: 'F' }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' }])
}

const ERP_FORA: Erp = {
  async consultar() {
    throw new ErroErp('rede', 'o ERP não respondeu: sem resposta em 90 s')
  },
}

const TEXTO_ERP_FORA_14H =
  'Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h.'

test('execução ok grava os documentos e registra ok com as contagens', async () => {
  await montarLoja()
  const saida = await rodar(horaEm(TERCA, 14))

  const contagens = {
    documentos_lidos: 2, documentos_novos: 2, apagados: 0, movimentos: 1, foto: 1,
    produtos: 1, pessoas: 1, funcionarios: 1, fornecedores: 0, avisos: 0,
  }
  assert.deepEqual(saida, { resultado: 'ok', avisos: [], mensagem: null, contagens })
  const docs = await banco.cliente.query(`select origem_id, codigo, modelo from kaizen.documento order by origem_id`)
  assert.deepEqual(docs.rows, [
    { origem_id: '185', codigo: '120', modelo: 'AX' },
    { origem_id: '186', codigo: '123', modelo: 'PA' },
  ])
  assert.deepEqual(await execucoes(), [
    { id: 1, tipo: 'hora', manual: false, resultado: 'ok', mensagem: null, contagens, avisos: [], telegram_ok: null, terminou: true },
  ])
  assert.deepEqual(enviadas, [])
})

test('a segunda execução sem mudança no ERP continua ok e não duplica nada', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const ids = (await banco.cliente.query('select id from kaizen.documento order by id')).rows
  const segunda = await rodar(horaEm(TERCA, 14))

  assert.equal(segunda.resultado, 'ok')
  assert.equal(segunda.contagens.documentos_lidos, 2)
  assert.equal(segunda.contagens.documentos_novos, 0)
  assert.deepEqual((await banco.cliente.query('select id from kaizen.documento order by id')).rows, ids)
  const contas = await banco.cliente.query(`
    select (select count(*) from kaizen.documento) as documentos,
           (select count(*) from kaizen.documento_item) as itens,
           (select count(*) from kaizen.documento_pagamento) as pagamentos,
           (select count(*) from kaizen.estoque_movimento) as movimentos`)
  assert.deepEqual(contas.rows[0], { documentos: '2', itens: '1', pagamentos: '1', movimentos: '1' })
  assert.deepEqual((await execucoes()).map((e) => e.resultado), ['ok', 'ok'])
  assert.deepEqual(enviadas, [])
})

test('a folga de 200 relê o documento e o movimento gravados fora de ordem', async () => {
  // 13h: o maior documento visto fica 400 e o maior movimento 2500, altos o bastante para que
  // "maior − 200" (200 e 2300) fique acima do corte (184 e 1847): aqui quem decide é a folga, não o corte.
  await falso.inserir('documento', [{
    oid: 400, _iddocumento: 300, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-29 08:02:00', datahoramovimento: '2026-09-29 08:02:00', idempresa: 1,
  }])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 2500, _iddocumento: 300, _idlocalestoque: 1, datahora: '2026-09-29 08:02:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '2.000000' }])
  assert.equal((await rodar(horaEm(TERCA, 13))).resultado, 'ok')

  // Depois da leitura chegam linhas com número menor, como as de um caixa sem internet sincronizando,
  // todas com data de 20/09, fora da janela. O documento 350 e o movimento 2350 estão dentro da folga
  // (acima de 400 − 200 e de 2500 − 200); o documento 199 e o movimento 2250 estão abaixo dela.
  await falso.inserir('documento', [
    { oid: 350, _iddocumento: 290, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-20 10:00:00', idempresa: 1 },
    { oid: 199, _iddocumento: 150, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-20 09:00:00', idempresa: 1 },
  ])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 2350, _iddocumento: 290, _idlocalestoque: 1, datahora: '2026-09-20 10:00:00', idmercadoriavariacao: 61, qtdsaldoatual: '5.000000', qtdnovosaldo: '4.000000' },
    { oid: 2250, _iddocumento: 150, _idlocalestoque: 1, datahora: '2026-09-20 09:00:00', idmercadoriavariacao: 62, qtdsaldoatual: '1.000000', qtdnovosaldo: '0.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 2, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 61, qtdsaldo: '4.000000' }])

  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'ok')
  // O 400 foi relido e só regravado; o 350 é o único novo.
  assert.equal(saida.contagens.documentos_lidos, 2)
  assert.equal(saida.contagens.documentos_novos, 1)
  const docs = await banco.cliente.query('select origem_id from kaizen.documento order by origem_id::bigint')
  assert.deepEqual(docs.rows, [{ origem_id: '350' }, { origem_id: '400' }])
  const movimentos = await banco.cliente.query('select origem_id from kaizen.estoque_movimento order by origem_id::bigint')
  assert.deepEqual(movimentos.rows, [{ origem_id: '2350' }, { origem_id: '2500' }])
})

test('com a trava ocupada por outra conexão, a execução é pulada, com aviso, sem ler o ERP', async () => {
  await montarLoja()
  const outra = await conectar(banco.url)
  try {
    await outra.query('select pg_advisory_lock($1)', [TRAVA])
    const aberta = await outra.query<{ id: string }>(`insert into kaizen.execucao (tipo, manual) values ('hora', false) returning id`)
    const consultasAntes = falso.consultas.length

    const saida = await rodar(horaEm(TERCA, 14))

    const aviso = { tipo: 'execucao_pulada', chave: `pulada:${aberta.rows[0].id}`, texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' }
    assert.deepEqual(saida, { resultado: 'pulada', avisos: [aviso], mensagem: null, contagens: {} })
    const linhas = await execucoes()
    assert.equal(linhas.length, 2)
    assert.equal(linhas[0].terminou, false)
    assert.equal(linhas[1].resultado, 'pulada')
    assert.deepEqual(linhas[1].avisos, [aviso])
    assert.equal(falso.consultas.length, consultasAntes)
    assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '0')
    assert.deepEqual(enviadas, [])
  } finally {
    await outra.end()
  }
})

test('com a trava ocupada e a execução aberta há mais de 10 minutos, é falha e sai mensagem', async () => {
  const outra = await conectar(banco.url)
  try {
    await outra.query('select pg_advisory_lock($1)', [TRAVA])
    await outra.query(`insert into kaizen.execucao (tipo, manual, inicio) values ('hora', false, now() - interval '11 minutes')`)

    const saida = await rodar(horaEm(TERCA, 14))

    assert.equal(saida.resultado, 'falha')
    assert.equal(saida.mensagem, 'a leitura anterior ficou presa além do prazo')
    assert.deepEqual(enviadas, [
      'Kaizen: a leitura das 14h falhou — a leitura anterior ficou presa além do prazo. Abra uma sessão com o Claude e cole esta mensagem.',
    ])
    const linhas = await execucoes()
    assert.equal(linhas.length, 2)
    assert.equal(linhas[1].resultado, 'falha')
    assert.equal(linhas[1].mensagem, 'a leitura anterior ficou presa além do prazo')
    assert.equal(linhas[1].telegram_ok, true)
  } finally {
    await outra.end()
  }
})

test('sem o banco do Kaizen, sai a mensagem de banco fora e nada é registrado', async () => {
  const semBanco = async (): Promise<Cliente> => {
    throw Object.assign(new AggregateError([], ''), { code: 'ECONNREFUSED' })
  }
  const saida = await rodar(horaEm(TERCA, 14), falso.erp, { conectarKaizen: semBanco })

  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, 'o banco do Kaizen não respondeu: ECONNREFUSED')
  assert.deepEqual(enviadas, ['Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu.'])
  assert.deepEqual(await execucoes(), [])
})

test('coluna que sumiu do ERP é falha de estrutura, com a coluna na mensagem, e o Kaizen fica intacto', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const antes = await fotografia()
  await falso.cliente.query(`update documento set status = 'C' where oid = 186`)
  await falso.cliente.query('alter table documento_pagamento drop column valor')
  try {
    const saida = await rodar(horaEm(TERCA, 14))

    assert.equal(saida.resultado, 'falha')
    assert.equal(saida.mensagem, 'colunas que sumiram do ERP: documento_pagamento.valor')
    assert.deepEqual(enviadas, [
      'Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: colunas que sumiram do ERP: documento_pagamento.valor',
    ])
    assert.deepEqual(await fotografia(), antes)
    assert.equal((await execucoes())[1].mensagem, 'colunas que sumiram do ERP: documento_pagamento.valor')
  } finally {
    await falso.cliente.query('alter table documento_pagamento add column valor numeric')
  }
})

test('ERP fora do ar é falha erp_fora, e a mensagem diz que ele tenta de novo às 15h', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const saida = await rodar(horaEm(TERCA, 14), ERP_FORA)

  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, 'o ERP não respondeu: sem resposta em 90 s')
  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H])
  const linhas = await execucoes()
  assert.equal(linhas[1].resultado, 'falha')
  assert.equal(linhas[1].telegram_ok, true)
})

test('token recusado pelo ERP manda a mensagem de trocar o segredo', async () => {
  const recusado: Erp = {
    async consultar() {
      throw new ErroErp('token', 'o ERP recusou o token de acesso (HTTP 401)', 401)
    },
  }
  const saida = await rodar(horaEm(TERCA, 14), recusado)

  assert.equal(saida.resultado, 'falha')
  assert.deepEqual(enviadas, [
    'Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.',
  ])
})

test('outra empresa no ERP é falha de estrutura, com a tabela e o valor, e nada é gravado', async () => {
  await montarLoja()
  await falso.inserir('mercadoria_estoque', [{ oid: 2, _idempresa: 2, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '5.000000' }])
  const saida = await rodar(horaEm(TERCA, 14))

  const detalhe = 'apareceu outra empresa ou local de estoque: mercadoria_estoque._idempresa=2'
  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, detalhe)
  assert.deepEqual(enviadas, [
    `Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: ${detalhe}`,
  ])
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '0')
})

test('lista de vivos vazia com 25 documentos no Kaizen é falha, e nada é apagado', async () => {
  // Como os 44 ajustes de custo de 27/09: acima do corte, com data anterior a 28/09.
  await falso.inserir('documento', Array.from({ length: 25 }, (_, i) => ({
    oid: 185 + i, _iddocumento: 94 + i, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-27 14:20:00', idempresa: 1,
  })))
  assert.equal((await rodar(horaEm(TERCA, 13))).resultado, 'ok')
  await falso.cliente.query('delete from documento')

  const saida = await rodar(horaEm(TERCA, 14))

  const detalhe = 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'
  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, detalhe)
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '25')
  assert.deepEqual(enviadas, [
    `Kaizen: a leitura das 14h falhou — ${detalhe}. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.`,
  ])
})

test('erro no meio da carga (item sem produto) é falha, e o Kaizen continua como antes', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const antes = await fotografia()
  // O pedido 123 muda no ERP, e chega um pedido novo com um item sem produto: a gravação para no meio.
  await falso.cliente.query(`update documento set status = 'C' where oid = 186`)
  await falso.inserir('documento', [{
    oid: 187, _iddocumento: 124, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    datahora: '2026-09-29 13:40:00', datahoramovimento: '2026-09-29 13:41:00', idempresa: 1,
  }])
  await falso.inserir('documento_mercadoria', [
    { oid: 1874, _iddocumento: 124, _idsequencia: 1, idmercadoriavariacao: null, qtd: '1.000000', valtotalliquido: '10.000000', idpessoafuncionario: 1 },
  ])

  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'falha')
  assert.match(saida.mensagem ?? '', /"produto"/)
  assert.deepEqual(await fotografia(), antes)
  assert.equal(enviadas.length, 1)
  assert.ok(enviadas[0].startsWith('Kaizen: a leitura das 14h falhou — '), enviadas[0])
  assert.ok(enviadas[0].endsWith('Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.'), enviadas[0])
})

test('falha que continua por várias horas manda uma mensagem só', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await rodar(horaEm(TERCA, 14), ERP_FORA)
  await rodar(horaEm(TERCA, 15), ERP_FORA)
  await rodar(horaEm(TERCA, 16), ERP_FORA)

  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H])
  // As falhas das 15h e das 16h não mandam nada e herdam o "já avisado" da das 14h.
  assert.deepEqual((await execucoes()).map((e) => [e.resultado, e.telegram_ok]), [
    ['ok', null], ['falha', true], ['falha', true], ['falha', true],
  ])
})

test('falha e depois ok manda a mensagem de volta', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await rodar(horaEm(TERCA, 14), ERP_FORA)
  const volta = await rodar(horaEm(TERCA, 15))

  assert.equal(volta.resultado, 'ok')
  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H, 'Kaizen: voltou a funcionar às 15h.'])
  assert.equal((await execucoes())[2].telegram_ok, true)
})

test('a execução das 14h, com a última às 10h, avisa que faltaram as de 11h, 12h e 13h', async () => {
  await montarLoja()
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado)
     values ('hora', false, '2026-09-29 10:00:03-03', '2026-09-29 10:01:00-03', 'ok')`,
  )
  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [11, 12, 13].map((h) => ({
    tipo: 'execucao_faltou', chave: `faltou:2026-09-29:${h}`, texto: `a leitura das ${h}h de 29/09 não aconteceu`,
  })))
  assert.equal(saida.contagens.avisos, 3)
  assert.deepEqual(enviadas, ['Kaizen: voltou a funcionar às 14h.'])
})

test('documento apagado no ERP sai do Kaizen e vira aviso com número, tipo, data, valor e vendedor', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await falso.cliente.query('delete from documento where oid = 186')
  await falso.cliente.query('delete from documento_mercadoria where _iddocumento = 123')
  await falso.cliente.query('delete from documento_pagamento where _iddocumento = 123')

  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [
    { tipo: 'documento_apagado', chave: 'apagado:186', texto: 'o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP' },
  ])
  assert.equal(saida.contagens.apagados, 1)
  const docs = await banco.cliente.query('select origem_id from kaizen.documento order by origem_id')
  assert.deepEqual(docs.rows, [{ origem_id: '185' }])
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.estoque_movimento')).rows[0].n, '1')
})

test('migração que não se aplica é falha registrada, com mensagem', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracao-'))
  try {
    writeFileSync(join(pasta, '006_quebrada.sql'), 'select 1 / 0;\n')
    const saida = await rodar(horaEm(TERCA, 14), falso.erp, { pastaMigracoes: pasta })

    const detalhe = 'a migração 006_quebrada.sql não se aplicou: division by zero'
    assert.equal(saida.resultado, 'falha')
    assert.equal(saida.mensagem, detalhe)
    assert.deepEqual(enviadas, [`Kaizen: a leitura das 14h falhou — ${detalhe}. Abra uma sessão com o Claude e cole esta mensagem.`])
    const linhas = await execucoes()
    assert.equal(linhas.length, 1)
    assert.equal(linhas[0].resultado, 'falha')
    const registrada = await banco.cliente.query(`select count(*) as n from kaizen.migracao where nome = '006_quebrada.sql'`)
    assert.equal(registrada.rows[0].n, '0')
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
})

test('no estouro do prazo, a execução aberta vira falha e sai a mensagem; o estouro seguinte não repete', async () => {
  const estourar = (hora: number) => registrarEstouro(
    { tipo: 'hora', manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => horaEm(TERCA, hora) },
  )
  await banco.cliente.query(`insert into kaizen.execucao (tipo, manual) values ('hora', false)`)
  await estourar(14)

  const linhas = await execucoes()
  assert.equal(linhas.length, 1)
  assert.equal(linhas[0].resultado, 'falha')
  assert.equal(linhas[0].mensagem, 'a leitura das 14h passou do prazo')
  assert.equal(linhas[0].terminou, true)
  assert.equal(linhas[0].telegram_ok, true)
  assert.deepEqual(enviadas, ['Kaizen: a leitura das 14h falhou — passou do prazo. Abra uma sessão com o Claude e cole esta mensagem.'])

  // Às 15h estoura de novo: a mensagem das 14h chegou, então nada sai, e a linha das 15h herda o "já avisado".
  await banco.cliente.query(`insert into kaizen.execucao (tipo, manual) values ('hora', false)`)
  await estourar(15)

  assert.deepEqual((await execucoes()).map((e) => [e.resultado, e.mensagem, e.telegram_ok]), [
    ['falha', 'a leitura das 14h passou do prazo', true],
    ['falha', 'a leitura das 15h passou do prazo', true],
  ])
  assert.equal(enviadas.length, 1)
})

test('motivoDe classifica cada erro', () => {
  const comCodigo = (mensagem: string, code: string): Error => Object.assign(new Error(mensagem), { code })
  const casos: Array<[string, unknown, MotivoFalha]> = [
    ['erro do Kaizen fica com o próprio motivo',
      new ErroKaizen({ tipo: 'estrutura', detalhe: 'colunas que sumiram do ERP: documento.status' }),
      { tipo: 'estrutura', detalhe: 'colunas que sumiram do ERP: documento.status' }],
    ['token recusado', new ErroErp('token', 'o ERP recusou o token de acesso (HTTP 401)', 401),
      { tipo: 'token', detalhe: 'o ERP recusou o token de acesso (HTTP 401)' }],
    ['ERP sem resposta', new ErroErp('rede', 'o ERP não respondeu: sem resposta em 90 s'),
      { tipo: 'erp_fora', detalhe: 'o ERP não respondeu: sem resposta em 90 s' }],
    ['ERP com erro HTTP', new ErroErp('http', 'o ERP respondeu com erro (HTTP 502)', 502),
      { tipo: 'erp_fora', detalhe: 'o ERP respondeu com erro (HTTP 502)' }],
    ['consulta com erro no ERP', new ErroErp('consulta', 'column d.gmt does not exist', 400),
      { tipo: 'outra', detalhe: 'column d.gmt does not exist' }],
    ['SQL recusado pela trava', new ErroErp('recusado', 'recusado: tem ;'),
      { tipo: 'outra', detalhe: 'recusado: tem ;' }],
    ['banco recusou a conexão', Object.assign(new AggregateError([], ''), { code: 'ECONNREFUSED' }),
      { tipo: 'banco_fora', detalhe: 'ECONNREFUSED' }],
    ['senha do banco recusada', comCodigo('password authentication failed for user "kaizen"', '28P01'),
      { tipo: 'banco_fora', detalhe: 'password authentication failed for user "kaizen"' }],
    ['banco que não existe', comCodigo('database "prumo" does not exist', '3D000'),
      { tipo: 'banco_fora', detalhe: 'database "prumo" does not exist' }],
    ['banco ainda subindo', comCodigo('the database system is starting up', '57P03'),
      { tipo: 'banco_fora', detalhe: 'the database system is starting up' }],
    ['erro de gravação no banco', comCodigo('null value in column "produto" violates not-null constraint', '23502'),
      { tipo: 'outra', detalhe: 'null value in column "produto" violates not-null constraint' }],
    ['erro qualquer', new Error('algo quebrou'), { tipo: 'outra', detalhe: 'algo quebrou' }],
    ['algo que nem é erro', 'texto solto', { tipo: 'outra', detalhe: 'texto solto' }],
  ]
  for (const [nome, erro, esperado] of casos) {
    assert.deepEqual(motivoDe(erro), esperado, nome)
  }
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/execucao.test.mts`

Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\execucao.mts' imported from ...\tradutor\execucao.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 3: Implementar `tradutor/execucao.mts`**

Criar `tradutor/execucao.mts` com exatamente este conteúdo:

```ts
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'
import { avisoDocumentoApagado, avisoExecucaoPulada, avisoMovimentoSumiu } from './avisos.mts'
import { apagarSumidos, colocarEntrada, gravarCadastros, gravarDocumentos, gravarEstoque, podeApagar } from './carga.mts'
import { avisosDeFaltas, codigosSemTraducao, estoqueDiverge, fechamentosComResto } from './conferencias.mts'
import { FOLGA_OID, PRAZO_MIN, TRAVA } from './constantes.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { emFortaleza, horariosFaltando, inicioDaJanela, proximoHorario, rotuloHora } from './janela.mts'
import { contarDocumentosErp, lerCortes, maiorOid, oidsComParcelaAberta } from './kaizen.mts'
import { conferirColunas, conferirEmpresaLocal, lerCadastros, lerDocumentosHora, lerEstoque, lerVivos } from './leitura.mts'
import { aplicarMigracoes } from './migracoes.mts'
import {
  anteriorValida, execucaoPresa, horaDaUltimaBoa, marcarInterrompidas, marcarTelegram,
  registrarFim, registrarInicio, registrarPulada, ultimaNoiteBoa, ultimoInicioNaoManualMs,
} from './registro.mts'
import type { Anterior } from './registro.mts'
import { deveAvisarFalha, deveAvisarVolta, textoFalha, textoVolta } from './telegram.mts'
import type { Enviar } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'
import type { Aviso, MotivoFalha, Resultado, TipoExecucao } from './tipos.mts'

export type Dependencias = {
  erp: Erp
  conectarKaizen: () => Promise<Cliente>
  enviar: Enviar
  agora: () => number
  pastaMigracoes?: string
}

export type Saida = { resultado: Resultado; avisos: Aviso[]; mensagem: string | null; contagens: Record<string, number> }

type Opcoes = { tipo: TipoExecucao; manual: boolean }

// O que o caminho da falha precisa saber do que já aconteceu nesta execução.
type Estado = { id: number | null; anterior: Anterior | null; avisos: Aviso[]; faltaram: boolean }

// Sem conexão, senha recusada, banco inexistente, banco subindo.
const CODIGOS_BANCO_FORA = new Set(['ECONNREFUSED', '28P01', '3D000', '57P03'])

function mensagemDe(erro: unknown): string {
  if (erro instanceof Error) {
    if (erro.message) return erro.message
    // A recusa de conexão do Node chega como AggregateError sem mensagem, só com o código.
    const codigo = (erro as { code?: unknown }).code
    return typeof codigo === 'string' ? codigo : erro.name
  }
  return String(erro)
}

export function motivoDe(erro: unknown): MotivoFalha {
  if (erro instanceof ErroKaizen) return erro.motivo
  if (erro instanceof ErroErp) {
    if (erro.tipo === 'token') return { tipo: 'token', detalhe: erro.message }
    if (erro.tipo === 'rede' || erro.tipo === 'http') return { tipo: 'erp_fora', detalhe: erro.message }
    return { tipo: 'outra', detalhe: erro.message }
  }
  const codigo = (erro as { code?: unknown } | null)?.code
  if (typeof codigo === 'string' && CODIGOS_BANCO_FORA.has(codigo)) return { tipo: 'banco_fora', detalhe: mensagemDe(erro) }
  return { tipo: 'outra', detalhe: mensagemDe(erro) }
}

// Nenhum erro do envio pode impedir o resto do registro.
async function enviarSemErro(enviar: Enviar, texto: string): Promise<boolean | null> {
  try {
    return await enviar(texto)
  } catch {
    return false
  }
}

// 'às 15h' no mesmo dia; 'em 30/09 às 8h' quando a próxima leitura é em outro dia.
function textoProximo(agoraMs: number): string {
  const hoje = emFortaleza(agoraMs).data
  const proximo = proximoHorario(agoraMs)
  const rotulo = rotuloHora(proximo, hoje)
  return proximo.data === hoje ? `às ${rotulo}` : `em ${rotulo}`
}

async function existeExecucao(cliente: Cliente): Promise<boolean> {
  const r = await cliente.query<{ existe: boolean }>(`select to_regclass('kaizen.execucao') is not null as existe`)
  return r.rows[0].existe
}

// A execução que está rodando (sem fim): a que segura a trava, ou a desta própria leitura no estouro do prazo.
async function idDaAberta(cliente: Cliente): Promise<number | null> {
  const r = await cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao where fim is null')
  return r.rows[0].id === null ? null : Number(r.rows[0].id)
}

export async function executar(opcoes: Opcoes, dep: Dependencias): Promise<Saida> {
  const agora = dep.agora()
  const hora = emFortaleza(agora).hora
  let cliente: Cliente
  try {
    cliente = await dep.conectarKaizen()
  } catch (erro) {
    // Sem banco não há trava, registro nem estado: a mensagem sai a cada execução enquanto durar a queda.
    const motivo: MotivoFalha = { tipo: 'banco_fora', detalhe: `o banco do Kaizen não respondeu: ${mensagemDe(erro)}` }
    await enviarSemErro(dep.enviar, textoFalha(hora, motivo, null, textoProximo(agora)))
    return { resultado: 'falha', avisos: [], mensagem: motivo.detalhe, contagens: {} }
  }
  const estado: Estado = { id: null, anterior: null, avisos: [], faltaram: false }
  let travou = false
  try {
    const trava = await cliente.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [TRAVA])
    travou = trava.rows[0].ok
    if (!travou) {
      if (!(await existeExecucao(cliente))) return { resultado: 'pulada', avisos: [], mensagem: null, contagens: {} }
      if ((await execucaoPresa(cliente, PRAZO_MIN[opcoes.tipo])) !== null) {
        throw new ErroKaizen({ tipo: 'outra', detalhe: 'a leitura anterior ficou presa além do prazo' })
      }
      const aviso = avisoExecucaoPulada((await idDaAberta(cliente)) ?? 0)
      await registrarPulada(cliente, opcoes.tipo, opcoes.manual, aviso)
      return { resultado: 'pulada', avisos: [aviso], mensagem: null, contagens: {} }
    }
    await aplicarMigracoes(cliente, dep.pastaMigracoes)
    estado.id = await registrarInicio(cliente, opcoes.tipo, opcoes.manual)
    await marcarInterrompidas(cliente, estado.id)
    estado.anterior = await anteriorValida(cliente, estado.id)
    return await rodar(cliente, opcoes, dep, estado, estado.id, agora)
  } catch (erro) {
    return await falhar(cliente, opcoes, dep, estado, erro, agora)
  } finally {
    if (travou) await cliente.query('select pg_advisory_unlock($1)', [TRAVA]).catch(() => undefined)
    await cliente.end().catch(() => undefined)
  }
}

async function rodar(cliente: Cliente, opcoes: Opcoes, dep: Dependencias, estado: Estado, id: number, agora: number): Promise<Saida> {
  const erp = dep.erp
  if (!opcoes.manual) {
    const faltando = horariosFaltando(await ultimoInicioNaoManualMs(cliente, id), agora)
    estado.faltaram = faltando.length > 0
    estado.avisos.push(...avisosDeFaltas(faltando))
  }

  const cortes = await lerCortes(cliente)
  const faltam = await conferirColunas(erp)
  if (faltam.length > 0) {
    throw new ErroKaizen({ tipo: 'estrutura', detalhe: `colunas que sumiram do ERP: ${faltam.join(', ')}` })
  }
  const outras = await conferirEmpresaLocal(erp, cortes)
  if (outras.length > 0) {
    const lista = outras.map((o) => `${o.tabela}=${o.valor}`).join(', ')
    throw new ErroKaizen({ tipo: 'estrutura', detalhe: `apareceu outra empresa ou local de estoque: ${lista}` })
  }

  if (opcoes.tipo === 'noite') {
    // A releitura da noite entra na tarefa 14; até lá, pedir a noite é falha registrada.
    throw new ErroKaizen({ tipo: 'outra', detalhe: 'a leitura da noite ainda não existe nesta versão do tradutor' })
  }
  const maiorDocumento = (await maiorOid(cliente, 'documento')) ?? cortes.documento
  const selecao = {
    novosAcimaDe: Math.max(cortes.documento, maiorDocumento - FOLGA_OID),
    inicio: inicioDaJanela(agora, await ultimaNoiteBoa(cliente)),
    pendentes: await oidsComParcelaAberta(cliente),
  }
  const documentos = [await lerDocumentosHora(erp, cortes, selecao)]

  const textoVivos = await lerVivos(erp, cortes)
  const vivos = JSON.parse(textoVivos) as number[]
  const pode = podeApagar(await contarDocumentosErp(cliente), vivos.length)
  if (!pode.ok) throw new ErroKaizen({ tipo: 'outra', detalhe: pode.motivo })

  const maiorMovimento = (await maiorOid(cliente, 'estoque_movimento')) ?? cortes.mercadoria_estoque_historico
  const movimentosAcimaDe = Math.max(cortes.mercadoria_estoque_historico, maiorMovimento - FOLGA_OID)
  const textoEstoque = await lerEstoque(erp, cortes, movimentosAcimaDe)
  const textoCadastros = await lerCadastros(erp)

  // Os avisos da carga só valem se ela for gravada: ficam aqui até o commit.
  const avisosDaCarga: Aviso[] = []
  const carga = await emTransacao(cliente, async () => {
    await colocarEntrada(cliente, 'documentos', documentos)
    await colocarEntrada(cliente, 'vivos', [textoVivos])
    await colocarEntrada(cliente, 'estoque', [textoEstoque])
    await colocarEntrada(cliente, 'cadastros', [textoCadastros])
    // Cadastros antes, para o aviso de documento apagado já ter o nome do vendedor.
    const cadastros = await gravarCadastros(cliente)
    const lidos = await gravarDocumentos(cliente)
    avisosDaCarga.push(...(await fechamentosComResto(cliente)))
    const apagados = await apagarSumidos(cliente)
    avisosDaCarga.push(...apagados.map(avisoDocumentoApagado))
    const estoque = await gravarEstoque(cliente, false)
    avisosDaCarga.push(...estoque.sumidos.map((s) => avisoMovimentoSumiu(s.origem_id, s.produto)))
    return { cadastros, lidos, apagados: apagados.length, estoque }
  })
  estado.avisos.push(...avisosDaCarga)
  estado.avisos.push(...(await codigosSemTraducao(cliente)))
  estado.avisos.push(...(await estoqueDiverge(cliente)))

  const contagens: Record<string, number> = {
    documentos_lidos: carga.lidos.lidos,
    documentos_novos: carga.lidos.novos,
    apagados: carga.apagados,
    movimentos: carga.estoque.movimentos,
    foto: carga.estoque.foto,
    produtos: carga.cadastros.produtos,
    pessoas: carga.cadastros.pessoas,
    funcionarios: carga.cadastros.funcionarios,
    fornecedores: carga.cadastros.fornecedores,
    avisos: estado.avisos.length,
  }
  const resultado: Resultado = estado.avisos.length > 0 ? 'aviso' : 'ok'
  await registrarFim(cliente, id, { resultado, mensagem: null, contagens, avisos: estado.avisos })

  // Os dados já estão gravados: um erro daqui em diante não pode virar falha da leitura.
  if (deveAvisarVolta(resultado, estado.anterior, estado.faltaram)) {
    const ok = await enviarSemErro(dep.enviar, textoVolta(emFortaleza(agora).hora))
    await marcarTelegram(cliente, id, ok).catch(() => undefined)
  }
  return { resultado, avisos: estado.avisos, mensagem: null, contagens }
}

async function falhar(cliente: Cliente, opcoes: Opcoes, dep: Dependencias, estado: Estado, erro: unknown, agora: number): Promise<Saida> {
  const motivo = motivoDe(erro)
  // Falha antes do registro (trava presa, migração): registra se o banco deixar.
  if (estado.id === null) {
    try {
      estado.id = await registrarInicio(cliente, opcoes.tipo, opcoes.manual)
      estado.anterior = await anteriorValida(cliente, estado.id)
    } catch {
      // sem a tabela execucao, a falha fica só na mensagem
    }
  }
  let horaBoa: number | null = null
  try {
    horaBoa = await horaDaUltimaBoa(cliente, estado.id)
  } catch {
    horaBoa = null
  }
  if (estado.id !== null) {
    await registrarFim(cliente, estado.id, { resultado: 'falha', mensagem: motivo.detalhe, avisos: estado.avisos }).catch(() => undefined)
  }
  if (deveAvisarFalha(estado.anterior)) {
    const ok = await enviarSemErro(dep.enviar, textoFalha(emFortaleza(agora).hora, motivo, horaBoa, textoProximo(agora)))
    if (estado.id !== null) await marcarTelegram(cliente, estado.id, ok).catch(() => undefined)
  } else if (estado.id !== null) {
    // A queda já foi avisada e a mensagem chegou: esta falha herda o "já avisado", senão a próxima avisaria de novo.
    await marcarTelegram(cliente, estado.id, estado.anterior?.telegramOk ?? null).catch(() => undefined)
  }
  return { resultado: 'falha', avisos: estado.avisos, mensagem: motivo.detalhe, contagens: {} }
}

// Chamada pelo comando quando a execução passa do prazo: com uma conexão nova, marca como falha
// a execução que ficou aberta e manda a mensagem, se for o caso.
export async function registrarEstouro(opcoes: Opcoes, dep: Dependencias): Promise<void> {
  const agora = dep.agora()
  const hora = emFortaleza(agora).hora
  let cliente: Cliente | null = null
  let id: number | null = null
  let anterior: Anterior | null = null
  let horaBoa: number | null = null
  try {
    cliente = await dep.conectarKaizen()
    id = await idDaAberta(cliente)
    if (id !== null) {
      await registrarFim(cliente, id, { resultado: 'falha', mensagem: `a leitura das ${hora}h passou do prazo`, avisos: [] })
    }
    anterior = await anteriorValida(cliente, id)
    horaBoa = await horaDaUltimaBoa(cliente, id)
  } catch {
    // sem banco, a mensagem sai mesmo assim
  }
  if (deveAvisarFalha(anterior)) {
    const motivo: MotivoFalha = { tipo: 'outra', detalhe: 'passou do prazo' }
    const ok = await enviarSemErro(dep.enviar, textoFalha(hora, motivo, horaBoa, textoProximo(agora)))
    if (cliente !== null && id !== null) await marcarTelegram(cliente, id, ok).catch(() => undefined)
  } else if (cliente !== null && id !== null) {
    // Queda já avisada: a linha herda o "já avisado", como em falhar.
    await marcarTelegram(cliente, id, anterior?.telegramOk ?? null).catch(() => undefined)
  }
  await cliente?.end().catch(() => undefined)
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test tradutor/execucao.test.mts`

Expected: PASS, 19 testes (perto de 10 s no total):
```
✔ execução ok grava os documentos e registra ok com as contagens
✔ a segunda execução sem mudança no ERP continua ok e não duplica nada
✔ a folga de 200 relê o documento e o movimento gravados fora de ordem
✔ com a trava ocupada por outra conexão, a execução é pulada, com aviso, sem ler o ERP
✔ com a trava ocupada e a execução aberta há mais de 10 minutos, é falha e sai mensagem
✔ sem o banco do Kaizen, sai a mensagem de banco fora e nada é registrado
✔ coluna que sumiu do ERP é falha de estrutura, com a coluna na mensagem, e o Kaizen fica intacto
✔ ERP fora do ar é falha erp_fora, e a mensagem diz que ele tenta de novo às 15h
✔ token recusado pelo ERP manda a mensagem de trocar o segredo
✔ outra empresa no ERP é falha de estrutura, com a tabela e o valor, e nada é gravado
✔ lista de vivos vazia com 25 documentos no Kaizen é falha, e nada é apagado
✔ erro no meio da carga (item sem produto) é falha, e o Kaizen continua como antes
✔ falha que continua por várias horas manda uma mensagem só
✔ falha e depois ok manda a mensagem de volta
✔ a execução das 14h, com a última às 10h, avisa que faltaram as de 11h, 12h e 13h
✔ documento apagado no ERP sai do Kaizen e vira aviso com número, tipo, data, valor e vendedor
✔ migração que não se aplica é falha registrada, com mensagem
✔ no estouro do prazo, a execução aberta vira falha e sai a mensagem; o estouro seguinte não repete
✔ motivoDe classifica cada erro
ℹ tests 19
ℹ pass 19
ℹ fail 0
```

Se algum falhar, não mude o teste: ele descreve o que a spec pede (seções 6.3, 6.5, 6.6, 7.2 e 8). Veja antes se o texto das tarefas 10 e 12 está como no contrato.

- [ ] **Passo 5: Atualizar `testes-esperados.txt` (N = 19, todos em `execucao.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+19;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 19.

- [ ] **Passo 6: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 7: Commit da execução da hora**

```bash
git add tradutor/execucao.mts tradutor/execucao.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Execução da hora: trava, registro, carga e aviso de falha

O tradutor agora faz a leitura de hora em hora de ponta a ponta: pega a
trava (se outra leitura estiver rodando, esta fica registrada como
pulada), aplica as migrações, confere colunas e empresa, lê o ERP, grava
tudo numa transação só e registra o fim, com as contagens e os avisos.

Nos testes, com um ERP de mentira: duas leituras seguidas deixam os
mesmos 2 documentos, sem duplicar. Um documento e um movimento gravados
fora de ordem no ERP (350 e 2350, depois do 400 e do 2500) entram na
leitura seguinte pela folga de 200; os que estão abaixo dela (199 e
2250) não. Uma coluna que some, outra empresa, o ERP fora do ar, o token
recusado, a lista de vivos vazia com 25 documentos no Kaizen e um item
sem produto no meio da carga viram falha, e o Kaizen fica exatamente
como estava. O ERP fora do ar às 14h, 15h e 16h manda uma mensagem só
("tenta de novo às 15h"): cada falha seguinte herda o "já avisado". A
volta manda "voltou a funcionar às 15h". A leitura das 14h depois da
última às 10h avisa que faltaram as de 11h, 12h e 13h, e um pedido
apagado no ERP vira aviso: "o pedido 123 de 29/09 (R$ 150,00, vendedor
Igor) sumiu do ERP".

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit é criado.

- [ ] **Passo 8: Escrever o teste do comando**

Criar `tradutor/principal.test.mts` (os valores de ambiente são de mentira; o `fetch` é falso, e nenhum teste abre conexão):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lerConfig } from './config.mts'
import { comPrazo, principal } from './principal.mts'
import { textoTeste } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'

// Valores de mentira: nenhum teste fala com o ERP, o Telegram ou um banco de verdade.
const AMBIENTE = {
  MEUERP_TOKEN: 'token-de-teste',
  KAIZEN_URL: 'postgres://kaizen:senha@localhost:5434/kaizen',
  TELEGRAM_TOKEN: '123:abc',
  TELEGRAM_CHAT: '42',
}

test('lerConfig lê as variáveis e usa o endereço padrão do ERP', () => {
  assert.deepEqual(lerConfig(AMBIENTE), {
    erpUrl: 'https://api.meuerponline.com.br/publica',
    erpToken: 'token-de-teste',
    kaizenUrl: 'postgres://kaizen:senha@localhost:5434/kaizen',
    telegramToken: '123:abc',
    telegramChat: '42',
  })
  assert.deepEqual(
    lerConfig({ MEUERP_TOKEN: 't', KAIZEN_URL: 'postgres://k@localhost:5434/k', MEUERP_URL: 'http://localhost:9999/publica' }),
    { erpUrl: 'http://localhost:9999/publica', erpToken: 't', kaizenUrl: 'postgres://k@localhost:5434/k' },
  )
})

test('lerConfig recusa sem MEUERP_TOKEN ou sem KAIZEN_URL', () => {
  assert.throws(() => lerConfig({ KAIZEN_URL: 'postgres://k@localhost:5434/k' }), { message: 'falta MEUERP_TOKEN' })
  assert.throws(() => lerConfig({ MEUERP_TOKEN: 't', KAIZEN_URL: '  ' }), { message: 'falta KAIZEN_URL' })
})

test('comPrazo devolve o resultado quando termina a tempo, sem chamar aoEstourar', async () => {
  let estourou = false
  const valor = await comPrazo(async () => 'terminou', 1000, async () => {
    estourou = true
  })
  assert.equal(valor, 'terminou')
  assert.equal(estourou, false)
})

test('comPrazo estoura: chama aoEstourar e rejeita com "passou do prazo"', async () => {
  let estourou = false
  const nuncaTermina = () => new Promise<string>(() => undefined)
  await assert.rejects(
    comPrazo(nuncaTermina, 20, async () => {
      estourou = true
    }),
    (erro: unknown) => erro instanceof ErroKaizen && erro.motivo.tipo === 'outra' && erro.motivo.detalhe === 'passou do prazo',
  )
  assert.equal(estourou, true)
})

test('teste-telegram manda o textoTeste pelo Telegram e sai com 0', async () => {
  const pedidos: Array<{ url: string; corpo: { chat_id: string; text: string } }> = []
  const fetchFalso = (async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(url), corpo: JSON.parse(String(init?.body)) })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }) as typeof fetch

  const codigo = await principal(['teste-telegram'], AMBIENTE, fetchFalso)

  assert.equal(codigo, 0)
  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].url, 'https://api.telegram.org/bot123:abc/sendMessage')
  assert.equal(pedidos[0].corpo.text, textoTeste())
})

test('comando desconhecido sai com 2, sem ler a configuração', async () => {
  assert.equal(await principal([], {}), 2)
  assert.equal(await principal(['limpar'], {}), 2)
  assert.equal(await principal(['hora', '--forcar'], {}), 2)
})
```

- [ ] **Passo 9: Rodar e ver falhar**

Run: `node --test tradutor/principal.test.mts`

Expected: FAIL, porque os módulos ainda não existem:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\config.mts' imported from ...\tradutor\principal.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 10: Implementar `tradutor/config.mts`**

```ts
export type Config = { erpUrl: string; erpToken: string; kaizenUrl: string; telegramToken?: string; telegramChat?: string }

const ERP_PADRAO = 'https://api.meuerponline.com.br/publica'

function valor(env: Record<string, string | undefined>, nome: string): string | undefined {
  const texto = env[nome]?.trim()
  return texto ? texto : undefined
}

export function lerConfig(env: Record<string, string | undefined>): Config {
  const erpToken = valor(env, 'MEUERP_TOKEN')
  if (erpToken === undefined) throw new Error('falta MEUERP_TOKEN')
  const kaizenUrl = valor(env, 'KAIZEN_URL')
  if (kaizenUrl === undefined) throw new Error('falta KAIZEN_URL')
  const config: Config = { erpUrl: valor(env, 'MEUERP_URL') ?? ERP_PADRAO, erpToken, kaizenUrl }
  // Sem as duas variáveis do Telegram, as mensagens saem só no console (criarEnvioTelegram).
  const telegramToken = valor(env, 'TELEGRAM_TOKEN')
  const telegramChat = valor(env, 'TELEGRAM_CHAT')
  if (telegramToken !== undefined) config.telegramToken = telegramToken
  if (telegramChat !== undefined) config.telegramChat = telegramChat
  return config
}
```

- [ ] **Passo 11: Implementar `tradutor/principal.mts`**

```ts
import { conectar } from './banco.mts'
import { lerConfig } from './config.mts'
import { PRAZO_MIN } from './constantes.mts'
import { criarErp } from './erp.mts'
import { executar, registrarEstouro } from './execucao.mts'
import type { Dependencias, Saida } from './execucao.mts'
import { criarEnvioTelegram, textoTeste } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'
import type { TipoExecucao } from './tipos.mts'

const USO = 'uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram'

export async function comPrazo<T>(fazer: () => Promise<T>, prazoMs: number, aoEstourar: () => Promise<void>): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    // Depois que o prazo estoura, o resultado de fazer não vale mais, mesmo que chegue durante aoEstourar.
    let decidido = false
    const relogio = setTimeout(() => {
      decidido = true
      aoEstourar()
        .catch(() => undefined)
        .then(() => rejeitar(new ErroKaizen({ tipo: 'outra', detalhe: 'passou do prazo' })))
    }, prazoMs)
    Promise.resolve()
      .then(fazer)
      .then(
        (valor) => {
          if (decidido) return
          decidido = true
          clearTimeout(relogio)
          resolver(valor)
        },
        (erro: unknown) => {
          if (decidido) return
          decidido = true
          clearTimeout(relogio)
          rejeitar(erro)
        },
      )
  })
}

function linha(tipo: TipoExecucao, saida: Saida): string {
  const contagens = Object.entries(saida.contagens).map(([nome, n]) => `${nome}=${n}`).join(', ') || 'sem contagens'
  return `${tipo} ${saida.resultado}: ${contagens}${saida.mensagem ? ' — ' + saida.mensagem : ''}`
}

// Devolve o código de saída: 0 para ok, aviso e pulada; 1 para falha; 2 para comando errado.
export async function principal(argumentos: string[], env: Record<string, string | undefined>, fetchFn?: typeof fetch): Promise<number> {
  const [comando, ...resto] = argumentos
  if (comando === 'teste-telegram' && resto.length === 0) {
    const config = lerConfig(env)
    const enviar = criarEnvioTelegram(config.telegramToken, config.telegramChat, fetchFn)
    const ok = await enviar(textoTeste())
    if (ok === null) console.log('teste-telegram: TELEGRAM_TOKEN e TELEGRAM_CHAT não estão configurados; a mensagem saiu só aqui')
    else console.log(ok ? 'teste-telegram: o Telegram aceitou a mensagem' : 'teste-telegram: o Telegram não aceitou a mensagem')
    return ok === true ? 0 : 1
  }
  const manual = resto.length === 1 && resto[0] === '--manual'
  if ((comando !== 'hora' && comando !== 'noite') || (resto.length > 0 && !manual)) {
    console.log(USO)
    return 2
  }
  const tipo: TipoExecucao = comando
  const config = lerConfig(env)
  const dep: Dependencias = {
    erp: criarErp({ url: config.erpUrl, token: config.erpToken, fetch: fetchFn }),
    conectarKaizen: () => conectar(config.kaizenUrl),
    enviar: criarEnvioTelegram(config.telegramToken, config.telegramChat, fetchFn),
    agora: Date.now,
  }
  try {
    const saida = await comPrazo(
      () => executar({ tipo, manual }, dep),
      PRAZO_MIN[tipo] * 60_000,
      () => registrarEstouro({ tipo, manual }, dep),
    )
    console.log(linha(tipo, saida))
    return saida.resultado === 'falha' ? 1 : 0
  } catch (erro) {
    console.log(`${tipo} falha: ${erro instanceof Error ? erro.message : String(erro)}`)
    return 1
  }
}

if (import.meta.main) {
  let codigo = 1
  try {
    codigo = await principal(process.argv.slice(2), process.env)
  } catch (erro) {
    console.log(`o tradutor não começou: ${erro instanceof Error ? erro.message : String(erro)}`)
  }
  // Sai mesmo com uma conexão presa (estouro do prazo): fechar o processo solta a trava no Postgres.
  process.exit(codigo)
}
```

- [ ] **Passo 12: Rodar e ver passar**

Run: `node --test tradutor/principal.test.mts`

Expected: PASS, 6 testes. O comando imprime algumas linhas no meio (`teste-telegram: o Telegram aceitou a mensagem` e três vezes o uso), e o fim é:
```
✔ lerConfig lê as variáveis e usa o endereço padrão do ERP
✔ lerConfig recusa sem MEUERP_TOKEN ou sem KAIZEN_URL
✔ comPrazo devolve o resultado quando termina a tempo, sem chamar aoEstourar
✔ comPrazo estoura: chama aoEstourar e rejeita com "passou do prazo"
✔ teste-telegram manda o textoTeste pelo Telegram e sai com 0
✔ comando desconhecido sai com 2, sem ler a configuração
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

- [ ] **Passo 13: Conferir o comando de ponta a ponta, sem ERP e sem Telegram**

O ERP aponta para um endereço que recusa conexão (`127.0.0.1:9`), então nada sai da máquina; o banco é um descartável no Postgres local. Git Bash, na raiz do repositório:

Run: `node tradutor/principal.mts; echo "saída: $?"`
Expected:
```
uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram
saída: 2
```

Run: `env -u MEUERP_TOKEN -u KAIZEN_URL node tradutor/principal.mts hora; echo "saída: $?"`
Expected:
```
o tradutor não começou: falta MEUERP_TOKEN
saída: 1
```

Run:
```bash
docker compose exec -T postgres psql -U postgres -d postgres -c "create database kaizen_comando"
docker compose exec -T postgres psql -U postgres -d kaizen_comando -c "create schema kaizen authorization kaizen"
env -u TELEGRAM_TOKEN -u TELEGRAM_CHAT MEUERP_TOKEN=nenhum MEUERP_URL=http://127.0.0.1:9/publica \
  KAIZEN_URL=postgres://kaizen:kaizen-local@localhost:5434/kaizen_comando node tradutor/principal.mts hora; echo "saída: $?"
```
Expected (a hora e o "próximo" são os do seu relógio; sem Telegram configurado, a mensagem sai no console):
```
Kaizen: a leitura das 15h falhou — o ERP não respondeu. Nada a fazer: ele tenta de novo às 16h.
hora falha: sem contagens — o ERP não respondeu: fetch failed
saída: 1
```

Run: `docker compose exec -T postgres psql -U postgres -d kaizen_comando -At -c "select tipo, manual, resultado, mensagem from kaizen.execucao" -c "select count(*) from kaizen.migracao"`
Expected (o próprio comando aplicou as 5 migrações e registrou a falha):
```
hora|f|falha|o ERP não respondeu: fetch failed
5
```

Run: `docker compose exec -T postgres psql -U postgres -d postgres -c "drop database kaizen_comando with (force)"`
Expected: `DROP DATABASE`.

- [ ] **Passo 14: Atualizar `testes-esperados.txt` (N = 6, todos em `principal.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+6;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 6.

- [ ] **Passo 15: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 16: Commit do comando**

```bash
git add tradutor/config.mts tradutor/principal.mts tradutor/principal.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Comando do tradutor, com prazo e código de saída

"node tradutor/principal.mts hora" (ou "noite", com "--manual" quando
for rodado à mão) faz uma leitura com prazo de 10 minutos (30 na noite).
Passou disso, a leitura fica registrada como falha ("a leitura das 14h
passou do prazo"), sai a mensagem e o processo termina com código 1,
soltando a trava. ok, aviso e pulada terminam com 0. Cada execução
imprime uma linha com o resultado e as contagens.

"teste-telegram" manda a mensagem de teste. A configuração vem das
variáveis MEUERP_TOKEN e KAIZEN_URL (obrigatórias), MEUERP_URL,
TELEGRAM_TOKEN e TELEGRAM_CHAT; sem as duas do Telegram, as mensagens
saem só no console. Conferido de ponta a ponta com o ERP recusando a
conexão: o comando aplicou as 5 migrações, registrou a falha e saiu
com 1.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit é criado.

---

### Tarefa 14: Execução da noite e comparação de totais

**O que esta tarefa entrega, em resultado:** às 22h, o tradutor relê tudo o que está acima do corte, qualquer que seja a data: todos os documentos, em fatias de 5.000 números de `oid`, e todos os movimentos de estoque. O movimento que sumiu do ERP sai do Kaizen e vira aviso; mas se a lista de movimentos vier vazia ou com menos da metade dos que o Kaizen tem, é falha e nada é apagado (a mesma regra da lista de documentos vivos). Depois de gravar, ele compara, dia a dia, os totais do Kaizen com os do ERP (número de documentos por modelo e situação, soma dos itens, dos pagamentos, das parcelas e baixas das contas que pagam, da conferência do caixa e dos movimentos de estoque), e cada diferença vira um aviso com os dois números. No fim, manda o resumo dos avisos pelo Telegram: dia limpo não manda nada, aviso já informado vira "Continuam N avisos já informados.", e a noite que falha depois de registrar a sua linha manda o resumo mesmo assim. São 16 testes novos (7 + 9), em dois commits.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Postgres local de pé (`docker compose up -d --wait`, tarefa 1). As tarefas 1 a 13 precisam estar feitas. Nenhum teste fala com o ERP de verdade nem com o Telegram. Commits no Git Bash.

**Arquivos:**
- Criar: `sql/erp/totais.sql`
- Criar: `sql/kaizen/comparar.sql`
- Modificar: `tradutor/leitura.mts` (acrescentar `lerTotaisErp` no fim, depois de `lerAntesDaVirada`)
- Criar: `tradutor/comparacao.mts`
- Testar: `tradutor/comparacao.test.mts`
- Modificar: `tradutor/execucao.mts` (substituir o arquivo inteiro: a noite entra, e a hora continua igual)
- Testar: `tradutor/execucao-noite.test.mts`
- Modificar: `testes-esperados.txt` (soma 7 no primeiro commit e 9 no segundo)

**Interfaces:**
- Consome (tarefas 1 a 13; exatamente estes nomes):
  ```ts
  // tradutor/banco.mts (T1)
  export type Cliente = pg.Client
  export async function conectar(url: string): Promise<Cliente>
  export async function emTransacao<T>(cliente: Cliente, fazer: () => Promise<T>): Promise<T>

  // tradutor/tipos.mts (T2)
  export type Cortes = Record<TabelaCorte, number>
  export type Aviso = { tipo: TipoAviso; chave: string; texto: string }
  export type TipoExecucao = 'hora' | 'noite'

  // tradutor/apoio-teste.mts (T2), tradutor/erp-falso.mts e tradutor/sql-erp.mts (T5), só testes
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>
  export async function criarErpFalso(): Promise<ErpFalso>   // erp, cliente, consultas, inserir(tabela, linhas), fechar()
  export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }>

  // tradutor/sql-erp.mts (T5): o que leitura.mts já importa
  export function modeloErp(nome: string): string
  export function inteiro(n: number): string
  export function montar(modelo: string, valores: Record<string, string>): string

  // tradutor/erp.mts (T4)
  export class ErroErp extends Error { tipo: TipoErroErp; status: number | null }
  export type Erp = { consultar(sql: string): Promise<string> }

  // tradutor/leitura.mts (T7): o arquivo que esta tarefa modifica
  export async function lerDocumentosFaixa(erp: Erp, cortes: Cortes, de: number, ate: number): Promise<string>
  export async function lerVivos(erp: Erp, cortes: Cortes): Promise<string>
  export async function lerEstoque(erp: Erp, cortes: Cortes, movimentosAcimaDe: number): Promise<string>

  // tradutor/kaizen.mts (T8)
  export async function lerCortes(cliente: Cliente): Promise<Cortes>
  export async function maiorOid(cliente: Cliente, tabela: 'documento' | 'estoque_movimento'): Promise<number | null>

  // tradutor/carga.mts (T8 e T9)
  export async function colocarEntrada(cliente: Cliente, assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros', partes: string[]): Promise<void>
  export async function gravarDocumentos(cliente: Cliente): Promise<CargaDocumentos>
  export async function gravarEstoque(cliente: Cliente, completo: boolean): Promise<CargaEstoque>   // completo = true apaga e devolve os movimentos que não vieram
  export function podeApagar(noKaizen: number, vivos: number): { ok: true } | { ok: false; motivo: string }
  //   Kaizen vazio: pode; lista vazia: não pode; com 20 ou mais no Kaizen, lista com menos da metade: não pode

  // tradutor/constantes.mts (T10)
  export const TAMANHO_FATIA = 5000

  // tradutor/avisos.mts (T10)
  export function avisoTotalDiferente(dia: string, medida: string, erp: string, kaizen: string): Aviso
  //   chave `total:${dia}:${medida}:${erp}:${kaizen}`; texto `em ${diaMes(dia)}, ${medida}: ERP ${erp}, Kaizen ${kaizen}`

  // tradutor/registro.mts (T12)
  export async function avisosParaResumo(cliente: Cliente): Promise<{ avisos: Aviso[]; chavesAnteriores: string[] }>
  export async function marcarResumo(cliente: Cliente, id: number, chaves: string[]): Promise<void>

  // tradutor/telegram.mts (T12)
  export function textoResumo(avisos: Aviso[], chavesAnteriores: string[], hoje: string): { texto: string | null; chaves: string[] }

  // tradutor/execucao.mts (T13): o arquivo que esta tarefa substitui, com todos os outros nomes da T13
  export type Dependencias = { erp: Erp; conectarKaizen: () => Promise<Cliente>; enviar: Enviar; agora: () => number; pastaMigracoes?: string }
  export type Saida = { resultado: Resultado; avisos: Aviso[]; mensagem: string | null; contagens: Record<string, number> }
  export async function executar(opcoes: { tipo: TipoExecucao; manual: boolean }, dep: Dependencias): Promise<Saida>
  export function motivoDe(erro: unknown): MotivoFalha
  export async function registrarEstouro(opcoes: { tipo: TipoExecucao; manual: boolean }, dep: Dependencias): Promise<void>
  ```
- Produz:
  ```ts
  // tradutor/leitura.mts (acrescentado)
  export async function lerTotaisErp(erp: Erp, cortes: Cortes, documentoAte: number, movimentoAte: number): Promise<string>

  // tradutor/comparacao.mts
  export async function compararTotais(cliente: Cliente, totaisErp: string, documentoAte: number, movimentoAte: number): Promise<Aviso[]>
  // roda sql/kaizen/comparar.sql com $1::jsonb = totaisErp, $2 = documentoAte, $3 = movimentoAte; cada linha diferente vira avisoTotalDiferente

  // tradutor/execucao.mts: os mesmos nomes da T13; executar({ tipo: 'noite' }) passa a funcionar,
  // e registrarEstouro da noite manda o resumo antes da mensagem de falha.
  ```
  `sql/erp/totais.sql` (marcadores `corte_documento`, `corte_item`, `corte_pagamento`, `corte_parcela`, `corte_baixa`, `corte_conferencia`, `corte_historico`, `documento_ate`, `movimento_ate`) devolve em `dados` um array de `{ "dia": "AAAA-MM-DD", "medida": "...", "valor": "texto" }`, ordenado por dia e medida. `sql/kaizen/comparar.sql` devolve `dia, medida, erp, kaizen` (textos; o lado que não tem a linha vale `'0'`) só das linhas em que os dois números são diferentes.

**Regras desta tarefa (repetidas das seções globais):**
- Tudo em português. TypeScript só com sintaxe apagável, imports com `.mts`, tipos com `import type`. Testes com `node:test` e `node:assert/strict`, só `test(` no nível de cima.
- Consulta ao ERP (`sql/erp/*.sql`): um único comando; nada de `;`, comentário ou `select *`; nada do Postgres 15 ou 16 (o ERP roda o 14.17); todo `json_agg` dentro de `coalesce(..., '[]')`; `numeric` sai como texto; nunca `datahora::text` (o dia sai com `to_char(x, 'YYYY-MM-DD')`, que não depende da configuração de datas da sessão do ERP); só colunas de `sql/erp/colunas-esperadas.txt`; nenhuma palavra que a trava de só leitura recusa (`do`, `set`, `lock`...), nem como apelido; apelidos de tabela todos diferentes; ordenação por texto com `collate "C"`.
- Três testes da tarefa 5 (`tradutor/consultas-erp.test.mts`) percorrem sozinhos todo `sql/erp/*.sql`: `totais.sql` passa por eles sem mudar nada lá (os marcadores dele são inteiros, e o teste usa 184 para cada um). A contagem daquele arquivo não muda.
- Nenhum total passa por número do JavaScript: o texto do ERP vai inteiro ao Postgres do Kaizen (`$1::jsonb`), que compara em `numeric`.

**Como a comparação funciona (spec 6.4, passo 3; contrato, seção 8):**
- Os dois lados usam os filtros da carga. Documento: `oid` acima do corte e até `documento_ate`. Linha filha: `oid` acima do corte da sua tabela, ligada por `_iddocumento`. Parcelas e baixas: só de documento com `tipomovimentofinanceiro = 'P'`; a baixa só de parcela acima do corte (a carga só grava baixa dentro de uma parcela). Movimentos: `oid` acima do corte do histórico e até `movimento_ate`.
- Dia: o de `datahora` (no Kaizen, `criado_em`); nos movimentos, o de `momento`. Entram todos os dias com documento acima do corte, inclusive os de antes de 28/09 (as contas a pagar reimportadas têm datas de abril a setembro).
- Medidas: `documentos:${modelo}:${status}` (status vazio vira `-`), `itens:valor`, `pagamentos:valor`, `parcelas:quantidade`, `parcelas:valor`, `baixas:quantidade`, `baixas:valor`, `conferencia:calculado`, `conferencia:informado`, `movimentos:quantidade`, `movimentos:variacao` (soma de `saldo_depois − saldo_antes`). Todas as medidas de documento saem para todo dia que tenha documento; soma vazia vale `0`.
- "Igual" é igual em `numeric` (`150.00` e `150.000000` são iguais). Dia que só existe de um lado é comparado com zeros.

**Como a noite funciona (contrato, seção 9), para não "consertar" sem querer:**
- A noite é a hora com dois conjuntos maiores. Primeiro a lista de vivos e a proteção de `podeApagar`; depois, os documentos em fatias de `TAMANHO_FATIA` a partir de `corte + 1` até o maior `oid` da lista de vivos (`lerDocumentosFaixa`), todas lidas antes de gravar. Uma fatia que o ERP recusa com erro de consulta (a consulta tem no máximo 30 s) é falha com a faixa na mensagem: `a fatia de documentos de oid 5185 a 10184 falhou: ...`.
- Movimentos: todos acima do corte, e `gravarEstoque(cliente, true)`: o que não voltou sai, com `avisoMovimentoSumiu`.
- Antes de gravar, a lista de movimentos passa pela regra de `podeApagar` (`conferirMovimentos`): os movimentos do ERP novo no Kaizen (`select count(*) from kaizen.estoque_movimento where fonte = 'meuerp'`) contra os lidos (`JSON.parse(textoEstoque).movimentos.length`, só a contagem). Se não pode, é falha `outra` com `a lista de movimentos do ERP veio vazia ou menor que a metade; nada foi apagado`, antes da transação: nenhum movimento sai. Sem isso, uma lista que o ERP devolvesse vazia apagaria o histórico de estoque inteiro, com um aviso por movimento. A hora não passa por aqui: ela não apaga movimento.
- Depois do commit e das conferências, a comparação: `documentoAte` = maior `oid` da lista de vivos (ou o corte, se vazia); `movimentoAte` = maior `oid` de movimento no Kaizen, que depois da leitura completa é o maior lido (ou o corte).
- Depois de `registrarFim`: a mensagem de volta (se for o caso) e o resumo. Resumo: `avisosParaResumo` → `textoResumo(avisos, chavesAnteriores, data de hoje em Fortaleza)`. Sem texto (dia limpo): `marcarResumo(id, [])` e nada é enviado. Com texto: envia; se o Telegram não recusou (`true`, ou `null` quando não está configurado), `marcarResumo(id, chaves)`; se recusou, os avisos vão de novo no próximo resumo. `marcarTelegram` fica com o resultado do último envio.
- Na falha depois de registrar a linha, a noite manda primeiro o resumo e depois a mensagem de falha (assim `telegram_ok` guarda o resultado da mensagem de falha, que é o que decide se ela se repete). O estouro do prazo da noite (`registrarEstouro`) faz o mesmo. Quando a mensagem de falha não sai (a anterior é uma falha já avisada), a linha herda o `telegram_ok` da anterior, como na tarefa 13: é o que impede a falha seguinte de avisar de novo.
- A hora não muda: os 19 testes de `tradutor/execucao.test.mts` continuam passando com o arquivo novo.

**Por que os testes são assim:**
- `comparacao.test.mts` copia o ERP falso para o Kaizen com as funções da carga (sem `executar`), mexe num dos lados e compara. Os números aparecem como o Postgres os escreve: `'150.000000'` para um valor gravado com 6 casas.
- `execucao-noite.test.mts` usa o mesmo `rodar` da tarefa 13: depois de cada execução, troca o `inicio` das linhas novas pela hora fingida, porque o Postgres grava a hora de verdade.
- Para o resumo do dia seguinte não trazer "leituras que faltaram", o teste registra as 12 leituras de hora em hora do dia (`registrarDiaDeHoras`).
- `falso.consultas` acumula entre os testes: conte só as consultas feitas depois de `const antes = falso.consultas.length`.
- Os textos conferidos vêm do contrato (seções 5): `textoResumo` (`Kaizen — resumo de 29/09:`, `Códigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:`, `Continuam 1 avisos já informados.`), `avisoCodigoSemTraducao`, `avisoMovimentoSumiu`, `avisoTotalDiferente` e `textoFalha`. Se um teste falhar só por um texto, compare a tarefa 10 ou 12 com o contrato antes de mexer no teste.

- [ ] **Passo 1: Escrever o teste da comparação**

Criar `tradutor/comparacao.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { emTransacao } from './banco.mts'
import { colocarEntrada, gravarDocumentos, gravarEstoque } from './carga.mts'
import { compararTotais } from './comparacao.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { lerCortes } from './kaizen.mts'
import { lerDocumentosFaixa, lerEstoque, lerTotaisErp } from './leitura.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import type { Aviso } from './tipos.mts'

let banco: BancoTeste
let falso: ErpFalso

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  await falso.cliente.query(TABELAS_DO_ERP.map((tabela) => `delete from ${tabela}`).join('; '))
  await banco.cliente.query('truncate kaizen.documento, kaizen.estoque_movimento, kaizen.estoque_atual restart identity cascade')
})

// Copia para o Kaizen tudo o que o ERP falso tem acima do corte, como a releitura da noite faz.
async function copiarDoErp(): Promise<void> {
  const cortes = await lerCortes(banco.cliente)
  const documentos = await lerDocumentosFaixa(falso.erp, cortes, cortes.documento + 1, 1_000_000)
  const estoque = await lerEstoque(falso.erp, cortes, cortes.mercadoria_estoque_historico)
  await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [documentos])
    await colocarEntrada(banco.cliente, 'estoque', [estoque])
    await gravarDocumentos(banco.cliente)
    await gravarEstoque(banco.cliente, true)
  })
}

async function totaisDoErp(documentoAte: number, movimentoAte: number): Promise<Array<{ dia: string; medida: string; valor: string }>> {
  const cortes = await lerCortes(banco.cliente)
  return JSON.parse(await lerTotaisErp(falso.erp, cortes, documentoAte, movimentoAte))
}

async function comparar(documentoAte = 1_000_000, movimentoAte = 1_000_000): Promise<Aviso[]> {
  const cortes = await lerCortes(banco.cliente)
  const totais = await lerTotaisErp(falso.erp, cortes, documentoAte, movimentoAte)
  return compararTotais(banco.cliente, totais, documentoAte, movimentoAte)
}

function diferenca(dia: string, medida: string, erp: string, kaizen: string): Aviso {
  const [, mes, d] = dia.split('-')
  return { tipo: 'total_diferente', chave: `total:${dia}:${medida}:${erp}:${kaizen}`, texto: `em ${d}/${mes}, ${medida}: ERP ${erp}, Kaizen ${kaizen}` }
}

// Terça, 29/09: o pedido 123 (R$ 150,00 em dinheiro), o fechamento 125 com a conferência de duas formas,
// e dois movimentos de estoque do produto 60.
async function montarDia(): Promise<void> {
  await falso.inserir('documento', [
    { oid: 186, _iddocumento: 123, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R', datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idempresa: 1 },
    { oid: 188, _iddocumento: 125, modelo: 'FC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-29 18:40:00', datahoramovimento: '2026-09-29 18:40:00', idempresa: 1 },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 123, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '1.000000', valtotalliquido: '150.000000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 1, _iddocumento: 123, _idsequencia: 1, idpagamento: 1, valor: '150.00' }])
  await falso.inserir('documento_conferencia_caixa', [
    { oid: 31, _iddocumento: 125, _idpagamento: 1, valdisponivel: '208.00', valconferido: '200.00' },
    { oid: 32, _iddocumento: 125, _idpagamento: 2, valdisponivel: '35.50', valconferido: '35.50' },
  ])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1848, _iddocumento: 123, _idlocalestoque: 1, datahora: '2026-09-29 10:15:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
    { oid: 1849, _iddocumento: 124, _idlocalestoque: 1, datahora: '2026-09-29 11:00:00', idmercadoriavariacao: 60, qtdsaldoatual: '2.000000', qtdnovosaldo: '1.000000' },
  ])
}

// Conta a pagar reimportada: nasceu em abril, mas está acima do corte. Uma parcela pendente e outra paga em 29/09.
async function montarContaReimportada(): Promise<void> {
  await falso.inserir('documento', [
    { oid: 190, _iddocumento: 140, modelo: 'CP', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'P', datahora: '2026-04-15 00:00:00', idempresa: 1, idpessoa: 900123 },
  ])
  await falso.inserir('documento_parcela', [
    { oid: 1, _iddocumento: 140, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-04-15 00:00:00', dtvencimento: '2026-10-10 00:00:00', valparcela: '1200.00', status: 'P', descricao: 'NF 5521 1/2' },
    { oid: 2, _iddocumento: 140, _idsequencia: 1, _idparcela: 2, dtlancamento: '2026-04-15 00:00:00', dtvencimento: '2026-09-29 00:00:00', valparcela: '800.00', status: 'B', descricao: 'NF 5521 2/2' },
  ])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 1, _iddocumento: 140, _idsequencia: 1, _idparcela: 2, _idsequenciapagamento: 1, dtpagamento: '2026-09-29 00:00:00', valpagamento: '800.00', idpagamento: 1, status: 'E' },
  ])
}

test('com o Kaizen igual ao ERP, a comparação não acha diferença', async () => {
  await montarDia()
  await montarContaReimportada()
  await copiarDoErp()
  assert.deepEqual(await comparar(), [])
})

test('item apagado no Kaizen depois da carga aparece como total diferente, com os dois números', async () => {
  await montarDia()
  await copiarDoErp()
  await banco.cliente.query(`delete from kaizen.documento_item where origem_id = '1873'`)

  assert.deepEqual(await comparar(), [diferenca('2026-09-29', 'itens:valor', '150.000000', '0')])
})

test('a conta a pagar reimportada, com data antes de 28/09 e acima do corte, entra na comparação', async () => {
  await montarContaReimportada()
  await copiarDoErp()

  const deAbril = (await totaisDoErp(1_000_000, 1_000_000)).filter((t) => t.dia === '2026-04-15')
  assert.deepEqual(deAbril, [
    { dia: '2026-04-15', medida: 'baixas:quantidade', valor: '1' },
    { dia: '2026-04-15', medida: 'baixas:valor', valor: '800.00' },
    { dia: '2026-04-15', medida: 'conferencia:calculado', valor: '0' },
    { dia: '2026-04-15', medida: 'conferencia:informado', valor: '0' },
    { dia: '2026-04-15', medida: 'documentos:CP:E', valor: '1' },
    { dia: '2026-04-15', medida: 'itens:valor', valor: '0' },
    { dia: '2026-04-15', medida: 'pagamentos:valor', valor: '0' },
    { dia: '2026-04-15', medida: 'parcelas:quantidade', valor: '2' },
    { dia: '2026-04-15', medida: 'parcelas:valor', valor: '2000.00' },
  ])
  assert.deepEqual(await comparar(), [])

  await banco.cliente.query(`delete from kaizen.baixa where origem_id = '1'`)
  assert.deepEqual(await comparar(), [
    diferenca('2026-04-15', 'baixas:quantidade', '1', '0'),
    diferenca('2026-04-15', 'baixas:valor', '800.00', '0'),
  ])
})

test('parcelas e baixas de uma venda (financeiro R) não entram na comparação', async () => {
  // Venda no cartão de crédito depois da mudança de 26/09: o ERP grava uma conta a receber, que o Kaizen não copia.
  await falso.inserir('documento', [
    { oid: 187, _iddocumento: 124, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R', datahora: '2026-09-29 11:30:00', datahoramovimento: '2026-09-29 11:31:00', idempresa: 1 },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1874, _iddocumento: 124, _idsequencia: 1, idmercadoriavariacao: 61, qtd: '1.000000', valtotalliquido: '59.500000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 2, _iddocumento: 124, _idsequencia: 1, idpagamento: 3, valor: '59.50' }])
  await falso.inserir('documento_parcela', [
    { oid: 3, _iddocumento: 124, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-29 11:30:00', dtvencimento: '2026-09-29 11:30:00', valparcela: '59.50', status: 'B' },
  ])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 2, _iddocumento: 124, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-30 00:00:00', valpagamento: '59.50', idpagamento: 3, status: 'E' },
  ])
  await copiarDoErp()

  const parcelasNoKaizen = await banco.cliente.query('select count(*) as n from kaizen.parcela')
  assert.equal(parcelasNoKaizen.rows[0].n, '0')
  const doDia = (await totaisDoErp(1_000_000, 1_000_000)).filter((t) => t.medida.startsWith('parcelas:') || t.medida.startsWith('baixas:'))
  assert.deepEqual(doDia.map((t) => t.valor), ['0', '0', '0', '0'])
  assert.deepEqual(await comparar(), [])
})

test('linha filha no corte ou abaixo, e documento acima do maior oid lido, ficam fora dos dois lados', async () => {
  await montarDia()
  // Um resto de teste de 26/09 (item 1800, abaixo do corte 1872) pendurado no pedido 123.
  await falso.inserir('documento_mercadoria', [
    { oid: 1800, _iddocumento: 123, _idsequencia: 9, idmercadoriavariacao: 70, qtd: '1.000000', valtotalliquido: '999.000000', idpessoafuncionario: 1 },
  ])
  // Um pedido gravado depois da leitura: acima do maior oid lido (188).
  await falso.inserir('documento', [
    { oid: 189, _iddocumento: 126, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R', datahora: '2026-09-29 21:50:00', idempresa: 1 },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1875, _iddocumento: 126, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '1.000000', valtotalliquido: '20.000000', idpessoafuncionario: 1 },
  ])
  await copiarDoErp()

  const totais = await totaisDoErp(188, 1_000_000)
  assert.deepEqual(totais.filter((t) => t.medida === 'itens:valor'), [{ dia: '2026-09-29', medida: 'itens:valor', valor: '150.000000' }])
  assert.deepEqual(totais.filter((t) => t.medida.startsWith('documentos:')).map((t) => `${t.medida}=${t.valor}`), ['documentos:FC:E=1', 'documentos:PA:E=1'])
  assert.deepEqual(await comparar(188, 1_000_000), [])
})

test('movimentos entram pelo dia de momento, com a soma das variações, até o maior oid lido', async () => {
  await montarDia()
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1850, _iddocumento: 127, _idlocalestoque: 1, datahora: '2026-09-30 09:00:00', idmercadoriavariacao: 60, qtdsaldoatual: '1.000000', qtdnovosaldo: '5.000000' },
    { oid: 1851, _iddocumento: 128, _idlocalestoque: 1, datahora: '2026-09-30 09:30:00', idmercadoriavariacao: 60, qtdsaldoatual: '5.000000', qtdnovosaldo: '4.000000' },
  ])
  await copiarDoErp()

  const movimentos = (await totaisDoErp(1_000_000, 1850)).filter((t) => t.medida.startsWith('movimentos:'))
  assert.deepEqual(movimentos, [
    { dia: '2026-09-29', medida: 'movimentos:quantidade', valor: '2' },
    { dia: '2026-09-29', medida: 'movimentos:variacao', valor: '-2.000000' },
    { dia: '2026-09-30', medida: 'movimentos:quantidade', valor: '1' },
    { dia: '2026-09-30', medida: 'movimentos:variacao', valor: '4.000000' },
  ])
  assert.deepEqual(await comparar(1_000_000, 1850), [])

  await banco.cliente.query(`delete from kaizen.estoque_movimento where origem_id = '1850'`)
  assert.deepEqual(await comparar(1_000_000, 1850), [
    diferenca('2026-09-30', 'movimentos:quantidade', '1', '0'),
    diferenca('2026-09-30', 'movimentos:variacao', '4.000000', '0'),
  ])
})

test('um dia que só existe de um lado é comparado com zeros', async () => {
  await montarDia()
  await copiarDoErp()
  // Um documento que só o Kaizen tem, em 30/09.
  await banco.cliente.query(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, criado_em)
     values ('meuerp', 'documento', '187', '124', 'PA', 'E', '2026-09-30 09:00:00')`,
  )

  assert.deepEqual(await comparar(), [diferenca('2026-09-30', 'documentos:PA:E', '0', '1')])
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/comparacao.test.mts`

Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\comparacao.mts' imported from ...\tradutor\comparacao.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 3: Criar `sql/erp/totais.sql`**

Exatamente este conteúdo (sem `;` no fim e sem comentário; começa por `with`, que a trava de só leitura aceita):

```sql
with dc as (
  select d._iddocumento as iddoc, d.modelo as modelo, d.status as situacao,
    d.tipomovimentofinanceiro as financeiro, to_char(d.datahora, 'YYYY-MM-DD') as dia
  from documento d
  where d.oid > {{corte_documento}} and d.oid <= {{documento_ate}}
),
ds as (
  select distinct dx.dia as dia from dc dx
),
it as (
  select di.dia as dia, sum(m.valtotalliquido) as valor
  from dc di
  join documento_mercadoria m on m._iddocumento = di.iddoc and m.oid > {{corte_item}}
  group by di.dia
),
pa as (
  select dp.dia as dia, sum(p.valor) as valor
  from dc dp
  join documento_pagamento p on p._iddocumento = dp.iddoc and p.oid > {{corte_pagamento}}
  group by dp.dia
),
pc as (
  select dq.dia as dia, count(*) as quantidade, sum(q.valparcela) as valor
  from dc dq
  join documento_parcela q on q._iddocumento = dq.iddoc and q.oid > {{corte_parcela}}
  where dq.financeiro = 'P'
  group by dq.dia
),
bx as (
  select db.dia as dia, count(*) as quantidade, sum(b.valpagamento) as valor
  from dc db
  join documento_parcela qb on qb._iddocumento = db.iddoc and qb.oid > {{corte_parcela}}
  join documento_parcela_pagamento b on b._iddocumento = qb._iddocumento and b._idsequencia = qb._idsequencia
    and b._idparcela = qb._idparcela and b.oid > {{corte_baixa}}
  where db.financeiro = 'P'
  group by db.dia
),
cf as (
  select dk.dia as dia, sum(c.valdisponivel) as calculado, sum(c.valconferido) as informado
  from dc dk
  join documento_conferencia_caixa c on c._iddocumento = dk.iddoc and c.oid > {{corte_conferencia}}
  group by dk.dia
),
mv as (
  select to_char(h.datahora, 'YYYY-MM-DD') as dia, count(*) as quantidade,
    sum(coalesce(h.qtdnovosaldo, 0) - coalesce(h.qtdsaldoatual, 0)) as variacao
  from mercadoria_estoque_historico h
  where h.oid > {{corte_historico}} and h.oid <= {{movimento_ate}}
  group by to_char(h.datahora, 'YYYY-MM-DD')
),
tt as (
  select dm.dia as dia, 'documentos:' || dm.modelo || ':' || coalesce(dm.situacao, '-') as medida, count(*)::text as valor
  from dc dm
  group by dm.dia, dm.modelo, dm.situacao
  union all
  select ds.dia, v.medida, v.valor
  from ds
  left join it on it.dia = ds.dia
  left join pa on pa.dia = ds.dia
  left join pc on pc.dia = ds.dia
  left join bx on bx.dia = ds.dia
  left join cf on cf.dia = ds.dia
  cross join lateral (values
    ('itens:valor', coalesce(it.valor, 0)::text),
    ('pagamentos:valor', coalesce(pa.valor, 0)::text),
    ('parcelas:quantidade', coalesce(pc.quantidade, 0)::text),
    ('parcelas:valor', coalesce(pc.valor, 0)::text),
    ('baixas:quantidade', coalesce(bx.quantidade, 0)::text),
    ('baixas:valor', coalesce(bx.valor, 0)::text),
    ('conferencia:calculado', coalesce(cf.calculado, 0)::text),
    ('conferencia:informado', coalesce(cf.informado, 0)::text)
  ) as v (medida, valor)
  union all
  select mv.dia, w.medida, w.valor
  from mv
  cross join lateral (values
    ('movimentos:quantidade', mv.quantidade::text),
    ('movimentos:variacao', mv.variacao::text)
  ) as w (medida, valor)
)
select coalesce(json_agg(json_build_object('dia', tt.dia, 'medida', tt.medida, 'valor', tt.valor)
  order by tt.dia collate "C", tt.medida collate "C"), '[]')::text as dados
from tt
```

- [ ] **Passo 4: Criar `sql/kaizen/comparar.sql`**

Esta roda no banco do Kaizen, com parâmetros, e por isso pode ter comentário:

```sql
-- $1: totais do ERP (sql/erp/totais.sql); $2: maior oid de documento lido; $3: maior oid de movimento lido.
-- Os dois lados usam os mesmos filtros da carga, por dia de criado_em (documentos) e de momento (movimentos).
with erp as (
  select e->>'dia' as dia, e->>'medida' as medida, e->>'valor' as valor
  from jsonb_array_elements($1::jsonb) e
),
dc as (
  select d.id, d.modelo, d.status, d.financeiro, to_char(d.criado_em, 'YYYY-MM-DD') as dia
  from kaizen.documento d
  where d.fonte = 'meuerp' and d.origem_id::bigint <= $2::bigint
),
ds as (
  select distinct dc.dia from dc
),
it as (
  select dc.dia, sum(i.valor_liquido) as valor
  from dc join kaizen.documento_item i on i.documento_id = dc.id
  group by dc.dia
),
pa as (
  select dc.dia, sum(p.valor) as valor
  from dc join kaizen.documento_pagamento p on p.documento_id = dc.id
  group by dc.dia
),
pc as (
  select dc.dia, count(*) as quantidade, sum(q.valor) as valor
  from dc join kaizen.parcela q on q.documento_id = dc.id
  where dc.financeiro = 'P'
  group by dc.dia
),
bx as (
  select dc.dia, count(*) as quantidade, sum(b.valor) as valor
  from dc
  join kaizen.parcela q on q.documento_id = dc.id
  join kaizen.baixa b on b.parcela_id = q.id
  where dc.financeiro = 'P'
  group by dc.dia
),
cf as (
  select dc.dia, sum(c.calculado) as calculado, sum(c.informado) as informado
  from dc join kaizen.conferencia_caixa c on c.documento_id = dc.id
  group by dc.dia
),
mv as (
  select to_char(m.momento, 'YYYY-MM-DD') as dia, count(*) as quantidade,
    sum(coalesce(m.saldo_depois, 0) - coalesce(m.saldo_antes, 0)) as variacao
  from kaizen.estoque_movimento m
  where m.fonte = 'meuerp' and m.origem_id::bigint <= $3::bigint
  group by 1
),
kz as (
  select dc.dia, 'documentos:' || dc.modelo || ':' || coalesce(dc.status, '-') as medida, count(*)::text as valor
  from dc
  group by dc.dia, dc.modelo, dc.status
  union all
  select ds.dia, v.medida, v.valor
  from ds
  left join it on it.dia = ds.dia
  left join pa on pa.dia = ds.dia
  left join pc on pc.dia = ds.dia
  left join bx on bx.dia = ds.dia
  left join cf on cf.dia = ds.dia
  cross join lateral (values
    ('itens:valor', coalesce(it.valor, 0)::text),
    ('pagamentos:valor', coalesce(pa.valor, 0)::text),
    ('parcelas:quantidade', coalesce(pc.quantidade, 0)::text),
    ('parcelas:valor', coalesce(pc.valor, 0)::text),
    ('baixas:quantidade', coalesce(bx.quantidade, 0)::text),
    ('baixas:valor', coalesce(bx.valor, 0)::text),
    ('conferencia:calculado', coalesce(cf.calculado, 0)::text),
    ('conferencia:informado', coalesce(cf.informado, 0)::text)
  ) as v (medida, valor)
  union all
  select mv.dia, w.medida, w.valor
  from mv
  cross join lateral (values
    ('movimentos:quantidade', mv.quantidade::text),
    ('movimentos:variacao', mv.variacao::text)
  ) as w (medida, valor)
)
select
  coalesce(e.dia, k.dia) as dia,
  coalesce(e.medida, k.medida) as medida,
  coalesce(e.valor, '0') as erp,
  coalesce(k.valor, '0') as kaizen
from erp e
full outer join kz k on k.dia = e.dia and k.medida = e.medida
where coalesce(e.valor::numeric, 0) <> coalesce(k.valor::numeric, 0)
order by 1, 2
```

- [ ] **Passo 5: Acrescentar `lerTotaisErp` no fim de `tradutor/leitura.mts`**

Cole este trecho depois da última linha do arquivo (o `}` que fecha `lerAntesDaVirada`), com uma linha em branco antes. Os imports do topo não mudam: `inteiro`, `modeloErp` e `montar` já estão lá.

```ts
// Noite: totais por dia no ERP, com os mesmos filtros da carga, até o maior oid lido nesta execução.
export async function lerTotaisErp(erp: Erp, cortes: Cortes, documentoAte: number, movimentoAte: number): Promise<string> {
  const sql = montar(modeloErp('totais'), {
    corte_documento: inteiro(cortes.documento),
    corte_item: inteiro(cortes.documento_mercadoria),
    corte_pagamento: inteiro(cortes.documento_pagamento),
    corte_parcela: inteiro(cortes.documento_parcela),
    corte_baixa: inteiro(cortes.documento_parcela_pagamento),
    corte_conferencia: inteiro(cortes.documento_conferencia_caixa),
    corte_historico: inteiro(cortes.mercadoria_estoque_historico),
    documento_ate: inteiro(documentoAte),
    movimento_ate: inteiro(movimentoAte),
  })
  return erp.consultar(sql)
}
```

- [ ] **Passo 6: Criar `tradutor/comparacao.mts`**

```ts
import { readFileSync } from 'node:fs'
import { avisoTotalDiferente } from './avisos.mts'
import type { Cliente } from './banco.mts'
import type { Aviso } from './tipos.mts'

// Compara, por dia e por medida, os totais do ERP (sql/erp/totais.sql) com os do Kaizen; só lê.
export async function compararTotais(cliente: Cliente, totaisErp: string, documentoAte: number, movimentoAte: number): Promise<Aviso[]> {
  const sql = readFileSync(new URL('../sql/kaizen/comparar.sql', import.meta.url), 'utf8')
  // O texto do ERP vai inteiro ao Postgres ($1::jsonb): nenhum total passa por número do JavaScript.
  const r = await cliente.query<{ dia: string; medida: string; erp: string; kaizen: string }>(sql, [totaisErp, documentoAte, movimentoAte])
  return r.rows.map((l) => avisoTotalDiferente(l.dia, l.medida, l.erp, l.kaizen))
}
```

- [ ] **Passo 7: Rodar e ver passar**

Run: `node --test tradutor/comparacao.test.mts`

Expected: PASS, 7 testes:
```
✔ com o Kaizen igual ao ERP, a comparação não acha diferença
✔ item apagado no Kaizen depois da carga aparece como total diferente, com os dois números
✔ a conta a pagar reimportada, com data antes de 28/09 e acima do corte, entra na comparação
✔ parcelas e baixas de uma venda (financeiro R) não entram na comparação
✔ linha filha no corte ou abaixo, e documento acima do maior oid lido, ficam fora dos dois lados
✔ movimentos entram pelo dia de momento, com a soma das variações, até o maior oid lido
✔ um dia que só existe de um lado é comparado com zeros
ℹ tests 7
ℹ pass 7
ℹ fail 0
```

Run: `node --test tradutor/consultas-erp.test.mts`

Expected: PASS, com a mesma contagem de antes (`ℹ tests 13`, `ℹ pass 13`): `totais.sql` passa na trava de só leitura, não usa nada do Postgres 15 ou 16 e roda no ERP falso vazio devolvendo JSON.

- [ ] **Passo 8: Atualizar `testes-esperados.txt` (N = 7, todos em `comparacao.test.mts`), verificar e fazer o commit**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+7;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```
Expected: imprime o número novo, que é o anterior mais 7.

Run: `npm run verificar`
Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

```bash
git add sql/erp/totais.sql sql/kaizen/comparar.sql tradutor/leitura.mts tradutor/comparacao.mts tradutor/comparacao.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Comparação dos totais de cada dia entre o ERP e o Kaizen

Uma consulta ao ERP soma, por dia, o número de documentos por modelo e
situação, o valor dos itens, dos pagamentos, das parcelas e baixas das
contas que pagam, da conferência do caixa e dos movimentos de estoque,
com os mesmos filtros da carga. O Kaizen soma o mesmo do seu lado, e cada
número diferente vira um aviso com os dois valores, por exemplo "em
29/09, itens:valor: ERP 150.000000, Kaizen 0".

Nos testes: com os dois lados iguais, nenhuma diferença. A conta a pagar
reimportada, com data de abril e acima do corte, entra (2 parcelas,
R$ 2.000,00, e a baixa de R$ 800,00). As parcelas de uma venda no
crédito (a receber) não entram em nenhum dos lados. Um resto de teste
abaixo do corte e um pedido gravado depois da leitura ficam fora.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit é criado.

- [ ] **Passo 9: Escrever o teste da noite**

Criar `tradutor/execucao-noite.test.mts`:

```ts
import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { executar, registrarEstouro } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import type { TipoExecucao } from './tipos.mts'

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
       kaizen.produto_fornecedor, kaizen.pessoa, kaizen.funcionario, kaizen.execucao restart identity cascade`,
  )
})

// Telegram falso: guarda cada mensagem e diz que o Telegram aceitou.
async function enviar(texto: string): Promise<boolean> {
  enviadas.push(texto)
  return true
}

// Hora cheia de Fortaleza (UTC−3), em milissegundos: horaEm('2026-09-29', 22) é terça, 22h.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

async function maiorId(): Promise<number> {
  const r = await banco.cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao')
  return Number(r.rows[0].id ?? 0)
}

// Roda uma execução com o relógio fingido e, depois, põe no registro a hora fingida (o Postgres grava a hora de verdade).
async function rodar(quando: number, tipo: TipoExecucao = 'noite', erp: Erp = falso.erp): Promise<Saida> {
  const antes = await maiorId()
  const saida = await executar(
    { tipo, manual: false },
    { erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => quando },
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

// As 12 leituras de hora em hora de um dia, todas ok e sem aviso.
async function registrarDiaDeHoras(dia: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado)
     select 'hora', false, ($1 || ' ' || h || ':00:03-03')::timestamptz, ($1 || ' ' || h || ':01:00-03')::timestamptz, 'ok'
       from generate_series(8, 19) h`,
    [dia],
  )
}

async function execucoes(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select id::int as id, tipo, resultado, mensagem, avisos, resumo_ok, resumo_chaves, telegram_ok
       from kaizen.execucao order by id`,
  )
  return r.rows
}

// Terça, 29/09: o pedido 123 (R$ 150,00 em dinheiro, vendedor Igor), o movimento dele e a foto que bate, e os cadastros.
async function montarLoja(): Promise<void> {
  await falso.inserir('documento', [
    {
      oid: 186, _iddocumento: 123, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
      datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idempresa: 1, idpessoa: 999007,
      idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
    },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 123, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '1.000000', valtotalliquido: '150.000000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 1, _iddocumento: 123, _idsequencia: 1, idpagamento: 1, valor: '150.00' }])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1848, _iddocumento: 123, _idlocalestoque: 1, datahora: '2026-09-29 10:15:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '2.000000' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: 'Produto 60', idmercadoria: 60 }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 1, _idmercadoriavariacao: 60, flaginativo: 'F' }])
  await falso.inserir('pessoa', [{ _idpessoa: 1, nome: 'Igor', flaginativo: 'F' }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' }])
}

// Um documento com modelo AM, que não tem tradução: gera o mesmo aviso em toda leitura.
async function montarModeloSemTraducao(): Promise<void> {
  await falso.inserir('documento', [{
    oid: 187, _iddocumento: 124, modelo: 'AM', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-28 16:00:00', datahoramovimento: '2026-09-28 16:00:00', idempresa: 1,
  }])
}

const AVISO_AM = { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:AM', texto: 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen' }

test('noite com o Kaizen igual ao ERP: nenhum total diferente, e o dia limpo não manda resumo', async () => {
  await montarLoja()
  const antes = falso.consultas.length
  const saida = await rodar(horaEm('2026-09-29', 22))

  assert.equal(saida.resultado, 'ok')
  assert.deepEqual(saida.avisos, [])
  // A comparação de totais rodou: uma consulta de totais ao ERP.
  assert.equal(falso.consultas.slice(antes).filter((sql) => sql.includes('movimentos:variacao')).length, 1)
  assert.deepEqual(enviadas, [])
  const [linha] = await execucoes()
  assert.equal(linha.tipo, 'noite')
  assert.equal(linha.resumo_ok, true)
  assert.deepEqual(linha.resumo_chaves, [])
})

test('documentos em duas fatias de oid (185 e 5190) são os dois lidos', async () => {
  await falso.inserir('documento', [
    { oid: 185, _iddocumento: 94, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-27 14:20:00', idempresa: 1 },
    { oid: 5190, _iddocumento: 5099, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-29 08:00:00', idempresa: 1 },
  ])
  const antes = falso.consultas.length
  const saida = await rodar(horaEm('2026-09-29', 22))

  assert.equal(saida.resultado, 'ok')
  assert.equal(saida.contagens.documentos_lidos, 2)
  const docs = await banco.cliente.query('select origem_id from kaizen.documento order by origem_id::bigint')
  assert.deepEqual(docs.rows, [{ origem_id: '185' }, { origem_id: '5190' }])
  const desta = falso.consultas.slice(antes)
  assert.equal(desta.filter((sql) => sql.includes('d.oid between 185 and 5184')).length, 1)
  assert.equal(desta.filter((sql) => sql.includes('d.oid between 5185 and 10184')).length, 1)
})

test('movimento que sumiu do ERP vira aviso na noite e sai do Kaizen', async () => {
  await montarLoja()
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1849, _iddocumento: 124, _idlocalestoque: 1, datahora: '2026-09-29 11:00:00', idmercadoriavariacao: 60, qtdsaldoatual: '2.000000', qtdnovosaldo: '1.000000' },
  ])
  await falso.cliente.query(`update mercadoria_estoque set qtdsaldo = '1.000000'`)
  assert.equal((await rodar(horaEm('2026-09-29', 19), 'hora')).resultado, 'ok')
  // O suporte apaga o movimento 1849 e o saldo volta a 2.
  await falso.cliente.query('delete from mercadoria_estoque_historico where oid = 1849')
  await falso.cliente.query(`update mercadoria_estoque set qtdsaldo = '2.000000'`)

  const saida = await rodar(horaEm('2026-09-29', 22))

  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [
    { tipo: 'movimento_sumiu', chave: 'movimento:1849', texto: 'um movimento de estoque do produto 60 sumiu do ERP' },
  ])
  const movimentos = await banco.cliente.query('select origem_id from kaizen.estoque_movimento order by origem_id')
  assert.deepEqual(movimentos.rows, [{ origem_id: '1848' }])
})

test('movimentos que somem todos de uma vez são falha, e nada é apagado', async () => {
  await montarLoja()
  assert.equal((await rodar(horaEm('2026-09-29', 19), 'hora')).resultado, 'ok')
  // A lista de movimentos do ERP volta vazia: sem a proteção, a noite apagaria o histórico inteiro do Kaizen.
  await falso.cliente.query('delete from mercadoria_estoque_historico')

  const saida = await rodar(horaEm('2026-09-29', 22))

  const detalhe = 'a lista de movimentos do ERP veio vazia ou menor que a metade; nada foi apagado'
  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, detalhe)
  const movimentos = await banco.cliente.query('select origem_id from kaizen.estoque_movimento order by origem_id')
  assert.deepEqual(movimentos.rows, [{ origem_id: '1848' }])
  assert.deepEqual(enviadas, [
    `Kaizen: a leitura das 22h falhou — ${detalhe}. Os dados do Kaizen continuam os das 19h. Abra uma sessão com o Claude e cole esta mensagem.`,
  ])
})

test('total diferente do ERP vira aviso com os dois números e vai no resumo', async () => {
  await montarLoja()
  // O ERP responde a soma dos itens de 29/09 com 160: uma diferença que a carga não explica.
  const erpComOutraSoma: Erp = {
    async consultar(sql: string) {
      const dados = await falso.erp.consultar(sql)
      if (!sql.includes('movimentos:variacao')) return dados
      const totais = JSON.parse(dados) as Array<{ dia: string; medida: string; valor: string }>
      return JSON.stringify(totais.map((t) => (t.medida === 'itens:valor' ? { ...t, valor: '160.000000' } : t)))
    },
  }
  const saida = await rodar(horaEm('2026-09-29', 22), 'noite', erpComOutraSoma)

  const aviso = {
    tipo: 'total_diferente',
    chave: 'total:2026-09-29:itens:valor:160.000000:150.000000',
    texto: 'em 29/09, itens:valor: ERP 160.000000, Kaizen 150.000000',
  }
  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [aviso])
  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 29/09:\nTotais diferentes do ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${aviso.texto}`,
  ])
})

test('o resumo com aviso novo é enviado, e no dia seguinte o mesmo aviso vira uma linha só', async () => {
  await montarModeloSemTraducao()
  const primeira = await rodar(horaEm('2026-09-28', 22))
  assert.deepEqual(primeira.avisos, [AVISO_AM])

  await registrarDiaDeHoras('2026-09-29')
  const segunda = await rodar(horaEm('2026-09-29', 22))
  assert.deepEqual(segunda.avisos, [AVISO_AM])

  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 28/09:\nCódigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${AVISO_AM.texto}`,
    'Kaizen — resumo de 29/09:\nContinuam 1 avisos já informados.',
  ])
  const noites = (await execucoes()).filter((e) => e.tipo === 'noite')
  assert.deepEqual(noites.map((e) => [e.resumo_ok, e.resumo_chaves, e.telegram_ok]), [
    [true, ['codigo:tipo:AM'], true],
    [true, ['codigo:tipo:AM'], true],
  ])
})

test('a noite que falha depois de registrar a sua linha ainda manda o resumo', async () => {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, avisos)
     values ('hora', false, '2026-09-29 19:00:03-03', '2026-09-29 19:01:00-03', 'aviso', $1::jsonb)`,
    [JSON.stringify([AVISO_AM])],
  )
  const erpFora: Erp = {
    async consultar() {
      throw new ErroErp('rede', 'o ERP não respondeu: sem resposta em 90 s')
    },
  }
  const saida = await rodar(horaEm('2026-09-29', 22), 'noite', erpFora)

  assert.equal(saida.resultado, 'falha')
  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 29/09:\nCódigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${AVISO_AM.texto}`,
    'Kaizen: a leitura das 22h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 19h. Nada a fazer: ele tenta de novo em 30/09 às 8h.',
  ])
  const noite = (await execucoes())[1]
  assert.equal(noite.resultado, 'falha')
  assert.equal(noite.resumo_ok, true)
  assert.deepEqual(noite.resumo_chaves, ['codigo:tipo:AM'])
})

test('uma fatia que falha no ERP é falha com a faixa de oid na mensagem', async () => {
  await falso.inserir('documento', [
    { oid: 185, _iddocumento: 94, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-27 14:20:00', idempresa: 1 },
    { oid: 5190, _iddocumento: 5099, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-29 08:00:00', idempresa: 1 },
  ])
  const erpLento: Erp = {
    async consultar(sql: string) {
      if (sql.includes('d.oid between 5185 and 10184')) {
        throw new ErroErp('consulta', 'canceling statement due to statement timeout', 400)
      }
      return falso.erp.consultar(sql)
    },
  }
  const saida = await rodar(horaEm('2026-09-29', 22), 'noite', erpLento)

  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, 'a fatia de documentos de oid 5185 a 10184 falhou: canceling statement due to statement timeout')
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '0')
})

test('no estouro do prazo da noite, sai o resumo e depois a mensagem de falha', async () => {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, avisos)
     values ('hora', false, '2026-09-29 19:00:03-03', '2026-09-29 19:01:00-03', 'aviso', $1::jsonb)`,
    [JSON.stringify([AVISO_AM])],
  )
  await banco.cliente.query(`insert into kaizen.execucao (tipo, manual) values ('noite', false)`)

  await registrarEstouro(
    { tipo: 'noite', manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => horaEm('2026-09-29', 22) },
  )

  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 29/09:\nCódigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${AVISO_AM.texto}`,
    'Kaizen: a leitura das 22h falhou — passou do prazo. Os dados do Kaizen continuam os das 19h. Abra uma sessão com o Claude e cole esta mensagem.',
  ])
  const noite = (await execucoes())[1]
  assert.equal(noite.resultado, 'falha')
  assert.equal(noite.mensagem, 'a leitura das 22h passou do prazo')
  assert.equal(noite.resumo_ok, true)
})
```

- [ ] **Passo 10: Rodar e ver falhar**

Run: `node --test tradutor/execucao-noite.test.mts`

Expected: FAIL nos 9 testes. Com o `execucao.mts` da tarefa 13, pedir a noite é falha (`a leitura da noite ainda não existe nesta versão do tradutor`), e o estouro da noite não manda resumo:
```
✖ noite com o Kaizen igual ao ERP: nenhum total diferente, e o dia limpo não manda resumo
✖ documentos em duas fatias de oid (185 e 5190) são os dois lidos
✖ movimento que sumiu do ERP vira aviso na noite e sai do Kaizen
✖ movimentos que somem todos de uma vez são falha, e nada é apagado
✖ total diferente do ERP vira aviso com os dois números e vai no resumo
✖ o resumo com aviso novo é enviado, e no dia seguinte o mesmo aviso vira uma linha só
✖ a noite que falha depois de registrar a sua linha ainda manda o resumo
✖ uma fatia que falha no ERP é falha com a faixa de oid na mensagem
✖ no estouro do prazo da noite, sai o resumo e depois a mensagem de falha
ℹ tests 9
ℹ pass 0
ℹ fail 9
```

- [ ] **Passo 11: Substituir `tradutor/execucao.mts` inteiro**

Troque todo o conteúdo do arquivo por este. Em relação à tarefa 13 mudam: os imports (`compararTotais`, `TAMANHO_FATIA`, `lerDocumentosFaixa`, `lerTotaisErp`, `avisosParaResumo`, `marcarResumo`, `textoResumo`, o tipo `Cortes`); as funções novas `enviarResumo`, `conferirVivos`, `conferirMovimentos` e `lerFatia`; a leitura da noite em `rodar` (no lugar da falha "ainda não existe"); `conferirMovimentos` na noite, logo depois de `lerEstoque`; `gravarEstoque(cliente, noite)`; a comparação de totais; o resumo no fim de `rodar`, em `falhar` e em `registrarEstouro`. O resto é igual.

```ts
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'
import { avisoDocumentoApagado, avisoExecucaoPulada, avisoMovimentoSumiu } from './avisos.mts'
import { apagarSumidos, colocarEntrada, gravarCadastros, gravarDocumentos, gravarEstoque, podeApagar } from './carga.mts'
import { compararTotais } from './comparacao.mts'
import { avisosDeFaltas, codigosSemTraducao, estoqueDiverge, fechamentosComResto } from './conferencias.mts'
import { FOLGA_OID, PRAZO_MIN, TAMANHO_FATIA, TRAVA } from './constantes.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { emFortaleza, horariosFaltando, inicioDaJanela, proximoHorario, rotuloHora } from './janela.mts'
import { contarDocumentosErp, lerCortes, maiorOid, oidsComParcelaAberta } from './kaizen.mts'
import {
  conferirColunas, conferirEmpresaLocal, lerCadastros, lerDocumentosFaixa, lerDocumentosHora,
  lerEstoque, lerTotaisErp, lerVivos,
} from './leitura.mts'
import { aplicarMigracoes } from './migracoes.mts'
import {
  anteriorValida, avisosParaResumo, execucaoPresa, horaDaUltimaBoa, marcarInterrompidas, marcarResumo,
  marcarTelegram, registrarFim, registrarInicio, registrarPulada, ultimaNoiteBoa, ultimoInicioNaoManualMs,
} from './registro.mts'
import type { Anterior } from './registro.mts'
import { deveAvisarFalha, deveAvisarVolta, textoFalha, textoResumo, textoVolta } from './telegram.mts'
import type { Enviar } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'
import type { Aviso, Cortes, MotivoFalha, Resultado, TipoExecucao } from './tipos.mts'

export type Dependencias = {
  erp: Erp
  conectarKaizen: () => Promise<Cliente>
  enviar: Enviar
  agora: () => number
  pastaMigracoes?: string
}

export type Saida = { resultado: Resultado; avisos: Aviso[]; mensagem: string | null; contagens: Record<string, number> }

type Opcoes = { tipo: TipoExecucao; manual: boolean }

// O que o caminho da falha precisa saber do que já aconteceu nesta execução.
type Estado = { id: number | null; anterior: Anterior | null; avisos: Aviso[]; faltaram: boolean }

// Sem conexão, senha recusada, banco inexistente, banco subindo.
const CODIGOS_BANCO_FORA = new Set(['ECONNREFUSED', '28P01', '3D000', '57P03'])

function mensagemDe(erro: unknown): string {
  if (erro instanceof Error) {
    if (erro.message) return erro.message
    // A recusa de conexão do Node chega como AggregateError sem mensagem, só com o código.
    const codigo = (erro as { code?: unknown }).code
    return typeof codigo === 'string' ? codigo : erro.name
  }
  return String(erro)
}

export function motivoDe(erro: unknown): MotivoFalha {
  if (erro instanceof ErroKaizen) return erro.motivo
  if (erro instanceof ErroErp) {
    if (erro.tipo === 'token') return { tipo: 'token', detalhe: erro.message }
    if (erro.tipo === 'rede' || erro.tipo === 'http') return { tipo: 'erp_fora', detalhe: erro.message }
    return { tipo: 'outra', detalhe: erro.message }
  }
  const codigo = (erro as { code?: unknown } | null)?.code
  if (typeof codigo === 'string' && CODIGOS_BANCO_FORA.has(codigo)) return { tipo: 'banco_fora', detalhe: mensagemDe(erro) }
  return { tipo: 'outra', detalhe: mensagemDe(erro) }
}

// Nenhum erro do envio pode impedir o resto do registro.
async function enviarSemErro(enviar: Enviar, texto: string): Promise<boolean | null> {
  try {
    return await enviar(texto)
  } catch {
    return false
  }
}

// 'às 15h' no mesmo dia; 'em 30/09 às 8h' quando a próxima leitura é em outro dia.
function textoProximo(agoraMs: number): string {
  const hoje = emFortaleza(agoraMs).data
  const proximo = proximoHorario(agoraMs)
  const rotulo = rotuloHora(proximo, hoje)
  return proximo.data === hoje ? `às ${rotulo}` : `em ${rotulo}`
}

async function existeExecucao(cliente: Cliente): Promise<boolean> {
  const r = await cliente.query<{ existe: boolean }>(`select to_regclass('kaizen.execucao') is not null as existe`)
  return r.rows[0].existe
}

// A execução que está rodando (sem fim): a que segura a trava, ou a desta própria leitura no estouro do prazo.
async function idDaAberta(cliente: Cliente): Promise<number | null> {
  const r = await cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao where fim is null')
  return r.rows[0].id === null ? null : Number(r.rows[0].id)
}

// Resumo das 22h: junta os avisos desde o último resumo enviado. Devolve o resultado do envio, ou undefined se não enviou.
async function enviarResumo(cliente: Cliente, enviar: Enviar, id: number, agora: number): Promise<boolean | null | undefined> {
  const { avisos, chavesAnteriores } = await avisosParaResumo(cliente)
  const resumo = textoResumo(avisos, chavesAnteriores, emFortaleza(agora).data)
  if (resumo.texto === null) {
    // Dia limpo: não chega nada, e o próximo resumo começa daqui.
    await marcarResumo(cliente, id, [])
    return undefined
  }
  const ok = await enviarSemErro(enviar, resumo.texto)
  // Se o Telegram recusou, estes avisos vão de novo no próximo resumo.
  if (ok !== false) await marcarResumo(cliente, id, resumo.chaves)
  return ok
}

async function conferirVivos(cliente: Cliente, vivos: number): Promise<void> {
  const pode = podeApagar(await contarDocumentosErp(cliente), vivos)
  if (!pode.ok) throw new ErroKaizen({ tipo: 'outra', detalhe: pode.motivo })
}

// Na noite, o movimento do Kaizen que não voltou do ERP é apagado. Uma lista que veio vazia ou com menos da
// metade apagaria o histórico: é falha, com a mesma regra da lista de documentos vivos.
async function conferirMovimentos(cliente: Cliente, textoEstoque: string): Promise<void> {
  const r = await cliente.query<{ n: string }>(`select count(*) as n from kaizen.estoque_movimento where fonte = 'meuerp'`)
  // Do JSON só sai a contagem; os saldos continuam texto e vão inteiros ao Postgres.
  const lidos = (JSON.parse(textoEstoque) as { movimentos: unknown[] }).movimentos.length
  if (!podeApagar(Number(r.rows[0].n), lidos).ok) {
    throw new ErroKaizen({ tipo: 'outra', detalhe: 'a lista de movimentos do ERP veio vazia ou menor que a metade; nada foi apagado' })
  }
}

// A consulta ao ERP tem no máximo 30 s; uma fatia que passa disso volta como erro de consulta.
async function lerFatia(erp: Erp, cortes: Cortes, de: number, ate: number): Promise<string> {
  try {
    return await lerDocumentosFaixa(erp, cortes, de, ate)
  } catch (erro) {
    if (erro instanceof ErroErp && erro.tipo === 'consulta') {
      throw new ErroKaizen({ tipo: 'outra', detalhe: `a fatia de documentos de oid ${de} a ${ate} falhou: ${erro.message}` })
    }
    throw erro
  }
}

export async function executar(opcoes: Opcoes, dep: Dependencias): Promise<Saida> {
  const agora = dep.agora()
  const hora = emFortaleza(agora).hora
  let cliente: Cliente
  try {
    cliente = await dep.conectarKaizen()
  } catch (erro) {
    // Sem banco não há trava, registro nem estado: a mensagem sai a cada execução enquanto durar a queda.
    const motivo: MotivoFalha = { tipo: 'banco_fora', detalhe: `o banco do Kaizen não respondeu: ${mensagemDe(erro)}` }
    await enviarSemErro(dep.enviar, textoFalha(hora, motivo, null, textoProximo(agora)))
    return { resultado: 'falha', avisos: [], mensagem: motivo.detalhe, contagens: {} }
  }
  const estado: Estado = { id: null, anterior: null, avisos: [], faltaram: false }
  let travou = false
  try {
    const trava = await cliente.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [TRAVA])
    travou = trava.rows[0].ok
    if (!travou) {
      if (!(await existeExecucao(cliente))) return { resultado: 'pulada', avisos: [], mensagem: null, contagens: {} }
      if ((await execucaoPresa(cliente, PRAZO_MIN[opcoes.tipo])) !== null) {
        throw new ErroKaizen({ tipo: 'outra', detalhe: 'a leitura anterior ficou presa além do prazo' })
      }
      const aviso = avisoExecucaoPulada((await idDaAberta(cliente)) ?? 0)
      await registrarPulada(cliente, opcoes.tipo, opcoes.manual, aviso)
      return { resultado: 'pulada', avisos: [aviso], mensagem: null, contagens: {} }
    }
    await aplicarMigracoes(cliente, dep.pastaMigracoes)
    estado.id = await registrarInicio(cliente, opcoes.tipo, opcoes.manual)
    await marcarInterrompidas(cliente, estado.id)
    estado.anterior = await anteriorValida(cliente, estado.id)
    return await rodar(cliente, opcoes, dep, estado, estado.id, agora)
  } catch (erro) {
    return await falhar(cliente, opcoes, dep, estado, erro, agora)
  } finally {
    if (travou) await cliente.query('select pg_advisory_unlock($1)', [TRAVA]).catch(() => undefined)
    await cliente.end().catch(() => undefined)
  }
}

async function rodar(cliente: Cliente, opcoes: Opcoes, dep: Dependencias, estado: Estado, id: number, agora: number): Promise<Saida> {
  const erp = dep.erp
  const noite = opcoes.tipo === 'noite'
  if (!opcoes.manual) {
    const faltando = horariosFaltando(await ultimoInicioNaoManualMs(cliente, id), agora)
    estado.faltaram = faltando.length > 0
    estado.avisos.push(...avisosDeFaltas(faltando))
  }

  const cortes = await lerCortes(cliente)
  const faltam = await conferirColunas(erp)
  if (faltam.length > 0) {
    throw new ErroKaizen({ tipo: 'estrutura', detalhe: `colunas que sumiram do ERP: ${faltam.join(', ')}` })
  }
  const outras = await conferirEmpresaLocal(erp, cortes)
  if (outras.length > 0) {
    const lista = outras.map((o) => `${o.tabela}=${o.valor}`).join(', ')
    throw new ErroKaizen({ tipo: 'estrutura', detalhe: `apareceu outra empresa ou local de estoque: ${lista}` })
  }

  let documentos: string[]
  let textoVivos: string
  // Na noite, o maior oid da lista de vivos é o limite da releitura e da comparação de totais.
  let maiorVivo = cortes.documento
  if (noite) {
    // A noite relê todo documento acima do corte, qualquer que seja a data: primeiro a lista de vivos, depois as fatias.
    textoVivos = await lerVivos(erp, cortes)
    const vivos = JSON.parse(textoVivos) as number[]
    await conferirVivos(cliente, vivos.length)
    maiorVivo = vivos.reduce((maior, oid) => Math.max(maior, oid), cortes.documento)
    documentos = []
    for (let de = cortes.documento + 1; de <= maiorVivo; de += TAMANHO_FATIA) {
      documentos.push(await lerFatia(erp, cortes, de, de + TAMANHO_FATIA - 1))
    }
  } else {
    const maiorDocumento = (await maiorOid(cliente, 'documento')) ?? cortes.documento
    const selecao = {
      novosAcimaDe: Math.max(cortes.documento, maiorDocumento - FOLGA_OID),
      inicio: inicioDaJanela(agora, await ultimaNoiteBoa(cliente)),
      pendentes: await oidsComParcelaAberta(cliente),
    }
    documentos = [await lerDocumentosHora(erp, cortes, selecao)]
    textoVivos = await lerVivos(erp, cortes)
    await conferirVivos(cliente, (JSON.parse(textoVivos) as number[]).length)
  }

  const maiorMovimento = (await maiorOid(cliente, 'estoque_movimento')) ?? cortes.mercadoria_estoque_historico
  const movimentosAcimaDe = noite
    ? cortes.mercadoria_estoque_historico
    : Math.max(cortes.mercadoria_estoque_historico, maiorMovimento - FOLGA_OID)
  const textoEstoque = await lerEstoque(erp, cortes, movimentosAcimaDe)
  if (noite) await conferirMovimentos(cliente, textoEstoque)
  const textoCadastros = await lerCadastros(erp)

  // Os avisos da carga só valem se ela for gravada: ficam aqui até o commit.
  const avisosDaCarga: Aviso[] = []
  const carga = await emTransacao(cliente, async () => {
    await colocarEntrada(cliente, 'documentos', documentos)
    await colocarEntrada(cliente, 'vivos', [textoVivos])
    await colocarEntrada(cliente, 'estoque', [textoEstoque])
    await colocarEntrada(cliente, 'cadastros', [textoCadastros])
    // Cadastros antes, para o aviso de documento apagado já ter o nome do vendedor.
    const cadastros = await gravarCadastros(cliente)
    const lidos = await gravarDocumentos(cliente)
    avisosDaCarga.push(...(await fechamentosComResto(cliente)))
    const apagados = await apagarSumidos(cliente)
    avisosDaCarga.push(...apagados.map(avisoDocumentoApagado))
    // Na noite a leitura é completa: movimento que não voltou sumiu do ERP.
    const estoque = await gravarEstoque(cliente, noite)
    avisosDaCarga.push(...estoque.sumidos.map((s) => avisoMovimentoSumiu(s.origem_id, s.produto)))
    return { cadastros, lidos, apagados: apagados.length, estoque }
  })
  estado.avisos.push(...avisosDaCarga)
  estado.avisos.push(...(await codigosSemTraducao(cliente)))
  estado.avisos.push(...(await estoqueDiverge(cliente)))
  if (noite) {
    // Depois de gravar, só lendo: os totais de cada dia no ERP e no Kaizen, até o maior oid lido.
    const movimentoAte = (await maiorOid(cliente, 'estoque_movimento')) ?? cortes.mercadoria_estoque_historico
    const totais = await lerTotaisErp(erp, cortes, maiorVivo, movimentoAte)
    estado.avisos.push(...(await compararTotais(cliente, totais, maiorVivo, movimentoAte)))
  }

  const contagens: Record<string, number> = {
    documentos_lidos: carga.lidos.lidos,
    documentos_novos: carga.lidos.novos,
    apagados: carga.apagados,
    movimentos: carga.estoque.movimentos,
    foto: carga.estoque.foto,
    produtos: carga.cadastros.produtos,
    pessoas: carga.cadastros.pessoas,
    funcionarios: carga.cadastros.funcionarios,
    fornecedores: carga.cadastros.fornecedores,
    avisos: estado.avisos.length,
  }
  const resultado: Resultado = estado.avisos.length > 0 ? 'aviso' : 'ok'
  await registrarFim(cliente, id, { resultado, mensagem: null, contagens, avisos: estado.avisos })

  // Os dados já estão gravados: um erro daqui em diante não pode virar falha da leitura.
  let ultimoEnvio: boolean | null | undefined
  if (deveAvisarVolta(resultado, estado.anterior, estado.faltaram)) {
    ultimoEnvio = await enviarSemErro(dep.enviar, textoVolta(emFortaleza(agora).hora))
  }
  if (noite) {
    const doResumo = await enviarResumo(cliente, dep.enviar, id, agora).catch(() => false)
    if (doResumo !== undefined) ultimoEnvio = doResumo
  }
  if (ultimoEnvio !== undefined) await marcarTelegram(cliente, id, ultimoEnvio).catch(() => undefined)
  return { resultado, avisos: estado.avisos, mensagem: null, contagens }
}

async function falhar(cliente: Cliente, opcoes: Opcoes, dep: Dependencias, estado: Estado, erro: unknown, agora: number): Promise<Saida> {
  const motivo = motivoDe(erro)
  // Falha antes do registro (trava presa, migração): registra se o banco deixar.
  if (estado.id === null) {
    try {
      estado.id = await registrarInicio(cliente, opcoes.tipo, opcoes.manual)
      estado.anterior = await anteriorValida(cliente, estado.id)
    } catch {
      // sem a tabela execucao, a falha fica só na mensagem
    }
  }
  let horaBoa: number | null = null
  try {
    horaBoa = await horaDaUltimaBoa(cliente, estado.id)
  } catch {
    horaBoa = null
  }
  if (estado.id !== null) {
    await registrarFim(cliente, estado.id, { resultado: 'falha', mensagem: motivo.detalhe, avisos: estado.avisos }).catch(() => undefined)
    // A noite que falha depois de gravar a sua linha manda o resumo mesmo assim.
    if (opcoes.tipo === 'noite') await enviarResumo(cliente, dep.enviar, estado.id, agora).catch(() => undefined)
  }
  if (deveAvisarFalha(estado.anterior)) {
    const ok = await enviarSemErro(dep.enviar, textoFalha(emFortaleza(agora).hora, motivo, horaBoa, textoProximo(agora)))
    if (estado.id !== null) await marcarTelegram(cliente, estado.id, ok).catch(() => undefined)
  } else if (estado.id !== null) {
    // A queda já foi avisada e a mensagem chegou: esta falha herda o "já avisado", senão a próxima avisaria de novo.
    await marcarTelegram(cliente, estado.id, estado.anterior?.telegramOk ?? null).catch(() => undefined)
  }
  return { resultado: 'falha', avisos: estado.avisos, mensagem: motivo.detalhe, contagens: {} }
}

// Chamada pelo comando quando a execução passa do prazo: com uma conexão nova, marca como falha
// a execução que ficou aberta e manda a mensagem, se for o caso. Na noite, o resumo sai antes.
export async function registrarEstouro(opcoes: Opcoes, dep: Dependencias): Promise<void> {
  const agora = dep.agora()
  const hora = emFortaleza(agora).hora
  let cliente: Cliente | null = null
  let id: number | null = null
  let anterior: Anterior | null = null
  let horaBoa: number | null = null
  try {
    cliente = await dep.conectarKaizen()
    id = await idDaAberta(cliente)
    if (id !== null) {
      await registrarFim(cliente, id, { resultado: 'falha', mensagem: `a leitura das ${hora}h passou do prazo`, avisos: [] })
    }
    anterior = await anteriorValida(cliente, id)
    horaBoa = await horaDaUltimaBoa(cliente, id)
    if (opcoes.tipo === 'noite' && id !== null) await enviarResumo(cliente, dep.enviar, id, agora)
  } catch {
    // sem banco, a mensagem sai mesmo assim
  }
  if (deveAvisarFalha(anterior)) {
    const motivo: MotivoFalha = { tipo: 'outra', detalhe: 'passou do prazo' }
    const ok = await enviarSemErro(dep.enviar, textoFalha(hora, motivo, horaBoa, textoProximo(agora)))
    if (cliente !== null && id !== null) await marcarTelegram(cliente, id, ok).catch(() => undefined)
  } else if (cliente !== null && id !== null) {
    // Queda já avisada: a linha herda o "já avisado", como em falhar.
    await marcarTelegram(cliente, id, anterior?.telegramOk ?? null).catch(() => undefined)
  }
  await cliente?.end().catch(() => undefined)
}
```

- [ ] **Passo 12: Rodar e ver passar**

Run: `node --test tradutor/execucao-noite.test.mts`

Expected: PASS, 9 testes:
```
✔ noite com o Kaizen igual ao ERP: nenhum total diferente, e o dia limpo não manda resumo
✔ documentos em duas fatias de oid (185 e 5190) são os dois lidos
✔ movimento que sumiu do ERP vira aviso na noite e sai do Kaizen
✔ movimentos que somem todos de uma vez são falha, e nada é apagado
✔ total diferente do ERP vira aviso com os dois números e vai no resumo
✔ o resumo com aviso novo é enviado, e no dia seguinte o mesmo aviso vira uma linha só
✔ a noite que falha depois de registrar a sua linha ainda manda o resumo
✔ uma fatia que falha no ERP é falha com a faixa de oid na mensagem
✔ no estouro do prazo da noite, sai o resumo e depois a mensagem de falha
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

Run: `node --test tradutor/execucao.test.mts`

Expected: PASS, os 19 testes da hora continuam passando (`ℹ pass 19`, `ℹ fail 0`).

Se algum falhar, não mude o teste: ele descreve o que a spec pede (seções 6.4, 6.5 e 7.2).

- [ ] **Passo 13: Atualizar `testes-esperados.txt` (N = 9, todos em `execucao-noite.test.mts`), verificar e fazer o commit**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+9;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```
Expected: imprime o número novo, que é o anterior mais 9.

Run: `npm run verificar`
Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

```bash
git add tradutor/execucao.mts tradutor/execucao-noite.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Execução da noite: releitura completa, comparação e resumo

Às 22h o tradutor relê todos os documentos acima do corte, qualquer que
seja a data, em fatias de 5.000 números, e todos os movimentos de
estoque. O movimento que sumiu do ERP sai do Kaizen e vira aviso
("um movimento de estoque do produto 60 sumiu do ERP"). Mas se a lista
de movimentos vier vazia, ou com menos da metade dos que o Kaizen tem
(a mesma regra da lista de documentos vivos), é falha e nenhum
movimento é apagado: no teste, o ERP devolve a lista vazia e o
movimento 1848 continua no Kaizen. Depois de gravar, compara os totais
de cada dia com o ERP, e cada diferença vira aviso com os dois números.

No fim, manda o resumo dos avisos pelo Telegram. Dia limpo não manda
nada. O mesmo aviso no dia seguinte vira uma linha só: "Continuam 1
avisos já informados.". A noite que falha depois de registrar a sua
linha manda o resumo e depois a mensagem de falha ("tenta de novo em
30/09 às 8h"). Uma fatia que o ERP não consegue responder é falha com a
faixa na mensagem. Falha que continua não repete a mensagem: a linha
herda o "já avisado" da anterior. A leitura de hora em hora continua
igual: os 19 testes dela passam.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: o hook roda `npm run verificar` e termina com `rodou M testes, esperados M`; o commit é criado.

---

### Tarefa 15: Casos reais de ponta a ponta

**O que esta tarefa entrega, em resultado:** os casos reais da simulação de 25/09 e dos testes de 26/09 (`docs/FONTES.md`, seções "Simulação do dono" e "Testes do dono") passam pelo tradutor inteiro, do ERP falso até o banco do Kaizen, pela mesma `executar` que vai rodar na VPS. O teste confere, linha a linha, o que ficou gravado:
- o troco do pedido 116, como R$ 50,00 e −R$ 5,00 em dinheiro;
- as três formas do pedido 87 (a parcela a receber do crédito não entra);
- a troca 61, com o crédito de R$ 77,00 pendente, e a baixa desse crédito com a forma 5 quando o pedido 117 o usa;
- a devolução 63 em dinheiro;
- o orçamento que vira pedido dias depois, no mesmo documento;
- a venda cancelada depois de lida;
- o pedido 58 regravado com o item trocado;
- o pedido 123 apagado no ERP;
- o fechamento refeito do mesmo turno;
- a sangria 97;
- a conta a pagar de abril, paga e depois com a baixa estornada;
- o ajuste de custo sem quantidade e sem valor, e o ajuste de estoque sem valor.

Em cada caso, a leitura da noite que vem depois compara os totais com o ERP e dá zero diferença. Os casos que mudam depois de lidos rodam duas leituras, com a mudança no meio. Três deles provam o caminho que traz de volta um documento antigo: a parcela em aberto (troca 61 e conta de abril), a data de fechamento dentro da janela (orçamento) e a linha de cancelamento (pedido 110). Por último, todos os casos juntos: duas leituras da hora e a da noite deixam exatamente o mesmo conteúdo. São 13 testes novos, num commit.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Postgres local de pé (`docker compose up -d --wait`, tarefa 1). As tarefas 1 a 14 precisam estar feitas. O teste cria um banco do Kaizen (`criarBancoKaizen`) e um ERP falso (`criarErpFalso`) uma vez e os limpa antes de cada caso. Nenhum teste fala com o ERP de verdade nem com o Telegram. Commits no Git Bash. Não abra o `.env`.

**Arquivos:**
- Criar: `tradutor/fixtures.mts`
- Testar: `tradutor/casos-reais.test.mts`
- Modificar: `testes-esperados.txt` (soma 13)

**Interfaces:**
- Consome (tarefas 1 a 14; exatamente estes nomes):
  ```ts
  // tradutor/banco.mts (T1)
  export type Cliente = pg.Client
  export function garantirLocal(url: string): void            // lança Error('recusado: só localhost:5434 nos testes')
  export async function conectar(url: string): Promise<Cliente> // conecta e fixa o fuso em America/Fortaleza
  // Parsers da T1: count(*), bigint, numeric, date, timestamp e timestamptz chegam como texto; integer como número.

  // tradutor/apoio-teste.mts (T2, só testes)
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>   // conectado como kaizen, migrações aplicadas

  // tradutor/erp-falso.mts e tradutor/sql-erp.mts (T5, só testes)
  export type ErpFalso = {
    erp: Erp; cliente: Cliente; consultas: string[]
    inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>  // colunas = chaves; chave que falta fica nula
    fechar(): Promise<void>
  }
  export async function criarErpFalso(): Promise<ErpFalso>   // as 22 tabelas do ERP só com as 108 colunas da lista
  export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }>

  // tradutor/tipos.mts (T2)
  export type TipoExecucao = 'hora' | 'noite'

  // tradutor/execucao.mts (T13, com a noite da T14)
  export type Dependencias = { erp: Erp; conectarKaizen: () => Promise<Cliente>; enviar: Enviar; agora: () => number; pastaMigracoes?: string }
  export type Saida = { resultado: Resultado; avisos: Aviso[]; mensagem: string | null; contagens: Record<string, number> }
  export async function executar(opcoes: { tipo: TipoExecucao; manual: boolean }, dep: Dependencias): Promise<Saida>
  ```
  O que o teste usa do comportamento dessas tarefas (contrato, seção 9):
  - na execução manual, a lista de horários que faltaram não roda;
  - sem aviso, o resultado é `ok` e `mensagem` é `null`;
  - a hora relê pela folga só os oids acima de (maior oid já visto − 200), mais os documentos com data de criação ou de fechamento a partir do início da janela, os que têm linha de cancelamento na janela e os que têm parcela em aberto no Kaizen;
  - o início da janela é o mais cedo entre ontem e a data da última noite `ok` ou `aviso` (a de maior `id`, T12);
  - a noite relê tudo, compara os totais (cada diferença é um aviso `total_diferente`) e manda o resumo dos avisos desde o último resumo pela função `enviar`.
- Produz (`tradutor/fixtures.mts`, só para testes):
  ```ts
  export const TURNO_IGOR_CAIXA1_ABERTURA2 = { idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 2 }
  export const TURNO_IGOR_CAIXA1_ABERTURA3 = { idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 3 }
  export const TURNO_DANIELE_CAIXA3_ABERTURA1 = { idcaixaabertura: 3, idusuarioabertura: 18153, idabertura: 1 }
  export const TURNO_SUPORTE_CAIXA3_ABERTURA1 = { idcaixaabertura: 3, idusuarioabertura: 9149, idabertura: 1 }
  export const OID_POSTERIOR = 400
  export async function fotoDoEstoque(falso: ErpFalso, produto: number, quantidade: string): Promise<void>
  export async function cadastrosDaLoja(falso: ErpFalso): Promise<void>
  export async function documentoPosterior(falso: ErpFalso): Promise<void>
  // Cada caso abaixo é `export async function <nome>(falso: ErpFalso): Promise<void>`:
  // pedidoComTroco, pedidoTresFormas, trocaComCredito, usoDoCredito, devolucaoEmDinheiro,
  // orcamento, orcamentoConvertido, vendaParaCancelar, cancelarVenda, pedido58, regravarPedido58,
  // pedido123, apagarPedido123, primeiroFechamento, fechamentoRefeito, sangria, contaDeAbril,
  // pagarContaDeAbril, estornarBaixaDaConta, ajustes, todosOsCasos (todos, menos cadastrosDaLoja, que o beforeEach do teste já insere)
  ```
  Nenhuma outra tarefa usa `fixtures.mts` hoje; ele fica para os testes de ponta a ponta das próximas fases.

**Os casos (todos com oid acima do corte; nomes de pessoa inventados):**

| Função | Documento no ERP falso | O que simula (`docs/FONTES.md`) |
| --- | --- | --- |
| `pedidoComTroco` | PA 116, oid 185, 29/09 10h15 | troco como linha negativa de dinheiro: R$ 50,00 e −R$ 5,00 |
| `pedidoTresFormas` | PA 87, oid 186, vendedora 999005 | dinheiro, Pix e crédito; o crédito gera parcela a receber, o Pix dá baixa na hora |
| `trocaComCredito` → `usoDoCredito` | TM 61, oid 187 → PA 117, oid 601 | crédito de troca na forma 5, parcela pendente de R$ 77,00; o 117 paga com a forma 5 e a parcela da troca é baixada com a forma 5 |
| `devolucaoEmDinheiro` | TM 63, oid 188 | devolução de R$ 18,00, parcela baixada em dinheiro na hora |
| `orcamento` → `orcamentoConvertido` | OC 120, oid 189 | o mesmo oid vira PA em 01/10, com `datahoramovimento` novo; o estoque sai com a hora do orçamento |
| `vendaParaCancelar` → `cancelarVenda` | PA 110, oid 190 | status C, linha em `documento_cancelamento_historico`, estorno com a hora do documento |
| `pedido58` → `regravarPedido58` | PA 58, oid 191 | regravado com o item trocado: o item antigo some, entram dois novos |
| `pedido123` → `apagarPedido123` | PA 123, oid 192 | apagado direto no banco; os movimentos de estoque ficam |
| `primeiroFechamento` → `fechamentoRefeito` | FC 114, oid 193 → FC 118, oid 194 | o mesmo turno (caixa 1, usuário 18152, abertura 3) fechado duas vezes; o crédito usado entra no calculado da forma troca |
| `sangria` | RS 97, oid 195 | R$ 5,00 em dinheiro, "compra de agua sanitaria" |
| `contaDeAbril` → `pagarContaDeAbril` → `estornarBaixaDaConta` | CP 2, oid 196, 14/04 | reimportada com data de abril; paga depois; a baixa estornada fica com status C |
| `ajustes` | AC 94, oid 197; AS 138, oid 198 | item sem quantidade e sem valor; item sem valor |
| `documentoPosterior` | AX 300, oid 400 | os documentos dos dias seguintes (ver abaixo) |

**Por que o teste é assim (para não "consertar" sem querer):**
- As execuções são manuais (`manual: true`). O Postgres grava o `inicio` de cada execução com a hora de verdade, e o teste finge o relógio (`agora`). Na execução não manual, a lista de horários que faltaram compararia as duas horas, e o resultado dependeria do dia em que o teste roda.
- `rodarSemAviso` exige `ok`, nenhum aviso e nenhuma mensagem. Na noite, isso quer dizer que a comparação de totais deu zero diferença, que nenhum movimento sumiu e que o estoque bate com a foto. Por isso cada movimento do caso deixa a foto do produto com o saldo novo (`movimento` → `fotoDoEstoque`), como o ERP faz.
- `documentoPosterior` (oid 400) faz o maior oid visto passar de 200 acima dos casos (oids 185 a 199). Com ele, a folga de 200 da hora não relê mais os casos, e a segunda leitura só os traz pelo caminho que o caso quer provar.
- `noiteTerminouBemEm('2026-09-30')` grava uma linha de noite `ok` com início em 30/09 às 22h. A hora seguinte, em 01/10, passa a ter a janela começando em 30/09, e o documento de 28/09 ou 29/09 só volta pela data do fechamento, pela linha de cancelamento ou pela parcela em aberto.
- Na conta de abril, a terceira leitura da hora **não** vê o estorno: com todas as parcelas baixadas, a conta só é relida à noite (spec 6.3, passo 6). O teste confere isso e depois confere que a noite traz o estorno.
- Cada caso usa oids e produtos só dele (saldos de partida iguais aos da virada, `docs/medicoes/estoque-virada-2026-09-27.json`), para que `todosOsCasos` junte todos no mesmo ERP.
- O banco do Kaizen e o ERP falso são criados uma vez e limpos antes de cada teste (`beforeEach`): cada criação custa perto de 1 s. `set jit = off` no ERP falso: sem estatísticas, o Postgres compila a consulta de cadastros com JIT, 1,5 s por chamada.
- O teste não usa `id` nem `lido_em` na comparação do conteúdo (spec 8, "Rodar duas vezes"); `visto_em` e `documento.id` têm de ficar iguais.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `tradutor/casos-reais.test.mts`:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { conectar, garantirLocal } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import { executar } from './execucao.mts'
import type { Saida } from './execucao.mts'
import type { TipoExecucao } from './tipos.mts'
import {
  cadastrosDaLoja, documentoPosterior, pedidoComTroco, pedidoTresFormas, trocaComCredito, usoDoCredito, devolucaoEmDinheiro,
  orcamento, orcamentoConvertido, vendaParaCancelar, cancelarVenda, pedido58, regravarPedido58, pedido123, apagarPedido123,
  primeiroFechamento, fechamentoRefeito, sangria, contaDeAbril, pagarContaDeAbril, estornarBaixaDaConta, ajustes, todosOsCasos,
} from './fixtures.mts'

const TABELAS_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
const TABELAS_KAIZEN = [
  'documento', 'documento_item', 'documento_pagamento', 'parcela', 'baixa', 'conferencia_caixa', 'estoque_movimento',
  'estoque_atual', 'produto', 'produto_fornecedor', 'pessoa', 'funcionario', 'execucao',
]

let banco: BancoTeste
let falso: ErpFalso
let enviadas: string[] = []

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
  // Sem estatísticas, o banco falso compila a consulta de cadastros com JIT (1,5 s por chamada).
  await falso.cliente.query('set jit = off')
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  enviadas = []
  await falso.cliente.query(`truncate ${TABELAS_ERP.join(', ')}`)
  await banco.cliente.query(`truncate ${TABELAS_KAIZEN.map((t) => `kaizen.${t}`).join(', ')} restart identity`)
  await cadastrosDaLoja(falso)
})

// Execuções manuais: a lista de horários que faltaram compara o início gravado pelo banco (relógio de verdade)
// com o relógio fixo do teste, e não é o assunto destes casos.
async function rodar(tipo: TipoExecucao, agoraIso: string): Promise<Saida> {
  return executar({ tipo, manual: true }, {
    erp: falso.erp,
    conectarKaizen: async () => {
      garantirLocal(banco.url)
      return conectar(banco.url)
    },
    enviar: async (texto) => {
      enviadas.push(texto)
      return true
    },
    agora: () => Date.parse(agoraIso),
  })
}

// Uma execução sem nenhum aviso. Na noite, isso quer dizer também que a comparação de totais deu zero diferença.
async function rodarSemAviso(tipo: TipoExecucao, agoraIso: string): Promise<Saida> {
  const saida = await rodar(tipo, agoraIso)
  assert.deepEqual({ resultado: saida.resultado, avisos: saida.avisos, mensagem: saida.mensagem }, { resultado: 'ok', avisos: [], mensagem: null })
  return saida
}

// A noite desse dia terminou bem: a janela da hora seguinte passa a começar nesse dia, e o que é mais antigo
// só volta à leitura pela folga, pela parcela em aberto ou pelo cancelamento.
async function noiteTerminouBemEm(dia: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado)
     values ('noite', false, ($1::date + time '22:00') at time zone 'America/Fortaleza', ($1::date + time '22:05') at time zone 'America/Fortaleza', 'ok')`,
    [dia],
  )
}

async function linhas(sql: string, valores: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, valores)).rows
}

async function documento(codigo: string): Promise<Record<string, unknown>> {
  const r = await linhas(
    `select origem_id, modelo, status, movimento, financeiro, criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero
     from kaizen.documento where fonte = 'meuerp' and codigo = $1`,
    [codigo],
  )
  assert.equal(r.length, 1, `o documento ${codigo} devia estar no Kaizen uma vez`)
  return r[0]
}

async function identidade(codigo: string): Promise<Record<string, unknown>> {
  return (await linhas(`select id, visto_em from kaizen.documento where fonte = 'meuerp' and codigo = $1`, [codigo]))[0]
}

async function itens(codigo: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
     from kaizen.documento_item i join kaizen.documento d on d.id = i.documento_id
     where d.codigo = $1 order by i.origem_id::bigint`,
    [codigo],
  )
}

async function pagamentos(codigo: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select p.origem_id, p.forma, p.valor
     from kaizen.documento_pagamento p join kaizen.documento d on d.id = p.documento_id
     where d.codigo = $1 order by p.origem_id::bigint`,
    [codigo],
  )
}

async function parcelas(codigo: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select p.origem_id, p.lancado_em, p.vencimento, p.valor, p.status, p.descricao
     from kaizen.parcela p join kaizen.documento d on d.id = p.documento_id
     where d.codigo = $1 order by p.origem_id::bigint`,
    [codigo],
  )
}

async function baixas(codigo: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select b.origem_id, b.pago_em, b.valor, b.forma, b.status
     from kaizen.baixa b join kaizen.parcela p on p.id = b.parcela_id join kaizen.documento d on d.id = p.documento_id
     where d.codigo = $1 order by b.origem_id::bigint`,
    [codigo],
  )
}

async function conferencia(codigo: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select c.origem_id, c.forma, c.calculado, c.informado
     from kaizen.conferencia_caixa c join kaizen.documento d on d.id = c.documento_id
     where d.codigo = $1 order by c.origem_id::bigint`,
    [codigo],
  )
}

async function movimentos(produto: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select origem_id, documento, momento, saldo_antes, saldo_depois
     from kaizen.estoque_movimento where fonte = 'meuerp' and produto = $1 order by origem_id::bigint`,
    [produto],
  )
}

async function foto(produto: string): Promise<unknown> {
  const r = await linhas(`select quantidade from kaizen.estoque_atual where fonte = 'meuerp' and produto = $1`, [produto])
  return r.length ? r[0].quantidade : 'sem foto'
}

test('pedido 116: o troco fica como R$ 50,00 e −R$ 5,00 em dinheiro, e a noite dá zero diferença', async () => {
  await pedidoComTroco(falso)
  await rodarSemAviso('hora', '2026-09-29T17:00:00Z')
  assert.deepEqual(await documento('116'), {
    origem_id: '185', modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29 10:15:00', fechado_em: '2026-09-29 10:15:00', pessoa: '999007',
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 3,
  })
  assert.deepEqual(await itens('116'), [
    { origem_id: '1873', sentido: 'S', produto: '1436', quantidade: '1.000000', valor_liquido: '45.00', vendedor: '1' },
  ])
  assert.deepEqual(await pagamentos('116'), [
    { origem_id: '1', forma: '1', valor: '50.00' },
    { origem_id: '2', forma: '1', valor: '-5.00' },
  ])
  assert.deepEqual(await parcelas('116'), [])
  assert.deepEqual(await movimentos('1436'), [
    { origem_id: '1848', documento: '116', momento: '2026-09-29 10:15:00', saldo_antes: '6.000000', saldo_depois: '5.000000' },
  ])
  assert.equal(await foto('1436'), '5.000000')
  await rodarSemAviso('noite', '2026-09-30T01:00:00Z')
})

test('pedido 87: dinheiro, Pix e crédito na mesma venda; a parcela e a baixa a receber não entram nem geram diferença', async () => {
  await pedidoTresFormas(falso)
  await rodarSemAviso('hora', '2026-09-29T17:00:00Z')
  assert.deepEqual(await documento('87'), {
    origem_id: '186', modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29 11:00:00', fechado_em: '2026-09-29 11:02:00', pessoa: '999007',
    turno_caixa: 3, turno_usuario: 18153, turno_numero: 1,
  })
  assert.deepEqual(await itens('87'), [
    { origem_id: '1874', sentido: 'S', produto: '2962', quantidade: '1.000000', valor_liquido: '120.00', vendedor: '999005' },
  ])
  assert.deepEqual(await pagamentos('87'), [
    { origem_id: '3', forma: '1', valor: '50.00' },
    { origem_id: '4', forma: '2', valor: '40.00' },
    { origem_id: '5', forma: '3', valor: '30.00' },
  ])
  assert.deepEqual(await linhas('select (select count(*) from kaizen.parcela) as parcelas, (select count(*) from kaizen.baixa) as baixas'), [
    { parcelas: '0', baixas: '0' },
  ])
  await rodarSemAviso('noite', '2026-09-30T01:00:00Z')
})

test('troca 61 com crédito e uso no pedido 117: a parcela pendente de R$ 77,00 é relida e aparece baixada com a forma 5', async () => {
  await trocaComCredito(falso)
  await documentoPosterior(falso)
  await rodarSemAviso('hora', '2026-09-30T17:00:00Z')
  assert.deepEqual(await documento('61'), {
    origem_id: '187', modelo: 'TM', status: 'E', movimento: 'E', financeiro: 'P',
    criado_em: '2026-09-28 15:30:00', fechado_em: '2026-09-28 15:30:00', pessoa: '999007',
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
  })
  assert.deepEqual(await itens('61'), [
    { origem_id: '1875', sentido: 'E', produto: '60', quantidade: '1.000000', valor_liquido: '77.00', vendedor: null },
  ])
  assert.deepEqual(await pagamentos('61'), [{ origem_id: '6', forma: '5', valor: '77.00' }])
  assert.deepEqual(await parcelas('61'), [
    { origem_id: '3', lancado_em: '2026-09-28', vencimento: '2026-09-28', valor: '77.00', status: 'P', descricao: 'Troca de Mercadoria - Adiantamento' },
  ])
  assert.deepEqual(await baixas('61'), [])
  const antes = await identidade('61')

  // A troca (oid 187) está mais de 200 abaixo do maior oid visto (400) e é anterior ao início da janela (30/09):
  // só volta à leitura porque tem parcela pendente no Kaizen.
  await noiteTerminouBemEm('2026-09-30')
  await usoDoCredito(falso)
  await rodarSemAviso('hora', '2026-10-01T17:00:00Z')
  assert.deepEqual(await identidade('61'), antes)
  assert.deepEqual(await parcelas('61'), [
    { origem_id: '3', lancado_em: '2026-09-28', vencimento: '2026-09-28', valor: '77.00', status: 'B', descricao: 'Troca de Mercadoria - Adiantamento' },
  ])
  assert.deepEqual(await baixas('61'), [{ origem_id: '21', pago_em: '2026-10-01', valor: '77.00', forma: '5', status: 'E' }])
  assert.deepEqual(await documento('117'), {
    origem_id: '601', modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-10-01 10:00:00', fechado_em: '2026-10-01 10:00:00', pessoa: '999007',
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 3,
  })
  assert.deepEqual(await itens('117'), [
    { origem_id: '1901', sentido: 'S', produto: '60', quantidade: '1.000000', valor_liquido: '77.00', vendedor: '1' },
  ])
  assert.deepEqual(await pagamentos('117'), [{ origem_id: '21', forma: '5', valor: '77.00' }])
  assert.deepEqual(await movimentos('60'), [
    { origem_id: '1850', documento: '61', momento: '2026-09-28 15:30:00', saldo_antes: '3.000000', saldo_depois: '4.000000' },
    { origem_id: '1901', documento: '117', momento: '2026-10-01 10:00:00', saldo_antes: '4.000000', saldo_depois: '3.000000' },
  ])
  assert.equal(await foto('60'), '3.000000')
  await rodarSemAviso('noite', '2026-10-02T01:00:00Z')
})

test('devolução 63 em dinheiro: o item volta ao estoque e a parcela de R$ 18,00 fica baixada em dinheiro', async () => {
  await devolucaoEmDinheiro(falso)
  await rodarSemAviso('hora', '2026-09-29T17:00:00Z')
  assert.deepEqual(await documento('63'), {
    origem_id: '188', modelo: 'TM', status: 'E', movimento: 'E', financeiro: 'P',
    criado_em: '2026-09-28 16:00:00', fechado_em: '2026-09-28 16:00:00', pessoa: '999007',
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
  })
  assert.deepEqual(await itens('63'), [
    { origem_id: '1876', sentido: 'E', produto: '1362', quantidade: '1.000000', valor_liquido: '18.00', vendedor: null },
  ])
  assert.deepEqual(await pagamentos('63'), [{ origem_id: '7', forma: '1', valor: '18.00' }])
  assert.deepEqual(await parcelas('63'), [
    { origem_id: '4', lancado_em: '2026-09-28', vencimento: '2026-09-28', valor: '18.00', status: 'B', descricao: 'Troca de Mercadoria - Retirada' },
  ])
  assert.deepEqual(await baixas('63'), [{ origem_id: '2', pago_em: '2026-09-28', valor: '18.00', forma: '1', status: 'E' }])
  assert.deepEqual(await movimentos('1362'), [
    { origem_id: '1851', documento: '63', momento: '2026-09-28 16:00:00', saldo_antes: '0.000000', saldo_depois: '1.000000' },
  ])
  assert.equal(await foto('1362'), '1.000000')
  await rodarSemAviso('noite', '2026-09-30T01:00:00Z')
})

test('orçamento 120 convertido dias depois no próprio documento: o mesmo oid vira pedido e ganha fechado_em novo', async () => {
  await orcamento(falso)
  await documentoPosterior(falso)
  await rodarSemAviso('hora', '2026-09-30T17:00:00Z')
  assert.deepEqual(await documento('120'), {
    origem_id: '189', modelo: 'OC', status: 'E', movimento: 'N', financeiro: 'N',
    criado_em: '2026-09-28 15:09:00', fechado_em: '2026-09-28 15:09:00', pessoa: '999007',
    turno_caixa: null, turno_usuario: null, turno_numero: null,
  })
  assert.deepEqual(await itens('120'), [
    { origem_id: '1877', sentido: 'N', produto: '1391', quantidade: '1.000000', valor_liquido: '144.00', vendedor: '1' },
  ])
  const antes = await identidade('120')

  // O orçamento (oid 189) está mais de 200 abaixo do maior oid visto e foi criado antes da janela (30/09):
  // só volta à leitura pela data do fechamento, em datahoramovimento.
  await noiteTerminouBemEm('2026-09-30')
  await orcamentoConvertido(falso)
  await rodarSemAviso('hora', '2026-10-01T17:00:00Z')
  assert.deepEqual(await identidade('120'), antes)
  assert.deepEqual(await documento('120'), {
    origem_id: '189', modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-28 15:09:00', fechado_em: '2026-10-01 10:00:00', pessoa: '999007',
    turno_caixa: null, turno_usuario: null, turno_numero: null,
  })
  assert.deepEqual(await itens('120'), [
    { origem_id: '1877', sentido: 'S', produto: '1391', quantidade: '1.000000', valor_liquido: '144.00', vendedor: '1' },
  ])
  assert.deepEqual(await movimentos('1391'), [
    { origem_id: '1902', documento: '120', momento: '2026-09-28 15:09:00', saldo_antes: '177.000000', saldo_depois: '176.000000' },
  ])
  assert.equal(await foto('1391'), '176.000000')
  await rodarSemAviso('noite', '2026-10-02T01:00:00Z')
})

test('pedido 110 cancelado depois de lido: volta pela linha de cancelamento, fica com status C e o estorno entra', async () => {
  await vendaParaCancelar(falso)
  await documentoPosterior(falso)
  await rodarSemAviso('hora', '2026-09-30T17:00:00Z')
  assert.equal((await documento('110')).status, 'E')
  const antes = await identidade('110')

  // A venda (oid 190) está mais de 200 abaixo do maior oid visto e é de 29/09, antes da janela (30/09):
  // só volta à leitura pela linha nova em documento_cancelamento_historico.
  await noiteTerminouBemEm('2026-09-30')
  await cancelarVenda(falso)
  await rodarSemAviso('hora', '2026-10-01T17:00:00Z')
  assert.deepEqual(await identidade('110'), antes)
  assert.deepEqual(await documento('110'), {
    origem_id: '190', modelo: 'PA', status: 'C', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29 10:00:00', fechado_em: '2026-09-29 10:05:00', pessoa: '999007',
    turno_caixa: 3, turno_usuario: 9149, turno_numero: 1,
  })
  assert.deepEqual(await itens('110'), [
    { origem_id: '1878', sentido: 'S', produto: '62', quantidade: '1.000000', valor_liquido: '30.00', vendedor: '1' },
  ])
  assert.deepEqual(await pagamentos('110'), [{ origem_id: '8', forma: '2', valor: '30.00' }])
  assert.deepEqual(await movimentos('62'), [
    { origem_id: '1852', documento: '110', momento: '2026-09-29 10:00:00', saldo_antes: '5.000000', saldo_depois: '4.000000' },
    { origem_id: '1903', documento: '110', momento: '2026-09-29 10:00:00', saldo_antes: '4.000000', saldo_depois: '5.000000' },
  ])
  assert.equal(await foto('62'), '5.000000')
  await rodarSemAviso('noite', '2026-10-02T01:00:00Z')
})

test('pedido 58 regravado com o item trocado: o item antigo sai, os dois novos entram, e o documento é o mesmo', async () => {
  await pedido58(falso)
  await rodarSemAviso('hora', '2026-09-28T18:30:00Z')
  assert.deepEqual(await itens('58'), [
    { origem_id: '1879', sentido: 'S', produto: '2138', quantidade: '1.000000', valor_liquido: '144.00', vendedor: '1' },
  ])
  const antes = await identidade('58')

  await regravarPedido58(falso)
  await rodarSemAviso('hora', '2026-09-28T19:00:00Z')
  assert.deepEqual(await identidade('58'), antes)
  assert.deepEqual(await documento('58'), {
    origem_id: '191', modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-28 15:09:00', fechado_em: '2026-09-28 15:48:00', pessoa: '999007',
    turno_caixa: null, turno_usuario: null, turno_numero: null,
  })
  assert.deepEqual(await itens('58'), [
    { origem_id: '1904', sentido: 'S', produto: '2138', quantidade: '1.000000', valor_liquido: '119.00', vendedor: '1' },
    { origem_id: '1905', sentido: 'S', produto: '5278', quantidade: '1.000000', valor_liquido: '25.00', vendedor: '1' },
  ])
  assert.deepEqual(await pagamentos('58'), [])
  assert.deepEqual(await movimentos('2138'), [
    { origem_id: '1853', documento: '58', momento: '2026-09-28 15:09:00', saldo_antes: '48.000000', saldo_depois: '47.000000' },
    { origem_id: '1904', documento: '58', momento: '2026-09-28 15:09:00', saldo_antes: '47.000000', saldo_depois: '48.000000' },
    { origem_id: '1905', documento: '58', momento: '2026-09-28 15:09:00', saldo_antes: '48.000000', saldo_depois: '47.000000' },
  ])
  assert.deepEqual(await movimentos('5278'), [
    { origem_id: '1906', documento: '58', momento: '2026-09-28 15:09:00', saldo_antes: '0.000000', saldo_depois: '-1.000000' },
  ])
  assert.equal(await foto('2138'), '47.000000')
  assert.equal(await foto('5278'), '-1.000000')
  await rodarSemAviso('noite', '2026-09-29T01:00:00Z')
})

test('pedido 123 apagado no ERP: sai do Kaizen com os filhos, os movimentos ficam, e o aviso chega no resumo das 22h', async () => {
  await pedido123(falso)
  await documentoPosterior(falso)
  await rodarSemAviso('hora', '2026-09-30T17:00:00Z')
  assert.equal((await itens('123')).length, 2)

  await apagarPedido123(falso)
  const saida = await rodar('hora', '2026-09-30T18:00:00Z')
  const texto = 'o pedido 123 de 29/09 (R$ 150,00, vendedor VENDEDOR UM) sumiu do ERP'
  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [{ tipo: 'documento_apagado', chave: 'apagado:192', texto }])
  assert.deepEqual(await linhas(
    `select (select count(*) from kaizen.documento where codigo = '123') as documentos,
            (select count(*) from kaizen.documento_item) as itens,
            (select count(*) from kaizen.documento_pagamento) as pagamentos`,
  ), [{ documentos: '0', itens: '0', pagamentos: '0' }])
  assert.deepEqual((await movimentos('1368')).map((m) => m.origem_id), ['1854'])
  assert.deepEqual((await movimentos('1370')).map((m) => m.origem_id), ['1855'])

  await rodarSemAviso('noite', '2026-10-01T01:00:00Z')
  assert.ok(enviadas.some((t) => t.includes(texto)), `o resumo das 22h devia trazer: ${texto}\nenviadas: ${JSON.stringify(enviadas)}`)
})

test('fechamento refeito: os fechamentos 114 e 118 do mesmo turno ficam os dois, cada um com a sua conferência', async () => {
  await primeiroFechamento(falso)
  await rodarSemAviso('hora', '2026-09-29T12:00:00Z')
  const conferencia114 = [
    { origem_id: '31', forma: '1', calculado: '50.00', informado: '48.00' },
    { origem_id: '32', forma: '2', calculado: '10.00', informado: '10.00' },
  ]
  assert.deepEqual(await conferencia('114'), conferencia114)

  await fechamentoRefeito(falso)
  await rodarSemAviso('hora', '2026-09-29T22:00:00Z')
  assert.deepEqual(await linhas(
    `select codigo, modelo, criado_em, turno_caixa, turno_usuario, turno_numero from kaizen.documento
     where fonte = 'meuerp' and modelo = 'FC' order by criado_em`,
  ), [
    { codigo: '114', modelo: 'FC', criado_em: '2026-09-29 08:37:00', turno_caixa: 1, turno_usuario: 18152, turno_numero: 3 },
    { codigo: '118', modelo: 'FC', criado_em: '2026-09-29 18:00:00', turno_caixa: 1, turno_usuario: 18152, turno_numero: 3 },
  ])
  assert.deepEqual(await conferencia('114'), conferencia114)
  assert.deepEqual(await conferencia('118'), [
    { origem_id: '33', forma: '1', calculado: '45.00', informado: '45.00' },
    { origem_id: '34', forma: '2', calculado: '0.00', informado: '0.00' },
    { origem_id: '35', forma: '3', calculado: '0.00', informado: '0.00' },
    { origem_id: '36', forma: '4', calculado: '0.00', informado: '0.00' },
    { origem_id: '37', forma: '5', calculado: '77.00', informado: '0.00' },
  ])
  await rodarSemAviso('noite', '2026-09-30T01:00:00Z')
})

test('sangria 97: R$ 5,00 em dinheiro, com a parcela e a baixa do mesmo valor', async () => {
  await sangria(falso)
  await rodarSemAviso('hora', '2026-09-29T17:00:00Z')
  assert.deepEqual(await documento('97'), {
    origem_id: '195', modelo: 'RS', status: 'E', movimento: 'N', financeiro: 'P',
    criado_em: '2026-09-29 13:00:00', fechado_em: '2026-09-29 13:00:00', pessoa: null,
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 1,
  })
  assert.deepEqual(await itens('97'), [])
  assert.deepEqual(await pagamentos('97'), [{ origem_id: '10', forma: '1', valor: '5.00' }])
  assert.deepEqual(await parcelas('97'), [
    { origem_id: '5', lancado_em: '2026-09-29', vencimento: '2026-09-29', valor: '5.00', status: 'B', descricao: 'compra de agua sanitaria' },
  ])
  assert.deepEqual(await baixas('97'), [{ origem_id: '3', pago_em: '2026-09-29', valor: '5.00', forma: '1', status: 'E' }])
  await rodarSemAviso('noite', '2026-09-30T01:00:00Z')
})

test('conta a pagar de abril: paga depois, relida pela parcela pendente; o estorno da baixa só aparece na noite', async () => {
  await contaDeAbril(falso)
  await documentoPosterior(falso)
  await rodarSemAviso('hora', '2026-09-30T17:00:00Z')
  assert.deepEqual(await documento('2'), {
    origem_id: '196', modelo: 'CP', status: 'E', movimento: 'N', financeiro: 'P',
    criado_em: '2026-04-14 00:00:00', fechado_em: null, pessoa: '1001',
    turno_caixa: null, turno_usuario: null, turno_numero: null,
  })
  const parcela = { origem_id: '6', lancado_em: '2026-04-14', vencimento: '2026-09-30', valor: '1500.00', descricao: 'parcela 1 de 1' }
  assert.deepEqual(await parcelas('2'), [{ ...parcela, status: 'P' }])

  await pagarContaDeAbril(falso)
  await rodarSemAviso('hora', '2026-10-01T13:00:00Z')
  assert.deepEqual(await parcelas('2'), [{ ...parcela, status: 'B' }])
  assert.deepEqual(await baixas('2'), [{ origem_id: '22', pago_em: '2026-10-01', valor: '1500.00', forma: '2', status: 'E' }])

  // Com todas as parcelas baixadas, a conta não volta à leitura da hora: o estorno ainda não aparece.
  await estornarBaixaDaConta(falso)
  await rodarSemAviso('hora', '2026-10-01T15:00:00Z')
  assert.deepEqual(await parcelas('2'), [{ ...parcela, status: 'B' }])
  assert.deepEqual((await baixas('2')).map((b) => b.status), ['E'])

  await rodarSemAviso('noite', '2026-10-02T01:00:00Z')
  assert.deepEqual(await parcelas('2'), [{ ...parcela, status: 'P' }])
  assert.deepEqual(await baixas('2'), [{ origem_id: '22', pago_em: '2026-10-01', valor: '1500.00', forma: '2', status: 'C' }])
})

test('ajuste de custo 94 com item sem quantidade e sem valor, e ajuste de estoque 138 com item sem valor', async () => {
  await ajustes(falso)
  await rodarSemAviso('hora', '2026-09-29T17:00:00Z')
  assert.deepEqual(await documento('94'), {
    origem_id: '197', modelo: 'AC', status: 'E', movimento: 'N', financeiro: 'N',
    criado_em: '2026-09-27 14:20:00', fechado_em: '2026-09-27 14:20:00', pessoa: null,
    turno_caixa: null, turno_usuario: null, turno_numero: null,
  })
  assert.deepEqual(await itens('94'), [
    { origem_id: '1882', sentido: 'N', produto: '61', quantidade: null, valor_liquido: null, vendedor: null },
  ])
  assert.deepEqual(await itens('138'), [
    { origem_id: '1883', sentido: 'E', produto: '1372', quantidade: '2.000000', valor_liquido: null, vendedor: null },
  ])
  for (const codigo of ['94', '138']) {
    assert.deepEqual(await pagamentos(codigo), [])
    assert.deepEqual(await parcelas(codigo), [])
    assert.deepEqual(await conferencia(codigo), [])
  }
  assert.deepEqual(await movimentos('1372'), [
    { origem_id: '1856', documento: '138', momento: '2026-09-29 08:00:00', saldo_antes: '1.000000', saldo_depois: '3.000000' },
  ])
  assert.equal(await foto('1372'), '3.000000')
  await rodarSemAviso('noite', '2026-09-30T01:00:00Z')
})

test('todos os casos juntos: duas leituras da hora e a da noite deixam o mesmo conteúdo, e a noite dá zero diferença', async () => {
  const tabelas = [
    'documento', 'documento_item', 'documento_pagamento', 'parcela', 'baixa', 'conferencia_caixa', 'estoque_movimento',
    'estoque_atual', 'produto', 'produto_fornecedor', 'pessoa', 'funcionario',
  ]
  async function conteudo(): Promise<Record<string, string[]>> {
    const resultado: Record<string, string[]> = {}
    for (const tabela of tabelas) {
      const r = await banco.cliente.query<{ linha: string }>(
        `select (to_jsonb(x) - 'id' - 'parcela_id' - 'lido_em')::text as linha from kaizen.${tabela} x order by 1`,
      )
      resultado[tabela] = r.rows.map((l) => l.linha)
    }
    return resultado
  }
  await todosOsCasos(falso)
  await rodarSemAviso('hora', '2026-09-30T17:00:00Z')
  const primeira = await conteudo()
  const documentos = await linhas('select id, origem_id, visto_em from kaizen.documento order by origem_id::bigint')
  assert.deepEqual(
    Object.fromEntries(Object.entries(primeira).map(([tabela, l]) => [tabela, l.length])),
    {
      documento: 15, documento_item: 11, documento_pagamento: 10, parcela: 4, baixa: 2, conferencia_caixa: 7,
      estoque_movimento: 9, estoque_atual: 9, produto: 12, produto_fornecedor: 0, pessoa: 4, funcionario: 2,
    },
  )
  await rodarSemAviso('hora', '2026-09-30T18:00:00Z')
  assert.deepEqual(await conteudo(), primeira)
  await rodarSemAviso('noite', '2026-10-01T01:00:00Z')
  assert.deepEqual(await conteudo(), primeira)
  assert.deepEqual(await linhas('select id, origem_id, visto_em from kaizen.documento order by origem_id::bigint'), documentos)
  assert.deepEqual(enviadas, [])
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/casos-reais.test.mts`

Expected: FAIL, porque `fixtures.mts` ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\fixtures.mts' imported from ...\tradutor\casos-reais.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 3: Criar `tradutor/fixtures.mts`**

```ts
// Só para testes: os casos reais do docs/FONTES.md (simulação de 25/09 e testes de 26/09), gravados no ERP falso
// como o ERP os grava, com oid acima do corte e sem nenhum dado de pessoa (nomes inventados).
// Cada caso usa oids e produtos só dele, para que todos caibam juntos no mesmo ERP (todosOsCasos).
import type { ErpFalso } from './erp-falso.mts'

// Turnos dos testes de 26/09: (caixa, usuário que abriu, número da abertura).
export const TURNO_IGOR_CAIXA1_ABERTURA2 = { idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 2 }
export const TURNO_IGOR_CAIXA1_ABERTURA3 = { idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 3 }
export const TURNO_DANIELE_CAIXA3_ABERTURA1 = { idcaixaabertura: 3, idusuarioabertura: 18153, idabertura: 1 }
export const TURNO_SUPORTE_CAIXA3_ABERTURA1 = { idcaixaabertura: 3, idusuarioabertura: 9149, idabertura: 1 }
const FORA_DO_CAIXA = { idcaixaabertura: 0, idusuarioabertura: 0, idabertura: 0 }

// Um documento com oid 400: representa os documentos dos dias seguintes. Com ele no Kaizen, a execução da hora
// só relê pela folga os oids acima de 200, e os casos (oids 185 a 199) só voltam pela janela, pela parcela em
// aberto ou pelo cancelamento.
export const OID_POSTERIOR = 400

const PRODUTOS = [60, 61, 62, 1362, 1368, 1370, 1372, 1391, 1436, 2138, 2962, 5278]

type Linha = Record<string, unknown>

function documento(oid: number, codigo: number, campos: Linha): Linha {
  return {
    oid, _iddocumento: codigo, idempresa: 1, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    idpessoa: 999007, ...TURNO_IGOR_CAIXA1_ABERTURA3, ...campos,
  }
}

function item(oid: number, codigo: number, sequencia: number, produto: number, qtd: string | null, valor: string | null, vendedor: number): Linha {
  return { oid, _iddocumento: codigo, _idsequencia: sequencia, idmercadoriavariacao: produto, qtd, valtotalliquido: valor, idpessoafuncionario: vendedor }
}

function pagamento(oid: number, codigo: number, sequencia: number, forma: number, valor: string): Linha {
  return { oid, _iddocumento: codigo, _idsequencia: sequencia, idpagamento: forma, valor }
}

// Grava a linha do histórico e deixa a foto do produto com o saldo novo, como o ERP faz na mesma gravação.
async function movimento(falso: ErpFalso, oid: number, produto: number, codigo: number, datahora: string, antes: string, depois: string): Promise<void> {
  await falso.inserir('mercadoria_estoque_historico', [{
    oid, _iddocumento: codigo, _idlocalestoque: 1, idmercadoriavariacao: produto, datahora, qtdsaldoatual: antes, qtdnovosaldo: depois,
  }])
  await fotoDoEstoque(falso, produto, depois)
}

export async function fotoDoEstoque(falso: ErpFalso, produto: number, quantidade: string): Promise<void> {
  await falso.cliente.query('delete from mercadoria_estoque where _idmercadoriavariacao = $1', [produto])
  await falso.inserir('mercadoria_estoque', [{ oid: produto, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: produto, qtdsaldo: quantidade }])
}

export async function cadastrosDaLoja(falso: ErpFalso): Promise<void> {
  await falso.inserir('pessoa', [
    { _idpessoa: 999007, nome: 'CONSUMIDOR', sobrenome: 'FINAL', flaginativo: 'F' },
    { _idpessoa: 1, nome: 'VENDEDOR', sobrenome: 'UM', flaginativo: 'F' },
    { _idpessoa: 999005, nome: 'VENDEDORA', sobrenome: 'DOIS', flaginativo: 'F' },
    { _idpessoa: 1001, nome: 'FORNECEDOR', sobrenome: 'EXEMPLO', flaginativo: 'F' },
  ])
  await falso.inserir('pessoa_funcionario', [
    { _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' },
    { _idempresa: 1, _idpessoa: 999005, idusuario: 18153, tipo: 'V', flaginativo: 'F' },
  ])
  await falso.inserir('mercadoria_variacao', PRODUTOS.map((p) => ({ _idmercadoriavariacao: p, descricao: `PRODUTO ${p}` })))
  await falso.inserir('mercadoria_variacao_empresa', PRODUTOS.map((p) => ({ _idempresa: 1, _idmercadoriavariacao: p, flaginativo: 'F' })))
}

export async function documentoPosterior(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(OID_POSTERIOR, 300, {
    modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null,
    datahora: '2026-09-30 07:55:00', datahoramovimento: '2026-09-30 07:55:00',
  })])
}

// Pedido 116 (26/09): troco é uma linha negativa de dinheiro — R$ 50,00 e −R$ 5,00, para um item de R$ 45,00.
export async function pedidoComTroco(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(185, 116, { datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:15:00' })])
  await falso.inserir('documento_mercadoria', [item(1873, 116, 1, 1436, '1.000000', '45.00', 1)])
  await falso.inserir('documento_pagamento', [pagamento(1, 116, 1, 1, '50.00'), pagamento(2, 116, 2, 1, '-5.00')])
  await movimento(falso, 1848, 1436, 116, '2026-09-29 10:15:00', '6.000000', '5.000000')
}

// Pedido 87 (26/09): dinheiro, Pix e crédito na mesma venda, vendedora 999005. O crédito virou conta a receber
// (parcela pendente) e o Pix deu baixa na hora; parcelas de venda não entram no Kaizen.
export async function pedidoTresFormas(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(186, 87, {
    ...TURNO_DANIELE_CAIXA3_ABERTURA1, datahora: '2026-09-29 11:00:00', datahoramovimento: '2026-09-29 11:02:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1874, 87, 1, 2962, '1.000000', '120.00', 999005)])
  await falso.inserir('documento_pagamento', [pagamento(3, 87, 1, 1, '50.00'), pagamento(4, 87, 2, 2, '40.00'), pagamento(5, 87, 3, 3, '30.00')])
  await falso.inserir('documento_parcela', [
    { oid: 1, _iddocumento: 87, _idsequencia: 3, _idparcela: 1, dtlancamento: '2026-09-29 11:02:00', dtvencimento: '2026-09-29 11:02:00', valparcela: '30.00', status: 'P', descricao: null },
    { oid: 2, _iddocumento: 87, _idsequencia: 2, _idparcela: 1, dtlancamento: '2026-09-29 11:02:00', dtvencimento: '2026-09-29 11:02:00', valparcela: '40.00', status: 'B', descricao: null },
  ])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 1, _iddocumento: 87, _idsequencia: 2, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-29 11:02:00', valpagamento: '40.00', idpagamento: 2, status: 'E' },
  ])
  await movimento(falso, 1849, 2962, 87, '2026-09-29 11:00:00', '2.000000', '1.000000')
}

// Troca TM 61 (25/09): o item volta ao estoque e o valor vira crédito do cliente, pago com a forma 5 e guardado
// como parcela a pagar pendente de R$ 77,00.
export async function trocaComCredito(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(187, 61, {
    modelo: 'TM', tipomovimento: 'E', tipomovimentofinanceiro: 'P', ...TURNO_IGOR_CAIXA1_ABERTURA2,
    datahora: '2026-09-28 15:30:00', datahoramovimento: '2026-09-28 15:30:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1875, 61, 1, 60, '1.000000', '77.00', 0)])
  await falso.inserir('documento_pagamento', [pagamento(6, 61, 1, 5, '77.00')])
  await falso.inserir('documento_parcela', [{
    oid: 3, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-28 15:30:00', dtvencimento: '2026-09-28 00:00:00',
    valparcela: '77.00', status: 'P', descricao: 'Troca de Mercadoria - Adiantamento',
  }])
  await movimento(falso, 1850, 60, 61, '2026-09-28 15:30:00', '3.000000', '4.000000')
}

// Pedido 117 (26/09): usa o crédito da troca 61 — paga R$ 77,00 com a forma 5, e a parcela da troca é baixada
// com a forma 5.
export async function usoDoCredito(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(601, 117, { datahora: '2026-10-01 10:00:00', datahoramovimento: '2026-10-01 10:00:00' })])
  await falso.inserir('documento_mercadoria', [item(1901, 117, 1, 60, '1.000000', '77.00', 1)])
  await falso.inserir('documento_pagamento', [pagamento(21, 117, 1, 5, '77.00')])
  await falso.cliente.query(`update documento_parcela set status = 'B' where oid = 3`)
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 21, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-10-01 10:00:00', valpagamento: '77.00', idpagamento: 5, status: 'E' },
  ])
  await movimento(falso, 1901, 60, 117, '2026-10-01 10:00:00', '4.000000', '3.000000')
}

// Devolução TM 63 (25/09): o item volta ao estoque e a parcela a pagar é baixada na hora, em dinheiro (R$ 18,00).
export async function devolucaoEmDinheiro(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(188, 63, {
    modelo: 'TM', tipomovimento: 'E', tipomovimentofinanceiro: 'P', ...TURNO_IGOR_CAIXA1_ABERTURA2,
    datahora: '2026-09-28 16:00:00', datahoramovimento: '2026-09-28 16:00:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1876, 63, 1, 1362, '1.000000', '18.00', 0)])
  await falso.inserir('documento_pagamento', [pagamento(7, 63, 1, 1, '18.00')])
  await falso.inserir('documento_parcela', [{
    oid: 4, _iddocumento: 63, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-28 16:00:00', dtvencimento: '2026-09-28 00:00:00',
    valparcela: '18.00', status: 'B', descricao: 'Troca de Mercadoria - Retirada',
  }])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 2, _iddocumento: 63, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-28 16:00:00', valpagamento: '18.00', idpagamento: 1, status: 'E' },
  ])
  await movimento(falso, 1851, 1362, 63, '2026-09-28 16:00:00', '0.000000', '1.000000')
}

// Orçamento 120, feito fora do caixa em 28/09 (como o 58 de 25/09): não mexe no estoque nem gera recebimento.
export async function orcamento(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(189, 120, {
    modelo: 'OC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', ...FORA_DO_CAIXA,
    datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:09:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1877, 120, 1, 1391, '1.000000', '144.00', 1)])
}

// O orçamento 120 vira pedido no próprio documento em 01/10: o mesmo oid passa de OC a PA e ganha
// datahoramovimento novo; o movimento de estoque leva a hora do orçamento, como o ERP grava.
export async function orcamentoConvertido(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(
    `update documento set modelo = 'PA', tipomovimento = 'S', tipomovimentofinanceiro = 'R', datahoramovimento = '2026-10-01 10:00:00' where oid = 189`,
  )
  await movimento(falso, 1902, 1391, 120, '2026-09-28 15:09:00', '177.000000', '176.000000')
}

// Pedido 110, pago no Pix em 29/09, pelo suporte no caixa 3.
export async function vendaParaCancelar(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(190, 110, {
    ...TURNO_SUPORTE_CAIXA3_ABERTURA1, datahora: '2026-09-29 10:00:00', datahoramovimento: '2026-09-29 10:05:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1878, 110, 1, 62, '1.000000', '30.00', 1)])
  await falso.inserir('documento_pagamento', [pagamento(8, 110, 1, 2, '30.00')])
  await movimento(falso, 1852, 62, 110, '2026-09-29 10:00:00', '5.000000', '4.000000')
}

// O pedido 110 é cancelado em 01/10: status C, uma linha no histórico de cancelamento, e o estorno do estoque
// com a hora do documento (29/09), e não a do cancelamento.
export async function cancelarVenda(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(`update documento set status = 'C' where oid = 190`)
  await falso.inserir('documento_cancelamento_historico', [{ oid: 1, _iddocumento: 110, datahora: '2026-10-01 09:00:00' }])
  await movimento(falso, 1903, 62, 110, '2026-09-29 10:00:00', '4.000000', '5.000000')
}

// Pedido 58 (25/09), feito fora do caixa e sem pagamento, gravado às 15h27.
export async function pedido58(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(191, 58, {
    ...FORA_DO_CAIXA, datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:27:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1879, 58, 1, 2138, '1.000000', '144.00', 1)])
  await movimento(falso, 1853, 2138, 58, '2026-09-28 15:09:00', '48.000000', '47.000000')
}

// Às 15h48 o pedido 58 é gravado de novo com os itens trocados: o item antigo some, entram dois novos
// (2138 por R$ 119,00 e 5278 por R$ 25,00); o 2138 tem estorno e nova saída, e o 5278 sai pela primeira vez.
export async function regravarPedido58(falso: ErpFalso): Promise<void> {
  await falso.cliente.query('delete from documento_mercadoria where oid = 1879')
  await falso.inserir('documento_mercadoria', [
    item(1904, 58, 1, 2138, '1.000000', '119.00', 1),
    item(1905, 58, 2, 5278, '1.000000', '25.00', 1),
  ])
  await falso.cliente.query(`update documento set datahoramovimento = '2026-09-28 15:48:00' where oid = 191`)
  await movimento(falso, 1904, 2138, 58, '2026-09-28 15:09:00', '47.000000', '48.000000')
  await movimento(falso, 1905, 2138, 58, '2026-09-28 15:09:00', '48.000000', '47.000000')
  await movimento(falso, 1906, 5278, 58, '2026-09-28 15:09:00', '0.000000', '-1.000000')
}

// Pedido 123 de 29/09, R$ 150,00 no débito, vendedor 1: o exemplo de documento apagado da spec.
export async function pedido123(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(192, 123, { datahora: '2026-09-29 16:20:00', datahoramovimento: '2026-09-29 16:20:00' })])
  await falso.inserir('documento_mercadoria', [
    item(1880, 123, 1, 1368, '1.000000', '100.00', 1),
    item(1881, 123, 2, 1370, '1.000000', '50.00', 1),
  ])
  await falso.inserir('documento_pagamento', [pagamento(9, 123, 1, 4, '150.00')])
  await movimento(falso, 1854, 1368, 123, '2026-09-29 16:20:00', '75.000000', '74.000000')
  await movimento(falso, 1855, 1370, 123, '2026-09-29 16:20:00', '130.000000', '129.000000')
}

// O suporte apaga o pedido 123 direto no banco: somem o documento, os itens e o pagamento; o histórico de
// estoque fica.
export async function apagarPedido123(falso: ErpFalso): Promise<void> {
  await falso.cliente.query('delete from documento where oid = 192')
  await falso.cliente.query('delete from documento_mercadoria where _iddocumento = 123')
  await falso.cliente.query('delete from documento_pagamento where _iddocumento = 123')
}

// Fechamento 114, às 8h37 de 29/09, da abertura 3 do Igor no caixa 1: a conferência às cegas, uma linha por forma.
export async function primeiroFechamento(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(193, 114, {
    modelo: 'FC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null,
    datahora: '2026-09-29 08:37:00', datahoramovimento: '2026-09-29 08:37:00',
  })])
  await falso.inserir('documento_conferencia_caixa', [
    { oid: 31, _iddocumento: 114, _idpagamento: 1, valdisponivel: '50.00', valconferido: '48.00' },
    { oid: 32, _iddocumento: 114, _idpagamento: 2, valdisponivel: '10.00', valconferido: '10.00' },
  ])
}

// Fechamento 118 (26/09): fecha de novo a mesma abertura 3 do Igor, já fechada às 8h37, somando as vendas
// 116 e 117. Na linha da troca, o crédito usado entra no calculado como +R$ 77,00.
export async function fechamentoRefeito(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(194, 118, {
    modelo: 'FC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null,
    datahora: '2026-09-29 18:00:00', datahoramovimento: '2026-09-29 18:00:00',
  })])
  await falso.inserir('documento_conferencia_caixa', [
    { oid: 33, _iddocumento: 118, _idpagamento: 1, valdisponivel: '45.00', valconferido: '45.00' },
    { oid: 34, _iddocumento: 118, _idpagamento: 2, valdisponivel: '0.00', valconferido: '0.00' },
    { oid: 35, _iddocumento: 118, _idpagamento: 3, valdisponivel: '0.00', valconferido: '0.00' },
    { oid: 36, _iddocumento: 118, _idpagamento: 4, valdisponivel: '0.00', valconferido: '0.00' },
    { oid: 37, _iddocumento: 118, _idpagamento: 5, valdisponivel: '77.00', valconferido: '0.00' },
  ])
}

// Sangria RS 97 (26/09): R$ 5,00 em dinheiro para comprar água sanitária, paga na hora.
export async function sangria(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(195, 97, {
    modelo: 'RS', tipomovimento: 'N', tipomovimentofinanceiro: 'P', idpessoa: null, idabertura: 1,
    datahora: '2026-09-29 13:00:00', datahoramovimento: '2026-09-29 13:00:00',
  })])
  await falso.inserir('documento_pagamento', [pagamento(10, 97, 1, 1, '5.00')])
  await falso.inserir('documento_parcela', [{
    oid: 5, _iddocumento: 97, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-29 13:00:00', dtvencimento: '2026-09-29 00:00:00',
    valparcela: '5.00', status: 'B', descricao: 'compra de agua sanitaria',
  }])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 3, _iddocumento: 97, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-29 13:00:00', valpagamento: '5.00', idpagamento: 1, status: 'E' },
  ])
}

// Conta a pagar CP 2, reimportada com a data de abril (as reimportadas vão de 14/04 a 22/09), pendente.
export async function contaDeAbril(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(196, 2, {
    modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P', idpessoa: 1001, ...FORA_DO_CAIXA,
    datahora: '2026-04-14 00:00:00', datahoramovimento: null,
  })])
  await falso.inserir('documento_parcela', [{
    oid: 6, _iddocumento: 2, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-04-14 00:00:00', dtvencimento: '2026-09-30 00:00:00',
    valparcela: '1500.00', status: 'P', descricao: 'parcela 1 de 1',
  }])
}

// A conta 2 é paga no Pix em 01/10: a parcela fica baixada.
export async function pagarContaDeAbril(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(`update documento_parcela set status = 'B' where oid = 6`)
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 22, _iddocumento: 2, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-10-01 09:30:00', valpagamento: '1500.00', idpagamento: 2, status: 'E' },
  ])
}

// A baixa da conta 2 é estornada: a baixa fica com status C, e a parcela volta a pendente.
export async function estornarBaixaDaConta(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(`update documento_parcela_pagamento set status = 'C' where oid = 22`)
  await falso.cliente.query(`update documento_parcela set status = 'P' where oid = 6`)
}

// Ajuste de custo AC 94 (27/09, 14h20): o item vem sem quantidade e sem valor. Ajuste de estoque AS 138:
// entrada de 2 unidades, sem valor.
export async function ajustes(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [
    documento(197, 94, {
      modelo: 'AC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null, ...FORA_DO_CAIXA,
      datahora: '2026-09-27 14:20:00', datahoramovimento: '2026-09-27 14:20:00',
    }),
    documento(198, 138, {
      modelo: 'AS', tipomovimento: 'E', tipomovimentofinanceiro: 'N', idpessoa: null, ...FORA_DO_CAIXA,
      datahora: '2026-09-29 08:00:00', datahoramovimento: '2026-09-29 08:00:00',
    }),
  ])
  await falso.inserir('documento_mercadoria', [
    item(1882, 94, 1, 61, null, null, 0),
    item(1883, 138, 1, 1372, '2.000000', null, 0),
  ])
  await movimento(falso, 1856, 1372, 138, '2026-09-29 08:00:00', '1.000000', '3.000000')
}

// Todos os casos, no estado em que foram lidos pela primeira vez, no mesmo ERP. Os cadastros da loja ficam de
// fora: o beforeEach do teste já os insere, e inserir de novo deixaria pessoa e produto em dobro no ERP falso.
export async function todosOsCasos(falso: ErpFalso): Promise<void> {
  await pedidoComTroco(falso)
  await pedidoTresFormas(falso)
  await trocaComCredito(falso)
  await devolucaoEmDinheiro(falso)
  await orcamento(falso)
  await vendaParaCancelar(falso)
  await pedido58(falso)
  await pedido123(falso)
  await primeiroFechamento(falso)
  await fechamentoRefeito(falso)
  await sangria(falso)
  await contaDeAbril(falso)
  await ajustes(falso)
  await documentoPosterior(falso)
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test tradutor/casos-reais.test.mts`

Expected: PASS, 13 testes (cada um leva perto de 1 s):
```
✔ pedido 116: o troco fica como R$ 50,00 e −R$ 5,00 em dinheiro, e a noite dá zero diferença
✔ pedido 87: dinheiro, Pix e crédito na mesma venda; a parcela e a baixa a receber não entram nem geram diferença
✔ troca 61 com crédito e uso no pedido 117: a parcela pendente de R$ 77,00 é relida e aparece baixada com a forma 5
✔ devolução 63 em dinheiro: o item volta ao estoque e a parcela de R$ 18,00 fica baixada em dinheiro
✔ orçamento 120 convertido dias depois no próprio documento: o mesmo oid vira pedido e ganha fechado_em novo
✔ pedido 110 cancelado depois de lido: volta pela linha de cancelamento, fica com status C e o estorno entra
✔ pedido 58 regravado com o item trocado: o item antigo sai, os dois novos entram, e o documento é o mesmo
✔ pedido 123 apagado no ERP: sai do Kaizen com os filhos, os movimentos ficam, e o aviso chega no resumo das 22h
✔ fechamento refeito: os fechamentos 114 e 118 do mesmo turno ficam os dois, cada um com a sua conferência
✔ sangria 97: R$ 5,00 em dinheiro, com a parcela e a baixa do mesmo valor
✔ conta a pagar de abril: paga depois, relida pela parcela pendente; o estorno da baixa só aparece na noite
✔ ajuste de custo 94 com item sem quantidade e sem valor, e ajuste de estoque 138 com item sem valor
✔ todos os casos juntos: duas leituras da hora e a da noite deixam o mesmo conteúdo, e a noite dá zero diferença
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

Se um caso falhar, leia a mensagem antes de mexer em qualquer coisa. Um aviso inesperado numa `rodarSemAviso` mostra o texto dele (por exemplo, `em 29/09, itens:valor: ERP 45.00, Kaizen 0`): é a comparação da noite apontando uma diferença real entre o ERP falso e o Kaizen. Não mude o teste para passar: ele descreve a spec (seções 5.2, 6.3, 6.4 e 8).

Rode também com a máquina em outro fuso, para ver que nada depende dele (Git Bash):

Run: `TZ=UTC node --test tradutor/casos-reais.test.mts`

Expected: PASS, `ℹ pass 13`, `ℹ fail 0`.

- [ ] **Passo 5: Conferir que o teste pega o defeito que ele promete pegar**

Quebre de propósito um caminho de releitura da hora em `tradutor/execucao.mts` (tarefa 14), rode, e desfaça com o `git checkout`, que devolve o arquivo commitado. Git Bash:

Run:
```bash
sed -i 's/      pendentes: await oidsComParcelaAberta(cliente),/      pendentes: [],/' tradutor/execucao.mts
node --test tradutor/casos-reais.test.mts
git checkout -- tradutor/execucao.mts
```
Expected: `ℹ pass 11`, `ℹ fail 2`, e os dois que falham são `troca 61 com crédito e uso no pedido 117: ...` e `conta a pagar de abril: ...` (sem a releitura pela parcela em aberto, o crédito usado e a conta paga não aparecem no Kaizen).

Run:
```bash
sed -i "s/      inicio: inicioDaJanela(agora, await ultimaNoiteBoa(cliente)),/      inicio: '9999-12-31',/" tradutor/execucao.mts
node --test tradutor/casos-reais.test.mts
git checkout -- tradutor/execucao.mts
```
Expected: `ℹ pass 11`, `ℹ fail 2`, e os dois que falham são `orçamento 120 convertido dias depois ...` e `pedido 110 cancelado depois de lido: ...` (sem a janela, o orçamento convertido e a venda cancelada não voltam).

Se algum `node --test` acima passar com 13, o `sed` não achou a linha: confira com `grep -n "oidsComParcelaAberta(cliente)\|inicioDaJanela(agora" tradutor/execucao.mts` e ajuste só o `sed`, nunca o teste.

Run: `git status --short`
Expected: só as duas linhas `?? tradutor/casos-reais.test.mts` e `?? tradutor/fixtures.mts` (o `execucao.mts` voltou a ser o commitado).

- [ ] **Passo 6: Atualizar `testes-esperados.txt` (N = 13, todos em `casos-reais.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+13;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 13.

- [ ] **Passo 7: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 8: Commit**

```bash
git add tradutor/fixtures.mts tradutor/casos-reais.test.mts testes-esperados.txt
git commit -F - <<'EOF'
Casos reais da loja passam pelo tradutor inteiro, com zero diferença

Os casos da simulação de 25/09 e dos testes de 26/09 agora rodam de
ponta a ponta, do ERP de teste até o banco do Kaizen, e o Kaizen guarda
o que o ERP gravou: o troco do pedido 116 como R$ 50,00 e -R$ 5,00, as
três formas do pedido 87, o crédito de R$ 77,00 da troca 61 pendente e
depois baixado com a forma 5 pelo pedido 117, a devolução 63 em
dinheiro, a sangria 97, o fechamento refeito do mesmo turno, e os
ajustes sem quantidade ou sem valor.

O que muda depois de lido também chega: o orçamento convertido dias
depois vira pedido no mesmo documento, a venda cancelada fica com
status C, o pedido regravado troca o item, o pedido apagado sai e vira
aviso no resumo das 22h, e a conta de abril aparece paga e, na noite,
com a baixa estornada. Em todos os casos a comparação da noite com o
ERP dá zero diferença, e duas leituras seguidas deixam o mesmo
conteúdo. 13 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 16: Comando de conferência do dono

**O que esta tarefa entrega, em resultado:** o dono ganha um comando que roda na VPS (`node tradutor/principal.mts conferencia 60 2138 ...`) e imprime, em palavras, os números que o Kaizen copiou e onde conferir cada um no ERP (spec, seção 10):
1. por dia desde 28/09, a quantidade de vendas e o total dos itens com vendedor, pela regra do relatório 154: documento emitido, de saída, que recebe; só os itens com vendedor; pelo dia em que o documento foi criado. Confere no **relatório 154**;
2. as contas a pagar pendentes, número de parcelas e total, sem o crédito de troca. Confere na **tela de contas a pagar**;
3. a quebra de cada fechamento de caixa, forma por forma (informado menos calculado, sem a forma troca), com o turno. Confere na **tela do fechamento**;
4. o saldo atual de cada produto pedido, da última leitura. Confere na **tela do produto**;
5. as execuções esperadas e feitas nos últimos 7 dias (quais faltaram, quais falharam) e o resultado da última comparação da noite ("zero diferença", a lista das diferenças, ou "a leitura da noite falhou").

Os valores saem em reais (`R$ 1.745,50`, `−R$ 2,00`), sem passar por número do JavaScript. É conferência da cópia, não do indicador, que é da Fase 4. São 4 testes novos, num commit.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Postgres local de pé (`docker compose up -d --wait`). As tarefas 1 a 15 precisam estar feitas (a publicação na VPS é a tarefa 17, a seguinte: o roteiro dela manda o dono rodar este comando). Os testes montam um banco do Kaizen à mão (`criarBancoKaizen` e `insert`); nenhum teste fala com o ERP nem com o Telegram. Commits no Git Bash. Não abra o `.env`.

**Arquivos:**
- Criar: `sql/kaizen/conferencia-dono.sql`
- Criar: `tradutor/conferencia-dono.mts`
- Testar: `tradutor/conferencia-dono.test.mts`
- Modificar: `tradutor/principal.mts` (três trechos: um `import`, a constante `USO` e o comando novo, antes da leitura de `--manual`)
- Modificar: `testes-esperados.txt` (soma 4)

**Interfaces:**
- Consome (exatamente estes nomes):
  ```ts
  // tradutor/banco.mts (T1)
  export type Cliente = pg.Client
  export function garantirLocal(url: string): void
  export async function conectar(url: string): Promise<Cliente>   // fixa o fuso da sessão em America/Fortaleza

  // tradutor/apoio-teste.mts (T2, só testes)
  export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }
  export async function criarBancoKaizen(opcoes?: { migrar?: boolean }): Promise<BancoTeste>

  // tradutor/constantes.mts (T10)
  export const HORAS_DA_HORA = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  export const HORA_DA_NOITE = 22

  // tradutor/janela.mts (T10)
  export type Instante = { data: string; hora: number; minuto: number; diaSemana: number }
  export function emFortaleza(ms: number): Instante
  export function somarDias(data: string, dias: number): string
  export function horarioEsperado(i: Instante): boolean     // segunda a sábado, 8h a 19h ou 22h

  // tradutor/avisos.mts (T10)
  export function formatarReais(valor: string): string      // '150.000000' → 'R$ 150,00'; '-2.00' → '−R$ 2,00'; '0' → 'R$ 0,00'
  export function diaMes(dataOuTimestamp: string): string    // '2026-09-29...' → '29/09'

  // tradutor/config.mts (T13)
  export function lerConfig(env: Record<string, string | undefined>): Config   // lança Error('falta MEUERP_TOKEN') / ('falta KAIZEN_URL')

  // tradutor/principal.mts (T13): o arquivo que esta tarefa modifica
  export async function principal(argumentos: string[], env: Record<string, string | undefined>, fetchFn?: typeof fetch): Promise<number>
  ```
  O banco do Kaizen (tarefa 2): a visão `kaizen.documento_negocio` (`tipo`, `situacao`, `movimento`, `financeiro` em palavras: `pedido`, `emitido`, `saida`, `recebe`, `paga`, `troca`, `fechamento_caixa`...), as tabelas `documento_item`, `parcela`, `conferencia_caixa`, `estoque_atual`, `produto`, `execucao`, e a `traducao` (campos `forma`: 1 dinheiro, 2 pix, 3 credito, 4 debito, 5 troca; `status_parcela`: P pendente). Os avisos de total diferente guardados em `execucao.avisos` têm `tipo = 'total_diferente'` e o texto `em 29/09, itens:valor: ERP 165.00, Kaizen 145.00` (tarefa 10).
- Produz:
  ```ts
  // tradutor/conferencia-dono.mts
  export async function conferenciaDoDono(cliente: Cliente, produtos: string[], agoraMs: number): Promise<string>
  // o texto inteiro da conferência, linhas separadas por '\n' (formato exato no teste abaixo)
  export async function rodarConferencia(kaizenUrl: string, produtos: string[], agoraMs: number): Promise<string>
  // conecta, chama conferenciaDoDono e fecha a conexão

  // tradutor/principal.mts: novo comando
  //   principal(['conferencia', ...produtos], env) → imprime o texto e devolve 0
  //   uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...]
  ```
  `sql/kaizen/conferencia-dono.sql` recebe `$1` (os códigos dos produtos, `text[]`) e `$2` (o primeiro dos 7 dias das execuções, `date`) e devolve uma linha com seis colunas `jsonb`: `vendas`, `contas`, `fechamentos`, `produtos`, `execucoes`, `noite`. O passo 13 do roteiro do dono (`publicacao/README.md`, que a tarefa 17 cria) vai rodar este comando na VPS, e o teste da tarefa 17 confere que o roteiro o chama. A tarefa 20 pede ao dono as partes 5 (execuções) e a última comparação.

**O que cada parte conta (para não "consertar" sem querer):**
- Só o ERP novo (`fonte = 'meuerp'`). As datas são as da loja: `conectar` fixa a sessão em Fortaleza, e "hoje" vem de `emFortaleza`.
- **Vendas (regra do 154, `docs/FONTES.md`, "Armadilha"):** documento com situação `emitido`, movimento `saida` e financeiro `recebe`; só os itens com vendedor (vendedor vazio no Kaizen é o 0 do ERP); pelo dia de `criado_em`, e não o de `fechado_em`: o 154 conta o orçamento convertido no dia do orçamento. Desde 28/09. "Vendas" é o número de documentos com pelo menos um item com vendedor. Orçamento, pré-venda, troca, cancelado e o que é de antes de 28/09 ficam fora.
- **Contas a pagar:** parcelas com status que a tradução diz `pendente`, de documento que `paga`, fora o tipo `troca` (o crédito de troca não é conta: `docs/FONTES.md`, "Armadilhas", 1) e fora o modelo `TR`.
- **Quebra:** por fechamento (tipo `fechamento_caixa`, desde 28/09), cada forma com informado − calculado; o informado vazio conta como zero; a forma `troca` fica fora (é o crédito, não dinheiro na gaveta). A quebra do fechamento é a soma das formas mostradas.
- **Saldo:** a foto (`estoque_atual`) da última leitura, com a hora dela. Quantidade sem os zeros do fim (`trim_scale`): `3`, `1.234,5`, `−1`.
- **Execuções:** para cada um dos 7 dias até hoje, os horários esperados (segunda a sábado, 8h a 19h e 22h; hoje, só até a hora atual). Um horário é "feito" se houver linha não manual de qualquer resultado começando nele (spec 6.6); "com falha" se as linhas dele só forem falha. Antes da primeira execução agendada, nada é cobrado. As manuais não contam.
- **Última comparação da noite:** a última linha `noite` com resultado `ok`, `aviso` ou `falha` (a `pulada` não conta). Com `falha`, a comparação não terminou; senão, as diferenças são os avisos `total_diferente` dela.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `tradutor/conferencia-dono.test.mts`:

```ts
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { garantirLocal } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conferenciaDoDono } from './conferencia-dono.mts'
import { principal } from './principal.mts'

let banco: BancoTeste
let proximoOid = 185

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco?.fechar()
})

beforeEach(async () => {
  await banco.cliente.query(
    'truncate kaizen.documento, kaizen.documento_item, kaizen.parcela, kaizen.conferencia_caixa, kaizen.estoque_atual, kaizen.produto, kaizen.execucao restart identity cascade',
  )
})

type Turno = [number, number, number] | null

async function documento(codigo: string, modelo: string, status: string, movimento: string, financeiro: string, criadoEm: string, turno: Turno = null): Promise<string> {
  proximoOid += 1
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em, turno_caixa, turno_usuario, turno_numero)
     values ('meuerp', 'documento', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [String(proximoOid), codigo, modelo, status, movimento, financeiro, criadoEm, turno?.[0] ?? null, turno?.[1] ?? null, turno?.[2] ?? null],
  )
  return r.rows[0].id
}

async function item(documentoId: string, origemId: string, valor: string, vendedor: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
     values ($1, 'documento_mercadoria', $2, 'S', '60', 1, $3, $4)`,
    [documentoId, origemId, valor, vendedor],
  )
}

async function parcela(documentoId: string, origemId: string, valor: string, status: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, valor, status) values ($1, 'documento_parcela', $2, $3, $4)`,
    [documentoId, origemId, valor, status],
  )
}

async function conferencia(documentoId: string, origemId: string, forma: string, calculado: string, informado: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, $4, $5)`,
    [documentoId, origemId, forma, calculado, informado],
  )
}

async function execucao(dia: string, hora: number, resultado: string, extra: { manual?: boolean; mensagem?: string; avisos?: unknown[] } = {}): Promise<void> {
  const inicio = `${dia} ${String(hora).padStart(2, '0')}:00:05-03`
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, mensagem, avisos)
     values ($1, $2, $3::timestamptz, $3::timestamptz + interval '1 minute', $4, $5, $6::jsonb)`,
    [hora === 22 ? 'noite' : 'hora', extra.manual ?? false, inicio, resultado, extra.mensagem ?? null, JSON.stringify(extra.avisos ?? [])],
  )
}

const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22]

test('mostra ao dono, em palavras, as vendas pela regra do 154, o a pagar, as quebras, os saldos e as execuções', async () => {
  // Vendas: conta só documento emitido, de saída, que recebe, com item de vendedor, a partir de 28/09, pelo dia da criação.
  const pedido58 = await documento('58', 'PA', 'E', 'S', 'R', '2026-09-28 15:09:00')
  await item(pedido58, '1', '144.00', '1')
  const pedido116 = await documento('116', 'PA', 'E', 'S', 'R', '2026-09-29 10:15:00', [1, 18152, 3])
  await item(pedido116, '1', '45.00', '1')
  const pedido87 = await documento('87', 'PA', 'E', 'S', 'R', '2026-09-29 11:00:00', [3, 18153, 1])
  await item(pedido87, '1', '120.00', '999005')
  await item(pedido87, '2', '10.00', null)
  const semVendedor = await documento('54', 'PA', 'E', 'S', 'R', '2026-09-29 12:00:00', [1, 18152, 3])
  await item(semVendedor, '1', '77.00', null)
  const pedido117 = await documento('117', 'PA', 'E', 'S', 'R', '2026-09-30 10:00:00', [1, 18152, 3])
  await item(pedido117, '1', '77.00', '1')
  const cancelado = await documento('110', 'PA', 'C', 'S', 'R', '2026-09-30 10:30:00', [3, 9149, 1])
  await item(cancelado, '1', '30.00', '1')
  const orcamento = await documento('120', 'OC', 'E', 'N', 'N', '2026-09-30 11:00:00')
  await item(orcamento, '1', '144.00', '1')
  const troca = await documento('61', 'TM', 'E', 'E', 'P', '2026-09-28 15:30:00', [1, 18152, 2])
  await item(troca, '1', '77.00', '1')
  const antesDaVirada = await documento('50', 'PA', 'E', 'S', 'R', '2026-09-27 18:00:00')
  await item(antesDaVirada, '1', '10.00', '1')

  // A pagar: parcelas pendentes de documento que paga, sem o crédito de troca (TM) e sem o modelo TR.
  const conta2 = await documento('2', 'CP', 'E', 'N', 'P', '2026-04-14 00:00:00')
  await parcela(conta2, '1', '1500.00', 'P')
  await parcela(conta2, '2', '300.00', 'B')
  const conta3 = await documento('3', 'CP', 'E', 'N', 'P', '2026-05-02 00:00:00')
  await parcela(conta3, '3', '245.50', 'P')
  await parcela(troca, '4', '77.00', 'P')
  const retirada = await documento('4', 'TR', 'E', 'N', 'P', '2026-09-30 12:00:00')
  await parcela(retirada, '5', '10.00', 'P')

  // Fechamentos: informado − calculado por forma, sem a linha da troca; informado vazio conta como zero.
  const fc114 = await documento('114', 'FC', 'E', 'N', 'N', '2026-09-29 08:37:00', [1, 18152, 3])
  await conferencia(fc114, '31', '1', '50.00', '48.00')
  await conferencia(fc114, '32', '2', '10.00', '10.00')
  const fc118 = await documento('118', 'FC', 'E', 'N', 'N', '2026-09-29 18:00:00', [1, 18152, 3])
  await conferencia(fc118, '33', '1', '45.00', '45.00')
  await conferencia(fc118, '34', '2', '0.00', '0.00')
  await conferencia(fc118, '35', '3', '0.00', '0.00')
  await conferencia(fc118, '36', '4', '0.00', '0.00')
  await conferencia(fc118, '37', '5', '77.00', '0.00')
  const fc140 = await documento('140', 'FC', 'E', 'N', 'N', '2026-09-30 19:10:00', [3, 18153, 1])
  await conferencia(fc140, '38', '1', '310.500000', '300.000000')
  await conferencia(fc140, '39', '3', '100.00', null)

  // Estoque: a foto da última leitura.
  await banco.cliente.query(
    `insert into kaizen.estoque_atual (fonte, produto, quantidade, lido_em) values
       ('meuerp', '60', 3.000000, '2026-10-01 09:00:04-03'), ('meuerp', '1391', 1234.500000, '2026-10-01 09:00:04-03'),
       ('meuerp', '5278', -1.000000, '2026-10-01 09:00:04-03'), ('link', '999', 5, '2026-10-01 09:00:04-03')`,
  )
  await banco.cliente.query(
    `insert into kaizen.produto (fonte, codigo, descricao, ativo) values ('meuerp', '60', 'PRODUTO 60', true), ('meuerp', '1391', 'PRODUTO 1391', true)`,
  )

  // Execuções: a primeira agendada foi às 8h de 28/09; em 29/09 a das 10h falhou e a das 15h não aconteceu.
  for (const hora of HORAS) await execucao('2026-09-28', hora, 'ok')
  for (const hora of HORAS) if (hora !== 15) await execucao('2026-09-29', hora, hora === 10 ? 'falha' : 'ok', { mensagem: hora === 10 ? 'o ERP não respondeu' : undefined })
  for (const hora of HORAS) await execucao('2026-09-30', hora, 'ok')
  await execucao('2026-09-30', 11, 'pulada')
  await execucao('2026-09-30', 23, 'ok', { manual: true })
  await execucao('2026-10-01', 8, 'ok')
  await execucao('2026-10-01', 9, 'aviso')

  const texto = await conferenciaDoDono(banco.cliente, ['60', '1391', '5278', '999'], Date.parse('2026-10-01T12:30:00Z'))
  assert.equal(texto, [
    'Conferência do Kaizen — 01/10 às 9h30',
    '',
    '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.',
    '- 28/09: 1 venda, R$ 144,00',
    '- 29/09: 2 vendas, R$ 165,00',
    '- 30/09: 1 venda, R$ 77,00',
    'Total: 4 vendas, R$ 386,00',
    '',
    '2. Contas a pagar pendentes, sem o crédito de troca: 2 parcelas, R$ 1.745,50. Onde conferir: tela de contas a pagar.',
    '',
    '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.',
    '- fechamento 114, 29/09 às 08h37 (caixa 1, usuário 18152, abertura 3): quebra −R$ 2,00',
    '  dinheiro: calculado R$ 50,00, informado R$ 48,00, quebra −R$ 2,00',
    '  pix: calculado R$ 10,00, informado R$ 10,00, quebra R$ 0,00',
    '- fechamento 118, 29/09 às 18h00 (caixa 1, usuário 18152, abertura 3): quebra R$ 0,00',
    '  dinheiro: calculado R$ 45,00, informado R$ 45,00, quebra R$ 0,00',
    '  pix: calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '  credito: calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '  debito: calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '- fechamento 140, 30/09 às 19h10 (caixa 3, usuário 18153, abertura 1): quebra −R$ 110,50',
    '  dinheiro: calculado R$ 310,50, informado R$ 300,00, quebra −R$ 10,50',
    '  credito: calculado R$ 100,00, informado R$ 0,00, quebra −R$ 100,00',
    '',
    '4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.',
    '- produto 60 (PRODUTO 60): 3 (lido em 01/10 às 09h00)',
    '- produto 1391 (PRODUTO 1391): 1.234,5 (lido em 01/10 às 09h00)',
    '- produto 5278: −1 (lido em 01/10 às 09h00)',
    '- produto 999: não está na foto do estoque do ERP',
    '',
    '5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).',
    '- 25/09 (sexta): nenhuma esperada',
    '- 26/09 (sábado): nenhuma esperada',
    '- 27/09 (domingo): nenhuma esperada',
    '- 28/09 (segunda): 13 esperadas, 13 feitas',
    '- 29/09 (terça): 13 esperadas, 12 feitas, 1 com falha (10h); faltaram: 15h',
    '- 30/09 (quarta): 13 esperadas, 13 feitas',
    '- 01/10 (quinta, até agora): 2 esperadas, 2 feitas',
    'Total: 41 esperadas, 40 feitas.',
    '',
    'Última comparação da noite (30/09): zero diferença.',
  ].join('\n'))
})

test('com o Kaizen vazio, cada parte diz que não há nada, sem inventar número', async () => {
  const texto = await conferenciaDoDono(banco.cliente, [], Date.parse('2026-09-28T10:05:00Z'))
  assert.equal(texto, [
    'Conferência do Kaizen — 28/09 às 7h05',
    '',
    '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.',
    '- nenhuma venda desde 28/09',
    'Total: 0 vendas, R$ 0,00',
    '',
    '2. Contas a pagar pendentes, sem o crédito de troca: 0 parcelas, R$ 0,00. Onde conferir: tela de contas a pagar.',
    '',
    '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.',
    '- nenhum fechamento desde 28/09',
    '',
    '4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.',
    '- nenhum produto pedido; para ver o saldo, rode o comando com os códigos (exemplo: conferencia 60 2138)',
    '',
    '5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).',
    '- nenhuma execução agendada registrada ainda',
    '',
    'Última comparação da noite: nenhuma leitura da noite registrada ainda.',
  ].join('\n'))
})

test('a última comparação da noite lista as diferenças, e diz quando a noite falhou', async () => {
  const ultimaParte = async (): Promise<string> => {
    const texto = await conferenciaDoDono(banco.cliente, [], Date.parse('2026-10-02T12:00:00Z'))
    return texto.split('\n\n').at(-1) ?? ''
  }
  await execucao('2026-09-30', 22, 'aviso', {
    avisos: [
      { tipo: 'estoque_diverge', chave: 'estoque:60:1850:2.000000', texto: 'o saldo do produto 60 no ERP (2.000000) não bate com os movimentos (3.000000)' },
      { tipo: 'total_diferente', chave: 'total:2026-09-29:itens:valor:165.00:145.00', texto: 'em 29/09, itens:valor: ERP 165.00, Kaizen 145.00' },
      { tipo: 'total_diferente', chave: 'total:2026-09-29:pagamentos:valor:165.00:145.00', texto: 'em 29/09, pagamentos:valor: ERP 165.00, Kaizen 145.00' },
    ],
  })
  assert.equal(await ultimaParte(), [
    'Última comparação da noite (30/09): 2 diferenças:',
    '- em 29/09, itens:valor: ERP 165.00, Kaizen 145.00',
    '- em 29/09, pagamentos:valor: ERP 165.00, Kaizen 145.00',
  ].join('\n'))

  await execucao('2026-10-01', 22, 'falha', { mensagem: 'o ERP não respondeu' })
  await execucao('2026-10-01', 22, 'pulada')
  assert.equal(await ultimaParte(), 'Última comparação da noite (01/10): a leitura da noite falhou (o ERP não respondeu); a comparação não terminou.')
})

test('o comando "conferencia 60 5278" lê o banco da KAIZEN_URL, imprime a conferência e sai com 0', async (t) => {
  await banco.cliente.query(
    `insert into kaizen.estoque_atual (fonte, produto, quantidade, lido_em) values ('meuerp', '60', 3.000000, '2026-10-01 09:00:04-03')`,
  )
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  garantirLocal(banco.url)
  // MEUERP_TOKEN é exigido pela configuração, mas a conferência não fala com o ERP.
  const codigo = await principal(['conferencia', '60', '5278'], { MEUERP_TOKEN: 'nao-usado', KAIZEN_URL: banco.url })
  assert.equal(codigo, 0)
  assert.equal(impressos.length, 1)
  assert.match(impressos[0], /^Conferência do Kaizen — \d{2}\/\d{2} às \d{1,2}h\d{2}\n/)
  assert.ok(impressos[0].includes('\n- produto 60: 3 (lido em 01/10 às 09h00)\n- produto 5278: não está na foto do estoque do ERP\n'), impressos[0])
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/conferencia-dono.test.mts`

Expected: FAIL, porque o módulo ainda não existe:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\tradutor\conferencia-dono.mts' imported from ...\tradutor\conferencia-dono.test.mts
ℹ tests 1
ℹ fail 1
```

- [ ] **Passo 3: Criar `sql/kaizen/conferencia-dono.sql`**

```sql
-- Números do Kaizen para o dono conferir com o ERP, só do ERP novo. $1 = códigos dos produtos pedidos (text[]);
-- $2 = primeiro dia das execuções mostradas (date, em Fortaleza). A sessão está em America/Fortaleza (conectar).
with venda_154 as (
  -- regra do relatório 154: documento emitido, de saída, que recebe; só os itens com vendedor; dia da criação
  select d.id, d.criado_em::date as dia, i.valor_liquido
  from kaizen.documento_negocio d
  join kaizen.documento_item i on i.documento_id = d.id
  where d.fonte = 'meuerp' and d.situacao = 'emitido' and d.movimento = 'saida' and d.financeiro = 'recebe'
    and i.vendedor is not null and d.criado_em >= '2026-09-28'
),
fechamento as (
  select d.id, d.codigo, d.criado_em, d.turno_caixa, d.turno_usuario, d.turno_numero, cf.formas, cf.quebra
  from kaizen.documento_negocio d
  cross join lateral (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'forma', coalesce(tf.valor, c.forma),
        'calculado', coalesce(c.calculado, 0)::text,
        'informado', coalesce(c.informado, 0)::text,
        'quebra', (coalesce(c.informado, 0) - coalesce(c.calculado, 0))::text
      ) order by c.forma collate "C"), '[]'::jsonb) as formas,
      coalesce(sum(coalesce(c.informado, 0) - coalesce(c.calculado, 0)), 0)::text as quebra
    from kaizen.conferencia_caixa c
    left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'forma' and tf.codigo = c.forma
    -- a linha da forma troca é o crédito de troca, não dinheiro na gaveta: fica fora da quebra
    where c.documento_id = d.id and tf.valor is distinct from 'troca'
  ) cf
  where d.fonte = 'meuerp' and d.tipo = 'fechamento_caixa' and d.criado_em >= '2026-09-28'
)
select
  (select jsonb_build_object(
     'dias', coalesce((
       select jsonb_agg(jsonb_build_object('dia', to_char(x.dia, 'YYYY-MM-DD'), 'vendas', x.vendas, 'total', x.total) order by x.dia)
       from (select v.dia, count(distinct v.id) as vendas, coalesce(sum(v.valor_liquido), 0)::text as total
             from venda_154 v group by v.dia) x
     ), '[]'::jsonb),
     'vendas', (select count(distinct v.id) from venda_154 v),
     'total', (select coalesce(sum(v.valor_liquido), 0)::text from venda_154 v)
   )) as vendas,
  (select jsonb_build_object('parcelas', count(*), 'total', coalesce(sum(p.valor), 0)::text)
   from kaizen.parcela p
   join kaizen.documento_negocio d on d.id = p.documento_id
   join kaizen.traducao tp on tp.fonte = d.fonte and tp.campo = 'status_parcela' and tp.codigo = p.status
   -- o crédito de troca (modelo TM, e o TR se aparecer) não é conta: fica fora
   where d.fonte = 'meuerp' and d.financeiro = 'paga' and tp.valor = 'pendente'
     and d.tipo is distinct from 'troca' and d.modelo <> 'TR') as contas,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'codigo', f.codigo, 'quando', to_char(f.criado_em, 'DD/MM "às" HH24"h"MI'),
     'caixa', f.turno_caixa, 'usuario', f.turno_usuario, 'abertura', f.turno_numero,
     'formas', f.formas, 'quebra', f.quebra
   ) order by f.criado_em, f.id), '[]'::jsonb)
   from fechamento f) as fechamentos,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'produto', q.produto, 'descricao', pr.descricao,
     'quantidade', trim_scale(e.quantidade)::text,
     'tem_foto', e.produto is not null,
     'lido', to_char(e.lido_em, 'DD/MM "às" HH24"h"MI')
   ) order by q.ordem), '[]'::jsonb)
   from unnest($1::text[]) with ordinality as q (produto, ordem)
   left join kaizen.estoque_atual e on e.fonte = 'meuerp' and e.produto = q.produto
   left join kaizen.produto pr on pr.fonte = 'meuerp' and pr.codigo = q.produto) as produtos,
  -- antes da primeira execução agendada, nenhum horário é cobrado (spec 6.6)
  (select jsonb_build_object(
     'primeira', (select to_char(min(p.inicio), 'YYYY-MM-DD HH24') from kaizen.execucao p where not p.manual),
     'linhas', coalesce((
       select jsonb_agg(jsonb_build_object(
         'dia', to_char(x.inicio, 'YYYY-MM-DD'), 'hora', extract(hour from x.inicio)::int, 'resultado', x.resultado
       ) order by x.id)
       from kaizen.execucao x
       where not x.manual and x.inicio >= $2::date
     ), '[]'::jsonb)
   )) as execucoes,
  (select jsonb_build_object(
     'dia', to_char(n.inicio, 'YYYY-MM-DD'), 'resultado', n.resultado, 'mensagem', n.mensagem,
     'diferencas', coalesce((
       select jsonb_agg(a.aviso->>'texto' order by a.ordem)
       from jsonb_array_elements(n.avisos) with ordinality as a (aviso, ordem)
       where a.aviso->>'tipo' = 'total_diferente'
     ), '[]'::jsonb))
   from kaizen.execucao n
   where n.tipo = 'noite' and n.resultado in ('ok', 'aviso', 'falha')
   order by n.id desc
   limit 1) as noite
```

- [ ] **Passo 4: Criar `tradutor/conferencia-dono.mts`**

```ts
import { readFileSync } from 'node:fs'
import { conectar } from './banco.mts'
import type { Cliente } from './banco.mts'
import { diaMes, formatarReais } from './avisos.mts'
import { HORA_DA_NOITE, HORAS_DA_HORA } from './constantes.mts'
import { emFortaleza, horarioEsperado, somarDias } from './janela.mts'

type Dados = {
  vendas: { dias: Array<{ dia: string; vendas: number; total: string }>; vendas: number; total: string }
  contas: { parcelas: number; total: string }
  fechamentos: Array<{
    codigo: string; quando: string; caixa: number | null; usuario: number | null; abertura: number | null
    formas: Array<{ forma: string; calculado: string; informado: string; quebra: string }>; quebra: string
  }>
  produtos: Array<{ produto: string; descricao: string | null; quantidade: string | null; tem_foto: boolean; lido: string | null }>
  execucoes: { primeira: string | null; linhas: Array<{ dia: string; hora: number; resultado: string | null }> }
  noite: { dia: string; resultado: string; mensagem: string | null; diferencas: string[] } | null
}

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`
}

// '54660.5' → '54.660,5'; '-1' → '−1'. O texto vem do Postgres (trim_scale), sem passar por number.
function formatarQuantidade(texto: string): string {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(texto)
  if (!partes) return texto
  const inteira = partes[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${partes[1] ? '−' : ''}${inteira}${partes[3] ? `,${partes[3]}` : ''}`
}

function textoExecucoes(execucoes: Dados['execucoes'], agoraMs: number): string[] {
  const primeira = execucoes.primeira
  if (primeira === null) return ['- nenhuma execução agendada registrada ainda']
  const agora = emFortaleza(agoraMs)
  const linhas: string[] = []
  let esperadasTotal = 0
  let feitasTotal = 0
  for (let k = 6; k >= 0; k--) {
    const dia = somarDias(agora.data, -k)
    const hoje = dia === agora.data
    const diaSemana = new Date(`${dia}T12:00:00Z`).getUTCDay()
    const rotulo = `${diaMes(dia)} (${DIAS_DA_SEMANA[diaSemana]}${hoje ? ', até agora' : ''})`
    // antes da primeira execução agendada, nenhum horário é cobrado ('AAAA-MM-DD HH' comparado como texto)
    const esperadas = [...HORAS_DA_HORA, HORA_DA_NOITE].filter(
      (hora) => horarioEsperado({ data: dia, hora, minuto: 0, diaSemana }) && (!hoje || hora <= agora.hora)
        && `${dia} ${String(hora).padStart(2, '0')}` >= primeira,
    )
    if (esperadas.length === 0) {
      linhas.push(`- ${rotulo}: nenhuma esperada`)
      continue
    }
    const faltaram: string[] = []
    const comFalha: string[] = []
    for (const hora of esperadas) {
      const daHora = execucoes.linhas.filter((e) => e.dia === dia && e.hora === hora)
      if (daHora.length === 0) faltaram.push(`${hora}h`)
      else if (daHora.some((e) => e.resultado === 'falha') && !daHora.some((e) => e.resultado === 'ok' || e.resultado === 'aviso')) comFalha.push(`${hora}h`)
    }
    const feitas = esperadas.length - faltaram.length
    esperadasTotal += esperadas.length
    feitasTotal += feitas
    let linha = `- ${rotulo}: ${plural(esperadas.length, 'esperada', 'esperadas')}, ${plural(feitas, 'feita', 'feitas')}`
    if (comFalha.length) linha += `, ${comFalha.length} com falha (${comFalha.join(', ')})`
    if (faltaram.length) linha += `; faltaram: ${faltaram.join(', ')}`
    linhas.push(linha)
  }
  linhas.push(`Total: ${plural(esperadasTotal, 'esperada', 'esperadas')}, ${plural(feitasTotal, 'feita', 'feitas')}.`)
  return linhas
}

function textoNoite(noite: Dados['noite']): string[] {
  if (noite === null) return ['Última comparação da noite: nenhuma leitura da noite registrada ainda.']
  const quando = `Última comparação da noite (${diaMes(noite.dia)})`
  if (noite.resultado === 'falha') return [`${quando}: a leitura da noite falhou (${noite.mensagem ?? 'sem mensagem'}); a comparação não terminou.`]
  if (noite.diferencas.length === 0) return [`${quando}: zero diferença.`]
  return [`${quando}: ${plural(noite.diferencas.length, 'diferença', 'diferenças')}:`, ...noite.diferencas.map((d) => `- ${d}`)]
}

export async function conferenciaDoDono(cliente: Cliente, produtos: string[], agoraMs: number): Promise<string> {
  const agora = emFortaleza(agoraMs)
  const sql = readFileSync(new URL('../sql/kaizen/conferencia-dono.sql', import.meta.url), 'utf8')
  const d = (await cliente.query<Dados>(sql, [produtos, somarDias(agora.data, -6)])).rows[0]
  const t: string[] = [`Conferência do Kaizen — ${diaMes(agora.data)} às ${agora.hora}h${String(agora.minuto).padStart(2, '0')}`]

  t.push('', '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.')
  if (d.vendas.dias.length === 0) t.push('- nenhuma venda desde 28/09')
  for (const v of d.vendas.dias) t.push(`- ${diaMes(v.dia)}: ${plural(v.vendas, 'venda', 'vendas')}, ${formatarReais(v.total)}`)
  t.push(`Total: ${plural(d.vendas.vendas, 'venda', 'vendas')}, ${formatarReais(d.vendas.total)}`)

  t.push('', `2. Contas a pagar pendentes, sem o crédito de troca: ${plural(d.contas.parcelas, 'parcela', 'parcelas')}, ${formatarReais(d.contas.total)}. Onde conferir: tela de contas a pagar.`)

  t.push('', '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.')
  if (d.fechamentos.length === 0) t.push('- nenhum fechamento desde 28/09')
  for (const f of d.fechamentos) {
    t.push(`- fechamento ${f.codigo}, ${f.quando} (caixa ${f.caixa ?? '?'}, usuário ${f.usuario ?? '?'}, abertura ${f.abertura ?? '?'}): quebra ${formatarReais(f.quebra)}`)
    for (const forma of f.formas) {
      t.push(`  ${forma.forma}: calculado ${formatarReais(forma.calculado)}, informado ${formatarReais(forma.informado)}, quebra ${formatarReais(forma.quebra)}`)
    }
  }

  t.push('', '4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.')
  if (d.produtos.length === 0) t.push('- nenhum produto pedido; para ver o saldo, rode o comando com os códigos (exemplo: conferencia 60 2138)')
  for (const p of d.produtos) {
    const nome = p.descricao ? `produto ${p.produto} (${p.descricao})` : `produto ${p.produto}`
    if (!p.tem_foto) t.push(`- ${nome}: não está na foto do estoque do ERP`)
    else t.push(`- ${nome}: ${p.quantidade === null ? 'sem quantidade' : formatarQuantidade(p.quantidade)} (lido em ${p.lido})`)
  }

  t.push('', '5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).')
  t.push(...textoExecucoes(d.execucoes, agoraMs))
  t.push('', ...textoNoite(d.noite))
  return t.join('\n')
}

// Usado pelo comando `conferencia` de principal.mts: conecta, monta o texto e fecha a conexão.
export async function rodarConferencia(kaizenUrl: string, produtos: string[], agoraMs: number): Promise<string> {
  const cliente = await conectar(kaizenUrl)
  try {
    return await conferenciaDoDono(cliente, produtos, agoraMs)
  } finally {
    await cliente.end()
  }
}
```

- [ ] **Passo 5: Rodar e ver três passarem e o do comando falhar**

Run: `node --test tradutor/conferencia-dono.test.mts`

Expected: `ℹ pass 3`, `ℹ fail 1`. O que falha é `o comando "conferencia 60 5278" ...`, com `actual: 2` e `expected: 0`: o `principal.mts` ainda não conhece o comando, imprime o uso e sai com 2.

- [ ] **Passo 6: Acrescentar o comando `conferencia` em `tradutor/principal.mts`**

São três trechos; o resto do arquivo não muda.

1. Logo depois da primeira linha do arquivo, `import { conectar } from './banco.mts'`, acrescente:

```ts
import { rodarConferencia } from './conferencia-dono.mts'
```

2. Troque a linha da constante `USO`:

```ts
const USO = 'uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram'
```

por:

```ts
const USO = 'uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...]'
```

3. Dentro de `principal`, logo antes da linha `  const manual = resto.length === 1 && resto[0] === '--manual'` (depois do bloco `if (comando === 'teste-telegram' ...) { ... }`), acrescente:

```ts
  if (comando === 'conferencia') {
    // Só lê o banco do Kaizen: os argumentos que vierem depois são os códigos dos produtos para o saldo.
    const config = lerConfig(env)
    console.log(await rodarConferencia(config.kaizenUrl, resto, Date.now()))
    return 0
  }
```

Confira: `grep -n "conferencia" tradutor/principal.mts` mostra 3 linhas: o `import`, o `USO` e o `if`.

- [ ] **Passo 7: Rodar e ver passar**

Run: `node --test tradutor/conferencia-dono.test.mts tradutor/principal.test.mts`

Expected: PASS, 10 testes (os 4 desta tarefa e os 6 do comando, da tarefa 13, que continuam passando):
```
✔ mostra ao dono, em palavras, as vendas pela regra do 154, o a pagar, as quebras, os saldos e as execuções
✔ com o Kaizen vazio, cada parte diz que não há nada, sem inventar número
✔ a última comparação da noite lista as diferenças, e diz quando a noite falhou
✔ o comando "conferencia 60 5278" lê o banco da KAIZEN_URL, imprime a conferência e sai com 0
...
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

Rode também com a máquina em outro fuso (Git Bash):

Run: `TZ=Asia/Tokyo node --test tradutor/conferencia-dono.test.mts`

Expected: PASS, `ℹ pass 4`, `ℹ fail 0`: os dias e as horas saem em Fortaleza, qualquer que seja o fuso da máquina.

- [ ] **Passo 8: Conferir o comando de ponta a ponta, num banco descartável**

O ERP aponta para um endereço que recusa conexão (`127.0.0.1:9`): a leitura falha, mas cria as tabelas (migrações) e registra a falha. Depois, a conferência lê esse banco. Git Bash, na raiz do repositório:

Run:
```bash
docker compose exec -T postgres psql -U postgres -d postgres -c "create database kaizen_conferencia"
docker compose exec -T postgres psql -U postgres -d kaizen_conferencia -c "create schema kaizen authorization kaizen"
env -u TELEGRAM_TOKEN -u TELEGRAM_CHAT MEUERP_TOKEN=nenhum MEUERP_URL=http://127.0.0.1:9/publica \
  KAIZEN_URL=postgres://kaizen:kaizen-local@localhost:5434/kaizen_conferencia node tradutor/principal.mts hora --manual; echo "saída: $?"
env -u TELEGRAM_TOKEN -u TELEGRAM_CHAT MEUERP_TOKEN=nenhum \
  KAIZEN_URL=postgres://kaizen:kaizen-local@localhost:5434/kaizen_conferencia node tradutor/principal.mts conferencia 60; echo "saída: $?"
docker compose exec -T postgres psql -U postgres -d postgres -c "drop database kaizen_conferencia with (force)"
```
Expected (a data e as horas são as do seu relógio; fora do horário da loja, a primeira linha termina em `ele tenta de novo em DD/MM às 8h.`):
```
CREATE DATABASE
CREATE SCHEMA
Kaizen: a leitura das 15h falhou — o ERP não respondeu. Nada a fazer: ele tenta de novo às 16h.
hora falha: sem contagens — o ERP não respondeu: fetch failed
saída: 1
Conferência do Kaizen — 27/09 às 15h57

1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.
- nenhuma venda desde 28/09
Total: 0 vendas, R$ 0,00

2. Contas a pagar pendentes, sem o crédito de troca: 0 parcelas, R$ 0,00. Onde conferir: tela de contas a pagar.

3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.
- nenhum fechamento desde 28/09

4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.
- produto 60: não está na foto do estoque do ERP

5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).
- nenhuma execução agendada registrada ainda

Última comparação da noite: nenhuma leitura da noite registrada ainda.
saída: 0
DROP DATABASE
```
(A leitura manual não conta como execução agendada, por isso a parte 5 ainda não cobra nada.)

- [ ] **Passo 9: Atualizar `testes-esperados.txt` (N = 4, todos em `conferencia-dono.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+4;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 4.

- [ ] **Passo 10: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 11: Commit**

```bash
git add sql/kaizen/conferencia-dono.sql tradutor/conferencia-dono.mts tradutor/conferencia-dono.test.mts tradutor/principal.mts testes-esperados.txt
git commit -F - <<'EOF'
Comando de conferência do dono: os números do Kaizen e onde conferir

"node tradutor/principal.mts conferencia 60 2138 ..." imprime, em
palavras, o que o Kaizen copiou do ERP e onde conferir cada número:
as vendas de cada dia desde 28/09 pela regra do relatório 154 (4
vendas, R$ 386,00 no exemplo do teste), as contas a pagar pendentes sem
o crédito de troca (2 parcelas, R$ 1.745,50), a quebra de cada
fechamento forma por forma sem a troca (fechamento 114: -R$ 2,00), o
saldo de cada produto pedido, as leituras esperadas e feitas nos
últimos 7 dias (29/09: 13 esperadas, 12 feitas, 1 com falha; faltou a
das 15h) e o resultado da última comparação da noite.

O roteiro de publicação na VPS, que vem no próximo commit, manda o
dono rodar este comando lá. 4 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 17: Publicação na VPS

**O que esta tarefa entrega, em resultado:** tudo o que o dono precisa para pôr o tradutor na VPS, e um roteiro em português que ele segue comando por comando:
- **a imagem** (`publicacao/Dockerfile`): Node 24.18.0 com a tag exata, fuso de Fortaleza e o agendador do Alpine (`crond`) em primeiro plano;
- **o horário** (`publicacao/crontab`): a leitura da hora às 8h, 9h, ..., 19h e a da noite às 22h, de segunda a sábado, com a saída indo para o log do serviço;
- **a stack `kaizen`** (`publicacao/stack.yml`): um serviço, `tradutor`, ligado à rede do Postgres da stack `prumo`, com o segredo montado sempre no mesmo lugar (o nome do segredo vem de uma variável, para poder trocá-lo) e o log limitado a 3 arquivos de 10 MB;
- **o roteiro do dono** (`publicacao/README.md`), em 15 passos: espaço em disco; parar o sync do Prumo e guardar a cópia da Link fora da VPS; chave de implantação; código; usuário e esquema no banco; segredo; imagem e stack; mensagem de teste; leitura manual; atualizar; voltar atrás; trocar o segredo; ver o log; conferência do dono; consulta ao banco.

Um teste lê os arquivos como texto e confere:
- o crontab em LF, com os horários iguais aos que o tradutor cobra como "faltou";
- a tag exata do Node;
- a rede externa, o segredo e o limite de log;
- que toda publicação do roteiro usa `--resolve-image never`.

A imagem também é construída e testada no Docker local: o `crond` roda um comando, lê o segredo e a saída chega ao log. E o git passa a guardar e entregar os quatro arquivos de `publicacao/` sempre em LF, nesta máquina (que converte para CRLF por padrão) e na VPS. São 4 testes novos, num commit.

**Antes de começar:** rode tudo a partir de `C:\Projetos\KAIZEN`, com o Docker Desktop no ar. As tarefas 1 a 16 precisam estar feitas (o passo 13 do roteiro usa o comando `conferencia`, da tarefa 16). Quem implementa **não** tem acesso à VPS e não roda nenhum comando do roteiro (spec 7.1): quem implanta é o dono. Crie `publicacao/README.md` e `tradutor/publicacao.test.mts` com a ferramenta de escrita de arquivos, nunca por `cat`/heredoc no Bash: os dois citam o comando que remove uma stack, e o gancho `.claude/hooks/guarda-bash.js` do dono recusa qualquer comando Bash que contenha esse texto. Nesta tarefa, o Docker local só constrói e roda a imagem (`docker build`, `docker run`, `docker compose config`). Commits no Git Bash.

**Atenção ao gancho do Bash:** o gancho `.claude/hooks/guarda-bash.js` recusa **qualquer** comando Bash cujo texto contenha `docker stack rm` (ou `docker service rm`), mesmo dentro de um heredoc, de um `cat > arquivo` ou de um `grep`. O `publicacao/README.md` e o `tradutor/publicacao.test.mts` têm esse texto (o roteiro proíbe o comando, e o teste confere a proibição). Crie e altere esses dois arquivos só com a ferramenta de escrita (Write/Edit), e confira o conteúdo deles com o teste (`node --test tradutor/publicacao.test.mts`), nunca com um comando Bash que repita esse texto.

**Arquivos:**
- Criar: `publicacao/crontab`
- Criar: `publicacao/Dockerfile`
- Criar: `publicacao/stack.yml`
- Criar: `publicacao/README.md`
- Testar: `tradutor/publicacao.test.mts`
- Modificar: `.gitattributes` (acrescenta a linha `publicacao/* text eol=lf`, passo 11)
- Modificar: `testes-esperados.txt` (soma 4)

**Interfaces:**
- Consome:
  - `.gitattributes` (tarefa 1), com as linhas `publicacao/crontab text eol=lf`, `.githooks/* text eol=lf`, `*.sh text eol=lf`, `*.mts text eol=lf` e `*.sql text eol=lf`. Ele só garante LF no crontab: nesta máquina o git está com `core.autocrlf=true` (em `C:/Program Files/Git/etc/gitconfig`), e o `stack.yml`, o `Dockerfile` e o `README.md` voltariam em CRLF a cada checkout, merge, stash ou clone, quebrando o teste desta tarefa (e, com ele, o hook de commit). O passo 11 acrescenta `publicacao/* text eol=lf`;
  - `sql/criar-usuario-e-esquema.sql` (tarefa 1), rodado pelo dono no passo 4 com `-v senha=...`;
  - `package.json` e `package-lock.json` (tarefa 1): a imagem instala só `pg` (`npm ci --omit=dev`);
  - `tradutor/constantes.mts` (tarefa 10):
    ```ts
    export const HORAS_DA_HORA = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    export const HORA_DA_NOITE = 22
    ```
  - `tradutor/principal.mts` (tarefa 13, com o comando da tarefa 16): `node tradutor/principal.mts hora|noite [--manual]` imprime uma linha `${tipo} ${resultado}: ${contagens}`; `teste-telegram` imprime `teste-telegram: o Telegram aceitou a mensagem`; `conferencia [produto ...]` (tarefa 16) imprime a conferência do dono, que o passo 13 do roteiro usa; sem argumento, imprime `uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...]` e sai com 2;
  - `tradutor/conferencia-dono.mts` e `sql/kaizen/conferencia-dono.sql` (tarefa 16): entram na imagem junto com o resto de `tradutor/` e `sql/`;
  - `tradutor/config.mts` (tarefa 13): o tradutor lê `MEUERP_TOKEN`, `KAIZEN_URL`, `TELEGRAM_TOKEN` e `TELEGRAM_CHAT` do ambiente. Na VPS, eles vêm do segredo, por `node --env-file=/run/secrets/kaizen_env`.
- Produz (as tarefas 19 e 20 usam estes nomes):
  - stack `kaizen`, serviço `kaizen_tradutor`, imagem `kaizen-tradutor:<SHA curto do commit>`, construída na VPS e publicada com `KAIZEN_SHA=<sha> docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen`;
  - segredo `kaizen_env_v1` (nome trocável por `KAIZEN_SEGREDO`), montado em `/run/secrets/kaizen_env`, com as linhas `MEUERP_TOKEN=`, `KAIZEN_URL=postgres://kaizen:<senha>@postgres:5432/prumo`, `TELEGRAM_TOKEN=` e `TELEGRAM_CHAT=`;
  - código em `/kaizen` dentro da imagem; clone do repositório em `/opt/kaizen` na VPS;
  - roteiro com os passos `## 0.` a `## 14.`: 7 é a mensagem de teste, 8 a leitura manual e a consulta a `kaizen.execucao`, 9 atualizar, 10 voltar atrás, 11 trocar o segredo, 12 ver o log, 13 a conferência do dono, 14 a consulta ao banco que o Claude pedir (tarefa 19).

**Por que é assim (para não "consertar" sem querer):**
- `node:24.18.0-alpine`, com a tag exata: o Node 24.0 e o 24.1 não têm `import.meta.main`, e sem ele o `principal.mts` não roda.
- O `crond` do Alpine (BusyBox) roda cada linha do crontab com o ambiente dele. Sem `MAILTO`, a saída do comando vai para a saída do próprio `crond`, que é o processo principal do contêiner: aparece em `docker service logs`. Com `MAILTO`, ele tentaria mandar e-mail e a saída se perderia.
- O crontab precisa terminar em LF: com CRLF, o `crond` lê `hora\r` como argumento, e o `principal.mts` recusa o comando.
- `publicacao/* text eol=lf` no `.gitattributes`: nesta máquina, o `core.autocrlf=true` troca LF por CRLF em todo arquivo que o git entrega e que não tem regra própria. O teste confere trechos do `stack.yml` e do roteiro que terminam em `\n`, e o hook de commit roda o teste: com um desses arquivos em CRLF, nenhum commit passa. A linha vale para os quatro arquivos da pasta, também na VPS.
- `TZ=America/Fortaleza` e `tzdata`: o `crond` agenda pela hora local do contêiner. O tradutor em si não depende do fuso da máquina (tarefas 1 e 10), mas o agendamento depende.
- `version: "3.8"` fica no `stack.yml`: o `docker stack deploy` usa esse formato. O `docker compose config` avisa que o atributo é obsoleto; o aviso é esperado.
- `${KAIZEN_SHA:?defina KAIZEN_SHA}`: sem a variável, a publicação para com essa mensagem, em vez de publicar uma imagem sem tag. `--resolve-image never`: a imagem só existe na VPS (não há registro de imagens), e o Docker não deve procurá-la fora.
- O segredo tem nome fixo dentro do contêiner (`target: kaizen_env`) e nome variável fora (`${KAIZEN_SEGREDO:-kaizen_env_v1}`): trocar o segredo é criar `kaizen_env_v2` e publicar com `KAIZEN_SEGREDO=kaizen_env_v2`, sem mexer no crontab.
- O roteiro lê o segredo e a imagem em uso com `docker service inspect` antes de atualizar ou voltar atrás. Assim, depois de uma troca de segredo, uma atualização não volta, sem querer, para o `kaizen_env_v1` apagado.
- Os tokens entram por `read -rs`: não aparecem na tela, não vão para arquivo e não ficam no histórico do shell. A senha do banco sai de `openssl rand -base64 24` sem `/`, `+` e `=`, que quebrariam o endereço `postgres://kaizen:<senha>@...`.

- [ ] **Passo 1: Escrever o teste que falha**

Crie este arquivo com a ferramenta de escrita (Write/Edit), não por heredoc no Bash: o texto contém `docker stack rm`, que o `.claude/hooks/guarda-bash.js` bloqueia em qualquer comando Bash.

Criar `tradutor/publicacao.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { HORA_DA_NOITE, HORAS_DA_HORA } from './constantes.mts'

function ler(caminho: string): string {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')
}

const COMANDO = 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts'

test('crontab: duas linhas em LF, nos horários que o tradutor espera, sem MAILTO', () => {
  const crontab = ler('publicacao/crontab')
  assert.ok(!crontab.includes('\r'), 'o crontab tem CR: o crond do Alpine não lê CRLF')
  assert.ok(!/MAILTO/i.test(crontab), 'sem MAILTO: a saída vai para o log do serviço')
  // Os horários do crontab e os que o tradutor cobra como "faltou" (janela.mts) têm de ser os mesmos.
  const primeira = HORAS_DA_HORA[0]
  const ultima = HORAS_DA_HORA[HORAS_DA_HORA.length - 1]
  assert.deepEqual(HORAS_DA_HORA, Array.from({ length: ultima - primeira + 1 }, (_, i) => primeira + i))
  assert.equal(crontab, [
    `0 ${primeira}-${ultima} * * 1-6 ${COMANDO} hora`,
    `0 ${HORA_DA_NOITE} * * 1-6 ${COMANDO} noite`,
    '',
  ].join('\n'))
  assert.ok(existsSync(new URL('./principal.mts', import.meta.url)), 'o crontab chama tradutor/principal.mts')
})

test('Dockerfile: Node 24.18.0 alpine, fuso de Fortaleza, só dependências de produção e crond em primeiro plano', () => {
  const linhas = ler('publicacao/Dockerfile').split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'))
  assert.deepEqual(linhas, [
    'FROM node:24.18.0-alpine',
    'RUN apk add --no-cache tzdata',
    'ENV TZ=America/Fortaleza',
    'WORKDIR /kaizen',
    'COPY package.json package-lock.json ./',
    'RUN npm ci --omit=dev',
    'COPY tradutor/ tradutor/',
    'COPY sql/ sql/',
    'COPY publicacao/crontab /etc/crontabs/root',
    'CMD ["crond", "-f", "-d", "8"]',
  ])
})

test('stack.yml: imagem pela tag do commit, segredo com nome fixo lido de variável, rede externa do Prumo e limite de log', () => {
  const stack = ler('publicacao/stack.yml')
  const trecho = (texto: string) => assert.ok(stack.includes(texto), `o stack.yml devia ter:\n${texto}`)
  trecho('    image: kaizen-tradutor:${KAIZEN_SHA:?defina KAIZEN_SHA}\n')
  trecho('    environment:\n      TZ: America/Fortaleza\n')
  trecho('    secrets:\n      - source: kaizen_env\n        target: kaizen_env\n')
  trecho('    networks:\n      - prumo_default\n')
  trecho('    logging:\n      driver: json-file\n      options:\n        max-size: "10m"\n        max-file: "3"\n')
  trecho('    deploy:\n      replicas: 1\n      restart_policy:\n')
  trecho('networks:\n  prumo_default:\n    external: true\n')
  trecho('secrets:\n  kaizen_env:\n    external: true\n    name: ${KAIZEN_SEGREDO:-kaizen_env_v1}\n')
  // A stack kaizen nunca declara o Postgres nem outro serviço da stack prumo.
  assert.deepEqual([...stack.matchAll(/^ {2}(\w+):$/gm)].map((m) => m[1]), ['tradutor', 'prumo_default', 'kaizen_env'])
})

test('roteiro do dono: os 15 passos na ordem, a publicação sempre com --resolve-image never e o Prumo nunca removido', () => {
  const roteiro = ler('publicacao/README.md')
  const passos = [...roteiro.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]))
  assert.deepEqual(passos, Array.from({ length: 15 }, (_, i) => i))
  const publicacoes = roteiro.split('\n').filter((l) => l.includes('docker stack deploy'))
  assert.ok(publicacoes.length >= 4, 'o roteiro publica no passo 6 e ao atualizar, voltar atrás e trocar o segredo')
  for (const linha of publicacoes) {
    assert.match(linha, /docker stack deploy -c publicacao\/stack\.yml --resolve-image never kaizen$/, linha)
  }
  assert.ok(!/^docker stack rm/m.test(roteiro), 'nenhum comando do roteiro remove uma stack')
  assert.ok(roteiro.includes('docker service scale prumo_sync=0'))
  assert.ok(roteiro.includes('psql -U prumo -d prumo -v ON_ERROR_STOP=1 -v senha="$SENHA" < sql/criar-usuario-e-esquema.sql'))
  assert.ok(roteiro.includes('docker secret create kaizen_env_v1 -'))
  assert.ok(roteiro.includes('tradutor/principal.mts teste-telegram'))
  assert.ok(roteiro.includes('tradutor/principal.mts hora --manual'))
  assert.ok(roteiro.includes('tradutor/principal.mts conferencia'))
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test tradutor/publicacao.test.mts`

Expected: FAIL nos 4, porque a pasta `publicacao/` ainda não existe:
```
Error: ENOENT: no such file or directory, open '...\publicacao\crontab'
Error: ENOENT: no such file or directory, open '...\publicacao\Dockerfile'
ℹ tests 4
ℹ pass 0
ℹ fail 4
```

- [ ] **Passo 3: Criar `publicacao/crontab`**

Exatamente estas duas linhas, cada uma terminando em LF (a segunda também):

```text
0 8-19 * * 1-6 cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts hora
0 22 * * 1-6 cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts noite
```

- [ ] **Passo 4: Criar `publicacao/Dockerfile`**

```dockerfile
# Imagem do tradutor do Kaizen: Node com a tag exata (import.meta.main só existe a partir do 24.2),
# fuso de Fortaleza e o crond do Alpine em primeiro plano. O TypeScript roda direto no Node, sem compilação.
FROM node:24.18.0-alpine
RUN apk add --no-cache tzdata
ENV TZ=America/Fortaleza
WORKDIR /kaizen
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY tradutor/ tradutor/
COPY sql/ sql/
COPY publicacao/crontab /etc/crontabs/root
# Sem MAILTO no crontab, a saída de cada execução vai para o log do serviço (docker service logs).
CMD ["crond", "-f", "-d", "8"]
```

- [ ] **Passo 5: Criar `publicacao/stack.yml`**

```yaml
# Stack kaizen: só o tradutor, ligado à rede da stack prumo para alcançar o Postgres (postgres:5432).
# Publicar sempre com: KAIZEN_SHA=<commit> docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
version: "3.8"

services:
  tradutor:
    image: kaizen-tradutor:${KAIZEN_SHA:?defina KAIZEN_SHA}
    environment:
      TZ: America/Fortaleza
    secrets:
      - source: kaizen_env
        target: kaizen_env
    networks:
      - prumo_default
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 10s

networks:
  prumo_default:
    external: true

secrets:
  kaizen_env:
    external: true
    name: ${KAIZEN_SEGREDO:-kaizen_env_v1}
```

- [ ] **Passo 6: Criar `publicacao/README.md` (o roteiro do dono)**

Crie este arquivo com a ferramenta de escrita (Write/Edit), não por heredoc no Bash: o texto contém `docker stack rm`, que o `.claude/hooks/guarda-bash.js` bloqueia em qualquer comando Bash.

O arquivo inteiro está entre as duas linhas de quatro crases abaixo (ele tem blocos de código dentro; copie de `# Roteiro do dono` até a última linha, `Saída esperada: a tabela com a resposta. Cole-a na sessão com o Claude.`):

````markdown
# Roteiro do dono: o Kaizen na VPS

Este roteiro é para o dono, na VPS, como `root`. Quem implementa o Kaizen não tem acesso à VPS: ele acompanha pela sessão com o Claude, lendo o que o dono colar.

**Regras de todos os passos:**

- Rode entre **hh:10 e hh:50** (por exemplo, 14h10 a 14h50). O tradutor lê o ERP na hora cheia, das 8h às 19h, e às 22h, de segunda a sábado. Não atualize nem troque nada entre 22h e 22h50: a leitura da noite pode levar até 30 minutos.
- Rode um comando por vez e compare a saída com a "saída esperada". Se sair diferente, pare e cole a saída na sessão com o Claude.
- **Nunca** rode `docker stack rm prumo`. A stack `prumo` carrega o banco do Kaizen. Para parar o Prumo, só o passo 1 (`prumo_sync=0`). Se a stack `prumo` for reimplantada algum dia, é sempre com `PRUMO_SYNC_REPLICAS=0`.
- Nenhuma senha ou token vai para arquivo nem para o repositório. Onde o roteiro pede um token, ele é digitado (ou colado) sem aparecer na tela e sem ficar no histórico.

Primeira implantação: passos 0 a 8, nessa ordem. Depois: o 9 para atualizar, o 10 para voltar atrás, o 11 para trocar o segredo, o 12 para ver o log, o 13 para a conferência do dono e o 14 quando o Claude pedir uma consulta ao banco.

## 0. Anotar o espaço em disco

```bash
df -h
```

Saída esperada: uma tabela com os discos. Anote a linha que termina em `/` (tamanho, usado, livre). É a referência para saber, depois, quanto o Kaizen ocupa.

## 1. Parar o sync do Prumo e guardar a cópia da Link fora da VPS

Parar o sync (ele recria o esquema `erp` a cada hora; parado, a cópia final da Link fica como está):

```bash
docker service scale prumo_sync=0
docker service ls
```

Saída esperada: na linha `prumo_sync`, a coluna de réplicas mostra `0/0`.

Tirar a cópia do esquema `erp` (a história da Link, de abril a 25/09) e conferir que as 26 tabelas estão nela:

```bash
PG=$(docker ps -q -f name=prumo_postgres)
docker exec $PG pg_dump -U prumo -d prumo -Fc -n erp > /root/erp-link.dump
ls -lh /root/erp-link.dump
docker exec -i $PG pg_restore --list < /root/erp-link.dump | grep -c 'TABLE DATA erp '
```

Saída esperada: o arquivo com alguns megabytes, e o último comando imprime `26`.

Copiar o arquivo para o PC. Este comando roda **no PC**, no PowerShell (troque `<endereço da VPS>` pelo endereço que você usa no `ssh`):

```powershell
scp root@<endereço da VPS>:/root/erp-link.dump "$HOME\Documents\erp-link.dump"
Get-Item "$HOME\Documents\erp-link.dump" | Select-Object Length
```

Saída esperada: o tamanho em bytes igual ao que o `ls -l /root/erp-link.dump` mostra na VPS. Esse arquivo é a única reserva da história da Link: guarde-o também fora do PC.

## 2. Criar a chave de implantação no GitHub

Uma chave nova, só de leitura, só para o repositório do Kaizen (a do Prumo vale para outro repositório):

```bash
ssh-keygen -t ed25519 -f /root/.ssh/kaizen_deploy -N "" -C "vps-kaizen"
cat /root/.ssh/kaizen_deploy.pub
```

Saída esperada: uma linha que começa com `ssh-ed25519` e termina com `vps-kaizen`.

No GitHub, no repositório `israel5550123/KAIZEN`: **Settings → Deploy keys → Add deploy key**. Título: `VPS`. Cole a linha inteira. **Não** marque "Allow write access". Clique em "Add key".

Dizer ao `ssh` que esse endereço usa essa chave:

```bash
cat >> /root/.ssh/config <<'FIM'

Host kaizen-github
  HostName github.com
  User git
  IdentityFile /root/.ssh/kaizen_deploy
  IdentitiesOnly yes
FIM
chmod 600 /root/.ssh/config
ssh -T kaizen-github
```

Saída esperada: se perguntar `Are you sure you want to continue connecting`, digite `yes`. No fim: `Hi israel5550123/KAIZEN! You've successfully authenticated, but GitHub does not provide shell access.`

## 3. Baixar o código

```bash
git clone kaizen-github:israel5550123/KAIZEN.git /opt/kaizen
cd /opt/kaizen
git log --oneline -1
```

Saída esperada: o último commit, o mesmo que o Claude mostrou na sessão.

## 4. Criar o usuário e o esquema do Kaizen no banco

Uma senha nova, só para o usuário `kaizen` do banco. O `tr` tira os caracteres `/`, `+` e `=`, que quebrariam o endereço do banco:

```bash
SENHA=$(openssl rand -base64 24 | tr -d '/+=')
echo "$SENHA"
```

Guarde a senha no Gerenciador de Senhas, com o nome "Kaizen — banco, usuário kaizen". Não feche este terminal até o passo 5: a variável `SENHA` é usada lá.

```bash
cd /opt/kaizen
PG=$(docker ps -q -f name=prumo_postgres)
docker exec -i $PG psql -U prumo -d prumo -v ON_ERROR_STOP=1 -v senha="$SENHA" < sql/criar-usuario-e-esquema.sql
docker exec $PG psql -U prumo -d prumo -At -c "select rolname, rolsuper from pg_roles where rolname = 'kaizen'"
```

Saída esperada: `CREATE ROLE`, `ALTER ROLE`, `CREATE SCHEMA` e, no último comando, `kaizen|f` (o usuário existe e não é superusuário).

## 5. Criar o segredo com os quatro valores

Tenha à mão: o token do ERP (o mesmo da linha `MEUERP_TOKEN` do arquivo `.env` do PC) e o token do robô do Telegram (o que o BotFather deu). Os dois comandos `read -rs` pedem o valor sem mostrar nada na tela; cole e aperte Enter:

```bash
read -rs -p 'Token do ERP: ' MEUERP_TOKEN; echo
read -rs -p 'Token do robô do Telegram: ' TELEGRAM_TOKEN; echo
```

Achar o número do chat: mande uma mensagem qualquer para o robô no Telegram e rode:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates" | grep -o '"chat":{"id":-\{0,1\}[0-9]*' | head -1
```

Saída esperada: `"chat":{"id":123456789` (com o seu número). Se não sair nada, mande outra mensagem ao robô e repita. Guarde o número:

```bash
read -r -p 'Número do chat: ' TELEGRAM_CHAT
```

Criar o segredo (as quatro linhas vão direto para o Docker, sem passar por arquivo) e apagar as variáveis:

```bash
printf 'MEUERP_TOKEN=%s\nKAIZEN_URL=postgres://kaizen:%s@postgres:5432/prumo\nTELEGRAM_TOKEN=%s\nTELEGRAM_CHAT=%s\n' "$MEUERP_TOKEN" "$SENHA" "$TELEGRAM_TOKEN" "$TELEGRAM_CHAT" | docker secret create kaizen_env_v1 -
unset MEUERP_TOKEN TELEGRAM_TOKEN TELEGRAM_CHAT SENHA
docker secret ls
```

Saída esperada: um código comprido (o id do segredo) e, na lista, a linha `kaizen_env_v1`.

## 6. Construir a imagem e publicar a stack `kaizen`

```bash
cd /opt/kaizen
SHA=$(git rev-parse --short HEAD)
docker build -f publicacao/Dockerfile -t kaizen-tradutor:$SHA .
KAIZEN_SHA=$SHA docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
docker service ls --filter name=kaizen_tradutor
```

Saída esperada: o `docker build` termina sem erro; o `deploy` diz `Creating service kaizen_tradutor`; na lista, `kaizen_tradutor` com `1/1` e a imagem `kaizen-tradutor:<o SHA>`. Se aparecer `network "prumo_default" is declared as external, but could not be found`, pare e cole a saída na sessão com o Claude.

Conferir o relógio de dentro do serviço:

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C date
```

Saída esperada: a hora de agora em Fortaleza, com `-03`.

## 7. Mandar a mensagem de teste

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C sh -c 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts teste-telegram'
```

Saída esperada: `teste-telegram: o Telegram aceitou a mensagem`, e no seu Telegram chega "Kaizen: mensagem de teste. O aviso de falha chega por aqui."

## 8. Rodar uma leitura à mão e ver o registro

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C sh -c 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts hora --manual'
```

Saída esperada: uma linha que começa com `hora ok:` ou `hora aviso:`, seguida das contagens (documentos lidos, movimentos, produtos...). A primeira leitura carrega tudo desde a virada e pode levar alguns minutos.

Ver o registro das leituras:

```bash
PG=$(docker ps -q -f name=prumo_postgres)
docker exec $PG psql -U prumo -d prumo -c "select id, tipo, manual, to_char(inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as inicio, resultado, mensagem, jsonb_array_length(avisos) as avisos from kaizen.execucao order by id desc limit 5"
```

Saída esperada: a linha da leitura manual, com `manual = t` e o mesmo resultado. Na hora cheia seguinte (entre 8h e 19h, de segunda a sábado), rode de novo: aparece uma linha com `manual = f`, a primeira leitura agendada.

## 9. Atualizar para uma versão nova

Quando o Claude disser que há uma versão nova no GitHub:

```bash
cd /opt/kaizen
ANTERIOR=$(docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')
SEGREDO=$(docker service inspect kaizen_tradutor --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}')
echo "$ANTERIOR $SEGREDO"
git pull
SHA=$(git rev-parse --short HEAD)
docker build -f publicacao/Dockerfile -t kaizen-tradutor:$SHA .
KAIZEN_SHA=$SHA KAIZEN_SEGREDO=$SEGREDO docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
docker service ls --filter name=kaizen_tradutor
```

Saída esperada: o `echo` mostra a imagem em uso (anote: é a versão para voltar atrás) e o segredo em uso; o serviço volta a `1/1` com a imagem nova.

Apagar as imagens antigas do tradutor, guardando só a nova e a anterior:

```bash
docker images kaizen-tradutor --format '{{.Repository}}:{{.Tag}}' | grep -v -x -e "kaizen-tradutor:$SHA" -e "$ANTERIOR" | xargs -r docker rmi
docker images kaizen-tradutor
```

Saída esperada: sobram duas linhas, a nova e a anterior. Depois, rode o passo 8 para conferir a versão nova.

## 10. Voltar atrás

Se a versão nova falhar, volte para a anterior (a que o passo 9 anotou; `docker images kaizen-tradutor` mostra as duas que ficaram):

```bash
cd /opt/kaizen
SEGREDO=$(docker service inspect kaizen_tradutor --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}')
docker images kaizen-tradutor
KAIZEN_SHA=<a tag anterior, só a parte depois de "kaizen-tradutor:"> KAIZEN_SEGREDO=$SEGREDO docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
docker service ls --filter name=kaizen_tradutor
```

Saída esperada: o serviço em `1/1` com a imagem anterior. Rode o passo 8. Se a versão nova tinha mudado a estrutura do banco (o Claude avisa quando uma versão traz migração), voltar a imagem pode não bastar: cole a saída na sessão com o Claude.

## 11. Trocar o segredo

Quando um token mudar (o do ERP ou o do Telegram), crie um segredo novo com as quatro linhas e publique com ele. A senha do banco é a do Gerenciador de Senhas ("Kaizen — banco, usuário kaizen"). Para a segunda troca, use `kaizen_env_v3` no lugar de `kaizen_env_v2`, e assim por diante.

```bash
read -rs -p 'Senha do banco (usuário kaizen): ' SENHA; echo
read -rs -p 'Token do ERP: ' MEUERP_TOKEN; echo
read -rs -p 'Token do robô do Telegram: ' TELEGRAM_TOKEN; echo
read -r -p 'Número do chat: ' TELEGRAM_CHAT
printf 'MEUERP_TOKEN=%s\nKAIZEN_URL=postgres://kaizen:%s@postgres:5432/prumo\nTELEGRAM_TOKEN=%s\nTELEGRAM_CHAT=%s\n' "$MEUERP_TOKEN" "$SENHA" "$TELEGRAM_TOKEN" "$TELEGRAM_CHAT" | docker secret create kaizen_env_v2 -
unset MEUERP_TOKEN TELEGRAM_TOKEN TELEGRAM_CHAT SENHA
cd /opt/kaizen
ATUAL=$(docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')
KAIZEN_SHA=${ATUAL#kaizen-tradutor:} KAIZEN_SEGREDO=kaizen_env_v2 docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
```

Rode os passos 7 e 8 (mensagem de teste e leitura manual). Com os dois certos, apague o segredo antigo:

```bash
docker secret rm kaizen_env_v1
```

Saída esperada: `kaizen_env_v1`. Se o token do ERP mudou, troque também a linha `MEUERP_TOKEN` do arquivo `.env` do PC.

## 12. Ver o log do serviço

```bash
docker service logs --timestamps --since 24h kaizen_tradutor
```

Saída esperada: para cada leitura, uma linha do `crond` com o comando que ele rodou (`crond: USER root pid ... cmd cd /kaizen && node ...`) e, logo depois, a linha do resultado, como `hora ok: documentos_lidos=12, ...` ou `noite aviso: ...`. A hora no começo de cada linha está em UTC: 3 horas a mais que a de Fortaleza. O log guarda no máximo 3 arquivos de 10 MB; o registro completo de cada leitura fica no banco (passo 8).

## 13. Conferência do dono

Troque os números pelos códigos dos 10 produtos que você quer conferir:

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C sh -c 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts conferencia 60 2138 1436 1362 62 1391 5278 2962 1368 1370'
```

A saída tem cinco partes, e cada uma diz onde conferir no ERP:

1. **Vendas por dia desde 28/09**, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; pelo dia em que o documento foi criado): confira, dia a dia, no **relatório 154**.
2. **Contas a pagar pendentes**, número de parcelas e total, sem o crédito de troca: confira na **tela de contas a pagar**.
3. **Quebra de cada fechamento de caixa** (informado menos calculado, por forma, sem a forma troca): confira na **tela do fechamento**.
4. **Saldo atual de cada produto pedido**, da última leitura: confira na **tela do produto**.
5. **Execuções esperadas e feitas nos últimos 7 dias**, e o resultado da **última comparação da noite**: na fase de fechamento, ela precisa dizer "zero diferença".

Cole a saída na sessão com o Claude quando ele pedir.

## 14. Consultar o banco do Kaizen (quando o Claude pedir)

O Claude manda a consulta pronta (só leitura). Cole-a entre as duas linhas `SQL`:

```bash
PG=$(docker ps -q -f name=prumo_postgres)
docker exec -i $PG psql -U prumo -d prumo <<'SQL'
select count(*) from kaizen.documento;
SQL
```

Saída esperada: a tabela com a resposta. Cole-a na sessão com o Claude.
````

- [ ] **Passo 7: Rodar e ver passar**

Run: `node --test tradutor/publicacao.test.mts`

Expected: PASS, 4 testes:
```
✔ crontab: duas linhas em LF, nos horários que o tradutor espera, sem MAILTO
✔ Dockerfile: Node 24.18.0 alpine, fuso de Fortaleza, só dependências de produção e crond em primeiro plano
✔ stack.yml: imagem pela tag do commit, segredo com nome fixo lido de variável, rede externa do Prumo e limite de log
✔ roteiro do dono: os 15 passos na ordem, a publicação sempre com --resolve-image never e o Prumo nunca removido
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

- [ ] **Passo 8: Conferir a stack, a imagem e o agendador no Docker local**

Nada disto fala com a VPS. `MSYS_NO_PATHCONV=1` impede o Git Bash de trocar os caminhos de dentro do contêiner (`/etc/crontabs/root`) por caminhos do Windows. Git Bash, na raiz do repositório.

Run: `docker compose -f publicacao/stack.yml config`
Expected: erro, sem publicar nada: `required variable KAIZEN_SHA is missing a value: defina KAIZEN_SHA`.

Run: `KAIZEN_SHA=abc1234 docker compose -f publicacao/stack.yml config`
Expected: primeiro uma linha `level=warning` dizendo que o atributo "version" é obsoleto (esperado; o `docker stack deploy` usa esse atributo), depois o arquivo resolvido. Nele estão `image: kaizen-tradutor:abc1234`, `max-file: "3"`, `max-size: 10m`, `target: kaizen_env`, e, embaixo, `prumo_default` com `external: true` e o segredo com `name: kaizen_env_v1` e `external: true`.

Run: `KAIZEN_SHA=abc1234 KAIZEN_SEGREDO=kaizen_env_v2 docker compose -f publicacao/stack.yml config | grep -A3 '^secrets'`
Expected:
```
secrets:
  kaizen_env:
    name: kaizen_env_v2
    external: true
```

Run:
```bash
export MSYS_NO_PATHCONV=1
docker build -q -f publicacao/Dockerfile -t kaizen-tradutor:teste .
docker run --rm kaizen-tradutor:teste cat /etc/crontabs/root
docker run --rm kaizen-tradutor:teste node tradutor/principal.mts; echo "saída: $?"
docker run --rm kaizen-tradutor:teste date +%z
```
Expected: o `build` imprime um `sha256:...`; depois as duas linhas do crontab; depois `uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...]` e `saída: 2` (o TypeScript roda direto no Node da imagem, já com o comando da tarefa 16); e `-0300`.

Agora o agendador de verdade: um contêiner com um crontab de teste que roda a cada minuto e lê um segredo de mentira (espera até 75 s):

Run:
```bash
export MSYS_NO_PATHCONV=1
docker run -d --name kaizen-teste-cron kaizen-tradutor:teste sh -c 'mkdir -p /run/secrets && printf "TESTE=segredo-lido\n" > /run/secrets/kaizen_env && printf "%s\n" "* * * * * cd /kaizen && node --env-file=/run/secrets/kaizen_env -e \"console.log(process.env.TESTE, new Date().toString())\"" > /etc/crontabs/root && exec crond -f -d 8'
for i in $(seq 1 15); do docker logs kaizen-teste-cron 2>&1 | grep -q segredo-lido && break; sleep 5; done
docker logs kaizen-teste-cron
docker rm -f kaizen-teste-cron
docker rmi kaizen-tradutor:teste
```
Expected: o log tem três linhas, nesta forma (a hora é a da sua máquina, em −03):
```
crond: crond (busybox 1.37.0) started, log level 8
crond: USER root pid   9 cmd cd /kaizen && node --env-file=/run/secrets/kaizen_env -e "console.log(process.env.TESTE, new Date().toString())"
segredo-lido Sun Sep 27 2026 15:57:00 GMT-0300 (Brasilia Standard Time)
```
(a versão do BusyBox e o `pid` podem ser outros). Isso prova, na imagem de verdade, que o `crond` roda o comando na hora cheia do minuto, dentro de `/kaizen`, com o `node` no caminho, lendo o arquivo do segredo, e que a saída chega ao log do contêiner. Depois, `docker rm -f` e `docker rmi` apagam o contêiner e a imagem de teste.

- [ ] **Passo 9: Atualizar `testes-esperados.txt` (N = 4, todos em `publicacao.test.mts`)**

Run:
```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+4;fs.writeFileSync('testes-esperados.txt',n+'\n');console.log(n)"
```

Expected: imprime o número novo, que é o anterior mais 4.

- [ ] **Passo 10: Rodar a verificação inteira**

Run: `npm run verificar`

Expected: `tsc -p .` sem nenhum erro, e a última linha `rodou M testes, esperados M`, com M igual ao número que ficou em `testes-esperados.txt`.

- [ ] **Passo 11: Fazer o git guardar e entregar a pasta `publicacao/` sempre em LF**

Nesta máquina o git está com `core.autocrlf=true` (em `C:/Program Files/Git/etc/gitconfig`), e o `.gitattributes` da tarefa 1 só força LF no `publicacao/crontab`. Sem a linha nova, o `stack.yml`, o `Dockerfile` e o `README.md` voltam em CRLF no próximo checkout, merge, stash ou clone: o teste do `stack.yml` e o do roteiro falham (as linhas passam a terminar em `\r`), e o hook de commit recusa todos os commits seguintes. O comando abaixo acrescenta a linha ao fim do arquivo, sem mexer no que já está lá (rodar duas vezes não duplica). Git Bash, na raiz do repositório:

Run:
```bash
node -e "const fs=require('node:fs');const f='.gitattributes';let s=fs.readFileSync(f,'utf8');const l='publicacao/* text eol=lf';if(!s.split(/\r?\n/).includes(l)){if(s&&!s.endsWith('\n'))s+='\n';fs.writeFileSync(f,s+l+'\n')}process.stdout.write(fs.readFileSync(f,'utf8'))"
```

Expected: o arquivo inteiro, com as seis linhas:
```
publicacao/crontab text eol=lf
.githooks/* text eol=lf
*.sh text eol=lf
*.mts text eol=lf
*.sql text eol=lf
publicacao/* text eol=lf
```

- [ ] **Passo 12: Commit**

Run: `git add .gitattributes publicacao/crontab publicacao/Dockerfile publicacao/stack.yml publicacao/README.md tradutor/publicacao.test.mts testes-esperados.txt`

Expected: pode aparecer `warning: in the working copy of '.gitattributes', LF will be replaced by CRLF the next time Git touches it` (e o mesmo para `testes-esperados.txt`): é o padrão desta máquina e não afeta nada. Para os arquivos de `publicacao/`, esse aviso **não** pode aparecer; se aparecer, o passo 11 não pegou.

Run: `git ls-files --eol publicacao/`

Expected: quatro linhas, todas com `i/lf` (o git guardou em LF), `w/lf` e `attr/text eol=lf` (e vai entregar em LF):
```
i/lf    w/lf    attr/text eol=lf      	publicacao/Dockerfile
i/lf    w/lf    attr/text eol=lf      	publicacao/README.md
i/lf    w/lf    attr/text eol=lf      	publicacao/crontab
i/lf    w/lf    attr/text eol=lf      	publicacao/stack.yml
```

```bash
git commit -F - <<'EOF'
Publicação na VPS: imagem, horário, stack e o roteiro do dono

O tradutor ganha a imagem que roda na VPS (Node 24.18.0, fuso de
Fortaleza, o agendador do Alpine em primeiro plano) e o horário: a
leitura da hora das 8h às 19h e a da noite às 22h, de segunda a sábado,
com a saída de cada leitura no log do serviço. A stack kaizen tem um
serviço só, ligado à rede do banco da stack prumo, com o segredo sempre
no mesmo lugar e o log limitado a 3 arquivos de 10 MB.

O roteiro do dono (publicacao/README.md) diz, comando por comando, como
root e entre hh:10 e hh:50: parar o sync do Prumo e guardar a cópia da
Link, criar a chave, o usuário e o segredo, publicar, mandar a mensagem
de teste, rodar uma leitura à mão, atualizar, voltar atrás, trocar o
segredo, ver o log e rodar a conferência do dono.

Os quatro arquivos da publicação ficam sempre com fim de linha LF, aqui
e na VPS: com o CRLF que esta máquina usa por padrão, o agendador não
leria o horário e o teste recusaria os commits seguintes.

Conferido no Docker local: a imagem constrói, o agendador roda o
comando lendo o segredo, e a saída chega ao log. 4 testes novos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Passo 13: Conferir que um checkout devolve a pasta em LF**

Apague os quatro arquivos da pasta de trabalho e peça ao git que os devolva do commit: é o que acontece num clone, num merge ou num stash. Git Bash, na raiz do repositório:

Run:
```bash
rm publicacao/crontab publicacao/Dockerfile publicacao/stack.yml publicacao/README.md
git checkout -- publicacao/
git ls-files --eol publicacao/
node --test tradutor/publicacao.test.mts
git status --short publicacao/
```

Expected: as mesmas quatro linhas do passo 12 (`i/lf`, `w/lf`, `attr/text eol=lf`), depois `ℹ pass 4` e `ℹ fail 0`, e o `git status` sem nenhuma linha. Sem a linha do passo 11, o `ls-files` mostraria `w/crlf` no `Dockerfile`, no `README.md` e no `stack.yml`, e o teste falharia em 2 (o do `stack.yml` e o do roteiro).

---

### Tarefa 18: Ensaio com o ERP de verdade

Primeira vez que o tradutor fala com o ERP de verdade. Ele só lê o ERP e grava no Postgres local do PC. Nada vai para a VPS nesta tarefa.

**Arquivos:**
- Criar: `ferramentas/consultar-erp.mts`
- Criar: `ferramentas/consultar-erp.test.mts`
- Criar: `ferramentas/ensaio.mts`
- Modificar: `docs/FONTES.md` (seção nova "Ensaio da Fase 2", no fim do arquivo)
- Modificar: `testes-esperados.txt` (+2)

**Interfaces:**
- Consome:
  - `verificarSomenteLeitura(sql: string): string` (`tradutor/somente-leitura.mts`);
  - `criarErp(opcoes: OpcoesErp): Erp` (`tradutor/erp.mts`);
  - `lerConfig(env): Config` (`tradutor/config.mts`);
  - `conectar(url): Promise<Cliente>` (`tradutor/banco.mts`);
  - `aplicarMigracoes(cliente): Promise<string[]>` (`tradutor/migracoes.mts`);
  - `lerCortes(cliente): Promise<Cortes>` (`tradutor/kaizen.mts`);
  - de `tradutor/leitura.mts`: `conferirColunas`, `conferirEmpresaLocal`, `lerVivos`, `lerDocumentosHora`, `lerDocumentosFaixa`, `lerEstoque`, `lerCadastros`, `lerAntesDaVirada`, `lerTotaisErp`;
  - `TAMANHO_FATIA`, `PRIMEIRO_INICIO` (`tradutor/constantes.mts`).
- Produz:
  - `embrulhar(sql: string): string` (`ferramentas/consultar-erp.mts`), usado na Tarefa 19;
  - o comando `node --env-file=.env ferramentas/consultar-erp.mts "<SELECT>"`;
  - o comando `node --env-file=.env ferramentas/ensaio.mts consultas|antes-da-virada`.

- [ ] **Passo 1: Escrever o teste que falha de `embrulhar`**

`ferramentas/consultar-erp.test.mts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { embrulhar } from './consultar-erp.mts'

test('embrulhar põe a consulta livre dentro de um json_agg com a coluna dados', () => {
  const sql = embrulhar('select modelo, count(*) as n from documento group by modelo')
  assert.equal(
    sql,
    "select coalesce(json_agg(x), '[]')::text as dados from (select modelo, count(*) as n from documento group by modelo) x",
  )
})

test('embrulhar recusa consulta que escreve, antes de sair do PC', () => {
  assert.throws(() => embrulhar('delete from documento'), /recusado/)
  assert.throws(() => embrulhar('select 1; drop table documento'), /recusado/)
})
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test ferramentas/consultar-erp.test.mts`
Expected: FAIL, com `Cannot find module` apontando para `consultar-erp.mts`.

- [ ] **Passo 3: Escrever `ferramentas/consultar-erp.mts`**

```ts
// Consulta livre ao ERP, só leitura, para as conferências da operação real (Tarefa 19).
// Uso: node --env-file=.env ferramentas/consultar-erp.mts "select ... from documento where ..."
import { verificarSomenteLeitura } from '../tradutor/somente-leitura.mts'
import { criarErp } from '../tradutor/erp.mts'
import { lerConfig } from '../tradutor/config.mts'

export function embrulhar(sql: string): string {
  const interna = verificarSomenteLeitura(sql)
  return `select coalesce(json_agg(x), '[]')::text as dados from (${interna}) x`
}

if (import.meta.main) {
  const sql = process.argv[2]
  if (!sql) {
    console.error('uso: node --env-file=.env ferramentas/consultar-erp.mts "<SELECT>"')
    process.exit(2)
  }
  const config = lerConfig(process.env)
  const erp = criarErp({ url: config.erpUrl, token: config.erpToken })
  const dados = await erp.consultar(embrulhar(sql))
  const linhas = JSON.parse(dados) as unknown[]
  console.log(JSON.stringify(linhas, null, 2))
  console.log(`${linhas.length} linha(s)`)
}
```

`lerConfig` exige `KAIZEN_URL` mesmo sem usar o banco. O passo 6 garante que o `.env` do PC a tenha.

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test ferramentas/consultar-erp.test.mts`
Expected: PASS, 2 testes.

- [ ] **Passo 5: Escrever `ferramentas/ensaio.mts`**

```ts
// Ensaio da Fase 2 com o ERP de verdade, só leitura. Grava só no Postgres local do PC.
// Uso:
//   node --env-file=.env ferramentas/ensaio.mts consultas        roda cada consulta do tradutor uma vez no ERP
//   node --env-file=.env ferramentas/ensaio.mts antes-da-virada  lista documentos acima do corte com data antes de 28/09
import { lerConfig } from '../tradutor/config.mts'
import { criarErp } from '../tradutor/erp.mts'
import { conectar } from '../tradutor/banco.mts'
import { aplicarMigracoes } from '../tradutor/migracoes.mts'
import { lerCortes } from '../tradutor/kaizen.mts'
import {
  conferirColunas, conferirEmpresaLocal, lerVivos, lerDocumentosHora, lerDocumentosFaixa,
  lerEstoque, lerCadastros, lerAntesDaVirada, lerTotaisErp,
} from '../tradutor/leitura.mts'
import { TAMANHO_FATIA, PRIMEIRO_INICIO } from '../tradutor/constantes.mts'

async function medir(nome: string, fazer: () => Promise<string | unknown[]>): Promise<string | unknown[]> {
  const inicio = performance.now()
  const resultado = await fazer()
  const ms = Math.round(performance.now() - inicio)
  if (typeof resultado === 'string') {
    const valor = JSON.parse(resultado) as unknown
    const itens = Array.isArray(valor) ? `${valor.length} itens` : `chaves ${Object.keys(valor as object).join(', ')}`
    console.log(`${nome}: ${ms} ms, ${resultado.length} caracteres, ${itens}`)
  } else {
    console.log(`${nome}: ${ms} ms, ${resultado.length} itens ${JSON.stringify(resultado)}`)
  }
  return resultado
}

const modo = process.argv[2]
const config = lerConfig(process.env)
const erp = criarErp({ url: config.erpUrl, token: config.erpToken })
const cliente = await conectar(config.kaizenUrl)
try {
  await aplicarMigracoes(cliente)
  const cortes = await lerCortes(cliente)
  if (modo === 'consultas') {
    await medir('colunas que faltam', () => conferirColunas(erp))
    await medir('empresa e local diferentes de 1', () => conferirEmpresaLocal(erp, cortes))
    const vivos = JSON.parse(await medir('vivos', () => lerVivos(erp, cortes)) as string) as number[]
    const maior = vivos.length ? Math.max(...vivos) : cortes.documento
    await medir('documentos da hora', () =>
      lerDocumentosHora(erp, cortes, { novosAcimaDe: cortes.documento, inicio: PRIMEIRO_INICIO, pendentes: [] }))
    await medir('documentos, primeira fatia', () =>
      lerDocumentosFaixa(erp, cortes, cortes.documento + 1, cortes.documento + TAMANHO_FATIA))
    await medir('estoque completo', () => lerEstoque(erp, cortes, cortes.mercadoria_estoque_historico))
    await medir('cadastros', () => lerCadastros(erp))
    await medir('antes da virada', () => lerAntesDaVirada(erp, cortes))
    await medir('totais do ERP', () => lerTotaisErp(erp, cortes, maior, 2147483647))
  } else if (modo === 'antes-da-virada') {
    const texto = await lerAntesDaVirada(erp, cortes)
    console.log(JSON.stringify(JSON.parse(texto), null, 2))
  } else {
    console.error('uso: node --env-file=.env ferramentas/ensaio.mts consultas|antes-da-virada')
    process.exitCode = 2
  }
} finally {
  await cliente.end()
}
```

- [ ] **Passo 6: Preparar o `.env` do PC sem abrir o arquivo**

O `.env` já tem `MEUERP_TOKEN` e é ignorado pelo git (commit 1365ffa). Acrescente a URL do Postgres local, que não é segredo, e confira só os nomes:

Run:
```bash
grep -q '^KAIZEN_URL=' .env || echo 'KAIZEN_URL=postgres://kaizen:kaizen-local@localhost:5434/kaizen' >> .env
sed 's/=.*/=<oculto>/' .env
git check-ignore -v .env
```
Expected: duas linhas, `MEUERP_TOKEN=<oculto>` e `KAIZEN_URL=<oculto>`, e `.gitignore:...:.env	.env`. Sem `TELEGRAM_TOKEN`: no PC, as mensagens só são impressas.

- [ ] **Passo 7: Rodar cada consulta do tradutor uma vez no ERP de verdade**

O Postgres local precisa estar no ar (`docker compose up -d`).

Run: `node --env-file=.env ferramentas/ensaio.mts consultas`
Expected, sem nenhum erro:
- nove linhas, uma por consulta, cada uma com tempo em ms;
- `colunas que faltam: ... 0 itens` e `empresa e local diferentes de 1: ... 0 itens`;
- nenhuma consulta acima de 30.000 ms;
- `estoque completo` com as chaves `movimentos, foto`, e `cadastros` com `produtos, pessoas, funcionarios, fornecedores`.

Qualquer erro 400 ou uma consulta que falhe é bug do SQL. Nesse caso, use a skill superpowers:systematic-debugging e corrija na tarefa dona do arquivo `sql/erp/*.sql`.

- [ ] **Passo 8: Listar os documentos entre o corte e a abertura de 28/09 e decidir**

Run: `node --env-file=.env ferramentas/ensaio.mts antes-da-virada`
Expected:
- os 44 ajustes de custo `AC` de 27/09, números 94 a 137, já confirmados pelo dono (decisão 13 do `FONTES.md`);
- as contas a pagar reimportadas (`CP`), se o dono já as importou;
- qualquer outro modelo.

Decida pelo critério da spec (5.4), sem esperar o dono, que não está na sessão (`docs/AUTONOMIA.md`):
- `AC` de 27/09 e `CP` são esperados e entram como reais.
- Qualquer outro documento acima do corte com data anterior a 28/09 também entra como real: depois da limpeza de 26/09, não há teste do dono previsto.

Registre em `docs/DECISOES.md`, na seção "Fase 2", uma entrada no formato do arquivo:
- **Data e fase:** `AAAA-MM-DD · Fase 2 ·`
- **O quê:** a lista, por modelo, com quantidade, primeiro e último número e primeira e última data, e a decisão ("entram como reais").
- **Por quê:** spec 5.4 e decisão 13 do `FONTES.md`.
- **O que muda se estiver errado:** "uma migração nova muda o corte de `documento`. Os testes que usam o corte 184 (`kaizen.test.mts`, `execucao.test.mts`, `execucao-noite.test.mts`, `casos-reais.test.mts`) passam a ler o corte de `kaizen.corte` ou são atualizados junto."

Não mude o corte nesta tarefa.

- [ ] **Passo 9: Rodar o tradutor inteiro no PC: noite e depois hora**

Run: `node --env-file=.env tradutor/principal.mts noite --manual`
Expected: uma linha `noite ok: ...` ou `noite aviso: ...`, com `documentos_lidos` igual ao número de vivos do passo 7, e código de saída 0.

Run: `node --env-file=.env tradutor/principal.mts hora --manual`
Expected: `hora ok: ...` ou `hora aviso: ...`, código 0.

- [ ] **Passo 10: Conferir que a comparação da noite deu zero diferença**

Run:
```bash
docker compose exec -T postgres psql -U kaizen -d kaizen -c "select id, tipo, resultado, contagens, jsonb_array_length(avisos) as avisos from kaizen.execucao order by id" -c "select a->>'tipo' as tipo, count(*) from kaizen.execucao e, jsonb_array_elements(e.avisos) a group by 1 order by 1"
```
Expected:
- as duas execuções com resultado `ok` ou `aviso`;
- nenhuma linha de tipo `total_diferente`.

Avisos de `codigo_sem_traducao` (por exemplo, um modelo novo) são esperados. Eles viram migração de tradução, com a decisão registrada em `docs/DECISOES.md`, pelo critério da spec (5.4): só se traduz o que tem significado conhecido. Se aparecer `total_diferente`, é bug da carga ou da comparação: use a skill superpowers:systematic-debugging, corrija e rode o passo 9 de novo.

- [ ] **Passo 11: Registrar o ensaio no `FONTES.md`**

Acrescente ao fim de `docs/FONTES.md` a seção abaixo, preenchida com os números medidos nos passos 7 a 10, em palavras, para o dono:

```markdown
## Ensaio da Fase 2 (DD/MM/2026)

O tradutor rodou no PC, lendo o ERP de verdade, só leitura, e gravando no Postgres local.

- Cada consulta do tradutor rodou uma vez no ERP: a mais lenta levou N ms (limite: 30.000 ms). Nenhuma coluna esperada falta, e só existem a empresa 1 e o local de estoque 1.
- Documentos acima do corte com data anterior a 28/09: <lista por modelo>. Decisão: entram como reais (docs/DECISOES.md).
- Execução da noite: N documentos, N movimentos de estoque, N produtos, N pessoas, N funcionários. A comparação dos totais por dia deu zero diferença em N dias.
- Execução da hora: <resultado>.
- Avisos: <tipos e quantidades, ou "nenhum">.
```

- [ ] **Passo 12: Atualizar a contagem, verificar e commitar**

N = 2 (os 2 `test(` de `ferramentas/consultar-erp.test.mts`). O arquivo guarda só um número; este comando soma N e imprime o novo valor:

```bash
node -e "const fs=require('node:fs');const n=Number(fs.readFileSync('testes-esperados.txt','utf8').trim())+2;fs.writeFileSync('testes-esperados.txt',n+'
');console.log(n)"
```

Run: `npm run verificar`
Expected: `tsc -p .` sem erro e, no fim, `rodou M testes, esperados M`, com M igual ao número impresso pelo comando acima.

```bash
git add ferramentas/consultar-erp.mts ferramentas/consultar-erp.test.mts ferramentas/ensaio.mts docs/FONTES.md docs/DECISOES.md testes-esperados.txt
git commit -F - <<'EOF'
Fase 2: ensaio do tradutor com o ERP de verdade

O tradutor leu o ERP de verdade, só leitura, e gravou no Postgres do PC.
Cada consulta rodou no ERP, a comparação da noite deu zero diferença, e
os documentos anteriores a 28/09 foram decididos e registrados em
DECISOES.md. Os números
estão no FONTES.md, seção "Ensaio da Fase 2".

Entra também a consulta livre ao ERP, só leitura, usada nas
conferências da operação real.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 19: Conferências da operação real

As perguntas da seção 9 da spec, que só a operação real responde. Cada uma é feita lendo o ERP, só leitura, assim que o caso acontece, sem esperar o tradutor na VPS. Esta tarefa não tem um "fim" único: ela abre a seção no `FONTES.md` e é revisitada até o fechamento da fase (Tarefa 20). O que não tiver acontecido até lá fica listado como aberto e não segura a fase.

**Arquivos:**
- Modificar: `docs/FONTES.md` (seção nova "Conferências da operação real (Fase 2)", no fim)
- Criar, só se uma resposta pedir: `sql/migracoes/0NN_<assunto>.sql` (tradução nova ou coluna nova), com teste na tarefa dona do assunto

**Interfaces:**
- Consome: o comando `node --env-file=.env ferramentas/consultar-erp.mts "<SELECT>"` (Tarefa 18), que só lê. A saída é JSON com uma linha por registro.
- Produz: respostas registradas no `FONTES.md`. Quando uma resposta mudar o esquema ou a tradução, entra uma migração nova. A releitura da noite preenche o passado.

**Regras desta tarefa:**
- Só leitura. As consultas abaixo passam pela trava de `consultar-erp.mts`, que recusa qualquer escrita.
- **Nunca** copie para o `FONTES.md`, nem para o commit, nome, CPF/CNPJ, telefone ou endereço de cliente. Registre só contagens, códigos de documento, valores e datas.
- Cada resposta vira um item no `FONTES.md`, no formato: `N. <pergunta> — <resposta em uma ou duas frases, com números> (<data da conferência>). Consequência: <nada | migração 0NN | pergunta ao dono>.`
- O dono não está na sessão (`docs/AUTONOMIA.md`). Se uma resposta contrariar a spec (por exemplo, a NFC-e sai como segundo documento), decida pelo critério do `OBJETIVO.md`: menos peças, menos regras, nenhuma exceção para funcionar. Registre a decisão em `docs/DECISOES.md` (o quê, por quê, o que muda se estiver errado) e só então escreva a migração e o teste. O que depende do dono (por exemplo, confirmar com a equipe quem vendeu) vai para `docs/DECISOES.md` como pendência para ele. Use a skill superpowers:systematic-debugging se houver comportamento inesperado do tradutor.

- [ ] **Passo 1: Abrir a seção no `FONTES.md`**

Acrescente ao fim de `docs/FONTES.md`:

```markdown
## Conferências da operação real (Fase 2)

Perguntas da seção 9 da spec da Fase 2, respondidas lendo o ERP, só leitura, a partir de 28/09/2026. Item aberto é o que ainda não aconteceu na loja.

1. Primeira NFC-e e primeira NF-e — aberto.
2. Orçamento fechado em outro dia — aberto.
3. Venda e turno — aberto.
4. Cartão de crédito no fechamento — aberto.
5. Vendedor gravado, com o dono — aberto.
6. Vendedor no item da troca — aberto.
7. Cancelamentos — aberto.
8. Pré-venda reserva estoque — aberto.
9. Números da operação — aberto.
10. Números dos restos de teste — aberto.
11. Contas a pagar reimportadas — aberto.
12. Sangria RT — aberto.
13. Documentos apagados — aberto.
```

Commit:
```bash
git add docs/FONTES.md
git commit -F - <<'EOF'
Fase 2: abre a lista das conferências da operação real

As treze perguntas que só a loja funcionando responde ficam listadas no
FONTES.md como abertas e são respondidas lendo o ERP, só leitura,
conforme cada caso acontece.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Passo 2: Item 1 — NFC-e e NF-e**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select modelo, status, tipomovimento, tipomovimentofinanceiro, count(*) as quantidade, min(_iddocumento) as primeiro, max(_iddocumento) as ultimo from documento where oid > 184 and modelo in ('65', '55', 'PA') group by modelo, status, tipomovimento, tipomovimentofinanceiro order by modelo, status"
```
Para a primeira NFC-e, ver se ela aponta outro documento:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select d._iddocumento, d.modelo, d.datahora, d.idpessoa, m._idsequencia, m.idmercadoriavariacao, m.valtotalliquido::text as valor, m.iddocumentoorigem from documento d join documento_mercadoria m on m._iddocumento = d._iddocumento where d.oid > 184 and d.modelo = '65' order by d.oid limit 20"
```
E se, para a mesma venda (mesmo cliente e horário), existem um `PA` e um `65`:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select a._iddocumento as pedido, b._iddocumento as nota, a.datahora as hora_pedido, b.datahora as hora_nota from documento a join documento b on b.idpessoa = a.idpessoa and b.modelo = '65' and b.datahora between a.datahora and a.datahora + interval '10 minutes' where a.oid > 184 and a.modelo = 'PA' and a.tipomovimentofinanceiro = 'R' order by a.oid limit 20"
```

Registre:
- o status final da NFC-e;
- se a venda fica um documento só ou dois;
- se forem dois, onde está a ligação (`iddocumentoorigem` no item ou outro campo).

Se forem dois, decida como a ligação entra (registrado em `docs/DECISOES.md`), e ela vira coluna nova numa migração (`documento_item.documento_origem`), com a consulta `sql/erp/documentos.sql` e a carga atualizadas. Tudo com teste, e a regra "uma venda" fica para a Fase 4. Faça o mesmo para a NF-e (`55`, `tipomovimento = 'S'`).

- [ ] **Passo 3: Item 2 — orçamento fechado em outro dia e `datahoramovimento` vazio**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select _iddocumento, modelo, datahora, datahoramovimento, tipodatahoramovimento from documento where oid > 184 and datahoramovimento is not null and datahoramovimento::date <> datahora::date order by oid limit 50"
node --env-file=.env ferramentas/consultar-erp.mts "select modelo, count(*) filter (where datahoramovimento is null) as sem_fechamento, count(*) as total from documento where oid > 184 and tipomovimentofinanceiro = 'R' group by modelo order by modelo"
```
Registre:
- se o orçamento convertido em outro dia leva a data do fechamento em `datahoramovimento`;
- quantas vendas vêm sem `datahoramovimento`. Se houver alguma, a Fase 4 decide com aviso (spec 5.6).

- [ ] **Passo 4: Item 3 — venda e turno**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select idcaixaabertura, idusuarioabertura, idabertura, count(*) filter (where modelo = 'AX') as aberturas, count(*) filter (where modelo = 'FC') as fechamentos, count(*) filter (where tipomovimentofinanceiro = 'R') as vendas, min(datahora) as de, max(datahora) as ate from documento where oid > 184 and idcaixaabertura > 0 group by 1, 2, 3 order by de"
```
Registre se o trio identifica um turno só: uma abertura, um fechamento, vendas entre os dois horários. Anote os casos com mais de um fechamento (como o FC 118) ou sem abertura.

- [ ] **Passo 5: Item 4 — linha "Cartão Crédito" do fechamento**

No primeiro fechamento com venda no crédito, compare o calculado da forma 3 com a soma dos pagamentos no crédito do turno:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select f._iddocumento as fechamento, k.valdisponivel::text as calculado_credito, (select sum(p.valor)::text from documento v join documento_pagamento p on p._iddocumento = v._iddocumento where v.oid > 184 and v.idcaixaabertura = f.idcaixaabertura and v.idusuarioabertura = f.idusuarioabertura and v.idabertura = f.idabertura and p.idpagamento = 3) as vendas_credito from documento f join documento_conferencia_caixa k on k._iddocumento = f._iddocumento and k._idpagamento = 3 where f.oid > 184 and f.modelo = 'FC' order by f.oid"
```
Registre se o calculado soma as vendas no crédito. Se não somar, cada venda no crédito aparece como sobra de caixa, e a Fase 4 precisa saber disso.

- [ ] **Passo 6: Item 5 — vendedor gravado, com o dono**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select d.datahora::date as dia, m.idpessoafuncionario as vendedor, d.idusuario as operador, count(distinct d._iddocumento) as vendas, sum(m.valtotalliquido)::text as total from documento d join documento_mercadoria m on m._iddocumento = d._iddocumento where d.oid > 184 and d.status = 'E' and d.tipomovimento = 'S' and d.tipomovimentofinanceiro = 'R' group by 1, 2, 3 order by 1, 2, 3"
```
Troque os códigos pelos nomes (1 = Igor, 999005 = Daniele; os operadores são usuários: 18152 = Igor, 18153 = Daniele) e registre, por dia, quantas vendas e quanto cada vendedor fez, e quantas vendas têm vendedor diferente do operador. A confirmação com a equipe é do dono: registre em `docs/DECISOES.md` a pendência "conferir com a equipe se o vendedor gravado é quem atendeu", com esses números. Se o caixa grava sempre o mesmo vendedor, o ritmo por vendedor sai errado, e isso é assunto da loja, não do tradutor.

- [ ] **Passo 7: Item 6 — vendedor no item da troca**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select d._iddocumento, d.datahora, m.idmercadoriavariacao, m.valtotalliquido::text as valor, m.idpessoafuncionario as vendedor, m.iddocumentoorigem from documento d join documento_mercadoria m on m._iddocumento = d._iddocumento where d.oid > 184 and d.modelo = 'TM' order by d.oid limit 30"
```
Registre se o item da troca traz vendedor. Se vier vazio, a Fase 4 decide com o dono de quem a devolução desconta (spec, cobertura 5).

- [ ] **Passo 8: Item 7 — cancelamentos**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select d._iddocumento, d.modelo, d.status, d.datahora, c.datahora as cancelado_em, (select count(*) from documento_mercadoria m where m._iddocumento = d._iddocumento) as itens, (select count(*) from documento_pagamento p where p._iddocumento = d._iddocumento) as pagamentos from documento_cancelamento_historico c join documento d on d._iddocumento = c._iddocumento where c.oid > 0 and d.oid > 184 order by c.oid"
node --env-file=.env ferramentas/consultar-erp.mts "select h._iddocumento, h.tipoevento, h.datahora, h.idmercadoriavariacao, h.valtotalliquido::text as valor from documento_mercadoria_historico h join documento d on d._iddocumento = h._iddocumento where d.oid > 184 order by h.datahora limit 30"
```
Registre, na venda cancelada inteira:
- se ela mantém itens e pagamentos;
- se o status vira `C`;
- se o estoque volta com uma linha nova no histórico, e com que data.

Registre também:
- no item removido antes de fechar, como aparecem as linhas `CO`;
- o que acontece quando se cancela uma troca (`TM`) e quando se cancela depois do fechamento.

- [ ] **Passo 9: Item 8 — pré-venda reserva estoque**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select count(*) filter (where qtdsaldoreserva <> 0) as produtos_com_reserva, sum(qtdsaldoreserva)::text as reserva_total from mercadoria_estoque"
node --env-file=.env ferramentas/consultar-erp.mts "select count(*) as pre_vendas_emitidas from documento where oid > 184 and modelo = 'PV' and status = 'E'"
```
Registre se, com pré-vendas emitidas, aparece reserva.

- [ ] **Passo 10: Item 9 — números da operação**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select count(*) as vendas, count(*) filter (where idpessoa = 999007) as consumidor_final, round(avg((select count(*) from documento_mercadoria m where m._iddocumento = d._iddocumento)), 2)::text as itens_por_venda from documento d where oid > 184 and status = 'E' and tipomovimento = 'S' and tipomovimentofinanceiro = 'R'"
node --env-file=.env ferramentas/consultar-erp.mts "select gmt, count(*) from documento where oid > 184 group by gmt"
```
O atraso do caixa sem internet só se mede com o tradutor na VPS. Depois da primeira semana dele lá, o comando abaixo é rodado na VPS pelo roteiro (`publicacao/README.md`, passo de consulta ao banco); até lá, o item fica aberto. Ele usa só os documentos vistos depois da primeira execução da hora na VPS:
```sql
select percentile_disc(array[0.5, 0.9, 1.0]) within group (order by d.visto_em - d.criado_em::timestamptz) as atraso
from kaizen.documento d
where d.fonte = 'meuerp' and d.modelo in ('PA', '65', '55')
  and d.visto_em > (select min(inicio) from kaizen.execucao where tipo = 'hora' and manual = false)
```
Registre:
- a proporção para o Consumidor Final (a carteira de clientes o deixa de fora);
- os itens por venda;
- o que vem em `gmt`. Se vier algo diferente de vazio ou −03, é mudança de estrutura: registre em `docs/DECISOES.md` como pendência para o dono;
- a mediana, o 90º percentil e o maior atraso.

- [ ] **Passo 11: Item 10 — números dos restos de teste**

Quando aparecer um fechamento com número 68, 71, 74, 98, 99 ou 118, compare com `docs/medicoes/conferencia-restos-2026-09-27.json`:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select k.oid, k._iddocumento, k._idpagamento, k.valdisponivel::text, k.valconferido::text, d.modelo from documento_conferencia_caixa k left join documento d on d._iddocumento = k._iddocumento where k._iddocumento in (68, 71, 74, 98, 99, 118) order by k.oid"
```
Registre qual das três aconteceu:
- **O ERP criou linhas novas:** `oid` acima de 30, e as de teste continuam iguais às medidas. Nada a fazer.
- **O ERP regravou a linha de teste:** `oid` até 30 com valor diferente do medido. O tradutor já avisa (spec 5.4). Decida pelo critério do `OBJETIVO.md` (registrado em `docs/DECISOES.md`): se os valores regravados são reais (batem com as vendas do turno), escreva a migração que faz essas linhas entrarem; senão, mantenha-as fora.
- **O ERP recusou o fechamento:** registre em `docs/DECISOES.md` a pendência para o dono pedir ao suporte que apague as 30 linhas.

- [ ] **Passo 12: Item 11 — contas a pagar reimportadas**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select count(*) as parcelas, sum(p.valparcela)::text as total, count(*) filter (where p.status = 'P') as pendentes, sum(p.valparcela) filter (where p.status = 'P')::text as total_pendente, min(d.oid) as menor_oid, min(d._iddocumento) as primeiro, max(d._iddocumento) as ultimo, min(d.datahora) as data_mais_antiga, max(d.datahora) as data_mais_nova from documento d join documento_parcela p on p._iddocumento = d._iddocumento where d.modelo = 'CP'"
```
Registre:
- quantas parcelas e qual o total. Eram 94 e R$ 245.864,76 em 26/09;
- se todas entram acima do corte: o menor `oid` tem de ser maior que 184;
- as datas.

- [ ] **Passo 13: Item 12 — sangria RT**

Run:
```bash
node --env-file=.env ferramentas/consultar-erp.mts "select d._iddocumento, d.modelo, d.datahora, d.tipomovimento, d.tipomovimentofinanceiro, p.idpagamento, p.valor::text from documento d left join documento_pagamento p on p._iddocumento = d._iddocumento where d.oid > 184 and d.modelo in ('RT', 'RU', 'RS') order by d.oid limit 30"
```
Registre se o `RT` se comporta como a sangria `RS`: saída de dinheiro do caixa. Se não se comportar, corrija a tradução por migração, com a decisão em `docs/DECISOES.md`. Se aparecer `RU`, ele já gera aviso de código sem tradução. Descubra o que é e traduza por migração.

- [ ] **Passo 14: Item 13 — documentos apagados**

Com o tradutor na VPS, pelo roteiro, uma vez por semana (até lá, o item fica aberto):
```sql
select date_trunc('week', e.inicio)::date as semana, count(*) as avisos_de_apagado
from kaizen.execucao e, jsonb_array_elements(e.avisos) a
where a->>'tipo' = 'documento_apagado'
group by 1 order by 1
```
Registre quantos documentos somem por semana e de que tipo (o texto do aviso diz o tipo). Se o apagamento de rascunho for rotina, mude a spec (seção 9, item 13) para que ele passe a entrar só nas contagens da execução, sem aviso, e registre a decisão em `docs/DECISOES.md`.

- [ ] **Passo 15: Registrar e commitar cada resposta assim que ela sair**

Troque o "aberto" do item pela resposta no formato das regras desta tarefa. Um commit por resposta ou por grupo de respostas do mesmo dia:
```bash
git add docs/FONTES.md docs/DECISOES.md
git commit -F - <<'EOF'
Fase 2: conferência da operação real — <assunto>

<Resposta em palavras, com números: o que a loja fez e o que o ERP gravou.
Se mudou algo no Kaizen, qual migração e por quê.>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Se uma resposta pediu migração, ela entra com o teste na tarefa dona do assunto, e o commit diz o que a releitura da noite vai preencher no passado.

---

### Tarefa 20: Fechamento da fase e implantação preparada para o dono

**Esta tarefa é do orquestrador**, não de um implementador. Ela segue `docs/AUTONOMIA.md`, "Como uma fase roda", passos 5 a 7.

Quem implementa não tem acesso à VPS (spec 7.1): a implantação é do dono, pelo roteiro `publicacao/README.md` (Tarefa 17). Por isso a fase fecha em duas etapas:
1. **Nesta sessão:** o código pronto, testado, ensaiado com o ERP de verdade (Tarefa 18), auditado e mesclado em `main`.
2. **Depois, com o dono:** ele implanta pelo roteiro e confere os seis dias com o comando `conferencia` (Tarefa 16), que imprime, em palavras, as execuções esperadas e feitas e o resultado da comparação da noite.

É o mesmo caminho de `docs/AUTONOMIA.md`, item 7, para fase que depende do que ainda não existe.

**Arquivos:**
- Criar: `docs/fases/FASE-2-relatorio.md`
- Criar (pelo subagente `auditor-de-fase`): `docs/fases/FASE-2-auditoria.md`
- Modificar: `docs/DECISOES.md` (seção "Fase 2")
- Modificar: `docs/LICOES.md` (seção "Fase 2")
- Não mexer: `OBJETIVO.md`, `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/` (são do dono)

**Interfaces:**
- Consome:
  - todas as tarefas anteriores;
  - o roteiro `publicacao/README.md` (Tarefa 17), passos 0 a 14;
  - o comando `node tradutor/principal.mts conferencia [produto ...]` (Tarefa 16), com as partes 1 a 5;
  - o ensaio (Tarefa 18) e as conferências da operação real (Tarefa 19), registrados no `FONTES.md`.
- Produz:
  - `docs/fases/FASE-2-relatorio.md`, que é o que o dono lê;
  - `docs/fases/FASE-2-auditoria.md`;
  - a branch `fase-2` mesclada em `main` e enviada ao GitHub.

- [ ] **Passo 1: Conferir que a fase está pronta localmente**

Run:
```bash
npm run verificar
git status --short
grep -n "## Ensaio da Fase 2\|## Conferências da operação real (Fase 2)" docs/FONTES.md
```
Expected:
- `tsc -p .` sem erro e `rodou M testes, esperados M`, com M igual ao número de `testes-esperados.txt`;
- nenhum arquivo do Kaizen pendente. Só podem aparecer os arquivos do dono do modo autônomo, que não entram em commit desta fase;
- as duas seções no `FONTES.md`.

- [ ] **Passo 2: Conferir as decisões da fase em `docs/DECISOES.md`**

A entrada da implantação com o dono foi registrada quando o plano foi aprovado ("A implantação na VPS e os seis dias de operação ficam com o dono..."). Confira que ela está lá:

Run: `grep -c "ficam com o dono, pelo roteiro" docs/DECISOES.md`
Expected: `1`.

Acrescente à seção "Fase 2", uma entrada por item no formato do arquivo (data · fase · o quê · por quê · o que muda se estiver errado), as pendências que só o dono resolve e que apareceram nas Tarefas 18 e 19. Por exemplo:
- conferir com a equipe se o vendedor gravado é quem atendeu;
- pedir ao suporte que apague as linhas de teste, se o ERP tiver recusado um fechamento.

- [ ] **Passo 3: Escrever `docs/fases/FASE-2-relatorio.md`**

Em português, para o dono, por números, preenchido com os valores reais (nada de "N"):

````markdown
# Fase 2 — relatório

## O que ficou pronto

- O esquema `kaizen`, com N tabelas, desenhado para o ERP novo e a Link (spec `docs/superpowers/specs/2026-09-27-fase2-esquema-e-tradutor-design.md`).
- O tradutor do ERP novo: lê o ERP só por consulta, de hora em hora das 8h às 19h e por inteiro às 22h, de segunda a sábado, e avisa pelo Telegram.
- M testes automáticos, todos passando (`npm run verificar`).
- Ensaio com o ERP de verdade em DD/MM (`docs/FONTES.md`, "Ensaio da Fase 2"): N documentos, N movimentos de estoque, N produtos, N pessoas; a comparação dos totais por dia deu zero diferença em N dias; a consulta mais lenta levou N ms (limite 30.000).
- Conferências da operação real: N respondidas, N abertas (`docs/FONTES.md`).

## O que falta, e é seu

1. Implantar na VPS pelo roteiro `publicacao/README.md`, passos 0 a 8, entre hh:10 e hh:50. O passo 1 (parar o sync do Prumo e guardar a cópia da Link fora da VPS) é o mais urgente, se ainda não foi feito. No começo do passo 6, antes de publicar, pedir ao Claude a lista dos documentos acima do corte com data anterior a 28/09 (`node --env-file=.env ferramentas/ensaio.mts antes-da-virada`, que só lê o ERP) e só seguir com o OK dele: as contas a pagar (`CP`) e os 44 ajustes de custo (`AC`) de 27/09 já estão decididos, e qualquer outro documento é seu para decidir. Se a decisão for excluir, a migração que muda o corte entra antes da primeira execução na VPS (spec 5.4 e seção 3, item 9).
2. Depois, por seis dias de operação seguidos, toda manhã, rodar o passo 13 do roteiro (comando `conferencia`) e olhar a parte 5: todas as leituras esperadas feitas (uma falha do ERP só vale se o Telegram avisou) e "zero diferença" na comparação da noite. Seis dias assim fecham o "pronto quando" da fase na VPS.
3. Conferir as partes 1 a 4 do mesmo comando com os relatórios do ERP (relatório 154, contas a pagar, fechamentos, produtos). Divergência volta como bug.
4. Pendências suas registradas em `docs/DECISOES.md`: <lista>.

## Decisões tomadas sem você nesta fase

<lista curta das entradas de `docs/DECISOES.md` da Fase 2, uma linha cada>

## Próxima fase

Quando os seis dias fecharem, a Fase 3 (tradutor do ERP anterior) pode começar numa sessão nova, com o `/goal` abaixo.

```text
/goal A Fase 3 do OBJETIVO.md está fechada, seguindo docs/AUTONOMIA.md: (1) existe spec em docs/superpowers/specs/ e plano em docs/superpowers/plans/ para a fase, e todas as tarefas do plano têm linha "complete" no ledger; (2) os testes passam (comando e contagem no transcript) e a contagem bate com a esperada no plano; (3) cada item do "pronto quando" da fase tem evidência mostrada no transcript; (4) o subagente auditor-de-fase escreveu docs/fases/FASE-3-auditoria.md com veredito APROVADA; (5) a branch fase-3 foi mesclada em main e enviada ao GitHub; (6) docs/fases/FASE-3-relatorio.md existe, em português, com os números. Ou pare após 200 turnos e escreva em docs/fases/FASE-3-relatorio.md o que ficou pronto e o que falta.
```
````

- [ ] **Passo 4: Despachar o auditor de fase**

Despache o subagente `auditor-de-fase` (`subagent_type: auditor-de-fase`, sem passar `model`), em contexto limpo, com este pedido:
> "Audite a Fase 2 do Kaizen. A spec é `docs/superpowers/specs/2026-09-27-fase2-esquema-e-tradutor-design.md` e o plano é `docs/superpowers/plans/2026-09-27-fase2-tradutor.md`. A implantação na VPS é do dono, pela decisão registrada em `docs/DECISOES.md`; confira se essa decisão está sustentada pela spec e se todo o resto do 'pronto quando' tem evidência. Escreva `docs/fases/FASE-2-auditoria.md`."

Expected: o arquivo existe e começa com `APROVADA` ou `REPROVADA`.
- **REPROVADA num item que não depende da VPS:** corrija com uma tarefa nova (implementador e revisor, pelo `subagent-driven-development`) e despache o auditor de novo.
- **REPROVADA duas vezes no mesmo item, sem ideia nova:** escreva "PARADO:" no relatório com o motivo (`docs/AUTONOMIA.md`, "As únicas três paradas").
- **Reprovação só pelos itens na VPS:** eles ficam como a etapa do dono no relatório (passo 3), e a decisão do passo 2 é citada.

- [ ] **Passo 5: Registrar as lições em `docs/LICOES.md`**

Acrescente à seção "Fase 2" uma linha por coisa que deu errado nesta fase, com evidência (tarefa, commit ou item da auditoria) e a regra que teria evitado, no formato do arquivo (data · fase · o que aconteceu · evidência · regra que evitaria). Se não houve nada, escreva "nada a registrar nesta fase".

- [ ] **Passo 6: Commit do fechamento**

```bash
git add docs/fases/FASE-2-relatorio.md docs/fases/FASE-2-auditoria.md docs/DECISOES.md docs/LICOES.md
git commit -F - <<'EOF'
Fase 2 fechada nesta sessão: tradutor pronto e implantação com o dono

O tradutor do ERP novo está pronto, com M testes passando, ensaiado com
o ERP de verdade (zero diferença na comparação dos totais) e auditado. O
relatório em docs/fases/FASE-2-relatorio.md diz o que falta e é do dono:
implantar na VPS pelo roteiro e conferir seis dias de operação com o
comando de conferência.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Passo 7: Mesclar em `main` e enviar ao GitHub**

Use a skill superpowers:finishing-a-development-branch. Em modo autônomo, a escolha é sempre mesclar `fase-2` em `main` e enviar (`docs/AUTONOMIA.md`, "Fim da fase"), sem perguntar.

Run:
```bash
git checkout main
git merge --no-ff fase-2 -m "Fase 2: mescla a branch fase-2"
npm run verificar
git push origin main
```
Expected:
- o merge sem conflito;
- `rodou M testes, esperados M` em `main`;
- o push terminando sem erro.

Force push é proibido (travas do dono).
