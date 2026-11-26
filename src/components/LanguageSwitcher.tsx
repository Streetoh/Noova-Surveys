import { SUPPORTED_LOCALES } from '../i18n/index.ts';
import type { Locale } from '../types/survey.ts';

interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
  large?: boolean;
}

export function LanguageSwitcher({ locale, onChange, large = false }: LanguageSwitcherProps) {
  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-btn${large ? ' large' : ''}${locale === code ? ' active' : ''}`}
          onClick={() => onChange(code)}
          aria-pressed={locale === code}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
