import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

// Cada teste roda o comando (ele é idempotente) e lê o que ficou no Kaizen. Nenhum muda o Kaizen por fora do comando; só
// o da conta 8396 muda a Link falsa, e no fim a devolve como era e roda o comando de novo. As consultas olham só as
// contas, as notas e a bonificação: as vendas e o caixa são das tarefas 4 e 5.

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

async function linhas(sql: string, parametros: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, parametros)).rows
}

// O documento como foi gravado, a pessoa dele no cadastro do Kaizen e o que a visão documento_negocio traduz.
async function documento(origemTabela: string, origemId: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select d.codigo, d.modelo, d.status, d.movimento, d.financeiro, d.criado_em, d.fechado_em, d.pessoa, d.turno_usuario,
            p.fonte as pessoa_fonte, p.nome as pessoa_nome,
            n.tipo, n.situacao, n.movimento as movimento_traduzido, n.financeiro as financeiro_traduzido
       from kaizen.documento d
       join kaizen.documento_negocio n on n.id = d.id
       left join kaizen.pessoa p on p.codigo = d.pessoa
      where d.fonte = 'link' and d.origem_tabela = $1 and d.origem_id = $2`,
    [origemTabela, origemId],
  )
}

// As parcelas de uma conta, com a situação traduzida.
async function parcelas(conta: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select pa.origem_tabela, pa.origem_id, pa.lancado_em, pa.vencimento, pa.valor, pa.status,
            t.valor as status_traduzido, pa.descricao
       from kaizen.parcela pa
       join kaizen.documento d on d.id = pa.documento_id
       left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'status_parcela' and t.codigo = pa.status
      where d.fonte = 'link' and d.origem_tabela = 'pc_lancamento' and d.origem_id = $1
      order by pa.origem_id collate "C"`,
    [conta],
  )
}

