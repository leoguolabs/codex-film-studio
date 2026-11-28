"""Depth-tested technical plate. Projection coordinates use a 1920 x 1080 sheet."""
import math
import numpy as np
import moderngl as gl
from PIL import Image
from .solid import unit

VERT = """#version 330
uniform mat4 camera, model; in vec3 pt, norm;
out vec3 n, local, world;
void main(){ local=pt; world=(model*vec4(pt,1)).xyz;
n=transpose(inverse(mat3(model)))*norm; gl_Position=camera*vec4(world,1); }
"""
FRAG = """#version 330
in vec3 n, local, world; uniform vec3 base; uniform float orange, sweep;
uniform vec4 section; uniform float hatch;
layout(location=0) out vec4 colour; layout(location=1) out vec4 geometry;
void main(){
 if(dot(vec4(local,1),section)>0.0 || world.y>sweep) discard;
 vec3 N=normalize(n); float light=.91+.085*max(dot(N,normalize(vec3(-.42,.8,.55))),0.);
 vec3 c=mix(base,vec3(1.,.302,.102),orange)*light;
 if(hatch>0. && !gl_FrontFacing) c=mix(c,vec3(.51),.42*(1.-smoothstep(.13,.29,abs(fract((gl_FragCoord.x+gl_FragCoord.y)/10.)-.5))));
 colour=vec4(c,1); geometry=vec4(N,gl_FragCoord.z); }
"""
PV="""#version 330
in vec2 pt; out vec2 uv; void main(){uv=pt*.5+.5; gl_Position=vec4(pt,0,1);}
"""
PF="""#version 330
in vec2 uv; out vec4 outc; uniform sampler2D pigment, normals;
uniform vec2 size;
void main(){
 vec2 d=1./size; vec4 c=texture(pigment,uv), g=texture(normals,uv); float sil=0.,crease=0.;
 for(int i=0;i<4;i++){
 vec2 off=(i==0?vec2(1,0):i==1?vec2(0,1):i==2?vec2(.707,.707):vec2(.707,-.707))*d;
 vec4 ca=texture(pigment,uv+off),cb=texture(pigment,uv-off);
 sil=max(sil,max(abs(ca.a-c.a),abs(cb.a-c.a)));
 vec4 a=texture(normals,uv+off),b=texture(normals,uv-off);
 if(c.a*ca.a*cb.a>.5){
 float bend=max(length(g.xyz-a.xyz),length(g.xyz-b.xyz));
 crease=max(crease,max(smoothstep(.28,.88,bend)*.52,smoothstep(.000025,.00020,abs(a.w+b.w-2.*g.w))*.72)); }}
 vec2 paperPx=vec2(uv.x,1.-uv.y)*vec2(1920,1080);
 vec2 grid=abs(mod(paperPx+20.,40.)-20.); vec2 crosshair=abs(mod(paperPx+100.,200.)-100.);
 float line=1.-smoothstep(.1,.9,min(grid.x,grid.y)); float crossMark=(1.-smoothstep(.2,.9,min(crosshair.x,crosshair.y)))*(1.-smoothstep(3.,5.,max(crosshair.x,crosshair.y)));
 vec3 paper=vec3(246.,245.,240.)/255.-vec3(.022*line+.046*crossMark);
 vec3 col=mix(paper,c.rgb,c.a); col=mix(col,vec3(.16),crease); col=mix(col,vec3(.13),sil*.85);
 outc=vec4(col,1); }
"""

class Plate:
    def __init__(self,width=1920,height=1080,quality=1.25):
        self.w,self.h=width,height
        self.size=tuple(round(v*quality) for v in (width,height))
        self.ctx=gl.create_standalone_context(require=330)
        ctx=self.ctx
        self.shader=ctx.program(vertex_shader=VERT,fragment_shader=FRAG)
        self.ink=ctx.program(vertex_shader=PV,fragment_shader=PF)
        self.c=ctx.texture(self.size,4)
        self.g=ctx.texture(self.size,4,dtype='f4')
        for texture in (self.c,self.g):
            texture.filter=(gl.NEAREST,gl.NEAREST)
            texture.repeat_x=texture.repeat_y=False
        self.solids=ctx.framebuffer([self.c,self.g],ctx.depth_renderbuffer(self.size))
        self.sheet=ctx.simple_framebuffer(self.size,components=4)
        verts=np.float32([[-1,-1],[1,-1],[-1,1],[1,1]])
        self.quad=ctx.vertex_array(self.ink,[(ctx.buffer(verts),'2f','pt')])
        self.meshes={}
        self.ink['pigment']=0
        self.ink['normals']=1
        self.ink['size']=self.size

    def add(self,key,mesh):
        self.meshes[key]=self.ctx.vertex_array(self.shader,[(self.ctx.buffer(np.ascontiguousarray(mesh,'f4')),'3f 3f','pt','norm')])

    def begin(self,az,el,span,target=(0,0,0),center=(960,540)):
        """Vertical field in model units at target, angular dolly and a shifted principal point."""
        az,el=np.radians([az,el]); distance=span*3.15
        facing=np.array([np.sin(az)*np.cos(el),np.sin(el),np.cos(az)*np.cos(el)])
        right=unit(np.cross([0,1,0],facing)); up=np.cross(facing,right)
        view=np.eye(4); view[:3,:3]=[right,up,facing]
        view[:3,3]=-view[:3,:3]@(np.asarray(target)+facing*distance)
        near,far=distance*.18,distance+max(1200,span*5)
        p=np.zeros((4,4)); p[0,0]=2*distance/span*9/16; p[1,1]=2*distance/span
        p[0,2]=1-center[0]/960; p[1,2]=center[1]/540-1
        p[2,2]=-(far+near)/(far-near); p[2,3]=-2*far*near/(far-near); p[3,2]=-1
        self.cam=p@view
        self.shader['camera'].write(np.float32(self.cam.T).tobytes())
        self.solids.use();self.solids.clear(0,0,0,0,depth=1)
        self.ctx.enable(gl.DEPTH_TEST)

    def project(self,p):
        v=self.cam@np.r_[p,1.]
        return np.array([(1+v[0]/v[3])*960,(1-v[1]/v[3])*540])

    def draw(self,key,model,base=.91,orange=0.,sweep=1e6,section=(0.,0.,0.,-1.),hatch=0.):
        self.shader['model'].write(np.float32(model.T).tobytes())
        self.shader['base'].value=(base,base,base*.985) if np.isscalar(base) else tuple(base)
        self.shader['orange']=float(orange); self.shader['sweep']=float(sweep)
        self.shader['section'].value=tuple(section);self.shader['hatch']=float(hatch)
        self.meshes[key].render()

    def finish(self):
        self.sheet.use();self.ctx.disable(gl.DEPTH_TEST)
        self.c.use(0);self.g.use(1);self.quad.render(gl.TRIANGLE_STRIP)
        img=Image.frombytes('RGBA',self.size,self.sheet.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        return img.resize((self.w,self.h),Image.Resampling.LANCZOS) if img.size!=(self.w,self.h) else img
