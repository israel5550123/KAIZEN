import type { TipoExecucao } from './tipos.mts'

export const TRAVA = 20260928          // chave do pg_try_advisory_lock
export const FOLGA_OID = 200
export const LIMIAR_VIVOS = 20
export const PRAZO_MIN: Record<TipoExecucao, number> = { hora: 10, noite: 30 }
export const TAMANHO_FATIA = 5000      // faixa de oid por fatia da noite
export const PRIMEIRO_INICIO = '2026-09-27'
export const HORAS_DA_HORA = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
export const HORA_DA_NOITE = 22
