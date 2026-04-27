export type SupportedNotificationLocale = 'he' | 'en';

type NewUserPendingActivationTemplate = {
  subject: string;
  content: (params: { name: string; email: string }) => string;
};

const NEW_USER_PENDING_ACTIVATION_TEMPLATES: Record<SupportedNotificationLocale, NewUserPendingActivationTemplate> = {
  he: {
    subject: 'משתמש חדש נרשם - מחכה לאישור הפעלה',
    content: ({ name, email }) => `משתמש חדש (${name}, ${email}) נרשם ומחכה לאישור הפעלה.`,
  },
  en: {
    subject: 'New user registered - pending activation approval',
    content: ({ name, email }) => `A new user (${name}, ${email}) has registered and is awaiting activation approval.`,
  },
};

export function buildNewUserPendingActivationMessage(
  name: string,
  email: string,
  locale: SupportedNotificationLocale = 'he',
) {
  const template = NEW_USER_PENDING_ACTIVATION_TEMPLATES[locale];

  return {
    subject: template.subject,
    content: template.content({ name, email }),
  };
}
