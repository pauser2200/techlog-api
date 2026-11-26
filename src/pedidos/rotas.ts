import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Base, FormaPagamento, Item, Status } from './dados.js';
import { serializarPedido } from './serializar.js';

const LIMITE_MOTIVO = 200;
const CAMINHO_CANCELAMENTO = /^\/pedidos\/[^/]+\/cancelamento\/?$/;

// O express.json() roda no app, antes deste roteador, então os erros de leitura
// do corpo só podem ser tratados por um middleware registrado no app.
// Age apenas no endpoint de cancelamento; os outros mantêm o comportamento atual.
const DETALHE_ERRO_CORPO: Record<string, string> = {
  'entity.parse.failed': 'O corpo da requisição não é um JSON válido.',
  'entity.too.large': 'O corpo da requisição é grande demais.',
  'charset.unsupported': 'O charset do corpo da requisição não é suportado.',
  'encoding.unsupported': 'A codificação do corpo da requisição não é suportada.',
};

export function tratarJsonInvalidoCancelamento(err: any, req: Request, res: Response, next: NextFunction) {
  const erroDoCorpo =
    typeof err?.type === 'string' && Number.isInteger(err?.status) && err.status >= 400 && err.status < 500;
  if (erroDoCorpo && req.method === 'POST' && CAMINHO_CANCELAMENTO.test(req.path)) {
    enviarProblema(res, {
      type: '/problemas/validacao',
      title: 'Requisição inválida',
      status: err.status,
      detail: DETALHE_ERRO_CORPO[err.type] ?? 'Não foi possível ler o corpo da requisição.',
      instance: req.originalUrl,
    });
    return;
  }
  next(err);
}

export function rotasPedidos(base: Base) {
  const rotas = Router();

  rotas.get('/pedidos', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(base.listar(status).map(serializarPedido));
  });

  rotas.get('/pedidos/:id', (req, res) => {
    const pedido = base.buscar(req.params.id);
    if (!pedido) {
      // Formato de erro antigo, mantido porque clientes dependem dele.
      res.status(404).json({ erro: 'Pedido não encontrado' });
      return;
    }
    res.json(serializarPedido(pedido));
  });

  rotas.post('/pedidos', (req, res) => {
    const corpo = req.body ?? {};
    if (!corpo.cliente) {
      // Outro formato de erro, de outra época da API.
      res.status(400).json({ message: 'cliente é obrigatório', code: 'VALIDACAO' });
      return;
    }
    const itens: Item[] = corpo.itens.map((i: any) => ({
      sku: i.sku,
      quantidade: i.quantidade,
      precoUnitario: i.preco_unitario,
    }));
    const valorTotal = Math.round(itens.reduce((t, i) => t + i.quantidade * i.precoUnitario, 0) * 100) / 100;
    const formaPagamento = lerPagamento(corpo.forma_pagamento);
    const pedido = base.inserir({
      cliente: corpo.cliente,
      status: 'criado',
      itens,
      valorTotal,
      criadoEm: new Date().toISOString(),
      formaPagamento,
    });
    res.status(201).json(serializarPedido(pedido));
  });

  // Endpoint novo: erros em Problem Details (RFC 9457).
  rotas.post('/pedidos/:id/cancelamento', (req, res) => {
    const { id } = req.params;
    const instance = req.originalUrl;
    const motivo: unknown = req.body?.motivo;

    // A entrada é validada antes de buscar o pedido.
    if (motivo !== undefined) {
      const problemaMotivo =
        typeof motivo !== 'string'
          ? 'O motivo deve ser um texto.'
          : motivo.trim().length > LIMITE_MOTIVO
            ? `O motivo pode ter no máximo ${LIMITE_MOTIVO} caracteres.`
            : undefined;
      if (problemaMotivo) {
        enviarProblema(res, {
          type: '/problemas/validacao',
          title: 'Requisição inválida',
          status: 400,
          detail: problemaMotivo,
          instance,
          campo: 'motivo',
        });
        return;
      }
    }

    const resultado = base.cancelar(id, motivo as string | undefined);
    switch (resultado.tipo) {
      case 'ok':
        res.json(serializarPedido(resultado.pedido));
        return;
      case 'nao-encontrado':
        enviarProblema(res, {
          type: '/problemas/pedido-nao-encontrado',
          title: 'Pedido não encontrado',
          status: 404,
          detail: `Não existe pedido com o id ${id}.`,
          instance,
        });
        return;
      case 'nao-permitido':
        enviarProblema(res, {
          type: '/problemas/cancelamento-nao-permitido',
          title: 'Cancelamento não permitido',
          status: 409,
          detail: explicarRecusa(id, resultado.statusAtual),
          instance,
          statusAtual: resultado.statusAtual,
        });
        return;
    }
  });

  return rotas;
}

function explicarRecusa(id: string, status: Status) {
  switch (status) {
    case 'enviado':
      return `O pedido ${id} já foi enviado e não pode mais ser cancelado.`;
    case 'entregue':
      return `O pedido ${id} já foi entregue e não pode mais ser cancelado.`;
    case 'cancelado':
      return `O pedido ${id} já está cancelado.`;
    default:
      return `O pedido ${id} está com status ${status} e não pode ser cancelado.`;
  }
}

// Problem Details (RFC 9457). Usado só pelos endpoints novos; os existentes
// mantêm os formatos de erro antigos.
interface Problema {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [extensao: string]: unknown;
}

function enviarProblema(res: Response, problema: Problema) {
  res.status(problema.status).type('application/problem+json').send(JSON.stringify(problema));
}

function lerPagamento(fp: any): FormaPagamento {
  if (fp?.tipo === 'cartao') {
    return { tipo: 'cartao', bandeira: fp.bandeira, parcelas: fp.parcelas, finalCartao: fp.final_cartao };
  }
  if (fp?.tipo === 'boleto') {
    return { tipo: 'boleto', linhaDigitavel: fp.linha_digitavel, vencimento: fp.vencimento };
  }
  return { tipo: 'pix', chave: fp?.chave };
}
