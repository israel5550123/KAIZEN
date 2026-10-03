# Prompt V1 — Vendas: o desvio

Tela 4 da lista (`docs/app/TELAS.md`, seção 7, V1).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: V1 · Vendas: o desvio (tela 4 da lista). As pranchas vão na página "Vendas" do canvas, com a nota de título "V1 · Vendas: o desvio", como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "V1-computador.dc.html"; títulos como "V1 · Vendas: o desvio · computador".

PARA QUE SERVE
A distância entre a loja e a meta do mês, a mesma distância para cada vendedor, e se o ritmo atual leva a bater a meta.

O QUE A TELA MOSTRA (prancha 1, no computador, de cima para baixo)
- Menu: "O desvio" do grupo Vendas ativo. Barra de cima com o seletor de dia em hoje (› desligada).
- Cabeçalho (.k-cabecalho-tela): "Vendas: o desvio" (.k-titulo-tela) e, à direita, "qua, 21/10/2026 · 17 de 26 dias úteis" (.k-sec).
- Bloco "O que isso significa" (details.k-bloco-ia), recolhido.
- RESUMO, um .k-cartao na largura toda:
  - Marca Atenção (.k-estado.k-atencao.k-grande) e a frase (.k-corpo-grande): "Vendas um pouco atrás da meta. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil."
  - Linha "Abaixo do ritmo: Daniele · Fora 0,82" (Daniele é link; "Fora 0,82" em .k-sinal.k-fora).
  - Quatro números lado a lado (.k-numeros com .k-numero-bloco, como na prancha Número grande); em 1366 px descem para duas linhas:
    1. "Realizado no mês" · R$ 92,4 mil · "contra R$ 150 mil de meta" · −R$ 57,6 mil (.k-diferenca, sem cor) · conta escrita "61,6% da meta · 17 de 26 dias úteis, faltam 9".
    2. "Ritmo", com o "i" (.k-gatilho) · 0,94 · "contra 1,00" · "Atenção −0,06" (.k-sinal.k-atencao) · "realizado ÷ (meta × 17 de 26 dias úteis)".
    3. "Projeção" · R$ 143,8 mil · "contra R$ 150 mil de meta" · −R$ 6,2 mil (sem cor) · "R$ 88.300,00 até ontem + R$ 55.496,30 de hoje a 31/10".
    4. "Para bater a meta" · R$ 6.400,00 "por dia útil restante" · "contra a média de R$ 5.518,75 nos 16 dias completos" · "faltam R$ 57.600,00 em 9 dias úteis".
- Na grade .k-tres-cartoes, o gráfico em duas das três colunas (regra local grid-column: span 2; diga no fim):
  - GRÁFICO, .k-cartao com o título "Acumulado de outubro contra a meta" (.k-titulo-bloco): o "Acumulado do mês contra a meta" da prancha Gráficos, igual (mesmo script, números e rótulos, como "Projeção R$ 143,8 mil" e "meta até hoje R$ 98,1 mil"). Único ponto com cor: hoje (.k-ponto-atencao), com o ícone e "Atenção · ritmo 0,94". Sem legenda.
  - COMO SE FORMA, .k-cartao com o título "Como se forma o realizado" e duas tabelas pequenas (.k-tabela) de duas colunas, uma embaixo da outra (uma de três colunas não cabe em 1366 px):
    "Mês (01 a 21/10)": Vendido R$ 93.540,00 · − Devoluções R$ 1.140,00 · = Realizado R$ 92.400,00 (.k-totais)
    "Hoje (até 14h05)": Vendido R$ 4.100,00 · − Devoluções R$ 0,00 · = Realizado R$ 4.100,00 (.k-totais)
