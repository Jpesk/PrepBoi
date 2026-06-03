import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Btn, Input } from '../../components/ui'
import { Shield, Sparkles } from 'lucide-react'

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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: T.bg1,
          border: `1px solid ${T.line}`,
          borderRadius: 4,
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Fine Accent Line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: T.brand }} />

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 4, background: T.brandLo, border: `1px solid ${T.brandBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color={T.brand} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", color: T.t1, letterSpacing: '-0.3px' }}>
              PrepPro
            </div>
            <div style={{ fontSize: 10, color: T.t3, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 8, fontFamily: "'Inter', sans-serif" }}>
              Operations & White-Labeled Compliance
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{ padding: '12px 16px', background: T.redLo, border: `1px solid ${T.redBd}`, borderRadius: 4, color: T.red, fontSize: 13, fontWeight: 600 }}
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

          <Btn type="submit" v="brand" style={{ width: '100%', marginTop: 8 }} disabled={loading} ariaLabel={loading ? 'Authenticating, please wait' : 'Sign in to PrepPro'}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </Btn>
        </form>

        {/* Quick Demo Assist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `1px solid ${T.line}`, paddingTop: 24 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.t4, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif" }}>
            <Sparkles size={11} /> Evaluate Demo Credentials
          </span>
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
