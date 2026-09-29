import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { garantirLocal } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conferenciaDoDono } from './conferencia-dono.mts'
import { principal } from './principal.mts'

let banco: BancoTeste
let proximoOid = 185

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco?.fechar()
})

beforeEach(async () => {
  await banco.cliente.query(
    'truncate kaizen.documento, kaizen.documento_item, kaizen.parcela, kaizen.conferencia_caixa, kaizen.estoque_atual, kaizen.produto, kaizen.execucao restart identity cascade',
  )
})

type Turno = [number, number, number] | null

async function documento(codigo: string, modelo: string, status: string, movimento: string, financeiro: string, criadoEm: string, turno: Turno = null): Promise<string> {
  proximoOid += 1
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em, turno_caixa, turno_usuario, turno_numero)
     values ('meuerp', 'documento', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [String(proximoOid), codigo, modelo, status, movimento, financeiro, criadoEm, turno?.[0] ?? null, turno?.[1] ?? null, turno?.[2] ?? null],
  )
  return r.rows[0].id
}

async function item(documentoId: string, origemId: string, valor: string, vendedor: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
     values ($1, 'documento_mercadoria', $2, 'S', '60', 1, $3, $4)`,
    [documentoId, origemId, valor, vendedor],
  )
}

async function parcela(documentoId: string, origemId: string, valor: string, status: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, valor, status) values ($1, 'documento_parcela', $2, $3, $4)`,
    [documentoId, origemId, valor, status],
  )
}

async function conferencia(documentoId: string, origemId: string, forma: string, calculado: string, informado: string | null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, $4, $5)`,
    [documentoId, origemId, forma, calculado, informado],
  )
}

type ExtraExecucao = { manual?: boolean; mensagem?: string; avisos?: unknown[]; telegramOk?: boolean }

async function execucao(dia: string, hora: number, resultado: string, extra: ExtraExecucao = {}): Promise<void> {
  const inicio = `${dia} ${String(hora).padStart(2, '0')}:00:05-03`
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, mensagem, avisos, telegram_ok)
     values ($1, $2, $3::timestamptz, $3::timestamptz + interval '1 minute', $4, $5, $6::jsonb, $7)`,
    [
      hora === 22 ? 'noite' : 'hora', extra.manual ?? false, inicio, resultado, extra.mensagem ?? null,
      JSON.stringify(extra.avisos ?? []), extra.telegramOk ?? null,
    ],
  )
}

const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 22]

