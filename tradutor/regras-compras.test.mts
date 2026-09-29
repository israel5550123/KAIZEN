import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import {
  inserirDocumento, inserirFornecedor, inserirItem, inserirMovimento, inserirNatureza, inserirProduto, inserirVirada,
} from './apoio-regras.mts'
import { responder } from './indicadores.mts'

// A regra de compras e estoque (sql/regras/compras.sql, spec da Fase 4, seção 8.3), sobre documentos montados à mão.
let banco: BancoTeste
let c: Cliente
const natureza: Record<string, number> = {}

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo com os flags de 28/09 (spec, seção 2.1); as da Link vêm da migração 011.
  natureza['530'] = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza['5'] = await inserirNatureza(c, { codigo: '5', categoria: 'C', estoque: true, financeiro: true })
  const { rows } = await c.query<{ codigo: string; id: string }>(`select codigo, id from kaizen.natureza where fonte = 'link'`)
  for (const linha of rows) natureza[`link:${linha.codigo}`] = Number(linha.id)
})

after(async () => {
  await banco?.fechar()
})

// Cada teste começa sem documentos, movimentos, cadastros e sem a foto da virada: a migração 004 grava no banco de
// teste os 1.029 produtos reais da virada, que entrariam em toda resposta de 26/09/2026 em diante.
beforeEach(async () => {
  await c.query(
    'truncate kaizen.documento, kaizen.estoque_movimento, kaizen.estoque_virada, kaizen.produto, kaizen.produto_fornecedor, kaizen.pessoa restart identity cascade',
  )
})

// Os documentos pelo papel que têm nas regras (tarefa 6): a venda (530) e a nota (5) do ERP novo, a venda e a nota da
// Link, e o ajuste de custo, que não tem natureza. A venda leva o vendedor 1 (Igor) em cada item; a nota e o ajuste,
// nenhum. A devolução vem como na Link: item de entrada (E) dentro da venda.
const MODELO = {
  vendaLink: { fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'link:pedido', vendedor: '1' },
  notaLink: { fonte: 'link', modelo: '55', status: null, natureza: 'link:nota_entrada', vendedor: null },
  venda: { fonte: 'meuerp', modelo: 'PA', status: 'E', natureza: '530', vendedor: '1' },
  nota: { fonte: 'meuerp', modelo: '55', status: 'E', natureza: '5', vendedor: null },
  ajusteCusto: { fonte: 'meuerp', modelo: 'AC', status: 'E', natureza: null, vendedor: null },
} as const

type Item = [produto: string, sentido: 'S' | 'E' | 'N', quantidade: string, valor: string]

async function documento(tipo: keyof typeof MODELO, dia: string, itens: Item[]): Promise<void> {
  const m = MODELO[tipo]
  const id = await inserirDocumento(c, {
    fonte: m.fonte, modelo: m.modelo, status: m.status, criadoEm: `${dia} 10:00:00`,
    natureza: m.natureza === null ? null : m.natureza.replace('link:', ''),
    naturezaId: m.natureza === null ? null : natureza[m.natureza],
  })
  for (const [produto, sentido, quantidade, valor] of itens) {
    await inserirItem(c, id, { produto, sentido, quantidade, valor, vendedor: m.vendedor })
  }
}

async function compras(dia: string): Promise<any> {
  return responder(c, 'compras', dia)
}

type Linha = { codigo: string } & Record<string, unknown>

// Um campo de cada produto da lista, pelo código.
function campo(r: { produtos: Linha[] }, nome: string): Record<string, unknown> {
  return Object.fromEntries(r.produtos.map((p) => [p.codigo, p[nome]]))
}

