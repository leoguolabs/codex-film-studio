import {printFrame} from './engine/studio.js';
export function draw(g,frame,cue){
  printFrame(g,{},(mask,colour)=>{},cue,frame/24);
}
