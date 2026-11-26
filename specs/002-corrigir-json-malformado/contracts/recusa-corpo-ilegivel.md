# Contrato: recusa de corpo ilegível nos endpoints antigos

Endpoints: `GET /pedidos`, `GET /pedidos/{id}`, `POST /pedidos`.

Quando o corpo da requisição não pode ser lido, a resposta mantém o formato atual (página de erro
padrão do servidor), sem detalhes internos:

- Status: 400 (JSON malformado), 413 (corpo acima de 100 KB) ou 415 (charset ou codificação não
  suportados).
- `Content-Type: text/html; charset=utf-8`
- Corpo:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Bad Request</pre>
</body>
</html>
```

O texto dentro de `<pre>` é a mensagem padrão do status: `Bad Request`, `Payload Too Large` ou
`Unsupported Media Type`. O corpo MUST NOT conter mensagem de erro interna, caminho de arquivo nem
pilha de chamadas, qualquer que seja a configuração do ambiente.

## O que não muda

- Requisições válidas e erros já tratados: `{ "erro": "Pedido não encontrado" }` (404 no
  `GET /pedidos/{id}`) e `{ "message": "cliente é obrigatório", "code": "VALIDACAO" }` (400 no
  `POST /pedidos`).
- `POST /pedidos/{id}/cancelamento`: Problem Details, conforme
  `specs/001-cancelar-pedido/contracts/cancelamento.openapi.yaml`.
- Rota inexistente: página padrão com `Cannot <MÉTODO> <caminho>`.
