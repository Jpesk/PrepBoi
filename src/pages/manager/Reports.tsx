import React, { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { BarChart3, ClipboardCheck } from 'lucide-react'
import Dashboard from './Dashboard'
import Reviews from './Reviews'

export const Reports: React.FC = () => {
  const { T } = useTheme()
  const [activeTab, setActiveTab] = useState<'monitor' | 'reviews'>('monitor')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 800,
          margin: 0,
          color: T.t1,
          letterSpacing: '-0.5px',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Operational Reports
        </h1>
        <p style={{ fontSize: 14, color: T.t3, margin: '4px 0 0 0', fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>
          Monitor live shift progress and review completed form submissions.
        </p>
      </div>

      {/* Segmented Tab Control */}
      <div
        role="tablist"
        aria-label="Reports sections"
        style={{ display: 'inline-flex', alignSelf: 'flex-start', background: T.mode === 'dark' ? 'rgba(29, 28, 26, 0.4)' : 'rgba(0, 0, 0, 0.03)', border: `1px solid ${T.line2}`, borderRadius: 12, padding: 4, gap: 2 }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'monitor'}
          aria-controls="reports-panel-monitor"
          id="reports-tab-monitor"
          onClick={() => setActiveTab('monitor')}
          style={{
            background: activeTab === 'monitor' ? T.bg0 : 'transparent',
            boxShadow: activeTab === 'monitor' ? `0 1px 3px rgba(0,0,0,0.1)` : 'none',
            border: `1px solid ${activeTab === 'monitor' ? T.line2 : 'transparent'}`,
            color: activeTab === 'monitor' ? T.t1 : T.t3,
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: activeTab === 'monitor' ? 700 : 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <BarChart3 size={14} aria-hidden="true" /> Live Monitor
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'reviews'}
          aria-controls="reports-panel-reviews"
          id="reports-tab-reviews"
          onClick={() => setActiveTab('reviews')}
          style={{
            background: activeTab === 'reviews' ? T.bg0 : 'transparent',
            boxShadow: activeTab === 'reviews' ? `0 1px 3px rgba(0,0,0,0.1)` : 'none',
            border: `1px solid ${activeTab === 'reviews' ? T.line2 : 'transparent'}`,
            color: activeTab === 'reviews' ? T.t1 : T.t3,
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: activeTab === 'reviews' ? 700 : 500,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <ClipboardCheck size={14} aria-hidden="true" /> Form Submissions
        </button>
      </div>

      <div style={{ marginTop: 4 }}>
        {activeTab === 'monitor' ? (
          <div role="tabpanel" id="reports-panel-monitor" aria-labelledby="reports-tab-monitor">
            <Dashboard hideHeader />
          </div>
        ) : (
          <div role="tabpanel" id="reports-panel-reviews" aria-labelledby="reports-tab-reviews">
            <Reviews hideHeader />
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports
