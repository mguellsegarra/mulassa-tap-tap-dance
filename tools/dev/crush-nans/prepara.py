from PIL import Image
import numpy as np,json
from scipy import ndimage as nd
from skimage.color import rgb2lab,deltaE_ciede2000
from pathlib import Path
out=Path('tools/dev/crush-nans'); base=Path('tools/dev/crush-gominoles'); root=Path('/Users/marc/.codex/generated_images/01a19d2c-dc6d-7680-8df9-eaf83e25b118')
files=['7b5e6ee6-a392-423b-b106-7a98e381f4ba','06e4d47f-0c63-491f-b43b-6a4f2d81d917','5b11fb1e-b209-4ad1-a0f5-3c3b6db305f3','439d5c46-d78d-48c0-bb5c-a75624cc50dc']; alpha={}
for k,f in zip('ABCD',files):
 im=Image.open(root/('exec-'+f+'.png')).convert('RGBA'); a=np.array(im); m=nd.binary_opening(a[:,:,3]>80,iterations=2); lab,n=nd.label(m); counts=np.bincount(lab.ravel()); counts[0]=0; m=nd.binary_fill_holes(lab==counts.argmax()); m=nd.binary_dilation(m,iterations=1)&(a[:,:,3]>12); lab,n=nd.label(m); counts=np.bincount(lab.ravel()); counts[0]=0; m=lab==counts.argmax(); removed=int(((a[:,:,3]>0)&~m).sum()); a[:,:,3][~m]=0
 im=Image.fromarray(a); im=im.crop(im.getbbox()); im.thumbnail((870,870),Image.Resampling.LANCZOS); canvas=Image.new('RGBA',(1024,1024)); canvas.paste(im,((1024-im.width)//2,(1024-im.height)//2)); a=np.array(canvas); a[:,:,3][a[:,:,3]<=12]=0; lab,n=nd.label(a[:,:,3]>0); counts=np.bincount(lab.ravel()); counts[0]=0;a[:,:,3][lab!=counts.argmax()]=0; canvas=Image.fromarray(a);canvas.save(out/(k+'.png')); mask=a[:,:,3]>0; alpha[k]={'components':nd.label(mask)[1],'holes':int((nd.binary_fill_holes(mask)&~mask).sum()),'removed':removed}
ids=['drac','basilisc','bou','lleo','mulassa','aliga']; names=['Drac','Basilisc','Bou','Lleó','Mulassa','Àliga']; imgs={n:Image.open(base/(n+'.png')).convert('RGBA') for n in ids}; imgs.update({k:Image.open(out/(k+'.png')) for k in 'ABCD'})
bgs=[np.array([61,36,23])/255]; bgs.append(bgs[0]*.92+np.array([255,220,170])/255*.08)
def lin(x):return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
def srgb(x):return np.where(x<=.0031308,x*12.92,1.055*np.maximum(x,0)**(1/2.4)-.055)
def transform(x,mode):
 x=lin(x)
 if mode=='grisos':x=np.repeat((x@np.array([.2126,.7152,.0722]))[...,None],3,axis=-1)
 if mode=='deuteranopia':x=x@np.array([[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.011820,.042940,.968881]]).T
 return srgb(np.clip(x,0,1))
metrics={}
for k in 'ABCD':
 metrics[k]={}
 for mode in ['color','grisos','deuteranopia']:
  best=(999,None,None)
  for bi,bg in enumerate(bgs):
   labs={}
   for n,im in imgs.items():
    a=np.array(im)/255; rgb=a[:,:,:3]*a[:,:,3,None]+bg*(1-a[:,:,3,None]); rgb=transform(rgb,mode); med=np.median(rgb[a[:,:,3]>.1],axis=0);labs[n]=rgb2lab(med.reshape(1,1,3))[0,0]
   for n,name in zip(ids,names):
    d=float(deltaE_ciede2000(labs[k],labs[n]));
    if d<best[0]:best=(d,name,bi)
  metrics[k][mode]={'de00':round(best[0],2),'figura':best[1],'fons':best[2]}
 # same deterministic board for each alternative
 seq=ids+[k]; board=Image.new('RGB',(315,450))
 for r in range(10):
  for c in range(7):
   bg=tuple(np.round(bgs[(r+c)%2]*255).astype(int));tile=Image.new('RGBA',(45,45),bg+(255,)); piece=imgs[seq[(r*3+c*2+(r//3))%7]].resize((45,45),Image.Resampling.LANCZOS);tile.alpha_composite(piece);board.paste(tile.convert('RGB'),(c*45,r*45))
 board.save(out/(k+'-tauler-45.png')); rgb=np.array(board)/255; Image.fromarray(np.uint8(np.round(np.clip(transform(rgb,'grisos'),0,1)*255))).save(out/(k+'-tauler-45-gris.png'))
 sheet=Image.new('RGB',(640,400))
 for j,bg in enumerate([(61,36,23),(255,242,220)]):
  sheet.paste(bg,(320*j,0,320*(j+1),400)); big=imgs[k].resize((280,280),Image.Resampling.LANCZOS);sheet.paste(big,(320*j+20,12),big);small=imgs[k].resize((45,45),Image.Resampling.LANCZOS);sheet.paste(small,(320*j+137,330),small)
 sheet.save(out/(k+'-clar-fosc.png'))
(out/'mesures.json').write_text(json.dumps({'metrics':metrics,'alpha':alpha},ensure_ascii=False,indent=2));print(json.dumps({'metrics':metrics,'alpha':alpha},ensure_ascii=False))
