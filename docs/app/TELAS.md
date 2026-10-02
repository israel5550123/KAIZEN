# Kaizen — as telas do app

## 1. Para que serve e como usar

Esta é a lista de todas as telas do Kaizen, na ordem em que serão desenhadas. Ela nasce do `OBJETIVO.md` e das decisões do dono de 02/10/2026 (`docs/DECISOES.md`), sem nada do desenho anterior, que foi descartado.

- **Primeiro o Design System**, no Claude Design, com o que pede a seção 5 (o prompt pronto está em `docs/app/prompts/00-design-system.md`).
- **Depois as telas, uma por vez**, na ordem da seção 6. Para cada uma, peça ao Claude Code o prompt pelo código ("prompt da I1"); o prompt sai da seção 7.
- **Cada tela aprovada** fica guardada no repositório: o HTML e uma imagem por formato em que a tela existe (1920 × 1080; e 390 px nas telas do dono no celular e no E1). É a base da construção na Fase 5b e nas seguintes.

Os valores em R$ citados nas telas abaixo são só ilustração; os prompts usam um conjunto único de dados de exemplo, o do prompt 00, para os números baterem de uma tela para outra.

Cada tela é desenhada inteira na primeira vez, com os blocos de fases futuras marcados pela fase, para o app nascer coeso. Tudo aqui é proposta para o senhor ajustar no desenho; a marca "(proposta)" fica só onde muda o que se constrói: o que existe ou não no celular, recurso que o OBJETIVO não pede e o que tem pergunta na seção 9.

## 2. Premissas e regras de todas as telas

### Premissas (decisões do dono de 02/10/2026, valem acima do OBJETIVO)

- **App web** (HTML, CSS e JavaScript), hospedado na VPS. As telas são desenhadas pelo dono no Claude Design, uma por vez, depois do Design System.
- **Computador primeiro.** O uso principal é em monitores de 1920 × 1080. O celular é auxílio e só o dono usa o app nele; gerente e vendedores usam só o computador; o entregador tem uma tela própria no celular. Quais telas do dono existem no celular é proposta (seção 3).
- **Nenhuma coleta de localização.** O app não pede a localização do telefone nem tem botão de marcar onde a pessoa está. A latitude e a longitude do cliente são pedidas a ele pelo WhatsApp e digitadas no app, em campos próprios; a loja e os concorrentes também ganham ponto por coordenada digitada. Nenhuma coordenada sai do endereço automaticamente (provisório, DECISOES de 02/10).
- **O mapa é só para ver.** Mostra clientes, loja e concorrentes sobre o mapa do OpenStreetMap, sem chave nem cartão; Google Maps e Waze só como link para fora (E1). Não se desenham regiões nem se move ponto no mapa. Onde o OBJETIVO diz "região", este documento usa o **bairro do endereço do cliente no ERP**: proposta provisória, **a confirmar com o dono** (pergunta 1). Todo corte "por bairro" que substitui "por região" leva na tela o selo "Bairro no lugar da região (provisório)".
- **Avisos só pelo Telegram** (régua cruzada, briefing, falha na atualização dos números). Não há notificação no app.
- **Login** com Google ou e-mail e senha (Firebase), mantido por enquanto. Ninguém se cadastra sozinho.
- **Entregador:** uma tela bem simples, com a lista de clientes para entregar, que ele ordena; ao clicar, abre a localização do cliente no Google Maps ou no Waze. O resto (entregue, não entregue, fechar viagem, custo) é proposta a confirmar.
- **Fases:** a 5b é só do dono, com as telas das três perguntas; a 6 traz as réguas; gerente e vendedor entram na 7; o entregador na 11.

### Regras que valem para todas as telas (não se repetem nas seções das telas)

- **Gestão por exceção:** meta → desvio → detalhe. Tudo no lugar: a tela fica quieta, com uma frase curta e sem cor. Algo fora: a frase diz o quê, com nomes.
- **A tela não calcula.** Todo número, diferença, soma, percentual e estado chega pronto do servidor. De onde vem cada número está na seção 8, para quem constrói.
- **Número sempre com unidade e comparação:** contra a meta, o mês anterior, 7 ou 30 dias antes. Nunca um número solto.
- **Cor só para estado.** Dois estados, **atenção** e **fora**, sempre com ícone e palavra. Há cor só quando o número cruza uma régua (até a Fase 6, o limite provisório da pergunta 5). O que está no lugar fica neutro. A situação do cliente (em dia, atrasado, sumido), o motivo da lista do dia, a classe ABC e as linhas de gráfico nunca usam cor de estado; no mapa, a situação se diferencia pela forma ou pelo tom de cinza.
- **Nada a mais de três cliques**, contados a partir do Início ou do menu, até o detalhe.
- **Linguagem da loja, sem jargão:** realizado, folga, encalhe, ritmo. Cada número mostra a definição curta ao passar o mouse.
- **Para o vendedor, a exceção é uma lista curta de nomes**, nunca percentual. A tendência vem em palavras e R$ ("comprando menos: R$ 1.240 nos últimos 90 dias contra R$ 2.100 nos 90 anteriores"); a curva ABC de clientes, só com contagem e R$.
- **Consumidor Final (999007) nunca aparece** em número por cliente nem em lista de clientes.
- **"Atualizado às 14h05"** em toda tela com número. Se a última atualização falhou ou atrasou, faixa amarela: "Os números são das 13h05: a atualização das 14h falhou. O aviso foi pelo Telegram."
- **Dia passado só nas telas das três perguntas.** O seletor de dia da barra de cima aparece só em I1, V1–V3, C1–C3 e F1–F4; ali, escolher um dia mostra a resposta gravada daquele dia, com a faixa "Você está vendo terça, 15/09/2026" e "Voltar para hoje". As outras telas mostram hoje, ou têm seletor próprio de mês ou de data, dito na tela.
- **Estados padrão:** carregando = a moldura aparece na hora e os blocos em cinza, nunca um zero provisório; erro = "Não foi possível buscar os números" e "Tentar de novo", com a moldura no lugar; sem conexão = faixa cinza com a hora dos números que estão na tela. Cada tela diz só o seu vazio e os estados próprios.
- **Formulários:** o servidor confere e grava; se a gravação falha, o que foi digitado fica nos campos; quem mudou e quando fica registrado.
- **Nada deste app escreve no ERP.**

## 3. Perfis

| Perfil | Onde usa | O que vê | Porta de entrada | Desde a fase |
| --- | --- | --- | --- | --- |
| Dono | computador (principal) e celular (auxílio) | tudo, menos E1; só ele digita saldo, metas, feriados, carteira, concorrentes e custo por viagem, e só ele vê Cadastros | I1 | 5b |
| Gerente | só computador | a loja inteira e a lista do dia de todos os vendedores; não digita metas nem saldo (OBJETIVO) | I1 (ou R4 da equipe a partir da Fase 8: pergunta 20) | 7 |
| Vendedor | só computador | só a carteira dele: R4, R1 ("Minha carteira"), R2, R3, M2 e M1 | R1 na Fase 7; R4 a partir da 8 | 7 (R4 na 8, M1 na 9, M2 na 10) |
| Entregador | só celular | E1, e nada mais | E1 | 11 |

- **No celular do dono (proposta):** G2, G1, I1, V1, V2, C1, C3, F1, F2, F3 (só o dia), K1, R1 (lista simples), R2 (só para ver), R5. Só no computador: V3, C2, F4, K2, A1, P1, R3, R4, R6, R7, M1 a M4, E2. No celular, o que leva a uma tela só de computador não é clicável.

## 4. Navegação

### No computador (moldura G2)

- **Barra de cima:** marca à esquerda; no centro, o seletor de dia "‹ Hoje · sexta, 02/10/2026 ›" (só nas telas das três perguntas) e, a partir da Fase 7, a busca de cliente (nome, código ou telefone → R2); à direita, "Atualizado às 14h05 · próxima às 15h" e a conta (nome, perfil, Sair).
- **Faixa de aviso** logo abaixo, só quando há o que dizer (desatualizado, dia passado, sem conexão, loja fechada no dia).
- **Menu lateral fixo**, com ícone e nome, agrupado. No app, cada item aparece só na fase dele, sem "em breve"; no desenho, o menu mostra todos. Os detalhes (V2, C3, R2) não estão no menu: abrem por clique. Quem vê cada item está no inventário (seção 6).

| Grupo do menu | Itens (código) | Aparece na fase |
| --- | --- | --- |
| Início | Início (I1) | 5b |
| Vendas | O desvio (V1), Padrões de venda (V3) | 5b |
| Compras | O desvio (C1), Estoque e giro (C2) | 5b |
| Financeiro | O desvio (F1), Contas a pagar (F2), Caixa (F3), Fluxo realizado (F4) | 5b |
| Relacionamento | Lista do dia (R4), Painel (R5), Clientes (R1), Tarefas (R3), Margem (R6), Leads (R7) | R1 e R3 na 7; o resto na 8 |
| Mapa | Mapa (M2), Por bairro (M3), Localizações (M1), Concorrentes (M4) | M1 na 9; o resto na 10 |
| Entregas | Entregas (E2) | 11 |
| Cadastros (só dono) | Saldo do banco (K1), Metas e feriados (K2), Réguas e avisos (A1), Pessoas e acesso (P1) | K1 e K2 na 5b; A1 na 6; P1 na 7 |

### No celular do dono

- Barra de cima compacta: o dia (tocar abre o calendário numa folha que sobe de baixo) e a hora da atualização; a mesma faixa de aviso.
- Barra de baixo: Início, Vendas, Compras, Financeiro e, a partir da Fase 8, Relacionamento (abre R5). Sem Cadastros; o Saldo do banco (K1) abre a partir do F1. Sem atalhos de teclado.

### O caminho meta → desvio → detalhe

- Vendas: I1 → V1 → V2. Compras: I1 → C1 → C2 → C3. Financeiro: I1 → F1 → F2 ou F3.
- Vendedor: R4 → R2, aberto ao lado da lista. Gerência: R5 → R1 → R2.
- Mensagem do Telegram (régua cruzada): o link abre a tela da régua: V1, C1 ou F1; nas réguas da Fase 8, R5 ou R4; nas da Fase 11, E2.

| Pergunta do dia a dia | Caminho | Cliques |
| --- | --- | --- |
| Por que vendas está fora da meta? | I1 → V1 | 1 |
| Quem está fora do ritmo e o que vende? | I1 → nome do vendedor → V2 | 1 |
| Que produtos estão encalhados? | I1 → encalhe → C2 (visão Encalhe) | 1 |
| Por que este produto encalhou? | I1 → encalhe → produto → C3 | 2 |
| O que vence esta semana? | I1 → "Ver o desvio" do Financeiro → folga em 7 dias → F2 | 2 |
| O caixa fechou certo? | I1 → quebra → F3 | 1 |
| Digitar o saldo do banco | I1 → "Digitar saldo" → K1 | 1 |
| Cadastrar a meta do mês | menu → K2 | 1 |
| Com quem eu falo hoje? (vendedor) | R4, a porta dele → nome → R2 | 1 |
| Quem não voltou a comprar? (gerência) | menu → R5 → Retenção → R1 → nome → R2 | 3 |
| Onde estão as lacunas? | menu → M3 → lacuna → cliente → R2 | 3 |
| Levar a entrega (entregador) | E1 → cliente → Waze | 2 |

## 5. O que o Design System precisa ter

Monte isto no Claude Design antes da primeira tela. As regras visuais da seção 2 (cor, número com unidade e comparação, "Atualizado às", estados padrão) e os formatos abaixo entram no Design System, para o Claude Design aplicá-los sozinho; os prompts das telas não os repetem.

### Princípios visuais

- Sóbrio, fundo claro, uma família de letra sem serifa (sugestão: Inter ou IBM Plex Sans), ícones de traço simples (sugestão: Lucide), hierarquia pelo tamanho e pelo peso, não pela cor.
- **Uma cor de destaque** (sugestão: azul-petróleo) para ações, para o item ativo do menu e para o contorno do campo com foco do teclado. Ela não é cor de estado.
- **Cor só para estado, com dois estados:** atenção (âmbar) e fora (vermelho), sempre com ícone e palavra ("Atenção", "Fora"), nunca só a cor. O que está no lugar fica neutro (cinza-escuro), no máximo com um ícone discreto.
- **Algarismos tabulares** (todos os algarismos com a mesma largura, para alinhar em coluna) em todo número; números alinhados à direita nas tabelas.
- **Tamanho e densidade (proposta):** texto corrido de 15 a 16 px; nada abaixo de 13 px no computador e de 14 px no celular; números principais de 28 a 40 px; linha de tabela de uns 36 px no computador (C2, R1 e M3 dependem disso). Alvos de toque no celular com pelo menos 44 px.
- **Definição de cada número:** no computador, ao passar o mouse; no celular, ao tocar no ícone "i" ao lado do número.

### Formatos em português do Brasil

- Dinheiro: R$ 1.234,56 em tabelas e detalhes; R$ 81,4 mil (e R$ 1,2 mi) em cartões e painéis; negativo com sinal de menos: −R$ 2.400,00.
- Percentual com uma casa (93,4%); ritmo com duas (0,93); distância com uma (3,2 km).
- Datas 21/10/2026 (ou 21/10 quando o ano é óbvio); com o dia da semana: "sexta, 02/10/2026". Horas 14h05, ou 14h na hora cheia.
- Quantidade sempre com a unidade: 212 produtos, 8 entregas, 12 dias, 3 parcelas.

### Larguras

- **Computador, 1920 × 1080 (principal):** menu de uns 240 px; conteúdo de até uns 1600 px, centralizado em telas maiores, sem esticar; texto corrido com no máximo uns 720 px de largura; tabelas podem usar a largura toda. I1 e F1 cabem sem rolar (cerca de 950 px de altura úteis no navegador). Nunca rolagem para o lado.
- **Celular, 390 px de largura (dono e entregador):** uma coluna, 16 px de margem, botões da largura da tela.

