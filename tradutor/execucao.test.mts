import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import type { Cliente } from './banco.mts'
import { TRAVA } from './constantes.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { executar, motivoDe, registrarEstouro } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import type { Enviar } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'
import type { MotivoFalha, TipoExecucao } from './tipos.mts'

let banco: BancoTeste
let falso: ErpFalso
let enviadas: string[] = []

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
  // Sem estatísticas, o Postgres compila a consulta de cadastros com JIT: 1,5 s por chamada em vez de milissegundos.
  await falso.cliente.query('set jit = off')
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  enviadas = []
  await falso.cliente.query(TABELAS_DO_ERP.map((tabela) => `delete from ${tabela}`).join('; '))
  await banco.cliente.query(
    `truncate kaizen.documento, kaizen.estoque_movimento, kaizen.estoque_atual, kaizen.produto,
       kaizen.produto_fornecedor, kaizen.pessoa, kaizen.funcionario, kaizen.execucao restart identity cascade`,
  )
})

// Telegram falso: guarda cada mensagem e diz que o Telegram aceitou.
async function enviar(texto: string): Promise<boolean> {
  enviadas.push(texto)
  return true
}

// Hora cheia de Fortaleza (UTC−3), em milissegundos: horaEm('2026-09-29', 14) é terça, 14h.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

const TERCA = '2026-09-29'

async function maiorId(): Promise<number> {
  const r = await banco.cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao')
  return Number(r.rows[0].id ?? 0)
}

type OpcoesRodar = {
  tipo?: TipoExecucao; manual?: boolean; pastaMigracoes?: string; conectarKaizen?: () => Promise<Cliente>; enviar?: Enviar
}

// Roda uma execução com o relógio fingido e, depois, põe no registro a hora fingida (o Postgres grava a hora de verdade).
async function rodar(quando: number, erp: Erp = falso.erp, opcoes: OpcoesRodar = {}): Promise<Saida> {
  const antes = await maiorId()
  const saida = await executar(
    { tipo: opcoes.tipo ?? 'hora', manual: opcoes.manual ?? false },
    {
      erp,
      conectarKaizen: opcoes.conectarKaizen ?? (() => conectar(banco.url)),
      enviar: opcoes.enviar ?? enviar,
      agora: () => quando,
      pastaMigracoes: opcoes.pastaMigracoes,
    },
  )
  await banco.cliente.query(
    `update kaizen.execucao
        set inicio = to_timestamp($1::double precision / 1000),
            fim = to_timestamp($1::double precision / 1000) + interval '1 minute'
      where id > $2 and fim is not null`,
    [quando, antes],
  )
  return saida
}

