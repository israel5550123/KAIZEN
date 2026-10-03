# Livro de dados de exemplo — telas G1 a K2 da Fase 5

Os números de exemplo de todas as telas da Fase 5, num lugar só. Cada prompt de tela copia daqui; assim, o que aparece no Início aparece igual em Vendas, Compras e Financeiro, e as contas fecham de uma tela para outra.

**Como ler.** A coluna "Origem" diz de onde veio cada número:

- **DS**: veio do Design System instalado no projeto (versão 1790997087-c8ea), do README ou de uma prancha. Não muda.
- **novo**: inventado agora para a tela ter o que mostrar. Foi calculado a partir dos números do Design System, e o script `conferir_dados.py` confere todas as somas, partes e ritmos.
- **TELAS.md**: texto que já está na lista de telas (`docs/app/TELAS.md`, seção 7); não é número.

O dia de todas as telas é **quarta-feira, 21/10/2026, 14h05**. Dinheiro em detalhe sai como R$ 1.234,56; em cartão e painel, como R$ 92,4 mil. Percentual com uma casa, ritmo com duas, negativo com o sinal de menos verdadeiro (−).

**Os exemplos da `docs/app/TELAS.md` não valem.** Lá os valores são só ilustração e não batem com o Design System. Troque sempre pelos daqui:

| Na TELAS.md | Use |
| --- | --- |
| "dia útil 2 de 26", "2 de 26, faltam 24" | 17 de 26 dias úteis, faltam 9 |
| "Abaixo do ritmo: Daniele, 0,81" | Abaixo do ritmo: Daniele · Fora 0,82 |
| "para bater a meta, R$ 6.200 por dia útil restante" | para bater a meta, R$ 6.400,00 por dia útil restante |
| "212 produtos: 120 da curva A, 40 da B, 30 da C e 22 sem venda" | Comprou 150 produtos em 90 dias: 66 curva A, 40 B, 31 C e 13 sem venda |
| "últimos 90 dias (05/07 a 02/10/2026)" | 90 dias até 21/10 (24/07 a 21/10) |
| "saldo R$ 48.000,00, digitado em 01/10, − R$ 31.200,00 que vencem até 09/10" | saldo R$ 41.300,00 (digitado para 20/10) − R$ 33.100,00 que vencem até 28/10 |
| "faltam R$ 3.200,00 para o que vence até 09/10" | o exemplo de folga negativa da F1 (seção F1, Estados) |
| "último fechamento: 01/10" | último fechamento: 20/10 |
| "novo, em carência até 25/11" | novo, em carência até 28/11 (primeira compra em 29/09; em 26/09 não houve nota) |
| "Já existe R$ 45.000,00 em 01/10. Substituir?" | Já existe R$ 41.300,00 em 20/10. Substituir? |
| "Nenhum produto com broca 8" | pode ficar: nenhum produto do exemplo tem "broca 8" |

## Números que se repetem entre telas

Quando uma tela mostra um destes, é este valor, neste formato.

| Número | Cartão e painel | Detalhe | Telas |
| --- | --- | --- | --- |
| Realizado do mês da loja | R$ 92,4 mil | R$ 92.400,00 | I1, V1, K2 (novembro) |
| Meta da loja / % / ritmo | R$ 150 mil · 61,6% · 0,94 | R$ 150.000,00 | I1, V1, K2 |
| Projeção | R$ 143,8 mil | R$ 143.796,30 | I1, V1 |
| Hoje até 14h05 | R$ 4,1 mil em 24 vendas | R$ 4.100,00 | I1, V1 |
| Igor | R$ 51,0 mil · 68,0% · ritmo 1,04 | R$ 51.012,40 | I1, V1, V2, K2 |
| Daniele | R$ 40,2 mil · 53,6% · ritmo 0,82 · Fora | R$ 40.193,80 | I1, V1, V2, K2 |
| Outros (sem meta própria) | R$ 1,2 mil | R$ 1.193,80 | I1, V1 |
| Comprados em 90 dias | 150: 66 A, 40 B, 31 C, 13 sem venda | — | I1, C1, C2 |
| Curva A em falta (ruptura) | 3 produtos | Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm | I1, C1, C2, C3 |
| Encalhe | 38 produtos · R$ 24,6 mil | R$ 24.620,10 | I1, C1, C2 |
| Saldo do banco | R$ 41,3 mil (20/10) | R$ 41.300,00 | I1, F1, F2, K1 |
| A pagar até 28/10 | R$ 33,1 mil · 5 contas | R$ 33.100,00 | I1, F1, F2 |
| A pagar até 20/11 | R$ 39,1 mil · 11 parcelas | R$ 39.100,00 | F1, F2 |
| Folga em 7 dias | R$ 8,2 mil | R$ 8.200,00 | I1, F1, F2 |
| Folga em 30 dias | R$ 2,2 mil | R$ 2.200,00 | I1, F1, F2 |
| Quebra do caixa (fechamento de 20/10) | R$ 0,00 | R$ 0,00 | I1, F1, F3 |
| Cartão a creditar amanhã (22/10) | R$ 0,9 mil | R$ 910,00 | F1, F2 |

## Pontos de atenção

O que a montagem achou e como ficou. Nenhum muda um número do Design System.

1. **Comparação "há 30 dias" de estoque.** O Design System diz "38 produtos parados contra 30 há 30 dias". Há 30 dias é 21/09, antes de 26/09, quando o estoque ainda era desconhecido (regra da Fase 4). Pela regra, essa comparação não existiria até 26/10. Ficou como está, porque é número do Design System e serve para desenhar a comparação; os outros números de estoque "há 30 dias" deste livro (ruptura, estoque negativo e valor parado) seguem a mesma ficção. O caso real ("estoque desconhecido antes de 26/09/2026") é o estado "dia antes de 26/09" de I1, C1 e C2.
2. **Projeção de R$ 143,8 mil.** Só fecha pela regra do Kaizen: o realizado até ontem (R$ 88.300,00) mais, para cada dia útil de hoje até 31/10, a média das últimas 8 semanas do mesmo dia da semana. As médias foram inventadas para dar R$ 143.796,30. Em linha reta daria R$ 141,3 mil. O cartão de 15/09 (R$ 153,6 mil) é conta em linha reta; é do Design System e fica.
3. **Saldo previsto sem o cartão.** A linha do Design System (R$ 41,3 mil em 20/10, R$ 8,2 mil em 28/10) não soma o cartão a creditar. Para continuar fechando com a folga (saldo − contas), o cartão de amanhã (R$ 910,00) aparece como barra própria e não entra na linha nem na folga. Com ele, a linha daria R$ 9,1 mil em 28/10. A pergunta 15 da TELAS.md (contar só o que é certo) continua aberta.
4. **Folga em 30 dias de 7 dias atrás.** Com as contas do exemplo, ela era −R$ 24,0 mil (−R$ 24.000,00) em 14/10 (as contas de 22 a 28/10 já estavam lançadas). É um número que confunde mais do que ajuda. Sugestão: a comparação com 7 dias atrás vai só na folga em 7 dias (R$ 11,5 mil, do Design System). Se a tela quiser as duas, use −R$ 24,0 mil.
5. **Partes da barra das curvas.** 44,0% + 26,7% + 20,7% + 8,7% dão 100,1%, por arredondamento. São do Design System e ficam.
6. **Ruptura e estoque negativo.** O Design System tem "Ruptura 3" e "3 produtos da curva A em falta": toda a ruptura é curva A. Como ruptura é "vendeu nos 90 dias e está com estoque zero ou negativo", os 2 produtos com estoque negativo não venderam nos 90 dias (senão seriam ruptura). Por isso a nota deles é "provável erro de contagem no inventário de 26/09".
7. **Caixa às 14h05.** O caixa de hoje ainda não fechou. A visão do dia da F3 em 21/10 é o estado "ainda não fechou; último fechamento: 20/10". O exemplo cheio é terça, 20/10, aberto pelo atalho ou pelo seletor, com a faixa "Você está vendo terça, 20/10/2026 · calculado em 20/10 às 22h04".
8. **Primeira compra em 26/09 não existe.** 26/09 foi o inventário, sem nota no ERP novo nem no anterior. O produto novo do exemplo foi comprado em 29/09 e fica em carência até 28/11.
9. **Nomes.** Pessoas nas telas: Igor, Daniele e "Outros (sem meta própria)"; o dono, Israel, só na conta, na tela de entrada e em "quem digitou". A gerente não tem nome: no caixa, o operador aparece como "gerente". Clientes de exemplo do Design System (Marcenaria Bom Jesus, JR Móveis Planejados, Oficina do Cedro) estão sumidos há mais de 60 dias; por isso não aparecem como atendidos em outubro. E-mails de exemplo usam o domínio reservado `example.com`.
10. **Marcas e fornecedores.** Todos inventados (Ferrolar, Deslizza, Puxare, Fixamais, Bordacor, Colaforte, Luzmóvel, Cozimax, Marcenex, Chapa Norte). Os fornecedores das contas são os do Design System (Ferragens Norte, Madeiras do Vale, Parafusos & Cia, Energia (Equatorial), Aluguel da loja), mais Casa do Marceneiro Atacado, Bordas & Colas Nordeste e Luz e Perfil Distribuidora.

## 0 · Base comum (vale para todas as telas)

| Item | Valor | Origem |
| --- | --- | --- |
| Dia e hora | quarta-feira, 21/10/2026, 14h05 | DS |
| Barra de cima | Atualizado às 14h05 · próxima às 15h | DS |
| Seletor de dia (computador) | ‹ Hoje · qua, 21/10/2026 ›, com a seta › desligada | DS |
| Botão do dia (celular) | Hoje · qua, 21/10 e, menor, "atualizado às 14h05" (sem a marca) | DS |
| Quem entrou | Israel, perfil Dono (círculo "IS") | DS |
| Horário da loja | segunda a sexta, 7h às 18h; sábado, 7h às 12h (conta como dia útil inteiro) | novo |
| Dias úteis de outubro | 26; passaram 17 (contando hoje); faltam 9 | DS |
| Dias sem expediente de outubro | domingos 04, 11 e 18, e 12/10 (Nossa Senhora Aparecida); o domingo 25/10 é futuro e no calendário fica só desligado, sem o ponto | DS |
| Setembro | 24 dias úteis; sem expediente em 07/09 (Independência) e 26/09 (inventário da troca de ERP) | DS |
| Maio | sem expediente em 01/05 (Dia do Trabalho); abril, só os domingos | DS |
| Novembro | 24 dias úteis; 02/11 (Finados) marcado; em 20/11 a loja abre e não entra | novo |
| Régua dos estados (provisória) | ritmo: no lugar com 1,00 ou mais, atenção de 0,90 a 0,99, fora abaixo de 0,90; folga: fora com a de 7 dias negativa, atenção com a de 30 dias negativa; curva A em falta: acima de 0 é fora; caixa: quebra acima de R$ 5,00 é fora; saldo: velho depois de 3 dias | TELAS.md, pergunta 5 |

Calendário de outubro de 2026 (semana de segunda a domingo; "sem" = sem expediente; "hoje" = 21/10; depois de hoje, desligado):

| seg | ter | qua | qui | sex | sáb | dom |
| --- | --- | --- | --- | --- | --- | --- |
| 28/09 | 29/09 | 30/09 | 1 | 2 | 3 | 4 sem |
| 5 | 6 | 7 | 8 | 9 | 10 | 11 sem |
| 12 sem | 13 | 14 | 15 | 16 | 17 | 18 sem |
| 19 | 20 | 21 hoje | 22 | 23 | 24 | 25 |
| 26 | 27 | 28 | 29 | 30 | 31 | 01/11 |

## G1 · Entrar

Tela sem números. Textos e exemplos:

| Item | Texto | Origem |
| --- | --- | --- |
| Marca e linha | Kaizen · "Vendas, compras e caixa da loja" | TELAS.md |
| Botões | "Entrar com Google"; separador "ou"; E-mail, Senha, "Entrar"; "Esqueci a senha" | TELAS.md |
| Rodapé fixo | "Acesso liberado pelo Israel. Não há cadastro por aqui." | TELAS.md |
| E-mail digitado no exemplo | israel@example.com | novo |
| Senha errada | "E-mail ou senha não conferem" (o e-mail continua no campo) | TELAS.md |
| Conta sem acesso | "A conta visitante@example.com não tem acesso ao Kaizen. Peça ao Israel." e "Entrar com outra conta" | novo |
| Esqueci a senha | pede o e-mail; depois: "Se este e-mail tiver acesso, o link chega em instantes." | TELAS.md |
| Perfil sem telas ainda | "Seu acesso chega numa próxima etapa" | TELAS.md |
| Bloqueado / expirado | "Seu acesso foi encerrado. Fale com o Israel." · "Seu acesso expirou. Entre de novo." | TELAS.md |
| Servidor fora | "O Kaizen não respondeu. Tente de novo em alguns minutos." | TELAS.md |
| Celular, gerente ou vendedor | "O Kaizen da equipe é usado no computador" | TELAS.md |
| Computador, entregador | "A sua tela é no celular" | TELAS.md |

## I1 · Início

Os três cartões são os da prancha Cartão de pergunta, com os mesmos números. Cabeçalho: "Início" e "qua, 21/10/2026 · 17 de 26 dias úteis" (DS).

### Vendas: como estou em relação à meta?

| Item | Como aparece | Origem |
| --- | --- | --- |
| Marca | Atenção | DS |
| Número | R$ 92,4 mil · de R$ 150 mil · 61,6% da meta | DS |
| Ritmo | Ritmo 0,94 · 17 de 26 dias úteis | DS |
| Hoje | Hoje até 14h05: R$ 4,1 mil em 24 vendas | DS |
| Hoje contra um dia como hoje (só computador) | R$ 4,1 mil contra R$ 3,8 mil num dia como hoje até 14h05 · +R$ 0,3 mil | DS |
| Frase | Vendas um pouco atrás da meta. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil. | DS |
| Exceção | Abaixo do ritmo: Daniele · Fora 0,82 | DS |
| Aberto: barra de meta | Meta R$ 150 mil · R$ 92,4 mil realizado · projeção R$ 143,8 mil (fica R$ 6,2 mil abaixo da meta) | DS (a diferença é novo) |
| Aberto: por vendedor | meta de R$ 75 mil cada · Igor R$ 51,0 mil · 68,0% · ritmo 1,04 · Daniele R$ 40,2 mil · 53,6% · ritmo 0,82 Fora · Outros (sem meta própria) R$ 1,2 mil | DS |
| Itens sem vendedor | nenhum (a linha não aparece) | novo |

