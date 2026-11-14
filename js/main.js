/* Entrada da home. A ordem importa: scroll → preloader → fundo → seções → revelações. */

import { $$, initScroll, initNav, initReveals, hasGSAP, reducedMotion } from './core.js';
import { runPreloader } from './preloader.js';
import { createField } from './field.js';
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
initNav();
createField(document.getElementById('field'), { sections: $$('[data-formation]') });
initForms();
initCompare();
initBenefits();

const safe = (p) => p.catch((e) => console.error(e));
Promise.all([
  safe(initShowcase()),
  safe(initStudies()),
  safe(initPortfolio()),
  safe(initTeam()),
  safe(initTransparency()),
  safe(initLattice()),
]).then(() => {
  initRegistros();
  if (hasGSAP()) { window.ScrollTrigger.sort(); window.ScrollTrigger.refresh(); }
});

intro.then(() => {
  lenis?.start();
  initReveals();
  if (hasGSAP()) window.ScrollTrigger.refresh();
});
