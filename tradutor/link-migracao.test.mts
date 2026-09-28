import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'

// O banco recebe as migrações até a 007, e só elas, como no migracoes.test.mts: uma migração de depois (uma tradução
// nova para a cópia final, uma decisão nova na de_para) não pode quebrar a conferência do conteúdo destas duas.
const ATE_ESTA_TAREFA = readdirSync(PASTA_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql') && nome <= '007_de_para_link.sql')
  .sort()

let banco: BancoTeste
let pasta: string

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const nome of ATE_ESTA_TAREFA) copyFileSync(join(PASTA_MIGRACOES, nome), join(pasta, nome))
  banco = await criarBancoKaizen({ migrar: false })
  await aplicarMigracoes(banco.cliente, pasta)
})

after(async () => {
  await banco?.fechar()
  if (pasta) rmSync(pasta, { recursive: true, force: true })
})

test('meio_par arredonda a 2 casas e, no empate de meio centavo, vai para o par', async () => {
  const { rows } = await banco.cliente.query(`
    select v.valor::text as valor, kaizen.meio_par(v.valor, 2) as arredondado
    from (values (1, 109.725), (2, 142.405), (3, 90.915), (4, 68.875), (5, 206.625), (6, -109.725),
                 (7, 44.0466), (8, 23.7174), (9, 90.9151), (10, 150)) as v(ordem, valor)
    order by v.ordem`)
  assert.deepEqual(rows, [
    // Os empates de meio centavo da spec (seção 7.2): fica o centavo par.
    { valor: '109.725', arredondado: '109.72' },
    { valor: '142.405', arredondado: '142.40' },
    { valor: '90.915', arredondado: '90.92' },
    { valor: '68.875', arredondado: '68.88' },
    { valor: '206.625', arredondado: '206.62' },
    // O empate negativo também vai para o par.
    { valor: '-109.725', arredondado: '-109.72' },
    // Fora do empate, é o arredondamento comum: os dois itens devolvidos da 1095 dão 44,05 + 23,72 = 67,77.
    { valor: '44.0466', arredondado: '44.05' },
    { valor: '23.7174', arredondado: '23.72' },
    { valor: '90.9151', arredondado: '90.92' },
    { valor: '150', arredondado: '150.00' },
  ])
})

