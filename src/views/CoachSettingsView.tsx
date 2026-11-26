import { useState, type FormEvent } from 'react';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import { createTranslator } from '../i18n/index.ts';
import { isValidPin } from '../lib/validation.ts';
import { configuredProjectId, isFirebaseConfigured } from '../services/firebase.ts';
import { useAppStore } from '../store/useAppStore.ts';

export function CoachSettingsView() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const updatePin = useAppStore((s) => s.updatePin);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handlePinUpdate(e: FormEvent) {
    e.preventDefault();
    if (!isValidPin(newPin)) {
      setError(t('pin.errorInvalid'));
      return;
    }
    if (newPin !== confirmPin) {
      setError(t('pin.errorMismatch'));
      return;
    }
    updatePin(newPin);
    setNewPin('');
    setConfirmPin('');
    setError(null);
    showToast(t('settings.pinUpdatedToast'));
  }

  return (
    <section style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="surface-section">
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="field-label">{t('settings.languageLabel')}</span>
          <LanguageSwitcher locale={locale} onChange={setLocale} />
        </div>
      </div>

      <form className="surface-section" onSubmit={handlePinUpdate}>
        <div className="section-bar">
          <span className="section-label">{t('settings.pinSection')}</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label htmlFor="new-pin" className="field-label">{t('settings.newPinLabel')}</label>
              <input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input"
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (error) setError(null);
                }}
                placeholder="••••"
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-pin" className="field-label">{t('settings.confirmPinLabel')}</label>
              <input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                className="input"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (error) setError(null);
                }}
                placeholder="••••"
              />
            </div>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div>
            <button type="submit" className="btn btn-primary btn-compact">
              {t('settings.updatePin')}
            </button>
          </div>
        </div>
      </form>

      <div className="surface-section">
        <div className="section-bar">
          <span className="section-label">{t('settings.firebaseSection')}</span>
        </div>
        <div style={{ padding: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          {isFirebaseConfigured
            ? t('settings.firebaseConnected', { projectId: configuredProjectId })
            : t('settings.firebaseMissing')}
        </div>
      </div>
    </section>
  );
}
