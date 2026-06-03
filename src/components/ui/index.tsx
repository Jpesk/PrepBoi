import React, { useRef, useState, useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { ThemeTokens } from '../../lib/theme'
import { 
  Check, X, AlertTriangle, Inbox, PenTool, 
  Trophy, BookOpen, Volume2, Shield
} from 'lucide-react'

// ── BUTTON ────────────────────────────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode
  v?: 'brand' | 'amber' | 'lime' | 'red' | 'sky' | 'ghost' | 'outline' | 'danger'
  sz?: 'xs' | 'sm' | 'md' | 'lg'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
  title?: string
  ariaLabel?: string
}

export const Btn: React.FC<BtnProps> = ({ 
  children, v = 'ghost', sz = 'md', onClick, disabled, style = {}, type = 'button', title, ariaLabel
}) => {
  const { T } = useTheme()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const sizes = {
    xs: { padding: '6px 12px', fontSize: 10, borderRadius: '6px 4px 5px 4px/4px 5px 4px 6px', letterSpacing: '0.8px', textTransform: 'uppercase' as const },
    sm: { padding: '8px 18px', fontSize: 11, borderRadius: '8px 6px 7px 5px/5px 7px 6px 8px', letterSpacing: '1px', textTransform: 'uppercase' as const },
    md: { padding: '12px 24px', fontSize: 12, borderRadius: '10px 8px 9px 8px/8px 9px 8px 10px', letterSpacing: '1.2px', textTransform: 'uppercase' as const },
    lg: { padding: '14px 30px', fontSize: 13, borderRadius: '12px 10px 11px 9px/9px 11px 10px 12px', letterSpacing: '1.5px', textTransform: 'uppercase' as const },
  }

  const outlineColor = T.mode === 'light' ? '#2A2825' : '#EBEAE6'
  const baseBorder = `2px solid ${outlineColor}`

  const vars = {
    brand: { background: T.brand, color: '#fff', border: baseBorder },
    amber: { background: T.amber, color: '#fff', border: baseBorder },
    lime: { background: T.lime, color: '#fff', border: baseBorder },
    red: { background: T.red, color: '#fff', border: baseBorder },
    sky: { background: T.sky, color: '#fff', border: baseBorder },
    ghost: { background: T.bg3, color: T.t1, border: baseBorder },
    outline: { background: 'transparent', color: T.t1, border: baseBorder },
    danger: { background: T.redLo, color: T.red, border: `2px solid ${T.red}` },
  }

  const transformValue = disabled
    ? 'none'
    : pressed
      ? 'translate(1.5px, 1.5px)'
      : hovered
        ? 'translate(-2px, -2px)'
        : 'translate(0, 0)'

  const shadowValue = disabled
    ? 'none'
    : pressed
      ? '0px 0px 0px 0px transparent'
      : hovered
        ? `3.5px 3.5px 0px 0px ${v === 'danger' ? T.red : outlineColor}`
        : `1.5px 1.5px 0px 0px ${v === 'danger' ? T.red : outlineColor}`

  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'transform 0.1s ease, box-shadow 0.1s ease, background 0.15s ease',
        opacity: disabled ? 0.45 : 1,
        transform: transformValue,
        boxShadow: shadowValue,
        WebkitTapHighlightColor: 'transparent',
        ...sizes[sz],
        ...(vars[v] || vars.ghost),
        ...style
      }}
    >
      {children}
    </button>
  )
}

