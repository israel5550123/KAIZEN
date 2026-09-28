import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, type LinkFalsa } from './link-falsa.mts'
import { ErroLink, ligarLink } from './link.mts'

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

// Numa transação: roda o preparo do teste (mudanças no Kaizen), liga os códigos da Link e devolve o que `ler` leu da
// pg_temp.link_liga. O rollback no fim desfaz o preparo e apaga as temporárias.
async function ligarELer<T>(ler: () => Promise<T>, preparo: string[] = []): Promise<T> {
  await banco.cliente.query('begin')
  try {
    for (const sql of preparo) await banco.cliente.query(sql)
    await ligarLink(banco.cliente)
    return await ler()
  } finally {
    await banco.cliente.query('rollback')
  }
}

async function ligacoes(onde: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await banco.cliente.query(
    `select entidade, codigo_origem, codigo_kaizen, como from pg_temp.link_liga
      where ${onde} order by entidade, codigo_origem collate "C"`,
  )
  return rows
}

test('produto liga pelo código, e o que não existe no ERP novo vira falha link:<código>', async () => {
  const lido = await ligarELer(async () => ({
    exemplos: await ligacoes(`entidade = 'produto' and codigo_origem in ('1440', '1993', '2396', '2400')`),
    porComo: (
      await banco.cliente.query(
        `select como, count(*)::int as n from pg_temp.link_liga where entidade = 'produto' group by como order by como`,
      )
    ).rows,
  }))
  // 1993 e 2396 só existem na Link (os dois só aparecem na venda cancelada 8).
  assert.deepEqual(lido.exemplos, [
    { entidade: 'produto', codigo_origem: '1440', codigo_kaizen: '1440', como: 'regra' },
    { entidade: 'produto', codigo_origem: '1993', codigo_kaizen: 'link:1993', como: 'falha' },
    { entidade: 'produto', codigo_origem: '2396', codigo_kaizen: 'link:2396', como: 'falha' },
    { entidade: 'produto', codigo_origem: '2400', codigo_kaizen: '2400', como: 'regra' },
  ])
  // Os 42 produtos da Link dos casos: 40 no cadastro do ERP novo, 2 só na Link.
  assert.deepEqual(lido.porComo, [
    { como: 'falha', n: 2 },
    { como: 'regra', n: 40 },
  ])
})

test('cliente liga pelo CPF/CNPJ só com dígitos, e CPF/CNPJ vazio não liga nada', async () => {
  // Na Link falsa, o CPF do cliente 288 passa a ter pontos e traço, e o do cliente 313 fica vazio.
  await falsa.executar(
    `update erp.cliente set cpf = case cliente_codigo when '288' then '051.504.253-73' else '' end
      where cliente_codigo in ('288', '313')`,
  )
  try {
    const lido = await ligarELer(
      () => ligacoes(`entidade = 'pessoa' and codigo_origem in ('10000045', '170', '288', '313')`),
      [
        // No ERP novo, o CNPJ da pessoa 170 passa a ter pontos, barra e traço.
        `update kaizen.pessoa set cpf_cnpj = '22.623.048/5248-26' where fonte = 'meuerp' and codigo = '170'`,
        // Fica uma só pessoa do ERP novo com CPF/CNPJ vazio (a 21): sem a trava do vazio, o cliente 313 ligaria a ela.
        `update kaizen.pessoa set cpf_cnpj = null where fonte = 'meuerp' and cpf_cnpj = '' and codigo <> '21'`,
      ],
    )
    assert.deepEqual(lido, [
      // O CPF do cliente 10000045 é o da pessoa 451 do ERP novo: a ligação segue o documento, não o código.
      { entidade: 'pessoa', codigo_origem: '10000045', codigo_kaizen: '451', como: 'regra' },
      { entidade: 'pessoa', codigo_origem: '170', codigo_kaizen: '170', como: 'regra' },
      { entidade: 'pessoa', codigo_origem: '288', codigo_kaizen: '288', como: 'regra' },
      { entidade: 'pessoa', codigo_origem: '313', codigo_kaizen: 'link:313', como: 'falha' },
    ])
  } finally {
    await falsa.executar(
      `update erp.cliente set cpf = case cliente_codigo when '288' then '05150425373' else '45143201292' end
        where cliente_codigo in ('288', '313')`,
    )
  }
})

test('CPF/CNPJ que acha duas pessoas do ERP novo vira falha', async () => {
  const onde = `entidade = 'pessoa' and codigo_origem in ('65', '288')`
  // Com uma pessoa só por CPF, o cliente 65 liga.
  assert.deepEqual(await ligarELer(() => ligacoes(onde)), [
    { entidade: 'pessoa', codigo_origem: '288', codigo_kaizen: '288', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '65', codigo_kaizen: '65', como: 'regra' },
  ])
  // Uma segunda pessoa do ERP novo com o CPF do cliente 65: a regra não escolhe entre as duas.
  const repetido = `insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, ativo)
    values ('meuerp', '500', 'CLIENTE 65 REPETIDO', '54090830660', true)`
  assert.deepEqual(await ligarELer(() => ligacoes(onde), [repetido]), [
    { entidade: 'pessoa', codigo_origem: '288', codigo_kaizen: '288', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '65', codigo_kaizen: 'link:65', como: 'falha' },
  ])
})

