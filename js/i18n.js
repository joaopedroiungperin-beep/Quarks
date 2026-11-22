/* Idiomas do site.
   - Português é o original, escrito no próprio HTML e nos data/*.json.
   - Inglês, espanhol e chinês (simplificado) têm tradução revisada em i18n/<lang>.json.
   - Qualquer outro idioma usa a tradução automática do Google, carregada só para quem precisa.

   Detecção: o idioma do navegador/sistema do visitante (não o país), com a escolha
   manual guardada no navegador. As traduções são indexadas por um hash do texto em
   português (normalizado); se um texto mudar e ainda não tiver tradução, ele aparece
   em português, nunca vazio. Para gerar a lista de textos: window.__i18nDump(). */

export const CURATED = { pt: 'Português BR', en: 'English', es: 'Español', zh: '中文' };
export const AUTO = {
  de: 'Deutsch', fr: 'Français', it: 'Italiano', ja: '日本語', ko: '한국어', ru: 'Русский', ar: 'العربية',
  hi: 'हिन्दी', tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', uk: 'Українська', he: 'עברית', id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt', th: 'ไทย', 'zh-TW': '繁體中文', sv: 'Svenska', el: 'Ελληνικά', fa: 'فارسی', ro: 'Română', cs: 'Čeština',
};
const KEY = 'q-lang';
const HTML_LANG = { pt: 'pt-BR', en: 'en', es: 'es', zh: 'zh-CN' };
const INLINE = new Set(['STRONG', 'EM', 'B', 'I', 'A', 'BR', 'SPAN', 'SMALL', 'SUP', 'SUB', 'ABBR', 'TIME', 'U', 'MARK']);
const ATTRS = ['aria-label', 'alt', 'placeholder', 'title', 'data-note'];
const SKIP = 'script, style, noscript, [data-i18n-skip], [translate="no"]';

let dict = null;
export let lang = 'pt';

const norm = (s) => s.replace(/\s+/g, ' ').trim();
// FNV-1a 32 bits sobre as unidades UTF-16 (o mesmo cálculo do script que gera a lista)
export const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
};
const look = (s) => (dict ? dict[hash(norm(s))] : undefined);
/** Texto definido por JavaScript: devolve a tradução (ou o original). Use {n} para números. */
export const t = (s, vars) => {
  let out = look(s) || s;
  if (vars) Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(v); });
  return out;
};

const store = {
  get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ok */ } },
};

// idioma do navegador → código do site
function fromBrowser() {
  const first = (navigator.languages && navigator.languages[0]) || navigator.language || 'pt';
  const code = first.toLowerCase();
  if (code.startsWith('pt')) return 'pt';
  if (/^zh-(tw|hk|mo|hant)/.test(code)) return 'zh-TW';
  const base = code.split('-')[0];
  if (CURATED[base]) return base;
  return base;
}
export function currentLang() { return store.get() || fromBrowser(); }

/* ---------- troca dos textos (traduções revisadas) ---------- */
const hasLetters = (s) => /\p{L}/u.test(s);
const isInline = (el) => [...el.childNodes].every((n) => n.nodeType === 3 || n.nodeType === 8
  || (n.nodeType === 1 && INLINE.has(n.tagName) && isInline(n)));
// bloco traduzido de uma vez: só texto, ou uma frase com marcações no meio (negrito, link…).
// Um elemento que só agrupa links/rótulos (ex.: o menu) é percorrido filho a filho.
const isLeaf = (el) => isInline(el)
  && (!el.children.length || [...el.childNodes].some((n) => n.nodeType === 3 && hasLetters(n.textContent)));

function translateAttrs(el) {
  ATTRS.forEach((a) => {
    const v = el.getAttribute(a);
    if (v && hasLetters(v)) { const tr = look(v); if (tr) el.setAttribute(a, tr); }
  });
}
function translateTree(root) {
  if (!dict || !root || root.nodeType !== 1) return;
  if (root.closest && root.closest('[data-i18n], [data-split-done]')) return;
  const visit = (el) => {
    if (el.matches(SKIP)) return;
    translateAttrs(el);
    if (el.hasAttribute('data-i18n')) return;
    if (isLeaf(el) && hasLetters(el.textContent)) {
      const plain = !el.children.length;
      const tr = look(plain ? el.textContent : el.innerHTML);
      if (tr) { if (plain) el.textContent = tr; else el.innerHTML = tr; }
      el.setAttribute('data-i18n', '');
      return;
    }
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === 3 && hasLetters(n.textContent)) {
        const tr = look(n.textContent);
        if (tr) { const m = n.textContent.match(/^(\s*)[\s\S]*?(\s*)$/); n.textContent = m[1] + tr + m[2]; }
      }
      else if (n.nodeType === 1) visit(n);
    });
  };
  visit(root);
}

