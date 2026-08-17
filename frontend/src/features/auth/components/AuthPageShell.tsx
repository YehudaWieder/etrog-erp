import type { ComponentProps } from 'react';
import { AuthForm } from '../../../components/forms/AuthForm';

type AuthPageShellProps = {
  lang: 'he' | 'en';
  formProps: ComponentProps<typeof AuthForm>;
};

export function AuthPageShell({ lang, formProps }: AuthPageShellProps) {
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="auth-page" dir={dir}>
      <AuthForm {...formProps} />
    </div>
  );
}
