import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { getRecords } from '../utils/api.js';

const STATUS_OPTIONS = ['', 'pending_review', 'needs_review', 'approved', 'rejected'];
const STATUS_LABELS = { pending_review: 'Pending Review', needs_review: 'Needs Review', approved: 'Approved', rejected: 'Rejected' };
const STATUS_BADGE = { pending_review: 'badge-accent', needs_review: 'badge-warn', approved: 'badge-success', rejected: 'badge-error' };

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [shift, setShift] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    getRecords({ search, status, shift, page, limit })
      .then(r => { setRecords(r.data.records); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [search, status, shift, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Records</div>
            <div className="page-subtitle">All extracted operational records · {total} total</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Filters */}
        <div className="filters-row">
          <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
            <Search />
            <input
              placeholder="Search work orders, machines, employees..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input
            placeholder="Shift (A/B/C...)"
            value={shift}
            onChange={e => { setShift(e.target.value); setPage(1); }}
            style={{ width: 130 }}
          />
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <AlertTriangle size={32} />
              <h3>No records found</h3>
              <p>Try adjusting your filters or upload a document</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Machine</th>
                    <th>Employee</th>
                    <th>Quantity</th>
                    <th>Time (hrs)</th>
                    <th>Status</th>
                    <th>Issues</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => {
                    const issues = tryParse(r.validation_errors, []);
                    const errors = issues.filter(i => i.severity === 'error');
                    const warns = issues.filter(i => i.severity === 'warning');
                    return (
                      <tr key={r.id}>
                        <td className="mono">{r.work_order_number || '—'}</td>
                        <td>{r.date || '—'}</td>
                        <td><span className="badge badge-neutral">{r.shift || '—'}</span></td>
                        <td className="mono">{r.machine_number || '—'}</td>
                        <td className="mono">{r.employee_number || '—'}</td>
                        <td className="mono">{r.quantity_produced ?? '—'}</td>
                        <td className="mono">{r.time_taken ?? '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2 items-center">
                            {errors.length > 0 && (
                              <span style={{ color: 'var(--error)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                {errors.length}✕ err
                              </span>
                            )}
                            {warns.length > 0 && (
                              <span style={{ color: 'var(--warn)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                {warns.length}⚠ warn
                              </span>
                            )}
                            {!errors.length && !warns.length && <span style={{ color: 'var(--success)', fontSize: 11 }}>✓ ok</span>}
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/records/${r.id}`)}>
                            <Eye size={12} /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}

function tryParse(val, fallback) {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}
