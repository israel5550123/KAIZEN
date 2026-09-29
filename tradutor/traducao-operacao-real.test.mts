import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'
import { codigosSemTraducao } from './conferencias.mts'

// A migração 009 traduz os 7 códigos que a primeira leitura da operação real (28/09/2026, 17h23) achou sem
// tradução (docs/superpowers/plans/2026-09-28-fase2-conferencia-codigos.md). O banco recebe só até a 008: o
// primeiro teste precisa ver os 7 avisos antes da 009, e só ela os resolve. A 010 entra junto desde o começo: a
// conferência de códigos lê a natureza do documento, que só existe a partir dela.
const ATE_A_008 = readdirSync(PASTA_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql') && (nome <= '008_de_para_link_resposta_dono.sql' || nome === '010_natureza.sql'))
  .sort()

let banco: BancoTeste
let pasta: string

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const nome of ATE_A_008) copyFileSync(join(PASTA_MIGRACOES, nome), join(pasta, nome))
  banco = await criarBancoKaizen({ migrar: false })
  await aplicarMigracoes(banco.cliente, pasta)
})

after(async () => {
  await banco?.fechar()
  if (pasta) rmSync(pasta, { recursive: true, force: true })
})

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

async function documento(
  origemId: string, codigo: string, modelo: string, status: string | null,
  movimento: string | null, financeiro: string | null, criadoEm: string, turno: [number, number, number] | null = null,
): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em, turno_caixa, turno_usuario, turno_numero)
     values ('meuerp', 'documento', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [origemId, codigo, modelo, status, movimento, financeiro, criadoEm, turno?.[0] ?? null, turno?.[1] ?? null, turno?.[2] ?? null],
  )
  return r.rows[0].id
}

async function pagamento(documentoId: string, origemId: string, forma: string, valor: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
     values ($1, 'documento_pagamento', $2, $3, $4)`,
    [documentoId, origemId, forma, valor],
  )
}

async function parcela(documentoId: string, origemId: string, valor: string, status: string, descricao: string | null = null): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, valor, status, descricao)
     values ($1, 'documento_parcela', $2, $3, $4, $5)`,
    [documentoId, origemId, valor, status, descricao],
  )
}

