import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emTransacao, garantirLocal } from './banco.mts'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { colocarEntrada, gravarDocumentos } from './carga.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinkFalsa } from './link-falsa.mts'
import { ErroLink, principalLink, resumoLink, traduzirLink } from './link.mts'

let banco: BancoTeste
let falsa: LinkFalsa
before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
})
after(async () => {
  await falsa.fechar()
  await banco.fechar()
})

function lerSql(caminho: string): string {
  return readFileSync(new URL(`../sql/${caminho}`, import.meta.url), 'utf8')
}

// O erro é um ErroLink com exatamente esta mensagem.
function erroLink(mensagem: string) {
  return (erro: unknown) => {
    assert.ok(erro instanceof ErroLink)
    assert.equal(erro.message, mensagem)
    return true
  }
}

// Todas as tabelas do esquema kaizen, cada linha em JSON, em ordem. As colunas de `sem` saem de toda tabela menos do
// documento, que guarda o id e o visto_em de uma rodada para a outra.
async function foto(sem: string[]): Promise<Record<string, string[]>> {
  const tabelas = await banco.cliente.query<{ tabela: string }>(
    `select table_name as tabela from information_schema.tables
      where table_schema = 'kaizen' and table_type = 'BASE TABLE'
      order by table_name collate "C"`,
  )
  const resultado: Record<string, string[]> = {}
  for (const { tabela } of tabelas.rows) {
    const linhas = await banco.cliente.query<{ linha: string }>(
      `select (to_jsonb(x) - $1::text[])::text as linha from kaizen.${tabela} x order by 1`,
      [tabela === 'documento' ? [] : sem],
    )
    resultado[tabela] = linhas.rows.map((l) => l.linha)
  }
  return resultado
}

test('código da Link sem tradução para o comando com o campo e o código, e nada é gravado', async () => {
  // A foto inteira, com os id e o lido_em: uma rodada gravada mudaria ao menos isso (documentos novos, os filhos com
  // id novos, o cadastro só da Link com o lido_em da rodada).
  const antes = await foto([])
  // Como se a cópia trouxesse uma forma que ninguém traduziu: os 8 pagamentos em Pix dos casos ficam sem tradução.
  await banco.cliente.query(`delete from kaizen.traducao where fonte = 'link' and campo = 'forma' and codigo = 'Pix'`)
  try {
    await assert.rejects(traduzirLink(banco.cliente), erroLink('código da Link sem tradução: forma Pix (8)'))
  } finally {
    await banco.cliente.query(`insert into kaizen.traducao (fonte, campo, codigo, valor) values ('link', 'forma', 'Pix', 'pix')`)
  }
  assert.deepEqual(await foto([]), antes)
})

test('com os casos, a comparação por dia não acha diferença', async () => {
  await traduzirLink(banco.cliente)
  // A comparação do comando, rodada de novo sobre o que ficou gravado: nenhum dia com diferença.
  assert.deepEqual((await banco.cliente.query(lerSql('link/comparar.sql'))).rows, [])
  // E ela teve o que comparar: as 14 vendas válidas dos casos, em 10 dias, com os mesmos números dos dois lados.
  const esperado = [
    { dia: '2026-04-15', vendas: 2, vendido: '336.78', devolucao: '97.00' },
    { dia: '2026-04-24', vendas: 1, vendido: '60.00', devolucao: '0.00' },
    { dia: '2026-04-27', vendas: 1, vendido: '129.72', devolucao: '0.00' },
    { dia: '2026-04-28', vendas: 3, vendido: '794.20', devolucao: '742.90' },
    { dia: '2026-05-04', vendas: 1, vendido: '71.00', devolucao: '0.00' },
    { dia: '2026-05-21', vendas: 2, vendido: '56.80', devolucao: '67.77' },
    { dia: '2026-06-17', vendas: 1, vendido: '150.00', devolucao: '0.00' },
    { dia: '2026-07-03', vendas: 1, vendido: '100.00', devolucao: '0.00' },
    { dia: '2026-08-05', vendas: 1, vendido: '507.00', devolucao: '0.00' },
    { dia: '2026-09-17', vendas: 1, vendido: '230.00', devolucao: '0.00' },
  ]
  const kaizen = await banco.cliente.query(`
    select d.criado_em::date as dia, count(distinct d.id)::int as vendas,
           kaizen.meio_par(coalesce(sum(i.valor_liquido) filter (where i.sentido = 'S'), 0), 2) as vendido,
           coalesce(sum(kaizen.meio_par(i.valor_liquido, 2)) filter (where i.sentido = 'E'), 0.00) as devolucao
    from kaizen.documento_negocio d
    join kaizen.documento_item i on i.documento_id = d.id
    where d.fonte = 'link' and d.tipo = 'pedido' and d.situacao = 'emitido'
    group by 1 order by 1`)
  assert.deepEqual(kaizen.rows, esperado)
  const link = await banco.cliente.query(`
    select n.data::date as dia, count(*)::int as vendas,
           sum(n.valor_total_venda) as vendido, sum(n.valor_total_devolucao) as devolucao
    from erp.negociacao n
    join erp.caixa c on c.id_negociacao = n.id_negociacao
    where n.venda and not c.inativo
    group by 1 order by 1`)
  assert.deepEqual(link.rows, esperado)
})

