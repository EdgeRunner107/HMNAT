# HMNAT source snapshot

## package.json

```json
{
  "name": "hmnat-dashboard",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "playwright test"
  },
  "dependencies": {
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0",
    "@vitejs/plugin-react": "^4.3.4",
    "prettier": "^3.9.6",
    "vite": "^6.0.5"
  }
}
```

## vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
```

## index.html

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <meta
      name="theme-color"
      content="#14233d"
    />
    <meta
      name="description"
      content="HMNAT 스트리머를 위한 계좌후원 관리 대시보드"
    />
    <title>HMNAT · 계좌후원 대시보드</title>
  </head>
  <body>
    <div id="root"></div>
    <script
      type="module"
      src="/src/main.jsx"
    ></script>
  </body>
</html>
```

## .env.example

```text
VITE_API_BASE=https://hmnation.onrender.com
```

## .prettierrc.json

```json
{
  "singleQuote": true,
  "printWidth": 90,
  "tabWidth": 2,
  "singleAttributePerLine": true,
  "trailingComma": "all"
}
```

## .prettierignore

```text
node_modules
dist
.npm-cache
package-lock.json
test-results
playwright-report
```

## src/App.jsx

```jsx
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
  const rankingUrl = `https://hmnat.example.com/ranking/${encodeURIComponent(user.login_id)}`;
  const graphUrl = `https://hmnat.example.com/graph/${encodeURIComponent(user.login_id)}`;
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
```

## src/App.css

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');

/* Base */
:root {
  font-family:
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #26354d;
  background: #f4f7fc;
  font-synthesis: none;
  font-weight: 400;
  font-size: 14px;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
input,
select {
  font: inherit;
}
button,
a,
select {
  -webkit-tap-highlight-color: transparent;
}
button,
a {
  touch-action: manipulation;
}
button {
  cursor: pointer;
}
button:disabled {
  cursor: default;
}
button:focus-visible,
a:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 3px solid #92b6ff;
  outline-offset: 3px;
}
a {
  color: inherit;
  text-decoration: none;
}
button {
  color: inherit;
}
h1,
h2,
p {
  margin: 0;
}
svg {
  flex-shrink: 0;
}
button {
  background: none;
  border: 0;
}
html {
  scroll-behavior: smooth;
}
#widgets,
#donations {
  scroll-margin-top: 25px;
}
/* Sidebar */
.sidebar {
  width: 222px;
  position: fixed;
  inset: 0 auto 0 0;
  background: linear-gradient(160deg, #182b49, #14233d 70%);
  color: #acb9ce;
  padding: 34px 18px 20px;
  display: flex;
  flex-direction: column;
  z-index: 20;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px;
  color: white;
}
.brand-logo {
  height: 39px;
  width: 39px;
  display: grid;
  place-items: center;
  background: #ffffff0d;
  border: 1px solid #ffffff19;
  border-radius: 11px;
  font-size: 29px;
  font-weight: 800;
  letter-spacing: -3px;
}
.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.logo-dot {
  color: #699bff;
}
.brand strong {
  font-size: 22px;
  letter-spacing: 1px;
}
.brand small {
  display: block;
  font-size: 10px;
  color: #9aaac1;
  margin-top: 5px;
  letter-spacing: 0.1px;
}
.nav-label {
  font-size: 10px;
  letter-spacing: 1.7px;
  color: #7285a3;
  margin: 48px 15px 17px;
  font-weight: 600;
}
.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  text-align: left;
  color: #aab9cf;
  padding: 14px 15px;
  border-radius: 8px;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}
.nav-item:hover {
  background: #ffffff0a;
}
.nav-item.active {
  background: #3b78f2;
  color: #fff;
  box-shadow: 0 5px 16px #08183226;
}
.nav-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: white;
  margin-left: auto;
}
.sidebar-bottom {
  margin-top: auto;
  padding-top: 50px;
}
.sidebar-tip {
  border: 1px solid #ffffff0b;
  border-radius: 11px;
  background: linear-gradient(130deg, #ffffff08, #467ccc16);
  padding: 19px 14px;
  color: #7caaff;
}
.sidebar-tip p {
  font-size: 12px;
  line-height: 1.9;
  color: #aebbce;
  margin: 12px 0;
}
.sidebar-tip strong {
  font-weight: 500;
  color: #d8e2f2;
}
.sidebar-tip > span {
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8196b5;
}
.sidebar-foot {
  font-size: 9px;
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 23px 5px 0;
  color: #7185a3;
}
.sidebar-foot > span:last-child {
  margin-left: auto;
}
.online-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #64c2ad;
}
/* Dashboard and Header */
.main-shell {
  margin-left: 222px;
}
.topbar {
  height: 77px;
  background: #ffffffd9;
  border-bottom: 1px solid #e8edf5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 38px;
}
.breadcrumb {
  color: #93a0b4;
  font-size: 12px;
  display: flex;
  gap: 15px;
}
.breadcrumb strong {
  color: #57667c;
  font-weight: 500;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 23px;
}
.notification-button {
  color: #75829a;
  display: grid;
  place-items: center;
  padding: 7px;
}
.header-divider {
  height: 22px;
  width: 1px;
  background: #e9edf3;
}
.account-button {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
}
.account-button > svg {
  margin-left: 9px;
  color: #8f9aad;
}
.avatar {
  display: grid;
  place-items: center;
  width: 33px;
  height: 33px;
  border-radius: 50%;
  background: #eaf0fb;
  color: #8196bb;
  border: 3px solid #f5f7fc;
}
.popover-wrap {
  position: relative;
}
.popover {
  position: absolute;
  right: 0;
  top: 47px;
  width: 230px;
  background: white;
  padding: 20px;
  border: 1px solid #e4eaf4;
  border-radius: 12px;
  box-shadow: 0 12px 40px #14233d1a;
  z-index: 30;
}
.popover p {
  font-size: 12px;
  color: #7e8aa0;
  margin: 12px 0;
}
main {
  max-width: 1510px;
  margin: auto;
  padding: 36px 38px 0;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 29px;
  gap: 16px;
}
.eyebrow {
  font-size: 12px;
  font-weight: 500;
  color: #5680c5;
  margin-bottom: 9px;
}
h1 {
  font-size: 28px;
  letter-spacing: -1px;
  line-height: 1.4;
  font-weight: 750;
}
.page-heading p {
  font-size: 12px;
  color: #8390a3;
  margin-top: 9px;
}
.connection-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  color: #79869c;
  border: 1px solid #e2e8f1;
  padding: 8px 11px;
  border-radius: 20px;
  background: #fff;
  white-space: nowrap;
}
.connection-badge > span {
  height: 5px;
  width: 5px;
  background: #b0bbcd;
  border-radius: 50%;
}
.connection-badge.live > span {
  background: #2fba8c;
}
.card {
  background: #fff;
  border: 1px solid #e4eaf3;
  border-radius: 13px;
  box-shadow: 0 3px 12px #24457603;
}
/* URL Cards */
.url-cards {
  display: grid;
  gap: 17px;
}
.url-card {
  padding: 23px 25px 25px;
  position: relative;
  background: linear-gradient(110deg, #fff 63%, #f6f9ff);
  border-top: 2px solid #b4d0ff;
}
.url-card.purple {
  background: linear-gradient(110deg, #fff 63%, #faf8ff);
  border-top-color: #d4caf9;
}
.url-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}
.url-icon {
  height: 43px;
  width: 43px;
  border-radius: 11px;
  background: #edf3ff;
  color: #4b83ed;
  display: grid;
  place-items: center;
}
.purple .url-icon {
  color: #9780d9;
  background: #f2edff;
}
h2 {
  font-size: 15px;
  letter-spacing: -0.3px;
  font-weight: 650;
}
.url-heading p {
  font-size: 11px;
  color: #939db0;
  margin-top: 7px;
}
.url-hint {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  padding: 7px 9px;
  color: #668fd5;
  background: #eef5ff;
  border-radius: 5px;
  white-space: nowrap;
}
.purple .url-hint {
  color: #9982c8;
  background: #f4efff;
}
.soon {
  display: inline-block;
  vertical-align: middle;
  font-size: 9px;
  font-weight: 500;
  color: #a18bbf;
  border: 1px solid #e7dff2;
  border-radius: 4px;
  padding: 3px 5px;
  margin-left: 9px;
}
.url-controls {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 19px 0 10px;
}
.url-controls label {
  font-size: 11px;
  font-weight: 600;
  display: flex;
  gap: 6px;
  align-items: center;
  margin-right: 7px;
}
.url-controls label svg {
  color: #abb6c7;
}
.url-controls select {
  font-size: 10px;
  padding: 5px 26px 5px 9px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 5px;
  color: #748197;
  height: 27px;
}
.add-profile {
  border: 1px solid #e3e8f0;
  border-radius: 5px;
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  color: #8190a5;
  background: white;
}
.url-input-row {
  display: flex;
  gap: 8px;
}
.url-field {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f6f8fc;
  border: 1px solid #e2e8f3;
  border-radius: 7px;
  padding: 0 13px;
  color: #93a5c1;
}
.url-field input {
  background: none;
  border: 0;
  min-width: 0;
  width: 100%;
  height: 39px;
  color: #6d82a3;
  font-size: 11px;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
  border: 1px solid #e0e6ef;
  background: #fff;
  border-radius: 6px;
  padding: 10px 13px;
  color: #718097;
  font-size: 11px;
  font-weight: 500;
  transition: background 0.15s;
}
.button:hover {
  background: #f1f5fc;
}
.button.primary {
  background: #3b78f2;
  color: white;
  border-color: #3b78f2;
}
.button.primary:hover {
  background: #2c67df;
}
.url-feedback {
  position: absolute;
  bottom: 6px;
  left: 25px;
  font-size: 10px;
  color: #5979ad;
}
/* Statistics */
.section-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 27px 0 13px;
}
.section-label h2 {
  font-size: 13px;
}
.section-label > span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #98a3b5;
  font-size: 10px;
}
.small-divider {
  margin: 0 4px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 26px;
}
.stat-card {
  display: flex;
  justify-content: space-between;
  padding: 20px 21px;
}
.stat-title {
  font-size: 12px;
  color: #7b889c;
}
.stat-value {
  font-size: 30px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -1px;
  margin: 9px 0 8px;
}
.stat-value > span {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  margin-left: 5px;
  color: #a3adbc;
}
.stat-card p {
  font-size: 10px;
  color: #a1abbb;
}
.stat-icon {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  border-radius: 11px;
  margin-top: 2px;
}
.blue .stat-icon {
  color: #4c85f0;
  background: #edf3ff;
}
.yellow .stat-icon {
  color: #dfac36;
  background: #fff8e5;
}
.green .stat-icon {
  color: #48af8b;
  background: #eaf8f2;
}
.red .stat-icon {
  color: #e17c88;
  background: #fff0f2;
}
/* Donation Table */
.donation-card {
  overflow: hidden;
}
.table-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 23px 25px;
}
.table-heading h2 {
  display: flex;
  align-items: center;
  gap: 9px;
}
.count-pill {
  color: #5489e8;
  background: #eef4ff;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 10px;
}
.table-heading p {
  font-size: 11px;
  color: #97a2b3;
  margin-top: 7px;
}
.period {
  font-size: 10px;
  padding: 9px 11px;
}
.table-scroll {
  overflow: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  white-space: nowrap;
}
th {
  background: #f8fafd;
  border-top: 1px solid #edf0f6;
  border-bottom: 1px solid #edf0f6;
  font-size: 11px;
  font-weight: 500;
  color: #8996aa;
  padding: 13px 20px;
}
td {
  padding: 17px 20px;
  border-bottom: 1px solid #f0f3f8;
  font-size: 11px;
  color: #6c7b90;
}
th:first-child,
td:first-child {
  padding-left: 25px;
}
th:last-child,
td:last-child {
  text-align: center;
  padding-right: 25px;
}
tbody tr:last-child td {
  border-bottom: 0;
}
tbody tr:hover {
  background: #fafcff;
}
.donation-type {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6c82a2;
  font-size: 10px;
}
.donation-type svg {
  color: #91a6c6;
}
.date-cell {
  font-size: 10px;
  color: #8c98a9;
  font-variant-numeric: tabular-nums;
}
.name-cell {
  font-weight: 600;
  color: #52627a;
}
.chat-cell {
  white-space: normal;
  min-width: 180px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 5px 9px;
  border-radius: 5px;
  font-weight: 500;
}
.status-complete {
  background: #eaf8f0;
  color: #45a87c;
}
.status-waiting {
  background: #fff7e3;
  color: #d7a43c;
}
.status-processing {
  background: #eaf2ff;
  color: #3b78f2;
}
.status-failed {
  background: #ffedef;
  color: #dc6170;
}
.table-footer {
  border-top: 1px solid #edf1f6;
  padding: 15px 25px;
  display: flex;
  justify-content: space-between;
  color: #a2adbd;
  font-size: 10px;
}
.table-footer strong {
  color: #76879f;
  font-weight: 500;
}
.empty-state {
  display: grid;
  place-items: center;
  padding: 40px;
  color: #98a6ba;
  gap: 10px;
}
.info-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 10px;
  color: #9ba7b8;
  margin: 18px 0 32px;
  line-height: 1.7;
}
.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #e5ebf4;
  padding: 19px 0 22px;
  color: #a7b1c0;
  font-size: 10px;
}
.page-footer > span:last-child {
  display: flex;
  align-items: center;
  gap: 5px;
}
/* Settings Dialog */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #14233d66;
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  z-index: 50;
}
.settings-dialog {
  position: relative;
  padding: 30px;
  width: min(420px, 90vw);
}
.settings-dialog p {
  font-size: 12px;
  color: #8692a5;
  margin: 16px 0;
  line-height: 1.7;
}
.settings-dialog dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-size: 12px;
  gap: 12px;
}
.settings-dialog dd {
  margin: 0;
}
.dialog-close {
  position: absolute;
  right: 14px;
  top: 14px;
  color: #8c99ad;
}

/* Responsive */
@media (min-width: 1500px) {
  main {
    padding-top: 44px;
  }
  .url-card {
    padding: 26px 28px 28px;
  }
  .url-heading p,
  .page-heading p {
    font-size: 13px;
  }
  .url-heading h2 {
    font-size: 16px;
  }
  .url-field input {
    font-size: 12px;
  }
  td {
    padding-top: 20px;
    padding-bottom: 20px;
  }
}
@media (max-width: 1100px) {
  main {
    padding: 28px 25px 0;
  }
  .topbar {
    padding: 0 25px;
  }
  .url-hint {
    display: none;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .url-input-row {
    flex-wrap: wrap;
  }
  .url-field {
    flex-basis: 100%;
  }
  .url-input-row .button {
    flex: 1;
  }
  .url-card {
    padding-bottom: 28px;
  }
  table {
    min-width: 740px;
  }
  .connection-badge {
    display: none;
  }
}
@media (max-width: 700px) {
  .sidebar {
    width: 72px;
    padding: 25px 10px;
  }
  .brand {
    padding: 0;
    justify-content: center;
  }
  .brand > div:last-child,
  .nav-label,
  .nav-item > span,
  .sidebar-bottom {
    display: none;
  }
  .brand-logo {
    width: 38px;
  }
  .sidebar nav {
    margin-top: 38px;
  }
  .nav-item {
    justify-content: center;
    padding: 14px 0;
  }
  .main-shell {
    margin-left: 72px;
  }
  .topbar {
    height: 65px;
    padding: 0 17px;
  }
  .breadcrumb {
    font-size: 10px;
    gap: 8px;
  }
  .header-actions {
    gap: 10px;
  }
  .account-button > span:not(.avatar),
  .account-button > svg,
  .header-divider {
    display: none;
  }
  main {
    padding: 25px 16px 0;
  }
  h1 {
    font-size: 23px;
  }
  .page-heading p {
    line-height: 1.8;
  }
  .url-card {
    padding: 18px 15px 30px;
  }
  .url-heading {
    gap: 9px;
  }
  .url-heading h2 {
    font-size: 12px;
    line-height: 1.8;
  }
  .url-heading p {
    line-height: 1.6;
    font-size: 10px;
  }
  .url-icon {
    width: 33px;
    height: 33px;
  }
  .soon {
    margin-left: 4px;
    font-size: 8px;
  }
  .stats-grid {
    gap: 10px;
  }
  .stat-card {
    padding: 16px 12px;
  }
  .stat-icon {
    width: 30px;
    height: 30px;
  }
  .stat-value {
    font-size: 25px;
  }
  .stat-card p {
    font-size: 9px;
  }
  .section-label > span {
    font-size: 8px;
  }
  .section-label > span > svg,
  .small-divider {
    display: none;
  }
  .section-label h2 {
    font-size: 11px;
  }
  .table-heading {
    padding: 20px 16px;
  }
  .table-heading h2 {
    font-size: 13px;
  }
  .table-heading p {
    font-size: 10px;
  }
  .table-footer > span:last-child,
  .page-footer > span:last-child {
    display: none;
  }
  .info-note {
    align-items: flex-start;
  }
  .url-feedback {
    left: 15px;
    font-size: 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  * {
    transition: none !important;
  }
}

/* Login */
.donation-error {
  margin: 0 0 12px;
  color: #dc6170;
  font-size: 12px;
  line-height: 1.6;
}

.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  max-width: none;
  margin: 0;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.login-card {
  width: 390px;
  max-width: 100%;
  padding: 38px;
  border: 1px solid #e5eaf2;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 12px 36px rgba(30, 60, 120, 0.05);
}

.login-logo {
  margin-bottom: 32px;
  text-align: center;
}

.login-title {
  color: #14233d;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 1px;
}

.login-subtitle {
  margin-top: 10px;
  color: #8390a3;
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-field label {
  color: #52627a;
  font-size: 13px;
  font-weight: 600;
}

.login-input {
  width: 100%;
  height: 46px;
  padding: 0 13px;
  border: 1px solid #e0e6ef;
  border-radius: 7px;
  background: #ffffff;
  color: #26354d;
  font-size: 14px;
}

.login-input::placeholder {
  color: #a1abbb;
}

.login-input[aria-invalid='true'] {
  border-color: #dc6170;
}

.login-button {
  width: 100%;
  min-height: 46px;
  margin-top: 4px;
  border-radius: 7px;
  background: #3b78f2;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}

.login-button:hover:not(:disabled) {
  background: #2c67df;
}

.login-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.login-error {
  color: #dc6170;
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.logout-button {
  width: 100%;
  margin-top: 10px;
}

@media (max-width: 420px) {
  .login-card {
    padding: 30px 24px;
  }
}
```

