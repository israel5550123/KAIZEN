import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinkFalsa } from './link-falsa.mts'
import { traduzirLink } from './link.mts'

// Cada teste roda o comando de novo (ele é idempotente) e lê o que ficou no Kaizen. Os valores esperados são os que
// este mesmo SQL gravou, no protótipo, para estes casos reais da cópia antiga. As consultas olham só as negociações
// (origem_tabela 'negociacao'): as tarefas 5 e 6 acrescentam caixa, contas e notas ao mesmo comando e aos mesmos casos.

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

async function linhas(sql: string, parametros: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  return (await banco.cliente.query(sql, parametros)).rows
}

// Os itens de uma negociação no Kaizen: primeiro os devolvidos, depois os vendidos, cada um na ordem da Link.
async function itens(negociacao: string): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select i.origem_tabela, i.origem_id, i.sentido, i.produto, i.quantidade, i.valor_liquido, i.vendedor
       from kaizen.documento_item i
       join kaizen.documento k on k.id = i.documento_id
      where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = $1
      order by i.origem_tabela, i.origem_id::bigint`,
    [negociacao],
  )
}

// Os pagamentos das negociações, com a forma crua e a forma no vocabulário do ERP novo.
async function pagamentos(negociacoes: string[]): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select k.origem_id as negociacao, p.origem_tabela, p.origem_id, p.forma, t.valor as forma_traduzida, p.valor
       from kaizen.documento_pagamento p
       join kaizen.documento k on k.id = p.documento_id
       left join kaizen.traducao t on t.fonte = 'link' and t.campo = 'forma' and t.codigo = p.forma
      where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = any($1::text[])
      order by k.criado_em, p.origem_tabela, p.origem_id::bigint`,
    [negociacoes],
  )
}

// A soma dos pagamentos de cada negociação no Kaizen, ao lado de venda − devolução como a Link gravou.
async function somas(negociacoes: string[]): Promise<Array<Record<string, unknown>>> {
  return linhas(
    `select k.origem_id as negociacao, coalesce(sum(p.valor), 0) as pagamentos,
            n.valor_total_venda - n.valor_total_devolucao as venda_menos_devolucao
       from kaizen.documento k
       join erp.negociacao n on n.id_negociacao::text = k.origem_id
       left join kaizen.documento_pagamento p on p.documento_id = k.id
      where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = any($1::text[])
      group by k.origem_id, k.criado_em, n.valor_total_venda, n.valor_total_devolucao
      order by k.criado_em`,
    [negociacoes],
  )
}

// As falhas que as vendas dos casos produzem: o cliente 1, os produtos 1993 e 2396 e o vendedor Sistema (usuário 1).
const FALHAS_DAS_VENDAS = `
  select entidade, codigo_origem, codigo_kaizen
    from kaizen.de_para
   where fonte = 'link'
     and (entidade, codigo_origem) in (('pessoa', '1'), ('produto', '1993'), ('produto', '2396'), ('funcionario', '1'))
   order by entidade, codigo_origem`

