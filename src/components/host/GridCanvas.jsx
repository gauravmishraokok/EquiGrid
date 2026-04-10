import { useEffect, useState } from 'react'
import { BUILDINGS } from '../../config/buildings.js'

const CX = 450, CY = 325

const POSITIONS = {
  B1:  { x: 155, y: 140 },
  B2:  { x: 450, y: 90  },
  B3:  { x: 745, y: 140 },
  B4:  { x: 800, y: 380 },
  B5:  { x: 650, y: 530 },
  B6:  { x: 320, y: 560 },
  B7:  { x: 90,  y: 430 },
  B8:  { x: 80,  y: 230 },
  B9:  { x: 170, y: 530 },
  B10: { x: 700, y: 270 },
}

function allocationColor(pct) {
  if (pct >= 0.9) return '#22C55E'
  if (pct >= 0.7) return '#F59E0B'
  if (pct >= 0.5) return '#F97316'
  return '#EF4444'
}

function flowClass(pct) {
  if (pct >= 0.9) return 'flow-fast'
  if (pct >= 0.6) return 'flow-mid'
  return 'flow-slow'
}

function wirePath(bx, by, offsetDir) {
  const mx = (CX + bx) / 2
  const my = (CY + by) / 2
  const dx = by - CY, dy = CX - bx
  const len = Math.sqrt(dx*dx + dy*dy) || 1
  const off = 28 * offsetDir
  const cpx = mx + (dx/len) * off
  const cpy = my + (dy/len) * off
  return `M ${CX} ${CY} Q ${cpx} ${cpy} ${bx} ${by}`
}

function HospitalSVG() {
  return (
    <g>
      <rect x={-32} y={-26} width={64} height={50} rx={3} fill="#F0FFF4" stroke="#16A34A" strokeWidth={1.5} />
      <rect x={-24} y={-20} width={48} height={34} rx={2} fill="#DCFCE7" />
      <rect x={-20} y={-16} width={10} height={10} rx={1} fill="#BBF7D0" />
      <rect x={-6} y={-16} width={10} height={10} rx={1} fill="#BBF7D0" />
      <rect x={8} y={-16} width={10} height={10} rx={1} fill="#BBF7D0" />
      <rect x={-20} y={-2} width={10} height={10} rx={1} fill="#BBF7D0" />
      <rect x={8} y={-2} width={10} height={10} rx={1} fill="#BBF7D0" />
      <rect x={-3} y={-6} width={6} height={18} rx={1} fill="#DC2626" />
      <rect x={-9} y={0} width={18} height={6} rx={1} fill="#DC2626" />
      <rect x={-40} y={-10} width={12} height={24} rx={2} fill="#F0FFF4" stroke="#16A34A" strokeWidth={1} />
      <rect x={30} y={-10} width={12} height={24} rx={2} fill="#F0FFF4" stroke="#16A34A" strokeWidth={1} />
    </g>
  )
}

function EmergencySVG() {
  return (
    <g>
      <rect x={-34} y={-22} width={68} height={44} rx={3} fill="#EFF6FF" stroke="#1A56DB" strokeWidth={1.5} />
      <rect x={-26} y={-16} width={52} height={30} rx={2} fill="#DBEAFE" />
      <rect x={-34} y={10} width={68} height={8} fill="#1A56DB" opacity={0.3} />
      <rect x={-34} y={10} width={68} height={4} fill="#DC2626" opacity={0.3} />
      <rect x={-2} y={-38} width={4} height={18} rx={2} fill="#475569" />
      <circle cx={0} cy={-40} r={4} fill="#DBEAFE" stroke="#1A56DB" strokeWidth={1} />
      <circle cx={0} cy={-40} r={2} fill="#1A56DB">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <rect x={-20} y={-12} width={12} height={10} rx={1} fill="#BFDBFE" />
      <rect x={8} y={-12} width={12} height={10} rx={1} fill="#BFDBFE" />
    </g>
  )
}

function DataCenterSVG() {
  return (
    <g>
      <rect x={-30} y={-24} width={60} height={48} rx={3} fill="#F1F5F9" stroke="#475569" strokeWidth={1.5} />
      {[0,1,2].map(col => [0,1,2,3].map(row => (
        <rect key={`${col}-${row}`}
          x={-24 + col*17} y={-18 + row*10}
          width={12} height={7} rx={1}
          fill={col===2 && row===0 ? '#DBEAFE' : '#E2E8F0'}
          stroke="#CBD5E1" strokeWidth={0.5}
        />
      )))}
      <circle cx={22} cy={-20} r={3} fill="#22C55E">
        <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx={22} cy={-12} r={3} fill="#F59E0B">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

function WaterSVG() {
  return (
    <g>
      <rect x={-28} y={-20} width={40} height={38} rx={3} fill="#EFF6FF" stroke="#0EA5E9" strokeWidth={1.5} />
      <rect x={-20} y={-14} width={26} height={24} rx={2} fill="#DBEAFE" />
      <circle cx={22} cy={-8} r={12} fill="#EFF6FF" stroke="#0EA5E9" strokeWidth={1.5} />
      <circle cx={22} cy={12} r={10} fill="#EFF6FF" stroke="#0EA5E9" strokeWidth={1.5} />
      <path d="M 13,-10 Q 17,-6 22,-8 Q 27,-10 31,-8" fill="none" stroke="#0EA5E9" strokeWidth={1.2} opacity={0.6} />
      <path d="M 14,10 Q 18,14 22,12 Q 26,10 30,12" fill="none" stroke="#0EA5E9" strokeWidth={1.2} opacity={0.6} />
    </g>
  )
}

function MetroSVG() {
  return (
    <g>
      <rect x={-38} y={-16} width={76} height={32} rx={4} fill="#FFF7ED" stroke="#F97316" strokeWidth={1.5} />
      <rect x={-30} y={-10} width={60} height={20} rx={2} fill="#FFEDD5" />
      {[-20, -8, 4, 16].map(x => (
        <rect key={x} x={x} y={-8} width={8} height={14} rx={1} fill="#FED7AA" />
      ))}
      <line x1={-48} y1={4} x2={-38} y2={4} stroke="#F97316" strokeWidth={2} opacity={0.6} />
      <line x1={-48} y1={-4} x2={-38} y2={-4} stroke="#F97316" strokeWidth={2} opacity={0.6} />
      <line x1={38} y1={4} x2={48} y2={4} stroke="#F97316" strokeWidth={2} opacity={0.6} />
      <line x1={38} y1={-4} x2={48} y2={-4} stroke="#F97316" strokeWidth={2} opacity={0.6} />
    </g>
  )
}

function MallSVG() {
  return (
    <g>
      <rect x={-36} y={-14} width={72} height={32} rx={3} fill="#FEFCE8" stroke="#EAB308" strokeWidth={1.5} />
      <ellipse cx={0} cy={-14} rx={24} ry={10} fill="#FEF9C3" stroke="#EAB308" strokeWidth={1} />
      {[-28, -14, 0, 14, 28].map(x => (
        <circle key={x} cx={x} cy={18} r={3} fill="#EAB308" opacity={0.5} />
      ))}
      {[-22,-8,8,22].map(x => (
        <rect key={x} x={x-5} y={-8} width={10} height={14} rx={1} fill="#FEF08A" />
      ))}
    </g>
  )
}

function OfficeSVG() {
  return (
    <g>
      <rect x={-26} y={-30} width={52} height={56} rx={3} fill="#F8FAFF" stroke="#6366F1" strokeWidth={1.5} />
      {[0,1,2].map(col => [0,1,2,3,4].map(row => (
        <rect key={`${col}-${row}`}
          x={-18 + col*14} y={-24 + row*10}
          width={9} height={6} rx={0.5}
          fill={(col + row) % 3 !== 0 ? '#C7D2FE' : '#E0E7FF'}
        />
      )))}
    </g>
  )
}

function ResidentialSVG({ mirror = false }) {
  const houses = mirror
    ? [{ x: -22, w: 20 }, { x: 2, w: 18 }, { x: 22, w: 16 }]
    : [{ x: -22, w: 16 }, { x: -2, w: 18 }, { x: 18, w: 20 }]

  return (
    <g>
      {houses.map(({ x, w }, i) => {
        const h = 18 + i * 2
        return (
          <g key={i}>
            <rect x={x} y={-h/2} width={w} height={h} rx={2} fill="#FFF1F2" stroke="#FB7185" strokeWidth={1} />
            <polygon points={`${x-2},${-h/2} ${x+w/2},${-h/2-10} ${x+w+2},${-h/2}`} fill="#FECDD3" stroke="#FB7185" strokeWidth={1} />
            <rect x={x+w/2-3} y={h/2-10} width={6} height={10} rx={1} fill="#FECDD3" />
          </g>
        )
      })}
    </g>
  )
}

function UniversitySVG() {
  return (
    <g>
      <rect x={-34} y={-18} width={68} height={36} rx={3} fill="#FEFCE8" stroke="#D97706" strokeWidth={1.5} />
      <rect x={-26} y={-12} width={52} height={24} rx={2} fill="#FEF3C7" />
      <rect x={-6} y={-36} width={12} height={20} rx={2} fill="#FEFCE8" stroke="#D97706" strokeWidth={1} />
      <rect x={-8} y={-38} width={16} height={6} rx={1} fill="#D97706" opacity={0.6} />
      <circle cx={0} cy={-30} r={5} fill="none" stroke="#D97706" strokeWidth={1} />
      <path d="M -10,18 Q -10,10 0,10 Q 10,10 10,18" fill="none" stroke="#D97706" strokeWidth={1.5} />
      {[-20,-6,8].map(x => (
        <rect key={x} x={x} y={-10} width={10} height={14} rx={1} fill="#FDE68A" />
      ))}
    </g>
  )
}

const BUILDING_COMPONENTS = {
  B1:  HospitalSVG,
  B2:  EmergencySVG,
  B3:  DataCenterSVG,
  B4:  WaterSVG,
  B5:  MetroSVG,
  B6:  MallSVG,
  B7:  OfficeSVG,
  B8:  () => <ResidentialSVG mirror={false} />,
  B9:  () => <ResidentialSVG mirror={true} />,
  B10: UniversitySVG,
}

function StatusRing({ pct, size }) {
  const r = size / 2 + 8
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.min(pct, 1))
  const color = allocationColor(pct)
  return (
    <circle
      cx={0} cy={0} r={r}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={dashOffset}
      transform="rotate(-90)"
      style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 1.8s ease-in-out' }}
      opacity={0.8}
    />
  )
}

function CentralNode({ totalSupply, conflictLevel }) {
  const conflictColors = {
    STABLE: '#1A56DB', STRESSED: '#CA8A04', CRITICAL: '#EA580C', CASCADE: '#DC2626'
  }
  const c = conflictColors[conflictLevel] || '#1A56DB'

  return (
    <g>
      {/* Outer rotating dash ring */}
      <circle cx={CX} cy={CY} r={52} fill="none" stroke={c} strokeWidth={2} strokeDasharray="8 4"
        style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'rotate-dash 20s linear infinite' }} />
      {/* Middle ring */}
      <circle cx={CX} cy={CY} r={40} fill="#DBEAFE" stroke={c} strokeWidth={1.5} />
      {/* Inner filled circle */}
      <circle cx={CX} cy={CY} r={28} fill={c} />
      {/* Pulse ring */}
      <circle cx={CX} cy={CY} r={28} fill="none" stroke={c} strokeWidth={3} opacity={0.4}>
        <animate attributeName="r" values="28;44;28" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Lightning bolt */}
      <g transform={`translate(${CX-7}, ${CY-13})`} fill="white">
        <polygon points="7,0 13,0 9,12 16,12 6,26 9,26 7,14 0,14" />
      </g>
      {/* Labels */}
      <text x={CX} y={CY+44} textAnchor="middle" fill={c} fontSize="9"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: '0.15em' }}>
        GRID
      </text>
      <text x={CX} y={CY+55} textAnchor="middle" fill="#0F172A" fontSize="10"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
        {totalSupply} kW
      </text>
    </g>
  )
}

