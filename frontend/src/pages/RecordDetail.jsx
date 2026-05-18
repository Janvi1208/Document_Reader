import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle, AlertTriangle, FileImage, Eye } from 'lucide-react';
import { getRecord, updateRecord, updateRecordStatus, getFileUrl } from '../utils/api.js';

const FIELDS = [
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'shift', label: 'Shift', type: 'select', options: ['A', 'B', 'C', 'Day', 'Night', 'Morning', 'Evening'], required: true },
  { key: 'employee_number', label: 'Employee Number', type: 'text', required: true },
  { key: 'operator_name', label: 'Operator Name', type: 'text' },
  { key: 'operation_code', label: 'Operation Code', type: 'text' },
  { key: 'machine_number', label: 'Machine Number', type: 'text', required: true },
  { key: 'work_order_number', label: 'Work Order Number', type: 'text', required: true },
  { key: 'product_code', label: 'Product Code', type: 'text' },
  { key: 'quantity_produced', label: 'Quantity Produced', type: 'number', required: true },
  { key: 'time_taken', label: 'Time Taken (hours)', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

function confColor(val) {
  if (val >= 0.75) return '#22c55e';
  if (val >= 0.5) return '#f59e0b';
  return '#ef4444';
}

const STATUS_BADGE = { pending_review: 'badge-accent', needs_review: 'badge-warn', approved: 'badge-success', rejected: 'badge-error' };
const STATUS_LABELS = { pending_review: 'Pending Review', needs_review: 'Needs Review', approved: 'Approved', rejected: 'Rejected' };

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [showDoc, setShowDoc] = useState(false);

  useEffect(() => {
    getRecord(id).then(r => {
      setRecord(r.data);
      setForm(buildForm(r.data));
      setLoading(false);
    });
  }, [id]);

  const buildForm = (rec) => {
    const f = {};
    FIELDS.forEach(({ key }) => { f[key] = rec[key] ?? ''; });
    return f;
  };

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await updateRecord(id, form);
      setRecord(res.data.record);
      setValidationResult(res.data.validation);
      setStatusMsg({ type: 'success', text: 'Record saved successfully' });
    } catch (e) {
      setStatusMsg({ type: 'error', text: e.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status) => {
    setSaving(true);
    try {
      await updateRecordStatus(id, status, 'reviewer');
      const res = await getRecord(id);
      setRecord(res.data);
      setForm(buildForm(res.data));
      setStatusMsg({ type: 'success', text: `Record marked as ${STATUS_LABELS[status]}` });
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Status update failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-title">Record Detail</div></div>
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    </div>
  );

  if (!record) return (
    <div className="page-content">
      <div className="alert alert-error">Record not found</div>
    </div>
  );

  const validationErrors = validationResult?.errors || tryParse(record.validation_errors, []).filter(e => e.severity === 'error');
  const validationWarnings = validationResult?.warnings || tryParse(record.validation_errors, []).filter(e => e.severity === 'warning');
  const confidence = record.confidence_scores || {};

  const getFieldIssue = (key) => {
    const errs = validationErrors.filter(e => e.field === key);
    const warns = validationWarnings.filter(w => w.field === key);
    return { error: errs[0], warn: warns[0] };
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={13} /> Back
          </button>
          <div>
            <div className="page-title">Record Review</div>
            <div className="page-subtitle mono" style={{ fontSize: 12 }}>
              {record.work_order_number || 'No work order'} · {record.filename || ''}
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[record.status] || 'badge-neutral'} ml-auto`} style={{ marginLeft: 'auto' }}>
            {STATUS_LABELS[record.status] || record.status}
          </span>
        </div>
      </div>

      <div className="page-content">
        {/* Status message */}
        {statusMsg && (
          <div className={`alert alert-${statusMsg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>
            {statusMsg.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {statusMsg.text}
          </div>
        )}

        {/* Validation summary */}
        {(validationErrors.length > 0 || validationWarnings.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            {validationErrors.length > 0 && (
              <div className="alert alert-error">
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <div>
                  <strong>{validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} require attention:</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                    {validationErrors.map((e, i) => <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>{e.message}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="alert alert-warn">
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <div>
                  <strong>{validationWarnings.length} warning{validationWarnings.length > 1 ? 's' : ''}:</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                    {validationWarnings.map((w, i) => <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>{w.message}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📝 Edit Record</div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                Last updated: {record.updated_at ? new Date(record.updated_at).toLocaleString() : '—'}
              </span>
            </div>

            {FIELDS.map(({ key, label, type, options, required }) => {
              const { error, warn } = getFieldIssue(key);
              const conf = confidence[key];
              return (
                <div key={key} className="form-group">
                  <label>
                    {label} {required && <span style={{ color: 'var(--error)' }}>*</span>}
                    {conf !== undefined && (
                      <span style={{ float: 'right', color: confColor(conf), fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        {Math.round(conf * 100)}% confidence
                      </span>
                    )}
                  </label>
                  {type === 'select' ? (
                    <select
                      value={form[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className={error ? 'error' : warn ? 'warn' : ''}
                    >
                      <option value="">— select —</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={form[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      style={{ resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      type={type}
                      value={form[key] ?? ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className={error ? 'error' : warn ? 'warn' : ''}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      step={type === 'number' ? '0.01' : undefined}
                    />
                  )}
                  {error && <div className="field-error">⚠ {error.message}</div>}
                  {!error && warn && <div className="field-warn">△ {warn.message}</div>}
                </div>
              );
            })}

            {/* Action buttons */}
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
              {record.status !== 'approved' && (
                <button className="btn btn-success" onClick={() => handleStatus('approved')} disabled={saving}>
                  <CheckCircle size={14} /> Approve
                </button>
              )}
              {record.status !== 'rejected' && (
                <button className="btn btn-danger" onClick={() => handleStatus('rejected')} disabled={saving}>
                  <XCircle size={14} /> Reject
                </button>
              )}
              {(record.status === 'approved' || record.status === 'rejected') && (
                <button className="btn btn-secondary" onClick={() => handleStatus('pending_review')} disabled={saving}>
                  Reset to Pending
                </button>
              )}
            </div>
          </div>

          {/* Document + metadata */}
          <div>
            {/* Document preview */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">📄 Source Document</div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDoc(s => !s)}
                >
                  <Eye size={12} /> {showDoc ? 'Hide' : 'Show'}
                </button>
              </div>
              {showDoc && record.upload_id && (
                record.file_type === 'application/pdf' ? (
                  <embed src={getFileUrl(record.upload_id)} type="application/pdf" className="pdf-embed" />
                ) : (
                  <img src={getFileUrl(record.upload_id)} alt="Source document" className="doc-preview" />
                )
              )}
              {!showDoc && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                  Click "Show" to preview the original uploaded document
                </div>
              )}
            </div>

            {/* Confidence scores */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">🎯 AI Confidence Scores</div>
              </div>
              {Object.keys(confidence).length > 0 ? (
                <div>
                  {Object.entries(confidence).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.replace(/_/g, ' ')}</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(v*100)}%`, background: confColor(v), borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: confColor(v), fontFamily: 'var(--font-mono)', minWidth: 34, textAlign: 'right' }}>{Math.round(v*100)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No confidence data available</div>
              )}
            </div>

            {/* Metadata */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">ℹ️ Record Metadata</div>
              </div>
              {[
                ['Record ID', record.id],
                ['Upload ID', record.upload_id],
                ['Created', record.created_at ? new Date(record.created_at).toLocaleString() : '—'],
                ['Reviewed By', record.reviewed_by || '—'],
                ['Reviewed At', record.reviewed_at ? new Date(record.reviewed_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="mono" style={{ color: 'var(--text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function tryParse(val, fallback) {
  try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}
