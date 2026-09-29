# Fase 4 — indicadores e rotina

**Escrita e aprovada pelo orquestrador em 28/09/2026, em modo autônomo (`docs/AUTONOMIA.md`).** Este documento é a spec da Fase 4 do `OBJETIVO.md`: as regras das três perguntas (vendas, compras, financeiro) sobre o esquema `kaizen`, a rotina que as calcula de hora em hora na VPS e grava o resultado, e o aviso ao dono quando ela falha. Vale também a decisão do dono de 28/09 no `OBJETIVO.md`: o comportamento de cada tipo de documento vem da natureza de operação do ERP, e meta e ritmo por vendedor valem para quem tem cadastro do tipo vendedor no ERP. Os fatos do ERP citados aqui foram medidos em 28/09 por consulta só de leitura (`ferramentas/consultar-erp.mts`), e os da Link no banco do PC. Depois de escrita, a spec passou por uma revisão independente em cinco lentes (fatos, regras, simplicidade, lacunas e segurança do script), com cada achado conferido por um verificador que tentou derrubá-lo: dos 40 achados, 30 se sustentaram e estão incorporados aqui.

## 1. Resumo

- **A primeira tarefa é `publicacao/implantar.sh`**, a única porta do agente para a VPS. Ele publica na stack `kaizen` a versão de um ramo do GitHub (com as migrações do esquema `kaizen`), lê o log da stack e roda, dentro do contêiner do Kaizen, uma lista fechada de comandos do próprio Kaizen: a carga da Link, a leitura da noite, o cálculo de dias pedidos, a lista das execuções e a mensagem de teste do Telegram. Todo argumento é conferido no PC antes de chegar à VPS. Nada da stack `prumo`, do esquema `erp` (além da leitura que o dono já deu ao usuário `kaizen`), de volumes ou de segredos. Respeita as janelas do roteiro.
- **Natureza de operação.** O tradutor do ERP novo lê as naturezas e a natureza de troca da configuração do ERP a cada execução, guarda cada versão, grava no documento a versão que valia quando ele entrou no Kaizen e avisa quando uma natureza muda. A Link ganha três naturezas fixas, com o comportamento que ela tinha. As regras decidem pela natureza, nunca por uma lista de tipos.
- **As regras** são três consultas SQL (`sql/regras/vendas.sql`, `compras.sql`, `financeiro.sql`); cada uma recebe um dia e devolve a resposta daquele dia em JSON. Por baixo delas, duas visões dizem o que é venda, devolução, compra e conta (migração).
- **A rotina** é a execução de hora em hora que já existe: depois de ler o ERP, ela calcula as três respostas de hoje; às 22h, as de todos os dias desde 01/04/2026. O resultado fica em `kaizen.resposta`. Se o cálculo falha, a execução falha, e o dono recebe o aviso pelo Telegram pelo mesmo caminho das falhas da leitura.
- **Dados que o dono digita** (meta, feriado, saldo do banco) ganham tabelas. Até o app (Fase 5b), o dono digita por SQL, com os comandos prontos no relatório. A migração já grava os três dias de segunda a sábado em que a loja não abriu desde abril: 01/05, 07/09 e 26/09 (a pausa da virada).
- **A descrição do produto do ERP novo** passa a vir de `mercadoria.descricao`: hoje os 1.029 produtos estão com a descrição vazia.
- **Na VPS**, a história da Link entra com o mesmo comando da Fase 3, e as três respostas são calculadas lá para hoje e para o último dia de cada mês desde abril.

## 2. Ponto de partida

- A Fase 2 roda na VPS desde 28/09 às 17h23: stack `kaizen`, serviço `kaizen_tradutor`, imagem construída na VPS a partir de `/opt/kaizen`, segredo `kaizen_env_v1` e rede `prumo_default`. Lê às hh:00 das 8h às 19h e às 22h, de segunda a sábado. A execução 1 (17h23, manual, imagem `7d1590c`) e as leituras anteriores à migração 009 terminaram em `aviso`, com 7 códigos sem tradução; depois da 009 (versão `ecf9280`), `ok`. O usuário `kaizen` já lê o esquema `erp` na VPS (decisão do dono, 28/09).
- A Fase 3 deixou a história da Link no banco do PC: 6.183 documentos, 5.271 vendas válidas, R$ 737.124,85 vendidos de abril a 25/09. Medido no banco do PC em 28/09:
  - das 5.271 vendas válidas, 5.262 têm item vendido e 9 só têm item devolvido (R$ 1.199,79);
  - todos os itens vendidos e devolvidos da Link têm vendedor;
  - a primeira venda é de 13/04/2026;
  - entre 13/04 e 25/09, os únicos dias de segunda a sábado sem venda são 01/05 (sexta) e 07/09 (segunda);
  - os 530 itens das 51 notas de entrada da Link não têm valor, só quantidade. São 494 itens de entrada (46 notas, 360 produtos) e 36 de entrada não concluída, com sentido `N` (as 5 notas de 22/09, de código 55 a 59, com 35 produtos).
- **Contas a pagar nas duas fontes.** As 94 parcelas abertas da Link em 25/09 (R$ 245.864,76) foram levadas ao ERP novo. Em 28/09 o dono excluiu lá as 13 que venciam antes de 28/09 (R$ 28.373,33; `DECISOES.md`, Fase 2). No ERP ficaram 81 pendentes (R$ 217.491,43) e 107 canceladas, sem baixa. Cada conta a pagar (`CP`) do ERP novo tem ainda uma linha em `documento_pagamento`, na forma 1, com o total do documento: 98 linhas, R$ 491.729,52. Essas linhas não são dinheiro recebido.
- O esquema `kaizen` não tem natureza de operação, meta, feriado, saldo nem resultado de indicador. A única regra escrita é a da conferência do dono (`sql/kaizen/conferencia-dono.sql`), feita para conferir a Fase 2.
- `tradutor/principal.mts` tem os comandos `hora`, `noite`, `teste-telegram` e `conferencia`. Nenhum comando aplica migrações fora de `hora` e `noite`.

### 2.1 O que o ERP diz da natureza (medido em 28/09)

| Documento | Natureza | Categoria | Estoque | Reserva | Financeiro |
| --- | --- | --- | --- | --- | --- |
| pedido (`PA`), 51 | 530 PEDIDO DE VENDA | V | sim | não | sim |
| orçamento (`OC`), 32 | 520 ORÇAMENTO | V | não | não | não |
| pré-venda (`PV`), 8 | 500 PRE-VENDA | V | sim | sim | não |
| nota de entrada (`55`), 1 excluída | 5 COMPRA MERCADORIA… FORA DO ESTADO | C | sim | não | sim |
| inventário (`LE`), 1 | 600 LANÇAMENTO DE INVENTARIO | O | sim | não | não |
| troca (`TM`), nenhuma ainda | 900 TROCA DE MERCADORIA | **C** | sim | não | sim |
| caixa (`AX`, `SF`, `RS`, `FC`), ajustes (`AC`, `AS`, `EM`, `LP`), contas (`CP`), manifesto (`MN`) | 0 ou vazia | — | — | — | — |

