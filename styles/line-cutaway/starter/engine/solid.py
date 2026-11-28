"""Millimetre-scale surfaces. Y is up. Mesh rows contain position and normal."""
import math
import numpy as np


def unit(v):
    v = np.asarray(v, dtype=float)
    return v / max(np.linalg.norm(v), 1e-12)


def move(x=0, y=0, z=0):
    mat = np.eye(4)
    mat[:3, 3] = [x, y, z]
    return mat


def rotate(degrees, axis='z'):
    a = math.radians(degrees)
    c, s = math.cos(a), math.sin(a)
    i, j = {'x': (1, 2), 'y': (2, 0), 'z': (0, 1)}[axis]
    mat = np.eye(4)
    mat[i,i] = mat[j,j] = c
    mat[i,j], mat[j,i] = -s, s
    return mat


def scale(x, y, z):
    return np.diag([x, y, z, 1.])


def lathe(profile, steps=120, arc=(0,360)):
    """Revolve an ordered (radius,height) outline from bottom up on its exterior.
    Close the section profile yourself to leave an axial hole. Negative arc sweep
    is unsupported. End faces on a partial revolution are authored separately.
    """
    a = np.radians(np.linspace(*arc, steps+1))
    c, s = np.cos(a), np.sin(a)
    rings = [np.stack((r*c, y*np.ones_like(c), r*s),axis=1) for r,y in profile]
    strips = []
    for (r0,y0),(r1,y1),lo,hi in zip(profile,profile[1:],rings,rings[1:]):
        dr,dy = r1-r0,y1-y0
        norm = max(1e-9,math.hypot(dr,dy))
        n = np.stack((dy*c,-dr*np.ones_like(c),dy*s),axis=1)/norm
        l, h = np.c_[lo,n],np.c_[hi,n]
        strips.append(np.stack((l[:-1],h[:-1],l[1:],l[1:],h[:-1],h[1:]),axis=1).reshape(-1,6))
    return np.concatenate(strips).astype('f4')


def ring(outer, inner, bottom, top, steps=120, arc=(0,360)):
    return lathe([(inner,bottom),(outer,bottom),(outer,top),(inner,top),(inner,bottom)],steps,arc)


def tube(points, radius, sides=10):
    p = np.asarray(points,dtype=float)
    tangent=np.gradient(p,axis=0)
    tangent/=np.maximum(np.linalg.norm(tangent,axis=1,keepdims=True),1e-9)
    # Parallel transport the cross section to avoid twists along a bent path.
    n=unit(np.cross(tangent[0],[0,1,0] if abs(tangent[0,1])<.9 else [1,0,0]))
    frames=[]
    angles=np.linspace(0,2*np.pi,sides+1)
    for v,axis in zip(p,tangent):
        n=unit(n-axis*np.dot(n,axis))
        b=np.cross(axis,n)
        normals=np.outer(np.cos(angles),n)+np.outer(np.sin(angles),b)
        frames.append(np.c_[v+radius*normals,normals])
    a=np.asarray(frames)
    return np.stack((a[:-1,:-1],a[:-1,1:],a[1:,:-1],a[:-1,1:],a[1:,1:],a[1:,:-1]),axis=2).reshape(-1,6).astype('f4')


def box(width,height,depth):
    result=[]
    for index in range(3):
        for sign in (-1,1):
            normal=np.eye(3)[index]*sign
            p=[]
            for a,b in [(-1,-1),(1,-1),(1,1),(-1,1)]:
                xyz=np.roll([sign,a,b],index)*np.array([width,height,depth])*.5
                p.append(np.r_[xyz,normal])
            result.extend(p[i] for i in ((0,1,2,0,2,3) if sign>0 else (0,2,1,0,3,2)))
    return np.float32(result)


def transformed(mesh,mat):
    p=mesh[:,:3]@mat[:3,:3].T+mat[:3,3]
    n=mesh[:,3:]@np.linalg.inv(mat[:3,:3])
    n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12)
    return np.c_[p,n].astype('f4')


def ease(a,b,t):
    u=float(np.clip((t-a)/(b-a),0,1))
    return u*u*(3-2*u)


def track(keys,t):
    """Interpolate camera and object keyframes, easing both ends."""
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:
            f=ease(a,b,t)
            return np.asarray(x)*(1-f)+np.asarray(y)*f
    return np.asarray(keys[-1][1])
