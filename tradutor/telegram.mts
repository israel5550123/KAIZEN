import { diaMes, O_QUE_FAZER, TITULOS } from './avisos.mts'
import type { Anterior } from './registro.mts'
import type { Aviso, MotivoFalha, Resultado, TipoAviso } from './tipos.mts'

export type Enviar = (texto: string) => Promise<boolean | null>   // null = Telegram não configurado

// O Telegram recusa mensagem acima de 4.096 caracteres.
const LIMITE = 4000
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
  // A anterior deu certo, mas o Telegram recusou o "voltou a funcionar" dela. Na noite sem volta, telegram_ok = não
  // é o resumo recusado: aí resumo_ok fica não, e quem repete é o resumo seguinte, não a volta.
  const voltaDevendo = anterior !== null && anterior.resultado !== 'falha' && anterior.telegramOk === false
    && (anterior.tipo === 'hora' || anterior.resumoOk)
  return atualBoa && (anterior?.resultado === 'falha' || faltaram || voltaDevendo)
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

  // Cada linha leva as chaves dos avisos que ela mostra; o título de um tipo não leva nenhuma.
  const linhas: Array<{ texto: string; chaves: string[] }> = []
  for (const tipo of ORDEM_DOS_TIPOS) {
    const doTipo = novos.filter((u) => u.aviso.tipo === tipo)
    if (doTipo.length === 0) continue
    linhas.push({ texto: `${TITULOS[tipo]} (${doTipo.length}) — ${O_QUE_FAZER[tipo]}:`, chaves: [] })
    for (const { aviso, vezes } of doTipo.slice(0, 5)) {
      linhas.push({ texto: `- ${aviso.texto}${vezes > 1 ? ` (${vezes} vezes)` : ''}`, chaves: [aviso.chave] })
    }
    if (doTipo.length > 5) linhas.push({ texto: `- e mais ${doTipo.length - 5}`, chaves: doTipo.slice(5).map((u) => u.aviso.chave) })
  }
  const fim = repetidos > 0 ? `\nContinuam ${repetidos} avisos já informados.` : ''
  const cabecalho = `Kaizen — resumo de ${diaMes(hoje)}:`
  const inteiro = cabecalho + linhas.map((l) => `\n${l.texto}`).join('') + fim
  if (inteiro.length <= LIMITE) return { texto: inteiro, chaves: [...porChave.keys()] }

  // Não cabe: entra linha por linha, sem nenhum aviso pela metade, com lugar para o "e mais N avisos" e para os já informados.
  const corte = (n: number) => `\ne mais ${n} avisos (o detalhe está no registro da execução)`
  const lugar = LIMITE - corte(novos.length).length - fim.length
  // Os já informados continuam informados; dos novos, só entram as chaves das linhas que couberam.
  const saiu = new Set(unicos.filter((u) => anteriores.has(u.aviso.chave)).map((u) => u.aviso.chave))
  let texto = cabecalho
  for (const linha of linhas) {
    if (texto.length + 1 + linha.texto.length > lugar) break
    texto += `\n${linha.texto}`
    for (const chave of linha.chaves) saiu.add(chave)
  }
  const deFora = novos.filter((u) => !saiu.has(u.aviso.chave)).length
  texto += corte(deFora) + fim
  return { texto, chaves: [...porChave.keys()].filter((chave) => saiu.has(chave)) }
}
