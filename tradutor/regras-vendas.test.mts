import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import { inserirDocumento, inserirFuncionario, inserirItem, inserirNatureza, inserirPagamento, inserirProduto } from './apoio-regras.mts'
import { carregarCasosLink, criarLinkFalsa } from './link-falsa.mts'
import type { LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'
import { responder } from './indicadores.mts'

// A regra de vendas (sql/regras/vendas.sql, spec da Fase 4, seção 8.2). Dois bancos: um com documentos montados à mão,
// em que cada teste grava numa transação desfeita no fim (um teste não vê os documentos do outro), e um com a Link
// falsa da Fase 3 traduzida. O JSON chega pelo pg: os números viram number do JavaScript (150.00 chega 150).
let banco: BancoTeste
let c: Cliente
let bancoLink: BancoTeste
let falsa: LinkFalsa
let natureza530 = 0
let natureza900 = 0

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo (spec, seção 2.1): 530 é venda (V, mexe no financeiro); 900 é a troca da configuração.
  natureza530 = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza900 = await inserirNatureza(c, {
    codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, financeiro: true, troca: true,
  })
  // O cadastro do ERP novo: Igor e Daniele são do tipo vendedor (V); Erleide não (N).
  await inserirFuncionario(c, { codigo: '1', nome: 'Igor Mendes Ribeiro', tipo: 'V' })
  await inserirFuncionario(c, { codigo: '999005', nome: 'Daniele Fonseca Lima', tipo: 'V' })
  await inserirFuncionario(c, { codigo: '999006', nome: 'Erleide Alves Pereira', tipo: 'N' })
  await inserirProduto(c, { codigo: '60', grupo: 'FERRAMENTAS' })
  await inserirProduto(c, { codigo: '1436', grupo: 'COLAS' })

  bancoLink = await criarBancoKaizen()
  falsa = await criarLinkFalsa(bancoLink)
  await carregarCasosLink(falsa, bancoLink.cliente)
  await traduzirLink(bancoLink.cliente)
})

after(async () => {
  await falsa?.fechar()
  await bancoLink?.fechar()
  await banco?.fechar()
})

// Grava os documentos do teste numa transação e a desfaz no fim.
async function isolado(fazer: () => Promise<void>): Promise<void> {
  await c.query('begin')
  try {
    await fazer()
  } finally {
    await c.query('rollback')
  }
}

type Item = { produto: string; valor: string; vendedor: string; sentido?: 'S' | 'E' }

// Uma venda do ERP novo: pedido de natureza 530, fechado em `quando`, com os itens vendidos (saída), de quantidade 1.
async function venda(quando: string, pessoa: string, itens: Item[]): Promise<void> {
  const id = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza530, pessoa, criadoEm: quando })
  for (const item of itens) await inserirItem(c, id, { ...item, sentido: item.sentido ?? 'S', quantidade: '1' })
}

// Uma troca do ERP novo: natureza 900; os itens são devolvidos (entrada), menos os marcados com sentido 'S'.
async function troca(quando: string, pessoa: string, itens: Item[]): Promise<void> {
  const id = await inserirDocumento(c, { modelo: 'TM', natureza: '900', naturezaId: natureza900, pessoa, criadoEm: quando })
  for (const item of itens) await inserirItem(c, id, { ...item, sentido: item.sentido ?? 'E', quantidade: '1' })
}

// Junho de 2026, calculado em 15/06 (segunda-feira). Igor tem meta de R$ 600,00; Daniele não tem meta.
async function montarJunho(): Promise<void> {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-06-01', '1', 600.00)`)
  await venda('2026-05-29 10:00:00', '484', [{ produto: '60', valor: '1000.00', vendedor: '999005' }]) // fora: mês anterior
  await venda('2026-06-02 10:15:00', '484', [
    { produto: '60', valor: '59.80', vendedor: '1' },
    { produto: '1436', valor: '140.20', vendedor: '999005' },
  ])
  await troca('2026-06-10 11:20:00', '484', [{ produto: '60', valor: '29.90', vendedor: '1' }])
  await venda('2026-06-15 09:30:00', '999007', [
    { produto: '60', valor: '29.90', vendedor: '999005' },
    { produto: '7777', valor: '35.00', vendedor: '999005' }, // produto fora do cadastro: sem grupo
  ])
  await venda('2026-06-15 16:45:00', '484', [
    { produto: '1436', valor: '50.00', vendedor: '999006' }, // Erleide, tipo N
    { produto: '1436', valor: '70.10', vendedor: '1' },
  ])
  await venda('2026-06-16 10:00:00', '484', [{ produto: '60', valor: '1000.00', vendedor: '1' }]) // fora: depois do dia
}

