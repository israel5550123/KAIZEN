import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import {
  registrarInicio, registrarFim, registrarPulada, marcarInterrompidas, execucaoPresa, anteriorValida,
  ultimoInicioNaoManualMs, ultimaNoiteBoa, horaDaUltimaBoa, marcarTelegram, avisosParaResumo, marcarResumo,
} from './registro.mts'
import type { Aviso } from './tipos.mts'

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.cliente.query('delete from kaizen.execucao')
})

type LinhaExecucao = {
  tipo?: 'hora' | 'noite'
  manual?: boolean
  inicio?: string
  fim?: string | null
  resultado?: 'ok' | 'aviso' | 'falha' | 'pulada' | null
  avisos?: Aviso[]
  telegramOk?: boolean | null
  resumoOk?: boolean
  resumoChaves?: string[] | null
}

// Uma linha de execucao escrita à mão. O início é um instante com fuso ('2026-09-29 17:00:00+00'); sem ele, agora.
// Sem fim informado, a linha termina no próprio início; com fim: null, fica sem fim (ainda rodando).
async function linha(l: LinhaExecucao): Promise<number> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, avisos, telegram_ok, resumo_ok, resumo_chaves)
     values ($1, $2, coalesce($3::timestamptz, now()),
             case when $10::boolean then null else coalesce($4::timestamptz, $3::timestamptz, now()) end,
             $5, $6::jsonb, $7, $8, $9::jsonb)
     returning id`,
    [
      l.tipo ?? 'hora',
      l.manual ?? false,
      l.inicio ?? null,
      l.fim ?? null,
      l.resultado === undefined ? 'ok' : l.resultado,
      JSON.stringify(l.avisos ?? []),
      l.telegramOk ?? null,
      l.resumoOk ?? false,
      l.resumoChaves ? JSON.stringify(l.resumoChaves) : null,
      l.fim === null,
    ],
  )
  return Number(r.rows[0].id)
}

async function ler(id: number): Promise<Record<string, unknown>> {
  const r = await banco.cliente.query(
    `select tipo, manual, fim is not null as terminou, resultado, mensagem, contagens, avisos, telegram_ok, resumo_ok, resumo_chaves
       from kaizen.execucao where id = $1`,
    [id],
  )
  return r.rows[0]
}

const avisoA: Aviso = { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:AM', texto: 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen' }
const avisoB: Aviso = { tipo: 'execucao_faltou', chave: 'faltou:2026-09-29:10', texto: 'a leitura das 10h de 29/09 não aconteceu' }
const avisoC: Aviso = { tipo: 'estoque_diverge', chave: 'estoque:60:virada:0', texto: 'o saldo do produto 60 no ERP (0) não bate com os movimentos (3.000000)' }

test('registrarInicio grava o tipo e se é manual, sem fim e sem resultado, e devolve o id', async () => {
  const hora = await registrarInicio(banco.cliente, 'hora', false)
  const noite = await registrarInicio(banco.cliente, 'noite', true)
  assert.equal(typeof hora, 'number')
  assert.ok(noite > hora)
  assert.deepEqual(await ler(hora), {
    tipo: 'hora', manual: false, terminou: false, resultado: null, mensagem: null, contagens: null,
    avisos: [], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
  assert.deepEqual(await ler(noite), {
    tipo: 'noite', manual: true, terminou: false, resultado: null, mensagem: null, contagens: null,
    avisos: [], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
})

test('registrarFim grava o fim, o resultado, a mensagem, as contagens e os avisos inteiros', async () => {
  const id = await registrarInicio(banco.cliente, 'hora', false)
  await registrarFim(banco.cliente, id, {
    resultado: 'aviso',
    mensagem: 'uma mensagem com "aspas" e acentuação',
    contagens: { documentos_lidos: 12, documentos_novos: 3, apagados: 0 },
    avisos: [avisoA, avisoB],
  })
  assert.deepEqual(await ler(id), {
    tipo: 'hora', manual: false, terminou: true, resultado: 'aviso', mensagem: 'uma mensagem com "aspas" e acentuação',
    contagens: { documentos_lidos: 12, documentos_novos: 3, apagados: 0 },
    avisos: [avisoA, avisoB], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
})

test('registrarFim sem mensagem e sem contagens deixa as duas vazias', async () => {
  const id = await registrarInicio(banco.cliente, 'noite', false)
  await registrarFim(banco.cliente, id, { resultado: 'ok', avisos: [] })
  const lido = await ler(id)
  assert.equal(lido.terminou, true)
  assert.equal(lido.resultado, 'ok')
  assert.equal(lido.mensagem, null)
  assert.equal(lido.contagens, null)
  assert.deepEqual(lido.avisos, [])
})

test('registrarPulada grava uma linha já terminada, com o aviso da pulada', async () => {
  const aviso: Aviso = { tipo: 'execucao_pulada', chave: 'pulada:41', texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' }
  await registrarPulada(banco.cliente, 'hora', true, aviso)
  const r = await banco.cliente.query('select id from kaizen.execucao')
  assert.equal(r.rows.length, 1)
  assert.deepEqual(await ler(Number(r.rows[0].id)), {
    tipo: 'hora', manual: true, terminou: true, resultado: 'pulada', mensagem: null, contagens: null,
    avisos: [aviso], telegram_ok: null, resumo_ok: false, resumo_chaves: null,
  })
})

test('marcarInterrompidas marca como falha as outras linhas sem fim e devolve quantas', async () => {
  const velha = await linha({ fim: null, resultado: null })
  const terminada = await linha({ resultado: 'ok' })
  const atual = await registrarInicio(banco.cliente, 'hora', false)
  assert.equal(await marcarInterrompidas(banco.cliente, atual), 1)
  const lida = await ler(velha)
  assert.equal(lida.resultado, 'falha')
  assert.equal(lida.mensagem, 'interrompida antes de terminar')
  assert.equal(lida.terminou, true)
  assert.equal((await ler(terminada)).resultado, 'ok')
  assert.equal((await ler(atual)).terminou, false)
  assert.equal(await marcarInterrompidas(banco.cliente, atual), 0)
})

test('execucaoPresa acha só a linha sem fim que começou antes do prazo', async () => {
  assert.equal(await execucaoPresa(banco.cliente, 10), null)
  await banco.cliente.query(`insert into kaizen.execucao (tipo, inicio) values ('hora', now() - interval '5 minutes')`)
  assert.equal(await execucaoPresa(banco.cliente, 10), null)
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.execucao (tipo, inicio) values ('noite', now() - interval '31 minutes') returning id`,
  )
  assert.deepEqual(await execucaoPresa(banco.cliente, 30), { id: Number(r.rows[0].id) })
  await banco.cliente.query(`insert into kaizen.execucao (tipo, inicio, fim, resultado) values ('hora', now() - interval '2 hours', now(), 'ok')`)
  assert.deepEqual(await execucaoPresa(banco.cliente, 30), { id: Number(r.rows[0].id) })
})

