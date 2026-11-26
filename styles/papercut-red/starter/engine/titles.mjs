import { W, H, palette, clamp, smooth, onTwos, box, polygon, saw, petal, wheel } from './paper.mjs'

export function bannerPath(width, height) {
  const edge = 8
  const teeth = Math.round(width/14)
  return polygon([
    ...saw(-width/2,-height/2,width,teeth,3.2),
    [width/2-edge,0],[width/2,height/2],
    ...saw(-width/2,height/2,width,teeth,3.2,1).reverse().slice(1),
    [-width/2+edge,0]
  ])
}

export function subtitle(s, cue, t) {
  const {ctx}=s
  const lines=cue.caption
  const size=lines.length===1?29:26
  ctx.save()
  ctx.font=`600 ${size}px "Paper Serif", Georgia, serif`
  ctx.textAlign='center'
  ctx.textBaseline='middle'
  const width=Math.min(1130,Math.max(366,...lines.map(line=>ctx.measureText(line).width+82)))
  const h=lines.length===1?38:lines.length*29+12
  const onset=clamp(onTwos(t-cue.start)*8)
  s.at(W/2,H-36-h/2+(1-onset)*9,0,1,()=>{
    s.piece(bannerPath(width,h),'banner',{depth:1.15,edge:.75})
    for(const x of [-width/2+22,width/2-22]){
      s.fill(wheelAt(x,0,6),'#f6b880')
    }
    ctx.fillStyle=palette.cream
    const longest=Math.max(...lines.map(line=>ctx.measureText(line).width))
    if(longest>width-64)ctx.scale((width-64)/longest,1)
    lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*29+1))
  })
  ctx.restore()
}

function wheelAt(x,y,r) {
  return wheel(r,5,.52).replace(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g,p=>{
    const [px,py]=p.split(',').map(Number)
    return `${px+x},${py+y}`
  })
}

export function title(s, lines, t, {y=318,size=123,color='red',mark='cut',letterDelay=.063,rowScales=[]}={}) {
  const {ctx}=s
  let index=0
  ctx.save()
  ctx.textBaseline='middle'
  ctx.textAlign='left'
  for(let row=0;row<lines.length;row++){
    const line=lines[row]
    ctx.font=`800 ${size*(rowScales[row] ?? 1)}px "Paper Display", Georgia, serif`
    const weight=ctx.measureText(line).width
    let x=(W-weight)/2
    const cy=y+(row-(lines.length-1)/2)*size*.86
    for (const char of line) {
      const p=clamp((onTwos(t)-index*letterDelay)*9)
      const aw=ctx.measureText(char).width
      if(p>0&&char!==' '){
        const lift=(1-smooth(p))*23
        const twist=(index%2===0?-1:1)*.028*(1-p*.86)
        s.at(x,cy-lift,twist,1,()=>{
          ctx.fillStyle='#68232538'
          ctx.fillText(char,3,5)
          ctx.fillStyle=palette[color] || color
          ctx.fillText(char,0,0)
        })
      }
      x+=aw
      index++
    }
  }
  const cy=y+lines.length*size*.43+52
  if(t>.9 && mark==='cut'){
    s.at(W/2,cy,0,.75+.25*smooth((t-.9)*4),()=>{
      const d=box(-19,-19,38,38) + petal(0,0,29,8,Math.PI/4) + petal(-10,9,12,4,Math.PI/4)
      s.piece(d,'deep',{depth:1.3})
    })
  }
  ctx.restore()
}

export function trimBorder(s, y, width=912, color='red') {
  const x=(W-width)/2
  const d=polygon([...saw(x,y,width,Math.round(width/13),7),[x+width,y+10],[x,y+10]])
  s.piece(d,color,{depth:.8})
}
