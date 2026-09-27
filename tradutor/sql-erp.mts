import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PASTA_SQL_ERP = fileURLToPath(new URL('../sql/erp/', import.meta.url))

const NOME = /^[a-z_][a-z0-9_]*$/
const TIPOS = new Set(['integer', 'numeric', 'timestamp', 'varchar', 'text'])

export function modeloErp(nome: string): string {
  return readFileSync(join(PASTA_SQL_ERP, `${nome}.sql`), 'utf8').trim()
}

// O SQL da API do ERP não aceita parâmetro: todo valor entra no texto, e só depois de conferido aqui.
export function inteiro(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`inteiro inválido para o SQL do ERP: ${n}`)
  return String(n)
}

export function data(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`data inválida para o SQL do ERP: ${d}`)
  return `'${d}'`
}

export function inteiros(ns: number[]): string {
  return `array[${ns.map(inteiro).join(',')}]::integer[]`
}

export function pares(ps: Array<[string, string]>): string {
  if (ps.length === 0) throw new Error('lista de pares vazia')
  return ps
    .map(([tabela, coluna]) => {
      if (!NOME.test(tabela) || !NOME.test(coluna)) throw new Error(`nome inválido para o SQL do ERP: ${tabela}.${coluna}`)
      return `('${tabela}','${coluna}')`
    })
    .join(',')
}

export function montar(modelo: string, valores: Record<string, string>): string {
  const usados = new Set<string>()
  const texto = modelo.replace(/\{\{([a-z_][a-z0-9_]*)\}\}/g, (_marcador: string, nome: string) => {
    if (!Object.hasOwn(valores, nome)) throw new Error(`falta valor para {{${nome}}}`)
    usados.add(nome)
    return valores[nome]
  })
  if (texto.includes('{{') || texto.includes('}}')) throw new Error('sobrou marcador {{...}} malformado no SQL')
  for (const nome of Object.keys(valores)) {
    if (!usados.has(nome)) throw new Error(`valor sem marcador no SQL: ${nome}`)
  }
  return texto
}

export function lerColunasEsperadas(): Array<{ tabela: string; coluna: string; tipo: string }> {
  const texto = readFileSync(join(PASTA_SQL_ERP, 'colunas-esperadas.txt'), 'utf8')
  return texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const partes = linha.split(/\s+/)
      const [tabela, coluna, tipo] = partes
      if (partes.length !== 3 || !NOME.test(tabela) || !NOME.test(coluna) || !TIPOS.has(tipo)) {
        throw new Error(`linha inválida em colunas-esperadas.txt: ${linha}`)
      }
      return { tabela, coluna, tipo }
    })
}
