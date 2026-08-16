from PIL import Image, ImageEnhance
import base64, io, os
src='/home/diamond/projects/MetaArchitect/projects/simonparis-website/public/simon-paris.png'
im=Image.open(src).convert('RGBA')
bg=Image.new('RGBA',im.size,(16,46,51,255))
im=Image.alpha_composite(bg,im).convert('RGB')
W,H=im.size; w=int(H*0.8); left=max(0,min(W-w,660-w//2))
im=im.crop((left,0,left+w,H)).resize((760,950),Image.LANCZOS)
im=ImageEnhance.Color(im).enhance(0.42); im=ImageEnhance.Contrast(im).enhance(1.06)
buf=io.BytesIO(); im.save(buf,'JPEG',quality=84,optimize=True,progressive=True)
html=open('atelier-a.src.html').read()
html=html.replace('/*@FONTS@*/',open('/tmp/faces.css').read())
html=html.replace('@PORTRAIT@','data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode())
open('atelier-a.html','w').write(html)
print('built', os.path.getsize('atelier-a.html')//1024,'KB')
