import { BUILDINGS } from '../../config/buildings.js'

function MetricBar({ value, max = 1, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ height: 8, background: '#E2E8F7', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 1s ease' }} />
    </div>
  )
}

export default function FairnessMetrics({ metrics, allocations }) {
  const jainsIndex = metrics?.jainsIndex ?? 0
  const gini = metrics?.giniCoefficient ?? 0
  const algorithm = metrics?.resolutionStrategy || '—'
  const jainColor = jainsIndex > 0.8 ? '#16A34A' : jainsIndex > 0.6 ? '#CA8A04' : '#DC2626'

  if (!metrics) {
    return (
      <div style={{
        background: 'white', border: '1px solid #E2E8F7', borderRadius: 12,
        fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#94A3B8', textAlign: 'center',
        padding: '20px 14px',
      }}>
        No metrics yet — run resolution first
      </div>
    )
  }

  // Build rows sorted by satisfaction ascending
  const rows = Object.entries(BUILDINGS).map(([id, b]) => {
    const alloc = allocations?.[id]
    return {
      id, b,
      allocated: alloc?.allocatedKw ?? 0,
      requested: alloc?.requestedKw ?? b.base,
      satisfaction: alloc?.satisfactionScore ?? 0,
    }
  }).sort((a, z) => a.satisfaction - z.satisfaction)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Fairness card */}
      <div style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 12, padding: 14 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Fairness Metrics
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#475569' }}>Jain's Index</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: jainColor }}>{jainsIndex.toFixed(2)}</span>
          </div>
          <MetricBar value={jainsIndex} max={1} color={jainColor} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#475569' }}>Gini Coefficient</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: '#475569' }}>{gini.toFixed(2)}</span>
          </div>
          <MetricBar value={1 - gini} max={1} color="#6366F1" />
        </div>
        {algorithm !== '—' && (
          <div style={{ marginTop: 8, padding: '4px 10px', background: '#F0F4FF', border: '1px solid #DBEAFE', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: '#1A56DB' }}>{algorithm}</span>
          </div>
        )}
      </div>

      {/* Building satisfaction table */}
      {allocations && (
        <div style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 12, padding: 14 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Building Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rows.map(({ id, b, allocated, requested, satisfaction }) => {
              const pct = requested > 0 ? allocated / requested : 0
              const c = pct >= 0.9 ? '#16A34A' : pct >= 0.7 ? '#CA8A04' : '#DC2626'
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid #F8FAFF' }}>
                  <span style={{ fontSize: 13 }}>{b.emoji}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#475569', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name.split(' ').slice(-1)[0]}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: c, whiteSpace: 'nowrap' }}>
                    {allocated}/{requested}kW
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: c, minWidth: 30, textAlign: 'right' }}>
                    {satisfaction}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