### Componentes que entram no Design System

- **Moldura e menu lateral:** grupos, ícone e nome, item ativo destacado.
- **Barra de cima:** marca, seletor de dia com ‹ ›, busca de cliente, "Atualizado às", conta; versão compacta e barra de baixo no celular.
- **Calendário do mês:** domingos e dias sem expediente marcados; antes de 01/04/2026 e dias futuros, desligados.
- **Faixa de aviso geral:** desatualizado (atenção), dia passado (neutra, com "Voltar para hoje"), sem conexão (cinza), loja fechada.
- **Marca de estado:** ícone + palavra, nas versões neutra, atenção e fora, e "sem dado".
- **Cartão de pergunta:** a pergunta, a marca de estado, a frase-resumo, os números principais e uma linha de exceção; o título e o rodapé "Ver o desvio ›" abrem o desvio, e os itens de dentro são links próprios.
- **Frase-resumo:** uma frase com números e nomes, que chega pronta do servidor.
- **Número grande com unidade e comparação:** valor, "contra…" e a diferença, com a conta escrita embaixo quando ajuda (folga).
- **Linha de indicador com barra de meta:** realizado, meta, % e a marca de onde deveria estar pelo ritmo.
- **Barra dividida em partes:** um todo em partes (A, B, C, sem venda), com contagem e parte de cada uma.
- **Tabela com cabeçalho que ordena:** cabeçalho fixo, linha clicável, linha de totais, números à direita, botão "Colunas" para mostrar as que não cabem.
- **Lista de exceções:** nomes curtos com o número ao lado ("Daniele 0,81"), clicáveis.
- **Lista-detalhe:** lista ou tabela à esquerda e painel do item à direita, sem sair da tela.
- **Abas e visões prontas** com a contagem em cada uma; **filtros combináveis** (caixas de escolha, "Limpar filtros", contagem do recorte); **busca** por nome, código ou telefone.
- **Formulário curto em diálogo ou painel lateral:** campos, Salvar, Cancelar, mensagem no próprio campo, pedido de confirmação; **campo de dinheiro e campo de data**, no formato brasileiro.
- **Gráficos só de barra e de linha:** barras por dia, hora ou grupo; linha acumulada com meta e projeção pontilhada; linha de saldo com o zero. Linhas neutras; cor só no ponto fora.
- **Estados vazio, carregando e erro:** blocos em cinza; frase de vazio com a ação; erro com "Tentar de novo".
- **Bloco "O que isso significa" (IA):** até 3 frases, a linha "escrito pela IA sobre os números das 8h", separado dos números; estado "texto da IA indisponível agora".
- **Dica de definição** de cada número; **botões:** um principal por tela, secundário e de texto; link para fora (WhatsApp, Google Maps, Waze) com ícone de saída; no celular, **folha que sobe de baixo**.

### Componentes que nascem com a tela

- Cartão de cliente da lista do dia (nome, telefone, motivo, frase do que fazer, valor em risco, "Falei") → R4.
- Linha do tempo de anotações e bloco da camada mole (título próprio, marca Fato ou Opinião, origem, "ver trecho") → R2.
- Tarefa (o que fazer, prazo, responsável, Concluir, Adiar) → R3.
- Pontos do mapa → M2: loja e concorrente com formas próprias; cliente em dia, atrasado e sumido por forma ou tom de cinza, sem cor de estado; lead com contorno; pontos juntos num círculo com o número; legenda com contagem.
- Campo de coordenada com mapa de conferência (colar "latitude, longitude", os dois campos, mapa pequeno com o ponto e a loja; o aviso de ponto longe vem do servidor) → M1.
- Linha grande arrastável → E1.

### Página de amostra

Peça ao Claude Design uma página do Design System com dados reais de exemplo (Igor, Daniele, R$ 48.000,00): a moldura vazia; o cartão de pergunta nos três estados (no lugar, atenção, fora); uma tabela de 5 linhas com totais; um formulário em painel; as faixas de aviso.

### Lista de checagem visual

Toda tela, no desenho e depois na construção, passa por estes itens nos formatos em que existe; o auditor usa a lista nas fases seguintes.

1. Número com unidade e comparação.
2. Cor só para estado, sempre com ícone e palavra.
3. Nenhum número calculado na tela.
4. "Atualizado às" visível.
5. Estados vazio, carregando e erro desenhados.
6. Até 3 cliques até o detalhe.
7. Consumidor Final fora de número por cliente.
8. Algarismos tabulares, números alinhados à direita.
9. Letra de pelo menos 13 px no computador e 14 px no celular.
10. No computador, I1 e F1 sem rolar, e nada de rolagem para o lado.
11. No celular, uma coluna e alvos de pelo menos 44 px.
12. Item de fase futura não aparece no app.
13. Linguagem da loja, com a definição ao passar o mouse.
14. Vendedor não vê percentual.
15. Bloco da IA separado dos números.

## 6. Inventário em ordem de prioridade

Primeiro o Design System; depois tudo o que a Fase 5b constrói: a moldura, a entrada, o Início, as três perguntas do desvio ao detalhe, os cadastros do dono e, por último, as duas análises (V3 e F4). Depois os blocos da Fase 6 em diante: réguas, relacionamento, mapa, entregas. Dentro de cada bloco, primeiro a tela que as outras reaproveitam (R4 antes de R2, que abre ao lado dele; M2 antes de M1, que usa os pontos dele), mesmo quando a fase de construção é outra. A Fase 12 não cria tela: acrescenta a camada mole ao R2.

| Ordem | Código | Tela | Quem vê | Computador / celular | Fase |
| --- | --- | --- | --- | --- | --- |
| 0 | DS | Design System (seção 5) | — | os dois | 5b |
| 1 | G2 | Moldura (menu, barra, calendário e avisos) | todos, menos o entregador | os dois (celular só do dono) | 5b |
| 2 | G1 | Entrar | todos | os dois | 5b |
| 3 | I1 | Início (as três perguntas) | dono; gerente na 7 | os dois | 5b |
| 4 | V1 | Vendas: o desvio | dono; gerente na 7 | os dois | 5b |
| 5 | V2 | Detalhe do vendedor | dono; gerente na 7 | os dois | 5b |
| 6 | C1 | Compras: o desvio | dono; gerente na 7 | os dois | 5b |
| 7 | C2 | Estoque e giro | dono; gerente na 7 | só computador | 5b |
| 8 | C3 | Detalhe do produto | dono; gerente na 7 | os dois | 5b |
| 9 | F1 | Financeiro: o desvio | dono; gerente na 7, sem digitar saldo | os dois | 5b |
| 10 | F2 | Contas a pagar e previsão | dono; gerente na 7 | os dois | 5b |
| 11 | K1 | Saldo do banco | dono | os dois | 5b |
| 12 | F3 | Caixa da loja | dono; gerente na 7 | os dois (celular só o dia) | 5b |
| 13 | K2 | Metas e feriados | dono | só computador | 5b |
| 14 | V3 | Padrões de venda | dono; gerente na 7 | só computador | 5b |
| 15 | F4 | Fluxo de caixa realizado | dono; gerente na 7 | só computador | 5b |
| 16 | A1 | Réguas e avisos | dono | só computador | 6 |
| 17 | R4 | Lista do dia | vendedor, gerente, dono | só computador | 8 |
| 18 | R2 | Dossiê do cliente | dono, gerente, vendedor | os dois (celular: dono, só para ver) | 7 |
| 19 | R1 | Clientes (a carteira) | dono, gerente, vendedor | computador (celular: lista simples do dono) | 7 |
| 20 | R3 | Tarefas | dono, gerente, vendedor | só computador | 7 |
| 21 | P1 | Pessoas e acesso | dono | só computador | 7 |
| 22 | R5 | Painel de relacionamento | dono, gerente | os dois | 8 |
| 23 | R6 | Margem | dono, gerente | só computador | 8 |
| 24 | R7 | Leads | dono, gerente | só computador | 8 |
| 25 | M2 | Mapa | dono, gerente, vendedor | só computador | 10 |
| 26 | M1 | Localizações | dono, gerente, vendedor | só computador | 9 |
| 27 | M3 | Por bairro | dono, gerente | só computador | 10 |
| 28 | M4 | Concorrentes | dono; gerente só vê | só computador | 10 |
| 29 | E1 | Entregas do dia (entregador) | entregador | só celular | 11 |
| 30 | E2 | Entregas: painel do dono | dono; gerente só vê (proposta) | só computador | 11 |

E2 depende quase inteiro de proposta (viagens, entregue ou não entregue, custo): desenhar só depois da resposta à pergunta 38 e do detalhamento das entregas pelo dono. E1 pode ir antes, com a parte proposta marcada.

A Fase 6 também acrescenta o bloco "O que isso significa" em I1, V1, C1 e F1 (desenhado já com elas). As telas R1 e R2 nascem na 7 e ganham blocos nas Fases 8, 9, 10 e 12; C3 e V2 ganham blocos na 8.

## 7. As telas

### G2 · Moldura (menu, barra, calendário e avisos)

- **Para que serve:** a moldura de todas as telas: menu, dia escolhido, hora da atualização e os avisos que valem para o app inteiro. Desenhada uma vez, logo depois do Design System, porque é ela que o testa no tamanho real; as outras telas só preenchem o meio.
- **Quem vê:** todos, menos o entregador (E1 não tem moldura). O menu muda por perfil e por fase (seção 4); no desenho, mostra todos os grupos.
- **Onde:** computador; celular sim, para o dono: barra de cima compacta, barra de baixo, calendário numa folha que sobe de baixo, sem atalhos.
- **O que mostra:**
  - Barra de cima: marca; seletor "‹ Hoje · sexta, 02/10/2026 ›" (só nas telas das três perguntas); busca de cliente (Fase 7); "Atualizado às 14h05 · próxima às 15h"; conta (nome, perfil, Sair).
  - Faixa de aviso, só quando há o que dizer: desatualizado, dia passado, sem conexão, hoje ainda sem atualização, loja fechada no dia escolhido.
  - Menu lateral fixo (seção 4).
  - Calendário do mês: domingos e dias sem expediente marcados; antes de 01/04/2026 e depois de hoje, desligados.
- **Cliques:** item do menu → a tela, mantendo o dia; ‹ e › → dia anterior e seguinte (› desligado em hoje); data → calendário; "Voltar para hoje"; busca → R2; Sair → G1; "Tentar de novo" na faixa sem conexão. Atalhos: ← e → trocam o dia, 1, 2 e 3 abrem V1, C1 e F1, H volta para hoje.
- **Estados:** desatualizado (faixa amarela, sem botão de recalcular: o app não manda rodar nada); dia passado (faixa neutra "Você está vendo terça, 15/09/2026 · calculado em 01/10 às 22h04", seletor destacado); hoje sem atualização, antes das 8h ou no domingo (abre no último dia calculado, com "A primeira atualização de hoje é às 8h"); loja fechada no dia ("Loja fechada neste dia"; os números do mês continuam).

### G1 · Entrar

- **Para que serve:** a porta do app. Entra quem o dono cadastrou, e cada perfil cai na sua tela inicial. "Sem acesso" é um estado desta tela, não outra tela.
- **Quem vê:** todos, antes de entrar. Na 5b, só o dono passa daqui.
- **Onde:** computador e celular (dono e entregador). No celular, uma coluna com botões da largura da tela. Gerente ou vendedor no celular veem "O Kaizen da equipe é usado no computador" e não entram (decisão de 02/10); o entregador no computador vê "A sua tela é no celular".
- **O que mostra:**
  - Marca Kaizen e a linha "Vendas, compras e caixa da loja".
  - Botão "Entrar com Google"; separador "ou"; e-mail, senha, "Entrar" e "Esqueci a senha" (pergunta 4).
  - Rodapé fixo: "Acesso liberado pelo Israel. Não há cadastro por aqui."
- **Cliques:**
  - Entrar (Google, e-mail e senha, ou Enter) → tela inicial do perfil: dono I1; gerente I1 (Fase 7); vendedor R1 na Fase 7 e R4 a partir da 8; entregador E1 (Fase 11).
  - Esqueci a senha → pede o e-mail e diz "se este e-mail tiver acesso, o link chega em instantes".
  - Entrar com outra conta (no estado sem acesso) → volta ao formulário. Quem já entrou e não saiu abre direto na tela inicial.
- **Estados:** entrando (botão em espera, campos travados); senha errada ("E-mail ou senha não conferem", sem dizer qual, sem apagar o e-mail); conta sem acesso ("A conta x@gmail.com não tem acesso ao Kaizen. Peça ao Israel."); perfil cujas telas ainda não chegaram ("Seu acesso chega numa próxima etapa"); acesso bloqueado ("Seu acesso foi encerrado. Fale com o Israel."); acesso expirado ("Seu acesso expirou. Entre de novo."); servidor fora ("O Kaizen não respondeu. Tente de novo em alguns minutos.").

### I1 · Início (as três perguntas)

- **Para que serve:** responder as três perguntas do dia em menos de um minuto. Tudo no lugar: as colunas ficam quietas; algo fora: uma frase, com nomes.
- **Quem vê:** dono (5b); gerente a partir da Fase 7, igual, sem "Digitar saldo" e "Cadastrar meta". Vendedor não vê.
- **Onde:** computador, sem rolar: cabeçalho e bloco da IA no topo, três colunas iguais embaixo; celular sim: três cartões empilhados (estado, número principal e uma linha de exceção); a barra das classes e o "hoje contra um dia como hoje" só no computador (proposta).
- **O que mostra:**
  - Cabeçalho: o dia e "dia útil 2 de 26". Fase 6: bloco "O que isso significa" no topo.
  - Três colunas iguais, cada uma com a pergunta, a marca de estado e a frase-resumo; o título e o rodapé "Ver o desvio ›" abrem o desvio, e os itens de dentro são links próprios.
  - Vendas: realizado do mês contra a meta (R$ e %); ritmo; projeção e quanto fica abaixo ou acima da meta; hoje até agora contra o que um dia como hoje costumava ter vendido até esta hora (proposta); exceção em nomes ("Abaixo do ritmo: Daniele, 0,81"); itens sem vendedor, só se houver.
  - Compras: "Nos últimos 90 dias a loja comprou 212 produtos: 120 da curva A, 40 da B, 30 da C e 22 sem venda", com a barra dividida em quatro; encalhe (produtos e R$); ruptura (produtos).
  - Financeiro: folga em 7 e em 30 dias; saldo do banco e a data em que foi digitado; contas vencidas e a vencer em 7 dias; quebra do último fechamento de caixa.
