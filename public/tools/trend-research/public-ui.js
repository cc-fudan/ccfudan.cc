'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(v,n=2)=>v==null?'—':Number(v).toLocaleString('zh-CN',{minimumFractionDigits:n,maximumFractionDigits:n});
function pill(s,c=''){return '<span class="pill '+c+'">'+esc(s)+'</span>';}
function button(label,action,id='',cls=''){return '<button class="'+cls+'" data-action="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';}
function empty(title,sub){return '<div class="empty"><strong>'+esc(title)+'</strong>'+esc(sub)+'</div>';}
function score(a){return pill(a.passed+' / '+a.total);}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
let S,detail,selected='hk01810',chartRange=120;
const detailHTML=d=>researchDetailHTML(d),drawChart=()=>drawResearchChart();
const detailCache=new Map();
async function show(id){
 if(!S.details[id])return;selected=id;activeStructure='';activeResearchLine='';$('#symbol').value=id;history.replaceState(null,'','#'+id);
 $('#analysis-content').innerHTML='<div class="loading">正在加载 '+esc(S.details[id].analysis.name)+' 的分析…</div>';
 try{let d=detailCache.get(S.detail_files[id]);if(!d){const r=await fetch(S.detail_files[id]);if(!r.ok)throw Error('报告请求失败');d=await r.json();detailCache.set(S.detail_files[id],d);}
 if(selected!==id||workspacePage!=='analysis')return;detail=d;$('#analysis-content').innerHTML=detailHTML(detail);drawChart();
 }catch(e){if(selected===id)$('#analysis-content').innerHTML=empty('加载失败',e.message+'，请点击刷新数据重试');}
}
async function readCatalog(){const r=await fetch('catalog.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('数据索引请求失败');const next=await r.json();S=next;$('#freshness').textContent='数据截至 '+S.through;}
async function init(){await readCatalog();
 const options=rows=>rows.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.id)+' · '+esc(s.state)+'</option>').join('');
 $('#symbol').innerHTML=options(S.symbols);$('#symbol').addEventListener('change',e=>show(e.target.value));
 $('#search').addEventListener('input',e=>{const key=e.target.value.trim().toLowerCase();$('#symbol').innerHTML=options(S.symbols.filter(s=>(s.name+s.id).toLowerCase().includes(key)));});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=b.dataset.id;switch(b.dataset.action){case'symbol':show(id);break;case'structure-select':selectStructure(id);break;case'research-line':focusResearchLine(id);break;case'research-layer':toggleResearchLayer(id);break;case'range':chartRange=Number(id);$('#analysis-content').innerHTML=detailHTML(detail);drawChart();break;}});
}
