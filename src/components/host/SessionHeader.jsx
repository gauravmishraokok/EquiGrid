import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CONFLICT_LEVELS } from '../../config/constants.js'

export default function SessionHeader({ session, metrics, connectedCount }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!session?.startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [session?.startedAt])

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  const conflictLevel = metrics?.conflictLevel || 'STABLE'
  const conflictColor = CONFLICT_LEVELS[conflictLevel]?.color || '#22c55e'
  const totalSupply = session?.totalSupply ?? 1000
  const totalDemand = metrics?.totalDemand ?? 0
  const deficitKw = metrics?.deficitKw ?? 0

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold tracking-widest" style={{ color: '#22d3ee', textShadow: '0 0 20px #22d3ee88' }}>
          EQUIGRID
        </div>
        <div className="text-xs text-slate-500 font-mono">POWER GRID CONTROL v1.0</div>
      </div>

      {/* Center stats */}
      <div className="flex items-center gap-8">
        <Stat label="ROUND" value={session?.round ?? 1} color="#22d3ee" />
        <Stat label="SUPPLY" value={`${totalSupply} kW`} color="#22c55e" />
        <Stat label="DEMAND" value={`${Math.round(totalDemand)} kW`} color="#eab308" />
        <Stat
          label="DEFICIT"
          value={deficitKw > 0 ? `-${Math.round(deficitKw)} kW` : '0 kW'}
          color={deficitKw > 0 ? '#ef4444' : '#22c55e'}
        />
        <div className="flex flex-col items-center">
          <div className="text-xs text-slate-500 tracking-widest mb-1">STATUS</div>
          <motion.div
            className="text-sm font-bold tracking-wider px-2 py-0.5 rounded"
            style={{ color: conflictColor, border: `1px solid ${conflictColor}44`, backgroundColor: `${conflictColor}11` }}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {conflictLevel}
          </motion.div>
        </div>
        <Stat label="NODES" value={`${connectedCount}/10`} color="#a78bfa" />
      </div>

      {/* Timer */}
      <div className="flex flex-col items-end">
        <div className="text-xs text-slate-500 tracking-widest mb-1">SESSION TIME</div>
        <div className="font-mono text-xl text-slate-300">{minutes}:{seconds}</div>
        {session?.gridShockActive && (
          <motion.div
            className="text-xs text-red-400 font-bold tracking-widest mt-1"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            ⚡ GRID SHOCK ACTIVE
          </motion.div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-slate-500 tracking-widest mb-1">{label}</div>
      <div className="font-mono text-lg font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
