import { useEffect, useLayoutEffect, useState } from 'react';
import { fetchGraphSettings, fetchUserGoalProgress } from '../api';
import GraphBar, { DEFAULT_GRAPH_SETTINGS } from '../components/GraphBar';
import './GraphWidget.css';

export default function GraphWidget({ loginId }) {
  const [snapshot, setSnapshot] = useState(null);
  const [graphSettings, setGraphSettings] = useState(DEFAULT_GRAPH_SETTINGS);
  // A changed user must never briefly see the previous user's amount.
  const progress = snapshot?.login_id === loginId ? snapshot : null;

  useLayoutEffect(() => {
    document.documentElement.classList.add('graph-widget-html');
    document.body.classList.add('graph-widget-body');
    return () => {
      document.documentElement.classList.remove('graph-widget-html');
      document.body.classList.remove('graph-widget-body');
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer;
    const controller = new AbortController();
    setSnapshot(null);
    setGraphSettings(DEFAULT_GRAPH_SETTINGS);

    async function refresh() {
      const progressRequest = fetchUserGoalProgress(loginId, {
        signal: controller.signal,
      })
        .then((result) => {
          if (!disposed) setSnapshot(result);
        })
        .catch((error) => {
          if (!disposed) console.error('[GRAPH WIDGET] goal progress', error);
        });
      const settingsRequest = fetchGraphSettings(loginId, {
        signal: controller.signal,
      })
        .then((result) => {
          if (!disposed) setGraphSettings(result);
        })
        .catch((error) => {
          if (!disposed) console.error('[GRAPH WIDGET] graph settings', error);
        });
      await Promise.allSettled([progressRequest, settingsRequest]);
      if (!disposed) timer = setTimeout(refresh, 10_000);
    }

    if (loginId.trim()) refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [loginId]);

  return (
    <section className="graph-widget">
      <GraphBar
        label={graphSettings.label}
        color={graphSettings.color}
        totalAmount={progress?.totalAmount}
        goalAmount={progress?.goalAmount}
      />
    </section>
  );
}
