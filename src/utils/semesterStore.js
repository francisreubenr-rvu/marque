// localStorage persistence for course lists. Plain ESM with .js imports so the
// credit check (scripts/check-sem3.mjs) can drive it in Node with a fake localStorage.
//
// Key layout:
//   Sem 1/2:          sgpa_calc_v2_<sem>_<divide>         (unchanged)
//   Major semesters:  sgpa_calc_v2_<sem>_shared           core, minor and custom courses, one copy for every major
//                     sgpa_calc_v2_<sem>_major_<majorId>  that major's specialization course(s)
import { enrichCourse } from './calculations.js'
import { LS_KEY_PREFIX, LS_SELECTION, MAJORS, SEMESTERS, CORE_ADDED_LATER } from './constants.js'
import { loadMajor, loadMinors } from './localStorage.js'
import {
  courseTemplate, isMajorSemester, isMajorId, splitMajorCourses, mergeMajorCourses,
  syncMinorCourses, inferMinors, majorIdForCode, mergeByCode, dedupeByCode,
} from './semesterTemplates.js'

// Set once the first-layout migration has run (value: ISO time of the first run).
export const LS_MAJOR_SEM_MIGRATED = 'sgpa_major_sem_layout_v2'
// "<sem>:<code>" entries of CORE_ADDED_LATER already appended to saved lists.
export const LS_CORE_ADDED = 'sgpa_core_added_v1'

export function courseKey(semester, divide) {
  return `${LS_KEY_PREFIX}_${semester}_${divide}`
}
export function sharedKey(semester) {
  return `${LS_KEY_PREFIX}_${semester}_shared`
}
export function majorKey(semester, majorId) {
  return `${LS_KEY_PREFIX}_${semester}_major_${majorId}`
}

export function blankCourse(c) {
  return enrichCourse({
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...c,
    cie1Marks: null, cie2Marks: null, cie3Marks: null, seeMarks: null,
    totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
  })
}
export function makeCoursesFromTemplate(template) {
  return template.map(blankCourse)
}

// Sem 1/2 reader, same behaviour as before this change.
export function loadCoursesForDivide(semester, divide) {
  try {
    const raw = localStorage.getItem(courseKey(semester, divide))
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed.map(c => enrichCourse(c))
  } catch {}
  return null
}

// Reader for the major semester keys: null when absent, not an array or empty
// (same fallback to the template as Sem 1/2), otherwise the valid entries only.
function readCourseList(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const valid = parsed.filter(c => c && typeof c === 'object' && typeof c.courseCode === 'string')
    return valid.length ? valid.map(c => enrichCourse(c)) : null
  } catch { return null }
}
function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch {}
}

// Courses for a selection, from storage or the template. Read only: nothing is written.
// For major semesters divide is the major id on screen; minor courses are flagged, never dropped.
export function loadSemesterCourses(semester, divide, minorIds = []) {
  if (!isMajorSemester(semester)) {
    return loadCoursesForDivide(semester, divide) ?? makeCoursesFromTemplate(courseTemplate(semester, divide))
  }
  const tpl = splitMajorCourses(courseTemplate(semester, divide, minorIds), semester)
  // Only shared codes come from the shared list and only this major's code from its key.
  const own = (list, owner) => list?.filter(c => majorIdForCode(semester, c.courseCode) === owner) ?? null
  const sharedStored = own(readCourseList(sharedKey(semester)), null)
  const majorStored  = own(readCourseList(majorKey(semester, divide)), divide)
  const shared = sharedStored?.length ? sharedStored : makeCoursesFromTemplate(tpl.shared)
  const major  = majorStored?.length  ? majorStored  : makeCoursesFromTemplate(tpl.byMajor[divide] ?? [])
  return syncMinorCourses(mergeMajorCourses(dedupeByCode(shared), major), semester, minorIds, blankCourse)
}

