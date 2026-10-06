import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import '@fontsource/itim/400.css';
import '@fontsource/mali/500.css';
import '@fontsource/mali/600.css';
import '@fontsource/noto-emoji/500.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
