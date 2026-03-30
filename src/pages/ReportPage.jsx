import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Download, Award, ArrowRight, RefreshCw, Copy, Check, ExternalLink
} from 'lucide-react'

// ---- Mock data ----
const COMPANY = 'Acme Startup'
const WEBSITE = 'acmestartup.com'
const OVERALL_SCORE = 67

const CHECKS_PASSED = [
  { name: 'SSL Certificate Valid', detail: 'TLS 1.3, expires in 287 days' },
  { name: 'HTTPS Enforced', detail: 'HTTP correctly redirects to HTTPS' },
  { name: 'Privacy Policy Found', detail: 'Linked in footer' },
  { name: 'SPF Record Present', detail: 'Email spoofing protection active' },
  { name: 'Reputable Hosting', detail: 'Hosted on AWS infrastructure' },
  { name: 'Robots.txt Present', detail: 'File found and accessible' },
]

const CHECKS_FAILED = [
  { name: 'Content-Security-Policy Missing', severity: 'CRITICAL', detail: 'No CSP header found. This exposes your site to XSS attacks.' },
  { name: 'HSTS Header Missing', severity: 'MEDIUM', detail: 'HTTP Strict Transport Security not configured.' },
  { name: 'Cookie Consent Banner Missing', severity: 'MEDIUM', detail: 'No cookie consent detected on page load. Required under GDPR.' },
  { name: 'X-Frame-Options Missing', severity: 'LOW', detail: 'Site may be vulnerable to clickjacking attacks.' },
  { name: 'DMARC Record Missing', severity: 'MEDIUM', detail: 'Email phishing protection not configured.' },
  { name: '.env File Exposure Risk', severity: 'CRITICAL', detail: '/.env path returned a non-404 response. Check immediately.' },
  { name: '12 Third-Party Scripts Detected', severity: 'LOW', detail: 'Each script is a potential attack surface.' },
  { name: 'No Bug Bounty / Disclosure Policy', severity: 'LOW', detail: 'No responsible disclosure page found.' },
]

const ACTION_PLAN = [
  {
    severity: 'CRITICAL', title: 'Add a Content-Security-Policy Header',
    why: "Without a CSP header, attackers can inject malicious scripts into your pages. This is one of the most common attack vectors in modern web apps.",
    steps: [
      "Add this to your server response headers:",
      "Content-Security-Policy: default-src 'self'; script-src 'self'",
      "Test using https://csp-evaluator.withgoogle.com",
      "Tighten the policy over time as you identify all sources"
    ]
  },
  {
    severity: 'CRITICAL', title: 'Check /.env File Exposure',
    why: "Your .env file may be publicly accessible. This could expose API keys, database credentials, and secrets.",
    steps: [
      "Visit yourdomain.com/.env in a browser",
      "If it loads anything other than a 404, block it immediately",
      "In Nginx: deny access to hidden files in your config",
      "Rotate all secrets that may have been exposed"
    ]
  },
  {
    severity: 'MEDIUM', title: 'Enable HSTS',
    why: "Without HSTS, browsers may connect to your site over HTTP before being redirected, leaving a window for attacks.",
    steps: [
      "Add this header: Strict-Transport-Security: max-age=31536000; includeSubDomains",
      "Submit your domain to the HSTS preload list at https://hstspreload.org"
    ]
  },
  {
    severity: 'MEDIUM', title: 'Add Cookie Consent Banner',
    why: "GDPR requires informed consent before setting non-essential cookies. Missing this exposes you to regulatory fines.",
    steps: [
      "Use a free tool like Cookiebot or CookieYes",
      "Configure it to block analytics cookies until consent is given",
      "Link to your cookie policy within the banner"
    ]
  },
  {
    severity: 'MEDIUM', title: 'Configure DMARC Record',
    why: "Without DMARC, attackers can send emails pretending to be from your domain, damaging user trust.",
    steps: [
      "Go to your DNS provider",
      "Add TXT record: _dmarc.yourdomain.com",
      "Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com",
      "Monitor reports at https://dmarcanalyzer.com"
    ]
  },
]

// ---- Helper components ----

