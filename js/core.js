/* Núcleo compartilhado: caminhos, dados, scroll suave, revelações e utilidades. */

export const ROOT = new URL('../', import.meta.url);
export const asset = (p) => (p ? new URL(p, ROOT).href : '');

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = window.matchMedia('(hover: none)').matches;
export const hasGSAP = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

const cache = new Map();
export function loadJSON(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(new URL(`data/${name}.json`, ROOT)).then((r) => {
      if (!r.ok) throw new Error(`Falha ao carregar ${name}.json`);
      return r.json();
    }));
  }
  return cache.get(name);
}

import { t } from './i18n.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

export const fmtNumber = (n, d = 0) =>
  n.toLocaleString(document.documentElement.lang || 'pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- Scroll suave (Lenis) sincronizado ao GSAP ---------- */
export let lenis = null;
export function initScroll() {
  if (!hasGSAP()) return null;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  if (reducedMotion || typeof window.Lenis === 'undefined') return null;

  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // âncoras internas passam pelo Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    history.replaceState(null, '', id);
  });
  return lenis;
}

/* ---------- Divide títulos em palavras mascaradas ---------- */
export function splitWords(el) {
  if (el.dataset.splitDone) return $$('.wi', el);
  el.dataset.splitSrc = el.innerHTML; // texto original, usado para gerar a lista de traduções
  // chinês e japonês não separam palavras por espaço: cada caractere vira uma unidade
  const cjk = /^(zh|ja)/.test(document.documentElement.lang);
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(cjk ? /(\s+|)/ : /(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
          const w = h('span', { class: 'w' }, h('span', { class: 'wi' }, part));
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  const label = el.textContent.replace(/\s+/g, ' ').trim();
  walk(el);
  el.setAttribute('aria-label', label);
  $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  el.dataset.splitDone = '1';
  return $$('.wi', el);
}

/* ---------- Revelações cinéticas genéricas ---------- */
export function initReveals(scope = document) {
  if (!hasGSAP() || reducedMotion) return;
  const { gsap } = window;

  $$('[data-split]', scope).forEach((el) => {
    // tradução automática: não dividir em palavras (o tradutor traduziria palavra por palavra)
    if (document.documentElement.classList.contains('mt')) {
      gsap.from(el, { opacity: 0, y: 30, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      return;
    }
    const words = splitWords(el);
    gsap.set(words, { yPercent: 110 });
    gsap.to(words, {
      yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  $$('[data-reveal]', scope).forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  $$('[data-mask]', scope).forEach((el) => {
    gsap.to(el, {
      clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
    const img = el.querySelector('img');
    if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  $$('[data-count]', scope).forEach(countUp);

  $$('.bars', scope).forEach((el) => {
    gsap.to($$('.bar i', el), {
      '--grow': 1, duration: 1.6, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

export function countUp(el) {
  const end = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.decimals || '0', 10);
  const plain = 'plain' in el.dataset;
  const render = (v) => { el.textContent = plain ? Math.round(v) : fmtNumber(v, dec); };
  if (!hasGSAP() || reducedMotion) { render(end); return; }
  const o = { v: plain ? end - 30 : 0 };
  render(o.v);
  window.gsap.to(o, {
    v: end, duration: 2, ease: 'power3.out', onUpdate: () => render(o.v),
    scrollTrigger: { trigger: el, start: 'top 92%', once: true },
  });
}

/* ---------- Brilho dos cartões de vidro: segue o cursor ---------- */
export function initGlassGlow() {
  if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let on = null;
  document.addEventListener('pointermove', (e) => {
    const g = e.target.closest?.('.glass');
    if (g !== on) { on?.style.setProperty('--g', '0'); on = g; g?.style.setProperty('--g', '1'); }
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', `${e.clientX - r.left}px`);
    g.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

/* ---------- Navegação: estado, menu móvel e link ativo ---------- */
export function initNav() {
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const menu = $('#menu');
  if (!nav) return;

  // a barra fica sempre visível; ao rolar ganha fundo de vidro para não competir com o conteúdo
  const onScroll = (y) => nav.classList.toggle('is-scrolled', y > 40);
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? t('Fechar menu') : t('Abrir menu'));
      menu.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setOpen(false); });
  }

  // link ativo conforme a seção visível
  const links = $$('.nav__links a');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((l) => l.classList.remove('is-active'));
      map.get(en.target.id)?.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* ---------- Painel lateral (dialog) ---------- */
export function drawer() {
  const dlg = $('#drawer');
  const body = $('#drawerBody');
  const close = () => {
    dlg.close();
  };
  if (!dlg.dataset.bound) {
    $('#drawerClose').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    dlg.addEventListener('close', () => lenis?.start());
    dlg.dataset.bound = '1';
  }
  return {
    open(content) {
      body.replaceChildren(content);
      dlg.showModal();
      dlg.querySelector('.drawer__inner').scrollTop = 0;
      lenis?.stop();
    },
    close,
  };
}
