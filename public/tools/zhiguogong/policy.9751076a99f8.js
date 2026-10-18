/* Annual facts are versioned independently of applicant profiles and job data. */
(function(root){
 'use strict';
 const sources={
  announcement:{title:'2027年度招考公告（税务官网转载）',url:'https://shanghai.chinatax.gov.cn/tax/xxgk/rsxx/202610/t481763.html'},
  guide:{title:'2027年度报考指南（税务官网转载）',url:'https://shanghai.chinatax.gov.cn/tax/xxgk/rsxx/202610/t481764.html'},
  csrc:{title:'2027年度证监会招考公告与大纲附件',url:'https://www.csrc.gov.cn/csrc/c100083/c7664528/content.shtml'}
 };
 const events=[
  ['identity','注册与实名认证','2026-10-14T08:00:00+08:00','2026-10-23T18:00:00+08:00','比提交报名提前一天截止。未完成认证将无法提交申请。'],
  ['apply','提交报考申请','2026-10-15T08:00:00+08:00','2026-10-24T18:00:00+08:00','每次只能报1个职位；审核通过后不能改报。'],
  ['review','资格审查','2026-10-15T08:00:00+08:00','2026-10-26T18:00:00+08:00','报名截止后，即使未审查或未通过，也不能改报。'],
  ['number','查询报名序号','2026-10-28T08:00:00+08:00',null,'通过审核后查询，用于确认报名和打印准考证。'],
  ['pay','报名确认与缴费','2026-11-01T00:00:00+08:00','2026-11-07T00:00:00+08:00','官方截止写法为11月6日24:00；逾期视为放弃。'],
  ['ticket','打印准考证','2026-11-23T00:00:00+08:00','2026-11-29T15:00:00+08:00','确认报名成功后打印，考试携带准考证和报名身份证件。'],
  ['special','专业科目笔试 / 外语水平测试','2026-11-28T14:00:00+08:00','2026-11-28T16:00:00+08:00','仅适用证监会、金融监管、公安人民警察及8个非通用语职位。'],
  ['aptitude','行政职业能力测验','2026-11-29T09:00:00+08:00','2026-11-29T11:00:00+08:00','所有岗位；客观题，120分钟，满分100分。'],
  ['essay','申论','2026-11-29T14:00:00+08:00','2026-11-29T17:00:00+08:00','所有岗位；主观题，180分钟，满分100分。']
 ].map(([id,title,start,end,note])=>({id,title,start,end,note}));
 const topics={
  '财金':['经济学、货币金融、投资与公司金融','证券市场、证券监管、投资者保护','期货、期权、套期保值与套利；相关经济金融政策'],
  '法律':['证券、基金、期货及衍生品、私募基金监管','公司、合伙、破产、民商法及其他金融法律','行政、刑事、诉讼等法律与习近平法治思想'],
  '会计':['会计准则与会计实务','审计、职业道德与内部控制','非经常性损益、净资产收益率、每股收益'],
  '计算机':['计算机体系结构、操作系统、网络与安全','数据结构与算法、数据库与数据治理','软件工程、项目管理、人工智能等新技术']
 };
 function phase(e,now=Date.now()){
  const n=Number(now);if(n<Date.parse(e.start))return '未开始';
  return !e.end?'已开放':n>=Date.parse(e.end)?'已结束':'进行中';
 }
 function exam(j){
  const dept=String(j['部门名称']||''),title=String(j['招考职位']||''),raw=String(j['备注']||''),type=j['考试类别']||'原表未填写';
  const csrc=/证券监督管理|证监会/.test(dept),nfra=/金融监督管理|金融监管/.test(dept);
  // Authority + job wording determine the examination; applicant major never does.
  const attribute=String(j['职位属性']||'');
  const police=/公安机关人民警察/.test(attribute);
  const language=/非通用语/.test(attribute)&&/日语|法语|俄语|西班牙语|阿拉伯语|德语|朝鲜语|韩语|葡萄牙语/.test(attribute);
  const publicOnly=/笔试只测查(?:行政职业能力测验|行测)和申论/.test(raw);
  const uncertainPolice=/(?:公安|移民管理|边检)/.test(dept)&&!police;
  const uncertainLanguage=/非通用语/.test(attribute)&&!language||/中央党史和文献研究院|外交部|公安部|商务部|文化和旅游部/.test(dept)&&/(?:日语|法语|俄语|西班牙语|阿拉伯语|德语|朝鲜语|韩语|葡萄牙语)/.test(title+' '+raw)&&!language;
  let category='',track='普通公共科目',weights=[.5,.5],certain=true;
  if(publicOnly){track='仅公共科目（按岗位备注）';weights=null;certain=false;}
  else if(csrc){category=title.match(/(财金|法律|会计|计算机)类/)?.[1]||'';track='证监会'+(category||'（类别待确认）');weights=[.25,.25,.5];}
  else if(nfra){category=title.match(/(财经|综合|法律|财会|计算机)类/)?.[1]||'';track='金融监管'+(category||'（类别待确认）');weights=[.25,.25,.5];}
  else if(language){track='8个非通用语';weights=[.25,.25,.5];}
  else if(police){track='公安机关人民警察';weights=[.4,.3,.3];}
  else if(uncertainPolice||uncertainLanguage){track='考试方案需核对';weights=null;certain=false;}
  return {type,track,category,csrc,weights,certain,publicOnly,special:weights?.length===3,topics:csrc&&topics[category]||[],interviewTest:j['是否在面试阶段组织专业能力测试']||j['是否组织专业能力测试']||'查看职位表及面试公告'};
 }
 function score(weights,values){
  if(!Array.isArray(weights)||!weights.length)throw Error('请先确认岗位考试方案');
  if(values.length!==weights.length||values.some(v=>String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100))throw Error('请填写各科0–100分的有效成绩，空白不能按0分计算');
  return weights.reduce((sum,w,i)=>sum+w*Number(values[i]),0);
 }
 function age(p,j,year){
  if(Number(year)!==2027)return null;
  if(/公安|移民管理|边检|监狱|戒毒/.test(String(j['部门名称']))||/人民警察|特警|狱医|法医/.test(String(j['招考职位'])))return {status:'review',label:'年度年龄',text:'人民警察存在按机关层级及岗位区分的年龄规定；工具尚未结构化该岗位层级，请查看2027指南第13问',reviewKind:'rulegap',source:sources.guide.url};
  const fresh=p.graduate==='current'&&['硕士研究生','博士研究生'].includes(p.education),min=fresh?'1982-10':'1987-10',max='2008-10';
  if(p.birthMonth){
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.birthMonth))return {status:'review',label:'年度年龄',text:'出生年月格式应为YYYY-MM',reviewKind:'missing'};
   return {status:p.birthMonth>=min&&p.birthMonth<=max?'pass':'reject',label:'年度年龄',text:`按2027公告出生区间 ${min} 至 ${max} 核对${fresh?'（2027应届硕博放宽）':''}；岗位另有规定时须同时满足`,source:sources.announcement.url};
  }
  return {status:'review',label:'年度年龄',text:'请补充出生年月；周岁数字不能准确替代公告规定的出生区间',reviewKind:'missing',source:sources.announcement.url};
 }
 function ics(selected=events){
  const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const utc=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Zhiguogong//2027 Exam Calendar//ZH','CALSCALE:GREGORIAN'];
  for(const e of selected){
   // Deadline reminders are short events, not week-long appointments.
   const deadline=e.end&&!['special','aptitude','essay'].includes(e.id),start=deadline?e.end:e.start,end=deadline?new Date(Date.parse(start)+15*60000).toISOString():e.end||new Date(Date.parse(start)+15*60000).toISOString();
   lines.push('BEGIN:VEVENT','UID:2027-'+e.id+'@zhiguogong.ccfudan.cc','DTSTAMP:20261018T000000Z','DTSTART:'+utc(start),'DTEND:'+utc(end),'SUMMARY:'+escape('国考2027 · '+e.title+(deadline?'截止':'')),'DESCRIPTION:'+escape(e.note+'\n北京时间；请自行确认日历提醒设置。\n'+sources.announcement.url),'BEGIN:VALARM','TRIGGER:-PT24H','ACTION:DISPLAY','DESCRIPTION:国考时间提醒','END:VALARM','END:VEVENT');
  }
  const encoder=new TextEncoder();
  return lines.concat('END:VCALENDAR','').map(line=>{
   let result='',part='',bytes=0;
   for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){result+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=size;}
   return result+part;
  }).join('\r\n');
 }
 root.ExamPolicy={year:2027,verifiedAt:'2026-10-18',sources,events,topics,phase,exam,score,age,ics};
})(typeof window==='undefined'?globalThis:window);
