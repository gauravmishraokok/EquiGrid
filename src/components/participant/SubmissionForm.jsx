import { useState } from 'react'
import { motion } from 'framer-motion'

export default function SubmissionForm({ building, onSubmit, submitted, loading }) {
  const [demandKw, setDemandKw] = useState(building.base)
  const [weight, setWeight] = useState(3)
  const [rawReason, setRawReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (submitted || loading) return
    onSubmit({ demandKw, weight, rawReason })
  }

  const maxChars = 120
  const remaining = maxChars - rawReason.length

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Demand Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-400 font-mono">Power Demand</label>
          <span className="text-lg font-bold text-cyan-400 font-mono">{demandKw} kW</span>
        </div>
        <input
          type="range"
          min={0}
          max={building.max}
          step={10}
          value={demandKw}
          onChange={(e) => setDemandKw(Number(e.target.value))}
          disabled={submitted || loading}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0 kW</span>
          <span className="text-slate-500">Base: {building.base} kW</span>
          <span>{building.max} kW</span>
        </div>
      </div>

      {/* Weight Selector */}
      <div>
        <label className="text-sm text-slate-400 font-mono block mb-2">
          Priority Weight <span className="text-slate-600">(1=low, 5=critical)</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((w) => (
            <motion.button
              key={w}
              type="button"
              onClick={() => !submitted && !loading && setWeight(w)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 py-2 rounded font-mono font-bold text-sm transition-all ${
                weight === w
                  ? 'bg-cyan-600 text-white border border-cyan-400'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
              }`}
              disabled={submitted || loading}
            >
              {w}
            </motion.button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>Low</span><span>Medium</span><span>Critical</span>
        </div>
      </div>

      {/* Reason Textarea */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-400 font-mono">Reason for Request</label>
          <span className={`text-xs font-mono ${remaining < 20 ? 'text-red-400' : 'text-slate-600'}`}>
            {remaining} chars left
          </span>
        </div>
        <textarea
          value={rawReason}
          onChange={(e) => setRawReason(e.target.value.slice(0, maxChars))}
          disabled={submitted || loading}
          placeholder="Explain why your building needs this power level..."
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono resize-none focus:outline-none focus:border-cyan-600 disabled:opacity-50"
        />
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={submitted || loading}
        whileTap={{ scale: 0.97 }}
        className={`w-full py-3 rounded-lg font-mono font-bold tracking-widest text-sm transition-all ${
          submitted
            ? 'bg-green-900 text-green-400 border border-green-700 cursor-not-allowed'
            : loading
            ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-wait'
            : 'bg-cyan-700 hover:bg-cyan-600 text-white border border-cyan-500'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⟳</span> Processing with EquiGrid AI...
          </span>
        ) : submitted ? (
          '✓ SUBMITTED — Awaiting Resolution'
        ) : (
          'SUBMIT DEMAND →'
        )}
      </motion.button>
    </form>
  )
}