test('mostra ao dono, em palavras, as vendas pela regra do 154, o a pagar, as quebras, os saldos e as execuções', async () => {
  // Vendas: conta só documento emitido, de saída, que recebe, com item de vendedor, a partir de 28/09, pelo dia da criação.
  const pedido58 = await documento('58', 'PA', 'E', 'S', 'R', '2026-09-28 15:09:00')
  await item(pedido58, '1', '144.00', '1')
  const pedido116 = await documento('116', 'PA', 'E', 'S', 'R', '2026-09-29 10:15:00', [1, 18152, 3])
  await item(pedido116, '1', '45.00', '1')
  const pedido87 = await documento('87', 'PA', 'E', 'S', 'R', '2026-09-29 11:00:00', [3, 18153, 1])
  await item(pedido87, '1', '120.00', '999005')
  await item(pedido87, '2', '10.00', null)
  const semVendedor = await documento('54', 'PA', 'E', 'S', 'R', '2026-09-29 12:00:00', [1, 18152, 3])
  await item(semVendedor, '1', '77.00', null)
  const pedido117 = await documento('117', 'PA', 'E', 'S', 'R', '2026-09-30 10:00:00', [1, 18152, 3])
  await item(pedido117, '1', '77.00', '1')
  const cancelado = await documento('110', 'PA', 'C', 'S', 'R', '2026-09-30 10:30:00', [3, 9149, 1])
  await item(cancelado, '1', '30.00', '1')
  const orcamento = await documento('120', 'OC', 'E', 'N', 'N', '2026-09-30 11:00:00')
  await item(orcamento, '1', '144.00', '1')
  const troca = await documento('61', 'TM', 'E', 'E', 'P', '2026-09-28 15:30:00', [1, 18152, 2])
  await item(troca, '1', '77.00', '1')
  const antesDaVirada = await documento('50', 'PA', 'E', 'S', 'R', '2026-09-27 18:00:00')
  await item(antesDaVirada, '1', '10.00', '1')

  // A pagar: parcelas pendentes de documento que paga, sem o crédito de troca (TM) e sem o modelo TR.
  const conta2 = await documento('2', 'CP', 'E', 'N', 'P', '2026-04-14 00:00:00')
  await parcela(conta2, '1', '1500.00', 'P')
  await parcela(conta2, '2', '300.00', 'B')
  const conta3 = await documento('3', 'CP', 'E', 'N', 'P', '2026-05-02 00:00:00')
  await parcela(conta3, '3', '245.50', 'P')
  await parcela(troca, '4', '77.00', 'P')
  const retirada = await documento('4', 'TR', 'E', 'N', 'P', '2026-09-30 12:00:00')
  await parcela(retirada, '5', '10.00', 'P')

  // Fechamentos: informado − calculado por forma, sem a linha da troca; informado vazio conta como zero.
  const fc114 = await documento('114', 'FC', 'E', 'N', 'N', '2026-09-29 08:37:00', [1, 18152, 3])
  await conferencia(fc114, '31', '1', '50.00', '48.00')
  await conferencia(fc114, '32', '2', '10.00', '10.00')
  const fc118 = await documento('118', 'FC', 'E', 'N', 'N', '2026-09-29 18:00:00', [1, 18152, 3])
  await conferencia(fc118, '33', '1', '45.00', '45.00')
  await conferencia(fc118, '34', '2', '0.00', '0.00')
  await conferencia(fc118, '35', '3', '0.00', '0.00')
  await conferencia(fc118, '36', '4', '0.00', '0.00')
  await conferencia(fc118, '37', '5', '77.00', '0.00')
  const fc140 = await documento('140', 'FC', 'E', 'N', 'N', '2026-09-30 19:10:00', [3, 18153, 1])
  await conferencia(fc140, '38', '1', '310.500000', '300.000000')
  await conferencia(fc140, '39', '3', '100.00', null)
  // Forma 99 não tem tradução (a 9 ganhou tradução na migração 014): a linha usa o rótulo "forma 99", sem
  // nome, e não muda a quebra (1,00 − 1,00 = 0).
  await conferencia(fc140, '41', '99', '1.00', '1.00')
  // Fechamento cancelado: o ERP só conta a conferência de documento emitido, e o Kaizen também não o mostra.
  const fcCancelado = await documento('141', 'FC', 'C', 'N', 'N', '2026-09-30 19:30:00', [3, 18153, 1])
  await conferencia(fcCancelado, '40', '1', '20.00', '0.00')

  // Estoque: a foto da última leitura.
  await banco.cliente.query(
    `insert into kaizen.estoque_atual (fonte, produto, quantidade, lido_em) values
       ('meuerp', '60', 3.000000, '2026-10-01 09:00:04-03'), ('meuerp', '1391', 1234.500000, '2026-10-01 09:00:04-03'),
       ('meuerp', '5278', -1.000000, '2026-10-01 09:00:04-03'), ('link', '999', 5, '2026-10-01 09:00:04-03')`,
  )
  await banco.cliente.query(
    `insert into kaizen.produto (fonte, codigo, descricao, ativo) values ('meuerp', '60', 'PRODUTO 60', true), ('meuerp', '1391', 'PRODUTO 1391', true)`,
  )

  // Execuções: a primeira agendada foi às 8h de 28/09; em 29/09 a das 10h falhou, com o Telegram avisando, e a das 15h
  // não aconteceu; em 30/09 a das 12h falhou e o Telegram recusou a mensagem.
  for (const hora of HORAS) await execucao('2026-09-28', hora, 'ok')
  for (const hora of HORAS) {
    if (hora !== 15) await execucao('2026-09-29', hora, hora === 10 ? 'falha' : 'ok', hora === 10 ? { mensagem: 'o ERP não respondeu', telegramOk: true } : {})
  }
  for (const hora of HORAS) {
    await execucao('2026-09-30', hora, hora === 12 ? 'falha' : 'ok', hora === 12 ? { mensagem: 'o ERP não respondeu', telegramOk: false } : {})
  }
  await execucao('2026-09-30', 11, 'pulada')
  await execucao('2026-09-30', 23, 'ok', { manual: true })
  await execucao('2026-10-01', 8, 'ok')
  await execucao('2026-10-01', 9, 'aviso')

  const texto = await conferenciaDoDono(banco.cliente, ['60', '1391', '5278', '999'], Date.parse('2026-10-01T12:30:00Z'))
  assert.equal(texto, [
    'Conferência do Kaizen — 01/10 às 9h30',
    '',
    '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.',
    '- 28/09: 1 venda, R$ 144,00',
    '- 29/09: 2 vendas, R$ 165,00',
    '- 30/09: 1 venda, R$ 77,00',
    'Total: 4 vendas, R$ 386,00',
    '',
    '2. Contas a pagar pendentes, sem o crédito de troca: 2 parcelas, R$ 1.745,50. Onde conferir: tela de contas a pagar.',
    'O crédito de troca pendente fica fora, porque não é conta: 1 parcela, R$ 77,00. A tela de contas a pagar do ERP mostra os dois somados: 3 parcelas, R$ 1.822,50.',
    '',
    '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.',
    '- fechamento 114, 29/09 às 08h37 (caixa 1, usuário 18152, abertura 3): quebra −R$ 2,00',
    '  dinheiro (forma 1): calculado R$ 50,00, informado R$ 48,00, quebra −R$ 2,00',
    '  pix (forma 2): calculado R$ 10,00, informado R$ 10,00, quebra R$ 0,00',
    '- fechamento 118, 29/09 às 18h00 (caixa 1, usuário 18152, abertura 3): quebra R$ 0,00',
    '  dinheiro (forma 1): calculado R$ 45,00, informado R$ 45,00, quebra R$ 0,00',
    '  pix (forma 2): calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '  credito (forma 3): calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '  debito (forma 4): calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '- fechamento 140, 30/09 às 19h10 (caixa 3, usuário 18153, abertura 1): quebra −R$ 110,50',
    '  dinheiro (forma 1): calculado R$ 310,50, informado R$ 300,00, quebra −R$ 10,50',
    '  credito (forma 3): calculado R$ 100,00, informado R$ 0,00, quebra −R$ 100,00',
    '  forma 99: calculado R$ 1,00, informado R$ 1,00, quebra R$ 0,00',
    '',
    '4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.',
    '- produto 60 (PRODUTO 60): 3 (lido em 01/10 às 09h00)',
    '- produto 1391 (PRODUTO 1391): 1.234,5 (lido em 01/10 às 09h00)',
    '- produto 5278: −1 (lido em 01/10 às 09h00)',
    '- produto 999: não está na foto do estoque do ERP',
    '',
    '5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).',
    '- 25/09 (sexta): nenhuma esperada',
    '- 26/09 (sábado): nenhuma esperada',
    '- 27/09 (domingo): nenhuma esperada',
    '- 28/09 (segunda): 13 esperadas, 13 feitas',
    '- 29/09 (terça): 13 esperadas, 12 feitas, 1 com falha (10h, avisada pelo Telegram); faltaram: 15h',
    '- 30/09 (quarta): 13 esperadas, 13 feitas, 1 com falha (12h, não avisada pelo Telegram)',
    '- 01/10 (quinta, até agora): 2 esperadas, 2 feitas',
    'Total: 41 esperadas, 40 feitas.',
    '',
    'Última comparação da noite (30/09): zero diferença.',
  ].join('\n'))
})

