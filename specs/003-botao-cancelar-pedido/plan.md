# Implementation Plan: Botão de cancelar pedido na tabela do cliente web

**Branch**: `main` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-botao-cancelar-pedido/spec.md`

## Summary

A tabela do cliente web ganha um botão "Cancelar" nas linhas de pedidos criados ou pagos. O botão
abre uma confirmação nativa (`<dialog>`) com um campo opcional de motivo; ao confirmar, a tela chama
o `POST /pedidos/{id}/cancelamento` que já existe. Sucesso atualiza a linha para `cancelado`;
recusa mostra o `detail` da API e recarrega a tabela; falha de rede mostra um aviso. A lógica
testável fica num módulo novo (`cliente/cancelamento.js`) e a API não muda.

## Technical Context

**Language/Version**: JavaScript (ES modules, sem build) no navegador; TypeScript 5.9 nos testes

**Primary Dependencies**: nenhuma nova; `fetch` e `<dialog>` nativos do navegador

**Storage**: N/A

**Testing**: `node:test` + `node:assert/strict` via `npm test`, importando `cliente/cancelamento.js`
com um `fetch` falso; o resto da tela é conferido pelo quickstart

**Target Platform**: navegadores atuais (cliente web servido pela própria API em `/`)

**Project Type**: web-service com cliente web estático

**Performance Goals**: sem meta; uma chamada por cancelamento e um recarregamento da tabela em
caso de recusa

**Constraints**: nenhuma mudança na API (FR-010); a tela não reimplementa regras (R2); funcionar
também apontando para o mock (`?api=`), cujo contrato não tem `statusAtual` (R3)

**Scale/Scope**: 1 módulo novo, mudanças em `cliente/app.js` e `cliente/index.html`, 1 arquivo de
testes, `allowJs` no `tsconfig.json`; um único PR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano atende | Situação |
|-----------|---------------------|----------|
| I. Campos novos em camelCase | Nenhum campo novo; a tela envia `motivo`, que já existe | Passa (não se aplica) |
| II. Erros de endpoints novos em Problem Details; existentes mantêm o formato | Nenhum endpoint novo nem alterado; a tela lê o `detail` do Problem Details que o cancelamento já devolve | Passa |
| III. Regra de negócio nova tem teste | `podeCancelar`, `corpoDoCancelamento` e `cancelarPedido` (200, 400, 404, 409, erro de rede) testados em `tests/cliente/cancelamento.test.ts` | Passa |
| IV. Mudanças pequenas, um PR | Só o cliente web, um módulo, testes e uma opção no `tsconfig.json`; sem refatorar o resto do cliente | Passa |

**Re-check pós-design (Fase 1)**: contrato da tela, modelo de dados e quickstart mantêm as quatro
linhas. Sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/003-botao-cancelar-pedido/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tela-cancelamento.md
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
cliente/
├── cancelamento.js     # novo: podeCancelar, corpoDoCancelamento, cancelarPedido
├── app.js              # coluna de ação, botão, diálogo, aviso, atualização da linha
└── index.html          # <dialog> de confirmação, área de aviso, script como module

tests/
└── cliente/
    └── cancelamento.test.ts   # testes das funções de cliente/cancelamento.js

tsconfig.json           # "allowJs": true (para os testes importarem o módulo)
```

**Structure Decision**: o cliente continua sem build; a lógica nova vai para um módulo próprio para
poder ser testada, e `app.js` passa a ser carregado como ES module para importá-lo.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
