# Prompt 00b — Perguntas ao Claude Design sobre o Design System

Onde usar: na mesma conversa do Claude Design em que o Design System foi feito, depois de ele terminar. Cole o texto abaixo. Quando ele responder tudo, traga para o Claude Code o link do Design System e as respostas.

---

```text
Antes de eu levar este Design System para quem vai construir o app, responda às perguntas abaixo. Responda numerado, curto e com valores exatos (nomes, hex, px, nomes de classe), em tabela quando for lista. Se algo do meu pedido não foi feito, diga "não feito" e por quê; não preencha com o que deveria ser. No fim, grave estas respostas num arquivo README.md dentro do próprio Design System.

A. ONDE ESTÁ
1. Qual é o link deste Design System? Ele foi criado como Artifact a partir do modelo "Design System" (link claude.ai/artifact/...) ou como projeto do claude.ai/design (link claude.ai/design/...)?
2. Liste todos os arquivos do Design System, com o caminho de cada um e uma linha dizendo o que tem (tokens, folha de estilo, pranchas, README, componentes).
3. Qual das 3 direções visuais virou o Design System, e o que mudou dela até a versão final?

B. FUNDAMENTOS
4. Letra: nome da família, pesos usados, o link do Google Fonts e como os algarismos tabulares estão ligados (propriedade CSS usada).
5. Cores: tabela com cada token (nome semântico, hex, onde se usa). Confirme que não há verde em nenhum estado.
6. Contraste medido: tabela com cada par texto/fundo usado (texto normal, texto secundário, destaque, atenção sobre o fundo de atenção, fora sobre o fundo de fora, texto sobre a cor de destaque) e a razão de contraste de cada um. Aponte qualquer par abaixo de 4,5:1 (texto) ou 3:1 (ícones, barras, linhas de gráfico).
7. Escala de texto: cada estilo com nome, tamanho, altura de linha e peso. Confirme o mínimo de 13 px no computador e 14 px no celular.
8. Espaço e forma: escala de espaçamento, raios, sombras, largura do menu lateral, largura máxima do conteúdo, largura máxima do texto corrido, altura da linha de tabela, margem no celular, tamanho mínimo de alvo de toque.
9. Ícones: qual biblioteca, qual licença e como entram (arquivo, link ou SVG copiado).

C. COMPONENTES
10. Tabela com os 21 componentes que pedi (moldura do computador; barra de cima; calendário; moldura do celular; faixa de aviso; marca de estado; cartão de pergunta; número grande com comparação; linha de indicador com barra de meta; barra dividida em partes; tabela; lista de exceções; lista-detalhe; abas, filtros e busca; botões; formulário em diálogo ou painel; gráficos; dica de definição; bloco "O que isso significa"; estados de tela; folha que sobe de baixo). Para cada um: o nome exato que ele tem no Design System, a classe CSS principal, as variantes e os estados desenhados, e "feito", "em parte" ou "não feito".
11. Menu lateral: os grupos e itens ficaram exatamente como pedi? Existe o estado recolhido? Como fica o item ativo?
12. Cartão de pergunta: o título e o rodapé "Ver o desvio ›" abrem a tela da pergunta, e os itens de dentro são links próprios? Os três estados (no lugar, atenção, fora) estão desenhados, e o "sem dado"?
13. Gráficos: como estão desenhados (SVG fixo, biblioteca, outro)? Dê as regras visuais para reproduzir no app: espessura das linhas, cor de cada série, tracejado da projeção, estilo da linha da meta, rótulos, eixos e grade.
14. Tabela: como é o indicador de ordem, a linha de grupo, a linha de totais, a linha selecionada e o botão "Colunas"? Qual a altura da linha?
15. Estados de tela: carregando, vazio e erro estão desenhados como componentes? Qual o texto de exemplo de cada um?
16. Foco do teclado e acessibilidade: como fica o contorno de foco? Os botões só com ícone têm nome acessível?

D. REAPROVEITAMENTO NO APP (HTML, CSS e JavaScript, sem framework)
17. Existe um arquivo de estilo único com as variáveis e as classes de todos os componentes? Qual o caminho? Ele funciona sozinho numa página HTML comum, sem o editor do Claude Design?
18. Algum componente depende de React, de um pacote JavaScript do Design System (window.<algo>) ou de código que só roda no Claude Design? Liste quais e para quê.
19. Quanto do estilo está em classes reutilizáveis e quanto está escrito direto em cada elemento (estilo inline)? Liste os componentes em que o estilo ficou inline.
20. Quais componentes precisam de comportamento em JavaScript no app (abrir o calendário, recolher o menu, ordenar a tabela, mostrar a dica, abrir a folha de baixo, filtros) e o que cada um faz?
21. Que dependências de fora o Design System usa (fontes, bibliotecas, links para outros sites)?

E. DECISÕES E SUPOSIÇÕES
22. O que você decidiu por conta própria, que o meu pedido não dizia? Liste cada decisão em uma linha.
23. O que do meu pedido você não seguiu ou mudou, e por quê?
24. A página de amostra usa exatamente os dados de exemplo que mandei (meta R$ 150 mil, realizado R$ 92,4 mil, 61,6% da meta, ritmo 0,94, Igor 1,04, Daniele 0,82, folga em 7 dias R$ 8.200,00 etc.)? Algum número ficou diferente? Onde?
25. O que você recomenda revisar ou decidir antes de começarmos as telas?
```
