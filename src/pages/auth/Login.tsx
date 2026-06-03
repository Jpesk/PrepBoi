import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Input } from '../../components/ui'
import { BookMarked } from 'lucide-react'

export const Login: React.FC = () => {
  const { T } = useTheme()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await signIn(email, password)
    setLoading(false)

    if (err) {
      setError(err.message || 'Failed to authenticate.')
    } else {
      navigate('/tasks')
    }
  }

  // Pre-fill fields for easy evaluation/demo logins
  const loadDemo = (role: 'employee' | 'manager') => {
    if (role === 'manager') {
      setEmail('manager@preppro.io')
      setPassword('manager123')
    } else {
      setEmail('employee@preppro.io')
      setPassword('employee123')
    }
  }

  const pageBg =
    T.mode === 'dark'
      ? 'linear-gradient(135deg, #0F0E0D 0%, #1D1C1A 50%, #0F0E0D 100%)'
      : 'linear-gradient(135deg, #F0EDE8 0%, #FAF8F5 50%, #F0EDE8 100%)'

  const gridColor =
    T.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)'

  const gridTexture = `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`

  return (
    <div
      style={{
        minHeight: '100vh',
        background: pageBg,
        backgroundImage: gridTexture,
        backgroundSize: '20px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      {/* Fade-in keyframe injection */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Glassmorphism card */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background:
            T.mode === 'dark'
              ? 'rgba(29, 28, 26, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border:
            '1px solid ' +
            (T.mode === 'dark'
              ? 'rgba(235,234,230,0.12)'
              : 'rgba(42,40,37,0.1)'),
          borderRadius: 16,
          boxShadow:
            T.mode === 'dark'
              ? '0 24px 64px rgba(0,0,0,0.4)'
              : '0 24px 64px rgba(0,0,0,0.1)',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          animation: 'fadeInUp 0.4s ease-out'
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${T.brand}, ${T.brandAlt})`,
              boxShadow: `0 8px 24px ${T.brandBd}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BookMarked size={24} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: T.t1,
                letterSpacing: '-0.3px'
              }}
            >
              PrepPro
            </div>
            <div
              style={{
                fontSize: 10,
                color: T.t3,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginTop: 8,
                fontFamily: "'Inter', sans-serif"
              }}
            >
              Operations &amp; Training Platform
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                padding: '12px 16px',
                background: T.redLo,
                border: `1px solid ${T.redBd}`,
                borderRadius: 10,
                color: T.red,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            autoComplete="username"
            placeholder="name@organization.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <Btn
            type="submit"
            v="brand"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
            ariaLabel={loading ? 'Authenticating, please wait' : 'Sign in to PrepPro'}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Btn>
        </form>

        {/* Quick Demo Assist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Styled separator with label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: T.line }} />
            <span
              style={{
                fontSize: 10,
                color: T.t3,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}
            >
              Evaluate Credentials
            </span>
            <div style={{ flex: 1, height: 1, background: T.line }} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Btn v="ghost" sz="sm" style={{ flex: 1 }} onClick={() => loadDemo('employee')}>
              Staff Demo
            </Btn>
            <Btn v="ghost" sz="sm" style={{ flex: 1 }} onClick={() => loadDemo('manager')}>
              Manager Demo
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
