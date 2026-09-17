import {
  CalendarDays,
  ChevronDown,
  Landmark,
  Inbox,
  Check,
  Clock3,
  X,
} from 'lucide-react';

export function getDonationStatus(row) {
  if (row.canceled === true) return 'canceled';
  if (row.executed === true && !row.executed_at) return 'manual-pending';
  if (row.executed === true) return 'complete';
  return 'waiting';
}

const statusLabels = {
  complete: 'svg완료',
  waiting: '대기',
  'manual-pending': '미실행',
  canceled: '취소',
};
const statusIcons = {
  complete: Check,
  waiting: Clock3,
  'manual-pending': Clock3,
  canceled: X,
};

function formatAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '0원';
  return `${value.toLocaleString('ko-KR')}원`;
}

export function formatDate(value) {
  if (!value) return '—';
  // 타임존 없는 백엔드 날짜는 한국 시각으로 해석합니다.
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+09:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}. ${get('month')}. ${get('day')}. ${get('hour')}:${get('minute')}:${get('second')}`;
}

export default function DonationTable({
  donations,
  loading,
  error,
  actionLoadingIds,
  onRun,
  onRetry,
  onCancel,
}) {
  return (
    <section
      className="card donation-card"
      id="donations"
    >
      <div className="table-heading">
        <div>
          <h2>
            계좌후원 내역 <span className="count-pill">{donations.length}</span>
          </h2>
          <p>팬들이 보내온 따뜻한 마음을 확인하세요.</p>
        </div>
        <button
          className="button period"
          disabled
          title="날짜 필터는 추후 제공됩니다"
        >
          <CalendarDays size={15} />
          전체 기간
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>종류</th>
              <th>시간</th>
              <th>이름</th>
              <th>금액</th>
              <th>채팅</th>
              <th>실행여부</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <Inbox size={30} />
                    <p>
                      {loading
                        ? '후원 내역을 불러오는 중...'
                        : error
                          ? '후원 내역을 불러오지 못했습니다.'
                          : '계좌후원 내역이 없습니다.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {donations.map((row) => {
              const status = getDonationStatus(row);
              const StatusIcon = statusIcons[status];
              const actionLoading = actionLoadingIds.has(row.id);

              return (
                <tr key={row.id}>
                  <td>
                    <span className="donation-type">
                      <Landmark size={15} />
                      계좌후원
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(row.created_at)}</td>
                  <td className="name-cell">{row.donor_name || '익명'}</td>
                  <td className="donation-amount">{formatAmount(row.amount)}</td>
                  <td className="chat-cell">{row.text || '—'}</td>
                  <td>
                    <span className={`status status-${status}`}>
                      <StatusIcon size={12} />
                      {statusLabels[status]}
                    </span>
                  </td>
                  <td>
                    <div
                      className="donation-actions"
                      aria-busy={actionLoading}
                    >
                      {status === 'manual-pending' && (
                        <button
                          type="button"
                          className="run-button"
                          disabled={actionLoading}
                          onClick={() => onRun(row.id)}
                        >
                          실행
                        </button>
                      )}
                      {['complete', 'canceled'].includes(status) && (
                        <button
                          type="button"
                          className="retry-button"
                          disabled={actionLoading}
                          onClick={() => onRetry(row.id)}
                        >
                          재실행
                        </button>
                      )}
                      {status !== 'canceled' && (
                        <button
                          type="button"
                          className="cancel-button"
                          disabled={actionLoading}
                          onClick={() => onCancel(row.id)}
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          총 <strong>{donations.length}건</strong>의 후원 내역
        </span>
        <span>소중한 후원, 빠짐없이 함께해요.</span>
      </div>
    </section>
  );
}
