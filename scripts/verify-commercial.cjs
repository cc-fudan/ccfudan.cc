const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=path.resolve('dist'),out=path.resolve('commercial-verification');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({headless:true});const base='http://127.0.0.1:'+server.address().port;
 const routes=['/','/services/','/credentials/','/about/','/contact/','/writing/','/works/'];
 const errors=[],page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  for(const route of routes){
   const response=await page.goto(base+route,{waitUntil:'networkidle'});assert(response.ok(),route);
   assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(247, 248, 242)',route);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+route+' '+width);
   assert.equal(await page.locator('h1').count(),1,route);
   assert.equal(await page.locator('meta[name="robots"][content*="noindex"]').count(),0,route);
   assert(!/KaiTi|Kaiti|楷体/.test(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)),route);
   assert(await page.evaluate(()=>[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0)),'Broken visible image '+route);
   const links=await page.locator('a[href]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));
   assert(links.every(x=>!/^\/(family|tools|notes|library|universe)(\/|$)/.test(x)),'Private link '+route);
   if(width===390||width===1440)await page.screenshot({path:path.join(out,route==='/'?'home-'+width+'.png':route.split('/')[1]+'-'+width+'.png'),fullPage:true});
  }
 }
 await page.goto(base+'/');assert((await page.locator('h1').textContent()).includes('把复杂的问题拆清楚'));
 assert(!/保险/.test(await page.locator('.advisory-hero').textContent()));
 await page.goto(base+'/writing/');assert.equal(await page.locator('.article-archive .post').count(),18);
 const links=await page.locator('.article-archive .post').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));
 const damaged=JSON.parse(fs.readFileSync('src/data/damagedArticleImages.json','utf8'));
 for(const href of links.filter(x=>x.startsWith('/writing/'))){await page.goto(base+href);const sources=await page.locator('.wx-article img').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')));assert(sources.every(x=>!damaged.includes(x)),'Corrupt article image '+href);assert.equal(await page.locator('.advisory-archive-note').count(),1);}
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/contact/#wechat');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied=t}}}));
 await page.locator('[data-copy-wechat]').click();assert.equal(await page.evaluate(()=>window.__copied),'cc_fudan');assert((await page.locator('[data-copy-status]').textContent()).includes('已复制'));
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}}));
 await page.locator('[data-copy-wechat]').click();assert((await page.locator('[data-copy-status]').textContent()).includes('未能自动复制'));assert.equal(await page.locator('.wechat-id').inputValue(),'cc_fudan');
 await page.screenshot({path:path.join(out,'contact-fallback-390.png'),fullPage:true});
 for(const name of ['family','tools','notes','library','universe','images/family'])assert(!fs.existsSync(path.join(root,name)),name+' leaked');
 assert.equal(errors.length,0,errors.join(';'));fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,routes,viewports:[320,390,768,1440],articles:18,wechatCopy:true,wechatFallback:true,errors},null,2));
 console.log('PASS commercial white jade pages: 7 routes, 4 viewports, 18 articles, WeChat copy/fallback and privacy scope');
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();console.log('::error title=Commercial browser verification::'+String(e.stack||e).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
