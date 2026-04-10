import { motion } from 'framer-motion'

function satisfactionLabel(score) {
  if (score >= 90) return { text: 'Full satisfaction', color: '#16A34A' }
  if (score >= 70) return { text: 'High satisfaction', color: '#22C55E' }
  if (score >= 50) return { text: 'Moderate satisfaction', color: '#CA8A04' }
  if (score >= 30) return { text: 'Low satisfaction', color: '#EA580C' }
  return { text: 'Critical shortfall', color: '#DC2626' }
}

export default function ExplanationPanel({ allocation }) {
  if (!allocation) return null

  const { allocatedKw, requestedKw, satisfactionScore, explanationSteps = [], finalRank } = allocation
  const pct = requestedKw > 0 ? allocatedKw / requestedKw : 0
  const barColor = pct >= 0.9 ? '#16A34A' : pct >= 0.6 ? '#CA8A04' : '#DC2626'
  const sat = satisfactionLabel(satisfactionScore)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,86,219,0.08)' }}
    >
      {/* Header */}
      <div style={{ background: '#1A56DB', padding: '10px 16px' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12, color: 'white', letterSpacing: '0.06em' }}>EQUIGRID POWER AUTHORITY</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Allocation Explanation</div>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Summary */}
        <div style={{ background: '#F7F9FF', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8' }}>Requested</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: '#475569' }}>{requestedKw} <span style={{ fontSize: 11 }}>kW</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#E2E8F7' }}>→</span>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8' }}>Received</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: barColor }}>{allocatedKw} <span style={{ fontSize: 11 }}>kW</span></div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8' }}>Score</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: sat.color }}>{satisfactionScore}%</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: '#E2E8F7', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ height: '100%', background: `linear-gradient(to right, #1A56DB, ${barColor})`, borderRadius: 4 }}
            />
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: sat.color, marginTop: 4, fontWeight: 500 }}>
            {sat.text}
          </div>
          {finalRank && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              Priority Rank: #{finalRank}
            </div>
          )}
        </div>

        {/* Decision trail */}
        {explanationSteps.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Decision Trail
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {explanationSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  style={{ padding: '10px 0', borderBottom: i < explanationSteps.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', gap: 10 }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF',
                    border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 10, color: '#1A56DB',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                    {step}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
