import { readFileSync } from 'node:fs'
import { conectar } from './banco.mts'
import type { Cliente } from './banco.mts'
import { diaMes, formatarReais } from './avisos.mts'
import { HORA_DA_NOITE, HORAS_DA_HORA } from './constantes.mts'
import { emFortaleza, horarioEsperado, somarDias } from './janela.mts'

type Dados = {
  vendas: { dias: Array<{ dia: string; vendas: number; total: string }>; vendas: number; total: string }
  contas: { parcelas: number; total: string; trocas: number; trocas_total: string; tela: number; tela_total: string }
  fechamentos: Array<{
    codigo: string; quando: string; caixa: number | null; usuario: number | null; abertura: number | null
    formas: Array<{ forma: string | null; codigo_forma: string; calculado: string; informado: string; quebra: string }>; quebra: string
  }>
  produtos: Array<{ produto: string; descricao: string | null; quantidade: string | null; tem_foto: boolean; lido: string | null }>
  execucoes: { primeira: string | null; linhas: Array<{ dia: string; hora: number; resultado: string | null; telegram: boolean | null }> }
  noite: { dia: string; resultado: string; mensagem: string | null; diferencas: string[] } | null
}

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`
}

// '54660.5' → '54.660,5'; '-1' → '−1'. O texto vem do Postgres (trim_scale), sem passar por number.
function formatarQuantidade(texto: string): string {
  const partes = /^(-?)(\d+)(?:\.(\d+))?$/.exec(texto)
  if (!partes) return texto
  const inteira = partes[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${partes[1] ? '−' : ''}${inteira}${partes[3] ? `,${partes[3]}` : ''}`
}

function textoExecucoes(execucoes: Dados['execucoes'], agoraMs: number): string[] {
  const primeira = execucoes.primeira
  if (primeira === null) return ['- nenhuma execução agendada registrada ainda']
  const agora = emFortaleza(agoraMs)
  const linhas: string[] = []
  let esperadasTotal = 0
  let feitasTotal = 0
  for (let k = 6; k >= 0; k--) {
    const dia = somarDias(agora.data, -k)
    const hoje = dia === agora.data
    const diaSemana = new Date(`${dia}T12:00:00Z`).getUTCDay()
    const rotulo = `${diaMes(dia)} (${DIAS_DA_SEMANA[diaSemana]}${hoje ? ', até agora' : ''})`
    // antes da primeira execução agendada, nenhum horário é cobrado ('AAAA-MM-DD HH' comparado como texto)
    const esperadas = [...HORAS_DA_HORA, HORA_DA_NOITE].filter(
      (hora) => horarioEsperado({ data: dia, hora, minuto: 0, diaSemana }) && (!hoje || hora <= agora.hora)
        && `${dia} ${String(hora).padStart(2, '0')}` >= primeira,
    )
    if (esperadas.length === 0) {
      linhas.push(`- ${rotulo}: nenhuma esperada`)
      continue
    }
    const faltaram: string[] = []
    const comFalha: string[] = []
    for (const hora of esperadas) {
      const daHora = execucoes.linhas.filter((e) => e.dia === dia && e.hora === hora)
      if (daHora.length === 0) faltaram.push(`${hora}h`)
      else if (daHora.some((e) => e.resultado === 'falha') && !daHora.some((e) => e.resultado === 'ok' || e.resultado === 'aviso')) {
        // A falha do ERP só vale para o fechamento da fase se o Telegram avisou (spec 10, item 1).
        const avisada = daHora.some((e) => e.resultado === 'falha' && e.telegram === true)
        comFalha.push(`${hora}h, ${avisada ? 'avisada' : 'não avisada'} pelo Telegram`)
      }
    }
    const feitas = esperadas.length - faltaram.length
    esperadasTotal += esperadas.length
    feitasTotal += feitas
    let linha = `- ${rotulo}: ${plural(esperadas.length, 'esperada', 'esperadas')}, ${plural(feitas, 'feita', 'feitas')}`
    if (comFalha.length) linha += `, ${comFalha.length} com falha (${comFalha.join('; ')})`
    if (faltaram.length) linha += `; faltaram: ${faltaram.join(', ')}`
    linhas.push(linha)
  }
  linhas.push(`Total: ${plural(esperadasTotal, 'esperada', 'esperadas')}, ${plural(feitasTotal, 'feita', 'feitas')}.`)
  return linhas
}

