import { after, afterEach, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import {
  inserirBaixa, inserirConferencia, inserirDocumento, inserirItem, inserirNatureza, inserirPagamento, inserirParcela,
} from './apoio-regras.mts'
import { responder } from './indicadores.mts'

// A regra do financeiro (sql/regras/financeiro.sql; spec da Fase 4, seção 8.4 e decisão 16), num banco de teste
// com documentos montados à mão. Cada teste roda numa transação desfeita no fim: um não vê os documentos do outro.
// Formas cruas do ERP novo: 1 dinheiro, 2 e 6 pix, 3 e 7 crédito, 4 e 8 débito, 5 troca (vale).
// Da Link: Dinheiro e 1.1.1.01 dinheiro, Pix, Cartao/true crédito, Cartao/false débito, cartao, cheque,
// 1.1.1.02.01 banco, 2.1.2.03 troca. Parcela: P pendente e C cancelada (Link: false pendente); baixa: E válida
// e C cancelada (Link: true válida).
let banco: BancoTeste
let c: Cliente
const natureza: Record<string, number> = {}

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo com os flags medidos em 28/09 (spec, seção 2.1); a da Link vem da migração 011.
  natureza.pedido = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza.nota = await inserirNatureza(c, { codigo: '5', categoria: 'C', estoque: true, financeiro: true })
  natureza.troca = await inserirNatureza(c, {
    codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, financeiro: true, troca: true,
  })
  const { rows } = await c.query<{ id: string }>(`select id from kaizen.natureza where fonte = 'link' and codigo = 'pedido'`)
  natureza.pedidoLink = Number(rows[0].id)
})

beforeEach(async () => {
  await c.query('begin')
})

afterEach(async () => {
  await c.query('rollback')
})

after(async () => {
  await banco?.fechar()
})

type Fonte = 'meuerp' | 'link'
type Pagamentos = Array<[forma: string, valor: string]>

async function pagar(documento: number, pagamentos: Pagamentos): Promise<number> {
  for (const [forma, valor] of pagamentos) await inserirPagamento(c, documento, { forma, valor })
  return documento
}

// Venda: o pedido 530 no ERP novo; na Link, o pedido com o caixa ativo (status 'false').
async function venda(momento: string, pagamentos: Pagamentos, fonte: Fonte = 'meuerp'): Promise<number> {
  const id = fonte === 'meuerp'
    ? await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza.pedido, criadoEm: momento })
    : await inserirDocumento(c, {
        fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'pedido', naturezaId: natureza.pedidoLink, criadoEm: momento,
      })
  return pagar(id, pagamentos)
}

// Troca do ERP novo (natureza 900): o dinheiro devolvido é o pagamento na forma 1.
async function troca(momento: string, pagamentos: Pagamentos): Promise<number> {
  const id = await inserirDocumento(c, { modelo: 'TM', natureza: '900', naturezaId: natureza.troca, criadoEm: momento })
  return pagar(id, pagamentos)
}

// Documento sem natureza (sangria, suprimento, fechamento, conta), pelo modelo cru da fonte.
async function semNatureza(modelo: string, momento: string, pagamentos: Pagamentos = [], fonte: Fonte = 'meuerp'): Promise<number> {
  const id = await inserirDocumento(c, { fonte, modelo, status: fonte === 'link' ? null : 'E', criadoEm: momento })
  return pagar(id, pagamentos)
}

// Conta a pagar como as da virada: lançada em 01/09 (CP no ERP novo, 2.1.2.02 na Link). No ERP novo, o documento
// importado fecha em 28/09, e a parcela guarda a data do lançamento: a posição olha a data da parcela.
async function conta(fonte: Fonte = 'meuerp'): Promise<number> {
  return fonte === 'meuerp'
    ? inserirDocumento(c, { modelo: 'CP', criadoEm: '2026-09-01 00:00:00', fechadoEm: '2026-09-28 10:00:00' })
    : inserirDocumento(c, { fonte: 'link', modelo: '2.1.2.02', status: null, criadoEm: '2026-09-01 00:00:00', fechadoEm: null })
}

async function parcela(documento: number, vencimento: string, valor: string, status = 'P', lancadoEm = '2026-09-01'): Promise<number> {
  return inserirParcela(c, documento, { lancadoEm, vencimento, valor, status })
}

