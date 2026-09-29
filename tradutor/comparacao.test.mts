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

test('parcelas e baixas de uma venda (financeiro R) entram nos dois lados da comparação', async () => {
  // Venda no cartão de crédito depois da mudança de 26/09: o ERP grava uma conta a receber, que o Kaizen agora copia.
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
  assert.equal(parcelasNoKaizen.rows[0].n, '1')
  const doDia = (await totaisDoErp(1_000_000, 1_000_000)).filter((t) => t.medida.startsWith('parcelas:') || t.medida.startsWith('baixas:'))
  assert.deepEqual(doDia, [
    { dia: '2026-09-29', medida: 'baixas:quantidade', valor: '1' },
    { dia: '2026-09-29', medida: 'baixas:valor', valor: '59.50' },
    { dia: '2026-09-29', medida: 'parcelas:quantidade', valor: '1' },
    { dia: '2026-09-29', medida: 'parcelas:valor', valor: '59.50' },
  ])
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
