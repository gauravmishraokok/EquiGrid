/**
 * EquiGrid Tier 2 — 8-Stage Algorithm Engine
 * Pure JS, no external dependencies.
 */

import {
  ABSOLUTE_MINIMUM,
  TIER_MIN_ALLOCATION,
  TIER_EXPECTATION,
  TIER_SCORE,
  CONFLICT_LEVELS,
  ALGORITHM_NAMES,
} from '../config/constants.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stddev(arr) {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
}

/** Jain's fairness index: (Σx)² / (n·Σx²) */
function jainsIndex(values) {
  const n = values.length
  if (!n) return 1
  const sumX = values.reduce((a, b) => a + b, 0)
  const sumX2 = values.reduce((a, b) => a + b * b, 0)
  if (sumX2 === 0) return 1
  return (sumX * sumX) / (n * sumX2)
}

/** Gini coefficient */
function giniCoefficient(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return 0
  const s = sorted.reduce((a, b) => a + b, 0)
  if (!s) return 0
  let num = 0
  for (let i = 0; i < n; i++) num += (2 * (i + 1) - n - 1) * sorted[i]
  return num / (n * s)
}

/** Shannon entropy over a probability distribution */
function shannonEntropy(probs) {
  let H = 0
  for (const p of probs) {
    if (p > 0) H -= p * Math.log2(p)
  }
  return H
}

/** Normalise an array to sum=1 */
function normalise(arr) {
  const s = arr.reduce((a, b) => a + b, 0)
  if (!s) return arr.map(() => 1 / arr.length)
  return arr.map((v) => v / s)
}

/** Determine CONFLICT_LEVELS key from score 0-100 */
function conflictLevelFromScore(score) {
  for (const [key, { min, max }] of Object.entries(CONFLICT_LEVELS)) {
    if (score >= min && score <= max) return key
  }
  return 'CASCADE'
}

// ─── Stage 1 — Normalise inputs ──────────────────────────────────────────────

function stage1Normalise(buildings, submissions, structured) {
  const records = {}

  for (const [id, building] of Object.entries(buildings)) {
    const sub = submissions[id] || {}
    const str = structured[id] || {}

    let demandKw = sub.demandKw != null ? Number(sub.demandKw) : building.base
    demandKw = Math.min(demandKw, building.max)
    demandKw = Math.max(demandKw, ABSOLUTE_MINIMUM)

    const weight = clamp(Number(sub.weight) || 1, 1, 5)

    let urgencyScore = str.urgencyScore != null ? Number(str.urgencyScore) : 1
    const confidence = str.confidence != null ? Number(str.confidence) : 0

    if (confidence < 0.2) urgencyScore = Math.max(1, urgencyScore - 2)

    const flags = Array.isArray(str.flags) ? str.flags : []
    const category = str.category || 'unknown'
    const hasSubmission = !!sub.rawReason

    const steps = []
    steps.push(
      hasSubmission
        ? `Input received: ${demandKw} kW requested with reason "${(sub.rawReason || '').slice(0, 60)}${sub.rawReason?.length > 60 ? '…' : ''}".`
        : `No submission received. Using base demand of ${demandKw} kW.`
    )
    if (confidence < 0.2 && hasSubmission) {
      steps.push(`Low LLM confidence (${confidence.toFixed(2)}) — urgency score penalised by 2 points.`)
    }

    records[id] = {
      building,
      demandKw,
      weight,
      urgencyScore,
      confidence,
      flags,
      category,
      hasSubmission,
      explanationSteps: steps,
    }
  }

  return records
}

// ─── Stage 2 — Feasibility check ─────────────────────────────────────────────

function stage2Feasibility(records, totalSupply) {
  const totalDemand = Object.values(records).reduce((s, r) => s + r.demandKw, 0)
  const deficit = totalDemand - totalSupply
  return { totalDemand, deficit, feasible: deficit <= 0 }
}

// ─── Stage 3 — Z-score outlier detection ─────────────────────────────────────