const centavos = (reais: number): number => Math.round(reais * 100)

test('o ritmo do exemplo da spec: 15/06/2026, meta R$ 1.000,00, realizado R$ 384,60, 13 de 26 dias úteis → 0,7692', () => isolado(async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-06-01', null, 1000.00)`)
  await venda('2026-06-02 10:15:00', '484', [{ produto: '60', valor: '200.00', vendedor: '1' }])
  await venda('2026-06-15 09:30:00', '484', [{ produto: '1436', valor: '184.60', vendedor: '999005' }])
  const { mes } = await responder(c, 'vendas', '2026-06-15')
  // Junho de 2026 começa numa segunda e não tem feriado: 30 dias − 4 domingos = 26 dias úteis; de 01 a 15, 13.
  // (384,60 ÷ 1.000,00) ÷ (13 ÷ 26) = 0,3846 ÷ 0,5 = 0,7692.
  assert.deepEqual(
    {
      realizado: mes.realizado, meta: mes.meta, percentual_meta: mes.percentual_meta,
      dias_uteis: mes.dias_uteis, dias_uteis_decorridos: mes.dias_uteis_decorridos, ritmo: mes.ritmo,
    },
    { realizado: 384.6, meta: 1000, percentual_meta: 0.3846, dias_uteis: 26, dias_uteis_decorridos: 13, ritmo: 0.7692 },
  )
}))

test('a projeção: realizado do mês até a véspera + a média dos últimos 8 dias úteis do mesmo dia da semana, desde a primeira venda', () => isolado(async () => {
  // Segundas 20/04 e 27/04 com R$ 1.000,00; as 8 segundas seguintes, de 04/05 a 22/06, com R$ 100,00; a terça 23/06 com R$ 80,00.
  for (const dia of ['2026-04-20', '2026-04-27']) {
    await venda(`${dia} 10:00:00`, '484', [{ produto: '60', valor: '1000.00', vendedor: '1' }])
  }
  for (const dia of ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25', '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22']) {
    await venda(`${dia} 10:00:00`, '484', [{ produto: '60', valor: '100.00', vendedor: '1' }])
  }
  await venda('2026-06-23 10:00:00', '484', [{ produto: '60', valor: '80.00', vendedor: '1' }])
  await venda('2026-06-29 09:00:00', '484', [{ produto: '60', valor: '50.00', vendedor: '1' }])

  // Em 29/06 (segunda): até a véspera, junho tem 4 × 100,00 + 80,00 = 480,00 (os 50,00 do próprio dia 29 não entram).
  // Faltam a segunda 29 e a terça 30. Segunda: as 8 últimas são as de 04/05 a 22/06 (as de abril ficam fora), média
  // 100,00. Terça: as 8 últimas vão de 05/05 a 23/06, só uma com venda, média 80,00 ÷ 8 = 10,00. 480 + 100 + 10 = 590,00.
  assert.equal((await responder(c, 'vendas', '2026-06-29')).mes.projecao, 590)

  // Em 26/04 (domingo): até a véspera, abril tem 1.000,00 (20/04). A primeira venda é de 20/04: antes dela não há dia
  // na média. Segunda: só 20/04, média 1.000,00; os outros dias da semana, 0. Falta uma segunda (27/04): 1.000 + 1.000.
  assert.equal((await responder(c, 'vendas', '2026-04-26')).mes.projecao, 2000)
}))

