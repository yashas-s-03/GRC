import { useNavigate } from 'react-router-dom'
import { Shield, Home } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        fontSize: 'clamp(6rem, 20vw, 10rem)', fontWeight: 900,
        letterSpacing: '-0.05em', lineHeight: 1,
        background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', marginBottom: '1rem',
      }}>
        404
      </div>

      <div style={{
        width: '48px', height: '48px', background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem', boxShadow: '0 0 20px rgba(99,102,241,0.4)',
      }}>
        <Shield size={24} color="white" />
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
        Page not found
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem', maxWidth: '360px', lineHeight: 1.6 }}>
        This page doesn't exist. Let's get you back.
      </p>

      <button
        className="btn-primary"
        onClick={() => navigate('/')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}
      >
        <Home size={16} /> Go Home
      </button>
    </div>
  )
}
