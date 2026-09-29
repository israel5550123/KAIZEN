import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { criarErpFalso, type ErpFalso } from './erp-falso.mts'
import { inteiro, lerColunasEsperadas, modeloErp, montar } from './sql-erp.mts'

// Formatos que sql/erp/estoque.sql e sql/erp/cadastros.sql devolvem (contrato, seção 6).
type Movimento = { oid: number; produto: number; documento: number | null; momento: string; saldo_antes: string | null; saldo_depois: string | null }
type Estoque = { movimentos: Movimento[]; foto: Array<{ produto: number; quantidade: string | null }> }
type Produto = { codigo: number; descricao: string | null; grupo: string | null; secao: string | null; subgrupo: string | null; marca: string | null; custo: string | null; inativo: string | null }
type Pessoa = { codigo: number; nome: string | null; sobrenome: string | null; cpf_cnpj: string | null; bairro: string | null; municipio: string | null; ibge: number | null; uf: string | null; inativo: string | null }
type Funcionario = { codigo: number; nome: string | null; sobrenome: string | null; usuario: number | null; tipo: string | null; inativo: string | null }
type Cadastros = { produtos: Produto[]; pessoas: Pessoa[]; funcionarios: Funcionario[]; fornecedores: Array<{ produto: number; fornecedor: number }> }

const TABELAS = [...new Set(lerColunasEsperadas().map((c) => c.tabela))]
let falso: ErpFalso

before(async () => {
  falso = await criarErpFalso()
  // Sem estatísticas, o banco falso compila a consulta de cadastros com JIT (1,5 s por chamada).
  await falso.cliente.query('set jit = off')
})
after(async () => { await falso.fechar() })
beforeEach(async () => { await falso.cliente.query(`truncate ${TABELAS.join(', ')}`) })

async function lerEstoqueFalso(acimaDe: number): Promise<Estoque> {
  return JSON.parse(await falso.erp.consultar(montar(modeloErp('estoque'), { movimentos_acima_de: inteiro(acimaDe) }))) as Estoque
}

async function lerCadastrosFalso(): Promise<Cadastros> {
  return JSON.parse(await falso.erp.consultar(montar(modeloErp('cadastros'), {}))) as Cadastros
}