## src/main.jsx

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

## src/api.js

```js
import { sanitizeUser } from './auth';

export const API_BASE = (
  import.meta.env.VITE_API_BASE || 'https://hmnation.onrender.com'
).replace(/\/$/, '');

async function requestJson(path, { signal, ...options } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);

  try {
    const response = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (!response.ok || data?.ok !== true) {
      throw new Error(
        typeof data?.error === 'string'
          ? data.error
          : '요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
    return data;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new Error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    }
    if (error instanceof TypeError) {
      throw new Error('서버에 연결하지 못했습니다. 네트워크 연결을 확인해주세요.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function loginUser(loginId, password) {
  const data = await requestJson('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId.trim(), password }),
  });
  return sanitizeUser(data.user);
}

// 전체 내역만 조회하며 후원 실행용 next/complete 엔드포인트는 호출하지 않습니다.
export async function fetchDonations(loginId, { signal } = {}) {
  const data = await requestJson(
    '/api/donations?login_id=' + encodeURIComponent(loginId),
    { signal },
  );
  const donations = data.donations ?? [];
  if (
    !Array.isArray(donations) ||
    !donations.every((row) => row && row.id != null && typeof row.executed === 'boolean')
  ) {
    throw new Error('후원 내역 응답 형식이 올바르지 않습니다.');
  }
  return donations;
}
```

