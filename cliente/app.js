// Cliente da TechLog API. Lista os pedidos e permite cancelar os que ainda não foram enviados.
// Por padrão fala com a API no mesmo endereço da página.
// Para apontar para outro servidor, como o mock, use ?api=http://localhost:4010

import { cancelarPedido, podeCancelar } from './cancelamento.js';

const api = new URLSearchParams(location.search).get('api') ?? '';
document.getElementById('origem').textContent = `Dados de ${api || location.origin}`;

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const conteudo = document.getElementById('conteudo');
const aviso = document.getElementById('aviso');
const dialogo = document.getElementById('confirmar-cancelamento');
const tituloDialogo = document.getElementById('titulo-cancelamento');
const campoMotivo = document.getElementById('motivo-cancelamento');

// Pedido que está na confirmação aberta.
let pedidoEmConfirmacao = null;

async function carregar() {
  try {
    const resposta = await fetch(`${api}/pedidos`);
    const pedidos = await resposta.json();
    const linhas = pedidos.map((p) => `
      <tr data-pedido="${p.id}">
        <td>${p.id}</td>
        <td>${p.cliente}</td>
        <td><span class="selo ${p.status}">${p.status}</span></td>
        <td class="valor">${moeda.format(p.valor_total)}</td>
        <td>${p.forma_pagamento.tipo}</td>
        <td>${podeCancelar(p.status) ? `<button type="button" data-cancelar="${p.id}">Cancelar</button>` : ''}</td>
      </tr>`).join('');
    conteudo.innerHTML = `
      <table>
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Total</th><th>Pagamento</th><th></th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
  } catch (erro) {
    conteudo.innerHTML = `<div class="erro">Não foi possível mostrar os pedidos: ${erro.message}</div>`;
  }
}

function mostrarAviso(texto) {
  aviso.textContent = texto;
}

function marcarComoCancelado(id) {
  const linha = conteudo.querySelector(`tr[data-pedido="${CSS.escape(id)}"]`);
  if (!linha) return;
  const selo = linha.querySelector('.selo');
  selo.className = 'selo cancelado';
  selo.textContent = 'cancelado';
  linha.querySelector('[data-cancelar]')?.remove();
}

// Abre a confirmação ao clicar no botão de uma linha.
conteudo.addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-cancelar]');
  if (!botao) return;
  pedidoEmConfirmacao = botao.dataset.cancelar;
  tituloDialogo.textContent = `Cancelar o pedido ${pedidoEmConfirmacao}?`;
  campoMotivo.value = '';
  dialogo.returnValue = '';
  dialogo.showModal();
});

// "Voltar" e Esc fecham sem cancelar; "Cancelar pedido" fecha com returnValue 'confirmar'.
dialogo.addEventListener('close', async () => {
  const id = pedidoEmConfirmacao;
  pedidoEmConfirmacao = null;
  if (dialogo.returnValue !== 'confirmar' || !id) return;

  const botao = conteudo.querySelector(`[data-cancelar="${CSS.escape(id)}"]`);
  if (botao) botao.disabled = true;

  const resultado = await cancelarPedido({ api, id, motivo: campoMotivo.value, fetch: window.fetch.bind(window) });
  if (resultado.tipo === 'ok') {
    marcarComoCancelado(id);
    mostrarAviso(`Pedido ${id} cancelado.`);
  } else if (resultado.tipo === 'recusa') {
    // A API explicou a recusa; recarrega a tabela para mostrar o status real do pedido.
    mostrarAviso(resultado.mensagem);
    await carregar();
  } else {
    // Não foi possível falar com a API: a linha fica como estava.
    mostrarAviso(resultado.mensagem);
    if (botao) botao.disabled = false;
  }
});

carregar();
