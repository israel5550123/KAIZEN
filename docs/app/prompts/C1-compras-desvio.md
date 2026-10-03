# Prompt C1 — Compras: o desvio

Tela 6 da lista (`docs/app/TELAS.md`, seção 7, C1).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: C1 · Compras: o desvio (tela 6 da lista). As pranchas vão na página "Compras" do canvas, com a nota de título "C1 · Compras: o desvio", como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "C1-computador.dc.html"; títulos como "C1 · Compras: o desvio · computador".

PARA QUE SERVE
Mostrar se as compras dos últimos 90 dias foram para o que gira (curva A e B) ou para o que encalha (C e sem venda), e as exceções do estoque.

O QUE A TELA MOSTRA (prancha 1, no computador, de cima para baixo)
- Menu: "O desvio" do grupo Compras ativo. Barra de cima com o seletor de dia em hoje (› desligada).
- Cabeçalho (.k-cabecalho-tela): "Compras: o desvio" (.k-titulo-tela) e, à direita, o período em texto fixo "90 dias até 21/10 (24/07 a 21/10)" (.k-periodo-fixo).
- Bloco "O que isso significa" (details.k-bloco-ia), recolhido.
- RESPOSTA, um .k-cartao na largura toda:
  - Marca Fora (.k-estado.k-fora.k-grande) e a frase (.k-corpo-grande): "3 produtos da curva A em falta. Das compras dos 90 dias, 13 dos 150 produtos não venderam."
  - A barra das curvas COM legenda, copiada da prancha Barra dividida (.k-dividida-bloco): rótulo "150 produtos comprados em 90 dias, por curva"; partes .k-p1 a .k-p4 com 44,0%, 26,7%, 20,7% e 8,7%; legenda (.k-partes): "66 curva A · 44,0%", "40 curva B · 26,7%", "31 curva C · 20,7%", "13 sem venda · 8,7%" (a contagem em <b>). Só cinza.
  - Embaixo, em .k-sec: "há 30 dias: 138 produtos comprados, 10 sem venda".
- CARTÕES DE EXCEÇÃO, numa fileira de 5 colunas iguais (grade local; abaixo de 1720 px de janela, 3 colunas: 3 + 2). Cada um é um .k-cartao com um .k-numero-bloco, como o "Parado há 90 dias" da prancha Número grande: rótulo com o "i", número e unidade, "contra …" com a diferença sem cor e a conta escrita. O rótulo é link.
  1. "Encalhe" · 38 produtos · "contra 30 há 30 dias" · +8 produtos · "R$ 24,6 mil parados a custo, contra R$ 19,7 mil há 30 dias (+R$ 4,9 mil)".
  2. "Ruptura", com a marca Fora (.k-estado.k-fora) no rótulo · 3 produtos · "contra 1 há 30 dias" · +2 produtos · "todos da curva A; a régua é 0".
  3. "Comprados sem venda" · 13 produtos · "contra 10 há 30 dias" · +3 produtos · "5 em encalhe e 8 novos em carência".
  4. "Estoque negativo" · 2 produtos · "contra 4 há 30 dias" · −2 produtos · "provável erro de contagem no inventário de 26/09".
  5. "Custo zero" · 7 produtos · no lugar do "contra": "cadastro de hoje, sem comparação" · "o cadastro não guarda histórico".
  Só a Ruptura tem cor; as outras exceções não têm régua.
