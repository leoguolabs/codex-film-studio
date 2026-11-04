// Subject geometry stays in the production. Coordinates are arbitrary consistent units.
export const smooth = x => {x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function lift(progress, delay=0) {
  return smooth((progress-.15-delay)/.22)*(1-smooth((progress-.67+delay)/.22));
}
export function validateModel(model) {
  const vector=(v,n=3)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
  if(!model || !Array.isArray(model.parts) || !model.parts.length || model.parts.length>1000)
    throw Error('Assembly needs 1–1000 parts');
  const ids=new Set();
  for(const p of model.parts) {
    if(!p.id || ids.has(p.id))throw Error('Assembly part IDs must be unique');ids.add(p.id);
    if(!vector(p.position)||!vector(p.explode)||!vector(p.size)||p.size.some(x=>x<=0))
      throw Error(`Part ${p.id}: positive size, position and explode vectors required`);
    if(!['box','plate','cylinder','sphere','mesh'].includes(p.shape))throw Error(`Part ${p.id}: unsupported shape`);
    if(p.holes&&(!Array.isArray(p.holes)||p.holes.some(h=>!vector(h)||h[2]<=0||Math.abs(h[0])+h[2]>=p.size[0]/2||Math.abs(h[1])+h[2]>=p.size[2]/2)))
      throw Error(`Part ${p.id}: circular holes must fit inside the plate`);
    if(p.rotation&&!vector(p.rotation))throw Error(`Part ${p.id}: rotation must be Euler radians`);
    if(!p.material||!/^#[0-9a-f]{6}$/i.test(p.material.color)||
       !['roughness','metalness'].every(k=>Number.isFinite(p.material[k])&&p.material[k]>=0&&p.material[k]<=1))
      throw Error(`Part ${p.id}: material needs color, roughness and metalness in [0,1]`);
    if(p.delay!==undefined&&(!Number.isFinite(p.delay)||p.delay<0||p.delay>.12))throw Error(`Part ${p.id}: delay must be in [0,.12]`);
    if(p.label!==undefined&&(typeof p.label!=='string'||p.label.length>28))throw Error(`Part ${p.id}: label must have at most 28 characters`);
    if(p.labelSide!==undefined&&!['left','right'].includes(p.labelSide))throw Error(`Part ${p.id}: labelSide must be left or right`);
    if(p.shape==='mesh'&&(!Array.isArray(p.vertices)||p.vertices.length<9||p.vertices.length>300000||p.vertices.length%9||!p.vertices.every(Number.isFinite)))
      throw Error(`Part ${p.id}: mesh needs finite non-indexed triangle vertices`);
  }
  return model;
}
// A calibration object, deliberately not a model of either published sample.
export function diagnosticModel() {
  const mat=(color,roughness,metalness)=>({color,roughness,metalness});
  const part=(id,shape,position,size,explode,material,label,delay=0)=>({id,shape,position,size,explode,material,label,delay});
  const parts=[
    part('base','box',[0,0,0],[3.4,.28,2.3],[0,-1,0],mat('#727b85',.25,.9),'01 / METAL BASE',.08),
    part('board','box',[0,.3,0],[2.9,.12,1.9],[0,.4,0],mat('#244e46',.72,.05),'02 / LAMINATE',.04),
    part('chip','box',[-.3,.48,0],[.8,.22,.7],[0,.4,0],mat('#1c212b',.5,.15)),
    part('optics','cylinder',[.7,.59,0],[.55,.45,.55],[0,.4,0],mat('#8bb8cb',.08,.55)),
    part('cover','plate',[0,.93,0],[3.4,.18,2.3],[0,1.8,0],mat('#b9c4cc',.19,.85),'03 / TOP PLATE')
  ];
  parts.at(-1).holes=[[-1.2,-.72,.11],[-1.2,.72,.11],[1.2,-.72,.11],[1.2,.72,.11]];
  for(const x of [-1.2,1.2])for(const z of [-.72,.72]){
    parts.push(part(`standoff-${x}-${z}`,'cylinder',[x,.55,z],[.16,.5,.16],[0,.4,0],mat('#b89756',.3,.85)));
    parts.push(part(`bolt-${x}-${z}`,'cylinder',[x,1.1,z],[.16,.22,.16],[0,2.25,0],mat('#afb4bf',.22,.9)));
  }
  for(let i=0;i<7;i++)parts.push(part('trace-'+i,'box',[-.8+i*.21,.367,.6],[.07,.008,.5],[0,.4,0],mat('#bb9450',.27,.8)));
  return {illustrative:true,parts};
}
