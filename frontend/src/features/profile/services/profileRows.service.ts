import type { ProfileI18nLabels, ProfileIdentity, ProfileRow, ProfileRowsSections } from '../profilePage.types';
import { formatProfileDate } from '../utils/profilePage.utils';

export function buildProfileRows(profile: ProfileIdentity | null, t: ProfileI18nLabels, locale: string): ProfileRow[] {
  if (!profile) {
    return [];
  }

  return [
    { label: t.profileCard.fields.id, value: String(profile.id) },
    { label: t.profileCard.fields.name, value: profile.name },
    { label: t.profileCard.fields.email, value: profile.email },
    { label: t.profileCard.fields.phone, value: profile.phone || t.profileCard.emptyValue },
    { label: t.profileCard.fields.role, value: profile.role },
    { label: t.profileCard.fields.status, value: profile.isActive ? t.profileCard.active : t.profileCard.inactive },
    { label: t.profileCard.fields.slug, value: profile.slug || t.profileCard.emptyValue },
    { label: t.profileCard.fields.createdAt, value: formatProfileDate(profile.createdAt, locale, t.profileCard.emptyValue) },
    { label: t.profileCard.fields.updatedAt, value: formatProfileDate(profile.updatedAt, locale, t.profileCard.emptyValue) },
  ];
}

export function splitProfileRows(rows: ProfileRow[], t: ProfileI18nLabels): ProfileRowsSections {
  const personalRows = rows.filter((row) => [t.profileCard.fields.name, t.profileCard.fields.email, t.profileCard.fields.phone].includes(row.label));
  const accountRows = rows.filter((row) =>
    [t.profileCard.fields.id, t.profileCard.fields.role, t.profileCard.fields.status, t.profileCard.fields.slug].includes(row.label),
  );
  const systemRows = rows.filter((row) => [t.profileCard.fields.createdAt, t.profileCard.fields.updatedAt].includes(row.label));

  return {
    personalRows,
    accountRows,
    systemRows,
  };
}
