import fs from 'node:fs/promises'
import { once } from 'node:events'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { W,H,FPS,makeStage,box,openwork,flap,scissors } from '../engine/paper.mjs'
import { subtitle } from '../engine/titles.mjs'
import { draw, shots } from '../film.mjs'

const root=fileURLToPath(new URL('../',import.meta.url))
const mode=process.argv[2]
const factor=Number(process.env.PAPERCUT_SCALE ?? 1)
if (![1,1.5].includes(factor)) throw new Error('Choose PAPERCUT_SCALE=1 or 1.5.')
const width=W*factor
const height=H*factor
const canvas=createCanvas(width,height)
const ctx=canvas.getContext('2d')
ctx.scale(factor,factor)
for(const [file, family] of [['Narrator.ttf','Paper Serif'],['Display.ttf','Paper Display']]) {
  if(!GlobalFonts.registerFromPath(path.join(root,'fonts',file),family)) throw new Error('Unable to load '+file)
}
const stage=makeStage(ctx)

if(mode==='proof'){
  stage.ground('rice')
  stage.at(445,352,.16,1,()=>stage.piece(openwork(204),'red',{depth:2}))
  flap(stage,box(0,-100,165,210),{x:790,y:395,length:165,angle:.88,axis:-.2})
  scissors(stage,813,288,-.51,.25,1.25)
  await fs.mkdir(path.join(root,'media'),{recursive:true})
  await fs.writeFile(path.join(root,'media','material-proof.png'),canvas.toBuffer('image/png'))
  process.exit(0)
}

const config=JSON.parse(await fs.readFile(path.join(root,'content','narration.json')))
let captions=[]
try {
  captions=JSON.parse(await fs.readFile(path.join(root,'content','cues.json')))
} catch(error) {
  if (mode==='raw' || error.code!=='ENOENT') throw error
}
if(!(config.duration>0 && config.duration<=180 && Number.isInteger(config.duration*FPS))) throw new Error('Supply an exact 24 fps duration within 180 seconds.')
const end=config.duration*FPS
if(shots.length===0 || shots[0].start!==0 || shots.at(-1).end!==end ||
  shots.some((s,i)=>!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.end<=s.start||(i&&shots[i-1].end!==s.start))) {
  throw new Error('Shots must be contiguous half-open frame intervals covering the film.')
}

function frame(i) {
  const t=i/FPS
  const shot=shots.find(shot=>i<shot.end)
  const { start, end }=shot
  ctx.save()
  draw(stage,{t,i,shot,local:(i-start)/FPS,duration:(end-start)/FPS})
  ctx.restore()
  const cue=captions.find(c=>t>=c.start && t<c.end)
  if(cue) subtitle(stage,cue,t)
}
if(mode==='still'){
  const output=process.argv[3]
  const i=Number(process.argv[4])
  if(!output || !Number.isInteger(i) || i<0 || i>=end) throw new Error('still <out.png> <frame>')
  frame(i)
  await fs.mkdir(path.dirname(output),{recursive:true})
  await fs.writeFile(output,canvas.toBuffer('image/png'))
} else if(mode==='raw'){
  const first=Number(process.argv[3] ?? 0)
  const last=Number(process.argv[4] ?? end)
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>end||first>=last) throw new Error('Invalid raw frame range.')
  for(let i=first;i<last;i++){
    frame(i)
    const pixels=ctx.getImageData(0,0,width,height).data
    if(!process.stdout.write(Buffer.from(pixels.buffer,pixels.byteOffset,pixels.byteLength))){
      await once(process.stdout,'drain')
    }
    if((i-first+1)%240===0)process.stderr.write(`Rendered ${i-first+1} of ${last-first} frames\n`)
  }
}else{
  throw new Error('Use proof, still or raw.')
}
