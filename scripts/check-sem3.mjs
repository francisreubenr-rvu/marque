// Sanity checks for Sem 3 credits and storage migrations, using the app's own data and helpers.
// Run: npm run check:sem3 (also runs before the GitHub Pages build in predeploy).
import assert from 'node:assert/strict'

// Minimal in-memory localStorage so the storage helpers run in Node. failWrite(key) can
// make setItem throw (like a full storage) to test that migrations retry.
const mem = new Map()
let failWrite = () => false
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (failWrite(k)) throw new Error('QuotaExceededError'); mem.set(k, String(v)) },
  removeItem: k => mem.delete(k),
  clear: () => mem.clear(),
}
const snapshot = () => JSON.stringify([...mem.entries()].sort())
const reset = () => { mem.clear(); failWrite = () => false }

const { buildSem3Courses, courseTemplate, totalCredits, syncMinorCourses, activeCourses, mergeByCode, dedupeByCode, isMinorCode } = await import('../src/utils/semesterTemplates.js')
const { SEM3_UNIVERSITY_ELECTIVE, SEM3_MAJOR_COURSE, MINOR_COURSES, SEM3_CORE_COURSES } = await import('../src/utils/constants.js')
const { calculateSGPA, enrichCourse } = await import('../src/utils/calculations.js')
const store = await import('../src/utils/semesterStore.js')

const SHARED = 'sgpa_calc_v2_sem3_shared'
const MINOR = 'sgpa_minor_v2'
const FLAG = store.LS_GENERIC_SLOTS_MIGRATED
const BK = store.BACKUP_SUFFIX_V3
const fmt = cs => cs.map(c => `${c.courseCode}(${c.credits})`).join(' + ')
const codes = cs => cs.map(c => c.courseCode)
const MARK_KEYS = ['id', 'cie1Marks', 'cie2Marks', 'cie3Marks', 'seeMarks', 'totalMarks', 'grade', 'gradePoint', 'creditGradeProduct', 'credits', 'inactive', 'difficulty']
const marksOf = c => MARK_KEYS.map(k => c[k] ?? null)
const marked = cs => cs.filter(c => c.totalMarks !== null && c.totalMarks !== undefined).length
// Core courses 87 (A+, 9); minor courses 55 (B, 6), so the minor visibly moves SGPA.
const mark = c => enrichCourse(isMinorCode('sem3', c.courseCode) || c.courseCode.startsWith('LW')
  ? { ...c, cie1Marks: 10, cie2Marks: 15, cie3Marks: 15, seeMarks: 15 }
  : { ...c, cie1Marks: 18, cie2Marks: 22, cie3Marks: 22, seeMarks: 25 })
// Distinct marks per row so a row swap would change the SGPA.
// Totals 45 + 4 * (i % 10), all within the caps.
const varied = (c, i) => enrichCourse({ ...c, cie1Marks: 8 + (i % 10), cie2Marks: 12 + (i % 10), cie3Marks: 11 + (i % 10), seeMarks: 14 + (i % 10), difficulty: i % 2 ? 'hard' : 'easy' })
const row = (courseCode, courseName, credits) => store.blankCourse({ courseCode, courseName, credits })
const UE = SEM3_UNIVERSITY_ELECTIVE.courseCode

// 1. Credit totals and generic rows
const withMinor = buildSem3Courses(true)
const noMinor = buildSem3Courses(false)
console.log(`Sem 3 with minor:    ${fmt(withMinor)} = ${totalCredits(withMinor)} credits`)
console.log(`Sem 3 without minor: ${fmt(noMinor)} = ${totalCredits(noMinor)} credits`)
assert.deepEqual(codes(withMinor), ['CS2806', 'CS2000', 'CS2403', 'CS2404', 'EE', 'MAJOR', 'UE', 'MINOR1', 'MINOR2'])
assert.equal(withMinor.length, 9)
assert.equal(totalCredits(withMinor), 25)
assert.equal(noMinor.length, 7)
assert.equal(totalCredits(noMinor), 19)
assert.equal(SEM3_MAJOR_COURSE.credits, 3)
assert.equal(SEM3_UNIVERSITY_ELECTIVE.credits, 2)
assert.deepEqual(MINOR_COURSES.sem3.map(c => c.credits), [3, 3])
assert.deepEqual(codes(courseTemplate('sem3', 'ds', true)), codes(withMinor), 'no per-major template')
for (const c of withMinor) assert.ok(!/^(LW|CS22|CS25|CS2405)/.test(c.courseCode), `generic row ${c.courseCode}`)
assert.deepEqual(courseTemplate('sem4'), [], 'locked semesters have no course data')
console.log('Generic rows: MAJOR 3 cr, UE 2 cr, MINOR1/MINOR2 3 cr each; no per-major template')

