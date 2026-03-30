import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, AlertTriangle, CheckSquare, ChevronRight, Plus, Minus,
  Globe, Building2, Mail, Loader2, Check
} from 'lucide-react'

const SCAN_MESSAGES = [
  'Checking SSL certificate...',
  'Analyzing HTTP security headers...',
  'Scanning DNS records...',
  'Checking for exposed files...',
  'Detecting third-party scripts...',
  'Verifying compliance signals...',
  'Calculating your GRC Score...',
]

// Typewriter component
function Typewriter({ text }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
      }
    }, 35)
    return () => clearInterval(interval)
  }, [text])
  return <span>{displayed}<span style={{ opacity: 0.5 }}>|</span></span>
}

// Step indicator
function StepBar({ currentStep }) {
  const steps = ['Website Info', 'Self-Declaration', 'Your Report']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '3rem' }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem',
              background: i < currentStep ? '#6366f1' : i === currentStep ? 'linear-gradient(135deg, #6366f1, #a78bfa)' : '#1e1e2e',
              color: i <= currentStep ? 'white' : '#64748b',
              border: i === currentStep ? 'none' : `1px solid ${i < currentStep ? '#6366f1' : '#2e2e3e'}`,
              boxShadow: i === currentStep ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              {i < currentStep ? <Check size={16} /> : i + 1}
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap',
              color: i === currentStep ? '#a78bfa' : i < currentStep ? '#6366f1' : '#64748b',
            }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: '80px', height: '2px', marginBottom: '1.3rem', marginLeft: '-1px', marginRight: '-1px',
              background: i < currentStep ? '#6366f1' : '#1e1e2e',
              transition: 'background 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// Question card with toggle options