## src/auth.js

```js
const SESSION_KEY = 'hmnat_user';

// 허용한 사용자 필드만 보관하며 비밀번호 등 추가 필드는 저장하지 않습니다.
export function sanitizeUser(user) {
  if (
    !user ||
    typeof user.login_id !== 'string' ||
    !user.login_id.trim() ||
    user.id == null
  ) {
    throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해주세요.');
  }

  return {
    id: user.id,
    login_id: user.login_id,
    payment_date: user.payment_date ?? null,
    is_active: user.is_active ?? null,
  };
}

export function getLoginSession() {
  try {
    const savedUser = localStorage.getItem(SESSION_KEY);
    return savedUser ? sanitizeUser(JSON.parse(savedUser)) : null;
  } catch {
    return null;
  }
}

export function setLoginSession(user) {
  const safeUser = sanitizeUser(user);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    localStorage.removeItem('hmnat_logged_in');
  } catch {
    // 저장소 접근 제한 시 현재 탭의 React state로만 유지합니다.
  }
  return safeUser;
}

export function clearLoginSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('hmnat_logged_in');
  } catch {
    // 저장소 접근이 제한되어도 현재 화면에서 로그아웃합니다.
  }
}
```

## src/components/LoginPage.jsx

```jsx
import { useRef, useState } from 'react';
import { loginUser } from '../api';

export default function LoginPage({ onLogin }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) {
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError('');

    let user;

    try {
      user = await loginUser(loginId.trim(), password);
    } catch (loginError) {
      setError(loginError.message || '로그인하지 못했습니다. 다시 시도해주세요.');
      return;
    } finally {
      submitting.current = false;
      setLoading(false);
    }

    onLogin(user);
  }

  return (
    <main className="login-page">
      <section
        className="login-card"
        aria-labelledby="login-title"
      >
        <div className="login-logo">
          <h1
            className="login-title"
            id="login-title"
          >
            HMNAT
          </h1>
          <p className="login-subtitle">계정에 로그인하세요</p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <div className="login-field">
            <label htmlFor="login-id">ID</label>
            <input
              className="login-input"
              id="login-id"
              name="username"
              type="text"
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              onBlur={() => setLoginId((value) => value.trim())}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              className="login-input"
              id="login-password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              disabled={loading}
              required
            />
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {error && (
            <p
              className="login-error"
              id="login-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
```

