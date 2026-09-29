import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import type { Cliente } from './banco.mts'
import { inserirDocumento, inserirItem, inserirNatureza } from './apoio-regras.mts'

// A migração 012: o papel de cada documento (documento_papel), os itens vendidos e devolvidos (venda_item) e as
// tabelas do que o dono digita. Os documentos são montados à mão; cada teste só olha os documentos que ele gravou.
let banco: BancoTeste
let c: Cliente
const natureza: Record<string, number> = {}

before(async () => {
  banco = await criarBancoKaizen()
  c = banco.cliente
  // As naturezas do ERP novo usadas até 28/09, com os flags de lá (spec, seção 2.1).
  natureza['530'] = await inserirNatureza(c, { codigo: '530', descricao: 'PEDIDO DE VENDA', categoria: 'V', estoque: true, financeiro: true })
  natureza['520'] = await inserirNatureza(c, { codigo: '520', descricao: 'ORÇAMENTO', categoria: 'V', estoque: false, financeiro: false })
  natureza['500'] = await inserirNatureza(c, { codigo: '500', descricao: 'PRE-VENDA', categoria: 'V', estoque: true, reserva: true, financeiro: false })
  natureza['5'] = await inserirNatureza(c, { codigo: '5', categoria: 'C', estoque: true, financeiro: true })
  // A troca é de categoria C, como a compra: quem diz que ela é a troca é a configuração do ERP.
  natureza['900'] = await inserirNatureza(c, { codigo: '900', descricao: 'TROCA DE MERCADORIA', categoria: 'C', estoque: true, financeiro: true, troca: true })
  // As três naturezas da Link vêm da migração 011.
  const { rows } = await c.query<{ codigo: string; id: string }>(`select codigo, id from kaizen.natureza where fonte = 'link'`)
  for (const linha of rows) natureza[`link:${linha.codigo}`] = Number(linha.id)
})

after(async () => {
  await banco?.fechar()
})

// O papel de cada documento pelo nome que o teste deu a ele; quem não está na visão sai '(fora da visão)'.
async function papelDe(documentos: Record<string, number>): Promise<Record<string, string | null>> {
  const { rows } = await c.query<{ id: string; papel: string | null }>(
    'select id, papel from kaizen.documento_papel where id = any($1::bigint[])',
    [Object.values(documentos)],
  )
  const papel = new Map(rows.map((linha) => [Number(linha.id), linha.papel]))
  return Object.fromEntries(
    Object.entries(documentos).map(([nome, id]) => [nome, papel.has(id) ? (papel.get(id) ?? null) : '(fora da visão)']),
  )
}

test('com natureza, o papel vem dela: pedido 530 é venda, orçamento 520 e pré-venda 500 são outro, troca 900 é troca, nota 5 é compra', async () => {
  const documentos = {
    pedido: await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 10:19:52' }),
    orcamento: await inserirDocumento(c, { modelo: 'OC', natureza: '520', naturezaId: natureza['520'], criadoEm: '2026-09-28 10:30:00' }),
    preVenda: await inserirDocumento(c, { modelo: 'PV', natureza: '500', naturezaId: natureza['500'], criadoEm: '2026-09-28 10:40:00' }),
    troca: await inserirDocumento(c, { modelo: 'TM', natureza: '900', naturezaId: natureza['900'], criadoEm: '2026-09-28 11:00:00' }),
    nota: await inserirDocumento(c, { modelo: '55', natureza: '5', naturezaId: natureza['5'], criadoEm: '2026-09-28 11:10:00' }),
  }
  // Orçamento e pré-venda são categoria V, mas não mexem no financeiro: por isso não são venda.
  assert.deepEqual(await papelDe(documentos), {
    pedido: 'venda', orcamento: 'outro', preVenda: 'outro', troca: 'troca', nota: 'compra',
  })
})

