import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BUILDINGS } from '../config/buildings.js'
import { TIER_EXPECTATION } from '../config/constants.js'
import {
  listenSession,
  listenAllocations,
  getHistory,
  submitDemand,
  writeStructured,
  releaseBuilding,
} from '../lib/db.js'
import { structureReason } from '../lib/tier1.js'
import SubmissionForm from '../components/participant/SubmissionForm.jsx'
import LLMReadback from '../components/participant/LLMReadback.jsx'
import ExplanationPanel from '../components/participant/ExplanationPanel.jsx'

const ENV_OK = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL
)

const TIER_ACCENT = ['', '#DC2626', '#EA580C', '#1A56DB', '#7C3AED']
const TIER_LABELS  = ['', 'CRITICAL PRIORITY', 'ESSENTIAL', 'STANDARD', 'LOW PRIORITY']

function AllocationGauge({ requested, allocated, max }) {
  const reqPct   = max > 0 ? (requested / max) * 100 : 0
  const allocPct = max > 0 ? Math.min(100, (allocated / max) * 100) : 0
  const pct      = requested > 0 ? allocated / requested : 0
  const color    = pct >= 0.9 ? '#16A34A' : pct >= 0.7 ? '#CA8A04' : pct >= 0.5 ? '#EA580C' : '#DC2626'

  const r             = 54
  const circumference = 2 * Math.PI * r
  const allocOffset   = circumference * (1 - allocPct / 100)
  const reqOffset     = circumference * (1 - reqPct / 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle cx={70} cy={70} r={r} fill="none" stroke="#E2E8F7" strokeWidth={12} />
          {/* Requested ring */}
          <circle cx={70} cy={70} r={r} fill="none" stroke="#DBEAFE" strokeWidth={12}
            strokeDasharray={circumference} strokeDashoffset={reqOffset} strokeLinecap="round" />
          {/* Allocated ring */}
          <motion.circle
            cx={70} cy={70} r={r}
            fill="none" stroke={color} strokeWidth={12}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: allocOffset }}
            transition={{ duration: 0.8 }}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600, color }}>{allocated ?? '—'}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8' }}>kW</div>
          {requested > 0 && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#CBD5E1' }}>of {requested}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function SatisfactionSparkline({ scores }) {
  if (!scores || scores.length < 2) return null
  const w = 200, h = 40, pad = 4
  const max = 100, min = 0
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - 2 * pad)
    const y = h - pad - ((s - min) / (max - min)) * (h - 2 * pad)
    return `${x},${y}`
  })
  const lastScore = scores[scores.length - 1]
  const color = lastScore >= 80 ? '#16A34A' : lastScore >= 60 ? '#CA8A04' : '#DC2626'

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Satisfaction History</div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((s, i) => {
          const x = pad + (i / (scores.length - 1)) * (w - 2 * pad)
          const y = h - pad - ((s - min) / (max - min)) * (h - 2 * pad)
          return <circle key={i} cx={x} cy={y} r={3} fill={color} />
        })}
      </svg>
    </div>
  )
}

