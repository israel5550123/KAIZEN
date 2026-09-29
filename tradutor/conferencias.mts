import type { Cliente } from './banco.mts'
import type { Horario } from './janela.mts'
import type { Aviso } from './tipos.mts'
import {
  avisoCodigoSemTraducao, avisoEstoqueDiverge, avisoExecucaoFaltou, avisoFechamentoComResto,
} from './avisos.mts'

// Cada código cru do ERP novo e o campo de kaizen.traducao que o explica; o código da natureza é explicado por
// kaizen.natureza. Natureza vazia (documento sem natureza no ERP, ou gravado antes da Fase 4) não é código.
const SQL_CODIGOS_SEM_TRADUCAO = `
with documento_erp as (
  select id from kaizen.documento where fonte = 'meuerp'
),
achado (campo, codigo) as (
  select 'tipo', d.modelo from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'situacao', d.status from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'movimento', d.movimento from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'financeiro', d.financeiro from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'natureza', d.natureza from kaizen.documento d where d.fonte = 'meuerp'
  union all
  select 'sentido', i.sentido from kaizen.documento_item i join documento_erp d on d.id = i.documento_id
  union all
  select 'forma', p.forma from kaizen.documento_pagamento p join documento_erp d on d.id = p.documento_id
  union all
  select 'forma', c.forma from kaizen.conferencia_caixa c join documento_erp d on d.id = c.documento_id
  union all
  select 'status_parcela', pa.status from kaizen.parcela pa join documento_erp d on d.id = pa.documento_id
  union all
  select b.campo, b.codigo
  from kaizen.baixa x
  join kaizen.parcela pa on pa.id = x.parcela_id
  join documento_erp d on d.id = pa.documento_id
  cross join lateral (values ('forma', x.forma), ('status_baixa', x.status)) b (campo, codigo)
)
select c.campo, c.codigo, count(*)::int as quantidade
from achado c
where c.codigo is not null
  and case c.campo
    when 'natureza' then not exists (
      select 1 from kaizen.natureza n
      where n.fonte = 'meuerp' and n.codigo = c.codigo
    )
    else not exists (
      select 1 from kaizen.traducao t
      where t.fonte = 'meuerp' and t.campo = c.campo and t.codigo = c.codigo
    )
  end
group by c.campo, c.codigo
order by c.campo collate "C", c.codigo collate "C"`

export async function codigosSemTraducao(cliente: Cliente): Promise<Aviso[]> {
  const r = await cliente.query<{ campo: string; codigo: string; quantidade: number }>(SQL_CODIGOS_SEM_TRADUCAO)
  return r.rows.map((l) => avisoCodigoSemTraducao(l.campo, l.codigo, l.quantidade))
}

// Roda dentro da transação da carga, depois de gravarDocumentos: pg_temp.doc_lido só existe até o commit.
// Só o fechamento (FC) avisa: os números 98, 99 e 118 dos restos de 26/09 também caem em ajustes de custo (AC),
// que não têm quebra de caixa.
export async function fechamentosComResto(cliente: Cliente): Promise<Aviso[]> {
  const r = await cliente.query<{ origem_id: string; codigo: string; criado_em: string }>(`
    select l.origem_id, l.j->>'codigo' as codigo, l.j->>'criado_em' as criado_em
    from pg_temp.doc_lido l
    where l.j->>'modelo' = 'FC' and (l.j->>'conferencia_abaixo_corte')::int > 0
    order by l.origem_id::bigint`)
  return r.rows.map((l) => avisoFechamentoComResto(l.codigo, l.criado_em, l.origem_id))
}

// O último movimento de um produto é o de maior oid (ordem de gravação no ERP), não o de maior momento:
// o caixa sem internet e o orçamento convertido gravam movimento novo com hora antiga.
const SQL_ESTOQUE_DIVERGE = `
with ultimo as (
  select distinct on (m.produto) m.produto, m.origem_id, m.saldo_depois
  from kaizen.estoque_movimento m
  where m.fonte = 'meuerp'
  order by m.produto, m.origem_id::bigint desc
),
foto as (
  select a.produto, a.quantidade from kaizen.estoque_atual a where a.fonte = 'meuerp'
),
comparado as (
  select
    coalesce(f.produto, u.produto) as produto,
    case when u.produto is not null then u.saldo_depois else coalesce(v.quantidade, 0) end as esperado,
    u.origem_id as ultimo_oid,
    f.produto is not null as tem_foto,
    f.quantidade as foto
  from foto f
  full join ultimo u on u.produto = f.produto
  left join kaizen.estoque_virada v on v.produto = coalesce(f.produto, u.produto)
)
select
  produto,
  coalesce(esperado::text, 'vazio') as esperado,
  case when tem_foto then coalesce(foto::text, 'vazio') else 'sem foto' end as foto,
  ultimo_oid
from comparado
where not tem_foto or esperado is distinct from foto
order by produto collate "C"`

export async function estoqueDiverge(cliente: Cliente): Promise<Aviso[]> {
  const r = await cliente.query<{ produto: string; esperado: string; foto: string; ultimo_oid: string | null }>(SQL_ESTOQUE_DIVERGE)
  return r.rows.map((l) => avisoEstoqueDiverge(l.produto, l.esperado, l.foto, l.ultimo_oid))
}

export function avisosDeFaltas(faltando: Horario[]): Aviso[] {
  return faltando.map(avisoExecucaoFaltou)
}
