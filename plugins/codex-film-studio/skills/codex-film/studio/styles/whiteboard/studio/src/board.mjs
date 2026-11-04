// Independent Canvas whiteboard implementation. No reference engine imports.
export const INK = '#23262c'
export const BLUE = '#2a5cb3'
export const ORANGE = '#d97757'
export const RED = '#ce2637'
export const PENS = {black:INK,blue:BLUE,orange:ORANGE,red:RED}
export const WIDTH = 1920
export const HEIGHT = 1080
export const BOARD_W = 8200
export const BOARD_H = 4900
export const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b,x))
export const smooth = x => {x=clamp(x); return x*x*(3-2*x)}
export const writingEase = x => {x=clamp(x); return x-Math.sin(x*2*Math.PI)*.8/(2*Math.PI)}
export const mix = (a,b,t) => a+(b-a)*t
const hash = n => {const x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x)}
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])
let strokeId=0
export const beginDrawing=()=>{strokeId=0}

export function pathStroke(points, {color=INK, width=8, wobble=1.5, alpha=.94}={}) {
  const id=strokeId++
  const points2=[]
  let travelled=0
  for(let j=0;j<points.length-1;j++){
    const a=points[j],b=points[j+1],length=dist(a,b)
    const count=Math.max(1,Math.ceil(length/5))
    for(let i=0;i<count;i++){
      const u=i/count, x=mix(a[0],b[0],u),y=mix(a[1],b[1],u)
      const offset=wobble*(Math.sin((travelled+u*length)/71+id*3.1)*.75+
        Math.sin((travelled+u*length)/12+id*1.7)*.25)
      points2.push([x-(b[1]-a[1])/Math.max(1,length)*offset,y+(b[0]-a[0])/Math.max(1,length)*offset])
    }
    travelled+=length
  }
  points2.push(points.at(-1)||[0,0])
  const lengths=[0]
  for(let i=1;i<points2.length;i++) lengths.push(lengths.at(-1)+dist(points2[i],points2[i-1]))
  const xs=points2.map(p=>p[0]),ys=points2.map(p=>p[1])
  return {id,points:points2,lengths,length:lengths.at(-1),color,width,alpha,
    bounds:[Math.min(...xs)-width,Math.min(...ys)-width,Math.max(...xs)+width,Math.max(...ys)+width]}
}

export const line=(x1,y1,x2,y2,opts={})=>pathStroke([[x1,y1],[x2,y2]],opts)
export const poly=(points,opts={})=>pathStroke(points,opts)
export function curve(points, opts={}){
  const [a,b,c,d]=points
  const ps=Array.from({length:81},(_,i)=>{
    const t=i/80,u=1-t
    return [0,1].map(k=>u*u*u*a[k]+3*u*u*t*b[k]+3*u*t*t*c[k]+t*t*t*d[k])
  })
  return pathStroke(ps,opts)
}
export function circle(x,y,r,opts={}){
  const {start=-.45,end=Math.PI*2-.33,...style}=opts
  return pathStroke(Array.from({length:101},(_,i)=>[x+Math.cos(mix(start,end,i/100))*r,y+Math.sin(mix(start,end,i/100))*r]),style)
}
export function rect(x,y,w,h,opts={}){
  return [line(x-3,y,x+w+5,y,opts),line(x+w,y-3,x+w,y+h+5,opts),
    line(x+w+3,y+h,x-5,y+h,opts),line(x,y+h+4,x,y-4,opts)]
}
export function arrow(x1,y1,x2,y2,opts={}){
  const a=Math.atan2(y2-y1,x2-x1),n=opts.head||35
  return [line(x1,y1,x2,y2,opts),poly([[x2-Math.cos(a-.55)*n,y2-Math.sin(a-.55)*n],
    [x2,y2],[x2-Math.cos(a+.55)*n,y2-Math.sin(a+.55)*n]],opts)]
}
export const check=(x,y,s=70,color=ORANGE)=>poly([[x-s*.55,y],[x-s*.08,y+s*.45],[x+s*.8,y-s*.65]],{color,width:10})

