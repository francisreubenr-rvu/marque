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

const { buildSem3Courses, courseTemplate, totalCredits, syncMinorCourses, activeCourses, mergeByCode } = await import('../src/utils/semesterTemplates.js')
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

// 8. Explicit off ([]) survives a reload: no inference, minor rows stay off with marks.
mem.clear()
store.saveSemesterCourses('sem3', 'ds', syncMinorCourses(store.loadSemesterCourses('sem3', 'ds', ['crim']).map(mark), 'sem3', [], store.blankCourse))
localStorage.setItem('sgpa_minors_v1', '[]')
assert.deepEqual(store.resolveMinors(), [])
const offReload = store.loadSemesterCourses('sem3', 'ds', store.resolveMinors())
assert.equal(totalCredits(activeCourses(offReload)), 17)
assert.equal(marked(offReload), 8)
for (const bad of ['["zzz"]', '[1]', '["crim","zzz"]']) {
  localStorage.setItem('sgpa_minors_v1', bad)
  assert.deepEqual(store.resolveMinors(), ['crim'], `malformed ${bad} falls back to inference`)
}
console.log('Explicit off reloads as off (17 cr, 8 of 8 marks); ["zzz"], [1] are malformed and fall back to inference')

// 9. Conflicting old lists: per course, more assessments filled wins; a tie goes to the last saved major.
mem.clear()
const oldList = (major, fill) => JSON.stringify(buildSem3Courses(major, []).map(store.blankCourse).map(fill))
const cie1Only = c => enrichCourse({ ...c, cie1Marks: 12 })
const full60 = c => enrichCourse({ ...c, cie1Marks: 12, cie2Marks: 15, cie3Marks: 15, seeMarks: 18 })
localStorage.setItem('sgpa_major_v1', JSON.stringify({ id: 'ds' }))
// ds: CIE1 only on every course; aiml: full marks on CS2806 only
localStorage.setItem('sgpa_calc_v2_sem3_ds', oldList('ds', cie1Only))
localStorage.setItem('sgpa_calc_v2_sem3_aiml', oldList('aiml', c => (c.courseCode === 'CS2806' ? full60(c) : c)))
store.migrateMajorSemesterStorage()
let v = store.loadSemesterCourses('sem3', 'ds', [])
assert.equal(v.find(c => c.courseCode === 'CS2806').totalMarks, 60, 'fully marked copy beats CIE1-only copy')
assert.equal(v.find(c => c.courseCode === 'CS2000').cie1Marks, 12, 'CIE1 kept where the other list is blank')
// tie: both full, different values; last saved major (ds) wins
mem.clear()
localStorage.setItem('sgpa_major_v1', JSON.stringify({ id: 'ds' }))
localStorage.setItem('sgpa_calc_v2_sem3_aiml', oldList('aiml', full60))
localStorage.setItem('sgpa_calc_v2_sem3_ds', oldList('ds', mark))
store.migrateMajorSemesterStorage()
v = store.loadSemesterCourses('sem3', 'aiml', [])
assert.equal(v.find(c => c.courseCode === 'CS2806').totalMarks, 87, 'tie goes to the last saved major (ds)')
assert.equal(v.find(c => c.courseCode === 'CS2227').totalMarks, 60, 'aiml keeps its own course')
assert.ok(localStorage.getItem(store.LS_MAJOR_SEM_MIGRATED))
console.log('Conflicting old lists: merged per course (more filled wins, tie to last saved major ds)')

// 10. Rerun with an existing backup: the backup is never overwritten, a reappearing old key is merged.
const backup = localStorage.getItem('sgpa_calc_v2_sem3_ds_premigration')
localStorage.setItem('sgpa_calc_v2_sem3_ds', oldList('ds', c => c)) // stale tab writes a blank list
store.migrateMajorSemesterStorage()
assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_ds_premigration'), backup, 'backup untouched')
assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_ds'), null)
assert.equal(marked(store.loadSemesterCourses('sem3', 'ds', [])), 6, 'blank stale list does not wipe live marks')
localStorage.setItem('sgpa_calc_v2_sem3_ds', oldList('ds', c => (c.courseCode === 'CS2404' ? full60(c) : c))) // stale tab with a new mark
store.migrateMajorSemesterStorage()
assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_ds_premigration'), backup, 'backup still untouched')
assert.equal(store.loadSemesterCourses('sem3', 'ds', []).find(c => c.courseCode === 'CS2404').totalMarks, 87, 'tie: live copy kept')
console.log('Rerun with existing backup: backup unchanged, reappearing old key merged without losing live marks')