test('sem natureza, o papel é o tipo traduzido: conta a pagar, sangria (RS e RT), suprimentos, fechamento e o pedido antigo', async () => {
  const documentos = {
    conta: await inserirDocumento(c, { modelo: 'CP', criadoEm: '2026-09-28 00:00:00' }),
    sangriaRS: await inserirDocumento(c, { modelo: 'RS', criadoEm: '2026-09-28 12:00:00' }),
    sangriaRT: await inserirDocumento(c, { modelo: 'RT', criadoEm: '2026-09-28 12:05:00' }),
    suprimento: await inserirDocumento(c, { modelo: 'SF', criadoEm: '2026-09-28 08:00:00' }),
    suprimentoAdicional: await inserirDocumento(c, { modelo: 'SD', criadoEm: '2026-09-28 13:00:00' }),
    fechamento: await inserirDocumento(c, { modelo: 'FC', criadoEm: '2026-09-28 17:55:09' }),
    // Pedido gravado antes da Fase 4, ainda sem natureza: até a leitura da noite regravá-lo, não conta como venda.
    pedidoAntigo: await inserirDocumento(c, { modelo: 'PA', criadoEm: '2026-09-28 09:05:00' }),
  }
  assert.deepEqual(await papelDe(documentos), {
    conta: 'conta_pagar',
    sangriaRS: 'sangria',
    sangriaRT: 'sangria',
    suprimento: 'suprimento',
    suprimentoAdicional: 'suprimento_adicional',
    fechamento: 'fechamento_caixa',
    pedidoAntigo: 'pedido',
  })
})

test('o pedido cancelado (status C) está em documento_negocio, mas fica fora de documento_papel', async () => {
  const cancelado = await inserirDocumento(c, {
    modelo: 'PA', status: 'C', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 14:00:00',
  })
  const { rows } = await c.query('select tipo, situacao from kaizen.documento_negocio where id = $1', [cancelado])
  assert.deepEqual(rows, [{ tipo: 'pedido', situacao: 'cancelado' }])
  assert.deepEqual(await papelDe({ cancelado }), { cancelado: '(fora da visão)' })
})

test('na Link, o pedido é venda, o orçamento é outro e a nota é compra (naturezas da 011); a conta, sem natureza, é conta_pagar', async () => {
  const documentos = {
    // Venda com o caixa ativo: status 'false'.
    pedido: await inserirDocumento(c, {
      fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'pedido', naturezaId: natureza['link:pedido'],
      criadoEm: '2026-06-15 16:20:00', fechadoEm: '2026-06-15 16:25:00',
    }),
    orcamento: await inserirDocumento(c, {
      fonte: 'link', modelo: 'P/false', status: null, natureza: 'orcamento', naturezaId: natureza['link:orcamento'],
      criadoEm: '2026-06-15 11:00:00', fechadoEm: null,
    }),
    nota: await inserirDocumento(c, {
      fonte: 'link', modelo: '55', status: null, natureza: 'nota_entrada', naturezaId: natureza['link:nota_entrada'],
      criadoEm: '2026-08-26 09:00:00',
    }),
    conta: await inserirDocumento(c, { fonte: 'link', modelo: '2.1.2.02', status: null, criadoEm: '2026-09-10 00:00:00', fechadoEm: null }),
  }
  assert.deepEqual(await papelDe(documentos), { pedido: 'venda', orcamento: 'outro', nota: 'compra', conta: 'conta_pagar' })
})

test('o dia do documento é o do fechamento, ou o da criação quando o fechamento está vazio', async () => {
  const fechadoNoDiaSeguinte = await inserirDocumento(c, {
    modelo: 'PA', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 18:40:00', fechadoEm: '2026-09-29 08:03:00',
  })
  const semFechamento = await inserirDocumento(c, {
    fonte: 'link', modelo: '2.1.2.02', status: null, criadoEm: '2026-09-10 00:00:00', fechadoEm: null,
  })
  const { rows } = await c.query(
    'select fonte, dia, papel from kaizen.documento_papel where id = any($1::bigint[]) order by id',
    [[fechadoNoDiaSeguinte, semFechamento]],
  )
  assert.deepEqual(rows, [
    { fonte: 'meuerp', dia: '2026-09-29', papel: 'venda' },
    { fonte: 'link', dia: '2026-09-10', papel: 'conta_pagar' },
  ])
})

