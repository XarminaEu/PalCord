const i18n = {
  de: require('../i18n/de'),
  en: require('../i18n/en'),
};

const DEFAULT_LANG = 'de';

function getLang(req) {
  if (req.cookies && req.cookies.lang) return req.cookies.lang;
  const accept = req.headers['accept-language'] || '';
  if (accept.startsWith('en')) return 'en';
  return DEFAULT_LANG;
}

function getTranslations(lang) {
  return i18n[lang] || i18n[DEFAULT_LANG];
}

function t(key, lang, replacements = {}) {
  const dict = getTranslations(lang);
  let text = dict[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
  }
  return text;
}

module.exports = {
  getLang,
  getTranslations,
  t,
  DEFAULT_LANG,
  supportedLanguages: Object.keys(i18n),
};
