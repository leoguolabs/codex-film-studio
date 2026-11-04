import {W,H,INK,clamp,lerp,smooth,ease,hash,line,rr,oval,path,text,fitText,transformed,star,command,fuse,stamp} from './primitives.mjs';
import {palettes,background,finish,mediumObject,materialPass} from './materials.mjs';
import {hero,localContact} from './characters.mjs';
import {blot,brush} from './brush.mjs';
import {blueprintPressFrame,blueprintNotes} from './blueprint.mjs';
import {terminalMeter,terminalFan} from './terminal.mjs';
export function drawGame(g,s,lt,film,createCanvas,cache,options={}){
 let m=s.medium,p=palettes[m],dur=(s.end-s.start)/30,u=clamp(lt/dur),tick=Math.floor(lt*s.character_fps)/s.character_fps,pu=clamp(tick/dur),a=smooth((pu-.28)/.42),done=u>.76;
 const pressTravel=a<.85?smooth(a/.65):lerp(1,.25,(a-.85)/.15);
 const blueprintCompression=1-(s.object==='dough'?.25:.18)*smooth((a-.65)/.15);
 const pressEnd=m==='blueprint'?684-(s.object==='dough'?52:89.7)*blueprintCompression-17:s.object==='dough'?623:600;
 const pressY=lerp(m==='blueprint'?476:390,pressEnd,pressTravel);
 if(options.background)options.background(g,m);else background(g,m,createCanvas,cache);
 g.save();
 if(m==='terminal'){g.shadowColor='#ffad36';g.shadowBlur=3}
 const sceneZoom=m==='ink'&&['pour','stir'].includes(s.action)?1.8:m==='swiss'?1.15:1.0;
 if(options.camera){
  const c=options.camera;g.translate(c.x,c.y);g.scale(c.scale,c.scale);g.translate(-c.focusX,-c.focusY);
 }else if(m==='blueprint'){
  // Keep the operator in the separate inset and give the working mechanism
  // the dominant technical-detail view, with room for the dimension rail.
  g.translate(282,520);g.scale(1.8,1.8);g.translate(-355,-550);
 }else{g.translate(270,620);g.scale(sceneZoom,sceneZoom);g.translate(-270,-620)}
 let floor=720;const ground=options.groundBounds||{left:0,right:W,depth:60};
 if(m!=='terminal'&&m!=='pixel'&&m!=='blueprint'){g.fillStyle=p.ground;g.fillRect(ground.left,floor,ground.right-ground.left,ground.depth);line(g,[[ground.left,floor],[ground.right,floor]],p.ink,m==='blueprint'?2:4)}
 if(m==='crayon'){for(let i=options.groundBounds?Math.floor(ground.left/10):0;i<(options.groundBounds?Math.ceil(ground.right/10):70);i++)line(g,[[i*10-40,775],[i*10+25,723]],p.paper,2);oval(g,454,300,35,35,p.object,p.ink,2);for(let i=0;i<12;i++){let an=i/12*6.28;line(g,[[454+Math.cos(an)*43,300+Math.sin(an)*43],[454+Math.cos(an)*57,300+Math.sin(an)*57]],p.object,2)}}
 if(m==='ink'){brush(g,[[35,748],[190,741],[350,746],[508,738]],7,27);rr(g,450,290,31,43,2,p.accent,null);text(g,'02',465,312,18,p.paper,null,0,'Titan One')}
 if(m==='woodcut'){for(let i=0;i<7;i++){let xx=i*90;path(g,[[xx-60,717],[xx+25,583],[xx+110,717]],p.ground,p.ink,1);for(let j=0;j<8;j++)line(g,[[xx-30+j*10,704],[xx+25+j*3,620+j*9]],p.paper,1)}}
 // A wide, legible play area. Early poses on 8 fps; camera/UI remain continuous.
 let hx=m==='ink'?180:137,hy=675,hs=1.48,arm=.15+.6*Math.sin(a*Math.PI),lean=.10*Math.sin(a*Math.PI),jump=0;
 if(['jump','carry','collect'].includes(s.action))hx=lerp(110,380,a);
 if(s.action==='jump')jump=Math.sin(a*Math.PI)*183;
 if(s.action==='carry'){hy=690-Math.sin(a*8*Math.PI)*5;lean=.1*Math.sin(a*5)}
 if(s.action==='crack')hx=235;
 if(!s.success&&done){arm=.85;lean=-.15}
 const item=(x,y,scale=1,kind=s.object,rot=0)=>transformed(g,x,y,scale,rot,()=>mediumObject(g,m,0,0,1,kind));
 const bowl=(x=354,y=651)=>{
  if(m==='ink'){
   path(g,[[x-72,y-15],[x+72,y-15],[x+52,y+45],[x-52,y+45]],'#c3c5b7',null);
   brush(g,[[x-72,y-15],[x-52,y+45],[x+52,y+45],[x+72,y-15]],6,210);
   const points=[];for(let i=0;i<=60;i++){let a=i/60*6.28;points.push([x+Math.cos(a)*72,y-15+Math.sin(a)*17])}brush(g,points,4,211);
  }else{path(g,[[x-72,y-15],[x+72,y-15],[x+52,y+45],[x-52,y+45]],p.hero,p.ink,m==='blueprint'?2:4);oval(g,x,y-15,72,17,p.paper,p.ink,3)}
 };
 const bits=(x,y,n,color,spread=70)=>{for(let i=0;i<n;i++){let ang=hash(i*13)*6.28,dd=hash(i*31)*spread;oval(g,x+Math.cos(ang)*dd,y+Math.sin(ang)*dd,2+hash(i)*6,2+hash(i*3)*4,color,p.ink,1)}};
 switch(s.action){
 case 'scoop':
  bowl();oval(g,355,623,48,16,p.paper,p.ink,2);bits(355,617,15,p.object,35);transformed(g,lerp(270,350,a),lerp(490,605,a)+Math.sin(a*Math.PI)*-50,1,-.5+a,()=>{line(g,[[-48,0],[18,0]],p.ink,10);oval(g,35,0,25,12,p.paper,p.ink,3);bits(35,-8,7,p.object,18)});break;
 case 'pour':{
  bowl();let ax=304,ay=456;item(ax,ay,1,s.object,-a*1.35);
  if(a>.15){let streamEnd=lerp(ay+30,634,clamp((a-.15)*3));line(g,[[330,ay+25],[340,streamEnd]],m==='ink'?p.ink:s.object==='icing'?'#f293b8':p.accent,12);bits(340,streamEnd,10,p.object,24)}
  if(!s.success&&a>.62){let sp=smooth((a-.62)/.38);for(let i=0;i<13;i++){let xx=lerp(350,80+i*33,sp),yy=lerp(635,610+Math.sin(i*2)*90,sp);if(m==='ink')blot(g,xx,yy,sp*(20+hash(i)*30),sp*(20+hash(i+8)*20),150+i);else oval(g,xx,yy,sp*(20+hash(i)*30),sp*(20+hash(i+8)*20),p.accent,null)}if(m==='ink')blot(g,350,704,120*sp,20*sp,174);else oval(g,350,704,120*sp,20*sp,p.accent,null)}break;
 }
 case 'meter':{
  if(m==='terminal'){terminalMeter(g,done?.72:.1+.85*Math.abs(Math.sin(a*3.4)),done,p);item(222,609,.6);break}
  rr(g,285,345,160,330,12,p.paper,p.ink,4);for(let i=0;i<11;i++){let y=625-i*24;line(g,[[315,y],[i%5?338:360,y]],p.ink,2)}
  rr(g,376,355,40,296,4,p.ground,p.ink,2);let value=done?.72:.1+.85*Math.abs(Math.sin(a*3.4));g.fillStyle=p.accent;g.fillRect(381,645-value*280,30,value*280);rr(g,369,423,54,29,2,null,p.accent,4);text(g,done?'LOCK':'CHECK',365,320,26,p.ink,null,0,m==='terminal'?'monospace':'Arial');item(222,609,.6);break;
 }
 case 'stir':bowl();item(354,638,.7);transformed(g,355,604,1,Math.sin(a*18)*.55,()=>{line(g,[[0,-132],[0,35]],p.ink,10);line(g,[[-2,-132],[-2,35]],p.object,5)});if(a>.2)for(let i=0;i<6;i++){let ang=a*16+i;oval(g,355+Math.cos(ang)*46,631+Math.sin(ang)*13,4,3,p.accent,null)}break;
 case 'catch':item(365,lerp(342,608,ease(a)),.9,s.object,a*1.8);line(g,[[276,642],[460,642]],p.ink,7);rr(g,305,652,133,40,5,p.hero,p.ink,3);if(done)star(g,435,575,18,p.accent);break;
 case 'press':
  if(m==='blueprint')blueprintPressFrame(g,pressY,p);
  g.save();g.translate(357,m==='blueprint'?684-(s.object==='dough'?26:28.6)*blueprintCompression:658);g.scale(1,m==='blueprint'?blueprintCompression:s.object==='dough'?1-.25*smooth((a-.6)/.15):1);item(0,0,1.3);g.restore();
  transformed(g,355,pressY,1,0,()=>{rr(g,-15,-70,30,66,4,p.hero,p.ink,m==='blueprint'?1:3);rr(g,-62,-10,124,27,4,p.object,p.ink,m==='blueprint'?1.2:4);if(m==='blueprint'){line(g,[[-10,-62],[-10,-17]],p.ink,.6);line(g,[[-55,10],[55,10]],p.ink,.6)}});if(a>.65&&m!=='blueprint')bits(355,680,18,p.object,65);break;
 case 'roll':item(355,666,1.35,'dough');item(355+Math.sin(a*12)*42,633,1.4,'rollingpin');break;
 case 'cut':case 'crack':{
  let split=smooth((a-.55)/.25),kind=s.action==='crack'&&s.object==='seed'?'seedpod':s.object;
  if(a<.62)item(355,647,1.3,kind);else {g.save();g.beginPath();g.rect(250-split*30,550,104,170);g.clip();item(355-split*30,647,1.3,kind);g.restore();g.save();g.beginPath();g.rect(355+split*30,550,150,170);g.clip();item(355+split*30,647,1.3,kind);g.restore()}
  if(kind==='seedpod'&&split>.25)for(let i=0;i<3;i++)item(350+i*6,647+split*(30+i*8),.20,'seed');
  if(s.action==='cut'){let ky=lerp(396,644,clamp(a*1.4));path(g,[[344,ky-90],[364,ky-90],[364,ky+30],[344,ky+12]],p.paper,p.ink,3);rr(g,342,ky-137,24,52,5,p.accent,p.ink,3)}
  if(!s.success&&a>.6){bits(355,640,26,p.object,125*split);item(470+split*70,665+split*105,.45,'crumb',split*6);text(g,'CRUNCH.',350,390,26,p.accent,null,0,'serif')}break;
 }
 case 'collect':
  for(let i=0;i<6;i++){let ix=250+i*40,iy=700;if(a>i/7){ix=lerp(ix,hx+65,smooth((a-i/7)*4));iy=lerp(iy,595,smooth((a-i/7)*4))}item(ix,iy,.28,s.object,i*.8)}item(hx+72,639,.6,'box');break;
 case 'stack':
  for(let i=0;i<4;i++){let pr=clamp(a*4-i);item(362+Math.sin(a*10+i)*3,lerp(300,670-i*55,ease(pr)),.8,s.object);if(pr<.001)break}break;
 case 'fan':
  if(m==='terminal'){
   item(368,640,1.1);transformed(g,310,496,1,Math.sin(a*18)*.35,()=>terminalFan(g,p));
   for(let i=0;i<4;i++)text(g,'~ ~ >',420+15*Math.sin(a*30),480+i*32,20,p.ink,null,0,'monospace');
   break;
  }
  item(368,640,1.1);transformed(g,258,496,1,Math.sin(a*18)*.35,()=>{path(g,[[0,80],[-49,-25],[10,-57],[65,-15]],p.paper,p.ink,3);for(let i=0;i<6;i++)line(g,[[0,80],[-49+i*22,-25-Math.sin(i/5*Math.PI)*30]],p.ink,1) });
  for(let i=0;i<4;i++){let yy=480+i*32;line(g,[[300,yy],[360+20*Math.sin(a*30),yy-10],[440,yy]],p.ink,2)}break;
 case 'jump':item(300,698,.85);break;
 case 'dial':{
  const cy=m==='blueprint'?470:441;
  item(360,m==='blueprint'?610:628,m==='blueprint'?1.3:1.5);
  if(m==='blueprint')line(g,[[355,535],[355,550]],p.ink,1.2);
  oval(g,355,cy,68,68,p.paper,p.ink,m==='blueprint'?1.1:4);for(let i=0;i<11;i++){let an=-2.5+i*.5;line(g,[[355+Math.cos(an)*50,cy+Math.sin(an)*50],[355+Math.cos(an)*59,cy+Math.sin(an)*59]],p.ink,m==='blueprint'?.7:2)}let angle=lerp(-2.5,1.0,a);line(g,[[355,cy],[355+Math.cos(angle)*48,cy+Math.sin(angle)*48]],p.accent,m==='blueprint'?1.8:6);oval(g,355,cy,m==='blueprint'?3:8,m==='blueprint'?3:8,p.ink,null);break;
 }
 case 'fold':{
  let q=smooth(a);path(g,[[285,603],[430,603],[430,696],[285,696]],p.object,p.ink,3);path(g,[[285,603],[lerp(225,315,q),lerp(560,646,q)],[lerp(370,460,q),lerp(560,646,q)],[430,603]],p.paper,p.ink,3);path(g,[[285,696],[lerp(238,310,q),lerp(740,665,q)],[lerp(383,455,q),lerp(740,665,q)],[430,696]],p.hero,p.ink,3);break;
 }
 case 'sprinkle':item(355,652,1.3,s.object==='seed'?'soil':'cake');item(290,400,.7,'flour',-.7);for(let i=0;i<30;i++){let v=(a*3+hash(i))%1;let xx=305+(hash(i*3)-.5)*100;oval(g,xx+v*60,440+v*210,3,5,i%2?p.accent:p.object,null)}break;
 case 'align':
  for(let i=0;i<3;i++){item(lerp(m==='blueprint'?310+hash(i)*90:260+hash(i)*170,355,a),475+i*(m==='blueprint'?95:83),m==='blueprint'?.85:.6,s.object,lerp((hash(i)-.5)*.7,0,a))}g.setLineDash([6,6]);line(g,[[355,m==='blueprint'?440:350],[355,720]],p.accent,m==='blueprint'?.8:2);g.setLineDash([]);break;
 case 'balance':{
  let angle=Math.sin(a*14)*(1-a)*.3;transformed(g,355,600,1,angle,()=>{line(g,[[-90,50],[90,50]],p.ink,8);item(0,0,1.15)});path(g,[[355,654],[329,717],[383,717]],p.accent,p.ink,3);break;
 }
 case 'tie':item(365,615,1.5);line(g,[[300,lerp(510,610,a)],[417,lerp(710,610,a)]],p.accent,6);if(done){g.beginPath();g.ellipse(350,597,20,12,-.5,0,6.28);g.ellipse(382,597,20,12,.5,0,6.28);g.strokeStyle=p.accent;g.lineWidth=6;g.stroke();line(g,[[365,608],[345,648]],p.accent,5);line(g,[[365,608],[385,644]],p.accent,5)}break;
 case 'carry':item(hx+70,551,.8);rr(g,390,570,90,147,4,null,p.ink,4);text(g,'GOAL',434,548,23,p.ink,null,0,'Arial');break;
 case 'plant':{
  let drop=smooth((a-.18)/.82);item(350,670,1.4,'pot');
  if(!done)item(lerp(300,350,drop),lerp(480,628,drop),.7,'seed');
  if(done){let grow=smooth((u-.76)/.15);line(g,[[350,635],[350,lerp(635,525,grow)]],p.ink,5);if(grow>.2){oval(g,333,lerp(635,552,grow),23*grow,10*grow,p.ground,p.ink,2);oval(g,369,lerp(635,569,grow),23*grow,10*grow,p.ground,p.ink,2)}}break;
 }
 case 'bend':{
  const broken=smooth((a-.6)/.4);
  transformed(g,355,690,1,Math.min(a*.5,.3),()=>{
   g.save();g.beginPath();g.rect(-25,-100,50,165);g.clip();item(0,-75,1.7,'stake',Math.PI/2);g.restore();
   transformed(g,broken*65,-100+broken*45,1,broken*1.2,()=>{g.save();g.beginPath();g.rect(-25,-160,50,160);g.clip();item(0,25,1.7,'stake',Math.PI/2);g.restore()});
  });
  if(a>.6){bits(355,600,8,p.object,40);text(g,'SNAP.',350,380,29,p.ink,null,0,'serif')}break;
 }
 default:item(350,630,1.3);
 }
 // Put the performer in front of scenery but behind the action cue.
 let target=null,leftTarget=null;
 const point=(x,y,dx,dy,rotation)=>[x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation)];
 if(s.action==='scoop')target=point(lerp(270,350,a),lerp(490,605,a)-Math.sin(a*Math.PI)*50,-48,0,-.5+a);
 if(s.action==='pour')target=point(304,456,0,-45,-a*1.35);
 if(s.action==='stir')target=[355+Math.sin(Math.sin(a*18)*.55)*92,604-Math.cos(Math.sin(a*18)*.55)*92];
 if(s.action==='roll')target=[355+Math.sin(a*12)*42-85.4,633];
 if(s.action==='cut')target=[355,lerp(396,644,clamp(a*1.4))-115];
 if(s.action==='fan')target=point(m==='terminal'?310:258,496,0,80,Math.sin(a*18)*.35);
 if(s.action==='meter'&&m==='terminal')target=[222,589];
 if(s.action==='carry')target=[hx+70,551+.8*(s.object==='tree'||s.object==='flower'?38:27)];
 if(s.action==='catch')target=[305,642];
 if(s.action==='press')target=[355,pressY-55];
 if(s.action==='fold')target=[lerp(225,315,smooth(a)),lerp(560,646,smooth(a))];
 if(s.action==='sprinkle')target=[290,400];
 if(s.action==='tie')target=[300,lerp(510,610,a)];
 if(s.action==='crack'){
  const split=smooth((a-.55)/.25),grip=s.object==='seed'?38:24;
  leftTarget=[355-split*30-grip,637];target=[355+split*30+grip,637];
 }
 if(s.action==='plant'){
  const release=smooth((a-.18)/.28);target=[lerp(300,hx+95,release),lerp(480,hy-100,release)];
 }
 if(s.action==='bend'){
  const contact=point(355,690,0,-125,Math.min(a*.5,.3)),release=smooth((a-.6)/.25);
  target=[lerp(contact[0],hx+100,release),lerp(contact[1],hy-135,release)];
 }
 if(m!=='blueprint')hero(g,m,hx,hy,hs,{arm,lean,jump,target:target?localContact(target,hx,hy,hs,lean,jump):null,leftTarget:leftTarget?localContact(leftTarget,hx,hy,hs,lean,jump):null,face:!s.success&&done?'shock':'happy'},film.hero);
 if(done&&s.success&&m!=='blueprint'){for(let i=0;i<5;i++){let an=i*1.25;star(g,358+Math.cos(an)*95,535+Math.sin(an)*90,8+hash(i)*5,p.accent)}}
 g.restore();
 if(m==='swiss'&&!options.noAnnotations){
  const title=s.command.replace(/[!.]+$/,'').toLowerCase()+'.';
  g.save();g.font='900 78px Arial';const width=g.measureText(title).width;
  g.font=`900 ${Math.min(78,78*470/Math.max(1,width))}px Arial`;g.fillStyle=p.ink;g.textAlign='left';g.textBaseline='alphabetic';g.fillText(title,35,282);g.restore();
  const rules={roll:'move the pin across.',cut:'hand to blade.',carry:'hold it steady.',jump:'clear the obstacle.',catch:'meet the falling object.'};
  text(g,`rule ${s.game} / ${rules[s.action]||'one clear move.'}`,35,315,16,p.ink,null,0,'Arial','left');
 }
 if(m==='blueprint'&&!options.noAnnotations){
  hero(g,m,57,919,.34,{arm:.4+arm},film.hero);
  blueprintNotes(g,s,p,pressY);
  if(done&&s.success)transformed(g,172,901,1,-.1,()=>{rr(g,-28,-18,56,36,1,null,p.accent,1.5);text(g,'OK',0,0,24,p.accent,null,0,'monospace')});
  if(s.action!=='align'){g.setLineDash([5,5]);line(g,[[282,275],[282,790]],p.ink,.65);g.setLineDash([])}
 }
 if(options.finish)options.finish(g,m);else {finish(g,m,createCanvas,cache);materialPass(g,m,cache)}
 if(!options.noHud){
  fuse(g,options.timerProgress??u,dur*s.bpm/60,options.timerTime??lt);command(g,s.command,lt,[.73,.60,.45][s.round]);
 }
}