function stage3Outliers(records) {
  const demands = Object.values(records).map((r) => r.demandKw)
  const m = mean(demands)
  const sd = stddev(demands)

  for (const r of Object.values(records)) {
    const z = sd > 0 ? (r.demandKw - m) / sd : 0
    r.zScore = z
    r.highDemandOutlier = z > 2.0

    if (r.highDemandOutlier) {
      r.explanationSteps.push(
        `Outlier detected: z-score ${z.toFixed(2)} > 2.0. Demand is significantly above average.`
      )
      if (r.flags.includes('suspicious')) {
        r.urgencyScore = Math.min(r.urgencyScore, 5)
        r.explanationSteps.push(
          `LLM also flagged this submission as "suspicious" — urgency score capped at 5.`
        )
      }
    } else {
      r.explanationSteps.push(`Demand within normal range (z-score: ${z.toFixed(2)}).`)
    }
  }
}

// ─── Stage 4 — Shannon entropy conflict intensity ─────────────────────────────

function stage4Conflict(records, totalDemand, totalSupply) {
  const demands = Object.values(records).map((r) => r.demandKw)
  const urgencies = Object.values(records).map((r) => r.urgencyScore)

  const deficitRatio = clamp((totalDemand - totalSupply) / totalSupply, 0, 1)

  // entropy of demand distribution
  const demandProbs = normalise(demands)
  const rawEntropy = shannonEntropy(demandProbs)
  const maxEntropy = Math.log2(demands.length) || 1
  const entropyNorm = clamp(rawEntropy / maxEntropy, 0, 1)

  // urgency variance component
  const urgencyVar = stddev(urgencies) / 10

  // weighted conflict score 0-100
  const conflictScore = Math.round(
    (entropyNorm * 35 + deficitRatio * 45 + urgencyVar * 20) * 100
  )

  const conflictLevel = conflictLevelFromScore(conflictScore)

  return { conflictScore, conflictLevel }
}

// ─── Stage 5 — Priority score 0-100 ──────────────────────────────────────────

function stage5Priority(records, history) {
  for (const [id, r] of Object.entries(records)) {
    const { building, urgencyScore, weight, confidence, highDemandOutlier, flags } = r
    const tier = building.tier

    const tierScore = TIER_SCORE[tier]
    const urgencyComponent = (urgencyScore / 10) * 25
    const weightComponent = ((weight - 1) / 4) * 20

    // history penalty
    const hist = history[id]
    let historyPenalty = 0
    let historyNote = ''
    if (hist && hist.rounds >= 2) {
      const avg = hist.averageSatisfaction
      if (avg > 75) {
        historyPenalty = (avg - 75) * 0.3
        historyNote = ` | History (avg ${avg.toFixed(0)}%): -${historyPenalty.toFixed(1)} pts`
      }
    }

    const confidenceAdjustment = (confidence - 0.5) * 5
    const sign = confidenceAdjustment >= 0 ? '+' : ''

    const outlierPenalty =
      highDemandOutlier && flags.includes('suspicious') ? 10 : 0
    const outlierNote = outlierPenalty > 0 ? ` | Outlier+suspicious penalty: -${outlierPenalty} pts` : ''

    const rawScore =
      tierScore +
      urgencyComponent +
      weightComponent +
      confidenceAdjustment -
      historyPenalty -
      outlierPenalty

    const priorityScore = clamp(Math.round(rawScore), 5, 100)

    r.priorityScore = priorityScore
    r.explanationSteps.push(
      `Priority score: ${priorityScore}/100. Breakdown — Tier (${tier}): +${tierScore} pts | Urgency (${urgencyScore}/10): +${urgencyComponent.toFixed(1)} pts | User weight (${weight}/5): +${weightComponent.toFixed(1)} pts | Confidence (${confidence.toFixed(2)}): ${sign}${confidenceAdjustment.toFixed(1)} pts${historyNote}${outlierNote}.`
    )
  }
}

// ─── Stage 7a — Proportional Fair (STABLE) ────────────────────────────────────

function stage7aProportionalFair(records, totalSupply) {
  const list = Object.values(records)

  // weighted demand
  const weightedDemands = {}
  let totalWeighted = 0
  for (const r of list) {
    const wd = r.demandKw * (r.priorityScore / 100)
    weightedDemands[r.building.id] = wd
    totalWeighted += wd
  }

  const allocations = {}
  for (const r of list) {
    const id = r.building.id
    let alloc = (weightedDemands[id] / totalWeighted) * totalSupply
    alloc = Math.max(alloc, ABSOLUTE_MINIMUM)
    allocations[id] = alloc
  }

  // enforce tier minimums and scale if needed
  enforceMinimums(allocations, records, totalSupply)

  for (const r of list) {
    r.explanationSteps.push(
      `Algorithm: Proportional Fair. Weighted demand share ${((weightedDemands[r.building.id] / totalWeighted) * 100).toFixed(1)}% of pool → ${Math.round(allocations[r.building.id])} kW allocated.`
    )
  }

  return allocations
}

