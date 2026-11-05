import { chromium } from '/tmp/ui-inv-pw/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const env=Object.fromEntries(['HOME','PATH','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
const browser=await chromium.launch({channel:'chrome',chromiumSandbox:true,headless:true,env});
try {
 console.log('Chrome',browser.version());
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 for(let n=1;n<=3;n++){
  await page.goto(new URL(`g${n}.html`,import.meta.url).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`${root}g${n}.png`});
  console.log(n,await page.evaluate(()=>({width:document.body.scrollWidth,height:document.body.scrollHeight,font:document.fonts.check('100px VC')})));
 }
}finally{await browser.close()}