// Venda de R$ 500,00 em 05/10/2026 (spec do boleto a receber, seção 3): R$ 100,00 no Pix, sequência 1, baixado
// no ato (parcela já nasce baixada, status 'B'); R$ 400,00 no boleto, sequência 2, parcela pendente (status 'P',
// vencimento 20/10). Devolve a parcela do boleto, para o teste acrescentar a baixa dela.
async function vendaComBoleto(): Promise<number> {
  const id = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza.pedido, criadoEm: '2026-10-05 10:00:00' })
  await inserirItem(c, id, { produto: '60', sentido: 'S', quantidade: '1', valor: '500.00' })
  await inserirPagamento(c, id, { forma: '2', valor: '100.00', sequencia: 1 })
  const pix = await inserirParcela(c, id, { lancadoEm: '2026-10-05', vencimento: '2026-10-05', valor: '100.00', status: 'B', sequencia: 1 })
  await inserirBaixa(c, pix, { pagoEm: '2026-10-05', valor: '100.00', forma: '2', status: 'E' })
  await inserirPagamento(c, id, { forma: '9', valor: '400.00', sequencia: 2 })
  return inserirParcela(c, id, { lancadoEm: '2026-10-05', vencimento: '2026-10-20', valor: '400.00', status: 'P', sequencia: 2 })
}

const semEntrada = { dinheiro: 0, pix: 0, credito: 0, debito: 0, cartao: 0, outras: 0 }

// O dia n dias depois de `dia` (AAAA-MM-DD): só a conta do calendário.
function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, d + n)).toISOString().slice(0, 10)
}

// Os 30 dias do fluxo previsto depois de `dia`, zerados, com as linhas pedidas trocadas.
function previsto(dia: string, linhas: Record<string, { entradas?: number; saidas?: number }> = {}) {
  return Array.from({ length: 30 }, (_, i) => {
    const data = somarDias(dia, i + 1)
    return { data, entradas: linhas[data]?.entradas ?? 0, saidas: linhas[data]?.saidas ?? 0 }
  })
}

test('um dia sem nada (domingo, 04/10/2026) sai inteiro, com zeros, listas vazias e saldo e folgas vazios, sem erro', async () => {
  const zero = { parcelas: 0, valor: 0 }
  assert.deepEqual(await responder(c, 'financeiro', '2026-10-04'), {
    fonte: 'meuerp',
    contas_a_pagar: { vencidas: zero, ate_7_dias: zero, ate_30_dias: zero, total: zero, por_vencimento: [] },
    saldo_banco: null,
    folga_7: null,
    folga_30: null,
    fluxo_realizado: { dia: { entradas: semEntrada, saidas: 0 }, mes: { entradas: semEntrada, saidas: 0 } },
    recebiveis_cartao: { credito_em: '2026-10-05', valor: 0 },
    fluxo_previsto: previsto('2026-10-04'),
    caixa: { fechamentos: [], gaveta: { vendas_dinheiro: 0, suprimentos: 0, sangrias: 0, devolucoes_dinheiro: 0, gaveta: 0 } },
  })
})

test('a posição troca de fonte na virada: da mesma dívida, 25/09 usa só a Link e 26/09 só o ERP novo', async () => {
  // A Link com as 3 parcelas abertas em 25/09; no ERP novo, as 2 que venciam antes de 28/09 foram excluídas (C).
  const link = await conta('link')
  await parcela(link, '2026-09-24', '1000.00', 'false')
  await parcela(link, '2026-09-27', '2000.00', 'false')
  await parcela(link, '2026-10-20', '3000.00', 'false')
  const erp = await conta()
  await parcela(erp, '2026-09-24', '1000.00', 'C')
  await parcela(erp, '2026-09-27', '2000.00', 'C')
  await parcela(erp, '2026-10-20', '3000.00')

  const dia25 = await responder(c, 'financeiro', '2026-09-25')
  assert.equal(dia25.fonte, 'link')
  // 25/09: vencida a de 24/09; até 7 dias (25/09 a 02/10) a de 27/09; até 30 (até 25/10) a de 27/09 e a de 20/10.
  assert.deepEqual(dia25.contas_a_pagar, {
    vencidas: { parcelas: 1, valor: 1000 },
    ate_7_dias: { parcelas: 1, valor: 2000 },
    ate_30_dias: { parcelas: 2, valor: 5000 },
    total: { parcelas: 3, valor: 6000 },
    por_vencimento: [
      { vencimento: '2026-09-24', parcelas: 1, valor: 1000 },
      { vencimento: '2026-09-27', parcelas: 1, valor: 2000 },
      { vencimento: '2026-10-20', parcelas: 1, valor: 3000 },
    ],
  })

  const dia26 = await responder(c, 'financeiro', '2026-09-26')
  assert.equal(dia26.fonte, 'meuerp')
  // 26/09: só a de 20/10 do ERP novo, dentro de 30 dias (até 26/10) e fora de 7 (até 03/10).
  assert.deepEqual(dia26.contas_a_pagar, {
    vencidas: { parcelas: 0, valor: 0 },
    ate_7_dias: { parcelas: 0, valor: 0 },
    ate_30_dias: { parcelas: 1, valor: 3000 },
    total: { parcelas: 1, valor: 3000 },
    por_vencimento: [{ vencimento: '2026-10-20', parcelas: 1, valor: 3000 }],
  })
})

