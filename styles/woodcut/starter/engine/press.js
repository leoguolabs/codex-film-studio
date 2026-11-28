// Physical press tools adapted from LemoLab, MIT. See LICENSE-MIT.txt.
import {canvas} from './index.js';
import {curl,peelState} from './curl.js';
import {clamp,seg,eio,eo} from './math.js';
const W=1920,H=1080,PI=Math.PI;
const [back,backG]=canvas(),[ghost,ghostG]=canvas(),[pressure,pg]=canvas();
function baren(tg, x, y, rot) {
  tg.save(); tg.translate(x, y);
  tg.fillStyle = 'rgba(0,0,0,.35)'; tg.filter = 'blur(14px)'; tg.beginPath(); tg.ellipse(18, 22, 118, 112, 0, 0, PI * 2); tg.fill(); tg.filter = 'none';
  const gr = tg.createRadialGradient(-30, -30, 10, 0, 0, 120); gr.addColorStop(0, '#6b5238'); gr.addColorStop(.8, '#3b2a1a'); gr.addColorStop(1, '#22170e');
  tg.fillStyle = gr; tg.beginPath(); tg.arc(0, 0, 112, 0, PI * 2); tg.fill();
  tg.rotate(rot); tg.strokeStyle = 'rgba(255,230,190,.12)'; tg.lineWidth = 2;
  for (let i = 0; i < 6; i++) { tg.beginPath(); tg.arc(0, 0, 18 + i * 16, 0, PI * 1.6); tg.stroke(); }
  tg.fillStyle = '#2a1d12'; tg.fillRect(-16, -128, 32, 60);    // the knot of the sheath
  tg.restore();
}
function brayer(tg, x) {
  tg.save();
  tg.fillStyle = 'rgba(0,0,0,.45)'; tg.filter = 'blur(16px)'; tg.fillRect(x + 30, 30, 70, H - 40); tg.filter = 'none';
  const gr = tg.createLinearGradient(x - 38, 0, x + 38, 0);
  gr.addColorStop(0, '#050505'); gr.addColorStop(.35, '#3a3a3a'); gr.addColorStop(.5, '#8d8d8d'); gr.addColorStop(.62, '#2a2a2a'); gr.addColorStop(1, '#040404');
  tg.fillStyle = gr; tg.fillRect(x - 38, 16, 76, H - 60);
  tg.fillStyle = '#5a3d22'; tg.fillRect(x - 10, -40, 20, 70); tg.fillRect(x - 46, 6, 92, 14);
  tg.restore();
}
// An impression is reversed on the block. Paper takes its readable orientation during the pull.
export function pullImpression(g,block,impression,progress,table=null){
 const u=clamp(progress);
 if(u>=1){g.drawImage(impression,0,0);return}
 const rub=seg(u,.45,.75);
 const spiral=v=>{const a=v*Math.PI*4.7-.9,k=1-.8*v;return [960+745*k*Math.cos(a),520+392*k*Math.sin(a)]};
 const [bx,by]=spiral(rub);
 backG.fillStyle='#efe8d8';backG.fillRect(0,0,W,H);
 ghostG.clearRect(0,0,W,H);ghostG.save();ghostG.translate(W,0);ghostG.scale(-1,1);ghostG.drawImage(impression,0,0);ghostG.restore();
 pg.clearRect(0,0,W,H);pg.fillStyle='rgba(0,0,0,.22)';pg.fillRect(0,0,W,H);
 for(let i=0;i<Math.floor(rub*70);i++){
  const [x,y]=spiral(i/70),rad=175;const stain=pg.createRadialGradient(x,y,0,x,y,rad);
  stain.addColorStop(0,'rgba(0,0,0,.28)');stain.addColorStop(1,'rgba(0,0,0,0)');
  pg.fillStyle=stain;pg.fillRect(x-rad,y-rad,2*rad,2*rad);
 }
 ghostG.globalCompositeOperation='destination-in';ghostG.drawImage(pressure,0,0);ghostG.globalCompositeOperation='source-over';
 backG.save();backG.globalAlpha=.63;backG.globalCompositeOperation='multiply';backG.drawImage(ghost,0,0);backG.restore();
 if(u<.75){
  g.drawImage(block,0,0);
  if(u<.29){brayer(g,-60+2040*seg(u,0,.27));return}
  const h=H*eo(seg(u,.29,.45));g.save();g.beginPath();g.rect(0,0,W,h);g.clip();g.drawImage(back,0,0);g.restore();
  if(h<H){const shadow=g.createLinearGradient(0,h,0,h+65);shadow.addColorStop(0,'rgba(0,0,0,.43)');shadow.addColorStop(1,'transparent');g.fillStyle=shadow;g.fillRect(0,h,W,65);}
  if(u>=.45)baren(g,bx,by,rub*12);
  return;
 }
 const v=seg(u,.75,1),offX=W*eio(seg(v,.10,1)),{xf,r}=peelState(v,222);
 g.fillStyle='#211e19';g.fillRect(0,0,W,H);
 if(table){g.save();g.filter='brightness(.25) saturate(.65)';g.drawImage(table,offX-W,0,W,H);g.restore();}
 g.drawImage(block,offX,0);
 curl(g,back,impression,xf,r,{offX,F:1900});
}
