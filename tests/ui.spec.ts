import { test, expect, Page } from '@playwright/test';

/**
 * Testes de UI.
 * Seletores do carrinho confirmados no HTML de /carrinho:
 *   - resumo:        [data-valor="subtotal|desconto|frete|total"]
 *   - quantidade:    output[aria-label="Quantidade de <produto>"]
 *   - botões:        "Aumentar/Diminuir quantidade de <produto>", "Remover <produto> do carrinho",
 *                    "Esvaziar carrinho", "Aplicar cupom"
 *   - cupom:         #campo-cupom
 *   - aviso de frete: .aviso-frete
 *
 *   - produtos:      article[aria-labelledby="nome-Pxxx"] com botão "Adicionar ao carrinho"
 *   - checkout:      #campo-nome, #campo-email, #campo-cep, botão "Confirmar pedido"
 *   - confirmação:   .numero-pedido e o mesmo resumo [data-valor=...]
 */

const PRODUTO = 'Mochila Urbana 20L'; // P005, R$ 100,00

const resumo = (page: Page, campo: 'subtotal' | 'desconto' | 'frete' | 'total') =>
  page.locator(`[data-valor="${campo}"]`);

const dinheiro = (texto: string | null) =>
  Number((texto ?? '').replace(/[^\d,]/g, '').replace(',', '.'));

const quantidade = (page: Page, produto = PRODUTO) =>
  page.locator(`output[aria-label="Quantidade de ${produto}"]`);

const mais = (page: Page, produto = PRODUTO) =>
  page.getByRole('button', { name: `Aumentar quantidade de ${produto}` });

async function adicionarAoCarrinho(page: Page, nomeProduto: string, vezes = 1) {
  await page.goto('/');
  const card = page.getByRole('article', { name: nomeProduto });
  for (let i = 0; i < vezes; i++) {
    await card.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  }
}

async function irParaCarrinho(page: Page) {
  // Navega pelo link (e não por page.goto) para preservar o estado do carrinho da aba.
  await page.locator('.link-carrinho').click();
  await expect(page).toHaveURL(/\/carrinho$/);
}

async function aplicarCupom(page: Page, codigo: string) {
  await page.locator('#campo-cupom').fill(codigo);
  await page.getByRole('button', { name: 'Aplicar cupom' }).click();
}

test.describe('UI smoke', () => {
  test('home carrega e carrinho começa com 0 itens', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Verzel Store/i);
    await expect(page.locator('.contador-carrinho')).toHaveText('0');
  });

  test('navegação para o carrinho', async ({ page }) => {
    await page.goto('/');
    await page.locator('.link-carrinho').click();
    await expect(page).toHaveURL(/\/carrinho$/);
  });
});

