import {text,clamp} from './primitives.mjs';

export function terminalRows(g,rows,x,y,size,color,step=size){
 rows.forEach((row,i)=>text(g,row,x,y+i*step,size,color,null,0,'monospace'));
}

function characterStroke(g,a,b,color){
 const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/10));
 const glyph=Math.abs(dy)<Math.abs(dx)*.35?'-':Math.abs(dx)<Math.abs(dy)*.35?'|':dx*dy>0?'\\':'/';
 for(let i=0;i<=n;i++)text(g,glyph,a[0]+dx*i/n,a[1]+dy*i/n,15,color,null,0,'monospace');
}

export function terminalFigure(g,pose,role,p){
 const hat=role==='baker'?[String.raw`  _/^^\_  `,' (______)  ']:['   _____  ',' _|_____|_'];
 const rows=[...hat,String.raw` /       \ `,'|  o   o  |','|    v    |',String.raw` \  ---  /`,'  |-----|  ','  |  @  |  ','  |_____|  ',String.raw`   /   \   `,String.raw` _/     \_ `];
 terminalRows(g,rows,0,-165,18,p.ink,15);
 const left=pose.leftTarget||[-65,-45-(pose.arm||0)*45],right=pose.target||[65,-45-(pose.arm||0)*45];
 characterStroke(g,[-30,-62],left,p.ink);characterStroke(g,[30,-62],right,p.ink);
 text(g,'o',...left,16,p.ink,null,0,'monospace');text(g,'o',...right,16,p.ink,null,0,'monospace');
}

export function terminalObject(g,kind,p){
 const objects={
  flour:['  .----.  ',String.raw` /      \ `,'| FLOUR  |','|  :::   |','|________|'],
  seed:['  .--.  ',String.raw` / .. \ `,'| .... |',String.raw` \_.._/ `],
  oven:['+---------+','| o === o |','| +-----+ |',String.raw`| | /\/ | |`,'| +-----+ |','+---------+'],
  cake:['    o    ','   _|_   ',' .|___|. ',' |:::::| ',' |_____| '],
  flower:[String.raw`   \|/   `,' --(@)-- ',String.raw`   /|\   `,'    |    ','   <|>   ','  __|__  '],
  water:[' .~~~~~~. ',String.raw` \ ~~~  / `,String.raw`  \ ~  /  `,'   |__|   ']
 };
 if(!objects[kind])return false;
 terminalRows(g,objects[kind],0,-32,15,p.ink,14);return true;
}

export function terminalMeter(g,value,locked,p){
 text(g,locked?'LOCK / OK':'CHECK',365,320,24,p.ink,null,0,'monospace');
 text(g,'+----+',382,350,18,p.ink,null,0,'monospace');
 const count=Math.round(clamp(value)*12);
 for(let i=0;i<12;i++){
  const y=374+i*23,number=i%3===0?String(100-Math.round(i/12*100)).padStart(3,' '):'   ';
  text(g,number,307,y,15,p.ink,null,0,'monospace');
  text(g,'|'+(i>=12-count?'####':'    ')+'|',382,y,18,p.ink,null,0,'monospace');
  if(i===3)text(g,'<',436,y,18,p.ink,null,0,'monospace');
 }
 text(g,'+----+',382,650,18,p.ink,null,0,'monospace');
}

export function terminalFan(g,p){
 terminalRows(g,[String.raw`  .\ | /.  `,String.raw` . \ | / . `,'(--- + ---)',String.raw`  \  |  /  `,'     |     ','     |     ','     |     '],0,-40,18,p.ink,20);
}