// 2. Minor off and on again keeps all 9 marks; off excludes the minor from SGPA.
reset()
const cur = store.loadSemesterCourses('sem3', undefined, true).map(mark)
const off = syncMinorCourses(cur, 'sem3', false, store.blankCourse)
assert.equal(off.length, 9, 'minor courses are kept when switched off')
assert.equal(totalCredits(activeCourses(off)), 19)
assert.equal(marked(off), 9)
const on = syncMinorCourses(off, 'sem3', true, store.blankCourse)
assert.equal(totalCredits(activeCourses(on)), 25)
assert.equal(marked(on), 9)
assert.equal(calculateSGPA(off), 9)
assert.equal(calculateSGPA(on).toFixed(4), (207 / 25).toFixed(4))
console.log(`Minor off/on cycle: ${marked(on)} of ${on.length} marks kept, SGPA off ${calculateSGPA(off).toFixed(4)} (19 cr), on ${calculateSGPA(on).toFixed(4)} (25 cr)`)

// 3. Off state survives a save and reload, marks intact.
store.saveSemesterCourses('sem3', undefined, off)
const reloaded = store.loadSemesterCourses('sem3', undefined, false)
assert.equal(marked(reloaded), 9)
assert.equal(totalCredits(activeCourses(reloaded)), 19)

// 4. Minor switch setting: explicit values win; missing or malformed falls back to marks.
store.saveSemesterCourses('sem3', undefined, on)
for (const v of [null, '{oops', '"yes"', '42', '["crim"]']) {
  if (v === null) localStorage.removeItem(MINOR); else localStorage.setItem(MINOR, v)
  assert.equal(store.resolveMinorOn(), true, `setting ${v} with minor marks`)
}
localStorage.setItem(MINOR, 'false')
assert.equal(store.resolveMinorOn(), false)
localStorage.setItem(MINOR, 'true')
store.saveSemesterCourses('sem3', undefined, store.loadSemesterCourses('sem3', undefined, false).filter(c => !isMinorCode('sem3', c.courseCode)))
localStorage.removeItem(MINOR)
assert.equal(store.resolveMinorOn(), false, 'no setting and no minor marks: off')
console.log('Minor switch: true/false kept; missing or malformed with minor marks reads as on')

// 5. Selections: Sem 3 carries no divide, locked semesters drop, Sem 1/2 pass through.
assert.deepEqual(store.normalizeSelection({ semester: 'sem3', divide: 'ds' }), { semester: 'sem3' })
assert.deepEqual(store.normalizeSelection({ semester: 'sem3' }), { semester: 'sem3' })
assert.equal(store.normalizeSelection({ semester: 'sem4', divide: 'ds' }), null)
assert.deepEqual(store.normalizeSelection({ semester: 'sem1', divide: 'ES' }), { semester: 'sem1', divide: 'ES' })
assert.equal(store.normalizeSelection('junk'), null)

// Format deployed at 1d0510d: shared list (core, UE, named minor, custom) plus the
// per-major specialization keys, the saved major and the named minor setting.
const DEPLOYED_SHARED = () => [
  ['CS2806', 'Calculus', 2], ['CS2000', 'Design and Analysis of Algorithms', 4], ['CS2403', 'Computer Networks', 3],
  ['CS2404', 'Internet of Things', 3], ['EE', 'Environment Education', 2], ['UE', 'University Elective', 2],
  ['LW2055', 'Old minor course A', 3], ['LW2032', 'Old minor course B', 3], ['MY101', 'Custom course', 1],
].map(([c, n, cr], i) => varied(row(c, n, cr), i))
function seedDeployed({ major = 'ds', minors = '["crim"]', shared = DEPLOYED_SHARED(), selection = { semester: 'sem3', divide: major } } = {}) {
  reset()
  localStorage.setItem('sgpa_major_v1', JSON.stringify({ id: major }))
  if (selection) localStorage.setItem('sgpa_selection_v1', JSON.stringify(selection))
  if (minors !== null) localStorage.setItem('sgpa_minors_v1', minors)
  localStorage.setItem(store.LS_MAJOR_SEM_MIGRATED, '2026-10-07T00:00:00.000Z')
  localStorage.setItem(store.LS_CORE_ADDED, '["sem3:UE"]')
  localStorage.setItem(SHARED, JSON.stringify(shared))
  const majors = { ds: varied(row('CS2231', 'Data Science', 3), 9), aiml: varied(row('CS2227', 'Artificial Intelligence and Machine Learning', 3), 1),
    cyber: varied(row('CS2405', 'Cyber Security', 3), 5), cloud: row('CS2500', 'Cloud Computing and Big Data', 3) }
  for (const [m, c] of Object.entries(majors)) localStorage.setItem(`sgpa_calc_v2_sem3_major_${m}`, JSON.stringify([c]))
  return { shared, majors }
}
// What the 1d0510d app counted: the shared list plus the selected major's course, minor rows per the switch.
const oldSgpa = (shared, majorCourse, minorOn) => calculateSGPA([...shared, majorCourse].map(c =>
  (c.courseCode.startsWith('LW') ? { ...c, inactive: !minorOn } : c)))

