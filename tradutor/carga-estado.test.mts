import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { emTransacao } from './banco.mts'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos, podeApagar, apagarSumidos, gravarEstoque, gravarCadastros } from './carga.mts'
import type { Apagado, CargaEstoque, CargaCadastros } from './carga.mts'

// Formatos do contrato (seção 6): inteiros crus, valores em texto, datas como o ERP escreve dentro do JSON.
type ItemErp = { oid: number; produto: number; quantidade: string | null; valor_liquido: string | null; vendedor: number | null }
type PagamentoErp = { oid: number; forma: number; valor: string }
type BaixaErp = { oid: number; pago_em: string | null; valor: string; forma: number | null; status: string | null }
type ParcelaErp = {
  oid: number; lancado_em: string | null; vencimento: string | null; valor: string
  status: string | null; descricao: string | null; baixas: BaixaErp[]
}
type ConferenciaErp = { oid: number; forma: number; calculado: string | null; informado: string | null }
type DocumentoErp = {
  oid: number; codigo: number; modelo: string; status: string | null; movimento: string | null; financeiro: string | null
  criado_em: string; fechado_em: string | null; pessoa: number | null
  turno_caixa: number | null; turno_usuario: number | null; turno_numero: number | null
  itens: ItemErp[]; pagamentos: PagamentoErp[]; parcelas: ParcelaErp[]; conferencia: ConferenciaErp[]
  conferencia_abaixo_corte: number
}
type MovimentoErp = {
  oid: number; produto: number; documento: number | null; momento: string
  saldo_antes: string | null; saldo_depois: string | null
}
type FotoErp = { produto: number; quantidade: string | null }
type ProdutoErp = {
  codigo: number; descricao: string | null; grupo: string | null; secao: string | null; subgrupo: string | null
  marca: string | null; custo: string | null; inativo: string | null
}
type PessoaErp = {
  codigo: number; nome: string | null; sobrenome: string | null; cpf_cnpj: string | null; bairro: string | null
  municipio: string | null; ibge: number | null; uf: string | null; inativo: string | null
}
type FuncionarioErp = { codigo: number; nome: string | null; sobrenome: string | null; usuario: number | null; tipo: string | null; inativo: string | null }
type FornecedorErp = { produto: number; fornecedor: number }
type CadastrosErp = { produtos: ProdutoErp[]; pessoas: PessoaErp[]; funcionarios: FuncionarioErp[]; fornecedores: FornecedorErp[] }

function documento(oid: number, codigo: number, resto: Partial<DocumentoErp> = {}): DocumentoErp {
  return {
    oid, codigo, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29T10:15:00', fechado_em: '2026-09-29T10:20:00', pessoa: 999007,
    turno_caixa: 1, turno_usuario: 18152, turno_numero: 1,
    itens: [], pagamentos: [], parcelas: [], conferencia: [], conferencia_abaixo_corte: 0,
    ...resto,
  }
}

function item(oid: number, produto: number, valor: string, vendedor: number | null): ItemErp {
  return { oid, produto, quantidade: '1.000000', valor_liquido: valor, vendedor }
}

function movimento(oid: number, produto: number, saldoAntes: string, saldoDepois: string): MovimentoErp {
  return { oid, produto, documento: 116, momento: '2026-09-28T14:00:03.123456', saldo_antes: saldoAntes, saldo_depois: saldoDepois }
}

function produto(codigo: number, resto: Partial<ProdutoErp> = {}): ProdutoErp {
  return {
    codigo, descricao: 'CANECA', grupo: 'CASA', secao: 'COZINHA', subgrupo: 'LOUCA', marca: 'SEM MARCA',
    custo: '12.345600', inativo: 'F', ...resto,
  }
}

function pessoa(codigo: number, resto: Partial<PessoaErp> = {}): PessoaErp {
  return {
    codigo, nome: 'CLIENTE', sobrenome: 'TESTE', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null,
    inativo: 'F', ...resto,
  }
}

function funcionario(codigo: number, resto: Partial<FuncionarioErp> = {}): FuncionarioErp {
  return { codigo, nome: 'Ana', sobrenome: 'Teste', usuario: 18152, tipo: 'V', inativo: 'F', ...resto }
}

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  for (const tabela of ['documento', 'estoque_movimento', 'estoque_atual', 'produto', 'produto_fornecedor', 'pessoa', 'funcionario']) {
    await banco.cliente.query(`delete from kaizen.${tabela}`)
  }
})

