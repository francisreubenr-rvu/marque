import { useState, useEffect, useRef, useCallback } from 'react'
import { MAJORS, MINORS } from '../utils/constants'
import { courseTemplate, totalCredits, isMajorSemester } from '../utils/semesterTemplates'

// ── Planet data (real-scaled orbits, sizes, 3× faster speeds) ────────────
const SOLAR = [
  { id:'mercury', name:'Mercury', sem:'sem1', label:'Semester 1', orbit:70,  size:5,  speed:0.28,  color:'#B4B4B4', glow:'rgba(200,200,200,', grad:[[0,'#D0D0D0'],[0.6,'#888'],[1,'#555']], bands:null, rings:false, ringParticles:false, moons:[], available:true, completed:true, comingSoon:false, fact:'Fastest planet. No atmosphere. Extreme temperature swings.', divides:['EEX','ES'], noiseSeed:11 },
  { id:'venus',   name:'Venus',   sem:'sem2', label:'Semester 2', orbit:105, size:8,  speed:0.18,  color:'#E8C484', glow:'rgba(255,210,120,', grad:[[0,'#FFDF9A'],[0.6,'#C89040'],[1,'#A07020']], bands:null, rings:false, ringParticles:false, moons:[], available:true, completed:false, comingSoon:false, fact:'Hottest planet. Shrouded in toxic clouds. Rotates retrograde.', divides:['EEX','ES'], noiseSeed:22 },
  { id:'earth',   name:'Earth',   sem:'sem3', label:'Semester 3', orbit:153, size:10, speed:0.12,  color:'#4B7BE5', glow:'rgba(100,155,255,', grad:[[0,'#6B9BFF'],[0.45,'#2B55C8'],[1,'#102888']], bands:null, rings:false, ringParticles:false, moons:[{name:'Moon',orbit:22,size:3.2,speed:0.058,color:'#CCCCCC',glow:'rgba(200,200,200,'},{name:'ISS',orbit:30,size:1.8,speed:0.32,color:'#C8D6E2',glow:'rgba(200,213,226,',shape:'iss',fact:'International Space Station · 408 km altitude · 7.66 km/s · 16 sunrises per day'},{name:'Hubble',orbit:38,size:1.6,speed:0.24,color:'#B4C4D4',glow:'rgba(180,196,212,',shape:'telescope',fact:'Hubble Space Telescope · 547 km altitude · launched 1990 · over 1.4 million observations'},{name:'GPS-IIF',orbit:46,size:1.4,speed:0.14,color:'#A8B8C8',glow:'rgba(165,185,200,',shape:'satellite',fact:'GPS Satellite · MEO orbit 20,200 km · constellation of 31 active satellites · sub-metre accuracy'}], available:true, comingSoon:false, fact:'Our home. Year 2 specialisations begin here: one major course, shared core, optional minor.', divides:null, noiseSeed:33 },
  { id:'mars',    name:'Mars',    sem:'sem4', label:'Semester 4', orbit:198, size:6,  speed:0.08,  color:'#C1440E', glow:'rgba(220,80,30,',   grad:[[0,'#E06640'],[0.6,'#A03010'],[1,'#601000']], bands:null, rings:false, ringParticles:false, moons:[{name:'Phobos',orbit:19,size:2.5,speed:0.09,color:'#AAA',glow:'rgba(170,170,170,'},{name:'Deimos',orbit:29,size:2,speed:0.053,color:'#999',glow:'rgba(150,150,150,'}], available:true, comingSoon:true, fact:'The Red Planet. Home to Olympus Mons, tallest known volcano.', divides:['EEX','ES'], noiseSeed:44 },
  { id:'jupiter', name:'Jupiter', sem:'sem5', label:'Semester 5', orbit:276, size:22, speed:0.05,  color:'#C88B3A', glow:'rgba(220,160,80,',  grad:null, bands:['#C8883A','#E4B86A','#A86020','#D89850','#F0CC80','#A86020','#C8883A','#E4B86A','#B87030'], rings:false, ringParticles:false, moons:[{name:'Io',orbit:35,size:3.5,speed:0.068,color:'#FFD700',glow:'rgba(255,215,0,'},{name:'Europa',orbit:46,size:3,speed:0.048,color:'#D4C8A0',glow:'rgba(210,200,160,'},{name:'Ganymede',orbit:58,size:4,speed:0.033,color:'#A89060',glow:'rgba(170,145,100,'},{name:'Callisto',orbit:71,size:3.5,speed:0.024,color:'#887060',glow:'rgba(140,115,100,'}], available:true, comingSoon:true, fact:"King of planets. Great Red Spot: a storm older than recorded history.", divides:['EEX','ES'], noiseSeed:55 },
  { id:'saturn',  name:'Saturn',  sem:'sem6', label:'Semester 6', orbit:382, size:18, speed:0.032, color:'#E4D191', glow:'rgba(240,220,130,', grad:null, bands:['#D8C070','#F0E090','#C8A850','#E8D880','#F0E090','#C8A850','#D8C070','#E8D060'], rings:true, ringParticles:false, moons:[{name:'Titan',orbit:40,size:4,speed:0.038,color:'#E8A020',glow:'rgba(230,160,30,'},{name:'Enceladus',orbit:52,size:2.5,speed:0.052,color:'#EEEEFF',glow:'rgba(220,220,255,'},{name:'Rhea',orbit:64,size:3,speed:0.033,color:'#CCCCCC',glow:'rgba(200,200,200,'}], available:true, comingSoon:true, fact:'The Ringed Beauty. Rings span 282,000 km — mostly ice.', divides:['EEX','ES'], noiseSeed:66 },
  { id:'uranus',  name:'Uranus',  sem:'sem7', label:'Semester 7', orbit:464, size:13, speed:0.019, color:'#7DE8E8', glow:'rgba(120,230,230,', grad:[[0,'#A0FFFF'],[0.5,'#50C8C8'],[1,'#208080']], bands:null, rings:false, ringParticles:true, ringColor:'rgba(160,220,220,', moons:[{name:'Miranda',orbit:27,size:2.5,speed:0.058,color:'#BBCCDD',glow:'rgba(180,200,220,'},{name:'Ariel',orbit:37,size:3,speed:0.043,color:'#AABBCC',glow:'rgba(170,188,204,'},{name:'Umbriel',orbit:47,size:2.8,speed:0.031,color:'#99AABB',glow:'rgba(155,170,187,'}], available:true, comingSoon:true, fact:'Ice giant tilted 98°. Its axis is nearly horizontal.', divides:['EEX','ES'], noiseSeed:77 },
  { id:'neptune', name:'Neptune', sem:'sem8', label:'Semester 8', orbit:534, size:12, speed:0.013, color:'#4B70DD', glow:'rgba(100,130,240,', grad:[[0,'#8090FF'],[0.5,'#3050CC'],[1,'#1030AA']], bands:null, rings:false, ringParticles:true, ringColor:'rgba(80,100,200,', moons:[{name:'Triton',orbit:30,size:3.5,speed:0.047,color:'#CCCCFF',glow:'rgba(200,200,255,'},{name:'Nereid',orbit:42,size:2,speed:0.033,color:'#AAAACC',glow:'rgba(170,170,204,'}], available:true, comingSoon:true, fact:'Windiest world. Storms reach 2,100 km/h. Most distant planet.', divides:['EEX','ES'], noiseSeed:88 },
]

const CONSTELLATIONS = [
  { name:'Orion',     color:[200,200,255], stars:[[0.07,0.22],[0.11,0.20],[0.14,0.23],[0.09,0.28],[0.12,0.28],[0.13,0.28],[0.07,0.35],[0.14,0.34],[0.10,0.18]], lines:[[0,1],[1,2],[0,3],[2,4],[3,5],[3,6],[4,7],[8,1],[8,2]] },
  { name:'Scorpius',  color:[255,180,150], stars:[[0.88,0.55],[0.86,0.58],[0.84,0.61],[0.83,0.65],[0.82,0.69],[0.80,0.72],[0.78,0.71],[0.90,0.53],[0.92,0.51]], lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,7],[7,8]] },
  { name:'Cassiopeia',color:[200,220,255], stars:[[0.24,0.07],[0.28,0.05],[0.32,0.08],[0.36,0.06],[0.40,0.09]], lines:[[0,1],[1,2],[2,3],[3,4]] },
  { name:'Ursa Major',color:[180,200,255], stars:[[0.82,0.12],[0.86,0.11],[0.90,0.13],[0.88,0.17],[0.84,0.19],[0.80,0.17],[0.76,0.15],[0.72,0.14]], lines:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[5,6],[6,7]] },
  { name:'Lyra',      color:[255,255,200], stars:[[0.76,0.45],[0.78,0.42],[0.80,0.45],[0.79,0.48],[0.77,0.48]], lines:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,2]] },
]

