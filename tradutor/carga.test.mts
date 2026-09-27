import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { emTransacao } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import type { CargaDocumentos } from './carga.mts'

// O formato é o DocumentoErp do contrato: inteiros crus, valores em texto, datas como o ERP escreve dentro do JSON.
type ItemErp = { oid: number; produto: number; quantidade: string | null; valor_liquido: string | null; vendedor: number | null }
type PagamentoErp = { oid: number; forma: number; valor: string }
type BaixaErp = { oid: number; pago_em: string | null; valor: string; forma: number | null; status: string | null }
type ParcelaErp = {
  oid: number; lancado_em: string | null; vencimento: string | null; valor: string
  status: string | null; descricao: string | null; baixas: BaixaErp[]
}
type ConferenciaErp = { oid: number; forma: number; calculado: string | null; informado: string | null }
type DocumentoErp = {
  oid: number; codigo: number; modelo: string; status: string | null; movimento: string | null; financeiro: string | null
  criado_em: string; fechado_em: string | null; pessoa: number | null
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null
  itens: ItemErp[]; pagamentos: PagamentoErp[]; parcelas: ParcelaErp[]; conferencia: ConferenciaErp[]
  conferencia_abaixo_corte: number
}

function documento(oid: number, codigo: number, resto: Partial<DocumentoErp> = {}): DocumentoErp {
  return {
    oid, codigo, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-28T14:00:03.123456', fechado_em: '2026-09-28T14:05:10', pessoa: 999007,
    turno_caixa: 10, turno_usuario: 18152, turno_numero: 3,
    itens: [], pagamentos: [], parcelas: [], conferencia: [], conferencia_abaixo_corte: 0,
    ...resto,
  }
}

// Devolução em dinheiro (como o TM 63): item volta, parcela a pagar baixada na hora em dinheiro.
const devolucao = documento(185, 63, {
  modelo: 'TM', movimento: 'E', financeiro: 'P',
  criado_em: '2026-09-28T15:30:00', fechado_em: '2026-09-28T15:30:00',
  turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
  itens: [{ oid: 1873, produto: 1362, quantidade: '1.000000', valor_liquido: '18.00', vendedor: 1 }],
  pagamentos: [{ oid: 1, forma: 1, valor: '18.00' }],
  parcelas: [{
    oid: 1, lancado_em: '2026-09-28T15:30:00', vencimento: '2026-09-28T00:00:00', valor: '18.00',
    status: 'B', descricao: 'Troca de Mercadoria - Retirada',
    baixas: [{ oid: 1, pago_em: '2026-09-28T15:30:00', valor: '18.00', forma: 1, status: 'E' }],
  }],
})

// Fechamento de caixa (como o FC 98): conferência às cegas, uma linha por forma.
const fechamento = documento(186, 98, {
  modelo: 'FC', movimento: 'N', financeiro: 'N', pessoa: null,
  criado_em: '2026-09-28T18:00:00', fechado_em: '2026-09-28T18:00:00',
  turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
  conferencia: [
    { oid: 31, forma: 1, calculado: '58.00', informado: '20.00' },
    { oid: 32, forma: 5, calculado: '77.00', informado: null },
  ],
})

// Pedido com troco (como o 116): dinheiro positivo e o troco negativo.
const pedidoComTroco = documento(187, 116, {
  itens: [{ oid: 1874, produto: 2138, quantidade: '1.000000', valor_liquido: '45.00', vendedor: 1 }],
  pagamentos: [{ oid: 2, forma: 1, valor: '50.00' }, { oid: 3, forma: 1, valor: '-5.00' }],
})

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.cliente.query('delete from kaizen.documento')
})

async function carregar(...partes: DocumentoErp[][]): Promise<CargaDocumentos> {
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', partes.map((p) => JSON.stringify(p)))
    return gravarDocumentos(banco.cliente)
  })
}

async function linhas(sql: string): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql)).rows
}

