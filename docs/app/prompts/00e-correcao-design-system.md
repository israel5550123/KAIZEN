# Prompt 00e — Última rodada de correção do Design System (versão 1790993722-3919)

Sai da revisão de 03/10/2026 (`docs/app/revisoes/2026-10-03-design-system-v10.md`). Cole o texto abaixo na mesma conversa do Design System **antes** de criar o projeto das telas: o projeto guarda uma cópia do Design System no momento da instalação, e essa cópia não se atualiza sozinha. O item 9 leva as respostas às quatro decisões que ele pediu para confirmar.

Quando ele terminar, confira se o README ganhou a seção "Mudanças da rodada 3". Se ganhou, já pode criar o projeto e colar o prompt da G2 (`G2-moldura.md`); a conferência desta rodada corre em paralelo.

---

```text
Conferi a versão 1790993722-3919 no navegador. Os 11 itens da rodada 2 estão feitos, com os valores pedidos, e a seção "Mudanças da rodada 2" confere com os arquivos. Esta é a última rodada antes de eu instalar o Design System no projeto das telas. Corrija em todas as pranchas afetadas e use exatamente os valores dados.

1. Faixas de aviso. A regra "a mais grave primeiro" mudou: com ela, as faixas de loja fechada e de hoje sem atualização nunca apareceriam, porque nos dois casos o dia mostrado não é hoje.
   - No FaixaAviso/README.md e na tabela "O que o app precisa programar" do README (linha da Faixa de aviso), escreva: "Uma faixa por vez: sem conexão, depois desatualizado, depois as neutras. Entre as neutras, a de dia passado é a última: num dia sem expediente fica a de loja fechada (com 'Voltar para hoje'); quando o app abre sozinho no último dia calculado, antes da primeira atualização do dia, fica a de hoje sem atualização."
   - Na prancha Faixa de aviso e na Página de amostra: a faixa de loja fechada ganha a ação "Voltar para hoje" (.k-acao, link); a faixa desatualizado ganha a palavra "Atenção" antes da frase (hoje tem só a cor e o ícone, e a regra é cor, ícone e palavra); a faixa de hoje sem atualização passa a dizer "A primeira atualização de hoje é às 8h. Os números são de terça, 20/10."
2. Dias sem expediente: troque "que vêm das vendas" por "que o dono marca em Metas e feriados e chegam prontos do servidor" no README (tabela, linha do Seletor de dia, e parágrafo dos dados de exemplo) e no MolduraComputador/README.md. O "vêm das vendas" do meu pedido só dizia de onde tirei as datas do exemplo; no app, um dia sem venda (por exemplo, com o ERP fora do ar) não vira dia fechado.
3. Seta do cartão de pergunta: no README e no CartaoPergunta/README.md, troque "cartão sem detalhe (sem dado, sem meta, saldo velho) não tem seta" por "a seta só aparece quando o cartão tem detalhe para abrir". No app, o Financeiro com saldo velho ou sem saldo ainda abre as contas e a quebra do caixa, e o Vendas sem meta ainda abre o realizado por vendedor. As pranchas ficam como estão.
4. Moldura do celular:
   - tire o max-width: 390px de .k-celular (bundle.css:131) e deixe width: 100%. O modo celular vale até 599 px de largura; hoje, em telas de 412 e 430 px, a moldura para em 390 px e sobra uma faixa cinza à direita. As pranchas continuam desenhadas em 390 px;
   - no "Como usar no app", acrescente "body sem margem (margin: 0)": com a margem padrão de 8 px, a barra de baixo fica 8 px abaixo da tela.
5. Botão do dia no celular quando o dia não é hoje: crie .k-dia-celular.k-outro-dia, com as cores do .k-outro-dia do computador (fundo cor-destaque-fundo, borda cor-destaque). Mostre na Moldura do celular uma barra com "ter, 15/09" (sem "Hoje") e a faixa de dia passado logo abaixo.
6. Celular (dentro de .k-celular):
   - alvo de 44 px também em .k-aba, .k-visoes button, .k-chip, "Limpar filtros", .k-botao.k-icone (na largura) e nos links e botões da .k-tabela (ordenar e nome). O painel de relacionamento vai ter uma tabela reduzida no celular, e hoje esses alvos medem de 19 a 40 px;
   - quando o valor do vendedor desce de linha no cartão aberto (360 e 375 px), dê 8 px de padding vertical ao link: hoje o valor da Daniele encosta na linha divisória de baixo;
   - .k-meta-rotulos com flex-wrap: wrap: em 360 px os dois rótulos ficam a 8 px um do outro e, com "R$ 102,4 mil realizado", o da direita sai 9 px da caixa.
7. Foco:
   - folha que sobe de baixo: escreva no README "com a folha aberta, o resto da tela fica inert (o Tab não sai da folha); ao fechar, o foco volta ao botão que a abriu". Hoje o Tab chega a 11 elementos debaixo do véu;
   - dias do calendário: outline-offset: -2px. Hoje o anel do dia 14 encosta no dia 21 escolhido e perde o lado de baixo.
8. Pequenos:
   - tire o transition da seta do bloco da IA (bundle.css:482): a regra de movimento não inclui esse bloco;
   - Fundamentos: a tabela de contraste mede 1181 px numa seção de 1152 px, e o cartão rola 5 px para o lado. Deixe a coluna "Uso" quebrar linha;
   - quando a barra dividida tem o rótulo (.k-rotulo) com a mesma frase, ponha aria-hidden="true" na .k-dividida, para o leitor de tela não ler a frase duas vezes;
   - vendas por dia: a linha da média sobre as barras escuras dá 2,31:1. Dê a ela um contorno branco de 1 px;
   - cartão aberto de Vendas: a linha da Daniele mostra "Fora 0,82" sem a palavra "ritmo". Escreva "ritmo 0,82" junto da marca "Fora", como na linha do Igor ("ritmo 1,04").
9. Suas quatro decisões: confirmadas, com estas condições.
   a) "Descartar o que foi digitado?", com "Continuar editando" (secundário) e "Descartar" (principal): o foco abre em "Continuar editando"; Esc volta a editar; sem nada digitado, fecha direto, sem perguntar; vale também na folha do celular, ao tocar no véu com algo digitado. Desenhe esse diálogo na prancha do Formulário, perto do painel lateral.
   b) Barra das curvas sem legenda no Compras aberto: a frase vem pronta do servidor, sempre na ordem da barra (A, B, C e sem venda). Fora do cartão, na tela de Compras, a barra usa a legenda com a contagem e o % de cada parte.
   c) Valor do vendedor que desce de linha quando não cabe: confirmado, com o padding do item 6.
   d) Mês da meta como lista ("outubro de 2026"), de abril de 2026 até 12 meses à frente. No painel de exemplo "Ajustar a meta do Igor", tire a lista Vendedor, porque o título já diz quem é.
10. Mudanças de token vão no tokens.json, porque o editor regrava o tokens.css a partir dele. No fim, acrescente ao README a seção "Mudanças da rodada 3", com o que mudou em cada item acima (feito ou não feito, e por quê).
```
