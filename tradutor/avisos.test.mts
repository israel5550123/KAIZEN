import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatarReais, diaMes, avisoCodigoSemTraducao, avisoDocumentoApagado, avisoFechamentoComResto,
  avisoEstoqueDiverge, avisoMovimentoSumiu, avisoTotalDiferente, avisoExecucaoFaltou, avisoExecucaoPulada,
  TITULOS, O_QUE_FAZER,
} from './avisos.mts'

test('formatarReais escreve reais com vírgula e ponto de milhar, a partir do texto do Postgres', () => {
  assert.equal(formatarReais('150.000000'), 'R$ 150,00')
  assert.equal(formatarReais('150.00'), 'R$ 150,00')
  assert.equal(formatarReais('1234.5'), 'R$ 1.234,50')
  assert.equal(formatarReais('1000000'), 'R$ 1.000.000,00')
  assert.equal(formatarReais('245864.76'), 'R$ 245.864,76')
  assert.equal(formatarReais('0'), 'R$ 0,00')
  assert.equal(formatarReais('0.5'), 'R$ 0,50')
})

test('formatarReais arredonda meio-par em 2 casas', () => {
  assert.equal(formatarReais('0.005'), 'R$ 0,00')
  assert.equal(formatarReais('0.015'), 'R$ 0,02')
  assert.equal(formatarReais('2.345'), 'R$ 2,34')
  assert.equal(formatarReais('2.355'), 'R$ 2,36')
  assert.equal(formatarReais('0.0051'), 'R$ 0,01')
  assert.equal(formatarReais('0.004999'), 'R$ 0,00')
  assert.equal(formatarReais('9.995000'), 'R$ 10,00')
})

test('formatarReais põe o sinal de menos antes do R$, e zero não leva sinal', () => {
  assert.equal(formatarReais('-18'), '−R$ 18,00')
  assert.equal(formatarReais('-5.00'), '−R$ 5,00')
  assert.equal(formatarReais('-1234.565'), '−R$ 1.234,56')
  assert.equal(formatarReais('-0.004'), 'R$ 0,00')
})

test('formatarReais não perde algarismo acima de 2^53', () => {
  assert.equal(formatarReais('12345678901234.125'), 'R$ 12.345.678.901.234,12')
  assert.equal(formatarReais('9007199254740993.000001'), 'R$ 9.007.199.254.740.993,00')
})

test('formatarReais recusa o que não é número', () => {
  for (const valor of ['', 'abc', '1,50', '1.2.3', 'NaN', ' 10']) {
    assert.throws(() => formatarReais(valor), { message: `valor que não é número: ${valor}` }, valor)
  }
})

test('diaMes lê o dia e o mês de uma data ou de um timestamp', () => {
  assert.equal(diaMes('2026-09-29'), '29/09')
  assert.equal(diaMes('2026-09-28 15:30:00'), '28/09')
  assert.equal(diaMes('2026-09-28T15:30:00.000000'), '28/09')
  assert.equal(diaMes('2026-10-01 00:00:00-03'), '01/10')
  assert.throws(() => diaMes('29/09/2026'), { message: 'data que não começa por AAAA-MM-DD: 29/09/2026' })
})

test('avisoCodigoSemTraducao: a chave não leva a contagem, para o mesmo código não repetir no resumo', () => {
  assert.deepEqual(avisoCodigoSemTraducao('tipo', 'AM', 3), {
    tipo: 'codigo_sem_traducao',
    chave: 'codigo:tipo:AM',
    texto: 'o código "AM" de tipo apareceu 3 vez(es) e não tem tradução no Kaizen',
  })
})

test('avisoDocumentoApagado diz tipo, número, dia, valor e vendedor', () => {
  assert.deepEqual(avisoDocumentoApagado({
    origem_id: '300', codigo: '123', tipo: 'pedido', criado_em: '2026-09-29 10:15:00', valor: '150.00', vendedores: 'Igor',
  }), {
    tipo: 'documento_apagado',
    chave: 'apagado:300',
    texto: 'o pedido 123 de 29/09 (R$ 150,00, vendedor Igor) sumiu do ERP',
  })
  assert.deepEqual(avisoDocumentoApagado({
    origem_id: '301', codigo: '7', tipo: null, criado_em: '2026-09-28 08:00:00', valor: '0.00', vendedores: null,
  }), {
    tipo: 'documento_apagado',
    chave: 'apagado:301',
    texto: 'o documento 7 de 28/09 (R$ 0,00) sumiu do ERP',
  })
})

