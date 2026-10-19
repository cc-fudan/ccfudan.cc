(function(root){
'use strict';
function validate(qs){
 if(!Array.isArray(qs)||!qs.length)throw Error('题库需要非空数组');const ids=new Set();
 return qs.map(q=>{if(!q||typeof q.id!=='string'||!q.id||ids.has(q.id))throw Error('ID缺失或重复');ids.add(q.id);
 if(typeof q.stem!=='string'||!q.stem||!Array.isArray(q.options)||q.options.length<2||q.options.some(x=>typeof x!=='string'))throw Error('题干或选项无效');
 if(!['single','multiple'].includes(q.type)||!Array.isArray(q.answer)||!q.answer.length||q.answer.some(x=>!Number.isInteger(x)||x<0||x>=q.options.length)||new Set(q.answer).size!==q.answer.length||q.type==='single'&&q.answer.length!==1)throw Error('题型或答案无效');
 if(!q.explanation||typeof q.explanation!=='string'||!q.source||!['demo','original','verified','recalled'].includes(q.status))throw Error('缺少解析、来源或来源状态');
 if(q.status==='verified'&&(!q.year||!q.sourceUrl))throw Error('核验真题需要年份及出处链接');return {...q,exam:String(q.exam||'未分类')};});}
function grade(q,a){return a.length===q.answer.length&&[...a].sort().join(',')===[...q.answer].sort().join(',');}
function fresh(q){return {version:1,questions:validate(q),attempts:[],reviews:{}};}
function record(s,q,a,confidence,seconds,now=Date.now()){if(!a.length)throw Error('先选答案');if(a.some(x=>!Number.isInteger(x)||x<0||x>=q.options.length)||new Set(a).size!==a.length||!['high','medium','low'].includes(confidence)||!Number.isFinite(seconds))throw Error('作答参数不正确');const r={qid:q.id,selected:[...a],correct:grade(q,a),confidence,seconds:Math.round(Math.max(0,seconds)),time:now};s.attempts.push(r);if(!r.correct||confidence==='low')s.reviews[q.id]={...(s.reviews[q.id]||{}),resolved:false,due:now};return r;}
function review(s,id,thinking,reason,action,now=Date.now()){if(!thinking.trim()||!reason||!action.trim())throw Error('填写当时想法、错因和下次动作');s.reviews[id]={...s.reviews[id],thinking,reason,action,due:now+86400000,resolved:false};}
function submitSet(s,qs,drafts,now=Date.now()){
 if(!qs.length)throw Error('本组没有题目');
 const missing=qs.map((q,i)=>!drafts[q.id]?.selected?.length?i+1:null).filter(Boolean);
 if(missing.length)throw Error('还有未作答题目：'+missing.join('、'));
 // Stage the entire group before changing history: invalid input never partly submits.
 const staged={attempts:[],reviews:JSON.parse(JSON.stringify(s.reviews))};
 const results=qs.map(q=>{const d=drafts[q.id];return record(staged,q,d.selected,d.confidence,d.seconds,now);});
 s.attempts.push(...staged.attempts);s.reviews=staged.reviews;
 // Newly wrong / uncertain questions are available now, and scheduled tomorrow.
 for(const r of results)if(!r.correct||r.confidence==='low')s.reviews[r.qid].due=now+86400000;
 return results;
}
function validatePractice(s,p){
 if(!p||!Array.isArray(p.ids)||!p.ids.length||new Set(p.ids).size!==p.ids.length||!Number.isInteger(p.pos)||p.pos<0||p.pos>=p.ids.length||!p.drafts||typeof p.drafts!=='object')throw Error('答题进度无效');
 for(const id of p.ids){const q=s.questions.find(q=>q.id===id),d=p.drafts[id];if(!q||!d||!Array.isArray(d.selected)||d.selected.some(x=>!Number.isInteger(x)||x<0||x>=q.options.length)||new Set(d.selected).size!==d.selected.length||q.type==='single'&&d.selected.length>1||!['high','medium','low'].includes(d.confidence)||!Number.isFinite(d.seconds)||d.seconds<0)throw Error('答题进度无效');}
 return p;
}
function restore(s){if(!s||s.version!==1||!Array.isArray(s.attempts)||!s.reviews||typeof s.reviews!=='object'||Array.isArray(s.reviews))throw Error('备份无效');s.questions=validate(s.questions);const ids=new Set(s.questions.map(q=>q.id));for(const a of s.attempts){const q=s.questions.find(q=>q.id===a.qid);if(!ids.has(a.qid)||!Array.isArray(a.selected)||!a.selected.length||a.selected.some(x=>!Number.isInteger(x)||x<0||x>=q.options.length)||new Set(a.selected).size!==a.selected.length||typeof a.correct!=='boolean'||a.correct!==grade(q,a.selected)||!Number.isFinite(a.time)||!Number.isFinite(a.seconds)||a.seconds<0||!['high','medium','low'].includes(a.confidence))throw Error('历史记录无效');}for(const [id,r]of Object.entries(s.reviews))if(!ids.has(id)||!r||!Number.isFinite(r.due))throw Error('复盘记录无效');return s;}
const api={validate,grade,fresh,record,review,restore,submitSet,validatePractice};root.ExamCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
