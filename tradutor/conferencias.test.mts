import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { emTransacao } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import { codigosSemTraducao, fechamentosComResto, estoqueDiverge, avisosDeFaltas } from './conferencias.mts'

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
  await banco.cliente.query('delete from kaizen.estoque_atual')
})

async function inserirDocumento(
  fonte: 'meuerp' | 'link', origemId: string, modelo: string,
  status: string | null, movimento: string | null, financeiro: string | null,
): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
     values ($1, 'documento', $2, $2, $3, $4, $5, $6, '2026-09-29 10:00:00') returning id`,
    [fonte, origemId, modelo, status, movimento, financeiro],
  )
  return r.rows[0].id
}

async function inserirItem(documentoId: string, origemId: string, sentido: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido)
     values ($1, 'documento_mercadoria', $2, $3, '60', 1, 10.00)`,
    [documentoId, origemId, sentido],
  )
}

async function inserirPagamento(documentoId: string, origemId: string, forma: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
     values ($1, 'documento_pagamento', $2, $3, 10.00)`,
    [documentoId, origemId, forma],
  )
}

async function inserirConferencia(documentoId: string, origemId: string, forma: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, 58.00, 20.00)`,
    [documentoId, origemId, forma],
  )
}

async function inserirParcela(documentoId: string, origemId: string, status: string | null): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, valor, status)
     values ($1, 'documento_parcela', $2, 10.00, $3) returning id`,
    [documentoId, origemId, status],
  )
  return r.rows[0].id
}

async function inserirBaixa(parcelaId: string, origemId: string, forma: string | null, status: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
     values ($1, 'documento_parcela_pagamento', $2, '2026-09-29', 10.00, $3, $4)`,
    [parcelaId, origemId, forma, status],
  )
}

async function inserirMovimento(origemId: string, produto: string, momento: string, saldoAntes: string, saldoDepois: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois)
     values ('meuerp', 'mercadoria_estoque_historico', $1, $2, '1', $3, $4, $5)`,
    [origemId, produto, momento, saldoAntes, saldoDepois],
  )
}

async function inserirFoto(fonte: 'meuerp' | 'link', produto: string, quantidade: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.estoque_atual (fonte, produto, quantidade) values ($1, $2, $3)
     on conflict (fonte, produto) do update set quantidade = excluded.quantidade`,
    [fonte, produto, quantidade],
  )
}

// Um documento no formato em que o ERP o devolve (DocumentoErp, contrato seção 6), com as listas vazias.
function documentoErp(oid: number, codigo: number, modelo: string, conferenciaAbaixoCorte: number) {
  return {
    oid, codigo, modelo, status: 'E', movimento: 'N', financeiro: 'N',
    criado_em: '2026-09-29T18:00:00.000000', fechado_em: '2026-09-29T18:00:00.000000', pessoa: null,
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 3,
    itens: [], pagamentos: [], parcelas: [], conferencia: [],
    conferencia_abaixo_corte: conferenciaAbaixoCorte,
  }
}

test('codigosSemTraducao acha o modelo ZZ e a forma 99 com a contagem, e ignora traduzidos, vazios e os da Link', async () => {
  // Forma 99 (e não mais 9): a migração 014 traduziu a forma 9 (boleto) depois que este teste foi escrito.
  const a = await inserirDocumento('meuerp', '185', 'ZZ', 'E', 'S', 'R')
  await inserirItem(a, '1873', 'S')
  await inserirPagamento(a, '1', '99')
  await inserirPagamento(a, '2', '1')
  const b = await inserirDocumento('meuerp', '186', 'ZZ', null, null, null)
  await inserirItem(b, '1874', null)
  await inserirConferencia(b, '31', '99')
  await inserirConferencia(b, '32', '5')
  const c = await inserirDocumento('meuerp', '187', 'CP', 'E', 'N', 'P')
  const parcela = await inserirParcela(c, '1', 'P')
  await inserirBaixa(parcela, '1', '99', 'E')
  await inserirBaixa(parcela, '2', null, null)
  const daLink = await inserirDocumento('link', '9001', 'XX', 'Q', null, null)
  await inserirPagamento(daLink, '3', '77')

  assert.deepEqual(await codigosSemTraducao(banco.cliente), [
    {
      tipo: 'codigo_sem_traducao',
      chave: 'codigo:forma:99',
      texto: 'o código "99" de forma apareceu 3 vez(es) e não tem tradução no Kaizen',
    },
    {
      tipo: 'codigo_sem_traducao',
      chave: 'codigo:tipo:ZZ',
      texto: 'o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen',
    },
  ])
})

test('codigosSemTraducao avisa os códigos deixados de fora de propósito: modelos AM e RU, financeiro E, baixa X', async () => {
  const a = await inserirDocumento('meuerp', '185', 'AM', 'E', 'N', 'E')
  const parcela = await inserirParcela(a, '1', 'P')
  await inserirBaixa(parcela, '1', '1', 'X')
  await inserirDocumento('meuerp', '186', 'RU', 'E', 'N', 'N')

  const avisos = await codigosSemTraducao(banco.cliente)
  assert.deepEqual(avisos.map((a) => a.chave), [
    'codigo:financeiro:E',
    'codigo:status_baixa:X',
    'codigo:tipo:AM',
    'codigo:tipo:RU',
  ])
})

