import test from 'node:test'
import assert from 'node:assert/strict'
import {makeTimeline} from '../src/film.mjs'

const narration=['01','02','03'].map(id=>({id,text:`Line ${id}`}))
const audio=narration.map(n=>({...n,duration:10}))

test('a drawing pause redistributes silence without stretching or overlapping speech',()=>{
  const normal=makeTimeline(narration,audio,[],{targetDuration:60})
  const paused=makeTimeline(narration,audio,[],{targetDuration:60,extraGaps:{'01':4}})
  assert.equal(paused.duration,normal.duration)
  assert.equal(paused.lines[0].start,normal.lines[0].start)
  assert.equal(paused.lines[1].start-normal.lines[1].start,2)
  assert.equal(paused.lines[2].start,normal.lines[2].start)
  for(let i=0;i<paused.lines.length;i++){
    assert.equal(paused.lines[i].duration,10)
    if(i)assert.ok(paused.lines[i].start>=paused.lines[i-1].end)
  }
})

test('insufficient room extends the film instead of overlapping speech',()=>{
  const film=makeTimeline(narration,audio,[],{
    targetDuration:35,minimumRoom:0,extraGaps:{'01':8},
  })
  assert.equal(film.duration,48)
  assert.equal(film.lines[1].start-film.lines[0].end,8)
  assert.equal(film.lines[2].start,film.lines[1].end)
})

test('unknown, final-line and negative pauses are rejected',()=>{
  for(const extraGaps of [{'04':1},{'03':1},{'01':-1},{'01':Infinity}])
    assert.throws(()=>makeTimeline(narration,audio,[],{extraGaps}),/Invalid extra/)
})
