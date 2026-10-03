# Prompt C3 — Detalhe do produto

Tela 8 da lista (`docs/app/TELAS.md`, seção 7, C3).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: C3 · Detalhe do produto (tela 8 da lista). As pranchas vão na página "Compras", abaixo das da C2, com a nota de título "C3 · Detalhe do produto".

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "C3-computador.dc.html"; títulos como "C3 · Detalhe do produto · computador".

PARA QUE SERVE
Entender um produto antes de comprar mais, parar de comprar, liquidar ou corrigir o cadastro. No computador, a C3 abre num painel à direita da lista da C2, sem sair da tela; no celular, é uma página de uma coluna.

O QUE O PAINEL MOSTRA (exemplo: 20500 · Corrediça oculta 500 mm, o encalhe de maior valor parado), de cima para baixo:
- Cabeçalho: "20500" (.k-sec), "Corrediça oculta 500 mm" (.k-titulo-bloco) e a linha "grupo Corrediças · marca Deslizza · fornecedor Ferragens Norte", com os três nomes como link. À direita, o botão fechar (.k-botao.k-icone, ícone x, aria-label "Fechar").
- Marca: "Encalhe" (.k-etiqueta, neutra: encalhe não tem régua).
- Frase (.k-corpo-grande): "Comprou 24 em 14/04, vendeu 10 até 27/06 e parou; em 26/09 havia 14; em 02/10 comprou mais 20 e não vendeu nenhum."
- Números (.k-numeros; cada um um .k-numero-bloco com .k-numero-medio; o "i" (.k-gatilho) onde há definição):
  1. "Valor parado" (i) · R$ 1.972,00 · conta escrita "34 un. × R$ 58,00 de custo atual".
  2. "Vendido em 90 dias" · R$ 0,00 e 0 un. · "contra R$ 734,30 e 7 un. nos 90 dias anteriores (25/04 a 23/07)".
  3. "Estoque" · 34 un. · "contra o estoque médio de 29,4 un. desde 26/09".
  4. "Giro em 90 dias" (i) · 0,0 · "contra 1,36 do grupo Corrediças".
  5. "Cobertura" (i) · "—" e "sem venda nos 90 dias" · "contra 63 dias do grupo Corrediças".
  6. "Classe" · "sem venda" (.k-etiqueta) · "por valor e por quantidade".
- Gráficos, copiados da prancha Gráficos (.k-grafico-caixa, desenhado pelo script dela na largura da caixa; barras e linha neutras, rótulo direto, sem legenda, sem cor):
  - "Venda por mês desde abril" (barras, .k-barra), em unidades: abr 3 · mai 5 · jun 2 · jul 0 · ago 0 · set 0 · out 0 (outubro até 21/10). As duas entradas marcadas com um ponto neutro (.k-ponto) e o rótulo direto: "entrada 24 un." em abril e "entrada 20 un." em outubro.
  - "Estoque por dia desde 26/09" (linha, .k-linha): 14 un. de 26/09 a 01/10 e 34 un. de 02/10 a 21/10; em 02/10, o ponto neutro e "entrada 20 un."; no fim da linha, "34 un. hoje".
- "Entradas de compra" (.k-tabela-bloco): Data | Nota | Fornecedor | Unidades | Valor | Custo unitário.
  02/10/2026 | 48213 | Ferragens Norte | 20 un. | R$ 1.160,00 | R$ 58,00
  14/04/2026 | 3391 | Ferragens Norte | 24 un. | "esta nota não guardava valor" em cinza (.k-comp), ocupando Valor e Custo unitário
- "Cadastro" (.k-dados): Custo atual R$ 58,00 · Preço R$ 104,90 · Primeira entrada 14/04/2026 · Última venda sáb, 27/06/2026.
- Um .k-cartao com o título "Margem em 90 dias e clientes que mais compram", a .k-etiqueta "Fase 8" e só a frase "Chega na Fase 8." Sem números (não há exemplo).

Nota no canvas: "(proposta) No celular, a C3 abre pelos 5 primeiros produtos de cada cartão da C1, com as entradas de compra recolhidas. O bloco de margem e clientes chega na Fase 8; no desenho, aparece."

DESENHE 2 PRANCHAS na página "Compras":

1. C3-computador — 1920 × 1080: a C2-computador com o produto aberto. Moldura, menu ("Estoque e giro" ativo), seletor de dia (› desligada), cabeçalho, visões e filtros iguais aos da C2-computador. No lugar da tabela, a lista-detalhe com tabela à esquerda (.k-lista-detalhe.k-tabela-esquerda):
   - à esquerda (.k-lista), a mesma tabela "Encalhe" com as mesmas 10 linhas, a linha 20500 selecionada (.k-selecionada), sem a linha de totais, e 5 colunas: Código, Descrição, R$ em 90 dias, Estoque e Marcas (só a etiqueta "encalhe"; o "comprado em 02/10" está no painel, nas entradas). Classe fica no menu Colunas: medido com o Design System, com a seta de ordenar em cada cabeçalho, as 6 colunas pedem uns 800 px e a lista tem 766 em 1920;
   - à direita (.k-detalhe), o painel acima.
   Os dois dividem a largura: o painel não cobre a tabela (não use o .k-painel-lateral, que é de formulário). Se o painel for mais alto que a tela, a página rola na vertical; nada rola para o lado. Em 1366 px, ficam só Código, Descrição e Marcas na lista, e as entradas mostram só Data, Unidades e Valor (clicar na linha mostra "nota 48213 · Ferragens Norte").

