# Variante arquivada: caixa de 4 abas (snapshot 2026-05-13)

Tentativa de caixa estilo caixa de papelão real com 4 abas independentes (norte, sul, leste, oeste) que abrem em torno de suas dobradiças nas arestas superiores da caixa.

## Por que foi arquivada

Bruno achou complicado demais. Mesmo após o pivô pra "pétalas pra cima" (FLAP_FINAL=195°), o conjunto não convenceu. Decidimos partir pra uma abertura mais simples (tampa única tipo armário ou tipo caixa com imã).

## Estado do código aqui

- Lerp das abas: `90deg → 195deg` (passa da vertical pra fora como pétala)
- 4 paredes internas em amarelo lima
- Sombra dinâmica via `--open` no CSS
- Vinco na dobradiça, textura sutil de papelão
- Overshoot leve (3%) no easing das abas

## Como restaurar essa variante

```bash
cp variants/4-flaps-2026-05-13/index.html ../../index.html
cp variants/4-flaps-2026-05-13/style.css ../../css/style.css
cp variants/4-flaps-2026-05-13/main.js ../../js/main.js
```
