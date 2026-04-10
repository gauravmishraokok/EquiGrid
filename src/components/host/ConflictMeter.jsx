export default function ConflictMeter({ conflictScore, conflictLevel }) {
  const colors = {
    STABLE:   '#22C55E',
    STRESSED: '#EAB308',
    CRITICAL: '#F97316',
    CASCADE:  '#DC2626',
  }
  const c = colors[conflictLevel] || '#22C55E'
  const pct = Math.min(100, Math.max(0, conflictScore ?? 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Conflict
      </div>
      {/* Level badge */}
      <div style={{
        fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 10,
        color: c, background: `${c}15`, border: `1px solid ${c}40`,
        borderRadius: 12, padding: '2px 8px', letterSpacing: '0.06em',
      }}>
        {conflictLevel || 'STABLE'}
      </div>
      {/* Thermometer track */}
      <div style={{ position: 'relative', width: 36, height: 180, background: '#E2E8F7', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: `linear-gradient(to top, ${c}, ${c}99)`,
          borderRadius: 18,
          transition: 'height 1s ease, background 0.8s ease',
        }} />
        {/* Score overlay */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11,
          color: pct > 40 ? 'white' : '#475569',
          writingMode: 'vertical-rl', textOrientation: 'mixed',
        }}>
          {Math.round(pct)}
        </div>
      </div>
      {/* Level markers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
        {['CASCADE', 'CRITICAL', 'STRESSED', 'STABLE'].map(l => (
          <div key={l} style={{
            fontFamily: "'Inter', sans-serif", fontSize: 8, fontWeight: 500,
            color: l === conflictLevel ? c : '#CBD5E1',
          }}>{l}</div>
        ))}
      </div>
    </div>
  )
}