## src/components/Sidebar.jsx

```jsx
import { useState } from 'react';
import {
  LayoutDashboard,
  Landmark,
  PanelsTopLeft,
  History,
  Settings,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

const menus = [
  ['대시보드', LayoutDashboard, 'dashboard'],
  ['계좌후원', Landmark, 'donations'],
  ['위젯 관리', PanelsTopLeft, 'widgets'],
  ['후원 내역', History, 'donations'],
  ['설정', Settings, 'settings'],
];

export default function Sidebar({ onSettings }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [active, setActive] = useState('대시보드');
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#dashboard"
        aria-label="HMNAT 대시보드"
      >
        <div className="brand-logo">
          {logoFailed ? (
            <span>
              H<span className="logo-dot">.</span>
            </span>
          ) : (
            <img
              src="/logo.png"
              alt="HMNAT"
              onError={() => setLogoFailed(true)}
            />
          )}
        </div>
        <div>
          <strong>HMNAT</strong>
          <small>스트리머를 위한 도구</small>
        </div>
      </a>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="메인 메뉴">
        {menus.map(([label, Icon, target]) => (
          <button
            key={label}
            className={`nav-item ${active === label ? 'active' : ''}`}
            aria-current={active === label ? 'page' : undefined}
            onClick={() => {
              if (target === 'settings') {
                onSettings();
                return;
              }
              setActive(label);
              document
                .getElementById(target)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
            {active === label && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <Sparkles size={23} />
          <p>
            방송에만 집중하세요.
            <br />
            <strong>나머지는 HMNAT과 함께.</strong>
          </p>
          <span>
            더 편리한 방송을 만들어가요 <ArrowUpRight size={14} />
          </span>
        </div>
        <div className="sidebar-foot">
          <span className="online-dot" /> HMNAT workspace <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
}
```