test('contas a pagar em 06/10: vencidas, até 7 dias, até 30 dias e total, com os limites, e por vencimento', async () => {
  const cp = await conta()
  await parcela(cp, '2026-10-01', '100.00') // vencida
  await parcela(cp, '2026-10-05', '200.50') // vencida
  await parcela(cp, '2026-10-06', '300.00') // vence no dia: até 7 e até 30
  await parcela(cp, '2026-10-13', '400.00') // dia + 7: até 7 e até 30
  await parcela(cp, '2026-10-14', '500.00') // dia + 8: só até 30
  await parcela(cp, '2026-11-05', '600.00') // dia + 30: até 30
  await parcela(cp, '2026-11-06', '700.00') // dia + 31: só no total
  // A nota de entrada (natureza 5, papel compra) também é conta, e vence no mesmo dia que a de 400,00.
  const nota = await inserirDocumento(c, { modelo: '55', natureza: '5', naturezaId: natureza.nota, criadoEm: '2026-10-02 09:00:00' })
  await parcela(nota, '2026-10-13', '50.25', 'P', '2026-10-02')

  const { contas_a_pagar } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(contas_a_pagar, {
    vencidas: { parcelas: 2, valor: 300.5 }, // 100,00 + 200,50
    ate_7_dias: { parcelas: 3, valor: 750.25 }, // 300,00 + 400,00 + 50,25
    ate_30_dias: { parcelas: 5, valor: 1850.25 }, // 750,25 + 500,00 + 600,00
    total: { parcelas: 8, valor: 2850.75 }, // 300,50 + 1.850,25 + 700,00
    por_vencimento: [
      { vencimento: '2026-10-01', parcelas: 1, valor: 100 },
      { vencimento: '2026-10-05', parcelas: 1, valor: 200.5 },
      { vencimento: '2026-10-06', parcelas: 1, valor: 300 },
      { vencimento: '2026-10-13', parcelas: 2, valor: 450.25 },
      { vencimento: '2026-10-14', parcelas: 1, valor: 500 },
      { vencimento: '2026-11-05', parcelas: 1, valor: 600 },
      { vencimento: '2026-11-06', parcelas: 1, valor: 700 },
    ],
  })
})

test('fora da posição: parcela cancelada, conta cancelada, lançada depois do dia, já quitada, crédito de troca e sangria', async () => {
  const cp = await conta()
  await parcela(cp, '2026-10-10', '999.00', 'C') // parcela cancelada
  await parcela(cp, '2026-10-10', '777.00', 'P', '2026-10-07') // lançada depois do dia
  const quitada = await parcela(cp, '2026-10-10', '500.00')
  await inserirBaixa(c, quitada, { pagoEm: '2026-10-02', valor: '500.00', forma: '2', status: 'E' })
  await parcela(cp, '2026-10-20', '123.45') // a única em aberto
  const cancelada = await inserirDocumento(c, { modelo: 'CP', status: 'C', criadoEm: '2026-09-01 00:00:00' })
  await parcela(cancelada, '2026-10-10', '888.00')
  // O crédito de troca e a sangria têm parcela, mas não são conta.
  const credito = await troca('2026-10-03 10:00:00', [['5', '666.00']])
  await parcela(credito, '2026-10-10', '666.00', 'P', '2026-10-03')
  const sangria = await semNatureza('RS', '2026-10-03 11:00:00', [['1', '55.00']])
  await parcela(sangria, '2026-10-10', '55.00', 'P', '2026-10-03')

  const { contas_a_pagar } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(contas_a_pagar.total, { parcelas: 1, valor: 123.45 })
  assert.deepEqual(contas_a_pagar.por_vencimento, [{ vencimento: '2026-10-20', parcelas: 1, valor: 123.45 }])
})

