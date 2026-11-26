import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { criarApp } from '../../src/app.js';

// Sobe um app novo (com base nova) numa porta livre e devolve um fetch para ele.
async function comApi(teste: (chamar: (caminho: string, init?: RequestInit) => Promise<Response>) => Promise<void>) {
  const servidor = criarApp().listen(0);
  await new Promise<void>((pronto) => servidor.once('listening', () => pronto()));
  const { port } = servidor.address() as AddressInfo;
  try {
    await teste((caminho, init) => fetch(`http://127.0.0.1:${port}${caminho}`, init));
  } finally {
    await new Promise<void>((fim) => servidor.close(() => fim()));
  }
}

function cancelar(chamar: (caminho: string, init?: RequestInit) => Promise<Response>, id: string, corpo?: unknown) {
  return chamar(`/pedidos/${id}/cancelamento`, {
    method: 'POST',
    ...(corpo === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) }),
  });
}

describe('US1: POST /pedidos/{id}/cancelamento', () => {
  it('cancela pedido criado sem corpo', () =>
    comApi(async (chamar) => {
      const resposta = await cancelar(chamar, 'PED-1001');
      assert.equal(resposta.status, 200);
      const pedido = await resposta.json();
      assert.equal(pedido.status, 'cancelado');
      assert.equal(typeof pedido.canceladoEm, 'string');
      assert.equal('motivoCancelamento' in pedido, false);
    }));

  it('cancela pedido pago com motivo', () =>
    comApi(async (chamar) => {
      const resposta = await cancelar(chamar, 'PED-1002', { motivo: 'cliente desistiu' });
      assert.equal(resposta.status, 200);
      const pedido = await resposta.json();
      assert.equal(pedido.status, 'cancelado');
      assert.equal(pedido.motivoCancelamento, 'cliente desistiu');
    }));

  it('mantém os campos atuais do pedido na resposta', () =>
    comApi(async (chamar) => {
      const pedido = await (await cancelar(chamar, 'PED-1001')).json();
      for (const campo of ['id', 'cliente', 'status', 'valor_total', 'criadoEm', 'forma_pagamento', 'itens']) {
        assert.ok(campo in pedido, `faltou o campo ${campo}`);
      }
    }));

  it('pedido não cancelado não tem campos de cancelamento', () =>
    comApi(async (chamar) => {
      const pedido = await (await chamar('/pedidos/PED-1005')).json();
      assert.equal('canceladoEm' in pedido, false);
      assert.equal('motivoCancelamento' in pedido, false);
    }));
});

async function lerProblema(resposta: Response, status: number) {
  assert.equal(resposta.status, status);
  assert.match(resposta.headers.get('content-type') ?? '', /^application\/problem\+json/);
  const problema = await resposta.json();
  for (const membro of ['type', 'title', 'status', 'detail', 'instance']) {
    assert.ok(membro in problema, `faltou o membro ${membro}`);
  }
  assert.equal(problema.status, status);
  return problema;
}

