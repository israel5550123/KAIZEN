# Prompt 00 — Design System do Kaizen (Claude Design)

Onde usar: na aba Artifacts do claude.ai, começando pelo modelo **Design System** (assim o link fica `claude.ai/artifact/...` e o Claude Code consegue ler os arquivos depois). Cole o texto abaixo inteiro. Quando o Design System estiver aprovado, mande o link para o Claude Code.

---

```text
Quero montar o Design System de um app chamado Kaizen. Antes de montar tudo, me mostre 3 direções visuais (detalhes no fim) para eu escolher uma.

O QUE É O KAIZEN
App web de gestão à distância de uma loja de ferragens e acessórios para marceneiros, em São Luís (MA). O dono não fica na loja: todo dia, em menos de um minuto, o app responde três perguntas: (1) Vendas: como estou em relação à meta? (2) Compras: estou comprando o que gira ou o que encalha? (3) Financeiro: tenho dinheiro para pagar as contas? O modelo é gestão por exceção: meta → desvio → detalhe. Quando algo sai do lugar, o app mostra; quando está tudo bem, ele fica quieto.
Quem usa: o dono (no computador e, às vezes, no celular), a gerente e os vendedores (só no computador) e o entregador (uma tela simples no celular). O uso principal é no COMPUTADOR, em monitores de 1920 × 1080. O app só mostra números prontos; não calcula nada na tela. Todo o texto da interface é em português do Brasil.

PERSONALIDADE VISUAL
Sóbrio, profissional e calmo. Denso de informação sem parecer poluído: é uma ferramenta de trabalho olhada todo dia, não um site de marketing. Só tema claro, fundo claro. Nada de gradiente, ilustração, emoji, foto, sombra pesada ou enfeite. Hierarquia por tamanho, peso e espaço, não por cor.

REGRAS DE COR (as mais importantes)
- Base neutra e uma única cor de destaque, usada para ação, link e item selecionado.
- Cor só para estado. Existem só dois estados com cor: "atenção" (âmbar) e "fora" (vermelho). O que está no lugar fica NEUTRO. Nunca use verde para dizer "está tudo bem".
- Estado sempre com três sinais juntos: cor, ícone e palavra (ex.: ícone de alerta + "Fora"). Nunca só a cor.
- Contraste mínimo: 4,5:1 para texto (inclusive texto sobre o fundo de um estado) e 3:1 para ícones, barras, linhas de gráfico e pinos.
- Gráficos em tons neutros e na cor de destaque; a cor de estado só aparece para marcar um desvio.

TIPOGRAFIA
Uma família sans-serif disponível no Google Fonts, de boa leitura em telas densas, com algarismos tabulares (todos os algarismos com a mesma largura, para alinhar em coluna). Escala com: número principal de cartão (28 a 40 px), títulos, corpo (15 a 16 px), rótulo pequeno. Nada abaixo de 13 px no computador e de 14 px no celular. Todo número em tabela, lista ou cartão usa algarismos tabulares.

NÚMEROS E TEXTOS (pt-BR)
- Dinheiro no detalhe (tabelas, contas): R$ 1.234,56. No painel (cartões, frases): curto, R$ 81,4 mil, R$ 1,2 mi.
- Percentual com uma casa: 61,6%. Ritmo (realizado contra a meta, na proporção dos dias úteis que já passaram; acima de 1 está adiantado) com duas casas: 0,94. Negativo com o sinal de menos verdadeiro: −R$ 54,1 mil. Desvio positivo com "+".
- Quantidade sempre com a unidade: 212 produtos, 8 entregas, 3 parcelas.
- Datas: 21/10/2026, "qua, 21/10". Horas: 14h05. "Atualizado às 14h05".
- Todo número vem com unidade e com a comparação ao lado (meta, mês anterior, média ou régua).
- Linguagem de conversa, sem jargão de sistema. Frase-resumo no alto de cada resposta, por exemplo: "Vendas um pouco atrás da meta: ritmo de 0,94. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil."

LARGURAS E ESPAÇO
- Computador: 1920 × 1080 é o principal. Menu lateral de uns 240 px à esquerda + barra superior. O conteúdo vai até uns 1600 px, centralizado, sem esticar; texto corrido com no máximo uns 720 px de largura; tabelas podem usar a largura toda; nunca rolagem para o lado.
- Celular: 390 de largura, uma coluna, 16 px de margem, alvos de toque de pelo menos 44 px.
- Grade de 8 px. Tabelas compactas (linha de uns 36 px no computador).
- Ícones de traço simples, de uma biblioteca livre (por exemplo, Lucide).

TOKENS
Entregue os tokens com nomes semânticos em português (por exemplo: cor-fundo, cor-superficie, cor-superficie-elevada, cor-texto, cor-texto-secundario, cor-contorno, cor-destaque, cor-sobre-destaque, cor-atencao, cor-atencao-fundo, cor-fora, cor-fora-fundo; tipografia; espaçamento; raios; sombra). Quero que o mesmo arquivo de estilo (variáveis CSS e classes dos componentes) seja usado depois no app, que é HTML, CSS e JavaScript sem framework. Prefira classes reutilizáveis a estilo repetido em cada elemento.

COMPONENTES (cada um com suas variantes e estados)
1. Moldura do computador: menu lateral fixo, com ícone e nome, agrupado e com o item ativo destacado. Grupos e itens: Início; Vendas (O desvio, Padrões de venda); Compras (O desvio, Estoque e giro); Financeiro (O desvio, Contas a pagar, Caixa, Fluxo realizado); Relacionamento (Lista do dia, Painel, Clientes, Tarefas, Margem, Leads); Mapa (Mapa, Por bairro, Localizações, Concorrentes); Entregas; Cadastros (Saldo do banco, Metas e feriados, Réguas e avisos, Pessoas e acesso).
2. Barra de cima: marca Kaizen; seletor de dia "‹ Hoje · qua, 21/10/2026 ›" (› desligado quando é hoje); busca de cliente por nome, código ou telefone; "Atualizado às 14h05 · próxima às 15h"; conta com nome, perfil e Sair.
3. Calendário do mês, que abre pelo seletor de dia: domingos e dias sem expediente marcados; dias antes de 01/04/2026 e depois de hoje desligados.
4. Moldura do celular (só o dono): barra de cima compacta (o dia e a hora da atualização), barra de baixo com Início, Vendas, Compras, Financeiro e Relacionamento, e o calendário numa folha que sobe de baixo.
5. Faixa de aviso logo abaixo da barra de cima, só quando há o que dizer: desatualizado (atenção: "Os números são das 13h05: a atualização das 14h falhou. O aviso foi pelo Telegram."), dia passado (neutra: "Você está vendo terça, 15/09/2026" e "Voltar para hoje"), sem conexão (cinza, com a hora dos números que estão na tela), hoje ainda sem atualização ("A primeira atualização de hoje é às 8h") e loja fechada no dia.
6. Marca de estado: no lugar (neutra), atenção, fora e sem dado.
7. Cartão de pergunta (a tela inicial tem três): a pergunta, a marca de estado, a frase-resumo, os números principais e uma linha de exceção com nomes. O título e o rodapé "Ver o desvio ›" abrem a tela da pergunta; os itens de dentro (um nome de vendedor, o encalhe) são links próprios. Mostre os três estados.
8. Número grande com unidade e comparação: o valor, "contra…" e a diferença, com a conta escrita embaixo quando ajuda ("saldo R$ 41.300,00 − R$ 33.100,00 que vencem até 28/10").
9. Linha de indicador com barra de meta (bullet graph): barra do realizado, segmento da projeção, traço da meta; sem faixas coloridas de fundo.
10. Barra dividida em partes: um todo em partes (curva A, B, C e sem venda), com a contagem e a parte de cada uma.
11. Tabela: cabeçalho fixo que ordena (com a seta da ordem), linha clicável, números alinhados à direita, linha de grupo com total, linha de totais, passagem do mouse, linha selecionada, botão "Colunas" para mostrar as que não cabem, estado vazio.
12. Lista de exceções: nomes curtos com o número ao lado ("Daniele 0,82"), clicáveis; no máximo 5 linhas e "Ver todos (N)".
13. Lista-detalhe: lista ou tabela à esquerda e o painel do item à direita, sem sair da tela.
14. Abas e visões prontas com a contagem em cada uma; filtros combináveis com "Limpar filtros" e a contagem do recorte; busca.
15. Botões: um principal por tela, secundário, só texto, só ícone (com nome acessível); normal, passando o mouse, desabilitado; link para fora (WhatsApp, Google Maps, Waze) com ícone de saída.
16. Formulário curto em diálogo ou painel lateral: campos, Salvar e Cancelar, mensagem de erro no próprio campo, pedido de confirmação; campo de dinheiro e campo de data no formato brasileiro; contorno do campo com foco na cor de destaque; o formulário diz o efeito do que se digita ("o ritmo do Igor passa a ser medido contra R$ 60 mil").
17. Gráficos só de barra e de linha: barras por dia, hora ou grupo; linha do acumulado com a linha da meta e a projeção pontilhada; linha de saldo com o zero marcado; sparkline do tamanho de uma palavra. Linhas neutras; cor só no ponto que está fora. Rótulo direto na linha em vez de legenda. Nada de pizza, rosca, velocímetro ou 3D.
18. Dica de definição de cada número: no computador, ao passar o mouse; no celular, ao tocar num ícone "i" ao lado do número.
19. Bloco "O que isso significa": até 3 frases escritas pela IA sobre os números, com a linha "escrito pela IA sobre os números das 14h; não calcula", separado dos números, recolhível; estado "texto da IA indisponível agora".
20. Estados de tela: carregando (a moldura aparece na hora e os blocos em cinza, nunca um zero provisório), vazio (frase sem exclamação dizendo por que está vazio e o que fazer) e erro ("Não foi possível buscar os números" + "Tentar de novo", com a moldura no lugar).
21. Folha que sobe de baixo (celular).
Ficam FORA do Design System, porque nascem com a tela delas: os pontos do mapa, o campo de coordenada, o cartão de cliente da lista do dia, a tarefa, a linha do tempo de anotações e a linha arrastável do entregador.

DADOS DE EXEMPLO (fictícios, use os mesmos em tudo)
Quarta-feira, 21/10/2026, atualizado às 14h05. Vendas: meta do mês R$ 150 mil; realizado R$ 92,4 mil (61,6% da meta); 17 de 26 dias úteis passados; ritmo 0,94 (atenção); projeção R$ 143,8 mil; hoje até 14h05 R$ 4,1 mil em 24 vendas. Vendedores: Igor, ritmo 1,04; Daniele, ritmo 0,82 (fora). Compras: 3 produtos curva A em falta (fora); dos 150 produtos comprados em 90 dias, 66 são curva A, 40 B, 31 C e 13 sem venda; parado sem venda há 90 dias: R$ 24,6 mil em 38 produtos. Financeiro: saldo do banco R$ 41.300,00 (digitado para 20/10); a pagar em 7 dias, com as vencidas, R$ 33.100,00; folga em 7 dias R$ 8.200,00 (no lugar). Clientes com nomes de marcenarias inventados (Marcenaria Bom Jesus, JR Móveis Planejados, Oficina do Cedro) e telefones claramente fictícios.

COMO QUERO RECEBER
Passo 1, agora: 3 direções visuais, uma prancha cada, todas com os mesmos elementos (barra de cima, um cartão de pergunta em atenção, três linhas de tabela e um gráfico pequeno), mudando a família de letra, a cor de destaque e a densidade. Em uma linha, diga a ideia de cada direção. Eu escolho uma.
Passo 2, depois que eu escolher: o Design System completo, com uma prancha de fundamentos (cores com o contraste medido, tipografia, espaço, raios, sombra), uma prancha por grupo de componentes com seus estados, e uma página de amostra com os dados acima: a moldura do computador vazia (menu, barra de cima e faixa de aviso), o cartão de pergunta nos três estados, uma tabela de 5 linhas com totais, um formulário em painel lateral e as faixas de aviso.
Não desenhe ainda as telas do app (nem a tela inicial): elas virão uma por vez, depois.
```
