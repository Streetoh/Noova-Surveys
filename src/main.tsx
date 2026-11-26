import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { applyThemeToDocument } from './lib/theme.ts';
import { useAppStore } from './store/useAppStore.ts';
import './styles/tokens.css';
import './styles/global.css';

const initialState = useAppStore.getState();
applyThemeToDocument(initialState.themeId, initialState.customAccent);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Optional in local preview
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