// 11. Another major's specialization code in shared, typed or old data goes to its own key, never counted twice.
mem.clear()
localStorage.setItem('sgpa_major_v1', JSON.stringify({ id: 'ds' }))
// old MN2 bug: aiml template saved under the ds key, plus typed CS2227 marks
localStorage.setItem('sgpa_calc_v2_sem3_ds', JSON.stringify(buildSem3Courses('aiml', []).map(store.blankCourse).map(mark)))
store.migrateMajorSemesterStorage()
const dsView = store.loadSemesterCourses('sem3', 'ds', [])
const aiView = store.loadSemesterCourses('sem3', 'aiml', [])
assert.equal(totalCredits(dsView), 17)
assert.equal(dsView.filter(c => c.courseCode === 'CS2227').length, 0)
assert.equal(aiView.filter(c => c.courseCode === 'CS2227').length, 1)
assert.equal(aiView.find(c => c.courseCode === 'CS2227').totalMarks, 87)
// typed on the ds screen and saved: lands under aiml only
store.saveSemesterCourses('sem3', 'ds', [...dsView, mark(store.blankCourse({ courseCode: 'CS2500', courseName: 'Cloud Computing and Big Data', credits: 3 }))])
assert.equal(store.loadSemesterCourses('sem3', 'ds', []).filter(c => c.courseCode === 'CS2500').length, 0)
const cloudView = store.loadSemesterCourses('sem3', 'cloud', [])
assert.equal(cloudView.filter(c => c.courseCode === 'CS2500').length, 1)
assert.equal(totalCredits(cloudView), 17)
const routed = store.routeForeignMajorCourses('sem3', 'ds', [store.blankCourse({ courseCode: 'CS2405', courseName: 'Cyber Security', credits: 3 })])
assert.equal(routed.kept.length, 0)
assert.equal(routed.routed[0].majorId, 'cyber')
// shared list that already holds a foreign code (data written by 6300daa) is cleaned on the next load
localStorage.setItem('sgpa_calc_v2_sem3_shared', JSON.stringify([...JSON.parse(localStorage.getItem('sgpa_calc_v2_sem3_shared')), mark(store.blankCourse({ courseCode: 'CS2227', courseName: 'typed', credits: 3 }))]))
store.migrateMajorSemesterStorage()
assert.ok(!JSON.parse(localStorage.getItem('sgpa_calc_v2_sem3_shared')).some(c => c.courseCode === 'CS2227'))
assert.equal(store.loadSemesterCourses('sem3', 'aiml', []).filter(c => c.courseCode === 'CS2227').length, 1)
console.log('Foreign major codes: routed to their own major key, each view 17 cr with one row per code')