test('grava documento com itens, pagamentos, parcelas com baixas e conferência', async () => {
  assert.deepEqual(await carregar([devolucao, fechamento]), { lidos: 2, novos: 2 })

  assert.deepEqual(await linhas(
    `select fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em, fechado_em,
            pessoa, turno_caixa, turno_usuario, turno_numero
       from kaizen.documento order by origem_id`,
  ), [
    {
      fonte: 'meuerp', origem_tabela: 'documento', origem_id: '185', codigo: '63', modelo: 'TM', status: 'E',
      movimento: 'E', financeiro: 'P', criado_em: '2026-09-28 15:30:00', fechado_em: '2026-09-28 15:30:00',
      pessoa: '999007', turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
    },
    {
      fonte: 'meuerp', origem_tabela: 'documento', origem_id: '186', codigo: '98', modelo: 'FC', status: 'E',
      movimento: 'N', financeiro: 'N', criado_em: '2026-09-28 18:00:00', fechado_em: '2026-09-28 18:00:00',
      pessoa: null, turno_caixa: 1, turno_usuario: 18152, turno_numero: 2,
    },
  ])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
       from kaizen.documento_item i join kaizen.documento d on d.id = i.documento_id`,
  ), [{
    documento: '185', origem_tabela: 'documento_mercadoria', origem_id: '1873', sentido: 'E', produto: '1362',
    quantidade: '1.000000', valor_liquido: '18.00', vendedor: '1',
  }])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, p.origem_tabela, p.origem_id, p.forma, p.valor
       from kaizen.documento_pagamento p join kaizen.documento d on d.id = p.documento_id`,
  ), [{ documento: '185', origem_tabela: 'documento_pagamento', origem_id: '1', forma: '1', valor: '18.00' }])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, p.origem_tabela, p.origem_id, p.lancado_em, p.vencimento, p.valor, p.status, p.descricao
       from kaizen.parcela p join kaizen.documento d on d.id = p.documento_id`,
  ), [{
    documento: '185', origem_tabela: 'documento_parcela', origem_id: '1', lancado_em: '2026-09-28',
    vencimento: '2026-09-28', valor: '18.00', status: 'B', descricao: 'Troca de Mercadoria - Retirada',
  }])

  assert.deepEqual(await linhas(
    `select p.origem_id as parcela, b.origem_tabela, b.origem_id, b.pago_em, b.valor, b.forma, b.status
       from kaizen.baixa b join kaizen.parcela p on p.id = b.parcela_id`,
  ), [{
    parcela: '1', origem_tabela: 'documento_parcela_pagamento', origem_id: '1', pago_em: '2026-09-28',
    valor: '18.00', forma: '1', status: 'E',
  }])

  assert.deepEqual(await linhas(
    `select d.origem_id as documento, c.origem_tabela, c.origem_id, c.forma, c.calculado, c.informado
       from kaizen.conferencia_caixa c join kaizen.documento d on d.id = c.documento_id order by c.origem_id`,
  ), [
    { documento: '186', origem_tabela: 'documento_conferencia_caixa', origem_id: '31', forma: '1', calculado: '58.00', informado: '20.00' },
    { documento: '186', origem_tabela: 'documento_conferencia_caixa', origem_id: '32', forma: '5', calculado: '77.00', informado: null },
  ])
})

test('zero vira vazio no vendedor e nos turnos', async () => {
  await carregar([documento(185, 54, {
    turno_caixa: 0, turno_usuario: 0, turno_numero: 0,
    itens: [
      { oid: 1873, produto: 60, quantidade: '1.000000', valor_liquido: '77.00', vendedor: 0 },
      { oid: 1874, produto: 61, quantidade: '1.000000', valor_liquido: '10.00', vendedor: null },
      { oid: 1875, produto: 62, quantidade: '1.000000', valor_liquido: '10.00', vendedor: 999005 },
    ],
  })])
  assert.deepEqual(
    await linhas('select turno_caixa, turno_usuario, turno_numero from kaizen.documento'),
    [{ turno_caixa: null, turno_usuario: null, turno_numero: null }],
  )
  assert.deepEqual(
    await linhas('select origem_id, vendedor from kaizen.documento_item order by origem_id'),
    [{ origem_id: '1873', vendedor: null }, { origem_id: '1874', vendedor: null }, { origem_id: '1875', vendedor: '999005' }],
  )
})

test('datas com e sem fração de segundo: parcela e baixa viram date, e o horário do documento não se desloca', async () => {
  // Dentro do JSON o ERP escreve a fração só quando ela existe: '...T11:05:03', '...T11:00:00.5', '...T23:59:59.999999'.
  await carregar([
    documento(185, 5, {
      modelo: 'CP', movimento: 'N', financeiro: 'P',
      criado_em: '2026-09-28T23:59:59.999999', fechado_em: null,
      parcelas: [{
        oid: 1, lancado_em: '2026-04-15T10:20:30', vencimento: '2026-10-05T00:00:00', valor: '1500.00',
        status: 'B', descricao: 'aluguel',
        baixas: [{ oid: 1, pago_em: '2026-09-29T23:59:59.999999', valor: '1500.00', forma: 2, status: 'E' }],
      }, {
        oid: 2, lancado_em: '2026-04-15T10:20:30.5', vencimento: null, valor: '10.00',
        status: 'P', descricao: null, baixas: [],
      }],
    }),
    documento(186, 6, { criado_em: '2026-09-28T11:00:00.5', fechado_em: '2026-09-28T11:05:03' }),
  ])
  assert.deepEqual(
    await linhas('select origem_id, criado_em, fechado_em from kaizen.documento order by origem_id'),
    [
      { origem_id: '185', criado_em: '2026-09-28 23:59:59.999999', fechado_em: null },
      { origem_id: '186', criado_em: '2026-09-28 11:00:00.5', fechado_em: '2026-09-28 11:05:03' },
    ],
  )
  assert.deepEqual(
    await linhas('select origem_id, lancado_em, vencimento from kaizen.parcela order by origem_id'),
    [
      { origem_id: '1', lancado_em: '2026-04-15', vencimento: '2026-10-05' },
      { origem_id: '2', lancado_em: '2026-04-15', vencimento: null },
    ],
  )
  assert.deepEqual(await linhas('select pago_em from kaizen.baixa'), [{ pago_em: '2026-09-29' }])
})

test('cada baixa fica ligada à sua parcela', async () => {
  const baixa = (oid: number): BaixaErp => ({ oid, pago_em: '2026-09-30T09:00:00', valor: '100.00', forma: 1, status: 'E' })
  const parcela = (oid: number, baixas: BaixaErp[]): ParcelaErp => ({
    oid, lancado_em: '2026-09-01T00:00:00', vencimento: '2026-09-30T00:00:00', valor: '100.00',
    status: 'B', descricao: null, baixas,
  })
  await carregar([
    documento(185, 5, { modelo: 'CP', movimento: 'N', financeiro: 'P', parcelas: [parcela(10, [baixa(20)]), parcela(11, [baixa(21), baixa(22)])] }),
    documento(186, 6, { modelo: 'CP', movimento: 'N', financeiro: 'P', parcelas: [parcela(12, [baixa(23)])] }),
  ])
  assert.deepEqual(await linhas(
    `select d.origem_id as documento, p.origem_id as parcela, b.origem_id as baixa
       from kaizen.baixa b
       join kaizen.parcela p on p.id = b.parcela_id
       join kaizen.documento d on d.id = p.documento_id
      order by b.origem_id`,
  ), [
    { documento: '185', parcela: '10', baixa: '20' },
    { documento: '185', parcela: '11', baixa: '21' },
    { documento: '185', parcela: '11', baixa: '22' },
    { documento: '186', parcela: '12', baixa: '23' },
  ])
})

test('reler o documento com um item a menos, outro pagamento e a baixa estornada troca os filhos inteiros', async () => {
  const parcela = (status: string, baixas: BaixaErp[]): ParcelaErp => ({
    oid: 50, lancado_em: '2026-09-28T15:09:00', vencimento: '2026-09-28T00:00:00', valor: '144.00',
    status, descricao: null, baixas,
  })
  await carregar([documento(185, 58, {
    itens: [
      { oid: 1900, produto: 2138, quantidade: '1.000000', valor_liquido: '119.00', vendedor: 1 },
      { oid: 1901, produto: 5278, quantidade: '1.000000', valor_liquido: '25.00', vendedor: 1 },
    ],
    pagamentos: [{ oid: 40, forma: 1, valor: '144.00' }],
    parcelas: [parcela('B', [{ oid: 60, pago_em: '2026-09-28T15:48:00', valor: '144.00', forma: 1, status: 'E' }])],
  })])
  await carregar([documento(185, 58, {
    itens: [{ oid: 1900, produto: 2138, quantidade: '1.000000', valor_liquido: '119.00', vendedor: 1 }],
    pagamentos: [{ oid: 41, forma: 2, valor: '119.00' }],
    parcelas: [parcela('P', [])],
  })])
  assert.deepEqual(await linhas('select origem_id, produto from kaizen.documento_item'), [{ origem_id: '1900', produto: '2138' }])
  assert.deepEqual(await linhas('select origem_id, forma, valor from kaizen.documento_pagamento'), [{ origem_id: '41', forma: '2', valor: '119.00' }])
  assert.deepEqual(await linhas('select origem_id, status from kaizen.parcela'), [{ origem_id: '50', status: 'P' }])
  assert.deepEqual(await linhas('select count(*) as quantas from kaizen.baixa'), [{ quantas: '0' }])
})

test('na releitura, visto_em e o id do documento não mudam, e o documento não conta como novo', async () => {
  assert.deepEqual(await carregar([pedidoComTroco]), { lidos: 1, novos: 1 })
  const [antes] = await linhas('select id, visto_em from kaizen.documento')
  // venda cancelada depois de lida: o mesmo oid volta com outro status
  assert.deepEqual(await carregar([{ ...pedidoComTroco, status: 'C' }]), { lidos: 1, novos: 0 })
  const [depois] = await linhas('select id, visto_em, status from kaizen.documento')
  assert.deepEqual(depois, { id: antes.id, visto_em: antes.visto_em, status: 'C' })
})

test('rodar duas vezes com o mesmo ERP deixa o mesmo conteúdo', async () => {
  const tabelas = ['documento', 'documento_item', 'documento_pagamento', 'parcela', 'baixa', 'conferencia_caixa']
  async function foto(): Promise<Record<string, string[]>> {
    const resultado: Record<string, string[]> = {}
    for (const tabela of tabelas) {
      const r = await banco.cliente.query<{ linha: string }>(
        `select (to_jsonb(x) - 'id' - 'parcela_id' - 'lido_em')::text as linha from kaizen.${tabela} x order by 1`,
      )
      resultado[tabela] = r.rows.map((l) => l.linha)
    }
    return resultado
  }
  await carregar([devolucao, fechamento, pedidoComTroco])
  const primeira = await foto()
  await carregar([devolucao, fechamento, pedidoComTroco])
  const segunda = await foto()
  assert.equal(primeira.documento.length, 3)
  assert.equal(primeira.documento_pagamento.length, 3)
  assert.equal(primeira.baixa.length, 1)
  assert.deepEqual(segunda, primeira)
})

test('o mesmo oid em duas partes vira um documento só, com a leitura da última parte', async () => {
  const rascunho = documento(185, 70, {
    status: 'R',
    itens: [{ oid: 1873, produto: 60, quantidade: '1.000000', valor_liquido: '10.00', vendedor: 1 }],
  })
  const emitido = documento(185, 70, {
    status: 'E',
    itens: [
      { oid: 1873, produto: 60, quantidade: '1.000000', valor_liquido: '10.00', vendedor: 1 },
      { oid: 1874, produto: 61, quantidade: '2.000000', valor_liquido: '20.00', vendedor: 1 },
    ],
  })
  assert.deepEqual(await carregar([rascunho], [emitido, pedidoComTroco]), { lidos: 2, novos: 2 })
  assert.deepEqual(await linhas('select origem_id, status from kaizen.documento order by origem_id'), [
    { origem_id: '185', status: 'E' },
    { origem_id: '187', status: 'E' },
  ])
  assert.deepEqual(await linhas(
    `select count(*) as itens from kaizen.documento_item i join kaizen.documento d on d.id = i.documento_id where d.origem_id = '185'`,
  ), [{ itens: '2' }])
})

test('documento com as listas vazias grava só o cabeçalho', async () => {
  assert.deepEqual(await carregar([documento(185, 84, { modelo: 'LP', movimento: 'N', financeiro: 'N' })]), { lidos: 1, novos: 1 })
  assert.deepEqual(await linhas(
    `select (select count(*) from kaizen.documento) as documentos,
            (select count(*) from kaizen.documento_item) as itens,
            (select count(*) from kaizen.documento_pagamento) as pagamentos,
            (select count(*) from kaizen.parcela) as parcelas,
            (select count(*) from kaizen.baixa) as baixas,
            (select count(*) from kaizen.conferencia_caixa) as conferencias`,
  ), [{ documentos: '1', itens: '0', pagamentos: '0', parcelas: '0', baixas: '0', conferencias: '0' }])
})

test('item sem quantidade e sem valor (ajuste de custo AC) e item sem valor (ajuste de estoque AS) gravam', async () => {
  await carregar([
    documento(185, 94, {
      modelo: 'AC', movimento: 'N', financeiro: 'N', turno_caixa: null, turno_usuario: null, turno_numero: null,
      itens: [{ oid: 1873, produto: 60, quantidade: null, valor_liquido: null, vendedor: null }],
    }),
    documento(186, 138, {
      modelo: 'AS', movimento: 'E', financeiro: 'N', turno_caixa: null, turno_usuario: null, turno_numero: null,
      itens: [{ oid: 1874, produto: 61, quantidade: '2.000000', valor_liquido: null, vendedor: null }],
    }),
  ])
  assert.deepEqual(await linhas('select origem_id, sentido, produto, quantidade, valor_liquido, vendedor from kaizen.documento_item order by origem_id'), [
    { origem_id: '1873', sentido: 'N', produto: '60', quantidade: null, valor_liquido: null, vendedor: null },
    { origem_id: '1874', sentido: 'E', produto: '61', quantidade: '2.000000', valor_liquido: null, vendedor: null },
  ])
})

test('valores com 6 casas e acima de 2^53 ficam exatos', async () => {
  await carregar([documento(185, 200, {
    itens: [{ oid: 1873, produto: 60, quantidade: '0.123456', valor_liquido: '12345678901234.123456', vendedor: 1 }],
    pagamentos: [{ oid: 1, forma: 1, valor: '-0.000001' }],
    conferencia: [{ oid: 31, forma: 1, calculado: '99999999.999999', informado: '0.000000' }],
  })])
  assert.deepEqual(await linhas('select quantidade, valor_liquido from kaizen.documento_item'), [
    { quantidade: '0.123456', valor_liquido: '12345678901234.123456' },
  ])
  assert.deepEqual(await linhas('select valor from kaizen.documento_pagamento'), [{ valor: '-0.000001' }])
  assert.deepEqual(await linhas('select calculado, informado from kaizen.conferencia_caixa'), [
    { calculado: '99999999.999999', informado: '0.000000' },
  ])
})
