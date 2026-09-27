// Só para testes: os casos reais do docs/FONTES.md (simulação de 25/09 e testes de 26/09), gravados no ERP falso
// como o ERP os grava, com oid acima do corte e sem nenhum dado de pessoa (nomes inventados).
// Cada caso usa oids e produtos só dele, para que todos caibam juntos no mesmo ERP (todosOsCasos).
import type { ErpFalso } from './erp-falso.mts'

// Turnos dos testes de 26/09: (caixa, usuário que abriu, número da abertura).
export const TURNO_IGOR_CAIXA1_ABERTURA2 = { idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 2 }
export const TURNO_IGOR_CAIXA1_ABERTURA3 = { idcaixaabertura: 1, idusuarioabertura: 18152, idabertura: 3 }
export const TURNO_DANIELE_CAIXA3_ABERTURA1 = { idcaixaabertura: 3, idusuarioabertura: 18153, idabertura: 1 }
export const TURNO_SUPORTE_CAIXA3_ABERTURA1 = { idcaixaabertura: 3, idusuarioabertura: 9149, idabertura: 1 }
const FORA_DO_CAIXA = { idcaixaabertura: 0, idusuarioabertura: 0, idabertura: 0 }

// Um documento com oid 400: representa os documentos dos dias seguintes. Com ele no Kaizen, a execução da hora
// só relê pela folga os oids acima de 200, e os casos (oids 185 a 199) só voltam pela janela, pela parcela em
// aberto ou pelo cancelamento.
export const OID_POSTERIOR = 400

const PRODUTOS = [60, 61, 62, 1362, 1368, 1370, 1372, 1391, 1436, 2138, 2962, 5278]

type Linha = Record<string, unknown>

function documento(oid: number, codigo: number, campos: Linha): Linha {
  return {
    oid, _iddocumento: codigo, idempresa: 1, modelo: 'PA', status: 'E', tipomovimento: 'S', tipomovimentofinanceiro: 'R',
    idpessoa: 999007, ...TURNO_IGOR_CAIXA1_ABERTURA3, ...campos,
  }
}

function item(oid: number, codigo: number, sequencia: number, produto: number, qtd: string | null, valor: string | null, vendedor: number): Linha {
  return { oid, _iddocumento: codigo, _idsequencia: sequencia, idmercadoriavariacao: produto, qtd, valtotalliquido: valor, idpessoafuncionario: vendedor }
}

function pagamento(oid: number, codigo: number, sequencia: number, forma: number, valor: string): Linha {
  return { oid, _iddocumento: codigo, _idsequencia: sequencia, idpagamento: forma, valor }
}

// Grava a linha do histórico e deixa a foto do produto com o saldo novo, como o ERP faz na mesma gravação.
async function movimento(falso: ErpFalso, oid: number, produto: number, codigo: number, datahora: string, antes: string, depois: string): Promise<void> {
  await falso.inserir('mercadoria_estoque_historico', [{
    oid, _iddocumento: codigo, _idlocalestoque: 1, idmercadoriavariacao: produto, datahora, qtdsaldoatual: antes, qtdnovosaldo: depois,
  }])
  await fotoDoEstoque(falso, produto, depois)
}

export async function fotoDoEstoque(falso: ErpFalso, produto: number, quantidade: string): Promise<void> {
  await falso.cliente.query('delete from mercadoria_estoque where _idmercadoriavariacao = $1', [produto])
  await falso.inserir('mercadoria_estoque', [{ oid: produto, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: produto, qtdsaldo: quantidade }])
}

export async function cadastrosDaLoja(falso: ErpFalso): Promise<void> {
  await falso.inserir('pessoa', [
    { _idpessoa: 999007, nome: 'CONSUMIDOR', sobrenome: 'FINAL', flaginativo: 'F' },
    { _idpessoa: 1, nome: 'VENDEDOR', sobrenome: 'UM', flaginativo: 'F' },
    { _idpessoa: 999005, nome: 'VENDEDORA', sobrenome: 'DOIS', flaginativo: 'F' },
    { _idpessoa: 1001, nome: 'FORNECEDOR', sobrenome: 'EXEMPLO', flaginativo: 'F' },
  ])
  await falso.inserir('pessoa_funcionario', [
    { _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' },
    { _idempresa: 1, _idpessoa: 999005, idusuario: 18153, tipo: 'V', flaginativo: 'F' },
  ])
  await falso.inserir('mercadoria_variacao', PRODUTOS.map((p) => ({ _idmercadoriavariacao: p, descricao: `PRODUTO ${p}` })))
  await falso.inserir('mercadoria_variacao_empresa', PRODUTOS.map((p) => ({ _idempresa: 1, _idmercadoriavariacao: p, flaginativo: 'F' })))
}

export async function documentoPosterior(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(OID_POSTERIOR, 300, {
    modelo: 'AX', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null,
    datahora: '2026-09-30 07:55:00', datahoramovimento: '2026-09-30 07:55:00',
  })])
}

