/* Entrada da home.
   Durante o preloader a thread principal fica livre (só a animação roda);
   o fundo WebGL (Three.js, import dinâmico) e as seções com dados são
   montados assim que a marca termina de se desenhar. */

import { $$, loadJSON, initScroll, initNav, initReveals, hasGSAP, reducedMotion } from './core.js';
import { runPreloader } from './preloader.js';
import { initShowcase, initBenefits, initStudies, initCompare, initPortfolio, initTeam, initRegistros, initTransparency } from './sections.js';
import { initLattice } from './lattice.js';
import { initForms } from './forms.js';

const root = document.documentElement;
if (hasGSAP() && !reducedMotion) root.classList.add('anim');
if (reducedMotion) root.classList.add('no-motion');

const lenis = initScroll();
if (lenis) lenis.stop();
window.scrollTo(0, 0);

const intro = runPreloader();

// trabalho leve e síncrono: pode rodar já
initNav();
initForms();

const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 1));
const safe = (p) => p.catch((e) => console.error(e));

async function mountHeavy() {
  initCompare();
  initBenefits();
  await Promise.all([
    safe(initShowcase()),
    safe(initStudies()),
    safe(initPortfolio()),
    safe(initTeam()),
    safe(initTransparency()),
    safe(initLattice()),
  ]);
  initRegistros();
  // fundo WebGL por último, fora do caminho crítico
  idle(() => import('./field.js')
    .then(({ createField }) => createField(document.getElementById('field'), { sections: $$('[data-formation]') }))
    .catch((e) => console.error(e)));
}

const start = () => {
  lenis?.start();
  return mountHeavy().then(() => {
    initReveals();
    if (hasGSAP()) { window.ScrollTrigger.sort(); window.ScrollTrigger.refresh(); }
  });
};

// os dados JSON já começam a baixar durante a animação (rede, fora da thread principal)
['services', 'studies', 'projects', 'partners', 'team', 'documents'].forEach((n) => loadJSON(n).catch(() => {}));

intro.then(start);
