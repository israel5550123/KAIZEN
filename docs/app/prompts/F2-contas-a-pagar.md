# Prompt F2 — Contas a pagar e previsão

Tela 10 da lista (`docs/app/TELAS.md`, seção 7, F2).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: F2 · Contas a pagar e previsão (tela 10 da lista). As pranchas vão na página "Financeiro" do canvas, abaixo das da F1, com uma nota de título "F2 · Contas a pagar e previsão".

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "F2-computador.dc.html"; títulos como "F2 · Contas a pagar e previsão · computador".

PARA QUE SERVE
O detalhe da folga: o que vence, em que dia e para quem, e como fica o saldo dia a dia nos próximos 30 dias. Junta as contas por vencimento e o fluxo previsto, que são a mesma lista.

O QUE A TELA MOSTRA (prancha 1, no computador, de cima para baixo)
- Menu: "Contas a pagar" do grupo Financeiro ativo. Barra de cima com o seletor "‹ Hoje · qua, 21/10/2026 ›" (› desligada).
- Link de volta "‹ Financeiro: o desvio" (.k-botao.k-texto.k-pequeno, ícone chevron-left).
- Cabeçalho (.k-cabecalho-tela): "Contas a pagar e previsão" (.k-titulo-tela) e, à direita, "qua, 21/10/2026" (.k-sec).
- RESUMO, um .k-cartao na largura toda, com duas linhas de números (.k-numeros com .k-numero-bloco; valor em .k-numero-medio; cada linha em colunas iguais, 3 e 4, e o texto quebra dentro do bloco):
  Linha "Saldo e folga" (.k-rotulo):
  1. "Saldo do banco" · R$ 41.300,00 (link, só o dono) · "digitado para 20/10/2026, há 1 dia".
  2. "Folga em 7 dias (até 28/10)" · R$ 8.200,00 · conta escrita "saldo − R$ 33.100,00 que vencem até 28/10".
  3. "Folga em 30 dias (até 20/11)" · R$ 2.200,00 · conta escrita "saldo − R$ 39.100,00 que vencem até 20/11".
  Linha "Em aberto":
  4. "Vencidas" · R$ 0,00 · "0 parcelas".
  5. "Até 7 dias (até 28/10)" · R$ 33.100,00 · "5 parcelas".
  6. "Até 30 dias (até 20/11)" · R$ 39.100,00 · "11 parcelas, com as de 7 dias".
  7. "Total em aberto" · R$ 84.300,00 · "22 parcelas" · "contra R$ 88.120,00 (17 parcelas) em 14/10" · −R$ 3.820,00 (.k-diferenca, sem cor).
