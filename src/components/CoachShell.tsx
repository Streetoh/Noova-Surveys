import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { createTranslator } from '../i18n/index.ts';
import { useAppStore } from '../store/useAppStore.ts';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

function SurveysIcon() {
  return (
    <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M17.5 14c2.4 0 4.2 1.6 4.2 4.2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function CoachShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const lockCoach = useAppStore((s) => s.lockCoach);
  const toast = useAppStore((s) => s.toast);
  const dismissToast = useAppStore((s) => s.dismissToast);
  const t = createTranslator(locale);

  const path = location.pathname;
  const isEditor = path.startsWith('/coach/edit');
  const isResults = path.startsWith('/coach/results');
  const isTeams = path.startsWith('/coach/teams');
  const isSettings = path.startsWith('/coach/settings');
  const showBack = isEditor || isResults;

  const pageTitle = isEditor
    ? path.endsWith('/new')
      ? t('editor.newTitle')
      : t('editor.editTitle')
    : isResults
      ? t('results.title')
      : isTeams
        ? t('teams.title')
        : isSettings
          ? t('settings.title')
          : t('dashboard.title');

  return (
    <div className="coach-shell">
      <header className="coach-topbar">
        <div className="topbar-left">
          {showBack && (
            <button
              type="button"
              className="topbar-back-btn"
              onClick={() => navigate('/coach')}
              aria-label={t('editor.back')}
              title={t('editor.back')}
            >
              ←
            </button>
          )}
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>

        <div className="topbar-right">
          <LanguageSwitcher locale={locale} onChange={setLocale} />
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={lockCoach}
            aria-label={t('nav.lock')}
            title={t('nav.lock')}
          >
            <LockIcon />
          </button>
        </div>
      </header>

      <main className={`coach-main${isEditor ? ' no-dock' : ''}`}>
        <Outlet />
      </main>

      {!isEditor && (
        <nav className="bottom-dock" aria-label={t('app.title')}>
          <NavLink
            to="/coach"
            end
            className={({ isActive }) => `dock-tab${isActive || isResults ? ' active' : ''}`}
          >
            <SurveysIcon />
            <span>{t('nav.surveys')}</span>
          </NavLink>
          <NavLink
            to="/coach/teams"
            className={({ isActive }) => `dock-tab${isActive ? ' active' : ''}`}
          >
            <TeamsIcon />
            <span>{t('nav.teams')}</span>
          </NavLink>
          <NavLink
            to="/coach/settings"
            className={({ isActive }) => `dock-tab${isActive ? ' active' : ''}`}
          >
            <SettingsIcon />
            <span>{t('nav.settings')}</span>
          </NavLink>
        </nav>
      )}

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
