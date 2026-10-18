/* Real Chromium checks on the Linux build runner; no production runtime dependencies. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist'),shots=path.resolve('tool-verification');
fs.mkdirSync(shots,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://local').pathname);
 let file=path.resolve(root,'.'+route);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)&&!path.extname(file)&&fs.existsSync(file+'.html'))file+='.html';
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
async function noOverflow(page,label){
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)}).slice(0,12).map(e=>({tag:e.tagName,id:e.id,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))}));
 assert.ok(overflow.scroll<=overflow.width+1,label+' overflows '+JSON.stringify(overflow));
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 try{
  const errors=[],page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/tools/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.tool-card').count(),4);
  await page.screenshot({path:path.join(shots,'tools-desktop.png'),fullPage:true});
  await page.goto(url+'/tools/zhiguogong/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#totalCount').textContent==='19,426');
  await page.selectOption('#province','湖北省');
  let city=await page.locator('#citySelect option').allTextContents();assert.ok(city.includes('武汉市'));assert.ok(!city.includes('长沙市'));
  await page.selectOption('#citySelect','武汉市');
  await page.selectOption('#province','湖南省');assert.equal(await page.locator('.city-chip').count(),0);city=await page.locator('#citySelect option').allTextContents();assert.ok(city.includes('长沙市'));assert.ok(!city.includes('武汉市'));
  await page.click('[data-preset="philosophy"]');assert.equal(await page.locator('#matchCount').textContent(),'4');
  await page.click('[data-status="match"]');assert.equal(await page.locator('.job-card').count(),4);
  await page.click('.job-card [data-action="favorite"]');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#savedCount').textContent(),'1');
  await page.click('#browseMajor');await page.fill('#majorSearch','电子');assert.ok(await page.locator('.major-choice').count()>5);
  await page.click('#majorDialog .close-dialog');
  await page.screenshot({path:path.join(shots,'zhiguogong-desktop.png'),fullPage:false});
  for(const width of [320,375,390,430,768]){
   await page.setViewportSize({width,height:844});
   await page.goto(url+'/tools/zhiguogong/',{waitUntil:'networkidle'});await noOverflow(page,'zhiguogong '+width);
   if(width<=900){await page.click('#profileToggle');assert.ok(await page.locator('#profileForm').isVisible());await noOverflow(page,'profile open '+width);await page.click('#browseMajor');await page.fill('#majorSearch','计算机');await noOverflow(page,'major dialog '+width);await page.click('#majorDialog .close-dialog');await page.click('#applyMobileProfile');}
   await page.screenshot({path:path.join(shots,'zhiguogong-'+width+'.png'),fullPage:false});
   await page.goto(url+'/tools/',{waitUntil:'networkidle'});await noOverflow(page,'tools '+width);
  }
  await page.setViewportSize({width:390,height:844});
  for(const file of ['yantian.html','zhouyi.html','countdown.html']){
   await page.goto(url+'/tools/'+file,{waitUntil:'networkidle'});assert.equal(await page.locator('.cc-tool-return').count(),1);await noOverflow(page,file);
   await page.screenshot({path:path.join(shots,file.replace('.html','')+'-mobile.png'),fullPage:false});
  }
  const offline=await browser.newContext({viewport:{width:390,height:844}});
  await offline.setOffline(true);const p=await offline.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+path.join(root,'tools/downloads/zhiguogong.html'),{waitUntil:'load'});await p.waitForFunction(()=>document.querySelector('#totalCount').textContent==='19,426');
  await p.click('#profileToggle');await p.click('[data-preset="philosophy"]');assert.equal(await p.locator('#matchCount').textContent(),'4');await noOverflow(p,'portable offline');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(shots,'result.json'),JSON.stringify({passed:true,viewports:[320,375,390,430,768,1440],offline:true,errors},null,2));
  console.log('TOOLS BROWSER PASS: source-built pages, 4 tools, cascading provinces/cities, profiles, majors, persistence, mobile layouts, standalone offline.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);console.log('::error title=Tools browser verification::'+String(e.stack||e).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));server.close();process.exit(1);});
