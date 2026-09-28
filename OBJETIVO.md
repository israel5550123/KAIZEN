# Kaizen — objetivo

Este documento diz **onde o projeto quer chegar** e **em que ordem**. Como chegar é decisão de quem implementa, fase a fase, no brainstorming de cada uma. Leia `docs/LOJA.md` para entender o negócio e o que cada número significa, e `docs/api/` para a API do ERP.

## Para que existe

Israel comprou em setembro de 2026 uma loja de ferragens e acessórios para marceneiros em São Luís (MA). Ele não fica na loja: gerencia à distância, acompanhando números e se reunindo com a equipe que designou.

O Kaizen é o app que torna isso possível. Todo dia, em menos de um minuto, ele responde:

1. **Vendas** — como está o desempenho em relação à meta?
2. **Compras** — estou comprando o que gira ou o que encalha?
3. **Financeiro** — tenho dinheiro para pagar as contas?

O modelo é **gestão por exceção**: meta → desvio → detalhe. Quando algo sai do lugar, o app avisa; quando está tudo bem, ele fica quieto.

**As três perguntas são a porta de entrada do dia a dia, não o limite do projeto.** Atrás de cada uma há a profundidade descrita em "Destino completo": carteira, mapa, dossiê do cliente, giro, caixa. O esquema, a rotina e o app são desenhados sabendo que tudo aquilo vem.

Para a equipe, a porta de entrada é outra pergunta: **com quem eu falo hoje?** Mais da metade das vendas é entrega: o marceneiro pede pelo WhatsApp e recebe na marcenaria, e escolhe a loja pelo preço e pelo atendimento, não pela distância. Por isso o vendedor precisa saber quem procurar antes que o cliente passe a comprar em outro lugar, e o dono precisa saber onde a loja vende, onde não vende e onde o concorrente está mais perto. Para o vendedor, a exceção é uma lista curta de nomes, não um percentual.

## O que não faz

O Kaizen **não vende, não compra e não lança nada no ERP**. A operação inteira continua no ERP, inclusive o cadastro de cliente e os leads do CRM. O que se digita no Kaizen, porque o ERP não guarda: saldo do banco, metas, feriados e, a partir da Fase 7, carteira, tarefas, anotações, localização da loja e dos clientes, regiões, concorrentes, viagens de entrega, custo por viagem e o dossiê do cliente. Nada disso volta para o ERP.

## Arquitetura decidida

Estas decisões já foram tomadas e não se reabrem sem conversa com o dono.

