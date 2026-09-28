-- Números do Kaizen para o dono conferir com o ERP, só do ERP novo. $1 = códigos dos produtos pedidos (text[]);
-- $2 = primeiro dia das execuções mostradas (date, em Fortaleza). A sessão está em America/Fortaleza (conectar).
with venda_154 as (
  -- regra do relatório 154: documento emitido, de saída, que recebe; só os itens com vendedor; dia da criação
  select d.id, d.criado_em::date as dia, i.valor_liquido
  from kaizen.documento_negocio d
  join kaizen.documento_item i on i.documento_id = d.id
  where d.fonte = 'meuerp' and d.situacao = 'emitido' and d.movimento = 'saida' and d.financeiro = 'recebe'
    and i.vendedor is not null and d.criado_em >= '2026-09-28'
),
fechamento as (
  select d.id, d.codigo, d.criado_em, d.turno_caixa, d.turno_usuario, d.turno_numero, cf.formas, cf.quebra
  from kaizen.documento_negocio d
  cross join lateral (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'forma', tf.valor,
        'codigo_forma', c.forma,
        'calculado', coalesce(c.calculado, 0)::text,
        'informado', coalesce(c.informado, 0)::text,
        'quebra', (coalesce(c.informado, 0) - coalesce(c.calculado, 0))::text
      ) order by c.forma collate "C"), '[]'::jsonb) as formas,
      coalesce(sum(coalesce(c.informado, 0) - coalesce(c.calculado, 0)), 0)::text as quebra
    from kaizen.conferencia_caixa c
    left join kaizen.traducao tf on tf.fonte = d.fonte and tf.campo = 'forma' and tf.codigo = c.forma
    -- a linha da forma troca é o crédito de troca, não dinheiro na gaveta: fica fora da quebra
    where c.documento_id = d.id and tf.valor is distinct from 'troca'
  ) cf
  -- o ERP só conta a conferência de fechamento emitido: o cancelado ou refeito não aparece na tela
  where d.fonte = 'meuerp' and d.tipo = 'fechamento_caixa' and d.situacao = 'emitido' and d.criado_em >= '2026-09-28'
)
select
  (select jsonb_build_object(
     'dias', coalesce((
       select jsonb_agg(jsonb_build_object('dia', to_char(x.dia, 'YYYY-MM-DD'), 'vendas', x.vendas, 'total', x.total) order by x.dia)
       from (select v.dia, count(distinct v.id) as vendas, coalesce(sum(v.valor_liquido), 0)::text as total
             from venda_154 v group by v.dia) x
     ), '[]'::jsonb),
     'vendas', (select count(distinct v.id) from venda_154 v),
     'total', (select coalesce(sum(v.valor_liquido), 0)::text from venda_154 v)
   )) as vendas,
  (select jsonb_build_object(
     'parcelas', count(*) filter (where not x.troca), 'total', coalesce(sum(x.valor) filter (where not x.troca), 0)::text,
     'trocas', count(*) filter (where x.troca), 'trocas_total', coalesce(sum(x.valor) filter (where x.troca), 0)::text,
     'tela', count(*), 'tela_total', coalesce(sum(x.valor), 0)::text)
   from (
     -- a tela de contas a pagar do ERP: parcela pendente de documento que paga, sem o modelo TR. Ela soma o crédito
     -- de troca (modelo TM), que para o Kaizen não é conta: fica fora das contas e aparece à parte
     select p.valor, d.tipo is not distinct from 'troca' as troca
     from kaizen.parcela p
     join kaizen.documento_negocio d on d.id = p.documento_id
     join kaizen.traducao tp on tp.fonte = d.fonte and tp.campo = 'status_parcela' and tp.codigo = p.status
     where d.fonte = 'meuerp' and d.financeiro = 'paga' and tp.valor = 'pendente' and d.modelo <> 'TR'
   ) x) as contas,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'codigo', f.codigo, 'quando', to_char(f.criado_em, 'DD/MM "às" HH24"h"MI'),
     'caixa', f.turno_caixa, 'usuario', f.turno_usuario, 'abertura', f.turno_numero,
     'formas', f.formas, 'quebra', f.quebra
   ) order by f.criado_em, f.id), '[]'::jsonb)
   from fechamento f) as fechamentos,
  (select coalesce(jsonb_agg(jsonb_build_object(
     'produto', q.produto, 'descricao', pr.descricao,
     'quantidade', trim_scale(e.quantidade)::text,
     'tem_foto', e.produto is not null,
     'lido', to_char(e.lido_em, 'DD/MM "às" HH24"h"MI')
   ) order by q.ordem), '[]'::jsonb)
   from unnest($1::text[]) with ordinality as q (produto, ordem)
   left join kaizen.estoque_atual e on e.fonte = 'meuerp' and e.produto = q.produto
   left join kaizen.produto pr on pr.fonte = 'meuerp' and pr.codigo = q.produto) as produtos,
  -- antes da primeira execução agendada, nenhum horário é cobrado (spec 6.6)
  (select jsonb_build_object(
     'primeira', (select to_char(min(p.inicio), 'YYYY-MM-DD HH24') from kaizen.execucao p where not p.manual),
     'linhas', coalesce((
       select jsonb_agg(jsonb_build_object(
         'dia', to_char(x.inicio, 'YYYY-MM-DD'), 'hora', extract(hour from x.inicio)::int, 'resultado', x.resultado,
         'telegram', x.telegram_ok
       ) order by x.id)
       from kaizen.execucao x
       where not x.manual and x.inicio >= $2::date
     ), '[]'::jsonb)
   )) as execucoes,
  (select jsonb_build_object(
     'dia', to_char(n.inicio, 'YYYY-MM-DD'), 'resultado', n.resultado, 'mensagem', n.mensagem,
     'diferencas', coalesce((
       select jsonb_agg(a.aviso->>'texto' order by a.ordem)
       from jsonb_array_elements(n.avisos) with ordinality as a (aviso, ordem)
       where a.aviso->>'tipo' = 'total_diferente'
     ), '[]'::jsonb))
   from kaizen.execucao n
   where n.tipo = 'noite' and n.resultado in ('ok', 'aviso', 'falha')
   order by n.id desc
   limit 1) as noite
