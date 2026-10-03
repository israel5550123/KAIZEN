# Prompt V2 — Detalhe do vendedor

Tela 5 da lista (`docs/app/TELAS.md`, seção 7, V2).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: V2 · Detalhe do vendedor (tela 5 da lista). As pranchas vão na página "Vendas", abaixo das da V1, com a nota de título "V2 · Detalhe do vendedor".

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "V2-computador.dc.html"; títulos como "V2 · Detalhe do vendedor · computador".

PARA QUE SERVE
Por que um vendedor está fora do ritmo: quanto vendeu contra a meta, para quantos clientes e o que vende.

O QUE A TELA MOSTRA (prancha 1, no computador, de cima para baixo)
- Menu: "O desvio" do grupo Vendas ativo (o detalhe não tem item próprio). Barra de cima com o seletor de dia em hoje (› desligada).
- Link de volta "Vendas: o desvio", com o ícone chevron-left (.k-botao.k-texto.k-pequeno).
- Cabeçalho (.k-cabecalho-tela): à esquerda, o botão ‹ (.k-botao.k-icone, nome "Vendedor anterior: Igor"), "Daniele" (.k-titulo-tela), o botão › ("Próximo vendedor: Igor"), a marca "Abaixo do ritmo" (.k-estado.k-fora.k-grande) e "vendedora no ERP (código 12)" (.k-sec); à direita, "qua, 21/10/2026 · 17 de 26 dias úteis" (.k-sec).
- RESUMO, um .k-cartao na largura toda:
  - Frase (.k-corpo-grande.k-prosa, até 720 px): "Daniele abaixo do ritmo: R$ 40,2 mil de R$ 75 mil (53,6% da meta), ritmo 0,82. Vende menos dobradiças e corrediças que a loja: 16,0% e 13,4% do que vende, contra 19,8% e 17,5% na loja."
  - Cinco números lado a lado (.k-numeros com .k-numero-bloco, como na prancha Número grande); em 1366 px descem para duas linhas:
    1. "Realizado no mês" · R$ 40,2 mil · "contra R$ 75 mil de meta" · "falta R$ 34,8 mil" (.k-diferenca, sem cor) · conta escrita "53,6% da meta · 17 de 26 dias úteis".
    2. "Ritmo", com o "i" (.k-gatilho) · 0,82 · "contra 1,00" · "Fora: abaixo de 0,90" (.k-sinal.k-fora) · "realizado ÷ (meta × 17 de 26 dias úteis)".
    3. "Hoje até 14h05" · R$ 1.658,70 · "em 10 vendas" · "contra a loja: R$ 4.100,00 em 24 vendas".
    4. "Vendas no mês" · 279 vendas · "de 642 na loja".
    5. "Clientes atendidos no mês" · 104 clientes · "contra 128 do Igor".
- MIX DO MÊS, .k-cartao na largura toda: título "Mix de outubro por grupo" (.k-titulo-bloco) e, ao lado, "R$ 40.193,80 em 11 grupos · do maior para o menor" (.k-sec). Uma barra por grupo, com o script e as classes do gráfico "Realizado por vendedor" da prancha Gráficos: o grupo à esquerda; a barra (.k-barra, cinza) é a parte do grupo no que a Daniele vendeu; o traço preto curto (.k-meta-traco) marca a parte do mesmo grupo na loja, na mesma escala; à direita, os números; rótulo direto, sem legenda. Sem a trilha (.k-barra-fraca): o mix não tem meta. Escala até a maior parte (19,8%).
  Dobradiças · R$ 6.431,01 · 16,0% · na loja 19,8%
  Parafusos e fixação · R$ 5.868,29 · 14,6% · na loja 11,0%
  Corrediças · R$ 5.385,97 · 13,4% · na loja 17,5%
  Puxadores · R$ 5.185,00 · 12,9% · na loja 13,2%
  Fitas de borda · R$ 4.863,45 · 12,1% · na loja 9,6%
  Chapas de MDF · R$ 3.456,67 · 8,6% · na loja 8,9%
  Colas e adesivos · R$ 3.215,50 · 8,0% · na loja 6,4%
  Acessórios de cozinha · R$ 2.250,85 · 5,6% · na loja 5,3%
  Iluminação LED · R$ 1.768,53 · 4,4% · na loja 4,1%
  Ferramentas e abrasivos · R$ 1.446,98 · 3,6% · na loja 3,6%
  Sem grupo · R$ 321,55 · 0,8% · na loja 0,6%
  Embaixo do gráfico (.k-rotulo-regular): "Sem grupo: produto sem grupo no cadastro." (na coluna dos nomes, encolheria as barras). Sem cor: a diferença para a loja não tem régua.
