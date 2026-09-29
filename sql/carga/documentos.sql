drop table if exists pg_temp.doc_lido;

-- o mesmo oid em duas partes vira uma linha só; vale a parte de número maior
create temp table doc_lido on commit drop as
select distinct on (e->>'oid') e->>'oid' as origem_id, e as j
from pg_temp.entrada x, jsonb_array_elements(x.dados) e
where x.assunto = 'documentos'
order by e->>'oid', x.parte desc;

insert into kaizen.documento (
  fonte, origem_tabela, origem_id, codigo, modelo, status, movimento, financeiro,
  criado_em, fechado_em, pessoa, turno_caixa, turno_usuario, turno_numero, natureza, natureza_id
)
select
  'meuerp', 'documento', l.origem_id,
  l.j->>'codigo', l.j->>'modelo', l.j->>'status', l.j->>'movimento', l.j->>'financeiro',
  (l.j->>'criado_em')::timestamp, (l.j->>'fechado_em')::timestamp, l.j->>'pessoa',
  nullif((l.j->>'turno_caixa')::integer, 0),
  nullif((l.j->>'turno_usuario')::integer, 0),
  nullif((l.j->>'turno_numero')::integer, 0),
  l.j->>'natureza',
  -- a última versão do código, gravada nesta mesma transação antes dos documentos; sem versão, fica vazia
  (select max(n.id) from kaizen.natureza n where n.fonte = 'meuerp' and n.codigo = l.j->>'natureza')
from pg_temp.doc_lido l
order by l.origem_id::bigint
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
  turno_numero = excluded.turno_numero,
  natureza = excluded.natureza,
  -- a versão da natureza é a da primeira gravação com aquele código: regravar com o mesmo código não troca
  natureza_id = case
    when documento.natureza is not distinct from excluded.natureza then documento.natureza_id
    else excluded.natureza_id
  end;

drop table if exists pg_temp.doc_alvo;

create temp table doc_alvo on commit drop as
select d.id as documento_id, l.origem_id, l.j
from pg_temp.doc_lido l
join kaizen.documento d
  on d.fonte = 'meuerp' and d.origem_tabela = 'documento' and d.origem_id = l.origem_id;

-- os filhos são trocados por inteiro: o que sumiu do documento no ERP sai daqui (a baixa vai junto com a parcela)
delete from kaizen.documento_item where documento_id in (select documento_id from pg_temp.doc_alvo);
delete from kaizen.documento_pagamento where documento_id in (select documento_id from pg_temp.doc_alvo);
delete from kaizen.parcela where documento_id in (select documento_id from pg_temp.doc_alvo);
delete from kaizen.conferencia_caixa where documento_id in (select documento_id from pg_temp.doc_alvo);

insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
select
  a.documento_id, 'documento_mercadoria', i->>'oid', a.j->>'movimento', i->>'produto',
  (i->>'quantidade')::numeric, (i->>'valor_liquido')::numeric, nullif(i->>'vendedor', '0')
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'itens') i;

insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor)
select a.documento_id, 'documento_pagamento', p->>'oid', p->>'forma', (p->>'valor')::numeric
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'pagamentos') p;

insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, descricao)
select
  a.documento_id, 'documento_parcela', p->>'oid',
  left(p->>'lancado_em', 10)::date, left(p->>'vencimento', 10)::date,
  (p->>'valor')::numeric, p->>'status', p->>'descricao'
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'parcelas') p;

insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
select
  pa.id, 'documento_parcela_pagamento', b->>'oid',
  left(b->>'pago_em', 10)::date, (b->>'valor')::numeric, b->>'forma', b->>'status'
from pg_temp.doc_alvo a
cross join jsonb_array_elements(a.j->'parcelas') p
cross join jsonb_array_elements(p->'baixas') b
join kaizen.parcela pa
  on pa.documento_id = a.documento_id
 and pa.origem_tabela = 'documento_parcela'
 and pa.origem_id = p->>'oid';

insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
select
  a.documento_id, 'documento_conferencia_caixa', c->>'oid', c->>'forma',
  (c->>'calculado')::numeric, (c->>'informado')::numeric
from pg_temp.doc_alvo a, jsonb_array_elements(a.j->'conferencia') c;

-- visto_em só é gravado na primeira vez, com o now() (início) desta transação
select count(*) as lidos, count(*) filter (where d.visto_em = now()) as novos
from pg_temp.doc_alvo a
join kaizen.documento d on d.id = a.documento_id;
