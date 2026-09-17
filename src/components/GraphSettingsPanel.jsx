import { useEffect, useRef, useState } from 'react';
import { Check, Save } from 'lucide-react';
import GraphBar, { DEFAULT_GRAPH_SETTINGS, isGraphColor } from './GraphBar';
import { fetchGraphSettings, saveGraphSettings } from '../api';

export default function GraphSettingsPanel({ loginId }) {
  const [saved, setSaved] = useState(DEFAULT_GRAPH_SETTINGS);
  const [draftLabel, setDraftLabel] = useState(DEFAULT_GRAPH_SETTINGS.label);
  const [draftColor, setDraftColor] = useState(DEFAULT_GRAPH_SETTINGS.color);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    setLoading(true);
    setFeedback(null);
    fetchGraphSettings(loginId, { signal: controller.signal })
      .then((settings) => {
        if (disposed) return;
        const next = { label: settings.label, color: settings.color };
        setSaved(next);
        setDraftLabel(next.label);
        setDraftColor(next.color);
      })
      .catch(() => {
        if (!disposed) {
          setFeedback({ type: 'error', text: '그래프 설정을 불러오지 못했습니다.' });
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [loginId]);

  const normalizedLabel = draftLabel.trim();
  const normalizedColor = draftColor.toUpperCase();
  const valid =
    normalizedLabel.length >= 1 &&
    normalizedLabel.length <= 20 &&
    isGraphColor(normalizedColor);
  const previewColor = isGraphColor(draftColor) ? draftColor : saved.color;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!valid || submittingRef.current) {
      if (!valid) {
        setFeedback({
          type: 'error',
          text: '제목과 #RRGGBB 형식의 색상을 확인해주세요.',
        });
      }
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await saveGraphSettings(loginId, {
        label: normalizedLabel,
        color: normalizedColor,
      });
      const next = { label: result.label, color: result.color };
      setSaved(next);
      setDraftLabel(next.label);
      setDraftColor(next.color);
      setFeedback({ type: 'success', text: '그래프 설정이 저장되었습니다.' });
    } catch {
      setFeedback({ type: 'error', text: '그래프 설정 저장에 실패했습니다.' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="graph-settings-panel card">
      <div className="graph-settings-heading">
        <div>
          <h2>그래프바 설정</h2>
          <p>방송 화면에 표시할 제목과 메인 색상을 설정하세요.</p>
        </div>
        {loading && <span>설정 불러오는 중...</span>}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="graph-settings-fields">
          <label className="graph-settings-label-field">
            <span>그래프 제목</span>
            <input
              type="text"
              maxLength={20}
              value={draftLabel}
              onChange={(event) => {
                setDraftLabel(event.target.value);
                setFeedback(null);
              }}
            />
          </label>
          <label className="graph-settings-color-field">
            <span>그래프 색상</span>
            <span className="graph-color-controls">
              <input
                type="color"
                aria-label="그래프 색상 선택"
                value={previewColor}
                onChange={(event) => {
                  setDraftColor(event.target.value.toUpperCase());
                  setFeedback(null);
                }}
              />
              <input
                type="text"
                aria-label="그래프 HEX 색상"
                value={draftColor}
                maxLength={7}
                spellCheck={false}
                onChange={(event) => {
                  setDraftColor(event.target.value);
                  setFeedback(null);
                }}
              />
            </span>
          </label>
        </div>
        <div className="graph-settings-preview">
          <span>미리보기</span>
          <GraphBar
            label={normalizedLabel || DEFAULT_GRAPH_SETTINGS.label}
            color={previewColor}
            totalAmount={10000}
            goalAmount={1000000}
          />
        </div>
        <div className="graph-settings-footer">
          <span
            className={`graph-settings-feedback ${feedback?.type || ''}`}
            role="status"
          >
            {feedback?.type === 'success' && <Check size={13} />}
            {feedback?.text || ''}
          </span>
          <button
            type="submit"
            className="button primary graph-settings-save"
            disabled={submitting || loading}
          >
            <Save size={14} />
            {submitting ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}