test('dia sem venda num mês com venda: o dia sai com 0 vendas e ticket e itens por venda vazios; o mês, com os dois', () => isolado(async () => {
  await venda('2026-06-02 10:15:00', '484', [
    { produto: '60', valor: '59.80', vendedor: '1' },
    { produto: '1436', valor: '140.20', vendedor: '999005' },
  ])
  await venda('2026-06-03 16:40:00', '484', [{ produto: '60', valor: '29.90', vendedor: '1' }])
  const { dia, mes } = await responder(c, 'vendas', '2026-06-04')
  assert.deepEqual(dia, { vendido: 0, devolucoes: 0, realizado: 0, vendas: 0, ticket_medio: null, itens_por_venda: null, sem_vendedor: { itens: 0, valor: 0 } })
  // 229,90 ÷ 2 vendas = 114,95; (2 produtos + 1 produto) ÷ 2 vendas = 1,5.
  assert.deepEqual(
    {
      vendido: mes.vendido, devolucoes: mes.devolucoes, realizado: mes.realizado, vendas: mes.vendas,
      ticket_medio: mes.ticket_medio, itens_por_venda: mes.itens_por_venda,
    },
    { vendido: 229.9, devolucoes: 0, realizado: 229.9, vendas: 2, ticket_medio: 114.95, itens_por_venda: 1.5 },
  )
}))

test('dia sem venda num mês ainda sem venda (05/04/2026): zeros, e ticket, itens, meta e ritmo vazios, sem erro', () => isolado(async () => {
  // Abril de 2026: 30 dias − 4 domingos = 26 dias úteis; de 01 a 05, 4 (quarta a sábado). Sem venda, a projeção é 0.
  assert.deepEqual(await responder(c, 'vendas', '2026-04-05'), {
    dia: { vendido: 0, devolucoes: 0, realizado: 0, vendas: 0, ticket_medio: null, itens_por_venda: null, sem_vendedor: { itens: 0, valor: 0 } },
    mes: {
      vendido: 0, devolucoes: 0, realizado: 0, vendas: 0, ticket_medio: null, itens_por_venda: null,
      meta: null, percentual_meta: null, dias_uteis: 26, dias_uteis_decorridos: 4, ritmo: null, projecao: 0,
      sem_vendedor: { itens: 0, valor: 0 },
    },
    vendedores: [
      {
        codigo: '1', nome: 'Igor Mendes Ribeiro', realizado_dia: 0, realizado_mes: 0, vendas_mes: 0,
        meta: null, ritmo: null, clientes_atendidos: 0, mix: [],
      },
      {
        codigo: '999005', nome: 'Daniele Fonseca Lima', realizado_dia: 0, realizado_mes: 0, vendas_mes: 0,
        meta: null, ritmo: null, clientes_atendidos: 0, mix: [],
      },
    ],
    outros: { realizado_dia: 0, realizado_mes: 0, vendas_mes: 0 },
    por_hora: [],
    por_dia_da_semana: [],
  })
}))

test('vendedores: Igor e Daniele (tipo V) com realizado, meta e ritmo; Erleide (tipo N) em outros; a soma é o realizado do mês', () => isolado(async () => {
  await montarJunho()
  const resposta = await responder(c, 'vendas', '2026-06-15')
  // Igor: vendeu 59,80 + 70,10 e teve 29,90 devolvidos = 100,00; ritmo (100 ÷ 600) ÷ (13 ÷ 26) = 0,3333.
  // Daniele: 140,20 + 29,90 + 35,00 = 205,10, sem meta. Erleide: 50,00.
  assert.deepEqual(
    resposta.vendedores.map((v: Record<string, unknown>) => ({
      codigo: v.codigo, nome: v.nome, realizado_dia: v.realizado_dia, realizado_mes: v.realizado_mes,
      vendas_mes: v.vendas_mes, meta: v.meta, ritmo: v.ritmo,
    })),
    [
      { codigo: '1', nome: 'Igor Mendes Ribeiro', realizado_dia: 70.1, realizado_mes: 100, vendas_mes: 2, meta: 600, ritmo: 0.3333 },
      { codigo: '999005', nome: 'Daniele Fonseca Lima', realizado_dia: 64.9, realizado_mes: 205.1, vendas_mes: 2, meta: null, ritmo: null },
    ],
  )
  assert.deepEqual(resposta.outros, { realizado_dia: 50, realizado_mes: 50, vendas_mes: 1 })
  // 100,00 + 205,10 + 50,00 = 355,10 = vendido 385,00 − devoluções 29,90.
  assert.equal(resposta.mes.realizado, 355.1)
  assert.equal(
    centavos(resposta.vendedores[0].realizado_mes) + centavos(resposta.vendedores[1].realizado_mes) + centavos(resposta.outros.realizado_mes),
    centavos(resposta.mes.realizado),
  )
}))

