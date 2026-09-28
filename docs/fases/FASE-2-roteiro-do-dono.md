# Fase 2 — roteiro do dono

Esta página mostra a ordem da implantação e da conferência diária. Para cada passo, diz o que você faz, onde, quanto tempo leva e como sabe que deu certo. Os comandos exatos, prontos para colar, estão em `publicacao/README.md`, no passo de mesmo número.

**Três regras para todos os passos:**

- Rode os passos 6, 7 e 8 entre **hh:10 e hh:50**. Nunca rode nada entre 22h e 22h50.
- **Nunca** rode `docker stack rm prumo`.
- Se a tela mostrar algo diferente do esperado, pare e cole a saída na sessão do Claude.

## Implantação

### Passo 0 — Anotar o espaço em disco

- **Onde:** VPS.
- **Tempo:** 1 minuto.
- **Deu certo quando:** aparece a tabela dos discos, e você anotou a linha que termina em `/`.

### Passo 1 — Parar o sync do Prumo e guardar a cópia da Link

Faça hoje, 27/09, antes das 8h de 28/09.

- **Onde:** VPS e, depois, PC (PowerShell).
- **Tempo:** 15 a 30 minutos.
- **Deu certo quando:**
  - `prumo_sync` mostra `0/0`;
  - o banco e a cópia mostram `26` tabelas cada um;
  - o código SHA-256 do arquivo no PC é igual ao da VPS.
- **Depois:** guarde uma segunda cópia fora do PC.

### Passo 1a — Importar de novo as contas a pagar

- **Onde:** ERP.
- **Tempo:** cerca de 30 minutos.
- **Quando:** a qualquer hora antes do passo 6.
- **Deu certo quando:** a tela de contas a pagar mostra as parcelas pendentes. Em 24/09 eram 94 parcelas e R$ 245.864,76; hoje o número pode ser menor, se alguma já foi paga.

### Passo 2 — Criar a chave de implantação no GitHub

- **Onde:** VPS e site do GitHub.
- **Tempo:** 10 minutos.
- **Deu certo quando:** a VPS responde `Hi israel5550123/KAIZEN! You've successfully authenticated`.

### Passo 3 — Baixar o código

- **Onde:** VPS.
- **Tempo:** 2 minutos.
- **Deu certo quando:** o último commit mostrado é o mesmo que o Claude disser na sessão.

### Passo 3a — Criar o robô do Telegram

Faça antes do passo 4: do passo 4 ao 5, o terminal da VPS não pode fechar.

- **Onde:** Telegram.
- **Tempo:** 5 minutos.
- **Como:**
  1. Abra o **BotFather**, mande `/newbot` e escolha um nome.
  2. Guarde o token que ele devolver no Gerenciador de Senhas.
  3. Mande uma mensagem qualquer para o robô novo.
- **Deu certo quando:** o BotFather devolveu o token (números, dois-pontos, letras), e a sua mensagem aparece na conversa com o robô.

### Passo 4 — Criar o usuário e o esquema do Kaizen no banco

- **Onde:** VPS e Gerenciador de Senhas.
- **Tempo:** 5 minutos.
- **Deu certo quando:** aparecem `CREATE ROLE`, `ALTER ROLE` e `CREATE SCHEMA` e, no fim, `kaizen|f`. A senha fica guardada como "Kaizen — banco, usuário kaizen".

### Passo 5 — Criar o segredo

- **Onde:** VPS, com o Telegram aberto.
- **O que ter à mão:** o token do ERP (a linha `MEUERP_TOKEN` do `.env` do PC) e o token do robô.
- **Tempo:** 10 minutos.
- **Deu certo quando:** aparece `"chat":{"id":` seguido do seu número, e `docker secret ls` mostra `kaizen_env_v1`.

### Passo 6 — Conferir a lista antes da virada, construir e publicar

- **Onde:** primeiro no PC, na sessão do Claude; depois na VPS.
- **Antes de publicar:** peça ao Claude a lista de novo e espere o OK dele. A lista de 27/09 está em `docs/fases/FASE-2-documentos-antes-de-28-09.md`.
- **Tempo:** 15 a 20 minutos. A construção leva alguns minutos.
- **Deu certo quando:** `kaizen_tradutor` aparece com `1/1`, e o relógio de dentro do serviço mostra a hora de Fortaleza, com `-03`.

### Passo 7 — Mandar a mensagem de teste

- **Onde:** VPS e Telegram.
- **Tempo:** 1 minuto.
- **Deu certo quando:** a VPS diz `teste-telegram: o Telegram aceitou a mensagem`, e no Telegram chega "Kaizen: mensagem de teste".

### Passo 8 — Rodar uma leitura à mão e ver o registro

- **Onde:** VPS.
- **Tempo:** 5 a 15 minutos. A primeira leitura carrega tudo desde a virada.
- **Deu certo quando:**
  - aparece uma linha começando com `noite ok:`. Com `noite aviso:`, cole a linha e o resumo do Telegram na sessão do Claude;
  - o registro mostra a leitura com `manual = t`;
  - na hora cheia seguinte (8h às 19h, de segunda a sábado), aparece outra com `manual = f`.

## Conferência diária

### Passo 13 — Conferência do dono

- **Quando:** toda manhã, por 6 dias de operação seguidos.
- **Onde:** VPS. Para as partes 1 a 4, confira também no ERP.
- **Tempo:** 2 minutos para rodar e ler a parte 5; 15 a 30 minutos quando for conferir as partes 1 a 4.
- **Deu certo quando:** a parte 5 mostra:
  - todas as leituras esperadas feitas;
  - toda falha "avisada pelo Telegram";
  - a última comparação da noite com "zero diferença".
- **Pelo menos uma vez na semana:** confira as partes 1 a 4, cada uma na tela do ERP:
  - as vendas por dia, no relatório 154;
  - o total, na tela de contas a pagar;
  - a quebra, nos fechamentos de caixa;
  - o saldo de 3 ou 4 produtos, na tela de cada produto.

  Toda diferença volta para a sessão do Claude.

Seis dias seguidos com a parte 5 certa fecham a Fase 2.
