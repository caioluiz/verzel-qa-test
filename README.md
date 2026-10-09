# Teste técnico QA Júnior — Verzel Store (card VZS-142)

Validação da entrega **Cupom de desconto e frete grátis** (v2.3.0).
Loja: https://verzel-store.qa-test-verzel-store.workers.dev/

## Onde está cada entrega

| Entrega | Local |
|---|---|
| Cenários de teste (Gherkin) | [`features/cupom-frete.feature`](features/cupom-frete.feature) |
| Execução e resultado por cenário | [`docs/execucao_dos_testes.docx`](docs/execucao_dos_testes.docx) |
| Bugs encontrados | [`docs/03-bugs.md`](docs/03-bugs.md) |
| Evidências (prints/vídeos) | [`docs/04-evidencias/`](docs/04-evidencias/) |
| Ambiguidades e interpretações | [`docs/05-interpretacoes.md`](docs/05-interpretacoes.md) |
| Automação Playwright | [`tests/`](tests/) |

## Como rodar a automação

```bash
npm install
npx playwright install chromium
npm test              # tudo
npm run test:api      # só API
npm run test:ui       # só UI
npm run report        # abre o relatório HTML
```

Para apontar para outro ambiente: `BASE_URL=https://... npm test`.

## Resultado da automação (execução de 07/10/2026)

**64 testes: 57 passaram e 7 falharam.** As 7 falhas são **esperadas**: cada uma é um teste que detecta um bug real da loja, descrito em [`docs/03-bugs.md`](docs/03-bugs.md).

| Teste que falha | Bug |
|---|---|
| API CT-02, API CT-02b (pedido), API CT-06, UI CT-06, UI CT-22 | **BUG-01** — subtotal de exatamente R$ 200,00 não recebe frete grátis |
| API CT-14a (cálculo), API CT-14b (pedido) | **BUG-02** — API aceita mais de 5 unidades do mesmo produto |

A automação cobre a API completa (cálculo, cupons, quantidade, erros, dados do cliente) e os fluxos principais de UI (carrinho, cupom, limite, checkout, confirmação). A execução manual e exploratória está em [`docs/execucao_dos_testes.docx`](docs/execucao_dos_testes.docx).

## Abordagem

- Cenários derivados dos critérios de aceite CA01–CA11 e das regras de cálculo da documentação.
- Valores esperados calculados manualmente a partir da tabela de produtos/cupons.
- Foco em valores-limite (R$ 200,00), ordem de cálculo (CA08), arredondamento (CA11), limite de quantidade (CA10) e consistência UI × API.

## Uso de IA

Usei o Claude (Anthropic) como apoio em:

1. Leitura do enunciado e da documentação da entrega para estruturar o repositório e levantar os critérios de aceite.
2. Execução com os valores esperados calculados a partir da tabela de produtos e cupons.
3. Escrita de funções, usando o HTML salvo das páginas da loja os seletores e consigo automatizar múltiplos testes.

Eu executei os testes, fiz a execução manual e exploratória, capturei as evidências e revisei o resultado. Um teste gerado pela IA estava errado (CT-14 da vitrine: tentava clicar num botão que a loja desabilita corretamente ao atingir o limite, com isso o teste falhava por exceder o tempo limite) e foi corrigido depois de analisar o log cuidadosamente falha por falha.

Usei também o Gemini PRO, onde nessa versão a IA é integrada com o ambiente/aplicativos da Google. Assim, eu obtenho melhora, fluidez e agilidade na escrita de documentos e reports. 