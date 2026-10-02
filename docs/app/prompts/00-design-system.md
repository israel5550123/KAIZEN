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
Uma família sans-serif disponível no Google Fonts, de boa leitura em telas densas, com algarismos tabulares (números alinhados em coluna). Escala com: número principal de cartão (grande), títulos, corpo, rótulo pequeno. Nada abaixo de 12 px. Todo número em tabela, lista ou cartão usa algarismos tabulares.

NÚMEROS E TEXTOS (pt-BR)
- Dinheiro no detalhe (tabelas, contas): R$ 1.234,56. No painel (cartões, frases): curto, R$ 81,4 mil, R$ 1,2 mi.
- Percentual: 93%. Negativo com o sinal de menos verdadeiro: −R$ 54,1 mil. Desvio positivo com "+".
- Datas: 21/10/2026, "qua, 21/10". Horas: 14h05. "Atualizado às 14h05".
- Todo número vem com unidade e com a comparação ao lado (meta, mês anterior, média ou régua).
- Linguagem de conversa, sem jargão de sistema. Frase-resumo no alto de cada resposta, por exemplo: "Ritmo de 94%, um pouco atrás da meta. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil."

LARGURAS E ESPAÇO
- Computador: 1920 × 1080 é o principal. Menu lateral à esquerda + barra superior. O conteúdo não estica até a borda: largura máxima confortável, e texto corrido com no máximo ~70 caracteres por linha.
- Celular: 390 de largura, uma coluna, alvos de toque de pelo menos 44 px.
- Grade de 8 px. Tabelas compactas (linha de 40 a 48 px).
- Ícones de traço simples, de uma biblioteca livre (por exemplo, Lucide).

TOKENS
Entregue os tokens com nomes semânticos em português (por exemplo: cor-fundo, cor-superficie, cor-superficie-elevada, cor-texto, cor-texto-secundario, cor-contorno, cor-destaque, cor-sobre-destaque, cor-atencao, cor-atencao-fundo, cor-fora, cor-fora-fundo; tipografia; espaçamento; raios; sombra). Quero que o mesmo arquivo de estilo (variáveis CSS e classes dos componentes) seja usado depois no app, que é HTML, CSS e JavaScript sem framework. Prefira classes reutilizáveis a estilo repetido em cada elemento.

