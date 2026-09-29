select coalesce(json_agg(json_build_object(
  'oid', d.oid,
  'codigo', d._iddocumento,
  'modelo', d.modelo,
  'status', d.status,
  'movimento', d.tipomovimento,
  'financeiro', d.tipomovimentofinanceiro,
  'criado_em', d.datahora,
  'fechado_em', d.datahoramovimento,
  'pessoa', d.idpessoa,
  'turno_caixa', d.idcaixaabertura,
  'turno_usuario', d.idusuarioabertura,
  'turno_numero', d.idabertura,
  'natureza', nullif(d.idnaturezaoperacao, 0),
  'itens', coalesce((
    select json_agg(json_build_object(
      'oid', m.oid,
      'produto', m.idmercadoriavariacao,
      'quantidade', m.qtd::text,
      'valor_liquido', m.valtotalliquido::text,
      'vendedor', m.idpessoafuncionario
    ) order by m._idsequencia, m.oid)
    from documento_mercadoria m
    where m._iddocumento = d._iddocumento and m.oid > {{corte_item}}
  ), '[]'),
  'pagamentos', coalesce((
    select json_agg(json_build_object(
      'oid', p.oid,
      'forma', p.idpagamento,
      'valor', p.valor::text
    ) order by p.oid)
    from documento_pagamento p
    where p._iddocumento = d._iddocumento and p.oid > {{corte_pagamento}}
  ), '[]'),
  'parcelas', coalesce((
    select json_agg(json_build_object(
      'oid', q.oid,
      'lancado_em', q.dtlancamento,
      'vencimento', q.dtvencimento,
      'valor', q.valparcela::text,
      'status', q.status,
      'descricao', q.descricao,
      'baixas', coalesce((
        select json_agg(json_build_object(
          'oid', b.oid,
          'pago_em', b.dtpagamento,
          'valor', b.valpagamento::text,
          'forma', b.idpagamento,
          'status', b.status
        ) order by b.oid)
        from documento_parcela_pagamento b
        where b._iddocumento = q._iddocumento and b._idsequencia = q._idsequencia and b._idparcela = q._idparcela
          and b.oid > {{corte_baixa}}
      ), '[]')
    ) order by q.oid)
    from documento_parcela q
    where q._iddocumento = d._iddocumento and q.oid > {{corte_parcela}} and d.tipomovimentofinanceiro = 'P'
  ), '[]'),
  'conferencia', coalesce((
    select json_agg(json_build_object(
      'oid', c.oid,
      'forma', c._idpagamento,
      'calculado', c.valdisponivel::text,
      'informado', c.valconferido::text
    ) order by c.oid)
    from documento_conferencia_caixa c
    where c._iddocumento = d._iddocumento and c.oid > {{corte_conferencia}}
  ), '[]'),
  'conferencia_abaixo_corte', (
    select count(*)
    from documento_conferencia_caixa r
    where r._iddocumento = d._iddocumento and r.oid <= {{corte_conferencia}}
  )
) order by d.oid), '[]')::text as dados
from documento d
where d.oid > {{corte_documento}}
  and (
    d.oid > {{novos_acima_de}}
    or d.datahora >= {{inicio}}::timestamp
    or d.datahoramovimento >= {{inicio}}::timestamp
    or d._iddocumento in (
      select x._iddocumento
      from documento_cancelamento_historico x
      where x.oid > {{corte_cancelamento}} and x.datahora >= {{inicio}}::timestamp
    )
    or d.oid = any({{pendentes}})
    or d.oid between {{faixa_de}} and {{faixa_ate}}
  )
