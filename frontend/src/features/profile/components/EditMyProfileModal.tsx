import { useState } from 'react';
import { FaFloppyDisk, FaKey, FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { updatePassword } from '../../../services/authService';
import type { EditProfileForm, ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import styles from './styles/ProfileFeature.module.css';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

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
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePasswordUpdate = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError('הסיסמה חייבת להכיל לפחות 8 תווים עם אותיות ומספרים.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('הסיסמאות אינן תואמות.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await updatePassword(newPassword);
      setPasswordSuccess('הסיסמה עודכנה בהצלחה.');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'לא ניתן לעדכן סיסמה.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!isOpen) return null;

  const isDisabled = isUpdatingProfile || isDeletingProfile || isLoadingProfile;

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
        {passwordSuccess ? <p className={styles.editorMessage}>{passwordSuccess}</p> : null}

        <div className={styles.editorFormGrid}>
          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.name}</span>
            <input
              className="form-input"
              value={editForm.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              placeholder={t.editProfile.placeholders.name}
              disabled={isDisabled}
            />
          </label>

          <label className="form-group">
            <span className="form-label">{t.editProfile.fields.phone}</span>
            <input
              className="form-input"
              value={editForm.phone}
              onChange={(event) => onFieldChange('phone', event.target.value)}
              placeholder={t.editProfile.placeholders.phone}
              disabled={isDisabled}
            />
          </label>
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
          <button
            className="btn"
            type="button"
            onClick={() => { setShowPasswordSection((p) => !p); setPasswordError(''); setPasswordSuccess(''); }}
            disabled={isDisabled}
          >
            <FaKey />
            <span>{showPasswordSection ? 'ביטול שינוי סיסמה' : 'שינוי סיסמה'}</span>
          </button>
        </div>

        {showPasswordSection ? (
          <div className={styles.editorFormGrid}>
            {passwordError ? <p className={styles.editorError} style={{ gridColumn: '1 / -1' }}>{passwordError}</p> : null}
            <label className="form-group">
              <span className="form-label">סיסמה חדשה</span>
              <input
                className="form-input"
                type="password"
                placeholder="לפחות 8 תווים עם אותיות ומספרים"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isUpdatingPassword}
              />
            </label>
            <label className="form-group">
              <span className="form-label">אישור סיסמה</span>
              <input
                className="form-input"
                type="password"
                placeholder="הזן שוב את הסיסמה"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isUpdatingPassword}
              />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <SubmitButton
                className="btn btn-primary"
                type="button"
                onClick={() => { void handlePasswordUpdate(); }}
                isLoading={isUpdatingPassword}
                loadingText={<span>מעדכן סיסמה...</span>}
              >
                <FaKey />
                <span>עדכן סיסמה</span>
              </SubmitButton>
            </div>
          </div>
        ) : null}

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose} disabled={isUpdatingProfile || isDeletingProfile}>
            {t.common.cancel}
          </button>
          <SubmitButton
            className="btn btn-primary"
            type="button"
            onClick={onUpdate}
            disabled={isDeletingProfile || isLoadingProfile}
            isLoading={isUpdatingProfile}
            loadingText={<><FaFloppyDisk /><span>{t.editProfile.actions.updating}</span></>}
          >
            <FaFloppyDisk />
            <span>{t.editProfile.actions.update}</span>
          </SubmitButton>
        </div>
      </section>
    </div>
  );
}