test('a decisão da de_para vale antes do CPF: o Consumidor Final 10000502 vai para 999007', async () => {
  const onde = `entidade = 'pessoa' and codigo_origem = '10000502'`
  // Uma pessoa do ERP novo com o CPF que a Link grava para o Consumidor Final: pela regra, ele ligaria a ela.
  const mesmoCpf = `insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, ativo)
    values ('meuerp', '501', 'CLIENTE COM O CPF DO CONSUMIDOR FINAL', '18943884060', true)`
  assert.deepEqual(await ligarELer(() => ligacoes(onde), [mesmoCpf]), [
    { entidade: 'pessoa', codigo_origem: '10000502', codigo_kaizen: '999007', como: 'decisao' },
  ])
  // Sem a decisão (tirada só dentro da transação), a regra do CPF é que liga.
  const semDecisao = `delete from kaizen.de_para where entidade = 'pessoa' and fonte = 'link' and codigo_origem = '10000502'`
  assert.deepEqual(await ligarELer(() => ligacoes(onde), [mesmoCpf, semDecisao]), [
    { entidade: 'pessoa', codigo_origem: '10000502', codigo_kaizen: '501', como: 'regra' },
  ])
})

test('vendedor liga pela primeira palavra do nome, sem acento, e o Sistema (1) não vira o funcionário 1 do ERP novo', async () => {
  // Na Link: 1 Sistema, 5 Débora, 6 Caio, 9 Neide. No ERP novo: 1 Caio Mendes Rocha, 999005 Debora Fonseca Lima,
  // 999006 Neide Alves Pereira.
  assert.deepEqual(await ligarELer(() => ligacoes(`entidade = 'funcionario'`)), [
    { entidade: 'funcionario', codigo_origem: '1', codigo_kaizen: 'link:1', como: 'falha' },
    { entidade: 'funcionario', codigo_origem: '5', codigo_kaizen: '999005', como: 'regra' },
    { entidade: 'funcionario', codigo_origem: '6', codigo_kaizen: '1', como: 'regra' },
    { entidade: 'funcionario', codigo_origem: '9', codigo_kaizen: '999006', como: 'regra' },
  ])
  // Um segundo Caio no ERP novo (só dentro da transação): o primeiro nome repetido não escolhe entre os dois, e o
  // usuário 6 da Link vira falha.
  const outroCaio = `insert into kaizen.funcionario (fonte, codigo, nome, ativo) values ('meuerp', '999099', 'Caio Outro', true)`
  assert.deepEqual(await ligarELer(() => ligacoes(`entidade = 'funcionario' and codigo_origem = '6'`), [outroCaio]), [
    { entidade: 'funcionario', codigo_origem: '6', codigo_kaizen: 'link:6', como: 'falha' },
  ])
})

test('fornecedor liga pelo CNPJ com o código + 900000, e o FORNECEDOR PADRÃO vira link:900001', async () => {
  // O fornecedor 900009 do ERP novo ganha outro código dentro da transação: a ligação segue o CNPJ, não o código.
  const outroCodigo = `update kaizen.pessoa set codigo = '900090' where fonte = 'meuerp' and codigo = '900009'`
  const lido = await ligarELer(
    () => ligacoes(`entidade = 'pessoa' and codigo_origem in ('900001', '900007', '900009', '900014')`),
    [outroCodigo],
  )
  // Fornecedores 1, 7, 9 e 14 da Link; o 1 (FORNECEDOR PADRÃO) não tem CNPJ.
  assert.deepEqual(lido, [
    { entidade: 'pessoa', codigo_origem: '900001', codigo_kaizen: 'link:900001', como: 'falha' },
    { entidade: 'pessoa', codigo_origem: '900007', codigo_kaizen: '900007', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '900009', codigo_kaizen: '900090', como: 'regra' },
    { entidade: 'pessoa', codigo_origem: '900014', codigo_kaizen: '900014', como: 'regra' },
  ])
})

test('decisão que aponta para código que não existe no ERP novo para com ErroLink, com a linha na mensagem', async () => {
  await banco.cliente.query('begin')
  try {
    // A decisão da migração 008 (cliente 1 da Link → 999007) passa a apontar para um código que o ERP novo não tem.
    await banco.cliente.query(
      `insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen) values ('pessoa', 'link', '1', '999999')
       on conflict (entidade, fonte, codigo_origem) do update set codigo_kaizen = excluded.codigo_kaizen`,
    )
    await assert.rejects(ligarLink(banco.cliente), (erro: unknown) => {
      assert.ok(erro instanceof ErroLink)
      // Só a decisão errada: as outras 22 decisões das migrações apontam para pessoas que existem.
      assert.equal(erro.message, 'decisão da de_para aponta para código que não existe no ERP novo: pessoa 1 → 999999')
      return true
    })
  } finally {
    await banco.cliente.query('rollback')
  }
})