const GALAXIES = [
  { name:'Milky Way',  desc:'Our home — 100,000 light-years across',   color:'rgba(200,180,255,0.7)' },
  { name:'Andromeda',  desc:'Nearest large galaxy, on collision course',color:'rgba(180,200,255,0.7)' },
  { name:'Triangulum', desc:'Third-largest in Local Group, 2.7M ly',   color:'rgba(255,200,180,0.7)' },
  { name:'Whirlpool',  desc:'Classic grand-design spiral, 23M ly',     color:'rgba(160,255,200,0.7)' },
]

// Glow overrides per galaxy (index matches SOLAR)
const GALAXY_GLOWS = [
  null,
  ['rgba(180,160,255,','rgba(140,150,255,','rgba(100,110,255,','rgba(170,120,240,','rgba(120,100,230,','rgba(160,145,250,','rgba(130,180,255,','rgba(90,110,245,'],
  ['rgba(220,160,70,', 'rgba(255,175,55,', 'rgba(220,115,55,', 'rgba(245,105,45,', 'rgba(200,135,65,', 'rgba(245,195,75,', 'rgba(225,155,95,', 'rgba(195,125,65,'],
  ['rgba(75,215,195,', 'rgba(55,225,145,', 'rgba(45,195,140,', 'rgba(95,215,120,', 'rgba(55,195,165,', 'rgba(105,230,180,', 'rgba(65,215,225,', 'rgba(45,180,195,'],
]

// Nebula colours per galaxy
const GALAXY_NEBULAE = [
  [[80,50,200],[190,40,80],[40,140,190],[100,190,60]],
  [[90,55,240],[65,40,230],[85,65,245],[125,55,245]],
  [[210,120,35],[195,75,35],[185,145,55],[165,95,35]],
  [[40,195,165],[40,205,120],[55,185,205],[80,205,100]],
]

// Per-galaxy planet color overrides for texture generation
const GALAXY_PLANET_COLORS = [
  null, // Milky Way — defaults
  // Andromeda — violet/indigo
  [
    { grad:[[0,'#C8B4FF'],[0.6,'#7755CC'],[1,'#4433AA']] },
    { grad:[[0,'#B0A0FF'],[0.6,'#6644BB'],[1,'#443388']] },
    { grad:[[0,'#8888FF'],[0.45,'#4455CC'],[1,'#2233AA']] },
    { grad:[[0,'#AA88FF'],[0.6,'#7744BB'],[1,'#4422AA']] },
    { bands:['#7868AA','#9A88CC','#5648AA','#8878CC','#B0A0EE','#5648AA','#7868AA','#9A88CC','#887888'] },
    { bands:['#8878BB','#AAAADD','#6656AA','#9989CC','#AAAADD','#6656AA','#8878BB','#9989CC'] },
    { grad:[[0,'#9090FF'],[0.5,'#6060CC'],[1,'#303088']] },
    { grad:[[0,'#7080FF'],[0.5,'#4050CC'],[1,'#2030AA']] },
  ],
  // Triangulum — amber/copper
  [
    { grad:[[0,'#FFD080'],[0.6,'#C87020'],[1,'#884010']] },
    { grad:[[0,'#FFCC60'],[0.6,'#DD8020'],[1,'#AA5010']] },
    { grad:[[0,'#FF9050'],[0.45,'#CC5520'],[1,'#882200']] },
    { grad:[[0,'#FF7040'],[0.6,'#CC3010'],[1,'#881000']] },
    { bands:['#CC7820','#EE9840','#AA5800','#DD7830','#FFAA60','#AA5800','#CC7820','#EE9840','#BB6810'] },
    { bands:['#AA8000','#CCAA20','#886000','#BBAA00','#CCAA20','#886000','#AA8000','#BBAA10'] },
    { grad:[[0,'#FFAA80'],[0.5,'#CC7050'],[1,'#883020']] },
    { grad:[[0,'#FF8070'],[0.5,'#CC4040'],[1,'#881820']] },
  ],
  // Whirlpool — teal/emerald
  [
    { grad:[[0,'#80FFE8'],[0.6,'#20CC88'],[1,'#108850']] },
    { grad:[[0,'#60FFCC'],[0.6,'#20AA70'],[1,'#107750']] },
    { grad:[[0,'#50FFB0'],[0.45,'#20AA60'],[1,'#108840']] },
    { grad:[[0,'#70FFB0'],[0.6,'#20CC60'],[1,'#108040']] },
    { bands:['#208870','#40AA88','#106650','#309878','#60CCA0','#106650','#208870','#40AA88','#207A6A'] },
    { bands:['#20AA80','#40CC98','#108860','#38BB88','#50CC98','#108860','#20AA80','#40BB90'] },
    { grad:[[0,'#80FFD0'],[0.5,'#40CCA0'],[1,'#208860']] },
    { grad:[[0,'#60FFCC'],[0.5,'#30CC90'],[1,'#108860']] },
  ],
]

// ── Helpers ───────────────────────────────────────────────────────────────
function darkenHex(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.max(0,(n>>16)-amt), g = Math.max(0,((n>>8)&0xff)-amt), b = Math.max(0,(n&0xff)-amt)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function vnoise(x, y, seed) {
  const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy
  const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy)
  const h=(nx,ny)=>{ const v=Math.sin(nx*127.1+ny*311.7+seed*74.3)*43758.5453; return v-Math.floor(v) }
  return h(ix,iy)*(1-ux)*(1-uy)+h(ix+1,iy)*ux*(1-uy)+h(ix,iy+1)*(1-ux)*uy+h(ix+1,iy+1)*ux*uy
}
function fbm(x, y, seed, oct=4) {
  let v=0, a=0.5, f=1, mx=0
  for(let i=0;i<oct;i++){ v+=vnoise(x*f,y*f,seed)*a; mx+=a; a*=0.5; f*=2 }
  return v/mx
}

const texCache = {}
function getTexture(p, r, galaxyIdx) {
  const gi = galaxyIdx || 0
  const key = `${p.id}_${gi}_${Math.round(r/1.5)*2}`
  if(texCache[key]) return texCache[key]
  const colorOvr = GALAXY_PLANET_COLORS[gi]?.[SOLAR.indexOf(p)] || null
  const pData = colorOvr ? { ...p, ...colorOvr } : p
  const sz=Math.ceil(r*2)+8, cx=sz/2, cy=sz/2
  const oc=document.createElement('canvas'); oc.width=oc.height=sz
  const ox=oc.getContext('2d')
  ox.save(); ox.beginPath(); ox.arc(cx,cy,r,0,Math.PI*2); ox.clip()
  if(pData.bands) {
    const bh=(r*2)/pData.bands.length
    pData.bands.forEach((c,i)=>{ ox.fillStyle=c; ox.fillRect(cx-r,cy-r+i*bh,r*2,bh+1) })
    if(p.id==='jupiter'){ ox.fillStyle='rgba(160,50,15,0.62)'; ox.beginPath(); ox.ellipse(cx+r*0.28,cy+r*0.12,r*0.24,r*0.15,0,0,Math.PI*2); ox.fill() }
  } else if(pData.grad) {
    const g=ox.createRadialGradient(cx-r*0.3,cy-r*0.3,0,cx,cy,r)
    pData.grad.forEach(([s,c])=>g.addColorStop(s,c))
    ox.fillStyle=g; ox.fillRect(cx-r,cy-r,r*2,r*2)
    if(p.id==='earth'){ ox.fillStyle='rgba(255,255,255,0.07)'; ox.fillRect(cx-r,cy-r,r*2,r*2) }
  }
  const id=ox.getImageData(0,0,sz,sz)
  for(let px2=0;px2<sz;px2++) for(let py2=0;py2<sz;py2++){
    const dx=(px2-cx)/r, dy=(py2-cy)/r
    if(dx*dx+dy*dy>1) continue
    const i=(py2*sz+px2)*4
    const n=(fbm(px2/r*3,py2/r*3,p.noiseSeed)-0.5)*55
    id.data[i]=Math.max(0,Math.min(255,id.data[i]+n))
    id.data[i+1]=Math.max(0,Math.min(255,id.data[i+1]+n))
    id.data[i+2]=Math.max(0,Math.min(255,id.data[i+2]+n))
  }
  ox.putImageData(id,0,0)
  ox.restore()
  texCache[key]=oc; return oc
}