test('a venda com itens de dois vendedores conta uma vez nas vendas do mês e do dia, e uma vez para cada vendedor', () => isolado(async () => {
  await montarJunho()
  const { dia, mes, vendedores, outros } = await responder(c, 'vendas', '2026-06-15')
  // Vendas do mês: 02/06 (Igor e Daniele), 15/06 às 9h30 (Daniele) e 15/06 às 16h45 (Erleide e Igor) = 3; a troca não é venda.
  // Por vendedor: Igor 2, Daniele 2, outros 1 (somam 5).
  assert.equal(mes.vendas, 3)
  assert.deepEqual([vendedores[0].vendas_mes, vendedores[1].vendas_mes, outros.vendas_mes], [2, 2, 1])
  // No dia: 2 vendas, 185,00; a das 16h45 tem dois itens do mesmo produto (1436): 1 produto. (2 + 1) ÷ 2 = 1,5.
  assert.deepEqual(dia, { vendido: 185, devolucoes: 0, realizado: 185, vendas: 2, ticket_medio: 92.5, itens_por_venda: 1.5, sem_vendedor: { itens: 0, valor: 0 } })
}))

test('o item sem vendedor fica fora do vendido (docs/LOJA.md) e é sinalizado em sem_vendedor; sem item assim, sai zerado', () => isolado(async () => {
  const id = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza530, pessoa: '484', criadoEm: '2026-06-02 10:00:00' })
  await inserirItem(c, id, { produto: '60', sentido: 'S', quantidade: '1', valor: '100.00', vendedor: '1' })
  await inserirItem(c, id, { produto: '1436', sentido: 'S', quantidade: '1', valor: '30.00' }) // sem vendedor
  await venda('2026-06-03 10:00:00', '484', [{ produto: '60', valor: '10.00', vendedor: '1' }])

  const dois = await responder(c, 'vendas', '2026-06-02')
  assert.equal(dois.dia.vendido, 100) // o item de 30,00 sem vendedor fica fora
  assert.deepEqual(dois.dia.sem_vendedor, { itens: 1, valor: 30 })

  const tres = await responder(c, 'vendas', '2026-06-03')
  assert.deepEqual(tres.dia.sem_vendedor, { itens: 0, valor: 0 })
  // O mês até 03/06 acumula o item sem vendedor do dia 02.
  assert.deepEqual(tres.mes.sem_vendedor, { itens: 1, valor: 30 })
}))

test('clientes atendidos sem o Consumidor Final (999007), e o mix do mês por grupo do produto, do maior para o menor', () => isolado(async () => {
  await montarJunho()
  const { vendedores } = await responder(c, 'vendas', '2026-06-15')
  // Igor vendeu duas vezes ao 484: 1 cliente. Daniele vendeu ao 484 e ao Consumidor Final: 1 cliente.
  // Mix do Igor: COLAS 70,10; FERRAMENTAS 59,80 − 29,90 devolvidos = 29,90. O produto 7777 não tem cadastro: sem grupo.
  // Na Daniele, "sem grupo" (35,00) vem antes de FERRAMENTAS (29,90): a ordem é a do valor, não a do nome.
  assert.deepEqual(
    vendedores.map((v: Record<string, unknown>) => ({ codigo: v.codigo, clientes_atendidos: v.clientes_atendidos, mix: v.mix })),
    [
      {
        codigo: '1', clientes_atendidos: 1,
        mix: [{ grupo: 'COLAS', realizado: 70.1 }, { grupo: 'FERRAMENTAS', realizado: 29.9 }],
      },
      {
        codigo: '999005', clientes_atendidos: 1,
        mix: [{ grupo: 'COLAS', realizado: 140.2 }, { grupo: 'sem grupo', realizado: 35 }, { grupo: 'FERRAMENTAS', realizado: 29.9 }],
      },
    ],
  )
}))

