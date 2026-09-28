-- O documento é atualizado no lugar pela chave (fonte, origem_tabela, origem_id): id e visto_em não mudam.
-- Movimento, financeiro e turno de caixa ficam vazios; vêm da tradução pelo modelo.
insert into kaizen.documento (
  fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro,
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero
)
select
  'link', d.origem_tabela, d.origem_id, d.codigo, d.modelo, d.status, null, null,
  d.criado_em, d.fechado_em, d.pessoa, null, d.turno_usuario, null
from pg_temp.link_doc d
order by d.criado_em, d.origem_tabela, d.origem_id
on conflict (fonte, origem_tabela, origem_id) do update set
  codigo = excluded.codigo,
  modelo = excluded.modelo,
  status = excluded.status,
  movimento = excluded.movimento,
  financeiro = excluded.financeiro,
  criado_em = excluded.criado_em,
  fechado_em = excluded.fechado_em,
  pessoa = excluded.pessoa,
  turno_caixa = excluded.turno_caixa,
  turno_usuario = excluded.turno_usuario,
  turno_numero = excluded.turno_numero;

-- documento da Link que não voltou na leitura sai, com os filhos
delete from kaizen.documento k
where k.fonte = 'link'
  and not exists (
    select 1 from pg_temp.link_doc d
    where d.origem_tabela = k.origem_tabela and d.origem_id = k.origem_id
  );

-- os filhos são trocados por inteiro (a baixa sai junto com a parcela)
delete from kaizen.documento_item where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');
delete from kaizen.documento_pagamento where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');
delete from kaizen.parcela where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');
delete from kaizen.conferencia_caixa where documento_id in (select k.id from kaizen.documento k where k.fonte = 'link');

-- left join de propósito: um filho sem documento (ou baixa sem parcela) para o comando no not null, em vez de sumir
insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select k.id, i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
from pg_temp.link_item i
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = i.doc_tabela and k.origem_id = i.doc_id
order by k.id, i.origem_tabela, length(i.origem_id), i.origem_id;

insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
select k.id, p.origem_tabela, p.origem_id, p.forma, p.valor
from pg_temp.link_pagamento p
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = p.doc_tabela and k.origem_id = p.doc_id
order by k.id, p.origem_tabela, length(p.origem_id), p.origem_id;

insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
select k.id, c.origem_tabela, c.origem_id, c.forma, c.calculado, c.informado
from pg_temp.link_conferencia c
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = c.doc_tabela and k.origem_id = c.doc_id
order by k.id, c.origem_tabela, length(c.origem_id), c.origem_id;

insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao)
select k.id, p.origem_tabela, p.origem_id, p.lancado_em, p.vencimento, p.valor, p.status, p.descricao
from pg_temp.link_parcela p
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = p.doc_tabela and k.origem_id = p.doc_id
order by k.id, p.origem_tabela, length(p.origem_id), p.origem_id;

-- a baixa liga à parcela recém-inserida pelo documento e pela origem da parcela
insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
select pa.id, b.origem_tabela, b.origem_id, b.pago_em, b.valor, b.forma, b.status
from pg_temp.link_baixa b
left join kaizen.documento k on k.fonte = 'link' and k.origem_tabela = b.doc_tabela and k.origem_id = b.doc_id
left join kaizen.parcela pa
  on pa.documento_id = k.id
 and pa.origem_tabela = 'pc_lancamento_parcela'
 and pa.origem_id = b.parcela_origem_id
order by pa.id, b.origem_tabela, length(b.origem_id), b.origem_id;

-- visto_em só é gravado na primeira vez, com o now() (início) desta transação
select
  (select count(*) from kaizen.documento k where k.fonte = 'link') as documentos,
  (select count(*) from kaizen.documento k where k.fonte = 'link' and k.visto_em = now()) as novos,
  (select count(*) from kaizen.documento_item i join kaizen.documento k on k.id = i.documento_id where k.fonte = 'link') as itens,
  (select count(*) from kaizen.documento_pagamento p join kaizen.documento k on k.id = p.documento_id where k.fonte = 'link') as pagamentos,
  (select count(*) from kaizen.conferencia_caixa c join kaizen.documento k on k.id = c.documento_id where k.fonte = 'link') as conferencias,
  (select count(*) from kaizen.parcela p join kaizen.documento k on k.id = p.documento_id where k.fonte = 'link') as parcelas,
  (select count(*) from kaizen.baixa b join kaizen.parcela p on p.id = b.parcela_id join kaizen.documento k on k.id = p.documento_id where k.fonte = 'link') as baixas;
