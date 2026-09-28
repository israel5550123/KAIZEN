# Fase 2 — documentos anteriores a 28/09 no ERP novo

**Para o dono decidir antes do passo 6 do roteiro.** A consulta foi feita em 27/09/2026 às 23h15, só por leitura (SELECT no ERP): nada foi gravado no ERP nem no banco.

## Resumo

O ERP novo tem **54 documentos**, todos anteriores a 28/09. O mais recente é de 27/09, às 14h33.

| Grupo | Documentos | Itens | Valor | O Kaizen lê? |
| --- | ---: | ---: | ---: | --- |
| (a) Ajustes de custo de 27/09 | 44 | 44 | R$ 0,00 | Sim: entram como reais (decidido) |
| (b) Contas a pagar | 0 | — | — | Vão entrar quando forem importadas de novo |
| (c) Todo o resto (26/09 à noite) | 10 | 802 | R$ 298.300,45 | Não: estão todos no corte da virada ou abaixo dele |

O **corte da virada** é o ponto a partir do qual o Kaizen lê o ERP. Tudo o que foi gravado até o documento 184 (número interno do ERP, não o código da tela) fica de fora. O que esses documentos fizeram no estoque já está na **foto da virada**: 1.029 produtos, 714 com saldo, 54.660,5 unidades.

## (a) Os 44 ajustes de custo

- **O que são:** documentos de modelo AC, códigos 94 a 137, gravados em 27/09 das 14h20 às 14h33.
- **Itens:** um produto por documento, sem quantidade e sem valor. Não mexem no estoque nem no dinheiro; cada um muda o custo de um produto.
- **Valor total:** R$ 0,00.
- **Decisão:** entram no Kaizen como reais, como você confirmou em 27/09. O ensaio já os gravou no Kaizen do PC, sem nenhuma diferença.

## (b) Contas a pagar

- **Hoje:** nenhuma. A limpeza de 26/09 apagou as contas a pagar junto com os testes.
- **Referência:** a importação de 24/09 trouxe 49 documentos CP, com 94 parcelas e R$ 245.864,76, vencendo de 14/04 a 22/09. O número da reimportação pode ser menor, se alguma parcela já foi paga.
- **Quando forem importadas de novo:** ficam acima do corte, e o Kaizen lê todas, de qualquer data. Não há nada a decidir sobre elas.

## (c) Todo o resto

São 10 documentos, todos de 26/09 à noite, na hora do inventário. Todos estão no corte ou abaixo dele, então **o Kaizen não lê nenhum deles**. Por isso "ficar" não muda nada no Kaizen. "Sair" quer dizer pedir ao suporte que os apague do ERP.

| Grupo | Documentos | Quando e quem | Itens | Valor |
| --- | --- | --- | --- | ---: |
| Inventário (LE) | 1: código 48, "INVENTÁRIO DE ESTOQUE 2" | 26/09, 22h47, Cliciano | 788 produtos, 54.660,5 unidades | R$ 298.300,45 |
| Ajustes de estoque (AS) | 5: códigos 4, 8, 12 e 16 (entradas) e 5 (saída) | 26/09, 22h40, Cliciano | entradas: 11 itens, 16 unidades; saída: 1 item, 1 unidade | R$ 0,00 |
| Tipo EM | 2: códigos 3 e 49 | 26/09, 22h40 e 23h22, Cliciano | nenhum | R$ 0,00 |
| Tipo AM e o ajuste de custo 2 | 2: códigos 1 (AM) e 2 (AC) | 26/09, 21h51, usuário "Só Ferragens" | 1 cada, sem quantidade nem valor | R$ 0,00 |

O valor do inventário é a quantidade vezes o valor unitário gravado no próprio inventário. As 54.660,5 unidades batem exatamente com a foto da virada.

### Se fica e se sai, grupo a grupo

- **Inventário (LE, código 48).** É a carga do estoque.
  - **Se ficar:** é o esperado. O saldo de cada produto no ERP continua batendo com a contagem de 26/09.
  - **Se sair:** o ERP pode desfazer o saldo dos 788 produtos. O que o ERP faz ao apagar um inventário não foi testado. Se ele gravar esse desfazer no histórico de estoque, isso entra no Kaizen como movimento depois da virada, e o saldo deixa de bater com a contagem.
  - **Recomendação:** fica.
- **Ajustes de estoque (AS, 5 documentos).** São os acertos feitos junto com o inventário.
  - **Se ficar:** nada muda. O efeito deles já está na foto da virada.
  - **Se sair:** é o mesmo risco do inventário, em escala pequena: o saldo de até 12 produtos pode mudar no ERP, e a mudança chega ao Kaizen como movimento novo.
  - **Se algum ajuste estiver errado:** o caminho é um ajuste novo, que o Kaizen lê como qualquer movimento.
  - **Recomendação:** ficam.
- **Tipo EM (2 documentos).** É um tipo que o Kaizen não conhece. Pela hora e pela natureza do segundo ("EN"), parecem marcar o início e o fim do inventário, mas isso não foi confirmado.
  - **Se ficar:** nada muda.
  - **Se sair:** também nada muda no Kaizen, porque não têm item nem valor. Não há motivo para pedir isso ao suporte.
  - **Recomendação:** ficam.
- **Tipo AM e o ajuste de custo 2 (2 documentos).** Foram gravados às 21h51 pelo usuário "Só Ferragens", antes do inventário. AM também é um tipo que o Kaizen não conhece.
  - **Se ficar:** nada muda.
  - **Se sair:** nada muda no Kaizen. O ajuste de custo 2 pode ter mudado o custo de um produto, e o que o ERP faz com esse custo ao apagá-lo não foi testado.
  - **Recomendação:** ficam.

## O que fazer antes do passo 6

1. **Nada a decidir no "resto":** a recomendação é que os 10 fiquem.
2. **Importar de novo as contas a pagar.**
3. **Pedir ao Claude a lista de novo, no dia do passo 6.** Ele roda `node --env-file=.env ferramentas/ensaio.mts antes-da-virada`, que lista o que está acima do corte com data anterior a 28/09. O esperado é:
   - os 44 ajustes de custo;
   - as contas a pagar reimportadas, se ficarem com data anterior a 28/09.

   Qualquer outro documento que aparecer volta para você decidir.
