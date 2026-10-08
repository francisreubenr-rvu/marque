import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SpaceSelectionScreen from './components/Space'
import { RippleBtn, ParticleField, ScanLine, CursorFollower } from './components/animations'
import Header from './components/Header'
import CourseManager from './components/CourseManager'
import Dashboard from './components/Dashboard'
import ReverseCalculator from './components/ReverseCalculator'
import Settings from './components/Settings'
import CGPABox from './components/CGPABox'
import Footer from './components/Footer'
import { useToast } from './components/Toast'
import { enrichCourse, calculateSGPA } from './utils/calculations'
import { saveMinorOn } from './utils/localStorage'
import { SEMESTERS, DIVIDES, MINOR_COURSES, LS_KEY_PREFIX, LS_SELECTION } from './utils/constants'
import { courseTemplate, isCommonSemester, isMinorCode, syncMinorCourses, activeCourses, dedupeByCode } from './utils/semesterTemplates'
import {
  courseKey, blankCourse, makeCoursesFromTemplate, loadSemesterCourses, saveSemesterCourses,
  clearSemesterCourses, resolveMinorOn, normalizeSelection, migrateStorage,
  loadSelection, saveSelection,
} from './utils/semesterStore'

// ── Migrate legacy sem1_CSE key → sem1_ES or sem1_EEX ───────
;(() => {
  try {
    const oldKey = `${LS_KEY_PREFIX}_sem1_CSE`
    const raw = localStorage.getItem(oldKey)
    if (!raw) return
    const courses = JSON.parse(raw)
    const isES = Array.isArray(courses) && courses.some(c => c.courseCode === 'CS1806')
    const newDivide = isES ? 'ES' : 'EEX'
    localStorage.setItem(`${LS_KEY_PREFIX}_sem1_${newDivide}`, raw)
    localStorage.removeItem(oldKey)
    const selRaw = localStorage.getItem(LS_SELECTION)
    if (selRaw) {
      const sel = JSON.parse(selRaw)
      if (sel?.semester === 'sem1' && sel?.divide === 'CSE') {
        localStorage.setItem(LS_SELECTION, JSON.stringify({ ...sel, divide: newDivide }))
      }
    }
  } catch {}
})()

// ── Migrate older Sem 3 layouts (per-major lists, named minor) to generic slots ──
migrateStorage()

// ── useCGPA ──────────────────────────────────────────────────
// Credit-weighted over every scored, active course of each counted semester.
// Sem 1/2: on the semester being viewed only the divide on screen counts; for other
// semesters every stored divide still counts, because the app does not record which
// divide a student belongs to there. Common semesters count their one list.
function useCGPA(courses, selection, minorOn) {
  return useMemo(() => {
    let cgp = 0, cr = 0
    const seen = new Set()
    for (const sem of SEMESTERS) {
      if (!sem.available || sem.comingSoon) continue
      const isCurSem = selection?.semester === sem.id
      let lists
      if (sem.common) {
        lists = [isCurSem ? courses : activeCourses(loadSemesterCourses(sem.id, null, minorOn))]
      } else {
        const divs = isCurSem ? [{ id: selection.divide }] : (DIVIDES[sem.id] || [])
        lists = divs.map(div => isCurSem ? courses : (() => {
          try {
            const r = localStorage.getItem(courseKey(sem.id, div.id))
            return r ? JSON.parse(r).map(enrichCourse) : []
          } catch { return [] }
        })())
      }
      for (const sc of lists) {
        const scored = sc.filter(c => !c.inactive && c.creditGradeProduct !== null)
        if (!scored.length) continue
        seen.add(sem.id)
        scored.forEach(c => { cgp += Number(c.creditGradeProduct); cr += Number(c.credits) || 0 })
      }
    }
    return cr > 0 ? { cgpa: cgp / cr, sems: seen.size, credits: cr } : null
  }, [courses, selection, minorOn])
}

