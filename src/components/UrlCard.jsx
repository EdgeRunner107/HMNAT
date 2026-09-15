import { useEffect, useRef, useState } from 'react';
import {
  Link2,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Plus,
  Copy,
  ExternalLink,
  RefreshCw,
  Check,
  Sparkles,
} from 'lucide-react';

export default function UrlCard({ graph = false, url }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  function feedback(text, success = false) {
    clearTimeout(timer.current);
    setMessage(text);
    setCopied(success);
    timer.current = setTimeout(() => {
      setMessage('');
      setCopied(false);
    }, 2500);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      feedback('URL을 복사했어요.', true);
    } catch {
      feedback('복사하지 못했어요. URL을 직접 선택해 복사해주세요.');
    }
  }
  const Icon = graph ? ChartNoAxesColumnIncreasing : Link2;
  return (
    <section className={`url-card card ${graph ? 'purple' : ''}`}>
      <div className="url-heading">
        <div className="url-icon">
          <Icon size={23} />
        </div>
        <div>
          <h2>
            {graph ? '그래프바 위젯 URL' : '후원자막 / 후원랭킹리스트 URL'}
            {graph && <span className="soon">추후 업데이트</span>}
          </h2>
          <p>
            {graph
              ? '후원 현황을 그래프로 표시하는 위젯 URL입니다.'
              : '방송에 표시할 후원자막과 후원 랭킹 리스트를 위한 URL입니다.'}
          </p>
        </div>
        <span className="url-hint">
          <Sparkles size={13} />
          {graph ? '곧 업데이트될 예정이에요!' : '방송에 바로 적용해보세요!'}
        </span>
      </div>
      <div className="url-controls">
        <label htmlFor={graph ? 'graph-url' : 'ranking-url'}>
          URL{' '}
          <CircleHelp
            size={13}
            aria-label="방송 프로그램의 브라우저 소스에 추가할 URL"
          />
        </label>
        <select
          aria-label={`${graph ? '그래프바' : '후원자막'} 프로필`}
          defaultValue="default"
        >
          <option value="default">기본프로필</option>
        </select>
        <button
          className="add-profile"
          aria-label="프로필 추가 안내"
          onClick={() => feedback('추가 프로필 기능은 추후 제공될 예정입니다.')}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="url-input-row">
        <div className="url-field">
          <Link2 size={16} />
          <input
            id={graph ? 'graph-url' : 'ranking-url'}
            value={url}
            readOnly
            onFocus={(event) => event.target.select()}
          />
        </div>
        <button
          className="button primary"
          onClick={copy}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? '복사됨' : '복사'}
        </button>
        <a
          className="button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} />
          열기
        </a>
        <button
          className="button"
          onClick={() => feedback('URL을 새로 확인했어요.')}
        >
          <RefreshCw size={15} />
          새로고침
        </button>
      </div>
      <span
        className="url-feedback"
        role="status"
      >
        {message}
      </span>
    </section>
  );
}
