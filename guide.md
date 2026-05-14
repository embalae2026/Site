# Embalaê — guia de continuidade da caixa 3D

> Status em **2026-05-13** após pivô da abordagem.

---

## O que é a "caixa"

A entrada do site one-page é uma **caixa 3D virtual fechada com tampa estilo imã** (uma única tampa que cobre todo o topo e dobra a partir da aresta traseira-superior). Conforme o scroll, a tampa levanta passando da vertical pra trás, revelando o interior amarelo lima. Em seguida, a câmera mergulha pra dentro e o conteúdo interno (vídeo `embalae-loop.mp4` + título "a gente embala") transita pro hero real do site.

Metáfora: Embalaê = embalagens → a embalagem É a porta de entrada do site. Formato premium (caixa de iPhone, caixa de joia) reforça "produto cuidado, embalagem que importa".

---

## Histórico de tentativas (importante pra não revisitar)

1. **Tentativa 1 — caixa de 4 abas estilo papelão real:** cada aba tombava pro seu lado natural. Bruno achou complicado/visualmente confuso. Arquivada em [Site/variants/4-flaps-2026-05-13/](Site/variants/4-flaps-2026-05-13/).
2. **Tentativa 2 — 4 abas como pétalas pra cima (FLAP_FINAL=195°):** corrigi um bug geométrico (estavam abrindo pra direção errada), mas Bruno ainda não curtiu. Arquivada em [Site/variants/4-flaps-petal-2026-05-13/](Site/variants/4-flaps-petal-2026-05-13/).
3. **Tentativa 3 — caixa com imã (atual, escolhida em 2026-05-13):** uma única tampa. Bruno comparou no hub [Site/variants/](Site/variants/) com a opção "armário" e escolheu imã.

---

## Estado atual dos arquivos

- [Site/index.html](Site/index.html) — markup da `.boxgate` agora com `.lid` (uma única peça) em vez das 4 `.flap`. Resto (paredes externas, paredes internas, interior com vídeo+título) inalterado.
- [Site/css/style.css](Site/css/style.css) — bloco `BOXGATE` começa em [style.css:1020](Site/css/style.css#L1020). O bloco de "ABAS DO TOPO" foi substituído por "TAMPA ÚNICA".
- [Site/js/main.js](Site/js/main.js) — scroll handler vanilla com lerp temporal. Bloco do boxgate em [main.js:21-130](Site/js/main.js#L21-L130). Variável `lidAmount` substitui as 4 `flap*`.

Demos standalone das duas opções comparadas:
- [Site/variants/magnet/index.html](Site/variants/magnet/index.html) — versão click-to-open
- [Site/variants/cabinet/index.html](Site/variants/cabinet/index.html) — alternativa não escolhida

Sem build step. Abrir `index.html` direto ou via servidor local: `cd Site && python3 -m http.server 8080`.

---

## Geometria da tampa

A `.lid` está com pivô na aresta traseira-superior da caixa. A `.lid-plane` filha tem `transform-origin: 50% 0%` e:

```css
transform: rotateX(calc(90deg + var(--lid) * 120deg));
```

| `--lid` | `rotateX` | Estado físico |
|---------|-----------|---------------|
| 0       | 90°       | Fechada (deitada cobrindo o topo) |
| 0.42    | 140°      | A meio caminho da vertical |
| 0.75    | 180°      | Vertical apontando pra cima |
| 1       | 210°      | Totalmente aberta (passou 30° da vertical pra trás) |

CSS em [style.css:1363+](Site/css/style.css#L1363).

---

## Fases da animação (timing)

Tudo em [main.js:55-100](Site/js/main.js#L55-L100):

| Fase | Range progress | O que acontece |
|------|---------------|----------------|
| 1. Idle | 0.00 → 0.06 | Caixa parada com leve respiração |
| 2. Rotação reveladora | 0.02 → 0.30 | Caixa gira de `-22°ry` pra `+14°ry` mostrando profundidade |
| 3. Tampa abre | 0.18 → 0.55 | `--lid` 0 → 1 (90° → 210°) com leve overshoot "magnético" |
| 4. Câmera mergulha | 0.62 → 0.96 | Scale 1 → 6.2, tz 0 → 520, rx → −38° |
| 5. Fade final | 0.88 → 1.00 | Verde escuro overlay disfarça transição pro hero real |

---

## Pontos de tweak rápido

| Quero ajustar | Onde | Valor atual |
|---------------|------|-------------|
| Quanto a tampa abre | [style.css:1399](Site/css/style.css#L1399), trocar `120deg` no calc | 120° (vai pra 210° total) |
| Snap magnético do final | [main.js:71](Site/js/main.js#L71), trocar `0.03` | 0.03 (3% overshoot) |
| Quando começa/termina de abrir | [main.js:73](Site/js/main.js#L73), `phase(progress, 0.18, 0.55)` | 18%→55% do scroll |
| Tempo total do trilho | [style.css:1038](Site/css/style.css#L1038), `500vh` | 500vh |
| Câmera mergulhar mais/menos | [main.js:79](Site/js/main.js#L79), `-38` | −38° |
| Sombra interna quando fechada | [style.css:1186](Site/css/style.css#L1186), `0.85` | 0.85 |

---

## Como retomar

1. Servidor local: `cd Site && python3 -m http.server 8080`
2. Abrir [http://localhost:8080/](http://localhost:8080/) (sem `?nl` — esse parâmetro PULA a boxgate, é só pra debug do resto do site)
3. Scrollar devagar e avaliar
4. Se quiser comparar com as outras variantes: [http://localhost:8080/variants/](http://localhost:8080/variants/)
