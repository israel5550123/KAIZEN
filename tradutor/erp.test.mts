import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarErp, ErroErp, type OpcoesErp } from './erp.mts'

const URL_ERP = 'https://erp.teste/publica'
const TOKEN = 'tok-segredo-123'
// 14h00m10s de terça, 29/09/2026, em Fortaleza
const INICIO = Date.parse('2026-09-29T17:00:10Z')

type Resposta = { status: number; corpo: string } | Error
type Chamada = { url: string; init: RequestInit }

function envelope(dados: string): string {
  return JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ dados }] })
}

// fetch falso: devolve as respostas na ordem, e a última se repete; o relógio só anda quando o cliente espera
function montar(respostas: Resposta[], extra: Partial<OpcoesErp> = {}) {
  const chamadas: Chamada[] = []
  const esperas: number[] = []
  let relogio = INICIO
  let proxima = 0
  const fetchFalso = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    chamadas.push({ url: String(url), init: init ?? {} })
    const r = respostas[Math.min(proxima++, respostas.length - 1)]
    if (r instanceof Error) throw r
    return new Response(r.corpo, { status: r.status })
  }
  const erp = criarErp({
    url: URL_ERP,
    token: TOKEN,
    fetch: fetchFalso as typeof fetch,
    agora: () => relogio,
    esperar: async (ms: number) => { esperas.push(ms); relogio += ms },
    ...extra,
  })
  return { erp, chamadas, esperas, avancar: (ms: number) => { relogio += ms } }
}

async function erroDe(promessa: Promise<unknown>): Promise<ErroErp> {
  try {
    await promessa
  } catch (erro) {
    assert.ok(erro instanceof ErroErp, `esperava ErroErp, veio ${String(erro)}`)
    return erro
  }
  assert.fail('a consulta deveria ter falhado')
}

test('envia o POST certo e devolve o texto da coluna dados', async () => {
  const { erp, chamadas } = montar([{ status: 200, corpo: envelope('[185, 186]') }])
  const dados = await erp.consultar('  select 1 as dados;  ')
  assert.equal(dados, '[185, 186]')
  assert.equal(chamadas.length, 1)
  assert.equal(chamadas[0].url, 'https://erp.teste/publica/api/consulta/sql/v1?offset=0&limit=100')
  assert.equal(chamadas[0].init.method, 'POST')
  const cabecalhos = chamadas[0].init.headers as Record<string, string>
  assert.equal(cabecalhos['Authorization'], `Authentication ${TOKEN}`)
  assert.equal(cabecalhos['Content-Type'], 'application/json')
  assert.equal(chamadas[0].init.body, JSON.stringify({ sql: 'select 1 as dados' }))
  assert.ok(chamadas[0].init.signal instanceof AbortSignal)
  // Um 307/308 nunca reenvia o POST, com o token, para outro endereço.
  assert.equal(chamadas[0].init.redirect, 'error')

  // a URL do ERP com barra no fim leva ao mesmo endereço
  const comBarra = montar([{ status: 200, corpo: envelope('[]') }], { url: `${URL_ERP}/` })
  await comBarra.erp.consultar('select 1 as dados')
  assert.equal(comBarra.chamadas[0].url, 'https://erp.teste/publica/api/consulta/sql/v1?offset=0&limit=100')
})

test('SQL de escrita é recusado sem chamar o ERP', async () => {
  const { erp, chamadas } = montar([{ status: 200, corpo: envelope('[]') }])
  const erro = await erroDe(erp.consultar('with x as (delete from documento returning oid) select oid as dados from x'))
  assert.equal(erro.tipo, 'recusado')
  assert.match(erro.message, /^recusado: /)
  assert.equal(chamadas.length, 0)
})

test('19 chamadas no mesmo minuto passam e a 20ª espera a virada do minuto mais 1 s', async () => {
  const { erp, chamadas, esperas } = montar([{ status: 200, corpo: envelope('[]') }])
  for (let i = 0; i < 19; i++) await erp.consultar('select 1 as dados')
  assert.deepEqual(esperas, [])
  await erp.consultar('select 1 as dados')
  // relógio em 14h00m10s: até 14h01m00s são 50 s, mais 1 s de folga
  assert.deepEqual(esperas, [51_000])
  assert.equal(chamadas.length, 20)
})

test('a contagem recomeça quando o minuto do relógio vira', async () => {
  const { erp, esperas, avancar } = montar([{ status: 200, corpo: envelope('[]') }])
  for (let i = 0; i < 19; i++) await erp.consultar('select 1 as dados')
  avancar(50_000)
  for (let i = 0; i < 19; i++) await erp.consultar('select 1 as dados')
  assert.deepEqual(esperas, [])
})

