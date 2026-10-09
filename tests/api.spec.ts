import { test, expect, APIRequestContext } from '@playwright/test';

type Item = { produtoId: string; quantidade: unknown };

const calcular = (request: APIRequestContext, itens: Item[], cupom?: string) =>
  request.post('/api/carrinho/calcular', { data: cupom === undefined ? { itens } : { itens, cupom } });

const temNoMaximo2Casas = (n: number) => Math.round(n * 100) / 100 === n;

test.describe('CT-01..08 - Cálculo de subtotal, desconto, frete e total', () => {
  const casos = [
    { id: 'CT-01', itens: [{ produtoId: 'P005', quantidade: 1 }], cupom: undefined, sub: 100, desc: 0, frete: 19.9, falta: 100, total: 119.9 },
    { id: 'CT-02', itens: [{ produtoId: 'P005', quantidade: 2 }], cupom: undefined, sub: 200, desc: 0, frete: 0, falta: 0, total: 200 },
    { id: 'CT-03', itens: [{ produtoId: 'P001', quantidade: 1 }, { produtoId: 'P002', quantidade: 1 }], cupom: undefined, sub: 199.8, desc: 0, frete: 19.9, falta: 0.2, total: 219.7 },
    { id: 'CT-05', itens: [{ produtoId: 'P005', quantidade: 1 }], cupom: 'BEMVINDO10', sub: 100, desc: 10, frete: 19.9, falta: 100, total: 109.9 },
    { id: 'CT-06 (CA08: frete pelo subtotal antes do cupom)', itens: [{ produtoId: 'P005', quantidade: 2 }], cupom: 'BEMVINDO10', sub: 200, desc: 20, frete: 0, falta: 0, total: 180 },
    { id: 'CT-06b (CA08 isolado: subtotal 209,60 > 200, mas < 200 após o cupom)', itens: [{ produtoId: 'P001', quantidade: 3 }, { produtoId: 'P006', quantidade: 1 }], cupom: 'BEMVINDO10', sub: 209.6, desc: 20.96, frete: 0, falta: 0, total: 188.64 },
    { id: 'CT-07 (exemplo da doc)', itens: [{ produtoId: 'P002', quantidade: 1 }, { produtoId: 'P004', quantidade: 2 }], cupom: 'BEMVINDO10', sub: 239.7, desc: 23.97, frete: 0, falta: 0, total: 215.73 },
    { id: 'CT-08 (arredondamento)', itens: [{ produtoId: 'P001', quantidade: 3 }], cupom: 'BEMVINDO10', sub: 179.7, desc: 17.97, frete: 19.9, falta: 20.3, total: 181.63 },
  ];

  for (const c of casos) {
    test(c.id, async ({ request }) => {
      const res = await calcular(request, c.itens, c.cupom);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect.soft(body.subtotal).toBeCloseTo(c.sub, 2);
      expect.soft(body.desconto).toBeCloseTo(c.desc, 2);
      expect.soft(body.frete).toBeCloseTo(c.frete, 2);
      expect.soft(body.valorFaltanteFreteGratis).toBeCloseTo(c.falta, 2);
      expect.soft(body.total).toBeCloseTo(c.total, 2);
      expect.soft(body.freteGratis).toBe(c.frete === 0);
      // CA11: nenhum valor com mais de 2 casas decimais (pega 179.70000000000002 etc.)
      for (const campo of ['subtotal', 'desconto', 'frete', 'valorFaltanteFreteGratis', 'total']) {
        expect.soft(temNoMaximo2Casas(body[campo]), `${campo}=${body[campo]} tem mais de 2 casas`).toBe(true);
      }
    });
  }
});