test.describe('UI - carrinho com 1x Mochila Urbana 20L', () => {
  test.beforeEach(async ({ page }) => {
    await adicionarAoCarrinho(page, PRODUTO);
    await irParaCarrinho(page);
  });

  test('CT-01 - sem cupom, abaixo de R$ 200,00: frete 19,90 e aviso do que falta', async ({ page }) => {
    await expect(resumo(page, 'subtotal')).toHaveText(/100,00/);
    await expect(resumo(page, 'desconto')).toHaveText(/0,00/);
    await expect(resumo(page, 'frete')).toHaveText(/19,90/);
    await expect(resumo(page, 'total')).toHaveText(/119,90/);
    await expect(page.locator('.aviso-frete')).toContainText(/Faltam R\$\s*100,00 para o frete grátis/);
  });

  test('CT-05 - BEMVINDO10: desconto de 10% e frete não sofre desconto (CA09)', async ({ page }) => {
    await aplicarCupom(page, 'BEMVINDO10');
    await expect(resumo(page, 'desconto')).toHaveText(/10,00/);
    await expect(resumo(page, 'frete')).toHaveText(/19,90/);
    await expect(resumo(page, 'total')).toHaveText(/109,90/);
  });

  test('CT-06 - subtotal 200 + cupom: frete grátis mantido (CA08)', async ({ page }) => {
    await mais(page).click();
    await expect(quantidade(page)).toHaveText('2');
    await aplicarCupom(page, 'BEMVINDO10');
    await expect(resumo(page, 'subtotal')).toHaveText(/200,00/);
    await expect(resumo(page, 'desconto')).toHaveText(/20,00/);
    await expect(resumo(page, 'frete')).toHaveText(/0,00/);
    await expect(resumo(page, 'total')).toHaveText(/180,00/);
  });

  for (const codigo of ['bemvindo10', 'BemVindo10', '  BEMVINDO10  ']) {
    test(`CT-09 - cupom "${codigo}" é aceito (CA02)`, async ({ page }) => {
      await aplicarCupom(page, codigo);
      await expect(resumo(page, 'desconto')).toHaveText(/10,00/);
    });
  }

  test('CT-10 - cupom inexistente mostra "Cupom inválido." e não desconta (CA03)', async ({ page }) => {
    await aplicarCupom(page, 'XYZ123');
    await expect(page.getByText('Cupom inválido.')).toBeVisible();
    await expect(resumo(page, 'desconto')).toHaveText(/0,00/);
    await expect(resumo(page, 'total')).toHaveText(/119,90/);
  });

  test('CT-11 - cupom expirado mostra "Cupom expirado." e não desconta (CA04)', async ({ page }) => {
    await aplicarCupom(page, 'VERAO2026');
    await expect(page.getByText('Cupom expirado.')).toBeVisible();
    await expect(resumo(page, 'desconto')).toHaveText(/0,00/);
    await expect(resumo(page, 'total')).toHaveText(/119,90/);
  });

  test('CT-14 - interface respeita o limite de 5 unidades (CA10)', async ({ page }) => {
    for (let i = 0; i < 4; i++) await mais(page).click(); // 1 -> 5
    await expect(quantidade(page)).toHaveText('5');

    await mais(page).click({ force: true }); // tenta chegar a 6 (se o botão estiver desabilitado, nada acontece)
    await page.waitForTimeout(500); // dá tempo de uma eventual atualização indevida aparecer
    await expect(quantidade(page)).toHaveText('5');
  });

  test('CT-22 - aviso de frete some ao atingir R$ 200,00 (CA06/CA07)', async ({ page }) => {
    await expect(page.getByText(/Faltam/)).toHaveCount(1);
    await mais(page).click();
    await expect(resumo(page, 'subtotal')).toHaveText(/200,00/);
    await expect(page.getByText(/Faltam/)).toHaveCount(0);
  });

  test('CT-21 - valores da tela são iguais aos da API para o mesmo carrinho', async ({ page }) => {
    // 3x Mochila (subtotal 300,00): longe do limite de R$ 200,00, para validar só a consistência UI x API
    await mais(page).click();
    await mais(page).click();
    await expect(quantidade(page)).toHaveText('3');
    await aplicarCupom(page, 'BEMVINDO10');
    await expect(resumo(page, 'total')).toHaveText(/270,00/);

    const api = await (
      await page.request.post('/api/carrinho/calcular', {
        data: { itens: [{ produtoId: 'P005', quantidade: 3 }], cupom: 'BEMVINDO10' },
      })
    ).json();

    expect(dinheiro(await resumo(page, 'subtotal').textContent())).toBeCloseTo(api.subtotal, 2);
    expect(dinheiro(await resumo(page, 'desconto').textContent())).toBeCloseTo(api.desconto, 2);
    expect(dinheiro(await resumo(page, 'frete').textContent())).toBeCloseTo(api.frete, 2);
    expect(dinheiro(await resumo(page, 'total').textContent())).toBeCloseTo(api.total, 2);
  });

  test('CT-25 - remover o item zera o contador do cabeçalho', async ({ page }) => {
    await page.getByRole('button', { name: `Remover ${PRODUTO} do carrinho` }).click();
    await expect(page.locator('.contador-carrinho')).toHaveText('0');
  });

  test('CT-25 - "Esvaziar carrinho" zera o contador do cabeçalho', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Esvaziar carrinho' }).click();
    await expect(page.locator('.contador-carrinho')).toHaveText('0');
  });
});