// Pedido 116 (26/09): troco é uma linha negativa de dinheiro — R$ 50,00 e −R$ 5,00, para um item de R$ 45,00.
export async function pedidoComTroco(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(185, 116, { datahora: '2026-09-29 10:15:00', datahoramovimento: '2026-09-29 10:15:00' })])
  await falso.inserir('documento_mercadoria', [item(1873, 116, 1, 1436, '1.000000', '45.00', 1)])
  await falso.inserir('documento_pagamento', [pagamento(1, 116, 1, 1, '50.00'), pagamento(2, 116, 2, 1, '-5.00')])
  await movimento(falso, 1848, 1436, 116, '2026-09-29 10:15:00', '6.000000', '5.000000')
}

// Pedido 87 (26/09): dinheiro, Pix e crédito na mesma venda, vendedora 999005. O crédito virou conta a receber
// (parcela pendente) e o Pix deu baixa na hora; parcelas de venda não entram no Kaizen.
export async function pedidoTresFormas(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(186, 87, {
    ...TURNO_DANIELE_CAIXA3_ABERTURA1, datahora: '2026-09-29 11:00:00', datahoramovimento: '2026-09-29 11:02:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1874, 87, 1, 2962, '1.000000', '120.00', 999005)])
  await falso.inserir('documento_pagamento', [pagamento(3, 87, 1, 1, '50.00'), pagamento(4, 87, 2, 2, '40.00'), pagamento(5, 87, 3, 3, '30.00')])
  await falso.inserir('documento_parcela', [
    { oid: 1, _iddocumento: 87, _idsequencia: 3, _idparcela: 1, dtlancamento: '2026-09-29 11:02:00', dtvencimento: '2026-09-29 11:02:00', valparcela: '30.00', status: 'P', descricao: null },
    { oid: 2, _iddocumento: 87, _idsequencia: 2, _idparcela: 1, dtlancamento: '2026-09-29 11:02:00', dtvencimento: '2026-09-29 11:02:00', valparcela: '40.00', status: 'B', descricao: null },
  ])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 1, _iddocumento: 87, _idsequencia: 2, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-29 11:02:00', valpagamento: '40.00', idpagamento: 2, status: 'E' },
  ])
  await movimento(falso, 1849, 2962, 87, '2026-09-29 11:00:00', '2.000000', '1.000000')
}

// Troca TM 61 (25/09): o item volta ao estoque e o valor vira crédito do cliente, pago com a forma 5 e guardado
// como parcela a pagar pendente de R$ 77,00.
export async function trocaComCredito(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(187, 61, {
    modelo: 'TM', tipomovimento: 'E', tipomovimentofinanceiro: 'P', ...TURNO_IGOR_CAIXA1_ABERTURA2,
    datahora: '2026-09-28 15:30:00', datahoramovimento: '2026-09-28 15:30:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1875, 61, 1, 60, '1.000000', '77.00', 0)])
  await falso.inserir('documento_pagamento', [pagamento(6, 61, 1, 5, '77.00')])
  await falso.inserir('documento_parcela', [{
    oid: 3, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-28 15:30:00', dtvencimento: '2026-09-28 00:00:00',
    valparcela: '77.00', status: 'P', descricao: 'Troca de Mercadoria - Adiantamento',
  }])
  await movimento(falso, 1850, 60, 61, '2026-09-28 15:30:00', '3.000000', '4.000000')
}

// Pedido 117 (26/09): usa o crédito da troca 61 — paga R$ 77,00 com a forma 5, e a parcela da troca é baixada
// com a forma 5.
export async function usoDoCredito(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(601, 117, { datahora: '2026-10-01 10:00:00', datahoramovimento: '2026-10-01 10:00:00' })])
  await falso.inserir('documento_mercadoria', [item(1901, 117, 1, 60, '1.000000', '77.00', 1)])
  await falso.inserir('documento_pagamento', [pagamento(21, 117, 1, 5, '77.00')])
  await falso.cliente.query(`update documento_parcela set status = 'B' where oid = 3`)
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 21, _iddocumento: 61, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-10-01 10:00:00', valpagamento: '77.00', idpagamento: 5, status: 'E' },
  ])
  await movimento(falso, 1901, 60, 117, '2026-10-01 10:00:00', '4.000000', '3.000000')
}

