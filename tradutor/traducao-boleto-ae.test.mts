import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { aplicarMigracoes, PASTA_MIGRACOES } from './migracoes.mts'
import { codigosSemTraducao } from './conferencias.mts'

// A migração 014 traduz os 2 códigos que a leitura de hora em hora das 10h de 29/09 achou sem tradução
// (docs/DECISOES.md, Fase 4, 29/09: "Pendência para o dono e para a conferência da Fase 2"). O banco recebe
// só até a 013: o primeiro teste precisa ver os 2 avisos antes da 014, e só ela os resolve.
const ATE_A_013 = readdirSync(PASTA_MIGRACOES)
  .filter((nome) => nome.endsWith('.sql') && nome <= '013_resposta.sql')
  .sort()

let banco: BancoTeste
let pasta: string

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'kaizen-migracoes-'))
  for (const nome of ATE_A_013) copyFileSync(join(PASTA_MIGRACOES, nome), join(pasta, nome))
  banco = await criarBancoKaizen({ migrar: false })
  await aplicarMigracoes(banco.cliente, pasta)
})

after(async () => {
  await banco?.fechar()
  if (pasta) rmSync(pasta, { recursive: true, force: true })
})

async function documento(
  origemId: string, modelo: string, status: string | null, movimento: string | null, financeiro: string | null, criadoEm: string,
): Promise<string> {
  const r = await banco.cliente.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro, criado_em)
     values ('meuerp', 'documento', $1, $1, $2, $3, $4, $5, $6) returning id`,
    [origemId, modelo, status, movimento, financeiro, criadoEm],
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

// Os 2 documentos reais de 29/09 do DECISOES.md: a nota de entrada 439, paga na forma 9 (Boleto, R$ 2.382,18),
// e o documento 450 de modelo AE (ajuste de custo pela formação de preços: sem estoque, financeiro nem natureza).
test('os documentos reais de 29/09 avisam exatamente a forma 9 e o tipo AE sem tradução; a migração 014 resolve os dois', async () => {
  const nota439 = await documento('439', '55', 'E', 'E', 'P', '2026-09-29 09:12:00')
  await pagamento(nota439, '1', '9', '2382.18')
  await documento('450', 'AE', 'E', null, null, '2026-09-29 10:18:00')

  assert.deepEqual(await codigosSemTraducao(banco.cliente), [
    { tipo: 'codigo_sem_traducao', chave: 'codigo:forma:9', texto: 'o código "9" de forma apareceu 1 vez(es) e não tem tradução no Kaizen' },
    { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:AE', texto: 'o código "AE" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen' },
  ])

  // Só a 014 vai para a pasta, não o resto do repositório (mesmo padrão de tradutor/traducao-operacao-real.test.mts).
  copyFileSync(join(PASTA_MIGRACOES, '014_traducao_boleto_ae.sql'), join(pasta, '014_traducao_boleto_ae.sql'))
  assert.deepEqual(await aplicarMigracoes(banco.cliente, pasta), ['014_traducao_boleto_ae.sql'])
  assert.deepEqual(await codigosSemTraducao(banco.cliente), [])
})

test('com a 014 aplicada, kaizen.traducao tem a forma 9 = boleto e o tipo AE = ajuste_custo', async () => {
  const { rows } = await banco.cliente.query(
    `select campo, codigo, valor from kaizen.traducao
     where fonte = 'meuerp' and (campo, codigo) in (('forma','9'), ('tipo','AE'))
     order by campo collate "C"`,
  )
  assert.deepEqual(rows, [
    { campo: 'forma', codigo: '9', valor: 'boleto' },
    { campo: 'tipo', codigo: 'AE', valor: 'ajuste_custo' },
  ])
})
