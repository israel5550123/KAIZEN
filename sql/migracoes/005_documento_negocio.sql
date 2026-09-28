create view kaizen.documento_negocio as
select
  d.id, d.fonte, d.origem_tabela, d.origem_id, d.codigo, d.modelo,
  tt.valor as tipo,
  d.status,
  ts.valor as situacao,
  coalesce(tm.valor, tmm.valor) as movimento,
  coalesce(tf.valor, tfm.valor) as financeiro,
  d.criado_em, d.fechado_em, d.pessoa,
  d.turno_caixa, d.turno_usuario, d.turno_numero, d.visto_em
from kaizen.documento d
left join kaizen.traducao tt on tt.fonte = d.fonte and tt.campo = 'tipo' and tt.codigo = d.modelo
left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'situacao' and ts.codigo = d.status
left join kaizen.traducao tm on tm.fonte = d.fonte and tm.campo = 'movimento' and tm.codigo = d.movimento
left join kaizen.traducao tmm on tmm.fonte = d.fonte and tmm.campo = 'movimento_pelo_modelo' and tmm.codigo = d.modelo
left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'financeiro' and tf.codigo = d.financeiro
left join kaizen.traducao tfm on tfm.fonte = d.fonte and tfm.campo = 'financeiro_pelo_modelo' and tfm.codigo = d.modelo;
