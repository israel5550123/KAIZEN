# Prompt F1 — Financeiro: o desvio

Tela 9 da lista (`docs/app/TELAS.md`, seção 7, F1).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: F1 · Financeiro: o desvio (tela 9 da lista). As pranchas vão na página "Financeiro" do canvas, com uma nota de título "F1 · Financeiro: o desvio", como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "F1-computador.dc.html"; títulos como "F1 · Financeiro: o desvio · computador".

PARA QUE SERVE
Se o saldo do banco cobre o que vence em 7 e em 30 dias, e o que saiu do lugar: contas vencidas, saldo ausente ou velho, quebra de caixa.

O QUE A TELA MOSTRA (prancha 1, no computador, de cima para baixo)
- Menu: "O desvio" do grupo Financeiro ativo. Barra de cima com o seletor "‹ Hoje · qua, 21/10/2026 ›" (› desligada).
- Cabeçalho (.k-cabecalho-tela): "Financeiro: o desvio" (.k-titulo-tela) e, à direita (.k-sec): "qua, 21/10/2026 · posição pelo ERP novo desde 26/09 (até 25/09, pelo ERP anterior)".
- Bloco "O que isso significa" (details.k-bloco-ia), recolhido.
- Duas colunas iguais (grade local, com os 24 px da .k-tres-cartoes; diga no fim).
  ESQUERDA, um .k-cartao:
  - Marca "No lugar" (.k-estado.k-lugar.k-grande) e a frase (.k-corpo-grande): "O saldo cobre os próximos 30 dias."
  - As duas folgas lado a lado, metade cada (.k-numeros, dois .k-numero-bloco em flex 1, como na prancha Número grande; a conta escrita quebra a linha), com o "i" no rótulo (.k-gatilho; dica: "O saldo do banco menos as contas que vencem até o dia, com as vencidas."):
    1. "Folga em 7 dias (até 28/10)" · R$ 8,2 mil · "contra R$ 11,5 mil há 7 dias" e −R$ 3,3 mil (.k-diferenca, sem cor) · conta escrita "saldo R$ 41.300,00 (digitado para 20/10) − R$ 33.100,00 que vencem até 28/10 (nenhuma vencida)".
    2. "Folga em 30 dias (até 20/11)" · R$ 2,2 mil · "contra −R$ 24,0 mil há 7 dias" (sem diferença) · conta escrita "saldo R$ 41.300,00 − R$ 39.100,00 que vencem até 20/11".
    O "R$ 41.300,00" das contas escritas é link (só o dono). Sem aviso: o saldo é de ontem.
  - Depois de uma linha fina, "Contas a pagar em aberto" (.k-titulo-bloco) e as quatro faixas numa lista (.k-excecoes: a linha inteira é link, o valor à direita, sem cor):
    "Vencidas · 0 parcelas" R$ 0,00
    "Até 7 dias (até 28/10) · 5 parcelas" R$ 33.100,00
    "Até 30 dias, com as de 7 (até 20/11) · 11 parcelas" R$ 39.100,00
    "Total em aberto, todas as datas · 22 parcelas" R$ 84.300,00
  DIREITA, um .k-cartao "Próximos 30 dias: o que vence e o saldo previsto" (.k-titulo-bloco), na altura da esquerda. Parta do gráfico "Saldo previsto" da prancha Gráficos (mesmo script e classes, rótulo direto, sem legenda), até 20/11:
  - linha do saldo previsto em degraus (.k-linha); linha do zero (.k-zero) com o rótulo "zero"; grade em "R$ 20 mil" e "R$ 40 mil"; datas 20/10, 28/10 e 20/11 no pé;
  - barras (.k-barra) do que vence em cada dia, na mesma escala, a partir do zero; onde a linha passa sobre uma barra, o contorno branco (.k-contorno), como a linha da média em "Vendas por dia";
  - rótulos: "saldo R$ 41,3 mil (20/10)", "R$ 8,2 mil em 28/10" (com o .k-ponto) e "R$ 2,2 mil em 20/11";
  - os dias (vence → saldo no fim do dia): 20/10 saldo digitado → R$ 41,3 mil; 22/10 R$ 6.480,00 → R$ 34,8 mil; 23/10 R$ 2.140,00 → R$ 32,7 mil; 26/10 R$ 9.900,00 → R$ 22,8 mil; 27/10 R$ 3.580,00 → R$ 19,2 mil; 28/10 R$ 11.000,00 → R$ 8,2 mil; 30/10 R$ 1.900,00 → R$ 6,3 mil; 02/11 R$ 2.400,00 → R$ 3,9 mil; 10/11 R$ 1.200,00 (2 parcelas) → R$ 2,7 mil; 16/11 R$ 300,00 → R$ 2,4 mil; 18/11 R$ 200,00 → R$ 2,2 mil. Nos outros dias, repete o anterior;
  - a linha não cruza o zero: nenhum ponto com cor.
