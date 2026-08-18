import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Prevent unhandled promise rejections from crashing the native WebView
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection captured:', event.reason);
  // Prevent default handling if necessary to prevent native webview crash
  event.preventDefault?.();
});

window.addEventListener('error', (event) => {
  console.error('Global error captured:', event.error || event.message);
});

createRoot(document.getElementById("root")!).render(<App />);

