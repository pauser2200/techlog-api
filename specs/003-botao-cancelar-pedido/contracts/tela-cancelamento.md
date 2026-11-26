# Contrato da tela: cancelamento na tabela de pedidos

Interface exposta a quem opera a loja, no cliente web (`cliente/index.html`).

## Tabela

- Colunas atuais (Pedido, Cliente, Status, Total, Pagamento) mais uma coluna sem título para a ação.
- Linhas com status `criado` ou `pago`: botão "Cancelar".
- Linhas com outros status: sem botão.
- Selo de status `cancelado`: destaque visual (estilo `.selo.cancelado`, já existente).

## Confirmação

- Título: "Cancelar o pedido <id>?"
- Campo de texto opcional: "Motivo (opcional)".
- Botões: "Cancelar pedido" (confirma) e "Voltar" (desiste). Esc também desiste.

## Avisos (área acima da tabela)

| Situação | Texto |
|----------|-------|
| Sucesso | `Pedido <id> cancelado.` |
| Recusa da API | o `detail` do Problem Details |
| Falha de rede | `Não foi possível cancelar o pedido <id>. Tente de novo.` |

## Chamada à API (sem mudança)

`POST {api}/pedidos/{id}/cancelamento`, `Content-Type: application/json`, corpo `{ "motivo": "..." }`
ou `{}`. Formatos de resposta em `specs/001-cancelar-pedido/contracts/cancelamento.openapi.yaml`.
