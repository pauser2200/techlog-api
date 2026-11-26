// Portão de conformidade do servidor: a API responde o que o contrato diz?
//
// Sobe a API numa porta livre, com o express-openapi-validator na frente só para
// validar as RESPOSTAS contra openapi/openapi.yaml (o app não muda), faz uma série
// de chamadas cobrindo cada operação e cada status documentado, e reprova se:
//   - alguma resposta não bater com o esquema do contrato para aquele status, ou
//   - o status recebido não for o esperado no cenário.
//
// Uso:
//   npm run conformidade             cenários principais (um por operação e status)
//   npm run conformidade:completa    também consulta cada pedido e cada filtro de status

import { readFileSync } from 'node:fs';
import { register } from 'tsx/esm/api';
import express from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import { parse } from 'yaml';

register(); // permite importar o app, que é TypeScript
const { criarApp } = await import('../src/app.ts');

const CONTRATO = 'openapi/openapi.yaml';
const completa = process.argv.includes('--completa');
const contrato = parse(readFileSync(CONTRATO, 'utf8'));
const exemplo = (nome) => contrato.components.examples[nome].value;

// Divergências de esquema anotadas pelo validador, por requisição.
const divergencias = new Map();
const app = express();
app.use(
  OpenApiValidator.middleware({
    apiSpec: CONTRATO,
    validateRequests: false,
    validateResponses: {
      onError: (erro, _corpo, req) => {
        const chave = `${req.method} ${req.originalUrl}`;
        divergencias.set(chave, [...(divergencias.get(chave) ?? []), erro.message]);
      },
    },
  }),
);
// O validador confere o que sai por res.json; repassa a ele os corpos JSON enviados
// com res.send (é assim que a API envia o Problem Details).
app.use((_req, res, next) => {
  const enviar = res.send.bind(res);
  let repassando = false;
  res.send = (corpo) => {
    if (!repassando && typeof corpo === 'string' && /json/.test(String(res.get('Content-Type') ?? ''))) {
      try {
        const objeto = JSON.parse(corpo);
        repassando = true;
        return res.json(objeto);
      } catch {
        // não é JSON: segue como está
      }
    }
    return enviar(corpo);
  };
  next();
});
app.use(criarApp());

const servidor = app.listen(0);
await new Promise((pronto) => servidor.once('listening', pronto));
const base = `http://127.0.0.1:${servidor.address().port}`;

const post = (corpo) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo ?? {}),
});

// A ordem importa: os cenários compartilham a mesma base em memória.
const cenarios = [
  { nome: 'listarPedidos', caminho: '/pedidos', status: 200 },
  { nome: 'listarPedidos com filtro', caminho: '/pedidos?status=pago', status: 200 },
  { nome: 'buscarPedido', caminho: '/pedidos/PED-1001', status: 200 },
  { nome: 'buscarPedido inexistente', caminho: '/pedidos/PED-9999', status: 404 },
  { nome: 'criarPedido', caminho: '/pedidos', init: post(exemplo('NovoPedidoPix')), status: 201 },
  { nome: 'criarPedido sem cliente', caminho: '/pedidos', init: post({ itens: [] }), status: 400 },
  { nome: 'cancelarPedido', caminho: '/pedidos/PED-1002/cancelamento', init: post({ motivo: 'Cliente desistiu' }), status: 200 },
  { nome: 'cancelarPedido já cancelado', caminho: '/pedidos/PED-1002/cancelamento', init: post(), status: 409 },
  { nome: 'cancelarPedido enviado', caminho: '/pedidos/PED-1003/cancelamento', init: post(), status: 409 },
  { nome: 'cancelarPedido inexistente', caminho: '/pedidos/PED-9999/cancelamento', init: post(), status: 404 },
  { nome: 'cancelarPedido motivo longo', caminho: '/pedidos/PED-1001/cancelamento', init: post({ motivo: 'x'.repeat(201) }), status: 400 },
];

let falhas = 0;
async function conferir({ nome, caminho, init, status }) {
  const chave = `${init?.method ?? 'GET'} ${caminho}`;
  divergencias.delete(chave);
  const resposta = await fetch(base + caminho, init);
  await resposta.arrayBuffer();
  const problemas = [...(divergencias.get(chave) ?? [])];
  if (resposta.status !== status) problemas.unshift(`status ${resposta.status}, esperado ${status}`);
  if (problemas.length) falhas++;
  console.log(`${problemas.length ? 'FALHOU' : 'ok    '}  ${nome}  (${chave} → ${resposta.status})`);
  for (const p of problemas) console.log(`          ${p}`);
}

try {
  for (const cenario of cenarios) await conferir(cenario);

  if (completa) {
    const pedidos = await (await fetch(`${base}/pedidos`)).json();
    for (const { id } of pedidos) await conferir({ nome: `buscarPedido ${id}`, caminho: `/pedidos/${id}`, status: 200 });
    for (const s of ['criado', 'pago', 'enviado', 'entregue', 'cancelado']) {
      await conferir({ nome: `listarPedidos status=${s}`, caminho: `/pedidos?status=${s}`, status: 200 });
    }
  }
} finally {
  servidor.close();
}

console.log(falhas ? `\n${falhas} cenário(s) fora do contrato.` : '\nA API está conforme o contrato.');
process.exit(falhas ? 1 : 0);
