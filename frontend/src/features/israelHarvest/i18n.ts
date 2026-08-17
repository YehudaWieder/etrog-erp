import type { SidebarSection } from '../../types/navigation';
import { ISRAEL_HARVEST_I18N_EN } from './i18n.en';
import { ISRAEL_HARVEST_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type IsraelHarvestI18n = {
  pageTitle: string;
  settings: string;
  sidebar: SidebarSection[];
  emptyState: Record<string, EmptyStateContent> & { default: EmptyStateContent };
};

export const ISRAEL_HARVEST_I18N: Record<'he' | 'en', IsraelHarvestI18n> = {
  he: ISRAEL_HARVEST_I18N_HE,
  en: ISRAEL_HARVEST_I18N_EN,
};
