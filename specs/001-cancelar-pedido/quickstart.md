# Quickstart: validar o cancelamento de pedido

Roteiro para conferir, de ponta a ponta, que a funcionalidade atende à
[spec](spec.md). Formatos de requisição e resposta estão no
[contrato](contracts/cancelamento.openapi.yaml); campos e transições no
[modelo de dados](data-model.md).

## Pré-requisitos

- Node 24.18 ou mais novo e dependências instaladas (`npm install`).
- Terminal Git Bash na raiz do repositório.

## 1. Testes automatizados

```bash
npm test
```

Esperado: todos os testes passam, incluindo os da regra de cancelamento e os de integração do
`POST /pedidos/{id}/cancelamento`.

## 2. Conferência manual

Suba a API em um terminal:

```bash
npm start
```

Em outro terminal, rode os cenários abaixo. Os pedidos da base inicial são `PED-1001` (criado),
`PED-1002` (pago), `PED-1003` (enviado) e `PED-1004` (entregue).

| # | Comando | Esperado |
|---|---------|----------|
| 1 | `curl -i -X POST localhost:3000/pedidos/PED-1001/cancelamento` | 200; `status: cancelado`, `canceladoEm` preenchido, sem `motivoCancelamento` |
| 2 | `curl -i -X POST localhost:3000/pedidos/PED-1002/cancelamento -H 'Content-Type: application/json' -d '{"motivo":"cliente desistiu"}'` | 200; `motivoCancelamento: "cliente desistiu"` |
| 3 | `curl -i -X POST localhost:3000/pedidos/PED-1003/cancelamento` | 409, `application/problem+json`, `statusAtual: enviado` |
| 4 | `curl -i -X POST localhost:3000/pedidos/PED-1004/cancelamento` | 409, `statusAtual: entregue` |
| 5 | repetir o comando 1 | 409, `statusAtual: cancelado`; `canceladoEm` do pedido não muda |
| 6 | `curl -i -X POST localhost:3000/pedidos/PED-9999/cancelamento` | 404, `application/problem+json` |
| 7 | cancelar `PED-1005` com um `motivo` de 201 caracteres | 400, `campo: motivo`; pedido continua pago |
| 8 | `curl -i -X POST localhost:3000/pedidos/PED-1005/cancelamento -H 'Content-Type: application/json' -d '{motivo'` | 400, `application/problem+json` |
| 9 | `curl localhost:3000/pedidos?status=cancelado` | só `PED-1001` e `PED-1002`, com `canceladoEm` |
| 10 | `curl -i localhost:3000/pedidos/PED-9999` | 404 com o formato antigo `{"erro": ...}` (não mudou) |

## 3. Cliente web

Abra `http://localhost:3000/` depois dos cenários acima. Esperado: a lista carrega sem erro e
mostra os pedidos cancelados com o status `cancelado`.