### Compras: estou comprando o que gira ou o que encalha?

| Item | Como aparece | Origem |
| --- | --- | --- |
| Marca | Fora | DS |
| Número | 3 produtos · da curva A em falta · "A régua é 0" | DS |
| Frase | Três dos produtos que mais giram estão sem estoque. | DS |
| Exceção | Em falta: Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm (cada um "Fora 0 un.") | DS |
| Aberto: barra das curvas (sem legenda) | Comprou 150 produtos em 90 dias: 66 curva A, 40 B, 31 C e 13 sem venda | DS |
| Aberto: encalhe | Parado há 90 dias: 38 produtos · R$ 24,6 mil | DS |
| Aberto: ruptura | 3 produtos (os mesmos 3 da curva A) | DS |

### Financeiro: tenho dinheiro para pagar as contas?

| Item | Como aparece | Origem |
| --- | --- | --- |
| Marca | No lugar | DS |
| Número | R$ 8,2 mil · de folga em 7 dias | DS |
| Conta | Saldo de 20/10: R$ 41,3 mil − R$ 33,1 mil até 28/10 | DS |
| Frase | Dá para pagar as contas dos próximos 7 dias. | DS |
| Aberto | Folga em 7 dias (até 28/10) R$ 8,2 mil · Folga em 30 dias (até 20/11) R$ 2,2 mil · Saldo do banco em 20/10 R$ 41.300,00 · A vencer até 28/10: 5 contas R$ 33.100,00 · Contas vencidas: nenhuma · Quebra do caixa no fechamento de 20/10 R$ 0,00 (link para F3) | DS |

### Bloco "O que isso significa" (Fase 6)

Texto (DS): "A loja está um pouco atrás da meta, com ritmo de 0,94. O atraso está na Daniele, com ritmo de 0,82; o Igor está adiantado, com 1,04. A projeção fecha em R$ 143,8 mil para a meta de R$ 150 mil." Linha: "escrito pela IA sobre os números das 14h; não calcula". Indisponível: "Texto da IA indisponível agora. Os números continuam valendo."

### Estados do Início

| Estado | Números e textos | Origem |
| --- | --- | --- |
| Sem meta (Vendas) | marca "Sem meta"; "Sem meta para outubro"; "Realizado R$ 92,4 mil · 17 de 26 dias úteis"; "Projeção R$ 143,8 mil"; "Hoje até 14h05: R$ 4,1 mil em 24 vendas"; "Sem a meta do mês não há ritmo."; botão "Cadastrar meta" | DS |
| Sem dado (Financeiro) | marca "Sem dado"; "Sem o saldo de 20/10"; "A pagar até 28/10: R$ 33.100,00"; "O saldo do banco de 20/10 ainda não foi digitado; sem ele não há folga."; "Digitar saldo" | DS |
| Saldo velho (Financeiro) | marca "Saldo velho" (atenção); "Saldo de 12/09: R$ 41,3 mil − R$ 33,1 mil até 28/10"; "O saldo do banco é de 12/09, há 39 dias; a folga pode não valer mais."; "Digitar saldo" | DS |
| Sem venda hoje até agora (outro dia, às 8h05) | "Hoje até 8h05: nenhuma venda ainda" contra R$ 0,3 mil num dia como hoje até 8h05 (no exemplo principal, a primeira venda saiu às 8h12) | novo |
| Dia passado, 15/09 (Vendas) | No lugar · R$ 76,8 mil · de R$ 150 mil · 51,2% da meta · Ritmo 1,02 · 12 de 24 dias úteis · "Vendas no ritmo da meta. A projeção fecha em R$ 153,6 mil para a meta de R$ 150 mil." · faixa "Você está vendo terça, 15/09/2026 · calculado em 20/10 às 22h04" | DS |
| Dia passado, 15/09 (vendedores) | Igor R$ 41,0 mil · 54,7% · ritmo 1,09 · Daniele R$ 34,6 mil · 46,1% · ritmo 0,92 · Outros (sem meta própria) R$ 1,2 mil (Daniele em atenção) | novo |
| Dia passado, 15/09 (Compras) | 90 dias de 18/06 a 15/09: comprou 141 produtos: 63 curva A, 38 B, 29 C e 11 sem venda; no lugar de encalhe e ruptura, "estoque desconhecido antes de 26/09/2026" | novo |
| Dia passado, 15/09 (Financeiro) | Saldo de 14/09: R$ 36,9 mil − R$ 29,4 mil até 22/09 (4 contas) · folga em 7 dias R$ 7,5 mil · folga em 30 dias R$ 1,3 mil · quebra do caixa no fechamento de 15/09 R$ 0,00 | novo |
| Uma pergunta sem resposta | só a coluna dela diz "Sem resposta para este dia" | TELAS.md |

## V1 · Vendas: o desvio

### Resumo (faixa no topo)

| Item | Como aparece | Origem |
| --- | --- | --- |
| Realizado contra a meta | R$ 92,4 mil contra R$ 150 mil de meta · 61,6% | DS |
| Falta | R$ 57,6 mil para a meta (no Número grande: −R$ 57,6 mil) | DS |
| Ritmo | 0,94 contra 1,00 · Atenção −0,06 | DS |
| Dica do ritmo | Ritmo é o realizado dividido pela meta, na proporção dos dias úteis que já passaram. Acima de 1,00 está adiantado. Hoje: 17 de 26 dias úteis. | DS |
| Conta escrita do ritmo | realizado ÷ (meta × 17 de 26 dias úteis) | DS |
| Meta até hoje | R$ 98,1 mil (R$ 98.076,92: R$ 150.000,00 × 17 ÷ 26) | DS |
| Projeção | R$ 143,8 mil · −R$ 6,2 mil da meta | DS (a diferença é novo) |
| Dias úteis | 17 de 26, faltam 9 | DS |
| Para bater a meta (proposta) | R$ 6.400,00 por dia útil restante (R$ 57.600,00 ÷ 9) | novo |

### Como a projeção fecha (para a dica e para conferir)

Realizado até ontem (20/10): R$ 88.300,00. Mais, para cada dia útil de 21/10 a 31/10 (10 dias), a média das últimas 8 semanas do mesmo dia da semana:

| Dia da semana | Média das 8 semanas | Dias que faltam | Soma |
| --- | --- | --- | --- |
| seg | R$ 5.912,50 | 26/10 | R$ 5.912,50 |
| ter | R$ 6.004,80 | 27/10 | R$ 6.004,80 |
| qua | R$ 5.987,60 | 21/10, 28/10 | R$ 11.975,20 |
| qui | R$ 6.093,40 | 22/10, 29/10 | R$ 12.186,80 |
| sex | R$ 6.211,30 | 23/10, 30/10 | R$ 12.422,60 |
| sáb | R$ 3.497,20 | 24/10, 31/10 | R$ 6.994,40 |
| Total |  | 10 dias | R$ 55.496,30 |

Projeção: R$ 88.300,00 + R$ 55.496,30 = R$ 143.796,30 → R$ 143,8 mil. Origem das médias: novo.

### Gráfico do mês: acumulado, meta em degraus e projeção

As vendas de cada dia são as da prancha Gráficos (DS, em mil); o valor exato em reais é novo e arredonda para o mesmo número. A meta sobe R$ 5.769,23 por dia útil (R$ 150.000,00 ÷ 26), em degraus. Projeção pontilhada de R$ 92,4 mil em 21/10 até R$ 143,8 mil em 31/10. Eixo em "R$ 50 mil". Rótulos: "Meta R$ 150 mil", "Projeção R$ 143,8 mil", "Realizado R$ 92,4 mil", "Atenção · ritmo 0,94", "meta até hoje R$ 98,1 mil".

| Dia | Realizado do dia | No gráfico | Acumulado | Meta até o dia | Situação |
| --- | --- | --- | --- | --- | --- |
| qui, 01/10 | R$ 5.812,40 | R$ 5,8 mil | R$ 5.812,40 | R$ 5.769,23 | dia completo |
| sex, 02/10 | R$ 6.168,80 | R$ 6,2 mil | R$ 11.981,20 | R$ 11.538,46 | dia completo |
| sáb, 03/10 | R$ 3.427,50 | R$ 3,4 mil | R$ 15.408,70 | R$ 17.307,69 | sábado (meio expediente) |
| dom, 04/10 | R$ 0,00 | R$ 0,0 mil | R$ 15.408,70 | R$ 17.307,69 | domingo |
| seg, 05/10 | R$ 5.881,10 | R$ 5,9 mil | R$ 21.289,80 | R$ 23.076,92 | dia completo |
| ter, 06/10 | R$ 6.341,30 | R$ 6,3 mil | R$ 27.631,10 | R$ 28.846,15 | dia completo |
| qua, 07/10 | R$ 5.677,40 | R$ 5,7 mil | R$ 33.308,50 | R$ 34.615,38 | dia completo |
| qui, 08/10 | R$ 6.008,70 | R$ 6,0 mil | R$ 39.317,20 | R$ 40.384,62 | dia completo |
| sex, 09/10 | R$ 6.400,00 | R$ 6,4 mil | R$ 45.717,20 | R$ 46.153,85 | dia completo |
| sáb, 10/10 | R$ 3.519,80 | R$ 3,5 mil | R$ 49.237,00 | R$ 51.923,08 | sábado (meio expediente) |
| dom, 11/10 | R$ 0,00 | R$ 0,0 mil | R$ 49.237,00 | R$ 51.923,08 | domingo |
| seg, 12/10 | R$ 0,00 | R$ 0,0 mil | R$ 49.237,00 | R$ 51.923,08 | feriado (sem expediente) |
| ter, 13/10 | R$ 6.133,10 | R$ 6,1 mil | R$ 55.370,10 | R$ 57.692,31 | dia completo |
| qua, 14/10 | R$ 5.785,50 | R$ 5,8 mil | R$ 61.155,60 | R$ 63.461,54 | dia completo |
| qui, 15/10 | R$ 5.972,70 | R$ 6,0 mil | R$ 67.128,30 | R$ 69.230,77 | dia completo |
| sex, 16/10 | R$ 6.204,20 | R$ 6,2 mil | R$ 73.332,50 | R$ 75.000,00 | dia completo |
| sáb, 17/10 | R$ 3.590,20 | R$ 3,6 mil | R$ 76.922,70 | R$ 80.769,23 | sábado (meio expediente) |
| dom, 18/10 | R$ 0,00 | R$ 0,0 mil | R$ 76.922,70 | R$ 80.769,23 | domingo |
| seg, 19/10 | R$ 5.477,30 | R$ 5,5 mil | R$ 82.400,00 | R$ 86.538,46 | dia completo |
| ter, 20/10 | R$ 5.900,00 | R$ 5,9 mil | R$ 88.300,00 | R$ 92.307,69 | dia completo |
| qua, 21/10 | R$ 4.100,00 | R$ 4,1 mil | R$ 92.400,00 | R$ 98.076,92 | hoje, até 14h05 |

Soma de 01 a 21/10: R$ 92.400,00. Média dos 16 dias completos com venda (sem hoje, domingos e 12/10): R$ 5.518,75 → R$ 5,5 mil (DS: "média R$ 5,5 mil · 16 dias completos").

Vendas de hoje por hora (prancha Gráficos; a hora das 14h está em andamento; nenhuma venda das 7h às 8h):

| Hora | Realizado | No gráfico | Vendas |
| --- | --- | --- | --- |
| 8h | R$ 310,00 | R$ 0,3 mil | 2 |
| 9h | R$ 590,00 | R$ 0,6 mil | 4 |
| 10h | R$ 920,00 | R$ 0,9 mil | 5 |
| 11h | R$ 780,00 | R$ 0,8 mil | 4 |
| 12h | R$ 410,00 | R$ 0,4 mil | 3 |
| 13h | R$ 680,00 | R$ 0,7 mil | 5 |
| 14h | R$ 410,00 | R$ 0,4 mil | 1 |
| Total | R$ 4.100,00 | R$ 4,1 mil | 24 |

### Como se forma (vendido − devoluções = realizado)

|  | Vendido | Devoluções | Realizado | Origem |
| --- | --- | --- | --- | --- |
| Mês (01 a 21/10) | R$ 93.540,00 | R$ 1.140,00 | R$ 92.400,00 | novo (realizado: DS) |
| Hoje (até 14h05) | R$ 4.100,00 | R$ 0,00 | R$ 4.100,00 | novo (realizado: DS) |

### Tabela dos vendedores (pior ritmo primeiro)

| Vendedor | Estado | Ritmo | Realizado do mês | Meta | % da meta | Falta | Realizado do dia | Vendas no mês | Clientes atendidos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Daniele | Fora 0,82 | 0,82 | R$ 40.193,80 | R$ 75.000,00 | 53,6% | R$ 34.806,20 | R$ 1.658,70 | 279 | 104 |
| Igor | No lugar | 1,04 | R$ 51.012,40 | R$ 75.000,00 | 68,0% | R$ 23.987,60 | R$ 2.296,40 | 341 | 128 |
| Outros (sem meta própria) | — | — | R$ 1.193,80 | sem meta | — | — | R$ 144,90 | 22 | — |
| **Loja** | Atenção | 0,94 | R$ 92.400,00 | R$ 150.000,00 | 61,6% | R$ 57.600,00 | R$ 4.100,00 | 642 | — |