test('valor_total_venda que não fecha com os itens para o comando com o dia e os dois números, e nada é gravado', async () => {
  // Com a história dos casos já gravada, a foto inteira, com os id e o lido_em.
  await traduzirLink(banco.cliente)
  const antes = await foto([])
  // A venda de junho 1992, a única de 17/06, tem itens que somam 150,00; a Link passa a dizer que ela vendeu 150,01.
  await falsa.executar('update erp.negociacao set valor_total_venda = 150.01 where id_negociacao = 1992')
  try {
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink(
        'a comparação com a Link deu diferença em 1 dia(s), Kaizen × Link: ' +
          '2026-06-17: vendas 1 × 1, vendido 150.00 × 150.01, devolução 0 × 0.00',
      ),
    )
  } finally {
    await falsa.executar('update erp.negociacao set valor_total_venda = 150.00 where id_negociacao = 1992')
  }
  assert.deepEqual(await foto([]), antes)

  // Uma cópia sem nenhuma negociação (restauração que deu errado) para o comando antes de abrir a transação: os 26
  // documentos já gravados ficam, em vez de saírem como documentos que não voltaram na leitura.
  assert.equal(antes.documento.length, 26)
  await falsa.executar('delete from erp.negociacao')
  try {
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink('a cópia da Link não tem nenhuma negociação: a restauração deu certo?'),
    )
    assert.deepEqual(await foto([]), antes)
  } finally {
    await falsa.inserir('negociacao', lerCasosLink().negociacao)
  }
})

test('todos os casos juntos: duas rodadas deixam o mesmo conteúdo em todas as tabelas', async () => {
  await traduzirLink(banco.cliente)
  // Sem o id e o parcela_id dos filhos (trocados por inteiro a cada rodada) e sem o lido_em do cadastro.
  const primeira = await foto(['id', 'parcela_id', 'lido_em'])
  const contagens = await traduzirLink(banco.cliente)
  const segunda = await foto(['id', 'parcela_id', 'lido_em'])
  assert.deepEqual(contagens, {
    documentos: '26', novos: '0', itens: '57', pagamentos: '22', conferencias: '12', parcelas: '8', baixas: '4',
  })
  assert.deepEqual(segunda, primeira)
  // Igual e cheio: os 26 documentos com os filhos, o cadastro com o que só existe na Link, a de_para com as
  // 23 decisões (a resposta do dono, migração 008, inclui o cliente 1) e as 4 falhas. E nenhuma linha em execucao: o
  // comando da Link não mexe no estado do ERP novo.
  assert.deepEqual(
    Object.fromEntries(
      ['documento', 'documento_item', 'documento_pagamento', 'conferencia_caixa', 'parcela', 'baixa', 'produto', 'pessoa', 'funcionario', 'de_para', 'execucao']
        .map((tabela) => [tabela, segunda[tabela].length]),
    ),
    {
      documento: 26, documento_item: 57, documento_pagamento: 22, conferencia_caixa: 12, parcela: 8, baixa: 4,
      produto: 42, pessoa: 36, funcionario: 10, de_para: 27, execucao: 0,
    },
  )
})