- **Fonte de dados a partir de 28/09/2026, início da operação real: Meu ERP Online**, pela API pública (`docs/api/swagger.json`, `docs/api/GUIA_CLAUDE_CODE.md`). O token dá leitura e escrita; o Kaizen usa **somente leitura por construção**: só chamadas GET e o endpoint `consulta/sql`, que a própria API limita a SELECT.
- **Fonte de dados de abril a 25/09/2026, último dia de venda na Link: o ERP anterior (Link)**, cuja cópia final, tirada depois desse dia, fica no Postgres da VPS, esquema `erp`. Não muda mais.
- **Banco próprio**, Postgres na VPS (o mesmo da stack `prumo`, já no ar), com **esquema próprio desenhado pelas perguntas do app**, não por nenhum dos dois ERPs. Só o que os indicadores precisam. Cada linha sabe de qual fonte veio e qual era o registro de origem.
- **Um tradutor por fonte** alimenta o esquema próprio. Tradutor traduz fato e copia número; não decide regra nem recalcula. As regras (o que é venda válida, como corta a curva ABC, o que é cliente atrasado) vivem num lugar só, sobre o esquema próprio.
- **Rotina na VPS** calcula os indicadores de hora em hora, de segunda a sábado, e grava o resultado pronto. **Ela avisa o dono quando falha.**
- **API pequena na VPS** entrega o resultado ao app e recebe o que se digita no Kaizen.
- **App Flutter** exibe. Material 3, `fl_chart` para gráficos, mapa por OpenStreetMap (`flutter_map`), sem chave nem cartão. Endereço vira coordenada pelo Nominatim, do próprio OpenStreetMap, também sem chave nem cartão. Não calcula nada. As telas são desenhadas numa fase própria (5a) antes de serem construídas (5b).
- **Dois formatos, não um só esticado.** O app roda no celular (dono e vendedor, dedo, uma coluna, na rua) e no computador (dono e gerente, mouse e teclado, tela larga, sentado). São usos diferentes: cada tela tem um layout **compacto** e um layout **expandido**, seguindo as classes de tamanho de janela e os layouts canônicos do Material 3 (lista-detalhe, painel de apoio; barra de navegação embaixo no celular, trilho ou gaveta no computador). No computador cabe mais informação por tela, tabela com ordenação, atalhos de teclado e passagem do mouse; no celular, menos por tela e alvos grandes para o dedo. Como o app chega ao computador (janela do Windows ou navegador) se decide na Fase 5a pelo que for mais simples de entregar à gerente. O entregador usa só o celular.
- **Aviso ao dono** é mensagem de Telegram, por robô próprio, sem serviço intermediário. Vale para falha de rotina, régua cruzada e briefing.
- **Firebase só para autenticação** (Google e e-mail/senha) **e notificação push**. Plano gratuito. Nenhum serviço com cota diária ou cartão de crédito entra no projeto.
- **IA (Claude) só lê e escreve texto; nunca calcula.** Na Fase 6 ela lê números já gravados e escreve o que significam; na Fase 12 ela lê depoimentos e conversas e escreve linhas do dossiê, sempre com a origem ao lado. Nenhum indicador sai de uma resposta de IA.
- **Servidor em TypeScript** (tradutores, rotina, API), como a VPS já roda.
- **Dois ambientes**: local (Postgres em Docker no PC) e VPS (Docker Swarm, stack `kaizen`, ligada ao Postgres da stack `prumo`, e segredos do Swarm para senhas e token). A stack própria foi decidida pelo dono em 27/09/2026, na spec da Fase 2.
- Fuso horário `America/Fortaleza`. Textos, commits, testes e relatórios em português.

## Destino completo

Tudo abaixo faz parte do projeto. As fases dizem a ordem; nada aqui é "talvez depois". Os números de relacionamento, mapa e entrega estão definidos em `docs/LOJA.md`, seção "Relacionamento, mapa e entregas", com as réguas iniciais; quem implementa usa a definição de lá, não uma própria.

### Vendas

- Meta mensal da loja e meta por vendedor, cadastradas no Kaizen.
- Realizado do dia, do mês e projeção do mês: realizado + média das últimas 8 semanas do mesmo dia da semana, para cada dia útil restante.
- Ritmo por vendedor: (realizado ÷ meta) ÷ (fração de dias úteis decorridos). Dia útil é segunda a sábado, menos os feriados cadastrados.
- Ticket médio, itens por venda, vendas por hora e por dia da semana.
- Carteira de clientes: curva ABC de clientes, RFV (recência, frequência, valor), frequência de compra, clientes que pararam de comprar, distribuição por região.
- Vendedor: venda por vendedor, mix vendido, clientes atendidos.

### Compras e estoque

- Curva ABC de produtos por valor e por quantidade, no período.
- Giro e cobertura de estoque por produto, grupo, marca e fornecedor, sobre a venda dos últimos 90 dias.
- Encalhe: produto com estoque e sem venda há 90 dias, com carência de 60 dias desde a primeira entrada para produto novo.
- Ruptura: produto que vende e está zerado ou negativo.
- Custo zero e estoque negativo como listas de saneamento.

### Financeiro

- Contas a pagar por vencimento; folga em 7 e 30 dias contra o saldo do banco digitado.
- Fluxo de caixa realizado e previsto.
- Quebra de caixa: diferença entre o contado e o calculado, por turno e por forma de pagamento; gaveta e sangrias.
- Recebíveis de cartão por data de crédito.

### Alertas e comunicação

- Vigia de réguas: cada indicador tem uma régua; quando cruza, o dono recebe uma notificação com uma frase, não com um número solto.
- Briefing semanal: um texto curto com o que mudou na semana.
- Interpretação por IA: o Claude lê os indicadores já calculados e escreve o que eles significam; nunca calcula.

### Relacionamento — o que o vendedor vê

O vendedor não vê percentual. Ele abre o app e vê **a lista do dia**: nome, telefone, motivo e o que fazer. Quatro motivos, nesta ordem:

- **Cliente atrasado**: passou do intervalo normal de compra dele, mas ainda não sumiu.
- **Cliente sumido**: mais de 60 dias sem comprar.
- **Orçamento parado**: orçamento em aberto no ERP há mais de 2 dias úteis, sem virar venda nem ser cancelado.
- **Compra incompleta**: o cliente comprou hoje ou ontem sem um produto que ele quase sempre leva junto.

A lista é da carteira do vendedor, ordenada pelo valor em risco (o que o cliente costuma comprar por mês), com no máximo 10 nomes por dia. O vendedor marca "falei" (vira anotação) e o nome sai da lista por 7 dias. Cada nome abre o dossiê do cliente. As réguas (1,5 vez o intervalo, 60 dias, 2 dias úteis, 10 nomes, 7 dias) são configuráveis pelo dono.

Além da lista: tarefas e anotações por cliente, e o mapa da própria carteira.

### Relacionamento — o que a gerência vê

O dono e a gerente veem, por loja e por vendedor, mês contra mês anterior:

- **Clientes ativos** no mês.
- **Retenção**: dos ativos no mês anterior, quantos compraram neste.
- **Clientes novos**: primeira compra da história neste mês, e quantos deles vieram de lead do CRM.
- **Ticket médio** e **itens por venda**.
- **Margem** por cliente, por produto e por vendedor, com o custo do item no momento da venda.
- **Leads**: o Kaizen lê os leads do CRM do ERP (`/api/lead/v1`: etapa, status, próximo contato, pessoa vinculada) e mostra, por bairro e depois por região, quantos há, quantos foram contatados e quantos viraram cliente. O trabalho com o lead (ligar, anotar, mudar status) continua no CRM do ERP.
- A partir da Fase 10, tudo isso por **região**; a partir da Fase 11, a margem já descontado o custo de entrega, e a **densidade** de cada região.

### Dossiê do cliente

Uma página curta por cliente: a ficha que o vendedor lê antes de ligar. Tem duas camadas, de confiabilidade diferente, que nunca se misturam na tela nem no banco:

- **Camada dura**, calculada por SQL sobre as vendas, sem IA: o que compra (grupos, marcas, produtos que mais compra), os produtos curva A da loja que ele nunca comprou, intervalo normal, tendência (comprando mais ou menos que nos 90 dias anteriores), ticket, última compra, horário em que costuma pedir, tarefas e anotações.
- **Camada mole**, escrita a partir de texto (depoimentos do vendedor e conversas), em quatro blocos separados:
  - **Identificação e logística**: quem recebe, horário em que atende, referência do local, como prefere ser contatado.
  - **Relacionamento comercial**: objeções recorrentes, sensibilidade a preço, se pechincha, se compara com concorrente, como decide.
  - **Atritos**: troca, atraso, produto errado, reclamação. Fica num bloco separado de propósito, porque é o que não pode ser esquecido numa abordagem.
  - **Pessoal**: nome de quem atende, time, assunto que puxa conversa, datas.

Regras da camada mole: **toda linha tem origem** (quem disse ou de que conversa veio, quando, e o trecho original); linha sem origem não entra. **Fato e opinião ficam separados**: "disse que é do Sampaio" é fato; "cliente difícil, só fecha se sentir que ganhou" é opinião e entra marcada como opinião, com autor e data. Opinião é bem-vinda, porque é o que ajuda quem vai atender. O vendedor e o dono podem apagar ou corrigir qualquer linha.

### Mapa, regiões e concorrentes

- Localização da loja e de cada cliente, preenchida pelo endereço do ERP e corrigida no celular (arrastando o pino ou com "estou aqui"). Cada localização sabe se é automática ou confirmada, por quem e quando.
- Regiões: polígonos com nome, desenhados pelo dono no mapa. O cliente pertence à região que contém o ponto dele; fora de todas, fica "sem região".
- Concorrentes: nome, localização e observação, cadastrados pelo dono. Para cada cliente, o concorrente mais próximo e a distância; para cada região, quantos concorrentes há dentro.
- Mapa com filtros que combinam indicadores: curva ABC, RFV, atividade (ativo, atrasado, sumido, lead), vendedor, região e mês. Tocar no ponto abre o dossiê.
- Leitura por região: ativos, atrasados, sumidos, leads, concorrentes, realizado do mês, margem, e a classificação da região como **nossa**, **disputada** ou **vazia**. **Lacuna** é região vazia com leads, ou cliente ativo sozinho na região dele.
- O dono e a gerente veem tudo; o vendedor vê a carteira dele.

