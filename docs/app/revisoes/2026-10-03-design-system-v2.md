# Revisão 2 do Design System do Kaizen (versão 1790987546-d6a4)

03/10/2026. Juntei as 4 frentes e conferi pessoalmente cada item marcado "corrigir": abri os arquivos e refiz as medidas no Chromium. A fonte do Google não carrega neste ambiente, então usei uma cópia local da Inter (a medida em px não depende disso). Scripts em `/tmp/claude-0/kaizen-revisao-ds-2/consolidacao/` (`verif.js`, `graf.js`, `painel.js`, `card.js`). **FATO** = conferi no arquivo ou medi. **OPINIÃO** = recomendação minha.

## a) Veredito

1. **Sim, dá para começar as telas.** As 3 causas graves da rodada passada (botões desmontados, cor de estado em cliente e na curva ABC, cartão de pergunta) estão resolvidas, e nada do que sobrou passa sozinho para todas as telas do computador.
2. **Falta uma rodada curta**, com 11 itens (prompt pronto em `PROMPT-CORRECAO-2.md`): alvos de toque e letra no celular, barras do celular, gráfico em caixa estreita, coluna do indicador, 4 ajustes no cartão, exemplos e README.
3. **Quando:** colar junto com o pedido da primeira tela (Início). A rodada tem de estar feita antes da primeira tela de celular e antes de o app copiar `tokens.css` e `bundle.css` (Fase 5b).

## b) Placar dos 22 itens (FATO)

**17 feitos, 5 em parte, nenhum sem fazer.** Feitos: 1 a 7, 9 e 13 a 21.

| Item | O que falta |
| --- | --- |
| 8. Exemplos | Na Moldura do celular com faixa, a barra diz 14h05 e a faixa diz "os números são das 13h05" (MolduraCelular:41). É o mesmo erro que ele corrigiu só na Página de amostra. |
| 10. Celular | O link do nome na exceção ("Daniele") mede 55×35 px, não 44. Quatro textos ficam com 13 px quando usados no celular: conta escrita do número grande, linha pequena do indicador, legenda da barra dividida e aviso da IA (bundle.css:220, 229, 250 e 465). |
| 11. Gráficos | Na prancha está certo (13,00 px). Mas o script tem um mínimo de 320 px (Graficos:45): no celular de 360 a letra sai com 12,86 px e no de 375 com 13,52 px; o pedido é 14. |
| 12. Indicador | A prancha alarga a coluna dos números para 280 px só nela (IndicadorMeta:23). O bundle.css, que o app copia, tem 220 px (:225): "projeção R$ 143,8 mil · meta R$ 150 mil" precisa de 237 px e encosta na borda do cartão. |
| 22. README | Ficaram frases que não conferem (seção c). |

## c) O que ele afirmou e não confere

**Confere (FATO):** a medição dele: letra mínima de 13 px no computador e 14 px no celular, nada cortado, nada sobreposto, sem rolagem para o lado, nas 20 pranchas e na capa (3 frentes refizeram). Também conferem: as 85 variáveis do tokens.css, iguais às do tokens.json; os 3 nomes trocados em todo lugar (o nome antigo só aparece na nota do README:276); os 36 ícones, idênticos aos do Lucide 1.50.0.

| O que ele afirmou | O que os arquivos mostram (FATO) |
| --- | --- |
| "44 px nos links da exceção" (README:261 e nota da Moldura do celular) | 55×35 px |
| 68,0% e 53,6% "no indicador" (README:257) | Não aparecem em nenhuma prancha; a TELAS:136 pede o % na linha |
| "Todos os pares usados passam" no contraste (README:60) | O anel de foco azul na faixa escura "sem conexão" dá 2,88:1 (mínimo 3:1) |
| "O app usa só os semânticos" (README:20) | O bundle.css usa 18 cores base (cinzas, branco, âmbar-100) |
| Calendário e menu "sempre com sombra-m" (README:31) | Usam sombra-p (bundle.css:102 e :108) |
| A dica anima em 150 ms (README:149) | A regra (TELAS:112) não anima a dica, e o CSS também não anima |
| A capa carrega o bundle.css (README:253) | Só o tokens.css (sem efeito: a capa não usa as classes) |

## d) Problemas novos ou que só apareceram agora, do mais grave ao menos grave

1. **As barras do celular não ficam presas** (FATO). Com o cartão aberto, a barra de cima encolhe de 56 para 45 px, a de baixo de 64 para 45 px, e o conteúdo não rola (bundle.css:130, 132, 137 e 138). No app, a barra de baixo desceria para o fim da página.
2. **Alvos de toque pequenos no celular** (FATO; a TELAS pede 44 px). O título do cartão virou link nesta rodada e tem 20 px de altura por linha. Também ficam abaixo: o campo de dinheiro (40 px), os dias do calendário da folha (de 39,7 a 58,1 px de largura, com colunas desiguais) e o "i" da dica, em que o número cobre a parte de baixo e só uns 28 px recebem o toque.
3. **Cartão de pergunta contra a TELAS** (FATO):
   - a quebra do caixa não é clicável, mas a TELAS:264 manda abrir a F3;
   - o Compras aberto não tem a barra das curvas A/B/C (TELAS:133 e :262);
   - o "sem meta" diz que não há projeção, mas a projeção não usa a meta (spec da Fase 4, linha 192);
   - nos cartões sem detalhe, a seta abre uma área vazia.
