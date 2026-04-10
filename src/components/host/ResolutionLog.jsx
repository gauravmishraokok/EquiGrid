export default function ResolutionLog({ history }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 12, padding: 14, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        Resolution Log
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...history].reverse().map((entry, i) => {
          const levelColors = {
            STABLE:   '#16A34A',
            STRESSED: '#CA8A04',
            CRITICAL: '#EA580C',
            CASCADE:  '#DC2626',
          }
          const level = entry.metrics?.conflictLevel || 'STABLE'
          const c = levelColors[level] || '#16A34A'
          return (
            <div key={i} style={{
              background: '#F7F9FF', border: '1px solid #E2E8F7', borderRadius: 10,
              padding: '10px 12px',
              animation: i === 0 ? 'toast-enter 0.4s ease' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: '#0F172A' }}>
                  Round {entry.round}
                </span>
                <span style={{ background: `${c}15`, border: `1px solid ${c}40`, color: c, borderRadius: 12, padding: '1px 8px', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: '0.06em' }}>
                  {level}
                </span>
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#475569' }}>
                {entry.metrics?.resolutionStrategy || 'Proportional Fair'}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#94A3B8' }}>
                  Jain: {(entry.metrics?.jainsIndex ?? 0).toFixed(2)}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#94A3B8' }}>
                  Conflict: {Math.round(entry.metrics?.conflictIntensityScore ?? 0)}/100
                </span>
              </div>
            </div>
          )
        })}
        {(!history || history.length === 0) && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#CBD5E1' }}>
            No rounds resolved yet
          </div>
        )}
      </div>
    </div>
  )
}
