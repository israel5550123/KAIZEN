import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { conectar, garantirLocal } from './banco.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'
import { criarBancoKaizen, URL_ADMIN } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { ErroKaizen } from './tipos.mts'
import type { Cortes } from './tipos.mts'

function pastaComMigracoes(arquivos: Record<string, string>): string {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const [nome, sql] of Object.entries(arquivos)) writeFileSync(join(pasta, nome), sql)
  return pasta
}

const DESTA_TAREFA = ['001_estrutura.sql', '002_traducao.sql', '003_corte.sql', '005_documento_negocio.sql']
const doRepositorio = readdirSync(PASTA_MIGRACOES).filter((nome) => nome.endsWith('.sql')).sort()

// `banco` recebe todas as migrações do repositório. `estrutura` recebe só as desta tarefa, para conferir o
// conteúdo delas sem depender das que vierem depois (uma migração nova pode mudar o corte ou acrescentar tradução).
let banco: BancoTeste
let aplicadasNaPrimeira: string[]
let estrutura: BancoTeste
let pastaEstrutura: string

before(async () => {
  banco = await criarBancoKaizen({ migrar: false })
  aplicadasNaPrimeira = await aplicarMigracoes(banco.cliente)
  pastaEstrutura = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const nome of DESTA_TAREFA) copyFileSync(join(PASTA_MIGRACOES, nome), join(pastaEstrutura, nome))
  estrutura = await criarBancoKaizen({ migrar: false })
  await aplicarMigracoes(estrutura.cliente, pastaEstrutura)
})

after(async () => {
  await banco?.fechar()
  await estrutura?.fechar()
  if (pastaEstrutura) rmSync(pastaEstrutura, { recursive: true, force: true })
})

test('aplica as migrações de uma pasta na ordem do nome, registra cada uma e depois só as que faltam', async () => {
  const pasta = pastaComMigracoes({
    '010_c.sql': `insert into kaizen.ordem (passo) values ('c');`,
    '001_a.sql': `create table kaizen.ordem (n integer generated always as identity, passo text not null); insert into kaizen.ordem (passo) values ('a');`,
    '002_b.sql': `insert into kaizen.ordem (passo) values ('b');`,
    'leia-me.txt': 'não é migração',
  })
  const outro = await criarBancoKaizen({ migrar: false })
  try {
    assert.deepEqual(await aplicarMigracoes(outro.cliente, pasta), ['001_a.sql', '002_b.sql', '010_c.sql'])
    const ordem = await outro.cliente.query('select passo from kaizen.ordem order by n')
    assert.deepEqual(ordem.rows.map((linha) => linha.passo), ['a', 'b', 'c'])

    writeFileSync(join(pasta, '011_d.sql'), `insert into kaizen.ordem (passo) values ('d');`)
    assert.deepEqual(await aplicarMigracoes(outro.cliente, pasta), ['011_d.sql'])
    const registro = await outro.cliente.query('select nome from kaizen.migracao order by nome')
    assert.deepEqual(registro.rows.map((linha) => linha.nome), ['001_a.sql', '002_b.sql', '010_c.sql', '011_d.sql'])
  } finally {
    await outro.fechar()
    rmSync(pasta, { recursive: true, force: true })
  }
})

test('aplica todas as migrações do repositório, na ordem do nome, e registra cada uma', async () => {
  assert.deepEqual(aplicadasNaPrimeira, doRepositorio)
  for (const nome of DESTA_TAREFA) assert.ok(doRepositorio.includes(nome), nome)
  const registro = await banco.cliente.query('select nome from kaizen.migracao order by nome')
  assert.deepEqual(registro.rows.map((linha) => linha.nome), doRepositorio)
})

