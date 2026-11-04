import {createCanvas, GlobalFonts} from '@napi-rs/canvas'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {once} from 'node:events'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const argv=process.argv.slice(2)
const option=(name,fallback)=>argv.includes(name)?argv[argv.indexOf(name)+1]:fallback
const edition=option('--edition','short')
if(!['short','long'].includes(edition))throw new Error(`Unknown edition: ${edition}`)
const STUDIO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const ROOT=edition==='short'?STUDIO:path.join(STUDIO,'editions',edition)
const {createFilm,FPS}=await import(edition==='short'?'../src/film.mjs':'../src/long-film.mjs')
process.chdir(ROOT)
const out=option('--out','media/picture-v1.mp4')
const width=+option('--width','1920'),height=Math.round(width*9/16)
const font=JSON.parse(await readFile(path.join(STUDIO,'fonts/ems-tech.json'),'utf8'))
const narration=JSON.parse(await readFile('content/narration.json','utf8'))
const audio=existsSync('media/audio/manifest.json')?JSON.parse(await readFile('media/audio/manifest.json','utf8')):[]
const alignments=existsSync('media/asr/review.json')?JSON.parse(await readFile('media/asr/review.json','utf8')):[]
GlobalFonts.registerFromPath(path.join(STUDIO,'fonts/ArchitectsDaughter-Regular.ttf'),'Architects Daughter')
const film=createFilm({font,narration,audio,alignments,createCanvas})
const {timeline,score,camera,renderer}=film
const digest=data=>createHash('sha256').update(data).digest('hex')
await mkdir('media',{recursive:true})
await mkdir('review/stills',{recursive:true})
const timelineJSON=JSON.stringify(timeline,null,2)
const eventsJSON=JSON.stringify({
  fps:FPS,duration:timeline.duration,
  strokes:score.strokes.map(s=>({id:s.id,start:s.start,end:s.end,color:s.color,pen:s.pen,
    x:s.points[0][0],y:s.points[0][1],length:s.length})),cues:score.cues,camera:camera.keys},null,2)
await writeFile('media/timeline.json',timelineJSON)
await writeFile('media/events.json',eventsJSON)
const canvas=createCanvas(1920,1080),ctx=canvas.getContext('2d')
const small=width===1920?canvas:createCanvas(width,height)
const sub=createCanvas(1920,1080),subCtx=sub.getContext('2d')
function render(t,blur=true){
  const c1=camera.at(t-1/FPS/4),c2=camera.at(t+1/FPS/4)
  const travel=Math.hypot(c1.x-c2.x,c1.y-c2.y)*c1.z+Math.abs(c1.z-c2.z)*1500
  const before=renderer.penStates(t-1/FPS/4),after=renderer.penStates(t+1/FPS/4)
  let objectTravel=0
  for(const a of before){
    const b=after.find(s=>s.pen===a.pen)
    if(b)objectTravel=Math.max(objectTravel,Math.hypot(a.x-b.x,a.y-b.y))
  }
  const movingEraser=score.erasers.some(e=>t>=e.start-.45&&t<=e.end+.45)
  const samples=blur?Math.min(24,Math.max(1,Math.ceil(Math.max(travel,objectTravel)/3),movingEraser?6:1)):1
  if(samples===1)renderer.render(ctx,t)
  else {
    for(let i=0;i<samples;i++){
      const st=Math.max(0,t+((i+.5)/samples-.5)/FPS*.5)
      renderer.render(subCtx,st,{subtitles:false})
      ctx.globalAlpha=1/(i+1);ctx.drawImage(sub,0,0)
    }
    ctx.globalAlpha=1;renderer.subtitle(ctx,t)
  }
  if(small!==canvas)small.getContext('2d').drawImage(canvas,0,0,width,height)
}
if(argv.includes('--stills')){
  const times=option('--times',null)?.split(',').map(Number)||timeline.lines.map(l=>l.start+l.duration*.76)
  const folder=option('--still-dir','review/stills')
  await mkdir(folder,{recursive:true})
  const stills=[]
  for(const [i,t] of times.entries()){
    render(t,false)
    const filename=`${folder}/frame-${String(i).padStart(2,'0')}-${t.toFixed(2)}.jpg`
    const bytes=canvas.toBuffer('image/jpeg',93)
    await writeFile(filename,bytes)
    stills.push({file:path.basename(filename),time:t,sha256:digest(bytes)})
    console.log(filename)
  }
  await writeFile(`${folder}/index.json`,JSON.stringify({
    edition,timeline_sha256:digest(timelineJSON),events_sha256:digest(eventsJSON),
    complete_audio:timeline.complete_audio,width:1920,height:1080,stills,
    scope:'Selected source-render stills; not final-encoded or consecutive-frame review.'
  },null,2)+'\n')
  console.log(`Timeline ${timeline.duration.toFixed(3)}s, ${timeline.duration_frames} frames, complete audio: ${timeline.complete_audio}`)
  process.exit(0)
}
if(!timeline.complete_audio&&!argv.includes('--draft'))throw new Error('Final render requires all provider audio. Use --draft for development.')
const start=+option('--start','0'),stop=Math.min(+option('--end',`${timeline.duration}`),timeline.duration)
const first=Math.round(start*FPS),last=Math.round(stop*FPS)
const ff=spawn('ffmpeg',['-y','-v','warning','-f','image2pipe','-framerate',String(FPS),'-vcodec','mjpeg','-i','-',
  '-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709',
  '-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',
  '-color_range','tv','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',out],
  {stdio:['pipe','inherit','inherit']})
const started=performance.now()
for(let f=first;f<last;f++){
  render(f/FPS,!argv.includes('--no-blur'))
  const buf=small.toBuffer('image/jpeg',95)
  if(!ff.stdin.write(buf))await once(ff.stdin,'drain')
  if((f-first)%240===0)console.log(`frame ${f}/${last}; ${((f-first)/(performance.now()-started)*1000).toFixed(1)} fps`)
}
ff.stdin.end()
const [code]=await once(ff,'close')
if(code)throw new Error(`ffmpeg failed ${code}`)
await writeFile(`${out}.render.json`,JSON.stringify({
  picture_sha256:digest(await readFile(out)),
  timeline_sha256:digest(timelineJSON),
  events_sha256:digest(eventsJSON),
  first_frame:first,last_frame_exclusive:last,frames:last-first,
  fps:FPS,width,height,complete_audio:timeline.complete_audio,
  motion_blur:!argv.includes('--no-blur')
},null,2)+'\n')
console.log(JSON.stringify({out,frames:last-first,seconds:(last-first)/FPS,render_seconds:(performance.now()-started)/1000}))