test('estoque: vêm os movimentos acima do valor dado, em ordem de oid e não de data, com os saldos em texto exato', async () => {
  await falso.inserir('mercadoria_estoque_historico', [
    { oid: 1849, _iddocumento: 58, _idlocalestoque: 1, idmercadoriavariacao: 2138, datahora: '2026-09-25 15:09:00', qtdsaldoatual: '0.100000', qtdnovosaldo: '-0.900000' },
    { oid: 1847, _iddocumento: 48, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-26 22:40:00', qtdsaldoatual: '0.000000', qtdnovosaldo: '3.000000' },
    { oid: 1848, _iddocumento: 116, _idlocalestoque: 1, idmercadoriavariacao: 60, datahora: '2026-09-28 10:15:00', qtdsaldoatual: '3.000000', qtdnovosaldo: '2.000000' },
    { oid: 1850, _iddocumento: 117, _idlocalestoque: 1, idmercadoriavariacao: 61, datahora: '2026-09-28 11:00:00.5', qtdsaldoatual: '12345678901234567.123456', qtdnovosaldo: null },
  ])
  assert.deepEqual((await lerEstoqueFalso(1847)).movimentos, [
    { oid: 1848, produto: 60, documento: 116, momento: '2026-09-28T10:15:00', saldo_antes: '3.000000', saldo_depois: '2.000000' },
    { oid: 1849, produto: 2138, documento: 58, momento: '2026-09-25T15:09:00', saldo_antes: '0.100000', saldo_depois: '-0.900000' },
    { oid: 1850, produto: 61, documento: 117, momento: '2026-09-28T11:00:00.5', saldo_antes: '12345678901234567.123456', saldo_depois: null },
  ])
  assert.deepEqual((await lerEstoqueFalso(1848)).movimentos.map((m) => m.oid), [1849, 1850])
})

test('estoque: a foto é só da empresa 1, local 1, ordenada por produto, com a quantidade em texto', async () => {
  await falso.inserir('mercadoria_estoque', [
    { oid: 3, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 1362, qtdsaldo: '1.000000' },
    { oid: 1, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 60, qtdsaldo: '-2.000000' },
    { oid: 2, _idempresa: 2, _idlocalestoque: 1, _idmercadoriavariacao: 61, qtdsaldo: '5.000000' },
    { oid: 4, _idempresa: 1, _idlocalestoque: 2, _idmercadoriavariacao: 62, qtdsaldo: '7.000000' },
    { oid: 5, _idempresa: 1, _idlocalestoque: 1, _idmercadoriavariacao: 5278, qtdsaldo: '0.123456789' },
  ])
  assert.deepEqual((await lerEstoqueFalso(1847)).foto, [
    { produto: 60, quantidade: '-2.000000' },
    { produto: 1362, quantidade: '1.000000' },
    { produto: 5278, quantidade: '0.123456789' },
  ])
})

test('estoque: sem movimentos e sem foto, as duas listas vêm vazias, e não null', async () => {
  assert.deepEqual(await lerEstoqueFalso(1847), { movimentos: [], foto: [] })
})

test('cadastros: o produto traz descrição, grupo, seção e subgrupo da mercadoria, a marca da variação e o custo em texto', async () => {
  await falso.inserir('mercadoria_grupo', [{ _idgrupo: 1, descricao: 'FERRAGENS' }, { _idgrupo: 2, descricao: 'ELETRICA' }])
  await falso.inserir('mercadoria_secao', [{ _idsecao: 3, descricao: 'FERRAMENTAS' }])
  await falso.inserir('mercadoria_subgrupo', [{ _idsubgrupo: 4, descricao: 'CHAVES' }])
  await falso.inserir('mercadoria_marca', [{ _idmarca: 5, descricao: 'MARCA A' }, { _idmarca: 6, descricao: 'MARCA B' }])
  await falso.inserir('mercadoria', [
    { _idmercadoria: 10, descricao: 'CHAVE PHILIPS 1/4', idgrupo: 1, idsecao: 3, idsubgrupo: 4 },
    { _idmercadoria: 11, descricao: 'CHAVE PHILIPS 3/8', idgrupo: 1, idsecao: 3, idsubgrupo: 4 },
  ])
  // No ERP, cada variação tem a sua mercadoria e a descrição da variação está vazia (medido em 28/09: 1.029 de 1.029).
  await falso.inserir('mercadoria_variacao', [
    { _idmercadoriavariacao: 2139, idmercadoria: 11, descricao: '', idmarca: 6 },
    { _idmercadoriavariacao: 2138, idmercadoria: 10, descricao: '', idmarca: 5 },
  ])
  await falso.inserir('mercadoria_custo', [
    { _idempresa: 1, _idmercadoriavariacao: 2138, valcusto: '12.345600' },
    { _idempresa: 2, _idmercadoriavariacao: 2138, valcusto: '99.000000' },
    { _idempresa: 1, _idmercadoriavariacao: 2139, valcusto: '0.000000' },
  ])
  await falso.inserir('mercadoria_variacao_empresa', [
    { _idempresa: 1, _idmercadoriavariacao: 2138, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 2139, flaginativo: 'T' },
    { _idempresa: 2, _idmercadoriavariacao: 2139, flaginativo: 'F' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 2138, descricao: 'CHAVE PHILIPS 1/4', grupo: 'FERRAGENS', secao: 'FERRAMENTAS', subgrupo: 'CHAVES', marca: 'MARCA A', custo: '12.345600', inativo: 'F' },
    { codigo: 2139, descricao: 'CHAVE PHILIPS 3/8', grupo: 'FERRAGENS', secao: 'FERRAMENTAS', subgrupo: 'CHAVES', marca: 'MARCA B', custo: '0.000000', inativo: 'T' },
  ])
})

test('cadastros: produto sem linha de custo vem com custo vazio, e não zero; o que não tem linha vem vazio', async () => {
  // Sem a linha da mercadoria 99, a descrição vem vazia: o texto da variação não é lido.
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, idmercadoria: 99, descricao: 'PARAFUSO', idmarca: null }])
  await falso.inserir('mercadoria_custo', [{ _idempresa: 2, _idmercadoriavariacao: 60, valcusto: '5.000000' }])
  await falso.inserir('mercadoria_variacao_empresa', [{ _idempresa: 2, _idmercadoriavariacao: 60, flaginativo: 'T' }])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 60, descricao: null, grupo: null, secao: null, subgrupo: null, marca: null, custo: null, inativo: null },
  ])
})