// 6. Upgrade from 1d0510d with marks on every row: identical marks and SGPA.
{
  const seed = seedDeployed()
  const before = oldSgpa(seed.shared, seed.majors.ds, true)
  const originalShared = localStorage.getItem(SHARED)
  store.migrateStorage()
  const minorOn = store.resolveMinorOn()
  assert.equal(minorOn, true, 'minor that was on stays on')
  const view = store.loadSemesterCourses('sem3', undefined, minorOn)
  assert.deepEqual(codes(view), ['CS2806', 'CS2000', 'CS2403', 'CS2404', 'EE', 'MAJOR', 'UE', 'MINOR1', 'MINOR2', 'MY101'])
  const byCode = Object.fromEntries(view.map(c => [c.courseCode, c]))
  const map = { MINOR1: 'LW2055', MINOR2: 'LW2032' }
  for (const c of seed.shared) {
    const now = view.find(v => v.courseCode === c.courseCode) ?? byCode[Object.keys(map).find(k => map[k] === c.courseCode)]
    assert.deepEqual(marksOf(now), marksOf(c), `${c.courseCode} marks identical`)
  }
  assert.deepEqual(marksOf(byCode.MAJOR), marksOf(seed.majors.ds), 'MAJOR carries the CS2231 marks')
  assert.equal(byCode.MAJOR.courseName, 'Major Course')
  assert.equal(byCode.MINOR1.courseName, 'Minor Course 1')
  assert.equal(byCode.MINOR2.courseName, 'Minor Course 2')
  assert.equal(byCode.MY101.courseName, 'Custom course', 'custom row untouched')
  const after = calculateSGPA(view)
  assert.equal(after.toFixed(6), before.toFixed(6), 'same SGPA')
  assert.equal(totalCredits(activeCourses(view)), 26) // 25 + the 1 cr custom course
  // backups, removals, flag
  assert.equal(localStorage.getItem(SHARED + BK), originalShared)
  for (const m of ['ds', 'aiml', 'cyber', 'cloud']) {
    assert.equal(localStorage.getItem(`sgpa_calc_v2_sem3_major_${m}`), null, `${m} key removed`)
    assert.ok(localStorage.getItem(`sgpa_calc_v2_sem3_major_${m}${BK}`), `${m} key backed up`)
  }
  assert.equal(localStorage.getItem('sgpa_major_v1'), null)
  assert.equal(localStorage.getItem('sgpa_major_v1' + BK), '{"id":"ds"}')
  assert.equal(localStorage.getItem('sgpa_minors_v1' + BK), '["crim"]')
  assert.equal(localStorage.getItem(MINOR), 'true')
  assert.ok(localStorage.getItem(FLAG))
  console.log(`Upgrade from 1d0510d (DS, minor on): ${codes(view).join(', ')}; every mark identical; SGPA ${before.toFixed(4)} -> ${after.toFixed(4)}`)

  // 7. Idempotent: a second run changes nothing; so does a rerun without the flag.
  const snap = snapshot()
  store.migrateStorage()
  assert.equal(snapshot(), snap, 'second run is a no-op')
  localStorage.removeItem(FLAG)
  store.migrateStorage()
  const again = JSON.parse(localStorage.getItem(SHARED))
  assert.equal(again.filter(c => c.courseCode === 'MAJOR').length, 1, 'no duplicate MAJOR on a rerun')
  assert.equal(localStorage.getItem(SHARED + BK), originalShared, 'backup never overwritten')
  assert.deepEqual(codes(again), codes(view))
  console.log('Idempotent: second run leaves storage byte-identical; rerun without the flag adds nothing')
}

// 8. Minor that was off stays off, inactive rows keep their marks and stay excluded.
{
  const shared = DEPLOYED_SHARED().map(c => (c.courseCode.startsWith('LW') ? { ...c, inactive: true } : c))
  const seed = seedDeployed({ minors: '[]', shared })
  const before = oldSgpa(seed.shared, seed.majors.ds, false)
  store.migrateStorage()
  assert.equal(store.resolveMinorOn(), false)
  const view = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
  assert.ok(view.filter(c => isMinorCode('sem3', c.courseCode)).every(c => c.inactive && c.totalMarks !== null))
  assert.equal(calculateSGPA(view).toFixed(6), before.toFixed(6))
  console.log(`Upgrade with minor off: MINOR rows inactive with marks; SGPA ${before.toFixed(4)} -> ${calculateSGPA(view).toFixed(4)}`)
}

