export const TOTAL_SUPPLY_DEFAULT = 1000
export const GRID_SHOCK_SUPPLY = 750
export const ABSOLUTE_MINIMUM = 20

export const TIER_MIN_ALLOCATION = { 1: 0.70, 2: 0.50, 3: 0.20, 4: 0.10 }
export const TIER_EXPECTATION   = { 1: 0.85, 2: 0.70, 3: 0.50, 4: 0.35 }
export const TIER_SCORE         = { 1: 40,   2: 30,   3: 20,   4: 10   }

export const CONFLICT_LEVELS = {
  STABLE:   { min: 0,  max: 25,  label: 'STABLE',   color: '#22c55e' },
  STRESSED: { min: 26, max: 50,  label: 'STRESSED',  color: '#eab308' },
  CRITICAL: { min: 51, max: 75,  label: 'CRITICAL',  color: '#f97316' },
  CASCADE:  { min: 76, max: 100, label: 'CASCADE',   color: '#ef4444' },
}

export const ALGORITHM_NAMES = {
  STABLE:   'Proportional Fair',
  STRESSED: 'Weighted Knapsack',
  CRITICAL: 'Aumann-Maschler (Best of 3)',
  CASCADE:  'Aumann-Maschler CEA',
}
