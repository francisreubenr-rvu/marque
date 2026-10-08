import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Link, RotateCcw, Copy, Check, Upload, Shuffle } from 'lucide-react'
import Modal from './Modal'
import { useToast } from './Toast'
import { exportToCSV, encodeShareState } from '../utils/calculations'
import { isCommonSemester } from '../utils/semesterTemplates'

function Row({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-4 sm:py-5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
          <Icon size={14} style={{ color: '#8B8986' }} />
        </div>
        <div>
          <p className="text-sm font-body" style={{ color: '#F5EFEB', letterSpacing: '.15px' }}>{title}</p>
          <p className="text-xs font-body mt-0.5" style={{ color: '#8B8986', letterSpacing: '.2px' }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function parseTimetableCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  const isHeader = l => /code|name|subject|course/i.test(l.split(',')[0])
  const start = lines.length > 1 && isHeader(lines[0]) ? 1 : 0
  const courses = []

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    if (cols.length < 2) continue
    const [code, name, creditsRaw] = cols
    if (!code || !name) continue
    const credits = parseInt(creditsRaw)
    if (isNaN(credits) || credits < 1 || credits > 6) continue
    courses.push({ courseCode: code.toUpperCase(), courseName: name, credits })
  }
  return courses
}

export default function Settings({ courses, sgpa, onReset, onImport, onSwitchDivide, selection }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [showReset, setShowReset]     = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [showSwitch, setShowSwitch]   = useState(false)
  const [importPreview, setImportPreview] = useState([])
  const [copied, setCopied]           = useState(false)

  const handleExport = () => { exportToCSV(courses, sgpa); toast('CSV exported', 'success') }

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?d=${encodeShareState(courses)}`
    navigator.clipboard.writeText(url)
      .then(() => { setCopied(true); toast('Link copied to clipboard', 'success'); setTimeout(() => setCopied(false), 2500) })
      .catch(() => toast('Could not copy link', 'error'))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseTimetableCSV(ev.target.result)
      if (parsed.length === 0) { toast('No valid courses found — expected: Code, Name, Credits', 'error'); return }
      setImportPreview(parsed)
      setShowImport(true)
    }
    reader.readAsText(file)
  }

  const confirmImport = () => {
    onImport(importPreview)
    toast(`Imported ${importPreview.length} courses`, 'success')
    setShowImport(false)
    setImportPreview([])
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="ts-card p-6">
        <p className="s-label mb-1">Configuration</p>
        <h2 className="font-display font-300 text-3xl tracking-tight mb-1" style={{ color: '#F5EFEB' }}>Settings</h2>
        <p className="font-mono text-[10px] mb-6" style={{ color: '#8B8986' }}>
          Manage courses, import/export data, and configure your calculator.
        </p>

        <Row icon={Upload} title="Import Timetable" desc="Upload a CSV with columns: Code, Course Name, Credits">
          <>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
              onClick={() => fileRef.current?.click()} className="btn-pill btn-out flex items-center gap-2">
              <Upload size={13} /> Upload CSV
            </motion.button>
          </>
        </Row>

        <Row icon={Download} title="Export to CSV" desc="Download a spreadsheet with all marks and SGPA">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
            onClick={handleExport} className="btn-pill btn-sal">
            Export
          </motion.button>
        </Row>

        <Row icon={Link} title="Shareable Link" desc="Encode your data into a URL to share with others">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
            onClick={handleShare} className="btn-pill btn-out flex items-center gap-2">
            {copied ? <Check size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </motion.button>
        </Row>

        {onSwitchDivide && (
          <Row icon={Shuffle} title="Switch Semester / Divide"
            desc={selection ? `Currently: ${selection.semester.toUpperCase()}${selection.divide ? ` · ${String(selection.divide).toUpperCase()}` : ''}` : 'Change your semester or divide'}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
              onClick={() => setShowSwitch(true)} className="btn-pill btn-out">
              Switch
            </motion.button>
          </Row>
        )}

        <Row icon={RotateCcw} title="Reset All Data" desc="Restore default courses and clear all marks">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }}
            onClick={() => setShowReset(true)}
            className="btn-pill text-xs"
            style={{ background: 'transparent', color: '#EF4444', border: '1px solid rgba(239,68,68,.3)', letterSpacing: '.5px', textTransform: 'uppercase', fontSize: 11, padding: '8px 20px', borderRadius: '80px' }}>
            Reset
          </motion.button>
        </Row>
      </motion.div>

      {/* CSV format hint */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2 }} className="ts-card p-5 mt-4">
        <p className="s-label mb-3">CSV Format</p>
        <pre className="text-xs font-mono" style={{ color: '#8B8986', lineHeight: 1.8 }}>
{`Code,Course Name,Credits
CS1807,Linear Algebra,3
CS1006,Data Structures,4
CS2001,Computer Networks,3`}
        </pre>
      </motion.div>

      <p className="text-center text-xs font-mono mt-6" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '.3px' }}>
        SGPA Calculator · All calculations client-side
      </p>

      {/* Import preview modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Timetable">
        <p className="text-sm font-body mb-4" style={{ color: '#8B8986', lineHeight: 1.6 }}>
          Found <span style={{ color: '#F5EFEB' }}>{importPreview.length} courses</span>. This will replace your current course list and clear all marks.
        </p>
        <div className="max-h-48 overflow-y-auto space-y-1 mb-5">
          {importPreview.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-mono text-xs" style={{ color: '#8B8986' }}>{c.courseCode}</span>
              <span className="text-xs font-body flex-1 mx-3 truncate" style={{ color: '#F5EFEB' }}>{c.courseName}</span>
              <span className="cr-chip">{c.credits}cr</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImport(false)} className="btn-pill btn-out flex-1 justify-center">Cancel</button>
          <button onClick={confirmImport} className="btn-pill btn-sal flex-1 justify-center">Import</button>
        </div>
      </Modal>

      {/* Switch divide modal */}
      <Modal open={showSwitch} onClose={() => setShowSwitch(false)} title="Switch Semester / Divide" width="360px">
        <p className="text-sm font-body mb-1" style={{ color: '#F5EFEB', lineHeight: 1.65 }}>
          This will take you back to the selection screen. Your saved marks for each divide are preserved.
        </p>
        <p className="text-xs font-mono mb-6" style={{ color: '#8B8986' }}>Your current marks are auto-saved.</p>
        <div className="flex gap-3">
          <button onClick={() => setShowSwitch(false)} className="btn-pill btn-out flex-1 justify-center">Stay</button>
          <button onClick={() => { setShowSwitch(false); onSwitchDivide?.() }}
            className="btn-pill btn-sal flex-1 justify-center">
            Switch
          </button>
        </div>
      </Modal>

      {/* Reset modal */}
      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset All Data" width="360px">
        <p className="text-sm font-body mb-1" style={{ color: '#F5EFEB', lineHeight: 1.65 }}>
          This will clear all marks and custom courses, restoring the default course list.
        </p>
        {selection && isCommonSemester(selection.semester) && (
          <p className="text-sm font-body mb-1" style={{ color: '#F1B497', lineHeight: 1.65 }}>
            In {selection.semester.replace('sem', 'Sem ')} this clears every course in the list, including the minor courses while the minor is switched off.
          </p>
        )}
        <p className="text-xs font-mono mb-6" style={{ color: '#8B8986' }}>This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setShowReset(false)} className="btn-pill btn-out flex-1 justify-center">Cancel</button>
          <button onClick={() => { onReset(); setShowReset(false); toast('Reset to defaults', 'info') }}
            className="btn-pill flex-1 justify-center" style={{ background: '#EF4444', color: '#fff', borderRadius: '80px', padding: '11px 26px', fontSize: 11, letterSpacing: '.55px', textTransform: 'uppercase' }}>
            Reset
          </button>
        </div>
      </Modal>
    </div>
  )
}
