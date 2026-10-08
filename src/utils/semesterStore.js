// localStorage persistence for course lists. Plain ESM with .js imports so the
// credit check (scripts/check-sem3.mjs) can drive it in Node with a fake localStorage.
//
// Key layout:
//   Sem 1/2:            sgpa_calc_v2_<sem>_<divide>   (unchanged)
//   Common semesters:   sgpa_calc_v2_<sem>_shared     one list for every student (Sem 3)
//
// Older layouts handled by the migrations at the bottom of this file:
//   sgpa_calc_v2_sem3_<major>         first Sem 3 layout, whole list per major
//   sgpa_calc_v2_sem3_major_<major>   per-major specialization course (1d0510d and earlier)
//   sgpa_major_v1, sgpa_minors_v1     saved major and named-minor settings
import { enrichCourse } from './calculations.js'
import { LS_KEY_PREFIX, LS_SELECTION, LS_MINOR, SEMESTERS, CORE_ADDED_LATER, SEM3_CORE_COURSES, SEM3_MAJOR_COURSE, MINOR_COURSES } from './constants.js'
import { loadMinorOn } from './localStorage.js'
import {
  courseTemplate, isCommonSemester, syncMinorCourses, inferMinorOn, mergeByCode, dedupeByCode,
  filledCount, hasMarks,
} from './semesterTemplates.js'

// Set once the first-layout migration has run (value: ISO time of the first run).
export const LS_MAJOR_SEM_MIGRATED = 'sgpa_major_sem_layout_v2'
// "<sem>:<code>" entries of CORE_ADDED_LATER already appended to saved lists.
export const LS_CORE_ADDED = 'sgpa_core_added_v1'
// Set once Sem 3 has moved to generic major and minor slots (value: ISO time).
export const LS_GENERIC_SLOTS_MIGRATED = 'sgpa_sem3_generic_slots_v3'
export const BACKUP_SUFFIX_V3 = '_premigration_v3'

// Retired settings and codes, read only by the migrations below.
const LEGACY_MAJOR_KEY  = 'sgpa_major_v1'
const LEGACY_MINORS_KEY = 'sgpa_minors_v1'
const LEGACY_MINOR_IDS  = ['crim']
const LEGACY_SEM3_MAJOR_CODES = { aiml: 'CS2227', ds: 'CS2231', cyber: 'CS2405', cloud: 'CS2500' }
const LEGACY_MAJOR_IDS  = Object.keys(LEGACY_SEM3_MAJOR_CODES)
const LEGACY_SEM3_MINOR_CODES = { LW2055: 'MINOR1', LW2032: 'MINOR2' }
const legacyMajorForCode = code => LEGACY_MAJOR_IDS.find(m => LEGACY_SEM3_MAJOR_CODES[m] === code) ?? null
const isCourse = c => c && typeof c === 'object' && typeof c.courseCode === 'string'
const normCode = code => (typeof code === 'string' ? code.trim().toUpperCase() : '')

export function courseKey(semester, divide) {
  return `${LS_KEY_PREFIX}_${semester}_${divide}`
}
export function sharedKey(semester) {
  return `${LS_KEY_PREFIX}_${semester}_shared`
}
// Retired per-major key, kept for the migrations.
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

// Reader for the common semester keys: null when absent, not an array or empty
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
function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

// Courses for a selection, from storage or the template. Read only: nothing is written.
// Common semesters ignore divide; minor courses are flagged by the switch, never dropped.
export function loadSemesterCourses(semester, divide, minorOn = false) {
  if (!isCommonSemester(semester)) {
    return loadCoursesForDivide(semester, divide) ?? makeCoursesFromTemplate(courseTemplate(semester, divide))
  }
  const stored = readCourseList(sharedKey(semester))
  const list = stored ? dedupeByCode(stored) : makeCoursesFromTemplate(courseTemplate(semester, divide, minorOn))
  return syncMinorCourses(list, semester, minorOn, blankCourse)
}

export function saveSemesterCourses(semester, divide, courses) {
  if (!isCommonSemester(semester)) writeList(courseKey(semester, divide), courses)
  else writeList(sharedKey(semester), dedupeByCode(courses))
}