async function linhas(sql: string, valores: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, valores)).rows
}

async function carregarDocumentos(docs: DocumentoErp[]): Promise<void> {
  await emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify(docs)])
    await gravarDocumentos(banco.cliente)
  })
}

async function lerEApagar(docs: DocumentoErp[], vivos: number[]): Promise<Apagado[]> {
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify(docs)])
    await colocarEntrada(banco.cliente, 'vivos', [JSON.stringify(vivos)])
    await gravarDocumentos(banco.cliente)
    return apagarSumidos(banco.cliente)
  })
}

async function carregarEstoque(movimentos: MovimentoErp[], foto: FotoErp[], completo: boolean): Promise<CargaEstoque> {
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'estoque', [JSON.stringify({ movimentos, foto })])
    return gravarEstoque(banco.cliente, completo)
  })
}

async function carregarCadastros(cadastros: Partial<CadastrosErp>): Promise<CargaCadastros> {
  const completo: CadastrosErp = { produtos: [], pessoas: [], funcionarios: [], fornecedores: [], ...cadastros }
  return emTransacao(banco.cliente, async () => {
    await colocarEntrada(banco.cliente, 'cadastros', [JSON.stringify(completo)])
    return gravarCadastros(banco.cliente)
  })
}

test('podeApagar só recusa lista vazia, ou menor que a metade com 20 ou mais documentos no Kaizen', () => {
  const recusa = { ok: false, motivo: 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado' }
  const casos: Array<[number, number, boolean]> = [
    [0, 0, true],
    [0, 5, true],
    [3, 1, true],
    [3, 0, false],
    [19, 1, true],
    [20, 10, true],
    [20, 9, false],
    [25, 13, true],
    [25, 12, false],
    [25, 0, false],
  ]
  for (const [noKaizen, vivos, pode] of casos) {
    assert.deepEqual(podeApagar(noKaizen, vivos), pode ? { ok: true } : recusa, `${noKaizen} no Kaizen e ${vivos} vivos`)
  }
})

test('apagarSumidos apaga só o documento do ERP novo que sumiu e devolve o que o aviso precisa', async () => {
  await carregarDocumentos([
    documento(185, 123, {
      itens: [item(1873, 2138, '100.000000', 1), item(1874, 5278, '25.000000', 1), item(1875, 60, '25.004999', 999005)],
    }),
    documento(186, 124, { itens: [item(1876, 60, '10.00', 1)], pagamentos: [{ oid: 1, forma: 2, valor: '10.00' }] }),
    documento(187, 125, { itens: [item(1877, 61, '12.00', 1)] }),
    documento(188, 98, {
      modelo: 'FC', movimento: 'N', financeiro: 'N', criado_em: '2026-09-29T18:00:00',
      conferencia: [{ oid: 31, forma: 1, calculado: '58.00', informado: '20.00' }],
    }),
    documento(189, 63, {
      modelo: 'TM', movimento: 'E', financeiro: 'P', criado_em: '2026-09-29T15:30:00',
      itens: [item(1878, 1362, '18.00', 777)],
      pagamentos: [{ oid: 2, forma: 1, valor: '18.00' }],
      parcelas: [{
        oid: 1, lancado_em: '2026-09-29T15:30:00', vencimento: '2026-09-29T00:00:00', valor: '18.00',
        status: 'B', descricao: null,
        baixas: [{ oid: 1, pago_em: '2026-09-29T15:30:00', valor: '18.00', forma: 1, status: 'E' }],
      }],
    }),
    documento(190, 140, { modelo: 'AM', movimento: 'N', financeiro: 'N', criado_em: '2026-09-29T16:00:00' }),
  ])
  await banco.cliente.query(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, criado_em)
     values ('link', 'negociacao', '185', '9001', 'V', '2026-04-10 10:00:00')`,
  )
  await banco.cliente.query(
    `insert into kaizen.funcionario (fonte, codigo, nome, ativo) values
       ('meuerp', '1', 'Ana Teste', true), ('meuerp', '999005', 'Bruno Teste', true), ('link', '777', 'Da Link', true)`,
  )
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento)
     values ('meuerp', 'mercadoria_estoque_historico', '1848', '2138', '123', '2026-09-29 10:15:00')`,
  )

  // 186 continua vivo no ERP; 187 não veio na lista, mas foi lido nesta execução
  const apagados = await lerEApagar([documento(187, 125, { itens: [item(1877, 61, '12.00', 1)] })], [186])

  assert.deepEqual(apagados, [
    { origem_id: '185', codigo: '123', tipo: 'pedido', criado_em: '2026-09-29 10:15:00', valor: '150.00', vendedores: 'Ana Teste, Bruno Teste' },
    { origem_id: '188', codigo: '98', tipo: 'fechamento_caixa', criado_em: '2026-09-29 18:00:00', valor: '0.00', vendedores: null },
    { origem_id: '189', codigo: '63', tipo: 'troca', criado_em: '2026-09-29 15:30:00', valor: '18.00', vendedores: '777' },
    { origem_id: '190', codigo: '140', tipo: null, criado_em: '2026-09-29 16:00:00', valor: '0.00', vendedores: null },
  ])
  assert.deepEqual(await linhas('select fonte, origem_id from kaizen.documento order by fonte, origem_id'), [
    { fonte: 'link', origem_id: '185' },
    { fonte: 'meuerp', origem_id: '186' },
    { fonte: 'meuerp', origem_id: '187' },
  ])
  assert.deepEqual(await linhas(
    `select (select count(*) from kaizen.documento_item) as itens,
            (select count(*) from kaizen.documento_pagamento) as pagamentos,
            (select count(*) from kaizen.parcela) as parcelas,
            (select count(*) from kaizen.baixa) as baixas,
            (select count(*) from kaizen.conferencia_caixa) as conferencias,
            (select count(*) from kaizen.estoque_movimento) as movimentos`,
  ), [{ itens: '2', pagamentos: '1', parcelas: '0', baixas: '0', conferencias: '0', movimentos: '1' }])
})

