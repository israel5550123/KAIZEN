# Prompt K1 — Saldo do banco

Tela 11 da lista (`docs/app/TELAS.md`, seção 7, K1).

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: K1 · Saldo do banco (tela 11 da lista). As pranchas vão na página "Cadastros" do canvas, com uma nota de título "K1 · Saldo do banco", como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado: só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta-feira, 21/10/2026, atualizado às 14h05; Israel, perfil Dono. Escreva cada número exatamente como abaixo; a tela não calcula.
- Moldura copiada da G2-computador (menu com todos os itens, menu da conta FECHADO); no celular, da G2-celular: página de 390 × 844 sem moldura de aparelho e sem a marca na barra de cima. Cada prancha leva a linha <meta name="viewport">; os links do menu e da barra de baixo vêm junto.
- Nomes como "K1-computador.dc.html"; títulos como "K1 · Saldo do banco · computador".

PARA QUE SERVE
O dono digita o saldo da conta da loja, que o ERP não sabe (o depósito do dinheiro não é lançado lá). É a base da folga, e só o dono vê esta tela.

O MESMO FORMULÁRIO NOS TRÊS JEITOS (.k-formulario): a página do menu Cadastros, com o histórico; o painel lateral aberto pelo Financeiro (F1) ou pelas Contas a pagar (F2); a folha que sobe de baixo, no celular.
- No alto, a linha "O ERP não sabe o saldo do banco. Digite o saldo para o Kaizen calcular a folga."
- Último saldo: "R$ 41.300,00 em 20/10/2026, há 1 dia" e, embaixo, menor (.k-rotulo-regular), "digitado por Israel em 21/10 às 07h12".
- Campo "Data" (o campo de data do Design System: .k-entrada-sufixo com o ícone do calendário), com 21/10/2026 (o padrão é hoje).
- Campo "Valor" (.k-entrada-prefixo com "R$"; input .k-entrada.k-num com inputmode="decimal"), com 42.780,00 digitado.
- Embaixo do valor, a linha do efeito (.k-efeito): "A folga em 7 dias passa a usar este saldo."
- Salvar (.k-botao.k-principal), o único principal.
Na prancha Moldura do celular do Design System, a folha diz "Saldo em 20/10/2026" porque abre do cartão sem o saldo de 20/10. Aqui o saldo de 20/10 já existe, então o formulário vem com a data de hoje, como acima, nos três jeitos.

Desenhe 3 pranchas na página "Cadastros":

1. K1-computador — a página, aberta pelo menu:
   - menu: "Saldo do banco" ativo (grupo Cadastros);
   - barra de cima SEM o seletor de dia, como na G2-computador-outra-tela: a busca, "Atualizado às 14h05 · próxima às 15h" e a conta (Cadastros mostra hoje);
   - conteúdo (.k-conteudo): título "Saldo do banco" (.k-titulo-tela) e, embaixo, duas colunas;
   - à esquerda, numa coluna de 340 px (grade local; diga no fim), um cartão (.k-cartao) com o título "Digitar o saldo" (.k-titulo-bloco) e o formulário acima, só com Salvar: na página não há para onde voltar, então sem Cancelar;
   - à direita, no resto da largura, a tabela (.k-tabela-bloco) "Últimas 10 digitações", com "10 saldos" à direita do título, sem o botão Colunas e sem ordenar: cabeçalho só com o texto, sem botão nem seta (a ordem é sempre da mais nova para a mais velha). Colunas: Data do saldo, Valor (à direita), Quem, Quando e, numa última coluna sem título, as duas ações lado a lado na mesma célula: "Corrigir" (.k-botao.k-texto.k-pequeno) e "Apagar" (.k-botao.k-secundario.k-pequeno, que abre um diálogo de confirmação, como o Design System manda para ação que apaga);
   - largura: medi com as classes do Design System. A tabela pede 658 px. Em 1366, com o formulário em 340 px, ela ganha 696 px e sobram 38 px; com 360 px sobrariam 18 px, e só 1 px se o cabeçalho ganhasse a seta de ordenar. Não alargue a coluna do formulário. As 10 linhas:
     ter, 20/10/2026 · R$ 41.300,00 · Israel · 21/10 às 07h12
     seg, 19/10/2026 · R$ 43.150,00 · Israel · 20/10 às 07h05
     sex, 16/10/2026 · R$ 42.480,00 · Israel · 17/10 às 08h20
     qui, 15/10/2026 · R$ 40.950,00 · Israel · 16/10 às 07h30
     ter, 13/10/2026 · R$ 37.620,00 · Israel · 14/10 às 07h18
     sex, 09/10/2026 · R$ 39.480,00 · Israel · 10/10 às 08h02
     qui, 08/10/2026 · R$ 42.170,00 · Israel · 09/10 às 07h25
     ter, 06/10/2026 · R$ 45.900,00 · Israel · 07/10 às 07h40
     sex, 02/10/2026 · R$ 46.350,00 · Israel · 03/10 às 08h15
     qui, 01/10/2026 · R$ 48.000,00 · Israel · 02/10 às 07h10
   O saldo de 21/10 do formulário ainda não foi salvo; por isso não está na tabela.

