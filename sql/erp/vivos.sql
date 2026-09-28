select coalesce(json_agg(d.oid order by d.oid), '[]')::text as dados
from documento d
where d.oid > {{corte_documento}}
