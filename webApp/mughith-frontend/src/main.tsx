import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import { I18nProvider } from './lib/i18n';
import { applyAccent, applyTheme, loadAccent, loadTheme } from './lib/theme';

applyTheme(loadTheme());
applyAccent(loadAccent());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
