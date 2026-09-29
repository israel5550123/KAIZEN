import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// O script roda no Git Bash (spec da Fase 4, decisão 5); no PowerShell deste PC, `bash` é o do WSL.
const BASH = 'C:\\Program Files\\Git\\bin\\bash.exe'
const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const VPS = '-o BatchMode=yes root@100.118.200.65'

function ler(caminho: string): string {
  return readFileSync(join(RAIZ, caminho), 'utf8')
}

// O ssh falso: anota cada chamada (os argumentos juntos, uma chamada por NUL) e responde o que a VPS responderia.
const SSH_FALSO = [
  '#!/bin/bash',
  'printf \'%s\\0\' "$*" >> "$(dirname "$0")/chamadas"',
  'case "$*" in',
  '  *"date +%H:%M"*) echo "$HORA_FALSA" ;;',
  '  *sha256sum*) echo "$SHA256_FALSO  -" ;;',
  '  *"rev-parse --short HEAD"*) echo "Already up to date."; echo abc1234 ;;',
  '  *"service inspect"*) echo "kaizen-tradutor:ecf9280 kaizen_env_v1" ;;',
  'esac',
  '',
].join('\n')

// O bash do Git põe /usr/bin, onde está o ssh de verdade, na frente do PATH que o Windows passa: o ssh falso
// entra no PATH dentro do próprio bash, e o script só roda se `ssh` for o falso (senão sai com 99 sem rodar nada).
const PREPARO = 'F="$(cygpath -u "$1")"; export PATH="$F:$PATH"; [ "$(type -P ssh)" = "$F/ssh" ] || exit 99; shift; exec bash publicacao/implantar.sh "$@"'

type Rodada = { codigo: number | null; saida: string; chamadas: string[] }