// ── Blueprint Background ──────────────────────────────────────
function BlueprintBg() {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 55% 35%, rgba(99,102,241,.065) 0%, transparent 70%), radial-gradient(ellipse 45% 45% at 15% 70%, rgba(129,140,248,.04) 0%, transparent 60%)' }} />
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,.055) 1px, transparent 1px)', backgroundSize:'28px 28px' }} />
      <div style={{ position:'absolute', top:'35%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:400, background:'radial-gradient(ellipse at center, rgba(241,180,151,.05) 0%, transparent 70%)' }} />
      <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.055 }}>
        <line x1="0" y1="450" x2="1400" y2="450" stroke="#818cf8" strokeWidth=".3" strokeDasharray="5 12"/>
        <line x1="700" y1="0"  x2="700"  y2="900" stroke="#818cf8" strokeWidth=".3" strokeDasharray="5 12"/>
        <circle cx="700" cy="450" r="310" fill="none" stroke="#818cf8" strokeWidth=".35"/>
        <circle cx="700" cy="450" r="220" fill="none" stroke="#818cf8" strokeWidth=".35"/>
        <circle cx="700" cy="450" r="130" fill="none" stroke="#818cf8" strokeWidth=".35"/>
        <circle cx="700" cy="450" r="48"  fill="none" stroke="#F1B497" strokeWidth=".5" opacity=".8"/>
        <circle cx="700" cy="450" r="6"   fill="#F1B497" opacity=".6"/>
        <rect x="28" y="28" width="118" height="72" fill="none" stroke="#818cf8" strokeWidth=".35"/>
        <line x1="28" y1="50" x2="146" y2="50" stroke="#818cf8" strokeWidth=".25"/>
        <text x="36" y="44" fill="#818cf8" fontSize="7.5" fontFamily="monospace">SGPA CALCULATOR</text>
        <text x="36" y="64" fill="#818cf8" fontSize="6.5" fontFamily="monospace">PROJECT  GPA-2026</text>
        <text x="36" y="76" fill="#818cf8" fontSize="6.5" fontFamily="monospace">SCALE    1:250</text>
      </svg>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────
const MINOR_COLOR = '#C9A0FF'

function Hero({ selection, sgpa, courses, minorOn = false, onToggleMinor }) {
  const isCommonSem = selection ? isCommonSemester(selection.semester) : false
  const minorRows   = isCommonSem ? (MINOR_COURSES[selection.semester] ?? []) : []

  return (
    <div style={{ position:'relative', overflow:'hidden', background:'#090c15', minHeight:'48vh', display:'flex', alignItems:'flex-end' }}>
      <BlueprintBg />
      <ParticleField count={22} />
      <ScanLine />
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:1200, margin:'0 auto', padding:'0 24px 44px', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
        <div style={{ paddingTop:88 }}>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'3px', color:'#8B8986', textTransform:'uppercase', marginBottom:22, animation:'fadeUp .5s ease .1s both' }}>
            RV University · SGPA Calculator
            {selection && (
              <span style={{ marginLeft:12, padding:'2px 8px', background:'rgba(241,180,151,.1)', color:'#F1B497' }}>
                {selection.semester.toUpperCase()}{!isCommonSem && ` · ${selection.divide}`}
              </span>
            )}
            {minorRows.length > 0 && (
              <button type="button" onClick={() => onToggleMinor?.()}
                title={`${minorOn ? 'Remove' : 'Add'} the minor (${minorRows.map(c => c.courseCode).join(', ')})`}
                aria-pressed={minorOn}
                style={{ marginLeft:8, padding:'2px 8px', cursor:'pointer', font:'inherit', letterSpacing:'inherit', textTransform:'inherit',
                  background: minorOn ? `${MINOR_COLOR}15` : 'transparent',
                  color: minorOn ? MINOR_COLOR : 'rgba(255,255,255,.38)',
                  border: `1px ${minorOn ? 'solid' : 'dashed'} ${minorOn ? MINOR_COLOR + '30' : 'rgba(255,255,255,.18)'}`,
                  transition:'color .15s, border-color .15s, background .15s' }}>
                {minorOn ? '◇ Minor' : '+ Minor'}
              </button>
            )}
          </p>
          <h1 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:'clamp(48px,9vw,118px)', letterSpacing:'-3px', color:'#F5EFEB', lineHeight:0.92, margin:0 }}>
            <span style={{ display:'block', overflow:'hidden' }}><span style={{ display:'block', animation:'clipReveal .8s cubic-bezier(.76,0,.24,1) .2s both' }}>SGPA</span></span>
            <span style={{ display:'block', overflow:'hidden' }}><span style={{ display:'block', color:'#F1B497', animation:'clipReveal .8s cubic-bezier(.76,0,.24,1) .38s both' }}>Calculator.</span></span>
          </h1>
          <p style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontSize:13, color:'#8B8986', marginTop:22, maxWidth:320, lineHeight:1.65, animation:'fadeUp .5s ease .6s both' }}>
            Enter CIE and SEE marks below. SGPA updates in real-time using RVU's credit-weighted grading scale.
          </p>
        </div>
        {sgpa !== null && (
          <div style={{ display:'flex', alignItems:'baseline', gap:8, flexShrink:0, animation:'fadeUp .6s ease .5s both' }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:'#8B8986', letterSpacing:'2px' }}>CURRENT</span>
            <span style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:'clamp(64px,11vw,138px)', color:'#F1B497', letterSpacing:'-4px', lineHeight:1, animation:'glowPulse 3s ease 1.2s infinite' }}>
              {sgpa.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      {courses.length > 0 && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, borderTop:'1px solid rgba(255,255,255,.06)', padding:'10px 0', overflow:'hidden', background:'rgba(8,11,20,.5)' }}>
          <div style={{ display:'flex', animation:'mq 28s linear infinite', width:'max-content', whiteSpace:'nowrap' }}>
            {[0,1].map(rep => courses.map(c => (
              <span key={`${rep}-${c.id}`} style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:13, color:'#8B8986', padding:'0 28px', flexShrink:0 }}>
                <span style={{ color:'#F1B497', fontSize:10, marginRight:12 }}>✦</span>{c.courseName}
              </span>
            )))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Float Button ──────────────────────────────────────────────
