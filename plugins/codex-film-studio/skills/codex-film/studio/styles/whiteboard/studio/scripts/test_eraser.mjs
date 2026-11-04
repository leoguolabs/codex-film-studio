import test from 'node:test'
import assert from 'node:assert/strict'
import {eraserState,clamp,smooth,mix} from '../src/board.mjs'

test('the default three-pass motion preserves the accepted short trajectory',()=>{
  const e={start:10,end:11.25,x:75,y:70,w:530,h:270}
  const previous=t=>{
    const p=clamp((t-e.start)/(e.end-e.start))*3.5
    const left=e.x+140,right=e.x+e.w-140,rowHeight=e.h/3
    if(p<=1)return {x:mix(left,right,smooth(p)),y:e.y+rowHeight*.5}
    if(p<=1.25)return {x:right,y:e.y+rowHeight*(.5+smooth((p-1)/.25))}
    if(p<=2.25)return {x:mix(right,left,smooth(p-1.25)),y:e.y+rowHeight*1.5}
    if(p<=2.5)return {x:left,y:e.y+rowHeight*(1.5+smooth((p-2.25)/.25))}
    return {x:mix(left,right,smooth(p-2.5)),y:e.y+rowHeight*2.5}
  }
  for(let i=0;i<=1250;i++){
    const t=e.start+i/1000
    assert.deepEqual(eraserState(e,t),previous(t))
  }
})

test('eight passes cover a tall panel without enlarging the physical wiping strip',()=>{
  const e={start:0,end:5.2,x:900,y:4280,w:800,h:620,rows:8}
  const strip=e.h/e.rows
  assert.ok(strip<=85)
  const total=e.rows+(e.rows-1)*.25
  for(let row=0;row<e.rows;row++){
    const a=eraserState(e,e.end*row*1.25/total)
    const b=eraserState(e,e.end*(row*1.25+1)/total)
    assert.ok(Math.abs(a.y-(e.y+(row+.5)*strip))<1e-9)
    assert.ok(Math.abs(b.y-a.y)<1e-9)
    assert.ok(Math.abs(Math.min(a.x,b.x)-140-e.x)<1e-9)
    assert.ok(Math.abs(Math.max(a.x,b.x)+140-e.x-e.w)<1e-9)
  }
  for(let i=1;i<10000;i++){
    const a=eraserState(e,e.end*(i-1)/10000),b=eraserState(e,e.end*i/10000)
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<2,'No jump between rows')
  }
})

test('invalid pass counts fail before rendering',()=>{
  for(const rows of [0,-1,1.5,NaN])
    assert.throws(()=>eraserState({start:0,end:1,x:0,y:0,w:400,h:200,rows},.5),/positive integer/)
})
