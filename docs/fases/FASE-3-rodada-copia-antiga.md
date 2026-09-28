# Fase 3 — rodada contra a cópia antiga da Link

**28/09/2026, por volta das 05h35 (Fortaleza). Commit `116ab14`** (Link: o comando para antes de gravar uma cópia restaurada pela metade).

A cópia veio do container `link_postgres`, esquema `erp`, banco `prumo` (`pg_dump -n erp -Fc`). A última venda da cópia é de 25/09 às 11h51 (`max(data)` de `erp.negociacao` = `2026-09-25 11:51:03`). O dump ficou em `C:\Projetos\link-copias\erp-antiga-2026-09-28.dump`, fora do repositório.

sha256 do dump: `bd8e4b39cccc703f0027be5ae03bebb31b1aca5c118ea5e77b67f9cf474130da`

## As duas rodadas

Primeira linha da rodada 1:
```
link ok: documentos=6155, novos=6155, itens=15220, pagamentos=5980, conferencias=632, parcelas=221, baixas=127
```

Primeira linha da rodada 2:
```
link ok: documentos=6155, novos=0, itens=15220, pagamentos=5980, conferencias=632, parcelas=221, baixas=127
```

`novos=0` na segunda rodada confirma que gravar duas vezes não duplica. O código de saída das duas foi `0`.

Resumo inteiro da primeira rodada:
```
documentos: 6155
documentos:conta_pagar: 88
documentos:fechamento_caixa: 158
documentos:nota_entrada: 51
documentos:orcamento: 4
documentos:pedido: 5278
documentos:sangria: 419
documentos:suprimento: 157
orcamentos: 4
vendas_canceladas: 34
vendas_validas: 5244
vendas_validas_sem_cliente: 31
itens_de_nota: 530
itens_devolvidos: 54
itens_vendidos: 14636
pagamentos: 5980
pagamentos_batem: 5243 de 5244 vendas válidas somam venda − devolução
pagamentos_nao_batem: negociação 100: pagamentos R$ 336,79, venda − devolução R$ 336,78
conferencia_linhas: 632
fechamentos: 158
turnos_abertos: 3
baixas: 127, R$ 380.070,75
parcelas: 221, R$ 625.935,51
parcelas_pendentes: 94, R$ 245.864,76
razao_fora: (sem obs) (orientação false): 129, R$ 380.185,75
razao_fora: Custo mercadoria devolvida referente ao código da venda: N (orientação true): 43, R$ 2.510,19
razao_fora: Custo mercadoria vendida referente ao código da venda: N (orientação false): 5126, R$ 423.149,17
razao_fora: Fechamento de Caixa (orientação true): 153, R$ 86.929,22
razao_fora: Venda - Caixa. Lançamento automático. (orientação false): 14, R$ 1.512,55
razao_fora: Venda - Caixa. Lançamento automático. (orientação true): 5230, R$ 771.847,17
ligacoes:cliente: regra 335, decisão 7, falha 1
ligacoes:fornecedor: regra 19, decisão 0, falha 1
ligacoes:produto: regra 782, decisão 0, falha 6
ligacoes:vendedor: regra 3, decisão 0, falha 3
vendas_com_falha:cliente: 2 vendas válidas, R$ 60,00
vendas_com_falha:vendedor: 5 vendas válidas, R$ 300,60
falha: funcionario 1 → link:1 (Sistema): 1 documentos, 0 vendas válidas, R$ 0,00
falha: funcionario 7 → link:7 (nome removido): 4 documentos, 4 vendas válidas, R$ 261,00
falha: funcionario 8 → link:8 (nome removido): 1 documentos, 1 vendas válidas, R$ 39,60
falha: pessoa 1 → link:1 (3D MOVEIS): 2 documentos, 2 vendas válidas, R$ 60,00
falha: pessoa 900001 → link:900001 (FORNECEDOR PADRÃO): 8 documentos, 0 vendas válidas, R$ 0,00
falha: produto 1993 → link:1993 (Acabamento P/espelho Cabeça Chata Branco Toro): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 2396 → link:2396 (Batente Silicone 10mm Cartela C/ 50 Toro): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 2758 → link:2758 (Fonte Driver Slim 36W 12V 2A Bivolt Renna): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 5218 → link:5218 (FITA EMPACOTAMENTO 48MM X 45M TRANSP): 1 documentos, 0 vendas válidas, R$ 0,00
falha: produto 5239 → link:5239 (Fonte Driver Slim 120W 12V 3A Bivolt Metalnox): 2 documentos, 0 vendas válidas, R$ 0,00
falha: produto 5264 → link:5264 (BOMBA PERIFERICA 1/2CV 220V): 1 documentos, 0 vendas válidas, R$ 0,00
dias_comparados: 141
```

