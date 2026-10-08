import { LS_KEY, LS_MINOR } from './constants.js'
import { normalizeMinorSetting } from './semesterTemplates.js'

export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveState(courses) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(courses))
  } catch {
    // storage full or unavailable
  }
}

export function clearState() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {}
}

// Minor switch (true/false). Returns null when the setting is missing or malformed
// (see resolveMinorOn for the fallback).
export function loadMinorOn() {
  try { return normalizeMinorSetting(JSON.parse(localStorage.getItem(LS_MINOR))) } catch { return null }
}

export function saveMinorOn(on) {
  try { localStorage.setItem(LS_MINOR, JSON.stringify(!!on)) } catch {}
}