test('por hora e por dia da semana: do mês até o dia, com as vendas e o realizado (a troca entra no realizado)', () => isolado(async () => {
  await montarJunho()
  const { por_hora: porHora, por_dia_da_semana: porDiaDaSemana } = await responder(c, 'vendas', '2026-06-15')
  // 02/06 (terça) às 10h: 200,00; 10/06 (quarta) às 11h: a troca, −29,90; 15/06 (segunda) às 9h: 64,90 e às 16h: 120,10.
  // As vendas de 29/05 e de 16/06, de R$ 1.000,00 às 10h, ficam fora.
  assert.deepEqual(porHora, [
    { hora: 9, vendas: 1, realizado: 64.9 },
    { hora: 10, vendas: 1, realizado: 200 },
    { hora: 11, vendas: 0, realizado: -29.9 },
    { hora: 16, vendas: 1, realizado: 120.1 },
  ])
  assert.deepEqual(porDiaDaSemana, [
    { dia_da_semana: 1, vendas: 2, realizado: 185 },
    { dia_da_semana: 2, vendas: 1, realizado: 200 },
    { dia_da_semana: 3, vendas: 0, realizado: -29.9 },
  ])
}))

test('a troca do ERP novo (natureza 900) entra nas devoluções do dia dela e do vendedor, e não é venda', () => isolado(async () => {
  await montarJunho()
  const { dia, mes, vendedores } = await responder(c, 'vendas', '2026-06-10')
  assert.deepEqual(dia, { vendido: 0, devolucoes: 29.9, realizado: -29.9, vendas: 0, ticket_medio: null, itens_por_venda: null, sem_vendedor: { itens: 0, valor: 0 } })
  // No mês até 10/06: a venda de 02/06 (200,00) menos a troca: 170,10 numa venda só.
  assert.deepEqual(
    { vendido: mes.vendido, devolucoes: mes.devolucoes, realizado: mes.realizado, vendas: mes.vendas, ticket_medio: mes.ticket_medio },
    { vendido: 200, devolucoes: 29.9, realizado: 170.1, vendas: 1, ticket_medio: 170.1 },
  )
  assert.equal(vendedores[0].realizado_dia, -29.9) // Igor

  // Uma troca em que o cliente devolve um produto e leva outro: o item levado (saída) é vendido, mas a troca não é venda.
  await troca('2026-06-11 15:00:00', '484', [
    { produto: '60', valor: '29.90', vendedor: '999005' },
    { produto: '1436', valor: '45.00', vendedor: '999005', sentido: 'S' },
  ])
  const onze = await responder(c, 'vendas', '2026-06-11')
  assert.deepEqual(onze.dia, { vendido: 45, devolucoes: 29.9, realizado: 15.1, vendas: 0, ticket_medio: null, itens_por_venda: null, sem_vendedor: { itens: 0, valor: 0 } })
}))

test('feriado fica fora dos dias úteis, no ritmo e na projeção (07/09 e 26/09 de 2026 são feriados da migração)', () => isolado(async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-09-01', null, 2400.00)`)
  await venda('2026-08-31 10:00:00', '484', [{ produto: '60', valor: '300.00', vendedor: '1' }]) // segunda, em agosto
  await venda('2026-09-08 10:00:00', '484', [{ produto: '60', valor: '400.00', vendedor: '1' }]) // terça
  const dez = (await responder(c, 'vendas', '2026-09-10')).mes
  // Setembro: 30 dias − 4 domingos − 2 feriados = 24; de 01 a 10: 10 − 1 domingo (06) − 1 feriado (07) = 8.
  // (400 ÷ 2.400) ÷ (8 ÷ 24) = 0,5. Contando os feriados como dias úteis, daria (1/6) ÷ (9 ÷ 26) = 0,4815.
  assert.deepEqual(
    { dias_uteis: dez.dias_uteis, dias_uteis_decorridos: dez.dias_uteis_decorridos, percentual_meta: dez.percentual_meta, ritmo: dez.ritmo },
    { dias_uteis: 24, dias_uteis_decorridos: 8, percentual_meta: 0.1667, ritmo: 0.5 },
  )
  // Em 14/09 (segunda), desde a primeira venda (31/08): a segunda 07/09 é feriado e fica fora da média, que é 300,00
  // (com ela, seria 150,00); terça: 01/09 e 08/09, média 200,00. Até a véspera, setembro tem 400,00.
  // Faltam as segundas 14, 21 e 28 (900,00) e as terças 15, 22 e 29 (600,00): 400 + 900 + 600 = 1.900,00.
  assert.equal((await responder(c, 'vendas', '2026-09-14')).mes.projecao, 1900)
}))

