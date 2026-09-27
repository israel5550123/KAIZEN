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