// ── Asteroid belt seeds (pre-computed, stable) ───────────────────────────
function _genAsteroidVerts(seed, count) {
  const v = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const r = 0.55 + ((Math.sin(seed*17.3+i*31.7)+Math.cos(seed*7.1+i*23.9))*.25+.5)*.45
    v.push([Math.cos(a)*r, Math.sin(a)*r])
  }
  return v
}
const ASTEROID_SEEDS = Array.from({length:12},(_,i)=>({
  id:i, orbitBase:220+(i%4)*5,
  angleOffset:(i/12)*Math.PI*2,
  speed:0.022+(i%5)*.004, size:1.8+(i%3)*.5,
  verts:_genAsteroidVerts(i*7+3, 6+(i%3)),
}))

// ── Satellite shape drawers (ctx passed explicitly) ───────────────────────
function drawISS(ctx,x,y,r){
  const s=Math.max(r*2.8,3)
  ctx.save(); ctx.translate(x,y)
  ctx.fillStyle='rgba(195,210,225,0.92)'; ctx.fillRect(-s*2.6,-s*.12,s*5.2,s*.24)
  ctx.fillStyle='rgba(70,115,185,0.88)'
  ctx.fillRect(-s*2.5,-s*.85,s*.95,s*1.7); ctx.fillRect(-s*1.35,-s*.85,s*.95,s*1.7)
  ctx.fillRect(s*.4,-s*.85,s*.95,s*1.7); ctx.fillRect(s*1.55,-s*.85,s*.95,s*1.7)
  ctx.fillStyle='rgba(215,225,235,0.96)'; ctx.fillRect(-s*.42,-s*.5,s*.84,s)
  ctx.restore()
}
function drawHubble(ctx,x,y,r){
  const s=Math.max(r*2.8,3)
  ctx.save(); ctx.translate(x,y)
  ctx.fillStyle='rgba(178,192,208,0.90)'; ctx.fillRect(-s*.38,-s*1.1,s*.76,s*2.2)
  ctx.fillStyle='rgba(65,105,175,0.85)'
  ctx.fillRect(-s*1.9,-s*.18,s*1.4,s*.36); ctx.fillRect(s*.5,-s*.18,s*1.4,s*.36)
  ctx.beginPath(); ctx.arc(0,-s*.75,s*.32,0,Math.PI*2)
  ctx.strokeStyle='rgba(215,225,235,0.88)'; ctx.lineWidth=s*.1; ctx.stroke()
  ctx.restore()
}
function drawGPSSat(ctx,x,y,r){
  const s=Math.max(r*2.8,3)
  ctx.save(); ctx.translate(x,y)
  ctx.fillStyle='rgba(172,186,200,0.90)'; ctx.fillRect(-s*.42,-s*.52,s*.84,s*1.04)
  ctx.fillStyle='rgba(65,105,175,0.85)'
  ctx.fillRect(-s*2.1,-s*.3,s*1.55,s*.6); ctx.fillRect(s*.55,-s*.3,s*1.55,s*.6)
  ctx.beginPath(); ctx.arc(0,-s*.62,s*.24,0,Math.PI*2)
  ctx.strokeStyle='rgba(215,225,235,0.82)'; ctx.lineWidth=s*.08; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0,-s*.38); ctx.lineTo(0,-s*.62); ctx.stroke()
  ctx.restore()
}

