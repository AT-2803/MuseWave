import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css"; // optional, if you’re using Tailwind via postcss setup

console.info('[MuseWave] Bootstrapping main.tsx');

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Helper to surface fatal errors directly into the page (avoids a blank white page)
function showFatalError(message: string) {
  try {
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.background = '#111827';
    pre.style.color = '#fee2e2';
    pre.style.padding = '16px';
    pre.style.borderRadius = '8px';
    pre.style.fontSize = '13px';
    pre.style.lineHeight = '1.4';
    pre.textContent = message;

    document.body.innerHTML = '';
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.minHeight = '100vh';
    container.style.padding = '32px';
    container.appendChild(pre);
    document.body.appendChild(container);
  } catch (e) {
    // fallback to alert if DOM modifications fail
    try { alert(message); } catch (_) { /* ignore */ }
  }
}

// Global error handlers to catch unexpected runtime errors and promise rejections
window.addEventListener('error', (ev) => {
  const err = ev.error || ev.message || String(ev);
  console.error('[MuseWave] Uncaught error', err);
  showFatalError(`Uncaught error:\n\n${err && err.stack ? err.stack : String(err)}`);
});

window.addEventListener('unhandledrejection', (ev) => {
  console.error('[MuseWave] Unhandled promise rejection', ev.reason);
  showFatalError(`Unhandled promise rejection:\n\n${ev.reason && ev.reason.stack ? ev.reason.stack : String(ev.reason)}`);
});

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (err: any) {
  console.error('[MuseWave] Fatal render error', err);
  showFatalError(`Fatal render error:\n\n${err && err.stack ? err.stack : String(err)}`);
}

// Register service worker for autoupdates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
