document.body.classList.add('edition-enhanced');
document.title='知国公 · 增强版';
document.querySelector('#editionTitle').textContent='增强版';
document.querySelector('#editionDescription').textContent='从个人条件到人数变化，所有依据放在一起。';
document.querySelector('.offline').innerHTML='<i></i> 本地运行 · 联网功能按需开启';
const editionPill=document.createElement('span');editionPill.className='edition-pill';editionPill.textContent='增强版';document.querySelector('.brand').append(editionPill);
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DB=window.JOB_DATA, E=window.Screening, KEY='zhigang-workbench-v2-'+window.WORKBENCH_EDITION;
if(!DB||!E)throw Error('职位数据或筛选引擎未加载，请保持文件夹完整');
const jobs=DB.jobs, byId=new Map(jobs.map(j=>[j.id,j])), ids=new Set(byId.keys());
const allowedProfile=[...$('#profileForm').elements].filter(x=>x.name).map(x=>x.name);
const blank=()=>({profile:{},favorites:[],snapshots:[],province:'',cities:'',metric:'approved',feedUrl:'',agePolicy:{}});
function cleanState(raw){
  const s=blank();
  if(!raw||typeof raw!=='object')return s;
  for(const k of allowedProfile)if(['string','number'].includes(typeof raw.profile?.[k]))s.profile[k]=String(raw.profile[k]).slice(0,300);
  s.favorites=Array.isArray(raw.favorites)?[...new Set(raw.favorites.filter(id=>ids.has(id)))]:[];
  if(Array.isArray(raw.snapshots))s.snapshots=E.validateSnapshots(raw.snapshots,ids);
  for(const k of ['province','cities','feedUrl'])if(typeof raw[k]==='string')s[k]=raw[k].slice(0,1000);
  if(['approved','registered','paid'].includes(raw.metric))s.metric=raw.metric;
  const a=raw.agePolicy;
  if(a&&Number.isFinite(a.min)&&Number.isFinite(a.max)&&a.min>=0&&a.max<=70&&a.max>=a.min&&typeof a.source==='string')s.agePolicy={min:a.min,max:a.max,source:a.source.slice(0,500)};
  return s;
}
let state=blank(),storageAvailable=true;
try{const raw=localStorage.getItem(KEY);if(raw)state=cleanState(JSON.parse(raw));}catch(e){storageAvailable=false;}
let tab='discover',statusFilter='eligible',page=1,comparison=[],evaluations=new Map(),filtered=[],currentJob=null,snapshotIndex=new Map();
const PAGE_SIZE=12, metricNames={approved:'审核通过',registered:'提交报名',paid:'已缴费',pending:'待审查'};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;$('#saveState').textContent='条件自动保存在本机';}catch(e){storageAvailable=false;$('#saveState').textContent='浏览器存储不可用，请导出备份';toast('本机保存失败。当前操作仍可使用，请导出备份。');}}
function download(name,content,type='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function csvCell(v){let t=String(v??'');if(/^[=+@\-\t\r]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"';}
function csv(rows){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
function stamp(iso){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso));}
function stale(s){return s&&Date.now()-Date.parse(s.asOf)>24*3600*1000;}
function latestFor(j){return snapshotIndex.get(j.id)||null;}
function statusLabel(s){return {match:'基础匹配',review:'待核对',reject:'不符合'}[s];}
function province(location){const m=location.match(/^(.+?(?:省|自治区|特别行政区))/);if(m)return m[1];return location.match(/^(北京市|上海市|天津市|重庆市)/)?.[1]||'其他地区';}
function loadForm(){
  for(const k of allowedProfile)$('#profileForm').elements.namedItem(k).value=state.profile[k]??'';
  $('#province').value=state.province;$('#cities').value=state.cities;$('#metric').value=state.metric;$('#feedUrl').value=state.feedUrl;
  $('#ageMin').value=state.agePolicy.min??'';$('#ageMax').value=state.agePolicy.max??'';$('#ageSource').value=state.agePolicy.source??'';
}
function evalAll(){evaluations=new Map(jobs.map(j=>[j.id,E.evaluate(j,state.profile,state.agePolicy)]));}
function getBase(){
  const q=$('#search').value.trim().toLowerCase(),terms=state.cities.split(/[、，,;；\s]+/).filter(Boolean);
  return jobs.filter(j=>(tab!=='saved'||state.favorites.includes(j.id))&&(!state.province||province(j['工作地点'])===state.province)&&(!terms.length||terms.some(t=>j['工作地点'].includes(t)))&&(!q||[j['部门名称'],j['用人司局'],j['招考职位'],j['职位代码'],j['部门代码']].join(' ').toLowerCase().includes(q)));
}
function render(){
  snapshotIndex=new Map();
  for(const s of state.snapshots){if(s.metric!==state.metric)continue;const key=s.departmentCode+':'+s.jobCode,old=snapshotIndex.get(key);if(!old||Date.parse(s.asOf)>Date.parse(old.asOf))snapshotIndex.set(key,s);}
  const base=getBase(),match=base.filter(j=>evaluations.get(j.id).status==='match').length,review=base.filter(j=>evaluations.get(j.id).status==='review').length;
  $('#matchCount').textContent=match.toLocaleString();$('#reviewCount').textContent=review.toLocaleString();
  $('#snapshotCount').textContent=base.filter(j=>evaluations.get(j.id).status!=='reject'&&latestFor(j)).length;
  $('#savedCount').textContent=state.favorites.length;
  filtered=base.filter(j=>statusFilter==='all'||(statusFilter==='eligible'?evaluations.get(j.id).status!=='reject':evaluations.get(j.id).status===statusFilter));
  const sort=$('#sort').value;
  const cmp=(a,b)=>({match:0,review:1,reject:2}[evaluations.get(a.id).status]-{match:0,review:1,reject:2}[evaluations.get(b.id).status]);
  filtered.sort((a,b)=>{
    if(sort==='seats')return Number(b['招考人数'])-Number(a['招考人数'])||cmp(a,b);
    if(sort==='ratio'){
      const sa=latestFor(a),sb=latestFor(b),ra=sa&&!stale(sa)?E.ratio(sa,Number(a['招考人数'])):null,rb=sb&&!stale(sb)?E.ratio(sb,Number(b['招考人数'])):null;
      return (ra??Infinity)-(rb??Infinity)||cmp(a,b)||a.id.localeCompare(b.id);
    }
    return cmp(a,b)||evaluations.get(a.id).reasons.filter(r=>r.status==='review').length-evaluations.get(b.id).reasons.filter(r=>r.status==='review').length||a.id.localeCompare(b.id);
  });
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));page=Math.min(page,pages);
  $('#resultCount').textContent=`${filtered.length.toLocaleString()} 个职位 · 当前地区与条件`;
  $('#pageInfo').textContent=`第 ${page} / ${pages} 页`;$('#prev').disabled=page===1;$('#next').disabled=page===pages;
  $('#results').innerHTML=filtered.length?filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(jobCard).join(''):`<div class="empty"><h3>${tab==='saved'?'这里还没有符合当前筛选的收藏':'当前条件下，没有找到职位'}</h3><p>试着清除城市限制、查看“待核对”或“全部”，了解被排除的原因。</p><button class="button subtle" data-action="relax">清除地区与搜索限制</button></div>`;
  $('#compareDock').hidden=!comparison.length;$('#compareText').textContent=`已选 ${comparison.length} / 3 个职位`;
}
function jobCard(j){
  const e=evaluations.get(j.id),s=latestFor(j),r=E.ratio(s,Number(j['招考人数'])),issues=e.reasons.filter(x=>x.status!=='pass');
  let countHTML='<strong>'+esc(j['招考人数'])+' <span class="small">人</span></strong><small>计划招录</small>';
  if(s)countHTML=`<strong>${r===null?'—':r.toFixed(1)+':1'}</strong><small>${metricNames[s.metric]} ${s.count} 人 / 招 ${j['招考人数']} 人</small><small>${stamp(s.asOf)}${stale(s)?' · 旧数据':''}</small>${s.count===0?'<span class="ratio-hint">零值不作为低竞争依据</span>':''}`;
  return `<article class="job-card" data-id="${esc(j.id)}"><div><div class="job-tags"><span class="badge ${e.status}">${statusLabel(e.status)}</span><span class="small muted">${esc(j['工作地点'])}</span></div><button class="job-title" data-action="detail">${esc(j['用人司局'])}</button><p class="job-dept">${esc(j['招考职位'])}</p><div class="job-tags"><span class="chip">${esc(j['学历'])}</span><span class="chip">${j['政治面貌']==='不限'?'政治面貌不限':esc(j['政治面貌'])}</span><span class="chip">基层年限：${esc(j['基层工作最低年限'])}</span>${j['服务基层项目工作经历']!=='无限制'?'<span class="chip">专项身份限制</span>':''}</div><div class="job-meta">${esc(j['部门代码'])} · ${esc(j['职位代码'])}　招 ${esc(j['招考人数'])} 人</div><div class="job-reason">${issues.length?esc(issues.slice(0,2).map(x=>x.label+'：'+x.text).join('；')):'已填核心条件通过初筛 · 查看原文与年度资格要求'}</div></div><div class="job-right"><div>${countHTML}</div><div class="job-actions"><button data-action="favorite" class="icon-button ${state.favorites.includes(j.id)?'on':''}" aria-label="${state.favorites.includes(j.id)?'取消收藏':'收藏职位'}">${state.favorites.includes(j.id)?'★ 已收藏':'☆ 收藏'}</button><button data-action="compare" class="icon-button ${comparison.includes(j.id)?'on':''}">${comparison.includes(j.id)?'✓ 对比':'＋ 对比'}</button></div></div></article>`;
}
function showDetail(id){
  const j=byId.get(id);if(!j)return;currentJob=id;const e=evaluations.get(id),s=latestFor(j);
  const history=state.snapshots.filter(s=>s.departmentCode+':'+s.jobCode===id).sort((a,b)=>Date.parse(b.asOf)-Date.parse(a.asOf));
  const fields=['部门名称','工作地点','学历','学位','政治面貌','基层工作最低年限','考试类别','面试人员比例'];
  const localNow=new Date(Date.now()+8*3600000).toISOString().slice(0,16);
  $('#detailBody').innerHTML=`<span class="badge ${e.status}">${statusLabel(e.status)}</span><h2 style="margin-top:12px">${esc(j['用人司局'])}</h2><p>${esc(j['招考职位'])}</p><p class="detail-sub">部门代码 ${esc(j['部门代码'])} · 职位代码 ${esc(j['职位代码'])} · 招 ${esc(j['招考人数'])} 人</p><div class="data-actions"><button id="detailFavorite" class="button subtle">${state.favorites.includes(id)?'★ 取消收藏':'☆ 收藏职位'}</button><button id="detailCompare" class="button subtle">加入对比</button></div><dl class="detail-grid">${fields.map(k=>`<div><dt>${k}</dt><dd>${esc(j[k])}</dd></div>`).join('')}</dl><div class="detail-section"><h3>条件逐项核对</h3><ul class="reason-list">${e.reasons.map(r=>`<li><span class="badge ${r.status==='pass'?'match':r.status}">${r.status==='pass'?'通过':r.status==='reject'?'不符':'待核'}</span><b>${esc(r.label)}</b>　${esc(r.text)}</li>`).join('')}</ul><div class="policy-warning">${state.agePolicy.source?'年龄按自设规则初筛，仍需核实出生日期及放宽条件。':'年度年龄规则尚未核验，当前未据年龄排除职位。'} 非全日制认可、完整报考资格及招录机关补充公告需另行确认。</div></div><div class="detail-section"><h3>专业要求 · 原文</h3><div class="raw">${esc(j['专业'])}</div></div><div class="detail-section"><h3>服务基层项目经历 · 原文</h3><div class="raw">${esc(j['服务基层项目工作经历'])}</div></div><div class="detail-section"><h3>职位简介</h3><div class="raw">${esc(j['职位简介'])}</div></div><div class="detail-section"><h3>备注 · 原文</h3><div class="raw">${esc(j['备注']||'原表备注为空；仍需查阅年度公告和机关补充说明。')}</div></div><div class="detail-section"><h3>咨询与来源</h3><p class="small">${esc([j['咨询电话1'],j['咨询电话2'],j['咨询电话3']].filter(Boolean).join(' / '))}</p><p class="small muted">来源工作表：${esc(j.sheet)} · 第 ${j.excel_row} 行<br>本地导入：${DB.meta.importedAt} · 年度 ${DB.meta.year}（未与官网核对）</p></div><div class="detail-section"><h3>录入报名快照</h3><p class="small muted">仅保存你有来源的数据。时间按北京时间填写，旧快照不会覆盖新快照。</p><form id="snapshotForm" class="count-form"><label>统计口径<select name="metric"><option value="approved">审核通过人数</option><option value="registered">提交报名人数</option><option value="paid">缴费人数</option><option value="pending">待审查人数（不计算竞争比）</option></select></label><label>人数<input name="count" type="number" min="0" step="1" required></label><label>统计时间（北京时间）<input name="asOf" type="datetime-local" value="${localNow}" required></label><label>来源<input name="source" placeholder="如本人报名系统截图 / 官方页面链接" required maxlength="500"></label><button class="button primary full" type="submit">保存此岗位快照</button></form><div class="history-list">${history.length?history.map(s=>`<p>${esc(stamp(s.asOf))} · ${metricNames[s.metric]} ${s.count} 人 · ${esc(s.source)}</p>`).join(''):'尚未录入报名快照'}</div></div>`;
  $('#detailFavorite').onclick=()=>{toggleFavorite(id);showDetail(id);};$('#detailCompare').onclick=()=>toggleCompare(id);
  $('#snapshotForm').onsubmit=ev=>{
    ev.preventDefault();const f=new FormData(ev.target);
    try{addSnapshots([{departmentCode:j['部门代码'],jobCode:j['职位代码'],metric:f.get('metric'),count:f.get('count'),asOf:f.get('asOf')+':00+08:00',source:f.get('source')}]);showDetail(id);}catch(err){toast(err.message);}
  };
  if(!$('#detailDialog').open)$('#detailDialog').showModal();
}
function toggleFavorite(id){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();render();}
function toggleCompare(id){if(comparison.includes(id))comparison=comparison.filter(x=>x!==id);else if(comparison.length<3)comparison.push(id);else{toast('一次最多对比3个职位，请先移除一个。');return;}render();}
function showCompare(){
  const cols=comparison.map(id=>byId.get(id));
  const rows=[['状态',j=>statusLabel(evaluations.get(j.id).status)],['职位',j=>j['招考职位']],['职位代码',j=>j['部门代码']+' / '+j['职位代码']],['地点',j=>j['工作地点']],['招录人数',j=>j['招考人数']],['学历 / 学位',j=>j['学历']+' / '+j['学位']],['专业',j=>j['专业']],['基层 / 专项',j=>j['基层工作最低年限']+' / '+j['服务基层项目工作经历']],['报名快照',j=>{const s=latestFor(j);return s?metricNames[s.metric]+' '+s.count+' 人；'+stamp(s.asOf)+'；'+s.source:'暂无数据';}],['备注原文',j=>j['备注']||'原表未填写'],['需处理的问题',j=>evaluations.get(j.id).reasons.filter(r=>r.status!=='pass').map(r=>r.label+'：'+r.text).join('；')||'仍需核验年度资格与专业目录']];
  $('#compareBody').innerHTML=`<table><thead><tr><th>比较项目</th>${cols.map(j=>`<th>${esc(j['用人司局'])}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${cols.map(j=>`<td>${esc(fn(j))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('#compareDialog').showModal();
}
function addSnapshots(input){
  const valid=E.validateSnapshots(input,ids);
  const existing=new Map(state.snapshots.map(s=>[[s.departmentCode,s.jobCode,s.metric,s.asOf].join('|'),s]));
  for(const s of valid){const key=[s.departmentCode,s.jobCode,s.metric,s.asOf].join('|'),old=existing.get(key);if(old&&old.count!==s.count)throw Error('同一岗位、口径和时间已有不同人数，请核对观察时间，原记录已保留');existing.set(key,s);}
  const seen=new Set(state.snapshots.map(s=>JSON.stringify(s)));let n=0;
  for(const s of valid){const key=JSON.stringify(s);if(!seen.has(key)){state.snapshots.push(s);seen.add(key);n++;}}
  save();render();renderData();toast(`导入完成：新增 ${n} 条快照，重复 ${valid.length-n} 条。`);
}
function renderData(){
  $('#dbDescription').textContent=`${jobs.length.toLocaleString()} 个职位 · ${DB.meta.seats.toLocaleString()} 个招录名额 · ${DB.meta.importedAt} 导入`;
  const groups={};for(const s of state.snapshots)groups[s.metric]=(groups[s.metric]||0)+1;
  $('#countSummary').innerHTML=state.snapshots.length?`<table><thead><tr><th>口径</th><th>历史快照数</th><th>用途</th></tr></thead><tbody>${Object.entries(groups).map(([k,n])=>`<tr><td>${metricNames[k]}</td><td>${n}</td><td>${k==='pending'?'仅查看，不参与排序':'各岗位取最新记录；超过24小时不作为低竞争推荐'}</td></tr>`).join('')}</tbody></table>`:'<p class="muted small">尚无人数数据。职位表不包含实时报名人数。</p>';
}
function setTab(value){tab=value;page=1;$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('#dataView').hidden=tab!=='data';$('#discoveryView').hidden=tab==='data';$('#pageTitle').innerHTML=tab==='saved'?'把值得考虑的，留在这里<span>。</span>':'知国考，选好下一站<span>。</span>';$('#pageSubtitle').textContent=tab==='saved'?'收藏保留在本机；当前地区与个人条件仍会参与筛选。':'把复杂的报考条件，变成一份清晰的职位清单。';if(tab==='data')renderData();else render();}
let profileTimer,cityTimer,searchTimer;
$('#profileForm').addEventListener('input',()=>{clearTimeout(profileTimer);profileTimer=setTimeout(()=>{state.profile=Object.fromEntries(new FormData($('#profileForm')));page=1;save();evalAll();render();},180);});
$('#profileForm').addEventListener('submit',e=>e.preventDefault());
$$('[data-preset]').forEach(b=>b.onclick=()=>{
  // Fictional demos, never the user's private profile.
  state.profile=b.dataset.preset==='law'?{age:'29',sex:'女',education:'本科',degree:'',study:'part',major:'法学',politics:'群众',graduate:'social',years:'6',project:'none',certificate:'none'}:{age:'31',sex:'男',education:'硕士研究生',degree:'yes',study:'full',major:'中国哲学',bachelorMajor:'哲学',politics:'群众',graduate:'social',years:'6',project:'none',certificate:'lawA',cet4:'425',cet6:'425'};
  state.province=b.dataset.preset==='law'?'湖北省':'广东省';state.cities=b.dataset.preset==='law'?'':'广州、深圳';statusFilter='eligible';$$('[data-status]').forEach(x=>x.classList.toggle('selected',x.dataset.status===statusFilter));page=1;save();loadForm();evalAll();render();toast('已载入示例条件，请修改为你自己的实际情况。');
});
$('#resetProfile').onclick=()=>{state.profile={};page=1;loadForm();save();evalAll();render();};
$$('.nav').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$$('[data-status]').forEach(b=>b.onclick=()=>{statusFilter=b.dataset.status;page=1;$$('[data-status]').forEach(x=>x.classList.toggle('selected',x===b));render();});
$('#province').onchange=()=>{state.province=$('#province').value;page=1;save();render();};
$('#cities').oninput=()=>{clearTimeout(cityTimer);cityTimer=setTimeout(()=>{state.cities=$('#cities').value;page=1;save();render();},180);};
$('#search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;render();},180);};
$('#sort').onchange=()=>{page=1;render();if($('#sort').value==='ratio')toast('仅排序同一口径、24小时内且人数大于0的快照；其他职位放在其后。');};
$('#results').onclick=ev=>{const b=ev.target.closest('[data-action]');if(!b)return;const id=b.closest('[data-id]')?.dataset.id;if(b.dataset.action==='detail')showDetail(id);if(b.dataset.action==='favorite')toggleFavorite(id);if(b.dataset.action==='compare')toggleCompare(id);if(b.dataset.action==='relax'){state.province='';state.cities='';$('#search').value='';loadForm();save();render();}};
$('#prev').onclick=()=>{page--;render();$('.results-panel').scrollIntoView({block:'start'});};$('#next').onclick=()=>{page++;render();$('.results-panel').scrollIntoView({block:'start'});};
$('#compareOpen').onclick=showCompare;$('#compareClear').onclick=()=>{comparison=[];render();};
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#showPolicy').onclick=()=>$('#policyDialog').showModal();
$('#exportResults').onclick=()=>{
  const head=['部门代码','职位代码','部门名称','用人司局','招考职位','招考人数','工作地点','专业','学历','学位','政治面貌','基层工作最低年限','服务基层项目工作经历','备注'];
  const rows=[['初筛状态','需核对事项',...head,'统计口径','人数','统计时间','数据来源']];
  for(const j of filtered){const e=evaluations.get(j.id),s=latestFor(j);rows.push([statusLabel(e.status),e.reasons.filter(r=>r.status!=='pass').map(r=>r.label+':'+r.text).join('；'),...head.map(k=>j[k]),s?metricNames[s.metric]:'',s?.count??'',s?.asOf??'',s?.source??'']);}
  download('选岗结果.csv',csv(rows),'text/csv;charset=utf-8');toast(`已导出 ${filtered.length} 个职位，含原始限制和快照来源。`);
};
$('#downloadDatabase').onclick=()=>download('国考职位库.json',JSON.stringify(DB),'application/json');
$('#downloadBackup').onclick=()=>download('知国公个人备份.json',JSON.stringify(state,null,2),'application/json');
$('#restoreBackup').onclick=()=>$('#backupFile').click();
$('#backupFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>30*1024*1024)throw Error('备份文件超过30MB');const next=cleanState(JSON.parse(await f.text()));if(!confirm('恢复将替换本机的条件、收藏和报名快照。继续？'))return;state=next;save();loadForm();evalAll();render();renderData();toast('已恢复个人数据。');}catch(err){toast('恢复失败：'+err.message);}finally{e.target.value='';}};
$('#downloadTemplate').onclick=()=>download('报名快照模板.csv',csv([['departmentCode','jobCode','metric','count','asOf','source']]),'text/csv;charset=utf-8');
$('#exportCounts').onclick=()=>download('报名快照.json',JSON.stringify(state.snapshots,null,2),'application/json');
$('#importCounts').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>30*1024*1024)throw Error('文件超过30MB');const text=await f.text();addSnapshots(f.name.toLowerCase().endsWith('.csv')?E.parseCSV(text):JSON.parse(text));}catch(err){toast('导入失败，未保存：'+err.message);}finally{e.target.value='';}};
$('#metric').onchange=()=>{state.metric=$('#metric').value;save();render();};
$('#saveAge').onclick=()=>{
  const min=$('#ageMin').value,max=$('#ageMax').value,source=$('#ageSource').value.trim();
  if(min===''&&max===''&&!source){state.agePolicy={};save();evalAll();render();toast('已关闭年龄筛选。');return;}
  if(min===''||max===''||!source||Number(min)>Number(max)||Number(min)<0||Number(max)>70){toast('请填写有效的上下限及规则来源。');return;}
  state.agePolicy={min:Number(min),max:Number(max),source};save();evalAll();render();toast('已启用自设年龄范围；特殊放宽仍需单独核对。');
};
$('#clearLocal').onclick=()=>{if(!confirm('清除条件、收藏和所有报名快照？请先导出备份。'))return;state=blank();comparison=[];save();loadForm();evalAll();render();renderData();toast('已清除本机个人数据，职位数据库仍可使用。');};
const provinces=[...new Set(jobs.map(j=>province(j['工作地点'])))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
$('#province').innerHTML='<option value="">全国</option>'+provinces.map(p=>`<option>${esc(p)}</option>`).join('');
const cities=[...new Set(jobs.map(j=>j['工作地点'].match(/(?:省|自治区)(.+?市)/)?.[1]||j['工作地点'].match(/^(北京|上海|天津|重庆)市/)?.[0]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
$('#cityList').innerHTML=cities.map(c=>`<option>${esc(c)}</option>`).join('');
$('#totalCount').textContent=jobs.length.toLocaleString();$('#seatCount').textContent=`${DB.meta.seats.toLocaleString()} 个计划招录名额`;$('#importDate').textContent=DB.meta.importedAt;
loadForm();evalAll();render();renderData();
if(!storageAvailable)$('#saveState').textContent='浏览器存储不可用，请导出备份';

/* Product extensions share the same local state and screening engine. */
const T=window.WorkbenchTools, enhanced=window.WORKBENCH_EDITION==='enhanced';
const nowLocal=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,16);
const observationTime=value=>{if(!value)throw Error('请填写观察时间');return value+':00+08:00';};
const oldSetTab=setTab;
setTab=function(value){
  const extra=['assistant','monitor'].includes(value);
  if(value==='monitor'&&!enhanced)return;
  oldSetTab(extra?'discover':value);tab=value;
  $('#assistantView').hidden=value!=='assistant';$('#monitorView').hidden=value!=='monitor';
  if(extra){$('#discoveryView').hidden=true;$('#dataView').hidden=true;}
  $$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===value));
  if(value==='monitor')renderWatch();
};
$$('.nav').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#backDiscover').onclick=()=>setTab('discover');

function contextJobs(){
  const scope=$('#helpScope').value;
  let chosen=scope==='saved'?state.favorites:scope==='results'?filtered.slice(0,5).map(j=>j.id):($('#compareDialog').open&&comparison.length?comparison:$('#detailDialog').open&&currentJob?[currentJob]:comparison.length?comparison:state.favorites.length?state.favorites:filtered.slice(0,5).map(j=>j.id));
  return chosen.slice(0,10).map(id=>byId.get(id)).filter(Boolean);
}
function generateHelp(){
  const chosen=contextJobs();
  if(!chosen.length){$('#helpOutput').value='';$('#helpSummary').textContent='当前范围没有岗位。请先收藏职位，或选择“当前筛选前5个”。';return;}
  const profile={};
  for(const k of allowedProfile){const el=$('#profileForm').elements.namedItem(k);if(!state.profile[k])continue;const label=el.closest('label')?.childNodes[0]?.textContent.trim()||k;profile[label]=el.tagName==='SELECT'?el.selectedOptions[0]?.textContent:state.profile[k];}
  $('#helpOutput').value=T.prompt({profile,jobs:chosen,evaluations,question:$('#helpQuestion').value,includeProfile:$('#helpPrivacy').value==='yes',meta:DB.meta});
  $('#helpSummary').textContent=`已整理 ${chosen.length} 个岗位 · ${$('#helpPrivacy').value==='yes'?'含你填写的个人条件，请预览后再分享':'未附个人条件'} · 材料尚未发送`;
}
function openHelp(scope='context'){$('#helpScope').value=scope;generateHelp();if(!$('#helpDialog').open)$('#helpDialog').showModal();}
$('#openHelp').onclick=()=>openHelp();$('#generateHelp').onclick=generateHelp;
$('#helpScope').onchange=generateHelp;$('#helpPrivacy').onchange=generateHelp;
$('#copyHelp').onclick=async()=>{const output=$('#helpOutput');if(!output.value){toast('请先选择岗位并生成材料');return;}try{await navigator.clipboard.writeText(output.value);toast('求助材料已复制，请粘贴到你使用的AI或文档中。');}catch(e){output.focus();output.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}toast(ok?'已复制求助材料':'已选中全文，请按 Ctrl+C 复制，或下载文本。');}};
$('#downloadHelp').onclick=()=>{if(!$('#helpOutput').value){toast('请先生成材料');return;}download('知国公-求助材料.txt',$('#helpOutput').value);};
const oldShowDetail=showDetail;
showDetail=function(id){oldShowDetail(id);const box=$('#detailBody .data-actions');if(box){const button=document.createElement('button');button.className='button subtle';button.id='detailHelp';button.textContent='带这个岗位去求助 ↗';button.onclick=()=>openHelp('context');box.append(button);}};
const oldShowCompare=showCompare;
showCompare=function(){oldShowCompare();const bar=document.createElement('div');bar.className='data-actions';const b=document.createElement('button');b.className='button subtle';b.textContent='为这些岗位生成求助材料 ↗';b.onclick=()=>openHelp('context');bar.append(b);$('#compareBody').prepend(bar);};
$('#compareOpen').onclick=()=>showCompare();

function observed(j){
  const approved=E.latest(state.snapshots,j.id,'approved'),pending=E.latest(state.snapshots,j.id,'pending');
  const history=T.pairs(state.snapshots,j.id),latestTime=Math.max(Date.parse(approved?.asOf)||0,Date.parse(pending?.asOf)||0);
  const pair=history[0]&&Date.parse(history[0].asOf)===latestTime?history[0]:null;
  const previous=pair?history.find(h=>Date.parse(h.asOf)<Date.parse(pair.asOf)):null;
  return {j,approved,pending,pair,history,pressure:pair&&pair.total>0?pair.total/Number(j['招考人数']):null,change:pair&&previous?pair.total-previous.total:null};
}
function sparkline(history){
  const values=history.slice(0,12).reverse().map(h=>h.total);
  if(values.length<2)return '<span class="metric-note">再录一次可看趋势</span>';
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((v,i)=>`${4+i*92/(values.length-1)},${25-(v-min)/range*20}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 100 30" role="img" aria-label="按时间排列的可见申请量趋势"><polyline points="${points}" fill="none" stroke="#32856d" stroke-width="2"/></svg>`;
}
function renderWatch(){
  if(!enhanced)return;
  const list=state.favorites.map(id=>observed(byId.get(id))).filter(o=>o.j);
  const fresh=list.filter(o=>o.pair&&!stale(o.pair)),complete=list.filter(o=>o.pair),changed=list.filter(o=>o.change!==null);
  $('#watchStats').innerHTML=[['收藏岗位',list.length,'你真正关注的选择'],['有完整成对快照',complete.length,'通过与待审来自同一来源、时点'],['24小时内完整快照',fresh.length,'及时查看来源更新时间'],['可以比较净变化',changed.length,'至少两个不同时点']].map(([label,n,hint])=>`<article class="stat"><span>${label}</span><strong>${n}</strong><small>${hint}</small></article>`).join('');
  const sort=$('#watchSort').value;
  const rank=o=>sort==='approved'?(o.approved&&!stale(o.approved)?E.ratio(o.approved,Number(o.j['招考人数'])):null):sort==='change'?(o.pair&&!stale(o.pair)?o.change:null):(o.pair&&!stale(o.pair)?o.pressure:null);
  list.sort((a,b)=>(rank(a)??Infinity)-(rank(b)??Infinity)||a.j.id.localeCompare(b.j.id));
  if(!list.length){$('#watchTable').innerHTML='<div class="empty"><h3>先收藏几个值得考虑的岗位</h3><p>返回职位探索，点击“收藏”，再来这里批量更新人数。</p><button class="button subtle" id="watchDiscover">去探索岗位 →</button></div>';$('#watchDiscover').onclick=()=>setTab('discover');return;}
  $('#watchTable').innerHTML=`<table><thead><tr><th>岗位 / 招录</th><th>审查通过</th><th>待审查</th><th>可见申请压力</th><th>较上次净变化</th><th>时间、来源与走势</th></tr></thead><tbody>${list.map(o=>{const {j,approved:a,pending:p,pair}=o;return `<tr><td class="watch-name"><button class="job-title" data-watch-detail="${esc(j.id)}">${esc(j['用人司局'])}</button><small>${esc(j['招考职位'])} · 招 ${esc(j['招考人数'])} 人</small><small>${esc(j['部门代码'])} / ${esc(j['职位代码'])}</small></td><td><span class="metric-number">${a?a.count:'—'}</span><span class="metric-note">${a?stamp(a.asOf)+(stale(a)?' · 旧数据':''):'未录入'}</span></td><td><span class="metric-number">${p?p.count:'—'}</span><span class="metric-note">${p?stamp(p.asOf)+(stale(p)?' · 旧数据':''):'未录入'}</span></td><td><span class="metric-number">${o.pressure===null?'—':o.pressure.toFixed(1)+':1'}</span><span class="metric-note">${pair?(pair.total===0?'两项均为0，不作为低竞争依据':`${pair.approved}＋${pair.pending} 人 / ${j['招考人数']} 名额`):'需同一时点、来源的两项人数'}</span></td><td><span class="metric-number">${o.change===null?'—':(o.change>0?'+':'')+o.change}</span><span class="metric-note">不是新增报名总人数</span></td><td class="source-note"><span class="metric-note">${pair?esc(stamp(pair.asOf))+(stale(pair)?' · 旧数据':'')+'<br>'+esc(pair.source):'完整快照尚未形成'}</span>${sparkline(o.history)}</td></tr>`;}).join('')}</tbody></table>`;
  $$('[data-watch-detail]').forEach(b=>b.onclick=()=>showDetail(b.dataset.watchDetail));
}

function openBulk(){
  $('#bulkTime').value=nowLocal();$('#bulkSource').value='';$('#bulkError').textContent='';
  const saved=state.favorites.map(id=>byId.get(id));
  $('#bulkRows').innerHTML=saved.length?`<table><thead><tr><th>岗位</th><th>上次通过 / 待审</th><th>本次审查通过</th><th>本次待审查</th></tr></thead><tbody>${saved.map(j=>{const o=observed(j);return `<tr data-bulk-id="${esc(j.id)}"><td class="watch-name">${esc(j['用人司局'])}<small>${esc(j['职位代码'])} · 招 ${esc(j['招考人数'])} 人</small></td><td>${o.approved?.count??'—'} / ${o.pending?.count??'—'}</td><td><input class="bulk-count" type="number" min="0" step="1" data-metric="approved" aria-label="${esc(j['用人司局'])}审查通过人数" placeholder="未提供"></td><td><input class="bulk-count" type="number" min="0" step="1" data-metric="pending" aria-label="${esc(j['用人司局'])}待审查人数" placeholder="未提供"></td></tr>`;}).join('')}</tbody></table>`:'<p>请先在职位探索中收藏岗位。</p>';
  $('#bulkDialog').showModal();
}
$('#openBulk').onclick=openBulk;
$('#bulkForm').onsubmit=e=>{
  e.preventDefault();try{
    const asOf=observationTime($('#bulkTime').value),source=$('#bulkSource').value.trim(),input=[];
    for(const row of $$('[data-bulk-id]'))for(const el of [...row.querySelectorAll('[data-metric]')])if(el.value!==''){const [departmentCode,jobCode]=row.dataset.bulkId.split(':');if(!/^\d+$/.test(el.value))throw Error('人数必须为非负整数');input.push({departmentCode,jobCode,metric:el.dataset.metric,count:el.value,asOf,source});}
    if(!input.length)throw Error('请至少填写一个人数');
    addSnapshots(input);$('#bulkDialog').close();renderWatch();
  }catch(err){$('#bulkError').className='error-text';$('#bulkError').textContent=err.message;}
};
$('#goPaste').onclick=()=>{setTab('data');$('#pasteCard').scrollIntoView({block:'start',behavior:'smooth'});$('#pasteText').focus();};
$('#watchSort').onchange=renderWatch;
$('#exportWatch').onclick=()=>{
  const data=[['部门代码','职位代码','单位','招录人数','审核通过','待审查','完整快照时间','完整快照来源','可见申请压力','可见申请量净变化']];
  for(const id of state.favorites){const o=observed(byId.get(id));data.push([o.j['部门代码'],o.j['职位代码'],o.j['用人司局'],o.j['招考人数'],o.approved?.count??'',o.pending?.count??'',o.pair?.asOf??'',o.pair?.source??'',o.pressure??'',o.change??'']);}
  download('知国公-人数观察.csv',csv(data),'text/csv;charset=utf-8');
};

let pastePending=null;
function resetPaste(){pastePending=null;$('#commitPaste').disabled=true;$('#pastePreview').textContent='内容已变化，请重新解析预览。';}
for(const id of ['pasteText','pasteTime','pasteSource'])$('#'+id).addEventListener('input',resetPaste);
$('#previewPaste').onclick=()=>{
  resetPaste();try{
    const parsed=T.parseTable($('#pasteText').value,jobs,observationTime($('#pasteTime').value),$('#pasteSource').value.trim());
    pastePending=E.validateSnapshots(parsed,ids);
    const unique=new Set(pastePending.map(s=>s.departmentCode+':'+s.jobCode));
    $('#pastePreview').innerHTML=`<p class="success-text">匹配 ${unique.size} 个岗位，共 ${pastePending.length} 条人数记录。请核对后确认导入。</p><table><thead><tr><th>部门 / 职位代码</th><th>单位</th><th>口径</th><th>人数</th></tr></thead><tbody>${pastePending.slice(0,30).map(s=>`<tr><td>${esc(s.departmentCode)} / ${esc(s.jobCode)}</td><td>${esc(byId.get(s.departmentCode+':'+s.jobCode)['用人司局'])}</td><td>${metricNames[s.metric]}</td><td>${s.count}</td></tr>`).join('')}</tbody></table>${pastePending.length>30?'<p class="small muted">仅预览前30条，确认后将保存全部记录。</p>':''}`;
    $('#commitPaste').disabled=false;
  }catch(err){pastePending=null;$('#pastePreview').textContent='解析失败：'+err.message;}
};
$('#commitPaste').onclick=()=>{if(!pastePending)return;try{const n=pastePending.length;addSnapshots(pastePending);pastePending=null;$('#commitPaste').disabled=true;$('#pastePreview').textContent=`已处理 ${n} 条记录，可到“人数观察”查看。`;}catch(err){toast('未导入：'+err.message);}};
$('#pasteTemplate').onclick=()=>download('知国公-人数填写模板.csv',csv([['部门代码','职位代码','待审查人数','审查通过人数']]),'text/csv;charset=utf-8');
$('#pasteTime').value=nowLocal();

// A page-open scheduler. There is no background service or implicit external request.
let feedTimer=null,feedBusy=false;
async function refreshSource(){
  if(!enhanced||feedBusy)return false;
  feedBusy=true;$('#refreshFeed').disabled=true;let timer;
  try{
    const url=new URL($('#feedUrl').value);if(!['http:','https:'].includes(url.protocol))throw Error('请填写有效的 HTTP / HTTPS JSON 地址');
    const controller=new AbortController();timer=setTimeout(()=>controller.abort(),15000);
    $('#feedStatus').textContent='正在读取数据源…';
    const response=await fetch(url.href,{credentials:'omit',signal:controller.signal});
    if(!response.ok)throw Error('数据源返回 HTTP '+response.status);
    const text=await response.text();if(text.length>30*1024*1024)throw Error('响应超过30MB');
    addSnapshots(JSON.parse(text));state.feedUrl=url.href;save();
    $('#feedStatus').textContent=`最近成功读取：${new Date().toLocaleString('zh-CN')}。统计时间以来源记录为准。`;
    if(tab==='monitor')renderWatch();return true;
  }catch(err){$('#feedStatus').textContent='读取失败：'+err.message+'。请确认来源可用且允许跨域；本次未修改人数。';return false;}
  finally{clearTimeout(timer);feedBusy=false;$('#refreshFeed').disabled=false;}
}
$('#refreshFeed').onclick=refreshSource;
function stopRefresh(){clearInterval(feedTimer);feedTimer=null;$('#autoRefresh').textContent='开启定期刷新';$('#scheduleStatus').textContent='定期刷新已关闭。';}
$('#autoRefresh').onclick=async()=>{
  if(feedTimer){stopRefresh();return;}
  const minutes=Number($('#refreshInterval').value);
  if(!await refreshSource())return;
  feedTimer=setInterval(()=>{if(navigator.onLine!==false)refreshSource();else $('#feedStatus').textContent='当前离线，等待网络恢复。';},minutes*60000);
  $('#autoRefresh').textContent='停止定期刷新';$('#scheduleStatus').textContent=`每 ${minutes} 分钟读取一次；仅当前页面打开期间生效，浏览器休眠可能延后。`;
};
$('#refreshInterval').onchange=()=>{if(feedTimer)stopRefresh();};
$('#feedUrl').addEventListener('input',()=>{if(feedTimer)stopRefresh();});
window.addEventListener('pagehide',()=>clearInterval(feedTimer));
$('#clearLocal').addEventListener('click',()=>{if(feedTimer&&!state.feedUrl)stopRefresh();});
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
