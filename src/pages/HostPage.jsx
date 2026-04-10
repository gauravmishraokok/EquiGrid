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

// ── Sub-components ────────────────────────────────────────────────────────────

function GridStatusCard({ session, metrics, connectedCount, submittedCount }) {
  const totalSupply = session?.totalSupply ?? TOTAL_SUPPLY_DEFAULT
  const totalDemand = metrics?.totalDemand ?? 0
  const deficitKw = metrics?.deficitKw ?? 0
  const supplyPct = totalDemand > 0 ? Math.min(100, (totalSupply / totalDemand) * 100) : 100
  const barColor = supplyPct >= 90 ? '#16A34A' : supplyPct >= 70 ? '#CA8A04' : '#DC2626'

  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 12, padding: 14 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        Grid Status
      </div>
      {/* Supply vs Demand bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#475569' }}>Supply Coverage</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: barColor }}>{Math.round(supplyPct)}%</span>
        </div>
        <div style={{ height: 10, background: '#E2E8F7', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${supplyPct}%`, height: '100%', background: `linear-gradient(to right, #1A56DB, ${barColor})`, borderRadius: 5, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Supply: {totalSupply} kW</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Demand: {Math.round(totalDemand)} kW</span>
        </div>
        {deficitKw > 0 && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#DC2626', marginTop: 4 }}>
            Deficit: −{Math.round(deficitKw)} kW
          </div>
        )}
      </div>
      {/* Connection stats */}
      <div style={{ display: 'flex', gap: 12, paddingTop: 8, borderTop: '1px solid #F0F4FF' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: '#1A56DB' }}>{connectedCount}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Connected</div>
        </div>
        <div style={{ width: 1, background: '#E2E8F7' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: '#16A34A' }}>{submittedCount}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Submitted</div>
        </div>
        <div style={{ width: 1, background: '#E2E8F7' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: '#475569' }}>{Object.keys(BUILDINGS).length}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
        </div>
      </div>
    </div>
  )
}

function QRSection({ joinUrl }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 12, padding: 14 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        Join Session
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: 'white', padding: 8, borderRadius: 8, border: '1px solid #E2E8F7', flexShrink: 0 }}>
          <QRCodeSVG value={joinUrl} size={72} level="M" />
        </div>
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 4 }}>Scan to Join</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#475569', marginBottom: 6 }}>Participants scan this QR code to select a building</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#1A56DB', background: '#EFF6FF', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
            /join
          </div>
        </div>
      </div>
    </div>
  )
}

