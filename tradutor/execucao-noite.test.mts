import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { ErroErp } from './erp.mts'
import type { Erp } from './erp.mts'
import { executar, registrarEstouro } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import type { TipoExecucao } from './tipos.mts'

let banco: BancoTeste
let falso: ErpFalso
let enviadas: string[] = []

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
  // Sem estatísticas, o Postgres compila a consulta de cadastros com JIT: 1,5 s por chamada em vez de milissegundos.
  await falso.cliente.query('set jit = off')
})

after(async () => {
  await falso?.fechar()
  await banco?.fechar()
})

beforeEach(async () => {
  enviadas = []
  await falso.cliente.query(TABELAS_DO_ERP.map((tabela) => `delete from ${tabela}`).join('; '))
  await banco.cliente.query(
    `truncate kaizen.documento, kaizen.estoque_movimento, kaizen.estoque_atual, kaizen.produto,
       kaizen.produto_fornecedor, kaizen.pessoa, kaizen.funcionario, kaizen.execucao restart identity cascade`,
  )
})

// Telegram falso: guarda cada mensagem e diz que o Telegram aceitou.
async function enviar(texto: string): Promise<boolean> {
  enviadas.push(texto)
  return true
}

// Hora cheia de Fortaleza (UTC−3), em milissegundos: horaEm('2026-09-29', 22) é terça, 22h.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

async function maiorId(): Promise<number> {
  const r = await banco.cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao')
  return Number(r.rows[0].id ?? 0)
}

// Roda uma execução com o relógio fingido e, depois, põe no registro a hora fingida (o Postgres grava a hora de verdade).
async function rodar(quando: number, tipo: TipoExecucao = 'noite', erp: Erp = falso.erp): Promise<Saida> {
  const antes = await maiorId()
  const saida = await executar(
    { tipo, manual: false },
    { erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => quando },
  )
  await banco.cliente.query(
    `update kaizen.execucao
        set inicio = to_timestamp($1::double precision / 1000),
            fim = to_timestamp($1::double precision / 1000) + interval '1 minute'
      where id > $2 and fim is not null`,
    [quando, antes],
  )
  return saida
}