- Embaixo, três cartões (.k-tres-cartoes; .k-cartao com .k-titulo-bloco e o número em .k-numero-medio):
  1. "Caixa" (o título é link): "Quebra no fechamento de 20/10" · R$ 0,00 · "contra a média de outubro: −R$ 2,66 por fechamento" · conta escrita "Bateu nas 4 formas · gaveta no fechamento R$ 150,00 · gaveta agora (até 14h05) R$ 270,00".
  2. "Fluxo do mês (01 a 21/10)", dois números lado a lado, metade cada (em 1366 e no celular, empilhados): "Entradas" R$ 92.180,00, "contra R$ 101.350,00 de 01 a 21/09"; "Saídas" R$ 99.240,00, "contra R$ 94.870,00 de 01 a 21/09".
  3. "Cartão a creditar amanhã (22/10)": R$ 0,9 mil · conta escrita "crédito R$ 540,00 + débito R$ 370,00 vendidos hoje até 14h05; fica fora da folga e do saldo previsto".
- Nota no pé (.k-rotulo-regular): "Conta paga e ainda não baixada no ERP continua em aberto e reduz a folga."
- No menu, "Fluxo realizado" fica sem destino (tela adiada).

Nota do canvas, ao lado das pranchas: "O bloco 'O que isso significa' chega na Fase 6; no desenho, aparece. Fluxo do mês e Cartão a creditar ficam sem clique até a tela Fluxo realizado existir."

DESENHE 3 PRANCHAS na página "Financeiro":

1. F1-computador — 1920 × 1080: tudo acima. Cabe sem rolar: o conteúdo termina antes de 950 px de altura (a útil do navegador, com a barra de cima), IA recolhida. Se não couber, não corte nada e diga quantos px faltam.

2. F1-computador-sem-saldo — título "F1 · Financeiro: o desvio · computador · sem saldo". Sem o saldo de 20/10; moldura, menu e seletor da 1. Muda:
   - Marca "Sem dado" (.k-estado.k-sem-dado.k-grande) e a frase "O saldo do banco de 20/10 ainda não foi digitado; sem ele não há folga."
   - Logo abaixo, o aviso numa caixa neutra (.k-confirmacao, ícone info; diga no fim que usou): "Saldo do banco não digitado" e, à direita na mesma linha, o botão "Atualizar saldo" (.k-botao.k-principal.k-pequeno, o único principal).
   - As duas folgas sem número e sem comparação: no lugar do valor, "falta o saldo do banco" (.k-sec); contas escritas "R$ 33.100,00 vencem até 28/10 (nenhuma vencida)" e "R$ 39.100,00 vencem até 20/11".
   - Gráfico com o título "Próximos 30 dias: o que vence": só as barras, sobre o eixo (.k-eixo), sem a linha, o zero e os rótulos do saldo.
   - O resto, igual à 1. Confira a altura aqui também.

