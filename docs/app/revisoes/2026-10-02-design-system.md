# Revisão do Design System do Kaizen (versão 1790980055-eb38)

02/10/2026. Juntei os achados das 4 frentes de revisão e conferi pessoalmente cada um dos graves: abri os arquivos publicados, refiz as contas e medi as pranchas num navegador (Chromium). Scripts e medições em `/tmp/claude-0/kaizen-revisao-ds/consolidacao/` (`medir.js`, `alturas.js`). **FATO** = conferi no arquivo ou medi. **OPINIÃO** = recomendação minha.

## a) Veredito

1. **Ainda não dá para seguir para as telas.** Três problemas passariam sozinhos para todas elas.
2. **Corrigir antes:** a regra da folha de estilo que desmonta botões, chips e abas; a cor de estado usada na situação do cliente e na curva ABC; e decidir o cartão de pergunta (o v2 contradiz a TELAS).
3. **Depois disso**, com os dados de exemplo acertados, as telas podem começar. Basta uma rodada de correção (prompt pronto em `PROMPT-CORRECAO.md`); o resto entra na mesma rodada.

## b) O que está bom (FATO)

- **Cores:** as 22 razões de contraste do README batem com o meu cálculo (diferença máxima 0,05). Não há verde em token, regra ou prancha; "no lugar" é cinza, com um traço.
- **Letra:** Inter 400 a 700; algarismos tabulares funcionam ("1111" e "0000" com a mesma largura); nenhuma regra do computador pede menos de 13 px.
- **Larguras:** menu 240 px, conteúdo até 1600, texto corrido até 720, linha de tabela 36 px (medido).
- **Sem dependência de programa:** o `bundle.js` tem 4 linhas e nenhuma prancha precisa dele; ícones desenhados dentro da página.
- **Contas certas:** folga 41.300 − 33.100 = 8.200; ritmo da loja 92,4 ÷ (150 × 17/26) = 0,94; tabela 9.900 + 6.480 + 2.140 + 3.580 + 11.000 = 33.100; curvas 44,0/26,7/20,7/8,7% de 150; dias da semana, sinal de menos e percentual com uma casa certos.
- **Textos e gráficos:** carregando, vazio e erro como pedidos; gráficos sem pizza e sem legenda, projeção pontilhada. Contagens de estilo escrito à mão batem com o README (241).

## c) Respostas do Claude Design que NÃO conferem com os arquivos

| O que ele respondeu | O que os arquivos mostram (FATO) |
| --- | --- |
| "Nenhum par usado abaixo do mínimo" de contraste (README:165) | Cinco pares reprovam: projeção sobre a trilha 2,62:1; curva C e borda de campo 1,72:1; números atrás do aviso de erro 3,21:1; link no mouse na linha selecionada 4,38:1 |
| "Nada abaixo de 13 px no computador" (README:183) | Vale para o que está escrito na folha; na tela, os 30 textos dos gráficos aparecem com 12,3 px |
| No celular, só a barra de baixo (12 px) e o calendário (13 px) ficam abaixo de 14 (README:183) | Também: rótulos da barra de meta e texto da dica (13 px); links e botões com 19, 24 e 32 px, menos que os 44 pedidos |
| Menu: "grupos e itens exatamente os do pedido" (README:215) | Os grupos estão certos, mas só 6 dos 22 itens existem na prancha |
| Dados "todos usados como mandou" (README:271) | O cartão diz "13 produtos" parados (são 38); vendas por dia somam R$ 85,0 mil (o realizado é 92,4); o saldo só chega a R$ 8,2 mil em 29/10 |
| Por vendedor, só a Daniele fica errada, 0,84 (README:271) | O Igor também: R$ 51,3 mil dá 1,05. Nenhum par dá 1,04 e 0,82 somando R$ 92,4 mil sem uma linha "Outros" |
| "Com os dois arquivos e a fonte, o bundle funciona numa página comum" (README:224) | Botões perdem margem e borda; a receita de 20 linhas não gera a variável da fonte e tudo cai em Times New Roman; o cartão antigo perde o estilo |
| Botões "estourados": "é o próximo da fila", na prancha Botões (README:207) | A causa é uma regra de base da folha (bundle.css:14), que atinge 8 componentes |
| "Cor só para estado" e "estado sempre com três sinais" (README:19-20) | Há cor em cliente sumido/atrasado e em "sem venda"; há estado só com cor (B2 e item 1) |
| Bloco da IA "aberto, recolhido, indisponível: feito" (README:211) | O "aberto" é publicado fechado, e o texto dele faz contas |
| "Todo botão só de ícone tem nome acessível" (README:220) | O "i" da dica no computador não tem nome |
| "Só a página de amostra ainda usa o cartão v1" (README:270) | Moldura do celular e Estados de tela também; e o v1 perdeu o estilo: Daniele (fora) sai em azul |
| Calendário sem o limite de 01/04/2026 (README:195) | O README confere, mas a nota da prancha diz que o limite está desenhado |
| "30 cores base + 24 semânticas"; "classe = .k- + nome" | São 29 + 28 = 57; `.k-marca-kaizen` e `.k-rotulo-celular` não existem |

