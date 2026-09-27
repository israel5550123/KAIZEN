import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Gera, uma vez, a migração com o saldo de cada produto na virada. O SQL gerado é commitado.
export const ARQUIVO_MEDICAO: string = fileURLToPath(new URL('../docs/medicoes/estoque-virada-2026-09-27.json', import.meta.url))
export const ARQUIVO_MIGRACAO: string = fileURLToPath(new URL('../sql/migracoes/004_estoque_virada.sql', import.meta.url))

type Medicao = { produtos?: Array<{ produto?: unknown; saldo?: unknown }> }

export function gerarSqlVirada(textoJson: string): string {
  const medicao = JSON.parse(textoJson) as Medicao
  if (!Array.isArray(medicao.produtos) || medicao.produtos.length === 0) {
    throw new Error('a medição não tem produtos')
  }
  const vistos = new Set<string>()
  // O saldo vai para o SQL como o texto medido, sem passar por número do JavaScript.
  const linhas = medicao.produtos.map(({ produto, saldo }, posicao) => {
    if (typeof produto !== 'string' || !/^[0-9]+$/.test(produto)) {
      throw new Error(`produto inválido na posição ${posicao}: ${JSON.stringify(produto)}`)
    }
    if (typeof saldo !== 'string' || !/^-?[0-9]+(\.[0-9]+)?$/.test(saldo)) {
      throw new Error(`saldo inválido do produto ${produto}: ${JSON.stringify(saldo)}`)
    }
    if (vistos.has(produto)) throw new Error(`produto repetido: ${produto}`)
    vistos.add(produto)
    return `  ('${produto}', ${saldo})`
  })
  return [
    '-- Gerado por ferramentas/gerar-virada.mts a partir de docs/medicoes/estoque-virada-2026-09-27.json (saldo de cada produto na virada, medido em 27/09/2026 às 13h38).',
    'insert into kaizen.estoque_virada (produto, quantidade) values',
    `${linhas.join(',\n')};`,
    '',
  ].join('\n')
}

if (import.meta.main) {
  const sql = gerarSqlVirada(readFileSync(ARQUIVO_MEDICAO, 'utf8'))
  writeFileSync(ARQUIVO_MIGRACAO, sql)
  const produtos = sql.split('\n').filter((linha) => linha.startsWith("  ('")).length
  console.log(`escrito sql/migracoes/004_estoque_virada.sql com ${produtos} produtos`)
}
