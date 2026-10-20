/* =========================================================
   BLACK DA REFORMA VITALÍCIA — Configuração e interações
   ========================================================= */

/* ---------------------------------------------------------
   PONTO DE CONFIGURAÇÃO — preencha antes de publicar.
   Nada aqui é inventado: enquanto `endpoint` estiver vazio,
   o formulário valida os dados mas NÃO simula inscrição.
   --------------------------------------------------------- */
const CONFIG = {
  // Data da revelação: 09/11/2026 às 20h00, horário de Brasília (UTC−03:00)
  revealAt: '2026-11-09T20:00:00-03:00',

  // URL do serviço de captação (webhook, API da ferramenta de e-mail, CRM, etc.)
  endpoint: '',

  // Método e cabeçalhos da requisição. Ex.: { Authorization: 'Bearer SEU_TOKEN' }
  // Atenção: credenciais aqui ficam públicas no navegador. Prefira um webhook
  // ou um endpoint intermediário (serverless) que guarde o token no servidor.
  method: 'POST',
  headers: {},

  // 'json' envia application/json | 'form' envia application/x-www-form-urlencoded
  payloadFormat: 'json',

  // Nomes dos campos esperados pelo serviço
  fieldNames: { email: 'email', whatsapp: 'whatsapp', consent: 'consent' },

  // Link oficial do grupo exclusivo do WhatsApp (redireciona após o cadastro confirmado)
  whatsappGroupUrl: '',
  redirectDelayMs: 1800,

  // Consentimento LGPD
  consent: {
    enabled: true,
    required: true,
    text: 'Autorizo o uso dos meus dados para receber comunicações sobre a Black da Reforma.',
    privacyUrl: '', // URL da Política de Privacidade — o link só aparece se preenchido
    privacyLabel: 'Política de Privacidade',
  },

  // Campos extras enviados junto ao lead
  extra: { source: 'black-da-reforma-vitalicia' },
};