test('codigosSemTraducao sem código novo não avisa nada', async () => {
  const a = await inserirDocumento('meuerp', '185', 'PA', 'E', 'S', 'R')
  await inserirItem(a, '1873', 'S')
  await inserirPagamento(a, '1', '1')
  await inserirPagamento(a, '2', '2')
  const fc = await inserirDocumento('meuerp', '186', 'FC', 'E', 'N', 'N')
  await inserirConferencia(fc, '31', '5')
  const tm = await inserirDocumento('meuerp', '187', 'TM', 'E', 'E', 'P')
  const parcela = await inserirParcela(tm, '1', 'B')
  await inserirBaixa(parcela, '1', '1', 'C')
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])
})

test('fechamentosComResto, dentro da transação da carga, avisa o fechamento com 2 linhas de conferência de teste', async () => {
  const avisos = await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([
      documentoErp(230, 118, 'FC', 2),
      documentoErp(231, 140, 'FC', 0),
      documentoErp(232, 141, 'PA', 0),
    ])])
    await gravarDocumentos(banco.cliente)
    return fechamentosComResto(banco.cliente)
  })
  assert.deepEqual(avisos, [{
    tipo: 'fechamento_com_resto',
    chave: 'fechamento:230',
    texto: 'o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável',
  }])
})

test('fechamentosComResto não avisa o ajuste de custo que pegou o número 98 de um resto de teste', async () => {
  const avisos = await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([documentoErp(189, 98, 'AC', 3)])])
    await gravarDocumentos(banco.cliente)
    return fechamentosComResto(banco.cliente)
  })
  assert.deepEqual(avisos, [])
})

test('fechamentosComResto fora da transação da carga falha: os documentos lidos só existem até o commit', async () => {
  await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([documentoErp(230, 118, 'FC', 2)])])
    await gravarDocumentos(banco.cliente)
  })
  await assert.rejects(fechamentosComResto(banco.cliente), /relation "pg_temp\.doc_lido" does not exist/)
})

test('estoqueDiverge: o último movimento que bate com a foto não avisa, mesmo com outra quantidade de casas', async () => {
  await inserirMovimento('1848', '2138', '2026-09-28 10:00:00', '48.000000', '47.000000')
  await inserirFoto('meuerp', '2138', '47')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [])
})

test('estoqueDiverge: o último movimento que não bate com a foto avisa com o produto, o movimento e a foto', async () => {
  await inserirMovimento('1848', '2138', '2026-09-28 10:00:00', '48.000000', '47.000000')
  await inserirMovimento('1900', '2138', '2026-09-28 15:48:00', '-9.000000', '-10.000000')
  await inserirFoto('meuerp', '2138', '-9.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:2138:1900:-9.000000',
    texto: 'o saldo do produto 2138 no ERP (-9.000000) não bate com os movimentos (-10.000000)',
  }])
})

test('estoqueDiverge: sem movimento, vale o saldo da virada (produto 60 tinha 3)', async () => {
  await inserirFoto('meuerp', '2138', '48.000000')
  await inserirFoto('meuerp', '61', '0')
  await inserirFoto('link', '60', '999')
  await inserirFoto('meuerp', '60', '3')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [])

  // o saldo mudou no ERP sem deixar linha no histórico, como no inventário "TESTE" de 26/09
  await inserirFoto('meuerp', '60', '0.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:60:virada:0.000000',
    texto: 'o saldo do produto 60 no ERP (0.000000) não bate com os movimentos (3.000000)',
  }])
})

test('estoqueDiverge: fora da virada e sem movimento, o saldo esperado é 0', async () => {
  await inserirFoto('meuerp', '99999', '0.000000')
  await inserirFoto('meuerp', '88888', '2.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:88888:virada:2.000000',
    texto: 'o saldo do produto 88888 no ERP (2.000000) não bate com os movimentos (0)',
  }])
})

test('estoqueDiverge: o último movimento é o de maior oid, não o de maior momento', async () => {
  // o 10000 foi gravado depois, com a hora antiga do orçamento; 9999 viria antes em ordem de texto
  await inserirMovimento('9999', '5278', '2026-09-28 15:48:00', '0.000000', '-1.000000')
  await inserirMovimento('10000', '5278', '2026-09-28 15:09:00', '-1.000000', '-2.000000')
  await inserirFoto('meuerp', '5278', '-2.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [])

  await inserirFoto('meuerp', '5278', '-1.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:5278:10000:-1.000000',
    texto: 'o saldo do produto 5278 no ERP (-1.000000) não bate com os movimentos (-2.000000)',
  }])
})

test('estoqueDiverge: produto com movimento e sem foto avisa com "sem foto"', async () => {
  await inserirMovimento('1849', '1418', '2026-09-28 11:00:00', '0.000000', '-1.000000')
  assert.deepEqual(await estoqueDiverge(banco.cliente), [{
    tipo: 'estoque_diverge',
    chave: 'estoque:1418:1849:sem foto',
    texto: 'o saldo do produto 1418 no ERP (sem foto) não bate com os movimentos (-1.000000)',
  }])
})

test('avisosDeFaltas dá um aviso por horário que não aconteceu', () => {
  assert.deepEqual(avisosDeFaltas([]), [])
  assert.deepEqual(avisosDeFaltas([{ data: '2026-09-29', hora: 22 }, { data: '2026-09-30', hora: 8 }]), [
    { tipo: 'execucao_faltou', chave: 'faltou:2026-09-29:22', texto: 'a leitura das 22h de 29/09 não aconteceu' },
    { tipo: 'execucao_faltou', chave: 'faltou:2026-09-30:8', texto: 'a leitura das 8h de 30/09 não aconteceu' },
  ])
})