test('a traducao da Link tem as 69 linhas da seção 8 da spec', async () => {
  const porFonte = await banco.cliente.query(
    'select fonte, count(*)::int as linhas from kaizen.traducao group by fonte order by fonte collate "C"',
  )
  // A tradução do ERP novo continua com as 48 linhas da Fase 2.
  assert.deepEqual(porFonte.rows, [
    { fonte: 'link', linhas: 69 },
    { fonte: 'meuerp', linhas: 48 },
  ])
  const { rows } = await banco.cliente.query(
    `select campo, codigo, valor from kaizen.traducao where fonte = 'link' order by campo collate "C", codigo collate "C"`,
  )
  assert.deepEqual(rows.map((linha) => [linha.campo, linha.codigo, linha.valor]), [
    ['financeiro_pelo_modelo', '2.1.2.02', 'paga'],
    ['financeiro_pelo_modelo', '2.1.3.07', 'paga'],
    ['financeiro_pelo_modelo', '2.1.4.10', 'paga'],
    ['financeiro_pelo_modelo', '2.1.5.02', 'paga'],
    ['financeiro_pelo_modelo', '55', 'nenhum'],
    ['financeiro_pelo_modelo', 'A/true', 'recebe'],
    ['financeiro_pelo_modelo', 'P/false', 'nenhum'],
    ['financeiro_pelo_modelo', 'Sangria/false', 'paga'],
    ['financeiro_pelo_modelo', 'Sangria/true', 'paga'],
    ['financeiro_pelo_modelo', 'Suprimento/true', 'nenhum'],
    ['financeiro_pelo_modelo', 'T/true', 'recebe'],
    ['financeiro_pelo_modelo', 'caixa_fechamento', 'nenhum'],
    ['forma', '1.1.1.01', 'dinheiro'],
    ['forma', '1.1.1.02.01', 'banco'],
    ['forma', '2.1.2.03', 'troca'],
    ['forma', 'Cartao/false', 'debito'],
    ['forma', 'Cartao/true', 'credito'],
    ['forma', 'Dinheiro', 'dinheiro'],
    ['forma', 'Pix', 'pix'],
    ['forma', 'boleto', 'boleto'],
    ['forma', 'cartao', 'cartao'],
    ['forma', 'cheque', 'cheque'],
    ['forma', 'dinheiro', 'dinheiro'],
    ['forma', 'nota_promissoria', 'troca'],
    ['forma', 'pix', 'pix'],
    ['movimento_pelo_modelo', '2.1.2.02', 'nenhum'],
    ['movimento_pelo_modelo', '2.1.3.07', 'nenhum'],
    ['movimento_pelo_modelo', '2.1.4.10', 'nenhum'],
    ['movimento_pelo_modelo', '2.1.5.02', 'nenhum'],
    ['movimento_pelo_modelo', '55', 'entrada'],
    ['movimento_pelo_modelo', 'A/true', 'saida'],
    ['movimento_pelo_modelo', 'P/false', 'nenhum'],
    ['movimento_pelo_modelo', 'Sangria/false', 'nenhum'],
    ['movimento_pelo_modelo', 'Sangria/true', 'nenhum'],
    ['movimento_pelo_modelo', 'Suprimento/true', 'nenhum'],
    ['movimento_pelo_modelo', 'T/true', 'saida'],
    ['movimento_pelo_modelo', 'caixa_fechamento', 'nenhum'],
    ['sentido', 'E', 'entrada'],
    ['sentido', 'N', 'nenhum'],
    ['sentido', 'S', 'saida'],
    ['situacao', 'false', 'emitido'],
    ['situacao', 'true', 'cancelado'],
    ['situacao_pelo_modelo', '2.1.2.02', 'emitido'],
    ['situacao_pelo_modelo', '2.1.3.07', 'emitido'],
    ['situacao_pelo_modelo', '2.1.4.10', 'emitido'],
    ['situacao_pelo_modelo', '2.1.5.02', 'emitido'],
    ['situacao_pelo_modelo', '55', 'emitido'],
    ['situacao_pelo_modelo', 'A/true', 'emitido'],
    ['situacao_pelo_modelo', 'P/false', 'emitido'],
    ['situacao_pelo_modelo', 'Sangria/false', 'emitido'],
    ['situacao_pelo_modelo', 'Sangria/true', 'emitido'],
    ['situacao_pelo_modelo', 'Suprimento/true', 'emitido'],
    ['situacao_pelo_modelo', 'T/true', 'emitido'],
    ['situacao_pelo_modelo', 'caixa_fechamento', 'emitido'],
    ['status_baixa', 'true', 'valida'],
    ['status_parcela', 'false', 'pendente'],
    ['status_parcela', 'true', 'baixada'],
    ['tipo', '2.1.2.02', 'conta_pagar'],
    ['tipo', '2.1.3.07', 'conta_pagar'],
    ['tipo', '2.1.4.10', 'conta_pagar'],
    ['tipo', '2.1.5.02', 'conta_pagar'],
    ['tipo', '55', 'nota_entrada'],
    ['tipo', 'A/true', 'pedido'],
    ['tipo', 'P/false', 'orcamento'],
    ['tipo', 'Sangria/false', 'sangria'],
    ['tipo', 'Sangria/true', 'sangria'],
    ['tipo', 'Suprimento/true', 'suprimento'],
    ['tipo', 'T/true', 'pedido'],
    ['tipo', 'caixa_fechamento', 'fechamento_caixa'],
  ])
})

