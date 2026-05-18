import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileImage, FileText, RefreshCw } from 'lucide-react';
import { getUploads } from '../utils/api.js';

const STATUS_BADGE = { processed: 'badge-accent', failed: 'badge-error', processing: 'badge-neutral' };
const RECORD_STATUS_BADGE = { pending_review: 'badge-accent', needs_review: 'badge-warn', approved: 'badge-success', rejected: 'badge-error' };
const RECORD_STATUS_LABELS = { pending_review: 'Pending Review', needs_review: 'Needs Review', approved: 'Approved', rejected: 'Rejected' };

export default function UploadsHistory() {
  const [uploads, setUploads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    getUploads({ search, page, limit })
      .then(r => { setUploads(r.data.uploads); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)}KB`;
    return `${(bytes/1024/1024).toFixed(1)}MB`;
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="page-title">Upload History</div>
            <div className="page-subtitle">All uploaded documents · {total} total</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="filters-row">
          <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <Search />
            <input
              placeholder="Search by filename, work order, machine..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : uploads.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <h3>No uploads yet</h3>
              <p>Upload your first document to get started</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/upload')}>
                Upload Document
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Work Order</th>
                    <th>Machine</th>
                    <th>Upload Date</th>
                    <th>Upload Status</th>
                    <th>Record Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(u => (
                    <tr key={u.id}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-2">
                          {u.file_type?.startsWith('image/') ? <FileImage size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} /> : <FileText size={14} style={{ color: 'var(--warn)', flexShrink: 0 }} />}
                          <span className="mono" style={{ fontSize: 12 }}>{u.original_name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {u.file_type?.split('/')[1]?.toUpperCase() || '—'}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>{formatSize(u.file_size)}</td>
                      <td className="mono">{u.work_order_number || '—'}</td>
                      <td className="mono">{u.machine_number || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[u.status] || 'badge-neutral'}`}>{u.status}</span>
                      </td>
                      <td>
                        {u.record_status ? (
                          <span className={`badge ${RECORD_STATUS_BADGE[u.record_status] || 'badge-neutral'}`}>
                            {RECORD_STATUS_LABELS[u.record_status] || u.record_status}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {u.record_id && (
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/records/${u.record_id}`)}>
                            <Eye size={12} /> Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>‹</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = i+1;
              return <button key={p} className={`page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