- CLIENTES ATENDIDOS (Fase 8), .k-cartao embaixo, na primeira coluna de uma .k-tres-cartoes (na largura toda, nome e valor ficam longe demais): título "Clientes atendidos em outubro · os que mais compraram" e uma lista de exceções (.k-excecoes), nome como link (pode quebrar de linha) e valor à direita, sem cor: Marcenaria São Francisco R$ 2.180,40; Móveis Planejados Calhau R$ 1.940,00; Oficina Monte Castelo R$ 1.615,20; Marcenaria Ponta d'Areia R$ 1.402,90; Arte em Madeira Renascença R$ 1.288,00; e "Ver todos (104)" (.k-ver-todos).
- Sem o bloco "O que isso significa" (só no Início e nos desvios). Sem ticket e itens por venda (ficam no R5).

Nota no canvas: "(proposta) A parte do grupo na loja, ao lado de cada barra; e a V2 no celular. O bloco 'Clientes atendidos' chega na Fase 8; no desenho, aparece. Na prancha do Igor ele fica de fora só porque o exemplo não tem os clientes dele."

DESENHE 3 PRANCHAS na página "Vendas":

1. V2-computador — 1920 × 1080: a Daniele, tudo acima.

2. V2-computador-igor — título "V2 · Detalhe do vendedor · computador · Igor". É o estado "no lugar": a mesma tela, quieta, sem cor; moldura e seletor da 1. É o destino do Igor no Início e na V1. Muda:
   - Cabeçalho: botões "Vendedor anterior: Daniele" e "Próximo vendedor: Daniele"; "Igor"; marca "No lugar" (.k-estado.k-lugar.k-grande, cinza); "vendedor no ERP (código 11)".
   - Frase: "Igor está adiantado: R$ 51,0 mil de R$ 75 mil (68,0% da meta), ritmo 1,04."
   - Números: R$ 51,0 mil, "contra R$ 75 mil de meta", "falta R$ 24,0 mil", "68,0% da meta · 17 de 26 dias úteis"; Ritmo 1,04 "contra 1,00", sem marca; Hoje até 14h05 R$ 2.296,40 "em 13 vendas", "contra a loja: R$ 4.100,00 em 24 vendas"; 341 vendas "de 642 na loja"; 128 clientes "contra 104 da Daniele".
   - Mix "R$ 51.012,40 em 11 grupos" (escala até 23,1%):
     Dobradiças · R$ 11.774,79 · 23,1% · na loja 19,8%
     Corrediças · R$ 10.784,03 · 21,1% · na loja 17,5%
     Puxadores · R$ 6.953,20 · 13,6% · na loja 13,2%
     Chapas de MDF · R$ 4.763,33 · 9,3% · na loja 8,9%
     Fitas de borda · R$ 3.884,95 · 7,6% · na loja 9,6%
     Parafusos e fixação · R$ 3.879,41 · 7,6% · na loja 11,0%
     Acessórios de cozinha · R$ 2.649,15 · 5,2% · na loja 5,3%
     Colas e adesivos · R$ 2.458,00 · 4,8% · na loja 6,4%
     Iluminação LED · R$ 2.021,47 · 4,0% · na loja 4,1%
     Ferramentas e abrasivos · R$ 1.684,62 · 3,3% · na loja 3,6%
     Sem grupo · R$ 159,45 · 0,3% · na loja 0,6%
   - Sem o bloco "Clientes atendidos".

