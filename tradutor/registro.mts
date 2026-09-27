import type { Cliente } from './banco.mts'
import type { Aviso, Resultado, TipoExecucao } from './tipos.mts'

// Cada função faz um comando só, fora da transação da carga: a linha de execucao fica gravada mesmo quando a carga falha.

export async function registrarInicio(cliente: Cliente, tipo: TipoExecucao, manual: boolean): Promise<number> {
  const r = await cliente.query<{ id: string }>(
    'insert into kaizen.execucao (tipo, manual) values ($1, $2) returning id',
    [tipo, manual],
  )
  return Number(r.rows[0].id)
}

export async function registrarFim(
  cliente: Cliente,
  id: number,
  r: { resultado: Resultado; mensagem?: string | null; contagens?: Record<string, number>; avisos: Aviso[] },
): Promise<void> {
  // jsonb vai como texto JSON: um array passado cru ao pg viraria array do Postgres, não jsonb
  await cliente.query(
    `update kaizen.execucao
        set fim = now(), resultado = $2, mensagem = $3, contagens = $4::jsonb, avisos = $5::jsonb
      where id = $1`,
    [id, r.resultado, r.mensagem ?? null, r.contagens === undefined ? null : JSON.stringify(r.contagens), JSON.stringify(r.avisos)],
  )
}

export async function registrarPulada(cliente: Cliente, tipo: TipoExecucao, manual: boolean, aviso: Aviso): Promise<void> {
  await cliente.query(
    `insert into kaizen.execucao (tipo, manual, fim, resultado, avisos)
     values ($1, $2, now(), 'pulada', $3::jsonb)`,
    [tipo, manual, JSON.stringify([aviso])],
  )
}

export async function marcarInterrompidas(cliente: Cliente, idAtual: number): Promise<number> {
  const r = await cliente.query(
    `update kaizen.execucao
        set resultado = 'falha', mensagem = 'interrompida antes de terminar', fim = now()
      where fim is null and id <> $1`,
    [idAtual],
  )
  return r.rowCount ?? 0
}

export async function execucaoPresa(cliente: Cliente, prazoMin: number): Promise<{ id: number } | null> {
  const r = await cliente.query<{ id: string }>(
    `select id from kaizen.execucao
      where fim is null and inicio < now() - make_interval(mins => $1::int)
      order by id desc limit 1`,
    [prazoMin],
  )
  return r.rows.length === 0 ? null : { id: Number(r.rows[0].id) }
}

export type Anterior = { id: number; resultado: 'ok' | 'aviso' | 'falha'; telegramOk: boolean | null }

export async function anteriorValida(cliente: Cliente, idAtual: number | null): Promise<Anterior | null> {
  const r = await cliente.query<{ id: string; resultado: 'ok' | 'aviso' | 'falha'; telegram_ok: boolean | null }>(
    `select id, resultado, telegram_ok from kaizen.execucao
      where resultado in ('ok', 'aviso', 'falha') and ($1::bigint is null or id <> $1::bigint)
      order by id desc limit 1`,
    [idAtual],
  )
  if (r.rows.length === 0) return null
  const l = r.rows[0]
  return { id: Number(l.id), resultado: l.resultado, telegramOk: l.telegram_ok }
}

export async function ultimoInicioNaoManualMs(cliente: Cliente, idAtual: number | null): Promise<number | null> {
  const r = await cliente.query<{ ms: string }>(
    `select (extract(epoch from inicio) * 1000)::bigint::text as ms from kaizen.execucao
      where not manual and ($1::bigint is null or id <> $1::bigint)
      order by id desc limit 1`,
    [idAtual],
  )
  return r.rows.length === 0 ? null : Number(r.rows[0].ms)
}

// "at time zone" explícito: a data e a hora saem em Fortaleza mesmo se a sessão estiver em outro fuso.
export async function ultimaNoiteBoa(cliente: Cliente): Promise<string | null> {
  const r = await cliente.query<{ data: string }>(
    `select to_char(inicio at time zone 'America/Fortaleza', 'YYYY-MM-DD') as data from kaizen.execucao
      where tipo = 'noite' and resultado in ('ok', 'aviso')
      order by id desc limit 1`,
  )
  return r.rows.length === 0 ? null : r.rows[0].data
}

export async function horaDaUltimaBoa(cliente: Cliente, idAtual: number | null): Promise<number | null> {
  const r = await cliente.query<{ hora: number }>(
    `select extract(hour from inicio at time zone 'America/Fortaleza')::int as hora from kaizen.execucao
      where resultado in ('ok', 'aviso') and ($1::bigint is null or id <> $1::bigint)
      order by id desc limit 1`,
    [idAtual],
  )
  return r.rows.length === 0 ? null : r.rows[0].hora
}

export async function marcarTelegram(cliente: Cliente, id: number, ok: boolean | null): Promise<void> {
  await cliente.query('update kaizen.execucao set telegram_ok = $2 where id = $1', [id, ok])
}

export async function avisosParaResumo(cliente: Cliente): Promise<{ avisos: Aviso[]; chavesAnteriores: string[] }> {
  const ultimo = await cliente.query<{ id: string; resumo_chaves: string[] | null }>(
    'select id, resumo_chaves from kaizen.execucao where resumo_ok order by id desc limit 1',
  )
  const desde = ultimo.rows.length === 0 ? '0' : ultimo.rows[0].id
  const r = await cliente.query<{ avisos: Aviso[] }>(
    'select avisos from kaizen.execucao where id > $1::bigint order by id',
    [desde],
  )
  return {
    avisos: r.rows.flatMap((l) => l.avisos),
    chavesAnteriores: ultimo.rows[0]?.resumo_chaves ?? [],
  }
}

export async function marcarResumo(cliente: Cliente, id: number, chaves: string[]): Promise<void> {
  await cliente.query(
    'update kaizen.execucao set resumo_ok = true, resumo_chaves = $2::jsonb where id = $1',
    [id, JSON.stringify(chaves)],
  )
}