- A tabela `natureza_operacao` tem 81 naturezas na empresa 1. As colunas usadas são `_idnatureza`, `descricao`, `tipocategoria`, `flagmovimentarestoque`, `flagreservaestoque` e `flagmovimentarfinanceiro`, com flags `T`/`F`. O documento aponta para ela pela coluna `documento.idnaturezaoperacao`, que fica 0 ou vazia quando não há natureza.
- **A troca não é "devolução" pela categoria.** A natureza 900 é de categoria C (compra). Quem diz que ela é a troca é a configuração do ERP: `config_entrada_saida.idnaturezatrocamercadoria = 900`. As naturezas de categoria D (7, 8 e 9, devolução de compra; 25 e 26, devolução de venda) não foram usadas.
- **O orçamento e a pré-venda são categoria V, mas sem financeiro.** Por isso a regra "categoria V **e** mexe no financeiro" separa a venda deles sem citar tipo.
- A pré-venda está marcada para mexer no estoque e reservar, e mesmo assim não mexeu (medição da Fase 3, 28/09). Nenhuma regra desta fase usa o estoque ou a reserva da natureza: o estoque vem do histórico do próprio ERP.
- **A NFC-e já está configurada** com a natureza 1 (`config_nfce`), que também é de venda com financeiro. Se um dia um pedido gerar uma NFC-e, a venda conta duas vezes. É conferência do dono (seção 13).
- No ERP, só Igor (1) e Daniele (999005) são do tipo vendedor (`pessoa_funcionario.tipo = 'V'`). Erleide (999006) e Wallace (999004) são `N`. O Kaizen já grava esse tipo cru em `kaizen.funcionario.tipo`.

## 3. Decisões