test('documento_negocio usa a situação pelo modelo quando o status vem vazio, e nada muda no ERP novo', async () => {
  const q = banco.cliente
  await q.query('begin')
  try {
    // Documentos da Link como o tradutor grava (spec 7.1; códigos e datas reais da cópia antiga) e dois do ERP novo.
    await q.query(`
      insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
      values ('link', 'negociacao', '1095', '1216', 'A/true', 'false', null, null, '2026-05-21 14:56:02.172769'),
             ('link', 'negociacao', '8', '2', 'A/true', 'true', null, null, '2026-04-11 19:07:18.453891'),
             ('link', 'negociacao', '1771', '5', 'P/false', null, null, null, '2026-06-10 15:16:04.450986'),
             ('link', 'caixa_fechamento', '7', '7', 'caixa_fechamento', null, null, null, '2026-04-13 13:42:21.195448'),
             ('link', 'nota_entrada', '15', '15', '55', null, null, null, '2026-05-20 15:38:20.752567'),
             ('meuerp', 'documento', '185', '50', 'PA', 'E', 'S', 'R', '2026-09-28 09:15:00'),
             ('meuerp', 'documento', '186', '51', '55', 'A', 'S', 'R', '2026-09-28 09:20:00')`)
    const { rows } = await q.query(`
      select fonte, origem_tabela, origem_id, tipo, status, situacao, movimento, financeiro
      from kaizen.documento_negocio order by id`)
    const linha = (
      fonte: string, origem_tabela: string, origem_id: string, tipo: string,
      status: string | null, situacao: string | null, movimento: string, financeiro: string,
    ) => ({ fonte, origem_tabela, origem_id, tipo, status, situacao, movimento, financeiro })
    assert.deepEqual(rows, [
      // Venda válida (caixa ativo) e venda cancelada (caixa inativo): a situação vem do status.
      linha('link', 'negociacao', '1095', 'pedido', 'false', 'emitido', 'saida', 'recebe'),
      linha('link', 'negociacao', '8', 'pedido', 'true', 'cancelado', 'saida', 'recebe'),
      // Sem status (orçamento, fechamento, nota), a situação vem pelo modelo.
      linha('link', 'negociacao', '1771', 'orcamento', null, 'emitido', 'nenhum', 'nenhum'),
      linha('link', 'caixa_fechamento', '7', 'fechamento_caixa', null, 'emitido', 'nenhum', 'nenhum'),
      linha('link', 'nota_entrada', '15', 'nota_entrada', null, 'emitido', 'entrada', 'nenhum'),
      // No ERP novo, nada muda: o pedido emitido segue emitido, e o 55 (a NF-e dele) com um status que a tradução
      // não tem fica com a situação vazia, como antes; a linha 55 da Link não vale para ele.
      linha('meuerp', 'documento', '185', 'pedido', 'E', 'emitido', 'saida', 'recebe'),
      linha('meuerp', 'documento', '186', 'nfe', 'A', null, 'saida', 'recebe'),
    ])
  } finally {
    await q.query('rollback')
  }
})

test('a de_para tem as 22 decisões da Link, todas de pessoa', async () => {
  const resumo = await banco.cliente.query(`
    select entidade, fonte, count(*)::int as linhas,
           count(*) filter (where codigo_kaizen like 'link:%')::int as falhas
    from kaizen.de_para group by entidade, fonte`)
  // Só decisões: nenhuma aponta para link:, que é como o tradutor grava as falhas.
  assert.deepEqual(resumo.rows, [{ entidade: 'pessoa', fonte: 'link', linhas: 22, falhas: 0 }])
  const { rows } = await banco.cliente.query(
    'select codigo_origem, codigo_kaizen from kaizen.de_para order by codigo_origem::bigint',
  )
  // Os 20 clientes sem CPF/CNPJ que têm o mesmo código e o mesmo nome nos dois cadastros ficam com o próprio código.
  const mesmoCodigo = ['21', '75', '84', '142', '145', '172', '212', '213', '214', '216',
    '236', '250', '274', '276', '279', '290', '298', '361', '384', '409'].map((codigo) => [codigo, codigo])
  assert.deepEqual(rows.map((linha) => [linha.codigo_origem, linha.codigo_kaizen]), [
    ...mesmoCodigo,
    ['10000199', '484'], // renumerado na migração para o ERP novo
    ['10000502', '999007'], // o Consumidor Final
  ])
})
