# Meu ERP Online — servidor MCP `meuerp`

O servidor MCP `meuerp` dá acesso à API Pública do Meu ERP Online, o sistema de gestão da empresa. Os dados são reais: não existe ambiente de teste.

## Regras

1. **Consultas são livres.** Ferramentas sem prefixo, incluindo `consulta_sql`, só leem dados e podem ser usadas à vontade.
2. **Escritas exigem confirmação.** Ferramentas com prefixo `post_`, `put_` ou `patch_` alteram dados reais: emitem nota fiscal, baixam contas, ajustam estoque, cadastram pessoas. Antes de chamar uma delas, mostre ao usuário o que será enviado (ferramenta e parâmetros) e espere confirmação explícita.
3. **Não repita escrita que falhou.** Se uma escrita der erro ou tempo esgotado, não tente de novo às cegas. Consulte antes para saber se ela foi aplicada, porque repetir pode duplicar lançamentos ou notas.
4. **Não invente IDs.** Descubra os códigos com as consultas de listagem ou de busca.
5. **Não peça nem mostre token.** A autenticação é feita pelo servidor.

## Como achar a ferramenta

- **Padrão dos nomes.** O nome é o caminho do endpoint sem `/api` e `/v1`. `mercadoria` lista; `mercadoria_id` consulta um item pelo código. Ferramentas de escrita levam o método na frente: `post_pessoa`, `put_mercadoria_id`.
- **Catálogo completo.** Está em `FERRAMENTAS.md`, na mesma pasta deste guia (o caminho aparece no `@` do `CLAUDE.md`). Ali estão o grupo, a descrição e o endpoint de cada ferramenta.
- **Parâmetros.** A descrição de cada ferramenta diz o que é obrigatório. Alguns parâmetros aparecem como opcionais no schema, mas a descrição diz que são obrigatórios; siga a descrição.

## Convenções da API

- **Paginação.** Listagens aceitam `page` (começa em 1) e `limit` (padrão 50) e devolvem `{page, limit, total, totalPages, hasNext, items}`. Use `limit` de 10 a 20 para explorar. Para contar registros, use o campo `total` em vez de percorrer as páginas. Só pagine até o fim quando precisar de todos os registros.
- **Datas.** Parâmetros no formato `date` recebem `AAAA-MM-DD`; no formato `date-time`, recebem `AAAA-MM-DDTHH:MM:SS`. Para cobrir um dia inteiro, use `00:00:00` no início e `23:59:59` no fim.
- **Nomes de parâmetros variam.** Há endpoints com `DataInicio`/`DataFim`, outros com `dataInicio`/`dataFim` e outros com `inicio`/`fim`. Use exatamente o nome do schema da ferramenta.
- **Mercadoria.** O código de uma mercadoria é o **código da variação** (`idMercadoriaVariacao`). O estoque é sempre por variação e por local de estoque.
- **Modelos fiscais.** `55` é NF-e e `65` é NFC-e. Emissão, PDF e XML aceitam só esses dois.
- **Limite de requisições.** São cerca de 20 por minuto. Quando o limite estoura, o servidor espera e tenta de novo, então chamadas em sequência podem demorar. Prefira consultas por período ou agregadas a laços de item por item. Se uma tarefa exigir dezenas de chamadas, avise o usuário antes.
- **Arquivos.** PDFs (DANFE, boletos) e arquivos fiscais são salvos em disco. A resposta traz o caminho em `arquivo_salvo`; abra o arquivo só se o conteúdo for necessário.
- **Erros.** Chegam como `HTTP error <código>: ... - <mensagem da API>`. Um 400 indica parâmetro inválido: corrija a chamada. Um 404 indica que o registro não existe. Um 409 é conflito com regra de negócio: explique a mensagem ao usuário em vez de insistir.

## Receitas

| Pergunta | Caminho |
|---|---|
| Dados da empresa | `empresa` |
| Contas a pagar ou a receber num período | `conta_pagar_pendentes` / `conta_receber_pendentes` com `inicio` e `fim` (date-time) |
| O que uma pessoa deve ou tem a receber | `pessoa_conta_pagar_pendentes` / `pessoa_conta_receber_pendentes` |
| Resultado do mês (DRE) | `dre` com `DataInicio` e `DataFim` (date) |
| Mercadorias mais vendidas | `documento_mercadorias_vendidas` com `Modelo`, `DataInicio` e `DataFim` |
| Vendas e notas de um período | `documento` com `DataInicio`, `DataFim` e, se preciso, `Modelo` ou `Status` |
| Achar um produto | `mercadoria` com `filtro` (descrição, código de barras ou código da variação) |
| Estoque de um produto | `local_estoque` para achar o local, depois `mercadoria_local_estoque` |
| Estoque de um local inteiro | `local_estoque_estoques` |
| Achar um cliente | `pessoa_cnpjcpf` com `cnpjCpf`; para ver o histórico, `pessoa_historico` |
| Sintegra ou EFD | `post_sintegra` gera um `idGeracao`; `sintegra_id` mostra o status; `sintegra_arquivo` baixa o arquivo. O EFD Fiscal e o EFD Contribuições seguem o mesmo fluxo |

## `consulta_sql`

Use só quando nenhuma ferramenta específica resolver. A estrutura do banco não é documentada: descubra as tabelas e colunas antes de montar a consulta, comece com `limit` pequeno e nunca tente comandos que alterem dados.
