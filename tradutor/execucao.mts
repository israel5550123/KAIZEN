import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'
import { avisoDocumentoApagado, avisoExecucaoPulada, avisoMovimentoSumiu } from './avisos.mts'
import { apagarSumidos, colocarEntrada, gravarCadastros, gravarDocumentos, gravarEstoque, podeApagar } from './carga.mts'
import { compararTotais } from './comparacao.mts'
import { avisosDeFaltas, codigosSemTraducao, estoqueDiverge, fechamentosComResto } from './conferencias.mts'
import { FOLGA_OID, PRAZO_MIN, TAMANHO_FATIA, TRAVA } from './constantes.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { calcularRespostas, diasDaHistoria } from './indicadores.mts'
import { emFortaleza, horariosFaltando, inicioDaJanela, proximoHorario, rotuloHora } from './janela.mts'
import { contarDocumentosErp, lerCortes, maiorOid, oidsComParcelaAberta } from './kaizen.mts'
import {
  conferirColunas, conferirEmpresaLocal, lerCadastros, lerDocumentosFaixa, lerDocumentosHora,
  lerEstoque, lerTotaisErp, lerVivos,
} from './leitura.mts'
import { aplicarMigracoes } from './migracoes.mts'
import { gravarNaturezas, lerNaturezas } from './natureza.mts'
import {
  anteriorValida, avisosParaResumo, execucaoPresa, horaDaUltimaBoa, marcarInterrompidas, marcarResumo,
  marcarTelegram, registrarFim, registrarInicio, registrarPulada, ultimaNoiteBoa, ultimoInicioNaoManualMs,
} from './registro.mts'
import type { Anterior } from './registro.mts'
import { deveAvisarFalha, deveAvisarVolta, textoFalha, textoResumo, textoVolta } from './telegram.mts'
import type { Enviar } from './telegram.mts'
import { ErroKaizen } from './tipos.mts'
import type { Aviso, Cortes, MotivoFalha, Resultado, TipoExecucao } from './tipos.mts'

export type Dependencias = {
  erp: Erp
  conectarKaizen: () => Promise<Cliente>
  enviar: Enviar
  agora: () => number
  pastaMigracoes?: string
}

export type Saida = { resultado: Resultado; avisos: Aviso[]; mensagem: string | null; contagens: Record<string, number> }

type Opcoes = { tipo: TipoExecucao; manual: boolean }

// O que o caminho da falha precisa saber do que já aconteceu nesta execução.
// gravou: a carga desta execução já foi gravada (a noite ainda compara os totais depois).
type Estado = { id: number | null; anterior: Anterior | null; avisos: Aviso[]; faltaram: boolean; gravou: boolean }

// Sem conexão, senha recusada, banco inexistente, banco subindo; e as quedas no meio da execução:
// Postgres reiniciado ou desligando, erro de conexão do Postgres, conexão cortada pela rede.
const CODIGOS_BANCO_FORA = new Set([
  'ECONNREFUSED', '28P01', '3D000', '57P03',
  '57P01', '57P02', '08000', '08003', '08006', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT',
])

function mensagemDe(erro: unknown): string {
  if (erro instanceof Error) {
    if (erro.message) return erro.message
    // A recusa de conexão do Node chega como AggregateError sem mensagem, só com o código.
    const codigo = (erro as { code?: unknown }).code
    return typeof codigo === 'string' ? codigo : erro.name
  }
  return String(erro)
}

export function motivoDe(erro: unknown): MotivoFalha {
  if (erro instanceof ErroKaizen) return erro.motivo
  if (erro instanceof ErroErp) {
    if (erro.tipo === 'token') return { tipo: 'token', detalhe: erro.message }
    if (erro.tipo === 'rede' || erro.tipo === 'http') return { tipo: 'erp_fora', detalhe: erro.message }
    return { tipo: 'outra', detalhe: erro.message }
  }
  const codigo = (erro as { code?: unknown } | null)?.code
  if (typeof codigo === 'string' && CODIGOS_BANCO_FORA.has(codigo)) return { tipo: 'banco_fora', detalhe: mensagemDe(erro) }
  // O pg avisa a conexão que caiu sem código, só pela mensagem ('Connection terminated unexpectedly').
  if (erro instanceof Error && erro.message.startsWith('Connection terminated')) return { tipo: 'banco_fora', detalhe: erro.message }
  return { tipo: 'outra', detalhe: mensagemDe(erro) }
}

