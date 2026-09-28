-- $1: kaizen.documento.id. Um documento em palavras do negócio, igual para a Link e para o ERP novo.
-- O nome vem do cadastro pelo código, de qualquer fonte (os códigos link: não colidem com os do ERP novo).
-- Quantidades e valores saem como texto, para não passar por número de ponto flutuante.
select jsonb_build_object(
  'documento', jsonb_build_object(
    'fonte', d.fonte,
    'codigo', d.codigo,
    'tipo', d.tipo,
    'situacao', d.situacao,
    'movimento', d.movimento,
    'financeiro', d.financeiro,
    'criado_em', d.criado_em,
    'fechado_em', d.fechado_em,
    'pessoa', d.pessoa,
    'pessoa_nome', (select p.nome from kaizen.pessoa p where p.codigo = d.pessoa)
  ),
  'itens', coalesce((
    select jsonb_agg(jsonb_build_object(
      'sentido', ts.valor,
      'produto', i.produto,
      'descricao', (select pr.descricao from kaizen.produto pr where pr.codigo = i.produto),
      'quantidade', i.quantidade::text,
      'valor_liquido', i.valor_liquido::text,
      'vendedor', i.vendedor,
      'vendedor_nome', (select f.nome from kaizen.funcionario f where f.codigo = i.vendedor)
    ) order by i.origem_tabela, length(i.origem_id), i.origem_id)
    from kaizen.documento_item i
    left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'sentido' and ts.codigo = i.sentido
    where i.documento_id = d.id
  ), '[]'::jsonb),
  'pagamentos', coalesce((
    select jsonb_agg(jsonb_build_object(
      'forma', tf.valor,
      'valor', p.valor::text
    ) order by p.origem_tabela, length(p.origem_id), p.origem_id)
    from kaizen.documento_pagamento p
    left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'forma' and tf.codigo = p.forma
    where p.documento_id = d.id
  ), '[]'::jsonb)
) as ficha
from kaizen.documento_negocio d
where d.id = $1::bigint