// 9. The selected major decides which marks the MAJOR row takes.
for (const [label, opts, expect] of [
  ['AI/ML on screen', { major: 'aiml' }, 'aiml'],
  ['Sem 1 on screen, saved major AI/ML', { major: 'aiml', selection: { semester: 'sem1', divide: 'ES' } }, 'aiml'],
  ['Sem 3 selection with an unknown major, saved Cyber', { major: 'cyber', selection: { semester: 'sem3', divide: 'zzz' } }, 'cyber'],
]) {
  const seed = seedDeployed(opts)
  const before = oldSgpa(seed.shared, seed.majors[expect], true)
  store.migrateStorage()
  const view = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
  assert.deepEqual(marksOf(view.find(c => c.courseCode === 'MAJOR')), marksOf(seed.majors[expect]), label)
  assert.equal(calculateSGPA(view).toFixed(6), before.toFixed(6), `${label}: same SGPA`)
  console.log(`${label}: MAJOR takes the ${seed.majors[expect].courseCode} marks, SGPA ${before.toFixed(4)} -> ${calculateSGPA(view).toFixed(4)}`)
}
{
  const seed = seedDeployed({ selection: null })
  localStorage.removeItem('sgpa_major_v1')
  store.migrateStorage()
  const view = store.loadSemesterCourses('sem3', undefined, true)
  assert.deepEqual(marksOf(view.find(c => c.courseCode === 'MAJOR')), marksOf(seed.majors.ds), 'no selection or saved major: ds')
  console.log('No selection and no saved major: falls back to the ds marks')
}

// 10. A failed write leaves the flag unset and the data in place; the next load finishes.
for (const failing of [SHARED, SHARED + BK]) {
  const seed = seedDeployed()
  const original = localStorage.getItem(SHARED)
  failWrite = k => k === failing
  store.migrateStorage()
  assert.equal(localStorage.getItem(FLAG), null, `write to ${failing} failed: flag unset`)
  assert.equal(localStorage.getItem(SHARED), original, 'shared list unchanged')
  assert.ok(localStorage.getItem('sgpa_calc_v2_sem3_major_ds'), 'major key kept for the retry')
  assert.equal(localStorage.getItem('sgpa_minors_v1'), '["crim"]', 'old minor setting kept for the retry')
  assert.equal(store.resolveMinorOn(), true, 'minor still reads as on before the retry')
  failWrite = () => false
  store.migrateStorage()
  assert.ok(localStorage.getItem(FLAG))
  assert.equal(localStorage.getItem(SHARED + BK), original)
  const view = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
  assert.equal(calculateSGPA(view).toFixed(6), oldSgpa(seed.shared, seed.majors.ds, true).toFixed(6))
}
console.log('Failed write (list or backup): flag unset, nothing lost, next load completes with the same SGPA')

// 11. An existing MAJOR row is kept, no duplicate; a deleted elective stays deleted.
{
  const typed = varied(row('MAJOR', 'My major course', 3), 3)
  seedDeployed({ shared: [...DEPLOYED_SHARED().slice(0, 5), typed, ...DEPLOYED_SHARED().slice(5)] })
  store.migrateStorage()
  const list = JSON.parse(localStorage.getItem(SHARED))
  const majors = list.filter(c => c.courseCode === 'MAJOR')
  assert.equal(majors.length, 1)
  assert.deepEqual(marksOf(majors[0]), marksOf(typed))
  assert.equal(majors[0].courseName, 'My major course')
  // lowercase hand-typed code counts too
  seedDeployed({ shared: [...DEPLOYED_SHARED(), row(' major ', 'typed', 3)] })
  store.migrateStorage()
  assert.equal(JSON.parse(localStorage.getItem(SHARED)).filter(c => c.courseCode.trim().toUpperCase() === 'MAJOR').length, 1)
  // deleted UE
  seedDeployed({ shared: DEPLOYED_SHARED().filter(c => c.courseCode !== UE) })
  store.migrateStorage()
  store.migrateStorage()
  const noUe = store.loadSemesterCourses('sem3', undefined, true)
  assert.ok(!noUe.some(c => c.courseCode === UE), 'deleted elective stays deleted')
  assert.deepEqual(codes(noUe), ['CS2806', 'CS2000', 'CS2403', 'CS2404', 'EE', 'MAJOR', 'MINOR1', 'MINOR2', 'MY101'])
  console.log('Existing MAJOR row kept (no duplicate, also for " major "); a deleted elective stays deleted')
}

