"""Source-specific diagnostic for D53pgXOeIL0, 0-67s. Inspect masks before accepting rows.
Requires opencv-python-headless and numpy. Output is not motion capture.
"""
import argparse
import cv2,numpy as np,json
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('video');parser.add_argument('output',type=Path)
args=parser.parse_args();root=args.output;root.mkdir(parents=True,exist_ok=True)
cap=cv2.VideoCapture(args.video)
prev=None;cam=np.eye(3);rows=[];last=None
for fi in range(3351):
 ok,bgr=cap.read()
 if not ok:break
 if fi%10:continue
 t=fi/50;im=cv2.resize(bgr,(640,360));gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
 mask=np.zeros((360,640),np.uint8);mask[:150]=255;mask[:150,130:380]=0
 if prev is not None:
  pts=cv2.goodFeaturesToTrack(prev,300,.01,6,mask=mask)
  nxt,st,err=cv2.calcOpticalFlowPyrLK(prev,gray,pts,None)
  valid=(st.ravel()==1)&(err.ravel()<20)
  a,ins=cv2.estimateAffinePartial2D(pts[valid],nxt[valid],method=cv2.RANSAC,ransacReprojThreshold=1.5)
  if a is not None:
   c=np.eye(3);c[:2]=a;cam=c@cam
 hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
 green=cv2.inRange(hsv,np.array([20,40,25]),np.array([80,255,230]));green[:130]=0;green[320:]=0;green[:,:100]=0;green[:,600:]=0
 contours,_=cv2.findContours(green,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 contours=[c for c in contours if cv2.contourArea(c)>350]
 if contours:
  cont=max(contours,key=cv2.contourArea);x,y,w,h=cv2.boundingRect(cont);m=cv2.moments(cont);cx=m['m10']/m['m00'];cy=m['m01']/m['m00'];point=np.linalg.inv(cam)@np.array([cx,cy,1]);scale=np.hypot(cam[0,0],cam[1,0])
  gold=cv2.inRange(hsv,np.array([15,80,80]),np.array([40,255,255])); roi=np.zeros_like(gold); roi[max(0,y+h-8):min(360,y+h+42),max(0,x-160):min(640,x+w+85)]=255; gold=cv2.bitwise_and(gold,roi)
  gc,_=cv2.findContours(gold,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);gc=[c for c in gc if cv2.boundingRect(c)[2]>80]
  hem=None
  if gc:
   g=max(gc,key=lambda c:cv2.boundingRect(c)[2]);vx,vy,xx,yy=cv2.fitLine(g,cv2.DIST_HUBER,0,.01,.01).ravel();hem=float(np.arctan2(vy,vx)-np.arctan2(cam[1,0],cam[0,0]));cv2.drawContours(im,[g],-1,(255,255,0),1)
  rows.append({'hem':hem,'t':t,'cx':cx,'cy':cy,'sx':point[0],'sy':point[1],'w':w,'h':h,'camera':cam[:2].tolist(),'scale':scale})
  if fi%50==0:
   cv2.rectangle(im,(x,y),(x+w,y+h),(255,0,255),2);cv2.imwrite(str(root/f'track-{int(t):02d}.jpg'),im)
 prev=gray
(root/'tracking-raw.json').write_text(json.dumps(rows))
print('rows',len(rows));print([(r['t'],round(r['sx']),round(r['sy']),r['w'],round(r['scale'],2)) for r in rows if r['t']%2==0])
