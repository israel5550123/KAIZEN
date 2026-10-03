# Kaizen: plano "vendas primeiro"

Versão final, 03/10/2026. Foi escrita a partir de três fontes:
- o pedido do dono do mesmo dia;
- uma varredura do projeto em quatro frentes: a API e os dados do ERP; o código, o banco e a publicação; o objetivo, as telas e as decisões; os dados reais;
- duas críticas ao primeiro rascunho, uma de viabilidade e uma de valor para o dono, conferidas uma a uma no repositório.

Ninguém alterou o repositório, o servidor, o ERP ou algum banco. Ninguém leu dado novo do ERP ou do banco do Kaizen, porque esta sessão não tem acesso. Todo número abaixo vem dos relatórios das fases. As marcas:
- **(a confirmar)**: ninguém mediu ainda;
- **(proposta)**: é sugestão nossa, e já vale se o dono não mudar.

Como ler:
- **O dono** lê a seção 1, a seção 2, a tabela "Resumo das etapas" da seção 4 e a seção 6, que começa por "O que fazer hoje". O resumo de uma página está em `docs/fases/FASE-V-resumo.md`.
- **Quem constrói** lê tudo, inclusive os blocos "Para quem constrói". As referências a arquivos estão nesses blocos e na lista de fontes do fim.

---

## 1. O problema e o resultado que conta

### O problema, nas palavras do dono

> "O vendedor não sabe onde o dinheiro está na mesa. Ele fica perdido: não sabe as informações dos clientes da carteira dele, qual cliente está comprando e qual não está, quem não está comprando há quanto tempo, e o que não está comprando."

E ainda: "se o vendedor vende mais, destrava todo o resto".

### O que já existe para atacar isso

O Kaizen já guarda a base inteira para responder a essas perguntas. **Ainda não mostra nada ao vendedor.**

- **Vendas item a item desde 11/04/2026**, com cliente, produto, vendedor, dia e hora:
  - na Link, de 11/04 a 25/09: 5.271 vendas válidas, 14.606 linhas de item e R$ 737.124,85 vendidos;
  - no ERP novo, desde 28/09: 6 dias de operação até hoje, com cerca de 40 vendas por dia.
- **Clientes:** 343 códigos de cliente aparecem nos documentos da Link, contando vendas canceladas e orçamentos, e já estão ligados ao cadastro novo. Um deles é o Consumidor Final. O dono estima de 300 a 400 clientes comprando. O número exato de clientes com venda válida é a primeira medida da etapa 0.
- **Cadastro:** 451 pessoas e 1.029 produtos.
- **Por vendedor**, a Fase 4 já calcula todo dia o realizado do dia e do mês, as vendas, a meta e os clientes atendidos.

O que falta:
- **Não há site nem login.** Nenhuma tela está no ar.
- **O telefone do cliente não é copiado do ERP.**
- **Não existe carteira.** O ERP não guarda qual cliente é de qual vendedor, então o dono distribui a carteira no Kaizen.

### O resultado que conta

**O vendedor abre o Kaizen de manhã e sabe para quem ligar e o que oferecer.** Para saber se isso acontece, seis números, todos calculados pelo próprio Kaizen:

| Número | Como se mede | Onde aparece | Ponto de partida |
| --- | --- | --- | --- |
| **Falei** | contatos que o vendedor registrou na lista do dia, por dia e por semana | lista do dia (etapa 6) | zero hoje |
| **Clientes em campanha** | clientes exportados para o disparo de WhatsApp, por semana. Fica separado do "Falei": exportar não é falar com o cliente, porque o disparo pode não sair ou o número pode não ter WhatsApp | histórico de exportações (etapa 3) | a campanha da cola (Entrega 0) |
| **Retorno das campanhas** | dos clientes exportados, quantos compraram o produto da campanha nos 7 dias seguintes, e o R$ | histórico de exportações (etapa 3) | a campanha da cola (Entrega 0) |
| **Positivação da carteira** | dos clientes da carteira do vendedor, quantos compraram pelo menos uma vez no mês, por exemplo "82 de 170" | carteira (etapa 3) e Minhas vendas (etapa 5) | setembro, recalculado com a carteira nova |
| **Venda contra a meta** | realizado do mês, meta, quanto falta e quanto vender por dia útil | Minhas vendas (etapa 5) | outubro, quando o dono gravar as metas de Igor e Daniele, que vieram em branco |
| **Clientes recuperados** | clientes atrasados ou sumidos no fim do mês anterior que voltaram a comprar no mês | Minhas vendas (etapa 5) | o primeiro mês com a carteira |

**"Em uso", a condição do dono para voltar às telas dele (proposta).**
- **Primeira entrega:** numa semana inteira, de segunda a sábado, Igor e Daniele entraram no Kaizen, cada um, em pelo menos 4 dos 6 dias úteis, e saiu pelo menos uma campanha exportada.
- **Depois da lista do dia (etapa 6):** além disso, cada um marcou "Falei" em pelo menos 4 dias da semana.

O Kaizen grava cada entrada e mostra "dias com acesso nesta semana" na tela Pessoas e acesso. Quando o número for alcançado, voltam as telas do dono.

---

## 2. O que o vendedor vai ver

São quatro telas, mais a de entrada, todas no computador. Pela decisão do dono de 02/10, gerente e vendedores usam só o computador. As telas aparecem abaixo na ordem em que chegam.

**O dono vê as mesmas telas.** No alto de cada uma há um seletor: "Todos", "Igor", "Daniele" e "Sem carteira". O que o vendedor vê de cada cliente e de cada número é o mesmo que o dono vê ao escolher aquele vendedor. A gerente (Erleide) vê como o dono, mas não mexe em carteira, prioridades, metas nem acessos (proposta).

Valem as regras de todas as telas que já estão escritas:
- a tela não calcula: o número chega pronto do servidor;
- "Atualizado às 14h05" em toda tela;
- o Consumidor Final nunca aparece;
- **o vendedor não vê percentual**: nas telas dele, tudo é R$ e contagem de clientes. É regra do `OBJETIVO.md`;
- o vendedor não vê os números dos colegas (proposta).

### Tela 1: Minha carteira, com os filtros e a exportação (etapa 3, a primeira entrega útil)

É a carteira inteira numa tabela. **Também é onde se montam as campanhas.** Até a lista do dia existir (etapa 6), é a tela inicial do vendedor.

- **Colunas:**
  - nome;
  - telefone;
  - situação: em dia, atrasado, sumido, poucas compras ou nunca comprou;
  - última compra ("há 12 dias");
  - de quanto em quanto tempo compra ("a cada 9 dias");
  - compras em 90 dias;
  - R$ comprado em 90 dias;
  - valor em risco por mês;
  - quantos produtos deixou de comprar.
- **Filtros, que se combinam:**
  - situação;
  - dias sem comprar, de N até M, com prazo livre;
  - **comprou ou não comprou [produtos] nos últimos [N] dias, ou desde abril.** O botão "+ outra condição de produto" junta duas condições. Os produtos se escolhem por busca na descrição ("cola contato"), por grupo ou por marca. A busca marca todos os produtos encontrados, e o vendedor desmarca o que não quer;
  - comprou ou não comprou neste mês, que é a positivação;
  - bairro;
  - com ou sem celular válido;
  - valor em risco a partir de R$ X.
- **Rodapé:** "N clientes neste filtro · M com celular válido · R$ X por mês em risco".
- **Botão "Exportar para o disparo":**
  - gera um arquivo Excel no formato da planilha de exemplo que o dono vai mandar, com nome e celular;
  - leva só quem tem celular válido, e diz quantos ficaram de fora "sem celular válido";
  - cada exportação fica registrada: quem, quando, qual filtro, quantos nomes e quais clientes.
- **Histórico de exportações, com o retorno.** Exemplo, com números inventados: "Cola de contato, 06/10: 48 exportados; 9 compraram cola até 13/10, R$ 1.230".
- **O nome do cliente** vira link para o dossiê quando o dossiê chegar, na etapa 4. Antes disso, não é clicável.
- **Para o dono:**
  - a coluna e o filtro de vendedor, com "Sem carteira";
  - a contagem por vendedor ("Igor: 171 · Daniele: 140 · Sem carteira: 33", números de exemplo);
  - marcar vários clientes e "Passar para…": **é aqui que ele distribui a carteira**;
  - "Aceitar a sugestão", que passa cada cliente para quem mais vendeu a ele em 90 dias;
  - o registro de cada mudança: quem mudou, quando, de quem para quem.

**O caso real do dono, passo a passo:**
1. O Igor abre "Minha carteira".
2. Escolhe "Não comprou", busca "cola contato" e escolhe "7 dias". Se quiser, junta "comprou alguma coisa nos últimos 90 dias".
3. A tabela mostra os clientes e quantos têm celular válido.
4. Ele clica em "Exportar para o disparo" e recebe o arquivo pronto para a ferramenta.
5. A campanha da cola sai só para quem não comprou.
6. Sete dias depois, o histórico de exportações diz quantos desses clientes compraram cola, e quanto.

**A venda casada por campanha, já na primeira entrega:**
1. O filtro é "comprou cola de contato nos últimos 7 dias" e "não comprou solvente nos últimos 7 dias".
2. O vendedor exporta.
3. A campanha oferece o solvente, porque a cola suja o MDF.

### Tela 2: Dossiê do cliente (etapa 4)

É a ficha que o vendedor lê antes de ligar.

- **Cabeçalho:**
  - nome e apelido;
  - telefone, que abre o WhatsApp Web;
  - bairro e vendedor da carteira;
  - situação e última compra;
  - de quanto em quanto tempo compra;
  - compras e R$ em 90 dias;
  - valor em risco.
- **O que compra:** os produtos que ele leva sempre, com quantas vezes e a última data.
- **O que deixou de comprar:** os produtos que ele levava com frequência e parou de levar, embora continue comprando outras coisas. Exemplo: "fita de borda 22 mm: levava a cada 15 dias, última vez há 41".
- **Mais vendidos da loja que ele nunca levou:** até 10 produtos da curva A, com o número de vendas da loja em 90 dias.
- **Últimas compras:** data, itens e valor.
- **Contatos:** as campanhas em que ele entrou e, a partir da etapa 6, os "Falei".
- **O que oferecer** chega na etapa 7, em dois blocos separados pela origem:
  - **Complementares**, do cadastro do dono, com o motivo. Exemplo: "Comprou cola de contato → oferecer solvente e estopa: a cola suja o MDF".
  - **Costuma sair junto**, das vendas da loja, com o número. Exemplo inventado: "das 120 vendas com cola de contato, 54 levaram fita de borda". O dono vê também a parte em %.
