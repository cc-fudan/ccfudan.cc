/* Cascading province/city choices and searchable major catalogues. */
const CATALOG=window.MAJOR_CATALOG;
const municipality=/^(北京市|上海市|天津市|重庆市)/;
function locationInfo(location){
  const municipal=location.match(municipality);if(municipal)return {province:municipal[0],city:municipal[0]};
  const prov=location.match(/^(.+?(?:省|自治区|特别行政区))/)?.[1]||'其他地区';
  const rest=location.slice(prov==='其他地区'?0:prov.length);
  const city=rest.match(/^(.+?(?:自治州|地区|盟|市|林区))/)?.[1]||'';
  return {province:prov,city};
}
const provinceCities=new Map();
for(const j of jobs){const loc=locationInfo(j['工作地点']);if(!provinceCities.has(loc.province))provinceCities.set(loc.province,new Set());if(loc.city)provinceCities.get(loc.province).add(loc.city);}
function selectedCities(){return state.cities.split(/[、，,;；\s]+/).filter(Boolean);}
function selectedProvinces(){return state.province.split(/[、，,;；\s]+/).filter(Boolean);}
function availableCities(){return [...new Set(selectedProvinces().flatMap(p=>[...provinceCities.get(p)||[]]))];}
function syncCities(){
  const available=availableCities(),selected=selectedCities();
  $('#province').value='';
  $('#province').options[0].textContent=state.province?'继续添加省份':'全国 / 添加省份（可多选）';
  $('#provinceChips').replaceChildren();
  selectedProvinces().forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='province-chip city-chip';b.textContent=p+' ×';b.dataset.provinceRemove=i;b.setAttribute('aria-label','移除'+p);b.onclick=()=>{const next=selectedProvinces();next.splice(i,1);state.province=next.join('、');const valid=availableCities();state.cities=selectedCities().filter(c=>valid.includes(c)||valid.some(v=>v.replace(/市$/,'')===c)).join('、');page=1;save();syncCities();render();};$('#provinceChips').append(b);});
  $('#citySelect').innerHTML='<option value="">'+(state.province?'全省 / 请选择城市':'请先选择省份')+'</option>'+available.sort((a,b)=>a.localeCompare(b,'zh-CN')).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('#citySelect').options[0].textContent=state.province?'所选省份全域 / 添加城市':'请先选择省份';
  $('#citySelect').disabled=!state.province;
  $('#cityChips').innerHTML=selected.map((c,i)=>`<button type="button" class="city-chip" data-city-remove="${i}" aria-label="移除${esc(c)}">${esc(c)} ×</button>`).join('');
  $('#cities').value=state.cities;
  $('#cityList').innerHTML=available.map(c=>`<option>${esc(c)}</option>`).join('');
  $$('[data-city-remove]').forEach(b=>b.onclick=()=>{const next=selectedCities();next.splice(Number(b.dataset.cityRemove),1);state.cities=next.join('、');page=1;save();syncCities();render();});
}
const prevLoadForm=loadForm;
loadForm=function(){prevLoadForm();syncCities();updateMajorHint();};
$('#province').onchange=()=>{const p=$('#province').value;if(!p){state.province='';state.cities='';}else{const next=selectedProvinces();if(!next.includes(p))next.push(p);state.province=next.join('、');}page=1;save();syncCities();render();};
$('#citySelect').onchange=()=>{const city=$('#citySelect').value;if(!city)return;const values=selectedCities();if(!values.includes(city))values.push(city);state.cities=values.join('、');page=1;save();syncCities();render();};
getBase=function(){
  const provinces=selectedProvinces(),cities=selectedCities(),q=$('#search').value.trim().toLowerCase();
  return jobs.filter(j=>{const loc=locationInfo(j['工作地点']);return (tab!=='saved'||state.favorites.includes(j.id))&&(!provinces.length||provinces.includes(loc.province))&&(!cities.length||cities.some(c=>c===loc.city||c===loc.city.replace(/市$/,'')))&&(!q||[j['部门名称'],j['用人司局'],j['招考职位'],j['职位代码'],j['部门代码']].join(' ').toLowerCase().includes(q));});
};

