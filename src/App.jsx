import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SpaceSelectionScreen from './components/Space'
import { TiltCard, OrbitalRing, RippleBtn, ParticleField, ScanLine, CursorFollower } from './components/animations'
import Header from './components/Header'
import CourseManager from './components/CourseManager'
import Dashboard from './components/Dashboard'
import ReverseCalculator from './components/ReverseCalculator'
import Settings from './components/Settings'
import CGPABox from './components/CGPABox'
import Footer from './components/Footer'
import { enrichCourse, calculateSGPA } from './utils/calculations'
import { loadMajor, saveMajor, loadMinors, saveMinors } from './utils/localStorage'
import { SEMESTERS, DIVIDES, MAJORS, MINORS, LS_KEY_PREFIX, LS_SELECTION } from './utils/constants'
import { courseTemplate, isMajorSemester, syncMinorCourses } from './utils/semesterTemplates'

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

// ── Storage helpers ──────────────────────────────────────────
function courseKey(semester, divide) {
  return `${LS_KEY_PREFIX}_${semester}_${divide}`
}
function loadSelection() {
  try { return JSON.parse(localStorage.getItem(LS_SELECTION)) } catch { return null }
}
function saveSelection(sel) {
  try { localStorage.setItem(LS_SELECTION, JSON.stringify(sel)) } catch {}
}
function loadCoursesForDivide(semester, divide) {
  try {
    const raw = localStorage.getItem(courseKey(semester, divide))
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Array.isArray(parsed) && parsed.length > 0) return parsed.map(c => enrichCourse(c))
  } catch {}
  return null
}
function saveCoursesForDivide(semester, divide, courses) {
  try { localStorage.setItem(courseKey(semester, divide), JSON.stringify(courses)) } catch {}
}
function blankCourse(c) {
  return enrichCourse({
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...c,
    cie1Marks: null, cie2Marks: null, cie3Marks: null, seeMarks: null,
    totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
  })
}
function makeCoursesFromTemplate(template) {
  return template.map(blankCourse)
}
// Saved marks win; otherwise start from the template. Major semesters also
// reconcile minor courses so toggling a minor never loses existing marks.
function coursesForSelection(semester, divide, majorId, minorIds) {
  const base = loadCoursesForDivide(semester, divide)
    ?? makeCoursesFromTemplate(courseTemplate(semester, divide, majorId, minorIds))
  return isMajorSemester(semester) ? syncMinorCourses(base, semester, minorIds, blankCourse) : base
}

