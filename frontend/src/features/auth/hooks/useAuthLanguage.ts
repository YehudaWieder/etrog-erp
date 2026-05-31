import { useMemo } from 'react';

type AuthLang = 'he' | 'en';

export function useAuthLanguage(): AuthLang {
  return useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) {
        return stored;
      }
    }

    return 'he';
  }, []);
}