test('venda_item: saída da venda é vendido; entrada da venda (Link) e da troca (ERP novo) é devolvido; o resto fica fora', async () => {
  // Pedido criado às 9h58 e fechado às 10h02: a hora da venda é a do fechamento, 10.
  const venda = await inserirDocumento(c, {
    modelo: 'PA', natureza: '530', naturezaId: natureza['530'], pessoa: '484',
    criadoEm: '2026-09-28 09:58:00', fechadoEm: '2026-09-28 10:02:00',
  })
  await inserirItem(c, venda, { produto: '60', sentido: 'S', quantidade: '2', valor: '59.80', vendedor: '1' })
  await inserirItem(c, venda, { produto: '1436', sentido: 'N', quantidade: '1', valor: '120.00', vendedor: '1' }) // fora: sentido N
  await inserirItem(c, venda, { produto: '1436', sentido: 'S', quantidade: '1', valor: '120.00' }) // fora: sem vendedor

  // Na Link, a devolução é item de entrada dentro da própria venda.
  const vendaLink = await inserirDocumento(c, {
    fonte: 'link', modelo: 'A/true', status: 'false', natureza: 'pedido', naturezaId: natureza['link:pedido'], pessoa: '999007',
    criadoEm: '2026-06-15 16:20:00', fechadoEm: '2026-06-15 16:25:00',
  })
  await inserirItem(c, vendaLink, { produto: '60', sentido: 'S', quantidade: '1', valor: '29.90', vendedor: '999005' })
  await inserirItem(c, vendaLink, { produto: '1436', sentido: 'E', quantidade: '1', valor: '118.50', vendedor: '999005' })

  // No ERP novo, a devolução é item de entrada da troca.
  const troca = await inserirDocumento(c, {
    modelo: 'TM', natureza: '900', naturezaId: natureza['900'], pessoa: '484', criadoEm: '2026-09-29 11:30:00',
  })
  await inserirItem(c, troca, { produto: '60', sentido: 'E', quantidade: '1', valor: '29.90', vendedor: '999005' })

  // Fora: o orçamento (papel outro) e o pedido cancelado (fora de documento_papel).
  const orcamento = await inserirDocumento(c, { modelo: 'OC', natureza: '520', naturezaId: natureza['520'], criadoEm: '2026-09-28 15:00:00' })
  await inserirItem(c, orcamento, { produto: '60', sentido: 'S', quantidade: '1', valor: '29.90', vendedor: '1' })
  const cancelado = await inserirDocumento(c, {
    modelo: 'PA', status: 'C', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 15:10:00',
  })
  await inserirItem(c, cancelado, { produto: '60', sentido: 'S', quantidade: '3', valor: '89.70', vendedor: '1' })

  const { rows } = await c.query(
    `select documento, fonte, dia, hora, pessoa, produto, vendedor, quantidade, valor, sentido
     from kaizen.venda_item where documento = any($1::bigint[]) order by documento, produto`,
    [[venda, vendaLink, troca, orcamento, cancelado]],
  )
  assert.deepEqual(rows, [
    {
      documento: String(venda), fonte: 'meuerp', dia: '2026-09-28', hora: 10, pessoa: '484',
      produto: '60', vendedor: '1', quantidade: '2', valor: '59.80', sentido: 'vendido',
    },
    {
      documento: String(vendaLink), fonte: 'link', dia: '2026-06-15', hora: 16, pessoa: '999007',
      produto: '1436', vendedor: '999005', quantidade: '1', valor: '118.50', sentido: 'devolvido',
    },
    {
      documento: String(vendaLink), fonte: 'link', dia: '2026-06-15', hora: 16, pessoa: '999007',
      produto: '60', vendedor: '999005', quantidade: '1', valor: '29.90', sentido: 'vendido',
    },
    {
      documento: String(troca), fonte: 'meuerp', dia: '2026-09-29', hora: 11, pessoa: '484',
      produto: '60', vendedor: '999005', quantidade: '1', valor: '29.90', sentido: 'devolvido',
    },
  ])
})

