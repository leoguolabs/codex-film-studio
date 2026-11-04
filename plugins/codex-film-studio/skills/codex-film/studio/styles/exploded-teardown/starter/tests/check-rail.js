// Integration assertion for the default calibration fixture after camera return.
// This checks its specified annotation rail, not arbitrary production composition.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import assert from 'node:assert/strict';
const im=await loadImage(process.argv[2]),c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);
const {data}=g.getImageData(0,0,im.width,im.height);
function textPixels(a,b){let n=0;for(let y=Math.ceil(im.height*.16);y<im.height*.78;y++)for(let x=Math.ceil(im.width*a);x<im.width*b;x++){
 const i=(y*im.width+x)*4;if(data[i]>160&&data[i+1]>150&&data[i+2]>140)n++;
}return n;}
const left=textPixels(.02,.2),right=textPixels(.79,.99);
assert.ok(left>20&&right<3,`Calibration labels switched rails: left=${left}, right=${right}`);
console.log({left,right});
