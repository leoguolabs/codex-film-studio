// Generic period-print treatment and physical paper timing; no film content.
export const clamp=x=>Math.max(0,Math.min(1,x));
export const settle=x=>1-(1-clamp(x))**3;
export function montagePose(index,frame,{fps=24,dealSeconds=2.7,flipSeconds=2.1}={}){
  if(!Number.isInteger(index)||index<0||index>8||!Number.isInteger(frame)||frame<0||![fps,dealSeconds,flipSeconds].every(x=>Number.isFinite(x)&&x>0))throw Error('Invalid montage frame/card/clock');
  const time=frame/fps,local=clamp((time-index*dealSeconds/9)/.32),flip=clamp((time-dealSeconds)/flipSeconds);
  const column=index<5?index:index-5,row=index<5?0:1;
  return {visible:local>0,x:(column+(row?.5:0))/5,y:row/2,enter:settle(local),rotation:(1-settle(local))*(-.18+index*.035),flip,index};
}
export function paperTurn(progress,width){
  const angle=clamp(progress)*Math.PI;
  return {scaleX:Math.cos(angle),shadow:Math.sin(angle)*.35,edge:width*Math.cos(angle),back:angle>Math.PI/2};
}
export function transitionMask(c,type,p,w,h){
  p=clamp(p);c.beginPath();
  if(type==='iris')c.arc(w/2,h/2,Math.hypot(w,h)*.5*p,0,Math.PI*2);
  else if(type==='blinds'){for(let i=0;i<10;i++)c.rect(0,i*h/10,w,h/10*p);}
  else if(type==='clock'){c.moveTo(w/2,h/2);c.arc(w/2,h/2,Math.hypot(w,h),-Math.PI/2,-Math.PI/2+p*Math.PI*2);c.closePath();}
  else c.rect(0,0,w,h);
  c.clip();
}
export function printFinish(c,frame,width,height){
  const im=c.getImageData(0,0,width,height),d=im.data;let seed=(frame+17)|0;
  const exposure=1+.009*Math.sin(frame*.73);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;seed=(Math.imul(seed,1664525)+1013904223)|0;
    const grain=((seed>>>0)/4294967296-.5)*7;
    const vignette=1-.18*(((x/width-.5)*2)**2+((y/height-.5)*2)**2);
    const l=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)*exposure*vignette+grain;
    d[i]=l*1.04;d[i+1]=l;d[i+2]=l*.91;
  }
  c.putImageData(im,0,0);
}