// Nenhum erro do envio pode impedir o resto do registro.
async function enviarSemErro(enviar: Enviar, texto: string): Promise<boolean | null> {
  try {
    return await enviar(texto)
  } catch {
    return false
  }
}

// 'às 15h' no mesmo dia; 'em 30/09 às 8h' quando a próxima leitura é em outro dia.
function textoProximo(agoraMs: number): string {
  const hoje = emFortaleza(agoraMs).data
  const proximo = proximoHorario(agoraMs)
  const rotulo = rotuloHora(proximo, hoje)
  return proximo.data === hoje ? `às ${rotulo}` : `em ${rotulo}`
}

async function existeExecucao(cliente: Cliente): Promise<boolean> {
  const r = await cliente.query<{ existe: boolean }>(`select to_regclass('kaizen.execucao') is not null as existe`)
  return r.rows[0].existe
}

// A execução que está rodando (sem fim): a que segura a trava, ou a desta própria leitura no estouro do prazo.
async function idDaAberta(cliente: Cliente): Promise<number | null> {
  const r = await cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao where fim is null')
  return r.rows[0].id === null ? null : Number(r.rows[0].id)
}

// Resumo das 22h: junta os avisos desde o último resumo enviado. Devolve o resultado do envio, ou undefined se não enviou.
async function enviarResumo(cliente: Cliente, enviar: Enviar, id: number, agora: number): Promise<boolean | null | undefined> {
  const { avisos, chavesAnteriores } = await avisosParaResumo(cliente)
  const resumo = textoResumo(avisos, chavesAnteriores, emFortaleza(agora).data)
  if (resumo.texto === null) {
    // Dia limpo: não chega nada, e o próximo resumo começa daqui.
    await marcarResumo(cliente, id, [])
    return undefined
  }
  const ok = await enviarSemErro(enviar, resumo.texto)
  // Se o Telegram recusou, estes avisos vão de novo no próximo resumo.
  if (ok !== false) await marcarResumo(cliente, id, resumo.chaves)
  return ok
}

async function conferirVivos(cliente: Cliente, vivos: number): Promise<void> {
  const pode = podeApagar(await contarDocumentosErp(cliente), vivos)
  if (!pode.ok) throw new ErroKaizen({ tipo: 'outra', detalhe: pode.motivo })
}

// Na noite, o movimento do Kaizen que não voltou do ERP é apagado. Uma lista que veio vazia ou com menos da
// metade apagaria o histórico: é falha, com a mesma regra da lista de documentos vivos.
async function conferirMovimentos(cliente: Cliente, textoEstoque: string): Promise<void> {
  const r = await cliente.query<{ n: string }>(`select count(*) as n from kaizen.estoque_movimento where fonte = 'meuerp'`)
  // Do JSON só sai a contagem; os saldos continuam texto e vão inteiros ao Postgres.
  const lidos = (JSON.parse(textoEstoque) as { movimentos: unknown[] }).movimentos.length
  if (!podeApagar(Number(r.rows[0].n), lidos).ok) {
    throw new ErroKaizen({ tipo: 'outra', detalhe: 'a lista de movimentos do ERP veio vazia ou menor que a metade; nada foi apagado' })
  }
}

// A consulta ao ERP tem no máximo 30 s; uma fatia que passa disso volta como erro de consulta.
async function lerFatia(erp: Erp, cortes: Cortes, de: number, ate: number): Promise<string> {
  try {
    return await lerDocumentosFaixa(erp, cortes, de, ate)
  } catch (erro) {
    if (erro instanceof ErroErp && erro.tipo === 'consulta') {
      throw new ErroKaizen({ tipo: 'outra', detalhe: `a fatia de documentos de oid ${de} a ${ate} falhou: ${erro.message}` })
    }
    throw erro
  }
}