async function execucoes(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select id::int as id, tipo, manual, resultado, mensagem, contagens, avisos, telegram_ok, fim is not null as terminou
       from kaizen.execucao order by id`,
  )
  return r.rows
}

// O conteúdo do Kaizen que uma falha não pode mudar.
async function fotografia(): Promise<unknown> {
  const r = await banco.cliente.query(`
    select
      (select coalesce(json_agg(json_build_object('id', d.id, 'origem_id', d.origem_id, 'status', d.status, 'visto_em', d.visto_em::text) order by d.id), '[]')
         from kaizen.documento d) as documentos,
      (select coalesce(json_agg(json_build_object('documento_id', i.documento_id, 'produto', i.produto, 'valor', i.valor_liquido::text) order by i.id), '[]')
         from kaizen.documento_item i) as itens,
      (select coalesce(json_agg(json_build_object('produto', a.produto, 'quantidade', a.quantidade::text) order by a.produto), '[]')
         from kaizen.estoque_atual a) as foto,
      (select count(*) from kaizen.estoque_movimento) as movimentos`)
  return r.rows[0]
}

// Uma terça de loja no ERP falso: a abertura do caixa, o pedido 123 (R$ 150,00 em dinheiro, vendedor Igor),
// o movimento de estoque dele, a foto do estoque que bate com o movimento, e os cadastros.
async function montarLoja(): Promise<void> {
  await falso.inserir('documento', [
    {
      oid: 185, _iddocumento: 120, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
      datahora: '2026-09-29 08:02:00', datahoramovimento: '2026-09-29 08:02:00', idempresa: 1, idpessoa: 999007,
      idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
    },
    {
      oid: 186, _iddocumento: 123, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
      datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idempresa: 1, idpessoa: 999007,
      idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
    },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 123, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '1.000000', valtotalliquido: '150.000000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 1, _iddocumento: 123, _idsequencia: 1, idpagamento: 1, valor: '150.00' }])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1848, _iddocumento: 123, _idlocalestoque: 1, datahora: '2026-09-29 10:15:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '2.000000' }])
  // Como no ERP em 28/09: a variação 60 tem a descrição vazia, e a descrição está na mercadoria 730.
  await falso.inserir('mercadoria', [{ _idmercadoria: 730, descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: '', idmercadoria: 730 }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 1, _idmercadoriavariacao: 60, flaginativo: 'F' }])
  await falso.inserir('pessoa', [{ _idpessoa: 1, nome: 'Igor', flaginativo: 'F' }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' }])
}

const ERP_FORA: Erp = {
  async consultar() {
    throw new ErroErp('rede', 'o ERP não respondeu: sem resposta em 90 s')
  },
}

const TEXTO_ERP_FORA_14H =
  'Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h.'

test('execução ok grava os documentos e registra ok com as contagens', async () => {
  await montarLoja()
  const saida = await rodar(horaEm(TERCA, 14))

  const contagens = {
    documentos_lidos: 2, documentos_novos: 2, apagados: 0, movimentos: 1, foto: 1,
    produtos: 1, pessoas: 1, funcionarios: 1, fornecedores: 0, avisos: 0, respostas: 3,
  }
  assert.deepEqual(saida, { resultado: 'ok', avisos: [], mensagem: null, contagens })
  const docs = await banco.cliente.query(`select origem_id, codigo, modelo from kaizen.documento order by origem_id`)
  assert.deepEqual(docs.rows, [
    { origem_id: '185', codigo: '120', modelo: 'AX' },
    { origem_id: '186', codigo: '123', modelo: 'PA' },
  ])
  assert.deepEqual(await execucoes(), [
    { id: 1, tipo: 'hora', manual: false, resultado: 'ok', mensagem: null, contagens, avisos: [], telegram_ok: null, terminou: true },
  ])
  assert.deepEqual(enviadas, [])
})

test('a execução grava o produto 60 no Kaizen com a descrição da mercadoria 730', async () => {
  await montarLoja()
  assert.equal((await rodar(horaEm(TERCA, 14))).resultado, 'ok')
  const produtos = await banco.cliente.query(`select fonte, codigo, descricao from kaizen.produto order by codigo`)
  assert.deepEqual(produtos.rows, [{ fonte: 'meuerp', codigo: '60', descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER' }])
})

test('a segunda execução sem mudança no ERP continua ok e não duplica nada', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const ids = (await banco.cliente.query('select id from kaizen.documento order by id')).rows
  const segunda = await rodar(horaEm(TERCA, 14))

  assert.equal(segunda.resultado, 'ok')
  assert.equal(segunda.contagens.documentos_lidos, 2)
  assert.equal(segunda.contagens.documentos_novos, 0)
  assert.deepEqual((await banco.cliente.query('select id from kaizen.documento order by id')).rows, ids)
  const contas = await banco.cliente.query(`
    select (select count(*) from kaizen.documento) as documentos,
           (select count(*) from kaizen.documento_item) as itens,
           (select count(*) from kaizen.documento_pagamento) as pagamentos,
           (select count(*) from kaizen.estoque_movimento) as movimentos`)
  assert.deepEqual(contas.rows[0], { documentos: '2', itens: '1', pagamentos: '1', movimentos: '1' })
  assert.deepEqual((await execucoes()).map((e) => e.resultado), ['ok', 'ok'])
  assert.deepEqual(enviadas, [])
})

test('a folga de 200 relê o documento e o movimento gravados fora de ordem', async () => {
  // 13h: o maior documento visto fica 400 e o maior movimento 2500, altos o bastante para que
  // "maior − 200" (200 e 2300) fique acima do corte (184 e 1847): aqui quem decide é a folga, não o corte.
  await falso.inserir('documento', [{
    oid: 400, _iddocumento: 300, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-29 08:02:00', datahoramovimento: '2026-09-29 08:02:00', idempresa: 1,
  }])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 2500, _iddocumento: 300, _idlocalestoque: 1, datahora: '2026-09-29 08:02:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '2.000000' }])
  assert.equal((await rodar(horaEm(TERCA, 13))).resultado, 'ok')

  // Depois da leitura chegam linhas com número menor, como as de um caixa sem internet sincronizando,
  // todas com data de 20/09, fora da janela. O documento 350 e o movimento 2350 estão dentro da folga
  // (acima de 400 − 200 e de 2500 − 200); o documento 199 e o movimento 2250 estão abaixo dela.
  await falso.inserir('documento', [
    { oid: 350, _iddocumento: 290, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-20 10:00:00', idempresa: 1 },
    { oid: 199, _iddocumento: 150, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-20 09:00:00', idempresa: 1 },
  ])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 2350, _iddocumento: 290, _idlocalestoque: 1, datahora: '2026-09-20 10:00:00', idmercadoriavariacao: 61, qtdsaldoatual: '5.000000', qtdnovosaldo: '4.000000' },
    { oid: 2250, _iddocumento: 150, _idlocalestoque: 1, datahora: '2026-09-20 09:00:00', idmercadoriavariacao: 62, qtdsaldoatual: '1.000000', qtdnovosaldo: '0.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 2, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 61, qtdsaldo: '4.000000' }])

  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'ok')
  // O 400 foi relido e só regravado; o 350 é o único novo.
  assert.equal(saida.contagens.documentos_lidos, 2)
  assert.equal(saida.contagens.documentos_novos, 1)
  const docs = await banco.cliente.query('select origem_id from kaizen.documento order by origem_id::bigint')
  assert.deepEqual(docs.rows, [{ origem_id: '350' }, { origem_id: '400' }])
  const movimentos = await banco.cliente.query('select origem_id from kaizen.estoque_movimento order by origem_id::bigint')
  assert.deepEqual(movimentos.rows, [{ origem_id: '2350' }, { origem_id: '2500' }])
})

test('com a trava ocupada por outra conexão, a execução é pulada, com aviso, sem ler o ERP', async () => {
  await montarLoja()
  const outra = await conectar(banco.url)
  try {
    await outra.query('select pg_advisory_lock($1)', [TRAVA])
    const aberta = await outra.query<{ id: string }>(`insert into kaizen.execucao (tipo, manual) values ('hora', false) returning id`)
    const consultasAntes = falso.consultas.length

    const saida = await rodar(horaEm(TERCA, 14))

    const aviso = { tipo: 'execucao_pulada', chave: `pulada:${aberta.rows[0].id}`, texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' }
    assert.deepEqual(saida, { resultado: 'pulada', avisos: [aviso], mensagem: null, contagens: {} })
    const linhas = await execucoes()
    assert.equal(linhas.length, 2)
    assert.equal(linhas[0].terminou, false)
    assert.equal(linhas[1].resultado, 'pulada')
    assert.deepEqual(linhas[1].avisos, [aviso])
    assert.equal(falso.consultas.length, consultasAntes)
    assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '0')
    assert.deepEqual(enviadas, [])
  } finally {
    await outra.end()
  }
})

test('com a trava ocupada e a execução aberta há mais de 10 minutos, é falha e sai mensagem', async () => {
  const outra = await conectar(banco.url)
  try {
    await outra.query('select pg_advisory_lock($1)', [TRAVA])
    await outra.query(`insert into kaizen.execucao (tipo, manual, inicio) values ('hora', false, now() - interval '11 minutes')`)

    const saida = await rodar(horaEm(TERCA, 14))

    assert.equal(saida.resultado, 'falha')
    assert.equal(saida.mensagem, 'a leitura anterior ficou presa além do prazo')
    assert.deepEqual(enviadas, [
      'Kaizen: a leitura das 14h falhou — a leitura anterior ficou presa além do prazo. Abra uma sessão com o Claude e cole esta mensagem.',
    ])
    const linhas = await execucoes()
    assert.equal(linhas.length, 2)
    assert.equal(linhas[1].resultado, 'falha')
    assert.equal(linhas[1].mensagem, 'a leitura anterior ficou presa além do prazo')
    assert.equal(linhas[1].telegram_ok, true)
  } finally {
    await outra.end()
  }
})

test('sem o banco do Kaizen, sai a mensagem de banco fora e nada é registrado', async () => {
  const semBanco = async (): Promise<Cliente> => {
    throw Object.assign(new AggregateError([], ''), { code: 'ECONNREFUSED' })
  }
  const saida = await rodar(horaEm(TERCA, 14), falso.erp, { conectarKaizen: semBanco })

  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, 'o banco do Kaizen não respondeu: ECONNREFUSED')
  assert.deepEqual(enviadas, ['Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu.'])
  assert.deepEqual(await execucoes(), [])
})

test('coluna que sumiu do ERP é falha de estrutura, com a coluna na mensagem, e o Kaizen fica intacto', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const antes = await fotografia()
  await falso.cliente.query(`update documento set status = 'C' where oid = 186`)
  await falso.cliente.query('alter table documento_pagamento drop column valor')
  try {
    const saida = await rodar(horaEm(TERCA, 14))

    assert.equal(saida.resultado, 'falha')
    assert.equal(saida.mensagem, 'colunas que sumiram do ERP: documento_pagamento.valor')
    assert.deepEqual(enviadas, [
      'Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: colunas que sumiram do ERP: documento_pagamento.valor',
    ])
    assert.deepEqual(await fotografia(), antes)
    assert.equal((await execucoes())[1].mensagem, 'colunas que sumiram do ERP: documento_pagamento.valor')
  } finally {
    await falso.cliente.query('alter table documento_pagamento add column valor numeric')
  }
})

test('ERP fora do ar é falha erp_fora, e a mensagem diz que ele tenta de novo às 15h', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const saida = await rodar(horaEm(TERCA, 14), ERP_FORA)

  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, 'o ERP não respondeu: sem resposta em 90 s')
  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H])
  const linhas = await execucoes()
  assert.equal(linhas[1].resultado, 'falha')
  assert.equal(linhas[1].telegram_ok, true)
})

test('token recusado pelo ERP manda a mensagem de trocar o segredo', async () => {
  const recusado: Erp = {
    async consultar() {
      throw new ErroErp('token', 'o ERP recusou o token de acesso (HTTP 401)', 401)
    },
  }
  const saida = await rodar(horaEm(TERCA, 14), recusado)

  assert.equal(saida.resultado, 'falha')
  assert.deepEqual(enviadas, [
    'Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.',
  ])
})

test('outra empresa no ERP é falha de estrutura, com a tabela e o valor, e nada é gravado', async () => {
  await montarLoja()
  await falso.inserir('mercadoria_estoque', [{ oid: 2, _idempresa: 2, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '5.000000' }])
  const saida = await rodar(horaEm(TERCA, 14))

  const detalhe = 'apareceu outra empresa ou local de estoque: mercadoria_estoque._idempresa=2'
  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, detalhe)
  assert.deepEqual(enviadas, [
    `Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: ${detalhe}`,
  ])
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '0')
})

test('lista de vivos vazia com 25 documentos no Kaizen é falha, e nada é apagado', async () => {
  // Como os 44 ajustes de custo de 27/09: acima do corte, com data anterior a 28/09.
  await falso.inserir('documento', Array.from({ length: 25 }, (_, i) => ({
    oid: 185 + i, _iddocumento: 94 + i, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-27 14:20:00', idempresa: 1,
  })))
  assert.equal((await rodar(horaEm(TERCA, 13))).resultado, 'ok')
  await falso.cliente.query('delete from documento')

  const saida = await rodar(horaEm(TERCA, 14))

  const detalhe = 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'
  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, detalhe)
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '25')
  assert.deepEqual(enviadas, [
    `Kaizen: a leitura das 14h falhou — ${detalhe}. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.`,
  ])
})

test('erro no meio da carga (item sem produto) é falha, e o Kaizen continua como antes', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  const antes = await fotografia()
  // O pedido 123 muda no ERP, e chega um pedido novo com um item sem produto: a gravação para no meio.
  await falso.cliente.query(`update documento set status = 'C' where oid = 186`)
  await falso.inserir('documento', [{
    oid: 187, _iddocumento: 124, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    datahora: '2026-09-29 13:40:00', datahoramovimento: '2026-09-29 13:41:00', idempresa: 1,
  }])
  await falso.inserir('documento_mercadoria', [
    { oid: 1874, _iddocumento: 124, _idsequencia: 1, idmercadoriavariacao: null, qtd: '1.000000', valtotalliquido: '10.000000', idpessoafuncionario: 1 },
  ])

  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'falha')
  assert.match(saida.mensagem ?? '', /"produto"/)
  assert.deepEqual(await fotografia(), antes)
  assert.equal(enviadas.length, 1)
  assert.ok(enviadas[0].startsWith('Kaizen: a leitura das 14h falhou — '), enviadas[0])
  assert.ok(enviadas[0].endsWith('Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.'), enviadas[0])
})

test('falha que continua por várias horas manda uma mensagem só', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await rodar(horaEm(TERCA, 14), ERP_FORA)
  await rodar(horaEm(TERCA, 15), ERP_FORA)
  await rodar(horaEm(TERCA, 16), ERP_FORA)

  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H])
  // As falhas das 15h e das 16h não mandam nada e herdam o "já avisado" da das 14h.
  assert.deepEqual((await execucoes()).map((e) => [e.resultado, e.telegram_ok]), [
    ['ok', null], ['falha', true], ['falha', true], ['falha', true],
  ])
})

test('falha e depois ok manda a mensagem de volta', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await rodar(horaEm(TERCA, 14), ERP_FORA)
  const volta = await rodar(horaEm(TERCA, 15))

  assert.equal(volta.resultado, 'ok')
  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H, 'Kaizen: voltou a funcionar às 15h.'])
  assert.equal((await execucoes())[2].telegram_ok, true)
})

test('a volta que o Telegram recusou sai na leitura seguinte, uma vez só', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await rodar(horaEm(TERCA, 14), ERP_FORA)
  // Às 15h o ERP volta, mas o Telegram recusa o "voltou a funcionar".
  const recusadas: string[] = []
  const recusar = async (texto: string): Promise<boolean> => {
    recusadas.push(texto)
    return false
  }
  await rodar(horaEm(TERCA, 15), falso.erp, { enviar: recusar })
  await rodar(horaEm(TERCA, 16))
  await rodar(horaEm(TERCA, 17))

  assert.deepEqual(recusadas, ['Kaizen: voltou a funcionar às 15h.'])
  assert.deepEqual(enviadas, [TEXTO_ERP_FORA_14H, 'Kaizen: voltou a funcionar às 16h.'])
  assert.deepEqual((await execucoes()).map((e) => [e.resultado, e.telegram_ok]), [
    ['ok', null], ['falha', true], ['ok', false], ['ok', true], ['ok', null],
  ])
})

test('a leitura manual não cobra horário faltando nem manda "voltou"; a agendada seguinte avisa as faltas uma vez só', async () => {
  await montarLoja()
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado)
     values ('hora', false, '2026-09-29 10:00:03-03', '2026-09-29 10:01:00-03', 'ok')`,
  )
  // Uma leitura à mão às 14h30: ela não substitui as agendadas das 11h às 14h.
  const manual = await rodar(horaEm(TERCA, 14) + 30 * 60_000, falso.erp, { manual: true })
  assert.equal(manual.resultado, 'ok')
  assert.deepEqual(manual.avisos, [])
  assert.deepEqual(enviadas, [])

  const agendada = await rodar(horaEm(TERCA, 15))
  assert.deepEqual(agendada.avisos.map((a) => a.chave), [11, 12, 13, 14].map((h) => `faltou:2026-09-29:${h}`))
  assert.deepEqual(enviadas, ['Kaizen: voltou a funcionar às 15h.'])
  // No registro, cada horário que faltou aparece uma vez só: 4 avisos, todos da das 15h.
  const faltas = await banco.cliente.query(
    `select count(*) as n from kaizen.execucao e, jsonb_array_elements(e.avisos) a where a->>'tipo' = 'execucao_faltou'`,
  )
  assert.equal(faltas.rows[0].n, '4')
})

