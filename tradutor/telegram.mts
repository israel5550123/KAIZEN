import { diaMes, O_QUE_FAZER, TITULOS } from './avisos.mts'
import type { Anterior } from './registro.mts'
import type { Aviso, MotivoFalha, Resultado, TipoAviso } from './tipos.mts'

export type Enviar = (texto: string) => Promise<boolean | null>   // null = Telegram não configurado

// O Telegram recusa mensagem acima de 4.096 caracteres.
const LIMITE = 4000
const FIM_DO_RESUMO = '\n(e mais; o detalhe está no registro da execução)'
// O resto da mensagem de falha tem menos de 300 caracteres: com o detalhe cortado aqui, ela cabe no Telegram.
const DETALHE_MAXIMO = 3000

const ORDEM_DOS_TIPOS: TipoAviso[] = [
  'codigo_sem_traducao', 'documento_apagado', 'fechamento_com_resto', 'estoque_diverge',
  'movimento_sumiu', 'total_diferente', 'execucao_faltou', 'execucao_pulada',
]

export function criarEnvioTelegram(token: string | undefined, chat: string | undefined, fetchFn: typeof fetch = fetch): Enviar {
  if (!token || !chat) {
    return async (texto) => {
      console.log(texto)
      return null
    }
  }
  return async (texto) => {
    try {
      const resposta = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: texto }),
        signal: AbortSignal.timeout(30_000),
      })
      const corpo = (await resposta.json()) as { ok?: unknown }
      return corpo.ok === true
    } catch {
      // Nada é impresso aqui: a mensagem de erro do fetch pode trazer o endereço, que leva o token.
      return false
    }
  }
}

export function textoFalha(horaExecucao: number, motivo: MotivoFalha, horaUltimaBoa: number | null, proximo: string): string {
  const h = horaExecucao
  const continuam = horaUltimaBoa !== null ? `Os dados do Kaizen continuam os das ${horaUltimaBoa}h. ` : ''
  // Um detalhe enorme (o corpo de um erro do ERP) faria o Telegram recusar a mensagem a cada hora.
  const detalhe = motivo.detalhe.length > DETALHE_MAXIMO ? `${motivo.detalhe.slice(0, DETALHE_MAXIMO)} (…)` : motivo.detalhe
  switch (motivo.tipo) {
    case 'erp_fora':
      return `Kaizen: a leitura das ${h}h falhou — o ERP não respondeu. ${continuam}Nada a fazer: ele tenta de novo ${proximo}.`
    case 'token':
      return 'Kaizen: o ERP recusou o token de acesso. É preciso trocar o segredo na VPS; abra uma sessão com o Claude.'
    case 'estrutura':
      return `Kaizen: o ERP mudou por dentro, e o Kaizen parou para não gravar errado. Abra uma sessão com o Claude e cole esta mensagem: ${detalhe}`
    case 'banco_fora':
      return `Kaizen: a leitura das ${h}h falhou — o banco do Kaizen não respondeu.`
    case 'outra':
      return `Kaizen: a leitura das ${h}h falhou — ${detalhe}. ${continuam}Abra uma sessão com o Claude e cole esta mensagem.`
  }
}

export function textoVolta(horaExecucao: number): string {
  return `Kaizen: voltou a funcionar às ${horaExecucao}h.`
}

export function textoTeste(): string {
  return 'Kaizen: mensagem de teste. O aviso de falha chega por aqui.'
}

export function deveAvisarFalha(anterior: Anterior | null): boolean {
  return anterior === null || anterior.resultado !== 'falha' || anterior.telegramOk !== true
}

export function deveAvisarVolta(resultadoAtual: Resultado, anterior: Anterior | null, faltaram: boolean): boolean {
  const atualBoa = resultadoAtual === 'ok' || resultadoAtual === 'aviso'
  return atualBoa && (anterior?.resultado === 'falha' || faltaram)
}

export function textoResumo(avisos: Aviso[], chavesAnteriores: string[], hoje: string): { texto: string | null; chaves: string[] } {
  if (avisos.length === 0) return { texto: null, chaves: [] }
  // Uma linha por chave, na ordem em que apareceu, com o texto mais recente e o número de vezes.
  const porChave = new Map<string, { aviso: Aviso; vezes: number }>()
  for (const aviso of avisos) {
    const visto = porChave.get(aviso.chave)
    if (visto) {
      visto.aviso = aviso
      visto.vezes += 1
    } else {
      porChave.set(aviso.chave, { aviso, vezes: 1 })
    }
  }
  const anteriores = new Set(chavesAnteriores)
  const unicos = [...porChave.values()]
  const novos = unicos.filter((u) => !anteriores.has(u.aviso.chave))
  const repetidos = unicos.length - novos.length

  let texto = `Kaizen — resumo de ${diaMes(hoje)}:`
  for (const tipo of ORDEM_DOS_TIPOS) {
    const doTipo = novos.filter((u) => u.aviso.tipo === tipo)
    if (doTipo.length === 0) continue
    texto += `\n${TITULOS[tipo]} (${doTipo.length}) — ${O_QUE_FAZER[tipo]}:`
    for (const { aviso, vezes } of doTipo.slice(0, 5)) {
      texto += `\n- ${aviso.texto}${vezes > 1 ? ` (${vezes} vezes)` : ''}`
    }
    if (doTipo.length > 5) texto += `\n- e mais ${doTipo.length - 5}`
  }
  if (repetidos > 0) texto += `\nContinuam ${repetidos} avisos já informados.`
  if (texto.length > LIMITE) {
    // corta numa quebra de linha, para nenhum aviso sair pela metade
    const quebra = texto.lastIndexOf('\n', LIMITE - FIM_DO_RESUMO.length)
    texto = texto.slice(0, quebra) + FIM_DO_RESUMO
  }
  return { texto, chaves: [...porChave.keys()] }
}
