// Testes de aceite do cancelamento de pedido.
// Cada teste corresponde a um critério de aceite da spec da feature.
// Rode com: npm run test:aceite

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { criarApp } from '../../src/app.js';

let servidor: Server;
let api: string;

before(async () => {
  servidor = criarApp().listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  api = `http://localhost:${(servidor.address() as AddressInfo).port}`;
});

after(() => servidor.close());

const cancelar = (id: string, corpo?: object) =>
  fetch(`${api}/pedidos/${id}/cancelamento`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo ?? {}),
  });

test('CA1: pedido criado ou pago pode ser cancelado', async () => {
  const resposta = await cancelar('PED-1002', { motivo: 'Cliente desistiu' });
  assert.equal(resposta.status, 200);
  const pedido = await resposta.json();
  assert.equal(pedido.status, 'cancelado');
  assert.ok(pedido.canceladoEm, 'canceladoEm preenchido');
});

test('CA2: pedido enviado ou entregue não pode ser cancelado, e a resposta diz por quê', async () => {
  for (const id of ['PED-1003', 'PED-1004']) {
    const resposta = await cancelar(id);
    assert.equal(resposta.status, 409);
    assert.match(resposta.headers.get('content-type') ?? '', /application\/problem\+json/);
    const problema = await resposta.json();
    assert.ok(problema.detail, 'detail explica o motivo');
  }
});

test('CA3: cancelar de novo é recusado, e o pedido continua como está', async () => {
  const primeira = await (await cancelar('PED-1001')).json();
  const segunda = await cancelar('PED-1001');
  assert.equal(segunda.status, 409);
  assert.match(segunda.headers.get('content-type') ?? '', /application\/problem\+json/);
  const problema = await segunda.json();
  assert.equal(problema.statusAtual, 'cancelado');
  assert.ok(problema.detail, 'detail explica o motivo');
  const pedido = await (await fetch(`${api}/pedidos/PED-1001`)).json();
  assert.equal(pedido.status, 'cancelado');
  assert.equal(pedido.canceladoEm, primeira.canceladoEm);
});

test('CA4: pedido inexistente responde não encontrado', async () => {
  const resposta = await cancelar('PED-9999');
  assert.equal(resposta.status, 404);
});

test('CA5: motivo tem no máximo 200 caracteres', async () => {
  const resposta = await cancelar('PED-1005', { motivo: 'x'.repeat(201) });
  assert.equal(resposta.status, 400);
});

test('CA6: pedido cancelado continua na lista, com status e data', async () => {
  await cancelar('PED-1005');
  const lista = await (await fetch(`${api}/pedidos`)).json();
  const pedido = lista.find((p: { id: string }) => p.id === 'PED-1005');
  assert.equal(pedido.status, 'cancelado');
  assert.ok(pedido.canceladoEm);
});
