import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { useToast } from './Toast'
import { GRADING_SCALE, ASSESSMENT_CAPS, DIFFICULTY_LEVELS } from '../utils/constants'

const CREDIT_OPTIONS = [1, 2, 3, 4, 5]

function DiffBadge({ difficulty, onChange }) {
  const d   = DIFFICULTY_LEVELS.find(x => x.id === (difficulty ?? 'medium')) ?? DIFFICULTY_LEVELS[1]
  const next = () => {
    const ids = ['easy', 'medium', 'hard']
    onChange(ids[(ids.indexOf(d.id) + 1) % ids.length])
  }
  return (
    <button
      onClick={next}
      title={d.desc}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] transition-all flex-shrink-0"
      style={{ background: d.bg, color: d.color, border: `1px solid ${d.color}40`, whiteSpace: 'nowrap' }}
    >
      {d.label}
    </button>
  )
}

function GradeCell({ grade, gradePoint }) {
  const row = GRADING_SCALE.find(r => r.grade === grade)
  if (!grade) return <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body"
      style={{ background: row?.bg, color: row?.color, border: `1px solid ${row?.color}35` }}
    >
      {grade}
      <span className="font-mono text-[10px] opacity-60">{gradePoint}</span>
    </span>
  )
}

const GRADE_CYCLE = GRADING_SCALE.map(r => r.grade) // O → A+ → A → B+ → B → C → P → F

