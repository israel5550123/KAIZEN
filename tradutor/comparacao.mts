import { readFileSync } from 'node:fs'
import { avisoTotalDiferente } from './avisos.mts'
import type { Cliente } from './banco.mts'
import type { Aviso } from './tipos.mts'

// Compara, por dia e por medida, os totais do ERP (sql/erp/totais.sql) com os do Kaizen; só lê.
export async function compararTotais(cliente: Cliente, totaisErp: string, documentoAte: number, movimentoAte: number): Promise<Aviso[]> {
  const sql = readFileSync(new URL('../sql/kaizen/comparar.sql', import.meta.url), 'utf8')
  // O texto do ERP vai inteiro ao Postgres ($1::jsonb): nenhum total passa por número do JavaScript.
  const r = await cliente.query<{ dia: string; medida: string; erp: string; kaizen: string }>(sql, [totaisErp, documentoAte, movimentoAte])
  return r.rows.map((l) => avisoTotalDiferente(l.dia, l.medida, l.erp, l.kaizen))
}