export function saveSemesterCourses(semester, divide, courses) {
  if (!isMajorSemester(semester)) {
    writeList(courseKey(semester, divide), courses)
    return
  }
  if (!isMajorId(divide)) return // never write under an unknown major
  const { shared, byMajor } = splitMajorCourses(courses, semester)
  writeList(sharedKey(semester), dedupeByCode(shared))
  writeList(majorKey(semester, divide), dedupeByCode(byMajor[divide] ?? []))
  // Another major's course that reached this list is merged into that major's own key.
  for (const [m, list] of Object.entries(byMajor)) {
    if (m !== divide) writeList(majorKey(semester, m), mergeByCode(readCourseList(majorKey(semester, m)) ?? [], list, false))
  }
}

// Store courses that belong to another major (typed or imported on this screen) under
// that major's key, keeping whichever copy has more assessments filled.
export function routeForeignMajorCourses(semester, divide, courses) {
  if (!isMajorSemester(semester)) return { kept: courses, routed: [] }
  const kept = [], routed = []
  for (const c of courses) {
    const owner = majorIdForCode(semester, c.courseCode)
    if (owner && owner !== divide) {
      writeList(majorKey(semester, owner), mergeByCode(readCourseList(majorKey(semester, owner)) ?? [], [c], false))
      routed.push({ course: c, majorId: owner })
    } else kept.push(c)
  }
  return { kept, routed }
}

// Reset: Sem 1/2 clear their divide; major semesters clear the shared list and this major's course.
export function clearSemesterCourses(semester, divide) {
  try {
    if (!isMajorSemester(semester)) { localStorage.removeItem(courseKey(semester, divide)); return }
    localStorage.removeItem(sharedKey(semester))
    if (isMajorId(divide)) localStorage.removeItem(majorKey(semester, divide))
  } catch {}
}

// Minor choice: the stored setting when it is valid, otherwise infer from saved minor marks.
export function resolveMinors() {
  const stored = loadMinors()
  if (stored) return stored
  return inferMinors(SEMESTERS.filter(s => s.majorSem).map(s => [s.id, readCourseList(sharedKey(s.id)) ?? []]))
}

// A major semester selection always names a known major; otherwise fall back to the
// saved major, or drop the selection so the picker shows again. Sem 1/2 pass through.
export function normalizeSelection(sel, savedMajorId) {
  if (!sel || typeof sel !== 'object') return null
  if (!isMajorSemester(sel.semester)) return sel
  if (isMajorId(sel.divide)) return sel
  return isMajorId(savedMajorId) ? { ...sel, divide: savedMajorId } : null
}

