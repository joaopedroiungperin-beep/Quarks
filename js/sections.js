/* Seções da home: renderização a partir de data/*.json e interações. */

import { $, $$, h, asset, loadJSON, hasGSAP, reducedMotion, drawer, lenis } from './core.js';
import { t } from './i18n.js';

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
  const note = $('#benefitNote');
  const viz = $('.bviz');
  const icons = $$('.bviz__icon');
  const ticks = $$('.bviz__ticks circle');
  const list = $('.benefits__list');
  if (!items.length) return;
  let cur = -1;
  const setActive = (n) => {
    if (n === cur) return;
    cur = n;
    items.forEach((li, i) => { li.classList.toggle('is-on', i <= n); li.classList.toggle('is-current', i === n); });
    icons.forEach((g, i) => g.classList.toggle('is-current', i === n));
    ticks.forEach((t, i) => t.classList.toggle('is-on', i <= n));
    if (meter) meter.style.setProperty('--i', n); // odômetro: a faixa 01…07 desliza
    if (note) { note.classList.remove('is-in'); void note.offsetWidth; note.textContent = items[n].dataset.note || ''; note.classList.add('is-in'); }
    // régua graduada: preenche até o centro do tópico atual
    if (list) { const li = items[n]; list.style.setProperty('--fill', ((li.offsetTop + li.offsetHeight / 2) / list.offsetHeight).toFixed(4)); }
  };
  // progresso contínuo: o anel avança a cada pixel de rolagem, não só a cada troca de tópico
  const setProgress = (p) => viz && viz.style.setProperty('--p', p.toFixed(4));
  if (!hasGSAP() || reducedMotion) {
    setActive(0); setProgress(1 / items.length);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { const i = items.indexOf(e.target); setActive(i); setProgress((i + 1) / items.length); }
    }), { rootMargin: '-45% 0px -45% 0px' });
    items.forEach((li) => io.observe(li));
    return;
  }
  const { gsap } = window;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 960px)', () => {
    window.ScrollTrigger.create({
      trigger: '#benefits', start: 'top top', end: '+=' + items.length * 38 + '%', pin: '.benefits__inner', scrub: true,
      onUpdate: (st) => { setProgress(st.progress); setActive(Math.min(items.length - 1, Math.floor(st.progress * items.length))); },
    });
  });
  mm.add('(max-width: 959px)', () => {
    window.ScrollTrigger.create({ trigger: list, start: 'top 60%', end: 'bottom 60%', onUpdate: (st) => setProgress(st.progress) });
    items.forEach((li, i) => window.ScrollTrigger.create({ trigger: li, start: 'top 60%', onEnter: () => setActive(i), onLeaveBack: () => setActive(Math.max(0, i - 1)) }));
  });
  setActive(0);
  window.addEventListener('resize', () => { const n = cur; cur = -1; setActive(Math.max(0, n)); }, { passive: true });
}

/* ---------- 01 · IDEB: o Brasil se desenha e a lupa amplia Sergipe ---------- */
// cada parte do mapa tem uma janela [a, b] dentro do progresso da rolagem (--m, 0→1)
const MAP_STEPS = [
  ['#brrasil\\.svg', 0, 0.42, 'draw'],                 // contorno do Brasil
  ['.str0', 0.32, 0.46, 'draw'],                       // Sergipe, pequeno
  ['.str2, .str7', 0.42, 0.54, 'draw'],                // lupa sobre Sergipe
  ['line', 0.5, 0.64, 'draw'],                         // feixes até a lente
  ['.fil6', 0.56, 0.7, 'fade'],                        // cone de luz
  ['.str3, .str5', 0.58, 0.78, 'draw zoom'],           // lente ampliada
  ['#BRSE', 0.66, 0.9, 'draw zoom'],                   // Sergipe ampliado
];
export async function initIdebMap() {
  const fig = $('.ideb__map');
  const img = fig && fig.querySelector('img');
  if (!img) return;
  let svg;
  try {
    const txt = await fetch(img.getAttribute('src')).then((r) => r.text());
    svg = new DOMParser().parseFromString(txt, 'image/svg+xml').querySelector('svg');
  } catch (e) { return; } // sem SVG embutido, fica a imagem estática
  if (!svg) return;
  ['width', 'height', 'style'].forEach((a) => svg.removeAttribute(a));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', img.alt);
  MAP_STEPS.forEach(([sel, a, b, mode]) => svg.querySelectorAll(sel).forEach((el) => {
    mode.split(' ').forEach((m) => el.classList.add('mp-' + m));
    if (mode.includes('draw')) el.setAttribute('pathLength', '1');
    el.style.setProperty('--a', a);
    el.style.setProperty('--b', b);
  }));
  svg.querySelector('#BRSE')?.classList.add('mp-fill');
  img.replaceWith(svg);
  if (!hasGSAP() || reducedMotion) { svg.style.setProperty('--m', 1); return; }
  window.ScrollTrigger.create({
    trigger: fig, start: 'top 85%', end: 'bottom 45%', scrub: 0.6,
    onUpdate: (st) => svg.style.setProperty('--m', st.progress.toFixed(4)),
  });
}

