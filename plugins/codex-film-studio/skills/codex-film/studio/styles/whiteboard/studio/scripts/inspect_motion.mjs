// Find conservative marker-body intersections for subsequent visual inspection.
// This is a triage report. A geometric overlap does not establish a visible defect.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createCanvas} from '@napi-rs/canvas'

const argv=process.argv.slice(2)
const option=(name,fallback)=>argv.includes(name)?argv[argv.indexOf(name)+1]:fallback
const edition=option('--edition','short')
if(!['short','long'].includes(edition))throw new Error(`Unknown edition: ${edition}`)
const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const root=edition==='short'?studio:path.join(studio,'editions',edition)
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const {createFilm,FPS}=await import(edition==='short'?'../src/film.mjs':'../src/long-film.mjs')
const film=createFilm({
  font:await read(path.join(studio,'fonts/ems-tech.json')),
  narration:await read(path.join(root,'content/narration.json')),
  audio:existsSync(path.join(root,'media/audio/manifest.json'))?
    await read(path.join(root,'media/audio/manifest.json')):[],
  alignments:existsSync(path.join(root,'media/asr/review.json'))?
    await read(path.join(root,'media/asr/review.json')):[],
  createCanvas,
})
const {timeline,score,camera,renderer}=film
const groups=(pen,t)=>score.groups.filter(g=>g.pen===pen&&t>=g.start-.55&&t<=g.end+.6).map(g=>g.id)
const events=[]
const active=new Map()
for(let f=0;f<timeline.duration_frames;f++){
  const t=f/FPS,scale=Math.max(.32,Math.min(1.5,camera.at(t).z*1.27))
  const angle=.56+Math.sin(t*1.4)*.035,c=Math.cos(angle),s=Math.sin(angle)
  const width=58*scale,height=336*scale
  const bodies=renderer.penStates(t).map(p=>({
    ...p,cx:p.x+162*scale*s,cy:p.y-162*scale*c,
  })).filter(p=>{
    const halfX=(width*c+height*s)/2,halfY=(width*s+height*c)/2
    return p.cx+halfX>0&&p.cx-halfX<1920&&p.cy+halfY>0&&p.cy-halfY<1080
  })
  const found=new Set()
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j],dx=b.cx-a.cx,dy=b.cy-a.cy
    const overlapX=width-Math.abs(dx*c+dy*s)
    const overlapY=height-Math.abs(-dx*s+dy*c)
    if(overlapX<=0||overlapY<=0)continue
    const key=[a.pen,b.pen].sort().join('/')
    found.add(key)
    let event=active.get(key)
    if(!event){
      event={pens:key,first_frame:f,last_frame:f,peak_frame:f,peak_area:0,groups:[]}
      active.set(key,event);events.push(event)
    }
    event.last_frame=f
    const area=overlapX*overlapY
    if(area>event.peak_area){
      event.peak_frame=f;event.peak_area=area
      event.groups=[...groups(a.pen,t),...groups(b.pen,t)]
      event.region=timeline.lines.find(l=>t>=l.start&&t<=l.end)?.region??'transition'
    }
  }
  for(const key of active.keys())if(!found.has(key))active.delete(key)
}
const report={
  edition,complete_audio:timeline.complete_audio,fps:FPS,frames:timeline.duration_frames,
  scope:'Conservative marker-body rectangles at each exact frame. Candidate defects require rendered visual review. Shadows, erasers and subframe motion are not assessed.',
  timeline_sha256:sha(JSON.stringify(timeline)),
  composition_sha256:sha(await readFile(path.join(studio,edition==='short'?'src/film.mjs':'src/long-film.mjs'))),
  renderer_sha256:sha(await readFile(path.join(studio,'src/board.mjs'))),
  events:events.map(e=>({...e,peak_area:Math.round(e.peak_area),time:e.peak_frame/FPS})),
}
const output=path.join(root,option('--out','review/motion-candidates.json'))
await mkdir(path.dirname(output),{recursive:true})
await writeFile(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({output,frames:report.frames,candidates:report.events.length}))
