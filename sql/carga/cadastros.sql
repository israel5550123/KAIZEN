-- quem não veio nesta leitura fica como está, com o lido_em da última leitura que o trouxe
insert into kaizen.produto (fonte, codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo, lido_em)
select distinct on (p->>'codigo')
  'meuerp', p->>'codigo', p->>'descricao', p->>'grupo', p->>'secao', p->>'subgrupo', p->>'marca',
  (p->>'custo')::numeric, coalesce(p->>'inativo', 'F') <> 'T', now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'produtos') p
where x.assunto = 'cadastros'
order by p->>'codigo', x.parte desc
on conflict (fonte, codigo) do update set
  descricao = excluded.descricao,
  grupo = excluded.grupo,
  secao = excluded.secao,
  subgrupo = excluded.subgrupo,
  marca = excluded.marca,
  custo = excluded.custo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

insert into kaizen.pessoa (fonte, codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo, lido_em)
select distinct on (p->>'codigo')
  'meuerp', p->>'codigo',
  nullif(btrim(concat_ws(' ', nullif(btrim(p->>'nome'), ''), nullif(btrim(p->>'sobrenome'), ''))), ''),
  p->>'cpf_cnpj', p->>'bairro', p->>'municipio', p->>'ibge', p->>'uf',
  coalesce(p->>'inativo', 'F') <> 'T', now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'pessoas') p
where x.assunto = 'cadastros'
order by p->>'codigo', x.parte desc
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
select distinct on (f->>'codigo')
  'meuerp', f->>'codigo',
  nullif(btrim(concat_ws(' ', nullif(btrim(f->>'nome'), ''), nullif(btrim(f->>'sobrenome'), ''))), ''),
  (f->>'usuario')::integer, f->>'tipo',
  coalesce(f->>'inativo', 'F') <> 'T', now()
from pg_temp.entrada x, jsonb_array_elements(x.dados->'funcionarios') f
where x.assunto = 'cadastros'
order by f->>'codigo', x.parte desc
on conflict (fonte, codigo) do update set
  nome = excluded.nome,
  usuario = excluded.usuario,
  tipo = excluded.tipo,
  ativo = excluded.ativo,
  lido_em = excluded.lido_em;

-- a ligação produto-fornecedor não guarda nome: a parte do ERP novo é trocada inteira
delete from kaizen.produto_fornecedor where fonte = 'meuerp';

insert into kaizen.produto_fornecedor (fonte, produto, fornecedor)
select distinct 'meuerp', f->>'produto', f->>'fornecedor'
from pg_temp.entrada x, jsonb_array_elements(x.dados->'fornecedores') f
where x.assunto = 'cadastros';

select
  (select count(distinct p->>'codigo') from pg_temp.entrada x, jsonb_array_elements(x.dados->'produtos') p where x.assunto = 'cadastros') as produtos,
  (select count(distinct p->>'codigo') from pg_temp.entrada x, jsonb_array_elements(x.dados->'pessoas') p where x.assunto = 'cadastros') as pessoas,
  (select count(distinct f->>'codigo') from pg_temp.entrada x, jsonb_array_elements(x.dados->'funcionarios') f where x.assunto = 'cadastros') as funcionarios,
  (select count(*) from kaizen.produto_fornecedor where fonte = 'meuerp') as fornecedores
