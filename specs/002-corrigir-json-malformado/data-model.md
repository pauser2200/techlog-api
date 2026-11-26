# Data Model: Corrigir erro de JSON malformado nos endpoints antigos

Esta correção não cria nem altera entidades, campos ou estados. O modelo de pedido continua o da
feature 001 (`specs/001-cancelar-pedido/data-model.md`).

## Recusa de corpo ilegível (endpoints antigos)

Não é uma entidade guardada; é a resposta que a API devolve.

| Caso | Status | Conteúdo da página (`<pre>`) |
|------|--------|------------------------------|
| JSON malformado | 400 | `Bad Request` |
| Corpo grande demais (acima de 100 KB) | 413 | `Payload Too Large` |
| Charset ou codificação não suportados | 415 | `Unsupported Media Type` |

Vale para `GET /pedidos`, `GET /pedidos/{id}` e `POST /pedidos`. O endpoint de cancelamento
continua com Problem Details (feature 001).
