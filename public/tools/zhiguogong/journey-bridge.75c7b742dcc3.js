(function(){
  'use strict';
  const view=document.createElement('section');view.id='journeyView';view.hidden=true;document.querySelector('#main').append(view);
  const nav=document.createElement('button');nav.className='nav';nav.dataset.tab='journey';nav.textContent='我的考程';document.querySelector('.topbar nav').prepend(nav);
  const app=window.JourneyUI.mount(view,{show:()=>setTab('journey'),download:location.protocol==='http:'||location.protocol==='https:'?'/tools/downloads/zhiguogong-journey.html':''});window.JourneyApp=app;
  const previous=setTab;
  setTab=function(value){previous(value==='journey'?'discover':value);view.hidden=value!=='journey';document.body.classList.toggle('journey-open',value==='journey');if(value==='journey'){
    tab=value;for(const id of ['discoveryView','dataView','assistantView','monitorView','policyView']){const el=document.getElementById(id);if(el)el.hidden=true;}
    document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===value));app.render();
  }};
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  const oldDetail=showDetail;
  showDetail=function(id){oldDetail(id);const row=document.querySelector('#detailBody .data-actions'),j=byId.get(id);if(!row||!j)return;const b=document.createElement('button');b.className='button primary';b.id='addJourney';b.textContent='加入我的考程 →';b.onclick=()=>{if(app.addJob(j))document.querySelector('#detailDialog').close();};row.append(b);};
  if(location.hash!=='#discover')setTab('journey');
})();