// Reset: Sem 1/2 clear their divide; common semesters clear their one list.
export function clearSemesterCourses(semester, divide) {
  try {
    localStorage.removeItem(isCommonSemester(semester) ? sharedKey(semester) : courseKey(semester, divide))
  } catch {}
}

// Old named-minor setting: a clean array of known ids ([] is an explicit off), or null.
function normalizeLegacyMinors(value) {
  if (!Array.isArray(value)) return null
  const ids = value.map(v => (typeof v === 'string' ? v.trim().toLowerCase() : null))
  return ids.every(v => LEGACY_MINOR_IDS.includes(v)) ? [...new Set(ids)] : null
}

// Minor switch: the stored setting when it is valid, otherwise infer from saved minor
// marks. Until the Sem 3 migration has run, the old setting and codes count as well.
export function resolveMinorOn() {
  const stored = loadMinorOn()
  if (stored !== null) return stored
  const legacy = normalizeLegacyMinors(readJson(LEGACY_MINORS_KEY))
  if (legacy) return legacy.length > 0
  const lists = SEMESTERS.filter(s => s.common).map(s => [s.id, readCourseList(sharedKey(s.id)) ?? []])
  return inferMinorOn(lists) || lists.some(([, cs]) => cs.some(c => LEGACY_SEM3_MINOR_CODES[c.courseCode] && hasMarks(c)))
}

// Common semester selections carry no divide. A saved selection for a semester that is
// not live yet is dropped so the picker shows again. Sem 1/2 pass through.
export function normalizeSelection(sel) {
  if (!sel || typeof sel !== 'object') return null
  if (!isCommonSemester(sel.semester)) return sel
  if (SEMESTERS.find(s => s.id === sel.semester)?.comingSoon) return null
  return { semester: sel.semester }
}

// All storage migrations, in order. App runs this once per load before rendering.
export function migrateStorage() {
  let genericDone = false
  try { genericDone = localStorage.getItem(LS_GENERIC_SLOTS_MIGRATED) !== null } catch {}
  // The per-major layout migration knows the old specialization codes, so it must not
  // run once Sem 3 is generic (it would move a hand-typed CS2231 row out of the list).
  if (!genericDone) migrateMajorSemesterStorage()
  else addLaterCoreCourses()
  migrateGenericSem3Slots()
  repairStaleSem3()
}

// The major the 1d0510d app had on screen: the Sem 3 selection's major, else the saved
// major, else ds.
function resolveLegacyMajor() {
  const sel = readJson(LS_SELECTION)
  const savedMajor = readJson(LEGACY_MAJOR_KEY)?.id
  if (sel && typeof sel === 'object' && isCommonSemester(sel.semester) && LEGACY_MAJOR_IDS.includes(sel.divide)) return sel.divide
  return LEGACY_MAJOR_IDS.includes(savedMajor) ? savedMajor : 'ds'
}

// The stored specialization course of one old major (its own code only), the most
// complete copy, or null.
function legacyMajorCourse(id) {
  const raw = readJson(majorKey('sem3', id))
  return (Array.isArray(raw) ? raw : [])
    .filter(c => isCourse(c) && c.courseCode === LEGACY_SEM3_MAJOR_CODES[id])
    .reduce((best, c) => (best && filledCount(best) >= filledCount(c) ? best : c), null)
}

// Which old per-major course becomes the MAJOR row: the resolved major's course when it
// has marks, otherwise the most complete course of another major (ties go to the first
// in aiml, ds, cyber, cloud order), otherwise the resolved major's course (may be blank or null).
function pickLegacyMajorSource(resolvedId) {
  const own = legacyMajorCourse(resolvedId)
  if (own && hasMarks(own)) return own
  let best = null
  for (const id of LEGACY_MAJOR_IDS) {
    if (id === resolvedId) continue
    const c = legacyMajorCourse(id)
    if (c && hasMarks(c) && (!best || filledCount(c) > filledCount(best))) best = c
  }
  return best ?? own
}

const toMajorRow = src => (src
  ? { ...src, courseCode: SEM3_MAJOR_COURSE.courseCode, courseName: SEM3_MAJOR_COURSE.courseName }
  : blankCourse(SEM3_MAJOR_COURSE))

