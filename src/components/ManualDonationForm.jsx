import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';

function parseAmount(value) {
  const normalized = value.replace(/,/g, '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function formatAmountInput(value) {
  if (value === '') return '';
  if (!/^\d[\d,]*$/.test(value)) return value;
  const digits = value.replace(/,/g, '');
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount.toLocaleString('ko-KR') : value;
}

export default function ManualDonationForm({ onCreate }) {
  const [nickname, setNickname] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [message, setMessage] = useState('');
  const [executionStatus, setExecutionStatus] = useState('pending');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (event.nativeEvent?.isComposing || submittingRef.current) return;

    const amount = parseAmount(amountInput);
    if (amount === null) {
      setError('금액은 0보다 큰 정수로 입력해주세요.');
      return;
    }

    // Capture the click/submit instant before any asynchronous work begins.
    const clickedAt = new Date().toISOString();
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      await onCreate({
        nickname: nickname.trim() || '익명',
        amount,
        message,
        executionStatus,
        clickedAt,
      });
      setNickname('');
      setAmountInput('');
      setMessage('');
      setExecutionStatus('pending');
    } catch {
      setError(
        '수동 후원 내역을 저장하지 못했습니다. 입력값을 확인하고 다시 시도해주세요.',
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      className="manual-donation-panel card"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.nativeEvent.isComposing) {
          event.preventDefault();
        }
      }}
    >
      <strong className="manual-donation-title">수동 후원 추가</strong>
      <label className="manual-donation-field nickname-field">
        <span>닉네임</span>
        <input
          value={nickname}
          maxLength={100}
          placeholder="닉네임 (비우면 익명)"
          onChange={(event) => setNickname(event.target.value)}
        />
      </label>
      <label className="manual-donation-field amount-field">
        <span>금액</span>
        <input
          value={amountInput}
          inputMode="numeric"
          placeholder="금액"
          aria-invalid={Boolean(error && parseAmount(amountInput) === null)}
          onChange={(event) => setAmountInput(formatAmountInput(event.target.value))}
        />
      </label>
      <label className="manual-donation-field message-field">
        <span>메시지</span>
        <input
          value={message}
          maxLength={1000}
          placeholder="메시지"
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <label className="manual-donation-field status-field">
        <span>실행여부</span>
        <select
          value={executionStatus}
          onChange={(event) => setExecutionStatus(event.target.value)}
        >
          <option value="pending">미실행</option>
          <option value="completed">실행완료</option>
        </select>
      </label>
      <button
        type="submit"
        className="button primary manual-donation-submit"
        disabled={submitting}
      >
        <Plus size={15} />
        {submitting ? '저장 중...' : '내역 추가'}
      </button>
      <span
        className="manual-donation-error"
        role="alert"
      >
        {error}
      </span>
    </form>
  );
}
