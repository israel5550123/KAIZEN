import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import { garantirLocal } from './banco.mts'
import { lerConfig } from './config.mts'
import { criarErpFalso } from './erp-falso.mts'
import { comPrazo, principal } from './principal.mts'
import { textoTeste } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'

// Valores de mentira: nenhum teste fala com o ERP, o Telegram ou um banco de verdade (só o Postgres local de teste).
const AMBIENTE = {
  MEUERP_TOKEN: 'token-de-teste',
  KAIZEN_URL: 'postgres://kaizen:senha@localhost:5434/kaizen',
  TELEGRAM_TOKEN: '123:abc',
  TELEGRAM_CHAT: '42',
}

test('lerConfig lê as variáveis e usa o endereço padrão do ERP', () => {
  assert.deepEqual(lerConfig(AMBIENTE), {
    erpUrl: 'https://api.meuerponline.com.br/publica',
    erpToken: 'token-de-teste',
    kaizenUrl: 'postgres://kaizen:senha@localhost:5434/kaizen',
    telegramToken: '123:abc',
    telegramChat: '42',
  })
  assert.deepEqual(
    lerConfig({ MEUERP_TOKEN: 't', KAIZEN_URL: 'postgres://k@localhost:5434/k', MEUERP_URL: 'http://localhost:9999/publica' }),
    { erpUrl: 'http://localhost:9999/publica', erpToken: 't', kaizenUrl: 'postgres://k@localhost:5434/k' },
  )
})

test('lerConfig recusa sem MEUERP_TOKEN ou sem KAIZEN_URL', () => {
  assert.throws(() => lerConfig({ KAIZEN_URL: 'postgres://k@localhost:5434/k' }), { message: 'falta MEUERP_TOKEN' })
  assert.throws(() => lerConfig({ MEUERP_TOKEN: 't', KAIZEN_URL: '  ' }), { message: 'falta KAIZEN_URL' })
})

test('comPrazo devolve o resultado quando termina a tempo, sem chamar aoEstourar', async () => {
  let estourou = false
  const valor = await comPrazo(async () => 'terminou', 1000, async () => {
    estourou = true
  })
  assert.equal(valor, 'terminou')
  assert.equal(estourou, false)
})

test('comPrazo estoura: chama aoEstourar e rejeita com "passou do prazo"', async () => {
  let estourou = false
  const nuncaTermina = () => new Promise<string>(() => undefined)
  await assert.rejects(
    comPrazo(nuncaTermina, 20, async () => {
      estourou = true
    }),
    (erro: unknown) => erro instanceof ErroKaizen && erro.motivo.tipo === 'outra' && erro.motivo.detalhe === 'passou do prazo',
  )
  assert.equal(estourou, true)
})

test('teste-telegram manda o textoTeste pelo Telegram e sai com 0', async () => {
  const pedidos: Array<{ url: string; corpo: { chat_id: string; text: string } }> = []
  const fetchFalso = (async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(url), corpo: JSON.parse(String(init?.body)) })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }) as typeof fetch

  const codigo = await principal(['teste-telegram'], AMBIENTE, fetchFalso)

  assert.equal(codigo, 0)
  assert.equal(pedidos.length, 1)
  assert.equal(pedidos[0].url, 'https://api.telegram.org/bot123:abc/sendMessage')
  assert.equal(pedidos[0].corpo.text, textoTeste())
})

test('o comando "hora" lê o ERP pela API, grava no banco da KAIZEN_URL, imprime a linha do resultado e sai com 0; com o ERP fora, sai com 1', async (t) => {
  const banco = await criarBancoKaizen()
  const falso = await criarErpFalso()
  try {
    // Um ajuste de custo acima do corte, como os 44 de 27/09.
    await falso.inserir('documento', [{
      oid: 185, _iddocumento: 94, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
      datahora: '2026-09-27 14:20:00', idempresa: 1,
    }])
    let erpFora = false
    const telegram: string[] = []
    // fetch falso: o endereço do Telegram guarda a mensagem; o do ERP responde com o ERP falso, no envelope da API.
    const fetchFalso = (async (url: string | URL | Request, init?: RequestInit) => {
      const corpo = JSON.parse(String(init?.body)) as { sql?: string; text?: string }
      if (String(url).startsWith('https://api.telegram.org/')) {
        telegram.push(corpo.text ?? '')
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      if (erpFora) return new Response('Bad Gateway', { status: 502 })
      const dados = await falso.erp.consultar(corpo.sql ?? '')
      return new Response(JSON.stringify({ offset: 0, limit: 100, total: 1, hasNext: false, items: [{ dados }] }), { status: 200 })
    }) as typeof fetch
    const impressos: string[] = []
    t.mock.method(console, 'log', (...partes: unknown[]) => {
      impressos.push(partes.join(' '))
    })
    garantirLocal(banco.url)
    const ambiente = { ...AMBIENTE, MEUERP_URL: 'http://erp.falso/publica', KAIZEN_URL: banco.url }

    assert.equal(await principal(['hora'], ambiente, fetchFalso), 0)
    erpFora = true
    assert.equal(await principal(['hora'], ambiente, fetchFalso), 1)

    assert.deepEqual(impressos, [
      'hora ok: documentos_lidos=1, documentos_novos=1, apagados=0, movimentos=0, foto=0, produtos=0, pessoas=0, funcionarios=0, fornecedores=0, avisos=0, respostas=3',
      'hora falha: sem contagens — o ERP respondeu com erro (HTTP 502)',
    ])
    const gravados = await banco.cliente.query(`select origem_id, modelo from kaizen.documento`)
    assert.deepEqual(gravados.rows, [{ origem_id: '185', modelo: 'AC' }])
    assert.equal(telegram.length, 1)
    assert.match(telegram[0], /^Kaizen: a leitura das \d{1,2}h falhou — o ERP não respondeu\. Os dados do Kaizen continuam os das \d{1,2}h\. /)
  } finally {
    await falso.fechar()
    await banco.fechar()
  }
})

test('comando desconhecido sai com 2, sem ler a configuração', async () => {
  assert.equal(await principal([], {}), 2)
  assert.equal(await principal(['limpar'], {}), 2)
  assert.equal(await principal(['hora', '--forcar'], {}), 2)
})