// Where a missing MAJOR row goes: after EE, else before UE, else after the last core row, else first.
function majorInsertAt(list) {
  const find = code => list.findIndex(c => isCourse(c) && normCode(c.courseCode) === code)
  const ee = find('EE'), ue = find('UE')
  if (ee >= 0) return ee + 1
  if (ue >= 0) return ue
  const core = new Set(SEM3_CORE_COURSES.map(c => c.courseCode))
  let at = 0
  list.forEach((c, i) => { if (isCourse(c) && core.has(normCode(c.courseCode))) at = i + 1 })
  return at
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
// Old layouts only ever existed for Sem 3, the only live semester that had majors.
export function migrateMajorSemesterStorage() {
  try {
    const savedMajor = readJson(LEGACY_MAJOR_KEY)?.id
    for (const sem of SEMESTERS.filter(s => s.id === 'sem3')) {
      const write = (key, list) => localStorage.setItem(key, JSON.stringify(list))
      const legacy = LEGACY_MAJOR_IDS
        .map(id => ({ id, key: courseKey(sem.id, id) }))
        .filter(l => localStorage.getItem(l.key) !== null)
        .map(l => ({ ...l, list: readCourseList(l.key) }))
        // the last saved major goes last, so it wins ties between old lists
        .sort((a, b) => (a.id === savedMajor) - (b.id === savedMajor))

      // Live lists, plus anything stored under the wrong key in them.
      const live = { shared: readCourseList(sharedKey(sem.id)) }
      for (const id of LEGACY_MAJOR_IDS) live[id] = readCourseList(majorKey(sem.id, id))
      const target = c => legacyMajorForCode(c.courseCode) ?? 'shared'
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
        if (LEGACY_MAJOR_IDS.some(id => localStorage.getItem(courseKey(sem, id)) !== null)) continue
        const key = sharedKey(sem)
        let stored = null
        try { stored = JSON.parse(localStorage.getItem(key)) } catch { stored = null }
        const norm = code => (typeof code === 'string' ? code.trim().toUpperCase() : '')
        const isCourse = c => c && typeof c === 'object' && typeof c.courseCode === 'string'
        // only extend a list with at least one valid course; a junk list falls back to the template, which has it
        if (Array.isArray(stored) && stored.some(isCourse) && !stored.some(c => isCourse(c) && norm(c.courseCode) === norm(add.courseCode))) {
          const coreCodes = new Set(courseTemplate(sem).map(c => c.courseCode))
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

// Sem 3 moves to generic slots: the named minor rows become MINOR1 / MINOR2 and the
// selected major's specialization course becomes one MAJOR row in the shared list.
// Runs once (LS_GENERIC_SLOTS_MIGRATED), after the layout migration above:
// - minor rows (LW2055, LW2032) are renamed in place: id, marks, credits and the
//   inactive flag stay as stored, only code and name change;
// - the MAJOR row takes the marks of the major the app had selected (the Sem 3
//   selection's major, else the saved major, else ds); when that course is blank or
//   missing, the most complete other major's course is used. It goes after EE (before UE);
//   a list that already has a MAJOR row keeps it and gets no second one;
// - the old minors setting becomes the new on/off switch (['crim'] is on, [] is off);
// - every key that is changed or removed is first copied to <key>_premigration_v3
//   (an existing backup is never overwritten), then new values are written, then the
//   retired per-major keys and settings are removed, and only then is the flag set.
//   Any failed write aborts the run without the flag, so the next load retries;
// - custom rows, a deleted University Elective and every other row are left as stored;
//   a junk saved list is left alone (the loader falls back to the template).
export function migrateGenericSem3Slots() {
  try {
    if (localStorage.getItem(LS_GENERIC_SLOTS_MIGRATED) !== null) return
    // the first-layout migration has not finished (e.g. storage full): retry next load
    if (LEGACY_MAJOR_IDS.some(id => localStorage.getItem(courseKey('sem3', id)) !== null)) return

    const norm = normCode
    const sKey = sharedKey('sem3')
    const rawShared = readJson(sKey)
    const shared = Array.isArray(rawShared) && rawShared.some(isCourse) ? rawShared : null

    // The major the app had on screen (or another major's marks when that one is blank).
    const majorSource = pickLegacyMajorSource(resolveLegacyMajor())
    const majorRow = toMajorRow(majorSource)

    let next = null
    if (shared) {
      // rename the old minor rows in place
      const minorTpl = code => MINOR_COURSES.sem3.find(m => m.courseCode === code)
      let list = shared.map(c => {
        const to = isCourse(c) ? LEGACY_SEM3_MINOR_CODES[c.courseCode] : null
        return to ? { ...c, courseCode: to, courseName: minorTpl(to).courseName } : c
      })
      // a MINOR row typed by hand next to the old one: keep one row (the more complete copy)
      for (const m of MINOR_COURSES.sem3) {
        const idx = list.map((c, i) => (isCourse(c) && c.courseCode === m.courseCode ? i : -1)).filter(i => i >= 0)
        if (idx.length < 2) continue
        const [one] = dedupeByCode(idx.map(i => list[i]))
        list = list.map((c, i) => (i === idx[0] ? one : c)).filter((_, i) => !idx.slice(1).includes(i))
      }
      // insert the MAJOR row unless the list already has one
      if (!list.some(c => isCourse(c) && norm(c.courseCode) === SEM3_MAJOR_COURSE.courseCode)) {
        const at = majorInsertAt(list)
        list = [...list.slice(0, at), majorRow, ...list.slice(at)]
      }
      if (JSON.stringify(list) !== JSON.stringify(shared)) next = list
    } else if (majorSource && hasMarks(majorSource)) {
      // no usable saved list but marks on the major course: start from the template
      next = courseTemplate('sem3').map(c => (c.courseCode === SEM3_MAJOR_COURSE.courseCode ? majorRow : blankCourse(c)))
    }

    const sets = [], removes = []
    if (next) sets.push([sKey, JSON.stringify(next)])
    if (localStorage.getItem(LS_MINOR) === null) {
      const legacy = normalizeLegacyMinors(readJson(LEGACY_MINORS_KEY))
      if (legacy) sets.push([LS_MINOR, JSON.stringify(legacy.length > 0)])
    }
    for (const id of LEGACY_MAJOR_IDS) removes.push(majorKey('sem3', id))
    removes.push(LEGACY_MAJOR_KEY, LEGACY_MINORS_KEY)

    // backups first, then writes, then removals, then the flag
    for (const key of [...sets.map(([k]) => k), ...removes]) {
      const cur = localStorage.getItem(key)
      const bk = `${key}${BACKUP_SUFFIX_V3}`
      if (cur !== null && localStorage.getItem(bk) === null) localStorage.setItem(bk, cur)
    }
    for (const [key, value] of sets) localStorage.setItem(key, value)
    for (const key of removes) localStorage.removeItem(key)
    localStorage.setItem(LS_GENERIC_SLOTS_MIGRATED, new Date().toISOString())
  } catch {}
}

// Repair after a tab still running the old version saved over migrated data. Runs on
// every load once the migration flag is set; does nothing when there is nothing old:
// - LW2055 / LW2032 rows in the Sem 3 list become MINOR1 / MINOR2 again. When a MINOR
//   row already exists: a blank one takes the old row's marks (one row, no duplicate);
//   if the old row is blank it is dropped; if both have marks the generic row is kept
//   and the old row is left as it is, so no mark is lost;
// - a reappeared per-major key fills the MAJOR row (inserted when missing, marks filled
//   when blank; same choice of course as the migration), then is removed;
// - a reappeared old minors setting updates the minor switch, a reappeared saved major
//   is only used to pick the course; both are removed;
// - every key changed or removed is first copied to <key>_stale_<time> (a new key each
//   time, never overwritten). A failed write aborts before anything is removed, and
//   the next load tries again. Hand-typed rows with old major codes stay untouched.
export function repairStaleSem3() {
  try {
    if (localStorage.getItem(LS_GENERIC_SLOTS_MIGRATED) === null) return
    const sKey = sharedKey('sem3')
    const presentMajorIds = LEGACY_MAJOR_IDS.filter(id => localStorage.getItem(majorKey('sem3', id)) !== null)
    const rawShared = readJson(sKey)
    const shared = Array.isArray(rawShared) && rawShared.some(isCourse) ? rawShared : null
    const hasOldMinor = shared?.some(c => isCourse(c) && LEGACY_SEM3_MINOR_CODES[c.courseCode])
    const oldMinors = localStorage.getItem(LEGACY_MINORS_KEY) !== null
    const oldMajor = localStorage.getItem(LEGACY_MAJOR_KEY) !== null
    if (!hasOldMinor && !presentMajorIds.length && !oldMinors && !oldMajor) return

    let list = shared ? shared.slice() : null
    if (list && hasOldMinor) {
      for (const [from, to] of Object.entries(LEGACY_SEM3_MINOR_CODES)) {
        const name = MINOR_COURSES.sem3.find(m => m.courseCode === to).courseName
        for (let i = 0; i < list.length; i++) {
          const c = list[i]
          if (!isCourse(c) || c.courseCode !== from) continue
          const g = list.findIndex(x => isCourse(x) && normCode(x.courseCode) === to)
          const renamed = { ...c, courseCode: to, courseName: name }
          if (g < 0) list[i] = renamed
          else if (!hasMarks(list[g])) { list[g] = { ...renamed, id: list[g].id ?? renamed.id }; list.splice(i, 1); i-- }
          else if (!hasMarks(c)) { list.splice(i, 1); i-- }
          // both have marks: keep the generic row, leave the old row as it is
        }
      }
    }

    if (presentMajorIds.length) {
      const src = pickLegacyMajorSource(resolveLegacyMajor())
      if (list) {
        const m = list.findIndex(c => isCourse(c) && normCode(c.courseCode) === SEM3_MAJOR_COURSE.courseCode)
        if (m < 0) {
          const at = majorInsertAt(list)
          list = [...list.slice(0, at), toMajorRow(src), ...list.slice(at)]
        } else if (!hasMarks(list[m]) && src && hasMarks(src)) {
          const filled = { ...list[m] }
          for (const k of ['cie1Marks', 'cie2Marks', 'cie3Marks', 'seeMarks', 'directGrade', 'totalMarks', 'grade', 'gradePoint', 'creditGradeProduct']) {
            if (src[k] !== undefined) filled[k] = src[k]
          }
          list[m] = enrichCourse(filled)
        }
      } else if (src && hasMarks(src)) {
        list = courseTemplate('sem3').map(c => (c.courseCode === SEM3_MAJOR_COURSE.courseCode ? toMajorRow(src) : blankCourse(c)))
      }
    }

    const sets = [], removes = []
    if (list && JSON.stringify(list) !== JSON.stringify(rawShared)) sets.push([sKey, JSON.stringify(list)])
    if (oldMinors) {
      const legacy = normalizeLegacyMinors(readJson(LEGACY_MINORS_KEY))
      if (legacy) sets.push([LS_MINOR, JSON.stringify(legacy.length > 0)])
      removes.push(LEGACY_MINORS_KEY)
    }
    for (const id of presentMajorIds) removes.push(majorKey('sem3', id))
    if (oldMajor) removes.push(LEGACY_MAJOR_KEY)

    const stamp = new Date().toISOString()
    for (const key of [...sets.map(([k]) => k), ...removes]) {
      const cur = localStorage.getItem(key)
      if (cur === null) continue
      let bk = `${key}_stale_${stamp}`
      for (let n = 2; localStorage.getItem(bk) !== null; n++) bk = `${key}_stale_${stamp}_${n}`
      localStorage.setItem(bk, cur)
    }
    for (const [key, value] of sets) localStorage.setItem(key, value)
    for (const key of removes) localStorage.removeItem(key)
  } catch {}
}

// Old exports (CSV) may carry retired Sem 3 codes: map them to the generic rows on import.
export function mapRetiredSem3Codes(courses) {
  return courses.map(c => {
    const minor = LEGACY_SEM3_MINOR_CODES[normCode(c?.courseCode)]
    if (minor) return { ...c, courseCode: minor, courseName: MINOR_COURSES.sem3.find(m => m.courseCode === minor).courseName, credits: c.credits ?? 3 }
    if (legacyMajorForCode(normCode(c?.courseCode))) return { ...c, courseCode: SEM3_MAJOR_COURSE.courseCode, courseName: SEM3_MAJOR_COURSE.courseName, credits: c.credits ?? SEM3_MAJOR_COURSE.credits }
    return c
  })
}

export function loadSelection() {
  try { return JSON.parse(localStorage.getItem(LS_SELECTION)) } catch { return null }
}
export function saveSelection(sel) {
  try { localStorage.setItem(LS_SELECTION, JSON.stringify(sel)) } catch {}
}
