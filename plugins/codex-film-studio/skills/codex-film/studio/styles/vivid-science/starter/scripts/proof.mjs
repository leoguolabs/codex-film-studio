import {createCanvas} from '@napi-rs/canvas';
import {palette as p,ellipse,transform} from '../lib/vector.mjs';
import fs from 'node:fs';
const canvas=createCanvas(1280,720),c=canvas.getContext('2d');c.fillStyle=p.ink;c.fillRect(0,0,1280,720);
const shapes=[p.plum,p.cyan,p.coral,p.orange];
shapes.forEach((color,i)=>transform(c,{x:190+i*300,y:350},()=>{ellipse(c,0,14,110,126,p.plum);ellipse(c,0,0,103,114,color);ellipse(c,-26,-42,53,29,p.cream);ellipse(c,38,44,22,15,p.yellow)}));
for(let i=0;i<7;i++){c.fillStyle=Object.values(p)[i];c.fillRect(90+i*160,600,140,28)}
fs.mkdirSync('review',{recursive:true});fs.writeFileSync('review/material-proof.png',canvas.toBuffer('image/png'));console.log('Abstract material proof: review/material-proof.png');
