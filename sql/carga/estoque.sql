drop table if exists pg_temp.movimento_lido;

create temp table movimento_lido on commit drop as
select distinct on (m->>'oid') m->>'oid' as origem_id, m
from pg_temp.entrada x, jsonb_array_elements(x.dados->'movimentos') m
where x.assunto = 'estoque'
order by m->>'oid', x.parte desc;

-- visto_em fica de fora do update: guarda o dia em que o Kaizen viu o movimento pela primeira vez
insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, documento, momento, saldo_antes, saldo_depois)
select
  'meuerp', 'mercadoria_estoque_historico', l.origem_id,
  l.m->>'produto', l.m->>'documento', (l.m->>'momento')::timestamp,
  (l.m->>'saldo_antes')::numeric, (l.m->>'saldo_depois')::numeric
from pg_temp.movimento_lido l
order by l.origem_id::bigint
on conflict (fonte, origem_tabela, origem_id) do update set
  produto = excluded.produto,
  documento = excluded.documento,
  momento = excluded.momento,
  saldo_antes = excluded.saldo_antes,
  saldo_depois = excluded.saldo_depois;

delete from kaizen.estoque_atual where fonte = 'meuerp';

insert into kaizen.estoque_atual (fonte, produto, quantidade, lido_em)
select distinct on (f->>'produto') 'meuerp', f->>'produto', (f->>'quantidade')::numeric, now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'foto') f
where x.assunto = 'estoque'
order by f->>'produto', x.parte desc;

-- só na leitura completa (noite): movimento do ERP novo que não voltou sumiu do ERP
with sumidos as (
  delete from kaizen.estoque_movimento e
  where e.fonte = 'meuerp'
    and (select p.completo from pg_temp.parametro p)
    and not exists (select 1 from pg_temp.movimento_lido l where l.origem_id = e.origem_id)
  returning e.origem_id, e.produto
)
select
  (select count(*) from pg_temp.movimento_lido) as movimentos,
  (select count(*) from kaizen.estoque_atual where fonte = 'meuerp') as foto,
  coalesce(
    (select jsonb_agg(jsonb_build_object('origem_id', s.origem_id, 'produto', s.produto) order by s.origem_id::bigint) from sumidos s),
    '[]'::jsonb
  ) as sumidos
