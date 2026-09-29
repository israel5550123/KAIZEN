import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar, emTransacao } from './banco.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import { codigosSemTraducao } from './conferencias.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { executar } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerDocumentosFaixa } from './leitura.mts'
import { gravarNaturezas, lerNaturezas } from './natureza.mts'
import { lerColunasEsperadas, modeloErp } from './sql-erp.mts'
import type { Aviso, Cortes } from './tipos.mts'

// As naturezas medidas no ERP em 28/09 (spec da Fase 4, seção 2.1), como natureza_operacao as grava: flags 'T'/'F'.
const NATUREZAS = [
  { _idempresa: 1, _idnatureza: 530, descricao: 'PEDIDO DE VENDA', tipocategoria: 'V', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
  { _idempresa: 1, _idnatureza: 520, descricao: 'ORÇAMENTO', tipocategoria: 'V', flagmovimentarestoque: 'F', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'F' },
  { _idempresa: 1, _idnatureza: 500, descricao: 'PRE-VENDA', tipocategoria: 'V', flagmovimentarestoque: 'T', flagreservaestoque: 'T', flagmovimentarfinanceiro: 'F' },
  { _idempresa: 1, _idnatureza: 5, descricao: 'COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO', tipocategoria: 'C', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
  { _idempresa: 1, _idnatureza: 900, descricao: 'TROCA DE MERCADORIA', tipocategoria: 'C', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
]

// A configuração do ERP desde 25/09: a troca de mercadoria é a natureza 900.
const TROCA_900 = [{ _idempresa: 1, idnaturezatrocamercadoria: 900 }]

// Só o corte do documento importa aqui; o dos filhos fica em 0.
const CORTES: Cortes = {
  documento: 184, documento_mercadoria: 0, documento_pagamento: 0, documento_parcela: 0,
  documento_parcela_pagamento: 0, documento_conferencia_caixa: 0, documento_cancelamento_historico: 0,
  mercadoria_estoque_historico: 0,
}

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
let banco: BancoTeste
let falso: ErpFalso

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  await falso.cliente.query(`truncate ${TABELAS_DO_ERP.join(', ')}`)
  // restart identity: as versões começam do 1 em cada teste.
  await banco.cliente.query('truncate kaizen.natureza, kaizen.documento, kaizen.execucao restart identity cascade')
})

// Um pedido do ERP novo, na forma da tabela documento; cada teste troca o que precisa.
function documento(oid: number, codigo: number, natureza: number | null, campos: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    oid, _iddocumento: codigo, idempresa: 1, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idnaturezaoperacao: natureza,
    ...campos,
  }
}

// A leitura como a execução faz: as duas consultas ao ERP, e na mesma transação as naturezas antes dos documentos.
async function lerEGravar(): Promise<Aviso[]> {
  const naturezas = await lerNaturezas(falso.erp)
  const documentos = await lerDocumentosFaixa(falso.erp, CORTES, 185, 300)
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'naturezas', [naturezas])
    await colocarEntrada(banco.cliente, 'documentos', [documentos])
    const avisos = await gravarNaturezas(banco.cliente)
    await gravarDocumentos(banco.cliente)
    return avisos
  })
}

async function versoes(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select id::int as id, fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca
       from kaizen.natureza order by id`,
  )
  return r.rows
}

async function documentosNoKaizen(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select origem_id, modelo, natureza, natureza_id::int as natureza_id from kaizen.documento order by origem_id::bigint`,
  )
  return r.rows
}

// As 5 versões da primeira leitura, em ordem de código: 5 → 1, 500 → 2, 520 → 3, 530 → 4, 900 → 5.
const PRIMEIRAS_VERSOES = [
  { id: 1, fonte: 'meuerp', codigo: '5', descricao: 'COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO', categoria: 'C', estoque: true, reserva: false, financeiro: true, troca: false },
  { id: 2, fonte: 'meuerp', codigo: '500', descricao: 'PRE-VENDA', categoria: 'V', estoque: true, reserva: true, financeiro: false, troca: false },
  { id: 3, fonte: 'meuerp', codigo: '520', descricao: 'ORÇAMENTO', categoria: 'V', estoque: false, reserva: false, financeiro: false, troca: false },
  { id: 4, fonte: 'meuerp', codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, reserva: false, financeiro: true, troca: false },
  { id: 5, fonte: 'meuerp', codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, reserva: false, financeiro: true, troca: true },
]

