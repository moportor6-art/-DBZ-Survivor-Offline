"""num.py hoja [tol] [islas] [dil] → /home/claude/bf/n_<hoja>.png con las figuras numeradas (y partes si es muy alta)"""
import sys
from PIL import ImageDraw
from blobs import blobs
h=sys.argv[1]; tol=int(sys.argv[2]) if len(sys.argv)>2 else 18; isl=len(sys.argv)>3 and sys.argv[3]=='1'; dil=int(sys.argv[4]) if len(sys.argv)>4 else 2
im,a,s,l,res=blobs('hojas/'+h,tol=tol,islas=isl,dil=dil)
m=im.convert('RGB'); d=ImageDraw.Draw(m)
for k,b in enumerate(res): d.rectangle(b[:4],outline=(0,255,0)); d.text((b[0],max(0,b[1]-9)),str(k),fill=(255,255,0))
W,H=m.size; step=int(W*0.75)
for i,y in enumerate(range(0,H,step)):
    c=m.crop((0,y,W,min(H,y+step)))
    if W>1300: c=c.resize((1300,int(c.size[1]*1300/W)))
    c.save(f'/home/claude/bf/n_{h[:-4]}_{i}.png')
print(len(res), W, H, (H+step-1)//step)
