import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Polyfill crypto.randomUUID for contexts where crypto.getRandomValues exists but randomUUID is not exposed (e.g. non-secure HTTP LAN access)
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (typeof window.crypto.randomUUID !== 'function') {
    window.crypto.randomUUID = function () {
      if (typeof window.crypto?.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`;
      }
      throw new Error('Cryptographically secure randomness unavailable (crypto.getRandomValues is required)');
    };
  }
}

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

