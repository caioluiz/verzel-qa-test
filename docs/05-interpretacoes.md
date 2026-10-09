# Ambiguidades da documentação e interpretação adotada

| # | Ponto | Trecho | Interpretação adotada | Impacto |
|---|-------|--------|-----------------------|---------|
| 1 | Trocar de cupom (CA05) | "Para trocar, o cliente remove o cupom atual e aplica outro" — não diz o que ocorre ao tentar aplicar um 2º com o 1º ativo | Esperado: não acumular. Aceitável: bloquear com aviso **ou** substituir. Inaceitável: somar os descontos | CT-20a |
| 2 | Cupom que derruba o total abaixo de 200 | CA08 define frete sobre o subtotal **antes** do desconto | Frete grátis mantido (CT-06) | CT-06 |
| 3 | Carrinho vazio + cupom | Se houver itens no carrinho com cupom e os itens serem removidos, o cupom se permanece com o carrinho vazio | Registro o comportamento observado | CT-23 |
