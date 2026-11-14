/* Preloader: uma massa presa a uma mola oscila em movimento harmônico amortecido
   real, x(t) = A·e^(−γt)·cos(ωt), e se estabiliza como o núcleo da marca Quarks.
   Em seguida os arcos e as letras são desenhados. */

import { reducedMotion } from './core.js';

const REST_Y = 895;      // posição de equilíbrio do núcleo (coordenadas do SVG)
const ANCHOR_Y = -650;   // ponto de fixação da mola
const AMP = 330;         // deslocamento inicial
const OMEGA = 2 * Math.PI * 1.7;
const GAMMA = 4.2;
const COILS = 14;

function springPoints(massTop) {
  const pts = [[1000, ANCHOR_Y]];
  const lead = 50;
  const len = massTop - ANCHOR_Y - lead * 2;
  pts.push([1000, ANCHOR_Y + lead]);
  for (let i = 1; i <= COILS; i++) {
    const y = ANCHOR_Y + lead + (len * (i - 0.5)) / COILS;
    pts.push([1000 + (i % 2 ? 70 : -70), y]);
  }
  pts.push([1000, massTop - lead]);
  pts.push([1000, massTop]);
  return pts.map((p) => p.join(',')).join(' ');
}

export function runPreloader() {
  const el = document.getElementById('preloader');
  const root = document.documentElement;
  if (!el || getComputedStyle(el).display === 'none') return Promise.resolve();

  const finish = () => {
    try { sessionStorage.setItem('q-intro', '1'); } catch (e) { /* modo privado */ }
    root.classList.add('intro-done');
    return new Promise((res) => {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' })
        .finished.then(() => { el.remove(); res(); });
    });
  };

  if (reducedMotion) return finish();

  const mass = el.querySelector('.pl-mass');
  const spring = el.querySelector('.pl-spring');
  const arcs = [...el.querySelectorAll('.pl-arcs path')];
  const letters = [...el.querySelectorAll('.pl-letters path')];
  const dots = [...el.querySelectorAll('.pl-dots circle')];

  let skipped = false;
  const skip = () => { skipped = true; };
  el.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });

  return new Promise((resolve) => {
    const t0 = performance.now();
    const settle = 1.05; // s
    const tick = (now) => {
      const t = (now - t0) / 1000;
      const x = skipped ? 0 : AMP * Math.exp(-GAMMA * t) * Math.cos(OMEGA * t);
      mass.setAttribute('transform', `translate(0 ${x.toFixed(2)})`);
      spring.setAttribute('points', springPoints(REST_Y - 64 + x));
      if (t < settle && !skipped) { requestAnimationFrame(tick); return; }

      mass.removeAttribute('transform');
      // mola se recolhe
      spring.animate([{ opacity: 0.75, transform: 'scaleY(1)' }, { opacity: 0, transform: 'scaleY(0.2)' }],
        { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      spring.style.transformOrigin = '1000px -650px';

      const draw = (p, i, base) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: skipped ? 200 : 700, delay: skipped ? 0 : base + i * 55, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      arcs.forEach((p, i) => draw(p, i, 0));
      letters.forEach((p, i) => draw(p, i, 160));
      dots.forEach((d, i) => d.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 400, delay: skipped ? 0 : 300 + i * 40, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }));

      setTimeout(() => finish().then(resolve), skipped ? 300 : 1250);
    };
    requestAnimationFrame(tick);
  });
}
