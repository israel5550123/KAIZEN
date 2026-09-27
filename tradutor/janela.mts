import { HORA_DA_NOITE, HORAS_DA_HORA, PRIMEIRO_INICIO } from './constantes.mts'

export type Instante = { data: string; hora: number; minuto: number; diaSemana: number } // data 'AAAA-MM-DD' em Fortaleza; diaSemana 0 = domingo
export type Horario = { data: string; hora: number }              // um horário esperado

const HORA_MS = 60 * 60 * 1000
// Fortaleza é UTC−3 o ano inteiro, sem horário de verão: tirar 3 h e ler em UTC dá a hora da loja, qualquer que seja o fuso da máquina.
const DESLOCAMENTO_MS = 3 * HORA_MS

export function emFortaleza(ms: number): Instante {
  const d = new Date(ms - DESLOCAMENTO_MS)
  return { data: d.toISOString().slice(0, 10), hora: d.getUTCHours(), minuto: d.getUTCMinutes(), diaSemana: d.getUTCDay() }
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

export function inicioDaJanela(agoraMs: number, ultimaNoiteBoa: string | null): string {
  const ontem = somarDias(emFortaleza(agoraMs).data, -1)
  const base = ultimaNoiteBoa ?? PRIMEIRO_INICIO
  // datas 'AAAA-MM-DD' comparadas como texto ficam na ordem do calendário
  return base < ontem ? base : ontem
}

export function horarioEsperado(i: Instante): boolean {
  const segundaASabado = i.diaSemana >= 1 && i.diaSemana <= 6
  return segundaASabado && (HORAS_DA_HORA.includes(i.hora) || i.hora === HORA_DA_NOITE)
}

// O deslocamento de Fortaleza é de horas inteiras: a hora cheia em UTC é também a hora cheia em Fortaleza.
function horaCheia(ms: number): number {
  return Math.floor(ms / HORA_MS) * HORA_MS
}

export function horariosFaltando(ultimoInicioMs: number | null, agoraMs: number): Horario[] {
  if (ultimoInicioMs === null) return []
  const faltando: Horario[] = []
  const ate = horaCheia(agoraMs)
  for (let t = horaCheia(ultimoInicioMs) + HORA_MS; t < ate; t += HORA_MS) {
    const i = emFortaleza(t)
    if (horarioEsperado(i)) faltando.push({ data: i.data, hora: i.hora })
  }
  return faltando
}

export function proximoHorario(agoraMs: number): Horario {
  let t = horaCheia(agoraMs) + HORA_MS
  while (!horarioEsperado(emFortaleza(t))) t += HORA_MS
  const i = emFortaleza(t)
  return { data: i.data, hora: i.hora }
}

export function rotuloHora(h: Horario, hojeData: string): string {
  if (h.data === hojeData) return `${h.hora}h`
  return `${h.data.slice(8, 10)}/${h.data.slice(5, 7)} às ${h.hora}h`
}
