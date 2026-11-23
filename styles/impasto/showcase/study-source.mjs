// Regenerate the gallery's light study in a browser with the film's WebGL2 renderer.
// Save makeLightAtlas().toDataURL('image/webp', .9) as light-study.webp.
import {Impasto, Strokes, KNIFE} from '../engine/impasto.js';

export function makeLightAtlas() {
  const width = 720, height = 284;
  const swatch = document.createElement('canvas');
  const renderer = new Impasto(swatch, {W: width, H: height, ss: 2});
  const paint = new Strokes();
  let seed = 9841;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const mix = (a, b, t) => a.map((channel, i) => channel + (b[i] - channel) * t);
  const linen = [.79, .73, .60];
  for (let i = 0; i < 440; ++i) {
    const colour = mix(linen, [.97, .93, .83], random() * .65);
    paint.push({x: random()*width, y: random()*height, len: 17+random()*95, wid: 4+random()*22,
      ang: -.36+random()*.10, c: colour, c2: linen, hgt: .12, seed: random()*100});
  }
  const pigments = [
    [[.06,.16,.20],[.19,.38,.44]],
    [[.05,.35,.38],[.31,.63,.59]],
    [[.83,.48,.11],[1,.75,.28]],
    [[.68,.19,.10],[.99,.40,.19]],
  ];
  pigments.forEach(([shadow,highlight], i) => {
    const centre = 111+i*161;
    for (let j = 0; j < 38; ++j) {
      const spread = (random()-.5)*103;
      const tone = mix(shadow,highlight,.12+random()*.76);
      paint.push({type:KNIFE,x:centre+spread,y:146+spread*.23+(random()-.5)*54,
        len:121+random()*69,wid:14+random()*35,ang:-1.14+random()*.16,
        c:tone,c2:mix(tone,highlight,.35+random()*.3),seed:random()*100,
        hgt:.9+random()*.95,bend:.1+random()*.32,skew:.2,taper:.38});
    }
  });
  const colours = renderer.batch(paint.data());
  renderer.begin();
  renderer.draw(colours);
  const out = document.createElement('canvas');
  out.width = width*4; out.height = height*3;
  const ctx = out.getContext('2d');
  for (let step = 0; step < 12; ++step) {
    const radians = (-82.5 + step*15)*Math.PI/180;
    renderer.finish({light:[Math.sin(radians),-Math.cos(radians),.35],ground:linen,
      amb:.73,dif:.42,norm:5.2,spec:.3,ao:1.5,vig:.08,shin:23});
    ctx.drawImage(swatch,(step%4)*width,Math.floor(step/4)*height);
  }
  return out;
}