- **O vendedor não vê** margem nem percentual. Se abrir um cliente de outra carteira, vê "Este cliente é da carteira de Daniele".

### Tela 3: Minhas vendas (etapa 5)

- **Hoje:** quanto já vendeu e quanto precisa vender hoje. Exemplo: "Hoje: R$ 1.900 dos R$ 3.085".
- **Mês:**
  - realizado;
  - meta;
  - quanto falta;
  - dias úteis que faltam, contando hoje;
  - **"Para bater a meta: R$ X por dia útil".**
  - Exemplo, com números inventados: meta de R$ 75.000, vendido até ontem R$ 44.150, faltam 10 dias úteis contando hoje. Resultado: R$ 3.085 por dia útil.
- **Vendas no mês e clientes atendidos.** A Fase 4 já calcula os dois.
- **Positivação:** "82 dos 170 clientes da sua carteira já compraram em outubro; faltam 88" (números de exemplo). Clicar leva à carteira filtrada por "não comprou neste mês".
- **Clientes recuperados no mês.**
- **Gráfico simples:** o realizado acumulado contra a linha da meta.
- **Aviso, enquanto a conferência do caixa estiver aberta:** "As vendas por vendedor vêm do vendedor escolhido no caixa."
- **Para o dono:** o seletor de vendedor e a loja.
- **Para o vendedor:** sem percentual e sem ritmo.

### Tela 4: Para contatar hoje, a lista do dia (etapa 6)

A partir da etapa 6, é a tela inicial do vendedor. Ela responde: **"com quem eu falo hoje e o que eu ofereço?"**

- **Resumo:** "10 nomes hoje · R$ 6.400 por mês em risco nesta lista · 3 já com Falei" (números de exemplo).
- **Um cartão por cliente**, na ordem de prioridade que o dono escolheu. Cada cartão tem:
  - o nome;
  - o telefone, que abre o WhatsApp Web;
  - o motivo;
  - a frase do que fazer, com o produto a oferecer;
  - o valor em risco;
  - o botão "Falei".
- **Frases de exemplo:**
  - "Ligar: compra a cada 7 dias e está há 12 sem comprar."
  - "Oferecer cola de contato 14 kg: ele levou em 4 das últimas 5 compras e não levou ontem."
  - "Deixou de levar fita de borda: levava a cada 15 dias, a última foi há 41."
  - "Oferecer solvente e estopa: levou cola de contato ontem e não levou; a cola suja o MDF." Essa só a partir da etapa 7.
- **"Falei"** abre um campo opcional, "o que ficou combinado?". Ele faz o papel da anotação nesta fase. O nome desce para "Falei hoje" e sai da lista por 7 dias.
- **Marca "comprou hoje":** quando o cliente da lista compra no dia, a leitura de hora em hora marca o cartão.
- **Filtros:** um botão por motivo (Atrasado, Faltou levar, Deixou de comprar, Não comprou no mês, Sumido).
- **Para o dono:** o seletor de vendedor e o andamento de cada um ("Igor: 4 de 10 com Falei").
- **Vazios:**
  - "Sua carteira ainda não foi distribuída pelo Israel."
  - "Nenhum cliente da sua carteira precisa de contato hoje."

### Telas só do dono

| Tela | O que faz | Etapa | Situação hoje |
| --- | --- | --- | --- |
| **Pessoas e acesso** (P1) | quem entra, com qual perfil (dono, gerente, vendedor) e a qual funcionário do ERP cada login se liga, que é o que faz o vendedor ver só a carteira dele. Mostra também o último acesso e os "dias com acesso nesta semana" | 2 | descrita na `TELAS.md`, sem prompt |
| **Metas e feriados** (K2) | a meta da loja e de cada vendedor, digitada no app, sem comando no banco | 5 | prompt pronto |
| **Prioridades da lista** (nova) | põe os motivos em ordem, liga e desliga cada um, muda as réguas e o número de nomes por dia, e escolhe a ordem dentro de cada motivo: valor em risco, dias sem comprar ou compras em 90 dias | 6 | não existe |
| **Famílias e complementares** (nova) | agrupa produtos em famílias ("Cola de contato": os vários tamanhos), liga família a família com um motivo e mostra as duplas que saem das vendas, para o dono aceitar ou não | 7 | não existe |

As quatro também são desenhadas pelo dono no Claude Design, como as outras. Foi a condição dele, em 02/10, para trocar o Flutter pela web. Se quiser poupar tempo, ele pode liberar Prioridades e Complementares para saírem direto das peças do Design System (seção 6, bloco B).

---

## 3. De onde vem cada número (para quem constrói)

As escolhas que o dono pode querer mudar estão listadas na seção 6, bloco B, e todas entram no `docs/DECISOES.md` na etapa 0. As definições novas entram no `docs/LOJA.md`, marcadas como proposta, porque o `OBJETIVO.md:47` manda quem implementa usar a definição de lá, e não uma própria.

### As quatro origens

| Origem | O que é | Exemplos |
| --- | --- | --- |
| **Já está no Kaizen** | vendas item a item das duas fontes, cadastro de pessoa e produto (com grupo, seção, subgrupo e marca), vendedores, metas, feriados, respostas da Fase 4 | `kaizen.documento_item` com `kaizen.documento_papel`; `kaizen.pessoa`; `kaizen.produto`; `vendas.vendedores[]` em `kaizen.resposta` |
| **Passa a ler do ERP, só leitura** | colunas a mais na consulta de cadastros, que já roda de hora em hora, **sem chamada nova à API** | celular, fone, fone comercial, e-mail e apelido do cliente. Os nomes das colunas e a forma da tabela (uma linha por pessoa, ou várias, como o endereço) estão **(a confirmar)** pela consulta 1 da etapa 0 |
| **Passa a ser digitado no Kaizen** | o que o ERP não guarda | logins e perfis, carteira, "Falei", prioridades, famílias e complementares |
| **Passa a ser calculado** | regras sobre o que já está no Kaizen, gravadas pela rotina ou calculadas pelo servidor no pedido | os indicadores abaixo |

**Por que a carteira é digitada.** O cadastro de cliente da API do ERP não tem vendedor responsável. O vendedor só existe no item de cada venda e, como "representante", em cada pedido. O `OBJETIVO.md` (linhas 23 e 199) já decidiu que a carteira é digitada pelo dono no Kaizen. A consulta 1 confere se o banco do ERP guarda algo parecido **(a confirmar)**.

### Os indicadores

Regras de base, do `docs/LOJA.md` (linhas 58 a 75):
- "compra" é venda válida;
- o Consumidor Final (999007) fica fora;
- as réguas entre parênteses são as iniciais, e o dono muda.

Uma mudança em relação à Fase 4: **o histórico de compras por cliente inclui o item sem vendedor**. A visão `kaizen.venda_item` deixa esse item de fora (`sql/migracoes/012_regras.sql:75`), como o relatório 154 faz para a meta. Para saber se o cliente comprou cola, porém, o item conta. O efeito tende a zero, porque o caixa exige vendedor desde 25/09, mas não foi medido.

| Indicador | O que é, em uma frase | Regra | Onde está a definição |
| --- | --- | --- | --- |
| **Cliente da carteira** | o cliente que o dono pôs com aquele vendedor | linha em `kaizen.carteira`. Sem linha, "Sem carteira". Qualquer pessoa do cadastro pode entrar, mesmo sem compra | nova, vai ao `LOJA.md` |
| **Celular válido** | o número para onde vai o disparo | só os dígitos. Vale se ficar 55 + DDD + 9 dígitos começando por 9. Um número de 9 dígitos começando por 9, sem DDD, ganha o 98 de São Luís. O fone e o fone comercial só entram se tiverem essa mesma forma de celular. O resto é "sem celular válido". **O Kaizen não sabe se o número tem WhatsApp**, e nenhuma tela diz "com WhatsApp" | nova |
| **Última compra / dias sem comprar** | quando foi a última venda válida para o cliente | maior dia de compra; dias sem comprar = hoje − esse dia | `LOJA.md:58` |
| **De quanto em quanto tempo compra** (intervalo normal) | o ritmo habitual do cliente | mediana dos intervalos entre as últimas 6 compras, com pelo menos 3 compras | `LOJA.md:62` |
| **Compras em 90 dias** | quantas vezes ele comprou | vendas válidas nos últimos 90 dias, que é a "frequência" do RFV. O projeto tem duas "frequências" (`LOJA.md:62` e `:74`); as telas usam os dois nomes acima e nunca a palavra solta | `LOJA.md:74` |
| **Situação** | em dia, atrasado, sumido, poucas compras ou nunca comprou | atrasado: dias sem comprar > 1,5 × intervalo normal (1,5); sumido: mais de 60 dias (60); poucas compras: menos de 3 compras e até 60 dias; nunca comprou: na carteira, sem compra desde abril | atrasado e sumido no `LOJA.md:63-64`; os outros dois são novos |
| **Valor em risco** | o que o cliente costuma comprar num mês | R$ dos últimos 90 dias ÷ 3. Para o sumido há mais de 90 dias, que pela regra daria zero, vale o R$ dos 90 dias antes da última compra ÷ 3 | `LOJA.md:67`, com o acréscimo novo |
| **Produto habitual** | o produto que o cliente leva sempre | presente em pelo menos 3 compras diferentes do cliente desde abril (3) | nova |
| **Deixou de comprar** | o produto habitual que ele parou de levar, embora continue comprando | o tempo desde a última compra do produto passou de 1,5 vez o intervalo do cliente para aquele produto (1,5), e o cliente comprou outra coisa depois. É a régua do "atrasado" aplicada a cada produto | nova |
| **Mais vendidos que nunca levou** | o que a loja mais vende e ele nunca comprou | produtos da curva A por valor nos últimos 90 dias (a regra de compras da Fase 4) sem nenhuma compra do cliente desde abril; os 10 com mais vendas na loja | `OBJETIVO.md:108` |
| **Comprou / não comprou X nos últimos N dias** | o filtro das campanhas | existe ou não existe compra do cliente com algum dos produtos escolhidos, de hoje − (N − 1) até hoje. "Últimos 7 dias" em 03/10 vai de 27/09 a 03/10. "Desde abril" olha toda a história | nova. A tela diz "atualizado às HHh": o dado chega com até 1 hora de atraso |
| **Positivação da carteira** | quantos clientes da carteira compraram no mês | clientes da carteira com pelo menos uma compra no mês, sobre os clientes da carteira hoje, mostrado como contagem ("82 de 170"). Conta a compra do cliente seja quem for o vendedor gravado | nova. O termo não existia no projeto |
| **Costuma sair junto** | o produto Y que aparece muito nas vendas que têm X | conta as vendas válidas desde 11/04, inclusive as de balcão, porque a conta é por venda e não por cliente. Vale com os dois limites abaixo | nova |
| **Complementar** | a ligação que o dono cadastra, com o motivo | família → família em `kaizen.complementar`. A sugestão segue até 2 níveis (cola → fita de borda → lima e estilete) e diz o caminho | nova |
| **Faltou levar** | o cliente comprou X e não levou o que costuma ir junto | nos últimos 2 dias úteis (2), o cliente comprou X e não levou: um produto que esteve em 3 das suas últimas 5 compras (a "compra incompleta" do `LOJA.md:66`); ou, a partir da etapa 7, um complementar de X ou um produto que costuma sair junto com X. Não conta se o produto que faltou foi comprado nos 30 dias anteriores (30) | `LOJA.md:66`, ampliada |
| **R$ por dia útil para a meta** | quanto vender por dia útil para bater a meta | (meta − realizado até ontem) ÷ dias úteis de hoje até o fim do mês, contando hoje. "Meta de hoje" é esse mesmo valor, e a tela mostra quanto já se vendeu dele. Em dia sem expediente, conta a partir do próximo dia útil. Com a meta batida: "Meta batida: R$ X acima". **Uma regra só, para a loja e para o vendedor** | nova; detalhe abaixo |
| **Lista para contatar** | até 10 clientes da carteira (10), um motivo cada | a ordem dos motivos está abaixo; "Falei" tira o nome por 7 dias (7) | `LOJA.md:68`, com motivos novos |
| **Falei** e **clientes em campanha** | dois números, nunca somados | contagens em `kaizen.contato` e em `kaizen.exportacao_pessoa` | novas |
| **Retorno da campanha** | quantos exportados compraram o produto da campanha | dos clientes de uma exportação, os que compraram algum produto do filtro nos 7 dias seguintes, com o R$ | nova |
| **Clientes recuperados** | quem estava parado e voltou | clientes atrasados ou sumidos na foto do último dia do mês anterior que compraram neste mês | nova |
| **Dias com acesso** | a medida de uso | dias da semana em que a pessoa entrou, pelo registro de cada entrada | nova |