// Devolução TM 63 (25/09): o item volta ao estoque e a parcela a pagar é baixada na hora, em dinheiro (R$ 18,00).
export async function devolucaoEmDinheiro(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(188, 63, {
    modelo: 'TM', tipomovimento: 'E', tipomovimentofinanceiro: 'P', ...TURNO_IGOR_CAIXA1_ABERTURA2,
    datahora: '2026-09-28 16:00:00', datahoramovimento: '2026-09-28 16:00:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1876, 63, 1, 1362, '1.000000', '18.00', 0)])
  await falso.inserir('documento_pagamento', [pagamento(7, 63, 1, 1, '18.00')])
  await falso.inserir('documento_parcela', [{
    oid: 4, _iddocumento: 63, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-28 16:00:00', dtvencimento: '2026-09-28 00:00:00',
    valparcela: '18.00', status: 'B', descricao: 'Troca de Mercadoria - Retirada',
  }])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 2, _iddocumento: 63, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-28 16:00:00', valpagamento: '18.00', idpagamento: 1, status: 'E' },
  ])
  await movimento(falso, 1851, 1362, 63, '2026-09-28 16:00:00', '0.000000', '1.000000')
}

// Orçamento 120, feito fora do caixa em 28/09 (como o 58 de 25/09): não mexe no estoque nem gera recebimento.
export async function orcamento(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(189, 120, {
    modelo: 'OC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', ...FORA_DO_CAIXA,
    datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:09:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1877, 120, 1, 1391, '1.000000', '144.00', 1)])
}

// O orçamento 120 vira pedido no próprio documento em 01/10: o mesmo oid passa de OC a PA e ganha
// datahoramovimento novo; o movimento de estoque leva a hora do orçamento, como o ERP grava.
export async function orcamentoConvertido(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(
    `update documento set modelo = 'PA', tipomovimento = 'S', tipomovimentofinanceiro = 'R', datahoramovimento = '2026-10-01 10:00:00' where oid = 189`,
  )
  await movimento(falso, 1902, 1391, 120, '2026-09-28 15:09:00', '177.000000', '176.000000')
}

// Pedido 110, pago no Pix em 29/09, pelo suporte no caixa 3.
export async function vendaParaCancelar(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(190, 110, {
    ...TURNO_SUPORTE_CAIXA3_ABERTURA1, datahora: '2026-09-29 10:00:00', datahoramovimento: '2026-09-29 10:05:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1878, 110, 1, 62, '1.000000', '30.00', 1)])
  await falso.inserir('documento_pagamento', [pagamento(8, 110, 1, 2, '30.00')])
  await movimento(falso, 1852, 62, 110, '2026-09-29 10:00:00', '5.000000', '4.000000')
}

// O pedido 110 é cancelado em 01/10: status C, uma linha no histórico de cancelamento, e o estorno do estoque
// com a hora do documento (29/09), e não a do cancelamento.
export async function cancelarVenda(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(`update documento set status = 'C' where oid = 190`)
  await falso.inserir('documento_cancelamento_historico', [{ oid: 1, _iddocumento: 110, datahora: '2026-10-01 09:00:00' }])
  await movimento(falso, 1903, 62, 110, '2026-09-29 10:00:00', '4.000000', '5.000000')
}

// Pedido 58 (25/09), feito fora do caixa e sem pagamento, gravado às 15h27.
export async function pedido58(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(191, 58, {
    ...FORA_DO_CAIXA, datahora: '2026-09-28 15:09:00', datahoramovimento: '2026-09-28 15:27:00',
  })])
  await falso.inserir('documento_mercadoria', [item(1879, 58, 1, 2138, '1.000000', '144.00', 1)])
  await movimento(falso, 1853, 2138, 58, '2026-09-28 15:09:00', '48.000000', '47.000000')
}

