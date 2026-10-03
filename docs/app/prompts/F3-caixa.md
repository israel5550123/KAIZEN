# Prompt F3 — Caixa da loja

Tela 12 da lista (`docs/app/TELAS.md`, seção 7, F3).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: F3 · Caixa da loja (tela 12 da lista). As pranchas vão na página "Financeiro" do canvas, abaixo das da F2, com uma nota de título "F3 · Caixa da loja".

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado: só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular-dia-passado: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "F3-computador.dc.html"; títulos como "F3 · Caixa da loja · computador".

PARA QUE SERVE
Conferir se o caixa fechou certo: quebra por turno e por forma de pagamento, a gaveta, as sangrias e os suprimentos.

DICA DA QUEBRA (o "i"): "Informado − calculado no fechamento, somando dinheiro, Pix, crédito e débito; a troca fica fora. Negativo é o que faltou; positivo, o que sobrou. Acima de R$ 5,00, para mais ou para menos, é Fora (régua provisória)."

NO EXEMPLO: às 14h05 o caixa de hoje não fechou; o último fechamento é de terça, 20/10.

A VISÃO DO DIA (prancha 1, em terça, 20/10)
- Menu: "Caixa" do grupo Financeiro ativo. Seletor e faixa como na G2-computador-dia-passado: "‹ ter, 20/10/2026 ›" destacado (.k-outro-dia), as duas setas ligadas; logo abaixo, a faixa neutra "Você está vendo terça, 20/10/2026 · calculado em 20/10 às 22h04" e "Voltar para hoje".
- Link de volta "‹ Financeiro: o desvio" (.k-botao.k-texto.k-pequeno, ícone chevron-left).
- Cabeçalho (.k-cabecalho-tela): "Caixa da loja" (.k-titulo-tela) e, à direita, o seletor "Dia | Mês" (.k-visoes, sem contagem), com "Dia" escolhido. O dia é o da barra de cima.
- Duas colunas iguais (grade local, com os 24 px da .k-tres-cartoes; diga no fim).
  ESQUERDA:
  - .k-cartao com um .k-numero-bloco: rótulo "Quebra do dia" com o "i" (.k-gatilho), valor R$ 0,00, a marca "No lugar" (.k-estado.k-lugar), "contra a média de outubro: −R$ 2,66 por fechamento" e a frase (.k-corpo-grande) "Bateu nas 4 formas."
  - Um .k-cartao por fechamento (neste dia, um só): título "Fechamento nº 215" (.k-titulo-bloco) e, em .k-sec, "Caixa 1 · operador: gerente · abertura 07h02 → fechamento 18h14 · quebra do turno R$ 0,00". Embaixo, a tabela por forma (.k-tabela, sem ordenar):
   Forma | Calculado | Informado | Quebra
   Dinheiro | R$ 150,00 | R$ 150,00 | R$ 0,00
   Pix | R$ 4.190,00 | R$ 4.190,00 | R$ 0,00
   Crédito | R$ 760,00 | R$ 760,00 | R$ 0,00
   Débito | R$ 560,00 | R$ 560,00 | R$ 0,00
   Total (.k-totais) | R$ 5.660,00 | R$ 5.660,00 | R$ 0,00
   E, em .k-rotulo-regular: "No dinheiro, o calculado é a gaveta esperada (o operador a conta); nas outras formas, o que foi vendido nelas."
  DIREITA:
  - .k-cartao "Gaveta" (.k-titulo-bloco), a conta numa tabela de duas colunas (.k-tabela):
   Vendas em dinheiro | R$ 470,00
   + Suprimentos | R$ 150,00
   − Sangrias | R$ 390,00
   − Devoluções em dinheiro | R$ 80,00
   = Gaveta no fechamento (.k-totais) | R$ 150,00
  - .k-tabela-bloco "Sangrias e suprimentos", sem contagem. Hora | Tipo | Valor | Operador | Observação:
   07h02 | Suprimento | R$ 150,00 | gerente | troco da abertura
   12h20 | Sangria | R$ 200,00 | gerente | para o cofre
   17h55 | Sangria | R$ 190,00 | gerente | para o cofre, fim do dia
   Com "Colunas": em 1366 px a tabela não cabe, e "Operador" sai por ele.