3. V2-celular — 390 × 844 (.k-raiz.k-celular), a Daniele, moldura da G2-celular: barra de cima com "Hoje · qua, 21/10" e "atualizado às 14h05"; "Vendas" ativo na barra de baixo. Empilhados:
   - Link "Vendas" com o chevron-left e o cabeçalho: ‹ "Daniele" › (.k-botao.k-icone, 44 × 44); embaixo, a marca "Abaixo do ritmo" e, abaixo dela, "vendedora no ERP (código 12)".
   - Resumo num .k-cartao: no alto, a frase "Daniele abaixo do ritmo: R$ 40,2 mil de R$ 75 mil (53,6% da meta), ritmo 0,82." (sem a comparação com a loja); depois "R$ 40,2 mil" (.k-numero-celular) com "de R$ 75 mil · 53,6% da meta"; "Falta R$ 34,8 mil"; "Ritmo 0,82 · 17 de 26 dias úteis" (com o "i"); "Hoje até 14h05: R$ 1.658,70 em 10 vendas"; "No mês: 279 vendas · 104 clientes atendidos".
   - "Mix de outubro · os 5 maiores grupos" numa lista de exceções (.k-excecoes), sem a parte na loja e sem link nos grupos (o nome pode quebrar de linha): Dobradiças R$ 6.431,01 · 16,0%; Parafusos e fixação R$ 5.868,29 · 14,6%; Corrediças R$ 5.385,97 · 13,4%; Puxadores R$ 5.185,00 · 12,9%; Fitas de borda R$ 4.863,45 · 12,1%; e "Ver todos (11)" (.k-ver-todos, 44 px).
   - Sem o bloco "Clientes atendidos".

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Dica do ritmo (fechada): a da prancha Dica de definição.
- Sem meta: marca "Sem meta" (.k-estado.k-sem-dado.k-grande) no lugar da marca de ritmo; "Sem meta para outubro" no lugar da comparação do realizado; Ritmo e % em "—", sem falta; botão "Cadastrar meta" (só o dono). No celular, sem o botão.
- Sem venda no mês: no lugar dos números do mês e do mix, o vazio padrão (.k-estado-vazio) com "Nenhuma venda em outubro até agora".
- Dia passado (faixa e seletor da G2-computador-dia-passado), em 15/09/2026, a Daniele: R$ 34,6 mil · 46,1% da meta · ritmo 0,92, com a marca Atenção.
- Carregando: como na G2-computador. Erro: .k-aviso-erro.
- Gerente (Fase 7): igual, sem "Cadastrar meta". O vendedor não vê esta tela.

O QUE CADA CLIQUE FAZ
- ‹ e › → o outro vendedor, no mesmo dia. Com dois vendedores, os dois levam ao mesmo: na Daniele, V2-computador-igor.dc.html; no Igor, V2-computador.dc.html.
- "Vendas: o desvio" e o item "O desvio" do menu → V1-computador.dc.html.
- Mouse num grupo → "Dobradiças · R$ 6.431,01 · 16,0% do que a Daniele vendeu · 19,8% do que a loja vendeu".
- "Cadastrar meta" (só o dono, no estado sem meta) → K2-computador.dc.html.
- Nome de cliente e "Ver todos (104)" (Fase 8) → R2, que vem depois: sem destino.
- No celular: "Vendas" → V1-celular.dc.html; ‹ e › sem destino (o Igor não tem V2 no celular); "Ver todos (11)" abre os 11 grupos no lugar.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Projeção só da loja: o vendedor nunca tem projeção.
- Cor só para estado: atenção âmbar, fora vermelho, sempre com ícone e palavra; nunca verde. A marca do ritmo é a única cor da tela; o mix e a parte na loja ficam cinza.
- Número sempre com unidade e comparação; frase-resumo no alto.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular (setas, link de volta, "Ver todos").
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular; nenhum texto passa da borda do cartão.
- No máximo 3 cliques do Início até qualquer número (Início → Daniele → V2).
- Consumidor Final (código 999007) fora de toda lista de clientes.
- Nenhum menu, dica ou calendário aberto cobrindo outra parte da prancha.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
