drop table if exists pg_temp.vivo;

create temp table vivo on commit drop as
select distinct v.oid as origem_id
from pg_temp.entrada x, jsonb_array_elements_text(x.dados) v(oid)
where x.assunto = 'vivos';

-- só o ERP novo é comparado, e documento lido nesta execução nunca sai; os movimentos de estoque ficam
with alvo as (
  select d.id, d.origem_id, d.codigo, d.modelo, d.criado_em
  from kaizen.documento d
  where d.fonte = 'meuerp'
    and not exists (select 1 from pg_temp.vivo v where v.origem_id = d.origem_id)
    and not exists (select 1 from pg_temp.doc_lido l where l.origem_id = d.origem_id)
),
resumo as (
  select
    a.id,
    a.origem_id,
    a.codigo,
    t.valor as tipo,
    a.criado_em::text as criado_em,
    (select round(coalesce(sum(i.valor_liquido), 0), 2)::text
       from kaizen.documento_item i
      where i.documento_id = a.id) as valor,
    (select string_agg(distinct coalesce(f.nome, i.vendedor), ', ' order by coalesce(f.nome, i.vendedor))
       from kaizen.documento_item i
       left join kaizen.funcionario f on f.fonte = 'meuerp' and f.codigo = i.vendedor
      where i.documento_id = a.id) as vendedores
  from alvo a
  left join kaizen.traducao t on t.fonte = 'meuerp' and t.campo = 'tipo' and t.codigo = a.modelo
),
apagados as (
  delete from kaizen.documento d
  using resumo r
  where d.id = r.id
  returning d.id
)
select r.origem_id, r.codigo, r.tipo, r.criado_em, r.valor, r.vendedores
from resumo r
join apagados a on a.id = r.id
order by r.origem_id::bigint