test('apagarSumidos não apaga nada quando todos continuam vivos', async () => {
  await carregarDocumentos([documento(185, 123), documento(186, 124)])
  assert.deepEqual(await lerEApagar([], [185, 186]), [])
  assert.deepEqual(await linhas('select count(*) as documentos from kaizen.documento'), [{ documentos: '2' }])
})

test('gravarEstoque grava os movimentos e, na releitura, atualiza sem mudar visto_em', async () => {
  assert.deepEqual(
    await carregarEstoque([movimento(1848, 60, '0.000000', '-1.000000'), movimento(1849, 2138, '0.000000', '-10.000000')], [], false),
    { movimentos: 2, foto: 0, sumidos: [] },
  )
  assert.deepEqual(await linhas(
    `select fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois
       from kaizen.estoque_movimento where origem_id = '1848'`,
  ), [{
    fonte: 'meuerp', origem_tabela: 'mercadoria_estoque_historico', origem_id: '1848', produto: '60', documento: '116',
    momento: '2026-09-28 14:00:03.123456', saldo_antes: '0.000000', saldo_depois: '-1.000000',
  }])
  const [antes] = await linhas(`select visto_em from kaizen.estoque_movimento where origem_id = '1848'`)

  assert.deepEqual(
    await carregarEstoque([movimento(1848, 60, '0.000000', '-2.000000'), movimento(1850, 60, '-2.000000', '-3.000000')], [], false),
    { movimentos: 2, foto: 0, sumidos: [] },
  )
  assert.deepEqual(await linhas('select origem_id, saldo_depois from kaizen.estoque_movimento order by origem_id'), [
    { origem_id: '1848', saldo_depois: '-2.000000' },
    { origem_id: '1849', saldo_depois: '-10.000000' },
    { origem_id: '1850', saldo_depois: '-3.000000' },
  ])
  const [depois] = await linhas(`select visto_em from kaizen.estoque_movimento where origem_id = '1848'`)
  assert.equal(depois.visto_em, antes.visto_em)
})

