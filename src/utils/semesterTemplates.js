// Pure helpers that decide which course template a semester starts with.
// No React, no localStorage, so they can also run in plain Node (see scripts/check-sem3.mjs).
// Imports carry the .js extension for that reason; Vite resolves them the same way.
import { SEMESTERS, DIVIDES, MAJOR_SEMESTERS, SEM3_CORE_COURSES, MINORS, EEX_COURSES } from './constants.js'

export function isMajorSemester(semester) {
  return SEMESTERS.find(s => s.id === semester)?.majorSem ?? false
}

// Courses for every selected minor in a given semester (unknown ids are ignored).
export function minorCoursesFor(semester, minorIds = []) {
  return MINORS
    .filter(m => minorIds.includes(m.id))
    .flatMap(m => m.courses?.[semester] ?? [])
}

// Sem 3 = shared core + the major's specialization course + selected minors.
// The specialization course sits after Computer Networks to mirror the timetable order.
export function buildSem3Courses(majorId, minorIds = []) {
  const major = MAJOR_SEMESTERS.sem3?.[majorId] ?? []
  const [calc, daa, cn, ...rest] = SEM3_CORE_COURSES
  return [calc, daa, cn, ...major, ...rest, ...minorCoursesFor('sem3', minorIds)]
}

// Single source of truth for the starting course list of any selection.
// divide: 'EEX' | 'ES' for sem 1/2; for major semesters it is the major id.
export function courseTemplate(semester, divide, majorId, minorIds = []) {
  const divideData = DIVIDES[semester]?.find(d => d.id === divide)
  if (divideData) return divideData.courses
  if (semester === 'sem3') return buildSem3Courses(majorId ?? divide, minorIds)
  const majorTpl = MAJOR_SEMESTERS[semester]?.[majorId ?? divide]
  return majorTpl ?? EEX_COURSES
}

// Bring a saved course list in line with the selected minors: add missing minor
// courses (blank marks) and drop courses from minors that were switched off.
// Courses that are already present keep their marks untouched.
export function syncMinorCourses(courses, semester, minorIds = [], makeCourse = c => c) {
  const wanted = minorCoursesFor(semester, minorIds)
  const wantedCodes = new Set(wanted.map(c => c.courseCode))
  const allMinorCodes = new Set(MINORS.flatMap(m => (m.courses?.[semester] ?? []).map(c => c.courseCode)))
  const kept = courses.filter(c => !allMinorCodes.has(c.courseCode) || wantedCodes.has(c.courseCode))
  const have = new Set(kept.map(c => c.courseCode))
  const added = wanted.filter(c => !have.has(c.courseCode)).map(makeCourse)
  return [...kept, ...added]
}

export function totalCredits(courses) {
  return courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0)
}