test('cadastros: a descrição do produto 60 é a da mercadoria 730, e não a da variação, vazia no ERP', async () => {
  // O produto 60 do ERP em 28/09: variação com descrição vazia, ligada à mercadoria 730.
  await falso.inserir('mercadoria', [{ _idmercadoria: 730, descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER' }])
  await falso.inserir('mercadoria_variacao', [{ _idmercadoriavariacao: 60, idmercadoria: 730, descricao: '' }])
  assert.deepEqual((await lerCadastrosFalso()).produtos, [
    { codigo: 60, descricao: 'BROCA CHATA P/ MADEIRA 1" X 6" WORKER', grupo: null, secao: null, subgrupo: null, marca: null, custo: null, inativo: null },
  ])
})

test('cadastros: vale o endereço principal e ativo de menor _idendereco; pessoa sem endereço vem com bairro vazio', async () => {
  await falso.inserir('municipio', [{ _idmunicipio: 2304400, nome: 'Fortaleza' }, { _idmunicipio: 2303709, nome: 'Caucaia' }])
  await falso.inserir('pessoa', [
    { _idpessoa: 999007, nome: 'CONSUMIDOR', sobrenome: 'FINAL', cnpjcpf: null, flaginativo: 'F' },
    { _idpessoa: 1001, nome: 'CLIENTE', sobrenome: 'UM', cnpjcpf: '00000000000', flaginativo: 'F' },
    { _idpessoa: 1002, nome: 'CLIENTE', sobrenome: null, cnpjcpf: '00000000000000', flaginativo: 'T' },
  ])
  await falso.inserir('pessoa_endereco', [
    { _idpessoa: 1001, _idendereco: 3, bairro: 'CENTRO', idibgemunicipio: 2304400, uf: 'CE', flagprincipal: 'T', flaginativo: 'F' },
    { _idpessoa: 1001, _idendereco: 2, bairro: 'ALDEOTA', idibgemunicipio: 2304400, uf: 'CE', flagprincipal: 'T', flaginativo: 'F' },
    { _idpessoa: 1001, _idendereco: 1, bairro: 'ANTIGO', idibgemunicipio: 2303709, uf: 'CE', flagprincipal: 'T', flaginativo: 'T' },
    { _idpessoa: 1002, _idendereco: 1, bairro: 'JUREMA', idibgemunicipio: 2303709, uf: 'CE', flagprincipal: 'F', flaginativo: 'F' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).pessoas, [
    { codigo: 1001, nome: 'CLIENTE', sobrenome: 'UM', cpf_cnpj: '00000000000', bairro: 'ALDEOTA', municipio: 'Fortaleza', ibge: 2304400, uf: 'CE', inativo: 'F' },
    { codigo: 1002, nome: 'CLIENTE', sobrenome: null, cpf_cnpj: '00000000000000', bairro: null, municipio: null, ibge: null, uf: null, inativo: 'T' },
    { codigo: 999007, nome: 'CONSUMIDOR', sobrenome: 'FINAL', cpf_cnpj: null, bairro: null, municipio: null, ibge: null, uf: null, inativo: 'F' },
  ])
})

test('cadastros: funcionários só da empresa 1, com nome e sobrenome da pessoa', async () => {
  await falso.inserir('pessoa', [
    { _idpessoa: 1, nome: 'VENDEDOR', sobrenome: 'UM', flaginativo: 'F' },
    { _idpessoa: 999005, nome: 'VENDEDORA', sobrenome: 'DOIS', flaginativo: 'F' },
  ])
  await falso.inserir('pessoa_funcionario', [
    { _idempresa: 1, _idpessoa: 999005, idusuario: 18153, tipo: 'V', flaginativo: 'F' },
    { _idempresa: 1, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'F' },
    { _idempresa: 2, _idpessoa: 1, idusuario: 18152, tipo: 'V', flaginativo: 'T' },
    { _idempresa: 1, _idpessoa: 7, idusuario: null, tipo: 'O', flaginativo: 'T' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).funcionarios, [
    { codigo: 1, nome: 'VENDEDOR', sobrenome: 'UM', usuario: 18152, tipo: 'V', inativo: 'F' },
    { codigo: 7, nome: null, sobrenome: null, usuario: null, tipo: 'O', inativo: 'T' },
    { codigo: 999005, nome: 'VENDEDORA', sobrenome: 'DOIS', usuario: 18153, tipo: 'V', inativo: 'F' },
  ])
})

test('cadastros: fornecedores só com flaginativo F, da empresa 1, ordenados por produto e fornecedor', async () => {
  await falso.inserir('mercadoria_variacao_pessoa', [
    { _idempresa: 1, _idmercadoriavariacao: 2138, _idpessoa: 900010, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 60, _idpessoa: 900020, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 60, _idpessoa: 900010, flaginativo: 'F' },
    { _idempresa: 1, _idmercadoriavariacao: 61, _idpessoa: 900010, flaginativo: 'T' },
    { _idempresa: 2, _idmercadoriavariacao: 62, _idpessoa: 900010, flaginativo: 'F' },
  ])
  assert.deepEqual((await lerCadastrosFalso()).fornecedores, [
    { produto: 60, fornecedor: 900010 },
    { produto: 60, fornecedor: 900020 },
    { produto: 2138, fornecedor: 900010 },
  ])
})

test('cadastros: com tudo vazio, as quatro listas vêm vazias, e não null', async () => {
  assert.deepEqual(await lerCadastrosFalso(), { produtos: [], pessoas: [], funcionarios: [], fornecedores: [] })
})
