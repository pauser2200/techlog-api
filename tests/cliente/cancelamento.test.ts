import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cancelarPedido, corpoDoCancelamento, podeCancelar } from '../../cliente/cancelamento.js';

interface Chamada {
  url: string;
  init?: RequestInit;
}

// fetch falso: registra as chamadas e devolve a resposta indicada.
function fetchFalso(responder: () => Response | Promise<Response>) {
  const chamadas: Chamada[] = [];
  const fetch = async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init });
    return responder();
  };
  return { fetch, chamadas };
}

const json = (status: number, corpo: unknown, tipo = 'application/json') =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': tipo } });

describe('podeCancelar', () => {
  it('permite pedidos criados e pagos', () => {
    assert.equal(podeCancelar('criado'), true);
    assert.equal(podeCancelar('pago'), true);
  });

  it('não permite pedidos enviados, entregues, cancelados ou com status desconhecido', () => {
    for (const status of ['enviado', 'entregue', 'cancelado', 'outro']) {
      assert.equal(podeCancelar(status), false, status);
    }
  });
});

describe('corpoDoCancelamento', () => {
  it('motivo vazio ou só com espaços vira corpo sem motivo', () => {
    assert.deepEqual(corpoDoCancelamento(''), {});
    assert.deepEqual(corpoDoCancelamento('   '), {});
  });

  it('motivo preenchido vai no corpo', () => {
    assert.deepEqual(corpoDoCancelamento('cliente desistiu'), { motivo: 'cliente desistiu' });
  });
});

describe('cancelarPedido: sucesso', () => {
  it('faz POST com o motivo e devolve o pedido cancelado', async () => {
    const pedido = { id: 'PED-1001', status: 'cancelado' };
    const { fetch, chamadas } = fetchFalso(() => json(200, pedido));
    const resultado = await cancelarPedido({ api: 'http://x', id: 'PED-1001', motivo: 'cliente desistiu', fetch });

    assert.deepEqual(resultado, { tipo: 'ok', pedido });
    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0].url, 'http://x/pedidos/PED-1001/cancelamento');
    assert.equal(chamadas[0].init?.method, 'POST');
    assert.equal(new Headers(chamadas[0].init?.headers).get('Content-Type'), 'application/json');
    assert.equal(chamadas[0].init?.body, '{"motivo":"cliente desistiu"}');
  });

  it('com api vazia usa o mesmo endereço da página', async () => {
    const { fetch, chamadas } = fetchFalso(() => json(200, { id: 'PED-1001', status: 'cancelado' }));
    await cancelarPedido({ api: '', id: 'PED-1001', motivo: '', fetch });
    assert.equal(chamadas[0].url, '/pedidos/PED-1001/cancelamento');
    assert.equal(chamadas[0].init?.body, '{}');
  });
});

describe('recusas e falhas', () => {
  const problema = 'application/problem+json';
  const cancelar = (fetch: (url: string, init?: RequestInit) => Promise<Response>, id = 'PED-1005') =>
    cancelarPedido({ api: '', id, motivo: '', fetch });

  it('409 mostra o detail do Problem Details', async () => {
    const { fetch } = fetchFalso(() =>
      json(409, { title: 'Cancelamento não permitido', detail: 'O pedido PED-1005 já está cancelado.' }, problema),
    );
    assert.deepEqual(await cancelar(fetch), { tipo: 'recusa', mensagem: 'O pedido PED-1005 já está cancelado.' });
  });

  it('400 mostra o detail do Problem Details', async () => {
    const { fetch } = fetchFalso(() => json(400, { detail: 'O motivo pode ter no máximo 200 caracteres.' }, problema));
    assert.deepEqual(await cancelar(fetch), { tipo: 'recusa', mensagem: 'O motivo pode ter no máximo 200 caracteres.' });
  });

  it('404 mostra o detail do Problem Details', async () => {
    const { fetch } = fetchFalso(() => json(404, { detail: 'Não existe pedido com o id PED-9999.' }, problema));
    assert.deepEqual(await cancelar(fetch, 'PED-9999'), { tipo: 'recusa', mensagem: 'Não existe pedido com o id PED-9999.' });
  });

  it('sem detail, usa o title', async () => {
    const { fetch } = fetchFalso(() => json(409, { title: 'Cancelamento não permitido' }, problema));
    assert.deepEqual(await cancelar(fetch), { tipo: 'recusa', mensagem: 'Cancelamento não permitido' });
  });

  it('corpo que não é JSON vira mensagem com o status', async () => {
    const { fetch } = fetchFalso(() => new Response('<pre>Internal Server Error</pre>', { status: 500 }));
    assert.deepEqual(await cancelar(fetch), { tipo: 'recusa', mensagem: 'O cancelamento foi recusado (status 500).' });
  });

  it('erro de rede vira falha', async () => {
    const fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    assert.deepEqual(await cancelar(fetch, 'PED-1001'), {
      tipo: 'falha',
      mensagem: 'Não foi possível cancelar o pedido PED-1001. Tente de novo.',
    });
  });
});
