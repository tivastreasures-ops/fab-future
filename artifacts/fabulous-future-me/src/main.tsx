import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = [
          location.href,
          ...performance
            .getEntriesByType('resource')
            .map((e) => e.name)
            .filter((u) => u.startsWith(location.origin) && !u.includes('/api/')),
        ];
        reg.active?.postMessage({ type: 'precache', urls });
      })
      .catch((e) => {
      console.warn('Offline shell unavailable', e);
    });
  });
}

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
