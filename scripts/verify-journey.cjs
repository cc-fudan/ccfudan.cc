const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function verifyJourney(page,base,shots){
 await page.goto(base+'/tools/zhiguogong/',{waitUntil:'networkidle'});
 await page.evaluate(()=>localStorage.removeItem(JourneyCore.KEY));await page.reload({waitUntil:'networkidle'});
 await page.waitForSelector('#journeyView:not([hidden])');
 assert.equal(await page.evaluate(()=>JourneyApp.snapshot().exams.length),0);
 await page.locator('#journeyView [data-j-action="create"]').first().click();
 await page.locator('#journeyExamForm [name="title"]').fill('湖北省考 · 功能验证');
 await page.locator('#journeyExamForm [name="year"]').fill('2027');
 await page.locator('#journeyExamForm [name="region"]').fill('湖北');
 await page.locator('#journeyExamForm button[type="submit"]').click();
 assert.equal(await page.locator('#journeyDialog').isVisible(),false);
 await page.locator('#journeyView [data-j-action="edit-task"][data-task="pay"]').click();
 await page.locator('#journeyTaskForm [name="status"]').selectOption('doing');
 await page.locator('#journeyTaskForm [name="start"]').fill('2026-11-01T08:00');
 await page.locator('#journeyTaskForm [name="end"]').fill('2026-11-07T00:00');
 await page.locator('#journeyTaskForm [name="source"]').fill('https://www.hbsrsksy.cn/');
 await page.locator('#journeyTaskForm [name="proof"]').selectOption('confirmed');
 await page.locator('#journeyTaskForm button[type="submit"]').click();
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.evaluate(()=>JourneyApp.snapshot().exams[0].tasks.find(t=>t.id==='pay').status),'doing');
 assert.ok(await page.evaluate(()=>JourneyCore.ics(JourneyApp.snapshot()).content.includes('20261106T160000Z')));
 await page.screenshot({path:path.join(shots,'journey-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'journey mobile overflow');
 await page.screenshot({path:path.join(shots,'journey-mobile.png'),fullPage:true});
 await page.locator('#journeyView [data-j-action="open-exam"]').first().click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'journey detail mobile overflow');
 await page.locator('#journeyView [data-j-action="pane"][data-value="study"]').click();
 await page.locator('#journeyView [data-j-action="log-new"]').click();
 await page.locator('#journeyDialog [name="count"]').fill('10');
 await page.locator('#journeyDialog [name="correct"]').fill('7');
 await page.locator('#journeyDialog button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>JourneyApp.snapshot().logs.length),1);
 await page.locator('#journeyView [data-j-action="pane"][data-value="materials"]').click();
 await page.screenshot({path:path.join(shots,'journey-materials-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.nav[data-tab="discover"]').click();
 await page.locator('#locateDepartment').fill('133123');await page.locator('#locatePosition').fill('300140123001');await page.locator('#jobLocatorForm button').click();
 await page.locator('#addJourney').click();
 assert.equal(await page.evaluate(()=>JourneyApp.snapshot().exams.length),2);
 const national=await page.evaluate(()=>JourneyApp.snapshot().exams.find(e=>e.type==='国考'));
 assert.equal(national.departmentCode,'133123');assert.equal(national.tasks.find(t=>t.id==='apply').status,'todo');
 await page.locator('#journeyView [data-j-action="page"][data-value="settings"]').click();
 const before=await page.evaluate(()=>JourneyApp.snapshot());
 await page.locator('#journeyImportFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(before))});
 await page.locator('#journeyDialog [data-j-action="import-merge"]').click();
 assert.ok((await page.locator('#journeyFormError').textContent()).includes('重复'));
 await page.locator('#journeyDialog [data-j-action="close"]').click();
 // Portable file must work with network completely unavailable.
 await page.goto(base+'/tools/downloads/zhiguogong-journey.html',{waitUntil:'networkidle'});
 await page.context().setOffline(true);
 await page.locator('[data-j-action="create"]').first().click();
 await page.locator('#journeyExamForm [name="title"]').fill('离线验证');
 await page.locator('#journeyExamForm button[type="submit"]').click();
 assert.ok(await page.evaluate(()=>JourneyApp.snapshot().exams.some(e=>e.title==='离线验证')));
 await page.context().setOffline(false);
 await page.evaluate(()=>localStorage.removeItem(JourneyCore.KEY));
 return {desktop:true,mobile390:true,jobBridge:true,storage:true,backupDuplicateGuard:true,offlineInteraction:true};
}
module.exports={verifyJourney};
if(require.main===module){(async()=>{
 const shots=path.resolve('work/journey-browser-evidence');fs.mkdirSync(shots,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('file:///'+path.resolve('outputs/知国公-招录全流程工作台.html').replaceAll('\\','/'));await page.screenshot({path:path.join(shots,'standalone.png'),fullPage:true});console.log('Local Chromium screenshot verified');}finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exit(1);});}