// ── Star Field Canvas ─────────────────────────────────────────────────────
function StarFieldCanvas({ canvasRef, warpRef, galaxyIdx }) {
  const galaxyIdxRef = useRef(0)
  useEffect(()=>{ galaxyIdxRef.current = galaxyIdx||0 },[galaxyIdx])
  const starsRef   = useRef(null)
  const cometsRef  = useRef([])
  const shootRef   = useRef([])
  const lastShootRef = useRef(0)
  const lastCometRef = useRef(0)
  const rafRef     = useRef(null)
  const t0         = useRef(performance.now())

  useEffect(() => {
    const cv = canvasRef.current; if(!cv) return
    const ctx = cv.getContext('2d')
    const COLORS=[[255,255,255],[200,220,255],[255,240,200],[255,200,200],[180,255,220]]

    const resize = () => {
      cv.width=window.innerWidth; cv.height=window.innerHeight
      const W=cv.width, H=cv.height
      starsRef.current = Array.from({length:900},()=>{
        const c=COLORS[Math.floor(Math.random()*COLORS.length)]
        return { x:Math.random()*W, y:Math.random()*H, r:0.3+Math.random()*1.8,
          op:0.3+Math.random()*0.7, ts:0.5+Math.random()*2.5, to:Math.random()*Math.PI*2, c }
      })
    }
    window.addEventListener('resize',resize); resize()

    function spawnComet(W,H) {
      const side=Math.floor(Math.random()*4)
      let x,y, tx=W/2+(Math.random()-.5)*W*.5, ty=H/2+(Math.random()-.5)*H*.5
      if(side===0){x=Math.random()*W;y=-60} else if(side===1){x=W+60;y=Math.random()*H}
      else if(side===2){x=Math.random()*W;y=H+60} else{x=-60;y=Math.random()*H}
      const dx=tx-x, dy=ty-y, len=Math.sqrt(dx*dx+dy*dy)
      const spd=55+Math.random()*70
      cometsRef.current.push({ x,y, vx:dx/len*spd, vy:dy/len*spd,
        size:2.5+Math.random()*2, tailLen:100+Math.random()*140,
        dustColor:`rgba(255,${180+Math.floor(Math.random()*50)},80,`,
        ionColor:'rgba(140,180,255,', history:[], life:1 })
    }

    function draw(now) {
      const W=cv.width, H=cv.height
      const t=(now-t0.current)/1000
      const dt=Math.min((now-(rafRef._last||now))/1000,.05); rafRef._last=now
      ctx.clearRect(0,0,W,H)

      const mw=ctx.createLinearGradient(0,H*.1,W,H*.9)
      mw.addColorStop(0,'transparent'); mw.addColorStop(.35,'rgba(155,135,225,.028)')
      mw.addColorStop(.5,'rgba(185,165,255,.05)'); mw.addColorStop(.65,'rgba(155,135,225,.028)'); mw.addColorStop(1,'transparent')
      ctx.fillStyle=mw; ctx.fillRect(0,0,W,H)

      const _nebs=GALAXY_NEBULAE[galaxyIdxRef.current]||GALAXY_NEBULAE[0]
      const _nebPos=[[W*.1,H*.17,145,_nebs[0]],[W*.87,H*.75,115,_nebs[1]],[W*.62,H*.1,98,_nebs[2]],[W*.22,H*.85,108,_nebs[3]]]
      _nebPos.forEach(([nx,ny,nr,nc])=>{
        const g=ctx.createRadialGradient(nx,ny,0,nx,ny,nr)
        g.addColorStop(0,`rgba(${nc},.07)`); g.addColorStop(1,'transparent')
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2); ctx.fill()
      })

      ;(starsRef.current||[]).forEach(s=>{
        const tw=Math.sin(t*s.ts+s.to)*.35+.65
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r*tw,0,Math.PI*2)
        ctx.fillStyle=`rgba(${s.c},${s.op*tw})`; ctx.fill()
        if(s.r>1.4){
          ctx.strokeStyle=`rgba(${s.c},${s.op*tw*.28})`; ctx.lineWidth=.4
          ctx.beginPath(); ctx.moveTo(s.x-s.r*4,s.y); ctx.lineTo(s.x+s.r*4,s.y); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(s.x,s.y-s.r*4); ctx.lineTo(s.x,s.y+s.r*4); ctx.stroke()
        }
      })

      CONSTELLATIONS.forEach(cn=>{
        const pts=cn.stars.map(([fx,fy])=>([fx*W,fy*H]))
        ctx.strokeStyle=`rgba(${cn.color},.18)`; ctx.lineWidth=.4; ctx.setLineDash([3,8])
        cn.lines.forEach(([a,b])=>{ ctx.beginPath(); ctx.moveTo(...pts[a]); ctx.lineTo(...pts[b]); ctx.stroke() })
        ctx.setLineDash([])
        pts.forEach(([px2,py2])=>{ ctx.beginPath(); ctx.arc(px2,py2,1.4,0,Math.PI*2); ctx.fillStyle=`rgba(${cn.color},.65)`; ctx.fill() })
        const cx2=pts.reduce((s,p)=>s+p[0],0)/pts.length
        const cy2=pts.reduce((s,p)=>s+p[1],0)/pts.length
        ctx.fillStyle=`rgba(${cn.color},.35)`; ctx.font="9px 'DM Mono',monospace"
        ctx.textAlign='center'; ctx.fillText(cn.name,cx2,cy2-14)
      })

      if(now-lastShootRef.current>3200+Math.random()*5000){ lastShootRef.current=now; shootRef.current.push({x:Math.random()*W*.6,y:Math.random()*H*.4,dx:4+Math.random()*7,dy:2+Math.random()*5,life:1}) }
      shootRef.current=shootRef.current.filter(sh=>sh.life>0)
      shootRef.current.forEach(sh=>{
        const g=ctx.createLinearGradient(sh.x,sh.y,sh.x-sh.dx*9,sh.y-sh.dy*9)
        g.addColorStop(0,`rgba(255,255,255,${sh.life})`); g.addColorStop(1,'transparent')
        ctx.strokeStyle=g; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(sh.x-sh.dx*9,sh.y-sh.dy*9); ctx.stroke()
        sh.x+=sh.dx*dt*60; sh.y+=sh.dy*dt*60; sh.life-=.022
      })

      if(now-lastCometRef.current>3500+Math.random()*5500){ lastCometRef.current=now; spawnComet(W,H) }
      cometsRef.current=cometsRef.current.filter(c=>c.life>0&&c.x>-200&&c.x<W+200&&c.y>-200&&c.y<H+200)
      cometsRef.current.forEach(cm=>{
        cm.history.push([cm.x,cm.y])
        if(cm.history.length>22) cm.history.shift()
        cm.x+=cm.vx*dt; cm.y+=cm.vy*dt; cm.life-=.004
        if(cm.history.length>2){
          for(let hi=cm.history.length-1;hi>0;hi--){
            const frac=hi/cm.history.length
            const [hx,hy]=cm.history[hi], [hx2,hy2]=cm.history[hi-1]
            ctx.strokeStyle=`${cm.dustColor}${frac*.55*cm.life})`; ctx.lineWidth=2.5*frac*cm.life
            ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(hx2,hy2); ctx.stroke()
          }
        }
        const sunX=W/2, sunY=H/2
        const ax=cm.x-sunX, ay=cm.y-sunY, alen=Math.sqrt(ax*ax+ay*ay)||1
        const tx2=cm.x+ax/alen*cm.tailLen, ty2=cm.y+ay/alen*cm.tailLen
        const ig=ctx.createLinearGradient(cm.x,cm.y,tx2,ty2)
        ig.addColorStop(0,`${cm.ionColor}${.7*cm.life})`); ig.addColorStop(1,'transparent')
        ctx.strokeStyle=ig; ctx.lineWidth=1.2*cm.life
        ctx.beginPath(); ctx.moveTo(cm.x,cm.y); ctx.lineTo(tx2,ty2); ctx.stroke()
        const ng=ctx.createRadialGradient(cm.x,cm.y,0,cm.x,cm.y,cm.size*3)
        ng.addColorStop(0,`rgba(255,255,255,${cm.life})`); ng.addColorStop(1,'transparent')
        ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(cm.x,cm.y,cm.size*3,0,Math.PI*2); ctx.fill()
        ctx.fillStyle=`rgba(255,255,255,${cm.life})`; ctx.beginPath(); ctx.arc(cm.x,cm.y,cm.size*.7,0,Math.PI*2); ctx.fill()
      })

      if(warpRef && warpRef.current && warpRef.current.active) {
        const wp=Math.min(1,warpRef.current.progress)
        const cx3=W/2, cy3=H/2
        for(let i=0;i<200;i++){
          const a=(i/200)*Math.PI*2
          const sR=8+(i%40)*6
          const len=wp*700*(0.4+(i%9)*.07)
          const x1=cx3+Math.cos(a)*sR, y1=cy3+Math.sin(a)*sR
          const x2=cx3+Math.cos(a)*(sR+len), y2=cy3+Math.sin(a)*(sR+len)
          const sg=ctx.createLinearGradient(x1,y1,x2,y2)
          sg.addColorStop(0,'transparent')
          sg.addColorStop(Math.min(sR/(sR+len)+.08,.95),`rgba(180,200,255,${wp*.7})`)
          sg.addColorStop(1,'transparent')
          ctx.strokeStyle=sg; ctx.lineWidth=.4+wp*.9
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
        }
        const fade=wp>.65?(wp-.65)/.35:0
        ctx.fillStyle=`rgba(210,230,255,${fade*.9})`; ctx.fillRect(0,0,W,H)
        if(wp>=.999&&!warpRef.current.called){ warpRef.current.called=true; setTimeout(()=>warpRef.current.callback?.(),80) }
      }

      rafRef.current=requestAnimationFrame(draw)
    }
    rafRef.current=requestAnimationFrame(draw)
    return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('resize',resize) }
  },[])
  return null
}

