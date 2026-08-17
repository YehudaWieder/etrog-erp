import type { AppModule } from '../../utils/activeModule';
import styles from './styles/ModuleSwitcher.module.css';

type ModuleSwitcherProps = {
  lang: 'he' | 'en';
  activeModule: AppModule;
  onChange: (module: AppModule) => void;
};

export function ModuleSwitcher({ lang, activeModule, onChange }: ModuleSwitcherProps) {
  const italyLabel = lang === 'he' ? 'איטליה' : 'Italy';
  const israelLabel = lang === 'he' ? 'א״י' : 'Israel';

  return (
    <div className={styles.switcher} role="group" aria-label={lang === 'he' ? 'החלפת מודול' : 'Switch module'}>
      <button
        type="button"
        className={`${styles.option} ${activeModule === 'italy' ? styles.optionActive : ''}`}
        onClick={() => onChange('italy')}
        aria-pressed={activeModule === 'italy'}
      >
        {italyLabel}
      </button>
      <button
        type="button"
        className={`${styles.option} ${activeModule === 'israel' ? styles.optionActive : ''}`}
        onClick={() => onChange('israel')}
        aria-pressed={activeModule === 'israel'}
      >
        {israelLabel}
      </button>
    </div>
  );
}
