import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emFortaleza, somarDias, inicioDaJanela, horarioEsperado, horariosFaltando, proximoHorario, rotuloHora,
} from './janela.mts'

// Instantes fixos em UTC; o comentário diz a hora de Fortaleza (UTC−3). 27/09/2026 é domingo.
const TERCA_14H = Date.parse('2026-09-29T17:00:00Z')

test('emFortaleza tira 3 horas e lê dia, hora, minuto e dia da semana de Fortaleza', () => {
  assert.deepEqual(emFortaleza(TERCA_14H), { data: '2026-09-29', hora: 14, minuto: 0, diaSemana: 2 })
  assert.deepEqual(emFortaleza(Date.parse('2026-09-28T11:05:59Z')), { data: '2026-09-28', hora: 8, minuto: 5, diaSemana: 1 })
  assert.deepEqual(emFortaleza(Date.parse('2026-09-28T03:00:00Z')), { data: '2026-09-28', hora: 0, minuto: 0, diaSemana: 1 })
  assert.deepEqual(emFortaleza(Date.parse('2026-10-04T11:00:00Z')), { data: '2026-10-04', hora: 8, minuto: 0, diaSemana: 0 })
})

test('emFortaleza: 01h30 em UTC ainda é 22h30 do dia anterior em Fortaleza', () => {
  assert.deepEqual(emFortaleza(Date.parse('2026-09-30T01:30:00Z')), { data: '2026-09-29', hora: 22, minuto: 30, diaSemana: 2 })
  assert.deepEqual(emFortaleza(Date.parse('2026-09-28T02:59:00Z')), { data: '2026-09-27', hora: 23, minuto: 59, diaSemana: 0 })
})

test('somarDias atravessa o mês, o ano e fevereiro', () => {
  assert.equal(somarDias('2026-09-30', 1), '2026-10-01')
  assert.equal(somarDias('2026-10-01', -1), '2026-09-30')
  assert.equal(somarDias('2026-10-05', -2), '2026-10-03')
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01')
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28')
  assert.equal(somarDias('2026-09-28', 0), '2026-09-28')
})

test('inicioDaJanela: com a noite de ontem boa, começa ontem', () => {
  assert.equal(inicioDaJanela(TERCA_14H, '2026-09-28'), '2026-09-28')
})

test('inicioDaJanela: na segunda-feira, com a última noite boa no sábado, começa no sábado', () => {
  const segunda9h = Date.parse('2026-10-05T12:00:00Z')
  assert.equal(inicioDaJanela(segunda9h, '2026-10-03'), '2026-10-03')
})

test('inicioDaJanela: depois de uma noite que falhou, começa na última noite boa', () => {
  const quinta10h = Date.parse('2026-10-01T13:00:00Z')
  assert.equal(inicioDaJanela(quinta10h, '2026-09-29'), '2026-09-29')
})

test('inicioDaJanela: sem nenhuma noite registrada, começa em 27/09', () => {
  assert.equal(inicioDaJanela(TERCA_14H, null), '2026-09-27')
  const primeiraSegunda8h = Date.parse('2026-09-28T11:00:00Z')
  assert.equal(inicioDaJanela(primeiraSegunda8h, null), '2026-09-27')
})

test('inicioDaJanela às 22h30 (01h30 em UTC) usa o dia de Fortaleza', () => {
  const terca22h30 = Date.parse('2026-09-30T01:30:00Z')
  assert.equal(inicioDaJanela(terca22h30, '2026-09-28'), '2026-09-28')
  assert.equal(inicioDaJanela(terca22h30, '2026-09-29'), '2026-09-28')
})

test('horarioEsperado: segunda a sábado, das 8h às 19h e às 22h', () => {
  const em = (diaSemana: number, hora: number) => horarioEsperado({ data: '2026-09-29', hora, minuto: 0, diaSemana })
  assert.equal(em(1, 8), true)
  assert.equal(em(2, 14), true)
  assert.equal(em(6, 19), true)
  assert.equal(em(6, 22), true)
  assert.equal(em(2, 7), false)
  assert.equal(em(2, 20), false)
  assert.equal(em(2, 21), false)
  assert.equal(em(2, 23), false)
  assert.equal(em(0, 10), false)
  assert.equal(em(0, 22), false)
})

