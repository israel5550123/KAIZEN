import type { Cliente } from './banco.mts'
import type { Cortes, TabelaCorte } from './tipos.mts'

const TABELAS_CORTE: TabelaCorte[] = [
  'documento', 'documento_mercadoria', 'documento_pagamento', 'documento_parcela',
  'documento_parcela_pagamento', 'documento_conferencia_caixa',
  'documento_cancelamento_historico', 'mercadoria_estoque_historico',
]

export async function lerCortes(cliente: Cliente): Promise<Cortes> {
  const r = await cliente.query<{ tabela: string; oid: string }>(
    `select tabela, oid from kaizen.corte where fonte = 'meuerp'`,
  )
  const lidos = new Map(r.rows.map((l) => [l.tabela, Number(l.oid)]))
  const cortes = {} as Cortes
  for (const tabela of TABELAS_CORTE) {
    const oid = lidos.get(tabela)
    if (oid === undefined) throw new Error(`falta o corte da tabela ${tabela} no Kaizen`)
    cortes[tabela] = oid
  }
  return cortes
}

export async function maiorOid(cliente: Cliente, tabela: 'documento' | 'estoque_movimento'): Promise<number | null> {
  // origem_id é texto: o máximo precisa ser numérico, senão '999' ganharia de '1000'
  const sql = tabela === 'documento'
    ? `select max(origem_id::bigint) as maior from kaizen.documento where fonte = 'meuerp'`
    : `select max(origem_id::bigint) as maior from kaizen.estoque_movimento where fonte = 'meuerp'`
  const r = await cliente.query<{ maior: string | null }>(sql)
  const maior = r.rows[0].maior
  return maior === null ? null : Number(maior)
}

export async function oidsComParcelaAberta(cliente: Cliente): Promise<number[]> {
  // A parcela a receber (venda no crédito, boleto) entra pela leitura das 22h, que relê tudo.
  const r = await cliente.query<{ oid: string }>(
    `select distinct d.origem_id::bigint as oid
       from kaizen.documento d
       join kaizen.parcela p on p.documento_id = d.id
      where d.fonte = 'meuerp' and d.financeiro = 'P' and p.status is distinct from 'B'
      order by 1`,
  )
  return r.rows.map((l) => Number(l.oid))
}

export async function contarDocumentosErp(cliente: Cliente): Promise<number> {
  const r = await cliente.query<{ quantos: string }>(
    `select count(*) as quantos from kaizen.documento where fonte = 'meuerp'`,
  )
  return Number(r.rows[0].quantos)
}
