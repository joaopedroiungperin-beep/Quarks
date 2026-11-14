/* Seções da home: renderização a partir de data/*.json e interações. */

import { $, $$, h, asset, loadJSON, hasGSAP, reducedMotion, isTouch, drawer, lenis } from './core.js';

const ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ICON_DOC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>';

const orbit = () => {
  const s = '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse class="o" cx="32" cy="32" rx="30" ry="11"/><ellipse class="o" cx="32" cy="32" rx="11" ry="30"/><circle class="c" cx="32" cy="32" r="5"/></svg>';
  return h('div', { class: 'svc__orbit', html: s });
};

/* ---------- 04 · Atuação: vitrine horizontal ---------- */
export async function initShowcase() {
  const track = $('#showcaseTrack');
  if (!track) return;
  const services = await loadJSON('services');
  services.forEach((s, i) => {
    track.append(h('article', { class: 'svc glass', 'data-accent': s.accent, id: `atuacao-${s.id}` },
      h('span', { class: 'svc__n' }, String(i + 1).padStart(2, '0') + ' / ' + String(services.length).padStart(2, '0')),
      orbit(),
      h('h3', {}, s.title),
      h('p', { class: 'svc__kicker' }, s.kicker),
      h('p', {}, s.summary),
      h('ul', {}, s.points.map((p) => h('li', {}, p))),
    ));
  });

  if (!hasGSAP() || reducedMotion) return;
  const { gsap, ScrollTrigger } = window;
  const section = $('#atuacao');
  const pin = $('.showcase__pin', section);
  const bar = $('#showcaseBar');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    section.classList.add('is-pinned');
    const dist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (st) => gsap.set(bar, { scaleX: st.progress }),
      },
    });
    // profundidade: cada card ganha leve rotação conforme cruza a tela
    $$('.svc', track).forEach((card) => {
      gsap.fromTo(card, { rotateY: -14, z: -120, opacity: 0.4 }, {
        rotateY: 0, z: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 55%', scrub: true },
      });
    });
    gsap.set(track, { transformPerspective: 1200 });
    return () => section.classList.remove('is-pinned');
  });
  mm.add('(max-width: 899px)', () => {
    const onScroll = () => {
      const max = track.scrollWidth - track.clientWidth;
      bar.style.transform = `scaleX(${max > 0 ? track.scrollLeft / max : 0})`;
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  });
  ScrollTrigger.refresh();
}

/* ---------- 02 · Método: benefícios, estudos, comparador ---------- */
export function initBenefits() {
  const items = $$('.benefits__list li');
  const meter = $('#benefitIndex');
  if (!items.length) return;
  const setActive = (n) => {
    items.forEach((li, i) => { li.classList.toggle('is-on', i <= n); li.classList.toggle('is-current', i === n); });
    if (meter) meter.textContent = String(n + 1).padStart(2, '0');
  };
  if (!hasGSAP() || reducedMotion) { items.forEach((li) => li.classList.add('is-on')); return; }
  const { gsap } = window;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 960px)', () => {
    window.ScrollTrigger.create({
      trigger: '#benefits', start: 'top top', end: '+=' + items.length * 55 + '%', pin: '.benefits__inner', scrub: true,
      onUpdate: (st) => setActive(Math.min(items.length - 1, Math.floor(st.progress * items.length))),
    });
  });
  mm.add('(max-width: 959px)', () => {
    items.forEach((li, i) => window.ScrollTrigger.create({ trigger: li, start: 'top 70%', onEnter: () => setActive(i), onLeaveBack: () => setActive(Math.max(0, i - 1)) }));
  });
  setActive(0);
}

export async function initStudies() {
  const data = await loadJSON('studies');
  $$('[data-studies]').forEach((row) => {
    const kind = row.dataset.studies;
    const list = data[kind] || [];
    const label = kind === 'nacionais' ? 'Nacionais' : 'Internacionais';
    const make = (hidden) => [
      h('span', { class: 'ticker__label', 'aria-hidden': hidden ? 'true' : null }, label),
      ...list.map((s) => h('a', { href: s.url, target: '_blank', rel: 'noopener', tabindex: hidden ? '-1' : null, 'aria-hidden': hidden ? 'true' : null },
        s.authors, h('span', {}, String(s.year)))),
    ];
    // duas cópias para o loop contínuo
    row.append(h('div', { class: 'ticker__track' }, make(false), make(true)));
  });
}

