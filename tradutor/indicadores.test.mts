import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { inserirDocumento, inserirItem, inserirNatureza } from './apoio-regras.mts'
import type { Cliente } from './banco.mts'
import { calcularRespostas, diasDaHistoria, linhasDoDia, PERGUNTAS, responder } from './indicadores.mts'
import { principal } from './principal.mts'

// A rotina das respostas (spec da Fase 4, seção 9): a gravação em kaizen.resposta e as três linhas do comando indicadores.
let banco: BancoTeste
let c: Cliente

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
})

after(async () => {
  await banco?.fechar()
})

beforeEach(async () => {
  await c.query('truncate kaizen.resposta, kaizen.documento restart identity cascade')
})

// Uma venda do ERP novo de R$ 150,00 em 28/09/2026 (segunda), pedido 530, produto 60, vendedor Igor (1).
async function vendaDe150(): Promise<void> {
  const n530 = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  const pedido = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: n530, criadoEm: '2026-09-28 10:15:00' })
  await inserirItem(c, pedido, { produto: '60', sentido: 'S', quantidade: '1', valor: '150.00', vendedor: '1' })
}

// Grava uma resposta montada à mão: o JSON vai como texto, com os números escritos como a regra os escreve.
async function gravarResposta(dia: string, pergunta: string, conteudo: string): Promise<void> {
  await c.query('insert into kaizen.resposta (data, pergunta, conteudo) values ($1, $2, $3::jsonb)', [dia, pergunta, conteudo])
}

test('diasDaHistoria vai de 01/04/2026 até o dia pedido, inclusive: 3 dias em 03/04 e 182 em 29/09', () => {
  assert.deepEqual(diasDaHistoria('2026-04-03'), ['2026-04-01', '2026-04-02', '2026-04-03'])
  assert.deepEqual(diasDaHistoria('2026-04-01'), ['2026-04-01'])
  const ate2909 = diasDaHistoria('2026-09-29')
  // abril 30 + maio 31 + junho 30 + julho 31 + agosto 31 + setembro até o dia 29 = 182
  assert.equal(ate2909.length, 182)
  assert.deepEqual(ate2909.slice(29, 32), ['2026-04-30', '2026-05-01', '2026-05-02'])
  assert.equal(ate2909[181], '2026-09-29')
})

test('calcularRespostas grava as três perguntas de cada dia como a regra as devolve, e devolve quantas gravou', async () => {
  await vendaDe150()

  // Ajuste do orquestrador: a primeira coisa dentro da transação de cada dia é "set local jit = off". Prova: intercepta
  // esse comando e pergunta "show jit" na mesma conexão, ainda dentro da transação — tem de dar "off" nas duas.
  const clienteQualquer = c as unknown as { query: (...args: unknown[]) => Promise<{ rows: Array<Record<string, string>> }> }
  const original = clienteQualquer.query.bind(clienteQualquer)
  const jits: string[] = []
  clienteQualquer.query = async (...args: unknown[]) => {
    const resultado = await original(...args)
    if (args[0] === 'set local jit = off') jits.push((await original('show jit')).rows[0].jit)
    return resultado
  }
  let gravadas: number
  try {
    gravadas = await calcularRespostas(c, ['2026-09-27', '2026-09-28'])
  } finally {
    clienteQualquer.query = original
  }
  assert.deepEqual(jits, ['off', 'off'])
  assert.equal(gravadas, 6)

  const { rows } = await c.query('select data, pergunta from kaizen.resposta order by data, pergunta')
  assert.deepEqual(rows, [
    { data: '2026-09-27', pergunta: 'compras' }, { data: '2026-09-27', pergunta: 'financeiro' }, { data: '2026-09-27', pergunta: 'vendas' },
    { data: '2026-09-28', pergunta: 'compras' }, { data: '2026-09-28', pergunta: 'financeiro' }, { data: '2026-09-28', pergunta: 'vendas' },
  ])
  // O conteúdo é o JSON da regra, gravado como veio: igual ao que a regra devolve para o mesmo dia.
  for (const dia of ['2026-09-27', '2026-09-28']) {
    for (const pergunta of PERGUNTAS) {
      const gravada = await c.query('select conteudo from kaizen.resposta where data = $1 and pergunta = $2', [dia, pergunta])
      assert.deepEqual(gravada.rows[0].conteudo, await responder(c, pergunta, dia), `${pergunta} de ${dia}`)
    }
  }
  // A venda de R$ 150,00 é o realizado do dia 28 (spec, seção 8.1).
  const realizado = await c.query(
    `select (conteudo->'dia'->>'realizado')::numeric = 150 as bate from kaizen.resposta where data = '2026-09-28' and pergunta = 'vendas'`,
  )
  assert.equal(realizado.rows[0].bate, true)
})

