import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Shield, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, RefreshCw, Copy, Check, Share2, Info, TrendingUp, TrendingDown, Minus, Download, LayoutTemplate, Lock
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import PDFReportTemplate from '../components/PDFReportTemplate'
import API from '../config'
function TrustBadge({ score, grade, domain, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="68" viewBox="0 0 220 68">
      <rect width="220" height="68" rx="10" fill="#0a0a0f"/>
      <rect width="220" height="68" rx="10" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7"/>
      <path d="M16 13 L24 11 L32 13 L32 22 C32 27 24 30 24 30 C24 30 16 27 16 22 Z" fill={color}/>
      <path d="M20 17 L22 19 L27 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <text x="40" y="24" fontFamily="Inter,system-ui,sans-serif" fontSize="10" fontWeight="600" fill="#94a3b8" letterSpacing="0.1em">TRUSTLENS</text>
      <text x="40" y="46" fontFamily="Inter,system-ui,sans-serif" fontSize="22" fontWeight="800" fill={color}>{score}<tspan fontSize="12" fontWeight="400" fill="#64748b">/100</tspan></text>
      <text x="40" y="60" fontFamily="Inter,system-ui,sans-serif" fontSize="9" fill="#475569">Verified by TrustLens</text>
      <circle cx="188" cy="34" r="22" fill={color} fillOpacity="0.15"/>
      <circle cx="188" cy="34" r="22" fill="none" stroke={color} strokeWidth="1.5"/>
      <text x="188" y="41" fontFamily="Inter,system-ui,sans-serif" fontSize="22" fontWeight="900" fill={color} textAnchor="middle">{grade}</text>
    </svg>
  );
}

// API Config imported at top
const CLIENT = window.location.origin

// ─── Score band (mirrors backend) ────────────────────────────────────────────

function getScoreBand(score) {
  if (score >= 85) return { grade: 'A', color: '#22c55e', label: 'Excellent', headline: 'Your site is in great shape. Keep it up.', subline: "You're in the top tier of startup security.", bgGlow: 'rgba(34,197,94,0.12)' }
  if (score >= 70) return { grade: 'B', color: '#6366f1', label: 'Good', headline: 'Solid foundation. A few things to tighten up.', subline: "You're above average. Here's what to fix next.", bgGlow: 'rgba(99,102,241,0.12)' }
  if (score >= 50) return { grade: 'C', color: '#f59e0b', label: 'Needs Work', headline: 'Your site has real vulnerabilities. Fix these now.', subline: "Users may not trust your site yet. Here's your plan.", bgGlow: 'rgba(245,158,11,0.12)' }
  return { grade: 'D', color: '#ef4444', label: 'At Risk', headline: 'Your site is at risk. Take action immediately.', subline: 'Critical issues found. Do not launch until fixed.', bgGlow: 'rgba(239,68,68,0.12)' }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) }
  catch { return iso }
}

function categoryNote(score, max) {
  const p = score / max
  if (p >= 0.85) return 'Strong posture — keep it up'
  if (p >= 0.65) return 'Solid, with room to improve'
  if (p >= 0.45) return 'Several gaps identified'
  return 'Significant issues require attention'
}

// ─── Components ───────────────────────────────────────────────────────────────

function SeverityBadge({ severity, small }) {
  const c = severity === 'critical' ? '#ef4444' : severity === 'medium' ? '#f59e0b' : '#64748b'
  return <span style={{ display: 'inline-block', padding: small ? '0.15rem 0.5rem' : '0.2rem 0.75rem', background: `${c}18`, border: `1px solid ${c}50`, borderRadius: 9999, color: c, fontWeight: 700, fontSize: small ? '0.62rem' : '0.72rem', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{severity}</span>
}

function StatusBadge({ status }) {
  const MAP = { pass: ['#22c55e', 'PASS'], fail: ['#ef4444', 'FAIL'], warning: ['#f59e0b', 'WARN'] }
  const [color, label] = MAP[status] || MAP.warning
  return <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 9999, color, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.06em' }}>{label}</span>
}

function ConfidenceTag({ confidence, note }) {
  if (!note) return null
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        style={{ background: 'none', border: 'none', cursor: 'help', padding: 0, display: 'flex', alignItems: 'center' }}>
        <Info size={13} color="#64748b" />
      </button>
      {show && (
        <div style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)', background: '#1e1e2e', border: '1px solid #2e2e3e', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: '180px', maxWidth: '260px', whiteSpace: 'normal', lineHeight: 1.5 }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem' }}>Low confidence</span>
          {note}
        </div>
      )}
    </div>
  )
}

