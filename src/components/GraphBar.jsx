import './GraphBar.css';

export const DEFAULT_GRAPH_SETTINGS = Object.freeze({
  label: '후원목표',
  color: '#3B82F6',
});

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isGraphColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

export default function GraphBar({ label, color, totalAmount, goalAmount }) {
  const safeLabel = typeof label === 'string' && label.trim() ? label.trim() : '후원목표';
  const safeColor = isGraphColor(color) ? color : DEFAULT_GRAPH_SETTINGS.color;
  const hasAmounts =
    Number.isSafeInteger(totalAmount) &&
    totalAmount >= 0 &&
    Number.isSafeInteger(goalAmount) &&
    goalAmount > 0;
  const percent = hasAmounts
    ? Math.min(Math.max((totalAmount / goalAmount) * 100, 0), 100)
    : 0;
  const amountText = hasAmounts
    ? `${totalAmount.toLocaleString('ko-KR')} / ${goalAmount.toLocaleString('ko-KR')}원`
    : '—';

  return (
    <section
      className="graph-bar"
      style={{ '--graph-color': safeColor }}
      aria-label={`${safeLabel} 그래프`}
    >
      <div
        className="graph-bar-label"
        title={safeLabel}
      >
        {safeLabel}
      </div>
      <div
        className="graph-bar-track"
        role="progressbar"
        aria-label={`${safeLabel} 달성률`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent * 10) / 10}
        aria-valuetext={hasAmounts ? amountText : '후원 금액을 불러오는 중'}
      >
        <div
          className="graph-bar-fill"
          style={{ width: `${percent}%` }}
        />
        <span className="graph-bar-amount">{amountText}</span>
      </div>
    </section>
  );
}
