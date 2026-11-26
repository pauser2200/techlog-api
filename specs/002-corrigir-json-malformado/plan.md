# Implementation Plan: Corrigir erro de JSON malformado nos endpoints antigos

**Branch**: `main` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-corrigir-json-malformado/spec.md`

## Summary

Nos endpoints antigos, a recusa de um corpo ilegível (JSON malformado, corpo grande demais,
codificação não suportada) mostra a mensagem interna e a pilha de chamadas do servidor. A correção
fixa a configuração `env` do app Express em `'production'` dentro de `criarApp()`: a página de
erro continua a mesma (formato atual, Princípio II), mas passa a trazer só a mensagem padrão do
status, qualquer que seja o `NODE_ENV`. O erro completo continua no log do servidor.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 24.18+, módulos ES (NodeNext)

**Primary Dependencies**: Express 5 (página de erro padrão gerada pelo `finalhandler`); `tsx`

**Storage**: N/A (base em memória, sem mudança)

**Testing**: `node:test` + `node:assert/strict` via `npm test`; integração com `fetch` nativo
contra `criarApp()` em porta livre

**Target Platform**: servidor Node (API REST)

**Project Type**: web-service (API REST)

**Performance Goals**: sem meta; nenhuma mudança de desempenho

**Constraints**: manter o formato de erro atual dos endpoints antigos (Princípio II, FR-002);
não depender de `NODE_ENV` (FR-001); não mudar respostas válidas nem erros tratados (FR-004);
manter o Problem Details do cancelamento (FR-005)

**Scale/Scope**: 1 linha de configuração em `src/app.ts` e 1 arquivo de testes novo; um único PR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|-----------|---------------------|----------|
| I. Campos novos em camelCase | Nenhum campo novo | Passa (não se aplica) |
| II. Erros de endpoints novos em Problem Details; existentes mantêm o formato | Os endpoints antigos mantêm a mesma página HTML, mesmo status e cabeçalhos; muda só o texto interno. O cancelamento continua em Problem Details | Passa |
| III. Regra de negócio nova tem teste | Testes para 400, 413 e 415 nos endpoints antigos, com e sem `NODE_ENV=development`, e para o que não pode mudar | Passa |
| IV. Mudanças pequenas, um PR | Uma linha em `src/app.ts`, um arquivo de testes e a atualização de `docs/api-pedidos.md` | Passa |

**Re-check pós-design (Fase 1)**: contrato, modelo de dados e quickstart mantêm as quatro linhas.
Sem violações.

**Observação**: a configuração também tira os detalhes internos da página de outros erros não
tratados dos endpoints antigos (ex.: o erro 500 de `POST /pedidos` sem `itens`). O formato e o
status dessas páginas não mudam; ver research.md, R1.

## Project Structure

### Documentation (this feature)

```text
specs/002-corrigir-json-malformado/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── recusa-corpo-ilegivel.md
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
└── app.ts                          # app.set('env', 'production') em criarApp()

tests/
└── pedidos/
    └── erros-corpo.http.test.ts    # recusas 400/413/415 nos endpoints antigos e o que não muda

docs/api-pedidos.md                 # nota da seção Erros: a página não traz detalhes internos
```

**Structure Decision**: projeto único; a mudança fica na criação do app (`src/app.ts`), que já
concentra a configuração do Express. Rotas, base e serializador não mudam.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
