import { useEffect } from 'react'

const COLORS = {
  success: { bg: '#052e16', border: '#22c55e40', text: '#22c55e', icon: '✓' },
  error:   { bg: '#1a0a0a', border: '#ef444440', text: '#ef4444', icon: '✗' },
  info:    { bg: '#0f0f2e', border: '#6366f140', text: '#a78bfa', icon: 'ℹ' },
}

export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [onClose])

  const c = COLORS[type] || COLORS.info
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: '12px', padding: '0.75rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999,
      animation: 'slideUp 0.3s ease-out',
      color: c.text, fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap',
    }}>
      <span>{c.icon}</span>
      <span style={{ color: '#f8fafc', fontWeight: 500 }}>{message}</span>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

export function useToast(setToast) {
  return (message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
  }
}
