export function comparisonBeats(timeline,definitions){
  const beats=definitions.map(([id,label,rs,re,note])=>{
    const rows=timeline.lines.filter(l=>l.region===id)
    const start=id==='wide'?timeline.lines.at(-1).end+1:rows[0]?.start||0
    const end=id==='wide'?timeline.duration:id==='closing'?timeline.lines.at(-1).end+1:rows.at(-1)?.end||start+1
    return {id,label,rs,re,note,start:id==='hook'?0:start,end}
  }).sort((a,b)=>a.start-b.start)
  beats.forEach((b,i)=>{if(beats[i+1])b.end=beats[i+1].start})
  return beats
}

export function referenceFrame(frame,beats,fps=24,referenceFrames=2664){
  const t=frame/fps,b=beats.find(b=>t>=b.start&&t<b.end)||beats.at(-1)
  const u=Math.max(0,Math.min(1,(t-b.start)/(b.end-b.start)))
  return {beat:b,frame:Math.max(0,Math.min(referenceFrames-1,Math.round((b.rs+(b.re-b.rs)*u)*24)))}
}
