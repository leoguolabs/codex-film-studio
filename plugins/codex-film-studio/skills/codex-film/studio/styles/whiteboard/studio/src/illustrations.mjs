// Original semantic line illustrations, built from the same timed ink as text.
import {line, poly, curve, circle, rect, INK, BLUE, RED} from './board.mjs'

function drawing(x,y,scale,color=INK,mirror=false){
  const point=([a,b])=>[x+(mirror?260-a:a)*scale,y+b*scale]
  const style={color,width:6.5*scale,wobble:.8*scale}
  return {
    line:(a,b)=>line(...point(a),...point(b),style),
    poly:ps=>poly(ps.map(point),style),
    curve:ps=>curve(ps.map(point),style),
    circle:(a,b,r,opts={})=>circle(...point([a,b]),r*scale,{...style,...opts}),
    rect:(a,b,w,h)=>rect(...point([a,b]),w*scale,h*scale,style),
  }
}

// One recognizable learner: round face, swept hair and a curved shirt.
// Coordinates are local to a 330 × 320 illustration, with separate ink layers.
export function learnerAtDesk(x,y,{scale=1,accent=BLUE,mode='laptop'}={}){
  const d=drawing(x,y,scale),a=drawing(x,y,scale,accent)
  const body=[
    d.circle(80,49,35,{start:.2,end:Math.PI*2+.2}),
    d.curve([[48,42],[47,2],[101,1],[114,36]]),
    d.curve([[49,32],[65,37],[79,15],[102,23]]),
    d.line([91,47],[93,49]),
    d.poly([[108,53],[116,59],[108,63]]),
    d.curve([[90,69],[97,74],[103,72],[106,69]]),
    d.line([70,84],[69,98]),d.line([89,83],[91,96]),
    d.curve([[69,96],[41,107],[41,154],[46,199]]),
    d.curve([[91,96],[119,108],[112,153],[113,198]]),
    d.curve([[46,199],[66,206],[96,207],[114,198]]),
    d.poly([[57,119],[75,157],mode==='laptop'?[153,170]:[133,159]]),
    d.poly([[105,119],[128,143],mode==='laptop'?[181,163]:[167,146]]),
    d.poly([[58,209],[127,216],[129,289],[150,293]]),
    d.poly([[99,211],[153,229],[159,280],[181,283]]),
    d.poly([[30,136],[31,218],[99,218]]),
    d.line([35,222],[27,293]),
    d.line([106,224],[112,293]),
  ]
  const desk=[
    d.line([121,184],[324,184]),
    d.line([143,188],[144,294]),d.line([306,188],[306,294]),
    d.line([11,303],[327,303]),
  ]
  const task=mode==='laptop'?[
    a.poly([[194,163],[183,96],[282,96],[294,163],[194,163]]),
    a.poly([[174,170],[309,170],[299,177],[166,177],[174,170]]),
    a.line([205,116],[260,116]),a.line([211,135],[253,135]),
  ]:[
    a.poly([[174,156],[258,152],[287,173],[192,179],[174,156]]),
    a.line([196,164],[250,163]),
    a.line([169,147],[199,123]),
    a.line([167,148],[171,141]),
  ]
  return {body,desk,task}
}

// A learner choosing a method, holding a notebook and bringing a hand to chin.
export function thinkingLearner(x,y,{scale=1,accent=BLUE,facing='right'}={}){
  const d=drawing(x,y,scale,INK,facing==='left'),a=drawing(x,y,scale,accent,facing==='left')
  const body=[
    d.circle(140,57,43,{start:.18,end:Math.PI*2+.18}),
    d.curve([[98,49],[96,-1],[161,-6],[182,40]]),
    d.curve([[101,28],[121,43],[144,13],[166,22]]),
    d.line([151,53],[153,55]),
    d.poly([[177,58],[186,66],[176,71]]),
    d.curve([[149,82],[157,85],[165,82],[168,80]]),
    d.line([125,101],[124,119]),d.line([155,98],[155,119]),
    d.curve([[124,118],[87,132],[83,181],[89,253]]),
    d.curve([[155,118],[187,136],[185,191],[181,252]]),
    d.curve([[89,253],[114,261],[155,261],[181,252]]),
    d.poly([[171,141],[217,174],[230,143],[184,92]]),
    d.poly([[179,90],[174,83],[170,87]]),
    d.poly([[102,145],[40,176],[43,180]]),
    d.poly([[106,265],[100,321],[85,366],[65,369]]),
    d.poly([[164,265],[172,319],[192,364],[214,365]]),
  ]
  const notebook=[
    a.poly([[2,188],[63,174],[80,231],[19,245],[2,188]]),
    a.line([14,199],[53,189]),a.line([19,214],[59,204]),
  ]
  return {body,notebook}
}

function insidePolygon(x,y,points){
  let inside=false
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [a,b]=points[i],[c,d]=points[j]
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside
  }
  return inside
}

// Red hatch strokes surround untouched board-white crescent and five-point star.
// Simplified flat 3:2 flag; it is a drawn location cue, not an official template.
export function turkishFlag(x,y,{height=130}={}){
  const h=height,w=h*1.5,cx=h*.50,cy=h*.50,r=h*.25
  const innerX=cx+h*.0625,innerR=h*.20
  const star=Array.from({length:10},(_,i)=>{
    const angle=Math.PI+i*Math.PI/5,rad=h*(i%2?.04775:.125)
    return [h*.875+Math.cos(angle)*rad,cy+Math.sin(angle)*rad]
  })
  const white=(px,py)=>
    (Math.hypot(px-cx,py-cy)<=r&&Math.hypot(px-innerX,py-cy)>=innerR)
    ||insidePolygon(px,py,star)
  const inset=2.5,step=2,rows=[]
  for(let yy=inset;yy<h-inset;yy+=3.6){
    let segment=[]
    const flush=()=>{if(segment.length>1)rows.push(poly(segment,{color:RED,width:4.6,wobble:.15,alpha:.98}));segment=[]}
    // Include the nib radius in the exclusion so dry strokes cannot dirty white symbols.
    for(let xx=inset;xx<=w-inset;xx+=step){
      const excluded=white(xx,yy)||white(xx-2,yy)||white(xx+2,yy)||white(xx,yy-2)||white(xx,yy+2)
      if(excluded)flush()
      else segment.push([x+xx,y+yy])
    }
    flush()
  }
  const outline=rect(x,y,w,h,{color:RED,width:4,wobble:.5})
  const pole=[line(x-6,y-10,x-6,y+h+45,{color:INK,width:5}),
    line(x-27,y+h+45,x+16,y+h+45,{color:INK,width:5})]
  return {pole,field:[...rows,...outline]}
}
