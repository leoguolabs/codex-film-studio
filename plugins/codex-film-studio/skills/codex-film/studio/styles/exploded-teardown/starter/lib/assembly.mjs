import * as THREE from '/node_modules/three/build/three.module.js';
import {RoomEnvironment} from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from '/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {validateModel,lift} from './model.mjs';
let engine;
export function frame({model,progress,width,height,camera:route={}}) {
  const key=JSON.stringify(model);
  if(!engine||engine.key!==key){if(engine)dispose();engine=setup(validateModel(model),width,height);engine.key=key;}
  const {renderer,scene,camera,parts,center,radius}=engine;
  renderer.setSize(width,height,false);camera.aspect=width/height;
  for(const {mesh,part} of parts)mesh.position.fromArray(part.position).addScaledVector(new THREE.Vector3(...part.explode),lift(progress,part.delay||0));
  const azimuth=THREE.MathUtils.degToRad((route.azimuth??32)+(route.travel??-30)*Math.sin(progress*Math.PI)**2);
  const elevation=THREE.MathUtils.degToRad(route.elevation??28);
  if(![azimuth,elevation].every(Number.isFinite)||elevation<.09||elevation>1.4)throw Error('Camera requires finite azimuth/travel and elevation 6–80 degrees');
  const fov=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
  const distance=radius/Math.sin(fov)*1.14;
  camera.position.set(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)).multiplyScalar(distance).add(center);
  camera.lookAt(center);camera.updateProjectionMatrix();scene.updateMatrixWorld(true);
  renderer.render(scene,camera);
  const labels=[];
  for(const {mesh,part} of parts)if(part.label){
    const p=mesh.position.clone().add(new THREE.Vector3(0,part.size[1]/2,0)).project(camera);
    if(p.z<1&&Math.abs(p.x)<.9&&Math.abs(p.y)<.75)labels.push({text:part.label,side:part.labelSide||'left',x:(p.x+1)*width/2,y:(1-p.y)*height/2});
  }
  return {image:renderer.domElement.toDataURL('image/png').split(',')[1],labels,
    positions:parts.map(({mesh,part})=>({id:part.id,position:mesh.position.toArray()})),cameraClearance:distance-radius};
}
function setup(model,width,height){
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(width,height);renderer.setClearColor('#101318');
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,width/height,.01,1000);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  const parts=[],bounds=new THREE.Box3();
  for(const part of model.parts){
    const [x,y,z]=part.size;let geometry;
    if(part.shape==='box')geometry=new RoundedBoxGeometry(x,y,z,3,Math.min(x,y,z)*.12);
    if(part.shape==='plate'){
      const shape=new THREE.Shape();shape.moveTo(-x/2,-z/2);shape.lineTo(x/2,-z/2);shape.lineTo(x/2,z/2);shape.lineTo(-x/2,z/2);shape.closePath();
      for(const [hx,hz,r] of part.holes||[]){const hole=new THREE.Path();hole.absarc(hx,-hz,r,0,Math.PI*2,true);shape.holes.push(hole);}
      geometry=new THREE.ExtrudeGeometry(shape,{depth:y,bevelEnabled:true,bevelThickness:y*.06,bevelSize:y*.06,bevelSegments:2,steps:1,curveSegments:24});
      geometry.rotateX(-Math.PI/2);geometry.translate(0,-y/2,0);
    }
    if(part.shape==='cylinder')geometry=new THREE.CylinderGeometry(x/2,z/2,y,48);
    if(part.shape==='sphere')geometry=new THREE.SphereGeometry(.5,40,24).scale(x,y,z);
    if(part.shape==='mesh'){geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.vertices,3));geometry.computeVertexNormals();}
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial(part.material));mesh.position.fromArray(part.position);if(part.rotation)mesh.rotation.fromArray([...part.rotation,'XYZ']);
    mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);parts.push({mesh,part});
    mesh.updateMatrixWorld();bounds.union(new THREE.Box3().setFromObject(mesh));
    mesh.position.add(new THREE.Vector3(...part.explode));mesh.updateMatrixWorld();bounds.union(new THREE.Box3().setFromObject(mesh));mesh.position.fromArray(part.position);
  }
  const center=bounds.getCenter(new THREE.Vector3()),radius=bounds.getSize(new THREE.Vector3()).length()/2;
  camera.near=Math.max(1e-8,radius/10000);camera.far=Math.max(100,radius*30);
  const add=(color,intensity,pos)=>{const l=new THREE.DirectionalLight(color,intensity);l.position.copy(center).add(new THREE.Vector3(...pos).multiplyScalar(radius));l.target.position.copy(center);scene.add(l,l.target);return l;};
  const key=add('#fff0de',3,[-2,3,2]);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-radius*2;key.shadow.camera.right=radius*2;key.shadow.camera.top=radius*2;key.shadow.camera.bottom=-radius*2;key.shadow.camera.far=radius*10;key.shadow.normalBias=radius*.002;
  add('#b9d8ff',2,[2,1,-2]);add('#d4deeb',.5,[1,0,3]);scene.add(new THREE.HemisphereLight('#b0c5df','#22201d',.35));
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(radius*40,radius*40),new THREE.MeshStandardMaterial({color:'#03050a',roughness:.85}));
  floor.rotation.x=-Math.PI/2;floor.position.y=bounds.min.y-.06;floor.receiveShadow=true;scene.add(floor);
  return {renderer,scene,camera,parts,center,radius,environment};
}
export function dispose(){if(!engine)return;engine.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});engine.environment.dispose();engine.renderer.dispose();engine=null;}
window.renderAssembly=frame;
