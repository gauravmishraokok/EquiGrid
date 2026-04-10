import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BUILDINGS } from '../config/buildings.js'
import { listenBuildings, assignParticipant } from '../lib/db.js'

const TIER_ACCENT = ['', '#DC2626', '#EA580C', '#1A56DB', '#7C3AED']
const TIER_LABELS  = ['', 'CRITICAL', 'ESSENTIAL', 'STANDARD', 'LOW']
const TIER_BG      = ['', '#FEF2F2', '#FFF7ED', '#EFF6FF', '#F5F3FF']
const TIER_BORDER  = ['', '#FCA5A5', '#FDBA74', '#BFDBFE', '#DDD6FE']

const ENV_OK = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL
)

export default function JoinPage() {
  const navigate = useNavigate()
  const [dbBuildings, setDbBuildings] = useState({})
  const [joining, setJoining]         = useState(null)
  const [error, setError]             = useState(null)

  useEffect(() => {
    if (!ENV_OK) return
    const unsub = listenBuildings((b) => setDbBuildings(b || {}))
    return () => unsub && unsub()
  }, [])

  const handleJoin = async (buildingId) => {
    const b = dbBuildings[buildingId]
    if (b?.participantId) return

    setJoining(buildingId)
    setError(null)

    try {
      const participantId = crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await assignParticipant(buildingId, participantId)
      navigate(`/participate/${buildingId}`)
    } catch (e) {
      setError(`Failed to join: ${e.message}`)
      setJoining(null)
    }
  }

  if (!ENV_OK) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 22, color: '#1A56DB', marginBottom: 8 }}>EquiGrid</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: '#475569', fontSize: 14 }}>Firebase not configured. Contact the host.</p>
        </div>
      </div>
    )
  }

  const connectedCount = Object.values(dbBuildings).filter(b => b.participantId).length
  const tierGroups = [1, 2, 3, 4].map((tier) => ({
    tier,
    buildings: Object.values(BUILDINGS).filter((b) => b.tier === tier),
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E2E8F7',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: '#1A56DB', letterSpacing: '0.15em' }}>
            ⚡ EQUIGRID
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
            Select your building to join the grid
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569', background: '#F7F9FF', border: '1px solid #E2E8F7', borderRadius: 20, padding: '4px 12px' }}>
          {connectedCount} / {Object.keys(BUILDINGS).length} connected
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#DC2626' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {tierGroups.map(({ tier, buildings }) => (
          <div key={tier} style={{ marginBottom: 28 }}>
            {/* Tier header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: TIER_ACCENT[tier], background: TIER_BG[tier], border: `1px solid ${TIER_BORDER[tier]}`,
                borderRadius: 20, padding: '3px 12px',
              }}>
                TIER {tier} — {TIER_LABELS[tier]}
              </div>
              <div style={{ flex: 1, height: 1, background: '#E2E8F7' }} />
            </div>

            {/* Building cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {buildings.map((building) => {
                const db       = dbBuildings[building.id] || {}
                const occupied = !!db.participantId
                const isJoining = joining === building.id

                return (
                  <motion.button
                    key={building.id}
                    onClick={() => !occupied && !joining && handleJoin(building.id)}
                    disabled={occupied || !!joining}
                    whileTap={!occupied && !joining ? { scale: 0.98 } : {}}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12, border: 'none',
                      textAlign: 'left', cursor: occupied ? 'not-allowed' : joining ? 'wait' : 'pointer',
                      background: occupied ? '#F8FAFF' : isJoining ? '#EFF6FF' : 'white',
                      boxShadow: occupied ? 'none' : '0 1px 4px rgba(26,86,219,0.06)',
                      outline: isJoining ? `2px solid ${TIER_ACCENT[building.tier]}` : occupied ? '1px solid #E2E8F7' : '1px solid #E2E8F7',
                      opacity: occupied ? 0.55 : 1,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!occupied && !joining) {
                        e.currentTarget.style.boxShadow = `0 4px 16px rgba(26,86,219,0.12)`
                        e.currentTarget.style.outline = `1.5px solid ${TIER_ACCENT[building.tier]}`
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = occupied ? 'none' : '0 1px 4px rgba(26,86,219,0.06)'
                      e.currentTarget.style.outline = '1px solid #E2E8F7'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Emoji */}
                    <span style={{ fontSize: 28, flexShrink: 0, width: 36, textAlign: 'center' }}>{building.emoji}</span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{building.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8' }}>{building.id}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#475569' }}>{building.type}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8' }}>
                          Base: {building.base} kW • Max: {building.max} kW
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div style={{ flexShrink: 0 }}>
                      {occupied ? (
                        <span style={{
                          fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
                          color: '#94A3B8', background: '#F1F5F9', border: '1px solid #E2E8F7',
                          borderRadius: 20, padding: '4px 12px',
                        }}>
                          Occupied
                        </span>
                      ) : isJoining ? (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          style={{
                            fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600,
                            color: TIER_ACCENT[building.tier], background: TIER_BG[building.tier],
                            border: `1px solid ${TIER_BORDER[building.tier]}`,
                            borderRadius: 20, padding: '4px 12px',
                          }}
                        >
                          Joining...
                        </motion.span>
                      ) : (
                        <span style={{
                          fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700,
                          color: TIER_ACCENT[building.tier], background: TIER_BG[building.tier],
                          border: `1.5px solid ${TIER_BORDER[building.tier]}`,
                          borderRadius: 20, padding: '4px 14px', letterSpacing: '0.04em',
                        }}>
                          JOIN →
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E2E8F7', padding: '12px 24px', textAlign: 'center', background: 'white' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#CBD5E1' }}>
          EquiGrid — Real-Time Power Grid Conflict Resolution
        </span>
      </div>
    </div>
  )
}