**A regra do "R$ por dia útil".** O exemplo da V1, que o dono está desenhando agora, faz outra conta: R$ 57.600,00 ÷ 9 = R$ 6.400,00, com "17 de 26 dias úteis, faltam 9". Ali o realizado inclui a venda parcial de hoje, e hoje não conta como dia que falta (`docs/app/dados-exemplo/dados-exemplo.md:186-187`; `docs/app/prompts/V1-vendas-desvio.md:32`). Com essa conta, no último dia útil a divisão seria por zero.

A regra proposta resolve os dois pontos:
- não conta o dia de hoje duas vezes;
- no último dia útil, divide por 1.

Com os números da V1 (até ontem R$ 88.300,00, faltam 10 dias úteis contando hoje), dá R$ 6.170,00 por dia, e "hoje: R$ 4.100,00 dos R$ 6.170,00". A conta da loja e a do vendedor passam a ser a mesma. A V1 se alinha na conferência das pranchas, que o dono já marcou para o fim (`docs/DECISOES.md:122`).

**Os dois limites do "costuma sair junto":**
1. X e Y saíram juntos em pelo menos 5 vendas (5).
2. A parte das vendas de X que levou Y é pelo menos o dobro da parte de Y na loja toda (2). Exemplo inventado: 45% das vendas com cola levaram fita, contra 8% de todas as vendas. O dobro tira os produtos que saem em qualquer venda.

**A ordem inicial dos motivos da lista (proposta), e quando cada um chega.** Cada cliente aparece uma vez, pelo primeiro motivo que se aplica.

| Ordem | Motivo | Por que nesta posição | Chega na etapa |
| --- | --- | --- | --- |
| 1 | **Atrasado**: cliente com intervalo que passou de 1,5 vez o intervalo e ainda não sumiu | é o dinheiro mais fácil de recuperar | 6 |
| 2 | **Faltou levar** | é a venda casada, e só vale por poucos dias | 6, só com "3 das últimas 5"; a etapa 7 acrescenta complementares e "costuma sair junto" |
| 3 | **Deixou de comprar um produto habitual** | ele compra aquele produto em outro lugar | 6 |
| 4 | **Não comprou neste mês**: comprou nos últimos 90 dias e nada desde o dia 1, a partir do dia 10 do mês (10) | é a positivação | 6 |
| 5 | **Sumido**: mais de 60 dias sem comprar | é o mais difícil de recuperar | 6 |
| 6 | **Orçamento parado**: orçamento há mais de 2 dias úteis sem virar venda | fica desligado até se confirmar que o Kaizen sabe quando um orçamento virou venda **(a confirmar)** | desligado |

Dentro de cada motivo, a ordem começa pelo maior valor em risco. O dono pode trocar por "dias sem comprar" ou por "compras em 90 dias".

Isso muda o `OBJETIVO.md:81-88`, que fixa "quatro motivos, nesta ordem". O texto proposto está no apêndice A.

**Quando a lista é montada (proposta).** Na leitura das 22h, para o dia útil seguinte, e fica gravada:
- ela já está pronta quando a loja abre, antes da primeira leitura da hora, às 8h;
- não muda durante o dia: as leituras de hora em hora só marcam "comprou hoje";
- a lista de um dia passado continua igual à que o vendedor viu.

Isso responde à pergunta 29 da `TELAS.md`.

### Para quem constrói: tabelas, regras e servidor (proposta)

**Leitura do ERP:**
- `kaizen.pessoa` ganha `celular`, `fone`, `fone_comercial`, `email` e `apelido`.
- `sql/erp/cadastros.sql` e `sql/erp/colunas-esperadas.txt` crescem junto. Se uma coluna esperada sumir, a leitura inteira para (`tradutor/execucao.mts:196-199`).
- Se o contato ficar numa tabela com várias linhas por pessoa, como o endereço (`sql/erp/cadastros.sql:35-41`, `flagprincipal`), a regra de qual linha usar entra no `DECISOES.md`.
- Nenhuma chamada nova à API. Ler pelos endpoints, um registro por vez, levaria cerca de 24 minutos para as 451 pessoas, a 19 chamadas por minuto.

**O que se digita.** Tudo é gravado pela API, com quem fez e quando:
- `kaizen.acesso`: e-mail, nome, perfil, funcionário do ERP, ativo.
- `kaizen.acesso_registro`: quem entrou e quando, para os "dias com acesso".
- `kaizen.carteira`: pessoa, vendedor, desde, por quem. As mudanças vão em `kaizen.carteira_mudanca`.
- `kaizen.exportacao`: quem, quando, filtro, produtos do filtro, quantos. E `kaizen.exportacao_pessoa`: quem foi exportado.
- `kaizen.contato`: pessoa, quem, quando, tipo ("falei"), nota.
- `kaizen.prioridade`: motivo, ordem, ligado, régua, ordem dentro do motivo.
- Na etapa 7: `kaizen.familia`, `kaizen.familia_produto` e `kaizen.complementar` (origem, destino, motivo).

**O que a rotina calcula:**
- `kaizen.cliente_compra`: uma linha por cliente, venda e produto, com dia, quantidade e valor.
  - Só vendas válidas, sem o 999007, **com** o item sem vendedor.
  - Lê `kaizen.documento_item` com `kaizen.documento_papel`, como a regra de vendas já faz para "sem vendedor" (`sql/regras/vendas.sql:27-36`).
  - Regravada a cada leitura; são cerca de 15 mil linhas.
  - Tem índice em (pessoa, produto, dia).
  - **Os filtros e o retorno das campanhas leem dela, e não de `kaizen.venda_item`.** A `venda_item` é uma visão sobre outra visão, com o dia calculado, sem índice possível. Juntar essas visões já levou o Postgres a passar de 2 minutos por dia (`sql/regras/vendas.sql:10-11`).
- `kaizen.cliente_dia`: a foto de cada cliente num dia, com última compra, compras e R$ em 90 dias, intervalo, situação, valor em risco e "comprou no mês".
  - A foto de hoje é regravada de hora em hora.
  - Às 22h, a foto do dia fica congelada. **O passado não se recalcula toda noite.** Isso protege o tempo da noite (1 min 25 s na VPS hoje) e o da suíte de testes (de 6 a 11 minutos, rodada inteira a cada commit).
  - O passado desde abril é preenchido uma vez, por comando, quando a tabela nasce.
- `kaizen.cliente_produto`, às 22h: pessoa, produto, compras, última, intervalo, habitual, deixou de comprar.
- `kaizen.lista_dia`, às 22h (etapa 6): dia, vendedor, pessoa, motivo, ordem, frase, valor em risco.
- `kaizen.comprados_juntos`, às 22h (etapa 7): produto A, produto B, vendas juntas e as partes.
- As regras ficam num arquivo novo, `sql/regras/clientes.sql`, no molde de `sql/regras/vendas.sql`.
- **Uma tabela própria, e não `kaizen.resposta`.** A `resposta` aceita só as perguntas `vendas`, `compras` e `financeiro` (`sql/migracoes/013_resposta.sql:4`), e uma tabela por cliente se filtra melhor do que um JSON.

**O que se calcula na hora do pedido.** Os filtros da carteira, com N dias e produtos livres, são consultas parametrizadas sobre `kaizen.cliente_compra` e `kaizen.cliente_dia`. A meta é menos de 1 s, medida no banco do PC com os dados reais. Quem calcula é o servidor; a tela continua sem calcular.

**O servidor web:**
- `api/`: TypeScript, o mesmo Node e o mesmo `pg` do tradutor, sem framework. Serve a API e as telas.
- `app/`: as telas em HTML, CSS e JavaScript, reconstruídas a partir do HTML aprovado no Claude Design.
- **Leitura de configuração própria:** só o endereço do banco e o identificador do projeto de login. **Não lê o `MEUERP_TOKEN`**, e um teste prova que o servidor sobe sem ele. O `lerConfig` do tradutor exige o token (`tradutor/config.mts:11-12`) e não serve aqui.
- **Login pelo Firebase, escolha provisória do dono** (`docs/DECISOES.md:110`: "por enquanto"):
  - o navegador entra com Google, ou com e-mail e senha para quem não tiver conta Google;
  - o servidor confere o token com as chaves públicas do Google, sem segredo, só com o identificador do projeto;
  - o perfil e o funcionário ligado vêm de `kaizen.acesso`;
  - a conferência do login fica num módulo só, como a entrada de 02/10 prevê: se o Firebase sair, só ela e a tela de entrada mudam.
