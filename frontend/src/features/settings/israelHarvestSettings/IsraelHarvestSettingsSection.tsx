import { useLocation } from 'react-router-dom';
import { getIsraelHarvestSettingsChildId, getIsraelHarvestSettingsTitle } from './israelHarvestSettings.i18n';

type IsraelHarvestSettingsSectionProps = {
  lang: 'he' | 'en';
};

export function IsraelHarvestSettingsSection({ lang }: IsraelHarvestSettingsSectionProps) {
  const location = useLocation();
  const childId = getIsraelHarvestSettingsChildId(location.pathname);
  const title = getIsraelHarvestSettingsTitle(lang, childId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
      <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{title}</span>
      <span style={{ fontSize: '4rem', fontWeight: 'bold' }}>{lang === 'he' ? 'בקרוב...' : 'Coming soon...'}</span>
    </div>
  );
}
