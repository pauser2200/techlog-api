# API de Pedidos

Documentação escrita à mão em 2024. Atualize quando mudar a API.

## Endpoints

- `GET /pedidos` lista os pedidos. Aceita `?status=`.
- `GET /pedidos/{id}` devolve um pedido.
- `POST /pedidos` cria um pedido.
- `POST /pedidos/{id}/cancelamento` cancela um pedido. Veja [Cancelamento](#cancelamento).

## Campos do pedido

Exemplo de um pedido cancelado, com todos os campos que a API pode devolver:

```json
{
  "id": "PED-1001",
  "cliente": "Ana Souza",
  "status": "cancelado",
  "valor_total": 79.8,
  "criadoEm": "2026-09-28T10:15:00Z",
  "forma_pagamento": { "tipo": "pix", "chave": "ana.souza@exemplo.com" },
  "itens": [{ "sku": "CX-PEQ", "quantidade": 2, "preco_unitario": 39.9 }],
  "canceladoEm": "2026-10-01T09:00:00Z",
  "motivoCancelamento": "cliente desistiu"
}
```

- `status`: `criado`, `pago`, `enviado`, `entregue` ou `cancelado`.
- `canceladoEm` e `motivoCancelamento` só aparecem em pedidos cancelados; `motivoCancelamento`,
  só quando o cancelamento teve motivo.
- `forma_pagamento` muda conforme o `tipo`: `pix` traz `chave`; `cartao` traz `bandeira`,
  `parcelas` e `final_cartao`; `boleto` traz `linha_digitavel` e `vencimento`.

## Erros

O formato do erro depende do endpoint. Os formatos antigos são mantidos porque clientes dependem
deles.

| Endpoint | Situação | Status | Corpo |
|----------|----------|--------|-------|
| `GET /pedidos/{id}` | pedido não existe | 404 | `{ "erro": "Pedido não encontrado" }` |
| `POST /pedidos` | `cliente` ausente | 400 | `{ "message": "cliente é obrigatório", "code": "VALIDACAO" }` |
| `POST /pedidos/{id}/cancelamento` | ver [Cancelamento](#cancelamento) | 400, 404, 409, 413, 415 | Problem Details (`application/problem+json`) |

Nos endpoints antigos, um corpo JSON malformado e uma rota inexistente recebem a página de erro
padrão do servidor (HTML), não JSON.

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