function GradeCycleButton({ grade, onChange }) {
  const row = GRADING_SCALE.find(r => r.grade === grade)
  const idx = GRADE_CYCLE.indexOf(grade)

  const next = () => {
    if (!grade) { onChange(GRADE_CYCLE[0]); return }
    onChange(idx === GRADE_CYCLE.length - 1 ? null : GRADE_CYCLE[idx + 1])
  }

  return (
    <motion.button
      onClick={next}
      whileTap={{ scale: .93 }}
      title="Tap to cycle grade"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs transition-all"
      style={row ? {
        background: row.bg,
        color: row.color,
        border: `1px solid ${row.color}50`,
      } : {
        background: 'transparent',
        color: 'rgba(255,255,255,0.30)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      {grade || '—'}
      {row && <span className="opacity-60 text-[9px]">{row.point}</span>}
    </motion.button>
  )
}

function FieldError({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: .9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: .9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="absolute left-1/2 font-mono text-[10px] whitespace-nowrap px-2 py-1 z-30"
          style={{
            transform: 'translateX(-50%)',
            bottom: 'calc(100% + 5px)',
            background: '#111',
            color: '#F1B497',
            border: '1px solid rgba(241,180,151,.4)',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,.25)',
          }}
        >
          {message}
          <span
            className="absolute left-1/2 -bottom-[5px]"
            style={{
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '5px solid rgba(241,180,151,.4)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MarksInput({ value, onChange, max, placeholder, error, warn }) {
  const handleChange = (e) => {
    const raw = e.target.value
    if (raw === '') { onChange(null); return }
    const n = parseFloat(raw)
    if (!isFinite(n)) return
    onChange(n)
  }

  const idleBorder = warn ? '#F59E0B' : 'rgba(255,255,255,0.18)'

  return (
    <div className="relative inline-block">
      <FieldError message={error} />
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        value={value ?? ''}
placeholder={placeholder ?? '—'}
        onChange={handleChange}
        className="w-12 bg-transparent text-center text-sm font-mono transition-all focus:outline-none"
        style={{
          color: '#F5EFEB',
          border: `1px solid ${idleBorder}`,
          padding: '4px 0',
          caretColor: '#F1B497',
        }}
        onFocus={e => { e.target.style.borderColor = '#F1B497'; e.target.style.background = 'rgba(255,255,255,0.08)' }}
        onBlur={e => { e.target.style.borderColor = idleBorder; e.target.style.background = 'transparent' }}
      />
    </div>
  )
}

function InputField({ label, ...props }) {
  return (
    <div>
      <label className="s-label block mb-1.5">{label}</label>
      <input
        className="w-full bg-transparent text-sm font-body focus:outline-none transition-all px-3 py-2.5"
        style={{ border: '1px solid rgba(255,255,255,0.18)', color: '#F5EFEB' }}
        onFocus={e => { e.target.style.borderColor = '#F1B497' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.18)' }}
        {...props}
      />
    </div>
  )
}

const BLANK_FORM = { courseCode: '', courseName: '', credits: 3,
  cie1Marks: null, cie2Marks: null, cie3Marks: null, seeMarks: null }

function AddCourseModal({ open, onClose, onAdd, existingCodes }) {
  const [form, setForm] = useState(BLANK_FORM)
  const toast = useToast()
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = () => {
    if (!form.courseCode.trim()) { toast('Course code is required', 'error'); return }
    if (!form.courseName.trim()) { toast('Course name is required', 'error'); return }
    if (existingCodes.includes(form.courseCode.trim().toUpperCase())) { toast('Duplicate course code', 'error'); return }
    if (form.cie1Marks !== null && (form.cie1Marks < 0 || form.cie1Marks > 20)) { toast('CIE 1 must be 0–20', 'error'); return }
    if (form.cie2Marks !== null && (form.cie2Marks < 0 || form.cie2Marks > 25)) { toast('CIE 2 must be 0–25', 'error'); return }
    if (form.cie3Marks !== null && (form.cie3Marks < 0 || form.cie3Marks > 25)) { toast('CIE 3 must be 0–25', 'error'); return }
    if (form.seeMarks  !== null && (form.seeMarks  < 0 || form.seeMarks  > 30)) { toast('SEE must be 0–30',   'error'); return }
    onAdd({ ...form, courseCode: form.courseCode.trim().toUpperCase(), courseName: form.courseName.trim() })
    setForm(BLANK_FORM)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Custom Course">
      <div className="space-y-4">
        <InputField label="Course Code" type="text" placeholder="e.g. CS2001" value={form.courseCode} onChange={e => set('courseCode', e.target.value)} />
        <InputField label="Course Name" type="text" placeholder="e.g. Computer Networks" value={form.courseName} onChange={e => set('courseName', e.target.value)} />

        <div>
          <label className="s-label block mb-2">Credits</label>
          <div className="flex gap-2">
            {CREDIT_OPTIONS.map(n => (
              <button key={n} onClick={() => set('credits', n)} className="flex-1 py-2 text-sm font-body transition-all"
                style={{ background: form.credits === n ? '#F1B497' : 'transparent', color: form.credits === n ? '#fff' : '#8B8986', border: `1px solid ${form.credits === n ? '#F1B497' : 'rgba(255,255,255,0.18)'}` }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField label="CIE 1 (0–20)" type="number" min={0} max={20} placeholder="—" value={form.cie1Marks ?? ''} onChange={e => set('cie1Marks', e.target.value === '' ? null : Number(e.target.value))} />
          <InputField label="CIE 2 (0–25)" type="number" min={0} max={25} placeholder="—" value={form.cie2Marks ?? ''} onChange={e => set('cie2Marks', e.target.value === '' ? null : Number(e.target.value))} />
          <InputField label="CIE 3 (0–25)" type="number" min={0} max={25} placeholder="—" value={form.cie3Marks ?? ''} onChange={e => set('cie3Marks', e.target.value === '' ? null : Number(e.target.value))} />
          <InputField label="SEE (0–30)"   type="number" min={0} max={30} placeholder="—" value={form.seeMarks  ?? ''} onChange={e => set('seeMarks',  e.target.value === '' ? null : Number(e.target.value))} />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-pill btn-out flex-1 justify-center">Cancel</button>
          <button onClick={submit}  className="btn-pill btn-sal flex-1 justify-center">Add Course</button>
        </div>
      </div>
    </Modal>
  )
}

const FIELDS = [
  { key: 'cie1Marks', label: 'CIE 1', max: ASSESSMENT_CAPS.cie1 },
  { key: 'cie2Marks', label: 'CIE 2', max: ASSESSMENT_CAPS.cie2 },
  { key: 'cie3Marks', label: 'CIE 3', max: ASSESSMENT_CAPS.cie3 },
  { key: 'seeMarks',  label: 'SEE',   max: ASSESSMENT_CAPS.see  },
]

// Maps field key → passWarnings key (SEE has no individual minimum)
const FIELD_WARN = { cie1Marks: 'cie1', cie2Marks: 'cie2', cie3Marks: 'cie3' }

function PassWarnings({ w }) {
  const msgs = [
    w?.cie1  && 'CIE 1 < 8 (need ≥40%)',
    w?.cie2  && 'CIE 2 < 10 (need ≥40%)',
    w?.cie3  && 'CIE 3 < 10 (need ≥40%)',
    w?.total && 'CIE total < 28/70 (need ≥40%)',
  ].filter(Boolean)
  if (!msgs.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {msgs.map(m => (
        <span key={m} className="font-mono text-[10px] px-1.5 py-0.5"
          style={{ background: 'rgba(245,158,11,.1)', color: '#D97706', border: '1px solid rgba(245,158,11,.25)' }}>
          ⚠ {m}
        </span>
      ))}
    </div>
  )
}

// Inline field error messages
const fieldErrorMsgs = {
  tooHigh: (cap) => `Maximum is ${cap}`,
  tooLow: () => 'Cannot be less than 0',
}

export default function CourseManager({ courses, onUpdate, onAdd, onDelete, completed = false, comingSoon = false }) {
  const [showAdd,      setShowAdd]      = useState(false)
  const [deleteId,     setDeleteId]     = useState(null)
  const [fieldErrors,  setFieldErrors]  = useState({})  // { 'cie1Marks-courseId': 'msg' }
  const [entryMode,    setEntryMode]    = useState(completed ? 'grades' : 'marks')
  const toast = useToast()
  const gradeView = completed || entryMode === 'grades'

  const showFieldError = useCallback((courseId, field, msg) => {
    const key = `${field}-${courseId}`
    setFieldErrors(prev => ({ ...prev, [key]: msg }))
    setTimeout(() => setFieldErrors(prev => {
      const next = { ...prev }; delete next[key]; return next
    }), 2500)
  }, [])

  const handleMarks = useCallback((id, field, value) => {
    if (field === 'difficulty') { onUpdate(id, { [field]: value }); return }
    if (field === 'directGrade') { onUpdate(id, { directGrade: value }); return }
    if (value === null) { onUpdate(id, { [field]: null }); return }
    if (!isFinite(value)) return
    const cap = FIELDS.find(f => f.key === field)?.max ?? 100
    if (value < 0) { showFieldError(id, field, fieldErrorMsgs.tooLow()); return }
    if (value > cap) { showFieldError(id, field, fieldErrorMsgs.tooHigh(cap)); return }
    onUpdate(id, { [field]: value })
  }, [onUpdate, showFieldError])

  const confirmDelete = useCallback((id) => {
    onDelete(id); setDeleteId(null); toast('Course removed', 'info')
  }, [onDelete, toast])

  const handleAdd = useCallback((data) => {
    // onAdd returns false when the course was routed to another major instead of added here
    if (onAdd(data) !== false) toast('Course added', 'success')
  }, [onAdd, toast])

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="s-label mb-1">Course Management</p>
          <h2 className="font-display font-300 text-3xl tracking-tight" style={{ color: '#F5EFEB' }}>
            {completed ? 'Semester Results' : gradeView ? 'Enter Grades' : 'Enter Your Marks'}
          </h2>
          <p className="font-mono text-[10px] mt-1" style={{ color: '#8B8986' }}>
            {gradeView
              ? 'Tap a grade to cycle. Results feed your SGPA and CGPA instantly.'
              : 'Enter CIE and SEE marks for each course. Grades and SGPA update automatically.'}
          </p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
          {!completed && (
            <div style={{ display:'flex', overflow:'hidden', border:'1px solid rgba(255,255,255,.1)' }}>
              {[{ id:'marks', label:'Mark Entry' }, { id:'grades', label:'Grade Entry' }].map((tab, ti) => (
                <button key={tab.id} onClick={() => setEntryMode(tab.id)}
                  style={{
                    padding:'6px 14px',
                    background: entryMode === tab.id ? 'rgba(241,180,151,.15)' : 'transparent',
                    color: entryMode === tab.id ? '#F1B497' : '#8B8986',
                    border: 'none',
                    borderRight: ti === 0 ? '1px solid rgba(255,255,255,.1)' : 'none',
                    fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'1px',
                    cursor:'pointer', transition:'all .15s', textTransform:'uppercase',
                  }}
                  onMouseEnter={e => { if(entryMode!==tab.id) e.currentTarget.style.color='#F5EFEB' }}
                  onMouseLeave={e => { if(entryMode!==tab.id) e.currentTarget.style.color='#8B8986' }}
                >{tab.label}</button>
              ))}
            </div>
          )}
          {!completed && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
              onClick={() => setShowAdd(true)}
              className="btn-pill btn-sal flex items-center gap-2"
            >
              <Plus size={13} /> Add Course
            </motion.button>
          )}
        </div>
      </div>

      {/* Desktop table + Mobile cards with optional blur */}
      <div style={{ position:'relative' }}>

      <div className="hidden md:block ts-card overflow-x-auto">
        {gradeView ? (
          <table className="w-full text-sm font-body" style={{ minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                {['Code', 'Course', 'Cr', 'Grade', 'Points', 'Cr×GP', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left s-label whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {courses.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * .04, .24), duration: .3 }}
                    className="group border-b transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeft: '2px solid transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-3 py-3 font-mono text-xs" style={{ color: '#8B8986' }}>{c.courseCode}</td>
                    <td className="px-3 py-3 max-w-[220px]">
                      <span className="truncate block text-sm" style={{ color: '#F5EFEB', letterSpacing: '.15px' }} title={c.courseName}>{c.courseName}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-mono mx-auto" style={{ background: 'rgba(241,180,151,.15)', color: '#F1B497' }}>{c.credits}</span>
                    </td>
                    <td className="px-3 py-3">
                      <GradeCycleButton grade={c.directGrade ?? null} onChange={v => handleMarks(c.id, 'directGrade', v)} />
                    </td>
                    <td className="px-3 py-3 font-mono text-sm text-center" style={{ color: '#8B8986' }}>
                      {c.gradePoint !== null ? c.gradePoint : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3 font-mono text-sm text-center" style={{ color: '#8B8986' }}>
                      {c.creditGradeProduct !== null ? c.creditGradeProduct : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setDeleteId(c.id)}
                        className="md:opacity-0 md:group-hover:opacity-100 w-8 h-8 flex items-center justify-center transition-all"
                        style={{ color: 'rgba(255,255,255,0.20)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm font-body" style={{ minWidth: 820 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                {['Code','Course','Vibe','Cr','CIE 1 /20','CIE 2 /25','CIE 3 /25','SEE /30','Total','Grade','Cr×GP',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left s-label whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {courses.map((c, i) => {
                  const hasWarn = c.passWarnings?.cie1 || c.passWarnings?.cie2 || c.passWarnings?.cie3 || c.passWarnings?.total
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(i * .04, .24), duration: .3 }}
                      className="group border-b transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeft: hasWarn ? '2px solid #F59E0B' : '2px solid transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-3 py-3 font-mono text-xs" style={{ color: '#8B8986' }}>
                        {c.courseCode}
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <span className="truncate block text-sm" style={{ color: '#F5EFEB', letterSpacing: '.15px' }} title={c.courseName}>{c.courseName}</span>
                        {hasWarn && <PassWarnings w={c.passWarnings} />}
                      </td>
                      <td className="px-3 py-3">
                        <DiffBadge difficulty={c.difficulty} onChange={v => handleMarks(c.id, 'difficulty', v)} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="w-6 h-6 flex items-center justify-center text-xs font-mono mx-auto" style={{ background: 'rgba(241,180,151,.15)', color: '#F1B497' }}>{c.credits}</span>
                      </td>
                      {FIELDS.map(f => (
                        <td key={f.key} className="px-3 py-3">
                          <MarksInput
                            value={c[f.key]}
                            onChange={v => handleMarks(c.id, f.key, v)}
                            max={f.max}
                            error={fieldErrors[`${f.key}-${c.id}`]}
                            warn={!!(FIELD_WARN[f.key] && c.passWarnings?.[FIELD_WARN[f.key]])}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3 font-mono text-sm text-center" style={{ color: '#F5EFEB' }}>
                        {c.totalMarks !== null ? c.totalMarks : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </td>
                      <td className="px-3 py-3"><GradeCell grade={c.grade} gradePoint={c.gradePoint} /></td>
                      <td className="px-3 py-3 font-mono text-sm text-center" style={{ color: '#8B8986' }}>
                        {c.creditGradeProduct !== null ? c.creditGradeProduct : <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => setDeleteId(c.id)}
                          className="md:opacity-0 md:group-hover:opacity-100 w-8 h-8 flex items-center justify-center transition-all"
                          style={{ color: 'rgba(255,255,255,0.20)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence>
          {courses.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(i * .04, .24) }}
              className="ts-card p-4"
            >
              {gradeView ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs" style={{ color: '#8B8986' }}>{c.courseCode}</span>
                        <span className="cr-chip">{c.credits}cr</span>
                      </div>
                      <p className="text-sm font-body leading-tight" style={{ color: '#F5EFEB' }}>{c.courseName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <GradeCycleButton grade={c.directGrade ?? null} onChange={v => handleMarks(c.id, 'directGrade', v)} />
                      <button onClick={() => setDeleteId(c.id)} style={{ color: 'rgba(255,255,255,0.20)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}
                        className="transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {c.creditGradeProduct !== null && (
                    <div className="pt-2 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="font-mono text-xs" style={{ color: '#8B8986' }}>{c.creditGradeProduct} CGP</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: '#8B8986' }}>{c.courseCode}</span>
                        <span className="cr-chip">{c.credits}cr</span>
                        <DiffBadge difficulty={c.difficulty} onChange={v => handleMarks(c.id, 'difficulty', v)} />
                      </div>
                      <p className="text-sm font-body leading-tight" style={{ color: '#F5EFEB' }}>{c.courseName}</p>
                    </div>
                    <button onClick={() => setDeleteId(c.id)} style={{ color: 'rgba(255,255,255,0.20)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}
                      className="ml-2 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {FIELDS.map(f => {
                      const warnKey = FIELD_WARN[f.key]
                      return (
                        <div key={f.key}>
                          <p className="s-label mb-1" style={{ color: (warnKey && c.passWarnings?.[warnKey]) ? '#D97706' : undefined }}>
                            {f.label} <span style={{ color: 'rgba(255,255,255,0.30)' }}>/{f.max}</span>
                            {warnKey && c.passWarnings?.[warnKey] && <span className="ml-1">⚠</span>}
                          </p>
                          <MarksInput
                            value={c[f.key]}
                            onChange={v => handleMarks(c.id, f.key, v)}
                            max={f.max}
                            error={fieldErrors[`${f.key}-${c.id}`]}
                            warn={!!(warnKey && c.passWarnings?.[warnKey])}
                          />
                        </div>
                      )
                    })}
                  </div>
                  {c.passWarnings?.total && (
                    <div className="mb-2 font-mono text-[10px] px-2 py-1"
                      style={{ background: 'rgba(245,158,11,.08)', color: '#D97706', border: '1px solid rgba(245,158,11,.2)' }}>
                      ⚠ CIE total &lt;28/70 — need ≥40% across all three CIEs
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="font-mono text-xs" style={{ color: '#8B8986' }}>
                      Total: <span style={{ color: '#F5EFEB' }}>{c.totalMarks ?? '—'}</span>
                    </span>
                    <GradeCell grade={c.grade} gradePoint={c.gradePoint} />
                    {c.creditGradeProduct !== null && (
                      <span className="font-mono text-xs" style={{ color: '#8B8986' }}>{c.creditGradeProduct} CGP</span>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {comingSoon && (
        <div style={{
          position:'absolute', inset:0, zIndex:20, borderRadius:4,
          backdropFilter:'blur(5px)', background:'rgba(13,21,37,.5)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
          pointerEvents:'none',
        }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'2.5px', color:'#F1B497', textTransform:'uppercase', padding:'9px 20px', border:'1px solid rgba(241,180,151,.35)', background:'rgba(241,180,151,.07)' }}>
            ✦ Course data preview — not yet available
          </div>
          <p style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontSize:12, color:'rgba(255,255,255,.35)', margin:0 }}>
            Data will appear when the semester is live
          </p>
        </div>
      )}

      </div>{/* end blur wrapper */}

      {!completed && <AddCourseModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} existingCodes={courses.map(c => c.courseCode)} />}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Course" width="360px">
        <p className="text-sm font-body mb-6" style={{ color: '#8B8986', lineHeight: 1.6 }}>This course and its marks will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-pill btn-out flex-1 justify-center">Cancel</button>
          <button onClick={() => confirmDelete(deleteId)} className="btn-pill flex-1 justify-center" style={{ background: '#EF4444', color: '#fff' }}>Remove</button>
        </div>
      </Modal>
    </div>
  )
}
