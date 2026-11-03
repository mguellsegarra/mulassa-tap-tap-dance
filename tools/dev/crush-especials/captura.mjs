import {chromium} from '/tmp/ui-inv-pw/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const names=['aliga','carretilla','tronada'];
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#3d2417;color:#ffe6c4;font:14px system-ui}main{display:flex;justify-content:center;gap:32px;padding:32px}figure{margin:0;text-align:center;display:grid;justify-items:center;gap:16px}img{width:45px;height:45px}figcaption{font-size:12px}</style><main>${names.map(n=>`<figure><img src="data:image/png;base64,${readFileSync(new URL(n+'.png',import.meta.url)).toString('base64')}"><figcaption>${n}</figcaption></figure>`).join('')}</main>`;
writeFileSync(new URL('revisio.html',import.meta.url),html);
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{const page=await browser.newPage({viewport:{width:400,height:150},deviceScaleFactor:1});await page.setContent(html);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.screenshot({path:new URL('captura-45px.png',import.meta.url).pathname});}finally{await browser.close();}
