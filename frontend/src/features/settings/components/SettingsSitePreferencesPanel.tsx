import { FaRotateLeft } from 'react-icons/fa6';
import type { SettingsChildKey, SettingsI18n } from '../settingsPage.types';
import styles from './styles/SettingsSitePreferencesPanel.module.css';

type SettingsSitePreferencesPanelProps = {
  activeChildId: SettingsChildKey;
  t: SettingsI18n;
  selectedLanguage: 'he' | 'en';
  setSelectedLanguage: (lang: 'he' | 'en') => void;
  selectedPrimaryColor: string;
  setSelectedPrimaryColor: (value: string) => void;
  selectedAccentColor: string;
  setSelectedAccentColor: (value: string) => void;
  selectedTextColor: string;
  setSelectedTextColor: (value: string) => void;
  selectedDarkMode: boolean;
  setSelectedDarkMode: (value: boolean) => void;
  onReset: () => void;
};

export function SettingsSitePreferencesPanel({
  activeChildId,
  t,
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
  onReset,
}: SettingsSitePreferencesPanelProps): JSX.Element | null {
  if (activeChildId === 'language') {
    return (
      <div className={`${styles.panelWide} ${styles.panelWideLanguage}`}>
        <button
          type="button"
          className={`${styles.choice} ${styles.choiceWide}${selectedLanguage === 'he' ? ` ${styles.choiceActive}` : ''}`}
          onClick={() => setSelectedLanguage('he')}
        >
          {t.languageOptions.he}
        </button>
        <button
          type="button"
          className={`${styles.choice} ${styles.choiceWide}${selectedLanguage === 'en' ? ` ${styles.choiceActive}` : ''}`}
          onClick={() => setSelectedLanguage('en')}
        >
          {t.languageOptions.en}
        </button>
      </div>
    );
  }

  if (activeChildId !== 'themeColor') {
    return null;
  }

  return (
    <div className={`${styles.panelWide} ${styles.panelWideTheme}`}>
      <div className={styles.colorBlock}>
        <label className={styles.colorLabel}>
          {t.primaryColorLabel}
        </label>
        <div className={styles.colorControl}>
          <input
            type="color"
            value={selectedPrimaryColor}
            onChange={(event) => setSelectedPrimaryColor(event.target.value)}
            aria-label={t.primaryColorLabel}
          />
          <code className={styles.colorValue}>{selectedPrimaryColor}</code>
        </div>
      </div>

      <div className={styles.colorBlock}>
        <label className={styles.colorLabel}>
          {t.accentColorLabel}
        </label>
        <div className={styles.colorControl}>
          <input
            type="color"
            value={selectedAccentColor}
            onChange={(event) => setSelectedAccentColor(event.target.value)}
            aria-label={t.accentColorLabel}
          />
          <code className={styles.colorValue}>{selectedAccentColor}</code>
        </div>
      </div>

      <div className={styles.colorBlock}>
        <label className={styles.colorLabel}>
          {t.textColorLabel}
        </label>
        <div className={styles.colorControl}>
          <input
            type="color"
            value={selectedTextColor}
            onChange={(event) => setSelectedTextColor(event.target.value)}
            aria-label={t.textColorLabel}
          />
          <code className={styles.colorValue}>{selectedTextColor}</code>
        </div>
      </div>

      <div className={`${styles.colorBlock} ${styles.colorBlockMode}`}>
        <label className={styles.colorLabel}>
          {t.darkModeLabel}
        </label>
        <div className={styles.choiceList}>
          <button
            type="button"
            className={`${styles.choice}${!selectedDarkMode ? ` ${styles.choiceActive}` : ''}`}
            onClick={() => setSelectedDarkMode(false)}
          >
            {t.darkModeOff}
          </button>
          <button
            type="button"
            className={`${styles.choice}${selectedDarkMode ? ` ${styles.choiceActive}` : ''}`}
            onClick={() => setSelectedDarkMode(true)}
          >
            {t.darkModeOn}
          </button>
        </div>
      </div>

      <div className={styles.resetRow}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
        >
          <FaRotateLeft />
          {t.reset}
        </button>
      </div>
    </div>
  );
}
