import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info }

const COLORS = {
  success: { border: '#10B981', icon: '#10B981', bg: 'rgba(13,17,35,0.96)' },
  error:   { border: '#EF4444', icon: '#EF4444', bg: 'rgba(13,17,35,0.96)' },
  warning: { border: '#F59E0B', icon: '#F59E0B', bg: 'rgba(13,17,35,0.96)' },
  info:    { border: 'rgba(255,255,255,0.25)', icon: '#9a9997', bg: 'rgba(13,17,35,0.96)' },
}

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-20 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = ICONS[t.type] ?? Info
            const c = COLORS[t.type] ?? COLORS.info
            return (
              <motion.div
                key={t.id}
                initial={{ x: 360, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 360, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="pointer-events-auto flex items-center gap-3 px-4 py-3 font-body text-sm"
                style={{
                  background: c.bg,
                  borderLeft: `2px solid ${c.border}`,
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  borderRight: '1px solid rgba(255,255,255,0.12)',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  minWidth: '240px',
                  maxWidth: '340px',
                }}
              >
                <Icon size={14} style={{ color: c.icon, flexShrink: 0 }} />
                <span className="flex-1 text-char leading-snug text-xs" style={{ letterSpacing: '.2px' }}>{t.message}</span>
                <button onClick={() => remove(t.id)} className="text-stone hover:text-char transition-colors">
                  <X size={13} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
