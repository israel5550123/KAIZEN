// Só para testes: a "Link falsa", o esquema erp do banco de teste só com as colunas de sql/link/colunas-esperadas.txt,
// e os casos reais da cópia antiga (tradutor/link-casos.json, com nomes, CPF e CNPJ inventados).
import { readFileSync } from 'node:fs'
import { conectar, garantirLocal } from './banco.mts'
import type { Cliente } from './banco.mts'
import { urlDoBanco } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { lerColunasEsperadasLink } from './link.mts'

export type LinhaCaso = Record<string, string | null>
// As chaves são os nomes das tabelas do erp ('negociacao', 'caixa', ...) e 'kaizen.produto', 'kaizen.pessoa', 'kaizen.funcionario'.
export type CasosLink = Record<string, LinhaCaso[]>

export type LinkFalsa = {
  inserir(tabela: string, linhas: LinhaCaso[]): Promise<void> // no esquema erp do banco de teste, como postgres
  executar(sql: string): Promise<void> // um comando qualquer como postgres no banco de teste (para os testes mexerem na Link)
  fechar(): Promise<void> // fecha a conexão de postgres; o esquema some com o banco de teste
}

const NOME = /^[a-z_][a-z0-9_]*$/
const LINHAS_POR_INSERT = 500
// O tipo da lista no create table. 'character' sem tamanho seria char(1), e a UF tem 2 letras: bpchar não tem tamanho.
const TIPO_NA_TABELA: Record<string, string> = {
  bigint: 'bigint',
  boolean: 'boolean',
  character: 'bpchar',
  date: 'date',
  integer: 'integer',
  numeric: 'numeric',
  timestamp: 'timestamp',
  varchar: 'varchar',
}
// O cadastro do ERP novo dos casos, gravado no Kaizen pelo cliente do kaizen, como o tradutor da Fase 2 o grava.
const CADASTRO_DO_ERP_NOVO = ['kaizen.produto', 'kaizen.pessoa', 'kaizen.funcionario']

export function lerCasosLink(): CasosLink {
  const texto = readFileSync(new URL('./link-casos.json', import.meta.url), 'utf8')
  const casos = JSON.parse(texto) as Record<string, Array<Record<string, unknown>>>
  // Nenhum valor passa por número do JavaScript: no arquivo, todo valor é texto ou vazio.
  for (const [chave, linhas] of Object.entries(casos)) {
    for (const linha of linhas) {
      for (const [coluna, valor] of Object.entries(linha)) {
        if (valor !== null && typeof valor !== 'string') {
          throw new Error(`link-casos.json: ${chave}.${coluna} não é texto: ${JSON.stringify(valor)}`)
        }
      }
    }
  }
  return casos as CasosLink
}

// Insere em lotes, com parâmetros: cada valor vai como o texto do arquivo, e o Postgres o converte para o tipo da coluna.
async function inserirEmLotes(cliente: Cliente, esquema: string, tabela: string, linhas: LinhaCaso[]): Promise<void> {
  if (!NOME.test(esquema) || !NOME.test(tabela)) throw new Error(`nome de tabela inválido: ${esquema}.${tabela}`)
  for (let inicio = 0; inicio < linhas.length; inicio += LINHAS_POR_INSERT) {
    const lote = linhas.slice(inicio, inicio + LINHAS_POR_INSERT)
    const colunas: string[] = []
    for (const linha of lote) {
      for (const coluna of Object.keys(linha)) if (!colunas.includes(coluna)) colunas.push(coluna)
    }
    for (const coluna of colunas) if (!NOME.test(coluna)) throw new Error(`nome de coluna inválido: ${coluna}`)
    const valores: Array<string | null> = []
    const tuplas = lote.map((linha) => {
      const marcadores = colunas.map((coluna) => {
        valores.push(linha[coluna] ?? null)
        return `$${valores.length}`
      })
      return `(${marcadores.join(', ')})`
    })
    await cliente.query(`insert into ${esquema}.${tabela} (${colunas.join(', ')}) values ${tuplas.join(', ')}`, valores)
  }
}

// Cria o esquema erp no banco de teste (como postgres), uma tabela por tabela de sql/link/colunas-esperadas.txt, só com as
// colunas da lista, todas aceitando nulo e sem chave, e dá usage e select ao kaizen, como depois de uma restauração.
export async function criarLinkFalsa(banco: BancoTeste): Promise<LinkFalsa> {
  const url = urlDoBanco(banco.nome, 'postgres')
  garantirLocal(url)
  const admin = await conectar(url)
  try {
    const colunasPorTabela = new Map<string, string[]>()
    for (const { tabela, coluna, tipo } of lerColunasEsperadasLink()) {
      if (!NOME.test(tabela) || !NOME.test(coluna) || !Object.hasOwn(TIPO_NA_TABELA, tipo)) {
        throw new Error(`linha inválida em sql/link/colunas-esperadas.txt: ${tabela} ${coluna} ${tipo}`)
      }
      colunasPorTabela.set(tabela, [...(colunasPorTabela.get(tabela) ?? []), `${coluna} ${TIPO_NA_TABELA[tipo]}`])
    }
    await admin.query('create schema erp')
    for (const [tabela, colunas] of colunasPorTabela) {
      await admin.query(`create table erp.${tabela} (${colunas.join(', ')})`)
    }
    await admin.query('grant usage on schema erp to kaizen')
    await admin.query('grant select on all tables in schema erp to kaizen')
  } catch (erro) {
    await admin.end().catch(() => undefined)
    throw erro
  }
  return {
    async inserir(tabela: string, linhas: LinhaCaso[]): Promise<void> {
      await inserirEmLotes(admin, 'erp', tabela, linhas)
    },
    async executar(sql: string): Promise<void> {
      await admin.query(sql)
    },
    async fechar(): Promise<void> {
      await admin.end().catch(() => undefined)
    },
  }
}

// Insere todas as linhas do erp dos casos na Link falsa, e o cadastro do ERP novo dos casos (kaizen.produto, kaizen.pessoa,
// kaizen.funcionario, fonte meuerp) pelo cliente do kaizen, com as colunas que vierem no arquivo.
export async function carregarCasosLink(falsa: LinkFalsa, cliente: Cliente, casos: CasosLink = lerCasosLink()): Promise<void> {
  for (const [chave, linhas] of Object.entries(casos)) {
    if (!CADASTRO_DO_ERP_NOVO.includes(chave)) await falsa.inserir(chave, linhas)
  }
  for (const chave of CADASTRO_DO_ERP_NOVO) {
    const [esquema, tabela] = chave.split('.')
    await inserirEmLotes(cliente, esquema, tabela, casos[chave] ?? [])
  }
}
