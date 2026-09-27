import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { PASTA_SQL_ERP, modeloErp, montar, inteiro, data, inteiros, pares, lerColunasEsperadas } from './sql-erp.mts'
import { verificarSomenteLeitura } from './somente-leitura.mts'

let falso: ErpFalso

before(async () => {
  falso = await criarErpFalso()
})

after(async () => {
  await falso?.fechar()
})

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

async function limpar(): Promise<void> {
  await falso.cliente.query(TABELAS_DO_ERP.map((tabela) => `delete from ${tabela}`).join('; '))
}

function todosOsPares(): string {
  return pares(lerColunasEsperadas().map((c): [string, string] => [c.tabela, c.coluna]))
}

// Um valor válido para cada marcador das consultas (contrato, seção 6). Marcador novo que não seja
// inteiro precisa entrar aqui.
function valorDeExemplo(marcador: string): string {
  if (marcador === 'pares') return todosOsPares()
  if (marcador === 'inicio') return data('2026-09-27')
  if (marcador === 'pendentes') return inteiros([185, 186])
  return inteiro(184)
}

function consultasDoErp(): string[] {
  return readdirSync(PASTA_SQL_ERP)
    .filter((arquivo) => arquivo.endsWith('.sql'))
    .map((arquivo) => arquivo.slice(0, -'.sql'.length))
    .sort()
}

function montarComExemplos(nome: string): string {
  const modelo = modeloErp(nome)
  const marcadores = [...new Set([...modelo.matchAll(/\{\{([a-z_][a-z0-9_]*)\}\}/g)].map((m) => m[1]))]
  return montar(modelo, Object.fromEntries(marcadores.map((m) => [m, valorDeExemplo(m)])))
}

function consultarEmpresaLocal(): Promise<string> {
  return falso.erp.consultar(montar(modeloErp('empresa-local'), { corte_documento: inteiro(184), corte_historico: inteiro(1847) }))
}

async function inserirTudoNaEmpresaUm(): Promise<void> {
  await falso.inserir('documento', [{ oid: 185, idempresa: 1 }])
  await falso.inserir('mercadoria_estoque_historico', [{ oid: 1848, _idlocalestoque: 1 }])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '3.000000' }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 1, _idmercadoriavariacao: 60, valcusto: '10.50' }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 1, _idmercadoriavariacao: 60, flaginativo: 'F' }])
  await falso.inserir('mercadoria_variacao_pessoa', [{ _idempresa: 1, _idmercadoriavariacao: 60, _idpessoa: 7, flaginativo: 'F' }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' }])
}

test('modeloErp lê o arquivo de sql/erp sem espaço sobrando', () => {
  const texto = modeloErp('vivos')
  assert.ok(texto.startsWith('select '))
  assert.equal(texto, texto.trim())
})

test('colunas: lista vazia quando todas as colunas esperadas existem', async () => {
  const dados = await falso.erp.consultar(montar(modeloErp('colunas'), { pares: todosOsPares() }))
  assert.equal(dados, '[]')
})

test('colunas: acusa a coluna apagada e as colunas de uma tabela que sumiu', async () => {
  const outro = await criarErpFalso()
  try {
    await outro.cliente.query('alter table documento drop column idempresa')
    await outro.cliente.query('drop table municipio')
    const dados = await outro.erp.consultar(montar(modeloErp('colunas'), { pares: todosOsPares() }))
    assert.deepEqual(JSON.parse(dados), ['documento.idempresa', 'municipio._idmunicipio', 'municipio.nome'])
  } finally {
    await outro.fechar()
  }
})

test('empresa-local: lista vazia quando empresa e local são todos 1', async () => {
  await limpar()
  await inserirTudoNaEmpresaUm()
  assert.equal(await consultarEmpresaLocal(), '[]')
})

test('empresa-local: acusa idempresa 2 acima do corte e ignora abaixo dele', async () => {
  await limpar()
  await inserirTudoNaEmpresaUm()
  await falso.inserir('documento', [{ oid: 184, idempresa: 2 }, { oid: 30, idempresa: 3 }])
  assert.equal(await consultarEmpresaLocal(), '[]')
  await falso.inserir('documento', [{ oid: 186, idempresa: 2 }, { oid: 187, idempresa: 2 }])
  assert.deepEqual(JSON.parse(await consultarEmpresaLocal()), [{ tabela: 'documento.idempresa', valor: 2 }])
})

test('empresa-local: acusa cada uma das oito colunas conferidas, uma vez por valor', async () => {
  await limpar()
  await inserirTudoNaEmpresaUm()
  await falso.inserir('documento', [{ oid: 188, idempresa: 2 }])
  await falso.inserir('mercadoria_estoque_historico', [{ oid: 1847, _idlocalestoque: 9 }, { oid: 1849, _idlocalestoque: 2 }])
  await falso.inserir('mercadoria_estoque', [{ oid: 2, _idempresa: 3, _idlocalestoque: 1 }, { oid: 3, _idempresa: 1, _idlocalestoque: 4 }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 5 }, { _idempresa: 5 }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 6 }])
  await falso.inserir('mercadoria_variacao_pessoa', [{ _idempresa: 7 }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 8 }])
  assert.deepEqual(JSON.parse(await consultarEmpresaLocal()), [
    { tabela: 'documento.idempresa', valor: 2 },
    { tabela: 'mercadoria_custo._idempresa', valor: 5 },
    { tabela: 'mercadoria_estoque._idempresa', valor: 3 },
    { tabela: 'mercadoria_estoque._idlocalestoque', valor: 4 },
    { tabela: 'mercadoria_estoque_historico._idlocalestoque', valor: 2 },
    { tabela: 'mercadoria_variacao_empresa._idempresa', valor: 6 },
    { tabela: 'mercadoria_variacao_pessoa._idempresa', valor: 7 },
    { tabela: 'pessoa_funcionario._idempresa', valor: 8 },
  ])
})