export function createLettering(font){
  function measure(text,h=80){
    return [...text].reduce((x,c)=>x+(font.glyphs[c]?.advance||font.unitsPerEm*.35)*h/font.unitsPerEm,0)
  }
  function text(string,x,y,{h=80,color=INK,align='left',width=h*.075}={}){
    // h is the em size. EMS Tech's declared cap-height does not describe its
    // actual outlines; using that value doubles advances and clips headings.
    const scale=h/font.unitsPerEm
    let cursor=x-(align==='center'?measure(string,h)/2:align==='right'?measure(string,h):0)
    const strokes=[]
    for(const [i,char] of [...string].entries()){
      const glyph=font.glyphs[char]||font.glyphs['?']
      const rotation=(hash(i+string.length*5)-.5)*.032
      const shift=(hash(i+string.charCodeAt(i)*2)-.5)*h*.045
      for(const ps of glyph.strokes){
        const transformed=ps.map(p=>{
          const px=p[0]*scale,py=-p[1]*scale
          return [cursor+px*Math.cos(rotation)-py*Math.sin(rotation),y+shift+px*Math.sin(rotation)+py*Math.cos(rotation)]
        })
        if(transformed.length)strokes.push(pathStroke(transformed,{color,width,wobble:h*.011}))
      }
      cursor+=glyph.advance*scale
    }
    return strokes
  }
  return {text,measure}
}

export class Score {
  constructor(){this.groups=[];this.strokes=[];this.labels=[];this.cues=[];this.erasers=[]}
  draw(id,shapes,start,end,{pen='black',label=null}={}){
    if(!Object.hasOwn(PENS,pen))throw new Error(`Unknown pen: ${pen}`)
    if(this.groups.some(g=>g.id===id))throw new Error(`Duplicate drawing id: ${id}`)
    shapes=[shapes].flat(Infinity).filter(Boolean)
    const length=shapes.reduce((sum,s)=>sum+Math.max(7,s.length),0)
    const gap=Math.min(.045,(end-start)*.18/Math.max(1,shapes.length-1))
    const available=end-start-gap*Math.max(0,shapes.length-1)
    let t=start
    for(const s of shapes){
      s.start=t;s.end=t+available*Math.max(7,s.length)/length;s.pen=pen;s.group=id
      t=s.end+gap
      this.strokes.push(s)
    }
    const group={id,shapes,start,end,pen}
    this.groups.push(group)
    if(label)this.labels.push({id,text:label,bounds:boundsOf(shapes),start,end})
    return group
  }
  cue(id,time,extra={}){this.cues.push({id,time,...extra})}
  compile(){
    // Each physical pen has a single chronological queue. A second stroke
    // cannot appear elsewhere while that pen is already touching the board.
    this.rescheduled=[]
    for(const pen of Object.keys(PENS)){
      let free=0
      for(const g of this.groups.filter(g=>g.pen===pen).sort((a,b)=>a.start-b.start)){
        const delta=Math.max(0,free-g.start)
        if(delta>0){
          this.rescheduled.push({id:g.id,delay:delta})
          g.start+=delta;g.end+=delta
          for(const s of g.shapes){s.start+=delta;s.end+=delta}
          const label=this.labels.find(l=>l.id===g.id)
          if(label){label.start+=delta;label.end+=delta}
        }
        free=g.end+.035
      }
    }
    this.strokes.sort((a,b)=>a.start-b.start)
  }
}