export default function ParticipatePage() {
  const { buildingId } = useParams()
  const navigate = useNavigate()
  const building = BUILDINGS[buildingId]

  const [session, setSession]           = useState(null)
  const [allocation, setAllocation]     = useState(null)
  const [submitted, setSubmitted]       = useState(false)
  const [loading, setLoading]           = useState(false)
  const [structured, setStructured]     = useState(null)
  const [historyData, setHistoryData]   = useState(null)
  const [round, setRound]               = useState(1)

  const unsubRefs = useRef([])

  useEffect(() => {
    if (!building || !ENV_OK) return
    const unsubs = [
      listenSession((s) => {
        if (s?.round !== round) {
          setRound(s?.round ?? 1)
          setSubmitted(false)
          setStructured(null)
          setAllocation(null)
        }
        setSession(s)
      }),
    ]
    unsubRefs.current = unsubs
    getHistory(buildingId).then(setHistoryData).catch(() => {})
    return () => unsubs.forEach((u) => u && u())
  }, [buildingId])

  useEffect(() => {
    if (!building || !ENV_OK) return
    const unsub = listenAllocations(round, (allocs) => {
      if (allocs?.[buildingId]) setAllocation(allocs[buildingId])
    })
    return () => unsub && unsub()
  }, [round, buildingId])

  const handleSubmit = async ({ demandKw, weight, rawReason }) => {
    setLoading(true)
    try {
      const submission = { demandKw, weight, rawReason }
      await submitDemand(round, buildingId, submission)
      const str = await structureReason(building, submission)
      await writeStructured(round, buildingId, str)
      setStructured(str)
      setSubmitted(true)
    } catch (e) {
      console.error('Submit error:', e)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    try { await releaseBuilding(buildingId) } catch {}
    navigate('/join')
  }

  if (!ENV_OK) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#1A56DB', marginBottom: 8 }}>EquiGrid</div>
          <div style={{ fontFamily: "'Inter', sans-serif", color: '#475569', fontSize: 13 }}>Firebase not configured. Contact the host.</div>
        </div>
      </div>
    )
  }

  if (!building) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", color: '#DC2626', marginBottom: 16 }}>Building "{buildingId}" not found.</div>
          <button onClick={() => navigate('/join')} style={{ fontFamily: "'Inter', sans-serif", color: '#1A56DB', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            ← Back to Join
          </button>
        </div>
      </div>
    )
  }

  const tierAccent = TIER_ACCENT[building.tier]
  const tierLabel  = TIER_LABELS[building.tier]
  const expectation = TIER_EXPECTATION[building.tier]
  const allocatedKw = allocation?.allocatedKw ?? 0
  const requestedKw = allocation?.requestedKw ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>
      {/* Building Header */}
      <div style={{
        borderBottom: `3px solid ${tierAccent}`,
        background: 'white', padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{building.emoji}</span>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: '#0F172A' }}>{building.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                  color: tierAccent, background: `${tierAccent}15`, border: `1px solid ${tierAccent}40`,
                  borderRadius: 20, padding: '2px 8px',
                }}>
                  {tierLabel}
                </span>
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#94A3B8',
                  background: '#F7F9FF', border: '1px solid #E2E8F7', borderRadius: 20, padding: '2px 8px',
                }}>
                  {building.type}
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleLeave} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94A3B8', background: 'none', border: '1px solid #E2E8F7', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
            Leave
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94A3B8' }}>
          <span>Round {session?.round ?? 1}</span>
          <span>•</span>
          <span>Supply: {session?.totalSupply ?? 1000} kW</span>
          {session?.gridShockActive && (
            <>
              <span>•</span>
              <motion.span
                style={{ color: '#DC2626', fontWeight: 600 }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                ⚡ GRID SHOCK
              </motion.span>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Allocation gauge card */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F7', padding: '16px 20px', boxShadow: '0 2px 8px rgba(26,86,219,0.04)' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Current Allocation
          </div>
          <AllocationGauge requested={requestedKw} allocated={allocatedKw} max={building.max} />
          {allocation && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94A3B8' }}>
                Tier expectation: {Math.round(expectation * 100)}% of demand
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tierAccent, marginTop: 2, fontWeight: 600 }}>
                Satisfaction: {allocation.satisfactionScore}/100
              </div>
            </div>
          )}
          {historyData?.scores?.length > 1 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F4FF' }}>
              <SatisfactionSparkline scores={historyData.scores} />
            </div>
          )}
        </div>

        {/* Submission form */}
        {!allocation && (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F7', padding: '16px 20px', boxShadow: '0 2px 8px rgba(26,86,219,0.04)' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Submit Demand
            </div>
            <SubmissionForm
              building={building}
              onSubmit={handleSubmit}
              submitted={submitted}
              loading={loading}
            />
          </div>
        )}

        {/* LLM Readback */}
        <AnimatePresence>
          {structured && <LLMReadback structured={structured} />}
        </AnimatePresence>

        {/* Explanation Panel after resolution */}
        <AnimatePresence>
          {allocation && <ExplanationPanel allocation={allocation} />}
        </AnimatePresence>

        {/* Waiting state */}
        {submitted && !allocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 14, padding: 20, textAlign: 'center', boxShadow: '0 2px 8px rgba(26,86,219,0.04)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: 28, marginBottom: 10 }}
            >
              ⚡
            </motion.div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: '#1A56DB', marginBottom: 6 }}>
              Awaiting Resolution
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#475569' }}>
              Demand submitted. Waiting for host to resolve...
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              Round {session?.round ?? 1} • All buildings must submit first
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E2E8F7', padding: '10px 20px', textAlign: 'center', background: 'white' }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#CBD5E1' }}>EquiGrid — {building.id}</span>
      </div>
    </div>
  )
}
