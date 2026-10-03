# Revisão 3 do Design System do Kaizen (versão 1790993722-3919, a "versão 10")

03/10/2026. Duas frentes em paralelo: uma conferiu os 11 itens da rodada curta (`docs/app/prompts/00d-correcao-design-system.md`) contra os arquivos e a versão anterior; a outra mediu as 21 pranchas no Chromium (Playwright), com uma cópia local da Inter, porque a fonte do Google não carrega neste ambiente. Os achados marcados "corrigir" eu conferi pessoalmente nos arquivos. Scripts e capturas em `/tmp/claude-0/kaizen-revisao-ds-3/` (`itens/` e `medicoes/`). **FATO** = conferi no arquivo ou medi. **OPINIÃO** = recomendação minha.

## a) Veredito

1. **Os 11 itens estão feitos, com os valores pedidos** (FATO). A seção "Mudanças da rodada 2" está no README (linhas 344 a 369), e o que ela afirma confere com as medidas.
2. **Falta uma última rodada curta** (prompt `docs/app/prompts/00e-correcao-design-system.md`). Nenhum dos achados impede a G2, mas convém corrigir antes de instalar o Design System no projeto das telas, porque a cópia instalada não se atualiza sozinha (OPINIÃO).
3. **As quatro decisões dele estão confirmadas, com condições** (seção e).

## b) Os 11 itens (FATO)

| Item | Resultado medido |
| --- | --- |
| 1. Alvos de 44 px no celular | "Daniele" 55 × 44 px (antes 55 × 35); título do cartão com 68 px nas duas linhas; campo com 44 px; as 7 colunas do calendário iguais (46,8 px em 360, 49,0 em 375, 51,1 em 390); "i" da dica 44 × 44, com 98% a 99% do quadrado recebendo o toque. Nos 14 celulares das pranchas, nenhum alvo abaixo de 44 px. |
| 2. Letra de 14 px no celular | As 25 regras de 13 px têm a versão de 14 px dentro de `.k-celular`. Nenhum texto de componente abaixo de 14 px nas 20 pranchas. No computador, 1.783 textos, o menor com 13,00 px. |
| 3. Barras do celular presas | Com o cartão aberto, as barras ficam em 56 e 64 px nas três larguras. Em 360 × 640, o conteúdo mostra 520 px de 711 e rola por dentro; a página não rola. |
| 4. Gráficos na largura real | Caixas de 294, 309 e 324 px: o desenho tem a largura da caixa e letra de 14,00 px; nada cortado, sobreposto ou cruzado. Redesenha sozinho quando a caixa muda (testado sem mexer na janela). |
| 5. Indicador | Coluna de 280 px no `bundle.css`; a linha da projeção mede 237 px e sobram 43. O % em cada linha: Loja 61,6%, Igor 68,0%, Daniele 53,6%. |
| 6. Cartão de pergunta | A quebra do caixa é link; o Compras aberto tem a barra das curvas em cinza (44,0%, 26,7%, 20,7% e 8,7%); o "sem meta" mostra a projeção e "Sem a meta do mês não há ritmo."; os três cartões sem detalhe não têm seta. |
| 7. Exemplos | Nenhum "13h05" no projeto; "calculado em 20/10 às 22h04"; Compras só com "90 dias até 21/10 (24/07 a 21/10)"; meta só com mês, vendedor e valor; projeção só da loja; "Painel" nas 7 barras de baixo; "Em dia", "Clientes sumidos", "Valor em risco R$ 4,2 mil por mês". |
| 8. As três respostas | A definição da quebra palavra por palavra (R$ 0,00 em 20/10); painel sem véu, dentro da moldura; dias sem expediente reais nos calendários (outubro: domingos e 12/10; setembro: domingos, 07 e 26). |
| 9. Foco | Anel branco na faixa sem conexão, com 14,56:1; "Tentar de novo" é botão; diálogo e folha com `aria-modal`. |
| 10. Altura dos cartões | As 13 alturas novas batem, e nenhuma prancha passa da altura. A Fundamentos passa 5 px na largura (seção d). |
| 11. README e tokens | As frases corrigidas conferem; 85 variáveis no `tokens.css`, iguais às do `tokens.json`; o `bundle.css` usa 59, todas existentes; 0 erros de console. |

A varredura do que não podia sobrar ficou limpa: "Clientes" como 5º destino, "01/10", "régua de R$ 5 mil", "Ativo", projeção por vendedor, "Este mês/Mês passado", "Vale a partir de" e "Motivo" só aparecem no histórico do README.

## c) O que precisa corrigir (FATO)