test('a venda de junho 1992 vira pedido emitido, de saída, que recebe, com o cliente e o vendedor do ERP novo', async () => {
  // A primeira rodada deste banco: todo documento é novo.
  const contagens = await traduzirLink(banco.cliente)
  assert.equal(contagens.novos, contagens.documentos)
  // As 16 negociações dos casos (15 vendas e 1 orçamento), com 55 itens e 19 pagamentos.
  assert.deepEqual(await linhas(`
      select
        (select count(*)::int from kaizen.documento k
          where k.fonte = 'link' and k.origem_tabela = 'negociacao') as documentos,
        (select count(*)::int from kaizen.documento_item i join kaizen.documento k on k.id = i.documento_id
          where k.fonte = 'link' and k.origem_tabela = 'negociacao') as itens,
        (select count(*)::int from kaizen.documento_pagamento p join kaizen.documento k on k.id = p.documento_id
          where k.fonte = 'link' and k.origem_tabela = 'negociacao') as pagamentos`), [{ documentos: 16, itens: 55, pagamentos: 19 }])

  // O documento guarda o código cru da Link (modelo T/true, status false) e a visão traduz no vocabulário do ERP novo.
  // O cliente é o código do ERP novo, ligado pelo CPF: o 303, com o nome do cadastro do ERP novo.
  assert.deepEqual(await linhas(`
      select k.codigo, k.modelo, k.status, k.movimento, k.financeiro,
             n.tipo, n.situacao, n.movimento as movimento_traduzido, n.financeiro as financeiro_traduzido,
             k.criado_em, k.fechado_em, k.pessoa, p.nome as cliente, k.turno_caixa, k.turno_usuario, k.turno_numero
        from kaizen.documento k
        join kaizen.documento_negocio n on n.id = k.id
        left join kaizen.pessoa p on p.fonte = 'meuerp' and p.codigo = k.pessoa
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1992'`), [{
    codigo: '2124', modelo: 'T/true', status: 'false', movimento: null, financeiro: null,
    tipo: 'pedido', situacao: 'emitido', movimento_traduzido: 'saida', financeiro_traduzido: 'recebe',
    criado_em: '2026-06-17 13:58:20.706517', fechado_em: '2026-06-17 13:58:21.050114',
    pessoa: '303', cliente: 'CLIENTE 303', turno_caixa: null, turno_usuario: null, turno_numero: null,
  }])

  // O vendedor também é o código do ERP novo: o Caio da Link (usuário 6) é o funcionário 1 do ERP novo.
  assert.deepEqual(await linhas(`
      select distinct i.vendedor, f.nome as vendedor_nome
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        left join kaizen.funcionario f on f.fonte = 'meuerp' and f.codigo = i.vendedor
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1992'`), [
    { vendedor: '1', vendedor_nome: 'Caio Mendes Rocha' },
  ])
})

test('valor do item: meio-par no item e rateio do desconto da negociação sem arredondar (1992 soma 150,00)', async () => {
  await traduzirLink(banco.cliente)
  // 95,70 com 5% de desconto no item dá 90,915, que o meio-par leva a 90,92; o outro item é 60,00. O desconto de
  // 0,60959% da negociação entra depois, sem arredondar: 90,92 × 0,9939041 e 60,00 × 0,9939041.
  assert.deepEqual(await itens('1992'), [
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '5395', sentido: 'S', produto: '1369', quantidade: '1',
      valor_liquido: '90.365760772', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '5396', sentido: 'S', produto: '1438', quantidade: '1',
      valor_liquido: '59.634246', vendedor: '1',
    },
  ])
  // A soma fica sem arredondar; arredondada pelo meio-par, é o valor_total_venda que a Link gravou.
  assert.deepEqual(await linhas(`
      select sum(i.valor_liquido) as soma, kaizen.meio_par(sum(i.valor_liquido), 2) as vendido, n.valor_total_venda
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1992'
       group by n.valor_total_venda`), [{ soma: '150.000006772', vendido: '150.00', valor_total_venda: '150.00' }])
})

test('empate de meio centavo no item vai para o par (392, 3613 e 5061)', async () => {
  await traduzirLink(banco.cliente)
  // Antes do rateio da negociação, os três itens caem exatamente no meio centavo: 109,725 (392), 142,405 (3613) e
  // 206,625 (5061). O meio-par os leva a 109,72, 142,40 e 206,62. Depois vem o desconto da negociação, sem
  // arredondar: nenhum na 392; 4,77979% na 3613 (142,40 × 0,9522021); 2,79773% na 5061 (206,62 × 0,9720227).
  assert.deepEqual(await linhas(`
      select k.origem_id as negociacao, i.origem_id, i.valor_liquido
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
       where k.fonte = 'link' and i.origem_tabela = 'negociacao_item_vendido' and i.origem_id in ('986', '9947', '13997')
       order by k.criado_em`), [
    { negociacao: '392', origem_id: '986', valor_liquido: '109.72' },
    { negociacao: '3613', origem_id: '9947', valor_liquido: '135.59357904' },
    { negociacao: '5061', origem_id: '13997', valor_liquido: '200.839330274' },
  ])
  // Com o meio-par, o vendido de cada venda é o que a Link gravou. Com o arredondamento comum (109,73, 142,41 e
  // 206,63), daria 129,73, 507,01 e 230,01.
  assert.deepEqual(await linhas(`
      select k.origem_id as negociacao, kaizen.meio_par(sum(i.valor_liquido), 2) as vendido, n.valor_total_venda
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id in ('392', '3613', '5061') and i.sentido = 'S'
       group by k.origem_id, k.criado_em, n.valor_total_venda
       order by k.criado_em`), [
    { negociacao: '392', vendido: '129.72', valor_total_venda: '129.72' },
    { negociacao: '3613', vendido: '507.00', valor_total_venda: '507.00' },
    { negociacao: '5061', vendido: '230.00', valor_total_venda: '230.00' },
  ])
})

