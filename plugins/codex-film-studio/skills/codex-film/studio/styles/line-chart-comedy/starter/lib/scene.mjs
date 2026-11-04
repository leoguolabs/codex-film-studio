import {drawChart} from './chart.mjs';
import {layers,polygon} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const chart=s.shot.chart||(s.shot.proof?{bounds:{x:s.plan.width*.15,y:s.plan.height*.15,width:s.plan.width*.7,height:s.plan.height*.6},domain:{x:[0,3],y:[0,1]},series:[{color:s.profile.accent,values:[[0,.1],[1,.3],[2,.25],[3,.8]]},{color:s.profile.secondary,values:[[0,.6],[1,.4],[2,.5],[3,.3]]}]}:null);
  if(chart)drawChart(c,chart,s.progress);
  await layers(c,s,(c,l)=>polygon(c,l.points,l.fill,l.stroke));
}
