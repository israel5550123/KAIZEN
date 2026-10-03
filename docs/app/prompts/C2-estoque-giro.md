# Prompt C2 — Estoque e giro

Tela 7 da lista (`docs/app/TELAS.md`, seção 7, C2).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: C2 · Estoque e giro (tela 7 da lista). As pranchas vão na página "Compras", abaixo das da C1, com a nota de título "C2 · Estoque e giro".

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. Tela só do computador: sem prancha de celular. Cada prancha leva a linha <meta name="viewport">; os links do menu vêm junto.
- Nomes como "C2-computador.dc.html"; títulos como "C2 · Estoque e giro · computador".

PARA QUE SERVE
A lista que explica o desvio de compras: produto, grupo, marca ou fornecedor, com venda, estoque, giro e cobertura.

O QUE A TELA MOSTRA (prancha 1, de cima para baixo)
- Menu: "Estoque e giro" do grupo Compras ativo. Barra de cima com o seletor de dia em hoje (› desligada).
- Cabeçalho (.k-cabecalho-tela): "Estoque e giro" (.k-titulo-tela) e, à direita, o texto fixo "90 dias até 21/10 (24/07 a 21/10)" (.k-periodo-fixo).
- Visões prontas (.k-visoes), cada uma com a contagem (.k-contagem): Todos 760 · Curva ABC 712 · Encalhe 38 (escolhida) · Ruptura 3 · Comprados nos 90 dias 150 · Comprados sem venda 13 · Estoque negativo 2 · Custo zero 7. Em 1366 px, quebre a faixa em duas linhas (regra local flex-wrap: wrap; max-width: 100%) e diga no fim.
- Filtros (.k-filtros): a busca (.k-busca) "Código ou descrição"; "Ver por" com uma .k-visoes: Produto (escolhido), Grupo, Marca, Fornecedor; os chips (.k-chip, com o ícone funnel), desligados: Classe, Grupo, Marca, Fornecedor; e o recorte (.k-recorte) "38 de 760 produtos". "Limpar filtros" só aparece com um filtro ligado.
- Tabela (.k-tabela-bloco): título "Encalhe · do maior valor parado para o menor"; à direita, "38 produtos" e "Colunas" (menu fechado). 10 colunas: Código | Descrição | Classe | R$ em 90 dias | Unidades | Estoque | Giro | Cobertura | Valor parado (ordenada, maior primeiro, seta azul) | Marcas. No menu Colunas ficam Classe por quantidade, Estoque médio, Última venda, Grupo, Marca e Fornecedor.
  Em todas as linhas: Classe "sem venda" (.k-etiqueta), R$ 0,00, Unidades 0, Giro 0,0, Cobertura "—" e, em Marcas, a etiqueta neutra "encalhe". Linhas clicáveis (.k-clicavel; descrição em .k-nome). As 10 primeiras (código · descrição · estoque · valor parado · 2ª etiqueta, se houver); as outras 28 ficam na rolagem (.k-tabela-rolagem):
  20500 · Corrediça oculta 500 mm · 34 un. · R$ 1.972,00 · comprado em 02/10
  70412 · Perfil LED de sobrepor 3 m · 28 un. · R$ 1.806,00
  61820 · Chapa MDF 18 mm nogueira rústica · 6 un. · R$ 1.734,00 · comprado em 12/08
  50233 · Lixeira de embutir 2 cestos 30 L · 7 un. · R$ 1.323,00
  30960 · Puxador perfil gola 3 m preto · 12 un. · R$ 1.176,00
  50118 · Porta-talheres 60 cm cinza · 15 un. · R$ 1.080,00
  70225 · Fita LED 5 m 12 V branca fria · 30 un. · R$ 1.047,00 · comprado em 16/09
  80340 · Serra copo 35 mm · 18 un. · R$ 936,00
  30455 · Puxador concha 96 mm inox · 68 un. · R$ 918,00
  50390 · Cesto aramado de canto 4 em 1 · 4 un. · R$ 912,00
  Linha de totais (.k-totais): "Total · 38 produtos" na 1ª célula; R$ 0,00; 0; 803 un. no Estoque; R$ 24.620,10 no Valor parado; e, em Marcas, em cinza (.k-comp), "há 30 dias: 30 produtos · R$ 19.740,00".
  Em 1366 px (as 10 colunas pedem uns 1.500 px, medido), ficam Código, Descrição, Estoque, Valor parado e Marcas; as outras saem pelo menu Colunas.

