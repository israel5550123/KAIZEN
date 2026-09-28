select coalesce(json_agg(e.tabela || '.' || e.coluna order by e.tabela collate "C", e.coluna collate "C"), '[]')::text as dados
from (values {{pares}}) as e (tabela, coluna)
where not exists (
  select 1
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = e.tabela and c.column_name = e.coluna
)
