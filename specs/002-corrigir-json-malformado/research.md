# Research: Corrigir erro de JSON malformado nos endpoints antigos

Nenhum item do Technical Context ficou como NEEDS CLARIFICATION. O formato da recusa foi decidido
na spec (Clarifications: manter a página atual, só sem os detalhes internos).

## R1. Como tirar os detalhes internos da página de erro

- **Decision**: em `criarApp()` (`src/app.ts`), fixar a configuração `env` do app Express em
  `'production'` (`app.set('env', 'production')`).
- **Rationale**: a página padrão de erro do Express (gerada pelo `finalhandler`) só inclui a
  mensagem interna e a pilha de chamadas quando o `env` do app **não** é `'production'`; em
  produção ela traz apenas a mensagem padrão do status (ex.: "Bad Request"). O `env` vem de
  `NODE_ENV`, que a API não define hoje, então a página expõe detalhes em qualquer ambiente sem essa
  variável. Fixar o `env` no próprio app:
  - mantém exatamente o formato da página atual (mesmo HTML, mesmos cabeçalhos, mesmo status),
    cumprindo o FR-002 e o Princípio II;
  - não depende de configurar o ambiente (FR-001, SC-002);
  - mantém o registro completo do erro no console do servidor (o Express continua fazendo
    `console.error(err)` para qualquer `env` diferente de `'test'`).
- **Efeito além do escopo da spec**: a mesma regra passa a valer para qualquer erro não tratado
  dos endpoints antigos, não só para os de leitura do corpo. Hoje, por exemplo, `POST /pedidos`
  sem `itens` gera um erro 500 cuja página mostra a pilha de chamadas; depois da mudança ela mostra
  só "Internal Server Error". O formato da página e o status não mudam, e nenhum erro tratado muda.
  O efeito é aceito por ser do mesmo tipo do problema corrigido e por evitar uma segunda correção.
- **Alternatives considered**:
  - middleware que responde os erros de leitura do corpo com uma página HTML montada à mão (copia
    o modelo do Express e pode divergir dele em atualizações; mais código para o mesmo resultado);
  - middleware que repassa ao Express um erro "limpo", sem mensagem (perde o registro do erro
    original no console);
  - definir `NODE_ENV=production` no `npm start` (depende de como a API é iniciada e não vale para
    `criarApp()` usado nos testes nem para outras formas de subir a API).

## R2. Testes

- **Decision**: novo arquivo `tests/pedidos/erros-corpo.http.test.ts`, com `node:test` e o
  `fetch` nativo contra `criarApp()` em porta livre, como na feature 001.
- **Rationale**: o Princípio III pede teste para a regra nova (nenhum detalhe interno na recusa).
  Um dos testes define `NODE_ENV=development` antes de criar o app, para provar que a correção não
  depende da configuração do ambiente (SC-002).
- **Alternatives considered**: acrescentar ao arquivo de testes do cancelamento (mistura features).

## R3. Como reconhecer "detalhe interno" nos testes

- **Decision**: o corpo da recusa MUST ser igual à página padrão com a mensagem do status
  (`<pre>Bad Request</pre>`, `<pre>Payload Too Large</pre>`, `<pre>Unsupported Media Type</pre>`)
  e MUST NOT conter `Error:`, `SyntaxError`, `node_modules`, `    at ` (linha de pilha) nem o
  caminho do projeto.
- **Rationale**: comparar com a mensagem esperada é objetivo; as verificações negativas protegem
  contra regressões parciais.