test('estoque no fim do dia: vale o movimento de maior origem_id como número (10000 vence 9999); sem movimento, a virada; sem virada, 0', async () => {
  await inserirVirada(c, '1426', '8')
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-27 16:00:00', saldoAntes: '8', saldoDepois: '7', origemId: '9998' })
  // O ERP gravou o 9999 antes do 10000, mas o 9999 tem a hora mais tarde (a venda do caixa sem internet): pela hora,
  // ou pelo origem_id comparado como texto ('9999' > '10000'), o estoque de 28/09 sairia 5; e, como texto, o '9998'
  // de 27/09 ficaria acima do '10000', e o de 28/09 sairia 7.
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 15:00:00', saldoAntes: '7', saldoDepois: '5', origemId: '9999' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 09:00:00', saldoAntes: '5', saldoDepois: '3', origemId: '10000' })
  await inserirVirada(c, '1427', '12')
  await documento('venda', '2026-09-28', [['1428', 'S', '1', '25.00']])

  const r = await compras('2026-09-28')
  // 1426: estoque 8 em 26/09 (virada), 7 em 27/09 e 3 em 28/09; médio (8 + 7 + 3) ÷ 3 = 6; sem venda, giro 0 e
  // cobertura vazia; estoque positivo sem venda e sem compra: encalhe. 1427: sem movimento, a virada nos três dias.
  // 1428: sem virada nem movimento, estoque 0 nos três dias; giro vazio (estoque médio 0), cobertura 0 e ruptura.
  // Sozinho na curva, o 1428 tem 100% do acumulado: passa de 95% e é C.
  assert.deepEqual(r.produtos, [
    {
      codigo: '1428', descricao: null, classe_valor: 'C', classe_quantidade: 'C', liquido: 25, quantidade: 1,
      estoque: 0, estoque_medio: 0, giro: null, cobertura_dias: 0, encalhe: false, ruptura: true,
    },
    {
      codigo: '1426', descricao: null, classe_valor: null, classe_quantidade: null, liquido: 0, quantidade: 0,
      estoque: 3, estoque_medio: 6, giro: 0, cobertura_dias: null, encalhe: true, ruptura: false,
    },
    {
      codigo: '1427', descricao: null, classe_valor: null, classe_quantidade: null, liquido: 0, quantidade: 0,
      estoque: 12, estoque_medio: 12, giro: 0, cobertura_dias: null, encalhe: true, ruptura: false,
    },
  ])
})

// Sete produtos vendidos na Link. O período de 31/08/2026 vai de 03/06 a 31/08.
async function montarCurvas(): Promise<void> {
  // 2229: vendeu 9 por 749,992 e voltou 1 por 50,00: líquido 699,992, quantidade 8.
  await documento('vendaLink', '2026-08-10', [['2229', 'S', '9', '749.992'], ['2229', 'E', '1', '50.00']])
  // 1436 e 60 empatam no líquido (100,004).
  await documento('vendaLink', '2026-08-12', [['1436', 'S', '8', '100.004'], ['60', 'S', '12', '100.004']])
  // 1723 no primeiro dia do período; 1765 empata com ele no líquido (50,00) e na quantidade (1).
  await documento('vendaLink', '2026-06-03', [['1723', 'S', '1', '50.00']])
  await documento('vendaLink', '2026-08-20', [['1765', 'S', '1', '50.00']])
  // Fora do período: a véspera do primeiro dia e o dia seguinte ao calculado.
  await documento('vendaLink', '2026-06-02', [['1765', 'S', '5', '500.00']])
  await documento('vendaLink', '2026-09-01', [['1723', 'S', '3', '300.00']])
  // Fora das curvas: 1368 vendeu e voltou (líquido 0, quantidade 0); 1370 só voltou (líquido -15,00, quantidade -1).
  await documento('vendaLink', '2026-08-25', [['1368', 'S', '1', '20.00'], ['1368', 'E', '1', '20.00']])
  await documento('vendaLink', '2026-08-26', [['1370', 'E', '1', '15.00']])
}

