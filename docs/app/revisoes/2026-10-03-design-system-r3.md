# Revisão 4 do Design System do Kaizen (versão 1790997087-c8ea, a "rodada 3")

03/10/2026. Três frentes em paralelo, cada achado marcado "corrigir" passou por um verificador que tentou refutá-lo:

- os 10 itens da última rodada (`docs/app/prompts/00e-correcao-design-system.md`), comparados arquivo por arquivo com a versão 10;
- as medições das 21 pranchas no Chromium, com uma cópia local da Inter;
- a prontidão para a G2: as 8 pranchas montadas só com as classes do Design System, a partir do prompt `docs/app/prompts/G2-moldura.md`.

Scripts e capturas em `/tmp/claude-0/kaizen-revisao-ds-4/` (`itens/`, `medicoes/`, `g2/` e as pastas dos verificadores). **FATO** = conferi no arquivo ou medi. **OPINIÃO** = recomendação minha.

## a) Veredito

1. **Os 10 itens estão feitos, com os valores pedidos, e nada impede instalar o Design System nem desenhar a G2** (FATO). A seção "Mudanças da rodada 3" (README, linhas 381 a 401) confere com os arquivos. A varredura de textos proibidos ficou limpa, sem erro de console, sem variável indefinida e sem prancha passando do cartão.
2. **As medidas que o autor relatou se confirmam** (FATO):
   - moldura na largura toda em 412, 430 e 599 px, com as barras de 56 e 64 px e a página sem rolar;
   - 60 de 60 Tabs presos dentro da folha e dos diálogos (na versão 10, 34 e 57 de 60 saíam);
   - Daniele a 8 px da divisória;
   - rótulo de "R$ 102,4 mil" dentro da caixa em 360 px;
   - tabela de contraste com 1100 px numa seção de 1152.
3. **As quatro confirmações que ele pediu podem ser aceitas** (seção c).
4. **Nenhum achado ficou em "corrigir"** depois dos verificadores. O do anel de foco do calendário foi confirmado como defeito, mas rebaixado para "menor": nasceu do nosso próprio pedido e não afeta as telas.
5. **O prompt da G2 ganhou 9 ajustes** (seção d), já aplicados no arquivo. Há também um texto curto para colar se a G2 já tiver começado.

## b) Os 10 itens (FATO)

| Item | Resultado |
| --- | --- |
| 1. Faixas | A ordem nova está palavra por palavra no `FaixaAviso/README.md` e no README; "Voltar para hoje" na loja fechada; "Atenção" em negrito na faixa âmbar (também no celular); o texto novo de hoje sem atualização. |
| 2. Dias sem expediente | "Que o dono marca em Metas e feriados e chegam prontos do servidor" nos três lugares, e mais uma linha em Regras: dia sem venda com o ERP fora do ar não vira dia fechado. |
| 3. Seta do cartão | "A seta só aparece quando o cartão tem detalhe para abrir", com os casos do Financeiro e do Vendas. |
| 4. Moldura do celular | Sem o limite de 390 px; README com "body sem margem". |
| 5. Botão do dia fora de hoje | `.k-dia-celular.k-outro-dia` com as cores do computador, 114 × 44 px; tela de 15/09 desenhada. |
| 6. Toque no celular | 155 alvos medidos, nenhum abaixo de 44 px; vendedor com 8 px; rótulos da meta quebram linha sem sair da caixa. |
| 7. Foco | Folha e diálogos prendem o Tab (regra escrita para o app); anel dos dias por dentro (ver seção e). |
| 8. Pequenos | Seta da IA sem animação; Fundamentos cabe; leitor de tela não lê a barra das curvas duas vezes; contorno branco na linha da média; "ritmo 0,82" na Daniele. |
| 9. As quatro decisões | O diálogo "Descartar" está desenhado, com o foco em "Continuar editando" e o Esc voltando a editar; a frase das curvas vem do servidor; o mês vai de abril de 2026 até 12 meses à frente; a lista Vendedor saiu do painel. |
| 10. README | "Mudanças da rodada 3" confere. |

## c) As quatro confirmações (OPINIÃO: aceitar todas, como foi respondido ao dono)

- **Abas e visões rolando dentro da faixa no celular.** Nenhuma tela do celular na `TELAS.md` usa abas ou visões. C1 no celular tem a barra, a frase e os cartões de exceção; as visões são da C2, que é só do computador; F3 no celular é só o dia; R1 abre já filtrada pelo R5. Falta uma pista de que há mais (barra escondida, sem degradê): se uma tela de celular passar a usar abas, decidir ali (quebrar em duas linhas ou pôr degradê).
- **"ritmo 0,82" seguido de "Fora"**, no cartão e no gráfico por vendedor. Efeito: a linha da Daniele também desce de linha em 390 px e nas colunas de 306 a 381 px do computador. A regra "quando não cabe, desce" cobre o caso.
- **Exemplo de 15/09.** Os números fecham:
  - setembro tem 24 dias úteis (30 dias, menos 4 domingos e os dias 07 e 26), e até 15/09 passaram 12;
  - meta de R$ 150 mil, R$ 76,8 mil: 51,2% da meta e ritmo 1,02 (76,8 ÷ 75);
  - a projeção de R$ 153,6 mil é uma conta em linha reta, não a regra do Kaizen. Como é número inventado, não contradiz nada.
  - O cartão foi desenhado sem a seta; pela regra do item 3 ele teria seta. Fica anotado.
