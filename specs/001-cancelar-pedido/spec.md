# Feature Specification: Cancelamento de pedido

**Feature Branch**: `main`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "Permitir que um pedido seja cancelado antes de ser enviado. Quem opera a loja informa o pedido e, se quiser, um motivo. Pedidos já enviados ou entregues não podem ser cancelados, e quem tentou precisa entender por quê. Um pedido cancelado continua aparecendo na lista, com o status cancelado e a data do cancelamento."

## Clarifications

### Session 2026-11-26

- Q: Quando um pedido pago for cancelado, o que deve acontecer com o pagamento? → A: Só cancela:
  o pedido vira cancelado e o estorno fica fora do escopo, tratado fora do sistema.
- Q: O que deve acontecer quando alguém tenta cancelar um pedido que já está cancelado? → A:
  Recusa com explicação ("pedido já está cancelado"); data e motivo originais não mudam.
- Q: Qual deve ser o tamanho máximo do motivo do cancelamento? → A: Opcional, até 200
  caracteres. Acima disso, recusa com erro de validação. Motivo vazio vale como sem motivo.
- Q: Quem deve poder cancelar um pedido? → A: Quem pode cancelar e autenticação ficam fora do
  escopo. A API ainda não tem autenticação.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancelar um pedido que ainda não foi enviado (Priority: P1)

Quem opera a loja escolhe um pedido que ainda não saiu para entrega e o cancela, informando um
motivo se quiser. O pedido passa a ter o status cancelado e registra quando o cancelamento
aconteceu.

**Why this priority**: é o objetivo da funcionalidade. Sem isso, não há como desfazer um pedido
que não deve mais ser atendido.

**Independent Test**: cancelar um pedido com status criado e outro com status pago, e conferir
que os dois passam a cancelado, com data de cancelamento e, quando informado, o motivo.

**Acceptance Scenarios**:

1. **Given** um pedido com status criado, **When** quem opera a loja o cancela sem informar
   motivo, **Then** o pedido passa a ter status cancelado e data de cancelamento igual ao momento
   do cancelamento.
2. **Given** um pedido com status pago, **When** quem opera a loja o cancela informando o motivo
   "cliente desistiu", **Then** o pedido passa a ter status cancelado, data de cancelamento e o
   motivo "cliente desistiu" registrado.
3. **Given** um pedido cancelado com sucesso, **When** quem opera a loja recebe a resposta do
   cancelamento, **Then** a resposta mostra o pedido já com status cancelado, a data de
   cancelamento e o motivo, se houver.

---

### User Story 2 - Entender por que um cancelamento foi recusado (Priority: P2)

Quem opera a loja tenta cancelar um pedido que já foi enviado ou entregue e recebe uma recusa que
explica o motivo: o pedido já saiu para entrega e por isso não pode mais ser cancelado.

**Why this priority**: protege pedidos que já estão com o cliente ou a caminho e evita que a
pessoa fique sem saber o que aconteceu. Depende da existência do cancelamento (US1).

**Independent Test**: tentar cancelar um pedido enviado e um entregue, e conferir que nenhum dos
dois muda e que a recusa informa o status atual e por que ele impede o cancelamento.

**Acceptance Scenarios**:

1. **Given** um pedido com status enviado, **When** quem opera a loja tenta cancelá-lo, **Then** o
   cancelamento é recusado, o pedido continua enviado e a recusa explica que pedidos já enviados
   não podem ser cancelados.
2. **Given** um pedido com status entregue, **When** quem opera a loja tenta cancelá-lo, **Then**
   o cancelamento é recusado, o pedido continua entregue e a recusa explica que pedidos já
   entregues não podem ser cancelados.
3. **Given** um pedido que não existe, **When** quem opera a loja tenta cancelá-lo, **Then** o
   cancelamento é recusado e a recusa informa que o pedido não foi encontrado.
4. **Given** um pedido já cancelado, **When** quem opera a loja tenta cancelá-lo de novo, **Then**
   o cancelamento é recusado, a recusa explica que o pedido já está cancelado e a data e o motivo
   do cancelamento original não mudam.
5. **Given** um pedido com status criado, **When** quem opera a loja tenta cancelá-lo com um
   motivo de 201 caracteres, **Then** o cancelamento é recusado com erro de validação e o pedido
   continua com status criado.

---

### User Story 3 - Ver pedidos cancelados na lista (Priority: P3)

Quem consulta a lista de pedidos continua vendo os pedidos cancelados, identificados pelo status
cancelado e com a data do cancelamento.

**Why this priority**: mantém o histórico completo e permite acompanhar o que foi cancelado.
Depende de existirem pedidos cancelados (US1).

**Independent Test**: cancelar um pedido e conferir que ele aparece na lista geral e na lista
filtrada pelo status cancelado, com a data do cancelamento.

**Acceptance Scenarios**:

1. **Given** um pedido cancelado, **When** alguém consulta a lista de pedidos, **Then** o pedido
   aparece com status cancelado e a data do cancelamento.