export async function executar(opcoes: Opcoes, dep: Dependencias): Promise<Saida> {
  const agora = dep.agora()
  const hora = emFortaleza(agora).hora
  let cliente: Cliente
  try {
    cliente = await dep.conectarKaizen()
  } catch (erro) {
    // Sem banco não há trava, registro nem estado: a mensagem sai a cada execução enquanto durar a queda.
    const motivo: MotivoFalha = { tipo: 'banco_fora', detalhe: `o banco do Kaizen não respondeu: ${mensagemDe(erro)}` }
    await enviarSemErro(dep.enviar, textoFalha(hora, motivo, null, textoProximo(agora)))
    return { resultado: 'falha', avisos: [], mensagem: motivo.detalhe, contagens: {} }
  }
  const estado: Estado = { id: null, anterior: null, avisos: [], faltaram: false, gravou: false }
  let travou = false
  try {
    const trava = await cliente.query<{ ok: boolean }>('select pg_try_advisory_lock($1) as ok', [TRAVA])
    travou = trava.rows[0].ok
    if (!travou) {
      if (!(await existeExecucao(cliente))) return { resultado: 'pulada', avisos: [], mensagem: null, contagens: {} }
      if ((await execucaoPresa(cliente, PRAZO_MIN[opcoes.tipo])) !== null) {
        throw new ErroKaizen({ tipo: 'outra', detalhe: 'a leitura anterior ficou presa além do prazo' })
      }
      const aviso = avisoExecucaoPulada((await idDaAberta(cliente)) ?? 0)
      await registrarPulada(cliente, opcoes.tipo, opcoes.manual, aviso)
      return { resultado: 'pulada', avisos: [aviso], mensagem: null, contagens: {} }
    }
    await aplicarMigracoes(cliente, dep.pastaMigracoes)
    estado.id = await registrarInicio(cliente, opcoes.tipo, opcoes.manual)
    await marcarInterrompidas(cliente, estado.id)
    estado.anterior = await anteriorValida(cliente, estado.id)
    return await rodar(cliente, opcoes, dep, estado, estado.id, agora)
  } catch (erro) {
    return await falhar(cliente, opcoes, dep, estado, erro, agora)
  } finally {
    if (travou) await cliente.query('select pg_advisory_unlock($1)', [TRAVA]).catch(() => undefined)
    await cliente.end().catch(() => undefined)
  }
}