test.describe('CT-09..12 - Cupom', () => {
  for (const codigo of ['bemvindo10', 'BemVindo10', '  BEMVINDO10  ']) {
    test(`CT-09 - "${codigo}" é aceito (CA02)`, async ({ request }) => {
      const body = await (await calcular(request, [{ produtoId: 'P005', quantidade: 1 }], codigo)).json();
      expect(body.cupom.aplicado).toBe(true);
      expect(body.desconto).toBeCloseTo(10, 2);
    });
  }

  test('CT-10 - cupom inexistente: 200, sem desconto, "Cupom inválido." (CA03)', async ({ request }) => {
    const res = await calcular(request, [{ produtoId: 'P005', quantidade: 1 }], 'XYZ123');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cupom.aplicado).toBe(false);
    expect(body.cupom.mensagem).toBe('Cupom inválido.');
    expect(body.desconto).toBe(0);
  });

  test('CT-11 - cupom expirado: 200, sem desconto, "Cupom expirado." (CA04)', async ({ request }) => {
    const res = await calcular(request, [{ produtoId: 'P005', quantidade: 1 }], 'VERAO2026');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.cupom.aplicado).toBe(false);
    expect(body.cupom.mensagem).toBe('Cupom expirado.');
    expect(body.desconto).toBe(0);
  });

  test('CT-12 - pedido com cupom inválido/expirado retorna 422', async ({ request }) => {
    const pedido = (cupom: string) => ({
      cliente: { nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '01310-100' },
      itens: [{ produtoId: 'P005', quantidade: 1 }],
      cupom,
    });
    const inv = await request.post('/api/pedidos', { data: pedido('XYZ123') });
    expect(inv.status()).toBe(422);
    expect((await inv.json()).erro.codigo).toBe('CUPOM_INVALIDO');

    const exp = await request.post('/api/pedidos', { data: pedido('VERAO2026') });
    expect(exp.status()).toBe(422);
    expect((await exp.json()).erro.codigo).toBe('CUPOM_EXPIRADO');
  });
});

test.describe('CT-13..16 - Quantidade e itens (CA10)', () => {
  test('CT-13 - 5 unidades é permitido', async ({ request }) => {
    const res = await calcular(request, [{ produtoId: 'P006', quantidade: 5 }]);
    expect(res.status()).toBe(200);
    expect((await res.json()).subtotal).toBeCloseTo(149.5, 2);
  });

  test('CT-14a - 6 unidades em /api/carrinho/calcular retorna QUANTIDADE_MAXIMA_EXCEDIDA', async ({ request }) => {
    const res = await calcular(request, [{ produtoId: 'P006', quantidade: 6 }]);
    expect(res.status()).toBe(422);
    expect((await res.json()).erro.codigo).toBe('QUANTIDADE_MAXIMA_EXCEDIDA');
  });

  test('CT-14b - 6 unidades em /api/pedidos retorna QUANTIDADE_MAXIMA_EXCEDIDA', async ({ request }) => {
    const res = await request.post('/api/pedidos', {
      data: {
        cliente: { nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '01310100' },
        itens: [{ produtoId: 'P006', quantidade: 6 }],
      },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).erro.codigo).toBe('QUANTIDADE_MAXIMA_EXCEDIDA');
  });

  for (const q of [0, -1, 1.5, '2', null]) {
    test(`CT-15 - quantidade ${JSON.stringify(q)} é inválida`, async ({ request }) => {
      const res = await calcular(request, [{ produtoId: 'P001', quantidade: q }]);
      expect(res.status()).toBe(422);
      expect((await res.json()).erro.codigo).toBe('QUANTIDADE_INVALIDA');
    });
  }

  test('CT-16 - produto repetido retorna ITEM_DUPLICADO', async ({ request }) => {
    const res = await calcular(request, [
      { produtoId: 'P001', quantidade: 1 },
      { produtoId: 'P001', quantidade: 1 },
    ]);
    expect(res.status()).toBe(422);
    expect((await res.json()).erro.codigo).toBe('ITEM_DUPLICADO');
  });
});

