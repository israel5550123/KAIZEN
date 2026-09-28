import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import type { AddressInfo, Socket } from 'node:net'
import { conectar, emTransacao, garantirLocal } from './banco.mts'

// Superusuário do Postgres local (docker-compose.yml).
const URL_LOCAL = 'postgres://postgres@localhost:5434/postgres'
const RECUSADO = { message: 'recusado: só localhost:5434 nos testes' }

test('garantirLocal aceita só localhost e 127.0.0.1 na porta 5434', () => {
  assert.doesNotThrow(() => garantirLocal('postgres://postgres@localhost:5434/postgres'))
  assert.doesNotThrow(() => garantirLocal('postgres://kaizen:kaizen-local@127.0.0.1:5434/kaizen'))
  assert.doesNotThrow(() => garantirLocal('postgresql://kaizen@localhost:5434/kaizen_teste_1_1'))
})

test('garantirLocal recusa outro endereço, outra porta, porta ausente e endereço inválido', () => {
  const recusados = [
    'postgres://kaizen:senha@postgres:5432/prumo',
    'postgres://postgres@localhost:5433/postgres',
    'postgres://postgres@localhost/postgres',
    'postgres://postgres@192.168.0.10:5434/postgres',
    'postgres://postgres@localhost.exemplo.com:5434/postgres',
    'isto não é um endereço',
  ]
  for (const url of recusados) {
    assert.throws(() => garantirLocal(url), RECUSADO, url)
  }
})

test('conectar fixa o fuso da sessão em America/Fortaleza e o DateStyle em ISO, YMD, mesmo para quem não os tem', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    const { rows } = await cliente.query('show timezone')
    assert.equal(rows[0].TimeZone, 'America/Fortaleza')
    // O aviso de documento apagado usa criado_em::text: a data sai AAAA-MM-DD qualquer que seja o padrão do servidor.
    const estilo = await cliente.query('show datestyle')
    assert.equal(estilo.rows[0].DateStyle, 'ISO, YMD')
  } finally {
    await cliente.end()
  }
})

test('conectar desiste em 10 s de um banco que aceita a conexão e não responde', async () => {
  // Um servidor mudo, aberto por este teste no próprio PC: aceita a conexão e nunca responde.
  const conexoes: Socket[] = []
  const mudo = createServer((conexao) => {
    conexoes.push(conexao)
  })
  await new Promise<void>((pronto) => mudo.listen(0, '127.0.0.1', pronto))
  const porta = (mudo.address() as AddressInfo).port
  const inicio = Date.now()
  try {
    await assert.rejects(conectar(`postgres://kaizen@127.0.0.1:${porta}/kaizen`), { message: 'timeout expired' })
    const levou = Date.now() - inicio
    assert.ok(levou >= 9_900 && levou < 12_000, `levou ${levou} ms`)
  } finally {
    for (const conexao of conexoes) conexao.destroy()
    await new Promise<void>((fechado) => mudo.close(() => fechado()))
  }
})

test('datas, horas, numeric e bigint chegam como o texto que o Postgres escreveu', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    const { rows } = await cliente.query(`
      select
        '2026-09-28 14:00:03.123'::timestamp as momento,
        '2026-09-28 17:00:03.123+00'::timestamptz as carimbo,
        '2026-09-28'::date as dia,
        '1234567890.123456'::numeric(16,6) as valor,
        '123456789012345678901234.5'::numeric as valor_grande,
        9007199254740993::int8 as inteiro_grande,
        (select count(*) from (values (1), (2)) v) as contagem`)
    assert.deepEqual(rows[0], {
      momento: '2026-09-28 14:00:03.123',
      carimbo: '2026-09-28 14:00:03.123-03',
      dia: '2026-09-28',
      valor: '1234567890.123456',
      valor_grande: '123456789012345678901234.5',
      inteiro_grande: '9007199254740993',
      contagem: '2',
    })
  } finally {
    await cliente.end()
  }
})

test('emTransacao grava quando tudo dá certo e devolve o resultado', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    await cliente.query('create temp table caixa (valor numeric not null)')
    const devolvido = await emTransacao(cliente, async () => {
      await cliente.query(`insert into caixa values ('10.50')`)
      return 'gravado'
    })
    assert.equal(devolvido, 'gravado')
    const { rows } = await cliente.query('select count(*) as linhas from caixa')
    assert.equal(rows[0].linhas, '1')
  } finally {
    await cliente.end()
  }
})

test('emTransacao desfaz tudo e relança o mesmo erro quando algo falha', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    await cliente.query('create temp table caixa (valor numeric not null)')
    const erro = new Error('falhou no meio da carga')
    await assert.rejects(
      emTransacao(cliente, async () => {
        await cliente.query(`insert into caixa values ('10.50')`)
        throw erro
      }),
      (recebido) => recebido === erro,
    )
    const { rows } = await cliente.query('select count(*) as linhas from caixa')
    assert.equal(rows[0].linhas, '0')
  } finally {
    await cliente.end()
  }
})

test('emTransacao não finge sucesso quando um comando falhou dentro dela e o erro foi engolido', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    await cliente.query('create temp table caixa (valor numeric not null)')
    await assert.rejects(
      emTransacao(cliente, async () => {
        await cliente.query(`insert into caixa values ('10.50')`)
        await cliente.query('select 1 / 0').catch(() => undefined)
        return 'parece que deu certo'
      }),
      { message: 'a transação foi desfeita pelo Postgres: um comando falhou dentro dela' },
    )
    const { rows } = await cliente.query('select count(*) as linhas from caixa')
    assert.equal(rows[0].linhas, '0')
  } finally {
    await cliente.end()
  }
})
