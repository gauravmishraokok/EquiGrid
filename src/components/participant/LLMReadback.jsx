import { motion } from 'framer-motion'

const FLAG_COLORS = {
  suspicious: 'text-red-400 bg-red-950 border-red-900',
  incomplete: 'text-yellow-400 bg-yellow-950 border-yellow-900',
  contradictory: 'text-orange-400 bg-orange-950 border-orange-900',
  vague: 'text-slate-400 bg-slate-800 border-slate-700',
  reasonable: 'text-green-400 bg-green-950 border-green-900',
  urgent: 'text-cyan-400 bg-cyan-950 border-cyan-900',
  exaggerated: 'text-purple-400 bg-purple-950 border-purple-900',
}

const CATEGORY_ICONS = {
  'life-critical': '🚨',
  infrastructure: '⚙️',
  operational: '📊',
  comfort: '🛋️',
  unknown: '❓',
}

function UrgencyBar({ score }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#ef4444' : score >= 6 ? '#f97316' : score >= 4 ? '#eab308' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-sm font-bold font-mono" style={{ color }}>{score}/10</span>
    </div>
  )
}

export default function LLMReadback({ structured }) {
  if (!structured) return null

  const {
    urgencyScore = 1,
    category = 'unknown',
    riskIfDenied = 'Unknown',
    confidence = 0,
    flags = [],
    keywordsDetected = [],
    interpretedMeaning = '',
    error,
  } = structured

  if (error) {
    return (
      <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4 text-sm text-yellow-300 font-mono">
        ⚠ EquiGrid AI unavailable: {error}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-cyan-900 rounded-lg p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-sm font-bold font-mono tracking-wider">
          ⚡ HOW EQUIGRID READ YOUR REQUEST
        </span>
      </div>

      {/* Interpreted meaning */}
      <div className="bg-slate-800 rounded p-2">
        <div className="text-xs text-slate-500 mb-1">Interpreted as:</div>
        <div className="text-sm text-white font-mono">"{interpretedMeaning}"</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Urgency */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Urgency Score</div>
          <UrgencyBar score={urgencyScore} />
        </div>

        {/* Category */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Category</div>
          <div className="text-sm font-mono text-slate-300">
            {CATEGORY_ICONS[category]} {category}
          </div>
        </div>

        {/* Risk if denied */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Risk if Denied</div>
          <div className="text-sm text-red-300 font-mono">{riskIfDenied}</div>
        </div>

        {/* Confidence */}
        <div>
          <div className="text-xs text-slate-500 mb-1">AI Confidence</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-cyan-400">{Math.round(confidence * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-slate-500 self-center">Flags:</span>
          {flags.map((flag) => (
            <span
              key={flag}
              className={`text-xs px-2 py-0.5 rounded border font-mono ${FLAG_COLORS[flag] || 'text-slate-400 bg-slate-800 border-slate-700'}`}
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Keywords */}
      {keywordsDetected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-slate-500 self-center">Keywords:</span>
          {keywordsDetected.map((kw) => (
            <span key={kw} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
              {kw}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