- EMBAIXO, lado a lado (grade local de 2 colunas; abaixo de 1720 px, uma embaixo da outra):
  - "Curva ABC dos 90 dias" (.k-tabela-bloco). À direita do título, .k-visoes com "Por valor" (escolhido) e "Por quantidade". Colunas: Classe (.k-etiqueta, neutra) | Produtos | R$ em 90 dias | Parte do total. Linhas clicáveis (.k-clicavel).
    A | 98 | R$ 335.500,00 | 79,9%
    B | 176 | R$ 63.150,00 | 15,0%
    C | 438 | R$ 21.250,00 | 5,1%
    Total (.k-totais) | 712 | R$ 419.900,00 | 100,0%
    Embaixo, em .k-rotulo-regular: "A: até 80% do valor; B: até 95%; C: o resto. Dos 98 produtos curva A por valor, 66 foram comprados nos 90 dias."
  - "Onde o estoque está parado" (.k-tabela-bloco), com "os 5 grupos com mais dias de cobertura" (.k-sec) à direita. Colunas: Grupo (.k-nome, link) | Cobertura (ordenada, maior primeiro, seta azul) | Giro em 90 dias | Em encalhe | Valor parado.
    Iluminação LED | 184 dias | 0,50 | 7 | R$ 5.252,60
    Acessórios de cozinha | 163 dias | 0,56 | 7 | R$ 5.113,80
    Puxadores | 132 dias | 0,69 | 8 | R$ 4.441,60
    Ferramentas e abrasivos | 118 dias | 0,77 | 5 | R$ 2.342,60
    Colas e adesivos | 97 dias | 0,95 | 3 | R$ 1.206,20
- Rodapé (.k-rotulo-regular): "Estoque conhecido desde 26/09/2026. Valor parado pelo custo atual do cadastro."

Nota no canvas: "O bloco 'O que isso significa' chega na Fase 6; no desenho, aparece."

DESENHE 2 PRANCHAS na página "Compras":

1. C1-computador — 1920 × 1080: tudo acima.

2. C1-celular — 390 × 844 (.k-raiz.k-celular), moldura da G2-celular: barra de cima com "Hoje · qua, 21/10" e "atualizado às 14h05"; "Compras" ativo na barra de baixo. No conteúdo, empilhados:
   - Título "Compras: o desvio", o período fixo logo abaixo e o bloco da IA recolhido.
   - A resposta do computador: marca, frase, barra com legenda e comparação.
   - Os 5 cartões, um embaixo do outro, com o número do computador e, embaixo, os primeiros produtos (.k-excecoes, linhas de 44 px: nome à esquerda, valor à direita), sem "Ver todos":
     Encalhe (valor parado): Corrediça oculta 500 mm R$ 1.972,00; Perfil LED de sobrepor 3 m R$ 1.806,00; Chapa MDF 18 mm nogueira rústica R$ 1.734,00; Lixeira de embutir 2 cestos 30 L R$ 1.323,00; Puxador perfil gola 3 m preto R$ 1.176,00.
     Ruptura: Dobradiça 35 mm, Corrediça 450 mm e Puxador 128 mm, cada um com "Fora 0 un." (.k-sinal.k-fora).
     Comprados sem venda (quanto comprou e quando): Cavilha de madeira 8 × 40 mm, pacote com 100 "30 un. em 16/10"; Cola PVA extra 1 kg "48 un. em 15/10"; Organizador de gaveta ajustável "24 un. em 13/10"; Cola instantânea gel 100 g "12 un. em 09/10"; Puxador alça 160 mm grafite "120 un. em 08/10".
     Estoque negativo: Dobradiça piano 1 m latonada "−3 un."; Trilho superior de porta de correr 2 m "−2 un.".
     Custo zero (estoque): Parafuso chipboard 4 × 50 mm, caixa com 500 "64 un."; Fita de borda 19 mm branco TX, 20 m "85 un."; Cola branca PVA 500 g "40 un."; Puxador concha 128 mm preto "22 un."; Lixa d'água grão 220 "150 un.".
   - Sem a curva ABC e sem os grupos.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Curva ABC "Por quantidade": coluna "Unidades em 90 dias" no lugar do R$. A 84 produtos, 42.150 un., 79,8%; B 160, 7.890 un., 14,9%; C 468, 2.800 un., 5,3%; Total 712, 52.840 un., 100,0%.