function ScoreDial({ score, color }) {
  const [disp, setDisp] = useState(0)
  const size = 200, sw = 16
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (disp / 100) * circ

  useEffect(() => {
    let c = 0; const dur = 1500, st = Date.now()
    const tick = () => { const p = Math.min((Date.now() - st) / dur, 1); const e = 1 - Math.pow(1 - p, 3); setDisp(Math.round(e * score)); if (p < 1) requestAnimationFrame(tick) }
    const t = setTimeout(() => requestAnimationFrame(tick), 150)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e2e" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 16px ${color}80)`, transition: 'stroke-dashoffset 0.03s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '3rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{disp}</span>
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>/100</span>
      </div>
    </div>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 8, background: '#1e1e2e', borderRadius: 9999, overflow: 'hidden', marginTop: '0.5rem' }}>
      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: `linear-gradient(90deg,${color},${color}aa)`, boxShadow: `0 0 8px ${color}60`, transition: 'width 1s ease' }} />
    </div>
  )
}

function ActionCard({ item }) {
  const [open, setOpen] = useState(false)
  const bc = item.severity === 'critical' ? '#ef444428' : item.severity === 'medium' ? '#f59e0b28' : '#64748b18'
  return (
    <div style={{ background: '#12121a', border: `1px solid ${bc}`, borderRadius: '1rem', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <SeverityBadge severity={item.severity} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>{item.title}</span>
          </div>
          {item.pointsIfFixed > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 9999, padding: '0.15rem 0.6rem', color: '#22c55e', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>+{item.pointsIfFixed} pts if fixed</span>
              {item.amplified && <span style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 9999, padding: '0.15rem 0.6rem', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Multiplied Penalty Active</span>}
            </div>
          )}
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>{item.why}</p>
        <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} How to Fix
        </button>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #1e1e2e', padding: '1.25rem 1.5rem', background: '#0e0e1a' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {item.steps.map((s, i) => {
              const isCode = /[=:]|Content-Security|Strict-Transport|v=DMARC|v=spf1|nosniff|DENY|max-age|nginx|certbot/.test(s)
              return (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366f120', border: '1px solid #6366f140', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <span style={{ fontSize: '0.83rem', lineHeight: 1.6, fontFamily: isCode ? 'monospace' : 'inherit', color: isCode ? '#a78bfa' : '#94a3b8' }}>{s}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function RadarChart({ data }) {
  if (!data) return null
  const labels = ['Network', 'Email', 'App Sec', 'Data', 'Compliance'];
  const values = [data.networkSecurity||0, data.emailSecurity||0, data.appSecurity||0, data.dataProtection||0, data.complianceReadiness||0];
  
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 75;
  
  const getPoint = (val, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = (val / 20) * radius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  };
  
  const points = values.map(getPoint);
  
  const bgPolygons = [0.2, 0.4, 0.6, 0.8, 1].map(scale => {
    return [0,1,2,3,4].map(i => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `${cx + radius * scale * Math.cos(angle)},${cy + radius * scale * Math.sin(angle)}`;
    }).join(' ');
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {bgPolygons.map((pts, i) => (
          <polygon key={'bg'+i} points={pts} fill="none" stroke="#2e2e3e" strokeWidth="1" />
        ))}
        {[0, 1, 2, 3, 4].map(i => {
           const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
           return <line key={'l'+i} x1={cx} y1={cy} x2={cx + radius * Math.cos(angle)} y2={cy + radius * Math.sin(angle)} stroke="#2e2e3e" strokeWidth="1" />
        })}
        <polygon points={points.join(' ')} fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="2" style={{ transition: 'all 1s ease-out' }} />
        {points.map((pt, i) => {
          const [x, y] = pt.split(',');
          return <circle key={'c'+i} cx={x} cy={y} r="4" fill="#6366f1" />
        })}
      </svg>
      {labels.map((L, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = cx + (Math.max(radius, (values[i]/20)*radius) + 26) * Math.cos(angle);
        const y = cy + (Math.max(radius, (values[i]/20)*radius) + 16) * Math.sin(angle);
        return <div key={'txt'+i} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center' }}>
          {L}<br/><span style={{ color: '#f8fafc' }}>{values[i]}/20</span>
        </div>
      })}
    </div>
  )
}

function FilterTabs({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
      {['all', 'critical', 'medium', 'low'].map(t => (
        <button key={t} onClick={() => onChange(t)} style={{ padding: '0.3rem 0.9rem', borderRadius: 9999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: active === t ? '#6366f1' : '#12121a', border: active === t ? '1px solid #6366f1' : '1px solid #2e2e3e', color: active === t ? 'white' : '#64748b', transition: 'all 0.2s' }}>
          {t === 'all' ? 'All Issues' : t}
        </button>
      ))}
    </div>
  )
}

// ─── Main Report Page ─────────────────────────────────────────────────────────

export default function ReportPage({ scanResult: propResult, showToast }) {
  const navigate = useNavigate()
  const { scanId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionFilter, setActionFilter] = useState('all')
  const [copied, setCopied] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    // Priority: prop → URL param fetch → localStorage
    if (propResult && (!scanId || propResult.scanId === scanId)) {
      setResult(propResult); setLoading(false); return
    }
    if (scanId) {
      fetch(`${API}/api/scan/${scanId}`)
        .then(r => r.json())
        .then(d => { if (d.error) setNotFound(true); else setResult(d); setLoading(false) })
        .catch(() => { setNotFound(true); setLoading(false) })
      return
    }
    // fallback localStorage
    try {
      const s = localStorage.getItem('trustlens_scan')
      if (s) { const d = JSON.parse(s); setResult(d) }
      else setNotFound(true)
    } catch { setNotFound(true) }
    setLoading(false)
  }, [scanId, propResult])

  const share = () => {
    const url = `${CLIENT}/#/report/${result?.scanId || ''}`
    navigator.clipboard?.writeText(url)
    showToast?.('Report link copied!', 'info')
  }

  const copyEmbed = (embedCode) => {
    navigator.clipboard?.writeText(embedCode)
    setCopied(true)
    showToast?.('Embed code copied!', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadPDF = async () => {
    if (generatingPDF) return;
    setGeneratingPDF(true);
    
    const reportElement = document.getElementById('pdf-export-template');
    if (!reportElement) {
      setGeneratingPDF(false);
      return;
    }
    
    // Wait for template to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        windowWidth: 800
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.setProperties({
        title: `TrustLens Report — ${result.domain || 'report'}`,
        subject: 'GRCU Security & Trust Score Report',
        author: 'TrustLens',
        creator: 'TrustLens — trustlens.io'
      });
      
      pdf.save(`TrustLens-${result.domain || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch(e) {
      console.error(e);
      showToast?.('Expected PDF download to succeed, but got error', 'error');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#64748b' }}>Loading report...</div>
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (notFound || !result) {
    return (
      <div style={{ maxWidth: 480, margin: '6rem auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#1e1e2e', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <XCircle size={32} color="#64748b" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
          {scanId ? 'Report not found' : 'No scan found'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {scanId ? 'This scan may have expired or the ID is incorrect.' : 'Run a scan first to see your GRC report here.'}
        </p>
        <button className="btn-primary" onClick={() => navigate('/scan')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={16} /> Run a Scan
        </button>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (result.error && !result.checks) {
    return (
      <div style={{ maxWidth: 480, margin: '6rem auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, background: '#1a0a0a', border: '1px solid #ef444430', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <XCircle size={32} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>Scan Failed</h2>
        <p style={{ color: '#fca5a5', fontSize: '0.9rem', marginBottom: '2rem' }}>{result.error}</p>
        <button className="btn-primary" onClick={() => navigate('/scan')}>Try Again</button>
      </div>
    )
  }

  const { domain, scannedAt, scores, checks = [], actionPlan = [], company, scanDuration, scanId: sid, scoreDelta, previousScore } = result
  const band = getScoreBand(scores.total)
  const passed = checks.filter(c => c.status === 'pass')
  const warnings = checks.filter(c => c.status === 'warning')
  const failed = checks.filter(c => c.status === 'fail')
  const filteredActions = actionFilter === 'all' ? actionPlan : actionPlan.filter(a => a.severity === actionFilter)

  const nextGrade = scores.grade === 'D' ? 'C' : scores.grade === 'C' ? 'B' : scores.grade === 'B' ? 'A' : null
  const nextThreshold = { D: 50, C: 70, B: 85 }[scores.grade] || 100
  const ptsAway = nextGrade ? Math.max(0, nextThreshold - scores.total) : 0

  const badgeUrl = `${API}/api/badge/${sid}`
  const reportUrl = `${CLIENT}/#/report/${sid}`
  const embedCode = `<!-- TrustLens Trust Badge -->\n<a href="${reportUrl}">\n  <img src="${badgeUrl}"\n       alt="TrustLens Verified | Score: ${scores.total}/100"\n       width="200" height="60"/>\n</a>`

  return (
    <div id="report-content" style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem', background: '#0a0a0f' }}>

      {/* Critical warning banner */}
      {scores.grade === 'D' && (
        <div style={{ background: '#1a0808', border: '1px solid #ef444440', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ color: '#fca5a5', fontSize: '0.875rem', fontWeight: 600 }}>⚠ Critical issues detected — your site may be at risk right now</span>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      )}

      {/* Score delta banner */}
      {scoreDelta !== null && scoreDelta !== undefined && (
        <div style={{
          background: scoreDelta > 0 ? '#052e16' : scoreDelta < 0 ? '#1a0a0a' : '#0f0f1a',
          border: `1px solid ${scoreDelta > 0 ? '#22c55e40' : scoreDelta < 0 ? '#ef444440' : '#2e2e3e'}`,
          borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          {scoreDelta > 0 ? <TrendingUp size={18} color="#22c55e" /> : scoreDelta < 0 ? <TrendingDown size={18} color="#ef4444" /> : <Minus size={18} color="#64748b" />}
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: scoreDelta > 0 ? '#22c55e' : scoreDelta < 0 ? '#ef4444' : '#94a3b8' }}>
              {scoreDelta > 0 ? `↑ +${scoreDelta} points since last scan 🎉` : scoreDelta < 0 ? `↓ ${scoreDelta} points since last scan` : 'No change since last scan'}
            </span>
            {previousScore !== null && <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.5rem' }}>Previous score: {previousScore}/100</span>}
          </div>
        </div>
      )}

      {/* Score Hero */}
      <div className="animate-fade-up" style={{
        background: `linear-gradient(135deg, #12121a, #0e0e1a)`,
        border: '1px solid #1e1e2e', borderRadius: '1.5rem', padding: '2.5rem',
        marginBottom: '2rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${band.bgGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
          <span>{domain} · Security Report</span>
          {scanDuration && <span>· Completed in {(scanDuration / 1000).toFixed(1)}s</span>}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
          {company ? `${company} — GRC Trust Report` : `${domain} — GRC Trust Report`}
        </h1>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '2rem' }}>Scanned on {fmt(scannedAt)}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center' }}>
          <ScoreDial score={scores.total} color={band.color} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="flex items-center gap-3 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 className="text-5xl font-bold text-white" style={{ fontSize: '3rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>
                {scores.total}
                <span className="text-2xl text-slate-400" style={{ fontSize: '1.5rem', color: '#94a3b8' }}>/100</span>
              </h1>
              <span className={`text-3xl font-black px-4 py-2 rounded-xl`}
                    style={{color: band.color, backgroundColor: band.color + '20', border: `2px solid ${band.color}`, fontSize: '1.875rem', fontWeight: 900, padding: '0.5rem 1rem', borderRadius: '0.75rem'}}>
                {scores.grade}
              </span>
            </div>
            
            <div className="flex items-center gap-4 mt-3" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
              <span className="text-xs font-semibold tracking-widest text-slate-500 uppercase" style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase' }}>
                GRCU Score
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-500" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span><span className="text-indigo-400 font-bold" style={{ color: '#818cf8', fontWeight: 700 }}>G</span>overnance</span>
                <span className="text-slate-700" style={{ color: '#334155' }}>·</span>
                <span><span className="text-blue-400 font-bold" style={{ color: '#60a5fa', fontWeight: 700 }}>R</span>isk</span>
                <span className="text-slate-700" style={{ color: '#334155' }}>·</span>
                <span><span className="text-purple-400 font-bold" style={{ color: '#c084fc', fontWeight: 700 }}>C</span>ompliance</span>
                <span className="text-slate-700" style={{ color: '#334155' }}>·</span>
                <span><span className="text-teal-400 font-bold" style={{ color: '#2dd4bf', fontWeight: 700 }}>U</span>ser Trust</span>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>{band.headline}</p>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.5rem' }}>{band.subline}</p>

            {result.verdict && (
              <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '-0.5rem', flexWrap: 'wrap' }}>
                 <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: result.verdict.includes('Good') ? '#22c55e' : result.verdict.includes('Bad') ? '#ef4444' : result.verdict.includes('Inconclusive') ? '#a78bfa' : '#f59e0b', background: '#1e1e2e', padding: '0.3rem 0.75rem', borderRadius: 8, border: `1px solid ${result.verdict.includes('Good') ? '#22c55e40' : result.verdict.includes('Bad') ? '#ef444440' : result.verdict.includes('Inconclusive') ? '#a78bfa40' : '#f59e0b40'}` }}>
                    AI Verdict: {result.verdict}
                 </span>
                 <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{result.confidenceNote}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={share} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Share2 size={15} /> Share Report
              </button>
              <button className="btn-secondary" onClick={() => navigate('/scan')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <RefreshCw size={15} /> Rescan
              </button>
              <button className="btn-secondary" onClick={downloadPDF} disabled={generatingPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                {generatingPDF ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />} Download PDF
              </button>
              <button className="btn-secondary" onClick={() => navigate(`/compare?a=${encodeURIComponent(domain)}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <LayoutTemplate size={15} /> Compare with competitor
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-center gap-8 py-4 px-6 rounded-2xl border border-[#1e1e2e] bg-[#12121a] my-6"
           style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '1rem 1.5rem', borderRadius: '1rem', border: '1px solid #1e1e2e', background: '#12121a', margin: '1.5rem 0 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#4ade80', fontSize: '1.25rem', fontWeight: 700 }}>✓ {passed.length}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Passed</span>
        </div>
        <div style={{ width: 1, height: 32, background: '#1e1e2e' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 700 }}>✗ {failed.length}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Failed</span>
        </div>
        <div style={{ width: 1, height: 32, background: '#1e1e2e' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#fbbf24', fontSize: '1.25rem', fontWeight: 700 }}>⚠ {warnings.length}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Warnings</span>
        </div>
        <div style={{ width: 1, height: 32, background: '#1e1e2e' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500 }}>{checks.length} checks run</span>
          {scanDuration && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>in {(scanDuration/1000).toFixed(1)}s</span>}
        </div>
      </div>

      {/* Sub-scores & Risk DNA */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>GRCU Trust Score</h2>
        <div style={{ position: 'relative', display: 'inline-block' }} className="tooltip-trigger">
          <Info size={16} color="#64748b" style={{ cursor: 'help' }} />
          <div className="tooltip-content" style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)', background: '#1e1e2e', border: '1px solid #2e2e3e', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', width: '240px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.2s' }}>
            <span style={{ color: '#f8fafc', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>G·R·C·U Breakdown</span>
            Governance (30) · Risk (40) · Compliance (30) · User Trust (20). Normalized to 100 points maximum.
          </div>
          <style>{`.tooltip-trigger:hover .tooltip-content { opacity: 1 !important; pointer-events: auto !important; }`}</style>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, minWidth: 280, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.25rem', alignContent: 'start' }}>
          {[
            { label: 'Governance', s: scores.governance, max: 30, c: '#f59e0b' },
            { label: 'Risk', s: scores.risk, max: 40, c: '#6366f1' },
            { label: 'Compliance', s: scores.compliance, max: 30, c: '#a78bfa' },
            { label: 'User Trust', s: scores.userTrust, max: 20, c: '#14b8a6' },
          ].map((x, i) => (
            <div key={i} className="card-hover" style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{x.label}</span>
                <span style={{ fontWeight: 700, color: x.c }}>{x.s}<span style={{ color: '#64748b', fontWeight: 400 }}>/{x.max}</span></span>
              </div>
              <ProgressBar pct={(x.s / x.max) * 100} color={x.c} />
              <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.75rem', lineHeight: 1.5 }}>{categoryNote(x.s, x.max)}</p>
            </div>
          ))}
        </div>
        {result.riskDNA && (
          <div style={{ width: 340, background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1.5rem', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>Risk DNA Breakdown</h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 240 }}>Multi-dimensional mapping of your security posture across 5 domains.</p>
            <RadarChart data={result.riskDNA} />
          </div>
        )}
      </div>

      {/* Mismatch Report */}
      {result.mismatches?.length > 0 && (
        <div style={{ marginBottom: '2rem', background: '#1a0808', border: '1px solid #ef444440', borderRadius: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertTriangle size={20} color="#ef4444" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fca5a5' }}>Audit Mismatches Detected</h2>
          </div>
          <p style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1.25rem' }}>The following claims from your questionnaire contradict signals detected by our scanners. This reduces your audit confidence and applies a penalty to your final score.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.mismatches.map((m, i) => (
              <div key={i} style={{ background: '#0a0a0f', border: '1px solid #ef444420', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <XCircle size={16} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Claimed: {m.claim}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{m.issue}</div>
                </div>
                {m.penalty < 0 && (
                   <span style={{ marginLeft: 'auto', background: '#ef444420', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{m.penalty} pts</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {result.aiSummary && (
        <div style={{ marginBottom: '2.5rem', paddingLeft: '1.25rem', borderLeft: `4px solid ${result.aiSummary.fallback ? '#64748b' : '#6366f1'}`, background: 'linear-gradient(90deg, #12121a, transparent)', padding: '1.5rem', borderRadius: '0 1rem 1rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ color: result.aiSummary.fallback ? '#94a3b8' : '#a78bfa', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>✦ AI ANALYSIS</span>
            {result.aiSummary.fallback && <span style={{ color: '#64748b' }}><Lock size={14} /></span>}
          </div>
          {result.aiSummary.fallback ? (
            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '0.75rem', fontStyle: 'italic' }}>
              {result.aiSummary.message}
            </p>
          ) : (
             <p style={{ color: '#f8fafc', fontSize: '1rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              {result.aiSummary.summary}
            </p>
          )}
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{result.aiSummary.fallback ? 'Enable in server/.env' : 'Generated by Claude AI'}</div>
        </div>
      )}

      {/* Detailed Findings */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>What We Checked</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{passed.length} passed · {failed.length} issues across {checks.length} checks</p>

        {passed.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {passed.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', flexWrap: 'wrap' }}>
                <CheckCircle size={18} color="#22c55e" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#f8fafc', flex: 1, minWidth: 150 }}>{c.name}</span>
                <StatusBadge status="pass" />
                {c.confidence === 'low' && <ConfidenceTag confidence={c.confidence} note={c.confidenceNote} />}
                <span style={{ color: '#64748b', fontSize: '0.8rem', flex: 1 }}>{c.detail}</span>
              </div>
            ))}
          </div>
        )}

        {failed.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {failed.map((c, i) => {
              const isUnable = c.confidenceNote?.includes('failed to run') || c.detail?.includes('failed to run');
              return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#12121a', border: `1px solid ${isUnable ? '#2e2e3e' : c.severity === 'critical' ? '#ef444420' : '#1e1e2e'}`, opacity: isUnable ? 0.6 : 1, borderRadius: '0.75rem', padding: '0.875rem 1.25rem', flexWrap: 'wrap' }}>
                {isUnable ? <AlertTriangle size={18} color="#64748b" style={{ flexShrink: 0 }} /> : c.status === 'warning' ? <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} /> : <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />}
                <span style={{ fontWeight: 500, fontSize: '0.9rem', color: isUnable ? '#94a3b8' : '#f8fafc', textDecoration: isUnable ? 'line-through' : 'none', flex: 1, minWidth: 150 }}>{c.name}</span>
                {isUnable ? (
                  <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', background: '#1e1e2e', border: '1px solid #334155', borderRadius: 9999, color: '#94a3b8', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Unable to verify</span>
                ) : (
                  <StatusBadge status={c.status} />
                )}
                {!isUnable && c.severity && <SeverityBadge severity={c.severity} small />}
                {(c.confidence === 'low' || c.confidence === 'medium') && <ConfidenceTag confidence={c.confidence} note={c.confidenceNote} />}
                <span style={{ color: '#64748b', fontSize: '0.8rem', flex: 1 }}>{c.detail}</span>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Action Plan */}
      {actionPlan.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>Your Action Plan</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Fix these in order of severity — Critical first, then easiest wins.</p>
          
          <FilterTabs active={actionFilter} onChange={setActionFilter} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredActions.length === 0
              ? <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No {actionFilter} severity items.</p>
              : filteredActions.map((item, i) => <ActionCard key={i} item={item} />)
            }
          </div>
          
          {(() => {
            const criticalItems = actionPlan.filter(item => item.severity === 'critical');
            const pointsFromCritical = criticalItems.reduce((sum, item) => sum + (item.pointsIfFixed || 0), 0);
            const mediumItems = actionPlan.filter(item => item.severity === 'medium');
            const pointsFromMedium = mediumItems.reduce((sum, item) => sum + (item.pointsIfFixed || 0), 0);

            const estimatedAfterCritical = Math.min(100, scores.total + pointsFromCritical);
            const estimatedAfterAll = Math.min(100, scores.total + pointsFromCritical + pointsFromMedium);

            const gradeAfterCritical = getScoreBand(estimatedAfterCritical).grade;
            const gradeAfterAll = getScoreBand(estimatedAfterAll).grade;
            
            return (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 mt-8" style={{ borderRadius: '1rem', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', padding: '1.5rem', marginTop: '2rem' }}>
                <h3 className="text-lg font-semibold text-white mb-4" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white', marginBottom: '1rem' }}>🎯 Your Score Potential</h3>
                
                <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
                  <div className="text-center" style={{ textAlign: 'center' }}>
                    <div className="text-3xl font-bold" style={{ fontSize: '1.875rem', fontWeight: 700, color: band.color }}>{scores.total}</div>
                    <div className="text-slate-400 text-xs mt-1" style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>Current Score</div>
                    <div className="text-slate-500 text-xs" style={{ color: '#64748b', fontSize: '0.75rem' }}>Grade {scores.grade}</div>
                  </div>
                  
                  <div className="text-center border-x border-[#1e1e2e]" style={{ textAlign: 'center', borderLeft: '1px solid #1e1e2e', borderRight: '1px solid #1e1e2e' }}>
                    <div className="text-3xl font-bold text-amber-400" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#fbbf24' }}>{estimatedAfterCritical}</div>
                    <div className="text-slate-400 text-xs mt-1" style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>Fix Critical Issues</div>
                    <div className="text-green-400 text-xs" style={{ color: '#4ade80', fontSize: '0.75rem' }}>+{pointsFromCritical} pts → Grade {gradeAfterCritical}</div>
                  </div>
                  
                  <div className="text-center" style={{ textAlign: 'center' }}>
                    <div className="text-3xl font-bold text-green-400" style={{ fontSize: '1.875rem', fontWeight: 700, color: '#4ade80' }}>{estimatedAfterAll}</div>
                    <div className="text-slate-400 text-xs mt-1" style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>Fix All Issues</div>
                    <div className="text-green-400 text-xs" style={{ color: '#4ade80', fontSize: '0.75rem' }}>+{pointsFromCritical + pointsFromMedium} pts → Grade {gradeAfterAll}</div>
                  </div>
                </div>
                
                <div className="mt-6" style={{ marginTop: '1.5rem' }}>
                  <div className="flex justify-between text-xs text-slate-500 mb-2" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <span>Current: {scores.total}/100</span>
                    <span>Potential: {estimatedAfterAll}/100</span>
                  </div>
                  <div className="h-3 bg-[#1e1e2e] rounded-full overflow-hidden" style={{ height: '0.75rem', background: '#1e1e2e', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div className="h-full rounded-full relative" style={{ height: '100%', borderRadius: '9999px', width: `${estimatedAfterAll}%`, background: 'rgba(99,102,241,0.3)' }}>
                      <div className="h-full rounded-full absolute left-0" style={{ height: '100%', borderRadius: '9999px', position: 'absolute', left: 0, width: `${(scores.total / estimatedAfterAll) * 100}%`, background: band.color }}/>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mt-3 text-center" style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>
                    Fix the {criticalItems.length} critical issue{criticalItems.length !== 1 ? 's' : ''} above and your score jumps to <strong className="text-white" style={{ color: 'white' }}>{estimatedAfterCritical}/100</strong> — that's a Grade {gradeAfterCritical}.
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Badge Section */}
      <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1.5rem', padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem' }}>
          Embed Your Trust Badge
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Let your users know your site is secure. Use the code below to embed the badge directly.</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
             <TrustBadge score={scores.total} grade={scores.grade} color={band.color} domain={domain} />
             <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Grade</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
             <TrustBadge score={80} grade="B" color="#6366f1" domain={domain} />
             <span style={{ fontSize: '0.75rem', color: '#64748b' }}>At 80 points</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
             <TrustBadge score={95} grade="A" color="#22c55e" domain={domain} />
             <span style={{ fontSize: '0.75rem', color: '#64748b' }}>At 95 points</span>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Embed Code</div>
        <div style={{ background: '#0a0a0f', border: '1px solid #2e2e3e', borderRadius: '0.75rem', padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.75rem', overflowX: 'auto', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {embedCode}
        </div>
        <button className="btn-primary" onClick={() => copyEmbed(embedCode)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied!' : 'Copy Embed Code'}
        </button>
      </div>

      {/* Rescan footer */}
      <div style={{ background: 'linear-gradient(135deg,#0f0f1e,#12121a)', border: '1px solid #6366f130', borderRadius: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={28} color="#6366f1" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.5rem' }}>Fixed some issues?</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Rescan and watch your score climb.</p>
        <button className="btn-primary" onClick={() => navigate('/scan')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <RefreshCw size={15} /> Rescan Now
        </button>
      </div>
      {/* Hidden PDF Component */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, zIndex: -100 }}>
        <PDFReportTemplate result={result} />
      </div>
    </div>
  )
}