test('gravarEstoque troca inteira a foto do ERP novo e não mexe na da Link', async () => {
  await banco.cliente.query(`insert into kaizen.estoque_atual (fonte, produto, quantidade) values ('link', '60', 7)`)
  assert.deepEqual(
    await carregarEstoque([], [{ produto: 60, quantidade: '3.000000' }, { produto: 1362, quantidade: '1.000000' }], false),
    { movimentos: 0, foto: 2, sumidos: [] },
  )
  assert.deepEqual(
    await carregarEstoque([], [
      { produto: 60, quantidade: '2.000000' }, { produto: 2138, quantidade: '-10.000000' }, { produto: 5278, quantidade: null },
    ], false),
    { movimentos: 0, foto: 3, sumidos: [] },
  )
  assert.deepEqual(await linhas('select fonte, produto, quantidade from kaizen.estoque_atual order by fonte, produto'), [
    { fonte: 'link', produto: '60', quantidade: '7' },
    { fonte: 'meuerp', produto: '2138', quantidade: '-10.000000' },
    { fonte: 'meuerp', produto: '5278', quantidade: null },
    { fonte: 'meuerp', produto: '60', quantidade: '2.000000' },
  ])
})

test('na leitura completa, o movimento do ERP novo que não voltou sai e é devolvido', async () => {
  await banco.cliente.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, momento)
     values ('link', 'mercadoria_estoque_historico', '1849', '60', '2026-09-28 10:00:00')`,
  )
  await carregarEstoque([
    movimento(1848, 60, '0.000000', '-1.000000'), movimento(1849, 2138, '0.000000', '-10.000000'), movimento(1850, 60, '-1.000000', '-2.000000'),
  ], [], false)
  assert.deepEqual(
    await carregarEstoque([movimento(1848, 60, '0.000000', '-1.000000'), movimento(1850, 60, '-1.000000', '-2.000000')], [], true),
    { movimentos: 2, foto: 0, sumidos: [{ origem_id: '1849', produto: '2138' }] },
  )
  assert.deepEqual(await linhas('select fonte, origem_id from kaizen.estoque_movimento order by fonte, origem_id'), [
    { fonte: 'link', origem_id: '1849' },
    { fonte: 'meuerp', origem_id: '1848' },
    { fonte: 'meuerp', origem_id: '1850' },
  ])
})

test('gravarCadastros junta nome e sobrenome sem espaço sobrando e grava o resto como veio', async () => {
  assert.deepEqual(await carregarCadastros({
    produtos: [produto(60)],
    pessoas: [
      pessoa(999007, { nome: 'CONSUMIDOR', sobrenome: 'FINAL' }),
      pessoa(10, { nome: '  Maria ', sobrenome: null, cpf_cnpj: '00000000000', bairro: 'Centro', municipio: 'Fortaleza', ibge: 2304400, uf: 'CE' }),
      pessoa(11, { nome: 'Loja Exemplo', sobrenome: '' }),
      pessoa(12, { nome: null, sobrenome: ' Souza ' }),
      pessoa(13, { nome: '', sobrenome: null }),
    ],
    funcionarios: [funcionario(1, { nome: 'Ana ', sobrenome: 'Teste' })],
    fornecedores: [{ produto: 60, fornecedor: 500 }],
  }), { produtos: 1, pessoas: 5, funcionarios: 1, fornecedores: 1 })

  assert.deepEqual(await linhas(
    'select codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf from kaizen.pessoa order by codigo::bigint',
  ), [
    { codigo: '10', nome: 'Maria', cpf_cnpj: '00000000000', bairro: 'Centro', municipio: 'Fortaleza', ibge: '2304400', uf: 'CE' },
    { codigo: '11', nome: 'Loja Exemplo', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
    { codigo: '12', nome: 'Souza', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
    { codigo: '13', nome: null, cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
    { codigo: '999007', nome: 'CONSUMIDOR FINAL', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null },
  ])
  assert.deepEqual(await linhas('select fonte, codigo, nome, usuario, tipo from kaizen.funcionario'), [
    { fonte: 'meuerp', codigo: '1', nome: 'Ana Teste', usuario: 18152, tipo: 'V' },
  ])
  assert.deepEqual(await linhas('select fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo from kaizen.produto'), [
    { fonte: 'meuerp', codigo: '60', descricao: 'CANECA', grupo: 'CASA', secao: 'COZINHA', subgrupo: 'LOUCA', marca: 'SEM MARCA', custo: '12.345600' },
  ])
})

test('ativo é inativo diferente de T, e inativo vazio é ativo', async () => {
  await carregarCadastros({
    produtos: [produto(60, { inativo: 'T' }), produto(61, { inativo: 'F' }), produto(62, { inativo: null })],
    pessoas: [pessoa(10, { inativo: 'T' }), pessoa(11, { inativo: null })],
    funcionarios: [funcionario(1, { inativo: 'T' }), funcionario(2, { inativo: null })],
  })
  assert.deepEqual(await linhas('select codigo, ativo from kaizen.produto order by codigo'), [
    { codigo: '60', ativo: false }, { codigo: '61', ativo: true }, { codigo: '62', ativo: true },
  ])
  assert.deepEqual(await linhas('select codigo, ativo from kaizen.pessoa order by codigo'), [
    { codigo: '10', ativo: false }, { codigo: '11', ativo: true },
  ])
  assert.deepEqual(await linhas('select codigo, ativo from kaizen.funcionario order by codigo'), [
    { codigo: '1', ativo: false }, { codigo: '2', ativo: true },
  ])
})

test('quem veio na leitura é atualizado com lido_em novo, e quem não veio fica como estava', async () => {
  await carregarCadastros({
    produtos: [produto(60, { descricao: 'CANECA' }), produto(61, { descricao: 'PRATO' })],
    pessoas: [pessoa(10)],
    funcionarios: [funcionario(1)],
  })
  const [primeira] = await linhas(`select lido_em from kaizen.produto where codigo = '60'`)

  assert.deepEqual(
    await carregarCadastros({ produtos: [produto(60, { descricao: 'CANECA AZUL' })] }),
    { produtos: 1, pessoas: 0, funcionarios: 0, fornecedores: 0 },
  )
  assert.deepEqual(await linhas(
    'select codigo, descricao, lido_em > $1::timestamptz as relido from kaizen.produto order by codigo',
    [primeira.lido_em],
  ), [
    { codigo: '60', descricao: 'CANECA AZUL', relido: true },
    { codigo: '61', descricao: 'PRATO', relido: false },
  ])
  assert.deepEqual(await linhas('select codigo, nome, lido_em = $1::timestamptz as intacto from kaizen.pessoa', [primeira.lido_em]), [
    { codigo: '10', nome: 'CLIENTE TESTE', intacto: true },
  ])
  assert.deepEqual(await linhas('select codigo, nome, lido_em = $1::timestamptz as intacto from kaizen.funcionario', [primeira.lido_em]), [
    { codigo: '1', nome: 'Ana Teste', intacto: true },
  ])
})

test('produto_fornecedor do ERP novo é trocada inteira, e a da Link fica', async () => {
  await banco.cliente.query(`insert into kaizen.produto_fornecedor (fonte, produto, fornecedor) values ('link', '60', '900001')`)
  assert.equal((await carregarCadastros({
    fornecedores: [{ produto: 60, fornecedor: 500 }, { produto: 60, fornecedor: 501 }, { produto: 2138, fornecedor: 500 }],
  })).fornecedores, 3)
  assert.equal((await carregarCadastros({
    fornecedores: [{ produto: 60, fornecedor: 501 }, { produto: 5278, fornecedor: 502 }],
  })).fornecedores, 2)
  assert.deepEqual(await linhas('select fonte, produto, fornecedor from kaizen.produto_fornecedor order by fonte, produto, fornecedor'), [
    { fonte: 'link', produto: '60', fornecedor: '900001' },
    { fonte: 'meuerp', produto: '5278', fornecedor: '502' },
    { fonte: 'meuerp', produto: '60', fornecedor: '501' },
  ])
})

test('custo vazio fica vazio, e não zero', async () => {
  await carregarCadastros({
    produtos: [produto(60, { custo: null }), produto(61, { custo: '0.000000' }), produto(62, { custo: '12.345600' })],
  })
  assert.deepEqual(await linhas('select codigo, custo from kaizen.produto order by codigo'), [
    { codigo: '60', custo: null }, { codigo: '61', custo: '0.000000' }, { codigo: '62', custo: '12.345600' },
  ])
})
