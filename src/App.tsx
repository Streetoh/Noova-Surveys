import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CoachShell } from './components/CoachShell.tsx';
import { useAppStore } from './store/useAppStore.ts';
import { CoachDashboardView } from './views/CoachDashboardView.tsx';
import { CoachPinGate } from './views/CoachPinGate.tsx';
import { CoachSettingsView } from './views/CoachSettingsView.tsx';
import { PlayerSurveyView } from './views/PlayerSurveyView.tsx';
import { SurveyEditorView } from './views/SurveyEditorView.tsx';
import { SurveyResultsView } from './views/SurveyResultsView.tsx';

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
      <Routes>
        {/* Isolated Public Player Route — zero links to Coach panel */}
        <Route path="/s/:surveyId" element={<PlayerSurveyView />} />

        {/* Private PIN-Protected Coach Routes */}
        <Route path="/coach" element={<CoachGuard />}>
          <Route index element={<CoachDashboardView />} />
          <Route path="edit/:id" element={<SurveyEditorView />} />
          <Route path="results/:id" element={<SurveyResultsView />} />
          <Route path="settings" element={<CoachSettingsView />} />
        </Route>

        <Route path="*" element={<Navigate to="/coach" replace />} />
      </Routes>
    </HashRouter>
  );
}
