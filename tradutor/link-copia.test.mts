import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { criarBancoKaizen, type BancoTeste } from './apoio-teste.mts'
import { carregarCasosLink, criarLinkFalsa, lerCasosLink, type LinkFalsa } from './link-falsa.mts'
import { ErroLink, traduzirLink } from './link.mts'

// Uma cópia restaurada pela metade: tabela vazia, ou venda que aponta para cliente que não está na cópia.
// O comando para antes de gravar; cada teste devolve a Link falsa como era.
let banco: BancoTeste
let falsa: LinkFalsa
before(async () => {
  banco = await criarBancoKaizen()
  falsa = await criarLinkFalsa(banco)
  await carregarCasosLink(falsa, banco.cliente)
  await traduzirLink(banco.cliente)
})
after(async () => {
  await falsa.fechar()
  await banco.fechar()
})

async function documentosDaLink(): Promise<number> {
  const r = await banco.cliente.query(`select count(*)::int as n from kaizen.documento where fonte = 'link'`)
  return r.rows[0].n
}

function erroLink(mensagem: string) {
  return (erro: unknown) => erro instanceof ErroLink && erro.message === mensagem
}

test('uma tabela vazia na cópia para o comando antes de gravar, com a tabela na mensagem', async () => {
  assert.equal(await documentosDaLink(), 26)
  try {
    await falsa.executar('delete from erp.caixa_parcela')
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink('a cópia da Link tem tabelas vazias (caixa_parcela): a restauração deu certo?'),
    )
    assert.equal(await documentosDaLink(), 26)
  } finally {
    await falsa.inserir('caixa_parcela', lerCasosLink().caixa_parcela)
  }
  await traduzirLink(banco.cliente)
})

test('uma venda que aponta para cliente que não está na cópia para o comando antes de gravar', async () => {
  const cliente899 = lerCasosLink().cliente.filter((c) => c.id_cliente === '899')
  assert.equal(cliente899.length, 1)
  try {
    await falsa.executar(`delete from erp.cliente where id_cliente = 899`)
    await assert.rejects(
      traduzirLink(banco.cliente),
      erroLink('a cópia da Link tem linhas que apontam para o que não está nela: negociacao.id_cliente sem cliente (1). A restauração deu certo?'),
    )
    assert.equal(await documentosDaLink(), 26)
  } finally {
    await falsa.inserir('cliente', cliente899)
  }
  await traduzirLink(banco.cliente)
})
