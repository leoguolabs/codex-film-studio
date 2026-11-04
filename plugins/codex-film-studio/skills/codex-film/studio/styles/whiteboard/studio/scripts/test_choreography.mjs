import test from 'node:test'
import assert from 'node:assert/strict'
import {Score,line} from '../src/board.mjs'
import {compileSequence} from '../src/choreography.mjs'

test('a delayed drawing hands off only after departure and approach clearance',()=>{
  const score=new Score()
  score.draw('heading',line(0,0,100,0),0,5)
  score.draw('person',line(100,0,100,100),1,3)
  score.draw('paper',line(100,100,200,100),2,3,{pen:'blue',label:'paper'})
  score.draw('caption',line(100,200,200,200),4,5,{pen:'blue',label:'caption'})
  compileSequence(score,[{before:'person',after:'paper',gap:1.25}])
  const byId=Object.fromEntries(score.groups.map(g=>[g.id,g]))
  assert.ok(byId.person.start>=byId.heading.end)
  assert.ok(byId.paper.start>=byId.person.end+1.25-1e-7)
  assert.ok(byId.caption.start>=byId.paper.end)
  for(const label of score.labels){
    assert.equal(label.start,byId[label.id].start)
    assert.equal(label.end,byId[label.id].end)
  }
  const times=score.groups.map(g=>[g.start,g.end])
  compileSequence(score,[{before:'person',after:'paper',gap:1.25}])
  assert.deepEqual(score.groups.map(g=>[g.start,g.end]),times)
})

test('cyclic and missing handoffs fail instead of silently reordering a pen',()=>{
  const score=new Score()
  score.draw('first',line(0,0,1,1),0,1)
  score.draw('second',line(1,1,2,2),2,3)
  assert.throws(()=>compileSequence(score,[{before:'second',after:'first',gap:1}]),/Cyclic/)
  assert.throws(()=>compileSequence(score,[{before:'missing',after:'first',gap:1}]),/Invalid/)
})
