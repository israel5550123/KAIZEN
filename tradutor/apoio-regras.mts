import type { Cliente } from './banco.mts'

// Monta documentos à mão num banco de teste (criarBancoKaizen), para os testes das regras da Fase 4.
// Datas e horas vão em texto 'AAAA-MM-DD HH:MI:SS' (Fortaleza) e valores em texto ('150.00'): nada vira number.
// Status, forma e sentido são os códigos crus da fonte, traduzidos por kaizen.traducao.
// origem_tabela e origem_id saem sozinhos, de um contador (menos no movimento de estoque, em que a ordem é o teste).

type Fonte = 'meuerp' | 'link'

let contador = 0

function proximo(): string {
  contador += 1
  return String(contador)
}

export async function inserirNatureza(
  c: Cliente,
  n: { fonte?: Fonte; codigo: string; descricao?: string; categoria: string; estoque: boolean; reserva?: boolean; financeiro: boolean; troca?: boolean },
): Promise<number> {
  const { rows } = await c.query<{ id: string }>(
    `insert into kaizen.natureza (fonte, codigo, descricao, categoria, estoque, reserva, financeiro, troca)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [n.fonte ?? 'meuerp', n.codigo, n.descricao ?? n.codigo, n.categoria, n.estoque, n.reserva ?? false, n.financeiro, n.troca ?? false],
  )
  return Number(rows[0].id)
}

// status ausente = 'E' (emitido no ERP novo); na Link, passe null e a situação vem pelo modelo.
// fechadoEm ausente = igual a criadoEm; null deixa vazio. codigo ausente = o número do contador.
export async function inserirDocumento(
  c: Cliente,
  d: {
    fonte?: Fonte; modelo: string; status?: string | null; criadoEm: string; fechadoEm?: string | null
    pessoa?: string | null; naturezaId?: number | null; natureza?: string | null; codigo?: string
  },
): Promise<number> {
  const origemId = proximo()
  const { rows } = await c.query<{ id: string }>(
    `insert into kaizen.documento (fonte, origem_tabela, origem_id, codigo, modelo, status, criado_em, fechado_em, pessoa, natureza, natureza_id)
     values ($1, 'documento', $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [
      d.fonte ?? 'meuerp', origemId, d.codigo ?? origemId, d.modelo,
      d.status === undefined ? 'E' : d.status,
      d.criadoEm,
      d.fechadoEm === undefined ? d.criadoEm : d.fechadoEm,
      d.pessoa ?? null, d.natureza ?? null, d.naturezaId ?? null,
    ],
  )
  return Number(rows[0].id)
}

export async function inserirItem(
  c: Cliente,
  documentoId: number,
  i: { produto: string; sentido: 'S' | 'E' | 'N'; quantidade: string; valor: string; vendedor?: string | null },
): Promise<void> {
  await c.query(
    `insert into kaizen.documento_item (documento_id, origem_tabela, origem_id, sentido, produto, quantidade, valor_liquido, vendedor)
     values ($1, 'documento_mercadoria', $2, $3, $4, $5, $6, $7)`,
    [documentoId, proximo(), i.sentido, i.produto, i.quantidade, i.valor, i.vendedor ?? null],
  )
}

// sequencia é o _idsequencia do ERP novo (migração 015), que liga o pagamento à parcela a receber; ausente = vazia.
export async function inserirPagamento(
  c: Cliente,
  documentoId: number,
  p: { forma: string; valor: string; sequencia?: number },
): Promise<void> {
  await c.query(
    `insert into kaizen.documento_pagamento (documento_id, origem_tabela, origem_id, forma, valor, sequencia)
     values ($1, 'documento_pagamento', $2, $3, $4, $5)`,
    [documentoId, proximo(), p.forma, p.valor, p.sequencia ?? null],
  )
}

export async function inserirParcela(
  c: Cliente,
  documentoId: number,
  p: { lancadoEm: string; vencimento: string; valor: string; status: string; sequencia?: number },
): Promise<number> {
  const { rows } = await c.query<{ id: string }>(
    `insert into kaizen.parcela (documento_id, origem_tabela, origem_id, lancado_em, vencimento, valor, status, sequencia)
     values ($1, 'documento_parcela', $2, $3, $4, $5, $6, $7) returning id`,
    [documentoId, proximo(), p.lancadoEm, p.vencimento, p.valor, p.status, p.sequencia ?? null],
  )
  return Number(rows[0].id)
}

export async function inserirBaixa(
  c: Cliente,
  parcelaId: number,
  b: { pagoEm: string; valor: string; forma?: string | null; status: string },
): Promise<void> {
  await c.query(
    `insert into kaizen.baixa (parcela_id, origem_tabela, origem_id, pago_em, valor, forma, status)
     values ($1, 'documento_parcela_pagamento', $2, $3, $4, $5, $6)`,
    [parcelaId, proximo(), b.pagoEm, b.valor, b.forma ?? null, b.status],
  )
}

export async function inserirConferencia(
  c: Cliente,
  documentoId: number,
  f: { forma: string; calculado: string; informado: string },
): Promise<void> {
  await c.query(
    `insert into kaizen.conferencia_caixa (documento_id, origem_tabela, origem_id, forma, calculado, informado)
     values ($1, 'documento_conferencia_caixa', $2, $3, $4, $5)`,
    [documentoId, proximo(), f.forma, f.calculado, f.informado],
  )
}

// O movimento é do ERP novo (a Link não tem histórico de estoque); origemId vem do teste.
export async function inserirMovimento(
  c: Cliente,
  m: { produto: string; momento: string; saldoAntes: string; saldoDepois: string; origemId: string },
): Promise<void> {
  await c.query(
    `insert into kaizen.estoque_movimento (fonte, origem_tabela, origem_id, produto, momento, saldo_antes, saldo_depois)
     values ('meuerp', 'mercadoria_estoque_historico', $1, $2, $3, $4, $5)`,
    [m.origemId, m.produto, m.momento, m.saldoAntes, m.saldoDepois],
  )
}

// A migração 004 já grava a foto da virada (1.029 produtos): aqui a quantidade do produto é trocada, ou acrescentada.
export async function inserirVirada(c: Cliente, produto: string, quantidade: string): Promise<void> {
  await c.query(
    `insert into kaizen.estoque_virada (produto, quantidade) values ($1, $2)
     on conflict (produto) do update set quantidade = excluded.quantidade`,
    [produto, quantidade],
  )
}

export async function inserirProduto(
  c: Cliente,
  p: { codigo: string; descricao?: string; grupo?: string | null; marca?: string | null; custo?: string | null; ativo?: boolean; fonte?: Fonte },
): Promise<void> {
  await c.query(
    `insert into kaizen.produto (fonte, codigo, descricao, grupo, marca, custo, ativo)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [p.fonte ?? 'meuerp', p.codigo, p.descricao ?? null, p.grupo ?? null, p.marca ?? null, p.custo ?? null, p.ativo ?? true],
  )
}

export async function inserirFuncionario(
  c: Cliente,
  f: { codigo: string; nome: string; tipo: string | null; fonte?: Fonte },
): Promise<void> {
  await c.query(
    `insert into kaizen.funcionario (fonte, codigo, nome, tipo, ativo) values ($1, $2, $3, $4, true)`,
    [f.fonte ?? 'meuerp', f.codigo, f.nome, f.tipo],
  )
}

export async function inserirFornecedor(c: Cliente, produto: string, fornecedor: string): Promise<void> {
  await c.query(
    `insert into kaizen.produto_fornecedor (fonte, produto, fornecedor) values ('meuerp', $1, $2)`,
    [produto, fornecedor],
  )
}