// ── Solar System Canvas ───────────────────────────────────────────────────
function SolarCanvas({ canvasRef, onPlanetClick, zoomedId, galaxyIdx, onSatelliteClick, onAsteroidDestroy }) {
  const galaxyIdxRef = useRef(0)
  useEffect(()=>{ galaxyIdxRef.current = galaxyIdx||0 },[galaxyIdx])
  const angRef  = useRef(Object.fromEntries(SOLAR.flatMap(p=>[
    [p.id,Math.random()*Math.PI*2], ...p.moons.map(m=>[`${p.id}_${m.name}`,Math.random()*Math.PI*2])
  ])))
  const posRef  = useRef({})
  const zfRef   = useRef(1)
  const zIdRef  = useRef(null)
  const trailRef= useRef(Object.fromEntries(SOLAR.map(p=>[p.id,[]])))
  const ringRef = useRef(Object.fromEntries(
    SOLAR.filter(p=>p.ringParticles).map(p=>[p.id, Array.from({length:280},(_,i)=>({ a:(i/280)*Math.PI*2, r:1.3+Math.random()*.6, op:.15+Math.random()*.4 }))])
  ))
  const rafRef  = useRef(null)
  const lastRef = useRef(performance.now())
  const t0      = useRef(performance.now())
  const satPosRef       = useRef({})
  const astPosRef       = useRef({})
  const fragmentsRef    = useRef([])
  const mouseRef        = useRef(null)
  const hovAstRef       = useRef(null)
  const astDestroyedRef = useRef({})
  const onSatClickRef   = useRef(onSatelliteClick)
  const onAstDestroyRef = useRef(onAsteroidDestroy)
  useEffect(()=>{ onSatClickRef.current=onSatelliteClick },[onSatelliteClick])
  useEffect(()=>{ onAstDestroyRef.current=onAsteroidDestroy },[onAsteroidDestroy])

  useEffect(()=>{ zIdRef.current=zoomedId },[zoomedId])

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const ctx=cv.getContext('2d')
    const resize=()=>{ cv.width=window.innerWidth; cv.height=window.innerHeight }
    window.addEventListener('resize',resize); resize()

    function drawSun(cx,cy,t,BS){
      const sr=42*BS
      ;[5,4,3,2,1,0].forEach(l=>{
        const lr=sr+l*sr*.55
        const g=ctx.createRadialGradient(cx,cy,sr,cx,cy,lr)
        g.addColorStop(0,`rgba(255,160,40,${.062-l*.009})`); g.addColorStop(1,'transparent')
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,lr,0,Math.PI*2); ctx.fill()
      })
      for(let f=0;f<8;f++){
        const fa=(f/8)*Math.PI*2+t*.2
        const fl=sr*(1.5+Math.sin(t*1.3+f)*.25)
        const g=ctx.createLinearGradient(cx,cy,cx+Math.cos(fa)*fl*2.5,cy+Math.sin(fa)*fl*2.5)
        g.addColorStop(0,'rgba(255,220,60,.14)'); g.addColorStop(1,'transparent')
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(cx,cy)
        ctx.lineTo(cx+Math.cos(fa-.09)*fl*2.5,cy+Math.sin(fa-.09)*fl*2.5)
        ctx.lineTo(cx+Math.cos(fa+.09)*fl*2.5,cy+Math.sin(fa+.09)*fl*2.5)
        ctx.closePath(); ctx.fill()
      }
      const sg=ctx.createRadialGradient(cx-sr*.3,cy-sr*.3,0,cx,cy,sr)
      sg.addColorStop(0,'#FFFFFF'); sg.addColorStop(.25,'#FFEE80'); sg.addColorStop(.7,'#FFB020'); sg.addColorStop(1,'#FF7000')
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,sr,0,Math.PI*2); ctx.fill()
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,sr,0,Math.PI*2); ctx.clip()
      for(let ss=0;ss<3;ss++){
        const sa=t*.05+ss*2.1
        ctx.fillStyle='rgba(150,65,0,.28)'
        ctx.beginPath(); ctx.ellipse(cx+Math.cos(sa)*sr*.4,cy+Math.sin(sa)*sr*.18,sr*.11,sr*.08,sa*.5,0,Math.PI*2); ctx.fill()
      }
      ctx.restore()
      ctx.fillStyle='#FFB030'
      ctx.font=`bold ${Math.max(7,sr*.4)}px 'DM Mono',monospace`
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText('RVU',cx,cy)
      ctx.textBaseline='alphabetic'
    }

    function drawPlanetBody(p,x,y,r,t,glowOverride){
      const glow=glowOverride||p.glow
      const g=ctx.createRadialGradient(x,y,r*.6,x,y,r*3.2)
      g.addColorStop(0,glow+'.28)'); g.addColorStop(.5,glow+'.07)'); g.addColorStop(1,'transparent')
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*3.2,0,Math.PI*2); ctx.fill()
      const tex=getTexture(p,r,galaxyIdxRef.current)
      if(tex){
        ctx.save(); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.clip()
        ctx.drawImage(tex,x-r-4,y-r-4,tex.width,tex.height)
        ctx.restore()
      }
      const rim=ctx.createRadialGradient(x,y,r*.85,x,y,r)
      rim.addColorStop(0,'transparent'); rim.addColorStop(1,glow+'.35)')
      ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill()
      for(let arc=0;arc<3;arc++){
        const sa=t*(.32+arc*.26)+(arc*Math.PI*2/3)
        const ag=ctx.createLinearGradient(x+Math.cos(sa)*(r+6),y+Math.sin(sa)*(r+6),x+Math.cos(sa+Math.PI)*(r+6),y+Math.sin(sa+Math.PI)*(r+6))
        ag.addColorStop(0,glow+'0)'); ag.addColorStop(.5,glow+'.52)'); ag.addColorStop(1,glow+'0)')
        ctx.beginPath(); ctx.arc(x,y,r+5,sa,sa+Math.PI*.6)
        ctx.strokeStyle=ag; ctx.lineWidth=2; ctx.stroke()
      }
      if(p.rings){
        ctx.save(); ctx.translate(x,y); ctx.scale(1,.27)
        for(let ri=0;ri<4;ri++){
          const ir=r*(1.22+ri*.26), or2=r*(1.44+ri*.26)
          const rg=ctx.createRadialGradient(0,0,ir,0,0,or2)
          rg.addColorStop(0,`rgba(200,178,110,${.72-ri*.14})`); rg.addColorStop(1,`rgba(200,178,110,${.38-ri*.08})`)
          ctx.beginPath(); ctx.arc(0,0,(ir+or2)/2,0,Math.PI*2); ctx.lineWidth=or2-ir; ctx.strokeStyle=rg; ctx.stroke()
        }
        ctx.restore()
      }
      if(p.ringParticles && ringRef.current[p.id]){
        const rps=ringRef.current[p.id]
        ctx.save(); ctx.translate(x,y)
        if(p.id==='uranus') ctx.rotate(Math.PI*.5)
        ctx.scale(1, p.id==='uranus'?1:.2)
        rps.forEach(rp=>{
          const aa=rp.a+t*.07
          const px2=Math.cos(aa)*rp.r*r, py2=Math.sin(aa)*rp.r*r
          ctx.beginPath(); ctx.arc(px2,py2,.7,0,Math.PI*2)
          ctx.fillStyle=`${p.ringColor}${rp.op*(.4+Math.sin(aa*3+t)*.15)})`; ctx.fill()
        })
        ctx.restore()
      }
    }

    function drawMoon(m,x,y,r2){
      const g=ctx.createRadialGradient(x,y,0,x,y,r2*2.8)
      g.addColorStop(0,m.glow+'.4)'); g.addColorStop(1,'transparent')
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r2*2.8,0,Math.PI*2); ctx.fill()
      const mg=ctx.createRadialGradient(x-r2*.3,y-r2*.3,0,x,y,r2)
      mg.addColorStop(0,m.color); mg.addColorStop(1,darkenHex(m.color,50))
      ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(x,y,r2,0,Math.PI*2); ctx.fill()
    }

    function draw(now){
      const W=cv.width, H=cv.height
      const dt=Math.min(now-lastRef.current,60)/1000; lastRef.current=now
      const t=(now-t0.current)/1000
      ctx.clearRect(0,0,W,H)
      const BSx=(W*(W<600?0.68:0.44))/512, BSy=(H*(W<600?0.68:0.44))/512, BS=Math.sqrt(BSx*BSy)
      const CX=W/2, CY=H/2

      const targetZf=zIdRef.current?4:1
      zfRef.current+=(targetZf-zfRef.current)*.055
      const zf=zfRef.current
      let pivotX=CX, pivotY=CY
      if(zIdRef.current){
        const zp2=SOLAR.find(p=>p.id===zIdRef.current)
        if(zp2){ pivotX=CX+Math.cos(angRef.current[zp2.id])*zp2.orbit*BSx; pivotY=CY+Math.sin(angRef.current[zp2.id])*zp2.orbit*BSy }
      }

      ctx.save()
      if(zf>1.02){ ctx.translate(pivotX,pivotY); ctx.scale(zf,zf); ctx.translate(-pivotX,-pivotY) }

      SOLAR.forEach(p=>{
        angRef.current[p.id]=(angRef.current[p.id]+p.speed*dt)%(Math.PI*2)
        p.moons.forEach(m=>{ const k=`${p.id}_${m.name}`; angRef.current[k]=(angRef.current[k]+m.speed*dt)%(Math.PI*2) })
      })

      // Asteroid dust (background filler)
      for(let i=0;i<110;i++){
        const aa=(i/110)*Math.PI*2+t*.003
        const arx=(232+Math.sin(i*17.3)*8)*BSx, ary=(232+Math.sin(i*17.3)*8)*BSy
        ctx.beginPath(); ctx.arc(CX+Math.cos(aa)*arx,CY+Math.sin(aa)*ary,.55,0,Math.PI*2)
        ctx.fillStyle=`rgba(175,158,135,${.09+Math.sin(i*7)*.04})`; ctx.fill()
      }

      // Hover detection (uses previous frame's astPosRef)
      hovAstRef.current=null
      if(mouseRef.current){
        const {x:_mx,y:_my}=mouseRef.current
        for(const a of ASTEROID_SEEDS){
          if(astDestroyedRef.current[a.id]) continue
          const ap=astPosRef.current[a.id]; if(!ap) continue
          if(Math.hypot(_mx-ap.x,_my-ap.y)<ap.r){ hovAstRef.current=a.id; break }
        }
      }
      cv.style.cursor=hovAstRef.current!==null?'pointer':'crosshair'

      // Interactive asteroids
      ASTEROID_SEEDS.forEach(a=>{
        if(astDestroyedRef.current[a.id]) return
        const aang=a.angleOffset+t*a.speed
        const _arx=a.orbitBase*BSx, _ary=a.orbitBase*BSy
        const ax=CX+Math.cos(aang)*_arx, ay=CY+Math.sin(aang)*_ary
        const ar=a.size*BS*1.4
        const isHov=hovAstRef.current===a.id
        ctx.save(); ctx.translate(ax,ay); ctx.rotate(t*0.28+a.id)
        const ag=ctx.createRadialGradient(0,0,0,0,0,ar*2.8)
        ag.addColorStop(0,isHov?`rgba(255,130,60,0.48)`:`rgba(175,158,130,0.3)`); ag.addColorStop(1,'transparent')
        ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,0,ar*2.8,0,Math.PI*2); ctx.fill()
        ctx.beginPath()
        a.verts.forEach(([vx2,vy2],vi)=>{ if(vi===0) ctx.moveTo(vx2*ar,vy2*ar); else ctx.lineTo(vx2*ar,vy2*ar) })
        ctx.closePath()
        ctx.fillStyle=isHov?'rgba(188,155,118,0.92)':'rgba(152,137,114,0.86)'; ctx.fill()
        ctx.strokeStyle=isHov?'rgba(255,148,68,0.82)':'rgba(198,180,155,0.55)'; ctx.lineWidth=isHov?.9:.5; ctx.stroke()
        ctx.restore()
        if(isHov){
          ctx.save(); ctx.translate(ax,ay)
          const rs=ar*3.4, bl=rs*.42
          ctx.strokeStyle=`rgba(255,72,32,${.52+Math.sin(t*5)*.18})`; ctx.lineWidth=.8
          for(let qi=0;qi<4;qi++){
            ctx.save(); ctx.rotate(qi*Math.PI/2)
            ctx.beginPath(); ctx.moveTo(-rs,-rs+bl); ctx.lineTo(-rs,-rs); ctx.lineTo(-rs+bl,-rs); ctx.stroke()
            ctx.restore()
          }
          ctx.restore()
        }
        let sax=ax,say=ay
        if(zf>1.02){ sax=(ax-pivotX)*zf+pivotX; say=(ay-pivotY)*zf+pivotY }
        astPosRef.current[a.id]={x:sax,y:say,r:Math.max(ar*zf*2.8,14)}
      })

      SOLAR.forEach(p=>{
        const alpha=(zIdRef.current&&zIdRef.current!==p.id)?.04:.1
        ctx.beginPath(); ctx.ellipse(CX,CY,p.orbit*BSx,p.orbit*BSy,0,0,Math.PI*2)
        ctx.strokeStyle=`rgba(255,255,255,${alpha})`; ctx.lineWidth=.4
        ctx.setLineDash([2,8]); ctx.stroke(); ctx.setLineDash([])
        const trail=trailRef.current[p.id]
        const wx=CX+Math.cos(angRef.current[p.id])*p.orbit*BSx
        const wy=CY+Math.sin(angRef.current[p.id])*p.orbit*BSy
        trail.push([wx,wy]); if(trail.length>35) trail.shift()
        if(trail.length>2){
          for(let ti=trail.length-1;ti>0;ti--){
            const frac=ti/trail.length
            ctx.strokeStyle=`${p.glow}${frac*.22})`; ctx.lineWidth=p.size*BS*frac*.6
            ctx.beginPath(); ctx.moveTo(...trail[ti]); ctx.lineTo(...trail[ti-1]); ctx.stroke()
          }
        }
      })

      drawSun(CX,CY,t,BS)

      SOLAR.forEach(p=>{
        const ang=angRef.current[p.id]
        const wx=CX+Math.cos(ang)*p.orbit*BSx
        const wy=CY+Math.sin(ang)*p.orbit*BSy
        const r=p.size*BS*1.6
        const isZ=zIdRef.current===p.id
        const fade=zIdRef.current&&!isZ?Math.max(0,1-(zf-1)/2.5):1
        ctx.globalAlpha=fade
        const _pGlow=GALAXY_GLOWS[galaxyIdxRef.current]?.[SOLAR.indexOf(p)]
        drawPlanetBody(p,wx,wy,r,t,_pGlow)
        p.moons.forEach(m=>{
          const mk=`${p.id}_${m.name}`, ma=angRef.current[mk]
          const mr2=m.orbit*BS, mx=wx+Math.cos(ma)*mr2, my=wy+Math.sin(ma)*mr2, mr=m.size*BS
          if(!m.shape||isZ){
            ctx.beginPath(); ctx.arc(wx,wy,mr2,0,Math.PI*2)
            ctx.strokeStyle=`rgba(255,255,255,${isZ?.18:.05})`; ctx.lineWidth=.3
            ctx.setLineDash([1,6]); ctx.stroke(); ctx.setLineDash([])
          }
          if(m.shape){
            const sg=ctx.createRadialGradient(mx,my,0,mx,my,mr*3.8)
            sg.addColorStop(0,m.glow+'.55)'); sg.addColorStop(1,'transparent')
            ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(mx,my,mr*3.8,0,Math.PI*2); ctx.fill()
            if(m.shape==='iss') drawISS(ctx,mx,my,mr)
            else if(m.shape==='telescope') drawHubble(ctx,mx,my,mr)
            else drawGPSSat(ctx,mx,my,mr)
            let smx=mx,smy=my
            if(zf>1.02){ smx=(mx-pivotX)*zf+pivotX; smy=(my-pivotY)*zf+pivotY }
            satPosRef.current[mk]={x:smx,y:smy,r:Math.max(mr*zf*4,18),moon:m}
          } else {
            drawMoon(m,mx,my,mr)
          }
          if(isZ&&zf>2.5){
            ctx.globalAlpha=Math.min(1,(zf-2.5)*1.5)
            ctx.fillStyle='rgba(220,220,255,.85)'
            ctx.font=`${Math.max(9,Math.min(13,mr*1.6))}px 'DM Mono',monospace`
            ctx.textAlign='center'; ctx.fillText(m.name,mx,my-mr-5)
            ctx.globalAlpha=fade
          }
        })
        if(!isZ){
          ctx.globalAlpha=fade*(zIdRef.current?.4:.75)
          ctx.fillStyle='#F5EFEB'; ctx.font=`${Math.max(9,Math.min(14,r*.5))}px 'Hanken Grotesk',sans-serif`
          ctx.textAlign='center'; ctx.fillText(p.label,wx,wy+r+14*BS+6)
        }
        ctx.globalAlpha=1
        let sx=wx, sy=wy
        if(zf>1.02){ sx=(wx-pivotX)*zf+pivotX; sy=(wy-pivotY)*zf+pivotY }
        posRef.current[p.id]={x:sx,y:sy,r:Math.max(r*zf,18)}
      })
      ctx.restore()

      // Fragment particles (screen-space, after zoom restore)
      fragmentsRef.current=fragmentsRef.current.filter(f=>f.life>0)
      fragmentsRef.current.forEach(f=>{
        f.x+=f.vx*dt; f.y+=f.vy*dt; f.vx*=0.96; f.vy*=0.96; f.life-=0.018
        ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.spin+t)
        ctx.fillStyle=`rgba(${f.color},${f.life*0.88})`
        const fs=f.r*f.life
        ctx.beginPath(); ctx.moveTo(0,-fs); ctx.lineTo(fs*.65,fs*.65); ctx.lineTo(-fs*.65,fs*.65); ctx.closePath(); ctx.fill()
        ctx.restore()
      })

      rafRef.current=requestAnimationFrame(draw)
    }
    rafRef.current=requestAnimationFrame(draw)
    return ()=>{ cancelAnimationFrame(rafRef.current); window.removeEventListener('resize',resize) }
  },[])

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const handleClick=(e)=>{
      const rect=cv.getBoundingClientRect()
      const cx=e.clientX-rect.left, cy=e.clientY-rect.top
      const W=cv.width, H=cv.height
      if(Math.hypot(cx-W/2,cy-H/2)<36){ window.open('https://rvu.edu.in','_blank'); return }
      // Satellites
      for(const [,sp] of Object.entries(satPosRef.current)){
        if(Math.hypot(cx-sp.x,cy-sp.y)<sp.r){ onSatClickRef.current?.(sp.moon); return }
      }
      // Asteroids
      for(const a of ASTEROID_SEEDS){
        if(astDestroyedRef.current[a.id]) continue
        const ap=astPosRef.current[a.id]; if(!ap) continue
        if(Math.hypot(cx-ap.x,cy-ap.y)<ap.r){
          astDestroyedRef.current[a.id]=true
          for(let fi=0;fi<16;fi++){
            const fa=(fi/16)*Math.PI*2+Math.random()*.4
            const fspd=55+Math.random()*95
            fragmentsRef.current.push({
              x:ap.x,y:ap.y,
              vx:Math.cos(fa)*fspd,vy:Math.sin(fa)*fspd,
              life:1,r:2.2+Math.random()*2.8,
              spin:Math.random()*Math.PI,
              color:`${138+Math.floor(Math.random()*58)},${98+Math.floor(Math.random()*52)},${52+Math.floor(Math.random()*36)}`,
            })
          }
          onAstDestroyRef.current?.(); return
        }
      }
      // Planets
      for(const p of SOLAR){
        const pos=posRef.current[p.id]; if(!pos) continue
        if(Math.hypot(cx-pos.x,cy-pos.y)<pos.r+12){ onPlanetClick(p); return }
      }
      onPlanetClick(null)
    }
    cv.addEventListener('click',handleClick)
    return()=>cv.removeEventListener('click',handleClick)
  },[onPlanetClick])

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return
    const onMove=(e)=>{ const r=cv.getBoundingClientRect(); mouseRef.current={x:e.clientX-r.left,y:e.clientY-r.top} }
    const onLeave=()=>{ mouseRef.current=null; cv.style.cursor='crosshair' }
    cv.addEventListener('mousemove',onMove)
    cv.addEventListener('mouseleave',onLeave)
    return()=>{ cv.removeEventListener('mousemove',onMove); cv.removeEventListener('mouseleave',onLeave) }
  },[])

  return null
}

