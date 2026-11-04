export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const lerp=(a,b,t)=>a+(b-a)*t;
export const palette={ink:'#180d49',plum:'#6f34aa',cyan:'#4bdcc7',coral:'#fa6558',orange:'#ff922e',yellow:'#ffe04b',cream:'#fff5cf'};
export function transform(ctx,{x=0,y=0,scale=1,rotation=0},draw){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);draw(ctx);ctx.restore()}
export function ellipse(ctx,x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
export function frameToSample(frame,fps,sampleRate){return Math.round(frame*sampleRate/fps)}
export function shotAt(shots,frame){return shots.find(s=>s.start<=frame&&frame<s.end)}
export function camera(ctx,{x,y,zoom},draw){ctx.save();ctx.translate(x,y);ctx.scale(zoom,zoom);ctx.translate(-x,-y);draw(ctx);ctx.restore()}

// Filled contour around a cubic centreline; widths are half-widths in local units.
// Draw the root beneath its host shape so the flat closure remains occluded.
export function cubicRibbonPath(points,{rootWidth=6,tipWidth=0.5,steps=24}={}){
 if(points.length!==4||!points.every(p=>p.length===2&&p.every(Number.isFinite)))throw new TypeError('Expected four finite 2D control points');
 if(!Number.isInteger(steps)||steps<2||![rootWidth,tipWidth].every(n=>Number.isFinite(n)&&n>=0))throw new RangeError('Invalid ribbon width or sampling count');
 const left=[],right=[],[a,b,c,d]=points;
 for(let i=0;i<=steps;i++){
  const u=i/steps,v=1-u;
  const x=v*v*v*a[0]+3*v*v*u*b[0]+3*v*u*u*c[0]+u*u*u*d[0];
  const y=v*v*v*a[1]+3*v*v*u*b[1]+3*v*u*u*c[1]+u*u*u*d[1];
  const dx=3*v*v*(b[0]-a[0])+6*v*u*(c[0]-b[0])+3*u*u*(d[0]-c[0]);
  const dy=3*v*v*(b[1]-a[1])+6*v*u*(c[1]-b[1])+3*u*u*(d[1]-c[1]);
  const length=Math.hypot(dx,dy)||1,width=lerp(rootWidth,tipWidth,smooth(u));
  left.push([x-dy/length*width,y+dx/length*width]);right.push([x+dy/length*width,y-dx/length*width]);
 }
 const edge=pts=>{let path='';for(let i=1;i<pts.length-1;i++)path+=` Q ${pts[i]} ${(pts[i][0]+pts[i+1][0])/2} ${(pts[i][1]+pts[i+1][1])/2}`;return path+` L ${pts.at(-1)}`;};
 return `M ${left[0]}${edge(left)} Q ${d} ${right.at(-1)}${edge(right.reverse())} Z`;
}
