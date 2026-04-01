import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield, AlertTriangle, CheckSquare, Plus, Minus,
  Globe, Building2, Mail, Loader2, Check, XCircle, CheckCircle, AlertCircle
} from 'lucide-react'

const API = 'http://localhost:3001'

// ── URL validation ────────────────────────────────────────────────────────────
function validateURL(input) {
  if (!input?.trim()) return 'Please enter a website URL'
  let u = input.trim()
  if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u
  try {
    const p = new URL(u)
    if (!p.hostname.includes('.')) return 'Please enter a valid domain like example.com'
    return null
  } catch {
    return 'Please enter a valid URL'
  }
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ text }) {
  const [d, setD] = useState('')
  useEffect(() => {
    setD(''); let i = 0
    const t = setInterval(() => { if (i < text.length) { setD(text.slice(0, ++i)) } else clearInterval(t) }, 38)
    return () => clearInterval(t)
  }, [text])
  return <span>{d}<span style={{ opacity: 0.4 }}>|</span></span>
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Your Info', 'Quick Questions', 'Scanning...']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '3rem' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem',
              background: i < step ? '#6366f1' : i === step ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : '#1e1e2e',
              color: i <= step ? 'white' : '#64748b',
              border: i === step ? 'none' : `1px solid ${i < step ? '#6366f1' : '#2e2e3e'}`,
              boxShadow: i === step ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
              transition: 'all 0.3s',
            }}>
              {i < step ? <Check size={16} /> : i + 1}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap', color: i === step ? '#a78bfa' : i < step ? '#6366f1' : '#64748b' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: '80px', height: '2px', marginBottom: '1.3rem', marginLeft: '-1px', marginRight: '-1px', background: i < step ? '#6366f1' : '#1e1e2e', transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Question card ─────────────────────────────────────────────────────────────
