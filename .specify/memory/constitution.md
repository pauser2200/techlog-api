<!--
Sync Impact Report
- Version change: (modelo sem versão) → 1.0.0
- Princípios definidos (antes eram placeholders do modelo):
  - [PRINCIPLE_1_NAME] → I. Nomes de campos em camelCase
  - [PRINCIPLE_2_NAME] → II. Erros de endpoints novos em Problem Details (RFC 9457)
  - [PRINCIPLE_3_NAME] → III. Regra de negócio nova tem teste automatizado
  - [PRINCIPLE_4_NAME] → IV. Mudanças pequenas, um pull request
- Added sections: Contexto do Projeto (no lugar de [SECTION_2_NAME])
- Removed sections: [PRINCIPLE_5_NAME] (foram informados 4 princípios);
  [SECTION_3_NAME] (nenhum conteúdo informado)
- Governance: texto proposto pelo agente (não informado na entrada); revisar
- Follow-up TODOs: nenhum placeholder adiado
-->

# TechLog API Constitution

## Core Principles

### I. Nomes de campos em camelCase

- Nomes de campos da API MUST usar camelCase (ex.: `valorTotal`, `criadoEm`).

### II. Erros de endpoints novos em Problem Details (RFC 9457)

- Todo endpoint novo MUST responder erros no formato Problem Details (RFC 9457), com
  `Content-Type: application/problem+json`.
- Endpoints que já existem MUST manter o formato de erro atual.

### III. Regra de negócio nova tem teste automatizado

- Toda regra de negócio nova MUST vir acompanhada de teste automatizado.

### IV. Mudanças pequenas, um pull request

- Cada mudança MUST ser pequena o bastante para caber num único pull request.

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

**Version**: 1.0.0 | **Ratified**: 2026-11-26 | **Last Amended**: 2026-11-26
