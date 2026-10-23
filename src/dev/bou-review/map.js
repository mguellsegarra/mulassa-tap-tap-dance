import {bouPose} from '../../game/bou-dance.js';
export function createMap(canvas,phrases){
  const ctx=canvas.getContext('2d'),size=144,centre=size/2,scale=22;
  const paths=phrases.map(p=>{const points=[];for(let t=p.start;t<p.end;t+=.1){const pose=bouPose(t);points.push([centre-pose.z*scale,centre+pose.x*scale]);}return points;});
  return (index,t)=>{
    ctx.clearRect(0,0,size,size);ctx.strokeStyle='#c9c0b1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(centre,20);ctx.lineTo(centre,size-20);ctx.moveTo(20,centre);ctx.lineTo(size-20,centre);ctx.stroke();
    ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#655f53';ctx.fillText('N',centre,16);ctx.fillText('S',centre,size-6);ctx.fillText('W',12,centre+4);ctx.fillText('E',size-12,centre+4);
    ctx.beginPath();paths[index].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle='#b88022';ctx.lineWidth=2;ctx.stroke();
    const p=bouPose(t),x=centre-p.z*scale,y=centre+p.x*scale;
    ctx.fillStyle='#704534';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(p.yaw)*15,y+Math.sin(p.yaw)*15);ctx.strokeStyle='#704534';ctx.lineWidth=3;ctx.stroke();
  };
}