function boundsOf(shapes){
  return [Math.min(...shapes.map(s=>s.bounds[0])),Math.min(...shapes.map(s=>s.bounds[1])),
    Math.max(...shapes.map(s=>s.bounds[2])),Math.max(...shapes.map(s=>s.bounds[3]))]
}
function pointAt(stroke,u){
  const length=clamp(u)*stroke.length
  let i=1
  while(i<stroke.lengths.length-1&&stroke.lengths[i]<length)i++
  const a=stroke.points[i-1]||stroke.points[0],b=stroke.points[i]||a
  const t=clamp((length-(stroke.lengths[i-1]||0))/Math.max(.001,(stroke.lengths[i]||0)-(stroke.lengths[i-1]||0)))
  return [mix(a[0],b[0],t),mix(a[1],b[1],t)]
}
function eraserRows(e){
  const rows=e.rows??3
  if(!Number.isInteger(rows)||rows<1)throw new Error('Eraser rows must be a positive integer.')
  return rows
}
export function eraserState(e,t){
  const rows=eraserRows(e),rowHeight=e.h/rows
  const p=clamp((t-e.start)/(e.end-e.start))*(rows+(rows-1)*.25)
  const row=Math.min(rows-1,Math.floor(p/1.25)),u=p-row*1.25
  const left=e.x+140,right=e.x+e.w-140,reverse=row%2===1
  if(u<=1||row===rows-1)return {
    x:mix(reverse?right:left,reverse?left:right,smooth(u)),y:e.y+rowHeight*(row+.5)}
  return {x:reverse?left:right,y:e.y+rowHeight*(row+.5+smooth((u-1)/.25))}
}
function paintStroke(ctx,s,progress=1){
  if(progress<=0)return
  const limit=s.length*clamp(progress)
  let n=1
  while(n<s.points.length&&s.lengths[n]<limit)n++
  const points=s.points.slice(0,n)
  points.push(pointAt(s,progress))
  ctx.save()
  ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha
  ctx.lineCap='round';ctx.lineJoin='round'
  // Fill one pressure ribbon. Repeated translucent segment strokes create
  // regular dark joints, which read as a dashed digital line.
  const left=[],right=[]
  for(let j=0;j<points.length;j++){
    const a=points[Math.max(0,j-1)],z=points[Math.min(points.length-1,j+1)]
    const fraction=s.lengths[Math.min(j,s.lengths.length-1)]/Math.max(1,s.length)
    const pressure=Math.min(1,.76+fraction*5)*(1-.13*smooth((fraction-.86)/.14))
    const angle=Math.atan2(z[1]-a[1],z[0]-a[0])
    const w=s.width*pressure*(.88+.12*Math.abs(Math.cos(angle-.55)))*.5
    left.push([points[j][0]-Math.sin(angle)*w,points[j][1]+Math.cos(angle)*w])
    right.push([points[j][0]+Math.sin(angle)*w,points[j][1]-Math.cos(angle)*w])
  }
  ctx.beginPath();ctx.moveTo(...left[0])
  for(const p of left.slice(1))ctx.lineTo(...p)
  for(const p of right.reverse())ctx.lineTo(...p)
  ctx.closePath();ctx.fill()
  for(const p of [points[0],points.at(-1)]){ctx.beginPath();ctx.arc(p[0],p[1],s.width*.34,0,Math.PI*2);ctx.fill()}
  const p=s.points[0]
  ctx.globalAlpha=s.alpha*.24;ctx.beginPath();ctx.arc(p[0],p[1],s.width*.28,0,Math.PI*2);ctx.fill()
  // Sparse dry streaks stay locked to board space, including at partial reveal.
  ctx.globalCompositeOperation='destination-out'
  ctx.globalAlpha=.34
  ctx.lineWidth=Math.max(.45,s.width*.09)
  for(let j=5;j<points.length-2;j+=11){
    if(hash(s.id*41+j)<.44)continue
    const q=points[j],r=points[Math.min(points.length-1,j+2)]
    const offset=(hash(s.id+j*7)-.5)*s.width*.65
    ctx.beginPath();ctx.moveTo(q[0]+offset,q[1]);ctx.lineTo(r[0]+offset,r[1]);ctx.stroke()
  }
  ctx.restore()
}

export class Camera {
  constructor(keys){this.keys=keys.sort((a,b)=>a.t-b.t)}
  at(t){
    let a=this.keys[0],b=a
    for(const key of this.keys){if(key.t<=t)a=key;else{b=key;break}b=a}
    const u=a===b?0:smooth((t-a.t)/(b.t-a.t))
    return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:1/mix(1/a.z,1/b.z,u),roll:mix(a.roll||0,b.roll||0,u)}
  }
  project(p,t){
    const c=this.at(t),x=(p[0]-c.x)*c.z,y=(p[1]-c.y)*c.z
    return [960+x*Math.cos(c.roll)-y*Math.sin(c.roll),500+x*Math.sin(c.roll)+y*Math.cos(c.roll)]
  }
}

export function marker(ctx,x,y,color,{scale=1,lift=0,angle=.56,alpha=1}={}){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.globalAlpha=alpha
  ctx.save();ctx.shadowColor='rgba(30,31,33,.42)';ctx.shadowBlur=17+lift*.3
  ctx.shadowOffsetX=25+lift*.5;ctx.shadowOffsetY=28+lift*.4
  ctx.fillStyle='rgba(32,34,37,.35)';ctx.beginPath();ctx.roundRect(-25,-315,50,290,9);ctx.fill();ctx.restore()
  const metal=ctx.createLinearGradient(-29,0,29,0)
  metal.addColorStop(0,'#b9c0c7');metal.addColorStop(.27,'#fdfefe');metal.addColorStop(.53,'#eef1f3');metal.addColorStop(1,'#b0b8c1')
  ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(-26,-280,52,244,8);ctx.fill()
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-29,-330,58,72,11);ctx.fill()
  const shine=ctx.createLinearGradient(-29,0,29,0)
  shine.addColorStop(0,'rgba(255,255,255,.02)');shine.addColorStop(.22,'rgba(255,255,255,.42)');shine.addColorStop(.48,'rgba(255,255,255,.04)');shine.addColorStop(1,'rgba(0,0,0,.25)')
  ctx.fillStyle=shine;ctx.beginPath();ctx.roundRect(-29,-330,58,72,11);ctx.fill()
  ctx.fillStyle=color;ctx.fillRect(-26,-195,52,76)
  ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(-15,-184,3,52);ctx.fillRect(-8,-168,2,37)
  ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(-26,-39);ctx.lineTo(-10,-12);ctx.lineTo(9,-12);ctx.lineTo(26,-39);ctx.closePath();ctx.fill()
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-9,-15);ctx.lineTo(8,-15);ctx.lineTo(5,1);ctx.lineTo(-6,6);ctx.closePath();ctx.fill()
  ctx.restore()
}

