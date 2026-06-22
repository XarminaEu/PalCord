const translations = {
  de: require('./de'),
  en: require('./en'),
};

const DEFAULT_LANG = 'de';

function t(key, lang = DEFAULT_LANG, replacements = {}) {
  const dict = translations[lang] || translations[DEFAULT_LANG];
  let text = dict[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
  }
  return text;
}

function supportedLanguages() {
  return Object.keys(translations);
}

module.exports = {
  t,
  supportedLanguages,
  DEFAULT_LANG,
};
