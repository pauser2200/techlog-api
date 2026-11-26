// Testes de aceite do comportamento legado que os clientes já usam.

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

test('lista os pedidos', async () => {
  const resposta = await fetch(`${api}/pedidos`);
  assert.equal(resposta.status, 200);
  const pedidos = await resposta.json();
  assert.equal(pedidos.length, 5);
});

test('pedido inexistente mantém o formato de erro antigo', async () => {
  const resposta = await fetch(`${api}/pedidos/PED-9999`);
  assert.equal(resposta.status, 404);
  assert.deepEqual(await resposta.json(), { erro: 'Pedido não encontrado' });
});
