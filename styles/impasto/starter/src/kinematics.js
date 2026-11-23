// Planar rigid transforms use Canvas' [a,b,c,d,tx,ty] convention.
export function point(m, [x, y]) {
  return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
}
export function compose(a,b) {
  const [tx,ty]=point(a,[b[4],b[5]]);
  return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
          a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],tx,ty];
}
// Clamp a requested reach to feasible elbow angles. Return the actual end
// joint so a prop can follow its carrier. Shared contacts still require blocking.
export function twoBone(root,target,upper,lower,bend=1,maxAngle=166,minAngle=19) {
  if(!(upper>0&&lower>0&&minAngle>0&&maxAngle<180&&minAngle<=maxAngle) ||
     ![...root,...target,upper,lower,minAngle,maxAngle].every(Number.isFinite) || Math.abs(bend)!==1)
    throw new RangeError('Invalid joint geometry or bend direction');
  const dx=target[0]-root[0],dy=target[1]-root[1],distance=Math.hypot(dx,dy);
  const extent=angle=>Math.sqrt(upper**2+lower**2-2*upper*lower*Math.cos(angle*Math.PI/180));
  const d=Math.max(extent(minAngle),Math.min(extent(maxAngle),distance));
  const ux=distance>1e-8?dx/distance:0,uy=distance>1e-8?dy/distance:1;
  const along=(upper**2-lower**2+d*d)/(2*d);
  const across=bend*Math.sqrt(Math.max(0,upper**2-along**2));
  return {root, joint:[root[0]+along*ux-across*uy,root[1]+along*uy+across*ux],
          end:[root[0]+d*ux,root[1]+d*uy],upper,lower};
}
