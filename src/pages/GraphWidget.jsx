import { useEffect, useLayoutEffect, useState } from 'react';
import { fetchUserGoalProgress } from '../api';
import './GraphWidget.css';

export default function GraphWidget({ loginId }) {
  const [snapshot, setSnapshot] = useState(null);
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

    async function refresh() {
      try {
        const result = await fetchUserGoalProgress(loginId, {
          signal: controller.signal,
        });
        if (!disposed) setSnapshot(result);
      } catch (error) {
        if (!disposed) console.error('[GRAPH WIDGET]', error);
      } finally {
        if (!disposed) timer = setTimeout(refresh, 10_000);
      }
    }

    if (loginId.trim()) refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [loginId]);

  const display = progress
    ? `${progress.totalAmount.toLocaleString('ko-KR')} (${progress.percent.toFixed(1)}%)`
    : '—';

  return (
    <section
      className="graph-widget"
      aria-label="개인 후원 목표"
    >
      <div className="graph-widget-summary">
        <span className="graph-widget-title">HM</span>
        <span className="graph-widget-value">{display}</span>
      </div>
      <div
        className="graph-widget-track"
        role="progressbar"
        aria-label="개인 후원 목표 달성률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(progress?.percent ?? 0, 100)}
        aria-valuetext={progress ? display : '후원 금액을 불러오는 중'}
      >
        <div
          className="graph-widget-fill"
          style={{ width: `${Math.min(progress?.percent ?? 0, 100)}%` }}
        />
      </div>
    </section>
  );
}
