---
name: teste-erro-postgres-real-via-trigger
description: como provar num teste que o código reage certo a um SQLSTATE específico do Postgres (ex. 57P01, banco caindo no meio da execução), sem depender de matar a conexão de verdade
metadata:
  type: project
---

Para provar que `motivoDe`/o catch de uma execução classifica certo um erro real do Postgres com um código específico (ex. `57P01`, `08006`), não tente derrubar a conexão de verdade (`pg_terminate_backend` na própria sessão): a entrega do sinal é assíncrona, e o ponto em que o Postgres nota a interrupção não é determinístico — o teste fica instável (às vezes o erro estoura numa query diferente da esperada).

A alternativa determinística e sem costura no código de produção: crie um gatilho (`before insert`/`before update`) numa tabela que o código sob teste toca nesse ponto exato, cuja função levanta `raise exception '<mensagem>' using errcode = '<sqlstate>'`. O node-pg preenche `.code` a partir do SQLSTATE devolvido pelo Postgres, exatamente como faria um erro de verdade — o resto do código (motivoDe, catch, etc.) não sabe a diferença. Crie e derrube o gatilho/função dentro do próprio teste (padrão igual ao `alter table … rename to …` que a Fase 4 já usa para forçar "relação não existe").

**Por quê:** usado na correção do item 1 da revisão do meio da Fase 4 (`tradutor/execucao-indicadores.test.mts`), para provar que a queda do banco durante `calcularRespostas` continua classificada como `banco_fora`, não `indicadores` — sem introduzir nenhum hook/seam de teste em `execucao.mts`.

**Como aplicar:** sempre que uma tarefa pedir "prove com um erro real de código X do Postgres" e X não for algo fácil de provocar por SQL comum (ex. relação inexistente, violação de constraint), considere esse truque antes de recorrer ao fallback de testar só a função pura de classificação — testar só a função pura não prova que o *caminho* que deveria chamá-la (o catch) de fato chama.

Ver também [[feedback_atribuicao_commit]] para o padrão de registrar decisões deste tipo no relatório da tarefa.
