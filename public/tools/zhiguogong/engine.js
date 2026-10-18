/* Conservative, explainable local screening. No probabilistic eligibility claims. */
(function(root){
  'use strict';
  const levels = {'大专':1,'本科':2,'硕士研究生':3,'博士研究生':4};
  const philosophy = ['哲学','中国哲学','马克思主义哲学','外国哲学','逻辑学','伦理学','美学','宗教学','科学技术哲学'];
  const majors = {
    '法学': ['法学类','法学门类'],
    '法律': ['法律'],
    '汉语言文学':['中国语言文学类','中国语言文学','文学门类'],
    '汉语言':['中国语言文学类','中国语言文学','文学门类'],
    '新闻学':['新闻传播学类','新闻传播学','文学门类'],
    '传播学':['新闻传播学类','新闻传播学','文学门类'],
    '计算机科学与技术':['计算机类','计算机科学与技术类','工学门类'],
    '软件工程':['计算机类','工学门类'],
    '会计学':['工商管理类','财会审计类','会计与审计类','财会类','管理学门类'],
    '财务管理':['工商管理类','财会审计类','财会类','管理学门类'],
    '金融学':['金融学类','经济金融类','经济学门类'],
    '经济学':['经济学类','经济金融类','经济学门类'],
    '行政管理':['公共管理类','管理学门类'],
    '人力资源管理':['工商管理类','管理学门类'],
    '统计学':['统计学类','理学门类'],
  };
  philosophy.forEach(m=>majors[m]=['哲学类','哲学门类','哲学']);
  const codeMap = {'法学':'030101K','哲学':'010101','中国哲学':'010102','马克思主义哲学':'010101','汉语言文学':'050101','计算机科学与技术':'080901','会计学':'120203K'};
  const certTests = {lawA:/A类法律职业资格|法律职业资格[^，；。]{0,12}A类|法律职业资格[^，；。]{0,12}A证|法律职业资格[^，；。]{0,12}（A|法律职业资格[^，；。]{0,12}\(A|法律职业资格考试（A类|法律职业资格证书（A类|法律职业资格证书\(A类|法律职业资格考试（A类证书）/i,lawyer:/律师执业证/,cpa:/注册会计师|注册会计师全科合格/,tax:/税务师/,pmp:/PMP|项目管理专业人士/};
  function norm(s){return String(s||'').replace(/\s/g,'').replace(/[（(].*?[）)]/g,'').trim();}
  function majorSection(raw, level){
    // Separate education-specific lists before attempting any major match.
    const parts=[...raw.matchAll(/(?:大学)?本科(?:生)?(?:专业)?(?:招收|要求|为|[:：])|研究生(?:专业)?(?:招收|要求|为|[:：])|硕士(?:研究生)?(?:专业)?[:：]/g)];
    if(parts.length>1){
      const want=level>=3?'研究生':'本科';
      const p=parts.find(x=>want==='本科'?x[0].includes('本科'):!/本科/.test(x[0]));
      if(p){const i=parts.indexOf(p);return raw.slice(p.index+p[0].length,parts[i+1]?.index??raw.length);}
    }
    return raw;
  }
  function majorMatch(raw,value,level,p={},j={}){return root.MajorMatcher.match(raw,value,level,p.majorCode,p.majorCatalogLevel,p.majorCatalogSource,j);}
  function evaluate(j,p,policy={}){
    const reasons=[];
    const add=(status,label,text)=>reasons.push({status,label,text});
    const check=(v,label,fn)=>v===''||v==null?add('review',label,'尚未填写'):fn(v);
    const raw=j['备注']||'', req=j['专业']||'', level=levels[p.education]||0;
    let note=raw;
    check(p.education,'学历',()=>{
      const d=j['学历'], exact=/仅限/.test(d), min=d.includes('大专')?1:d.includes('本科')?2:d.includes('硕士')?3:4;
      const max=d.includes('或')?(d.includes('硕士')?3:2):exact?min:4;
      add(level>=min&&level<=max?'pass':'reject','学历',d);
    });
    if(j['学位']!=='无要求') check(p.degree,'学位',v=>add(v==='no'?'reject':'pass','学位',v==='no'?'岗位要求取得相应学位':j['学位']));
    const mm=majorMatch(req,p.major,level,p,j);add(mm.status,'专业',mm.text);
    check(p.politics,'政治面貌',v=>{
      const r=j['政治面貌'];add(r==='不限'||r===v||(v==='共青团员'&&r.includes('共青团员'))||(v==='中共党员'&&r.includes('中共党员'))?'pass':'reject','政治面貌',r);
    });
    const years={'一年':1,'二年':2,'三年':3,'五年以上':5}[j['基层工作最低年限']];
    if(years)check(p.years,'基层年限',v=>add(Number(v)>=years?'pass':'reject','基层年限',`岗位要求至少 ${years} 年；工作经历认定仍需复核`));
    const proj=j['服务基层项目工作经历'];
    if(proj&&!['无限制','不限'].includes(proj)) check(p.project,'专项身份',v=>{
      const ok=v==='veteran'?/退役士兵/.test(proj):v!=='none'&&proj.includes(v);
      add(ok?'review':'reject','专项身份',ok?'项目名称匹配，还需核对服务期、考核及证明':'要求特定服务基层项目或退役身份，普通工作年限不能替代');
    });
    const gradNote=note.replace(/非(?:应届|2027届)(?:高校)?毕业生[^。；;]*[。；;]?/g,'');
    const current=/2027届(?:普通)?(?:高校)?毕业生/.test(gradNote);
    const graduate=current||/应届(?:高校)?毕业生|高校应届毕业生/.test(gradNote);
    if(graduate)check(p.graduate,'毕业身份',v=>add(v==='social'||(current&&v!=='current')?'reject':'review','毕业身份',v==='social'?'岗位限定应届毕业生':current&&v!=='current'?'岗位限定2027届毕业生':'需核对毕业年份及当年度应届身份认定'));
    if(/非应届|非2027届/.test(note)&&p.graduate==='social')add('review','非应届附加条件','备注对非应届人员有额外工作单位或专业经历要求');
    if(/仅限男性|限男性|[，；。]男性[，；。]|^男性[，；。]/.test(note))check(p.sex,'性别',v=>add(v==='男'?'pass':'reject','性别','限男性'));
    if(/仅限女性|限女性|[，；。]女性[，；。]|^女性[，；。]/.test(note))check(p.sex,'性别',v=>add(v==='女'?'pass':'reject','性别','限女性'));
    if(/全日制/.test(note)){
      const strict=/(?:仅限|限|要求|须为)全日制/.test(note)&&!/(?:不限|不限制|非全日制)/.test(note);
      check(p.study,'学习形式',v=>add(v==='part'&&strict?'reject':'review','学习形式','备注涉及学习形式，请核对原文'));
    }
    if(/本科(?:所学)?专业(?:限|为|须|应)|本科和研究生|本科、研究生|研究生和本科/.test(note)){
      if(level>=3){
        if(!p.bachelorMajor)add('review','本科专业','岗位同时限制本科专业，请补充核对');
        else add('review','本科专业','已填写 '+p.bachelorMajor+'，需逐项核对备注规定的本科专业范围');
      }
    }
    const certRequired=/具有[^。]*证书|至少具有|需取得|取得[^。]*法律职业资格|通过[^。]*法律职业资格/.test(note);
    if(certRequired){
      if(!p.certificate||p.certificate==='other')add('review','职业证书','备注要求职业证书，请核实是否持有及类别');
      else if(p.certificate==='none')add('reject','职业证书','缺少备注要求的职业资格证书');
      else if(certTests[p.certificate]?.test(note)){
        const both=/且[^。]*(?:证书|资格)|同时[^。]*(?:证书|资格)/.test(note);
        add(both?'review':'pass','职业证书',both?'持有其中一种证书，还需核对是否要求同时持证':'已填证书属于备注接受的资质');
        if(!both)note=note.replace(/(?:至少)?具有[^。\n]*?(?=，(?:女性|男性|大学英语)|，在本单位|。|\n|$)/g,'').replace(/需取得国家统一法律职业资格证书[^。]*。?/g,'');
      }else add('review','职业证书','已填证书与岗位要求未能自动对应，请核对原文');
    }
    const cet6=/英语六级|英语6级|CET6/i.test(raw),cet4=/英语四级|英语4级|CET4/i.test(raw);
    if(cet6||cet4){
      let which=cet6?'cet6':'cet4';
      // Some jobs have different standards for bachelor/master applicants.
      if(cet6&&cet4&&/本科生|本科学历/.test(raw)&&level===2)which='cet4';
      const re=which==='cet6'?/(?:英语六级|英语6级|CET6)[^。；\n]{0,32}?(425|500|550|600)/i:/(?:英语四级|英语4级|CET4)[^。；\n]{0,32}?(425|500|550|600)/i;
      const threshold=Number(raw.match(re)?.[1]||425), score=p[which];
      if(score===''||score==null)add('review','英语',`岗位涉及英语要求（${which==='cet6'?'六':'四'}级参考门槛 ${threshold}），尚未提供成绩`);
      else if(Number(score)<threshold)add(/雅思|托福|英语专业/.test(raw)?'review':'reject','英语',`已填成绩低于 ${threshold} 分${/雅思|托福|英语专业/.test(raw)?'，可核对替代考试条件':''}`);
      else add('pass','英语',`所填${which==='cet6'?'六':'四'}级成绩达到识别出的 ${threshold} 分门槛`);
      note=note.replace(/(?:大学|全国大学)?英语[四六46]级[^。\n]*[。\n]?/g,'');
    }
    if(/户籍|户口|生源/.test(raw))add('review','户籍生源',p.hometown?'已填 '+p.hometown+'，需对照户籍或生源原文确认':'存在户籍或生源限制，尚未填写');
    if(policy.min!==undefined&&policy.max!==undefined&&policy.source){
      check(p.age,'年龄',v=>add(Number(v)>=policy.min&&Number(v)<=policy.max?'pass':'review','年龄',`自设规则 ${policy.min}–${policy.max} 岁；超范围或特殊放宽需核实`));
    }
    if(/(?:年龄|周岁|岁以下|岁以内)/.test(raw))add('review','岗位年龄','备注存在年龄条件，请按出生日期和截止日核对');
    // Whitelist only low-risk housekeeping language. Anything left stays visible as review.
    note=note.replace(/在(?:本单位|北京税务系统)最低服务年限为?\s*5年(?:（含试用期）)?/g,'').replace(/本单位不提供宿舍/g,'').replace(/(?:仅限|限)?[男女]性/g,'').replace(/(?:限|招考对象为)?(?:2027届|应届)高校毕业生/g,'').replace(/[\s，,；;。\d．.、：:]+/g,'');
    if(note&&!reasons.some(r=>r.status==='reject')&&!reasons.some(r=>['专项身份','户籍生源','本科专业','非应届附加条件','学习形式','岗位年龄'].includes(r.label)&&r.status==='review'))add('review','备注复核','原文含附加要求，需逐条确认（详情可见完整备注）');
    if(!p.graduate&&!graduate)add('review','毕业身份','未填写毕业身份，需结合年度公告确认');
    const status=reasons.some(r=>r.status==='reject')?'reject':reasons.some(r=>r.status==='review')?'review':'match';
    return {status,reasons,passes:reasons.filter(r=>r.status==='pass').length};
  }
  function parseCSV(text){
    text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
      else if(c===','&&!quoted){row.push(field);field='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}
      else field+=c;
    }
    if(quoted)throw Error('CSV引号未闭合');row.push(field);if(row.some(Boolean))rows.push(row);
    const head=rows.shift()||[];
    if(!head.includes('departmentCode')||!head.includes('jobCode'))throw Error('缺少 departmentCode / jobCode 表头，请使用模板');
    return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h.trim(),r[i]??''])));
  }
  function validateSnapshots(input, ids){
    if(!Array.isArray(input)||input.length>100000)throw Error('数据必须为最多10万条记录的数组');
    return input.map((row,i)=>{
      const departmentCode=String(row.departmentCode||''),jobCode=String(row.jobCode||''),id=departmentCode+':'+jobCode;
      if(!ids.has(id))throw Error(`第 ${i+1} 行：部门代码 + 职位代码不存在，请保留前导零`);
      if(!['approved','registered','paid','pending'].includes(row.metric))throw Error(`第 ${i+1} 行：统计口径须为 approved / registered / paid / pending`);
      const count=Number(row.count);
      if(row.count===''||row.count==null||!Number.isSafeInteger(count)||count<0)throw Error(`第 ${i+1} 行：人数必须为非负整数`);
      const date=String(row.asOf||'');
      if(!/(Z|[+-]\d\d:\d\d)$/.test(date)||!Number.isFinite(Date.parse(date)))throw Error(`第 ${i+1} 行：时间须含时区，如 2026-10-17T10:00:00+08:00`);
      if(Date.parse(date)>Date.now()+5*60000)throw Error(`第 ${i+1} 行：快照时间不能在未来`);
      if(!String(row.source||'').trim())throw Error(`第 ${i+1} 行：必须填写来源`);
      return {departmentCode,jobCode,metric:row.metric,count,asOf:new Date(date).toISOString(),source:String(row.source).trim().slice(0,500)};
    });
  }
  function latest(snapshots, id, metric){return snapshots.filter(s=>s.departmentCode+':'+s.jobCode===id&&s.metric===metric).sort((a,b)=>Date.parse(b.asOf)-Date.parse(a.asOf))[0]||null;}
  function ratio(s,seats){return s&&s.metric!=='pending'&&s.count>0&&seats>0?s.count/seats:null;}
  root.Screening={evaluate,majorMatch,parseCSV,validateSnapshots,latest,ratio};
  if(typeof module!=='undefined')module.exports=root.Screening;
})(typeof window!=='undefined'?window:globalThis);
