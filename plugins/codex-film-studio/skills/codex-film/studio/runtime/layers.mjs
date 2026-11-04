// Layout and transforms shared by material-specific scene interpreters.
export const clamp = x => Math.max(0,Math.min(1,x));
export const ease = x => {x=clamp(x);return x*x*(3-2*x);};
export function polygon(c,points,fill,stroke='#242033',width=3) {
  if(!Array.isArray(points)||points.length<2||points.some(p=>p.length!==2||!p.every(Number.isFinite)))throw Error('Invalid polygon');
  c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();
  if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
export async function layers(c,state,shape) {
  for(const layer of state.shot.layers||[]) {
    c.save();
    try {
      const m=layer.motion;
      const held=m?.holdFrames?Math.floor(state.localFrame/m.holdFrames)*m.holdFrames:state.localFrame;
      const t=ease(held/Math.max(1,state.shot.end-state.shot.start-1));
      const x=m?.from?m.from[0]+(m.to[0]-m.from[0])*t:layer.x||0,y=m?.from?m.from[1]+(m.to[1]-m.from[1])*t:layer.y||0;
      const rotation=m?.rotation?m.rotation[0]+(m.rotation[1]-m.rotation[0])*t:layer.rotation||0;
      c.translate(x,y);c.rotate(rotation);c.scale(layer.scale||1,layer.scale||1);
      if(layer.type==='group') {
        await layers(c,{...state,shot:{...state.shot,layers:layer.layers}},shape);
      } else if(layer.type==='text') {
        c.font=`${layer.size||48}px "${layer.font||state.profile.font}"`;c.textAlign=layer.align||'left';c.fillStyle=layer.fill||state.profile.ink;
        if(layer.maxWidth && c.measureText(layer.text).width>layer.maxWidth)throw Error('Text overflows its measured width');
        c.fillText(layer.text,0,0);
      } else if(layer.type==='image') {
        const image=state.assets.get(layer.file);if(!image)throw Error(`Undeclared image: ${layer.file}`);
        c.drawImage(image,0,0,layer.width||image.width,layer.height||image.height);
      } else await shape(c,layer,state);
    } finally {c.restore();}
  }
}
export function proofLayers(state) {
  const {width:w,height:h}=state.plan;
  return [{type:'shape',points:[[0,0],[w*.28,0],[w*.24,h*.33],[w*.04,h*.36]],
    x:w*.15,y:h*.2,fill:state.profile.accent,stroke:state.profile.ink,
    motion:{from:[w*.12,h*.22],to:[w*.22,h*.22]}},
    {type:'shape',points:[[w*.52,h*.25],[w*.79,h*.33],[w*.72,h*.67],[w*.5,h*.55]],fill:state.profile.secondary,stroke:state.profile.ink}];
}
