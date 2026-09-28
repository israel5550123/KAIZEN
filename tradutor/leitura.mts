import type { Erp } from './erp.mts'
import type { Cortes } from './tipos.mts'
import { data, inteiro, inteiros, lerColunasEsperadas, modeloErp, montar, pares } from './sql-erp.mts'

export type SelecaoHora = { novosAcimaDe: number; inicio: string; pendentes: number[] }

type SelecaoDocumentos = SelecaoHora & { faixaDe: number; faixaAte: number }

// Valores que desligam um critério da consulta de documentos: nenhum oid passa de 2147483647
// (maior integer do Postgres), nenhuma data chega a 9999-12-31, e a faixa 1..0 é vazia.
const NENHUM_OID = 2147483647
const NENHUMA_DATA = '9999-12-31'

// O SQL da API não aceita parâmetro: todo valor passa por inteiro(), data() ou inteiros(),
// que recusam o que não for número inteiro ou data 'AAAA-MM-DD' antes de a consulta sair.
function valoresDocumentos(cortes: Cortes, s: SelecaoDocumentos): Record<string, string> {
  return {
    corte_documento: inteiro(cortes.documento),
    corte_item: inteiro(cortes.documento_mercadoria),
    corte_pagamento: inteiro(cortes.documento_pagamento),
    corte_parcela: inteiro(cortes.documento_parcela),
    corte_baixa: inteiro(cortes.documento_parcela_pagamento),
    corte_conferencia: inteiro(cortes.documento_conferencia_caixa),
    corte_cancelamento: inteiro(cortes.documento_cancelamento_historico),
    novos_acima_de: inteiro(s.novosAcimaDe),
    inicio: data(s.inicio),
    pendentes: inteiros(s.pendentes),
    faixa_de: inteiro(s.faixaDe),
    faixa_ate: inteiro(s.faixaAte),
  }
}

export async function conferirColunas(erp: Erp): Promise<string[]> {
  const lista = lerColunasEsperadas().map((c): [string, string] => [c.tabela, c.coluna])
  const texto = await erp.consultar(montar(modeloErp('colunas'), { pares: pares(lista) }))
  return JSON.parse(texto) as string[]
}

export async function conferirEmpresaLocal(erp: Erp, cortes: Cortes): Promise<Array<{ tabela: string; valor: number }>> {
  const sql = montar(modeloErp('empresa-local'), {
    corte_documento: inteiro(cortes.documento),
    corte_historico: inteiro(cortes.mercadoria_estoque_historico),
  })
  return JSON.parse(await erp.consultar(sql)) as Array<{ tabela: string; valor: number }>
}

export async function lerDocumentosHora(erp: Erp, cortes: Cortes, selecao: SelecaoHora): Promise<string> {
  const valores = valoresDocumentos(cortes, { ...selecao, faixaDe: 1, faixaAte: 0 })
  return erp.consultar(montar(modeloErp('documentos'), valores))
}

export async function lerDocumentosFaixa(erp: Erp, cortes: Cortes, de: number, ate: number): Promise<string> {
  const valores = valoresDocumentos(cortes, { novosAcimaDe: NENHUM_OID, inicio: NENHUMA_DATA, pendentes: [], faixaDe: de, faixaAte: ate })
  return erp.consultar(montar(modeloErp('documentos'), valores))
}

export async function lerVivos(erp: Erp, cortes: Cortes): Promise<string> {
  return erp.consultar(montar(modeloErp('vivos'), { corte_documento: inteiro(cortes.documento) }))
}

export async function lerEstoque(erp: Erp, cortes: Cortes, movimentosAcimaDe: number): Promise<string> {
  // Nunca desce abaixo do corte, mesmo que o chamador erre a conta.
  const acimaDe = Math.max(cortes.mercadoria_estoque_historico, movimentosAcimaDe)
  return erp.consultar(montar(modeloErp('estoque'), { movimentos_acima_de: inteiro(acimaDe) }))
}

export async function lerCadastros(erp: Erp): Promise<string> {
  return erp.consultar(montar(modeloErp('cadastros'), {}))
}

export async function lerAntesDaVirada(erp: Erp, cortes: Cortes): Promise<string> {
  return erp.consultar(montar(modeloErp('antes-da-virada'), { corte_documento: inteiro(cortes.documento) }))
}

// Noite: totais por dia no ERP, com os mesmos filtros da carga, até o maior oid lido nesta execução.
export async function lerTotaisErp(erp: Erp, cortes: Cortes, documentoAte: number, movimentoAte: number): Promise<string> {
  const sql = montar(modeloErp('totais'), {
    corte_documento: inteiro(cortes.documento),
    corte_item: inteiro(cortes.documento_mercadoria),
    corte_pagamento: inteiro(cortes.documento_pagamento),
    corte_parcela: inteiro(cortes.documento_parcela),
    corte_baixa: inteiro(cortes.documento_parcela_pagamento),
    corte_conferencia: inteiro(cortes.documento_conferencia_caixa),
    corte_historico: inteiro(cortes.mercadoria_estoque_historico),
    documento_ate: inteiro(documentoAte),
    movimento_ate: inteiro(movimentoAte),
  })
  return erp.consultar(sql)
}
