import { motion } from 'framer-motion'
import { CONFLICT_LEVELS } from '../../config/constants.js'

const ZONES = [
  { key: 'STABLE',   label: 'STABLE',   color: '#22c55e', range: '0–25'   },
  { key: 'STRESSED', label: 'STRESSED', color: '#eab308', range: '26–50'  },
  { key: 'CRITICAL', label: 'CRITICAL', color: '#f97316', range: '51–75'  },
  { key: 'CASCADE',  label: 'CASCADE',  color: '#ef4444', range: '76–100' },
]

export default function ConflictMeter({ conflictScore = 0, conflictLevel = 'STABLE' }) {
  const pct = Math.min(100, Math.max(0, conflictScore)) / 100
  const color = CONFLICT_LEVELS[conflictLevel]?.color || '#22c55e'

  // Gauge height = 200px, 0 at bottom, 100 at top
  const GAUGE_H = 200
  const fillH = Math.round(pct * GAUGE_H)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-slate-500 tracking-widest">CONFLICT INTENSITY</div>

      <div className="flex gap-3 items-end">
        {/* Gauge bar */}
        <div className="relative" style={{ width: 32, height: GAUGE_H }}>
          {/* Background */}
          <div
            className="absolute inset-0 rounded"
            style={{
              background: 'linear-gradient(to top, #22c55e33, #eab30833, #f9731633, #ef444433)',
              border: '1px solid #1e293b',
            }}
          />
          {/* Fill */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded"
            style={{ backgroundColor: color, opacity: 0.85 }}
            animate={{ height: fillH }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Zone markers */}
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute w-full border-t border-slate-700"
              style={{ bottom: `${mark}%` }}
            />
          ))}
        </div>

        {/* Zone labels */}
        <div className="flex flex-col-reverse justify-between" style={{ height: GAUGE_H }}>
          {ZONES.map((zone) => (
            <div
              key={zone.key}
              className="flex items-center gap-1"
              style={{ opacity: conflictLevel === zone.key ? 1 : 0.4 }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: zone.color }}
              />
              <span className="text-xs font-mono" style={{ color: zone.color }}>
                {zone.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Score */}
      <motion.div
        className="text-3xl font-bold font-mono"
        style={{ color }}
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {conflictScore}
      </motion.div>
      <div className="text-xs text-slate-500">/ 100</div>
    </div>
  )
}
