import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { BUILDINGS } from '../config/buildings.js'
import { TOTAL_SUPPLY_DEFAULT, GRID_SHOCK_SUPPLY, CONFLICT_LEVELS } from '../config/constants.js'
import {
  initSession,
  listenSession,
  listenBuildings,
  listenSubmissions,
  listenStructured,
  listenHistory,
  writeAllocations,
  writeMetrics,
  updateHistory,
  setSession,
  nextRound,
  getSession,
} from '../lib/db.js'
import { runAlgorithmPipeline } from '../lib/tier2.js'
import SessionHeader from '../components/host/SessionHeader.jsx'
import GridCanvas from '../components/host/GridCanvas.jsx'
import ConflictMeter from '../components/host/ConflictMeter.jsx'
import FairnessMetrics from '../components/host/FairnessMetrics.jsx'
import ResolutionLog from '../components/host/ResolutionLog.jsx'

const ENV_OK = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_DATABASE_URL
)

export default function HostPage() {
  const [session, setSessionState] = useState(null)
  const [dbBuildings, setDbBuildings] = useState({})
  const [submissions, setSubmissions] = useState({})
  const [structured, setStructured] = useState({})
  const [history, setHistory] = useState({})
  const [allocations, setAllocations] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [resolutionLog, setResolutionLog] = useState([])
  const [resolving, setResolving] = useState(false)
  const [autoResolved, setAutoResolved] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState(null)

  const round = session?.round ?? 1
  const totalSupply = session?.totalSupply ?? TOTAL_SUPPLY_DEFAULT

  const unsubRefs = useRef([])

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ENV_OK) return

    initSession()
      .then(() => setInitialized(true))
      .catch((e) => setError(e.message))
  }, [])

  // ── Firebase listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return

    const unsubs = [
      listenSession((s) => {
        setSessionState(s)
      }),
      listenBuildings((b) => setDbBuildings(b || {})),
      listenHistory((h) => setHistory(h || {})),
    ]
    unsubRefs.current = unsubs
    return () => unsubs.forEach((u) => u && u())
  }, [initialized])

  useEffect(() => {
    if (!initialized) return
    const unsub = listenSubmissions(round, (s) => setSubmissions(s || {}))
    const unsub2 = listenStructured(round, (s) => setStructured(s || {}))
    return () => {
      unsub && unsub()
      unsub2 && unsub2()
    }
  }, [round, initialized])

  // ── Auto-resolve when all connected buildings submitted ────────────────────
  useEffect(() => {
    if (!initialized || resolving || autoResolved) return

    const connected = Object.values(dbBuildings).filter((b) => b.participantId)
    if (connected.length < 2) return // need at least 2

    const allSubmitted = connected.every((b) => submissions[b.id])
    if (allSubmitted) {
      setAutoResolved(true)
      triggerResolution()
    }
  }, [submissions, dbBuildings, initialized, resolving, autoResolved])

  // ── Resolution ────────────────────────────────────────────────────────────────
  const triggerResolution = useCallback(async () => {
    if (resolving) return
    setResolving(true)

    try {
      const sess = await getSession()
      const supply = sess?.totalSupply ?? TOTAL_SUPPLY_DEFAULT

      // Build history map for algorithm
      const historyMap = {}
      for (const [id, h] of Object.entries(history)) {
        historyMap[id] = {
          averageSatisfaction: h.averageSatisfaction ?? 0,
          rounds: h.rounds ?? 0,
        }
      }

      const { allocations: allocs, metrics: m } = runAlgorithmPipeline(
        BUILDINGS,
        submissions,
        structured,
        historyMap,
        supply
      )

      // Write to Firebase
      await writeAllocations(round, allocs)
      await writeMetrics(round, m)

      // Update history for each building
      for (const [id, alloc] of Object.entries(allocs)) {
        await updateHistory(id, alloc.satisfactionScore)
      }

      setAllocations(allocs)
      setMetrics(m)
      setResolutionLog((prev) => [
        ...prev,
        { round, allocations: allocs, metrics: m },
      ])

      // Advance round after 30 seconds
      setTimeout(async () => {
        await nextRound(round)
        setAutoResolved(false)
        setSubmissions({})
        setStructured({})
        setAllocations(null)
        setMetrics(null)
      }, 30000)
    } catch (e) {
      console.error('Resolution error:', e)
      setError(`Resolution failed: ${e.message}`)
    } finally {
      setResolving(false)
    }
  }, [resolving, round, submissions, structured, history])

  // ── Grid Shock ────────────────────────────────────────────────────────────────
  const handleGridShock = async () => {
    await setSession({
      ...session,
      totalSupply: GRID_SHOCK_SUPPLY,
      gridShockActive: true,
    })
    // Auto-trigger resolution
    setTimeout(() => triggerResolution(), 500)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const connectedCount = Object.values(dbBuildings).filter((b) => b.participantId).length
  const conflictLevel = metrics?.conflictLevel ?? 'STABLE'
  const conflictColor = CONFLICT_LEVELS[conflictLevel]?.color ?? '#22c55e'

  // ── Setup screen ──────────────────────────────────────────────────────────────
  if (!ENV_OK) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h1 className="text-2xl font-bold text-cyan-400 font-mono mb-4">EQUIGRID Setup Required</h1>
          <p className="text-slate-400 mb-6 font-mono text-sm">
            Firebase environment variables are not configured. Copy <code className="text-cyan-300">.env.example</code> to <code className="text-cyan-300">.env</code> and fill in your Firebase credentials.
          </p>
          <div className="bg-slate-900 rounded-lg p-4 text-left font-mono text-xs text-slate-400 border border-slate-700">
            <div className="text-green-400 mb-2">Required variables:</div>
            {[
              'VITE_FIREBASE_API_KEY',
              'VITE_FIREBASE_AUTH_DOMAIN',
              'VITE_FIREBASE_DATABASE_URL',
              'VITE_FIREBASE_PROJECT_ID',
              'VITE_FIREBASE_STORAGE_BUCKET',
              'VITE_FIREBASE_MESSAGING_SENDER_ID',
              'VITE_FIREBASE_APP_ID',
              'VITE_GROQ_API_KEY',
            ].map((v) => (
              <div key={v} className="text-slate-500">{v}=<span className="text-yellow-600">your_value_here</span></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 font-mono text-lg animate-pulse">⚡ Initializing EquiGrid...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 font-mono text-sm bg-red-950 p-4 rounded border border-red-800">
          Error: {error}
        </div>
      </div>
    )
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join` : '/join'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col scanline" style={{ fontFamily: 'monospace' }}>
      {/* Header */}
      <SessionHeader
        session={session}
        metrics={metrics}
        connectedCount={connectedCount}
      />

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Grid Canvas — 65% */}
        <div className="flex-[0.65] min-h-0 p-2">
          <GridCanvas
            allocations={allocations}
            submissions={submissions}
            dbBuildings={dbBuildings}
            totalSupply={totalSupply}
            conflictLevel={conflictLevel}
          />
        </div>

        {/* Right panel — 35% */}
        <div
          className="flex-[0.35] flex flex-col gap-3 p-3 border-l border-slate-800 overflow-y-auto"
          style={{ minWidth: 0 }}
        >
          {/* Conflict Meter + Fairness */}
          <div className="flex gap-4 items-start">
            <ConflictMeter
              conflictScore={metrics?.conflictIntensityScore ?? 0}
              conflictLevel={conflictLevel}
            />
            <div className="flex-1 min-w-0">
              <FairnessMetrics metrics={metrics} />
            </div>
          </div>

          {/* Resolution Log */}
          <ResolutionLog history={resolutionLog} />
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t border-slate-800 px-4 py-2 flex items-center gap-4"
        style={{ backgroundColor: '#0a0f1a' }}
      >
        {/* QR Code */}
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded">
            <QRCodeSVG value={joinUrl} size={56} level="M" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">Participants scan to join</span>
            <span className="text-xs text-cyan-400 font-mono">/join</span>
          </div>
        </div>

        {/* Building connection dots */}
        <div className="flex gap-1 flex-wrap max-w-xs">
          {Object.entries(BUILDINGS).map(([id, b]) => {
            const connected = !!dbBuildings[id]?.participantId
            const submitted = !!submissions[id]
            return (
              <div
                key={id}
                title={`${b.emoji} ${b.name}`}
                className="relative flex flex-col items-center"
              >
                <div
                  className="w-3 h-3 rounded-full border"
                  style={{
                    backgroundColor: submitted ? '#22c55e' : connected ? '#3b82f6' : '#1e293b',
                    borderColor: connected ? (submitted ? '#22c55e' : '#3b82f6') : '#334155',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Status text */}
        <div className="flex-1 text-xs font-mono text-slate-500">
          {connectedCount === 0
            ? 'Waiting for participants to join...'
            : `${connectedCount} node${connectedCount !== 1 ? 's' : ''} connected • ${Object.keys(submissions).length} submitted`}
        </div>

        {/* Grid Shock button */}
        <motion.button
          onClick={handleGridShock}
          disabled={session?.gridShockActive || resolving}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-1.5 rounded font-mono font-bold text-sm bg-red-900 hover:bg-red-800 text-red-300 border border-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ⚡ GRID SHOCK
        </motion.button>

        {/* Resolve Now button */}
        <motion.button
          onClick={triggerResolution}
          disabled={resolving}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-1.5 rounded font-mono font-bold text-sm border transition-all ${
            resolving
              ? 'bg-slate-800 text-slate-500 border-slate-700'
              : 'bg-cyan-800 hover:bg-cyan-700 text-cyan-300 border-cyan-600'
          }`}
          style={!resolving ? { boxShadow: '0 0 10px #22d3ee44' } : {}}
        >
          {resolving ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">⟳</span> Resolving...
            </span>
          ) : (
            'RESOLVE NOW →'
          )}
        </motion.button>
      </div>

      {/* Resolution flash overlay */}
      <AnimatePresence>
        {resolving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none flex items-center justify-center"
            style={{ backgroundColor: `${conflictColor}08` }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-2xl font-bold font-mono"
              style={{ color: conflictColor, textShadow: `0 0 30px ${conflictColor}` }}
            >
              RUNNING ALGORITHM...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
