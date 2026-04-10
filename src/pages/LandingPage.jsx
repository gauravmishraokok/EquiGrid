import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

function HexLogo({ size = 120 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.44
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')

  const r2 = size * 0.35
  const pts2 = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + r2 * Math.cos(angle)},${cy + r2 * Math.sin(angle)}`
  }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="hex-logo">
      {/* Outer hex border with rotation */}
      <polygon
        points={pts}
        fill="none"
        stroke="#1A56DB"
        strokeWidth="2.5"
        strokeDasharray="6 3"
        style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'rotate-dash 20s linear infinite' }}
      />
      {/* Inner hex fill */}
      <polygon points={pts2} fill="#DBEAFE" stroke="#1A56DB" strokeWidth="1.5" />
      {/* City skyline silhouette */}
      <g fill="#1A56DB" opacity="0.3">
        <rect x={cx-22} y={cy+2} width={8} height={16} rx="1" />
        <rect x={cx-12} y={cy-4} width={7} height={22} rx="1" />
        <rect x={cx-3} y={cy+4} width={6} height={14} rx="1" />
        <rect x={cx+5} y={cy-2} width={8} height={20} rx="1" />
        <rect x={cx+15} y={cy+6} width={7} height={12} rx="1" />
      </g>
      {/* Lightning bolt */}
      <g className="lightning-shimmer" transform={`translate(${cx}, ${cy - 10})`}>
        <polygon
          points="-7,-16 2,-16 -2,0 6,0 -8,18 -1,18 -4,2 -12,2"
          fill="#1A56DB"
          stroke="none"
        />
      </g>
    </svg>
  )
}

export default function LandingPage({ onEnter }) {
  const [clicked, setClicked] = useState(false)
  const navigate = useNavigate()

  const handleClick = () => {
    if (clicked) return
    setClicked(true)
    setTimeout(() => {
      if (onEnter) onEnter()
      else navigate('/host')
    }, 600)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden grid-pattern"
      style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #DBEAFE 60%, #BFDBFE 100%)' }}
    >
      {/* Floating orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb-1 absolute rounded-full"
          style={{ width: 400, height: 400, top: '10%', left: '5%',
            background: 'radial-gradient(circle, rgba(26,86,219,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)' }} />
        <div className="orb-2 absolute rounded-full"
          style={{ width: 500, height: 500, bottom: '5%', right: '8%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)' }} />
        <div className="orb-3 absolute rounded-full"
          style={{ width: 300, height: 300, top: '40%', right: '20%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)',
            filter: 'blur(50px)' }} />
      </div>

      {/* Logo group */}
      <AnimatePresence>
        {!clicked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center gap-6 cursor-pointer select-none"
            onClick={handleClick}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
          >
            <HexLogo size={140} />
            <div className="flex flex-col items-center gap-2">
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 800,
                fontSize: '3rem',
                letterSpacing: '0.3em',
                color: '#1A56DB',
                textShadow: '0 2px 20px rgba(26,86,219,0.2)',
                lineHeight: 1,
              }}>
                EQUIGRID
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '13px',
                letterSpacing: '0.1em',
                color: '#475569',
              }}>
                Neural Grid Conflict Engine
              </div>
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              color: '#94A3B8',
              marginTop: 8,
            }}>
              Click to enter
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