test('anteriorValida pega a última ok, aviso ou falha, pulando as puladas e a execução atual', async () => {
  assert.equal(await anteriorValida(banco.cliente, null), null)
  const falha = await linha({ resultado: 'falha', telegramOk: true })
  await linha({ resultado: 'pulada' })
  const atual = await registrarInicio(banco.cliente, 'hora', false)
  assert.deepEqual(await anteriorValida(banco.cliente, atual), { id: falha, resultado: 'falha', telegramOk: true })
  await registrarFim(banco.cliente, atual, { resultado: 'aviso', avisos: [] })
  assert.deepEqual(await anteriorValida(banco.cliente, null), { id: atual, resultado: 'aviso', telegramOk: null })
  assert.deepEqual(await anteriorValida(banco.cliente, atual), { id: falha, resultado: 'falha', telegramOk: true })
})

test('ultimoInicioNaoManualMs devolve o início da última não manual, de qualquer resultado, sem a atual', async () => {
  assert.equal(await ultimoInicioNaoManualMs(banco.cliente, null), null)
  await linha({ inicio: '2026-09-29 16:00:00.123+00', resultado: 'ok' })
  await linha({ inicio: '2026-09-29 17:00:00.456+00', resultado: 'pulada' })
  await linha({ inicio: '2026-09-29 17:37:00+00', manual: true, resultado: 'ok' })
  const atual = await linha({ inicio: '2026-09-29 18:00:00+00', fim: null, resultado: null })
  assert.equal(await ultimoInicioNaoManualMs(banco.cliente, atual), Date.parse('2026-09-29T17:00:00.456Z'))
  assert.equal(await ultimoInicioNaoManualMs(banco.cliente, null), Date.parse('2026-09-29T18:00:00Z'))
})

