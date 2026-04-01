import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Clock, RefreshCw, Eye, History } from 'lucide-react'

import API from '../config'

function gradeColor(grade) {
  return grade === 'A' ? '#22c55e' : grade === 'B' ? '#6366f1' : grade === 'C' ? '#f59e0b' : '#ef4444'
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/history`)
      .then(r => r.json())
      .then(d => { setHistory(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setError('Could not reach the scanner server.'); setLoading(false) })
  }, [])

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <div style={{ width: 44, height: 44, background: '#6366f120', border: '1px solid #6366f140', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={22} color="#6366f1" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>Recent Scans</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Your last 10 scans this session</p>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Loading history...</div>}

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #ef444440', borderRadius: '0.75rem', padding: '1rem 1.25rem', color: '#fca5a5', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          {error} — is the server running on port 3001?
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div style={{ width: 72, height: 72, background: '#1e1e2e', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Clock size={32} color="#64748b" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>No scans yet this session</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>Scan results appear here as you run them. They reset when the server restarts.</p>
          <button className="btn-primary" onClick={() => navigate('/scan')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} /> Scan your first site
          </button>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
          {history.map((item) => {
            const c = gradeColor(item.grade)
            return (
              <div key={item.scanId} className="card-hover" style={{
                background: '#12121a', border: '1px solid #1e1e2e',
                borderRadius: '1rem', padding: '1.25rem 1.5rem',
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                {/* Favicon */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
                  alt="" width={20} height={20}
                  style={{ borderRadius: 4, flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }}
                />

                {/* Domain */}
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc', flex: 1, minWidth: 120 }}>
                  {item.domain}
                </span>

                {/* Score */}
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: c, minWidth: 56, textAlign: 'right' }}>
                  {item.score}<span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.8rem' }}>/100</span>
                </span>

                {/* Grade badge */}
                <div style={{ width: 32, height: 32, borderRadius: 8, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: 'white', flexShrink: 0 }}>
                  {item.grade}
                </div>

                {/* Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b', fontSize: '0.78rem', minWidth: 80 }}>
                  <Clock size={12} />
                  {relativeTime(item.scannedAt)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" onClick={() => navigate(`/report/${item.scanId}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
                    <Eye size={13} /> View
                  </button>
                  <button className="btn-secondary" onClick={() => navigate(`/scan?url=${encodeURIComponent('https://' + item.domain)}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                    <RefreshCw size={13} /> Rescan
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