Nota no canvas: "(proposta) Estoque e giro existe só no computador."

DESENHE 3 PRANCHAS na página "Compras" (mesmo menu, barra e seletor nas três):

1. C2-computador — 1920 × 1080: tudo acima.

2. C2-computador-sem-venda — visão "Comprados sem venda" escolhida; recorte "13 de 760 produtos". Título "Comprados sem venda · a compra mais recente primeiro" e "13 produtos". Colunas: Código | Descrição | Compra (ordenada) | Comprou | Estoque | Marcas; Nota e Fornecedor ficam no menu Colunas. As 13 linhas:
   60455 | Cavilha de madeira 8 × 40 mm, pacote com 100 | 16/10/2026 | 30 un. | 30 un. | novo até 15/12
   90612 | Cola PVA extra 1 kg | 15/10/2026 | 48 un. | 48 un. | novo até 14/12
   50840 | Organizador de gaveta ajustável | 13/10/2026 | 24 un. | 24 un. | novo até 12/12
   90512 | Cola instantânea gel 100 g | 09/10/2026 | 12 un. | 18 un. | encalhe · sem venda desde 30/06
   30388 | Puxador alça 160 mm grafite | 08/10/2026 | 120 un. | 120 un. | novo até 07/12
   20550 | Corrediça telescópica 550 mm com amortecedor | 06/10/2026 | 40 un. | 40 un. | novo até 05/12
   20500 | Corrediça oculta 500 mm | 02/10/2026 | 20 un. | 34 un. | encalhe · sem venda desde 27/06
   10712 | Dobradiça slide-on 35 mm curva com amortecedor | 01/10/2026 | 200 un. | 200 un. | novo até 30/11
   90115 | Cola de contato 2,8 kg | 29/09/2026 | 6 un. | 6 un. | encalhe · sem venda desde 15/07
   70290 | Perfil LED de embutir 2 m | 29/09/2026 | 40 un. | 40 un. | novo até 28/11
   40330 | Fita de borda 22 mm freijó, 20 m | 29/09/2026 | 60 un. | 60 un. | novo até 28/11
   70225 | Fita LED 5 m 12 V branca fria | 16/09/2026 | 30 un. | 30 un. | encalhe · sem venda desde 14/07
   61820 | Chapa MDF 18 mm nogueira rústica | 12/08/2026 | 6 un. | 6 un. | encalhe · sem venda desde 03/07
   Marcas: "novo até 15/12" é a etiqueta neutra "novo, em carência até 15/12"; em "encalhe · sem venda desde 30/06", só "encalhe" é etiqueta, e o resto vai em .k-sec. Embaixo da tabela, em .k-rotulo-regular: "5 estão em encalhe (já vendiam e pararam) e 8 são novos, em carência de 60 dias desde a primeira compra; os 8 não contam no encalhe." Linha de totais (.k-totais): "Total · 13 produtos" e, em Marcas, em cinza (.k-comp), "há 30 dias: 10 produtos". Em 1366 px, Estoque também sai pelo menu Colunas (as 6 pedem uns 1.140 px).