// Às 15h48 o pedido 58 é gravado de novo com os itens trocados: o item antigo some, entram dois novos
// (2138 por R$ 119,00 e 5278 por R$ 25,00); o 2138 tem estorno e nova saída, e o 5278 sai pela primeira vez.
export async function regravarPedido58(falso: ErpFalso): Promise<void> {
  await falso.cliente.query('delete from documento_mercadoria where oid = 1879')
  await falso.inserir('documento_mercadoria', [
    item(1904, 58, 1, 2138, '1.000000', '119.00', 1),
    item(1905, 58, 2, 5278, '1.000000', '25.00', 1),
  ])
  await falso.cliente.query(`update documento set datahoramovimento = '2026-09-28 15:48:00' where oid = 191`)
  await movimento(falso, 1904, 2138, 58, '2026-09-28 15:09:00', '47.000000', '48.000000')
  await movimento(falso, 1905, 2138, 58, '2026-09-28 15:09:00', '48.000000', '47.000000')
  await movimento(falso, 1906, 5278, 58, '2026-09-28 15:09:00', '0.000000', '-1.000000')
}

// Pedido 123 de 29/09, R$ 150,00 no débito, vendedor 1: o exemplo de documento apagado da spec.
export async function pedido123(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(192, 123, { datahora: '2026-09-29 16:20:00', datahoramovimento: '2026-09-29 16:20:00' })])
  await falso.inserir('documento_mercadoria', [
    item(1880, 123, 1, 1368, '1.000000', '100.00', 1),
    item(1881, 123, 2, 1370, '1.000000', '50.00', 1),
  ])
  await falso.inserir('documento_pagamento', [pagamento(9, 123, 1, 4, '150.00')])
  await movimento(falso, 1854, 1368, 123, '2026-09-29 16:20:00', '75.000000', '74.000000')
  await movimento(falso, 1855, 1370, 123, '2026-09-29 16:20:00', '130.000000', '129.000000')
}

// O suporte apaga o pedido 123 direto no banco: somem o documento, os itens e o pagamento; o histórico de
// estoque fica.
export async function apagarPedido123(falso: ErpFalso): Promise<void> {
  await falso.cliente.query('delete from documento where oid = 192')
  await falso.cliente.query('delete from documento_mercadoria where _iddocumento = 123')
  await falso.cliente.query('delete from documento_pagamento where _iddocumento = 123')
}

// Fechamento 114, às 8h37 de 29/09, da abertura 3 do Igor no caixa 1: a conferência às cegas, uma linha por forma.
export async function primeiroFechamento(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(193, 114, {
    modelo: 'FC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null,
    datahora: '2026-09-29 08:37:00', datahoramovimento: '2026-09-29 08:37:00',
  })])
  await falso.inserir('documento_conferencia_caixa', [
    { oid: 31, _iddocumento: 114, _idpagamento: 1, valdisponivel: '50.00', valconferido: '48.00' },
    { oid: 32, _iddocumento: 114, _idpagamento: 2, valdisponivel: '10.00', valconferido: '10.00' },
  ])
}

// Fechamento 118 (26/09): fecha de novo a mesma abertura 3 do Igor, já fechada às 8h37, somando as vendas
// 116 e 117. Na linha da troca, o crédito usado entra no calculado como +R$ 77,00.
export async function fechamentoRefeito(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(194, 118, {
    modelo: 'FC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null,
    datahora: '2026-09-29 18:00:00', datahoramovimento: '2026-09-29 18:00:00',
  })])
  await falso.inserir('documento_conferencia_caixa', [
    { oid: 33, _iddocumento: 118, _idpagamento: 1, valdisponivel: '45.00', valconferido: '45.00' },
    { oid: 34, _iddocumento: 118, _idpagamento: 2, valdisponivel: '0.00', valconferido: '0.00' },
    { oid: 35, _iddocumento: 118, _idpagamento: 3, valdisponivel: '0.00', valconferido: '0.00' },
    { oid: 36, _iddocumento: 118, _idpagamento: 4, valdisponivel: '0.00', valconferido: '0.00' },
    { oid: 37, _iddocumento: 118, _idpagamento: 5, valdisponivel: '77.00', valconferido: '0.00' },
  ])
}

