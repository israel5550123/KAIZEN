# Prompt G2 — Moldura do app (menu, barra de cima, calendário e avisos)

Tela 1 da lista (`docs/app/TELAS.md`, seção 7, G2). É a primeira tela, então este prompt também cria o projeto onde ficarão todas as telas.

**Antes de colar:** a última rodada do Design System (`docs/app/prompts/00e-correcao-design-system.md`) tem de estar feita na conversa do Design System. Confira que o README dele tem a seção "Mudanças da rodada 3" e que a barra de baixo do celular diz "Painel". O projeto das telas guarda uma cópia do Design System no momento em que ele é instalado, e essa cópia não se atualiza sozinha.

**Onde usar:** na aba Artifacts do claude.ai, comece um projeto novo pelo modelo **Design** (não o "Design System") e cole o texto abaixo. As próximas telas vão para este mesmo projeto, cada uma com o seu prompt. Quando aprovar a G2, mande o link do projeto para o Claude Code.

---

```text
Vamos desenhar as telas do Kaizen, uma por vez, neste projeto. Use o Design System "Kaizen" (https://claude.ai/artifact/FminwsQQNCX6hoF9ZXoSso): instale a versão cujo README tem a seção "Mudanças da rodada 3" (se não tiver, pare e me avise) e use as classes e os tokens dele (tokens.css e components/bundle.css). Não invente componente, cor, letra ou espaçamento fora dele; se faltar algo, use o mais próximo e me diga no fim o que faltou.

O QUE É O KAIZEN (contexto para todas as telas)
App web de gestão à distância de uma loja de ferragens para marceneiros em São Luís (MA). O dono acompanha três perguntas (vendas contra a meta, compras, dinheiro para pagar as contas) no modelo meta → desvio → detalhe. Uso principal no computador (1920 × 1080). O celular é auxílio e só o dono usa (para consultar e para digitar o saldo do banco); gerente e vendedores usam só o computador. Textos em português do Brasil. O app só mostra números prontos; a tela não calcula. Avisos (régua cruzada, briefing, falha da atualização) vão só pelo Telegram: no app não há sino nem notificação.

COMO ORGANIZAR O PROJETO
- Uma página do canvas por área, nesta ordem: "Moldura e entrada", "Início", "Vendas", "Compras", "Financeiro", "Cadastros", "Réguas", "Relacionamento", "Mapa", "Entregas". Hoje só a primeira recebe pranchas.
- Nome de cada prancha: código da tela, formato e, quando houver, o estado. Arquivos como "G2-computador.dc.html", "G2-celular-calendario.dc.html"; título como "G2 · Moldura · computador".
- Computador: página fluida (preenche a janela), desenhada a 1920 × 1080. Celular: cada prancha é uma página do tamanho da tela, 390 × 844, sem moldura de aparelho em volta (o véu da folha usa position: fixed e, numa página maior, cobriria tudo).
- Os mesmos dados de exemplo em todas as telas: quarta-feira, 21/10/2026, atualizado às 14h05; a pessoa que entrou é "Israel", perfil "Dono".

TELA G2 — A MOLDURA
Para que serve: a moldura de todas as telas do app: o menu, o dia escolhido, a hora da atualização e os avisos que valem para o app inteiro. As outras telas só preenchem o meio. Ela não tem números próprios.

Desenhe 8 pranchas na página "Moldura e entrada":

1. G2-computador — a moldura padrão (.k-moldura):
   - Menu lateral (.k-menu-lateral), sempre aberto, igual ao da prancha Moldura do Design System: Início; Vendas (O desvio, Padrões de venda); Compras (O desvio, Estoque e giro); Financeiro (O desvio, Contas a pagar, Caixa, Fluxo realizado); Relacionamento (Lista do dia, Painel, Clientes, Tarefas, Margem, Leads); Mapa (Mapa, Por bairro, Localizações, Concorrentes); Entregas; Cadastros (Saldo do banco, Metas e feriados, Réguas e avisos, Pessoas e acesso). "Início" ativo. No app, o menu muda por fase (cada item só aparece na fase em que a tela existe, sem "em breve") e por perfil (Cadastros só para o dono); no desenho, mostre todos.
   - Barra de cima (.k-barra-cima): seletor de dia "‹ Hoje · qua, 21/10/2026 ›" com a seta › desligada (é hoje); busca de cliente "Nome, código ou telefone" (chega na Fase 7: no desenho, mostre; no app da Fase 5b a barra fica sem ela); "Atualizado às 14h05 · próxima às 15h"; a conta como no Design System: o círculo "IS", "Israel" e a seta (o perfil aparece no menu aberto).
   - No botão da data, só a dica nativa do navegador (atributo title): "← e → trocam o dia · H volta para hoje". Não desenhe balão.
   - Conteúdo (.k-conteudo): título "Início" e, embaixo, o estado "carregando" como na prancha Estados de tela do Design System: três cartões lado a lado, com o título de cada pergunta à vista ("Vendas: como estou em relação à meta?", "Compras: estou comprando o que gira ou o que encalha?", "Financeiro: tenho dinheiro para pagar as contas?") e o resto em .k-esqueleto, nunca um zero provisório. Use os blocos cinza com as medidas da prancha Estados de tela (72 × 24 px no lugar da marca de estado; linhas de 70% e 40%), mesmo que essas larguras estejam só no estilo daquela prancha, e diga no fim que usou.

2. G2-computador-calendario — igual à 1, com o calendário aberto sob o seletor (.k-calendario), em outubro de 2026, com a semana de segunda a domingo como no Design System: na primeira linha, 28, 29 e 30/09 como de outro mês; domingos 04, 11 e 18 e o dia 12/10 como sem expediente; 21/10 como hoje e escolhido; de 22/10 a 01/11 desligados (futuro). O domingo 25/10 cai no futuro e fica só desligado, sem o ponto de sem expediente, como no Design System.

3. G2-computador-dia-passado — o dono escolheu terça, 15/09/2026:
   - o seletor destacado (.k-outro-dia) "‹ ter, 15/09/2026 ›", com as duas setas ligadas;
   - faixa neutra logo abaixo da barra (.k-faixa.k-neutra): "Você está vendo terça, 15/09/2026 · calculado em 20/10 às 22h04" e a ação "Voltar para hoje";
   - conteúdo carregando, como na 1.

4. G2-computador-faixas — folha de estados da faixa: a barra de cima repetida cinco vezes, uma sobre a outra, cada uma com a faixa logo abaixo. Acima de cada barra, fora dela, uma legenda de 13 px com a letra e o nome do estado ("a) Sem conexão"), para eu saber qual é qual. Na ordem da regra (a de cima ganha quando duas valem ao mesmo tempo):
   a) sem conexão (.k-faixa.k-sem-conexao): "Sem conexão. Os números na tela são das 14h05." e o botão "Tentar de novo";
   b) desatualizado (.k-faixa.k-atencao): o ícone, a palavra "Atenção" e a frase "Os números são das 14h05: a atualização das 15h falhou. O aviso foi pelo Telegram.", com a barra dizendo "Atualizado às 14h05 · próxima às 16h"; sem botão de recalcular (o app não manda rodar nada);
   c) loja fechada no dia escolhido (.k-faixa.k-neutra): o seletor destacado (.k-outro-dia) em "‹ dom, 18/10/2026 ›", com as duas setas ligadas, e a faixa "Loja fechada no domingo, 18/10/2026. Os números do mês continuam." com a ação "Voltar para hoje";
   d) hoje ainda sem atualização, às 07h30 (.k-faixa.k-neutra): o seletor destacado (.k-outro-dia) em "‹ ter, 20/10/2026 ›" (o último dia calculado), com a seta › desligada porque hoje ainda não tem números; a barra dizendo "Atualizado em 20/10 às 22h04 · próxima às 8h"; e a faixa "A primeira atualização de hoje é às 8h. Os números são de terça, 20/10." No domingo, que não tem atualização, a mesma faixa diz "Domingo não tem atualização. Os números são de sábado, 17/10." (só registre o texto, sem barra a mais);
   e) dia passado: a mesma faixa e o mesmo seletor da prancha 3.

5. G2-computador-outra-tela — a moldura numa tela que não é das três perguntas: "Clientes" ativo no menu (grupo Relacionamento). Nessas telas a barra de cima NÃO tem o seletor de dia: só a busca, "Atualizado às 14h05 · próxima às 15h" e a conta, com o menu da conta aberto (.k-menu-aberto): "Israel", "Dono" e "Sair". No conteúdo, título "Clientes" e, logo abaixo, o estado de erro padrão do Design System (.k-aviso-erro, em vermelho): "Não foi possível buscar os números" e o botão "Tentar de novo". Nada embaixo do aviso: é a primeira busca e não há lista anterior para mostrar.

6. G2-celular — a moldura do celular do dono (.k-raiz.k-celular):
   - barra de cima compacta (.k-barra-cima-celular) sem a marca "Kaizen": só o botão do dia (.k-dia-celular) com "Hoje · qua, 21/10" e, menor, "atualizado às 14h05" (tocar abre o calendário). Com a marca, o botão não cabe nem em 390 px e o texto quebra em quatro linhas. Vale "atualizado às 14h05", e não só "14h05" como no Design System;
   - conteúdo (.k-conteudo-celular): título "Início" e três cartões empilhados no estado carregando, só com o título de cada pergunta à vista;
   - barra de baixo (.k-barra-baixo) com cinco destinos: Início (ativo), Vendas, Compras, Financeiro e "Painel", com o ícone users (abre o painel de relacionamento; chega na Fase 8; no desenho, mostre);
   - sem atalhos de teclado e sem a busca de cliente.

7. G2-celular-calendario — igual à 6, com a folha que sobe de baixo (.k-veu-celular + .k-folha) aberta, com o calendário de outubro de 2026 (os mesmos dias marcados da prancha 2).

8. G2-celular-dia-passado — igual à 6, com o botão do dia em "ter, 15/09" (sem "Hoje") destacado (.k-dia-celular.k-outro-dia), sem a hora, como no Design System (a faixa já diz quando foi calculado). Logo abaixo, a mesma faixa neutra do computador, quebrando em linhas: "Você está vendo terça, 15/09/2026 · calculado em 20/10 às 22h04" e a ação "Voltar para hoje" (.k-acao), com 44 px de alvo.

O QUE CADA CLIQUE FAZ (para as pranchas que você ligar entre si, se quiser deixá-las clicáveis)
- Item do menu → abre a tela, mantendo o dia escolhido.
- ‹ e › → dia anterior e dia seguinte (› desligado em hoje); a data → abre o calendário; "Voltar para hoje" → hoje.
- Busca → abre a ficha do cliente (tela R2, que vem depois).
- "Sair" → tela de entrada (G1, a próxima).
- Teclas no computador (só para registro; não programe atalhos nas pranchas): ← e → trocam o dia e H volta para hoje, onde há o seletor; 1, 2 e 3 abrem Vendas, Compras e Financeiro em qualquer tela. As teclas valem só fora de campo de texto.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Só uma faixa por vez, nesta ordem: sem conexão, desatualizado, e depois as neutras. Entre as neutras, a de dia passado é a última: num dia sem expediente fica a de loja fechada (com "Voltar para hoje"), e quando o app abriu sozinho no último dia calculado, antes da primeira atualização do dia, fica a de "hoje ainda sem atualização".
- O seletor de dia só aparece nas telas dos grupos Início, Vendas, Compras e Financeiro do menu e nos detalhes que abrem delas (vendedor e produto). Cadastros, Relacionamento, Mapa e Entregas não têm o seletor: mostram hoje, ou têm seletor próprio de mês ou de data. No celular vale o mesmo: no Painel e nas telas de cliente, a barra de cima fica sem o dia (regra para as próximas telas; não desenhe agora).
- Sem sino, contador ou lista de notificações na barra: os avisos vão só pelo Telegram; no app, só a faixa.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de pelo menos 44 px no celular; nenhuma rolagem para o lado; nada de animação além das que o Design System prevê (abrir e fechar calendário, menu, folha).
- Cor só para estado: só a faixa "desatualizado" é âmbar, sempre com o ícone e a palavra "Atenção"; as outras faixas são neutras (a de sem conexão, escura).

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```