test('Link falsa: em 17/06/2026, o dia da venda 1992, o vendido é R$ 150,00; o orçamento 1771 de junho não conta', async () => {
  const { dia, mes } = await responder(bancoLink.cliente, 'vendas', '2026-06-17')
  // Os itens da 1992 somam 150,000006772 (rateio do desconto sem arredondar): o total sai arredondado, 150,00.
  assert.deepEqual(dia, { vendido: 150, devolucoes: 0, realizado: 150, vendas: 1, ticket_medio: 150, itens_por_venda: 2, sem_vendedor: { itens: 0, valor: 0 } })
  // Junho até 17/06 na Link falsa: a 1992 e o orçamento 1771 (10/06, R$ 8.580,00), que não é venda.
  assert.deepEqual({ vendido: mes.vendido, vendas: mes.vendas }, { vendido: 150, vendas: 1 })
})

test('Link falsa: a negociação 434, só de devolução (R$ 742,90 em 28/04), entra nas devoluções e não nas vendas', async () => {
  const { dia, mes } = await responder(bancoLink.cliente, 'vendas', '2026-04-28')
  // 28/04: a 427 vende 51,30; a 434 só devolve 742,90; a 435 vende 742,90. Vendas: 427 e 435.
  // Ticket 51,30 ÷ 2 = 25,65; produtos: 1 (427) + 5 (435) = 6, 6 ÷ 2 = 3.
  assert.deepEqual(dia, { vendido: 794.2, devolucoes: 742.9, realizado: 51.3, vendas: 2, ticket_medio: 25.65, itens_por_venda: 3, sem_vendedor: { itens: 0, valor: 0 } })
  // Abril até 28/04: 7 negociações com item; a 108 (15/04, 97,0002 devolvidos) e a 434 são só de devolução: 5 vendas.
  // Devoluções: 97,0002 + 742,90 = 839,9002, que sai 839,90.
  assert.deepEqual({ vendas: mes.vendas, devolucoes: mes.devolucoes }, { vendas: 5, devolucoes: 839.9 })
})

test('percentual_meta com meta e sem venda no dia útil: sai 0, não vazio (ajuste do orquestrador, 29/09)', () => isolado(async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-06-01', null, 1000.00)`)
  // 03/06/2026 é quarta-feira, dia útil; sem nenhuma venda no mês.
  const { mes } = await responder(c, 'vendas', '2026-06-03')
  assert.deepEqual({ realizado: mes.realizado, meta: mes.meta, percentual_meta: mes.percentual_meta, ritmo: mes.ritmo }, {
    realizado: 0, meta: 1000, percentual_meta: 0, ritmo: 0,
  })
}))

test('boleto: a venda de R$ 500,00 (Pix 100 + boleto 400 pendente) conta os R$ 500,00 no vendido de 05/10, o dia da venda (decisão do dono, 29/09)', () => isolado(async () => {
  const id = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza530, pessoa: '484', criadoEm: '2026-10-05 10:00:00' })
  await inserirItem(c, id, { produto: '60', sentido: 'S', quantidade: '1', valor: '500.00', vendedor: '1' })
  await inserirPagamento(c, id, { forma: '2', valor: '100.00' })
  await inserirPagamento(c, id, { forma: '9', valor: '400.00' })

  const { dia } = await responder(c, 'vendas', '2026-10-05')
  assert.equal(dia.vendido, 500)
}))