test('vivos: só os documentos acima do corte, em ordem de oid', async () => {
  await limpar()
  await falso.inserir('documento', [{ oid: 190 }, { oid: 184 }, { oid: 185 }, { oid: 30 }, { oid: 186 }])
  const dados = await falso.erp.consultar(montar(modeloErp('vivos'), { corte_documento: inteiro(184) }))
  assert.deepEqual(JSON.parse(dados), [185, 186, 190])
})

test("vivos: '[]' quando não há documento acima do corte", async () => {
  await limpar()
  await falso.inserir('documento', [{ oid: 184 }, { oid: 10 }])
  const dados = await falso.erp.consultar(montar(modeloErp('vivos'), { corte_documento: inteiro(184) }))
  assert.equal(dados, '[]')
})

test('antes-da-virada: agrupa por modelo só os documentos acima do corte e anteriores a 28/09', async () => {
  await limpar()
  await falso.inserir('documento', [
    { oid: 150, _iddocumento: 48, modelo: 'LE', datahora: '2026-09-26 22:47:00' },
    { oid: 184, _iddocumento: 49, modelo: 'AS', datahora: '2026-09-26 22:40:00' },
    { oid: 185, _iddocumento: 94, modelo: 'AC', datahora: '2026-09-27 14:20:00' },
    { oid: 186, _iddocumento: 95, modelo: 'AC', datahora: '2026-09-27 14:21:30.5' },
    { oid: 228, _iddocumento: 137, modelo: 'AC', datahora: '2026-09-27 14:33:00' },
    { oid: 229, _iddocumento: 2, modelo: 'CP', datahora: '2026-04-10 00:00:00' },
    { oid: 230, _iddocumento: 3, modelo: 'CP', datahora: '2026-09-27 23:59:59.999999' },
    { oid: 231, _iddocumento: 50, modelo: 'PA', datahora: '2026-09-28 00:00:00' },
    { oid: 232, _iddocumento: 51, modelo: 'AX', datahora: '2026-09-28 07:55:00' },
  ])
  const dados = await falso.erp.consultar(montar(modeloErp('antes-da-virada'), { corte_documento: inteiro(184) }))
  assert.deepEqual(JSON.parse(dados), [
    {
      modelo: 'AC', quantidade: 3, primeiro_codigo: 94, ultimo_codigo: 137,
      primeira_datahora: '2026-09-27T14:20:00', ultima_datahora: '2026-09-27T14:33:00',
    },
    {
      modelo: 'CP', quantidade: 2, primeiro_codigo: 2, ultimo_codigo: 3,
      primeira_datahora: '2026-04-10T00:00:00', ultima_datahora: '2026-09-27T23:59:59.999999',
    },
  ])
})

