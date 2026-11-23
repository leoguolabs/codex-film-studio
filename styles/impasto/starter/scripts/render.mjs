import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import {once} from 'node:events';
import {chromium} from 'playwright-core';

const [mode='proof',at='0',file='still.png']=process.argv.slice(2);
if (!['still','proof','picture'].includes(mode)) throw Error('Choose still, proof or picture');
const root=process.cwd();
const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  if(!rel) {res.setHeader('Content-Type','text/html');return res.end('<meta charset="utf-8"><canvas></canvas>');}
  const source=path.resolve(root,rel);
  if(!source.startsWith(root+path.sep)||!fs.existsSync(source)||!fs.statSync(source).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.json')?'application/json':'application/octet-stream');
  fs.createReadStream(source).pipe(res);
});
server.listen(0,'127.0.0.1');await once(server,'listening');
let browser,handle;
const output=process.env.IMPASTO_PICTURE||'picture.h264';
try {
  const cached=path.join(process.env.HOME||'','Library/Caches/ms-playwright');
  const installed=fs.existsSync(cached)?fs.readdirSync(cached).filter(x=>/^chromium-\d+$/.test(x)).sort((a,b)=>Number(b.split('-')[1])-Number(a.split('-')[1])).map(x=>path.join(cached,x,'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')).find(fs.existsSync):null;
  const executablePath=process.env.IMPASTO_CHROMIUM||[chromium.executablePath(),installed].find(p=>p&&fs.existsSync(p));
  browser=await chromium.launch({executablePath,headless:true,args:['--enable-gpu','--ignore-gpu-blocklist',...(process.platform==='darwin'?['--use-angle=metal']:[]),'--disable-background-timer-throttling']});
  const page=await browser.newPage();
  page.on('console',m=>{if(['log','error'].includes(m.type()))console.log(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async mode=>{
    const {Stage,rect,oval}=await import('/src/stage.js');
    const canvas=document.querySelector('canvas'),stage=new Stage(canvas);
    let render;
    if(mode==='proof'){
      const p=stage.plate(1280,720,r=>{
        r.fill(rect(0,0,1280,720),'#597785',{dir:5});
        r.fill(oval(680,350,250,185),'#de864f',{dir:{radial:[680,350],off:90}});
      },{seed:13});render=()=>stage.paint(p);
    }else{
      const film=await import('/src/film.js');window.framesToEncode=Math.round(film.duration*24);
      if(!(window.framesToEncode>0))throw Error('Author duration in seconds');
      render=await film.setup(stage);
    }
    window.drawFrame=t=>{stage.begin();render(t);stage.finish();};
    window.pictureCanvas=canvas;
  },mode);
  if(mode!=='picture'){
    const data=await page.evaluate(t=>{window.drawFrame(t);return window.pictureCanvas.toDataURL('image/png').split(',')[1];},Number(at));
    fs.writeFileSync(mode==='proof'?'proof.png':file,Buffer.from(data,'base64'));
  }else{
    handle=await fs.promises.open(output+'.partial','w');
    await page.exposeFunction('appendVideo',async base64=>{await handle.writeFile(Buffer.from(base64,'base64'));});
    await page.evaluate(async limit=>{
      const n=limit>0?Math.min(limit,window.framesToEncode):window.framesToEncode;
      const cfg={codec:'avc1.640028',width:1280,height:720,bitrate:14_000_000,framerate:24,latencyMode:'realtime',avc:{format:'annexb'}};
      if(!(await VideoEncoder.isConfigSupported(cfg)).supported)throw Error('H.264 WebCodecs encoder unavailable in this compiler');
      let chunks=[],error;
      const enc=new VideoEncoder({output:c=>{const out=new Uint8Array(c.byteLength);c.copyTo(out);chunks.push(out);},error:e=>{error=e;}});
      enc.configure(cfg);
      async function send(){
        await enc.flush();if(error)throw error;
        const encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(new Blob(chunks));});
        chunks=[];await window.appendVideo(encoded);
      }
      for(let i=0;i<n;i++){
        window.drawFrame(i/24);
        const f=new VideoFrame(window.pictureCanvas,{timestamp:Math.round(i*1e6/24),duration:Math.round(1e6/24)});
        enc.encode(f,{keyFrame:i%48===0});f.close();
        if((i+1)%48===0||i+1===n){await send();if((i+1)%240===0||i+1===n)console.log('frames '+(i+1)+'/'+n);}
      }
      enc.close();
    },Number(process.env.IMPASTO_FRAME_LIMIT||0));
    await handle.close();handle=null;fs.renameSync(output+'.partial',output);
  }
}finally{if(handle)await handle.close();if(browser)await browser.close();server.close();}