test('resumoLink lista os documentos por família, as ligações e as falhas dos casos', async () => {
  await traduzirLink(banco.cliente)
  assert.deepEqual(await resumoLink(banco.cliente), [
    { chave: 'documentos', valor: '26' },
    { chave: 'documentos:conta_pagar', valor: '2' },
    { chave: 'documentos:fechamento_caixa', valor: '3' },
    { chave: 'documentos:nota_entrada', valor: '2' },
    { chave: 'documentos:orcamento', valor: '1' },
    { chave: 'documentos:pedido', valor: '15' },
    { chave: 'documentos:sangria', valor: '2' },
    { chave: 'documentos:suprimento', valor: '1' },
    { chave: 'orcamentos', valor: '1' },
    { chave: 'vendas_canceladas', valor: '1' },
    { chave: 'vendas_validas', valor: '14' },
    { chave: 'vendas_validas_sem_cliente', valor: '1' },
    { chave: 'itens_de_nota', valor: '2' },
    { chave: 'itens_devolvidos', valor: '10' },
    { chave: 'itens_vendidos', valor: '45' },
    { chave: 'pagamentos', valor: '22' },
    { chave: 'pagamentos_batem', valor: '13 de 14 vendas válidas somam venda − devolução' },
    { chave: 'pagamentos_nao_batem', valor: 'negociação 100: pagamentos R$ 336,79, venda − devolução R$ 336,78' },
    { chave: 'conferencia_linhas', valor: '12' },
    { chave: 'fechamentos', valor: '3' },
    { chave: 'turnos_abertos', valor: '1' },
    { chave: 'baixas', valor: '4, R$ 6.887,76' },
    { chave: 'parcelas', valor: '8, R$ 10.531,64' },
    { chave: 'parcelas_pendentes', valor: '4, R$ 3.643,88' },
    { chave: 'razao_fora', valor: '(sem obs) (orientação false): 5, R$ 6.947,76' },
    { chave: 'razao_fora', valor: 'Venda - Caixa. Lançamento automático. (orientação false): 4, R$ 967,67' },
    { chave: 'razao_fora', valor: 'Venda - Caixa. Lançamento automático. (orientação true): 10, R$ 2.450,70' },
    { chave: 'ligacoes:cliente', valor: 'regra 10, decisão 1, falha 0' },
    { chave: 'ligacoes:fornecedor', valor: 'regra 3, decisão 0, falha 1' },
    { chave: 'ligacoes:produto', valor: 'regra 40, decisão 0, falha 2' },
    { chave: 'ligacoes:vendedor', valor: 'regra 3, decisão 0, falha 1' },
    { chave: 'vendas_com_falha:cliente', valor: '0 vendas válidas, R$ 0,00' },
    { chave: 'vendas_com_falha:vendedor', valor: '0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'funcionario 1 → link:1 (Sistema): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'pessoa 900001 → link:900001 (FORNECEDOR PADRÃO): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'produto 1993 → link:1993 (Acabamento P/espelho Cabeça Chata Branco Toro): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'falha', valor: 'produto 2396 → link:2396 (Batente Silicone 10mm Cartela C/ 50 Toro): 1 documentos, 0 vendas válidas, R$ 0,00' },
    { chave: 'dias_comparados', valor: '10' },
  ])
})

