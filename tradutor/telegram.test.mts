import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  criarEnvioTelegram, textoFalha, textoVolta, textoTeste, deveAvisarFalha, deveAvisarVolta, textoResumo,
} from './telegram.mts'
import type { Anterior } from './registro.mts'
import type { Aviso, Resultado, TipoAviso } from './tipos.mts'

const TOKEN = '123456:segredo-do-robo'

type Chamada = { url: string; init: RequestInit }

// fetch falso: guarda cada chamada e responde o que o teste mandar; nunca sai para a internet.
function fetchFalso(responder: () => Promise<Response>): { fetchFn: typeof fetch; chamadas: Chamada[] } {
  const chamadas: Chamada[] = []
  const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(url), init: init ?? {} })
    return responder()
  }) as typeof fetch
  return { fetchFn, chamadas }
}

function respostaJson(corpo: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }))
}

test('criarEnvioTelegram manda POST ao robô com o chat e o texto puro, sem formatação, e devolve true', async () => {
  const { fetchFn, chamadas } = fetchFalso(() => respostaJson({ ok: true, result: { message_id: 7 } }))
  const enviar = criarEnvioTelegram(TOKEN, '424242', fetchFn)
  assert.equal(await enviar('Kaizen: voltou a funcionar às 15h.'), true)
  assert.equal(chamadas.length, 1)
  const { url, init } = chamadas[0]
  assert.equal(url, `https://api.telegram.org/bot${TOKEN}/sendMessage`)
  assert.equal(init.method, 'POST')
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json' })
  assert.deepEqual(JSON.parse(String(init.body)), { chat_id: '424242', text: 'Kaizen: voltou a funcionar às 15h.' })
  assert.ok(init.signal instanceof AbortSignal)
})

test('criarEnvioTelegram devolve false quando o Telegram não aceita a mensagem', async () => {
  const recusa = fetchFalso(() => respostaJson({ ok: false, error_code: 400, description: 'Bad Request: chat not found' }, 400))
  assert.equal(await criarEnvioTelegram(TOKEN, '424242', recusa.fetchFn)('oi'), false)
  const semJson = fetchFalso(() => Promise.resolve(new Response('<html>502</html>', { status: 502 })))
  assert.equal(await criarEnvioTelegram(TOKEN, '424242', semJson.fetchFn)('oi'), false)
})

test('criarEnvioTelegram devolve false no erro de rede e não imprime o token', async (t) => {
  const log = t.mock.method(console, 'log', () => undefined)
  const erro = t.mock.method(console, 'error', () => undefined)
  const { fetchFn } = fetchFalso(() => Promise.reject(new TypeError(`fetch failed: https://api.telegram.org/bot${TOKEN}/sendMessage`)))
  assert.equal(await criarEnvioTelegram(TOKEN, '424242', fetchFn)('oi'), false)
  const impresso = [...log.mock.calls, ...erro.mock.calls].map((c) => c.arguments.join(' ')).join('\n')
  assert.ok(!impresso.includes(TOKEN))
})

test('criarEnvioTelegram sem token ou sem chat imprime o texto, não chama a rede e devolve null', async (t) => {
  const log = t.mock.method(console, 'log', () => undefined)
  const { fetchFn, chamadas } = fetchFalso(() => respostaJson({ ok: true }))
  assert.equal(await criarEnvioTelegram(undefined, '424242', fetchFn)('Kaizen: mensagem de teste.'), null)
  assert.equal(await criarEnvioTelegram(TOKEN, undefined, fetchFn)('segunda'), null)
  assert.equal(await criarEnvioTelegram('', '', fetchFn)('terceira'), null)
  assert.equal(chamadas.length, 0)
  assert.deepEqual(log.mock.calls.map((c) => c.arguments), [['Kaizen: mensagem de teste.'], ['segunda'], ['terceira']])
})

test('textoFalha do ERP fora, com e sem a hora da última leitura boa', () => {
  const motivo = { tipo: 'erp_fora', detalhe: 'fetch failed' } as const
  assert.equal(
    textoFalha(14, motivo, 13, 'às 15h'),
    'Kaizen: a leitura das 14h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 13h. Nada a fazer: ele tenta de novo às 15h.',
  )
  assert.equal(
    textoFalha(22, motivo, null, 'em 29/09 às 8h'),
    'Kaizen: a leitura das 22h falhou — o ERP não respondeu. Nada a fazer: ele tenta de novo em 29/09 às 8h.',
  )
})