test('baixa parcial: fica em aberto o que falta; a baixa cancelada e a baixa depois do dia não contam', async () => {
  const cp = await conta()
  const p = await parcela(cp, '2026-10-10', '1000.00')
  await inserirBaixa(c, p, { pagoEm: '2026-10-02', valor: '400.00', forma: '2', status: 'E' })
  await inserirBaixa(c, p, { pagoEm: '2026-10-03', valor: '250.00', forma: '2', status: 'C' }) // cancelada
  await inserirBaixa(c, p, { pagoEm: '2026-10-07', valor: '100.00', forma: '2', status: 'E' }) // depois de 06/10

  // 06/10: 1.000,00 − 400,00 = 600,00, que vence em 10/10 (até 7 dias). 07/10: − 100,00 = 500,00.
  const dia6 = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(dia6.contas_a_pagar.ate_7_dias, { parcelas: 1, valor: 600 })
  assert.deepEqual(dia6.contas_a_pagar.total, { parcelas: 1, valor: 600 })
  const dia7 = await responder(c, 'financeiro', '2026-10-07')
  assert.deepEqual(dia7.contas_a_pagar.total, { parcelas: 1, valor: 500 })
})

test('saldo do banco e folga: vale o último saldo digitado até o dia; sem saldo, saldo e folgas vazios', async () => {
  const cp = await conta()
  await parcela(cp, '2026-10-02', '1000.00') // vencida em 06/10
  await parcela(cp, '2026-10-10', '2000.00') // até 7 dias
  await parcela(cp, '2026-10-30', '4000.00') // até 30 dias
  await parcela(cp, '2026-11-20', '8000.00') // depois de 30 dias

  const semSaldo = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual([semSaldo.saldo_banco, semSaldo.folga_7, semSaldo.folga_30], [null, null, null])

  await c.query(`insert into kaizen.saldo_banco (data, valor) values ('2026-10-05', '5000.00'), ('2026-10-07', '99999.00')`)
  const comSaldo = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(comSaldo.saldo_banco, { data: '2026-10-05', valor: 5000 })
  assert.equal(comSaldo.folga_7, 2000) // 5.000,00 − (1.000,00 + 2.000,00)
  assert.equal(comSaldo.folga_30, -2000) // 5.000,00 − (1.000,00 + 2.000,00 + 4.000,00)
})

test('a venda no cartão do dia D entra no realizado e no previsto de D+1, e não no realizado de D', async () => {
  await venda('2026-10-05 10:00:00', [['2', '70.00'], ['3', '150.00'], ['4', '25.00']])

  const d = await responder(c, 'financeiro', '2026-10-05')
  assert.deepEqual(d.fluxo_realizado.dia.entradas, { ...semEntrada, pix: 70 })
  assert.deepEqual(d.recebiveis_cartao, { credito_em: '2026-10-06', valor: 175 }) // 150,00 + 25,00
  assert.deepEqual(d.fluxo_previsto[0], { data: '2026-10-06', entradas: 175, saidas: 0 })

  const d1 = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(d1.fluxo_realizado.dia.entradas, { ...semEntrada, credito: 150, debito: 25 })
  assert.deepEqual(d1.fluxo_realizado.mes.entradas, { ...semEntrada, pix: 70, credito: 150, debito: 25 })
})

test('entradas por forma no ERP novo: pix 2 e 6, crédito 3 e 7, débito 4 e 8, dinheiro 1; o vale (5) fica fora', async () => {
  await venda('2026-10-05 10:00:00', [['2', '70.00'], ['3', '150.00'], ['4', '25.00']])
  await venda('2026-10-06 09:30:00', [
    ['1', '100.00'], ['2', '200.00'], ['6', '50.00'], ['3', '300.00'], ['7', '20.00'], ['4', '80.00'], ['8', '10.00'], ['5', '40.00'],
  ])

  const d6 = await responder(c, 'financeiro', '2026-10-06')
  // Dia: dinheiro e pix de 06/10; crédito e débito da venda de 05/10.
  assert.deepEqual(d6.fluxo_realizado.dia, { entradas: { ...semEntrada, dinheiro: 100, pix: 250, credito: 150, debito: 25 }, saidas: 0 })
  // Mês até 06/10: pix 70,00 + 250,00; o cartão de 06/10 só entra em 07/10.
  assert.deepEqual(d6.fluxo_realizado.mes, { entradas: { ...semEntrada, dinheiro: 100, pix: 320, credito: 150, debito: 25 }, saidas: 0 })
  assert.deepEqual(d6.recebiveis_cartao, { credito_em: '2026-10-07', valor: 410 }) // 300 + 20 + 80 + 10

  const d7 = await responder(c, 'financeiro', '2026-10-07')
  assert.deepEqual(d7.fluxo_realizado.dia.entradas, { ...semEntrada, credito: 320, debito: 90 })
})

