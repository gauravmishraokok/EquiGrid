import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BUILDINGS } from '../config/buildings.js'
import { listenBuildings, assignParticipant } from '../lib/db.js'

const TIER_COLORS = ['', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6']
const TIER_LABELS = ['', 'CRITICAL', 'ESSENTIAL', 'STANDARD', 'LOW']

const ENV_OK = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL
)

export default function JoinPage() {
  const navigate = useNavigate()
  const [dbBuildings, setDbBuildings] = useState({})
  const [joining, setJoining] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!ENV_OK) return
    const unsub = listenBuildings((b) => setDbBuildings(b || {}))
    return () => unsub && unsub()
  }, [])

  const handleJoin = async (buildingId) => {
    const b = dbBuildings[buildingId]
    if (b?.participantId) return // occupied

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h1 className="text-xl font-bold text-cyan-400 font-mono mb-2">EquiGrid</h1>
          <p className="text-slate-400 font-mono text-sm">Firebase not configured. Contact the host.</p>
        </div>
      </div>
    )
  }

  const tierGroups = [1, 2, 3, 4].map((tier) => ({
    tier,
    buildings: Object.values(BUILDINGS).filter((b) => b.tier === tier),
  }))

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-cyan-400 font-mono tracking-widest">⚡ EQUIGRID</div>
          <div className="text-xs text-slate-500 font-mono">Select your building to join the grid</div>
        </div>
        <div className="text-xs text-slate-600 font-mono">
          {Object.values(dbBuildings).filter(b => b.participantId).length} / {Object.keys(BUILDINGS).length} nodes connected
        </div>
      </div>

      {/* Building grid */}
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-red-950 border border-red-800 rounded text-red-300 text-sm font-mono"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {tierGroups.map(({ tier, buildings }) => (
          <div key={tier} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                style={{
                  color: TIER_COLORS[tier],
                  backgroundColor: `${TIER_COLORS[tier]}22`,
                  border: `1px solid ${TIER_COLORS[tier]}44`,
                }}
              >
                TIER {tier} — {TIER_LABELS[tier]}
              </div>
              <div className="flex-1 border-t border-slate-800" />
            </div>

            <div className="flex flex-col gap-2">
              {buildings.map((building) => {
                const db = dbBuildings[building.id] || {}
                const occupied = !!db.participantId
                const isJoining = joining === building.id

                return (
                  <motion.button
                    key={building.id}
                    onClick={() => !occupied && !joining && handleJoin(building.id)}
                    disabled={occupied || !!joining}
                    whileTap={!occupied ? { scale: 0.98 } : {}}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-all ${
                      occupied
                        ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                        : isJoining
                        ? 'bg-slate-800 border-cyan-800 cursor-wait'
                        : 'bg-slate-900 border-slate-700 hover:border-cyan-700 hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {/* Emoji */}
                    <span className="text-2xl w-8 text-center flex-shrink-0">{building.emoji}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 font-mono text-sm">{building.name}</span>
                        <span className="text-xs text-slate-500 font-mono">{building.id}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500 font-mono">{building.type}</span>
                        <span className="text-xs text-slate-600 font-mono">Base: {building.base} kW • Max: {building.max} kW</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {occupied ? (
                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-500 border border-slate-700 font-mono">
                          OCCUPIED
                        </span>
                      ) : isJoining ? (
                        <span className="text-xs px-2 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono animate-pulse">
                          JOINING...
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2 py-1 rounded font-mono font-bold"
                          style={{
                            color: TIER_COLORS[building.tier],
                            backgroundColor: `${TIER_COLORS[building.tier]}22`,
                            border: `1px solid ${TIER_COLORS[building.tier]}44`,
                          }}
                        >
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
      <div className="border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-600 font-mono">
        EquiGrid — Real-Time Power Grid Conflict Resolution
      </div>
    </div>
  )
}
