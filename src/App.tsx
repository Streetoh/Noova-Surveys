import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createTranslator } from './i18n/index.ts';
import { useAppStore } from './store/useAppStore.ts';

const CoachShell = lazy(() =>
  import('./components/CoachShell.tsx').then((m) => ({ default: m.CoachShell }))
);
const CoachPinGate = lazy(() =>
  import('./views/CoachPinGate.tsx').then((m) => ({ default: m.CoachPinGate }))
);
const CoachDashboardView = lazy(() =>
  import('./views/CoachDashboardView.tsx').then((m) => ({ default: m.CoachDashboardView }))
);
const CoachTeamsView = lazy(() =>
  import('./views/CoachTeamsView.tsx').then((m) => ({ default: m.CoachTeamsView }))
);
const SurveyEditorView = lazy(() =>
  import('./views/SurveyEditorView.tsx').then((m) => ({ default: m.SurveyEditorView }))
);
const SurveyResultsView = lazy(() =>
  import('./views/SurveyResultsView.tsx').then((m) => ({ default: m.SurveyResultsView }))
);
const CoachSettingsView = lazy(() =>
  import('./views/CoachSettingsView.tsx').then((m) => ({ default: m.CoachSettingsView }))
);
const PlayerSurveyView = lazy(() =>
  import('./views/PlayerSurveyView.tsx').then((m) => ({ default: m.PlayerSurveyView }))
);

function RouteFallback() {
  const locale = useAppStore((s) => s.locale);
  const t = createTranslator(locale);
  return (
    <div className="empty-state" style={{ minHeight: '60dvh', justifyContent: 'center' }}>
      <p>{t('common.loading')}</p>
    </div>
  );
}

function CoachGuard() {
  const unlocked = useAppStore((s) => s.unlocked);
  if (!unlocked) return <CoachPinGate />;
  return <CoachShell />;
}

export function App() {
  const locale = useAppStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Isolated Public Player Route — zero links to Coach panel */}
          <Route path="/s/:surveyId" element={<PlayerSurveyView />} />

          {/* Private PIN-Protected Coach Routes */}
          <Route path="/coach" element={<CoachGuard />}>
            <Route index element={<CoachDashboardView />} />
            <Route path="teams" element={<CoachTeamsView />} />
            <Route path="edit/:id" element={<SurveyEditorView />} />
            <Route path="results/:id" element={<SurveyResultsView />} />
            <Route path="settings" element={<CoachSettingsView />} />
          </Route>

          <Route path="*" element={<Navigate to="/coach" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