// ─── Stage 7b — Weighted Knapsack (STRESSED) ──────────────────────────────────

function stage7bWeightedKnapsack(records, totalSupply) {
  const list = Object.values(records)

  // ratio = priority / demand, sort descending
  const sorted = [...list].sort(
    (a, b) => b.priorityScore / b.demandKw - a.priorityScore / a.demandKw
  )

  const allocations = {}
  let remaining = totalSupply

  for (const r of sorted) {
    const id = r.building.id
    const give = Math.min(r.demandKw, remaining)
    allocations[id] = give
    remaining = Math.max(0, remaining - give)
  }

  // ensure absolute minimum for all
  for (const r of list) {
    const id = r.building.id
    allocations[id] = Math.max(allocations[id] ?? 0, ABSOLUTE_MINIMUM)
  }

  enforceMinimums(allocations, records, totalSupply)

  for (const r of list) {
    const id = r.building.id
    const ratio = (r.priorityScore / r.demandKw).toFixed(3)
    r.explanationSteps.push(
      `Algorithm: Weighted Knapsack. Efficiency ratio (priority/demand) = ${ratio}. Allocated ${Math.round(allocations[id])} kW from remaining supply.`
    )
  }

  return allocations
}

// ─── Stage 7c — Aumann-Maschler (CRITICAL/CASCADE) ───────────────────────────

/** Constrained Equal Awards: binary search for lambda */
function cea(claims, total) {
  let lo = 0
  let hi = Math.max(...claims.map((c) => c.claim))
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    const sum = claims.reduce((s, c) => s + Math.min(c.claim, mid), 0)
    if (sum < total) lo = mid
    else hi = mid
  }
  const lambda = (lo + hi) / 2
  return claims.map((c) => ({ ...c, alloc: Math.min(c.claim, lambda) }))
}

/** Constrained Equal Losses */
function cel(claims, total) {
  const totalClaim = claims.reduce((s, c) => s + c.claim, 0)
  const loss = totalClaim - total
  let lo = 0
  let hi = Math.max(...claims.map((c) => c.claim))
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2
    const totalLoss = claims.reduce((s, c) => s + Math.min(c.claim, mid), 0)
    if (totalLoss < loss) lo = mid
    else hi = mid
  }
  const lambda = (lo + hi) / 2
  return claims.map((c) => ({
    ...c,
    alloc: Math.max(0, c.claim - Math.min(c.claim, lambda)),
  }))
}

/** Proportional */
function prop(claims, total) {
  const totalClaim = claims.reduce((s, c) => s + c.claim, 0)
  return claims.map((c) => ({
    ...c,
    alloc: totalClaim > 0 ? (c.claim / totalClaim) * total : total / claims.length,
  }))
}

function stage7cAumannMaschler(records, totalSupply, conflictLevel) {
  const list = Object.values(records)
  const claims = list.map((r) => ({ id: r.building.id, claim: r.demandKw, record: r }))

  let chosen
  let methodName

  if (conflictLevel === 'CASCADE') {
    chosen = cea(claims, totalSupply)
    methodName = 'CEA (Constrained Equal Awards)'
  } else {
    // CRITICAL: run all 3, pick best Jain's index
    const ceaResult = cea(claims, totalSupply)
    const celResult = cel(claims, totalSupply)
    const propResult = prop(claims, totalSupply)

    const jCea = jainsIndex(ceaResult.map((c) => c.alloc))
    const jCel = jainsIndex(celResult.map((c) => c.alloc))
    const jProp = jainsIndex(propResult.map((c) => c.alloc))

    if (jCea >= jCel && jCea >= jProp) {
      chosen = ceaResult; methodName = `CEA (Jain's: ${jCea.toFixed(3)})`
    } else if (jCel >= jProp) {
      chosen = celResult; methodName = `CEL (Jain's: ${jCel.toFixed(3)})`
    } else {
      chosen = propResult; methodName = `Proportional (Jain's: ${jProp.toFixed(3)})`
    }
  }

  const allocations = {}
  for (const c of chosen) {
    allocations[c.id] = Math.max(c.alloc, ABSOLUTE_MINIMUM)
  }

  enforceMinimums(allocations, records, totalSupply)

  for (const r of list) {
    const id = r.building.id
    r.explanationSteps.push(
      `Algorithm: Aumann-Maschler ${methodName}. Claim: ${Math.round(r.demandKw)} kW → Allocated: ${Math.round(allocations[id])} kW under ${conflictLevel} conflict.`
    )
  }

  return allocations
}