Origem: realizado do mês (em mil), meta, % e ritmo são DS; o valor exato, falta, dia, vendas e clientes são novo. Linha de Outros: "venda de quem não é vendedor no ERP (hoje, a gerente); conta só na meta da loja". Hoje: Igor 13 vendas, Daniele 10, Outros 1 (total 24). Código no ERP: Igor 11, Daniele 12.

### Estados da V1

Sem o atalho "Padrões de venda": a V3 foi adiada e o link só entra quando ela existir (DECISOES, 03/10).

| Estado | Números e textos | Origem |
| --- | --- | --- |
| Itens sem vendedor (só quando houver; no exemplo principal não há) | "Itens sem vendedor: 3 itens, R$ 112,50 no mês; nenhum hoje · ficam fora do vendido, como no relatório 154 do ERP" | novo |
| Sem meta da loja | sem comparação, ritmo vazio, "Cadastrar meta" (só dono) | TELAS.md |
| Mês sem venda (dia 1, cedo) | Realizado R$ 0,00 · 0 vendas · 1 de 26 dias úteis (o dia de hoje conta) | novo |
| Celular | resumo num cartão; a barra da loja (Meta R$ 150 mil · R$ 92,4 mil realizado · projeção R$ 143,8 mil); um cartão por vendedor: Daniele (Fora 0,82; R$ 40,2 mil · 53,6% · meta R$ 75 mil), Igor (1,04; R$ 51,0 mil · 68,0% · meta R$ 75 mil), Outros R$ 1,2 mil | DS |

## V2 · Detalhe do vendedor

O exemplo principal é a Daniele (é o nome que o Início mostra fora do ritmo). As setas ‹ › levam ao Igor, e dele de volta à Daniele.

### Daniele · vendedora no ERP (código 12)

| Item | Como aparece | Origem |
| --- | --- | --- |
| Realizado contra a meta | R$ 40,2 mil contra R$ 75 mil · 53,6% da meta | DS |
| Ritmo e estado | 0,82 · Fora (abaixo do ritmo) | DS |
| Falta | R$ 34.806,20 (R$ 34,8 mil) | novo |
| Realizado de hoje | R$ 1.658,70 até 14h05, em 10 vendas | novo |
| Vendas no mês | 279 vendas | novo |
| Clientes atendidos no mês | 104 clientes | novo |

| Grupo | R$ Daniele | Parte em Daniele | Parte na loja |
| --- | --- | --- | --- |
| Dobradiças | R$ 6.431,01 | 16,0% | 19,8% |
| Parafusos e fixação | R$ 5.868,29 | 14,6% | 11,0% |
| Corrediças | R$ 5.385,97 | 13,4% | 17,5% |
| Puxadores | R$ 5.185,00 | 12,9% | 13,2% |
| Fitas de borda | R$ 4.863,45 | 12,1% | 9,6% |
| Chapas de MDF | R$ 3.456,67 | 8,6% | 8,9% |
| Colas e adesivos | R$ 3.215,50 | 8,0% | 6,4% |
| Acessórios de cozinha | R$ 2.250,85 | 5,6% | 5,3% |
| Iluminação LED | R$ 1.768,53 | 4,4% | 4,1% |
| Ferramentas e abrasivos | R$ 1.446,98 | 3,6% | 3,6% |
| Sem grupo (produto sem grupo no cadastro) | R$ 321,55 | 0,8% | 0,6% |
| Total | R$ 40.193,80 | 100% | 100% |

### Igor · vendedor no ERP (código 11)

| Item | Como aparece | Origem |
| --- | --- | --- |
| Realizado contra a meta | R$ 51,0 mil contra R$ 75 mil · 68,0% da meta | DS |
| Ritmo e estado | 1,04 · no lugar, sem cor | DS |
| Falta | R$ 23.987,60 (R$ 24,0 mil) | novo |
| Realizado de hoje | R$ 2.296,40 até 14h05, em 13 vendas | novo |
| Vendas no mês | 341 vendas | novo |
| Clientes atendidos no mês | 128 clientes | novo |

| Grupo | R$ Igor | Parte em Igor | Parte na loja |
| --- | --- | --- | --- |
| Dobradiças | R$ 11.774,79 | 23,1% | 19,8% |
| Corrediças | R$ 10.784,03 | 21,1% | 17,5% |
| Puxadores | R$ 6.953,20 | 13,6% | 13,2% |
| Chapas de MDF | R$ 4.763,33 | 9,3% | 8,9% |
| Fitas de borda | R$ 3.884,95 | 7,6% | 9,6% |
| Parafusos e fixação | R$ 3.879,41 | 7,6% | 11,0% |
| Acessórios de cozinha | R$ 2.649,15 | 5,2% | 5,3% |
| Colas e adesivos | R$ 2.458,00 | 4,8% | 6,4% |
| Iluminação LED | R$ 2.021,47 | 4,0% | 4,1% |
| Ferramentas e abrasivos | R$ 1.684,62 | 3,3% | 3,6% |
| Sem grupo (produto sem grupo no cadastro) | R$ 159,45 | 0,3% | 0,6% |
| Total | R$ 51.012,40 | 100% | 100% |

Mix por grupo: novo. Leitura da Daniele: ela vende menos dobradiças e corrediças, os itens de maior valor por venda (16,0% e 13,4% do que vende, contra 19,8% e 17,5% na loja), e mais parafusos, fitas e colas. No celular: o resumo num cartão e os 5 maiores grupos, com "ver todos", sem a coluna da loja.

Fase 8, bloco "Clientes atendidos" da Daniele (novo; marcar como Fase 8): Marcenaria São Francisco R$ 2.180,40; Móveis Planejados Calhau R$ 1.940,00; Oficina Monte Castelo R$ 1.615,20; Marcenaria Ponta d'Areia R$ 1.402,90; Arte em Madeira Renascença R$ 1.288,00; "Ver todos (104)".

Estados: sem meta (ritmo e % vazios, "Cadastrar meta"); sem venda no mês ("Nenhuma venda em outubro até agora").

## C1 · Compras: o desvio

Cabeçalho, como texto fixo: "90 dias até 21/10 (24/07 a 21/10)" (DS). Rodapé: "Estoque conhecido desde 26/09/2026. Valor parado pelo custo atual do cadastro."

### Resposta: a barra das curvas (com legenda, fora do cartão)

| Parte | Produtos | Parte do total | Há 30 dias (90 dias até 21/09) | Origem |
| --- | --- | --- | --- | --- |
| Curva A | 66 | 44,0% | 61 | DS (há 30 dias: novo) |
| Curva B | 40 | 26,7% | 37 | DS (há 30 dias: novo) |
| Curva C | 31 | 20,7% | 30 | DS (há 30 dias: novo) |
| Sem venda | 13 | 8,7% | 10 | DS (há 30 dias: novo) |
| Total | 150 | 100% | 138 | DS (há 30 dias: novo) |

Frase sugerida: "Fora: 3 produtos da curva A em falta. Das compras dos 90 dias, 13 dos 150 produtos não venderam." Comparação: "há 30 dias: 138 produtos comprados, 10 sem venda". Estado da tela: Fora (curva A em falta; a régua é 0).

### Cartões de exceção

| Cartão | Hoje | Há 30 dias | Diferença | Os 5 primeiros (celular) | Origem |
| --- | --- | --- | --- | --- | --- |
| Encalhe | 38 produtos · R$ 24,6 mil parados a custo | 30 produtos · R$ 19,7 mil | +8 produtos · +R$ 4,9 mil | Corrediça oculta 500 mm, Perfil LED de sobrepor 3 m, Chapa MDF 18 mm nogueira rústica, Lixeira de embutir 2 cestos 30 L, Puxador perfil gola 3 m preto | DS (valor há 30 dias e lista: novo) |
| Ruptura | 3 produtos (todos curva A) | 1 produto | +2 produtos | Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm | DS (há 30 dias: novo) |
| Comprados sem venda | 13 produtos | 10 produtos | +3 produtos | Cavilha de madeira 8 × 40 mm, pacote com 100, Cola PVA extra 1 kg, Organizador de gaveta ajustável, Cola instantânea gel 100 g, Puxador alça 160 mm grafite | DS (há 30 dias e lista: novo) |
| Estoque negativo | 2 produtos | 4 produtos | −2 produtos | Dobradiça piano 1 m latonada, Trilho superior de porta de correr 2 m | novo |
| Custo zero | 7 produtos | — | cadastro de hoje, sem comparação | Parafuso chipboard 4 × 50 mm, caixa com 500, Fita de borda 19 mm branco TX, 20 m, Cola branca PVA 500 g, Puxador concha 128 mm preto, Lixa d'água grão 220 | novo |

### Curva ABC dos 90 dias (produtos vendidos)

| Classe | Por valor: produtos | R$ em 90 dias | Parte | Por quantidade: produtos | Unidades | Parte |
| --- | --- | --- | --- | --- | --- | --- |
| A | 98 | R$ 335.500,00 (R$ 335,5 mil) | 79,9% | 84 | 42.150 | 79,8% |
| B | 176 | R$ 63.150,00 (R$ 63,2 mil) | 15,0% | 160 | 7.890 | 14,9% |
| C | 438 | R$ 21.250,00 (R$ 21,3 mil) | 5,1% | 468 | 2.800 | 5,3% |
| Total | 712 | R$ 419.900,00 (R$ 419,9 mil) | 100% | 712 | 52.840 | 100% |

Origem: novo. O total de R$ 419.900,00 é a venda dos 90 dias: 24 a 31/07 R$ 38.600,00 + agosto R$ 140.000,00 + setembro R$ 148.900,00 + outubro até 21/10 R$ 92.400,00. A: até 80% do valor; B: até 95%; C: o resto. Dos 98 produtos curva A, 66 foram comprados nos 90 dias.

### Onde o estoque está parado (os 5 grupos com mais dias de cobertura)

| Grupo | Cobertura | Giro em 90 dias | Produtos em encalhe | Valor parado |
| --- | --- | --- | --- | --- |
| Iluminação LED | 184 dias | 0,50 | 7 | R$ 5.252,60 |
| Acessórios de cozinha | 163 dias | 0,56 | 7 | R$ 5.113,80 |
| Puxadores | 132 dias | 0,69 | 8 | R$ 4.441,60 |
| Ferramentas e abrasivos | 118 dias | 0,77 | 5 | R$ 2.342,60 |
| Colas e adesivos | 97 dias | 0,95 | 3 | R$ 1.206,20 |

Origem: novo (os mesmos números da visão por grupo da C2).

Estados: nenhuma compra nos 90 dias ("Nenhuma nota de entrada nos últimos 90 dias"; os cartões continuam); dia antes de 26/09/2026 (cartões de estoque em cinza, "estoque desconhecido antes de 26/09/2026"); cartão vazio ("Nenhum produto em encalhe"); tudo bem ("Comprando o que gira"). No celular: a barra, a frase e os cartões, cada um com os 5 primeiros (tocar abre a C3).

## C2 · Estoque e giro

Período em texto fixo: "90 dias até 21/10 (24/07 a 21/10)". Busca: "Código ou descrição".

| Visão | Contagem | Ordem | Origem |
| --- | --- | --- | --- |
| Todos | 760 | R$ em 90 dias | novo |
| Curva ABC (valor ou quantidade) | 712 | R$ ou unidades | novo |
| Encalhe | 38 | valor parado | DS |
| Ruptura | 3 | unidades vendidas | DS |
| Comprados nos 90 dias | 150 | R$ em 90 dias | DS |
| Comprados sem venda | 13 | data da compra | DS |
| Estoque negativo | 2 | estoque | novo |
| Custo zero | 7 | código | novo |

"Todos" são os produtos com venda nos 90 dias ou com estoque diferente de zero: 712 com venda + 38 em encalhe + 8 novos ainda sem venda + 2 com estoque negativo e sem venda = 760.

### Linha de totais do filtro

| Visão | Produtos | R$ vendidos em 90 dias | Unidades vendidas | Valor parado | Há 30 dias |
| --- | --- | --- | --- | --- | --- |
| Encalhe | 38 | R$ 0,00 | 0 | R$ 24.620,10 (R$ 24,6 mil) | 30 produtos · R$ 19.740,00 |
| Ruptura | 3 | R$ 30.559,00 | 2.632 | — | 1 produto |
| Todos | 760 | R$ 419.900,00 | 52.840 | R$ 24.620,10 | — |

### Visão Encalhe (38 produtos, do maior valor parado para o menor)

Todos: classe "sem venda", R$ 0,00 e 0 unidades em 90 dias, giro 0,0, cobertura "—" (sem venda). Estoque médio desde 26/09 (estoque conhecido). Marca "comprado em 90 dias" nos 5 que tiveram nota de entrada dentro dos 90 dias.

