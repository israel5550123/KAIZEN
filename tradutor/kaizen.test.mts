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
