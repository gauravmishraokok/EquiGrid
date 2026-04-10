import { motion } from 'framer-motion'

function SatisfactionGauge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'
  const circumference = 2 * Math.PI * 36
  const offset = circumference * (1 - score / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={50} cy={50} r={36} fill="none" stroke="#1e293b" strokeWidth={8} />
        <motion.circle
          cx={50} cy={50} r={36}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  )
}

export default function ExplanationPanel({ allocation }) {
  if (!allocation) return null

  const { allocatedKw, requestedKw, satisfactionScore, explanationSteps, finalRank } = allocation
  const pct = requestedKw > 0 ? Math.round((allocatedKw / requestedKw) * 100) : 0
  const color = satisfactionScore >= 80 ? '#22c55e' : satisfactionScore >= 60 ? '#eab308' : satisfactionScore >= 40 ? '#f97316' : '#ef4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col gap-4"
    >
      <div className="text-sm font-bold text-slate-300 font-mono tracking-wider">
        ⚡ RESOLUTION RESULT
      </div>

      {/* Allocation summary */}
      <div className="flex items-center gap-6">
        <SatisfactionGauge score={satisfactionScore ?? 0} />
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold font-mono" style={{ color }}>
              {allocatedKw}
            </span>
            <span className="text-slate-400 mb-1 font-mono">kW allocated</span>
          </div>
          <div className="text-sm text-slate-500 font-mono">
            of {requestedKw} kW requested ({pct}%)
          </div>
          <div className="text-sm font-mono" style={{ color }}>
            Satisfaction: {satisfactionScore}/100
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Priority Rank: #{finalRank}
          </div>
        </div>
      </div>

      {/* Allocation bar */}
      <div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
          <span>0</span>
          <span>{requestedKw} kW requested</span>
        </div>
      </div>

      {/* Explanation steps */}
      {explanationSteps && explanationSteps.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-slate-500 tracking-widest">WHY YOU RECEIVED THIS ALLOCATION</div>
          {explanationSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-2 text-xs font-mono"
            >
              <span className="text-cyan-600 flex-shrink-0 w-5">{i + 1}.</span>
              <span className="text-slate-400">{step}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