/* ---------- 01 · IDEB: corrida no anel (Sergipe persegue o Brasil) ---------- */
export function initRace() {
  const canvas = $('#raceCanvas');
  const btn = $('#raceBoost');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const TOP = -Math.PI / 2;
  const lanes = { br: { a: TOP + 0.9, v: 0.5, s: 1, c: '127,231,242' }, se: { a: TOP, v: 0.53, s: 0.8, c: '242,166,90' } };
  let w = 0, h = 0, boost = 0, boosting = false, running = false, last = 0;

  const pt = (a, s) => [w / 2 + w * 0.44 * s * Math.cos(a), h / 2 + h * 0.38 * s * Math.sin(a)];
  const mono = '10px "JetBrains Mono", monospace';

  function draw() {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    // pista: duas raias e marcações de telemetria
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(243,234,216,0.12)';
    [1, 0.8].forEach((s) => { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.44 * s, h * 0.38 * s, 0, 0, Math.PI * 2); ctx.stroke(); });
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const [x1, y1] = pt(a, 1.04);
      const [x2, y2] = pt(a, i % 5 ? 1.07 : 1.1);
      ctx.strokeStyle = `rgba(243,234,216,${i % 5 ? 0.12 : 0.28})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // linha de chegada: a média nacional
    const [fx1, fy1] = pt(TOP, 0.7);
    const [fx2, fy2] = pt(TOP, 1.1);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(243,234,216,0.5)';
    ctx.beginPath(); ctx.moveTo(fx1, fy1); ctx.lineTo(fx2, fy2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(243,234,216,0.55)'; ctx.font = mono; ctx.textAlign = 'center';
    ctx.fillText(t('MÉDIA NACIONAL'), w / 2, fy1 + 16);
    // pulsos com rastro (o de Sergipe se alonga com o impulso)
    Object.values(lanes).forEach((l) => {
      const k = l === lanes.se ? boost : 0;
      const len = 0.5 + k * 0.9;
      for (let i = 0; i < 28; i++) {
        const q = i / 27;
        const [x, y] = pt(l.a - len * (1 - q), l.s);
        ctx.fillStyle = `rgba(${l.c},${(q * q * 0.7).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, 1 + q * 2.4, 0, Math.PI * 2); ctx.fill();
      }
      const [x, y] = pt(l.a, l.s);
      ctx.shadowColor = `rgb(${l.c})`; ctx.shadowBlur = 16 + k * 18;
      ctx.fillStyle = `rgb(${l.c})`; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
    // centro: indicador de impulso
    const on = boost > 0.05;
    ctx.fillStyle = `rgba(242,166,90,${(0.2 + boost * 0.8).toFixed(3)})`;
    ctx.font = `500 ${Math.round(Math.min(w, 520) / 18)}px Unbounded, sans-serif`;
    ctx.fillText(on ? t('IMPULSO') : t('SERGIPE'), w / 2, h / 2 + 4);
    ctx.fillStyle = 'rgba(243,234,216,0.45)'; ctx.font = mono;
    ctx.fillText(on ? t('ensino experimental') : t('acelerando'), w / 2, h / 2 + 22);
  }

  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    boost += ((boosting ? 1 : 0) - boost) * Math.min(1, dt * 4);
    lanes.br.a += lanes.br.v * dt;
    lanes.se.a += (lanes.se.v + boost * 1.1) * dt;
    draw();
    requestAnimationFrame(frame);
  }
  const play = (on) => {
    if (on === running || reducedMotion) return;
    running = on; last = 0;
    if (on) requestAnimationFrame(frame);
  };

  const press = (on) => {
    boosting = on;
    if (btn) btn.setAttribute('aria-pressed', String(on));
    // movimento reduzido: um salto discreto em vez da aceleração contínua
    if (reducedMotion && on) { lanes.se.a += 0.35; boost = 1; draw(); boost = 0; }
  };
  if (btn) {
    btn.addEventListener('pointerdown', (e) => { try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } press(true); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, () => press(false)));
    btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } });
    btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') press(false); });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  new ResizeObserver(resize).observe(canvas);
  // só anima enquanto o anel está na tela e a aba está visível
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; play(visible && !document.hidden); }).observe(canvas);
  document.addEventListener('visibilitychange', () => play(visible && !document.hidden));
}