Conferem: Inter e tabulares, as cores de destaque e de estado, as larguras, os ícones Lucide na página, nada depende de React, tokens.css não publicado, menu sem versão recolhida, contagens de estilo escrito à mão.

## d) Problemas, do mais grave ao menos grave

### Bloqueiam (3)

**B1. Botões, chips e abas desmontados por uma regra da folha.** FATO: a regra geral de botão (bundle.css:14) tem mais força que a do botão (:319), do chip (:304), da aba (:293), de "Limpar filtros" (:310) e da conta (:76). Medido: "Salvar" e "Cancelar" com margem interna de 0 px (em vez de 16), sem borda (em vez de 1 px) e letra 400 (em vez de 500); a aba escolhida perde o sublinhado azul; nos chips o "×" escapa 6 px. Pedir: regra geral que qualquer componente vença; botão-link sem sublinhado no mouse.

**B2. Cor de estado na situação do cliente e na curva ABC.** A TELAS.md:33 proíbe. FATO: tokens.json:128, :153, :248 e :263 dão o pino "atrasado" em âmbar e o "sumido" em vermelho; a Marca de estado mostra "Atrasado 12 dias" em âmbar e "Sumido há 60 dias" em vermelho; a lista "Clientes sumidos" e a ficha ("Sumido há 74 dias") saem em vermelho; "13 sem venda" sai em vermelho na barra das curvas. OPINIÃO: bloqueia porque o Claude Design aplica o tokens.json sozinho nas telas, e a barra das curvas está na própria I1.

**B3. O cartão de pergunta v2 contraria a TELAS (decisão).** FATO: o título é só "Vendas", sem a pergunta; "Ver o desvio ›" e os nomes só aparecem aberto (CartaoPergunta/preview.html:18; bundle.css:169-170); o cartão inteiro é um "botão" com 8 links dentro, que o leitor de tela lê como um botão só. O prompt (linha 51) e a TELAS (linhas 133, 259, 264) pedem título e "Ver o desvio ›" abrindo a tela e a linha de exceção com nomes no cartão. A TELAS ficou contraditória: a linha 112 (animação, 02/10) já fala em "abrir o cartão". Cliques na seção f.

### Corrigir (17)