test('entradas da Link: o dinheiro devolvido já vem negativo, cheque e banco vão para outras, o vale (2.1.2.03) fica fora', async () => {
  await venda('2026-09-15 16:20:00', [
    ['Dinheiro', '30.00'], ['1.1.1.01', '-10.00'], ['Pix', '40.00'], ['Cartao/true', '50.00'], ['Cartao/false', '60.00'],
    ['cartao', '70.00'], ['cheque', '80.00'], ['1.1.1.02.01', '90.00'], ['2.1.2.03', '25.00'],
  ], 'link')

  const d15 = await responder(c, 'financeiro', '2026-09-15')
  assert.deepEqual(d15.fluxo_realizado.dia.entradas, { ...semEntrada, dinheiro: 20, pix: 40, outras: 170 }) // 30 − 10; 80 + 90
  assert.deepEqual(d15.recebiveis_cartao, { credito_em: '2026-09-16', valor: 180 }) // 50 + 60 + 70
  const d16 = await responder(c, 'financeiro', '2026-09-16')
  assert.deepEqual(d16.fluxo_realizado.dia.entradas, { ...semEntrada, credito: 50, debito: 60, cartao: 70 })
})

test('os pagamentos das contas a pagar (CP, forma 1) não entram nas entradas nem na gaveta', async () => {
  const cp = await inserirDocumento(c, { modelo: 'CP', criadoEm: '2026-10-06 08:00:00' })
  await inserirPagamento(c, cp, { forma: '1', valor: '5000.00' })
  await parcela(cp, '2026-10-30', '5000.00', 'P', '2026-10-06')
  await venda('2026-10-06 09:00:00', [['1', '100.00']])

  const r = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(r.fluxo_realizado.dia.entradas, { ...semEntrada, dinheiro: 100 })
  assert.deepEqual(r.caixa.gaveta, { vendas_dinheiro: 100, suprimentos: 0, sangrias: 0, devolucoes_dinheiro: 0, gaveta: 100 })
})

test('saídas: baixas válidas das contas pela data da baixa, menos a forma troca, mais o dinheiro devolvido nas trocas', async () => {
  const cp = await conta()
  const p = await parcela(cp, '2026-10-10', '1000.00')
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '300.00', forma: '1', status: 'E' })
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '200.00', forma: '2', status: 'E' })
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '150.00', forma: '2', status: 'C' }) // cancelada
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '50.00', forma: '5', status: 'E' }) // forma troca
  await inserirBaixa(c, p, { pagoEm: '2026-10-05', valor: '100.00', forma: '2', status: 'E' }) // outro dia do mês
  const nota = await inserirDocumento(c, { modelo: '55', natureza: '5', naturezaId: natureza.nota, criadoEm: '2026-10-01 09:00:00' })
  const pn = await parcela(nota, '2026-10-06', '70.00', 'P', '2026-10-01')
  await inserirBaixa(c, pn, { pagoEm: '2026-10-06', valor: '70.00', forma: '2', status: 'E' })
  // A baixa da sangria não é saída: a sangria não é conta.
  const sangria = await semNatureza('RS', '2026-10-06 11:00:00', [['1', '96.00']])
  const ps = await parcela(sangria, '2026-10-06', '96.00', 'B', '2026-10-06')
  await inserirBaixa(c, ps, { pagoEm: '2026-10-06', valor: '96.00', forma: '1', status: 'E' })
  // A troca devolveu 18,00 em dinheiro; os 30,00 de vale (forma 5) não são saída.
  await troca('2026-10-06 15:00:00', [['1', '18.00'], ['5', '30.00']])

  const r = await responder(c, 'financeiro', '2026-10-06')
  assert.equal(r.fluxo_realizado.dia.saidas, 588) // 300 + 200 + 70 + 18
  assert.equal(r.fluxo_realizado.mes.saidas, 688) // 588 + 100 de 05/10
})

