-- Consultas SÓ DE LEITURA ao banco do Kaizen na VPS (esquema kaizen), para medir a base do plano de vendas.
-- NÃO FORAM EXECUTADAS: esta sessão (nuvem, 03/10/2026) não tem acesso ao banco nem ao ERP.
-- Como rodar: publicacao/README.md, passo 14 ("Consultar o banco do Kaizen"), que abre o psql com
-- PGOPTIONS='-c default_transaction_read_only=on': qualquer tentativa de escrita para com erro e nada muda.
-- Colar o bloco inteiro entre as duas linhas SQL do passo 14 e devolver a saída.
-- Regras usadas (docs/LOJA.md): venda válida = documento de papel 'venda' com item vendido (kaizen.documento_papel +
-- kaizen.venda_item, migração 012); cliente = pessoa com pelo menos uma venda válida, fora o Consumidor Final 999007;
-- "hoje" = data de America/Fortaleza.

-- 1. Panorama: vendas, período, Consumidor Final, vendas sem cliente, clientes, produtos e vendedores distintos.
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
v as (
  select i.documento, i.fonte, i.dia, i.pessoa, i.produto, i.vendedor, i.valor
  from kaizen.venda_item i
  where i.sentido = 'vendido' and i.documento in (select id from venda)
)
select coalesce(fonte, 'total') as fonte,
  count(distinct documento) as vendas,
  min(dia) as primeira_venda,
  max(dia) as ultima_venda,
  count(distinct documento) filter (where pessoa = '999007') as vendas_consumidor_final,
  round(100.0 * count(distinct documento) filter (where pessoa = '999007') / count(distinct documento), 1) as pct_vendas_cf,
  round(100.0 * coalesce(sum(valor) filter (where pessoa = '999007'), 0) / sum(valor), 1) as pct_valor_cf,
  count(distinct documento) filter (where pessoa is null) as vendas_sem_cliente,
  count(distinct pessoa) filter (where pessoa <> '999007' and pessoa not like 'link:%') as clientes_com_compra,
  count(distinct produto) as produtos_distintos_vendidos,
  count(distinct vendedor) as vendedores_com_venda
from v
group by rollup (fonte)
order by fonte nulls last;

-- 2. Cadastro: pessoas lidas do ERP e funcionários (com o tipo do ERP: V = vendedor).
select fonte, count(*) as pessoas, count(*) filter (where ativo) as ativas from kaizen.pessoa group by fonte order by fonte;
select fonte, codigo, nome, tipo, ativo from kaizen.funcionario order by fonte, codigo;

-- 3. Recência: clientes que compraram nos últimos 30, 60 e 90 dias; sumidos (mais de 60 dias); com 3+ compras.
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
ultima as (
  select pessoa, max(dia) as ultima, count(distinct documento) as compras
  from kaizen.venda_item
  where sentido = 'vendido' and documento in (select id from venda)
    and pessoa is not null and pessoa <> '999007' and pessoa not like 'link:%'
  group by pessoa
),
h as (select (now() at time zone 'America/Fortaleza')::date as hoje)
select h.hoje,
  count(*) as clientes,
  count(*) filter (where h.hoje - ultima <= 30) as compraram_ate_30_dias,
  count(*) filter (where h.hoje - ultima <= 60) as compraram_ate_60_dias,
  count(*) filter (where h.hoje - ultima <= 90) as compraram_ate_90_dias,
  count(*) filter (where h.hoje - ultima > 60) as sumidos_mais_de_60_dias,
  count(*) filter (where compras >= 3) as com_3_ou_mais_compras
from ultima, h
group by h.hoje;

-- 4. Base do "comprado junto": vendas com 2 ou mais produtos distintos e produtos por venda (com e sem o 999007).
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
por_venda as (
  select documento, fonte, bool_or(pessoa = '999007') as balcao, count(distinct produto) as produtos
  from kaizen.venda_item
  where sentido = 'vendido' and documento in (select id from venda)
  group by documento, fonte
)
select coalesce(fonte, 'total') as fonte,
  count(*) as vendas,
  count(*) filter (where produtos >= 2) as vendas_com_2_ou_mais_produtos,
  round(100.0 * count(*) filter (where produtos >= 2) / count(*), 1) as pct_com_2_ou_mais,
  round(avg(produtos), 2) as produtos_por_venda,
  count(*) filter (where not coalesce(balcao, false)) as vendas_fora_do_balcao,
  count(*) filter (where not coalesce(balcao, false) and produtos >= 2) as fora_do_balcao_com_2_ou_mais,
  max(produtos) as maior_numero_de_produtos
from por_venda
group by rollup (fonte)
order by fonte nulls last;

