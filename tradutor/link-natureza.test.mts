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
