import av
from PIL import Image,ImageDraw
from pathlib import Path
out=Path(__file__).parent
video=out.parent/'media/mulassa-videoclip-16x9-opus-b-youtube.mp4'
canvas=Image.new('RGB',(1200,900))
for i,t in enumerate([4,10,17,25,33,41,49,57,65,73,81,89,97,105,113,121]):
 c=av.open(str(video)); s=c.streams.video[0]; c.seek(int(t/float(s.time_base)),stream=s)
 for f in c.decode(s):
  if f.time>=t: break
 im=f.to_image(); im.save(out/f'frames/f{t:03}.png'); im.thumbnail((300,200)); x=i%4*300;y=i//4*225;canvas.paste(im,(x,y));ImageDraw.Draw(canvas).text((x+8,y+202),str(t),fill='white');c.close()
canvas.save(out/'frames/contact.png')
