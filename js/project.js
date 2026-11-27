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
import { initI18n, t } from './i18n.js';

const i18n = initI18n();

const slug = document.body.dataset.project;
const volLabel = (v) => (typeof v === 'number' ? `Vol. ${String(v).padStart(2, '0')}` : `Volume ${v}`);
const bind = (k) => $(`[data-bind="${k}"]`);

if (hasGSAP() && !reducedMotion) document.documentElement.classList.add('anim');
initScroll();
initNav();
const cosmos = createCosmos($('#field'), { sections: $$('[data-phase]'), mode: 'wormhole' });

// chegada pelo buraco de minhoca: a página "sai do outro lado" quando o túnel estiver fluido;
// a cena 3D do projeto só é montada depois da travessia, para não disputar os quadros com ela
let arrival = Promise.resolve();
if (document.documentElement.classList.contains('from-wormhole')) {
  try { sessionStorage.removeItem('q-wormhole'); } catch (e) { /* ok */ }
  const reveal = () => document.documentElement.classList.remove('from-wormhole');
  if (cosmos) arrival = cosmos.emerge(() => setTimeout(reveal, 450));
  else reveal();
}

(async () => {
  await i18n; // textos montados já no idioma escolhido
  const [projects, partners, pubs] = await Promise.all([loadJSON('projects'), loadJSON('partners'), loadJSON('publications')]);
  const p = projects.find((x) => x.slug === slug);
  if (!p) { bind('title').textContent = t('Projeto não encontrado'); return; }
  const partner = partners.find((x) => x.id === p.partner);
  // cada bloco só é montado se a página tiver o lugar dele (data-bind)
  const fill = (k, fn) => { const el = bind(k); if (el) fn(el); };

  bind('edition').textContent = `${t('Portfólio')} · ${t(p.edition)}`;
  bind('title').textContent = p.title;
  fill('subtitle', (el) => { el.textContent = p.subtitle || ''; });
  bind('tags').append(...[
    ...(p.keywords || []).filter((k) => !p.tags.includes(k)).map((k) => h('span', { class: 'tag' }, k)),
    partner ? h('span', { class: 'tag' }, partner.name) : null,
    p.with ? h('span', { class: 'tag' }, p.with) : null,
    ...p.places.map((c) => h('span', { class: 'tag' }, c)),
    ...p.tags.map((tag) => h('span', { class: 'tag' }, tag)),
  ].filter(Boolean)); // append(null) escreveria "null" na página
  const cover = bind('cover'); cover.src = asset(p.cover); cover.alt = t('Ilustração do projeto {title}', { title: t(p.title) });
  bind('summary').textContent = p.summary;

  const stats = (list) => list.map((s) => h('li', {},
    h('strong', { class: 'stat__n' }, s.prefix ? h('span', { class: 'stat__pre' }, s.prefix) : null,
      h('span', { 'data-count': String(s.value), 'data-decimals': String((String(s.value).split('.')[1] || '').length) }, String(s.value)),
      s.suffix ? h('span', { class: 'stat__suf' }, s.suffix) : null), ' ', h('span', {}, s.label)));
  bind('stats').append(...stats(p.stats));
  fill('eventStats', (el) => el.append(...stats(p.eventStats || [])));

  fill('journey', (el) => el.append(...p.journey.map((j, i) => h('li', { class: 'journey__step', 'data-reveal': '' },
    h('span', { class: 'mono journey__n' }, String(i + 1).padStart(2, '0')),
    h('h3', { class: 'h3' }, j.title), h('p', {}, j.text)))));

  fill('publications', (el) => el.append(...pubs.items.map((b) => {
    const inner = [
      b.cover ? h('img', { src: asset(b.cover), alt: '', loading: 'lazy', width: '480', height: '678' })
        : h('span', { class: 'shelf__blank' }, h('span', { class: 'mono' }, volLabel(b.volume)), h('strong', {}, b.title)),
      h('span', { class: 'shelf__meta' },
        h('span', { class: 'mono' }, volLabel(b.volume)),
        h('strong', {}, b.title),
        b.isbn ? h('span', { class: 'tag' }, `ISBN ${b.isbn}`) : h('span', { class: 'tag tag--pending' }, 'ISBN em registro')),
    ];
    return h('li', { class: 'shelf__item' }, b.file
      ? h('a', { href: asset(b.file), target: '_blank', rel: 'noopener', 'aria-label': t('Abrir {title} (PDF)', { title: b.title }) }, inner)
      : h('div', {}, inner));
  })));

  // Reels: fachada leve — o embed do Instagram só carrega no clique
  fill('reels', (reels) => {
    let embedLoaded = false;
    const loadEmbed = () => {
      if (embedLoaded) { window.instgrm?.Embeds.process(); return; }
      embedLoaded = true;
      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js'; s.async = true;
      s.onload = () => window.instgrm?.Embeds.process();
      document.head.append(s);
    };
    // cada item é um link (string) ou { url, source, title }
    (p.reels || []).forEach((item, i) => {
      const r = typeof item === 'string' ? { url: item } : item;
      const li = h('li', { class: 'reel' });
      const btn = h('button', { class: 'reel__facade', type: 'button', 'aria-label': t('Carregar vídeo {n} do Instagram', { n: i + 1 }) },
        h('span', { class: 'mono' }, r.title || t('Registro {n}', { n: String(i + 1).padStart(2, '0') })),
        h('span', { class: 'reel__play', 'aria-hidden': 'true' }),
        h('span', { class: 'mono reel__src' }, `Instagram · ${r.source || '@quarks.club'}`));
      btn.addEventListener('click', () => {
        li.replaceChildren(h('blockquote', { class: 'instagram-media', 'data-instgrm-permalink': r.url, 'data-instgrm-version': '14' },
          h('a', { href: r.url, target: '_blank', rel: 'noopener' }, 'Ver no Instagram')));
        loadEmbed();
      });
      li.append(btn);
      reels.append(li);
    });
  });

  fill('challenges', (el) => renderChallenges(el, p.challenges || []));

  fill('schools', (el) => el.append(...(p.schools || []).map((s, i) => h('li', { class: 'route__stop glass', 'data-reveal': '' },
    h('p', { class: 'route__top mono' }, h('span', { class: 'route__n' }, String(i + 1).padStart(2, '0')), h('span', {}, s.period)),
    h('h3', { class: 'h3' }, s.name),
    h('p', { class: 'route__where' }, h('span', {}, s.city), ' · ', h('span', {}, s.network)),
    h('dl', { class: 'route__nums' },
      h('div', {}, h('dt', {}, t('grupos')), h('dd', { 'data-count': String(s.groups) }, String(s.groups))),
      s.enrolled ? h('div', {}, h('dt', {}, t('estudantes inscritos')), h('dd', { 'data-count': String(s.enrolled) }, String(s.enrolled))) : null,
      h('div', {}, h('dt', {}, t('estudantes certificados')), h('dd', { 'data-count': String(s.students) }, String(s.students))),
      h('div', {}, h('dt', {}, t('professores')), h('dd', { 'data-count': String(s.teachers) }, String(s.teachers)))),
    s.highlight ? h('a', { class: 'route__hl', href: s.highlight, target: '_blank', rel: 'noopener' }, 'Destaques no Instagram ↗') : null))));

  fill('credits', (el) => el.append(
    ...(p.credits || []).map((c) => h('li', { class: 'credit', 'data-reveal': '' },
      h('span', { class: 'credit__logo' }, h('img', { src: asset(c.logo), alt: t('Logo {name}', { name: c.name }), loading: 'lazy' })),
      h('span', { class: 'credit__role mono' }, c.role),
      h('strong', {}, c.name),
      h('span', { class: 'credit__detail' }, c.detail))),
    h('li', { class: 'credit credit--quarks', 'data-reveal': '' },
      h('span', { class: 'credit__logo', html: '<svg class="mark" viewBox="10 25 540 363" aria-hidden="true"><use href="#q-mark" x="10" y="25" width="540" height="363"/></svg>' }),
      h('span', { class: 'credit__role mono' }, p.quarksRole?.role || 'Execução técnica'),
      h('strong', {}, 'Clube de Ciências Quarks'),
      h('span', { class: 'credit__detail' }, p.quarksRole?.detail || 'Serviços contratados pela coordenação do projeto')),
  ));

  fill('delivered', (el) => el.append(...(p.delivered || []).map((d) => h('li', { 'data-reveal': '' }, d))));

  const gallery = (list) => list.map((ph) => h('li', { class: 'gallery__item', 'data-reveal': '' },
    h('a', { href: asset(ph.file), target: '_blank', rel: 'noopener' },
      h('figure', {}, h('img', { src: asset(ph.file), alt: ph.caption, loading: 'lazy', width: ph.w ? String(ph.w) : null, height: ph.h ? String(ph.h) : null }), h('figcaption', {}, ph.caption)))));
  fill('photos', (el) => el.append(...gallery(p.photos || [])));
  fill('pieces', (el) => el.append(...gallery(p.pieces || [])));
  fill('album', (el) => renderAlbum(el, p.photos || [], p.albumTags || []));
  fill('player', (el) => renderPlayer(el, p.videos || []));
  fill('shorts', (el) => el.append(...(p.shorts || []).map((v) => {
    const li = h('li', { class: 'short', 'data-reveal': '' });
    const btn = h('button', { class: 'short__facade', type: 'button', 'aria-label': t('Assistir à entrevista {title}', { title: t(v.title) }) },
      h('img', { src: asset(v.cover), alt: '', loading: 'lazy', width: '360', height: '640' }),
      h('span', { class: 'vplay', 'aria-hidden': 'true' }), h('span', { class: 'short__q' }, v.title));
    btn.addEventListener('click', () => li.replaceChildren(ytFrame(v.id, v.title)));
    li.append(btn);
    return li;
  })));

  // colmeia: fotos recortadas em hexágono, legenda no hover
  fill('hive', (el) => el.append(...(p.hive || []).map((ph) => h('li', { 'data-reveal': '' },
    h('img', { src: asset(ph.file), alt: ph.caption, loading: 'lazy', width: '520', height: '450' }),
    h('span', { class: 'hive__cap', 'aria-hidden': 'true' }, ph.caption)))));

  fill('links', (el) => el.append(...(p.links || []).map((l) => h('a', { class: 'btn btn--ghost', href: l.href, target: '_blank', rel: 'noopener' },
    h('span', {}, l.label), h('span', { class: 'mono' }, ` ${l.value} ↗`)))));

  if (p.report) {
    const rep = bind('report');
    rep.href = asset(p.report.file);
    $('img', rep).src = asset(p.report.cover);
    bind('reportBtn').href = asset(p.report.file);
  }

  if (partner) fill('partner', (el) => el.append(
    h('img', { src: asset(partner.logoWide || partner.logo), alt: t('Logo {name}', { name: partner.name }) }),
    h('p', {}, h('strong', {}, t('Em parceria com {name}.', { name: partner.name }) + ' '), t(partner.since) + '.'),
  ));

  initReveals();
  await mountScene(p);
  if (hasGSAP()) { window.ScrollTrigger.sort(); window.ScrollTrigger.refresh(); }
})().catch((e) => console.error(e));

