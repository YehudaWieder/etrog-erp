import { ButtonHTMLAttributes, ReactNode } from 'react';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText: ReactNode;
  children: ReactNode;
}

export function SubmitButton({
  isLoading,
  loadingText,
  children,
  disabled,
  type = 'button',
  ...rest
}: SubmitButtonProps) {
  return (
    <button type={type} disabled={isLoading || disabled} {...rest}>
      {isLoading ? loadingText : children}
    </button>
  );
}