### Entregas

- Perfil de entregador, só no celular. Ele monta a **viagem**: escolhe as vendas do dia que vão sair, põe em ordem na mão e sai. Cada parada abre a localização no Google Maps ou no Waze; o app não desenha rota nem calcula a melhor ordem.
- Cada parada termina em **entregue** ou **não entregue**, com um motivo curto (ausente, endereço errado, recusou). A viagem fecha quando todas as paradas foram marcadas.
- Indicadores: entregas por viagem, viagens por dia, parte das vendas que é entrega, **custo por entrega** (a partir do custo por viagem que o dono digita), margem por região já descontado o custo de entrega, **densidade** por região.

### Perfis de acesso

- **Dono** vê tudo e digita metas, saldo, feriados, carteira, regiões, concorrentes e custo por viagem.
- **Gerente** vê a loja inteira e a lista do dia de todos os vendedores; não digita metas nem saldo.
- **Vendedor** vê a carteira dele: lista do dia, dossiês, mapa da carteira, tarefas e anotações.
- **Entregador** vê só a tela de viagens.
- Ninguém se cadastra sozinho.

## Fases

Cada fase é um subprojeto com spec, plano e execução próprios. Uma fase não começa antes de a anterior fechar. **A primeira entrega usável é só para o dono**; gerente e vendedor entram na Fase 7, o entregador na Fase 11. Toda fase que constrói tela só fecha quando as telas passam na lista de checagem visual da Fase 5a nos formatos em que existem.

### Fase 1 — Spike da API

Pergunta de viabilidade, resultado é um relatório, não código de produto. Responder, com a API real:

- Que entidades os endpoints entregam para vendas (documento, itens, pagamentos, vendedor, cancelamento, devolução), estoque (foto por local, histórico) e financeiro (a pagar pendentes, liquidadas, DRE).
- O que só existe pelo `consulta/sql`: fechamento de caixa por turno e por forma (calculado, informado, recontado), sangria e suprimento, contas liquidadas. Descobrir as tabelas.
- Os valores de `status` de documento, os tipos de pagamento e como se distingue venda de outros documentos.
- Como identificar um documento alterado depois de lido (o PDV funciona offline; a venda pode chegar depois).
- Como se comportam o limite de 20 requisições por minuto e as páginas de 50.
- Como o cadastro do produto guarda o código do ERP anterior (é o próprio código do produto, não a referência da variação; ver `docs/FONTES.md`) e o cliente o CPF/CNPJ.

Os cadastros migraram em 24/09; documentos de verdade só existem a partir de 28/09 (os de 24 a 26/09 são a importação e os testes do dono). O que depender de documento real se responde a partir de 28/09.

**Pronto quando:** existe um relatório em `docs/` com três listas — o que a API entrega, o que só o SQL entrega, o que não existe em lugar nenhum — e cada indicador do destino aponta para uma das três.

### Fase 2 — Esquema próprio e tradutor da API

Desenhar o esquema próprio a partir do destino, com a origem de cada coluna nas duas fontes escrita ao lado. Construir o tradutor da API: incremental, relê uma janela de dias, pode rodar duas vezes sem duplicar, guarda de onde veio cada linha.

**Pronto quando:** as vendas, o estoque e o a pagar desde 28/09 estão no esquema próprio, atualizados de hora em hora na VPS, com registro de cada execução e aviso quando falha.

### Fase 3 — Tradutor do ERP anterior

Levar de abril a 25/09/2026 da cópia final da Link (esquema `erp`) para o esquema próprio. Produto ligado pelo código antigo, que é o próprio código do produto no cadastro novo; cliente pelo CPF/CNPJ; vendedor pelo nome. Onde a ligação falhar, tabela de-para.

Como a Link guardava venda, cancelamento, devolução e arredondamento está documentado no repositório anterior, em `C:\Projetos\prumo\docs\DICIONARIO.md` — leitura de referência, nada se copia.