function QCard({ q, options, value, onChange, children }) {
  return (
    <div style={{ background: '#12121a', border: `1px solid ${value ? '#6366f130' : '#1e1e2e'}`, borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', transition: 'border-color 0.2s' }}>
      <div style={{ marginBottom: '1rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5 }}>{q}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: children ? '1rem' : 0 }}>
        {options.map(opt => (
          <button key={opt} className={`toggle-btn ${value === opt ? 'selected' : ''}`} onClick={() => onChange(opt)}>{opt}</button>
        ))}
      </div>
      {children}
    </div>
  )
}

function MultiSelect({ options, value = [], onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {options.map(opt => (
        <button key={opt} className={`toggle-btn ${value.includes(opt) ? 'selected' : ''}`} onClick={() => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])}>{opt}</button>
      ))}
    </div>
  )
}

function NumStepper({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={{ width: 32, height: 32, borderRadius: 8, background: '#1e1e2e', border: '1px solid #2e2e3e', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', minWidth: '3rem', textAlign: 'center' }}>{value >= 50 ? '50+' : value}</span>
      <button onClick={() => onChange(Math.min(51, value + 1))} style={{ width: 32, height: 32, borderRadius: 8, background: '#1e1e2e', border: '1px solid #2e2e3e', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
    </div>
  )
}

function SecHead({ icon, color, label, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: '2.5rem' }}>
      <div style={{ width: 44, height: 44, background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>{label}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{subtitle}</div></div>
      <div style={{ flex: 1, height: 1, background: `${color}20` }} />
    </div>
  )
}

// ── Live check item in overlay ────────────────────────────────────────────────
function CheckItem({ check, isLast }) {
  const icon = isLast
    ? <Loader2 size={14} color="#6366f1" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
    : check.status === 'pass'
      ? <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0 }} />
      : check.status === 'fail'
        ? <XCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
        : <AlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.81rem', color: isLast ? '#f8fafc' : '#64748b', transition: 'color 0.2s' }}>
      {icon}
      <span style={{ flex: 1 }}>{check.name}</span>
      {!isLast && (
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          color: check.status === 'pass' ? '#22c55e' : check.status === 'fail' ? '#ef4444' : '#f59e0b'
        }}>{check.status}</span>
      )}
    </div>
  )
}

// ── DEMO preset ───────────────────────────────────────────────────────────────
const DEMO_ANSWERS = {
  privacyPolicy: 'Yes', privacyPolicyUrl: '', termsOfService: 'Yes', tosUrl: '',
  cookieConsent: 'Yes', dataDeletion: 'Yes', securityContact: 'Yes',
  dataStorage: 'AWS', collectPayments: 'Yes', paymentProcessor: 'Stripe',
  analytics: 'Google Analytics', teamAccess: 3, mfa: 'Yes',
  securityAudit: 'No', userType: 'B2B', euUsers: 'Yes', under18: 'No',
  regulations: ['GDPR'], incidentResponse: 'Yes',
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ScanPage({ scannedUrl, setScanResult, showToast }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  // step: 0=info, 1=form, 2=scanning
  const [step, setStep] = useState(0)
  const [urlError, setUrlError] = useState(null)

  const [formData, setFormData] = useState({
    url: scannedUrl || (isDemo ? 'https://stripe.com' : ''),
    company: isDemo ? 'Stripe (Demo)' : '',
    email: '',
  })

  const [answers, setAnswers] = useState(isDemo ? DEMO_ANSWERS : {
    privacyPolicy: '', privacyPolicyUrl: '', termsOfService: '', tosUrl: '',
    cookieConsent: '', dataDeletion: '', securityContact: '',
    dataStorage: '', collectPayments: '', paymentProcessor: '',
    analytics: '', teamAccess: 1, mfa: '', securityAudit: '',
    userType: '', euUsers: '', under18: '', regulations: [], incidentResponse: '',
  })
  const ans = (k, v) => setAnswers(p => ({ ...p, [k]: v }))

  // Scanning state
  const [liveChecks, setLiveChecks] = useState([])
  const [scanError, setScanError] = useState(null)
  const [totalChecks] = useState(25)
  const [now, setNow] = useState(Date.now())
  const esRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    let t;
    if (step === 2) {
      t = setInterval(() => setNow(Date.now()), 250);
    }
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => { return () => esRef.current?.close() }, [])

  const goToStep1 = () => {
    const err = validateURL(formData.url)
    if (err) { setUrlError(err); return }
    setUrlError(null)
    
    if (isDemo) {
      startScan() // Skip form in demo mode
    } else {
      setStep(1)
    }
  }

  const startScan = () => {
    setScanError(null)
    setLiveChecks([])
    setStep(2)
    startRef.current = Date.now()

    const encodedUrl = encodeURIComponent(formData.url.trim())
    const encodedAnswers = encodeURIComponent(JSON.stringify(answers))
    const url = `${API}/api/scan/stream?url=${encodedUrl}&formAnswers=${encodedAnswers}${isDemo ? '&demo=true' : ''}`

    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.type === 'start') { /* nothing */ }

      if (data.type === 'check') {
        setLiveChecks(prev => [...prev, data.check])
      }

      if (data.type === 'done') {
        es.close()
        const duration = Date.now() - startRef.current
        const result = {
          ...data,
          company: formData.company,
          email: formData.email,
          scanDuration: duration,
        }
        setScanResult(result)
        localStorage.setItem('trustlens_scan', JSON.stringify(result))

        const currentCount = parseInt(localStorage.getItem('tl_scan_count') || '543', 10);
        localStorage.setItem('tl_scan_count', (currentCount + 1).toString());

        showToast?.('Scan complete!', 'success')
        navigate(`/report/${data.scanId}`)
      }

      if (data.type === 'error') {
        es.close()
        setScanError(data.message)
        setStep(1) // back to form
        showToast?.('Scan failed: ' + data.message, 'error')
      }
    }

    es.onerror = () => {
      es.close()
      setScanError('Connection to scanner lost. Is the server running on port 3001?')
      setStep(1)
      showToast?.('Scanner connection lost', 'error')
    }
  }

  // ── Scanning overlay ────────────────────────────────────────────────────────
  if (step === 2) {
    const pct = Math.min(99, Math.round((liveChecks.length / totalChecks) * 100))
    const current = liveChecks[liveChecks.length - 1]
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.75rem' }}>
        <div className="animate-pulse-glow" style={{ width: 80, height: 80, background: 'linear-gradient(135deg,#6366f1,#a78bfa)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={40} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#f8fafc', marginBottom: '0.4rem' }}>Scanning Your Website</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{formData.url}</p>
        </div>
        <div style={{ width: '380px', maxWidth: '90vw' }}>
          <div style={{ height: 6, background: '#1e1e2e', borderRadius: 9999, overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#a78bfa)', borderRadius: 9999, transition: 'width 0.4s ease', boxShadow: '0 0 12px rgba(99,102,241,0.5)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
            <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
              {current ? <Typewriter text={`Checking ${current.name}...`} /> : 'Initializing scanner...'}
            </span>
            <span>{pct}%</span>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
            {(() => {
              const completedChecks = liveChecks.length;
              if (completedChecks === 0) return "Estimated time: ~15 seconds";
              
              const elapsedSeconds = Math.max(0.1, (now - startRef.current) / 1000);
              const checksPerSecond = completedChecks / elapsedSeconds;
              const remainingChecks = totalChecks - completedChecks;
              const estimatedRemaining = remainingChecks / checksPerSecond;
              
              if (estimatedRemaining < 3) return `${completedChecks} of ${totalChecks} checks complete • Almost done...`;
              return `${completedChecks} of ${totalChecks} checks complete • ~${Math.round(estimatedRemaining)}s remaining`;
            })()}
          </div>
          {/* Live check list */}
          <div className="scrollbar-hide" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '260px', overflowY: 'auto' }}>
            {liveChecks.map((c, i) => (
              <CheckItem key={c.id} check={c} isLast={i === liveChecks.length - 1} />
            ))}
            {liveChecks.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.81rem', color: '#64748b' }}>
                <Loader2 size={14} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                Connecting to scanner...
              </div>
            )}
          </div>
        </div>
        <p style={{ color: '#475569', fontSize: '0.75rem' }}>Running {totalChecks} real checks — results appear live</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <StepBar step={step} />

      {/* Error banner */}
      {scanError && (
        <div style={{ background: '#1a0a0a', border: '1px solid #ef444440', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{scanError}</span>
        </div>
      )}

      {/* ── STEP 0: Info ─────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>Let's start your scan</h1>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem' }}>Enter your site URL, then we'll ask a few questions before running 16 live security checks.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* URL field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website URL *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Globe size={16} style={{ position: 'absolute', left: '1rem', color: urlError ? '#ef4444' : '#6366f1', zIndex: 1 }} />
                <input
                  className="input-base" type="url" id="scan-url-input"
                  value={formData.url}
                  onChange={e => { setFormData(p => ({ ...p, url: e.target.value })); if (urlError) setUrlError(validateURL(e.target.value)) }}
                  onKeyDown={e => e.key === 'Enter' && goToStep1()}
                  placeholder="https://yourstartup.com"
                  style={{ paddingLeft: '2.5rem', borderColor: urlError ? '#ef444460' : formData.url && !urlError ? '#22c55e40' : undefined }}
                />
              </div>
              {urlError && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.4rem' }}>{urlError}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company / Startup Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '1rem', color: '#6366f1' }} />
                <input className="input-base" type="text" value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} placeholder="Acme Inc." style={{ paddingLeft: '2.5rem' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', color: '#6366f1' }} />
                <input className="input-base" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="founder@startup.com" style={{ paddingLeft: '2.5rem' }} />
              </div>
            </div>

            <button className="btn-primary" onClick={goToStep1} id="next-step-btn"
              style={{ marginTop: '0.5rem', width: '100%', fontSize: '1rem', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              Next: Tell us about your startup →
            </button>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>⚡ 16 live checks · no login needed</p>
          </div>
        </div>
      )}

      {/* ── STEP 1: Self-Declaration Form ──────────────────────────────────── */}
      {step === 1 && (
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>Tell us about your startup</h1>
          <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Answer 16 questions to unlock bonus points. Then we'll run the real scan.</p>
          <div style={{ height: 4, background: '#1e1e2e', borderRadius: 9999, marginBottom: '2rem' }}>
            <div style={{ height: '100%', width: '33%', background: 'linear-gradient(90deg,#6366f1,#a78bfa)', borderRadius: 9999 }} />
          </div>

          <SecHead icon={<Shield size={20} />} color="#6366f1" label="Governance" subtitle="Policies, controls & team safety" />
          <QCard q="Q1. Do you have a Privacy Policy?" options={['Yes', 'No']} value={answers.privacyPolicy} onChange={v => ans('privacyPolicy', v)}>
            {answers.privacyPolicy === 'Yes' && <input className="input-base" type="url" placeholder="https://yoursite.com/privacy" value={answers.privacyPolicyUrl} onChange={e => ans('privacyPolicyUrl', e.target.value)} />}
          </QCard>
          <QCard q="Q2. Do you have Terms of Service?" options={['Yes', 'No']} value={answers.termsOfService} onChange={v => ans('termsOfService', v)}>
            {answers.termsOfService === 'Yes' && <input className="input-base" type="url" placeholder="https://yoursite.com/terms" value={answers.tosUrl} onChange={e => ans('tosUrl', e.target.value)} />}
          </QCard>
          <QCard q="Q3. Cookie Consent mechanism on your site?" options={['Yes', 'No']} value={answers.cookieConsent} onChange={v => ans('cookieConsent', v)} />
          <QCard q="Q4. Data Deletion / Right to Forget process?" options={['Yes', 'No']} value={answers.dataDeletion} onChange={v => ans('dataDeletion', v)} />
          <QCard q="Q5. Named point of contact for data/security issues?" options={['Yes', 'No']} value={answers.securityContact} onChange={v => ans('securityContact', v)} />

          <SecHead icon={<AlertTriangle size={20} />} color="#f59e0b" label="Risk" subtitle="Infrastructure, payments & access" />
          <QCard q="Q6. Where is user data stored?" options={['AWS', 'Google Cloud', 'Azure', 'Own Server', "We don't store data"]} value={answers.dataStorage} onChange={v => ans('dataStorage', v)} />
          <QCard q="Q7. Do you collect payments?" options={['Yes', 'No']} value={answers.collectPayments} onChange={v => ans('collectPayments', v)}>
            {answers.collectPayments === 'Yes' && (
              <select className="input-base" value={answers.paymentProcessor} onChange={e => ans('paymentProcessor', e.target.value)}>
                <option value="">Select processor...</option>
                {['Stripe', 'Razorpay', 'PayPal', 'Other'].map(p => <option key={p}>{p}</option>)}
              </select>
            )}
          </QCard>
          <QCard q="Q8. Third-party analytics?" options={['Google Analytics', 'Mixpanel', 'Both', 'None', 'Other']} value={answers.analytics} onChange={v => ans('analytics', v)} />
          <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem' }}>Q9. Team members with production access?</div>
            <NumStepper value={answers.teamAccess} onChange={v => ans('teamAccess', v)} />
          </div>
          <QCard q="Q10. All team members use MFA for internal tools?" options={['Yes', 'No', 'Partially']} value={answers.mfa} onChange={v => ans('mfa', v)} />
          <QCard q="Q11. Had a third-party security audit?" options={['Yes', 'No', 'Planned']} value={answers.securityAudit} onChange={v => ans('securityAudit', v)} />

          <SecHead icon={<CheckSquare size={20} />} color="#a78bfa" label="Compliance" subtitle="Users, regulations & legal" />
          <QCard q="Q12. Type of users you serve?" options={['B2B', 'B2C', 'Both']} value={answers.userType} onChange={v => ans('userType', v)} />
          <QCard q="Q13. Serve users in the EU?" options={['Yes', 'No', 'Not sure']} value={answers.euUsers} onChange={v => ans('euUsers', v)} />
          <QCard q="Q14. Serve users under 18?" options={['Yes', 'No']} value={answers.under18} onChange={v => ans('under18', v)} />
          <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem' }}>Q15. Regulations that apply?</div>
            <MultiSelect options={['GDPR', 'CCPA', 'HIPAA', 'PCI-DSS', 'None', 'Not sure']} value={answers.regulations} onChange={v => ans('regulations', v)} />
          </div>
          <QCard q="Q16. Do you have an incident response plan?" options={['Yes', 'No']} value={answers.incidentResponse} onChange={v => ans('incidentResponse', v)} />

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => setStep(0)} style={{ fontSize: '0.9rem', padding: '0.875rem 1.25rem' }}>← Back</button>
            <button className="btn-primary" onClick={startScan} id="run-scan-btn" style={{ flex: 1, fontSize: '1rem', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Run My Scan →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
