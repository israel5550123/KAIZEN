import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { HORA_DA_NOITE, HORAS_DA_HORA } from './constantes.mts'

function ler(caminho: string): string {
  return readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')
}

const COMANDO = 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts'

test('crontab: duas linhas em LF, nos horários que o tradutor espera, sem MAILTO', () => {
  const crontab = ler('publicacao/crontab')
  assert.ok(!crontab.includes('\r'), 'o crontab tem CR: o crond do Alpine não lê CRLF')
  assert.ok(!/MAILTO/i.test(crontab), 'sem MAILTO: a saída vai para o log do serviço')
  // Os horários do crontab e os que o tradutor cobra como "faltou" (janela.mts) têm de ser os mesmos.
  const primeira = HORAS_DA_HORA[0]
  const ultima = HORAS_DA_HORA[HORAS_DA_HORA.length - 1]
  assert.deepEqual(HORAS_DA_HORA, Array.from({ length: ultima - primeira + 1 }, (_, i) => primeira + i))
  assert.equal(crontab, [
    `0 ${primeira}-${ultima} * * 1-6 ${COMANDO} hora`,
    `0 ${HORA_DA_NOITE} * * 1-6 ${COMANDO} noite`,
    '',
  ].join('\n'))
  assert.ok(existsSync(new URL('./principal.mts', import.meta.url)), 'o crontab chama tradutor/principal.mts')
})

test('Dockerfile: Node 24.18.0 alpine, fuso de Fortaleza, só dependências de produção e crond em primeiro plano', () => {
  const linhas = ler('publicacao/Dockerfile').split(/\r?\n/).filter((l) => l.trim() !== '' && !l.startsWith('#'))
  assert.deepEqual(linhas, [
    'FROM node:24.18.0-alpine',
    'RUN apk add --no-cache tzdata',
    'ENV TZ=America/Fortaleza',
    'WORKDIR /kaizen',
    'COPY package.json package-lock.json ./',
    'RUN npm ci --omit=dev',
    'COPY tradutor/ tradutor/',
    'COPY sql/ sql/',
    'COPY publicacao/crontab /etc/crontabs/root',
    'CMD ["crond", "-f", "-d", "8"]',
  ])
})

test('stack.yml: imagem pela tag do commit, segredo com nome fixo lido de variável, rede externa do Prumo e limite de log', () => {
  const stack = ler('publicacao/stack.yml')
  const trecho = (texto: string) => assert.ok(stack.includes(texto), `o stack.yml devia ter:\n${texto}`)
  trecho('    image: kaizen-tradutor:${KAIZEN_SHA:?defina KAIZEN_SHA}\n')
  trecho('    environment:\n      TZ: America/Fortaleza\n')
  trecho('    secrets:\n      - source: kaizen_env\n        target: kaizen_env\n')
  trecho('    networks:\n      - prumo_default\n')
  trecho('    logging:\n      driver: json-file\n      options:\n        max-size: "10m"\n        max-file: "3"\n')
  trecho('    deploy:\n      replicas: 1\n      restart_policy:\n')
  trecho('networks:\n  prumo_default:\n    external: true\n')
  trecho('secrets:\n  kaizen_env:\n    external: true\n    name: ${KAIZEN_SEGREDO:-kaizen_env_v1}\n')
  // A stack kaizen nunca declara o Postgres nem outro serviço da stack prumo.
  assert.deepEqual([...stack.matchAll(/^ {2}(\w+):$/gm)].map((m) => m[1]), ['tradutor', 'prumo_default', 'kaizen_env'])
})

test('roteiro do dono: os 15 passos na ordem, a publicação sempre com --resolve-image never e o Prumo nunca removido', () => {
  const roteiro = ler('publicacao/README.md')
  const passos = [...roteiro.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]))
  assert.deepEqual(passos, Array.from({ length: 15 }, (_, i) => i))
  const publicacoes = roteiro.split('\n').filter((l) => l.includes('docker stack deploy'))
  assert.ok(publicacoes.length >= 4, 'o roteiro publica no passo 6 e ao atualizar, voltar atrás e trocar o segredo')
  for (const linha of publicacoes) {
    assert.match(linha, /docker stack deploy -c publicacao\/stack\.yml --resolve-image never kaizen$/, linha)
  }
  assert.ok(!/^docker stack rm/m.test(roteiro), 'nenhum comando do roteiro remove uma stack')
  assert.ok(roteiro.includes('docker service scale prumo_sync=0'))
  assert.ok(roteiro.includes('psql -U prumo -d prumo -v ON_ERROR_STOP=1 -v senha="$SENHA" < sql/criar-usuario-e-esquema.sql'))
  assert.ok(roteiro.includes('docker secret create kaizen_env_v1 -'))
  assert.ok(roteiro.includes('tradutor/principal.mts teste-telegram'))
  assert.ok(roteiro.includes('tradutor/principal.mts hora --manual'))
  assert.ok(roteiro.includes('tradutor/principal.mts conferencia'))
})
