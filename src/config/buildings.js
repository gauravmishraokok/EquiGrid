export const BUILDINGS = {
  B1:  { id: 'B1',  name: 'City Hospital',           type: 'Medical',        tier: 1, base: 100, max: 300, emoji: '🏥' },
  B2:  { id: 'B2',  name: 'Emergency Services Hub',  type: 'Emergency',      tier: 1, base: 100, max: 250, emoji: '🚨' },
  B3:  { id: 'B3',  name: 'Central Data Center',     type: 'Infrastructure', tier: 2, base: 100, max: 280, emoji: '💻' },
  B4:  { id: 'B4',  name: 'Water Treatment Plant',   type: 'Infrastructure', tier: 2, base: 100, max: 260, emoji: '💧' },
  B5:  { id: 'B5',  name: 'Metro Rail Control',      type: 'Infrastructure', tier: 2, base: 100, max: 240, emoji: '🚇' },
  B6:  { id: 'B6',  name: 'Shopping Mall',           type: 'Commercial',     tier: 3, base: 100, max: 200, emoji: '🏬' },
  B7:  { id: 'B7',  name: 'Office Complex A',        type: 'Commercial',     tier: 3, base: 100, max: 180, emoji: '🏢' },
  B8:  { id: 'B8',  name: 'Residential Block North', type: 'Residential',    tier: 4, base: 100, max: 160, emoji: '🏘️' },
  B9:  { id: 'B9',  name: 'Residential Block South', type: 'Residential',    tier: 4, base: 100, max: 160, emoji: '🏘️' },
  B10: { id: 'B10', name: 'University Campus',       type: 'Educational',    tier: 3, base: 100, max: 190, emoji: '🎓' },
}

export const BUILDING_IDS = Object.keys(BUILDINGS)
