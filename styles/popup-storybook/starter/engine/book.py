"""Perspective stage with hinged alpha cutouts, projected shadows and a macro lens."""
import math
import random
import numpy as np
import moderngl as gl
from PIL import Image, ImageDraw
from .prints import disk, paper, furniture, titleprint

VERT = """#version 330
in vec2 corner;
uniform mat4 vp;
uniform vec3 pivot;
uniform vec2 extent;
uniform vec4 angle; // elevation, yaw, roll and horizontal mode
uniform int mode;
uniform float offset;
uniform float mirror;
out vec2 uv;
out vec3 world;
void main(){
    uv=vec2(mix(corner.x,1.-corner.x,mirror),1.-corner.y);
    float x=(corner.x-.5)*extent.x, h=corner.y*extent.y;
    float r=angle.z;
    vec2 wing=mat2(cos(r),sin(r),-sin(r),cos(r))*vec2(x,h);
    float elev=angle.x, yaw=angle.y;
    vec3 p=vec3(wing.x,wing.y*sin(elev),-wing.y*cos(elev));
    p=vec3(p.x*cos(yaw)+p.z*sin(yaw),p.y,-p.x*sin(yaw)+p.z*cos(yaw));
    if (angle.w>.5) p=vec3(x,0.,(corner.y-.5)*(-extent.y));
    world=pivot+p;
    if(mode==2){world.x+=world.y*.49+offset;world.z-=world.y*.32+offset*.5;world.y=.037;}
    gl_Position=vp*vec4(world,1.);
}"""

FRAG = """#version 330
uniform sampler2D face;
uniform sampler2D fiber;
uniform int mode;
uniform float shade;
uniform float night;
uniform float pigmentStrength;
in vec2 uv;
in vec3 world;
out vec4 color;
vec2 repeatPaper(vec2 v){return 1.-abs(mod(v,2.)-1.);}
void main(){
    if(mode==3){
        float grain=texture(fiber,repeatPaper(world.xz*.094)).r-.49;
        float blot=texture(fiber,repeatPaper(world.xz*.037+vec2(.2,.63))).r-.49;
        vec3 cream=vec3(.91,.80,.66), lilac=vec3(.84,.72,.80);
        vec3 base=mix(cream,lilac,smoothstep(-3.,12.,17.-world.z));
        base=mix(base,vec3(.15,.119,.242),night);
        vec2 cell=floor(world.xz*3.4);
        vec2 local=fract(world.xz*3.4)-.5;
        float seed=fract(sin(dot(cell,vec2(23.48,17.91)))*4375.23);
        float band=texture(fiber,repeatPaper(world.xz*vec2(.042,.68))).r-.49;
        base+=vec3(.95,.88,.79)*max(0.,band-.03)*.36*(1.-night);
        float star=(1.-smoothstep(.004,.029,length(local)))*step(.81,seed);
        color=vec4(base+(grain*.61+blot*.23)*mix(1.,.28,night)+night*star*.55,1.);
        return;
    }
    vec4 c=texture(face,uv);
    if(mode==4){
        float radius=length((uv-.5)*2.);
        if(radius>=1.) discard;
        float halo=exp(-3.8*radius*radius)*(1.-smoothstep(.70,1.,radius));
        color=vec4(1.,.59,.27,halo*.63*night);
        return;
    }
    if(c.a<.25) discard;
    if(mode==2){color=vec4(mix(vec3(.39,.26,.35),vec3(.04,.025,.08),night),c.a*shade);return;}
    float fibre=texture(fiber,repeatPaper(vec2(world.x+world.z*.35,world.y+world.z*.65)*1.7)).r-.49;
    vec3 ink=mix(vec3(dot(c.rgb,vec3(.299,.587,.114))),c.rgb,pigmentStrength);
    vec3 pigment=ink*shade+fibre*.19;
    color=vec4(pigment,c.a);
}"""
POSTV = """#version 330
in vec2 corner;
out vec2 uv;
void main(){uv=corner;gl_Position=vec4(corner*2.-1.,0,1);}
"""
POSTF = """#version 330
uniform sampler2D picture;
uniform vec2 texel;
uniform float closing;
in vec2 uv;
out vec4 color;
void main(){
    float r=(pow(max(uv.y-.62,0.)*2.63,2.)*4.2+pow(max(.21-uv.y,0.)*4.76,2.)*2.4);
    vec2 stepR=texel*r;
    vec3 c=texture(picture,uv).rgb*.18;
    for(int i=0;i<12;i++){
        float a=float(i)*2.39996;
        vec2 o=vec2(cos(a),sin(a))*sqrt((float(i)+.5)/12.);
        c+=texture(picture,uv+stepR*o).rgb*(.82/12.);
    }
    float v=dot(uv-.5,uv-.5);
    c*=1.-v*.048;
    color=vec4(mix(c,vec3(.15,.119,.242),closing*.96),1.);
}"""

