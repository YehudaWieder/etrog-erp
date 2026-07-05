import { isValidPhone, sanitizePhone, sanitizeText } from '../../../utils/inputValidation';
import type { AuthProfile } from '../../../services/authService';
import type { EditProfileForm, ProfileUpdatePayload } from '../profilePage.types';

type ProfileUpdateValidationMessages = {
  nameRequired: string;
  invalidPhone: string;
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
  const trimmedPhone = sanitizePhone(form.phone);

  if (!trimmedName) {
    return {
      payload: { id: profile.id },
      hasChanges: false,
      error: messages.nameRequired,
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

  const originalPhone = profile.phone || '';
  if (trimmedPhone !== originalPhone) {
    payload.phone = trimmedPhone.length === 0 ? null : trimmedPhone;
  }

  return {
    payload,
    hasChanges: Object.keys(payload).length > 1,
    error: null,
  };
}
