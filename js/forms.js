/* Formulários: validação, máscara de telefone, contador e envio via Web3Forms
   (com WhatsApp como canal direto e como alternativa quando não há chave). */

import { $, $$ } from './core.js';
import { CONFIG } from './config.js';

const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
};

const LABELS = { nome: 'Nome', email: 'E-mail', telefone: 'Telefone', lattes: 'Currículo Lattes', motivacao: 'Motivações', mensagem: 'Mensagem', link_compartilhado: 'Link compartilhado' };

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

    form.addEventListener('input', (e) => e.target.classList?.remove('is-invalid'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form__status';
      const invalid = $$('input, textarea', form).filter((el) => !el.classList.contains('hp') && !el.checkValidity());
      invalid.forEach((el) => el.classList.add('is-invalid'));
      if (invalid.length) {
        status.textContent = 'Confira os campos destacados.';
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
        const text = [subject, '', ...Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${LABELS[k] || k}: ${v}`)].join('\n');
        window.open(waLink(text), '_blank', 'noopener');
        status.textContent = 'Abrimos o WhatsApp com sua mensagem pronta — é só enviar.';
        status.classList.add('ok');
        return;
      }

      btn.disabled = true;
      status.textContent = 'Enviando…';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: CONFIG.WEB3FORMS_KEY, subject, from_name: 'Site Quarks', replyto: data.email, ...data }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Falha no envio');
        form.reset();
        $$('.counter', form).forEach((c) => { c.textContent = c.textContent.replace(/^\d+/, '0'); });
        status.textContent = 'Recebemos sua mensagem. Obrigado! Responderemos em breve.';
        status.classList.add('ok');
      } catch (err) {
        status.innerHTML = '';
        status.append('Não foi possível enviar agora. ');
        const a = document.createElement('a');
        a.href = `mailto:${CONFIG.EMAIL}?subject=${encodeURIComponent(subject)}`;
        a.textContent = 'Escreva para nosso e-mail';
        status.append(a, ' ou use o WhatsApp.');
        status.classList.add('err');
      } finally {
        btn.disabled = false;
      }
    });
  });
}
