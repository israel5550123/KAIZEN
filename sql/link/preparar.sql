-- As tabelas de trabalho do tradutor da Link: vivem só dentro da transação do comando.
drop table if exists pg_temp.link_liga;
drop table if exists pg_temp.link_doc;
drop table if exists pg_temp.link_item;
drop table if exists pg_temp.link_pagamento;
drop table if exists pg_temp.link_conferencia;
drop table if exists pg_temp.link_parcela;
drop table if exists pg_temp.link_baixa;

-- cada código da Link, com o código do Kaizen e como foi ligado
create temp table link_liga (
  entidade text,
  codigo_origem text,
  codigo_kaizen text not null,
  como text not null check (como in ('decisao', 'regra', 'falha')),
  primary key (entidade, codigo_origem)
) on commit drop;

create temp table link_doc (
  origem_tabela text,
  origem_id text,
  codigo text not null,
  modelo text not null,
  status text,
  criado_em timestamp not null,
  fechado_em timestamp,
  pessoa text,
  turno_usuario integer,
  primary key (origem_tabela, origem_id)
) on commit drop;

create temp table link_item (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  sentido text,
  produto text not null,
  quantidade numeric,
  valor_liquido numeric,
  vendedor text,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_pagamento (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  forma text not null,
  valor numeric not null,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_conferencia (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  forma text not null,
  calculado numeric,
  informado numeric,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_parcela (
  doc_tabela text,
  doc_id text,
  origem_tabela text,
  origem_id text,
  lancado_em date,
  vencimento date,
  valor numeric not null,
  status text,
  descricao text,
  primary key (doc_tabela, doc_id, origem_tabela, origem_id)
) on commit drop;

create temp table link_baixa (
  doc_tabela text,
  doc_id text,
  parcela_origem_id text,
  origem_tabela text,
  origem_id text,
  pago_em date,
  valor numeric not null,
  forma text,
  status text,
  primary key (doc_tabela, doc_id, parcela_origem_id, origem_tabela, origem_id)
) on commit drop;
