import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import type { Cliente } from './banco.mts'

function lerCarga(nome: string): string {
  return readFileSync(new URL(`../sql/carga/${nome}.sql`, import.meta.url), 'utf8')
}

// Os arquivos de sql/carga têm vários comandos; o pg devolve um resultado por comando, e o resumo é o do último.
async function rodarCarga(cliente: Cliente, nome: string): Promise<Array<Record<string, unknown>>> {
  const resultado = (await cliente.query(lerCarga(nome))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export async function colocarEntrada(
  cliente: Cliente,
  assunto: 'documentos' | 'vivos' | 'estoque' | 'cadastros',
  partes: string[],
): Promise<void> {
  await cliente.query(lerCarga('entrada'))
  for (const [i, parte] of partes.entries()) {
    // o texto do ERP vai inteiro ao Postgres, que o lê como jsonb: nenhum valor vira número do JavaScript
    await cliente.query(
      'insert into pg_temp.entrada (assunto, parte, dados) values ($1, $2, $3::jsonb)',
      [assunto, i + 1, parte],
    )
  }
}

export type CargaDocumentos = { lidos: number; novos: number }

export async function gravarDocumentos(cliente: Cliente): Promise<CargaDocumentos> {
  const [resumo] = await rodarCarga(cliente, 'documentos')
  return { lidos: Number(resumo.lidos), novos: Number(resumo.novos) }
}
