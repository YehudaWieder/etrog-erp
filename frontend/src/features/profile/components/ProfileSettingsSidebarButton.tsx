import { SettingsIcon } from '../../../components/ui/SettingsIcon';
import type { ProfileLang } from '../profilePage.types';

type ProfileSettingsSidebarButtonProps = {
  lang: ProfileLang;
  label: string;
  onClick: () => void;
};

export function ProfileSettingsSidebarButton({ lang, label, onClick }: ProfileSettingsSidebarButtonProps) {
  return (
    <button
      type="button"
      className="app-shell__sidebar-item app-shell__sidebar-settings"
      onClick={onClick}
    >
      {lang === 'he' ? (
        <>
          {label}
          <SettingsIcon style={{ marginInlineStart: 8 }} />
        </>
      ) : (
        <>
          <SettingsIcon style={{ marginInlineEnd: 8 }} />
          {label}
        </>
      )}
    </button>
  );
}
