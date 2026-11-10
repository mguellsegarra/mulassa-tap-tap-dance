import { chromium } from '/tmp/ui-inv-pw/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});
const results=[];
try {
for(const v of ['A','B','C','D']){
 const page=await browser.newPage({deviceScaleFactor:1});
 page.on('pageerror',e=>console.log('ERROR',v,e.message));
 for(const [w,h] of [[320,568],[375,667],[393,852],[430,932],[1024,768],[1280,800],[1440,700],[1920,1080]]){
 await page.setViewportSize({width:w,height:h});
 await page.goto('http://192.168.1.232:5191/tools/dev/pop-home/codex/home.html?v='+v+'&mute');
 await page.waitForSelector('body[data-ready="true"]',{timeout:90000});
 const metrics=await page.evaluate(()=>{const sels=['header','.record','.actions','.back','.panel','.launch','.manual','.challenge'];return {overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth,boxes:Object.fromEntries(sels.map(s=>{const el=document.querySelector(s);if(!el)return[s,null];const r=el.getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height,right:innerWidth-r.right,bottom:innerHeight-r.bottom}]}))}});
 results.push({v,w,h,...metrics});
 await page.screenshot({path:`/tmp/pop-home-codex/${v}-${w}x${h}.png`});
 await page.locator('.help').first().click();
 await page.screenshot({path:`/tmp/pop-home-codex/${v}-help-${w}x${h}.png`});
 await page.locator('#close').click();
 }
 await page.close();
}
await fs.writeFile('/tmp/pop-home-codex/measurements.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({v,w,h,overflow})=>({v,w,h,overflow}))));
}finally{await browser.close()}