| # | Decisão | Por quê |
| --- | --- | --- |
| 1 | `implantar.sh` tem três subcomandos: `publicar [ramo]`, `log [horas]` e `rodar <comando>`. O `rodar` tem uma lista fechada de cinco comandos: `link`, `noite`, `indicadores <dia>…`, `execucoes [desde]` e `teste-telegram`. Cada comando vira uma linha fixa, `node --env-file=/run/secrets/kaizen_env <arquivo> <argumentos conferidos>`, rodada dentro do contêiner do serviço `kaizen_tradutor`. Esta decisão tem entrada própria em `DECISOES.md`, antes da tarefa do script. | A lista do `AUTONOMIA.md` (publicar, deploy, log, migrações) e o item (1) do `/goal` não cobrem o que os itens 4, 6 e 7 do `/goal` só provam na VPS: rodar a Link, calcular um dia passado, mostrar `kaizen.execucao` e provar que o Telegram chega. A `noite` manual (passo 8 do roteiro do dono) relê todos os documentos logo depois de publicar, sem esperar as 22h. Os comandos rodam como o usuário `kaizen`, que só escreve no esquema `kaizen` e só lê o `erp` (grant do dono). Uma lista fechada, em vez de um `docker exec` livre, mantém o script como a trava que o dono quis. Se estiver errado, o dono tira o `rodar` e roda os comandos à mão, pelo roteiro. |
| 2 | **Todo argumento é conferido no PC antes de qualquer `ssh`.** Cada subcomando tem o seu formato: `ramo` só `[a-z0-9][a-z0-9._/-]*`, sem `..`; `horas` de 1 a 3 dígitos; dia `AAAA-MM-DD`. Fora do formato, o script para com 2 sem falar com a VPS. | O `ssh` junta os argumentos num texto só, e o shell do root na VPS interpreta esse texto. Sem a conferência, `publicar "main;…"` viraria um comando livre como root. |
| 3 | `publicar` atualiza `/opt/kaizen` no ramo pedido (padrão `main`), com `git fetch origin`, `git checkout <ramo>` e `git merge --ff-only origin/<ramo>`. Antes do checkout, ele confere o sha256 de `git show origin/<ramo>:publicacao/stack.yml` contra o valor escrito no próprio script. Depois faz o `docker build` da imagem `kaizen-tradutor:<sha>`, o `docker stack deploy` com o segredo em uso e espera o serviço em `1/1` com a imagem nova. Por fim, roda `principal.mts migrar` no contêiner novo. Não apaga imagem nem contêiner. | A fase precisa da branch `fase-4` na VPS antes do merge, porque a auditoria confere a VPS. No fim, `publicar` volta a VPS para `main`, e o `git pull` do roteiro do dono continua funcionando (com `checkout --detach`, ele quebraria). O sha256 impede que um `stack.yml` mudado (um volume montado, por exemplo) suba sem passar pelo revisor do script. O `build` é necessário por causa do `--resolve-image never`. Cada publicação acrescenta cerca de 1 MB (`tradutor/` e `sql/`; as camadas do Node vêm do cache), e a limpeza do passo 9 do roteiro fica com o dono. |
| 4 | `publicar` e `rodar` só rodam entre hh:10 e hh:50 (inclusive), e nunca das 22h às 22h59, pela hora da VPS em Fortaleza. Fora da janela, param sem fazer nada e dizem a partir de quando podem rodar. `log` só lê e roda a qualquer hora. | Decisão do dono de 28/09 e regra do roteiro: não cortar as leituras da Fase 2. |
| 5 | O script é chamado pelo Git Bash: pela ferramenta Bash (`bash publicacao/implantar.sh …`) ou, no PowerShell, pelo caminho completo (`& "C:\Program Files\Git\bin\bash.exe" publicacao/implantar.sh …`). As regras do `allow` são `Bash(bash publicacao/implantar.sh*)` e `PowerShell(& "C:\Program Files\Git\bin\bash.exe" publicacao/implantar.sh*)`. | No PowerShell deste PC, `bash` é o lançador do WSL (`C:\WINDOWS\system32\bash.exe`), com um Ubuntu que não tem a chave SSH do PC. |
| 6 | O tradutor do ERP novo lê, a cada execução, as naturezas da empresa 1 e a natureza de troca da configuração. Em `kaizen.natureza` fica uma **versão** a cada mudança. O documento ganha `natureza` (o código) e `natureza_id`, a versão que valia quando ele foi gravado pela primeira vez com aquele código. Regravar o documento não troca a versão. | `OBJETIVO.md`, decisão do dono de 28/09: "guarda junto com o documento a que estava valendo" e "o que já foi gravado continua com a configuração da época". |
| 7 | Quando muda uma natureza que o Kaizen já tinha, a execução ganha um aviso `natureza_mudou` para cada natureza, dizendo o que mudou (por exemplo: "A natureza 530 (PEDIDO DE VENDA) mudou no ERP: mexe no financeiro: sim → não."). O aviso chega no resumo das 22h, como os outros. A primeira leitura das naturezas não avisa. Documento com código de natureza que não está em `kaizen.natureza` gera o aviso de código sem tradução que já existe, com o campo `natureza`. | `OBJETIVO.md`: "o dono recebe um aviso dizendo qual natureza mudou e o quê". O resumo das 22h é o caminho que a Fase 2 já tem para o que não é falha, e o aviso de código sem tradução já cobre o código desconhecido. |
| 8 | **O papel de cada documento** fica decidido num lugar só, a visão `kaizen.documento_papel`. Os papéis são venda, troca, compra, conta a pagar, sangria, suprimento e fechamento de caixa. Documento com natureza segue a natureza. Documento sem natureza segue o tipo traduzido: é o caso do caixa, das contas e dos ajustes, que o ERP grava com natureza 0 ou vazia. | É como o ERP se comporta: ele só configura natureza nos documentos comerciais. Nos outros, o tipo é a única informação que existe, e ele vem da tabela de tradução, que é dado, não código. |
| 9 | A Link ganha três naturezas em `kaizen.natureza`, com fonte `link`, gravadas por migração e válidas desde 01/04/2026: `pedido` (V, estoque, financeiro), `orcamento` (V, sem estoque, sem financeiro) e `nota_entrada` (C, estoque, sem financeiro). O comando da Link passa a gravar `natureza` e `natureza_id` nos documentos, pela tradução `natureza_pelo_modelo`. | A Link não tem natureza, mas o comportamento dela já está na tradução da Fase 3 (movimento e financeiro pelo modelo). Com natureza própria, a mesma regra vale para as duas fontes, sem depender de o cadastro do ERP novo ter sido lido antes. |
| 10 | Vendedor com meta e ritmo próprios é o funcionário do ERP novo com `tipo = 'V'` no cadastro lido **na última execução**. Quem não é desse tipo (hoje Erleide e os 3 usuários de teste da Link) entra só na loja, numa linha "outros". | `OBJETIVO.md`, decisão do dono de 28/09: "se o tipo mudar no ERP, o tratamento muda junto". |
| 11 | Meta, feriado e saldo do banco ganham tabelas (`kaizen.meta`, `kaizen.feriado`, `kaizen.saldo_banco`). Até a Fase 5b, o dono digita por SQL, com os comandos prontos no relatório da fase. A migração grava como feriado os três dias de segunda a sábado sem expediente desde abril: 01/05/2026 e 07/09/2026 (a loja não abriu; nenhuma venda na Link) e 26/09/2026 (pausa da virada). | `OBJETIVO.md`: o dono digita metas, feriados e saldo. 26/09 é decisão do dono (`DECISOES.md`, Fase 3). Sem 01/05 e 07/09, a média das segundas antes de 28/09 cai de R$ 5.516,80 para R$ 4.297,71 (−22%), e a projeção de cada segunda sai R$ 1.219 menor. Os feriados em que a loja abriu (21/04, 04/06, 28/07, 15/08 e 08/09) não entram. |
| 12 | As regras são consultas SQL em arquivos (`sql/regras/*.sql`), com o dia em `$1`, que devolvem um JSON. O que é venda, devolução, compra e conta fica em duas visões de uma migração, usadas pelas três. | "As regras vivem num lugar só, sobre o esquema próprio" (`OBJETIVO.md`). Nenhum número passa pelo JavaScript: o JSON sai do Postgres e é gravado como veio. |
| 13 | A rotina calcula **dentro da execução de hora em hora** que já existe. A `hora` calcula o dia de hoje; a `noite`, todos os dias de 01/04/2026 até hoje. O resultado vai para `kaizen.resposta`, um JSON por dia e pergunta. Se o cálculo falha, a execução falha com o motivo `indicadores`, e o aviso segue a regra da Fase 2: uma mensagem, e "voltou a funcionar" depois. | Uma execução só, um registro só e um estado do Telegram só. A noite recalcula tudo para que um feriado ou uma meta digitados depois, ou uma venda que chegou atrasada, apareçam nos dias passados. |
| 14 | O comando `indicadores <dia>…` calcula e grava as respostas dos dias pedidos e imprime um resumo de cada uma. Ele não registra em `kaizen.execucao` e não manda Telegram, como o comando da Link (`DECISOES.md`, Fase 3). Se falhar, imprime o motivo e sai com 1. Um dia antes de 01/04/2026 ou depois de hoje é falha ("fora da história"). | É como se calcula um dia passado na VPS pelo script. A prova do aviso da rotina é o teste da execução com o cálculo falhando, com o texto exato, somado ao `teste-telegram` na VPS. |
| 15 | Nas respostas, o dinheiro sai com 2 casas, arredondado só no total: soma sem arredondar e arredonda no fim. As razões (ritmo, percentual, giro) saem com 4 casas. As quantidades saem como gravadas. Nenhuma conta divide por zero: sem divisor, o campo sai vazio. | É como a Fase 3 bateu com a Link: o vendido de cada item fica sem arredondar. A noite calcula cerca de 40 dias sem venda (domingos, os feriados, abril antes de 13/04), e uma divisão por zero faria a noite falhar todo dia. |
| 16 | **O financeiro tem dois cortes.** Na posição do dia (`contas_a_pagar`, `folga_7`, `folga_30`, `fluxo_previsto`), vale uma fonte só: a Link até 25/09/2026 e o ERP novo a partir de 26/09/2026. Nos fluxos (`fluxo_realizado`, `recebiveis_cartao`, `caixa`), cada dia usa a sua fonte, e o mês soma os dias, cada um pela sua fonte. | A dívida aberta em 25/09 está nas duas fontes. O a pagar cai R$ 28.373,33 de 25/09 para 26/09 sem baixa em nenhuma fonte: é a exclusão do dono, não um pagamento. O corte fica em 26/09, e não em 28/09 como dizia a entrada da Fase 3, para acompanhar a pausa da virada e o estoque; 26/09 e 27/09 não têm movimento financeiro no ERP novo. |
| 17 | O estoque existe a partir de 26/09/2026: é a foto da virada, `kaizen.estoque_virada`, mais o histórico do ERP novo. Antes disso, giro, cobertura, encalhe, ruptura e estoque negativo saem vazios, com `estoque_conhecido: false`. | A Link não tem histórico de estoque, e a foto dela de 25/09 difere do inventário em 736 produtos (`DECISOES.md`, Fase 3). Reconstruir o estoque de trás para frente seria inventar uma história. |
| 18 | A pergunta 2 ("estou comprando o que gira ou o que encalha?") ganha a resposta direta: dos produtos que tiveram entrada de compra nos últimos 90 dias, quantos são curva A, B e C, e quantos não tiveram venda. A conta é de produtos, não de reais. Item de nota da Link com entrada não concluída (sentido `N`: as 5 notas de 22/09) não é entrada. | É a pergunta ao pé da letra, e funciona nos dias da Link, que não têm estoque. As notas da Link não têm valor, só quantidade: contar produtos é o que as duas fontes permitem. |
| 19 | **Migração que já foi publicada na VPS não se edita.** Uma correção vira migração nova, e a visão se refaz com `create or replace view`. Antes de cada `publicar` depois do primeiro, `git diff --name-status --diff-filter=M <SHA publicado> HEAD -- sql/migracoes` tem de sair vazio. | `migrar` reconhece a migração só pelo nome (`tradutor/migracoes.mts`). Um arquivo editado depois de aplicado deixaria a VPS com o SQL antigo, calada. |

## 4. Alternativas consideradas

