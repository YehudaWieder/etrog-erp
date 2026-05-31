import { FaRotateLeft } from 'react-icons/fa6';
import type { SettingsChildKey, SettingsI18n } from '../settingsPage.types';

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
      <div className="settings-panel-wide settings-panel-wide--language">
        <button
          type="button"
          className={`settings-choice settings-choice--wide${selectedLanguage === 'he' ? ' is-active' : ''}`}
          onClick={() => setSelectedLanguage('he')}
        >
          {t.languageOptions.he}
        </button>
        <button
          type="button"
          className={`settings-choice settings-choice--wide${selectedLanguage === 'en' ? ' is-active' : ''}`}
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
    <div className="settings-panel-wide settings-panel-wide--theme">
      <div className="settings-color-block">
        <label className="settings-color-label">
          {t.primaryColorLabel}
        </label>
        <div className="settings-color-control">
          <input
            type="color"
            value={selectedPrimaryColor}
            onChange={(event) => setSelectedPrimaryColor(event.target.value)}
            aria-label={t.primaryColorLabel}
          />
          <code className="settings-color-value">{selectedPrimaryColor}</code>
        </div>
      </div>

      <div className="settings-color-block">
        <label className="settings-color-label">
          {t.accentColorLabel}
        </label>
        <div className="settings-color-control">
          <input
            type="color"
            value={selectedAccentColor}
            onChange={(event) => setSelectedAccentColor(event.target.value)}
            aria-label={t.accentColorLabel}
          />
          <code className="settings-color-value">{selectedAccentColor}</code>
        </div>
      </div>

      <div className="settings-color-block">
        <label className="settings-color-label">
          {t.textColorLabel}
        </label>
        <div className="settings-color-control">
          <input
            type="color"
            value={selectedTextColor}
            onChange={(event) => setSelectedTextColor(event.target.value)}
            aria-label={t.textColorLabel}
          />
          <code className="settings-color-value">{selectedTextColor}</code>
        </div>
      </div>

      <div className="settings-color-block settings-color-block--mode">
        <label className="settings-color-label">
          {t.darkModeLabel}
        </label>
        <div className="settings-choice-list">
          <button
            type="button"
            className={`settings-choice${!selectedDarkMode ? ' is-active' : ''}`}
            onClick={() => setSelectedDarkMode(false)}
          >
            {t.darkModeOff}
          </button>
          <button
            type="button"
            className={`settings-choice${selectedDarkMode ? ' is-active' : ''}`}
            onClick={() => setSelectedDarkMode(true)}
          >
            {t.darkModeOn}
          </button>
        </div>
      </div>

      <div className="settings-reset-row">
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