export function initCompare() {
  const range = $('#compareRange');
  const rows = $$('#compareRows li');
  const ctrl = $('.compare__control');
  if (!range || !rows.length) return;
  const apply = (v) => {
    const t = v / 100;
    ctrl.style.setProperty('--t', v);
    rows.forEach((li, i) => {
      // cada linha "converte" em sequência
      const start = i / rows.length * 0.85;
      const p = Math.min(1, Math.max(0, (t - start) / 0.15));
      li.style.setProperty('--p', p.toFixed(3));
    });
    range.setAttribute('aria-valuetext', `${Math.round(t * rows.length)} de ${rows.length} aspectos transformados`);
  };
  range.addEventListener('input', () => apply(+range.value));
  apply(+range.value);

  // dica: na primeira vez que o comparador aparece, o seletor avança sozinho
  if (hasGSAP() && !reducedMotion) {
    const o = { v: 0 };
    window.ScrollTrigger.create({
      trigger: '#compareRows', start: 'top 70%', once: true,
      onEnter: () => {
        if (+range.value !== 0) return;
        window.gsap.to(o, { v: 35, duration: 1.6, ease: 'power2.inOut', yoyo: true, repeat: 1, onUpdate: () => { range.value = o.v; apply(o.v); } });
      },
    });
  }
}

/* ---------- 05 · Portfólio ---------- */
export async function initPortfolio() {
  const list = $('#projectList');
  if (!list) return;
  const [projects, partners] = await Promise.all([loadJSON('projects'), loadJSON('partners')]);
  const partnerName = (id) => partners.find((p) => p.id === id)?.name;

  projects.forEach((p) => {
    const li = h('li', { class: 'project' },
      h('a', { href: asset(p.url), 'data-preview': asset(p.cover) },
        h('span', { class: 'project__year' }, p.year),
        h('span', {},
          h('span', { class: 'project__title' }, p.title),
        ),
        h('span', { class: 'project__meta' },
          p.partner ? h('span', { class: 'tag' }, 'com ' + partnerName(p.partner)) : null,
          ...p.places.map((c) => h('span', { class: 'tag' }, c)),
        ),
        h('span', { class: 'project__go', html: ICON_ARROW }),
      ));
    list.append(li);
  });
  list.append(h('li', { class: 'project project--soon' },
    h('div', {},
      h('span', { class: 'project__year' }, '2026 →'),
      h('span', { class: 'project__title' }, 'Próximo capítulo em construção'),
      h('span', { class: 'project__meta' }, h('span', { class: 'tag' }, 'FIICEST · OSFIC · MOSEE')),
      h('span', {}),
    )));

  // prévia flutuante que segue o cursor
  const prev = $('#projectPreview');
  if (!prev || isTouch) return;
  const img = $('img', prev);
  let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => {
    cx += (x - cx) * 0.14; cy += (y - cy) * 0.14;
    prev.style.left = cx + 'px'; prev.style.top = cy + 'px';
    raf = requestAnimationFrame(loop);
  };
  $$('a[data-preview]', list).forEach((a) => {
    a.addEventListener('pointerenter', (e) => {
      img.src = a.dataset.preview; x = cx = e.clientX; y = cy = e.clientY;
      prev.classList.add('is-on'); cancelAnimationFrame(raf); loop();
    });
    a.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; });
    a.addEventListener('pointerleave', () => { prev.classList.remove('is-on'); setTimeout(() => cancelAnimationFrame(raf), 500); });
  });
}