// 12. Verifier seeds A and B (first branch layout, ds and aiml lists both holding marks,
// saved major ds, minor on). Per course and per field: more assessments filled wins,
// blanks are filled from the other copy, a tie goes to the last saved major.
const seedList = rows => JSON.stringify(rows.map(([courseCode, credits, a, b, c, d], i) => enrichCourse({
  id: `seed-${courseCode}-${i}`, courseCode, courseName: courseCode, credits, cie1Marks: a, cie2Marks: b, cie3Marks: c, seeMarks: d,
})))
const _ = null
const SEEDS = {
  A: {
    ds:   [['CS2806', 2, 18, 22, 23, 28], ['CS2000', 4, 16, 20, 20, 25], ['CS2403', 3, 14, 18, 18, 22], ['CS2231', 3, 12, 15, 16, 20], ['CS2404', 3, 10, 13, 14, 18], ['EE', 2, _, _, _, _], ['LW2055', 3, 8, 10, 10, 14], ['LW2032', 3, 17, 21, 22, 26]],
    aiml: [['CS2806', 2, _, _, _, _], ['CS2000', 4, _, _, _, _], ['CS2403', 3, _, _, _, _], ['CS2227', 3, 19, 24, 24, 29], ['CS2404', 3, _, _, _, _], ['EE', 2, 9, 12, 12, 14], ['LW2055', 3, _, _, _, _], ['LW2032', 3, _, _, _, _]],
    expect: { ds: [168, 23], aiml: [177, 23] },
  },
  B: {
    ds:   [['CS2806', 2, 18, 22, 23, 28], ['CS2000', 4, 16, _, _, _], ['CS2403', 3, 14, 18, 18, 22], ['CS2231', 3, 12, 15, 16, 20], ['CS2404', 3, 10, 13, 14, 18], ['EE', 2, 9, 12, 12, 14], ['LW2055', 3, 8, 10, 10, 14], ['LW2032', 3, 17, 21, 22, 26]],
    aiml: [['CS2806', 2, 10, 12, 12, 16], ['CS2000', 4, 19, 24, 24, 29], ['CS2403', 3, _, _, _, _], ['CS2227', 3, 19, 24, 24, 29], ['CS2404', 3, _, _, _, _], ['EE', 2, _, _, _, _], ['LW2055', 3, _, _, _, _], ['LW2032', 3, _, _, _, _]],
    expect: { ds: [172, 23], aiml: [181, 23] },
  },
}
for (const [name, seed] of Object.entries(SEEDS)) {
  mem.clear()
  localStorage.setItem('sgpa_major_v1', JSON.stringify({ id: 'ds' }))
  localStorage.setItem('sgpa_minors_v1', '["crim"]')
  localStorage.setItem('sgpa_calc_v2_sem3_ds', seedList(seed.ds))
  localStorage.setItem('sgpa_calc_v2_sem3_aiml', seedList(seed.aiml))
  store.migrateMajorSemesterStorage()
  const out = []
  for (const major of ['ds', 'aiml']) {
    const view = store.loadSemesterCourses('sem3', major, store.resolveMinors())
    const scored = view.filter(c => c.creditGradeProduct !== null)
    const cgp = scored.reduce((s, c) => s + c.creditGradeProduct, 0), cr = totalCredits(scored)
    assert.equal(view.length, 8)
    assert.equal(scored.length, 8, `seed ${name} ${major}: every course graded`)
    assert.deepEqual([cgp, cr], seed.expect[major], `seed ${name} ${major}`)
    assert.equal(calculateSGPA(view).toFixed(4), (cgp / cr).toFixed(4))
    out.push(`${major} ${cgp}/${cr} = ${(cgp / cr).toFixed(2)}`)
  }
  const v = store.loadSemesterCourses('sem3', 'ds', ['crim'])
  const pick = code => { const c = v.find(x => x.courseCode === code); return [c.cie1Marks, c.cie2Marks, c.cie3Marks, c.seeMarks].join('/') }
  if (name === 'B') {
    assert.equal(pick('CS2000'), '19/24/24/29', 'B: complete aiml CS2000 kept, fully graded')
    assert.equal(pick('CS2806'), '18/22/23/28', 'B: CS2806 tie goes to the last saved major (ds)')
    assert.equal(JSON.parse(localStorage.getItem('sgpa_calc_v2_sem3_aiml_premigration')).find(c => c.courseCode === 'CS2806').cie1Marks, 10, 'B: aiml CS2806 kept in its backup')
  } else {
    assert.equal(pick('EE'), '9/12/12/14', 'A: EE taken from the aiml list')
  }
  console.log(`Verifier seed ${name}: CS2000 ${pick('CS2000')}, CS2806 ${pick('CS2806')}, EE ${pick('EE')}; ${out.join(', ')}`)
}
// Field-level fill: the winner's blank fields come from the other copy, nothing filled is cleared.
const merged = mergeByCode([enrichCourse({ courseCode: 'X', credits: 3, cie1Marks: 10, cie2Marks: 12, cie3Marks: 12, seeMarks: null })],
  [enrichCourse({ courseCode: 'X', credits: 3, cie1Marks: 15, cie2Marks: null, cie3Marks: null, seeMarks: 20 })], true)[0]
assert.equal([merged.cie1Marks, merged.cie2Marks, merged.cie3Marks, merged.seeMarks].join('/'), '10/12/12/20')
assert.equal(merged.totalMarks, 54)
console.log('Field-level merge: 10/12/12/- + 15/-/-/20 -> 10/12/12/20 (winner kept, blank SEE filled)')

console.log('OK: Sem 3 credit and storage checks passed')