test('o comando imprime link ok e o resumo e sai com 0; sem KAIZEN_URL, sai com 1', async (t) => {
  // A história dos casos já está gravada: o comando roda de novo, sem documento novo.
  await traduzirLink(banco.cliente)
  const impressos: string[] = []
  t.mock.method(console, 'log', (...partes: unknown[]) => {
    impressos.push(partes.join(' '))
  })
  garantirLocal(banco.url)
  assert.equal(await principalLink({ KAIZEN_URL: banco.url }), 0)
  const resumo = (await resumoLink(banco.cliente)).map(({ chave, valor }) => `${chave}: ${valor}`)
  assert.equal(resumo.length, 38)
  assert.deepEqual(impressos, [
    'link ok: documentos=26, novos=0, itens=57, pagamentos=22, conferencias=12, parcelas=8, baixas=4',
    ...resumo,
  ])
  assert.equal(impressos[1], 'documentos: 26')
  assert.equal(impressos[38], 'dias_comparados: 10')

  impressos.length = 0
  assert.equal(await principalLink({}), 1)
  assert.deepEqual(impressos, ['link falhou: falta KAIZEN_URL'])

  // Com um código sem tradução, o comando imprime só a falha, sem link ok nem resumo, e sai com 1.
  impressos.length = 0
  await banco.cliente.query(`delete from kaizen.traducao where fonte = 'link' and campo = 'forma' and codigo = 'Pix'`)
  try {
    assert.equal(await principalLink({ KAIZEN_URL: banco.url }), 1)
    assert.deepEqual(impressos, ['link falhou: código da Link sem tradução: forma Pix (8)'])
  } finally {
    await banco.cliente.query(`insert into kaizen.traducao (fonte, campo, codigo, valor) values ('link', 'forma', 'Pix', 'pix')`)
  }
})