// ── TEXT INPUT ────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({ label, error, id, style = {}, onFocus, onBlur, ...props }) => {
  const { T } = useTheme()
  const fallbackId = React.useId()
  const inputId = id || fallbackId
  const [focused, setFocused] = useState(false)

  const outlineColor = T.mode === 'light' ? '#2A2825' : '#EBEAE6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label 
          htmlFor={inputId}
          style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '0.8px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onFocus={(e) => {
          setFocused(true)
          if (onFocus) onFocus(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        style={{
          background: T.bg2,
          border: `2px solid ${error ? T.red : focused ? T.brand : outlineColor}`,
          borderRadius: '8px',
          color: T.t1,
          padding: '12px 14px',
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
          width: '100%',
          boxShadow: focused
            ? `0 0 0 3px ${T.brandBd}`
            : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          ...style
        }}
        {...props}
      />
      {error && (
        <span 
          id={`${inputId}-error`}
          style={{ fontSize: 12, color: T.red, fontWeight: 600 }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

// ── SELECT ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select: React.FC<SelectProps> = ({ label, children, id, style = {}, onFocus, onBlur, ...props }) => {
  const { T } = useTheme()
  const fallbackId = React.useId()
  const selectId = id || fallbackId
  const [focused, setFocused] = useState(false)

  const outlineColor = T.mode === 'light' ? '#2A2825' : '#EBEAE6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label 
          htmlFor={selectId}
          style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '1.2px', cursor: 'pointer' }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        onFocus={(e) => {
          setFocused(true)
          if (onFocus) onFocus(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        style={{
          background: T.bg3,
          border: `2px solid ${focused ? T.brand : outlineColor}`,
          borderRadius: '8px',
          color: T.t1,
          padding: '12px 14px',
          fontSize: 14,
          fontFamily: 'inherit',
          outline: 'none',
          width: '100%',
          cursor: 'pointer',
          boxShadow: focused
            ? `0 0 0 3px ${T.brandBd}`
            : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          ...style
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── TEXTAREA ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, style = {}, onFocus, onBlur, ...props }) => {
  const { T } = useTheme()
  const fallbackId = React.useId()
  const textareaId = id || fallbackId
  const [focused, setFocused] = useState(false)

  const outlineColor = T.mode === 'light' ? '#2A2825' : '#EBEAE6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label 
          htmlFor={textareaId}
          style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: 'uppercase', letterSpacing: '1.2px', cursor: 'pointer' }}
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        onFocus={(e) => {
          setFocused(true)
          if (onFocus) onFocus(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        style={{
          background: T.bg3,
          border: `2px solid ${focused ? T.brand : outlineColor}`,
          borderRadius: '8px',
          color: T.t1,
          padding: '12px 14px',
          fontSize: 14,
          fontFamily: 'inherit',
          outline: 'none',
          width: '100%',
          resize: 'vertical',
          lineHeight: 1.6,
          boxShadow: focused
            ? `0 0 0 3px ${T.brandBd}`
            : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          ...style
        }}
        {...props}
      />
    </div>
  )
}

// ── CARD ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({ children, style = {}, onClick }) => {
  const { T } = useTheme()
  const [hov, setHov] = React.useState(false)

  const isClickable = !!onClick

  const transformValue = isClickable && hov
    ? 'translate(-2px, -2px)'
    : 'translate(0, 0)'

  const shadowValue = isClickable && hov
    ? '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)'
    : '0 2px 12px rgba(0,0,0,0.08)'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => isClickable && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surfaceGlass,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${T.line2}`,
        borderRadius: '16px 14px 18px 15px/15px 17px 14px 16px',
        padding: 20,
        cursor: isClickable ? 'pointer' : 'default',
        boxShadow: shadowValue,
        transform: transformValue,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ── PILL / BADGE ──────────────────────────────────────────────────────────────
interface PillProps {
  children: React.ReactNode
  fg?: string
  bg?: string
  bd?: string
  style?: React.CSSProperties
}

export const Pill: React.FC<PillProps> = ({ children, fg, bg, bd, style = {} }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 2,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '1px',
        color: fg,
        background: bg,
        border: bd ? `1px solid ${bd}` : 'none',
        textTransform: 'uppercase',
        ...style
      }}
    >
      {children}
    </span>
  )
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
export const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => {
  const { T } = useTheme()
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.t2,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 10,
        fontFamily: "'Inter', sans-serif",
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ── DIVIDER ───────────────────────────────────────────────────────────────────
export const Divider: React.FC = () => {
  const { T } = useTheme()
  return <div style={{ height: 1.5, background: T.line, margin: '12px 0' }} />
}

// ── PROGRESS RING ─────────────────────────────────────────────────────────────
interface RingProps {
  pct: number
  size?: number
  color: string
}

export const Ring: React.FC<RingProps> = ({ pct, size = 48, color }) => {
  const { T } = useTheme()
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.bg5} strokeWidth={3.5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size < 40 ? 9 : 11,
          fontWeight: 800,
          color,
          fontFamily: "'JetBrains Mono', monospace"
        }}
      >
        {pct}%
      </div>
    </div>
  )
}

// ── SPINNER ───────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number }> = ({ size = 36 }) => {
  const { T } = useTheme()
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}
    >
      <div
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3.5px solid ${T.bg4}`,
          borderTop: `3.5px solid ${T.brand}`,
          animation: 'pb-spin .8s linear infinite'
        }}
      />
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
interface EmptyProps {
  iconName?: 'inbox' | 'book' | 'trophy'
  message: string
  sub?: string
}

export const Empty: React.FC<EmptyProps> = ({ iconName = 'inbox', message, sub }) => {
  const { T } = useTheme()
  const renderIcon = () => {
    switch (iconName) {
      case 'book': return <BookOpen size={28} color={T.brand} />
      case 'trophy': return <Trophy size={28} color={T.brand} />
      default: return <Inbox size={28} color={T.brand} />
    }
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        gap: 12,
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: T.brandLo,
          border: `1.5px solid ${T.brandBd}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {renderIcon()}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.t2 }}>{message}</div>
      {sub && <div style={{ fontSize: 13, color: T.t4, maxWidth: 280, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  children: React.ReactNode
  onClose: () => void
  title: string
  width?: number
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, title, width = 480 }) => {
  const { T } = useTheme()
  const titleId = React.useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap: on mount focus the dialog, on unmount restore focus
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 3, 10, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0
      }}
      aria-hidden="true"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: width,
          background: T.bg1,
          borderRadius: '4px 4px 0 0',
          border: `1px solid ${T.line}`,
          borderBottom: 'none',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'pb-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${T.line}`,
            flexShrink: 0
          }}
        >
          <span id={titleId} style={{ fontSize: 18, fontWeight: 700, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: T.bg3,
              border: `1px solid ${T.line}`,
              borderRadius: 4,
              width: 32,
              height: 32,
              color: T.t3,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onDone: () => void
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onDone }) => {
  const { T } = useTheme()
  const colors = { success: T.lime, error: T.red, info: T.sky }
  const renderIcon = () => {
    switch (type) {
      case 'error': return <AlertTriangle size={16} color={T.red} aria-hidden="true" />
      case 'info': return <BookOpen size={16} color={T.sky} aria-hidden="true" />
      default: return <Check size={16} color={T.lime} aria-hidden="true" />
    }
  }

  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        background: T.bg2,
        border: `1px solid ${colors[type] || T.lime}`,
        borderRadius: 4,
        padding: '12px 20px',
        fontSize: 13,
        fontWeight: 700,
        color: colors[type] || T.lime,
        animation: 'pb-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        whiteSpace: 'nowrap',
        maxWidth: '90vw',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
      onClick={onDone}
    >
      {renderIcon()}
      {message}
    </div>
  )
}

// ── SIGNATURE PAD ─────────────────────────────────────────────────────────────
interface SigPadProps {
  value: string | null
  onChange: (val: string | null) => void
}

export const SigPad: React.FC<SigPadProps> = ({ value, onChange }) => {
  const { T } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(!!value)

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    // Scale standard coordinates relative to high-resolution canvas size
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)
    return { x, y }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    isDrawing.current = true
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e, canvas)
    ctx.strokeStyle = T.brand
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      onChange(canvas.toDataURL())
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1.5px solid ${hasSignature ? T.brand : T.line}`,
          background: T.bg3,
          transition: 'border-color 0.2s'
        }}
      >
        <canvas
          ref={canvasRef}
          width={700}
          height={120}
          role="img"
          aria-label={hasSignature ? 'Signature canvas — signature captured' : 'Signature canvas — draw your signature here'}
          tabIndex={0}
          style={{ display: 'block', width: '100%', height: 100, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: T.t4,
              fontSize: 14,
              gap: 8
            }}
          >
            <PenTool size={16} /> Sign on screen
          </div>
        )}
        {hasSignature && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 8,
              right: 12,
              fontSize: 10,
              fontWeight: 800,
              color: T.brand,
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Check size={12} /> SIGNED
          </div>
        )}
      </div>
      {hasSignature && (
        <button
          onClick={clear}
          aria-label="Clear signature"
          style={{
            alignSelf: 'flex-end',
            fontSize: 12,
            color: T.red,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <X size={12} aria-hidden="true" /> Clear Signature
        </button>
      )}
    </div>
  )
}

// ── KIOSK PIN PAD ─────────────────────────────────────────────────────────────
interface KioskPINPadProps {
  onSuccess: (pin: string) => Promise<boolean>
}

export const KioskPINPad: React.FC<KioskPINPadProps> = ({ onSuccess }) => {
  const { T } = useTheme()
  const [pin, setPin] = useState<string>('')
  const [error, setError] = useState<boolean>(false)
  const [verifying, setVerifying] = useState<boolean>(false)

  const pressDigit = (digit: string) => {
    if (pin.length >= 4) return
    setError(false)
    const nextPin = pin + digit
    setPin(nextPin)
  }

  const backspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }

  useEffect(() => {
    if (pin.length === 4) {
      setVerifying(true)
      onSuccess(pin).then(success => {
        setVerifying(false)
        if (!success) {
          setError(true)
          setPin('') // Clear PIN on error
          // Clear error highlight after 1s
          setTimeout(() => setError(false), 1200)
        }
      })
    }
  }, [pin, onSuccess])

  const dotArray = [0, 1, 2, 3]

  const errorMsgId = React.useId()

  return (
    <div
      role="group"
      aria-label="PIN entry pad"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 320, width: '100%' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Shield size={32} strokeWidth={1.5} color={error ? T.red : verifiesColor(pin, verifying, T)} aria-hidden="true" />
        <div
          id={errorMsgId}
          role={error ? 'alert' : undefined}
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: 11, fontWeight: 700, color: error ? T.red : T.t3, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}
        >
          {error ? 'INVALID PIN — TRY AGAIN' : verifying ? 'VERIFYING PIN...' : 'ENTER KIOSK ACCESS PIN'}
        </div>
      </div>

      {/* Dots Indicator */}
      <div style={{ display: 'flex', gap: 20 }}>
        {dotArray.map(idx => {
          const filled = pin.length > idx
          return (
            <div
              key={idx}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: `1px solid ${error ? T.red : filled ? T.brand : T.line2}`,
                background: error ? T.red : filled ? T.brand : 'transparent',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          )
        })}
      </div>

      {/* Number Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          width: '100%',
          marginTop: 8
        }}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(val => (
          <button
            key={val}
            onClick={() => pressDigit(val)}
            aria-label={`Digit ${val}`}
            style={{
              height: 64,
              borderRadius: '50%',
              background: 'transparent',
              border: `1px solid ${T.line}`,
              color: T.t1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 26,
              fontWeight: 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'
              ;(e.currentTarget as HTMLButtonElement).style.background = T.brandLo
            }}
            onMouseUp={e => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {val}
          </button>
        ))}
        {/* Clear key */}
        <button
          onClick={() => setPin('')}
          style={{
            height: 64,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: T.t3,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          CLEAR
        </button>
        {/* 0 Key */}
        <button
          onClick={() => pressDigit('0')}
          style={{
            height: 64,
            borderRadius: '50%',
            background: 'transparent',
            border: `1px solid ${T.line}`,
            color: T.t1,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 26,
            fontWeight: 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseDown={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'
            ;(e.currentTarget as HTMLButtonElement).style.background = T.brandLo
          }}
          onMouseUp={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          0
        </button>
        {/* Backspace Key */}
        <button
          onClick={backspace}
          style={{
            height: 64,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: T.t3,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          DELETE
        </button>
      </div>
    </div>
  )
}

function verifiesColor(pin: string, verifying: boolean, T: ThemeTokens) {
  if (verifying) return T.sky
  if (pin.length === 4) return T.lime
  return T.brand
}

// ── PREPPET GRAPHIC (SVG ANIMATIONS) ─────────────────────────────────────────
interface PrepPetGraphicProps {
  type: 'doughboi' | 'bobamon' | 'slicemon' | 'generic' | 'coffeebot' | 'tacotchi' | 'sushimon' | 'burgerpal' | 'waffly'
  mood: 'happy' | 'sad' | 'hungry' | 'sleeping'
}

export const PrepPetGraphic: React.FC<PrepPetGraphicProps> = ({ type, mood }) => {
  const isSleeping = mood === 'sleeping'
  const isSad = mood === 'sad'
  const isHungry = mood === 'hungry'

  // Bouncing/breathing styles using inline animation keyframes
  const animationStyle = isSleeping
    ? { animation: 'pet-sleep 3s ease-in-out infinite' }
    : { animation: 'pet-breathe 2s ease-in-out infinite' }

  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes pet-breathe {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-4px) scaleY(1.03); }
        }
        @keyframes pet-sleep {
          0%, 100% { transform: translateY(0) scale(0.98); opacity: 0.85; }
          50% { transform: translateY(2px) scale(1); opacity: 1; }
        }
        @keyframes zzz-float {
          0% { transform: translate(10px, 0) scale(0.6); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translate(25px, -30px) scale(1); opacity: 0; }
        }
      `}</style>

      {/* Sleeping Particles */}
      {isSleeping && (
        <div style={{ position: 'absolute', right: 10, top: 15, fontSize: 16, fontWeight: 800, color: '#A855F7', pointerEvents: 'none' }}>
          <span style={{ display: 'inline-block', animation: 'zzz-float 3s infinite' }}>Z</span>
          <span style={{ display: 'inline-block', animation: 'zzz-float 3s infinite 1s', marginLeft: 4 }}>z</span>
          <span style={{ display: 'inline-block', animation: 'zzz-float 3s infinite 2s', marginLeft: 8 }}>z</span>
        </div>
      )}

      <svg width="100%" height="100%" viewBox="0 0 100 100" style={animationStyle}>
        {/* DOUGHBOI (Sourdough Monster) */}
        {type === 'doughboi' && (
          <g>
            {/* Blob Body */}
            <path d="M15,70 C10,40 30,15 50,15 C70,15 90,40 85,70 C80,85 20,85 15,70 Z" fill="#F4EAD4" stroke="#D3C1A2" strokeWidth="3" />
            {/* Chef Hat */}
            <g transform="translate(30, -5)">
              <path d="M10,25 C5,15 15,10 20,15 C25,8 35,12 35,18 C45,15 45,25 40,28 L10,28 Z" fill="#FFFFFF" stroke="#D3C1A2" strokeWidth="2" />
              <rect x="12" y="25" width="26" height="5" fill="#FFFFFF" stroke="#D3C1A2" strokeWidth="2" rx="1" />
            </g>
            {/* Eyes */}
            {isSleeping ? (
              <>
                <path d="M30,50 L40,50" stroke="#7A6855" strokeWidth="3" strokeLinecap="round" />
                <path d="M60,50 L70,50" stroke="#7A6855" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : isSad || isHungry ? (
              <>
                <ellipse cx="35" cy="50" rx="4" ry="2" fill="#7A6855" />
                <ellipse cx="65" cy="50" rx="4" ry="2" fill="#7A6855" />
                {/* Tear if sad */}
                {isSad && <circle cx="35" cy="57" r="3" fill="#38BDF8" />}
              </>
            ) : (
              <>
                <circle cx="35" cy="48" r="6" fill="#7A6855" />
                <circle cx="33" cy="46" r="2" fill="#FFFFFF" />
                <circle cx="65" cy="48" r="6" fill="#7A6855" />
                <circle cx="63" cy="46" r="2" fill="#FFFFFF" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="62" r="3" fill="#7A6855" />
            ) : isSad || isHungry ? (
              <path d="M42,65 Q50,58 58,65" stroke="#7A6855" strokeWidth="3" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M40,60 Q50,72 60,60" stroke="#7A6855" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}
            {/* Rosy Cheeks */}
            {!isSleeping && !isHungry && (
              <>
                <circle cx="25" cy="55" r="4" fill="#FCA5A5" opacity="0.6" />
                <circle cx="75" cy="55" r="4" fill="#FCA5A5" opacity="0.6" />
              </>
            )}
          </g>
        )}

        {/* BOBAMON (Boba Monster) */}
        {type === 'bobamon' && (
          <g>
            {/* Cup Outer Body */}
            <path d="M25,25 L32,80 C33,85 37,88 42,88 L58,88 C63,88 67,85 68,80 L75,25 Z" fill="rgba(168, 85, 247, 0.15)" stroke="#A855F7" strokeWidth="3.5" />
            <ellipse cx="50" cy="25" rx="25" ry="5" fill="#C084FC" stroke="#A855F7" strokeWidth="2" />
            {/* Boba Pearls inside */}
            <circle cx="38" cy="80" r="5" fill="#3B0764" />
            <circle cx="48" cy="81" r="5" fill="#3B0764" />
            <circle cx="54" cy="76" r="5" fill="#3B0764" />
            <circle cx="62" cy="79" r="5" fill="#3B0764" />
            <circle cx="43" cy="74" r="5" fill="#3B0764" />
            {/* Eyes */}
            {isSleeping ? (
              <>
                <path d="M38,48 C38,51 44,51 44,48" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M56,48 C56,51 62,51 62,48" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : isSad || isHungry ? (
              <>
                <ellipse cx="40" cy="46" rx="5" ry="3" fill="#3B0764" />
                <ellipse cx="60" cy="46" rx="5" ry="3" fill="#3B0764" />
              </>
            ) : (
              <>
                <circle cx="40" cy="46" r="6" fill="#3B0764" />
                <circle cx="38" cy="44" r="2" fill="#FFFFFF" />
                <circle cx="60" cy="46" r="6" fill="#3B0764" />
                <circle cx="58" cy="44" r="2" fill="#FFFFFF" />
              </>
            )}
            {/* Straw */}
            <rect x="58" y="5" width="8" height="28" fill="#F472B6" transform="rotate(15 62 19)" stroke="#DB2777" strokeWidth="1.5" rx="2" />
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="56" r="3" fill="#3B0764" />
            ) : isSad || isHungry ? (
              <line x1="45" y1="58" x2="55" y2="58" stroke="#3B0764" strokeWidth="3" strokeLinecap="round" />
            ) : (
              <path d="M45,54 Q50,64 55,54" stroke="#3B0764" strokeWidth="3" fill="none" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* SLICEMON (Pizza Slice) */}
        {type === 'slicemon' && (
          <g>
            {/* Pizza Crust */}
            <path d="M12,20 C38,13 62,13 88,20 C85,26 82,30 80,30 C58,23 42,23 20,30 Z" fill="#D97706" stroke="#B45309" strokeWidth="2.5" />
            {/* Pizza Body */}
            <path d="M20,28 L50,88 L80,28 C60,23 40,23 20,28 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2.5" />
            {/* Pepperoni Pepperoni */}
            <circle cx="32" cy="40" r="5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
            <circle cx="68" cy="42" r="5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
            <circle cx="50" cy="56" r="5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
            {/* Eyes */}
            {isSleeping ? (
              <>
                <path d="M38,48 L46,48" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M54,48 L62,48" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="42" cy="44" r="5" fill="#78350F" />
                <circle cx="58" cy="44" r="5" fill="#78350F" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="50" r="2" fill="#78350F" />
            ) : isSad || isHungry ? (
              <path d="M46,52 Q50,47 54,52" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M46,50 Q50,58 54,50" stroke="#78350F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* GENERIC (Friendly Robot) */}
        {type === 'generic' && (
          <g>
            {/* Robot Head */}
            <rect x="25" y="25" width="50" height="46" rx="8" fill="#4B5563" stroke="#1F2937" strokeWidth="3" />
            {/* Antenna */}
            <line x1="50" y1="25" x2="50" y2="10" stroke="#1F2937" strokeWidth="3" />
            <circle cx="50" cy="10" r="4" fill={isSleeping ? '#EF4444' : '#10B981'} />
            {/* Screen */}
            <rect x="32" y="32" width="36" height="30" rx="4" fill="#1F2937" />
            {/* Eyes */}
            {isSleeping ? (
              <>
                <line x1="38" y1="44" x2="44" y2="44" stroke="#10B981" strokeWidth="2" />
                <line x1="56" y1="44" x2="62" y2="44" stroke="#10B981" strokeWidth="2" />
              </>
            ) : isSad || isHungry ? (
              <>
                <path d="M38,47 L44,43" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M62,47 L56,43" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="41" cy="45" r="3" fill="#10B981" />
                <circle cx="59" cy="45" r="3" fill="#10B981" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <line x1="47" y1="52" x2="53" y2="52" stroke="#10B981" strokeWidth="1.5" />
            ) : (
              <path d="M45,52 L55,52" stroke={isSad ? '#EF4444' : '#10B981'} strokeWidth="2" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* COFFEEBOT (Coffee Cup Monster) */}
        {type === 'coffeebot' && (
          <g>
            {/* Floating Steam */}
            {!isSleeping && (
              <path d="M42,10 Q45,5 42,0 M50,12 Q53,7 50,2 M58,10 Q61,5 58,0" stroke="#7A6855" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
            )}
            {/* Cup Body */}
            <path d="M28,25 L34,82 C35,86 39,89 44,89 L56,89 C61,89 65,86 66,82 L72,25 Z" fill="#EAE0D5" stroke="#5C5552" strokeWidth="3" />
            <ellipse cx="50" cy="25" rx="22" ry="4" fill="#C6AC8F" stroke="#5C5552" strokeWidth="2" />
            {/* Cup Sleeve */}
            <path d="M30,45 L32,65 C32,66 34,67 36,67 L64,67 C66,67 68,66 68,65 L70,45 Z" fill="#A98467" stroke="#5C5552" strokeWidth="2" />
            {/* Sleeve logo (coffee bean) */}
            <ellipse cx="50" cy="56" rx="5" ry="3" fill="#5C5552" transform="rotate(30 50 56)" />
            {/* Eyes */}
            {isSleeping ? (
              <>
                <path d="M36,38 Q40,41 40,38" stroke="#5C5552" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M60,38 Q64,41 64,38" stroke="#5C5552" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="40" cy="38" r="4.5" fill="#5C5552" />
                <circle cx="39" cy="36.5" r="1.5" fill="#FFFFFF" />
                <circle cx="60" cy="38" r="4.5" fill="#5C5552" />
                <circle cx="59" cy="36.5" r="1.5" fill="#FFFFFF" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="45" r="2.5" fill="#5C5552" />
            ) : isSad || isHungry ? (
              <path d="M46,47 Q50,43 54,47" stroke="#5C5552" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M46,45 Q50,52 54,45" stroke="#5C5552" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* TACOTCHI (Taco Companion) */}
        {type === 'tacotchi' && (
          <g>
            {/* Taco Shell */}
            <path d="M15,65 C15,30 31,18 50,18 C69,18 85,30 85,65 C85,67 80,72 50,72 C20,72 15,67 15,65 Z" fill="#F4D35E" stroke="#E9C46A" strokeWidth="3" />
            {/* Lettuce / Meat / Tomato curves inside shell */}
            <path d="M20,62 C23,50 30,45 35,50 C40,55 45,45 50,50 C55,55 60,45 65,50 C70,55 77,50 80,62" fill="none" stroke="#2EC4B6" strokeWidth="6" strokeLinecap="round" />
            <circle cx="28" cy="52" r="4" fill="#E76F51" />
            <circle cx="72" cy="52" r="4" fill="#E76F51" />
            <circle cx="50" cy="45" r="4" fill="#E76F51" />
            {/* Fold details */}
            <path d="M18,65 Q50,68 82,65" stroke="#D81159" strokeWidth="2" fill="none" opacity="0.3" />
            {/* Eyes */}
            {isSleeping ? (
              <>
                <path d="M34,44 L40,44" stroke="#264653" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M60,44 L66,44" stroke="#264653" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="36" cy="42" r="5" fill="#264653" />
                <circle cx="35" cy="40.5" r="1.5" fill="#FFFFFF" />
                <circle cx="64" cy="42" r="5" fill="#264653" />
                <circle cx="63" cy="40.5" r="1.5" fill="#FFFFFF" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="48" r="2" fill="#264653" />
            ) : isSad || isHungry ? (
              <path d="M46,51 Q50,47 54,51" stroke="#264653" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M46,49 Q50,56 54,49" stroke="#264653" strokeWidth="2" fill="none" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* SUSHIMON (Sushi Nigiri) */}
        {type === 'sushimon' && (
          <g>
            {/* Rice body */}
            <rect x="25" y="48" width="50" height="28" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="3" />
            {/* Salmon topping */}
            <path d="M16,46 C16,28 34,20 50,20 C66,20 84,28 84,46 C84,52 78,54 50,54 C22,54 16,52 16,46 Z" fill="#FF8360" stroke="#E05B35" strokeWidth="2.5" />
            {/* Salmon marbling lines */}
            <path d="M28,24 Q36,36 38,50" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
            <path d="M46,21 Q54,33 56,51" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
            <path d="M64,23 Q72,35 74,49" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
            {/* Seaweed Nori belt */}
            <rect x="42" y="27" width="16" height="46" rx="2" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
            {/* Face on the seaweed belt or salmon? Let's put it in the center for maximum cuteness! */}
            {isSleeping ? (
              <>
                <path d="M34,36 Q38,39 38,36" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M62,36 Q66,39 66,36" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            ) : isSad || isHungry ? (
              <>
                <ellipse cx="36" cy="34" rx="3.5" ry="2" fill="#FFFFFF" />
                <ellipse cx="64" cy="34" rx="3.5" ry="2" fill="#FFFFFF" />
                {isSad && <circle cx="36" cy="39" r="2.5" fill="#38BDF8" />}
              </>
            ) : (
              <>
                <circle cx="36" cy="34" r="4.5" fill="#FFFFFF" />
                <circle cx="35" cy="32.5" r="1.2" fill="#1E293B" />
                <circle cx="64" cy="34" r="4.5" fill="#FFFFFF" />
                <circle cx="63" cy="32.5" r="1.2" fill="#1E293B" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="40" r="2" fill="#FFFFFF" />
            ) : isSad || isHungry ? (
              <path d="M46,42 Q50,38 54,42" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M45,39 Q50,45 55,39" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
            {/* Rosy Cheeks */}
            {!isSleeping && !isHungry && (
              <>
                <circle cx="26" cy="36" r="3" fill="#FFA3A3" opacity="0.8" />
                <circle cx="74" cy="36" r="3" fill="#FFA3A3" opacity="0.8" />
              </>
            )}
          </g>
        )}

        {/* BURGERPAL (Burger Buddy) */}
        {type === 'burgerpal' && (
          <g>
            {/* Bottom bun */}
            <path d="M22,76 C22,82 35,84 50,84 C65,84 78,82 78,76 Z" fill="#D97706" stroke="#B45309" strokeWidth="2" />
            {/* Burger patty */}
            <rect x="18" y="64" width="64" height="9" rx="4.5" fill="#5C5552" stroke="#3D3735" strokeWidth="2" />
            {/* Melted Cheese */}
            <path d="M17,65 L83,65 L80,71 L70,65 L55,73 L45,65 L30,71 L20,65 Z" fill="#F59E0B" />
            {/* Lettuce */}
            <path d="M16,57 C20,52 30,54 35,57 C40,60 45,54 50,57 C55,60 60,54 65,57 C70,60 80,52 84,57 L84,64 L16,64 Z" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
            {/* Top bun */}
            <path d="M20,52 C20,25 32,15 50,15 C68,15 80,25 80,52 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2.5" />
            {/* Sesame seeds */}
            <ellipse cx="38" cy="26" rx="2" ry="1" fill="#FFFFFF" transform="rotate(-15 38 26)" />
            <ellipse cx="62" cy="26" rx="2" ry="1" fill="#FFFFFF" transform="rotate(15 62 26)" />
            <ellipse cx="50" cy="21" rx="2" ry="1" fill="#FFFFFF" />
            {/* Face on the top bun */}
            {isSleeping ? (
              <>
                <path d="M36,38 Q40,41 40,38" stroke="#78350F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M60,38 Q64,41 64,38" stroke="#78350F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : isSad || isHungry ? (
              <>
                <ellipse cx="38" cy="36" rx="4" ry="2.5" fill="#78350F" />
                <ellipse cx="62" cy="36" rx="4" ry="2.5" fill="#78350F" />
                {isSad && <circle cx="38" cy="42" r="2.5" fill="#38BDF8" />}
              </>
            ) : (
              <>
                <circle cx="38" cy="36" r="5" fill="#78350F" />
                <circle cx="36.5" cy="34.5" r="1.5" fill="#FFFFFF" />
                <circle cx="62" cy="36" r="5" fill="#78350F" />
                <circle cx="60.5" cy="34.5" r="1.5" fill="#FFFFFF" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="43" r="2" fill="#78350F" />
            ) : isSad || isHungry ? (
              <path d="M46,45 Q50,41 54,45" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M45,42 Q50,50 55,42" stroke="#78350F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
          </g>
        )}

        {/* WAFFLY (Waffle Companion) */}
        {type === 'waffly' && (
          <g>
            {/* Waffle Body */}
            <rect x="18" y="18" width="64" height="64" rx="8" fill="#F2C14E" stroke="#C8963E" strokeWidth="3" />
            {/* Waffle grid indentations */}
            <rect x="25" y="25" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            <rect x="44" y="25" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            <rect x="63" y="25" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            
            <rect x="25" y="44" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            <rect x="44" y="44" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            <rect x="63" y="44" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            
            <rect x="25" y="63" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            <rect x="44" y="63" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            <rect x="63" y="63" width="11" height="11" rx="2" fill="#B28028" opacity="0.3" />
            {/* Melting Butter pat */}
            <rect x="40" y="28" width="15" height="13" rx="2.5" fill="#FCD34D" stroke="#D97706" strokeWidth="1" transform="rotate(12 47.5 34.5)" />
            <path d="M46,39 C46,45 52,43 52,48 C52,52 48,54 48,56" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75" />
            {/* Face in the middle/lower rows */}
            {isSleeping ? (
              <>
                <path d="M34,53 L40,53" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M60,53 L66,53" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : isSad || isHungry ? (
              <>
                <ellipse cx="36" cy="49" rx="4" ry="2.5" fill="#78350F" />
                <ellipse cx="64" cy="49" rx="4" ry="2.5" fill="#78350F" />
                {isSad && <circle cx="36" cy="55" r="2.5" fill="#38BDF8" />}
              </>
            ) : (
              <>
                <circle cx="36" cy="49" r="5" fill="#78350F" />
                <circle cx="34.5" cy="47" r="1.5" fill="#FFFFFF" />
                <circle cx="64" cy="49" r="5" fill="#78350F" />
                <circle cx="62.5" cy="47" r="1.5" fill="#FFFFFF" />
              </>
            )}
            {/* Mouth */}
            {isSleeping ? (
              <circle cx="50" cy="56" r="2" fill="#78350F" />
            ) : isSad || isHungry ? (
              <path d="M46,58 Q50,54 54,58" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M45,56 Q50,64 55,56" stroke="#78350F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}
          </g>
        )}
      </svg>

    </div>
  )
}

interface PetStatus {
  name: string
  level: number
  exp: number
  health: number
  happiness: number
  treats: number
  accessories?: string[]
}

interface PrepPetWidgetProps {
  status: PetStatus
  themeType: 'doughboi' | 'bobamon' | 'slicemon' | 'generic' | 'coffeebot' | 'tacotchi' | 'sushimon' | 'burgerpal' | 'waffly'
  onFeed?: () => void
}

export const PrepPetWidget: React.FC<PrepPetWidgetProps> = ({ status, themeType, onFeed }) => {
  const { T } = useTheme()
  const { name, level, exp, health, happiness, treats } = status

  // Determine pet expression
  let mood: 'happy' | 'sad' | 'hungry' | 'sleeping' = 'happy'
  if (health < 40) mood = 'sad'
  else if (happiness < 50) mood = 'hungry'
  
  // Dynamic level progression math
  const expNeeded = level * 100
  const expProgress = Math.min(100, Math.round((exp / expNeeded) * 100))

  return (
    <div
      style={{
        background: T.bg2,
        border: `1px solid ${T.line2}`,
        borderRadius: 4,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-30%',
          width: '160%',
          height: '160%',
          background: `radial-gradient(circle, ${T.brandLo} 0%, transparent 60%)`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Level Banner */}
      <div style={{ zIndex: 1, display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{name}</span>
          <span style={{ fontSize: 11, color: T.t3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
            Theme: {themeType}
          </span>
        </div>
        <div
          style={{
            background: T.brandLo,
            border: `1px solid ${T.brandBd}`,
            borderRadius: 4,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: T.brand,
            fontFamily: "'DM Sans', sans-serif"
          }}
        >
          LVL {level}
        </div>
      </div>

      {/* SVG Character */}
      <div style={{ zIndex: 1 }}>
        <PrepPetGraphic type={themeType} mood={mood} />
      </div>

      {/* Vitals Bars */}
      <div style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: T.t3 }}>
            <span>HEALTH</span>
            <span style={{ color: health < 50 ? T.red : T.lime }}>{health}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: T.bg4, borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${health}%`,
                height: '100%',
                background: health < 50 ? T.red : T.lime,
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Happiness */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: T.t3 }}>
            <span>HAPPINESS</span>
            <span style={{ color: happiness < 50 ? T.amber : T.sky }}>{happiness}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: T.bg4, borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${happiness}%`,
                height: '100%',
                background: happiness < 50 ? T.amber : T.sky,
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>

        {/* Experience Level Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: T.t3 }}>
            <span>LEVEL PROGRESS</span>
            <span>{exp} / {expNeeded} EXP</span>
          </div>
          <div style={{ width: '100%', height: 6, background: T.bg4, borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${expProgress}%`,
                height: '100%',
                background: T.brand,
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Feed Button */}
      {onFeed && (
        <Btn
          v="brand"
          sz="md"
          disabled={treats <= 0 || health >= 100 && happiness >= 100}
          onClick={onFeed}
          style={{ width: '100%', zIndex: 1, marginTop: 8 }}
        >
          <Volume2 size={16} /> Feed Treat ({treats} left)
        </Btn>
      )}
    </div>
  )
}