export default function GridCanvas({ allocations, submissions, dbBuildings, totalSupply, conflictLevel, onBuildingClick, selectedBuilding }) {
  const [prevAllocations, setPrevAllocations] = useState({})
  const [deltas, setDeltas] = useState({})

  useEffect(() => {
    if (!allocations) return
    const newDeltas = {}
    for (const [id, alloc] of Object.entries(allocations)) {
      const prev = prevAllocations[id]?.allocatedKw ?? 0
      const delta = Math.round(alloc.allocatedKw - prev)
      if (Math.abs(delta) > 5) newDeltas[id] = delta
    }
    if (Object.keys(newDeltas).length > 0) {
      setDeltas(newDeltas)
      setTimeout(() => setDeltas({}), 2000)
    }
    setPrevAllocations(allocations)
  }, [allocations])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF6FF' }}>
      <svg viewBox="0 0 900 650" style={{ width: '100%', height: '100%', maxHeight: '100%' }}>
        <defs>
          <pattern id="city-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#DBEAFE" strokeWidth="0.5" opacity="0.6" />
          </pattern>
          {/* Wire gradients */}
          {Object.entries(BUILDINGS).map(([id]) => {
            const pos = POSITIONS[id]
            if (!pos) return null
            const alloc = allocations?.[id]
            const pct = alloc ? alloc.allocatedKw / Math.max(alloc.requestedKw, 1) : 0
            const wireColor = allocationColor(pct)
            const connected = !!dbBuildings?.[id]?.participantId
            return (
              <linearGradient key={id} id={`wire-${id}`} x1={CX} y1={CY} x2={pos.x} y2={pos.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1A56DB" />
                <stop offset="100%" stopColor={connected ? wireColor : '#CBD5E1'} />
              </linearGradient>
            )
          })}
        </defs>

        {/* Background */}
        <rect width="900" height="650" fill="#EFF6FF" />
        <rect width="900" height="650" fill="url(#city-grid)" />

        {/* Decorative roads */}
        <path d="M 0,325 Q 220,310 450,325 Q 680,340 900,325" fill="none" stroke="white" strokeWidth="10" opacity="0.8" />
        <path d="M 450,0 Q 440,165 450,325 Q 460,490 450,650" fill="none" stroke="white" strokeWidth="10" opacity="0.8" />
        <path d="M 0,180 Q 300,200 500,150 Q 700,100 900,180" fill="none" stroke="white" strokeWidth="6" opacity="0.6" />
        <path d="M 0,500 Q 250,480 500,500 Q 750,520 900,500" fill="none" stroke="white" strokeWidth="6" opacity="0.6" />

        {/* Green park areas */}
        <rect x="520" y="350" width="80" height="60" rx="8" fill="#DCFCE7" opacity="0.6" />
        <rect x="200" y="280" width="60" height="50" rx="8" fill="#DCFCE7" opacity="0.5" />
        <rect x="350" y="190" width="50" height="40" rx="6" fill="#DCFCE7" opacity="0.5" />

        {/* Power lines */}
        {Object.entries(BUILDINGS).map(([id], i) => {
          const pos = POSITIONS[id]
          if (!pos) return null
          const alloc = allocations?.[id]
          const allocated = alloc?.allocatedKw ?? 0
          const requested = alloc?.requestedKw ?? 100
          const pct = requested > 0 ? allocated / requested : 0
          const connected = !!dbBuildings?.[id]?.participantId
          const thickness = connected ? 3 + (allocated / Math.max(totalSupply, 1)) * 9 : 1.5
          const dir = i % 2 === 0 ? 1 : -1
          const d = wirePath(pos.x, pos.y, dir)

          return (
            <g key={`wire-${id}`}>
              <path
                d={d}
                fill="none"
                stroke={connected ? `url(#wire-${id})` : '#E2E8F7'}
                strokeWidth={thickness}
                strokeLinecap="round"
                style={{ transition: 'stroke-width 1.2s ease, opacity 0.8s ease' }}
                opacity={connected ? (selectedBuilding && selectedBuilding !== id ? 0.25 : 0.8) : 0.3}
              />
              {connected && allocated > 0 && (
                <path
                  d={d}
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="8 24"
                  className={flowClass(pct)}
                  opacity={0.7}
                />
              )}
            </g>
          )
        })}

        {/* Central node */}
        <CentralNode totalSupply={totalSupply} conflictLevel={conflictLevel} />

        {/* Buildings */}
        {Object.entries(BUILDINGS).map(([id, building], i) => {
          const pos = POSITIONS[id]
          if (!pos) return null
          const alloc = allocations?.[id]
          const allocated = alloc?.allocatedKw ?? 0
          const requested = alloc?.requestedKw ?? building.base
          const pct = requested > 0 ? allocated / requested : 0
          const connected = !!dbBuildings?.[id]?.participantId
          const hasSubmission = !!submissions?.[id]
          const isSelected = selectedBuilding === id
          const Silhouette = BUILDING_COMPONENTS[id]
          const size = [0, 80, 64, 52, 44][building.tier] ?? 52
          const dimmed = selectedBuilding && !isSelected
          const delta = deltas[id]

          return (
            <g
              key={`building-${id}`}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{
                cursor: 'pointer',
                opacity: dimmed ? 0.4 : 1,
                transition: 'opacity 0.3s ease',
              }}
              onClick={() => onBuildingClick?.(id)}
            >
              {/* Status ring */}
              {allocated > 0 && <StatusRing pct={pct} size={size} />}

              {/* Building silhouette */}
              <g style={{
                transform: isSelected ? 'scale(1.08) translateY(-6px)' : 'scale(1)',
                transformBox: 'fill-box', transformOrigin: 'center',
                transition: 'transform 0.3s var(--ease-spring)',
                filter: connected ? `drop-shadow(0 4px ${isSelected ? 12 : 4}px rgba(0,0,0,0.12))` : 'none',
              }}>
                {Silhouette && <Silhouette />}
              </g>

              {/* Connected dot */}
              {connected && (
                <circle cx={size/2 - 4} cy={-size/2 + 4} r={4} fill="#22C55E">
                  <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Submission indicator */}
              {hasSubmission && !allocated && (
                <circle cx={size/2 - 4} cy={size/2 - 4} r={4} fill="#1A56DB">
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Building name */}
              <text
                x={0} y={size/2 + 18}
                textAnchor="middle"
                fill="#0F172A"
                fontSize={building.tier <= 2 ? "10" : "9"}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
              >
                {building.name.length > 14 ? building.name.substring(0, 13) + '…' : building.name}
              </text>

              {/* kW label */}
              {allocated > 0 && (
                <text
                  x={0} y={size/2 + 30}
                  textAnchor="middle"
                  fill={allocationColor(pct)}
                  fontSize="10"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, transition: 'fill 1.8s ease' }}
                >
                  {allocated} kW
                </text>
              )}

              {/* Delta float */}
              {delta && (
                <text
                  x={0} y={-size/2 - 12}
                  textAnchor="middle"
                  fill={delta > 0 ? '#16A34A' : '#DC2626'}
                  fontSize="11"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                    animation: delta > 0 ? 'delta-float 1.5s ease forwards' : 'delta-float-down 1.5s ease forwards',
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta} kW
                </text>
              )}

              {/* Emoji */}
              <text x={0} y={6} textAnchor="middle" fontSize={building.tier <= 2 ? "20" : "16"} dominantBaseline="middle">
                {building.emoji}
              </text>
            </g>
          )
        })}

        {/* Connected count */}
        <text x={10} y={640} fill="#94A3B8" fontSize="10"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          {Object.values(dbBuildings || {}).filter(b => b.participantId).length} buildings connected
        </text>
      </svg>
    </div>
  )
}
