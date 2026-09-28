# A loja e o que os números significam

Material de leitura para quem implementa. Nada aqui é regra de código; é o que o dono sabe do negócio e o significado que cada número tem para ele. Os números têm data; os que descrevem o ERP anterior vêm da cópia de 12/09/2026.

## A loja

- Ferragens e acessórios para marceneiros, São Luís (MA). Comprada em setembro de 2026.
- Equipe: dois vendedores (Igor e Daniele), uma gerente (Erleide), Wallace no estoque e Ribamar na entrega, de moto. O dono não fica na loja.
- Abre às 7h, fecha às 18h, de segunda a sábado; sábado fecha ao meio-dia. Pico das 9h às 11h, queda no almoço, segundo pico às 17h.
- Faturamento mensal em 2026: abril (parcial) 57 mil, maio 131 mil, junho 140 mil, julho 145 mil, agosto 140 mil. Setembro projetava uns 120 mil.
- Cerca de 70% das vendas são Pix, 22% cartão, 7% dinheiro. Não há venda a prazo. Cartão cai em D+1.
- A loja não registra pedido de compra, só a nota fiscal de entrada. Não existe "estoque a chegar".
- Imposto pelo Simples: o dono lança uma estimativa fixa como conta a pagar e corrige no dia 10.
- Feriados municipais, estaduais e nacionais afetam a comparação entre meses.

## Como o cliente compra

- Mais da metade das vendas é entrega: o marceneiro pede pelo WhatsApp ou por telefone, paga (quase sempre Pix) e recebe na marcenaria pelo Ribamar. Anos atrás o cliente ia à loja; depois que os concorrentes também passaram a entregar, ele escolhe pelo preço e pelo atendimento, não pela distância.
- A loja nasceu de outra que fechou; a equipe e a carteira vieram de lá. Marceneiro compra com constância: os ativos compram toda semana, a cada quinze dias ou até todo dia.
- Base em setembro de 2026: entre 300 e 400 clientes comprando, e 575 leads no CRM do ERP ("Carteira antiga SNK"), marcenarias que nunca compraram da loja e talvez nunca tenham recebido contato.
- Duas frentes de venda em andamento, fora do Kaizen: (1) o Ribamar visita os clientes que conhece da rota antiga, com um folheto de produtos curva A a preço atrativo, e coleta nome, telefone e localização; (2) os leads recebem ligação e WhatsApp, e o andamento fica no CRM do ERP (etapa, status, próximo contato, observação). O Kaizen lê o CRM; não escreve nele.
- Dois números de WhatsApp em paralelo: o antigo, cujo chip se perdeu e pode ser reativado por outra pessoa a qualquer momento, e um novo, que vai sendo povoado. Não há troca: os dois ficam ativos até o antigo cair.
- A venda de balcão vai para o Consumidor Final (código 999007). Por isso ele fica fora de todo número por cliente: ativo, atrasado, sumido, retenção, dossiê, mapa, entrega.

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
- **Dia útil**: segunda a sábado, menos os feriados cadastrados no Kaizen.
- **Projeção do mês**: realizado até ontem mais, para cada dia útil que falta, a média das últimas 8 semanas do mesmo dia da semana.
- **Ritmo do vendedor**: (realizado ÷ meta) ÷ (fração de dias úteis já decorridos). Acima de 1, está adiantado; abaixo, atrasado. Não é projeção.
- **Curva ABC**: produtos ordenados pelo líquido acumulado no período; A até 80%, B até 95%, C o resto; o produto que atravessa o corte cai na classe de baixo. Existe por valor e por quantidade; em empate de quantidade, desempata por valor.
- **Giro**: quantidade vendida nos últimos 90 dias ÷ estoque médio. **Cobertura**: dias que o estoque atual dura no ritmo de venda dos últimos 90 dias.
- **Encalhe**: produto com estoque positivo e nenhuma venda em 90 dias, com carência de 60 dias desde a primeira entrada para produto novo. Não depende da classe ABC.
- **Ruptura**: produto que vendeu no período e está com estoque zero ou negativo.
- **Conta a pagar**: parcela com vencimento e valor em aberto. **Folga em 7 e 30 dias**: saldo do banco digitado menos o que vence nesse prazo. Data de liquidação é a da baixa no ERP, que costuma vir depois do pagamento.
- **Quebra de caixa**: informado − calculado, por turno e por forma (dinheiro, Pix, crédito e débito; a linha de troca e devolução fica fora). O recontado não entra: na Link ele era digitado depois de o operador ver a resposta do sistema. O ERP atual nem tem esse campo.
- **Vigia**: cada indicador tem uma régua (por exemplo, folga em 7 dias menor que zero). Quando cruza, o dono recebe uma frase.