/* ---------- tradução automática (demais idiomas) ---------- */
function loadAuto(code) {
  document.documentElement.classList.add('mt'); // sem divisão de palavras nas animações
  document.cookie = `googtrans=/pt/${code}; path=/`;
  const host = document.createElement('div');
  host.id = 'gt'; host.hidden = true;
  document.body.append(host);
  window.googleTranslateElementInit = () => {
    // eslint-disable-next-line no-new
    new window.google.translate.TranslateElement({ pageLanguage: 'pt', autoDisplay: false }, 'gt');
  };
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.head.append(s);
}
function clearAuto() {
  const past = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `googtrans=; ${past}; path=/`;
  document.cookie = `googtrans=; ${past}; path=/; domain=${location.hostname}`;
  document.cookie = `googtrans=; ${past}; path=/; domain=.${location.hostname}`;
}

/* ---------- seletor de idioma ---------- */
export function setLang(code) {
  store.set(code);
  clearAuto();
  location.reload();
}
function mountSwitcher() {
  $$i('[data-lang-switch]').forEach((box) => {
    const btn = box.querySelector('button');
    const list = box.querySelector('[role="menu"]');
    const label = box.querySelector('[data-lang-current]');
    if (label) label.textContent = lang === 'zh-TW' ? '繁' : lang === 'pt' ? 'BR' : lang.slice(0, 2).toUpperCase();
    Object.entries(CURATED).forEach(([code, name]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'menuitemradio'); b.setAttribute('lang', HTML_LANG[code]);
      b.setAttribute('aria-checked', String(code === lang)); b.textContent = name;
      b.addEventListener('click', () => setLang(code));
      list.append(b);
    });
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', t('Outro idioma (tradução automática)'));
    sel.append(new Option(t('Outro idioma (tradução automática)'), ''));
    Object.entries(AUTO).forEach(([code, name]) => sel.append(new Option(name, code, false, code === lang)));
    sel.addEventListener('change', () => sel.value && setLang(sel.value));
    const note = document.createElement('p');
    note.className = 'lang__note';
    note.textContent = t('Tradução automática pelo Google, pode conter imprecisões.');
    list.append(sel, note);
    const open = (v) => { box.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', String(v)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); open(!box.classList.contains('is-open')); });
    document.addEventListener('click', (e) => { if (!box.contains(e.target)) open(false); });
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); btn.focus(); } });
  });
}
const $$i = (s) => [...document.querySelectorAll(s)];

/** Detecta o idioma, aplica as traduções e devolve uma promessa resolvida quando o texto estático já está traduzido. */
export async function initI18n() {
  lang = currentLang();
  const curated = Object.prototype.hasOwnProperty.call(CURATED, lang);
  document.documentElement.lang = curated ? HTML_LANG[lang] : lang;
  if (lang === 'pt') { clearAuto(); mountSwitcher(); return; }
  if (!curated) { loadAuto(lang); mountSwitcher(); return; }
  clearAuto();
  const base = new URL('../i18n/', import.meta.url);
  try { dict = await fetch(new URL(`${lang}.json`, base)).then((r) => r.json()); } catch (e) { dict = null; }
  if (dict) {
    document.title = t(document.title);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = t(meta.content);
    translateTree(document.body);
    // conteúdo montado depois (dados JSON, painéis) é traduzido ao entrar na página
    // (inclui texto colocado por JS num elemento que estava vazio)
    new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
      const el = n.nodeType === 1 ? n : n.nodeType === 3 ? n.parentElement : null;
      if (el && !(el.parentElement && el.parentElement.closest('[data-i18n], [data-split-done]'))) translateTree(el);
    }))).observe(document.body, { childList: true, subtree: true });
  }
  mountSwitcher();
}

/* ---------- ferramentas de desenvolvimento: lista os textos traduzíveis da página ---------- */
window.__i18nHash = (s) => hash(norm(s));
window.__i18nDump = () => {
  const out = {};
  const add = (s) => { const k = norm(s); if (k && hasLetters(k)) out[hash(k)] = k; };
  const visit = (el) => {
    if (el.matches(SKIP)) return;
    ATTRS.forEach((a) => { const v = el.getAttribute(a); if (v) add(v); });
    if (el.dataset && el.dataset.splitSrc) { add(el.dataset.splitSrc); return; } // título já dividido em palavras
    if (isLeaf(el) && hasLetters(el.textContent)) { add(el.children.length ? el.innerHTML : el.textContent); return; }
    [...el.childNodes].forEach((n) => { if (n.nodeType === 3) add(n.textContent); else if (n.nodeType === 1) visit(n); });
  };
  visit(document.body);
  add(document.title);
  const meta = document.querySelector('meta[name="description"]');
  if (meta) add(meta.content);
  return out;
};