// ── Galaxy Nav ────────────────────────────────────────────────────────────
function GalaxyNav({ active, onChange }) {
  const [open,setOpen]=useState(false)
  return (
    <div style={{ position:'fixed',bottom:24,left:24,zIndex:100 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ padding:'7px 16px',background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.18)',color:'#8B8986',fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:'1.5px',cursor:'pointer',textTransform:'uppercase',transition:'color .15s' }} onMouseEnter={e=>e.currentTarget.style.color='#F5EFEB'} onMouseLeave={e=>e.currentTarget.style.color='#8B8986'}>⊕ Galaxies</button>
      {open&&(
        <div style={{ position:'absolute',bottom:'calc(100% + 8px)',left:0,background:'rgba(6,9,18,.96)',border:'1px solid rgba(255,255,255,.12)',backdropFilter:'blur(16px)',padding:'14px',width:262,animation:'fadeUp .3s ease both' }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:'2px',color:'rgba(255,255,255,.3)',textTransform:'uppercase',marginBottom:12 }}>Observable Universe</div>
          {GALAXIES.map((g,i)=>(
            <button key={g.name} onClick={()=>{ onChange(i); setOpen(false) }} style={{ display:'block',width:'100%',textAlign:'left',padding:'9px 11px',background:active===i?`${g.color.replace('0.7','0.08')}`:'transparent',border:`1px solid ${active===i?g.color.replace('0.7','0.3'):'transparent'}`,cursor:'pointer',marginBottom:4,transition:'all .15s' }}>
              <div style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontSize:13,color:active===i?'#F5EFEB':'rgba(255,255,255,.6)',marginBottom:2 }}>{g.name}</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:'#8B8986' }}>{g.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Planet Card (compact floating panel) ─────────────────────────────────
function PlanetCard({ planet, onRoute, onDismiss, savedMajor, onChangeMajor, minors = [], onToggleMinor }) {
  if (!planet) return null
  const majorSem  = isMajorSemester(planet.sem)
  const majorData = majorSem && savedMajor ? MAJORS.find(m => m.id === savedMajor.id) : null
  const live      = majorSem && !planet.comingSoon
  const semMinors = live ? MINORS.filter(m => m.courses?.[planet.sem]?.length) : []
  const load      = live && majorData ? courseTemplate(planet.sem, majorData.id, minors) : null
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, width: 'min(360px, calc(100vw - 32px))',
      background: 'rgba(6,9,20,0.90)', backdropFilter: 'blur(22px)',
      border: `1px solid ${planet.glow}0.28)`,
      padding: '18px 20px',
      boxShadow: `0 12px 56px rgba(0,0,0,0.65), 0 0 40px ${planet.glow}0.08)`,
      animation: 'slideUpFade .42s cubic-bezier(.34,1.56,.64,1) both',
    }}>
      {/* Planet sphere + name row */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
        <div style={{
          flexShrink:0, width:46, height:46, borderRadius:'50%',
          background:`radial-gradient(circle at 34% 34%,${planet.color},${darkenHex(planet.color,60)})`,
          boxShadow:`0 0 22px ${planet.glow}0.5), 0 0 7px ${planet.glow}0.28)`,
        }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:'2.5px', color:'rgba(255,255,255,.28)', textTransform:'uppercase', marginBottom:3 }}>
            {planet.label}
          </div>
          <div style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:16, color:'#F5EFEB', letterSpacing:'-0.3px' }}>
            {planet.name}
          </div>
        </div>
        <button onClick={onDismiss}
          style={{ width:28, height:28, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.38)', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'color .15s' }}
          onMouseEnter={e=>e.currentTarget.style.color='#F5EFEB'}
          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.38)'}>✕</button>
      </div>

      {/* Fact */}
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(255,255,255,.35)', lineHeight:1.65, marginBottom:12, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        {planet.fact}
      </div>

      {/* Major row: only for sem3+ */}
      {majorSem && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {majorData ? (
              <>
                <div style={{ width:6, height:6, borderRadius:'50%', background:majorData.color, boxShadow:`0 0 8px ${majorData.color}`, flexShrink:0 }} />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(255,255,255,.55)' }}>{majorData.label}</span>
              </>
            ) : (
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(241,180,151,.5)' }}>No major selected</span>
            )}
          </div>
          <button onClick={onChangeMajor}
            style={{ background:'none', border:'none', fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'1px', textTransform:'uppercase', color:'rgba(241,180,151,.6)', cursor:'pointer', padding:'2px 0', transition:'color .15s' }}
            onMouseEnter={e => e.currentTarget.style.color='#F1B497'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(241,180,151,.6)'}>
            {majorData ? 'Change ↗' : 'Select →'}
          </button>
        </div>
      )}

      {/* Minor chips: optional streams that add courses to this semester */}
      {semMinors.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:14, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,.07)' }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:'2px', color:'rgba(255,255,255,.28)', textTransform:'uppercase' }}>Minor</span>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'flex-end' }}>
            {semMinors.map(m => {
              const on = minors.includes(m.id)
              return (
                <button key={m.id} type="button" aria-pressed={on} onClick={() => onToggleMinor?.(m.id)}
                  title={m.courses[planet.sem].map(c => `${c.courseCode} ${c.courseName} (${c.credits} cr)`).join(' + ')}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', cursor:'pointer', fontFamily:"'DM Mono',monospace", fontSize:10,
                    background: on ? `${m.color}18` : 'transparent',
                    color: on ? m.color : 'rgba(255,255,255,.4)',
                    border: `1px ${on ? 'solid' : 'dashed'} ${on ? m.color + '55' : 'rgba(255,255,255,.18)'}`,
                    transition:'color .15s, border-color .15s, background .15s' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: on ? m.color : 'transparent', border:`1px solid ${on ? m.color : 'rgba(255,255,255,.3)'}`, boxShadow: on ? `0 0 8px ${m.color}` : 'none', transition:'all .15s' }} />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Course load preview for the chosen major + minors */}
      {load && (
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14, fontFamily:"'DM Mono',monospace" }}>
          <span style={{ fontSize:8, letterSpacing:'2px', color:'rgba(255,255,255,.28)', textTransform:'uppercase' }}>Course load</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>
            {load.length} courses <span style={{ color:'rgba(255,255,255,.2)' }}>·</span> <span style={{ color:'#F1B497' }}>{totalCredits(load)} credits</span>
          </span>
        </div>
      )}

      {/* Action buttons: only for available (non-comingSoon) planets */}
      {!planet.comingSoon && (
        <div style={{ display:'flex', gap:8 }}>
          {planet.divides ? (
            planet.divides.map(d => (
              <button key={d} onClick={() => onRoute(planet.sem, d)}
                style={{ flex:1, padding:'10px 0', background:`${planet.glow}0.07)`, border:`1px solid ${planet.glow}0.32)`, color:'#F5EFEB', fontFamily:"'Hanken Grotesk',sans-serif", fontSize:12, letterSpacing:'.5px', cursor:'pointer', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background=`${planet.glow}0.2)`}
                onMouseLeave={e=>e.currentTarget.style.background=`${planet.glow}0.07)`}>
                {d}
              </button>
            ))
          ) : (
            <button onClick={() => onRoute(planet.sem, majorSem ? savedMajor?.id : 'EEX')}
              style={{ flex:1, padding:'10px 0', background:`${planet.glow}0.07)`, border:`1px solid ${planet.glow}0.32)`, color:'#F5EFEB', fontFamily:"'Hanken Grotesk',sans-serif", fontSize:12, letterSpacing:'.5px', cursor:'pointer', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=`${planet.glow}0.2)`}
              onMouseLeave={e=>e.currentTarget.style.background=`${planet.glow}0.07)`}>
              {majorSem && !majorData ? 'Choose major ↗' : 'Enter ↗'}
            </button>
          )}
        </div>
      )}

      {planet.comingSoon && (
        <div style={{ marginTop:2, fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:'2px', color:'rgba(255,255,255,.2)', textTransform:'uppercase', textAlign:'center' }}>
          ✦ coming soon
        </div>
      )}
    </div>
  )
}