## src/components/UrlCard.jsx

```jsx
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
```

## src/components/StatCard.jsx

```jsx
export default function StatCard({ title, count, icon: Icon, color, description }) {
  return (
    <section className={`card stat-card ${color}`}>
      <div>
        <span className="stat-title">{title}</span>
        <div className="stat-value">
          {count.toLocaleString('ko-KR')}
          <span>건</span>
        </div>
        <p>{description}</p>
      </div>
      <div className="stat-icon">
        <Icon size={22} />
      </div>
    </section>
  );
}
```

## src/components/DonationTable.jsx

```jsx
import { CalendarDays, ChevronDown, Landmark, Inbox, Check, Clock3 } from 'lucide-react';

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

export default function DonationTable({ donations, loading, error }) {
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
              <th>채팅</th>
              <th>실행여부</th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 && (
              <tr>
                <td colSpan={5}>
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
            {donations.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="donation-type">
                    <Landmark size={15} />
                    계좌후원
                  </span>
                </td>
                <td className="date-cell">{formatDate(row.created_at)}</td>
                <td className="name-cell">{row.donor_name || '익명'}</td>
                <td className="chat-cell">{row.text || '—'}</td>
                <td>
                  <span
                    className={`status ${row.executed === true ? 'status-complete' : 'status-waiting'}`}
                  >
                    {row.executed === true ? <Check size={12} /> : <Clock3 size={12} />}
                    {row.executed === true ? '완료' : '대기'}
                  </span>
                </td>
              </tr>
            ))}
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
```