Todos os números batem com o esperado no plano da tarefa 9, número por número. As linhas `falha: funcionario 7` e `falha: funcionario 8` tiveram o nome trocado por "nome removido" neste registro porque são pessoas físicas (o resumo original traz o nome; nomes de empresa e de produto ficaram como saíram).

## As fotos, antes e depois

A foto tirada antes da primeira rodada só tinha os documentos do ERP novo (44). Depois da primeira rodada, e de novo depois da segunda, a foto do Kaizen inteiro (`foto-2.txt`):

```
          tabela           | linhas |               md5                
---------------------------+--------+----------------------------------
 baixa                     |    127 | 220e928d0c5183c9b0c03939c3b22199
 conferencia_caixa         |    632 | ef2fd534e83406bbb76af6d53ec7c5d7
 de_para                   |     33 | e3db44276c334946065560e375c540c7
 documento                 |   6199 | 3e42fced06a594202b27fb5fc53f902d
 documento (id e visto_em) |   6199 | f0edef2713a9c8d4aee106e10a8758e8
 documento_item            |  15264 | 97b02fcb2afeef21c653963d4abed7a2
 documento_pagamento       |   5980 | bc51c5d5b6027e016f93274025fb49ad
 funcionario               |     12 | a35546096888d6ead1c71fdab37bba85
 parcela                   |    221 | 58be2d594b9c1568ba6969ea60f6e06e
 pessoa                    |    449 | b1a12f13acd6a7b25450b3a3ae34c328
 produto                   |   1035 | b52d2e2799d46ed7ddf5f7a3450558a9
 traducao                  |    117 | a51879e3f10fdbe7e09dc46aadbb59b0
(12 rows)
```

(o `diff` entre a foto tirada depois da rodada 1 e a tirada depois da rodada 2 não encontrou nenhuma diferença — os dois arquivos, linha a linha e tabela a tabela, contagens e md5 inclusive, são idênticos.)

**Rodar duas vezes não duplica: as fotos da primeira e da segunda rodada são iguais.**

O mesmo vale para o resumo inteiro: o `diff` entre o resumo da rodada 1 e o da rodada 2 (sem a primeira linha, que muda só em `novos`) não encontrou nenhuma diferença.

## A ficha da venda 1992

```json
{
  "itens": [
    {"produto": "1369", "sentido": "saida", "vendedor": "1", "descricao": "", "quantidade": "1", "valor_liquido": "90.365760772", "vendedor_nome": "[nome removido]"},
    {"produto": "1438", "sentido": "saida", "vendedor": "1", "descricao": "", "quantidade": "1", "valor_liquido": "59.634246", "vendedor_nome": "[nome removido]"}
  ],
  "documento": {"tipo": "pedido", "fonte": "link", "codigo": "2124", "pessoa": "303", "situacao": "emitido", "criado_em": "2026-06-17T13:58:20.706517", "movimento": "saida", "fechado_em": "2026-06-17T13:58:21.050114", "financeiro": "recebe", "pessoa_nome": "[nome removido]"},
  "pagamentos": [{"forma": "pix", "valor": "150.00"}]
}
```

