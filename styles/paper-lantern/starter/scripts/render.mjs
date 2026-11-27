import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const [mode='still',arg='1',dest]=process.argv.slice(2);
const timeline=JSON.parse(fs.readFileSync('timeline.json'));
if(!['proof','still','build'].includes(mode))throw Error('Expected proof, still, or build');
if(mode==='build'&&(!timeline.duration||!fs.existsSync('audio/mix.wav')))throw Error('Author the timeline and mix audio/mix.wav first.');
const width=Number(process.env.RENDER_WIDTH||1920);
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const opts={headless:true,args:['--enable-gpu','--ignore-gpu-blocklist','--use-gl=angle',...(process.platform==='darwin'?['--use-angle=metal']:[])]};
 if(process.env.LIGHTBOX_CHROMIUM)opts.executablePath=process.env.LIGHTBOX_CHROMIUM;
 else if(fs.existsSync(chromium.executablePath()))opts.executablePath=chromium.executablePath();
 browser=await chromium.launch(opts);const page=await browser.newPage();
 page.on('pageerror',err=>console.error(err));page.on('console',msg=>{if(msg.type()==='error')console.error(msg.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?w='+width+'&ssaa='+(process.env.SSAA||1)+(mode==='proof'?'&proof':''));
 await page.waitForFunction(()=>window.READY,null,{timeout:90000});
 const folder=mode==='build'?fs.mkdtempSync(path.join(os.tmpdir(),'lightbox-')):null;
 const count=mode==='build'?Math.round(timeline.duration*30):1;fs.mkdirSync('media',{recursive:true});
 for(let i=0;i<count;i++){
   const t=mode==='build'?i/30:Number(arg);
   const jpg=await page.evaluate(t=>{window.renderTime(t);return document.querySelector('#view').toDataURL('image/jpeg',.97).split(',')[1];},t);
   fs.writeFileSync(folder?path.join(folder,String(i).padStart(5,'0')+'.jpg'):(dest||'media/'+mode+'.jpg'),Buffer.from(jpg,'base64'));
   if(folder&&i%150===0)console.log(i+'/'+count);
 }
 if(folder){
   const out=dest||'media/film.mp4';
   const enc=spawnSync(process.env.PYTHON||'python3',['scripts/ffmpeg_serial.py','--','-loglevel','error','-y','-framerate','30','-i',folder+'/%05d.jpg','-i','audio/mix.wav','-map','0:v','-map','1:a','-c:v','libx264','-crf','17','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-ar','48000','-movflags','+faststart',out],{stdio:'inherit'});if(enc.status!==0)throw Error('Encode failed. Frames retained in '+folder);fs.rmSync(folder,{recursive:true,force:true});console.log(out);
 }
}finally{await browser?.close();server.closeAllConnections();server.close();}
