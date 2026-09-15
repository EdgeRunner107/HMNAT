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
