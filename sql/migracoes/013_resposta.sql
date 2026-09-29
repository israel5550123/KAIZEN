-- As respostas das três perguntas, uma por dia e pergunta (spec da Fase 4, seção 9).
create table kaizen.resposta (
  data date not null,
  pergunta text not null check (pergunta in ('vendas', 'compras', 'financeiro')),
  conteudo jsonb not null,
  calculado_em timestamptz not null default now(),
  primary key (data, pergunta)
);