const degreeLevel=()=>['硕士研究生','博士研究生'].includes(state.profile.education)?'graduate':'bachelor';
let majorTarget='major';
const sourceLabels={bachelor2026:'本科目录 · 2026',graduate2022:'研究生目录 · 2022',graduate1997:'历史研究生专业 · 1997',renames2025:'研究生专业领域 · 2025',job:'职位表原文 · 待核对'};
function searchableMajors(level){
  const base=CATALOG.entries.filter(e=>e.level===level),found=new Set(base.map(e=>e.name)),extra=[];
  const numberLevel=level==='graduate'?3:2;
  for(const j of jobs){
    const part=window.MajorMatcher.section(j['专业'],numberLevel);
    for(const token of window.MajorMatcher.tokenize(part.text)){
      if(found.has(token)||token.length<2||token.length>24||! /^[\u4e00-\u9fff·]+$/.test(token)||/不限|要求|以上|及其|研究生|本科|大专|专业$|相关|等$|（|）|学历/.test(token))continue;
      found.add(token);extra.push({name:token,code:'',level,category:'',discipline:'',kind:'raw',source:'job'});
    }
  }
  return [...base,...extra];
}
const majorLists={bachelor:searchableMajors('bachelor'),graduate:searchableMajors('graduate')};
function updateMajorHint(){
  if(!$('#majorHint'))return;
  const list=window.MajorMatcher.records(state.profile.major,['硕士研究生','博士研究生'].includes(state.profile.education)?3:2);
  $('#majorHint').textContent=!state.profile.major?'可搜索名称、代码和学科类别；未找到时仍可手填毕业证专业。':list.length?list.slice(0,2).map(e=>`${e.code} · ${e.category||e.discipline} · ${sourceLabels[e.source]}`).join('；'):'保留手填名称。暂未确认目录对应关系，相关岗位将提示核对。';
}
function renderMajorChoices(){
  const level=$('#majorLevel').value,q=$('#majorSearch').value.trim().toLowerCase();
  const result=majorLists[level].filter(e=>!q||[e.name,e.code,e.category,e.discipline].some(x=>x.toLowerCase().includes(q)));
  const rows=result.slice(0,70);
  $('#majorSearchCount').textContent=`找到 ${result.length} 条 · 展示前 ${rows.length} 条；同名专业可能属于不同学历和目录。`;
  $('#majorResults').innerHTML=rows.map((e,i)=>`<button type="button" class="major-choice" data-major-index="${i}"><strong>${esc(e.name)}</strong><span>${esc(e.code||'职位表原文')} · ${esc(e.category||e.discipline||'自定义类别')}</span><small>${sourceLabels[e.source]}</small></button>`).join('')||'<p class="muted">未找到此名称。可以关闭窗口，在专业输入框直接填写，工具会保留待核对结果。</p>';
  $$('[data-major-index]').forEach(b=>b.onclick=()=>{
    const e=rows[Number(b.dataset.majorIndex)],value=e.name;
    state.profile[majorTarget]=value;
    const prefix=majorTarget==='major'?'major':'bachelorMajor';
    state.profile[prefix+'Code']=e.code;state.profile[prefix+'CatalogLevel']=e.level;state.profile[prefix+'CatalogSource']=e.source;
    for(const key of [majorTarget,prefix+'Code',prefix+'CatalogLevel',prefix+'CatalogSource'])$('#profileForm').elements.namedItem(key).value=state.profile[key]||'';
    save();evalAll();render();updateMajorHint();$('#majorDialog').close();
  });
}
function openMajor(target){majorTarget=target;$('#majorLevel').value=target==='bachelorMajor'?'bachelor':degreeLevel();$('#majorSearch').value=state.profile[target]||'';renderMajorChoices();$('#majorDialog').showModal();$('#majorSearch').focus();}
$('#browseMajor').onclick=()=>openMajor('major');$('#browseBachelorMajor').onclick=()=>openMajor('bachelorMajor');
$('#majorSearch').oninput=renderMajorChoices;$('#majorLevel').onchange=renderMajorChoices;
for(const [name,prefix] of [['major','major'],['bachelorMajor','bachelorMajor']]){
  $('#profileForm').elements.namedItem(name).addEventListener('input',()=>{
    if(state.profile[prefix]!==$('#profileForm').elements.namedItem(name).value){
      for(const suffix of ['Code','CatalogLevel','CatalogSource']){state.profile[prefix+suffix]='';$('#profileForm').elements.namedItem(prefix+suffix).value='';}
    }
  });
}
$('#profileForm').elements.namedItem('education').addEventListener('change',()=>{
  if(state.profile.majorCatalogLevel&&state.profile.majorCatalogLevel!==degreeLevel()){
    for(const suffix of ['Code','CatalogLevel','CatalogSource']){state.profile['major'+suffix]='';$('#profileForm').elements.namedItem('major'+suffix).value='';}
    $('#majorHint').textContent='学历变化后已清除旧目录代码，请重新查找对应学历的专业。';
  }
});
const majorNames=[...new Set([...majorLists.bachelor,...majorLists.graduate].map(e=>e.name))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
$('#majors').innerHTML=majorNames.map(name=>`<option>${esc(name)}</option>`).join('');
$('#catalogDescription').textContent=`内置 ${CATALOG.entries.filter(e=>e.source==='bachelor2026'&&e.kind==='major').length} 个本科专业、${CATALOG.entries.filter(e=>e.source==='graduate2022').length} 个研究生一级学科/类别、${CATALOG.entries.filter(e=>e.source==='graduate1997').length} 个历史研究生专业和${CATALOG.entries.filter(e=>e.source==='renames2025').length} 个专业领域；另保留职位表专业原文。`;
$('#catalogSources').innerHTML=Object.values(CATALOG.sources).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></li>`).join('');
{const s=window.AGENCY_MAJOR_CATALOG.source,a=document.createElement('a'),li=document.createElement('li');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='税务系统2027专业参考目录 · 仅用于税务岗位 ↗';li.append(a);$('#catalogSources').append(li);}
$('#catalogStatus').textContent='专业库更新于 '+CATALOG.checkedAt+' · 目录版本各自保留';
const oldProfileInput=$('#profileForm').oninput;
$('#profileForm').addEventListener('input',()=>setTimeout(updateMajorHint,250));
$$('[data-preset]').forEach(b=>{const old=b.onclick;b.onclick=()=>{old();syncCities();updateMajorHint();};});
$('#profileToggle').onclick=()=>{const panel=$('.sidebar'),open=!panel.classList.contains('mobile-open');panel.classList.toggle('mobile-open',open);$('#profileToggle').setAttribute('aria-expanded',String(open));$('#profileToggle').textContent=open?'收起条件 ↑':'填写 / 修改我的条件 ↓';};
$('#applyMobileProfile').onclick=()=>{$('.sidebar').classList.remove('mobile-open');$('#profileToggle').setAttribute('aria-expanded','false');$('#profileToggle').textContent='填写 / 修改我的条件 ↓';$('.results-panel').scrollIntoView({behavior:'smooth',block:'start'});};
$('#catalogStatus').textContent+=' · 规则 '+window.WORKBENCH_RULE_VERSION;
syncCities();updateMajorHint();render();

