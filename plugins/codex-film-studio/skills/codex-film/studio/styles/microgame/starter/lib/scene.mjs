import {background,materialPass,palettes} from '../engine/materials.mjs';
import {drawGame} from '../engine/games.mjs';
import {layers,proofLayers,polygon} from '../tools/runtime/layers.mjs';
const cache=new Map();
export async function drawStyle(c,s){
  const medium=s.shot.medium||'crayon';
  if(!palettes[medium])throw Error(`Unknown microgame medium: ${medium}`);
  if(s.shot.game){
    if(s.plan.fps!==30)throw Error('The retained game action engine requires a 30 fps timeline');
    if(s.plan.width/s.plan.height!==540/960)throw Error('Use engine/widescreen.mjs and authored camera layout for landscape games');
    const game={...s.shot.game,medium:s.shot.game.medium||medium,start:s.shot.start,end:s.shot.end};
    if(!palettes[game.medium]||!game.command||!game.action||!game.object||!s.plan.hero||
       !Number.isFinite(game.character_fps)||game.character_fps<=0||!Number.isFinite(game.bpm)||game.bpm<=0||
       ![0,1,2].includes(game.round)||typeof game.success!=='boolean')throw Error('Author game medium/action/object/command/character_fps/bpm/round/success and plan.hero');
    let stage=cache.get('game-stage');if(!stage){stage=s.createCanvas(540,960);cache.set('game-stage',stage);}
    const target=stage.getContext('2d');target.resetTransform();target.clearRect(0,0,540,960);
    drawGame(target,game,s.localFrame/s.plan.fps,s.plan,s.createCanvas,cache);
    c.drawImage(stage,0,0,s.plan.width,s.plan.height);return;
  }
  background(c,medium,s.createCanvas,cache);
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  await layers(c,{...s,shot},(c,l)=>polygon(c,l.points,l.fill,l.stroke,4));
  materialPass(c,medium,cache,{width:s.plan.width,height:s.plan.height});
}