function QuestionCard({ question, options, value, onChange, children }) {
  return (
    <div style={{
      background: '#12121a', border: '1px solid #1e1e2e',
      borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem',
      transition: 'border-color 0.2s ease',
      borderColor: value ? '#6366f130' : '#1e1e2e',
    }}>
      <div style={{ marginBottom: '1rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5 }}>
        {question}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: children ? '1rem' : 0 }}>
        {options.map(opt => (
          <button
            key={opt}
            className={`toggle-btn ${value === opt ? 'selected' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

// Multi-select checkboxes
function MultiSelect({ options, value = [], onChange }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {options.map(opt => (
        <button
          key={opt}
          className={`toggle-btn ${value.includes(opt) ? 'selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// Number stepper
function NumberStepper({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#1e1e2e', border: '1px solid #2e2e3e',
          color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      ><Minus size={14} /></button>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', minWidth: '3rem', textAlign: 'center' }}>
        {value >= 50 ? '50+' : value}
      </span>
      <button
        onClick={() => onChange(Math.min(51, value + 1))}
        style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#1e1e2e', border: '1px solid #2e2e3e',
          color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      ><Plus size={14} /></button>
    </div>
  )
}

// Section header for questionnaire
function SectionHeader({ icon, color, label, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: '2.5rem' }}>
      <div style={{
        width: '44px', height: '44px', background: `${color}20`,
        border: `1px solid ${color}40`, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, height: '1px', background: `${color}20` }} />
    </div>
  )
}

export default function ScanPage({ scannedUrl }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0=info, 1=scanning, 2=form, 3=finalizing
  const [progress, setProgress] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)

  // Step 1 form
  const [formData, setFormData] = useState({
    url: scannedUrl || '',
    company: '',
    email: '',
  })

  // Questionnaire answers
  const [answers, setAnswers] = useState({
    privacyPolicy: '', privacyPolicyUrl: '',
    termsOfService: '', tosUrl: '',
    cookieConsent: '',
    dataDeletion: '',
    securityContact: '',
    dataStorage: '',
    collectPayments: '', paymentProcessor: '',
    analytics: '',
    teamAccess: 1,
    mfa: '',
    securityAudit: '',
    userType: '',
    euUsers: '',
    under18: '',
    regulations: [],
    incidentResponse: '',
  })

  const answer = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }))

  // Scanning animation
  useEffect(() => {
    if (step !== 1) return
    setProgress(0)
    setMsgIdx(0)

    const duration = 4000
    const start = Date.now()
    const progInterval = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / duration) * 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(progInterval)
    }, 50)

    const msgInterval = setInterval(() => {
      setMsgIdx(prev => {
        if (prev < SCAN_MESSAGES.length - 1) return prev + 1
        return prev
      })
    }, 500)

    const doneTimer = setTimeout(() => {
      clearInterval(progInterval)
      clearInterval(msgInterval)
      setStep(2)
    }, 4200)

    return () => {
      clearInterval(progInterval)
      clearInterval(msgInterval)
      clearTimeout(doneTimer)
    }
  }, [step])

  const startScan = () => {
    if (!formData.url) return
    setStep(1)
  }

  const generateReport = () => {
    setStep(3)
    setTimeout(() => navigate('/report'), 2200)
  }

  // ---- Scanning overlay ----
  if (step === 1) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem',
      }}>
        {/* Logo pulse */}
        <div className="animate-pulse-glow" style={{
          width: '80px', height: '80px',
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={40} color="white" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.5rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
            Scanning Your Website
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{formData.url}</p>
        </div>

        {/* Progress bar */}
        <div style={{ width: '340px', maxWidth: '90vw' }}>
          <div style={{
            height: '6px', background: '#1e1e2e', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1rem'
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              borderRadius: '9999px', transition: 'width 0.1s linear',
              boxShadow: '0 0 12px rgba(99,102,241,0.5)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
            <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>
              <Typewriter text={SCAN_MESSAGES[msgIdx]} />
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Check list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '280px' }}>
          {SCAN_MESSAGES.slice(0, msgIdx + 1).map((msg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: '#64748b' }}>
              <Check size={13} color={i < msgIdx ? '#22c55e' : '#6366f1'} />
              <span style={{ color: i < msgIdx ? '#64748b' : '#f8fafc' }}>{msg}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---- Finalizing overlay ----
  if (step === 3) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 200,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
      }}>
        <div className="animate-pulse-glow" style={{
          width: '72px', height: '72px',
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Loader2 size={36} color="white" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#f8fafc' }}>Finalizing your report...</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.4rem' }}>Calculating your GRC score</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <StepBar currentStep={step === 0 ? 0 : 1} />

      {/* Step 0 — Website Info */}
      {step === 0 && (
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Let's start your scan
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem' }}>
            We'll scan your site automatically, then ask a few questions to complete your GRC score.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Website URL *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Globe size={16} style={{ position: 'absolute', left: '1rem', color: '#6366f1' }} />
                <input className="input-base" type="url" id="scan-url-input"
                  value={formData.url} onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://yourstartup.com"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Company / Startup Name
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '1rem', color: '#6366f1' }} />
                <input className="input-base" type="text" id="scan-company-input"
                  value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                  placeholder="Acme Inc."
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', color: '#6366f1' }} />
                <input className="input-base" type="email" id="scan-email-input"
                  value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="founder@startup.com"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={startScan} id="start-scan-btn"
              style={{ marginTop: '0.5rem', width: '100%', fontSize: '1rem', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Start Scan
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Questionnaire */}
      {step === 2 && (
        <div className="animate-fade-up">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Tell us about your startup
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Answer 16 quick questions to get your full GRC score.
          </p>
          <div style={{ height: '4px', background: '#1e1e2e', borderRadius: '9999px', marginBottom: '2rem' }}>
            <div style={{
              height: '100%', width: '33%', background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              borderRadius: '9999px',
            }} />
          </div>

          {/* GOVERNANCE */}
          <SectionHeader icon={<Shield size={20} />} color="#6366f1" label="Governance" subtitle="Policies, controls & team safety" />

          <QuestionCard question="Q1. Do you have a Privacy Policy?" options={['Yes', 'No']} value={answers.privacyPolicy} onChange={v => answer('privacyPolicy', v)}>
            {answers.privacyPolicy === 'Yes' && (
              <input className="input-base" type="url" placeholder="https://yoursite.com/privacy" style={{ marginTop: '0.25rem' }}
                value={answers.privacyPolicyUrl} onChange={e => answer('privacyPolicyUrl', e.target.value)} />
            )}
          </QuestionCard>

          <QuestionCard question="Q2. Do you have Terms of Service?" options={['Yes', 'No']} value={answers.termsOfService} onChange={v => answer('termsOfService', v)}>
            {answers.termsOfService === 'Yes' && (
              <input className="input-base" type="url" placeholder="https://yoursite.com/terms" style={{ marginTop: '0.25rem' }}
                value={answers.tosUrl} onChange={e => answer('tosUrl', e.target.value)} />
            )}
          </QuestionCard>

          <QuestionCard question="Q3. Do you have a Cookie Consent mechanism on your site?" options={['Yes', 'No']} value={answers.cookieConsent} onChange={v => answer('cookieConsent', v)} />
          <QuestionCard question="Q4. Do you have a Data Deletion / Right to be Forgotten process?" options={['Yes', 'No']} value={answers.dataDeletion} onChange={v => answer('dataDeletion', v)} />
          <QuestionCard question="Q5. Is there a named point of contact for data/security issues?" options={['Yes', 'No']} value={answers.securityContact} onChange={v => answer('securityContact', v)} />

          {/* RISK */}
          <SectionHeader icon={<AlertTriangle size={20} />} color="#f59e0b" label="Risk" subtitle="Infrastructure, payments & access" />

          <QuestionCard question="Q6. Where is user data stored?" options={['AWS', 'Google Cloud', 'Azure', 'Own Server', "We don't store data"]} value={answers.dataStorage} onChange={v => answer('dataStorage', v)} />

          <QuestionCard question="Q7. Do you collect payments?" options={['Yes', 'No']} value={answers.collectPayments} onChange={v => answer('collectPayments', v)}>
            {answers.collectPayments === 'Yes' && (
              <select className="input-base" style={{ marginTop: '0.25rem' }}
                value={answers.paymentProcessor} onChange={e => answer('paymentProcessor', e.target.value)}>
                <option value="">Select payment processor...</option>
                {['Stripe', 'Razorpay', 'PayPal', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </QuestionCard>

          <QuestionCard question="Q8. Do you use third-party analytics?" options={['Google Analytics', 'Mixpanel', 'Both', 'None', 'Other']} value={answers.analytics} onChange={v => answer('analytics', v)} />

          <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem' }}>
              Q9. How many team members have access to production systems?
            </div>
            <NumberStepper value={answers.teamAccess} onChange={v => answer('teamAccess', v)} />
          </div>

          <QuestionCard question="Q10. Do all team members use MFA for internal tools?" options={['Yes', 'No', 'Partially']} value={answers.mfa} onChange={v => answer('mfa', v)} />
          <QuestionCard question="Q11. Have you had a third-party security audit?" options={['Yes', 'No', 'Planned']} value={answers.securityAudit} onChange={v => answer('securityAudit', v)} />

          {/* COMPLIANCE */}
          <SectionHeader icon={<CheckSquare size={20} />} color="#a78bfa" label="Compliance" subtitle="Users, regulations & legal" />

          <QuestionCard question="Q12. What type of users do you serve?" options={['B2B', 'B2C', 'Both']} value={answers.userType} onChange={v => answer('userType', v)} />
          <QuestionCard question="Q13. Do you serve users in the EU?" options={['Yes', 'No', 'Not sure']} value={answers.euUsers} onChange={v => answer('euUsers', v)} />
          <QuestionCard question="Q14. Do you serve users under 18?" options={['Yes', 'No']} value={answers.under18} onChange={v => answer('under18', v)} />

          <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '1rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.95rem' }}>
              Q15. Which regulations apply to you? (select all that apply)
            </div>
            <MultiSelect
              options={['GDPR', 'CCPA', 'HIPAA', 'PCI-DSS', 'None', 'Not sure']}
              value={answers.regulations}
              onChange={v => answer('regulations', v)}
            />
          </div>

          <QuestionCard question="Q16. Do you have an incident response plan?" options={['Yes', 'No']} value={answers.incidentResponse} onChange={v => answer('incidentResponse', v)} />

          <button className="btn-primary" onClick={generateReport} id="generate-report-btn"
            style={{ width: '100%', fontSize: '1rem', padding: '1rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Shield size={18} /> Generate My GRC Report
          </button>
        </div>
      )}
    </div>
  )
}
