# Prompt I1 — Início (as três perguntas)

Tela 3 da lista (`docs/app/TELAS.md`, seção 7, I1).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: I1 · Início (as três perguntas), tela 3 da lista. As pranchas vão na página "Início" do canvas, com a nota de título "I1 · Início" no alto, como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado (versão 1790997087-c8ea): só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta, 21/10/2026, atualizado às 14h05; Israel, Dono. Cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador, com o menu da conta e o calendário FECHADOS. No celular, copie da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "I1-computador.dc.html"; títulos como "I1 · Início · computador".

PARA QUE SERVE
Responder as três perguntas do dia em menos de um minuto. Tudo no lugar: as colunas ficam quietas; algo fora: uma frase, com nomes.

O QUE A TELA MOSTRA (pranchas 1 e 2, no computador)
- Menu: "Início" ativo. Barra de cima com o seletor de dia em hoje (› desligada).
- Cabeçalho (.k-cabecalho-tela): "Início" (.k-titulo-tela) e, à direita, "qua, 21/10/2026 · 17 de 26 dias úteis" (.k-sec), como na Página de amostra do Design System.
- Logo abaixo, o bloco "O que isso significa" (details.k-bloco-ia), recolhido.
- Embaixo, três colunas iguais (.k-tres-cartoes), uma por pergunta, com o cartão (.k-cartao.k-cartao-pergunta) da prancha Cartão de pergunta:

VENDAS — título "Vendas: como estou em relação à meta?"
- Marca Atenção (.k-estado.k-atencao). Número "R$ 92,4 mil" e "de R$ 150 mil · 61,6% da meta".
- .k-contexto: "Ritmo 0,94 · 17 de 26 dias úteis"; "Hoje até 14h05: R$ 4,1 mil em 24 vendas"; e uma 3ª linha, só no computador: "contra R$ 3,8 mil num dia como hoje até 14h05 · +R$ 0,3 mil" (sem cor).
- Frase: "Vendas um pouco atrás da meta. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil."
- Exceção: "Abaixo do ritmo: Daniele · Fora 0,82" (Daniele é link; "Fora 0,82" em .k-sinal.k-fora).
- Aberto (.k-mais): a barra de meta (.k-meta-bloco) com os rótulos do Design System ("Meta R$ 150 mil", "R$ 92,4 mil realizado", "projeção R$ 143,8 mil") e, logo abaixo da barra (.k-conta-escrita): "A projeção fica R$ 6,2 mil abaixo da meta." (ao lado da projeção não cabe em 1366 px). Lista "Por vendedor · meta de R$ 75 mil cada" (.k-excecoes-mini): Igor "R$ 51,0 mil · 68,0% · ritmo 1,04"; Daniele "R$ 40,2 mil · 53,6% · ritmo 0,82" e a marca "Fora"; "Outros (sem meta própria)" "R$ 1,2 mil" (.k-linha-neutra).

COMPRAS — título "Compras: estou comprando o que gira ou o que encalha?"
- Marca Fora. Número "3 produtos" e "da curva A em falta"; .k-contexto "A régua é 0".
- Frase: "Três dos produtos que mais giram estão sem estoque."
- Exceção: "Em falta: Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm" (cada nome é link).
- Aberto: "Curva A em falta · a régua é 0", com os três, cada um com "Fora 0 un."; a barra das curvas sem legenda, só em cinza (.k-dividida-bloco), com o rótulo "Comprou 150 produtos em 90 dias: 66 curva A, 40 B, 31 C e 13 sem venda" e partes de 44,0%, 26,7%, 20,7% e 8,7%; "Encalhe": "Parado há 90 dias: 38 produtos · R$ 24,6 mil" (link).