- **Cliques:** título ou rodapé de Vendas → V1; nome do vendedor → V2; itens sem vendedor → V1, no bloco dessa exceção; título ou rodapé de Compras → C1; encalhe ou ruptura → C2, na visão; título ou rodapé de Financeiro → F1; quebra → F3; "Digitar saldo" (só dono) → K1; "Cadastrar meta" (só dono) → K2.
- **Estados:** tudo bem ("Vendas no ritmo"); sem meta (estado "sem meta", ritmo vazio, "Cadastrar meta"); sem venda hoje até agora; dia antes de 26/09/2026 ("estoque desconhecido" no lugar de encalhe e ruptura); saldo não digitado (folgas vazias e "Digitar saldo"); saldo velho (atenção, "saldo de 12/09"); uma pergunta sem resposta (só a coluna dela diz "Sem resposta para este dia").

### V1 · Vendas: o desvio

- **Para que serve:** a distância entre a loja e a meta do mês, a mesma distância para cada vendedor, e se o ritmo atual leva a bater a meta.
- **Quem vê:** dono (5b); gerente (7), igual, sem "Cadastrar meta". Vendedor não vê.
- **Onde:** computador: resumo em faixa no topo; gráfico (2/3) e "como se forma" (1/3) lado a lado; tabela dos vendedores na largura toda. Celular sim: o resumo num cartão, uma barra com realizado, meta e projeção no lugar do gráfico e os vendedores em cartões, sem ordenar.
- **O que mostra:**
  - Resumo: realizado contra a meta (R$ e %), quanto falta; ritmo; projeção e diferença para a meta; dias úteis "2 de 26, faltam 24"; "para bater a meta, R$ 6.200 por dia útil restante" (proposta). Fase 6: bloco "O que isso significa".
  - Gráfico do mês: realizado acumulado dia a dia, linha da meta proporcional e projeção pontilhada.
  - Como se forma: vendido − devoluções = realizado, no mês e no dia.
  - Tabela dos vendedores (tipo vendedor no ERP), pior ritmo primeiro: estado, ritmo, realizado do mês, meta, %, falta, realizado do dia, vendas no mês, clientes atendidos.
  - Linha "Outros (sem meta própria)": "venda de quem não é vendedor no ERP (hoje, a gerente); conta só na meta da loja".
  - Exceção "Itens sem vendedor" (itens e R$, no mês e no dia), só quando houver: "ficam fora do vendido, como no relatório 154 do ERP". Atalho "Padrões de venda".
- **Cliques:** linha do vendedor → V2; cabeçalho → ordena; passar o mouse num número → definição ("Ritmo: realizado ÷ meta, dividido pela parte dos dias úteis que já passou; acima de 1, adiantado"); ponto do gráfico → acumulado e meta do dia; clicar num dia do gráfico → o app vai para aquele dia; "Cadastrar meta" (só dono) → K2; "Padrões de venda" → V3.
- **Estados:** mês sem venda (dia 1 cedo: zeros, ticket vazio); sem meta da loja (sem comparação, "Cadastrar meta"); vendedor sem meta ("sem meta" e "Cadastrar"); ninguém como vendedor no ERP (tabela vazia, tudo em Outros); vendedor novo no ERP ("novo no ERP, sem meta"); quem deixa de ser vendedor no ERP passa para Outros.

### V2 · Detalhe do vendedor

- **Para que serve:** por que um vendedor está fora do ritmo: quanto vendeu contra a meta, para quantos clientes e o que vende.
- **Quem vê:** dono (5b); gerente (7). O vendedor não vê, porque é percentual.
- **Onde:** computador: cabeçalho e resumo em faixa no topo; mix do mês em barras na largura toda, com a parte na loja ao lado de cada grupo. Celular sim (proposta): o resumo num cartão e os 5 maiores grupos do mix, com "ver todos"; sem a comparação com a loja.
- **O que mostra:**
  - Cabeçalho: nome, "vendedor no ERP (código 12)" e setas ‹ › para o próximo vendedor.
  - Resumo: realizado contra a meta (R$ e %), falta, ritmo e estado; realizado do dia; vendas no mês; clientes atendidos no mês.
  - Mix do mês: barras por grupo de produto, do maior para o menor, com R$ e a parte de cada grupo; ao lado, a parte do mesmo grupo na loja (proposta).
  - Fase 8: bloco "Clientes atendidos" com os nomes. Ticket e itens por venda do vendedor ficam em R5.
- **Cliques:** ‹ e › → vendedor anterior ou seguinte, no mesmo dia; passar o mouse num grupo → R$ e as duas partes; "Cadastrar meta" (só dono) → K2; nome de cliente (Fase 8) → R2; voltar → V1.
- **Estados:** sem meta (ritmo e % vazios, "Cadastrar meta"); sem venda no mês ("Nenhuma venda em outubro até agora"); grupo "sem grupo" (barra a mais, "produto sem grupo no cadastro").

### C1 · Compras: o desvio

- **Para que serve:** se as compras dos últimos 90 dias foram para o que gira (curva A e B) ou para o que encalha (C e sem venda), e as exceções do estoque.
- **Quem vê:** dono (5b); gerente (7).
- **Onde:** computador: cabeçalho, barra e frase no topo; cartões de exceção numa fileira; curva ABC e "onde o estoque está parado" lado a lado embaixo. Celular sim: a barra, a frase e os cartões de exceção, cada um com os 5 primeiros produtos (tocar abre C3); sem curva e sem grupos.
- **O que mostra:**
  - Cabeçalho: "últimos 90 dias (05/07 a 02/10/2026)". Fase 6: bloco "O que isso significa".
  - Resposta: a barra dos produtos comprados em A, B, C e sem venda (contagem e parte de cada um), a frase de estado ("Atenção: 22 dos 212 produtos comprados não venderam") e a comparação com 30 dias antes.
  - Cartões de exceção: Encalhe (produtos e R$ parados a custo), Ruptura, Comprados sem venda e Estoque negativo, cada um com a comparação com 30 dias antes; Custo zero sem comparação, com a nota "cadastro de hoje".
  - Curva ABC dos 90 dias, por valor e por quantidade: produtos, R$ ou unidades e parte do total.
  - "Onde o estoque está parado": os 5 grupos com mais dias de cobertura.
  - Rodapé: "Estoque conhecido desde 26/09/2026. Valor parado pelo custo atual do cadastro."
- **Cliques:** parte da barra → C2 "Comprados nos 90 dias", na classe; cada cartão → C2 na visão de mesmo nome; linha da curva → C2 "Curva ABC", na classe; grupo → C2 por grupo; produto (celular) → C3.
- **Estados:** nenhuma compra nos 90 dias ("Nenhuma nota de entrada nos últimos 90 dias"; os cartões continuam); dia antes de 26/09/2026 (cartões de estoque em cinza, "estoque desconhecido antes de 26/09/2026"); cartão vazio ("Nenhum produto em encalhe"); tudo bem ("Comprando o que gira").

### C2 · Estoque e giro

- **Para que serve:** a lista que explica o desvio de compras: cada produto, grupo, marca ou fornecedor, com venda, estoque, giro e cobertura. Junta curva ABC, giro, encalhe, ruptura e saneamento numa tabela só, com visões prontas.
- **Quem vê:** dono (5b); gerente (7).
- **Onde:** só computador (proposta): tabela larga, com filtros combinados. Lista-detalhe: a tabela na largura e o produto (C3) num painel à direita. De início, 10 colunas (código, descrição, classe por valor, R$ e unidades em 90 dias, estoque, giro, cobertura, valor parado, marcas); as outras pelo botão "Colunas". Com o C3 aberto, ficam código, descrição, classe, R$, estoque e marcas.
- **O que mostra:**
  - Busca por código ou descrição; período (90 dias até o dia escolhido).
  - Visões prontas, com a contagem: Todos, Curva ABC (valor ou quantidade), Encalhe, Ruptura, Comprados nos 90 dias, Estoque negativo, Custo zero.
  - "Ver por": produto, grupo, marca ou fornecedor; filtros por classe, grupo, marca e fornecedor.
  - Linha de totais do filtro: produtos, R$ e unidades vendidas, valor parado, contra 30 dias antes.
  - Tabela de produtos: código, descrição, classe por valor e por quantidade, R$ e unidades em 90 dias, estoque, estoque médio, giro, cobertura (dias), valor parado, última venda e marcas (encalhe, ruptura, novo, custo zero, negativo).
  - Por grupo, marca ou fornecedor: produtos, unidades, estoque médio, giro, cobertura e produtos em encalhe.
- **Cliques:** visão → troca a lista e a ordem (Encalhe: valor parado; Ruptura: unidades vendidas); cabeçalho → ordena; linha de grupo, marca ou fornecedor → volta a "produto", filtrado; produto (ou Enter) → C3 no painel, setas trocam o produto, Esc fecha; voltar → C1.
- **Estados:** visão vazia ("Nenhum produto em ruptura hoje"); busca sem resultado ("Nenhum produto com broca 8"); dia antes de 26/09/2026 (estoque com "—" e visões de estoque desligadas, com a explicação); visão Custo zero em dia passado (a lista de hoje, com "o cadastro não guarda histórico").

### C3 · Detalhe do produto

- **Para que serve:** entender um produto antes de comprar mais, parar de comprar, liquidar ou corrigir o cadastro.
- **Quem vê:** dono (5b); gerente (7).
- **Onde:** computador, como painel à direita de C2 (desenhar primeiro o painel; vira página própria quando vem de R2 ou R6); celular sim (proposta): uma coluna, aberto pelos 5 primeiros de cada cartão de C1, com as entradas de compra recolhidas.
- **O que mostra:**
  - Cabeçalho: código, descrição, grupo, marca, fornecedor; marcas de estado (encalhe, ruptura, "novo, em carência até 25/11", custo zero, estoque negativo).
  - Números: classes, R$ e unidades em 90 dias contra os 90 anteriores, estoque, cobertura, giro, valor parado.
  - Venda por mês desde abril (barras) e estoque por dia desde 26/09 (linha), com as entradas marcadas.
  - Entradas de compra: data, nota, fornecedor, unidades e, quando a nota tem, valor e custo unitário.
  - Cadastro: custo atual, preço, primeira entrada, última venda. Fase 8: margem em 90 dias e os clientes que mais compram.
- **Cliques:** grupo, marca ou fornecedor → C2 filtrado; passar o mouse num ponto → valor do mês ou estoque do dia; entrada de compra → mostra o número da nota, para achar no ERP; cliente (Fase 8) → R2; fechar (Esc) → volta à lista, na mesma posição.
- **Estados:** sem venda desde abril; produto novo em carência (diz por que não está em encalhe); dia antes de 26/09 ("estoque desconhecido"); nota do ERP anterior ("esta nota não guardava valor").

### F1 · Financeiro: o desvio

- **Para que serve:** se o saldo do banco cobre o que vence em 7 e em 30 dias, e o que saiu do lugar: contas vencidas, saldo ausente ou velho, quebra de caixa.
- **Quem vê:** dono (5b); gerente a partir da Fase 7, igual, sem "Atualizar saldo" (o OBJETIVO diz que ela vê a loja inteira e não digita saldo).
- **Onde:** computador, sem rolar (folgas e contas à esquerda, gráfico à direita, cartões embaixo; se não couber, o bloco da IA recolhe numa linha); celular sim: uma coluna, e o gráfico vira só a linha do saldo previsto.
- **O que mostra:**
  - Cabeçalho com a fonte da posição, discreta (ERP anterior até 25/09, ERP novo desde 26/09). Fase 6: bloco "O que isso significa".
  - Resposta: "Folga em 7 dias" e "Folga em 30 dias", grandes, com estado e a conta escrita ("saldo R$ 48.000,00, digitado em 01/10, − R$ 31.200,00 que vencem até 09/10, com as vencidas"); comparação com a folga de 7 dias atrás.
  - Aviso do saldo, só quando há problema: "Saldo do banco não digitado" ou "Saldo de 25/09, há 7 dias", com "Atualizar saldo".
  - Contas a pagar em aberto, em quatro faixas (parcelas e R$): vencidas, até 7 dias, até 30 dias, total.
  - Próximos 30 dias: barras do que vence por dia e a linha do saldo previsto, com o zero e o primeiro dia negativo marcado.
  - Cartões: Caixa (quebra do último fechamento e gaveta); Fluxo do mês (entradas e saídas até hoje contra o mesmo período do mês anterior); Cartão a creditar amanhã. Nota: "Conta paga e ainda não baixada no ERP continua em aberto e reduz a folga."
- **Cliques:** folga ou faixa → F2, no recorte; dia do gráfico → F2, na data; "Atualizar saldo" ou o saldo (só dono) → K1, num painel por cima; cartão Caixa → F3; Fluxo do mês ou Cartão a creditar → F4.
- **Estados:** nenhuma conta em aberto; sem saldo (folgas vazias com "falta o saldo do banco"; contas e saídas aparecem); saldo velho (a folga aparece, com o aviso da data); folga negativa (fora: "faltam R$ 3.200,00 para o que vence até 09/10"); tudo bem ("o saldo cobre os próximos 30 dias"); sem fechamento hoje (o cartão mostra o último fechamento, com a data).

### F2 · Contas a pagar e previsão

