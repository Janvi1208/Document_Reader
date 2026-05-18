import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../utils/api.js';
import { useAuth } from '../utils/AuthContext.jsx';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const strength = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await register(name, email, password);
      signIn(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checks = [
    { label: 'At least 6 characters', ok: password.length >= 6 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];

  return (
    <div style={styles.bg}>
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

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Get started with BiztelAI for free</p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Smith"
              required
              style={styles.input}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                style={{ ...styles.input, paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={styles.eyeBtn}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength ? strengthColor[strength] : 'var(--border)',
                      transition: 'background 0.2s'
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: strengthColor[strength], fontFamily: 'var(--font-mono)' }}>
                  {strengthLabel[strength]}
                </div>
                <div style={{ marginTop: 8 }}>
                  {checks.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 size={12} style={{ color: c.ok ? '#22c55e' : 'var(--text-dim)', transition: 'color 0.2s' }} />
                      <span style={{ fontSize: 11, color: c.ok ? 'var(--text-muted)' : 'var(--text-dim)' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
              style={{
                ...styles.input,
                borderColor: confirm.length > 0
                  ? confirm === password ? '#22c55e' : '#ef4444'
                  : undefined
              }}
            />
            {confirm.length > 0 && confirm !== password && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passwords do not match</div>
            )}
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading
              ? <><span style={styles.spinner} /> Creating account...</>
              : <><UserPlus size={16} /> Create Account</>
            }
          </button>
        </form>

        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: '100vh', background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, position: 'relative', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
    backgroundSize: '40px 40px', opacity: 0.4, pointerEvents: 'none',
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
    borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1,
  },
  logoWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 },
  logoIcon: { marginBottom: 10 },
  logoText: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' },
  logoSub: { fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 2 },
  title: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, textAlign: 'center' },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20,
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  },
  formGroup: { marginBottom: 18, width: '100%' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 7 },
  input: {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)',
    padding: '11px 14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
  },
  submitBtn: {
    width: '100%', background: 'var(--accent)', color: '#0a0c0f',
    border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700,
    fontFamily: 'var(--font-body)', cursor: 'pointer', marginTop: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s',
  },
  spinner: {
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #0a0c0f',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },
};
