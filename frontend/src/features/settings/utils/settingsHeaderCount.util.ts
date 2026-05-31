import type { SettingsChildKey } from '../settingsPage.types';

type HeaderStateWithCount = {
  count: number;
};

type HeaderCountByChild = Partial<Record<SettingsChildKey, HeaderStateWithCount | null>>;

export function resolveSettingsPageTitle(
  baseTitle: string,
  activeChildId: SettingsChildKey,
  headerCountByChild: HeaderCountByChild,
): string {
  const activeHeaderState = headerCountByChild[activeChildId];

  if (!activeHeaderState) {
    return baseTitle;
  }

  return `${baseTitle} (${activeHeaderState.count})`;
}