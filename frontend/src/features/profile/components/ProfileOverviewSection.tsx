import type { AuthProfile } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileRow } from '../profilePage.types';
import styles from './styles/ProfileFeature.module.css';

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
    <section className={styles.hub}>
      <div className={styles.hubHero}>
        <div className={styles.hubAvatar} aria-hidden="true">
          {profileInitials || 'U'}
        </div>
        <div className={styles.hubHeroContent}>
          <h2 className={styles.hubName}>{fullName}</h2>
          <p className={styles.hubSubtitle}>{profile?.role || t.profileCard.emptyValue}</p>
          <p className={styles.hubDescription}>{t.profileCard.description}</p>
        </div>
        <div className={styles.hubStatus} data-active={profile?.isActive ? 'true' : 'false'}>
          {profileStatus}
        </div>
      </div>

      {profileError ? <p className={styles.hubNotice}>{profileError}</p> : null}
      {isLoadingProfile ? <p className={styles.hubLoading}>{t.profileCard.loading}</p> : null}

      <div className={styles.hubGrid}>
        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t.profileCard.personalSectionTitle}</h3>
          <div className={styles.panelList}>
            {personalRows.map((row) => (
              <div key={row.label} className={styles.detailRow}>
                <span className={styles.detailRowLabel}>{row.label}</span>
                <strong className={styles.detailRowValue}>{row.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <h3 className={styles.panelTitle}>{t.profileCard.accountSectionTitle}</h3>
          <div className={styles.panelList}>
            {accountRows.map((row) => (
              <div key={row.label} className={styles.detailRow}>
                <span className={styles.detailRowLabel}>{row.label}</span>
                <strong className={styles.detailRowValue}>{row.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.panelSystem}`}>
          <h3 className={styles.panelTitle}>{t.profileCard.systemSectionTitle}</h3>
          <div className={styles.panelList}>
            {systemRows.map((row) => (
              <div key={row.label} className={styles.detailRow}>
                <span className={styles.detailRowLabel}>{row.label}</span>
                <strong className={styles.detailRowValue}>{row.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
