select json_build_object(
  'naturezas', coalesce((
    select json_agg(json_build_object(
      'codigo', n._idnatureza,
      'descricao', n.descricao,
      'categoria', n.tipocategoria,
      'estoque', n.flagmovimentarestoque,
      'reserva', n.flagreservaestoque,
      'financeiro', n.flagmovimentarfinanceiro
    ) order by n._idnatureza)
    from natureza_operacao n
    where n._idempresa = 1
  ), '[]'),
  'troca', (
    select c.idnaturezatrocamercadoria
    from config_entrada_saida c
    where c._idempresa = 1
  )
)::text as dados
