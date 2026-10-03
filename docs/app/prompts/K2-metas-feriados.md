# Prompt K2 — Metas e feriados

Tela 13 da lista (`docs/app/TELAS.md`, seção 7, K2).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: K2 · Metas e feriados (tela 13 da lista, a última desta fase). As pranchas vão na página "Cadastros" do canvas, abaixo das da K1, com uma nota de título "K2 · Metas e feriados", como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado: só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta-feira, 21/10/2026, atualizado às 14h05; Israel, perfil Dono. Escreva cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador (menu com todos os itens, menu da conta FECHADO). Cada prancha leva a linha <meta name="viewport">; os links do menu vêm junto.
- Nomes como "K2-computador.dc.html"; títulos como "K2 · Metas e feriados · computador".
- Esta tela é só do computador: não desenhe celular.

PARA QUE SERVE
Onde o dono digita, mês a mês, o que o ritmo e a projeção usam: a meta da loja, a de cada vendedor e os dias em que a loja não abre. Ficam juntos porque os dias fechados mudam os dias úteis, base do ritmo.

Desenhe 2 pranchas na página "Cadastros":

1. K2-computador — outubro de 2026:
   - menu: "Metas e feriados" ativo (grupo Cadastros);
   - barra de cima SEM o seletor de dia, como na G2-computador-outra-tela: a busca, "Atualizado às 14h05 · próxima às 15h" e a conta (a K2 tem seletor próprio de mês);
   - cabeçalho (.k-cabecalho-tela): título "Metas e feriados" (.k-titulo-tela) e, à direita, o seletor de mês "‹ outubro de 2026 ›": o botão "Mês anterior" (.k-botao.k-icone, ícone esq), a lista do mês (.k-entrada-sufixo com select .k-entrada.k-selecao, de abril de 2026 a outubro de 2027, 19 meses, com "outubro de 2026" escolhido) e o botão "Mês seguinte" (ícone dir). O Design System tem a lista e os botões, mas não o conjunto: junte os dois e diga no fim;
   - embaixo, duas colunas (grade local, minmax(0, 1fr) e 340 px): Metas à esquerda, no resto da largura, e Dias sem expediente à direita, com 340 px (o calendário tem 300 px, mais a margem do cartão).

   Esquerda, cartão "Metas de outubro de 2026" (.k-cartao, título .k-titulo-bloco) e, logo abaixo do título (.k-rotulo-regular), "Ao lado de cada meta, o realizado dos 3 meses anteriores.":
   - uma tabela (.k-tabela), sem ordenar, com as colunas Quem, Meta de outubro (o campo), Julho, Agosto e Setembro (números à direita). As linhas:
     Loja · [R$ 150.000,00] · R$ 145.000,00 · R$ 140.000,00 · R$ 148.900,00
     Igor · [R$ 75.000,00] · R$ 76.200,00 · R$ 72.800,00 · R$ 78.400,00
     Daniele · [R$ 75.000,00] · R$ 66.100,00 · R$ 64.900,00 · R$ 68.000,00
   - cada campo é o de dinheiro do Design System (.k-entrada-prefixo com "R$"; input .k-entrada.k-num com inputmode="decimal"), com 140 px de largura (estilo local) e nome para o leitor de tela (aria-label "Meta de outubro da loja", "Meta de outubro do Igor", "Meta de outubro da Daniele"). A linha fica com a altura do campo (40 px, e não os 36 px da tabela): diga no fim;
   - os três realizados em .k-rotulo-regular (13 px, cinza), como comparação. Medido com as classes do Design System: assim a tabela cabe nos 664 px que a coluna tem em 1366; com 15 px ou com o campo mais largo, rola para o lado;
   - embaixo da tabela, a conferência (.k-dados): "Soma das metas dos vendedores" R$ 150.000,00 · "Meta da loja" R$ 150.000,00 · "Diferença" R$ 0,00, e a nota (.k-rotulo-regular) "Venda de quem não é vendedor no ERP conta só na meta da loja.";
   - os botões (.k-botoes): Salvar (.k-botao.k-principal), Copiar do mês anterior (.k-botao.k-secundario) e Desfazer (.k-botao.k-texto, desligado: nada foi mudado).

   Direita, cartão "Dias sem expediente" (.k-cartao):
   - no alto, a regra à vista: "Marque só os dias em que a loja não abre. Feriado em que a loja abriu não entra.";
   - o calendário do Design System (.k-calendario), aberto no lugar, sem flutuar e sem a sombra (estilo local). O cabeçalho diz só "Outubro de 2026", sem setas (o mês muda no seletor do alto). Semana de segunda a domingo: na primeira linha, 28, 29 e 30/09 como de outro mês (.k-outro-mes); os domingos 04, 11, 18 e 25 apagados (.k-desligado, sem clique: domingo nunca é dia útil); 12/10 como sem expediente (.k-sem-expediente, com o ponto) e a descrição na dica nativa (title="Nossa Senhora Aparecida"); 21/10 como hoje (.k-hoje); os dias depois de hoje ligados, porque dá para marcar um feriado à frente; 01/11 como de outro mês. No rodapé do calendário, a legenda "sem expediente", sem o botão "Hoje";
   - "Dias úteis no mês: 26";
   - a lista dos dias fechados: uma .k-tabela pequena, sem cabeçalho e sem ordenar, com uma linha de duas células: "seg, 12/10 · Nossa Senhora Aparecida", que quebra em duas linhas (white-space: normal, estilo local), e "Remover" (.k-botao.k-secundario.k-pequeno). Numa linha só, ela não cabe nos 306 px do cartão.

