import { useState, type FormEvent } from 'react';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import { createTranslator } from '../i18n/index.ts';
import { isValidPin } from '../lib/validation.ts';
import { useAppStore } from '../store/useAppStore.ts';

export function CoachPinGate() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const hasPin = useAppStore((s) => s.hasPin);
  const setupPin = useAppStore((s) => s.setupPin);
  const verifyPin = useAppStore((s) => s.verifyPin);
  const t = createTranslator(locale);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPin(pin)) {
      setError(t('pin.errorInvalid'));
      return;
    }

    if (!hasPin) {
      if (pin !== confirmPin) {
        setError(t('pin.errorMismatch'));
        return;
      }
      setupPin(pin);
      return;
    }

    const ok = verifyPin(pin);
    if (!ok) {
      setError(t('pin.errorWrong'));
      setPin('');
    }
  }

  return (
    <div className="pin-screen">
      <div style={{ marginBottom: 16 }}>
        <LanguageSwitcher locale={locale} onChange={setLocale} />
      </div>

      <form className="pin-card" onSubmit={handleSubmit}>
        <div>
          <h1 className="page-title">{hasPin ? t('pin.unlockTitle') : t('pin.setupTitle')}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            {hasPin ? t('pin.unlockSubtitle') : t('pin.setupSubtitle')}
          </p>
        </div>

        <div className="field">
          <label htmlFor="coach-pin" className="field-label">{t('pin.label')}</label>
          <input
            id="coach-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            className="input pin-input"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              if (error) setError(null);
            }}
            placeholder="••••"
          />
        </div>

        {!hasPin && (
          <div className="field">
            <label htmlFor="coach-pin-confirm" className="field-label">{t('pin.confirmLabel')}</label>
            <input
              id="coach-pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input pin-input"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                if (error) setError(null);
              }}
              placeholder="••••"
            />
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <button type="submit" className="btn btn-primary">
          {hasPin ? t('pin.unlockAction') : t('pin.setupAction')}
        </button>
      </form>
    </div>
  );
}
