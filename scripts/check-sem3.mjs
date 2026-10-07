// Sanity checks for Sem 3 credits and storage, using the app's own data and helpers.
// Run: npm run check:sem3 (also runs before the GitHub Pages build in predeploy).
import assert from 'node:assert/strict'

// Minimal in-memory localStorage so the storage helpers run in Node.
const mem = new Map()
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
  clear: () => mem.clear(),
}

const { buildSem3Courses, courseTemplate, totalCredits, syncMinorCourses, activeCourses } = await import('../src/utils/semesterTemplates.js')
const { MAJORS } = await import('../src/utils/constants.js')
const { calculateSGPA, enrichCourse } = await import('../src/utils/calculations.js')
const store = await import('../src/utils/semesterStore.js')

const fmt = cs => cs.map(c => `${c.courseCode}(${c.credits})`).join(' + ')
// Core and major courses 87 (A+, 9); minor courses 55 (B, 6), so the minor visibly moves SGPA.
const mark = c => enrichCourse(c.courseCode.startsWith('LW')
  ? { ...c, cie1Marks: 10, cie2Marks: 15, cie3Marks: 15, seeMarks: 15 }
  : { ...c, cie1Marks: 18, cie2Marks: 22, cie3Marks: 22, seeMarks: 25 })
const marked = cs => cs.filter(c => c.totalMarks !== null && c.totalMarks !== undefined).length

// 1. Credit totals
const dsCrim = buildSem3Courses('ds', ['crim'])
const dsOnly = buildSem3Courses('ds', [])
console.log(`Data Science + Criminology: ${fmt(dsCrim)} = ${totalCredits(dsCrim)} credits`)
console.log(`Data Science, no minor:     ${fmt(dsOnly)} = ${totalCredits(dsOnly)} credits`)
assert.equal(totalCredits(dsCrim), 23)
assert.equal(totalCredits(dsOnly), 17)
assert.deepEqual(dsCrim.map(c => c.courseCode), ['CS2806', 'CS2000', 'CS2403', 'CS2231', 'CS2404', 'EE', 'LW2055', 'LW2032'])
for (const m of MAJORS) {
  const cs = courseTemplate('sem3', m.id, [])
  console.log(`${m.label.padEnd(16)} ${cs.length} courses, ${totalCredits(cs)} credits`)
  assert.equal(totalCredits(cs), 17)
}

// 2. Minor off and on again keeps all 8 marks; off excludes the minor from SGPA.
let cur = store.loadSemesterCourses('sem3', 'ds', ['crim']).map(mark)
const off = syncMinorCourses(cur, 'sem3', [], store.blankCourse)
assert.equal(off.length, 8, 'minor courses are kept when switched off')
assert.equal(totalCredits(activeCourses(off)), 17)
assert.equal(marked(off), 8)
const on = syncMinorCourses(off, 'sem3', ['crim'], store.blankCourse)
assert.equal(totalCredits(activeCourses(on)), 23)
assert.equal(marked(on), 8)
assert.equal(calculateSGPA(off), 9)
assert.equal(calculateSGPA(on).toFixed(4), (189 / 23).toFixed(4))
console.log(`Minor off/on cycle: ${marked(on)} of ${on.length} marks kept, SGPA off ${calculateSGPA(off).toFixed(4)} (17 cr), on ${calculateSGPA(on).toFixed(4)} (23 cr)`)

// 3. Off state survives a save and reload, marks intact.
store.saveSemesterCourses('sem3', 'ds', off)
const reloaded = store.loadSemesterCourses('sem3', 'ds', [])
assert.equal(marked(reloaded), 8)
assert.equal(totalCredits(activeCourses(reloaded)), 17)

// 4. Missing or malformed minors setting with saved minor marks: inferred as on, nothing dropped.
store.saveSemesterCourses('sem3', 'ds', on)
for (const v of [null, '{oops', '"crim"', '42']) {
  if (v === null) localStorage.removeItem('sgpa_minors_v1'); else localStorage.setItem('sgpa_minors_v1', v)
  const minors = store.resolveMinors()
  assert.deepEqual(minors, ['crim'], `setting ${v}`)
  assert.equal(marked(store.loadSemesterCourses('sem3', 'ds', minors)), 8)
}
localStorage.setItem('sgpa_minors_v1', '["CRIM"]')
assert.deepEqual(store.resolveMinors(), ['crim'])
console.log('Minors setting missing/malformed with marks present: treated as on, 8 of 8 marks kept')

// 5. Switching major keeps core and minor marks; only the specialization course changes.
const ai = store.loadSemesterCourses('sem3', 'aiml', ['crim'])
assert.equal(ai.find(c => c.courseCode === 'CS2227').totalMarks, null)
assert.equal(marked(ai), 7)
assert.ok(!ai.some(c => c.courseCode === 'CS2231'))
store.saveSemesterCourses('sem3', 'aiml', ai)
assert.equal(marked(store.loadSemesterCourses('sem3', 'ds', ['crim'])), 8)
console.log('Switch ds -> aiml: 7 shared marks kept (CS2227 blank); back to ds: 8 of 8')

// 6. Reset follows the on-screen major.
assert.ok(courseTemplate('sem3', 'ds', []).some(c => c.courseCode === 'CS2231'))
assert.ok(!courseTemplate('sem3', 'ds', []).some(c => c.courseCode === 'CS2227'))

// 7. Migration from the first branch layout (whole list per major) loses nothing.
mem.clear()
localStorage.setItem('sgpa_calc_v2_sem3_ds', JSON.stringify(buildSem3Courses('ds', ['crim']).map(store.blankCourse).map(mark)))
localStorage.setItem('sgpa_calc_v2_sem3_aiml', JSON.stringify(buildSem3Courses('aiml', []).map(store.blankCourse)))
store.migrateMajorSemesterStorage()
assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_ds'), null)
assert.ok(localStorage.getItem('sgpa_calc_v2_sem3_ds_premigration'))
assert.equal(marked(store.loadSemesterCourses('sem3', 'ds', store.resolveMinors())), 8)
assert.equal(marked(store.loadSemesterCourses('sem3', 'aiml', ['crim'])), 7)
console.log('Migration of old per-major lists: 8 of 8 marks kept, backups under *_premigration')

console.log('OK: Sem 3 credit and storage checks passed')