function textoNoite(noite: Dados['noite']): string[] {
  if (noite === null) return ['Última comparação da noite: nenhuma leitura da noite registrada ainda.']
  const quando = `Última comparação da noite (${diaMes(noite.dia)})`
  if (noite.resultado === 'falha') return [`${quando}: a leitura da noite falhou (${noite.mensagem ?? 'sem mensagem'}); a comparação não terminou.`]
  if (noite.diferencas.length === 0) return [`${quando}: zero diferença.`]
  return [`${quando}: ${plural(noite.diferencas.length, 'diferença', 'diferenças')}:`, ...noite.diferencas.map((d) => `- ${d}`)]
}

export async function conferenciaDoDono(cliente: Cliente, produtos: string[], agoraMs: number): Promise<string> {
  const agora = emFortaleza(agoraMs)
  const sql = readFileSync(new URL('../sql/kaizen/conferencia-dono.sql', import.meta.url), 'utf8')
  const d = (await cliente.query<Dados>(sql, [produtos, somarDias(agora.data, -6)])).rows[0]
  const t: string[] = [`Conferência do Kaizen — ${diaMes(agora.data)} às ${agora.hora}h${String(agora.minuto).padStart(2, '0')}`]

  t.push('', '1. Vendas por dia desde 28/09, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; dia em que o documento foi criado). Onde conferir: relatório 154.')
  if (d.vendas.dias.length === 0) t.push('- nenhuma venda desde 28/09')
  for (const v of d.vendas.dias) t.push(`- ${diaMes(v.dia)}: ${plural(v.vendas, 'venda', 'vendas')}, ${formatarReais(v.total)}`)
  t.push(`Total: ${plural(d.vendas.vendas, 'venda', 'vendas')}, ${formatarReais(d.vendas.total)}`)

  t.push('', `2. Contas a pagar pendentes, sem o crédito de troca: ${plural(d.contas.parcelas, 'parcela', 'parcelas')}, ${formatarReais(d.contas.total)}. Onde conferir: tela de contas a pagar.`)
  t.push(`O crédito de troca pendente fica fora, porque não é conta: ${plural(d.contas.trocas, 'parcela', 'parcelas')}, ${formatarReais(d.contas.trocas_total)}. A tela de contas a pagar do ERP mostra os dois somados: ${plural(d.contas.tela, 'parcela', 'parcelas')}, ${formatarReais(d.contas.tela_total)}.`)

  t.push('', '3. Quebra de cada fechamento de caixa (informado menos calculado, sem a forma troca). Onde conferir: tela do fechamento.')
  if (d.fechamentos.length === 0) t.push('- nenhum fechamento desde 28/09')
  for (const f of d.fechamentos) {
    t.push(`- fechamento ${f.codigo}, ${f.quando} (caixa ${f.caixa ?? '?'}, usuário ${f.usuario ?? '?'}, abertura ${f.abertura ?? '?'}): quebra ${formatarReais(f.quebra)}`)
    for (const forma of f.formas) {
      // O ERP grava uma linha por código de forma (8 por fechamento, até as zeradas); o nome, quando existe,
      // vem ao lado do código, porque mais de um código pode traduzir para o mesmo nome (2 e 6 são as duas pix).
      const rotulo = forma.forma !== null ? `${forma.forma} (forma ${forma.codigo_forma})` : `forma ${forma.codigo_forma}`
      t.push(`  ${rotulo}: calculado ${formatarReais(forma.calculado)}, informado ${formatarReais(forma.informado)}, quebra ${formatarReais(forma.quebra)}`)
    }
  }

  t.push('', '4. Saldo atual dos produtos pedidos, pela última leitura do ERP. Onde conferir: tela do produto.')
  if (d.produtos.length === 0) t.push('- nenhum produto pedido; para ver o saldo, rode o comando com os códigos (exemplo: conferencia 60 2138)')
  for (const p of d.produtos) {
    const nome = p.descricao ? `produto ${p.produto} (${p.descricao})` : `produto ${p.produto}`
    if (!p.tem_foto) t.push(`- ${nome}: não está na foto do estoque do ERP`)
    else t.push(`- ${nome}: ${p.quantidade === null ? 'sem quantidade' : formatarQuantidade(p.quantidade)} (lido em ${p.lido})`)
  }

  t.push('', '5. Execuções esperadas e feitas nos últimos 7 dias (das 8h às 19h e às 22h, de segunda a sábado; as manuais não contam).')
  t.push(...textoExecucoes(d.execucoes, agoraMs))
  t.push('', ...textoNoite(d.noite))
  return t.join('\n')
}

// Usado pelo comando `conferencia` de principal.mts: conecta, monta o texto e fecha a conexão.
export async function rodarConferencia(kaizenUrl: string, produtos: string[], agoraMs: number): Promise<string> {
  const cliente = await conectar(kaizenUrl)
  try {
    return await conferenciaDoDono(cliente, produtos, agoraMs)
  } finally {
    await cliente.end()
  }
}
