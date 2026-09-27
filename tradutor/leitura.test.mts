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
