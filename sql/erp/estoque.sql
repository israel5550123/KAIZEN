select json_build_object(
  'movimentos', coalesce((
    select json_agg(json_build_object(
      'oid', h.oid,
      'produto', h.idmercadoriavariacao,
      'documento', h._iddocumento,
      'momento', h.datahora,
      'saldo_antes', h.qtdsaldoatual::text,
      'saldo_depois', h.qtdnovosaldo::text
    ) order by h.oid)
    from mercadoria_estoque_historico h
    where h.oid > {{movimentos_acima_de}}
  ), '[]'),
  'foto', coalesce((
    select json_agg(json_build_object(
      'produto', e._idmercadoriavariacao,
      'quantidade', e.qtdsaldo::text
    ) order by e._idmercadoriavariacao)
    from mercadoria_estoque e
    where e._idempresa = 1 and e._idlocalestoque = 1
  ), '[]')
)::text as dados
