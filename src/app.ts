import express from 'express';
import { criarBase } from './pedidos/dados.js';
import { rotasPedidos, tratarJsonInvalidoCancelamento } from './pedidos/rotas.js';

export function criarApp() {
  const app = express();
  // Com env 'production', a página de erro padrão do Express mostra só a mensagem
  // do status (ex.: "Bad Request"), sem mensagem interna nem pilha de chamadas,
  // qualquer que seja o NODE_ENV. O erro completo continua no log do servidor.
  app.set('env', 'production');
  app.use(express.json());
  app.use(express.static('cliente'));
  app.use(rotasPedidos(criarBase()));
  app.use(tratarJsonInvalidoCancelamento);
  return app;
}
