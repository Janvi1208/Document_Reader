import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { getAnalytics } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, FileUp, Package, Activity } from 'lucide-react';

const COLORS = ['#00d4aa', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const statusLabels = {
  approved: 'Approved',
  pending_review: 'Pending',
  needs_review: 'Needs Review',
  rejected: 'Rejected'
};

const statusColors = {
  approved: '#22c55e',
  pending_review: '#00d4aa',
  needs_review: '#f59e0b',
  rejected: '#ef4444'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--accent)' }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAnalytics().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Operational analytics & insights</div>
      </div>
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  const { summary = {}, shiftSummary = [], machineSummary = [], dailyTrend = [], recentUploads = [], statusDist = [], topWorkOrders = [] } = data || {};

  const pieData = statusDist.map(s => ({ name: statusLabels[s.status] || s.status, value: s.count, color: statusColors[s.status] || '#7a8799' }));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Manufacturing operational analytics & insights</div>
      </div>
      <div className="page-content">

        {/* Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-accent">
            <div className="stat-label">Total Uploads</div>
            <div className="stat-value">{summary.totalUploads || 0}</div>
            <div className="stat-change flex items-center gap-2" style={{ marginTop: 8 }}>
              <FileUp size={12} /> Documents processed
            </div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-label">Approved</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.approvedRecords || 0}</div>
            <div className="stat-change">Records signed off</div>
          </div>
          <div className="stat-card stat-warn">
            <div className="stat-label">Needs Review</div>
            <div className="stat-value" style={{ color: 'var(--warn)' }}>{summary.needsReview || 0}</div>
            <div className="stat-change">Requires attention</div>
          </div>
          <div className="stat-card stat-error">
            <div className="stat-label">Validation Fails</div>
            <div className="stat-value" style={{ color: 'var(--error)' }}>{summary.validationFailures || 0}</div>
            <div className="stat-change">With issues</div>
          </div>
          <div className="stat-card stat-accent">
            <div className="stat-label">Total Quantity</div>
            <div className="stat-value">{(summary.totalQty || 0).toLocaleString()}</div>
            <div className="stat-change">Units produced</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Qty / Record</div>
            <div className="stat-value">{summary.avgQty || 0}</div>
            <div className="stat-change">Average production</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Daily trend */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📈 Daily Production Trend</div>
              <span className="badge badge-neutral">Last 30 days</span>
            </div>
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="total_qty" stroke="var(--accent)" strokeWidth={2} dot={false} name="Qty" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Activity size={28} />
                <p style={{ marginTop: 8 }}>No trend data yet</p>
              </div>
            )}
          </div>

          {/* Status pie */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔵 Record Status</div>
            </div>
            {pieData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ResponsiveContainer width="60%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {pieData.map((e, i) => (
                    <div key={i} className="flex items-center gap-2" style={{ marginBottom: 8, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-muted)', flex: 1 }}>{e.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>No data yet</div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid-2" style={{ marginBottom: 20 }}>
          {/* Shift summary */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔄 Shift-wise Summary</div>
            </div>
            {shiftSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={shiftSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="shift" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_qty" fill="var(--accent)" name="Quantity" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>No shift data</div>
            )}
          </div>

          {/* Machine summary */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚙️ Machine-wise Summary</div>
            </div>
            {machineSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={machineSummary.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="machine_number" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_qty" fill="#3b82f6" name="Quantity" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>No machine data</div>
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🕐 Recent Uploads</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>View All</button>
          </div>
          {recentUploads.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Work Order</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUploads.map(u => (
                    <tr key={u.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{u.original_name}</td>
                      <td className="mono">{u.work_order_number || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <StatusBadge status={u.record_status || u.status} />
                      </td>
                      <td>
                        {u.record_id && (
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/records/${u.record_id}`)}>
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FileUp size={32} />
              <h3>No uploads yet</h3>
              <p>Upload your first document to get started</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/upload')}>Upload Document</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    approved: 'badge-success',
    pending_review: 'badge-accent',
    needs_review: 'badge-warn',
    rejected: 'badge-error',
    processed: 'badge-accent',
    failed: 'badge-error',
    processing: 'badge-neutral'
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{statusLabels[status] || status}</span>;
}
