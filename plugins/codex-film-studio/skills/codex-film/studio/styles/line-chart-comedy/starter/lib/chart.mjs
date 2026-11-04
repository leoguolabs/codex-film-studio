// Data geometry never moves to resolve label collisions. Missing values create gaps.
export function seriesPath(series,domain,bounds,progress=1){
  const {x:[xmin,xmax],y:[ymin,ymax]}=domain;
  if(!(xmax>xmin&&ymax>ymin))throw Error('Chart domains must increase');
  const cutoff=xmin+(xmax-xmin)*Math.max(0,Math.min(1,progress));let previous=-Infinity;
  const output=[];
  const xy=(x,y)=>[bounds.x+(x-xmin)/(xmax-xmin)*bounds.width,bounds.y+bounds.height-(y-ymin)/(ymax-ymin)*bounds.height];
  let prev=null;
  for(const [x,y] of series){
    if(!Number.isFinite(x)||x<=previous||y!==null&&!Number.isFinite(y))throw Error('Invalid or unsorted observations');previous=x;
    if(x<=cutoff)output.push(y===null?null:xy(x,y));
    else if(prev&&prev[0]<cutoff&&prev[1]!==null&&y!==null){
      const u=(cutoff-prev[0])/(x-prev[0]);output.push(xy(cutoff,prev[1]+u*(y-prev[1])));
    }
    prev=[x,y];
  }
  return output;
}
export function drawChart(c,chart,progress){
  const {bounds:b,domain,series}=chart;
  c.fillStyle='#fff';c.strokeStyle='#d9dfe7';c.lineWidth=2;c.beginPath();c.roundRect(b.x-40,b.y-45,b.width+80,b.height+100,18);c.fill();c.stroke();
  c.strokeStyle='#e3e7ec';c.lineWidth=1;
  for(let i=0;i<=5;i++){let y=b.y+b.height*i/5;c.beginPath();c.moveTo(b.x,y);c.lineTo(b.x+b.width,y);c.stroke();}
  for(const item of series){let active=false,last=null;c.strokeStyle=item.color;c.lineWidth=3;c.beginPath();
    for(const p of seriesPath(item.values,domain,b,progress)){if(!p){active=false;continue;}if(active)c.lineTo(...p);else c.moveTo(...p);active=true;last=p;}c.stroke();
    if(last){
      c.save();c.translate(...last);const r=item.expression?12:6;
      c.fillStyle=item.color;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
      if(item.expression){
        c.fillStyle='#fff';for(const x of [-4,4]){c.beginPath();c.ellipse(x,-3,3,4,0,0,Math.PI*2);c.fill();}
        c.fillStyle='#182531';for(const x of [-4,4]){c.beginPath();c.arc(x,-2,1.5,0,Math.PI*2);c.fill();}
        c.beginPath();if(item.expression==='shock'){c.ellipse(0,5,3,4,0,0,Math.PI*2);c.fill();}else{c.arc(0,2,5,0,Math.PI);c.strokeStyle='#182531';c.lineWidth=1.5;c.stroke();}
      }
      if(item.label){c.fillStyle=item.color;c.font='15px sans-serif';c.textAlign='left';c.fillText(item.label,18,4);}
      c.restore();
    }}
}
