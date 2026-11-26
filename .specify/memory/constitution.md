# TechLog API Constitution

## Core Principles

### I. Campos novos em camelCase

- Todo campo novo da API MUST usar camelCase (ex.: `valorTotal`, `criadoEm`).
- Campos que já existem MUST mudar só por depreciação e MUST NOT ser renomeados.

### II. Erros de endpoints novos em Problem Details (RFC 9457)

- Todo endpoint novo MUST responder erros no formato Problem Details (RFC 9457), com
  `Content-Type: application/problem+json`.
- Endpoints que já existem MUST manter o formato de erro atual.

### III. Regra de negócio nova tem teste automatizado

- Toda regra de negócio nova MUST vir acompanhada de teste automatizado.

### IV. Mudanças pequenas, um pull request

- Cada mudança MUST ser pequena o bastante para caber num único pull request.

### V. O contrato openapi/openapi.yaml é a fonte de verdade

- O contrato da API é `openapi/openapi.yaml`, em OpenAPI 3.1, e MUST ser a fonte de verdade da
  interface.
- O que o plano de uma feature gerar na pasta `contracts/` é proposta; uma mudança de interface só
  vale quando entra no `openapi/openapi.yaml`.

### VI. Tarefa pronta só com os portões passando

- Uma tarefa MUST NOT ser considerada pronta enquanto `npm run portoes` não passar.

## Contexto do Projeto

A TechLog API é uma API REST de pedidos em Node, TypeScript e Express. Ela já está em produção e
tem um cliente web que a consome.

## Governance

- Esta constituição prevalece sobre outras práticas do projeto. Specs, planos, tarefas e pull
  requests MUST ser conferidos contra os princípios acima.
- Um desvio de princípio MUST ser justificado por escrito no plano da feature; sem justificativa,
  o desvio bloqueia a revisão.
- Emendas são feitas por pull request que altera este arquivo, com o motivo da mudança e o
  Sync Impact Report atualizado.
- Versionamento semântico: MAJOR para remover ou redefinir um princípio de forma incompatível;
  MINOR para princípio ou seção nova, ou orientação ampliada; PATCH para ajustes de redação.

**Version**: 1.2.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-26
