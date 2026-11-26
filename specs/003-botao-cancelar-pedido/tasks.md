---

description: "Lista de tarefas do botão de cancelar pedido na tabela do cliente web"
---

# Tasks: Botão de cancelar pedido na tabela do cliente web

**Input**: Design documents from `/specs/003-botao-cancelar-pedido/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tela-cancelamento.md

**Tests**: incluídos. O Princípio III exige teste para regra nova; o plano (R1, R6) define os
testes das funções de `cliente/cancelamento.js` em `tests/cliente/cancelamento.test.ts`, com um
`fetch` falso. O comportamento da tela (diálogo, botão, aviso) é conferido pelo quickstart.

**Organization**: tarefas agrupadas por história de usuário (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história de usuário da tarefa (US1, US2)

## Path Conventions

- Cliente web sem build: `cliente/index.html`, `cliente/app.js`, `cliente/cancelamento.js` (novo)
- Testes: `tests/cliente/cancelamento.test.ts` (rodam no `npm test`)
- A API (`src/`) não muda

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Em tsconfig.json, acrescentar `"allowJs": true` em `compilerOptions` (sem `checkJs`), para os testes em TypeScript importarem `cliente/cancelamento.js`; não mudar as outras opções nem o `include`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T002 [P] Em cliente/index.html: (a) trocar `<script src="app.js"></script>` por `<script type="module" src="app.js"></script>`; (b) acrescentar, antes de `<div id="conteudo">`, a área de aviso `<p id="aviso" class="aviso" role="status"></p>`; (c) acrescentar, dentro de `<main>`, um `<dialog id="confirmar-cancelamento">` com um `<form method="dialog">` contendo o título `<h2 id="titulo-cancelamento"></h2>`, um `<label>` "Motivo (opcional)" ligado a um `<textarea id="motivo-cancelamento" rows="3">` sem `maxlength`, e os botões `<button value="voltar">Voltar</button>` e `<button value="confirmar" id="confirmar-cancelamento-botao">Cancelar pedido</button>`; (d) acrescentar no `<style>` regras simples para `.aviso` (vazio não ocupa espaço) e para o `dialog`, usando as variáveis de cor já existentes

**Checkpoint**: página carrega como antes (a tabela ainda sem botão)

---

## Phase 3: User Story 1 - Cancelar um pedido pela tabela (Priority: P1) 🎯 MVP

**Goal**: botão "Cancelar" nas linhas de pedidos criados ou pagos; confirmação com motivo
opcional; sucesso atualiza a linha para `cancelado`, sem botão e sem recarregar a página.

**Independent Test**: abrir `http://localhost:3000/`, cancelar `PED-1001` pelo botão com o motivo
vazio e ver a linha passar a `cancelado`, sem botão; clicar em "Voltar" não cancela nada.

### Tests for User Story 1 ⚠️

- [X] T003 [US1] Criar tests/cliente/cancelamento.test.ts com `node:test` e `node:assert/strict`, importando `podeCancelar`, `corpoDoCancelamento` e `cancelarPedido` de `../../cliente/cancelamento.js`. Testar: `podeCancelar` é `true` para `'criado'` e `'pago'` e `false` para `'enviado'`, `'entregue'`, `'cancelado'` e um status desconhecido; `corpoDoCancelamento('')` e `corpoDoCancelamento('   ')` devolvem `{}`, e `corpoDoCancelamento('cliente desistiu')` devolve `{ motivo: 'cliente desistiu' }`; `cancelarPedido({ api: 'http://x', id: 'PED-1001', motivo: 'cliente desistiu', fetch })`, com um `fetch` falso que registra a chamada e responde 200 com um pedido `{ id: 'PED-1001', status: 'cancelado' }`, faz `POST` para `http://x/pedidos/PED-1001/cancelamento` com `Content-Type: application/json` e corpo `{"motivo":"cliente desistiu"}`, e devolve `{ tipo: 'ok', pedido }`; com `api: ''` a URL é `/pedidos/PED-1001/cancelamento`

### Implementation for User Story 1

- [X] T004 [US1] Criar cliente/cancelamento.js (ES module, sem dependências) exportando: `podeCancelar(status)` → `status === 'criado' || status === 'pago'`; `corpoDoCancelamento(motivo)` → `{ motivo }` se `motivo.trim()` não for vazio, senão `{}` (envia o texto como digitado; a API remove os espaços das pontas); `async cancelarPedido({ api, id, motivo, fetch })` → `POST ${api}/pedidos/${encodeURIComponent(id)}/cancelamento` com `Content-Type: application/json` e `JSON.stringify(corpoDoCancelamento(motivo ?? ''))`; se `resposta.ok`, devolve `{ tipo: 'ok', pedido: await resposta.json() }`; por enquanto, qualquer outra resposta devolve `{ tipo: 'recusa', mensagem: 'O cancelamento foi recusado (status N).' }` (detalhado em T007) (depende de T003)
- [X] T005 [US1] Em cliente/app.js: importar `podeCancelar` e `cancelarPedido` de `./cancelamento.js`; acrescentar à tabela uma coluna de ação sem título; em cada linha, se `podeCancelar(p.status)`, renderizar `<button type="button" data-cancelar="${p.id}">Cancelar</button>`; dar ao selo a classe do status (`class="selo ${p.status}"`), para `cancelado` usar o destaque `.selo.cancelado` que já existe; ao clicar no botão, preencher `#titulo-cancelamento` com `Cancelar o pedido ${id}?` (via `textContent`), limpar `#motivo-cancelamento` e abrir o `<dialog>` com `showModal()`; no evento `close` do diálogo, se `returnValue === 'confirmar'`, desabilitar o botão daquela linha, chamar `cancelarPedido({ api, id, motivo, fetch: window.fetch.bind(window) })` e, se o resultado for `ok`, trocar o selo da linha para `cancelado` com a classe de destaque, remover o botão e mostrar em `#aviso` (via `textContent`) `Pedido ${id} cancelado.`; "Voltar" ou Esc não fazem nada; continuar lendo só `p.id`, `p.cliente`, `p.status`, `p.valor_total` e `p.forma_pagamento` dos pedidos (depende de T002 e T004)

