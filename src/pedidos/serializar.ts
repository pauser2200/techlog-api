import type { FormaPagamento, Pedido } from './dados.js';

// Formato de resposta que os clientes já consomem.
// Os nomes misturam convenções porque a API cresceu em épocas diferentes:
// valor_total e forma_pagamento vieram da primeira versão,
// criadoEm entrou depois. forma_pagamento está depreciado em favor de
// formaPagamento, mas continua na resposta para os clientes atuais.

// Formato depreciado (forma_pagamento), com os nomes antigos em snake_case.
function pagamento(forma: FormaPagamento) {
  switch (forma.tipo) {
    case 'cartao':
      return { tipo: 'cartao', bandeira: forma.bandeira, parcelas: forma.parcelas, final_cartao: forma.finalCartao };
    case 'pix':
      return { tipo: 'pix', chave: forma.chave };
    case 'boleto':
      return { tipo: 'boleto', linha_digitavel: forma.linhaDigitavel, vencimento: forma.vencimento };
  }
}

// Formato novo (formaPagamento), em camelCase.
function pagamentoCamelCase(forma: FormaPagamento) {
  switch (forma.tipo) {
    case 'cartao':
      return { tipo: 'cartao', bandeira: forma.bandeira, parcelas: forma.parcelas, finalCartao: forma.finalCartao };
    case 'pix':
      return { tipo: 'pix', chave: forma.chave };
    case 'boleto':
      return { tipo: 'boleto', linhaDigitavel: forma.linhaDigitavel, vencimento: forma.vencimento };
  }
}

export function serializarPedido(p: Pedido) {
  return {
    id: p.id,
    cliente: p.cliente,
    status: p.status,
    valor_total: p.valorTotal,
    criadoEm: p.criadoEm,
    forma_pagamento: pagamento(p.formaPagamento),
    formaPagamento: pagamentoCamelCase(p.formaPagamento),
    itens: p.itens.map((i) => ({ sku: i.sku, quantidade: i.quantidade, preco_unitario: i.precoUnitario })),
    // Campos novos, em camelCase. Só aparecem em pedidos cancelados.
    ...(p.canceladoEm !== undefined && { canceladoEm: p.canceladoEm }),
    ...(p.motivoCancelamento !== undefined && { motivoCancelamento: p.motivoCancelamento }),
  };
}