- **Filtro por perfil no servidor:** o vendedor só recebe os clientes da carteira dele, e o servidor nem entrega os outros (`docs/app/TELAS.md:484`).

---

## 4. A ordem de construção

Princípio: **a primeira coisa útil no ar o quanto antes.**
- Primeiro vem a campanha da cola desta semana (Entrega 0), sem site.
- Depois, a carteira com filtros e exportação (etapa 3), porque resolve o caso real e três das quatro partes da queixa: quem compra, quem parou, há quanto tempo e o que deixou de comprar.
- Dossiê, metas, lista do dia e venda casada vêm em seguida.

Cada etapa tem:
- **Pré-requisito:** as pranchas aprovadas pelo dono no Claude Design, ou uma ação dele. Se o pré-requisito não chegar, a etapa constrói primeiro a API e os testes, e a tela espera.
- **"Pronto quando" de quem constrói:** testes com valor de referência e, nas etapas com tela, a lista de checagem visual da Fase 5a conferida pelo auditor visual, com as capturas em 1920 × 1080 guardadas em `docs/fases/`. O `OBJETIVO.md:142` exige essa checagem para fechar fase com tela.
- **Conferência do dono:** o que depende dele ou dos vendedores. Não trava a etapa seguinte, como manda o `docs/AUTONOMIA.md:78`.
- **Revisão da branch no meio** (`docs/AUTONOMIA.md:80`) e no fim.

Ao todo são cerca de **60 tarefas**. É mais do que as 44 do primeiro rascunho, porque entraram tarefas que faltavam: o auditor visual, a imagem e os testes da publicação, o segredo do site, o acréscimo ao Design System, os dados de exemplo das telas do vendedor, as definições no `LOJA.md` e o registro de acesso. Para comparar, a Fase 2 teve 20 tarefas, e as Fases 3 e 4, 13 cada.

### Etapa 0: combinar, medir e preparar (6 tarefas, sem código de produto)

**O que se faz:**
1. **`docs/DECISOES.md`.** Entram:
   - a decisão do dono, "vendas primeiro", com as palavras dele de 03/10. Há precedente: as decisões de 02/10 valem acima do `OBJETIVO.md` até ele ser reescrito (`docs/DECISOES.md:102`);
   - as escolhas da seção 6, bloco B;
   - o "pronto quando" das etapas que o auditor de fase confere (3b e 7), porque o `OBJETIVO.md` ainda não os tem;
   - uma entrada própria para cada peça nova: as pastas `api/` e `app/`, o proxy com HTTPS, o gerador de planilha e a ferramenta de captura de tela;
   - o texto proposto para o `OBJETIVO.md` (apêndice A), que só o dono muda.
2. **`docs/LOJA.md`.** As definições novas da seção 3, marcadas como proposta.
3. **Medir a loja, só lendo, pela própria sessão no PC do dono:**
   - as consultas ao ERP, pela `ferramentas/consultar-erp.mts`, que só aceita SELECT. As seis passam na trava de só leitura (conferido pela crítica de viabilidade);
   - as consultas ao banco do Kaizen, no banco do PC, depois de uma leitura da noite local, como no ensaio da Fase 4. O passo 14 do roteiro, rodado pelo dono no banco da VPS, fica só como conferência opcional.

   O resultado vai para `docs/fases/FASE-V-medicoes.md`, com a hora de cada leitura. As consultas medem:
   - o nome das colunas de telefone e a forma da tabela de contato;
   - quantos clientes têm celular válido;
   - quantos clientes têm venda válida (sem o 999007) nas duas fontes;
   - a parte das vendas que vai para o balcão;
   - os clientes que compraram em 30, 60 e 90 dias;
   - as duplas de produtos mais vendidas juntas, e quantas passam dos limites;
   - quantos clientes entrariam hoje na campanha da cola, e quais produtos são "cola de contato";
   - quantos clientes compraram de 1, 2 ou 3 vendedores;
   - a divisão das vendas por vendedor desde 28/09.
4. **Os prompts do Claude Design**, com um livro de dados de exemplo das telas do vendedor, de contas conferidas por script, como o das telas do dono. Ordem de colagem:
   1. acréscimo ao Design System com as três peças que faltam: barra de ações para vários clientes marcados, botão de exportar arquivo e filtro por produto com prazo;
   2. correção da G1 e da G2 para o vendedor: porta de entrada e menu;
   3. Pessoas e acesso (P1);
   4. Minha carteira, nas versões vendedor e dono, com o histórico de exportações;
   5. Dossiê do cliente;
   6. Minhas vendas;
   7. Para contatar hoje;
   8. Prioridades da lista.

   O prompt de Famílias e complementares sai no começo da etapa 7, com as duplas reais já medidas.
5. **O auditor visual** (`.claude/agents/auditor-visual.md`), que o `docs/AUTONOMIA.md:120` prevê para quando houver tela.
   - A captura em 1920 × 1080 fica decidida e registrada: o Chrome sem janela, ou uma ferramenta de captura como dependência só de desenvolvimento.
   - Ele nasce na etapa 0 porque os agentes só carregam quando uma sessão abre (`docs/AUTONOMIA.md:72`). Assim, as sessões das etapas com tela já o encontram.
6. **O roteiro do dono para a manhã de publicação**, no molde de `docs/fases/FASE-2-roteiro-do-dono.md`: cada passo com onde fazer, quanto tempo leva e como saber que deu certo. Detalhe no bloco da etapa 2b.

**Pronto quando (quem constrói):**
- as entradas estão no `DECISOES.md`, e as definições, no `LOJA.md`;
- as medições estão registradas, com a hora;
- os 8 prompts e o livro de dados estão prontos, com as contas conferidas por script;
- o auditor visual e o roteiro existem.

**Conferência do dono (não trava nada):** mandar a planilha de exemplo e os e-mails de quem entra, e marcar a manhã de publicação.

**O que o dono vê:** os números reais da loja, em vez de estimativas:
- quantos clientes têm celular válido;
- quantos estão comprando, atrasados e sumidos;
- quanto do movimento é balcão;
- quais produtos saem juntos;
- quantos nomes a campanha da cola teria hoje.

### Entrega 0: a campanha da cola desta semana (1 a 2 tarefas, sem site)

**O que se faz.** Uma sessão no PC do dono:
1. roda uma consulta só de leitura no ERP: clientes do cadastro (sem o 999007, sem fornecedor que não é cliente, ativos) com celular válido que não compraram nenhum produto com "cola" e "contato" na descrição de 27/09 até hoje.
   - O ERP novo tem todas as vendas dessa janela: 26/09 não teve venda, e 27/09 foi domingo.
   - Se o dono quiser só quem já comprou alguma vez, a sessão cruza com a história do banco do PC.
2. grava o arquivo no formato da planilha de exemplo. Sem ela, um .xlsx com as colunas Nome e Telefone, com o telefone gravado como texto, para o Excel não estragar o número.
   - O arquivo fica no PC, fora do repositório.
   - A lista dos códigos dos clientes exportados, sem telefone, fica guardada para medir o retorno.
3. registra no `DECISOES.md` a exportação: quem pediu, o filtro, quantos nomes.

Ainda não há carteira, então a lista é da loja toda.

**Pronto quando (quem constrói):**
- o arquivo existe;
- o número de nomes bate com uma segunda consulta, escrita de outro jeito;
- a entrada está no `DECISOES.md`.

**Conferência do dono:** o arquivo entrou na ferramenta de disparo sem edição, e a campanha saiu, com a data. Sete dias depois, uma consulta só de leitura diz quantos desses clientes compraram cola, e quanto.

**O que o dono vê:** a campanha da cola na rua em poucos dias, sem esperar login nem site. Ela também testa, antes da etapa 3, as duas coisas que mais ameaçam a primeira entrega: o formato do arquivo e a qualidade dos telefones.

### Etapa 1: os dados que faltam, sem tela (7 tarefas)

**O que se faz:**
1. Ler celular, fone, fone comercial, e-mail e apelido do ERP: migração em `kaizen.pessoa`, colunas esperadas e carga.
2. A regra do celular válido. Casos de teste:
   - "(98) 98888-7777" vira 5598988887777;
   - "3222-1234", fixo, fica sem celular válido;
   - "98888-7777", sem DDD, vira 5598988887777.
3. `kaizen.cliente_compra`, com o índice, e a medida do filtro da cola no banco do PC.
4. Revisão da branch no meio.
5. `kaizen.cliente_dia`: a foto de hoje de hora em hora, a das 22h congelada e o comando que preenche o passado.
6. `kaizen.cliente_produto`: produto habitual, deixou de comprar e mais vendidos que nunca levou, às 22h.
7. Medir o tempo da noite e da suíte de testes, registrar no `DECISOES.md`, atualizar `testes-esperados.txt` e fazer a revisão final.

**Pronto quando (quem constrói):**
- o número de clientes com celular válido no Kaizen é igual ao que a etapa 0 contou no ERP;
- `kaizen.cliente_dia` tem, para hoje, uma linha por cliente com venda válida, no número que a etapa 0 mediu;
- teste com valor de referência: um cliente com compras em 01, 08, 15, 22 e 29/09 tem intervalo de 7 dias e está atrasado em 10/10;
- teste com valor de referência: um cliente que levava fita de borda a cada 15 dias, com a última há 41 dias e outras compras depois, aparece em "deixou de comprar fita de borda";
- o filtro "não comprou cola de contato nos últimos 7 dias" responde em menos de 1 s no banco do PC, com os dados reais;
- a leitura da hora continua terminando `ok` dentro do prazo de 10 minutos.

**O que o dono vê:** nada novo na tela. O relatório da etapa traz os clientes por situação e quantos têm celular válido.

### Etapa 2a: a porta de entrada, servidor e login (7 tarefas)

