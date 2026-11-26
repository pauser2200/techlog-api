# Quickstart: validar a recusa de JSON malformado nos endpoints antigos

Formato esperado em [contracts/recusa-corpo-ilegivel.md](contracts/recusa-corpo-ilegivel.md).

## Pré-requisitos

- Node 24.18 ou mais novo, `npm install` feito, terminal Git Bash na raiz do repositório.

## 1. Testes automatizados

```bash
npm test
```

Esperado: todos os testes passam, incluindo `tests/pedidos/erros-corpo.http.test.ts`.

## 2. Conferência manual

Suba a API (`npm start`) e, em outro terminal:

| # | Comando | Esperado |
|---|---------|----------|
| 1 | `curl -i -X POST localhost:3000/pedidos -H 'Content-Type: application/json' -d '{x'` | 400, `text/html`, página com `<pre>Bad Request</pre>`, sem `SyntaxError` nem linhas `at ...` |
| 2 | `curl -i localhost:3000/pedidos -H 'Content-Type: application/json' -d '{x'` | 400, mesma página |
| 3 | `curl -i -X POST localhost:3000/pedidos -H 'Content-Type: application/json; charset=latin9' -d '{}'` | 415, `<pre>Unsupported Media Type</pre>` |
| 4 | `curl -i -X POST localhost:3000/pedidos/PED-1001/cancelamento -H 'Content-Type: application/json' -d '{x'` | 400 em `application/problem+json` (não mudou) |
| 5 | `curl -i localhost:3000/pedidos/PED-9999` | 404 com `{"erro": ...}` (não mudou) |
| 6 | `NODE_ENV=development npm start` e repetir o cenário 1 | mesmo resultado do cenário 1 |

No terminal da API, o erro completo continua aparecendo no log a cada recusa.