async function rodar(cliente: Cliente, opcoes: Opcoes, dep: Dependencias, estado: Estado, id: number, agora: number): Promise<Saida> {
  const erp = dep.erp
  const noite = opcoes.tipo === 'noite'
  if (!opcoes.manual) {
    const faltando = horariosFaltando(await ultimoInicioNaoManualMs(cliente, id), agora)
    estado.faltaram = faltando.length > 0
    estado.avisos.push(...avisosDeFaltas(faltando))
  }

  const cortes = await lerCortes(cliente)
  const faltam = await conferirColunas(erp)
  if (faltam.length > 0) {
    throw new ErroKaizen({ tipo: 'estrutura', detalhe: `colunas que sumiram do ERP: ${faltam.join(', ')}` })
  }
  const outras = await conferirEmpresaLocal(erp, cortes)
  if (outras.length > 0) {
    const lista = outras.map((o) => `${o.tabela}=${o.valor}`).join(', ')
    throw new ErroKaizen({ tipo: 'estrutura', detalhe: `apareceu outra empresa ou local de estoque: ${lista}` })
  }

  let documentos: string[]
  let textoVivos: string
  // Na noite, o maior oid da lista de vivos é o limite da releitura e da comparação de totais.
  let maiorVivo = cortes.documento
  if (noite) {
    // A noite relê todo documento acima do corte, qualquer que seja a data: primeiro a lista de vivos, depois as fatias.
    textoVivos = await lerVivos(erp, cortes)
    const vivos = JSON.parse(textoVivos) as number[]
    await conferirVivos(cliente, vivos.length)
    maiorVivo = vivos.reduce((maior, oid) => Math.max(maior, oid), cortes.documento)
    documentos = []
    for (let de = cortes.documento + 1; de <= maiorVivo; de += TAMANHO_FATIA) {
      documentos.push(await lerFatia(erp, cortes, de, de + TAMANHO_FATIA - 1))
    }
  } else {
    const maiorDocumento = (await maiorOid(cliente, 'documento')) ?? cortes.documento
    const selecao = {
      novosAcimaDe: Math.max(cortes.documento, maiorDocumento - FOLGA_OID),
      inicio: inicioDaJanela(agora, await ultimaNoiteBoa(cliente)),
      pendentes: await oidsComParcelaAberta(cliente),
    }
    documentos = [await lerDocumentosHora(erp, cortes, selecao)]
    textoVivos = await lerVivos(erp, cortes)
    await conferirVivos(cliente, (JSON.parse(textoVivos) as number[]).length)
  }

  const maiorMovimento = (await maiorOid(cliente, 'estoque_movimento')) ?? cortes.mercadoria_estoque_historico
  const movimentosAcimaDe = noite
    ? cortes.mercadoria_estoque_historico
    : Math.max(cortes.mercadoria_estoque_historico, maiorMovimento - FOLGA_OID)
  const textoEstoque = await lerEstoque(erp, cortes, movimentosAcimaDe)
  if (noite) await conferirMovimentos(cliente, textoEstoque)
  const textoCadastros = await lerCadastros(erp)
  // Depois dos documentos: a natureza que um documento lido usa já existe no ERP quando as naturezas são lidas.
  const textoNaturezas = await lerNaturezas(erp)

  // Os avisos da carga só valem se ela for gravada: ficam aqui até o commit.
  const avisosDaCarga: Aviso[] = []
  const carga = await emTransacao(cliente, async () => {
    await colocarEntrada(cliente, 'documentos', documentos)
    await colocarEntrada(cliente, 'vivos', [textoVivos])
    await colocarEntrada(cliente, 'estoque', [textoEstoque])
    await colocarEntrada(cliente, 'cadastros', [textoCadastros])
    await colocarEntrada(cliente, 'naturezas', [textoNaturezas])
    // Cadastros antes, para o aviso de documento apagado já ter o nome do vendedor.
    const cadastros = await gravarCadastros(cliente)
    // Naturezas antes dos documentos, para o documento novo receber a versão desta leitura.
    avisosDaCarga.push(...(await gravarNaturezas(cliente)))
    const lidos = await gravarDocumentos(cliente)
    avisosDaCarga.push(...(await fechamentosComResto(cliente)))
    const apagados = await apagarSumidos(cliente)
    avisosDaCarga.push(...apagados.map(avisoDocumentoApagado))
    // Na noite a leitura é completa: movimento que não voltou sumiu do ERP.
    const estoque = await gravarEstoque(cliente, noite)
    avisosDaCarga.push(...estoque.sumidos.map((s) => avisoMovimentoSumiu(s.origem_id, s.produto)))
    return { cadastros, lidos, apagados: apagados.length, estoque }
  })
  estado.gravou = true
  estado.avisos.push(...avisosDaCarga)
  estado.avisos.push(...(await codigosSemTraducao(cliente)))
  estado.avisos.push(...(await estoqueDiverge(cliente)))
  if (noite) {
    // Depois de gravar, só lendo: os totais de cada dia no ERP e no Kaizen, até o maior oid lido.
    const movimentoAte = (await maiorOid(cliente, 'estoque_movimento')) ?? cortes.mercadoria_estoque_historico
    const totais = await lerTotaisErp(erp, cortes, maiorVivo, movimentoAte)
    estado.avisos.push(...(await compararTotais(cliente, totais, maiorVivo, movimentoAte)))
  }

  // Depois das conferências, as três respostas: a hora calcula hoje; a noite, todos os dias desde 01/04/2026.
  const hoje = emFortaleza(agora).data
  let respostas: number
  try {
    respostas = await calcularRespostas(cliente, noite ? diasDaHistoria(hoje) : [hoje])
  } catch (erro) {
    throw new ErroKaizen({ tipo: 'indicadores', detalhe: mensagemDe(erro) })
  }

  const contagens: Record<string, number> = {
    documentos_lidos: carga.lidos.lidos,
    documentos_novos: carga.lidos.novos,
    apagados: carga.apagados,
    movimentos: carga.estoque.movimentos,
    foto: carga.estoque.foto,
    produtos: carga.cadastros.produtos,
    pessoas: carga.cadastros.pessoas,
    funcionarios: carga.cadastros.funcionarios,
    fornecedores: carga.cadastros.fornecedores,
    avisos: estado.avisos.length,
    respostas,
  }
  const resultado: Resultado = estado.avisos.length > 0 ? 'aviso' : 'ok'
  await registrarFim(cliente, id, { resultado, mensagem: null, contagens, avisos: estado.avisos })

  // Os dados já estão gravados: um erro daqui em diante não pode virar falha da leitura.
  let ultimoEnvio: boolean | null | undefined
  if (deveAvisarVolta(resultado, estado.anterior, estado.faltaram)) {
    ultimoEnvio = await enviarSemErro(dep.enviar, textoVolta(emFortaleza(agora).hora))
  }
  if (noite) {
    const doResumo = await enviarResumo(cliente, dep.enviar, id, agora).catch(() => false)
    // Com volta, telegram_ok guarda o resultado dela, para a próxima repetir a volta recusada. O resumo tem o
    // seu próprio registro: resumo_ok só é marcado quando o Telegram aceita, e os avisos vão para o resumo seguinte.
    if (doResumo !== undefined && ultimoEnvio === undefined) ultimoEnvio = doResumo
  }
  if (ultimoEnvio !== undefined) await marcarTelegram(cliente, id, ultimoEnvio).catch(() => undefined)
  return { resultado, avisos: estado.avisos, mensagem: null, contagens }
}