// As 12 leituras de hora em hora de um dia, todas ok e sem aviso.
async function registrarDiaDeHoras(dia: string): Promise<void> {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado)
     select 'hora', false, ($1 || ' ' || h || ':00:03-03')::timestamptz, ($1 || ' ' || h || ':01:00-03')::timestamptz, 'ok'
       from generate_series(8, 19) h`,
    [dia],
  )
}

async function execucoes(): Promise<Array<Record<string, unknown>>> {
  const r = await banco.cliente.query(
    `select id::int as id, tipo, resultado, mensagem, avisos, resumo_ok, resumo_chaves, telegram_ok
       from kaizen.execucao order by id`,
  )
  return r.rows
}

// Terça, 29/09: o pedido 123 (R$ 150,00 em dinheiro, vendedor Igor), o movimento dele e a foto que bate, e os cadastros.
async function montarLoja(): Promise<void> {
  await falso.inserir('documento', [
    {
      oid: 186, _iddocumento: 123, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
      datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:16:30', idempresa: 1, idpessoa: 999007,
      idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
    },
  ])
  await falso.inserir('documento_mercadoria', [
    { oid: 1873, _iddocumento: 123, _idsequencia: 1, idmercadoriavariacao: 60, qtd: '1.000000', valtotalliquido: '150.000000', idpessoafuncionario: 1 },
  ])
  await falso.inserir('documento_pagamento', [{ oid: 1, _iddocumento: 123, _idsequencia: 1, idpagamento: 1, valor: '150.00' }])
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1848, _iddocumento: 123, _idlocalestoque: 1, datahora: '2026-09-29 10:15:00', idmercadoriavariacao: 60, qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
  ])
  await falso.inserir('mercadoria_estoque', [{ oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '2.000000' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, descricao: 'Produto 60', idmercadoria: 60 }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 1, _idmercadoriavariacao: 60, flaginativo: 'F' }])
  await falso.inserir('pessoa', [{ _idpessoa: 1, nome: 'Igor', flaginativo: 'F' }])
  await falso.inserir('pessoa_funcionario', [{ _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' }])
}

// Um documento com modelo AM, que não tem tradução: gera o mesmo aviso em toda leitura.
async function montarModeloSemTraducao(): Promise<void> {
  await falso.inserir('documento', [{
    oid: 187, _iddocumento: 124, modelo: 'AM', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-28 16:00:00', datahoramovimento: '2026-09-28 16:00:00', idempresa: 1,
  }])
}

const AVISO_AM = { tipo: 'codigo_sem_traducao', chave: 'codigo:tipo:AM', texto: 'o código "AM" de tipo apareceu 1 vez(es) e não tem tradução no Kaizen' }

test('noite com o Kaizen igual ao ERP: nenhum total diferente, e o dia limpo não manda resumo', async () => {
  await montarLoja()
  const antes = falso.consultas.length
  const saida = await rodar(horaEm('2026-09-29', 22))

  assert.equal(saida.resultado, 'ok')
  assert.deepEqual(saida.avisos, [])
  // A comparação de totais rodou: uma consulta de totais ao ERP.
  assert.equal(falso.consultas.slice(antes).filter((sql) => sql.includes('movimentos:variacao')).length, 1)
  assert.deepEqual(enviadas, [])
  const [linha] = await execucoes()
  assert.equal(linha.tipo, 'noite')
  assert.equal(linha.resumo_ok, true)
  assert.deepEqual(linha.resumo_chaves, [])
})

test('documentos em duas fatias de oid (185 e 5190) são os dois lidos', async () => {
  await falso.inserir('documento', [
    { oid: 185, _iddocumento: 94, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-27 14:20:00', idempresa: 1 },
    { oid: 5190, _iddocumento: 5099, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-29 08:00:00', idempresa: 1 },
  ])
  const antes = falso.consultas.length
  const saida = await rodar(horaEm('2026-09-29', 22))

  assert.equal(saida.resultado, 'ok')
  assert.equal(saida.contagens.documentos_lidos, 2)
  const docs = await banco.cliente.query('select origem_id from kaizen.documento order by origem_id::bigint')
  assert.deepEqual(docs.rows, [{ origem_id: '185' }, { origem_id: '5190' }])
  const desta = falso.consultas.slice(antes)
  assert.equal(desta.filter((sql) => sql.includes('d.oid between 185 and 5184')).length, 1)
  assert.equal(desta.filter((sql) => sql.includes('d.oid between 5185 and 10184')).length, 1)
})

test('movimento que sumiu do ERP vira aviso na noite e sai do Kaizen', async () => {
  await montarLoja()
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1849, _iddocumento: 124, _idlocalestoque: 1, datahora: '2026-09-29 11:00:00', idmercadoriavariacao: 60, qtdsaldoatual: '2.000000', qtdnovosaldo: '1.000000' },
  ])
  await falso.cliente.query(`update mercadoria_estoque set qtdsaldo = '1.000000'`)
  assert.equal((await rodar(horaEm('2026-09-29', 19), 'hora')).resultado, 'ok')
  // O suporte apaga o movimento 1849 e o saldo volta a 2.
  await falso.cliente.query('delete from mercadoria_estoque_historico where oid = 1849')
  await falso.cliente.query(`update mercadoria_estoque set qtdsaldo = '2.000000'`)

  const saida = await rodar(horaEm('2026-09-29', 22))

  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [
    { tipo: 'movimento_sumiu', chave: 'movimento:1849', texto: 'um movimento de estoque do produto 60 sumiu do ERP' },
  ])
  const movimentos = await banco.cliente.query('select origem_id from kaizen.estoque_movimento order by origem_id')
  assert.deepEqual(movimentos.rows, [{ origem_id: '1848' }])
})

test('movimentos que somem todos de uma vez são falha, e nada é apagado', async () => {
  await montarLoja()
  assert.equal((await rodar(horaEm('2026-09-29', 19), 'hora')).resultado, 'ok')
  // A lista de movimentos do ERP volta vazia: sem a proteção, a noite apagaria o histórico inteiro do Kaizen.
  await falso.cliente.query('delete from mercadoria_estoque_historico')

  const saida = await rodar(horaEm('2026-09-29', 22))

  const detalhe = 'a lista de movimentos do ERP veio vazia ou menor que a metade; nada foi apagado'
  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, detalhe)
  const movimentos = await banco.cliente.query('select origem_id from kaizen.estoque_movimento order by origem_id')
  assert.deepEqual(movimentos.rows, [{ origem_id: '1848' }])
  assert.deepEqual(enviadas, [
    `Kaizen: a leitura das 22h falhou — ${detalhe}. Os dados do Kaizen continuam os das 19h. Abra uma sessão com o Claude e cole esta mensagem.`,
  ])
})

test('total diferente do ERP vira aviso com os dois números e vai no resumo', async () => {
  await montarLoja()
  // O ERP responde a soma dos itens de 29/09 com 160: uma diferença que a carga não explica.
  const erpComOutraSoma: Erp = {
    async consultar(sql: string) {
      const dados = await falso.erp.consultar(sql)
      if (!sql.includes('movimentos:variacao')) return dados
      const totais = JSON.parse(dados) as Array<{ dia: string; medida: string; valor: string }>
      return JSON.stringify(totais.map((t) => (t.medida === 'itens:valor' ? { ...t, valor: '160.000000' } : t)))
    },
  }
  const saida = await rodar(horaEm('2026-09-29', 22), 'noite', erpComOutraSoma)

  const aviso = {
    tipo: 'total_diferente',
    chave: 'total:2026-09-29:itens:valor:160.000000:150.000000',
    texto: 'em 29/09, itens:valor: ERP 160.000000, Kaizen 150.000000',
  }
  assert.equal(saida.resultado, 'aviso')
  assert.deepEqual(saida.avisos, [aviso])
  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 29/09:\nTotais diferentes do ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${aviso.texto}`,
  ])
})

