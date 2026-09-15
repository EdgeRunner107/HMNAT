import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import RankingWidget from './pages/RankingWidget.jsx';

const widgetMatch = window.location.pathname.match(
  /^\/widget\/ranking\/([^/]+)\/?$/,
);
let widgetLoginId = '';
if (widgetMatch) {
  document.documentElement.classList.add('ranking-widget-page');
  try {
    widgetLoginId = decodeURIComponent(widgetMatch[1]);
  } catch {
    console.error('[RANKING WIDGET] Invalid login_id encoding');
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {widgetMatch ? <RankingWidget loginId={widgetLoginId} /> : <App />}
  </React.StrictMode>,
);
