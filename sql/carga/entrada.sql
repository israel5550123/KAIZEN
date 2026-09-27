create temp table if not exists entrada (assunto text not null, parte integer not null, dados jsonb not null, primary key (assunto, parte)) on commit drop;
