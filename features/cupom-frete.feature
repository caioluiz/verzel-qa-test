# language: pt
# Rastreabilidade: os IDs CT-xx correspondem a docs/execucao_dos_testes.docx e aos testes em tests/.
# Tags de camada: @api / @ui.
# Tags de bug: @BUG-01 e @BUG-02 marcam cenários que falham por bugs reportados em docs/03-bugs.md.
# Os resultados esperados seguem a documentação (v2.3.0) e não mudam por causa dos bugs.
Funcionalidade: Cupom de desconto e frete grátis (VZS-142, v2.3.0)
  Como cliente da Verzel Store
  Quero aplicar um cupom de desconto e ganhar frete grátis em compras maiores
  Para pagar menos nas minhas compras

  Contexto:
    Dado que estou na Verzel Store com o carrinho vazio

  # ---------- Cálculo: CA01, CA06, CA07, CA08, CA09, CA11 ----------
  @api @ui
  Esquema do Cenário: <id> - Cálculo de desconto, frete e total
    Dado que o carrinho contém "<itens>"
    E o cupom informado é "<cupom>"
    Quando o carrinho é calculado
    Então o subtotal é <subtotal>
    E o desconto é <desconto>
    E o frete é <frete>
    E o valor faltante para frete grátis é <faltante>
    E o total é <total>

    Exemplos: Comportamento conforme
      | id     | itens                      | cupom      | subtotal | desconto | frete | faltante | total  |
      | CT-01  | P005 x1                    |            | 100.00   | 0.00     | 19.90 | 100.00   | 119.90 |
      | CT-03  | P001 x1, P002 x1           |            | 199.80   | 0.00     | 19.90 | 0.20     | 219.70 |
      | CT-04  | P003 x1, P004 x1           |            | 239.80   | 0.00     | 0.00  | 0.00     | 239.80 |
      | CT-05  | P005 x1                    | BEMVINDO10 | 100.00   | 10.00    | 19.90 | 100.00   | 109.90 |
      | CT-06b | P001 x3, P006 x1           | BEMVINDO10 | 209.60   | 20.96    | 0.00  | 0.00     | 188.64 |
      | CT-07  | P002 x1, P004 x2           | BEMVINDO10 | 239.70   | 23.97    | 0.00  | 0.00     | 215.73 |
      | CT-08  | P001 x3                    | BEMVINDO10 | 179.70   | 17.97    | 19.90 | 20.30    | 181.63 |
      | CT-13  | P006 x5                    |            | 149.50   | 0.00     | 19.90 | 50.50    | 169.40 |

    @BUG-01
    Exemplos: Limite exato de R$ 200,00 (hoje o frete é cobrado indevidamente)
      | id    | itens   | cupom      | subtotal | desconto | frete | faltante | total  |
      | CT-02 | P005 x2 |            | 200.00   | 0.00     | 0.00  | 0.00     | 200.00 |
      | CT-06 | P005 x2 | BEMVINDO10 | 200.00   | 20.00    | 0.00  | 0.00     | 180.00 |

  @api @BUG-01
  Cenário: CT-02b - Pedido com subtotal de exatamente R$ 200,00 tem frete grátis
    Quando confirmo um pedido com "P005 x2" e dados de cliente válidos
    Então a API responde 201
    E o frete é 0.00 e o frete grátis é verdadeiro
    E o total é 200.00

  @ui @BUG-01
  Cenário: CT-22 - Aviso de quanto falta para o frete grátis some ao atingir R$ 200,00
    Dado que o carrinho contém "P005 x1"
    Então vejo o aviso "Faltam R$ 100,00 para o frete grátis."
    Quando aumento a quantidade de "P005" para 2
    Então o subtotal é 200.00
    E o aviso de quanto falta para o frete grátis não é exibido

  # ---------- Cupom: CA02, CA03, CA04 ----------
  @api @ui
  Esquema do Cenário: CT-09 - Código do cupom ignora maiúsculas/minúsculas e espaços nas pontas
    Dado que o carrinho contém "P005 x1"
    Quando aplico o cupom <codigo>
    Então o cupom é aplicado com 10% de desconto
    E o desconto é 10.00

    Exemplos:
      | codigo           |
      | "bemvindo10"     |
      | "BemVindo10"     |
      | "  BEMVINDO10  " |

  @api @ui
  Cenário: CT-10 - Cupom inexistente
    Dado que o carrinho contém "P005 x1"
    Quando aplico o cupom "XYZ123"
    Então vejo a mensagem "Cupom inválido."
    E nenhum desconto é aplicado

  @api @ui
  Cenário: CT-11 - Cupom expirado
    Dado que o carrinho contém "P005 x1"
    Quando aplico o cupom "VERAO2026"
    Então vejo a mensagem "Cupom expirado."
    E nenhum desconto é aplicado

  @api
  Cenário: CT-12 - Pedido com cupom inválido ou expirado é rejeitado pela API
    Quando confirmo um pedido com o cupom "XYZ123"
    Então a API responde 422 com o código "CUPOM_INVALIDO"
    Quando confirmo um pedido com o cupom "VERAO2026"
    Então a API responde 422 com o código "CUPOM_EXPIRADO"

  # ---------- Um cupom por vez: CA05 ----------
  @ui
  Cenário: CT-20a - Trocar de cupom exige remover o atual
    Dado que o carrinho contém "P005 x1"
    E o cupom "BEMVINDO10" está aplicado
    Quando tento aplicar outro cupom sem remover o atual
    Então o sistema não acumula os dois cupons

  @ui
  Cenário: CT-20b - Remover cupom restaura os valores
    Dado que o carrinho contém "P005 x1"
    E o cupom "BEMVINDO10" está aplicado
    Quando removo o cupom
    Então o desconto volta a ser 0.00 e o total volta a ser 119.90

  # ---------- Quantidade máxima: CA10 ----------
  @ui
  Cenário: CT-14 - A interface impede passar de 5 unidades do mesmo produto
    Quando adiciono 5 unidades de "P006" pela vitrine
    Então o botão "Adicionar ao carrinho" de "P006" fica desabilitado
    E no carrinho a quantidade de "P006" não passa de 5

  @api @BUG-02
  Cenário: CT-14a - A API de cálculo rejeita 6 unidades do mesmo produto
    Quando envio 6 unidades de "P006" para "/api/carrinho/calcular"
    Então a API responde 422 com o código "QUANTIDADE_MAXIMA_EXCEDIDA"

  @api @BUG-02
  Cenário: CT-14b - A API de pedidos rejeita 6 unidades do mesmo produto
    Quando envio 6 unidades de "P006" para "/api/pedidos"
    Então a API responde 422 com o código "QUANTIDADE_MAXIMA_EXCEDIDA"

  @api
  Esquema do Cenário: CT-15 - Quantidade inválida na API
    Quando envio a quantidade <quantidade> para "P001"
    Então a API responde 422 com o código "QUANTIDADE_INVALIDA"

    Exemplos:
      | quantidade |
      | 0          |
      | -1         |
      | 1.5        |
      | "2"        |
      | null       |

  @api
  Cenário: CT-16 - Produto repetido na lista de itens
    Quando envio "P001" duas vezes na lista de itens
    Então a API responde 422 com o código "ITEM_DUPLICADO"

  @ui
  Cenário: CT-29 - Adicionar o mesmo produto duas vezes soma a quantidade
    Quando adiciono 2 vezes "P005" pela vitrine
    Então o carrinho tem uma única linha de "P005" com quantidade 2

  # ---------- Dados do cliente ----------
  @api @ui
  Esquema do Cenário: CT-19 - Validação dos dados do cliente no pedido
    Quando confirmo um pedido com nome "<nome>", e-mail "<email>" e CEP "<cep>"
    Então o resultado é "<resultado>"

    Exemplos:
      | nome        | email             | cep       | resultado           |
      | Maria Silva | maria@exemplo.com | 01310-100 | 201 criado          |
      | Maria Silva | maria@exemplo.com | 01310100  | 201 criado          |
      | Maria       | maria@exemplo.com | 01310-100 | 422 DADOS_INVALIDOS |
      | Maria Silva | maria@exemplo     | 01310-100 | 422 DADOS_INVALIDOS |
      | Maria Silva | maria@exemplo.com | 0131010   | 422 DADOS_INVALIDOS |
      | Maria Silva | maria@exemplo.com | 013101000 | 422 DADOS_INVALIDOS |
      | Maria Silva | maria@exemplo.com | 0131A-100 | 422 DADOS_INVALIDOS |

  @api @ui
  Cenário: CT-18 - Pedido válido gera número no formato VZ-000000
    Quando confirmo um pedido válido
    Então o pedido é criado com sucesso
    E o número do pedido segue o formato "VZ-" seguido de 6 dígitos
    E o CEP retornado está sem hífen

  @ui
  Cenário: CT-27 - Cupom aplicado no carrinho chega até a confirmação do pedido
    Dado que o carrinho contém "P005 x1" com o cupom "BEMVINDO10"
    Quando sigo para o checkout e confirmo o pedido com dados válidos
    Então o resumo do checkout e a confirmação mostram desconto 10.00 e total 109.90

  # ---------- Erros estruturais da API ----------
  @api
  Cenário: CT-17 - Erros de rota, método e corpo
    Quando envio um corpo que não é JSON válido para "/api/carrinho/calcular"
    Então a API responde 400 com o código "JSON_INVALIDO"
    Quando faço GET em "/api/carrinho/calcular"
    Então a API responde 405 com o código "METODO_NAO_PERMITIDO"
    Quando faço GET em "/api/rota-que-nao-existe"
    Então a API responde 404 com o código "ROTA_NAO_ENCONTRADA"
    Quando faço GET em "/api/produtos/P999"
    Então a API responde 404 com o código "PRODUTO_NAO_ENCONTRADO"
    Quando envio itens vazios para "/api/carrinho/calcular"
    Então a API responde 422 com o código "ITENS_OBRIGATORIOS"
    Quando envio um corpo sem o campo "itens" para "/api/carrinho/calcular"
    Então a API responde 422 com o código "ITENS_OBRIGATORIOS"
    Quando envio um item que não é um objeto para "/api/carrinho/calcular"
    Então a API responde 422 com o código "ITEM_INVALIDO"
    Quando envio o produto "P999" para "/api/carrinho/calcular"
    Então a API responde 422 com o código "PRODUTO_NAO_ENCONTRADO"

  # ---------- Consistência e comportamento geral do carrinho ----------
  @ui @api
  Cenário: CT-21 - Interface exibe exatamente o que a API calculou
    Dado que o carrinho contém "P005 x3" com o cupom "BEMVINDO10"
    Então os valores exibidos no carrinho são iguais aos retornados por "/api/carrinho/calcular"

  @ui
  Cenário: CT-23 - Alterar quantidade e remover itens com cupom aplicado
    Dado que o carrinho contém "P005 x1, P004 x1" com o cupom "BEMVINDO10"
    Quando aumento a quantidade de "P005" para 2
    Então os valores são recalculados na hora e o cupom continua aplicado
    Quando removo todos os itens do carrinho
    Então o carrinho fica vazio, sem erro e sem desconto

  @ui
  Cenário: CT-24 - Recarregar a aba mantém o carrinho
    Dado que o carrinho contém "P005 x2"
    Quando recarrego a página
    Então o carrinho continua com "P005 x2"

  @ui
  Cenário: CT-25 - O contador do cabeçalho acompanha o carrinho
    Dado que o carrinho contém "P005 x2, P004 x1"
    Então o contador do cabeçalho corresponde à soma das quantidades
    Quando removo todos os itens do carrinho
    Então o contador do cabeçalho mostra 0
