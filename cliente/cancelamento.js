// Cancelamento de pedido pelo cliente web.
// As regras ficam na API; aqui só decidimos quando mostrar o botão e
// traduzimos a resposta da API para a tela.

/** O botão de cancelar só aparece em pedidos que ainda não foram enviados. */
export function podeCancelar(status) {
  return status === 'criado' || status === 'pago';
}

/** Corpo da requisição: o motivo só vai quando foi preenchido. */
export function corpoDoCancelamento(motivo) {
  return motivo.trim() ? { motivo } : {};
}

/**
 * Chama POST /pedidos/{id}/cancelamento.
 * Devolve { tipo: 'ok', pedido }, { tipo: 'recusa', mensagem } (a API respondeu com erro)
 * ou { tipo: 'falha', mensagem } (não foi possível falar com a API).
 */
export async function cancelarPedido({ api, id, motivo, fetch }) {
  let resposta;
  try {
    resposta = await fetch(`${api}/pedidos/${encodeURIComponent(id)}/cancelamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoDoCancelamento(motivo ?? '')),
    });
  } catch {
    return { tipo: 'falha', mensagem: `Não foi possível cancelar o pedido ${id}. Tente de novo.` };
  }
  if (resposta.ok) {
    return { tipo: 'ok', pedido: await resposta.json() };
  }
  return { tipo: 'recusa', mensagem: await mensagemDaRecusa(resposta) };
}

// A explicação vem do Problem Details da API (detail, ou title se não houver detail).
async function mensagemDaRecusa(resposta) {
  try {
    const corpo = await resposta.json();
    const mensagem = corpo?.detail ?? corpo?.title;
    if (typeof mensagem === 'string' && mensagem) return mensagem;
  } catch {
    // corpo que não é JSON: cai na mensagem genérica abaixo
  }
  return `O cancelamento foi recusado (status ${resposta.status}).`;
}