| Código | Descrição | Grupo | Marca | Fornecedor | Estoque | Estoque médio | Custo | Valor parado | Última venda | Marcas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20500 | Corrediça oculta 500 mm | Corrediças | Deslizza | Ferragens Norte | 34 un. | 29,4 | R$ 58,00 | R$ 1.972,00 | 27/06/2026 | encalhe, comprado em 90 dias (02/10) |
| 70412 | Perfil LED de sobrepor 3 m | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 28 un. | 28,0 | R$ 64,50 | R$ 1.806,00 | 18/05/2026 | encalhe |
| 61820 | Chapa MDF 18 mm nogueira rústica | Chapas de MDF | Chapa Norte | Madeiras do Vale | 6 un. | 6,0 | R$ 289,00 | R$ 1.734,00 | 03/07/2026 | encalhe, comprado em 90 dias (12/08) |
| 50233 | Lixeira de embutir 2 cestos 30 L | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 7 un. | 7,0 | R$ 189,00 | R$ 1.323,00 | 11/06/2026 | encalhe |
| 30960 | Puxador perfil gola 3 m preto | Puxadores | Puxare | Casa do Marceneiro Atacado | 12 un. | 12,0 | R$ 98,00 | R$ 1.176,00 | 22/07/2026 | encalhe |
| 50118 | Porta-talheres 60 cm cinza | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 15 un. | 15,0 | R$ 72,00 | R$ 1.080,00 | 29/05/2026 | encalhe |
| 70225 | Fita LED 5 m 12 V branca fria | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 30 un. | 30,0 | R$ 34,90 | R$ 1.047,00 | 14/07/2026 | encalhe, comprado em 90 dias (16/09) |
| 80340 | Serra copo 35 mm | Ferramentas e abrasivos | Marcenex | Ferragens Norte | 18 un. | 18,0 | R$ 52,00 | R$ 936,00 | 09/06/2026 | encalhe |
| 30455 | Puxador concha 96 mm inox | Puxadores | Puxare | Casa do Marceneiro Atacado | 68 un. | 68,0 | R$ 13,50 | R$ 918,00 | 20/06/2026 | encalhe |
| 50390 | Cesto aramado de canto 4 em 1 | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 4 un. | 4,0 | R$ 228,00 | R$ 912,00 | 30/04/2026 | encalhe |
| 70610 | Spot LED de embutir 3 W | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 40 un. | 40,0 | R$ 19,80 | R$ 792,00 | 05/07/2026 | encalhe |
| 10520 | Dobradiça para vidro 4 mm | Dobradiças | Ferrolar | Ferragens Norte | 48 un. | 48,0 | R$ 15,90 | R$ 763,20 | 17/05/2026 | encalhe |
| 50277 | Suporte regulável para micro-ondas | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 9 un. | 9,0 | R$ 79,00 | R$ 711,00 | 26/06/2026 | encalhe |
| 30188 | Puxador botão de cerâmica branco | Puxadores | Puxare | Casa do Marceneiro Atacado | 85 un. | 85,0 | R$ 7,90 | R$ 671,50 | 08/05/2026 | encalhe |
| 90115 | Cola de contato 2,8 kg | Colas e adesivos | Colaforte | Bordas & Colas Nordeste | 6 un. | 5,3 | R$ 104,00 | R$ 624,00 | 15/07/2026 | encalhe, comprado em 90 dias (29/09) |
| 70733 | Driver LED 60 W 12 V | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 11 un. | 11,0 | R$ 54,00 | R$ 594,00 | 10/06/2026 | encalhe |
| 80412 | Jogo de brocas para madeira, 5 peças | Ferramentas e abrasivos | Marcenex | Ferragens Norte | 14 un. | 14,0 | R$ 39,90 | R$ 558,60 | 21/05/2026 | encalhe |
| 40720 | Fita de borda 22 mm carvalho, 20 m | Fitas de borda | Bordacor | Bordas & Colas Nordeste | 26 un. | 26,0 | R$ 21,00 | R$ 546,00 | 02/07/2026 | encalhe |
| 30612 | Puxador alça 320 mm dourado | Puxadores | Puxare | Casa do Marceneiro Atacado | 21 un. | 21,0 | R$ 24,90 | R$ 522,90 | 12/06/2026 | encalhe |
| 50455 | Escorredor de pratos para armário 80 cm | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 6 un. | 6,0 | R$ 84,00 | R$ 504,00 | 19/05/2026 | encalhe |
| 20350 | Corrediça telescópica 350 mm preta | Corrediças | Deslizza | Ferragens Norte | 22 un. | 22,0 | R$ 21,50 | R$ 473,00 | 04/07/2026 | encalhe |
| 70548 | Sensor de presença para LED | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 16 un. | 16,0 | R$ 28,50 | R$ 456,00 | 27/05/2026 | encalhe |
| 30744 | Puxador cava 1,5 m alumínio | Puxadores | Puxare | Casa do Marceneiro Atacado | 9 un. | 9,0 | R$ 47,00 | R$ 423,00 | 01/07/2026 | encalhe |
| 80266 | Disco de lixa 125 mm grão 120, caixa com 50 | Ferramentas e abrasivos | Marcenex | Ferragens Norte | 11 un. | 11,0 | R$ 36,00 | R$ 396,00 | 23/06/2026 | encalhe |
| 90330 | Silicone acético transparente 280 g | Colas e adesivos | Colaforte | Bordas & Colas Nordeste | 40 un. | 40,0 | R$ 9,20 | R$ 368,00 | 06/07/2026 | encalhe |
| 50612 | Cabideiro retrátil para armário | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 5 un. | 5,0 | R$ 69,00 | R$ 345,00 | 16/06/2026 | encalhe |
| 70318 | Luminária LED sobre bancada 60 cm | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 8 un. | 8,0 | R$ 41,00 | R$ 328,00 | 24/06/2026 | encalhe |
| 30833 | Puxador ponto 32 mm preto | Puxadores | Puxare | Casa do Marceneiro Atacado | 52 un. | 52,0 | R$ 6,10 | R$ 317,20 | 13/05/2026 | encalhe |
| 10612 | Dobradiça de canto 165° | Dobradiças | Ferrolar | Ferragens Norte | 14 un. | 14,0 | R$ 21,90 | R$ 306,60 | 07/07/2026 | encalhe |
| 80551 | Formão 3/4" cabo plástico | Ferramentas e abrasivos | Marcenex | Ferragens Norte | 10 un. | 10,0 | R$ 28,40 | R$ 284,00 | 12/05/2026 | encalhe |
| 40855 | Fita de borda 45 mm branco TX, 50 m | Fitas de borda | Bordacor | Bordas & Colas Nordeste | 6 un. | 6,0 | R$ 46,00 | R$ 276,00 | 25/06/2026 | encalhe |
| 30290 | Puxador de embutir redondo 35 mm latão | Puxadores | Puxare | Casa do Marceneiro Atacado | 38 un. | 38,0 | R$ 6,90 | R$ 262,20 | 09/07/2026 | encalhe |
| 50780 | Pé regulável para armário 100 mm, jogo com 4 | Acessórios de cozinha | Cozimax | Casa do Marceneiro Atacado | 12 un. | 12,0 | R$ 19,90 | R$ 238,80 | 29/06/2026 | encalhe |
| 70815 | Fonte LED 12 V 2 A | Iluminação LED | Luzmóvel | Luz e Perfil Distribuidora | 14 un. | 14,0 | R$ 16,40 | R$ 229,60 | 08/07/2026 | encalhe |
| 90512 | Cola instantânea gel 100 g | Colas e adesivos | Colaforte | Bordas & Colas Nordeste | 18 un. | 12,0 | R$ 11,90 | R$ 214,20 | 30/06/2026 | encalhe, comprado em 90 dias (09/10) |
| 60570 | Parafuso cabeça chata 5 × 70 mm, caixa com 500 | Parafusos e fixação | Fixamais | Parafusos & Cia | 7 un. | 7,0 | R$ 27,50 | R$ 192,50 | 14/06/2026 | encalhe |
| 80714 | Grosa meia-cana 8" | Ferramentas e abrasivos | Marcenex | Ferragens Norte | 7 un. | 7,0 | R$ 24,00 | R$ 168,00 | 18/06/2026 | encalhe |
| 30915 | Puxador concha 64 mm níquel | Puxadores | Puxare | Casa do Marceneiro Atacado | 26 un. | 26,0 | R$ 5,80 | R$ 150,80 | 03/06/2026 | encalhe |
|  | **Total · 38 produtos** |  |  |  | 803 un. |  |  | R$ 24.620,10 |  |  |

### Visão Ruptura (3 produtos, todos curva A)

| Código | Descrição | Grupo | Marca | Fornecedor | Classe (valor / quantidade) | R$ em 90 dias | Unidades | Estoque | Estoque médio | Giro | Cobertura | Última venda |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10235 | Dobradiça 35 mm | Dobradiças | Ferrolar | Ferragens Norte | A / A | R$ 12.880,00 | 1.840 | 0 un. | 150,2 | 12,3 | 0 dias | 19/10/2026 |
| 20450 | Corrediça 450 mm | Corrediças | Deslizza | Ferragens Norte | A / A | R$ 11.124,00 | 412 | 0 un. | 46,2 | 8,9 | 0 dias | 20/10/2026 |
| 30128 | Puxador 128 mm | Puxadores | Puxare | Casa do Marceneiro Atacado | A / A | R$ 6.555,00 | 380 | 0 un. | 41,0 | 9,3 | 0 dias | 17/10/2026 |

### Visão Comprados sem venda (13 produtos)

| Código | Descrição | Grupo | Fornecedor | Compra | Nota | Comprou | Estoque | Por que não está vendendo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 60455 | Cavilha de madeira 8 × 40 mm, pacote com 100 | Parafusos e fixação | Parafusos & Cia | 16/10/2026 | NF 7781 | 30 un. | 30 un. | novo, em carência até 15/12 |
| 90612 | Cola PVA extra 1 kg | Colas e adesivos | Bordas & Colas Nordeste | 15/10/2026 | NF 10018 | 48 un. | 48 un. | novo, em carência até 14/12 |
| 50840 | Organizador de gaveta ajustável | Acessórios de cozinha | Casa do Marceneiro Atacado | 13/10/2026 | NF 5640 | 24 un. | 24 un. | novo, em carência até 12/12 |
| 90512 | Cola instantânea gel 100 g | Colas e adesivos | Bordas & Colas Nordeste | 09/10/2026 | NF 9990 | 12 un. | 18 un. | encalhe (produto antigo, sem venda desde 30/06) |
| 30388 | Puxador alça 160 mm grafite | Puxadores | Casa do Marceneiro Atacado | 08/10/2026 | NF 5612 | 120 un. | 120 un. | novo, em carência até 07/12 |
| 20550 | Corrediça telescópica 550 mm com amortecedor | Corrediças | Ferragens Norte | 06/10/2026 | NF 48390 | 40 un. | 40 un. | novo, em carência até 05/12 |
| 20500 | Corrediça oculta 500 mm | Corrediças | Ferragens Norte | 02/10/2026 | NF 48213 | 20 un. | 34 un. | encalhe (produto antigo, sem venda desde 27/06) |
| 10712 | Dobradiça slide-on 35 mm curva com amortecedor | Dobradiças | Ferragens Norte | 01/10/2026 | NF 48166 | 200 un. | 200 un. | novo, em carência até 30/11 |
| 90115 | Cola de contato 2,8 kg | Colas e adesivos | Bordas & Colas Nordeste | 29/09/2026 | NF 9971 | 6 un. | 6 un. | encalhe (produto antigo, sem venda desde 15/07) |
| 70290 | Perfil LED de embutir 2 m | Iluminação LED | Luz e Perfil Distribuidora | 29/09/2026 | NF 2209 | 40 un. | 40 un. | novo, em carência até 28/11 |
| 40330 | Fita de borda 22 mm freijó, 20 m | Fitas de borda | Bordas & Colas Nordeste | 29/09/2026 | NF 9971 | 60 un. | 60 un. | novo, em carência até 28/11 |
| 70225 | Fita LED 5 m 12 V branca fria | Iluminação LED | Luz e Perfil Distribuidora | 16/09/2026 | NF 2188 | 30 un. | 30 un. | encalhe (produto antigo, sem venda desde 14/07) |
| 61820 | Chapa MDF 18 mm nogueira rústica | Chapas de MDF | Madeiras do Vale | 12/08/2026 | NF 1102 | 6 un. | 6 un. | encalhe (produto antigo, sem venda desde 03/07) |

5 estão em encalhe (já vendiam antes e pararam) e 8 são novos, em carência de 60 dias desde a primeira compra; por isso os 8 não contam no encalhe. Origem: novo (a contagem 13 é DS).

### Visões Estoque negativo e Custo zero

| Código | Descrição | Grupo | Estoque | Última venda | Nota |
| --- | --- | --- | --- | --- | --- |
| 10901 | Dobradiça piano 1 m latonada | Dobradiças | −3 un. | 11/07/2026 | sem venda nos 90 dias; provável erro de contagem no inventário de 26/09 |
| 20990 | Trilho superior de porta de correr 2 m | Corrediças | −2 un. | 02/06/2026 | sem venda nos 90 dias; provável erro de contagem no inventário de 26/09 |

| Código | Descrição | Grupo | Classe por valor | Estoque | Última venda | Custo no cadastro |
| --- | --- | --- | --- | --- | --- | --- |
| 60520 | Parafuso chipboard 4 × 50 mm, caixa com 500 | Parafusos e fixação | B | 64 un. | 20/10/2026 | R$ 0,00 |
| 40118 | Fita de borda 19 mm branco TX, 20 m | Fitas de borda | B | 85 un. | 21/10/2026 | R$ 0,00 |
| 90118 | Cola branca PVA 500 g | Colas e adesivos | C | 40 un. | 16/10/2026 | R$ 0,00 |
| 30512 | Puxador concha 128 mm preto | Puxadores | C | 22 un. | 08/10/2026 | R$ 0,00 |
| 80118 | Lixa d'água grão 220 | Ferramentas e abrasivos | C | 150 un. | 14/10/2026 | R$ 0,00 |
| 60910 | Cantoneira metálica 30 mm, pacote com 10 | Parafusos e fixação | C | 18 un. | 13/10/2026 | R$ 0,00 |
| 99001 | Corte de chapa (serviço) | Sem grupo | C | 0 un. | 21/10/2026 | R$ 0,00 |

Custo zero: lista do cadastro de hoje, sem comparação com 30 dias antes ("o cadastro não guarda histórico"). O "Corte de chapa (serviço)" é serviço e não tem custo mesmo; os outros 6 são erro de cadastro.

### Visão Todos / Curva ABC: os 12 maiores em R$ nos 90 dias

