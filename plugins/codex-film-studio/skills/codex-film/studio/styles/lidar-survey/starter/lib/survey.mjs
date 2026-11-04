// Local survey coordinates remain unchanged. Camera and display effects are separate.
export function validateSurvey(data){
  if(!data?.points?.length)throw Error('Survey requires measured points');
  for(const p of data.points)if(!Array.isArray(p)||p.length<3||!p.every(Number.isFinite))throw Error('Invalid local xyz point');
  for(const tri of data.triangles||[])if(tri.length!==3||!tri.every(i=>Number.isInteger(i)&&i>=0&&i<data.points.length))throw Error('Invalid surface triangle');
  return data;
}
export function project(point,camera,width,height){
  const [x,y,z]=point,[tx,ty,tz]=camera.target||[0,0,0],az=camera.azimuth??-.6,el=camera.elevation??.55;
  const dx=x-tx,dy=y-ty,dz=z-tz,side=dx*Math.cos(az)-dy*Math.sin(az),forward=dx*Math.sin(az)+dy*Math.cos(az);
  const vertical=dz*Math.cos(el)-forward*Math.sin(el),depth=(camera.distance||500)+forward*Math.cos(el)+dz*Math.sin(el);
  const scale=(camera.focal||height)/depth;
  return [width/2+side*scale,height/2-vertical*scale,depth];
}
export function renderSurvey(c,data,options,width,height){
  validateSurvey(data);
  const camera=options.camera||{},scan=options.scan??Infinity,cut=options.cut??Infinity;
  const xyz=data.points.map(p=>project(p,camera,width,height));
  const triangles=(data.triangles||[]).map(t=>({t,z:t.reduce((z,i)=>z+xyz[i][2],0)/3})).sort((a,b)=>b.z-a.z);
  if(options.surface)for(const {t} of triangles){
    const p=t.map(i=>data.points[i]),v=t.map(i=>xyz[i]);
    if(v.some(q=>q[2]<=1)||p.some(q=>q[0]>scan))continue;
    const a=p[1].map((q,i)=>q-p[0][i]),b=p[2].map((q,i)=>q-p[0][i]);
    const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=Math.hypot(...n)||1;
    const light=.25+.75*Math.abs((n[0]*.78+n[1]*.25+n[2]*.57)/len);
    c.fillStyle=`rgb(${Math.round(189*light)},${Math.round(181*light)},${Math.round(166*light)})`;
    c.beginPath();v.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();
  }
  const points=data.points.map((p,i)=>({p,v:xyz[i]})).sort((a,b)=>b.v[2]-a.v[2]);
  for(const {p,v} of points){
    if(p[0]>scan||v[2]<=1)continue;
    const h=p[5]??p[2],ground=p[3]===2,removed=!ground&&h>cut;
    if(removed&&!options.ghost)continue;
    const t=Math.max(0,Math.min(1,h/(options.heightRange||30))),intensity=Math.max(.2,Math.min(1,p[4]??1));
    c.globalAlpha=(removed?.12:1)*intensity;
    c.fillStyle=ground?'#c8b38c':`rgb(${31+195*t},${63+180*t},${53+167*t})`;
    const size=options.pointSize||2;c.fillRect(v[0],v[1],size,size);
  }c.globalAlpha=1;
  if(options.section){c.strokeStyle='#ffb347';c.lineWidth=1;c.beginPath();options.section.forEach((p,i)=>{const v=project(p,camera,width,height);i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]);});c.stroke();}
}
export function proofSurvey(){
  // Explicitly synthetic diagnostic surface, never an observation of a place.
  const points=[],triangles=[];
  for(let y=0;y<41;y++)for(let x=0;x<41;x++)points.push([(x-20)*6,(y-20)*6,8*Math.sin(x*.2)*Math.cos(y*.15),2,1]);
  for(let y=0;y<40;y++)for(let x=0;x<40;x++){const i=y*41+x;triangles.push([i,i+1,i+41],[i+1,i+42,i+41]);}
  return {points,triangles};
}