test('curva ABC por valor: 1436 e 60 empatam no líquido e atravessam o corte de 80%; o de código menor em ordem de texto (1436 antes de 60) fica A, o outro B', async () => {
  await montarCurvas()
  const r = await compras('2026-08-31')
  // Total da curva 1.000,000, na ordem líquido decrescente e código crescente (como texto: '1436' antes de '60'):
  // 2229 699,992 (acumulado 69,9992%, A); 1436 100,004 (79,9996%, A); 60 100,004 (90%, B); 1723 50 (95%, B: não passa
  // de 95%); 1765 50 (100%, C). Com o 1370 (-15,00) na conta, o total seria 985 e o 1436 (799,996 > 788) seria B.
  assert.deepEqual(campo(r, 'classe_valor'), { '2229': 'A', '1436': 'A', '60': 'B', '1723': 'B', '1765': 'C', '1368': null })
  // Arredonda só o total da classe: A = 699,992 + 100,004 = 799,996 → 800,00 (produto a produto, 699,99 + 100,00 = 799,99).
  assert.deepEqual(r.abc_valor, {
    A: { produtos: 2, liquido: 800 },
    B: { produtos: 2, liquido: 150 },
    C: { produtos: 1, liquido: 50 },
  })
})

test('curva ABC por quantidade: no empate de quantidade vence o maior líquido, depois o menor código', async () => {
  await montarCurvas()
  const r = await compras('2026-08-31')
  // Total 30, na ordem quantidade, líquido, código: 60 12 (40%, A); 2229 8 com líquido 699,992 (66,67%, A); 1436 8 com
  // 100,004 (93,33%, B); 1723 1 (96,67%, C); 1765 1 (C). Pelo código, o 1436 viria antes do 2229 e seria A. Com o 1370
  // (-1) na conta, o total seria 29 e o 1436 (28 > 27,55) seria C; com o 1368 (0), a classe C teria 3 produtos.
  assert.deepEqual(campo(r, 'classe_quantidade'), { '60': 'A', '2229': 'A', '1436': 'B', '1723': 'C', '1765': 'C', '1368': null })
  assert.deepEqual(r.abc_quantidade, {
    A: { produtos: 2, quantidade: 20 },
    B: { produtos: 1, quantidade: 8 },
    C: { produtos: 2, quantidade: 2 },
  })
})