test('no 429, espera a virada do minuto e repete', async () => {
  const { erp, chamadas, esperas } = montar([
    { status: 429, corpo: 'muitas chamadas' },
    { status: 429, corpo: 'muitas chamadas' },
    { status: 200, corpo: envelope('[1]') },
  ])
  assert.equal(await erp.consultar('select 1 as dados'), '[1]')
  assert.equal(chamadas.length, 3)
  // 14h00m10s → 14h01m01s (51 s); 14h01m01s → 14h02m01s (60 s)
  assert.deepEqual(esperas, [51_000, 60_000])
})

test('depois de 3 repetições com 429, desiste com ErroErp http 429', async () => {
  const { erp, chamadas, esperas } = montar([{ status: 429, corpo: 'muitas chamadas' }])
  const erro = await erroDe(erp.consultar('select 1 as dados'))
  assert.equal(erro.tipo, 'http')
  assert.equal(erro.status, 429)
  assert.equal(chamadas.length, 4)
  assert.deepEqual(esperas, [51_000, 60_000, 60_000])
})

test('401 e 403 viram erro de token', async () => {
  for (const status of [401, 403]) {
    const { erp } = montar([{ status, corpo: 'não autorizado' }])
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.equal(erro.tipo, 'token')
    assert.equal(erro.status, status)
  }
})

test('400 vira erro de consulta com o corpo da resposta', async () => {
  const { erp } = montar([{ status: 400, corpo: 'column "idloja" does not exist' }])
  const erro = await erroDe(erp.consultar('select idloja as dados from documento'))
  assert.equal(erro.tipo, 'consulta')
  assert.equal(erro.status, 400)
  assert.equal(erro.message, 'column "idloja" does not exist')
})

test('outro status de erro vira erro http com o status', async () => {
  const { erp } = montar([{ status: 502, corpo: 'bad gateway' }])
  const erro = await erroDe(erp.consultar('select 1 as dados'))
  assert.equal(erro.tipo, 'http')
  assert.equal(erro.status, 502)
})

test('erro de rede e prazo estourado viram erro de rede', async () => {
  const falhas = [new TypeError('fetch failed'), new DOMException('The operation was aborted due to timeout', 'TimeoutError')]
  for (const falha of falhas) {
    const { erp } = montar([falha])
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.equal(erro.tipo, 'rede')
    assert.equal(erro.status, null)
  }
})

test('resposta sem a coluna dados vira erro de consulta', async () => {
  const corpos = [
    JSON.stringify({ offset: 0, limit: 100, total: 0, hasNext: false, items: [] }),
    JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ outra: '[]' }] }),
    JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ dados: 5 }] }),
    JSON.stringify({ offset: 0, limit: 100, total: 2, hasNext: false, items: [{ dados: '[]' }, { dados: '[]' }] }),
    JSON.stringify({ mensagem: 'sem items' }),
    'isto não é JSON',
  ]
  for (const corpo of corpos) {
    const { erp } = montar([{ status: 200, corpo }])
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.equal(erro.tipo, 'consulta')
    assert.equal(erro.message, 'resposta sem a coluna dados')
  }
})

test('o token nunca aparece na mensagem de erro', async () => {
  const cenarios: Resposta[][] = [
    [{ status: 401, corpo: `token ${TOKEN} inválido` }],
    [{ status: 400, corpo: `erro com ${TOKEN} no corpo` }],
    [{ status: 500, corpo: TOKEN }],
    [{ status: 429, corpo: TOKEN }],
    [new TypeError(`falhou ao enviar Authentication ${TOKEN}`)],
  ]
  for (const respostas of cenarios) {
    const { erp } = montar(respostas)
    const erro = await erroDe(erp.consultar('select 1 as dados'))
    assert.ok(!erro.message.includes(TOKEN), `token na mensagem: ${erro.message}`)
    assert.ok(!String(erro.stack).includes(TOKEN), 'token na pilha do erro')
  }
})

test('chama em série: três consultas ao mesmo tempo não se sobrepõem', async () => {
  let abertas = 0
  let maximo = 0
  const fetchLento = async (): Promise<Response> => {
    abertas++
    maximo = Math.max(maximo, abertas)
    await new Promise((resolver) => setTimeout(resolver, 20))
    abertas--
    return new Response(envelope('[]'), { status: 200 })
  }
  const erp = criarErp({ url: URL_ERP, token: TOKEN, fetch: fetchLento as typeof fetch, agora: () => INICIO, esperar: async () => {} })
  const resultados = await Promise.all([
    erp.consultar('select 1 as dados'),
    erp.consultar('select 2 as dados'),
    erp.consultar('select 3 as dados'),
  ])
  assert.deepEqual(resultados, ['[]', '[]', '[]'])
  assert.equal(maximo, 1)
})

test('uma consulta que falha não trava as seguintes', async () => {
  const { erp } = montar([
    { status: 502, corpo: 'bad gateway' },
    { status: 200, corpo: envelope('[7]') },
  ])
  await erroDe(erp.consultar('select 1 as dados'))
  assert.equal(await erp.consultar('select 1 as dados'), '[7]')
})