1. **Estado sem os três sinais (cor + ícone + palavra).** FATO: "Daniele 0,82" e "0 un." em vermelho com ícone, sem a palavra (CartaoPergunta:46, :54); "−0,06" e "+8 produtos" só com cor (NumeroGrande:19, :21); nos gráficos, "ritmo 0,94", "−R$ 3,4 mil" e a barra da Daniele só com cor; a linha "Loja", em atenção, sem marca (IndicadorMeta:19). Pedir uma marca curta: "Fora 0,82".
2. **A IA e a tela fazendo contas.** FATO: a IA escreve "vendeu 18% a menos" (a conta 1 − 0,82) e "a diferença vem quase toda da Daniele" (nenhum número entregue diz isso) (BlocoIA:18); o bloco "aberto" sai fechado; o formulário mostra "o ritmo do Igor passa de 1,04 para 1,30" (Formulario:27), número novo calculado na tela.
3. **Números do cartão e dos vendedores.** FATO: Compras aberto diz "13 produtos · R$ 24,6 mil parados", são 38 produtos (CartaoPergunta:55); Igor 51,3 ÷ (75 × 17/26) = 1,05; com 1,04 e 0,82 e metas de R$ 75 mil, os dois somam no máximo R$ 91,7 mil (falta "Outros"); projeções 79,5 + 62,7 = R$ 142,2 mil, não 143,8.
4. **Gráficos e amostra com números que não fecham.** FATO: vendas por dia somam R$ 85,0 mil, vendem nos domingos 04, 11, 18 e no feriado de 12/10 e marcam zero em 03, 08, 14 e 20/10; o saldo começa como "hoje" com o saldo de 20/10, está em R$ 21,7 mil em 28/10 (folga pedida R$ 8,2 mil) e fica negativo em 31/10; "Vendas hoje" compara até 14h05 com a média do dia inteiro, em R$ contra "24 vendas"; a amostra mostra "números das 13h05" ao lado de "Atualizado às 14h05".
5. **Contraste abaixo do mínimo** (FATO, norma WCAG): projeção sobre a trilha 2,62:1 (1,49:1 encostada no azul); barra do Igor no gráfico 2,62:1; curva C contra o branco 1,72:1; borda de campo em repouso 1,72:1; números atrás do aviso de erro 3,21:1. Mínimo: 3:1 para barras, 4,5:1 para texto.
6. **Cartão antigo (v1) sem estilo em três pranchas.** FATO: Moldura do celular, Estados de tela e Página de amostra usam classes que não existem mais. Medido: texto colado ("R$ 92,4 mil61,6% da meta") e "Daniele 0,82" (fora) no azul de link.
7. **Celular** (FATO, medido): letra abaixo de 14 px nos rótulos da barra de meta e na dica (13), barra de baixo (12), calendário (13); alvos abaixo de 44 px: Igor e Daniele com 19 px de altura, "Ver o desvio" 24 px, setas do mês 32 px de largura; moldura com largura fixa de 390 px (bundle.css:108), que rola para o lado em telefones de 360 e 375 px.
8. **Letra dos gráficos encolhe com a caixa** (FATO): 12,3 px na prancha; num celular, cerca de 7,5 px.
9. **Lista-detalhe com as colunas trocadas** (FATO, medido): valor à esquerda, nome à direita e desalinhado de uma linha para outra (bundle.css:279, :284).
10. **Prancha do indicador desatualizada** (FATO): trilha termina na meta (no v2 vai até 120%); a projeção do Igor (106% da meta) passa 28 px além da trilha; "Loja" sem o estado de atenção.
11. **Menu** (FATO): só 6 dos 22 itens existem; os grupos abrem e fecham, o que soma 1 clique ("menu → Metas e feriados" passa de 1 para 2).
12. **Faixas e calendário** (FATO): "sem conexão" sem "Tentar de novo"; "dia passado" sem "calculado em … às …"; "loja fechada" diz "não abriu em domingo … Ver sábado" (a TELAS pede "Loja fechada neste dia; os números do mês continuam"); calendário sem o limite de 01/04/2026; seletor sem destaque quando o dia não é hoje.
13. **Para o app usar a folha** (FATO): tokens.css não publicado; sem a variável da fonte, a página cai em Times New Roman; painel lateral e véu presos ao topo da página (bundle.css:373, :377) somem quando ela rola.
14. **Variantes do cartão que faltam** (FATO): Financeiro aberto; "sem dado" com "Digitar saldo"; "sem meta" com "Cadastrar meta"; "saldo velho" em atenção (TELAS:264).
15. **Dica de definição** (FATO): o "i" do computador não tem nome; o balão abre por cima do número que explica.
16. **Abas e visões** (FATO): as visões prontas não têm a contagem pedida (prompt, item 14); viraram seletor de período.
17. **Animação** (FATO): a regra de 02/10 (TELAS:112: 150 e 200 ms, nada com "reduzir movimento") é posterior ao Design System e não está nele.

### Menores (14), na mesma rodada

1. `.k-marca-kaizen` e `.k-rotulo-celular` não existem; a Fundamentos esconde isso com estilo escrito à mão. 2. Texto com "30 + 24" cores e "15:1" (real 14,17 e 14,56). 3. Cor fora da regra: botão de perigo vermelho, quadrados âmbar e vermelho na capa, curva A no azul de ação. 4. Link no mouse sobre linha selecionada 4,38:1; anel de foco na faixa escura 2,88:1. 5. Sem tabulares na frase-resumo e nas marcas com número. 6. Tabela: rótulos 18 px antes dos números, "5 contas" no vazio, menu "Colunas" não desenhado. 7. Abaixo de ~1410 px a barra de cima rola para o lado. 8. "Meu perfil" no menu da conta, tela que não existe. 9. Pranchas sem as folhas de estilo: fora do editor abrem sem estilo. 10. Google Fonts é a única dependência externa; a fonte pode vir de dentro do app (48 KB). 11. "Vendedores fora do ritmo" lista o Igor (1,04). 12. Estados de tela desenhados num cartão, não na moldura. 13. "Relacion." abreviado; jargão nas notas ("hover", "sticky", "tooltip"); ids repetidos no formulário. 14. Réguas inventadas no Número grande (R$ 5 mil; "30 do mês passado") sem registro.

### Descartados, rebaixados ou juntados na conferência

