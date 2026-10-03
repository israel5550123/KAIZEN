# Prompts das telas da Fase 5 — ordem de colagem

Os 12 prompts novos desta pasta continuam a conversa do projeto **Kaizen · Telas** no Claude Design, depois da G2. Cole um por vez, na mesma conversa, nesta ordem. Espere cada tela terminar antes de colar a próxima. A conferência das pranchas pelo Claude Code vem no fim, de todas juntas.

V3 (Padrões de venda) e F4 (Fluxo realizado) foram adiadas em 03/10. Nenhum prompt tem link para elas.

| Ordem | Código | Tela | Arquivo do prompt | Página do canvas | Pranchas | Caracteres do texto para colar |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | G2 | Moldura (menu, barra, calendário e avisos) | `G2-moldura.md` (já colada) | Moldura e entrada | 8 | 10.374 |
| 2 | G1 | Entrar | `G1-entrar.md` | Moldura e entrada | 3 | 8.648 |
| 3 | I1 | Início (as três perguntas) | `I1-inicio.md` | Início | 4 | 9.982 |
| 4 | V1 | Vendas: o desvio | `V1-vendas-desvio.md` | Vendas | 3 | 9.992 |
| 5 | V2 | Detalhe do vendedor | `V2-vendedor.md` | Vendas | 3 | 9.992 |
| 6 | C1 | Compras: o desvio | `C1-compras-desvio.md` | Compras | 2 | 9.986 |
| 7 | C2 | Estoque e giro | `C2-estoque-giro.md` | Compras | 3 | 9.962 |
| 8 | C3 | Detalhe do produto | `C3-produto.md` | Compras | 2 | 9.965 |
| 9 | F1 | Financeiro: o desvio | `F1-financeiro-desvio.md` | Financeiro | 3 | 9.972 |
| 10 | F2 | Contas a pagar e previsão | `F2-contas-a-pagar.md` | Financeiro | 2 | 9.962 |
| 11 | K1 | Saldo do banco | `K1-saldo-banco.md` | Cadastros | 3 | 9.636 |
| 12 | F3 | Caixa da loja | `F3-caixa.md` | Financeiro | 4 | 9.996 |
| 13 | K2 | Metas e feriados | `K2-metas-feriados.md` | Cadastros | 2 | 9.911 |
| | | **Total** | | | **42** (8 da G2 já feitas + 34 novas) | |

**Como contei os caracteres.** É só o que está dentro do bloco `text` de cada arquivo, que é o que vai para o Claude Design. Os 12 novos ficam abaixo de 10 mil. O livro de dados que todos usam está em `docs/app/dados-exemplo/dados-exemplo.md`.

## As pranchas de cada tela

O nome de cada prancha segue `<código>-<formato>[-<estado>].dc.html`. Nenhum nome se repete.

- **G2** (8): `G2-computador`, `G2-computador-calendario`, `G2-computador-dia-passado`, `G2-computador-faixas`, `G2-computador-outra-tela`, `G2-celular`, `G2-celular-calendario`, `G2-celular-dia-passado`
- **G1** (3): `G1-computador`, `G1-celular`, `G1-computador-sem-acesso`
- **I1** (4): `I1-computador`, `I1-computador-aberto`, `I1-computador-sem-dado`, `I1-celular`
- **V1** (3): `V1-computador`, `V1-computador-sem-meta`, `V1-celular`
- **V2** (3): `V2-computador`, `V2-computador-igor`, `V2-celular`
- **C1** (2): `C1-computador`, `C1-celular`
- **C2** (3, só computador): `C2-computador`, `C2-computador-sem-venda`, `C2-computador-grupo`
- **C3** (2): `C3-computador`, `C3-celular`
- **F1** (3): `F1-computador`, `F1-computador-sem-saldo`, `F1-celular`
- **F2** (2): `F2-computador`, `F2-celular`
- **K1** (3): `K1-computador`, `K1-computador-painel`, `K1-celular`
- **F3** (4): `F3-computador` (dia 20/10), `F3-computador-sem-fechamento` (hoje), `F3-computador-mes`, `F3-celular` (dia 20/10)
- **K2** (2, só computador): `K2-computador`, `K2-computador-descartar`

(Todos os nomes acima terminam em `.dc.html`.)

## Os caminhos do Início até cada número (no máximo 3 cliques)

- Vendas: Início → V1 (1 clique); Início → Daniele → V2 (1); Início → abrir o cartão → Igor → V2 (2).
- Compras: Início → C1 (1); Início → abrir o cartão → "Parado há 90 dias" → C2 (2) → produto 20500 → C3 (3).
- Financeiro: Início → F1 (1) → folga ou faixa → F2 (2); Início → abrir o cartão → "Quebra do caixa" → F3 de hoje (2) → "Ver o fechamento de terça, 20/10" (3).
- Cadastros: menu → Saldo do banco (K1) ou Metas e feriados (K2), 1 clique; "Digitar saldo" e "Cadastrar meta" também levam a eles.

## O que esta conferência mudou

1. **Links do menu.** A G1 agora pede, como 4º ajuste da G2, os links do menu e da barra de baixo para as pranchas das próximas telas, e o "Sair" para a G1. As outras telas copiam a moldura com esses links.
2. **Quebra do caixa no Início** leva à F3 de hoje (`F3-computador-sem-fechamento`), como o cartão Caixa da F1. A F3 sempre abre no dia escolhido na barra, e às 14h05 o caixa de hoje ainda não fechou.
3. **"5 contas" virou "5 parcelas"** no Início (e "4 parcelas" no exemplo de 15/09), como na F1 e na F2.
4. **"Tela N da lista"** no começo do texto de todas as telas, e "nota de título" no lugar de "título" onde faltava.
5. **K2** vai abaixo das pranchas da K1, como as outras telas.
6. **C1 e C2 enxugados** para ficar abaixo de 10 mil caracteres, sem tirar nenhum pedido. A C2 aponta para as dicas e para a nota da C1, que vem logo antes.
