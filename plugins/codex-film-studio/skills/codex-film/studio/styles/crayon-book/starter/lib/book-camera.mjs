// Camera framing for a drawing that already occupies a fixed physical page.
// The scene and its page never change size relative to the desk or hinge.
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function bookCamera(progress,{width,height,page,revealEnd=.20,pushStart=.65,finalScale=1.85}){
 if(![progress,width,height,page.x,page.y,page.width,page.height,revealEnd,pushStart,finalScale].every(Number.isFinite)
  ||width<=0||height<=0||page.width<=0||page.height<=0||page.x<0||page.y<0
  ||page.x+page.width>width||page.y+page.height>height
  ||revealEnd<=0||revealEnd>=pushStart||pushStart>=1||finalScale<1)throw new Error('Invalid book camera geometry or timing');
 const startScale=Math.max(width/page.width,height/page.height);
 const pageX=page.x+page.width/2,pageY=page.y+page.height/2;
 const pull=smooth(progress/revealEnd),push=smooth((progress-pushStart)/(1-pushStart));
 const scale=1+(startScale-1)*(1-pull)+(finalScale-1)*push;
 const pageWeight=1-pull+push;
 const centerX=Math.max(width/(2*scale),Math.min(width-width/(2*scale),width/2+(pageX-width/2)*pageWeight));
 const centerY=Math.max(height/(2*scale),Math.min(height-height/(2*scale),height/2+(pageY-height/2)*pageWeight));
 return {scale,centerX,centerY,translateX:width/2-centerX*scale,translateY:height/2-centerY*scale};
}
