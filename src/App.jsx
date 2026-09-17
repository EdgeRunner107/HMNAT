import { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  UserRound,
  UsersRound,
  Clock3,
  Check,
  X,
  CircleHelp,
  ShieldCheck,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import UrlCard from './components/UrlCard';
import StatCard from './components/StatCard';
import DonationTable from './components/DonationTable';
import { fetchDonations } from './api';
import LoginPage from './components/LoginPage';
import { getLoginSession, setLoginSession, clearLoginSession } from './auth';

export default function App() {
  const [user, setUser] = useState(getLoginSession);

  function handleLogin(loggedInUser) {
    setUser(setLoginSession(loggedInUser));
  }

  function handleLogout() {
    clearLoginSession();
    setUser(null);
  }

  return user ? (
    <Dashboard
      key={user.login_id}
      user={user}
      onLogout={handleLogout}
    />
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
}

function Dashboard({ user, onLogout }) {
  const [donations, setDonations] = useState([]);
  const [source, setSource] = useState('loading');
  const [error, setError] = useState('');
  const rankingUrl = `https://hmnat-livid.vercel.app/widget/ranking/${encodeURIComponent(user.login_id)}`;
  const graphUrl = `https://hmnat-livid.vercel.app/widget/graph/${encodeURIComponent(user.login_id)}`;
  const [lastUpdated, setLastUpdated] = useState(null);
  const [popover, setPopover] = useState(null);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    let disposed = false;
    let timer;
    const controller = new AbortController();
    async function refresh() {
      try {
        const result = await fetchDonations(user.login_id, { signal: controller.signal });
        if (disposed) {
          return;
        }
        setDonations(result);
        setSource('api');
        setError('');
        setLastUpdated(new Date());
      } catch (error) {
        if (!disposed) {
          setSource('offline');
          setError('후원 내역을 새로 불러오지 못했습니다. ' + error.message);
        }
      } finally {
        if (!disposed) timer = setTimeout(refresh, 3000);
      }
    }
    refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [user.login_id]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape') {
        setSettings(false);
        setPopover(null);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const completed = donations.filter((item) => item.executed === true).length;
  const waiting = donations.filter((item) => item.executed === false).length;
  return (
    <div
      className="app-shell"
      id="dashboard"
    >
      <Sidebar onSettings={() => setSettings(true)} />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            워크스페이스 <span>/</span> <strong>대시보드</strong>
          </div>
          <div className="header-actions">
            <div className="popover-wrap">
              <button
                className="notification-button"
                aria-label="알림"
                aria-expanded={popover === 'notifications'}
                onClick={() =>
                  setPopover(popover === 'notifications' ? null : 'notifications')
                }
              >
                <Bell size={20} />
              </button>
              {popover === 'notifications' && (
                <div className="popover">
                  <strong>알림</strong>
                  <p>새로운 알림이 없습니다.</p>
                </div>
              )}
            </div>
            <span className="header-divider" />
            <div className="popover-wrap">
              <button
                className="account-button"
                aria-expanded={popover === 'account'}
                onClick={() => setPopover(popover === 'account' ? null : 'account')}
              >
                <span className="avatar">
                  <UserRound size={18} />
                </span>
                <span>{user.login_id}</span>
                <ChevronDown size={14} />
              </button>
              {popover === 'account' && (
                <div className="popover">
                  <strong>{user.login_id}</strong>
                  <p>{user.login_id}</p>
                  <button
                    className="button"
                    onClick={() => {
                      setPopover(null);
                      setSettings(true);
                    }}
                  >
                    워크스페이스 정보
                  </button>
                  <button
                    className="button logout-button"
                    onClick={onLogout}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div>
              <div className="eyebrow">후원이 만드는 특별한 순간</div>
              <h1>계좌후원 대시보드</h1>
              <p>계좌 후원 관련 URL을 관리하고, 실시간 후원 내역을 확인할 수 있습니다.</p>
            </div>
            <span className={`connection-badge ${source === 'api' ? 'live' : ''}`}>
              <span />
              {source === 'api'
                ? '실시간 업데이트'
                : source === 'loading'
                  ? '연결 확인 중'
                  : '연결 재시도 중'}
            </span>
          </section>
          <div
            className="url-cards"
            id="widgets"
          >
            <UrlCard url={rankingUrl} />
            <UrlCard
              graph
              url={graphUrl}
            />
          </div>
          <div className="section-label">
            <h2>후원 한눈에 보기</h2>
            <span>
              <Clock3 size={13} />
              {lastUpdated
                ? `${lastUpdated.toLocaleTimeString('ko-KR', { hour12: false })} 기준`
                : '데이터 확인 중'}
              <span className="small-divider">·</span>3초마다 자동 갱신
            </span>
          </div>
          <div className="stats-grid">
            <StatCard
              title="전체"
              count={donations.length}
              icon={UsersRound}
              color="blue"
              description="전체 후원 내역"
            />
            <StatCard
              title="대기"
              count={waiting}
              icon={Clock3}
              color="yellow"
              description="실행을 기다리는 후원"
            />
            <StatCard
              title="완료"
              count={completed}
              icon={Check}
              color="green"
              description="정상적으로 실행된 후원"
            />
            <StatCard
              title="실패"
              count={0}
              icon={X}
              color="red"
              description="실행에 실패한 후원"
            />
          </div>
          {error && (
            <p
              className="donation-error"
              role="alert"
            >
              {error}
            </p>
          )}
          <DonationTable
            donations={donations}
            loading={source === 'loading'}
            error={error}
          />
          <div className="info-note">
            <CircleHelp size={15} />
            <span>
              {source === 'offline'
                ? '연결을 확인하고 있습니다. 마지막으로 받은 후원 내역을 표시합니다.'
                : '후원 내역은 자동으로 업데이트됩니다. 방송 중에도 편하게 확인하세요.'}
            </span>
          </div>
          <footer className="page-footer">
            <span>© 2026 HMNAT. All rights reserved.</span>
            <span>
              <ShieldCheck size={14} />
              당신의 방송을 더 편리하게
            </span>
          </footer>
        </main>
      </div>
      {settings && (
        <div
          className="modal-backdrop"
          onClick={() => setSettings(false)}
        >
          <section
            className="settings-dialog card"
            role="dialog"
            aria-modal="true"
            aria-label="워크스페이스 정보"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              autoFocus
              className="dialog-close"
              aria-label="닫기"
              onClick={() => setSettings(false)}
            >
              <X size={20} />
            </button>
            <h2>워크스페이스 정보</h2>
            <p>HMNAT · {user.login_id}</p>
            <dl>
              <dt>프로필</dt>
              <dd>{user.login_id}</dd>
              <dt>자동 새로고침</dt>
              <dd>3초</dd>
            </dl>
            <p>프로필 및 계정 설정 기능은 추후 제공될 예정입니다.</p>
            <button
              className="button primary"
              onClick={() => setSettings(false)}
            >
              확인
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
