# Data Model: Botão de cancelar pedido na tabela do cliente web

Nenhuma entidade nova e nenhuma mudança na API. O cliente usa o pedido da feature 001
(`specs/001-cancelar-pedido/data-model.md`).

## Campos que a tela usa

| Campo | Uso |
|-------|-----|
| `id` | identifica a linha e monta o caminho do cancelamento |
| `status` | define se a linha tem o botão (`criado` ou `pago`) e o texto/destaque do selo |

A tela não mostra `canceladoEm` nem `motivoCancelamento` (Clarifications, Q2).

## Estado de uma linha na tela

```text
com botão (criado|pago) ──clique──▶ confirmação aberta
confirmação ──Voltar/Esc──▶ com botão (nada muda)
confirmação ──Cancelar pedido──▶ em andamento (botão indisponível)
em andamento ──200──▶ cancelada (selo "cancelado" em destaque, sem botão)
em andamento ──recusa (400/404/409)──▶ aviso com o detail + tabela recarregada
em andamento ──falha de rede──▶ aviso de falha + linha como estava (botão disponível)
```

## Resultado de `cancelarPedido`

| Resposta da API | Resultado |
|-----------------|-----------|
| 200 | `{ tipo: 'ok', pedido }` |
| 4xx com Problem Details | `{ tipo: 'recusa', mensagem: detail }` (ou `title`, se não houver `detail`) |
| 4xx/5xx sem corpo legível | `{ tipo: 'recusa', mensagem: 'O cancelamento foi recusado (status N).' }` |
| erro de rede | `{ tipo: 'falha', mensagem: 'Não foi possível cancelar o pedido <id>. Tente de novo.' }` |