O critério é o do `OBJETIVO.md`: menos peças, menos regras, menos dependências, nenhuma exceção para funcionar.

- **Script só com os quatro poderes do `AUTONOMIA.md`, e a Link e as consultas por serviços de uma vez só na stack ou pela rotina da noite** (decisão 1). Um serviço que roda a Link a cada publicação, ou uma rotina que carrega a Link quando a acha vazia, é comportamento escondido. Perdeu para a lista fechada, que mostra no próprio script tudo o que o agente pode rodar.
- **Esperar a leitura agendada das 22h para gravar a natureza dos documentos antigos** (decisão 1). Custaria até um dia de espera depois de cada publicação; a `noite` manual é a mesma leitura, e o roteiro do dono já a usa.
- **`rodar` com mais comandos (`conferencia`, `migrar` avulso)** (decisão 1). A conferência é do dono (passo 13 do roteiro), e o `publicar` já roda as migrações. Saíram.
- **Limpar imagens e contêineres no `publicar`** (decisão 3). Seria um poder a mais, fora da lista do `AUTONOMIA.md`, para economizar cerca de 1 MB por publicação. Perdeu.
- **`git checkout --detach`** (decisão 3). Deixaria `/opt/kaizen` sem ramo e quebraria o `git pull` do roteiro do dono. Perdeu para `checkout` do ramo mais `merge --ff-only`.
- **Regras em TypeScript sobre as linhas lidas do banco** (decisão 12). Seria mais código, e os números passariam pelo `number` do JavaScript. Perdeu para SQL em arquivo, que é o que a Fase 2 e a Fase 3 já fazem.
- **Visões materializadas atualizadas de hora em hora** (decisão 12). Não recebem o dia como parâmetro, e "qualquer dia passado desde abril" viraria uma visão por dia. Perdeu.
- **Uma rotina separada, em outro horário do crontab, com o próprio registro e o próprio aviso** (decisão 13). Seriam duas máquinas de estado do Telegram, dois horários e o risco de calcular no meio de uma leitura. Perdeu para o passo a mais na execução que já existe.
- **Calcular os dias passados só quando alguém pede** (decisão 13). Os dias passados ficariam sem resultado gravado e desatualizados depois de um feriado digitado. Perdeu: a noite recalcula todos os dias (cerca de 180), o que cabe no prazo dela.
- **Comando `indicadores` que manda o aviso de falha ao Telegram** (decisão 14). A falha de um comando manual não é a falha da rotina, e o dono receberia um alarme falso. Perdeu para o teste da execução com o texto exato mais o `teste-telegram` na VPS.
- **A versão da natureza escolhida pela data do documento, sem guardar nada nele** (decisão 6). O `OBJETIVO.md` manda guardar junto com o documento. Perdeu.
- **Guardar em `kaizen.natureza` também o movimento e a desativação da natureza** (decisão 6). O movimento já está no documento, e nenhuma regra usa a desativação: desativar uma das 76 naturezas sem uso viraria aviso, contra a gestão por exceção. Saíram.
- **Devolução pela categoria D da natureza** (decisão 8). A troca do ERP é a natureza 900, de categoria C; a regra pela categoria contaria a troca como compra. Quem diz qual é a troca é a própria configuração do ERP.
- **Documentos da Link com as naturezas do ERP novo (530, 520…)** (decisão 9). Criaria uma dependência de ordem (o cadastro do ERP novo lido antes da Link) e uma "configuração da época" que a Link nunca teve. Perdeu para três naturezas próprias, fixas.
- **Comandos para digitar meta, feriado e saldo antes do app** (decisão 11). Seria código que a Fase 5b troca por telas. O dono digita por SQL, que ele já usa no roteiro.
- **Pasta `rotina/` para o cálculo.** Seria uma pasta para um módulo só, obrigando a mudar o Dockerfile, o `tsconfig.json` e a busca de testes. A Fase 2 decidiu manter as peças em `tradutor/` (`DECISOES.md`). O cálculo fica em `tradutor/indicadores.mts`.
- **Reconstruir o estoque da Link de trás para frente, a partir da virada** (decisão 17). Inventaria uma história que a Link não guardou.
- **Guardar cada indicador numa tabela própria, linha a linha** (decisão 13). Seria mais esquema, sem uso nesta fase. Um JSON por dia e pergunta é o que a API da Fase 5b entrega.

## 5. O script de implantação

Arquivo `publicacao/implantar.sh`, em bash, chamado pelo Git Bash (decisão 5): `bash publicacao/implantar.sh <subcomando> [argumentos]`. Ele fala com a VPS por `ssh -o BatchMode=yes root@100.118.200.65` (Tailscale; a chave do PC já está autorizada), mandando um comando fixo por chamada.

| Subcomando | Argumentos aceitos | O que faz na VPS |
| --- | --- | --- |
| `publicar [ramo]` | `ramo`: `[a-z0-9][a-z0-9._/-]*`, sem `..` (padrão `main`) | 1. Confere a janela. 2. Em `/opt/kaizen`, roda `git fetch origin`. 3. Confere o sha256 de `git show origin/<ramo>:publicacao/stack.yml` contra o valor fixo do script; se for diferente, para com 1 sem mudar nada. 4. Roda `git checkout <ramo>` e `git merge --ff-only origin/<ramo>`, e guarda `SHA=$(git rev-parse --short HEAD)`. 5. Anota a imagem e o segredo em uso do serviço (`docker service inspect kaizen_tradutor`). 6. Roda `docker build -f publicacao/Dockerfile -t kaizen-tradutor:$SHA .`. 7. Roda `KAIZEN_SHA=$SHA KAIZEN_SEGREDO=<em uso> docker stack deploy -c publicacao/stack.yml --resolve-image never kaizen`. 8. Espera até 120 s o serviço mostrar `1/1` com a imagem nova. 9. Roda `principal.mts migrar` no contêiner novo. 10. Imprime o SHA publicado, a imagem anterior e o estado do serviço. Se um passo falhar, para com 1 e diz qual. |
| `log [horas]` | `horas`: 1 a 3 dígitos (padrão 24) | Roda `docker service ls --filter name=kaizen_` e `docker service logs --timestamps --since <horas>h kaizen_tradutor`. Não confere janela: só lê. |
| `rodar <comando> [args]` | pela lista abaixo | Confere a janela e roda o comando no contêiner do serviço. |

A lista de `rodar`:

| Comando | Vira | Argumentos aceitos |
| --- | --- | --- |
| `link` | `tradutor/link.mts` | nenhum |
| `noite` | `tradutor/principal.mts noite --manual` | nenhum |
| `indicadores` | `tradutor/principal.mts indicadores` | um ou mais dias `AAAA-MM-DD` |
| `execucoes` | `tradutor/principal.mts execucoes` | nenhum ou um dia `AAAA-MM-DD` |
| `teste-telegram` | `tradutor/principal.mts teste-telegram` | nenhum |

