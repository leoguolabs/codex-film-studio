import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareFilm } from '../engine/sheet.mjs';
import film from '../src/film.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const [mode='proof',...args]=process.argv.slice(2);
const fps=24;
const frameName=i=>path.join('frames',String(i).padStart(6,'0')+'.jpg');
const proof={duration:3,sheets:[{at:0,draw({E,T,line,circle}){
  E(.1,.6,'line',circle(790,520,142,{w:9})); E(.7,1.1,'line',line(790,520,932,520,{w:6,color:'blue'}));
  E(1.2,2,'write',T('r',870,495,{color:'blue',size:60})); E(2.1,2.6,'line',circle(790,520,11,{color:'red',w:6}));
}}]};
const selected=mode==='proof'?proof:film;
const captions=fs.existsSync('content/cues.json')?JSON.parse(fs.readFileSync('content/cues.json','utf8')):[];
if(mode==='encode' && fs.existsSync('content/narration.json') && selected.duration!==JSON.parse(fs.readFileSync('content/narration.json')).duration)throw Error('Picture and narration durations differ.');
if(!Number.isFinite(selected.duration)||selected.duration<=0)throw Error('Set film.duration in seconds.');
const frames=Math.round(selected.duration*fps);
fs.mkdirSync('media',{recursive:true});
if(mode==='encode') {
  if(!fs.existsSync('audio/mix.wav')||!fs.existsSync('content/cues.json'))throw Error('Missing final mix or captions.');
  for(let i=0;i<frames;i++)if(!fs.existsSync(frameName(i)))throw Error('Missing frame '+i);
  const py=process.env.PYTHON||'python3';
  const dest=args[0]||'media/film.mp4';
  const parent=path.dirname(path.resolve(dest));
  fs.mkdirSync(parent,{recursive:true});
  const temporaryDir=fs.mkdtempSync(path.join(parent,'.marker-encode-'));
  const temporaryFile=path.join(temporaryDir,'render.mp4');
  try {
    const ff=spawnSync(py,['scripts/ffmpeg_serial.py','--','-hide_banner','-loglevel','error','-y','-framerate','24','-i','frames/%06d.jpg','-i','audio/mix.wav','-map','0:v:0','-map','1:a:0','-t',String(frames/fps),'-vf','scale=in_range=pc:out_range=pc:in_color_matrix=bt601:out_color_matrix=bt601,format=yuvj420p','-c:v','libx264','-preset','veryfast','-crf','17','-threads','3','-color_range','pc','-colorspace','bt470bg','-c:a','aac','-b:a','192k','-ar','48000','-metadata:s:a:0','language=eng','-movflags','+faststart',temporaryFile],{stdio:'inherit'});
    if(ff.error || ff.status!==0)throw Error('Encoding failed: '+(ff.error||ff.status));
    const result=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,nb_frames,width,height,duration,channels','-of','json',temporaryFile],{encoding:'utf8'});
    if(result.status!==0)throw Error('Encoded stream metadata could not be read.');
    const streams=JSON.parse(result.stdout).streams;
    const picture=streams.find(s=>s.codec_type==='video'), audio=streams.find(s=>s.codec_type==='audio');
    if(!picture || Number(picture.nb_frames)!==frames || picture.width!==1920 || picture.height!==1080 ||
       !audio || audio.channels!==2 || Math.abs(Number(audio.duration)-frames/fps)>.05)
      throw Error('Encoded duration, frame count, dimensions or stereo mix disagrees with the film clock.');
    fs.renameSync(temporaryFile,dest);
  } finally {
    fs.rmSync(temporaryDir,{recursive:true,force:true});
  }
} else {
  const project=prepareFilm(selected,captions);
  if(mode==='events'){
    fs.writeFileSync('content/events.json',JSON.stringify(project.sounds,null,2)+'\n');
    fs.writeFileSync('content/direction.json',JSON.stringify({camera:selected.sheets.map(s=>s.camera),writing:project.writing},null,2)+'\n');
  } else if(mode==='still'||mode==='proof'){
    const t=mode==='proof'?2.2:Number(args[0]||0);
    fs.writeFileSync(args[1]||'media/'+mode+'.jpg',project.render(t).toBuffer('image/jpeg',94));
  } else if(mode==='frames'){
    fs.mkdirSync('frames',{recursive:true});
    const start=Number(args[0]||0),end=Number(args[1]||frames);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>frames||end<=start)throw Error('Invalid half-open frame range.');
    for(let i=start;i<end;i++){
      fs.writeFileSync(frameName(i),project.render(i/fps).toBuffer('image/jpeg',93));
      if((i-start)%240===0)console.log('Frame',i,'of',end);
    }
  } else throw Error('Use proof, still, events, frames, or encode.');
}
