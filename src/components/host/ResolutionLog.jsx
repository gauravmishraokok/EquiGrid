import { motion, AnimatePresence } from 'framer-motion'
import { BUILDINGS } from '../../config/buildings.js'

function allocationColor(pct) {
  if (pct >= 0.9) return '#22c55e'
  if (pct >= 0.7) return '#eab308'
  if (pct >= 0.5) return '#f97316'
  return '#ef4444'
}

export default function ResolutionLog({ history }) {
  // history is array of { round, allocations, metrics }
  if (!history || !history.length) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-slate-500 tracking-widest">RESOLUTION LOG</div>
        <div className="text-slate-600 text-xs text-center py-6 bg-slate-900 rounded border border-slate-800">
          Waiting for first resolution...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-slate-500 tracking-widest">RESOLUTION LOG</div>
      <div className="overflow-y-auto max-h-64 flex flex-col gap-2 pr-1">
        <AnimatePresence initial={false}>
          {[...history].reverse().map((entry) => (
            <motion.div
              key={entry.round}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded border border-slate-800 p-2"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-cyan-400 font-mono">
                  Round {entry.round}
                </span>
                <span className="text-xs text-slate-500">
                  {entry.metrics?.resolutionStrategy || 'Unknown'}
                </span>
              </div>

              {/* Building allocations */}
              <div className="flex flex-col gap-0.5">
                {Object.entries(entry.allocations || {})
                  .sort(([a], [b]) => {
                    const ta = BUILDINGS[a]?.tier ?? 9
                    const tb = BUILDINGS[b]?.tier ?? 9
                    return ta - tb
                  })
                  .map(([buildingId, alloc]) => {
                    const b = BUILDINGS[buildingId]
                    if (!b) return null
                    const pct = alloc.requestedKw > 0 ? alloc.allocatedKw / alloc.requestedKw : 0
                    const color = allocationColor(pct)

                    return (
                      <div key={buildingId} className="flex items-center gap-1 text-xs font-mono">
                        <span>{b.emoji}</span>
                        <span className="text-slate-400 w-16 truncate">{buildingId}</span>
                        <span className="text-slate-600">{alloc.requestedKw}→</span>
                        <span style={{ color }} className="font-bold">
                          {alloc.allocatedKw}kW
                        </span>
                        <div
                          className="ml-auto text-xs px-1 rounded"
                          style={{ color, backgroundColor: `${color}22` }}
                        >
                          {alloc.satisfactionScore}%
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Metrics summary */}
              {entry.metrics && (
                <div className="flex gap-2 mt-1 pt-1 border-t border-slate-800">
                  <span className="text-xs text-slate-600">
                    Jain: <span className="text-slate-400">{entry.metrics.jainsIndex?.toFixed(3)}</span>
                  </span>
                  <span className="text-xs text-slate-600">
                    Gini: <span className="text-slate-400">{entry.metrics.giniCoefficient?.toFixed(3)}</span>
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
