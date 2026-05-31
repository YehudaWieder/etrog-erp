import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import type { AuthUserListItem } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import { getProfileInitials } from '../utils/profilePage.utils';

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
    <section className="profiles-list-hub">
      <SettingsInnerTemplate
        info={<p className="profile-hub__description">{content.description}</p>}
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
          <ManagementCardsGrid className="profiles-list-grid">
            {filteredProfilesList.map((item) => {
              const initials = getProfileInitials(item.name, 'U');
              const isSelected = item.id === selectedManagedProfileId;

              return (
                <li key={item.id}>
                  <ManagementSelectableCard
                    className="profile-mini-card"
                    isSelected={isSelected}
                    badgeLabel={initials || 'U'}
                    onToggle={() => {
                      if (!canManageProfilesCurrentUser) {
                        return;
                      }

                      onToggleSelectedProfile(item.id);
                    }}
                    selector={
                      <span className={`profile-mini-card__avatar${isSelected ? ' is-selected' : ''}`} aria-hidden="true">
                        {isSelected ? '✓' : initials || 'U'}
                      </span>
                    }
                    topContent={
                      <span className="profile-mini-card__identity">
                        <span className="profile-mini-card__name">{item.name}</span>
                        <span className="profile-mini-card__id">{`${t.profileCard.fields.id}: ${item.id}`}</span>
                      </span>
                    }
                    topAside={
                      typeof item.isActive === 'boolean' ? (
                        <span className="profile-hub__status" data-active={item.isActive ? 'true' : 'false'}>
                          {item.isActive ? t.profileCard.active : t.profileCard.inactive}
                        </span>
                      ) : null
                    }
                    bottomContent={
                      <span className="profile-mini-card__rows">
                        {item.email ? (
                          <span className="profile-detail-row">
                            <span className="profile-detail-row__label">{t.profileCard.fields.email}</span>
                            <strong className="profile-detail-row__value">{item.email}</strong>
                          </span>
                        ) : null}
                        {item.phone ? (
                          <span className="profile-detail-row">
                            <span className="profile-detail-row__label">{t.profileCard.fields.phone}</span>
                            <strong className="profile-detail-row__value">{item.phone}</strong>
                          </span>
                        ) : null}
                        {item.role ? (
                          <span className="profile-detail-row">
                            <span className="profile-detail-row__label">{t.profileCard.fields.role}</span>
                            <strong className="profile-detail-row__value">{item.role}</strong>
                          </span>
                        ) : null}
                        {item.createdAt ? (
                          <span className="profile-detail-row">
                            <span className="profile-detail-row__label">{t.profileCard.fields.createdAt}</span>
                            <strong className="profile-detail-row__value">{formatDate(item.createdAt)}</strong>
                          </span>
                        ) : null}
                        {item.updatedAt ? (
                          <span className="profile-detail-row">
                            <span className="profile-detail-row__label">{t.profileCard.fields.updatedAt}</span>
                            <strong className="profile-detail-row__value">{formatDate(item.updatedAt)}</strong>
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
        title={lang === 'he' ? 'מחיקת פרופיל' : 'Delete Profile'}
        message={lang === 'he' ? 'האם למחוק את הפרופיל שנבחר? פעולה זו אינה הפיכה.' : 'Delete the selected profile? This action cannot be undone.'}
        confirmLabel={lang === 'he' ? 'מחיקה' : 'Delete'}
        cancelLabel={lang === 'he' ? 'ביטול' : 'Cancel'}
        onConfirm={() => {
          setShowManagerDeleteDialog(false);
          onDeleteManagedProfile();
        }}
        onCancel={() => setShowManagerDeleteDialog(false)}
      />
    </section>
  );
}
