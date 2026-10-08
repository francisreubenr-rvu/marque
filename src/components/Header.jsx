import { motion } from 'framer-motion'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { RippleBtn, OrbitalRing } from './animations'
import { TABS } from '../utils/constants'

const HEADER_STARS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 4 + i * 9.5,
  top:  10 + ((i * 137) % 32),
  size: 1 + (i % 3) * 0.6,
  delay: i * 0.7,
  dur:   2.4 + (i % 4) * 1.1,
}))

export default function Header({ activeTab, setActiveTab, selection, sgpa, onSwitch }) {
  const displaySGPA = useAnimatedNumber(sgpa ?? 0, 700, 2)

  return (
    <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(10,14,28,.95)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,.08)', overflow:'hidden' }}>

      {/* Background nebula + stars */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', left:'15%', top:'-30%', width:220, height:110, background:'radial-gradient(ellipse,rgba(100,80,200,.07) 0%,transparent 70%)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', right:'20%', top:'-20%', width:160, height:80, background:'radial-gradient(ellipse,rgba(241,180,151,.05) 0%,transparent 70%)', borderRadius:'50%' }} />
        {HEADER_STARS.map(s => (
          <div key={s.id} style={{
            position:'absolute', left:`${s.left}%`, top:s.top,
            width:s.size, height:s.size, borderRadius:'50%',
            background:'#fff',
            animation:`twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', height:52, position:'relative', zIndex:1 }}>

        {/* Orbital dot */}
        <div style={{ position:'relative', width:18, height:18, flexShrink:0, marginRight:24 }}>
          <div style={{ position:'absolute', top:'50%', left:'50%', width:4, height:4, borderRadius:'50%', background:'#F1B497', transform:'translate(-50%,-50%)', boxShadow:'0 0 6px #F1B497' }} />
          <OrbitalRing color="#F1B497" size={16} speed={3} dotSize={2.5} />
        </div>

        <nav style={{ display:'flex', alignItems:'center', flex:1, overflowX:'auto', scrollbarWidth:'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding:'0 16px', height:52, background:'none', border:'none', cursor:'pointer', fontFamily:"'Hanken Grotesk',sans-serif", fontSize:12, color:activeTab===t.id?'#F5EFEB':'#8B8986', whiteSpace:'nowrap', position:'relative', transition:'color .15s' }}
              onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color='#F5EFEB' }}
              onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color='#8B8986' }}
            >
              {t.label}
              {/* Top lamp — glow dot */}
              <span style={{
                position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
                width: activeTab===t.id ? 24 : 0, height:2,
                background:'#F1B497',
                boxShadow: activeTab===t.id ? '0 0 8px 3px rgba(241,180,151,.65), 0 0 22px 6px rgba(241,180,151,.28)' : 'none',
                transition:'width .28s ease, box-shadow .28s ease',
              }} />
              {/* Top lamp — downward cone */}
              <span style={{
                position:'absolute', top:0, left:0, right:0, bottom:0,
                background:'radial-gradient(ellipse 72% 100% at 50% 0%, rgba(241,180,151,.13) 0%, transparent 100%)',
                opacity: activeTab===t.id ? 1 : 0,
                transition:'opacity .28s ease',
                pointerEvents:'none',
              }} />
              {/* Sweep underline */}
              <span style={{
                position:'absolute', bottom:0, left:0, right:0, height:2,
                background: activeTab===t.id ? 'linear-gradient(90deg,transparent,#F1B497,transparent)' : 'transparent',
                transition:'background .25s ease',
              }} />
            </button>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginLeft:16, flexShrink:0 }}>
          {sgpa !== null && (
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:'#F1B497', letterSpacing:'-0.3px', animation:'glowPulse 4s ease infinite' }}>
              {displaySGPA.toFixed(2)}
            </span>
          )}
          {selection && (
            <RippleBtn onClick={onSwitch}
              style={{ padding:'4px 10px', background:'rgba(241,180,151,.08)', border:'1px solid rgba(241,180,151,.22)', color:'#F1B497', fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'1px', textTransform:'uppercase', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(241,180,151,.18)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(241,180,151,.08)'}
            >
              {selection.semester.replace('sem','S')}{selection.divide ? `·${selection.divide}` : ''}
            </RippleBtn>
          )}
        </div>
      </div>
    </header>
  )
}
