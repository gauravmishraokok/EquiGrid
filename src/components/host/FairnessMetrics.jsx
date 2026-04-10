import { motion } from 'framer-motion'

export default function FairnessMetrics({ metrics }) {
  if (!metrics) {
    return (
      <div className="text-slate-600 text-xs text-center py-4">
        No metrics yet — run resolution first
      </div>
    )
  }

  const { jainsIndex, giniCoefficient, totalDemand, totalSupply, deficitKw, envyFree, resolutionStrategy } = metrics

  const supplyPct = totalDemand > 0 ? Math.min(100, (totalSupply / totalDemand) * 100) : 100
  const jainsColor = jainsIndex >= 0.8 ? '#22c55e' : jainsIndex >= 0.6 ? '#eab308' : '#ef4444'
  const giniColor = giniCoefficient <= 0.2 ? '#22c55e' : giniCoefficient <= 0.4 ? '#eab308' : '#ef4444'

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-slate-500 tracking-widest">FAIRNESS METRICS</div>

      {/* Jain's Index — large display */}
      <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
        <div className="text-xs text-slate-500 mb-1">Jain's Fairness Index</div>
        <motion.div
          className="text-4xl font-bold font-mono"
          style={{ color: jainsColor }}
          key={jainsIndex}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          {jainsIndex.toFixed(3)}
        </motion.div>
        <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: jainsColor }}
            animate={{ width: `${jainsIndex * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-0.5">
          <span>0 (unfair)</span><span>1 (perfect)</span>
        </div>
      </div>

      {/* Gini Coefficient */}
      <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs text-slate-500">Gini Coefficient</div>
          <div className="text-lg font-bold font-mono" style={{ color: giniColor }}>
            {giniCoefficient.toFixed(3)}
          </div>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: giniColor }}
            animate={{ width: `${giniCoefficient * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-0.5">
          <span>0 (equal)</span><span>1 (unequal)</span>
        </div>
      </div>

      {/* Supply vs Demand bar */}
      <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs text-slate-500">Supply Coverage</div>
          <div className="text-sm font-mono text-slate-300">{Math.round(supplyPct)}%</div>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: supplyPct >= 90 ? '#22c55e' : supplyPct >= 70 ? '#eab308' : '#ef4444' }}
            animate={{ width: `${supplyPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Supply: {Math.round(totalSupply)} kW</span>
          <span>Demand: {Math.round(totalDemand)} kW</span>
        </div>
        {deficitKw > 0 && (
          <div className="text-xs text-red-400 mt-1 font-mono">
            Deficit: -{Math.round(deficitKw)} kW
          </div>
        )}
      </div>

      {/* Algorithm used */}
      {resolutionStrategy && (
        <div className="text-xs text-slate-500 bg-slate-900 rounded p-2 border border-slate-800">
          <span className="text-slate-400">Algorithm: </span>
          <span className="text-cyan-400">{resolutionStrategy}</span>
        </div>
      )}

      {/* Envy-free badge */}
      <div className={`text-xs text-center py-1 rounded font-mono ${envyFree ? 'text-green-400 bg-green-950 border border-green-900' : 'text-yellow-400 bg-yellow-950 border border-yellow-900'}`}>
        {envyFree ? '✓ ENVY-FREE' : '⚠ ENVY DETECTED'}
      </div>
    </div>
  )
}