function SeverityBadge({ severity, small }) {
  const color = severity === 'CRITICAL' ? '#ef4444' : severity === 'MEDIUM' ? '#f59e0b' : '#64748b'
  const bg = severity === 'CRITICAL' ? '#ef444420' : severity === 'MEDIUM' ? '#f59e0b20' : '#64748b20'
  return (
    <span style={{
      display: 'inline-block', padding: small ? '0.15rem 0.6rem' : '0.2rem 0.75rem',
      background: bg, border: `1px solid ${color}50`, borderRadius: '9999px',
      color, fontWeight: 700, fontSize: small ? '0.65rem' : '0.72rem',
      letterSpacing: '0.07em', textTransform: 'uppercase'
    }}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }) {
  const color = status === 'PASSED' ? '#22c55e' : status === 'FAILED' ? '#ef4444' : '#f59e0b'
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.6rem',
      background: `${color}15`, border: `1px solid ${color}40`, borderRadius: '9999px',
      color, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.06em'
    }}>
      {status}
    </span>
  )
}

// Animated score dial
function ScoreDial({ score }) {
  const [displayed, setDisplayed] = useState(0)
  const size = 200
  const strokeWidth = 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayed / 100) * circumference

  useEffect(() => {
    let current = 0
    const duration = 1500
    const start = Date.now()
    const animate = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      current = Math.round(ease * score)
      setDisplayed(current)
      if (progress < 1) requestAnimationFrame(animate)
    }
    const timer = setTimeout(() => requestAnimationFrame(animate), 200)
    return () => clearTimeout(timer)
  }, [score])

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e1e2e" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#dialGrad)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.6))', transition: 'stroke-dashoffset 0.03s linear' }}
        />
        <defs>
          <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: '3rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{displayed}</span>
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/100</span>
      </div>
    </div>
  )
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: '8px', background: '#1e1e2e', borderRadius: '9999px', overflow: 'hidden', marginTop: '0.5rem' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: '9999px',
        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
        boxShadow: `0 0 8px ${color}60`,
        transition: 'width 1s ease',
      }} />
    </div>
  )
}