// ─── Enforce tier floor minimums ─────────────────────────────────────────────

function enforceMinimums(allocations, records, totalSupply) {
  const list = Object.values(records)

  // compute required minimums
  const required = {}
  for (const r of list) {
    const id = r.building.id
    const tierMin = TIER_MIN_ALLOCATION[r.building.tier]
    const minAlloc = Math.max(ABSOLUTE_MINIMUM, r.demandKw * tierMin)
    required[id] = minAlloc
  }

  // check if required exceeds supply — if so, take from Tier 3+4 proportionally
  const totalRequired = Object.values(required).reduce((a, b) => a + b, 0)
  if (totalRequired > totalSupply) {
    // scale down required uniformly
    const scale = totalSupply / totalRequired
    for (const id of Object.keys(required)) {
      required[id] *= scale
    }
  }

  // apply: where current alloc < required, boost and reduce from low-tier pool
  for (const r of list) {
    const id = r.building.id
    if ((allocations[id] ?? 0) < required[id]) {
      const shortfall = required[id] - (allocations[id] ?? 0)
      allocations[id] = required[id]

      // redistribute shortfall from Tier 3+4 that have excess
      const donors = list.filter(
        (d) => d.building.tier >= 3 && d.building.id !== id &&
          allocations[d.building.id] > required[d.building.id]
      )
      let toReduce = shortfall
      for (const donor of donors) {
        if (toReduce <= 0) break
        const dId = donor.building.id
        const excess = allocations[dId] - required[dId]
        const take = Math.min(excess, toReduce)
        allocations[dId] -= take
        toReduce -= take
      }
    }
  }

  // final absolute minimum pass
  for (const r of list) {
    const id = r.building.id
    allocations[id] = Math.max(allocations[id] ?? ABSOLUTE_MINIMUM, ABSOLUTE_MINIMUM)
    if (allocations[id] < required[id]) {
      r.explanationSteps.push(
        `Tier floor enforced: minimum ${Math.round(required[id])} kW for Tier ${r.building.tier} (${(TIER_MIN_ALLOCATION[r.building.tier] * 100).toFixed(0)}% of demand).`
      )
    }
  }
}

// ─── Stage 8 — Metrics ────────────────────────────────────────────────────────