// 12. A hand-typed MINOR1 next to the old row: one row, the more complete copy, nothing filled lost.
{
  const shared = [...DEPLOYED_SHARED(), row('MINOR1', 'typed', 3)]
  seedDeployed({ shared })
  store.migrateStorage()
  const list = JSON.parse(localStorage.getItem(SHARED))
  assert.equal(list.filter(c => c.courseCode === 'MINOR1').length, 1)
  assert.equal(list.find(c => c.courseCode === 'MINOR1').totalMarks, shared[6].totalMarks)
}

// 13. Upgrade from 8cb4074 (before the elective): UE appended once, MAJOR placed between EE and UE.
{
  const shared = DEPLOYED_SHARED().filter(c => c.courseCode !== UE)
  const seed = seedDeployed({ shared })
  localStorage.removeItem(store.LS_CORE_ADDED)
  store.migrateStorage()
  const view = store.loadSemesterCourses('sem3', undefined, true)
  assert.deepEqual(codes(view), ['CS2806', 'CS2000', 'CS2403', 'CS2404', 'EE', 'MAJOR', 'UE', 'MINOR1', 'MINOR2', 'MY101'])
  assert.equal(view.find(c => c.courseCode === UE).totalMarks, null)
  assert.equal(calculateSGPA(view).toFixed(6), oldSgpa(seed.shared, seed.majors.ds, true).toFixed(6))
  console.log('Upgrade from 8cb4074: UE appended blank, MAJOR between EE and UE, SGPA unchanged')
}

// 14. First layout (whole list per major, before the elective) all the way to generic slots.
// Per course and per field: more assessments filled wins, a tie goes to the saved major.
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
    expect: { ds: [172, 23] },
  },
}
for (const [name, seed] of Object.entries(SEEDS)) {
  for (const [major, expect] of Object.entries(seed.expect)) {
    reset()
    localStorage.setItem('sgpa_major_v1', JSON.stringify({ id: major }))
    localStorage.setItem('sgpa_minors_v1', '["crim"]')
    localStorage.setItem('sgpa_calc_v2_sem3_ds', seedList(seed.ds))
    localStorage.setItem('sgpa_calc_v2_sem3_aiml', seedList(seed.aiml))
    store.migrateStorage()
    assert.ok(localStorage.getItem(FLAG), 'generic migration ran after the layout migration')
    assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_ds'), null)
    assert.ok(localStorage.getItem('sgpa_calc_v2_sem3_ds_premigration'))
    const view = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
    assert.deepEqual(codes(view), ['CS2806', 'CS2000', 'CS2403', 'CS2404', 'EE', 'MAJOR', 'UE', 'MINOR1', 'MINOR2'])
    assert.equal(view.find(c => c.courseCode === UE).totalMarks, null, 'appended elective is blank')
    const scored = view.filter(c => c.creditGradeProduct !== null)
    const cgp = scored.reduce((s, c) => s + c.creditGradeProduct, 0), cr = totalCredits(scored)
    assert.equal(scored.length, 8, `seed ${name} ${major}: every seeded course graded`)
    assert.deepEqual([cgp, cr], expect, `seed ${name} ${major}`)
    console.log(`First layout seed ${name}, saved major ${major}: ${cgp}/${cr} = ${(cgp / cr).toFixed(2)} (same as the per-major view before)`)
  }
}
// first layout migration failing (storage full) holds the generic migration back
reset()
localStorage.setItem('sgpa_calc_v2_sem3_ds', seedList(SEEDS.A.ds))
failWrite = k => k === SHARED
store.migrateStorage()
assert.equal(localStorage.getItem(FLAG), null, 'waits while the old whole-list key remains')
failWrite = () => false
store.migrateStorage()
assert.ok(localStorage.getItem(FLAG))
assert.equal(marked(store.loadSemesterCourses('sem3', undefined, true)), 7) // the ds list has EE blank
console.log('First layout: generic migration waits until the layout migration succeeds')

// 15. After the migration, old-format keys from a stale tab are ignored and a hand-typed
// CS2231 row stays in the list (the old layout migration no longer runs).
{
  seedDeployed()
  store.migrateStorage()
  const list = store.loadSemesterCourses('sem3', undefined, true)
  store.saveSemesterCourses('sem3', undefined, [...list, row('CS2231', 'Typed by hand', 3)])
  const snap = localStorage.getItem(SHARED)
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', '[]')
  store.migrateStorage()
  assert.equal(localStorage.getItem(SHARED), snap)
  assert.ok(store.loadSemesterCourses('sem3', undefined, true).some(c => c.courseCode === 'CS2231'))
  assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_major_ds'), null, 'reappeared per-major key removed')
  assert.ok([...mem.keys()].some(k => k.startsWith('sgpa_calc_v2_sem3_major_ds_stale_')), 'and backed up')
  console.log('After migration: an empty reappeared per-major key is backed up and removed, a hand-typed CS2231 row stays put')
}

