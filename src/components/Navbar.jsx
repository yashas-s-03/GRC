import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, Zap, X, Mail, Lock, Globe2 } from 'lucide-react'

// ---- Sign In Modal ----
function SignInModal({ onClose }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-up"
        style={{
          background: '#12121a', border: '1px solid #1e1e2e',
          borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth: '400px',
          position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #2e2e3e',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f8fafc' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <X size={15} />
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '28px', height: '28px', background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
            Trust<span style={{ color: '#6366f1' }}>Lens</span>
          </span>
        </div>

        <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#f8fafc', marginBottom: '0.4rem' }}>Welcome back</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem' }}>Sign in to your TrustLens account</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
            <input className="input-base" type="email" placeholder="you@startup.com" style={{ paddingLeft: '2.4rem' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={15} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
            <input className="input-base" type="password" placeholder="Password" style={{ paddingLeft: '2.4rem' }} />
          </div>
        </div>

        <button className="btn-primary" style={{ width: '100%', fontSize: '0.95rem', padding: '0.8rem', marginBottom: '1.25rem' }}>
          Sign In
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
        </div>

        <button
          style={{
            width: '100%', padding: '0.75rem',
            background: 'transparent', border: '1px solid #2e2e3e',
            borderRadius: '0.75rem', color: '#f8fafc', fontWeight: 500, fontSize: '0.9rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            transition: 'all 0.2s', marginBottom: '1.5rem',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#4a4a6a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#2e2e3e' }}
        >
          <Globe2 size={17} color="#a78bfa" />
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <button
            onClick={() => { onClose(); navigate('/scan') }}
            style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', padding: 0 }}
          >
            Start for free
          </button>
        </p>
      </div>
    </div>
  )
}

// ---- Navbar ----
export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showSignIn, setShowSignIn] = useState(false)

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 120)
    } else {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const linkStyle = {
    color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
    transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', padding: 0,
  }

  return (
    <>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}

      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid #1e1e2e',
        backdropFilter: 'blur(16px)',
        background: 'rgba(10, 10, 15, 0.8)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}
            >
              <div style={{
                width: '32px', height: '32px',
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={18} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                Trust<span style={{ color: '#6366f1' }}>Lens</span>
              </span>
            </button>

            {/* Nav Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <button
                  style={linkStyle}
                  onClick={() => scrollToSection('how-it-works')}
                  onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  How it Works
                </button>
                <button
                  style={linkStyle}
                  onClick={() => scrollToSection('pricing')}
                  onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  Pricing
                </button>
                <button
                  style={linkStyle}
                  onClick={() => setShowSignIn(true)}
                  onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  Sign In
                </button>
              </div>
              <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}
                onClick={() => navigate('/scan')}
              >
                <Zap size={15} /> Scan Now
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
