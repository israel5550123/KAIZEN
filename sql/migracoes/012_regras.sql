-- O que o dono digita (spec da Fase 4, seção 7).
create table kaizen.meta (
  id bigint generated always as identity primary key,
  mes date not null check (extract(day from mes) = 1),
  vendedor text,
  valor numeric not null check (valor > 0)
);

create unique index meta_mes_vendedor on kaizen.meta (mes, coalesce(vendedor, ''));

create table kaizen.feriado (
  data date primary key,
  descricao text not null
);

-- Os dias de segunda a sábado sem expediente desde abril (spec, decisão 11).
insert into kaizen.feriado (data, descricao) values
  ('2026-05-01', 'Dia do Trabalho; a loja não abriu'),
  ('2026-09-07', 'Independência; a loja não abriu'),
  ('2026-09-26', 'pausa da virada entre a Link e o ERP novo (inventário)');

create table kaizen.saldo_banco (
  data date primary key,
  valor numeric not null
);

-- A natureza do documento, no fim da visão (create or replace só acrescenta colunas no fim).
create or replace view kaizen.documento_negocio as
select
  d.id, d.fonte, d.origem_tabela, d.origem_id, d.codigo, d.modelo,
  tt.valor as tipo,
  d.status,
  coalesce(ts.valor, tsm.valor) as situacao,
  coalesce(tm.valor, tmm.valor) as movimento,
  coalesce(tf.valor, tfm.valor) as financeiro,
  d.criado_em, d.fechado_em, d.pessoa,
  d.turno_caixa, d.turno_usuario, d.turno_numero, d.visto_em,
  d.natureza, d.natureza_id, n.categoria, n.estoque as mexe_estoque, n.financeiro as mexe_financeiro, n.troca
from kaizen.documento d
left join kaizen.traducao tt on tt.fonte = d.fonte and tt.campo = 'tipo' and tt.codigo = d.modelo
left join kaizen.traducao ts on ts.fonte = d.fonte and ts.campo = 'situacao' and ts.codigo = d.status
left join kaizen.traducao tsm on tsm.fonte = d.fonte and tsm.campo = 'situacao_pelo_modelo' and tsm.codigo = d.modelo
left join kaizen.traducao tm on tm.fonte = d.fonte and tm.campo = 'movimento' and tm.codigo = d.movimento
left join kaizen.traducao tmm on tmm.fonte = d.fonte and tmm.campo = 'movimento_pelo_modelo' and tmm.codigo = d.modelo
left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'financeiro' and tf.codigo = d.financeiro
left join kaizen.traducao tfm on tfm.fonte = d.fonte and tfm.campo = 'financeiro_pelo_modelo' and tfm.codigo = d.modelo
left join kaizen.natureza n on n.id = d.natureza_id;

-- O papel de cada documento emitido (spec, decisão 8): com natureza, pela natureza; sem, pelo tipo traduzido.
create view kaizen.documento_papel as
select
  dn.id, dn.fonte,
  coalesce(dn.fechado_em, dn.criado_em)::date as dia,
  case
    when dn.natureza_id is null then dn.tipo
    when dn.troca then 'troca'
    when dn.categoria = 'V' and dn.mexe_financeiro then 'venda'
    when dn.categoria = 'C' and dn.mexe_estoque then 'compra'
    else 'outro'
  end as papel
from kaizen.documento_negocio dn
where dn.situacao = 'emitido';

-- Os itens que contam como vendido e devolvido (docs/LOJA.md), iguais para as duas fontes.
create view kaizen.venda_item as
select
  p.id as documento, p.fonte, p.dia,
  extract(hour from coalesce(d.fechado_em, d.criado_em))::int as hora,
  d.pessoa, i.produto, i.vendedor, i.quantidade, i.valor_liquido as valor,
  case s.valor when 'saida' then 'vendido' else 'devolvido' end as sentido
from kaizen.documento_papel p
join kaizen.documento d on d.id = p.id
join kaizen.documento_item i on i.documento_id = d.id
join kaizen.traducao s on s.fonte = d.fonte and s.campo = 'sentido' and s.codigo = i.sentido
where p.papel in ('venda', 'troca') and i.vendedor is not null and s.valor in ('saida', 'entrada');
