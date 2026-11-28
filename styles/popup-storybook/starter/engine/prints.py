"""Print the backing sheet, deckle edges, standing type and sky furniture."""
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageColor, ImageFilter

def paper(size, seed):
    rng = np.random.default_rng(seed)
    fields = np.full((size,size), 128.,np.float32)
    for count, amplitude in [(7,6),(21,5),(70,4),(220,4),(size,5)]:
        rough = rng.normal(128,24,(count,count)).clip(0,255).astype('uint8')
        layer = Image.fromarray(rough).resize((size,size),Image.Resampling.BICUBIC)
        fields += (np.asarray(layer).astype('f4')-128) * (amplitude/24)
    im = Image.fromarray(fields.clip(0,255).astype('uint8')).convert('RGB')
    d = ImageDraw.Draw(im,'RGBA')
    r = random.Random(seed)
    for _ in range(size*6):
        x,y = r.randrange(size),r.randrange(size)
        d.line((x,y,x+r.randint(-3,4),y+r.randint(-2,3)),fill=(78,53,46,r.randrange(10,38)))
    return im

def disk(color,rim,seed,floor=None):
    size = 1024
    rng = random.Random(seed)
    im = Image.new('RGBA',(size,size))
    d = ImageDraw.Draw(im)
    def circle(r,dy,tone):
        pts=[]
        for i in range(1100):
            a=i*2*math.pi/1100
            radius=r+1.8*math.sin(11*a)+1.1*math.sin(23*a)+rng.uniform(-1.5,1.5)
            pts.append((512+radius*math.cos(a),510+dy+radius*math.sin(a)))
        d.polygon(pts,fill=tone)
    circle(495,6,'#af865b');circle(493,2,'#f4dfb6')
    circle(489,0,rim);circle(478,0,color)
    if floor:
        over=Image.open(floor).convert('RGBA').resize(im.size,Image.Resampling.LANCZOS)
        alpha=im.getchannel('A')
        im.alpha_composite(over)
        im.putalpha(alpha)
    rgb=np.asarray(im).copy()
    grain=np.asarray(paper(size,seed))[:,:,0].astype('f4')-127
    rgb[:,:,:3]=np.clip(rgb[:,:,:3]+grain[:,:,None]*.75,0,255)
    return Image.fromarray(rgb)

def titleprint(lines,fontpath):
    if not lines: lines=[' ']
    sizes=[100 if len(lines)>1 and i==0 else 181 for i in range(len(lines))]
    faces=[]
    for size in sizes:
        font=ImageFont.truetype(str(fontpath),size)
        try: font.set_variation_by_axes([700])
        except (OSError,ValueError): pass
        faces.append(font)
    widths=[font.getlength(line) for font,line in zip(faces,lines)]
    im=Image.new('RGBA',(int(max(widths))+42,sum(sizes)+44))
    d=ImageDraw.Draw(im)
    y=12
    for font,line,size in zip(faces,lines,sizes):
        d.text((im.width/2,y),line,font=font,anchor='mt',fill='#211b43',stroke_width=5,stroke_fill='#ead4ab')
        d.text((im.width/2,y),line,font=font,anchor='mt',fill='#211b43',stroke_width=1,stroke_fill='#211b43')
        y+=int(size*.78)
    bbox=im.getbbox()
    return im.crop(bbox) if bbox else im

def furniture(kind):
    im=Image.new('RGBA',(320,240))
    d=ImageDraw.Draw(im)
    ink='#664b3c'
    if kind=='cloud':
        pts=[(6,193),(18,171),(41,161),(56,163),(62,138),(80,122),(105,116),(130,128),(144,99),(172,86),(193,92),(212,105),(224,128),(241,120),(268,124),(281,141),(281,153),(300,158),(313,177),(313,189)]
        d.polygon(pts,fill='#ecdbc0',outline=ink,width=3)
        d.arc((53,116,130,175),185,286,fill='#a48672',width=3)
        d.arc((134,94,216,168),182,285,fill='#ae967e',width=3)
        for i in range(22):
            x=19+i*13
            d.line((x,182,x+7,174),fill='#c3a98d',width=2)
    elif kind=='planet':
        d.polygon([(156,217),(162,217),(168,77),(159,77)],fill='#a28c73',outline=ink,width=2)
        d.ellipse((97,12,223,134),fill='#c4adb7',outline='#755f72',width=4)
        d.arc((101,18,216,132),200,300,fill='#e1d0c6',width=5)
        for x,y,w,h in [(134,51,12,9),(176,71,17,13),(142,90,6,5),(185,44,6,5),(117,65,5,4)]:
            d.ellipse((x-w,y-h,x+w,y+h),fill='#99818f',outline='#806a7c',width=2)
    else:
        d.polygon([(155,214),(162,214),(164,65),(156,65)],fill='#997349',outline=ink,width=2)
        pts=[]
        for i in range(10):
            a=-math.pi/2+i*math.pi/5
            r=59 if i%2==0 else 26
            pts.append((160+r*math.cos(a),66+r*math.sin(a)))
        d.polygon(pts,fill='#eec04e',outline=ink,width=4)
        for i in range(0,10,2):d.polygon([pts[i],pts[(i+1)%10],(159,67)],fill='#ffdc70')
    return im.crop(im.getbbox())
