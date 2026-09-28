import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinhaCaso, type LinkFalsa } from './link-falsa.mts'
import { conferirColunasLink, conferirEntradaLink, ErroLink, lerColunasEsperadasLink } from './link.mts'

let banco: BancoTeste
let falsa: LinkFalsa

before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
})

after(async () => {
  await falsa?.fechar()
  await banco?.fechar()
})

// Cada linha como o texto que o Postgres escreve (coluna::text), em JSON, em ordem: para comparar com o arquivo sem ordem de linha.
async function comoTexto(tabela: string, colunas: string[]): Promise<string[]> {
  const { rows } = await banco.cliente.query(`select ${colunas.map((c) => `${c}::text as ${c}`).join(', ')} from ${tabela}`)
  return rows.map((linha) => JSON.stringify(linha)).sort()
}

function doArquivo(linhas: LinhaCaso[], colunas: string[]): string[] {
  return linhas.map((linha) => JSON.stringify(Object.fromEntries(colunas.map((c) => [c, linha[c] ?? null])))).sort()
}

// O erro é um ErroLink com exatamente esta mensagem.
function erroLink(mensagem: string) {
  return (erro: unknown) => {
    assert.ok(erro instanceof ErroLink)
    assert.equal(erro.message, mensagem)
    return true
  }
}

test('lerColunasEsperadasLink lê as 119 colunas de 20 tabelas, em ordem, sem repetição, com tipo conhecido', () => {
  const colunas = lerColunasEsperadasLink()
  assert.equal(colunas.length, 119)
  assert.equal(new Set(colunas.map((c) => c.tabela)).size, 20)
  assert.deepEqual(colunas[0], { tabela: 'caixa', coluna: 'data_hora', tipo: 'timestamp' })
  assert.deepEqual(colunas[118], { tabela: 'usuario', coluna: 'nome', tipo: 'varchar' })
  // Cada par (tabela, coluna) é maior que o anterior: a lista está em ordem e nada se repete.
  for (let i = 1; i < colunas.length; i++) {
    const a = colunas[i - 1]
    const b = colunas[i]
    assert.ok(
      a.tabela < b.tabela || (a.tabela === b.tabela && a.coluna < b.coluna),
      `${a.tabela}.${a.coluna} vem antes de ${b.tabela}.${b.coluna}`,
    )
  }
  const porTipo: Record<string, number> = {}
  for (const { tipo } of colunas) porTipo[tipo] = (porTipo[tipo] ?? 0) + 1
  assert.deepEqual(porTipo, { bigint: 48, boolean: 12, character: 2, date: 1, integer: 1, numeric: 28, timestamp: 6, varchar: 21 })
  // As duas colunas 'character' da Link: a UF (2 letras) e o tipo da negociação (1 letra).
  assert.deepEqual(
    colunas.filter((c) => c.tipo === 'character').map((c) => `${c.tabela}.${c.coluna}`),
    ['cidade.sigla_estado', 'negociacao.tipo'],
  )
})

test('a Link falsa tem só as colunas da lista, e o kaizen lê mas não escreve nela', async () => {
  // O information_schema só mostra ao kaizen as colunas que ele pode ler: ver todas prova também a leitura.
  const tipoNoBanco: Record<string, string> = {
    bigint: 'int8', boolean: 'bool', character: 'bpchar', date: 'date',
    integer: 'int4', numeric: 'numeric', timestamp: 'timestamp', varchar: 'varchar',
  }
  const colunas = await banco.cliente.query(`
    select table_name as tabela, column_name as coluna, udt_name as tipo, is_nullable as aceita_nulo
    from information_schema.columns
    where table_schema = 'erp'
    order by table_name collate "C", column_name collate "C"`)
  assert.deepEqual(
    colunas.rows,
    lerColunasEsperadasLink().map((c) => ({ tabela: c.tabela, coluna: c.coluna, tipo: tipoNoBanco[c.tipo], aceita_nulo: 'YES' })),
  )
  // Sem chave nem índice, e tudo é do postgres: o kaizen não é dono de nada no erp.
  const estrutura = await banco.cliente.query(`
    select (select count(*)::int from pg_constraint where connamespace = 'erp'::regnamespace) as restricoes,
           (select count(*)::int from pg_indexes where schemaname = 'erp') as indices,
           (select string_agg(distinct tableowner, ', ') from pg_tables where schemaname = 'erp') as donos`)
  assert.deepEqual(estrutura.rows, [{ restricoes: 0, indices: 0, donos: 'postgres' }])
  await assert.rejects(banco.cliente.query('insert into erp.negociacao (id_negociacao) values (9999)'), {
    message: 'permission denied for table negociacao',
  })
  await assert.rejects(banco.cliente.query('create table erp.outra (n integer)'), { message: 'permission denied for schema erp' })
  const negociacoes = await banco.cliente.query('select count(*)::int as n from erp.negociacao')
  assert.deepEqual(negociacoes.rows, [{ n: 16 }])
})

