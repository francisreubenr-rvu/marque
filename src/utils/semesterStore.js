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
//   selection's major, else the saved major, else ds) and goes after EE (before UE);
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

    const isCourse = c => c && typeof c === 'object' && typeof c.courseCode === 'string'
    const norm = code => (typeof code === 'string' ? code.trim().toUpperCase() : '')
    const sKey = sharedKey('sem3')
    const rawShared = readJson(sKey)
    const shared = Array.isArray(rawShared) && rawShared.some(isCourse) ? rawShared : null

    // The major the app had on screen, resolved the way 1d0510d did.
    const sel = readJson(LS_SELECTION)
    const savedMajor = readJson(LEGACY_MAJOR_KEY)?.id
    const majorId = sel && typeof sel === 'object' && isCommonSemester(sel.semester) && LEGACY_MAJOR_IDS.includes(sel.divide)
      ? sel.divide
      : LEGACY_MAJOR_IDS.includes(savedMajor) ? savedMajor : 'ds'
    const rawMajor = readJson(majorKey('sem3', majorId))
    const majorCopies = (Array.isArray(rawMajor) ? rawMajor : [])
      .filter(c => isCourse(c) && c.courseCode === LEGACY_SEM3_MAJOR_CODES[majorId])
    const majorSource = majorCopies.reduce((best, c) => (best && filledCount(best) >= filledCount(c) ? best : c), null)
    const majorRow = majorSource
      ? { ...majorSource, courseCode: SEM3_MAJOR_COURSE.courseCode, courseName: SEM3_MAJOR_COURSE.courseName }
      : blankCourse(SEM3_MAJOR_COURSE)

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
        const find = code => list.findIndex(c => isCourse(c) && norm(c.courseCode) === code)
        const ee = find('EE'), ue = find('UE')
        let at = ee >= 0 ? ee + 1 : ue
        if (at < 0) {
          const core = new Set(SEM3_CORE_COURSES.map(c => c.courseCode))
          at = 0
          list.forEach((c, i) => { if (isCourse(c) && core.has(norm(c.courseCode))) at = i + 1 })
        }
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

export function loadSelection() {
  try { return JSON.parse(localStorage.getItem(LS_SELECTION)) } catch { return null }
}
export function saveSelection(sel) {
  try { localStorage.setItem(LS_SELECTION, JSON.stringify(sel)) } catch {}
}
