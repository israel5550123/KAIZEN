import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { ErroErp } from './erp.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import { conectar } from './banco.mts'
import { URL_ADMIN, urlDoBanco } from './apoio-teste.mts'

const TIPO_NO_POSTGRES: Record<string, string> = {
  integer: 'integer',
  numeric: 'numeric',
  timestamp: 'timestamp without time zone',
  varchar: 'character varying',
  text: 'text',
}

async function comErpFalso(fazer: (falso: ErpFalso) => Promise<void>): Promise<void> {
  const falso = await criarErpFalso()
  try {
    await fazer(falso)
  } finally {
    await falso.fechar()
  }
}

function erroErp(tipo: string, mensagem: RegExp) {
  return (erro: unknown): boolean => {
    assert.ok(erro instanceof ErroErp, `esperava ErroErp, veio ${String(erro)}`)
    assert.equal(erro.tipo, tipo)
    assert.match(erro.message, mensagem)
    return true
  }
}

test('cria uma tabela por tabela da lista, só com as colunas da lista, todas aceitando nulo e sem chave', async () => {
  await comErpFalso(async (falso) => {
    const r = await falso.cliente.query(
      `select table_name as tabela, column_name as coluna, data_type as tipo, is_nullable as nulo
       from information_schema.columns where table_schema = 'public'
       order by table_name::text collate "C", column_name::text collate "C"`,
    )
    const esperadas = lerColunasEsperadas().map((c) => ({ tabela: c.tabela, coluna: c.coluna, tipo: TIPO_NO_POSTGRES[c.tipo], nulo: 'YES' }))
    assert.equal(r.rows.length, 119)
    assert.deepEqual(r.rows, esperadas)
    const restricoes = await falso.cliente.query(`select count(*) as n from information_schema.table_constraints where table_schema = 'public'`)
    assert.equal(restricoes.rows[0].n, '0')
  })
})

test('a sessão imita a do ERP (DateStyle ISO, DMY e fuso America/Sao_Paulo) e o banco falso roda sem JIT', async () => {
  await comErpFalso(async (falso) => {
    assert.equal((await falso.cliente.query('show datestyle')).rows[0].DateStyle, 'ISO, DMY')
    assert.equal((await falso.cliente.query('show timezone')).rows[0].TimeZone, 'America/Sao_Paulo')
    assert.equal((await falso.cliente.query('show jit')).rows[0].jit, 'off')
    // Desligado no banco, e não só nesta sessão: uma conexão nova também vem sem JIT.
    const nome: string = (await falso.cliente.query('select current_database() as nome')).rows[0].nome
    const outra = await conectar(urlDoBanco(nome, 'postgres'))
    try {
      assert.equal((await outra.query('show jit')).rows[0].jit, 'off')
    } finally {
      await outra.end()
    }
  })
})

test('consulta com coluna fora da lista falha como erro de consulta', async () => {
  await comErpFalso(async (falso) => {
    const sql = `select coalesce(json_agg(d.idloja), '[]')::text as dados from documento d`
    await assert.rejects(falso.erp.consultar(sql), erroErp('consulta', /idloja/))
  })
})

test('devolve o texto da coluna dados e guarda cada consulta', async () => {
  await comErpFalso(async (falso) => {
    await falso.inserir('documento', [
      { oid: 186, modelo: 'PA', datahora: '2026-09-28 10:00:00' },
      { oid: 185, modelo: 'AC' },
    ])
    const sql = `select coalesce(json_agg(json_build_object('oid', d.oid, 'modelo', d.modelo, 'datahora', d.datahora) order by d.oid), '[]')::text as dados from documento d`
    const dados = await falso.erp.consultar(`  ${sql};  `)
    assert.equal(typeof dados, 'string')
    assert.deepEqual(JSON.parse(dados), [
      { oid: 185, modelo: 'AC', datahora: null },
      { oid: 186, modelo: 'PA', datahora: '2026-09-28T10:00:00' },
    ])
    assert.deepEqual(falso.consultas, [sql])
  })
})

test('inserir aceita linhas com colunas diferentes e grava o número como veio', async () => {
  await comErpFalso(async (falso) => {
    await falso.inserir('documento_mercadoria', [
      { oid: 1873, _iddocumento: 94, qtd: '123456789012345678.123456' },
      { oid: 1874, valtotalliquido: '0.000001' },
    ])
    const r = await falso.cliente.query(
      'select oid, _iddocumento, qtd::text as qtd, valtotalliquido::text as valor from documento_mercadoria order by oid',
    )
    assert.deepEqual(r.rows, [
      { oid: 1873, _iddocumento: 94, qtd: '123456789012345678.123456', valor: null },
      { oid: 1874, _iddocumento: null, qtd: null, valor: '0.000001' },
    ])
  })
})

test('recusa SQL de escrita sem rodar nada', async () => {
  await comErpFalso(async (falso) => {
    await falso.inserir('documento', [{ oid: 185 }])
    await assert.rejects(falso.erp.consultar('delete from documento'), erroErp('recusado', /^recusado: /))
    await assert.rejects(
      falso.erp.consultar(`with x as (delete from documento returning oid) select coalesce(json_agg(oid), '[]')::text as dados from x`),
      erroErp('recusado', /^recusado: /),
    )
    const r = await falso.cliente.query('select count(*) as n from documento')
    assert.equal(r.rows[0].n, '1')
    assert.deepEqual(falso.consultas, [])
  })
})

test('exige uma linha só, com a coluna dados em texto', async () => {
  await comErpFalso(async (falso) => {
    for (const sql of ['select 1 as dados', "select 'x' as outra", "select 'x' as dados from documento where false"]) {
      await assert.rejects(falso.erp.consultar(sql), erroErp('consulta', /^resposta sem a coluna dados$/))
    }
  })
})

test('fechar apaga o banco falso', async () => {
  const falso = await criarErpFalso()
  const nome: string = (await falso.cliente.query('select current_database() as nome')).rows[0].nome
  assert.match(nome, new RegExp(`^erp_teste_${process.pid}_\\d+$`))
  await falso.fechar()
  const admin = await conectar(URL_ADMIN)
  try {
    const r = await admin.query('select count(*) as n from pg_database where datname = $1', [nome])
    assert.equal(r.rows[0].n, '0')
  } finally {
    await admin.end()
  }
})