**O que se faz:**
1. O servidor web (`api/`), com a configuração própria sem o token do ERP. Ampliar `ferramentas/testar.mts` e `tsconfig.json`, que hoje só olham `tradutor/` e `ferramentas/`, e decidir como conferir os tipos do código do navegador. Sem isso, o código novo fica fora dos testes sem ninguém perceber.
2. O login (Firebase, provisório), conferido num módulo só.
3. `kaizen.acesso`, `kaizen.acesso_registro` e os perfis dono, gerente e vendedor.
4. O filtro por perfil no servidor.
5. Revisão da branch no meio.
6. A API de Pessoas e acesso, com o último acesso e os "dias com acesso nesta semana".
7. Os testes de ponta a ponta do login e a revisão final.

**Pronto quando (quem constrói), por teste:**
- a API sem login responde "não autorizado";
- um e-mail não cadastrado recebe "sem acesso";
- o pedido do Igor por um cliente da Daniele é recusado;
- o serviço web sobe sem o `MEUERP_TOKEN`;
- cada entrada fica registrada com quem e quando.

### Etapa 2b: as telas de entrada e a publicação (7 tarefas)

**Pré-requisito:** a G1 e a G2 corrigidas e a P1 aprovadas no Claude Design.

**O que se faz:**
1. A moldura (G2) e a tela Entrar (G1), a partir do HTML aprovado. Até a etapa 6, a porta do vendedor é "Minha carteira".
2. A tela Pessoas e acesso.
3. A checagem visual pelo auditor visual, com as capturas.
4. A publicação, na parte livre:
   - o `publicacao/Dockerfile` ganha `COPY api/ api/` e `COPY app/ app/`;
   - `tradutor/publicacao.test.mts` é atualizado. Hoje ele fixa o Dockerfile linha a linha e exige que a stack tenha só o `tradutor`;
   - o `publicacao/stack.yml` final é escrito de uma vez, com o serviço `web` e, se for preciso, o proxy, para o dono trocar a linha do script uma vez só;
   - o sha256 do arquivo é calculado com fim de linha LF, como o teste faz;
   - entra no `DECISOES.md`, em "Para o dono decidir", a linha 9 nova do `publicacao/implantar.sh`, pronta para colar, junto com a mudança proposta no script (abaixo).
5. Revisão da branch no meio.
6. Depois da parte do dono: o commit do `stack.yml` com a linha 9 trocada, a publicação pelo `implantar.sh` e a checagem de fora, feita do PC.
7. Revisão final.

**Para quem constrói: as travas da publicação.**
- **O commit da stack depende do dono.** O teste `tradutor/implantar.test.mts:87-91` compara a linha `SHA256_STACK` do script com o sha256 do `stack.yml`, em qualquer sistema. O `.githooks/pre-commit` roda todos os testes. Assim que o `stack.yml` mudar, todo commit que o contenha falha até o dono trocar a linha 9, e o agente não pode editar o script (`.claude/settings.json:25`). Por isso:
  - o `stack.yml` novo fica fora dos commits até o dono trocar a linha;
  - o resto da etapa, e a etapa 3 inteira, seguem em commits que não tocam nele;
  - quando o dono trocar a linha, os dois arquivos entram no mesmo commit.
- **Um segredo só do site.** O segredo atual, `kaizen_env`, leva o `MEUERP_TOKEN`, o token do ERP que lê e escreve (`publicacao/README.md:142`). O serviço web usa um segredo novo, por exemplo `kaizen_web_env_v1`, com o endereço do banco e nada mais. O nome fica fixo no `stack.yml`. Quem cria é o dono, porque `docker secret` é negado ao agente.
- **O proxy com HTTPS.**
  - A preferência é o proxy que a VPS já tiver, por exemplo na stack `prumo`: menos peças.
  - Se não houver nenhum, entra um Caddy na stack. Ele publica as portas 80 e 443 e precisa de um volume para guardar os certificados; sem volume, cada publicação pede certificado de novo e esbarra no limite do Let's Encrypt. Volume está fora do que o script pode tocar (`docs/AUTONOMIA.md:42`), então o dono aprova o volume e as portas, e eles entram no mesmo `stack.yml` da troca única.
  - O roteiro faz o dono olhar e colar a resposta (quais serviços e redes existem). A sessão, aberta junto, escreve o `stack.yml` e manda a linha pronta, tudo na mesma manhã.
- **O script só enxerga o tradutor.** O `implantar.sh` espera só o `kaizen_tradutor` ficar 1/1 (linha 77) e lê só o log dele (linha 86). Um serviço web que caísse na subida passaria como "no ar". A mudança proposta ao dono, junto com a linha 9:
  - o `log` passa a aceitar o nome do serviço (tradutor ou web);
  - o `publicar` passa a esperar o web também em 1/1.

  Enquanto isso não muda, a checagem de fora vale como prova: do PC, a página responde 200 e a API sem login responde 401.

**Pronto quando (quem constrói):**
- a checagem visual passou, com as capturas guardadas;
- o `stack.yml` está pronto, com o sha256 calculado e a proposta no `DECISOES.md`;
- depois da parte do dono, a publicação saiu pelo `implantar.sh`, e a checagem de fora deu 200 na página e 401 na API sem login.

Enquanto a parte do dono não sai, a etapa 3 é construída e vai ao ar junto.

**Conferência do dono:** ele entrou com Google e viu o perfil "dono". Igor e Daniele entraram e viram "carteira ainda não distribuída".

**O que o dono vê:** o Kaizen no navegador, com o login dele e a tela onde cadastra quem entra.

### Etapa 3a: carteira e exportação, no servidor (5 tarefas)

**O que se faz:**
1. Migração de `kaizen.carteira`, `kaizen.carteira_mudanca`, `kaizen.exportacao` e `kaizen.exportacao_pessoa`.
2. A API da carteira com os filtros da seção 2, incluindo duas condições de produto, com a busca por descrição, grupo e marca. Sem cadastro de família nesta etapa.
3. A exportação no formato da planilha de exemplo (padrão: .xlsx), o registro de cada uma e o retorno da campanha.
   - Se a planilha exigir .xlsx, a biblioteca ou o gerador próprio fica registrado no `DECISOES.md`.
   - Se a ferramenta aceitar CSV, sai CSV, sem dependência nova.
4. A distribuição: "Passar para…", a sugestão (quem mais vendeu a cada cliente em 90 dias) e o registro de cada mudança.
5. Revisão da branch no meio.

### Etapa 3b: a tela da carteira, a primeira entrega útil (4 tarefas)

**Pré-requisito:** "Minha carteira", nas duas versões, aprovada, e o acréscimo ao Design System colado.

**O que se faz:**
1. A tela na versão do vendedor.
2. A tela na versão do dono, com a seleção, "Passar para…", a sugestão e as contagens.
3. O histórico de exportações com o retorno, a checagem visual e a publicação.
4. A revisão final e o auditor de fase, com o "pronto quando" da primeira entrega registrado no `DECISOES.md` na etapa 0.

**Pronto quando (quem constrói):**
- o filtro "não comprou cola de contato nos últimos 7 dias" dá o mesmo número que uma consulta independente, num teste com valor de referência;
- o arquivo exportado é igual, coluna a coluna, ao exemplo da ferramenta, ou ao formato padrão se o exemplo não chegar;
- cada exportação fica registrada;
- o vendedor só vê e só exporta a própria carteira (teste);
- "Passar para…" e a sugestão gravam o que dizem (teste);
- o filtro responde em menos de 1 s;
- a checagem visual passou;
- a etapa está publicada, e o auditor de fase aprovou.

**Conferência do dono:**
- a carteira foi distribuída, e as contagens por vendedor batem com o que ele fez;
- um arquivo exportado entrou na ferramenta sem edição;
- a medida de uso da primeira entrega (seção 1).

**O que o dono vê:** as campanhas saindo pelo Kaizen, cada vendedor com a carteira dele, e o retorno de cada campanha.

### Etapa 4: dossiê do cliente (4 tarefas)

**Pré-requisito:** o Dossiê aprovado.

**O que se faz:**
1. A API do dossiê, que lê `cliente_dia`, `cliente_produto`, `cliente_compra` e as exportações.
2. A tela, e o nome do cliente clicável na carteira.
3. A checagem visual e a publicação.
4. A revisão.

**Pronto quando (quem constrói):**
- para um cliente de referência, os produtos habituais, os que ele deixou de comprar e os mais vendidos que nunca levou são iguais aos de uma consulta independente;
- o telefone abre o WhatsApp Web;
- o vendedor não abre cliente de outra carteira (teste);
- a checagem visual passou.

**O que o dono vê:** a ficha de cada cliente, com o que ele parou de comprar e o que nunca levou.

### Etapa 5: Minhas vendas e metas (5 tarefas)

**Pré-requisito:** Minhas vendas e a K2 aprovadas.

**O que se faz:**
1. A regra única do "R$ por dia útil", para a loja e para o vendedor, e a dos clientes recuperados, calculadas no servidor.
2. A API de Minhas vendas. Ela lê o que a Fase 4 já grava (`vendas.vendedores[]` em `kaizen.resposta`) e acrescenta a falta, o R$ por dia útil, a positivação e os recuperados.
3. A tela Minhas vendas e a tela de metas (K2), que grava em `kaizen.meta` com quem e quando.
4. A checagem visual e a publicação.
5. A revisão.

**Pronto quando (quem constrói):**
- num dia escolhido, o "R$ por dia útil" é igual à conta feita à mão pela regra única;
- no último dia útil, divide por 1;
- a positivação "X de Y" bate com uma consulta independente;
- uma meta digitada na K2 aparece na resposta (teste);
- a checagem visual passou.

**Conferência do dono:**
- ele digitou as metas de outubro de Igor e Daniele;
- conferiu com a equipe a divisão das vendas por vendedor desde 28/09, medida na etapa 0. Se não bater com quem atendeu, a loja passa a escolher o vendedor certo no caixa.

Enquanto isso, a tela mostra o aviso da seção 2.

**O que o dono vê:** cada vendedor com a meta dele e quanto precisa vender por dia, e o seletor para ver todos.

**Por que o dossiê vem antes de Minhas vendas.** A primeira parte da queixa é "não sabe as informações dos clientes da carteira dele". Além disso, Minhas vendas depende de duas coisas do dono: as metas de Igor e Daniele, e a conferência do vendedor gravado no caixa. Pondo essa etapa depois, as duas têm mais tempo para chegar.

### Etapa 6: lista para contatar e prioridades (7 tarefas)

**Pré-requisito:** Para contatar hoje e Prioridades aprovadas.