- **Para que serve:** o detalhe da folga: o que vence, em que dia e para quem, e como fica o saldo dia a dia nos próximos 30 dias. Junta as contas por vencimento e o fluxo previsto, que são a mesma lista.
- **Quem vê:** dono (5b); gerente (7), igual, sem "Digitar saldo".
- **Onde:** computador (gráfico em cima, tabela por data embaixo); celular sim (proposta): cartões por data (valor do dia e saldo previsto), o toque abre as parcelas, sem ordenar.
- **O que mostra:**
  - Resumo: saldo (com a data), vencidas, até 7, até 30, total (contra 7 dias antes) e as duas folgas.
  - Recorte: vencidas, 7 dias, 30 dias, todas.
  - Gráfico dos 30 dias: barras do que vence, barra do cartão a creditar amanhã, linha do saldo previsto e linha do zero.
  - Tabela por vencimento: primeiro "Vencidas" (com dias de atraso), depois cada data com parcelas, valor do dia e saldo previsto; abrindo a data, cada parcela: fornecedor, descrição, número do boleto ou da nota, "parcela 2 de 3" e valor.
  - Nota: "Conta paga e ainda não baixada no ERP continua aqui: a baixa costuma vir depois do pagamento."
- **Cliques:** data → abre ou fecha as parcelas; dia do gráfico → rola até a data; recorte → filtra tabela e gráfico; cabeçalho das parcelas → ordena por valor ou fornecedor; saldo (só dono) → K1; voltar → F1.
- **Estados:** nenhuma conta ("Nenhuma conta a pagar em aberto"; gráfico só com o saldo); sem saldo (somem a linha e a coluna do saldo previsto, com "Digitar saldo"); vencidas maiores que zero (faixa no topo, em destaque); saldo previsto negativo (o primeiro dia e os seguintes marcados "fora"); contas além de 30 dias (só no recorte "todas", sem saldo previsto).

### K1 · Saldo do banco

- **Para que serve:** o dono digita o saldo da conta da loja, que o ERP não sabe (o depósito do dinheiro não é lançado lá). É a base da folga.
- **Quem vê:** só o dono.
- **Onde:** aberto pelo F1 ou pelo F2, é um painel lateral só com o formulário, por cima da tela; pelo menu Cadastros, é uma página com o formulário e o histórico. Celular sim (proposta): folha que sobe de baixo, teclado numérico e Salvar grande (o dono olha o app do banco no telefone).
- **O que mostra:**
  - A linha "O ERP não sabe o saldo do banco. Digite o saldo para o Kaizen calcular a folga."
  - Último saldo: "R$ 48.000,00 em 01/10/2026, há 1 dia", com quem digitou e a hora.
  - Formulário: data (padrão hoje), valor em R$, Salvar.
  - Depois de salvar: "Saldo salvo. A folga nova aparece na próxima atualização, às 15h." (pergunta 9).
  - Histórico das últimas 10 digitações (data, valor, quem, quando), com Corrigir e Apagar.
- **Cliques:** Salvar (ou Enter) → grava; data que já tem saldo → "Já existe R$ 45.000,00 em 01/10. Substituir?"; Corrigir → carrega a linha no formulário; Apagar → pede confirmação; Cancelar ou Esc → fecha e volta à tela de onde veio.
- **Estados:** nenhum saldo ainda ("a folga só aparece depois do primeiro"); valor vazio ou com letras ("digite um valor em reais"); data futura ou antes de 01/04/2026 (recusada, com a explicação); valor negativo (aceito depois de confirmar).

### F3 · Caixa da loja

- **Para que serve:** conferir se o caixa fechou certo: quebra por turno e por forma de pagamento, a gaveta, as sangrias e os suprimentos.
- **Quem vê:** dono (5b); gerente (7): ela responde pelo caixa.
- **Onde:** computador: seletor "Dia | Mês" no topo; no dia, a quebra e os cartões dos fechamentos à esquerda, a gaveta e as sangrias à direita; no mês, gráfico em cima e tabela embaixo. Celular sim (proposta), só o dia (um cartão por fechamento e a gaveta).
- **O que mostra:**
  - Seletor "Dia | Mês"; o dia é o da barra de cima.
  - Dia: quebra do dia com estado e a média do mês; um cartão por fechamento (caixa, operador, abertura → fechamento, quebra do turno) com a tabela por forma: calculado, informado, quebra.
  - Dia: a gaveta escrita como conta (vendas em dinheiro + suprimentos − sangrias − devoluções em dinheiro = gaveta) e a lista de sangrias e suprimentos (hora, tipo, valor, operador, observação).
  - Mês: quebra acumulada por forma, gráfico da quebra por dia e tabela dos turnos.
  - Nota: "O fechamento é às cegas: o informado é a contagem do operador; a linha de troca fica fora."
- **Cliques:** "Dia | Mês"; no mês, turno ou dia do gráfico → visão do dia; passar o mouse numa forma → calculado e informado lado a lado; atalho do último fechamento → aquele dia; voltar → F1.
- **Estados:** dia sem fechamento ("O caixa deste dia ainda não fechou; último fechamento: 01/10", com atalho para ele); caixa bateu ("Bateu nas 4 formas"); quebra fora da tolerância (forma e turno marcados).

### K2 · Metas e feriados

- **Para que serve:** onde o dono digita, mês a mês, o que o ritmo e a projeção usam: a meta da loja, a de cada vendedor e os dias em que a loja não abre. Ficam juntos porque os dias fechados mudam os dias úteis, base do ritmo.
- **Quem vê:** só o dono. A gerente vê as metas pelo V1.
- **Onde:** só computador (proposta): é tarefa de uma vez por mês, e um erro muda o ritmo de todos os dias do mês. Metas à esquerda, dias sem expediente à direita.
- **O que mostra:**
  - Seletor de mês "‹ outubro de 2026 ›", de abril de 2026 até 12 meses à frente.
  - Esquerda, Metas: a meta da loja e uma linha por vendedor do tipo vendedor no ERP, cada uma com o campo em R$ e o realizado dos 3 meses anteriores ao lado.
  - Conferência: soma das metas dos vendedores, meta da loja e a diferença ("venda de quem não é vendedor no ERP conta só na meta da loja").
  - Botões: Salvar, Copiar do mês anterior, Desfazer.
  - Direita, Dias sem expediente: o calendário do mês (domingos apagados, dias fechados com a descrição), "dias úteis no mês: 26" e a lista dos dias fechados com Remover. A regra à vista: "Marque só os dias em que a loja não abre. Feriado em que a loja abriu não entra."
- **Cliques:** trocar o mês; digitar meta (só R$ maior que zero; vazio quer dizer sem meta); Salvar → "Metas de outubro salvas", a conferência do servidor e "ver o desvio" → V1; dia de segunda a sábado → caixa "Loja fechada neste dia?" com descrição; dia fechado → "Reabrir este dia", com confirmação; mudança num mês passado → "Isso muda o ritmo e a projeção de todos os dias de setembro" (pergunta 10); sair sem salvar → pergunta.
- **Estados:** mês sem meta ("Sem meta, o ritmo fica vazio"); vendedor novo no ERP (linha marcada "novo no ERP"); quem deixou de ser vendedor no ERP ("a meta dele não entra no ritmo"); valor inválido (mensagem no campo); salvo, à espera da próxima atualização ("vale a partir das 15h"; pergunta 9).

### V3 · Padrões de venda

- **Para que serve:** como a loja vende: quanto vale uma venda, quantos itens leva, a que hora e em que dia da semana se vende mais. Não muda o desvio; fica a um clique dele.
- **Quem vê:** dono (5b); gerente (7).
- **Onde:** só computador (proposta): é análise de 12 horas e 6 dias, feita sentado. Cartões numa fileira no topo; barras por hora e por dia da semana lado a lado embaixo.
- **O que mostra:**
  - Período: "outubro até sexta, 02/10" (o mês do dia escolhido) contra o mês anterior inteiro.
  - Cartões: ticket médio, itens por venda e vendas no mês, cada um com o mês anterior e a diferença; embaixo, ticket e itens do dia.
  - Barras por hora (7h às 18h): realizado e vendas do mês; linha com a parte de cada hora no mês anterior.
  - Barras por dia da semana (segunda a sábado): realizado, vendas e média por dia aberto, com a nota "sábado fecha ao meio-dia".
- **Cliques:** passar o mouse numa barra → R$, vendas e parte do total; alternar "R$ / nº de vendas"; voltar → V1.
- **Estados:** mês sem venda ("Nenhuma venda neste mês até agora"); abril de 2026, sem mês anterior ("abril é o primeiro mês com dados").

### F4 · Fluxo de caixa realizado

- **Para que serve:** o que entrou e saiu de fato, dia a dia e por forma, no mês, contra o mês anterior. Inclui o cartão creditado, por data de crédito.
- **Quem vê:** dono (5b); gerente (7).
- **Onde:** só computador (proposta): tabela larga, análise do mês; no celular, o F1 já mostra o fluxo do mês. Totais em faixa no topo, barras por dia no meio, tabela por dia embaixo.
- **O que mostra:**
  - O mês do dia escolhido, "até hoje".
  - Totais: entradas por forma (dinheiro, Pix, crédito, débito, cartão, outras) e total, saídas e resultado, contra o mesmo período do mês anterior.
  - Barras por dia: entradas empilhadas por forma e saídas.
  - Tabela por dia: cada forma, total de entradas, saídas e resultado.
  - Notas fixas: "Dinheiro conta no dia da venda, mesmo indo ao cofre." "Cartão entra no dia seguinte à venda." "Boleto entra no dia em que é pago (em outras)." "Saída é a baixa da conta no ERP." "Isto não é o extrato do banco."
- **Cliques:** passar o mouse numa barra → valores do dia por forma; dia → F3 daquele dia; saídas de um dia → painel com as contas baixadas (fornecedor, valor); cabeçalho → ordena; voltar → F1.
- **Estados:** mês sem movimento; domingo ou feriado (linha cinza "loja fechada"); hoje parcial ("até 14h").

### A1 · Réguas e avisos

- **Para que serve:** o dono decide quando quer ser avisado: cada indicador ganha uma régua. A tela mostra quais estão cruzadas agora e tudo o que o robô do Telegram já mandou.
- **Quem vê:** só o dono.
- **Onde:** só computador (proposta): o Telegram já é o celular dos avisos, e cada mensagem traz o link da tela. Duas abas: "Réguas" (faixa, tabela à esquerda e painel da régua à direita) e "Avisos enviados" (lista e o bloco Telegram, briefing e IA).
- **O que mostra:**
  - Aba Réguas: faixa "2 réguas cruzadas agora", com a frase de cada uma, ou "Nenhuma régua cruzada".
  - Tabela por pergunta (Vendas, Compras, Financeiro; Relacionamento e Entregas nas suas fases): indicador e unidade; condição ("abaixo de R$ 0,00") ou "sem régua"; valor agora; estado; última vez que cruzou; ativa ou pausada.
  - Painel da régua: sentido (abaixo de, acima de), valor, a prévia "com esta régua, hoje estaria: cruzada", a frase que chegaria no Telegram e as últimas 10 vezes que cruzou.
  - Fase 8, grupo "Lista do dia": as seis réguas com o valor inicial ao lado (1,5 vez o intervalo; 60 dias; 2 dias úteis; 3 de 5 compras; 10 nomes; 7 dias).
  - Aba Avisos enviados: data e hora, tipo (régua cruzada, régua voltou, briefing, falha na atualização, resumo da noite), texto e se o Telegram aceitou; filtro por tipo e período.
  - Bloco Telegram, briefing e IA: robô ligado (sim ou não) e "Mandar mensagem de teste" (proposta); último envio aceito; briefing "toda segunda às 7h" (proposta) e o último enviado; o último texto da IA e se falhou.
- **Cliques:** linha → painel (em "sem régua", pronto para criar); mudar sentido ou valor → prévia do servidor na hora; Salvar (vale a partir da próxima atualização); pausar; apagar (com confirmação); aviso enviado → texto inteiro; "Mandar mensagem de teste"; frase de régua cruzada → a tela da régua (V1, C1 ou F1; R5 ou R4 na Fase 8; E2 na 11).
- **Estados:** nenhuma régua (todas "sem régua", com "comece pela folga em 7 dias"); indicador sem valor hoje (ex.: folga sem saldo; a régua não cruza); robô falhando ("O último aviso não chegou ao Telegram (14h)", em destaque); atualização falhou ("números das 13h").

### R4 · Lista do dia

- **Para que serve:** responde ao vendedor "com quem eu falo hoje?": até 10 clientes da carteira dele, cada um com o motivo e o que fazer. Gerente e dono usam a mesma tela, com um seletor, para ver a lista de cada vendedor e o andamento.
- **Quem vê:** vendedor (só a dele e só hoje; ele marca "falei"); gerente e dono (escolhem o vendedor, "Sem carteira" ou "Todos", com "Todos" de início, e a data; não marcam "falei" na lista de um vendedor, proposta).
- **Onde:** só computador: a lista à esquerda (uns 640 px) e o dossiê (R2) aberto ao lado.
- **O que mostra:**
  - Barra: a data; para gerente e dono, o seletor de vendedor com o andamento ("Igor: 4 de 10 com falei") e o seletor de data.
  - Resumo: "10 nomes hoje · 3 com falei · R$ 6.420 por mês em risco nesta lista".
  - Cartões agrupados por motivo, na ordem atrasado → sumido → orçamento parado → compra incompleta, e dentro de cada motivo do maior valor em risco para o menor: nome, telefone, motivo, a frase do que fazer, o valor em risco e "Falei".
  - Exemplos de frase: "Ligar: costuma comprar a cada 7 dias e está há 12"; "Retomar o orçamento 231, R$ 850,00, parado há 3 dias úteis"; "Oferecer cola de contato 14 kg: ele levou em 4 das últimas 5 compras".
  - Grupo "Falei hoje", recolhido; bloco "Tarefas de hoje" (o mesmo de R3); para gerente e dono, "fora da lista de hoje: 7 clientes em risco" (proposta).
