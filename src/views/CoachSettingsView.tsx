import { useState, type FormEvent } from 'react';
import { LanguageSwitcher } from '../components/LanguageSwitcher.tsx';
import { createTranslator } from '../i18n/index.ts';
import {
  getContrastTextColor,
  getThemePreset,
  QUICK_ACCENT_COLORS,
  THEME_PRESETS,
} from '../lib/theme.ts';
import { isValidPin } from '../lib/validation.ts';
import { configuredProjectId, isFirebaseConfigured } from '../services/firebase.ts';
import { useAppStore } from '../store/useAppStore.ts';

export function CoachSettingsView() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const themeId = useAppStore((s) => s.themeId);
  const customAccent = useAppStore((s) => s.customAccent);
  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomAccent = useAppStore((s) => s.setCustomAccent);
  const updatePin = useAppStore((s) => s.updatePin);
  const showToast = useAppStore((s) => s.showToast);
  const t = createTranslator(locale);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activePreset = getThemePreset(themeId);
  const effectiveAccent = customAccent || activePreset.defaultAccent;

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
    <section
      style={{
        maxWidth: 720,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div className="surface-section">
        <div
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span className="field-label">{t('settings.languageLabel')}</span>
          <LanguageSwitcher locale={locale} onChange={setLocale} />
        </div>
      </div>

      {/* Appearance & Colors */}
      <div className="surface-section">
        <div className="section-bar">
          <span className="section-label">{t('settings.appearanceSection')}</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <span className="field-label">{t('settings.themePresetLabel')}</span>
            <div className="theme-preset-grid">
              {THEME_PRESETS.map((preset) => {
                const isSelected = preset.id === themeId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`theme-preset-card${isSelected ? ' active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setTheme(preset.id)}
                  >
                    <div
                      className="theme-mini-preview"
                      style={{ background: preset.bg }}
                      aria-hidden="true"
                    >
                      <div
                        className="theme-mini-card"
                        style={{
                          background: preset.surface,
                          border: `1px solid ${preset.borderStrong}`,
                        }}
                      >
                        <div className="theme-mini-lines">
                          <span
                            className="theme-mini-line"
                            style={{ width: '72%', background: preset.textPrimary }}
                          />
                          <span
                            className="theme-mini-line"
                            style={{ width: '48%', background: preset.textMuted }}
                          />
                        </div>
                        <span
                          className="theme-mini-btn"
                          style={{ background: preset.defaultAccent }}
                        />
                      </div>
                    </div>
                    <span className="theme-preset-name">{t(preset.translationKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <div className="row-between">
              <span className="field-label">{t('settings.accentLabel')}</span>
              {customAccent && (
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={() => setCustomAccent(null)}
                >
                  {t('settings.accentReset')}
                </button>
              )}
            </div>
            <div className="accent-swatch-row">
              {QUICK_ACCENT_COLORS.map((hex) => {
                const isActive = effectiveAccent.toUpperCase() === hex.toUpperCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    className={`accent-swatch${isActive ? ' active' : ''}`}
                    style={{
                      background: hex,
                      color: getContrastTextColor(hex),
                    }}
                    aria-label={hex}
                    aria-pressed={isActive}
                    onClick={() => setCustomAccent(hex)}
                  >
                    {isActive ? '✓' : ''}
                  </button>
                );
              })}

              <label className="accent-picker-label">
                <input
                  type="color"
                  className="accent-picker-input"
                  value={effectiveAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  aria-label={t('settings.accentCustomLabel')}
                />
                <span>{t('settings.accentCustomLabel')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <form className="surface-section" onSubmit={handlePinUpdate}>
        <div className="section-bar">
          <span className="section-label">{t('settings.pinSection')}</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label htmlFor="new-pin" className="field-label">
                {t('settings.newPinLabel')}
              </label>
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
              <label htmlFor="confirm-pin" className="field-label">
                {t('settings.confirmPinLabel')}
              </label>
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
