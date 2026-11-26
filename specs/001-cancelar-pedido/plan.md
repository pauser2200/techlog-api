# Implementation Plan: Cancelamento de pedido

**Branch**: `main` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-cancelar-pedido/spec.md`

## Summary

Permitir cancelar pedidos com status criado ou pago por um endpoint novo,
`POST /pedidos/{id}/cancelamento`, com motivo opcional de até 200 caracteres. O pedido passa a
`cancelado`, guarda `canceladoEm` e, se houver, `motivoCancelamento`, e continua na lista e na
consulta. Recusas (pedido inexistente, status que não permite, motivo inválido) saem em Problem
Details. A regra fica na base em memória, a rota traduz o resultado em HTTP e o serializador
ganha os campos novos; os endpoints existentes mantêm seus campos e formatos de erro.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 24.18+, módulos ES (NodeNext)

**Primary Dependencies**: Express 5; `tsx` para executar TypeScript

**Storage**: base em memória (`criarBase()` em `src/pedidos/dados.ts`), recriada a cada execução

**Testing**: `node:test` + `node:assert/strict`, rodando com `node --import tsx --test`
(`npm test`); integração via `fetch` nativo contra `criarApp()` em porta livre

**Target Platform**: servidor Node (API REST) com o cliente web estático em `cliente/`

**Project Type**: web-service (API REST)

**Performance Goals**: sem meta específica; uma operação em memória por requisição

**Constraints**: não mudar campos nem formatos de erro dos endpoints existentes (FR-012);
o cliente web atual tem de continuar funcionando sem alteração

**Scale/Scope**: 1 endpoint novo, 1 status novo, 2 campos novos no pedido; um único PR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|-----------|---------------------|----------|
| I. Campos novos em camelCase | Campos novos: `motivo` (requisição), `canceladoEm`, `motivoCancelamento` (resposta), extensões `statusAtual` e `campo` | Passa |
| II. Erros de endpoints novos em Problem Details | O endpoint novo responde 400/404/409/413/415 em `application/problem+json` com `type`, `title`, `status`, `detail`, `instance`; inclusive erros de leitura do corpo (R5). `GET /pedidos/{id}` e `POST /pedidos` mantêm os formatos atuais | Passa |
| III. Regra de negócio nova tem teste | Testes da regra (base) e de integração (HTTP) para cada transição permitida e cada recusa, incluindo o corpo Problem Details | Passa |
| IV. Mudanças pequenas, um PR | Uma rota, um método na base, dois campos no serializador, testes e docs; sem refatorar código existente | Passa |

**Observação**: os campos existentes em snake_case (`valor_total`, `forma_pagamento`,
`preco_unitario`) continuam como estão (FR-012). Desde a constituição 1.1.0, o Princípio I vale
só para campos novos, então esses campos não são desvio.

**Re-check pós-design (Fase 1)**: o contrato, o modelo de dados e o quickstart mantêm as quatro
linhas acima. Sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/001-cancelar-pedido/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cancelamento.openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app.ts                  # registra o middleware de erros de leitura do corpo do cancelamento (R5)
├── server.ts               # sem mudança
└── pedidos/
    ├── dados.ts            # Status + 'cancelado'; campos canceladoEm/motivoCancelamento; base.cancelar()
    ├── rotas.ts            # POST /pedidos/:id/cancelamento; Problem Details; exporta o middleware de erros de leitura do corpo
    └── serializar.ts       # serializa canceladoEm e motivoCancelamento quando existirem

tests/
└── pedidos/
    ├── cancelamento.regra.test.ts        # regra na base (sem HTTP)
    └── cancelamento.http.test.ts         # integração do endpoint e da lista

docs/api-pedidos.md         # acrescenta endpoint, status e campos novos
package.json                # script "test"
```

**Structure Decision**: projeto único, usando a estrutura que já existe em `src/pedidos`
(rotas Express, base em memória e serializador), como pedido. A pasta `tests/` é nova e já está
prevista no `include` do `tsconfig.json`.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
