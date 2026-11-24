import sys
from PIL import Image
ims=[]
for p in sys.argv[2:]:
    im=Image.open(p); bg=Image.new('RGBA',im.size,(60,120,60,255)); bg.alpha_composite(im); ims.append(bg)
W=max(i.width for i in ims); Hh=sum(i.height for i in ims)+4*len(ims)
o=Image.new('RGBA',(W,Hh),(20,20,20,255)); y=0
for i in ims: o.paste(i,(0,y)); y+=i.height+4
s=min(3, 1900//W) or 1
o.resize((o.width*s,o.height*s),Image.NEAREST).save(sys.argv[1])