- Bloco da IA aberto: "Três produtos da curva A estão sem estoque: Dobradiça 35 mm, Corrediça 450 mm e Puxador 128 mm. Das compras dos 90 dias, 13 dos 150 produtos não venderam; 8 deles são novos, ainda em carência. O encalhe soma 38 produtos e R$ 24,6 mil parados.", com a linha de rodapé e o estado indisponível da prancha Bloco IA.
- Dicas (fechadas). Encalhe: "Produto com estoque e nenhuma venda em 90 dias. Produto novo tem 60 dias de carência desde a primeira compra." Ruptura: "Produto que vendeu nos 90 dias e está com estoque zero ou negativo." Comprados sem venda: "Comprado nos 90 dias e sem nenhuma venda nesse período." Estoque negativo: "Estoque abaixo de zero no ERP: quase sempre erro de contagem ou de lançamento." Custo zero: "Custo R$ 0,00 no cadastro do ERP: quase sempre erro de cadastro (serviço não tem custo mesmo)." Cobertura: "Quantos dias o estoque de hoje dura no ritmo de venda dos 90 dias." Giro: "Unidades vendidas nos 90 dias ÷ estoque médio."
- Cartão vazio: "Nenhum produto em encalhe" (.k-vazio, como a lista vazia da prancha Lista de exceções), sem número.
- Tudo bem: marca No lugar (.k-estado.k-lugar, cinza) e a frase "Comprando o que gira."; nenhum cartão com cor.
- Nenhuma compra nos 90 dias: no lugar da barra, "Nenhuma nota de entrada nos últimos 90 dias"; os cartões continuam.
- Dia antes de 26/09/2026 (ex.: terça, 15/09/2026): faixa e seletor da G2-computador-dia-passado; período "90 dias até 15/09 (18/06 a 15/09)"; no lugar da barra, só a frase "Comprou 141 produtos em 90 dias: 63 curva A, 38 B, 29 C e 11 sem venda"; os cartões Encalhe, Ruptura e Estoque negativo e o bloco "Onde o estoque está parado" em cinza, com "estoque desconhecido antes de 26/09/2026" no lugar dos números. Comprados sem venda mostra os 11 do dia; Custo zero, a lista de hoje ("o cadastro não guarda histórico").
- Carregando: como na G2-computador. Erro: .k-aviso-erro. Gerente (Fase 7): a mesma tela.

O QUE CADA CLIQUE FAZ
- Cartão Encalhe → C2-computador.dc.html (visão Encalhe). Comprados sem venda → C2-computador-sem-venda.dc.html. Ruptura, Estoque negativo e Custo zero → C2 na visão de mesmo nome (sem destino).
- Parte "sem venda" da barra ou da legenda → C2-computador-sem-venda.dc.html; as outras partes → C2 "Comprados nos 90 dias", na classe (sem destino).
- Linha da curva ABC → C2 "Curva ABC", na classe (sem destino).
- Grupo em "Onde o estoque está parado" → C2-computador-grupo.dc.html.
- Mouse num número → a definição (.k-dica).
- No celular: Corrediça oculta 500 mm → C3-celular.dc.html; os outros, sem destino. Os cartões não são links no celular: Estoque e giro é só do computador.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado: fora vermelho, atenção âmbar, sempre com ícone e palavra; nunca verde. Classe ABC em etiqueta neutra; a barra das curvas só em cinza.
- Número sempre com unidade e comparação; frase-resumo no alto.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular.
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular. Os 5 cartões numa linha e as duas tabelas lado a lado só cabem a partir de uns 1720 px (medido: a tabela dos grupos pede uns 690 px): abaixo disso, use as quebras pedidas.
- No máximo 3 cliques do Início até qualquer número (Início → C1 → C2 → C3).
- O bloco da IA fica separado dos números e não calcula.
- Nenhum menu, dica ou calendário aberto cobrindo outra parte da prancha.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
