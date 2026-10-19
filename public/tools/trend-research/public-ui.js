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
function show(id){if(!S.details[id])return;selected=id;detail=S.details[id];activeStructure='';activeResearchLine='';$('#symbol').value=id;$('#analysis-content').innerHTML=detailHTML(detail);drawChart();history.replaceState(null,'','#'+id);}
async function init(){S=await(await fetch('snapshot.json')).json();$('#freshness').textContent='完整日线截至 '+S.through+' · 采集与生成 '+S.generated_at+' · 共 '+S.symbols.length+' 个标的';
 const options=rows=>rows.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.id)+' · '+esc(s.state)+'</option>').join('');
 $('#symbol').innerHTML=options(S.symbols);$('#symbol').addEventListener('change',e=>show(e.target.value));
 $('#search').addEventListener('input',e=>{const key=e.target.value.trim().toLowerCase();$('#symbol').innerHTML=options(S.symbols.filter(s=>(s.name+s.id).toLowerCase().includes(key)));});
 $('#markets').innerHTML=S.symbols.filter(s=>s.kind==='index').map(s=>button('<strong>'+esc(s.name)+'</strong><p>'+f(s.close)+' · '+esc(s.date)+'</p><small>'+esc(S.details[s.id].research.regime)+'</small>','symbol',s.id,'market-select')).join('');
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const id=b.dataset.id;switch(b.dataset.action){case'symbol':show(id);break;case'structure-select':selectStructure(id);break;case'research-line':focusResearchLine(id);break;case'research-layer':toggleResearchLayer(id);break;case'range':chartRange=Number(id);$('#analysis-content').innerHTML=detailHTML(detail);drawChart();break;}});
 show(S.details[location.hash.slice(1)]?location.hash.slice(1):selected);
}
