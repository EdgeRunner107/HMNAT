import { useEffect, useLayoutEffect, useState } from 'react';
import { API_BASE } from '../api';
import './RankingWidget.css';

const medals = ['🥇', '🥈', '🥉'];

export default function RankingWidget({ loginId }) {
  const [ranking, setRanking] = useState([]);

  useLayoutEffect(() => {
    document.documentElement.classList.add('ranking-widget-page');
    document.body.classList.add('ranking-widget-body');

    return () => {
      document.documentElement.classList.remove('ranking-widget-page');
      document.body.classList.remove('ranking-widget-body');
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer;
    let controller;
    setRanking([]);

    async function refreshRanking() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(
          `${API_BASE}/api/u/${encodeURIComponent(loginId)}/ranking?limit=6`,
          { signal: controller.signal, cache: 'no-store' },
        );
        const data = await response.json();
        if (!response.ok || data?.ok !== true || !Array.isArray(data.ranking)) {
          throw new Error('Ranking lookup failed');
        }
        if (!disposed) {
          setRanking(data.ranking.slice(0, 6));
        }
      } catch (error) {
        if (!disposed) {
          console.error('[RANKING WIDGET]', error);
        }
      } finally {
        clearTimeout(timeout);
        if (!disposed) {
          timer = setTimeout(refreshRanking, 3000);
        }
      }
    }

    if (loginId.trim()) {
      refreshRanking();
    }

    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [loginId]);

  return (
    <section
      className="ranking-widget"
      aria-label="후원 순위"
    >
      <h1 className="ranking-widget-title">후원 순위</h1>

      <div className="ranking-widget-list">
        {ranking.map((row) => (
          <div
            className="ranking-widget-row"
            key={`${row.rank}-${row.donor_name}`}
          >
            <div
              className="ranking-widget-position"
              aria-label={`${row.rank}등`}
            >
              {medals[Number(row.rank) - 1] || `${row.rank}등`}
            </div>

            <div
              className="ranking-widget-name"
              title={row.donor_name}
            >
              {row.donor_name}
            </div>

            <div className="ranking-widget-amount">
              {Number(row.total_amount).toLocaleString('ko-KR')}개
            </div>
          </div>
        ))}

        {ranking.length === 0 && <p className="ranking-widget-empty">후원 내역 없음</p>}
      </div>
    </section>
  );
}