- TABELA DOS VENDEDORES (.k-tabela-bloco, largura toda): título "Vendedores · pior ritmo primeiro"; à direita, "2 vendedores" e "Colunas" (.k-botao.k-secundario.k-pequeno, menu fechado). Colunas: Vendedor | Estado | Ritmo (ordenada, crescente, seta azul) | Realizado do mês | Meta | % da meta | Falta | Hoje até 14h05 | Vendas no mês | Clientes atendidos.
  - Daniele | Fora (.k-estado.k-fora) | 0,82 | R$ 40.193,80 | R$ 75.000,00 | 53,6% | R$ 34.806,20 | R$ 1.658,70 | 279 | 104
  - Igor | No lugar (.k-estado.k-lugar, cinza) | 1,04 | R$ 51.012,40 | R$ 75.000,00 | 68,0% | R$ 23.987,60 | R$ 2.296,40 | 341 | 128
  - Outros (sem meta própria) | — | — | R$ 1.193,80 | sem meta | — | — | R$ 144,90 | 22 | —
  - Loja (linha .k-totais) | Atenção (.k-estado.k-atencao) | 0,94 | R$ 92.400,00 | R$ 150.000,00 | 61,6% | R$ 57.600,00 | R$ 4.100,00 | 642 | —
  - Linhas da Daniele e do Igor clicáveis (.k-clicavel, nome em .k-nome). Embaixo (.k-rotulo-regular): "Outros (sem meta própria): venda de quem não é vendedor no ERP (hoje, a gerente); conta só na meta da loja."
  - Em 1366 px só cabem sete colunas: "Hoje até 14h05", "Vendas no mês" e "Clientes atendidos" saem pelo menu Colunas.
- Sem o atalho "Padrões de venda" (tela adiada; no menu, o item fica sem destino).

Nota no canvas: "(proposta) 'Para bater a meta: R$ 6.400,00 por dia útil restante'. O bloco 'O que isso significa' chega na Fase 6; no desenho, aparece."

DESENHE 3 PRANCHAS na página "Vendas":

1. V1-computador — 1920 × 1080: tudo acima.

2. V1-computador-sem-meta — título "V1 · Vendas: o desvio · computador · sem meta". Outubro sem meta da loja nem dos vendedores; moldura e seletor da 1. Muda:
   - Marca "Sem meta" (.k-estado.k-sem-dado.k-grande) e a frase "Sem a meta do mês não há ritmo.", sem "Abaixo do ritmo".
   - Números: "Realizado no mês" R$ 92,4 mil, com "Sem meta para outubro" no lugar da comparação e a conta "17 de 26 dias úteis, faltam 9"; "Projeção" R$ 143,8 mil, só com a conta (a projeção não usa a meta). Sem Ritmo nem Para bater a meta. À direita, o botão "Cadastrar meta" (.k-botao.k-principal).
   - Gráfico: só realizado e projeção, com os rótulos deles; sem a meta e sem ponto com cor.
   - Tabela "Vendedores · pelo realizado do mês", do maior para o menor (seta em "Realizado do mês"): Igor, Daniele, Outros e Loja, com realizado, hoje, vendas e clientes da 1; Estado, Ritmo, % e Falta em "—"; Meta "sem meta". Nenhuma cor na tela. O resto, igual à 1.

3. V1-celular — 390 × 844 (.k-raiz.k-celular), moldura da G2-celular: barra de cima com "Hoje · qua, 21/10" e "atualizado às 14h05"; "Vendas" ativo na barra de baixo. Empilhados:
   - Título "Vendas: o desvio" e o bloco da IA recolhido.
   - Resumo num .k-cartao.k-cartao-pergunta sem link, seta nem rodapé: título "Loja em outubro"; marca Atenção; "R$ 92,4 mil" com "de R$ 150 mil · 61,6% da meta"; .k-contexto "Ritmo 0,94 · 17 de 26 dias úteis, faltam 9" (com o "i") e "Falta R$ 57,6 mil: R$ 6.400,00 por dia útil restante"; a frase e a linha "Abaixo do ritmo" do computador. No lugar do gráfico, a barra de meta (.k-meta-bloco) com "Meta R$ 150 mil", "R$ 92,4 mil realizado" e "projeção R$ 143,8 mil" (desce de linha em 360 px); logo abaixo da barra (.k-conta-escrita), "A projeção fica R$ 6,2 mil abaixo da meta." (ao lado não cabe).
   - Rótulo "Por vendedor · meta de R$ 75 mil cada" e um .k-cartao por vendedor (Daniele, Igor, Outros, sem ordenar), cada um com a linha da prancha Indicador com barra de meta (.k-indicador): Daniele, marca Fora, "0,82 · R$ 40,2 mil · 53,6%"; Igor, "1,04 · R$ 51,0 mil · 68,0%"; os dois com "meta R$ 75 mil"; "Outros (sem meta própria)", sem barra, "R$ 1,2 mil".
   - Sem "Como se forma" e sem hoje, vendas e clientes por vendedor.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Bloco da IA aberto e indisponível: os textos da prancha Bloco IA.