// Move from the first sem3-unlock layout (whole list per major under
// sgpa_calc_v2_sem3_<major>) to shared + per-major keys, and keep every course under
// the key that owns it. Safe to run on every load:
// - lists are merged course by course (more assessments filled wins; between old lists
//   the last saved major wins a tie, against live data the live copy wins a tie);
// - an old key that shows up again later (a stale tab) is merged the same way;
// - <key>_premigration backups are written only once and never overwritten;
// - unreadable old keys are backed up and removed too;
// - new keys are written with setItem directly, so a failed write (quota) aborts the
//   run before any old key is removed, and the next load retries;
// - afterwards core courses added later (the University Elective) are appended once.
export function migrateMajorSemesterStorage() {
  try {
    const savedMajor = loadMajor()?.id
    for (const sem of SEMESTERS.filter(s => s.majorSem)) {
      const write = (key, list) => localStorage.setItem(key, JSON.stringify(list))
      const legacy = MAJORS
        .map(m => ({ id: m.id, key: courseKey(sem.id, m.id) }))
        .filter(l => localStorage.getItem(l.key) !== null)
        .map(l => ({ ...l, list: readCourseList(l.key) }))
        // the last saved major goes last, so it wins ties between old lists
        .sort((a, b) => (a.id === savedMajor) - (b.id === savedMajor))

      // Live lists, plus anything stored under the wrong key in them.
      const live = { shared: readCourseList(sharedKey(sem.id)) }
      for (const m of MAJORS) live[m.id] = readCourseList(majorKey(sem.id, m.id))
      const target = c => majorIdForCode(sem.id, c.courseCode) ?? 'shared'
      const next = {}, dirty = new Set()
      for (const [k, list] of Object.entries(live)) {
        if (!list) continue
        next[k] = list.filter(c => target(c) === k)
        if (next[k].length !== list.length) dirty.add(k)
      }
      for (const [k, list] of Object.entries(live)) {
        for (const c of (list ?? []).filter(c => target(c) !== k)) {
          const t = target(c)
          next[t] = mergeByCode(next[t] ?? [], [c], false)
          dirty.add(t)
        }
      }

      // Old lists: combine them (last saved major wins ties), then merge into live data (live wins ties).
      let combined = {}
      for (const l of legacy.filter(l => l.list)) {
        for (const c of l.list) combined[target(c)] = mergeByCode(combined[target(c)] ?? [], [c], true)
      }
      for (const [k, list] of Object.entries(combined)) {
        next[k] = mergeByCode(next[k] ?? [], list, false)
        dirty.add(k)
      }

      for (const k of dirty) write(k === 'shared' ? sharedKey(sem.id) : majorKey(sem.id, k), next[k])
      for (const l of legacy) {
        const bk = `${l.key}_premigration`
        if (localStorage.getItem(bk) === null) localStorage.setItem(bk, localStorage.getItem(l.key))
        localStorage.removeItem(l.key)
      }
    }
    if (localStorage.getItem(LS_MAJOR_SEM_MIGRATED) === null) localStorage.setItem(LS_MAJOR_SEM_MIGRATED, new Date().toISOString())
  } catch {}
  addLaterCoreCourses()
}

// Append core courses introduced after a semester went live (CORE_ADDED_LATER) to a
// saved shared list that lacks them: blank marks, placed after the last core course,
// every existing row left exactly as stored. Each addition is applied once, so a row
// the user deletes stays deleted. Without a saved list the template already has it.
export function addLaterCoreCourses() {
  try {
    let done
    try { done = JSON.parse(localStorage.getItem(LS_CORE_ADDED)) } catch { done = null }
    if (!Array.isArray(done)) done = []
    let changed = false
    for (const [sem, additions] of Object.entries(CORE_ADDED_LATER)) {
      for (const add of additions) {
        const tag = `${sem}:${add.courseCode}`
        if (done.includes(tag)) continue
        // old per-major lists still present (migration failed, e.g. storage full): retry next load
        if (MAJORS.some(m => localStorage.getItem(courseKey(sem, m.id)) !== null)) continue
        const key = sharedKey(sem)
        let stored = null
        try { stored = JSON.parse(localStorage.getItem(key)) } catch { stored = null }
        const norm = code => (typeof code === 'string' ? code.trim().toUpperCase() : '')
        const isCourse = c => c && typeof c === 'object' && typeof c.courseCode === 'string'
        // only extend a list with at least one valid course; a junk list falls back to the template, which has it
        if (Array.isArray(stored) && stored.some(isCourse) && !stored.some(c => isCourse(c) && norm(c.courseCode) === norm(add.courseCode))) {
          const coreCodes = new Set(courseTemplate(sem, MAJORS[0].id, []).map(c => c.courseCode))
          let at = stored.length
          for (let i = stored.length - 1; i >= 0; i--) if (coreCodes.has(stored[i]?.courseCode)) { at = i + 1; break }
          // setItem directly: if the write fails the tag is not recorded and the next load retries
          localStorage.setItem(key, JSON.stringify([...stored.slice(0, at), blankCourse(add), ...stored.slice(at)]))
        }
        done.push(tag)
        changed = true
      }
    }
    if (changed) localStorage.setItem(LS_CORE_ADDED, JSON.stringify(done))
  } catch {}
}

export function loadSelection() {
  try { return JSON.parse(localStorage.getItem(LS_SELECTION)) } catch { return null }
}
export function saveSelection(sel) {
  try { localStorage.setItem(LS_SELECTION, JSON.stringify(sel)) } catch {}
}