/* Desafios: abas A/B/C; o recorde conta até o valor e as barras crescem por escola */
const CHALLENGE_ICONS = {
  ponte: '<path d="M4 40h56M8 40l8-16 8 16 8-16 8 16 8-16 8 16M16 24h32"/><path d="M28 40v8h8v-8"/>',
  lancador: '<path d="M6 48h52M14 48l12-18M26 30l24-16"/><circle cx="52" cy="12" r="4"/><path d="M56 10q6-6 6 2" stroke-dasharray="2 4"/>',
  carro: '<path d="M8 40h46l-5-11H18z"/><circle cx="20" cy="44" r="5"/><circle cx="44" cy="44" r="5"/><path d="M22 29l4-6h16l4 6"/><circle cx="52" cy="10" r="5"/><path d="M52 1v3M60 10h-3M58 4l-2 2"/>',
};
function renderChallenges(el, list) {
  if (!list.length) return;
  const fmt = (v, d) => v.toLocaleString(document.documentElement.lang || 'pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const tabs = h('div', { class: 'chal__tabs', role: 'tablist', 'aria-label': t('Desafios científicos') });
  const panel = h('div', { class: 'chal__panel glass', role: 'tabpanel', id: 'chalPanel' });
  let tween = null;
  const show = (i) => {
    const c = list[i];
    [...tabs.children].forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    panel.setAttribute('aria-labelledby', `chal-${c.id}`);
    const has = (r) => typeof r.value === 'number';
    const max = Math.max(...c.results.filter(has).map((r) => r.value));
    const num = h('strong', { class: 'chal__num' }, fmt(0, c.record.decimals));
    // escola sem marca registrada: barra vazia e "Valor não computado"
    const bars = c.results.map((r) => h('li', { class: !has(r) ? 'is-na' : r.value === max ? 'is-best' : '' },
      h('span', { class: 'mono' }, r.school),
      h('span', { class: 'chal__bar' }, has(r) ? h('i', { style: `--w:${(r.value / max).toFixed(3)}` }) : null),
      h('span', { class: 'chal__val' }, has(r) ? `${fmt(r.value, c.record.decimals)} ${t(c.record.unit)}` : 'Valor não computado')));
    panel.replaceChildren(
      h('span', { class: 'chal__icon', html: `<svg viewBox="0 0 64 56" aria-hidden="true">${CHALLENGE_ICONS[c.id] || ''}</svg>` }),
      h('p', { class: 'chal__mat mono' }, c.material),
      h('h3', { class: 'h3' }, c.goal),
      h('p', { class: 'chal__rec' }, h('span', { class: 'chal__label mono' }, t('Recorde da edição')),
        h('span', { class: 'chal__big' }, num, h('span', { class: 'chal__unit' }, c.record.unit)), h('span', { class: 'chal__note' }, c.record.note)),
      h('ul', { class: 'chal__bars', 'aria-label': t('Marca vencedora por escola') }, ...bars),
    );
    panel.classList.remove('is-in'); void panel.offsetWidth; panel.classList.add('is-in');
    if (tween) tween.kill();
    if (hasGSAP() && !reducedMotion) {
      const o = { v: 0 };
      tween = window.gsap.to(o, { v: c.record.value, duration: 1.4, ease: 'power3.out', onUpdate: () => { num.textContent = fmt(o.v, c.record.decimals); } });
    } else num.textContent = fmt(c.record.value, c.record.decimals);
  };
  list.forEach((c, i) => {
    const b = h('button', { class: 'chal__tab', type: 'button', role: 'tab', id: `chal-${c.id}`, 'aria-controls': 'chalPanel' },
      h('span', { class: 'chal__letter mono' }, c.letter), h('span', {}, c.title));
    b.addEventListener('click', () => show(i));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = (i + d + list.length) % list.length;
      show(n); tabs.children[n].focus();
    });
    tabs.append(b);
  });
  el.append(tabs, panel);
  // o primeiro desafio é mostrado quando a seção entra na tela (para a contagem ser vista)
  if (hasGSAP() && !reducedMotion) {
    window.ScrollTrigger.create({ trigger: el, start: 'top 75%', once: true, onEnter: () => show(0) });
  } else show(0);
}