test('textoFalha do token recusado, do ERP que mudou por dentro e do banco fora', () => {
  assert.equal(
    textoFalha(14, { tipo: 'token', detalhe: 'resposta 401' }, 13, 'às 15h'),
    'Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.',
  )
  assert.equal(
    textoFalha(14, { tipo: 'estrutura', detalhe: 'colunas que sumiram do ERP: documento.idempresa' }, 13, 'às 15h'),
    'Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: colunas que sumiram do ERP: documento.idempresa',
  )
  assert.equal(
    textoFalha(14, { tipo: 'banco_fora', detalhe: 'connect ECONNREFUSED' }, 13, 'às 15h'),
    'Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu.',
  )
})

test('textoFalha de outro motivo, com e sem a hora da última leitura boa', () => {
  const motivo = { tipo: 'outra', detalhe: 'a leitura das 14h passou do prazo' } as const
  assert.equal(
    textoFalha(14, motivo, 13, 'às 15h'),
    'Kaizen: a leitura das 14h falhou — a leitura das 14h passou do prazo. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.',
  )
  assert.equal(
    textoFalha(8, motivo, null, 'às 9h'),
    'Kaizen: a leitura das 8h falhou — a leitura das 14h passou do prazo. Abra uma sessão com o Claude e cole esta mensagem.',
  )
})

test('textoFalha do cálculo dos indicadores: a leitura terminou, com e sem a hora da última leitura boa', () => {
  const motivo = { tipo: 'indicadores', detalhe: 'division by zero' } as const
  assert.equal(
    textoFalha(14, motivo, 13, 'às 15h'),
    'Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — division by zero. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.',
  )
  assert.equal(
    textoFalha(22, motivo, null, 'em 30/09 às 8h'),
    'Kaizen: a leitura das 22h terminou, mas o cálculo dos indicadores falhou — division by zero. Abra uma sessão com o Claude e cole esta mensagem.',
  )
})

test('textoFalha com um detalhe enorme cabe no Telegram e mantém o que fazer no fim', () => {
  const detalhe = 'x'.repeat(10_000)
  const outra = textoFalha(14, { tipo: 'outra', detalhe }, 13, 'às 15h')
  assert.ok(outra.length <= 4000, `tem ${outra.length} caracteres`)
  assert.ok(outra.endsWith('x (…). Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.'))
  const estrutura = textoFalha(14, { tipo: 'estrutura', detalhe }, 13, 'às 15h')
  assert.ok(estrutura.length <= 4000, `tem ${estrutura.length} caracteres`)
  assert.ok(estrutura.endsWith('x (…)'))
})

test('textoVolta e textoTeste', () => {
  assert.equal(textoVolta(15), 'Kaizen: voltou a funcionar às 15h.')
  assert.equal(textoTeste(), 'Kaizen: mensagem de teste. O aviso de falha chega por aqui.')
})

test('deveAvisarFalha: avisa uma vez por queda e de novo se a mensagem anterior não chegou', () => {
  const anterior = (resultado: Anterior['resultado'], telegramOk: boolean | null): Anterior =>
    ({ id: 1, tipo: 'hora', resultado, telegramOk, resumoOk: false })
  const casos: Array<[Anterior | null, boolean]> = [
    [null, true],
    [anterior('ok', null), true],
    [anterior('aviso', true), true],
    [anterior('falha', true), false],
    [anterior('falha', false), true],
    [anterior('falha', null), true],
  ]
  for (const [anterior, esperado] of casos) {
    assert.equal(deveAvisarFalha(anterior), esperado, JSON.stringify(anterior))
  }
})

