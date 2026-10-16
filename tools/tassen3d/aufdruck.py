from PIL import Image, ImageDraw, ImageFont
W,H=4096,1024  # volle 360°, Höhe = Wandbereich
img=Image.new('L',(W,H),0); d=ImageDraw.Draw(img)
cx=W//2
def font(path,size,wght=None,opsz=None):
    f=ImageFont.truetype(path,size)
    try:
        axes=f.get_variation_axes(); vals=[]
        for a in axes:
            n=a['name'] if isinstance(a['name'],str) else a['name'].decode()
            vals.append({b'Weight':wght,'Weight':wght,'Optical size':opsz,b'Optical size':opsz}.get(n) or a['default'])
        f.set_variation_by_axes(vals)
    except Exception as e: print('axes',e)
    return f
def ctext(y,t,f,spacing=0):
    if spacing:
        widths=[d.textlength(ch,font=f) for ch in t]; total=sum(widths)+spacing*(len(t)-1); x=cx-total/2
        for ch,w in zip(t,widths): d.text((x,y),ch,font=f,fill=255,anchor='ls'); x+=w+spacing
    else: d.text((cx,y),t,font=f,fill=255,anchor='ms')
ctext(300,'GLÜHWEIN',font('inter.ttf',64,wght=600),spacing=22)
ctext(640,'26',font('fraunces.ttf',380,wght=600,opsz=144))
ctext(740,'BIELEFELD',font('inter.ttf',46,wght=500),spacing=30)
d.line((cx-200,800,cx-30,800),fill=255,width=5); d.line((cx+30,800,cx+200,800),fill=255,width=5)
import math
pts=[(cx+ (20 if i%2==0 else 8)*math.cos(-math.pi/2+i*math.pi/5), 800+(20 if i%2==0 else 8)*math.sin(-math.pi/2+i*math.pi/5)) for i in range(10)]
d.polygon(pts,fill=255)
img.save('label.png')
# Orangenscheibe von oben
S=512; o=Image.new('RGB',(S,S),(214,110,20)); od=ImageDraw.Draw(o)
od.ellipse((8,8,S-8,S-8),fill=(232,138,32)); od.ellipse((26,26,S-26,S-26),fill=(250,226,170))
for i in range(10):
    a0=i*36+3; a1=(i+1)*36-3
    od.pieslice((44,44,S-44,S-44),a0,a1,fill=(242,150,40))
od.ellipse((S/2-18,S/2-18,S/2+18,S/2+18),fill=(250,226,170))
o.save('orange.png'); print('ok')