test('a operação real de 28/09 (pedidos 209, 221, 324, conta 365 e fechamento 417): vendas, contas a pagar e a quebra trazem o código da forma', async () => {
  // Vendas 154: os 3 pedidos, cada um com todos os itens do vendedor 999005 (docs/superpowers/plans/2026-09-28-fase2-conferencia-codigos.md).
  const pedido209 = await documento('209', 'PA', 'E', 'S', 'R', '2026-09-28 10:19:52')
  await item(pedido209, '1', '28.80', '999005')
  await item(pedido209, '2', '58.00', '999005')
  await item(pedido209, '3', '23.20', '999005')

  const pedido221 = await documento('221', 'PA', 'E', 'S', 'R', '2026-09-28 10:50:16')
  await item(pedido221, '1', '375.00', '999005')
  await item(pedido221, '2', '18.00', '999005')
  await item(pedido221, '3', '120.00', '999005')
  await item(pedido221, '4', '5.00', '999005')

  const pedido324 = await documento('324', 'PA', 'E', 'S', 'R', '2026-09-28 15:03:30')
  await item(pedido324, '1', '91.20', '999005')
  await item(pedido324, '2', '38.00', '999005')
  await item(pedido324, '3', '34.91', '999005')
  await item(pedido324, '4', '12.00', '999005')
  await item(pedido324, '5', '9.50', '999005')

  // Conta a pagar 365: 4 parcelas de R$ 114,90; a de status C (agora "cancelada", migração 009) fica fora.
  const conta365 = await documento('365', 'CP', 'E', 'E', 'P', '2026-09-28 00:00:00')
  await parcela(conta365, '1', '114.90', 'C')
  await parcela(conta365, '2', '114.90', 'P')
  await parcela(conta365, '3', '114.90', 'P')
  await parcela(conta365, '4', '114.90', 'P')

  // Fechamento 417: 8 linhas de forma (1 a 8), quebra de R$ 2,00 toda no dinheiro.
  const fc417 = await documento('417', 'FC', 'E', 'N', 'N', '2026-09-28 17:55:09', [1, 18153, 3])
  await conferencia(fc417, '1', '1', '604.80', '606.80')
  await conferencia(fc417, '2', '2', '43.20', '43.20')
  await conferencia(fc417, '3', '3', '0.00', '0.00')
  await conferencia(fc417, '4', '4', '160.90', '160.90')
  await conferencia(fc417, '5', '5', '0.00', '0.00')
  await conferencia(fc417, '6', '6', '2535.48', '2535.48')
  await conferencia(fc417, '7', '7', '500.00', '500.00')
  await conferencia(fc417, '8', '8', '185.61', '185.61')

  const texto = await conferenciaDoDono(banco.cliente, [], Date.parse('2026-09-28T21:00:00Z'))
  const partes = texto.split('\n\n')
  assert.equal(partes[1], [
    '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.',
    '- 28/09: 3 vendas, R$ 813,61',
    'Total: 3 vendas, R$ 813,61',
  ].join('\n'))
  assert.equal(partes[2], [
    '2. Contas a pagar pendentes, sem o crédito de troca: 3 parcelas, R$ 344,70. Onde conferir: tela de contas a pagar.',
    'O crédito de troca pendente fica fora, porque não é conta: 0 parcelas, R$ 0,00. A tela de contas a pagar do ERP mostra os dois somados: 3 parcelas, R$ 344,70.',
  ].join('\n'))
  assert.equal(partes[3], [
    '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.',
    '- fechamento 417, 28/09 às 17h55 (caixa 1, usuário 18153, abertura 3): quebra R$ 2,00',
    '  dinheiro (forma 1): calculado R$ 604,80, informado R$ 606,80, quebra R$ 2,00',
    '  pix (forma 2): calculado R$ 43,20, informado R$ 43,20, quebra R$ 0,00',
    '  credito (forma 3): calculado R$ 0,00, informado R$ 0,00, quebra R$ 0,00',
    '  debito (forma 4): calculado R$ 160,90, informado R$ 160,90, quebra R$ 0,00',
    '  pix (forma 6): calculado R$ 2.535,48, informado R$ 2.535,48, quebra R$ 0,00',
    '  credito (forma 7): calculado R$ 500,00, informado R$ 500,00, quebra R$ 0,00',
    '  debito (forma 8): calculado R$ 185,61, informado R$ 185,61, quebra R$ 0,00',
  ].join('\n'))
})

