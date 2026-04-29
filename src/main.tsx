import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initAnalytics } from './lib/analytics';
import { initGA4 } from './lib/gtag';
import './i18n';
import './index.css';

// Initialize PostHog + Microsoft Clarity (no-op if env vars missing)
initAnalytics();
// Initialize GA4 measurement (no-op if VITE_GA4_MEASUREMENT_ID not set)
initGA4();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
