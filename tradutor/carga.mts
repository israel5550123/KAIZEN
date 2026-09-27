import { readFileSync } from 'node:fs'
import type { QueryResult } from 'pg'
import type { Cliente } from './banco.mts'
import { LIMIAR_VIVOS } from './constantes.mts'

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

export type Apagado = { origem_id: string; codigo: string; tipo: string | null; criado_em: string; valor: string; vendedores: string | null }

// Spec 6.3, passo 7: com menos de 20 documentos do ERP novo no Kaizen, só a lista vazia é recusada.
const MOTIVO_VIVOS = 'a lista de documentos do ERP veio vazia ou menor que a metade; nada foi apagado'

export function podeApagar(noKaizen: number, vivos: number): { ok: true } | { ok: false; motivo: string } {
  if (noKaizen === 0) return { ok: true }
  if (vivos === 0) return { ok: false, motivo: MOTIVO_VIVOS }
  if (noKaizen >= LIMIAR_VIVOS && vivos * 2 < noKaizen) return { ok: false, motivo: MOTIVO_VIVOS }
  return { ok: true }
}

export async function apagarSumidos(cliente: Cliente): Promise<Apagado[]> {
  return (await rodarCarga(cliente, 'apagar')) as Apagado[]
}

export type CargaEstoque = { movimentos: number; foto: number; sumidos: Array<{ origem_id: string; produto: string }> }

export async function gravarEstoque(cliente: Cliente, completo: boolean): Promise<CargaEstoque> {
  // o arquivo SQL roda sem parâmetro; o marcador da leitura completa vai por esta tabela
  await cliente.query('drop table if exists pg_temp.parametro')
  await cliente.query('create temp table parametro (completo boolean not null) on commit drop')
  await cliente.query('insert into pg_temp.parametro (completo) values ($1)', [completo])
  const [resumo] = await rodarCarga(cliente, 'estoque')
  return {
    movimentos: Number(resumo.movimentos),
    foto: Number(resumo.foto),
    sumidos: resumo.sumidos as Array<{ origem_id: string; produto: string }>,
  }
}

export type CargaCadastros = { produtos: number; pessoas: number; funcionarios: number; fornecedores: number }

export async function gravarCadastros(cliente: Cliente): Promise<CargaCadastros> {
  const [resumo] = await rodarCarga(cliente, 'cadastros')
  return {
    produtos: Number(resumo.produtos),
    pessoas: Number(resumo.pessoas),
    funcionarios: Number(resumo.funcionarios),
    fornecedores: Number(resumo.fornecedores),
  }
}