test.describe('UI - vitrine de produtos', () => {
  test('CT-14 - vitrine desabilita "Adicionar ao carrinho" ao atingir 5 unidades (CA10)', async ({ page }) => {
    await adicionarAoCarrinho(page, 'Kit 3 Pares de Meias', 5);
    const card = page.getByRole('article', { name: 'Kit 3 Pares de Meias' });
    await expect(card.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeDisabled();

    // registra no relatório a mensagem exibida (vazia = observação de UX a anotar)
    const aviso = (await card.locator('.produto-aviso').textContent()) ?? '';
    test.info().annotations.push({ type: 'aviso-limite', description: aviso || '(sem mensagem)' });

    await irParaCarrinho(page);
    await expect(quantidade(page, 'Kit 3 Pares de Meias')).toHaveText('5');
  });

  test('CT-29 - adicionar o mesmo produto duas vezes soma a quantidade (sem duplicar linha)', async ({ page }) => {
    await adicionarAoCarrinho(page, PRODUTO, 2);
    await irParaCarrinho(page);
    await expect(page.locator('.item-carrinho')).toHaveCount(1);
    await expect(quantidade(page)).toHaveText('2');
    await expect(resumo(page, 'subtotal')).toHaveText(/200,00/);
  });
});

test.describe('UI - checkout e confirmação', () => {
  const irParaCheckout = async (page: Page) => {
    await page.getByRole('link', { name: 'Finalizar compra' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
  };

  const preencherEConfirmar = async (page: Page, nome: string, email: string, cep: string) => {
    await page.locator('#campo-nome').fill(nome);
    await page.locator('#campo-email').fill(email);
    await page.locator('#campo-cep').fill(cep);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  };

  test.beforeEach(async ({ page }) => {
    await adicionarAoCarrinho(page, PRODUTO);
    await irParaCarrinho(page);
    await irParaCheckout(page);
  });

  test('CT-26 - pedido válido: confirma, número VZ-000000 e valores iguais ao resumo', async ({ page }) => {
    await expect(resumo(page, 'total')).toHaveText(/119,90/);
    await preencherEConfirmar(page, 'Maria Silva', 'maria@exemplo.com', '01310-100');

    await expect(page).toHaveURL(/\/pedido-confirmado$/);
    await expect(page.locator('.numero-pedido')).toHaveText(/^VZ-\d{6}$/);
    await expect(page.getByText(/Obrigado, .*Maria/)).toBeVisible();
    await expect(resumo(page, 'subtotal')).toHaveText(/100,00/);
    await expect(resumo(page, 'frete')).toHaveText(/19,90/);
    await expect(resumo(page, 'total')).toHaveText(/119,90/);
    await expect(page.locator('.resumo-itens')).toContainText(`1x ${PRODUTO}`);
  });

  test('CT-27 - cupom aplicado no carrinho chega ao checkout e à confirmação', async ({ page }) => {
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click();
    await aplicarCupom(page, 'BEMVINDO10');
    await expect(resumo(page, 'total')).toHaveText(/109,90/);
    await irParaCheckout(page);
    await expect(resumo(page, 'desconto')).toHaveText(/10,00/);
    await expect(resumo(page, 'total')).toHaveText(/109,90/);

    await preencherEConfirmar(page, 'Maria Silva', 'maria@exemplo.com', '01310100');
    await expect(page).toHaveURL(/\/pedido-confirmado$/);
    await expect(resumo(page, 'desconto')).toHaveText(/10,00/);
    await expect(resumo(page, 'total')).toHaveText(/109,90/);
  });

  test('CT-19 - CEP com e sem hífen são aceitos', async ({ page }) => {
    await preencherEConfirmar(page, 'Maria Silva', 'maria@exemplo.com', '01310100');
    await expect(page).toHaveURL(/\/pedido-confirmado$/);
  });

  const invalidos = [
    { motivo: 'nome sem sobrenome', nome: 'Maria', email: 'maria@exemplo.com', cep: '01310-100' },
    { motivo: 'nome vazio', nome: '', email: 'maria@exemplo.com', cep: '01310-100' },
    { motivo: 'e-mail inválido', nome: 'Maria Silva', email: 'maria@exemplo', cep: '01310-100' },
    { motivo: 'e-mail vazio', nome: 'Maria Silva', email: '', cep: '01310-100' },
    { motivo: 'CEP com 7 dígitos', nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '0131010' },
    { motivo: 'CEP com 9 dígitos', nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '013101000' },
    { motivo: 'CEP com letra', nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '0131A-100' },
    { motivo: 'CEP vazio', nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '' },
  ];
  for (const { motivo, nome, email, cep } of invalidos) {
    test(`CT-19 - ${motivo}: não confirma o pedido`, async ({ page }) => {
      await preencherEConfirmar(page, nome, email, cep);
      await page.waitForTimeout(1000); // dá tempo de uma navegação indevida acontecer
      await expect(page).toHaveURL(/\/checkout$/);
    });
  }
});
