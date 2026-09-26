# A loja e o que os números significam

Material de leitura para quem implementa. Nada aqui é regra de código; é o que o dono sabe do negócio e o significado que cada número tem para ele. Os números têm data; os que descrevem o ERP anterior vêm da cópia de 12/09/2026.

## A loja

- Ferragens e acessórios para marceneiros, São Luís (MA). Comprada em setembro de 2026.
- Equipe: dois vendedores (Igor e Daniele), uma gerente (Erleide) e Wallace, no estoque. O dono não fica na loja.
- Abre às 7h, fecha às 18h, de segunda a sábado; sábado fecha ao meio-dia. Pico das 9h às 11h, queda no almoço, segundo pico às 17h.
- Faturamento mensal em 2026: abril (parcial) 57 mil, maio 131 mil, junho 140 mil, julho 145 mil, agosto 140 mil. Setembro projetava uns 120 mil.
- Cerca de 70% das vendas são Pix, 22% cartão, 7% dinheiro. Não há venda a prazo. Cartão cai em D+1.
- A loja não registra pedido de compra, só a nota fiscal de entrada. Não existe "estoque a chegar".
- Imposto pelo Simples: o dono lança uma estimativa fixa como conta a pagar e corrige no dia 10.
- Feriados municipais, estaduais e nacionais afetam a comparação entre meses.

## Como o caixa funciona

- Fechamento é por turno (abertura → fechamento), não por dia. Até maio houve dias com dois turnos; desde então é um por dia.
- **O fechamento é às cegas**: o operador digita o valor contado de cada forma (dinheiro na gaveta, Pix e cartão pelo aplicativo do banco e pela maquininha) sem ver o que o sistema espera; só depois o sistema mostra se bateu. Se não bateu, ele corrige ou escreve uma justificativa. O valor informado é a única contagem independente; o recontado é digitado depois de ver a resposta.
- A gaveta do dia é: vendas em dinheiro + suprimento − sangria − devolução paga em dinheiro. O suprimento da abertura é o que havia na gaveta ao abrir.
- O dinheiro vai para o cofre e depois para o banco, e o depósito não é lançado no ERP. Por isso o ERP não sabe o saldo do banco: o dono digita.

## Trocas e cancelamentos

- No ERP atual, troca e devolução são um documento próprio: o item volta ao estoque e vira crédito do cliente (troca) ou dinheiro devolvido (devolução). Contam na data e no vendedor desse documento. No ERP anterior, a devolução era lançada dentro de uma venda nova.
- Cancelamento tem dois níveis: item removido antes de fechar a venda e venda cancelada inteira. Venda cancelada não conta em nada.
- Seis vendas de abril a junho são testes da implantação do ERP anterior (quatro em Israel, uma em Luis Henrique, uma em Sistema). Continuam somando no total, como o ERP soma.

## O que cada número significa

- **Venda válida**: venda fechada e não cancelada. É a única que conta em qualquer indicador.
- **Vendido**: soma do líquido dos itens com vendedor das vendas válidas, depois do desconto, na data em que a venda foi fechada. Bate com o relatório 154 do ERP ("Total de vendas por funcionário e período"), menos no orçamento convertido no próprio documento em outro dia: o 154 conta no dia do orçamento, e o Kaizen no dia da venda. O item sem vendedor fica fora, como no 154, e o Kaizen o sinaliza como exceção.
- **Devoluções**: trocas e devoluções do período, na data e no vendedor da troca.
- **Realizado**: vendido − devoluções. É o líquido, o que ficou de fato, e é o número que se compara à meta.
- **Meta**: valor mensal cadastrado no app para a loja e para cada vendedor, comparado com o realizado (o líquido).
- **Projeção do mês**: realizado até ontem mais a média por dia da semana dos dias que faltam.
- **Ritmo do vendedor**: realizado ÷ meta × fração de dias úteis já decorridos. Não é projeção.
- **Curva ABC**: produtos ordenados pelo líquido acumulado no período; A até 80%, B até 95%, C o resto; o produto que atravessa o corte cai na classe de baixo. Existe por valor e por quantidade; em empate de quantidade, desempata por valor.
- **Giro**: quantidade vendida no período ÷ estoque médio. **Cobertura**: dias que o estoque atual dura no ritmo de venda.
- **Encalhe**: produto com estoque positivo e nenhuma venda em 90 dias, com carência para produto cadastrado há pouco. Não depende da classe ABC.
- **Ruptura**: produto que vendeu no período e está com estoque zero ou negativo.
- **Conta a pagar**: parcela com vencimento e valor em aberto. **Folga em 7 e 30 dias**: saldo do banco digitado menos o que vence nesse prazo. Data de liquidação é a da baixa no ERP, que costuma vir depois do pagamento.
- **Quebra de caixa**: informado − calculado, por turno e por forma (dinheiro, Pix, crédito e débito; a linha de troca e devolução fica fora). O recontado não entra: na Link ele era digitado depois de o operador ver a resposta do sistema. O ERP atual nem tem esse campo.
- **Vigia**: cada indicador tem uma régua (por exemplo, folga em 7 dias menor que zero). Quando cruza, o dono recebe uma frase.

## O ERP anterior (Link), para o tradutor da história

A cópia congelada, esquema `erp` no Postgres da VPS, tem 26 tabelas e vai de 11/04/2026 a 25/09/2026, o último dia de venda na Link; a cópia final é tirada depois desse dia. O que a Link guarda e como se lê está documentado em `C:\Projetos\prumo\docs\DICIONARIO.md` (repositório arquivado). Dois pontos que valem antecipar:

- A Link arredonda o líquido de cada item antes de somar; o valor gravado é o que vale, não se recalcula.
- Estoque na Link é foto do dia da cópia; não há histórico de movimento.

## O ERP atual (Meu ERP Online)

- Cadastros migrados por planilha em 24/09/2026. O código de tela do produto na Link virou o próprio **código do produto** no ERP novo; a referência da variação guarda a referência do fabricante. O cliente leva CPF/CNPJ.
- Na migração, o dono deixou de fora os produtos com que a loja não trabalha mais, e parte dos clientes: entraram 1.022 produtos, contra 1.391 ativos na Link.
- A operação real começa em 28/09/2026. Antes disso, os documentos do ERP são a importação (24/09) e os testes do dono (25 e 26/09), que o suporte apaga. Dos documentos anteriores a 28/09, o Kaizen lê só as contas a pagar importadas e a carga do estoque feita pelo inventário. O sábado, 26/09, não tem venda: é o dia do inventário, a pausa entre a Link e o ERP novo.
- O PDV funciona offline: a venda pode aparecer na API depois da hora em que foi feita.
- Desde 25/09/2026, o caixa exige o vendedor em toda venda.
- Toda venda tem cliente: o ERP não fecha venda sem um. No balcão, fica o Consumidor Final (código 999007), que é o padrão do caixa. O Consumidor Final original (código 2) foi sobrescrito na importação por um cliente real.
- Limites da API: cerca de 20 requisições por minuto do relógio (o excesso espera a virada do minuto, não dá erro) e até 100 registros por página (50 por padrão). Um dia tem em torno de 40 vendas.
