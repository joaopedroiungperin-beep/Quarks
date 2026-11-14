/* Parceiros como uma rede cristalina (hexagonal / grafeno).
   Átomos e ligações em Canvas 2D; os parceiros ocupam os nós centrais.
   Ao passar o cursor, a energia se propaga pelas ligações vizinhas. */

import { $, h, asset, loadJSON, drawer, reducedMotion } from './core.js';

export async function initLattice() {
  const host = $('#lattice');
  if (!host) return;
  const canvas = $('canvas', host);
  const layer = $('#latticeNodes');
  const list = $('#partnerList');
  const ctx = canvas.getContext('2d');
  const partners = await loadJSON('partners');
  const dw = drawer();

  /* ---- geometria: rede hexagonal (favo → cristal) ---- */
  const nodes = [];
  const bonds = [];
  const a = 1; // parâmetro de rede
  const R = 3; // raio em células
  const key = (q, r) => `${q},${r}`;
  const index = new Map();
  // vértices de uma rede de grafeno gerados a partir de coordenadas axiais
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      if (Math.abs(q + r) > R) continue;
      const cx = a * Math.sqrt(3) * (q + r / 2);
      const cy = a * 1.5 * r;
      for (let k = 0; k < 6; k++) {
        const ang = Math.PI / 6 + (k * Math.PI) / 3;
        const x = +(cx + a * Math.cos(ang)).toFixed(3);
        const y = +(cy + a * Math.sin(ang)).toFixed(3);
        const kk = key(x, y);
        if (!index.has(kk)) { index.set(kk, nodes.length); nodes.push({ x, y, e: 0, hot: 0, ph: Math.random() * 6.28 }); }
      }
    }
  }
  // ligações: pares de nós a distância a
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (Math.abs(d - a) < 0.01) bonds.push([i, j]);
    }
  }
  const neighbors = nodes.map(() => []);
  bonds.forEach(([i, j]) => { neighbors[i].push(j); neighbors[j].push(i); });
  const maxR = Math.max(...nodes.map((n) => Math.hypot(n.x, n.y)));

  /* parceiros nos centros de hexágonos próximos do centro; convites ao redor */
  const slots = [[0, 0], [Math.sqrt(3) * 1.5, -1.5], [-Math.sqrt(3) * 1.5, 1.5], [Math.sqrt(3) * 1.5, 1.5 * 1], [-Math.sqrt(3), -3]];
  const items = [];
  partners.forEach((p, i) => items.push({ type: 'partner', p, at: slots[i] || [0, 0] }));
  const inviteSlots = slots.slice(partners.length, partners.length + 2);
  inviteSlots.forEach((at) => items.push({ type: 'invite', at }));

  const openPartner = (p) => {
    dw.open(h('div', {},
      h('p', { class: 'mono drawer__crumb' }, 'Parceiros'),
      h('div', { class: 'drawer__logo' }, h('img', { src: asset(p.logoWide || p.logo), alt: `Logo ${p.name}` })),
      h('h2', { id: 'drawerTitle' }, p.fullName ? `${p.name} — ${p.fullName}` : p.name),
      h('dl', {},
        h('div', {}, h('dt', {}, 'Desde'), h('dd', {}, p.since)),
        p.site ? h('div', {}, h('dt', {}, 'Site'), h('dd', {}, h('a', { href: p.site, target: '_blank', rel: 'noopener' }, p.siteLabel || p.site))) : null,
        h('div', {}, h('dt', {}, 'Sobre'), h('dd', {}, h('p', {}, p.about))),
      ),
      p.projects?.length ? h('a', { class: 'btn', href: asset('projetos/' + p.projects[0] + '/') }, 'Ver projeto em parceria') : null,
    ));
  };

  /* nós HTML (acessíveis) posicionados sobre o canvas */
  const els = items.map((it) => {
    let el;
    if (it.type === 'partner') {
      el = h('button', { class: 'lnode', type: 'button', 'aria-label': `Parceiro ${it.p.name}: ver detalhes` },
        h('img', { src: asset(it.p.logo), alt: '' }));
      el.addEventListener('click', () => openPartner(it.p));
      list.append(h('li', {}, h('button', { type: 'button', onclick: () => openPartner(it.p),
        onpointerenter: () => energize(it), onfocus: () => energize(it) },
        h('span', {}, h('strong', {}, it.p.name), h('small', {}, it.p.since)), h('span', { 'aria-hidden': 'true' }, '→'))));
    } else {
      el = h('a', { class: 'lnode lnode--invite', href: '#contato' }, 'Seu átomo aqui');
    }
    el.addEventListener('pointerenter', () => energize(it));
    el.addEventListener('focus', () => energize(it));
    layer.append(el);
    it.el = el;
    return el;
  });

  /* ---- render ---- */
  let W = 0, H = 0, scale = 1, dpr = 1;
  const toPx = (x, y) => [W / 2 + x * scale, H / 2 + y * scale];
  const resize = () => {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = (Math.min(W, H) / 2 - 10) / maxR;
    items.forEach((it) => {
      const [px, py] = toPx(it.at[0], it.at[1]);
      it.el.style.left = (px / W) * 100 + '%';
      it.el.style.top = (py / H) * 100 + '%';
      it.el.style.setProperty('--s', (it.type === 'partner' ? scale * 2.2 : scale * 1.3) + 'px');
    });
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const nearest = (x, y) => {
    let best = 0, bd = Infinity;
    nodes.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  };
  function energize(it) {
    // os 6 átomos ao redor do parceiro recebem energia
    nodes.forEach((n, i) => { if (Math.hypot(n.x - it.at[0], n.y - it.at[1]) < a * 1.05) n.e = 1; });
    items.forEach((o) => o.el.classList.toggle('is-hot', o === it));
  }
  let pointer = null;
  host.addEventListener('pointermove', (e) => {
    const rect = host.getBoundingClientRect();
    pointer = [(e.clientX - rect.left - W / 2) / scale, (e.clientY - rect.top - H / 2) / scale];
    nodes[nearest(...pointer)].e = 1;
  });
  host.addEventListener('pointerleave', () => { pointer = null; items.forEach((o) => o.el.classList.remove('is-hot')); });

  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(host);

  let t = 0;
  function draw() {
    t += 0.016;
    // difusão de energia pelas ligações
    const next = nodes.map((n, i) => {
      let s = n.e * 0.86;
      for (const j of neighbors[i]) s = Math.max(s, nodes[j].e * 0.8);
      return s * 0.985;
    });
    nodes.forEach((n, i) => { n.e = next[i] < 0.01 ? 0 : next[i]; });

    ctx.clearRect(0, 0, W, H);
    const fade = (n) => 1 - Math.min(1, Math.hypot(n.x, n.y) / maxR) ** 2 * 0.85;
    // ligações
    ctx.lineWidth = 1;
    for (const [i, j] of bonds) {
      const A = nodes[i], B = nodes[j];
      const e = Math.max(A.e, B.e);
      const [x1, y1] = toPx(A.x, A.y), [x2, y2] = toPx(B.x, B.y);
      const base = 0.1 * Math.min(fade(A), fade(B));
      ctx.strokeStyle = e > 0.02 ? `rgba(127,231,242,${base + e * 0.75})` : `rgba(127,231,242,${base})`;
      ctx.lineWidth = 1 + e * 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // átomos
    for (const n of nodes) {
      const breathe = reducedMotion ? 0 : Math.sin(t * 1.4 + n.ph) * 0.4;
      const [x, y] = toPx(n.x, n.y);
      const f = fade(n);
      const rad = 2 + breathe + n.e * 3.5;
      if (n.e > 0.05) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 6);
        g.addColorStop(0, `rgba(127,231,242,${n.e * 0.5})`); g.addColorStop(1, 'rgba(127,231,242,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = n.e > 0.05 ? `rgba(243,234,216,${0.5 + n.e * 0.5})` : `rgba(127,231,242,${0.25 + f * 0.35})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, Math.PI * 2); ctx.fill();
    }
    if (visible) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
