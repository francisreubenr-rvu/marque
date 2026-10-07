import { GRADING_SCALE, ASSESSMENT_CAPS } from './constants.js'

// RVU pass thresholds: 40% per CIE, 28/70 cumulative CIE
const CIE_MIN = { cie1: 8, cie2: 10, cie3: 10 }
const CIE_TOTAL_MIN = 28
// CIE key strings match the reverse-calc pending keys
const CIE_KEY_MIN = { 'CIE 1': 8, 'CIE 2': 10, 'CIE 3': 10 }

export function getGradeInfo(totalMarks) {
  if (totalMarks === null || totalMarks === undefined || totalMarks === '') return null
  const m = Number(totalMarks)
  if (isNaN(m)) return null
  // GRADING_SCALE is ordered descending by min — only check lower bound
  return GRADING_SCALE.find(r => m >= r.min) ?? GRADING_SCALE[GRADING_SCALE.length - 1]
}

// Parse a single mark field — clamp to [0, cap] if cap is provided
function parseMark(v, cap) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return cap !== undefined ? Math.min(cap, Math.max(0, n)) : n
}

export function enrichCourse(course) {
  if (course.directGrade) {
    const row = GRADING_SCALE.find(r => r.grade === course.directGrade)
    if (row) {
      return {
        ...course,
        cie1Marks: null, cie2Marks: null, cie3Marks: null, seeMarks: null,
        totalMarks: row.min,
        grade: row.grade,
        gradePoint: row.point,
        creditGradeProduct: course.credits * row.point,
        passWarnings: { cie1: false, cie2: false, cie3: false, total: false },
      }
    }
  }

  const cie1 = parseMark(course.cie1Marks, ASSESSMENT_CAPS.cie1)
  const cie2 = parseMark(course.cie2Marks, ASSESSMENT_CAPS.cie2)
  const cie3 = parseMark(course.cie3Marks, ASSESSMENT_CAPS.cie3)
  const see  = parseMark(course.seeMarks,  ASSESSMENT_CAPS.see)

  const passWarnings = {
    cie1:  cie1 !== null && cie1 < CIE_MIN.cie1,
    cie2:  cie2 !== null && cie2 < CIE_MIN.cie2,
    cie3:  cie3 !== null && cie3 < CIE_MIN.cie3,
    // Fires only when even scoring maximum on remaining CIEs can't reach the 28/70 threshold
    total: (cie1 !== null || cie2 !== null || cie3 !== null) &&
      ((cie1 !== null ? cie1 : ASSESSMENT_CAPS.cie1) +
       (cie2 !== null ? cie2 : ASSESSMENT_CAPS.cie2) +
       (cie3 !== null ? cie3 : ASSESSMENT_CAPS.cie3)) < CIE_TOTAL_MIN,
  }

  const allEntered = cie1 !== null && cie2 !== null && cie3 !== null && see !== null

  if (!allEntered) {
    return { ...course, cie1Marks: cie1, cie2Marks: cie2, cie3Marks: cie3, seeMarks: see,
      totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null, passWarnings }
  }

  const totalMarks = cie1 + cie2 + cie3 + see
  const info = getGradeInfo(totalMarks)

  return {
    ...course,
    cie1Marks: cie1, cie2Marks: cie2, cie3Marks: cie3, seeMarks: see,
    totalMarks,
    grade: info?.grade ?? null,
    gradePoint: info?.point ?? null,
    creditGradeProduct: info !== null ? course.credits * info.point : null,
    passWarnings,
  }
}

export function calculateSGPA(courses) {
  // Inactive courses (a minor that is switched off) keep their marks but do not count.
  const scored = courses.filter(c => !c.inactive && c.creditGradeProduct !== null)
  if (scored.length === 0) return null
  const totalCGP     = scored.reduce((s, c) => s + Number(c.creditGradeProduct), 0)
  const totalCredits = scored.reduce((s, c) => s + (Number(c.credits) || 0), 0)
  return totalCredits > 0 ? totalCGP / totalCredits : null
}

