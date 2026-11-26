# Research: Cancelamento de pedido

Decisões técnicas da Fase 0. Nenhum item do Technical Context ficou como NEEDS CLARIFICATION: a
stack, o endpoint e a ferramenta de testes vieram da entrada do `/speckit-plan`; o resto foi
decidido aqui a partir do código existente, da spec e da constituição.

## R1. Onde fica a regra de cancelamento

- **Decision**: um método `cancelar(id, motivo)` na base em memória (`src/pedidos/dados.ts`), que
  devolve um resultado discriminado (`ok`, `nao-encontrado`, `nao-permitido`). A rota só traduz o
  resultado em resposta HTTP.
- **Rationale**: a entrada pede para usar a estrutura existente (rotas, base, serializador). A base
  já concentra o estado dos pedidos; pôr a regra nela permite testá-la sem HTTP e mantém a rota
  fina.
- **Alternatives considered**: um módulo `cancelamento.ts` com função pura (mais um arquivo, sem
  ganho claro nesse tamanho); a regra dentro da rota (mistura HTTP com regra e dificulta o teste
  direto).

## R2. Resposta de sucesso

- **Decision**: `200 OK` com o pedido serializado, já com `status: "cancelado"`, `canceladoEm` e,
  se houver, `motivoCancelamento`.
- **Rationale**: a spec pede que a resposta mostre o pedido cancelado (US1, cenário 3). Devolver o
  mesmo formato do `GET /pedidos/{id}` evita um segundo formato de pedido.
- **Alternatives considered**: `201 Created` com um recurso "cancelamento" separado (não há
  consulta desse recurso, então o 201 não teria `Location` útil); `204 No Content` (não mostra o
  pedido).

## R3. Nomes dos campos novos

- **Decision**: no corpo da requisição, `motivo`. No pedido serializado, `canceladoEm` (data e
  hora ISO 8601 em UTC) e `motivoCancelamento`. Os dois só aparecem em pedidos cancelados;
  `motivoCancelamento` só aparece quando houve motivo.
- **Rationale**: Princípio I (camelCase). A spec diz que pedidos nunca cancelados não ganham data
  nem motivo; omitir os campos também não muda nada para o cliente web nos pedidos atuais.
- **Alternatives considered**: `cancelado_em` para combinar com `valor_total` (viola o Princípio
  I); campos sempre presentes com `null` (muda a resposta de todos os pedidos sem necessidade).

## R4. Formato das recusas

- **Decision**: Problem Details (RFC 9457) com `Content-Type: application/problem+json`, sempre
  com `type`, `title`, `status`, `detail` e `instance`. Tipos:

  | Situação | Status | `type` | Extensão |
  |----------|--------|--------|----------|
  | Pedido não existe | 404 | `/problemas/pedido-nao-encontrado` | — |
  | Pedido enviado, entregue ou já cancelado | 409 | `/problemas/cancelamento-nao-permitido` | `statusAtual` |
  | Motivo inválido (não texto, mais de 200 caracteres) ou JSON malformado | 400 | `/problemas/validacao` | `campo` (quando houver) |

- **Rationale**: Princípio II para endpoint novo. O 409 indica conflito com o estado atual do
  pedido, e `statusAtual` (camelCase, Princípio I) atende ao FR-005: quem tentou vê por quê. O 400
  segue o código que a API já usa para validação.
- **Alternatives considered**: 422 para validação (diferente do restante da API); 400 também para
  o status (mistura erro de entrada com conflito de estado); `type: "about:blank"` (não distingue
  os casos).

## R5. Erros de leitura do corpo no endpoint novo

- **Decision**: um middleware de erro exportado por `src/pedidos/rotas.ts` e registrado em
  `src/app.ts` depois das rotas. Ele age em qualquer erro 4xx do `express.json()` (JSON
  malformado → 400, corpo acima de 100 KB → 413, charset ou codificação não suportados → 415)
  quando o caminho é `POST /pedidos/{id}/cancelamento`, convertendo em Problem Details com o
  mesmo status; nos outros casos chama `next(err)`. Ampliado pela T021 (convergência).
- **Rationale**: sem isso, um erro ao ler o corpo no endpoint novo receberia a página de erro padrão do
  Express, fora do Princípio II. O `express.json()` é registrado no `app.ts`, antes do roteador, e
  o Express não entrega esse erro a um middleware de erro de dentro de um `Router`; por isso o
  registro precisa ser no `app.ts`. Limitar ao endpoint novo mantém o comportamento atual dos
  outros.
- **Alternatives considered**: tratar o erro de parse na API inteira (muda o formato de erro de
  endpoints existentes, proibido pelo Princípio II e pelo FR-012).

## R6. Testes

- **Decision**: `node:test` e `node:assert/strict`, rodando com `node --import tsx --test
  "tests/**/*.test.ts"`, exposto como `npm test`. Testes de integração sobem `criarApp()` numa
  porta livre (`listen(0)`) e usam o `fetch` nativo; testes da regra chamam `criarBase()` direto.
- **Rationale**: pedido na entrada; o `tsx` já é dependência; o `fetch` nativo do Node 24 evita
  dependência nova. `criarBase()` devolve uma cópia nova por chamada, então cada teste tem dados
  isolados.
- **Alternatives considered**: `supertest` (dependência a mais sem necessidade).

## R7. Documentação da API

- **Decision**: acrescentar o endpoint de cancelamento, o status `cancelado` e os campos novos em
  `docs/api-pedidos.md`, sem corrigir as divergências antigas desse arquivo.
- **Rationale**: o próprio documento pede atualização quando a API muda. Corrigir as divergências
  antigas é outra mudança e iria contra o Princípio IV (não misturar mudanças não relacionadas).
- **Alternatives considered**: não mexer na documentação (deixa o endpoint novo sem registro).
