import { readFileSync } from 'node:fs'
import { formatarReais } from './avisos.mts'
import { emTransacao } from './banco.mts'
import type { Cliente } from './banco.mts'
import { somarDias } from './janela.mts'

// As três perguntas da Fase 4. A regra de cada uma é um select em sql/regras/<pergunta>.sql, que recebe o dia em $1 e
// devolve uma linha com a coluna resposta (jsonb).
export type Pergunta = 'vendas' | 'compras' | 'financeiro'

export const PERGUNTAS: Pergunta[] = ['vendas', 'compras', 'financeiro']

export function lerRegra(pergunta: Pergunta): string {
  return readFileSync(new URL(`../sql/regras/${pergunta}.sql`, import.meta.url), 'utf8')
}

// Só para testes e para imprimir: o objeto que o pg monta do jsonb (os números viram number do JavaScript). A regra roda
// dentro de outro select, como é gravada em kaizen.resposta: por isso o arquivo não pode terminar com ;.
export async function responder(cliente: Cliente, pergunta: Pergunta, dia: string): Promise<any> {
  const { rows } = await cliente.query<{ resposta: unknown }>(`select r.resposta from (${lerRegra(pergunta)}) r`, [dia])
  return rows[0].resposta
}

const INICIO_DA_HISTORIA = '2026-04-01'

// Os dias de 01/04/2026 até hoje, inclusive: a noite recalcula todos eles.
export function diasDaHistoria(hoje: string): string[] {
  const dias: string[] = []
  // datas 'AAAA-MM-DD' comparadas como texto ficam na ordem do calendário
  for (let dia = INICIO_DA_HISTORIA; dia <= hoje; dia = somarDias(dia, 1)) dias.push(dia)
  return dias
}

// A regra é um select só, com o dia em $1. A quebra de linha antes do ")" protege de um comentário na última linha dela.
function sqlDeGravar(regra: string): string {
  return `insert into kaizen.resposta (data, pergunta, conteudo)
select $1::date, $2, r.resposta from (
${regra}
) r
on conflict (data, pergunta) do update set conteudo = excluded.conteudo, calculado_em = now()`
}

// Grava as três respostas de cada dia, sobrescrevendo as que havia. O JSON vai da regra para a tabela sem passar
// pelo JavaScript (insert … select). Cada dia é uma transação. Devolve quantas respostas gravou.
export async function calcularRespostas(cliente: Cliente, dias: string[]): Promise<number> {
  const gravar = PERGUNTAS.map((pergunta) => ({ pergunta, sql: sqlDeGravar(lerRegra(pergunta)) }))
  let gravadas = 0
  for (const dia of dias) {
    gravadas += await emTransacao(cliente, async () => {
      // Ajuste do orquestrador: as regras são consultas curtas, e o JIT do Postgres custou de 0,3 a 0,7 s por
      // chamada na tarefa 8. "set local" vale só para esta transação, sem afetar o resto da conexão.
      await cliente.query('set local jit = off')
      let doDia = 0
      for (const { pergunta, sql } of gravar) {
        const r = await cliente.query(sql, [dia, pergunta])
        doDia += r.rowCount ?? 0
      }
      return doDia
    })
  }
  return gravadas
}