test('uma troca com R$ 18,00 devolvidos em dinheiro aumenta as saídas em 18,00 e diminui a gaveta em 18,00', async () => {
  await venda('2026-10-06 09:00:00', [['1', '100.00']])
  const cp = await conta()
  const p = await parcela(cp, '2026-10-10', '300.00')
  await inserirBaixa(c, p, { pagoEm: '2026-10-06', valor: '300.00', forma: '2', status: 'E' })

  const antes = await responder(c, 'financeiro', '2026-10-06')
  assert.equal(antes.fluxo_realizado.dia.saidas, 300)
  assert.equal(antes.caixa.gaveta.gaveta, 100)

  await troca('2026-10-06 15:00:00', [['1', '18.00']])
  const depois = await responder(c, 'financeiro', '2026-10-06')
  assert.equal(depois.fluxo_realizado.dia.saidas, 318)
  assert.deepEqual(depois.caixa.gaveta, { vendas_dinheiro: 100, suprimentos: 0, sangrias: 0, devolucoes_dinheiro: 18, gaveta: 82 })
})

test('gaveta: vendas em dinheiro com o troco negativo + suprimentos − sangrias − dinheiro das trocas, nas duas fontes', async () => {
  // ERP novo, 06/10: 150,00 − 20,00 de troco; o pix não é gaveta; a venda de 05/10 é de outro dia.
  await venda('2026-10-06 09:00:00', [['1', '150.00'], ['1', '-20.00'], ['2', '45.00']])
  await venda('2026-10-05 09:00:00', [['1', '999.00']])
  await semNatureza('SF', '2026-10-06 07:00:00', [['1', '200.00']])
  await semNatureza('SD', '2026-10-06 13:00:00', [['1', '50.00']])
  await semNatureza('RS', '2026-10-06 11:00:00', [['1', '96.00']])
  await semNatureza('RT', '2026-10-06 17:00:00', [['1', '104.00']])
  await troca('2026-10-06 15:00:00', [['1', '18.00']])
  const erp = await responder(c, 'financeiro', '2026-10-06')
  // 130 + 250 − 200 − 18 = 162
  assert.deepEqual(erp.caixa.gaveta, { vendas_dinheiro: 130, suprimentos: 250, sangrias: 200, devolucoes_dinheiro: 18, gaveta: 162 })

  // Link, 15/09: 50,00 − 30,00 devolvidos (1.1.1.01 negativo); suprimento e sangria no 1.1.1.01.
  await venda('2026-09-15 10:00:00', [['Dinheiro', '50.00'], ['1.1.1.01', '-30.00']], 'link')
  await semNatureza('Suprimento/true', '2026-09-15 07:30:00', [['1.1.1.01', '100.00']], 'link')
  await semNatureza('Sangria/true', '2026-09-15 12:00:00', [['1.1.1.01', '40.00']], 'link')
  const link = await responder(c, 'financeiro', '2026-09-15')
  // 20 + 100 − 40 − 0 = 80
  assert.deepEqual(link.caixa.gaveta, { vendas_dinheiro: 20, suprimentos: 100, sangrias: 40, devolucoes_dinheiro: 0, gaveta: 80 })
})

test('fechamentos do dia: quebra = informado − calculado, por forma e por fechamento, sem a forma troca', async () => {
  const f1 = await inserirDocumento(c, { modelo: 'FC', codigo: '301', criadoEm: '2026-10-06 12:00:00' })
  await inserirConferencia(c, f1, { forma: '1', calculado: '500.00', informado: '495.00' })
  await inserirConferencia(c, f1, { forma: '2', calculado: '1200.00', informado: '1200.00' })
  await inserirConferencia(c, f1, { forma: '6', calculado: '100.00', informado: '110.00' }) // também pix
  await inserirConferencia(c, f1, { forma: '3', calculado: '30.50', informado: '0.00' })
  await inserirConferencia(c, f1, { forma: '4', calculado: '63.00', informado: '63.00' })
  await inserirConferencia(c, f1, { forma: '5', calculado: '40.00', informado: '0.00' }) // troca: fora
  const f2 = await inserirDocumento(c, { modelo: 'FC', codigo: '305', criadoEm: '2026-10-06 18:00:00' })
  await inserirConferencia(c, f2, { forma: '1', calculado: '80.00', informado: '80.00' })
  // Fora: o fechamento cancelado e o de outro dia.
  const cancelado = await inserirDocumento(c, { modelo: 'FC', codigo: '302', status: 'C', criadoEm: '2026-10-06 12:05:00' })
  await inserirConferencia(c, cancelado, { forma: '1', calculado: '10.00', informado: '0.00' })
  const outroDia = await inserirDocumento(c, { modelo: 'FC', codigo: '290', criadoEm: '2026-10-05 18:00:00' })
  await inserirConferencia(c, outroDia, { forma: '1', calculado: '10.00', informado: '0.00' })

  const { caixa } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(caixa.fechamentos, [
    {
      codigo: '301',
      quebra: -25.5, // −30,50 + 0 − 5,00 + 10,00
      formas: [
        { forma: 'credito', calculado: 30.5, informado: 0, quebra: -30.5 },
        { forma: 'debito', calculado: 63, informado: 63, quebra: 0 },
        { forma: 'dinheiro', calculado: 500, informado: 495, quebra: -5 },
        { forma: 'pix', calculado: 1300, informado: 1310, quebra: 10 }, // formas 2 e 6
      ],
    },
    { codigo: '305', quebra: 0, formas: [{ forma: 'dinheiro', calculado: 80, informado: 80, quebra: 0 }] },
  ])
})

