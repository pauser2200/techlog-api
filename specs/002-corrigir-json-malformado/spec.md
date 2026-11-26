# Feature Specification: Corrigir erro de JSON malformado nos endpoints antigos

**Feature Branch**: `main`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "corrigir erro de JSON malformado nos endpoints antigos"

## Clarifications

### Session 2026-11-26

- Q: Em que formato os endpoints antigos devem recusar um corpo que não pôde ser lido? → A:
  Manter a página atual, só sem os detalhes internos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recusa de JSON malformado sem expor detalhes internos (Priority: P1)

Quem chama um endpoint antigo da API (`POST /pedidos`, por exemplo) com um corpo JSON malformado
recebe uma recusa que diz que o corpo é inválido, sem ver mensagens internas do servidor, nomes de
arquivos ou a pilha de chamadas.

**Why this priority**: hoje a recusa mostra detalhes internos do servidor, o que expõe informação
de implementação numa API em produção.

**Independent Test**: enviar `{x` com tipo JSON para `POST /pedidos` e conferir que a resposta é
uma recusa por requisição inválida que não contém mensagem de erro interna, caminho de arquivo nem
pilha de chamadas.

**Acceptance Scenarios**:

1. **Given** a API rodando, **When** alguém envia um corpo JSON malformado para `POST /pedidos`,
   **Then** a resposta é uma recusa por requisição inválida, no formato definido em FR-002, e não
   contém mensagem de erro interna, caminho de arquivo nem pilha de chamadas.
2. **Given** a API rodando sem nenhuma configuração especial de ambiente, **When** a mesma
   requisição é feita, **Then** o resultado é o mesmo do cenário 1.
3. **Given** a API rodando, **When** alguém envia um corpo JSON malformado para um endpoint antigo
   de consulta (`GET /pedidos` ou `GET /pedidos/{id}`), **Then** a resposta segue as mesmas regras
   do cenário 1.
4. **Given** a API rodando, **When** alguém envia um corpo grande demais ou com codificação não
   suportada para um endpoint antigo, **Then** a recusa também não contém detalhes internos.

---

### Edge Cases

- Requisições válidas aos endpoints antigos continuam com as mesmas respostas, inclusive os erros
  já tratados (`{ "erro": ... }` no `GET /pedidos/{id}` e `{ "message", "code" }` no
  `POST /pedidos`).
- O endpoint de cancelamento continua respondendo esses erros em Problem Details, como hoje.
- Uma rota inexistente continua com a resposta atual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Nos endpoints antigos, a recusa de um corpo que não pôde ser lido (JSON malformado,
  corpo grande demais, codificação não suportada) MUST NOT conter mensagem de erro interna, caminho
  de arquivo nem pilha de chamadas, qualquer que seja a configuração do ambiente.
- **FR-002**: Essa recusa MUST manter o formato atual (a página de erro padrão do servidor),
  apenas sem os detalhes internos, conforme o Princípio II da constituição.
- **FR-003**: A recusa MUST manter o código de status atual de cada caso (400 para JSON malformado,
  413 para corpo grande demais, 415 para codificação não suportada).
- **FR-004**: As respostas dos endpoints antigos para requisições válidas e para os erros já
  tratados MUST continuar iguais.
- **FR-005**: O endpoint de cancelamento MUST continuar respondendo esses erros em Problem Details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das recusas de corpo ilegível nos endpoints antigos não contêm mensagem de erro
  interna, caminho de arquivo nem pilha de chamadas.
- **SC-002**: O resultado de SC-001 vale com e sem configuração de ambiente de produção.
- **SC-003**: 100% das respostas atuais para requisições válidas e erros já tratados continuam
  iguais.
- **SC-004**: O cliente web continua mostrando a lista de pedidos sem erros.

## Assumptions

- "Endpoints antigos" são `GET /pedidos`, `GET /pedidos/{id}` e `POST /pedidos`; o cancelamento já
  tem tratamento próprio e fica como está.
- Além de JSON malformado, entram no escopo os outros erros de leitura do corpo (grande demais,
  codificação não suportada), porque expõem os mesmos detalhes internos.
- Rota inexistente fica fora do escopo: a resposta atual não expõe detalhes internos além do
  caminho pedido.
- A correção não pode depender de configurar o ambiente de produção, porque hoje a API não define
  essa configuração.