test('ultimaNoiteBoa devolve o dia de Fortaleza da última noite ok ou aviso, mesmo começada às 22h30 (01h30 em UTC)', async () => {
  assert.equal(await ultimaNoiteBoa(banco.cliente), null)
  await linha({ tipo: 'noite', inicio: '2026-09-29 01:30:00+00', resultado: 'ok' })
  await linha({ tipo: 'noite', inicio: '2026-09-30 01:30:00+00', resultado: 'aviso' })
  await linha({ tipo: 'noite', inicio: '2026-10-01 01:30:00+00', resultado: 'falha' })
  await linha({ tipo: 'hora', inicio: '2026-10-01 11:00:00+00', resultado: 'ok' })
  assert.equal(await ultimaNoiteBoa(banco.cliente), '2026-09-29')
  // com a sessão do Postgres em UTC, o dia continua o de Fortaleza
  await banco.cliente.query(`set time zone 'UTC'`)
  try {
    assert.equal(await ultimaNoiteBoa(banco.cliente), '2026-09-29')
  } finally {
    await banco.cliente.query(`set time zone 'America/Fortaleza'`)
  }
})

test('horaDaUltimaBoa devolve a hora de Fortaleza da última ok ou aviso, sem a atual', async () => {
  assert.equal(await horaDaUltimaBoa(banco.cliente, null), null)
  await linha({ inicio: '2026-09-29 16:00:02+00', resultado: 'aviso' })
  await linha({ inicio: '2026-09-29 17:00:02+00', resultado: 'falha' })
  await linha({ inicio: '2026-09-29 17:30:00+00', resultado: 'pulada' })
  const atual = await linha({ inicio: '2026-09-29 18:00:02+00', resultado: 'ok' })
  assert.equal(await horaDaUltimaBoa(banco.cliente, atual), 13)
  assert.equal(await horaDaUltimaBoa(banco.cliente, null), 15)
  await banco.cliente.query(`set time zone 'UTC'`)
  try {
    assert.equal(await horaDaUltimaBoa(banco.cliente, atual), 13)
  } finally {
    await banco.cliente.query(`set time zone 'America/Fortaleza'`)
  }
})

test('marcarTelegram grava se a mensagem foi aceita, recusada ou não foi mandada', async () => {
  const id = await registrarInicio(banco.cliente, 'hora', false)
  await marcarTelegram(banco.cliente, id, true)
  assert.equal((await ler(id)).telegram_ok, true)
  await marcarTelegram(banco.cliente, id, false)
  assert.equal((await ler(id)).telegram_ok, false)
  await marcarTelegram(banco.cliente, id, null)
  assert.equal((await ler(id)).telegram_ok, null)
})

test('avisosParaResumo junta os avisos desde o último resumo enviado e devolve as chaves dele', async () => {
  // sem resumo nenhum: todos os avisos, e nenhuma chave anterior
  await linha({ avisos: [avisoA] })
  await linha({ avisos: [avisoB, avisoC] })
  assert.deepEqual(await avisosParaResumo(banco.cliente), { avisos: [avisoA, avisoB, avisoC], chavesAnteriores: [] })

  await linha({ tipo: 'noite', avisos: [avisoC], resumoOk: true, resumoChaves: ['codigo:tipo:AM', 'estoque:60:virada:0'] })
  await linha({ avisos: [avisoA], resultado: 'aviso' })
  await linha({ resultado: 'pulada', avisos: [{ tipo: 'execucao_pulada', chave: 'pulada:9', texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' }] })
  await linha({ tipo: 'noite', resultado: 'falha', avisos: [avisoC] })
  assert.deepEqual(await avisosParaResumo(banco.cliente), {
    avisos: [
      avisoA,
      { tipo: 'execucao_pulada', chave: 'pulada:9', texto: 'uma leitura foi pulada porque a anterior ainda estava rodando' },
      avisoC,
    ],
    chavesAnteriores: ['codigo:tipo:AM', 'estoque:60:virada:0'],
  })
})

test('marcarResumo marca o resumo como enviado e guarda as chaves, e o próximo resumo começa depois dele', async () => {
  const id = await linha({ tipo: 'noite', avisos: [avisoA, avisoB] })
  await marcarResumo(banco.cliente, id, ['codigo:tipo:AM', 'faltou:2026-09-29:10'])
  const lido = await ler(id)
  assert.equal(lido.resumo_ok, true)
  assert.deepEqual(lido.resumo_chaves, ['codigo:tipo:AM', 'faltou:2026-09-29:10'])
  assert.deepEqual(await avisosParaResumo(banco.cliente), { avisos: [], chavesAnteriores: ['codigo:tipo:AM', 'faltou:2026-09-29:10'] })

  const limpo = await linha({ tipo: 'noite' })
  await marcarResumo(banco.cliente, limpo, [])
  assert.deepEqual(await avisosParaResumo(banco.cliente), { avisos: [], chavesAnteriores: [] })
})
