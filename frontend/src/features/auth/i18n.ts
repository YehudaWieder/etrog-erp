type Lang = 'he' | 'en';

export type AuthI18n = {
  // Shared
  requiredFields: string;
  networkError: string;
  loginEndpointNotFound: string;
  registrationEndpointNotFound: string;
  invalidPhone: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordRulesHint: string;
  passwordMismatch: string;
  invalidEmail: string;
  showPassword: string;
  hidePassword: string;

  // Login
  loginTitle: string;
  loginSubmit: string;
  loginConnecting: string;
  loginFailed: string;
  loginInvalidCredentials: string;
  loginFooterText: string;
  loginFooterLinkLabel: string;

  // Forgot password (on login page)
  forgotPasswordLabel: string;
  forgotPasswordTitle: string;
  forgotPasswordEmailLabel: string;
  forgotPasswordEmailPlaceholder: string;
  forgotPasswordSubmit: string;
  forgotPasswordSending: string;
  forgotPasswordSentMessage: string;
  forgotPasswordErrorMessage: string;

  // Register form
  registerTitle: string;
  registerSubmit: string;
  registerConnecting: string;
  registerFailed: string;
  registerFooterText: string;
  registerFooterLinkLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;

  // Register — email confirmation screen
  registerEmailSentTitle: string;
  registerEmailSentBody: string;
  registerEmailSentReturn: string;

  // Google OAuth button
  googleContinue: string;
  orDivider: string;

  // Reset password page (/auth/reset-password)
  resetPasswordTitle: string;
  resetPasswordSubtitle: string;
  resetPasswordSubmit: string;
  resetPasswordUpdating: string;
  resetPasswordSuccessNotice: string;
  resetPasswordInvalidLink: string;
  resetPasswordLinkError: string;
  resetPasswordLoading: string;
  resetPasswordBackToLogin: string;
  resetPasswordUpdateFailed: string;

  // Auth callback route (/auth/callback)
  callbackLoading: string;
  callbackAwaitingActivation: string;
  callbackAccountCreated: string;
  callbackError: string;
  callbackNoSession: string;
};
import { AUTH_I18N_EN } from './i18n.en';
import { AUTH_I18N_HE } from './i18n.he';

export const AUTH_I18N: Record<Lang, AuthI18n> = {
  he: AUTH_I18N_HE,
  en: AUTH_I18N_EN,
};
