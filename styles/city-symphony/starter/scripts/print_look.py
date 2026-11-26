"""Photographic release-print pass and metrical split-screen primitives. All plates use BGR."""
import math
import cv2
import numpy as np


def cover(image, width, height, zoom=1.0, center=(.5,.5)):
    h,w=image.shape[:2]
    ratio=min(w/width,h/height)/zoom
    cw,ch=max(1,round(width*ratio)),max(1,round(height*ratio))
    x=min(w-cw,max(0,round(center[0]*w-cw/2)))
    y=min(h-ch,max(0,round(center[1]*h-ch/2)))
    return cv2.resize(image[y:y+ch,x:x+cw],(width,height),interpolation=cv2.INTER_LINEAR)


class Print:
    def __init__(self,width=1280,height=720,seed=713):
        self.width,self.height=width,height
        self.bar=round((height-width/1.85)/2)
        u=np.arange(256)/255
        shoulder=1/(1+np.exp(-6.2*(u-.47)))
        shoulder=(shoulder-shoulder[0])/(shoulder[-1]-shoulder[0])
        curve=(7+243*(.55*shoulder+.45*u))
        self.tone=np.clip(curve[:,None,None]*np.array([.965,1,1.025]),0,255).round().astype('uint8')
        yy,xx=np.ogrid[-1:1:height*1j,-1:1:width*1j]
        vignette=1-.105*np.clip((xx**2+yy**2-.15)/1.85,0,1)
        self.falloff=cv2.merge([np.round(vignette*255).astype('uint8')]*3)
        rng=np.random.default_rng(seed)
        self.grain=[]
        for _ in range(19):
            noise=rng.normal(128,4.3,(height//2,width//2)).clip(0,255).astype('uint8')
            noise=cv2.resize(noise,(width,height),interpolation=cv2.INTER_LINEAR)
            self.grain.append(cv2.cvtColor(noise,cv2.COLOR_GRAY2BGR))

    def grade(self,plate,frame,night=False,exposure=1.0):
        if exposure!=1.0:
            plate=cv2.convertScaleAbs(plate,alpha=exposure)
        low=cv2.resize(plate,(self.width//8,self.height//8),interpolation=cv2.INTER_AREA)
        bloom=cv2.GaussianBlur(cv2.subtract(low,(168,168,168,0)),(0,0),2.1)
        dx=.27*math.sin(frame*.201)+.12*math.sin(frame*.037)
        dy=.25*math.sin(frame*.169+.4)+.09*math.cos(frame*.051)
        plate=cv2.warpAffine(plate,np.float32([[1,0,dx],[0,1,dy]]),(self.width,self.height),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT_101)
        image=cv2.LUT(plate,self.tone)
        gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
        image=cv2.addWeighted(image,.88,cv2.cvtColor(gray,cv2.COLOR_GRAY2BGR),.12,0)
        image=cv2.addWeighted(image,1,cv2.resize(bloom,(self.width,self.height)),.18 if night else .095,0)
        image=cv2.multiply(image,self.falloff,scale=1/255)
        image=cv2.addWeighted(image,1,self.grain[(frame*7+frame//19)%19],1,-128)
        return image

    def matte(self,image):
        if self.bar:
            image[:self.bar]=0
            image[-self.bar:]=0
        return image


def day_ring(image,phase,intensity=1):
    h,w=image.shape[:2];s=w/1920;cx,cy=round(w*.918),round(h*.869)
    rad=round(45*s);center=(cx,cy);ink=image.copy()
    cv2.circle(ink,center,rad,(138,151,158),max(1,round(1.5*s)),cv2.LINE_AA)
    for k in range(24):
        angle=k*math.tau/24-math.pi/2
        inner=rad-(5 if k%6==0 else 2)*s
        pts=[(round(cx+math.cos(angle)*rr),round(cy+math.sin(angle)*rr)) for rr in (inner,rad)]
        cv2.line(ink,*pts,(128,143,147),1,cv2.LINE_AA)
    angle=phase*math.tau-math.pi/2
    cv2.ellipse(ink,center,(rad,rad),0,phase*360-135,phase*360-90,(45,118,215),max(1,round(2*s)),cv2.LINE_AA)
    cv2.line(ink,center,(round(cx+math.cos(angle)*(rad-4)),round(cy+math.sin(angle)*(rad-4))),(54,145,232),max(1,round(2*s)),cv2.LINE_AA)
    x,y=cx-rad-3,cy-rad-3; sl=np.s_[y:cy+rad+4,x:cx+rad+4]
    image[sl]=cv2.addWeighted(image[sl],1-intensity,ink[sl],intensity,0)
    return image


def split(left,right,age,gutter=4):
    h,w=left.shape[:2];half=w//2
    image=np.concatenate([cover(left,half,h),cover(right,w-half,h)],axis=1)
    g=round(gutter*min(1,(age+1)/8))
    if g:image[:,half-g//2:half+(g+1)//2]=0
    return image


def grid(plates,cols,rows,width,height,gutter=4):
    canvas=np.zeros((height,width,3),np.uint8)
    for n,plate in enumerate(plates[:cols*rows]):
        c,r=n%cols,n//cols
        x0,x1=round(c*width/cols)+(gutter//2 if c else 0),round((c+1)*width/cols)-(gutter//2 if c+1<cols else 0)
        y0,y1=round(r*height/rows)+(gutter//2 if r else 0),round((r+1)*height/rows)-(gutter//2 if r+1<rows else 0)
        canvas[y0:y1,x0:x1]=cover(plate,x1-x0,y1-y0)
    return canvas