- **Cliques:** cartão → R2 ao lado; telefone → WhatsApp Web por link (e copiar); "Falei" → campo opcional "o que ficou combinado?" e Confirmar: vira anotação, o nome desce para "Falei hoje" e sai das listas por 7 dias ("Desfazer" enquanto a tela estiver aberta); tarefa feita; data passada (gerente e dono) → a lista como foi, só para ver; "fora da lista" → R1 filtrada pelos atrasados e sumidos do vendedor.
- **Estados:** vazio ("Nenhum cliente da sua carteira precisa de contato hoje"); sem carteira ("Sua carteira ainda não foi cadastrada pelo dono"); tudo feito ("Você falou com os 10 de hoje"); domingo ou feriado (a lista do último dia útil, com aviso).

### R2 · Dossiê do cliente

- **Para que serve:** a ficha curta que o vendedor lê antes de falar com o cliente: o que compra, quando, quanto, o que está em risco, as tarefas e as anotações. A parte calculada e a parte escrita pela IA nunca se misturam.
- **Quem vê:** vendedor (só os clientes da carteira dele, sem margem e sem percentual); gerente e dono (qualquer cliente, com margem).
- **Onde:** computador, como página própria (números à esquerda, tarefas e anotações numa coluna à direita) ou ao lado de R4, com uns 960 px, onde tarefas e anotações vão para baixo; celular sim para o dono (proposta), só para ver e apagar linha da camada mole, em uma coluna: cabeçalho, números, atritos, o que compra, anotações.
- **O que mostra:**
  - Cabeçalho: nome, código, telefone ("abrir no WhatsApp"), endereço e bairro, vendedor da carteira, última compra, realizado em 90 dias; Fase 8: classe ABC, RFV e situação; se está na lista de hoje, o motivo e "Falei".
  - Bloco Localização (Fases 9 e 10): latitude e longitude, quem digitou e quando, distância até a loja, concorrente mais próximo e a distância; "Digitar" ou "Corrigir" e "Ver no mapa (Fase 10)".
  - Camada dura (Fase 8): intervalo normal, valor em risco, tendência (90 dias contra os 90 anteriores), ticket médio, horário em que costuma pedir, margem (dono e gerente); grupos, marcas e os 10 produtos que mais compra; produtos curva A da loja que ele nunca comprou; orçamentos em aberto; últimas compras.
  - Tarefas (abertas, "Nova tarefa", concluídas recolhidas) e anotações em linha do tempo; o "falei" entra como anotação; "veio de lead do CRM", quando for o caso.
  - Fase 12, abaixo da camada dura, com o título "O que a equipe sabe, escrito pela IA a partir de depoimentos e conversas": Atritos primeiro (proposta), depois Identificação e logística, Relacionamento comercial e Pessoal. Cada linha: texto; Fato ou Opinião; origem (quem disse, ou de que conversa do WhatsApp veio, e quando); o trecho original em "ver trecho"; opinião com autor e data. Botão "Registrar depoimento".
- **Cliques:** telefone → WhatsApp Web por link, numa aba nova (ou copiar); "Falei" → como em R4; "Nova tarefa" → diálogo (o que fazer, para quando, responsável); concluir tarefa → "o que aconteceu?" vira anotação; nova anotação; compra → os itens; "Digitar" ou "Corrigir" → diálogo de coordenada (o mesmo de M1); "Ver no mapa" (Fase 10) → M2 centrado; produto → C3 (dono e gerente); "Registrar depoimento" → digitar, ou gravar áudio pelo microfone do computador (a transcrição vira texto e segue as mesmas regras; pergunta 45), e "a IA está lendo"; linha da camada mole → ver trecho, apagar, corrigir ("corrigida por Igor em 05/10"); voltar → a tela de onde veio, com o filtro como estava.
- **Estados:** sem acesso (vendedor abrindo cliente de outra carteira: "Este cliente é da carteira de Daniele"); sem tarefas nem anotações ("Nada anotado ainda"); menos de 3 compras ("sem intervalo normal ainda"); cliente novo (sem tendência); sem telefone no ERP; camada mole vazia ("Ninguém contou nada sobre este cliente ainda"); IA falhou ("O depoimento foi guardado; a IA tenta de novo"); margem com item de custo zero (sinal ao lado).

### R1 · Clientes (a carteira)

- **Para que serve:** a carteira inteira numa tabela: de quem é cada cliente, quem parou de comprar e quanto cada um vale. É onde o dono distribui a carteira e o detalhe dos números de R5.
- **Quem vê:** dono (todos; distribui a carteira); gerente (todos; só vê a carteira, pergunta 23); vendedor ("Minha carteira": só os clientes dele, sem coluna de vendedor, sem seleção, sem margem e sem percentual). Desenhar duas versões: dono e gerente, e vendedor. O servidor nem entrega ao vendedor os clientes dos outros.
- **Onde:** computador; celular só para o dono, aberto por um cartão de R5 (proposta): lista simples com nome, situação e valor em risco, que abre R2.
- **O que mostra:**
  - Busca (nome, código, telefone, bairro) e filtros: vendedor ou "sem carteira", bairro, última compra (até 30, de 31 a 60, mais de 60 dias); Fase 8: classe ABC; situação (ativo no mês, atrasado, sumido, sem intervalo, não voltou: ativo no mês anterior e sem compra neste), com seletor de mês (de início, o mês atual); veio de lead; novo no mês; Fase 9: sem coordenada.
  - Cartões da carteira (dono e gerente): "Igor: 171 clientes", "Sem carteira: 33"; o clique filtra.
  - Fase 8: curva ABC de clientes (clientes e R$ por classe), tabela RFV que cruza há quanto tempo comprou com quantas vezes comprou (contagem por célula, sem cor de intensidade) e contadores de ativos, atrasados e sumidos com o valor em risco.
  - Tabela, de início com 8 colunas: nome, vendedor, última compra ("há 12 dias"), realizado em 90 dias, tarefas abertas e, na Fase 8, situação, valor em risco e tendência. Pelo botão "Colunas": código, bairro, telefone, sugestão (proposta: quem mais vendeu a ele em 90 dias, só para o dono) e, na Fase 8, classe, RFV, intervalo normal e margem (dono e gerente). Na versão do vendedor, com o painel de tarefas, ficam nome, situação, última compra, realizado em 90 dias e valor em risco.
  - Ações para vários clientes de uma vez (dono, com seleção): "Passar 12 clientes para…", "Aceitar a sugestão" (proposta), "Tirar da carteira"; link "Mudanças da carteira" (proposta: quem mudou, quando, de quem para quem).
  - Vendedor (Fase 7): painel à direita "Minhas tarefas de hoje", atrasadas primeiro. Rodapé: "N clientes neste filtro, R$ X por mês em risco".
- **Cliques:** nome → R2; cartão, célula ou contador → filtra; cabeçalho → ordena (de início, por valor em risco, ou realizado em 90 dias na Fase 7); "Passar para…" → confirmação ("12 clientes de Sem carteira para Igor") e registro; tarefa do painel → R2, na tarefa.
- **Estados:** carteira vazia (vendedor: "Sua carteira ainda está vazia. O Israel distribui os clientes."); sem carteira igual a zero ("Todos os clientes têm vendedor"); filtro sem resultado ("Limpar filtros"); cliente novo desde ontem (marca "novo", entra em Sem carteira); menos de 3 compras (intervalo "—").

### R3 · Tarefas

- **Para que serve:** o que cada um prometeu fazer com os clientes, por prazo, com as atrasadas primeiro.
- **Quem vê:** vendedor (as dele); gerente e dono (todas, com filtro por pessoa e contadores por vendedor).
- **Onde:** só computador: contadores em faixa no topo (para gerente e dono, a linha por vendedor ao lado), lista agrupada na largura toda.
- **O que mostra:**
  - Filtro de responsável (para o vendedor, fixo em "minhas") e "Nova tarefa".
  - Contadores: Atrasadas, Para hoje, Próximos 7 dias; para gerente e dono, uma linha por vendedor ("Igor: 3 atrasadas").
  - Lista agrupada (Atrasadas, Hoje, Próximos dias): cliente, o que fazer, prazo ("atrasada 2 dias"), responsável, quem criou; Concluir e Adiar.
  - Abas: Abertas, Concluídas (30 dias) e Anotações dos últimos 7 dias (gerente e dono, proposta).
- **Cliques:** cliente → R2, na tarefa; Concluir → "o que aconteceu?" (opcional), que vira anotação; Adiar → nova data; Nova tarefa → cliente (busca na carteira), o que fazer, prazo, responsável; contador ou vendedor → filtra.
- **Estados:** nada atrasado ("Nenhuma tarefa atrasada"); lista vazia ("Crie pelo dossiê do cliente ou aqui"); cliente que mudou de carteira (a tarefa fica com quem a tinha, marcada "cliente agora de Daniele", proposta).

### P1 · Pessoas e acesso

- **Para que serve:** quem entra no Kaizen, com qual perfil, e a qual funcionário do ERP cada login se liga (é isso que dá ao vendedor só a carteira dele). O Firebase cria o login, mas não sabe o perfil.
- **Quem vê:** só o dono.
- **Onde:** só computador (proposta; se o dono quiser cortar um acesso pelo celular, entra só a lista com "Bloquear").
- **O que mostra:**
  - Faixa de exceções, que some quando não há: "Funcionário do tipo vendedor no ERP sem login: (nome)"; "Login ligado a funcionário inativo no ERP, ainda com acesso"; "Vendedor sem nenhum cliente na carteira".
  - Tabela: nome, e-mail, como entra (Google ou e-mail e senha), perfil, funcionário do ERP (código, nome, tipo), clientes na carteira (vendedor), último acesso, estado (ativo, aguardando o primeiro acesso, bloqueado).
  - Painel da pessoa: e-mail, nome, perfil (com uma linha do que cada perfil vê), funcionário do ERP (sugerido pelo mesmo e-mail; obrigatório para vendedor), Salvar, Bloquear ou Reativar.
- **Cliques:** "Adicionar pessoa" → painel vazio; Salvar libera o e-mail ("aguardando o primeiro acesso"); pessoa → painel; trocar perfil → confirmação ("Igor passa de vendedor a gerente: deixa de ver só a carteira dele"); Bloquear → a pessoa sai na hora; exceção → a pessoa, ou o funcionário já preenchido; número de clientes → R1 filtrada pelo vendedor.
- **Estados:** só o dono cadastrado ("Adicione a gerente e os vendedores"); e-mail já cadastrado ("Este e-mail já tem acesso, perfil gerente"); vendedor sem funcionário ligado ("sem ele, a carteira não tem dono"); tentativa de tirar o último dono ("Sempre há pelo menos um dono").

### R5 · Painel de relacionamento

- **Para que serve:** mostra ao dono e à gerente, mês contra mês anterior, se a carteira cresce ou encolhe e onde está o desvio, na loja e em cada vendedor. Antes, as exceções do momento.
- **Quem vê:** dono e gerente, iguais. Vendedor não vê.
- **Onde:** computador: barra e exceções no topo; seis cartões em duas fileiras de três, com o bloco Leads ao lado; tabela por vendedor na largura toda. Celular sim (dono, proposta): exceções, os seis cartões empilhados e a tabela reduzida; só atrasados, sumidos e retenção abrem algo (R1 simples).
- **O que mostra:**
  - Barra: o mês contra o anterior ("outubro até o dia 15 contra setembro") e o seletor de mês; Fase 10: seletor de bairro (bairro no lugar da região: provisório, pergunta 1).
  - Exceções: atrasados e sumidos (quantos e R$ por mês em risco), sem carteira, andamento das listas do dia ("Igor: 4 de 10 com falei · Daniele: 0 de 10") e leads com próximo contato vencido.
  - Seis cartões, cada um com o mês anterior e a diferença: Clientes ativos; Retenção ("118 dos 140 ativos de setembro"); Clientes novos (e quantos de lead); Ticket médio; Itens por venda; Margem (R$ e %), com atalhos por vendedor, produto e cliente.
  - Bloco Leads: no CRM, contatados, viraram cliente.
  - Tabela por vendedor (Igor, Daniele, Outros, Sem carteira, Loja): ativos, retenção, novos (de lead), clientes atendidos, ticket, itens por venda e margem, cada um com o mês anterior. Fase 11: margem descontado o custo de entrega.
- **Cliques:** ativos, retenção, novos, atrasados, sumidos ou sem carteira → R1 já filtrada (ex.: retenção → situação "não voltou", mês de outubro); atalho de Margem → R6 na aba; linha de vendedor → os cartões mostram só ele; Leads ou "próximo contato vencido" → R7; andamento das listas → R4 com o vendedor.
- **Estados:** abril de 2026 ("sem mês anterior para comparar"); mês em andamento ("até o dia 15"); vendedor sem carteira cadastrada ("carteira não cadastrada"); margem com item de custo zero (sinal no cartão); margem indisponível antes de 28/09, se o ERP anterior não tiver o custo na venda.

### R6 · Margem

- **Para que serve:** quanto sobra de cada venda depois do custo que o item tinha na hora da venda, por vendedor, produto e cliente, mês contra mês. Acha desconto demais, preço errado e cliente que só compra o que dá pouca margem.
- **Quem vê:** dono e gerente.
- **Onde:** só computador (proposta): tabelas longas, com mil produtos e centenas de clientes. Total da loja e aviso em faixa no topo; abas e tabela na largura toda.
- **O que mostra:**
  - O mês contra o anterior; abas Por vendedor · Por produto · Por cliente · Por bairro (Fase 10; bairro no lugar da região, provisório); na Fase 11, a coluna "margem descontada a entrega".
  - Total da loja: líquido, custo, margem (R$ e % do líquido), com o mês anterior e a diferença.
  - Aviso clicável: "38 itens vendidos com custo zero: R$ 1.240,00 entraram como margem inteira".
  - Tabela: nome, líquido, custo, margem em R$ e em %, mês anterior e diferença.
  - Por vendedor: os vendedores do ERP e "Outros". Por cliente: o balcão (Consumidor Final) só numa linha de rodapé, sem nome nem código e fora da ordenação, "venda de balcão, fora da lista de clientes", para a soma fechar. Por produto: busca e "só com custo zero".
