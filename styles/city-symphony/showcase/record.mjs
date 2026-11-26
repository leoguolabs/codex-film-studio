const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
function ease(a, b, n) {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function loadImage(url) {
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function mountRecord(section, onStage) {
  const canvas = section.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const [record, atlas] = await Promise.all([loadImage('record.avif'), loadImage('windows.avif')]);
  const frame = canvas.parentElement;
  const quiet = matchMedia('(prefers-reduced-motion: reduce)');
  const follow = section.querySelector('#follow');
  let width = 0, height = 0, progress = 0, target = 0, raf = 0, guided = 0, last = 0;
  let stage = -1, active = true;
  const tau = Math.PI * 2;

  function ring(radius, color, weight = 1) {
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, tau); ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
  }
  function label(text, radius, start, step) {
    for (let i = 0; i < text.length; i++) {
      const ang = start + i * step;
      ctx.save(); ctx.rotate(ang); ctx.fillText(text[i], 0, -radius); ctx.restore();
    }
  }
  function disc(r, t, opacity) {
    ctx.save(); ctx.globalAlpha = opacity;
    ctx.rotate(-.16 + .99 * ease(0,.70,t));
    ctx.fillStyle = '#101514'; ctx.shadowColor = '#030b09aa'; ctx.shadowBlur = r * .09; ctx.shadowOffsetY = r * .05;
    ctx.beginPath(); ctx.arc(0,0,r,0,tau); ctx.fill(); ctx.shadowColor='transparent';
    ctx.save(); ctx.beginPath();ctx.arc(0,0,r*.906,0,tau);ctx.clip();
    ctx.drawImage(record,-r*.906,-r*.906,r*1.812,r*1.812);
    for (let i=26;i<91;i+=1.4) ring(r*i/100, i%3>1.6?'#19110e50':'#f3d0a835',Math.max(.65,r*.0022));
    const sheen=ctx.createLinearGradient(-r,-r,r*.85,r);
    sheen.addColorStop(0,'#fff1af38');sheen.addColorStop(.31,'#ebf4ff03');sheen.addColorStop(.53,'#09161800');sheen.addColorStop(.80,'#0b171b3e');sheen.addColorStop(1,'#e7dfb526');
    ctx.fillStyle=sheen;ctx.fillRect(-r,-r,2*r,2*r);ctx.restore();
    ring(r-.5,'#9e9d71',1);ring(r*.985,'#cac39362');ring(r*.915,'#98875a99');ring(r*.902,'#eee0b367');
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e1d6af';ctx.font='500 '+Math.max(7,r*.038)+'px monospace';
    label('CHONGQING   /   SAN FRANCISCO   /   NEW YORK HARBOR',r*.946,-1.60,.052);
    label('CITY SYMPHONY   •   FIELD RECORDINGS',r*.946,2.02,.050);
    const a=r*.205;ctx.fillStyle='#e8855e';ctx.beginPath();ctx.arc(0,0,a,0,tau);ctx.fill();ring(a-.5,'#ecca9d');ring(a*.91,'#7e412b');ring(a*.84,'#ad5c3b');
    ctx.fillStyle='#3d3023';ctx.font='600 '+Math.max(7,r*.032)+'px monospace';ctx.fillText('SIDE  A',0,-a*.48);
    ctx.font='italic '+Math.max(9,r*.049)+'px Georgia';ctx.fillText('Symphony',0,a*.45);
    ctx.beginPath();ctx.arc(0,0,Math.max(2,a*.088),0,tau);ctx.fillStyle='#18201b';ctx.fill();ring(a*.13,'#ffdc9f');
    ctx.restore();
  }
  // Each panel holds a different photographed moment. Successive layouts dissolve on musical subdivisions.
  const printOrders = [[0,2],[0,2,5,6],[0,1,2,5,6,7,8,11,13],Array.from({length:16},(_,i)=>i)];
  function windows(count, sheetW, sheetH) {
    const cols=[2,2,3,4][count], rows=[1,2,3,4][count];
    const cellW=sheetW/cols,cellH=sheetH/rows,gutter=Math.max(1.2,sheetW*.0045);
    printOrders[count].forEach((index,i)=>{
      const dx=-sheetW/2+i%cols*cellW,dy=-sheetH/2+Math.floor(i/cols)*cellH;
      const ratio=(cellW-gutter)/(cellH-gutter);
      const tileW=atlas.naturalWidth/4, tileH=atlas.naturalHeight/4;
      const sh=Math.min(tileH,tileW/ratio), sw=sh*ratio;
      ctx.drawImage(atlas,index%4*tileW+(tileW-sw)/2,Math.floor(index/4)*tileH+(tileH-sh)/2,sw,sh,dx+gutter/2,dy+gutter/2,cellW-gutter,cellH-gutter);
    });
  }
  function render(t) {
    ctx.clearRect(0,0,width,height);
    const r=Math.min(width*.444,height*.438);
    const midY=height*.477;
    ctx.save();ctx.translate(width/2,midY);
    const opening=ease(.24,.58,t);
    ctx.save(); ctx.globalAlpha=.47*(1-opening);
    ring(r*1.052,'#99a58d44',.8);
    for(let i=0;i<90;i++){const a=i*tau/90;const m=i%5===0?1.067:1.054;ctx.beginPath();ctx.moveTo(Math.sin(a)*r*1.046,-Math.cos(a)*r*1.046);ctx.lineTo(Math.sin(a)*r*m,-Math.cos(a)*r*m);ctx.strokeStyle=i%5===0?'#ccc199':'#81917c';ctx.lineWidth=1;ctx.stroke()}
    ctx.restore();
    if(opening<1)disc(r*(1-.085*opening),t,1-ease(.37,.58,t));
    if(opening>0) {
      const sheetW=Math.min(width*.93,height*1.25)*(0.80+.20*opening),sheetH=sheetW*9/13;
      const alpha=ease(.24,.46,t);
      ctx.save();ctx.globalAlpha=alpha;ctx.rotate(-.115*(1-opening));
      ctx.beginPath();ctx.rect(-sheetW/2,-sheetH/2*opening,sheetW,sheetH*opening);ctx.clip();
      ctx.fillStyle='#101b18';ctx.fillRect(-sheetW/2,-sheetH/2,sheetW,sheetH);
      const starts=[.26,.49,.665,.83];
      let level=0;while(level<3 && t>=starts[level+1])level++;
      if(level>0)windows(level-1,sheetW,sheetH);
      ctx.globalAlpha=alpha*(level===0?1:ease(starts[level],starts[level]+.09,t));
      windows(level,sheetW,sheetH);ctx.restore();
      const edge=ease(.55,.75,t);ctx.save();ctx.globalAlpha=edge;ctx.strokeStyle='#afa47f';ctx.lineWidth=1;ctx.strokeRect(-sheetW/2-3,-sheetH/2-3,sheetW+6,sheetH+6);ctx.restore();
    }
    ctx.restore();
    const current=t<.32?0:t<.52?1:t<.70?2:t<.86?3:4;
    if(current!==stage){stage=current;onStage(stage)}
    section.style.setProperty('--played',String(.018+.982*t));canvas.dataset.stage=String(current);
  }
  function extent(){return Math.max(1,section.offsetHeight-section.querySelector('.pin').offsetHeight)}
  function read(){target=quiet.matches?0:clamp(-section.getBoundingClientRect().top/extent());if(active&&!raf)raf=requestAnimationFrame(tick)}
  function tick(now){
    const dt=last?Math.min(65,now-last):16;last=now;
    progress+=(target-progress)*(1-Math.exp(-dt/110));
    if(Math.abs(target-progress)<.00035)progress=target;
    render(progress);raf=progress!==target && active?requestAnimationFrame(tick):0;
  }
  function size(){
    const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
    const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);read();render(progress);
  }
  function stop(){if(guided)cancelAnimationFrame(guided);guided=0;follow.setAttribute('aria-pressed','false')}
  function guide(){
    if(guided){stop();return}
    if(quiet.matches){document.querySelector('#screening').scrollIntoView();return}
    const start=window.scrollY, end=document.querySelector('#screening').getBoundingClientRect().top+start;
    const duration=Math.max(1900,10000*clamp((end-start)/section.offsetHeight)),began=performance.now();
    follow.setAttribute('aria-pressed','true');
    const advance=now=>{const u=clamp((now-began)/duration);window.scrollTo(0,start+(end-start)*ease(0,1,u));if(u<1)guided=requestAnimationFrame(advance);else stop()};
    guided=requestAnimationFrame(advance);
  }
  window.addEventListener('scroll',read,{passive:true});
  for(const event of ['wheel','touchstart','keydown','pointerdown']) window.addEventListener(event,e=>{if(!follow.contains(e.target))stop()},{passive:true});
  follow.addEventListener('click',guide);quiet.addEventListener('change',()=>{stop();size()});
  new ResizeObserver(size).observe(frame);
  new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active)read();else if(raf){cancelAnimationFrame(raf);raf=0}},{rootMargin:'90px'}).observe(section);
  size();frame.classList.add('painted');
}
