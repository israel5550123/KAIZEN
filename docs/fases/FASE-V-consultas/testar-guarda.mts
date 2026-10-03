import { verificarSomenteLeitura } from '/home/user/KAIZEN/tradutor/somente-leitura.mts'
import { readFileSync } from 'node:fs'
const linhas = readFileSync('consultas-erp-so-leitura.txt', 'utf8').split('\n').filter((l) => l.startsWith('node --env-file'))
for (const l of linhas) {
  const sql = l.slice(l.indexOf('"') + 1, l.lastIndexOf('"'))
  try { verificarSomenteLeitura(sql); console.log('passa:', sql.slice(0, 70)) } catch (e) { console.log('RECUSADA:', (e as Error).message) }
}