-- 5. As 10 duplas de produtos que mais saem na mesma venda, com a parte das vendas de cada produto que levou o outro.
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
vp as (
  select distinct documento, produto from kaizen.venda_item
  where sentido = 'vendido' and documento in (select id from venda)
),
vendas_do_produto as (select produto, count(*) as vendas from vp group by produto),
pares as (
  select a.produto as produto_a, b.produto as produto_b, count(*) as vendas_juntas
  from vp a join vp b on b.documento = a.documento and b.produto > a.produto
  group by a.produto, b.produto
)
select p.produto_a, pa.descricao as descricao_a, p.produto_b, pb.descricao as descricao_b, p.vendas_juntas,
  va.vendas as vendas_de_a, vb.vendas as vendas_de_b,
  round(100.0 * p.vendas_juntas / va.vendas, 1) as pct_das_vendas_de_a,
  round(100.0 * p.vendas_juntas / vb.vendas, 1) as pct_das_vendas_de_b
from pares p
join vendas_do_produto va on va.produto = p.produto_a
join vendas_do_produto vb on vb.produto = p.produto_b
left join kaizen.produto pa on pa.fonte = 'meuerp' and pa.codigo = p.produto_a
left join kaizen.produto pb on pb.fonte = 'meuerp' and pb.codigo = p.produto_b
order by p.vendas_juntas desc, p.produto_a, p.produto_b
limit 10;

-- 6. Quantas duplas têm base para sugestão (saíram juntas em 5+ e 10+ vendas).
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
vp as (
  select distinct documento, produto from kaizen.venda_item
  where sentido = 'vendido' and documento in (select id from venda)
),
pares as (
  select a.produto as produto_a, b.produto as produto_b, count(*) as vendas_juntas
  from vp a join vp b on b.documento = a.documento and b.produto > a.produto
  group by a.produto, b.produto
)
select count(*) as duplas, count(*) filter (where vendas_juntas >= 5) as duplas_5_ou_mais,
  count(*) filter (where vendas_juntas >= 10) as duplas_10_ou_mais
from pares;

-- 7. Carteira de fato: clientes por vendedor que vendeu, e quantos clientes compraram de 1, 2 ou 3 vendedores.
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
cv as (
  select pessoa, vendedor, count(distinct documento) as vendas, sum(valor) as valor
  from kaizen.venda_item
  where sentido = 'vendido' and documento in (select id from venda)
    and pessoa is not null and pessoa <> '999007' and pessoa not like 'link:%'
  group by pessoa, vendedor
)
select cv.vendedor, f.nome, f.tipo, count(*) as clientes, sum(cv.vendas) as vendas, round(sum(cv.valor), 2) as valor
from cv
left join kaizen.funcionario f on f.fonte = 'meuerp' and f.codigo = cv.vendedor
group by cv.vendedor, f.nome, f.tipo
order by valor desc;

with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
n as (
  select pessoa, count(distinct vendedor) as vendedores
  from kaizen.venda_item
  where sentido = 'vendido' and documento in (select id from venda)
    and pessoa is not null and pessoa <> '999007' and pessoa not like 'link:%'
  group by pessoa
)
select vendedores as comprou_de_quantos_vendedores, count(*) as clientes from n group by vendedores order by vendedores;

-- 8. O caso real do dono: cola de contato (produtos com "cola" e "contato" na descrição).
with venda as materialized (select id from kaizen.documento_papel where papel = 'venda'),
h as (select (now() at time zone 'America/Fortaleza')::date as hoje),
cola as (select codigo from kaizen.produto where fonte = 'meuerp' and descricao ilike '%cola%contato%'),
cli as (
  select i.pessoa, max(i.dia) as ultima_compra,
         max(i.dia) filter (where i.produto in (select codigo from cola)) as ultima_cola
  from kaizen.venda_item i
  where i.sentido = 'vendido' and i.documento in (select id from venda)
    and i.pessoa is not null and i.pessoa <> '999007' and i.pessoa not like 'link:%'
  group by i.pessoa
)
select (select count(*) from cola) as produtos_cola_de_contato,
  count(*) filter (where ultima_cola is not null) as clientes_que_ja_compraram_cola,
  count(*) filter (where ultima_cola is not null and h.hoje - ultima_cola > 7) as ja_compraram_mas_nao_nos_ultimos_7_dias,
  count(*) filter (where h.hoje - ultima_compra <= 90) as clientes_ativos_90_dias,
  count(*) filter (where h.hoje - ultima_compra <= 90 and (ultima_cola is null or h.hoje - ultima_cola > 7)) as ativos_90_dias_sem_cola_nos_ultimos_7
from cli, h;

-- 9. Itens por venda e ticket médio que a Fase 4 já calcula (kaizen.resposta), no fim de cada mês e hoje.
select data,
  conteudo->'mes'->>'vendas' as vendas_no_mes,
  conteudo->'mes'->>'itens_por_venda' as itens_por_venda_no_mes,
  conteudo->'mes'->>'ticket_medio' as ticket_medio_no_mes
from kaizen.resposta
where pergunta = 'vendas'
  and (data in ('2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30')
       or data = (now() at time zone 'America/Fortaleza')::date)
order by data;