function FloatBtn({ onClick }) {
  return (
    <motion.button
      initial={{ opacity:0, scale:.6 }}
      animate={{ opacity:1, scale:1 }}
      transition={{ delay:1.0, type:'spring', stiffness:300 }}
      whileHover={{ rotate:45, scale:1.1, background:'#DEA083' }}
      onClick={onClick}
      title="Back to courses"
      className="fixed bottom-6 left-5 sm:bottom-7 sm:left-7 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl"
      style={{ background:'#F1B497', color:'#F5EFEB', boxShadow:'0 4px 24px rgba(241,180,151,.45)', border:'none' }}
    >
      ✦
    </motion.button>
  )
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const toast = useToast()
  const [selection,   setSelection]  = useState(() => normalizeSelection(loadSelection()))
  const [minorOn,     setMinorOn]    = useState(() => resolveMinorOn())
  // allCourses includes inactive minor courses (kept for their marks); everything on screen uses `courses`.
  const [allCourses,  setCourses]    = useState(() => {
    if (!selection) return []
    return loadSemesterCourses(selection.semester, selection.divide, minorOn)
  })
  const courses = useMemo(() => activeCourses(allCourses), [allCourses])
  const [activeTab,   setActiveTab]  = useState('courses')
  const [switchOpen,  setSwitchOpen] = useState(false)

  // Keep storage in step with a repaired selection (writes stay out of render).
  useEffect(() => {
    if (JSON.stringify(loadSelection()) !== JSON.stringify(selection)) saveSelection(selection)
  }, [selection])

  useEffect(() => {
    if (selection) saveSemesterCourses(selection.semester, selection.divide, allCourses)
  }, [allCourses, selection])

  // Persist the minor switch (also makes an inferred value explicit) and flag or
  // unflag minor courses. Nothing is deleted, so marks survive an off and on cycle.
  useEffect(() => { saveMinorOn(minorOn) }, [minorOn])
  useEffect(() => {
    if (selection && isCommonSemester(selection.semester)) {
      setCourses(prev => syncMinorCourses(prev, selection.semester, minorOn, blankCourse))
    }
  }, [minorOn, selection])

  const handleSelect = useCallback((semester, divide) => {
    // Common semesters have one list for every student: no divide.
    const sel = isCommonSemester(semester) ? { semester } : { semester, divide }
    saveSelection(sel)
    setSelection(sel)
    setCourses(loadSemesterCourses(sel.semester, sel.divide, minorOn))
    setSwitchOpen(false)
    setActiveTab('courses')
  }, [minorOn])

  const toggleMinor = useCallback(() => setMinorOn(prev => !prev), [])

  const updateCourse = useCallback((id, patch) => {
    setCourses(prev => prev.map(c => c.id === id ? enrichCourse({ ...c, ...patch }) : c))
  }, [])

  // Common semesters: a minor course typed or imported while the minor is off gets a
  // hint (side effects run here, outside any state updater) ...
  const minorHint = useCallback((list) => {
    if (!selection || !isCommonSemester(selection.semester) || minorOn) return
    for (const c of list) {
      if (isMinorCode(selection.semester, c.courseCode)) toast?.(`${c.courseCode} is a minor course; switch the minor on to count it`, 'info')
    }
  }, [selection, minorOn, toast])

  // ... and the list is then made consistent: one row per code, minor rows following the switch. Pure.
  const fitToSemester = useCallback((list) => {
    if (!selection || !isCommonSemester(selection.semester)) return list
    return syncMinorCourses(dedupeByCode(list), selection.semester, minorOn, blankCourse)
  }, [selection, minorOn])

  const addCourse = useCallback((data) => {
    const course = enrichCourse({
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      courseCode: data.courseCode, courseName: data.courseName, credits: data.credits,
      cie1Marks: data.cie1Marks ?? null, cie2Marks: data.cie2Marks ?? null,
      cie3Marks: data.cie3Marks ?? null, seeMarks:  data.seeMarks  ?? null,
      totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
    })
    minorHint([course])
    setCourses(prev => fitToSemester([...prev, course]))
  }, [minorHint, fitToSemester])

  const deleteCourse = useCallback((id) => {
    setCourses(prev => prev.filter(c => c.id !== id))
  }, [])

  const importCourses = useCallback((newCourses) => {
    const imported = newCourses.map((c, i) => enrichCourse({
      id: `c-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      courseCode: c.courseCode, courseName: c.courseName, credits: c.credits,
      cie1Marks: null, cie2Marks: null, cie3Marks: null, seeMarks: null,
      totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
    }))
    minorHint(imported)
    // Keep switched-off minor courses (and their marks) unless the import replaces them,
    // then apply the minor switch to the result so imported minor rows match it.
    setCourses(prev => fitToSemester([...imported, ...prev.filter(c => c.inactive && !imported.some(n => n.courseCode === c.courseCode))]))
  }, [minorHint, fitToSemester])

  const resetAll = useCallback(() => {
    if (!selection) return
    clearSemesterCourses(selection.semester, selection.divide)
    setCourses(makeCoursesFromTemplate(courseTemplate(selection.semester, selection.divide, minorOn)))
  }, [selection, minorOn])

  const sgpa         = calculateSGPA(courses)
  const scored       = courses.filter(c => c.creditGradeProduct !== null)
  const totalCredits = scored.reduce((s, c) => s + (Number(c.credits) || 0), 0)
  const totalCGP     = scored.reduce((s, c) => s + c.creditGradeProduct, 0)
  const isCompleted  = SEMESTERS.find(s => s.id === selection?.semester)?.completed ?? false
  const isComingSoon = SEMESTERS.find(s => s.id === selection?.semester)?.comingSoon ?? false
  const cgpaData     = useCGPA(courses, selection, minorOn)

  // No selection — show full-screen space selector
  if (!selection && !switchOpen) {
    return <SpaceSelectionScreen onSelect={handleSelect} minorOn={minorOn} onToggleMinor={toggleMinor} />
  }

  // Switch overlay
  if (switchOpen) {
    return (
      <motion.div
        className="fixed inset-0 z-50 overflow-auto"
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        transition={{ duration:.25 }}
      >
        <SpaceSelectionScreen onSelect={handleSelect} onClose={() => setSwitchOpen(false)} minorOn={minorOn} onToggleMinor={toggleMinor} />
      </motion.div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d1525', fontFamily:"'Hanken Grotesk',system-ui,sans-serif" }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} selection={selection} sgpa={sgpa} onSwitch={() => setSwitchOpen(true)} />

      {activeTab === 'courses' && (
        <Hero selection={selection} sgpa={sgpa} courses={courses} minorOn={minorOn} onToggleMinor={toggleMinor} />
      )}

      {activeTab !== 'courses' && (
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'36px 24px 20px', animation:'fadeUp .4s ease both' }}>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'2.5px', textTransform:'uppercase', color:'#8B8986', marginBottom:10 }}>
            RV University · SGPA Calculator
          </p>
          <h1 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:'clamp(32px,5vw,56px)', letterSpacing:'-1.5px', color:'#F5EFEB', margin:0 }}>
            {activeTab === 'dashboard' ? 'Dashboard.' : activeTab === 'reverse' ? 'Reverse Calc.' : 'Settings.'}
          </h1>
        </div>
      )}

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px 80px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity:0, y:8 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-4 }}
            transition={{ duration:.18 }}
          >
            {activeTab === 'courses' && (
              <CourseManager courses={courses} onUpdate={updateCourse} onAdd={addCourse} onDelete={deleteCourse} completed={isCompleted} comingSoon={isComingSoon} />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard courses={courses} sgpa={sgpa} totalCredits={totalCredits} totalCGP={totalCGP} comingSoon={isComingSoon} onUpdateCourse={updateCourse} />
            )}
            {activeTab === 'reverse' && (
              <ReverseCalculator courses={courses} sgpa={sgpa} />
            )}
            {activeTab === 'settings' && (
              <Settings courses={courses} sgpa={sgpa} onReset={resetAll} onImport={importCourses} onSwitchDivide={() => setSwitchOpen(true)} selection={selection} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <CGPABox data={cgpaData} />
      <FloatBtn onClick={() => { setActiveTab('courses'); window.scrollTo({ top:0, behavior:'smooth' }) }} />
      <CursorFollower />
    </div>
  )
}