/* YouTube só entra no clique (sem cookies): até lá, capa local */
const ytFrame = (id, title) => h('iframe', {
  src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, title,
  allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '', loading: 'lazy',
});

/* Player com playlist: o palco mostra a capa; escolher na lista já toca */
function renderPlayer(el, list) {
  if (!list.length) return;
  const stage = h('div', { class: 'vplayer__stage' });
  const items = list.map((v, i) => {
    const b = h('button', { class: 'vplayer__item', type: 'button' },
      h('img', { src: asset(v.cover), alt: '', loading: 'lazy', width: '960', height: '540' }),
      h('span', {}, h('span', { class: 'mono' }, v.meta), h('strong', {}, v.title)));
    b.addEventListener('click', () => {
      show(i, true);
      if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
    return h('li', {}, b);
  });
  const show = (i, play) => {
    const v = list[i];
    items.forEach((li, j) => { if (i === j) li.firstChild.setAttribute('aria-current', 'true'); else li.firstChild.removeAttribute('aria-current'); });
    if (play) { stage.replaceChildren(ytFrame(v.id, v.title)); return; }
    const facade = h('button', { class: 'vplayer__facade', type: 'button', 'aria-label': t('Assistir: {title}', { title: t(v.title) }) },
      h('img', { src: asset(v.cover), alt: '', width: '960', height: '540' }),
      h('span', { class: 'vplay vplay--big', 'aria-hidden': 'true' }),
      h('span', { class: 'vplayer__cap' }, h('span', { class: 'mono' }, v.meta), h('strong', {}, v.title)));
    facade.addEventListener('click', () => show(i, true));
    stage.replaceChildren(facade);
  };
  show(0, false);
  el.append(stage, h('ol', { class: 'vplayer__list', 'aria-label': t('Vídeos da FIICEST') }, ...items));
}

/* Álbum: filtros por capítulo e ampliação em <dialog> (Esc, setas e deslizar) */
function renderAlbum(el, photos, tags) {
  if (!photos.length) return;
  let shown = photos.map((_, i) => i);
  let cur = 0;
  const img = h('img', { alt: '' });
  const cap = h('p', {});
  const count = h('span', { class: 'mono' });
  const btn = (cls, label, txt) => h('button', { class: `lightbox__btn ${cls}`, type: 'button', 'aria-label': label }, txt);
  const prev = btn('lightbox__prev', t('Foto anterior'), '←');
  const next = btn('lightbox__next', t('Próxima foto'), '→');
  const close = btn('lightbox__close', t('Fechar'), '×');
  const dlg = h('dialog', { class: 'lightbox', 'aria-label': t('Álbum de fotos') },
    h('figure', {}, img, h('figcaption', { 'aria-live': 'polite' }, count, cap)), prev, next, close);
  const open = (k) => {
    cur = (k + shown.length) % shown.length;
    const ph = photos[shown[cur]];
    img.src = asset(ph.file); img.alt = t(ph.caption); img.width = ph.w; img.height = ph.h;
    cap.textContent = t(ph.caption);
    count.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(shown.length).padStart(2, '0')}`;
    if (!dlg.open) { dlg.showModal(); window.__lenis?.stop(); }
  };
  prev.addEventListener('click', () => open(cur - 1));
  next.addEventListener('click', () => open(cur + 1));
  close.addEventListener('click', () => dlg.close());
  // sem isso a rolagem suave (Lenis) segue movendo a página por trás da foto
  dlg.addEventListener('close', () => window.__lenis?.start());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // clique fora da foto
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') open(cur - 1);
    if (e.key === 'ArrowRight') open(cur + 1);
  });
  let x0 = null;
  dlg.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  dlg.addEventListener('pointerup', (e) => {
    const dx = x0 === null ? 0 : e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) open(cur + (dx < 0 ? 1 : -1));
  });

  const cells = photos.map((ph, i) => {
    const b = h('button', { class: 'album__item', type: 'button', 'aria-label': t('Ampliar: {caption}', { caption: t(ph.caption) }) },
      h('img', { src: asset(ph.file), alt: ph.caption, loading: 'lazy', width: String(ph.w), height: String(ph.h) }),
      h('span', { class: 'album__cap', 'aria-hidden': 'true' }, ph.caption));
    b.addEventListener('click', () => open(shown.indexOf(i)));
    return h('li', { class: ph.size ? `is-${ph.size}` : null, 'data-reveal': '', style: `view-transition-name: ph${i}` }, b);
  });
  const chips = [{ id: '', label: t('Todas') }, ...tags.map((g) => ({ ...g, label: t(g.label) }))].map((g) => {
    const n = g.id ? photos.filter((ph) => ph.tag === g.id).length : photos.length;
    const c = h('button', { class: 'album__chip', type: 'button', 'aria-pressed': String(!g.id), 'data-i18n': '' }, g.label, h('span', { class: 'mono' }, String(n)));
    c.addEventListener('click', () => {
      const apply = () => {
        shown = photos.map((ph, i) => i).filter((i) => !g.id || photos[i].tag === g.id);
        cells.forEach((li, i) => { li.hidden = !shown.includes(i); });
        chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      };
      if (document.startViewTransition && !reducedMotion) document.startViewTransition(apply);
      else apply();
    });
    return c;
  });
  el.append(h('div', { class: 'album__filters', role: 'group', 'aria-label': t('Filtrar fotos') }, ...chips),
    h('ul', { class: 'album__grid' }, ...cells), dlg);
}

async function mountScene(p) {
  const el = $('#sceneMount');
  if (!el || !p.scene) return;
  let scene;
  try {
    const mod = import(asset(p.scene)); // baixa já; monta depois da travessia
    await arrival;
    scene = (await mod).mount(el, { THREE });
  } catch (e) { console.error('Cena indisponível', e); return; }
  const num = $('#stageNum');
  const lines = (p.stageLines || ['O projeto, desmontado peça por peça', 'Kits, formação, visitas, mostras e publicações', 'Energia que fica na escola']).map((l) => t(l));
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
    trigger: '#stage', start: 'top top', end: `+=${p.stageLength || '220%'}`, pin: '.stage__pin', scrub: 0.6,
    onUpdate: (st) => set(st.progress),
  });
  set(0);
}