- Comando fora da lista, ou argumento fora do formato, para com 2 sem falar com a VPS. Nenhum argumento chega ao `ssh` sem passar pela conferência de formato do seu subcomando.
- O contêiner é achado por `docker ps -q -f name=kaizen_tradutor`. Sem contêiner, o script para com 1.
- A janela usa a hora da VPS em Fortaleza (`TZ=America/Fortaleza date +%H:%M`). A conta é uma função do script que recebe hora e minuto e se testa sem VPS. Fora da janela, a mensagem é `fora da janela (agora 14h05): rode entre 14h10 e 14h50`.
- Os únicos `docker` do script são `build`, `stack deploy … kaizen`, `service inspect`, `service ls` e `service logs` de `kaizen_`, `ps` e `exec` no contêiner de `kaizen_tradutor`. O script não contém `prumo`, `erp.`, `psql`, `secret`, `volume`, `network`, `rm`, `rmi`, `prune`, `scale` nem `update`. A rede `prumo_default` fica só no `stack.yml`.
- Com o script aprovado pelo revisor, o orquestrador acrescenta ao `allow` do `.claude/settings.json` as duas regras da decisão 5 e registra a mudança em `docs/DECISOES.md` (`AUTONOMIA.md`, "Acesso à VPS").

Comandos novos em `tradutor/principal.mts` que o script usa:

- **`migrar`**: conecta e pega a mesma trava das leituras (`pg_try_advisory_lock(20260928)`). Sem a trava, sai com 1 ("uma leitura está rodando; rode de novo em alguns minutos"). Com ela, aplica as migrações pendentes e imprime `migrar: aplicadas 010_natureza, 011_…` ou `migrar: nenhuma migração pendente`.
- **`execucoes [desde]`**: só lê. Imprime as linhas de `kaizen.execucao` com início a partir do dia pedido (padrão: 7 dias atrás), uma por linha: `id | tipo | manual | início (DD/MM HH:MI, Fortaleza) | resultado | avisos | telegram | mensagem`, com a mensagem cortada em 120 caracteres. No fim, a contagem por resultado.

## 6. Natureza de operação

**Leitura (tradutor do ERP novo).** Uma consulta nova, `sql/erp/naturezas.sql`, roda em toda execução (`hora` e `noite`). Ela devolve as naturezas da empresa 1 (`_idnatureza`, `descricao`, `tipocategoria` e os três flags) e a natureza de troca de `config_entrada_saida` (empresa 1). `sql/erp/documentos.sql` passa a ler `idnaturezaoperacao` (0 vira vazio). As colunas novas entram em `sql/erp/colunas-esperadas.txt`, e a conferência de colunas da Fase 2 passa a cobri-las.

**Tabela `kaizen.natureza`** (migração):

| Coluna | Tipo | O quê |
| --- | --- | --- |
| `id` | bigint identity, chave | a versão |
| `fonte` | text (`meuerp`/`link`) | |
| `codigo` | text | `_idnatureza` (na Link: `pedido`, `orcamento`, `nota_entrada`) |
| `descricao` | text | |
| `categoria` | text | `tipocategoria` cru: V, C, D, R, T, H, O, S |
| `estoque`, `reserva`, `financeiro` | boolean | o flag é `T` |
| `troca` | boolean | é a natureza de troca da configuração |
| `valida_desde` | timestamptz, default now() | |

**Gravação**, dentro da transação da leitura e antes dos documentos. Para cada natureza lida, o tradutor grava uma versão nova se ainda não há versão dela, ou se a última versão difere em alguma coluna (menos `id` e `valida_desde`). Se o Kaizen já tinha versão e ela mudou, gera o aviso `natureza_mudou` (decisão 7), com cada coluna que mudou em palavras: categoria; mexe no estoque; reserva estoque; mexe no financeiro; é a troca; descrição. Natureza que sumiu do ERP fica como está.

**Documento.** `kaizen.documento` ganha `natureza text` e `natureza_id bigint references kaizen.natureza(id)`.

- Na primeira gravação, `natureza_id` é a última versão daquele código.
- Quando o documento é regravado com o mesmo código, `natureza_id` não muda. Se o código mudou, passa à última versão do novo código.
- Documento com código que não está em `kaizen.natureza` fica com `natureza_id` vazio. Quando a versão desse código aparece numa leitura seguinte, o documento regravado passa a ter essa versão (a regra de não trocar vale só para quem já tinha versão; correção da revisão final). A conferência de códigos sem tradução (`tradutor/conferencias.mts`) passa a olhar também o campo `natureza` e gera o aviso de código sem tradução (decisão 7).

**Link.** Uma migração grava as três naturezas da Link (decisão 9) e a tradução `natureza_pelo_modelo`: `A/true` e `T/true` → `pedido`, `P/false` → `orcamento`, `55` → `nota_entrada`. O comando da Link grava `natureza` e `natureza_id` nos documentos desses modelos. Os outros (caixa, contas) ficam sem natureza, como no ERP novo.

**Visões** (migração das regras):

- `kaizen.documento_negocio` ganha, no fim, as colunas da natureza do documento: `natureza`, `categoria`, `mexe_estoque`, `mexe_financeiro`, `troca`. Ficam vazias quando não há natureza.
- `kaizen.documento_papel` (id do documento, fonte, dia, papel). O dia é `coalesce(fechado_em, criado_em)::date`. Só entra documento com situação `emitido`. O papel é:
  - com natureza: `troca` se a natureza é a troca; `venda` se é categoria V e mexe no financeiro; `compra` se é categoria C e mexe no estoque; senão, `outro`;
  - sem natureza: o tipo traduzido (`conta_pagar`, `sangria`, `suprimento`, `suprimento_adicional`, `fechamento_caixa`…).
- `kaizen.venda_item` (documento, fonte, dia, hora, pessoa, produto, vendedor, quantidade, valor, sentido). São os itens com vendedor dos documentos de papel `venda` ou `troca`; `sentido` é `vendido` para o item de saída e `devolvido` para o de entrada. É a regra de "vendido" e "devoluções" do `docs/LOJA.md`, a mesma para as duas fontes: na Link a devolução é item de entrada dentro da venda, e no ERP novo é item de entrada da troca.

## 7. O que o dono digita

| Tabela | Colunas | Regra |
| --- | --- | --- |
| `kaizen.meta` | `id` identity; `mes date` (dia 1); `vendedor text` (vazio = loja); `valor numeric > 0` | uma meta por mês e vendedor (índice único em `mes, coalesce(vendedor, '')`) |
| `kaizen.feriado` | `data date` chave; `descricao text` | a migração grava 01/05/2026 ("Dia do Trabalho; a loja não abriu"), 07/09/2026 ("Independência; a loja não abriu") e 26/09/2026 ("pausa da virada entre a Link e o ERP novo (inventário)") |
| `kaizen.saldo_banco` | `data date` chave; `valor numeric` | vale o último com data até o dia calculado |

## 8. As regras

### 8.1 Definições comuns

