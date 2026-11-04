import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createCanvas,GlobalFonts} from '@napi-rs/canvas'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'
import {Score,line,PENS} from '../src/board.mjs'
import {comparisonBeats,referenceFrame} from '../src/comparison.mjs'

const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const edition=process.argv.includes('--edition')?process.argv[process.argv.indexOf('--edition')+1]:'short'
if(!['short','long'].includes(edition))throw new Error(`Unknown edition: ${edition}`)
const {createFilm}=await import(edition==='short'?'../src/film.mjs':'../src/long-film.mjs')
const root=edition==='short'?studio:path.join(studio,'editions',edition)
process.chdir(root)
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const sha=data=>createHash('sha256').update(data).digest('hex')
const draft=process.argv.includes('--draft')
const narration=await read('content/narration.json')
const font=await read(path.join(studio,'fonts/ems-tech.json'))
const audio=existsSync('media/audio/manifest.json')?await read('media/audio/manifest.json'):[]
const alignments=existsSync('media/asr/review.json')?await read('media/asr/review.json'):[]
const definitions=await read('content/comparison.json')
GlobalFonts.registerFromPath(path.join(studio,'fonts/ArchitectsDaughter-Regular.ttf'),'Architects Daughter')
const input={font,narration,audio,alignments,createCanvas}
const film=createFilm(input)
const {score,timeline,camera}=film
const errors=[],warnings=[]
for(const row of timeline.lines){
  if(!row.audio){(draft?warnings:errors).push(`Missing current audio: ${row.id}`);continue}
  const bytes=await readFile(row.audio.path)
  if(sha(bytes)!==row.audio.audio_sha256)errors.push(`Changed WAV: ${row.id}`)
  if(sha(Buffer.from(row.text))!==row.audio.source_sha256)errors.push(`Stale source binding: ${row.id}`)
  const asr=alignments.find(a=>a.id===row.id&&a.audio_sha256===row.audio.audio_sha256)
  if(!asr||asr.normalized_changes.length){
    (draft?warnings:errors).push(`Unresolved independent transcript: ${row.id}`)
  }
}
for(const pen of Object.keys(PENS)){
  const strokes=score.strokes.filter(s=>s.pen===pen)
  for(let i=1;i<strokes.length;i++)
    if(strokes[i].start<strokes[i-1].end-.000001)errors.push(`Pen writes two strokes at once: ${pen}`)
}
const focal=[]
for(const label of score.labels){
  const t=label.end+.15
  const [x0,y0,x1,y1]=label.bounds
  const corners=[[x0,y0],[x0,y1],[x1,y0],[x1,y1]].map(p=>camera.project(p,t))
  const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1])
  const bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]
  const clipped=bounds[0]<18||bounds[1]<18||bounds[2]>1902||bounds[3]>940
  focal.push({id:label.id,text:label.text,time:t,bounds,clipped})
  if(clipped)errors.push(`Focal label clipped after writing: ${label.id}`)
}
const ctx=createCanvas(1920,1080).getContext('2d')
ctx.font='42px Architects Daughter'
for(let i=0;i<timeline.captions.length;i++){
  const c=timeline.captions[i]
  if(c.end<=c.start)errors.push(`Nonpositive caption ${i}`)
  if(ctx.measureText(c.lines[0]).width+100>1840)errors.push(`Wide caption ${i}`)
  if(i&&c.start<timeline.captions[i-1].end-1e-6)errors.push(`Caption overlap ${i}`)
  if(!draft&&c.alignment!=='unprompted-ASR-to-source')errors.push(`Estimated final caption ${i}`)
}
const allCaptionWords=timeline.captions.flatMap(c=>c.lines).join(' ')
if(allCaptionWords!==narration.map(n=>n.text).join(' '))errors.push('Captions alter or omit finalized narration.')
const beats=comparisonBeats(timeline,definitions)
for(let f=0;f<timeline.duration_frames;f++){
  const {frame,beat}=referenceFrame(f,beats)
  if(!Number.isInteger(frame)||frame<0||frame>=2664||!beat)errors.push(`Unmapped frame ${f}`)
}
// A seek backwards must reproduce the same image, regardless of cache state.
const canvas=createCanvas(1920,1080),context=canvas.getContext('2d')
const deterministicFrames={}
const inspectionTimes=edition==='short'?[14,41.5,104.7,142.4]:[14,...[9,25,39].map(i=>timeline.lines[i].start+4)]
for(const t of inspectionTimes){
  film.renderer.render(context,t)
  const expected=sha(canvas.toBuffer('image/png'))
  film.renderer.render(context,timeline.duration-.05)
  film.renderer.render(context,t)
  assert.equal(sha(canvas.toBuffer('image/png')),expected,`Backward seek changed frame at ${t}`)
  const fresh=createFilm(input)
  fresh.renderer.render(context,t)
  assert.equal(sha(canvas.toBuffer('image/png')),expected,`Fresh film changed frame at ${t}`)
  deterministicFrames[t]=expected
}
// Regression for cache-key substitution and impossible pen concurrency.
const regression=new Score()
regression.draw('first',line(0,0,10,10),0,1)
assert.throws(()=>regression.draw('first',line(20,20,30,30),1,2),/Duplicate/)
regression.draw('second',line(20,20,30,30),.5,1.5)
regression.compile()
assert.ok(regression.groups[1].start>=regression.groups[0].end)
const report={status:errors.length?'failed':draft?'draft checks passed':'passed',
  duration:timeline.duration,frames:timeline.duration_frames,audio_lines:audio.length,
  focal_labels:focal,pen_rescheduling:score.rescheduled,errors,warnings,
  deterministic_frame_sha256:deterministicFrames[14],
  deterministic_frames:deterministicFrames,
  checks:['source and audio hashes','independent transcript','one stroke per pen',
    'focal label safe area','caption coverage, width and timing','every-frame reference mapping',
    'backward seek determinism','fresh film determinism','duplicate drawing regression']}
await mkdir('review',{recursive:true})
await writeFile('review/structural-validation.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({status:report.status,errors,warnings,frames:timeline.duration_frames},null,2))
if(errors.length)process.exitCode=1
