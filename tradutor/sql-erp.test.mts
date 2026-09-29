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

test('lerColunasEsperadas lê as 119 colunas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadas()
  // 109 até a tarefa 2 e 10 da natureza: documento.idnaturezaoperacao, 7 de natureza_operacao e 2 de config_entrada_saida.
  assert.equal(colunas.length, 119)
  assert.deepEqual(colunas[0], { tabela: 'config_entrada_saida', coluna: '_idempresa', tipo: 'integer' })
  assert.deepEqual(colunas[colunas.length - 1], { tabela: 'pessoa_funcionario', coluna: 'tipo', tipo: 'varchar' })
  for (let i = 1; i < colunas.length; i++) {
    const a = colunas[i - 1]
    const b = colunas[i]
    assert.ok(a.tabela < b.tabela || (a.tabela === b.tabela && a.coluna < b.coluna), `fora de ordem ou repetida: ${b.tabela}.${b.coluna}`)
  }
  assert.deepEqual([...new Set(colunas.map((c) => c.tipo))].sort(), ['integer', 'numeric', 'text', 'timestamp', 'varchar'])
  assert.equal(new Set(colunas.map((c) => c.tabela)).size, 24)
})
