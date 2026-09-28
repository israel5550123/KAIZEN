import { verificarSomenteLeitura } from './somente-leitura.mts'

export type TipoErroErp = 'rede' | 'http' | 'token' | 'consulta' | 'recusado'

export class ErroErp extends Error {
  tipo: TipoErroErp
  status: number | null
  constructor(tipo: TipoErroErp, mensagem: string, status: number | null = null) {
    super(mensagem)
    this.name = 'ErroErp'
    this.tipo = tipo
    this.status = status
  }
}

export type Erp = { consultar(sql: string): Promise<string> }

export type OpcoesErp = {
  url: string
  token: string
  fetch?: typeof fetch
  agora?: () => number
  esperar?: (ms: number) => Promise<void>
  limitePorMinuto?: number
  prazoMs?: number
}

const MINUTO = 60_000
const REPETICOES_429 = 3

export function criarErp(opcoes: OpcoesErp): Erp {
  const buscar = opcoes.fetch ?? fetch
  const agora = opcoes.agora ?? Date.now
  const esperar = opcoes.esperar ?? ((ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms)))
  const limite = opcoes.limitePorMinuto ?? 19
  const prazoMs = opcoes.prazoMs ?? 90_000
  const endereco = `${opcoes.url.replace(/\/+$/, '')}/api/consulta/sql/v1?offset=0&limit=100`
  const token = opcoes.token

  let minutoAtual = -1
  let chamadasNoMinuto = 0
  let fila: Promise<unknown> = Promise.resolve()

  // Tira o token de qualquer texto que vá virar mensagem de erro.
  function semToken(texto: string): string {
    return token === '' ? texto : texto.split(token).join('[token]')
  }

  async function esperarVirada(): Promise<void> {
    const t = agora()
    await esperar((Math.floor(t / MINUTO) + 1) * MINUTO + 1000 - t)
  }

  // A cota do ERP é por minuto do relógio: a 20ª chamada no mesmo minuto espera o minuto seguinte.
  async function aguardarVez(): Promise<void> {
    const minuto = Math.floor(agora() / MINUTO)
    if (minuto !== minutoAtual) {
      minutoAtual = minuto
      chamadasNoMinuto = 0
    }
    if (chamadasNoMinuto >= limite) {
      await esperarVirada()
      minutoAtual = Math.floor(agora() / MINUTO)
      chamadasNoMinuto = 0
    }
    chamadasNoMinuto++
  }

  async function chamar(sql: string): Promise<{ status: number; corpo: string }> {
    try {
      const resposta = await buscar(endereco, {
        method: 'POST',
        headers: { Authorization: `Authentication ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
        // Um redirecionamento nunca reenvia o POST com o token para outro endereço: vira erro de rede.
        redirect: 'error',
        signal: AbortSignal.timeout(prazoMs),
      })
      return { status: resposta.status, corpo: await resposta.text() }
    } catch (erro) {
      const prazo = erro instanceof Error && (erro.name === 'TimeoutError' || erro.name === 'AbortError')
      const detalhe = prazo ? `sem resposta em ${Math.round(prazoMs / 1000)} s` : erro instanceof Error ? erro.message : String(erro)
      throw new ErroErp('rede', semToken(`o ERP não respondeu: ${detalhe}`))
    }
  }

  function lerDados(corpo: string): string {
    try {
      const envelope = JSON.parse(corpo) as { items?: unknown }
      const itens = envelope?.items
      if (Array.isArray(itens) && itens.length === 1) {
        const dados = (itens[0] as { dados?: unknown } | null)?.dados
        if (typeof dados === 'string') return dados
      }
    } catch {
      // corpo que não é JSON cai no mesmo erro abaixo
    }
    throw new ErroErp('consulta', 'resposta sem a coluna dados')
  }

  async function executarConsulta(sqlOriginal: string): Promise<string> {
    let sql: string
    try {
      sql = verificarSomenteLeitura(sqlOriginal)
    } catch (erro) {
      throw new ErroErp('recusado', erro instanceof Error ? erro.message : String(erro))
    }
    let repeticoes = 0
    for (;;) {
      await aguardarVez()
      const { status, corpo } = await chamar(sql)
      if (status === 429) {
        if (repeticoes >= REPETICOES_429) {
          throw new ErroErp('http', `o ERP recusou por excesso de chamadas (HTTP 429) depois de ${REPETICOES_429} novas tentativas`, 429)
        }
        repeticoes++
        await esperarVirada()
        continue
      }
      if (status === 401 || status === 403) throw new ErroErp('token', `o ERP recusou o token de acesso (HTTP ${status})`, status)
      if (status === 400) throw new ErroErp('consulta', semToken(corpo), 400)
      if (status < 200 || status > 299) throw new ErroErp('http', `o ERP respondeu com erro (HTTP ${status})`, status)
      return lerDados(corpo)
    }
  }

  return {
    consultar(sql: string): Promise<string> {
      // Em série: cada consulta só sai depois que a anterior terminou, com erro ou não.
      const vez = fila.then(() => executarConsulta(sql))
      fila = vez.catch(() => undefined)
      return vez
    },
  }
}
