#include <metal_stdlib>
using namespace metal;
constant float epsilon=0.001;
float hash(float3 p){p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(float3 p){
 float3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+float3(1,0,0)),f.x),mix(hash(i+float3(0,1,0)),hash(i+float3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+float3(0,0,1)),hash(i+float3(1,0,1)),f.x),mix(hash(i+float3(0,1,1)),hash(i+1),f.x),f.y),f.z);
}
struct Shape{float4 loc,xx,yy,zz,tint,kind;};
struct Group{float4 lo,hi;};
float3 local(float3 p,device const Shape &s){float3 d=p-s.loc.xyz;return float3(dot(d,s.xx.xyz),dot(d,s.yy.xyz),dot(d,s.zz.xyz));}
float pressedLine(float2 point,float2 start,float2 end,float width){
 float2 line=end-start;
 float t=clamp(dot(point-start,line)/dot(line,line),0.,1.);
 float d=length(point-start-line*t);
 return 1.-smoothstep(width*.20,width*mix(1.,.24,t),d);
}
// A curved pass of a rounded stylus compresses clay and rolls a little up one edge.
float pressedStroke(float2 p,float2 a,float2 middle,float2 end,float radius,float tail,float bank,float bankWidth,float wander,float slant,float side){
 float2 chord=end-a;
 float t=clamp(dot(p-a,chord)/dot(chord,chord),0.f,1.f);
 float s=1.-t;
 float2 centre=s*s*a+2.*s*t*middle+t*t*end;
 float2 tangent=normalize(s*(middle-a)+t*(end-middle));
 float2 normal=float2(-tangent.y,tangent.x);
 float envelope=sin(3.14159*t);
 centre+=normal*wander*envelope*(.59*sin(11.*t+.8*side)+.41*sin(19.*t-.37));
 float2 delta=p-centre;
 float pinch=.86+.14*sin(3.14159*t);
 float width=radius*pinch*(1.-.26*t+.08*envelope*sin(9.*t+side));
 float across=dot(delta,normal)/width,along=dot(delta,tangent)/width;
 float roundness=exp(-1.35*(across*across+along*along));
 float ridge=(across-(1.17+slant))/bankWidth;
 float edge=bank*exp(-1.70*ridge*ridge-1.4*along*along);
 float pressure=(1.-(1.-tail)*smoothstep(.16,.99,t))*(.88+.12*smoothstep(0.,.12,t));
 return pressure*(roundness-edge);
}
// A lighter touch feathers to zero at both ends of the stroke.
float featheredStroke(float2 p,float2 a,float2 middle,float2 end,float radius,float side){
 float2 chord=end-a;
 float t=dot(p-a,chord)/dot(chord,chord);
 if(t<=0.f || t>=1.f)return 0.f;
 float st=1.-t;
 float2 centre=st*st*a+2.*st*t*middle+t*t*end;
 float2 tangent=normalize(st*(middle-a)+t*(end-middle));
 float2 normal=float2(-tangent.y,tangent.x);
 centre+=normal*.00062f*sin(3.14159*t)*sin(11.*t+.35*side);
 float sigma=radius*(.74+.26*sin(3.14159*t))*(1.-.23*t);
 float across=dot(p-centre,normal)/sigma;
 float contact=smoothstep(0.f,0.0550f,t)*(1.-smoothstep(0.5800f,1.f,t));
 float cut=exp(-1.5*across*across);
 float edge=.13*exp(-1.7*(across-1.05)*(across-1.05));
 return contact*(cut-edge);
}
float lidGroove(float2 xy,float handedness){
 // The main pressed seam bends near the nose. Only one lid has a deep lower fold.
 float side=handedness;
 float2 corner=float2(-.052,-.0015+.0025*side);
 float2 far=float2(.078,-.004-.006*side);
 float t=clamp((xy.x-corner.x)/(far.x-corner.x),0.f,1.f);
 float center=mix(corner.y,far.y,t)+.005*sin(3.14159*t);
 float seam=(1.-smoothstep(.0007,.0075*(1.-.83*t),abs(xy.y-center)))*smoothstep(corner.x-.009,corner.x+.005,xy.x)*(1.-smoothstep(far.x-.008,far.x+.003,xy.x));
 float upper=pressedLine(xy,corner,float2(-.011+.007*side,.030+.006*side),.0058);
 float lower=pressedLine(xy,corner,float2(-.001-.009*side,-.023+.003*side),.0056)*(.75+.18*side);
 return max(seam,max(upper,lower));
}
float distShape(float3 p,device const Shape &s){
 float3 v=local(p,s),r=float3(s.xx.w,s.yy.w,s.zz.w);
 int typ=int(s.kind.x);
 if(typ==0 && int(s.kind.w)==11 && v.y>-.02){
   float a=atan2(v.x/r.x,v.z/r.z);
   float panel=pow(.5+.5*cos(6.*a+.23),12.);
   v.y+=.0044*panel*smoothstep(.025,.17,length(v.xz));
 }
 if(typ==9){
   float closure=abs(s.loc.w)/r.x;
   float x=v.x/r.x;
   float edge=sqrt(max(0.f,1.f-x*x));
   float center=-.007*closure*r.y/.104;
   float limitTop=center+(1.-closure)*r.y*edge;
   float limitBottom=center-(1.-.87*closure)*r.y*edge;
   float a=length(v/r),b=length(v/(r*r));
   float d=a*(a-1.f)/max(.00001f,b);
   return max(d,max(v.y-limitTop,limitBottom-v.y)*smoothstep(.005,.15,closure)-(1.f-smoothstep(.005,.15,closure))*.1);
 }
 if(typ==24){
   float2 uv=v.xy/r.xy;
   float nasal=exp(-pow((uv.x+.06)/.34,2.f));
   float upper=smoothstep(.0,.70,uv.y);
   uv.y+=upper*nasal*.43;
   float t=atan2(uv.y,uv.x);
   float rimRadius=.68+.072*sin(3.*t+.48)-.053*cos(2.*t-.23);
   float side=sin(t),horizontal=cos(t);
   float roll=.43+.07*max(0.f,-side)+.038*horizontal;
   float profile=length(uv)-rimRadius;
   float depth=v.z/r.z+.090*side-.11*horizontal;
   float dist=sqrt(profile*profile+depth*depth*.27);
   return (dist-roll)*min(r.x,min(r.y,r.z));
 }
 if(typ==23){
   float cheek=1.-smoothstep(-.23f,-.055f,v.y/r.y*.309);
   float hinge=smoothstep(-.19f,.16f,v.z/r.z*.246);
   v.y+=s.loc.w*cheek*hinge;
   v.z-=s.loc.w*.17*cheek*hinge;
   float dent=.010*sin(v.y*16.+v.x*9.+s.xx.w*17.)*sin(v.z*13.-v.y*4.);
   v.x+=dent;v.z+=.0052*sin(v.x*26.+v.y*12.+1.)*cos(v.y*15.);
   float a=length(v/r),b=length(v/(r*r));return a*(a-1.f)/max(.00001f,b);
 }
 if(typ==19){
   float x=v.x/r.x, bounded=clamp(x,-1.f,1.f);
   float edge=sqrt(max(0.f,1.-bounded*bounded));
   float mid=s.loc.w*(bounded*bounded-.18)+.0027*sin(3.6*bounded+.25);
   float low=mid-.92*r.y*edge-.014;
   float high=mid+.86*r.y*edge+.009;
   float fade=1.-smoothstep(.64f,1.29f,abs(x));
   float lower=.023*exp(-pow((v.y-low)/.022,2.f))*(1.-.18*bounded);
   float upper=.011*exp(-pow((v.y-high)/.017,2.f))*(1.+.20*bounded);
   v.z-=fade*(lower+upper)*smoothstep(.002,.061,v.z);
   float3 shell=float3(r.x+.050,.089+r.y*.30,r.z);
   v.y+=.009;
   float a=length(v/shell),b=length(v/(shell*shell));
   return a*(a-1.)/max(.00001f,b);
 }
 if(typ==18 || typ==20 || typ==22){
   float x=clamp(v.x/r.x,-1.22f,1.22f);
   float arch=s.loc.w*(x*x-.18);
   // A higher left upper pad and a fuller right lower pad leave an irregular keel.
   float folded=r.y*(.17*sin(3.6*x+.25)-.095*cos(5.7*x+.53));
   v.y-=arch+folded;
   if(typ==22){
     float ridge=sqrt((x+.105)*(x+.105)+.013);
     v.y-=r.y*(.56-.99*ridge);
   }
   float y=v.y/r.y;
   float width=r.x*(1.+.12*clamp(y,-1.f,1.f));
   if(typ==22)width=r.x*(1.-.32*clamp(y,-1.f,1.f));

   float depth=r.z*(1.-.16*x+.055*sin(4.*x));
   float taper=1.+.21*x-.09*x*x;
   float3 uv=float3(v.x/width,y/taper,v.z/depth);
   float power=typ==20 ? 2.f : 2.50f;
   float f=pow(abs(uv.x),power)+uv.y*uv.y+uv.z*uv.z;
   float3 gradient=float3(power*pow(abs(uv.x),power-1.)/width,2.*uv.y/(r.y*taper),2.*uv.z/depth);
   return .92*(f-1.)/max(.001f,length(gradient));
 }
 if(typ==10 || typ==12){
   float x=clamp(v.x/r.x,-1.2f,1.2f);
   v.y-=s.loc.w*(x*x+.19*x-.18)+.009*r.y/.052*sin(4.5*x);
   r.y*=1.-.20*x;
   float a=length(v/r),b=length(v/(r*r));return a*(a-1.f)/max(.00001f,b);
 }
 if(typ==25){
   float side=sign(s.loc.w);
   float k=r.x/.096;
   float closure=clamp(abs(s.loc.w/r.x),0.f,1.f);
   float press=smoothstep(.60,.97,closure);
   float3 q=v/k; q.x*=side;
   float u=clamp((q.x+.055)/.135,-.5f,1.4f);
   float arch=-.0006+.0025*u+.0012*sin(3.14159*u);
   float y=q.y-arch;
   // The two skin rolls meet at the nasal corner. The lower one carries slightly further.
   float taper=smoothstep(-.16f,.04f,u)*(1.-smoothstep(.84f,1.10f,u));
   float lower=.021*exp(-pow(abs((y+.031)/.037),2.f))*(1.-.37*clamp(u,0.f,1.f));
   float upper=.007*exp(-pow(abs((y-.017)/.024),2.f));
   float farSide=.5+.5*side;
   float2 point=q.xy;
   // Offset the three contacts individually so the skin banks meet at the inner corner.
   float2 topShift=float2(-.001*farSide,-.001+.002*farSide);
   float2 seamShift=float2(0.,-.00263-.001*farSide);
   float2 lowerShift=float2(.002*farSide,-.00295-.003*farSide);
   float2 topA=float2(-.037209,-.00213);
   float2 topB=float2(-.02415,.02245);
   float2 topC=float2(-.00324+.006*farSide,.04348+.003*farSide);
   float top=featheredStroke(point-topShift,topA,topB,topC,.007,side);
   float2 mainA=float2(-.03463,-.00550)+seamShift;
   float2 lowA=float2(-.03761,-.01425)+lowerShift;
   float seam=pressedStroke(point,mainA,float2(.02463,-.00146)+seamShift,float2(.08963,.00259-.002*farSide)+seamShift,.00820,0.545572f,.27,1.12,.00038,-.3,side);
   float lowerMark=pressedStroke(point,lowA,float2(-.00575,-.01949)+lowerShift,float2(.02631-.006*farSide,-.02338)+lowerShift,.00775,.68,.22,1.13,.00045,-.3,side);
   float2 innerTurn=.5*(mainA+lowA)-float2(.010,0.);
   float turn=pressedStroke(point,mainA,innerTurn,lowA,.0059,.88,.18,1.1,0.,.0,side);
   float4 displacement=float4(top*.0048*(1.-.33*farSide),seam*.0094,lowerMark*.0078,turn*.0085);
   float crease=max(max(displacement.x,displacement.y),max(displacement.z,displacement.w))+dot(min(displacement,0.),float4(1.));
   float distal=smoothstep(.43f,1.f,u);
   float face=q.z-press*(.06724f-.05840f*u-.038*distal*smoothstep(.0f,.070f,-y)-.036*smoothstep(.30f,1.f,u)-(.012+.010*(1.-distal))*(.5+.5*side)
                         +.02018f*(1.-.50*distal)*smoothstep(.005f,.072f,-y)
                         +taper*(lower+upper)-crease);
   float3 radius=float3(.105,.111,.068-.006*(.5+.5*side));
   float3 v0=float3(q.x,q.y*(1.-.14*smoothstep(.0f,.07f,-y)),face-.011);
   float mag=length(v0/radius),norm=length(v0/(radius*radius));
   float body=mag*(mag-1.)/max(.00001f,norm);
   // The sloping inside wall ends in the crease. The underside clears the cheek.
   float towardNose=max(-.06101f-1.12*(q.z-.008),-.18435f+.72401f*(q.z-.008));
   float nasal=(towardNose-.007+.72*max(0.f,y+.006)-q.x)*.71;
   float bend=clamp((q.x+.010)/.107,-1.f,1.f);
   float bottom=(-.09672f+.26681f*(q.z-.011)+.05645f*bend*bend+.055*max(0.f,-q.x)+.31*(q.x+.026)-.006-y)*.84;
   float fillet=.010+.004*smoothstep(.014,.09,y);
   float h=max(fillet-abs(body-nasal),0.f);
   float shape=max(body,nasal)+h*h*.25/fillet;
   h=max(fillet-abs(shape-bottom),0.f);shape=max(shape,bottom)+h*h*.25/fillet;
   if(closure<.97){
     float aperture=(1.-closure)*.108*sqrt(max(0.f,1.-pow(q.x/.096,2.f)));
     shape=max(shape,aperture-abs(y));
   }
   return k*.73*shape;
 }
 if(typ==7 || typ==11 || typ==16){
   float closure=clamp(abs(s.loc.w/r.x),0.,1.);
   float size=r.x/.084;
   float2 xy=v.xy/size;xy.x*=sign(s.loc.w);
   float pressed=smoothstep(.56,.91,closure);
   float transverse=clamp(xy.x/.085,-1.f,1.f);
   float north=smoothstep(-.02,.06,xy.y);
   v.z+=size*pressed*(.011*north-.003*(1.-north)+.008*transverse+.0035*exp(-62.*abs(xy.x+.055)));
   if(typ==11 || typ==16){
     float side=sign(s.loc.w);
     float upper=smoothstep(-.005,.025,xy.y);
     float nasal=1.-smoothstep(-.045,.035,xy.x);
     float fullness=exp(-pow((xy.y-.035-.006*side)/.035,2.f));
     // The inner upper pad stands proud of the lower one along a soft diagonal fold.
     v.z-=size*pressed*(.024*upper*nasal*fullness+.009*(1.-upper)*(1.-nasal));
     v.y-=size*pressed*(.011*nasal*upper-.004*nasal*(1.-upper));
     v.x-=size*side*.010*upper*nasal*pressed;
     r.x*=1.+.037*pressed*(1.-upper);
   }
   if(typ==16 && pressed>0.f){
     // The two clay pads have different front planes. The upper pad rolls down
     // and forward over the lower one, folding inward where the bridge meets it.
     float side=sign(s.loc.w);
     float along=clamp((xy.x+.060)/.145,0.f,1.f);
     float seam=-.003+.009*sin(2.8*along+.48*side)-.010*along;
     float y=xy.y-seam;
     float nasal=1.-smoothstep(-.035,.068,xy.x);
     float coverage=smoothstep(-.082,-.063,xy.x)*(1.-smoothstep(.061,.093,xy.x));
     float roll=.014*exp(-pow((y-.021-.004*side)/.018,2.f))*(.46+.54*nasal);
     float belly=.007*exp(-pow((y+.029)/.022,2.f))*(.62+.38*along);
     float overhang=.005*tanh(y/.014)*exp(-pow(y/.040,2.f));
     float seamValley=.009*exp(-pow((y+.002)/(.0048+.0015*along),2.f));
     float innerDistance=xy.x+.054-.78*y+1.4*y*y;
     float diagonal=.009*exp(-pow(innerDistance/.008,2.f))*smoothstep(.003,.026,y)*(1.-smoothstep(.05,.082,y));
     v.z-=size*pressed*coverage*(.25+.75*nasal)*(roll+belly+overhang-seamValley-diagonal);
   }
   float grooves=lidGroove(xy,sign(s.loc.w))*smoothstep(.56,.91,closure);
   if(typ==16)grooves*=.15;
   v.z+=size*.016*grooves*smoothstep(0.,r.z*.5,v.z);
   float d=length(v/r),k=length(v/(r*r));
   float skin=d*(d-1.)/max(.00001f,k);
   if(closure<.97){
     float slit=(1.-closure)*.108;
     float margin=slit*sqrt(max(0.f,1.-pow(xy.x/.090,2.)));
     float middle=-.004-.05*xy.x;
     skin=max(skin,size*(margin-abs(xy.y-middle)));
   }
   return skin;
 }
 if(typ==8 || typ==17){
   // A meeting of three lip pads leaves a peaked, asymmetric opening as they draw together.
   float width=r.x, x=clamp(v.x/width,-1.2f,1.2f);
   v.y+=r.y*(typ==17 ? .69*sqrt((x+.04)*(x+.04)+.020)-.20+.11*x : .67*abs(x+.07)-.18+.16*x);
   float y=clamp(v.y/r.y,-1.f,1.f);
   r.x*=1.f-.28*y;
   float a=length(v/r),b=length(v/(r*r));return a*(a-1.f)/max(.00001f,b);
 }
 if(typ==6){float xn=clamp(v.x/r.x,-1.2f,1.2f);v.y-=s.loc.w*xn*xn;}
 if(typ==0 && (int(s.kind.w)==1 || (int(s.kind.w)==15 || (int(s.kind.w)==20 || int(s.kind.w)==26))) && r.y>.16){
   float dent=.010*sin((v.y*16.+v.x*9.)+s.xx.w*17.)*sin(v.z*13.-v.y*4.);
   v.x+=dent;v.z+=.0052*sin(v.x*26.+v.y*12.+1.)*cos(v.y*15.);
  }
  if(typ==0 || typ==6){float a=length(v/r),b=length(v/(r*r));return a*(a-1.)/max(.00001f,b);}
 if(typ==1){float3 q=abs(v)-r+s.loc.w;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-s.loc.w;}
 if(typ==2){float f=clamp(v.y/(2*r.y)+.5,0.,1.);v.y-=clamp(v.y,-r.y,r.y);return length(v)-mix(r.x,r.z,f);}
 if(typ==3){float2 q=float2(length(v.xz)-r.x,abs(v.y)-r.y)+s.loc.w;return min(max(q.x,q.y),0.)+length(max(q,0.))-s.loc.w;}
 if(typ==5){
  if(int(s.kind.w)==7){
   float angle=atan2(v.x,v.z);
   float fold=sin(35.*angle+.55*sin(7.*angle)+9.*v.y);
   float radial=1.-.011*(1.+fold)*(.65+.35*clamp(v.y/r.y,-1.f,1.f));
   r.x*=radial;r.z*=radial;
  }
  float rr=length(v.xz);float2 q=float2(max(rr-r.x,r.z-rr),abs(v.y)-r.y);return min(max(q.x,q.y),0.)+length(max(q,0.));}
 return length(float2(length(v.xz)-r.x,v.y))-r.z;
}
// At the size of a stylus mark the tabletop shadow bias is wider than the mark.
float castHorizon(float3 p,float3 n,device const Shape &lid){
 float size=lid.xx.w/.096;
 float3 tangent=normalize(cross(n,abs(n.y)<.88f ? float3(0,1,0) : float3(1,0,0)));
 float3 across=cross(n,tangent);
 float blocked=0.;
 for(int i=0;i<8;i++){
  float theta=(float(i)+.24)*.78539816;
  float3 sideways=cos(theta)*tangent+sin(theta)*across;
  float conceal=0.;
  for(int step=1;step<=3;step++){
   float offset=.0028*float(step*step)*size;
   float3 sample=p+n*.00038*size+offset*(sideways+.21*n);
   float distance=distShape(sample,lid)/size;
   conceal=max(conceal,1.-smoothstep(-.0011f,.00055f,distance));
  }
  blocked+=conceal;
 }
 return blocked*.125;
}
float2 sculpt(float3 p,device const Shape *s,int start,int end){
 float d=1000.;int m=start;
 for(int i=start;i<end;i++){
  float a=distShape(p,s[i]),k=s[i].kind.y;
  if(s[i].kind.z<0){
    float cut=-a;
    if(cut>d)m=i;
    if((int(s[i].kind.x)==12 || int(s[i].kind.x)==17 || int(s[i].kind.x)==18 || int(s[i].kind.x)==20 || int(s[i].kind.x)==22) && k>0.){
      float rim=max(k-abs(d-cut),0.f);
      d=max(d,cut)+rim*rim*.25/k;
    }else d=max(d,cut);
    continue;
  }
  if(a<d)m=i;
  float h=max(k-abs(d-a),0.); d=min(a,d)-h*h*.25/max(k,.00001f);
 }
 return float2(d,float(m));
}
float2 bounds(float3 o,float3 inv,device const Group &g){
 float3 a=(g.lo.xyz-o)*inv,b=(g.hi.xyz-o)*inv, lo=min(a,b),hi=max(a,b);
 return float2(max(lo.x,max(lo.y,lo.z)),min(hi.x,min(hi.y,hi.z)));
}
float3 normAt(float3 p,device const Shape *s,int a,int b){
 float2 h=float2(.0012,-.0012);
 return normalize(h.xyy*sculpt(p+h.xyy,s,a,b).x+h.yyx*sculpt(p+h.yyx,s,a,b).x+h.yxy*sculpt(p+h.yxy,s,a,b).x+h.xxx*sculpt(p+h.xxx,s,a,b).x);
}
float occlusion(float3 o,float3 dir,device const Group *groups,int count,device const Shape *s){
 float light=1.;float3 inv=1./(dir+1e-8);
 for(int g=0;g<count;g++){
  float2 br=bounds(o,inv,groups[g]);float t=max(.012f,br.x);
  if(br.y<t)continue;
  for(int j=0;j<26 && t<br.y+.002;j++){
   float d=sculpt(o+t*dir,s,int(groups[g].lo.w),int(groups[g].hi.w)).x;
   light=min(light,9.*max(0.f,d)/max(.055f,t));if(light<.018)return .0;
   t+=max(.012f,d*.91f);
  }
 }return clamp(light,0.,1.);
}
float3 oak(float3 p){
 float plank=floor((p.z+22.)/1.27);float3 q=p+plank*float3(2.4,0,.71);
 float warp=noise(q*float3(.53,1,1.3))*.19+noise(q*float3(.17,1,.85))*.23;
 float ring=.5+.5*sin((q.z+warp)*56.+noise(q*float3(.65,1,8.))*3.);
 float fibres=noise(q*float3(2.7,1,165)),pores=smoothstep(.70,.88,noise(q*float3(9,2,260)));
 float v=.83+.14*noise(q*float3(.81,1,18.))+.053*ring+.068*fibres-.067*pores;
 float seam=1.-smoothstep(0.,.006,min(fract((p.z+22.)/1.27),1.-fract((p.z+22.)/1.27)));
 return float3(.76,.59,.42)*v*(1.-seam*.40)*(1.+(hash(float3(plank,3,9))-.5)*.10);
}
float2 wallUV(float3 hit,float2 scale){
 float u=.50+hit.x*scale.x;
 return float2(1.-abs(fract(u*.5)*2.-1.),clamp(.905-hit.y*scale.y,0.,1.));
}
kernel void expose(texture2d<half,access::write> out [[texture(0)]],texture2d<float,access::sample> plate [[texture(1)]],texture2d<float,access::sample> timber [[texture(2)]],texture2d<float,access::sample> printed [[texture(3)]],texture2d<float,access::sample> relief [[texture(4)]],texture2d<float,access::sample> panels [[texture(5)]],device const float4 *data [[buffer(0)]],uint2 pixel [[thread_position_in_grid]]){
 float2 dims=float2(out.get_width(),out.get_height()),uv=(float2(pixel)+.5)/dims,screen=(uv*2.-1.)*float2(dims.x/dims.y,-1.);
 float3 o=data[0].xyz,fw=normalize(data[1].xyz-o),rt=normalize(cross(fw,float3(0,1,0))),up=cross(rt,fw);
 float3 rd=normalize(fw+data[0].w*(screen.x*rt+screen.y*up));float3 inv=1./(rd+1e-8);
 float3 light=normalize(data[3].xyz);
 int count=int(data[2].x);
 device const Group *gr=(device const Group*)(data+5);device const Shape *sh=(device const Shape*)(data+5+2*count);
 float2 wallScale=float2(data[2].w>0.?data[2].w:.087,data[4].w>0.?data[4].w:.192);
 float wallZ=-4.9;float best=rd.z<0?(wallZ-o.z)/rd.z:80.;int obj=-2,mat=-1;
 float ground=-o.y/rd.y;if(ground>.001 && ground<best){best=ground;obj=-1;}
 for(int g=0;g<count;g++){
  float2 br=bounds(o,inv,gr[g]);float t=max(.012f,br.x),far=min(best,br.y+.002);if(t>far)continue;
  int a=int(gr[g].lo.w),b=int(gr[g].hi.w);
  // A view grazing the overhang may cross the front pad before reaching the temple.
  bool cast=int(sh[b-1].kind.x)==25;
  int steps=cast ? 240 : 70;
  float surfaceLimit=cast ? .00030f : epsilon;
  float smallestStep=cast ? .00024f : .00055f;
  for(int j=0;j<steps && t<=far;j++){
   float2 d=sculpt(o+rd*t,sh,a,b);
   if(d.x<surfaceLimit){best=t;obj=g;mat=int(d.y);break;}
   t+=max(smallestStep,d.x*.93f);
  }
 }
 float3 p=o+rd*best,n=float3(0,1,0),color;float rough=.65,metal=0.,ao=1.,clayRim=0.;
 if(obj==-2){
  float2 tuv=wallUV(p,wallScale);
  constexpr sampler samp(address::clamp_to_edge,filter::linear);
  if(plate.get_width()>1){color=plate.sample(samp,tuv).rgb;}
  else{
   float y=p.y*1.52;float2 tile=float2(p.x*.58+floor(y)*.5,y);float2 edge=min(fract(tile),1.-fract(tile));
   float mortar=1.-smoothstep(.015,.058,min(edge.x,edge.y));float w=noise(p*4.)*.12+hash(float3(floor(tile),1.))*.07;
   color=mix(float3(.43,.53,.51)+w,float3(.36,.418,.382),mortar)*(1.-.10*smoothstep(1.,6.,p.x));
  }
 }else{
  if(obj==-1){color=oak(p)*data[4].rgb;rough=.66;
   if(timber.get_width()>1){
    constexpr sampler woodSample(address::mirrored_repeat,filter::linear,mip_filter::linear);
    float2 uvw=p.xz*float2(.115,.206)+float2(.47,.58);
    float footprint=best*data[0].w*2./dims.y * .206 * float(timber.get_height())/max(.09f,abs(rd.y));
    float3 albedo=timber.sample(woodSample,uvw,level(max(0.f,log2(max(1.f,footprint))))).rgb;
    color=mix(color,albedo*float3(.98,.99,1.04),.77)*data[4].rgb;
   }
   n=normalize(float3((noise(p*float3(16,1,150))-.5)*.014,1,(noise(p*float3(4,1,76))-.5)*.043));}
  else{
   int a=int(gr[obj].lo.w),b=int(gr[obj].hi.w);n=normAt(p,sh,a,b);color=sh[mat].tint.rgb;rough=sh[mat].tint.w;
   float3 q=local(p,sh[mat]);int material=int(sh[mat].kind.w);
   if(material==12){
    float3 r=float3(sh[mat].xx.w,sh[mat].yy.w,sh[mat].zz.w);
    float3 shell=normalize(q/r);
    float2 fix=sh[mat].tint.rg;
    float3 facing=float3(fix,sqrt(max(.01f,1.-dot(fix,fix))));
    float3 delta=shell-facing;
    float spill=sh[mat].tint.b;
    float radial=length(float3(delta.x,delta.y*(spill>0. ? .99 : 1.18),delta.z*.8));
    if(spill>0.)radial+=.0036*sin(4.*atan2(delta.y,delta.x)+.7)+.0031*sin(7.*atan2(delta.y,delta.x)-.9);
    float fleck=noise(q*151.+float3(4,3,2))-.5;
    float edgeWaver=.012*(noise(q*78.)-.5);
    float pigment=1.-smoothstep(.357+edgeWaver,.387+edgeWaver,radial);
    float3 ivory=float3(.99,.945,.87);
    if(spill>0.){
      float facingClay=1.-smoothstep(-.85f,.72f,shell.y+.10f*shell.x);
      ivory*=float3(.950,.936,.913)-spill*facingClay*float3(.013,.045,.095);
      float ragged=noise(shell*22.+float3(3,8,2));
      pigment=smoothstep(.01f,.99f,pigment+.055f*(ragged-.5));
    }
    float3 ink=float3(.36,.315,.275);
    if(spill>0.){
      float rim=smoothstep(.255f,.382f,radial);
      float brush=noise(shell*9.+float3(4,8,1))-.5;
      float lamp=exp(-dot(delta.xy-float2(-.092,.127),delta.xy-float2(-.092,.127))/.034);
      ink*=.99-.12*rim+.115*brush;
      ink+=float3(.035,.028,.020)*lamp;
    }
    color=mix(ivory,ink,pigment);
    color*=1.+fleck*mix(.019,.064,pigment);
    rough=mix(.72,.86,pigment);
   }
   if(material==1 || material==15 || material==20 || material==26){
    if(int(sh[mat].kind.x)==18 || int(sh[mat].kind.x)==20 || int(sh[mat].kind.x)==22){
      // The rim shares the scratched exterior clay. Within the mouth the same pigment
      // receives warm light from the facing lip and darkens towards its roof.
      float depth=q.z/sh[mat].zz.w;
      clayRim=smoothstep(-.7f,.04f,depth);
      float returned=smoothstep(-.86f,-.10f,depth);
      float3 cavity=color*float3(.44,.24,.22)+float3(.030,.016,.014);
      color=mix(cavity,color*float3(1.30,1.29,1.28),returned);
    }
    if(int(sh[mat].kind.x)==12 || int(sh[mat].kind.x)==17){
      clayRim=smoothstep(-.069f,-.007f,q.z/sh[mat].zz.w*.107);
      color*=1.+.78*clayRim;
    }
    float3 base=q*25.;float grain=noise(q*93.);
    float3 pert=float3(noise(base+.014)-noise(base-.014),noise(base+float3(0,.016,0))-noise(base-float3(0,.016,0)),(grain-.5)*.10);
    float2 press=q.xy+float2(.092,-.017)+.023*sin(q.yx*15.+q.z*9.);
    float lift=sin(16.*q.y + 7.*q.x+q.z*13.);
    float whorl=sin(358.*length(press*float2(.68,1.17))+4.*lift+6.*noise(q*15.));
    float patch=smoothstep(.48,.77,noise(q*13.1+1.4))*(1.-smoothstep(.10,.24,length(press)));
    float scuff=sin(q.x*260.+q.y*125.+5.*sin(q.z*23.));
    float edge=smoothstep(.65,.86,noise(q*18.+.7));
    n=normalize(n+pert*.48+float3(.018,.027,.008)*whorl*patch+float3(.009,-.017,.01)*scuff*edge);
    rough=clamp(rough-.13+.095*noise(q*9.7),.37,.78);
    color*=.955+.040*grain+.048*noise(q*5.)+.006*whorl*patch;
    if(relief.get_width()>1){
      constexpr sampler mapSample(address::mirrored_repeat,filter::linear,mip_filter::linear);
      // Choose the projection in the part's own axes so the pressure marks turn with the puppet.
      float3 nx=sh[mat].xx.xyz,ny=sh[mat].yy.xyz,nz=sh[mat].zz.xyz;
      float3 localN=float3(dot(n,nx),dot(n,ny),dot(n,nz));
      float3 axis=pow(abs(localN),float3(4.));axis/=max(.0001f,axis.x+axis.y+axis.z);
      float2 offset=float2(.51,.48)+float2(.07,.13)*sh[mat].yy.w;
      float repeatScale=1.65;
      float footprint=max(1.f,best*data[0].w*2.f/dims.y*repeatScale*float(relief.get_width()));
      float lod=log2(footprint);
      float3 fromX=relief.sample(mapSample,q.zy*repeatScale+offset,level(lod)).rgb-.5;
      float3 fromY=relief.sample(mapSample,q.xz*repeatScale+offset,level(lod)).rgb-.5;
      float3 fromZ=relief.sample(mapSample,q.xy*repeatScale+offset,level(lod)).rgb-.5;
      float3 slope=axis.x*(nz*fromX.r+ny*fromX.g)+axis.y*(nx*fromY.r+nz*fromY.g)+axis.z*(nx*fromZ.r+ny*fromZ.g);
      n=normalize(n+.71*(slope-n*dot(slope,n)));
      float valley=dot(axis,float3(fromX.b,fromY.b,fromZ.b));
      color*=1.f+.22*valley;
      rough=clamp(rough+.17*valley,.38,.8);
    }
    if(int(sh[mat].kind.x)==7 || int(sh[mat].kind.x)==11){
      float size=sh[mat].xx.w/.084;
      float closure=clamp(abs(sh[mat].loc.w/sh[mat].xx.w),0.,1.);
      float2 eyeLocal=q.xy/size;eyeLocal.x*=sign(sh[mat].loc.w);
      color*=1.-.24*lidGroove(eyeLocal,sign(sh[mat].loc.w))*smoothstep(.56,.91,closure);
    }
   }else if(material==2){color*=oak(q)/float3(.73,.555,.376);}
   else if(material==3 || material==7){
    metal=material==7 ? .98 : .78;rough=material==7 ? .15 : .26;
    if(material==7){
      float angle=atan2(q.x,q.z);
      float2 arc=float2(angle*sh[mat].xx.w,q.y);
      float3 patchPos=float3(arc*float2(34.,51.),sh[mat].yy.w*19.);
      float displacement=noise(patchPos)-.5;
      float fold=sin(35.*angle+1.3*sin(7.*angle)+q.y*22.+2.1*displacement);
      float3 tangent=normalize(sh[mat].xx.xyz*cos(angle)-sh[mat].zz.xyz*sin(angle));
      // Each crimp has a short facet with its own tilt and a crease crossing its neighbour.
      float facet=2.*smoothstep(-.22,.22,fold)-1.;
      float crossCrease=sin(arc.x*59.+arc.y*103.+4.*noise(patchPos*.61));
      float slope=.28*facet+.24*displacement+.12*crossCrease;
      float upSlope=.33*crossCrease+.21*(noise(patchPos.zyx+2.)-.5);
      n=normalize(n+tangent*slope+sh[mat].yy.xyz*upSlope);
    }
   }
   else if((material==8 || material==9) && printed.get_width()>1){
    constexpr sampler stamp(address::clamp_to_edge,filter::linear,mip_filter::linear);
    float2 st;
    if(material==8){st=float2(.5+.5*q.x/sh[mat].xx.w,(.5-.5*q.z/sh[mat].xx.w)*(2./3.));}
    else{st=float2(fract(.5+atan2(q.x,q.z)/6.2831853),2./3.+(.5-.5*q.y/sh[mat].yy.w)/3.);}
    float footprint=best*data[0].w*2./dims.y*1024./(2.*sh[mat].xx.w)/max(.16f,abs(dot(n,-rd)));
    color=printed.sample(stamp,clamp(st,float2(.001),float2(.999)),level(max(0.f,log2(max(footprint,1.f))))).rgb;
    rough=.34;
   }
   else if(material==10 || material==11){
    float3 scaled=q/float3(sh[mat].xx.w,sh[mat].yy.w,sh[mat].zz.w);
    float eyeFoot=best*data[0].w*2./dims.y/max(.20f,abs(dot(n,-rd)));
    float weaveFilter=1.-smoothstep(.0019,.0060,eyeFoot);
    float warp=sin((q.x*.84+q.z*.54)*920.+2.*sin(q.y*9.));
    float weft=sin((q.z*.84-q.x*.54)*745.+warp*1.4);
    float nap=weaveFilter*(.52*warp+.48*weft);
    color*=.99+.08*(noise(q*31.)-.5)+.055*nap;
    n=normalize(n+.022*weaveFilter*(sh[mat].xx.xyz*warp+sh[mat].zz.xyz*weft));
    if(material==11){
      float angle=atan2(scaled.x,scaled.z)+.038;
      float radial=length(q.xz);
      float seamDistance=abs(sin(3.*angle))*radial/3.;
      float edge=1.-smoothstep(.0015,.0060,seamDistance);
      float stitches=(1.-smoothstep(.0014,.0037,abs(seamDistance-.0071)))*smoothstep(-.2,.55,sin(262.*atan2(scaled.y,length(scaled.xz))*.21));
      float area=smoothstep(.018,.060,radial)*smoothstep(-.35,.06,scaled.y);
      color*=1.-.33*edge*area;
      color=mix(color,float3(.64,.65,.60),.30*stitches*area*(.45+.55*weaveFilter));
    }else{
      float rim=length(scaled.xz);
      float hem=1.-smoothstep(.010,.029,abs(rim-.850));
      color=mix(color,float3(.63,.65,.58),.31*hem*smoothstep(-.12,.43,sin(137.*atan2(scaled.x,scaled.z)))*smoothstep(-.1,.25,scaled.y));
    }
    rough=.86;
   }
   else if(material==4){color*=.94+.10*noise(q*120.);}
   for(int k=1;k<=3;k++){float h=.05*float(k);float d=sculpt(p+n*h,sh,a,b).x;ao-=max(0.f,h-d)*(.72/float(k));}
  }
  float shadow=occlusion(p+n*.008,light,gr,count,sh);
  if(obj>=0 && int(sh[mat].kind.x)==25){
    float3 lateral=normalize(cross(light,float3(0,1,0)))*.18;
    shadow=.50*shadow+.25*occlusion(p+n*.008,normalize(light+lateral),gr,count,sh)
                      +.25*occlusion(p+n*.008,normalize(light-lateral),gr,count,sh);
  }
  float contact=1.;
  for(int j=0;j<count;j++){
    if(j==obj)continue;
    float3 b=max(max(gr[j].lo.xyz-p,p-gr[j].hi.xyz),0.);
    if(dot(b,b)>.23*.23)continue;
    float ds=sculpt(p+n*.055,sh,int(gr[j].lo.w),int(gr[j].hi.w)).x;
    contact=min(contact,.70+.30*smoothstep(-.035,.17,ds));
  }
  if(obj>=0)contact*=.80+.20*smoothstep(-.01,.19,p.y);
  ao*=contact;
  float nl=max(0.f,dot(n,light)),sky=.5+.5*n.y;
  float bounce=max(0.f,-n.y);
  float3 illum=float3(.365,.355,.385)+sky*float3(.178,.197,.205)+bounce*float3(.12,.077,.041)
    +(.15+.85*shadow)*nl*float3(.681,.595,.475);
  float3 halfv=normalize(light-rd);float spec=pow(max(0.f,dot(halfv,n)),mix(110.,10.,rough))*mix(.23,.045,rough)*(.2+.8*shadow);
  if(obj>=0 && (int(sh[mat].kind.w)==1 || (int(sh[mat].kind.w)==15 || (int(sh[mat].kind.w)==20 || int(sh[mat].kind.w)==26))) && relief.get_width()>1){
    // Pigmented wax admits a little light into its shadows. Keep deep recesses occluded.
    float warm=clamp(2.*(sh[mat].tint.r-sh[mat].tint.g),0.f,1.f);
    float backfill=(1.f-nl)*(.60+.40*max(0.f,dot(n,-rd)));
    illum+=mix(float3(.055,.047,.040),float3(.155,.073,.065),warm)*backfill;
    illum-=nl*float3(.077,.061,.050);
    spec*=.70;
  }
  float3 pigmentBeforeLight=color;
  color=color*illum*clamp(ao,.51,1.)+spec*float3(1.,.93,.82);
  if(obj>=0 && (int(sh[mat].kind.w)==15 || (int(sh[mat].kind.w)==20 || int(sh[mat].kind.w)==26))){
    float3 cardDirection=normalize(float3(.43,.41,.90));
    float incidence=clamp(.44+.56*dot(n,cardDirection),.05f,1.f);
    float access=occlusion(p+n*.009,cardDirection,gr,count,sh);
    float bounceLight=.55+.59*incidence*(.25+.75*access);
    float sheltered=(int(sh[mat].kind.w)==20 || int(sh[mat].kind.w)==26) ? (1.-access)*(1.-shadow) : 0.f;
    if(int(sh[mat].kind.x)==25)sheltered*=.48;
    float3 reflected=pigmentBeforeLight*bounceLight*float3(1.075,.972,.988);
    reflected*=1.-.59*sheltered;
    color*=1.-.33*sheltered;
    float amount=sh[mat].kind.z<0 ? mix(.12,.59,clayRim) : .59;
    if(int(sh[mat].kind.x)==25)amount*=.61674f;
    color=mix(color, reflected*clamp(ao,.54,1.),amount);
    // A black flag opposite the key takes unshaped room fill off the shadow cheek.
    float negativeFill=1.-smoothstep(-.45,.73,dot(n,light));
    if((int(sh[mat].kind.w)==20 || int(sh[mat].kind.w)==26))color*=1.014-.26*negativeFill;
    if(int(sh[mat].kind.w)==26){
      float beneath=smoothstep(.05f,.83f,-n.y)*(1.-.65*nl);
      color*=1.-beneath*float3(.18,.34,.33);
    }
  }
  if(obj>=0 && int(sh[mat].kind.w)==26){
    // The tabletop returns warm diffuse light into the near space beneath the pad.
    // An object in front of the receiver can still intercept this light.
    int first=int(gr[obj].lo.w),end=int(gr[obj].hi.w);
    if(int(sh[first].kind.x)==23){
      float influence=0.f;
      for(int j=first;j<end;j++){
        if(int(sh[j].kind.x)!=25)continue;
        float k=sh[j].xx.w/.096;
        float3 eye=local(p,sh[j])/k;
        float near=1.-smoothstep(.13f,.19f,length(eye));
        float below=1.-smoothstep(-.055f,-.015f,eye.y);
        influence=max(influence,near*below);
      }
      if(influence>.001){
        float3 reflectedDir=normalize(float3(.18,-.32,.90));
        float access=occlusion(p+n*.009,reflectedDir,gr,count,sh);
        float receiving=.30+.70*max(0.f,dot(n,reflectedDir));
        color+=pigmentBeforeLight*float3(1.,.89,.75)*.09871f*influence*receiving*(.34+.66*access);
      }
    }
  }
  if(obj>=0 && int(sh[mat].kind.x)==25){
    float3 actualNormal=normAt(p,sh,int(gr[obj].lo.w),int(gr[obj].hi.w));
    float hidden=castHorizon(p,actualNormal,sh[mat]);
    color*=1.-0.180000f*hidden;
  }
  if(obj>=0 && int(sh[mat].kind.w)==12)color=mix(color,pigmentBeforeLight*1.04,.65);
  if(obj>=0 && (int(sh[mat].kind.w)==13 || int(sh[mat].kind.w)==14) && panels.get_width()>1){
    float3 q=local(p,sh[mat]);float2 uvw=.5+float2(q.x/sh[mat].xx.w,-q.y/sh[mat].yy.w)*.5;
    uvw.x=(int(sh[mat].kind.w)==13 ? .0 : .45)+.55*uvw.x;
    constexpr sampler samplePanel(address::clamp_to_edge,filter::linear,mip_filter::linear);
    float footprint=best*data[0].w*2.f/dims.y*float(panels.get_height())/(2.f*sh[mat].yy.w);
    color=panels.sample(samplePanel,clamp(uvw,0.f,1.f),level(log2(max(1.f,footprint)))).rgb*(.88+.12*shadow);
  }
  if(obj>=0 && int(sh[mat].kind.w)==5){
   float3 q=normalize(local(p,sh[mat]));float3 r=reflect(rd,n);
   float fres=.042+.958*pow(1.-clamp(dot(n,-rd),0.,1.),5.);
   float3 inside=refract(rd,n,1./1.49);float radius=sh[mat].xx.w;
   float chord=max(.002f,-2.*dot(p-sh[mat].loc.xyz,inside));float3 back=p+chord*inside;
   float3 exitRay=refract(inside,-normalize(back-sh[mat].loc.xyz),1.49);
   constexpr sampler envs(address::clamp_to_edge,filter::linear);
   constexpr sampler tabletop(address::mirrored_repeat,filter::linear,mip_filter::linear);
   float3 through=float3(.54,.65,.59);
   if(exitRay.y<-.025){
    float3 under=back-exitRay*back.y/exitRay.y;
    through=timber.get_width()>1 ? timber.sample(tabletop,under.xz*float2(.115,.206)+float2(.47,.58),level(1.)).rgb : oak(under);
   }else if(exitRay.z<-.05 && plate.get_width()>1){
    float3 farPt=back+exitRay*((wallZ-back.z)/exitRay.z);
    through=plate.sample(envs,wallUV(farPt,wallScale)).rgb;
   }
   float3 core=local(p+inside*chord*.49,sh[mat])/radius;
   float sheet=core.y-.39*sin(3.15*core.x+2.9*core.z+.9);
   float ribbon=1.-smoothstep(.10,.27,abs(sheet));float blue=1.-smoothstep(.10,.31,abs(sheet+.29));
   float3 transmitted=through*exp(-chord/radius*float3(.79,.20,.17));
   transmitted=mix(transmitted,float3(.022,.33,.38)*illum,blue*.88);
   transmitted=mix(transmitted,float3(.95,.76,.20)*illum,ribbon*.93);
   float card=pow(max(0.f,dot(r,light)),100.);
   float fillCard=pow(max(0.f,dot(r,normalize(float3(.76,.42,.45)))),49.);
   float3 reflection=float3(.43,.60,.60)+.20*n.y;
   color=mix(transmitted+.045*sky,reflection,fres)+float3(.98,.95,.85)*card*.96+.12*fillCard;
   color+=float3(.045,.09,.09)*pow(max(0.f,dot(n,normalize(float3(.6,-.63,.6)))),15.);
  }
  if(metal>.1){
   float3 reflected=reflect(rd,n);
   constexpr sampler wallSample(address::clamp_to_edge,filter::linear);
   constexpr sampler deskSample(address::mirrored_repeat,filter::linear,mip_filter::linear);
   float3 env=mix(float3(.22,.19,.18),float3(.48,.48,.45),.5+.5*reflected.y);
   if(reflected.z<-.02 && plate.get_width()>1){
     float3 hit=p+reflected*((wallZ-p.z)/reflected.z);
     env=mix(env,plate.sample(wallSample,wallUV(hit,wallScale)).rgb,smoothstep(.02,.42,-reflected.z));
   }
   if(reflected.y<-.012){
     float reach=p.y/-reflected.y;
     float3 hit=p+reflected*reach;
     float3 wood=timber.get_width()>1 ? timber.sample(deskSample,hit.xz*float2(.115,.206)+float2(.47,.58),level(3.)).rgb : oak(hit);
     float table=(1.-smoothstep(2.7,7.0,reach))*smoothstep(.012,.18,-reflected.y);
     env=mix(env,wood,table);
   }
   // Rectangular diffuser, unlit flag and narrow bounce card photographed in the metal.
   float2 proj=reflected.xz/max(.04f,reflected.y);
   float2 box=abs(proj-float2(-.65,.62))-float2(.58,.36);
   float softbox=(1.-smoothstep(-.10,.10,max(box.x,box.y)))*smoothstep(.08,.4,reflected.y);
   float flag=smoothstep(.31,.42,reflected.x)*(1.-smoothstep(.64,.79,reflected.x))*smoothstep(-.2,.1,reflected.y);
   env*=1.-.71*flag;
   env=mix(env,float3(1.33,1.25,1.10),softbox);
   float rim=pow(1.-clamp(dot(n,-rd),0.,1.),4.);
   float3 pigment=sh[mat].tint.rgb;
   float3 reflectedPaint=env*mix(pigment,float3(1.),.20+.35*rim);
   color=mix(color,reflectedPaint,(.48+.31*rim)*metal);
   color+=.24*softbox*(.64+.36*shadow);
   color*=.98+.04*noise(local(p,sh[mat])*float3(74,8,61));
  }
 }
 float vig=1.-.105*dot(uv-.5,uv-.5)*2.;color=clamp(color*vig*data[3].w,0.,1.);
 out.write(half4(half3(color),half(best)),pixel);
}
// Average four optical samples before the depth-of-field pass and film grain.
kernel void contactPrint(texture2d<half,access::read> src [[texture(0)]],
                         texture2d<half,access::write> dst [[texture(1)]],
                         uint2 pixel [[thread_position_in_grid]]){
 uint2 p=2*pixel;
 half4 a=src.read(p),b=src.read(p+uint2(1,0)),c=src.read(p+uint2(0,1)),d=src.read(p+uint2(1,1));
 // Use the nearer central depth at a silhouette; averaging sky and face would place
 // an imaginary surface between them and smear the edge in the lens pass.
 half lower=max(min(a.w,b.w),min(c.w,d.w)),upper=min(max(a.w,b.w),max(c.w,d.w));
 dst.write(half4((a.rgb+b.rgb+c.rgb+d.rgb)*half(.25),min(lower,upper)),pixel);
}
kernel void develop(texture2d<half,access::read> src [[texture(0)]],texture2d<float,access::write> dst [[texture(1)]],device const float4 *data [[buffer(0)]],uint2 px [[thread_position_in_grid]]){
 int2 dim=int2(src.get_width(),src.get_height()),xy=int2(px);float4 raw=float4(src.read(px));float focus=data[1].w,blur=min(9.f,abs(1./max(.2f,raw.w)-1./focus)*data[2].z*float(dim.x)/960.);
 float3 c=raw.rgb;float ws=1.;
 for(int k=0;k<20 && blur>.5;k++){float a=k*2.39996;float2 off=float2(cos(a),sin(a))*sqrt((float(k)+.5)/20.)*blur;int2 at=clamp(xy+int2(round(off)),int2(0),dim-1);
 float4 other=float4(src.read(uint2(at)));float w=(other.w<raw.w-.2 && abs(other.w-focus)<abs(raw.w-focus))?.07:1.;c+=other.rgb*w;ws+=w;}
 c/=ws;
 float3 l=float3(src.read(uint2(max(xy-int2(1,0),int2(0)))).rgb);
 float3 r=float3(src.read(uint2(min(xy+int2(1,0),dim-1))).rgb);
 float3 u=float3(src.read(uint2(max(xy-int2(0,1),int2(0)))).rgb);
 float3 d=float3(src.read(uint2(min(xy+int2(0,1),dim-1))).rgb);
 float contrast=max(length(r-l),length(d-u));if(contrast>.14 && blur<1.0)c=mix(c,(l+r+u+d)*.25,.27);
 // Increase the separation between the illuminated face and the unlit side of the set.
 c=clamp((c-.45)*1.17+.437,0.,1.);
 float g=(hash(float3(float2(px),data[2].y))-.5)*.008;dst.write(float4(clamp(c+g,0.,1.),1),px);
}