test('dia antes de 26/09/2026: estoque desconhecido, campos de estoque vazios; a curva, as compras e o custo zero saem', async () => {
  await montarCurvas()
  await inserirProduto(c, { codigo: '60', descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER', custo: '5.10' })
  await inserirProduto(c, { codigo: '61', custo: null })
  // A virada existe, mas não vale antes dela.
  await inserirVirada(c, '60', '3')
  await documento('notaLink', '2026-08-15', [['1765', 'E', '4', '0']])

  const semEstoque = { estoque: null, estoque_medio: null, giro: null, cobertura_dias: null, encalhe: null, ruptura: null }
  assert.deepEqual(await compras('2026-08-31'), {
    periodo: { de: '2026-06-03', ate: '2026-08-31' },
    estoque_conhecido: false,
    abc_valor: { A: { produtos: 2, liquido: 800 }, B: { produtos: 2, liquido: 150 }, C: { produtos: 1, liquido: 50 } },
    abc_quantidade: { A: { produtos: 2, quantidade: 20 }, B: { produtos: 1, quantidade: 8 }, C: { produtos: 2, quantidade: 2 } },
    compras_por_classe: { A: 0, B: 0, C: 1, sem_venda: 0 },
    encalhe: null,
    ruptura: null,
    // O 1370 só teve devolução: sem item vendido e sem estoque conhecido, fica fora da lista.
    produtos: [
      { codigo: '2229', descricao: null, classe_valor: 'A', classe_quantidade: 'A', liquido: 699.99, quantidade: 8, ...semEstoque },
      { codigo: '1436', descricao: null, classe_valor: 'A', classe_quantidade: 'B', liquido: 100, quantidade: 8, ...semEstoque },
      {
        codigo: '60', descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER', classe_valor: 'B', classe_quantidade: 'A',
        liquido: 100, quantidade: 12, ...semEstoque,
      },
      { codigo: '1723', descricao: null, classe_valor: 'B', classe_quantidade: 'C', liquido: 50, quantidade: 1, ...semEstoque },
      { codigo: '1765', descricao: null, classe_valor: 'C', classe_quantidade: 'C', liquido: 50, quantidade: 1, ...semEstoque },
      { codigo: '1368', descricao: null, classe_valor: null, classe_quantidade: null, liquido: 0, quantidade: 0, ...semEstoque },
    ],
    giro_por_grupo: null,
    giro_por_marca: null,
    giro_por_fornecedor: null,
    custo_zero: ['61'],
    estoque_negativo: null,
  })
})

test('estoque médio, giro e cobertura em 30/09/2026: média dos dias desde 26/09, giro pela quantidade de 90 dias', async () => {
  // 1426: virada 10; fim de 26/09 10, 27/09 10, 28/09 7, 29/09 4, 30/09 2. Vendeu 13 na Link e 3 + 3 + 2 no ERP novo.
  await inserirVirada(c, '1426', '10')
  await documento('vendaLink', '2026-08-10', [['1426', 'S', '13', '130.00']])
  await documento('venda', '2026-09-28', [['1426', 'S', '3', '30.00']])
  await documento('venda', '2026-09-29', [['1426', 'S', '3', '30.00']])
  await documento('venda', '2026-09-30', [['1426', 'S', '2', '20.00']])
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 10:00:00', saldoAntes: '10', saldoDepois: '7', origemId: '2001' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-29 10:00:00', saldoAntes: '7', saldoDepois: '4', origemId: '2002' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-30 10:00:00', saldoAntes: '4', saldoDepois: '2', origemId: '2003' })
  // 1427: estoque 5 sem venda. 1428: virada 1, vendeu 1 em 29/09 e zerou. 1429: vendeu 2 sem nunca ter estoque.
  await inserirVirada(c, '1427', '5')
  await inserirVirada(c, '1428', '1')
  await documento('venda', '2026-09-29', [['1428', 'S', '1', '12.00']])
  await inserirMovimento(c, { produto: '1428', momento: '2026-09-29 11:00:00', saldoAntes: '1', saldoDepois: '0', origemId: '2004' })
  await documento('venda', '2026-09-30', [['1429', 'S', '2', '40.00']])

  const r = await compras('2026-09-30')
  const medidas = r.produtos.map((p: Linha) => ({
    codigo: p.codigo, quantidade: p.quantidade, estoque: p.estoque, estoque_medio: p.estoque_medio, giro: p.giro, cobertura_dias: p.cobertura_dias,
  }))
  assert.deepEqual(medidas, [
    // médio 33 ÷ 5 = 6,6; giro 21 ÷ 6,6 = 3,1818; cobertura 2 ÷ (21 ÷ 90) = 8,5714 dias.
    { codigo: '1426', quantidade: 21, estoque: 2, estoque_medio: 6.6, giro: 3.1818, cobertura_dias: 8.5714 },
    // médio 0: giro vazio; estoque 0: cobertura 0.
    { codigo: '1429', quantidade: 2, estoque: 0, estoque_medio: 0, giro: null, cobertura_dias: 0 },
    // médio (1 + 1 + 1 + 0 + 0) ÷ 5 = 0,6; giro 1 ÷ 0,6 = 1,6667; estoque 0: cobertura 0.
    { codigo: '1428', quantidade: 1, estoque: 0, estoque_medio: 0.6, giro: 1.6667, cobertura_dias: 0 },
    // sem venda: giro 0 ÷ 5 = 0 e cobertura vazia.
    { codigo: '1427', quantidade: 0, estoque: 5, estoque_medio: 5, giro: 0, cobertura_dias: null },
  ])
})

test('estoque médio em 30/12/2026: o movimento de antes do período vale até o movimento seguinte', async () => {
  // O período vai de 02/10 a 30/12 (90 dias). O saldo 5 de 28/09 vale de 02/10 a 09/10 (8 dias), e o 4 de 10/10 até
  // 30/12 (82 dias): médio (8 × 5 + 82 × 4) ÷ 90 = 368 ÷ 90 = 4,0889. Pela virada (9) nos 8 primeiros dias, sairia 4,4444.
  await inserirVirada(c, '1426', '9')
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 10:00:00', saldoAntes: '9', saldoDepois: '5', origemId: '3001' })
  await inserirMovimento(c, { produto: '1426', momento: '2026-10-10 10:00:00', saldoAntes: '5', saldoDepois: '4', origemId: '3002' })
  await documento('venda', '2026-11-16', [['1426', 'S', '9', '90.00']])

  const r = await compras('2026-12-30')
  assert.deepEqual(r.periodo, { de: '2026-10-02', ate: '2026-12-30' })
  // giro 9 ÷ 4,0889 = 2,2011; cobertura 4 ÷ (9 ÷ 90) = 40 dias.
  assert.deepEqual(
    r.produtos.map((p: Linha) => ({ codigo: p.codigo, estoque: p.estoque, estoque_medio: p.estoque_medio, giro: p.giro, cobertura_dias: p.cobertura_dias })),
    [{ codigo: '1426', estoque: 4, estoque_medio: 4.0889, giro: 2.2011, cobertura_dias: 40 }],
  )
})

test('encalhe e produto novo em 28/09/2026: o 1708 (só ajuste de custo) é encalhe; o 5336 (nota de 26/08) é novo', async () => {
  // 1708: 164 na virada, sem venda, só aparece num ajuste de custo (no ERP, o 115, de 27/09): ajuste não é entrada, e
  // produto sem entrada de compra não é novo.
  await inserirVirada(c, '1708', '164')
  await inserirProduto(c, { codigo: '1708', grupo: 'CORREDIÇAS', marca: 'RENNA', custo: '8.29' })
  await documento('ajusteCusto', '2026-09-27', [['1708', 'E', '0', '0']])
  // 5336: 57 na virada, sem venda, entrada na nota da Link de 26/08 (33 dias antes): novo.
  await inserirVirada(c, '5336', '57')
  await inserirProduto(c, { codigo: '5336', grupo: 'PUXADORES', marca: 'RENNA', custo: '5.12' })
  await documento('notaLink', '2026-08-26', [['5336', 'E', '60', '0']])
  // Primeira entrada 60 dias antes (30/07): não é "menos de 60 dias", não é novo. 59 dias antes (31/07): novo.
  await inserirVirada(c, '1437', '10')
  await inserirProduto(c, { codigo: '1437', custo: '2.5006' })
  await documento('notaLink', '2026-07-30', [['1437', 'E', '10', '0']])
  await inserirVirada(c, '1438', '6')
  await inserirProduto(c, { codigo: '1438', custo: '1.00' })
  await documento('notaLink', '2026-07-31', [['1438', 'E', '6', '0']])
  // 1429: vendeu em 10/05, antes da primeira entrada (01/09): não é novo. Sem custo no cadastro.
  await inserirVirada(c, '1429', '4')
  await inserirProduto(c, { codigo: '1429', custo: null })
  await documento('vendaLink', '2026-05-10', [['1429', 'S', '1', '10.00']])
  await documento('notaLink', '2026-09-01', [['1429', 'E', '5', '0']])
  // 1430 e 1431: primeira entrada numa nota do ERP novo em 28/09. O 1430 tinha 3 no fim de 27/09 (virada): não é
  // novo. O 1431 tinha 0: novo.
  await inserirVirada(c, '1430', '3')
  await inserirProduto(c, { codigo: '1430', custo: '3.333333' })
  await documento('nota', '2026-09-28', [['1430', 'E', '5', '0']])
  await inserirMovimento(c, { produto: '1430', momento: '2026-09-28 10:00:00', saldoAntes: '3', saldoDepois: '8', origemId: '4001' })
  await inserirVirada(c, '1431', '0')
  await inserirProduto(c, { codigo: '1431', custo: '4.00' })
  await documento('nota', '2026-09-28', [['1431', 'E', '5', '0']])
  await inserirMovimento(c, { produto: '1431', momento: '2026-09-28 10:00:00', saldoAntes: '0', saldoDepois: '5', origemId: '4002' })
  // 1435: estoque 9 e venda no período (15/07): não é encalhe.
  await inserirVirada(c, '1435', '9')
  await inserirProduto(c, { codigo: '1435', custo: '7.00' })
  await documento('vendaLink', '2026-07-15', [['1435', 'S', '1', '30.00']])
  // Correção da revisão (item 3): a "véspera" da entrada vem do movimento (origem_id::bigint), não da virada.
  // 1440: virada 10, mas dois movimentos antes da entrada (28/09), de origem_id '9999' (saldo 0) e '10000' (saldo 4).
  // Por bigint o '10000' vence: a véspera é 4, positiva, não é novo; sem venda no período, é encalhe. Como texto,
  // '9999' > '10000' e venceria (saldo 0): sairia novo, e não encalhe.
  await inserirVirada(c, '1440', '10')
  await inserirProduto(c, { codigo: '1440', custo: '2.50' })
  await inserirMovimento(c, { produto: '1440', momento: '2026-09-27 09:00:00', saldoAntes: '10', saldoDepois: '0', origemId: '9999' })
  await inserirMovimento(c, { produto: '1440', momento: '2026-09-27 15:00:00', saldoAntes: '10', saldoDepois: '4', origemId: '10000' })
  await documento('nota', '2026-09-28', [['1440', 'E', '5', '0']])
  // 1441: virada 10, mas um movimento de ajuste com saldo 0 antes da entrada (28/09): a véspera é 0 (não a virada),
  // então é novo, mesmo com o estoque positivo (5) que a entrada deixa depois. Pela virada (10) não seria novo.
  await inserirVirada(c, '1441', '10')
  await inserirProduto(c, { codigo: '1441', custo: '1.00' })
  await inserirMovimento(c, { produto: '1441', momento: '2026-09-27 09:00:00', saldoAntes: '10', saldoDepois: '0', origemId: '8000' })
  await documento('nota', '2026-09-28', [['1441', 'E', '5', '0']])
  await inserirMovimento(c, { produto: '1441', momento: '2026-09-28 10:00:00', saldoAntes: '0', saldoDepois: '5', origemId: '8001' })

  const r = await compras('2026-09-28')
  assert.deepEqual(campo(r, 'encalhe'), {
    '1435': false, '1708': true, '5336': false, '1437': true, '1438': false, '1429': true, '1430': true, '1431': false,
    '1440': true, '1441': false,
  })
  // 164 × 8,29 + 10 × 2,5006 + 4 × (sem custo) + 8 × 3,333333 + 4 × 2,50 = 1.359,56 + 25,006 + 26,666664 + 10,00 =
  // 1.421,232664; arredonda só o total (produto a produto, 1.359,56 + 25,01 + 26,67 + 10,00 = 1.421,24).
  assert.deepEqual(r.encalhe, { produtos: 5, valor: 1421.23 })
  // Compras do período (01/07 a 28/09): 5336, 1437, 1438, 1429 (Link), 1430, 1431, 1440 e 1441 (ERP novo), nenhum
  // com venda no período. O ajuste de custo do 1708 não é compra.
  assert.deepEqual(r.compras_por_classe, { A: 0, B: 0, C: 0, sem_venda: 8 })
})

test('ruptura, estoque negativo e custo zero em 28/09/2026', async () => {
  // 61 vendeu e zerou; 62 vendeu e ficou em -1; 1352 vendeu e ficou com 4; 1360 não vendeu e ficou em -2 (ajuste).
  for (const [produto, virada, vendeu, depois, origemId] of [
    ['61', '1', '1', '0', '5001'], ['62', '1', '2', '-1', '5002'], ['1352', '5', '1', '4', '5003'], ['1360', '0', null, '-2', '5004'],
  ] as const) {
    await inserirVirada(c, produto, virada)
    if (vendeu !== null) await documento('venda', '2026-09-28', [[produto, 'S', vendeu, '10.00']])
    await inserirMovimento(c, { produto, momento: '2026-09-28 11:00:00', saldoAntes: virada, saldoDepois: depois, origemId })
  }
  // Custo zero é do cadastro atual, ativo, do ERP novo, com custo vazio ou zero, com ou sem estoque e venda.
  await inserirProduto(c, { codigo: '61', custo: null })
  await inserirProduto(c, { codigo: '62', custo: '0' })
  await inserirProduto(c, { codigo: '1363', custo: '0.00' })
  await inserirProduto(c, { codigo: '1352', custo: '0', ativo: false })
  await inserirProduto(c, { codigo: '1360', custo: '5.10' })
  await inserirProduto(c, { codigo: 'link:1993', custo: '0', fonte: 'link' })

  const r = await compras('2026-09-28')
  assert.deepEqual(campo(r, 'ruptura'), { '61': true, '62': true, '1352': false, '1360': false })
  // Cobertura 0 com estoque zero ou negativo (e não -1 ÷ (2 ÷ 90) = -45 no 62); 1352: 4 ÷ (1 ÷ 90) = 360; 1360 sem venda.
  assert.deepEqual(campo(r, 'cobertura_dias'), { '61': 0, '62': 0, '1352': 360, '1360': null })
  assert.deepEqual(r.ruptura, { produtos: 2 })
  assert.deepEqual(r.estoque_negativo, ['1360', '62'])
  assert.deepEqual(r.custo_zero, ['1363', '61', '62'])
})

test('compras por classe em 25/09/2026: a nota da Link com item N (entrada não concluída) não conta; a com item E conta', async () => {
  // Curva do período (28/06 a 25/09), total 1.000: 1436 800 (80%, A); 60 150 (95%, B); 1370 50 (C).
  await documento('vendaLink', '2026-09-10', [['1436', 'S', '1', '800.00']])
  await documento('vendaLink', '2026-09-11', [['60', 'S', '1', '150.00']])
  await documento('vendaLink', '2026-09-12', [['1370', 'S', '1', '50.00']])
  // Como as 5 notas de 22/09: só itens N. Não é entrada: o 1436 não conta como compra A.
  await documento('notaLink', '2026-09-22', [['1436', 'N', '5', '0'], ['1437', 'N', '5', '0']])
  await documento('notaLink', '2026-09-10', [['60', 'E', '10', '0'], ['1370', 'E', '4', '0'], ['1437', 'E', '3', '0']])
  // No primeiro dia do período conta; na véspera, não.
  await documento('notaLink', '2026-06-28', [['1372', 'E', '2', '0']])
  await documento('notaLink', '2026-06-27', [['1371', 'E', '2', '0']])
  // A devolução é item de entrada, mas numa venda: não é compra.
  await documento('vendaLink', '2026-09-15', [['1438', 'E', '1', '10.00']])

  const r = await compras('2026-09-25')
  // O 1436 fecha em exatamente 80% do acumulado: não passa de 80%, é A.
  assert.deepEqual(campo(r, 'classe_valor'), { '1436': 'A', '60': 'B', '1370': 'C' })
  // Das compras, 60 é B, 1370 é C; 1437 e 1372 não tiveram venda.
  assert.deepEqual(r.compras_por_classe, { A: 0, B: 1, C: 1, sem_venda: 2 })
})

test('giro por grupo, por marca e por fornecedor em 30/09/2026: somas dos produtos da lista', async () => {
  // 1426 (PUXADORES, RENNA; fornecedores 900011 e 900008): 20, 20, 11, 11, 11 → médio 14,6, estoque 11, vendeu 9.
  // 1427 (PUXADORES, TOTAL; fornecedor 900011): 10, 10, 10, 4, 4 → médio 7,6, estoque 4, vendeu 6.
  // 1428 (CORREDIÇAS, RENNA; sem fornecedor): 5 nos cinco dias, sem venda.
  await inserirProduto(c, { codigo: '1426', grupo: 'PUXADORES', marca: 'RENNA' })
  await inserirProduto(c, { codigo: '1427', grupo: 'PUXADORES', marca: 'TOTAL' })
  await inserirProduto(c, { codigo: '1428', grupo: 'CORREDIÇAS', marca: 'RENNA' })
  await inserirFornecedor(c, '1426', '900011')
  await inserirFornecedor(c, '1426', '900008')
  await inserirFornecedor(c, '1427', '900011')
  await c.query(
    `insert into kaizen.pessoa (fonte, codigo, nome, ativo) values
       ('meuerp', '900011', 'CRUZEIRO PAPEIS INDUSTRIAIS LTDA', true), ('meuerp', '900008', 'JJI COMERCIO ATACADISTA LTDA', true)`,
  )
  await inserirVirada(c, '1426', '20')
  await inserirVirada(c, '1427', '10')
  await inserirVirada(c, '1428', '5')
  await documento('venda', '2026-09-28', [['1426', 'S', '9', '90.00']])
  await inserirMovimento(c, { produto: '1426', momento: '2026-09-28 10:00:00', saldoAntes: '20', saldoDepois: '11', origemId: '6001' })
  await documento('venda', '2026-09-29', [['1427', 'S', '6', '60.00']])
  await inserirMovimento(c, { produto: '1427', momento: '2026-09-29 10:00:00', saldoAntes: '10', saldoDepois: '4', origemId: '6002' })

  const r = await compras('2026-09-30')
  assert.deepEqual(r.giro_por_grupo, [
    { nome: 'CORREDIÇAS', quantidade: 0, estoque_medio: 5, giro: 0, cobertura_dias: null },
    // giro 15 ÷ 22,2 = 0,6757; cobertura 15 ÷ (15 ÷ 90) = 90.
    { nome: 'PUXADORES', quantidade: 15, estoque_medio: 22.2, giro: 0.6757, cobertura_dias: 90 },
  ])
  assert.deepEqual(r.giro_por_marca, [
    // 9 ÷ 19,6 = 0,4592; 16 ÷ (9 ÷ 90) = 160.
    { nome: 'RENNA', quantidade: 9, estoque_medio: 19.6, giro: 0.4592, cobertura_dias: 160 },
    // 6 ÷ 7,6 = 0,7895; 4 ÷ (6 ÷ 90) = 60.
    { nome: 'TOTAL', quantidade: 6, estoque_medio: 7.6, giro: 0.7895, cobertura_dias: 60 },
  ])
  assert.deepEqual(r.giro_por_fornecedor, [
    { nome: 'CRUZEIRO PAPEIS INDUSTRIAIS LTDA', quantidade: 15, estoque_medio: 22.2, giro: 0.6757, cobertura_dias: 90 },
    // 9 ÷ 14,6 = 0,6164; 11 ÷ (9 ÷ 90) = 110.
    { nome: 'JJI COMERCIO ATACADISTA LTDA', quantidade: 9, estoque_medio: 14.6, giro: 0.6164, cobertura_dias: 110 },
    // O produto sem fornecedor fica numa linha sem nome.
    { nome: null, quantidade: 0, estoque_medio: 5, giro: 0, cobertura_dias: null },
  ])
})

test('dia sem venda e sem estoque, antes e depois da virada: responde sem erro, com zeros e listas vazias', async () => {
  const zeros = {
    abc_valor: { A: { produtos: 0, liquido: 0 }, B: { produtos: 0, liquido: 0 }, C: { produtos: 0, liquido: 0 } },
    abc_quantidade: { A: { produtos: 0, quantidade: 0 }, B: { produtos: 0, quantidade: 0 }, C: { produtos: 0, quantidade: 0 } },
    compras_por_classe: { A: 0, B: 0, C: 0, sem_venda: 0 },
    produtos: [],
    custo_zero: [],
  }
  // Domingo, antes da primeira venda da história.
  assert.deepEqual(await compras('2026-04-05'), {
    periodo: { de: '2026-01-06', ate: '2026-04-05' },
    estoque_conhecido: false,
    ...zeros,
    encalhe: null,
    ruptura: null,
    giro_por_grupo: null,
    giro_por_marca: null,
    giro_por_fornecedor: null,
    estoque_negativo: null,
  })
  // Domingo depois da virada, sem nenhum estoque.
  assert.deepEqual(await compras('2026-09-27'), {
    periodo: { de: '2026-06-30', ate: '2026-09-27' },
    estoque_conhecido: true,
    ...zeros,
    encalhe: { produtos: 0, valor: 0 },
    ruptura: { produtos: 0 },
    giro_por_grupo: [],
    giro_por_marca: [],
    giro_por_fornecedor: [],
    estoque_negativo: [],
  })
})