function ActionCard({ item }) {
  const [open, setOpen] = useState(false)
  const borderColor = item.severity === 'CRITICAL' ? '#ef444430' : item.severity === 'MEDIUM' ? '#f59e0b30' : '#64748b30'
  return (
    <div style={{
      background: '#12121a', border: `1px solid ${borderColor}`,
      borderRadius: '1rem', overflow: 'hidden', transition: 'border-color 0.2s ease',
    }}>
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <SeverityBadge severity={item.severity} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>{item.title}</span>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>{item.why}</p>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: '#6366f1', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none', padding: 0
          }}
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          How to Fix
        </button>
      </div>
      {open && (
        <div style={{
          borderTop: '1px solid #1e1e2e', padding: '1.25rem 1.5rem',
          background: '#0e0e1a',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {item.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#6366f120', border: '1px solid #6366f140',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6366f1', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginTop: '1px'
                }}>{i + 1}</div>
                <span style={{
                  fontSize: '0.83rem', color: '#94a3b8', lineHeight: 1.6,
                  fontFamily: step.includes('Content-Security-Policy') || step.includes('Strict-Transport') || step.includes('v=DMARC') || step.includes('_dmarc') ? 'monospace' : 'inherit',
                  color: step.includes('Content-Security-Policy') || step.includes('Strict-Transport') || step.includes('v=DMARC') || step.includes('_dmarc') ? '#a78bfa' : '#94a3b8',
                }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BadgePreview({ score, grade, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
      background: '#0a0a0f', border: '1px solid #1e1e2e',
      borderRadius: '12px', padding: '0.75rem 1.25rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '7px',
        background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Shield size={15} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TrustLens</div>
        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Verified</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{score}</span>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/100</span>
      </div>
      <div style={{
        width: '28px', height: '28px', borderRadius: '7px',
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '1rem', color: 'white'
      }}>{grade}</div>
    </div>
  )
}

// ---- Main Report Page ----
export default function ReportPage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const EMBED_CODE = `<a href="https://trustlens.io/verify/${WEBSITE}"><img src="https://trustlens.io/badge/${WEBSITE}.svg" alt="TrustLens Verified"/></a>`

  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(EMBED_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 1.5rem' }}>

      {/* Score Hero */}
      <div className="animate-fade-up" style={{
        background: 'linear-gradient(135deg, #12121a, #0e0e1a)',
        border: '1px solid #1e1e2e', borderRadius: '1.5rem', padding: '2.5rem',
        marginBottom: '2rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
          {WEBSITE} · Security Report
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2rem' }}>
          {COMPANY} — GRC Trust Report
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center' }}>
          <ScoreDial score={OVERALL_SCORE} />

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '12px', background: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1.75rem', color: 'white', flexShrink: 0
              }}>C</div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.1rem' }}>Trust Grade</div>
                <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1rem' }}>Needs Improvement</div>
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your site has room to improve. Here's exactly what to fix.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Download size={15} /> Download Report (PDF)
              </button>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Award size={15} /> Get My Badge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Governance', score: 18, max: 30, pct: 60, color: '#f59e0b', note: 'Policies present but team controls need work' },
          { label: 'Risk', score: 28, max: 40, pct: 70, color: '#6366f1', note: 'SSL is good. Headers and third-party exposure flagged.' },
          { label: 'Compliance', score: 21, max: 30, pct: 70, color: '#a78bfa', note: 'Privacy policy found. Cookie consent missing.' },
        ].map((c, i) => (
          <div key={i} className="card-hover" style={{
            background: '#12121a', border: '1px solid #1e1e2e',
            borderRadius: '1rem', padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{c.label}</span>
              <span style={{ fontWeight: 700, color: c.color }}>{c.score}<span style={{ color: '#64748b', fontWeight: 400 }}>/{c.max}</span></span>
            </div>
            <ProgressBar pct={c.pct} color={c.color} />
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.75rem', lineHeight: 1.5 }}>{c.note}</p>
          </div>
        ))}
      </div>

      {/* Detailed Findings */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>What We Checked</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {CHECKS_PASSED.length} passed · {CHECKS_FAILED.length} issues found
        </p>

        {/* Passed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {CHECKS_PASSED.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: '#12121a', border: '1px solid #1e1e2e',
              borderRadius: '0.75rem', padding: '0.875rem 1.25rem',
              flexWrap: 'wrap'
            }}>
              <CheckCircle size={18} color="#22c55e" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#f8fafc', flex: 1, minWidth: '150px' }}>{c.name}</span>
              <StatusBadge status="PASSED" />
              <span style={{ color: '#64748b', fontSize: '0.8rem', flex: 1 }}>{c.detail}</span>
            </div>
          ))}
        </div>

        {/* Failed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CHECKS_FAILED.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: '#12121a', border: `1px solid ${c.severity === 'CRITICAL' ? '#ef444420' : c.severity === 'MEDIUM' ? '#f59e0b20' : '#1e1e2e'}`,
              borderRadius: '0.75rem', padding: '0.875rem 1.25rem',
              flexWrap: 'wrap'
            }}>
              {c.severity === 'LOW'
                ? <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                : <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />}
              <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#f8fafc', flex: 1, minWidth: '150px' }}>{c.name}</span>
              <StatusBadge status={c.severity === 'LOW' ? 'WARNING' : 'FAILED'} />
              <SeverityBadge severity={c.severity} small />
              <span style={{ color: '#64748b', fontSize: '0.8rem', flex: 1 }}>{c.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Plan */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>Your Action Plan</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Fix these in order of severity to boost your score.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ACTION_PLAN.map((item, i) => <ActionCard key={i} item={item} />)}
        </div>
      </div>

      {/* Badge Section */}
      <div style={{
        background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1.5rem',
        padding: '2rem', marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.4rem' }}>
          You're 33 points away from an A grade
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Keep improving to level up your badge.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Now — Grade C</span>
            <BadgePreview score={67} grade="C" color="#f59e0b" />
          </div>
          <ArrowRight size={18} color="#64748b" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>After fixes — Grade B</span>
            <BadgePreview score={80} grade="B" color="#6366f1" />
          </div>
          <ArrowRight size={18} color="#64748b" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Goal — Grade A</span>
            <BadgePreview score={100} grade="A" color="#22c55e" />
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Embed Code
        </div>
        <div style={{
          background: '#0a0a0f', border: '1px solid #2e2e3e', borderRadius: '0.75rem',
          padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.8rem',
          color: '#94a3b8', marginBottom: '0.75rem', overflowX: 'auto', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all'
        }}>
          {EMBED_CODE}
        </div>
        <button className="btn-primary" onClick={copyCode}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Rescan */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0f1e, #12121a)',
        border: '1px solid #6366f130', borderRadius: '1.25rem', padding: '2rem',
        textAlign: 'center'
      }}>
        <RefreshCw size={28} color="#6366f1" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
          Fixed some issues?
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Rescan your site and watch your score climb.
        </p>
        <button className="btn-primary" onClick={() => navigate('/scan')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <RefreshCw size={15} /> Rescan Now
        </button>
      </div>
    </div>
  )
}
