import { useEffect, useState } from 'react';
import { getSettingsI18n } from '../i18n';
import type { Lang } from '../settingsPage.types';

const DEFAULT_PRIMARY_COLOR = '#ffca2b';
const DEFAULT_ACCENT_COLOR = '#2d5a27';
const DEFAULT_TEXT_COLOR = '#333333';

export function useSettingsPreferences() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored === 'en' || stored === 'he') {
        return stored;
      }
    }
    return 'he';
  });

  const [selectedLanguage, setSelectedLanguage] = useState<Lang>(lang);
  const [selectedPrimaryColor, setSelectedPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR);
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>(DEFAULT_ACCENT_COLOR);
  const [selectedTextColor, setSelectedTextColor] = useState<string>(DEFAULT_TEXT_COLOR);
  const [selectedDarkMode, setSelectedDarkMode] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedPrimary = window.localStorage.getItem('app.primaryColor');
    const storedAccent = window.localStorage.getItem('app.accentColor');
    const storedTextColor = window.localStorage.getItem('app.textColor');
    const storedDarkMode = window.localStorage.getItem('app.darkMode');

    if (storedPrimary) {
      setSelectedPrimaryColor(storedPrimary);
      document.documentElement.style.setProperty('--color-primary', storedPrimary);
    }
    if (storedAccent) {
      setSelectedAccentColor(storedAccent);
      document.documentElement.style.setProperty('--color-text-accent', storedAccent);
    }
    if (storedTextColor) {
      setSelectedTextColor(storedTextColor);
      document.documentElement.style.setProperty('--color-text-main', storedTextColor);
    }
    if (storedDarkMode !== null) {
      const isDarkMode = storedDarkMode === 'true';
      setSelectedDarkMode(isDarkMode);
      document.documentElement.setAttribute('data-dark-mode', isDarkMode ? 'true' : 'false');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', selectedPrimaryColor);
      document.documentElement.style.setProperty('--color-text-accent', selectedAccentColor);
      document.documentElement.style.setProperty('--color-text-main', selectedTextColor);
      document.documentElement.setAttribute('data-dark-mode', selectedDarkMode ? 'true' : 'false');
    }
  }, [selectedPrimaryColor, selectedAccentColor, selectedTextColor, selectedDarkMode]);

  const handleUpdateSettings = () => {
    const nextLanguage = selectedLanguage;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app.language', nextLanguage);
      window.localStorage.setItem('app.primaryColor', selectedPrimaryColor);
      window.localStorage.setItem('app.accentColor', selectedAccentColor);
      window.localStorage.setItem('app.textColor', selectedTextColor);
      window.localStorage.setItem('app.darkMode', String(selectedDarkMode));
    }

    setLang(nextLanguage);
    setSaveFeedback(getSettingsI18n(nextLanguage).saved);

    // Reload to ensure all modules in the app consume persisted settings consistently.
    window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 500);
  };

  const handleReset = () => {
    setSelectedPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setSelectedAccentColor(DEFAULT_ACCENT_COLOR);
    setSelectedTextColor(DEFAULT_TEXT_COLOR);
    setSelectedDarkMode(false);
  };

  return {
    lang,
    setLang,
    selectedLanguage,
    setSelectedLanguage,
    selectedPrimaryColor,
    setSelectedPrimaryColor,
    selectedAccentColor,
    setSelectedAccentColor,
    selectedTextColor,
    setSelectedTextColor,
    selectedDarkMode,
    setSelectedDarkMode,
    saveFeedback,
    handleUpdateSettings,
    handleReset,
  };
}
