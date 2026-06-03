import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'

// Static dictionary of terms for the glossary engine
export const GLOSSARY: Record<string, string> = {
  sourdough: 'A naturally leavened bread that uses wild yeast and lactobacilli during fermentation, producing a sour, tangy flavor and robust crust.',
  'quaternary sanitizer': 'An active chemical disinfectant solution used for sanitizing prep tables. Must rest on surfaces for at least 60 seconds.',
  proofing: 'The final rise of shaped yeast dough before baking. Temperature and humidity must be closely regulated to prevent flat dough.',
  yield: 'The total output amount or volume produced from a completed batch or recipe.',
  laminating: 'The process of folding butter into dough multiple times to create paper-thin layers (essential for croissants and puff pastries).',
  'stretch and fold': 'A yeast dough development method that builds gluten strength and elasticity without intensive machine kneading.',
  'temp control': 'Strict monitoring and logging of refrigeration (below 41°F) and heating (above 140°F) to prevent bacterial growth.',
  sanitization: 'The process of reducing microbiological contamination to safe levels on food contact surfaces.',
  preshift: 'A quick 5-minute meeting or checklist completed before the active shift to align team members on goals.',
  gcm: 'Galois/Counter Mode. A mode of symmetric key cryptographic encryption that provides both data confidentiality and authentication.'
}

interface TooltipProps {
  term: keyof typeof GLOSSARY | string
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ term, children }) => {
  const { T } = useTheme()
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  
  const key = term.toLowerCase().trim()
  const definition = GLOSSARY[key] || 'Operational terminology definition.'

  // Manage click outside to close for mobile support
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    if (visible) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [visible])

  return (
    <span
      ref={ref}
      onClick={() => setVisible(!visible)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        borderBottom: `1.5px dashed ${T.brand}`,
        cursor: 'help',
        fontWeight: 600,
        color: T.t1,
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {children}
      {visible && (
        <div
          ref={bubbleRef}
          style={{
            position: 'absolute',
            bottom: '125%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 220,
            background: T.bg1,
            border: `1.5px solid ${T.brandBd}`,
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 100,
            pointerEvents: 'none',
            fontSize: 12,
            lineHeight: 1.5,
            color: T.t2,
            fontWeight: 400,
            textAlign: 'left'
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${T.brandBd}`
            }}
          />
          <div style={{ fontWeight: 800, color: T.brand, marginBottom: 4, textTransform: 'capitalize' }}>
            {term}
          </div>
          {definition}
        </div>
      )}
    </span>
  )
}
export default Tooltip