- Nota no pé (.k-rotulo-regular): "O fechamento é às cegas: o informado é a contagem do operador; a linha de troca fica fora."
- Sem o bloco da IA.

Nota do canvas, ao lado das pranchas: "(proposta) A F3 no celular, só o dia: um cartão por fechamento e a gaveta. A tolerância de R$ 5,00 é provisória."

DESENHE 4 PRANCHAS na página "Financeiro":

1. F3-computador — 1920 × 1080: a visão do dia acima, em 20/10.

2. F3-computador-sem-fechamento — título "F3 · Caixa da loja · computador · hoje, ainda sem fechamento". Hoje, 14h05: seletor "‹ Hoje · qua, 21/10/2026 ›" (› desligada), sem faixa; "Dia" escolhido. Muda:
   - Esquerda: no lugar da quebra e dos fechamentos, o vazio (.k-estado-vazio, ícone inbox): "O caixa deste dia ainda não fechou; último fechamento: 20/10." e o atalho "Ver o fechamento de terça, 20/10" (.k-botao.k-secundario).
   - Direita: "Gaveta agora (até 14h05)": Vendas em dinheiro R$ 320,00; + Suprimentos R$ 150,00; − Sangrias R$ 200,00; − Devoluções em dinheiro R$ 0,00; = Gaveta agora R$ 270,00. "Sangrias e suprimentos": 07h03 | Suprimento | R$ 150,00 | gerente | troco da abertura; 12h15 | Sangria | R$ 200,00 | gerente | para o cofre.

3. F3-computador-mes — título "F3 · Caixa da loja · computador · mês". Seletor de hoje, sem faixa, como na 2; "Mês" escolhido e, ao lado, "outubro até 20/10 · 16 fechamentos" (.k-sec). A página pode rolar para baixo:
   - .k-cartao "Quebra acumulada por forma": .k-numeros com cinco .k-numero-bloco (valor em .k-numero-medio): Dinheiro −R$ 4,50; Pix R$ 0,00; Crédito R$ 0,00; Débito −R$ 38,00; Total −R$ 42,50, com "média de −R$ 2,66 por fechamento". Sem cor (não há régua). Em 1366 não cabem numa linha (pedem 1.183 px; há 1.028): o .k-numeros quebra e o Total vai para a 2ª linha.
   - .k-cartao "Quebra por fechamento em outubro": uma barra (.k-barra) por fechamento, a partir do zero (.k-zero, rótulo "zero"), para cima quando sobrou, para baixo quando faltou (nos 12 com quebra zero, nada sobre a linha do zero). A régua em duas linhas finas (.k-linha-meta), em +R$ 5,00 e −R$ 5,00, com o rótulo "tolerância de R$ 5,00". Valores: 02/10 −R$ 5,00; 07/10 +R$ 2,00; 09/10 −R$ 38,00; 15/10 −R$ 1,50. Único ponto com cor: 09/10, com .k-ponto-fora na ponta da barra e o rótulo com o ícone "Fora · −R$ 38,00 em 09/10" (.k-texto-fora). Datas 01/10, 09/10 e 20/10 no pé.
   - .k-tabela-bloco "Fechamentos de outubro", com "16 fechamentos" e "Colunas" à direita: Dia (seta de ordem, crescente) | Fechamento | Caixa | Operador | Abertura → fechamento | Quebra | Estado. Linhas .k-clicavel; Caixa 1 e gerente em todas; Estado "—", menos em 09/10:
   qui, 01/10 · nº 200 · 07h01 → 18h10 · R$ 0,00
   sex, 02/10 · nº 201 · 07h02 → 18h11 · −R$ 5,00
   sáb, 03/10 · nº 202 · 07h03 → 12h12 · R$ 0,00
   seg, 05/10 · nº 203 · 07h04 → 18h13 · R$ 0,00
   ter, 06/10 · nº 204 · 07h05 → 18h14 · R$ 0,00
   qua, 07/10 · nº 205 · 07h01 → 18h15 · +R$ 2,00
   qui, 08/10 · nº 206 · 07h02 → 18h10 · R$ 0,00
   sex, 09/10 · nº 207 · 07h03 → 18h11 · −R$ 38,00 · Fora (.k-estado.k-fora)
   sáb, 10/10 · nº 208 · 07h04 → 12h12 · R$ 0,00
   ter, 13/10 · nº 209 · 07h05 → 18h13 · R$ 0,00
   qua, 14/10 · nº 210 · 07h01 → 18h14 · R$ 0,00
   qui, 15/10 · nº 211 · 07h02 → 18h15 · −R$ 1,50
   sex, 16/10 · nº 212 · 07h03 → 18h10 · R$ 0,00
   sáb, 17/10 · nº 213 · 07h04 → 12h11 · R$ 0,00
   seg, 19/10 · nº 214 · 07h05 → 18h12 · R$ 0,00
   ter, 20/10 · nº 215 · 07h02 → 18h14 · R$ 0,00
   Totais (.k-totais): "Outubro até 20/10 · 16 fechamentos" · −R$ 42,50.

