/* Página de capítulo de projeto: renderiza a partir de data/projects.json e
   monta a cena 3D exclusiva do projeto (projetos/<slug>/scene.js).

   Contrato da cena:
     export function mount(container, { THREE }) {
       ...
       return { update(progress) {}, resize() {}, destroy() {} };   // progress: 0 → 1
     }
*/

import * as THREE from '../vendor/three.module.min.js';
import { $, $$, h, asset, loadJSON, initScroll, initNav, initReveals, hasGSAP, reducedMotion } from './core.js';
import { createCosmos } from './cosmos.js';

const slug = document.body.dataset.project;
const bind = (k) => $(`[data-bind="${k}"]`);

if (hasGSAP() && !reducedMotion) document.documentElement.classList.add('anim');
initScroll();
initNav();
const cosmos = createCosmos($('#field'), { sections: $$('[data-phase]') });

// chegada pelo buraco de minhoca: a página "sai do outro lado"
if (document.documentElement.classList.contains('from-wormhole')) {
  try { sessionStorage.removeItem('q-wormhole'); } catch (e) { /* ok */ }
  const reveal = () => document.documentElement.classList.remove('from-wormhole');
  if (cosmos) { cosmos.emerge(); setTimeout(reveal, 550); } else reveal();
}

(async () => {
  const [projects, partners, pubs] = await Promise.all([loadJSON('projects'), loadJSON('partners'), loadJSON('publications')]);
  const p = projects.find((x) => x.slug === slug);
  if (!p) { bind('title').textContent = 'Projeto não encontrado'; return; }
  const partner = partners.find((x) => x.id === p.partner);

  bind('edition').textContent = `Portfólio · ${p.edition}`;
  bind('title').textContent = p.title;
  bind('tags').append(
    partner ? h('span', { class: 'tag' }, `com ${partner.name}`) : null,
    ...p.places.map((c) => h('span', { class: 'tag' }, c)),
    ...p.tags.map((t) => h('span', { class: 'tag' }, t)),
  );
  const cover = bind('cover'); cover.src = asset(p.cover); cover.alt = `Ilustração do projeto ${p.title}`;
  bind('summary').textContent = p.summary;

  bind('stats').append(...p.stats.map((s) => h('li', {},
    h('strong', { class: 'stat__n', 'data-count': String(s.value) }, String(s.value)), h('span', {}, s.label))));

  bind('journey').append(...p.journey.map((j, i) => h('li', { class: 'journey__step', 'data-reveal': '' },
    h('span', { class: 'mono journey__n' }, String(i + 1).padStart(2, '0')),
    h('h3', { class: 'h3' }, j.title), h('p', {}, j.text))));

  bind('publications').append(...pubs.items.map((b) => {
    const inner = [
      b.cover ? h('img', { src: asset(b.cover), alt: '', loading: 'lazy', width: '480', height: '678' })
        : h('span', { class: 'shelf__blank' }, h('span', { class: 'mono' }, `Vol. ${b.volume}`), h('strong', {}, b.title)),
      h('span', { class: 'shelf__meta' },
        h('span', { class: 'mono' }, `Vol. ${String(b.volume).padStart(2, '0')}`),
        h('strong', {}, b.title),
        b.isbn ? h('span', { class: 'tag' }, `ISBN ${b.isbn}`) : h('span', { class: 'tag tag--pending' }, 'ISBN em registro')),
    ];
    return h('li', { class: 'shelf__item' }, b.file
      ? h('a', { href: asset(b.file), target: '_blank', rel: 'noopener', 'aria-label': `Abrir ${b.title} (PDF)` }, inner)
      : h('div', {}, inner));
  }));

  // Reels: fachada leve — o embed do Instagram só carrega no clique
  const reels = bind('reels');
  let embedLoaded = false;
  const loadEmbed = () => {
    if (embedLoaded) { window.instgrm?.Embeds.process(); return; }
    embedLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js'; s.async = true;
    s.onload = () => window.instgrm?.Embeds.process();
    document.head.append(s);
  };
  p.reels.forEach((url, i) => {
    const li = h('li', { class: 'reel' });
    const btn = h('button', { class: 'reel__facade', type: 'button', 'aria-label': `Carregar vídeo ${i + 1} do Instagram` },
      h('span', { class: 'mono' }, `Registro ${String(i + 1).padStart(2, '0')}`),
      h('span', { class: 'reel__play', 'aria-hidden': 'true' }),
      h('span', { class: 'mono reel__src' }, 'Instagram · @quarks.club'));
    btn.addEventListener('click', () => {
      li.replaceChildren(h('blockquote', { class: 'instagram-media', 'data-instgrm-permalink': url, 'data-instgrm-version': '14' },
        h('a', { href: url, target: '_blank', rel: 'noopener' }, 'Ver no Instagram')));
      loadEmbed();
    });
    li.append(btn);
    reels.append(li);
  });

  const rep = bind('report');
  rep.href = asset(p.report.file);
  $('img', rep).src = asset(p.report.cover);
  bind('reportBtn').href = asset(p.report.file);

  if (partner) {
    bind('partner').append(
      h('img', { src: asset(partner.logoWide || partner.logo), alt: `Logo ${partner.name}` }),
      h('p', {}, h('strong', {}, `Em parceria com ${partner.name}. `), partner.since + '.'),
    );
  }

  initReveals();
  await mountScene(p);
  if (hasGSAP()) { window.ScrollTrigger.sort(); window.ScrollTrigger.refresh(); }
})().catch((e) => console.error(e));

async function mountScene(p) {
  const el = $('#sceneMount');
  if (!el || !p.scene) return;
  let scene;
  try {
    const mod = await import(asset(p.scene));
    scene = mod.mount(el, { THREE });
  } catch (e) { console.error('Cena indisponível', e); return; }
  const num = $('#stageNum');
  const lines = ['O projeto, desmontado peça por peça.', 'Kits, formação, visitas, mostras e publicações.', 'Energia que fica na escola.'];
  const lineEl = $('[data-stage-line]');
  const set = (prog) => {
    scene.update(prog);
    num.textContent = String(Math.round(prog * 100)).padStart(2, '0');
    const li = Math.min(lines.length - 1, Math.floor(prog * lines.length));
    if (lineEl.dataset.i !== String(li)) { lineEl.dataset.i = li; lineEl.textContent = lines[li]; }
  };
  window.addEventListener('resize', () => scene.resize?.());
  if (!hasGSAP() || reducedMotion) { set(0.6); return; }
  window.ScrollTrigger.create({
    trigger: '#stage', start: 'top top', end: '+=220%', pin: '.stage__pin', scrub: 0.6,
    onUpdate: (st) => set(st.progress),
  });
  set(0);
}
