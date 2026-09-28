create table kaizen.documento (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('meuerp', 'link')),
  origem_tabela text not null,
  origem_id text not null,
  codigo text not null,
  modelo text not null,
  status text,
  movimento text,
  financeiro text,
  criado_em timestamp not null,
  fechado_em timestamp,
  pessoa text,
  turno_caixa integer,
  turno_usuario integer,
  turno_numero integer,
  visto_em timestamptz not null default now(),
  unique (fonte, origem_tabela, origem_id)
);

create table kaizen.documento_item (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  sentido text,
  produto text not null,
  quantidade numeric,
  valor_liquido numeric,
  vendedor text,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.documento_pagamento (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  forma text not null,
  valor numeric not null,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.parcela (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  lancado_em date,
  vencimento date,
  valor numeric not null,
  status text,
  descricao text,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.baixa (
  id bigint generated always as identity primary key,
  parcela_id bigint not null references kaizen.parcela (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  pago_em date,
  valor numeric not null,
  forma text,
  status text,
  unique (parcela_id, origem_tabela, origem_id)
);

create table kaizen.conferencia_caixa (
  id bigint generated always as identity primary key,
  documento_id bigint not null references kaizen.documento (id) on delete cascade,
  origem_tabela text not null,
  origem_id text not null,
  forma text not null,
  calculado numeric,
  informado numeric,
  unique (documento_id, origem_tabela, origem_id)
);

create table kaizen.estoque_movimento (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('meuerp', 'link')),
  origem_tabela text not null,
  origem_id text not null,
  produto text not null,
  documento text,
  momento timestamp not null,
  saldo_antes numeric,
  saldo_depois numeric,
  visto_em timestamptz not null default now(),
  unique (fonte, origem_tabela, origem_id)
);

create table kaizen.estoque_atual (
  fonte text not null check (fonte in ('meuerp', 'link')),
  produto text not null,
  quantidade numeric,
  lido_em timestamptz not null default now(),
  primary key (fonte, produto)
);

create table kaizen.estoque_virada (
  produto text primary key,
  quantidade numeric not null
);

create table kaizen.produto (
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  descricao text,
  grupo text,
  secao text,
  subgrupo text,
  marca text,
  custo numeric,
  ativo boolean not null,
  lido_em timestamptz not null default now(),
  primary key (fonte, codigo)
);

create table kaizen.produto_fornecedor (
  fonte text not null check (fonte in ('meuerp', 'link')),
  produto text not null,
  fornecedor text not null,
  primary key (fonte, produto, fornecedor)
);

create table kaizen.pessoa (
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  nome text,
  cpf_cnpj text,
  bairro text,
  municipio text,
  ibge text,
  uf text,
  ativo boolean not null,
  lido_em timestamptz not null default now(),
  primary key (fonte, codigo)
);

create table kaizen.funcionario (
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo text not null,
  nome text,
  usuario integer,
  tipo text,
  ativo boolean not null,
  lido_em timestamptz not null default now(),
  primary key (fonte, codigo)
);

create table kaizen.de_para (
  entidade text not null,
  fonte text not null check (fonte in ('meuerp', 'link')),
  codigo_origem text not null,
  codigo_kaizen text not null,
  primary key (entidade, fonte, codigo_origem)
);

create table kaizen.traducao (
  fonte text not null check (fonte in ('meuerp', 'link')),
  campo text not null,
  codigo text not null,
  valor text not null,
  primary key (fonte, campo, codigo)
);

create table kaizen.corte (
  fonte text not null check (fonte in ('meuerp', 'link')),
  tabela text not null,
  oid bigint not null,
  primary key (fonte, tabela)
);

create table kaizen.execucao (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('hora', 'noite')),
  manual boolean not null default false,
  inicio timestamptz not null default now(),
  fim timestamptz,
  resultado text check (resultado in ('ok', 'aviso', 'falha', 'pulada')),
  mensagem text,
  contagens jsonb,
  avisos jsonb not null default '[]',
  telegram_ok boolean,
  resumo_ok boolean not null default false,
  resumo_chaves jsonb
);

create index on kaizen.documento_item (documento_id);
create index on kaizen.documento_pagamento (documento_id);
create index on kaizen.parcela (documento_id);
create index on kaizen.baixa (parcela_id);
create index on kaizen.conferencia_caixa (documento_id);
create index on kaizen.estoque_movimento (fonte, produto);
