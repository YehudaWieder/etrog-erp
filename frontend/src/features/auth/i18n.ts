type Lang = 'he' | 'en';

type AuthI18n = {
  // Shared
  requiredFields: string;
  networkError: string;
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
};

const HE: AuthI18n = {
  requiredFields: 'נא למלא את כל השדות',
  networkError: 'לא ניתן לתקשר עם השרת. בדוק את החיבור.',
  emailLabel: 'אימייל',
  emailPlaceholder: 'הזן את הימייל שלך',
  passwordLabel: 'סיסמא',
  passwordPlaceholder: 'הזן את הסיסמא שלך',

  loginTitle: 'התחברות',
  loginSubmit: 'התחברות',
  loginConnecting: 'מתחבר...',
  loginFailed: 'ההתחברות נכשלה',
  loginFooterText: 'אין לך חשבון?',
  loginFooterLinkLabel: 'הרשם כאן',

  registerTitle: 'הרשמה',
  registerSubmit: 'הרשמה',
  registerConnecting: 'נרשם...',
  registerFailed: 'ההרשמה נכשלה',
  registerFooterText: 'כבר יש לך חשבון?',
  registerFooterLinkLabel: 'התחבר כאן',
  nameLabel: 'שם',
  namePlaceholder: 'הזן את שמך',
  phoneLabel: 'טלפון',
  phonePlaceholder: 'הזן את מספר הטלפון שלך',
};

const EN: AuthI18n = {
  requiredFields: 'Please fill in all fields',
  networkError: 'Cannot reach the server. Check your connection.',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',

  loginTitle: 'Login',
  loginSubmit: 'Login',
  loginConnecting: 'Connecting...',
  loginFailed: 'Login failed',
  loginFooterText: "Don't have an account?",
  loginFooterLinkLabel: 'Register here',

  registerTitle: 'Register',
  registerSubmit: 'Register',
  registerConnecting: 'Registering...',
  registerFailed: 'Registration failed',
  registerFooterText: 'Already have an account?',
  registerFooterLinkLabel: 'Login here',
  nameLabel: 'Name',
  namePlaceholder: 'Enter your name',
  phoneLabel: 'Phone',
  phonePlaceholder: 'Enter your phone number',
};

export const AUTH_I18N: Record<Lang, AuthI18n> = { he: HE, en: EN };