Bate com o esperado: tipo `pedido`, situação `emitido`, movimento `saida`, financeiro `recebe`, criado em 17/06/2026; dois itens de saída do vendedor `1` com valores `90.365760772` e `59.634246`; um pagamento `pix` de `150.00`. Os nomes de pessoa física (`vendedor_nome` e `pessoa_nome`) foram trocados por "[nome removido]" neste registro; a ficha completa fica em `C:\Projetos\link-copias\ficha-1992.json`, fora do repositório.

## O que falta da cópia final

A tarde de 25/09 e o fechamento do turno 190 chegam com a cópia final em 29/09 (tarefa 11).

## Reconferida com o código final

Depois das correções da revisão final (commit `e856fc9`), o comando rodou mais duas vezes contra a mesma cópia, às 05h58 de 28/09 (Fortaleza): `link ok: documentos=6155, novos=0, itens=15220, pagamentos=5980, conferencias=632, parcelas=221, baixas=127` nas duas, a mesma foto (`foto-5.txt` igual à `foto-2.txt` acima) e o mesmo resumo.

## A mesma forma: a venda de junho da Link e um pedido do ERP novo de 28/09

Às 09h09 de 28/09 (Fortaleza), o tradutor do ERP novo (`node --env-file=.env tradutor/principal.mts hora --manual`, só leitura) trouxe o primeiro pedido do dia: o pedido 196, das 09h07. A mesma consulta (`sql/kaizen/ficha-venda.sql`) dá as duas fichas (nomes de pessoa física trocados por "[nome]"):

Venda 1992 da Link (17/06):
```json
{"documento": {"fonte": "link", "codigo": "2124", "tipo": "pedido", "situacao": "emitido", "movimento": "saida", "financeiro": "recebe", "criado_em": "2026-06-17T13:58:20.706517", "fechado_em": "2026-06-17T13:58:21.050114", "pessoa": "303", "pessoa_nome": "[nome]"},
 "itens": [{"sentido": "saida", "produto": "1369", "descricao": "", "quantidade": "1", "valor_liquido": "90.365760772", "vendedor": "1", "vendedor_nome": "[nome]"},
           {"sentido": "saida", "produto": "1438", "descricao": "", "quantidade": "1", "valor_liquido": "59.634246", "vendedor": "1", "vendedor_nome": "[nome]"}],
 "pagamentos": [{"forma": "pix", "valor": "150.00"}]}
```

Pedido 196 do ERP novo (28/09):
```json
{"documento": {"fonte": "meuerp", "codigo": "196", "tipo": "pedido", "situacao": "emitido", "movimento": "saida", "financeiro": "recebe", "criado_em": "2026-09-28T09:07:47.728191", "fechado_em": "2026-09-28T09:07:47.728191", "pessoa": "999007", "pessoa_nome": "[nome]"},
 "itens": [{"sentido": "saida", "produto": "5211", "descricao": "", "quantidade": "4.000", "valor_liquido": "46.000000", "vendedor": "999005", "vendedor_nome": "[nome]"}],
 "pagamentos": [{"forma": "dinheiro", "valor": "46.00"}]}
```

**O que é igual:** as chaves do documento, de cada item e de cada pagamento (conferido por programa); o tipo `pedido`, a situação `emitido`, o movimento `saida` e o financeiro `recebe`; os itens de sentido `saida`, com o vendedor e o produto no código do cadastro do ERP novo (o `1` da venda de junho é o mesmo funcionário `1` do ERP novo; o `999005` do pedido de hoje também é do cadastro novo) e o nome vindo do cadastro; as formas no mesmo vocabulário (`pix`, `dinheiro`). **O que difere é o fato:** os valores, os produtos, as datas, o cliente (o pedido de hoje é do Consumidor Final 999007). A descrição do produto sai vazia nas duas fichas porque as duas usam o cadastro do ERP novo, que está com a descrição vazia: é o bug da Fase 2 registrado na spec (seção 13).