test.describe('CT-17 - Erros estruturais', () => {
  test('JSON inválido -> 400 JSON_INVALIDO', async ({ request }) => {
    const res = await request.post('/api/carrinho/calcular', {
      headers: { 'Content-Type': 'application/json' },
      data: '{isso nao e json',
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).erro.codigo).toBe('JSON_INVALIDO');
  });

  test('GET em rota só-POST -> 405 METODO_NAO_PERMITIDO', async ({ request }) => {
    const res = await request.get('/api/carrinho/calcular');
    expect(res.status()).toBe(405);
    expect((await res.json()).erro.codigo).toBe('METODO_NAO_PERMITIDO');
  });

  test('rota inexistente -> 404 ROTA_NAO_ENCONTRADA', async ({ request }) => {
    const res = await request.get('/api/rota-que-nao-existe');
    expect(res.status()).toBe(404);
    expect((await res.json()).erro.codigo).toBe('ROTA_NAO_ENCONTRADA');
  });

  test('produto inexistente por id -> 404 PRODUTO_NAO_ENCONTRADO', async ({ request }) => {
    const res = await request.get('/api/produtos/P999');
    expect(res.status()).toBe(404);
    expect((await res.json()).erro.codigo).toBe('PRODUTO_NAO_ENCONTRADO');
  });

  test('itens vazios -> 422 ITENS_OBRIGATORIOS', async ({ request }) => {
    const res = await calcular(request, []);
    expect(res.status()).toBe(422);
    expect((await res.json()).erro.codigo).toBe('ITENS_OBRIGATORIOS');
  });

  test('produto inexistente em item -> 422 PRODUTO_NAO_ENCONTRADO', async ({ request }) => {
    const res = await calcular(request, [{ produtoId: 'P999', quantidade: 1 }]);
    expect(res.status()).toBe(422);
    expect((await res.json()).erro.codigo).toBe('PRODUTO_NAO_ENCONTRADO');
  });
});

test.describe('CT-18/19 - Pedido e dados do cliente', () => {
  const pedido = (cliente: Record<string, string>) => ({
    cliente,
    itens: [{ produtoId: 'P005', quantidade: 1 }],
  });

  test('CT-18 - pedido válido: 201, número VZ-000000 e CEP sem hífen', async ({ request }) => {
    const res = await request.post('/api/pedidos', {
      data: pedido({ nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '01310-100' }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.numero).toMatch(/^VZ-\d{6}$/);
    expect(body.cliente.cep).toBe('01310100');
  });

  const invalidos = [
    { nome: 'Maria', email: 'maria@exemplo.com', cep: '01310-100', motivo: 'nome sem sobrenome' },
    { nome: 'Maria Silva', email: 'maria@exemplo', cep: '01310-100', motivo: 'e-mail inválido' },
    { nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '0131010', motivo: 'CEP com 7 dígitos' },
    { nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '013101000', motivo: 'CEP com 9 dígitos' },
    { nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '0131A-100', motivo: 'CEP com letra' },
  ];
  for (const { motivo, ...cliente } of invalidos) {
    test(`CT-19 - ${motivo} -> 422 DADOS_INVALIDOS`, async ({ request }) => {
      const res = await request.post('/api/pedidos', { data: pedido(cliente) });
      expect(res.status()).toBe(422);
      expect((await res.json()).erro.codigo).toBe('DADOS_INVALIDOS');
    });
  }
});

test.describe('CT-02b - Pedido com subtotal exatamente R$ 200,00', () => {
  test('frete grátis também deve valer ao confirmar o pedido (CA06)', async ({ request }) => {
    const res = await request.post('/api/pedidos', {
      data: {
        cliente: { nome: 'Maria Silva', email: 'maria@exemplo.com', cep: '01310100' },
        itens: [{ produtoId: 'P005', quantidade: 2 }],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect.soft(body.subtotal).toBeCloseTo(200, 2);
    expect.soft(body.frete).toBeCloseTo(0, 2);
    expect.soft(body.freteGratis).toBe(true);
    expect.soft(body.valorFaltanteFreteGratis).toBeCloseTo(0, 2);
    expect.soft(body.total).toBeCloseTo(200, 2);
  });
});