// ── useCGPA ──────────────────────────────────────────────────
function useCGPA(courses, selection, majorId) {
  return useMemo(() => {
    let cgp = 0, cr = 0
    const seen = new Set()
    for (const sem of SEMESTERS) {
      if (!sem.available || sem.comingSoon) continue
      // Major semesters are stored per major; only the current major counts.
      const semMajor = selection?.semester === sem.id ? selection.divide : majorId
      const divs = sem.majorSem ? (semMajor ? [{ id: semMajor }] : []) : (DIVIDES[sem.id] || [])
      for (const div of divs) {
        const isCur = selection && sem.id === selection.semester && div.id === selection.divide
        const sc = isCur ? courses : (() => {
          try {
            const r = localStorage.getItem(courseKey(sem.id, div.id))
            return r ? JSON.parse(r).map(enrichCourse) : []
          } catch { return [] }
        })()
        const scored = sc.filter(c => c.creditGradeProduct !== null)
        if (!scored.length) continue
        seen.add(sem.id)
        scored.forEach(c => { cgp += c.creditGradeProduct; cr += c.credits })
      }
    }
    return cr > 0 ? { cgpa: cgp / cr, sems: seen.size, credits: cr } : null
  }, [courses, selection, majorId])
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

// ── Modal starfield (deterministic, no Math.random at module scope) ──
const MODAL_STARS = Array.from({ length: 32 }, (_, i) => ({
  id:    i,
  left:  (i * 37 + 7)  % 98,
  top:   (i * 61 + 11) % 95,
  size:  1 + (i % 4) * 0.55,
  delay: i * 0.38,
  dur:   2.6 + (i % 6) * 0.85,
}))

// ── Neural Orbit — Major Selector ─────────────────────────────
function NeuralOrbit({ savedMajor, onSelect }) {
  const [hov, setHov] = useState(null)
  const [sel, setSel] = useState(null)

  const handleSelect = (m) => {
    setSel(m.id)
    setTimeout(() => { saveMajor({ id: m.id }); onSelect(m) }, 550)
  }

  return (
    <div style={{ width:'100%', maxWidth:640, animation:'fadeUp .55s ease .1s both' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:14 }}>
        {MAJORS.map((m, i) => {
          const isH   = hov === m.id
          const isS   = sel === m.id
          const isCur = savedMajor?.id === m.id
          return (
            <TiltCard key={m.id} intensity={5}
              style={{ position:'relative', overflow:'hidden', cursor:'pointer', border:`1px solid ${isH || isCur ? m.color + '70' : m.color + '25'}`, background:`radial-gradient(ellipse at 30% 30%, ${m.color}10, transparent 65%), rgba(255,255,255,.03)`, animation:`majorReveal .5s ease ${0.08*i}s both`, transition:'border-color .2s' }}
              onMouseEnter={() => setHov(m.id)} onMouseLeave={() => setHov(null)}
              onClick={() => handleSelect(m)}
            >
              <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${m.color}12, transparent 60%, ${m.color}06)`, backgroundSize:'200% 200%', animation:'gradientShift 5s ease infinite', animationDelay:`${i*1.2}s` }} />
              {isS && (
                <div style={{ position:'absolute', inset:0, background:`${m.color}25`, zIndex:8, display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeUp .2s ease both' }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:m.color, letterSpacing:'2px' }}>SELECTED ✓</span>
                </div>
              )}
              {isCur && !isS && (
                <div style={{ position:'absolute', top:10, right:10, fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:'1.5px', textTransform:'uppercase', color:m.color, background:`${m.color}18`, padding:'2px 8px', border:`1px solid ${m.color}40`, zIndex:2 }}>Current</div>
              )}
              <div style={{ position:'relative', zIndex:1, padding:'22px 22px 18px' }}>
                <div style={{ position:'relative', width:68, height:68, marginBottom:16 }}>
                  <OrbitalRing color={m.color} size={68} speed={7} dotSize={5} />
                  <OrbitalRing color={m.color} size={48} speed={4.5} dotSize={3} reverse />
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, color:m.color, textShadow:isH?`0 0 20px ${m.color}, 0 0 40px ${m.color}60`:'none', transition:'text-shadow .25s' }}>
                    {m.glyph}
                  </div>
                </div>
                <h3 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:20, color:'#F5EFEB', marginBottom:5 }}>{m.label}</h3>
                <p style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'#8B8986', letterSpacing:'1px', textTransform:'uppercase', marginBottom:14 }}>{m.desc}</p>
                <div style={{ overflow:'hidden', maxHeight:isH?'120px':0, transition:'max-height .35s ease' }}>
                  <div style={{ borderTop:`1px solid ${m.color}25`, paddingTop:12, display:'flex', flexDirection:'column', gap:4 }}>
                    {m.courses.map((c, ci) => (
                      <div key={ci} style={{ display:'flex', alignItems:'center', gap:7, fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(255,255,255,.6)', animation:isH?`fadeUp .22s ease ${ci*0.06}s both`:'none' }}>
                        <div style={{ width:4, height:4, borderRadius:'50%', background:m.color, flexShrink:0, boxShadow:`0 0 6px ${m.color}` }} />{c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TiltCard>
          )
        })}
      </div>
    </div>
  )
}

// ── Selection Screen (SpaceSelectionScreen + NeuralOrbit overlay) ──
function SelectionScreen({ onSelect, onClose, savedMajor, onMajorChange, minors, onToggleMinor }) {
  const [showMajor,    setShowMajor]    = useState(false)
  const [pendingRoute, setPendingRoute] = useState(null)

  const handleSetMajor = (data) => {
    if (data?.pendingSem) setPendingRoute(data)
    setShowMajor(true)
  }

  const handleMajorSelect = (m) => {
    saveMajor({ id: m.id })
    onMajorChange?.({ id: m.id })
    setShowMajor(false)
    if (pendingRoute) {
      onSelect(pendingRoute.pendingSem, pendingRoute.pendingDivide)
      setPendingRoute(null)
    }
  }

  return (
    <>
      <SpaceSelectionScreen
        onSelect={onSelect}
        onClose={onClose}
        savedMajor={savedMajor}
        onSetMajor={handleSetMajor}
        minors={minors}
        onToggleMinor={onToggleMinor}
      />
      {showMajor && (
        <div
          style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(4,6,14,0.92)', backdropFilter:'blur(12px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', animation:'fadeIn .3s ease both', overflow:'hidden' }}
          onClick={e => { if (e.target === e.currentTarget) setShowMajor(false) }}
        >
          {/* ── Cosmic backdrop ── */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
            {/* Floating nebula blobs */}
            <div style={{ position:'absolute', left:'-8%', top:'18%', width:440, height:240, background:'radial-gradient(ellipse, rgba(99,102,241,.10) 0%, transparent 68%)', borderRadius:'50%', animation:'float 13s ease-in-out infinite' }} />
            <div style={{ position:'absolute', right:'-6%', top:'28%', width:380, height:210, background:'radial-gradient(ellipse, rgba(241,180,151,.08) 0%, transparent 68%)', borderRadius:'50%', animation:'float 17s ease-in-out 3s infinite' }} />
            <div style={{ position:'absolute', left:'32%', bottom:'4%', width:320, height:170, background:'radial-gradient(ellipse, rgba(16,185,129,.07) 0%, transparent 68%)', borderRadius:'50%', animation:'float 11s ease-in-out 6s infinite' }} />
            <div style={{ position:'absolute', right:'22%', top:'4%', width:290, height:150, background:'radial-gradient(ellipse, rgba(239,68,68,.06) 0%, transparent 68%)', borderRadius:'50%', animation:'float 19s ease-in-out 1.5s infinite' }} />

            {/* Concentric orbit rings */}
            <div style={{ position:'absolute', top:'50%', left:'50%', width:820, height:820, transform:'translate(-50%,-50%)', border:'1px solid rgba(241,180,151,.04)', borderRadius:'50%', animation:'orbitalSpin 120s linear infinite' }} />
            <div style={{ position:'absolute', top:'50%', left:'50%', width:580, height:580, transform:'translate(-50%,-50%)', border:'1px solid rgba(99,102,241,.06)', borderRadius:'50%', animation:'orbitalSpin 80s linear reverse infinite' }} />
            <div style={{ position:'absolute', top:'50%', left:'50%', width:340, height:340, transform:'translate(-50%,-50%)', border:'1px solid rgba(255,255,255,.03)', borderRadius:'50%' }} />

            {/* Neural-network connection SVG */}
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.14 }} viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
              {/* Grid cross-wires */}
              <line x1="200" y1="130" x2="600" y2="130" stroke="#818cf8" strokeWidth=".6" strokeDasharray="4 10"/>
              <line x1="200" y1="370" x2="600" y2="370" stroke="#818cf8" strokeWidth=".6" strokeDasharray="4 10"/>
              <line x1="200" y1="130" x2="200" y2="370" stroke="#818cf8" strokeWidth=".6" strokeDasharray="4 10"/>
              <line x1="600" y1="130" x2="600" y2="370" stroke="#818cf8" strokeWidth=".6" strokeDasharray="4 10"/>
              {/* Diagonals */}
              <line x1="200" y1="130" x2="600" y2="370" stroke="#F1B497" strokeWidth=".45" strokeDasharray="3 11" opacity=".7"/>
              <line x1="600" y1="130" x2="200" y2="370" stroke="#F1B497" strokeWidth=".45" strokeDasharray="3 11" opacity=".7"/>
              {/* Spokes to centre */}
              <line x1="400" y1="250" x2="200" y2="130" stroke="#818cf8" strokeWidth=".35" strokeDasharray="2 8" opacity=".6"/>
              <line x1="400" y1="250" x2="600" y2="130" stroke="#818cf8" strokeWidth=".35" strokeDasharray="2 8" opacity=".6"/>
              <line x1="400" y1="250" x2="200" y2="370" stroke="#818cf8" strokeWidth=".35" strokeDasharray="2 8" opacity=".6"/>
              <line x1="400" y1="250" x2="600" y2="370" stroke="#818cf8" strokeWidth=".35" strokeDasharray="2 8" opacity=".6"/>
              {/* Node circles */}
              <circle cx="200" cy="130" r="5" fill="none" stroke="#818cf8" strokeWidth="1"/>
              <circle cx="600" cy="130" r="5" fill="none" stroke="#818cf8" strokeWidth="1"/>
              <circle cx="200" cy="370" r="5" fill="none" stroke="#818cf8" strokeWidth="1"/>
              <circle cx="600" cy="370" r="5" fill="none" stroke="#818cf8" strokeWidth="1"/>
              {/* Central hub */}
              <circle cx="400" cy="250" r="10" fill="none" stroke="#F1B497" strokeWidth=".9" opacity=".85"/>
              <circle cx="400" cy="250" r="4"  fill="#F1B497" opacity=".4"/>
              <circle cx="400" cy="250" r="22" fill="none" stroke="#F1B497" strokeWidth=".4" strokeDasharray="2 6" opacity=".5"/>
            </svg>

            {/* Twinkling starfield */}
            {MODAL_STARS.map(s => (
              <div key={s.id} style={{
                position:'absolute', left:`${s.left}%`, top:`${s.top}%`,
                width:s.size, height:s.size, borderRadius:'50%', background:'#fff',
                animation:`twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
              }} />
            ))}
          </div>

          <ScanLine />

          <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', width:'100%' }}>
            <div style={{ textAlign:'center', marginBottom:36 }}>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'2.5px', textTransform:'uppercase', color:'#8B8986', marginBottom:12 }}>Your Specialisation</p>
              <h2 style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:'clamp(32px,5vw,56px)', letterSpacing:'-1.5px', color:'#F5EFEB', margin:0, animation:'fadeUp .45s ease .05s both' }}>
                Choose Your Major.
              </h2>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#8B8986', marginTop:12, animation:'fadeUp .4s ease .15s both' }}>
                Applied from Year 2 onwards · saved to your profile
              </p>
            </div>
            <NeuralOrbit savedMajor={savedMajor} onSelect={handleMajorSelect} />
            <button onClick={() => setShowMajor(false)} style={{ marginTop:24, background:'none', border:'none', fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(255,255,255,.3)', cursor:'pointer', letterSpacing:'1px', textTransform:'uppercase' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Hero ─────────────────────────────────────────────────────
function Hero({ selection, sgpa, courses, savedMajor, minors = [], onToggleMinor }) {
  const isMajorSem = selection ? isMajorSemester(selection.semester) : false
  const semMinors  = selection ? MINORS.filter(m => m.courses?.[selection.semester]?.length) : []
  const majorData  = useMemo(() => {
    if (!isMajorSem) return null
    // The selection's divide is the major whose courses are on screen.
    return MAJORS.find(x => x.id === selection.divide) ?? MAJORS.find(x => x.id === savedMajor?.id) ?? null
  }, [isMajorSem, selection, savedMajor])

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
                {selection.semester.toUpperCase()}{!isMajorSem && ` · ${selection.divide}`}
              </span>
            )}
            {majorData && (
              <span style={{ marginLeft:8, padding:'2px 8px', background:`${majorData.color}15`, color:majorData.color, border:`1px solid ${majorData.color}30` }}>
                {majorData.label}
              </span>
            )}
            {isMajorSem && semMinors.map(m => {
              const on = minors.includes(m.id)
              const codes = m.courses[selection.semester].map(c => c.courseCode).join(', ')
              return (
                <button key={m.id} type="button" onClick={() => onToggleMinor?.(m.id)}
                  title={on ? `Remove ${m.label} minor (${codes})` : `Add ${m.label} minor (${codes})`}
                  aria-pressed={on}
                  style={{ marginLeft:8, padding:'2px 8px', cursor:'pointer', font:'inherit', letterSpacing:'inherit', textTransform:'inherit',
                    background: on ? `${m.color}15` : 'transparent',
                    color: on ? m.color : 'rgba(255,255,255,.38)',
                    border: `1px ${on ? 'solid' : 'dashed'} ${on ? m.color + '30' : 'rgba(255,255,255,.18)'}`,
                    transition:'color .15s, border-color .15s, background .15s' }}>
                  {on ? `${m.glyph} ${m.label} minor` : `+ ${m.label} minor`}
                </button>
              )
            })}
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
  const [selection,   setSelection]  = useState(() => loadSelection())
  const [courses,     setCourses]    = useState(() => {
    if (!selection) return []
    return coursesForSelection(selection.semester, selection.divide, loadMajor()?.id, loadMinors())
  })
  const [activeTab,   setActiveTab]  = useState('courses')
  const [switchOpen,  setSwitchOpen] = useState(false)
  const [savedMajor,  setSavedMajor] = useState(() => loadMajor())
  const [minors,      setMinors]     = useState(() => loadMinors())

  useEffect(() => {
    if (selection) saveCoursesForDivide(selection.semester, selection.divide, courses)
  }, [courses, selection])

  const handleSelect = useCallback((semester, divide) => {
    const majorId = loadMajor()?.id
    // Major semesters have no EEX/ES split: marks are stored per major instead.
    if (isMajorSemester(semester) && majorId) divide = majorId
    const sel = { semester, divide }
    saveSelection(sel)
    setSelection(sel)
    setCourses(coursesForSelection(semester, divide, majorId, loadMinors()))
    setSwitchOpen(false)
    setActiveTab('courses')
  }, [])

  const toggleMinor = useCallback((minorId) => {
    const next = minors.includes(minorId) ? minors.filter(id => id !== minorId) : [...minors, minorId]
    saveMinors(next)
    setMinors(next)
    if (selection && isMajorSemester(selection.semester)) {
      setCourses(prev => syncMinorCourses(prev, selection.semester, next, blankCourse))
    }
  }, [minors, selection])

  const updateCourse = useCallback((id, patch) => {
    setCourses(prev => prev.map(c => c.id === id ? enrichCourse({ ...c, ...patch }) : c))
  }, [])

  const addCourse = useCallback((data) => {
    setCourses(prev => [...prev, enrichCourse({
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      courseCode: data.courseCode, courseName: data.courseName, credits: data.credits,
      cie1Marks: data.cie1Marks ?? null, cie2Marks: data.cie2Marks ?? null,
      cie3Marks: data.cie3Marks ?? null, seeMarks:  data.seeMarks  ?? null,
      totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
    })])
  }, [])

  const deleteCourse = useCallback((id) => {
    setCourses(prev => prev.filter(c => c.id !== id))
  }, [])

  const importCourses = useCallback((newCourses) => {
    setCourses(newCourses.map((c, i) => enrichCourse({
      id: `c-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      courseCode: c.courseCode, courseName: c.courseName, credits: c.credits,
      cie1Marks: null, cie2Marks: null, cie3Marks: null, seeMarks: null,
      totalMarks: null, grade: null, gradePoint: null, creditGradeProduct: null,
    })))
  }, [])

  const resetAll = useCallback(() => {
    if (!selection) return
    setCourses(makeCoursesFromTemplate(courseTemplate(selection.semester, selection.divide, savedMajor?.id, minors)))
    try { localStorage.removeItem(courseKey(selection.semester, selection.divide)) } catch {}
  }, [selection, savedMajor, minors])

  const sgpa         = calculateSGPA(courses)
  const scored       = courses.filter(c => c.creditGradeProduct !== null)
  const totalCredits = scored.reduce((s, c) => s + c.credits, 0)
  const totalCGP     = scored.reduce((s, c) => s + c.creditGradeProduct, 0)
  const isCompleted  = SEMESTERS.find(s => s.id === selection?.semester)?.completed ?? false
  const isComingSoon = SEMESTERS.find(s => s.id === selection?.semester)?.comingSoon ?? false
  const cgpaData     = useCGPA(courses, selection, savedMajor?.id)

  // No selection — show full-screen space selector
  if (!selection && !switchOpen) {
    return <SelectionScreen onSelect={handleSelect} savedMajor={savedMajor} onMajorChange={setSavedMajor} minors={minors} onToggleMinor={toggleMinor} />
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
        <SelectionScreen onSelect={handleSelect} onClose={() => setSwitchOpen(false)} savedMajor={savedMajor} onMajorChange={setSavedMajor} minors={minors} onToggleMinor={toggleMinor} />
      </motion.div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d1525', fontFamily:"'Hanken Grotesk',system-ui,sans-serif" }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} selection={selection} sgpa={sgpa} onSwitch={() => setSwitchOpen(true)} />

      {activeTab === 'courses' && (
        <Hero selection={selection} sgpa={sgpa} courses={courses} savedMajor={savedMajor} minors={minors} onToggleMinor={toggleMinor} />
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
