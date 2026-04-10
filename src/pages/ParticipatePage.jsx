import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BUILDINGS } from '../config/buildings.js'
import { TIER_EXPECTATION, CONFLICT_LEVELS } from '../config/constants.js'
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

const TIER_COLORS = ['', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6']
const TIER_LABELS = ['', 'CRITICAL PRIORITY', 'ESSENTIAL', 'STANDARD', 'LOW PRIORITY']

function AllocationGauge({ requested, allocated, max }) {
  const reqPct = max > 0 ? (requested / max) * 100 : 0
  const allocPct = max > 0 ? Math.min(100, (allocated / max) * 100) : 0
  const pct = requested > 0 ? (allocated / requested) : 0
  const color = pct >= 0.9 ? '#22c55e' : pct >= 0.7 ? '#eab308' : pct >= 0.5 ? '#f97316' : '#ef4444'

  const r = 54
  const circumference = 2 * Math.PI * r
  const allocOffset = circumference * (1 - allocPct / 100)
  const reqOffset = circumference * (1 - reqPct / 100)

  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background */}
          <circle cx={70} cy={70} r={r} fill="none" stroke="#1e293b" strokeWidth={12} />
          {/* Requested */}
          <circle
            cx={70} cy={70} r={r}
            fill="none" stroke="#334155" strokeWidth={12}
            strokeDasharray={circumference}
            strokeDashoffset={reqOffset}
            strokeLinecap="round"
          />
          {/* Allocated */}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold font-mono" style={{ color }}>
            {allocated ?? '—'}
          </div>
          <div className="text-xs text-slate-500 font-mono">kW</div>
          {requested > 0 && (
            <div className="text-xs text-slate-600 font-mono">of {requested}</div>
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
  const color = lastScore >= 80 ? '#22c55e' : lastScore >= 60 ? '#eab308' : '#ef4444'

  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500 mb-1 font-mono">Satisfaction History</div>
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

  const [session, setSession] = useState(null)
  const [allocation, setAllocation] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [structured, setStructured] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [round, setRound] = useState(1)

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

    // Load history
    getHistory(buildingId).then(setHistoryData).catch(() => {})

    return () => {
      unsubs.forEach((u) => u && u())
    }
  }, [buildingId])

  useEffect(() => {
    if (!building || !ENV_OK) return
    const unsub = listenAllocations(round, (allocs) => {
      if (allocs?.[buildingId]) {
        setAllocation(allocs[buildingId])
      }
    })
    return () => unsub && unsub()
  }, [round, buildingId])

  const handleSubmit = async ({ demandKw, weight, rawReason }) => {
    setLoading(true)
    try {
      const submission = { demandKw, weight, rawReason }
      await submitDemand(round, buildingId, submission)

      // Call Tier 1 LLM
      const str = await structureReason(building, submission)
      await writeStructured(round, buildingId, str)
      setStructured(str)
      setSubmitted(true)
    } catch (e) {
      console.error('Submit error:', e)
      // Still mark submitted even if LLM fails
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    try {
      await releaseBuilding(buildingId)
    } catch {}
    navigate('/join')
  }

  if (!ENV_OK) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-3xl mb-3">⚡</div>
          <div className="text-cyan-400 font-mono font-bold mb-2">EquiGrid</div>
          <div className="text-slate-400 font-mono text-sm">Firebase not configured. Contact the host.</div>
        </div>
      </div>
    )
  }

  if (!building) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-400 font-mono mb-4">Building "{buildingId}" not found.</div>
          <button
            onClick={() => navigate('/join')}
            className="text-cyan-400 font-mono text-sm underline"
          >
            ← Back to Join
          </button>
        </div>
      </div>
    )
  }

  const tierColor = TIER_COLORS[building.tier]
  const tierLabel = TIER_LABELS[building.tier]
  const expectation = TIER_EXPECTATION[building.tier]
  const allocatedKw = allocation?.allocatedKw ?? 0
  const requestedKw = allocation?.requestedKw ?? 0
  const conflictLevel = session?.conflictLevel ?? 'STABLE'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col max-w-lg mx-auto">
      {/* Building Header */}
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: `${tierColor}44`, backgroundColor: `${tierColor}11` }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{building.emoji}</span>
            <div>
              <div className="font-bold text-slate-100 font-mono text-sm">{building.name}</div>
              <div className="flex gap-2 mt-0.5">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
                  style={{ color: tierColor, backgroundColor: `${tierColor}22`, border: `1px solid ${tierColor}44` }}
                >
                  {tierLabel}
                </span>
                <span className="text-xs text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                  {building.type}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLeave}
            className="text-xs text-slate-600 hover:text-slate-400 font-mono"
          >
            leave
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 mt-1">
          <span>Round {session?.round ?? 1}</span>
          <span>•</span>
          <span>Supply: {session?.totalSupply ?? 1000} kW</span>
          {session?.gridShockActive && (
            <>
              <span>•</span>
              <motion.span
                className="text-red-400 font-bold"
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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Allocation visual */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 px-4 pt-2 pb-4">
          <div className="text-xs text-slate-500 font-mono tracking-widest mb-1">CURRENT ALLOCATION</div>
          <AllocationGauge
            requested={requestedKw}
            allocated={allocatedKw}
            max={building.max}
          />
          {allocation && (
            <div className="text-center">
              <div className="text-xs text-slate-500 font-mono">
                Tier expectation: {Math.round(expectation * 100)}% of demand
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: tierColor }}>
                Satisfaction: {allocation.satisfactionScore}/100
              </div>
            </div>
          )}
          {/* History sparkline */}
          {historyData?.scores?.length > 1 && (
            <div className="mt-3 border-t border-slate-800 pt-3">
              <SatisfactionSparkline scores={historyData.scores} />
            </div>
          )}
        </div>

        {/* Submission form */}
        {!allocation && (
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="text-xs text-slate-500 font-mono tracking-widest mb-3">SUBMIT DEMAND</div>
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
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl mb-2"
            >
              ⚡
            </motion.div>
            <div className="text-sm text-slate-400 font-mono">
              Demand submitted. Waiting for host to resolve...
            </div>
            <div className="text-xs text-slate-600 font-mono mt-1">
              Round {session?.round ?? 1} • All buildings must submit first
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 px-4 py-2 text-center text-xs text-slate-700 font-mono">
        EquiGrid — {building.id}
      </div>
    </div>
  )
}
