import { test } from 'node:test'
import assert from 'node:assert/strict'
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

test('conectar fixa o fuso da sessão em America/Fortaleza, mesmo para quem não tem esse fuso', async () => {
  garantirLocal(URL_LOCAL)
  const cliente = await conectar(URL_LOCAL)
  try {
    const { rows } = await cliente.query('show timezone')
    assert.equal(rows[0].TimeZone, 'America/Fortaleza')
  } finally {
    await cliente.end()
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
