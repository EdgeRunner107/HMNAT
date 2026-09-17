import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import RankingWidget from './pages/RankingWidget.jsx';
import GraphWidget from './pages/GraphWidget.jsx';

const widgetMatch = window.location.pathname.match(/^\/widget\/ranking\/([^/]+)\/?$/);
const graphMatch = window.location.pathname.match(/^\/widget\/graph\/([^/]+)\/?$/);
let widgetLoginId = '';
if (widgetMatch) {
  try {
    widgetLoginId = decodeURIComponent(widgetMatch[1]);
  } catch {
    console.error('[RANKING WIDGET] Invalid login_id encoding');
  }
}
let graphLoginId = '';
if (graphMatch) {
  try {
    graphLoginId = decodeURIComponent(graphMatch[1]);
  } catch {
    console.error('[GRAPH WIDGET] Invalid login_id encoding');
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {widgetMatch ? (
      <RankingWidget loginId={widgetLoginId} />
    ) : graphMatch ? (
      <GraphWidget
        key={graphLoginId}
        loginId={graphLoginId}
      />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