function rodarScript(argumentos: string[], opcoes: { hora?: string; sha256?: string } = {}): Rodada {
  const pasta = mkdtempSync(join(tmpdir(), 'kaizen-ssh-'))
  try {
    writeFileSync(join(pasta, 'ssh'), SSH_FALSO)
    const r = spawnSync(BASH, ['-c', PREPARO, '_', pasta, ...argumentos], {
      cwd: RAIZ,
      encoding: 'utf8',
      env: { ...process.env, HORA_FALSA: opcoes.hora ?? '14:30', SHA256_FALSO: opcoes.sha256 ?? '' },
    })
    const arquivo = join(pasta, 'chamadas')
    const chamadas = existsSync(arquivo) ? readFileSync(arquivo, 'utf8').split('\0').filter((c) => c !== '') : []
    return { codigo: r.status, saida: r.stdout + r.stderr, chamadas }
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}

// O sha256 que a VPS calcula é o do arquivo como o git guarda: com .gitattributes (publicacao/* eol=lf), sem CR.
function sha256DoStack(): string {
  return createHash('sha256').update(ler('publicacao/stack.yml').replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

test('implantar.sh: em LF, só os docker da stack kaizen e nenhuma palavra proibida', () => {
  const script = ler('publicacao/implantar.sh')
  assert.ok(!script.includes('\r'), 'o implantar.sh tem CR: o bash do Git não lê CRLF')
  // Cada "docker " do script começa um dos comandos permitidos (spec, seção 5).
  const permitidos = [
    'build -f publicacao/Dockerfile -t kaizen-tradutor:',
    'stack deploy -c publicacao/stack.yml --resolve-image never kaizen',
    'service inspect kaizen_tradutor ',
    'service ls --filter name=kaizen_',
    'service logs --timestamps --since ',
    'ps -q -f name=kaizen_tradutor',
    'exec -w /kaizen ',
  ]
  const usados = new Set<string>()
  for (const m of script.matchAll(/docker\s+/g)) {
    const resto = script.slice(m.index + m[0].length)
    const permitido = permitidos.find((p) => resto.startsWith(p))
    assert.ok(permitido, `docker fora da lista: docker ${resto.split('\n')[0]}`)
    usados.add(permitido)
  }
  assert.equal(usados.size, permitidos.length, 'todos os comandos da lista aparecem no script')
  // Nem em comentário. Letras em volta não contam: ".Secrets" (o nome do segredo em uso) e "--format" passam.
  const proibida = /(?<![a-z])(prumo|erp\.|psql|secret|volume|network|rm|rmi|prune|scale|update)(?![a-z])/i
  const achada = proibida.exec(script)
  assert.equal(achada, null, `palavra proibida no script: ${achada?.[0]}`)
})

test('implantar.sh: o sha256 escrito nele é o do publicacao/stack.yml do repositório', () => {
  const escrito = /^SHA256_STACK=([0-9a-f]{64})$/m.exec(ler('publicacao/implantar.sh'))
  assert.ok(escrito, 'o script tem a linha SHA256_STACK=<64 letras e números>')
  assert.equal(escrito[1], sha256DoStack())
})

test('implantar.sh: a janela vai de hh:10 a hh:50, inclusive, e nunca das 22h às 22h59', () => {
  const horarios = ['14 09', '14 10', '14 50', '14 51', '22 30', '23 15']
  const laco = `for hm in ${horarios.map((h) => `"${h}"`).join(' ')}; do if dentro_da_janela $hm; then echo "$hm dentro"; else echo "$hm fora"; fi; done`
  // Carregado com source: as funções ficam disponíveis e o principal do script não roda.
  const r = spawnSync(BASH, ['-c', `source publicacao/implantar.sh && ${laco}`], { cwd: RAIZ, encoding: 'utf8' })
  assert.equal(r.stderr, '')
  assert.deepEqual(r.stdout.trim().split('\n'), ['14 09 fora', '14 10 dentro', '14 50 dentro', '14 51 fora', '22 30 fora', '23 15 dentro'])
})

test('implantar.sh: argumento fora do formato sai com 2 sem chamar o ssh', () => {
  const casos = [
    ['rodar', 'indicadores', '2026-04-15;id'],
    ['rodar', 'bash'],
    ['rodar', 'link', 'x'],
    ['publicar', 'main;id'],
    ['publicar', '../x'],
    ['publicar', 'fase-4/../main'],
    ['log', '24;id'],
    ['log', 'abc'],
  ]
  for (const argumentos of casos) {
    const r = rodarScript(argumentos)
    assert.equal(r.codigo, 2, `${argumentos.join(' ')}: ${r.saida}`)
    assert.deepEqual(r.chamadas, [], argumentos.join(' '))
    assert.match(r.saida, /^uso: bash publicacao\/implantar\.sh /)
  }
})

test('implantar.sh: log e rodar mandam à VPS as linhas fixas', () => {
  const log = rodarScript(['log', '24'])
  assert.equal(log.codigo, 0, log.saida)
  // O log só lê: não confere a janela.
  assert.deepEqual(log.chamadas, [
    `${VPS} docker service ls --filter name=kaizen_ && docker service logs --timestamps --since 24h kaizen_tradutor`,
  ])

  const execucoes = rodarScript(['rodar', 'execucoes', '2026-09-28'])
  assert.equal(execucoes.codigo, 0, execucoes.saida)
  assert.deepEqual(execucoes.chamadas, [
    `${VPS} TZ=America/Fortaleza date +%H:%M`,
    `${VPS} C=$(docker ps -q -f name=kaizen_tradutor | head -n 1); [ -n "$C" ] || { echo "nenhum contêiner do kaizen_tradutor rodando"; exit 1; }; `
      + 'docker exec -w /kaizen "$C" node --env-file=/run/secrets/kaizen_env tradutor/principal.mts execucoes 2026-09-28',
  ])
})

test('implantar.sh: fora da janela, rodar para depois de ler a hora e diz quando pode rodar', () => {
  const r = rodarScript(['rodar', 'execucoes', '2026-09-28'], { hora: '14:05' })
  assert.equal(r.codigo, 1)
  assert.deepEqual(r.chamadas, [`${VPS} TZ=America/Fortaleza date +%H:%M`])
  assert.equal(r.saida, 'fora da janela (agora 14h05): rode entre 14h10 e 14h50\n')
})

test('implantar.sh: publicar para sem mudar nada quando o stack.yml do ramo não é o que o script conhece', () => {
  const r = rodarScript(['publicar', 'fase-4'], { sha256: '0'.repeat(64) })
  assert.equal(r.codigo, 1)
  assert.deepEqual(r.chamadas, [
    `${VPS} TZ=America/Fortaleza date +%H:%M`,
    `${VPS} cd /opt/kaizen && git fetch origin && git show origin/fase-4:publicacao/stack.yml | sha256sum`,
  ])
  assert.match(r.saida, /publicar: o publicacao\/stack\.yml de origin\/fase-4 não é o que este script conhece \(sha256 0{64}\); nada mudou na VPS/)
})

test('implantar.sh: publicar manda à VPS os passos da spec, na ordem, e diz o que ficou no ar', () => {
  const r = rodarScript(['publicar', 'fase-4'], { sha256: sha256DoStack() })
  assert.equal(r.codigo, 0, r.saida)
  const novo = '-f name=kaizen_tradutor -f ancestor=kaizen-tradutor:abc1234'
  assert.deepEqual(r.chamadas, [
    `${VPS} TZ=America/Fortaleza date +%H:%M`,
    `${VPS} cd /opt/kaizen && git fetch origin && git show origin/fase-4:publicacao/stack.yml | sha256sum`,
    `${VPS} cd /opt/kaizen && git checkout fase-4 && git merge --ff-only origin/fase-4 && git rev-parse --short HEAD`,
    `${VPS} docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}} {{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}'`,
    `${VPS} cd /opt/kaizen && docker build -f publicacao/Dockerfile -t kaizen-tradutor:abc1234 .`,
    `${VPS} cd /opt/kaizen && KAIZEN_SHA=abc1234 KAIZEN_SEGREDO=kaizen_env_v1 docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen`,
    `${VPS} for i in $(seq 24); do [ "$(docker service ls --filter name=kaizen_tradutor --format '{{.Replicas}}')" = 1/1 ] && [ -n "$(docker ps -q ${novo})" ] && exit 0; sleep 5; done; exit 1`,
    `${VPS} C=$(docker ps -q ${novo} | head -n 1); docker exec -w /kaizen "$C" node --env-file=/run/secrets/kaizen_env tradutor/principal.mts migrar`,
    `${VPS} docker service ls --filter name=kaizen_`,
  ])
  assert.match(r.saida, /publicar: kaizen-tradutor:abc1234 no ar \(antes: kaizen-tradutor:ecf9280\)\n/)
})