// 16. Junk saved values never crash and fall back to the template.
for (const junk of ['[null]', '[{"foo":1}]', '[5,"x"]', '{oops', '"str"', '42', '[]']) {
  reset()
  localStorage.setItem(SHARED, junk)
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', junk)
  localStorage.setItem('sgpa_major_v1', junk)
  localStorage.setItem('sgpa_minors_v1', junk)
  localStorage.setItem('sgpa_selection_v1', junk)
  store.migrateStorage()
  assert.ok(localStorage.getItem(FLAG), `junk ${junk}: migration completes`)
  assert.equal(localStorage.getItem(SHARED), junk, `junk ${junk}: list left as stored`)
  const v = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
  assert.equal(v.length, 7, `junk ${junk} falls back to the template`)
  assert.equal(totalCredits(activeCourses(v)), 19)
}
// junk list but marks on the selected major course: start from the template, keep the marks
reset()
localStorage.setItem(SHARED, '{oops')
const dsMarks = varied(row('CS2231', 'Data Science', 3), 4)
localStorage.setItem('sgpa_calc_v2_sem3_major_ds', JSON.stringify([dsMarks]))
store.migrateStorage()
{
  const v = store.loadSemesterCourses('sem3', undefined, false)
  assert.deepEqual(codes(v), codes(noMinor))
  assert.deepEqual(marksOf(v.find(c => c.courseCode === 'MAJOR')), marksOf(dsMarks))
  assert.equal(localStorage.getItem(SHARED + BK), '{oops')
}
console.log('Junk values: no crash, template fallback; marks on the major course survive a junk list')

// 17. M2: the selected major's course is blank or missing but another major has marks.
{
  const seed = seedDeployed()
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', JSON.stringify([row('CS2231', 'Data Science', 3)])) // blank
  localStorage.setItem('sgpa_calc_v2_sem3_major_cyber', JSON.stringify([varied(row('CS2405', 'Cyber Security', 3), 6)]))
  store.migrateStorage()
  const major = store.loadSemesterCourses('sem3', undefined, true).find(c => c.courseCode === 'MAJOR')
  assert.deepEqual(marksOf(major), marksOf(seed.majors.aiml), 'tie between full aiml and cyber goes to aiml (aiml, ds, cyber, cloud order)')
  seedDeployed()
  localStorage.removeItem('sgpa_calc_v2_sem3_major_ds') // missing
  const cyber = varied(row('CS2405', 'Cyber Security', 3), 6)
  localStorage.setItem('sgpa_calc_v2_sem3_major_aiml', JSON.stringify([enrichCourse({ ...row('CS2227', 'x', 3), cie1Marks: 15, cie2Marks: 20 })]))
  localStorage.setItem('sgpa_calc_v2_sem3_major_cyber', JSON.stringify([cyber]))
  store.migrateStorage()
  assert.deepEqual(marksOf(store.loadSemesterCourses('sem3', undefined, true).find(c => c.courseCode === 'MAJOR')), marksOf(cyber), 'most filled other major wins')
  // the selected major's marks still win when it has any
  const s2 = seedDeployed()
  store.migrateStorage()
  assert.deepEqual(marksOf(store.loadSemesterCourses('sem3', undefined, true).find(c => c.courseCode === 'MAJOR')), marksOf(s2.majors.ds))
  console.log('Selected major blank or missing: MAJOR filled from the most complete other major (tie to aiml, ds, cyber, cloud order)')
}