test('lerNaturezas: as naturezas da empresa 1 em ordem de código, com os flags crus, e a troca da configuração', async () => {
  assert.deepEqual(JSON.parse(await lerNaturezas(falso.erp)), { naturezas: [], troca: null })
  assert.equal(falso.consultas.at(-1), modeloErp('naturezas'))
  await falso.inserir('natureza_operacao', [
    ...NATUREZAS,
    { _idempresa: 2, _idnatureza: 530, descricao: 'DE OUTRA EMPRESA', tipocategoria: 'C', flagmovimentarestoque: 'F', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'F' },
  ])
  await falso.inserir('config_entrada_saida', [...TROCA_900, { _idempresa: 2, idnaturezatrocamercadoria: 5 }])
  assert.deepEqual(JSON.parse(await lerNaturezas(falso.erp)), {
    naturezas: [
      { codigo: 5, descricao: 'COMPRA MERCADORIA COMERCIALIZACAO FORA DO ESTADO', categoria: 'C', estoque: 'T', reserva: 'F', financeiro: 'T' },
      { codigo: 500, descricao: 'PRE-VENDA', categoria: 'V', estoque: 'T', reserva: 'T', financeiro: 'F' },
      { codigo: 520, descricao: 'ORÇAMENTO', categoria: 'V', estoque: 'F', reserva: 'F', financeiro: 'F' },
      { codigo: 530, descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: 'T', reserva: 'F', financeiro: 'T' },
      { codigo: 900, descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: 'T', reserva: 'F', financeiro: 'T' },
    ],
    troca: 900,
  })
})

test('documentos: a natureza sai como o código do ERP; 0 e vazia saem vazias', async () => {
  await falso.inserir('documento', [
    documento(185, 116, 530),
    documento(186, 120, 0, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(187, 121, null, { modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P' }),
  ])
  const lidos = JSON.parse(await lerDocumentosFaixa(falso.erp, CORTES, 185, 187)) as Array<{ oid: number; natureza: number | null }>
  assert.deepEqual(lidos.map((d) => [d.oid, d.natureza]), [[185, 530], [186, null], [187, null]])
})

test('primeira leitura: uma versão por natureza, flag T vira sim, a troca vem da configuração, e nada é avisado; a mesma leitura de novo não grava nada', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual(await versoes(), PRIMEIRAS_VERSOES)
  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual(await versoes(), PRIMEIRAS_VERSOES)
})

test('sem natureza de troca na configuração (o ERP antes de 25/09), nenhuma natureza é a troca', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual((await versoes()).map((v) => [v.codigo, v.troca]), [['5', false], ['500', false], ['520', false], ['530', false], ['900', false]])
})

test('um flag muda no ERP: versão nova só daquela natureza, a antiga fica, e o aviso diz o que mudou', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  await falso.cliente.query(`update natureza_operacao set flagmovimentarfinanceiro = 'F' where _idnatureza = 530`)

  assert.deepEqual(await lerEGravar(), [{
    tipo: 'natureza_mudou',
    chave: 'natureza:530:6',
    texto: 'A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não.',
  }])
  assert.deepEqual(await versoes(), [
    ...PRIMEIRAS_VERSOES,
    { id: 6, fonte: 'meuerp', codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, reserva: false, financeiro: false, troca: false },
  ])
})

test('várias mudanças numa natureza saem numa linha, na ordem do aviso; a troca que passa para outra natureza muda as duas', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  await falso.cliente.query(
    `update natureza_operacao set descricao = 'ORCAMENTO', tipocategoria = 'C', flagmovimentarestoque = 'T',
       flagreservaestoque = 'T', flagmovimentarfinanceiro = 'T' where _idnatureza = 520`,
  )
  await falso.cliente.query('update config_entrada_saida set idnaturezatrocamercadoria = 520')

  // As versões novas saem em ordem de código: 520 → 6, 900 → 7.
  assert.deepEqual(await lerEGravar(), [
    {
      tipo: 'natureza_mudou',
      chave: 'natureza:520:6',
      texto: 'A natureza 520 (ORCAMENTO) mudou no ERP: categoria: V → C; mexe no estoque: não → sim; reserva estoque: não → sim; '
        + 'mexe no financeiro: não → sim; é a troca: não → sim; descrição: ORÇAMENTO → ORCAMENTO.',
    },
    { tipo: 'natureza_mudou', chave: 'natureza:900:7', texto: 'A natureza 900 (TROCA DE MERCADORIA) mudou no ERP: é a troca: sim → não.' },
  ])
  assert.deepEqual((await versoes()).slice(5), [
    { id: 6, fonte: 'meuerp', codigo: '520', descricao: 'ORCAMENTO', categoria: 'C', estoque: true, reserva: true, financeiro: true, troca: true },
    { id: 7, fonte: 'meuerp', codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, reserva: false, financeiro: true, troca: false },
  ])
})

test('natureza que sumiu do ERP fica como está, e a natureza nova ganha versão sem aviso', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  await falso.cliente.query('delete from natureza_operacao where _idnatureza = 500')
  await falso.inserir('natureza_operacao', [
    { _idempresa: 1, _idnatureza: 1, descricao: 'VENDA DE MERCADORIA DENTRO DO ESTADO', tipocategoria: 'V', flagmovimentarestoque: 'T', flagreservaestoque: 'F', flagmovimentarfinanceiro: 'T' },
  ])

  assert.deepEqual(await lerEGravar(), [])
  assert.deepEqual(await versoes(), [
    ...PRIMEIRAS_VERSOES,
    { id: 6, fonte: 'meuerp', codigo: '1', descricao: 'VENDA DE MERCADORIA DENTRO DO ESTADO', categoria: 'V', estoque: true, reserva: false, financeiro: true, troca: false },
  ])
})