**Checkpoint**: T003 passa; cenários 1 a 4 do quickstart funcionam

---

## Phase 4: User Story 2 - Entender por que o cancelamento não aconteceu (Priority: P2)

**Goal**: recusas mostram a explicação da API e a tabela recarrega com o status real; falha de
rede mostra um aviso e mantém a linha.

**Independent Test**: com a tela aberta, cancelar `PED-1005` por `curl`; usar o botão de
`PED-1005` na tela e ver a explicação "já está cancelado" e a linha recarregada como `cancelado`.

### Tests for User Story 2 ⚠️

- [X] T006 [US2] No mesmo arquivo tests/cliente/cancelamento.test.ts (bloco `describe('recusas e falhas')`), testar `cancelarPedido` com `fetch` falso: resposta 409 com corpo Problem Details `{ title: 'Cancelamento não permitido', detail: 'O pedido PED-1005 já está cancelado.' }` → `{ tipo: 'recusa', mensagem: 'O pedido PED-1005 já está cancelado.' }`; 400 com `detail` → `recusa` com esse `detail`; 404 com `detail` → `recusa` com esse `detail`; 409 com corpo sem `detail` mas com `title` → `recusa` com o `title`; 500 com corpo que não é JSON → `{ tipo: 'recusa', mensagem: 'O cancelamento foi recusado (status 500).' }`; `fetch` que lança erro → `{ tipo: 'falha', mensagem: 'Não foi possível cancelar o pedido PED-1001. Tente de novo.' }` (depende de T003, mesmo arquivo)

### Implementation for User Story 2

- [X] T007 [US2] Em cliente/cancelamento.js, completar `cancelarPedido` conforme specs/003-botao-cancelar-pedido/data-model.md ("Resultado de `cancelarPedido`"): envolver o `fetch` em `try/catch` e, se lançar erro, devolver `{ tipo: 'falha', mensagem: 'Não foi possível cancelar o pedido <id>. Tente de novo.' }`; para respostas não `ok`, tentar ler o corpo como JSON e devolver `{ tipo: 'recusa', mensagem: corpo.detail ?? corpo.title }`; se não houver corpo legível nem `detail`/`title`, devolver `{ tipo: 'recusa', mensagem: 'O cancelamento foi recusado (status N).' }` (depende de T004 e T006)
- [X] T008 [US2] Em cliente/app.js, no tratamento do resultado de `cancelarPedido`: se `recusa`, mostrar `mensagem` em `#aviso` (via `textContent`) e chamar `carregar()` para recarregar a tabela com o status real; se `falha`, mostrar `mensagem` em `#aviso` e reabilitar o botão daquela linha, sem mudar a linha (depende de T005 e T007)

**Checkpoint**: T003 e T006 passam; cenários 5 a 7 do quickstart funcionam

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 Rodar `npx tsc -p .` e `npm test` e corrigir erros de tipo ou testes falhando
- [X] T010 Executar o roteiro de specs/003-botao-cancelar-pedido/quickstart.md (cenários 1 a 8) numa porta livre e num navegador, e registrar qualquer divergência

---

## Dependencies & Execution Order

- **Setup (T001)** e **Foundational (T002)**: independentes entre si; antes das histórias
- **US1**: T003 → T004 → T005 (T005 também depende de T002)
- **US2**: depois da US1; T006 → T007 → T008
- **Polish**: depois das histórias

### Parallel Opportunities

- T001 (tsconfig) e T002 (index.html)
- T003 (testes) pode ser escrito em paralelo com T002

---

## Parallel Example: User Story 1

```bash
Task: "T002 diálogo e aviso em cliente/index.html"
Task: "T003 testes em tests/cliente/cancelamento.test.ts"
```

---

## Implementation Strategy

### MVP First

1. T001 e T002
2. US1 (T003 a T005)
3. Validar com `npm test` e os cenários 1 a 4 do quickstart

### Incremental Delivery

1. MVP (US1)
2. US2 (recusas e falhas)
3. Polish

Tudo cabe num único pull request (Princípio IV).

---

## Notes

- A API não muda (FR-010)
- A tela não reimplementa regras: só esconde o botão de status que não são `criado` ou `pago` (R2)
- Mensagens sempre via `textContent` (R5)
- Não adicionar dependências
