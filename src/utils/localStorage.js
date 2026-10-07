import { LS_KEY, LS_MAJOR, LS_MINORS } from './constants.js'
import { normalizeMinors } from './semesterTemplates.js'

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

export function loadMajor() {
  try { return JSON.parse(localStorage.getItem(LS_MAJOR)) } catch { return null }
}

export function saveMajor(major) {
  try { localStorage.setItem(LS_MAJOR, JSON.stringify(major)) } catch {}
}

// Selected minor ids, e.g. ['crim']. Stored like the major so it survives reloads.
// Returns null when the setting is missing or malformed (see resolveMinors for the fallback).
export function loadMinors() {
  try { return normalizeMinors(JSON.parse(localStorage.getItem(LS_MINORS))) } catch { return null }
}

export function saveMinors(ids) {
  try { localStorage.setItem(LS_MINORS, JSON.stringify(ids)) } catch {}
}