function BuildingDots({ dbBuildings, submissions }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F7', borderRadius: 12, padding: 14 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        Building Nodes
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(BUILDINGS).map(([id, b]) => {
          const connected = !!dbBuildings[id]?.participantId
          const submitted = !!submissions[id]
          return (
            <div
              key={id}
              title={`${b.emoji} ${b.name}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20,
                background: submitted ? '#F0FDF4' : connected ? '#EFF6FF' : '#F7F9FF',
                border: `1px solid ${submitted ? '#86EFAC' : connected ? '#BFDBFE' : '#E2E8F7'}`,
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: submitted ? '#16A34A' : connected ? '#1A56DB' : '#CBD5E1',
              }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: submitted ? '#16A34A' : connected ? '#1A56DB' : '#94A3B8' }}>
                {id}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 8, borderTop: '1px solid #F0F4FF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} /> Submitted
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A56DB' }} /> Connected
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif", fontSize: 9, color: '#94A3B8' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} /> Waiting
        </div>
      </div>
    </div>
  )
}

function BuildingActionCard({ buildingId, building, allocation, onClose, onViewExplanation }) {
  const pct = allocation ? allocation.allocatedKw / Math.max(allocation.requestedKw, 1) : 0
  const barColor = pct >= 0.9 ? '#16A34A' : pct >= 0.6 ? '#CA8A04' : '#DC2626'

  return (
    <div style={{
      position: 'absolute', top: 20, left: 20,
      background: 'white', borderRadius: 16, padding: 16,
      boxShadow: '0 8px 32px rgba(30,64,175,0.12)', border: '1px solid #E2E8F7',
      minWidth: 220, zIndex: 10,
      animation: 'building-pop 0.25s var(--ease-spring)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{building.emoji}</div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{building.name}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#475569' }}>Tier {building.tier} — {building.type}</div>
          {allocation && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: barColor, marginTop: 4 }}>
              {allocation.allocatedKw} / {allocation.requestedKw} kW
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, padding: 4, lineHeight: 1 }}>×</button>
      </div>
      {allocation && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 6, background: '#E2E8F7', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: barColor, marginTop: 3 }}>
            {allocation.satisfactionScore}% satisfaction
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allocation && (
          <button onClick={onViewExplanation} style={{ background: '#F7F9FF', border: '1px solid #E2E8F7', borderRadius: 8, padding: '8px 12px', fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#475569', cursor: 'pointer', textAlign: 'left' }}>
            📋 View Explanation
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

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
  const [selectedBuilding, setSelectedBuilding] = useState(null)

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
      listenSession((s) => setSessionState(s)),
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
    if (connected.length < 2) return
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
      const historyMap = {}
      for (const [id, h] of Object.entries(history)) {
        historyMap[id] = {
          averageSatisfaction: h.averageSatisfaction ?? 0,
          rounds: h.rounds ?? 0,
        }
      }
      const { allocations: allocs, metrics: m } = runAlgorithmPipeline(
        BUILDINGS, submissions, structured, historyMap, supply
      )
      await writeAllocations(round, allocs)
      await writeMetrics(round, m)
      for (const [id, alloc] of Object.entries(allocs)) {
        await updateHistory(id, alloc.satisfactionScore)
      }
      setAllocations(allocs)
      setMetrics(m)
      setResolutionLog((prev) => [...prev, { round, allocations: allocs, metrics: m }])
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
    await setSession({ ...session, totalSupply: GRID_SHOCK_SUPPLY, gridShockActive: true })
    setTimeout(() => triggerResolution(), 500)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const connectedCount = Object.values(dbBuildings).filter((b) => b.participantId).length
  const submittedCount = Object.keys(submissions).length
  const conflictLevel = metrics?.conflictLevel ?? 'STABLE'
  const conflictColor = CONFLICT_LEVELS[conflictLevel]?.color ?? '#22c55e'

  // ── Setup screen ──────────────────────────────────────────────────────────────
  if (!ENV_OK) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 22, color: '#1A56DB', marginBottom: 12 }}>EQUIGRID Setup Required</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: '#475569', marginBottom: 20, fontSize: 14 }}>
            Firebase environment variables are not configured. Copy <code style={{ color: '#1A56DB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4 }}>.env.example</code> to <code style={{ color: '#1A56DB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4 }}>.env</code> and fill in your Firebase credentials.
          </p>
          <div style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'left', border: '1px solid #E2E8F7' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#16A34A', marginBottom: 8 }}>Required variables:</div>
            {['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_DATABASE_URL','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_STORAGE_BUCKET','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID','VITE_GROQ_API_KEY'].map((v) => (
              <div key={v} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8', marginBottom: 2 }}>{v}=<span style={{ color: '#CA8A04' }}>your_value_here</span></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: '#1A56DB' }}>⚡ Initializing EquiGrid...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: 16, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#DC2626' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join` : '/join'
  const selectedBuildingData = selectedBuilding ? BUILDINGS[selectedBuilding] : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4FF' }}>
      <SessionHeader
        session={session}
        metrics={metrics}
        connectedCount={connectedCount}
        onGridShock={handleGridShock}
        resolving={resolving}
        onResolve={triggerResolution}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Grid Canvas — 68% */}
        <div style={{ flex: '0 0 68%', position: 'relative', overflow: 'hidden' }}>
          <GridCanvas
            allocations={allocations}
            submissions={submissions}
            dbBuildings={dbBuildings}
            totalSupply={totalSupply}
            conflictLevel={conflictLevel}
            onBuildingClick={(id) => setSelectedBuilding(prev => prev === id ? null : id)}
            selectedBuilding={selectedBuilding}
          />
          {/* Floating building card */}
          {selectedBuilding && selectedBuildingData && (
            <BuildingActionCard
              buildingId={selectedBuilding}
              building={selectedBuildingData}
              allocation={allocations?.[selectedBuilding] ?? null}
              onClose={() => setSelectedBuilding(null)}
              onViewExplanation={() => {}}
            />
          )}
        </div>

        {/* Right panel — 32% */}
        <div style={{ flex: '0 0 32%', borderLeft: '1px solid #E2E8F7', display: 'flex', flexDirection: 'column', background: '#F7F9FF', overflowY: 'auto', padding: 16, gap: 16 }}>
          <GridStatusCard
            session={session}
            metrics={metrics}
            connectedCount={connectedCount}
            submittedCount={submittedCount}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <ConflictMeter
              conflictScore={metrics?.conflictIntensityScore ?? 0}
              conflictLevel={conflictLevel}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <FairnessMetrics metrics={metrics} allocations={allocations} />
            </div>
          </div>
          <ResolutionLog history={resolutionLog} />
          <QRSection joinUrl={joinUrl} />
          <BuildingDots dbBuildings={dbBuildings} submissions={submissions} />
        </div>
      </div>

      {/* Resolution flash overlay */}
      <AnimatePresence>
        {resolving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(26,86,219,0.04)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20,
                color: '#1A56DB', letterSpacing: '0.15em',
                textShadow: '0 0 30px rgba(26,86,219,0.4)',
              }}
            >
              RUNNING ALGORITHM...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
