import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verificarSomenteLeitura } from './somente-leitura.mts'

const PALAVRAS_PROIBIDAS = [
  'insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke',
  'copy', 'call', 'do', 'execute', 'lock', 'set', 'reset', 'refresh', 'comment', 'nextval', 'setval',
  'pg_sleep', 'dblink', 'into', 'share', 'set_config',
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
  // Famílias de funções: o começo da palavra basta (spec 6.1: pg_sleep, lo_ e dblink).
  recusa("select dblink_exec('dbname=erp', 'del' || 'ete from documento') as dados")
  recusa("select dblink_connect('c', 'dbname=erp') as dados")
  recusa("select dblink_send_query('c', 'select 1') as dados")
  recusa("select pg_sleep_for('40 seconds') as dados")
  recusa("select pg_sleep_until(now() + interval '40 seconds') as dados")
  // Mexem na sessão, criam tabela ou prendem linhas.
  recusa("select set_config('default_transaction_read_only', 'off', false) as dados")
  recusa('select oid as dados into nova_tabela from documento')
  recusa('select oid as dados from documento for share')
  recusa('select oid as dados from documento for key share')
  // Mexem no servidor ou em outras sessões: como palavra ou começo de palavra.
  recusa('select pg_terminate_backend(123) as dados')
  recusa('select pg_cancel_backend(123) as dados')
  recusa('select pg_reload_conf() as dados')
  recusa("select pg_notify('canal', 'x') as dados")
  recusa('select pg_advisory_lock(1) as dados')
  recusa('select pg_advisory_lock_shared(1) as dados')
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