FINANCEIRO — título "Financeiro: tenho dinheiro para pagar as contas?"
- Marca No lugar (.k-estado.k-lugar). Número "R$ 8,2 mil" e "de folga em 7 dias"; .k-contexto "Saldo de 20/10: R$ 41,3 mil − R$ 33,1 mil até 28/10".
- Frase: "Dá para pagar as contas dos próximos 7 dias." Sem linha de exceção.
- Aberto, sem cor, rótulo "Saldo de 20/10": "Folga em 7 dias (até 28/10)" R$ 8,2 mil; "Folga em 30 dias (até 20/11)" R$ 2,2 mil; "Saldo do banco em 20/10" R$ 41.300,00; "A vencer até 28/10: 5 parcelas" R$ 33.100,00 (link); "Contas vencidas" nenhuma; "Quebra do caixa no fechamento de 20/10" R$ 0,00 (link).

Rodapé de cada cartão: "Ver o desvio ›" e a seta (.k-abre, botão próprio). A seta só aparece quando o cartão tem detalhe para abrir.

Nota no canvas: "(proposta) A linha 'contra … num dia como hoje' é só do computador; no celular, o cartão fica sem ela e, aberto, sem a barra das curvas. O bloco 'O que isso significa' chega na Fase 6; no desenho, já aparece."

DESENHE 4 PRANCHAS na página "Início":

1. I1-computador — 1920 × 1080: tudo acima, com os três cartões fechados.

2. I1-computador-aberto — igual à 1, com os três cartões abertos (.k-aberto e aria-expanded="true"); no app, cada seta abre só o seu. Confira que o conteúdo termina antes de 950 px de altura (a altura útil do navegador), com o bloco da IA recolhido; se não couber, não corte nada e diga quantos px faltam.

3. I1-computador-sem-dado — título "I1 · Início · computador · sem meta, sem resposta e sem saldo". Moldura, menu e seletor da 1; três estados do cartão, juntos. Vale a regra nova: há seta quando há detalhe (no Design System, estes estão sem).
   - Vendas sem meta (nenhuma meta de outubro), ABERTO: o cartão "Sem meta" da prancha Cartão de pergunta, igual (.k-sem-dado, "Sem meta para outubro", "Projeção R$ 143,8 mil", botão "Cadastrar meta" em .k-acao-cartao), mais a linha "contra …" da prancha 1 e a seta. Aberto, sem barra de meta: lista "Realizado por vendedor", com Igor R$ 51,0 mil, Daniele R$ 40,2 mil e "Outros (sem meta própria)" R$ 1,2 mil, sem %, sem ritmo e sem cor.
   - Compras sem resposta: cartão .k-sem-dado com o título, a marca "Sem dado" e, no lugar do número, "Sem resposta para este dia". Sem contexto, frase, exceção nem seta (não há detalhe); o rodapé fica só com "Ver o desvio ›".
   - Financeiro sem o saldo, ABERTO: o cartão "Sem dado" da prancha Cartão de pergunta, igual ("Sem o saldo de 20/10", "A pagar até 28/10: R$ 33.100,00", botão "Digitar saldo"), mais a seta. Aberto: lista "Contas e quebra do caixa", com "A vencer até 28/10: 5 parcelas" R$ 33.100,00 (link), "Contas vencidas" nenhuma e "Quebra do caixa no fechamento de 20/10" R$ 0,00 (link). Sem as folgas e sem a linha do saldo.