3. C2-computador-grupo — "Ver por: Grupo" escolhido e a visão "Todos"; recorte "760 produtos". Título "Por grupo · maior cobertura primeiro" e "760 produtos". Colunas: Grupo (.k-nome, link) | Produtos | Unidades | Estoque médio | Giro | Cobertura (ordenada) | Em encalhe | Valor parado. "R$ em 90 dias" e "Estoque hoje" ficam no menu Colunas.
   Iluminação LED | 58 | 820 | 1.640 | 0,50 | 184 dias | 7 | R$ 5.252,60
   Acessórios de cozinha | 63 | 640 | 1.150 | 0,56 | 163 dias | 7 | R$ 5.113,80
   Puxadores | 132 | 5.400 | 7.800 | 0,69 | 132 dias | 8 | R$ 4.441,60
   Ferramentas e abrasivos | 59 | 1.190 | 1.540 | 0,77 | 118 dias | 5 | R$ 2.342,60
   Colas e adesivos | 41 | 1.900 | 2.000 | 0,95 | 97 dias | 3 | R$ 1.206,20
   Sem grupo | 7 | 40 | 31 | 1,29 | 68 dias | 0 | R$ 0,00
   Fitas de borda | 74 | 2.900 | 2.200 | 1,32 | 65 dias | 2 | R$ 822,00
   Corrediças | 54 | 6.100 | 4.500 | 1,36 | 63 dias | 2 | R$ 2.445,00
   Dobradiças | 68 | 14.200 | 10.300 | 1,38 | 62 dias | 2 | R$ 1.069,80
   Parafusos e fixação | 168 | 18.500 | 9.700 | 1,91 | 45 dias | 1 | R$ 192,50
   Chapas de MDF | 36 | 1.150 | 410 | 2,80 | 30 dias | 1 | R$ 1.734,00
   Total (.k-totais) | 760 | 52.840 | | | | 38 | R$ 24.620,10

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Visão Ruptura (pelas unidades vendidas): três linhas, classe A, marca Ruptura (.k-estado.k-fora), todas com estoque 0 un., cobertura 0 dias e valor parado "—". 10235 · Dobradiça 35 mm · R$ 12.880,00 · 1.840 un. · giro 12,3; 20450 · Corrediça 450 mm · R$ 11.124,00 · 412 un. · 8,9; 30128 · Puxador 128 mm · R$ 6.555,00 · 380 un. · 9,3. Totais: 3 produtos · R$ 30.559,00 · 2.632 · há 30 dias: 1 produto.
- Visão Curva ABC: "Por valor" e "Por quantidade" ao lado do título da tabela, como na C1. Ver por Marca e por Fornecedor: as colunas do Por grupo.
- Estoque negativo: Dobradiça piano 1 m latonada −3 un. e Trilho superior de porta de correr 2 m −2 un., com a nota da C1. Custo zero: 7 produtos, lista de hoje ("o cadastro não guarda histórico").
- Visão vazia (.k-tabela-vazia, ícone inbox): "Nenhum produto em ruptura hoje". Busca sem resultado: "Nenhum produto com broca 8".
- Dia antes de 26/09/2026: Estoque, Giro, Cobertura e Valor parado com "—"; as visões Encalhe, Ruptura e Estoque negativo desligadas, com "estoque desconhecido antes de 26/09/2026" ao lado (.k-sec); Custo zero continua.
- Dicas no cabeçalho: Giro e Cobertura com os textos da C1; Valor parado "Estoque × custo atual do cadastro, só de produto em encalhe."; Classe "Curva ABC por valor nos 90 dias."
- Carregando e erro: os padrões. Gerente (Fase 7): a mesma tela.

O QUE CADA CLIQUE FAZ
- Visão → troca a lista e a ordem: Encalhe → C2-computador.dc.html; Comprados sem venda → C2-computador-sem-venda.dc.html; as outras, sem destino.
- "Ver por: Grupo" → C2-computador-grupo.dc.html; "Produto" → C2-computador.dc.html. Linha de grupo → volta a "Produto", filtrada pelo grupo (chip "Grupo: Iluminação LED" ligado; sem destino).
- Cabeçalho → ordena. "Colunas" → abre o menu.
- Linha de produto (ou Enter) → o produto (C3) num painel à direita, sem sair da tela: 20500 → C3-computador.dc.html; as outras, sem destino. Com o painel, ↑ e ↓ trocam o produto e Esc fecha.
- Voltar → C1-computador.dc.html ("O desvio" no menu).

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado (fora vermelho, com ícone e palavra; nunca verde): só a ruptura de produto curva A tem cor. Encalhe, novo, custo zero, negativo e a classe ABC em etiqueta neutra.
- Número com unidade e comparação: os totais comparam com 30 dias antes onde há o número (Por grupo fica sem).
- Nada abaixo de 13 px; números à direita; nenhuma rolagem para o lado em 1366 e 1920 px (o que não cabe sai pelo menu Colunas).
- No máximo 3 cliques do Início até qualquer número (Início → C1 → C2 → C3).
- Nenhum menu aberto cobrindo outra parte da prancha. Sem bloco da IA nesta tela.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