- **Cliques:** aba (mantém o mês); mês; cabeçalho → ordena; cliente → R2; produto → C3; vendedor → as abas Produto e Cliente mostram só as vendas dele; aviso de custo zero → aba Por produto, com o filtro.
- **Estados:** mês sem venda ("Nenhuma venda neste mês"); margem negativa (fora: "abaixo do custo"); item com custo zero (sinal na linha); meses sem custo do item ("margem indisponível antes de 28/09", se for o caso).

### R7 · Leads

- **Para que serve:** como andam os leads do CRM do ERP (os 575 da "Carteira antiga SNK"): quantos há em cada bairro, quantos foram contatados e quantos viraram cliente. Só para ver: o trabalho com o lead continua no CRM do ERP.
- **Quem vê:** dono e gerente. Vendedor não (proposta).
- **Onde:** só computador (proposta): duas tabelas lado a lado.
- **O que mostra:**
  - Faixa: leads no CRM; contatados (quantos e %); viraram cliente (quantos e %); novos do mês vindos de lead; próximo contato vencido.
  - Aviso fixo: "Só para ver. Ligar, anotar e mudar a etapa continuam no CRM do ERP."
  - Esquerda: tabela por bairro (leads, contatados, convertidos), com a linha "sem bairro" (lead sem pessoa vinculada ou sem bairro no endereço).
  - Direita: os leads do bairro escolhido (nome, telefone, etapa, status, próximo contato, data de cadastro e, se virou cliente, a primeira compra); filtros por contatado, etapa, status e contato vencido.
- **Cliques:** bairro → os leads dele à direita; cartão da faixa → filtra a lista, em todos os bairros; lead que virou cliente → R2; "Copiar telefone"; cabeçalho → ordena.
- **Estados:** nenhum lead ("Nenhum lead no CRM do ERP"); bairro sem contatado (zeros, sem cor); leads lidos com atraso ("Leads lidos às 22h de ontem", se não forem lidos de hora em hora).

### M2 · Mapa

- **Para que serve:** ver onde a loja vende e onde não vende: a loja, os clientes pela situação e os concorrentes. Só para ver: não se desenha nem se move nada no mapa.
- **Quem vê:** dono e gerente (tudo); vendedor (só a carteira dele, com o filtro de vendedor fixo: é o "mapa da própria carteira").
- **Onde:** só computador (proposta): seis filtros combinados e a lista ao lado pedem a tela larga.
- **O que mostra:**
  - Filtros combinados no topo: curva ABC de clientes, RFV, atividade (ativo no mês, atrasado, sumido, lead), vendedor, bairro (no lugar da região: provisório, pergunta 1), mês; Limpar.
  - Contagem: "Mostrando 128 de 268 clientes com localização" e "42 ativos sem localização não aparecem".
  - Mapa (uns 2/3 da largura), sobre o OpenStreetMap: loja e concorrentes com formas próprias; cliente como ponto pela situação (em dia, atrasado, sumido), por forma ou tom de cinza; lead com marca própria; legenda com a contagem; pontos no mesmo lugar juntos num círculo com o número. Interruptores: concorrentes, leads.
  - Lista ao lado (1/3): os clientes do recorte, com situação, bairro, vendedor, valor em risco e dias sem comprar.
  - Passar o mouse num ponto: nome, situação, dias sem comprar, valor em risco, ABC, RFV, vendedor, bairro, distância até a loja e concorrente mais próximo.
- **Cliques:** filtro → o servidor devolve o novo recorte; bairro → o mapa enquadra o bairro e mostra "Ver o bairro" → M3; ponto ou linha da lista → R2; concorrente → cartão (nome, observação, distância, de quantos ativos é o mais próximo; para o dono, "Editar" → M4); "42 sem localização" → M1; aproximar e mover o mapa.
- **Estados:** vazio ("Nenhum cliente tem localização. Digite as coordenadas em Localizações."); filtro sem resultado ("Nenhum cliente curva A e atrasado em outubro"); fundo do mapa não carregou (pontos e lista continuam, com aviso); loja sem coordenada; nenhum concorrente (camada desligada).

### M1 · Localizações

- **Para que serve:** a fila para digitar a latitude e a longitude que o cliente manda pelo WhatsApp, começando pelos ativos sem ponto. Daqui saem os pontos do mapa, a distância até a loja e o concorrente mais próximo. A coordenada da loja também entra aqui.
- **Quem vê:** dono (todos; só ele edita "A loja"); gerente (todos); vendedor (só a carteira dele: "faltam 5 clientes da sua carteira"). Quem digita: pergunta 33.
- **Onde:** só computador: quem conversa com o cliente no WhatsApp Web digita ali mesmo. Tabela à esquerda (uns 60% da largura), painel à direita.
- **O que mostra:**
  - Contador da exceção: "Faltam 42 de 310 clientes ativos (14%)". Aviso ao dono, enquanto faltar: "A loja ainda não tem coordenada; sem ela não há distância até a loja", com "Digitar".
  - Seletor: Sem localização (de início), Com localização, Leads (proposta), Todos; busca por nome, telefone ou código.
  - Tabela: a linha fixa "A loja" no topo; nome, telefone, bairro, vendedor, situação, dias sem comprar, valor em risco (maior primeiro).
  - Painel: endereço do ERP para conferir; "Pedir pelo WhatsApp" (proposta); campo para colar "latitude, longitude" e os dois campos; "de onde veio" (o cliente mandou, o Ribamar coletou, outra); mapa de conferência com o ponto e a loja; Salvar.
  - Depois de salvo: quem digitou e quando, distância até a loja; Fase 10: concorrente mais próximo; "Abrir dossiê" e "Ver no mapa (Fase 10)".
- **Cliques:** seletor; busca; cabeçalho → ordena; linha (ou setas) → painel; "Pedir pelo WhatsApp" → WhatsApp Web com um texto pronto, sem enviar sozinho; colar o par → divide nos dois campos; Salvar (Enter) → o servidor confere o formato e a distância até a loja; acima de 60 km (pergunta 34), devolve "confira se latitude e longitude não estão trocadas" e pede confirmação; ao gravar, devolve a distância e o contador novo, a linha sai da fila e o próximo abre (a tela só mostra); apagar (com confirmação); "Abrir dossiê" → R2; "Ver no mapa" (Fase 10) → M2; "A loja" (dono) → o mesmo formulário, e ao salvar o servidor refaz a distância de todos.
- **Estados:** vazio ("Todos os 310 clientes ativos têm localização"); coordenada fora do formato (campo marcado, Salvar desligado); loja sem coordenada (distância "falta a coordenada da loja"); cliente sem endereço no ERP.

### M3 · Por bairro

- **Para que serve:** bairro a bairro, mês contra mês anterior, onde a loja vende, onde não vende e onde o concorrente está mais perto, com as lacunas no topo. O bairro do ERP faz o papel da região (provisório, a confirmar com o dono).
- **Quem vê:** dono e gerente. Vendedor não (proposta).
- **Onde:** só computador (proposta): tabela à esquerda e painel do bairro à direita. De início, 9 colunas (bairro, classificação, ativos e mês anterior, atrasados, sumidos, leads, concorrentes no bairro, realizado e anterior, margem); as outras pelo botão "Colunas". Com o painel aberto, ficam bairro, classificação, ativos, realizado e margem.
- **O que mostra:**
  - Cabeçalho: o mês "contra setembro", seletor de vendedor (de início, Todos) e o selo "Bairro no lugar da região (provisório)".
  - Faixa "Lacunas": "3 bairros vazios com leads" e "7 clientes ativos sozinhos no bairro", com os nomes, clicáveis.
  - Contagem: nossos, disputados, vazios; o clique filtra.
  - Tabela, um bairro por linha: ativos (e mês anterior), atrasados, sumidos, leads (contatados, convertidos), concorrentes no bairro, % dos ativos com a loja mais perto, realizado (e anterior), margem (R$ e %), classificação; Fase 11: margem descontada a entrega e densidade.
  - Rodapé: total dos bairros, "fora dos bairros" (balcão e clientes sem bairro, só em R$) e total da loja, que fecha com o realizado de V1.
  - Painel do bairro (direita): os clientes, os leads e os concorrentes do bairro.
- **Cliques:** mês; vendedor (os números passam a ser os da carteira dele); nossos, disputados, vazios ou lacunas → filtra; cabeçalho → ordena (padrão: realizado); passar o mouse na classificação → o porquê numa frase do servidor ("3 de 5 ativos têm a loja mais perto; nenhum concorrente no bairro"); bairro ou lacuna → painel; cliente → R2; lead → R7 no bairro; "Ver no mapa" → M2 filtrado.
- **Estados:** vazio ("Nenhuma venda a clientes com bairro em outubro"); antes da Fase 11 (sem colunas de entrega); loja sem coordenada ou sem concorrente (classificação vazia, com o motivo); "sem bairro" (linha própria no fim); nenhuma lacuna (faixa pequena, quieta).

### M4 · Concorrentes

- **Para que serve:** o cadastro dos concorrentes: nome, coordenada digitada, bairro e observação. Põe o concorrente no mapa e alimenta o concorrente mais próximo de cada cliente e a classificação dos bairros.
- **Quem vê:** dono (cadastra, corrige, exclui); gerente (só vê).
- **Onde:** só computador: tabela à esquerda, formulário à direita.
- **O que mostra:**
  - "Concorrentes · 6 cadastrados" e "Novo concorrente".
  - Tabela: nome, bairro, distância até a loja, "é o mais próximo de N clientes ativos", observação, quem cadastrou e quando (maior N primeiro).
  - Formulário: nome; colar "latitude, longitude" e os dois campos; bairro (da lista de bairros do ERP, com busca; campo novo, pergunta 1c); observação; mapa de conferência com a loja, os outros concorrentes e o ponto; Salvar e Excluir.
- **Cliques:** "Novo concorrente" → formulário vazio; linha → formulário; digitar ou colar → o ponto aparece no mapa de conferência; Salvar → como em M1, o servidor confere e devolve a distância até a loja, e o N fica "a calcular" até a próxima atualização; Excluir → "Excluir Fulano? Ele sai do mapa e das contagens"; "Ver no mapa" → M2 centrado.
- **Estados:** vazio ("Nenhum concorrente cadastrado. Cadastre o primeiro para ver o concorrente mais próximo de cada cliente."); coordenada fora do formato; ponto longe da loja (como em M1); gerente (campos só para ver).

### E1 · Entregas do dia (entregador)

- **Para que serve:** a única tela do entregador: a lista dos clientes para entregar, que ele põe na ordem que quiser; ao tocar num cliente, abre a localização no Google Maps ou no Waze.
- **Quem vê:** o entregador (hoje, Ribamar). Ninguém mais; o dono acompanha por E2.
- **Onde:** só celular, uma coluna, alvos grandes para o dedo. Sem moldura nem menu.
- **O que mostra:**
  - Topo: "Entregas de hoje", "8 entregas", "lista atualizada às 10h00" e Atualizar.
  - Uma linha grande por cliente, na ordem escolhida: alça para arrastar, posição, nome, bairro, número do pedido e hora da venda; marca "sem localização" quando falta a coordenada. O Consumidor Final (balcão) não aparece na lista (pergunta 39).
  - Ao tocar: um painel que sobe com o endereço do ERP, o telefone e os botões "Abrir no Google Maps" e "Abrir no Waze".
  - Proposta a confirmar (pergunta 38): botão "Saí para entregar" no topo (grava a saída e as paradas na ordem atual); "Entregue" e "Não entregue" com motivo (ausente, endereço errado, recusou) no painel; "Fechar viagem" no rodapé (grava a chegada), ligado quando todas estão marcadas.
- **Cliques:** arrastar pela alça, ou setas de subir e descer → muda a ordem, gravada no servidor; tocar → painel; Google Maps ou Waze → sai para o aplicativo por link, já no ponto do cliente (o Kaizen não desenha rota nem sugere ordem); sem coordenada → o mesmo link do Google Maps, com o texto do endereço do ERP (proposta); telefone → discador (proposta); Atualizar ou puxar a lista para baixo.
- **Estados:** vazio ("Nenhuma entrega na lista agora", com a hora da última atualização); sem internet (a última lista, com "sem conexão: a lista pode estar desatualizada"); cliente sem localização ("avise a loja"); proposta: viagem fechada ("Viagem fechada às 11h40: 6 entregues, 1 não entregue").

### E2 · Entregas: painel do dono

- **Para que serve:** quanto custa entregar e se as viagens saem cheias, mês contra mês, com os não entregues como exceção. É onde o dono digita o custo por viagem.
- **Quem vê:** dono (digita o custo); gerente (vê, sem editar, proposta).
- **Onde:** só computador (proposta): exceção e números do mês no topo; tabela das viagens com as paradas num painel à direita; custo por viagem num bloco ao lado dos números.
- **O que mostra:**
  - O mês "contra setembro".
  - Exceção: não entregues dos últimos 7 dias (cliente, dia, motivo) e vendas para entrega que não saíram; a faixa some quando não há.
  - Números do mês com o anterior: entregas por viagem; viagens por dia; parte das vendas que é entrega (em quantidade e em R$); custo por entrega; custo de entrega do mês. Hoje: viagens, entregues, não entregues.
  - Tabela das viagens: dia, saída, chegada (gravadas pelo entregador em E1, proposta), entregador, paradas, entregues, não entregues, custo por entrega; o clique abre as paradas à direita.
  - Custo por viagem: o valor vigente e desde quando ("R$ 45,00 desde 01/11/2026"), o histórico e "Alterar". Link "Margem e densidade por bairro" (bairro no lugar da região, provisório).