- **Descartado:** "R$ 6,2 mil abaixo da meta" como conta da IA: a TELAS (I1:261, "quanto fica abaixo ou acima da meta") prevê esse número pronto do servidor. **Em parte:** a margem branca da página some com a classe `k-raiz` no corpo (bundle.css:7-8); basta o README dizer.
- **Rebaixados de "bloqueia" para "corrigir":** tokens.css (não impede desenhar as telas, o Claude Design gera as variáveis; impede o app, na 5b) e bloco da IA (só entra na Fase 6; o conserto é trocar um texto). **Para "menor":** pranchas sem as folhas de estilo; título da lista de exceções.
- **Ajustado:** "Compras vai a 4 cliques" é fato pelo caminho I1 → C1 → C2 → C3, mas o produto encalhado continua a 3 pelo atalho do encalhe: o limite se cumpre, sem folga. **Juntados:** botões (2 frentes), cartão v1 (4), cor em cliente (3), "13 produtos" (3), celular (4).
- **Para o orquestrador registrar em DECISOES.md** (vem do pedido, não do Claude Design): a régua proposta de vendedor ("abaixo de 0,80") não deixa a Daniele (0,82) "fora"; a projeção de R$ 143,8 mil não é 92,4 × 26 ÷ 17 = R$ 141,3 mil (falta definir a conta); pela régua "vencidas acima de R$ 0", as vencidas de R$ 9.900,00 tirariam o Financeiro de "no lugar".

## e) As 6 decisões que o Claude Design pediu, com a minha recomendação (OPINIÃO)

Critérios: "menos peças, menos regras, menos dependências" e a TELAS.

1. **Cartão v2 e as outras 19 pranchas:** aprovar com ajustes. Fechado, o cartão mantém o título com a pergunta, uma linha de exceção com nomes clicáveis e "Ver o desvio ›"; abrir só acrescenta detalhe; a seta vira um botão próprio. As 19 pranchas entram numa rodada única, pela lista pronta, e não em 19 rodadas.
2. **Menu recolhido: não.** A TELAS (seção 4) pede menu fixo. Também grupos sempre abertos: os 22 itens visíveis (TELAS:61) e nenhum caminho ganha clique. A frente de componentes mediu que o menu inteiro passa da altura útil a partir da Fase 9 (~994 px); aí ele rola por dentro, o que a folha já permite.
3. **tokens.css:** o próprio Design System publica `tokens.css` pronto ao lado do `bundle.css`, já com a variável da fonte; o app copia os dois arquivos, sem script.
4. **Dados por vendedor** (metas de R$ 75 mil cada, soma 150): Igor R$ 51,0 mil (ritmo 1,0400; 68,0% da meta), Daniele R$ 40,2 mil (0,8198; 53,6%), "Outros (sem meta própria)" R$ 1,2 mil. Soma R$ 92,4 mil e usa a linha "Outros" da TELAS V1. Projeções R$ 79,4 + 62,6 + 1,8 = R$ 143,8 mil.
5. **Cartão aberto em "no lugar":** os mesmos números da TELAS para a pergunta, sem cor e sem lista de exceções, mais "Ver o desvio ›". No Financeiro: folga em 7 e 30 dias, saldo e data digitada, vencidas e a vencer, quebra do caixa. Nenhum desenho novo.
6. **Lucide:** nenhum pacote. Os SVG originais copiados para dentro da página, sem biblioteca em tempo de execução (o app não tem framework), e o README lista os ícones pelo nome do Lucide. Hoje ele recomenda o pacote npm (README:185) e redesenhou os 45 ícones à mão (README:261).

## f) O que muda na TELAS.md se o dono confirmar o cartão que expande

- **Seção 5, linha 133:** trocar "o título e o rodapé 'Ver o desvio ›' abrem o desvio" por "fechado: a pergunta, a marca, o número com comparação, a frase, uma linha de exceção com nomes e 'Ver o desvio ›'; clicar no cartão ou na seta abre o detalhe no lugar (barra de meta ou das curvas, lista completa, encalhe, quebra do caixa); os nomes e itens são links próprios". A linha 112 (animação) já combina.
- **Seção 7, I1:** mesma troca na linha 259; linha 264 (Cliques): "abrir o cartão → detalhe no lugar; 'Ver o desvio ›' → V1, C1 ou F1"; em "Onde", acrescentar "sem rolar com um cartão aberto" (medido numa coluna de 496 px: fechado 222 px, aberto 439 a 471 px; cabe nos ~950 px úteis).
- **Seção 4, tabela de cliques:**

| Pergunta (a partir do Início) | TELAS hoje | v2 como está | v2 com o ajuste recomendado |
| --- | --- | --- | --- |
| Por que vendas está fora da meta? (V1) | 1 | 2 | 1 |
| Quem está fora do ritmo? (nome → V2) | 1 | 2 | 1 |
| Que produtos estão encalhados? (C2) | 1 | 2 | 2 (1 se o encalhe for a exceção do dia) |
| Por que este produto encalhou? (C3) | 2 | 3 | 2 ou 3 |
| O que vence esta semana? (F2) | 2 | 3 | 2 |
| O caixa fechou certo? (quebra → F3) | 1 | 2 | 2 |
| Digitar o saldo (K1) | 1 | 2 | 1 (sem saldo ou com saldo velho, o botão fica no cartão fechado) |
| Caminho de Compras I1 → C1 → C2 → C3 | 3 | 4 (passa do limite) | 3 |