test('calcularRespostas sobrescreve a resposta que já estava gravada e renova calculado_em; o outro dia fica como estava', async () => {
  const velha = '{"velha": true}'
  await c.query(
    `insert into kaizen.resposta (data, pergunta, conteudo, calculado_em) values
       ('2026-09-27', 'vendas', $1::jsonb, '2000-01-01 00:00:00-03'),
       ('2026-09-28', 'vendas', $1::jsonb, '2000-01-01 00:00:00-03'),
       ('2026-09-28', 'compras', $1::jsonb, '2000-01-01 00:00:00-03'),
       ('2026-09-28', 'financeiro', $1::jsonb, '2000-01-01 00:00:00-03')`,
    [velha],
  )

  assert.equal(await calcularRespostas(c, ['2026-09-28']), 3)

  const { rows } = await c.query(
    `select data, pergunta, conteudo ? 'velha' as velha, calculado_em > '2000-01-01 00:00:00-03' as renovada
       from kaizen.resposta order by data, pergunta`,
  )
  assert.deepEqual(rows, [
    { data: '2026-09-27', pergunta: 'vendas', velha: true, renovada: false },
    { data: '2026-09-28', pergunta: 'compras', velha: false, renovada: true },
    { data: '2026-09-28', pergunta: 'financeiro', velha: false, renovada: true },
    { data: '2026-09-28', pergunta: 'vendas', velha: false, renovada: true },
  ])
})

test('cada dia é gravado numa transação: o dia em que uma resposta falha fica sem nenhuma, e o dia anterior fica gravado', async () => {
  // Só neste teste: o banco recusa a resposta financeira de 28/09.
  await c.query(`alter table kaizen.resposta add constraint recusa_teste check (not (data = '2026-09-28' and pergunta = 'financeiro'))`)
  try {
    await assert.rejects(calcularRespostas(c, ['2026-09-27', '2026-09-28', '2026-09-29']), /recusa_teste/)
    // 27/09: as três. 28/09: vendas e compras foram desfeitas junto com a financeira. 29/09: não chegou a ser calculado.
    const { rows } = await c.query('select data, count(*)::int as respostas from kaizen.resposta group by data order by data')
    assert.deepEqual(rows, [{ data: '2026-09-27', respostas: 3 }])
  } finally {
    await c.query('alter table kaizen.resposta drop constraint recusa_teste')
  }
})