test('acréscimo da negociação entra no rateio (2492)', async () => {
  await traduzirLink(banco.cliente)
  // A 2492 tem 3,5197% de acréscimo na negociação: cada item é o meio-par dele × 1,035197, sem arredondar
  // (100 × 0,08 = 8,00 vira 8,281576; 10 × 2,70 = 27,00 vira 27,950319; e assim por diante).
  const item = (origem_id: string, produto: string, quantidade: string, valor_liquido: string) => ({
    origem_tabela: 'negociacao_item_vendido', origem_id, sentido: 'S', produto, quantidade, valor_liquido, vendedor: '999005',
  })
  assert.deepEqual(await itens('2492'), [
    item('6769', '2020', '100', '8.281576'),
    item('6770', '1718', '10', '27.950319'),
    item('6771', '1722', '6', '15.527955'),
    item('6772', '2711', '2', '15.1138762'),
    item('6773', '2443', '1', '20.70394'),
    item('6774', '2019', '1', '12.422364'),
  ])
  // 96,60 × 1,035197 = 100,0000302, que o meio-par leva aos 100,00 que a Link gravou.
  assert.deepEqual(await linhas(`
      select sum(i.valor_liquido) as soma, kaizen.meio_par(sum(i.valor_liquido), 2) as vendido, n.valor_total_venda
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '2492'
       group by n.valor_total_venda`), [{ soma: '100.0000302', vendido: '100.00', valor_total_venda: '100.00' }])
})

test('devolução 1095: itens de entrada sem arredondar, com o vendedor da troca', async () => {
  await traduzirLink(banco.cliente)
  // A 1095 é uma troca: voltam 26 e 14 unidades a 1,6941 e saem dois itens. O devolvido é qtd × preço líquido, sem
  // arredondar, e leva o vendedor da negociação da troca (o Caio, funcionário 1 do ERP novo).
  assert.deepEqual(await itens('1095'), [
    {
      origem_tabela: 'negociacao_item_devolvido', origem_id: '27', sentido: 'E', produto: '2701', quantidade: '26',
      valor_liquido: '44.0466', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_devolvido', origem_id: '28', sentido: 'E', produto: '2702', quantidade: '14',
      valor_liquido: '23.7174', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '2993', sentido: 'S', produto: '1718', quantidade: '14',
      valor_liquido: '37.8', vendedor: '1',
    },
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '2994', sentido: 'S', produto: '2020', quantidade: '90',
      valor_liquido: '9', vendedor: '1',
    },
  ])
  // Sem arredondar, a devolução é 67,764 (os relatórios da Link mostram 67,76). Arredondando linha a linha,
  // 44,05 + 23,72 = 67,77, o valor_total_devolucao que a Link gravou.
  assert.deepEqual(await linhas(`
      select sum(i.valor_liquido) as devolucao, sum(kaizen.meio_par(i.valor_liquido, 2)) as linha_a_linha, n.valor_total_devolucao
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
        join erp.negociacao n on n.id_negociacao::text = k.origem_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1095' and i.sentido = 'E'
       group by n.valor_total_devolucao`), [{ devolucao: '67.7640', linha_a_linha: '67.77', valor_total_devolucao: '67.77' }])
})

