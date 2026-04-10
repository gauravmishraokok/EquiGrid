import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BUILDINGS } from '../../config/buildings.js'
import { CONFLICT_LEVELS } from '../../config/constants.js'

const CX = 400
const CY = 300
const INNER_R = 180
const OUTER_R = 300

function buildingPositions() {
  const innerIds = ['B1', 'B2', 'B3', 'B4', 'B5']
  const outerIds = ['B6', 'B7', 'B8', 'B9', 'B10']
  const positions = {}

  innerIds.forEach((id, i) => {
    const angle = (i / innerIds.length) * 2 * Math.PI - Math.PI / 2
    positions[id] = {
      x: CX + INNER_R * Math.cos(angle),
      y: CY + INNER_R * Math.sin(angle),
    }
  })
  outerIds.forEach((id, i) => {
    const angle = (i / outerIds.length) * 2 * Math.PI - Math.PI / 2
    positions[id] = {
      x: CX + OUTER_R * Math.cos(angle),
      y: CY + OUTER_R * Math.sin(angle),
    }
  })
  return positions
}

function allocationColor(pct) {
  if (pct >= 0.9) return '#22c55e'
  if (pct >= 0.7) return '#eab308'
  if (pct >= 0.5) return '#f97316'
  return '#ef4444'
}

function tierBadgeColor(tier) {
  return ['', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6'][tier] || '#64748b'
}

export default function GridCanvas({ allocations, submissions, dbBuildings, totalSupply, conflictLevel }) {
  const positions = useMemo(() => buildingPositions(), [])

  const conflictColor = CONFLICT_LEVELS[conflictLevel]?.color || '#22c55e'

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full"
        style={{ maxHeight: '100%' }}
      >
        <defs>
          {/* Glow filters */}
          {['green', 'yellow', 'orange', 'red', 'blue', 'purple', 'conflict'].map((name) => {
            const colors = {
              green: '#22c55e', yellow: '#eab308', orange: '#f97316',
              red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6',
              conflict: conflictColor,
            }
            const c = colors[name]
            return (
              <filter key={name} id={`glow-${name}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={c} floodOpacity="0.6" result="flood" />
                <feComposite in="flood" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )
          })}
          {/* Grid background pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width="800" height="600" fill="url(#grid)" opacity="0.5" />

        {/* Outer ring reference circle */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 8" />
        <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 8" />

        {/* Power lines */}
        {Object.entries(BUILDINGS).map(([id, building]) => {
          const pos = positions[id]
          if (!pos) return null
          const alloc = allocations?.[id]
          const allocated = alloc?.allocatedKw ?? 0
          const requested = alloc?.requestedKw ?? building.base
          const pct = requested > 0 ? allocated / requested : 0
          const color = allocationColor(pct)
          const thickness = 2 + (allocated / Math.max(totalSupply, 1)) * 8
          const connected = !!dbBuildings?.[id]?.participantId

          return (
            <g key={`line-${id}`}>
              {/* Base line */}
              <line
                x1={CX} y1={CY} x2={pos.x} y2={pos.y}
                stroke={connected ? color : '#1e293b'}
                strokeWidth={connected ? thickness : 1}
                strokeLinecap="round"
                opacity={connected ? 0.7 : 0.3}
              />
              {/* Animated flow dots */}
              {connected && allocated > 0 && (
                <line
                  x1={CX} y1={CY} x2={pos.x} y2={pos.y}
                  stroke={color}
                  strokeWidth={thickness + 1}
                  strokeDasharray="6 14"
                  strokeLinecap="round"
                  opacity={0.9}
                  style={{ animation: 'dash 1.5s linear infinite' }}
                />
              )}
            </g>
          )
        })}

        {/* Central supply node */}
        <g>
          <motion.circle
            cx={CX} cy={CY} r={55}
            fill={`${conflictColor}22`}
            stroke={conflictColor}
            strokeWidth={2}
            filter="url(#glow-conflict)"
            animate={{ r: [50, 58, 50] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx={CX} cy={CY} r={40} fill="#0f172a" stroke={conflictColor} strokeWidth={2} />
          <text x={CX} y={CY - 8} textAnchor="middle" fill={conflictColor} fontSize="10" fontFamily="monospace" fontWeight="bold">
            GRID
          </text>
          <text x={CX} y={CY + 4} textAnchor="middle" fill={conflictColor} fontSize="9" fontFamily="monospace">
            SUPPLY
          </text>
          <text x={CX} y={CY + 16} textAnchor="middle" fill="white" fontSize="11" fontFamily="monospace" fontWeight="bold">
            {totalSupply}kW
          </text>
        </g>

        {/* Building nodes */}
        {Object.entries(BUILDINGS).map(([id, building]) => {
          const pos = positions[id]
          if (!pos) return null
          const alloc = allocations?.[id]
          const allocated = alloc?.allocatedKw ?? 0
          const requested = alloc?.requestedKw ?? building.base
          const pct = requested > 0 ? allocated / requested : 0
          const color = allocationColor(pct)
          const connected = !!dbBuildings?.[id]?.participantId
          const hasSubmission = !!submissions?.[id]
          const filterName = pct >= 0.9 ? 'green' : pct >= 0.7 ? 'yellow' : pct >= 0.5 ? 'orange' : 'red'
          const tierColor = tierBadgeColor(building.tier)

          return (
            <g key={`building-${id}`} transform={`translate(${pos.x - 30}, ${pos.y - 40})`}>
              {/* Building rect */}
              <rect
                width={60} height={56}
                rx={4}
                fill="#0f172a"
                stroke={connected ? color : '#334155'}
                strokeWidth={connected ? 2 : 1}
                filter={connected && allocated > 0 ? `url(#glow-${filterName})` : undefined}
                opacity={connected ? 1 : 0.5}
              />

              {/* Tier badge */}
              <rect x={0} y={0} width={14} height={14} rx={2} fill={tierColor} opacity={0.8} />
              <text x={7} y={10} textAnchor="middle" fill="white" fontSize="8" fontFamily="monospace" fontWeight="bold">
                T{building.tier}
              </text>

              {/* Connected indicator */}
              {connected && (
                <circle cx={50} cy={8} r={4} fill="#22c55e">
                  <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Submission indicator */}
              {hasSubmission && (
                <rect x={46} y={4} width={12} height={8} rx={2} fill="#3b82f6" opacity={0.8}>
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
                </rect>
              )}

              {/* Emoji */}
              <text x={30} y={32} textAnchor="middle" fontSize="18">
                {building.emoji}
              </text>

              {/* Allocation bar */}
              <rect x={2} y={46} width={56} height={6} rx={2} fill="#1e293b" />
              <rect
                x={2} y={46}
                width={Math.max(0, Math.min(56, 56 * pct))} height={6}
                rx={2}
                fill={color}
                opacity={0.8}
              />

              {/* Building ID label */}
              <text x={30} y={70} textAnchor="middle" fill={connected ? '#94a3b8' : '#475569'} fontSize="9" fontFamily="monospace">
                {id}
              </text>

              {/* Allocation text */}
              {allocated > 0 && (
                <text x={30} y={80} textAnchor="middle" fill={color} fontSize="8" fontFamily="monospace">
                  {allocated}kW
                </text>
              )}
            </g>
          )
        })}

        {/* Conflict level label */}
        <text x={10} y={590} fill={conflictColor} fontSize="10" fontFamily="monospace" opacity={0.7}>
          {conflictLevel} • {Object.values(dbBuildings || {}).filter(b => b.participantId).length} nodes connected
        </text>
      </svg>
    </div>
  )
}
