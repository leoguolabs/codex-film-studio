import {chromium} from 'playwright-core';
import http from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
const target=path.resolve(args[0]||'frames');
const selection=args[1]; // comma-separated zero-based frame indices, or all
await mkdir(target,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 try{
   if(req.method==='POST'&&/^\/frame\/\d+$/.test(req.url)){
     const n=Number(req.url.slice(7)), chunks=[];for await(const c of req)chunks.push(c);
     await writeFile(path.join(target,String(n).padStart(5,'0')+'.jpg'),Buffer.concat(chunks));res.end('ok');return;
   }
   const p=path.resolve(root,'.'+(req.url==='/'?'/index.html':decodeURIComponent(req.url)));
   if(!p.startsWith(root.endsWith(path.sep)?root:root+path.sep)||!(await stat(p)).isFile()){res.writeHead(404).end();return}
   res.setHeader('Content-Type',types[path.extname(p)]||'application/octet-stream');createReadStream(p).pipe(res);
 }catch{res.writeHead(404).end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.WOODCUT_CHROMIUM||chromium.executablePath(),headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
 const page=await browser.newPage();page.on('pageerror',e=>console.error(e));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 const total=await page.evaluate(()=>window.filmFrames);
 if(total<=0)throw Error('Author film.js and measured cues first');
 const frames=selection&&selection!=='all'?selection.split(',').map(Number):Array.from({length:total},(_,i)=>i);
 for(const i of frames){
   if(!Number.isInteger(i)||i<0||i>=total)throw Error('Invalid frame '+i);
   await page.evaluate(async n=>{
     window.drawFrame(n);
     const blob=await new Promise(ok=>document.querySelector('canvas').toBlob(ok,'image/jpeg',0.97));
     const r=await fetch('/frame/'+n,{method:'POST',body:blob});if(!r.ok)throw Error('Frame write failed');
   },i);
   if(i%120===0)console.log('Frame',i,'of',total);
 }
}finally{await browser?.close();server.closeAllConnections();server.close()}
