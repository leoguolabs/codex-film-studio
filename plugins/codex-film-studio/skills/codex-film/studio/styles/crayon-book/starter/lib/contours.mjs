// Round selected soft forms without moving the endpoints of an open stroke.
// The quadratic corner remains inside its two adjacent edge segments.
export function roundCorners(points,radius=6,{closed=true,steps=6}={}){
 if(!Number.isFinite(radius)||radius<0||!Number.isInteger(steps)||steps<1)throw new Error('Invalid corner radius or sampling');
 if(!Array.isArray(points)||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))throw new Error('Invalid contour points');
 if(points.length<3||radius===0)return points.map(p=>[...p]);
 const out=[];
 for(let i=0;i<points.length;i++){
  const b=points[i];
  if(!closed&&(i===0||i===points.length-1)){out.push([...b]);continue;}
  const a=points[(i+points.length-1)%points.length],c=points[(i+1)%points.length];
  const before=Math.hypot(a[0]-b[0],a[1]-b[1]),after=Math.hypot(c[0]-b[0],c[1]-b[1]);
  const d=Math.min(radius,before*.45,after*.45);
  if(d<1e-8){out.push([...b]);continue;}
  const start=[b[0]+(a[0]-b[0])*d/before,b[1]+(a[1]-b[1])*d/before];
  const end=[b[0]+(c[0]-b[0])*d/after,b[1]+(c[1]-b[1])*d/after];
  for(let j=0;j<=steps;j++){
   const t=j/steps,u=1-t;
   out.push([u*u*start[0]+2*u*t*b[0]+t*t*end[0],u*u*start[1]+2*u*t*b[1]+t*t*end[1]]);
  }
 }
 return out;
}
