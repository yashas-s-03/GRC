import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutTemplate, CheckCircle, XCircle, AlertTriangle, ArrowRight, Trophy, Zap, Search, Share2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function StatusIcon({ status }) {
  if (status === 'pass') return <CheckCircle size={18} color="#10b981" />
  if (status === 'warning') return <AlertTriangle size={18} color="#f59e0b" />
  if (status === 'fail') return <XCircle size={18} color="#ef4444" />
  return <span style={{ color: '#64748b' }}>-</span>
}

export default function ComparePage({ showToast }) {
  const [searchParams] = useSearchParams()
  const initialA = searchParams.get('a') || searchParams.get('domain') || ''
  const initialB = searchParams.get('b') || ''
  const navigate = useNavigate()
  
  const [domain1, setDomain1] = useState(initialA)
  const [domain2, setDomain2] = useState(initialB)
  const [isScanning, setIsScanning] = useState(false)
  const [scan1, setScan1] = useState(null)
  const [scan2, setScan2] = useState(null)
  
  const [pct1, setPct1] = useState(0)
  const [pct2, setPct2] = useState(0)
  const es1Ref = useRef(null)
  const es2Ref = useRef(null)

  useEffect(() => { return () => { es1Ref.current?.close(); es2Ref.current?.close(); } }, [])

  useEffect(() => {
    if (initialA && initialB) {
      handleCompare()
    }
  }, [])

  const startStream = (url, setScan, setPct, esRef) => {
    return new Promise((resolve, reject) => {
      if (!url) { resolve(); return; }
      const es = new EventSource(`${API}/api/scan/stream?url=${encodeURIComponent(url)}`)
      esRef.current = es
      let checksCount = 0
      es.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.type === 'error') {
          showToast?.(`Error scanning ${url}: ${data.message}`, 'error')
          es.close()
          reject(data.message)
        } else if (data.type === 'check') {
          checksCount++
          setPct(Math.min(99, Math.round((checksCount / 25) * 100)))
        } else if (data.type === 'done') {
          setPct(100)
          setScan(data)
          es.close()
          resolve()
        }
      }
      es.onerror = () => { es.close(); reject('Connection lost'); }
    })
  }

  const handleCompare = async (e) => {
    e?.preventDefault();
    if (!domain1 || !domain2) return showToast?.('Please enter two domains to compare.', 'warning')
    setIsScanning(true)
    setScan1(null)
    setScan2(null)
    setPct1(0)
    setPct2(0)
    
    if (domain1 && domain2) {
      window.history.pushState(null, '', `?a=${domain1}&b=${domain2}`)
    }

    try {
      await Promise.allSettled([
        startStream(domain1, setScan1, setPct1, es1Ref),
        startStream(domain2, setScan2, setPct2, es2Ref)
      ])
    } catch (err) {
      console.error(err)
    } finally {
      setIsScanning(false)
    }
  }

  const bothDone = scan1 && scan2;

  return (
    <div className="animate-fade-up" style={{ minHeight: '100vh', padding: '4rem 1.5rem', background: '#0a0a0f' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', color: '#a78bfa', marginBottom: '1rem' }}>
            <LayoutTemplate size={24} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1rem' }}>Compare Trust Scores</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
            Run side-by-side GRCU evaluations for two domains to benchmark security posture.
          </p>
        </div>

        <form onSubmit={handleCompare} style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
              <input value={domain1} onChange={e => setDomain1(e.target.value)} placeholder="yourcompany.com" className="input-base" style={{ paddingLeft: '2.8rem', height: '3.5rem', fontSize: '1rem' }} required />
            </div>
            <div style={{ color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>VS</div>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a78bfa' }} />
              <input value={domain2} onChange={e => setDomain2(e.target.value)} placeholder="competitor.com" className="input-base" style={{ paddingLeft: '2.8rem', height: '3.5rem', fontSize: '1rem' }} required />
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button type="submit" className="btn-primary" disabled={isScanning} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              {isScanning ? <Zap size={18} className="animate-pulse" /> : <LayoutTemplate size={18} />}
              {isScanning ? 'Scanning Both Targets...' : 'Compare Domains'}
            </button>
          </div>
        </form>

        {isScanning && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '0.5rem' }}>{domain1}</div>
              <div style={{ background: '#1e1e2e', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct1}%`, background: '#6366f1', height: '100%', transition: 'width 0.3s' }} />
              </div>
            </div>
            <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '0.5rem' }}>{domain2}</div>
              <div style={{ background: '#1e1e2e', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct2}%`, background: '#a78bfa', height: '100%', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {bothDone && (
          <div className="animate-fade-up">
            
            <div className="mb-8 p-6 rounded-2xl border flex items-center justify-between mx-auto"
                 style={{
                   marginBottom: '2rem', padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   background: scan1.scores.total === scan2.scores.total 
                     ? '#1e1e2e' 
                     : scan1.scores.total > scan2.scores.total ? 'rgba(99,102,241,0.1)' : 'rgba(167,139,250,0.1)',
                   border: `1px solid ${scan1.scores.total === scan2.scores.total 
                     ? '#2e2e3e' 
                     : scan1.scores.total > scan2.scores.total ? 'rgba(99,102,241,0.3)' : 'rgba(167,139,250,0.3)'}`,
                 }}>
              <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Trophy size={32} color={scan1.scores.total === scan2.scores.total ? '#94a3b8' : scan1.scores.total > scan2.scores.total ? '#818cf8' : '#c084fc'} />
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: 0, marginBottom: '0.2rem' }}>
                    {scan1.scores.total === scan2.scores.total 
                      ? "It's a Tie!" 
                      : `${scan1.scores.total > scan2.scores.total ? scan1.domain : scan2.domain} Wins`}
                  </h2>
                  <p className="text-sm text-slate-400" style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
                    {scan1.scores.total === scan2.scores.total 
                      ? "Both domains have an identical Trust Score."
                      : "Higher overall security and compliance posture."}
                  </p>
                </div>
              </div>
              <button className="btn-secondary flex items-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast?.('Compare link copied!', 'success');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'transparent', border: '1px solid #2e2e3e', color: '#f8fafc', borderRadius: '0.75rem', cursor: 'pointer' }}
              >
                <Share2 size={16} /> Copy Compare Link
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {[scan1, scan2].map((s, i) => (
                <div key={i} style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                  {((i === 0 && scan1.scores.total > scan2.scores.total) || (i === 1 && scan2.scores.total > scan1.scores.total)) && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem 1rem', borderBottomLeftRadius: '1rem', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Trophy size={14} /> WINNER
                    </div>
                  )}
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem' }}>{s.domain}</h2>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: 800, color: i === 0 ? '#6366f1' : '#a78bfa', lineHeight: 1 }}>{s.scores.total}</span>
                    <span style={{ color: '#64748b', fontSize: '1.2rem' }}>/100</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Governance</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>{s.scores.governance || 0}/30</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Risk</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>{s.scores.risk || 0}/40</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Compliance</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>{s.scores.compliance || 0}/30</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>User Trust</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>{s.scores.userTrust || 0}/20</div>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate(`/report/${s.scanId}`)}>
                    View Full Report <ArrowRight size={15} />
                  </button>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', marginTop: '3rem' }}>Feature Breakdown</h3>
            <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e1e2e' }}>
                    <th style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Security Check</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#6366f1', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{scan1.domain}</th>
                    <th style={{ padding: '1rem 1.5rem', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{scan2.domain}</th>
                  </tr>
                </thead>
                <tbody>
                  {scan1.checks.map((c1, idx) => {
                    const c2 = scan2.checks.find(x => x.id === c1.id) || {}
                    return (
                      <tr key={c1.id} style={{ borderBottom: idx === scan1.checks.length - 1 ? 'none' : '1px solid #1e1e2e' }}>
                        <td style={{ padding: '1rem 1.5rem', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 500 }}>{c1.name}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <StatusIcon status={c1.status} /> 
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{c1.status}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <StatusIcon status={c2.status} />
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{c2.status}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
