-- Liga todo código da Link ao cadastro do ERP novo (fonte meuerp), nesta ordem:
-- 1) decisão da de_para; 2) a regra: produto pelo código, pessoa pelo CPF/CNPJ só com dígitos,
-- vendedor pelo primeiro nome, sem acento e em maiúsculas; 3) falha: 'link:' e o código da Link.
-- O fornecedor ganha 900000 no código, como a migração fez no ERP novo.
insert into pg_temp.link_liga (entidade, codigo_origem, codigo_kaizen, como)
with origem (entidade, codigo_origem, documento, nome) as (
  select 'produto', p.produto_codigo, null::text, null::text
  from erp.produto p
  union all
  select 'pessoa', c.cliente_codigo, regexp_replace(coalesce(c.cpf, c.cnpj), '[^0-9]', '', 'g'), null
  from erp.cliente c
  union all
  select 'pessoa', (f.fornecedor_codigo + 900000)::text, regexp_replace(f.cpf_cnpj, '[^0-9]', '', 'g'), null
  from erp.fornecedor f
  union all
  select 'funcionario', u.id_usuario::text, null,
    upper(translate(btrim(u.nome),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
  from erp.usuario u
),
pessoa_meuerp as (
  select p.codigo, regexp_replace(p.cpf_cnpj, '[^0-9]', '', 'g') as documento
  from kaizen.pessoa p
  where p.fonte = 'meuerp'
),
funcionario_meuerp as (
  select f.codigo,
    upper(translate(split_part(btrim(f.nome), ' ', 1),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')) as primeiro_nome
  from kaizen.funcionario f
  where f.fonte = 'meuerp'
),
-- a regra só liga quando acha exatamente um no cadastro do ERP novo
regra (entidade, codigo_origem, codigo_kaizen) as (
  select o.entidade, o.codigo_origem, p.codigo
  from origem o
  join kaizen.produto p on p.fonte = 'meuerp' and p.codigo = o.codigo_origem
  where o.entidade = 'produto'
  union all
  select o.entidade, o.codigo_origem, min(p.codigo)
  from origem o
  join pessoa_meuerp p on p.documento = o.documento
  where o.entidade = 'pessoa' and o.documento <> ''
  group by o.entidade, o.codigo_origem
  having count(*) = 1
  union all
  select o.entidade, o.codigo_origem, min(f.codigo)
  from origem o
  join funcionario_meuerp f on f.primeiro_nome = o.nome
  where o.entidade = 'funcionario' and o.nome <> ''
  group by o.entidade, o.codigo_origem
  having count(*) = 1
)
select
  o.entidade, o.codigo_origem,
  coalesce(d.codigo_kaizen, r.codigo_kaizen, 'link:' || o.codigo_origem),
  case
    when d.codigo_kaizen is not null then 'decisao'
    when r.codigo_kaizen is not null then 'regra'
    else 'falha'
  end
from origem o
left join kaizen.de_para d
  on d.entidade = o.entidade and d.fonte = 'link' and d.codigo_origem = o.codigo_origem
 and d.codigo_kaizen not like 'link:%'
left join regra r on r.entidade = o.entidade and r.codigo_origem = o.codigo_origem;

-- decisões que apontam para código inexistente no cadastro do ERP novo: vazio quando está tudo certo
select d.entidade, d.codigo_origem, d.codigo_kaizen
from kaizen.de_para d
where d.fonte = 'link'
  and d.codigo_kaizen not like 'link:%'
  and not exists (select 1 from kaizen.produto p where d.entidade = 'produto' and p.fonte = 'meuerp' and p.codigo = d.codigo_kaizen)
  and not exists (select 1 from kaizen.pessoa p where d.entidade = 'pessoa' and p.fonte = 'meuerp' and p.codigo = d.codigo_kaizen)
  and not exists (select 1 from kaizen.funcionario f where d.entidade = 'funcionario' and f.fonte = 'meuerp' and f.codigo = d.codigo_kaizen)
order by d.entidade, d.codigo_origem;