2. K1-computador-painel — o painel aberto por cima do Financeiro:
   - por trás, a prancha F1-computador, como ela está: "O desvio" (grupo Financeiro) ativo no menu e a barra COM o seletor "‹ Hoje · qua, 21/10/2026 ›";
   - o painel lateral (.k-painel-lateral) dentro da .k-moldura, sem véu, abaixo da barra de cima, preso à direita: no cabeçalho, "Digitar o saldo do banco" e o botão Fechar (.k-botao.k-icone, aria-label "Fechar"); no corpo, o formulário acima, sem o histórico; no rodapé, Cancelar (.k-botao.k-secundario) e Salvar;
   - a F1 por trás continua clicável. Confira que o painel cobre só o lado direito da F1 e deixa à vista a barra de cima, o menu, a folga e o saldo que o abriram.

3. K1-celular — a folha que sobe de baixo:
   - por trás, a prancha F1-celular, como ela está (o botão do dia "Hoje · qua, 21/10" na barra de cima e "Financeiro" ativo na barra de baixo), com tudo inert;
   - .k-veu-celular + .k-folha (aria-modal="true"), com o puxador (.k-puxador), o cabeçalho "Digitar o saldo do banco" e o botão Fechar de 44 px (.k-botao-icone-44);
   - o formulário acima, numa coluna; o campo Valor, com inputmode="decimal", abre o teclado numérico do telefone (não desenhe o teclado);
   - no pé (.k-rodape-folha), Cancelar (.k-botao.k-secundario.k-grande) e Salvar (.k-botao.k-principal.k-grande), com 48 px, cada um com metade da largura;
   - sem o histórico.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Depois de salvar: "Saldo salvo. A folga nova aparece na próxima atualização, às 15h.", numa caixa neutra (.k-confirmacao) no alto do formulário. Na página, a linha nova entra no alto da tabela.
- Data que já tem saldo: "Já existe R$ 41.300,00 em 20/10. Substituir?" (.k-confirmacao), e Salvar vira "Confirmar e salvar", como no Design System.
- Valor negativo: "Saldo negativo: −R$ 1.250,00. Confirmar?", do mesmo jeito. É aceito depois de confirmar, sem vermelho.
- Valor vazio ou com letras: "Digite um valor em reais, no formato 41.300,00." (.k-campo.k-erro e .k-mensagem-erro; a linha do efeito some).
- Data depois de hoje: "A data não pode ser depois de hoje (21/10/2026)." Data antes de 01/04/2026: "A data não pode ser antes de 01/04/2026, o primeiro dia do Kaizen." As duas no campo, do mesmo jeito.
- Gravação falhou: "A gravação falhou e nada foi alterado. O que você digitou continua nos campos; tente de novo." (.k-aviso-falha no alto; os campos ficam como estavam).
- Apagar: diálogo (.k-veu + .k-dialogo) "Apagar o saldo de 20/10 (R$ 41.300,00)?", com o texto "A folga volta a usar o saldo de 19/10 (R$ 43.150,00).", Cancelar e "Apagar o saldo".
- Fechar com algo digitado (Cancelar, X, Esc ou, no celular, tocar no véu): o diálogo "Descartar o que foi digitado?", com "O saldo de 21/10 que você digitou ainda não foi salvo.", "Continuar editando" (com o foco) e "Descartar". Sem nada digitado, fecha direto.
- Nenhum saldo ainda: no lugar do último saldo, "Nenhum saldo digitado ainda. A folga só aparece depois do primeiro."; na página, a tabela vazia (.k-tabela-vazia) com a mesma frase.
- Carregando e erro: os padrões do Design System (.k-esqueleto no último saldo e nas linhas da tabela; .k-aviso-erro com "Tentar de novo").

O QUE CADA CLIQUE FAZ (para as pranchas que você ligar entre si, se quiser deixá-las clicáveis)
- Salvar (ou Enter) → o servidor confere e grava; aparece a frase de saldo salvo.
- Corrigir → carrega a linha no formulário (por exemplo, 20/10/2026 e 41.300,00), para salvar por cima.
- Apagar → o diálogo de confirmação.
- Cancelar, X ou Esc → fecha o painel ou a folha e volta à tela de onde veio (nas pranchas, F1-computador.dc.html e F1-celular.dc.html), com a pergunta de descartar quando há algo digitado. Clicar fora do painel não fecha.
- Quem abre: no computador, o saldo e "Atualizar saldo" da F1 e o saldo e "Digitar saldo" da F2 abrem o painel; "Saldo do banco", no menu, e "Digitar saldo", no Início, abrem a página. No celular, o saldo da F1 e da F2 e o "Digitar saldo" do Início abrem a folha; no celular não há Cadastros.
- Item do menu → a tela. O dia escolhido nas telas das três perguntas continua guardado ao passar pela K1.

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- A tela não calcula: "há 1 dia", o efeito e a folga nova vêm prontos do servidor; ao digitar, nenhum número muda na tela.
- Número com unidade e comparação: o último saldo vem com a data e a idade; na página, o histórico fica ao lado.
- Formulário: o servidor confere e grava; se a gravação falha, o que foi digitado fica nos campos; quem digitou e quando fica registrado (colunas Quem e Quando).
- Painel sem véu, dentro da moldura e abaixo da barra de cima. Nenhum painel ou menu aberto cobrindo a ação de outra parte da prancha.
- Cor só para estado: aqui, só o erro no campo e a falha da gravação ficam em vermelho, com ícone e texto. Nada de verde.
- Dinheiro no detalhe, como R$ 41.300,00; datas como 20/10/2026; horas como 07h12.
- Nada abaixo de 13 px no computador e de 14 px no celular; alvos de pelo menos 44 px no celular; nenhuma rolagem para o lado (em 1366 e 1920 no computador; em 360 e 390 no celular, também com a folha aberta).
- Animação só ao abrir e fechar o painel, a folha e o diálogo, como o Design System prevê.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
