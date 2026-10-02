# Prompt 00c — Correção do Design System (Claude Design)

Sai da revisão de 02/10/2026 (`docs/app/revisoes/2026-10-02-design-system.md`).

Cole o texto abaixo na mesma conversa do Design System. Antes de colar, troque ou confirme os trechos entre colchetes `[DECISÃO DO DONO: …]`: o texto que está dentro é a recomendação e vale se você não mudar nada (depois apague os colchetes).

---

```text
Revisei o Design System (versão 1790980055-eb38) abrindo as pranchas num navegador com o bundle.css e medindo. Antes das telas, faça as correções abaixo nesta ordem. [DECISÃO DO DONO: Aprovo o cartão v2 com os ajustes do item 5. As outras 19 pranchas entram nesta mesma rodada, pela lista abaixo, em vez de uma revisão por prancha.] Corrija em todas as pranchas afetadas, não só no cartão. Onde eu der um valor, use exatamente esse.

1. Base da folha (é a causa dos "botões estourados"). A regra `.k-raiz button {…}` (bundle.css:14) vence `.k-botao`, `.k-chip`, `.k-aba`, `.k-limpar` e `.k-conta`: eles perdem a margem interna, a borda e o peso 500. Escreva a base com `:where(.k-raiz)` (para `button`, `a` e `a:hover`), para qualquer classe de componente vencer, e não sublinhe `<a class="k-botao">` no mouse. Confira: "Salvar" com 16 px de margem interna, "Cancelar" com borda de 1 px, aba escolhida com o sublinhado azul de 2 px, chips com borda.

2. [DECISÃO DO DONO: Publique `project/tokens.css` pronto, ao lado do bundle.css, com as 81 variáveis e mais `--font-inter: Inter, system-ui, -apple-system, "Segoe UI", sans-serif`, e ponha a fonte como token no tokens.json. O app vai copiar os dois arquivos, sem script.] Em cada preview.html, inclua os links para `../../tokens.css` e `../bundle.css`, para as pranchas abrirem iguais fora do editor.

3. Cor de estado só para estado (TELAS: situação do cliente e classe ABC nunca usam cor de estado):
   - no tokens.json, tire os pinos "atrasado" e "sumido" do âmbar e do vermelho (linhas 128, 153, 248 e 263) e escreva que a situação do cliente usa cinza ou forma;
   - na Marca de estado, troque os exemplos "Atrasado 12 dias" e "Sumido há 60 dias" por "Saldo velho" (atenção) e "Abaixo do ritmo" (fora), e corrija o README dela;
   - na lista "Clientes sumidos" e na ficha da Marcenaria Bom Jesus, mostre os dias e a marca em neutro, e tire o ponto vermelho da sparkline;
   - na barra A/B/C, tire o vermelho de "13 sem venda".

4. Três sinais sempre. Crie uma marca compacta (ícone de 14 px + palavra curta + número, por exemplo "Fora 0,82" e "Atenção −0,06") e use-a onde hoje há só cor, ou cor e ícone sem a palavra:
   - nas exceções do cartão;
   - nas diferenças do Número grande;
   - na Lista de exceções;
   - nos rótulos dos gráficos ("ritmo 0,94 · Atenção", "−R$ 3,4 mil · Fora").
   A linha "Loja" do indicador ganha a marca "Atenção". Sem régua cruzada (por exemplo, "+8 produtos contra o mês passado"), não use cor.

5. Cartão de pergunta. [DECISÃO DO DONO: Mantenha a expansão, mas o cartão fechado mostra o título com a pergunta ("Vendas: como estou em relação à meta?"), a marca, o número com a comparação, a frase-resumo, UMA linha de exceção com nomes clicáveis ("Abaixo do ritmo: Daniele · Fora 0,82") e o rodapé "Ver o desvio ›". Aberto, ele acrescenta a barra de meta, a lista completa e os outros itens (encalhe, quebra do caixa).]
   - Em vez de role="button" no cartão inteiro, use um botão próprio de abrir: a seta, com aria-expanded e o nome "Mais detalhes de Vendas". Os links ficam fora desse botão.
   - Compras aberto: "Parado há 90 dias: 38 produtos · R$ 24,6 mil". Tire "13 de 150 sem venda" do contexto da falta.
   - Financeiro fechado: "Saldo de 20/10: R$ 41,3 mil − R$ 33,1 mil até 28/10".
   - Vendas volta a ter "Hoje até 14h05: R$ 4,1 mil em 24 vendas".
   - Desenhe também: o Financeiro aberto (folga em 7 e em 30 dias, saldo de 20/10, "nenhuma conta vencida", a vencer até 28/10, quebra do caixa); o "sem dado" com o botão "Digitar saldo"; o "sem meta" com "Cadastrar meta"; o "saldo velho" em atenção ("saldo de 12/09").
   - [DECISÃO DO DONO: Aberto em "no lugar", mostra os mesmos números, sem cor e sem lista de exceções, mais o "Ver o desvio ›".]

6. Dados por vendedor, com metas de R$ 75 mil cada. [DECISÃO DO DONO: Igor R$ 51,0 mil (ritmo 1,04; 68,0% da meta; projeção R$ 79,4 mil); Daniele R$ 40,2 mil (ritmo 0,82; 53,6%; projeção R$ 62,6 mil); e uma linha "Outros (sem meta própria)" com R$ 1,2 mil (projeção R$ 1,8 mil).] A soma dá R$ 92,4 mil e as projeções dão R$ 143,8 mil. Use os mesmos valores no indicador, no gráfico "Realizado por vendedor", nas sparklines e no formulário.

7. Nem a IA nem a tela fazem conta:
   - Bloco da IA: ponha `open` no primeiro bloco e use este texto: "A loja está um pouco atrás da meta, com ritmo de 0,94. O atraso está na Daniele, com ritmo de 0,82; o Igor está adiantado, com 1,04. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil." No estado indisponível: "Texto da IA indisponível agora. Os números continuam valendo."
   - Formulário: a confirmação diz só "A meta de outubro do Igor muda de R$ 75.000,00 para R$ 60.000,00. Confirmar?", sem o 1,30. No estado de erro, esconda a linha do efeito. Desenhe o estado "a gravação falhou", com o que foi digitado mantido nos campos.

8. Gráficos e página de amostra com os dados do prompt:
   - "Vendas por dia": zero nos domingos 04, 11 e 18 e no feriado de 12/10, venda nos outros dias, soma de R$ 92,4 mil (hoje, R$ 4,1 mil até 14h05). Média dos 16 dias completos com venda (sem contar hoje): (92,4 − 4,1) ÷ 16 = R$ 5,5 mil. Use a mesma média onde ela aparecer.
   - Nenhuma conta vencida no exemplo (o Financeiro está "no lugar"): os R$ 33.100,00 vencem todos entre 22 e 28/10. Refaça assim a tabela de contas e a barra dividida (tire o exemplo "R$ 9.900,00 vencidas"); a linha de conta vencida aparece só como variante, num exemplo à parte, com a marca "Fora".
   - Saldo, com o título "Saldo previsto": começa em "saldo R$ 41,3 mil (20/10)", passa por R$ 8,2 mil em 28/10 e não cruza o zero até 04/11.
   - Acumulado: a meta em degraus pelos dias úteis (R$ 98,1 mil em 21/10), não em linha reta. Eixos com "R$ 50 mil".
   - Número grande "Vendas hoje": "R$ 4,1 mil até 14h05" contra "R$ 3,8 mil num dia como hoje até 14h05" (suposição de exemplo; registre no README), com "24 vendas" de apoio.
   - Página de amostra: se a faixa diz "os números são das 13h05", a barra diz "Atualizado às 13h05". Use os títulos exatos das perguntas ("Compras: estou comprando o que gira ou o que encalha?", "Financeiro: tenho dinheiro para pagar as contas?") e a data "qua, 21/10/2026".

9. Contraste (mínimo de 3:1 para barras e bordas com significado):
   - Barra de meta: a projeção vira um traço de 2 px em cor-texto #151419 (14,2:1 sobre a trilha, 3,6:1 encostada no azul). A barra do realizado fica sempre azul, e o estado vai na marca ao lado do nome (âmbar sobre a trilha dá só 2,5:1).
   - Gráfico por vendedor: barra neutra em cinza-600 #525062 (6,1:1 sobre a trilha).
   - Barra A/B/C: partes em cinza-700 #3e3c4a, cinza-600 #525062, cinza-500 #6f6d7c e cinza-400 #8c8a96 (todas com 3,4:1 ou mais contra o branco), sem o azul de ação na curva A.
   - Borda de campo em repouso: cor-contorno-forte #8c8a96 (3,4:1).
   - Erro de tela: sem opacidade nos números de trás; a hora dos números vai escrita na frase.
   - Link no mouse em linha selecionada da tabela: cor-destaque-hover (hoje dá 4,4:1).
   - Corrija no README a frase "nenhum par usado abaixo do mínimo".

10. Celular, dentro de `.k-celular`:
   - nenhum texto abaixo de 14 px: rótulos da barra de meta, dica, rótulos de campo, mensagem de erro, cabeçalho e legenda do calendário, cabeçalho de tabela;
   - barra de baixo em 14 px, com um nome curto e inteiro no quinto destino (sugestão: "Clientes");
   - 44 px nos links das exceções do cartão, no "Ver o desvio" e nas setas do mês da folha (hoje 19, 24 e 32 px);
   - `.k-celular` com largura de 100% e no máximo 390 px, testado em 360, 375 e 390;
   - o README diz como o app liga o modo celular;
   - a folha ganha altura máxima de 85% da tela e rolagem, e uma versão com formulário curto (digitar o saldo).

11. Gráficos: desenhe o SVG na largura real da caixa (o JavaScript mede a caixa e usa essa largura no viewBox), para a letra ficar sempre com 13 px (hoje sai com 12,3 px). Refaça a prancha assim.

12. Indicador com barra de meta: trilha até 120% da meta, como no cartão; a projeção para no fim da trilha; "R$" e o valor sem quebra de linha.

13. Lista-detalhe: nome e linha de apoio à esquerda, valor à direita (hoje o valor cai na coluna da esquerda). Desenhe também a variante com tabela à esquerda.

14. Menu. [DECISÃO DO DONO: Sem menu recolhido. Os 8 grupos ficam sempre abertos (o nome do grupo é só rótulo, sem clique) e os 22 itens aparecem; quando todos existirem, o menu rola por dentro.] Monte a prancha com `.k-moldura` e use uma marca só.

15. Faixas e calendário:
   - "Tentar de novo" na faixa sem conexão;
   - "Você está vendo terça, 15/09/2026 · calculado em 01/10 às 22h04";
   - na faixa sem atualização, diga de que dia são os números;
   - loja fechada: "Loja fechada no domingo, 18/10/2026. Os números do mês continuam.", sem "Ver sábado";
   - seletor de dia destacado quando o dia não é hoje;
   - calendário de abril de 2026 com "Mês anterior" e 30–31/03 desligados, e de setembro com 15/09 escolhido e 21/10 marcado como hoje;
   - corrija a nota da prancha.

16. Painel lateral e véu com `position: fixed` no computador (hoje somem quando a página rola). No celular, o formulário vai para a folha.

17. Dica: o "i" do computador também ganha o nome "O que é ritmo"; o balão abre acima ou ao lado do número, sem cobri-lo; o número fica dentro da área de passar o mouse.

18. Abas e visões: as visões prontas ganham contagem ("Encalhe 38", "Ruptura 3", "Comprados sem venda 13") e o período vai para um controle separado. Texto de exemplo da busca: "Nome, código ou telefone" (hoje corta em "telefon").

19. Animação (decisão de 02/10): tokens de tempo de 150 ms e 200 ms e uma curva que desacelera no fim, só ao abrir e fechar painel, diálogo, menu, calendário, folha e cartão. Nada de animação ao trocar de tela, nos números, nos gráficos ou ao carregar. Com `prefers-reduced-motion`, nenhuma animação. Escreva a regra no README.

20. Ícones. [DECISÃO DO DONO: O app usa os SVG originais do Lucide, copiados para dentro da página, sem biblioteca. Troque os redesenhados pelos originais e liste no README cada ícone com o nome do Lucide.]

21. Pequenos:
   - crie `.k-marca-kaizen` e `.k-rotulo-celular` e tire o estilo escrito à mão das amostras da Fundamentos;
   - corrija para 29 + 28 = 57 cores e as razões 14,2:1 e 14,6:1 (não "15:1");
   - tabela: rótulos alinhados com os números, "0 contas" no vazio, o menu do "Colunas" e uma linha com o mouse em cima;
   - botão de perigo como secundário neutro, com confirmação em diálogo;
   - quadrados da capa em cinza;
   - `font-variant-numeric: tabular-nums` na `.k-raiz`;
   - barra de cima que encolha até 1366 px sem rolar para o lado;
   - tire "Meu perfil";
   - "Vendedores fora do ritmo" só com a Daniele;
   - carregando e erro mostrados dentro da moldura;
   - notas das pranchas sem jargão ("hover", "sticky", "tooltip", "azul-50");
   - ids únicos no formulário.

22. No fim, atualize o README com uma seção "Mudanças da rodada de 02/10": o que mudou em cada item acima (feito ou não feito, e por quê), as razões de contraste novas e a tabela de situação dos 21 componentes. Tire do README as frases que deixaram de valer.
```
