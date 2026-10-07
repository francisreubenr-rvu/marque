import { LS_KEY, LS_MAJOR, LS_MINORS, MINORS } from './constants'

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
export function loadMinors() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_MINORS))
    return Array.isArray(v) ? v.filter(id => MINORS.some(m => m.id === id)) : []
  } catch { return [] }
}

export function saveMinors(ids) {
  try { localStorage.setItem(LS_MINORS, JSON.stringify(ids)) } catch {}
}
