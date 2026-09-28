-- Kaizen contra Link, por dia da venda, só as vendas válidas (no Kaizen, pedido emitido; na Link, venda com caixa ativo).
-- Vendido: meio-par da soma dos itens S, contra a soma de valor_total_venda.
-- Devolução: soma do meio-par de cada item E (a Link arredonda linha a linha), contra a soma de valor_total_devolucao.
-- Igual é exatamente igual: devolve só os dias com diferença, vazio quando tudo bate.
with venda_kaizen as (
  select d.id, d.criado_em::date as dia
  from kaizen.documento_negocio d
  where d.fonte = 'link' and d.tipo = 'pedido' and d.situacao = 'emitido'
),
kaizen_dia as (
  select
    v.dia,
    count(*) as vendas,
    kaizen.meio_par(coalesce(sum(i.vendido), 0), 2) as vendido,
    coalesce(sum(i.devolucao), 0) as devolucao
  from venda_kaizen v
  cross join lateral (
    select
      sum(x.valor_liquido) filter (where x.sentido = 'S') as vendido,
      sum(kaizen.meio_par(x.valor_liquido, 2)) filter (where x.sentido = 'E') as devolucao
    from kaizen.documento_item x
    where x.documento_id = v.id
  ) i
  group by v.dia
),
link_dia as (
  select
    n.data::date as dia,
    count(*) as vendas,
    sum(n.valor_total_venda) as vendido,
    sum(n.valor_total_devolucao) as devolucao
  from erp.negociacao n
  join erp.caixa c on c.id_negociacao = n.id_negociacao
  where n.venda and not c.inativo
  group by n.data::date
)
select
  coalesce(k.dia, l.dia) as dia,
  coalesce(k.vendas, 0) as vendas_kaizen,
  coalesce(l.vendas, 0) as vendas_link,
  coalesce(k.vendido, 0) as vendido_kaizen,
  coalesce(l.vendido, 0) as vendido_link,
  coalesce(k.devolucao, 0) as devolucao_kaizen,
  coalesce(l.devolucao, 0) as devolucao_link
from kaizen_dia k
full outer join link_dia l on l.dia = k.dia
where coalesce(k.vendas, 0) <> coalesce(l.vendas, 0)
   or coalesce(k.vendido, 0) <> coalesce(l.vendido, 0)
   or coalesce(k.devolucao, 0) <> coalesce(l.devolucao, 0)
order by 1;
