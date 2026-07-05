import type { AuthI18n } from './i18n';

export const AUTH_I18N_HE: AuthI18n = {
  // Shared
  requiredFields: 'נא למלא את כל השדות',
  networkError: 'לא ניתן לתקשר עם השרת. בדוק את החיבור.',
  loginEndpointNotFound: 'נתיב ההתחברות לא נמצא בשרת.',
  registrationEndpointNotFound: 'נתיב ההרשמה לא נמצא בשרת.',
  invalidPhone: 'מספר טלפון לא תקין.',
  emailLabel: 'אימייל',
  emailPlaceholder: 'הזן את הימייל שלך',
  passwordLabel: 'סיסמא',
  passwordPlaceholder: 'הזן את הסיסמא שלך',
  newPasswordLabel: 'סיסמה חדשה',
  newPasswordPlaceholder: 'לפחות 8 תווים עם אותיות ומספרים',
  confirmPasswordLabel: 'אימות סיסמה',
  confirmPasswordPlaceholder: 'הזן שוב את הסיסמה',
  passwordRulesHint: 'הסיסמה חייבת להיות באורך 8 תווים לפחות ולכלול אותיות ומספרים.',
  passwordMismatch: 'הסיסמאות אינן תואמות.',
  invalidEmail: 'כתובת אימייל לא תקינה.',
  showPassword: 'הצג',
  hidePassword: 'הסתר',

  // Login
  loginTitle: 'התחברות',
  loginSubmit: 'התחברות',
  loginConnecting: 'מתחבר...',
  loginFailed: 'ההתחברות נכשלה',
  loginInvalidCredentials: 'האימייל או הסיסמה שגויים.',
  loginFooterText: 'אין לך חשבון?',
  loginFooterLinkLabel: 'הרשם כאן',

  // Forgot password
  forgotPasswordLabel: 'שכחתי סיסמה',
  forgotPasswordTitle: 'איפוס סיסמה',
  forgotPasswordEmailLabel: 'כתובת אימייל',
  forgotPasswordEmailPlaceholder: 'הזן את האימייל שלך',
  forgotPasswordSubmit: 'שלח לינק לאיפוס',
  forgotPasswordSending: 'שולח...',
  forgotPasswordSentMessage: 'נשלח אימייל לאיפוס הסיסמה. בדוק את תיבת הדואר שלך.',
  forgotPasswordErrorMessage: 'לא ניתן לשלוח אימייל לאיפוס. בדוק את הכתובת ונסה שוב.',

  // Register form
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

  // Register — email confirmation screen
  registerEmailSentTitle: 'כמעט שם!',
  registerEmailSentBody: 'נשלח אימייל אימות לכתובת שהזנת. לחץ על הקישור במייל כדי להשלים את ההרשמה.',
  registerEmailSentReturn: 'חזור לדף ההתחברות',

  // Google OAuth
  googleContinue: 'המשך עם Google',
  orDivider: 'או',

  // Reset password page
  resetPasswordTitle: 'איפוס סיסמה',
  resetPasswordSubtitle: 'הזן סיסמה חדשה לחשבון שלך',
  resetPasswordSubmit: 'עדכן סיסמה',
  resetPasswordUpdating: 'מעדכן...',
  resetPasswordSuccessNotice: 'הסיסמה עודכנה בהצלחה. התחבר עם הסיסמה החדשה.',
  resetPasswordInvalidLink: 'הלינק לאיפוס הסיסמה אינו תקין או פג תוקף.',
  resetPasswordLinkError: 'אירעה שגיאה. נסה לבקש לינק חדש.',
  resetPasswordLoading: 'טוען...',
  resetPasswordBackToLogin: 'חזרה להתחברות',
  resetPasswordUpdateFailed: 'לא ניתן לעדכן סיסמה. נסה שוב.',

  // Auth callback
  callbackLoading: 'מתחבר...',
  callbackAwaitingActivation: 'ממתין לאישור מנהל להפעלת החשבון.',
  callbackAccountCreated: 'החשבון נוצר בהצלחה! ממתין לאישור מנהל להפעלת החשבון.',
  callbackError: 'אירעה שגיאה באימות.',
  callbackNoSession: 'לא התקבל session לאחר האימות.',
};