test('venda cancelada fica cancelado, e o orçamento fica emitido pelo modelo com itens de sentido N', async () => {
  await traduzirLink(banco.cliente)
  // A 8 foi cancelada no caixa (caixa.inativo verdadeiro). O orçamento 1771 não tem caixa, então não tem status: a
  // situação vem do modelo P/false, e ele não mexe no estoque nem no dinheiro. O cliente dele é o Consumidor Final,
  // ligado pela decisão da de_para (10000502 → 999007).
  assert.deepEqual(await linhas(`
      select k.origem_id, k.codigo, k.modelo, n.tipo, k.status, n.situacao, n.movimento, n.financeiro, k.fechado_em, k.pessoa
        from kaizen.documento k
        join kaizen.documento_negocio n on n.id = k.id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id in ('8', '1771')
       order by k.criado_em`), [
    {
      origem_id: '8', codigo: '2', modelo: 'A/true', tipo: 'pedido', status: 'true', situacao: 'cancelado',
      movimento: 'saida', financeiro: 'recebe', fechado_em: '2026-04-11 19:07:58.647319', pessoa: null,
    },
    {
      origem_id: '1771', codigo: '5', modelo: 'P/false', tipo: 'orcamento', status: null, situacao: 'emitido',
      movimento: 'nenhum', financeiro: 'nenhum', fechado_em: null, pessoa: '999007',
    },
  ])
  // 150 × 65,00 com 12% de desconto na negociação: 8.580,00, de sentido N.
  assert.deepEqual(await itens('1771'), [
    {
      origem_tabela: 'negociacao_item_vendido', origem_id: '4808', sentido: 'N', produto: '2805', quantidade: '150',
      valor_liquido: '8580', vendedor: '1',
    },
  ])
  // A cancelada guarda os 8 itens como a Link os gravou, de sentido S: quem conta a venda olha a situação.
  assert.deepEqual(await linhas(`
      select i.sentido, count(*)::int as itens
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '8'
       group by i.sentido`), [{ sentido: 'S', itens: 8 }])
})

test('Pix e débito na mesma venda (556), com a forma traduzida', async () => {
  await traduzirLink(banco.cliente)
  // No caixa_parcela, o cartão leva na forma crua o crédito (true) ou o débito (false): Cartao/false é débito.
  assert.deepEqual(await pagamentos(['556']), [
    { negociacao: '556', origem_tabela: 'caixa_parcela', origem_id: '542', forma: 'Cartao/false', forma_traduzida: 'debito', valor: '60.00' },
    { negociacao: '556', origem_tabela: 'caixa_parcela', origem_id: '543', forma: 'Pix', forma_traduzida: 'pix', valor: '11.00' },
  ])
  assert.deepEqual(await somas(['556']), [{ negociacao: '556', pagamentos: '71.00', venda_menos_devolucao: '71.00' }])
})