test('carregarCasosLink põe na Link falsa as 290 linhas dos casos e no Kaizen o cadastro do ERP novo', async () => {
  const casos = lerCasosLink()
  const porTabela = new Map<string, string[]>()
  for (const { tabela, coluna } of lerColunasEsperadasLink()) porTabela.set(tabela, [...(porTabela.get(tabela) ?? []), coluna])
  // Cada valor da Link falsa, lido de volta como texto, é o texto do arquivo: nada se perdeu nem mudou no caminho.
  const linhasPorTabela: Record<string, number> = {}
  for (const [tabela, colunas] of porTabela) {
    const noBanco = await comoTexto(`erp.${tabela}`, colunas)
    assert.deepEqual(noBanco, doArquivo(casos[tabela], colunas), tabela)
    linhasPorTabela[tabela] = noBanco.length
  }
  assert.deepEqual(linhasPorTabela, {
    caixa: 15, caixa_fechamento: 3, caixa_parcela: 12, cidade: 6, cliente: 12, compra: 3, compra_item: 2,
    fornecedor: 4, marca: 11, negociacao: 16, negociacao_item_devolvido: 10, negociacao_item_vendido: 45,
    nota_entrada: 2, pc_lancamento: 24, pc_lancamento_fonte: 24, pc_lancamento_parcela: 33, prod_grupo: 11,
    prod_subgrupo: 11, produto: 42, usuario: 4,
  })
  assert.equal(Object.values(linhasPorTabela).reduce((soma, n) => soma + n, 0), 290)
  // A venda de junho, com os tipos da Link: número e data como texto, tipo de uma letra, venda verdadeira.
  const venda = await banco.cliente.query(`
    select id_negociacao, tipo, venda, data, desconto_percentual, valor_total_venda, valor_total_devolucao
    from erp.negociacao where id_negociacao = 1992`)
  assert.deepEqual(venda.rows, [{
    id_negociacao: '1992', tipo: 'T', venda: true, data: '2026-06-17 13:58:20.706517',
    desconto_percentual: '0.60959', valor_total_venda: '150.00', valor_total_devolucao: '0.00',
  }])

  // O cadastro do ERP novo, gravado pelo kaizen com as colunas do arquivo.
  for (const tabela of ['produto', 'pessoa', 'funcionario']) {
    const linhas = casos[`kaizen.${tabela}`]
    const colunas = Object.keys(linhas[0])
    assert.deepEqual(await comoTexto(`kaizen.${tabela}`, colunas), doArquivo(linhas, colunas), tabela)
  }
  const cadastro = await banco.cliente.query(`
    select 'funcionario' as tabela, fonte, count(*)::int as linhas from kaizen.funcionario group by fonte
    union all select 'pessoa', fonte, count(*)::int from kaizen.pessoa group by fonte
    union all select 'produto', fonte, count(*)::int from kaizen.produto group by fonte
    order by tabela`)
  assert.deepEqual(cadastro.rows, [
    { tabela: 'funcionario', fonte: 'meuerp', linhas: 9 },
    { tabela: 'pessoa', fonte: 'meuerp', linhas: 35 },
    { tabela: 'produto', fonte: 'meuerp', linhas: 40 },
  ])
  const vendedor = await banco.cliente.query(`select codigo, nome, usuario, tipo, ativo from kaizen.funcionario where codigo = '1'`)
  assert.deepEqual(vendedor.rows, [{ codigo: '1', nome: 'Caio Mendes Rocha', usuario: 18152, tipo: 'V', ativo: true }])
})

test('conferirColunasLink não acusa nada com a lista inteira e acusa a coluna que falta', async () => {
  const casos = lerCasosLink()
  assert.deepEqual(await conferirColunasLink(banco.cliente), [])
  await falsa.executar('alter table erp.negociacao drop column venda')
  try {
    assert.deepEqual(await conferirColunasLink(banco.cliente), ['negociacao.venda'])
    await assert.rejects(
      conferirEntradaLink(banco.cliente),
      erroLink('a cópia da Link não tem as colunas esperadas: negociacao.venda'),
    )
  } finally {
    // Desfaz: a coluna volta, e a negociação volta inteira, com os valores do arquivo.
    await falsa.executar('alter table erp.negociacao add column venda boolean')
    await falsa.executar('delete from erp.negociacao')
    await falsa.inserir('negociacao', casos.negociacao)
  }
  assert.deepEqual(await conferirColunasLink(banco.cliente), [])
})

test('conferirEntradaLink para sem o cadastro do ERP novo e com a Link sem negociação', async () => {
  const casos = lerCasosLink()
  // Um banco só deste teste: a Link falsa com todos os casos, e o Kaizen sem nenhum produto do ERP novo.
  const outro = await criarBancoKaizen()
  const outraFalsa = await criarLinkFalsa(outro)
  try {
    const semCadastro = Object.fromEntries(Object.entries(casos).filter(([chave]) => !chave.startsWith('kaizen.')))
    await carregarCasosLink(outraFalsa, outro.cliente, semCadastro)
    await assert.rejects(
      conferirEntradaLink(outro.cliente),
      erroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo'),
    )
  } finally {
    await outraFalsa.fechar()
    await outro.fechar()
  }

  // Na Link falsa do arquivo, com o cadastro: a entrada passa; sem nenhuma negociação, para.
  await conferirEntradaLink(banco.cliente)
  await falsa.executar('delete from erp.negociacao')
  try {
    await assert.rejects(
      conferirEntradaLink(banco.cliente),
      erroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?'),
    )
  } finally {
    await falsa.inserir('negociacao', casos.negociacao)
  }
  await conferirEntradaLink(banco.cliente)
})
