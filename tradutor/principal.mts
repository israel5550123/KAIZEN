import { conectar } from './banco.mts'
import { listarExecucoes, migrarAgora } from './comandos-vps.mts'
import { rodarConferencia } from './conferencia-dono.mts'
import { lerConfig } from './config.mts'
import { PRAZO_MIN } from './constantes.mts'
import { criarErp } from './erp.mts'
import { executar, registrarEstouro } from './execucao.mts'
import type { Dependencias, Saida } from './execucao.mts'
import { emFortaleza, somarDias } from './janela.mts'
import { criarEnvioTelegram, textoTeste } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'
import type { TipoExecucao } from './tipos.mts'

const USO = 'uso: node tradutor/principal.mts hora|noite [--manual] | teste-telegram | conferencia [produto ...] | migrar | execucoes [AAAA-MM-DD]'

export async function comPrazo<T>(fazer: () => Promise<T>, prazoMs: number, aoEstourar: () => Promise<void>): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    // Depois que o prazo estoura, o resultado de fazer não vale mais, mesmo que chegue durante aoEstourar.
    let decidido = false
    const relogio = setTimeout(() => {
      decidido = true
      aoEstourar()
        .catch(() => undefined)
        .then(() => rejeitar(new ErroKaizen({ tipo: 'outra', detalhe: 'passou do prazo' })))
    }, prazoMs)
    Promise.resolve()
      .then(fazer)
      .then(
        (valor) => {
          if (decidido) return
          decidido = true
          clearTimeout(relogio)
          resolver(valor)
        },
        (erro: unknown) => {
          if (decidido) return
          decidido = true
          clearTimeout(relogio)
          rejeitar(erro)
        },
      )
  })
}

function linha(tipo: TipoExecucao, saida: Saida): string {
  const contagens = Object.entries(saida.contagens).map(([nome, n]) => `${nome}=${n}`).join(', ') || 'sem contagens'
  return `${tipo} ${saida.resultado}: ${contagens}${saida.mensagem ? ' — ' + saida.mensagem : ''}`
}

// Devolve o código de saída: 0 para ok, aviso e pulada; 1 para falha; 2 para comando errado.
export async function principal(argumentos: string[], env: Record<string, string | undefined>, fetchFn?: typeof fetch): Promise<number> {
  const [comando, ...resto] = argumentos
  if (comando === 'teste-telegram' && resto.length === 0) {
    const config = lerConfig(env)
    const enviar = criarEnvioTelegram(config.telegramToken, config.telegramChat, fetchFn)
    const ok = await enviar(textoTeste())
    if (ok === null) console.log('teste-telegram: TELEGRAM_TOKEN e TELEGRAM_CHAT não estão configurados; a mensagem saiu só aqui')
    else console.log(ok ? 'teste-telegram: o Telegram aceitou a mensagem' : 'teste-telegram: o Telegram não aceitou a mensagem')
    return ok === true ? 0 : 1
  }
  if (comando === 'conferencia') {
    // Só lê o banco do Kaizen: os argumentos que vierem depois são os códigos dos produtos para o saldo.
    const config = lerConfig(env)
    console.log(await rodarConferencia(config.kaizenUrl, resto, Date.now()))
    return 0
  }
  if (comando === 'migrar' && resto.length === 0) {
    const cliente = await conectar(lerConfig(env).kaizenUrl)
    try {
      const saida = await migrarAgora(cliente)
      console.log(saida.texto)
      return saida.codigo
    } finally {
      await cliente.end().catch(() => undefined)
    }
  }
  if (comando === 'execucoes' && (resto.length === 0 || (resto.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(resto[0])))) {
    // Sem dia: desde 7 dias atrás, em Fortaleza.
    const desde = resto[0] ?? somarDias(emFortaleza(Date.now()).data, -7)
    const cliente = await conectar(lerConfig(env).kaizenUrl)
    try {
      for (const linha of await listarExecucoes(cliente, desde)) console.log(linha)
      return 0
    } finally {
      await cliente.end().catch(() => undefined)
    }
  }
  const manual = resto.length === 1 && resto[0] === '--manual'
  if ((comando !== 'hora' && comando !== 'noite') || (resto.length > 0 && !manual)) {
    console.log(USO)
    return 2
  }
  const tipo: TipoExecucao = comando
  const config = lerConfig(env)
  const dep: Dependencias = {
    erp: criarErp({ url: config.erpUrl, token: config.erpToken, fetch: fetchFn }),
    conectarKaizen: () => conectar(config.kaizenUrl),
    enviar: criarEnvioTelegram(config.telegramToken, config.telegramChat, fetchFn),
    agora: Date.now,
  }
  try {
    const saida = await comPrazo(
      () => executar({ tipo, manual }, dep),
      PRAZO_MIN[tipo] * 60_000,
      () => registrarEstouro({ tipo, manual }, dep),
    )
    console.log(linha(tipo, saida))
    return saida.resultado === 'falha' ? 1 : 0
  } catch (erro) {
    console.log(`${tipo} falha: ${erro instanceof Error ? erro.message : String(erro)}`)
    return 1
  }
}

if (import.meta.main) {
  let codigo = 1
  try {
    codigo = await principal(process.argv.slice(2), process.env)
  } catch (erro) {
    console.log(`o tradutor não começou: ${erro instanceof Error ? erro.message : String(erro)}`)
  }
  // Sai mesmo com uma conexão presa (estouro do prazo): fechar o processo solta a trava no Postgres.
  process.exit(codigo)
}