test('vale gerado e usado, dinheiro devolvido, bonificação e resto do vale: os pagamentos somam venda − devolução', async () => {
  await traduzirLink(banco.cliente)
  const pagamento = (negociacao: string, origem_tabela: string, origem_id: string, forma: string, forma_traduzida: string, valor: string) =>
    ({ negociacao, origem_tabela, origem_id, forma, forma_traduzida, valor })
  assert.deepEqual(await pagamentos(['108', '358', '427', '434', '435', '1095']), [
    // 108: só devolução, com R$ 97,00 devolvidos em dinheiro ao cliente; entra negativo, como o troco.
    pagamento('108', 'pc_lancamento_parcela', '278', '1.1.1.01', 'dinheiro', '-97.00'),
    // 358: paga com a bonificação, que aparece como fonte 2.1.2.03 do lançamento da venda.
    pagamento('358', 'pc_lancamento_fonte', '791', '2.1.2.03', 'troca', '60.00'),
    // 427: usa 51,45 de vale, e o resto, 0,15, volta como vale.
    pagamento('427', 'pc_lancamento_parcela', '966', '2.1.2.03', 'troca', '51.45'),
    pagamento('427', 'pc_lancamento_parcela', '967', '2.1.2.03', 'troca', '-0.15'),
    // 434: a devolução de 742,90 vira vale (negativo); 435: o vale é usado na compra seguinte (positivo).
    pagamento('434', 'pc_lancamento_parcela', '981', '2.1.2.03', 'troca', '-742.90'),
    pagamento('435', 'pc_lancamento_parcela', '984', '2.1.2.03', 'troca', '742.90'),
    // 1095: a troca devolve 67,77 e leva 46,80; a diferença, 20,97, vira vale.
    pagamento('1095', 'pc_lancamento_parcela', '2457', '2.1.2.03', 'troca', '-20.97'),
  ])
  assert.deepEqual(await somas(['108', '358', '427', '434', '435', '1095']), [
    { negociacao: '108', pagamentos: '-97.00', venda_menos_devolucao: '-97.00' },
    { negociacao: '358', pagamentos: '60.00', venda_menos_devolucao: '60.00' },
    { negociacao: '427', pagamentos: '51.30', venda_menos_devolucao: '51.30' },
    { negociacao: '434', pagamentos: '-742.90', venda_menos_devolucao: '-742.90' },
    { negociacao: '435', pagamentos: '742.90', venda_menos_devolucao: '742.90' },
    { negociacao: '1095', pagamentos: '-20.97', venda_menos_devolucao: '-20.97' },
  ])
  // Nas 14 vendas válidas dos casos, a soma bate em 13. A exceção é a 100: Pix 336,78 e dinheiro 0,01 para uma venda
  // de 336,78, porque a Link não grava o troco de R$ 0,01 em linha nenhuma.
  assert.deepEqual(await linhas(`
      with soma as (
        select k.origem_id, coalesce(sum(p.valor), 0) as pagamentos,
               n.valor_total_venda - n.valor_total_devolucao as venda_menos_devolucao
          from kaizen.documento k
          join erp.negociacao n on n.id_negociacao::text = k.origem_id
          join erp.caixa c on c.id_negociacao = n.id_negociacao
          left join kaizen.documento_pagamento p on p.documento_id = k.id
         where k.fonte = 'link' and k.origem_tabela = 'negociacao' and n.venda and not c.inativo
         group by k.origem_id, n.valor_total_venda, n.valor_total_devolucao
      )
      select count(*)::int as vendas_validas,
             count(*) filter (where pagamentos = venda_menos_devolucao)::int as batem,
             string_agg(origem_id || ': ' || pagamentos || ' para ' || venda_menos_devolucao, ', ')
               filter (where pagamentos <> venda_menos_devolucao) as nao_batem
        from soma`), [{ vendas_validas: 14, batem: 13, nao_batem: '100: 336.79 para 336.78' }])
})

test('a falha vira link:<código> no documento, no cadastro fonte link e na de_para', async () => {
  await traduzirLink(banco.cliente)
  // Nas vendas dos casos, falha o cliente de código 1 (o CNPJ dele não existe no ERP novo), na venda 1073...
  assert.deepEqual(await linhas(`
      select origem_id, pessoa from kaizen.documento
       where fonte = 'link' and origem_tabela = 'negociacao' and pessoa like 'link:%'`), [{ origem_id: '1073', pessoa: 'link:1' }])
  // ...e, só na venda cancelada 8, o vendedor Sistema (usuário 1 da Link, que não vira o funcionário 1 do ERP novo),
  // nos 8 itens, e os produtos 1993 e 2396, que o ERP novo não tem, em 3 deles.
  const item = (origem_id: string, produto: string) => ({ negociacao: '8', origem_id, produto, vendedor: 'link:1' })
  assert.deepEqual(await linhas(`
      select k.origem_id as negociacao, i.origem_id, i.produto, i.vendedor
        from kaizen.documento_item i
        join kaizen.documento k on k.id = i.documento_id
       where k.fonte = 'link' and k.origem_tabela = 'negociacao' and (i.produto like 'link:%' or i.vendedor like 'link:%')
       order by i.origem_id::bigint`), [
    item('9', 'link:1993'),
    item('10', 'link:1993'),
    item('11', '1994'),
    item('12', '1440'),
    item('13', '1440'),
    item('14', '1366'),
    item('15', '1442'),
    item('16', 'link:2396'),
  ])
  // O cadastro do Kaizen ganha, com fonte link, cada código que falhou, com os dados da Link.
  assert.deepEqual(await linhas(`
      select codigo, descricao, grupo, secao, subgrupo, marca, custo, ativo
        from kaizen.produto where fonte = 'link' and codigo in ('link:1993', 'link:2396') order by codigo`), [
    {
      codigo: 'link:1993', descricao: 'Acabamento P/espelho Cabeça Chata Branco Toro', grupo: 'Acessórios', secao: null,
      subgrupo: 'SUBGRUPO PADRÃO', marca: 'Toro', custo: '0.00', ativo: true,
    },
    {
      codigo: 'link:2396', descricao: 'Batente Silicone 10mm Cartela C/ 50 Toro', grupo: 'Acessórios', secao: null,
      subgrupo: 'SUBGRUPO PADRÃO', marca: 'Toro', custo: '7.90', ativo: true,
    },
  ])
  assert.deepEqual(await linhas(`
      select codigo, nome, cpf_cnpj, bairro, municipio, ibge, uf, ativo
        from kaizen.pessoa where fonte = 'link' and codigo = 'link:1'`), [{
    codigo: 'link:1', nome: 'CLIENTE 1', cpf_cnpj: '91156329194820', bairro: 'CAMBOA',
    municipio: 'Sao Jose de Ribamar', ibge: '2111201', uf: 'MA', ativo: true,
  }])
  assert.deepEqual(await linhas(`
      select codigo, nome, usuario, tipo, ativo from kaizen.funcionario where fonte = 'link' and codigo = 'link:1'`), [
    { codigo: 'link:1', nome: 'Sistema', usuario: null, tipo: null, ativo: true },
  ])
  // E a de_para registra cada falha, com o código da Link e o link:<código> que ele ganhou.
  assert.deepEqual(await linhas(FALHAS_DAS_VENDAS), [
    { entidade: 'funcionario', codigo_origem: '1', codigo_kaizen: 'link:1' },
    { entidade: 'pessoa', codigo_origem: '1', codigo_kaizen: 'link:1' },
    { entidade: 'produto', codigo_origem: '1993', codigo_kaizen: 'link:1993' },
    { entidade: 'produto', codigo_origem: '2396', codigo_kaizen: 'link:2396' },
  ])
})

