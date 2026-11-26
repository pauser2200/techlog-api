import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarBase } from '../../src/pedidos/dados.js';

const ISO_8601_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

describe('US1: regra de cancelamento', () => {
  it('cancela pedido criado sem motivo', () => {
    const base = criarBase();
    const antes = Date.now();
    const resultado = base.cancelar('PED-1001');
    const depois = Date.now();
    assert.equal(resultado.tipo, 'ok');
    const pedido = base.buscar('PED-1001')!;
    assert.equal(pedido.status, 'cancelado');
    assert.match(pedido.canceladoEm!, ISO_8601_UTC);
    // A data registrada é o momento do cancelamento.
    const momento = Date.parse(pedido.canceladoEm!);
    assert.ok(momento >= antes && momento <= depois, `canceladoEm fora do intervalo: ${pedido.canceladoEm}`);
    assert.equal(pedido.motivoCancelamento, undefined);
  });

  it('cancela pedido pago guardando o motivo', () => {
    const base = criarBase();
    const resultado = base.cancelar('PED-1002', 'cliente desistiu');
    assert.equal(resultado.tipo, 'ok');
    const pedido = base.buscar('PED-1002')!;
    assert.equal(pedido.status, 'cancelado');
    assert.equal(pedido.motivoCancelamento, 'cliente desistiu');
  });

  it('trata motivo vazio ou só com espaços como sem motivo', () => {
    const base = criarBase();
    base.cancelar('PED-1001', '');
    base.cancelar('PED-1002', '   ');
    assert.equal(base.buscar('PED-1001')!.motivoCancelamento, undefined);
    assert.equal(base.buscar('PED-1002')!.motivoCancelamento, undefined);
  });

  it('remove os espaços das pontas do motivo', () => {
    const base = criarBase();
    base.cancelar('PED-1001', '  x  ');
    assert.equal(base.buscar('PED-1001')!.motivoCancelamento, 'x');
  });

  it('não mexe na forma de pagamento de um pedido pago (sem estorno)', () => {
    const base = criarBase();
    const antes = structuredClone(base.buscar('PED-1002')!.formaPagamento);
    base.cancelar('PED-1002', 'cliente desistiu');
    assert.deepEqual(base.buscar('PED-1002')!.formaPagamento, antes);
  });
});

describe('US2: recusas da regra de cancelamento', () => {
  for (const [id, statusAtual] of [
    ['PED-1003', 'enviado'],
    ['PED-1004', 'entregue'],
  ] as const) {
    it(`recusa pedido ${statusAtual} sem alterá-lo`, () => {
      const base = criarBase();
      const antes = structuredClone(base.buscar(id));
      assert.deepEqual(base.cancelar(id, 'tentativa'), { tipo: 'nao-permitido', statusAtual });
      assert.deepEqual(base.buscar(id), antes);
    });
  }

  it('recusa pedido inexistente', () => {
    assert.deepEqual(criarBase().cancelar('PED-9999'), { tipo: 'nao-encontrado' });
  });

  it('recusa pedido já cancelado preservando data e motivo originais', () => {
    const base = criarBase();
    base.cancelar('PED-1001', 'primeiro motivo');
    const antes = structuredClone(base.buscar('PED-1001'));
    assert.deepEqual(base.cancelar('PED-1001', 'segundo motivo'), { tipo: 'nao-permitido', statusAtual: 'cancelado' });
    assert.deepEqual(base.buscar('PED-1001'), antes);
  });
});
