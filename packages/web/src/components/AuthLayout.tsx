import type { ReactNode } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  useLanguage(); // ensure language context available for nested components
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-card__header">
          <h1 className="auth-card__title">{title}</h1>
          {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
        </header>
        <div className="auth-card__body">{children}</div>
        {footer ? <footer className="auth-card__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
