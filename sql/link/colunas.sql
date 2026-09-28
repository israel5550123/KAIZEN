-- $1: tabelas; $2: colunas, par a par (sql/link/colunas-esperadas.txt). Devolve os pares que faltam no esquema erp.
select e.tabela, e.coluna
from unnest($1::text[], $2::text[]) as e (tabela, coluna)
where not exists (
  select 1
  from information_schema.columns c
  where c.table_schema = 'erp' and c.table_name = e.tabela and c.column_name = e.coluna
)
order by e.tabela collate "C", e.coluna collate "C"
