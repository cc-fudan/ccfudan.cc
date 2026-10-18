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
  await page.route('**/major-engine.js',route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("stale unversioned engine was requested")'}));
  await page.goto(url+'/tools/zhiguogong/',{waitUntil:'networkidle'});
  const assetSources=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
  assert.ok(assetSources.length>0&&assetSources.every(src=>/\.[0-9a-f]{12}\.js$/.test(src)));
  assert.ok(await page.evaluate(()=>!!window.WORKBENCH_RULE_VERSION));
  await page.waitForFunction(()=>document.querySelector('#totalCount').textContent==='19,426');
  const majorRegression=await page.evaluate(()=>{
   const j=window.JOB_DATA.jobs.find(x=>x.id==='130121:300110001001');
   const evaluate=p=>window.Screening.evaluate(j,p);
   return {conflict:evaluate({major:'中国哲学',education:'硕士研究生'}).status,unknown:evaluate({major:'未收录的自设专业',education:'硕士研究生'}).status,missing:evaluate({}).status};
  });
  assert.deepEqual(majorRegression,{conflict:'reject',unknown:'review',missing:'review'});
  const financeRegression=await page.evaluate(()=>{
   const j=window.JOB_DATA.jobs.find(x=>x.id==='113123:300110123001');
   const e=window.Screening.evaluate(j,{major:'中国哲学',education:'硕士研究生',degree:'yes',politics:'群众',years:'6',graduate:'social'});
   return {status:e.status,major:e.reasons.find(r=>r.label==='专业').status,extraReview:e.reasons.some(r=>r.label==='备注复核')};
  });
  assert.deepEqual(financeRegression,{status:'reject',major:'reject',extraReview:false});
  const notesRegression=await page.evaluate(()=>{
   const p={age:'31',sex:'男',education:'硕士研究生',degree:'yes',study:'full',major:'中国哲学',bachelorMajor:'哲学',bachelorMajorCode:'010101',politics:'群众',graduate:'social',years:'6',project:'none',certificate:'lawA',cet4:'425',cet6:'425'};
   const get=id=>window.JOB_DATA.jobs.find(j=>j.id===id),E=window.Screening;
   return {guangzhou:E.evaluate(get('133123:300140123001'),p).status,shenzhen:E.evaluate(get('133124:300141825001'),p).status,msa:E.evaluate(get('118308:300110003014'),{...p,education:'本科'}).status};
  });
  assert.deepEqual(notesRegression,{guangzhou:'match',shenzhen:'reject',msa:'reject'});
  const screenshotRegression=await page.evaluate(()=>{
   const p={education:'硕士研究生',degree:'yes',major:'中国哲学',bachelorMajor:'哲学',bachelorMajorCode:'010101',politics:'群众',graduate:'social',years:'6',project:'none',certificate:'lawA',cet4:'425',cet6:'425'};
   return ['133124:300141825002','133138:300141138001','137119:400110119001','130124:300129005001','130124:300129005002'].map(id=>{
    const e=window.Screening.evaluate(window.JOB_DATA.jobs.find(j=>j.id===id),p);
    return {id,status:e.status,major:e.reasons.find(r=>r.label==='专业').status};
   });
  });
  assert.ok(screenshotRegression.every(e=>e.status==='reject'&&e.major==='reject'),JSON.stringify(screenshotRegression));
  await page.selectOption('#province','湖北省');
  let city=await page.locator('#citySelect option').allTextContents();assert.ok(city.includes('武汉市'));assert.ok(!city.includes('长沙市'));
  await page.selectOption('#citySelect','武汉市');
  await page.selectOption('#province','湖南省');assert.equal(await page.locator('.province-chip').count(),2);city=await page.locator('#citySelect option').allTextContents();assert.ok(city.includes('长沙市'));assert.ok(city.includes('武汉市'));
  await page.selectOption('#citySelect','长沙市');assert.equal(await page.locator('#cityChips .city-chip').count(),2);
  await page.locator('[data-province-remove="0"]').click();city=await page.locator('#citySelect option').allTextContents();assert.ok(!city.includes('武汉市'));assert.equal(await page.locator('#cityChips .city-chip').count(),1);
  await page.click('[data-preset="philosophy"]');assert.equal(await page.locator('#matchCount').textContent(),'5');
  assert.ok(await page.locator('#bachelorEducation').isVisible());
  assert.equal(await page.locator('[name="bachelorMajor"]').evaluate(e=>e.closest('details')),null);
  await page.click('[data-status="match"]');assert.equal(await page.locator('.job-card').count(),5);
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
  await p.click('#profileToggle');await p.click('[data-preset="philosophy"]');assert.equal(await p.locator('#matchCount').textContent(),'5');await noOverflow(p,'portable offline');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(shots,'result.json'),JSON.stringify({passed:true,viewports:[320,375,390,430,768,1440],offline:true,errors},null,2));
  console.log('TOOLS BROWSER PASS: source-built pages, 4 tools, cascading provinces/cities, profiles, majors, persistence, mobile layouts, standalone offline.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);console.log('::error title=Tools browser verification::'+String(e.stack||e).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));server.close();process.exit(1);});