- Recorte (.k-visoes, com a contagem de parcelas): "Vencidas 0", "7 dias 5", "30 dias 11" (escolhido) e "Todas 22". Filtra o gráfico e a tabela.
- GRÁFICO, .k-cartao "Próximos 30 dias: o que vence e o saldo previsto" (.k-titulo-bloco), na largura toda: o mesmo da F1-computador (barras .k-barra do que vence, linha do saldo em degraus com o contorno branco, linha do zero, os mesmos dias e os rótulos "saldo R$ 41,3 mil (20/10)", "R$ 8,2 mil em 28/10" e "R$ 2,2 mil em 20/11"). E mais: em 22/10, ao lado da barra do que vence, a barra do cartão a creditar amanhã, R$ 910,00, com o rótulo direto "cartão a creditar R$ 910,00 · fora do saldo previsto", numa linha, logo abaixo da linha do zero. Desenhe-a em .k-barra-fraca com contorno de 1,5 px no token --cor-grafico-neutro (o Design System não tem barra de entrada; diga no fim).
- TABELA POR VENCIMENTO (.k-tabela-bloco, largura toda): título "Contas por vencimento · até 20/11"; à direita, "11 parcelas" e "Colunas". Colunas: Vencimento e fornecedor (seta de ordem, crescente) | Descrição | Boleto ou nota | Parcela | Valor | Saldo previsto (com o "i"; dica: "No fim do dia: o saldo do banco menos as contas que vencem até ele."). Em 1366 px, se não couber, "Descrição" e depois "Boleto ou nota" saem pelo menu Colunas. Cada data é uma linha de grupo (.k-grupo, com a seta chevron-down de abrir e o valor do dia); aberta, as parcelas vêm embaixo, recuadas (.k-recuo), como na variante com grupos da prancha Tabela. Na ordem:
  Vencidas · nenhuma | R$ 0,00 (sem seta)
  qui, 22/10 · 1 parcela | R$ 6.480,00 | R$ 34.820,00
  sex, 23/10 · 1 parcela | R$ 2.140,00 | R$ 32.680,00
  seg, 26/10 · 1 parcela | R$ 9.900,00 | R$ 22.780,00 — ABERTA: Madeiras do Vale | Compra de chapas de MDF | NF 1184 | 2 de 4 | R$ 9.900,00
  ter, 27/10 · 1 parcela | R$ 3.580,00 | R$ 19.200,00
  qua, 28/10 · 1 parcela | R$ 11.000,00 | R$ 8.200,00
  sex, 30/10 · 1 parcela | R$ 1.900,00 | R$ 6.300,00
  seg, 02/11 · 1 parcela | R$ 2.400,00 | R$ 3.900,00
  ter, 10/11 · 2 parcelas | R$ 1.200,00 | R$ 2.700,00 — ABERTA: Contador | Honorários de outubro | boleto 1110 | — | R$ 950,00; Internet da loja | Fibra de novembro | boleto 8812 | — | R$ 250,00
  seg, 16/11 · 1 parcela | R$ 300,00 | R$ 2.400,00
  qua, 18/11 · 1 parcela | R$ 200,00 | R$ 2.200,00
  Totais (.k-totais): "Total até 20/11 · 11 parcelas" | R$ 39.100,00 | "R$ 2.200,00 em 20/11".
  As parcelas das datas fechadas (para quando abrirem): 22/10 Ferragens Norte · Compra de ferragens · NF 48213 · 1 de 1; 23/10 Energia (Equatorial) · Conta de luz de setembro · boleto 0923-118 · —; 27/10 Parafusos & Cia · Compra de parafusos · NF 7024 · 3 de 3; 28/10 Aluguel da loja · Aluguel de outubro · boleto 1028 · —; 30/10 Bordas & Colas Nordeste · Compra de fitas e colas · NF 10044 · 1 de 2; 02/11 Casa do Marceneiro Atacado · Compra de puxadores · NF 5577 · 2 de 3; 16/11 Mensalidade do ERP · Novembro · boleto 4471 · —; 18/11 Água da loja · Conta de outubro · boleto 2210 · —.
- Nota no pé (.k-rotulo-regular): "Conta paga e ainda não baixada no ERP continua aqui: a baixa costuma vir depois do pagamento."
- Sem o bloco "O que isso significa" (fica só no Início e nas telas de desvio).

Nota do canvas, ao lado das pranchas: "(proposta) A F2 no celular: cartões por data, o toque abre as parcelas, sem ordenar."

DESENHE 2 PRANCHAS na página "Financeiro":

1. F2-computador — 1920 × 1080: tudo acima. A página pode rolar para baixo; para o lado, nunca.

