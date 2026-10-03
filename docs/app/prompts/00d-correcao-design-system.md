# Prompt 00d — Rodada curta de correção do Design System (versão 1790987546-d6a4)

Sai da revisão de 03/10/2026 (`docs/app/revisoes/2026-10-03-design-system-v2.md`). Cole o texto abaixo na mesma conversa do Design System, junto com o pedido da primeira tela ou logo antes dele. Os itens 3 e 8 levam as respostas às três confirmações que ele pediu.

---

```text
Conferi a versão 1790987546-d6a4 no navegador. A rodada ficou boa: 17 dos 22 itens estão feitos e a sua medição confere (letra mínima, nada cortado, nada sobreposto, sem rolagem para o lado). Faltam os ajustes abaixo. Corrija em todas as pranchas afetadas e use exatamente os valores dados.

1. Alvos de 44 px no celular (dentro de .k-celular):
   - link do nome na linha de exceção do cartão ("Daniele"): hoje mede 55×35 px, porque o padding de 8 px num link em linha não chega a 44 (bundle.css:147). Use display:inline-flex; align-items:center; min-height:44px;
   - link do título do cartão: hoje tem 20 px de altura por linha. Dê a ele 44 px de área (display:block com padding vertical, ou min-height:44px);
   - campo .k-entrada: 44 px de altura (hoje 40);
   - dias do calendário da folha: as 7 colunas com a mesma largura (table-layout:fixed e td sem padding); hoje vão de 39,7 a 58,1 px;
   - "i" da dica: o número cobre a parte de baixo do botão e só uns 28 px recebem o toque. Afaste o botão do número.
2. Letra de 14 px no celular também em .k-numero-bloco .k-conta-escrita, .k-indicador .k-numeros-linha small, .k-dividida .k-partes e .k-bloco-ia .k-aviso (hoje ficam com 13 px dentro de .k-celular).
3. Barras do celular: com o cartão aberto, a barra de cima encolhe de 56 para 45 px, a de baixo de 64 para 45 px, e o conteúdo não rola. Ponha flex:none nas duas barras, .k-conteudo-celular { min-height:0; overflow-y:auto } e .k-celular com height:100dvh, para a barra de baixo ficar presa ao pé da tela. Teste com o cartão aberto em 360, 375 e 390 px.
4. Gráficos: tire o mínimo de 320 px do svgIn (Graficos/preview.html:45), para o SVG usar sempre a largura real da caixa. Hoje, no celular, a letra sai com 12,86 px (caixa de 294 px) e 13,52 px (caixa de 309 px). Redesenhe com ResizeObserver na caixa, não com o resize da janela.
5. Indicador: no bundle.css:225, a 3ª coluna do .k-indicador passa de 220px para 280px, e a prancha deixa de trocar isso só nela (IndicadorMeta/preview.html:23). Hoje, com 220 px, "projeção R$ 143,8 mil · meta R$ 150 mil" precisa de 237 px e encosta na borda do cartão. Acrescente o % em cada linha: Loja 61,6%, Igor 68,0%, Daniele 53,6%.
6. Cartão de pergunta:
   - a linha "Quebra do caixa no fechamento de 20/10" vira link (abre a tela do Caixa) em todas as pranchas que a mostram;
   - Compras aberto ganha a barra dividida das curvas, em cinza: "Comprou 150 produtos em 90 dias: 66 curva A, 40 B, 31 C e 13 sem venda". O "13 de 150" sai do bloco "Encalhe";
   - "sem meta": a frase passa a ser "Sem a meta do mês não há ritmo." e o cartão continua mostrando "Projeção R$ 143,8 mil" (a projeção não usa a meta);
   - nos cartões sem detalhe (sem dado, sem meta, saldo velho), tire a seta, que hoje abre uma área vazia.
7. Exemplos:
   - Hora: nos cenários de atualização que falhou (Moldura do celular com faixa, Estados de tela e Página de amostra), use "Os números são das 14h05: a atualização das 15h falhou. O aviso foi pelo Telegram.", a barra com "Atualizado às 14h05 · próxima às 16h" (no celular, "14h05") e o erro "Não foi possível buscar os números das 15h. Os números abaixo são das 14h05." Assim todos os números continuam os das 14h05. Hoje a Moldura do celular diz 14h05 na barra e 13h05 na faixa.
   - Faixa de dia passado: "Você está vendo terça, 15/09/2026 · calculado em 20/10 às 22h04" (a rotina da noite recalcula todos os dias; o "01/10" foi erro do meu pedido).
   - Visões de Compras: tire "Este mês" e "Mês passado". Compras só tem os 90 dias; mostre como texto fixo: "90 dias até 21/10 (24/07 a 21/10)".
   - Formulário da meta: só os campos que existem: mês ("outubro de 2026"), vendedor e valor. Tire "Vale a partir de" e "Motivo (opcional)".
   - Vendedores: tire a projeção por vendedor (R$ 79,4, 62,6 e 1,8 mil), que o servidor não calcula; cada vendedor mostra realizado, meta, % da meta e ritmo. A projeção fica só na loja (R$ 143,8 mil).
   - Celular: o quinto destino da barra de baixo se chama "Painel" (abre o painel de relacionamento), não "Clientes", que no menu do computador é outra tela.
   - Clientes: a situação é "Em dia", "Atrasado" ou "Sumido" (troque a etiqueta "Ativo"); o título da lista é "Clientes sumidos (mais de 60 dias sem comprar)"; troque "Média por mês R$ 4,2 mil (12 meses)" por "Valor em risco R$ 4,2 mil por mês" e "Compras por mês · 12 meses" por "Compras por mês desde abril".
8. Suas três perguntas:
   - Quebra do caixa: confirmado, com esta definição no README: "informado − calculado no fechamento, somando dinheiro, Pix, crédito e débito (a troca fica fora); negativo é o que faltou, positivo o que sobrou". Mantenha R$ 0,00 em 20/10.
   - Painel lateral sem véu: confirmado. Escreva no README do Formulário e na tabela "O que o app precisa programar": o .k-painel-lateral vai dentro de .k-moldura (fora dela cobre a barra de cima); a tela continua clicável; clicar fora não fecha; Esc, X ou Cancelar com algo digitado pergunta "Descartar o que foi digitado?".
   - Suposições: os números de exemplo são fictícios de propósito e ficam. Troque só estes:
     a) dias sem expediente: use os reais, que vêm das vendas: 01/05, 07/09 e 26/09 (em abril, nenhum: a loja abriu em 21/04); no exemplo de outubro, 12/10. No README: "marque só os dias em que a loja não abre; feriado em que a loja abriu não entra";
     b) folga: tire a "régua de R$ 5 mil". No Número grande, a folga em 7 dias compara com a de 7 dias atrás, sem cor: "R$ 8,2 mil contra R$ 11,5 mil há 7 dias · −R$ 3,3 mil" (suposição). A régua de estado é: Fora com folga em 7 dias negativa; Atenção com folga em 30 dias negativa;
     c) "30 produtos parados no mês passado" passa a "há 30 dias".
9. Foco e acessibilidade: anel de foco branco na faixa sem conexão, `.k-faixa.k-sem-conexao :focus-visible { outline-color: var(--branco); }` (hoje 2,88:1); "Tentar de novo" vira <button class="k-acao">; o diálogo ganha aria-modal="true"; role="listbox" só na lista (.k-lista), não em volta da ficha.
10. Altura dos cartões do editor: ajuste o height do @dsCard das 13 pranchas mais altas que ele (por exemplo, Fundamentos 3620, Graficos 1090, BlocoIA 410, EstadosTela 1480).
11. Atualize o README: corrija "44 px nos links da exceção" (README:261 e nota da Moldura do celular) depois do item 1; "68,0% e 53,6% no indicador" (README:257) depois do item 5; troque "O app usa só os semânticos" (README:20) por "o app usa os semânticos; a barra dividida, as barras de gráfico e a faixa escura usam cinzas base"; "Todos os pares usados passam" (README:60) depois do item 9; calendário e menu com sombra-p, não sombra-m (README:31 e tokens.json:174); tire "dica" do que anima (README:149 e tokens.json:573); a capa carrega só o tokens.css (README:253). Faça as mudanças de token no tokens.json, porque o editor regrava o tokens.css a partir dele. No fim, acrescente a seção "Mudanças da rodada 2", com o que mudou em cada item acima (feito ou não feito, e por quê).
```
