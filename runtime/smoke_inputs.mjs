// Deterministic, synthetic engineering inputs. No story or previous production cast.
// Runs only in an external project; never overwrites an authored timeline.
import fs from 'node:fs';
import path from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {ROOT,hash} from './render.mjs';
const file=path.join(ROOT,'content/production.json');
if(JSON.parse(fs.readFileSync(file)).shots.length)throw Error('Smoke inputs require an empty timeline');
const profile=JSON.parse(fs.readFileSync(path.join(ROOT,'style-profile.json'))),id=profile.id;
fs.mkdirSync(path.join(ROOT,'assets/smoke'),{recursive:true});
const assets=[];
function save(name,bytes,type){const file='assets/smoke/'+name;fs.writeFileSync(path.join(ROOT,file),bytes,{flag:'wx'});assets.push({file,sha256:hash(bytes),...(type?{type}:{}),source:'Generated deterministic diagnostic; not real-world evidence',license:'CC0-1.0'});return file;}
for(let i=0;i<9;i++){const c=createCanvas(160,120),g=c.getContext('2d');g.fillStyle=['#ead8b2','#bbcbce','#d9ad85'][i%3];g.fillRect(0,0,160,120);g.strokeStyle='#594e48';g.lineWidth=3;g.strokeRect(14+i*2,15,95,80);g.beginPath();g.moveTo(16,90);g.lineTo(80,25+i*3);g.lineTo(145,90);g.stroke();save(`card-${i}.png`,c.toBuffer('image/png'));}
const plate=createCanvas(360,180),pg=plate.getContext('2d');pg.fillStyle='#142c46';pg.fillRect(0,0,360,180);for(let y=0;y<180;y+=10)for(let x=0;x<360;x+=10){pg.fillStyle=(x+y)%30?'#638573':'#b8a77e';pg.fillRect(x,y,8,8);}const plateFile=save('synthetic-equirectangular.png',plate.toBuffer('image/png'));
const points=[],triangles=[];for(let y=0;y<25;y++)for(let x=0;x<25;x++)points.push([(x-12)*10,(y-12)*10,15*Math.sin(x*.22)*Math.cos(y*.24),2,1]);for(let y=0;y<24;y++)for(let x=0;x<24;x++){let i=y*25+x;triangles.push([i,i+1,i+25],[i+1,i+26,i+25]);}const dataFile=save('synthetic-survey.json',Buffer.from(JSON.stringify({points,triangles})),'json');
const fps=id==='microgame'?30:24,w=id==='microgame'?540:640,h=id==='microgame'?960:360,n=6*fps;
const base={id:'diagnostic',start:0,end:n,layers:[]};
const shape=(x,y,color,motion)=>({type:'shape',points:[[0,0],[105,4],[90,100],[8,90]],x,y,fill:color,stroke:profile.ink,motion});
let shots=[{...base,layers:[shape(100,85,profile.accent,{from:[90,85],to:[200,85]}),shape(360,105,profile.secondary)]}];
if(['scifi-sitcom','midcentury-cartoon'].includes(id)){
 const polygon=(points,fill)=>({type:'shape',points,fill,stroke:profile.ink,width:3});
 const puppet=x=>({type:'group',x,y:105,layers:[polygon([[-25,65],[25,65],[35,145],[-35,145]],profile.accent),polygon([[-30,0],[30,0],[35,50],[0,62],[-35,45]],profile.secondary),polygon([[-19,19],[-7,19],[-7,30],[-19,30]],'#fff'),polygon([[7,19],[19,19],[19,30],[7,30]],'#fff'),polygon([[-15,23],[-11,23],[-11,28],[-15,28]],profile.ink),polygon([[11,23],[15,23],[15,28],[11,28]],profile.ink),polygon([[-12,43],[12,43],[8,48],[-8,48]],profile.ink),{type:'group',x:22,y:76,motion:{rotation:[-.6,.8],holdFrames:id==='midcentury-cartoon'?2:1},layers:[polygon([[0,0],[65,-7],[68,5],[0,12]],profile.accent)]}]});
 shots=[{...base,layers:[puppet(210),puppet(430)]}];
}
if(id==='crayon-book'){
 const page=createCanvas(w,h),g=page.getContext('2d');
 const {drawStyle}=await import(new URL('../../lib/scene.mjs',import.meta.url));
 await drawStyle(g,{frame:71,localFrame:71,progress:1,seconds:3,shot:shots[0],plan:{width:w,height:h},profile,assets:new Map()});
 const waxPage=save('wax-page.png',page.toBuffer('image/png'));
 shots=[{...shots[0],end:72},{id:'page-turn',start:72,end:n,layers:[{type:'page-turn',x:320,y:85,width:170,height:150,frontFile:waxPage,backFile:assets[1].file,start:0,end:71}]}];
}
if(id==='art-collage')shots=[{...base,layers:[{type:'paper',x:120,y:65,width:240,height:180,motion:{from:[70,55],to:[210,85]},rotation:-.08},{type:'image',file:assets[0].file,x:280,y:100,width:180,height:135,rotation:.08}]}];
if(id==='caption-news')shots=[{...base,layers:[{type:'headline',text:'MEASURE / CHECK',x:80,y:155,size:46,maxWidth:520},{type:'shape',points:[[0,0],[420,0],[420,10],[0,10]],fill:'#ebc234',x:100,y:205,motion:{from:[30,205],to:[110,205]}}]}];
if(id==='art-deco')shots=[{...base,layers:[{type:'fan',x:320,y:210,radius:130},{type:'person',x:150,y:290,height:210}]}];
if(id==='satellite-briefing')shots=[{...base,plates:[{file:plateFile,bounds:[-180,-90,180,90]}],geoLines:[{coordinates:[[0,-40],[15,-20],[30,0],[40,20]],color:'#efcb82'}],layers:[]}];
if(id==='lidar-survey')shots=[{...base,layers:[{type:'survey',file:dataFile,surface:true,scan:-130,scanTo:130,camera:{azimuth:-.7,elevation:.55,distance:340},cameraTo:{azimuth:-.3},section:[[-110,0,10],[0,0,15],[110,0,5]]}]}];
if(id==='line-chart-comedy')shots=[{...base,chart:{bounds:{x:80,y:65,width:450,height:180},domain:{x:[0,5],y:[0,1]},series:[{color:'#dd6f42',expression:'shock',label:'A',values:[[0,.1],[1,.3],[2,.45],[3,.35],[4,.75],[5,.9]]},{color:'#46859d',expression:'calm',label:'B',values:[[0,.7],[1,.6],[2,.5],[3,.6],[4,.35],[5,.2]]}]}}];
if(id==='newsreel')shots=[{...base,layers:[{type:'montage',files:assets.slice(0,9).map(a=>a.file),x:105,y:20,width:430,height:250}]}];
if(id==='microgame')shots=['crayon','blueprint'].map((medium,i)=>({id:`medium-${i}`,start:i*3*fps,end:(i+1)*3*fps,medium,game:{medium,command:'PRESS',action:'press',object:'dough',character_fps:10,bpm:120,round:i,success:true},layers:[]}));
// Single click at exactly 1 s and 4 s. The encoded onset is tested, not listened to.
const rate=48000,len=rate/8,buffer=Buffer.alloc(44+len*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(len*2,40);for(let i=0;i<len;i++)buffer.writeInt16LE(Math.round(10000*Math.sin(2*Math.PI*880*i/rate)*Math.sin(Math.PI*i/len)**2),44+i*2);
const audioFile='assets/smoke/sync.wav';fs.writeFileSync(path.join(ROOT,audioFile),buffer,{flag:'wx'});
const plan={schema_version:1,width:w,height:h,fps,duration_frames:n,diagnostic:true,hero:'diagnostic',assets,audio:[1,4].map(t=>({file:audioFile,sha256:hash(buffer),start:t*fps,end:(t+1)*fps,role:t===1?'voice':'effect',gain:1})),captions:[{text:'SYNTHETIC ENGINEERING CHECK',start:0,end:fps},{text:'SYNC 1',start:fps,end:2*fps},{text:'SYNC 2',start:4*fps,end:5*fps}],shots};
const bed=Buffer.alloc(44+rate*6*2);buffer.copy(bed,0,0,44);bed.writeUInt32LE(bed.length-8,4);bed.writeUInt32LE(bed.length-44,40);for(let i=0;i<rate*6;i++)bed.writeInt16LE(Math.round(150*Math.sin(2*Math.PI*220*i/rate)),44+i*2);
const bedFile='assets/smoke/bed.wav';fs.writeFileSync(path.join(ROOT,bedFile),bed,{flag:'wx'});plan.audio.push({file:bedFile,sha256:hash(bed),start:0,end:n,role:'music',gain:1});
fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n');
console.log(`${id}: 6-second synthetic test timeline, captions and imported PCM`);
