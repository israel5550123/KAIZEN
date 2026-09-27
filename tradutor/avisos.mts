import type { Apagado } from './carga.mts'
import type { Horario } from './janela.mts'
import type { Aviso, TipoAviso } from './tipos.mts'

// Arredonda meio-par em 2 casas só com inteiros (BigInt): o texto do Postgres nunca passa por number do JavaScript.
export function formatarReais(valor: string): string {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(valor)
  if (!partes) throw new Error(`valor que não é número: ${valor}`)
  const [, sinal, inteira, fracao = ''] = partes
  let centavos: bigint
  if (fracao.length <= 2) {
    centavos = BigInt(inteira + fracao.padEnd(2, '0'))
  } else {
    const escala = 10n ** BigInt(fracao.length - 2)
    const bruto = BigInt(inteira + fracao)
    const quociente = bruto / escala
    const dobroDoResto = (bruto % escala) * 2n
    const sobe = dobroDoResto > escala || (dobroDoResto === escala && quociente % 2n === 1n)
    centavos = sobe ? quociente + 1n : quociente
  }
  const digitos = centavos.toString().padStart(3, '0')
  const reais = digitos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const negativo = sinal === '-' && centavos !== 0n
  return `${negativo ? '−' : ''}R$ ${reais},${digitos.slice(-2)}`
}

export function diaMes(dataOuTimestamp: string): string {
  const partes = /^\d{4}-(\d{2})-(\d{2})/.exec(dataOuTimestamp)
  if (!partes) throw new Error(`data que não começa por AAAA-MM-DD: ${dataOuTimestamp}`)
  return `${partes[2]}/${partes[1]}`
}

export function avisoCodigoSemTraducao(campo: string, codigo: string, quantidade: number): Aviso {
  return {
    tipo: 'codigo_sem_traducao',
    chave: `codigo:${campo}:${codigo}`,
    texto: `o código "${codigo}" de ${campo} apareceu ${quantidade} vez(es) e não tem tradução no Kaizen`,
  }
}

export function avisoDocumentoApagado(a: Apagado): Aviso {
  return {
    tipo: 'documento_apagado',
    chave: `apagado:${a.origem_id}`,
    texto: `o ${a.tipo ?? 'documento'} ${a.codigo} de ${diaMes(a.criado_em)} (${formatarReais(a.valor)}${a.vendedores ? `, vendedor ${a.vendedores}` : ''}) sumiu do ERP`,
  }
}

export function avisoFechamentoComResto(codigo: string, criadoEm: string, origemId: string): Aviso {
  return {
    tipo: 'fechamento_com_resto',
    chave: `fechamento:${origemId}`,
    texto: `o fechamento ${codigo} de ${diaMes(criadoEm)} pode estar com a conferência de um teste de 26/09; a quebra desse turno não é confiável`,
  }
}

export function avisoEstoqueDiverge(produto: string, esperado: string, foto: string, ultimoOid: string | null): Aviso {
  return {
    tipo: 'estoque_diverge',
    chave: `estoque:${produto}:${ultimoOid ?? 'virada'}:${foto}`,
    texto: `o saldo do produto ${produto} no ERP (${foto}) não bate com os movimentos (${esperado})`,
  }
}

export function avisoMovimentoSumiu(origemId: string, produto: string): Aviso {
  return {
    tipo: 'movimento_sumiu',
    chave: `movimento:${origemId}`,
    texto: `um movimento de estoque do produto ${produto} sumiu do ERP`,
  }
}

export function avisoTotalDiferente(dia: string, medida: string, erp: string, kaizen: string): Aviso {
  return {
    tipo: 'total_diferente',
    chave: `total:${dia}:${medida}:${erp}:${kaizen}`,
    texto: `em ${diaMes(dia)}, ${medida}: ERP ${erp}, Kaizen ${kaizen}`,
  }
}

export function avisoExecucaoFaltou(h: Horario): Aviso {
  return {
    tipo: 'execucao_faltou',
    chave: `faltou:${h.data}:${h.hora}`,
    texto: `a leitura das ${h.hora}h de ${diaMes(h.data)} não aconteceu`,
  }
}

export function avisoExecucaoPulada(idQueSegura: number): Aviso {
  return {
    tipo: 'execucao_pulada',
    chave: `pulada:${idQueSegura}`,
    texto: 'uma leitura foi pulada porque a anterior ainda estava rodando',
  }
}

// Na ordem de TipoAviso: é a ordem dos grupos no resumo das 22h.
export const TITULOS: Record<TipoAviso, string> = {
  codigo_sem_traducao: 'Códigos novos no ERP',
  documento_apagado: 'Documentos apagados no ERP',
  fechamento_com_resto: 'Fechamentos com linha de teste',
  estoque_diverge: 'Estoque que não bate',
  movimento_sumiu: 'Movimentos de estoque sumidos',
  total_diferente: 'Totais diferentes do ERP',
  execucao_faltou: 'Leituras que não aconteceram',
  execucao_pulada: 'Leituras puladas',
}

const LEVAR_AO_CLAUDE = 'leve este resumo à próxima sessão com o Claude'

export const O_QUE_FAZER: Record<TipoAviso, string> = {
  codigo_sem_traducao: LEVAR_AO_CLAUDE,
  documento_apagado: 'pergunte à gerente ou ao suporte',
  fechamento_com_resto: 'a quebra desse turno não é confiável',
  estoque_diverge: LEVAR_AO_CLAUDE,
  movimento_sumiu: LEVAR_AO_CLAUDE,
  total_diferente: LEVAR_AO_CLAUDE,
  execucao_faltou: LEVAR_AO_CLAUDE,
  execucao_pulada: LEVAR_AO_CLAUDE,
}