test('deveAvisarVolta: só quando esta deu certo e a anterior falhou, faltou leitura ou a volta anterior foi recusada', () => {
  const falha: Anterior = { id: 1, tipo: 'hora', resultado: 'falha', telegramOk: true, resumoOk: false }
  const ok: Anterior = { id: 1, tipo: 'hora', resultado: 'ok', telegramOk: null, resumoOk: false }
  // O Telegram recusou a volta da anterior: na hora, e na noite que mandou o resumo.
  const voltaRecusada: Anterior = { id: 1, tipo: 'hora', resultado: 'ok', telegramOk: false, resumoOk: false }
  const noiteComVoltaRecusada: Anterior = { id: 1, tipo: 'noite', resultado: 'aviso', telegramOk: false, resumoOk: true }
  // Na noite sem resumo marcado, telegram_ok = não é o resumo recusado: quem repete é o resumo, não a volta.
  const noiteComResumoRecusado: Anterior = { id: 1, tipo: 'noite', resultado: 'aviso', telegramOk: false, resumoOk: false }
  const casos: Array<[Resultado, Anterior | null, boolean, boolean]> = [
    ['ok', falha, false, true],
    ['aviso', falha, false, true],
    ['ok', ok, true, true],
    ['aviso', null, true, true],
    ['ok', ok, false, false],
    ['ok', null, false, false],
    ['falha', falha, true, false],
    ['pulada', falha, true, false],
    ['ok', voltaRecusada, false, true],
    ['aviso', noiteComVoltaRecusada, false, true],
    ['ok', noiteComResumoRecusado, false, false],
    ['falha', voltaRecusada, false, false],
  ]
  for (const [atual, anterior, faltaram, esperado] of casos) {
    assert.equal(deveAvisarVolta(atual, anterior, faltaram), esperado, `${atual} ${JSON.stringify(anterior)} ${faltaram}`)
  }
})

function aviso(tipo: TipoAviso, chave: string, texto: string): Aviso {
  return { tipo, chave, texto }
}

test('textoResumo sem avisos não manda nada', () => {
  assert.deepEqual(textoResumo([], ['codigo:tipo:AM'], '2026-09-29'), { texto: null, chaves: [] })
})

test('textoResumo agrupa por tipo, na ordem dos tipos, com título, contagem e o que fazer', () => {
  const avisos = [
    aviso('execucao_faltou', 'faltou:2026-09-29:10', 'a leitura das 10h de 29/09 não aconteceu'),
    aviso('documento_apagado', 'apagado:300', 'o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP'),
    aviso('execucao_faltou', 'faltou:2026-09-29:11', 'a leitura das 11h de 29/09 não aconteceu'),
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen'),
    aviso('fechamento_com_resto', 'fechamento:230', 'o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável'),
  ]
  assert.deepEqual(textoResumo(avisos, [], '2026-09-29'), {
    texto: [
      'Kaizen — resumo de 29/09:',
      'Códigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:',
      '- o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen',
      'Documentos apagados no ERP (1) — pergunte à gerente ou ao suporte:',
      '- o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP',
      'Fechamentos com linha de teste (1) — a quebra desse turno não é confiável:',
      '- o fechamento 118 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável',
      'Leituras que não aconteceram (2) — leve este resumo à próxima sessão com o Claude:',
      '- a leitura das 10h de 29/09 não aconteceu',
      '- a leitura das 11h de 29/09 não aconteceu',
    ].join('\n'),
    chaves: ['faltou:2026-09-29:10', 'apagado:300', 'faltou:2026-09-29:11', 'codigo:tipo:ZZ', 'fechamento:230'],
  })
})

test('textoResumo mostra até 5 exemplos por tipo e diz quantos ficaram de fora', () => {
  const avisos = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
    aviso('estoque_diverge', `estoque:${n}:virada:1`, `o saldo do produto ${n} no ERP (1) não bate com os movimentos (0)`))
  const { texto } = textoResumo(avisos, [], '2026-09-29')
  assert.equal(texto, [
    'Kaizen — resumo de 29/09:',
    'Estoque que não bate (8) — leve este resumo à próxima sessão com o Claude:',
    '- o saldo do produto 1 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 2 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 3 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 4 no ERP (1) não bate com os movimentos (0)',
    '- o saldo do produto 5 no ERP (1) não bate com os movimentos (0)',
    '- e mais 3',
  ].join('\n'))
})

test('textoResumo junta a mesma chave vinda de várias execuções e diz quantas vezes', () => {
  const avisos = [
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen'),
    aviso('execucao_pulada', 'pulada:41', 'uma leitura foi pulada porque a anterior ainda estava rodando'),
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen'),
    aviso('codigo_sem_traducao', 'codigo:tipo:ZZ', 'o código "ZZ" de tipo apareceu 3 vez(es) e não tem tradução no Kaizen'),
  ]
  assert.deepEqual(textoResumo(avisos, [], '2026-10-03'), {
    texto: [
      'Kaizen — resumo de 03/10:',
      'Códigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:',
      '- o código "ZZ" de tipo apareceu 3 vez(es) e não tem tradução no Kaizen (3 vezes)',
      'Leituras puladas (1) — leve este resumo à próxima sessão com o Claude:',
      '- uma leitura foi pulada porque a anterior ainda estava rodando',
    ].join('\n'),
    chaves: ['codigo:tipo:ZZ', 'pulada:41'],
  })
})