**Pronto quando:** a história de abril a 25/09 está no esquema próprio, ligada ao cadastro novo, e uma venda de junho e uma de outubro têm a mesma forma.

### Fase 4 — Indicadores e rotina

As regras das três perguntas sobre o esquema próprio; a rotina que as calcula de hora em hora e grava o resultado; o aviso ao dono quando a rotina falha.

**Pronto quando:** as três perguntas têm resposta calculada na VPS para hoje e para qualquer dia passado desde abril.

### Fase 5a — Desenho do app

Antes de qualquer tela em Flutter, desenhar o app inteiro — o das três perguntas e o que vem nas Fases 6 a 12 — para que ele nasça coeso. Buscar referências na internet de apps de gestão e de painéis para celular; escolher um sistema de design (cores, tipografia, espaçamento, componentes do Material 3) e escrevê-lo em `docs/app/DESIGN.md`; escrever `docs/app/TELAS.md` com cada tela: para que serve, para quem, o que mostra, de onde vem cada número (qual indicador da Fase 4, ou de qual fase posterior), o que acontece em cada toque, e o estado vazio, de carregando e de erro. Cada tela ganha duas imagens em `docs/app/telas/`: a compacta (celular) e a expandida (computador), com o layout reorganizado para cada uso, não só redimensionado; as telas do entregador só têm a compacta. Navegação: para o dono, tela inicial com as três perguntas; cada uma abre o desvio; cada desvio abre o detalhe. Para o vendedor, tela inicial com a lista do dia; cada nome abre o dossiê. Nada a mais de três toques. Quem usa não sabe o que há por trás: os números vêm com unidade, comparação e cor só para estado.

**Pronto quando:** cada item do "Destino completo" tem uma tela ou um lugar numa tela; cada número de cada tela aponta para um indicador; `DESIGN.md`, `TELAS.md` e as imagens de cada tela existem; e há uma lista de checagem visual de até 15 itens, com os itens próprios de cada formato, que o auditor visual usa nas fases seguintes.

### Fase 5b — API e app do dono

Autenticação pelo Firebase (entra quem estiver cadastrado; o dono cadastra no console do Firebase; ninguém se cadastra sozinho); API que entrega os indicadores e recebe o que se digita; app Flutter construído a partir de `docs/app/`, com as telas das três perguntas, meta → desvio → detalhe.

**Pronto quando:** o dono abre o app no celular e responde as três perguntas em menos de um minuto, e faz o mesmo no computador; cada tela construída passa na lista de checagem visual da Fase 5a nos dois formatos, com as duas capturas guardadas em `docs/fases/`.

### Fase 6 — Vigia, notificação e briefing

Réguas por indicador, notificação push com frase, briefing semanal, interpretação por IA sobre os números prontos.

**Pronto quando:** cada indicador tem régua cadastrável no app; o dono recebeu no celular uma notificação real de régua cruzada e um briefing de segunda-feira; a interpretação por IA escreve sobre números já gravados e nunca calcula.

### Fase 7 — Carteira, perfis de acesso e copiloto

Gerente e vendedor entram no app. O dono cadastra a carteira (cliente → vendedor); cliente sem vendedor fica "sem carteira" e aparece para a gerente. Tarefas e anotações por cliente, escritas pelo vendedor no celular. Filtro por perfil: dono vê tudo, gerente vê a loja, vendedor vê o seu. O tradutor da API passa a ler os leads do CRM (`/api/lead/v1`) e os endereços dos clientes.

**Pronto quando:** Igor e Daniele entram com o próprio login e cada um vê só a própria carteira; uma tarefa e uma anotação criadas por um deles no celular aparecem para o dono; a gerente vê as duas carteiras e os clientes sem carteira; os leads do CRM estão no esquema próprio.

### Fase 8 — Lista do dia, painel de relacionamento e dossiê

As regras de relacionamento sobre o esquema próprio (atrasado, sumido, orçamento parado, compra incompleta, ativo, retenção, novo, margem, RFV, ABC de clientes), calculadas pela mesma rotina de hora em hora. A lista do dia por vendedor, com "falei". O dossiê do cliente com a camada dura. O painel da gerência: ativos, retenção, novos (e quantos vieram de lead), ticket, itens por venda e margem, por loja e por vendedor, mês contra mês. Leads por bairro: quantos, contatados, convertidos.

