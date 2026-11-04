// Offline WebGL renderer process; interactive review uses the user's browser.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {loadImage} from '@napi-rs/canvas';
import {diagnosticModel,validateModel} from './model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let browser,server,page;
export function validateScene(plan,assets){
  for(const shot of plan.shots){
    if(shot.proof)continue;
    if(!shot.assembly?.file||!assets.has(shot.assembly.file))throw Error(`Shot ${shot.id}: declare assembly.file as a hash-pinned JSON asset`);
    validateModel(assets.get(shot.assembly.file));
  }
}
export async function checkEnvironment(){
  if(!fs.existsSync(chromium.executablePath()))throw Error('3D render engine missing. Run npm run setup-renderer (Linux CI: npx playwright install --no-shell --with-deps chromium).');
}
async function boot(){
  await checkEnvironment();
  server=http.createServer((req,res)=>{
    try{
      if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><script type="module" src="/lib/assembly.mjs"></script>');return;}
      const filename=fs.realpathSync(path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname)));
      if(!filename.startsWith(root+path.sep)||!['.mjs','.js'].includes(path.extname(filename)))throw Error('Unsupported renderer resource');
      res.setHeader('Content-Type','text/javascript');fs.createReadStream(filename).pipe(res);
    }catch{res.statusCode=404;res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    browser=await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>typeof window.renderAssembly==='function');
  }catch(e){await dispose();throw e;}
}
export async function drawStyle(c,s){
  const model=s.shot.proof?diagnosticModel():s.assets.get(s.shot.assembly?.file);
  if(!model)throw Error('Shot needs assembly.file pointing to a hash-pinned JSON asset');
  validateModel(model);if(!page)await boot();
  const w=s.plan.width,h=s.plan.height;
  const result=await page.evaluate(data=>window.renderAssembly(data),{model,progress:s.progress,width:w,height:h,camera:s.shot.assembly?.camera});
  c.drawImage(await loadImage(Buffer.from(result.image,'base64')),0,0,w,h);
  c.textAlign='left';c.textBaseline='middle';c.lineWidth=Math.max(1,w/900);
  const labels=result.labels.sort((a,b)=>a.y-b.y),lastY={left:h*.16,right:h*.16};
  for(const label of labels){
    const y=Math.max(lastY[label.side]+h*.07,Math.min(h*.73,label.y));if(y>h*.78)continue;lastY[label.side]=y;
    // An anchor crossing screen center must never flip its annotation rail.
    const right=label.side==='right',x=right?w*.79:w*.04,edge=right?x-8:x+w*.18;
    c.strokeStyle='#ee8b49';c.beginPath();c.moveTo(label.x,label.y);c.lineTo(edge,y);c.stroke();
    c.fillStyle='#ee8b49';c.beginPath();c.arc(label.x,label.y,Math.max(2,w*.003),0,Math.PI*2);c.fill();
    c.font=`${Math.round(w*.014)}px "JetBrains Mono"`;c.fillStyle='#f5efdf';c.fillText(label.text,x,y);
  }
  c.fillStyle='#9aa6b8';c.font=`${Math.round(w*.014)}px "Inter"`;
  if(model.illustrative)c.fillText('ILLUSTRATIVE GEOMETRY',w*.04,h*.08);
}
export async function dispose(){const b=browser;browser=page=null;if(b)await b.close();const s=server;server=null;if(s)await new Promise(resolve=>s.close(resolve));}
