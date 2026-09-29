import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import type { Cliente } from './banco.mts'
import { listarExecucoes, migrarAgora } from './comandos-vps.mts'
import { TRAVA } from './constantes.mts'
import { principal } from './principal.mts'

// Duas migrações de mentira, numa pasta própria: o teste não depende da lista de sql/migracoes, que cresce a cada fase.
function pastaComMigracoes(): string {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  writeFileSync(join(pasta, '001_primeira.sql'), 'create table kaizen.primeira (x int)')
  writeFileSync(join(pasta, '002_segunda.sql'), 'create table kaizen.segunda (x int)')
  return pasta
}

test('migrar aplica as migrações pendentes e diz quais; de novo, diz que não há nenhuma; e solta a trava', async () => {
  const banco = await criarBancoKaizen({ migrar: false })
  const pasta = pastaComMigracoes()
  const outra = await conectar(banco.url)
  try {
    assert.deepEqual(await migrarAgora(banco.cliente, pasta), { codigo: 0, texto: 'migrar: aplicadas 001_primeira, 002_segunda' })
    const tabelas = await banco.cliente.query(`select tablename from pg_tables where schemaname = 'kaizen' order by 1`)
    assert.deepEqual(tabelas.rows.map((l) => l.tablename), ['migracao', 'primeira', 'segunda'])
    assert.deepEqual(await migrarAgora(banco.cliente, pasta), { codigo: 0, texto: 'migrar: nenhuma migração pendente' })
    // A leitura seguinte, em outra conexão, pega a trava.
    const trava = await outra.query('select pg_try_advisory_lock($1) as ok', [TRAVA])
    assert.equal(trava.rows[0].ok, true)
  } finally {
    await outra.end()
    rmSync(pasta, { recursive: true, force: true })
    await banco.fechar()
  }
})

test('migrar com a trava presa por uma leitura sai com 1, diz para rodar de novo e não aplica nada', async () => {
  const banco = await criarBancoKaizen({ migrar: false })
  const pasta = pastaComMigracoes()
  const leitura = await conectar(banco.url)
  try {
    await leitura.query('select pg_advisory_lock($1)', [TRAVA])
    assert.deepEqual(await migrarAgora(banco.cliente, pasta), {
      codigo: 1,
      texto: 'migrar: uma leitura está rodando; rode de novo em alguns minutos',
    })
    const migracao = await banco.cliente.query(`select to_regclass('kaizen.migracao') is not null as existe`)
    assert.equal(migracao.rows[0].existe, false)
  } finally {
    await leitura.end()
    rmSync(pasta, { recursive: true, force: true })
    await banco.fechar()
  }
})

// 130 caracteres: a linha mostra os 120 primeiros e as reticências.
const LONGA = '0123456789'.repeat(13)

const LINHAS_DESDE_28_09 = [
  'id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem',
  '2 | noite | manual | 28/09 00:00 | aviso | 2 | sim | —',
  '3 | hora | agendada | 28/09 17:00 | pulada | 1 | — | —',
  `4 | hora | agendada | 28/09 18:00 | falha | 0 | não | ${'0123456789'.repeat(12)}…`,
  '5 | hora | agendada | 28/09 19:00 | ok | 0 | — | —',
  '6 | hora | agendada | 28/09 20:00 | — | 0 | — | —',
  'contagem desde 28/09/2026: ok 1, aviso 1, falha 1, pulada 1, sem resultado 1 (total 5)',
]

async function inserirExecucoes(cliente: Cliente): Promise<void> {
  // A 1 começa às 22h de 27/09 em Fortaleza, que já é 28/09 (1h) em UTC: fica de fora. A 2 começa à 0h de 28/09: entra.
  // A 6 ainda não terminou (sem resultado).
  await cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, mensagem, avisos, telegram_ok) values
       ('noite', false, '2026-09-27 22:00:00-03', '2026-09-27 22:04:00-03', 'ok', null, '[]', null),
       ('noite', true, '2026-09-28 00:00:00-03', '2026-09-28 00:03:00-03', 'aviso', null, '[{"tipo":"a"},{"tipo":"b"}]', true),
       ('hora', false, '2026-09-28 17:00:02-03', '2026-09-28 17:00:03-03', 'pulada', null, '[{"tipo":"execucao_pulada"}]', null),
       ('hora', false, '2026-09-28 18:00:01-03', '2026-09-28 18:00:40-03', 'falha', $1, '[]', false),
       ('hora', false, '2026-09-28 19:00:00-03', '2026-09-28 19:00:50-03', 'ok', null, '[]', null),
       ('hora', false, '2026-09-28 20:00:00-03', null, null, null, '[]', null)`,
    [LONGA],
  )
}

test('execucoes lista cada execução desde a 0h do dia em Fortaleza, uma por linha, e a contagem por resultado', async () => {
  const banco = await criarBancoKaizen()
  try {
    await inserirExecucoes(banco.cliente)
    assert.deepEqual(await listarExecucoes(banco.cliente, '2026-09-28'), LINHAS_DESDE_28_09)
  } finally {
    await banco.fechar()
  }
})

test('os comandos migrar e execucoes pelo principal: as mesmas linhas, os últimos 7 dias sem dia, e 2 com argumento errado', async (t) => {
  const banco = await criarBancoKaizen()
  try {
    const ambiente = { MEUERP_TOKEN: 'token-de-teste', KAIZEN_URL: banco.url }
    const impressos: string[] = []
    t.mock.method(console, 'log', (...partes: unknown[]) => {
      impressos.push(partes.join(' '))
    })

    assert.equal(await principal(['migrar'], ambiente), 0)
    assert.deepEqual(impressos.splice(0), ['migrar: nenhuma migração pendente'])

    await inserirExecucoes(banco.cliente)
    assert.equal(await principal(['execucoes', '2026-09-28'], ambiente), 0)
    assert.deepEqual(impressos.splice(0), LINHAS_DESDE_28_09)

    // Sem dia: desde 7 dias atrás. A de 8 dias atrás fica de fora; a de 6 dias atrás entra.
    await banco.cliente.query(`delete from kaizen.execucao`)
    await banco.cliente.query(
      `insert into kaizen.execucao (id, tipo, manual, inicio, fim, resultado) overriding system value values
         (7, 'hora', false, now() - interval '8 days', now() - interval '8 days', 'ok'),
         (8, 'hora', false, now() - interval '6 days', now() - interval '6 days', 'ok')`,
    )
    assert.equal(await principal(['execucoes'], ambiente), 0)
    const linhas = impressos.splice(0)
    assert.equal(linhas.length, 3)
    assert.match(linhas[1], /^8 \| hora \| agendada \| \d{2}\/\d{2} \d{2}:\d{2} \| ok \| 0 \| — \| —$/)
    assert.match(linhas[2], /^contagem desde \d{2}\/\d{2}\/\d{4}: ok 1, aviso 0, falha 0, pulada 0, sem resultado 0 \(total 1\)$/)

    assert.equal(await principal(['execucoes', 'ontem'], ambiente), 2)
    assert.equal(await principal(['execucoes', '2026-09-28', '2026-09-29'], ambiente), 2)
    assert.equal(await principal(['migrar', 'agora'], ambiente), 2)
  } finally {
    await banco.fechar()
  }
})
