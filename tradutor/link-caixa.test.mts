import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

let banco: BancoTeste
let falsa: LinkFalsa
before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
})
after(async () => {
  await falsa.fechar()
  await banco.fechar()
})

// Os documentos da Link gravados no Kaizen, com as colunas cruas e a tradução da visão documento_negocio.
async function documentos(onde: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await banco.cliente.query(`
    select d.origem_tabela, d.origem_id, d.codigo, d.modelo, d.status, d.movimento, d.financeiro, d.criado_em, d.fechado_em,
           d.pessoa, d.turno_caixa, d.turno_usuario, d.turno_numero,
           n.tipo, n.situacao, n.movimento as movimento_traduzido, n.financeiro as financeiro_traduzido
      from kaizen.documento d
      join kaizen.documento_negocio n on n.id = d.id
     where d.fonte = 'link' and ${onde}
     order by d.criado_em`)
  return rows
}

// As linhas de conferência dos fechamentos da Link, com a forma traduzida.
async function conferencias(onde: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await banco.cliente.query(`
    select c.origem_tabela, c.origem_id, c.forma, t.valor as forma_traduzida, c.calculado, c.informado
      from kaizen.conferencia_caixa c
      join kaizen.documento d on d.id = c.documento_id
      left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = c.forma
     where d.fonte = 'link' and d.origem_tabela = 'caixa_fechamento' and ${onde}
     order by c.origem_id collate "C"`)
  return rows
}

