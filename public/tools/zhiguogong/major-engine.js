/* Source-labelled undergraduate and graduate records; conservative category matching. */
(function(root){
  'use strict';
  const catalog=root.MAJOR_CATALOG?.entries||[];
  const strip=s=>String(s??'').replace(/\s/g,'').replace(/[（(][^）)]*[）)]/g,'').replace(/[＊*]/g,'');
  const nameIndex=new Map();
  for(const e of catalog){const k=e.level+':'+e.name;if(!nameIndex.has(k))nameIndex.set(k,[]);nameIndex.get(k).push(e);}
  function records(value,level){const key=level>=3?'graduate':'bachelor';return nameIndex.get(key+':'+strip(value))||[];}
  function section(raw,level){
    const re=/(大学本科|本科(?:生)?|硕士研究生|博士研究生|研究生|硕士|博士|大专|专科)(?:所学)?(?:专业)?\s*[:：]/g;
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
  function match(raw,value,level,explicitCode='',explicitLevel=''){
    const original=String(value||'').trim(),v=strip(original),part=section(String(raw||''),level),text=part.text;
    if(!value)return {status:'review',text:'尚未填写专业'};
    if(part.ambiguous)return {status:'review',text:'岗位按学历分别列专业，但未识别出当前学历对应段落，请核对原文'};
    if(/^(?:不限|无限制|专业不限)[；;，。\s]*$/.test(text.trim()))return {status:'pass',text:'当前学历对应专业不限'};
    if(/排除|不含|不包括|除外|仅限.*方向|限.*方向/.test(text))return {status:'review',text:'专业原文包含排除项或方向限制，请逐项核对'};
    const list=records(value,level),tokens=tokenize(text),direction=original.replace(/\s/g,'')!==v;
    const actualLevel=explicitLevel===(level>=3?'graduate':'bachelor')?explicitLevel:(level>=3?'graduate':'bachelor');
    const chosen=explicitCode?catalog.find(e=>e.code===explicitCode&&e.level===actualLevel):list.find(e=>e.kind==='major')||list[0];
    const finish=reason=>({status:direction?'review':'pass',text:direction?'已识别主专业，培养方向仍需核对':reason});
    if(tokens.includes(v)||strip(text)===v)return finish('专业名称与当前学历要求一致');
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
