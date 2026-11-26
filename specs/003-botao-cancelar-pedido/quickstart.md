# Quickstart: validar o botão de cancelar na tabela

Comportamento esperado em [contracts/tela-cancelamento.md](contracts/tela-cancelamento.md).

## 1. Testes automatizados

```bash
npm test
npx tsc -p .
```

Esperado: todos passam, incluindo `tests/cliente/cancelamento.test.ts`.

## 2. Conferência manual

Suba a API (`npm start`) e abra `http://localhost:3000/`.

| # | Ação | Esperado |
|---|------|----------|
| 1 | Olhar a tabela | Botão "Cancelar" só em `PED-1001` (criado), `PED-1002` e `PED-1005` (pagos) |
| 2 | Cancelar `PED-1001`, clicar em "Voltar" | Nada muda |
| 3 | Cancelar `PED-1001`, deixar o motivo vazio e confirmar | Aviso "Pedido PED-1001 cancelado."; selo `cancelado` em destaque; sem botão |
| 4 | Cancelar `PED-1002` com motivo "cliente desistiu" | Cancelado; `curl localhost:3000/pedidos/PED-1002` mostra `motivoCancelamento` |
| 5 | Cancelar `PED-1005` com um motivo de 201 caracteres | Aviso com a explicação da API; `PED-1005` continua pago, com botão |
| 6 | Com a tela aberta, cancelar `PED-1005` por `curl`; depois usar o botão de `PED-1005` na tela | Aviso "O pedido PED-1005 já está cancelado."; a tabela recarrega e mostra `cancelado`, sem botão |
| 7 | Parar a API e usar um botão | Aviso de falha; linha como estava |
| 8 | `npm run diagnostico` com a API no ar | Nenhum campo que o cliente lê fica sem resposta da API |