## playwright.config.js

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
});
```

## tests/login.spec.js

```js
import { test, expect } from '@playwright/test';

// 브라우저 테스트에서만 API 응답을 대체합니다. 앱에는 테스트 계정이 없습니다.
const user = { id: 42, login_id: 'streamer+42', payment_date: null, is_active: true };
const donation = {
  id: 1,
  user_id: 42,
  donor_name: '경석',
  amount: 1000,
  text: '응원합니다',
  executed: false,
  created_at: '2026-09-15T05:31:22Z',
  executed_at: null,
};

async function submitLogin(page) {
  await page.getByLabel('ID', { exact: true }).fill(` ${user.login_id} `);
  await page.getByLabel('Password', { exact: true }).fill('browser-test-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
}

test('실제 API 요청 형식, 로그인 상태 유지, 상태 갱신과 오류 복구, 로그아웃', async ({
  page,
}) => {
  const errors = [];
  let requests = 0;
  let mode = 'waiting';
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/login', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      login_id: user.login_id,
      password: 'browser-test-password',
    });
    await route.fulfill({
      json: { ok: true, user: { ...user, password: 'must-not-be-saved' } },
    });
  });
  await page.route('**/api/donations?*', async (route) => {
    requests += 1;
    expect(new URL(route.request().url()).searchParams.get('login_id')).toBe(
      user.login_id,
    );
    if (mode === 'error') {
      return route.fulfill({
        status: 503,
        json: { ok: false, error: '잠시 후 다시 시도해주세요.' },
      });
    }
    await route.fulfill({
      json: { ok: true, donations: [{ ...donation, executed: mode === 'complete' }] },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await submitLogin(page);
  await expect(page.locator('.account-button')).toContainText(user.login_id);
  await expect(page.locator('.status-waiting')).toHaveText('대기');
  await expect(page.locator('.date-cell')).toHaveText('2026. 09. 15. 14:31:22');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('hmnat_user'))),
  ).toEqual(user);
  await expect(page.locator('.url-card')).toHaveCount(2);
  await expect(page.locator('.stat-card')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('.status-waiting')).toBeVisible();
  mode = 'error';
  await expect(page.getByRole('alert')).toContainText(
    '후원 내역을 새로 불러오지 못했습니다.',
    { timeout: 7000 },
  );
  await expect(page.locator('.status-waiting')).toBeVisible();
  mode = 'complete';
  await expect(page.locator('.status-complete')).toHaveText('완료', { timeout: 7000 });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.stat-card.yellow .stat-value')).toHaveText('0건');
  await expect(page.locator('.stat-card.green .stat-value')).toHaveText('1건');
  await page.locator('.account-button').click();
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  const afterLogout = requests;
  await page.waitForTimeout(3300);
  expect(requests).toBe(afterLogout);
  expect(await page.evaluate(() => localStorage.getItem('hmnat_user'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('로그인 중 표시, 서버 오류와 비JSON 응답, 최초 로딩과 빈 목록', async ({ page }) => {
  let releaseLogin;
  let releaseDonations;
  let mode = 'failure';
  await page.route('**/api/login', async (route) => {
    if (mode === 'failure') {
      await new Promise((resolve) => {
        releaseLogin = resolve;
      });
      return route.fulfill({
        status: 401,
        json: { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      });
    }
    if (mode === 'invalid') {
      return route.fulfill({
        status: 502,
        contentType: 'text/html',
        body: '<h1>Bad gateway</h1>',
      });
    }
    return route.fulfill({ json: { ok: true, user } });
  });
  await page.route('**/api/donations?*', async (route) => {
    await new Promise((resolve) => {
      releaseDonations = resolve;
    });
    await route.fulfill({ json: { ok: true, donations: [] } });
  });
  await page.goto('/');
  await submitLogin(page);
  await expect(page.getByRole('button', { name: '로그인 중...' })).toBeDisabled();
  await expect.poll(() => Boolean(releaseLogin)).toBe(true);
  releaseLogin();
  await expect(page.getByRole('alert')).toContainText(
    '아이디 또는 비밀번호가 올바르지 않습니다.',
  );
  mode = 'invalid';
  await submitLogin(page);
  await expect(page.getByRole('alert')).toContainText('서버 응답을 읽지 못했습니다.');
  mode = 'success';
  await submitLogin(page);
  await expect(page.locator('tbody')).toContainText('후원 내역을 불러오는 중...');
  await expect.poll(() => Boolean(releaseDonations)).toBe(true);
  releaseDonations();
  await expect(page.locator('tbody')).toContainText('계좌후원 내역이 없습니다.');
});

test('손상된 저장 정보는 로그인으로 복귀하고 모바일 정렬 유지', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hmnat_user', '{invalid'));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  const card = await page.locator('.login-card').boundingBox();
  expect(Math.abs(card.x + card.width / 2 - 187.5)).toBeLessThan(2);
  expect(Math.abs(card.y + card.height / 2 - 406)).toBeLessThan(2);
});
```

## README.md

````md
# HMNAT 계좌후원 대시보드

기존 React + Vite 대시보드 디자인을 유지하고 운영 백엔드 API를 연결한 프론트엔드입니다.

## 실행

```bash
npm install
npm run dev
```

## API 연결

- `src/api.js`의 `API_BASE` 기본값은 `https://hmnation.onrender.com`입니다. 변경 시 `.env.example`을 `.env.local`로 복사하고 개발 서버를 재시작하세요.
- `loginUser(loginId, password)`: `POST /api/login`, JSON body는 `{ login_id, password }`이며 성공 응답의 `user`를 반환합니다.
- `fetchDonations(loginId, { signal })`: `GET /api/donations?login_id=...`, 로그인한 사용자 ID를 URL 인코딩하여 조회합니다.
- HTTP 오류, 서버의 `ok: false`, 비JSON 응답, 연결 오류, 15초 응답 제한 시간을 처리합니다.
- 브라우저에서 백엔드 API만 호출하며 서버 코드나 비밀 키는 포함하지 않습니다. 서버가 프론트 출처의 CORS 요청을 허용해야 합니다.

## 로그인 상태

- `src/auth.js`에서 `hmnat_user` 저장·복원·삭제를 관리합니다.
- `id`, `login_id`, `payment_date`, `is_active`만 저장합니다. 비밀번호와 추가 응답 필드는 저장하지 않습니다.
- 기존 테스트 계정 비교와 `hmnat_logged_in` 기반 로그인 복원은 제거했습니다.
- 저장 데이터가 손상되면 로그인 화면으로 돌아갑니다. 저장소 접근이 제한되면 React state로 현재 탭에서만 로그인합니다.
- 오른쪽 사용자 메뉴에서 로그인 ID 확인 및 로그아웃이 가능합니다.

## 후원 내역

- 로그인 직후 조회하고 요청 완료 3초 후 재귀 `setTimeout`으로 다시 조회합니다.
- 로그아웃·컴포넌트 해제 시 타이머와 진행 중인 요청을 취소합니다.
- 조회 실패 시 기존 목록을 유지하며 오류를 표시합니다. 성공하면 오류가 해제됩니다.
- 최초 로딩과 빈 목록은 기존 테이블 안에 표시합니다. 실행여부는 boolean 기준 대기·완료 두 상태만 사용합니다.
- 금액을 포함한 응답 객체는 유지하며 시간은 한국 시간으로 표시합니다. 실패 통계는 0입니다.
- 앱의 mock 데이터와 fallback은 제거했습니다. 테스트 코드의 응답 대체는 브라우저 검증에만 사용됩니다.
- URL 카드 주소는 임시 주소이며 `App.jsx`의 `rankingUrl`, `graphUrl`에서 관리합니다. 기존 복사·열기 동작은 유지합니다.

## 검증

```bash
npm run build
npm run format:check
npm test
```

Playwright는 설치된 Microsoft Edge와 로컬 Vite 서버를 사용합니다. 로그인 요청 형식, 사용자별 조회, 비밀번호 저장 방지, 새로고침 유지, 오류 복구, 대기→완료 갱신, 로그아웃 시 갱신 중단, 로딩·빈 목록·모바일 배치를 검증합니다.

운영 확인: 실제 계정으로 로그인 → 사용자 ID와 내역 확인 → 외부에서 후원 완료 처리 → 다음 갱신에서 완료 배지 확인 → 로그아웃. 자동 테스트는 API 응답을 대체하므로 실제 계정의 운영 서버 인증 성공 여부는 별도 확인이 필요합니다.
````