test('as três linhas de um dia com meta, estoque conhecido e saldo do banco; num domingo, ritmo vazio sai "—" e sem fechamento a quebra é zero', async () => {
  // 28/09/2026. Percentual: 44.900,35 ÷ 60.000,00 = 0,7483 → 74,83%. Ritmo: 0,7483 ÷ (22 ÷ 24 dias úteis) = 0,8164
  // (setembro: 26 dias de segunda a sábado, menos 07/09 e 26/09 = 24; até 28/09: 24 − 2 = 22).
  await gravarResposta('2026-09-28', 'vendas', `{
    "dia": {"vendido": 1234.50, "devolucoes": 0, "realizado": 1234.50, "vendas": 7},
    "mes": {"vendido": 45210.35, "devolucoes": 310.00, "realizado": 44900.35, "vendas": 203,
            "meta": 60000.00, "percentual_meta": 0.7483, "ritmo": 0.8164, "projecao": 58300.20}}`)
  await gravarResposta('2026-09-28', 'compras', `{
    "abc_valor": {"A": {"produtos": 212}, "B": {"produtos": 187}, "C": {"produtos": 391}},
    "compras_por_classe": {"A": 14, "B": 9, "C": 11, "sem_venda": 23},
    "estoque_conhecido": true, "encalhe": {"produtos": 312, "valor": 48213.77}, "ruptura": {"produtos": 17}}`)
  // Folga: 20.000,00 − (0,00 vencidas + 15.230,10 até 7 dias) = 4.769,90. Quebra do dia: −3,50 + 1,25 = −2,25.
  await gravarResposta('2026-09-28', 'financeiro', `{
    "fonte": "meuerp",
    "contas_a_pagar": {"total": {"parcelas": 81, "valor": 217491.43}, "vencidas": {"parcelas": 0, "valor": 0},
                       "ate_7_dias": {"parcelas": 6, "valor": 15230.10}},
    "saldo_banco": {"data": "2026-09-28", "valor": 20000.00}, "folga_7": 4769.90,
    "caixa": {"fechamentos": [{"codigo": "2", "quebra": -3.50, "formas": []}, {"codigo": "3", "quebra": 1.25, "formas": []}]}}`)

  assert.deepEqual(await linhasDoDia(c, '2026-09-28'), [
    '28/09/2026 vendas: realizado do dia R$ 1.234,50 (7 vendas); no mês vendido R$ 45.210,35, devoluções R$ 310,00, realizado R$ 44.900,35 (203 vendas), meta R$ 60.000,00 (74,83%), ritmo 0,8164, projeção R$ 58.300,20',
    '28/09/2026 compras: curva A 212, B 187, C 391 produtos; compras do período: A 14, B 9, C 11, sem venda 23; encalhe 312 produtos, R$ 48.213,77; ruptura 17',
    '28/09/2026 financeiro (meuerp): a pagar R$ 217.491,43 em 81 parcelas, vencidas R$ 0,00, até 7 dias R$ 15.230,10; folga em 7 dias R$ 4.769,90; quebra do dia −R$ 2,25',
  ])

  // 01/11/2026 é domingo: com meta e nenhum dia útil decorrido, o ritmo sai vazio (spec, seção 8.2) e a linha diz "—";
  // sem fechamento de caixa, a lista pode vir null, e a quebra do dia é zero.
  await gravarResposta('2026-11-01', 'vendas', `{
    "dia": {"realizado": 0, "vendas": 0},
    "mes": {"vendido": 0, "devolucoes": 0, "realizado": 0, "vendas": 0,
            "meta": 65000.00, "percentual_meta": 0.0000, "ritmo": null, "projecao": 61200.00}}`)
  await gravarResposta('2026-11-01', 'compras', '{}')
  await gravarResposta('2026-11-01', 'financeiro', `{
    "fonte": "meuerp",
    "contas_a_pagar": {"total": {"parcelas": 64, "valor": 171250.00}, "vencidas": {"parcelas": 0, "valor": 0},
                       "ate_7_dias": {"parcelas": 5, "valor": 12400.00}},
    "saldo_banco": null, "folga_7": null, "caixa": {"fechamentos": null}}`)
  const [vendas, , financeiro] = await linhasDoDia(c, '2026-11-01')
  assert.equal(
    vendas,
    '01/11/2026 vendas: realizado do dia R$ 0,00 (0 vendas); no mês vendido R$ 0,00, devoluções R$ 0,00, realizado R$ 0,00 (0 vendas), meta R$ 65.000,00 (0,00%), ritmo —, projeção R$ 61.200,00',
  )
  assert.equal(
    financeiro,
    '01/11/2026 financeiro (meuerp): a pagar R$ 171.250,00 em 64 parcelas, vencidas R$ 0,00, até 7 dias R$ 12.400,00; saldo do banco não digitado; quebra do dia R$ 0,00',
  )
})

