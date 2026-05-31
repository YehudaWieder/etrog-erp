import type { AuthProfile } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileRow } from '../profilePage.types';

type ProfileOverviewSectionProps = {
  profile: AuthProfile | null;
  profileInitials: string;
  fullName: string;
  profileStatus: string;
  profileError: string;
  isLoadingProfile: boolean;
  t: ProfileI18nLabels;
  personalRows: ProfileRow[];
  accountRows: ProfileRow[];
  systemRows: ProfileRow[];
};

export function ProfileOverviewSection({
  profile,
  profileInitials,
  fullName,
  profileStatus,
  profileError,
  isLoadingProfile,
  t,
  personalRows,
  accountRows,
  systemRows,
}: ProfileOverviewSectionProps) {
  return (
    <section className="profile-hub">
      <div className="profile-hub__hero">
        <div className="profile-hub__avatar" aria-hidden="true">
          {profileInitials || 'U'}
        </div>
        <div className="profile-hub__hero-content">
          <h2 className="profile-hub__name">{fullName}</h2>
          <p className="profile-hub__subtitle">{profile?.role || t.profileCard.emptyValue}</p>
          <p className="profile-hub__description">{t.profileCard.description}</p>
        </div>
        <div className="profile-hub__status" data-active={profile?.isActive ? 'true' : 'false'}>
          {profileStatus}
        </div>
      </div>

      {profileError ? <p className="profile-hub__notice">{profileError}</p> : null}
      {isLoadingProfile ? <p className="profile-hub__loading">{t.profileCard.loading}</p> : null}

      <div className="profile-hub__grid">
        <article className="profile-panel">
          <h3 className="profile-panel__title">{t.profileCard.personalSectionTitle}</h3>
          <div className="profile-panel__list">
            {personalRows.map((row) => (
              <div key={row.label} className="profile-detail-row">
                <span className="profile-detail-row__label">{row.label}</span>
                <strong className="profile-detail-row__value">{row.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-panel">
          <h3 className="profile-panel__title">{t.profileCard.accountSectionTitle}</h3>
          <div className="profile-panel__list">
            {accountRows.map((row) => (
              <div key={row.label} className="profile-detail-row">
                <span className="profile-detail-row__label">{row.label}</span>
                <strong className="profile-detail-row__value">{row.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-panel profile-panel--system">
          <h3 className="profile-panel__title">{t.profileCard.systemSectionTitle}</h3>
          <div className="profile-panel__list">
            {systemRows.map((row) => (
              <div key={row.label} className="profile-detail-row">
                <span className="profile-detail-row__label">{row.label}</span>
                <strong className="profile-detail-row__value">{row.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
