# API de Pedidos

Documentação escrita à mão em 2024. Atualize quando mudar a API.

## Endpoints

- `GET /pedidos` lista os pedidos. Aceita `?status=`.
- `GET /pedidos/{id}` devolve um pedido.
- `POST /pedidos` cria um pedido.
- `POST /pedidos/{id}/cancelamento` cancela um pedido. Veja [Cancelamento](#cancelamento).

## Campos do pedido

```json
{
  "id": "PED-1001",
  "cliente": "Ana Souza",
  "status": "pago",
  "total": 79.8,
  "data_criacao": "2026-09-28T10:15:00Z",
  "forma_pagamento": { "tipo": "pix" }
}
```

## Erros

Erros devolvem `{ "erro": "mensagem" }`.

## Cancelamento

`POST /pedidos/{id}/cancelamento` cancela pedidos com status `criado` ou `pago`. Cancelar um
pedido pago não faz estorno. Contrato completo em
`specs/001-cancelar-pedido/contracts/cancelamento.openapi.yaml`.

Corpo opcional:

```json
{ "motivo": "cliente desistiu" }
```

- `motivo` é opcional, com até 200 caracteres. Vazio vale como sem motivo.

Sucesso: `200` com o pedido, agora com `status: "cancelado"` e os campos abaixo. Pedidos
cancelados continuam em `GET /pedidos` (inclusive com `?status=cancelado`) e em
`GET /pedidos/{id}`.

- `canceladoEm`: data e hora do cancelamento (ISO 8601, UTC). Só em pedidos cancelados.
- `motivoCancelamento`: o motivo informado. Só em pedidos cancelados com motivo.

Recusas no formato Problem Details (RFC 9457), com
`Content-Type: application/problem+json`:

| Status | `type` | Quando |
|--------|--------|--------|
| 400 | `/problemas/validacao` | JSON inválido, `motivo` que não é texto ou com mais de 200 caracteres (traz `campo`) |
| 413 | `/problemas/validacao` | corpo acima de 100 KB |
| 415 | `/problemas/validacao` | charset ou codificação do corpo não suportados |
| 404 | `/problemas/pedido-nao-encontrado` | o pedido não existe |
| 409 | `/problemas/cancelamento-nao-permitido` | o pedido está `enviado`, `entregue` ou já `cancelado` (traz `statusAtual`) |

```json
{
  "type": "/problemas/cancelamento-nao-permitido",
  "title": "Cancelamento não permitido",
  "status": 409,
  "detail": "O pedido PED-1003 já foi enviado e não pode mais ser cancelado.",
  "instance": "/pedidos/PED-1003/cancelamento",
  "statusAtual": "enviado"
}
```
