# Roteiro do dono: o Kaizen na VPS

Este roteiro é para o dono, na VPS, como `root`. Quem implementa o Kaizen não tem acesso à VPS: ele acompanha pela sessão com o Claude, lendo o que o dono colar.

**Regras de todos os passos:**

- Rode entre **hh:10 e hh:50** (por exemplo, 14h10 a 14h50). O tradutor lê o ERP na hora cheia, das 8h às 19h, e às 22h, de segunda a sábado. Não atualize nem troque nada entre 22h e 22h50: a leitura da noite pode levar até 30 minutos.
- Rode um comando por vez e compare a saída com a "saída esperada". Se sair diferente, pare e cole a saída na sessão com o Claude.
- **Nunca** rode `docker stack rm prumo`. A stack `prumo` carrega o banco do Kaizen. Para parar o Prumo, só o passo 1 (`prumo_sync=0`). Se a stack `prumo` for reimplantada algum dia, é sempre com `PRUMO_SYNC_REPLICAS=0`.
- Nenhuma senha ou token vai para arquivo nem para o repositório. Onde o roteiro pede um token, ele é digitado (ou colado) sem aparecer na tela e sem ficar no histórico.

Primeira implantação: passos 0 a 8, nessa ordem. Depois: o 9 para atualizar, o 10 para voltar atrás, o 11 para trocar o segredo, o 12 para ver o log, o 13 para a conferência do dono e o 14 quando o Claude pedir uma consulta ao banco.

## 0. Anotar o espaço em disco

```bash
df -h
```

Saída esperada: uma tabela com os discos. Anote a linha que termina em `/` (tamanho, usado, livre). É a referência para saber, depois, quanto o Kaizen ocupa.

## 1. Parar o sync do Prumo e guardar a cópia da Link fora da VPS

Parar o sync (ele recria o esquema `erp` a cada hora; parado, a cópia final da Link fica como está):

```bash
docker service scale prumo_sync=0
docker service ls
```

Saída esperada: na linha `prumo_sync`, a coluna de réplicas mostra `0/0`.

Tirar a cópia do esquema `erp` (a história da Link, de abril a 25/09) e conferir que as 26 tabelas estão nela:

```bash
PG=$(docker ps -q -f name=prumo_postgres)
docker exec $PG pg_dump -U prumo -d prumo -Fc -n erp > /root/erp-link.dump
ls -lh /root/erp-link.dump
docker exec -i $PG pg_restore --list < /root/erp-link.dump | grep -c 'TABLE DATA erp '
```

Saída esperada: o arquivo com alguns megabytes, e o último comando imprime `26`.

Copiar o arquivo para o PC. Este comando roda **no PC**, no PowerShell (troque `<endereço da VPS>` pelo endereço que você usa no `ssh`):

```powershell
scp root@<endereço da VPS>:/root/erp-link.dump "$HOME\Documents\erp-link.dump"
Get-Item "$HOME\Documents\erp-link.dump" | Select-Object Length
```

Saída esperada: o tamanho em bytes igual ao que o `ls -l /root/erp-link.dump` mostra na VPS. Esse arquivo é a única reserva da história da Link: guarde-o também fora do PC.

## 2. Criar a chave de implantação no GitHub

Uma chave nova, só de leitura, só para o repositório do Kaizen (a do Prumo vale para outro repositório):

```bash
ssh-keygen -t ed25519 -f /root/.ssh/kaizen_deploy -N "" -C "vps-kaizen"
cat /root/.ssh/kaizen_deploy.pub
```

Saída esperada: uma linha que começa com `ssh-ed25519` e termina com `vps-kaizen`.

No GitHub, no repositório `israel5550123/KAIZEN`: **Settings → Deploy keys → Add deploy key**. Título: `VPS`. Cole a linha inteira. **Não** marque "Allow write access". Clique em "Add key".

Dizer ao `ssh` que esse endereço usa essa chave:

```bash
cat >> /root/.ssh/config <<'FIM'

Host kaizen-github
  HostName github.com
  User git
  IdentityFile /root/.ssh/kaizen_deploy
  IdentitiesOnly yes
FIM
chmod 600 /root/.ssh/config
ssh -T kaizen-github
```

Saída esperada: se perguntar `Are you sure you want to continue connecting`, digite `yes`. No fim: `Hi israel5550123/KAIZEN! You've successfully authenticated, but GitHub does not provide shell access.`

## 3. Baixar o código

```bash
git clone kaizen-github:israel5550123/KAIZEN.git /opt/kaizen
cd /opt/kaizen
git log --oneline -1
```

Saída esperada: o último commit, o mesmo que o Claude mostrou na sessão.

## 4. Criar o usuário e o esquema do Kaizen no banco

Uma senha nova, só para o usuário `kaizen` do banco. O `tr` tira os caracteres `/`, `+` e `=`, que quebrariam o endereço do banco:

```bash
SENHA=$(openssl rand -base64 24 | tr -d '/+=')
echo "$SENHA"
```

Guarde a senha no Gerenciador de Senhas, com o nome "Kaizen — banco, usuário kaizen". Não feche este terminal até o passo 5: a variável `SENHA` é usada lá.

```bash
cd /opt/kaizen
PG=$(docker ps -q -f name=prumo_postgres)
docker exec -i $PG psql -U prumo -d prumo -v ON_ERROR_STOP=1 -v senha="$SENHA" < sql/criar-usuario-e-esquema.sql
docker exec $PG psql -U prumo -d prumo -At -c "select rolname, rolsuper from pg_roles where rolname = 'kaizen'"
```

Saída esperada: `CREATE ROLE`, `ALTER ROLE`, `CREATE SCHEMA` e, no último comando, `kaizen|f` (o usuário existe e não é superusuário).

## 5. Criar o segredo com os quatro valores

Tenha à mão: o token do ERP (o mesmo da linha `MEUERP_TOKEN` do arquivo `.env` do PC) e o token do robô do Telegram (o que o BotFather deu). Os dois comandos `read -rs` pedem o valor sem mostrar nada na tela; cole e aperte Enter:

```bash
read -rs -p 'Token do ERP: ' MEUERP_TOKEN; echo
read -rs -p 'Token do robô do Telegram: ' TELEGRAM_TOKEN; echo
```