test('documento: guarda a versão da primeira gravação; regravar com o mesmo código não troca; código novo pega a última do novo', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await falso.inserir('documento', [
    documento(185, 116, 530),
    documento(186, 120, 520, { modelo: 'OC', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(187, 121, 0, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(188, 122, 777),
  ])
  await lerEGravar()
  assert.deepEqual(await documentosNoKaizen(), [
    { origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 },
    { origem_id: '186', modelo: 'OC', natureza: '520', natureza_id: 3 },
    { origem_id: '187', modelo: 'AX', natureza: null, natureza_id: null },
    { origem_id: '188', modelo: 'PA', natureza: '777', natureza_id: null },
  ])

  // O dono tira o financeiro do pedido (530 ganha a versão 6), e o orçamento 120 vira pedido no mesmo documento.
  await falso.cliente.query(`update natureza_operacao set flagmovimentarfinanceiro = 'F' where _idnatureza = 530`)
  await falso.cliente.query(
    `update documento set modelo = 'PA', tipomovimento = 'S', tipomovimentofinanceiro = 'R', idnaturezaoperacao = 530 where oid = 186`,
  )
  await lerEGravar()
  assert.deepEqual(await documentosNoKaizen(), [
    { origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 },
    { origem_id: '186', modelo: 'PA', natureza: '530', natureza_id: 6 },
    { origem_id: '187', modelo: 'AX', natureza: null, natureza_id: null },
    { origem_id: '188', modelo: 'PA', natureza: '777', natureza_id: null },
  ])
})

test('documento gravado antes da Fase 4, sem natureza: a conferência não o acusa, e a releitura grava a natureza da versão de agora', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await lerEGravar()
  // Como a carga da Fase 2 gravou o pedido 116: sem as colunas da natureza.
  await banco.cliente.query(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
     values ('meuerp', 'documento', '185', '116', 'PA', 'E', 'S', 'R', '2026-09-28 10:15:00')`,
  )
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])

  // A leitura da noite relê o pedido, que no ERP tem a natureza 530.
  await falso.inserir('documento', [documento(185, 116, 530)])
  await lerEGravar()
  assert.deepEqual(await documentosNoKaizen(), [{ origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 }])
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])
})

test('conferência: código de natureza sem versão no Kaizen vira aviso de código sem tradução; natureza conhecida ou vazia, não', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await falso.inserir('documento', [
    documento(185, 116, 530),
    documento(186, 117, 0, { modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N' }),
    documento(187, 118, 777),
    documento(188, 119, 777),
  ])
  await lerEGravar()
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [{
    tipo: 'codigo_sem_traducao',
    chave: 'codigo:natureza:777',
    texto: 'o código "777" de natureza apareceu 2 vez(es) e não tem tradução no Kaizen',
  }])
})

// Hora cheia de Fortaleza (UTC−3), em milissegundos.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

// Roda uma execução com o relógio fingido e põe no registro a hora fingida, como em execucao.test.mts.
async function rodar(quando: number): Promise<Saida> {
  const saida = await executar(
    { tipo: 'hora', manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar: async () => true, agora: () => quando },
  )
  await banco.cliente.query(
    `update kaizen.execucao set inicio = to_timestamp($1::double precision / 1000),
       fim = to_timestamp($1::double precision / 1000) + interval '1 minute'
     where id = (select max(id) from kaizen.execucao)`,
    [quando],
  )
  return saida
}

test('execução da hora: uma consulta de naturezas, a versão gravada antes do documento, e o aviso na execução seguinte', async () => {
  await falso.inserir('natureza_operacao', NATUREZAS)
  await falso.inserir('config_entrada_saida', TROCA_900)
  await falso.inserir('documento', [documento(185, 123, 530)])
  const antes = falso.consultas.length

  const primeira = await rodar(horaEm('2026-09-29', 14))
  assert.equal(primeira.resultado, 'ok')
  assert.deepEqual(primeira.avisos, [])
  assert.equal(falso.consultas.slice(antes).filter((sql) => sql.includes('from natureza_operacao')).length, 1)
  assert.deepEqual(await documentosNoKaizen(), [{ origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 }])

  await falso.cliente.query(`update natureza_operacao set flagmovimentarfinanceiro = 'F' where _idnatureza = 530`)
  const segunda = await rodar(horaEm('2026-09-29', 15))
  assert.equal(segunda.resultado, 'aviso')
  assert.deepEqual(segunda.avisos, [{
    tipo: 'natureza_mudou',
    chave: 'natureza:530:6',
    texto: 'A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não.',
  }])
  // O pedido foi relido às 15h e continua com a versão das 14h.
  assert.deepEqual(await documentosNoKaizen(), [{ origem_id: '185', modelo: 'PA', natureza: '530', natureza_id: 4 }])
})