async function conferenciaCaixa(documentoId: string, origemId: string, forma: string, calculado: string, informado: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, $4, $5)`,
    [documentoId, origemId, forma, calculado, informado],
  )
}

// Os 8 documentos reais do plano (seção "Documentos reais para os testes", ERP 28/09/2026). Nenhum item: nenhum
// teste deste arquivo olha para documento_item.
async function gravarDocumentosReais(): Promise<void> {
  const pedido209 = await documento('264', '209', 'PA', 'E', 'S', 'R', '2026-09-28 10:19:52')
  await pagamento(pedido209, '134', '6', '110.00')

  const pedido221 = await documento('280', '221', 'PA', 'E', 'S', 'R', '2026-09-28 10:50:16')
  await pagamento(pedido221, '141', '6', '18.00')
  await pagamento(pedido221, '142', '7', '500.00')

  const pedido324 = await documento('442', '324', 'PA', 'E', 'S', 'R', '2026-09-28 15:03:30')
  await pagamento(pedido324, '252', '8', '185.61')

  await documento('377', '273', 'MN', 'S', null, null, '2026-06-28 13:14:18')
  await documento('394', '290', 'MN', 'O', null, null, '2026-09-22 13:07:31')
  await documento('242', '150', 'EM', 'E', 'N', 'N', '2026-09-28 08:59:21')

  const conta365 = await documento('501', '365', 'CP', 'E', 'E', 'P', '2026-09-28 00:00:00')
  await parcela(conta365, '372', '114.90', 'C', 'INTERNET - PARC 3/9')
  await parcela(conta365, '404', '114.90', 'P')
  await parcela(conta365, '439', '114.90', 'P')
  await parcela(conta365, '457', '114.90', 'P')

  const fc417 = await documento('600', '417', 'FC', 'E', 'N', 'N', '2026-09-28 17:55:09', [1, 18153, 3])
  await conferenciaCaixa(fc417, '1', '1', '604.80', '606.80')
  await conferenciaCaixa(fc417, '2', '2', '43.20', '43.20')
  await conferenciaCaixa(fc417, '3', '3', '0.00', '0.00')
  await conferenciaCaixa(fc417, '4', '4', '160.90', '160.90')
  await conferenciaCaixa(fc417, '5', '5', '0.00', '0.00')
  await conferenciaCaixa(fc417, '6', '6', '2535.48', '2535.48')
  await conferenciaCaixa(fc417, '7', '7', '500.00', '500.00')
  await conferenciaCaixa(fc417, '8', '8', '185.61', '185.61')
}

// Este teste roda primeiro e aplica a migração 009 no banco do arquivo: os dois testes seguintes dependem do
// banco já migrado e destes documentos gravados (mesmo padrão de tradutor/link-migracao.test.mts).
test('os documentos reais de 28/09 avisam exatamente os 7 códigos sem tradução do ERP; a migração 009 resolve todos', async () => {
  await gravarDocumentosReais()

  assert.deepEqual(await codigosSemTraducao(banco.cliente), [
    { tipo: 'codigo_sem_traducao', chave: 'codigo:forma:6', texto: 'o código "6" de forma apareceu 3 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:forma:7', texto: 'o código "7" de forma apareceu 2 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:forma:8', texto: 'o código "8" de forma apareceu 2 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:situacao:S', texto: 'o código "S" de situacao apareceu 1 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:status_parcela:C', texto: 'o código "C" de status_parcela apareceu 1 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:EM', texto: 'o código "EM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:MN', texto: 'o código "MN" de tipo apareceu 2 vez(es) e não tem tradução no Kaizen' },
  ])

  // Só a 009 vai para a pasta, não o resto do repositório: uma 010 futura não pode fazer este teste de conteúdo
  // (o que a 009 resolve) depender do que vier depois dela (tradutor/link-migracao.test.mts, tradutor/migracoes.test.mts).
  copyFileSync(join(PASTA_MIGRACOES, '009_traducao_operacao_real.sql'), join(pasta, '009_traducao_operacao_real.sql'))
  assert.deepEqual(await aplicarMigracoes(banco.cliente, pasta), ['009_traducao_operacao_real.sql'])
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])
})

test('com a 009 aplicada, documento_negocio traduz os manifestos e o EM, e a ficha do pedido 221 traz pix e credito', async () => {
  const { rows } = await banco.cliente.query(
    `select origem_id, tipo, situacao from kaizen.documento_negocio where origem_id in ('377', '394', '242') order by origem_id::bigint`,
  )
  assert.deepEqual(rows, [
    { origem_id: '242', tipo: 'alteracao_em_massa', situacao: 'emitido' },
    { origem_id: '377', tipo: 'manifesto_nfe', situacao: 'pendente' },
    { origem_id: '394', tipo: 'manifesto_nfe', situacao: 'conferido' },
  ])

  const pedido221 = await banco.cliente.query<{ id: string }>(`select id from kaizen.documento where origem_id = '280'`)
  const ficha = await banco.cliente.query(lerSql('kaizen/ficha-venda.sql'), [pedido221.rows[0].id])
  assert.deepEqual(
    (ficha.rows[0].ficha as { pagamentos: Array<{ forma: string; valor: string }> }).pagamentos,
    [{ forma: 'pix', valor: '18.00' }, { forma: 'credito', valor: '500.00' }],
  )
})

test('a tradução da fonte meuerp tem 55 linhas: as 48 da carga inicial mais as 7 da conferência da operação real', async () => {
  const total = await banco.cliente.query(`select count(*)::int as linhas from kaizen.traducao where fonte = 'meuerp'`)
  assert.equal(total.rows[0].linhas, 55)
  const { rows } = await banco.cliente.query(
    `select campo, codigo, valor from kaizen.traducao
     where fonte = 'meuerp'
       and (campo, codigo) in (('forma','6'), ('forma','7'), ('forma','8'), ('situacao','S'), ('status_parcela','C'), ('tipo','EM'), ('tipo','MN'))
     order by campo collate "C", codigo collate "C"`,
  )
  assert.deepEqual(rows, [
    { campo: 'forma', codigo: '6', valor: 'pix' },
    { campo: 'forma', codigo: '7', valor: 'credito' },
    { campo: 'forma', codigo: '8', valor: 'debito' },
    { campo: 'situacao', codigo: 'S', valor: 'pendente' },
    { campo: 'status_parcela', codigo: 'C', valor: 'cancelada' },
    { campo: 'tipo', codigo: 'EM', valor: 'alteracao_em_massa' },
    { campo: 'tipo', codigo: 'MN', valor: 'manifesto_nfe' },
  ])
})