3. F1-celular — 390 × 844 (.k-raiz.k-celular), moldura da G2-celular: "Hoje · qua, 21/10" e "atualizado às 14h05"; "Financeiro" ativo na barra de baixo. Uma coluna, nesta ordem:
   - Título "Financeiro: o desvio", a linha da fonte (.k-sec) e o bloco da IA recolhido.
   - O cartão da esquerda da 1, com as folgas uma embaixo da outra e a lista das quatro faixas (44 px por linha). Para o toque, o saldo ganha linha própria, link de linha inteira, 44 px: "Saldo do banco: R$ 41.300,00 em 20/10/2026, há 1 dia".
   - O gráfico vira só a linha do saldo previsto, até 20/11, com os três rótulos; no pé, só as datas 20/10 e 20/11; "R$ 8,2 mil em 28/10" e "R$ 2,2 mil em 20/11" vão embaixo do desenho.
   - Os três cartões empilhados (o título "Caixa" com 44 px) e a nota no pé.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Saldo velho: marca "Saldo velho" (.k-estado.k-atencao), frase "O saldo do banco é de 12/09, há 39 dias; a folga pode não valer mais." e o aviso "Saldo de 12/09, há 39 dias" com "Atualizar saldo"; as folgas continuam, com "de 12/09" na conta escrita.
- Folga negativa (fora), com saldo de R$ 29.900,00: "Folga em 7 dias" −R$ 3.200,00, marca Fora (.k-estado.k-fora) e a frase "Faltam R$ 3.200,00 para o que vence até 28/10."; no gráfico, o primeiro dia negativo, 28/10, com .k-ponto-fora e o rótulo com o ícone "Fora · −R$ 3.200,00 em 28/10"; os dias seguintes ficam abaixo do zero.
- Nenhuma conta em aberto: "Nenhuma conta a pagar em aberto"; a folga é o próprio saldo, R$ 41.300,00; o gráfico só com a linha do saldo.
- Mouse num dia do gráfico: "qui, 22/10 · vence R$ 6.480,00 (1 parcela) · saldo previsto R$ 34.820,00".
- Dia passado: faixa e seletor da G2-computador-dia-passado e a resposta gravada do dia (em 15/09, pelo ERP anterior: folga em 7 dias R$ 7,5 mil; em 30 dias, R$ 1,3 mil).
- Bloco da IA: o texto chega na Fase 6, pronto do servidor; fica separado dos números e só repete os da tela.
- Carregando: blocos cinza no lugar dos números (G2-computador). Erro: o padrão (.k-aviso-erro).
- Gerente (Fase 7): a mesma tela, sem "Atualizar saldo"; o saldo não é link.

O QUE CADA CLIQUE FAZ
- Folga em 7 dias e a linha "Até 7 dias" → F2-computador.dc.html, no recorte 7 dias; Folga em 30 dias e "Até 30 dias" → recorte 30 dias; "Vencidas" → recorte Vencidas; "Total em aberto" → recorte Todas. Dia do gráfico → F2-computador.dc.html, na data.
- O saldo e "Atualizar saldo" (só o dono) → K1-computador-painel.dc.html (painel lateral sem véu, da K1).
- Cartão Caixa → F3-computador-sem-fechamento.dc.html (abre no dia da barra; hoje o caixa não fechou).
- Fluxo do mês e Cartão a creditar: sem clique e sem cara de link.
- No celular: o saldo → K1-celular.dc.html; folgas e faixas → F2-celular.dc.html; Caixa → F3-celular.dc.html (a de 20/10; no app, abre em hoje).

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado: atenção âmbar (folga em 30 dias negativa), fora vermelho (folga em 7 dias negativa), sempre com ícone e palavra; nunca verde. No exemplo, tudo no lugar: nada tem cor, nem linhas nem barras.
- Número sempre com unidade e comparação; frase-resumo no alto.
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular.
- No máximo 3 cliques do Início até qualquer número (Início → F1 → F2 ou F3).
- Nenhum menu, dica ou painel aberto cobrindo outra parte da prancha.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