| Código | Descrição | Grupo | Classe (valor / quantidade) | R$ em 90 dias | Unidades | Estoque | Estoque médio | Giro | Cobertura | Última venda | Marcas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10235 | Dobradiça 35 mm | Dobradiças | A / A | R$ 12.880,00 | 1.840 | 0 un. | 150,2 | 12,3 | 0 dias | 19/10/2026 | ruptura |
| 20450 | Corrediça 450 mm | Corrediças | A / A | R$ 11.124,00 | 412 | 0 un. | 46,2 | 8,9 | 0 dias | 20/10/2026 | ruptura |
| 61815 | Chapa MDF 15 mm branco TX | Chapas de MDF | A / B | R$ 10.348,00 | 52 | 18 un. | 21,5 | 2,4 | 31 dias | 21/10/2026 |  |
| 40122 | Fita de borda 22 mm branco TX, 20 m | Fitas de borda | A / A | R$ 9.089,00 | 610 | 240 un. | 255,0 | 2,4 | 35 dias | 21/10/2026 |  |
| 20400 | Corrediça telescópica 400 mm | Corrediças | A / A | R$ 7.650,00 | 300 | 96 un. | 104,0 | 2,9 | 29 dias | 21/10/2026 |  |
| 30128 | Puxador 128 mm | Puxadores | A / A | R$ 6.555,00 | 380 | 0 un. | 41,0 | 9,3 | 0 dias | 17/10/2026 | ruptura |
| 60415 | Parafuso chipboard 4 × 40 mm, caixa com 500 | Parafusos e fixação | A / A | R$ 6.510,00 | 210 | 95 un. | 102,0 | 2,1 | 41 dias | 21/10/2026 |  |
| 61818 | Chapa MDF 18 mm branco TX | Chapas de MDF | A / B | R$ 6.412,00 | 28 | 9 un. | 12,4 | 2,3 | 29 dias | 20/10/2026 |  |
| 90215 | Cola de contato 750 g | Colas e adesivos | A / A | R$ 6.235,00 | 290 | 110 un. | 118,0 | 2,5 | 34 dias | 21/10/2026 |  |
| 10226 | Dobradiça 26 mm reta | Dobradiças | A / A | R$ 5.934,00 | 860 | 400 un. | 420,0 | 2,0 | 42 dias | 21/10/2026 |  |
| 20300 | Corrediça telescópica 300 mm | Corrediças | A / A | R$ 5.500,00 | 250 | 70 un. | 76,0 | 3,3 | 25 dias | 21/10/2026 |  |
| 50320 | Lixeira de embutir 15 L | Acessórios de cozinha | A / B | R$ 5.289,00 | 41 | 12 un. | 13,1 | 3,1 | 26 dias | 19/10/2026 |  |

### Ver por grupo

| Grupo | Produtos | R$ em 90 dias | Unidades | Estoque hoje | Estoque médio | Giro | Cobertura | Em encalhe | Valor parado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dobradiças | 68 | R$ 83.200,00 | 14.200 | 9.800 | 10.300 | 1,38 | 62 dias | 2 | R$ 1.069,80 |
| Corrediças | 54 | R$ 73.500,00 | 6.100 | 4.300 | 4.500 | 1,36 | 63 dias | 2 | R$ 2.445,00 |
| Puxadores | 132 | R$ 55.400,00 | 5.400 | 7.900 | 7.800 | 0,69 | 132 dias | 8 | R$ 4.441,60 |
| Parafusos e fixação | 168 | R$ 46.200,00 | 18.500 | 9.200 | 9.700 | 1,91 | 45 dias | 1 | R$ 192,50 |
| Fitas de borda | 74 | R$ 40.300,00 | 2.900 | 2.100 | 2.200 | 1,32 | 65 dias | 2 | R$ 822,00 |
| Chapas de MDF | 36 | R$ 37.400,00 | 1.150 | 380 | 410 | 2,80 | 30 dias | 1 | R$ 1.734,00 |
| Colas e adesivos | 41 | R$ 26.900,00 | 1.900 | 2.050 | 2.000 | 0,95 | 97 dias | 3 | R$ 1.206,20 |
| Acessórios de cozinha | 63 | R$ 22.300,00 | 640 | 1.160 | 1.150 | 0,56 | 163 dias | 7 | R$ 5.113,80 |
| Iluminação LED | 58 | R$ 17.200,00 | 820 | 1.680 | 1.640 | 0,50 | 184 dias | 7 | R$ 5.252,60 |
| Ferramentas e abrasivos | 59 | R$ 15.100,00 | 1.190 | 1.560 | 1.540 | 0,77 | 118 dias | 5 | R$ 2.342,60 |
| Sem grupo | 7 | R$ 2.400,00 | 40 | 30 | 31 | 1,29 | 68 dias | 0 | R$ 0,00 |
| **Total** | 760 | R$ 419.900,00 | 52.840 |  |  |  |  | 38 | R$ 24.620,10 |

Giro = unidades em 90 dias ÷ estoque médio. Cobertura = estoque de hoje ÷ (unidades em 90 dias ÷ 90), em dias.

### Ver por fornecedor

| Fornecedor | Produtos | R$ em 90 dias | Unidades | Em encalhe | Valor parado |
| --- | --- | --- | --- | --- | --- |
| Ferragens Norte | 212 | R$ 176.200,00 | 21.950 | 9 | R$ 5.857,40 |
| Casa do Marceneiro Atacado | 196 | R$ 78.100,00 | 6.040 | 15 | R$ 9.555,40 |
| Parafusos & Cia | 171 | R$ 48.600,00 | 18.540 | 1 | R$ 192,50 |
| Bordas & Colas Nordeste | 118 | R$ 67.200,00 | 4.800 | 5 | R$ 2.028,20 |
| Madeiras do Vale | 36 | R$ 37.400,00 | 1.150 | 1 | R$ 1.734,00 |
| Luz e Perfil Distribuidora | 27 | R$ 12.400,00 | 360 | 7 | R$ 5.252,60 |
| **Total** | 760 | R$ 419.900,00 | 52.840 | 38 | R$ 24.620,10 |

Estados: visão vazia ("Nenhum produto em ruptura hoje"); busca sem resultado ("Nenhum produto com broca 8"); dia antes de 26/09/2026 (estoque com "—" e visões de estoque desligadas, com a explicação); Custo zero em dia passado (a lista de hoje, com "o cadastro não guarda histórico").

## C3 · Detalhe do produto

Exemplo principal: o produto em encalhe de maior valor parado (o caminho "Por que este produto encalhou?"). No computador, painel à direita da C2.

### 20500 · Corrediça oculta 500 mm

| Item | Como aparece | Origem |
| --- | --- | --- |
| Cabeçalho | 20500 · Corrediça oculta 500 mm · grupo Corrediças · marca Deslizza · fornecedor Ferragens Norte | novo |
| Marca de estado | Encalhe | novo |
| Classes | sem venda (valor e quantidade) | novo |
| Em 90 dias contra os 90 anteriores | R$ 0,00 e 0 un. contra R$ 734,30 e 7 un. (25/04 a 23/07) | novo |
| Estoque | 34 un. (estoque médio desde 26/09: 29,4 un.) | novo |
| Cobertura e giro | cobertura "—" (sem venda) · giro 0,0 | novo |
| Valor parado | R$ 1.972,00 (34 un. × R$ 58,00) | novo |
| Cadastro | custo atual R$ 58,00 · preço R$ 104,90 · primeira entrada 14/04/2026 · última venda sáb, 27/06/2026 | novo |
| Fase 8 | margem em 90 dias e os clientes que mais compram (bloco marcado "Fase 8") | TELAS.md |

| Mês | abr | mai | jun | jul | ago | set | out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unidades | 3 | 5 | 2 | 0 | 0 | 0 | 0 |
| R$ | R$ 314,70 | R$ 524,50 | R$ 209,80 | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |

Estoque por dia desde 26/09 (linha): 14 un. de 26/09 a 01/10; 34 un. de 02/10 a 21/10, com a entrada de 20 un. marcada em 02/10.

| Data | Nota | Fornecedor | Unidades | Valor | Custo unitário |
| --- | --- | --- | --- | --- | --- |
| 02/10/2026 | 48213 | Ferragens Norte | 20 un. | R$ 1.160,00 | R$ 58,00 |
| 14/04/2026 | 3391 | Ferragens Norte | 24 un. | esta nota não guardava valor (ERP anterior) | — |

A história que os números contam: comprou 24 em 14/04, vendeu 10 até 27/06 e parou; na virada havia 14; comprou mais 20 em 02/10 e não vendeu nenhum. A nota 48213 de 02/10 é a mesma conta da Ferragens Norte que vence em 22/10 (R$ 6.480,00, 1 de 1) na F2.

### Segundo exemplo: 10235 · Dobradiça 35 mm (ruptura)

| Item | Como aparece | Origem |
| --- | --- | --- |
| Cabeçalho | 10235 · Dobradiça 35 mm · grupo Dobradiças · marca Ferrolar · fornecedor Ferragens Norte · marca de estado Ruptura | DS (nome) e novo |
| Números | classe A (valor e quantidade) · R$ 12.880,00 e 1.840 un. em 90 dias · estoque 0 un. · estoque médio 150,2 un. · giro 12,3 · cobertura 0 dias | novo |
| Venda por mês (un.) | abr 310 · mai 590 · jun 640 · jul 610 · ago 600 · set 650 · out 410 | novo |
| Estoque por dia | 300 un. em 26/09 · 105 em 05/10 · 275 em 06/10 (entrada de 200) · 140 em 13/10 · 35 em 17/10 · 0 desde 19/10 | novo |
| Entradas | 06/10/2026 · NF 48390 · Ferragens Norte · 200 un. · R$ 1.040,00 · R$ 5,20/un.; 05/09 e 18/07, 600 un. cada, notas do ERP anterior sem valor | novo |
| Cadastro | custo atual R$ 5,20 · preço R$ 7,00 · primeira entrada 14/04/2026 · última venda seg, 19/10/2026 | novo |

### Estado "novo, em carência": 70290 · Perfil LED de embutir 2 m

Grupo Iluminação LED, marca Luzmóvel, fornecedor Luz e Perfil Distribuidora. Primeira compra em 29/09/2026 (NF 2209, 40 un. a R$ 38,00); nenhuma venda ainda; estoque 40 un. Marca: "novo, em carência até 28/11". Frase: "Ainda não está em encalhe: a primeira compra foi há 22 dias, e a carência é de 60." Origem: novo.

Outros estados: sem venda desde abril; dia antes de 26/09 ("estoque desconhecido"); nota do ERP anterior ("esta nota não guardava valor", como nas entradas de 14/04 acima).

## F1 · Financeiro: o desvio

Cabeçalho, discreto: "Posição pelo ERP novo desde 26/09 (até 25/09, pelo ERP anterior)".

### Resposta: as duas folgas

| Item | Como aparece | Origem |
| --- | --- | --- |
| Folga em 7 dias (até 28/10) | R$ 8,2 mil · No lugar | DS |
| Conta escrita | saldo R$ 41.300,00 − R$ 33.100,00 que vencem até 28/10 (nenhuma vencida) | DS |
| Comparação | contra R$ 11,5 mil há 7 dias · −R$ 3,3 mil (sem cor) | DS |
| Folga em 30 dias (até 20/11) | R$ 2,2 mil · no lugar (positiva) | DS |
| Conta escrita | saldo R$ 41.300,00 − R$ 39.100,00 que vencem até 20/11 | novo |
| Comparação da folga em 30 dias | sugestão: sem comparação (ver Pontos de atenção, 4); se houver, −R$ 24,0 mil há 7 dias | novo |
| Aviso do saldo | nenhum: o saldo é de 20/10, há 1 dia | DS |

### Contas a pagar em aberto, em quatro faixas

| Faixa | Parcelas | Valor | Origem |
| --- | --- | --- | --- |
| Vencidas | 0 | R$ 0,00 | DS |
| Até 7 dias (até 28/10) | 5 | R$ 33.100,00 | DS |
| Até 30 dias (até 20/11, inclui as de 7 dias) | 11 | R$ 39.100,00 | DS (valor) e novo (parcelas) |
| Total em aberto | 22 | R$ 84.300,00 | novo |

### Próximos 30 dias: o que vence por dia e o saldo previsto

Linha do saldo previsto com o zero; não cruza o zero. Os pontos até 04/11 são os da prancha Gráficos (DS): "saldo R$ 41,3 mil (20/10)" e "R$ 8,2 mil em 28/10". Barra a mais em 22/10: o cartão a creditar amanhã, R$ 910,00, que não entra na linha.

| Dia | Vence no dia | Parcelas | Saldo previsto | No gráfico |
| --- | --- | --- | --- | --- |
| ter, 20/10 | saldo digitado | — | R$ 41.300,00 | R$ 41,3 mil |
| qui, 22/10 | R$ 6.480,00 | 1 | R$ 34.820,00 | R$ 34,8 mil |
| sex, 23/10 | R$ 2.140,00 | 1 | R$ 32.680,00 | R$ 32,7 mil |
| seg, 26/10 | R$ 9.900,00 | 1 | R$ 22.780,00 | R$ 22,8 mil |
| ter, 27/10 | R$ 3.580,00 | 1 | R$ 19.200,00 | R$ 19,2 mil |
| qua, 28/10 | R$ 11.000,00 | 1 | R$ 8.200,00 | R$ 8,2 mil |
| sex, 30/10 | R$ 1.900,00 | 1 | R$ 6.300,00 | R$ 6,3 mil |
| seg, 02/11 | R$ 2.400,00 | 1 | R$ 3.900,00 | R$ 3,9 mil |
| ter, 10/11 | R$ 1.200,00 | 2 | R$ 2.700,00 | R$ 2,7 mil |
| seg, 16/11 | R$ 300,00 | 1 | R$ 2.400,00 | R$ 2,4 mil |
| qua, 18/11 | R$ 200,00 | 1 | R$ 2.200,00 | R$ 2,2 mil |

Nos outros dias o saldo previsto repete o do dia anterior. Último ponto, 20/11: R$ 2.200,00 = a folga em 30 dias.

### Cartões

| Cartão | Números | Clique | Origem |
| --- | --- | --- | --- |
| Caixa | Quebra do caixa no fechamento de 20/10: R$ 0,00 (bateu nas 4 formas) · gaveta no fechamento: R$ 150,00 · gaveta agora (até 14h05): R$ 270,00 | abre a F3 | DS (quebra) e novo |
| Fluxo do mês (01 a 21/10) | entradas R$ 92.180,00 (Pix R$ 64.730,00, crédito R$ 12.180,00, débito R$ 8.850,00, dinheiro R$ 6.420,00) · saídas R$ 99.240,00 · contra 01 a 21/09: entradas R$ 101.350,00, saídas R$ 94.870,00 | sem clique (F4 adiada) | novo |
| Cartão a creditar amanhã (22/10) | R$ 910,00 (crédito R$ 540,00 + débito R$ 370,00 vendidos hoje até 14h05) | sem clique (F4 adiada) | novo |

