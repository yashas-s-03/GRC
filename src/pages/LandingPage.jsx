import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, ArrowRight, CheckCircle, Zap, Lock, FileText, Globe,
  Award, Users, Search, Star, Check
} from 'lucide-react'

// Animated circular progress ring
function CircleProgress({ percentage, color, size = 120, strokeWidth = 10, label, score, max }) {
  const [prog, setProg] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (prog / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0
      const step = () => {
        start += 2
        if (start <= percentage) { setProg(start); requestAnimationFrame(step) }
        else setProg(percentage)
      }
      requestAnimationFrame(step)
    }, 300)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e1e2e" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s linear', filter: `drop-shadow(0 0 8px ${color}60)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: size > 100 ? '1.4rem' : '1rem', color: '#f8fafc' }}>{score}</span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>/{max}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>{label}</div>
      </div>
    </div>
  )
}

function TrustBadge({ score, grade, gradeColor }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
      background: '#12121a', border: '1px solid #1e1e2e',
      borderRadius: '12px', padding: '0.75rem 1.25rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Shield size={16} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TrustLens</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{score}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/100</span>
      </div>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: gradeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>
        {grade}
      </div>
    </div>
  )
}

// ---- Pricing Section ----
function PricingSection() {
  const navigate = useNavigate()

  const tiers = [
    {
      name: 'Starter', price: '$0', period: 'forever',
      popular: false,
      features: ['1 scan per month', 'Basic GRC score', 'Pass/Fail checklist', 'Community support'],
      noFeatures: ['Embeddable badge', 'Email report delivery', 'Priority scan queue'],
      cta: 'Start Free',
      ctaStyle: 'secondary',
    },
    {
      name: 'Founder', price: '$19', period: '/month',
      popular: true,
      features: ['Unlimited rescans', 'Full GRC report + action plan', 'Embeddable trust badge', 'Email report delivery', 'Priority scan queue'],
      noFeatures: [],
      cta: 'Get Started',
      ctaStyle: 'primary',
    },
    {
      name: 'Team', price: '$49', period: '/month',
      popular: false,
      features: ['Everything in Founder', 'Up to 5 domains', 'Team dashboard', 'Slack / email score alerts', 'Compliance history log'],
      noFeatures: [],
      cta: 'Contact Us',
      ctaStyle: 'secondary',
    },
  ]

  return (
    <section id="pricing" style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="section-label" style={{ marginBottom: '0.75rem' }}>Pricing</div>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
          Simple, transparent pricing
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '0.75rem', fontSize: '0.95rem' }}>
          Start free. Upgrade when you're ready to prove trust to the world.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {tiers.map((tier, i) => (
          <div key={i} style={{
            background: '#12121a',
            border: tier.popular ? '1px solid #6366f1' : '1px solid #1e1e2e',
            borderRadius: '1.25rem', padding: '2rem', position: 'relative',
            boxShadow: tier.popular ? '0 0 32px rgba(99,102,241,0.2)' : 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = tier.popular ? '0 0 40px rgba(99,102,241,0.3)' : '0 8px 30px rgba(0,0,0,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = tier.popular ? '0 0 32px rgba(99,102,241,0.2)' : 'none' }}
          >
            {/* Most Popular badge */}
            {tier.popular && (
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                borderRadius: '9999px', padding: '0.25rem 1rem',
                fontSize: '0.7rem', fontWeight: 700, color: 'white', letterSpacing: '0.06em',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
                boxShadow: '0 0 16px rgba(99,102,241,0.5)',
              }}>
                ★ Most Popular
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: tier.popular ? '#a78bfa' : '#64748b', marginBottom: '0.5rem' }}>
                {tier.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{tier.price}</span>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{tier.period}</span>
              </div>
            </div>

            <div style={{ height: '1px', background: '#1e1e2e', marginBottom: '1.5rem' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
              {tier.features.map((f, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{f}</span>
                </div>
              ))}
              {tier.noFeatures.map((f, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: 0.35 }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1px solid #64748b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#64748b', textDecoration: 'line-through' }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              className={tier.ctaStyle === 'primary' ? 'btn-primary' : 'btn-secondary'}
              style={{ width: '100%', fontSize: '0.9rem', padding: '0.75rem' }}
              onClick={() => navigate('/scan')}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---- Main Landing Page ----
export default function LandingPage({ setScannedUrl }) {
  const [url, setUrl] = useState('')
  const navigate = useNavigate()

  const handleScan = () => {
    setScannedUrl(url.trim())
    navigate('/scan')
  }

  return (
    <div>
      {/* Hero */}
      <section style={{ padding: '5rem 1.5rem 4rem', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '9999px', padding: '0.35rem 1rem', marginBottom: '2rem',
          fontSize: '0.8rem', color: '#a78bfa', fontWeight: 500
        }}>
          <Zap size={13} /> Free instant GRC score for startups
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#f8fafc', marginBottom: '1.25rem' }}>
          Does Your Startup<br />
          <span className="gradient-text">Pass the Trust Test?</span>
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Anyone can build a website in a day. TrustLens tells you — and your users — if it's actually safe.
        </p>

        {/* URL Input */}
        <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
          <div style={{
            display: 'flex', gap: '0.75rem', background: '#12121a',
            border: '1px solid #2e2e3e', borderRadius: '1rem', padding: '0.5rem',
            boxShadow: '0 0 40px rgba(99,102,241,0.1)',
          }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Globe size={16} style={{ position: 'absolute', left: '0.75rem', color: '#6366f1', flexShrink: 0 }} />
              <input
                type="url" value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="https://yourstartup.com"
                id="hero-url-input"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#f8fafc', fontSize: '1rem', paddingLeft: '2.5rem',
                  paddingRight: '0.75rem', paddingTop: '0.6rem', paddingBottom: '0.6rem',
                  width: '100%', fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
            <button className="btn-primary" onClick={handleScan} id="hero-scan-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
              <Search size={15} /> Scan My Website
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {[
            { icon: <Users size={14} />, text: '500+ startups scanned' },
            { icon: <Shield size={14} />, text: '12 security checks' },
            { icon: <Zap size={14} />, text: 'Free instant report' },
          ].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500,
              background: '#12121a', border: '1px solid #1e1e2e',
              borderRadius: '9999px', padding: '0.35rem 1rem',
            }}>
              <span style={{ color: '#6366f1' }}>{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>Process</div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            How It Works
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { step: '01', icon: <Globe size={24} />, title: 'Enter your URL', desc: "Paste your website link and we'll start an automated scan of your public-facing attack surface.", color: '#6366f1' },
            { step: '02', icon: <FileText size={24} />, title: 'Answer 5-minute form', desc: 'Tell us about your stack, policies, and practices. This unlocks the full GRC scoring model.', color: '#a78bfa' },
            { step: '03', icon: <Award size={24} />, title: 'Get your GRC Score', desc: 'Receive a full security audit report with actionable fixes and an embeddable trust badge.', color: '#60a5fa' },
          ].map((item, i) => (
            <div key={i} className="card-hover" style={{
              background: '#12121a', border: '1px solid #1e1e2e',
              borderRadius: '1rem', padding: '2rem', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1.25rem', fontSize: '3rem', fontWeight: 900, color: '#1e1e2e', lineHeight: 1 }}>{item.step}</div>
              <div style={{ width: '48px', height: '48px', background: `${item.color}20`, border: `1px solid ${item.color}40`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, marginBottom: '1.25rem' }}>
                {item.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why TrustLens */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #1a0a0a, #12121a)', border: '1px solid #ef444430', borderRadius: '1.25rem', padding: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: '#ef444420', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <Zap size={20} color="#ef4444" />
            </div>
            <div className="section-label" style={{ color: '#ef4444', marginBottom: '0.75rem' }}>The Problem</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', lineHeight: 1.3 }}>
              Vibe coding is fast.<br />Security is not optional.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Anyone can ship a product in a weekend with AI tools. But users have no way to know if a site is actually safe to trust with their email, payments, or data.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {['No visibility into safety', 'No security baseline', 'No user trust signal'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #0a0f1a, #12121a)', border: '1px solid #6366f130', borderRadius: '1.25rem', padding: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: '#6366f120', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <Shield size={20} color="#6366f1" />
            </div>
            <div className="section-label" style={{ color: '#6366f1', marginBottom: '0.75rem' }}>The Solution</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', lineHeight: 1.3 }}>
              A standardized GRC score<br />that means something.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7 }}>
              TrustLens scans your site and evaluates your policies to generate a real GRC score. Founders can prove safety to investors and users — and display a verified badge to build trust instantly.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {['Automated security scan', 'Verified trust score badge', 'Actionable fix recommendations'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <CheckCircle size={14} color="#22c55e" />{t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Score Breakdown */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>Scoring</div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Your GRC Score Breakdown
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '0.75rem', fontSize: '0.95rem' }}>Three dimensions, one trust score. Up to 100 points total.</p>
        </div>
        <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1.5rem', padding: '3rem', display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6366f1', fontWeight: 600, marginBottom: '0.75rem' }}>Sample Score</div>
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
              <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="#1e1e2e" strokeWidth="12" />
                <circle cx="80" cy="80" r="68" fill="none" stroke="url(#scoreGrad)" strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - 0.67)}
                  strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 12px #6366f1)' }} />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>67</span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/100</span>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'inline-flex', padding: '0.3rem 0.9rem', background: '#f59e0b20', border: '1px solid #f59e0b40', borderRadius: '9999px', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>C Grade</div>
          </div>
          <div style={{ width: '1px', height: '160px', background: '#1e1e2e', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <CircleProgress percentage={60} color="#f59e0b" size={110} strokeWidth={9} label="Governance" score="18" max="30" />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', maxWidth: '130px' }}>Policies, controls,<br />incident response</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <CircleProgress percentage={70} color="#6366f1" size={110} strokeWidth={9} label="Risk" score="28" max="40" />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', maxWidth: '130px' }}>SSL, headers,<br />third-party exposure</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <CircleProgress percentage={70} color="#a78bfa" size={110} strokeWidth={9} label="Compliance" score="21" max="30" />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', maxWidth: '130px' }}>Privacy, consent,<br />regulations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Badge */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>Trust Badge</div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Display Your Trust Score
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '0.75rem', fontSize: '0.95rem' }}>Embed a verified badge on your site. Let users know you take security seriously.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1.25rem', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <div className="section-label">Badge Preview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <TrustBadge score={92} grade="A" gradeColor="#22c55e" />
              <TrustBadge score={78} grade="B" gradeColor="#6366f1" />
              <TrustBadge score={67} grade="C" gradeColor="#f59e0b" />
              <TrustBadge score={44} grade="D" gradeColor="#ef4444" />
            </div>
          </div>
          <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '1.25rem', padding: '2rem' }}>
            <div className="section-label" style={{ marginBottom: '1rem' }}>Embed Code</div>
            <div style={{ background: '#0a0a0f', border: '1px solid #2e2e3e', borderRadius: '0.75rem', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7, overflowX: 'auto' }}>
              <span style={{ color: '#64748b' }}>{`<!-- TrustLens Badge -->`}</span>{'\n'}
              <span style={{ color: '#a78bfa' }}>{`<a `}</span><span style={{ color: '#6366f1' }}>href</span><span style={{ color: '#94a3b8' }}>=</span><span style={{ color: '#22c55e' }}>"https://trustlens.io/verify/yourdomain"</span><span style={{ color: '#a78bfa' }}>{`>`}</span>{'\n  '}
              <span style={{ color: '#a78bfa' }}>{`<img `}</span><span style={{ color: '#6366f1' }}>src</span><span style={{ color: '#94a3b8' }}>=</span><span style={{ color: '#22c55e' }}>"https://trustlens.io/badge/yourdomain.svg"</span>{'\n  '}
              <span style={{ color: '#6366f1' }}>alt</span><span style={{ color: '#94a3b8' }}>=</span><span style={{ color: '#22c55e' }}>"TrustLens Verified"</span><span style={{ color: '#a78bfa' }}>{`/>`}</span>{'\n'}
              <span style={{ color: '#a78bfa' }}>{`</a>`}</span>
            </div>
            <button className="btn-primary" style={{ marginTop: '1.25rem', width: '100%', fontSize: '0.875rem' }}
              onClick={() => navigator.clipboard && navigator.clipboard.writeText(`<a href="https://trustlens.io/verify/yourdomain"><img src="https://trustlens.io/badge/yourdomain.svg" alt="TrustLens Verified"/></a>`)}>
              Copy Embed Code
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* CTA Banner */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f0f1a)', border: '1px solid #6366f130', borderRadius: '1.5rem', padding: '3rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
            Ready to prove your startup is safe?
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem' }}>
            Join 500+ founders who have scanned their sites and leveled up their trust posture.
          </p>
          <button className="btn-primary" onClick={() => navigate('/scan')}
            style={{ fontSize: '1rem', padding: '0.875rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Get My Free GRC Score <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1e1e2e', padding: '3rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #6366f1, #a78bfa)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={14} color="white" />
              </div>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>Trust<span style={{ color: '#6366f1' }}>Lens</span></span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '240px', lineHeight: 1.6 }}>A standardized GRC trust score for the vibe coding era.</p>
          </div>
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1rem' }}>Product</div>
              {['Home', 'How it Works', 'Pricing', 'Blog'].map(l => (
                <div key={l} style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#94a3b8'}
                    onMouseLeave={e => e.target.style.color = '#64748b'}>{l}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>© 2024 TrustLens. Built for the vibe coding era.</span>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Privacy · Terms · Security</span>
        </div>
      </footer>
    </div>
  )
}