test('com o Kaizen vazio, cada parte diz que não há nada, sem inventar número', async () => {
  const texto = await conferenciaDoDono(banco.cliente, [], Date.parse('2026-09-28T10:05:00Z'))
  assert.equal(texto, [
    'Conferência do Kaizen — 28/09 às 7h05',
    '',
    '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.',
    '- nenhuma venda desde 28/09',
    'Total: 0 vendas, R$ 0,00',
    '',
    '2. Contas a pagar pendentes, sem o crédito de troca: 0 parcelas, R$ 0,00. Onde conferir: tela de contas a pagar.',
    'O crédito de troca pendente fica fora, porque não é conta: 0 parcelas, R$ 0,00. A tela de contas a pagar do ERP mostra os dois somados: 0 parcelas, R$ 0,00.',
    '',
    '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.',
    '- nenhum fechamento desde 28/09',
    '',
    '4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.',
    '- nenhum produto pedido; para ver o saldo, rode o comando com os códigos (exemplo: conferencia 60 2138)',
    '',
    '5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).',
    '- nenhuma execução agendada registrada ainda',
    '',
    'Última comparação da noite: nenhuma leitura da noite registrada ainda.',
  ].join('\n'))
})

test('a última comparação da noite lista as diferenças, e diz quando a noite falhou', async () => {
  const ultimaParte = async (): Promise<string> => {
    const texto = await conferenciaDoDono(banco.cliente, [], Date.parse('2026-10-02T12:00:00Z'))
    return texto.split('\n\n').at(-1) ?? ''
  }
  await execucao('2026-09-30', 22, 'aviso', {
    avisos: [
      { tipo: 'estoque_diverge', chave: 'estoque:60:1850:2.000000', texto: 'o saldo do produto 60 no ERP (2.000000) não bate com os movimentos (3.000000)' },
      { tipo: 'total_diferente', chave: 'total:2026-09-29:itens:valor:165.00:145.00', texto: 'em 29/09, itens:valor: ERP 165.00, Kaizen 145.00' },
      { tipo: 'total_diferente', chave: 'total:2026-09-29:pagamentos:valor:165.00:145.00', texto: 'em 29/09, pagamentos:valor: ERP 165.00, Kaizen 145.00' },
    ],
  })
  assert.equal(await ultimaParte(), [
    'Última comparação da noite (30/09): 2 diferenças:',
    '- em 29/09, itens:valor: ERP 165.00, Kaizen 145.00',
    '- em 29/09, pagamentos:valor: ERP 165.00, Kaizen 145.00',
  ].join('\n'))

  await execucao('2026-10-01', 22, 'falha', { mensagem: 'o ERP não respondeu' })
  await execucao('2026-10-01', 22, 'pulada')
  assert.equal(await ultimaParte(), 'Última comparação da noite (01/10): a leitura da noite falhou (o ERP não respondeu); a comparação não terminou.')
})

test('o comando "conferencia 60 5278" lê o banco da KAIZEN_URL, imprime a conferência e sai com 0', async (t) => {
  await banco.cliente.query(
    `insert into kaizen.estoque_atual (fonte, produto, quantidade, lido_em) values ('meuerp', '60', 3.000000, '2026-10-01 09:00:04-03')`,
  )
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  garantirLocal(banco.url)
  // MEUERP_TOKEN é exigido pela configuração, mas a conferência não fala com o ERP.
  const codigo = await principal(['conferencia', '60', '5278'], { MEUERP_TOKEN: 'nao-usado', KAIZEN_URL: banco.url })
  assert.equal(codigo, 0)
  assert.equal(impressos.length, 1)
  assert.match(impressos[0], /^Conferência do Kaizen — \d{2}\/\d{2} às \d{1,2}h\d{2}\n/)
  assert.ok(impressos[0].includes('\n- produto 60: 3 (lido em 01/10 às 09h00)\n- produto 5278: não está na foto do estoque do ERP\n'), impressos[0])
})
