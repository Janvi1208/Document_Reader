import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, History, LogOut, Cpu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProviderInfo } from './utils/api.js';
import { AuthProvider, useAuth } from './utils/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadPage from './pages/UploadPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import RecordDetail from './pages/RecordDetail.jsx';
import UploadsHistory from './pages/UploadsHistory.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/records', label: 'Records', icon: FileText },
  { to: '/history', label: 'History', icon: History },
];

function ProtectedLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">BiztelAI</div>
          <div className="logo-sub">Workflow Automation</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon />{label}
            </NavLink>
          ))}
        </nav>
        {/* AI Provider badge */}
        <ProviderBadge />
        <div style={{ padding: '12px 12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 6,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)',
              border: '1px solid var(--accent)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              flexShrink: 0, fontFamily: 'var(--font-display)',
            }}>{initials}</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{user.role}</div>
            </div>
          </div>
          <button onClick={() => { signOut(); navigate('/login'); }}
            className="nav-item" style={{ color: 'var(--error)', marginBottom: 0 }}>
            <LogOut size={14} />Sign Out
          </button>
        </div>
        <div className="sidebar-version">v1.0.0 · BiztelAI 2025</div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/history" element={<UploadsHistory />} />
        </Routes>
      </main>
    </div>
  );
}

function ProviderBadge() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    getProviderInfo().then(r => setInfo(r.data)).catch(() => {});
  }, []);
  if (!info) return null;
  const colors = { anthropic: '#a78bfa', gemini: '#60a5fa', groq: '#34d399', none: '#ef4444' };
  const color = colors[info.provider] || '#7a8799';
  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 7, background: 'var(--bg)', border: `1px solid ${color}22` }}>
        <Cpu size={12} style={{ color, flexShrink: 0 }} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {info.provider === 'none' ? 'No AI configured' : info.provider}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.model}</div>
        </div>
        {!info.supportsPDF && info.provider !== 'none' && (
          <span title="Images only — no PDF support" style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'var(--font-mono)', background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: 3 }}>img only</span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}