- **Dia útil**: segunda a sábado, menos os dias de `kaizen.feriado`.
- **Início da história**: 01/04/2026. A rotina não calcula antes disso.
- **Vendido** de um período: soma do `valor` dos itens `vendido` de `kaizen.venda_item` com dia no período. **Devoluções**: soma dos itens `devolvido`. **Realizado**: vendido − devoluções.
- **Vendas** (contagem): documentos de papel `venda` com pelo menos um item `vendido` no período. A venda só de devolução da Link (9, R$ 1.199,79 devolvidos) não conta como venda, mas a devolução dela conta no realizado. Das 5.271 vendas válidas da Link, contam 5.262.
- **Ticket médio**: realizado ÷ vendas. **Itens por venda**: média de produtos distintos vendidos por venda. Sem venda no período, os dois saem vazios, no dia, no mês e no vendedor.
- **Consumidor Final**: a pessoa `999007` (`docs/LOJA.md`) fica fora de toda contagem de cliente.
- **Estoque no fim do dia d** (só com d ≥ 26/09/2026): o `saldo_depois` do movimento de maior `origem_id::bigint` entre os do produto em `kaizen.estoque_movimento` com `momento` até o fim de d. A coluna é texto: comparada como texto, '9999' ficaria acima de '10000' (é a mesma ordem de `tradutor/conferencias.mts`). Sem movimento, vale a quantidade de `kaizen.estoque_virada`; sem virada, 0.

### 8.2 Vendas (`sql/regras/vendas.sql`)

| Chave | O quê |
| --- | --- |
| `dia` | `vendido`, `devolucoes`, `realizado`, `vendas`, `ticket_medio`, `itens_por_venda` do dia, e `sem_vendedor` (`itens` e `valor` dos itens sem vendedor, que ficam fora do vendido e das devoluções, como exceção, `docs/LOJA.md`) |
| `mes` | os mesmos do mês até o dia (`sem_vendedor` incluso), e mais: `meta` (da loja; vazia sem meta), `percentual_meta` (realizado ÷ meta), `dias_uteis` (do mês), `dias_uteis_decorridos` (do dia 1 até o dia, inclusive), `ritmo` e `projecao` |
| `vendedores` | um por funcionário com `tipo = 'V'`, em ordem de código: `codigo`, `nome`, `realizado_dia`, `realizado_mes`, `vendas_mes`, `meta`, `ritmo`, `clientes_atendidos` (pessoas distintas nas vendas dele no mês, sem o Consumidor Final) e `mix` (realizado do mês por grupo de produto, do maior para o menor) |
| `outros` | `realizado_dia`, `realizado_mes` e `vendas_mes` de quem não é do tipo vendedor |
| `por_hora` | do mês até o dia, por hora da venda: `hora`, `vendas`, `realizado` |
| `por_dia_da_semana` | do mês até o dia: `dia_da_semana` (1 = segunda … 7 = domingo), `vendas`, `realizado` |

- **Ritmo** (loja e vendedor): (realizado do mês ÷ meta) ÷ (dias úteis decorridos ÷ dias úteis do mês). Sai vazio sem meta ou sem dia útil decorrido. Exemplo: em 15/06/2026, sem feriado no mês, com meta de R$ 1.000,00, realizado do mês de R$ 384,60 e 13 de 26 dias úteis decorridos (segunda a sábado), o ritmo é 0,7692.
- **Projeção**: o realizado do mês até a véspera mais, para cada dia útil do dia até o fim do mês, a média do realizado dos últimos 8 dias úteis com o mesmo dia da semana. Esses 8 dias são anteriores ao dia calculado e a partir do primeiro dia com venda na história. Sem nenhum dia assim, a média é 0.
- A soma de `vendedores[].realizado_mes` com `outros.realizado_mes` é o `mes.realizado`, a menos do arredondamento de cada parte: cada uma é arredondada por si, e a soma pode diferir do total em até 1 centavo por parte (em 25/09/2026, 65.895,87 + 51.114,40 + 530,99 = 117.541,26, contra 117.541,25 no mês). Calcular "outros" por diferença fecharia a conta, mas poderia mostrar "outros: −R$ 0,01" num dia sem venda de outros. Uma venda com itens de dois vendedores conta uma vez em `mes.vendas` e uma vez para cada vendedor.

### 8.3 Compras e estoque (`sql/regras/compras.sql`)

Período: os 90 dias que terminam no dia calculado.

| Chave | O quê |
| --- | --- |
| `periodo` | `de`, `ate` |
| `estoque_conhecido` | o dia é 26/09/2026 ou depois |
| `abc_valor`, `abc_quantidade` | para A, B e C: `produtos` e `liquido` (ou `quantidade`) |
| `compras_por_classe` | produtos distintos com item de entrada (sentido `entrada`) em documento de papel `compra` no período: `A`, `B`, `C` (pela curva por valor) e `sem_venda` (comprado sem classe na curva por valor: sem item vendido no período, ou com líquido zero ou negativo, como o vendido e devolvido inteiro); A + B + C + `sem_venda` = os produtos comprados |
| `encalhe` | `produtos` e `valor` (estoque × custo atual) |
| `ruptura` | `produtos` |
| `produtos` | cada produto com venda no período ou estoque diferente de zero: `codigo`, `descricao`, `classe_valor`, `classe_quantidade`, `liquido`, `quantidade`, `estoque`, `estoque_medio`, `giro`, `cobertura_dias`, `encalhe`, `ruptura` |
| `giro_por_grupo`, `giro_por_marca`, `giro_por_fornecedor` | `nome`, `quantidade`, `estoque_medio`, `giro`, `cobertura_dias` |
| `custo_zero` | códigos dos produtos ativos do ERP novo com custo vazio ou zero (cadastro atual) |
| `estoque_negativo` | códigos com estoque menor que zero no dia |

- **Curva ABC** (`docs/LOJA.md`): por valor, entram os produtos com líquido maior que zero (vendido − devolvido, pelos itens de `venda_item`), do maior para o menor. O acumulado é somado produto a produto, numa ordem sem empate: líquido decrescente e depois código crescente, em ordem de texto (há códigos que não são número, como `link:…`). É A enquanto o acumulado, contando o próprio produto, não passa de 80%; B até 95%; C o resto. Por quantidade, entram os produtos com quantidade líquida maior que zero, na ordem: quantidade decrescente, líquido decrescente e código crescente, em ordem de texto.
- **Estoque médio**: média do estoque no fim de cada dia do período, a partir de 26/09/2026. **Giro**: quantidade líquida do período ÷ estoque médio; vazio se o estoque médio é zero ou desconhecido. **Cobertura**: estoque do dia ÷ (quantidade líquida ÷ 90), em dias; vazia sem venda; 0 com estoque zero ou negativo.
- **Encalhe**: estoque do dia maior que zero, nenhum item vendido no período, e o produto não é novo.
- **Produto novo**: a primeira entrada de compra dele na história do Kaizen (item de entrada em documento de papel `compra`) é de menos de 60 dias antes do dia, e antes dela ele não teve item vendido. Se essa entrada é de 26/09/2026 em diante, o estoque dele no fim do dia anterior a ela também era zero ou menos. Ajuste de custo, ajuste de estoque, orçamento, pré-venda, inventário e a foto da virada não contam como entrada. Produto sem entrada de compra não é novo. Exemplos em 28/09/2026: o produto 1708 (164 unidades na virada, sem venda desde abril, que só aparece no ajuste de custo 115) está em encalhe; o 5336 (entrada na nota da Link de 26/08, 57 na virada, sem venda) é novo e não está em encalhe.
- **Ruptura**: item vendido no período e estoque do dia zero ou negativo.
- Antes de 26/09/2026, saem vazios `estoque`, `estoque_medio`, `giro`, `cobertura_dias`, `encalhe`, `ruptura`, as listas de estoque e o `giro_por_*`. A curva e as compras por classe saem normalmente.

