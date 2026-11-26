import { createCanvas, Path2D } from '@napi-rs/canvas'

export const W = 1280
export const H = 720
export const FPS = 24
export const palette = {
  rice: '#f3e6c8',
  table: '#eccf9c',
  red: '#d62d24',
  vermilion: '#e43b29',
  deep: '#b41f21',
  dark: '#8f2026',
  banner: '#9a191e',
  shadowRed: '#831919',
  salmon: '#e08b7d',
  pink: '#eeb2a0',
  sky: '#11142c',
  night: '#191e3c',
  ridge: '#343c71',
  ice: '#6473a4',
  gold: '#d6a23f',
  cream: '#fff1c9',
}
export const clamp = x => Math.max(0, Math.min(1, x))
export const lerp = (a, b, p) => a + (b - a) * p
export const smooth = x => { const p = clamp(x); return p * p * (3 - 2 * p) }
export const snap = x => 1 - Math.pow(1 - clamp(x), 3)
export const onTwos = t => Math.floor(t * 12 + 1e-6) / 12
const TAU = 2 * Math.PI

export function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export const polygon = points => 'M' + points.map(p => p.map(n => +n.toFixed(3)).join(',')).join('L') + 'Z'
export const box = (x, y, w, h) => `M${x},${y}h${w}v${h}h${-w}Z`
export function ellipse(cx, cy, rx, ry = rx) {
  return `M${cx-rx},${cy}a${rx},${ry} 0 1 0 ${2*rx},0a${rx},${ry} 0 1 0 ${-2*rx},0Z`
}
export function petal(x, y, length, width, theta = 0) {
  const p = (a,b) => `${x+a*Math.cos(theta)-b*Math.sin(theta)},${y+a*Math.sin(theta)+b*Math.cos(theta)}`
  return `M${p(-length/2,0)}Q${p(0,width)} ${p(length/2,0)}Q${p(0,-width)} ${p(-length/2,0)}Z`
}
export function crescent(x, y, length, width, theta = 0) {
  const p = (a,b) => `${x+a*Math.cos(theta)-b*Math.sin(theta)},${y+a*Math.sin(theta)+b*Math.cos(theta)}`
  return `M${p(-length/2,0)}Q${p(0,width*2)} ${p(length/2,0)}Q${p(0,width*.64)} ${p(-length/2,0)}Z`
}
export function saw(x, y, width, count, height, direction = -1) {
  const result = [[x,y]]
  for (let i=0; i<count; i++) {
    result.push([x+width*(i+.61)/count, y+direction*height*(i%3===0?.8:1)])
    result.push([x+width*(i+1)/count, y])
  }
  return result
}
export function wheel(radius, count=8, inner=.66) {
  return polygon(Array.from({length:count*2}, (_,i) => {
    const a = TAU*i/(count*2)-Math.PI/2
    const r = radius*(i%2===0?1:inner)
    return [r*Math.cos(a),r*Math.sin(a)]
  }))
}
export function openwork(radius, count=8, seed=2) {
  let d = wheel(radius,count*3,.91) + ellipse(0,0,radius*.105)
  for (let i=0; i<count; i++) {
    const a = i*TAU/count
    for (const side of [-1, 1]) {
      const b = a + side*.18
      d += petal(radius*.68*Math.cos(b),radius*.68*Math.sin(b),radius*.30,radius*.12,b)
    }
    d += petal(radius*.36*Math.cos(a),radius*.36*Math.sin(a),radius*.27,radius*.13,a+.24*(seed%2))
    d += ellipse(radius*.84*Math.cos(a),radius*.84*Math.sin(a),radius*.019)
  }
  return d
}

function shift(hex, amount) {
  const values = [1,3,5].map(i => Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+amount)))
  return `rgb(${values.join(',')})`
}
function texture(width, height, hex, isGround) {
  const canvas = createCanvas(width,height)
  const ctx = canvas.getContext('2d')
  const pixels = ctx.createImageData(width,height)
  const data = pixels.data
  const random = rng(51)
  const base = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))
  for (let y=0; y<height; y++) {
    for (let x=0; x<width; x++) {
      const i = 4*(y*width+x)
      const r = random()
      const cloud = Math.sin(x*.025+Math.cos(y*.022)*1.1)*2.3 + Math.sin(y*.030-x*.013)*1.4
      const pigment = Math.cos((x+y)*.09)*.64 + Math.sin(y*.183-x*.014)*.56
      const radial = isGround ? -15*((x/width-.48)**2+(y/height-.40)**2) : 0
      const grain = (r-.5)*(isGround?7:10) + (r<.013?-10:0)
      for (let k=0; k<3; k++) data[i+k] = base[k]+cloud+pigment+radial+grain
      data[i+3]=255
    }
  }
  ctx.putImageData(pixels,0,0)
  ctx.lineWidth=.65
  for (let i=0; i<width*height/290; i++) {
    const x=random()*width, y=random()*height, l=2+random()**2*14
    ctx.strokeStyle=random()>.45?'#ffffff13':'#321b1811'
    ctx.beginPath()
    ctx.moveTo(x,y)
    ctx.quadraticCurveTo(x+l*.5,y+1.2,x+l,y+(random()-.5)*4.8)
    ctx.stroke()
  }
  return canvas
}
const pathCache = new Map()
export function cutPath(d) {
  if (typeof d !== 'string') return d
  if (!pathCache.has(d)) {
    if (pathCache.size >= 9000) pathCache.clear()
    pathCache.set(d,new Path2D(d))
  }
  return pathCache.get(d)
}

