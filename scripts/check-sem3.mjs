// Sanity check for Sem 3 credit totals, using the app's own data and helpers.
// Run: npm run check:sem3
import assert from 'node:assert/strict'
import { buildSem3Courses, courseTemplate, totalCredits, syncMinorCourses } from '../src/utils/semesterTemplates.js'
import { MAJORS } from '../src/utils/constants.js'

const fmt = cs => cs.map(c => `${c.courseCode}(${c.credits})`).join(' + ')

const dsCrim = buildSem3Courses('ds', ['crim'])
const dsOnly = buildSem3Courses('ds', [])
console.log(`Data Science + Criminology: ${fmt(dsCrim)} = ${totalCredits(dsCrim)} credits`)
console.log(`Data Science, no minor:     ${fmt(dsOnly)} = ${totalCredits(dsOnly)} credits`)
assert.equal(totalCredits(dsCrim), 23)
assert.equal(totalCredits(dsOnly), 17)
assert.deepEqual(dsCrim.map(c => c.courseCode), ['CS2806', 'CS2000', 'CS2403', 'CS2231', 'CS2404', 'EE', 'LW2055', 'LW2032'])

// Every major gets exactly one 3 credit specialization course on top of the 14 credit core.
for (const m of MAJORS) {
  const cs = courseTemplate('sem3', m.id, m.id, [])
  console.log(`${m.label.padEnd(16)} ${cs.length} courses, ${totalCredits(cs)} credits`)
  assert.equal(totalCredits(cs), 17)
}

// Toggling the minor off and on keeps marks on courses that stay.
const marked = dsCrim.map(c => ({ ...c, cie1Marks: 15 }))
const off = syncMinorCourses(marked, 'sem3', [])
assert.equal(totalCredits(off), 17)
assert.ok(off.every(c => c.cie1Marks === 15))
const on = syncMinorCourses(off, 'sem3', ['crim'], c => ({ ...c, cie1Marks: null }))
assert.equal(totalCredits(on), 23)
assert.equal(on.filter(c => c.cie1Marks === 15).length, 6)

console.log('OK: Sem 3 credit checks passed')