test('as migrações desta tarefa criam as 17 tabelas do Kaizen, o registro e a visão', async () => {
  const tabelas = await estrutura.cliente.query(
    `select table_name as nome, table_type as tipo from information_schema.tables
     where table_schema = 'kaizen' order by table_name collate "C"`,
  )
  const tabela = (nome: string) => ({ nome, tipo: 'BASE TABLE' })
  assert.deepEqual(tabelas.rows, [
    tabela('baixa'),
    tabela('conferencia_caixa'),
    tabela('corte'),
    tabela('de_para'),
    tabela('documento'),
    tabela('documento_item'),
    { nome: 'documento_negocio', tipo: 'VIEW' },
    tabela('documento_pagamento'),
    tabela('estoque_atual'),
    tabela('estoque_movimento'),
    tabela('estoque_virada'),
    tabela('execucao'),
    tabela('funcionario'),
    tabela('migracao'),
    tabela('parcela'),
    tabela('pessoa'),
    tabela('produto'),
    tabela('produto_fornecedor'),
    tabela('traducao'),
  ])
})

test('rodar as migrações de novo não aplica nada', async () => {
  assert.deepEqual(await aplicarMigracoes(banco.cliente), [])
  const { rows } = await banco.cliente.query('select count(*) as registradas from kaizen.migracao')
  assert.equal(rows[0].registradas, String(doRepositorio.length))
})

test('as migrações rodam como kaizen, que não é superusuário e é dono das tabelas', async () => {
  const quem = await banco.cliente.query(
    'select current_user as usuario, r.rolsuper as superusuario from pg_roles r where r.rolname = current_user',
  )
  assert.deepEqual(quem.rows, [{ usuario: 'kaizen', superusuario: false }])
  const donos = await banco.cliente.query(`select distinct tableowner as dono from pg_tables where schemaname = 'kaizen'`)
  assert.deepEqual(donos.rows, [{ dono: 'kaizen' }])
})

test('traducao tem as 48 linhas da carga inicial, com os significados combinados', async () => {
  const total = await estrutura.cliente.query(
    `select count(*) as linhas, count(*) filter (where fonte = 'meuerp') as do_erp_novo from kaizen.traducao`,
  )
  assert.deepEqual(total.rows[0], { linhas: '48', do_erp_novo: '48' })
  const porCampo = await estrutura.cliente.query(
    'select campo, count(*)::int as codigos from kaizen.traducao group by campo order by campo collate "C"',
  )
  assert.deepEqual(porCampo.rows, [
    { campo: 'financeiro', codigos: 3 },
    { campo: 'forma', codigos: 5 },
    { campo: 'movimento', codigos: 3 },
    { campo: 'sentido', codigos: 3 },
    { campo: 'situacao', codigos: 8 },
    { campo: 'status_baixa', codigos: 2 },
    { campo: 'status_parcela', codigos: 2 },
    { campo: 'tipo', codigos: 22 },
  ])
  const { rows } = await estrutura.cliente.query(`select campo || ':' || codigo as chave, valor from kaizen.traducao`)
  const traducao: Record<string, string> = Object.fromEntries(rows.map((linha) => [linha.chave, linha.valor]))
  assert.equal(traducao['tipo:PA'], 'pedido')
  assert.equal(traducao['tipo:65'], 'nfce')
  assert.equal(traducao['tipo:TM'], 'troca')
  assert.equal(traducao['tipo:RS'], 'sangria')
  assert.equal(traducao['tipo:RT'], 'sangria')
  assert.equal(traducao['tipo:CP'], 'conta_pagar')
  assert.equal(traducao['tipo:AC'], 'ajuste_custo')
  assert.equal(traducao['situacao:C'], 'cancelado')
  assert.equal(traducao['situacao:Z'], 'contingencia')
  assert.equal(traducao['movimento:S'], 'saida')
  assert.equal(traducao['financeiro:P'], 'paga')
  assert.equal(traducao['forma:5'], 'troca')
  assert.equal(traducao['status_parcela:B'], 'baixada')
  assert.equal(traducao['status_baixa:E'], 'valida')
  assert.equal(traducao['sentido:N'], 'nenhum')
  // Ficam de fora de propósito (spec 5.4): se aparecerem acima do corte, viram aviso.
  for (const chave of ['tipo:AM', 'tipo:EM', 'tipo:RU', 'financeiro:E', 'status_parcela:C']) {
    assert.equal(traducao[chave], undefined, chave)
  }
})