- **"Descartar o que foi digitado?" sem o X.** Como pedido.

## d) Ajustes no prompt da G2 (FATO, já aplicados em `G2-moldura.md`)

1. **Celular sem a marca.** Com a marca, o botão do dia com "atualizado às 14h05" pede 306 px e sobram 305,5 em 390 px: o texto quebra em quatro linhas. Sem a marca, cabe de 360 a 430 px. O Design System mostra só "14h05", mas a `TELAS.md` pede "atualizado às".
2. **Prancha 8:** o botão fora de hoje vai sem a hora, como no Design System.
3. **Prancha 3:** o menu da conta aberto cobria o "Voltar para hoje" da faixa (em 1920 e em 1366 px). Ele foi para a prancha 5, que não tem faixa.
4. **Prancha 4:** passa a seguir a ordem da regra (loja fechada e hoje sem atualização antes do dia passado), como o próprio Design System mostra.
5. **Prancha 2:** o domingo 25/10 está no futuro, então fica só desligado, sem o ponto de sem expediente.
6. **Carregando:** as larguras dos blocos cinza só existem no estilo da prancha Estados de tela. O prompt agora autoriza usá-las.
7. **Celular:** cada prancha é uma página de 390 × 844, porque o véu da folha usa `position: fixed`.
8. **Prancha 5:** o aviso de erro é vermelho, como no Design System.
9. **Barra do celular sem o dia** (Painel e telas de cliente): fica como regra para as próximas telas.

Também alinhei três frases antigas da G2 na `TELAS.md`:
- a marca vai no menu, não na barra;
- "calculado em 20/10";
- o texto da loja fechada.

## e) Pendências do Design System, para uma próxima rodada ou para a 5b (FATO, todas menores)

- **Calendário:** com o anel por dentro, o foco no dia escolhido (azul sobre azul) ficou invisível (1,0:1). Correção testada: `.k-calendario td button.k-escolhido:focus-visible { outline-color: var(--cor-sobre-destaque); outline-offset: -4px; }`. Na folha do celular, os dias ficam colados, e o anel de um dia funde com o dia escolhido ao lado: `outline-offset: -4px` também ali.
- **Abas e visões no celular:** o anel de foco perde os lados de cima e de baixo dentro da faixa que rola, e o Tab não completa um item que está meio à vista.
- **Busca:** o texto longo corre 31 px por baixo do "x" no celular e 17 px no computador (`padding-right` de 44 e 36 px).
- **Toque no celular:** a caixa de marcar tem 24 px, e o "x" do chip tem 20 px, com fundo próprio que sugere ação separada.
- **Tabela reduzida:** em 360 px ela rola 3 px para o lado.
- **Menu da conta:** `.k-conta-caixa` não tem CSS; o menu aberto encosta na borda da janela, 32 px à direita do botão (falta `position: relative`).
- **Carregando:** só existem `.k-esqueleto.k-texto`, `.k-numero` e `.k-linha`. Faltam o bloco da marca de estado e as larguras parciais.
- **Botão do dia no celular:** `.k-dia-celular` sem `white-space: nowrap`, e o `<small>` com "14h05" em vez de "atualizado às 14h05". Falta também uma variante da barra do celular sem o dia que mantenha a hora, antes da R5.
- **Textos:**
  - `cor-grafico-neutro` perdeu "mês anterior" no uso, sem aviso;
  - o `MarcaEstado/README.md` ainda define a `.k-sinal` como "ícone, palavra e número";
  - falta pontuação depois de "Atenção" (o leitor de tela lê sem pausa).
- **Linha da média em monitor comum** (densidade 1): o branco do contorno sai cinza-claro, e a linha fica a 2,62:1 dele. Ainda assim, a faixa clara aparece bem sobre a barra (6,06:1).

## f) Próximo passo

1. O dono cria o projeto pelo modelo **Design** e cola a G2 na versão corrigida. Se já colou a anterior, cola também o texto de ajuste do fim do `G2-moldura.md`.
2. Quando a G2 ficar pronta, ele manda o link `claude.ai/artifact/...` do projeto. As pranchas são conferidas como o Design System foi, e as aprovadas são guardadas em `docs/app/telas/`.
3. Depois vem o prompt da G1 (Entrar).
