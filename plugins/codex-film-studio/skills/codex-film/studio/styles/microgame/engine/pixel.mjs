// Small-grid geometry: colour clusters and stepped shading are authored before
// the shared indexed buffer is enlarged. Coordinates are in four-unit cells.
export function pixelFigure(g,pose={},role='baker'){
 const ink='#1c1e39',shadow='#424782',skin='#f4d2a2',warm='#ed8d3c',white='#fffaf0',grey='#a7a0a1',cyan='#53b3c4';
 const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x*4,y*4,w*4,h*4)};
 const stroke=(from,to,c,width)=>{
  let x=Math.round(from[0]),y=Math.round(from[1]),xx=Math.round(to[0]),yy=Math.round(to[1]);
  const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;let err=dx+dy;
  for(;;){rect(x-Math.floor(width/2),y-Math.floor(width/2),width,width,c);if(x===xx&&y===yy)break;const e=2*err;if(e>=dy){err+=dy;x+=sx}if(e<=dx){err+=dx;y+=sy}}
 };
 const arm=pose.arm||0,left=(pose.leftTarget||[-59,-48-arm*48]).map(v=>v/4),right=(pose.target||[61,-58-arm*55]).map(v=>v/4);
 for(const [start,hand] of [[[-7,-19],left],[[7,-19],right]]){
  const elbow=[(start[0]+hand[0])/2,(start[1]+hand[1])/2+2];
  for(const [c,w] of [[ink,5],[cyan,3]]){stroke(start,elbow,c,w);stroke(elbow,hand,c,w)}
 }
 // Short, solid legs and flat soles; the rear leg is in shade.
 rect(-7,-5,6,11,ink);rect(2,-5,6,11,ink);rect(-6,-4,4,9,grey);rect(3,-4,4,9,shadow);
 rect(-10,4,9,4,ink);rect(2,4,10,4,ink);rect(-9,4,8,2,warm);rect(3,4,8,2,warm);rect(-9,6,8,1,'#895f53');rect(3,6,8,1,'#895f53');
 // Apron has a lit front, a dark side and a thick lower hem.
 rect(-10,-24,20,21,ink);rect(-9,-23,17,17,white);rect(7,-23,2,17,grey);rect(-9,-6,18,2,grey);
 rect(-9,-23,3,11,warm);rect(-6,-23,13,3,cyan);rect(-2,-17,5,5,warm);rect(-1,-16,1,3,white);rect(1,-16,1,3,white);
 // A stepped oval, with one cheek in shade, is distinct from a filtered circle.
 rect(-6,-39,12,2,shadow);rect(-8,-37,16,3,shadow);rect(-9,-34,18,9,shadow);rect(-7,-25,14,2,shadow);
 rect(-6,-36,12,10,skin);rect(-7,-33,14,6,skin);rect(-5,-37,9,1,skin);rect(5,-35,2,9,'#895f53');rect(-4,-34,1,2,white);
 rect(-3,-32,1,2,ink);rect(3,-32,1,2,ink);rect(4,-29,2,1,'#e35851');
 if(pose.face==='shock'){rect(0,-28,2,3,ink)}else{rect(0,-27,3,1,ink);rect(3,-28,1,1,ink)}
 if(role==='baker'){
  rect(-7,-40,14,3,grey);rect(-8,-43,16,4,white);rect(-6,-46,5,4,white);rect(0,-47,5,5,white);rect(5,-45,3,4,white);rect(6,-41,2,3,grey);rect(-7,-38,14,1,ink);
 }else{
  rect(-7,-41,13,3,cyan);rect(-5,-43,9,2,cyan);rect(-9,-39,18,2,ink);rect(-8,-39,15,1,'#b6ded7');rect(5,-41,2,2,shadow);
 }
 for(const hand of [left,right]){const x=Math.round(hand[0]),y=Math.round(hand[1]);rect(x-2,y-2,5,5,ink);rect(x-1,y-1,3,3,skin);rect(x+1,y+1,1,1,warm)}
}

export function pixelLandscape(g,hash){
 const cell=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x*4,y*4,w*4,h*4)};
 g.fillStyle='#101025';g.fillRect(0,0,540,960);
 for(let i=0;i<115;i++)cell(Math.floor(hash(i*17)*135),Math.floor(46+hash(i*31)*127),1,1,i%5?'#424782':'#fffaf0');
 // Distant shaded orb, built from solid clusters and a dithered terminator.
 for(let y=-19;y<=19;y++)for(let x=-19;x<=19;x++)if(x*x+y*y<19*19){
  let c='#777db8';const threshold=x*.7+y*.3;
  if(threshold>5)c='#424782';if(threshold>3&&threshold<7&&((x+y)&1))c='#777db8';
  if(y>-9&&y<-4&&x+y*.7<-1)c='#b4b7dc';if(y>-7&&y<-5&&x+y*.7<-3)c='#fffaf0';
  if(y>7&&y<10&&x+y*.7<7)c='#b4b7dc';cell(105+x,82+y,1,1,c);
 }
 // A stepped horizon, with a flat contact pad under the performer.
 for(let col=0;col<135;col++){
  let top=col>=13&&col<=62?180:180-Math.round(2+Math.sin(col*.16)*2);
  cell(col,top,1,240-top,'#6b667f');cell(col,top,1,1,'#b4b7dc');
  for(let row=1;row<8;row++)if(((col+row)&1)===0&&row<7)cell(col,top+row,1,1,row<3?'#a7a0a1':'#777db8');
 }
 for(let i=0;i<34;i++)cell(Math.floor(hash(i*19)*130),191+Math.floor(hash(i*29)*46),2+i%4,1,i%3?'#424782':'#a7a0a1');
}