async function falhar(cliente: Cliente, opcoes: Opcoes, dep: Dependencias, estado: Estado, erro: unknown, agora: number): Promise<Saida> {
  const motivo = motivoDe(erro)
  // Falha antes do registro (trava presa, migração): registra se o banco deixar.
  if (estado.id === null) {
    try {
      estado.id = await registrarInicio(cliente, opcoes.tipo, opcoes.manual)
      estado.anterior = await anteriorValida(cliente, estado.id)
    } catch {
      // sem a tabela execucao, a falha fica só na mensagem
    }
  }
  let horaBoa: number | null = null
  if (estado.gravou && motivo.tipo !== 'indicadores') {
    // A carga desta execução foi gravada e a falha veio depois (a comparação da noite): os dados são os desta hora.
    // Se o que falhou foi o cálculo, as respostas continuam as da última execução boa.
    horaBoa = emFortaleza(agora).hora
  } else {
    try {
      horaBoa = await horaDaUltimaBoa(cliente, estado.id)
    } catch {
      horaBoa = null
    }
  }
  if (estado.id !== null) {
    await registrarFim(cliente, estado.id, { resultado: 'falha', mensagem: motivo.detalhe, avisos: estado.avisos }).catch(() => undefined)
    // A noite que falha depois de gravar a sua linha manda o resumo mesmo assim.
    if (opcoes.tipo === 'noite') await enviarResumo(cliente, dep.enviar, estado.id, agora).catch(() => undefined)
  }
  if (deveAvisarFalha(estado.anterior)) {
    const ok = await enviarSemErro(dep.enviar, textoFalha(emFortaleza(agora).hora, motivo, horaBoa, textoProximo(agora)))
    if (estado.id !== null) await marcarTelegram(cliente, estado.id, ok).catch(() => undefined)
  } else if (estado.id !== null) {
    // A queda já foi avisada e a mensagem chegou: esta falha herda o "já avisado", senão a próxima avisaria de novo.
    await marcarTelegram(cliente, estado.id, estado.anterior?.telegramOk ?? null).catch(() => undefined)
  }
  return { resultado: 'falha', avisos: estado.avisos, mensagem: motivo.detalhe, contagens: {} }
}

// Chamada pelo comando quando a execução passa do prazo: com uma conexão nova, marca como falha
// a execução que ficou aberta e manda a mensagem, se for o caso. Na noite, o resumo sai antes.
export async function registrarEstouro(opcoes: Opcoes, dep: Dependencias): Promise<void> {
  const agora = dep.agora()
  const hora = emFortaleza(agora).hora
  let cliente: Cliente | null = null
  let id: number | null = null
  let anterior: Anterior | null = null
  let horaBoa: number | null = null
  try {
    cliente = await dep.conectarKaizen()
    id = await idDaAberta(cliente)
    if (id !== null) {
      await registrarFim(cliente, id, { resultado: 'falha', mensagem: `a leitura das ${hora}h passou do prazo`, avisos: [] })
    }
    anterior = await anteriorValida(cliente, id)
    horaBoa = await horaDaUltimaBoa(cliente, id)
    if (opcoes.tipo === 'noite' && id !== null) await enviarResumo(cliente, dep.enviar, id, agora)
  } catch {
    // sem banco, a mensagem sai mesmo assim
  }
  if (deveAvisarFalha(anterior)) {
    const motivo: MotivoFalha = { tipo: 'outra', detalhe: 'passou do prazo' }
    const ok = await enviarSemErro(dep.enviar, textoFalha(hora, motivo, horaBoa, textoProximo(agora)))
    if (cliente !== null && id !== null) await marcarTelegram(cliente, id, ok).catch(() => undefined)
  } else if (cliente !== null && id !== null) {
    // Queda já avisada: a linha herda o "já avisado", como em falhar.
    await marcarTelegram(cliente, id, anterior?.telegramOk ?? null).catch(() => undefined)
  }
  await cliente?.end().catch(() => undefined)
}
