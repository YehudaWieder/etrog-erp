import { FaFloppyDisk, FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import type { AuthUserListItem } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import styles from './styles/ProfileFeature.module.css';

type ManagedProfileEditModalProps = {
  lang: ProfileLang;
  t: ProfileI18nLabels;
  isOpen: boolean;
  selectedManagedProfile: AuthUserListItem | null;
  selectedManagedProfileId: number | null;
  managedRole: string;
  managedIsActive: boolean;
  managedEditMessage: string;
  managedEditError: string;
  isUpdatingManagedProfile: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onRoleChange: (role: string) => void;
  onStatusChange: (isActive: boolean) => void;
};

export function ManagedProfileEditModal({
  lang,
  t,
  isOpen,
  selectedManagedProfile,
  selectedManagedProfileId,
  managedRole,
  managedIsActive,
  managedEditMessage,
  managedEditError,
  isUpdatingManagedProfile,
  onClose,
  onUpdate,
  onRoleChange,
  onStatusChange,
}: ManagedProfileEditModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-dialog modal-dialog--form"
        onClick={(event) => event.stopPropagation()}
        aria-label={t.managedEditProfile.ariaLabel}
      >
        <button className="modal-close" type="button" aria-label={t.managedEditProfile.closeLabel} onClick={onClose}>
          <FaXmark />
        </button>
        <h2 className="modal-title">{t.managedEditProfile.title}</h2>
        <p className="modal-message">
          {selectedManagedProfile
            ? `${selectedManagedProfile.name}${selectedManagedProfile.email ? ` (${selectedManagedProfile.email})` : ''}`
            : t.managedEditProfile.fallbackMessage}
        </p>

        {managedEditMessage ? <p className={styles.editorMessage}>{managedEditMessage}</p> : null}
        {managedEditError ? <p className={styles.editorError}>{managedEditError}</p> : null}

        <div className={styles.editorFormGrid}>
          <label className="form-group">
            <span className="form-label">{t.profileCard.fields.name}</span>
            <input className="form-input" value={selectedManagedProfile?.name || ''} disabled />
          </label>

          <label className="form-group">
            <span className="form-label">{t.profileCard.fields.email}</span>
            <input className="form-input" value={selectedManagedProfile?.email || ''} disabled />
          </label>

          <label className="form-group">
            <span className="form-label">{t.profileCard.fields.role}</span>
            <CustomSelect
              className="form-input"
              value={managedRole}
              onChange={(value) => onRoleChange(value)}
              disabled={isUpdatingManagedProfile}
              options={[
                { value: 'WORKER', label: t.managedEditProfile.roleLabels.worker },
                { value: 'EDITOR', label: t.managedEditProfile.roleLabels.editor },
                { value: 'MANAGER', label: t.managedEditProfile.roleLabels.manager },
                { value: 'OWNER', label: t.managedEditProfile.roleLabels.owner },
              ]}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t.profileCard.fields.status}</span>
            <CustomSelect
              className="form-input"
              value={managedIsActive ? 'active' : 'inactive'}
              onChange={(value) => onStatusChange(value === 'active')}
              disabled={isUpdatingManagedProfile}
              options={[
                { value: 'active', label: t.profileCard.active },
                { value: 'inactive', label: t.profileCard.inactive },
              ]}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose} disabled={isUpdatingManagedProfile}>
            {t.common.cancel}
          </button>
          <SubmitButton
            className="btn btn-primary"
            type="button"
            onClick={onUpdate}
            disabled={!selectedManagedProfileId}
            isLoading={isUpdatingManagedProfile}
            loadingText={<><FaFloppyDisk /><span>{t.managedEditProfile.updating}</span></>}
          >
            <FaFloppyDisk />
            <span>{t.managedEditProfile.update}</span>
          </SubmitButton>
        </div>
      </section>
    </div>
  );
}