test('fechamento 7: uma linha de conferência por forma, com calculado e informado, e o turno com o usuário do ERP novo', async () => {
  await traduzirLink(banco.cliente)
  assert.deepEqual(await documentos(`d.origem_tabela = 'caixa_fechamento' and d.origem_id = '7'`), [
    {
      origem_tabela: 'caixa_fechamento', origem_id: '7', codigo: '7', modelo: 'caixa_fechamento', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 13:42:21.195448', fechado_em: '2026-04-13 17:59:58.613109',
      pessoa: null, turno_caixa: null, turno_usuario: 18152, turno_numero: null,
      tipo: 'fechamento_caixa', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
  ])
  // O operador do turno 7 é o usuário 6 da Link (Caio), ligado pelo primeiro nome ao funcionário 1 do ERP novo:
  // o turno_usuario é o usuário desse funcionário no ERP novo, não o código da Link.
  const operador = await banco.cliente.query(`
    select f.codigo, f.nome
      from kaizen.documento d
      join kaizen.funcionario f on f.fonte = 'meuerp' and f.usuario = d.turno_usuario
     where d.fonte = 'link' and d.origem_tabela = 'caixa_fechamento' and d.origem_id = '7'`)
  assert.deepEqual(operador.rows, [{ codigo: '1', nome: 'Caio Mendes Rocha' }])
  // Quatro formas, na forma do ERP novo (a nota promissória é troca). Cheque e boleto são zero no calculado e no
  // informado, e não entram. O pix fica como a Link gravou: 922,38 calculados, 817,38 informados.
  assert.deepEqual(await conferencias(`d.origem_id = '7'`), [
    { origem_tabela: 'caixa_fechamento', origem_id: '7/cartao', forma: 'cartao', forma_traduzida: 'cartao', calculado: '503.15', informado: '503.15' },
    { origem_tabela: 'caixa_fechamento', origem_id: '7/dinheiro', forma: 'dinheiro', forma_traduzida: 'dinheiro', calculado: '206.50', informado: '206.50' },
    { origem_tabela: 'caixa_fechamento', origem_id: '7/nota_promissoria', forma: 'nota_promissoria', forma_traduzida: 'troca', calculado: '0.00', informado: '0.00' },
    { origem_tabela: 'caixa_fechamento', origem_id: '7/pix', forma: 'pix', forma_traduzida: 'pix', calculado: '922.38', informado: '817.38' },
  ])
  // Com R$ 10 de cheque calculado no fechamento 7, o cheque entra, com o informado zero como a Link gravou; o boleto,
  // ainda zero nos dois, continua fora.
  await falsa.executar('update erp.caixa_fechamento set cheque = 10 where id_caixa_fechamento = 7')
  try {
    await traduzirLink(banco.cliente)
    assert.deepEqual(await conferencias(`c.origem_id in ('7/cheque', '7/boleto')`), [
      { origem_tabela: 'caixa_fechamento', origem_id: '7/cheque', forma: 'cheque', forma_traduzida: 'cheque', calculado: '10', informado: '0.00' },
    ])
  } finally {
    await falsa.executar('update erp.caixa_fechamento set cheque = 0.00 where id_caixa_fechamento = 7')
    await traduzirLink(banco.cliente)
  }
  // Funcionário do ERP novo sem usuário (zero): o turno fica vazio, e não zero.
  await banco.cliente.query(`update kaizen.funcionario set usuario = 0 where fonte = 'meuerp' and codigo = '1'`)
  try {
    await traduzirLink(banco.cliente)
    const semUsuario = await banco.cliente.query(
      `select turno_usuario from kaizen.documento where fonte = 'link' and origem_tabela = 'caixa_fechamento' and origem_id = '7'`,
    )
    assert.deepEqual(semUsuario.rows, [{ turno_usuario: null }])
  } finally {
    await banco.cliente.query(`update kaizen.funcionario set usuario = 18152 where fonte = 'meuerp' and codigo = '1'`)
    await traduzirLink(banco.cliente)
  }
})

test('fechamento 1 com informado vazio e operador Sistema, e o turno aberto 3 sem fechado_em', async () => {
  await traduzirLink(banco.cliente)
  // O operador do fechamento 1 é o usuário 1 da Link, o Sistema, que não existe no ERP novo.
  const operador = await banco.cliente.query(`
    select u.id_usuario, u.nome
      from erp.caixa_fechamento f
      join erp.usuario u on u.id_usuario = f.id_usuario
     where f.id_caixa_fechamento = 1`)
  assert.deepEqual(operador.rows, [{ id_usuario: '1', nome: 'Sistema' }])
  // A ligação do Sistema falha, e o turno fica sem usuário: não vira o 18152 do funcionário 1 do ERP novo (o Caio).
  // O turno 3 é da Débora (usuário 5 da Link, 999005 no ERP novo, usuário 18153), e ainda estava aberto na cópia.
  assert.deepEqual(await documentos(`d.origem_tabela = 'caixa_fechamento' and d.origem_id in ('1', '3')`), [
    {
      origem_tabela: 'caixa_fechamento', origem_id: '1', codigo: '1', modelo: 'caixa_fechamento', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-11 18:53:16.892942', fechado_em: '2026-04-11 19:28:54.133281',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'fechamento_caixa', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
    {
      origem_tabela: 'caixa_fechamento', origem_id: '3', codigo: '3', modelo: 'caixa_fechamento', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 08:10:56.864944', fechado_em: null,
      pessoa: null, turno_caixa: null, turno_usuario: 18153, turno_numero: null,
      tipo: 'fechamento_caixa', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
  ])
  // Nos dois, as quatro formas com o calculado zero e o informado vazio (e não zero), como a Link gravou.
  const formas = [['cartao', 'cartao'], ['dinheiro', 'dinheiro'], ['nota_promissoria', 'troca'], ['pix', 'pix']]
  const vazias = (fechamento: string) =>
    formas.map(([forma, traduzida]) => ({
      origem_tabela: 'caixa_fechamento', origem_id: `${fechamento}/${forma}`, forma, forma_traduzida: traduzida,
      calculado: '0.00', informado: null,
    }))
  assert.deepEqual(await conferencias(`d.origem_id in ('1', '3')`), [...vazias('1'), ...vazias('3')])
})

test('sangria das duas orientações e suprimento: tipo, financeiro e um pagamento em dinheiro do valor do lançamento', async () => {
  await traduzirLink(banco.cliente)
  // Só os lançamentos com obs Sangria ou Suprimento: os da venda, a bonificação 790 e as contas não viram sangria.
  // O modelo cru é a obs e a orientação; a sangria paga, nas duas orientações, e o suprimento não tem financeiro.
  assert.deepEqual(await documentos(`n.tipo in ('sangria', 'suprimento')`), [
    {
      origem_tabela: 'pc_lancamento', origem_id: '12', codigo: '12', modelo: 'Suprimento/true', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 08:33:04.221284', fechado_em: '2026-04-13 08:33:04.221284',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'suprimento', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'nenhum',
    },
    {
      origem_tabela: 'pc_lancamento', origem_id: '31', codigo: '31', modelo: 'Sangria/false', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 10:06:59.277768', fechado_em: '2026-04-13 10:06:59.277768',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'sangria', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
    {
      origem_tabela: 'pc_lancamento', origem_id: '91', codigo: '91', modelo: 'Sangria/true', status: null,
      movimento: null, financeiro: null, criado_em: '2026-04-13 16:37:51.594194', fechado_em: '2026-04-13 16:37:51.594194',
      pessoa: null, turno_caixa: null, turno_usuario: null, turno_numero: null,
      tipo: 'sangria', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
  ])
  // Um pagamento por lançamento, o próprio lançamento, em dinheiro (1.1.1.01, o caixa), com o valor dele.
  const pagamentos = await banco.cliente.query(`
    select d.origem_id as documento, p.origem_tabela, p.origem_id, p.forma, t.valor as forma_traduzida, p.valor
      from kaizen.documento_pagamento p
      join kaizen.documento d on d.id = p.documento_id
      join kaizen.documento_negocio n on n.id = d.id
      left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = p.forma
     where d.fonte = 'link' and n.tipo in ('sangria', 'suprimento')
     order by d.criado_em`)
  assert.deepEqual(pagamentos.rows, [
    { documento: '12', origem_tabela: 'pc_lancamento', origem_id: '12', forma: '1.1.1.01', forma_traduzida: 'dinheiro', valor: '171.50' },
    { documento: '31', origem_tabela: 'pc_lancamento', origem_id: '31', forma: '1.1.1.01', forma_traduzida: 'dinheiro', valor: '6.00' },
    { documento: '91', origem_tabela: 'pc_lancamento', origem_id: '91', forma: '1.1.1.01', forma_traduzida: 'dinheiro', valor: '50.00' },
  ])
})
