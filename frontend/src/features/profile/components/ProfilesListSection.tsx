import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import type { AuthUserListItem } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import { getProfileInitials } from '../utils/profilePage.utils';
import styles from './styles/ProfileFeature.module.css';

type ProfilesListSectionProps = {
  lang: ProfileLang;
  t: ProfileI18nLabels;
  content: { title: string; description: string };
  isLoadingProfilesList: boolean;
  profilesListError: string;
  filteredProfilesList: AuthUserListItem[];
  selectedManagedProfileId: number | null;
  canManageProfilesCurrentUser: boolean;
  formatDate: (value?: string) => string;
  showManagerDeleteDialog: boolean;
  setShowManagerDeleteDialog: (open: boolean) => void;
  onToggleSelectedProfile: (id: number) => void;
  onDeleteManagedProfile: () => void;
};

export function ProfilesListSection({
  lang,
  t,
  content,
  isLoadingProfilesList,
  profilesListError,
  filteredProfilesList,
  selectedManagedProfileId,
  canManageProfilesCurrentUser,
  formatDate,
  showManagerDeleteDialog,
  setShowManagerDeleteDialog,
  onToggleSelectedProfile,
  onDeleteManagedProfile,
}: ProfilesListSectionProps) {
  return (
    <section className={styles.profilesListHub}>
      <SettingsInnerTemplate
        info={<p className={styles.hubDescription}>{content.description}</p>}
        loadingMessage={isLoadingProfilesList ? t.profilesList.loading : null}
        errorMessage={profilesListError || null}
      >
        {!isLoadingProfilesList && !profilesListError && filteredProfilesList.length === 0 ? (
          <div className="shipments-empty-state">
            <h2 className="shipments-empty-title">{content.title}</h2>
            <p className="shipments-empty-desc">{t.profilesList.empty}</p>
          </div>
        ) : null}

        {!isLoadingProfilesList && !profilesListError && filteredProfilesList.length > 0 ? (
          <ManagementCardsGrid className={styles.profilesListGrid}>
            {filteredProfilesList.map((item) => {
              const initials = getProfileInitials(item.name, 'U');
              const isSelected = item.id === selectedManagedProfileId;

              return (
                <li key={item.id}>
                  <ManagementSelectableCard
                    className={styles.miniCard}
                    isSelected={isSelected}
                    badgeLabel={initials || 'U'}
                    onToggle={() => {
                      if (!canManageProfilesCurrentUser) {
                        return;
                      }

                      onToggleSelectedProfile(item.id);
                    }}
                    selector={
                      <span className={`${styles.miniCardAvatar}${isSelected ? ` ${styles.miniCardAvatarSelected}` : ''}`} aria-hidden="true">
                        {isSelected ? '✓' : initials || 'U'}
                      </span>
                    }
                    topContent={
                      <span className={styles.miniCardIdentity}>
                        <span className={styles.miniCardName}>{item.name}</span>
                        <span className={styles.miniCardId}>{`${t.profileCard.fields.id}: ${item.id}`}</span>
                      </span>
                    }
                    topAside={
                      typeof item.isActive === 'boolean' ? (
                        <span className={styles.hubStatus} data-active={item.isActive ? 'true' : 'false'}>
                          {item.isActive ? t.profileCard.active : t.profileCard.inactive}
                        </span>
                      ) : null
                    }
                    bottomContent={
                      <span className={styles.miniCardRows}>
                        {item.email ? (
                          <span className={styles.detailRow}>
                            <span className={styles.detailRowLabel}>{t.profileCard.fields.email}</span>
                            <strong className={styles.detailRowValue}>{item.email}</strong>
                          </span>
                        ) : null}
                        {item.phone ? (
                          <span className={styles.detailRow}>
                            <span className={styles.detailRowLabel}>{t.profileCard.fields.phone}</span>
                            <strong className={styles.detailRowValue}>{item.phone}</strong>
                          </span>
                        ) : null}
                        {item.role ? (
                          <span className={styles.detailRow}>
                            <span className={styles.detailRowLabel}>{t.profileCard.fields.role}</span>
                            <strong className={styles.detailRowValue}>{item.role}</strong>
                          </span>
                        ) : null}
                        {item.createdAt ? (
                          <span className={styles.detailRow}>
                            <span className={styles.detailRowLabel}>{t.profileCard.fields.createdAt}</span>
                            <strong className={styles.detailRowValue}>{formatDate(item.createdAt)}</strong>
                          </span>
                        ) : null}
                        {item.updatedAt ? (
                          <span className={styles.detailRow}>
                            <span className={styles.detailRowLabel}>{t.profileCard.fields.updatedAt}</span>
                            <strong className={styles.detailRowValue}>{formatDate(item.updatedAt)}</strong>
                          </span>
                        ) : null}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ManagementCardsGrid>
        ) : null}
      </SettingsInnerTemplate>

      <ConfirmDialog
        open={showManagerDeleteDialog}
        title={t.profilesList.deleteDialogTitle}
        message={t.profilesList.deleteDialogMessage}
        confirmLabel={t.profilesList.deleteDialogConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          setShowManagerDeleteDialog(false);
          onDeleteManagedProfile();
        }}
        onCancel={() => setShowManagerDeleteDialog(false)}
      />
    </section>
  );
}