### 8.4 Financeiro (`sql/regras/financeiro.sql`)

Os dois cortes da decisão 16: a posição usa a fonte do dia calculado (a Link até 25/09/2026, o ERP novo a partir de 26/09/2026), e os fluxos usam a fonte de cada dia.

| Chave | O quê |
| --- | --- |
| `fonte` | a da posição do dia |
| `contas_a_pagar` | em aberto no fim do dia: `vencidas`, `ate_7_dias`, `ate_30_dias` e `total` (cada um com `parcelas` e `valor`), e `por_vencimento` (`vencimento`, `parcelas`, `valor`) |
| `saldo_banco` | o último digitado até o dia (`data`, `valor`), ou vazio |
| `folga_7`, `folga_30` | saldo − (vencidas + as que vencem até dia+7 / dia+30); vazias sem saldo |
| `fluxo_realizado` | `dia` e `mes`: `entradas` por forma (dinheiro, pix, credito, debito, cartao, outras) e `saidas` |
| `recebiveis_cartao` | vendas no crédito, no débito ou em cartão do dia, a creditar no dia seguinte: `credito_em`, `valor` |
| `fluxo_previsto` | os próximos 30 dias: `data`, `entradas` (recebíveis de cartão) e `saidas` (contas a pagar que vencem) |
| `caixa` | `fechamentos`: a lista dos fechamentos do dia, cada um com `codigo`, `quebra` e `formas` (cada forma com `forma`, `calculado`, `informado`, `quebra`); e `gaveta`, a do dia: `vendas_dinheiro`, `suprimentos`, `sangrias`, `devolucoes_dinheiro`, `gaveta` |

- **Conta a pagar**: parcela de documento de papel `conta_pagar` ou `compra`. Está em aberto no fim do dia se foi lançada até o dia, não está cancelada, e o valor menos as baixas válidas com data até o dia é maior que zero. O crédito de troca (papel `troca`) e a sangria não são conta. Conferência: em 25/09/2026 (fonte Link) são 94 parcelas, R$ 245.864,76; em 26/09/2026 (fonte ERP novo), 81 parcelas, R$ 217.491,43.
- **Entradas**: pagamentos dos documentos de papel `venda`, pela forma traduzida, menos a forma `troca` (vale). Dinheiro, Pix e as outras formas entram no dia da venda. Crédito, débito e cartão entram no dia seguinte, a mesma data do recebível, pela fonte do dia da venda: o cartão da Link de 25/09 entra em 26/09. O dinheiro devolvido da Link já vem negativo nas entradas (R$ 161,00, negociações 108 e 507). Os pagamentos dos documentos de conta a pagar (98 linhas, R$ 491.729,52 no ERP novo) não são entrada.
- **Saídas**: baixas válidas das contas a pagar, pela data da baixa, menos a forma `troca`; mais os pagamentos em dinheiro das trocas, no dia da troca (o mesmo valor que a gaveta desconta).
- **Recebível de cartão**: cai no dia seguinte ao da venda (`docs/LOJA.md`: "Cartão cai em D+1").
- **Quebra**: informado − calculado, por fechamento e por forma, sem a forma `troca` (`docs/LOJA.md`).
- **Gaveta**: pagamentos em dinheiro das vendas (com o troco e o dinheiro devolvido da Link, que já vêm negativos) + suprimentos (papéis `suprimento` e `suprimento_adicional`) − sangrias − pagamentos em dinheiro das trocas. O sinal do dinheiro da troca do ERP novo ainda não foi visto, porque não houve troca até 28/09: a primeira troca real é conferida na conferência da Fase 2.

## 9. A rotina

- **Módulo novo `tradutor/indicadores.mts`.** A função `calcularRespostas(cliente, dias: string[]): Promise<number>` roda as três consultas para cada dia e grava em `kaizen.resposta` (`data date`, `pergunta text` em `vendas`/`compras`/`financeiro`, `conteudo jsonb`, `calculado_em timestamptz default now()`, chave `data, pergunta`), sobrescrevendo o que havia. O JSON vai do Postgres para a tabela sem passar pelo JavaScript (`insert … select`). Cada dia é gravado numa transação. A função devolve quantas respostas gravou.
- **Na execução** (`tradutor/execucao.mts`), o cálculo vem depois das conferências e antes do registro do fim. A `hora` calcula `[hoje]`; a `noite`, todos os dias de 01/04/2026 a hoje. A contagem `respostas` entra em `contagens`.
- **Falha.** Um erro no cálculo vira `ErroKaizen` com o motivo novo `indicadores`. O texto do Telegram é: `Kaizen: a leitura das {h}h terminou, mas o cálculo dos indicadores falhou — {detalhe}. {Os dados do Kaizen continuam os das Xh. }Abra uma sessão com o Claude e cole esta mensagem.`
- **Comando `principal.mts indicadores <dia>…`** (decisão 14): calcula, grava e imprime, para cada dia, três linhas:
  - `DD/MM/AAAA vendas: realizado do dia R$ X (N vendas); no mês vendido R$ V, devoluções R$ D, realizado R$ Y (N vendas), meta R$ M (P%), ritmo R, projeção R$ Z`. Sem meta, sai `sem meta cadastrada` no lugar da meta, do percentual e do ritmo.
  - `DD/MM/AAAA compras: curva A a, B b, C c produtos; compras do período: A x, B y, C z, sem venda w; ` seguido de `encalhe e produtos, R$ v; ruptura r` ou de `estoque desconhecido antes de 26/09/2026`.
  - `DD/MM/AAAA financeiro (fonte): a pagar R$ T em N parcelas, vencidas R$ V, até 7 dias R$ S; ` seguido de `folga em 7 dias R$ F` ou de `saldo do banco não digitado`, e de `; quebra do dia R$ Q`.

## 10. A descrição do produto

`sql/erp/cadastros.sql` passa a ler a descrição de `mercadoria.descricao`, pela ligação `mercadoria._idmercadoria = mercadoria_variacao.idmercadoria`, que já existe. Medido em 28/09: as 1.029 variações têm a descrição vazia, e as 1.029 mercadorias ligadas a elas têm descrição. Por exemplo, o produto 60 (`idmercadoria` 730) é `BROCA CHATA P/ MADEIRA 1" X 6" WORKER`, e o 1436 é `COLA DE CONTATO 14 KG KISAFIX`. A coluna entra em `colunas-esperadas.txt`. A leitura de cadastros regrava os produtos a cada execução, então a primeira leitura depois da publicação corrige os 1.029 sem migração.

## 11. Na VPS

