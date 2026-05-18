import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Upload, FileImage, FileText, CheckCircle, AlertTriangle, XCircle, Eye } from 'lucide-react';
import { uploadDocument, getFileUrl } from '../utils/api.js';

const CONF_THRESHOLD_LOW = 0.5;
const CONF_THRESHOLD_MED = 0.75;

function confColor(val) {
  if (val >= CONF_THRESHOLD_MED) return '#22c55e';
  if (val >= CONF_THRESHOLD_LOW) return '#f59e0b';
  return '#ef4444';
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="confidence-bar">
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${pct}%`, background: confColor(value) }} />
      </div>
      <span style={{ color: confColor(value), fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

export default function UploadPage() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl({ url, type: file.type, name: file.name });
    setResult(null);
    setError(null);
    setProcessing(true);
    setStage('Uploading file...');
    setProgress(10);

    try {
      setStage('Running AI extraction...');
      setProgress(30);
      const res = await uploadDocument(file, (p) => setProgress(10 + p * 0.3));
      setProgress(80);
      setStage('Running validation...');
      await new Promise(r => setTimeout(r, 400));
      setProgress(100);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setProcessing(false);
      setStage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: processing
  });

  const fields = result?.record ? [
    ['date', 'Date'],
    ['shift', 'Shift'],
    ['employee_number', 'Employee No.'],
    ['operator_name', 'Operator Name'],
    ['operation_code', 'Operation Code'],
    ['machine_number', 'Machine No.'],
    ['work_order_number', 'Work Order No.'],
    ['product_code', 'Product Code'],
    ['quantity_produced', 'Quantity Produced'],
    ['time_taken', 'Time Taken (hrs)'],
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Upload Document</div>
        <div className="page-subtitle">Upload handwritten or scanned operational documents for AI-powered extraction</div>
      </div>
      <div className="page-content">

        {/* Dropzone */}
        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
          <div>
            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`} style={{ opacity: processing ? 0.5 : 1 }}>
              <input {...getInputProps()} />
              <div className="dropzone-icon">
                <Upload size={40} />
              </div>
              <div className="dropzone-title">{isDragActive ? 'Drop it here!' : 'Drop your document here'}</div>
              <div className="dropzone-sub">Supports JPG, PNG, WEBP, PDF · Max 20MB</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} type="button" disabled={processing}>
                <Upload size={14} /> Browse Files
              </button>
            </div>

            {/* Processing state */}
            {processing && (
              <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{ marginBottom: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>{stage}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Please wait, AI is analyzing the document...</div>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{progress}%</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>
                <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <div><strong>Processing failed:</strong> {error}</div>
              </div>
            )}

            {/* Document preview */}
            {previewUrl && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">
                  <div className="card-title">📄 Document Preview</div>
                </div>
                {previewUrl.type === 'application/pdf' ? (
                  <embed src={previewUrl.url} type="application/pdf" className="pdf-embed" />
                ) : (
                  <img src={previewUrl.url} alt="Preview" className="doc-preview" />
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{previewUrl.name}</div>
              </div>
            )}
          </div>

          {/* Extraction Result */}
          {result && (
            <div>
              {/* Validation summary */}
              <div style={{ marginBottom: 16 }}>
                {result.validation?.errors?.length > 0 && (
                  <div className="alert alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>{result.validation.errors.length} validation error{result.validation.errors.length > 1 ? 's' : ''}</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                        {result.validation.errors.map((e, i) => <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>{e.message}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                {result.validation?.warnings?.length > 0 && (
                  <div className="alert alert-warn">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>{result.validation.warnings.length} warning{result.validation.warnings.length > 1 ? 's' : ''}</strong>
                      <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                        {result.validation.warnings.map((w, i) => <li key={i} style={{ fontSize: 12, marginBottom: 2 }}>{w.message}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                {result.extraction_error && (
                  <div className="alert alert-error">
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>AI Extraction Failed</strong>
                      <div style={{ marginTop: 4, fontSize: 12 }}>{result.extraction_error}</div>
                      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>
                        Check that your API key is set correctly in <code>backend/.env</code>
                      </div>
                    </div>
                  </div>
                )}
                {!result.validation?.errors?.length && !result.extraction_error && (
                  <div className="alert alert-success">
                    <CheckCircle size={16} />
                    <div>Document processed successfully — no critical errors found</div>
                  </div>
                )}
              </div>

              {/* Extracted fields */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">🤖 Extracted Data</div>
                  <span className="badge badge-accent">AI Extracted</span>
                </div>
                <div>
                  {fields.map(([key, label]) => {
                    const val = result.record?.[key];
                    const conf = result.confidence_scores?.[key];
                    const hasError = result.validation?.errors?.some(e => e.field === key);
                    const hasWarn = result.validation?.warnings?.some(w => w.field === key);
                    return (
                      <div key={key} style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border)',
                        background: hasError ? 'rgba(239,68,68,0.04)' : hasWarn ? 'rgba(245,158,11,0.04)' : 'transparent',
                        borderRadius: 4,
                        paddingLeft: (hasError || hasWarn) ? 8 : 0,
                        marginBottom: 2
                      }}>
                        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                            {hasError && <span style={{ fontSize: 10, color: 'var(--error)' }}>● error</span>}
                            {!hasError && hasWarn && <span style={{ fontSize: 10, color: 'var(--warn)' }}>● warning</span>}
                          </div>
                          {conf !== undefined && <ConfidenceBar value={conf} />}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: val !== null && val !== undefined ? 'var(--text)' : 'var(--text-dim)' }}>
                          {val !== null && val !== undefined ? String(val) : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2" style={{ marginTop: 20 }}>
                  <button className="btn btn-primary" onClick={() => navigate(`/records/${result.recordId}`)}>
                    <Eye size={14} /> Review & Edit
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setResult(null); setPreviewUrl(null); }}>
                    Upload Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
