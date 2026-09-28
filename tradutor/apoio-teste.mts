import { conectar, garantirLocal } from './banco.mts'
import type { Cliente } from './banco.mts'
import { aplicarMigracoes } from './migracoes.mts'

export const URL_ADMIN = 'postgres://postgres@localhost:5434/postgres'
export const SENHA_KAIZEN_LOCAL = 'kaizen-local'

export type BancoTeste = { nome: string; url: string; cliente: Cliente; fechar(): Promise<void> }

let contador = 0

export function urlDoBanco(nome: string, usuario: 'postgres' | 'kaizen'): string {
  if (usuario === 'kaizen') return `postgres://kaizen:${SENHA_KAIZEN_LOCAL}@localhost:5434/${nome}`
  return `postgres://postgres@localhost:5434/${nome}`
}

async function comoAdmin(url: string, sql: string): Promise<void> {
  garantirLocal(url)
  const admin = await conectar(url)
  try {
    await admin.query(sql)
  } finally {
    await admin.end()
  }
}

export async function criarBancoKaizen(opcoes: { migrar?: boolean } = {}): Promise<BancoTeste> {
  garantirLocal(URL_ADMIN)
  contador += 1
  const nome = `kaizen_teste_${process.pid}_${contador}`
  // Um banco com o mesmo nome só sobra de uma rodada que morreu no meio; é lixo de teste.
  await comoAdmin(URL_ADMIN, `drop database if exists ${nome} with (force)`)
  await comoAdmin(URL_ADMIN, `create database ${nome}`)
  await comoAdmin(urlDoBanco(nome, 'postgres'), 'create schema kaizen authorization kaizen')
  const url = urlDoBanco(nome, 'kaizen')
  garantirLocal(url)
  const cliente = await conectar(url)
  const banco: BancoTeste = {
    nome,
    url,
    cliente,
    async fechar() {
      await cliente.end().catch(() => undefined)
      await comoAdmin(URL_ADMIN, `drop database if exists ${nome} with (force)`)
    },
  }
  if (opcoes.migrar !== false) {
    try {
      await aplicarMigracoes(cliente)
    } catch (erro) {
      await banco.fechar()
      throw erro
    }
  }
  return banco
}