- **Cliques:** mês; viagem → paradas (cliente, bairro, resultado, motivo, hora); cliente → R2; não entregue por "endereço errado" → "Corrigir localização" → M1 com o cliente aberto; "Alterar" (só o dono) → valor e "vale a partir de"; "Margem e densidade por bairro" → M3.
- **Estados:** nenhuma viagem no mês ("Nenhuma viagem registrada em outubro"); custo por viagem não digitado ("digite o custo por viagem"); primeiro mês ("sem mês anterior"); se o dono não confirmar entregue e fechar viagem, sobra só "parte das vendas que é entrega".

## 8. Cobertura e origem dos números (para quem constrói)

### O que ficou sem tela, e por quê

- Notificação no app com frase: saiu pela decisão de 02/10; a frase vai pelo Telegram, e o histórico fica em A1.
- Regiões desenhadas no mapa e o cliente "sem região": saíram pela decisão de 02/10; o bairro faz o papel (provisório), e "sem região" vira a linha "sem bairro" em M3.
- Localização automática pelo endereço, com grau de certeza, e correção do ponto pelo celular: saíram pela decisão de 02/10; toda localização é digitada em M1 ou R2.
- Curva ABC em outro período (mês fechado, ano): nenhuma tela mostra; todas usam os 90 dias até o dia escolhido, o único período que a Fase 4 calcula (pergunta 13).
- Entregador "escolhe as vendas do dia que vão sair": sem tela de montar viagem; a lista vem pronta do servidor (proposta, pergunta 39).
- Trabalho com o lead (ligar, anotar, mudar etapa): continua no CRM do ERP, como manda o OBJETIVO.
- Os "pronto quando" a reescrever no OBJETIVO: 5a (imagem só nos formatos em que a tela existe); 6 ("o dono recebeu no Telegram uma mensagem real de régua cruzada e um briefing de segunda"); 7 ("tarefa e anotação criadas por um deles no computador aparecem para o dono"); 9 ("todo cliente ativo tem localização, com origem, quem e quando; um vendedor digitou a coordenada de um cliente da carteira dele"); 10 ("o dono cadastrou os concorrentes; cada cliente ativo tem bairro ou está em 'sem bairro'; o mapa filtrado por curva A e atrasado mostra exatamente esses clientes; a lista de lacunas existe; o vendedor clica num ponto e abre o dossiê"); 11 (depende da pergunta 38).

### Cada item do Destino e onde está

| Seção do Destino | Itens e telas que os cobrem |
| --- | --- |
| Vendas | meta da loja e por vendedor (K2, I1, V1); realizado do dia, do mês e projeção (I1, V1); ritmo por vendedor pelo tipo do ERP (V1, V2); ticket, itens por venda, por hora e por dia da semana (V3); carteira: ABC de clientes, RFV, frequência, quem parou de comprar (R1, R2) e distribuição por região, aqui por bairro (R1, M3); venda por vendedor, mix e clientes atendidos (V1, V2) |
| Compras e estoque | curva ABC por valor e por quantidade (C1, C2); giro e cobertura por produto, grupo, marca e fornecedor (C2, C3); encalhe com carência de produto novo (C1, C2, C3); ruptura (C1, C2); custo zero e estoque negativo como saneamento (C1, C2) |
| Financeiro | contas a pagar e folga em 7 e 30 dias contra o saldo digitado (F1, F2, K1); fluxo realizado (F4) e previsto (F2); quebra por turno e forma, gaveta e sangrias (F3); recebíveis de cartão por data de crédito (F1, F2, F4) |
| Alertas e comunicação | vigia de réguas (A1; a frase vai pelo Telegram); briefing semanal (Telegram; histórico em A1); interpretação por IA (bloco em I1, V1, C1 e F1; estado em A1) |
| Relacionamento — vendedor | lista do dia com quatro motivos, valor em risco, 10 nomes e "falei" (R4); cada nome abre o dossiê (R2); réguas configuráveis (A1, grupo Lista do dia); tarefas e anotações (R2, R3); mapa da própria carteira (M2) |
| Relacionamento — gerência | ativos, retenção, novos e de lead, ticket e itens por venda, por loja e por vendedor (R5); margem por cliente, produto e vendedor (R6, C3); leads por bairro (R7, M3); corte por região, aqui por bairro (R5, R6, M3); margem descontada a entrega e densidade (M3, R6, R5) |
| Dossiê | camada dura (R2); camada mole em quatro blocos, com origem, fato e opinião separados, apagar e corrigir (R2, Fase 12); depoimento digitado ou em áudio gravado no computador (R2) |
| Mapa, regiões e concorrentes | localização da loja e de cada cliente, com quem e quando (M1, R2); região, aqui bairro (M3); concorrentes (M4, M2); concorrente mais próximo e distância (M1, M2, R2); mapa com filtros combinados (M2); por bairro: nossa, disputada ou vazia, e lacunas (M3); vendedor vê só a carteira (M2, M1) |
| Entregas | entregador só no celular, ordena e abre no Google Maps ou no Waze (E1); saída, entregue, não entregue e fechar viagem (E1, proposta); indicadores e custo por viagem (E2); margem descontada a entrega e densidade por bairro (M3, R6) |
| Perfis de acesso | dono, gerente, vendedor e entregador, cada um na sua porta (G1, G2, P1); ninguém se cadastra sozinho (G1, P1); dono digita metas, saldo, feriados, carteira, concorrentes e custo por viagem (K2, K1, R1, M4, E2); gerente vê a loja inteira, sem digitar metas nem saldo (seção 3) |

### De onde vem cada número

A chave da resposta da Fase 4 vem entre crases (`vendas.mes.realizado`). **"5b acrescenta"**: a Fase 4 não entrega aquele número pronto, e o servidor da 5b calcula e entrega. **"Fase N"**: nasce naquela fase. **"Digitado"**: alguém digita no Kaizen. **"Caso raro"**: estado de dado antigo ou de teste, que a construção trata e o desenho não precisa mostrar.

| Tela | De onde vem |
| --- | --- |
| G2 | hora da atualização — coluna `calculado_em` de `kaizen.resposta`, que não é chave do JSON; a escolha da mais antiga das três: 5b acrescenta. Próxima atualização (de hora em hora, das 8h às 19h, e às 22h, de segunda a sábado) e estado desatualizado — 5b acrescenta, pelo registro de cada atualização (`kaizen.execucao`); regra proposta: desatualizado quando a última atualização agendada falhou ou foi pulada, ou quando os números de hoje têm mais de 70 minutos, entre 8h e 19h. Dias do calendário — datas com resposta gravada; dias fechados de `kaizen.feriado`. |
| G1 | nenhum número; no estado sem acesso, só o e-mail usado (login do Firebase). |
| I1 | Vendas — `vendas.mes.dias_uteis_decorridos`, `.dias_uteis`, `.realizado`, `.meta`, `.percentual_meta`, `.ritmo`, `.projecao`, `.sem_vendedor`; `vendas.dia.realizado`; `vendas.vendedores[].nome` e `.ritmo`; projeção menos meta, "um dia como hoje até esta hora", quem está abaixo do ritmo e o estado: 5b acrescenta. Compras — `compras.compras_por_classe` (A, B, C, `sem_venda`), `.encalhe`, `.ruptura.produtos`, `.estoque_conhecido`; total comprado e estado: 5b acrescenta. Financeiro — `financeiro.folga_7`, `.folga_30`, `.saldo_banco`, `.contas_a_pagar.vencidas` e `.ate_7_dias` (cada um com `parcelas` e `valor`); quebra do último fechamento — `financeiro.caixa.fechamentos[].quebra` dele; se hoje ainda não fechou, o servidor busca o último dia com fechamento (5b acrescenta); estado: 5b acrescenta. |
| V1 | `vendas.mes`: `realizado`, `meta`, `percentual_meta`, `ritmo`, `projecao`, `dias_uteis`, `dias_uteis_decorridos`, `vendido`, `devolucoes`, `sem_vendedor`; `vendas.dia`: `vendido`, `devolucoes`, `realizado`, `vendas`, `sem_vendedor` (o dia não tem meta, ritmo, projeção nem dias úteis); `vendas.vendedores[]`: `nome`, `ritmo`, `realizado_mes`, `meta`, `realizado_dia`, `vendas_mes`, `clientes_atendidos`; `vendas.outros`: `realizado_mes`, `realizado_dia`, `vendas_mes`. Falta para a meta, diferença da projeção, dias que faltam, R$ por dia restante, % e estado de cada vendedor, série do gráfico e meta proporcional: 5b acrescenta (a série sai das respostas gravadas de cada dia do mês). |
| V2 | `vendas.vendedores[]`: `codigo`, `realizado_mes`, `meta`, `ritmo`, `realizado_dia`, `vendas_mes`, `clientes_atendidos`, `mix[].grupo` e `mix[].realizado` (sem nome na spec; estão em `sql/regras/vendas.sql`). %, falta, estado, parte de cada grupo e mix da loja: 5b acrescenta. Clientes atendidos com nome: Fase 8. Caso raro: em dia passado, a lista de vendedores segue o tipo de hoje no ERP, não o da época. |
| C1 | `compras.periodo`, `.compras_por_classe`, `.encalhe` (`produtos`, `valor`), `.ruptura.produtos`, `.abc_valor`, `.abc_quantidade`, `.giro_por_grupo`, `.estoque_conhecido`; `.estoque_negativo` e `.custo_zero` (listas). Total comprado, partes, contagem das listas, comparação com 30 dias antes, estado, os 5 primeiros de cada cartão e a escolha dos 5 grupos de maior cobertura: 5b acrescenta. Custo zero fica sem comparação: `compras.custo_zero` olha o cadastro de hoje, e a atualização da noite refaz os dias passados com ele, então a diferença daria sempre zero; se o dono quiser a comparação, a 5b passa a guardar uma foto por dia (proposta). |
| C2 | `compras.produtos[]` (as 12 colunas: `codigo`, `descricao`, `classe_valor`, `classe_quantidade`, `liquido`, `quantidade`, `estoque`, `estoque_medio`, `giro`, `cobertura_dias`, `encalhe`, `ruptura`); `compras.giro_por_grupo`, `.giro_por_marca`, `.giro_por_fornecedor` (`nome`, `quantidade`, `estoque_medio`, `giro`, `cobertura_dias`); `.estoque_negativo`, `.custo_zero`. Grupo, marca e fornecedor de cada produto; produtos, R$ e produtos em encalhe por grupo, marca e fornecedor; valor parado, última venda, marca "novo", lista dos comprados, contagem das visões e totais do filtro: 5b acrescenta. Caso raro: produto só do ERP anterior ("só no ERP anterior", sem custo nem estoque). |
| C3 | `compras.produtos[]` do produto. Cadastro, valor parado, comparação, venda por mês, estoque por dia, entradas, primeira entrada e última venda: 5b acrescenta (consulta do produto, na hora do pedido). Margem e clientes: Fase 8. Caso raro: produto só do ERP anterior. |
| F1 | `financeiro.folga_7`, `.folga_30`, `.saldo_banco` (`valor`, `data`), `.contas_a_pagar` (`vencidas`, `ate_7_dias`, `ate_30_dias`, `total`), `.fluxo_previsto[]`, `.caixa.fechamentos[].quebra`, `.caixa.gaveta.gaveta`, `.fluxo_realizado.mes`, `.recebiveis_cartao`, `.fonte`. Quanto o saldo precisa cobrir, estado das folgas, folga de 7 dias atrás, idade do saldo, saldo previsto por dia, último fechamento (como em I1) e comparação do fluxo: 5b acrescenta. |
| F2 | `financeiro.contas_a_pagar` (as faixas e `por_vencimento[]`), `.saldo_banco`, `.folga_7`, `.folga_30`, `.fluxo_previsto[]` (`data`, `entradas`, `saidas`). Total contra 7 dias antes, saldo previsto por dia e seu estado, e cada parcela: 5b acrescenta. |
| K1 | último saldo — `financeiro.saldo_banco`; histórico — digitado (`kaizen.saldo_banco`); quem digitou e há quantos dias — 5b acrescenta; folgas depois de salvar — `financeiro.folga_7` e `.folga_30` da próxima atualização; se o dono escolher "recalcular na hora" (pergunta 9), o servidor recalcula a resposta de hoje ao salvar, aqui e em K2. |
| F3 | `financeiro.caixa.fechamentos[]` (`codigo`, `quebra`, `formas[]` com `forma`, `calculado`, `informado`, `quebra`); `financeiro.caixa.gaveta` (`vendas_dinheiro`, `suprimentos`, `sangrias`, `devolucoes_dinheiro`, `gaveta`). Caixa, operador, horários, soma do dia, último dia com fechamento, lista de sangrias, estado (tolerância provisória) e visão do mês: 5b acrescenta. Casos raros: dia com dois turnos (ERP anterior, até maio); 28/09/2026 (−R$ 93,50 vêm de dois turnos de teste de 26/09). |
| K2 | metas — digitado (`kaizen.meta`); vendedores da lista — `kaizen.funcionario` do tipo vendedor, na última atualização; realizado dos meses anteriores — `vendas.mes.realizado` e `vendas.vendedores[].realizado_mes` no último dia de cada mês; soma e diferença — 5b acrescenta; dias fechados — digitado (`kaizen.feriado`, que já tem 01/05, 07/09 e 26/09/2026); dias úteis — `vendas.mes.dias_uteis` (meses futuros: 5b acrescenta). |
| V3 | `vendas.mes.ticket_medio`, `.itens_por_venda`, `.vendas`; `vendas.dia.ticket_medio`, `.itens_por_venda`; `vendas.por_hora[]` (`hora`, `vendas`, `realizado`); `vendas.por_dia_da_semana[]` (`dia_da_semana`, `vendas`, `realizado`). Mês anterior (as mesmas chaves no último dia dele), diferenças, parte de cada hora e média por dia aberto: 5b acrescenta. |
| F4 | `financeiro.fluxo_realizado.dia` e `.mes` (`entradas` por forma e `saidas`); `financeiro.recebiveis_cartao`. Série diária, totais, resultado, comparação e contas baixadas em cada dia: 5b acrescenta. Caso raro: setembro com as duas fontes ("até 25/09 ERP anterior, desde 26/09 ERP novo"). |
| A1 | valores de agora — as chaves de cada indicador (`vendas.mes.ritmo`, `vendas.vendedores[].ritmo`, `compras.encalhe.valor`, `compras.ruptura.produtos`, `financeiro.folga_7`, `financeiro.contas_a_pagar.vencidas.valor` e as outras); contagem das listas, quebra do dia, idade do saldo e ruptura da curva A — 5b acrescenta; estado, prévia, histórico e avisos — Fase 6; falhas e resumo da noite — `kaizen.execucao` (já existe); réguas da lista do dia — digitado (Fase 8). |
| R4 | a lista, o motivo, a frase, o valor em risco, os dias e o intervalo, o orçamento, o produto que faltou, o andamento e "fora da lista" — Fase 8 (a frase chega pronta do servidor); "falei" e tarefas — digitado. |
| R2 | nome, telefone, endereço e bairro — lidos do ERP (Fase 7); vendedor, tarefas e anotações — digitado (Fase 7); última compra e realizado em 90 dias — Fase 7; situação, ABC, RFV, intervalo, valor em risco, tendência, ticket, horário, margem, o que compra, curva A nunca comprada (sobre `compras.produtos[].classe_valor`), orçamentos e compras — Fase 8; coordenada — digitado (Fase 9); distância — Fase 9; concorrente mais próximo — Fase 10; camada mole — Fase 12 (texto; nenhum número sai dela). |
| R1 | carteira por vendedor, sem carteira, total, última compra, realizado em 90 dias, sugestão e tarefas abertas — Fase 7; bairro — `kaizen.pessoa`; telefone e endereço — lidos do ERP (Fase 7); ABC, RFV, situação (com "não voltou"), intervalo, valor em risco, tendência, margem e totais do filtro — Fase 8; sem coordenada — Fase 9. |
| R3 | tarefas e anotações — digitado (Fase 7); contagens e dias de atraso — Fase 7. |
| P1 | funcionários — `kaizen.funcionario` (código, nome, tipo, ativo); pessoas, perfis e ligações — digitado (Fase 7); clientes na carteira, último acesso e sugestão pelo e-mail — Fase 7. |
| R5 | ticket e itens da loja — `vendas.mes.ticket_medio` e `.itens_por_venda` (o mês anterior: as mesmas chaves no último dia dele); clientes atendidos por vendedor — `vendas.vendedores[].clientes_atendidos`; clientes atendidos de Outros, Sem carteira e da Loja — Fase 8 (a Fase 4 só entrega por vendedor); ativos, retenção, novos, de lead, margem, atrasados, sumidos, sem carteira, andamento das listas, leads, ticket e itens por vendedor, diferenças e estados — Fase 8; corte por bairro — Fase 10; custo de entrega — Fase 11. |
| R6 | tudo Fase 8, com o custo gravado no item da venda; itens com custo zero na venda — Fase 8 (diferente de `compras.custo_zero`, que olha o cadastro atual); por bairro — Fase 10; descontada a entrega — Fase 11. |
| R7 | tudo Fase 8, sobre os leads lidos do CRM do ERP desde a Fase 7; o bairro vem do endereço da pessoa vinculada ao lead; "contatado" segue a regra que o dono escolher (pergunta 31). |
| M2 | pontos e contagens já filtrados — Fase 10 (a tela não filtra nem conta); sem localização — Fase 9; situação, ABC, RFV e valor em risco — Fase 8; vendedor — Fase 7; distância — Fase 9; concorrente mais próximo e "mais próximo de N clientes" — Fase 10; posições — digitado (M1 e M4). |
| M1 | ativos sem localização — Fase 9 (o servidor conta, sem o Consumidor Final); situação, dias sem comprar e valor em risco — Fase 8; vendedor — Fase 7; endereço e bairro — lidos do ERP (Fase 7); coordenada, de onde veio, quem e quando — digitado; conferência do formato e da distância, distância até a loja e contador novo — Fase 9, devolvidos ao salvar; concorrente mais próximo — Fase 10. |
| M3 | lacunas, classificação, % com a loja mais perto, concorrentes no bairro e realizado por bairro — Fase 10; ativos, atrasados, sumidos e margem — Fase 8, cortados por bairro na 10; leads por bairro — Fase 8; total da loja — `vendas.mes.realizado`; margem descontada e densidade — Fase 11. |
| M4 | cadastro — digitado; distância até a loja (devolvida ao salvar) e "mais próximo de N" — Fase 10. |
| E1 | lista, pedido, hora da venda, cliente, bairro, endereço e telefone — Fase 11, lidos do ERP; coordenada — digitado (M1); ordem — digitado pelo entregador; saída, chegada e resultado das paradas — digitados pelo entregador (proposta, pergunta 38); hora da lista — a última atualização das vendas. |
| E2 | indicadores de entrega, viagens e paradas — Fase 11; saída e chegada — gravadas pelo entregador em E1 (proposta, pergunta 38); dias úteis — `vendas.mes.dias_uteis_decorridos`; base da parte das vendas que é entrega — `vendas.mes.vendas` e `vendas.mes.realizado`; custo por viagem — digitado. |

