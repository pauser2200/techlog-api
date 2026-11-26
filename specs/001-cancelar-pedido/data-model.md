# Data Model: Cancelamento de pedido

Mudanças no modelo em memória de `src/pedidos/dados.ts` e no formato serializado de
`src/pedidos/serializar.ts`.

## Pedido (alterado)

| Campo interno | Campo serializado | Tipo | Regra |
|---------------|-------------------|------|-------|
| `status` | `status` | `'criado' \| 'pago' \| 'enviado' \| 'entregue' \| 'cancelado'` | ganha o valor `cancelado` |
| `canceladoEm` (novo) | `canceladoEm` | texto, data e hora ISO 8601 em UTC | presente só se `status = cancelado`; definido pelo sistema |
| `motivoCancelamento` (novo) | `motivoCancelamento` | texto, 1 a 200 caracteres | opcional; presente só se o pedido foi cancelado com motivo |

Os demais campos (`id`, `cliente`, `itens`, `valor_total`, `criadoEm`, `forma_pagamento`)
continuam iguais no modelo e na serialização (FR-012).

## Cancelamento (requisição)

Corpo opcional de `POST /pedidos/{id}/cancelamento`:

| Campo | Tipo | Regra |
|-------|------|-------|
| `motivo` | texto | opcional; após remover espaços das pontas, vazio = sem motivo; mais de 200 caracteres = recusa 400 |

Corpo ausente ou `{}` equivale a cancelar sem motivo. `motivo` que não seja texto é recusado com
400. Campos desconhecidos são ignorados.

O limite de 200 caracteres vale para o texto já sem os espaços das pontas.

## Transições de status

```text
criado  ──cancelar──▶ cancelado
pago    ──cancelar──▶ cancelado
enviado ──cancelar──▶ (recusa 409, sem mudança)
entregue──cancelar──▶ (recusa 409, sem mudança)
cancelado─cancelar──▶ (recusa 409, sem mudança; data e motivo originais preservados)
```

Cancelar um pedido pago não altera a forma de pagamento nem faz estorno (FR-008a). O cancelamento
é definitivo: não há transição saindo de `cancelado`.

## Ordem das validações

1. Corpo é JSON válido → senão 400 (`/problemas/validacao`).
2. `motivo`, se presente, é texto com até 200 caracteres → senão 400 (`campo: "motivo"`).
3. Pedido existe → senão 404.
4. Status permite cancelamento → senão 409 com `statusAtual`.

Validar a entrada antes de buscar o pedido faz um motivo inválido ser recusado da mesma forma em
qualquer pedido.
