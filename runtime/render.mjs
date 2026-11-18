import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createCanvas, loadImage, GlobalFonts} from '@napi-rs/canvas';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function assetPath(file) {
  if (typeof file !== 'string' || path.isAbsolute(file)) throw Error('Asset paths must be project-relative');
  const target = fs.realpathSync(path.resolve(ROOT, file));
  if (!target.startsWith(ROOT + path.sep)) throw Error(`Asset escapes project: ${file}`);
  return target;
}
export function checkedAsset(record) {
  const file = assetPath(record.file);
  if (!/^[0-9a-f]{64}$/.test(record.sha256 || '') || hash(fs.readFileSync(file)) !== record.sha256)
    throw Error(`Missing or changed asset hash: ${record.file}`);
  return file;
}
export function validate(plan) {
  for (const key of ['width', 'height', 'fps', 'duration_frames'])
    if (!Number.isSafeInteger(plan[key]) || plan[key] <= 0) throw Error(`Positive integer required: ${key}`);
  if (plan.width % 2 || plan.height % 2) throw Error('H.264 requires even dimensions');
  if (!plan.shots?.length) throw Error('Author shots in content/production.json; --proof is diagnostic only');
  let cursor = 0;
  const ids = new Set();
  for (const s of plan.shots) {
    if (!s.id || ids.has(s.id) || s.start !== cursor || !Number.isSafeInteger(s.end) || s.end <= s.start)
      throw Error('Shots require unique IDs and contiguous integer [start,end) ranges');
    ids.add(s.id); cursor = s.end;
  }
  if (cursor !== plan.duration_frames) throw Error('Shots do not cover duration_frames');
  let end = 0;
  for (const c of plan.captions || []) {
    if (!c.text || !Number.isSafeInteger(c.start) || !Number.isSafeInteger(c.end) ||
        c.start < end || c.end <= c.start || c.end > cursor) throw Error('Invalid caption interval');
    end = c.end;
  }
}
export function proofPlan(profile) {
  return {schema_version: 1, width: profile.width, height: profile.height, fps: 24,
    duration_frames: 48, silent: true, assets: [], audio: [], captions: [],
    shots: [{id:'material-proof',start:0,end:48,layers:[],proof:true}]};
}
export async function main() {
  const args = process.argv.slice(2);
  const arg = (name, fallback) => args.includes(name) ? args[args.indexOf(name)+1] : fallback;
  const profile = JSON.parse(fs.readFileSync(path.join(ROOT, 'style-profile.json')));
  const plan = args.includes('--proof') ? proofPlan(profile) : JSON.parse(fs.readFileSync(path.join(ROOT,'content/production.json')));
  validate(plan);
  const fonts = JSON.parse(fs.readFileSync(path.join(ROOT,'fonts/manifest.json')));
  for (const f of fonts) {
    assetPath(f.license);
    if (!GlobalFonts.registerFromPath(checkedAsset(f), f.family)) throw Error(`Font failed: ${f.file}`);
  }
  const materialManifest = path.join(ROOT,'materials/manifest.json');
  if (fs.existsSync(materialManifest))
    for (const material of JSON.parse(fs.readFileSync(materialManifest))) checkedAsset(material);
  const assets = new Map();
  for (const a of plan.assets || []) {
    const file=checkedAsset(a);
    if(a.type==='json') assets.set(a.file,JSON.parse(fs.readFileSync(file,'utf8')));
    else if(!a.type||a.type==='image') assets.set(a.file,await loadImage(file));
    else throw Error(`Unsupported asset type: ${a.type}`);
  }
  const {drawFrame} = await import(pathToFileURL(path.join(ROOT,'src/scene.mjs')));
  if (typeof drawFrame !== 'function') throw Error('src/scene.mjs must export drawFrame');
  if (args.includes('--check')) {
    console.log('Timeline, font hashes, source imports and image hashes valid');
    return;
  }
  const width = Number(arg('--width',plan.width));
  const height = Math.round(width*plan.height/plan.width/2)*2;
  if (!Number.isSafeInteger(width) || width<2 || width%2 || height<2) throw Error('Output width must be a positive even integer');
  // Render in the authored coordinate system. Material engines may inspect the
  // context matrix; output scaling must not become part of that scene camera.
  const canvas = createCanvas(plan.width,plan.height), ctx = canvas.getContext('2d');
  const delivery = createCanvas(width,height), deliveryContext = delivery.getContext('2d');
  const single = args.includes('--frame');
  const start = Number(arg(single?'--frame':'--start',0));
  const end = single ? start+1 : Number(arg('--end',plan.duration_frames));
  if (![start,end].every(Number.isSafeInteger) || start<0 || end<=start || end>plan.duration_frames) throw Error('Invalid frame range');
  const output = path.resolve(ROOT,arg('--out',single?'review/still.png':'media/frames'));
  if (single ? fs.existsSync(output) : fs.existsSync(output) && fs.readdirSync(output).length) throw Error(`Output exists: ${output}`);
  fs.mkdirSync(single?path.dirname(output):output,{recursive:true});
  for (let frame=start;frame<end;frame++) {
    const shot = plan.shots.find(s=>frame>=s.start&&frame<s.end);
    ctx.resetTransform(); ctx.clearRect(0,0,plan.width,plan.height);
    ctx.save();
    try {
    ctx.fillStyle=profile.background;ctx.fillRect(0,0,plan.width,plan.height);
    await drawFrame(ctx,{frame,localFrame:frame-shot.start,progress:(frame-shot.start)/Math.max(1,shot.end-shot.start-1),
      seconds:frame/plan.fps,shot,plan,profile,assets,canvas,createCanvas});
    ctx.resetTransform();
    const caption=(plan.captions||[]).find(c=>frame>=c.start&&frame<c.end);
    if (caption) drawCaption(ctx,caption.text,plan,profile);
    if (shot.proof) {
      ctx.fillStyle='#101018dd';ctx.fillRect(0,plan.height-52,plan.width,52);
      ctx.fillStyle='#ffffff';ctx.font=`20px "${profile.font}"`;ctx.textAlign='left';
      ctx.fillText(`${profile.id} / MATERIAL PROOF / ${frame}`,24,plan.height-18);
    }
    } finally {ctx.restore();}
    deliveryContext.clearRect(0,0,width,height);
    deliveryContext.drawImage(canvas,0,0,width,height);
    fs.writeFileSync(single?output:path.join(output,`${String(frame-start).padStart(6,'0')}.png`),delivery.toBuffer('image/png'));
  }
  console.log(JSON.stringify({output,start,end,frames:end-start}));
}
export function drawCaption(c,text,plan,profile) {
  const size=Math.round(plan.height*.04),max=plan.width*.86;
  c.font=`${size}px "${profile.font}"`;c.textAlign='center';c.textBaseline='middle';
  const lines=[];let line='';
  // Word wrapping for spaced languages; character fallback for unspaced scripts.
  const words=/\s/.test(text)?text.split(/\s+/):Array.from(text),separator=/\s/.test(text)?' ':'';
  for(const word of words){const next=line?line+separator+word:word;
    if(c.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);
  if(lines.length>3||lines.some(l=>c.measureText(l).width>max))throw Error('Caption does not fit; split the cue');
  const h=lines.length*size*1.3+size,y=plan.height*.94-h;
  c.fillStyle='#11121bea';c.fillRect(plan.width*.05,y,plan.width*.9,h);c.fillStyle='#fff8e8';
  lines.forEach((l,i)=>c.fillText(l,plan.width/2,y+size*(1.1+1.3*i)));
}
