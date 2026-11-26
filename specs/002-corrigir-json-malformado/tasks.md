---

description: "Lista de tarefas da correção do erro de JSON malformado nos endpoints antigos"
---

# Tasks: Corrigir erro de JSON malformado nos endpoints antigos

**Input**: Design documents from `/specs/002-corrigir-json-malformado/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/recusa-corpo-ilegivel.md

**Tests**: incluídos. O Princípio III exige teste automatizado para regra nova, e o plano (R2)
define o arquivo `tests/pedidos/erros-corpo.http.test.ts`. Os testes vêm antes da implementação e
MUST falhar antes dela.

**Organization**: uma única história de usuário (US1). Não há tarefas de setup nem de base: o
`npm test` e a estrutura de testes já existem desde a feature 001.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história de usuário da tarefa (US1)

---

## Phase 1: User Story 1 - Recusa de JSON malformado sem expor detalhes internos (Priority: P1) 🎯 MVP

**Goal**: nos endpoints antigos, a recusa de corpo ilegível mantém a página atual, mas sem mensagem
interna, caminho de arquivo nem pilha de chamadas, qualquer que seja o `NODE_ENV`.

**Independent Test**: enviar `{x` com `Content-Type: application/json` para `POST /pedidos`, com e
sem `NODE_ENV=development`, e conferir 400 em `text/html` com `<pre>Bad Request</pre>` e nenhum
detalhe interno.

### Tests for User Story 1 ⚠️

> Escrever primeiro e confirmar que os testes de recusa falham antes da implementação.

- [X] T001 [US1] Criar tests/pedidos/erros-corpo.http.test.ts com `node:test`, `node:assert/strict` e um helper que sobe `criarApp()` com `listen(0)`; para requisições GET com corpo usar `node:http` (`http.request`), porque o `fetch` nativo não aceita corpo em GET. Definir a função `assertSemDetalhes(corpo)` que exige que o corpo NÃO contenha `Error:`, `SyntaxError`, `node_modules`, `"    at "` nem o caminho do projeto (`process.cwd()`). Testar, sempre com `Content-Type: application/json` exceto quando indicado: (a) `POST /pedidos` com corpo `{x` → 400, `content-type` começa com `text/html`, corpo contém `<pre>Bad Request</pre>` e passa em `assertSemDetalhes`; (b) `GET /pedidos` com corpo `{x` → mesmo resultado de (a); (c) `GET /pedidos/PED-1001` com corpo `{x` → mesmo resultado de (a); (d) `POST /pedidos` com corpo JSON acima de 100 KB → 413 com `<pre>Payload Too Large</pre>` e `assertSemDetalhes`; (e) `POST /pedidos` com `Content-Type: application/json; charset=latin9` e corpo `{}` → 415 com `<pre>Unsupported Media Type</pre>` e `assertSemDetalhes`; (f) com `process.env.NODE_ENV = 'development'` definido antes de `criarApp()` (e restaurado ao fim do teste), repetir (a) e obter o mesmo resultado; (g) efeito descrito no plano: `POST /pedidos` com `{"cliente":"x"}` (sem `itens`) → 500 com `<pre>Internal Server Error</pre>` e `assertSemDetalhes`
- [X] T002 [US1] No mesmo arquivo tests/pedidos/erros-corpo.http.test.ts (bloco `describe('não muda')`), testar que continuam iguais: `POST /pedidos/PED-1001/cancelamento` com corpo `{x` → 400 em `application/problem+json`; `GET /pedidos/PED-9999` → 404 com `{"erro": "Pedido não encontrado"}`; `POST /pedidos` com `{"itens": []}` → 400 com `{"message": "cliente é obrigatório", "code": "VALIDACAO"}`; `GET /nada` → 404 com `<pre>Cannot GET /nada</pre>` (depende de T001, mesmo arquivo)

### Implementation for User Story 1

- [X] T003 [US1] Em src/app.ts, dentro de `criarApp()`, logo depois de `const app = express();`, adicionar `app.set('env', 'production');` com um comentário explicando que isso faz a página de erro padrão do Express mostrar só a mensagem do status, sem mensagem interna nem pilha de chamadas, qualquer que seja o `NODE_ENV`, e que o erro completo continua no log do servidor; não mudar a ordem dos middlewares existentes (depende de T001 e T002 falhando/passando como esperado)

**Checkpoint**: T001 e T002 passam; os 27 testes da feature 001 continuam passando

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T004 [P] Em docs/api-pedidos.md, na seção "Erros", trocar a frase final por uma que diga que, nos endpoints antigos, um corpo que não pôde ser lido (JSON malformado, corpo acima de 100 KB, charset não suportado) e uma rota inexistente recebem a página de erro padrão do servidor (HTML), só com a mensagem do status, sem detalhes internos; não mudar o resto do documento
- [X] T005 Rodar `npx tsc -p .` e `npm test` e corrigir erros de tipo ou testes falhando
- [X] T006 Executar o roteiro de specs/002-corrigir-json-malformado/quickstart.md (cenários 1 a 6) numa porta livre e registrar qualquer divergência

---

## Dependencies & Execution Order

- **US1 (Phase 1)**: sem dependências; T001 → T002 (mesmo arquivo) → T003
- **Polish (Phase 2)**: T004 pode rodar em paralelo com a US1 (arquivo diferente); T005 e T006
  depois de T003

### Parallel Opportunities

- T004 (docs) em paralelo com T001–T003

---

## Parallel Example: User Story 1

```bash
# Enquanto os testes e a implementação da US1 andam:
Task: "T004 nota na seção Erros de docs/api-pedidos.md"
```

---

## Implementation Strategy

### MVP First

1. T001 e T002 (testes; os de recusa falham)
2. T003 (uma linha em `src/app.ts`)
3. Validar com `npm test`

A mudança inteira cabe num único pull request (Princípio IV).

---

## Notes

- Não alterar rotas, base, serializador nem o tratador de erros do cancelamento
- Não mudar o formato (HTML, status, cabeçalhos) das recusas dos endpoints antigos (Princípio II)
- Não adicionar dependências
