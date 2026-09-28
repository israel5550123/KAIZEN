// Só para testes: um Postgres com as tabelas do ERP, reduzidas às colunas de colunas-esperadas.txt.
import { conectar, garantirLocal, type Cliente } from './banco.mts'
import { URL_ADMIN, urlDoBanco } from './apoio-teste.mts'
import { ErroErp, type Erp } from './erp.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import { verificarSomenteLeitura } from './somente-leitura.mts'

export type ErpFalso = {
  erp: Erp
  cliente: Cliente
  consultas: string[]
  inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void>
  fechar(): Promise<void>
}

const NOME = /^[a-z_][a-z0-9_]*$/
const LINHAS_POR_INSERT = 500
let contador = 0

async function comoAdmin(sql: string): Promise<void> {
  garantirLocal(URL_ADMIN)
  const admin = await conectar(URL_ADMIN)
  try {
    await admin.query(sql)
  } finally {
    await admin.end()
  }
}

export async function criarErpFalso(): Promise<ErpFalso> {
  contador++
  const nome = `erp_teste_${process.pid}_${contador}`
  await comoAdmin(`drop database if exists ${nome} with (force)`)
  await comoAdmin(`create database ${nome}`)
  // Sem estatísticas, o Postgres estima custo alto e compila as consultas grandes (cadastros) com JIT:
  // 1,5 s por chamada em vez de milissegundos. Desligado no banco, vale para toda conexão a ele.
  await comoAdmin(`alter database ${nome} set jit = off`)
  const url = urlDoBanco(nome, 'postgres')
  garantirLocal(url)
  const cliente = await conectar(url)
  // A sessão do ERP de verdade está em America/Sao_Paulo, com DateStyle ISO, DMY.
  await cliente.query(`set time zone 'America/Sao_Paulo'`)
  await cliente.query(`set datestyle = 'ISO, DMY'`)

  const colunasPorTabela = new Map<string, string[]>()
  for (const c of lerColunasEsperadas()) {
    const colunas = colunasPorTabela.get(c.tabela) ?? []
    colunas.push(`${c.coluna} ${c.tipo}`)
    colunasPorTabela.set(c.tabela, colunas)
  }
  for (const [tabela, colunas] of colunasPorTabela) {
    await cliente.query(`create table public.${tabela} (${colunas.join(', ')})`)
  }

  const consultas: string[] = []

  const erp: Erp = {
    async consultar(sql: string): Promise<string> {
      let texto: string
      try {
        texto = verificarSomenteLeitura(sql)
      } catch (erro) {
        throw new ErroErp('recusado', erro instanceof Error ? erro.message : String(erro))
      }
      consultas.push(texto)
      let linhas: Array<Record<string, unknown>>
      try {
        linhas = (await cliente.query(texto)).rows
      } catch (erro) {
        // A API do ERP responde 400 quando o SQL falha.
        throw new ErroErp('consulta', erro instanceof Error ? erro.message : String(erro), 400)
      }
      const dados = linhas.length === 1 ? linhas[0].dados : undefined
      if (typeof dados !== 'string') throw new ErroErp('consulta', 'resposta sem a coluna dados')
      return dados
    },
  }

  async function inserir(tabela: string, linhas: Array<Record<string, unknown>>): Promise<void> {
    if (!NOME.test(tabela)) throw new Error(`nome de tabela inválido: ${tabela}`)
    for (let inicio = 0; inicio < linhas.length; inicio += LINHAS_POR_INSERT) {
      const lote = linhas.slice(inicio, inicio + LINHAS_POR_INSERT)
      const colunas: string[] = []
      for (const linha of lote) {
        for (const chave of Object.keys(linha)) if (!colunas.includes(chave)) colunas.push(chave)
      }
      for (const coluna of colunas) if (!NOME.test(coluna)) throw new Error(`nome de coluna inválido: ${coluna}`)
      const valores: unknown[] = []
      const tuplas = lote.map((linha) => {
        const marcadores = colunas.map((coluna) => {
          valores.push(linha[coluna] ?? null)
          return `$${valores.length}`
        })
        return `(${marcadores.join(', ')})`
      })
      await cliente.query(`insert into public.${tabela} (${colunas.join(', ')}) values ${tuplas.join(', ')}`, valores)
    }
  }

  async function fechar(): Promise<void> {
    await cliente.end()
    await comoAdmin(`drop database if exists ${nome} with (force)`)
  }

  return { erp, cliente, consultas, inserir, fechar }
}