(function () {
  'use strict';

  /* -------------------------------------------------------
     Contagem regressiva
     ------------------------------------------------------- */
  const target = new Date(CONFIG.revealAt).getTime();
  const units = {
    days: document.querySelector('[data-unit="days"]'),
    hours: document.querySelector('[data-unit="hours"]'),
    minutes: document.querySelector('[data-unit="minutes"]'),
    seconds: document.querySelector('[data-unit="seconds"]'),
  };
  const countdownEl = document.querySelector('[data-countdown]');
  const doneEl = document.querySelector('[data-countdown-done]');
  const pad = (n) => String(n).padStart(2, '0');
  let timer = null;

  function tick() {
    const diff = target - Date.now();
    if (!Number.isFinite(diff) || diff <= 0) {
      countdownEl.hidden = true;
      doneEl.hidden = false;
      if (timer) clearInterval(timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    units.days.textContent = pad(Math.floor(s / 86400));
    units.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    units.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    units.seconds.textContent = pad(s % 60);
  }
  tick();
  timer = setInterval(tick, 1000);

  /* -------------------------------------------------------
     Foto do especialista — fallback se o asset não existir
     ------------------------------------------------------- */
  const visual = document.querySelector('.hero__visual');
  const photo = document.querySelector('.expert__img');
  if (photo) {
    const markMissing = () => visual.classList.add('is-missing');
    if (photo.complete && photo.naturalWidth === 0) markMissing();
    photo.addEventListener('error', markMissing, { once: true });
  }

  /* -------------------------------------------------------
     Formulário
     ------------------------------------------------------- */
  const form = document.getElementById('lead-form');
  const email = document.getElementById('email');
  const phone = document.getElementById('whatsapp');
  const consentWrap = document.querySelector('[data-consent]');
  const consentBox = document.getElementById('consent');
  const consentLabel = document.querySelector('[data-consent-label]');
  const honeypot = document.getElementById('website');
  const button = form.querySelector('.btn');
  const status = form.querySelector('[data-status]');

  // Consentimento
  if (CONFIG.consent.enabled) {
    consentWrap.hidden = false;
    consentLabel.textContent = CONFIG.consent.text + ' ';
    if (CONFIG.consent.privacyUrl) {
      const a = document.createElement('a');
      a.href = CONFIG.consent.privacyUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = CONFIG.consent.privacyLabel;
      consentLabel.appendChild(a);
      consentLabel.appendChild(document.createTextNode('.'));
    }
  }

  // Máscara de telefone brasileiro: (11) 91234-5678 ou (11) 1234-5678
  const digits = (v) => v.replace(/\D/g, '');
  function formatPhone(v) {
    let d = digits(v);
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  phone.addEventListener('input', () => {
    const end = phone.selectionEnd === phone.value.length;
    phone.value = formatPhone(phone.value);
    if (end) phone.setSelectionRange(phone.value.length, phone.value.length);
    if (phone.closest('.field').classList.contains('is-invalid')) validatePhone();
  });

  // Validações
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  function setError(input, msg) {
    const field = input.closest('.field') || input.closest('.consent');
    const err = document.getElementById(input.id + '-error');
    field.classList.toggle('is-invalid', !!msg);
    field.classList.toggle('is-valid', !msg && input.type !== 'checkbox');
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.textContent = msg || '';
    return !msg;
  }
  function validateEmail() {
    const v = email.value.trim();
    if (!v) return setError(email, 'Informe seu e-mail.');
    if (!EMAIL_RE.test(v)) return setError(email, 'Digite um e-mail válido.');
    return setError(email, '');
  }
  function validatePhone() {
    const d = digits(phone.value);
    if (!d) return setError(phone, 'Informe seu WhatsApp com DDD.');
    const ddd = Number(d.slice(0, 2));
    const valid =
      ddd >= 11 && ddd <= 99 &&
      ((d.length === 11 && d[2] === '9') || (d.length === 10 && /[2-5]/.test(d[2])));
    if (!valid) return setError(phone, 'Digite um número válido com DDD.');
    return setError(phone, '');
  }
  function validateConsent() {
    if (!CONFIG.consent.enabled || !CONFIG.consent.required) return true;
    return setError(consentBox, consentBox.checked ? '' : 'É necessário aceitar para continuar.');
  }

  email.addEventListener('blur', () => { if (email.value) validateEmail(); });
  email.addEventListener('input', () => { if (email.closest('.field').classList.contains('is-invalid')) validateEmail(); });
  phone.addEventListener('blur', () => { if (phone.value) validatePhone(); });
  consentBox.addEventListener('change', validateConsent);

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = 'form__status' + (type ? ' is-' + type : '');
  }

  function utmParams() {
    const out = {};
    const q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
      if (q.get(k)) out[k] = q.get(k);
    });
    return out;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', '');

    const ok = [validateEmail(), validatePhone(), validateConsent()];
    if (ok.includes(false)) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    if (honeypot.value) return; // bot

    if (!CONFIG.endpoint) {
      setStatus('Inscrições ainda não estão disponíveis. Tente novamente em instantes.', 'info');
      console.warn('[Black da Reforma] CONFIG.endpoint não configurado em script.js — nenhum dado foi enviado.');
      return;
    }

    const f = CONFIG.fieldNames;
    const data = Object.assign({}, CONFIG.extra, utmParams(), {
      [f.email]: email.value.trim().toLowerCase(),
      [f.whatsapp]: '55' + digits(phone.value),
      page_url: location.href,
      submitted_at: new Date().toISOString(),
    });
    if (CONFIG.consent.enabled) data[f.consent] = consentBox.checked;

    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');

    try {
      const isJson = CONFIG.payloadFormat === 'json';
      const res = await fetch(CONFIG.endpoint, {
        method: CONFIG.method,
        headers: Object.assign(
          { 'Content-Type': isJson ? 'application/json' : 'application/x-www-form-urlencoded' },
          CONFIG.headers
        ),
        body: isJson ? JSON.stringify(data) : new URLSearchParams(data).toString(),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      form.classList.add('is-done');
      if (CONFIG.whatsappGroupUrl) {
        setStatus('Cadastro confirmado! Redirecionando para o grupo exclusivo do WhatsApp…', 'success');
        setTimeout(() => { location.href = CONFIG.whatsappGroupUrl; }, CONFIG.redirectDelayMs);
      } else {
        setStatus('Cadastro confirmado! Em breve você receberá todos os detalhes da Black da Reforma.', 'success');
      }
    } catch (err) {
      setStatus('Não foi possível concluir seu cadastro agora. Verifique sua conexão e tente novamente.', 'error');
    } finally {
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
    }
  });
})();
