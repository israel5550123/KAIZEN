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