test('a migração grava como feriado os 3 dias de segunda a sábado sem expediente desde abril', async () => {
  const { rows } = await c.query(
    'select data, extract(isodow from data)::int as dia_da_semana, descricao from kaizen.feriado order by data',
  )
  // dia_da_semana: 1 = segunda … 6 = sábado.
  assert.deepEqual(rows, [
    { data: '2026-05-01', dia_da_semana: 5, descricao: 'Dia do Trabalho; a loja não abriu' },
    { data: '2026-09-07', dia_da_semana: 1, descricao: 'Independência; a loja não abriu' },
    { data: '2026-09-26', dia_da_semana: 6, descricao: 'pausa da virada entre a Link e o ERP novo (inventário)' },
  ])
})

test('a meta da loja é uma por mês: a segunda de outubro é recusada pelo índice, e a de um vendedor no mesmo mês entra', async () => {
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', null, '60000.00')`)
  await assert.rejects(
    c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', null, '65000.00')`),
    (erro) => {
      const { code, constraint } = erro as { code?: string; constraint?: string }
      assert.equal(code, '23505') // chave repetida
      assert.equal(constraint, 'meta_mes_vendedor')
      return true
    },
  )
  await c.query(`insert into kaizen.meta (mes, vendedor, valor) values ('2026-10-01', '1', '30000.00')`)
  const { rows } = await c.query('select mes, vendedor, valor from kaizen.meta order by id')
  assert.deepEqual(rows, [
    { mes: '2026-10-01', vendedor: null, valor: '60000.00' },
    { mes: '2026-10-01', vendedor: '1', valor: '30000.00' },
  ])
})

test('documento_negocio mantém as 18 colunas de antes, na mesma ordem, e ganha no fim as da natureza, vazias sem natureza', async () => {
  const colunas = await c.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'kaizen' and table_name = 'documento_negocio' order by ordinal_position`,
  )
  assert.deepEqual(colunas.rows.map((linha) => linha.column_name), [
    'id', 'fonte', 'origem_tabela', 'origem_id', 'codigo', 'modelo', 'tipo', 'status', 'situacao', 'movimento', 'financeiro',
    'criado_em', 'fechado_em', 'pessoa', 'turno_caixa', 'turno_usuario', 'turno_numero', 'visto_em',
    'natureza', 'natureza_id', 'categoria', 'mexe_estoque', 'mexe_financeiro', 'troca',
  ])
  const comNatureza = await inserirDocumento(c, { modelo: 'PA', natureza: '530', naturezaId: natureza['530'], criadoEm: '2026-09-28 16:00:00' })
  const semNatureza = await inserirDocumento(c, { modelo: 'SF', criadoEm: '2026-09-28 16:05:00' })
  const { rows } = await c.query(
    `select tipo, natureza, natureza_id, categoria, mexe_estoque, mexe_financeiro, troca
     from kaizen.documento_negocio where id = any($1::bigint[]) order by id`,
    [[comNatureza, semNatureza]],
  )
  assert.deepEqual(rows, [
    {
      tipo: 'pedido', natureza: '530', natureza_id: String(natureza['530']), categoria: 'V',
      mexe_estoque: true, mexe_financeiro: true, troca: false,
    },
    {
      tipo: 'suprimento', natureza: null, natureza_id: null, categoria: null,
      mexe_estoque: null, mexe_financeiro: null, troca: null,
    },
  ])
})