COMPONENTES (cada um com suas variantes e estados)
1. Casca do computador: menu lateral (itens: Início, Vendas, Compras, Financeiro, Clientes, Lista do dia, Tarefas, Mapa, Entregas, Ajustes; ativo, inativo, recolhido) e barra superior (marca Kaizen; seletor de dia "‹ Hoje · qua, 21/10/2026 ›" que abre um calendário; "Atualizado às 14h05"; menu da pessoa com nome, perfil e Sair).
2. Casca do celular (só o dono): barra superior compacta e menu que abre por cima.
3. Faixa global sob a barra superior: "desatualizado" (atenção: "Os números são das 11h05. A atualização das 12h não chegou."), "vendo um dia passado" ("Vendo 15/09 · voltar para hoje") e "sem conexão".
4. Marca de estado: no lugar (neutra), atenção, fora, sem dado.
5. Cartão de pergunta (a tela inicial tem três lado a lado): título, marca de estado, frase-resumo, número principal com a comparação, uma linha de apoio; o cartão inteiro é clicável (nunca um botão dentro do cartão). Mostre os três estados.
6. Indicador: rótulo, número com unidade, comparação e variação.
7. Barra de meta (bullet graph): barra do realizado, segmento da projeção, traço da meta; sem faixas coloridas de fundo.
8. Tabela: cabeçalho que ordena (com a seta da ordem), números alinhados à direita, linha de grupo com total, linha de totais, passagem do mouse, linha selecionada, estado vazio.
9. Lista de exceções: no máximo 5 linhas e "Ver todos (N)".
10. Lista-detalhe: lista à esquerda, detalhe à direita, item escolhido marcado.
11. Abas, seletor segmentado, filtros em chips com "Limpar" e busca.
12. Botões: principal, secundário, só texto, só ícone (com nome acessível); normal, passando o mouse, desabilitado.
13. Formulário: campo de texto, valor em R$, data, seleção, e um campo de coordenada "latitude, longitude" (colada do WhatsApp) com um mapa pequeno mostrando o ponto para conferir; mensagem de erro do campo; o formulário diz o efeito do que se digita ("o ritmo passa a ser medido contra R$ 60 mil").
14. Diálogo e painel lateral para formulários curtos.
15. Gráficos: barras (verticais e horizontais), linha do acumulado com a linha da meta e a projeção tracejada, sparkline do tamanho de uma palavra. Nada de pizza, rosca, velocímetro ou 3D. Rótulo direto na linha em vez de legenda.
16. Mapa (só para ver, OpenStreetMap): pino de cliente por situação (ativo neutro, atrasado em atenção, sumido em fora), pino da loja e pino de concorrente com formas próprias (distinguíveis em preto e branco), agrupamento com número, cartão do ponto ao clicar, e "© OpenStreetMap" sempre visível.
17. Linha da lista do dia do vendedor: nome do cliente (abre a ficha), motivo, o que fazer, botões "WhatsApp" e "Falei".
18. Bloco "O que isso significa": texto escrito pela IA sobre os números, com a marca "escrito pela IA sobre os números das 14h; não calcula", recolhido por padrão.
19. Estados de tela: carregando (esqueleto com os rótulos), vazio (frase sem exclamação dizendo por que está vazio e o que fazer) e erro ("Não deu para buscar os números agora" + "Tentar de novo", mantendo os últimos números na tela com a hora deles).
20. Linha grande da tela do entregador (celular): alça para arrastar e mudar a ordem, número da posição, cliente, bairro, e os botões "Abrir no Google Maps" e "Abrir no Waze".
21. Entrada: marca, "Entrar com Google", separador "ou", e-mail e senha, "Esqueci a senha", e a linha "Acesso liberado pelo Israel. Não há cadastro por aqui." Sem "criar conta".

DADOS DE EXEMPLO (fictícios, use os mesmos em tudo)
Quarta-feira, 21/10/2026, atualizado às 14h05. Vendas: meta do mês R$ 150 mil; realizado R$ 92,4 mil (62% da meta); ritmo 94% (atenção); projeção R$ 143,8 mil; hoje até 14h05 R$ 4,1 mil em 24 vendas. Vendedores: Igor, ritmo 104%; Daniele, ritmo 82% (fora). Compras: 3 produtos curva A em falta (fora); dos 150 produtos comprados em 90 dias, 66 são curva A, 40 B, 31 C e 13 sem venda; parado sem venda há 90 dias: R$ 24,6 mil em 38 produtos. Financeiro: saldo do banco R$ 41.300,00 (digitado para 20/10); a pagar em 7 dias, com as vencidas, R$ 33.100,00; folga em 7 dias R$ 8.200,00 (no lugar). Clientes com nomes de marcenarias inventados (Marcenaria Bom Jesus, JR Móveis Planejados, Oficina do Cedro) e telefones claramente fictícios.

COMO QUERO RECEBER
Passo 1, agora: 3 direções visuais, uma prancha cada, todas com os mesmos elementos (barra superior, um cartão de pergunta em atenção, três linhas de tabela e um gráfico pequeno), mudando a família de fonte, a cor de destaque e a densidade. Em uma linha, diga a ideia de cada direção. Eu escolho uma.
Passo 2, depois que eu escolher: o Design System completo, com uma prancha de fundamentos (cores com o contraste medido, tipografia, espaço, raios, sombra), uma prancha por grupo de componentes com seus estados, e duas composições de exemplo com os dados acima: a tela inicial do dono no computador (1920 × 1080: menu lateral, barra superior e os três cartões de pergunta lado a lado, cada um com uma lista curta de exceções embaixo) e a mesma tela no celular (390 de largura, os três cartões empilhados, só com o essencial).
Não desenhe ainda as outras telas do app: elas virão uma por vez, depois.
```
