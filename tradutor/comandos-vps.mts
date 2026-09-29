// Os comandos que publicacao/implantar.sh roda no contêiner da VPS além das leituras (spec da Fase 4, seção 5).
import type { Cliente } from './banco.mts'
import { TRAVA } from './constantes.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'

// Com a mesma trava das leituras: nunca aplica migração no meio de uma leitura.
export async function migrarAgora(cliente: Cliente, pasta: string = PASTA_MIGRACOES): Promise<{ codigo: number; texto: string }> {
  const trava = await cliente.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [TRAVA])
  if (!trava.rows[0].ok) return { codigo: 1, texto: 'migrar: uma leitura está rodando; rode de novo em alguns minutos' }
  try {
    const aplicadas = await aplicarMigracoes(cliente, pasta)
    if (aplicadas.length === 0) return { codigo: 0, texto: 'migrar: nenhuma migração pendente' }
    return { codigo: 0, texto: `migrar: aplicadas ${aplicadas.map((nome) => nome.replace(/\.sql$/, '')).join(', ')}` }
  } finally {
    await cliente.query('select pg_advisory_unlock($1)', [TRAVA]).catch(() => undefined)
  }
}

const TAMANHO_MENSAGEM = 120
const RESULTADOS = ['ok', 'aviso', 'falha', 'pulada']

type Execucao = {
  id: string; tipo: string; manual: boolean; inicio: string; resultado: string | null
  avisos: number; telegram_ok: boolean | null; mensagem: string | null
}

function textoTelegram(ok: boolean | null): string {
  if (ok === null) return '—'
  return ok ? 'sim' : 'não'
}

// Só lê. As execuções com início a partir da 0h do dia em Fortaleza, uma por linha, e no fim a contagem por resultado.
export async function listarExecucoes(cliente: Cliente, desde: string): Promise<string[]> {
  const r = await cliente.query<Execucao>(
    `select id, tipo, manual, to_char(inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as inicio,
            resultado, jsonb_array_length(avisos) as avisos, telegram_ok, mensagem
       from kaizen.execucao
      where inicio >= $1::date::timestamp at time zone 'America/Fortaleza'
      order by id`,
    [desde],
  )
  const linhas = ['id | tipo | manual | início (Fortaleza) | resultado | avisos | telegram | mensagem']
  for (const e of r.rows) {
    let mensagem = e.mensagem ?? '—'
    if (mensagem.length > TAMANHO_MENSAGEM) mensagem = `${mensagem.slice(0, TAMANHO_MENSAGEM)}…`
    const colunas = [e.id, e.tipo, e.manual ? 'manual' : 'agendada', e.inicio, e.resultado ?? '—', e.avisos, textoTelegram(e.telegram_ok), mensagem]
    linhas.push(colunas.join(' | '))
  }
  const contagem = RESULTADOS.map((resultado) => `${resultado} ${r.rows.filter((e) => e.resultado === resultado).length}`)
  contagem.push(`sem resultado ${r.rows.filter((e) => e.resultado === null).length}`)
  const dia = `${desde.slice(8, 10)}/${desde.slice(5, 7)}/${desde.slice(0, 4)}`
  linhas.push(`contagem desde ${dia}: ${contagem.join(', ')} (total ${r.rows.length})`)
  return linhas
}