test('uma decisão nova na de_para vale na rodada seguinte e tira a falha', async () => {
  await traduzirLink(banco.cliente)
  const pessoaDa1073 = `
    select k.pessoa, p.nome
      from kaizen.documento k
      left join kaizen.pessoa p on p.fonte = 'meuerp' and p.codigo = k.pessoa
     where k.fonte = 'link' and k.origem_tabela = 'negociacao' and k.origem_id = '1073'`
  assert.deepEqual(await linhas(pessoaDa1073), [{ pessoa: 'link:1', nome: null }])
  // Alguém decide que o cliente 1 da Link é o Consumidor Final (999007) do ERP novo. A falha já ocupa a mesma chave
  // na de_para, e a decisão toma o lugar dela. (Na vida real, a decisão entra por migração.)
  await banco.cliente.query(`
    insert into kaizen.de_para (entidade, fonte, codigo_origem, codigo_kaizen)
    values ('pessoa', 'link', '1', '999007')
    on conflict (entidade, fonte, codigo_origem) do update set codigo_kaizen = excluded.codigo_kaizen`)
  try {
    await traduzirLink(banco.cliente)
    assert.deepEqual(await linhas(pessoaDa1073), [{ pessoa: '999007', nome: 'CONSUMIDOR FINAL' }])
    // O cliente 1 fica só com a decisão; as outras falhas das vendas continuam.
    assert.deepEqual(await linhas(FALHAS_DAS_VENDAS), [
      { entidade: 'funcionario', codigo_origem: '1', codigo_kaizen: 'link:1' },
      { entidade: 'pessoa', codigo_origem: '1', codigo_kaizen: '999007' },
      { entidade: 'produto', codigo_origem: '1993', codigo_kaizen: 'link:1993' },
      { entidade: 'produto', codigo_origem: '2396', codigo_kaizen: 'link:2396' },
    ])
    // O cadastro link:1 continua lá: o cadastro só da Link nunca se apaga.
    assert.deepEqual(await linhas(`select codigo, nome from kaizen.pessoa where fonte = 'link' and codigo = 'link:1'`), [
      { codigo: 'link:1', nome: 'CLIENTE 1' },
    ])
  } finally {
    await banco.cliente.query(`delete from kaizen.de_para where entidade = 'pessoa' and fonte = 'link' and codigo_origem = '1'`)
    await traduzirLink(banco.cliente)
  }
})

