// Ensaio da Fase 2 com o ERP de verdade, só leitura. Grava só no Postgres local do PC.
// Uso:
//   node --env-file=.env ferramentas/ensaio.mts consultas        roda cada consulta do tradutor uma vez no ERP
//   node --env-file=.env ferramentas/ensaio.mts antes-da-virada  lista documentos acima do corte com data antes de 28/09
import { lerConfig } from '../tradutor/config.mts'
import { criarErp } from '../tradutor/erp.mts'
import { conectar, garantirLocal } from '../tradutor/banco.mts'
import { aplicarMigracoes } from '../tradutor/migracoes.mts'
import { lerCortes } from '../tradutor/kaizen.mts'
import {
  conferirColunas, conferirEmpresaLocal, lerVivos, lerDocumentosHora, lerDocumentosFaixa,
  lerEstoque, lerCadastros, lerAntesDaVirada, lerTotaisErp,
} from '../tradutor/leitura.mts'
import { TAMANHO_FATIA, PRIMEIRO_INICIO } from '../tradutor/constantes.mts'

async function medir(nome: string, fazer: () => Promise<string | unknown[]>): Promise<string | unknown[]> {
  const inicio = performance.now()
  const resultado = await fazer()
  const ms = Math.round(performance.now() - inicio)
  if (typeof resultado === 'string') {
    const valor = JSON.parse(resultado) as unknown
    const itens = Array.isArray(valor) ? `${valor.length} itens` : `chaves ${Object.keys(valor as object).join(', ')}`
    console.log(`${nome}: ${ms} ms, ${resultado.length} caracteres, ${itens}`)
  } else {
    console.log(`${nome}: ${ms} ms, ${resultado.length} itens ${JSON.stringify(resultado)}`)
  }
  return resultado
}

const modo = process.argv[2]
const config = lerConfig(process.env)
const erp = criarErp({ url: config.erpUrl, token: config.erpToken })
// O ensaio é só do PC: aplica migrações no banco de KAIZEN_URL, que tem de ser o Postgres local.
garantirLocal(config.kaizenUrl)
const cliente = await conectar(config.kaizenUrl)
try {
  await aplicarMigracoes(cliente)
  const cortes = await lerCortes(cliente)
  if (modo === 'consultas') {
    await medir('colunas que faltam', () => conferirColunas(erp))
    await medir('empresa e local diferentes de 1', () => conferirEmpresaLocal(erp, cortes))
    const vivos = JSON.parse(await medir('vivos', () => lerVivos(erp, cortes)) as string) as number[]
    const maior = vivos.length ? Math.max(...vivos) : cortes.documento
    await medir('documentos da hora', () =>
      lerDocumentosHora(erp, cortes, { novosAcimaDe: cortes.documento, inicio: PRIMEIRO_INICIO, pendentes: [] }))
    await medir('documentos, primeira fatia', () =>
      lerDocumentosFaixa(erp, cortes, cortes.documento + 1, cortes.documento + TAMANHO_FATIA))
    await medir('estoque completo', () => lerEstoque(erp, cortes, cortes.mercadoria_estoque_historico))
    await medir('cadastros', () => lerCadastros(erp))
    await medir('antes da virada', () => lerAntesDaVirada(erp, cortes))
    await medir('totais do ERP', () => lerTotaisErp(erp, cortes, maior, 2147483647))
  } else if (modo === 'antes-da-virada') {
    const texto = await lerAntesDaVirada(erp, cortes)
    console.log(JSON.stringify(JSON.parse(texto), null, 2))
  } else {
    console.error('uso: node --env-file=.env ferramentas/ensaio.mts consultas|antes-da-virada')
    process.exitCode = 2
  }
} finally {
  await cliente.end()
}
