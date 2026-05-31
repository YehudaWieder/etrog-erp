import type { ComponentProps } from 'react';
import { AuthForm } from '../../../components/forms/AuthForm';
import { AppTopBar } from '../../../components/navigation/AppTopBar';

type AuthPageShellProps = {
  topBarProps: ComponentProps<typeof AppTopBar>;
  formProps: ComponentProps<typeof AuthForm>;
};

export function AuthPageShell({ topBarProps, formProps }: AuthPageShellProps) {
  const dir = topBarProps.lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="auth-page" dir={dir}>
      <AppTopBar {...topBarProps} />
      <AuthForm {...formProps} />
    </div>
  );
}