1. **Ordem das faixas de aviso.** O `FaixaAviso/README.md` (linha 3) diz "a mais grave primeiro: sem conexão, desatualizado, dia passado, sem atualização, loja fechada", e o README (linha 210) repete a regra. Isso contraria a decisão de 03/10: com o dia passado acima das outras duas neutras, as faixas de loja fechada e de hoje sem atualização nunca apareceriam. Além disso, a faixa de loja fechada está sem "Voltar para hoje". O 00d não pedia essa mudança, porque a decisão é do mesmo dia e entrou só no prompt da G2.
2. **Dias sem expediente "que vêm das vendas"** (README linhas 207 e 251; `MolduraComputador/README.md`, linha 3). No app, esses dias são os que o dono marca em Metas e feriados (K2) e chegam prontos do servidor. Quem programasse pela frase poderia marcar como fechado um dia sem venda por falha do ERP. A frase nasceu do nosso 00d.
3. **Regra da seta do cartão** (README linha 211): "cartão sem detalhe (sem dado, sem meta, saldo velho) não tem seta". Seguida à risca no app, ela esconderia no Início as contas e a quebra do caixa sempre que o saldo estivesse velho. Vira "a seta só aparece quando o cartão tem detalhe para abrir" (registrado em `docs/DECISOES.md` e na I1 da `TELAS.md`).
4. **Moldura do celular presa em 390 px** (`bundle.css`, linha 131: `max-width: 390px`). O modo celular vale até 599 px; em telas de 412 e 430 px (Android comum e iPhone grande), a moldura para em 390 px, encostada à esquerda, e sobra uma faixa cinza de 22 e 40 px. O problema já existia na versão anterior, mas não tinha sido medido.

## d) Menores (FATO)

- A faixa desatualizado tem cor e ícone, mas não tem a palavra "Atenção".
- O README não manda zerar a margem do body; com a margem padrão, a barra de baixo do celular fica 8 px abaixo da tela.
- Dentro do celular, abas, visões, chips, "Limpar filtros", botão só ícone e os links da tabela medem de 19 a 40 px. O painel de relacionamento (R5) terá tabela reduzida no celular.
- Em 360 px, o valor da Daniele desce de linha e encosta na linha divisória de baixo. Os dois rótulos da barra de meta ficam a 8 px um do outro, e com "R$ 102,4 mil" o da direita sai 9 px da caixa.
- Com a folha aberta, o Tab chega a 11 elementos debaixo do véu. O anel de foco de um dia do calendário encosta no dia escolhido.
- A seta do bloco da IA gira ao abrir, e a regra de movimento não inclui esse bloco.
- A Fundamentos tem 1205 px de largura num cartão de 1200 (a tabela de contraste cresceu).
- O leitor de tela lê duas vezes a frase da barra das curvas (rótulo e nome da barra).
- A linha da média nas vendas por dia dá 2,31:1 quando passa sobre as barras escuras.
- No cartão aberto, Igor mostra "ritmo 1,04" e Daniele só "Fora 0,82".
- O Design System não tem o botão do dia do celular destacado para um dia que não é hoje; o prompt da G2 precisava dele. A 00e cria `.k-dia-celular.k-outro-dia`.

## e) As quatro decisões dele (OPINIÃO: confirmar todas)

| Decisão | Por que confirmar | Condição |
| --- | --- | --- |
| "Descartar o que foi digitado?", com "Continuar editando" e "Descartar" | Segue a K2 ("sair sem salvar → pergunta") e a entrada de 03/10 sobre o painel | O foco abre em "Continuar editando"; Esc volta a editar; sem nada digitado, fecha direto; vale na folha do celular. Ainda não está desenhado: a 00e pede a prancha. |
| Barra das curvas sem legenda no Compras aberto | A frase ao lado já dá as quatro contagens, na ordem da barra (I1) | A frase vem pronta do servidor; na tela de Compras (C1), a barra tem legenda com contagem e %. |
| Valor do vendedor desce de linha quando não cabe | Só acontece em 360 e 375 px; em 1920 px e na prancha de 1240, fica ao lado | 8 px de padding vertical quando desce. |
| Mês da meta como lista ("outubro de 2026") | É o campo de mês do Design System; a K2 usa o seletor ‹ › no topo | De abril de 2026 até 12 meses à frente; no painel de exemplo, sai a lista Vendedor, que repete o título. |

## f) Próximo passo

1. O dono cola a 00e na conversa do Design System.
2. Quando o README tiver "Mudanças da rodada 3", cria o projeto pelo modelo **Design** e cola o prompt da G2, que já pede a versão da rodada 3 e usa `.k-dia-celular.k-outro-dia`.
3. A conferência da rodada 3 corre em paralelo com o desenho da G2; se aparecer algo grave, avisamos antes de a G2 ser aprovada.
