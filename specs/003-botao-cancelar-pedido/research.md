# Research: Botão de cancelar pedido na tabela do cliente web

Nenhum item do Technical Context ficou como NEEDS CLARIFICATION. As decisões de tela (motivo
opcional na confirmação; tabela só com o status) vieram das Clarifications da spec.

## R1. Onde fica a lógica testável

- **Decision**: um módulo novo `cliente/cancelamento.js` (ES module, sem dependências) com funções
  puras e uma função de chamada à API que recebe o `fetch` como parâmetro:
  - `podeCancelar(status)`: `true` só para `criado` e `pago`;
  - `corpoDoCancelamento(motivo)`: `{ motivo }` quando o texto não é vazio depois de remover os
    espaços das pontas; `{}` caso contrário;
  - `cancelarPedido({ api, id, motivo, fetch })`: faz o `POST /pedidos/{id}/cancelamento` e devolve
    `{ tipo: 'ok', pedido }`, `{ tipo: 'recusa', mensagem }` ou `{ tipo: 'falha', mensagem }`.
  O `app.js` cuida só da tela (tabela, diálogo, aviso) e usa essas funções.
- **Rationale**: o cliente não tem build nem framework; separar a lógica num módulo permite testar
  com `node:test` sem navegador e sem dependências novas (Princípio III).
- **Alternatives considered**: tudo dentro de `app.js` (não dá para testar sem navegador);
  jsdom ou Playwright (dependências novas para uma mudança pequena).

## R2. Quem decide as regras

- **Decision**: a tela só esconde o botão de pedidos que não são `criado` ou `pago` (FR-001). O
  resto (limite do motivo, pedido que mudou de status) fica com a API; a tela mostra o `detail` da
  recusa. O campo de motivo não tem limite de tamanho na tela.
- **Rationale**: a spec diz que a tela segue as regras de hoje e não as reimplementa. Sem limite na
  tela, a recusa por motivo longo (US2, cenário 2) acontece de verdade e a mensagem é a da API.
- **Alternatives considered**: `maxlength="200"` no campo (duplica a regra e torna o cenário 2
  impossível de acontecer pela tela).

## R3. Status atual depois de uma recusa

- **Decision**: depois de qualquer recusa, a tela mostra a mensagem e recarrega a tabela com
  `GET /pedidos`.
- **Rationale**: o contrato em `openapi/openapi.yaml` não tem o campo `statusAtual` na resposta 409,
  então o mock (Prism) não o devolve. Recarregar a tabela mostra o status real nos dois casos (API
  e mock) e já esconde o botão de pedidos que mudaram de status (FR-006).
- **Alternatives considered**: usar `statusAtual` da recusa (não funciona com o mock); buscar só
  `GET /pedidos/{id}` (mais código para o mesmo efeito numa tabela de poucos pedidos).

## R4. Confirmação com motivo

- **Decision**: um `<dialog>` nativo em `cliente/index.html`, com o número do pedido, um campo de
  texto opcional "Motivo (opcional)" e os botões "Cancelar pedido" e "Voltar". Fechar com Esc ou
  "Voltar" não cancela nada (FR-002).
- **Rationale**: `<dialog>` é nativo, acessível por teclado e não exige biblioteca; o
  `window.confirm` não tem campo de texto.
- **Alternatives considered**: `window.prompt` (não permite desistir de forma clara: Cancelar e
  OK com campo vazio se confundem).

## R5. Mensagens na tela

- **Decision**: uma área de aviso (`<p id="aviso" role="status">`) acima da tabela, preenchida com
  `textContent`, para sucesso ("Pedido PED-1001 cancelado."), recusa (o `detail` da API) e falha
  ("Não foi possível cancelar o pedido PED-1001. Tente de novo.").
- **Rationale**: `textContent` evita injetar HTML vindo da resposta; `role="status"` faz leitores
  de tela anunciarem o aviso.

## R6. Testes e tipos

- **Decision**: testes em `tests/cliente/cancelamento.test.ts` (já cobertos pelo `npm test`), com
  um `fetch` falso que devolve respostas 200, 400, 404, 409 e erro de rede. Para o TypeScript
  aceitar a importação de `cliente/cancelamento.js`, acrescentar `"allowJs": true` ao
  `tsconfig.json` (sem `checkJs`, o JavaScript do cliente não passa a ser verificado).
- **Rationale**: o Princípio III pede teste para a regra nova; `allowJs` é a mudança mínima para
  importar o módulo nos testes.
- **Alternatives considered**: escrever `cancelamento.d.ts` à mão (mais um arquivo para manter em
  dia); testes em `.mjs` (fora do padrão `tests/**/*.test.ts` do `npm test`).

## Achado fora do escopo

A descrição do `POST /pedidos/{id}/cancelamento` em `openapi/openapi.yaml` diz que cancelar de
novo um pedido já cancelado "devolve o pedido como está, sem erro". A spec 001 e a API respondem
409. Isso não muda o plano (R3 funciona nos dois casos), mas o contrato precisa ser corrigido numa
mudança própria.
