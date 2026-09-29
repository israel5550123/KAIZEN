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

test('pedido 87: dinheiro, Pix e crédito na mesma venda; as parcelas a receber entram com a sequência, e a noite dá zero diferença', async () => {
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
  assert.deepEqual(await linhas(
    `select pg.origem_id, pg.sequencia, pa.origem_id as parcela, pa.status, pa.valor,
            (select count(*) from kaizen.baixa b where b.parcela_id = pa.id) as baixas
       from kaizen.documento_pagamento pg
       join kaizen.documento d on d.id = pg.documento_id and d.codigo = '87'
       left join kaizen.parcela pa on pa.documento_id = pg.documento_id and pa.sequencia = pg.sequencia
      order by pg.sequencia`), [
    { origem_id: '3', sequencia: 1, parcela: null, status: null, valor: null, baixas: '0' },
    { origem_id: '4', sequencia: 2, parcela: '2', status: 'B', valor: '40.00', baixas: '1' },
    { origem_id: '5', sequencia: 3, parcela: '1', status: 'P', valor: '30.00', baixas: '0' },
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
      documento: 15, documento_item: 11, documento_pagamento: 10, parcela: 6, baixa: 3, conferencia_caixa: 7,
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
