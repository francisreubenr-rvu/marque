// Pure helpers that decide which course template a semester starts with.
// No React, no localStorage, so they can also run in plain Node (see scripts/check-sem3.mjs).
// Imports carry the .js extension for that reason; Vite resolves them the same way.
import { SEMESTERS, DIVIDES, MAJORS, MAJOR_SEMESTERS, SEM3_CORE_COURSES, MINORS, EEX_COURSES } from './constants.js'

export function isMajorSemester(semester) {
  return SEMESTERS.find(s => s.id === semester)?.majorSem ?? false
}

export function isMajorId(id) {
  return MAJORS.some(m => m.id === id)
}

// Courses for every selected minor in a given semester (unknown ids are ignored).
export function minorCoursesFor(semester, minorIds = []) {
  return MINORS
    .filter(m => minorIds.includes(m.id))
    .flatMap(m => m.courses?.[semester] ?? [])
}

// Which minor (if any) a course code belongs to in this semester.
export function minorIdForCode(semester, courseCode) {
  return MINORS.find(m => (m.courses?.[semester] ?? []).some(c => c.courseCode === courseCode))?.id ?? null
}

// Course codes of the specialization course(s) for one major in one semester.
export function majorCourseCodes(semester, majorId) {
  return new Set((MAJOR_SEMESTERS[semester]?.[majorId] ?? []).map(c => c.courseCode))
}

// Sem 3 = shared core + the major's specialization course + selected minors.
// The specialization course sits after Computer Networks to mirror the timetable order.
export function buildSem3Courses(majorId, minorIds = []) {
  const major = MAJOR_SEMESTERS.sem3?.[majorId] ?? []
  const [calc, daa, cn, ...rest] = SEM3_CORE_COURSES
  return [calc, daa, cn, ...major, ...rest, ...minorCoursesFor('sem3', minorIds)]
}

// Single source of truth for the starting course list of any selection.
// divide: 'EEX' | 'ES' for sem 1/2; for major semesters it is the major id
// shown on screen (selection.divide), never a separately saved major.
export function courseTemplate(semester, divide, minorIds = []) {
  const divideData = DIVIDES[semester]?.find(d => d.id === divide)
  if (divideData) return divideData.courses
  if (semester === 'sem3') return buildSem3Courses(divide, minorIds)
  return MAJOR_SEMESTERS[semester]?.[divide] ?? EEX_COURSES
}

// Major semesters store their courses in two parts: the specialization course(s)
// of one major, and everything else (core, minors, custom courses) shared by all majors.
export function splitMajorCourses(courses, semester, majorId) {
  const codes = majorCourseCodes(semester, majorId)
  return {
    major:  courses.filter(c => codes.has(c.courseCode)),
    shared: courses.filter(c => !codes.has(c.courseCode)),
  }
}

// Inverse of splitMajorCourses: the major course goes back after CS2403
// (or after the third course when the list has been edited).
export function mergeMajorCourses(shared, major) {
  const cn = shared.findIndex(c => c.courseCode === 'CS2403')
  const at = cn >= 0 ? cn + 1 : Math.min(3, shared.length)
  return [...shared.slice(0, at), ...major, ...shared.slice(at)]
}

export function hasMarks(c) {
  return !!c && (c.directGrade != null || ['cie1Marks', 'cie2Marks', 'cie3Marks', 'seeMarks'].some(k => c[k] !== null && c[k] !== undefined && c[k] !== ''))
}

// Bring a course list in line with the selected minors. This never deletes:
// courses of a minor that is switched off are kept with inactive: true (marks intact,
// excluded from SGPA/CGPA); switching it back on clears the flag. Missing courses of
// a selected minor are added through makeCourse. Returns the same array when nothing changes.
export function syncMinorCourses(courses, semester, minorIds = [], makeCourse = c => c) {
  let changed = false
  const out = courses.map(c => {
    const owner = minorIdForCode(semester, c.courseCode)
    if (!owner) return c
    const inactive = !minorIds.includes(owner)
    if (!!c.inactive === inactive) return c
    changed = true
    if (inactive) return { ...c, inactive: true }
    const rest = { ...c }
    delete rest.inactive
    return rest
  })
  const have = new Set(out.map(c => c.courseCode))
  const added = minorCoursesFor(semester, minorIds).filter(c => !have.has(c.courseCode)).map(makeCourse)
  if (added.length) changed = true
  return changed ? [...out, ...added] : courses
}

// Validate a stored minors setting. Returns a clean array of known ids, or null
// when the value is missing or not an array of strings (caller decides the fallback).
export function normalizeMinors(value) {
  if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) return null
  const ids = value.map(v => v.trim().toLowerCase()).filter(v => MINORS.some(m => m.id === v))
  return [...new Set(ids)]
}

// Fallback when the minors setting is absent or malformed: a minor counts as on
// when any of its courses in the given lists already has marks.
export function inferMinors(courseLists) {
  const on = new Set()
  for (const [semester, courses] of courseLists) {
    for (const c of courses ?? []) {
      const owner = minorIdForCode(semester, c?.courseCode)
      if (owner && hasMarks(c)) on.add(owner)
    }
  }
  return [...on]
}

export function activeCourses(courses) {
  return courses.filter(c => !c.inactive)
}

export function totalCredits(courses) {
  return courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0)
}
