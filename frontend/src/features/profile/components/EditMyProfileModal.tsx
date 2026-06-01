import { FaFloppyDisk, FaXmark } from 'react-icons/fa6';
import type { EditProfileForm, ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import styles from './styles/ProfileFeature.module.css';

type EditMyProfileModalProps = {
  lang: ProfileLang;
  t: ProfileI18nLabels;
  isOpen: boolean;
  isSelfAdmin: boolean;
  editForm: EditProfileForm;
  editMessage: string;
  editError: string;
  isUpdatingProfile: boolean;
  isDeletingProfile: boolean;
  isLoadingProfile: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onFieldChange: (field: keyof EditProfileForm, value: string) => void;
};

export function EditMyProfileModal({
  lang,
  t,
  isOpen,
  isSelfAdmin,
  editForm,
  editMessage,
  editError,
  isUpdatingProfile,
  isDeletingProfile,
  isLoadingProfile,
  onClose,
  onUpdate,
  onFieldChange,
}: EditMyProfileModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-dialog modal-dialog--form" onClick={(event) => event.stopPropagation()} aria-label={t.editProfile.title}>
        <button className="modal-close" type="button" aria-label={t.editProfile.closeButtonLabel} onClick={onClose}>
          <FaXmark />
        </button>
        <h2 className="modal-title">{t.editProfile.title}</h2>
        <p className="modal-message">{t.editProfile.description}</p>

        <p className={styles.editorHint}>{t.editProfile.permissionsHint}</p>
        {isSelfAdmin ? <p className={`${styles.editorHint} ${styles.editorHintMuted}`}>{t.editProfile.cannotEditRoleStatus}</p> : null}

        {editMessage ? <p className={styles.editorMessage}>{editMessage}</p> : null}
        {editError ? <p className={styles.editorError}>{editError}</p> : null}

        <div className={styles.editorFormGrid}>
          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.name}</span>
            <input
              className="form-input"
              value={editForm.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              placeholder={t.editProfile.placeholders.name}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.email}</span>
            <input
              className="form-input"
              type="email"
              value={editForm.email}
              onChange={(event) => onFieldChange('email', event.target.value)}
              placeholder={t.editProfile.placeholders.email}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.phone}</span>
            <input
              className="form-input"
              value={editForm.phone}
              onChange={(event) => onFieldChange('phone', event.target.value)}
              placeholder={t.editProfile.placeholders.phone}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.currentPassword}</span>
            <input
              className="form-input"
              type="password"
              value={editForm.currentPassword}
              onChange={(event) => onFieldChange('currentPassword', event.target.value)}
              placeholder={t.editProfile.placeholders.currentPassword}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.newPassword}</span>
            <input
              className="form-input"
              type="password"
              value={editForm.newPassword}
              onChange={(event) => onFieldChange('newPassword', event.target.value)}
              placeholder={t.editProfile.placeholders.newPassword}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose} disabled={isUpdatingProfile || isDeletingProfile}>
            {t.common.cancel}
          </button>
          <button className="btn btn-primary" type="button" onClick={onUpdate} disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}>
            <FaFloppyDisk />
            <span>{isUpdatingProfile ? t.editProfile.actions.updating : t.editProfile.actions.update}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