test('o resumo com aviso novo é enviado, e no dia seguinte o mesmo aviso vira uma linha só', async () => {
  await montarModeloSemTraducao()
  const primeira = await rodar(horaEm('2026-09-28', 22))
  assert.deepEqual(primeira.avisos, [AVISO_AM])

  await registrarDiaDeHoras('2026-09-29')
  const segunda = await rodar(horaEm('2026-09-29', 22))
  assert.deepEqual(segunda.avisos, [AVISO_AM])

  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 28/09:\nCódigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${AVISO_AM.texto}`,
    'Kaizen — resumo de 29/09:\nContinuam 1 avisos já informados.',
  ])
  const noites = (await execucoes()).filter((e) => e.tipo === 'noite')
  assert.deepEqual(noites.map((e) => [e.resumo_ok, e.resumo_chaves, e.telegram_ok]), [
    [true, ['codigo:tipo:AM'], true],
    [true, ['codigo:tipo:AM'], true],
  ])
})

test('a noite que falha depois de registrar a sua linha ainda manda o resumo', async () => {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, avisos)
     values ('hora', false, '2026-09-29 19:00:03-03', '2026-09-29 19:01:00-03', 'aviso', $1::jsonb)`,
    [JSON.stringify([AVISO_AM])],
  )
  const erpFora: Erp = {
    async consultar() {
      throw new ErroErp('rede', 'o ERP não respondeu: sem resposta em 90 s')
    },
  }
  const saida = await rodar(horaEm('2026-09-29', 22), 'noite', erpFora)

  assert.equal(saida.resultado, 'falha')
  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 29/09:\nCódigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${AVISO_AM.texto}`,
    'Kaizen: a leitura das 22h falhou — o ERP não respondeu. Os dados do Kaizen continuam os das 19h. Nada a fazer: ele tenta de novo em 30/09 às 8h.',
  ])
  const noite = (await execucoes())[1]
  assert.equal(noite.resultado, 'falha')
  assert.equal(noite.resumo_ok, true)
  assert.deepEqual(noite.resumo_chaves, ['codigo:tipo:AM'])
})

test('uma fatia que falha no ERP é falha com a faixa de oid na mensagem', async () => {
  await falso.inserir('documento', [
    { oid: 185, _iddocumento: 94, modelo: 'AC', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-27 14:20:00', idempresa: 1 },
    { oid: 5190, _iddocumento: 5099, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N', datahora: '2026-09-29 08:00:00', idempresa: 1 },
  ])
  const erpLento: Erp = {
    async consultar(sql: string) {
      if (sql.includes('d.oid between 5185 and 10184')) {
        throw new ErroErp('consulta', 'canceling statement due to statement timeout', 400)
      }
      return falso.erp.consultar(sql)
    },
  }
  const saida = await rodar(horaEm('2026-09-29', 22), 'noite', erpLento)

  assert.equal(saida.resultado, 'falha')
  assert.equal(saida.mensagem, 'a fatia de documentos de oid 5185 a 10184 falhou: canceling statement due to statement timeout')
  assert.equal((await banco.cliente.query('select count(*) as n from kaizen.documento')).rows[0].n, '0')
})

test('no estouro do prazo da noite, sai o resumo e depois a mensagem de falha', async () => {
  await banco.cliente.query(
    `insert into kaizen.execucao (tipo, manual, inicio, fim, resultado, avisos)
     values ('hora', false, '2026-09-29 19:00:03-03', '2026-09-29 19:01:00-03', 'aviso', $1::jsonb)`,
    [JSON.stringify([AVISO_AM])],
  )
  await banco.cliente.query(`insert into kaizen.execucao (tipo, manual) values ('noite', false)`)

  await registrarEstouro(
    { tipo: 'noite', manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => horaEm('2026-09-29', 22) },
  )

  assert.deepEqual(enviadas, [
    `Kaizen — resumo de 29/09:\nCódigos novos no ERP (1) — leve este resumo à próxima sessão com o Claude:\n- ${AVISO_AM.texto}`,
    'Kaizen: a leitura das 22h falhou — passou do prazo. Os dados do Kaizen continuam os das 19h. Abra uma sessão com o Claude e cole esta mensagem.',
  ])
  const noite = (await execucoes())[1]
  assert.equal(noite.resultado, 'falha')
  assert.equal(noite.mensagem, 'a leitura das 22h passou do prazo')
  assert.equal(noite.resumo_ok, true)
})