test("antes-da-virada: '[]' quando todo documento acima do corte já é de 28/09 em diante", async () => {
  await limpar()
  await falso.inserir('documento', [
    { oid: 184, _iddocumento: 49, modelo: 'AS', datahora: '2026-09-26 22:40:00' },
    { oid: 231, _iddocumento: 50, modelo: 'PA', datahora: '2026-09-28 08:05:00' },
  ])
  const dados = await falso.erp.consultar(montar(modeloErp('antes-da-virada'), { corte_documento: inteiro(184) }))
  assert.equal(dados, '[]')
})

test('toda consulta de sql/erp é um comando só, sem comentário, e passa na trava de só leitura depois de montada', () => {
  const nomes = consultasDoErp()
  assert.ok(nomes.length >= 4, `achou só ${nomes.length} consultas em sql/erp`)
  for (const nome of nomes) {
    const texto = modeloErp(nome)
    assert.ok(!texto.includes('--'), `${nome}.sql tem comentário --`)
    assert.ok(!texto.includes('/*'), `${nome}.sql tem comentário /*`)
    assert.ok(!texto.includes(';'), `${nome}.sql tem ;`)
    const montado = montarComExemplos(nome)
    assert.doesNotThrow(() => verificarSomenteLeitura(montado), `${nome}.sql não passa na trava de só leitura`)
  }
})

test('nenhuma consulta de sql/erp usa select *, sintaxe do Postgres 15 ou 16, nem data convertida em texto', () => {
  const colunasDeData = lerColunasEsperadas().filter((c) => c.tipo === 'timestamp').map((c) => c.coluna)
  // O ERP roda Postgres 14; o ERP falso roda 16 e aceitaria estas. json_object e json_array existem
  // no 14 com outro sentido ou nem existem: use json_build_object, json_build_array e json_agg.
  const soDoPostgres15ou16 = [
    'json_object', 'json_array', 'json_objectagg', 'json_arrayagg', 'json_scalar', 'json_serialize', 'any_value',
    'regexp_count', 'regexp_like', 'regexp_instr', 'regexp_substr', 'array_shuffle', 'array_sample',
    'random_normal', 'pg_input_is_valid', 'date_add', 'date_subtract', 'system_user',
  ]
  const nomes = consultasDoErp()
  assert.ok(nomes.length >= 4, `achou só ${nomes.length} consultas em sql/erp`)
  for (const nome of nomes) {
    const texto = modeloErp(nome).toLowerCase()
    assert.ok(!/select\s+\*/.test(texto), `${nome}.sql usa select *`)
    for (const palavra of soDoPostgres15ou16) {
      assert.ok(!new RegExp(`\\b${palavra}\\b`).test(texto), `${nome}.sql usa ${palavra}, que não serve no Postgres 14 do ERP`)
    }
    assert.ok(!/\bis\s+(not\s+)?json\b/.test(texto), `${nome}.sql usa IS JSON, que o Postgres 14 do ERP não tem`)
    for (const coluna of colunasDeData) {
      assert.ok(!new RegExp(`\\b${coluna}\\s*::\\s*(text|varchar)`).test(texto), `${nome}.sql converte ${coluna} em texto`)
    }
  }
})

test('toda consulta de sql/erp roda no ERP falso vazio, só com as colunas esperadas, e devolve JSON', async () => {
  await limpar()
  const nomes = consultasDoErp()
  assert.ok(nomes.length >= 4, `achou só ${nomes.length} consultas em sql/erp`)
  for (const nome of nomes) {
    let dados: string
    try {
      dados = await falso.erp.consultar(montarComExemplos(nome))
    } catch (erro) {
      assert.fail(`${nome}.sql não rodou no ERP falso: ${erro instanceof Error ? erro.message : String(erro)}`)
    }
    assert.doesNotThrow(() => JSON.parse(dados), `${nome}.sql não devolveu JSON`)
  }
})
