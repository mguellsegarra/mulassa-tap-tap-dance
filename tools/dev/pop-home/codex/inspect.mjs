import { chromium } from '/tmp/ui-inv-pw/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});
try{
const page=await browser.newPage({viewport:{width:1400,height:900}});
for(const v of ['A','B','C','D']){
const imgs=[];
for(const [w,h] of [[320,568],[375,667],[393,852],[430,932],[1024,768],[1280,800],[1440,700],[1920,1080]]){
const name=v+'-'+w+'x'+h;imgs.push('<figure><figcaption>'+name+'</figcaption><img src="data:image/png;base64,'+(await fs.readFile('/tmp/pop-home-codex/'+name+'.png')).toString('base64')+'"></figure>');
}
await page.setContent('<style>body{background:#11152c;color:white;font:16px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}img{width:100%;height:370px;object-fit:contain}</style>'+imgs.join(''));
await page.screenshot({path:'/tmp/pop-home-codex/'+v+'-overview.png',fullPage:true});
}
await page.goto('http://192.168.1.232:5191/tools/dev/pop-home/codex/');
await page.locator('#phone').waitFor();
await page.locator('#note').fill('Nota de comprovació');
await page.reload();await page.waitForFunction(()=>document.querySelector('#note').value==='Nota de comprovació');
await page.locator('#note').fill('');
await page.getByRole('button',{name:'C · Aprèn i juga',exact:true}).click();
await page.frameLocator('#phone').locator('body[data-ready="true"]').waitFor({timeout:90000});
await page.frameLocator('#desktop').locator('body[data-ready="true"]').waitFor({timeout:90000});
await page.screenshot({path:'/tmp/pop-home-codex/review.png',fullPage:true});
console.log('Notes persistents i selector verificats');
}finally{await browser.close()}
