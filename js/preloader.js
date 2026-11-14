/* Preloader: uma massa presa a uma mola oscila em movimento harmônico amortecido
   real, x(t) = −A·e^(−γt)·cos(ωt), e se estabiliza como o núcleo da marca Quarks.
   A mola aparece comprimida, é "carregada" por um instante e então é solta.
   Em seguida os arcos e as letras são desenhados.

   Fluidez: mola e massa ficam em camadas próprias e só recebem `transform`
   (scaleY / translate3d) a cada quadro — trabalho 100% de composição na GPU,
   sem repintar SVG nem recalcular layout. O relógio começa no primeiro quadro
   pintado, então um atraso no carregamento não "pula" a oscilação. */

import { reducedMotion } from './core.js';
import { STROKE, STROKE_ARC, ARCS, LETTERS, THIN, DOTS, NUCLEUS, NUCLEUS_TOP, parts } from './logo.js';

// palco: mesma largura da marca, com espaço acima para o ponto de fixação da mola
const VB = { x: 10, y: -150, w: 540, h: 538 };
const VIEW = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
const ANCHOR_Y = -140;
const REST = NUCLEUS_TOP;              // ponta da mola em repouso (topo do núcleo)
const L = REST - ANCHOR_Y;             // comprimento de repouso
const AMP = 190;                       // compressão inicial (unidades do SVG) → mola a ~50% do comprimento
const PRELOAD = 0.8;                   // começa em 80% da compressão e termina de "carregar"
const HOLD = 0.6;                      // s — mola comprimida visível antes de ser solta
const OMEGA = 2 * Math.PI * 1.5;       // frequência angular
const GAMMA = 3.6;                     // amortecimento
const SETTLE = 1.45;                   // s após soltar — amplitude residual < 1 unidade
const COILS = 16;

const svg = (cls, inner, extra = '') =>
  `<svg class="${cls}" viewBox="${VIEW}" preserveAspectRatio="xMidYMid meet" ${extra}>${inner}</svg>`;

function springPath() {
  const lead = 14, half = 16;
  const top = ANCHOR_Y + lead, bottom = REST - lead;
  let d = `M280 ${ANCHOR_Y}V${top}`;
  for (let i = 0; i < COILS; i++) {
    const y = top + ((bottom - top) * (i + 0.5)) / COILS;
    d += `L${280 + (i % 2 ? -half : half)} ${y.toFixed(2)}`;
  }
  return d + `L280 ${bottom}V${REST}`;
}

function build(stage) {
  const stroke = (list, w) => list.map((d) => `<path pathLength="1" d="${d}" stroke-width="${w}"/>`).join('');
  const logo = `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">`
    + `<g class="pl-arcs">${stroke(ARCS, STROKE_ARC)}</g>`
    + `<g class="pl-letters">${stroke(LETTERS, STROKE)}${THIN.map((t) => `<path pathLength="1" d="${t.d}" stroke-width="${t.w}"/>`).join('')}</g>`
    + `</g><g class="pl-dots" fill="currentColor">${parts.circles(DOTS)}</g>`;
  stage.innerHTML =
    '<div class="pl-halo"></div>'
    + svg('pl-layer pl-logo', logo)
    + svg('pl-layer pl-spring', `<path d="${springPath()}" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>`)
    + svg('pl-layer pl-mass', `<g fill="currentColor">${parts.circles(NUCLEUS)}</g>`);
  return {
    halo: stage.querySelector('.pl-halo'),
    spring: stage.querySelector('.pl-spring'),
    mass: stage.querySelector('.pl-mass'),
    arcs: [...stage.querySelectorAll('.pl-arcs path')],
    letters: [...stage.querySelectorAll('.pl-letters path')],
    dots: [...stage.querySelectorAll('.pl-dots circle')],
  };
}

export function runPreloader() {
  const el = document.getElementById('preloader');
  const stage = document.getElementById('plStage');
  const root = document.documentElement;
  if (!el || !stage || getComputedStyle(el).display === 'none') return Promise.resolve();

  const finish = (delay = 0) => {
    try { sessionStorage.setItem('q-intro', '1'); } catch (e) { /* modo privado */ }
    root.classList.add('intro-done');
    // o fade é de composição: a página pode montar as seções enquanto ele acontece
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' })
      .finished.then(() => el.remove());
    return new Promise((res) => setTimeout(res, delay));
  };

  const n = build(stage);

  if (reducedMotion) {
    n.spring.style.display = 'none';
    [...n.arcs, ...n.letters].forEach((p) => { p.style.strokeDashoffset = 0; });
    n.dots.forEach((d) => { d.style.opacity = 1; });
    return finish(500);
  }

  // origem da escala da mola = ponto de fixação (em % da altura do palco)
  n.spring.style.transformOrigin = `50% ${((ANCHOR_Y - VB.y) / VB.h) * 100}%`;

  const place = (x) => {
    n.mass.style.transform = `translate3d(0, ${(x / VB.h) * 100}%, 0)`;
    n.spring.style.transform = `scaleY(${(L + x) / L})`;
  };
  place(-AMP * PRELOAD);

  let skipped = false;
  const skip = () => { skipped = true; };
  el.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });

  // entrada suave do palco (opacidade — composição pura)
  stage.animate([{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }],
    { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });

  return new Promise((resolve) => {
    let t0 = null;
    const tick = (now) => {
      if (t0 === null) t0 = now;
      const t = (now - t0) / 1000;
      if (!skipped && t < HOLD) {
        // fase 1: a mola aparece comprimida e termina de ser "carregada"
        // (ease-in-out → velocidade zero no instante da soltura)
        const k = t / HOLD;
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        place(-AMP * (PRELOAD + (1 - PRELOAD) * e));
        requestAnimationFrame(tick);
        return;
      }
      const tr = t - HOLD; // fase 2: soltura → oscilação amortecida a partir da compressão máxima
      if (!skipped && tr < SETTLE) {
        place(-AMP * Math.exp(-GAMMA * tr) * Math.cos(OMEGA * tr));
        requestAnimationFrame(tick);
        return;
      }
      place(0);
      drawLogo(n, skipped);
      setTimeout(() => finish().then(resolve), skipped ? 250 : 1150);
    };
    requestAnimationFrame(tick);
  });
}

function drawLogo(n, fast) {
  const ease = 'cubic-bezier(.65,0,.35,1)';
  // a mola se recolhe até o ponto de fixação
  n.spring.animate([{ transform: 'scaleY(1)', opacity: 1 }, { transform: 'scaleY(0.04)', opacity: 0 }],
    { duration: fast ? 150 : 480, easing: 'cubic-bezier(.7,0,.84,0)', fill: 'forwards' });

  const draw = (p, i, base) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    { duration: fast ? 180 : 680, delay: fast ? 0 : base + i * 55, easing: ease, fill: 'forwards' });
  n.arcs.forEach((p, i) => draw(p, i, 60));
  n.letters.forEach((p, i) => draw(p, i, 200));
  n.dots.forEach((d, i) => d.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
    { duration: 380, delay: fast ? 0 : 320 + i * 40, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }));
  // halo: gradiente estático que só muda de opacidade (sem filtros caros)
  n.halo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: fast ? 0 : 500, easing: ease, fill: 'forwards' });
}