test('a mesma forma: a venda 1992 da Link e o pedido 87 do ERP novo dão fichas com as mesmas chaves e o mesmo vocabulário', async () => {
  await traduzirLink(banco.cliente)
  // O pedido 87 do ERP novo (tradutor/fixtures.mts), no formato que sql/erp/documentos.sql devolve, pelo caminho de
  // carga da Fase 2. O cliente 999007 e a vendedora 999005 estão no cadastro dos casos; o produto 2962 não está, e
  // entra só para este teste.
  const pedido87 = {
    oid: 186, codigo: 87, modelo: 'PA', status: 'E', movimento: 'S', financeiro: 'R',
    criado_em: '2026-09-29T11:00:00', fechado_em: '2026-09-29T11:02:00', pessoa: 999007,
    turno_caixa: 3, turno_usuario: 18153, turno_numero: 1,
    itens: [{ oid: 1874, produto: 2962, quantidade: '1.000000', valor_liquido: '120.00', vendedor: 999005 }],
    pagamentos: [{ oid: 3, forma: 1, valor: '50.00' }, { oid: 4, forma: 2, valor: '40.00' }, { oid: 5, forma: 3, valor: '30.00' }],
    parcelas: [], conferencia: [], conferencia_abaixo_corte: 0,
  }
  const cadastro = await banco.cliente.query(`
    select (select count(*)::int from kaizen.pessoa where fonte = 'meuerp' and codigo = '999007') as cliente,
           (select count(*)::int from kaizen.funcionario where fonte = 'meuerp' and codigo = '999005') as vendedora,
           (select count(*)::int from kaizen.produto where fonte = 'meuerp' and codigo = '2962') as produto`)
  assert.deepEqual(cadastro.rows, [{ cliente: 1, vendedora: 1, produto: 0 }])
  await banco.cliente.query(
    `insert into kaizen.produto (fonte, codigo, descricao, ativo) values ('meuerp', '2962', 'PRODUTO 2962', true)`,
  )
  try {
    const carga = await emTransacao(banco.cliente, async () => {
      await colocarEntrada(banco.cliente, 'documentos', [JSON.stringify([pedido87])])
      return gravarDocumentos(banco.cliente)
    })
    assert.deepEqual(carga, { lidos: 1, novos: 1 })

    const ficha = async (fonte: string, origemTabela: string, origemId: string) => {
      const documento = await banco.cliente.query<{ id: string }>(
        'select id from kaizen.documento where fonte = $1 and origem_tabela = $2 and origem_id = $3',
        [fonte, origemTabela, origemId],
      )
      const resultado = await banco.cliente.query(lerSql('kaizen/ficha-venda.sql'), [documento.rows[0].id])
      return resultado.rows[0].ficha as {
        documento: Record<string, string | null>
        itens: Array<Record<string, string | null>>
        pagamentos: Array<Record<string, string | null>>
      }
    }
    const link = await ficha('link', 'negociacao', '1992')
    const erpNovo = await ficha('meuerp', 'documento', '186')

    assert.deepEqual(link, {
      documento: {
        fonte: 'link', codigo: '2124', tipo: 'pedido', situacao: 'emitido', movimento: 'saida', financeiro: 'recebe',
        criado_em: '2026-06-17T13:58:20.706517', fechado_em: '2026-06-17T13:58:21.050114',
        pessoa: '303', pessoa_nome: 'CLIENTE 303',
      },
      itens: [
        {
          sentido: 'saida', produto: '1369', descricao: '', quantidade: '1', valor_liquido: '90.365760772',
          vendedor: '1', vendedor_nome: 'Caio Mendes Rocha',
        },
        {
          sentido: 'saida', produto: '1438', descricao: '', quantidade: '1', valor_liquido: '59.634246',
          vendedor: '1', vendedor_nome: 'Caio Mendes Rocha',
        },
      ],
      pagamentos: [{ forma: 'pix', valor: '150.00' }],
    })
    assert.deepEqual(erpNovo, {
      documento: {
        fonte: 'meuerp', codigo: '87', tipo: 'pedido', situacao: 'emitido', movimento: 'saida', financeiro: 'recebe',
        criado_em: '2026-09-29T11:00:00', fechado_em: '2026-09-29T11:02:00',
        pessoa: '999007', pessoa_nome: 'CONSUMIDOR FINAL',
      },
      itens: [
        {
          sentido: 'saida', produto: '2962', descricao: 'PRODUTO 2962', quantidade: '1.000000', valor_liquido: '120.00',
          vendedor: '999005', vendedor_nome: 'Debora Fonseca Lima',
        },
      ],
      pagamentos: [
        { forma: 'dinheiro', valor: '50.00' },
        { forma: 'pix', valor: '40.00' },
        { forma: 'credito', valor: '30.00' },
      ],
    })

    // As mesmas chaves: no documento, em cada item e em cada pagamento, nas duas fontes.
    const chaves = (objeto: object) => Object.keys(objeto).sort()
    assert.deepEqual(chaves(link), chaves(erpNovo))
    assert.deepEqual(chaves(link.documento), chaves(erpNovo.documento))
    for (const item of [...link.itens, ...erpNovo.itens]) assert.deepEqual(chaves(item), chaves(erpNovo.itens[0]))
    for (const pagamento of [...link.pagamentos, ...erpNovo.pagamentos]) {
      assert.deepEqual(chaves(pagamento), chaves(erpNovo.pagamentos[0]))
    }

    // O mesmo vocabulário: toda palavra das duas fichas é uma das que o ERP novo usa, na tradução da fonte meuerp.
    const vocabulario = await banco.cliente.query<{ campo: string; valores: string[] }>(
      `select campo, array_agg(distinct valor order by valor) as valores
       from kaizen.traducao where fonte = 'meuerp' group by campo`,
    )
    const doErpNovo = Object.fromEntries(vocabulario.rows.map((l) => [l.campo, l.valores]))
    for (const f of [link, erpNovo]) {
      for (const campo of ['tipo', 'situacao', 'movimento', 'financeiro'] as const) {
        assert.ok(doErpNovo[campo].includes(String(f.documento[campo])), `${f.documento.fonte} ${campo}`)
      }
      for (const item of f.itens) assert.ok(doErpNovo.sentido.includes(String(item.sentido)), `${f.documento.fonte} sentido`)
      for (const pagamento of f.pagamentos) assert.ok(doErpNovo.forma.includes(String(pagamento.forma)), `${f.documento.fonte} forma`)
    }
  } finally {
    await banco.cliente.query(`delete from kaizen.documento where fonte = 'meuerp' and origem_tabela = 'documento' and origem_id = '186'`)
    await banco.cliente.query(`delete from kaizen.produto where fonte = 'meuerp' and codigo = '2962'`)
  }
})
