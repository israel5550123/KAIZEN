// Consulta livre ao ERP, só leitura, para as conferências da operação real (Tarefa 19).
// Uso: node --env-file=.env ferramentas/consultar-erp.mts "select ... from documento where ..."
import { verificarSomenteLeitura } from '../tradutor/somente-leitura.mts'
import { criarErp } from '../tradutor/erp.mts'
import { lerConfig } from '../tradutor/config.mts'

export function embrulhar(sql: string): string {
  const interna = verificarSomenteLeitura(sql)
  return `select coalesce(json_agg(x), '[]')::text as dados from (${interna}) x`
}

if (import.meta.main) {
  const sql = process.argv[2]
  if (!sql) {
    console.error('uso: node --env-file=.env ferramentas/consultar-erp.mts "<SELECT>"')
    process.exit(2)
  }
  const config = lerConfig(process.env)
  const erp = criarErp({ url: config.erpUrl, token: config.erpToken })
  const dados = await erp.consultar(embrulhar(sql))
  const linhas = JSON.parse(dados) as unknown[]
  console.log(JSON.stringify(linhas, null, 2))
  console.log(`${linhas.length} linha(s)`)
}
