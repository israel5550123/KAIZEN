-- Naturezas de operação (spec da Fase 4, seção 6): uma versão por mudança; o documento guarda a versão da época.
create table kaizen.natureza (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  descricao text,
  categoria text,
  estoque boolean not null,
  reserva boolean not null,
  financeiro boolean not null,
  troca boolean not null,
  valida_desde timestamptz not null default now()
);

create index on kaizen.natureza (fonte, codigo, id);

alter table kaizen.documento
  add column natureza text,
  add column natureza_id bigint references kaizen.natureza (id);
