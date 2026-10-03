# Prompt G2 — Moldura do app (menu, barra de cima, calendário e avisos)

Tela 1 da lista (`docs/app/TELAS.md`, seção 7, G2). É a primeira tela, então este prompt também cria o projeto onde ficarão todas as telas.

Onde usar: na aba Artifacts do claude.ai, comece um projeto novo pelo modelo **Design** (não o "Design System") e cole o texto abaixo. As próximas telas vão para este mesmo projeto, cada uma com o seu prompt. Quando aprovar a G2, mande o link do projeto para o Claude Code.

---

```text
Vamos desenhar as telas do Kaizen, uma por vez, neste projeto. Use o Design System "Kaizen" (https://claude.ai/artifact/FminwsQQNCX6hoF9ZXoSso): instale-o neste projeto e use as classes e os tokens dele (tokens.css e components/bundle.css). Não invente componente, cor, letra ou espaçamento fora dele; se faltar algo, use o mais próximo e me diga no fim o que faltou.

O QUE É O KAIZEN (contexto para todas as telas)
App web de gestão à distância de uma loja de ferragens para marceneiros em São Luís (MA). O dono acompanha três perguntas (vendas contra a meta, compras, dinheiro para pagar as contas) no modelo meta → desvio → detalhe. Uso principal no computador (1920 × 1080); o celular é só do dono, para consulta. Textos em português do Brasil. O app só mostra números prontos; a tela não calcula.

COMO ORGANIZAR O PROJETO
- Uma página do canvas por área, nesta ordem: "Moldura e entrada", "Início", "Vendas", "Compras", "Financeiro", "Cadastros", "Réguas", "Relacionamento", "Mapa", "Entregas". Hoje só a primeira recebe pranchas.
- Nome de cada prancha: código da tela, formato e, quando houver, o estado. Arquivos como "G2-computador.dc.html", "G2-celular-calendario.dc.html"; título como "G2 · Moldura · computador".
- Computador: página fluida (preenche a janela), desenhada a 1920 × 1080. Celular: 390 × 844.
- Os mesmos dados de exemplo em todas as telas: quarta-feira, 21/10/2026, atualizado às 14h05; a pessoa que entrou é "Israel", perfil "Dono".

TELA G2 — A MOLDURA
Para que serve: a moldura de todas as telas do app: o menu, o dia escolhido, a hora da atualização e os avisos que valem para o app inteiro. As outras telas só preenchem o meio. Ela não tem números próprios.

Desenhe 8 pranchas na página "Moldura e entrada":

1. G2-computador — a moldura padrão (.k-moldura):
   - Menu lateral (.k-menu-lateral) com os 8 grupos sempre abertos e os 22 itens, "Início" ativo. No app, cada item só aparece na fase em que a tela existe; no desenho, mostre todos.
   - Barra de cima (.k-barra-cima): seletor de dia "‹ Hoje · qua, 21/10/2026 ›" com a seta › desligada (é hoje); busca de cliente "Nome, código ou telefone"; "Atualizado às 14h05 · próxima às 15h"; a conta "Israel · Dono".
   - Conteúdo (.k-conteudo): título "Início" e, embaixo, o estado "carregando": três colunas de cartão com os rótulos à vista e cada número como esqueleto (.k-esqueleto), nunca um zero provisório.
   - Ao passar o mouse no seletor de dia, a dica: "← e → trocam o dia · H volta para hoje".

2. G2-computador-calendario — igual à 1, com o calendário aberto sob o seletor (.k-calendario), em outubro de 2026: domingos 04, 11, 18 e 25 e o dia 12/10 marcados como sem expediente; 21/10 como hoje; de 22 a 31/10 desligados (futuro); os dias do fim de setembro que completam a primeira semana, como de outro mês.

3. G2-computador-dia-passado — o dono escolheu terça, 15/09/2026:
   - o seletor destacado (.k-outro-dia) "‹ ter, 15/09/2026 ›", com as duas setas ligadas;
   - faixa neutra logo abaixo da barra (.k-faixa.k-neutra): "Você está vendo terça, 15/09/2026 · calculado em 20/10 às 22h04" e a ação "Voltar para hoje";
   - o menu da conta aberto (.k-menu-aberto): "Israel", "Dono" e "Sair";
   - conteúdo carregando, como na 1.

4. G2-computador-faixas — folha de estados da faixa: a barra de cima repetida cinco vezes, uma sobre a outra, cada uma com a faixa logo abaixo, na ordem da mais grave para a menos grave:
   a) sem conexão (.k-faixa.k-sem-conexao): "Sem conexão. Os números na tela são das 14h05." e o botão "Tentar de novo";
   b) desatualizado (.k-faixa.k-atencao): "Os números são das 14h05: a atualização das 15h falhou. O aviso foi pelo Telegram.", com a barra dizendo "Atualizado às 14h05 · próxima às 16h"; sem botão de recalcular (o app não manda rodar nada);
   c) dia passado: a mesma da prancha 3;
   d) hoje ainda sem atualização, às 07h30 (.k-faixa.k-neutra): o seletor em "ter, 20/10/2026" (o último dia calculado) e a faixa "A primeira atualização de hoje é às 8h. Os números são de terça, 20/10.";
   e) loja fechada no dia escolhido (.k-faixa.k-neutra): o seletor em "dom, 18/10/2026" e a faixa "Loja fechada no domingo, 18/10/2026. Os números do mês continuam."
   Ao lado do título de cada uma, o nome do estado em texto pequeno, para eu saber qual é qual.

5. G2-computador-outra-tela — a moldura numa tela que não é das três perguntas: "Clientes" ativo no menu (grupo Relacionamento). Nessas telas a barra de cima NÃO tem o seletor de dia: só a busca, "Atualizado às 14h05 · próxima às 15h" e a conta. No conteúdo, título "Clientes" e o estado de erro (.k-aviso-erro): "Não foi possível buscar os clientes agora." e "Tentar de novo".

6. G2-celular — a moldura do celular do dono (.k-raiz.k-celular):
   - barra de cima compacta (.k-barra-cima-celular): "Kaizen", o dia "qua, 21/10" (tocar abre o calendário) e "14h05";
   - conteúdo (.k-conteudo-celular): título "Início" e três cartões empilhados no estado carregando;
   - barra de baixo (.k-barra-baixo) com cinco destinos: Início (ativo), Vendas, Compras, Financeiro e "Painel" (este último chega na Fase 8; no desenho, mostre).
   - Sem atalhos de teclado e sem a busca de cliente.

7. G2-celular-calendario — igual à 6, com a folha que sobe de baixo (.k-veu-celular + .k-folha) aberta, com o calendário de outubro de 2026 (os mesmos dias marcados da prancha 2).

8. G2-celular-dia-passado — igual à 6, com o dia "ter, 15/09" destacado na barra e a faixa neutra curta logo abaixo: "Vendo terça, 15/09 · Voltar para hoje".

O QUE CADA CLIQUE FAZ (para as pranchas que você ligar entre si, se quiser deixá-las clicáveis)
- Item do menu → abre a tela, mantendo o dia escolhido.
- ‹ e › → dia anterior e dia seguinte (› desligado em hoje); a data → abre o calendário; "Voltar para hoje" → hoje.
- Busca → abre a ficha do cliente (tela R2, que vem depois).
- "Sair" → tela de entrada (G1, a próxima).
- Teclas no computador: ← e → trocam o dia, H volta para hoje, 1, 2 e 3 abrem Vendas, Compras e Financeiro. As teclas valem só fora de campo de texto.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Só uma faixa por vez, a mais grave primeiro.
- O seletor de dia só aparece nas telas das três perguntas (Início, Vendas, Compras e Financeiro e os detalhes delas).
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de pelo menos 44 px no celular; nenhuma rolagem para o lado; nada de animação além das que o Design System prevê (abrir e fechar calendário, menu, folha).
- Cor só para estado: só a faixa "desatualizado" é âmbar; as outras faixas são neutras (a de sem conexão, escura).

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
