import { NavLink, Outlet } from 'react-router-dom';
import { createTranslator } from '../i18n/index.ts';
import { useAppStore } from '../store/useAppStore.ts';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

export function CoachShell() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const lockCoach = useAppStore((s) => s.lockCoach);
  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);
  const t = createTranslator(locale);

  return (
    <div className="coach-shell">
      <header className="topbar">
        <div className="topbar-left">
          <NavLink to="/coach" className="brand-mark">
            <span className="brand-dot" aria-hidden="true" />
            <span>{t('app.title')}</span>
          </NavLink>
          <nav className="topbar-nav" aria-label={t('app.title')}>
            <NavLink
              to="/coach"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.surveys')}
            </NavLink>
            <NavLink
              to="/coach/teams"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.teams')}
            </NavLink>
            <NavLink
              to="/coach/settings"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.settings')}
            </NavLink>
          </nav>
        </div>

        <div className="topbar-right">
          <LanguageSwitcher locale={locale} onChange={setLocale} />
          <button type="button" className="btn btn-ghost btn-compact" onClick={lockCoach}>
            {t('nav.lock')}
          </button>
        </div>
      </header>

      <main className="coach-main">
        <Outlet />
      </main>

      {toast && (
        <div
          role="status"
          className={`toast${toast.tone === 'error' ? ' error' : ''}`}
          onClick={dismissToast}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