**Pronto quando:** um vendedor abre o app de manhã e vê até 10 nomes, cada um com motivo; marca um como "falei" e ele some por 7 dias; toca num nome e lê o dossiê; o dono vê a retenção de setembro contra agosto e a margem por vendedor; a lista do dia de uma data passada é reproduzível.

### Fase 9 — Geolocalização

Localização da loja e de cada cliente, guardada no Kaizen: preenchida pelo endereço do ERP (Nominatim), com o grau de certeza, e corrigida no app (arrastando o pino ou com "estou aqui", pelo GPS do celular). Cada localização sabe se é automática ou confirmada, por quem e quando. Distância de cada cliente até a loja. Cliente sem endereço suficiente entra numa lista para o vendedor completar. As localizações coletadas nas visitas entram por essa mesma tela.

**Pronto quando:** todo cliente ativo tem localização, com origem e data; o dono vê a lista dos que só têm a automática; um vendedor confirmou uma localização pelo celular.

### Fase 10 — Regiões, concorrentes e mapa

O mapa no app. O dono desenha regiões e cadastra concorrentes. O cálculo: região de cada cliente, concorrente mais próximo e distância, contagens e realizado por região, classificação nossa / disputada / vazia, lacunas. Os filtros do mapa (ABC, RFV, atividade, vendedor, região, mês). A partir daqui o painel de relacionamento e os leads ganham o corte por região. O vendedor vê a carteira dele no mapa.

**Pronto quando:** o dono desenhou as regiões da cidade e cadastrou os concorrentes; cada cliente ativo tem uma região ou está marcado "sem região"; o mapa filtrado por "curva A e atrasado" mostra exatamente esses clientes; a lista de lacunas existe; o vendedor toca num ponto do mapa e abre o dossiê.

### Fase 11 — Entregas

Perfil de entregador. Tela de viagem: escolher as vendas do dia (e as de ontem que não saíram), ordenar na mão, abrir cada parada no Google Maps ou no Waze, marcar entregue ou não entregue com motivo, fechar a viagem. Registro de viagem (saída, chegada, entregador) e de parada (venda, cliente, resultado, hora). Custo por viagem digitado pelo dono. Indicadores de entrega e margem por região descontado o custo de entrega. O pedido do ERP tem campos de entrega (tipo de entrega, entregador, taxa, data): se a loja passar a preenchê-los no caixa, o tradutor lê; a viagem no Kaizen continua sendo o registro do que saiu de fato.

**Pronto quando:** Ribamar monta uma viagem no celular, sai, marca as paradas e fecha; no dia seguinte, o dono vê quantas entregas saíram por viagem e o custo por entrega; a margem de uma região aparece antes e depois do custo de entrega.

### Fase 12 — Dossiê por IA

A camada mole do dossiê. Entradas: depoimento do vendedor no app (texto, ou áudio transcrito) e, quando houver, conversas do WhatsApp recebidas por webhook. Como o WhatsApp chega ao Kaizen é decisão desta fase, dentro da arquitetura: nada com cota diária ou cartão. A IA lê a entrada e escreve linhas nos quatro blocos, cada uma com origem (autor ou conversa, data, trecho) e marcada como fato ou opinião; linha sem trecho de origem é descartada. O vendedor e o dono veem, apagam e corrigem. A camada mole aparece no dossiê, abaixo da camada dura.

**Pronto quando:** um depoimento de vendedor sobre um cliente virou linhas nos blocos certos, com origem, e uma linha sem trecho de origem não entrou; o dono abriu o dossiê e apagou uma linha; nenhum indicador depende do que a IA escreveu.

## Qualidade

- **O critério do projeto é bater com o ERP.** Quem confere é o dono, com os relatórios do ERP, depois de cada fase, fora do fluxo de quem implementa. Quem implementa não pede relatório do ERP e não para para isso. Divergência encontrada volta como bug, com o número esperado e o número obtido.
- **Não complicar.** Se uma solução precisa de uma exceção para funcionar, ela provavelmente está errada. Menos peças, menos regras, menos dependências.
- **O dono não lê código.** Planos, relatórios e mensagens de commit explicam por números e resultados.