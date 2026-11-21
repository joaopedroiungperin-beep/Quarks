/* Formulários: validação, máscara de telefone, contador e envio via Web3Forms
   (com WhatsApp como canal direto e como alternativa quando não há chave). */

import { $, $$, h } from './core.js';
import { CONFIG } from './config.js';
import { t } from './i18n.js';

const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
};

const LABELS = { nome: 'Nome', email: 'E-mail', telefone: 'Telefone', lattes: 'Currículo Lattes', motivacao: 'Motivações', mensagem: 'Mensagem', link_compartilhado: 'Link compartilhado' };

const EXT = /\.(pdf|docx?|odt|rtf|txt|xlsx?|ods|csv|pptx?|odp|xml|json|png|jpe?g|webp|gif|heic|zip)$/i;
const fmtSize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

/* Anexos: até CONFIG.FILES.max arquivos, com limite por arquivo e no total.
   Qualquer recusa (quantidade, tamanho ou formato) revela o campo de link compartilhado. */
function initFiles(form) {
  const box = $('[data-files]', form);
  if (!box) return null;
  const input = $('.drop__input', box), drop = $('.drop', box), list = $('.files', box), err = $('.files__err', box);
  const linkRow = $('[data-link-row]', form);
  const { max, maxSize, maxTotal } = CONFIG.FILES;
  const mb = (b) => String(Math.round(b / 1024 / 1024));
  let files = [];

  const fail = (msgs) => {
    err.textContent = [...msgs, t('Para arquivos maiores, mais arquivos ou outros formatos, envie um link compartilhado.')].join(' ');
    err.hidden = false;
    linkRow.hidden = false;
  };
  const render = () => {
    list.replaceChildren(...files.map((f, i) => h('li', {},
      h('span', { class: 'files__name', title: f.name }, f.name),
      h('span', { class: 'files__size' }, fmtSize(f.size)),
      h('button', { type: 'button', 'aria-label': t('Remover {name}', { name: f.name }), onclick: () => { files.splice(i, 1); render(); input.focus(); } }, '×'))));
  };
  const add = (picked) => {
    const msgs = [];
    let total = files.reduce((n, f) => n + f.size, 0);
    for (const f of picked) {
      if (!EXT.test(f.name)) msgs.push(t('{name}: formato não suportado.', { name: f.name }));
      else if (f.size > maxSize) msgs.push(t('{name}: passa de {mb} MB.', { name: f.name, mb: mb(maxSize) }));
      else if (files.length >= max) { msgs.push(t('O limite é de {n} arquivos.', { n: max })); break; }
      else if (total + f.size > maxTotal) msgs.push(t('{name}: o total passaria de {mb} MB.', { name: f.name, mb: mb(maxTotal) }));
      else if (!files.some((g) => g.name === f.name && g.size === f.size)) { files.push(f); total += f.size; }
    }
    err.hidden = true;
    if (msgs.length) fail(msgs);
    render();
  };

  input.addEventListener('change', () => { add([...input.files]); input.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); add([...e.dataTransfer.files]); });

  return {
    get list() { return files; },
    reset() { files = []; render(); err.hidden = true; },
    // sem envio de arquivos disponível (WhatsApp): pede o link no lugar dos anexos
    unsupported() { fail([t('Pelo WhatsApp não conseguimos receber anexos.')]); $('#c-link', form)?.focus(); },
  };
}

const waLink = (text) => `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(text)}`;

export function initForms() {
  $$('[data-phone]').forEach((input) => input.addEventListener('input', () => { input.value = maskPhone(input.value); }));

  $$('textarea[data-counter]').forEach((ta) => {
    const out = ta.parentElement.querySelector('.counter');
    const max = ta.maxLength;
    const upd = () => { out.textContent = `${ta.value.length}/${max}`; };
    ta.addEventListener('input', upd); upd();
  });

  $$('[data-whatsapp]').forEach((a) => { a.href = waLink(a.dataset.whatsapp); });

  $$('form.form').forEach((form) => {
    const status = $('.form__status', form);
    const btn = $('button[type="submit"]', form);
    const attach = initFiles(form);

    form.addEventListener('input', (e) => e.target.classList?.remove('is-invalid'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form__status';
      const invalid = $$('input, textarea', form).filter((el) => !el.classList.contains('hp') && !el.checkValidity());
      invalid.forEach((el) => el.classList.add('is-invalid'));
      if (invalid.length) {
        status.textContent = t('Confira os campos destacados.');
        status.classList.add('err');
        invalid[0].focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      if (data.botcheck) return; // robô
      delete data.botcheck;
      const subject = form.dataset.subject;

      // sem chave configurada: envia pelo WhatsApp com tudo preenchido
      if (!CONFIG.WEB3FORMS_KEY) {
        if (attach?.list.length && !data.link_compartilhado) { attach.unsupported(); return; }
        const text = [subject, '', ...Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${LABELS[k] || k}: ${v}`)].join('\n');
        window.open(waLink(text), '_blank', 'noopener');
        status.textContent = t('Abrimos o WhatsApp com sua mensagem pronta. É só enviar.');
        status.classList.add('ok');
        return;
      }

      btn.disabled = true;
      status.textContent = t('Enviando…');
      try {
        const fields = { access_key: CONFIG.WEB3FORMS_KEY, subject, from_name: 'Site Quarks', replyto: data.email, ...data };
        let body = JSON.stringify(fields);
        const headers = { Accept: 'application/json' };
        if (attach?.list.length) { // multipart: o navegador define o Content-Type com o boundary
          body = new FormData();
          Object.entries(fields).forEach(([k, v]) => body.append(k, v));
          attach.list.forEach((f) => body.append('attachment', f, f.name));
        } else headers['Content-Type'] = 'application/json';
        const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers, body });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Falha no envio');
        form.reset();
        attach?.reset();
        $$('.counter', form).forEach((c) => { c.textContent = c.textContent.replace(/^\d+/, '0'); });
        status.textContent = t('Recebemos sua mensagem. Obrigado! Responderemos em breve.');
        status.classList.add('ok');
      } catch (err) {
        status.innerHTML = '';
        status.append(t('Não foi possível enviar agora.') + ' ');
        const a = document.createElement('a');
        a.href = `mailto:${CONFIG.EMAIL}?subject=${encodeURIComponent(subject)}`;
        a.textContent = t('Escreva para nosso e-mail');
        status.append(a, ' ' + t('ou use o WhatsApp.'));
        status.classList.add('err');
      } finally {
        btn.disabled = false;
      }
    });
  });
}