// Correção da revisão (item 4): fechamento da Link (fonte pela decisão 16), com as formas cruas dela.
test('fechamento da Link em 15/09: dinheiro, pix e cartao entram na quebra; a nota promissória (troca) fica fora; um FC do ERP novo no mesmo dia não aparece', async () => {
  const f = await inserirDocumento(c, { fonte: 'link', modelo: 'caixa_fechamento', status: null, codigo: '77', criadoEm: '2026-09-15 18:00:00' })
  await inserirConferencia(c, f, { forma: 'dinheiro', calculado: '500.00', informado: '480.00' })
  await inserirConferencia(c, f, { forma: 'pix', calculado: '100.00', informado: '110.00' })
  await inserirConferencia(c, f, { forma: 'cartao', calculado: '200.00', informado: '200.00' })
  await inserirConferencia(c, f, { forma: 'nota_promissoria', calculado: '50.00', informado: '0.00' }) // troca: fora
  // Um FC do ERP novo no mesmo dia: a fonte de 15/09 (antes de 26/09) é a Link, então esse fechamento não aparece.
  const fcNovo = await inserirDocumento(c, { modelo: 'FC', codigo: '900', criadoEm: '2026-09-15 19:00:00' })
  await inserirConferencia(c, fcNovo, { forma: '1', calculado: '10.00', informado: '10.00' })

  const { caixa } = await responder(c, 'financeiro', '2026-09-15')
  assert.deepEqual(caixa.fechamentos, [
    {
      codigo: '77',
      quebra: -10, // -20,00 (dinheiro) + 10,00 (pix) + 0 (cartão)
      formas: [
        { forma: 'cartao', calculado: 200, informado: 200, quebra: 0 },
        { forma: 'dinheiro', calculado: 500, informado: 480, quebra: -20 },
        { forma: 'pix', calculado: 100, informado: 110, quebra: 10 },
      ],
    },
  ])
})

test('um mês que começa na Link e termina no ERP novo soma as entradas e as saídas das duas fontes', async () => {
  // Link: pix em 02/09; débito em 25/09, que entra em 26/09; uma baixa em 10/09.
  await venda('2026-09-02 10:00:00', [['Pix', '1000.00']], 'link')
  await venda('2026-09-25 17:00:00', [['Cartao/false', '200.00']], 'link')
  const contaLink = await conta('link')
  const pl = await parcela(contaLink, '2026-09-10', '500.00', 'true')
  await inserirBaixa(c, pl, { pagoEm: '2026-09-10', valor: '500.00', forma: '1.1.1.02.01', status: 'true' })
  // ERP novo: venda e baixa em 28/09.
  await venda('2026-09-28 09:00:00', [['2', '300.00'], ['1', '40.00']])
  const cp = await conta()
  const pe = await parcela(cp, '2026-10-10', '1000.00')
  await inserirBaixa(c, pe, { pagoEm: '2026-09-28', valor: '250.00', forma: '2', status: 'E' })
  // Fora: o teste do dono no ERP novo em 25/09, dia da Link.
  await venda('2026-09-25 11:00:00', [['2', '999.00']])
  await inserirBaixa(c, pe, { pagoEm: '2026-09-25', valor: '88.00', forma: '2', status: 'E' })

  const d26 = await responder(c, 'financeiro', '2026-09-26')
  assert.deepEqual(d26.fluxo_realizado.dia.entradas, { ...semEntrada, debito: 200 }) // o cartão da Link de 25/09

  const d29 = await responder(c, 'financeiro', '2026-09-29')
  assert.equal(d29.fonte, 'meuerp')
  assert.deepEqual(d29.fluxo_realizado, {
    dia: { entradas: semEntrada, saidas: 0 },
    // pix 1.000,00 (Link) + 300,00 (ERP novo); saídas 500,00 (Link) + 250,00 (ERP novo)
    mes: { entradas: { ...semEntrada, dinheiro: 40, pix: 1300, debito: 200 }, saidas: 750 },
  })
})

