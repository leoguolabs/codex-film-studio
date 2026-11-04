// Independent 16:9 composition helpers. Action geometry stays in its local
// coordinates; cameras are uniform transforms, while UI is placed on this stage.
import {INK,clamp,lerp,smooth,hash,line,rr,oval,path,text,fitText,transformed,burst,spark} from './primitives.mjs';
import {palettes,materialPass} from './materials.mjs';
import {hero} from './characters.mjs';
export const LW=960,LH=540;
export function landscapeCamera(m,{replay=false}={}){
 if(replay)return m==='ink'?{x:480,y:280,scale:1.3,focusX:310,focusY:550}:{x:480,y:290,scale:1.2,focusX:300,focusY:560};
 if(m==='blueprint')return {x:530,y:270,scale:1.18,focusX:355,focusY:550};
 if(m==='swiss')return {x:520,y:290,scale:.98,focusX:270,focusY:550};
 if(m==='ink')return {x:485,y:282,scale:1.05,focusX:280,focusY:550};
 return {x:480,y:280,scale:1.05,focusX:280,focusY:550};
}
export const projectPoint=(c,x,y)=>[c.x+(x-c.focusX)*c.scale,c.y+(y-c.focusY)*c.scale];
export function wideCommand(g,s,t,hold=.65){
 const u=smooth((t-hold)/.22),sc=lerp(t<.1?lerp(1.5,.94,t/.1):1,.38,u);
 transformed(g,lerp(480,132,u),lerp(188,50,u),sc,-.07,()=>{if(u<.99)burst(g,0,0,310,77,'#ffc928',0,13);fitText(g,s,4,6,570,76,'#ff2e88',INK);fitText(g,s,0,0,570,76,'#fff',INK)});
}
export function wideFuse(g,progress,beats,t){
 const x=525,y=505,len=360,p=x+len*clamp(progress);
 line(g,[[p,y],[x+len,y]],'#2c1832',7);line(g,[[p,y-1],[x+len,y-1]],'#d7aa70',4);
 for(let i=0;i<=Math.ceil(beats);i++){let q=x+len*i/beats;if(q<=x+len&&q>=p)oval(g,q,y,3,3,'#c39359','#35283c',1.4)}
 g.save();g.setLineDash([1,3]);line(g,[[x,y],[p,y]],'#777067',1.5);g.restore();spark(g,p,y,t);
 transformed(g,x+len+13,y,1,-.23,()=>{rr(g,-9,-17,18,33,3,'#ff3b3b',INK,3);path(g,[[-11,-17],[0,-29],[11,-17]],'#ffc928',INK,2)});
}
export function wideReplay(g,seconds){
 const cs=Math.max(0,Math.floor(seconds*100)),pad=x=>String(x).padStart(2,'0');
 g.fillStyle='#101010';g.fillRect(0,0,LW,48);g.fillRect(0,512,LW,28);
 text(g,'instant replay',28,24,24,'white',null,0,'Arial','left');oval(g,206,24,6,6,'#df1831',null);
 text(g,`0.5×  ◀◀  ${pad(Math.floor(cs/6000))}:${pad(Math.floor(cs/100)%60)}.${pad(cs%100)}`,928,24,17,'white',null,0,'Arial','right');
}
export function createWideMaterial({createCanvas,cache}){
 function texture(m){
  const key=`wide-paper-${m}`;if(cache.has(key))return cache.get(key);
  const c=createCanvas(LW,LH),q=c.getContext('2d');
  for(let i=0;i<15000;i++){q.fillStyle=m==='blueprint'?(i%2?'#cedced08':'#0b173b0a'):(i%2?'#4a392310':'#ffffff22');q.fillRect(hash(i*11)*LW,hash(i*7)*LH,.5+hash(i)*1.5,.7+hash(i*3)*1.5)}
  cache.set(key,c);return c;
 }
 function background(g,m,camera){
  const p=palettes[m];g.fillStyle=p.paper;g.fillRect(0,0,LW,LH);
  if(m==='terminal'){
   const grad=g.createRadialGradient(480,270,10,480,270,650);grad.addColorStop(0,'#241709');grad.addColorStop(1,'#050301');g.fillStyle=grad;g.fillRect(0,0,LW,LH);
   rr(g,28,104,904,370,2,null,p.ink,1.5);text(g,'SYSTEM / READY',36,82,17,p.ink,null,0,'monospace','left');text(g,'[ ONE ACTION ]',922,82,15,p.ink,null,0,'monospace','right');
  }else if(m==='blueprint'){
   g.drawImage(texture(m),0,0);for(let x=0;x<LW;x+=18)line(g,[[x,0],[x,LH]],x%90===0?'#9dbde11a':'#9dbde10a',.6);
   for(let y=0;y<LH;y+=18)line(g,[[0,y],[LW,y]],y%90===0?'#9dbde11a':'#9dbde10a',.6);
  }else if(m==='swiss'){
   for(let x=28;x<LW;x+=39)line(g,[[x,96],[x,477]],'#c6c4bc',.6);
   for(let y=96;y<480;y+=39)line(g,[[28,y],[932,y]],'#c6c4bc',.6);
  }else if(m==='pixel'){
   g.fillStyle='#101025';g.fillRect(0,0,LW,LH);const cell=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x*4,y*4,w*4,h*4)};
   for(let i=0;i<160;i++)cell(Math.floor(hash(i*17)*240),Math.floor(15+hash(i*31)*92),1,1,i%5?'#424782':'#fffaf0');
   for(let y=-19;y<=19;y++)for(let x=-19;x<=19;x++)if(x*x+y*y<361){let v=x*.7+y*.3,c=v>5?'#424782':'#777db8';if(v>3&&v<7&&((x+y)&1))c='#777db8';if(y>-9&&y<-4&&x+y*.7<-1)c='#b4b7dc';if(y>-7&&y<-5&&x+y*.7<-3)c='#fffaf0';if(y>7&&y<10&&x+y*.7<7)c='#b4b7dc';cell(192+x,49+y,1,1,c)}
   const floor=Math.round(projectPoint(camera,0,720)[1]/4);
   for(let col=0;col<240;col++){let top=col>=50&&col<=180?floor:floor-Math.round(2+Math.sin(col*.16)*2);cell(col,top,1,135-top,'#6b667f');cell(col,top,1,1,'#b4b7dc');for(let row=1;row<7;row++)if(((col+row)&1)===0)cell(col,top+row,1,1,row<3?'#a7a0a1':'#777db8')}
   for(let i=0;i<50;i++)cell(Math.floor(hash(i*19)*240),floor+9+Math.floor(hash(i*29)*15),2+i%4,1,i%3?'#424782':'#a7a0a1');
  }else{
   g.drawImage(texture(m),0,0);
   if(m==='riso'){for(let x of [105,850])line(g,[[x,0],[x,477]],p.ink,2);for(let [x,y,r]of [[30,190,100],[940,205,105]]){oval(g,x,y,r,r,'#187fa5',null);oval(g,x+13,y+13,r*.67,r*.67,'#65a55b',null);oval(g,x+20,y+9,r*.61,r*.61,'#ee648a',null)}}
  }
 }
 function finish(g,m){
  if(m==='terminal'){g.fillStyle='#0003';for(let y=0;y<LH;y+=4)g.fillRect(0,y,LW,1)}
  if(m==='woodcut'){g.save();g.globalAlpha=.16;for(let y=110;y<475;y+=5)line(g,[[20,y],[940,y-10]],'#efe2b9',1);g.restore()}
  materialPass(g,m,cache,{width:LW,height:LH});
 }
 return {background,finish};
}
export function wideAnnotations(g,s,t,film,camera){
 const p=palettes[s.medium],dur=(s.end-s.start)/30;
 if(s.medium==='swiss'){
  const title=s.command.replace(/[!.]+$/,'').toLowerCase()+'.';
  g.font='900 68px Arial';g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle=p.ink;g.fillText(title,34,153);
  const rules={roll:'move the pin across.',cut:'hand to blade.',carry:'hold it steady.',jump:'clear the obstacle.',catch:'meet the falling object.'};
  text(g,`rule ${s.game} / ${rules[s.action]||'one clear move.'}`,36,182,15,p.ink,null,0,'Arial','left');
 }
 if(s.medium!=='blueprint')return;
 const label=(v,x,y,size=13,align='left')=>text(g,v,x,y,size,p.ink,null,0,'Architects Daughter',align);
 const lead=(v,x,y,point)=>{label(v,x,y);const right=x>camera.x;line(g,[[right?x+70:x,y+10],[right?x-24:x+75,y+10],point],p.ink,.8);oval(g,...point,2,2,p.ink,null)};
 const titles={press:'COMPRESSION ASSEMBLY',dial:'CONTROL ASSEMBLY',align:'ALIGNMENT STUDY'},rules={press:'LOWER TO CONTACT',dial:'TURN TO THE MARK',align:'BRING ALL THREE TO AXIS'};
 label(titles[s.action]||'MOTION STUDY',65,112,21);label(rules[s.action]||'ONE CONTROLLED MOVE',65,140,13);
 hero(g,'blueprint',112,436,.52,{arm:.4},film.hero);label('OPERATOR / A',65,472,12);
 if(s.action==='press'){
  let a=smooth((clamp(Math.floor(t*s.character_fps)/s.character_fps/dur)-.28)/.42),travel=a<.85?smooth(a/.65):lerp(1,.25,(a-.85)/.15),compression=1-(s.object==='dough'?.25:.18)*smooth((a-.65)/.15),end=684-(s.object==='dough'?52:89.7)*compression-17,platen=lerp(476,end,travel);
  lead('GUIDE / A',742,208,projectPoint(camera,449,470));lead('PLATEN',742,326,projectPoint(camera,414,platen+5));lead('TRAVEL',220,266,projectPoint(camera,261,555));
 }else if(s.action==='dial'){
  lead('INDEX / 01',741,211,projectPoint(camera,410,458));lead(s.object==='sprinkler'?'OUTLET':'CHAMBER',741,338,projectPoint(camera,410,620));
 }else{
  lead('CENTRE LINE',742,202,projectPoint(camera,355,465));for(let i=0;i<3;i++){const pt=projectPoint(camera,255,475+i*95);label(String(i+1).padStart(2,'0'),pt[0]-45,pt[1],17);line(g,[[pt[0]-14,pt[1]],[pt[0]+15,pt[1]]],p.ink,.65)}
 }
 const railX=698;line(g,[[railX,159],[railX,443]],'#e1eff680',.65);for(let i=0;i<7;i++){let y=170+i*43;line(g,[[railX-5,y],[railX+5,y]],p.ink,.65);label(String(7-i),railX+12,y,11)}
 rr(g,738,421,190,53,0,null,p.ink,.8);line(g,[[738,447],[928,447]],p.ink,.6);label(`DWG ${s.command.replace(/[!.]/g,'')}-${String(s.game).padStart(2,'0')}`,747,435,12);label('DETAIL A / 2:1',747,461,11);label('mm',919,461,11,'right');
 if(t/dur>.76){rr(g,225,425,58,36,1,null,p.accent,1.5);text(g,'OK',254,443,23,p.accent,null,0,'monospace')}
}
export function wideCollage(g,{createCanvas,cache,time=0,garden=false}){
 let c=cache.get('wide-collage');if(!c){c=createCanvas(LW,LH);let q=c.getContext('2d');q.fillStyle='#faedbd';q.fillRect(0,0,LW,LH);
  for(let [j,col]of ['#e9508c','#f17a78','#f7ad43','#f6d846'].entries()){let top=j*113-12,bottom=(j+1)*113+16,pts=[];for(let x=-8;x<=LW+8;x+=8)pts.push([x,top+Math.sin(x*.017+j)*10]);for(let x=LW+8;x>=-8;x-=8)pts.push([x,bottom+Math.sin(x*.013+j)*13]);path(q,pts,col,null)}
  q.save();q.translate(480,270);q.rotate(-.17);for(let y=-450;y<450;y+=3)for(let x=-650;x<650;x+=3){q.fillStyle=(Math.round(y/3)&1)?'#fff6d7d0':'#fff6d790';q.fillRect(x+(Math.round(y/3)&1?1.5:0),y,.85+hash(x+y)*.5,1)}q.restore();cache.set('wide-collage',c)}g.drawImage(c,0,0);
 oval(g,garden?160:803,235,95,95,'#ee713b',null);
 if(garden){for(let i=0;i<3;i++){const x=[170,495,860][i]+Math.sin(time*.2+i)*10,y=[115,68,310][i];path(g,[[x-55,y],[x-35,y-16],[x+12,y-20],[x+56,y-4],[x+40,y+15],[x-22,y+11]],'#f9f3dc',null)}}
 else {path(g,[[76,448],[76,218],[104,168],[160,150],[217,169],[247,216],[247,448]],'#fceabb','#c43f68',3);path(g,[[91,448],[91,222],[117,184],[160,171],[205,188],[232,226],[232,448]],'#f5b74f',null);line(g,[[162,174],[162,448]],'#fff3d4',5);line(g,[[91,296],[230,296]],'#fff3d4',5)}
 g.fillStyle=garden?'#397d91':'#427c9a';g.fillRect(0,454,LW,86);for(let i=-10;i<26;i++){let b=i*65;line(g,[[480+(b-480)*.17,454],[b,540]],'#f5eed2',1.3)}for(let i=0;i<9;i++)line(g,[[0,456+i*i*1.3],[LW,456+i*i*1.3]],i%2?'#f2ecd2':'#192d5f',1.2);
}