// Valid grade points in the RVU scale (no 1, 2, 3)
const VALID_GPS = [0, 4, 5, 6, 7, 8, 9, 10]

export function reverseCalculate(courses, targetSGPA) {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0)
  if (totalCredits === 0) return []

  const requiredTotalCGP   = targetSGPA * totalCredits
  const locked             = courses.filter(c => c.creditGradeProduct !== null)
  const variable           = courses.filter(c => c.creditGradeProduct === null)
  const lockedCGP          = locked.reduce((s, c) => s + c.creditGradeProduct, 0)
  const variableCredits    = variable.reduce((s, c) => s + c.credits, 0)
  const neededFromVariable = requiredTotalCGP - lockedCGP

  if (variableCredits === 0) {
    return [
      ...locked.map(c => ({ ...c, targetGrade: c.grade, targetGradePoint: c.gradePoint, feasible: true, locked: true })),
    ]
  }

  // Pass 1: uniform minimum GP
  const rawMinGP       = neededFromVariable / variableCredits
  const uniformIdx     = VALID_GPS.findIndex(gp => gp >= rawMinGP)
  const globalImpossible = uniformIdx === -1
  const uniformGP      = globalImpossible ? 10 : VALID_GPS[uniformIdx]

  // Pass 2: difficulty-aware adjustment
  // Easy courses are expected to perform one GP tier higher.
  // This frees up pressure on medium/hard courses.
  const easy = variable.filter(c => (c.difficulty ?? 'medium') === 'easy')
  const rest  = variable.filter(c => (c.difficulty ?? 'medium') !== 'easy')

  const dopeGP  = globalImpossible ? 10 : VALID_GPS[Math.min(uniformIdx + 1, VALID_GPS.length - 1)]
  const easyCGP = easy.reduce((s, c) => s + c.credits * dopeGP, 0)

  let restGP = uniformGP, restImpossible = globalImpossible
  if (rest.length > 0 && !globalImpossible) {
    const restCredits     = rest.reduce((s, c) => s + c.credits, 0)
    const remainingNeeded = neededFromVariable - easyCGP
    if (remainingNeeded <= 0) {
      restGP = 0; restImpossible = false
    } else {
      const restRawMin = remainingNeeded / restCredits
      const restIdx    = VALID_GPS.findIndex(gp => gp >= restRawMin)
      restImpossible   = restIdx === -1
      restGP           = restImpossible ? 10 : VALID_GPS[restIdx]
    }
  }

  const getAssignment = (course) => {
    if (globalImpossible) return { gp: 10, impossible: true }
    return (course.difficulty ?? 'medium') === 'easy'
      ? { gp: dopeGP, impossible: false }
      : { gp: restGP, impossible: restImpossible }
  }

  const result = []

  for (const course of variable) {
    const { gp: effectiveGP, impossible: courseImpossible } = getAssignment(course)
    const gradeRow      = GRADING_SCALE.find(r => r.point === effectiveGP)
    const minTotal      = gradeRow ? gradeRow.min : 0

    const scoredSoFar   = (course.cie1Marks ?? 0) + (course.cie2Marks ?? 0) +
                          (course.cie3Marks ?? 0) + (course.seeMarks  ?? 0)

    const pendingRaw = []
    if (course.cie1Marks === null) pendingRaw.push({ key: 'CIE 1', max: ASSESSMENT_CAPS.cie1 })
    if (course.cie2Marks === null) pendingRaw.push({ key: 'CIE 2', max: ASSESSMENT_CAPS.cie2 })
    if (course.cie3Marks === null) pendingRaw.push({ key: 'CIE 3', max: ASSESSMENT_CAPS.cie3 })
    if (course.seeMarks  === null) pendingRaw.push({ key: 'SEE',   max: ASSESSMENT_CAPS.see  })

    const maxFromPending    = pendingRaw.reduce((s, p) => s + p.max, 0)
    const neededFromPending = Math.max(0, minTotal - scoredSoFar)
    const feasible          = !courseImpossible && neededFromPending <= maxFromPending

    // Distribute neededFromPending proportionally across pending assessments
    let rem = neededFromPending
    const distrib = pendingRaw.map((p, i) => {
      let target
      if (i < pendingRaw.length - 1) {
        target = maxFromPending > 0 ? Math.round(neededFromPending * p.max / maxFromPending) : 0
        rem -= target
      } else {
        target = Math.max(0, rem)
      }
      return { ...p, target: Math.min(p.max, Math.max(0, target)) }
    })

    // Enforce per-CIE 40% minimums (8/10/10) on pending CIEs
    const pass1 = distrib.map(p => {
      const floor = CIE_KEY_MIN[p.key] ?? 0
      return floor > 0 ? { ...p, target: Math.min(p.max, Math.max(p.target, floor)) } : p
    })

    // Enforce cumulative CIE total ≥ 28
    const scoredCIE   = (course.cie1Marks ?? 0) + (course.cie2Marks ?? 0) + (course.cie3Marks ?? 0)
    const pendingCIETotal = pass1.filter(p => p.key !== 'SEE').reduce((s, p) => s + p.target, 0)
    let cieGap = Math.max(0, CIE_TOTAL_MIN - scoredCIE - pendingCIETotal)
    const pending = pass1.map(p => {
      if (p.key === 'SEE' || cieGap <= 0) return p
      const boost = Math.min(p.max - p.target, cieGap)
      cieGap -= boost
      return { ...p, target: p.target + boost }
    })

    result.push({
      ...course,
      targetGrade:      gradeRow?.grade ?? 'F',
      targetGradePoint: effectiveGP,
      scoredSoFar, neededFromPending, maxFromPending, pending,
      feasible, locked: false,
    })
  }

  for (const course of locked) {
    result.push({ ...course, targetGrade: course.grade, targetGradePoint: course.gradePoint, feasible: true, locked: true })
  }

  return result
}

