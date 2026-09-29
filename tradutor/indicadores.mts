import { readFileSync } from 'node:fs'
import type { Cliente } from './banco.mts'

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
