-- Entra no cadastro do Kaizen, com fonte link, só o que um documento carregado cita e não ligou.
-- Nada se apaga: quem não é mais citado fica com o lido_em da última rodada que o citou.
insert into kaizen.produto (fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo, lido_em)
select
  'link', l.codigo_kaizen, p.descricao, g.descricao, null, s.descricao, m.descricao,
  p.preco_custo, not p.inativo, now()
from pg_temp.link_liga l
join erp.produto p on p.produto_codigo = l.codigo_origem
left join erp.prod_subgrupo s on s.id_prod_subgrupo = p.id_prod_subgrupo
left join erp.prod_grupo g on g.id_prod_grupo = s.id_prod_grupo
left join erp.marca m on m.id_marca = p.id_marca
where l.entidade = 'produto' and l.como = 'falha'
  and l.codigo_kaizen in (select i.produto from pg_temp.link_item i)
on conflict (fonte, codigo) do update set
  descricao = excluded.descricao,
  grupo = excluded.grupo,
  secao = excluded.secao,
  subgrupo = excluded.subgrupo,
  marca = excluded.marca,
  custo = excluded.custo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

-- cliente pelo cliente_codigo; fornecedor pelo fornecedor_codigo + 900000
insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo, lido_em)
select
  'link', l.codigo_kaizen, x.nome, x.cpf_cnpj, x.bairro,
  ci.descricao, ci.cod_cidade::text, ci.sigla_estado::text, x.ativo, now()
from pg_temp.link_liga l
join (
  select c.cliente_codigo as codigo_origem, c.nome, coalesce(c.cpf, c.cnpj) as cpf_cnpj, c.bairro, c.id_cidade, not c.inativo as ativo
  from erp.cliente c
  union all
  select (f.fornecedor_codigo + 900000)::text, f.razao_social, f.cpf_cnpj, f.bairro, f.id_cidade, not f.inativo
  from erp.fornecedor f
) x on x.codigo_origem = l.codigo_origem
left join erp.cidade ci on ci.id_cidade = x.id_cidade
where l.entidade = 'pessoa' and l.como = 'falha'
  and l.codigo_kaizen in (select d.pessoa from pg_temp.link_doc d)
on conflict (fonte, codigo) do update set
  nome = excluded.nome,
  cpf_cnpj = excluded.cpf_cnpj,
  bairro = excluded.bairro,
  municipio = excluded.municipio,
  ibge = excluded.ibge,
  uf = excluded.uf,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

insert into kaizen.funcionario (fonte, codigo, nome, usuario, tipo, ativo, lido_em)
select 'link', l.codigo_kaizen, u.nome, null, null, not u.inativo, now()
from pg_temp.link_liga l
join erp.usuario u on u.id_usuario::text = l.codigo_origem
where l.entidade = 'funcionario' and l.como = 'falha'
  and l.codigo_kaizen in (select i.vendedor from pg_temp.link_item i)
on conflict (fonte, codigo) do update set
  nome = excluded.nome,
  usuario = excluded.usuario,
  tipo = excluded.tipo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

-- As falhas da de_para são refeitas a cada rodada; as decisões ficam como estão.
delete from kaizen.de_para where fonte = 'link' and codigo_kaizen like 'link:%';

insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen)
select l.entidade, 'link', l.codigo_origem, l.codigo_kaizen
from pg_temp.link_liga l
where l.como = 'falha'
  and (
    (l.entidade = 'produto' and l.codigo_kaizen in (select i.produto from pg_temp.link_item i))
    or (l.entidade = 'pessoa' and l.codigo_kaizen in (select d.pessoa from pg_temp.link_doc d))
    or (l.entidade = 'funcionario' and l.codigo_kaizen in (select i.vendedor from pg_temp.link_item i))
  );
