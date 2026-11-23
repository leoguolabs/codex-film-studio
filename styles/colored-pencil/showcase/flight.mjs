// All coordinates are on the same 1024 × 1536 pencil plate, including the contact points.
const journey = document.querySelector('.journey');
const viewport = journey.querySelector('.viewport');
const woods = journey.querySelector('.woodland');
const seed = journey.querySelector('.traveller');
const wing = seed.querySelector('img');
const foreground = journey.querySelector('.spray');
const note = journey.querySelector('.margin-note');
const label = journey.querySelector('.seed-label');
const shadow = journey.querySelector('.landing-shadow');
const shade = journey.querySelector('.forest-shade');
const paper = journey.querySelector('.morning-paper');
const opening = journey.querySelector('.opening');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const mix = (a,b,t) => a+(b-a)*t;
function ease(a,b,x) { const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u); }
function point(x,y) { return 'translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0)'; }

// Unequal sideways excursions leave the kernel descending as its single wing turns.
const path = [
  [0,665,444],[.055,664,444],[.12,623,487],[.22,540,565],
  [.34,463,660],[.46,550,752],[.57,628,838],[.68,532,956],
  [.775,505,1047],[.85,585,1131],[.91,653,1184],[.943,661,1191],
  [1,661,1191]
];
// A smooth tangent at each knot. Flatten a coordinate at each change of direction;
// this also keeps the landing on the moss without overshooting the ground.
function slope(a,b,k){
  return (path[b][k]-path[a][k])/(path[b][0]-path[a][0]);
}
function tangent(i,k){
  if(i===0 || i===path.length-1) return 0;
  const a=slope(i-1,i,k),b=slope(i,i+1,k);
  return a*b<=0 ? 0 : 2*a*b/(a+b);
}
function sample(t,k){
  let i=0;
  while(i<path.length-2 && t>path[i+1][0])i++;
  const a=path[i],b=path[i+1],d=b[0]-a[0],u=clamp((t-a[0])/d,0,1);
  const u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*a[k]+(u3-2*u2+u)*d*tangent(i,k)
    +(-2*u3+3*u2)*b[k]+(u3-u2)*d*tangent(i+1,k);
}
let width=0,height=0,travel=0,top=0,requested=0;
function resize(){
  width=viewport.clientWidth;height=viewport.clientHeight;
  top=journey.getBoundingClientRect().top+scrollY;
  travel=Math.max(1,journey.offsetHeight-height);
  requestFrame();
}
function frame(){
  requested=0;
  if(!height||!width)return;
  const t=reduced.matches ? 0 : clamp((scrollY-top)/travel,0,1);
  const narrow=width<=680;
  const departure=ease(.025,.22,t), landing=ease(.85,.945,t);
  const inFlight=departure*(1-landing);
  const x=sample(t,1),y=sample(t,2);
  const base=Math.max(width/1024,height/(narrow?850:650),height/1536);
  const zoom=base*(1+.20*departure-.09*landing);
  const attention=ease(.10,.55,t);
  // The lens drifts less than the seed, so the wind remains legible even while tracking.
  const cameraX=mix(665,mix(562,x,.36),attention);
  const aimX=mix(narrow ? .685 : .67,.50,attention)*width;
  const tx=clamp(aimX-cameraX*zoom,width-1024*zoom,0);
  const aimY=mix(narrow ? .415 : .55,.57,departure)-.16*ease(.88,1,t);
  const ty=clamp(aimY*height-y*zoom,height-1536*zoom,0);
  woods.style.width='1024px';
  woods.style.transform=point(tx,ty)+' scale('+zoom.toFixed(5)+')';

  const sx=tx+x*zoom,sy=ty+y*zoom;
  // Projection of a tilted rotating wing. The dark kernel is the pivot; the wing
  // shortens whenever it turns edge-on and lengthens again after half a turn.
  const cycles=2.15*ease(.115,.91,t);
  const phi=2*Math.PI*cycles;
  const dx=Math.cos(phi),dy=.40*Math.sin(phi)-.12;
  const length=Math.hypot(dx,dy);
  const airborneAngle=Math.atan2(dy,dx)*180/Math.PI;
  // Accumulate the angle before easing into the turn and before settling on the last scale.
  const winding=airborneAngle+360*Math.round((phi*180/Math.PI-airborneAngle)/360);
  const takeoff=ease(.06,.21,t);
  const startAngle=140, restAngle=703;
  const angle=mix(mix(startAngle,winding,takeoff),restAngle,landing);
  const foreshortening=mix(mix(1,length,takeoff),.90,landing);
  const size=clamp(48*zoom,32,85)*(1+1.42*inFlight);
  const kernelLift=1.4*inFlight*Math.sin(phi);
  seed.style.width=size.toFixed(2)+'px';
  seed.style.transform=point(sx-size*.13,sy-size*.33*.6+kernelLift);
  wing.style.transform='rotate('+angle.toFixed(2)+'deg) scaleX('+foreshortening.toFixed(4)+')';
  seed.style.opacity='1';

  const ghost=ease(.79,.94,t);
  shadow.style.transform=point(sx-size*.09,ty+1194*zoom)+' rotate(-9deg) scale('+(.3+.62*ghost)+')';
  shadow.style.opacity=(.43*ghost).toFixed(3);
  const pass=ease(.26,.68,t);
  const sprayW=clamp(width*(narrow ? .70 : .46),175,760);
  foreground.style.width=sprayW+'px';
  foreground.style.transform=point(-sprayW*(.56+.16*pass),height*mix(1.06,-.9,pass))+' rotate('+(-8-11*pass)+'deg)';
  foreground.style.opacity=(.86*ease(.25,.36,t)*(1-ease(.55,.68,t))).toFixed(3);
  label.style.transform=point(sx+size*.36,sy+size*.31);
  label.style.opacity=((1-ease(.035,.12,t))*.98).toFixed(3);
  const intro=1-ease(.025,.20,t);
  opening.style.opacity=intro.toFixed(3);
  opening.inert=intro<.02;
  opening.style.transform=point(0,-(1-intro)*height*.055);
  paper.style.opacity=intro.toFixed(3);
  note.style.opacity=(ease(.28,.38,t)*(1-ease(.54,.64,t))).toFixed(3);
  shade.style.opacity=ease(.76,1,t).toFixed(3);
}
function requestFrame(){if(!requested)requested=requestAnimationFrame(frame);}
document.documentElement.classList.add('has-flight');
new ResizeObserver(resize).observe(viewport);
window.addEventListener('scroll',requestFrame,{passive:true});
window.addEventListener('resize',resize,{passive:true});
reduced.addEventListener('change',resize);
window.addEventListener('pageshow',resize);
resize();