- Dicas (fechadas). Ritmo: o texto da prancha Dica de definição. Projeção: "O realizado até ontem mais, para cada dia útil de hoje até o fim do mês, a média das últimas 8 semanas do mesmo dia da semana." Realizado: "O vendido menos as devoluções: é o número que se compara à meta."
- Itens sem vendedor (só quando houver), numa linha acima da tabela: "Itens sem vendedor: 3 itens, R$ 112,50 no mês; nenhum hoje · ficam fora do vendido, como no relatório 154 do ERP".
- Vendedor sem meta (a loja tem): "sem meta" na Meta, "—" em Estado, Ritmo, % e Falta, e o link "Cadastrar" (só o dono). Vendedor novo no ERP: "novo no ERP, sem meta" ao lado do nome. Quem deixa de ser vendedor passa para Outros.
- Ninguém como vendedor no ERP: só Outros e Loja, com "Nenhum funcionário está como vendedor no ERP; toda a venda conta em Outros."
- Mês sem venda (dia 1, cedo): "Realizado R$ 0,00 · 0 vendas"; o gráfico só com a meta.
- Dia passado (faixa e seletor da G2-computador-dia-passado), em 15/09/2026: No lugar, R$ 76,8 mil de R$ 150 mil, 51,2%, ritmo 1,02, 12 de 24 dias úteis, projeção R$ 153,6 mil; Igor R$ 41,0 mil · 54,7% · 1,09; Daniele R$ 34,6 mil · 46,1% · 0,92, Atenção; Outros R$ 1,2 mil.
- Carregando: como na G2-computador. Erro: .k-aviso-erro.
- Gerente (Fase 7): igual, sem "Cadastrar meta". O vendedor não vê esta tela.

O QUE CADA CLIQUE FAZ
- Linha da Daniele e "Daniele" no resumo → V2-computador.dc.html. Linha do Igor → V2-computador-igor.dc.html. Outros e Loja não abrem.
- Cabeçalho da tabela → ordena. Mouse num número → a definição (.k-dica).
- Mouse num ponto do gráfico → acumulado e meta do dia ("qua, 14/10 · acumulado R$ 61.155,60 · meta até o dia R$ 63.461,54"). Clique num dia do gráfico → o app vai para aquele dia.
- "Cadastrar meta" e "Cadastrar" (só o dono) → K2-computador.dc.html.
- No celular: o cartão e o nome da Daniele → V2-celular.dc.html; o do Igor, sem destino. "Cadastrar meta" não aparece (K2 é só do computador).

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cor só para estado: atenção âmbar, fora vermelho, sempre com ícone e palavra; nunca verde. O que está no lugar fica neutro; linhas e barras não mudam de cor.
- Número sempre com unidade e comparação; frase-resumo no alto.
- Projeção só da loja, nunca por vendedor.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular.
- Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular; nenhum texto passa da borda do cartão.
- No máximo 3 cliques do Início até qualquer número (Início → V1 → V2).
- A tela não calcula; o bloco da IA fica separado dos números e também não calcula.
- Nenhum menu, dica ou calendário aberto cobrindo outra parte da prancha.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