4. I1-celular — 390 × 844 (.k-raiz.k-celular), moldura da G2-celular: barra de cima com "Hoje · qua, 21/10" e "atualizado às 14h05"; "Início" ativo na barra de baixo. No conteúdo: o título "Início", sem a data, como na G2-celular (o dia já está na barra; em 360 px a data quebraria); o bloco da IA recolhido; e os três cartões empilhados, fechados, como o cartão da prancha Moldura do celular, sem a linha "contra … num dia como hoje". Só o conteúdo rola; as duas barras ficam presas.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Bloco da IA aberto e indisponível: os textos da prancha Bloco IA.
- Saldo velho (Financeiro): o cartão "Saldo velho" da prancha Cartão de pergunta (atenção, "Saldo de 12/09", "há 39 dias", "Digitar saldo"), com a seta; aberto, como o normal, com "12/09" no lugar de "20/10" no rótulo e no saldo.
- Sem venda hoje até agora (outro dia, às 8h05): "Hoje até 8h05: nenhuma venda ainda" e, no computador, "contra R$ 0,3 mil num dia como hoje até 8h05".
- Itens sem vendedor: a linha só aparece quando houver; no exemplo, nenhum.
- Dia passado, terça, 15/09/2026: faixa e seletor da G2-computador-dia-passado; sem as linhas "Hoje até…" e "contra…". Vendas: o cartão de 15/09 da prancha Moldura do celular, igual (No lugar, "R$ 76,8 mil", "Ritmo 1,02 · 12 de 24 dias úteis", projeção R$ 153,6 mil, sem exceção). Compras: cartão .k-sem-dado, marca "Sem dado", com "Estoque desconhecido antes de 26/09/2026" no lugar da falta e do encalhe; aberto, a barra com "Comprou 141 produtos em 90 dias: 63 curva A, 38 B, 29 C e 11 sem venda". Financeiro: No lugar, "R$ 7,5 mil" "de folga em 7 dias", "Saldo de 14/09: R$ 36,9 mil − R$ 29,4 mil até 22/09"; aberto, as linhas do normal com os números de 15/09 (folga em 30 dias R$ 1,3 mil; 4 parcelas, R$ 29.400,00; quebra de 15/09, R$ 0,00).
- Celular, Compras aberto: a frase das curvas, sem a barra.
- Carregando: a G2-computador. Erro: .k-aviso-erro.
- Gerente (Fase 7): a mesma tela, sem "Digitar saldo" e sem "Cadastrar meta".

O QUE CADA CLIQUE FAZ
- Seta → abre e fecha o cartão no lugar, como no Design System.
- Título ou "Ver o desvio ›": Vendas → V1-computador.dc.html; Compras → C1-computador.dc.html; Financeiro → F1-computador.dc.html.
- Daniele → V2-computador.dc.html; Igor → V2-computador-igor.dc.html.
- Itens sem vendedor, quando houver → V1, no bloco dessa exceção.
- Cada produto em falta → C2, visão Ruptura (sem destino); "Parado há 90 dias" → C2-computador.dc.html (visão Encalhe).
- "A vencer até 28/10" → F2-computador.dc.html; "Quebra do caixa…" → F3-computador-sem-fechamento.dc.html (a F3 abre no dia da barra, e hoje o caixa ainda não fechou).
- "Cadastrar meta" (só o dono) → K2-computador.dc.html; "Digitar saldo" (só o dono) → K1-computador.dc.html.
- No celular, os mesmos destinos nas pranchas "-celular": V1, V2 (Daniele), C1, F1, F2, F3 e, no "Digitar saldo", K1-celular. O que leva a uma tela só de computador não é link: os produtos em falta e o encalhe (C2) ficam como texto, e "Cadastrar meta" (K2) não aparece.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- Cabe sem rolar em 1920 × 1080 com um cartão aberto. Nenhuma rolagem para o lado em 1366 e 1920 px no computador, nem em 360 e 390 px no celular; nenhum texto passa da borda do cartão.
- Cor só para estado: atenção âmbar, fora vermelho, sempre com ícone e palavra; nunca verde. O que está no lugar fica neutro; as barras de meta e das curvas não mudam de cor.
- Número sempre com unidade e comparação; cada cartão com a sua frase-resumo, onde o Design System a põe.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de 44 px no celular (título, nomes, "Ver o desvio", seta).
- No máximo 3 cliques do Início até qualquer número.
- O bloco da IA fica separado dos números e não calcula: só repete o que a tela mostra.
- Nenhum menu ou painel aberto cobrindo um cartão.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