2. F2-celular — 390 × 844 (.k-raiz.k-celular), moldura da G2-celular: "Hoje · qua, 21/10" e "atualizado às 14h05"; "Financeiro" ativo na barra de baixo. Uma coluna:
   - Link de volta "‹ Financeiro: o desvio" (.k-botao.k-texto, 44 px) e o título "Contas a pagar e previsão".
   - Um .k-cartao de resumo: "Saldo do banco: R$ 41.300,00 em 20/10/2026, há 1 dia" (link de linha inteira, 44 px); "Folga em 7 dias (até 28/10)" R$ 8.200,00; "Folga em 30 dias (até 20/11)" R$ 2.200,00; "Vencidas: nenhuma".
   - Rótulo "Próximos 30 dias · 11 parcelas · R$ 39.100,00" e um .k-cartao compacto por data, na ordem da tabela, sem ordenar: à esquerda, a data e, embaixo dela, "1 parcela"; à direita, o valor do dia; por último, em .k-sec, "saldo previsto R$ 34.820,00". O cartão inteiro é um botão (44 px ou mais, aria-expanded, seta chevron-down); o toque abre as parcelas embaixo, depois de uma linha fina. Aberto: seg, 26/10, com "Madeiras do Vale · Compra de chapas de MDF · NF 1184 · parcela 2 de 4 · R$ 9.900,00". O Design System só tem o cartão de pergunta que abre: use o mais próximo e diga no fim.
   - Sem gráfico e sem recorte.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Recorte 7 dias: só as datas até 28/10; totais "Total até 28/10 · 5 parcelas" R$ 33.100,00 e "R$ 8.200,00 em 28/10"; o gráfico vai até 28/10.
- Recorte Todas: depois de 18/11 entram as 11 parcelas de 26/11/2026 a 29/01/2027, com "—" no saldo previsto; totais "Total em aberto · 22 parcelas" R$ 84.300,00. O gráfico fica nos 30 dias (o saldo previsto vai só até 20/11).
- Recorte Vencidas: "Nenhuma conta vencida."
- Sem saldo: no resumo, "falta o saldo do banco" no saldo e nas duas folgas, com o botão "Digitar saldo" (.k-botao.k-principal); somem a linha do saldo no gráfico e a coluna "Saldo previsto".
- Vencidas maiores que zero (exemplo à parte, o da prancha Tabela): no alto do conteúdo, em destaque, a marca Fora e "Vencidas: 1 parcela, R$ 4.950,00"; na tabela, o grupo "Vencidas · 1 parcela" com Madeiras do Vale · seg, 19/10 · 1 de 4 · R$ 4.950,00 e a marca "Vencida há 2 dias" (.k-estado.k-fora).
- Saldo previsto negativo (com o saldo de R$ 29.900,00, como na folga negativa da F1): o primeiro dia negativo é 28/10, −R$ 3.200,00, marcado Fora (.k-sinal.k-fora na célula, .k-ponto-fora no gráfico), e os dias seguintes também.
- Nenhuma conta: "Nenhuma conta a pagar em aberto" (.k-tabela-vazia); o gráfico só com a linha do saldo.
- Mouse num dia do gráfico: "seg, 26/10 · vence R$ 9.900,00 (1 parcela) · saldo previsto R$ 22.780,00".
- Dia passado: faixa e seletor da G2-computador-dia-passado e a lista gravada do dia.
- Carregando: blocos cinza (G2-computador). Erro: o padrão (.k-aviso-erro).
- Gerente (Fase 7): a mesma tela, sem "Digitar saldo"; o saldo não é link.

O QUE CADA CLIQUE FAZ
- Data → abre ou fecha as parcelas dela.
- Dia do gráfico → rola até a data na tabela e a abre.
- Recorte → filtra a tabela e o gráfico.
- Cabeçalho "Vencimento e fornecedor" ou "Valor" → ordena as parcelas dentro de cada data.
- Saldo e "Digitar saldo" (só o dono) → K1-computador-painel.dc.html (o mesmo painel, sem véu, por cima desta tela).
- "‹ Financeiro: o desvio" → F1-computador.dc.html. No celular: voltar → F1-celular.dc.html; o saldo → K1-celular.dc.html.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado: atenção âmbar, fora vermelho, sempre com ícone e palavra; nunca verde. No exemplo nada está vencido e o saldo não fica negativo: a tela fica sem cor, e barras e linhas também.
- Número sempre com unidade e comparação: o total contra 14/10; o saldo com a data.
- Números à direita na tabela, com algarismos tabulares.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular.
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular.
- No máximo 3 cliques do Início até qualquer número (Início → F1 → F2).
- Nenhum menu, dica ou painel aberto cobrindo outra parte da prancha.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
