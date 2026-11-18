/* Entrada da home.
   Durante o preloader a thread principal fica livre (só a animação roda);
   o fundo WebGL (Three.js, import dinâmico) e as seções com dados são
   montados assim que a marca termina de se desenhar. */

import { $$, loadJSON, initScroll, initNav, initGlassGlow, initReveals, hasGSAP, reducedMotion } from './core.js';
import { runPreloader } from './preloader.js';
import { initShowcase, initBenefits, initVirada, initRace, initIdebMap, initStudies, initCompare, initPortfolio, initTeam, initRegistros, initTransparency } from './sections.js';
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
initGlassGlow();
initForms();

const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 1));
const safe = (p) => p.catch((e) => console.error(e));

async function mountHeavy() {
  initCompare();
  initBenefits();
  initVirada();
  initRace();
  await Promise.all([
    safe(initShowcase()),
    safe(initStudies()),
    safe(initIdebMap()),
    safe(initPortfolio()),
    safe(initTeam()),
    safe(initTransparency()),
    safe(initLattice()),
  ]);
  initRegistros();
  // cosmos (WebGL) por último, fora do caminho crítico
  idle(() => import('./cosmos.js')
    .then(({ createCosmos }) => { cosmos = createCosmos(document.getElementById('field'), { sections: $$('[data-phase]') }); window.__cosmos = cosmos; })
    .catch((e) => console.error(e)));
}

/* ---------- buraco de minhoca: projeto → página do capítulo ---------- */
let cosmos = null;
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-wormhole]');
  if (!a || !cosmos || reducedMotion || e.defaultPrevented) return;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
  e.preventDefault();
  root.classList.add('is-warping');
  lenis?.stop();
  cosmos.warp(e.clientX, e.clientY).then(() => {
    try { sessionStorage.setItem('q-wormhole', '1'); } catch (err) { /* ok */ }
    window.location.href = a.href;
  });
});
// voltar pelo histórico (bfcache) devolve a página intacta
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  root.classList.remove('is-warping');
  cosmos?.reset();
  lenis?.start();
});

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