## Relacionamento, mapa e entregas

Números das Fases 7 a 12. Todos são por cliente e deixam de fora o Consumidor Final (999007). "Compra" é venda válida; "dias sem comprar" conta da última venda válida até hoje. Os valores entre parênteses são as réguas iniciais, que o dono muda no app.

- **Cliente**: pessoa do cadastro com pelo menos uma venda válida desde abril. **Lead**: registro do CRM do ERP sem venda. Vira cliente na primeira venda válida, ligado pelo `idPessoa` do lead ou, se não houver, pelo telefone.
- **Ativo no mês**: pelo menos uma venda válida no mês. **Clientes ativos** é a contagem.
- **Intervalo normal**: mediana, em dias, dos intervalos entre as últimas 6 compras do cliente. Exige pelo menos 3 compras; com menos, o cliente não tem intervalo e só pode aparecer como sumido.
- **Atrasado**: dias sem comprar maior que o intervalo normal × 1,5 (1,5), sem ter chegado a sumido.
- **Sumido**: mais de 60 dias sem comprar (60). O cliente é atrasado ou sumido, nunca os dois.
- **Orçamento parado**: orçamento (`OC`) em aberto no ERP há mais de 2 dias úteis (2), que não virou venda nem foi cancelado.
- **Compra incompleta**: o cliente comprou hoje ou ontem, e ficou de fora um produto que apareceu em pelo menos 3 das suas últimas 5 compras (3 de 5), sempre junto de algum produto da compra de agora.
- **Valor em risco**: realizado do cliente nos últimos 90 dias ÷ 3, ou seja, o que ele compra num mês típico.
- **Lista do dia**: atrasados, sumidos, orçamentos parados e compras incompletas da carteira do vendedor, nessa ordem de motivo e, dentro de cada motivo, por valor em risco, do maior para o menor; no máximo 10 nomes (10). "Falei" tira o nome da lista por 7 dias (7) e grava uma anotação.
- **Retenção do mês**: dos ativos no mês anterior, a parte que também foi ativa neste mês.
- **Cliente novo**: a primeira venda válida da história do cliente cai neste mês. **Veio de lead** quando existe lead do CRM ligado a ele.
- **Ticket médio**: realizado ÷ número de vendas válidas. **Itens por venda**: média de produtos distintos por venda válida.
- **Margem** de um item: líquido do item − custo do item gravado na venda × quantidade. Usa o custo do momento da venda, que a API entrega com o item, e não o custo atual do cadastro. A margem de cliente, produto, vendedor, região ou mês é a soma dos itens. Item com custo zero entra com margem igual ao líquido e aparece sinalizado.
- **Curva ABC de clientes**: o mesmo corte dos produtos (A até 80%, B até 95%, C o resto), sobre o realizado dos últimos 90 dias.
- **RFV**: recência = dias sem comprar; frequência = vendas válidas nos últimos 90 dias; valor = realizado nos últimos 90 dias. Cada um é alto, médio ou baixo pelos terços dos clientes ativos nos últimos 90 dias.
- **Tendência** do cliente: realizado dos últimos 90 dias comparado com os 90 dias anteriores.
- **Localização**: latitude e longitude guardadas no Kaizen, com a origem (automática pelo endereço, ou confirmada por quem e quando). O campo de coordenada do ERP veio vazio na importação e o Kaizen não escreve nele.
- **Região**: polígono com nome, desenhado pelo dono. O cliente pertence à região que contém o ponto dele; fora de todas, fica "sem região". Os campos de região do ERP (`idRegiao`, `areaMapa`) não são usados.
- **Concorrente mais próximo** de um cliente: o de menor distância em linha reta.
- **Região nossa**: a loja está mais perto que qualquer concorrente para mais da metade dos clientes ativos dela, e não há concorrente dentro do polígono. **Disputada**: tem cliente ativo, mas não é nossa. **Vazia**: nenhum cliente ativo.
- **Lacuna**: região vazia com leads, ou cliente ativo que é o único ativo da região dele.
- **Viagem**: uma saída do entregador com uma ou mais vendas. **Parada**: uma venda dentro da viagem, com resultado entregue ou não entregue e o motivo. **Entrega**: venda marcada como entrega no ERP ou incluída numa viagem, o que vier primeiro.
- **Custo por viagem**: valor em reais digitado pelo dono, o que uma saída do Ribamar custa (folha, combustível, manutenção), revisto quando ele quiser. **Custo por entrega**: custo da viagem ÷ paradas entregues nela. **Margem descontada a entrega** de uma região: margem das vendas entregues nela − custo dessas entregas.
- **Densidade** de uma região: clientes ativos nela e média de paradas entregues por viagem que passou por ela.

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