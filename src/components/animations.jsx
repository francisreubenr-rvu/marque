import { useState, useEffect, useRef, useMemo } from 'react'

export function ParticleField({ count, color }) {
  const particles = useMemo(() => Array.from({ length: count || 18 }, (_, i) => ({
    id: i,
    left:     5 + Math.random() * 90,
    size:     1.2 + Math.random() * 2.2,
    delay:    Math.random() * 12,
    duration: 7 + Math.random() * 9,
    drift:    Math.round((Math.random() - 0.5) * 70),
    opacity:  0.25 + Math.random() * 0.45,
  })), [count])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.left}%`, bottom: -10,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: color || 'rgba(241,180,151,.7)',
          opacity: p.opacity,
          animation: `particleDrift ${p.duration}s ease-in ${p.delay}s infinite`,
          '--drift': `${p.drift}px`,
        }} />
      ))}
    </div>
  )
}

export function RippleBtn({ children, onClick, style, disabled, ...rest }) {
  const [ripples, setRipples] = useState([])

  const handleClick = (e) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now() + Math.random()
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
    onClick && onClick(e)
  }

  return (
    <button onClick={handleClick} disabled={disabled}
      style={{ position: 'relative', overflow: 'hidden', cursor: disabled ? 'not-allowed' : 'pointer', ...style }} {...rest}>
      {children}
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute', left: r.x, top: r.y,
          width: 8, height: 8, borderRadius: '50%',
          background: 'rgba(255,255,255,.28)',
          transform: 'translate(-50%,-50%)',
          animation: 'rippleExpand .65s cubic-bezier(.4,0,.2,1) forwards',
          pointerEvents: 'none', zIndex: 10,
        }} />
      ))}
    </button>
  )
}

export function CursorFollower() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)
  const pos     = useRef({ x: -300, y: -300 })
  const ring    = useRef({ x: -300, y: -300 })
  const raf     = useRef(null)
  const hidden  = useRef(true)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
      if (hidden.current) {
        hidden.current = false
        if (dotRef.current)  dotRef.current.style.opacity  = '1'
        if (ringRef.current) ringRef.current.style.opacity = '1'
      }
    }
    const onLeave = () => {
      hidden.current = true
      if (dotRef.current)  dotRef.current.style.opacity  = '0'
      if (ringRef.current) ringRef.current.style.opacity = '0'
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)

    function tick() {
      ring.current.x += (pos.current.x - ring.current.x) * 0.13
      ring.current.y += (pos.current.y - ring.current.y) * 0.13
      if (dotRef.current) {
        dotRef.current.style.left = pos.current.x + 'px'
        dotRef.current.style.top  = pos.current.y + 'px'
      }
      if (ringRef.current) {
        ringRef.current.style.left = ring.current.x + 'px'
        ringRef.current.style.top  = ring.current.y + 'px'
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} style={{ position:'fixed', pointerEvents:'none', zIndex:9999, width:6, height:6, borderRadius:'50%', background:'#F1B497', opacity:0, transform:'translate(-50%,-50%)', mixBlendMode:'screen', transition:'opacity .3s' }} />
      <div ref={ringRef} style={{ position:'fixed', pointerEvents:'none', zIndex:9998, width:28, height:28, borderRadius:'50%', border:'1px solid rgba(241,180,151,.35)', opacity:0, transform:'translate(-50%,-50%)', transition:'opacity .3s' }} />
    </>
  )
}

export function ScanLine() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent 0%, rgba(241,180,151,.12) 40%, rgba(241,180,151,.18) 50%, rgba(241,180,151,.12) 60%, transparent 100%)', animation: 'scanLine 6s linear 1s infinite' }} />
    </div>
  )
}

export function OrbitalRing({ color, size, speed, dotSize, reverse }) {
  return (
    <div style={{ position:'absolute', width:size, height:size, top:'50%', left:'50%', transform:'translate(-50%,-50%)', border:`1px solid ${color}35`, borderRadius:'50%', animation:`orbitalSpin ${speed || 6}s linear infinite ${reverse ? 'reverse' : ''}` }}>
      <div style={{ position:'absolute', top:-(dotSize || 4)/2, left:'50%', width:dotSize||4, height:dotSize||4, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}, 0 0 16px ${color}80`, transform:'translateX(-50%)' }} />
    </div>
  )
}