4. **Exemplos que ensinam coisa errada** (FATO):
   - a faixa de dia passado diz "calculado em 01/10 às 22h04". A rotina da noite recalcula todos os dias, então seria 20/10; o erro veio do nosso pedido;
   - as visões de Compras oferecem "Este mês / Mês passado", mas Compras só tem 90 dias (TELAS:650);
   - o formulário da meta tem "Vale a partir de" e "Motivo", que o servidor não guarda (a meta é só mês, vendedor e valor);
   - a situação de cliente aparece como "Ativo", mas a TELAS:33 diz "em dia";
   - "média por mês (12 meses)", mas a história começa em 01/04.
5. **Menores** (FATO): 13 pranchas são mais altas que o cartão do editor (Fundamentos: 3.614 px para 2.300); "Tentar de novo" é link, não botão; o diálogo não tem aria-modal.

**Descartados (OPINIÃO):**
- O painel "cortando palavras" em 1366 px: é o normal de um painel por cima da tela.
- O gráfico do saldo em caixa de 294 px: medi e os rótulos não se cruzam. Só os outros gráficos se cruzam, e esses não vão para o celular.
- Formatos como "R$ 0,3 mil": ficam como estão.

**Para o orquestrador registrar em DECISOES.md** (vêm do nosso pedido):
- A projeção por vendedor (R$ 79,4, 62,6 e 1,8 mil) não sai da Fase 4 (spec:186). Decidir: "5b acrescenta, mesma regra da loja", ou tirar a projeção dos vendedores.
- O 5º destino do celular se chama "Clientes", mas abre o Painel (R5); no menu, "Clientes" é a R1.
- "Vendas de hoje por hora" é só exemplo de forma: a V3 usa as horas do mês (spec:188).

## e) As 3 confirmações que ele pediu (OPINIÃO, apoiada nos documentos)

1. **Quebra do caixa: confirmar, com a definição exata.** FATO: a spec da Fase 4 (linha 238) e o LOJA.md:53 dizem "informado − calculado, por fechamento e por forma, sem a troca".
   - Ele acertou o sentido, mas a quebra não é só do dinheiro: soma dinheiro, Pix, crédito e débito. Negativo é o que faltou; positivo, o que sobrou.
   - O exemplo de R$ 0,00 em 20/10 serve: às 14h05 de 21/10, o último fechamento é o de 20/10 (TELAS:263). A régua proposta é de R$ 5, para mais ou para menos (TELAS:725).
   - Não precisa perguntar ao dono: a definição já está decidida.
2. **Painel sem véu: aprovar.** São menos peças, a data e a hora ficam à vista, e a TELAS (K1, linha 372) só pede "por cima da tela". Condições:
   - o painel vai dentro da moldura; fora dela, cobre a barra de cima (FATO);
   - clicar fora não fecha;
   - sair com algo digitado pergunta "Descartar o que foi digitado?", como a K2 já faz.
   - Fica aceito que, com o painel aberto, o botão da faixa de aviso ("Voltar para hoje", "Tentar de novo") fica coberto (FATO, pela posição).
3. **Suposições: não há "números reais" para pôr.** Os dados de exemplo são fictícios de propósito (prompt 00, linha 68). Trocar só três, que são regra ou forma de comparar:
   - **Feriados:** abril sem dia fechado (a loja abriu em 21/04, e 03/04 é antes dos dados); setembro com 07/09 e 26/09 (hoje falta o 26/09); outubro com 12/10, que dá os 26 dias úteis do exemplo. Fontes: DECISOES.md:81 e :95, e a regra da K2 (TELAS:406): "feriado em que a loja abriu não entra".
   - **Régua de folga de R$ 5 mil:** sai. A TELAS:723 propõe "fora" com folga em 7 dias negativa e "atenção" com folga em 30 dias negativa; a F1 compara com a folga de 7 dias atrás (TELAS:346).
   - **"30 no mês passado"** vira "há 30 dias": o Compras compara com 30 dias antes (TELAS:303).
   - O resto fica como está (o "num dia como hoje", as vendas de cada dia, as contas, os fornecedores e os produtos).

## f) Nomes trocados e o aviso do editor: o que muda para o app

- **Nomes trocados:** nada a refazer no Kaizen. Nenhum arquivo do app usa token ainda; procurei no repositório, e só o pedido 00c cita um nome velho, como histórico. Os prompts das telas passam a usar `cor-destaque-forte`, `cor-superficie-escura` e `z-dica`.
- **O app copia `tokens.css` e `bundle.css` juntos, da mesma versão, e anota a versão em DECISOES.md.** O bundle novo usa os nomes novos: com um tokens.css velho, o botão com o mouse em cima, o item selecionado e a dica ficariam sem cor. Ao copiar, conferir que toda `var(--…)` do bundle.css existe no tokens.css. Hoje são 59 usadas, todas definidas (FATO).
- **O editor regrava o `tokens.css` a partir do `tokens.json`.** A fonte da verdade passa a ser o `tokens.json`: uma correção feita só no tokens.css se perde no próximo salvamento.
- **O que o editor acrescenta, o app não usa.** O app usa só as 85 variáveis e as classes `k-*`, não as variáveis `--text-*` nem as classes de letra. Ao copiar, conferir que nenhuma classe gerada começa com `k-`, para não mudar a letra dos componentes. Não deu para testar o editor neste ambiente.
