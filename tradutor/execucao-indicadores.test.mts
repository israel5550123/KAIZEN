import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen } from './apoio-teste.mts'
import type { BancoTeste } from './apoio-teste.mts'
import { conectar } from './banco.mts'
import { criarErpFalso } from './erp-falso.mts'
import type { ErpFalso } from './erp-falso.mts'
import { executar } from './execucao.mts'
import type { Saida } from './execucao.mts'
import { lerColunasEsperadas } from './sql-erp.mts'
import type { TipoExecucao } from './tipos.mts'

// O cálculo das respostas dentro da execução de hora em hora (spec da Fase 4, seção 9 e seção 12, "Rotina").
let banco: BancoTeste
let falso: ErpFalso
let enviadas: string[] = []

const TABELAS_DO_ERP = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]

before(async () => {
  banco = await criarBancoKaizen()
  falso = await criarErpFalso()
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
       kaizen.produto_fornecedor, kaizen.pessoa, kaizen.funcionario, kaizen.execucao, kaizen.resposta restart identity cascade`,
  )
})

// Telegram falso: guarda cada mensagem e diz que o Telegram aceitou.
async function enviar(texto: string): Promise<boolean> {
  enviadas.push(texto)
  return true
}

// Hora cheia de Fortaleza (UTC−3), em milissegundos: horaEm('2026-09-29', 14) é terça, 14h.
function horaEm(dia: string, hora: number): number {
  return Date.parse(`${dia}T00:00:00-03:00`) + hora * 3_600_000
}

async function maiorId(): Promise<number> {
  const r = await banco.cliente.query<{ id: string | null }>('select max(id) as id from kaizen.execucao')
  return Number(r.rows[0].id ?? 0)
}

// Roda uma execução com o relógio fingido e, depois, põe no registro a hora fingida (o Postgres grava a hora de verdade).
async function rodar(quando: number, tipo: TipoExecucao = 'hora'): Promise<Saida> {
  const antes = await maiorId()
  const saida = await executar(
    { tipo, manual: false },
    { erp: falso.erp, conectarKaizen: () => conectar(banco.url), enviar, agora: () => quando },
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

async function respostasPorDia(): Promise<Array<{ data: string; perguntas: string }>> {
  const r = await banco.cliente.query(
    `select data, string_agg(pergunta, ',' order by pergunta) as perguntas from kaizen.resposta group by data order by data`,
  )
  return r.rows
}

// A abertura do caixa às 8h02 de terça, 29/09: um documento, nenhuma venda.
async function montarAbertura(): Promise<void> {
  await falso.inserir('documento', [{
    oid: 185, _iddocumento: 120, modelo: 'AX', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-29 08:02:00', datahoramovimento: '2026-09-29 08:02:00', idempresa: 1, idpessoa: 999007,
    idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 1,
  }])
}

test('a hora das 14h com o cálculo falhando depois da carga: falha com o detalhe, uma mensagem com os dados das 13h; às 15h, a volta', async () => {
  await montarAbertura()
  const as13 = await rodar(horaEm('2026-09-29', 13))
  assert.equal(as13.resultado, 'ok')
  assert.equal(as13.contagens.respostas, 3)

  // Depois das 13h chega a sangria 121 no ERP; e o cálculo passa a falhar de verdade: a tabela das respostas some.
  await falso.inserir('documento', [{
    oid: 186, _iddocumento: 121, modelo: 'RS', status: 'E', tipomovimento: 'N', tipomovimentofinanceiro: 'N',
    datahora: '2026-09-29 13:40:00', datahoramovimento: '2026-09-29 13:40:00', idempresa: 1,
  }])
  await banco.cliente.query('alter table kaizen.resposta rename to resposta_escondida')
  let as14: Saida
  try {
    as14 = await rodar(horaEm('2026-09-29', 14))
  } finally {
    await banco.cliente.query('alter table kaizen.resposta_escondida rename to resposta')
  }

  const detalhe = 'relation "kaizen.resposta" does not exist'
  assert.equal(as14.resultado, 'falha')
  assert.equal(as14.mensagem, detalhe)
  // A leitura das 14h terminou: a sangria 121 está gravada.
  const docs = await banco.cliente.query('select codigo from kaizen.documento order by codigo')
  assert.deepEqual(docs.rows, [{ codigo: '120' }, { codigo: '121' }])
  // As respostas continuam as da leitura das 13h: a mensagem diz 13h, não 14h.
  assert.deepEqual(enviadas, [
    `Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — ${detalhe}. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.`,
  ])
  const linha = await banco.cliente.query(`select resultado, mensagem, telegram_ok from kaizen.execucao where id = 2`)
  assert.deepEqual(linha.rows, [{ resultado: 'falha', mensagem: detalhe, telegram_ok: true }])

  const as15 = await rodar(horaEm('2026-09-29', 15))
  assert.equal(as15.resultado, 'ok')
  assert.equal(as15.contagens.respostas, 3)
  assert.deepEqual(enviadas.slice(1), ['Kaizen: voltou a funcionar às 15h.'])
})

// Correção da revisão (item 1): a queda do banco durante o cálculo continua banco_fora, não vira indicadores.
// Sem seam no código de produção: um gatilho em kaizen.resposta levanta o erro real do Postgres para uma queda
// administrativa (57P01), que motivoDe já reconhece (tradutor/execucao.test.mts, "motivoDe classifica cada erro").
test('a hora das 14h com o cálculo derrubado por um 57P01 real do Postgres: o motivo é banco_fora, não indicadores', async () => {
  await montarAbertura()
  const as13 = await rodar(horaEm('2026-09-29', 13))
  assert.equal(as13.resultado, 'ok')

  await banco.cliente.query(`
    create function kaizen.teste_derrubar_57p01() returns trigger language plpgsql as $$
    begin
      raise exception 'terminating connection due to administrator command' using errcode = '57P01';
    end
    $$;
    create trigger teste_derrubar_57p01 before insert on kaizen.resposta
      for each row execute function kaizen.teste_derrubar_57p01();
  `)
  let as14: Saida
  try {
    as14 = await rodar(horaEm('2026-09-29', 14))
  } finally {
    await banco.cliente.query(`
      drop trigger teste_derrubar_57p01 on kaizen.resposta;
      drop function kaizen.teste_derrubar_57p01();
    `)
  }

  const detalhe = 'terminating connection due to administrator command'
  assert.equal(as14.resultado, 'falha')
  assert.equal(as14.mensagem, detalhe)
  // O texto é o de banco fora, não o de indicadores (que falaria em "cálculo dos indicadores falhou").
  assert.deepEqual(enviadas, ['Kaizen: a leitura das 14h falhou — o banco do Kaizen não respondeu.'])
  const linha = await banco.cliente.query(`select resultado, mensagem, telegram_ok from kaizen.execucao where id = 2`)
  assert.deepEqual(linha.rows, [{ resultado: 'falha', mensagem: detalhe, telegram_ok: true }])
})

test('a hora num dia sem venda até aquele momento termina ok e grava as três respostas de hoje, só de hoje', async () => {
  await montarAbertura()
  const saida = await rodar(horaEm('2026-09-29', 8))

  assert.equal(saida.resultado, 'ok')
  assert.deepEqual(saida.avisos, [])
  assert.equal(saida.contagens.respostas, 3)
  assert.deepEqual(await respostasPorDia(), [{ data: '2026-09-29', perguntas: 'compras,financeiro,vendas' }])
  const registro = await banco.cliente.query(`select resultado, contagens->'respostas' as respostas from kaizen.execucao`)
  assert.deepEqual(registro.rows, [{ resultado: 'ok', respostas: 3 }])
  assert.deepEqual(enviadas, [])
})

test('a noite calcula todos os dias da história: em 03/04/2026, as três respostas de 01/04, 02/04 e 03/04, 9 no total', async () => {
  const saida = await rodar(horaEm('2026-04-03', 22), 'noite')

  assert.equal(saida.resultado, 'ok')
  assert.equal(saida.contagens.respostas, 9)
  assert.deepEqual(await respostasPorDia(), [
    { data: '2026-04-01', perguntas: 'compras,financeiro,vendas' },
    { data: '2026-04-02', perguntas: 'compras,financeiro,vendas' },
    { data: '2026-04-03', perguntas: 'compras,financeiro,vendas' },
  ])
})