test('rodar duas vezes deixa o mesmo conteúdo, com os mesmos id e visto_em, e o documento que sumiu da Link sai', async () => {
  // O conteúdo das tabelas que as vendas gravam, linha a linha, como texto. Ficam de fora o id dos filhos (eles são
  // trocados por inteiro a cada rodada) e o lido_em do cadastro; o filho leva a origem do documento no lugar do
  // documento_id. O id e o visto_em dos documentos são conferidos à parte.
  const foto = () => linhas(`
      with d as (select id, jsonb_build_object('documento', origem_tabela || '/' || origem_id) as origem from kaizen.documento)
      select tabela, linha from (
        select 'documento' as tabela, (to_jsonb(k) - 'id' - 'visto_em')::text as linha from kaizen.documento k
        union all
        select 'documento_item', ((to_jsonb(i) - 'id' - 'documento_id') || d.origem)::text
          from kaizen.documento_item i join d on d.id = i.documento_id
        union all
        select 'documento_pagamento', ((to_jsonb(p) - 'id' - 'documento_id') || d.origem)::text
          from kaizen.documento_pagamento p join d on d.id = p.documento_id
        union all
        select 'produto', (to_jsonb(x) - 'lido_em')::text from kaizen.produto x
        union all
        select 'pessoa', (to_jsonb(x) - 'lido_em')::text from kaizen.pessoa x
        union all
        select 'funcionario', (to_jsonb(x) - 'lido_em')::text from kaizen.funcionario x
        union all
        select 'de_para', to_jsonb(x)::text from kaizen.de_para x
      ) foto
      order by tabela collate "C", linha collate "C"`)
  const idsEVistos = () => linhas(`select origem_tabela, origem_id, id, visto_em from kaizen.documento where fonte = 'link' order by id`)

  const primeira = await traduzirLink(banco.cliente)
  const conteudo = await foto()
  const ids = await idsEVistos()
  const segunda = await traduzirLink(banco.cliente)
  assert.deepEqual(segunda, { ...primeira, novos: '0' })
  assert.deepEqual(await foto(), conteudo)
  assert.deepEqual(await idsEVistos(), ids)
  // A foto não está vazia: cada uma das 7 tabelas tem linhas.
  assert.deepEqual([...new Set(conteudo.map((l) => l.tabela))], [
    'de_para', 'documento', 'documento_item', 'documento_pagamento', 'funcionario', 'pessoa', 'produto',
  ])

  // A venda 100 some da Link: a negociação, os itens, o caixa e as parcelas do caixa.
  await falsa.executar('delete from erp.caixa_parcela where id_caixa = 97')
  await falsa.executar('delete from erp.caixa where id_negociacao = 100')
  await falsa.executar('delete from erp.negociacao_item_vendido where id_negociacao = 100')
  await falsa.executar('delete from erp.negociacao where id_negociacao = 100')
  try {
    await traduzirLink(banco.cliente)
    // O documento 100 sai do Kaizen, com os 3 itens e os 2 pagamentos; as outras 15 negociações ficam.
    assert.deepEqual(await linhas(`
        select
          (select count(*)::int from kaizen.documento
            where fonte = 'link' and origem_tabela = 'negociacao' and origem_id = '100') as documento_100,
          (select count(*)::int from kaizen.documento_item
            where origem_tabela = 'negociacao_item_vendido' and origem_id in ('205', '206', '207')) as itens_da_100,
          (select count(*)::int from kaizen.documento_pagamento
            where origem_tabela = 'caixa_parcela' and origem_id in ('90', '91')) as pagamentos_da_100,
          (select count(*)::int from kaizen.documento
            where fonte = 'link' and origem_tabela = 'negociacao') as negociacoes`), [
      { documento_100: 0, itens_da_100: 0, pagamentos_da_100: 0, negociacoes: 15 },
    ])
  } finally {
    // A venda 100 volta à Link falsa como veio dos casos, e o Kaizen a lê de novo.
    const casos = lerCasosLink()
    await falsa.inserir('negociacao', casos.negociacao.filter((l) => l.id_negociacao === '100'))
    await falsa.inserir('negociacao_item_vendido', casos.negociacao_item_vendido.filter((l) => l.id_negociacao === '100'))
    await falsa.inserir('caixa', casos.caixa.filter((l) => l.id_negociacao === '100'))
    await falsa.inserir('caixa_parcela', casos.caixa_parcela.filter((l) => l.id_caixa === '97'))
    await traduzirLink(banco.cliente)
  }
})