**O que se faz:**
1. Migração de `kaizen.prioridade`, `kaizen.contato` e `kaizen.lista_dia`.
2. A regra da lista, montada às 22h para o dia útil seguinte, com os motivos que existem nesta etapa: atrasado; faltou levar, só pela regra "3 das últimas 5"; deixou de comprar; não comprou no mês; sumido. O orçamento parado fica desligado.
3. Revisão da branch no meio.
4. A API e a tela "Para contatar hoje", com o "Falei" e o "comprou hoje". A porta do vendedor passa a ser esta tela.
5. A tela de prioridades do dono. Ao lado das partes do "faltou levar" que só chegam na etapa 7, ela mostra "chega na etapa 7".
6. O andamento por vendedor para o dono, a checagem visual e a publicação.
7. A revisão final.

**Pronto quando (quem constrói):**
- com dados de referência, cada vendedor vê até 10 nomes da carteira dele, cada um com motivo e frase;
- mudar a ordem dos motivos muda a lista da noite seguinte (teste com valor de referência);
- "Falei" grava o contato e tira o nome por 7 dias;
- a lista de um dia passado continua igual à que o vendedor viu;
- a checagem visual passou.

**Conferência do dono:** a medida de uso com o "Falei" (seção 1).

**O que o dono vê:** a lista de cada vendedor, com "Igor: 4 de 10 com Falei", e a tela onde ele escolhe as prioridades.

### Etapa 7: venda casada (6 tarefas)

**Pré-requisito:** a tela de Famílias e complementares aprovada. O prompt sai no começo desta etapa, com as duplas reais já medidas.

**O que se faz:**
1. Migração de `kaizen.familia`, `kaizen.familia_produto` e `kaizen.complementar`. A migração grava o exemplo do dono, com as famílias montadas pela busca na descrição, para ele conferir:
   - cola de contato → fita de borda, solvente e estopa;
   - fita de borda → lima e estilete.
2. A regra "costuma sair junto", às 22h, com os dois limites, e a lista das duplas mais fortes para o dono marcar.
3. Revisão da branch no meio.
4. A tela Famílias e complementares.
5. As sugestões no dossiê, o "faltou levar" completo na lista e o filtro da carteira aceitando família.
6. A checagem visual, a publicação, a revisão final e o auditor de fase.

**Pronto quando (quem constrói):**
- a cadeia do exemplo do dono aparece na tela, para ele conferir;
- o dossiê mostra "Complementares" e "Costuma sair junto" com o número de vendas, igual ao de uma consulta independente;
- um cliente de referência que comprou cola ontem sem solvente aparece na lista com "Faltou levar" e a frase com o motivo;
- a checagem visual passou, e o auditor de fase aprovou.

**Conferência do dono:** ele conferiu a cadeia e marcou as duplas que viram complementar.

**O que o dono vê:** a tela dos complementares, com as sugestões que saem das vendas, e a venda casada na lista e no dossiê.

### Resumo das etapas

As datas são estimativas, em dias de trabalho depois do "aceito" do dono. A base é a história do projeto: as Fases 3 e 4, com 13 tarefas cada, foram construídas em cerca de um dia de trabalho contínuo cada uma (`git log`: 22 commits em 28/09 e 33 em 29/09). Há mais folga aqui, porque telas e publicação web são novas para o projeto. **O tempo do dono pode empurrar tudo:** a manhã de publicação e o desenho das telas.

| Etapa | O que entrega | Tarefas | Quando (estimativa) | O que o dono precisa ter feito antes | Ao fim, o dono vê |
| --- | --- | --- | --- | --- | --- |
| 0 | decisões, definições, medições, prompts, roteiro | 6 | dias 1 a 2 | nada | os números reais da loja |
| Entrega 0 | o arquivo da campanha da cola | 1 a 2 | dias 1 a 3 | a planilha de exemplo (sem ela, Excel com Nome e Telefone) | **a campanha da cola na rua** |
| 1 | telefone e números por cliente | 7 | dias 2 a 4 | nada | o relatório com os clientes por situação |
| 2a e 2b | servidor, login, telas de entrada, publicação | 14 | dias 4 a 8 | a manhã de publicação até o dia 5; G1, G2 e P1 aprovadas; os e-mails | o Kaizen no navegador, com login |
| 3a e 3b | carteira, filtros, exportação, retorno | 9 | dias 8 a 12 | a carteira desenhada | **as campanhas pelo Kaizen e os vendedores usando** |
| 4 | dossiê | 4 | dias 12 a 14 | o dossiê desenhado | a ficha de cada cliente |
| 5 | Minhas vendas e metas | 5 | dias 14 a 16 | Minhas vendas e K2 desenhadas; as metas de Igor e Daniele | quanto cada um precisa vender por dia |
| 6 | lista para contatar e prioridades | 7 | dias 16 a 19 | as duas telas desenhadas | a lista do dia de cada vendedor |
| 7 | venda casada | 6 | dias 19 a 22 | a tela desenhada; conferir a cadeia | complementares e "costuma sair junto" |

Se o "aceito" vier na segunda, 05/10, a conta dá:
- a campanha da cola até 07/10;
- a carteira no ar entre 14 e 20/10;
- o resto até o começo de novembro.

**Para quem constrói: como isso entra no método.** Proposta para o orquestrador decidir e registrar no `DECISOES.md`:
- uma fase só, "Fase V — Vendas", com uma spec só;
- um plano e uma branch por etapa (`fase-v0`, `fase-v1` e assim por diante), cada etapa mesclada e publicada quando fecha, numa sessão nova;
- o auditor de fase ao fim da etapa 3b, a primeira entrega, e ao fim da etapa 7, com os "pronto quando" registrados no `DECISOES.md` na etapa 0;
- cada migração entra como tarefa própria do plano, despachada do começo, por causa da recusa de permissão registrada na Fase 4 (`docs/LICOES.md`).

**As sessões que constroem rodam no PC do dono.** Isso não é opcional, por três motivos:
- 336 dos 432 testes precisam do Postgres local;
- a publicação sai pelo Git Bash;
- só de lá a VPS é alcançada, pelo Tailscale.

---

## 5. O que se reaproveita e o que fica parado

### Reaproveitado

- **Fases 1 a 4, inteiras:**
  - os tradutores das duas fontes;
  - a história desde 11/04 ligada ao cadastro novo;
  - a rotina de hora em hora e a das 22h, com aviso no Telegram;
  - as migrações e o `implantar.sh`;
  - a regra de vendas por vendedor: realizado, meta e clientes atendidos;
  - o encalhe com custo, que fica para depois: 240 produtos e R$ 41.071,56 em 29/09.
- **As definições do `docs/LOJA.md`:** atrasado, sumido, intervalo normal, valor em risco, compra incompleta e lista do dia. Só se acrescentam as que faltam.
- **O Design System aprovado na rodada 3.** Ele já tem:
  - tabela que ordena e botão "Colunas";
  - filtros combináveis com "Limpar filtros";
  - lista e detalhe na mesma tela;
  - link para o WhatsApp;
  - formulário em painel;
  - barra de meta.

  Falta o acréscimo das três peças da etapa 0.
- **A G2 (moldura), aprovada.** Precisa do menu do vendedor.
- **O prompt da G1 (Entrar), pronto.** Leva os três ajustes da G2 aprovada. A porta do vendedor se corrige depois, num prompt pequeno.
- **O prompt da K2 (Metas e feriados), pronto.**
- **As descrições das telas R4, R2, R1 e P1** na `TELAS.md`. São a base das telas do vendedor, com os acréscimos deste plano.
- **A V2 e o bloco "para bater a meta" da V1** servem de modelo para Minhas vendas, sem percentual e com a regra única do R$ por dia.

### Fica parado até as telas do vendedor estarem no ar e em uso

- **As telas do dono da Fase 5:** I1, V1, V2, C1, C2, C3, F1, F2, K1 e F3. O que já foi desenhado fica guardado e volta depois; nada se perde.
- **A Fase 6:** réguas, briefing e IA.
- **Os painéis da gerência:** R5, R6 e R7.
- **Tarefas (R3) e anotações livres**, e o painel de tarefas da carteira e da lista. Nesta fase, o "Falei" com nota faz o papel de anotação. Isso entra no `DECISOES.md`, porque o "pronto quando" da Fase 7 do `OBJETIVO.md` pede "uma tarefa e uma anotação criadas".
- **Mapa, entregas e leads:** Fases 9 a 11 e a leitura dos 575 leads.
- **As análises já adiadas:** V3 e F4.
- **O antigo "Resultado das vendas"**, uma tela do dono com uma linha por vendedor e por semana. Os números dele já aparecem nas telas desta fase: retorno das campanhas na carteira, "Falei" na lista, positivação, meta e recuperados em Minhas vendas.

---

## 6. O que precisa do dono

### O que fazer hoje

1. **Termine a tela que estiver em andamento** no Claude Design.
2. **Se ainda não colou a G1 (Entrar), cole.** Ela leva os ajustes da G2 aprovada e serve ao vendedor. Cole também a **K2 (Metas e feriados)**, que já está pronta e serve à meta de cada vendedor.
3. **Pare as outras telas do dono que ainda não colou:** I1, V1, V2, C1, C2, C3, F1, F2, K1 e F3. Cada uma colada antes das telas do vendedor atrasa a carteira no ar no tempo de uma tela no Claude Design. O que já foi desenhado fica guardado.
4. **Quando os prompts novos chegarem**, em 1 a 2 dias, cole na ordem da etapa 0 e aprove cada tela.

### A. Para mandar, porque trava uma etapa

| | O quê | Trava | Sem resposta |
| --- | --- | --- | --- |
| 1 | **Uma planilha de exemplo** que a ferramenta de disparo já aceitou: colunas, ordem, como o telefone está escrito, .xlsx ou .csv | o formato do arquivo da Entrega 0 e da etapa 3 | sai Excel (.xlsx) com Nome e Telefone, telefone só com números (55 + DDD + número), gravado como texto |
| 2 | **Os e-mails de quem entra:** o senhor, Erleide, Igor e Daniele, de preferência contas Google | a etapa 2 entrar no ar com gente de verdade | a etapa fica pronta, esperando |
| 3 | **Uma manhã para o roteiro de publicação**, de preferência no primeiro ou segundo dia, com a sessão aberta junto | a etapa 2 ir ao ar, e com ela todo o resto | o código fica pronto e não sobe |
| 4 | **As metas de outubro de Igor e Daniele.** Só veio a da loja, R$ 160.000,00. Podem ser digitadas na tela de metas quando ela chegar | Minhas vendas com meta (etapa 5) | a tela sai sem meta e sem "quanto falta por dia" |
| 5 | **Colar os prompts do vendedor e aprovar cada tela** | cada etapa com tela espera a sua | a etapa constrói a API e os testes, e a tela espera |