Nota no rodapé: "Conta paga e ainda não baixada no ERP continua em aberto e reduz a folga."

### Estados da F1

| Estado | Números e textos | Origem |
| --- | --- | --- |
| Sem saldo | folgas vazias com "falta o saldo do banco"; contas e saídas aparecem: A pagar até 28/10 R$ 33.100,00; até 20/11 R$ 39.100,00 | DS e novo |
| Saldo velho | aviso "Saldo de 12/09, há 39 dias" com "Atualizar saldo"; a folga aparece com o aviso | DS |
| Folga negativa (fora) | com saldo de R$ 29.900,00: folga em 7 dias −R$ 3.200,00; "faltam R$ 3.200,00 para o que vence até 28/10" | novo |
| Nenhuma conta em aberto | "Nenhuma conta a pagar em aberto"; a folga é o próprio saldo, R$ 41.300,00 | novo |
| Tudo bem | "O saldo cobre os próximos 30 dias." (vale no exemplo: as duas folgas são positivas) | novo |
| Sem fechamento hoje | o cartão Caixa mostra o último fechamento, 20/10 (é o caso do exemplo, às 14h05) | novo |

## F2 · Contas a pagar e previsão

### Resumo

| Item | Valor | Origem |
| --- | --- | --- |
| Saldo | R$ 41.300,00 (digitado para 20/10) | DS |
| Vencidas | R$ 0,00 · 0 parcelas | DS |
| Até 7 dias | R$ 33.100,00 · 5 parcelas | DS |
| Até 30 dias | R$ 39.100,00 · 11 parcelas | DS (valor) e novo |
| Total | R$ 84.300,00 · 22 parcelas, contra R$ 88.120,00 (17 parcelas) em 14/10 · −R$ 3.820,00 | novo |
| Folga em 7 dias | R$ 8.200,00 | DS |
| Folga em 30 dias | R$ 2.200,00 | DS |

Recortes: Vencidas (0) · 7 dias (5) · 30 dias (11) · Todas (22). Barra dividida por semana (DS): R$ 8.620,00 de 22 a 23/10 · 26,0% e R$ 24.480,00 de 26 a 28/10 · 74,0%.

### Tabela por vencimento (cada data abre as parcelas)

| Vencimento | Fornecedor | Descrição | Boleto ou nota | Parcela | Valor | Saldo previsto no fim do dia | Origem |
| --- | --- | --- | --- | --- | --- | --- | --- |
| qui, 22/10 | Ferragens Norte | Compra de ferragens | NF 48213 | 1 de 1 | R$ 6.480,00 | R$ 34.820,00 | DS |
| sex, 23/10 | Energia (Equatorial) | Conta de luz de setembro | boleto 0923-118 | — | R$ 2.140,00 | R$ 32.680,00 | DS |
| seg, 26/10 | Madeiras do Vale | Compra de chapas de MDF | NF 1184 | 2 de 4 | R$ 9.900,00 | R$ 22.780,00 | DS |
| ter, 27/10 | Parafusos & Cia | Compra de parafusos | NF 7024 | 3 de 3 | R$ 3.580,00 | R$ 19.200,00 | DS |
| qua, 28/10 | Aluguel da loja | Aluguel de outubro | boleto 1028 | — | R$ 11.000,00 | R$ 8.200,00 | DS |
| sex, 30/10 | Bordas & Colas Nordeste | Compra de fitas e colas | NF 10044 | 1 de 2 | R$ 1.900,00 | R$ 6.300,00 | novo |
| seg, 02/11 | Casa do Marceneiro Atacado | Compra de puxadores | NF 5577 | 2 de 3 | R$ 2.400,00 | R$ 3.900,00 | novo |
| ter, 10/11 | Contador | Honorários de outubro | boleto 1110 | — | R$ 950,00 | R$ 2.700,00 | novo |
| ter, 10/11 | Internet da loja | Fibra de novembro | boleto 8812 | — | R$ 250,00 | R$ 2.700,00 | novo |
| seg, 16/11 | Mensalidade do ERP | Novembro | boleto 4471 | — | R$ 300,00 | R$ 2.400,00 | novo |
| qua, 18/11 | Água da loja | Conta de outubro | boleto 2210 | — | R$ 200,00 | R$ 2.200,00 | novo |
| qui, 26/11 | Madeiras do Vale | Compra de chapas de MDF | NF 1184 | 3 de 4 | R$ 9.900,00 | só no recorte "todas", sem saldo previsto | novo |
| seg, 30/11 | Bordas & Colas Nordeste | Compra de fitas e colas | NF 10044 | 2 de 2 | R$ 1.900,00 | só no recorte "todas", sem saldo previsto | novo |
| seg, 30/11 | Ferragens Norte | Compra de ferragens | NF 48877 | 1 de 3 | R$ 4.200,00 | só no recorte "todas", sem saldo previsto | novo |
| qua, 02/12 | Casa do Marceneiro Atacado | Compra de puxadores | NF 5577 | 3 de 3 | R$ 2.400,00 | só no recorte "todas", sem saldo previsto | novo |
| qui, 03/12 | Parafusos & Cia | Compra de parafusos e cavilhas | NF 7781 | 1 de 2 | R$ 2.100,00 | só no recorte "todas", sem saldo previsto | novo |
| seg, 07/12 | Luz e Perfil Distribuidora | Compra de perfis de LED | NF 2209 | 1 de 2 | R$ 2.150,00 | só no recorte "todas", sem saldo previsto | novo |
| seg, 28/12 | Madeiras do Vale | Compra de chapas de MDF | NF 1184 | 4 de 4 | R$ 9.900,00 | só no recorte "todas", sem saldo previsto | novo |
| qua, 30/12 | Ferragens Norte | Compra de ferragens | NF 48877 | 2 de 3 | R$ 4.200,00 | só no recorte "todas", sem saldo previsto | novo |
| seg, 04/01/2027 | Parafusos & Cia | Compra de parafusos e cavilhas | NF 7781 | 2 de 2 | R$ 2.100,00 | só no recorte "todas", sem saldo previsto | novo |
| qua, 06/01/2027 | Luz e Perfil Distribuidora | Compra de perfis de LED | NF 2209 | 2 de 2 | R$ 2.150,00 | só no recorte "todas", sem saldo previsto | novo |
| sex, 29/01/2027 | Ferragens Norte | Compra de ferragens | NF 48877 | 3 de 3 | R$ 4.200,00 | só no recorte "todas", sem saldo previsto | novo |

Datas com mais de uma parcela: 10/11 (2 parcelas, R$ 1.200,00) e 30/11 (2 parcelas, R$ 6.100,00). Situação de todas: "a vencer". A variante com conta vencida (Madeiras do Vale, seg, 19/10, 1 de 4, R$ 4.950,00, "Vencida há 2 dias", total R$ 38.050,00) é exemplo à parte do Design System e não vale no exemplo principal.

### Como era 7 dias atrás (14/10), para a comparação

| Venceu em | Fornecedor | Documento | Parcela | Valor | Situação |
| --- | --- | --- | --- | --- | --- |
| qua, 14/10 | Ferragens Norte | NF 47530 | 2 de 2 | R$ 7.860,00 | paga |
| qui, 15/10 | Madeiras do Vale | NF 1187 | 1 de 1 | R$ 4.180,00 | paga |
| sex, 16/10 | Luz e Perfil Distribuidora | NF 2161 | 1 de 1 | R$ 3.150,00 | paga |
| seg, 19/10 | Bordas & Colas Nordeste | NF 9932 | 2 de 2 | R$ 2.470,00 | paga |
| seg, 19/10 | Casa do Marceneiro Atacado | NF 5520 | 1 de 1 | R$ 1.620,00 | paga |
| ter, 20/10 | Imposto (Simples) | DAS de setembro (estimativa) | — | R$ 6.840,00 | paga |
|  | **Total pago de 14 a 21/10** |  |  | R$ 26.120,00 |  |

Folga em 7 dias em 14/10: saldo de 13/10 (R$ 37.620,00) − R$ 26.120,00 = R$ 11.500,00 (DS: "R$ 11,5 mil há 7 dias"). Total em aberto em 14/10: R$ 88.120,00 (17 parcelas) = hoje R$ 84.300,00 − R$ 22.300,00 lançadas depois de 14/10 (11 parcelas) + R$ 26.120,00 pagas (6 parcelas).

Estados: nenhuma conta ("Nenhuma conta a pagar em aberto"; gráfico só com o saldo); sem saldo (somem a linha e a coluna do saldo previsto, com "Digitar saldo"); vencidas maiores que zero (faixa no topo; use a variante da Madeiras do Vale); saldo previsto negativo (com o saldo de R$ 29.900,00 do estado da F1, o primeiro dia negativo seria 28/10: −R$ 3.200,00, marcado "fora", e os seguintes também). No celular: cartões por data (valor do dia e saldo previsto); tocar abre as parcelas.

## K1 · Saldo do banco

Linha do alto: "O ERP não sabe o saldo do banco. Digite o saldo para o Kaizen calcular a folga."

| Item | Como aparece | Origem |
| --- | --- | --- |
| Último saldo | R$ 41.300,00 em 20/10/2026, há 1 dia · digitado por Israel em 21/10 às 07h12 | DS (valor e data) e novo |
| Formulário (padrão hoje) | Data 21/10/2026 · Valor R$ 42.780,00 · Salvar | novo |
| Depois de salvar | Saldo salvo. A folga nova aparece na próxima atualização, às 15h. | TELAS.md |
| Data que já tem saldo | Já existe R$ 41.300,00 em 20/10. Substituir? | novo |
| Apagar | Apagar o saldo de 20/10 (R$ 41.300,00)? A folga volta a usar o saldo de 19/10 (R$ 43.150,00). | novo |
| Valor vazio ou com letras | Digite um valor em reais, no formato 41.300,00. | novo |
| Data futura / antes de 01/04/2026 | A data não pode ser depois de hoje (21/10/2026). / A data não pode ser antes de 01/04/2026, o primeiro dia do Kaizen. | novo |
| Valor negativo | Saldo negativo: −R$ 1.250,00. Confirmar? | novo |
| Nenhum saldo ainda | Nenhum saldo digitado ainda. A folga só aparece depois do primeiro. | TELAS.md |
| Celular (folha que sobe de baixo) | "Digitar o saldo do banco" · "Saldo em 20/10/2026" · R$ 0,00 · "A folga em 7 dias passa a usar este saldo." · Cancelar · Salvar | DS |

Histórico das últimas 10 digitações (o exemplo do formulário, de 21/10, ainda não está salvo):

| Data do saldo | Valor | Quem | Quando |  |
| --- | --- | --- | --- | --- |
| ter, 20/10/2026 | R$ 41.300,00 | Israel | 21/10 às 07h12 | Corrigir · Apagar |
| seg, 19/10/2026 | R$ 43.150,00 | Israel | 20/10 às 07h05 | Corrigir · Apagar |
| sex, 16/10/2026 | R$ 42.480,00 | Israel | 17/10 às 08h20 | Corrigir · Apagar |
| qui, 15/10/2026 | R$ 40.950,00 | Israel | 16/10 às 07h30 | Corrigir · Apagar |
| ter, 13/10/2026 | R$ 37.620,00 | Israel | 14/10 às 07h18 | Corrigir · Apagar |
| sex, 09/10/2026 | R$ 39.480,00 | Israel | 10/10 às 08h02 | Corrigir · Apagar |
| qui, 08/10/2026 | R$ 42.170,00 | Israel | 09/10 às 07h25 | Corrigir · Apagar |
| ter, 06/10/2026 | R$ 45.900,00 | Israel | 07/10 às 07h40 | Corrigir · Apagar |
| sex, 02/10/2026 | R$ 46.350,00 | Israel | 03/10 às 08h15 | Corrigir · Apagar |
| qui, 01/10/2026 | R$ 48.000,00 | Israel | 02/10 às 07h10 | Corrigir · Apagar |

O saldo de 13/10 (R$ 37.620,00) é o que a folga de 14/10 usou. O de 01/10 (R$ 48.000,00) é o da ilustração da TELAS.md. Origem do histórico: novo.

## F3 · Caixa da loja

### Hoje, 21/10, às 14h05 (o caixa ainda não fechou)

Frase: "O caixa deste dia ainda não fechou; último fechamento: 20/10.", com o atalho para 20/10. Gaveta agora: vendas em dinheiro R$ 320,00 + suprimentos R$ 150,00 − sangrias R$ 200,00 − devoluções em dinheiro R$ 0,00 = R$ 270,00. Movimentos: 07h03 suprimento R$ 150,00 (troco da abertura); 12h15 sangria R$ 200,00 (para o cofre). Origem: novo.

### Dia: terça, 20/10 (exemplo principal)

Faixa: "Você está vendo terça, 20/10/2026 · calculado em 20/10 às 22h04". Quebra do dia: R$ 0,00 · No lugar (DS) · média do mês: −R$ 2,66 por fechamento (novo). Frase: "Bateu nas 4 formas."

Cartão do fechamento nº 215: Caixa 1 · operador: gerente · abertura 07h02 → fechamento 18h14 · quebra do turno R$ 0,00.

| Forma | Calculado | Informado | Quebra |
| --- | --- | --- | --- |
| Dinheiro | R$ 150,00 | R$ 150,00 | R$ 0,00 |
| Pix | R$ 4.190,00 | R$ 4.190,00 | R$ 0,00 |
| Crédito | R$ 760,00 | R$ 760,00 | R$ 0,00 |
| Débito | R$ 560,00 | R$ 560,00 | R$ 0,00 |
| **Total** | R$ 5.660,00 | R$ 5.660,00 | R$ 0,00 |

