select coalesce(json_agg(json_build_object(
  'modelo', g.modelo,
  'quantidade', g.quantidade,
  'primeiro_codigo', g.primeiro_codigo,
  'ultimo_codigo', g.ultimo_codigo,
  'primeira_datahora', g.primeira_datahora,
  'ultima_datahora', g.ultima_datahora
) order by g.modelo collate "C"), '[]')::text as dados
from (
  select d.modelo as modelo,
    count(*) as quantidade,
    min(d._iddocumento) as primeiro_codigo,
    max(d._iddocumento) as ultimo_codigo,
    min(d.datahora) as primeira_datahora,
    max(d.datahora) as ultima_datahora
  from documento d
  where d.oid > {{corte_documento}} and d.datahora < '2026-09-28'
  group by d.modelo
) as g
