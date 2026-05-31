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

  // Login
  loginTitle: string;
  loginSubmit: string;
  loginConnecting: string;
  loginFailed: string;
  loginFooterText: string;
  loginFooterLinkLabel: string;

  // Register
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
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordRulesHint: string;
  passwordMismatch: string;
  invalidEmail: string;
  showPassword: string;
  hidePassword: string;
  registerSuccess: string;
};
import { AUTH_I18N_EN } from './i18n.en';
import { AUTH_I18N_HE } from './i18n.he';

export const AUTH_I18N: Record<Lang, AuthI18n> = {
  he: AUTH_I18N_HE,
  en: AUTH_I18N_EN,
};
