import { chromium } from '/tmp/ui-inv-pw/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const env=Object.fromEntries(['HOME','PATH','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
const browser=await chromium.launch({channel:'chrome',chromiumSandbox:true,headless:true,env});
try{
 const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 await page.goto(new URL('portada-short.html',import.meta.url).href);
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`${root}portada-short.png`});
 console.log(await page.evaluate(()=>{const r=document.querySelector('.pill').getBoundingClientRect();return {l:r.left,r:1080-r.right,top:r.top,bottom:r.bottom,font:document.fonts.check('800 56px Baloo')}}));
}finally{await browser.close()}
