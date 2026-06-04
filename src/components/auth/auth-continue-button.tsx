import { ChevronRight } from 'lucide-react';
import { authContinueButtonClass } from './auth-styles';

export function AuthContinueButton({
  children,
  loading,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className={authContinueButtonClass}
    >
      {children}
      {!loading ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  );
}
