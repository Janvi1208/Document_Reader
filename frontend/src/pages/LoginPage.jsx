import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../utils/api.js';
import { useAuth } from '../utils/AuthContext.jsx';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      signIn(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#00d4aa" fillOpacity="0.15"/>
              <path d="M7 14L12 9L17 14L22 9" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 19L12 14L17 19L22 14" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </svg>
          </div>
          <div style={styles.logoText}>BiztelAI</div>
          <div style={styles.logoSub}>Workflow Automation</div>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account to continue</p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ ...styles.input, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={styles.eyeBtn}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading
              ? <><span style={styles.spinner} /> Signing in...</>
              : <><LogIn size={16} /> Sign In</>
            }
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>Don't have an account?</span>
        </div>

        <Link to="/register" style={styles.registerLink}>
          Create a new account →
        </Link>

        <div style={styles.demoBox}>
          <div style={styles.demoTitle}>Demo credentials</div>
          <div style={styles.demoRow}>
            <span style={styles.demoLabel}>Email</span>
            <code style={styles.demoVal} onClick={() => setEmail('demo@biztelai.com')} title="Click to fill">demo@biztelai.com</code>
          </div>
          <div style={styles.demoRow}>
            <span style={styles.demoLabel}>Password</span>
            <code style={styles.demoVal} onClick={() => setPassword('demo1234')} title="Click to fill">demo1234</code>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>Click values to auto-fill · Register first to create demo account</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
    opacity: 0.4,
    pointerEvents: 'none',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
  },
  logoWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28,
  },
  logoIcon: { marginBottom: 10 },
  logoText: {
    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px',
  },
  logoSub: {
    fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 2,
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6, textAlign: 'center',
  },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, textAlign: 'center' },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20,
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  },
  formGroup: { marginBottom: 18, width: '100%' },
  label: {
    display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.7px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 7,
  },
  input: {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
    padding: '11px 14px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4,
    display: 'flex', alignItems: 'center',
  },
  submitBtn: {
    width: '100%', background: 'var(--accent)', color: '#0a0c0f',
    border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700,
    fontFamily: 'var(--font-body)', cursor: 'pointer', marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.15s',
  },
  spinner: {
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #0a0c0f',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
  divider: { margin: '24px 0 16px', width: '100%', textAlign: 'center' },
  dividerText: { fontSize: 13, color: 'var(--text-muted)' },
  registerLink: {
    color: 'var(--accent)', fontSize: 13, fontWeight: 600,
    textDecoration: 'none', marginBottom: 24,
  },
  demoBox: {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '12px 16px', width: '100%', marginTop: 8,
  },
  demoTitle: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--font-mono)' },
  demoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  demoLabel: { fontSize: 12, color: 'var(--text-muted)' },
  demoVal: {
    fontSize: 12, color: 'var(--accent)', background: 'var(--accent-dim)',
    padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-mono)',
  },
};