/* ---------- 07 · Time ---------- */
export async function initTeam() {
  const grid = $('#teamGrid');
  if (!grid) return;
  const team = await loadJSON('team');
  team.forEach((m) => {
    grid.append(h('li', { class: 'member', tabindex: '0' },
      h('img', { src: asset(m.photo), alt: `Foto de ${m.name}`, loading: 'lazy', width: '480', height: '640' }),
      h('div', { class: 'member__info' },
        h('p', { class: 'member__role' }, m.role),
        h('h4', {}, m.name),
        h('p', { class: 'member__bio' }, m.bio),
      )));
  });
  if (hasGSAP() && !reducedMotion) {
    window.gsap.from($$('.member', grid), {
      y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
    });
  }
}

export function initRegistros() {
  const track = $('.registros__track');
  if (!track || !hasGSAP() || reducedMotion) return;
  window.gsap.fromTo(track, { x: 0 }, {
    x: () => -(track.scrollWidth - window.innerWidth), ease: 'none',
    scrollTrigger: { trigger: '.registros', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
  });
}

/* ---------- 08 · Transparência ---------- */
export async function initTransparency() {
  const tabs = $('#docTabs');
  const panel = $('#docPanel');
  if (!tabs || !panel) return;
  const cats = await loadJSON('documents');
  const dw = drawer();

  const pending = () => h('span', { class: 'tag tag--pending' }, 'Em publicação');
  const thumb = (cover) => h('span', { class: 'doc__thumb', html: cover ? '' : ICON_DOC },
    cover ? h('img', { src: asset(cover), alt: '', loading: 'lazy' }) : null);

  const openItem = (cat, item) => {
    const content = h('div', {},
      h('p', { class: 'mono drawer__crumb' }, `Transparência / ${cat.title}`),
      h('h2', { id: 'drawerTitle' }, item.title + (item.date ? ` · ${item.date}` : '')),
      h('div', { class: 'drawer__files' }, item.files.map((f) =>
        h('a', { class: 'drawer__file', href: asset(f.file), target: '_blank', rel: 'noopener' },
          f.cover ? h('img', { src: asset(f.cover), alt: '', loading: 'lazy' }) : h('span', { class: 'doc__thumb', html: ICON_DOC }),
          h('span', {}, h('strong', {}, f.label), h('span', {}, 'Abrir PDF ↗'))))),
    );
    dw.open(content);
  };

  const render = (cat) => {
    panel.replaceChildren();
    panel.setAttribute('aria-labelledby', `tab-${cat.id}`);
    cat.items.forEach((item) => {
      const isPending = item.status === 'em-publicacao' || !item.files?.length;
      const single = !isPending && item.files.length === 1 && cat.id === 'institucional';
      const inner = [
        thumb(item.files?.[0]?.cover),
        h('span', {},
          h('span', { class: 'doc__title' }, item.title),
          h('span', { class: 'doc__sub' }, item.date || cat.title),
          isPending ? pending() : h('span', { class: 'tag' }, single ? 'Abrir PDF ↗' : `${item.files.length} documento${item.files.length > 1 ? 's' : ''}`),
        ),
      ];
      let el;
      if (isPending) el = h('div', { class: 'doc', 'aria-disabled': 'true' }, inner);
      else if (single) el = h('a', { class: 'doc', href: asset(item.files[0].file), target: '_blank', rel: 'noopener' }, inner);
      else el = h('button', { class: 'doc', type: 'button', onclick: () => openItem(cat, item) }, inner);
      panel.append(el);
    });
    if (hasGSAP() && !reducedMotion) window.gsap.from(panel.children, { y: 20, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'expo.out' });
  };

  cats.forEach((cat, i) => {
    const btn = h('button', { role: 'tab', id: `tab-${cat.id}`, 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', type: 'button' },
      cat.title, h('span', { class: 'count' }, String(cat.items.length)));
    btn.addEventListener('click', () => {
      $$('[role="tab"]', tabs).forEach((b) => { b.setAttribute('aria-selected', 'false'); b.tabIndex = -1; });
      btn.setAttribute('aria-selected', 'true'); btn.tabIndex = 0;
      render(cat);
    });
    tabs.append(btn);
  });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const all = $$('[role="tab"]', tabs);
    const i = all.indexOf(document.activeElement);
    const n = all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    n.focus(); n.click();
  });
  render(cats[0]);
}