test('avisoFechamentoComResto avisa que a quebra do turno não é confiável', () => {
  assert.deepEqual(avisoFechamentoComResto('98', '2026-09-29T18:00:00.000000', '250'), {
    tipo: 'fechamento_com_resto',
    chave: 'fechamento:250',
    texto: 'o fechamento 98 de 29/09 pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável',
  })
})

test('avisoEstoqueDiverge: a chave leva o último movimento e a foto, ou "virada" sem movimento', () => {
  assert.deepEqual(avisoEstoqueDiverge('2138', '-10.000000', '-9.000000', '1900'), {
    tipo: 'estoque_diverge',
    chave: 'estoque:2138:1900:-9.000000',
    texto: 'o saldo do produto 2138 no ERP (-9.000000) não bate com os movimentos (-10.000000)',
  })
  assert.deepEqual(avisoEstoqueDiverge('60', '3.000000', '0.000000', null), {
    tipo: 'estoque_diverge',
    chave: 'estoque:60:virada:0.000000',
    texto: 'o saldo do produto 60 no ERP (0.000000) não bate com os movimentos (3.000000)',
  })
})

test('avisoMovimentoSumiu', () => {
  assert.deepEqual(avisoMovimentoSumiu('1900', '2138'), {
    tipo: 'movimento_sumiu',
    chave: 'movimento:1900',
    texto: 'um movimento de estoque do produto 2138 sumiu do ERP',
  })
})

test('avisoTotalDiferente mostra os dois números', () => {
  assert.deepEqual(avisoTotalDiferente('2026-09-29', 'itens:valor', '1234.50', '1200.00'), {
    tipo: 'total_diferente',
    chave: 'total:2026-09-29:itens:valor:1234.50:1200.00',
    texto: 'em 29/09, itens:valor: ERP 1234.50, Kaizen 1200.00',
  })
})

test('avisoExecucaoFaltou diz a hora e o dia', () => {
  assert.deepEqual(avisoExecucaoFaltou({ data: '2026-09-29', hora: 22 }), {
    tipo: 'execucao_faltou',
    chave: 'faltou:2026-09-29:22',
    texto: 'a leitura das 22h de 29/09 não aconteceu',
  })
})

test('avisoExecucaoPulada leva na chave a execução que segurava a trava', () => {
  assert.deepEqual(avisoExecucaoPulada(41), {
    tipo: 'execucao_pulada',
    chave: 'pulada:41',
    texto: 'uma leitura foi pulada porque a anterior ainda estava rodando',
  })
})

test('TITULOS e O_QUE_FAZER têm um texto para cada tipo de aviso, na ordem do resumo', () => {
  assert.deepEqual(Object.entries(TITULOS), [
    ['codigo_sem_traducao', 'Códigos novos no ERP'],
    ['documento_apagado', 'Documentos apagados no ERP'],
    ['fechamento_com_resto', 'Fechamentos com linha de teste'],
    ['estoque_diverge', 'Estoque que não bate'],
    ['movimento_sumiu', 'Movimentos de estoque sumidos'],
    ['total_diferente', 'Totais diferentes do ERP'],
    ['execucao_faltou', 'Leituras que não aconteceram'],
    ['execucao_pulada', 'Leituras puladas'],
  ])
  const leve = 'leve este resumo à próxima sessão com o Claude'
  assert.deepEqual(Object.entries(O_QUE_FAZER), [
    ['codigo_sem_traducao', leve],
    ['documento_apagado', 'pergunte à gerente ou ao suporte'],
    ['fechamento_com_resto', 'a quebra desse turno não é confiável'],
    ['estoque_diverge', leve],
    ['movimento_sumiu', leve],
    ['total_diferente', leve],
    ['execucao_faltou', leve],
    ['execucao_pulada', leve],
  ])
})