function stage8Metrics(records, allocations, totalSupply, conflictLevel, conflictScore) {
  const list = Object.values(records)

  // satisfaction score per building
  for (const r of list) {
    const id = r.building.id
    const allocated = allocations[id] ?? 0
    const expected = r.building.tier ? TIER_EXPECTATION[r.building.tier] : 0.5
    const sat = clamp(
      Math.round(((allocated / r.demandKw) / expected) * 100),
      0,
      100
    )
    r.satisfactionScore = sat
    r.allocatedKw = Math.round(allocated)

    r.explanationSteps.push(
      `Allocation: ${Math.round(allocated)} kW of ${r.demandKw} kW requested (${((allocated / r.demandKw) * 100).toFixed(0)}% of demand). Satisfaction score: ${sat}/100 vs Tier ${r.building.tier} expectation (${(expected * 100).toFixed(0)}%).`
    )
  }

  const satisfactionValues = list.map((r) => r.satisfactionScore)
  const allocationValues = list.map((r) => r.allocatedKw)

  const jain = jainsIndex(satisfactionValues)
  const gini = giniCoefficient(allocationValues)
  const totalDemand = list.reduce((s, r) => s + r.demandKw, 0)
  const deficitKw = Math.max(0, totalDemand - totalSupply)

  // envy-freeness check
  const envyFree = list.every((r) => {
    // a building envies another if that building got more per priority point
    return list.every((other) => {
      if (other.building.id === r.building.id) return true
      const myRatio = (r.allocatedKw ?? 0) / Math.max(r.priorityScore, 1)
      const theirRatio = (other.allocatedKw ?? 0) / Math.max(other.priorityScore, 1)
      return myRatio >= theirRatio * 0.9 // 10% tolerance
    })
  })

  return {
    conflictIntensityScore: conflictScore,
    conflictLevel,
    jainsIndex: Math.round(jain * 1000) / 1000,
    giniCoefficient: Math.round(gini * 1000) / 1000,
    totalDemand,
    totalSupply,
    deficitKw,
    envyFree,
    resolutionStrategy: ALGORITHM_NAMES[conflictLevel] || 'Unknown',
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {Record<string, object>} buildings  — BUILDINGS config keyed by ID
 * @param {Record<string, object>} submissions — raw user submissions keyed by buildingId
 * @param {Record<string, object>} structured  — LLM-structured results keyed by buildingId
 * @param {Record<string, object>} history     — { [buildingId]: { averageSatisfaction, rounds } }
 * @param {number}                 totalSupply — current supply kW
 * @returns {{ allocations, metrics, buildingLogs }}
 */
export function runAlgorithmPipeline(buildings, submissions, structured, history, totalSupply) {
  // Stage 1
  const records = stage1Normalise(buildings, submissions, structured)

  // Stage 2 — feasibility
  const { totalDemand, deficit, feasible } = stage2Feasibility(records, totalSupply)

  if (feasible) {
    // No conflict — everyone gets their demand
    const allocations = {}
    for (const [id, r] of Object.entries(records)) {
      allocations[id] = {
        allocatedKw: Math.round(r.demandKw),
        requestedKw: Math.round(r.demandKw),
        satisfactionScore: 100,
        explanationSteps: [
          ...r.explanationSteps,
          `No deficit — full demand of ${Math.round(r.demandKw)} kW granted.`,
        ],
        finalRank: 1,
      }
    }
    const metrics = {
      conflictIntensityScore: 0,
      conflictLevel: 'STABLE',
      jainsIndex: 1,
      giniCoefficient: 0,
      totalDemand,
      totalSupply,
      deficitKw: 0,
      envyFree: true,
      resolutionStrategy: 'No conflict — full allocation',
    }
    const buildingLogs = {}
    for (const [id, alloc] of Object.entries(allocations)) {
      buildingLogs[id] = alloc.explanationSteps
    }
    return { allocations, metrics, buildingLogs }
  }

  // Stage 3 — outlier detection
  stage3Outliers(records)

  // Stage 4 — conflict intensity
  const { conflictScore, conflictLevel } = stage4Conflict(records, totalDemand, totalSupply)

  for (const r of Object.values(records)) {
    r.explanationSteps.push(
      `Grid conflict level: ${conflictLevel} (score: ${conflictScore}/100). Deficit: ${Math.round(deficit)} kW.`
    )
  }

  // Stage 5 — priority
  stage5Priority(records, history)

  // Stage 6 — algorithm selection
  for (const r of Object.values(records)) {
    r.explanationSteps.push(
      `Algorithm selected: ${ALGORITHM_NAMES[conflictLevel]} based on ${conflictLevel} conflict level.`
    )
  }

  // Stage 7 — run algorithm
  let rawAllocations
  if (conflictLevel === 'STABLE') {
    rawAllocations = stage7aProportionalFair(records, totalSupply)
  } else if (conflictLevel === 'STRESSED') {
    rawAllocations = stage7bWeightedKnapsack(records, totalSupply)
  } else {
    rawAllocations = stage7cAumannMaschler(records, totalSupply, conflictLevel)
  }

  // Stage 8 — metrics
  const metrics = stage8Metrics(records, rawAllocations, totalSupply, conflictLevel, conflictScore)

  // Build output allocations
  const allocations = {}
  const buildingLogs = {}
  const sortedByPriority = Object.values(records).sort(
    (a, b) => b.priorityScore - a.priorityScore
  )
  sortedByPriority.forEach((r, idx) => {
    const id = r.building.id
    allocations[id] = {
      allocatedKw: r.allocatedKw,
      requestedKw: Math.round(r.demandKw),
      satisfactionScore: r.satisfactionScore,
      explanationSteps: r.explanationSteps,
      finalRank: idx + 1,
    }
    buildingLogs[id] = r.explanationSteps
  })

  return { allocations, metrics, buildingLogs }
}