**O que é a manhã de publicação, em palavras simples.** O roteiro vem pronto na etapa 0, passo a passo, com quanto tempo leva e como saber que deu certo:
- **escolher o endereço do Kaizen na internet** e apontá-lo para o servidor;
- **olhar se o servidor já tem um "porteiro" com cadeado (HTTPS) para sites** e colar a resposta na sessão. O roteiro mostra o comando. Se não tiver, a sessão propõe um, e o senhor aprova o espaço onde ele guarda os certificados;
- **criar a conta gratuita de login do Google (Firebase).** Fazer isso confirma que o login fica com o Google, a escolha "por enquanto" de 02/10;
- **criar a senha do site no servidor:** um segredo novo, sem a chave do ERP, para que o site aberto na internet nunca tenha a chave que escreve no ERP;
- **colar no script de publicação a linha nova que a sessão manda pronta**, e a mudança que faz o script ler o registro do site. O script só muda pelas suas mãos.

**6. Responder ao plano (não trava).** Sem resposta, vale como está. Mudar o `OBJETIVO.md` é só seu: o texto proposto está no apêndice A. Até lá, vale a entrada no `DECISOES.md`, como em 02/10.

**Conferências, que não travam nada:**
- distribuir a carteira quando ela chegar: aceitar a sugestão em bloco, ou passar na mão;
- conferir com a equipe se o vendedor escolhido no caixa é quem atendeu. Nos testes de 26/09, 15 de 16 pedidos foram para o Igor. Se não for quem atendeu, a loja passa a escolher o vendedor certo no caixa;
- mandar a campanha da cola da Entrega 0 e dizer o dia;
- conferir a cadeia de complementares e marcar as duplas (etapa 7).

### B. Já decidido assim (mude se quiser)

Cada linha entra no `DECISOES.md` na etapa 0 e já vale.

- **Lista do dia:** até 10 nomes por vendedor. A ordem é atrasado, faltou levar, deixou de comprar, não comprou no mês (a partir do dia 10), sumido; orçamento parado fica desligado. Dentro de cada motivo, primeiro o maior valor em risco. "Falei" tira o nome por 7 dias. Tudo isso se muda na tela de prioridades.
- **Positivação:** os clientes da carteira que compraram no mês, mostrados como contagem ("82 de 170"). Conta a compra seja quem for o vendedor gravado.
- **A carteira começa pela sugestão:** cada cliente vai para quem mais vendeu a ele em 90 dias.
  - Nos 90 dias até hoje, quase tudo vem da Link, onde o "vendedor" é quem registrou a venda, inclusive pedidos de WhatsApp.
  - No ERP novo, é o vendedor escolhido no caixa.
  - Antes de aceitar em bloco, o senhor vê quantos clientes compraram de 1, de 2 ou de 3 vendedores.
- **Erleide:** entra como gerente, sem carteira própria. Vê tudo, como o senhor, mas não mexe em carteira, prioridades, metas nem acessos.
- **Login:** cada um com o próprio. O acesso termina ao fechar o navegador, que é o mais seguro se o computador for de todos. Se cada um tiver o seu computador, o login passa a ficar lembrado.
- **O que o vendedor vê:** só R$ e contagens, nunca percentual, que é regra do `OBJETIVO.md`. Não vê os números dos colegas.
- **Exportação (LGPD):**
  - cada vendedor exporta só a carteira dele, e o senhor, qualquer uma;
  - o arquivo leva só nome e telefone;
  - toda exportação fica registrada: quem, quando, filtro, quantos e quais clientes.
- **Celular válido:** celular com DDD e 9 dígitos começando por 9. O fone só entra se tiver forma de celular. O Kaizen não sabe se o número tem WhatsApp, por isso as telas dizem "celular válido".
- **R$ por dia útil:** (meta − vendido até ontem) ÷ dias úteis que faltam, contando hoje. É a mesma regra para a loja e para o vendedor, e muda a conta proposta na V1, que dividia por 9 sem contar hoje.
- **Réguas iniciais:**
  - atrasado: 1,5 vez o intervalo; sumido: 60 dias;
  - produto habitual: 3 compras; deixou de comprar: 1,5 vez o intervalo do produto;
  - costuma sair junto: 5 vendas e o dobro da loja;
  - faltou levar: 2 dias úteis, sem compra do produto nos 30 dias antes;
  - não comprou no mês: a partir do dia 10;
  - valor em risco do sumido há mais de 90 dias: as compras dos 90 dias antes da última compra ÷ 3.
- **Venda casada:** segue até 2 níveis (cola → fita de borda → lima e estilete) e diz o caminho. Em vez de pedir mais ligações de cabeça, a etapa 7 mostra as duplas que saem das vendas, e o senhor só marca.
- **As quatro telas novas do dono** (Pessoas e acesso, Metas, Prioridades, Complementares) também são desenhadas pelo senhor no Claude Design, como a condição de 02/10. Se quiser poupar tempo, libere Prioridades e Complementares para saírem direto das peças do Design System.
- **Tarefas e anotações livres ficam para depois.** O "Falei" com nota faz o papel de anotação.
- **Promoção (item 8 do pedido):** fica para depois, do jeito que cabe na regra "nada deste projeto escreve no ERP". O senhor cria a promoção na tela do ERP, e o Kaizen mostra aos vendedores e mede quanto ela vendeu. A API do ERP só deixa ler promoções, não criar; a única escrita de preço que existe troca o preço de um produto numa tabela, sem período.

---

## 7. Riscos e o que fica para depois

### Riscos

| Risco | O que acontece | O que o plano faz |
| --- | --- | --- |
| **Tempo do dono para desenhar** | as telas esperam o Claude Design: são 8 prompts na etapa 0 e mais 1 na etapa 7 | o "O que fazer hoje" para as telas do dono; cada etapa constrói a API e os testes antes da tela |
| **Publicação travada** | sem a manhã do dono, o código fica pronto e não sobe; e o commit do `stack.yml` só passa depois da linha 9 trocada | o roteiro passo a passo pedido no primeiro dia; o `stack.yml` escrito de uma vez; o resto segue em commits que não tocam nele |
| **Chave do ERP no site** | o segredo atual leva o token que lê e escreve no ERP | um segredo só do site, sem o token, e um teste que prova que o site sobe sem ele |
| **Vendedor gravado errado na venda** | Minhas vendas, os clientes atendidos e a sugestão de carteira saem errados. A conferência está aberta desde 27/09 | a carteira é digitada; a positivação conta pela carteira; a etapa 0 mede a divisão desde 28/09; Minhas vendas mostra o aviso enquanto a conferência não fecha |
| **Telefone ausente ou mal formatado** | a exportação sai curta ou com números inválidos. A planilha da migração já estragou referências de produto em notação científica | a Entrega 0 e a etapa 0 medem antes; a regra do celular válido descarta o resto, e a tela diz quantos ficaram de fora |
| **Balcão grande** | as vendas do Consumidor Final ficam fora de tudo que é por cliente, e a proporção nunca foi medida | a etapa 0 mede. O "costuma sair junto" usa também o balcão, porque conta por venda |
| **Carteira vazia** | o vendedor entra e não vê nada até o dono distribuir os cerca de 340 clientes | a sugestão e a distribuição em bloco na etapa 3 |
| **Dados de clientes na internet** | hoje nada do Kaizen fica aberto para fora | login obrigatório, HTTPS, filtro por perfil no servidor com teste, e exportações registradas |
| **Filtros lentos** | as visões de venda já passaram de 2 minutos num caso | a tabela `kaizen.cliente_compra`, com índice, e a meta de menos de 1 s medida na etapa 1 |
| **Suíte de testes lenta** | de 6 a 11 minutos, rodada a cada commit | a foto diária sem recalcular o passado; tempo da noite e da suíte medidos ao fim da etapa 1 |
| **Site cai sem ninguém ver** | o script só espera e só lê o tradutor | a mudança proposta no script e a checagem de fora (200 e 401) em toda publicação |
| **Checagem visual sem quem confira** | não existe auditor visual, e sem ele nenhuma etapa com tela fecha | o auditor visual nasce na etapa 0, antes das sessões que o usam |
| **Colunas novas do ERP** | se o ERP mudar o banco e uma coluna esperada sumir, a leitura inteira para | ler só as 5 colunas de contato; o aviso do Telegram já existe |
| **Atraso do dado** | leitura de hora em hora, das 8h às 19h, de segunda a sábado: uma compra de 40 minutos atrás pode não aparecer | "Atualizado às HHh" em toda tela. Para campanha, o atraso é aceitável |
| **Duplas por acaso** | com cerca de 40 vendas por dia, aparecem pares fracos | o mínimo de 5 vendas juntas e o dobro da loja; o dono marca antes de virar complementar |
| **História curta** | as vendas começam em 11/04, com abril parcial | as regras exigem 3 compras; com menos, o cliente ou o produto não entra |
| **Código fora dos testes** | `api/` e `app/` ficariam fora da suíte e da checagem de tipos | ampliar o executor e a checagem na etapa 2a |
| **Recusa de permissão ao escrever migração** | já aconteceu uma vez, na Fase 4 | cada migração é tarefa própria do plano, despachada do começo |

### Fica para depois, na ordem proposta

1. **Promoções com os produtos parados**, do jeito que cabe na regra de só leitura:
   - o Kaizen mostra os produtos em encalhe, com custo, estoque e dias parado, e o preço de venda, lido da tabela de preço;
   - o dono cria a promoção **na tela do ERP**, com o período;
   - o Kaizen lê as promoções e as mostra aos vendedores, no dossiê e na lista;
   - o Kaizen mede quanto cada promoção vendeu, porque o item da venda grava a promoção usada e o desconto.

   Se a promoção cadastrada no ERP aplicar o preço sozinha no caixa, acaba a "senha para o desconto", que vem do limite de 5% em todos os produtos desde 28/09 **(a confirmar no ERP)**.
2. **As telas do dono da Fase 5**, com os prompts já prontos.
3. **Campanhas para os 575 leads do CRM**, que têm telefone. Depende da leitura dos leads, prevista na Fase 7.
4. **Um usuário de banco só para o site**, que lê tudo e só grava nas tabelas digitadas. É uma melhoria de segurança. Fica para depois porque exige manter permissões a cada migração e criar o mesmo usuário em todos os bancos de teste.
5. **A Fase 6 (réguas e avisos), a gerência (R5 a R7), o mapa e as entregas**, na ordem do `OBJETIVO.md`.