test('fluxo previsto: os 30 dias depois do dia, com os recebíveis de cartão e as contas que vencem em cada um', async () => {
  await venda('2026-10-06 10:00:00', [['3', '300.00']])
  const cp = await conta()
  await parcela(cp, '2026-10-01', '100.00') // vencida: fora do previsto
  await parcela(cp, '2026-10-06', '200.00') // vence no próprio dia: fora do previsto
  await parcela(cp, '2026-10-07', '400.00')
  await parcela(cp, '2026-10-20', '500.00')
  await parcela(cp, '2026-10-20', '60.00')
  await parcela(cp, '2026-11-05', '600.00') // dia + 30: o último do previsto
  await parcela(cp, '2026-11-06', '700.00') // dia + 31: fora

  const { fluxo_previsto } = await responder(c, 'financeiro', '2026-10-06')
  assert.deepEqual(fluxo_previsto, previsto('2026-10-06', {
    '2026-10-07': { entradas: 300, saidas: 400 },
    '2026-10-20': { saidas: 560 },
    '2026-11-05': { saidas: 600 },
  }))
})

test('boleto: só o Pix (R$ 100,00) entra em 05/10; sem baixa ainda, outras fica em 0,00 até em 18/10 (decisão do dono, 29/09)', async () => {
  await vendaComBoleto()
  const d5 = await responder(c, 'financeiro', '2026-10-05')
  assert.deepEqual(d5.fluxo_realizado.dia.entradas, { ...semEntrada, pix: 100 })
  const d18 = await responder(c, 'financeiro', '2026-10-18')
  assert.deepEqual(d18.fluxo_realizado.dia.entradas, semEntrada)
})

test('boleto: a baixa de R$ 400,00 em 18/10 (forma 9, status E) entra em outras nesse dia e no mês, sem mudar o Pix de 05/10', async () => {
  const parcelaBoleto = await vendaComBoleto()
  await inserirBaixa(c, parcelaBoleto, { pagoEm: '2026-10-18', valor: '400.00', forma: '9', status: 'E' })

  const d18 = await responder(c, 'financeiro', '2026-10-18')
  assert.deepEqual(d18.fluxo_realizado.dia.entradas, { ...semEntrada, outras: 400 })
  assert.deepEqual(d18.fluxo_realizado.mes.entradas, { ...semEntrada, pix: 100, outras: 400 })
})

test('boleto: baixa parcial em 10/10 (150,00) e 18/10 (250,00) soma outras em cada dia e os 400,00 no mês', async () => {
  const parcelaBoleto = await vendaComBoleto()
  await inserirBaixa(c, parcelaBoleto, { pagoEm: '2026-10-10', valor: '150.00', forma: '9', status: 'E' })
  await inserirBaixa(c, parcelaBoleto, { pagoEm: '2026-10-18', valor: '250.00', forma: '9', status: 'E' })

  const d10 = await responder(c, 'financeiro', '2026-10-10')
  assert.deepEqual(d10.fluxo_realizado.dia.entradas, { ...semEntrada, outras: 150 })
  const d18 = await responder(c, 'financeiro', '2026-10-18')
  assert.deepEqual(d18.fluxo_realizado.dia.entradas, { ...semEntrada, outras: 250 })
  assert.deepEqual(d18.fluxo_realizado.mes.entradas, { ...semEntrada, pix: 100, outras: 400 })
})

test('boleto: a baixa estornada (status C) não entra em outras', async () => {
  const parcelaBoleto = await vendaComBoleto()
  await inserirBaixa(c, parcelaBoleto, { pagoEm: '2026-10-18', valor: '400.00', forma: '9', status: 'C' })

  const d18 = await responder(c, 'financeiro', '2026-10-18')
  assert.deepEqual(d18.fluxo_realizado.dia.entradas, semEntrada)
})

test('boleto: a parcela do boleto pendente (sem baixa) não entra nas contas a pagar de 05/10', async () => {
  await vendaComBoleto()
  const d5 = await responder(c, 'financeiro', '2026-10-05')
  assert.deepEqual(d5.contas_a_pagar.total, { parcelas: 0, valor: 0 })
})