test('corte tem as 8 tabelas do ERP, sem nulo, com o documento em 184', async () => {
  const { rows } = await estrutura.cliente.query('select fonte, tabela, oid from kaizen.corte')
  assert.equal(rows.length, 8)
  assert.ok(rows.every((linha) => linha.fonte === 'meuerp' && typeof linha.oid === 'string'))
  const esperado: Cortes = {
    documento: 184,
    documento_mercadoria: 1872,
    documento_pagamento: 0,
    documento_parcela: 0,
    documento_parcela_pagamento: 0,
    documento_conferencia_caixa: 30,
    documento_cancelamento_historico: 0,
    mercadoria_estoque_historico: 1847,
  }
  assert.deepEqual(Object.fromEntries(rows.map((linha) => [linha.tabela, Number(linha.oid)])), esperado)
})

test('a visão documento_negocio traduz os códigos e, na Link, usa a tradução pelo modelo', async () => {
  const q = estrutura.cliente
  await q.query('begin')
  try {
    await q.query(`
      insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
      values ('meuerp', 'documento', '185', '50', 'PA', 'E', 'S', 'R', '2026-09-28 09:15:00'),
             ('meuerp', 'documento', '186', '51', 'AM', 'E', null, 'E', '2026-09-28 09:20:00'),
             ('link', 'negociacao', '9001', '777', 'teste_link', 'N', null, null, '2026-04-10 10:00:00')`)
    await q.query(`
      insert into kaizen.traducao (fonte, campo, codigo, valor)
      values ('link', 'tipo', 'teste_link', 'venda'),
             ('link', 'movimento_pelo_modelo', 'teste_link', 'saida'),
             ('link', 'financeiro_pelo_modelo', 'teste_link', 'recebe')`)
    const { rows } = await q.query(`
      select fonte, origem_id, modelo, tipo, status, situacao, movimento, financeiro, criado_em
      from kaizen.documento_negocio order by origem_id`)
    assert.deepEqual(rows, [
      {
        fonte: 'meuerp', origem_id: '185', modelo: 'PA', tipo: 'pedido', status: 'E', situacao: 'emitido',
        movimento: 'saida', financeiro: 'recebe', criado_em: '2026-09-28 09:15:00',
      },
      {
        fonte: 'meuerp', origem_id: '186', modelo: 'AM', tipo: null, status: 'E', situacao: 'emitido',
        movimento: null, financeiro: null, criado_em: '2026-09-28 09:20:00',
      },
      {
        fonte: 'link', origem_id: '9001', modelo: 'teste_link', tipo: 'venda', status: 'N', situacao: null,
        movimento: 'saida', financeiro: 'recebe', criado_em: '2026-04-10 10:00:00',
      },
    ])
  } finally {
    await q.query('rollback')
  }
})