/* ---------- 02 · A virada: sala tradicional, bancada (balança) e o método ---------- */
export function initVirada() {
  const bench = $('#bench');
  const method = $('#method');
  const steps = $$('#method li');

  // 3. o caminho do método segue a rolagem: enche ao descer e volta ao subir
  const setDone = (d) => {
    method.style.setProperty('--done', d.toFixed(3));
    steps.forEach((li, i) => li.classList.toggle('is-on', d >= i + 0.35));
  };
  if (method) {
    if (!hasGSAP() || reducedMotion) setDone(steps.length);
    else {
      window.ScrollTrigger.create({
        trigger: method, start: 'top 85%', end: 'bottom 45%', scrub: 0.4,
        onUpdate: (st) => setDone(st.progress * steps.length),
      });
    }
  }

  // 2. balança: caixa (x = 4) + 3 blocos à esquerda; o visitante põe blocos à direita
  if (!bench) return;
  const LEFT = 7, MAX = 12, PX = 180, PY = 64, ARM = 120;
  const beam = $('.bench__beam', bench);
  const [panL, panR] = $$('.bench__pan', bench);
  const right = $('#benchRight');
  const out = $('#benchOut');
  const msg = $('#benchMsg');
  const puzzleMsg = $('#puzzleMsg');
  const puzzleText = puzzleMsg ? puzzleMsg.textContent : '';
  const tray = $('#benchTray');
  const card = bench.closest('.lab__act');
  const lab = bench.closest('.lab');
  const st = { t: 18 }; // inclinação em graus; positivo = esquerda para baixo
  let n = 0;
  const render = () => {
    const r = (st.t * Math.PI) / 180;
    const c = Math.cos(r) * ARM, s = Math.sin(r) * ARM;
    beam.setAttribute('transform', `rotate(${(-st.t).toFixed(2)} ${PX} ${PY})`);
    panL.setAttribute('transform', `translate(${(PX - c).toFixed(1)} ${(PY + s).toFixed(1)})`);
    panR.setAttribute('transform', `translate(${(PX + c).toFixed(1)} ${(PY - s).toFixed(1)})`);
  };
  const cube = (i) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const attrs = { class: 'bench__cube', x: -33 + (i % 6) * 11, y: 48 - Math.floor(i / 6) * 12, width: 10, height: 10, rx: 2 };
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  const setN = (next) => {
    n = Math.max(0, Math.min(MAX, next));
    while (right.children.length < n) right.append(cube(right.children.length));
    while (right.children.length > n) right.lastElementChild.remove();
    const target = Math.max(-18, Math.min(18, (LEFT - n) * 3));
    if (hasGSAP() && !reducedMotion) window.gsap.to(st, { t: target, duration: 1.4, ease: 'elastic.out(1, 0.4)', onUpdate: render, overwrite: true });
    else { st.t = target; render(); }
    out.textContent = n === 1 ? t('1 bloco') : t('{n} blocos', { n });
    const solved = n === LEFT;
    lab.classList.toggle('is-solved', solved);
    if (solved) msg.textContent = t('Equilíbrio! Sete blocos pesam o mesmo que a caixa e mais três, então a caixa vale 4.');
    else if (n < LEFT) msg.textContent = t('A esquerda ainda pesa mais. Continue pondo blocos e observe o ponteiro.');
    else msg.textContent = t('Passou do ponto: agora a direita pesa mais. Arraste um bloco do prato de volta para a bandeja.');
    if (puzzleMsg) puzzleMsg.textContent = solved ? t('Depois da experiência, as peças se encaixam: a caixa “x” guardava 4 blocos. Agora o símbolo tem significado.') : puzzleText;
  };
  const touched = () => card.classList.add('is-touched');
  $$('[data-bench]', card).forEach((b) => b.addEventListener('click', () => { touched(); setN(n + Number(b.dataset.bench)); }));

  // arrastar nos dois sentidos: bandeja → prato põe um bloco; prato → fora tira um
  // (um toque rápido na bandeja põe, um toque rápido no prato tira)
  const toSvg = (e) => {
    const p = bench.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(bench.getScreenCTM().inverse());
  };
  const overPan = (p) => {
    const r = (st.t * Math.PI) / 180;
    return Math.hypot(p.x - (PX + Math.cos(r) * ARM), p.y - (PY - Math.sin(r) * ARM + 50)) < 62;
  };
  const panHit = $('.bench__panhit', bench);
  let drag = null;
  const clearDrag = () => {
    if (!drag) return;
    drag.el.remove();
    if (drag.hidden) drag.hidden.style.visibility = '';
    drag = null;
    bench.classList.remove('is-over', 'is-over-tray');
  };
  const startDrag = (src, from) => (e) => {
    if (from === 'pan' && n === 0) return;
    e.preventDefault(); touched();
    try { src.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    const p = toSvg(e);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ class: 'bench__drag', width: 18, height: 18, rx: 3, x: p.x - 9, y: p.y - 9 }).forEach(([k, v]) => el.setAttribute(k, v));
    bench.append(el);
    // ao tirar do prato, o último bloco "sai" de lá enquanto é arrastado
    const hidden = from === 'pan' ? right.lastElementChild : null;
    if (hidden) hidden.style.visibility = 'hidden';
    drag = { el, from, hidden, x0: p.x, y0: p.y, moved: false };
  };
  const moveDrag = (e) => {
    if (!drag) return;
    const p = toSvg(e);
    drag.moved = drag.moved || Math.hypot(p.x - drag.x0, p.y - drag.y0) > 6;
    drag.el.setAttribute('x', p.x - 9); drag.el.setAttribute('y', p.y - 9);
    const onPan = overPan(p);
    bench.classList.toggle('is-over', drag.from === 'tray' && onPan);
    bench.classList.toggle('is-over-tray', drag.from === 'pan' && !onPan);
  };
  const endDrag = (e) => {
    if (!drag) return;
    const { from, moved } = drag;
    const onPan = overPan(toSvg(e));
    clearDrag();
    if (from === 'tray' && (!moved || onPan)) setN(n + 1);
    if (from === 'pan' && (!moved || !onPan)) setN(n - 1);
  };
  [[tray, 'tray'], [panHit, 'pan']].forEach(([src, from]) => {
    src.addEventListener('pointerdown', startDrag(src, from));
    src.addEventListener('pointermove', moveDrag);
    src.addEventListener('pointerup', endDrag);
    src.addEventListener('pointercancel', clearDrag);
  });
  render();
}

