#!/usr/bin/env bash
# A porta do agente para a VPS (spec da Fase 4, seção 5). Só a stack kaizen e o esquema kaizen: publica a versão
# de um ramo do GitHub, lê o log da stack e roda, no contêiner do Kaizen, uma lista fechada de comandos do Kaizen.
# Pelo Git Bash, a partir da raiz do repositório: bash publicacao/implantar.sh <subcomando> [argumentos]
# Todo argumento é conferido aqui, no PC, antes de qualquer ssh; fora do formato, sai com 2 sem falar com a VPS.

VPS=root@100.118.200.65
# sha256 de publicacao/stack.yml como o git o guarda: um stack.yml mudado não sobe sem passar pela revisão deste script.
SHA256_STACK=ca0e773943418c2994ad8fa38ba3bfa1d4e54542a8c6fc8f214c3f495a526966
NODE_KAIZEN='node --env-file=/run/secrets/kaizen_env'
USO='uso: bash publicacao/implantar.sh publicar [ramo] | log [horas] | rodar link | rodar noite | rodar indicadores AAAA-MM-DD... | rodar execucoes [AAAA-MM-DD] | rodar teste-telegram'

uso() {
  echo "$USO"
  exit 2
}

e_ramo() { [[ $1 =~ ^[a-z0-9][a-z0-9._/-]*$ && $1 != *..* ]]; }
e_horas() { [[ $1 =~ ^[0-9]{1,3}$ ]]; }
e_dia() { [[ $1 =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; }

# Um comando fixo por chamada.
vps() {
  ssh -o BatchMode=yes "$VPS" "$1"
}

# 0 dentro da janela, 1 fora: de hh:10 a hh:50, inclusive, e nunca das 22h às 22h59 (a leitura da noite).
dentro_da_janela() {
  local hora=$((10#$1)) minuto=$((10#$2))
  [ "$hora" -ne 22 ] && [ "$minuto" -ge 10 ] && [ "$minuto" -le 50 ]
}

# Pela hora da VPS em Fortaleza; fora da janela, para sem fazer nada e diz a partir de quando pode rodar.
conferir_janela() {
  local agora
  agora=$(vps 'TZ=America/Fortaleza date +%H:%M') || { echo 'a VPS não respondeu'; exit 1; }
  [[ $agora =~ ^([0-9]{2}):([0-9]{2})$ ]] || { echo "a VPS respondeu uma hora que não entendi: $agora"; exit 1; }
  local hora=$((10#${BASH_REMATCH[1]})) minuto=${BASH_REMATCH[2]}
  dentro_da_janela "$hora" "$minuto" && return 0
  local proxima=$hora
  [ "$((10#$minuto))" -gt 50 ] && proxima=$(( (hora + 1) % 24 ))
  [ "$proxima" -eq 22 ] && proxima=23
  echo "fora da janela (agora ${hora}h$minuto): rode entre ${proxima}h10 e ${proxima}h50"
  exit 1
}

parou() {
  echo "publicar: parou em $1"
  exit 1
}

publicar() {
  local ramo=$1 saida sha em_uso anterior segredo
  conferir_janela
  saida=$(vps "cd /opt/kaizen && git fetch origin && git show origin/$ramo:publicacao/stack.yml | sha256sum") || parou 'git fetch'
  if [ "${saida%% *}" != "$SHA256_STACK" ]; then
    echo "publicar: o publicacao/stack.yml de origin/$ramo não é o que este script conhece (sha256 ${saida%% *}); nada mudou na VPS"
    exit 1
  fi
  saida=$(vps "cd /opt/kaizen && git checkout $ramo && git merge --ff-only origin/$ramo && git rev-parse --short HEAD") \
    || parou "git checkout $ramo e git merge --ff-only origin/$ramo"
  echo "$saida"
  sha=${saida##*$'\n'}
  [[ $sha =~ ^[0-9a-f]{7,40}$ ]] || parou "o SHA do ramo ($sha)"
  em_uso=$(vps "docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}} {{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}'") \
    || parou 'a leitura da imagem e do segredo em uso'
  anterior=${em_uso%% *}
  segredo=${em_uso#* }
  [[ $anterior =~ ^kaizen-tradutor:[0-9a-f]{7,40}$ && $segredo =~ ^kaizen_env_v[0-9]+$ ]] \
    || parou "a leitura da imagem e do segredo em uso ($em_uso)"
  echo "publicar: em uso $anterior com o segredo $segredo; publicando kaizen-tradutor:$sha"
  vps "cd /opt/kaizen && docker build -f publicacao/Dockerfile -t kaizen-tradutor:$sha ." || parou 'a construção da imagem'
  vps "cd /opt/kaizen && KAIZEN_SHA=$sha KAIZEN_SEGREDO=$segredo docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen" \
    || parou 'o deploy da stack kaizen'
  echo "publicar: esperando o serviço em 1/1 com kaizen-tradutor:$sha (até 120 s)"
  # O contêiner novo é o da imagem nova: logo depois do deploy, o serviço ainda mostra 1/1 com o contêiner antigo.
  vps 'for i in $(seq 24); do [ "$(docker service ls --filter name=kaizen_tradutor --format '"'{{.Replicas}}'"')" = 1/1 ] && [ -n "$(docker ps -q -f name=kaizen_tradutor -f ancestor=kaizen-tradutor:'"$sha"')" ] && exit 0; sleep 5; done; exit 1' \
    || parou 'a espera do serviço em 1/1 com a imagem nova'
  vps 'C=$(docker ps -q -f name=kaizen_tradutor -f ancestor=kaizen-tradutor:'"$sha"' | head -n 1); docker exec -w /kaizen "$C" '"$NODE_KAIZEN"' tradutor/principal.mts migrar' \
    || parou 'as migrações (principal.mts migrar)'
  echo "publicar: kaizen-tradutor:$sha no ar (antes: $anterior)"
  vps 'docker service ls --filter name=kaizen_' || parou 'a leitura do estado do serviço'
}

ler_log() {
  vps "docker service ls --filter name=kaizen_ && docker service logs --timestamps --since ${1}h kaizen_tradutor"
}

# A lista fechada: cada comando vira uma linha fixa, rodada no contêiner do serviço kaizen_tradutor.
rodar() {
  local comando=${1-} linha dia
  shift
  case "$comando" in
    link) [ $# -eq 0 ] || uso; linha='tradutor/link.mts' ;;
    noite) [ $# -eq 0 ] || uso; linha='tradutor/principal.mts noite --manual' ;;
    indicadores)
      [ $# -ge 1 ] || uso
      for dia in "$@"; do e_dia "$dia" || uso; done
      linha="tradutor/principal.mts indicadores $*" ;;
    execucoes)
      [ $# -le 1 ] || uso
      [ $# -eq 0 ] || e_dia "$1" || uso
      linha="tradutor/principal.mts execucoes${1:+ $1}" ;;
    teste-telegram) [ $# -eq 0 ] || uso; linha='tradutor/principal.mts teste-telegram' ;;
    *) uso ;;
  esac
  conferir_janela
  vps 'C=$(docker ps -q -f name=kaizen_tradutor | head -n 1); [ -n "$C" ] || { echo "nenhum contêiner do kaizen_tradutor rodando"; exit 1; }; docker exec -w /kaizen "$C" '"$NODE_KAIZEN $linha"
}

principal() {
  local subcomando=${1-}
  [ $# -gt 0 ] && shift
  case "$subcomando" in
    publicar)
      [ $# -le 1 ] || uso
      e_ramo "${1-main}" || uso
      publicar "${1-main}" ;;
    log)
      [ $# -le 1 ] || uso
      e_horas "${1-24}" || uso
      ler_log "${1-24}" ;;
    rodar)
      [ $# -ge 1 ] || uso
      rodar "$@" ;;
    *) uso ;;
  esac
}

# Carregado com source (os testes), só define as funções.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  principal "$@"
fi
