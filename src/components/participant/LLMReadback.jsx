import { motion } from 'framer-motion'

const FLAG_COLORS = {
  suspicious:    '#DC2626',
  incomplete:    '#CA8A04',
  contradictory: '#EA580C',
  vague:         '#94A3B8',
  reasonable:    '#16A34A',
  urgent:        '#1A56DB',
  exaggerated:   '#7C3AED',
}

export default function LLMReadback({ structured }) {
  if (!structured) return null

  if (structured.error) {
    return (
      <div style={{
        background: '#FEFCE8', border: '1px solid #FDE047', borderRadius: 14, padding: '12px 16px',
        fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#CA8A04',
      }}>
        EquiGrid AI unavailable: {structured.error}
      </div>
    )
  }

  const {
    urgencyScore = 1,
    category = 'unknown',
    riskIfDenied,
    confidence = 0,
    flags = [],
    interpretedMeaning = '',
  } = structured

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'white', border: '1px solid #E2E8F7', borderRadius: 14,
        overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,86,219,0.08)',
      }}
    >
      {/* Header strip */}
      <div style={{ background: '#1A56DB', padding: '10px 16px' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: 'white', letterSpacing: '0.06em' }}>
          EQUIGRID POWER AUTHORITY
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
          How EquiGrid Read Your Request
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Interpreted As</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#0F172A', fontStyle: 'italic' }}>
            "{interpretedMeaning}"
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>URGENCY</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600, color: urgencyScore >= 8 ? '#DC2626' : urgencyScore >= 5 ? '#CA8A04' : '#16A34A' }}>
              {urgencyScore}<span style={{ fontSize: 12, color: '#94A3B8' }}>/10</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CATEGORY</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#1A56DB', background: '#EFF6FF', padding: '4px 10px', borderRadius: 20, border: '1px solid #BFDBFE' }}>
              {category}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CONFIDENCE</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: '#475569' }}>
              {Math.round((confidence ?? 0) * 100)}%
            </div>
          </div>
        </div>
        {riskIfDenied && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 10px' }}>
            <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risk if denied: </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#EA580C' }}>{riskIfDenied}</span>
          </div>
        )}
        {flags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {flags.map(flag => (
              <span key={flag} style={{
                fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
                color: FLAG_COLORS[flag] || '#475569',
                background: `${FLAG_COLORS[flag] || '#475569'}15`,
                border: `1px solid ${FLAG_COLORS[flag] || '#475569'}30`,
                borderRadius: 12, padding: '2px 8px',
              }}>{flag}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
