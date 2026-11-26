import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { criarApp } from '../../src/app.js';

interface Resposta {
  status: number;
  tipo: string;
  corpo: string;
}

interface Pedido {
  metodo: string;
  caminho: string;
  corpo?: string;
  tipo?: string;
}

// Usa node:http porque o fetch nativo não aceita corpo em requisições GET.
function enviar(porta: number, { metodo, caminho, corpo, tipo = 'application/json' }: Pedido) {
  return new Promise<Resposta>((resolver, rejeitar) => {
    const requisicao = http.request(
      {
        host: '127.0.0.1',
        port: porta,
        method: metodo,
        path: caminho,
        headers: corpo === undefined ? {} : { 'Content-Type': tipo, 'Content-Length': Buffer.byteLength(corpo) },
      },
      (resposta) => {
        let dados = '';
        resposta.setEncoding('utf8');
        resposta.on('data', (parte) => (dados += parte));
        resposta.on('end', () =>
          resolver({ status: resposta.statusCode ?? 0, tipo: String(resposta.headers['content-type'] ?? ''), corpo: dados }),
        );
      },
    );
    requisicao.on('error', rejeitar);
    if (corpo !== undefined) requisicao.write(corpo);
    requisicao.end();
  });
}

// Sobe um app novo numa porta livre. O app é criado dentro da função para que
// o NODE_ENV definido pelo teste já esteja valendo.
async function comApi(teste: (chamar: (pedido: Pedido) => Promise<Resposta>) => Promise<void>) {
  const servidor = criarApp().listen(0);
  await new Promise<void>((pronto) => servidor.once('listening', () => pronto()));
  const { port } = servidor.address() as AddressInfo;
  try {
    await teste((pedido) => enviar(port, pedido));
  } finally {
    await new Promise<void>((fim) => servidor.close(() => fim()));
  }
}

function assertSemDetalhes(corpo: string) {
  for (const proibido of ['Error:', 'SyntaxError', 'node_modules', '    at ', process.cwd()]) {
    assert.ok(!corpo.includes(proibido), `a resposta expõe detalhe interno: ${JSON.stringify(proibido)}`);
  }
}

function assertPaginaDeErro(resposta: Resposta, status: number, mensagem: string) {
  assert.equal(resposta.status, status);
  assert.match(resposta.tipo, /^text\/html/);
  assert.ok(resposta.corpo.includes(`<pre>${mensagem}</pre>`), `esperava <pre>${mensagem}</pre> em: ${resposta.corpo}`);
  assertSemDetalhes(resposta.corpo);
}

const JSON_MALFORMADO = '{x';

describe('recusa de corpo ilegível nos endpoints antigos', () => {
  it('POST /pedidos com JSON malformado: 400 sem detalhes internos', () =>
    comApi(async (chamar) => {
      assertPaginaDeErro(await chamar({ metodo: 'POST', caminho: '/pedidos', corpo: JSON_MALFORMADO }), 400, 'Bad Request');
    }));

  it('GET /pedidos com JSON malformado: 400 sem detalhes internos', () =>
    comApi(async (chamar) => {
      assertPaginaDeErro(await chamar({ metodo: 'GET', caminho: '/pedidos', corpo: JSON_MALFORMADO }), 400, 'Bad Request');
    }));

  it('GET /pedidos/{id} com JSON malformado: 400 sem detalhes internos', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'GET', caminho: '/pedidos/PED-1001', corpo: JSON_MALFORMADO });
      assertPaginaDeErro(resposta, 400, 'Bad Request');
    }));

  it('POST /pedidos com corpo acima de 100 KB: 413 sem detalhes internos', () =>
    comApi(async (chamar) => {
      const corpo = JSON.stringify({ cliente: 'a'.repeat(200_000) });
      assertPaginaDeErro(await chamar({ metodo: 'POST', caminho: '/pedidos', corpo }), 413, 'Payload Too Large');
    }));

  it('POST /pedidos com charset não suportado: 415 sem detalhes internos', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'POST', caminho: '/pedidos', corpo: '{}', tipo: 'application/json; charset=latin9' });
      assertPaginaDeErro(resposta, 415, 'Unsupported Media Type');
    }));

  it('não depende do NODE_ENV: com NODE_ENV=development o resultado é o mesmo', async () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await comApi(async (chamar) => {
        assertPaginaDeErro(await chamar({ metodo: 'POST', caminho: '/pedidos', corpo: JSON_MALFORMADO }), 400, 'Bad Request');
      });
    } finally {
      if (anterior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = anterior;
    }
  });

  it('erro 500 de POST /pedidos sem itens também não expõe detalhes (efeito descrito no plano)', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'POST', caminho: '/pedidos', corpo: JSON.stringify({ cliente: 'x' }) });
      assertPaginaDeErro(resposta, 500, 'Internal Server Error');
    }));
});

describe('não muda', () => {
  it('cancelamento com JSON malformado continua em Problem Details', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'POST', caminho: '/pedidos/PED-1001/cancelamento', corpo: JSON_MALFORMADO });
      assert.equal(resposta.status, 400);
      assert.match(resposta.tipo, /^application\/problem\+json/);
    }));

  it('GET /pedidos/{id} inexistente continua com { erro }', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'GET', caminho: '/pedidos/PED-9999' });
      assert.equal(resposta.status, 404);
      assert.deepEqual(JSON.parse(resposta.corpo), { erro: 'Pedido não encontrado' });
    }));

  it('POST /pedidos sem cliente continua com { message, code }', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'POST', caminho: '/pedidos', corpo: JSON.stringify({ itens: [] }) });
      assert.equal(resposta.status, 400);
      assert.deepEqual(JSON.parse(resposta.corpo), { message: 'cliente é obrigatório', code: 'VALIDACAO' });
    }));

  it('rota inexistente continua com a página "Cannot GET"', () =>
    comApi(async (chamar) => {
      const resposta = await chamar({ metodo: 'GET', caminho: '/nada' });
      assert.equal(resposta.status, 404);
      assert.ok(resposta.corpo.includes('<pre>Cannot GET /nada</pre>'));
    }));
});