export function exportToCSV(courses, sgpa) {
  const headers = ['Course Code','Course Name','Credits','CIE 1 (/20)','CIE 2 (/25)','CIE 3 (/25)','SEE (/30)','Total','Grade','Grade Points','Cr×GP']
  const rows = courses.map(c => [
    c.courseCode,
    `"${c.courseName}"`,
    c.credits,
    c.cie1Marks ?? '',
    c.cie2Marks ?? '',
    c.cie3Marks ?? '',
    c.seeMarks  ?? '',
    c.totalMarks ?? '',
    c.grade ?? '',
    c.gradePoint ?? '',
    c.creditGradeProduct ?? '',
  ])
  const footer = ['','','','','','','','SGPA', sgpa !== null ? sgpa.toFixed(2) : '—','','']
  const csv = [headers, ...rows, footer].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `SGPA_Report_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function calculateSGPAFromGradeMap(courses, gradeMap, defaultGP = 6) {
  if (!courses.length) return null
  let cgp = 0, credits = 0
  for (const c of courses) {
    const gp = gradeMap[c.id] !== undefined ? gradeMap[c.id] : (c.gradePoint ?? defaultGP)
    cgp += c.credits * gp
    credits += c.credits
  }
  return credits === 0 ? null : cgp / credits
}

export function encodeShareState(courses) {
  const data = courses.map(c => ({
    cc: c.courseCode, cn: c.courseName, cr: c.credits,
    c1: c.cie1Marks, c2: c.cie2Marks, c3: c.cie3Marks, se: c.seeMarks,
  }))
  return btoa(encodeURIComponent(JSON.stringify(data)))
}

export function decodeShareState(encoded) {
  try {
    const data = JSON.parse(decodeURIComponent(atob(encoded)))
    return data.map((d, i) => ({
      id: `shared-${i}`,
      courseCode: d.cc, courseName: d.cn, credits: d.cr,
      cie1Marks: d.c1 ?? null, cie2Marks: d.c2 ?? null,
      cie3Marks: d.c3 ?? null, seeMarks:  d.se ?? null,
      totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
    }))
  } catch {
    return null
  }
}