test('horariosFaltando sem execução anterior não lista nada', () => {
  assert.deepEqual(horariosFaltando(null, TERCA_14H), [])
})

test('horariosFaltando na mesma terça, do último às 10h até agora às 14h, lista 11h, 12h e 13h', () => {
  const terca10h = Date.parse('2026-09-29T13:00:05Z')
  assert.deepEqual(horariosFaltando(terca10h, Date.parse('2026-09-29T17:00:02Z')), [
    { data: '2026-09-29', hora: 11 },
    { data: '2026-09-29', hora: 12 },
    { data: '2026-09-29', hora: 13 },
  ])
})

test('horariosFaltando na hora seguinte, mesmo com minutos de atraso, não lista nada', () => {
  assert.deepEqual(horariosFaltando(Date.parse('2026-09-29T16:00:04Z'), TERCA_14H), [])
  assert.deepEqual(horariosFaltando(Date.parse('2026-09-29T16:09:00Z'), Date.parse('2026-09-29T17:08:00Z')), [])
  // uma execução manual às 13h37 não esconde a das 14h: a lista só vai até antes da hora cheia de agora
  assert.deepEqual(horariosFaltando(Date.parse('2026-09-29T16:37:00Z'), Date.parse('2026-09-29T17:00:01Z')), [])
})

test('horariosFaltando atravessando a noite (último às 19h, agora às 9h do dia seguinte) lista 22h e 8h', () => {
  const terca19h = Date.parse('2026-09-29T22:00:03Z')
  const quarta9h = Date.parse('2026-09-30T12:00:01Z')
  assert.deepEqual(horariosFaltando(terca19h, quarta9h), [
    { data: '2026-09-29', hora: 22 },
    { data: '2026-09-30', hora: 8 },
  ])
})

test('horariosFaltando numa parada do sábado 12h à segunda 9h lista o sábado e a segunda 8h, e nada no domingo', () => {
  const sabado12h = Date.parse('2026-10-03T15:00:02Z')
  const segunda9h = Date.parse('2026-10-05T12:00:02Z')
  assert.deepEqual(horariosFaltando(sabado12h, segunda9h), [
    { data: '2026-10-03', hora: 13 },
    { data: '2026-10-03', hora: 14 },
    { data: '2026-10-03', hora: 15 },
    { data: '2026-10-03', hora: 16 },
    { data: '2026-10-03', hora: 17 },
    { data: '2026-10-03', hora: 18 },
    { data: '2026-10-03', hora: 19 },
    { data: '2026-10-03', hora: 22 },
    { data: '2026-10-05', hora: 8 },
  ])
  // a noite de sábado rodou: segunda às 8h nada falta
  assert.deepEqual(horariosFaltando(Date.parse('2026-10-04T01:00:02Z'), Date.parse('2026-10-05T11:00:02Z')), [])
})

test('proximoHorario: a próxima hora esperada depois da hora cheia de agora', () => {
  assert.deepEqual(proximoHorario(TERCA_14H), { data: '2026-09-29', hora: 15 })
  assert.deepEqual(proximoHorario(Date.parse('2026-09-29T17:37:00Z')), { data: '2026-09-29', hora: 15 })
  assert.deepEqual(proximoHorario(Date.parse('2026-09-29T22:00:00Z')), { data: '2026-09-29', hora: 22 })
  assert.deepEqual(proximoHorario(Date.parse('2026-09-30T01:00:00Z')), { data: '2026-09-30', hora: 8 })
  assert.deepEqual(proximoHorario(Date.parse('2026-10-03T22:00:00Z')), { data: '2026-10-03', hora: 22 })
  assert.deepEqual(proximoHorario(Date.parse('2026-10-04T01:00:00Z')), { data: '2026-10-05', hora: 8 })
  assert.deepEqual(proximoHorario(Date.parse('2026-10-04T13:00:00Z')), { data: '2026-10-05', hora: 8 })
})

test('rotuloHora: só a hora no mesmo dia, e dia e hora em outro dia', () => {
  assert.equal(rotuloHora({ data: '2026-09-29', hora: 15 }, '2026-09-29'), '15h')
  assert.equal(rotuloHora({ data: '2026-09-28', hora: 8 }, '2026-09-27'), '28/09 às 8h')
  assert.equal(rotuloHora({ data: '2026-10-05', hora: 8 }, '2026-10-03'), '05/10 às 8h')
})
