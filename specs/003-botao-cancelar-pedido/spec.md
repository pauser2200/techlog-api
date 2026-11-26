# Feature Specification: Botão de cancelar pedido na tabela do cliente web

**Feature Branch**: `main`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Criar um botão na tabela para cancelar os pedidos criados e pagos seguindo as mesmas regras que existem hoje"

## Clarifications

### Session 2026-11-26

- Q: A tela deve deixar quem opera a loja informar um motivo? → A: Sim: um campo opcional de
  motivo junto com a confirmação.
- Q: A tabela deve mostrar quando e por que um pedido foi cancelado? → A: Não: só o status
  cancelado, com o destaque que já existe no estilo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancelar um pedido pela tabela (Priority: P1)

Quem opera a loja vê a tabela de pedidos no cliente web e, na linha de um pedido criado ou pago,
usa o botão de cancelar. Depois de confirmar, o pedido passa a aparecer como cancelado na própria
tabela, sem precisar recarregar a página.

**Why this priority**: hoje o cancelamento só existe na API; quem opera a loja não tem como
cancelar pela tela.

**Independent Test**: abrir o cliente web, cancelar `PED-1001` (criado) pelo botão, confirmar e
ver a linha mudar para o status cancelado.

**Acceptance Scenarios**:

1. **Given** a tabela de pedidos, **When** ela é exibida, **Then** só as linhas de pedidos com
   status criado ou pago têm o botão de cancelar.
2. **Given** um pedido criado, **When** quem opera a loja usa o botão e confirma, **Then** o pedido
   é cancelado e a linha passa a mostrar o status cancelado, sem o botão.
3. **Given** um pedido pago, **When** quem opera a loja usa o botão, informa um motivo e confirma,
   **Then** o pedido é cancelado com esse motivo.
4. **Given** a confirmação aberta, **When** quem opera a loja desiste, **Then** nada é cancelado e
   a linha continua igual.

---

### User Story 2 - Entender por que o cancelamento não aconteceu (Priority: P2)

Se o cancelamento for recusado (por exemplo, o pedido já foi enviado por outra pessoa enquanto a
tela estava aberta, ou o motivo passou do limite), quem opera a loja vê na tela a explicação da
recusa, e a linha continua com o status real do pedido.

**Why this priority**: as regras de hoje recusam alguns cancelamentos, e quem tentou precisa
entender por quê. Depende da US1.

**Independent Test**: com a tela aberta, enviar o pedido por outro meio (ou simular a recusa),
usar o botão e conferir que a explicação aparece e a linha mostra o status atual.

**Acceptance Scenarios**:

1. **Given** um pedido que mudou para enviado depois que a tabela foi exibida, **When** quem opera
   a loja tenta cancelá-lo pelo botão, **Then** a tela mostra a explicação da recusa e a linha
   passa a mostrar o status atual do pedido, sem o botão.
2. **Given** um motivo com mais de 200 caracteres, **When** quem opera a loja confirma o
   cancelamento, **Then** a tela mostra a explicação da recusa e o pedido não é cancelado.
3. **Given** a API indisponível, **When** quem opera a loja tenta cancelar, **Then** a tela avisa
   que não foi possível cancelar e a linha continua igual.

---

### Edge Cases

- Pedidos enviados, entregues ou já cancelados nunca mostram o botão.
- Dois cliques seguidos no mesmo botão não geram dois cancelamentos: enquanto o primeiro está em
  andamento, o botão fica indisponível.
- Motivo vazio ou só com espaços vale como sem motivo, como já acontece hoje.
- A tabela continua funcionando quando o cliente web aponta para outro servidor da API (o mock).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tabela MUST mostrar o botão de cancelar apenas nas linhas de pedidos com status
  criado ou pago.
- **FR-002**: Antes de cancelar, a tela MUST pedir confirmação de quem opera a loja; desistir não
  cancela nada.
- **FR-003**: A confirmação do cancelamento MUST ter um campo opcional de motivo; deixar o campo
  vazio cancela sem motivo.
- **FR-004**: O cancelamento pela tela MUST seguir as regras que já existem na API: só criado e
  pago podem ser cancelados, o motivo tem no máximo 200 caracteres e não há estorno.
- **FR-005**: Depois de um cancelamento bem-sucedido, a linha MUST mostrar o status cancelado, sem
  o botão, sem recarregar a página.
- **FR-006**: Quando o cancelamento for recusado, a tela MUST mostrar a explicação devolvida pela
  recusa e a linha MUST mostrar o status atual do pedido.
- **FR-007**: Quando não for possível falar com a API, a tela MUST avisar que o cancelamento não
  foi feito, sem mudar a linha.
- **FR-008**: Enquanto um cancelamento está em andamento, o botão daquela linha MUST ficar
  indisponível.
- **FR-009**: Para pedidos cancelados, a tabela MUST mostrar só o status cancelado, com destaque
  visual; a data e o motivo do cancelamento não aparecem na tabela.
- **FR-010**: A API MUST continuar igual: nenhuma regra, campo ou formato de erro muda.

### Key Entities

- **Pedido**: o mesmo da feature 001; a tela usa o status e envia o motivo opcional ao cancelar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem opera a loja cancela um pedido criado ou pago pela tela em até 3 ações (botão,
  motivo opcional, confirmação).
- **SC-002**: 100% das linhas de pedidos enviados, entregues ou cancelados aparecem sem o botão.
- **SC-003**: 100% das recusas mostram na tela a explicação da recusa.
- **SC-004**: Depois de cancelar, a linha mostra o novo status sem recarregar a página.

## Assumptions

- "As mesmas regras que existem hoje" são as da feature 001: só criado e pago podem ser
  cancelados, motivo opcional de até 200 caracteres, sem estorno, recusa com explicação.
- A tela não reimplementa as regras: quem decide é a API, e a tela só mostra o resultado.
- Não há login no cliente web, como na API; controle de acesso fica fora do escopo.
- A confirmação antes de cancelar é obrigatória, porque o cancelamento é definitivo.
