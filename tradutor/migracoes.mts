import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'
import { ErroKaizen } from './tipos.mts'

export const PASTA_MIGRACOES: string = fileURLToPath(new URL('../sql/migracoes/', import.meta.url))

export async function aplicarMigracoes(cliente: Cliente, pasta: string = PASTA_MIGRACOES): Promise<string[]> {
  await cliente.query(
    'create table if not exists kaizen.migracao (nome text primary key, aplicada_em timestamptz not null default now())',
  )
  const { rows } = await cliente.query<{ nome: string }>('select nome from kaizen.migracao')
  const jaAplicadas = new Set(rows.map((linha) => linha.nome))
  const nomes = readdirSync(pasta).filter((nome) => nome.endsWith('.sql')).sort()
  const aplicadasAgora: string[] = []
  for (const nome of nomes) {
    if (jaAplicadas.has(nome)) continue
    const sql = readFileSync(join(pasta, nome), 'utf8')
    try {
      await emTransacao(cliente, async () => {
        await cliente.query(sql)
        await cliente.query('insert into kaizen.migracao (nome) values ($1)', [nome])
      })
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      throw new ErroKaizen({ tipo: 'outra', detalhe: `a migração ${nome} não se aplicou: ${mensagem}` })
    }
    aplicadasAgora.push(nome)
  }
  return aplicadasAgora
}