/* ---------- 03 · Proposta: circuito, lupa e rede ---------- */
export function initProposta() {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    parent.append(n);
    return n;
  };

  // 01 · circuito: fechar o interruptor acende o LED
  const circuit = $('#demoCircuit');
  const cBtn = $('#circuitBtn');
  if (circuit && cBtn) {
    const card = circuit.closest('.step');
    let on = false;
    const toggle = () => {
      on = !on;
      card.classList.toggle('is-on', on);
      cBtn.setAttribute('aria-pressed', String(on));
      cBtn.textContent = on ? t('Desligar') : t('Ligar o circuito');
    };
    cBtn.addEventListener('click', toggle);
    circuit.addEventListener('click', toggle);
  }

  // 02 · lupa: o foco faz os raios espalhados convergirem num ponto
  const lens = $('#demoLens');
  const range = $('#lensRange');
  if (lens && range) {
    const g = $('.lens__rays', lens);
    const spot = $('.lens__spot', lens);
    const state = $('.lens__state', lens);
    const ys = [35, 60, 85, 110, 135];
    const rays = ys.map((y) => {
      el('line', { x1: 38, y1: y, x2: 140, y2: y }, g);
      return el('line', { x1: 140, y1: y }, g);
    });
    const apply = () => {
      const f = range.value / 100;
      const k = 1.5 * (1 - f); // 1,5 = espalhada · 0 = tudo num ponto
      rays.forEach((r, i) => { r.setAttribute('x2', 262); r.setAttribute('y2', (85 + (ys[i] - 85) * k).toFixed(1)); });
      spot.style.setProperty('--f', (f * f).toFixed(3));
      state.textContent = f > 0.92 ? t('foco: ponto quente!') : f > 0.45 ? t('quase lá…') : t('luz espalhada');
    };
    range.addEventListener('input', apply);
    apply();
  }

  // 03 · rede: cada ano letivo acende mais turmas, que ficam acesas
  const net = $('#demoNet');
  const nBtn = $('#netBtn');
  const out = $('#netOut');
  if (net && nBtn) {
    const edges = $('.net__edges', net);
    const nodes = $('.net__nodes', net);
    const ring = (n, rx, ry, off) => Array.from({ length: n }, (_, i) => {
      const a = off + (i / n) * Math.PI * 2;
      return [150 + rx * Math.cos(a), 85 + ry * Math.sin(a)];
    });
    const r1 = ring(6, 62, 44, -Math.PI / 2);
    const r2 = ring(10, 128, 72, -Math.PI / 2 + 0.3);
    const near = (p) => r1.reduce((best, q, i) => (Math.hypot(p[0] - q[0], p[1] - q[1]) < Math.hypot(p[0] - r1[best][0], p[1] - r1[best][1]) ? i : best), 0);
    const line = (a, b, year) => el('line', { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1), 'data-year': year }, edges);
    r1.forEach((p) => line([150, 85], p, 1));
    r2.forEach((p) => line(r1[near(p)], p, 2));
    r2.forEach((p, i) => line(p, r2[(i + 1) % r2.length], 3));
    r1.forEach((p) => el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 6, 'data-year': 1 }, nodes));
    r2.forEach((p) => el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 5, 'data-year': 2 }, nodes));
    const LABELS = ['Ano 0 · toque para começar', 'Ano 1 · primeiras turmas', 'Ano 2 · mais turmas e escolas', 'Ano 3 · a rede segue sozinha'];
    let year = 0;
    const set = (y) => {
      year = y;
      $$('[data-year]', net).forEach((n) => n.classList.toggle('is-lit', Number(n.dataset.year) <= year));
      out.textContent = t(LABELS[year]);
      nBtn.textContent = year >= 3 ? t('Recomeçar') : t('+1 ano letivo');
    };
    const next = () => set(year >= 3 ? 0 : year + 1);
    nBtn.addEventListener('click', next);
    $('.net__core', net).addEventListener('click', next);
    set(0);
  }
}

