// Tradutor da Link: lê a cópia da Link (esquema erp, no mesmo banco do Kaizen) e grava a história no esquema kaizen.
// Todo o trabalho é SQL (sql/link/), numa transação só; nenhum valor passa pelo JavaScript.
import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'

export class ErroLink extends Error {}

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// Os arquivos de sql/link têm vários comandos; o pg devolve um resultado por comando, e o que importa é o do último.
async function rodar(cliente: Cliente, nome: string): Promise<Array<Record<string, string | null>>> {
  const resultado = (await cliente.query(lerSql(`link/${nome}.sql`))) as unknown as QueryResult | QueryResult[]
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado
  return ultimo.rows
}

export type ColunaLink = { tabela: string; coluna: string; tipo: string }

export function lerColunasEsperadasLink(): ColunaLink[] {
  return lerSql('link/colunas-esperadas.txt')
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '')
    .map((linha) => {
      const [tabela, coluna, tipo] = linha.split(' ')
      return { tabela, coluna, tipo }
    })
}

// Devolve 'tabela.coluna' de cada coluna esperada que não existe no esquema erp (vazio quando está tudo lá).
export async function conferirColunasLink(cliente: Cliente): Promise<string[]> {
  const colunas = lerColunasEsperadasLink()
  const faltam = await cliente.query(lerSql('link/colunas.sql'), [colunas.map((c) => c.tabela), colunas.map((c) => c.coluna)])
  return faltam.rows.map((linha) => `${linha.tabela}.${linha.coluna}`)
}

// Antes de abrir a transação: a cópia tem as colunas, o Kaizen já tem o cadastro do ERP novo, e a cópia tem negociações.
export async function conferirEntradaLink(cliente: Cliente): Promise<void> {
  const faltam = await conferirColunasLink(cliente)
  if (faltam.length > 0) throw new ErroLink(`a cópia da Link não tem as colunas esperadas: ${faltam.join(', ')}`)
  const cadastro = await cliente.query(`select count(*)::int as n from kaizen.produto where fonte = 'meuerp'`)
  if (cadastro.rows[0].n === 0) {
    throw new ErroLink('o cadastro do ERP novo ainda não está no Kaizen: rode antes o tradutor do ERP novo')
  }
  const negociacoes = await cliente.query('select count(*)::int as n from erp.negociacao')
  if (negociacoes.rows[0].n === 0) throw new ErroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?')
}

// Precisa de uma transação aberta: as temporárias de trabalho (pg_temp.link_*) somem no commit.
export async function ligarLink(cliente: Cliente): Promise<void> {
  await rodar(cliente, 'preparar')
  const invalidas = await rodar(cliente, 'ligar')
  if (invalidas.length > 0) {
    const lista = invalidas.map((l) => `${l.entidade} ${l.codigo_origem} → ${l.codigo_kaizen}`).join(', ')
    throw new ErroLink(`decisão da de_para aponta para código que não existe no ERP novo: ${lista}`)
  }
}

// As famílias de documento; o cadastro só da Link vem depois de todas, porque junta o que elas citam.
const FAMILIAS = ['vendas', 'caixa']

export type ContagensLink = { documentos: string; novos: string; itens: string; pagamentos: string; conferencias: string; parcelas: string; baixas: string }

export async function traduzirLink(cliente: Cliente): Promise<ContagensLink> {
  await conferirEntradaLink(cliente)
  return emTransacao(cliente, async () => {
    await ligarLink(cliente)
    for (const familia of FAMILIAS) await rodar(cliente, familia)
    await rodar(cliente, 'cadastros')
    const [contagens] = await rodar(cliente, 'gravar')
    return contagens as unknown as ContagensLink
  })
}
