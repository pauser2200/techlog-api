---

description: "Lista de tarefas do cancelamento de pedido"
---

# Tasks: Cancelamento de pedido

**Input**: Design documents from `/specs/001-cancelar-pedido/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cancelamento.openapi.yaml

**Tests**: incluídos. O Princípio III da constituição exige teste automatizado para toda regra de
negócio nova, e o plano define `node:test` rodando com `tsx`. Os testes de cada história vêm antes
da implementação e MUST falhar antes dela.

**Organization**: tarefas agrupadas por história de usuário (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história de usuário da tarefa (US1, US2, US3)

## Path Conventions

Projeto único: `src/` e `tests/` na raiz. Arquivos de teste:

- `tests/pedidos/cancelamento.regra.test.ts`: regra na base, sem HTTP (`criarBase()` direto)
- `tests/pedidos/cancelamento.http.test.ts`: integração; sobe `criarApp()` com `listen(0)` e usa o
  `fetch` nativo; cada teste cria seu próprio app, então os dados não vazam entre testes

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: deixar os testes executáveis

- [X] T001 Adicionar o script `"test": "node --import tsx --test \"tests/**/*.test.ts\""` em package.json, sem mudar os scripts existentes nem adicionar dependências

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos e utilitário de erro usados por todas as histórias

**⚠️ CRITICAL**: nenhuma história começa antes desta fase

- [X] T002 Em src/pedidos/dados.ts, acrescentar `'cancelado'` ao tipo `Status` (ficando `'criado' | 'pago' | 'enviado' | 'entregue' | 'cancelado'`) e os campos opcionais `canceladoEm?: string` ("data e hora ISO 8601 em UTC", "presente só se `status = cancelado`; definido pelo sistema") e `motivoCancelamento?: string` ("1 a 200 caracteres", "presente só se o pedido foi cancelado com motivo") à interface `Pedido`; não alterar os dados de `SEMENTE`
- [X] T003 [P] Em src/pedidos/rotas.ts, criar a função interna `enviarProblema(res, problema)` que responde com `Content-Type: application/problem+json` e o corpo `{ type, title, status, detail, instance, ...extensões }` (Problem Details, RFC 9457; extensões em camelCase); usar só no endpoint novo, sem tocar nas respostas de erro de `GET /pedidos/:id` e `POST /pedidos`

**Checkpoint**: tipos e utilitário prontos

---

## Phase 3: User Story 1 - Cancelar um pedido que ainda não foi enviado (Priority: P1) 🎯 MVP

**Goal**: `POST /pedidos/{id}/cancelamento` cancela pedidos criados ou pagos, com motivo opcional,
e devolve o pedido cancelado; pedidos em outros status não são cancelados.

**Independent Test**: cancelar `PED-1001` (criado) sem motivo e `PED-1002` (pago) com motivo
"cliente desistiu"; os dois voltam 200 com `status: "cancelado"` e `canceladoEm`, e só o segundo
com `motivoCancelamento`.

### Tests for User Story 1 ⚠️

> Escrever primeiro e confirmar que falham antes da implementação.

- [X] T004 [P] [US1] Em tests/pedidos/cancelamento.regra.test.ts, testar `base.cancelar()`: `PED-1001` sem motivo fica `cancelado`, com `canceladoEm` em ISO 8601 e sem `motivoCancelamento`; `PED-1002` com `"cliente desistiu"` guarda o motivo; motivo `""` e `"   "` resultam em sem motivo; motivo `"  x  "` é guardado como `"x"`; cancelar `PED-1002` (pago) mantém `formaPagamento` igual à original (FR-008a)
- [X] T005 [P] [US1] Em tests/pedidos/cancelamento.http.test.ts (bloco `describe('US1')`), testar: `POST /pedidos/PED-1001/cancelamento` sem corpo → 200 com `status: "cancelado"`, `canceladoEm` e sem `motivoCancelamento`; `POST /pedidos/PED-1002/cancelamento` com `{"motivo":"cliente desistiu"}` → 200 com `motivoCancelamento: "cliente desistiu"`; a resposta mantém os campos atuais (`id`, `cliente`, `status`, `valor_total`, `criadoEm`, `forma_pagamento`, `itens`); um pedido não cancelado em `GET /pedidos/PED-1005` não tem `canceladoEm` nem `motivoCancelamento`

### Implementation for User Story 1

- [X] T006 [US1] Em src/pedidos/dados.ts, adicionar `cancelar(id: string, motivo?: string)` ao objeto de `criarBase()`, devolvendo `{ tipo: 'ok', pedido } | { tipo: 'nao-encontrado' } | { tipo: 'nao-permitido', statusAtual }`: pedido inexistente → `nao-encontrado`; status diferente de `criado` e `pago` → `nao-permitido` sem alterar o pedido; caso contrário, `status = 'cancelado'`, `canceladoEm = new Date().toISOString()` e `motivoCancelamento` com o motivo sem espaços nas pontas, só se não ficar vazio ("após remover espaços das pontas, vazio = sem motivo"); não mexer em `formaPagamento` nem em outros campos (depende de T002)
- [X] T007 [P] [US1] Em src/pedidos/serializar.ts, incluir `canceladoEm` e `motivoCancelamento` em `serializarPedido` só quando estiverem definidos no pedido, depois dos campos atuais; não renomear nem reordenar os campos existentes (depende de T002)
- [X] T008 [US1] Em src/pedidos/rotas.ts, criar `POST /pedidos/:id/cancelamento`: ler `req.body?.motivo`, chamar `base.cancelar()` e responder 200 com `serializarPedido(pedido)`; para `nao-encontrado`, `enviarProblema` 404 com `type: "/problemas/pedido-nao-encontrado"`, `title: "Pedido não encontrado"`, `detail: "Não existe pedido com o id <id>."`; para `nao-permitido`, `enviarProblema` 409 com `type: "/problemas/cancelamento-nao-permitido"`, `title: "Cancelamento não permitido"`, `statusAtual` e `detail` explicando o status (ex.: "O pedido PED-1003 já foi enviado e não pode mais ser cancelado.", "... já foi entregue ...", "... já está cancelado."); `instance` = caminho da requisição (depende de T003, T006, T007)

**Checkpoint**: US1 funcional; T004 e T005 passam

---

## Phase 4: User Story 2 - Entender por que um cancelamento foi recusado (Priority: P2)

**Goal**: toda recusa explica o motivo em Problem Details: status que não permite (409), pedido
inexistente (404), motivo inválido e JSON malformado (400).

**Independent Test**: tentar cancelar `PED-1003` (enviado), `PED-1004` (entregue), `PED-9999`, um
pedido já cancelado e um motivo de 201 caracteres; cada um é recusado com o status e o corpo do
contrato, e nenhum pedido muda.

### Tests for User Story 2 ⚠️

- [X] T009 [P] [US2] Em tests/pedidos/cancelamento.regra.test.ts (bloco `describe('US2')`), testar: `PED-1003` → `nao-permitido` com `statusAtual: 'enviado'`; `PED-1004` → `statusAtual: 'entregue'`; `PED-9999` → `nao-encontrado`; cancelar `PED-1001` duas vezes → a segunda dá `statusAtual: 'cancelado'` e `canceladoEm` e `motivoCancelamento` da primeira não mudam; em todos, o pedido fica igual
- [X] T010 [US2] Em tests/pedidos/cancelamento.http.test.ts (bloco `describe('US2')`), testar, conferindo `Content-Type: application/problem+json` e os membros `type`, `title`, `status`, `detail`, `instance`: `PED-1003` → 409 com `statusAtual: "enviado"`; `PED-1004` → 409 com `statusAtual: "entregue"`; segundo cancelamento de `PED-1001` → 409 com `statusAtual: "cancelado"`; `PED-9999` → 404 com `type: "/problemas/pedido-nao-encontrado"`; motivo com 201 caracteres em `PED-1001` → 400 com `type: "/problemas/validacao"` e `campo: "motivo"`, e `GET /pedidos/PED-1001` continua `criado`; motivo com exatamente 200 caracteres → 200; `{"motivo": 123}` → 400 com `campo: "motivo"`; corpo `{motivo` com `Content-Type: application/json` → 400 em problem+json (depende de T005, mesmo arquivo)

### Implementation for User Story 2

- [X] T011 [US2] Em src/pedidos/rotas.ts, validar o motivo no início de `POST /pedidos/:id/cancelamento`, antes de chamar `base.cancelar()`: se `motivo` estiver presente e não for texto, ou tiver mais de 200 caracteres depois de remover os espaços das pontas ("mais de 200 caracteres = recusa 400"), responder `enviarProblema` 400 com `type: "/problemas/validacao"`, `title: "Requisição inválida"`, `detail` explicando o problema (ex.: "O motivo pode ter no máximo 200 caracteres.") e `campo: "motivo"`; corpo ausente ou `{}` = sem motivo; campos desconhecidos são ignorados
- [X] T012 [US2] Em src/pedidos/rotas.ts, exportar `tratarJsonInvalidoCancelamento(err, req, res, next)`: se `err.type === 'entity.parse.failed'` e a requisição for `POST` para `/pedidos/<id>/cancelamento`, responder `enviarProblema` 400 com `type: "/problemas/validacao"`, `title: "Requisição inválida"` e `detail: "O corpo da requisição não é um JSON válido."`; caso contrário, `next(err)`
- [X] T013 [US2] Em src/app.ts, registrar `app.use(tratarJsonInvalidoCancelamento)` depois de `app.use(rotasPedidos(...))`, sem mudar a ordem dos middlewares existentes (depende de T012)

**Checkpoint**: US1 e US2 funcionais; T009 e T010 passam

---

## Phase 5: User Story 3 - Ver pedidos cancelados na lista (Priority: P3)

**Goal**: pedidos cancelados continuam na lista, na consulta individual e no filtro por status.

**Independent Test**: cancelar `PED-1001` e `PED-1002` e conferir `GET /pedidos`,
`GET /pedidos?status=cancelado` e `GET /pedidos/PED-1002`.

### Tests for User Story 3 ⚠️

- [X] T014 [US3] Em tests/pedidos/cancelamento.http.test.ts (bloco `describe('US3')`), testar: depois de cancelar `PED-1001` e `PED-1002` (este com motivo), `GET /pedidos` traz os 5 pedidos e os dois cancelados com `status: "cancelado"` e `canceladoEm`; `GET /pedidos?status=cancelado` traz só `PED-1001` e `PED-1002`; `GET /pedidos/PED-1002` traz `status`, `canceladoEm` e `motivoCancelamento` (depende de T010, mesmo arquivo)

### Implementation for User Story 3

- [X] T015 [US3] Rodar `npm test` e confirmar que T014 passa sem mudar `listar` em src/pedidos/dados.ts (o filtro por status já compara o texto); se algo falhar, ajustar só `listar`/`buscar` em src/pedidos/dados.ts

**Checkpoint**: as três histórias funcionam

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 Em tests/pedidos/cancelamento.http.test.ts (bloco `describe('compatibilidade')`), testar que os endpoints existentes não mudaram: `GET /pedidos/PED-9999` → 404 com `{"erro": "Pedido não encontrado"}`; `POST /pedidos` sem `cliente` → 400 com `{"message": "cliente é obrigatório", "code": "VALIDACAO"}` (FR-012, Princípio II)
- [X] T017 [P] Em docs/api-pedidos.md, acrescentar `POST /pedidos/{id}/cancelamento` (corpo `motivo` opcional, até 200 caracteres), o status `cancelado`, os campos `canceladoEm` e `motivoCancelamento` e as recusas em Problem Details (400, 404, 409), seguindo specs/001-cancelar-pedido/contracts/cancelamento.openapi.yaml; não corrigir as outras partes do documento (Princípio IV)
- [X] T018 Rodar `npx tsc -p .` e `npm test` e corrigir erros de tipo ou testes falhando
- [X] T019 Executar o roteiro de specs/001-cancelar-pedido/quickstart.md (cenários 1 a 10 e cliente web em `http://localhost:3000/`) e registrar qualquer divergência

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depois do Setup; bloqueia as histórias
- **US1 (Phase 3)**: depois da Fase 2
- **US2 (Phase 4)**: depois da US1 (usa o endpoint e `base.cancelar()`)
- **US3 (Phase 5)**: depois da US1 (precisa de pedidos cancelados); independente da US2
- **Polish (Phase 6)**: depois das histórias

### User Story Dependencies

- **US1 (P1)**: só da Fase 2
- **US2 (P2)**: da US1, como a spec indica
- **US3 (P3)**: da US1, como a spec indica

### Within Each User Story

- Testes primeiro, falhando
- Tipos (T002) → base (T006) → serializador (T007) → rota (T008)
- Tarefas no mesmo arquivo seguem a ordem dos IDs

### Parallel Opportunities

- T002 e T003 (arquivos diferentes)
- T004 e T005 (arquivos de teste diferentes)
- T006 e T007 depois de T002 (dados.ts e serializar.ts)
- T009 e T011/T012 (teste da regra × rotas.ts)
- T017 em paralelo com T016

---

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos:
Task: "T004 testes da regra em tests/pedidos/cancelamento.regra.test.ts"
Task: "T005 testes HTTP em tests/pedidos/cancelamento.http.test.ts"

# Depois de T002, base e serializador juntos:
Task: "T006 base.cancelar() em src/pedidos/dados.ts"
Task: "T007 campos novos em src/pedidos/serializar.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 e Fase 2
2. Fase 3 (US1)
3. Parar e validar com T004, T005 e os cenários 1, 2 e 3 do quickstart

### Incremental Delivery

1. Setup + Foundational
2. US1 → validar (MVP)
3. US2 → validar
4. US3 → validar
5. Polish

Tudo cabe num único pull request (Princípio IV).

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente
- Confirmar que os testes falham antes de implementar
- Não renomear campos existentes nem mudar formatos de erro dos endpoints atuais (FR-012)
- Não adicionar dependências

---

## Phase 7: Convergence

- [X] T020 CRITICAL: Resolver o conflito entre o Princípio I (nomes de campos em camelCase, sem exceção) e o FR-012 (manter `valor_total`, `forma_pagamento`, `preco_unitario`, `final_cartao`, `linha_digitavel`, que hoje saem de src/pedidos/serializar.ts, inclusive na resposta de `POST /pedidos/{id}/cancelamento`); a decisão é da pessoa responsável pelo projeto (emendar a constituição com `/speckit-constitution` ou planejar a migração dos campos numa feature própria) e nenhum campo existente pode ser renomeado antes dela per Constitution I (contradicts)
- [X] T021 CRITICAL: Em src/pedidos/rotas.ts, ampliar `tratarJsonInvalidoCancelamento` para responder em Problem Details (`Content-Type: application/problem+json`, `type: "/problemas/validacao"`, `status` igual ao `err.status` do erro, ex.: 400, 413, 415) qualquer erro do `express.json()` (erros com `err.type` e `err.status` 4xx) em `POST /pedidos/{id}/cancelamento`, mantendo `next(err)` para os outros caminhos; e em tests/pedidos/cancelamento.http.test.ts testar corpo acima de 100 KB (413) e `Content-Type: application/json; charset=latin9` (415) per Constitution II (partial)
- [X] T022 CRITICAL: Em tests/pedidos/cancelamento.http.test.ts, testar que um motivo com 200 caracteres cercado de espaços (`"  " + "a".repeat(200) + "  "`) é aceito com 200 e guardado em `motivoCancelamento` sem os espaços (200 caracteres), para que o teste falhe se o limite deixar de valer "para o texto já sem os espaços das pontas" per Constitution III (partial)
- [X] T023 Em tests/pedidos/cancelamento.regra.test.ts, conferir que `canceladoEm` fica entre o instante anterior e o posterior à chamada de `base.cancelar()` per US1/AC1 (partial)
