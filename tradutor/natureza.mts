import { avisoNaturezaMudou } from './avisos.mts'
import type { Cliente } from './banco.mts'
import { rodarCarga } from './carga.mts'
import type { Erp } from './erp.mts'
import { modeloErp, montar } from './sql-erp.mts'
import type { Aviso } from './tipos.mts'

// Uma consulta a mais por execução: as naturezas da empresa 1 e a natureza de troca da configuração do ERP.
export async function lerNaturezas(erp: Erp): Promise<string> {
  return erp.consultar(montar(modeloErp('naturezas'), {}))
}

type Versao = {
  descricao: string | null; categoria: string | null
  estoque: boolean; reserva: boolean; financeiro: boolean; troca: boolean
}

// Na ordem do aviso (spec da Fase 4, seção 6).
const COLUNAS: Array<[keyof Versao, string]> = [
  ['categoria', 'categoria'],
  ['estoque', 'mexe no estoque'],
  ['reserva', 'reserva estoque'],
  ['financeiro', 'mexe no financeiro'],
  ['troca', 'é a troca'],
  ['descricao', 'descrição'],
]

function emPalavras(valor: string | boolean | null): string {
  if (valor === true) return 'sim'
  if (valor === false) return 'não'
  return valor ?? 'vazia'
}

// Roda dentro da transação da leitura, depois de colocarEntrada('naturezas') e antes de gravarDocumentos:
// o documento novo recebe a versão gravada aqui. Devolve um aviso por natureza que o Kaizen já tinha e mudou.
export async function gravarNaturezas(cliente: Cliente): Promise<Aviso[]> {
  const linhas = (await rodarCarga(cliente, 'naturezas')) as Array<{ id: string; codigo: string; antes: Versao; depois: Versao }>
  return linhas.map((l) => {
    const mudancas = COLUNAS
      .filter(([coluna]) => l.antes[coluna] !== l.depois[coluna])
      .map(([coluna, nome]) => `${nome}: ${emPalavras(l.antes[coluna])} → ${emPalavras(l.depois[coluna])}`)
    return avisoNaturezaMudou(l.codigo, l.depois.descricao, l.id, mudancas)
  })
}