2. C3-celular — 390 × 844 (.k-raiz.k-celular), moldura da G2-celular: barra de cima com "Hoje · qua, 21/10" e "atualizado às 14h05"; "Compras" ativo na barra de baixo. Uma coluna, de cima para baixo:
   - O botão de texto "Compras: o desvio" com a seta para a esquerda (.k-botao.k-texto, ícone chevron-left, 44 px de alvo).
   - O conteúdo do painel, na mesma ordem, com "Corrediça oculta 500 mm" como título (.k-titulo-tela) e os números um embaixo do outro (o "i" num quadrado de 44 px). Grupo, marca e fornecedor sem link (Estoque e giro é só do computador). Sem o botão fechar.
   - As entradas de compra RECOLHIDAS: só o cabeçalho do bloco, "Entradas de compra", com o botão "Mostrar" e a seta para baixo à direita (.k-botao.k-texto, aria-expanded="false", 44 px).

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Dicas (fechadas). Valor parado: "Estoque × custo atual do cadastro, só de produto em encalhe." Giro: "Unidades vendidas nos 90 dias ÷ estoque médio." Cobertura: "Quantos dias o estoque de hoje dura no ritmo de venda dos 90 dias."
- Mouse num ponto: nas barras, "jun · 2 un. · R$ 209,80" (abr: 3 un., R$ 314,70; mai: 5 un., R$ 524,50); na linha, "qua, 14/10 · 34 un.".
- Entradas abertas no celular: tabela reduzida com Data sem o ano (02/10, 14/04), Unidades e Valor ("—" na de 14/04; o texto inteiro não cabe em 360 px); tocar numa linha mostra a nota e o fornecedor ("nota 48213 · Ferragens Norte"; "nota 3391 · Ferragens Norte · esta nota não guardava valor").
- Produto em ruptura (10235 · Dobradiça 35 mm, aberto pela visão Ruptura da C2): marca Ruptura em vermelho (.k-estado.k-fora, ícone e palavra); fora ela, só o ponto fora da linha tem cor; classe A por valor e por quantidade; vendido em 90 dias R$ 12.880,00 e 1.840 un.; estoque 0 un. contra o médio de 150,2 un. desde 26/09; giro 12,3 contra 1,38 do grupo Dobradiças; cobertura 0 dias contra 62 dias do grupo; valor parado "—". Barras: abr 310 · mai 590 · jun 640 · jul 610 · ago 600 · set 650 · out 410 (outubro até 21/10), barras neutras como no exemplo principal. Linha: 300 un. em 26/09, 105 em 05/10, 275 em 06/10 (entrada de 200), 140 em 13/10, 35 em 17/10 e 0 desde 19/10, com a linha do zero (.k-zero) e, em 19/10, o ponto vermelho (.k-ponto-fora) com o ícone e "Fora · 0 un. desde 19/10". Entradas: 06/10/2026 · 48390 · Ferragens Norte · 200 un. · R$ 1.040,00 · R$ 5,20; e 05/09 e 18/07, 600 un. cada, notas do ERP anterior ("esta nota não guardava valor"). Cadastro: custo atual R$ 5,20 · preço R$ 7,00 · primeira entrada 14/04/2026 · última venda seg, 19/10/2026.
- Produto novo em carência (70290 · Perfil LED de embutir 2 m · grupo Iluminação LED · marca Luzmóvel · fornecedor Luz e Perfil Distribuidora): etiqueta "novo, em carência até 28/11" e a frase "Ainda não está em encalhe: a primeira compra foi há 22 dias, e a carência é de 60."; uma entrada, 29/09/2026, nota 2209, 40 un. a R$ 38,00; nenhuma venda; estoque 40 un.
- Custo zero e estoque negativo: as etiquetas neutras "custo zero" e "estoque negativo" no cabeçalho, no lugar de "Encalhe".
- Sem venda desde abril: no lugar das barras, "Nenhuma venda desde abril."
- Dia antes de 26/09/2026: Estoque, Giro, Cobertura e Valor parado com "—", e "estoque desconhecido antes de 26/09/2026" no lugar da linha do estoque.
- Página própria (quando vier da ficha do cliente ou da Margem, nas Fases 7 e 8): o mesmo conteúdo na largura da tela. Não desenhe agora.
- Carregando e erro: os padrões, dentro do painel. Gerente (Fase 7): o mesmo painel.

O QUE CADA CLIQUE FAZ
- Grupo, marca ou fornecedor → a C2 filtrada por ele (chip ligado; sem destino).
- Mouse num ponto dos gráficos → o valor do mês ou o estoque do dia.
- Entrada de compra → destaca a linha (.k-selecionada), com o número da nota para achar no ERP.
- Fechar (X ou Esc) → C2-computador.dc.html, na mesma posição da lista. ↑ e ↓ → produto anterior e seguinte; outra linha da lista → troca só o painel (sem destino).
- Cliente (Fase 8) → a ficha do cliente (R2, que vem depois).
- No celular: "Compras: o desvio" → C1-celular.dc.html; "Mostrar" → abre as entradas no lugar.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado: fora vermelho, atenção âmbar, sempre com ícone e palavra; nunca verde. Encalhe, novo, custo zero, estoque negativo e a classe em etiqueta neutra; só a ruptura de produto curva A tem cor. Barras e linhas neutras; cor só no ponto fora.
- Número sempre com unidade e comparação; frase-resumo no alto.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular.
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular.
- No máximo 3 cliques do Início até qualquer número (Início → C1 → C2 → C3).
- O Consumidor Final (código 999007) nunca entra na lista de clientes (Fase 8).
- Nenhum painel ou menu aberto cobrindo outra parte da prancha. Sem bloco da IA nesta tela.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
