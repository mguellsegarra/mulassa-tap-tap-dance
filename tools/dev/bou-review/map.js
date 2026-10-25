// Same rehearsal compass as the Mulassa comparator; the path is the current Bou's, not a measured video path.
import {bouPose,newBouPose} from '../../../src/figures/bou/bou-dance.js';
import {makeDirections} from '../bestiari-compare/directions.js';
export function createMap(canvas,phrases){
  const ctx=canvas.getContext('2d'),W=560,H=360,scale=34,cx=W/2,cy=H/2;
  canvas.width=W;canvas.height=H;
  const directions=makeDirections(bouPose(0)),pose=newBouPose(),before=newBouPose(),after=newBouPose();
  const px=p=>cx+directions.east(p.x,p.z)*scale,py=p=>cy+directions.south(p.x,p.z)*scale;
  const paths=phrases.map(p=>{const points=[];for(let t=p.start;t<=p.end;t+=.05){const v=bouPose(t);points.push([px(v),py(v)]);}return points;});
  function trail(points,colour,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.stroke();}
  function arrow(x,y,dx,dy,length,colour){const norm=Math.hypot(dx,dy);if(norm<.001)return;dx/=norm;dy/=norm;
    const ex=x+dx*length,ey=y+dy*length;ctx.strokeStyle=ctx.fillStyle=colour;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-dx*10-dy*5,ey-dy*10+dx*5);ctx.lineTo(ex-dx*10+dy*5,ey-dy*10-dx*5);ctx.closePath();ctx.fill();}
  return (index,t)=>{
    ctx.fillStyle='#f1e6c9';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#dfd3b6';ctx.lineWidth=1;
    for(let x=8;x<W;x+=scale){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=10;y<H;y+=scale){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    paths.forEach(p=>trail(p,'#c5bba5',1));trail(paths[index],'#b87b08',4);
    ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [name,x,y] of [['N',cx,28],['S',cx,H-28],['W',35,cy],['E',W-35,cy]]){
      ctx.fillStyle='#ebc344';ctx.beginPath();ctx.arc(x,y,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#514820';ctx.fillText(name,x,y);}
    bouPose(t,pose);const x=px(pose),y=py(pose);
    ctx.save();ctx.translate(x,y);ctx.rotate(-directions.angle(pose.yaw));
    ctx.fillStyle='#805535';ctx.fillRect(-.55*scale,-1.4*scale,1.1*scale,2.8*scale);
    ctx.fillStyle='#3e5339';ctx.fillRect(-.57*scale,-.65*scale,1.14*scale,1.4*scale);
    ctx.fillStyle='#443024';ctx.fillRect(-.29*scale,1.2*scale,.58*scale,.65*scale);
    ctx.strokeStyle='#bba679';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-.65*scale,1.4*scale);ctx.lineTo(.65*scale,1.4*scale);ctx.stroke();ctx.restore();
    arrow(x,y,-Math.cos(pose.yaw),Math.sin(pose.yaw),88,'#267346');
    bouPose(Math.max(0,t-.08),before);bouPose(t+.08,after);arrow(x,y,px(after)-px(before),py(after)-py(before),65,'#087e8b');
    ctx.textBaseline='alphabetic';
  };
}
