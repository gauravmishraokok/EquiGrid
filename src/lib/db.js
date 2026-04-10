import { db } from '../config/firebase.js'
import {
  ref,
  set,
  get,
  onValue,
  push,
  update,
  remove,
} from 'firebase/database'
import { BUILDINGS } from '../config/buildings.js'
import { TOTAL_SUPPLY_DEFAULT } from '../config/constants.js'

const ROOT = 'equigrid'

// ─── Session ──────────────────────────────────────────────────────────────────

export async function getSession() {
  const snap = await get(ref(db, `${ROOT}/session`))
  return snap.val()
}

export async function setSession(data) {
  await set(ref(db, `${ROOT}/session`), data)
}

export function listenSession(cb) {
  return onValue(ref(db, `${ROOT}/session`), (snap) => cb(snap.val()))
}

// ─── Buildings ────────────────────────────────────────────────────────────────

export async function getBuildings() {
  const snap = await get(ref(db, `${ROOT}/buildings`))
  return snap.val()
}

export function listenBuildings(cb) {
  return onValue(ref(db, `${ROOT}/buildings`), (snap) => cb(snap.val() || {}))
}

export async function assignParticipant(buildingId, participantId) {
  await update(ref(db, `${ROOT}/buildings/${buildingId}`), {
    participantId,
    occupiedAt: Date.now(),
  })
}

export async function releaseBuilding(buildingId) {
  await update(ref(db, `${ROOT}/buildings/${buildingId}`), {
    participantId: null,
    occupiedAt: null,
  })
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function submitDemand(round, buildingId, data) {
  await set(ref(db, `${ROOT}/rounds/${round}/submissions/${buildingId}`), {
    ...data,
    submittedAt: Date.now(),
  })
}

export function listenSubmissions(round, cb) {
  return onValue(ref(db, `${ROOT}/rounds/${round}/submissions`), (snap) =>
    cb(snap.val() || {})
  )
}

// ─── Structured (LLM output) ──────────────────────────────────────────────────

export async function writeStructured(round, buildingId, data) {
  await set(ref(db, `${ROOT}/rounds/${round}/structured/${buildingId}`), data)
}

export function listenStructured(round, cb) {
  return onValue(ref(db, `${ROOT}/rounds/${round}/structured`), (snap) =>
    cb(snap.val() || {})
  )
}

// ─── Allocations ──────────────────────────────────────────────────────────────

export async function writeAllocations(round, allocations) {
  await set(ref(db, `${ROOT}/rounds/${round}/allocations`), allocations)
}

export function listenAllocations(round, cb) {
  return onValue(ref(db, `${ROOT}/rounds/${round}/allocations`), (snap) =>
    cb(snap.val() || null)
  )
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function writeMetrics(round, metrics) {
  await set(ref(db, `${ROOT}/rounds/${round}/metrics`), metrics)
}

export function listenMetrics(round, cb) {
  return onValue(ref(db, `${ROOT}/rounds/${round}/metrics`), (snap) =>
    cb(snap.val() || null)
  )
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function updateHistory(buildingId, satisfactionScore) {
  const snap = await get(ref(db, `${ROOT}/history/${buildingId}`))
  const existing = snap.val() || { scores: [], rounds: 0, averageSatisfaction: 0 }

  const scores = [...(existing.scores || []), satisfactionScore]
  const rounds = scores.length
  const averageSatisfaction = scores.reduce((a, b) => a + b, 0) / rounds

  await set(ref(db, `${ROOT}/history/${buildingId}`), {
    scores,
    rounds,
    averageSatisfaction: Math.round(averageSatisfaction * 10) / 10,
  })
}

export async function getHistory(buildingId) {
  const snap = await get(ref(db, `${ROOT}/history/${buildingId}`))
  return snap.val() || { scores: [], rounds: 0, averageSatisfaction: 0 }
}

export function listenHistory(cb) {
  return onValue(ref(db, `${ROOT}/history`), (snap) => cb(snap.val() || {}))
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initSession() {
  // Only set session if not already set
  const existing = await getSession()
  if (!existing) {
    await set(ref(db, `${ROOT}/session`), {
      round: 1,
      totalSupply: TOTAL_SUPPLY_DEFAULT,
      gridShockActive: false,
      status: 'waiting',
      startedAt: Date.now(),
    })
  }

  // Init buildings (always reset participant assignments but keep structure)
  const buildingsData = {}
  for (const [id, b] of Object.entries(BUILDINGS)) {
    buildingsData[id] = {
      ...b,
      participantId: null,
      occupiedAt: null,
    }
  }
  await set(ref(db, `${ROOT}/buildings`), buildingsData)
}

export async function nextRound(currentRound) {
  const nextR = currentRound + 1
  await update(ref(db, `${ROOT}/session`), {
    round: nextR,
    gridShockActive: false,
    totalSupply: TOTAL_SUPPLY_DEFAULT,
  })
  return nextR
}
