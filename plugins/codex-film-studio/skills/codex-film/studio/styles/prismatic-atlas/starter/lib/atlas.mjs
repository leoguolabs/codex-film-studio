// Subject-independent geometry/timing helpers. No film composition or cast.
export const palette = Object.freeze({indigo:'#100c46',violet:'#452481',cyan:'#39dcdf',teal:'#2398aa',coral:'#f27460',pink:'#ef79a7',gold:'#ffbe46',highlight:'#adf7e9'});
export function clamp(v,min=0,max=1){return Math.max(min,Math.min(max,v));}
export function smooth(v){v=clamp(v);return v*v*(3-2*v);}
export function shotAt(timeline,frame){
 if(!Number.isInteger(frame)||frame<0||frame>=timeline.duration_frames)throw new RangeError('Frame outside timeline');
 const shot=timeline.shots.find(s=>s.start<=frame&&frame<s.end);
 if(!shot)throw new RangeError('Uncovered frame');
 return {shot,localFrame:frame-shot.start,seconds:(frame-shot.start)/timeline.fps,progress:(frame-shot.start)/(shot.end-shot.start)};
}
export function iso(x,y,z=0,{origin=[0,0],scale=1,slope=.5}={}){return [origin[0]+(x-y)*scale,origin[1]+(x+y)*slope*scale-z*scale];}
export function polygon(ctx,points,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
export function prism(ctx,{center=[0,0],radius=100,depth=35,squash=.5,rotation=0,top=palette.highlight,sides=[palette.teal,palette.cyan,palette.violet]}){
 const p=Array.from({length:6},(_,i)=>[center[0]+radius*Math.cos(rotation+i*Math.PI/3),center[1]+radius*squash*Math.sin(rotation+i*Math.PI/3)]);
 // The front half is selected by screen y, so face order follows geometry.
 const faces=p.map((a,i)=>({a,b:p[(i+1)%6],mid:(a[1]+p[(i+1)%6][1])/2})).filter(f=>f.mid>=center[1]).sort((a,b)=>a.mid-b.mid);
 faces.forEach((f,i)=>polygon(ctx,[f.a,f.b,[f.b[0],f.b[1]+depth],[f.a[0],f.a[1]+depth]],sides[i%sides.length]));polygon(ctx,p,top);
}
export function eventSample(frame,fps,sampleRate){return Math.round(frame*sampleRate/fps);}