export async function initStudies() {
  const data = await loadJSON('studies');
  $$('[data-studies]').forEach((row) => {
    const kind = row.dataset.studies;
    const list = [...(data[kind] || [])].sort((a, b) => a.year - b.year);
    const count = $(`[data-count-of="${kind}"]`);
    if (count) count.textContent = t('{n} estudos', { n: list.length });
    // onde ler: o domínio do link (scielo.br, eric.ed.gov…)
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
    const make = (hidden) => list.map((s) => h('a', {
      class: 'study', href: s.url, target: '_blank', rel: 'noopener',
      tabindex: hidden ? '-1' : null, 'aria-hidden': hidden ? 'true' : null,
      'aria-label': hidden ? null : `${s.authors}, ${s.year} ${t('(abre em nova aba)')}`,
    },
    h('span', { class: 'study__year' }, String(s.year)),
    h('span', { class: 'study__authors' }, s.authors),
    h('span', { class: 'study__host' }, host(s.url), ' ↗')));
    // duas cópias para o loop contínuo
    row.append(h('div', { class: 'ticker__track' }, make(false), make(true)));
  });
}

export function initCompare() {
  const range = $('#compareRange');
  const rows = $$('#compareRows li');
  const ctrl = $('.compare__control');
  const count = $('#compareCount');
  if (!range || !rows.length) return;
  const apply = (v) => {
    const k = v / 100;
    ctrl.style.setProperty('--t', v);
    rows.forEach((li, i) => {
      // cada linha "converte" em sequência
      const start = i / rows.length * 0.85;
      const p = Math.min(1, Math.max(0, (k - start) / 0.15));
      li.style.setProperty('--p', p.toFixed(3));
      li.classList.toggle('is-new', p > 0.5);
    });
    const done = rows.filter((li) => li.classList.contains('is-new')).length;
    if (count) count.textContent = done;
    range.setAttribute('aria-valuetext', t('{n} de {total} aspectos transformados', { n: done, total: rows.length }));
  };
  // depois que o visitante mexe no seletor, a dica some e o mini tutorial para de repetir
  let touched = false, demo = null;
  const touch = () => { touched = true; demo?.kill(); ctrl.classList.add('is-touched'); };
  range.addEventListener('input', () => { touch(); apply(+range.value); });
  range.addEventListener('pointerdown', touch);
  apply(+range.value);

  // atalhos: tocar no ícone leva o seletor até a ponta
  const o = { v: +range.value };
  $$('.compare__jump', ctrl).forEach((b) => b.addEventListener('click', () => {
    touch();
    const to = +b.dataset.to;
    if (!hasGSAP() || reducedMotion) { range.value = to; apply(to); return; }
    o.v = +range.value;
    window.gsap.to(o, { v: to, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { range.value = o.v; apply(o.v); } });
  }));

  // mini tutorial: sempre que o comparador volta à tela e ninguém arrastou ainda, o seletor avança e volta
  if (hasGSAP() && !reducedMotion) {
    const nudge = () => {
      if (touched) return;
      demo?.kill(); o.v = 0;
      demo = window.gsap.to(o, { v: 35, duration: 1.4, ease: 'power2.inOut', yoyo: true, repeat: 1, delay: 0.3, onUpdate: () => { range.value = o.v; apply(o.v); } });
    };
    window.ScrollTrigger.create({ trigger: '#compareRows', start: 'top 75%', end: 'bottom 25%', onEnter: nudge, onEnterBack: nudge });
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
      h('a', { href: asset(p.url), 'data-wormhole': '' },
        // ano e marca dividem a mesma célula: no hover o ano sobe e a marca entra em órbita
        h('span', { class: 'project__lead' },
          h('span', { class: 'project__year' }, p.year),
          h('span', { class: 'project__mark', 'aria-hidden': 'true' }, h('img', { src: asset(p.cover), alt: '', loading: 'lazy', width: '96', height: '96' }))),
        h('span', {},
          h('span', { class: 'project__title' }, p.title),
          p.subtitle ? h('span', { class: 'project__sub' }, p.subtitle) : null,
        ),
        h('span', { class: 'project__meta' },
          ...(p.keywords || []).map((k) => h('span', { class: 'tag' }, k)),
          p.partner ? h('span', { class: 'tag' }, partnerName(p.partner)) : null,
          p.with ? h('span', { class: 'tag' }, p.with) : null,
          ...p.places.map((c) => h('span', { class: 'tag' }, c)),
        ),
        h('span', { class: 'project__go', html: ICON_ARROW }),
      ));
    list.append(li);
  });
  list.append(h('li', { class: 'project project--soon' },
    h('div', {},
      h('span', { class: 'project__lead' }, h('span', { class: 'project__year' }, '2026 →')),
      h('span', { class: 'project__title' }, 'Próximo capítulo em construção'),
      h('span', { class: 'project__meta' }, h('span', { class: 'tag' }, 'FIICEST · MOSEE')),
      h('span', {}),
    )));
}

