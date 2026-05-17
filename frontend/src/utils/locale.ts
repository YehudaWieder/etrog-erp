const RTL_LANG_PREFIXES = ['he', 'ar', 'fa', 'ur'];

export function getPreferredLanguage(defaultLang = 'he'): string {
  if (typeof window === 'undefined') {
    return defaultLang;
  }

  const storedLang = window.localStorage.getItem('app.language');
  if (storedLang && storedLang.trim()) {
    return storedLang;
  }

  return defaultLang;
}

export function directionFromLanguage(language: string): 'rtl' | 'ltr' {
  const normalized = language.toLowerCase();
  return RTL_LANG_PREFIXES.some((prefix) => normalized.startsWith(prefix))
    ? 'rtl'
    : 'ltr';
}
