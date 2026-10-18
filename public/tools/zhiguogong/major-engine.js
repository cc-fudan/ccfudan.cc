/* Source-labelled undergraduate and graduate records; conservative category matching. */
(function(root){
  'use strict';
  const catalog=root.MAJOR_CATALOG?.entries||[];
  const strip=s=>String(s??'').replace(/\s/g,'').replace(/[（(][^）)]*[）)]/g,'').replace(/[＊*]/g,'');
  const nameIndex=new Map();
  for(const e of catalog){const k=e.level+':'+e.name;if(!nameIndex.has(k))nameIndex.set(k,[]);nameIndex.get(k).push(e);}
  function records(value,level){const key=level>=3?'graduate':'bachelor';return nameIndex.get(key+':'+strip(value))||[];}
  function section(raw,level){
    const re=/(大学本科|本科(?:生)?|硕士研究生|博士研究生|研究生|硕士|博士|大专|专科)(?:所学)?(?:专业)?(?:报考)?\s*[:：]/g;
    const labels=[...String(raw).matchAll(re)];
    if(!labels.length)return {text:String(raw),ambiguous:false};
    const want=level>=3?/研究生|硕士|博士/:level===1?/大专|专科/:/本科/;
    const selected=labels.filter(x=>want.test(x[1]));
    if(!selected.length)return {text:'',ambiguous:true};
    return {text:selected.map(p=>{const i=labels.indexOf(p);return raw.slice(p.index+p[0].length,labels[i+1]?.index??raw.length);}).join('；'),ambiguous:false};
  }
  function tokenize(text){
    // Preserve commas inside explanatory parentheses; keep exact compound names from the catalogue.
    let plain='',depth=0;
    for(const c of text){if(c==='（'||c==='('){depth++;plain+=c;}else if(c==='）'||c===')'){depth=Math.max(0,depth-1);plain+=c;}else plain+=depth&&/[、,，;；]/.test(c)?' ':c;}
    return plain.split(/[、,，;；\n/]/).map(v=>strip(v).replace(/^[：:\s]+/,'').replace(/^[0-9A-Za-z]+/,'').replace(/[0-9A-Za-z]+$/,'').replace(/^(?:一级学科|专业类别|专业类|专业)[:：]/,'').replace(/等(?:专业)?$/,'')).filter(Boolean);
  }
  function match(raw,value,level,explicitCode='',explicitLevel='',explicitSource='',job={}){
    const original=String(value||'').trim(),v=strip(original),part=section(String(raw||''),level),text=part.text;
    if(!value)return {status:'review',text:'尚未填写专业'};
    if(part.ambiguous)return {status:'review',text:'岗位按学历分别列专业，但未识别出当前学历对应段落，请核对原文'};
    if(/^(?:不限|无限制|专业不限)[；;，。\s]*$/.test(text.trim()))return {status:'pass',text:'当前学历对应专业不限'};
    if(/排除|不含|不包括|除外|仅限.*方向|限.*方向/.test(text))return {status:'review',text:'专业原文包含排除项或方向限制，请逐项核对'};
    const list=records(value,level),tokens=tokenize(text),direction=original.replace(/\s/g,'')!==v;
    const actualLevel=explicitLevel===(level>=3?'graduate':'bachelor')?explicitLevel:(level>=3?'graduate':'bachelor');
    const chosen=explicitCode?catalog.find(e=>e.code===explicitCode&&e.level===actualLevel&&(!explicitSource||e.source===explicitSource)):list.length===1?list[0]:null;
    const finish=reason=>({status:direction?'review':'pass',text:direction?'已识别主专业，培养方向仍需核对':reason});
    const agency=root.AGENCY_MAJOR_CATALOG;
    const scoped=agency?.year===2027&&level>=2&&/国家税务总局/.test(job['部门名称']||'');
    if(scoped){
      const groups=tokens.filter(t=>agency.categories[t]);
      const names=new Set([v,agency.aliases[v]].filter(Boolean));
      if(level>=3&&v==='会计')names.add('会计学');
      const hits=groups.flatMap(g=>agency.categories[g].filter(e=>names.has(strip(e.name))).map(e=>({g,e})));
      if(hits.length){
        if(hits.some(h=>!h.e.review))return finish('税务系统2027专业参考目录：'+v+'属于“'+hits.find(h=>!h.e.review).g+'”');
        return {status:'review',text:'税务系统2027目录列有该专业，但还需确认所学语种等附加条件'};
      }
      if(groups.length===tokens.length&&groups.length&&!tokens.includes(v)){
        const knownGroups=Object.entries(agency.categories).filter(([,entries])=>entries.some(e=>!e.review&&names.has(strip(e.name)))).map(([g])=>g);
        // A known major excluded by every fully parsed requested category is a conflict.
        // Unknown names and directions remain unresolved; absence alone is not exclusion.
        if(knownGroups.length&&!direction)return {status:'reject',text:'专业不符：税务系统2027目录将“'+v+'”列入'+knownGroups.join('、')+'，未列入本岗位要求的'+groups.join('、')};
        return {status:'review',text:'税务系统2027目录尚不能确认该专业名称或方向的归属；如按相近专业申请，需由招录机关审查'};
      }
    }
    if(tokens.includes(v)||strip(text)===v)return finish('专业名称与当前学历要求一致');
    if(list.length>1&&!chosen){
      const identities=new Set(list.map(e=>e.code+':'+e.category+':'+e.discipline));
      if(identities.size>1)return {status:'review',text:'该名称对应多个专业代码或学位类别，请在“查专业”中选择与你学历一致的目录记录'};
    }
    for(const e of (chosen?[chosen]:list)){
      if(e.kind==='major'&&e.category&&tokens.some(t=>t===e.category||t===e.category+'类'))return finish(`按${e.source==='graduate1997'?'历史研究生目录':'教育部目录'}归入“${e.category}”，目录版本及机关解释需复核`);
      if(e.discipline&&tokens.some(t=>t===e.discipline+'门类'||t===e.discipline+'学科门类'||t==='学科门类'+e.discipline))return finish(`专业属于${e.discipline}门类，按原文门类范围匹配`);
      // A graduate first-level subject may be stated without 类 (e.g. 中国哲学 -> 哲学).
      if(level>=3&&e.kind==='major'&&e.category&&tokens.includes(e.category))return finish(`专业归入研究生一级学科“${e.category}”，请复核适用目录`);
      const code=e.code.replace(/[TK]/g,'');
      const inText=[...text.matchAll(/(?<!\d)(\d{4,7})(?:TK|T|K)?(?!\d)/g)].map(m=>m[1]);
      if(inText.includes(code))return finish(`专业代码 ${e.code} 与当前学历要求匹配`);
      if(e.kind==='major'&&inText.includes(code.slice(0,4)))return finish(`专业属于代码 ${code.slice(0,4)} 的类别，需核对岗位目录版本`);
    }
    // Tokens from current/legacy catalogues are kept distinct; no substring-equals-major shortcut.
    if(/相关|相近|等专业|专业不限/.test(text)||text.includes(v))return {status:'review',text:'专业表述、相关范围或培养方向需由招录机关确认'};
    if(!list.length&&!chosen)return {status:'review',text:'未在当前学历目录中建立该专业的完整归属，请查看岗位原文或补充专业代码'};
    const wanted=new Set((chosen?[chosen]:list).flatMap(e=>[e.name,e.category,e.discipline+'门类']).filter(Boolean));
    if(tokens.some(t=>/门类$|类$/.test(t)&&!catalog.some(e=>e.name===t||e.category===t||e.discipline+'门类'===t)))return {status:'review',text:'岗位采用招录自定义专业分类，本地目录不能直接排除，请核对原文'};
    if(tokens.some(t=>wanted.has(t)))return {status:'review',text:'专业存在关联，需要确认类别与学历层级'};
    return {status:'reject',text:'当前学历对应的专业原文未包含所填专业或目录类别'};
  }
  root.MajorMatcher={match,records,section,tokenize,strip};
})(typeof window!=='undefined'?window:globalThis);

window.WORKBENCH_RULE_VERSION="202710-c3697bacbb";
