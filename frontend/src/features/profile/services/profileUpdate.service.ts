import { isValidEmail, isValidPhone, sanitizeEmail, sanitizePhone, sanitizeText } from '../../../utils/inputValidation';
import type { AuthProfile } from '../../../services/authService';
import type { EditProfileForm, ProfileUpdatePayload } from '../profilePage.types';

type ProfileUpdateValidationMessages = {
  nameRequired: string;
  invalidEmail: string;
  invalidPhone: string;
  passwordNeedsCurrent: string;
};

type BuildProfileUpdatePayloadParams = {
  profile: AuthProfile;
  form: EditProfileForm;
  messages: ProfileUpdateValidationMessages;
};

type BuildProfileUpdatePayloadResult = {
  payload: ProfileUpdatePayload;
  hasChanges: boolean;
  error: string | null;
};

export function buildProfileUpdatePayload({ profile, form, messages }: BuildProfileUpdatePayloadParams): BuildProfileUpdatePayloadResult {
  const trimmedName = sanitizeText(form.name);
  const trimmedEmail = sanitizeEmail(form.email);
  const trimmedPhone = sanitizePhone(form.phone);

  if (!trimmedName) {
    return {
      payload: { id: profile.id },
      hasChanges: false,
      error: messages.nameRequired,
    };
  }

  if (!isValidEmail(trimmedEmail)) {
    return {
      payload: { id: profile.id },
      hasChanges: false,
      error: messages.invalidEmail,
    };
  }

  if (trimmedPhone && !isValidPhone(trimmedPhone)) {
    return {
      payload: { id: profile.id },
      hasChanges: false,
      error: messages.invalidPhone,
    };
  }

  const payload: ProfileUpdatePayload = { id: profile.id };

  if (trimmedName !== profile.name) {
    payload.name = trimmedName;
  }

  if (trimmedEmail !== profile.email) {
    payload.email = trimmedEmail;
  }

  const originalPhone = profile.phone || '';
  if (trimmedPhone !== originalPhone) {
    payload.phone = trimmedPhone.length === 0 ? null : trimmedPhone;
  }

  if (form.newPassword.trim().length > 0) {
    if (!form.currentPassword.trim()) {
      return {
        payload,
        hasChanges: Object.keys(payload).length > 1,
        error: messages.passwordNeedsCurrent,
      };
    }

    payload.currentPassword = form.currentPassword;
    payload.newPassword = form.newPassword;
  }

  return {
    payload,
    hasChanges: Object.keys(payload).length > 1,
    error: null,
  };
}
