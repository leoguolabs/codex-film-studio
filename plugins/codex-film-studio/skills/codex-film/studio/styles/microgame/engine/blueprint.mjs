import {line,rr,oval,path,text} from './primitives.mjs';

// A compression assembly supplies a continuous structure around the moving
// platen. All geometry is in the action's coordinates, so contact survives zoom.
export function blueprintPressFrame(g,platenY,p){
 const edge=(pts,w=.8)=>line(g,pts,p.ink,w);
 rr(g,255,402,200,27,3,p.paper,p.ink,1.1);
 rr(g,255,429,12,255,1,p.paper,p.ink,1.1);
 rr(g,443,429,12,255,1,p.paper,p.ink,1.1);
 rr(g,246,684,218,14,1,p.paper,p.ink,1.1);
 for(const x of [261,449]){oval(g,x,415,3,3,null,p.ink,.7);edge([[x,438],[x,674]],.5)}
 edge([[348,429],[348,platenY-10]]);edge([[362,429],[362,platenY-10]]);
 for(let y=434;y<platenY-13;y+=7)edge([[348,y],[362,y-4]],.55);
 g.save();g.setLineDash([3,4]);edge([[255,705],[455,705]],.5);g.restore();
 edge([[255,701],[255,709]],.5);edge([[455,701],[455,709]],.5);
 text(g,'200',355,714,8,p.ink,null,0,'monospace');
}

export function blueprintNotes(g,s,p,platenY){
 // Register the OFL Architects Daughter face before drawing. Its irregular
 // single-pen lettering belongs to the same material as the construction lines.
 const label=(word,x,y,size=12,align='left')=>text(g,word,x,y,size,p.ink,null,0,'Architects Daughter',align);
 const leader=(word,x,y,points,align='left')=>{
  label(word,x,y,12,align);line(g,points,p.ink,.8);
  const end=points.at(-1);oval(g,end[0],end[1],2,2,p.ink,null);
 };
 const titles={press:'COMPRESSION ASSEMBLY',dial:'CONTROL ASSEMBLY',align:'ALIGNMENT STUDY'};
 const rules={press:'LOWER TO CONTACT',dial:'TURN TO THE MARK',align:'BRING ALL THREE TO AXIS'};
 label(titles[s.action]||'MOTION STUDY',39,215,19);
 label(rules[s.action]||'ONE CONTROLLED MOVE',40,243,12);
 if(s.action==='press'){
  leader('GUIDE / A',423,329,[[421,340],[438,356],[451,356]],'right');
  leader('TRAVEL',39,473,[[40,485],[78,485],[102,508]]);
  leader('PLATEN',462,587,[[452,600],[425,600],[394,520+(platenY-550)*1.8]],'right');
 }else if(s.action==='dial'){
  leader('INDEX / 01',454,295,[[446,307],[409,307],[365,342]],'right');
  leader('CONTROL',38,516,[[40,529],[81,529],[s.object==='sprinkler'?202:176,553]]);
  leader(s.object==='sprinkler'?'OUTLET':'CHAMBER',464,762,[[458,748],[432,724],s.object==='sprinkler'?[392,724]:[405,692]],'right');
 }else if(s.action==='align'){
  leader('CENTRE LINE',443,296,[[437,308],[391,308],[282,325]],'right');
  for(let i=0;i<3;i++){
   label(String(i+1).padStart(2,'0'),48,385+i*171,15);
   line(g,[[72,385+i*171],[103,385+i*171]],p.ink,.65);
  }
 }
 // The drawing title block sits below the timer, outside the moving mechanism.
 rr(g,266,888,228,49,0,null,p.ink,.8);
 line(g,[[266,912],[494,912]],p.ink,.6);
 label(`DWG ${s.command.replace(/[!.]/g,'')}-${String(s.game).padStart(2,'0')}`,275,901,11);
 label('DETAIL A / 2:1',275,925,10);label('UNITS mm',485,925,10,'right');
}

