# Kaizen — objetivo

Este documento diz **onde o projeto quer chegar** e **em que ordem**. Como chegar é decisão de quem implementa, fase a fase, no brainstorming de cada uma. Leia `docs/LOJA.md` para entender o negócio e o que cada número significa, e `docs/api/` para a API do ERP.

## Para que existe

Israel comprou em setembro de 2026 uma loja de ferragens e acessórios para marceneiros em São Luís (MA). Ele não fica na loja: gerencia à distância, acompanhando números e se reunindo com a equipe que designou.

O Kaizen é o app que torna isso possível. Todo dia, em menos de um minuto, ele responde:

1. **Vendas** — como está o desempenho em relação à meta?
2. **Compras** — estou comprando o que gira ou o que encalha?
3. **Financeiro** — tenho dinheiro para pagar as contas?

O modelo é **gestão por exceção**: meta → desvio → detalhe. Quando algo sai do lugar, o app avisa; quando está tudo bem, ele fica quieto.

## O que não faz

O Kaizen **não vende, não compra e não lança nada no ERP**. A operação inteira continua no ERP. A única coisa que o dono digita no Kaizen é o saldo do banco, porque o ERP não o mantém.

## Arquitetura decidida

Estas decisões já foram tomadas e não se reabrem sem conversa com o dono.

- **Fonte de dados a partir de 28/09/2026, início da operação real: Meu ERP Online**, pela API pública (`docs/api/swagger.json`, `docs/api/GUIA_CLAUDE_CODE.md`). O token dá leitura e escrita; o Kaizen usa **somente leitura por construção**: só chamadas GET e o endpoint `consulta/sql`, que a própria API limita a SELECT.
- **Fonte de dados de abril a 25/09/2026, último dia de venda na Link: o ERP anterior (Link)**, cuja cópia final, tirada depois desse dia, fica no Postgres da VPS, esquema `erp`. Não muda mais.
- **Banco próprio**, Postgres na VPS (o mesmo da stack `prumo`, já no ar), com **esquema próprio desenhado pelas três perguntas**, não por nenhum dos dois ERPs. Só o que os indicadores precisam. Cada linha sabe de qual fonte veio e qual era o registro de origem.
- **Um tradutor por fonte** alimenta o esquema próprio. Tradutor traduz fato e copia número; não decide regra nem recalcula. As regras (o que é venda válida, como corta a curva ABC) vivem num lugar só, sobre o esquema próprio.
- **Rotina na VPS** calcula os indicadores de hora em hora, de segunda a sábado, e grava o resultado pronto. **Ela avisa o dono quando falha.**
- **API pequena na VPS** entrega o resultado ao app e recebe o saldo do banco.
- **App Flutter** exibe. Material 3, `fl_chart` para gráficos. Não calcula nada.
- **Firebase só para autenticação** (Google e e-mail/senha) **e notificação push**. Plano gratuito. Nenhum serviço com cota diária ou cartão de crédito entra no projeto.
- **Servidor em TypeScript** (tradutores, rotina, API), como a VPS já roda.
- **Dois ambientes**: local (Postgres em Docker no PC) e VPS (Docker Swarm, stack `prumo`, segredos do Swarm para senhas e token).
- Fuso horário `America/Fortaleza`. Textos, commits, testes e relatórios em português.

## Destino completo

Tudo abaixo faz parte do projeto. As fases dizem a ordem; nada aqui é "talvez depois".

### Vendas

- Meta mensal da loja e meta por vendedor, cadastradas no Kaizen.
- Realizado do dia, do mês e projeção do mês pela média por dia da semana.
- Ritmo por vendedor: realizado ÷ meta × fração de dias úteis decorridos.
- Ticket médio, itens por venda, vendas por hora e por dia da semana.
- Carteira de clientes: curva ABC de clientes, RFV (recência, frequência, valor), clientes que pararam de comprar, distribuição por região.
- Vendedor: venda por vendedor, mix vendido, clientes atendidos.

### Compras e estoque

- Curva ABC de produtos por valor e por quantidade, no período.
- Giro e cobertura de estoque por produto, grupo, marca e fornecedor.
- Encalhe: produto com estoque e sem venda há 90 dias, com carência para produto novo.
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

### Copiloto do vendedor

- Tarefas e anotações por cliente, para o vendedor no celular.
- Geolocalização dos clientes, preenchida por endereço e corrigida pelo vendedor.
- Perfis: dono vê tudo; gerente vê a loja; vendedor vê o seu.

## Fases

Cada fase é um subprojeto com spec, plano e execução próprios. Uma fase não começa antes de a anterior fechar. **A primeira entrega usável é só para o dono**; gerente e vendedor entram na fase 7.

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

### Fase 5 — API e app do dono

Autenticação pelo Firebase (entra quem estiver cadastrado; ninguém se cadastra sozinho); API que entrega os indicadores e recebe o saldo do banco; app Flutter com as três perguntas, meta → desvio → detalhe.

**Pronto quando:** o dono abre o app no celular e responde as três perguntas em menos de um minuto.

### Fase 6 — Vigia, notificação e briefing

Réguas por indicador, notificação push com frase, briefing semanal, interpretação por IA sobre os números prontos.

### Fase 7 — Carteira, copiloto e perfis

Carteira de clientes, tarefas e anotações, geolocalização, perfis de gerente e vendedor.

## Qualidade

- **O critério do projeto é bater com o ERP.** Quem confere é o dono, com os relatórios do ERP, depois de cada fase, fora do fluxo de quem implementa. Quem implementa não pede relatório do ERP e não para para isso. Divergência encontrada volta como bug, com o número esperado e o número obtido.
- **Não complicar.** Se uma solução precisa de uma exceção para funcionar, ela provavelmente está errada. Menos peças, menos regras, menos dependências.
- **O dono não lê código.** Planos, relatórios e mensagens de commit explicam por números e resultados.
