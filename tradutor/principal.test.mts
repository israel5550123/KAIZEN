import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lerConfig } from './config.mts'
import { comPrazo, principal } from './principal.mts'
import { textoTeste } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'

// Valores de mentira: nenhum teste fala com o ERP, o Telegram ou um banco de verdade.
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

test('comando desconhecido sai com 2, sem ler a configuração', async () => {
  assert.equal(await principal([], {}), 2)
  assert.equal(await principal(['limpar'], {}), 2)
  assert.equal(await principal(['hora', '--forcar'], {}), 2)
})
