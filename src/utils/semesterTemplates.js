// Pure helpers that decide which course template a semester starts with.
// No React, no localStorage, so they can also run in plain Node (see scripts/check-sem3.mjs).
// Imports carry the .js extension for that reason; Vite resolves them the same way.
import { SEMESTERS, DIVIDES, SEM3_CORE_COURSES, MINOR_COURSES, EEX_COURSES } from './constants.js'
import { enrichCourse } from './calculations.js'

// Year 2 onwards: one course list for every student, no EEX/ES divide.
export function isCommonSemester(semester) {
  return SEMESTERS.find(s => s.id === semester)?.common ?? false
}

// The semester's minor courses when the minor is on, otherwise none.
export function minorCoursesFor(semester, minorOn = false) {
  return minorOn ? (MINOR_COURSES[semester] ?? []) : []
}

// Whether a course code is one of the semester's minor courses.
export function isMinorCode(semester, courseCode) {
  return (MINOR_COURSES[semester] ?? []).some(c => c.courseCode === courseCode)
}

// Sem 3 = common core (major course and University Elective included) + the minor courses when on.
export function buildSem3Courses(minorOn = false) {
  return [...SEM3_CORE_COURSES, ...minorCoursesFor('sem3', minorOn)]
}

// Single source of truth for the starting course list of any selection.
// divide: 'EEX' | 'ES' for sem 1/2; ignored for common semesters.
export function courseTemplate(semester, divide, minorOn = false) {
  const divideData = DIVIDES[semester]?.find(d => d.id === divide)
  if (divideData) return divideData.courses
  if (semester === 'sem3') return buildSem3Courses(minorOn)
  if (isCommonSemester(semester)) return [] // later semesters have no course data yet
  return EEX_COURSES
}

// How many assessments are filled in (the four marks, or a direct grade).
export function filledCount(c) {
  if (!c) return 0
  const marks = ['cie1Marks', 'cie2Marks', 'cie3Marks', 'seeMarks'].filter(k => c[k] !== null && c[k] !== undefined && c[k] !== '').length
  return marks + (c.directGrade != null ? 1 : 0)
}

const MARK_FIELDS = ['cie1Marks', 'cie2Marks', 'cie3Marks', 'seeMarks']
const blank = v => v === null || v === undefined || v === ''

// Combine two copies of one course: the winner keeps every field it has, and any
// assessment it is missing is filled from the other copy. Nothing filled is ever
// cleared. Grade-only entries (directGrade) are not mixed with marks.
function mergeCourse(winner, other) {
  if (winner.directGrade != null || other.directGrade != null) return winner
  const out = { ...winner }
  let filled = false
  for (const k of MARK_FIELDS) if (blank(out[k]) && !blank(other[k])) { out[k] = other[k]; filled = true }
  return filled ? enrichCourse(out) : winner
}

// Merge two course lists by code, course by course and field by field. The copy with
// more assessments filled wins (on a tie the incoming copy wins only when
// incomingWinsTie is true), then its blank fields are filled from the other copy.
export function mergeByCode(base, incoming, incomingWinsTie = false) {
  const out = [...base]
  for (const c of incoming) {
    const i = out.findIndex(x => x.courseCode === c.courseCode)
    if (i < 0) { out.push(c); continue }
    const a = filledCount(out[i]), b = filledCount(c)
    out[i] = (b > a || (b === a && incomingWinsTie)) ? mergeCourse(c, out[i]) : mergeCourse(out[i], c)
  }
  return out
}

// One row per course code (the most complete copy), so no view counts a course twice.
export function dedupeByCode(courses) {
  return mergeByCode([], courses, false)
}

export function hasMarks(c) {
  return filledCount(c) > 0
}

// Bring a course list in line with the minor switch. This never deletes: minor
// courses are kept with inactive: true while the minor is off (marks intact, excluded
// from SGPA/CGPA); switching it back on clears the flag. Missing minor courses are
// added through makeCourse when it is on. Returns the same array when nothing changes.
export function syncMinorCourses(courses, semester, minorOn = false, makeCourse = c => c) {
  let changed = false
  const out = courses.map(c => {
    if (!isMinorCode(semester, c.courseCode)) return c
    const inactive = !minorOn
    if (!!c.inactive === inactive) return c
    changed = true
    if (inactive) return { ...c, inactive: true }
    const rest = { ...c }
    delete rest.inactive
    return rest
  })
  const have = new Set(out.map(c => c.courseCode))
  const added = minorCoursesFor(semester, minorOn).filter(c => !have.has(c.courseCode)).map(makeCourse)
  if (added.length) changed = true
  return changed ? [...out, ...added] : courses
}

// Validate a stored minor setting: true or false, otherwise null (missing or
// malformed). The caller decides the fallback.
export function normalizeMinorSetting(value) {
  return typeof value === 'boolean' ? value : null
}

// Fallback when the minor setting is absent or malformed: the minor counts as on
// when any of its courses in the given lists already has marks.
export function inferMinorOn(courseLists) {
  return courseLists.some(([semester, courses]) =>
    (courses ?? []).some(c => isMinorCode(semester, c?.courseCode) && hasMarks(c)))
}

export function activeCourses(courses) {
  return courses.filter(c => !c.inactive)
}

export function totalCredits(courses) {
  return courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0)
}