// ── Satellite Info Card ───────────────────────────────────────────────────
function SatCard({ satellite, onDismiss }) {
  if (!satellite) return null
  return (
    <div style={{
      position:'fixed', bottom:72, right:24, zIndex:210,
      width:'min(280px,calc(100vw - 32px))',
      background:'rgba(6,9,20,0.92)', backdropFilter:'blur(22px)',
      border:'1px solid rgba(200,213,226,0.3)',
      padding:'14px 16px',
      boxShadow:'0 10px 48px rgba(0,0,0,0.6),0 0 32px rgba(200,213,226,0.06)',
      animation:'slideUpFade .38s cubic-bezier(.34,1.56,.64,1) both',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:'2.5px', color:'rgba(200,213,226,.55)', textTransform:'uppercase' }}>Earth Orbit</div>
        <button onClick={onDismiss} style={{ width:22,height:22,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.4)',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'color .15s' }} onMouseEnter={e=>e.currentTarget.style.color='#F5EFEB'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.4)'}>✕</button>
      </div>
      <div style={{ fontFamily:"'Hanken Grotesk',sans-serif", fontWeight:300, fontSize:14, color:'#F5EFEB', marginBottom:7, letterSpacing:'-0.2px' }}>{satellite.name}</div>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(255,255,255,.45)', lineHeight:1.72 }}>{satellite.fact}</div>
    </div>
  )
}

// ── Space Selection Screen ────────────────────────────────────────────────
export default function SpaceSelectionScreen({ onSelect, onClose, savedMajor, onSetMajor, minors, onToggleMinor }) {
  const [selectedPlanet,setSelectedPlanet]=useState(null)
  const [selectedSatellite,setSelectedSatellite]=useState(null)
  const [zoomedId,setZoomedId]=useState(null)
  const [activeGalaxy,setActiveGalaxy]=useState(0)
  const [score,setScore]=useState(0)
  const starsRef=useRef(null), solarRef=useRef(null)
  const warpRef=useRef({ active:false, progress:0, called:false, callback:null })

  const handlePlanetClick=useCallback(planet=>{
    if(!planet){ setSelectedPlanet(null); setZoomedId(null); return }
    setSelectedPlanet(planet); setZoomedId(planet.id)
  },[])

  const handleSatelliteClick=useCallback(moon=>setSelectedSatellite(moon),[])
  const handleAsteroidDestroy=useCallback(()=>setScore(s=>s+1),[])

  const handleDismiss=()=>{ setSelectedPlanet(null); setZoomedId(null); setSelectedSatellite(null) }

  const handleChangeMajor=()=>{ onSetMajor?.({}) }

  const handleRoute=(sem,divide)=>{
    const planet=SOLAR.find(p=>p.sem===sem)
    if(planet && isMajorSemester(planet.sem) && !savedMajor){ onSetMajor?.({ pendingSem:sem, pendingDivide:divide }); return }
    warpRef.current={ active:true, progress:0, called:false, callback:()=>{ setSelectedPlanet(null); setZoomedId(null); onSelect(sem,divide) } }
    const tick=()=>{ warpRef.current.progress=Math.min(1,warpRef.current.progress+.022); if(warpRef.current.progress<1) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'#050710',overflow:'hidden' }}>
      <canvas ref={starsRef} style={{ position:'absolute',inset:0,zIndex:1 }} />
      <StarFieldCanvas canvasRef={starsRef} warpRef={warpRef} galaxyIdx={activeGalaxy} />
      <canvas ref={solarRef} style={{ position:'absolute',inset:0,zIndex:2,cursor:'crosshair' }} />
      <SolarCanvas canvasRef={solarRef} onPlanetClick={handlePlanetClick} zoomedId={zoomedId} galaxyIdx={activeGalaxy} onSatelliteClick={handleSatelliteClick} onAsteroidDestroy={handleAsteroidDestroy} />

      <div style={{ position:'absolute',top:0,left:0,right:0,zIndex:10,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(rgba(5,7,16,0.82),transparent)' }}>
        <div>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:'3px',color:'rgba(255,255,255,.3)',textTransform:'uppercase' }}>RV University · SGPA Calculator</div>
          <div style={{ fontFamily:"'Hanken Grotesk',sans-serif",fontWeight:300,fontSize:'clamp(17px,2.6vw,26px)',color:'#F5EFEB',letterSpacing:'-0.5px',marginTop:4 }}>Solar Observatory <span style={{ color:'#F1B497' }}>·</span> Select Your Semester</div>
        </div>
        {onClose&&(<button onClick={onClose} style={{ width:36,height:36,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',color:'#8B8986',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>✕</button>)}
      </div>

      {score>0&&(
        <div style={{ position:'absolute',top:76,right:24,zIndex:10,textAlign:'right',fontFamily:"'DM Mono',monospace" }}>
          <div style={{ fontSize:11,letterSpacing:'1.5px',color:'#F1B497',textShadow:'0 0 14px rgba(241,180,151,0.5)' }}>✦ {score}/{ASTEROID_SEEDS.length}</div>
          {score===ASTEROID_SEEDS.length&&<div style={{ fontSize:8,letterSpacing:'2px',color:'rgba(241,180,151,.5)',textTransform:'uppercase',marginTop:2 }}>Belt cleared</div>}
        </div>
      )}

      {(selectedPlanet||selectedSatellite)&&(<div onClick={handleDismiss} style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.35)',zIndex:5,animation:'fadeIn .4s ease both' }} />)}

      {!selectedPlanet&&!selectedSatellite&&(<div style={{ position:'absolute',bottom:70,left:'50%',transform:'translateX(-50%)',fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:'2px',color:'rgba(255,255,255,.22)',textTransform:'uppercase',zIndex:10,whiteSpace:'nowrap',animation:'fadeUp .6s ease 1.2s both' }}>Click a planet to select · hover asteroids to target</div>)}

      <PlanetCard planet={selectedPlanet} onRoute={handleRoute} onDismiss={handleDismiss} savedMajor={savedMajor} onChangeMajor={handleChangeMajor} minors={minors} onToggleMinor={onToggleMinor} />
      <SatCard satellite={selectedSatellite} onDismiss={()=>setSelectedSatellite(null)} />

      <GalaxyNav active={activeGalaxy} onChange={setActiveGalaxy} />
    </div>
  )
}