Na ordem, dentro das janelas, tudo pelo `implantar.sh`. Tudo o que for rodado na VPS vai para `docs/fases/FASE-4-vps.md`, com a saída e o SHA publicado.

1. **Antes de publicar**, `log`: o serviço em `1/1` com a imagem `kaizen-tradutor:ecf9280` (ou posterior, com a migração 009) e as linhas `hora ok` das leituras. O comando `execucoes` só existe depois do primeiro `publicar`.
2. **`publicar fase-4`** logo depois do script e da descrição do produto: a primeira publicação prova o script. Depois, `rodar execucoes 2026-09-28` mostra a tabela desde o início: em `aviso`, a execução 1 e as leituras anteriores à 009; em `ok`, as seguintes.
3. **`publicar fase-4`** de novo, com a fase inteira. Antes, `git diff --name-status --diff-filter=M <SHA publicado> HEAD -- sql/migracoes` sai vazio (decisão 19).
4. **`rodar link`**: a história da Link, com `link ok: documentos=6183 …` e `vendas_validas: 5271`. O comando só termina com `link ok` se os 141 dias baterem com a Link, e isso é a comparação por dia sem diferença.
5. **`rodar noite`** às hh:10 (a leitura da noite manual, passo 8 do roteiro), com resultado `ok` e a versão nova. Só a noite relê todos os documentos e grava a natureza dos antigos: a `hora` relê apenas desde ontem, e um pedido antigo sem natureza ainda não conta como venda. Com a Link já gravada, ela calcula todos os dias desde abril. Os passos 6 a 8 rodam só depois dela. Ela precisa terminar antes da hora cheia seguinte, senão a leitura agendada sai `pulada`.
6. **`rodar indicadores`** com hoje e o último dia de cada mês da Link (2026-04-30, 05-31, 06-30, 07-31, 08-31 e 09-25): as três respostas de cada dia. O vendido do mês de cada um desses dias é o da tabela por mês do `FASE-3-relatorio.md` (58.825,56; 132.684,79; 140.882,93; 145.743,81; 140.782,78; 118.204,98), e a soma dos seis dá R$ 737.124,85. O a pagar de 25/09 é 94 parcelas, R$ 245.864,76 (fonte Link). Também `rodar indicadores 2026-09-26`: 81 parcelas, R$ 217.491,43 (fonte ERP novo).
7. **`rodar teste-telegram`**: "o Telegram aceitou a mensagem".
8. **`rodar execucoes 2026-09-28`**: as leituras agendadas desde o início da fase (28/09, depois das 19h28) com resultado `ok`.
9. **No fim da fase, depois do merge**: `publicar` (main); esperar a leitura agendada da hora cheia seguinte; `rodar execucoes 2026-09-28` e `log 2`. Todas as leituras agendadas da fase estão `ok`, inclusive a primeira com a imagem de `main`. (Correção de 29/09: desde as 09h de 29/09, dois códigos novos do ERP sem tradução põem as leituras em `aviso`; até a migração 014, que é do dono, o esperado é nenhuma `falha` e nenhuma `pulada`, com `aviso` só por esses dois códigos. `docs/DECISOES.md`, 29/09.)

## 12. Testes

- Todo teste tem valor de referência concreto; nenhum `.skip` ou `.only`. A contagem em `testes-esperados.txt` (329 no início da fase) sobe a cada tarefa, e o plano diz o número esperado ao fim de cada uma.
- **Regras.** São testadas num banco de teste, com documentos montados à mão e o resultado esperado escrito no teste, e com a Link falsa da Fase 3 (a venda de junho 1992 soma R$ 150,00 no dia dela). Casos que o plano cobre com valor concreto:
  - o ritmo da seção 8.2 (0,7692);
  - um dia sem venda num mês com venda (o dia sai com `vendas` 0 e ticket vazio, e o mês com ticket), e um dia sem venda num mês ainda sem venda (tudo vazio, sem erro);
  - o estoque com dois movimentos do mesmo produto no mesmo dia, de `origem_id` '9999' (saldo 5) e '10000' (saldo 3): o estoque é 3;
  - dois produtos de líquido igual atravessando o corte de 80%, com a classe de cada um;
  - o produto novo e o antigo da seção 8.3;
  - um mês que começa na Link e termina no ERP novo, com as entradas e as saídas do mês somando as duas fontes;
  - a venda no cartão do dia D, que aparece no realizado e no previsto de D+1, e não no realizado de D;
  - uma troca com R$ 18,00 devolvidos em dinheiro, que aumenta as saídas do dia em R$ 18,00 e diminui a gaveta;
  - os pagamentos das contas a pagar, que não entram nas entradas nem na gaveta;
  - as 5 notas da Link com entrada não concluída, que não contam como compra.
- **Rotina.** Um teste de `executar` (`hora`, 14h) com o cálculo falhando depois da carga. A linha de `kaizen.execucao` fica `falha`, com o detalhe na mensagem e `telegram_ok = true`. A mensagem enviada é exatamente `Kaizen: a leitura das 14h terminou, mas o cálculo dos indicadores falhou — <detalhe>. Os dados do Kaizen continuam os das 13h. Abra uma sessão com o Claude e cole esta mensagem.` A execução `ok` seguinte, às 15h, manda `Kaizen: voltou a funcionar às 15h.` Também: a `hora` num dia sem venda até aquele momento termina `ok`.
- **Script.** Testado sem VPS:
  - lendo o arquivo: o que ele pode conter, pela lista de `docker` permitidos da seção 5; e o sha256 escrito nele, que é o de `publicacao/stack.yml`;
  - rodando a função da janela com horas concretas: 14:09 fora, 14:10 dentro, 14:50 dentro, 14:51 fora, 22:30 fora, 23:15 dentro;
  - rodando o script pelo Git Bash, com um `ssh` falso no `PATH` que anota cada chamada. Saem com 2 e nenhuma chamada ao `ssh`: `rodar indicadores "2026-04-15;id"`, `rodar bash`, `rodar link x`, `publicar "main;id"`, `publicar "../x"`, `log "24;id"` e `log abc`. Chamam o `ssh`: `publicar fase-4`, `log 24` e `rodar execucoes 2026-09-28`.

## 13. O que o dono faz

- Digitar as metas de outubro (loja e cada vendedor), os dias em que a loja vai fechar e, quando quiser a folga, o saldo do banco. Os comandos SQL vêm prontos no relatório da fase (passo 14 do roteiro, sem a opção só de leitura). O relatório avisa que os feriados em que a loja abriu não entram.
- Conferir no ERP, na conferência da Fase 2, a primeira troca real (o sinal do dinheiro devolvido) e se a primeira NFC-e ou NF-e duplica a venda do pedido. Se duplicar, a venda conta em dobro, porque as duas naturezas são de venda com financeiro.

## 14. Fora do escopo

- Carteira de clientes, ABC de clientes, RFV e relacionamento (Fase 8); réguas, notificação e briefing (Fase 6); API e telas (Fase 5b).
- Reserva de estoque: nenhum indicador desta fase usa.
- Custo do item no momento da venda (margem, Fase 8). O custo usado aqui (encalhe, custo zero) é o do cadastro atual.
