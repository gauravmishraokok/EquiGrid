import { useState } from 'react'

export default function SubmissionForm({ building, onSubmit, submitted, loading }) {
  const [demand, setDemand] = useState(building.base)
  const [weight, setWeight] = useState(3)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const pct = ((demand - 20) / Math.max(building.max - 20, 1)) * 100
  const sliderBg = `linear-gradient(to right, #1A56DB ${pct}%, #E2E8F7 ${pct}%)`

  const handleSubmit = () => {
    if (reason.trim().length < 3) {
      setError('Please state your reason.')
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      return
    }
    setError('')
    onSubmit({ demandKw: demand, weight, rawReason: reason })
  }

  if (submitted) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: '#1A56DB', marginBottom: 6 }}>
          Requisition Submitted
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#475569' }}>
          Waiting for resolution...
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Building details box */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Building Details</div>
        <div style={{ background: '#F7F9FF', border: '1px solid #E2E8F7', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{building.emoji} {building.name}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Tier {building.tier} — {building.type}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Base Allocation: {building.base} kW</div>
        </div>
      </div>

      {/* Demand slider */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Power Demand (kW)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="range"
            min={20}
            max={building.max}
            step={10}
            value={demand}
            onChange={e => setDemand(Number(e.target.value))}
            disabled={loading}
            style={{ flex: 1, background: sliderBg }}
          />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 20, color: '#0F172A', minWidth: 60, textAlign: 'right' }}>
            {demand}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
          <span>Min: 20 kW</span>
          <span>Max: {building.max} kW</span>
        </div>
      </div>

      {/* Weight buttons */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Importance Level</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1,2,3,4,5].map(w => (
            <button
              key={w}
              onClick={() => setWeight(w)}
              disabled={loading}
              style={{
                width: 48, height: 48, borderRadius: 8, border: `1.5px solid ${w === weight ? '#1A56DB' : '#E2E8F7'}`,
                background: w === weight ? '#1A56DB' : '#F7F9FF',
                color: w === weight ? 'white' : '#94A3B8',
                fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: w === weight ? '0 4px 12px rgba(26,86,219,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >{w}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
          <span>Low priority</span>
          <span>Critical</span>
        </div>
      </div>

      {/* Reason textarea */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Reason for Request</div>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value.slice(0, 120)); setError('') }}
          maxLength={120}
          placeholder="State your urgency clearly."
          disabled={loading}
          className={shaking ? 'shake' : ''}
          style={{
            width: '100%', height: 88, resize: 'none',
            border: `1.5px solid ${error ? '#DC2626' : '#E2E8F7'}`,
            borderRadius: 12, padding: '12px 14px',
            fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#0F172A',
            background: '#F7F9FF', outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#1A56DB'; e.target.style.boxShadow = '0 0 0 3px rgba(26,86,219,0.12)'; e.target.style.background = 'white' }}
          onBlur={e => { e.target.style.borderColor = error ? '#DC2626' : '#E2E8F7'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F7F9FF' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {error ? <span style={{ fontSize: 12, color: '#DC2626' }}>{error}</span> : <span />}
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{reason.length}/120</span>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%', height: 48, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? '#CBD5E1' : 'linear-gradient(135deg, #1A56DB, #2563EB)',
          color: 'white',
          fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
          boxShadow: loading ? 'none' : '0 4px 16px rgba(26,86,219,0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {loading ? 'PROCESSING...' : 'SUBMIT REQUISITION'}
      </button>
    </div>
  )
}
