let currentLang = 'de';
let translations = {};

async function loadLang() {
  const saved = document.cookie.split('; ').find(r => r.startsWith('lang='));
  const lang = saved ? saved.split('=')[1] : (navigator.language.startsWith('en') ? 'en' : 'de');
  const res = await fetch('/api/lang');
  const data = await res.json();
  currentLang = data.lang;
  translations = data.translations;
  document.documentElement.lang = currentLang;
  updateLangButtons();
  if (typeof window.applyStaticTranslations === 'function') {
    window.applyStaticTranslations();
  }
}

function T(key, replacements = {}) {
  let text = translations[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
  }
  return text;
}

async function setLang(lang) {
  await fetch('/api/lang', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang })
  });
  await loadLang();
  renderContent();
  if (document.getElementById('guild-list')) loadGuilds();
}

function updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === currentLang);
  });
}

window.addEventListener('DOMContentLoaded', loadLang);
