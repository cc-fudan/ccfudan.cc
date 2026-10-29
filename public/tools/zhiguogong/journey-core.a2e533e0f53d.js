/* Recruitment dates and personal completion are separate facts. */
(function (root) {
  'use strict';
  const VERSION = 1, KEY = 'zhiguogong-journey-v1';
  const stages = ['关注选岗', '报名审核', '确认缴费', '笔试准备', '成绩调剂', '面试复审', '体检考察', '录用报到'];
  const states = {todo:'未办理', doing:'办理中', done:'已完成', blocked:'需处理', skipped:'不适用'};
  const proof = {builtin:'已核验内置来源', confirmed:'本人已核对', pending:'待核对'};
  const materialNames = ['身份证有效期与原件', '学历、学位及认证材料', '证件照片', '报名登记表 / 推荐表', '工作经历证明', '岗位要求的资格证书', '准考证与考试文具', '资格复审所需补充材料', '面试通知与确认材料', '档案、考察与报到材料'];
  const definitions = [
    ['notice',0,'阅读公告与岗位条件','核对年度、地区、招录批次、专业、身份、年龄与补充说明。'],
    ['choose',0,'确定报考岗位','用部门代码与职位代码共同核对岗位。收藏不等于正式报名。'],
    ['identity',1,'注册与实名认证','按本场报名系统要求完成注册认证，核对个人信息。'],
    ['apply',1,'提交报考申请','完成提交后保存回执；提交成功与资格审核通过分别记录。'],
    ['review',1,'查询资格审查结果','主动查看审核结论和退回原因；需要补正时记录处理结果。'],
    ['number',1,'保存报名序号','在官方系统查询并妥善保存；此处只记录是否办妥。','opening'],
    ['pay',2,'报名确认与缴费','核对照片、考区、费用及支付成功状态；减免手续按公告办理。'],
    ['attendance',2,'确认参加笔试（如要求）','部分招录另有参加笔试确认，查公告后设定时间或标为不适用。'],
    ['ticket',3,'下载打印准考证','核对所有科目的日期、考点、证件要求，准备纸质备份。'],
    ['travel',3,'安排考点交通住宿','以准考证考区与考点为准；工作城市不一定是考试城市。'],
    ['special',3,'专业科目 / 外语笔试','仅适用需要该科目的岗位；核对大纲、考点与允许携带的物品。','exam'],
    ['aptitude',3,'行政职业能力测验','以本场准考证时刻为准，预留入场与安检时间。','exam'],
    ['essay',3,'申论','核对试卷类别、作答时间与考点。','exam'],
    ['score',4,'查询成绩与进面名单','记录成绩、最低合格要求和进面名单；分数不能代替官方结果。'],
    ['transfer',4,'核对调剂 / 补录机会','核对适用条件、职位、单独申请期限；不适用可跳过。'],
    ['interviewConfirm',5,'面试确认','查看招录机关通知，按期限确认参加并提交要求材料。'],
    ['qualification',5,'资格复审','逐项准备原件、复印件和证明材料；审核要求以机关通知为准。'],
    ['interview',5,'面试 / 专业能力测试','核对面试形式、时间、地点及是否另有专业能力测试。','exam'],
    ['fitness',6,'体能测评（如适用）','适用岗位依通知参加；普通岗位经核对可标为不适用。','exam'],
    ['medical',6,'体检','按指定机构和通知参加，结果及复检安排以招录机关为准。','exam'],
    ['inspection',6,'考察与档案核实','按通知配合提供真实材料，确认档案所在地及联系人。'],
    ['publicity',7,'拟录用公示','核对本人名单、公示期和机关通知；公示不等于完成报到。'],
    ['record',7,'录用手续与报到','按正式通知完成相关手续，记录报到时间与地点。'],
    ['retrospect',7,'完成本场复盘','记录时间管理、知识薄弱点与下一次考试的调整。']
  ];
  function uid(){return root.crypto?.randomUUID?.() || 'j'+Date.now().toString(36)+Math.random().toString(36).slice(2);}
  function blank(){return {schema:VERSION,exams:[],logs:[],errors:[],updatedAt:new Date().toISOString()};}
  function str(v,max=2000){return typeof v==='string'?v.slice(0,max):'';}
  function url(v){try {const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function date(v){if(!/^\d{4}-\d\d-\d\d$/.test(v||''))return '';const d=new Date(v+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===v?v:'';}
  function time(v){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(v||''))return '';return date(v.slice(0,10))&&+v.slice(11,13)<24&&+v.slice(14,16)<60?v:'';}
  function ms(v){return time(v)?Date.parse(v+':00+08:00'):NaN;}
  function today(now=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
  function addDays(v,n){const d=new Date(v+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function fmt(v){return v? v.replace('T',' ').replace(/-/g,'/') : '时间待公布';}
  function validDates(start,end){return (!start||!!time(start))&&(!end||!!time(end))&&(!start||!end||ms(end)>=ms(start));}
  function stageTasks(){return definitions.map(([id,stage,title,hint,kind])=>({id,stage,title,hint,kind:kind||'deadline',status:'todo',start:'',end:'',source:'',proof:'pending',note:'',place:'',completedAt:''}));}
  function createExam(input,policy){
    const e={id:uid(),title:str(input.title,180),year:str(input.year,4),type:input.type||'省考',region:str(input.region,80),batch:str(input.batch||'统一招录',80),departmentCode:str(input.departmentCode,40),positionCode:str(input.positionCode,40),position:str(input.position,200),lifecycle:'active',source:url(input.source),note:'',tasks:stageTasks(),materials:materialNames.map((name,i)=>({id:'m'+i,name,status:'todo',note:''})),sources:[],scores:{aptitude:'',essay:'',special:'',interview:'',result:'待公布',note:''},createdAt:new Date().toISOString()};
    if(input.template==='national2027'&&policy){
      e.type='国考';e.year='2027';e.source=policy.sources.announcement.url;
      for(const event of policy.events){const t=e.tasks.find(t=>t.id===event.id);if(t)Object.assign(t,{start:event.start.slice(0,16),end:event.end?.slice(0,16)||'',source:e.source,proof:'builtin',note:event.note});}
      e.tasks.find(t=>t.id==='score').note='公告预计2027年1月公布；精确时间另行通知。';
      e.tasks.find(t=>t.id==='special').proof='pending';
      e.tasks.find(t=>t.id==='special').note='先核对本岗位是否需要专业 / 外语考试。未确认前不导出此项日历。';
      e.tasks.find(t=>t.id==='attendance').status='skipped';
      e.sources.push({id:uid(),title:'2027国考招考公告',url:e.source,checked:'2026-10-29',note:'仅内置公告明确的报名与笔试时间；后续机关安排另行录入。'});
    }
    return e;
  }
  function fromJob(j,policy){
    const e=createExam({title:(j['用人司局']||j['部门名称'])+' · '+j['招考职位'],year:'2027',type:'国考',region:j['工作地点'],batch:'统一招录',departmentCode:j['部门代码'],positionCode:j['职位代码'],position:j['招考职位'],template:'national2027'},policy);
    const track=policy?.exam(j);if(track?.certain&&!track.special)e.tasks.find(t=>t.id==='special').status='skipped';
    if(track?.certain&&track.special){e.tasks.find(t=>t.id==='special').proof='builtin';e.tasks.find(t=>t.id==='special').note='依据岗位考试方案：'+track.track+'。请另核对准考证与考点。';}
    e.tasks.find(t=>t.id==='choose').status='done';e.tasks.find(t=>t.id==='choose').completedAt=new Date().toISOString();
    e.note='来源：本地2027职位库，未逐岗与官网比对。加入考程不代表正式报名或审核通过。';
    return e;
  }
  function identity(e){return [e.year,e.type,e.type==='国考'?'全国':e.region,e.batch,e.departmentCode,e.positionCode].join('|');}
  function complete(t){return ['done','skipped'].includes(t.status);}
  function trusted(t){return t.proof!=='pending'&&!!url(t.source);}
  function due(t){return t.kind==='exam'?t.start:t.end||t.start;}
  function taskState(t,now=Date.now()){
    if(complete(t))return {label:states[t.status],tone:t.status==='done'?'green':'muted',rank:9};
    if(t.status==='blocked')return {label:'需处理',tone:'red',rank:0};
    if(!trusted(t)||!due(t))return {label:due(t)?'日期待核对':states[t.status],tone:'muted',rank:5};
    const left=ms(due(t))-now;
    if(t.kind==='opening'&&!t.end&&left<0)return {label:'已开放 · 待办理',tone:'blue',rank:4};
    if(left<0)return {label:'已过期 · 核对办理情况',tone:'red',rank:1};
    if(t.start&&now<ms(t.start)&&t.kind!=='exam')return {label:'尚未开始',tone:'blue',rank:4};
    if(left<=864e5)return {label:'24小时内',tone:'red',rank:2};
    if(left<=7*864e5)return {label:'7天内',tone:'amber',rank:3};
    return {label:t.status==='doing'?'办理中':'待办理',tone:'blue',rank:4};
  }
  function tasks(data){return data.exams.filter(e=>e.lifecycle==='active').flatMap(exam=>exam.tasks.map(task=>({exam,task})));}
  function upcoming(data,now=Date.now()){return tasks(data).filter(x=>!complete(x.task)).sort((a,b)=>taskState(a.task,now).rank-taskState(b.task,now).rank||(ms(due(a.task))||Infinity)-(ms(due(b.task))||Infinity)||a.task.stage-b.task.stage);}
  function progress(e){const active=e.tasks.filter(t=>t.status!=='skipped');return {done:active.filter(t=>t.status==='done').length,total:active.length};}
  function conflicts(data){
    const events=tasks(data).filter(x=>x.task.kind==='exam'&&x.task.status!=='skipped'&&trusted(x.task)&&time(x.task.start)&&time(x.task.end));
    const found=[];for(let i=0;i<events.length;i++)for(let k=i+1;k<events.length;k++){
      const a=events[i],b=events[k];if(a.exam.id!==b.exam.id&&ms(a.task.start)<ms(b.task.end)&&ms(b.task.start)<ms(a.task.end))found.push({a,b});
    }return found;
  }
  function clean(raw){
    if(!raw||raw.schema!==VERSION||!Array.isArray(raw.exams)||!Array.isArray(raw.logs)||!Array.isArray(raw.errors))throw Error('不是兼容的知国公考程备份（schema 1）');
    if(raw.exams.length>100||raw.logs.length>5000||raw.errors.length>3000)throw Error('数据条数超出限制');
    const out=blank(),ids=new Set();
    const requiredId=v=>{if(typeof v!=='string'||!/^[\w:-]{1,100}$/.test(v))throw Error('记录标识无效');return v;};
    for(const item of raw.exams){
      const id=requiredId(item.id);if(ids.has(id))throw Error('考试记录标识重复');ids.add(id);
      if(!str(item.title,180)||!/^20\d\d$/.test(item.year)||!['国考','省考','市级独立招录','其他公务员招录'].includes(item.type))throw Error('考试名称、年度或类型无效');
      if(!Array.isArray(item.tasks)||item.tasks.length>100||!Array.isArray(item.materials)||item.materials.length>100||!Array.isArray(item.sources)||item.sources.length>100)throw Error('流程、材料或来源数据无效');
      const e={id,title:str(item.title,180),year:item.year,type:item.type,region:str(item.region,80),batch:str(item.batch,80),departmentCode:str(item.departmentCode,40),positionCode:str(item.positionCode,40),position:str(item.position,200),lifecycle:['active','archived'].includes(item.lifecycle)?item.lifecycle:'active',source:url(item.source),note:str(item.note),createdAt:str(item.createdAt,40),tasks:[],materials:[],sources:[],scores:{}};
      const tids=new Set();for(const t of item.tasks){
        requiredId(t.id);if(tids.has(t.id))throw Error('同场流程标识重复');tids.add(t.id);
        if(!Number.isInteger(t.stage)||t.stage<0||t.stage>=stages.length||!Object.hasOwn(states,t.status)||!str(t.title,180)||!validDates(t.start,t.end))throw Error('流程状态或时间无效');
        let reliability=Object.hasOwn(proof,t.proof)?t.proof:'pending';
        if(reliability==='builtin'){
          const event=root.ExamPolicy?.events.find(x=>x.id===t.id);
          if(!(item.type==='国考'&&item.year==='2027'&&event&&t.source===root.ExamPolicy.sources.announcement.url&&t.start===event.start.slice(0,16)&&(t.end||'')===(event.end?.slice(0,16)||'')))reliability='pending';
        }
        e.tasks.push({id:t.id,stage:t.stage,title:str(t.title,180),hint:str(t.hint),kind:['exam','opening'].includes(t.kind)?t.kind:'deadline',status:t.status,start:t.start||'',end:t.end||'',source:url(t.source),proof:reliability,note:str(t.note),place:str(t.place,300),completedAt:str(t.completedAt,40)});
      }
      const mids=new Set();for(const m of item.materials){requiredId(m.id);if(mids.has(m.id))throw Error('材料标识重复');mids.add(m.id);e.materials.push({id:m.id,name:str(m.name,180),status:['todo','ready','submitted','na'].includes(m.status)?m.status:'todo',note:str(m.note)});}
      for(const s of item.sources)e.sources.push({id:requiredId(s.id),title:str(s.title,180),url:url(s.url),checked:date(s.checked),note:str(s.note)});
      for(const k of ['aptitude','essay','special','interview']){const v=item.scores?.[k];e.scores[k]=v===''||v===undefined?'':Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100?String(v):'';}
      e.scores.result=str(item.scores?.result,100)||'待公布';e.scores.note=str(item.scores?.note);out.exams.push(e);
    }
    const lids=new Set();for(const l of raw.logs){requiredId(l.id);if(lids.has(l.id)||!ids.has(l.examId)||!date(l.date))throw Error('学习记录引用或日期无效');lids.add(l.id);const minutes=Number(l.minutes),count=Number(l.count),correct=Number(l.correct);if(!Number.isFinite(minutes)||minutes<0||minutes>1440||!Number.isInteger(count)||count<0||count>5000||!Number.isInteger(correct)||correct<0||correct>count)throw Error('学习题数或用时无效');out.logs.push({id:l.id,examId:l.examId,date:l.date,subject:str(l.subject,60),minutes,count,correct,note:str(l.note)});}
    const errids=new Set();for(const e of raw.errors){requiredId(e.id);if(errids.has(e.id)||!ids.has(e.examId)||!date(e.next)||!date(e.date))throw Error('错题记录引用或日期无效');errids.add(e.id);out.errors.push({id:e.id,examId:e.examId,date:e.date,subject:str(e.subject,60),title:str(e.title,300),note:str(e.note),round:Number.isInteger(e.round)?Math.max(0,Math.min(3,e.round)):0,next:e.next,mastered:e.mastered===true});}
    return out;
  }
  function review(error,remembered,todayDate=today()){
    error.round=remembered?Math.min(3,error.round+1):0;error.mastered=error.round===3;
    error.next=addDays(todayDate,[1,3,7,7][error.round]);
  }
  function ics(data){
    const escape=v=>String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const utc=v=>new Date(ms(v)).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Zhiguogong//Journey//ZH','CALSCALE:GREGORIAN'];
    let count=0;
    for(const {exam:e,task:t} of tasks(data)){
      if(complete(t)||!trusted(t)||!due(t))continue;count++;
      const start=due(t),end=t.kind==='exam'&&t.end?t.end:'';
      lines.push('BEGIN:VEVENT','UID:'+e.id+'-'+t.id+'@zhiguogong.ccfudan.cc','DTSTAMP:'+stamp,'DTSTART:'+utc(start));
      if(end)lines.push('DTEND:'+utc(end));else lines.push('DURATION:PT15M');
      lines.push('SUMMARY:'+escape(e.title+' · '+t.title+(t.end&&t.kind!=='exam'?'截止':'')),'DESCRIPTION:'+escape(t.note+'\n'+t.source+'\n北京时间；如公告变化请重新导入并检查日历重复事件。'),'LOCATION:'+escape(t.place),'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:考试事项提醒','END:VALARM','BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:考试事项提醒','END:VALARM','END:VEVENT');
    }
    lines.push('END:VCALENDAR','');
    const enc=new TextEncoder();const content=lines.map(line=>{let out='',part='',bytes=0;for(const ch of line){const n=enc.encode(ch).length;if(bytes+n>75){out+=part+'\r\n';part=' ';bytes=1;}part+=ch;bytes+=n;}return out+part;}).join('\r\n');
    return {content,count};
  }
  root.JourneyCore={VERSION,KEY,stages,states,proof,materialNames,uid,blank,url,date,time,ms,today,addDays,fmt,validDates,createExam,fromJob,identity,complete,trusted,due,taskState,tasks,upcoming,progress,conflicts,clean,review,ics};
})(typeof window==='undefined'?globalThis:window);
