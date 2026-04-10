import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

function HexMark({ size = 28 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.42
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={pts} fill="#DBEAFE" stroke="#1A56DB" strokeWidth="1.5" />
      <polygon
        points={`${cx-2.5},${cy-7} ${cx+1},${cy-7} ${cx-1},${cy} ${cx+3},${cy} ${cx-3},${cy+8} ${cx-0.5},${cy+8} ${cx-1.5},${cy+1} ${cx-5},${cy+1}`}
        fill="#1A56DB"
        transform={`translate(${cx},${cy}) scale(0.55) translate(-${cx},-${cy})`}
      />
    </svg>
  )
}

function ConflictBadge({ level }) {
  const colors = {
    STABLE:   { bg: '#F0FDF4', border: '#86EFAC', text: '#16A34A' },
    STRESSED: { bg: '#FEFCE8', border: '#FDE047', text: '#CA8A04' },
    CRITICAL: { bg: '#FFF7ED', border: '#FDBA74', text: '#EA580C' },
    CASCADE:  { bg: '#FEF2F2', border: '#FCA5A5', text: '#DC2626' },
  }
  const c = colors[level] || colors.STABLE
  return (
    <div style={{
      background: c.bg, border: `1.5px solid ${c.border}`, color: c.text,
      borderRadius: 20, padding: '3px 12px',
      fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 11,
      letterSpacing: '0.08em',
    }}>
      {level}
    </div>
  )
}

function TopStat({ label, value, color, mono = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

export default function SessionHeader({ session, metrics, connectedCount, onGridShock, resolving, onResolve }) {
  const [elapsed, setElapsed] = useState(0)
  const [shaking, setShaking] = useState(false)

  useEffect(() => {
    if (!session?.startedAt) return
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [session?.startedAt])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const conflictLevel = metrics?.conflictLevel || 'STABLE'
  const totalSupply = session?.totalSupply ?? 1000

  const handleGridShock = () => {
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
    onGridShock?.()
  }

  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F7',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50,
      flexShrink: 0,
    }}>
      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <HexMark size={32} />
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 17, color: '#1A56DB', letterSpacing: '0.15em' }}>
          EQUIGRID
        </div>
      </div>

      {/* Center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#0F172A' }}>
            Round {session?.round ?? 1}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 20, padding: '3px 10px' }}>
            <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11, color: '#16A34A', letterSpacing: '0.05em' }}>LIVE</span>
          </div>
        </div>
        <ConflictBadge level={conflictLevel} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 8 }}>
          <TopStat label="SUPPLY" value={`${totalSupply} kW`} color="#16A34A" />
          <TopStat label="DEMAND" value={metrics?.totalDemand ? `${Math.round(metrics.totalDemand)} kW` : '— kW'} color="#CA8A04" />
          <TopStat label="DEFICIT" value={metrics?.deficitKw > 0 ? `${Math.round(metrics.deficitKw)} kW` : '0 kW'} color={metrics?.deficitKw > 0 ? '#DC2626' : '#16A34A'} />
          <TopStat label="NODES" value={`${connectedCount}/10`} color="#1A56DB" />
          <TopStat label="TIME" value={`${mm}:${ss}`} color="#475569" />
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Resolve Now */}
        <motion.button
          onClick={onResolve}
          disabled={resolving}
          whileTap={{ scale: 0.97 }}
          style={{
            background: resolving ? '#E2E8F7' : 'linear-gradient(135deg, #1A56DB, #2563EB)',
            color: resolving ? '#94A3B8' : 'white',
            border: 'none', borderRadius: 8, padding: '7px 16px',
            fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12,
            cursor: resolving ? 'not-allowed' : 'pointer',
            boxShadow: resolving ? 'none' : '0 4px 12px rgba(26,86,219,0.3)',
            letterSpacing: '0.04em',
            transition: 'all 0.2s',
          }}
        >
          {resolving ? 'RESOLVING...' : 'RESOLVE NOW →'}
        </motion.button>

        {/* Grid Shock */}
        <button
          onClick={handleGridShock}
          disabled={session?.gridShockActive || resolving}
          className={shaking ? 'shake' : ''}
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5', color: '#DC2626',
            borderRadius: 8, padding: '6px 14px',
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12,
            cursor: session?.gridShockActive ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: session?.gridShockActive ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (!session?.gridShockActive && !resolving) {
              e.currentTarget.style.background = '#DC2626'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = '#DC2626'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#FEF2F2'
            e.currentTarget.style.color = '#DC2626'
            e.currentTarget.style.borderColor = '#FCA5A5'
          }}
        >
          ⚡ GRID SHOCK
        </button>
      </div>
    </div>
  )
}