---

## Se a G2 já foi colada na versão anterior deste prompt

A conferência da rodada 3 do Design System (`docs/app/revisoes/2026-10-03-design-system-r3.md`) montou as 8 pranchas só com as classes dele e achou nove pontos do prompt a acertar; o texto acima já está corrigido. Se você colou a versão anterior, cole isto na mesma conversa, depois do primeiro pedido (serve com a G2 ainda em andamento ou já pronta):

```text
Ajustes na G2. Se já desenhou, corrija as pranchas; se ainda está desenhando, já faça assim:
1. Celular (pranchas 6, 7 e 8): a barra de cima fica sem a marca "Kaizen", só com o botão do dia. Com a marca, "Hoje · qua, 21/10" e "atualizado às 14h05" não cabem nem em 390 px e quebram em quatro linhas. Vale "atualizado às 14h05", e não só "14h05" como no Design System.
2. Prancha 8: o botão fora de hoje mostra só "ter, 15/09", sem a hora, como no Design System (a faixa já diz quando foi calculado).
3. Prancha 3: tire o menu da conta aberto, porque ele cobre o "Voltar para hoje" da faixa. O menu da conta aberto ("Israel", "Dono" e "Sair") vai para a prancha 5 (Clientes), que não tem faixa.
4. Prancha 4: a ordem passa a ser a da regra (a de cima ganha quando duas valem ao mesmo tempo): a) sem conexão, b) desatualizado, c) loja fechada, d) hoje ainda sem atualização, e) dia passado.
5. Prancha 2: o domingo 25/10 cai no futuro e fica só desligado, sem o ponto de sem expediente, como no Design System. Sem expediente: os domingos 04, 11 e 18 e o dia 12/10.
6. Carregando (pranchas 1, 3 e 6): use os blocos cinza com as medidas da prancha Estados de tela (72 × 24 px no lugar da marca de estado; linhas de 70% e 40%), mesmo que essas larguras estejam só no estilo daquela prancha, e diga no fim que usou.
7. Cada prancha de celular é uma página do tamanho da tela (390 × 844), sem moldura de aparelho em volta: o véu da folha usa position: fixed e, numa página maior, cobriria tudo.
8. Prancha 5: o aviso de erro é o padrão do Design System (.k-aviso-erro, em vermelho).
9. "No Painel e nas telas de cliente do celular, a barra de cima fica sem o dia" é regra para as próximas telas: não desenhe agora.
No fim, me diga o que mudou em cada prancha.
```