Achar o número do chat: mande uma mensagem qualquer para o robô no Telegram e rode:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates" | grep -o '"chat":{"id":-\{0,1\}[0-9]*' | head -1
```

Saída esperada: `"chat":{"id":123456789` (com o seu número). Se não sair nada, mande outra mensagem ao robô e repita. Guarde o número:

```bash
read -r -p 'Número do chat: ' TELEGRAM_CHAT
```

Criar o segredo (as quatro linhas vão direto para o Docker, sem passar por arquivo) e apagar as variáveis:

```bash
printf 'MEUERP_TOKEN=%s\nKAIZEN_URL=postgres://kaizen:%s@postgres:5432/prumo\nTELEGRAM_TOKEN=%s\nTELEGRAM_CHAT=%s\n' "$MEUERP_TOKEN" "$SENHA" "$TELEGRAM_TOKEN" "$TELEGRAM_CHAT" | docker secret create kaizen_env_v1 -
unset MEUERP_TOKEN TELEGRAM_TOKEN TELEGRAM_CHAT SENHA
docker secret ls
```

Saída esperada: um código comprido (o id do segredo) e, na lista, a linha `kaizen_env_v1`.

## 6. Construir a imagem e publicar a stack `kaizen`

```bash
cd /opt/kaizen
SHA=$(git rev-parse --short HEAD)
docker build -f publicacao/Dockerfile -t kaizen-tradutor:$SHA .
KAIZEN_SHA=$SHA docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
docker service ls --filter name=kaizen_tradutor
```

Saída esperada: o `docker build` termina sem erro; o `deploy` diz `Creating service kaizen_tradutor`; na lista, `kaizen_tradutor` com `1/1` e a imagem `kaizen-tradutor:<o SHA>`. Se aparecer `network "prumo_default" is declared as external, but could not be found`, pare e cole a saída na sessão com o Claude.

Conferir o relógio de dentro do serviço:

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C date
```

Saída esperada: a hora de agora em Fortaleza, com `-03`.

## 7. Mandar a mensagem de teste

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C sh -c 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts teste-telegram'
```

Saída esperada: `teste-telegram: o Telegram aceitou a mensagem`, e no seu Telegram chega "Kaizen: mensagem de teste. O aviso de falha chega por aqui."

## 8. Rodar uma leitura à mão e ver o registro

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C sh -c 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts hora --manual'
```

Saída esperada: uma linha que começa com `hora ok:` ou `hora aviso:`, seguida das contagens (documentos lidos, movimentos, produtos...). A primeira leitura carrega tudo desde a virada e pode levar alguns minutos.

Ver o registro das leituras:

```bash
PG=$(docker ps -q -f name=prumo_postgres)
docker exec $PG psql -U prumo -d prumo -c "select id, tipo, manual, to_char(inicio at time zone 'America/Fortaleza', 'DD/MM HH24:MI') as inicio, resultado, mensagem, jsonb_array_length(avisos) as avisos from kaizen.execucao order by id desc limit 5"
```

Saída esperada: a linha da leitura manual, com `manual = t` e o mesmo resultado. Na hora cheia seguinte (entre 8h e 19h, de segunda a sábado), rode de novo: aparece uma linha com `manual = f`, a primeira leitura agendada.

## 9. Atualizar para uma versão nova

Quando o Claude disser que há uma versão nova no GitHub:

```bash
cd /opt/kaizen
ANTERIOR=$(docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')
SEGREDO=$(docker service inspect kaizen_tradutor --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}')
echo "$ANTERIOR $SEGREDO"
git pull
SHA=$(git rev-parse --short HEAD)
docker build -f publicacao/Dockerfile -t kaizen-tradutor:$SHA .
KAIZEN_SHA=$SHA KAIZEN_SEGREDO=$SEGREDO docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
docker service ls --filter name=kaizen_tradutor
```

Saída esperada: o `echo` mostra a imagem em uso (anote: é a versão para voltar atrás) e o segredo em uso; o serviço volta a `1/1` com a imagem nova.

Apagar as imagens antigas do tradutor, guardando só a nova e a anterior:

```bash
docker images kaizen-tradutor --format '{{.Repository}}:{{.Tag}}' | grep -v -x -e "kaizen-tradutor:$SHA" -e "$ANTERIOR" | xargs -r docker rmi
docker images kaizen-tradutor
```

Saída esperada: sobram duas linhas, a nova e a anterior. Depois, rode o passo 8 para conferir a versão nova.

## 10. Voltar atrás

Se a versão nova falhar, volte para a anterior (a que o passo 9 anotou; `docker images kaizen-tradutor` mostra as duas que ficaram):

```bash
cd /opt/kaizen
SEGREDO=$(docker service inspect kaizen_tradutor --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}{{end}}')
docker images kaizen-tradutor
KAIZEN_SHA=<a tag anterior, só a parte depois de "kaizen-tradutor:"> KAIZEN_SEGREDO=$SEGREDO docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
docker service ls --filter name=kaizen_tradutor
```

Saída esperada: o serviço em `1/1` com a imagem anterior. Rode o passo 8. Se a versão nova tinha mudado a estrutura do banco (o Claude avisa quando uma versão traz migração), voltar a imagem pode não bastar: cole a saída na sessão com o Claude.

## 11. Trocar o segredo

Quando um token mudar (o do ERP ou o do Telegram), crie um segredo novo com as quatro linhas e publique com ele. A senha do banco é a do Gerenciador de Senhas ("Kaizen — banco, usuário kaizen"). Para a segunda troca, use `kaizen_env_v3` no lugar de `kaizen_env_v2`, e assim por diante.

```bash
read -rs -p 'Senha do banco (usuário kaizen): ' SENHA; echo
read -rs -p 'Token do ERP: ' MEUERP_TOKEN; echo
read -rs -p 'Token do robô do Telegram: ' TELEGRAM_TOKEN; echo
read -r -p 'Número do chat: ' TELEGRAM_CHAT
printf 'MEUERP_TOKEN=%s\nKAIZEN_URL=postgres://kaizen:%s@postgres:5432/prumo\nTELEGRAM_TOKEN=%s\nTELEGRAM_CHAT=%s\n' "$MEUERP_TOKEN" "$SENHA" "$TELEGRAM_TOKEN" "$TELEGRAM_CHAT" | docker secret create kaizen_env_v2 -
unset MEUERP_TOKEN TELEGRAM_TOKEN TELEGRAM_CHAT SENHA
cd /opt/kaizen
ATUAL=$(docker service inspect kaizen_tradutor --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}')
KAIZEN_SHA=${ATUAL#kaizen-tradutor:} KAIZEN_SEGREDO=kaizen_env_v2 docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen
```

Rode os passos 7 e 8 (mensagem de teste e leitura manual). Com os dois certos, apague o segredo antigo:

```bash
docker secret rm kaizen_env_v1
```

Saída esperada: `kaizen_env_v1`. Se o token do ERP mudou, troque também a linha `MEUERP_TOKEN` do arquivo `.env` do PC.

## 12. Ver o log do serviço

```bash
docker service logs --timestamps --since 24h kaizen_tradutor
```

Saída esperada: para cada leitura, uma linha do `crond` com o comando que ele rodou (`crond: USER root pid ... cmd cd /kaizen && node ...`) e, logo depois, a linha do resultado, como `hora ok: documentos_lidos=12, ...` ou `noite aviso: ...`. A hora no começo de cada linha está em UTC: 3 horas a mais que a de Fortaleza. O log guarda no máximo 3 arquivos de 10 MB; o registro completo de cada leitura fica no banco (passo 8).

## 13. Conferência do dono

Troque os números pelos códigos dos 10 produtos que você quer conferir:

```bash
C=$(docker ps -q -f name=kaizen_tradutor)
docker exec $C sh -c 'cd /kaizen && node --env-file=/run/secrets/kaizen_env tradutor/principal.mts conferencia 60 2138 1436 1362 62 1391 5278 2962 1368 1370'
```

A saída tem cinco partes, e cada uma diz onde conferir no ERP:

1. **Vendas por dia desde 28/09**, pela regra do relatório 154 (documento emitido, de saída, que recebe; só os itens com vendedor; pelo dia em que o documento foi criado): confira, dia a dia, no **relatório 154**.
2. **Contas a pagar pendentes**, número de parcelas e total, sem o crédito de troca: confira na **tela de contas a pagar**.
3. **Quebra de cada fechamento de caixa** (informado menos calculado, por forma, sem a forma troca): confira na **tela do fechamento**.
4. **Saldo atual de cada produto pedido**, da última leitura: confira na **tela do produto**.
5. **Execuções esperadas e feitas nos últimos 7 dias**, e o resultado da **última comparação da noite**: na fase de fechamento, ela precisa dizer "zero diferença".

Cole a saída na sessão com o Claude quando ele pedir.

## 14. Consultar o banco do Kaizen (quando o Claude pedir)

O Claude manda a consulta pronta (só leitura). Cole-a entre as duas linhas `SQL`:

```bash
PG=$(docker ps -q -f name=prumo_postgres)
docker exec -i $PG psql -U prumo -d prumo <<'SQL'
select count(*) from kaizen.documento;
SQL
```

Saída esperada: a tabela com a resposta. Cole-a na sessão com o Claude.