// O que as três linhas do comando indicadores mostram, lido de kaizen.resposta (spec, seção 9). Tudo sai como texto.
const SQL_LINHAS = `
with r as (
  select
    (select conteudo from kaizen.resposta where data = $1::date and pergunta = 'vendas') as v,
    (select conteudo from kaizen.resposta where data = $1::date and pergunta = 'compras') as c,
    (select conteudo from kaizen.resposta where data = $1::date and pergunta = 'financeiro') as f
)
select
  v->'dia'->>'realizado' as realizado_dia,
  v->'dia'->>'vendas' as vendas_dia,
  v->'mes'->>'vendido' as vendido_mes,
  v->'mes'->>'devolucoes' as devolucoes_mes,
  v->'mes'->>'realizado' as realizado_mes,
  v->'mes'->>'vendas' as vendas_mes,
  v->'mes'->>'meta' as meta,
  round((v->'mes'->>'percentual_meta')::numeric * 100, 2)::text as percentual,
  v->'mes'->>'ritmo' as ritmo,
  v->'mes'->>'projecao' as projecao,
  c->'abc_valor'->'A'->>'produtos' as curva_a,
  c->'abc_valor'->'B'->>'produtos' as curva_b,
  c->'abc_valor'->'C'->>'produtos' as curva_c,
  c->'compras_por_classe'->>'A' as compras_a,
  c->'compras_por_classe'->>'B' as compras_b,
  c->'compras_por_classe'->>'C' as compras_c,
  c->'compras_por_classe'->>'sem_venda' as compras_sem_venda,
  coalesce((c->>'estoque_conhecido')::boolean, false) as estoque_conhecido,
  c->'encalhe'->>'produtos' as encalhe_produtos,
  c->'encalhe'->>'valor' as encalhe_valor,
  c->'ruptura'->>'produtos' as ruptura,
  f->>'fonte' as fonte,
  f->'contas_a_pagar'->'total'->>'valor' as a_pagar,
  f->'contas_a_pagar'->'total'->>'parcelas' as parcelas,
  f->'contas_a_pagar'->'vencidas'->>'valor' as vencidas,
  f->'contas_a_pagar'->'ate_7_dias'->>'valor' as ate_7_dias,
  f->>'saldo_banco' is not null as tem_saldo,
  f->>'folga_7' as folga_7,
  -- O jsonpath (lax) dá lista vazia também quando fechamentos vem null: o dia sem fechamento tem quebra 0.
  (select coalesce(sum((x->>'quebra')::numeric), 0) from jsonb_path_query(f, '$.caixa.fechamentos[*]') x)::text as quebra
from r`

type Valores = Record<
  | 'realizado_dia' | 'vendas_dia' | 'vendido_mes' | 'devolucoes_mes' | 'realizado_mes' | 'vendas_mes' | 'meta'
  | 'percentual' | 'ritmo' | 'projecao' | 'curva_a' | 'curva_b' | 'curva_c' | 'compras_a' | 'compras_b' | 'compras_c'
  | 'compras_sem_venda' | 'encalhe_produtos' | 'encalhe_valor' | 'ruptura' | 'fonte' | 'a_pagar' | 'parcelas'
  | 'vencidas' | 'ate_7_dias' | 'folga_7' | 'quebra',
  string | null
> & { estoque_conhecido: boolean; tem_saldo: boolean }

// Campo vazio na resposta (sem divisor, sem dado) sai "—".
function reais(valor: string | null): string {
  return valor === null ? '—' : formatarReais(valor)
}

function numero(valor: string | null): string {
  return valor === null ? '—' : valor.replace('.', ',')
}

export async function linhasDoDia(cliente: Cliente, dia: string): Promise<string[]> {
  const r = (await cliente.query<Valores>(SQL_LINHAS, [dia])).rows[0]
  const data = `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`
  const meta = r.meta === null
    ? 'sem meta cadastrada'
    : `meta ${reais(r.meta)} (${numero(r.percentual)}%), ritmo ${numero(r.ritmo)}`
  const estoque = r.estoque_conhecido
    ? `encalhe ${numero(r.encalhe_produtos)} produtos, ${reais(r.encalhe_valor)}; ruptura ${numero(r.ruptura)}`
    : 'estoque desconhecido antes de 26/09/2026'
  const folga = r.tem_saldo ? `folga em 7 dias ${reais(r.folga_7)}` : 'saldo do banco não digitado'
  return [
    `${data} vendas: realizado do dia ${reais(r.realizado_dia)} (${numero(r.vendas_dia)} vendas); no mês vendido ${reais(r.vendido_mes)}, `
      + `devoluções ${reais(r.devolucoes_mes)}, realizado ${reais(r.realizado_mes)} (${numero(r.vendas_mes)} vendas), ${meta}, `
      + `projeção ${reais(r.projecao)}`,
    `${data} compras: curva A ${numero(r.curva_a)}, B ${numero(r.curva_b)}, C ${numero(r.curva_c)} produtos; compras do período: `
      + `A ${numero(r.compras_a)}, B ${numero(r.compras_b)}, C ${numero(r.compras_c)}, sem venda ${numero(r.compras_sem_venda)}; ${estoque}`,
    `${data} financeiro (${r.fonte ?? '—'}): a pagar ${reais(r.a_pagar)} em ${numero(r.parcelas)} parcelas, vencidas ${reais(r.vencidas)}, `
      + `até 7 dias ${reais(r.ate_7_dias)}; ${folga}; quebra do dia ${reais(r.quebra)}`,
  ]
}