## 9. Perguntas para o dono

Responda pelo número. Onde há proposta, ela vale até a resposta. As de "Antes de desenhar" mudam as telas da 5b; as outras ficam para a conversa de cada fase.

**Antes de desenhar**

1. Usar o bairro do endereço do cliente no ERP no lugar da região desenhada: o senhor confirma? Se quiser regiões maiores, aceita uma lista "bairro → região" digitada, sem desenho? Se a resposta for sim:
   - 1a. O bairro no ERP é texto livre ("Cohab Anil" e "COHAB ANIL"). Proposta: o servidor junta os que só diferem em maiúscula, acento e espaço, e o resto o senhor corrige no cadastro do ERP. Ou prefere um cadastro de equivalências no Kaizen?
   - 1b. Com bairro, um "bairro vazio" só aparece onde há cliente ou lead. Serve, ou quer uma lista digitada dos bairros de São Luís para ver também onde não há ninguém?
   - 1c. O concorrente ganha um campo "bairro" no cadastro? Sem ele não há como contar concorrentes por bairro nem classificar o bairro.
   - 1d. O ERP não entrega o endereço do lead. A equipe digita coordenada e bairro dos leads, ou só contam os leads ligados a uma pessoa com endereço?
2. Confirma a lista do celular da seção 3? Em especial: Metas e feriados, Padrões de venda, Estoque e giro, Fluxo realizado, a visão do mês do Caixa, Réguas, Mapa e Margem só no computador. No celular, o dossiê é só para ver, mais apagar linha da camada mole (proposta), ou também escrever anotação e tarefa? E Pessoas e acesso: só a lista com "Bloquear", para cortar um acesso na hora, ou nada (proposta)?
3. O OBJETIVO diz que a gerente vê a loja inteira, menos digitar metas e saldo. Isso vale para o Financeiro, ou o senhor quer esconder alguma parte dele?
4. Quer o "Esqueci a senha"? O Firebase manda o e-mail de troca de graça.
5. Réguas iniciais. Elas dão o estado das três perguntas já na 5b e viram as réguas da Fase 6. Proposta:
   - Vendas: ritmo da loja de 1 ou mais no lugar, atenção de 0,90 a 0,99, fora abaixo de 0,90; ritmo de vendedor abaixo de 0,80; projeção abaixo da meta; item sem vendedor acima de 0.
   - Financeiro: fora com folga em 7 dias negativa; atenção com folga em 30 dias negativa; contas vencidas acima de R$ 0.
   - Compras: comprados sem venda a partir de quantos produtos? Ruptura de curva A acima de 0.
   - Caixa: quebra acima de R$ 5, para mais ou para menos.
   - Saldo do banco: "velho" depois de 3 dias.
6. O ritmo aparece como número (0,93) ou como frase ("7% atrás do ritmo")?
7. A pergunta 2 do Início (compras) continua em número de produtos (as notas do ERP anterior não têm valor) ou passa a reais comprados, que só existem desde 28/09?
8. Saldo do banco: um número só, somando as contas da loja, ou um por conta (banco, conta da maquininha)? O dinheiro no cofre ainda não depositado entra?
9. Ao salvar o saldo do banco, a meta ou os dias fechados, a mudança aparece na próxima atualização (proposta), ou o servidor recalcula os números de hoje na hora?

**Para a Fase 5b**

10. Pode mudar a meta ou os dias fechados de um mês que já passou? Isso muda o ritmo e a projeção de todos os dias daquele mês.
11. A meta da loja continua independente da soma das metas dos vendedores, como hoje (a diferença é a parte de quem não é vendedor no ERP)?
12. Padrões de venda olham o mês até o dia, como a Fase 4 calcula, ou uma janela maior, como as últimas 8 semanas?
13. A curva ABC precisa de outro período além dos 90 dias até o dia (mês fechado, ano)?
14. As listas de saneamento (custo zero e estoque negativo) vão para alguém da loja corrigir no ERP? Se sim, precisa de botão para baixar ou imprimir?
15. A previsão dos 30 dias conta só o que é certo (contas e o cartão de amanhã, proposta), ou também uma estimativa das entradas de Pix e dinheiro pelas vendas projetadas?

**Para a Fase 6**

16. Régua cruzada: o aviso sai uma vez quando cruza e uma vez quando volta (proposta), ou um lembrete diário enquanto continuar cruzada?
17. Briefing semanal na segunda às 7h (proposta)? O que não pode faltar nele?
18. A IA (API do Claude) é cobrada por uso e pede crédito pago, o que esbarra na regra "nenhum serviço com cartão". O senhor aceita esse custo? O texto da IA sai uma vez por dia, de manhã (proposta, mais barato), ou a cada hora?
19. A gerente recebe algum aviso pelo Telegram (tarefas atrasadas, clientes sem carteira), ou só o senhor?

**Para a Fase 7**

20. A porta da gerente é o Início das três perguntas ou, a partir da Fase 8, a Lista do dia da equipe?
21. Gerente e vendedores usam computadores próprios ou o mesmo da loja? Se for o mesmo, o acesso termina ao fechar o navegador.
22. Login por e-mail e senha: o Kaizen cria a conta e o Firebase manda "defina sua senha" (proposta), ou o senhor continua criando no console do Firebase?
23. A gerente pode passar um cliente "sem carteira" para um vendedor, ou só o senhor mexe na carteira? E os clientes em risco sem carteira viram a lista "Sem carteira", que ela vê e onde pode marcar "falei"?
24. Só funcionário do tipo vendedor no ERP recebe carteira, como na meta, ou a Erleide também pode ter clientes?
25. Gerente e dono podem criar tarefa num cliente para o vendedor da carteira ("Igor, ligue para a Marcenaria X")? Proposta: sim.
26. O que o vendedor vê dos clientes: quanto, em R$, cada um comprou em 90 dias (proposta: sim); a margem (proposta: não); o dossiê de um cliente de outra carteira, ou sem carteira, quando ele liga (proposta: não)?

**Para a Fase 8**

27. Ativos, retenção e novos "por vendedor" contam pela carteira (proposta) ou por quem vendeu? Ticket, itens e margem contam por quem vendeu (proposta).
28. No mês em andamento, comparar com o mês anterior inteiro ou só até o mesmo dia útil?
29. A lista do dia é fixada de manhã ou muda de hora em hora? Quando um nome sai por "falei", entra o próximo até completar 10?
30. Além de "Falei", quer um "não atendeu", que deixa o nome na lista? O texto do "falei" fica opcional (proposta)?
31. O que conta como lead "contatado": qual etapa ou status do CRM, ou ter próximo contato marcado?
32. O vendedor vê a tela de Leads? Proposta: não, ele trabalha o lead no CRM do ERP.

**Para a Fase 9**

33. Quem digita a coordenada do cliente: o vendedor (na carteira dele), a gerente e o senhor? O Ribamar passa o que coleta nas visitas para alguém digitar?
34. Coordenada muito longe da loja: o Kaizen recusa ou só avisa? Proposta: avisar acima de 60 km.
35. "Cliente ativo" na fila de Localizações: ativo no mês ou quem comprou nos últimos 90 dias (proposta)?
36. Aceitar colar o link de localização que o WhatsApp gera, para o servidor tirar a coordenada dele (proposta)?

**Para a Fase 10**

37. O vendedor vê os concorrentes e a observação deles no mapa da carteira?

**Para a Fase 11 (a 38 antes de desenhar E2)**

38. O senhor confirma "Saí para entregar", "entregue / não entregue com motivo" e "fechar viagem"? Sem eles não existem entregas por viagem, viagens por dia, custo por entrega, margem descontada e densidade.
39. De onde vem a lista do entregador: das vendas do dia a clientes cadastrados, mais as de ontem não entregues (proposta), ou da marcação de entrega no pedido do ERP, se a loja passar a preencher? A venda de balcão (Consumidor Final) que sai para entrega fica fora da lista (proposta)?
40. A lista depende da atualização das vendas, de hora em hora: uma venda das 9h05 só aparece às 10h. Aceita, ou a Fase 11 lê as vendas do dia com mais frequência?
41. Custo por viagem: um valor só para todas as viagens, com a data a partir da qual vale? A gerente vê o custo de entrega?
42. O entregador precisa ver o valor do pedido (por exemplo, para receber em dinheiro na entrega)?
43. O Ribamar está cadastrado como funcionário no ERP? Se não estiver, o login dele fica sem funcionário ligado.

**Para a Fase 12**

44. Na camada mole do dossiê, a gerente também apaga e corrige linhas?
45. O depoimento por áudio, gravado pelo microfone do computador, entra como o OBJETIVO pede, ou só texto?
