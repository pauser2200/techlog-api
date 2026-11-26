import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { criarApp } from '../../src/app.js';

// formaPagamento (camelCase) entra ao lado de forma_pagamento, que fica depreciado
// e continua igual para os clientes atuais (Princípio I da constituição).

async function listarPedidos() {
  const servidor = criarApp().listen(0);
  await new Promise<void>((pronto) => servidor.once('listening', () => pronto()));
  try {
    const { port } = servidor.address() as AddressInfo;
    return (await (await fetch(`http://127.0.0.1:${port}/pedidos`)).json()) as any[];
  } finally {
    await new Promise<void>((fim) => servidor.close(() => fim()));
  }
}

describe('formaPagamento na resposta de pedidos', () => {
  it('todo pedido traz formaPagamento e continua trazendo forma_pagamento', async () => {
    for (const p of await listarPedidos()) {
      assert.ok(p.formaPagamento, `${p.id} sem formaPagamento`);
      assert.ok(p.forma_pagamento, `${p.id} sem forma_pagamento`);
      assert.equal(p.formaPagamento.tipo, p.forma_pagamento.tipo, p.id);
    }
  });

  it('cartão: finalCartao em camelCase, com o mesmo valor de final_cartao', async () => {
    const p = (await listarPedidos()).find((x) => x.id === 'PED-1002');
    assert.deepEqual(p.formaPagamento, { tipo: 'cartao', bandeira: 'visa', parcelas: 2, finalCartao: '4242' });
    assert.deepEqual(p.forma_pagamento, { tipo: 'cartao', bandeira: 'visa', parcelas: 2, final_cartao: '4242' });
  });

  it('boleto: linhaDigitavel em camelCase, com o mesmo valor de linha_digitavel', async () => {
    const p = (await listarPedidos()).find((x) => x.id === 'PED-1003');
    assert.equal(p.formaPagamento.linhaDigitavel, p.forma_pagamento.linha_digitavel);
    assert.equal(p.formaPagamento.vencimento, p.forma_pagamento.vencimento);
    assert.equal('linha_digitavel' in p.formaPagamento, false);
  });

  it('pix: mesmo conteúdo nos dois campos', async () => {
    const p = (await listarPedidos()).find((x) => x.id === 'PED-1001');
    assert.deepEqual(p.formaPagamento, p.forma_pagamento);
  });
});