// As baixas das parcelas de uma conta, com a forma e a situação traduzidas.
async function baixas(conta: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select pa.origem_id as parcela, b.origem_tabela, b.origem_id, b.pago_em, b.valor,
            b.forma, tf.valor as forma_traduzida, b.status, ts.valor as status_traduzido
       from kaizen.baixa b
       join kaizen.parcela pa on pa.id = b.parcela_id
       join kaizen.documento d on d.id = pa.documento_id
       left join kaizen.traducao tf on tf.fonte = 'link' and tf.campo = 'forma' and tf.codigo = b.forma
       left join kaizen.traducao ts on ts.fonte = 'link' and ts.campo = 'status_baixa' and ts.codigo = b.status
      where d.fonte = 'link' and d.origem_tabela = 'pc_lancamento' and d.origem_id = $1
      order by pa.origem_id collate "C", b.origem_id collate "C"`,
    [conta],
  )
}

test('conta 1396: fornecedor pela compra, parcelas com vencimento e as baixas com o dia do lançamento que baixa, válidas e pelo banco', async () => {
  await traduzirLink(banco.cliente)
  // Na Link, a fonte do lançamento 1396 não tem fornecedor; ela aponta para a compra 5 (id_ped_entrada), que é do
  // fornecedor 7.
  assert.deepEqual(
    await linhas(
      `select f.id_fornecedor as fornecedor_da_fonte, f.id_ped_entrada as compra, fo.fornecedor_codigo as fornecedor_da_compra
         from erp.pc_lancamento_fonte f
         join erp.compra co on co.id_compra = f.id_ped_entrada
         join erp.fornecedor fo on fo.id_fornecedor = co.id_fornecedor
        where f.id_pc_lancamento = 1396`,
    ),
    [{ fornecedor_da_fonte: null, compra: '5', fornecedor_da_compra: '7' }],
  )
  // No Kaizen, a conta fica com o fornecedor 7 pelo CNPJ dele, que é o da pessoa 900007 do ERP novo. A conta de destino
  // das parcelas, 2.1.2.02, é o modelo.
  assert.deepEqual(await documento('pc_lancamento', '1396'), [
    {
      codigo: '1396', modelo: '2.1.2.02', status: null, movimento: null, financeiro: null,
      criado_em: '2026-05-06 21:12:21.765427', fechado_em: null, pessoa: '900007', turno_usuario: null,
      pessoa_fonte: 'meuerp', pessoa_nome: 'FORNECEDOR 7 LTDA',
      tipo: 'conta_pagar', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
  ])
  // Três parcelas de 3.343,88 (10.031,64 no total), lançadas no dia da conta, cada uma com o seu vencimento.
  // As duas primeiras foram baixadas; a de 29/05 está pendente.
  assert.deepEqual(await parcelas('1396'), [
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '1432', lancado_em: '2026-05-06', vencimento: '2026-05-15',
      valor: '3343.88', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '1433', lancado_em: '2026-05-06', vencimento: '2026-05-22',
      valor: '3343.88', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '1434', lancado_em: '2026-05-06', vencimento: '2026-05-29',
      valor: '3343.88', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
  ])
  // Cada baixa é a fonte de outro lançamento (2740 e 2747, os dois de 26/05) que aponta para a parcela: paga no dia desse
  // lançamento, e não no vencimento, pela conta de onde o dinheiro saiu (1.1.1.02.01, o Banco do Brasil).
  assert.deepEqual(await baixas('1396'), [
    {
      parcela: '1432', origem_tabela: 'pc_lancamento_fonte', origem_id: '2740', pago_em: '2026-05-26', valor: '3343.88',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
    {
      parcela: '1433', origem_tabela: 'pc_lancamento_fonte', origem_id: '2747', pago_em: '2026-05-26', valor: '3343.88',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
  ])
})

test('conta 8396: o FORNECEDOR PADRÃO vira link:900001, no documento, no cadastro e na de_para', async () => {
  await traduzirLink(banco.cliente)
  // A fonte do lançamento 8396 aponta direto para o fornecedor 1 da Link, o FORNECEDOR PADRÃO, que não tem CNPJ: nada
  // liga, e o código dele no Kaizen é link: seguido de 1 + 900000.
  assert.deepEqual(await documento('pc_lancamento', '8396'), [
    {
      codigo: '8396', modelo: '2.1.3.07', status: null, movimento: null, financeiro: null,
      criado_em: '2026-08-12 17:02:13.699394', fechado_em: null, pessoa: 'link:900001', turno_usuario: null,
      pessoa_fonte: 'link', pessoa_nome: 'FORNECEDOR PADRÃO',
      tipo: 'conta_pagar', situacao: 'emitido', movimento_traduzido: 'nenhum', financeiro_traduzido: 'paga',
    },
  ])
  // No cadastro do Kaizen, com fonte link e só o que a Link sabe dele: o nome.
  assert.deepEqual(
    await linhas(
      `select codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo from kaizen.pessoa
        where fonte = 'link' and codigo = 'link:900001'`,
    ),
    [{ codigo: 'link:900001', nome: 'FORNECEDOR PADRÃO', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null, ativo: true }],
  )
  // Na de_para, a única falha de pessoa é o FORNECEDOR PADRÃO: os fornecedores 7, 9 e 14, das contas e das notas,
  // ligaram pelo CNPJ; o cliente 1 virou decisão pela resposta do dono (migração 008).
  assert.deepEqual(
    await linhas(
      `select entidade, codigo_origem, codigo_kaizen from kaizen.de_para
        where fonte = 'link' and entidade = 'pessoa' and codigo_kaizen like 'link:%'
        order by codigo_origem collate "C"`,
    ),
    [
      { entidade: 'pessoa', codigo_origem: '900001', codigo_kaizen: 'link:900001' },
    ],
  )
  // Cinco parcelas de 100,00, uma por mês: as de agosto e setembro baixadas, as de outubro a dezembro pendentes.
  assert.deepEqual(await parcelas('8396'), [
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8574', lancado_em: '2026-08-12', vencimento: '2026-08-20',
      valor: '100.00', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8575', lancado_em: '2026-08-12', vencimento: '2026-09-20',
      valor: '100.00', status: 'true', status_traduzido: 'baixada', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8576', lancado_em: '2026-08-12', vencimento: '2026-10-20',
      valor: '100.00', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8577', lancado_em: '2026-08-12', vencimento: '2026-11-20',
      valor: '100.00', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
    {
      origem_tabela: 'pc_lancamento_parcela', origem_id: '8578', lancado_em: '2026-08-12', vencimento: '2026-12-20',
      valor: '100.00', status: 'false', status_traduzido: 'pendente', descricao: null,
    },
  ])
  // As duas baixas: pelos lançamentos 9768 (31/08) e 11284 (22/09), pelo banco.
  assert.deepEqual(await baixas('8396'), [
    {
      parcela: '8574', origem_tabela: 'pc_lancamento_fonte', origem_id: '9772', pago_em: '2026-08-31', valor: '100.00',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
    {
      parcela: '8575', origem_tabela: 'pc_lancamento_fonte', origem_id: '11288', pago_em: '2026-09-22', valor: '100.00',
      forma: '1.1.1.02.01', forma_traduzida: 'banco', status: 'true', status_traduzido: 'valida',
    },
  ])
  // Na Link falsa, a fonte 8400 da conta perde o fornecedor, e a parcela de dezembro ganha o vencimento 0001-01-01.
  await falsa.executar('update erp.pc_lancamento_fonte set id_fornecedor = null where id_pc_lancamento_fonte = 8400')
  await falsa.executar(`update erp.pc_lancamento_parcela set data_vencimento = '0001-01-01' where id_pc_lancamento_parcela = 8578`)
  try {
    await traduzirLink(banco.cliente)
    // Conta sem fornecedor fica sem pessoa, e o FORNECEDOR PADRÃO, que nenhum documento cita mais, sai da de_para.
    assert.deepEqual(
      await linhas(`select pessoa from kaizen.documento where fonte = 'link' and origem_tabela = 'pc_lancamento' and origem_id = '8396'`),
      [{ pessoa: null }],
    )
    assert.deepEqual(await linhas(`select entidade, codigo_kaizen from kaizen.de_para where fonte = 'link' and codigo_origem = '900001'`), [])
    // O vencimento 0001-01-01 vira vazio.
    assert.deepEqual(
      await linhas(`select origem_id, vencimento from kaizen.parcela where origem_tabela = 'pc_lancamento_parcela' and origem_id = '8578'`),
      [{ origem_id: '8578', vencimento: null }],
    )
  } finally {
    await falsa.executar('update erp.pc_lancamento_fonte set id_fornecedor = 1 where id_pc_lancamento_fonte = 8400')
    await falsa.executar(`update erp.pc_lancamento_parcela set data_vencimento = '2026-12-20' where id_pc_lancamento_parcela = 8578`)
    await traduzirLink(banco.cliente)
  }
})

test('a bonificação 790 (conta 2.1.2.03) não entra como conta', async () => {
  const contagens = await traduzirLink(banco.cliente)
  // Na Link, o lançamento 790 tem a forma de uma conta: sem caixa, com uma parcela positiva numa conta 2.x. Mas a conta
  // é a 2.1.2.03, a dos vales e bonificações: é crédito dado ao cliente, e crédito de cliente não é conta a pagar.
  assert.deepEqual(
    await linhas(
      `select l.id_caixa, pp.id_pc_lancamento_parcela as parcela, pp.pc_codigo_destino, pp.destino_positiva, pp.valor
         from erp.pc_lancamento l
         join erp.pc_lancamento_parcela pp on pp.id_pc_lancamento = l.id_pc_lancamento
        where l.id_pc_lancamento = 790`,
    ),
    [{ id_caixa: null, parcela: '814', pc_codigo_destino: '2.1.2.03', destino_positiva: true, valor: '60.00' }],
  )
  // Os 10 lançamentos sem caixa dos casos: viram documento as 2 contas, as 2 sangrias e o suprimento. A bonificação não
  // vira, nem os 4 lançamentos que pagam parcelas das contas (2740, 2747, 9768 e 11284), que entram como baixas.
  assert.deepEqual(
    await linhas(
      `select l.id_pc_lancamento as lancamento, n.tipo
         from erp.pc_lancamento l
         left join kaizen.documento_negocio n
           on n.fonte = 'link' and n.origem_tabela = 'pc_lancamento' and n.origem_id = l.id_pc_lancamento::text
        where l.id_caixa is null
        order by l.id_pc_lancamento`,
    ),
    [
      { lancamento: '12', tipo: 'suprimento' },
      { lancamento: '31', tipo: 'sangria' },
      { lancamento: '91', tipo: 'sangria' },
      { lancamento: '790', tipo: null },
      { lancamento: '1396', tipo: 'conta_pagar' },
      { lancamento: '2740', tipo: null },
      { lancamento: '2747', tipo: null },
      { lancamento: '8396', tipo: 'conta_pagar' },
      { lancamento: '9768', tipo: null },
      { lancamento: '11284', tipo: null },
    ],
  )
  // A parcela 814 da bonificação não vira parcela, e o uso dela (a fonte 791, que aponta para a 814) não vira baixa: a
  // rodada grava só as 8 parcelas e as 4 baixas das duas contas. O uso entra como pagamento da venda 358, na forma troca.
  assert.equal(contagens.parcelas, '8')
  assert.equal(contagens.baixas, '4')
  assert.deepEqual(
    await linhas(
      `select d.origem_id as documento, p.origem_tabela, p.origem_id, p.forma, t.valor as forma_traduzida, p.valor
         from kaizen.documento_pagamento p
         join kaizen.documento d on d.id = p.documento_id
         left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = p.forma
        where d.fonte = 'link' and p.origem_tabela = 'pc_lancamento_fonte' and p.origem_id = '791'`,
    ),
    [{ documento: '358', origem_tabela: 'pc_lancamento_fonte', origem_id: '791', forma: '2.1.2.03', forma_traduzida: 'troca', valor: '60.00' }],
  )
})

test('nota 15 com itens de entrada da compra e o fornecedor ligado, e nota 58 com itens de sentido N', async () => {
  await traduzirLink(banco.cliente)
  // O fornecedor da nota é o da própria nota, ligado pelo CNPJ: o 9 da Link é a pessoa 900009 do ERP novo, e o 14 é a
  // 900014. A nota não tem hora de fechamento na Link; ela é criada e fechada no mesmo momento.
  assert.deepEqual(await documento('nota_entrada', '15'), [
    {
      codigo: '15', modelo: '55', status: null, movimento: null, financeiro: null,
      criado_em: '2026-05-20 15:38:20.752567', fechado_em: '2026-05-20 15:38:20.752567', pessoa: '900009', turno_usuario: null,
      pessoa_fonte: 'meuerp', pessoa_nome: 'FORNECEDOR 9 LTDA',
      tipo: 'nota_entrada', situacao: 'emitido', movimento_traduzido: 'entrada', financeiro_traduzido: 'nenhum',
    },
  ])
  assert.deepEqual(await documento('nota_entrada', '58'), [
    {
      codigo: '58', modelo: '55', status: null, movimento: null, financeiro: null,
      criado_em: '2026-09-22 10:09:56.114565', fechado_em: '2026-09-22 10:09:56.114565', pessoa: '900014', turno_usuario: null,
      pessoa_fonte: 'meuerp', pessoa_nome: 'FORNECEDOR 14 LTDA',
      tipo: 'nota_entrada', situacao: 'emitido', movimento_traduzido: 'entrada', financeiro_traduzido: 'nenhum',
    },
  ])
  // Os itens vêm da compra de cada nota (a compra 12 é da nota 15; a 50, da nota 58), com a quantidade já na unidade do
  // estoque, sem valor e sem vendedor, e o produto do ERP novo pelo código. A entrada da compra 12 foi concluída: sentido
  // E. A da compra 50 está vazia na Link: sentido N, o item não mexeu no estoque.
  assert.deepEqual(
    await linhas(
      `select d.origem_id as nota, i.origem_tabela, i.origem_id, i.sentido, t.valor as sentido_traduzido,
              i.produto, pr.fonte as produto_fonte, i.quantidade, i.valor_liquido, i.vendedor
         from kaizen.documento_item i
         join kaizen.documento d on d.id = i.documento_id
         left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'sentido' and t.codigo = i.sentido
         left join kaizen.produto pr on pr.codigo = i.produto
        where d.fonte = 'link' and d.origem_tabela = 'nota_entrada'
        order by d.origem_id collate "C", i.origem_id collate "C"`,
    ),
    [
      {
        nota: '15', origem_tabela: 'compra_item', origem_id: '106', sentido: 'E', sentido_traduzido: 'entrada',
        produto: '2889', produto_fonte: 'meuerp', quantidade: '40', valor_liquido: null, vendedor: null,
      },
      {
        nota: '58', origem_tabela: 'compra_item', origem_id: '521', sentido: 'N', sentido_traduzido: 'nenhum',
        produto: '5262', produto_fonte: 'meuerp', quantidade: '5', valor_liquido: null, vendedor: null,
      },
    ],
  )
})
