import {groundPoint,project} from './geo.mjs';
// Equirectangular plates only. Source, date, bounds and projection belong to
// the production. Dateline-crossing plates must be split before rendering.
export function preparePlate(image,bounds,createCanvas){
  if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||
    bounds[0]>=bounds[2]||bounds[1]>=bounds[3]||bounds[0]<-180||bounds[2]>180||bounds[1]<-90||bounds[3]>90)throw Error('Invalid west,south,east,north plate bounds');
  const canvas=createCanvas(image.width,image.height),c=canvas.getContext('2d');c.drawImage(image,0,0);
  return {bounds,width:image.width,height:image.height,data:c.getImageData(0,0,image.width,image.height).data};
}
export function drawTerrain(c,camera,plates,{sampleStep=1}={}){
  if(!plates.length)throw Error('Declare real georeferenced imagery for terrain');
  if(!Number.isInteger(sampleStep)||sampleStep<1||sampleStep>8)throw Error('Invalid terrain sampling');
  const image=c.createImageData(camera.width,camera.height),out=image.data;
  for(let y=0;y<camera.height;y+=sampleStep)for(let x=0;x<camera.width;x+=sampleStep){
    const p=groundPoint(camera,x+.5,y+.5);let rgb=[5,12,20];
    if(p)for(const plate of plates){const [west,south,east,north]=plate.bounds,u=(p.lon-west)/(east-west),v=(north-p.lat)/(north-south);
      if(u<0||u>1||v<0||v>1)continue;
      const i=(Math.min(plate.height-1,Math.floor(v*plate.height))*plate.width+Math.min(plate.width-1,Math.floor(u*plate.width)))*4;
      const blend=Math.min(1,Math.min(u,v,1-u,1-v)*40);
      rgb=rgb.map((n,k)=>n*(1-blend)+plate.data[i+k]*blend);
    }
    for(let dy=0;dy<sampleStep&&y+dy<camera.height;dy++)for(let dx=0;dx<sampleStep&&x+dx<camera.width;dx++){
      const i=((y+dy)*camera.width+x+dx)*4;out.set([...rgb,255],i);
    }
  }
  c.putImageData(image,0,0);
}
export function drawGeographicLine(c,camera,coordinates,color='#e4e8e6'){
  c.beginPath();let active=false;
  for(const [lat,lon] of coordinates){const p=project(camera,lat,lon);if(!p){active=false;continue;}if(active)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);active=true;}
  c.strokeStyle=color;c.lineWidth=1.5;c.stroke();
}