describe('US2: recusas do cancelamento', () => {
  for (const [id, statusAtual] of [
    ['PED-1003', 'enviado'],
    ['PED-1004', 'entregue'],
  ] as const) {
    it(`recusa pedido ${statusAtual} com 409`, () =>
      comApi(async (chamar) => {
        const problema = await lerProblema(await cancelar(chamar, id), 409);
        assert.equal(problema.type, 'https://api.techlog.example/problemas/cancelamento-nao-permitido');
        assert.equal(problema.statusAtual, statusAtual);
        assert.equal(problema.instance, `/pedidos/${id}/cancelamento`);
      }));
  }

  it('recusa segundo cancelamento com 409 e statusAtual cancelado', () =>
    comApi(async (chamar) => {
      const primeiro = await (await cancelar(chamar, 'PED-1001', { motivo: 'primeiro' })).json();
      const problema = await lerProblema(await cancelar(chamar, 'PED-1001', { motivo: 'segundo' }), 409);
      assert.equal(problema.statusAtual, 'cancelado');
      const depois = await (await chamar('/pedidos/PED-1001')).json();
      assert.equal(depois.canceladoEm, primeiro.canceladoEm);
      assert.equal(depois.motivoCancelamento, 'primeiro');
    }));

  it('recusa pedido inexistente com 404', () =>
    comApi(async (chamar) => {
      const problema = await lerProblema(await cancelar(chamar, 'PED-9999'), 404);
      assert.equal(problema.type, 'https://api.techlog.example/problemas/pedido-nao-encontrado');
    }));

  it('recusa motivo com 201 caracteres sem alterar o pedido', () =>
    comApi(async (chamar) => {
      const problema = await lerProblema(await cancelar(chamar, 'PED-1001', { motivo: 'a'.repeat(201) }), 400);
      assert.equal(problema.type, 'https://api.techlog.example/problemas/motivo-invalido');
      assert.equal(problema.campo, 'motivo');
      const pedido = await (await chamar('/pedidos/PED-1001')).json();
      assert.equal(pedido.status, 'criado');
    }));

  it('aceita motivo com exatamente 200 caracteres', () =>
    comApi(async (chamar) => {
      const resposta = await cancelar(chamar, 'PED-1001', { motivo: 'a'.repeat(200) });
      assert.equal(resposta.status, 200);
    }));

  it('recusa motivo que não é texto', () =>
    comApi(async (chamar) => {
      const problema = await lerProblema(await cancelar(chamar, 'PED-1001', { motivo: 123 }), 400);
      assert.equal(problema.campo, 'motivo');
    }));

  it('recusa JSON malformado em Problem Details (endpoint novo)', () =>
    comApi(async (chamar) => {
      const problema = await lerProblema(await cancelar(chamar, 'PED-1001', '{motivo'), 400);
      assert.equal(problema.type, 'https://api.techlog.example/problemas/validacao');
    }));

  it('recusa corpo acima de 100 KB em Problem Details (413)', () =>
    comApi(async (chamar) => {
      const problema = await lerProblema(await cancelar(chamar, 'PED-1001', { motivo: 'a'.repeat(200_000) }), 413);
      assert.equal(problema.type, 'https://api.techlog.example/problemas/validacao');
    }));

  it('recusa charset não suportado em Problem Details (415)', () =>
    comApi(async (chamar) => {
      const resposta = await chamar('/pedidos/PED-1001/cancelamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=latin9' },
        body: '{"motivo":"x"}',
      });
      const problema = await lerProblema(resposta, 415);
      assert.equal(problema.type, 'https://api.techlog.example/problemas/validacao');
    }));

  it('aplica o limite de 200 caracteres ao motivo sem os espaços das pontas', () =>
    comApi(async (chamar) => {
      const resposta = await cancelar(chamar, 'PED-1001', { motivo: '  ' + 'a'.repeat(200) + '  ' });
      assert.equal(resposta.status, 200);
      const pedido = await resposta.json();
      assert.equal(pedido.motivoCancelamento, 'a'.repeat(200));
    }));
});

describe('US3: pedidos cancelados na lista', () => {
  it('aparecem na lista, no filtro por status e na consulta individual', () =>
    comApi(async (chamar) => {
      await cancelar(chamar, 'PED-1001');
      await cancelar(chamar, 'PED-1002', { motivo: 'cliente desistiu' });

      const todos = await (await chamar('/pedidos')).json();
      assert.equal(todos.length, 5);
      const cancelados = todos.filter((p: any) => p.status === 'cancelado');
      assert.deepEqual(cancelados.map((p: any) => p.id), ['PED-1001', 'PED-1002']);
      for (const p of cancelados) assert.equal(typeof p.canceladoEm, 'string');

      const filtrados = await (await chamar('/pedidos?status=cancelado')).json();
      assert.deepEqual(filtrados.map((p: any) => p.id), ['PED-1001', 'PED-1002']);

      const pedido = await (await chamar('/pedidos/PED-1002')).json();
      assert.equal(pedido.status, 'cancelado');
      assert.equal(typeof pedido.canceladoEm, 'string');
      assert.equal(pedido.motivoCancelamento, 'cliente desistiu');
    }));
});

describe('compatibilidade: endpoints existentes não mudaram', () => {
  it('GET /pedidos/{id} inexistente mantém o formato { erro }', () =>
    comApi(async (chamar) => {
      const resposta = await chamar('/pedidos/PED-9999');
      assert.equal(resposta.status, 404);
      assert.match(resposta.headers.get('content-type') ?? '', /^application\/json/);
      assert.deepEqual(await resposta.json(), { erro: 'Pedido não encontrado' });
    }));

  it('POST /pedidos sem cliente mantém o formato { message, code }', () =>
    comApi(async (chamar) => {
      const resposta = await chamar('/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: [] }),
      });
      assert.equal(resposta.status, 400);
      assert.deepEqual(await resposta.json(), { message: 'cliente é obrigatório', code: 'VALIDACAO' });
    }));
});
