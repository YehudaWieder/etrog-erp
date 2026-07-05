import type { AuthI18n } from './i18n';

export const AUTH_I18N_EN: AuthI18n = {
  // Shared
  requiredFields: 'Please fill in all fields',
  networkError: 'Cannot reach the server. Check your connection.',
  loginEndpointNotFound: 'The login endpoint was not found on the server.',
  registrationEndpointNotFound: 'The registration endpoint was not found on the server.',
  invalidPhone: 'Invalid phone number format.',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  newPasswordLabel: 'New Password',
  newPasswordPlaceholder: 'At least 8 characters with letters and numbers',
  confirmPasswordLabel: 'Confirm Password',
  confirmPasswordPlaceholder: 'Enter your password again',
  passwordRulesHint: 'Password must be at least 8 characters and include letters and numbers.',
  passwordMismatch: 'Passwords do not match.',
  invalidEmail: 'Invalid email format.',
  showPassword: 'Show',
  hidePassword: 'Hide',

  // Login
  loginTitle: 'Login',
  loginSubmit: 'Login',
  loginConnecting: 'Connecting...',
  loginFailed: 'Login failed',
  loginInvalidCredentials: 'Invalid email or password.',
  loginFooterText: "Don't have an account?",
  loginFooterLinkLabel: 'Register here',

  // Forgot password
  forgotPasswordLabel: 'Forgot password',
  forgotPasswordTitle: 'Reset Password',
  forgotPasswordEmailLabel: 'Email address',
  forgotPasswordEmailPlaceholder: 'Enter your email',
  forgotPasswordSubmit: 'Send reset link',
  forgotPasswordSending: 'Sending...',
  forgotPasswordSentMessage: 'A password reset email has been sent. Check your inbox.',
  forgotPasswordErrorMessage: 'Could not send reset email. Check the address and try again.',

  // Register form
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

  // Register — email confirmation screen
  registerEmailSentTitle: 'Almost there!',
  registerEmailSentBody: 'A verification email was sent to the address you entered. Click the link in the email to complete your registration.',
  registerEmailSentReturn: 'Return to login',

  // Google OAuth
  googleContinue: 'Continue with Google',
  orDivider: 'or',

  // Reset password page
  resetPasswordTitle: 'Reset Password',
  resetPasswordSubtitle: 'Enter a new password for your account',
  resetPasswordSubmit: 'Update Password',
  resetPasswordUpdating: 'Updating...',
  resetPasswordSuccessNotice: 'Password updated successfully. Log in with your new password.',
  resetPasswordInvalidLink: 'The password reset link is invalid or has expired.',
  resetPasswordLinkError: 'An error occurred. Try requesting a new link.',
  resetPasswordLoading: 'Loading...',
  resetPasswordBackToLogin: 'Back to login',
  resetPasswordUpdateFailed: 'Could not update password. Please try again.',

  // Auth callback
  callbackLoading: 'Connecting...',
  callbackAwaitingActivation: 'Awaiting manager approval to activate the account.',
  callbackAccountCreated: 'Account created successfully! Awaiting manager approval to activate.',
  callbackError: 'An error occurred during authentication.',
  callbackNoSession: 'No session received after authentication.',
};