// Sangria RS 97 (26/09): R$ 5,00 em dinheiro para comprar água sanitária, paga na hora.
export async function sangria(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(195, 97, {
    modelo: 'RS', tipomovimento: 'N', tipomovimentofinanceiro: 'P', idpessoa: null, idabertura: 1,
    datahora: '2026-09-29 13:00:00', datahoramovimento: '2026-09-29 13:00:00',
  })])
  await falso.inserir('documento_pagamento', [pagamento(10, 97, 1, 1, '5.00')])
  await falso.inserir('documento_parcela', [{
    oid: 5, _iddocumento: 97, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-09-29 13:00:00', dtvencimento: '2026-09-29 00:00:00',
    valparcela: '5.00', status: 'B', descricao: 'compra de agua sanitaria',
  }])
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 3, _iddocumento: 97, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-09-29 13:00:00', valpagamento: '5.00', idpagamento: 1, status: 'E' },
  ])
}

// Conta a pagar CP 2, reimportada com a data de abril (as reimportadas vão de 14/04 a 22/09), pendente.
export async function contaDeAbril(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [documento(196, 2, {
    modelo: 'CP', tipomovimento: 'N', tipomovimentofinanceiro: 'P', idpessoa: 1001, ...FORA_DO_CAIXA,
    datahora: '2026-04-14 00:00:00', datahoramovimento: null,
  })])
  await falso.inserir('documento_parcela', [{
    oid: 6, _iddocumento: 2, _idsequencia: 1, _idparcela: 1, dtlancamento: '2026-04-14 00:00:00', dtvencimento: '2026-09-30 00:00:00',
    valparcela: '1500.00', status: 'P', descricao: 'parcela 1 de 1',
  }])
}

// A conta 2 é paga no Pix em 01/10: a parcela fica baixada.
export async function pagarContaDeAbril(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(`update documento_parcela set status = 'B' where oid = 6`)
  await falso.inserir('documento_parcela_pagamento', [
    { oid: 22, _iddocumento: 2, _idsequencia: 1, _idparcela: 1, _idsequenciapagamento: 1, dtpagamento: '2026-10-01 09:30:00', valpagamento: '1500.00', idpagamento: 2, status: 'E' },
  ])
}

// A baixa da conta 2 é estornada: a baixa fica com status C, e a parcela volta a pendente.
export async function estornarBaixaDaConta(falso: ErpFalso): Promise<void> {
  await falso.cliente.query(`update documento_parcela_pagamento set status = 'C' where oid = 22`)
  await falso.cliente.query(`update documento_parcela set status = 'P' where oid = 6`)
}

// Ajuste de custo AC 94 (27/09, 14h20): o item vem sem quantidade e sem valor. Ajuste de estoque AS 138:
// entrada de 2 unidades, sem valor.
export async function ajustes(falso: ErpFalso): Promise<void> {
  await falso.inserir('documento', [
    documento(197, 94, {
      modelo: 'AC', tipomovimento: 'N', tipomovimentofinanceiro: 'N', idpessoa: null, ...FORA_DO_CAIXA,
      datahora: '2026-09-27 14:20:00', datahoramovimento: '2026-09-27 14:20:00',
    }),
    documento(198, 138, {
      modelo: 'AS', tipomovimento: 'E', tipomovimentofinanceiro: 'N', idpessoa: null, ...FORA_DO_CAIXA,
      datahora: '2026-09-29 08:00:00', datahoramovimento: '2026-09-29 08:00:00',
    }),
  ])
  await falso.inserir('documento_mercadoria', [
    item(1882, 94, 1, 61, null, null, 0),
    item(1883, 138, 1, 1372, '2.000000', null, 0),
  ])
  await movimento(falso, 1856, 1372, 138, '2026-09-29 08:00:00', '1.000000', '3.000000')
}

// Todos os casos, no estado em que foram lidos pela primeira vez, no mesmo ERP. Os cadastros da loja ficam de
// fora: o beforeEach do teste já os insere, e inserir de novo deixaria pessoa e produto em dobro no ERP falso.
export async function todosOsCasos(falso: ErpFalso): Promise<void> {
  await pedidoComTroco(falso)
  await pedidoTresFormas(falso)
  await trocaComCredito(falso)
  await devolucaoEmDinheiro(falso)
  await orcamento(falso)
  await vendaParaCancelar(falso)
  await pedido58(falso)
  await pedido123(falso)
  await primeiroFechamento(falso)
  await fechamentoRefeito(falso)
  await sangria(falso)
  await contaDeAbril(falso)
  await ajustes(falso)
  await documentoPosterior(falso)
}