No dinheiro, o calculado é a gaveta esperada (o operador conta a gaveta); nas outras formas, o que foi vendido nelas. Vendas do dia por forma: Pix R$ 4.190,00, crédito R$ 760,00, débito R$ 560,00, dinheiro R$ 470,00 = vendido R$ 5.980,00; menos devoluções R$ 80,00 = realizado R$ 5.900,00 (R$ 5,9 mil na barra de 20/10 da V1).

Gaveta escrita como conta: vendas em dinheiro R$ 470,00 + suprimentos R$ 150,00 − sangrias R$ 390,00 − devoluções em dinheiro R$ 80,00 = gaveta R$ 150,00.

| Hora | Tipo | Valor | Operador | Observação |
| --- | --- | --- | --- | --- |
| 07h02 | Suprimento | R$ 150,00 | gerente | troco da abertura |
| 12h20 | Sangria | R$ 200,00 | gerente | para o cofre |
| 17h55 | Sangria | R$ 190,00 | gerente | para o cofre, fim do dia |

### Mês: outubro até 20/10

| Forma | Quebra acumulada |
| --- | --- |
| Dinheiro | −R$ 4,50 |
| Pix | R$ 0,00 |
| Crédito | R$ 0,00 |
| Débito | −R$ 38,00 |
| **Total** | −R$ 42,50 |

16 fechamentos; média −R$ 2,66 por fechamento. Tolerância provisória: quebra acima de R$ 5,00, para mais ou para menos, é fora. Gráfico da quebra por dia: zero em 12 dias; 02/10 −R$ 5,00; 07/10 +R$ 2,00; 09/10 −R$ 38,00 (fora); 15/10 −R$ 1,50.

| Dia | Fechamento | Caixa | Operador | Abertura → fechamento | Quebra | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| qui, 01/10 | nº 200 | Caixa 1 | gerente | 07h01 → 18h10 | R$ 0,00 | — |
| sex, 02/10 | nº 201 | Caixa 1 | gerente | 07h02 → 18h11 | −R$ 5,00 | — |
| sáb, 03/10 | nº 202 | Caixa 1 | gerente | 07h03 → 12h12 | R$ 0,00 | — |
| seg, 05/10 | nº 203 | Caixa 1 | gerente | 07h04 → 18h13 | R$ 0,00 | — |
| ter, 06/10 | nº 204 | Caixa 1 | gerente | 07h05 → 18h14 | R$ 0,00 | — |
| qua, 07/10 | nº 205 | Caixa 1 | gerente | 07h01 → 18h15 | +R$ 2,00 | — |
| qui, 08/10 | nº 206 | Caixa 1 | gerente | 07h02 → 18h10 | R$ 0,00 | — |
| sex, 09/10 | nº 207 | Caixa 1 | gerente | 07h03 → 18h11 | −R$ 38,00 | Fora |
| sáb, 10/10 | nº 208 | Caixa 1 | gerente | 07h04 → 12h12 | R$ 0,00 | — |
| ter, 13/10 | nº 209 | Caixa 1 | gerente | 07h05 → 18h13 | R$ 0,00 | — |
| qua, 14/10 | nº 210 | Caixa 1 | gerente | 07h01 → 18h14 | R$ 0,00 | — |
| qui, 15/10 | nº 211 | Caixa 1 | gerente | 07h02 → 18h15 | −R$ 1,50 | — |
| sex, 16/10 | nº 212 | Caixa 1 | gerente | 07h03 → 18h10 | R$ 0,00 | — |
| sáb, 17/10 | nº 213 | Caixa 1 | gerente | 07h04 → 12h11 | R$ 0,00 | — |
| seg, 19/10 | nº 214 | Caixa 1 | gerente | 07h05 → 18h12 | R$ 0,00 | — |
| ter, 20/10 | nº 215 | Caixa 1 | gerente | 07h02 → 18h14 | R$ 0,00 | — |

### Estado "quebra fora da tolerância": sexta, 09/10

| Forma | Calculado | Informado | Quebra |
| --- | --- | --- | --- |
| Dinheiro | R$ 150,00 | R$ 150,00 | R$ 0,00 |
| Pix | R$ 4.500,00 | R$ 4.500,00 | R$ 0,00 |
| Crédito | R$ 790,00 | R$ 790,00 | R$ 0,00 |
| Débito | R$ 690,00 | R$ 652,00 | −R$ 38,00 · Fora |
| **Total** | R$ 6.130,00 | R$ 6.092,00 | −R$ 38,00 |

Fechamento nº 207, Caixa 1, operador gerente. Faltaram R$ 38,00 no débito. Gaveta: R$ 450,00 + R$ 150,00 − R$ 420,00 − R$ 30,00 = R$ 150,00. Vendido R$ 6.430,00 − devoluções R$ 30,00 = R$ 6.400,00 (R$ 6,4 mil na V1).

Nota fixa: "O fechamento é às cegas: o informado é a contagem do operador; a linha de troca fica fora." No celular, só o dia: um cartão por fechamento e a gaveta.

## K2 · Metas e feriados

Seletor "‹ outubro de 2026 ›" (a lista vai de abril de 2026 a outubro de 2027). Só computador.

### Metas de outubro de 2026

| Linha | Meta (campo) | Realizado em julho | Agosto | Setembro | Origem |
| --- | --- | --- | --- | --- | --- |
| Loja | R$ 150.000,00 | R$ 145.000,00 | R$ 140.000,00 | R$ 148.900,00 | DS (meta) e novo |
| Igor | R$ 75.000,00 | R$ 76.200,00 | R$ 72.800,00 | R$ 78.400,00 | DS (meta) e novo |
| Daniele | R$ 75.000,00 | R$ 66.100,00 | R$ 64.900,00 | R$ 68.000,00 | DS (meta) e novo |

O realizado da loja inclui Outros (julho R$ 2.700,00, agosto R$ 2.300,00, setembro R$ 2.500,00). Conferência: soma das metas dos vendedores R$ 150.000,00 · meta da loja R$ 150.000,00 · diferença R$ 0,00 ("venda de quem não é vendedor no ERP conta só na meta da loja"). Botões: Salvar · Copiar do mês anterior · Desfazer.

### Dias sem expediente de outubro

Calendário do mês com os domingos apagados (04, 11, 18 e 25) e 12/10 fechado, com a descrição "Nossa Senhora Aparecida". "Dias úteis no mês: 26". Lista dos dias fechados: "seg, 12/10 · Nossa Senhora Aparecida · Remover". Regra à vista: "Marque só os dias em que a loja não abre. Feriado em que a loja abriu não entra." (DS)

| Mês | Metas | Dias fechados | Dias úteis | O que a tela mostra | Origem |
| --- | --- | --- | --- | --- | --- |
| setembro de 2026 (passado) | loja R$ 150.000,00; Igor R$ 75.000,00; Daniele R$ 75.000,00 | seg, 07/09 · Independência; sáb, 26/09 · Inventário da troca de ERP | 24 | mudar algo pede: "Isso muda o ritmo e a projeção de todos os dias de setembro" | DS (dias e loja) e novo |
| novembro de 2026 (próximo) | loja R$ 145.000,00; Igor R$ 72.500,00; Daniele R$ 72.500,00 (já digitadas; conferência: R$ 145.000,00 nos vendedores, diferença R$ 0,00) | seg, 02/11 · Finados (em 20/11 a loja abre) | 24 | menores que as de outubro porque novembro tem 24 dias úteis; realizado dos 3 meses anteriores: agosto R$ 140.000,00, setembro R$ 148.900,00 e outubro até 21/10 R$ 92.400,00 | novo |
| dezembro de 2026 | vazias | sex, 25/12 · Natal | 26 | "Sem meta, o ritmo fica vazio." e "Copiar do mês anterior" (traz R$ 145.000,00, R$ 72.500,00 e R$ 72.500,00) | novo |
| abril a agosto de 2026 | vazias (sem meta cadastrada) | maio: sex, 01/05 · Dia do Trabalho | — | "Sem meta, o ritmo fica vazio." | DS (01/05) e novo |

### Mensagens e o ajuste da prancha Formulário

| Momento | Texto | Origem |
| --- | --- | --- |
| Efeito ao digitar a meta do Igor | O ritmo do Igor passa a ser medido contra R$ 60 mil, em vez de R$ 75 mil. | DS |
| Confirmação | A meta de outubro do Igor muda de R$ 75.000,00 para R$ 60.000,00. Confirmar? | DS |
| Conferência depois desse ajuste | soma dos vendedores R$ 135.000,00 · loja R$ 150.000,00 · diferença R$ 15.000,00 | novo |
| Erro no campo | Digite um valor maior que zero, no formato 60.000,00. | DS |
| Gravação falhou | A gravação falhou e nada foi alterado. O que você digitou continua nos campos; tente de novo. | DS |
| Salvo | "Metas de outubro salvas" · a conferência do servidor · "vale a partir das 15h" · "ver o desvio" (abre a V1) | TELAS.md |
| Dia de segunda a sábado clicado | "Loja fechada neste dia?" com campo de descrição | TELAS.md |
| Dia fechado clicado | "Reabrir este dia", com confirmação | TELAS.md |
| Vendedor novo no ERP / que deixou de ser | linha marcada "novo no ERP" / "a meta dele não entra no ritmo" | TELAS.md |

## Conferências

O script `conferir_dados.py` lê o `dados-exemplo.json`, refaz cada conta e compara com os números do Design System, tirados das próprias pranchas. Resultado da última rodada:

- vendas de cada dia (01 a 21/10) iguais às da prancha Gráficos: ok
- valor exato de cada dia arredonda para o da prancha Gráficos (21 dias): ok
- dias úteis de outubro iguais aos da prancha Gráficos (26 dias): ok
- vendas de hoje por hora iguais às da prancha Gráficos (8h a 14h): ok
- saldo previsto de 20/10 a 04/11 igual ao da prancha Gráficos (16 pontos, arredondado): ok
- as 5 contas (fornecedor, dia, parcela, valor) iguais às da prancha Tabela: ok
- total da prancha Tabela "Total · 5 contas R$ 33.100,00" igual ao livro: ok
- curvas da prancha Barra dividida: 66 A · 44,0%, 40 B · 26,7%, 31 C · 20,7%, 13 sem venda · 8,7%: ok
- contas por semana da prancha Barra dividida: R$ 8.620,00 (26,0%) e R$ 24.480,00 (74,0%): ok
- 21 números do Cartão de pergunta (Vendas, Compras, Financeiro e estados) iguais aos do livro: ok
- 9 números da prancha Número grande (−R$ 57,6 mil, −0,06, R$ 11,5 mil, −R$ 3,3 mil, +8 produtos, +R$ 0,3 mil...) batem com o livro: ok
- linhas da prancha Indicador (Loja 0,94 · 61,6%; Igor 1,04 · 68,0%; Daniele 0,82 · 53,6%) iguais às do livro: ok
- visões da prancha Abas e filtros (Encalhe 38, Ruptura 3, Comprados sem venda 13) e o período "90 dias até 21/10 (24/07 a 21/10)": ok
- cartão de 15/09 da Moldura do celular (R$ 76,8 mil, 51,2%, ritmo 1,02, 12 de 24, projeção R$ 153,6 mil, faixa) igual ao livro: ok
- parágrafo "Dados de exemplo" do README: meta, realizado, ritmo, projeção, vendedores, compras, saldo, folga, quebra e dias sem expediente iguais ao livro: ok
- lista "fictícios de propósito" do README: R$ 3,8 mil, R$ 11,5 mil há 7 dias, 30 parados há 30 dias, média R$ 5,5 mil dos 16 dias, folga em 30 dias R$ 2,2 mil: ok
- textos do ajuste da meta do Igor (prancha Formulário) iguais aos do livro: ok
- texto da IA e dica do ritmo (pranchas Bloco IA e Dica) citados no livro iguais aos das pranchas: ok
- cliente de exemplo do Design System: Marcenaria Bom Jesus sumida há 74 dias, última compra sáb, 08/08/2026 (fecha com 21/10): ok
- 21/10/2026 é quarta-feira; 15/09/2026 é terça; 18/10/2026 é domingo; 12/10/2026 é segunda: ok
- outubro: 26 dias úteis (segunda a sábado, menos 12/10); 17 até 21/10, contando hoje; faltam 9: ok
- setembro: 24 dias úteis (menos 07/09 e 26/09); 12 até 15/09: ok
- novembro: 24 dias úteis com 02/11 fechado (5 domingos): ok
- período de compras: de 24/07 a 21/10 são 90 dias: ok
- saldo velho: de 12/09 a 21/10 são 39 dias: ok
- nenhuma venda em domingo nem em 12/10; venda em todos os outros dias de 01 a 21/10: ok
- nenhuma das 28 contas vence em domingo: ok
- compras dos 90 dias em dia de loja aberta e nunca em 26 ou 27/09 (inventário e domingo da troca de ERP): ok
- saldos do banco digitados para dias de loja aberta, e digitados no dia seguinte: ok
- fechamentos de caixa só em dias de loja aberta, um por dia, de 01 a 20/10: ok
- vendas por dia de 01 a 21/10 somam R$ 92,4 mil (R$ 92.400,00 exatos): ok
- média dos 16 dias completos com venda = R$ 5.518,75 → R$ 5,5 mil: ok
- acumulado dia a dia confere com a soma das vendas de cada dia: ok
- meta em degraus: sobe R$ 5.769,23 por dia útil; até 21/10 = R$ 98.076,92 → R$ 98,1 mil: ok
- vendas de hoje por hora somam R$ 4.100,00 em 24 vendas: ok
- percentual da loja: 92.400 ÷ 150.000 = 61,6%: ok
- ritmo da loja: 92.400 ÷ (150.000 × 17 ÷ 26) = 0,9421 → 0,94, atenção (0,90 a 0,99): ok
- Igor: R$ 51.012,40 ÷ R$ 75.000,00 = 68,0%; ritmo 1,0403 → 1,04 (no lugar); falta R$ 23.987,60: ok
- Daniele: R$ 40.193,80 ÷ R$ 75.000,00 = 53,6%; ritmo 0,8196 → 0,82 (fora); falta R$ 34.806,20: ok
- canônicos dos vendedores: Igor R$ 51,0 mil · 68,0% · 1,04; Daniele R$ 40,2 mil · 53,6% · 0,82 (fora); Outros R$ 1,2 mil: ok
- vendedores + Outros = loja no mês (R$ 51.012,40 + R$ 40.193,80 + R$ 1.193,80 = R$ 92.400,00): ok
- vendedores + Outros = loja hoje (R$ 2.296,40 + R$ 1.658,70 + R$ 144,90 = R$ 4.100,00): ok
- vendas no mês: 341 + 279 + 22 = 642; hoje: 13 + 10 + 1 = 24: ok
- falta da loja R$ 57.600,00 (−R$ 57,6 mil) e R$ 6.400,00 por dia útil restante (÷ 9): ok
- vendido − devoluções = realizado: mês R$ 93.540,00 − R$ 1.140,00 = R$ 92.400,00; hoje R$ 4.100,00 − R$ 0,00: ok
- projeção pela regra do Kaizen: R$ 88.300,00 até ontem + médias de 8 semanas dos 10 dias úteis de 21 a 31/10 = R$ 143.796,30 → R$ 143,8 mil: ok
- projeção − meta = −R$ 6.203,70 → −R$ 6,2 mil: ok
- médias de 8 semanas plausíveis contra outubro (cada uma a menos de R$ 400,00 da média dos mesmos dias de outubro): ok
- hoje contra um dia como hoje: R$ 4,1 mil − R$ 3,8 mil = +R$ 0,3 mil: ok
- formas de hoje somam R$ 4.100,00 (Pix 70,0%, cartão 22,2%, dinheiro 7,8%): ok
- cartão a creditar amanhã = crédito + débito de hoje = R$ 910,00: ok
- mix por grupo: em cada um dos 11 grupos, Igor + Daniele + Outros = loja: ok
- mix: os grupos somam o realizado de cada um (loja R$ 92.400,00, Igor R$ 51.012,40, Daniele R$ 40.193,80, Outros R$ 1.193,80): ok
- mix: partes recalculadas e cada coluna soma 100% (± 0,2 de arredondamento): ok
- julho, agosto e setembro: Igor + Daniele + Outros = loja (R$ 145,0, 140,0 e 148,9 mil): ok
- 15/09: R$ 76,8 mil ÷ R$ 150 mil = 51,2%; ritmo 76,8 ÷ (150 × 12 ÷ 24) = 1,02; projeção em linha reta 76,8 ÷ 12 × 24 = R$ 153,6 mil: ok
- 15/09: Igor R$ 41,0 mil (54,7%, 1,09) + Daniele R$ 34,6 mil (46,1%, 0,92) + Outros R$ 1,2 mil = R$ 76,8 mil: ok
- 15/09: folga em 7 dias R$ 36.900,00 − R$ 29.400,00 = R$ 7.500,00; em 30 dias − R$ 35.600,00 = R$ 1.300,00; 63 + 38 + 29 + 11 = 141 comprados: ok
- comprados em 90 dias: 66 A + 40 B + 31 C + 13 sem venda = 150: ok
- partes da barra das curvas: 66 ÷ 150 = 44,0%; 40 ÷ 150 = 26,7%; 31 ÷ 150 = 20,7%; 13 ÷ 150 = 8,7% (somam 100,1% pelo arredondamento, como no Design System): ok
- há 30 dias: 61 + 37 + 30 + 10 = 138 comprados; 10 sem venda = a comparação do cartão Comprados sem venda: ok
- encalhe: 38 produtos, cada um com valor parado = estoque × custo: ok
- os 38 produtos parados somam R$ 24.620,10 → R$ 24,6 mil: ok
- encalhe: todos com estoque acima de zero, nenhuma venda desde 24/07 e lista em ordem de valor parado: ok
- encalhe há 30 dias: 30 produtos e R$ 19.740,00 → +8 produtos e +R$ 4,9 mil: ok
- encalhe com compra nos 90 dias: 5 produtos, todos antigos (vendiam antes) e com a compra dentro de 24/07 a 21/10; nota da Link sem valor, do ERP novo com valor = unidades × custo: ok
- estoque médio de cada produto parado = média do estoque no fim de cada dia, de 26/09 a 21/10 (26 dias): ok
- comprados sem venda: 5 em encalhe + 8 novos em carência = 13: ok
- novos: primeira compra a menos de 60 dias de 21/10, a partir de 28/09, sem venda; carência até a primeira compra + 60 dias: ok
- estoque médio dos 8 novos confere com a data da primeira compra: ok
- produto novo da C3: 29/09 + 60 dias = 28/11; primeira compra há 22 dias: ok
- ruptura: 3 produtos (Dobradiça 35 mm, Corrediça 450 mm, Puxador 128 mm), todos curva A, estoque 0, cobertura 0 e venda nos 90 dias: ok
- ruptura na mesma ordem por R$ e por unidades (a ordem do cartão do Início e da visão Ruptura): ok
- giro da ruptura = unidades ÷ estoque médio (12,3; 8,9; 9,3): ok
- ruptura há 30 dias: 1 → +2; comprados sem venda há 30 dias: 10 → +3; estoque negativo há 30 dias: 4 → −2: ok
- estoque negativo: 2 produtos, abaixo de zero e sem venda nos 90 dias (por isso fora da ruptura): ok
- custo zero: 7 produtos, todos com custo R$ 0,00 no cadastro: ok
- visão Todos: 712 com venda + 38 em encalhe + 8 novos sem venda + 2 negativos sem venda = 760: ok
- curva ABC por valor: 98 + 176 + 438 = 712 produtos; R$ 335.500,00 + R$ 63.150,00 + R$ 21.250,00 = R$ 419.900,00: ok
- curva ABC por quantidade: 84 + 160 + 468 = 712 produtos; 42.150 + 7.890 + 2.800 = 52.840 unidades: ok
- curva ABC: A até 80% e A + B até 95% (por valor: 79,9% e 94,9%; por quantidade: 79,8% e 94,7%), partes recalculadas: ok
- a venda dos 90 dias (R$ 419.900,00) = 24 a 31/07 R$ 38.600,00 + agosto + setembro + outubro até 21/10 (R$ 92.400,00); agosto e setembro iguais aos da K2: ok
- compras por classe cabem na curva: 66 ≤ 98 produtos A; 40 ≤ 176 B; 31 ≤ 438 C: ok
- visão por grupo: 760 produtos, 52.840 unidades e R$ 419.900,00 nos 11 grupos: ok
- visão por grupo: produtos em encalhe e valor parado de cada grupo = os da lista dos 38 (somam 38 e R$ 24.620,10): ok
- visão por grupo: giro = unidades ÷ estoque médio e cobertura = estoque ÷ (unidades ÷ 90), recalculados nos 11 grupos: ok
- "Onde o estoque está parado" = os 5 grupos de maior cobertura (Iluminação LED 184, Acessórios 163, Puxadores 132, Ferramentas 118, Colas 97 dias): ok
- visão por fornecedor: 760 produtos, 52.840 unidades, R$ 419.900,00; encalhe e valor parado de cada um = os da lista: ok
- 12 maiores em R$: em ordem decrescente, com os 3 da ruptura, giro e cobertura recalculados; nenhum deles passa da classe A por valor: ok
- C3 (Corrediça oculta 500 mm): estoque 14 até 01/10 e 34 desde 02/10; estoque médio 29,4; valor parado 34 × R$ 58,00 = R$ 1.972,00: ok
- C3: comprou 24 (14/04), vendeu 10 (abr 3 + mai 5 + jun 2), sobraram 14 na troca de ERP, +20 em 02/10 = 34; nota de 02/10: 20 × R$ 58,00 = R$ 1.160,00: ok
- C3: 90 anteriores = 7 un. × R$ 104,90 = R$ 734,30; venda por mês × preço: ok
- C3: a nota 48213 (02/10) é a conta da Ferragens Norte que vence em 22/10, R$ 6.480,00, lançada em 02/10: ok
- C3, Dobradiça 35 mm: 300 na troca de ERP + 200 em 06/10 − 500 vendidas = 0 em 19/10; estoque nunca negativo; estoque médio 150,2; giro 1.840 ÷ 150,2 = 12,3: ok
- C3, Dobradiça 35 mm: 180 + 600 + 650 + 410 = 1.840 un. em 90 dias × R$ 7,00 = R$ 12.880,00; outubro = vendas de 01 a 19/10: ok
- as 5 contas de 22 a 28/10 somam R$ 33.100,00 (6.480 + 2.140 + 9.900 + 3.580 + 11.000); nenhuma vencida: ok
- folga em 7 dias = R$ 41.300,00 − R$ 33.100,00 = R$ 8.200,00: ok
- até 20/11: 11 parcelas somam R$ 39.100,00; folga em 30 dias = R$ 41.300,00 − R$ 39.100,00 = R$ 2.200,00: ok
- total em aberto: 22 parcelas, R$ 84.300,00: ok
- saldo previsto dia a dia (20/10 a 20/11) = saldo − contas acumuladas; 28/10 = folga em 7 dias; 20/11 = folga em 30 dias; nunca abaixo de zero: ok
- o cartão a creditar (R$ 910,00) fica fora da linha: com ele, 28/10 daria R$ 9,1 mil, e não R$ 8,2 mil: ok
- contas por semana: R$ 8.620,00 (22 e 23/10) + R$ 24.480,00 (26 a 28/10) = R$ 33.100,00; 26,0% e 74,0%: ok
- folga de 7 dias atrás: saldo de 13/10 R$ 37.620,00 − 6 contas de 14 a 21/10 (R$ 26.120,00, já pagas) = R$ 11.500,00 → R$ 11,5 mil; diferença −R$ 3,3 mil: ok
- o saldo que a folga de 14/10 usou é o último digitado até 14/10: o de 13/10, R$ 37.620,00: ok
- total de 14/10: R$ 84.300,00 − R$ 22.300,00 lançadas depois (11 parcelas) + R$ 26.120,00 pagas (6) = R$ 88.120,00 em 17 parcelas; diferença −R$ 3.820,00: ok
- folga em 30 dias de 7 dias atrás: R$ 11.500,00 − R$ 35.500,00 (contas de 22/10 a 13/11 já lançadas em 14/10) = −R$ 24.000,00: ok
- contas lançadas até hoje e com vencimento depois do lançamento: ok
- parcelas da mesma nota têm o mesmo valor e numeração sem buraco (NF 1184: 2, 3 e 4 de 4; NF 48877: 1 a 3 de 3; NF 7781, NF 2209, NF 10044 e NF 5577): ok
- folga negativa (estado): com saldo de R$ 29.900,00, folga em 7 dias = −R$ 3.200,00 e o primeiro dia negativo do saldo previsto é 28/10: ok
- fluxo do mês: entradas por forma somam R$ 92.180,00 (Pix 70,2%, cartão 22,8%, dinheiro 7,0%; a loja: 70/22/7): ok
- K1: 10 saldos, do mais novo ao mais velho; o último é R$ 41.300,00 para 20/10, digitado em 21/10 às 07h12; o de 19/10 é R$ 43.150,00 (texto do Apagar); o de 01/10 é R$ 48.000,00: ok
- fechamento de 20/10: quebra de cada forma = informado − calculado; total R$ 0,00 (bateu nas 4 formas): ok
- gaveta de 20/10: R$ 470,00 + R$ 150,00 − R$ 390,00 − R$ 80,00 = R$ 150,00 = o calculado do dinheiro: ok
- movimentos de 20/10: suprimento R$ 150,00 e sangrias R$ 200,00 + R$ 190,00 = R$ 390,00, iguais aos da gaveta: ok
- 20/10: vendas por forma somam o vendido (R$ 5.980,00); − R$ 80,00 de devolução = R$ 5.900,00 = a barra de 20/10 da V1; Pix, crédito e débito calculados = vendidos: ok
- 09/10 (fora): débito R$ 652,00 − R$ 690,00 = −R$ 38,00, acima da tolerância de R$ 5,00; gaveta R$ 150,00; vendido − devoluções = R$ 6.400,00 = a barra de 09/10 da V1: ok
- mês: 16 fechamentos; quebras somam −R$ 42,50 (dinheiro −R$ 4,50; débito −R$ 38,00); média −R$ 2,66 por fechamento: ok
- mês: só 09/10 passa da tolerância de R$ 5,00 (02/10 tem −R$ 5,00, que não passa); quebra de 20/10 = R$ 0,00: ok
- mês: números de fechamento em sequência (nº 200 a 215) e o de 20/10 é o do cartão: ok
- gaveta de hoje até 14h05: R$ 320,00 (= dinheiro das vendas de hoje) + R$ 150,00 − R$ 200,00 = R$ 270,00: ok
- K2 outubro: Igor R$ 75.000,00 + Daniele R$ 75.000,00 = R$ 150.000,00 = meta da loja; diferença R$ 0,00: ok
- K2 depois do ajuste do Igor para R$ 60.000,00: R$ 135.000,00 nos vendedores, diferença de R$ 15.000,00 para a loja: ok
- K2 novembro: Igor R$ 72.500,00 + Daniele R$ 72.500,00 = R$ 145.000,00 = meta da loja; dezembro sem meta, 26 dias úteis (menos 25/12): ok
- K2: a lista de meses vai de abril de 2026 a outubro de 2027 (19 meses): ok
- K2: dias úteis de outubro 26, setembro 24 e novembro 24 iguais aos do calendário: ok
- o livro não dá nome à gerente nem a outras pessoas da equipe (só Igor, Daniele, Outros e o dono Israel): ok
- e-mails do livro só no domínio reservado example.com: ok
- 144 valores do JSON (encalhe, contas, vendas por dia, acumulado, mix, saldo previsto, caixa) aparecem iguais no livro: ok
- o livro marca a origem de cada número (DS ou novo) e tem uma seção por tela, de G1 a K2: ok