// 18. M1: a tab still on the old version saves over migrated data (reviewer probe S1).
// Tab B migrates; tab A (old, loaded before the deploy) then edits EE and the major course
// and saves its whole old-format list plus the per-major key. The next load repairs it.
{
  const seed = seedDeployed({ shared: DEPLOYED_SHARED().filter(c => c.courseCode !== 'MY101') })
  const tabA = seed.shared.map(c => ({ ...c }))
  store.migrateStorage() // tab B
  const editedShared = tabA.map(c => (c.courseCode === 'EE' ? enrichCourse({ ...c, seeMarks: 28 }) : c))
  const editedMajor = enrichCourse({ ...seed.majors.ds, seeMarks: 29 })
  localStorage.setItem(SHARED, JSON.stringify(editedShared)) // tab A save effect
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', JSON.stringify([editedMajor]))
  const staleShared = localStorage.getItem(SHARED)
  const staleSgpa = oldSgpa(editedShared, editedMajor, true) // what tab A showed
  store.migrateStorage() // next load of the new build
  const view = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
  assert.deepEqual(codes(view), ['CS2806', 'CS2000', 'CS2403', 'CS2404', 'EE', 'MAJOR', 'UE', 'MINOR1', 'MINOR2'])
  assert.deepEqual(marksOf(view.find(c => c.courseCode === 'MAJOR')), marksOf(editedMajor), 'MAJOR rebuilt from the stale major key')
  assert.equal(view.find(c => c.courseCode === 'EE').seeMarks, 28, 'stale edit kept')
  assert.equal(calculateSGPA(view).toFixed(6), staleSgpa.toFixed(6), 'SGPA matches what the old tab showed')
  assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_major_ds'), null)
  const bk = [...mem.keys()].filter(k => k.includes('_stale_'))
  assert.ok(bk.some(k => k.startsWith(SHARED + '_stale_') && mem.get(k) === staleShared), 'stale list backed up')
  assert.ok(bk.some(k => k.startsWith('sgpa_calc_v2_sem3_major_ds_stale_')), 'stale major key backed up')
  assert.equal(localStorage.getItem(SHARED + BK), JSON.stringify(seed.shared), 'migration backup untouched')
  const snap = snapshot()
  store.migrateStorage()
  assert.equal(snapshot(), snap, 'repair is idempotent')
  console.log(`Stale old-version tab (probe S1): MINOR1/MINOR2 and MAJOR restored, SGPA ${staleSgpa.toFixed(4)} (old tab) -> ${calculateSGPA(view).toFixed(4)}; second load is a no-op`)

  // S2: minor off in the old tab: rows come back inactive and the switch still reaches them
  const s2 = seedDeployed({ minors: '[]', shared: DEPLOYED_SHARED().map(c => (c.courseCode.startsWith('LW') ? { ...c, inactive: true } : c)) })
  store.migrateStorage()
  localStorage.setItem(SHARED, JSON.stringify(s2.shared))
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', JSON.stringify([s2.majors.ds]))
  store.migrateStorage()
  const v2 = store.loadSemesterCourses('sem3', undefined, store.resolveMinorOn())
  assert.equal(store.resolveMinorOn(), false)
  assert.ok(v2.filter(c => isMinorCode('sem3', c.courseCode)).every(c => c.inactive && c.totalMarks !== null))
  assert.equal(calculateSGPA(v2).toFixed(6), oldSgpa(s2.shared, s2.majors.ds, false).toFixed(6))
  const v2on = syncMinorCourses(v2, 'sem3', true, store.blankCourse)
  assert.equal(calculateSGPA(v2on).toFixed(6), oldSgpa(s2.shared, s2.majors.ds, true).toFixed(6), 'switching the minor on reaches the repaired rows')
  console.log('Stale tab with the minor off: MINOR rows inactive with marks, minor switch still reaches them')
}