4. F3-celular — 390 × 844 (.k-raiz.k-celular): "ter, 20/10" no botão do dia (.k-dia-celular.k-outro-dia, sem a hora) e a faixa da prancha 1, com "Voltar para hoje" de 44 px; "Financeiro" ativo embaixo. Só o dia, sem o seletor "Dia | Mês". Uma coluna: link de volta (44 px), título "Caixa da loja", o cartão "Quebra do dia", o fechamento nº 215 com a tabela reduzida (Forma e Quebra; Calculado e Informado saem pelo botão "Colunas", à direita do título: com 3 colunas e a seta de ordenar, faltariam 6 px em 360 px), o cartão "Gaveta" com a conta (o nome da linha pode quebrar, com regra local; diga no fim; sem isso, em 360 px a tabela passa 28 px do cartão), e as sangrias e suprimentos em lista (hora, tipo e valor; embaixo, em .k-sec, operador e observação). A nota no pé.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Quebra fora da tolerância, sex, 09/10 (nº 207): "Quebra do dia" −R$ 38,00, marca Fora (.k-estado.k-fora) e a frase "Faltaram R$ 38,00 no débito."; marca Fora no título do fechamento; linha Débito marcada (.k-sinal.k-fora): R$ 690,00 | R$ 652,00 | −R$ 38,00; as outras batem (Dinheiro R$ 150,00, Pix R$ 4.500,00, Crédito R$ 790,00); Total R$ 6.130,00 | R$ 6.092,00 | −R$ 38,00. Gaveta: R$ 450,00 + R$ 150,00 − R$ 420,00 − R$ 30,00 = R$ 150,00.
- Mouse numa barra do mês: "sex, 09/10 · fechamento nº 207 · quebra −R$ 38,00"; numa forma do acumulado, calculado e informado do mês, do servidor.
- No celular, hoje: o estado vazio, o atalho e a gaveta de agora, como na prancha 2.
- Carregando: blocos cinza (G2-computador). Erro: .k-aviso-erro.

O QUE CADA CLIQUE FAZ
- "Mês" (na 1 e na 2) → F3-computador-mes.dc.html; "Dia" (na 3) → F3-computador-sem-fechamento.dc.html.
- No mês, uma linha da tabela ou uma barra → o dia daquele fechamento (20/10 → F3-computador.dc.html; os outros, sem prancha).
- "Ver o fechamento de terça, 20/10" → F3-computador.dc.html. "Voltar para hoje" → F3-computador-sem-fechamento.dc.html (no celular, sem prancha).
- "‹ Financeiro: o desvio" → F1-computador.dc.html; no celular, → F1-celular.dc.html.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado: só a quebra acima da tolerância fica vermelha, com ícone e "Fora"; nunca verde; o resto, e as barras, neutros.
- Número sempre com unidade e comparação: a quebra do dia contra a média do mês; a gaveta como conta.
- Números à direita nas tabelas; sinal de menos verdadeiro (−) e "+" no que sobrou.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular.
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular.
- No máximo 3 cliques do Início até qualquer número (Início → F1 → F3 → atalho para 20/10).
- Nenhum menu, dica ou painel aberto cobrindo outra parte da prancha.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