test('textoResumo põe os avisos já informados numa linha só e devolve também as chaves deles', () => {
  const avisos = [
    aviso('estoque_diverge', 'estoque:60:virada:0', 'o saldo do produto 60 no ERP (0) não bate com os movimentos (3.000000)'),
    aviso('codigo_sem_traducao', 'codigo:tipo:AM', 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen'),
    aviso('total_diferente', 'total:2026-09-29:itens:valor:10:9', 'em 29/09, itens:valor: ERP 10, Kaizen 9'),
    aviso('estoque_diverge', 'estoque:60:virada:0', 'o saldo do produto 60 no ERP (0) não bate com os movimentos (3.000000)'),
  ]
  assert.deepEqual(textoResumo(avisos, ['estoque:60:virada:0', 'codigo:tipo:AM', 'apagado:1'], '2026-09-30'), {
    texto: [
      'Kaizen — resumo de 30/09:',
      'Totais diferentes do ERP (1) — leve este resumo à próxima sessão com o Claude:',
      '- em 29/09, itens:valor: ERP 10, Kaizen 9',
      'Continuam 2 avisos já informados.',
    ].join('\n'),
    chaves: ['estoque:60:virada:0', 'codigo:tipo:AM', 'total:2026-09-29:itens:valor:10:9'],
  })
})

test('textoResumo só com avisos já informados traz o cabeçalho e a linha dos que continuam', () => {
  const avisos = [aviso('codigo_sem_traducao', 'codigo:tipo:AM', 'o código "AM" de tipo apareceu 4 vez(es) e não tem tradução no Kaizen')]
  assert.deepEqual(textoResumo(avisos, ['codigo:tipo:AM'], '2026-09-30'), {
    texto: 'Kaizen — resumo de 30/09:\nContinuam 1 avisos já informados.',
    chaves: ['codigo:tipo:AM'],
  })
})

test('textoResumo passa de 4.000 caracteres: corta aviso por aviso, diz quantos ficaram de fora e só devolve as chaves que saíram', () => {
  const tipos: TipoAviso[] = [
    'codigo_sem_traducao', 'documento_apagado', 'fechamento_com_resto', 'estoque_diverge',
    'movimento_sumiu', 'total_diferente', 'execucao_faltou', 'execucao_pulada',
  ]
  // 48 avisos novos de 150 caracteres, 6 de cada tipo, e um já informado no resumo anterior.
  const jaInformado = aviso('codigo_sem_traducao', 'codigo:tipo:AM', 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen')
  const avisos = [jaInformado, ...tipos.flatMap((tipo) =>
    [1, 2, 3, 4, 5, 6].map((n) => aviso(tipo, `${tipo}:${n}`, `aviso ${n} de ${tipo} `.padEnd(150, '.'))))]
  const { texto, chaves } = textoResumo(avisos, ['codigo:tipo:AM'], '2026-09-29')
  assert.ok(texto !== null)
  assert.ok(texto.length <= 4000, `tem ${texto.length} caracteres`)
  assert.ok(texto.startsWith('Kaizen — resumo de 29/09:\nCódigos novos no ERP (6) — '))
  // Cabem os 4 primeiros tipos inteiros (24 avisos) e 2 dos movimentos sumidos: ficam de fora 22 dos 48.
  assert.ok(texto.endsWith('\n- aviso 2 de movimento_sumiu '.padEnd(153, '.')
    + '\ne mais 22 avisos (o detalhe está no registro da execução)\nContinuam 1 avisos já informados.'), texto.slice(-300))
  // nenhuma linha sai pela metade: toda linha de aviso tem os 150 caracteres
  for (const linha of texto.split('\n').filter((l) => l.startsWith('- aviso'))) assert.equal(linha.length, 152)
  // As chaves cortadas não entram: no próximo resumo esses avisos, se continuarem, saem por inteiro.
  assert.deepEqual(chaves, [
    'codigo:tipo:AM',
    ...tipos.slice(0, 4).flatMap((tipo) => [1, 2, 3, 4, 5, 6].map((n) => `${tipo}:${n}`)),
    'movimento_sumiu:1', 'movimento_sumiu:2',
  ])
  assert.ok(!texto.includes('aviso 1 de execucao_faltou'))
})