test('apagar um documento apaga itens, pagamentos, parcelas, baixas e conferência; o movimento de estoque fica', async () => {
  const q = estrutura.cliente
  await q.query('begin')
  try {
    const documento = await q.query(`
      insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
      values ('meuerp', 'documento', '300', '60', 'CP', 'E', 'N', 'P', '2026-09-28 10:00:00') returning id`)
    const id = documento.rows[0].id
    await q.query(
      `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido)
       values ($1, 'documento_mercadoria', '1900', 'N', '60', '1', '10.00')`,
      [id],
    )
    await q.query(
      `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
       values ($1, 'documento_pagamento', '1', '1', '10.00')`,
      [id],
    )
    const parcela = await q.query(
      `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status)
       values ($1, 'documento_parcela', '1', '2026-09-28', '2026-10-05', '10.00', 'B') returning id`,
      [id],
    )
    const parcelaId = parcela.rows[0].id
    await q.query(
      `insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
       values ($1, 'documento_parcela_pagamento', '1', '2026-09-29', '10.00', '1', 'E')`,
      [parcelaId],
    )
    await q.query(
      `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
       values ($1, 'documento_conferencia_caixa', '31', '1', '58.00', '20.00')`,
      [id],
    )
    await q.query(`
      insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois)
      values ('meuerp', 'mercadoria_estoque_historico', '1848', '60', '60', '2026-09-28 10:00:00', '3', '2')`)
    const contar = async () =>
      (
        await q.query(
          `select
             (select count(*) from kaizen.documento_item where documento_id = $1) as itens,
             (select count(*) from kaizen.documento_pagamento where documento_id = $1) as pagamentos,
             (select count(*) from kaizen.parcela where documento_id = $1) as parcelas,
             (select count(*) from kaizen.baixa where parcela_id = $2) as baixas,
             (select count(*) from kaizen.conferencia_caixa where documento_id = $1) as conferencias,
             (select count(*) from kaizen.estoque_movimento where origem_id = '1848') as movimentos`,
          [id, parcelaId],
        )
      ).rows[0]
    assert.deepEqual(await contar(), { itens: '1', pagamentos: '1', parcelas: '1', baixas: '1', conferencias: '1', movimentos: '1' })
    await q.query('delete from kaizen.documento where id = $1', [id])
    assert.deepEqual(await contar(), { itens: '0', pagamentos: '0', parcelas: '0', baixas: '0', conferencias: '0', movimentos: '1' })
  } finally {
    await q.query('rollback')
  }
})

test('migração com erro vira ErroKaizen, desfaz o que ela fez e não fica registrada', async () => {
  const pasta = pastaComMigracoes({
    '001_boa.sql': 'create table kaizen.boa (n integer);',
    '002_ruim.sql': 'create table kaizen.ruim (n integer); select 1 / 0;',
    '003_depois.sql': 'create table kaizen.depois (n integer);',
  })
  const outro = await criarBancoKaizen({ migrar: false })
  try {
    await assert.rejects(aplicarMigracoes(outro.cliente, pasta), (erro) => {
      assert.ok(erro instanceof ErroKaizen)
      assert.equal(erro.motivo.tipo, 'outra')
      assert.match(erro.motivo.detalhe, /^a migração 002_ruim\.sql não se aplicou: .+/)
      assert.equal(erro.message, erro.motivo.detalhe)
      return true
    })
    const registro = await outro.cliente.query('select nome from kaizen.migracao order by nome')
    assert.deepEqual(registro.rows.map((linha) => linha.nome), ['001_boa.sql'])
    const tabelas = await outro.cliente.query(
      `select table_name as nome from information_schema.tables where table_schema = 'kaizen' order by table_name collate "C"`,
    )
    assert.deepEqual(tabelas.rows.map((linha) => linha.nome), ['boa', 'migracao'])
  } finally {
    await outro.fechar()
    rmSync(pasta, { recursive: true, force: true })
  }
})

test('o banco de teste é só do teste, conecta como kaizen e some ao fechar', async () => {
  const outro = await criarBancoKaizen({ migrar: false })
  const nome = outro.nome
  try {
    assert.match(nome, /^kaizen_teste_\d+_\d+$/)
    assert.equal(outro.url, `postgres://kaizen:kaizen-local@localhost:5434/${nome}`)
    const { rows } = await outro.cliente.query(
      `select current_user as usuario, current_database() as banco,
              (select count(*) from information_schema.tables where table_schema = 'kaizen') as tabelas`,
    )
    assert.deepEqual(rows[0], { usuario: 'kaizen', banco: nome, tabelas: '0' })
  } finally {
    await outro.fechar()
  }
  garantirLocal(URL_ADMIN)
  const admin = await conectar(URL_ADMIN)
  try {
    const { rows } = await admin.query('select count(*) as bancos from pg_database where datname = $1', [nome])
    assert.equal(rows[0].bancos, '0')
  } finally {
    await admin.end()
  }
})
