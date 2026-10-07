// localStorage persistence for course lists. Plain ESM with .js imports so the
// credit check (scripts/check-sem3.mjs) can drive it in Node with a fake localStorage.
//
// Key layout:
//   Sem 1/2:          sgpa_calc_v2_<sem>_<divide>         (unchanged)
//   Major semesters:  sgpa_calc_v2_<sem>_shared           core, minor and custom courses, one copy for every major
//                     sgpa_calc_v2_<sem>_major_<majorId>  that major's specialization course(s)
import { enrichCourse } from './calculations.js'
import { LS_KEY_PREFIX, LS_SELECTION, MAJORS, SEMESTERS } from './constants.js'
import { loadMinors } from './localStorage.js'
import {
  courseTemplate, isMajorSemester, isMajorId, splitMajorCourses, mergeMajorCourses,
  syncMinorCourses, inferMinors, hasMarks,
} from './semesterTemplates.js'

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
  const tpl    = splitMajorCourses(courseTemplate(semester, divide, minorIds), semester, divide)
  const shared = readCourseList(sharedKey(semester)) ?? makeCoursesFromTemplate(tpl.shared)
  const major  = readCourseList(majorKey(semester, divide)) ?? makeCoursesFromTemplate(tpl.major)
  return syncMinorCourses(mergeMajorCourses(shared, major), semester, minorIds, blankCourse)
}

export function saveSemesterCourses(semester, divide, courses) {
  if (!isMajorSemester(semester)) {
    writeList(courseKey(semester, divide), courses)
    return
  }
  if (!isMajorId(divide)) return // never write under an unknown major
  const { shared, major } = splitMajorCourses(courses, semester, divide)
  writeList(sharedKey(semester), shared)
  writeList(majorKey(semester, divide), major)
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

// One-time move from the first sem3-unlock layout (whole list per major under
// sgpa_calc_v2_sem3_<major>) to shared + per-major keys. Nothing is deleted: each
// old key is copied to <key>_premigration before it is removed, and an existing
// new key is never overwritten. Core marks are taken from the most complete list.
export function migrateMajorSemesterStorage() {
  try {
    for (const sem of SEMESTERS.filter(s => s.majorSem)) {
      const legacy = MAJORS
        .map(m => ({ id: m.id, key: courseKey(sem.id, m.id), list: readCourseList(courseKey(sem.id, m.id)) }))
        .filter(l => l.list)
      if (!legacy.length) continue
      const parts = legacy.map(l => ({ ...l, ...splitMajorCourses(l.list, sem.id, l.id) }))
      for (const p of parts) {
        if (localStorage.getItem(majorKey(sem.id, p.id)) === null) writeList(majorKey(sem.id, p.id), p.major)
      }
      if (localStorage.getItem(sharedKey(sem.id)) === null) {
        const score = list => list.filter(hasMarks).length
        const [base, ...others] = [...parts].sort((a, b) => score(b.shared) - score(a.shared))
        const merged = [...base.shared]
        for (const o of others) {
          for (const c of o.shared) {
            const i = merged.findIndex(x => x.courseCode === c.courseCode)
            if (i < 0) merged.push(c)
            else if (!hasMarks(merged[i]) && hasMarks(c)) merged[i] = c
          }
        }
        writeList(sharedKey(sem.id), merged)
      }
      for (const l of legacy) {
        localStorage.setItem(`${l.key}_premigration`, localStorage.getItem(l.key))
        localStorage.removeItem(l.key)
      }
    }
  } catch {}
}

export function loadSelection() {
  try { return JSON.parse(localStorage.getItem(LS_SELECTION)) } catch { return null }
}
export function saveSelection(sel) {
  try { localStorage.setItem(LS_SELECTION, JSON.stringify(sel)) } catch {}
}
