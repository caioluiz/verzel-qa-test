# Bugs encontrados

> Um bug por seção. Cada um cita o critério de aceite (CA) violado e a evidência.
> Execução automatizada de 07/10/2026 (63 testes: 55 passaram, 8 falharam; os 8 estão explicados abaixo).

## BUG-01 — [Frete] Subtotal de exatamente R$ 200,00 não recebe frete grátis (carrinho e pedido)

- **Severidade:** Alta | **Prioridade:** Alta (o cliente é cobrado R$ 19,90 a mais no pedido confirmado)
- **Cenários de origem:** CT-02, CT-02b, CT-06, CT-22 (UI e API)
- **Critério violado:** CA06 ("frete grátis para subtotal a partir de R$ 200,00, **inclusive**") e regra de cálculo da doc
- **Ambiente:** loja e API, Chromium via Playwright, 07/10/2026
- **Passos para reproduzir:**
  1. Adicionar 2x Mochila Urbana 20L (P005, R$ 100,00 cada) ao carrinho. Subtotal = R$ 200,00.
  2. Observar o resumo (sem cupom e com BEMVINDO10) e, em seguida, confirmar o pedido.
- **Resultado esperado:** frete R$ 0,00 e `freteGratis = true`; sem cupom o total é R$ 200,00; com BEMVINDO10, desconto R$ 20,00 e total R$ 180,00; o aviso "Faltam R$ ... para o frete grátis" não aparece.
- **Resultado obtido:**
  - API `POST /api/carrinho/calcular` (sem cupom): `subtotal = 200`, `frete = 19.9`, `freteGratis = false`, `total = 219.9`.
  - API `POST /api/carrinho/calcular` (com BEMVINDO10): `desconto = 20`, `frete = 19.9`, `freteGratis = false`, `total = 199.9`.
  - API `POST /api/pedidos`: o mesmo — o **pedido é confirmado** com `frete = 19.9` e `total = 219.9`.
  - UI com BEMVINDO10: subtotal R$ 200,00, desconto R$ 20,00, frete **R$ 19,90**, total **R$ 199,90**; sem cupom o total é R$ 219,90 (a tela repete o que a API devolve).
  - UI: o aviso "Faltam ..." continua visível com subtotal de R$ 200,00.
- **Inconsistência interna da API:** nessa mesma resposta `valorFaltanteFreteGratis = 0` (diz que nada falta), mas `freteGratis = false` e `frete = 19.9`. O cálculo do "faltante" trata R$ 200,00 como atingido; o do frete, não. Compatível com `>` no lugar de `>=` na regra do frete.
- **Delimitação (o que funciona):** acima de R$ 200,00 o frete é grátis (CT-07 na API; CT-21 na UI, com subtotal de R$ 300,00) e a regra do CA08 está correta (CT-06b: subtotal 209,60 e 188,64 após o cupom, com frete grátis). A falha ocorre só no valor exato do limite.
- **Evidência:** `docs/04-evidencias/BUG-01-ui-cupom.png` (carrinho 2x P005 + BEMVINDO10), `BUG-01-ui-aviso.png` (aviso visível em R$ 200,00), `BUG-01-api.png` (respostas da API) 
- **Status:** Confirmado (UI e API, carrinho e pedido)

## BUG-02 — [Quantidade] API aceita mais de 5 unidades do mesmo produto (cálculo e pedido)

- **Severidade:** Média | **Prioridade:** Média (a interface bloqueia; o desvio exige chamar a API diretamente)
- **Cenários de origem:** CT-14a, CT-14b
- **Critério violado:** CA10 ("máximo 5 unidades por produto; vale para a interface **e para a API**") e erro `QUANTIDADE_MAXIMA_EXCEDIDA` da doc
- **Ambiente:** API `POST /api/carrinho/calcular` e `POST /api/pedidos`, 07/10/2026
- **Passos para reproduzir:**
  1. Enviar `{"itens":[{"produtoId":"P006","quantidade":6}]}` para `/api/carrinho/calcular`.
  2. Enviar o mesmo item, com dados de cliente válidos, para `/api/pedidos`.
- **Resultado esperado:** `422` com `erro.codigo = "QUANTIDADE_MAXIMA_EXCEDIDA"` nos dois endpoints.
- **Resultado obtido:** `/api/carrinho/calcular` responde **200** e `/api/pedidos` responde **201** (pedido criado com 6 unidades).
- **Observação:** a interface respeita o limite: o botão "Adicionar ao carrinho" fica desabilitado em 5 unidades e o "+" do carrinho também (CT-14 de UI). A validação existe só no front-end.
- **Evidência:** `docs/04-evidencias/BUG-02-calcular.png` e `BUG-02-pedidos.png` 
- **Status:** Confirmado (API)