def smooth(x):
    x=max(0.,min(1.,x))
    return x*x*(3-2*x)

def view_projection(eye, target, aspect):
    eye=np.array(eye)
    f=np.array(target)-eye;f=f/np.linalg.norm(f)
    side=np.cross(f,[0,1,0]);side=side/np.linalg.norm(side)
    up=np.cross(side,f)
    view=np.eye(4)
    view[:3,:3]=[side,up,-f]
    view[:3,3]=-view[:3,:3]@eye
    near,far=.1,150.
    z=1/math.tan(math.radians(31)*.5)
    proj=np.array([[z/aspect,0,0,0],[0,z,0,0],[0,0,(far+near)/(near-far),2*far*near/(near-far)],[0,0,-1,0]])
    return (proj@view).T.astype('f4').tobytes()

def offsets(keys, t):
    if not keys:return (0.,)*4
    if t<=keys[0][0]:return keys[0][1:]
    for a,b in zip(keys,keys[1:]):
        if t<=b[0]:
            s=smooth((t-a[0])/(b[0]-a[0]))
            return [x+(y-x)*s for x,y in zip(a[1:],b[1:])]
    return keys[-1][1:]

class Book:
    def __init__(self,root,book,width,height):
        self.root=root; self.b=book;self.size=(width,height)
        self.g=g=gl.create_standalone_context(require=330)
        self.prog=p=g.program(vertex_shader=VERT,fragment_shader=FRAG)
        self.post=g.program(vertex_shader=POSTV,fragment_shader=POSTF)
        buf=g.buffer(np.array([(0,0),(1,0),(0,1),(1,1)],'f4').tobytes())
        self.quad=g.vertex_array(p,[(buf,'2f','corner')])
        self.screen=g.vertex_array(self.post,[(buf,'2f','corner')])
        self.tex={}
        self.add('fiber',paper(512,17))
        self.add('title',titleprint(book['title'],root/'fonts/cormorant.ttf'))
        self.add('star',furniture('star'));self.add('cloud',furniture('cloud'));self.add('planet',furniture('planet'))
        for i,stage in enumerate(book['stages']):
            floor=root/'art'/(stage['floor']+'.png') if stage.get('floor') else None
            self.add(f'disk{i}',disk(stage['ground'],stage['rim'],80+i,floor))
            for card in stage['cards']:
                name=card['art']
                if name not in self.tex:self.add(name,Image.open(root/'art'/(name+'.png')))
        self.color=g.texture(self.size,4)
        self.scene=g.framebuffer([self.color],g.depth_renderbuffer(self.size))
        self.final=g.simple_framebuffer(self.size,components=3)
        p['face']=0;p['fiber']=1;p['pigmentStrength']=book.get('pigment',1.0)
        self.post['picture']=0;self.post['texel']=(1/width,1/height)
        self.stops=[(s['at'],-i*20.) for i,s in enumerate(book['stages'])]
        self.last=book.get('end_at',book['duration']-4.8)
        self.sky=[]
        r=random.Random(435)
        for i in range(-1,len(self.stops)+2):
            for side in [-1,1]:
                for j in range(5):
                    self.sky.append((r.choice(['star','cloud','planet']),side*r.uniform(5.3,9.8),-i*20.+r.uniform(-8.6,8.6),r.uniform(.59,1.21)))
            for j in range(4):
                self.sky.append((r.choice(['cloud','planet','star']),(-1)**j*r.uniform(1.8,5.1),-i*20.-r.uniform(7.4,11.9),r.uniform(.54,.97)))
        self.g.blend_func=(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)

    def add(self,name,image):
        im=image.convert('RGBA')
        tex=self.g.texture(im.size,4,im.tobytes())
        tex.build_mipmaps()
        tex.filter=(gl.LINEAR_MIPMAP_LINEAR,gl.LINEAR)
        tex.repeat_x=tex.repeat_y=(name=='fiber')
        self.tex[name]=(tex,im.height/im.width)

    def draw(self,name,x,y,z,w,h=None,angle=90,yaw=0,roll=0,mode=0,shade=1.,flat=False,flip=False,offset=0):
        p=self.prog
        tex,ratio=self.tex[name];tex.use(0)
        p['pivot']=(x,y,z);p['extent']=(w,w*ratio if h is None else h)
        p['angle']=(math.radians(angle),math.radians(yaw),math.radians(roll),float(flat))
        p['mode']=mode;p['shade']=shade;p['offset']=offset;p['mirror']=float(flip)
        self.quad.render(gl.TRIANGLE_STRIP)

    def camera(self,t):
        # A scroll carries the eye from one disk to the next; easing changes the camera distance on the same path.
        points=[(0,0.,19.3,14.5,0.),(1.85,0.,19.3,14.2,0.)]
        for i,(at,z) in enumerate(self.stops):
            s=self.b['stages'][i]
            end=self.stops[i+1][0] if i+1<len(self.stops) else self.last+1.7
            fx,fz=s.get('focus',[0,0])
            near=14.4*s.get('close',.73)
            angle=s.get('heading',(-1)**i*4.)
            span=end-at
            # The print slides under the lens during the push. Move toward the back wall as well as down to the stage.
            inset_z=z+fz-s.get('push_travel',1.68)
            points.extend([(at,0,z,15.25,0.),(at+span*.13,0,z+.14,15.22,0.),
                           (at+span*.445,fx,inset_z,near,angle),(at+span*.505,fx+.10,inset_z-.08,near*.985,angle+.7),
                           (at+span*.73,0,z,15.1,0.)])
        endz=self.stops[-1][1]-20
        points.extend([(self.last+1.65,0,endz,14.2,0.),(self.b['duration'],0,endz-.4,12.9,0.)])
        points.sort()
        for a,b in zip(points,points[1:]):
            if a[0]<=t<=b[0]:
                u=smooth((t-a[0])/max(.001,b[0]-a[0]))
                x,z,dist,yaw=[a[n]+(b[n]-a[n])*u for n in range(1,5)]
                break
        else:
            _,x,z,dist,yaw=points[-1]
        pitch=math.radians(self.b.get('pitch',38))
        angle=math.radians(yaw)
        target=(x,.55,z)
        eye=(x+dist*math.cos(pitch)*math.sin(angle),.55+dist*math.sin(pitch),z+dist*math.cos(pitch)*math.cos(angle))
        return z,view_projection(eye,target,self.size[0]/self.size[1])

    def frame(self,t):
        p=self.prog;g=self.g
        fps=self.b.get('fps',30)
        cadence=self.b.get('camera_cadence',.18)
        sample=t-(cadence/fps if round(t*fps)%2 else 0)
        zcam,vp=self.camera(max(0,sample))
        night=smooth((t-self.last-.52)/.62)
        self.scene.use();self.scene.clear(.82,.72,.78,1,depth=1)
        g.enable(gl.DEPTH_TEST|gl.BLEND)
        p['vp'].write(vp);p['night']=night
        self.tex['fiber'][0].use(1)
        self.draw('fiber',0,-.08,zcam,110,120,mode=3,flat=True)
        active=[]
        for i,(at,z) in enumerate(self.stops):
            if abs(z-zcam)>23:continue
            stage=self.b['stages'][i]
            self.draw(f'disk{i}',0,0,z,10.5,10.5,flat=True)
            if t<at-.68:continue
            for c in stage['cards']:
                visible = c.get('visible')
                if visible and not (visible[0] <= t-at < visible[1]):continue
                u=t-at-self.b.get('rise_lag',.48)-c.get('delay',0)
                if u<0:continue
                # A short lift past the vertical followed by a damped return.
                lift=smooth(u/.38)*90+12*math.exp(-5*max(0,u-.38))*math.sin(15*max(0,u-.38))
                exit_at = self.stops[i+1][0] if i+1<len(self.stops) else self.last+1.65
                remaining = exit_at-t-1.11-.30*max(-1,min(1,c['z']/3.5))
                if remaining<=0:continue
                lift *= smooth(remaining/.73)
                dx,dy,dz,roll=offsets(c.get('keys',[]),t-at)
                active.append(dict(name=c['art'],x=c['x']+dx,y=.048+c.get('y',0)+dy,z=z+c['z']+dz,w=c['w'],angle=lift+math.sin(t*2.+c['x'])*c.get('wind',0),yaw=c.get('yaw',0),roll=roll,flip=c.get('flip',False)))
        if zcam>2:active.append(dict(name='title',x=0,y=.05,z=19.25,w=self.b.get('title_width',8.3)))
        if zcam>5:
            for x,z,w in [(-4.5,18.4,.48),(4.4,17.9,.51),(-2.7,13.0,.38),(2.1,12.0,.35)]:
                active.append(dict(name='star',x=x,y=.035,z=z,w=w))
        for name,x,z,w in self.sky:
            if abs(z-zcam)<16 and night<.90:
                active.append(dict(name=name,x=x,y=.035,z=z,w=w if name=='cloud' else w*.61))
        if night>0:
            self.scene.depth_mask=False
            endz=self.stops[-1][1]-20
            for i in range(11):
                a=i*2.39996
                x=math.sin(i*math.tau/10)*(3.6+.28*(i%3)); z=endz+math.cos(i*math.tau/10)*(2.12+.27*(i%2))
                if i==0:x,z=0,endz+.48
                size=1.22 if i==0 else .49+(i%3)*.09
                # Let individual paper stars rise out of darkness. The large last star catches the final note.
                available=self.b['duration']-self.last
                onset=.25+(.45 if i==0 else ((i*7)%11)*.032)
                phase=(t-self.last)/available
                reveal=smooth((phase-onset)/.11)
                if reveal==0:continue
                self.draw('star',x,.016,z,size*2.9*reveal,size*2.4*reveal,mode=4,flat=True)
                active.append(dict(name='star',x=x,y=.035,z=z,w=size,angle=90*reveal,roll=math.sin(t*1.3+i)*2))
            self.scene.depth_mask=True
        # Depth-test the paper first. Blend soft impressions without writing depth, then restore positive relief.
        self.scene.depth_mask=False
        for c in active:
            if c['name']=='cloud':strength=.11
            else:strength=.19
            for off in [-.055,.045]:
                self.draw(**c,mode=2,shade=strength,offset=off)
        self.scene.depth_mask=True
        for c in sorted(active,key=lambda q:q['z']):
            # The warm cut edge is displaced in depth behind the printed face.
            if c['w']>1:
                cut={**c,'x':c['x']+.014,'z':c['z']-.027}
                self.draw(**cut,shade=.69)
            self.draw(**c,shade=.97)
        self.final.use();g.disable(gl.DEPTH_TEST|gl.BLEND)
        self.color.use(0)
        self.post['closing']=smooth((t-self.b['duration']+.42)/.40)
        self.screen.render(gl.TRIANGLE_STRIP)
        return self.final.read(components=3,alignment=1)
