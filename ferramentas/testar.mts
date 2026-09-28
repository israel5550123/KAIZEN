import { run } from 'node:test'
import { spec } from 'node:test/reporters'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { finished } from 'node:stream/promises'

// Roda todos os *.test.mts de tradutor/ e ferramentas/, um arquivo por vez, e confere quantos testes rodaram.
const raiz = fileURLToPath(new URL('../', import.meta.url))
const arquivos = ['tradutor', 'ferramentas'].flatMap((pasta) =>
  readdirSync(join(raiz, pasta))
    .filter((nome) => nome.endsWith('.test.mts'))
    .sort()
    .map((nome) => join(raiz, pasta, nome)),
)
const esperados = Number(readFileSync(join(raiz, 'testes-esperados.txt'), 'utf8').trim())

let rodados = 0
let falhas = 0
let pulados = 0
const fluxo = run({ files: arquivos, concurrency: false })
fluxo.on('test:pass', (dados) => {
  if (dados.details.type === 'suite') return
  // O teste desligado (skip) ou por fazer (todo) também chega como "passou": não rodou, e conta à parte.
  if (dados.skip !== undefined || dados.todo !== undefined) pulados += 1
  else rodados += 1
})
fluxo.on('test:fail', (dados) => {
  if (dados.details.type !== 'suite') {
    rodados += 1
    falhas += 1
  }
})
const relatorio = fluxo.compose(new spec())
relatorio.pipe(process.stdout, { end: false })
await finished(relatorio)

console.log(`rodou ${rodados} testes, esperados ${esperados}`)
if (falhas > 0) console.log(`${falhas} teste(s) falharam`)
if (pulados > 0) console.log(`${pulados} teste(s) pulados`)
if (!Number.isInteger(esperados)) console.log('testes-esperados.txt não tem um número')
process.exitCode = falhas === 0 && pulados === 0 && rodados === esperados ? 0 : 1