export function makeStage(ctx) {
  const coats = new Map()
  const grounds = new Map()
  function group(x, y, angle, sx, sy, paint) {
    ctx.save()
    ctx.translate(x,y)
    ctx.rotate(angle)
    ctx.scale(sx,sy)
    paint()
    ctx.restore()
  }
  function fill(d, color) {
    ctx.fillStyle=color
    ctx.fill(cutPath(d),'evenodd')
  }
  function piece(d, color, {depth=1, edge=1, grain=true}={}) {
    const p = cutPath(d)
    const colorKey = palette[color] || color
    if (depth) {
      ctx.save()
      ctx.translate(2*depth,3*depth)
      ctx.globalAlpha*=.19
      fill(p,'#211123')
      ctx.translate(.8*depth,1.2*depth)
      ctx.globalAlpha*=.62
      fill(p,'#301820')
      ctx.restore()
    }
    if (edge) {
      ctx.save()
      ctx.translate(-.65*edge,-.72*edge)
      fill(p,shift(colorKey,22))
      ctx.translate(1.30*edge,1.43*edge)
      fill(p,shift(colorKey,-25))
      ctx.restore()
    }
    if (!grain) {
      fill(p,colorKey)
      return
    }
    if (!coats.has(colorKey)) coats.set(colorKey,ctx.createPattern(texture(233,233,colorKey,false),'repeat'))
    fill(p,coats.get(colorKey))
  }
  function ground(color) {
    const hex = palette[color] || color
    if (!grounds.has(hex)) grounds.set(hex,texture(W,H,hex,true))
    ctx.drawImage(grounds.get(hex),0,0)
  }
  function at(x,y,angle,scale,paint) {
    group(x,y,angle,scale,scale,paint)
  }
  function pin(x,y,r,color='gold') {
    piece(ellipse(x,y,r)+ellipse(x,y,r*.24),color,{depth:.5,edge:.6})
  }
  function halo(x,y,r,color='#ffbd58',strength=.46) {
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r)
    gradient.addColorStop(0,color+Math.round(strength*255).toString(16).padStart(2,'0'))
    gradient.addColorStop(1,color+'00')
    ctx.fillStyle=gradient
    ctx.fillRect(x-r,y-r,r*2,r*2)
  }
  function through(d, color='red', warm='#ffdb87', strength=.55) {
    const path = cutPath(d)
    ctx.save()
    ctx.shadowColor=warm
    ctx.shadowBlur=14*strength
    piece(path,color,{depth:.35,edge:.7})
    ctx.restore()
  }
  return {ctx, fill, piece, ground, group, at, pin, halo, through}
}

// Rotate a hinged paper part. The slight taper preserves a sense of lift.
export function flap(s, d, {x=0,y=0,length=270,angle=0,axis=0,front='red',back='salmon',strips=15}={}) {
  const {ctx}=s
  const projected=Math.cos(angle)
  const rise=Math.sin(angle)
  s.at(x,y,axis,1,()=>{
    for(let i=0;i<strips;i++){
      const source=i*length/strips
      const width=length/strips
      ctx.save()
      ctx.translate(source*projected,0)
      ctx.scale(Math.abs(projected)<.01?.01:projected,1+rise*.19*i/strips)
      ctx.translate(-source,0)
      ctx.beginPath()
      ctx.rect(source-.55,-H,width+1.1,H*2)
      ctx.clip()
      s.piece(d,projected>=0?front:back,{depth:0,edge:.45})
      ctx.restore()
    }
  })
}

const lowerBlade = 'M-90,2L-52,-22-19,-17 8,-5 151,-6 176,0 149,7 15,10-14,15-38,43-70,46-90,28Z' +
  ellipse(-59,13,20,13)+petal(84,2,119,2)
const upperBlade = 'M-93,-9L-88,-34-64,-46-36,-39-14,-14 7,-9 153,-6 177,0 141,8 8,11-22,14-49,15-73,12Z' +
  ellipse(-61,-23,19,11)+petal(87,-2,113,1.8)
export function scissors(s,x,y,axis,opening,scale=1) {
  // A shared world-space pivot keeps the blades on both sides of the cut.
  s.at(x,y,axis,scale,()=>{
    s.at(0,0,-opening,1,()=>s.piece(lowerBlade,'shadowRed',{depth:1.4}))
    s.at(0,0,opening,1,()=>s.piece(upperBlade,'deep',{depth:1.4}))
    s.pin(0,0,6,'gold')
  })
}

export function drifting(s,t,{count=22,color='cream',speed=17,seed=14,area=[0,0,W,H],size=2}={}) {
  const random=rng(seed)
  const [x,y,w,h]=area
  for(let i=0;i<count;i++){
    const px=x+(random()*w+t*(i%2?speed:.56*speed)+w*4)%w
    const py=y+(random()*h+t*speed*.40)%h
    const r=(.4+random()*.75)*size
    s.fill(ellipse(px,py,r,r*.74),palette[color] || color)
  }
}
