import {BOU_TIMING} from './src/game/bou-dance.js';import {buildBou} from './src/scene/models/bou.js';import {createBouMotion} from './src/scene/bou-motion.js';
const rig=buildBou(),motion=createBouMotion(rig);let n=0;
for(const fps of [30,60,120])for(let i=0;i<=Math.ceil(BOU_TIMING.duration*fps);i++){const t=i/fps;motion(t);for(let k=1;k<8;k+=2)if(rig.legs[k].scale.y>.4251)n++;}
console.log('stretched shins',n);