/* ---------- 07 · Time ---------- */
export async function initTeam() {
  const grid = $('#teamGrid');
  if (!grid) return;
  const team = await loadJSON('team');
  const dw = drawer();
  // mini bio: abre no painel lateral ao clicar (ou Enter/Espaço) no cartão
  const openBio = (m) => dw.open(h('div', { class: 'bio' },
    h('div', { class: 'bio__head' },
      h('img', { src: asset(m.photo), alt: t('Foto de {name}', { name: m.name }), width: '480', height: '640' }),
      h('div', {},
        h('p', { class: 'mono drawer__crumb' }, 'Nosso time'),
        h('h2', { id: 'drawerTitle' }, m.name),
        h('p', { class: 'bio__role mono' }, m.role),
        m.diteq ? h('p', { class: 'member__diteq' }, `DITeQ · ${t(m.diteq)}`) : null)),
    m.areas?.length ? h('ul', { class: 'bio__areas' }, ...m.areas.map((a) => h('li', { class: 'tag' }, a))) : null,
    h('p', { class: 'bio__about' }, m.about || m.bio),
    m.formation?.length ? h('div', { class: 'bio__formation' },
      h('p', { class: 'mono bio__label' }, 'Formação'),
      h('ul', {}, ...m.formation.map((f) => h('li', {}, f)))) : null,
    m.lattes ? h('a', { class: 'btn btn--ghost bio__lattes', href: m.lattes, target: '_blank', rel: 'noopener' }, 'Currículo Lattes ↗') : null,
  ));
  team.forEach((m) => {
    const card = h('li', { class: 'member', tabindex: '0', role: 'button', 'aria-haspopup': 'dialog', 'aria-label': t('Ver mini bio de {name}', { name: m.name }) },
      h('img', { src: asset(m.photo), alt: t('Foto de {name}', { name: m.name }), loading: 'lazy', width: '480', height: '640' }),
      h('div', { class: 'member__info' },
        h('p', { class: 'member__role' }, m.role),
        m.diteq ? h('p', { class: 'member__diteq' }, `DITeQ · ${t(m.diteq)}`) : null,
        h('h4', {}, m.name),
        h('p', { class: 'member__bio' }, m.bio),
        h('span', { class: 'member__more mono', 'aria-hidden': 'true' }, 'Ver mini bio →'),
      ));
    card.addEventListener('click', () => openBio(m));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBio(m); } });
    grid.append(card);
  });
  if (hasGSAP() && !reducedMotion) {
    window.gsap.from($$('.member', grid), {
      y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
    });
  }
}

// a faixa de slides saiu da página; o export vazio evita que um main.js antigo em cache quebre o site
export function initRegistros() {}

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
      h('p', { class: 'mono drawer__crumb' }, `${t('Transparência')} / ${t(cat.title)}`),
      h('h2', { id: 'drawerTitle' }, t(item.title) + (item.date ? ` · ${t(item.date)}` : '')),
      item.note ? h('p', { class: 'tag tag--pending', style: 'margin-bottom:18px' }, item.note) : null,
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
          isPending ? pending() : h('span', { class: 'tag' }, single ? 'Abrir PDF ↗' : (item.files.length > 1 ? t('{n} documentos', { n: item.files.length }) : t('1 documento'))),
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
      h('span', {}, cat.title), h('span', { class: 'count' }, String(cat.items.length)));
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

  // atalhos externos para uma aba (ex.: botão na seção DITeQ)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-doc-tab]');
    if (!a) return;
    const btn = document.getElementById(`tab-${a.dataset.docTab}`);
    if (btn) setTimeout(() => btn.click(), 50);
  });
}
