# Prompt G1 — Entrar

Tela 2 da lista (`docs/app/TELAS.md`, seção 7, G1). O texto começa pelos três ajustes da G2 aprovados na revisão de 03/10 (`docs/app/revisoes/2026-10-03-g2.md`) e pelos links do menu para as telas seguintes, para a moldura ser corrigida antes de as outras telas a copiarem.

**Onde usar:** na mesma conversa do projeto Kaizen · Telas, depois que a tela anterior terminar.

---

```text
PRÓXIMA TELA: G1 · Entrar (tela 2 da lista), na página "Moldura e entrada" do canvas. Antes dela, três ajustes na G2 e os links do menu. A G2 ficou aprovada, e as próximas telas copiam a moldura dela; por isso, corrija primeiro:
1. Carregando (G2-computador, G2-computador-calendario, G2-computador-dia-passado, G2-celular, G2-celular-calendario e G2-celular-dia-passado): as larguras dos blocos cinza não pegam. A regra .k-esqueleto.k-linha, com duas classes, ganha de .pr-esq-70 e .pr-esq-40, e as linhas saem com 100%; o bloco de 72 px encolhe, porque não tem flex: none. Troque as três regras locais por estas: .k-esqueleto.pr-esq-70{width:70%} .k-esqueleto.pr-esq-40{width:40%} .k-esqueleto.pr-esq-marca{width:72px;height:24px;flex:none}
2. Menu da conta aberto: na G2-computador-outra-tela, ele cobre o "Tentar de novo" do aviso de erro. Leve-o para a G2-computador, como você propôs (lá ele só cobre um bloco cinza), com o botão da conta em aria-expanded="true". Na outra-tela, o menu fecha (aria-expanded="false") e nada cobre o aviso. Nas duas, ponha .k-conta-caixa{position:relative}, para o menu abrir alinhado ao botão da conta, e não à borda da janela.
3. Ponha a linha <meta name="viewport" content="width=device-width, initial-scale=1"> nas 8 pranchas, como nas do Design System: sem ela, aberta num celular, a prancha vira uma página de 980 px e a letra de 14 px aparece com 5,6 px. No botão do dia do celular, ponha aria-expanded="true" na G2-celular-calendario (folha aberta) e "false" na G2-celular e na G2-celular-dia-passado.
4. Links, agora que cada tela tem nome de arquivo. No menu das pranchas de computador da G2: Início → I1-computador.dc.html; O desvio (Vendas) → V1-computador.dc.html; O desvio (Compras) → C1-computador.dc.html; Estoque e giro → C2-computador.dc.html; O desvio (Financeiro) → F1-computador.dc.html; Contas a pagar → F2-computador.dc.html; Caixa → F3-computador-sem-fechamento.dc.html; Saldo do banco → K1-computador.dc.html; Metas e feriados → K2-computador.dc.html; e "Sair", no menu da conta, → G1-computador.dc.html. Na barra de baixo das pranchas de celular: Início → I1-celular.dc.html, Vendas → V1-celular.dc.html, Compras → C1-celular.dc.html, Financeiro → F1-celular.dc.html. Essas pranchas vêm nas próximas telas: deixe os links prontos. Clientes continua levando à G2-computador-outra-tela; os outros itens, o Painel e a busca ficam sem destino (as telas deles vêm depois; Padrões de venda e Fluxo realizado foram adiados).
Daqui em diante, toda prancha nova leva a linha do viewport e, quando tiver o carregando, as três regras do item 1. Ao copiar a moldura da G2-computador nas próximas telas, deixe o menu da conta fechado e mantenha os links do item 4. No fim, conte também o que mudou em cada prancha da G2.

AGORA, A G1. As pranchas vão na página "Moldura e entrada", numa fileira abaixo das da G2, com uma nota de título "G1 · Entrar", como a da G2.

Continua valendo tudo do primeiro pedido:
- Design System "Kaizen" instalado: só as classes e os tokens dele. Se faltar algo, use o mais próximo e me diga no fim.
- Os mesmos dados de exemplo: quarta-feira, 21/10/2026; quem entra é o Israel, perfil Dono.
- Nomes como "G1-computador.dc.html"; títulos como "G1 · Entrar · computador". Celular como página de 390 × 844, sem moldura de aparelho.
- Esta tela é a exceção da moldura: não tem menu, barra de cima nem barra de baixo.

PARA QUE SERVE
A porta do app: entra quem o dono cadastrou, e cada perfil cai na sua tela inicial. "Sem acesso" é um estado desta tela, não outra tela.

Desenhe 3 pranchas na página "Moldura e entrada":

1. G1-computador — 1920 × 1080, página fluida, só com .k-raiz (body sem margem, fundo --cor-fundo):
   - no meio da tela, um cartão (.k-cartao) de uns 400 px de largura, com tudo empilhado nesta ordem (a largura e a centralização são estilo local da prancha; diga no fim);
   - a marca "Kaizen" (.k-marca-kaizen) e, embaixo, "Vendas, compras e caixa da loja" (.k-corpo, .k-sec);
   - "Entrar com Google" (.k-botao.k-secundario.k-grande.k-cheio), sem o logotipo do Google: o Design System não traz marca de terceiros;
   - o separador "ou": o Design System não tem; use a palavra em .k-rotulo-regular, no meio de uma linha fina na cor --cor-contorno, e diga no fim;
   - o formulário (.k-formulario): campo "E-mail" (.k-campo, input type="email" .k-entrada) com "israel@example.com" digitado; campo "Senha" (input type="password" .k-entrada) com a senha digitada, em pontos; o botão "Entrar" (.k-botao.k-principal.k-grande.k-cheio), o único principal da tela; e, embaixo, "Esqueci a senha" (.k-botao.k-texto);
   - no pé do cartão, depois de uma linha fina, o rodapé fixo, sempre à vista: "Acesso liberado pelo Israel. Não há cadastro por aqui." (.k-rotulo-regular).

2. G1-celular — 390 × 844 (.k-raiz.k-celular), sem barra de cima e sem barra de baixo:
   - o conteúdo da prancha 1 numa coluna (.k-conteudo-celular, 16 px de margem), sem o cartão em volta;
   - botões da largura da tela (.k-cheio); campos e botões com 44 px de altura ou mais (o .k-celular já faz isso);
   - o rodapé "Acesso liberado pelo Israel. Não há cadastro por aqui." no pé da tela, com 14 px.

3. G1-computador-sem-acesso — igual à 1, depois de a pessoa entrar com uma conta que o dono não cadastrou:
   - ficam a marca, a linha de baixo dela e o rodapé;
   - no lugar do botão do Google, do "ou", dos campos e do "Esqueci a senha": a caixa neutra (.k-confirmacao, com o ícone info) "A conta visitante@example.com não tem acesso ao Kaizen. Peça ao Israel." e o botão "Entrar com outra conta" (.k-botao.k-secundario.k-grande.k-cheio);
   - sem vermelho: não é erro de digitação.

TEXTOS DOS OUTROS ESTADOS (só registre, sem prancha)
- Entrando: o botão usado fica em espera (desligado) e os campos travam (disabled).
- Senha errada: "E-mail ou senha não conferem", no alto do formulário (.k-aviso-falha, com o ícone de erro). Nenhum campo fica marcado, porque a frase não diz qual errou. O e-mail continua no campo.
- Servidor fora: "O Kaizen não respondeu. Tente de novo em alguns minutos.", no mesmo lugar e do mesmo jeito.
- Acesso expirado: volta ao formulário, com "Seu acesso expirou. Entre de novo." no alto, numa caixa neutra (.k-confirmacao, com o ícone info), sem vermelho.
- Outras portas fechadas, do mesmo jeito da prancha 3, com o mesmo botão "Entrar com outra conta"; só a frase muda:
  - perfil cujas telas ainda não chegaram: "Seu acesso chega numa próxima etapa";
  - acesso bloqueado: "Seu acesso foi encerrado. Fale com o Israel.";
  - gerente ou vendedor no celular: "O Kaizen da equipe é usado no computador" (não entra);
  - entregador no computador: "A sua tela é no celular".
- Esqueci a senha: o cartão mostra só o campo "E-mail", com o que já estava digitado, o botão "Enviar o link" (principal) e "Voltar" (texto). Depois de enviar: "Se este e-mail tiver acesso, o link chega em instantes." e "Voltar".

O QUE CADA CLIQUE FAZ (para as pranchas que você ligar entre si, se quiser deixá-las clicáveis)
- "Entrar com Google" → a janela do Google, que é do Firebase (não desenhe) → a tela inicial do perfil.
- "Entrar" (ou Enter num campo) → o servidor confere → a tela inicial do perfil. Dono: o Início (I1-computador.dc.html no computador, I1-celular.dc.html no celular; é a próxima tela, deixe o link pronto). Gerente: o Início (Fase 7). Vendedor: a carteira (R1) na Fase 7 e a lista do dia (R4) a partir da 8. Entregador: as entregas do dia (E1, Fase 11).
- "Esqueci a senha" → pede o e-mail, como no texto acima. "Voltar" → o formulário.
- "Entrar com outra conta" (G1-computador-sem-acesso) → volta ao formulário (G1-computador.dc.html).
- Quem já entrou e não saiu abre direto na tela inicial, sem passar por aqui. "Sair", no menu da conta da moldura, traz para cá (G1-computador.dc.html).

REGRAS QUE ESTA TELA PRECISA CUMPRIR
- A tela não tem números nem "Atualizado às". No estado sem acesso, só aparece o e-mail usado.
- Cor só para estado: só as mensagens de erro (senha errada e servidor fora) ficam em vermelho, sempre com o ícone e o texto; o resto é neutro. Nada de verde.
- Um botão principal só: "Entrar" no formulário ("Enviar o link" no Esqueci a senha); a prancha 3 não tem principal.
- Nada abaixo de 13 px no computador e de 14 px no celular; no celular, alvos de pelo menos 44 px; nenhuma rolagem para o lado (em 1366 e 1920 no computador, em 360 e 390 no celular).
- Sem "Criar conta" e sem cadastro: o acesso é liberado pelo Israel.
- Nada de animação nesta tela.

QUANDO TERMINAR, me diga em lista curta: as pranchas que criou; o que do pedido não fez e por quê; e se usou ou precisou de algo que não está no Design System.
```