test('as três linhas de um dia da Link sem meta, antes de 26/09 e sem saldo do banco', async () => {
  await gravarResposta('2026-06-15', 'vendas', `{
    "dia": {"realizado": 5516.80, "vendas": 41},
    "mes": {"vendido": 70210.45, "devolucoes": 180.00, "realizado": 70030.45, "vendas": 530,
            "meta": null, "percentual_meta": null, "ritmo": null, "projecao": 140120.90}}`)
  await gravarResposta('2026-06-15', 'compras', `{
    "abc_valor": {"A": {"produtos": 198}, "B": {"produtos": 176}, "C": {"produtos": 402}},
    "compras_por_classe": {"A": 20, "B": 12, "C": 8, "sem_venda": 31},
    "estoque_conhecido": false, "encalhe": null, "ruptura": null}`)
  await gravarResposta('2026-06-15', 'financeiro', `{
    "fonte": "link",
    "contas_a_pagar": {"total": {"parcelas": 102, "valor": 263410.08}, "vencidas": {"parcelas": 3, "valor": 4120.00},
                       "ate_7_dias": {"parcelas": 9, "valor": 18650.37}},
    "saldo_banco": null, "folga_7": null, "caixa": {"fechamentos": []}}`)

  assert.deepEqual(await linhasDoDia(c, '2026-06-15'), [
    '15/06/2026 vendas: realizado do dia R$ 5.516,80 (41 vendas); no mês vendido R$ 70.210,45, devoluções R$ 180,00, realizado R$ 70.030,45 (530 vendas), sem meta cadastrada, projeção R$ 140.120,90',
    '15/06/2026 compras: curva A 198, B 176, C 402 produtos; compras do período: A 20, B 12, C 8, sem venda 31; estoque desconhecido antes de 26/09/2026',
    '15/06/2026 financeiro (link): a pagar R$ 263.410,08 em 102 parcelas, vencidas R$ 4.120,00, até 7 dias R$ 18.650,37; saldo do banco não digitado; quebra do dia R$ 0,00',
  ])
})

test('o comando indicadores calcula, grava e imprime as três linhas de cada dia, sem registrar execução nem mandar Telegram', async (t) => {
  await vendaDe150()
  const chamadas: string[] = []
  const fetchFalso = (async (url: string | URL | Request) => {
    chamadas.push(String(url))
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }) as typeof fetch
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  const ambiente = { MEUERP_TOKEN: 'token-de-teste', KAIZEN_URL: banco.url, TELEGRAM_TOKEN: '123:abc', TELEGRAM_CHAT: '42' }

  assert.equal(await principal(['indicadores', '2026-09-28', '2026-06-15'], ambiente, fetchFalso), 0)

  // As linhas impressas são as de kaizen.resposta, na ordem dos dias pedidos.
  assert.deepEqual(impressos, [...(await linhasDoDia(c, '2026-09-28')), ...(await linhasDoDia(c, '2026-06-15'))])
  assert.equal(impressos.length, 6)
  assert.ok(impressos[0].startsWith('28/09/2026 vendas: realizado do dia R$ 150,00 (1 vendas); '), impressos[0])
  assert.ok(impressos[1].startsWith('28/09/2026 compras: curva A '), impressos[1])
  // A posição do financeiro vem do ERP novo a partir de 26/09 e da Link até 25/09 (spec, decisão 16).
  assert.ok(impressos[2].startsWith('28/09/2026 financeiro (meuerp): a pagar '), impressos[2])
  // Antes de 26/09 o estoque é desconhecido (spec, decisão 17).
  assert.ok(impressos[4].endsWith('; estoque desconhecido antes de 26/09/2026'), impressos[4])
  assert.ok(impressos[5].startsWith('15/06/2026 financeiro (link): a pagar '), impressos[5])
  const contas = await c.query(
    'select (select count(*)::int from kaizen.resposta) as respostas, (select count(*)::int from kaizen.execucao) as execucoes',
  )
  assert.deepEqual(contas.rows[0], { respostas: 6, execucoes: 0 })
  assert.deepEqual(chamadas, [])
})

test('o comando indicadores com dia fora da história sai com 1, diz quais, e não calcula nenhum; sem dia ou fora do formato, sai com 2', async (t) => {
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  const ambiente = { MEUERP_TOKEN: 'token-de-teste', KAIZEN_URL: banco.url }

  assert.equal(await principal(['indicadores', '2026-09-28', '2026-03-31', '2099-12-31'], ambiente), 1)
  assert.deepEqual(impressos.splice(0), [
    'indicadores falha: fora da história (de 01/04/2026 até hoje): 2026-03-31, 2099-12-31; nada foi calculado',
  ])
  assert.equal((await c.query('select count(*)::int as n from kaizen.resposta')).rows[0].n, 0)

  assert.equal(await principal(['indicadores'], ambiente), 2)
  assert.equal(await principal(['indicadores', '28/09/2026'], ambiente), 2)
  assert.equal(await principal(['indicadores', '2026-09-28', 'hoje'], ambiente), 2)
})
