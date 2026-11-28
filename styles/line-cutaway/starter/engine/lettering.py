"""Projected leaders, drafting dimensions, title block, timed English captions."""
from functools import lru_cache
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from .solid import ease
ROOT=Path(__file__).resolve().parents[1]
INK='#181817'; GRAPH='#5a5955'; FAINT='#8a8984'; ACC='#ed481b'; PAPER='#f6f5f0'

@lru_cache(maxsize=128)
def face(size,mono=False,bold=False):
    font=ImageFont.truetype(str(ROOT/'fonts'/('PlexMono.ttf' if mono else 'PlexSans.ttf')),size)
    if not mono:
        axes=font.get_variation_axes()
        font.set_variation_by_axes([650 if b'Weight' in a['name'] and bold else 400 if b'Weight' in a['name'] else a['default'] for a in axes])
    return font

@lru_cache(maxsize=480)
def glyphs(s,size,mono,bold,colour):
    f=face(size,mono,bold)
    im=Image.new('RGBA',(max(2,math.ceil(f.getlength(s))+6),int(size*1.65)),(0,0,0,0))
    ImageDraw.Draw(im).text((2,size*1.12),s,font=f,fill=colour,anchor='ls')
    return im

class Sheet:
    def __init__(self,image):
        self.image=image
        self.d=ImageDraw.Draw(image)
    def text(self,x,y,s,size=24,colour=INK,bold=False,mono=False,p=1.,out=0.):
        im=glyphs(s,size,mono,bold,colour)
        left=round(im.width*min(1,max(0,out))); right=round(im.width*min(1,max(0,p)))
        if right>left:
            crop=im.crop((left,0,right,im.height)) if left or right<im.width else im
            self.image.paste(crop,(round(x-2+left),round(y-size*1.12)),crop)
        return im.width
    def line(self,points,colour=GRAPH,width=2,dash=0):
        for a,b in zip(points,points[1:]):
            a,b=np.asarray(a,float),np.asarray(b,float); delta=b-a
            if dash:
                dist=np.linalg.norm(delta)
                for u in np.arange(0,dist,dash*1.8):
                    self.d.line([tuple(a+delta*u/dist),tuple(a+delta*min(dist,u+dash)/dist)],fill=colour,width=width)
            else:self.d.line([tuple(a),tuple(b)],fill=colour,width=width)
    def circle(self,x,y,r,colour=INK,fill=None,width=2):
        self.d.ellipse((x-r,y-r,x+r,y+r),outline=colour,fill=fill,width=width)
    def leader(self,anchor,end,name,spec='',number=None,p=1.,accent=False):
        if p<=0:return
        name=name.upper(); col=ACC if accent else INK
        a=np.asarray(anchor); x,y=end
        elbow=np.array([x-26 if x>a[0] else x+12,y-6])
        self.line([a,a+(elbow-a)*min(1,p*2)],col,1)
        self.circle(*a,3,col,col)
        if number and p>.40:
            self.circle(x,y-5,13,col,PAPER)
            self.text(x-6,y+1,str(number),17,col,mono=True,p=min(1,p*2))
            x+=23
        self.text(x,y,name,23,col,True,p=ease(.24,.85,p))
        if spec:self.text(x,y+26,spec,16,GRAPH,mono=True,p=ease(.4,1,p))
    def ruler(self,a,b,label,p=1.):
        if p<=0:return
        a,b=np.asarray(a),np.asarray(b); mid=(a+b)/2; v=(b-a)*.5*min(1,p*1.5)
        self.line([mid-v,mid+v],GRAPH,2)
        n=np.array([-(b-a)[1],(b-a)[0]],float); n/=max(np.linalg.norm(n),1e-9)
        for point in (a,b):self.line([point-n*8*p,point+n*8*p],INK)
        self.text(mid[0]-30,mid[1]-14,label,24,INK,mono=True,p=p)
    def caption(self,cue,t):
        lines=cue.get('caption',[cue['text']]); start,end=cue['start'],cue['end']
        if not start<=t<end:return
        size=34; width=max(face(size).getlength(s) for s in lines)
        top=995-42*(len(lines)-1)
        self.d.rectangle((48,top-40,84+width,top+15+42*(len(lines)-1)),fill=PAPER)
        self.d.rectangle((48,top-40,51,top+15+42*(len(lines)-1)),fill=INK)
        for i,s in enumerate(lines):self.text(70,top+42*i,s,size,p=ease(start,start+.12,t))
    def titleblock(self,x,y,rows,t):
        w,h=850,44*len(rows)
        p=ease(0,.55,t)
        if p<=0:return
        for i in range(len(rows)+1):self.line([(x,y+i*44),(x+w*p,y+i*44)],GRAPH,2 if i in (0,len(rows)) else 1)
        for dx in (0,116,w):self.line([(x+dx,y),(x+dx,y+h*p)],GRAPH,1)
        for i,(k,v) in enumerate(rows):
            q=ease(.25+i*.13,.75+i*.13,t)
            self.text(x+13,y+29+i*44,k,14,GRAPH,mono=True,p=q)
            self.text(x+130,y+30+i*44,v,22,INK,bold=True,p=q)
