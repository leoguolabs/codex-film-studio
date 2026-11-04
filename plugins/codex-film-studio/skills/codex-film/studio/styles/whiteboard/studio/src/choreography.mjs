// Resolve explicit cross-marker handoffs together with each marker's own queue.
export function compileSequence(score,dependencies){
  const byId=new Map(score.groups.map(g=>[g.id,g]))
  const requested=new Map(score.groups.map(g=>[g.id,g.start]))
  const edges=[...dependencies]
  for(const pen of new Set(score.groups.map(g=>g.pen))){
    const queue=score.groups.filter(g=>g.pen===pen).sort((a,b)=>a.start-b.start)
    for(let i=1;i<queue.length;i++)
      edges.push({before:queue[i-1].id,after:queue[i].id,gap:.035})
  }
  for(const {before,after,gap} of edges){
    if(!byId.has(before)||!byId.has(after)||before===after||!(gap>=0))
      throw new Error(`Invalid marker handoff: ${before} -> ${after}`)
  }
  const pending=new Set(byId.keys()),done=new Set()
  while(pending.size){
    const id=[...pending].find(id=>edges.filter(e=>e.after===id).every(e=>done.has(e.before)))
    if(id===undefined)throw new Error('Cyclic marker timing constraints.')
    const group=byId.get(id)
    const incoming=edges.filter(e=>e.after===id)
    const earliest=Math.max(group.start,...incoming.map(e=>byId.get(e.before).end+e.gap))
    const delta=earliest-group.start
    if(delta>0){
      group.start+=delta;group.end+=delta
      for(const stroke of group.shapes){stroke.start+=delta;stroke.end+=delta}
      const label=score.labels.find(l=>l.id===id)
      if(label){label.start+=delta;label.end+=delta}
    }
    done.add(id);pending.delete(id)
  }
  score.strokes.sort((a,b)=>a.start-b.start)
  score.rescheduled=score.groups.map(g=>({id:g.id,delay:g.start-requested.get(g.id)}))
    .filter(g=>g.delay>1e-7)
}
