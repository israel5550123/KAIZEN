import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { ARQUIVO_MEDICAO, ARQUIVO_MIGRACAO, gerarSqlVirada } from '../ferramentas/gerar-virada.mts'

let banco: BancoTeste

before(async () => {
  banco = await criarBancoKaizen()
})

after(async () => {
  await banco?.fechar()
})

test('a virada tem 1.029 produtos, 714 com estoque, 54.660,5 unidades e nenhum negativo', async () => {
  const totais = await banco.cliente.query(`
    select count(*)::int as produtos,
           count(*) filter (where quantidade > 0)::int as com_estoque,
           count(*) filter (where quantidade < 0)::int as negativos,
           sum(quantidade) = 54660.5 as soma_certa,
           sum(quantidade) as soma
    from kaizen.estoque_virada`)
  assert.deepEqual(totais.rows[0], {
    produtos: 1029,
    com_estoque: 714,
    negativos: 0,
    soma_certa: true,
    soma: '54660.500000',
  })
  // O primeiro e o último produto da medição, com o saldo exatamente como foi medido.
  const pontas = await banco.cliente.query(
    `select produto, quantidade from kaizen.estoque_virada where produto in ('60', '5369') order by produto collate "C"`,
  )
  assert.deepEqual(pontas.rows, [
    { produto: '5369', quantidade: '16.000000' },
    { produto: '60', quantidade: '3.000000' },
  ])
})

test('o gerador, rodado de novo, produz exatamente o arquivo que está no repositório', () => {
  const gerado = gerarSqlVirada(readFileSync(ARQUIVO_MEDICAO, 'utf8'))
  assert.equal(gerado, readFileSync(ARQUIVO_MIGRACAO, 'utf8'))
  assert.equal(gerarSqlVirada(readFileSync(ARQUIVO_MEDICAO, 'utf8')), gerado)
  assert.equal(gerado.split('\n').filter((linha) => linha.startsWith("  ('")).length, 1029)
})

test('o gerador recusa produto ou saldo que não sejam o número em texto', () => {
  const medicao = (produtos: unknown[]) => JSON.stringify({ produtos })
  assert.throws(() => gerarSqlVirada(medicao([])), { message: 'a medição não tem produtos' })
  assert.throws(
    () => gerarSqlVirada(medicao([{ produto: '60', saldo: '1); drop table kaizen.corte; --' }])),
    { message: 'saldo inválido do produto 60: "1); drop table kaizen.corte; --"' },
  )
  assert.throws(() => gerarSqlVirada(medicao([{ produto: '60', saldo: 3 }])), { message: 'saldo inválido do produto 60: 3' })
  assert.throws(
    () => gerarSqlVirada(medicao([{ produto: "60'", saldo: '1.000000' }])),
    { message: `produto inválido na posição 0: "60'"` },
  )
  assert.throws(
    () => gerarSqlVirada(medicao([{ produto: '60', saldo: '1.000000' }, { produto: '60', saldo: '2.000000' }])),
    { message: 'produto repetido: 60' },
  )
})