// Technical objects use contour, internal and hidden lines independently.
// Sizes are object-local; the scene can enlarge them without heavy icon rims.
export function blueprintObject(g,kind,p){
 const outer=1.05,inner=.65;
 const rect=(x,y,w,h,r=1)=>rr(g,x,y,w,h,r,p.paper,p.ink,outer);
 const edge=(pts,w=inner,c=p.ink)=>line(g,pts,c,w);
 const ellipse=(x,y,rx,ry)=>oval(g,x,y,rx,ry,p.paper,p.ink,outer);
 const hidden=fn=>{g.save();g.setLineDash([3,3]);g.globalAlpha=.6;fn();g.restore()};
 if(kind==='dough'){
  ellipse(0,0,47,20);edge([[-34,-2],[-16,-9],[12,-10],[34,-3]]);
  hidden(()=>edge([[-34,3],[-12,11],[17,10],[35,3]]));
 }else if(['soil','flour','compost'].includes(kind)){
  path(g,[[-38,22],[-29,-41],[23,-47],[39,21]],p.paper,p.ink,outer);
  edge([[-26,-40],[-19,-33],[23,-39],[23,-47]]);edge([[-33,16],[32,16]]);
  rr(g,-20,-20,40,25,1,null,p.ink,inner);text(g,kind==='flour'?'F':'S',0,-7,16,p.ink,null,0,'monospace');
  hidden(()=>edge([[-26,-33],[-22,14],[29,14],[22,-37]]));
 }else if(kind==='oven'){
  rect(-49,-51,98,91,3);rect(-38,-25,76,52,2);
  for(let y=-47;y<=-40;y+=3)edge([[-11,y],[11,y]]);
  ellipse(28,-39,6,6);ellipse(-28,-39,6,6);edge([[28,-39],[31,-42]],inner,p.accent);
  edge([[-24,-17],[24,-17]],1.2);edge([[-30,14],[30,14]]);
  hidden(()=>{edge([[-31,-9],[-31,20],[31,20],[31,-9]]);edge([[-39,34],[39,34]])});
  for(let x=-24;x<=24;x+=12)edge([[x,3],[x+4,-2],[x+8,3]]);
 }else if(kind==='sprinkler'){
  rect(-38,-55,76,63,2);rect(-27,-43,54,22);
  text(g,'06:00',0,-32,12,p.ink,null,0,'monospace');ellipse(-19,-7,4,4);ellipse(18,-7,4,4);
  edge([[0,8],[0,28],[43,28],[43,41]],2.2);edge([[-13,17],[13,17]],1.4,p.accent);
  edge([[43,41],[43,51],[23,63],[-35,63],[-56,48],[-56,30]],1.4);
  edge([[-67,28],[-45,28]],1.4);
  for(let i=0;i<5;i++)edge([[-56,25],[-78+i*11,-6-Math.sin(i/4*Math.PI)*20]],.7,p.accent);
  hidden(()=>edge([[-32,-49],[32,-49],[32,1],[-32,1],[-32,-49]]));
 }else if(['tray','fence'].includes(kind)){
  rect(-52,-26,104,53);
  path(g,[[-52,-26],[-31,-48],[71,-48],[52,-26]],p.paper,p.ink,outer);
  edge([[52,-26],[71,-48],[71,5],[52,27]],outer);
  if(kind==='tray'){
   edge([[-44,-30],[-28,-43],[57,-43],[44,-30],[-44,-30]]);
   hidden(()=>edge([[-44,-18],[44,-18],[44,19],[-44,19],[-44,-18]]));
  }else{
   for(let x=-36;x<48;x+=17)edge([[x,-22],[x,22]],.8);
   edge([[-48,-14],[48,-14]]);edge([[-48,13],[48,13]]);
  }
 }else return false;
 if(!['dough','soil','flour','compost'].includes(kind)){
  hidden(()=>edge([[-65,46],[65,46]]));edge([[-65,41],[-65,52]]);edge([[65,41],[65,52]]);
  text(g,'120',0,54,9,p.ink,null,0,'monospace');
 }
 return true;
}