2. **Given** pedidos cancelados e não cancelados, **When** alguém filtra a lista pelo status
   cancelado, **Then** aparecem apenas os pedidos cancelados.
3. **Given** um pedido cancelado, **When** alguém consulta esse pedido individualmente, **Then**
   ele aparece com status cancelado, a data do cancelamento e o motivo, se houver.

---

### Edge Cases

- Pedido já cancelado: uma nova tentativa de cancelamento é recusada com a explicação de que o
  pedido já está cancelado, e a data e o motivo originais não mudam.
- Motivo vazio: tratado como "sem motivo".
- Motivo com mais de 200 caracteres: o cancelamento é recusado com erro de validação e o pedido
  não muda.
- Motivo que não é texto (por exemplo, um número): o cancelamento é recusado com erro de
  validação e o pedido não muda.
- Pedidos que nunca foram cancelados não ganham data nem motivo de cancelamento.
- O cliente web atual, que mostra a lista de pedidos, continua funcionando quando a lista inclui
  pedidos cancelados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que quem opera a loja cancele um pedido informando qual é o
  pedido.
- **FR-002**: O sistema MUST aceitar, de forma opcional, um motivo em texto livre para o
  cancelamento, com no máximo 200 caracteres, contados sem os espaços do começo e do fim.
  Motivo vazio MUST ser tratado como sem motivo.
- **FR-002a**: O sistema MUST recusar com erro de validação, sem alterar o pedido, um
  cancelamento cujo motivo tenha mais de 200 caracteres.
- **FR-003**: O sistema MUST permitir o cancelamento apenas de pedidos com status criado ou pago.
- **FR-004**: O sistema MUST recusar o cancelamento de pedidos com status enviado, entregue ou
  cancelado, sem alterar o pedido.
- **FR-005**: Toda recusa MUST explicar o motivo de forma compreensível para quem tentou,
  incluindo o status atual do pedido quando a recusa for por causa dele.
- **FR-006**: O sistema MUST recusar o cancelamento de um pedido inexistente, informando que o
  pedido não foi encontrado.
- **FR-007**: Ao cancelar, o sistema MUST mudar o status do pedido para cancelado e registrar a
  data e hora do cancelamento.
- **FR-008**: Ao cancelar com motivo, o sistema MUST registrar o motivo junto com o pedido.
- **FR-008a**: Cancelar um pedido pago MUST apenas mudar o status para cancelado; o sistema MUST
  NOT fazer estorno nem qualquer outra ação sobre o pagamento, que é tratado fora do sistema.
- **FR-009**: Pedidos cancelados MUST continuar aparecendo na lista de pedidos e na consulta
  individual, com status cancelado, data do cancelamento e motivo, se houver.
- **FR-010**: O filtro da lista por status MUST aceitar o status cancelado.
- **FR-011**: Os dados novos (data e motivo do cancelamento) MUST seguir a convenção de nomes da
  constituição (camelCase), e as recusas da nova operação de cancelamento MUST seguir o formato de
  erro padronizado da constituição para funcionalidades novas (Problem Details, RFC 9457).
- **FR-012**: Os campos e formatos de erro já existentes na lista e na consulta de pedidos MUST
  continuar como estão, para não quebrar o cliente web.
- **FR-013**: Definir quem pode cancelar e exigir autenticação ficam fora do escopo desta
  funcionalidade; a API ainda não tem autenticação.

### Key Entities

- **Pedido**: o pedido de um cliente. Ganha o status cancelado, além de criado, pago, enviado e
  entregue, e passa a guardar a data do cancelamento e o motivo, quando houver.
- **Cancelamento**: o registro de que um pedido foi cancelado: quando aconteceu e, se informado,
  por quê. Existe no máximo um por pedido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de cancelar pedidos criados ou pagos terminam com o pedido
  cancelado e com data de cancelamento registrada.
- **SC-002**: 100% das tentativas de cancelar pedidos enviados, entregues ou já cancelados são
  recusadas sem alterar o pedido.
- **SC-003**: 100% das recusas informam o motivo da recusa e, quando a causa for o status do
  pedido, qual é esse status.
- **SC-004**: 100% dos pedidos cancelados continuam visíveis na lista de pedidos, com status e
  data do cancelamento.
- **SC-005**: O cliente web atual continua mostrando a lista de pedidos sem erros depois da
  mudança.

## Assumptions

- "Antes de ser enviado" significa os status criado e pago; enviado e entregue não permitem
  cancelamento.
- O cancelamento é definitivo: não há como desfazer um cancelamento nesta funcionalidade.
- Um motivo formado só por espaços conta como vazio (sem motivo).
- O limite de 200 caracteres do motivo é contado depois de remover os espaços do começo e do fim.
- Um motivo informado que não seja texto é tratado como erro de validação, e não como "sem motivo".
- A data do cancelamento é registrada pelo sistema no momento do cancelamento, não informada por
  quem cancela.
- Mostrar pedidos cancelados de forma diferente no cliente web fica fora do escopo; o requisito é
  que ele continue funcionando.