export function magnet(ctx,x,y,{r=42,color=ORANGE,lift=0,mark=true}={}){
  ctx.save();ctx.translate(x,y)
  ctx.shadowColor='rgba(25,30,35,.35)';ctx.shadowOffsetX=6+lift*.4;ctx.shadowOffsetY=8+lift*.5;ctx.shadowBlur=10+lift*.4
  const gradient=ctx.createRadialGradient(-r*.35,-r*.42,r*.05,0,0,r)
  gradient.addColorStop(0,'#f7c1a5');gradient.addColorStop(.35,color);gradient.addColorStop(1,'#9f4b31')
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill()
  ctx.shadowColor='transparent';ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=3
  ctx.beginPath();ctx.arc(-4,-4,r*.75,3.7,4.8);ctx.stroke()
  if(mark){ctx.strokeStyle='#fffbf4';ctx.lineWidth=r*.12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-r*.4,0);ctx.lineTo(-r*.05,r*.33);ctx.lineTo(r*.45,-r*.35);ctx.stroke()}
  ctx.restore()
}

export class BoardRenderer {
  constructor({createCanvas,score,camera,lettering,props=()=>{},captions=[],
    boardWidth=BOARD_W,boardHeight=BOARD_H}){
    this.createCanvas=createCanvas;this.score=score;this.camera=camera
    this.boardWidth=boardWidth;this.boardHeight=boardHeight
    this.lettering=lettering;this.props=props;this.captions=captions;this.cache=new Map()
    this.surface=this.makeSurface()
    this.inkCanvas=createCanvas(WIDTH,HEIGHT)
  }
  makeSurface(){
    const width=this.boardWidth/4,height=this.boardHeight/4
    const c=this.createCanvas(width,height),ctx=c.getContext('2d')
    const g=ctx.createLinearGradient(0,0,width,height)
    g.addColorStop(0,'#f7f6f3');g.addColorStop(1,'#eae9e5')
    ctx.fillStyle=g;ctx.fillRect(0,0,width,height)
    for(let i=0;i<12000;i++){
      const x=hash(i+21)*width,y=hash(i+36)*height
      ctx.strokeStyle=`rgba(110,116,120,${.012+hash(i+90)*.012})`;ctx.lineWidth=.2+hash(i+81)*.5
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hash(i+8)*17,y+(hash(i+12)-.5)*4);ctx.stroke()
    }
    for(let i=0;i<190;i++){
      const x=hash(i*4+2)*width,y=hash(i*4+3)*height
      ctx.strokeStyle='rgba(135,142,146,.034)';ctx.lineWidth=2+hash(i+88)*4;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+50+hash(i+48)*80,y+(hash(i+62)-.5)*28);ctx.stroke()
    }
    ctx.save();ctx.scale(.25,.25)
    for(let i=0;i<35;i++){
      const x=hash(i*7+13)*this.boardWidth,y=hash(i*7+29)*this.boardHeight
      const color=i%3?'#9aa0a8':'#8aa0c8'
      const shapes=i%4===0?this.lettering.text(['x + y','pH 7','f(x)','E = mc2','a = b'][i%5],x,y,{h:80,color})
        :i%3===0?[circle(x,y,110,{width:9,color})]:arrow(x,y,x+160,y-30,{width:8,color})
      for(const s of shapes){s.alpha=.065;paintStroke(ctx,s)}
    }
    ctx.restore()
    return c
  }
  groupImage(g){
    if(this.cache.has(g.id))return this.cache.get(g.id)
    const b=boundsOf(g.shapes),margin=6
    const x=Math.floor(b[0]-margin),y=Math.floor(b[1]-margin)
    const c=this.createCanvas(Math.max(1,Math.ceil(b[2]-x+margin)),Math.max(1,Math.ceil(b[3]-y+margin)))
    const ctx=c.getContext('2d');ctx.translate(-x,-y)
    for(const s of g.shapes)paintStroke(ctx,s)
    const result={canvas:c,x,y};this.cache.set(g.id,result);return result
  }
  transform(ctx,cam){ctx.translate(960,500);ctx.rotate(cam.roll);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y)}
  drawBoard(ctx,t){
    const cam=this.camera.at(t)
    const boardWidth=this.boardWidth,boardHeight=this.boardHeight
    ctx.fillStyle='#dddcd6';ctx.fillRect(0,0,WIDTH,HEIGHT)
    ctx.save();this.transform(ctx,cam)
    ctx.shadowColor='rgba(35,35,31,.23)';ctx.shadowBlur=65;ctx.shadowOffsetY=35
    ctx.fillStyle='#b7babb';ctx.fillRect(-43,-43,boardWidth+86,boardHeight+86)
    ctx.shadowColor='transparent'
    ctx.fillStyle='#e4e7e7';ctx.fillRect(-25,-25,boardWidth+50,boardHeight+50)
    ctx.drawImage(this.surface,0,0,boardWidth,boardHeight)
    // Frame lip and tray visible only during the final wide camera.
    const tray=ctx.createLinearGradient(0,boardHeight+32,0,boardHeight+135)
    tray.addColorStop(0,'#747e83');tray.addColorStop(.35,'#dce1e2');tray.addColorStop(1,'#abb1b3')
    ctx.fillStyle=tray;ctx.fillRect(boardWidth/BOARD_W*1450,boardHeight+28,boardWidth/BOARD_W*5300,100)
    ctx.restore()
    const ink=this.inkCanvas.getContext('2d')
    ink.clearRect(0,0,WIDTH,HEIGHT)
    ink.save();this.transform(ink,cam)
    const left=cam.x-WIDTH/cam.z*.6,right=cam.x+WIDTH/cam.z*.6
    const top=cam.y-HEIGHT/cam.z*.6,bottom=cam.y+HEIGHT/cam.z*.6
    for(const g of this.score.groups){
      if(t<g.start)continue
      const b=boundsOf(g.shapes)
      if(b[2]<left||b[0]>right||b[3]<top||b[1]>bottom)continue
      if(t>=g.end){
        const item=this.groupImage(g);ink.drawImage(item.canvas,item.x,item.y)
      } else for(const s of g.shapes){if(t>s.start)paintStroke(ink,s,writingEase((t-s.start)/(s.end-s.start)))}
    }
    // An eraser is a moving physical mask, leaving a ten-percent ink ghost.
    for(const e of this.score.erasers){
      if(t<e.start)continue
      ink.save();ink.globalCompositeOperation='destination-out';ink.globalAlpha=.90
      ink.fillStyle='#000'
      if(t>=e.end)ink.fillRect(e.x,e.y,e.w,e.h)
      else{
        // Union of the eraser's swept footprint: no jump at row changes,
        // and overlapping passes remove ink once so the faint ghost survives.
        const samples=Math.max(1,Math.ceil((t-e.start)/(e.end-e.start)*100))
        ink.beginPath()
        for(let i=0;i<=samples;i++){
          const p=eraserState(e,mix(e.start,t,i/samples))
          const rowHeight=e.h/eraserRows(e)
          ink.rect(p.x-140,p.y-rowHeight/2,280,rowHeight)
        }
        ink.fill()
      }
      ink.restore()
    }
    ink.restore()
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(this.inkCanvas,0,0);ctx.restore()
    // Gloss is subtle and slower than the board motion.
    const sheenX=WIDTH*.3-(cam.x-4000)*cam.z*.35
    ctx.save();ctx.translate(sheenX,0);ctx.rotate(-.35)
    const sheen=ctx.createLinearGradient(-380,0,420,0)
    sheen.addColorStop(0,'rgba(255,255,255,0)');sheen.addColorStop(.48,'rgba(255,255,255,.14)');sheen.addColorStop(1,'rgba(255,255,255,0)')
    ctx.fillStyle=sheen;ctx.fillRect(-380,-1500,800,4000);ctx.restore()
    ctx.save();this.transform(ctx,cam);this.props(ctx,t,cam);ctx.restore()
    this.pens(ctx,t,cam)
    for(const e of this.score.erasers){
      if(t<e.start-.45||t>e.end+.45)continue
      const state=eraserState(e,t)
      let p=this.camera.project([state.x,state.y],t)
      const u=t<e.start?smooth((t-e.start+.45)/.45):t>e.end?1-smooth((t-e.end)/.45):1
      p=[mix(2160,p[0],u),mix(820,p[1],u)]
      ctx.save();ctx.translate(...p);ctx.rotate(-.055);ctx.scale(cam.z,cam.z)
      ctx.shadowColor='rgba(30,30,30,.3)';ctx.shadowOffsetX=20;ctx.shadowOffsetY=25;ctx.shadowBlur=18
      ctx.fillStyle='#d1cbbb';ctx.beginPath();ctx.roundRect(-140,-40,280,95,9);ctx.fill()
      ctx.shadowColor='transparent';ctx.fillStyle='#242d36';ctx.beginPath();ctx.roundRect(-140,-52,280,85,9);ctx.fill()
      ctx.fillStyle='#47515a';ctx.fillRect(-131,-46,262,12)
      ctx.fillStyle=ORANGE;ctx.fillRect(-47,-20,94,28);ctx.restore()
    }
  }
  penStates(t){
    const result=[]
    for(const pen of Object.keys(PENS)){
      const dock={black:[2100,1130],blue:[2250,780],orange:[2100,1400],red:[2230,400]}[pen]
      const strokes=this.score.strokes.filter(s=>s.pen===pen)
      let previous=null,next=null,active=null
      for(const s of strokes){
        if(t>=s.start&&t<=s.end){active=s;break}
        if(s.end<t)previous=s
        if(s.start>t){next=s;break}
      }
      let p,lift=0,alpha=1
      if(active)p=this.camera.project(pointAt(active,writingEase((t-active.start)/(active.end-active.start))),t)
      else if(previous&&next&&next.start-previous.end<.7){
        const u=clamp((t-previous.end)/(next.start-previous.end))
        const a=previous.points.at(-1),b=next.points[0]
        p=this.camera.project([mix(a[0],b[0],smooth(u)),mix(a[1],b[1],smooth(u))],t)
        lift=Math.sin(Math.PI*u)*Math.min(75,dist(a,b)*.35)
      }else if(next&&t>next.start-.55){
        const u=smooth((t-next.start+.55)/.55),b=this.camera.project(next.points[0],t)
        p=[mix(dock[0],b[0],u),mix(dock[1],b[1],u)];lift=55*(1-u)
      }else if(previous&&t<previous.end+.6){
        const u=smooth((t-previous.end)/.6),a=this.camera.project(previous.points.at(-1),t)
        p=[mix(a[0],dock[0],u),mix(a[1],dock[1],u)];lift=50*u
      }else continue
      result.push({pen,x:p[0],y:p[1]-lift*.4,lift,alpha})
    }
    return result
  }
  pens(ctx,t,cam){
    for(const {pen,x,y,lift,alpha} of this.penStates(t)){
      marker(ctx,x,y,PENS[pen],
        {scale:clamp(cam.z*1.27,.32,1.5),lift,alpha,angle:.56+Math.sin(t*1.4)*.035})
    }
  }
  subtitle(ctx,t){
    const c=this.captions.find(c=>t>=c.start&&t<c.end)
    if(!c)return
    ctx.save();ctx.font='42px Architects Daughter';ctx.textAlign='center';ctx.textBaseline='middle'
    const lines=c.lines||[c.text],w=Math.max(...lines.map(s=>ctx.measureText(s).width))+100
    const h=lines.length*51+30,y=HEIGHT-h-22
    ctx.fillStyle='rgba(251,250,246,.94)';ctx.beginPath();ctx.roundRect((WIDTH-w)/2,y,w,h,15);ctx.fill()
    ctx.strokeStyle=ORANGE;ctx.lineCap='round';ctx.lineWidth=6
    ctx.beginPath();ctx.moveTo((WIDTH-w)/2+23,y+h*.5-12);ctx.lineTo((WIDTH-w)/2+23,y+h*.5+12);ctx.stroke()
    ctx.fillStyle=INK
    lines.forEach((s,i)=>ctx.fillText(s,WIDTH/2+6,y+15+25.5+i*51))
    ctx.restore()
  }
  render(ctx,t,{subtitles=true}={}){
    this.drawBoard(ctx,t)
    if(subtitles)this.subtitle(ctx,t)
  }
}