---

## Apêndice A: texto proposto para o `OBJETIVO.md` (só o dono muda)

Junto com as decisões de 02/10, que também esperam a reescrita (`docs/DECISOES.md:102`).

**1. Na linha 142**, trocar "A primeira entrega usável é só para o dono; gerente e vendedor entram na Fase 7" por:

> A primeira entrega usável é a do vendedor (Fase V); a do dono vem depois.

**2. Na linha 23**, acrescentar à lista do que se digita no Kaizen:

> e, a partir da Fase V, logins e perfis, carteira, "falei", prioridades da lista, famílias de produtos e complementares.

**3. Nas linhas 81 a 88**, trocar "Quatro motivos, nesta ordem" por:

> Os motivos e a ordem são escolhidos pelo dono: atrasado, faltou levar (compra incompleta, complementar ou produto que costuma sair junto), deixou de comprar um produto habitual, não comprou no mês, sumido e orçamento parado. Dentro de cada motivo, a ordem é a que o dono escolher, começando pelo valor em risco.

**4. Antes da Fase 5b**, inserir:

> **Fase V — Vendas primeiro (decisão do dono, 03/10/2026)**
>
> O vendedor entra no Kaizen pelo computador, com login, e vê só a carteira dele; o dono vê as mesmas telas de todos os vendedores. Quatro telas: Minha carteira (com filtros e exportação para o disparo de WhatsApp), Dossiê do cliente, Minhas vendas e Para contatar hoje. O tradutor passa a ler o telefone dos clientes. Passam a ser digitados no Kaizen: logins e perfis, carteira, "falei", prioridades da lista, famílias de produtos e complementares.
>
> **Pronto quando, primeira entrega:** Igor e Daniele entram com o próprio login, no endereço com HTTPS, e cada um vê só a própria carteira; o vendedor filtra "não comprou cola de contato nos últimos 7 dias" e o arquivo exportado entra na ferramenta de disparo sem edição; cada exportação fica registrada e mostra quantos compraram o produto da campanha em 7 dias.
>
> **Pronto quando, fase completa:** cada vendedor vê quanto falta vender por dia útil para a meta; o dossiê mostra o que o cliente compra, o que deixou de comprar e os mais vendidos da loja que ele nunca levou; de manhã, cada um vê até 10 nomes com motivo e o que oferecer, marca "falei" e o nome some por 7 dias; o dossiê e a lista mostram os complementares e o que costuma sair junto.
>
> **As telas do dono voltam quando** o Kaizen mostrar uma semana inteira em que Igor e Daniele entraram, cada um, em pelo menos 4 dos 6 dias úteis, com pelo menos uma campanha exportada e, depois da lista do dia, com "falei" em pelo menos 4 dias.

---

## Apêndice B: medições prontas, nenhuma executada

Quem roda é a sessão da etapa 0, no PC do dono.

- **`docs/fases/FASE-V-consultas/consultas-kaizen-so-leitura.sql`:** 11 consultas ao banco do Kaizen. A sintaxe foi conferida por um analisador de SQL do Postgres, e nenhuma foi executada. Medem:
  - 1, o panorama e o balcão;
  - 3, os clientes por recência;
  - 4 e 5, a base do "comprado junto" e as 10 duplas;
  - 6, as duplas com 5 ou mais e com 10 ou mais vendas juntas;
  - 7, a carteira de fato por vendedor;
  - 8, o caso da cola;
  - 9, os itens por venda.

  Rodam no banco do PC depois de uma leitura da noite local; o passo 14 de `publicacao/README.md` é conferência opcional na VPS.
- **`docs/fases/FASE-V-consultas/consultas-erp-para-confirmar.txt`:** 6 consultas ao ERP:
  - 1, vendedor e telefone no cadastro;
  - 2, colunas de promoção no item da venda;
  - 3 e 4, tabelas de preço, promoção e relacionados;
  - 5, quantos clientes têm celular;
  - 6, o vendedor gravado desde 28/09.

  As seis passam na trava de só leitura e rodam pela `ferramentas/consultar-erp.mts`.
- **`docs/fases/FASE-V-consultas/consultas-erp-telefone.txt`:** 3 consultas do telefone. Também passam na trava.

---

## Fontes

**Regras e destino:**
- `CLAUDE.md`: "Nada deste projeto escreve no ERP".
- `OBJETIVO.md`:
  - 19: para o vendedor, a exceção é uma lista curta de nomes;
  - 23: o que se digita no Kaizen;
  - 29: somente leitura por construção;
  - 39: Firebase só para autenticação;
  - 47: quem implementa usa a definição do `LOJA.md`;
  - 81-88: lista do dia;
  - 108: dossiê, inclusive os produtos curva A que ele nunca comprou;
  - 132-138: perfis;
  - 142: a primeira entrega é só para o dono, e a checagem visual é exigida para fechar fase com tela;
  - 197-201: Fase 7.
- `docs/AUTONOMIA.md`:
  - 20: o orquestrador decide e registra;
  - 27-33: as três paradas;
  - 42: o script não toca volumes nem segredos;
  - 44: o script só muda pelas mãos do dono, e o `stack.yml` é livre;
  - 72: agentes só carregam quando a sessão abre;
  - 78: a fase fecha com o dado disponível;
  - 80: revisão da branch no meio;
  - 102: só o dono muda o `OBJETIVO.md`;
  - 115: pastas pelo papel;
  - 120: auditor visual.

**Decisões (`docs/DECISOES.md`):**
- 18: conferência do vendedor gravado aberta;
- 60: na Link, o vendedor liga pelo primeiro nome;
- 96: metas de Igor e Daniele em branco; loja com R$ 160.000,00;
- 102: decisões do dono valem até o `OBJETIVO.md` ser reescrito;
- 104: app web, com a condição de o dono desenhar todas as telas;
- 106: cada tela aprovada pelo dono;
- 107: vendedores só no computador;
- 110: Firebase "por enquanto";
- 120: Design System da rodada 3;
- 122: conferência das pranchas no fim;
- 123: G2 aprovada, com ajustes que vão no prompt da G1;
- 125: os 12 prompts da Fase 5.

**Negócio e dados:**
- `docs/LOJA.md`:
  - 20: de 300 a 400 clientes comprando; 575 leads;
  - 23: Consumidor Final;
  - 58-75: definições de relacionamento;
  - 96-100: operação real desde 28/09; vendedor exigido no caixa desde 25/09; cerca de 40 vendas por dia.
- `docs/FONTES.md`:
  - 81: cola de contato 14 kg (produto 1436);
  - 83: referências estragadas em notação científica;
  - 157: 15 de 16 pedidos de teste com o Igor;
  - 342: proporção do Consumidor Final a confirmar;
  - 735: conferência 5 aberta;
  - 756: desconto máximo de 5% desde 28/09.
- Relatórios das fases:
  - `docs/fases/FASE-3-relatorio.md`: 29, 37 e 56 (5.271 vendas válidas, 14.606 itens, R$ 737.124,85) e 68-77 (ligações);
  - `docs/fases/FASE-3-auditoria.md:128`: 343 clientes citados nos documentos da Link;
  - `docs/fases/FASE-4-relatorio.md`: 44 (encalhe), 78 (noite) e 84 (suíte);
  - `docs/fases/FASE-4-vps.md:356`: 451 pessoas e 1.029 produtos.

**Telas:**
- `docs/app/TELAS.md`:
  - 28-42: regras de todas as telas;
  - 165-179: lista de checagem visual (item 12 na 176; item 14 na 178);
  - 239-266: G1;
  - 268-282: V1;
  - 453-519: R4, R2, R1, R3 e P1;
  - 753-764: perguntas 21, 24 e 29.
- `docs/app/dados-exemplo/dados-exemplo.md:186-187` e `docs/app/prompts/V1-vendas-desvio.md:32`: R$ 57.600 ÷ 9.
- `docs/app/prompts/LEIA-ME.md`: a ordem dos 13 prompts.

**Código e banco:**
- `sql/migracoes/001_estrutura.sql`:
  - 107-119: produto com grupo, seção, subgrupo e marca, sem preço de venda;
  - 128-140: pessoa sem telefone.
- `sql/migracoes/012_regras.sql:26-75`: visões `documento_negocio`, `documento_papel` e `venda_item` (item sem vendedor fora, na linha 75).
- `sql/migracoes/013_resposta.sql:4`: a `resposta` aceita só as três perguntas.
- `sql/regras/vendas.sql`:
  - 10-11: o laço de mais de 2 minutos;
  - 27-36: itens sem vendedor;
  - 71-80: dias úteis, com hoje contado como decorrido;
  - 110-122: por vendedor.
- `sql/erp/cadastros.sql:22-43`: a leitura de pessoas, com o endereço principal.
- `tradutor/config.mts:11-12`: exige o `MEUERP_TOKEN`.
- `ferramentas/testar.mts:10-15` e `tsconfig.json`: só `tradutor/` e `ferramentas/`.
- `ferramentas/consultar-erp.mts`: consulta só de leitura ao ERP.

**Publicação:**
- `publicacao/stack.yml`: um serviço só e o segredo `kaizen_env`.
- `publicacao/Dockerfile:9-10`: copia só `tradutor/` e `sql/`.
- `publicacao/implantar.sh`: 9 (sha256 do `stack.yml`), 65-81 (espera só o `kaizen_tradutor`) e 86 (log só do tradutor).
- `publicacao/README.md`: 142 (o segredo leva o `MEUERP_TOKEN`) e 310-322 (passo 14).
- `tradutor/implantar.test.mts:55-58` e `87-91`: compara o sha256.
- `tradutor/publicacao.test.mts:28-41` e `56`: Dockerfile e serviços da stack fixos.
- `.githooks/pre-commit`: todos os testes a cada commit.
- `.claude/settings.json:25`: o agente não edita o script.

**API do ERP (`docs/api/swagger.json`):**
- 15150: PUT de preço em tabela de preço, a única escrita de preço;
- 19509: produtos relacionados, só leitura;
- 26734 e 26929: promoções, só GET;
- `PublicaPessoaContatoResponse`: fone, foneComercial, celular, email e site, sem campo de WhatsApp.

**Varredura de 03/10/2026:** os relatórios das quatro frentes e das duas críticas ficaram na sessão de 03/10 (não versionados); as consultas estão em `docs/fases/FASE-V-consultas/`.
