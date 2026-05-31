import { FaFloppyDisk, FaXmark } from 'react-icons/fa6';
import type { AuthUserListItem } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileLang } from '../profilePage.types';

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

        {managedEditMessage ? <p className="profile-editor__message">{managedEditMessage}</p> : null}
        {managedEditError ? <p className="profile-editor__error">{managedEditError}</p> : null}

        <div className="profile-editor__form-grid">
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
            <select className="form-input" value={managedRole} onChange={(event) => onRoleChange(event.target.value)} disabled={isUpdatingManagedProfile}>
              <option value="WORKER">{t.managedEditProfile.roleLabels.worker}</option>
              <option value="EDITOR">{t.managedEditProfile.roleLabels.editor}</option>
              <option value="MANAGER">{t.managedEditProfile.roleLabels.manager}</option>
              <option value="OWNER">{t.managedEditProfile.roleLabels.owner}</option>
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">{t.profileCard.fields.status}</span>
            <select
              className="form-input"
              value={managedIsActive ? 'active' : 'inactive'}
              onChange={(event) => onStatusChange(event.target.value === 'active')}
              disabled={isUpdatingManagedProfile}
            >
              <option value="active">{t.profileCard.active}</option>
              <option value="inactive">{t.profileCard.inactive}</option>
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose} disabled={isUpdatingManagedProfile}>
            {t.common.cancel}
          </button>
          <button className="btn btn-primary" type="button" onClick={onUpdate} disabled={!selectedManagedProfileId || isUpdatingManagedProfile}>
            <FaFloppyDisk />
            <span>{isUpdatingManagedProfile ? t.managedEditProfile.updating : t.managedEditProfile.update}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
