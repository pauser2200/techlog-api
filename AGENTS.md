# Instruções para agentes de código

Repositório da TechLog API, uma API REST de pedidos em Node, TypeScript e Express, já em produção. Um cliente web em `cliente/` consome a API.

## Leia antes de mudar qualquer coisa

1. `.specify/memory/constitution.md`: os princípios do projeto.
2. `openapi/openapi.yaml`: o contrato da API. É a fonte de verdade da interface.
3. A spec da feature em `specs/`, quando houver.

## Regras do contrato

- Toda mudança na interface começa no `openapi/openapi.yaml`, antes do código.
- O que o plano gerar em `specs/*/contracts/` é proposta. Só vale depois de entrar no `openapi/openapi.yaml`.
- Campo que já existe nunca é renomeado nem removido. Para trocar um nome, acrescente o novo e marque o antigo com `deprecated: true`.
- Erros de endpoints novos usam `application/problem+json` (RFC 9457).

## Antes de dizer que terminou

Rode, nesta ordem, e corrija até tudo passar:

```bash
npm run contrato:lint
npm run contrato:quebras
npm run test:aceite
npm run portoes
```

Se um portão falhar e a correção exigir mudar o contrato de forma incompatível, pare e explique em vez de forçar.
