# Vendas primeiro: o plano em uma página

**O problema:** o vendedor não sabe onde está o dinheiro na mesa. O Kaizen já guarda as vendas item a item desde 11/04: 5.271 vendas e R$ 737 mil na Link, mais o ERP novo desde 28/09. Mas ainda não mostra nada ao vendedor. Faltam três coisas:
- o site com login;
- o telefone dos clientes;
- a carteira. O ERP não guarda qual cliente é de qual vendedor, então o senhor distribui no Kaizen.

## As entregas, em ordem

Os prazos são estimativas, em dias de trabalho depois do seu "aceito". O tempo da publicação e do desenho das telas pode empurrar tudo.

1. **A campanha da cola, sem esperar o site (dias 1 a 3).** Um Excel com nome e celular de quem não comprou cola de contato nos últimos 7 dias, da loja toda, pronto para a ferramenta de disparo. Sete dias depois, digo quantos compraram cola e quanto.
2. **Os números reais da loja (dias 1 a 2).** Quantos clientes têm celular válido; quantos estão comprando, atrasados e sumidos; quanto é balcão; quais produtos saem juntos.
3. **O Kaizen no navegador, com login (até o dia 8).** O senhor, a Erleide, o Igor e a Daniele entram com a conta Google.
4. **Minha carteira, a primeira entrega útil (dias 8 a 12).** Cada vendedor vê os clientes dele: quem compra, quem parou, há quantos dias, de quanto em quanto tempo compra, quanto vale por mês e o que deixou de comprar. Ele filtra ("não comprou cola nos últimos 7 dias", "comprou cola e não comprou solvente"), exporta para o disparo e vê o retorno de cada campanha. O senhor distribui a carteira, e o Kaizen sugere quem mais vendeu a cada cliente.
5. **A ficha do cliente (dias 12 a 14).** O que ele compra, o que deixou de comprar, os mais vendidos da loja que ele nunca levou e as últimas compras.
6. **Minhas vendas (dias 14 a 16).** O vendido hoje e no mês, a meta, quanto falta e quanto vender por dia útil, e quantos clientes da carteira já compraram no mês.
7. **Para contatar hoje (dias 16 a 19).** Até 10 nomes por vendedor, cada um com o motivo e o que oferecer, na ordem de prioridade que o senhor escolhe. "Falei" tira o nome da lista por 7 dias.
8. **A venda casada (dias 19 a 22).** O senhor cadastra os complementares (cola → fita de borda, solvente e estopa; fita de borda → lima e estilete), e o Kaizen mostra também o que costuma sair junto nas vendas.

**Quando voltam as suas telas:** quando o Kaizen mostrar uma semana inteira em que Igor e Daniele entraram, cada um, em pelo menos 4 dos 6 dias, com pelo menos uma campanha exportada.

**A promoção com os produtos parados fica para depois.** A API do ERP só deixa ler promoções, e o projeto não escreve no ERP. O caminho é este: o senhor cria a promoção no ERP, e o Kaizen mostra aos vendedores e mede quanto ela vendeu.

## O que preciso do senhor

1. **Hoje:** terminar a tela em andamento, colar a G1 (se ainda não colou) e a K2, e parar as outras telas do dono.
2. **Uma planilha de exemplo** que a ferramenta de disparo já aceitou. Sem ela, mando Excel com as colunas Nome e Telefone.
3. **Os e-mails, de preferência contas Google, de quem vai entrar:** o senhor, a Erleide, o Igor e a Daniele.
4. **Uma manhã, no primeiro ou no segundo dia, para publicar.** O roteiro vem passo a passo: escolher o endereço do Kaizen; dizer se o servidor já tem cadeado (HTTPS); criar a conta de login do Google; criar a senha do site, sem a chave do ERP; e colar no script uma linha que eu mando pronta.
5. **Colar os prompts das telas do vendedor quando chegarem**, na ordem, e aprovar cada tela.
6. **As metas de outubro de Igor e Daniele.** Pode digitar na tela de metas quando ela chegar.
7. **Distribuir a carteira quando ela chegar:** aceitar a sugestão ou passar cliente por cliente.
8. **Conferir com a equipe se o vendedor escolhido no caixa é quem atendeu.** Nos testes, 15 de 16 pedidos foram para o Igor.
9. **Mandar a campanha da cola** e me dizer o dia.
10. **Ler o plano e mudar o que quiser.** Sem resposta, vale como está. Mudar o OBJETIVO.md é só seu: o texto proposto está no apêndice A do plano.
