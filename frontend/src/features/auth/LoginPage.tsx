import { AuthPageShell } from './components/AuthPageShell';
import { useLoginPage } from './hooks/useLoginPage';

export function LoginPage() {
  const { topBarProps, formProps } = useLoginPage();

  return <AuthPageShell topBarProps={topBarProps} formProps={formProps} />;
}