// 19. M1 details: merging old minor rows into existing MINOR rows, reappeared settings, failed writes.
{
  const lw55 = varied(row('LW2055', 'Old minor course A', 3), 2)
  const lw32 = varied(row('LW2032', 'Old minor course B', 3), 3)
  const base = () => store.loadSemesterCourses('sem3', undefined, true).filter(c => !isMinorCode('sem3', c.courseCode))
  // blank MINOR1 takes the old marks; marked MINOR1 is kept and the marked old row stays; a blank old row is dropped
  seedDeployed(); store.migrateStorage()
  localStorage.setItem(SHARED, JSON.stringify([...base(), row('MINOR1', 'Minor Course 1', 3), lw55, varied(row('MINOR2', 'Minor Course 2', 3), 8), lw32, row('LW2055', 'Old minor course A', 3)]))
  store.migrateStorage()
  let list = JSON.parse(localStorage.getItem(SHARED))
  const m1 = list.filter(c => c.courseCode === 'MINOR1')
  assert.equal(m1.length, 1, 'one MINOR1 row')
  assert.deepEqual(marksOf(m1[0]).slice(1), marksOf(lw55).slice(1), 'blank MINOR1 took the old marks')
  assert.equal(list.filter(c => c.courseCode === 'MINOR2').length, 1)
  assert.equal(list.find(c => c.courseCode === 'MINOR2').totalMarks, varied(row('X', 'x', 3), 8).totalMarks, 'marked MINOR2 kept')
  assert.equal(list.filter(c => c.courseCode === 'LW2032').length, 1, 'both marked: old row left as is')
  assert.equal(list.filter(c => c.courseCode === 'LW2055').length, 0, 'blank old row dropped')
  // reappeared old minors setting updates the switch and is removed
  localStorage.setItem(MINOR, 'false')
  localStorage.setItem('sgpa_minors_v1', '["crim"]')
  localStorage.setItem('sgpa_major_v1', '{"id":"aiml"}')
  store.migrateStorage()
  assert.equal(localStorage.getItem(MINOR), 'true')
  assert.equal(localStorage.getItem('sgpa_minors_v1'), null)
  assert.equal(localStorage.getItem('sgpa_major_v1'), null)
  assert.ok([...mem.keys()].some(k => k.startsWith('sgpa_minors_v1_stale_')))
  localStorage.setItem('sgpa_minors_v1', '[]')
  store.migrateStorage()
  assert.equal(localStorage.getItem(MINOR), 'false')
  // MAJOR present but blank: filled from a reappeared key; MAJOR with marks is left alone
  seedDeployed(); store.migrateStorage()
  const blankMajor = store.loadSemesterCourses('sem3', undefined, true).map(c => (c.courseCode === 'MAJOR' ? row('MAJOR', 'Major Course', 3) : c))
  store.saveSemesterCourses('sem3', undefined, blankMajor)
  const aiml = varied(row('CS2227', 'x', 3), 4)
  localStorage.setItem('sgpa_calc_v2_sem3_major_aiml', JSON.stringify([aiml]))
  store.migrateStorage()
  const filled = store.loadSemesterCourses('sem3', undefined, true).find(c => c.courseCode === 'MAJOR')
  assert.equal(filled.totalMarks, aiml.totalMarks, 'blank MAJOR filled from the reappeared key')
  assert.equal(filled.id, blankMajor.find(c => c.courseCode === 'MAJOR').id, 'row identity kept')
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', JSON.stringify([varied(row('CS2231', 'x', 3), 0)]))
  store.migrateStorage()
  assert.equal(store.loadSemesterCourses('sem3', undefined, true).find(c => c.courseCode === 'MAJOR').totalMarks, aiml.totalMarks, 'MAJOR with marks left alone')
  // failed write: nothing removed, next load repairs
  const fs = seedDeployed(); store.migrateStorage()
  const s = fs.shared
  localStorage.setItem(SHARED, JSON.stringify(s)) // stale tab
  localStorage.setItem('sgpa_calc_v2_sem3_major_ds', JSON.stringify([fs.majors.ds]))
  failWrite = k => k === SHARED
  store.migrateStorage()
  assert.ok(localStorage.getItem('sgpa_calc_v2_sem3_major_ds'), 'failed write: per-major key kept')
  assert.equal(localStorage.getItem(SHARED), JSON.stringify(s))
  failWrite = () => false
  store.migrateStorage()
  assert.equal(localStorage.getItem('sgpa_calc_v2_sem3_major_ds'), null)
  assert.ok(JSON.parse(localStorage.getItem(SHARED)).some(c => c.courseCode === 'MAJOR'))
  console.log('Stale repair: blank MINOR row takes old marks, both marked keeps both, blank old row dropped; old settings applied and removed; blank MAJOR filled; failed write retried')
}

// 20. Old CSV exports: retired Sem 3 codes map to the generic rows on import.
{
  const mapped = store.mapRetiredSem3Codes([{ courseCode: 'LW2055', courseName: 'a', credits: 3 }, { courseCode: 'lw2032', courseName: 'b', credits: 3 },
    { courseCode: 'CS2231', courseName: 'c', credits: 3 }, { courseCode: 'CS2227', courseName: 'd', credits: 3 }, { courseCode: 'CS2806', courseName: 'Calculus', credits: 2 }])
  assert.deepEqual(codes(mapped), ['MINOR1', 'MINOR2', 'MAJOR', 'MAJOR', 'CS2806'])
  assert.deepEqual(mapped.map(c => c.courseName), ['Minor Course 1', 'Minor Course 2', 'Major Course', 'Major Course', 'Calculus'])
  const fitted = syncMinorCourses(dedupeByCode(mapped.map(store.blankCourse)), 'sem3', true, store.blankCourse)
  assert.deepEqual(codes(fitted), ['MINOR1', 'MINOR2', 'MAJOR', 'CS2806'], 'one MAJOR row, no extra blank minor rows')
  console.log('CSV import: LW2055/LW2032 -> MINOR1/MINOR2, CS2227/CS2231/CS2405/CS2500 -> MAJOR (one row)')
}

// Field-level fill: the winner's blank fields come from the other copy, nothing filled is cleared.
const merged = mergeByCode([enrichCourse({ courseCode: 'X', credits: 3, cie1Marks: 10, cie2Marks: 12, cie3Marks: 12, seeMarks: null })],
  [enrichCourse({ courseCode: 'X', credits: 3, cie1Marks: 15, cie2Marks: null, cie3Marks: null, seeMarks: 20 })], true)[0]
assert.equal([merged.cie1Marks, merged.cie2Marks, merged.cie3Marks, merged.seeMarks].join('/'), '10/12/12/20')
assert.equal(merged.totalMarks, 54)

assert.deepEqual(SEM3_CORE_COURSES.slice(0, 5).map(c => [c.courseCode, c.credits]), [['CS2806', 2], ['CS2000', 4], ['CS2403', 3], ['CS2404', 3], ['EE', 2]])
console.log('OK: Sem 3 credit and storage checks passed')
