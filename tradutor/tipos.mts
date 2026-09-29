export type Fonte = 'meuerp' | 'link'
export type TipoExecucao = 'hora' | 'noite'
export type Resultado = 'ok' | 'aviso' | 'falha' | 'pulada'
export type TabelaCorte =
  | 'documento' | 'documento_mercadoria' | 'documento_pagamento' | 'documento_parcela'
  | 'documento_parcela_pagamento' | 'documento_conferencia_caixa'
  | 'documento_cancelamento_historico' | 'mercadoria_estoque_historico'
export type Cortes = Record<TabelaCorte, number>
export type TipoAviso =
  | 'codigo_sem_traducao' | 'natureza_mudou' | 'documento_apagado' | 'fechamento_com_resto' | 'estoque_diverge'
  | 'movimento_sumiu' | 'total_diferente' | 'execucao_faltou' | 'execucao_pulada'
export type Aviso = { tipo: TipoAviso; chave: string; texto: string }
export type TipoFalha = 'erp_fora' | 'token' | 'estrutura' | 'banco_fora' | 'outra'
export type MotivoFalha = { tipo: TipoFalha; detalhe: string }
export class ErroKaizen extends Error {
  motivo: MotivoFalha
  constructor(motivo: MotivoFalha) { super(motivo.detalhe); this.name = 'ErroKaizen'; this.motivo = motivo }
}
