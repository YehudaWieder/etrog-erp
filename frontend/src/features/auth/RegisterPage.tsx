import { AuthPageShell } from './components/AuthPageShell';
import { useRegisterPage } from './hooks/useRegisterPage';

export function RegisterPage() {
  const { topBarProps, formProps } = useRegisterPage();

  return <AuthPageShell topBarProps={topBarProps} formProps={formProps} />;
}