test('a execução das 14h, com a última às 10h, avisa que faltaram as de 11h, 12h e 13h', async () => {
  await montarLoja()
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado)
     values ('hora', false, '2026-09-29 10:00:03-03', '2026-09-29 10:01:00-03', 'ok')`,
  )
  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [11, 12, 13].map((h) => ({
    tipo: 'execucao_faltou', chave: `faltou:2026-09-29:${h}`, texto: `a leitura das ${h}h de 29/09 não aconteceu`,
  })))
  assert.equal(saida.contagens.avisos, 3)
  assert.deepEqual(enviadas, ['Kaizen: voltou a funcionar às 14h.'])
})

test('documento apagado no ERP sai do Kaizen e vira aviso com número, tipo, data, valor e vendedor', async () => {
  await montarLoja()
  await rodar(horaEm(TERCA, 13))
  await falso.cliente.query('delete from documento where oid = 186')
  await falso.cliente.query('delete from documento_mercadoria where _iddocumento = 123')
  await falso.cliente.query('delete from documento_pagamento where _iddocumento = 123')

  const saida = await rodar(horaEm(TERCA, 14))

  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [
    { tipo: 'documento_apagado', chave: 'apagado:186', texto: 'o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP' },
  ])
  assert.equal(saida.contagens.apagados, 1)
  const docs = await banco.cliente.query('select origem_id from kaizen.documento order by origem_id')
  assert.deepEqual(docs.rows, [{ origem_id: '185' }])
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.estoque_movimento')).rows[0].n, '1')
})

test('migração que não se aplica é falha registrada, com mensagem', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracao-'))
  try {
    writeFileSync(join(pasta, '006_quebrada.sql'), 'select 1 / 0;\n')
    const saida = await rodar(horaEm(TERCA, 14), falso.erp, { pastaMigracoes: pasta })

    const detalhe = 'a migração 006_quebrada.sql não se aplicou: division by zero'
    assert.equal(saida.resultado, 'falha')
    assert.equal(saida.mensagem, detalhe)
    assert.deepEqual(enviadas, [`Kaizen: a leitura das 14h falhou — ${detalhe}. Abra uma sessão com o Claude e cole esta mensagem.`])
    const linhas = await execucoes()
    assert.equal(linhas.length, 1)
    assert.equal(linhas[0].resultado, 'falha')
    const registrada = await banco.cliente.query(`select count(*) as n from kaizen.migracao where nome = '006_quebrada.sql'`)
    assert.equal(registrada.rows[0].n, '0')
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
})

test('no estouro do prazo, a execução aberta vira falha e sai a mensagem; o estouro seguinte não repete', async () => {
  const estourar = (hora: number) => registrarEstouro(
    { tipo: 'hora', manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => horaEm(TERCA, hora) },
  )
  await banco.cliente.query(`insert into kaizen.execucao (tipo, manual) values ('hora', false)`)
  await estourar(14)

  const linhas = await execucoes()
  assert.equal(linhas.length, 1)
  assert.equal(linhas[0].resultado, 'falha')
  assert.equal(linhas[0].mensagem, 'a leitura das 14h passou do prazo')
  assert.equal(linhas[0].terminou, true)
  assert.equal(linhas[0].telegram_ok, true)
  assert.deepEqual(enviadas, ['Kaizen: a leitura das 14h falhou — passou do prazo. Abra uma sessão com o Claude e cole esta mensagem.'])

  // Às 15h estoura de novo: a mensagem das 14h chegou, então nada sai, e a linha das 15h herda o "já avisado".
  await banco.cliente.query(`insert into kaizen.execucao (tipo, manual) values ('hora', false)`)
  await estourar(15)

  assert.deepEqual((await execucoes()).map((e) => [e.resultado, e.mensagem, e.telegram_ok]), [
    ['falha', 'a leitura das 14h passou do prazo', true],
    ['falha', 'a leitura das 15h passou do prazo', true],
  ])
  assert.equal(enviadas.length, 1)
})

test('motivoDe classifica cada erro', () => {
  const comCodigo = (mensagem: string, code: string): Error => Object.assign(new Error(mensagem), { code })
  const casos: Array<[string, unknown, MotivoFalha]> = [
    ['erro do Kaizen fica com o próprio motivo',
      new ErroKaizen({ tipo: 'estrutura', detalhe: 'colunas que sumiram do ERP: documento.status' }),
      { tipo: 'estrutura', detalhe: 'colunas que sumiram do ERP: documento.status' }],
    ['token recusado', new ErroErp('token', 'o ERP recusou o token de acesso (HTTP 401)', 401),
      { tipo: 'token', detalhe: 'o ERP recusou o token de acesso (HTTP 401)' }],
    ['ERP sem resposta', new ErroErp('rede', 'o ERP não respondeu: sem resposta em 90 s'),
      { tipo: 'erp_fora', detalhe: 'o ERP não respondeu: sem resposta em 90 s' }],
    ['ERP com erro HTTP', new ErroErp('http', 'o ERP respondeu com erro (HTTP 502)', 502),
      { tipo: 'erp_fora', detalhe: 'o ERP respondeu com erro (HTTP 502)' }],
    ['consulta com erro no ERP', new ErroErp('consulta', 'column d.gmt does not exist', 400),
      { tipo: 'outra', detalhe: 'column d.gmt does not exist' }],
    ['SQL recusado pela trava', new ErroErp('recusado', 'recusado: tem ;'),
      { tipo: 'outra', detalhe: 'recusado: tem ;' }],
    ['banco recusou a conexão', Object.assign(new AggregateError([], ''), { code: 'ECONNREFUSED' }),
      { tipo: 'banco_fora', detalhe: 'ECONNREFUSED' }],
    ['senha do banco recusada', comCodigo('password authentication failed for user "kaizen"', '28P01'),
      { tipo: 'banco_fora', detalhe: 'password authentication failed for user "kaizen"' }],
    ['banco que não existe', comCodigo('database "prumo" does not exist', '3D000'),
      { tipo: 'banco_fora', detalhe: 'database "prumo" does not exist' }],
    ['banco ainda subindo', comCodigo('the database system is starting up', '57P03'),
      { tipo: 'banco_fora', detalhe: 'the database system is starting up' }],
    // Quedas no meio da execução: o Postgres reiniciou ou a conexão caiu.
    ['Postgres reiniciado pelo administrador', comCodigo('terminating connection due to administrator command', '57P01'),
      { tipo: 'banco_fora', detalhe: 'terminating connection due to administrator command' }],
    ['Postgres desligando', comCodigo('terminating connection due to crash of another server process', '57P02'),
      { tipo: 'banco_fora', detalhe: 'terminating connection due to crash of another server process' }],
    ['erro de conexão', comCodigo('connection exception', '08000'), { tipo: 'banco_fora', detalhe: 'connection exception' }],
    ['conexão que não existe', comCodigo('connection does not exist', '08003'), { tipo: 'banco_fora', detalhe: 'connection does not exist' }],
    ['conexão que falhou', comCodigo('connection failure', '08006'), { tipo: 'banco_fora', detalhe: 'connection failure' }],
    ['conexão cortada pela rede', comCodigo('read ECONNRESET', 'ECONNRESET'), { tipo: 'banco_fora', detalhe: 'read ECONNRESET' }],
    ['escrita numa conexão fechada', comCodigo('write EPIPE', 'EPIPE'), { tipo: 'banco_fora', detalhe: 'write EPIPE' }],
    ['rede sem resposta', comCodigo('read ETIMEDOUT', 'ETIMEDOUT'), { tipo: 'banco_fora', detalhe: 'read ETIMEDOUT' }],
    ['conexão encerrada pelo pg, sem código', new Error('Connection terminated unexpectedly'),
      { tipo: 'banco_fora', detalhe: 'Connection terminated unexpectedly' }],
    ['erro de gravação no banco', comCodigo('null value in column "produto" violates not-null constraint', '23502'),
      { tipo: 'outra', detalhe: 'null value in column "produto" violates not-null constraint' }],
    ['erro qualquer', new Error('algo quebrou'), { tipo: 'outra', detalhe: 'algo quebrou' }],
    ['algo que nem é erro', 'texto solto', { tipo: 'outra', detalhe: 'texto solto' }],
  ]
  for (const [nome, erro, esperado] of casos) {
    assert.deepEqual(motivoDe(erro), esperado, nome)
  }
})