2. K2-computador-descartar — igual à 1, depois de o dono mudar a meta do Igor e tentar trocar de mês sem salvar:
   - o campo do Igor com 60.000,00 e, logo abaixo da tabela (dentro da célula, a frase alargaria a coluna), o efeito (.k-efeito): "O ritmo do Igor passa a ser medido contra R$ 60 mil, em vez de R$ 75 mil.";
   - Desfazer ligado. A conferência continua a do que está salvo (R$ 150.000,00, R$ 150.000,00 e R$ 0,00): a tela não refaz a conta;
   - por cima, o diálogo do Design System (.k-veu + .k-dialogo, aria-modal="true"), sem o X: "Descartar o que foi digitado?", com o texto "A meta de outubro do Igor que você digitou ainda não foi salva.", "Continuar editando" (.k-botao.k-secundario, com o anel de foco: .k-foco) e "Descartar" (.k-botao.k-principal). O que está por trás fica inert.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Confirmação ao salvar a mudança do Igor: "A meta de outubro do Igor muda de R$ 75.000,00 para R$ 60.000,00. Confirmar?" (.k-confirmacao), e Salvar vira "Confirmar e salvar".
- Salvo: "Metas de outubro salvas", a conferência que o servidor devolve (depois da mudança do Igor: soma dos vendedores R$ 135.000,00 · loja R$ 150.000,00 · diferença R$ 15.000,00), "vale a partir das 15h" e o link "ver o desvio".
- Valor inválido: "Digite um valor maior que zero, no formato 60.000,00." (.k-campo.k-erro e .k-mensagem-erro; a linha do efeito some).
- Gravação falhou: "A gravação falhou e nada foi alterado. O que você digitou continua nos campos; tente de novo." (.k-aviso-falha no alto do cartão).
- Dezembro de 2026, sem meta: campos vazios, a frase "Sem meta, o ritmo fica vazio." e "Copiar do mês anterior", que traz R$ 145.000,00, R$ 72.500,00 e R$ 72.500,00 (só grava com Salvar); dia fechado sex, 25/12 · Natal; dias úteis no mês: 26.
- Novembro de 2026: metas já digitadas, R$ 145.000,00 (loja), R$ 72.500,00 (Igor) e R$ 72.500,00 (Daniele); conferência R$ 145.000,00, R$ 145.000,00 e R$ 0,00; dia fechado seg, 02/11 · Finados (em 20/11 a loja abre e não entra); dias úteis no mês: 24; realizado da loja: agosto R$ 140.000,00, setembro R$ 148.900,00 e outubro até 21/10 R$ 92.400,00.
- Setembro de 2026, mês passado: metas R$ 150.000,00, R$ 75.000,00 e R$ 75.000,00; dias fechados seg, 07/09 · Independência e sáb, 26/09 · Inventário da troca de ERP; dias úteis no mês: 24. Mudar uma meta ou um dia pede antes: "Isso muda o ritmo e a projeção de todos os dias de setembro".
- Abril a agosto de 2026: sem meta ("Sem meta, o ritmo fica vazio."); em maio, sex, 01/05 · Dia do Trabalho. Em abril de 2026, o botão "Mês anterior" fica desligado; em outubro de 2027, o "Mês seguinte".
- Vendedor novo no ERP: a linha dele com a etiqueta neutra "novo no ERP" (.k-etiqueta). Quem deixou de ser vendedor no ERP: a linha dele com "a meta dele não entra no ritmo".
- Dia de segunda a sábado clicado: um diálogo (.k-veu + .k-dialogo) "Loja fechada neste dia?", com o campo de descrição. Dia fechado clicado (ou Remover): "Reabrir este dia", com confirmação.
- Carregando e erro: os padrões do Design System.

O QUE CADA CLIQUE FAZ (para as pranchas que você ligar entre si, se quiser deixá-las clicáveis)
- ‹, › e a lista → trocam o mês; com algo digitado, perguntam antes "Descartar o que foi digitado?".
- Campo de meta → só R$ maior que zero; vazio quer dizer sem meta.
- Salvar → grava (com a confirmação, quando muda uma meta já salva); "ver o desvio" → V1-computador.dc.html.
- Copiar do mês anterior → preenche os campos com as metas do mês anterior; só grava com Salvar.
- Desfazer → volta os campos ao que está salvo.
- Dia de segunda a sábado → "Loja fechada neste dia?"; dia fechado ou Remover → "Reabrir este dia".
- No diálogo de descartar: o foco abre em "Continuar editando"; Esc volta a editar; "Descartar" sai sem salvar. Sem nada digitado, a troca de mês ou de tela é direta.
- Item do menu → a tela (Saldo do banco → K1-computador.dc.html), com a mesma pergunta quando há algo digitado.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- A tela não calcula: a conferência (soma e diferença) e os dias úteis vêm prontos do servidor; ao digitar, a conferência não muda na tela, e a nova chega ao salvar.
- Formulário: o servidor confere e grava; se a gravação falha, o que foi digitado fica nos campos; quem mudou e quando fica registrado.
- Cor só para estado: nesta tela, só o erro no campo e a falha da gravação ficam em vermelho, com ícone e texto; "novo no ERP" é etiqueta neutra; o calendário não tem cor de estado. Nada de verde.
- Dinheiro no detalhe, como R$ 150.000,00 (o efeito usa "R$ 60 mil", como no Design System); datas como "seg, 12/10".
- Nada abaixo de 13 px; nenhuma rolagem para o lado em 1366 e 1920. Em 1366, as duas colunas ficam lado a lado com as medidas acima.
- O diálogo cobre a tela de propósito; fora ele, nenhum menu ou caixa aberta cobrindo a ação de outra parte da prancha.
- Animação só ao abrir e fechar o diálogo, como o Design System prevê.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
