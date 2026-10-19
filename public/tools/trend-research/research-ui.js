'use strict';
// Rich explanation is displayed alongside the frozen execution rule checks.
let researchLayers=new Set(['structure','trends','patterns','ma60','ma120','anchors']);
let activeResearchLine='';
let activeStructure='';

// Group identical anchor geometry for display; retain independent scale histories.
function structureGroups(patterns){
 const groups=new Map();
 for(const s of patterns){const key=s.family+'|'+s.anchors.map(a=>a.date+':'+a.field+':'+a.price).join('|');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 return [...groups.values()];
}
function structureChoices(groups,selectedId){return groups.map(g=>{
 const x=g.find(s=>s.id===selectedId)||g[0];
 return button(x.name+' · '+x.state_label+' · 尺度'+g.map(s=>s.radius).join('/')+' · '+x.known_on,'structure-select',x.id,x.id===selectedId?'selected':'');
 }).join('');}
function structurePanel(q){
 const r=q.structures;if(!r)return '';
 const s=r.patterns.find(s=>s.id===activeStructure)||r.patterns.find(s=>s.id===r.primary_id)||r.patterns[0];
 const row=s?q.cross_validation.find(x=>x.id===s.id):null;
 const terminal=new Set(['failed','invalidated','expired']);
 const groups=structureGroups(r.patterns),liveGroups=groups.filter(g=>g.some(x=>!terminal.has(x.state))),pastGroups=groups.filter(g=>g.every(x=>terminal.has(x.state)));
 return `<section class="panel structure-panel"><div class="panel-head"><div><div class="eyebrow">INDEPENDENT STRUCTURE / EVOLUTION</div><h2>独立结构识别与演变</h2><p>结构先独立判断，再与均线和V1交叉核对。两种尺度：左2右2、左5右5；不以形态数量推算胜率。</p></div></div>
 <div class="info ${r.conflict?'warn':''}">${r.conflict?'存在方向相反的候选，保留冲突。':'当前未检出方向相反的活动候选。'} 活动 ${r.active_count} / 历史 ${r.total}；下方最多显示16个。${esc(r.timing)}</div>
 ${r.changes_since_previous?.compared?`<div class="info"><strong>相对上次保存扫描的变化（${esc(r.changes_since_previous.from_date)} → ${esc(r.changes_since_previous.to_date)}）</strong><p>${r.changes_since_previous.new_candidates.length?'新候选：'+r.changes_since_previous.new_candidates.map(x=>esc(x.name)+'（'+esc(x.known_on)+'才可知）').join('、'):'没有新候选。'}</p><p>${r.changes_since_previous.new_events.length?'新状态：'+r.changes_since_previous.new_events.map(x=>esc(x.date)+' '+esc(x.name)+esc(x.label)+'（'+esc(x.first_observed_at)+'首次记录）').join('；'):'没有新增状态事件。'}</p></div>`:`<div class="info">暂无前次扫描可比较。${esc(r.changes_since_previous?.note||'')}</div>`}
 <div class="chart-tools structure-picker">${structureChoices(liveGroups,s?.id)}${!liveGroups.length?'<span class="muted">暂无活动候选</span>':''}</div>
 <details class="historical-structures" ${pastGroups.some(g=>g.some(x=>x.id===activeStructure))?'open':''}><summary>历史失效 / 失败 / 到期结构（${pastGroups.length}组，默认收起）</summary><div class="chart-tools structure-picker">${structureChoices(pastGroups,s?.id)}</div><p class="small muted">相同锚点的两种尺度合并展示；各尺度的确认时间与状态仍独立记录，不代表两份独立证据。</p></details>
 ${s?`<article class="structure-detail"><div class="panel-head"><div><h3>${esc(s.name)} · ${esc(s.interpretation)}</h3><p class="small muted">${esc(s.id)} · 左右${s.radius}根确认 · 最早可知 ${esc(s.known_on)} · 实际首次观察 ${esc(s.first_observed_at||'尚未记录')}</p></div>${pill(s.state_label,'amber')}</div>
 <p class="plain-summary">${esc(structurePlain(s))}</p><div class="chart-tools">${q.lines.filter(l=>l.structure_id===s.id).map(l=>button(l.label+' '+f(l.end_price,3)+' ↗','research-line',l.id,'ghost')).join('')}</div>
 <div class="anchor-list">${s.anchors.map((a,i)=>`<span><b>${i+1}</b>${esc(a.date)} · ${f(a.price,3)} · ${a.field==='high'?'高点':'低点'}<small>${esc(a.confirmed_on)} 才可知</small></span>`).join('')}</div>
 <div class="grid equal"><div><h3>支持这幅画法的事实</h3><p>${s.evidence.map(esc).join('<br>')}</p><p>前趋势：${esc({up:'上涨',down:'下跌',flat:'横盘',unknown:'不足'}[s.pretrend.direction])}，变化 ${f(s.pretrend.change_pct,2)}%。${esc(s.pretrend.note)}</p></div><div><h3>反证与尚未确认</h3><p>${s.counterevidence.map(esc).join('<br>')}</p><p>${esc(s.state==='candidate'?'尚未在全部拐点可知后收盘突破。':s.state==='breakout'?'尚未确认回测守住。':'状态只按下方所列已完成收盘判断。')}</p></div></div>
 <h3>逐日演变记录</h3><ol class="structure-timeline">${s.events.map(ev=>`<li><strong>${esc(ev.date)} · ${esc(ev.label)}</strong><p>收盘 ${f(ev.close,3)} / 当日边界 ${f(ev.boundary,3)}。${esc(ev.reason)}<br><small>历史逐日重建 / 本机首次记录：${esc(ev.first_observed_at||'未保存')}</small></p></li>`).join('')}</ol>
 <h3>选中结构的条件情景</h3><div class="scenario-grid">${(s.scenarios||[]).map(x=>`<article><h3>${esc(x.name)}</h3><p>${esc(x.trigger)}</p><p>${esc(x.action)}</p><p class="small muted">${esc(x.invalidation)}</p></article>`).join('')}</div>
 ${s.target?`<p class="info">算术量度观察位 ${f(s.target.arithmetic,3)}。${esc(s.target.basis)}；不替代持仓止盈或保护价。</p>`:''}
 ${row?`<div class="info"><strong>与均线交叉：${esc(row.relation)}</strong> · ${esc(row.ma)}。${esc(row.execution)}。${esc(row.note)}</div>`:''}</article>`:empty('没有通过筛选的活动结构','补齐数据或等待新拐点；未检出不等于不存在人工可解释形态。')}
 <details><summary>全部展示候选与均线 / 执行检查</summary><div class="table-wrap"><table><thead><tr><th>结构</th><th>状态</th><th>均线</th><th>交叉结果</th><th>执行</th></tr></thead><tbody>${q.cross_validation.map(x=>`<tr><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td>${esc(x.structure)}</td><td>${esc(x.ma)}</td><td>${esc(x.relation)}</td><td>${esc(x.execution)}</td></tr>`).join('')}</tbody></table></div></details>
 <p class="small muted">本次持久扫描 ${esc(r.tracking.observed_at||'未保存')} / 数据代次 ${esc(r.tracking.generation??'—')}。${esc(r.tracking.data_change)}。未覆盖：${r.unsupported.map(esc).join('、')}。</p></section>`;
}

function structurePlain(s){
 const levels=Object.entries(s.boundary_now).map(([k,v])=>({neck:'颈线',upper:'上边界',lower:'下边界'}[k])+f(v,3)).join('；');
 const text={candidate:'轮廓出现，先等收盘走出自身边界；不要把相似画法当成已经完成。',breakout:'收盘已走出边界，但还没确认回测守住，先把它当作方向尝试。',retest:'后面的K线碰到了旧边界附近；要等再后一天的收盘，才能讨论是否守住。',held:'回测之后又有收盘留在突破一侧，边界暂时守住；还需观察后续。',continuation:'回测守住以后价格继续推进，支持原方向，但目标不保证达到。',failed:'突破以后又收回旧边界另一侧，原解释失败，突破历史仍然保留。',invalidated:'突破之前原轮廓极值已被收盘破坏，旧候选不再有效。',expired:'观察期已过或上下边界相交，不再把旧线顺延为有效信号。'};
 return levels+'。'+text[s.state]+' 结构研究不改变V1入场权限或已有持仓止损。';
}

function articlePanel(q){
 const a=q.article;if(!a)return '';
 return `<section class="panel article-panel"><div class="panel-head"><div><div class="eyebrow">EVIDENCE-FIRST MARKET NOTE</div><h2>${esc(a.title)}</h2><p>把计算事实、结构状态、均线交叉和条件行动写在同一条叙事里；这不是预测文章或自动交易指令。</p></div>${pill('可复核正文')}</div><p class="article-lead">${esc(a.lead)}</p>${a.sections.map((s,i)=>`<article class="article-section"><div class="reading-index">0${i+1}</div><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.items?.length?`<div class="article-paths">${s.items.map(x=>`<article><h4>${esc(x.title)}</h4><p><b>触发：</b>${esc(x.trigger)}</p><p><b>观察：</b>${esc(x.action)}</p><p class="small muted"><b>失效：</b>${esc(x.invalidation)}</p></article>`).join('')}</div>`:''}</div></article>`).join('')}<p class="small muted">${esc(a.provenance||'计算事实、规则状态和条件推演分开。')}</p></section>`;
}

function selectStructure(id){
 activeStructure=id;const lines=detail.research.lines.filter(l=>l.structure_id===id);
 if(lines.length){activeResearchLine=lines[0].id;const oldest=Math.min(...lines[0].anchors.map(a=>a.index));chartRange=detail.chart.length-oldest<=60?60:detail.chart.length-oldest<=120?120:250;}
 $('#analysis-content').innerHTML=detailHTML(detail);drawChart();
}

function researchDetailHTML(d){
 const a=d.analysis,r=a.result,q=d.research;
 if(!q)return empty('详解尚未加载','请刷新页面，确认工作台服务已更新。');
 const layerButton=(key,label)=>button(label,'research-layer',key,researchLayers.has(key)?'selected':'');
 const chosen=(q.structures?.patterns||[]).some(s=>s.id===activeStructure)?activeStructure:q.structures?.primary_id;
 const visibleLines=q.lines.filter(l=>!l.structure_id||l.structure_id===chosen);
 const lineCards=visibleLines.map(l=>`<article class="line-card ${activeResearchLine===l.id?'line-active':''}"><div class="panel-head"><h3><i style="background:${l.color}"></i>${esc(l.label)}</h3>${button('在图中定位','research-line',l.id,'ghost')}</div><p class="line-value">${f(l.end_price,3)} <small>${esc(a.currency)} · 快照末端参考价</small></p><p class="explain">${esc(l.status)}。${esc(l.basis)}</p><div class="anchor-list">${l.anchors.map((p,i)=>`<span><b>${i+1}</b> ${esc(p.date)} · ${f(p.price,3)} <small>${p.field==='high'?'最高价':'最低价'} / ${esc(p.confirmed_on)}可知</small></span>`).join('')}</div><p class="small muted">接触 ${l.touches} 次${l.body_cuts==null?'':' · 两锚点之间实体穿越 '+l.body_cuts+' 根'} · 画线所需信息最早齐于 ${esc(l.known_on)}</p></article>`).join('');
 const holding=q.holdings.map(t=>`<div class="info ${t.exit_required?'warn':''}">${esc(t.id)} · 剩余 ${f(t.quantity,0)} 股 · 初始保护价 ${f(t.initial_stop,3)} · 下一日保护价 ${f(t.next_stop,3)}。${esc(t.reason)}${t.asof?'（检查截至 '+esc(t.asof)+'）':''}</div>`).join('');
 return `<section class="panel research-lead"><div class="panel-head"><div><div class="eyebrow">TREND / METHOD READING</div><div class="card-title"><h2>${esc(a.name)}</h2>${pill(a.id)}${pill(q.regime||'待数据',q.regime==='下跌趋势'?'amber':'')}</div></div><div class="split-actions"><a class="download-link" href="reports/${encodeURIComponent(a.id)}.md" download>下载完整解读 ↗</a></div></div><div class="price-title"><b>${f(a.close)}</b><span class="muted small">${esc(a.currency)} · 截至 ${esc(a.date||'无数据')}</span></div><h2 class="research-headline">${esc(q.headline)}</h2><p class="plain-summary">${esc(q.summary)}</p><div class="research-meta">${pill(q.version)}${pill('交易规则仍为 V1.0')}${q.skill.mapping_verified?'':pill('技能映射待重新验收','amber')}<span>${esc(q.skill.mode)}</span></div></section>`+
 `<section class="panel"><div class="panel-head"><div><h2>把线画出来，把依据留下来</h2><p>悬停K线或锚点查看数值；点击下方线卡可定位锚点。回看画线不等于历史交易信号。</p></div><div class="chart-tools">${[60,120,250].map(n=>button(n+'日','range',n,n===chartRange?'selected':'')).join('')}</div></div><div class="chart-tools research-toggles">${[['structure','20日边界'],['trends','趋势线'],['patterns','形态颈线'],['horizontal','历史水平带'],['anchors','锚点'],['ma20','MA20'],['ma60','MA60'],['ma120','MA120'],['ma250','MA250']].map(([key,label])=>layerButton(key,label)).join('')}</div><div id="chart-mount"></div><p class="small muted">虚线为当前快照的候选线；趋势线以交易日为横轴。N/D是V1固定窗口参数，趋势线和水平价带是另行解释，二者不能混作同一条颈线。</p></section>`+
 `<div class="grid equal"><section class="panel action-card"><div class="eyebrow">IF YOU HAVE NO POSITION</div><h2>空仓：现在做什么</h2><p class="plain-summary">${esc(q.next_action)}</p>${r?.status==='RESEARCH_SIGNAL'?button('进入研究计划核对 →','plan',a.id,'primary'):pill('等待完整信号','amber')}</section><section class="panel action-card"><div class="eyebrow">IF YOU ALREADY HOLD IT</div><h2>持仓：先管哪件事</h2><p class="plain-summary">${esc(q.position_action||'尚未提供持仓资料，不能给具体卖出股数。')}</p>${holding}${button('核对持仓与退出任务 →','go-review','','ghost')}</section></div>`+
 `<section class="panel"><div class="panel-head"><h2>用大白话读当前局面</h2>${pill(q.confidence||'样本不足')}</div><div class="reading-grid">${q.paragraphs.map((p,i)=>`<article><span class="reading-index">0${i+1}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div>${q.weekly?`<div class="info">周线背景：${esc(q.weekly.summary)}</div>`:''}</section>`+
 `<section class="panel"><div class="panel-head"><div><h2>逐条复核划线</h2><p>只展示基础线与当前选中结构；历史结构在下方展开后选择，避免把旧颈线当作当前信号。</p></div>${pill(visibleLines.length+' 条当前展示线')}</div><div class="line-grid">${lineCards||empty('没有足够画线依据','补齐行情后再画，不勉强拼出形态。')}</div></section>`+
 articlePanel(q)+structurePanel(q)+`<section class="panel"><h2>近期缺口</h2>${q.gaps.length?q.gaps.map(g=>`<div class="row"><div><strong>${esc(g.date)} · ${esc(g.direction)}缺口 ${f(g.lower,3)}—${f(g.upper,3)}</strong><p>${esc(g.state)}${g.filled_on?' / '+esc(g.filled_on):''}</p></div></div>`).join(''):empty('近20根未列出完整跳空缺口','完整缺口按相邻两日最高/最低价判断，普通开盘跳价不都算。')}<p class="small muted">当前不复权数据尚未排除除权原因；不自动把缺口命名为突破、连续或竭尽，也不承诺回补。</p></section>`+
 `<section class="panel"><h2>均线方向、排列与抵扣</h2><p class="explain">MA60/120用于V1执行；MA20/250只作背景。乖离是价格偏离均价的程度，不能单凭数值判断“跌够了”或“涨到头了”。</p><div class="table-wrap"><table><thead><tr><th>均线</th><th>当前值</th><th>近5根方向</th><th>收盘乖离</th><th>下一根待移出收盘</th><th>当前价不变时下一根MA变化</th></tr></thead><tbody>${q.ma.map(m=>`<tr><td>MA${m.period}</td><td>${f(m.value,3)}</td><td>${esc(m.direction)} / ${f(m.five_bar_change,3)}</td><td>${f(m.bias_pct,2)}%</td><td>${f(m.next_outgoing_close,3)}</td><td>${f(m.unchanged_close_next_change,4)}</td></tr>`).join('')}</tbody></table></div><p class="small muted">精确已发生斜率比较今天收盘与n根前旧收盘；下一根抵扣比较未来收盘与即将移出的旧收盘，两个索引不同。</p></section>`+
 `<section class="panel"><h2>已确认、待确认与反证</h2><div class="table-wrap"><table class="evidence-table"><thead><tr><th>维度</th><th>已发生 / 可复算</th><th>仍待核对</th><th>反证或边界</th></tr></thead><tbody>${q.evidence.map(v=>`<tr><td>${esc(v.dimension)}</td><td>${esc(v.confirmed)}</td><td>${esc(v.pending)}</td><td>${esc(v.opposing)}</td></tr>`).join('')}</tbody></table></div></section>`+
 `<section class="panel"><div class="panel-head"><h2>主结构接下来三种走法，各怎么处理</h2>${pill('条件式计划，不是预测')}</div><div class="scenario-grid">${q.scenarios.map(s=>`<article><h3>${esc(s.name)}</h3><label>看到什么才触发</label><p>${esc(s.trigger)}</p><label>可以怎样应对</label><p>${esc(s.action)}</p><label>失效与执行边界</label><p>${esc(s.invalidation)}</p></article>`).join('')}</div></section>`+
 `<section class="panel"><details><summary>V1固定20日边界的单独执行情景</summary><div class="scenario-grid">${(q.execution_scenarios||[]).map(s=>`<article><h3>${esc(s.name)}</h3><p>${esc(s.trigger)}</p><p>${esc(s.action)}</p><p class="small muted">${esc(s.invalidation)}</p></article>`).join('')}</div></details></section>`+
 `<section class="panel"><div class="panel-head"><h2>V1入场检查与理论参数</h2>${score(a)}</div><div class="grid equal"><div>${r?Object.entries(S.checks).map(([k,v])=>`<div class="check-row"><b class="check-icon ${r.checks[k]?'':'fail'}">${r.checks[k]?'✓':'○'}</b>${esc(v)}<span>${k==='benchmark'&&!a.benchmark_aligned?'缺少同日基准':r.checks[k]?'通过':'未通过'}</span></div>`).join(''):empty('至少需要125根已收盘日线',`目前 ${a.count} 根。`)}</div><div>${r?`<dl class="data-grid"><div><dt>上沿 N / 下沿 D</dt><dd>${f(r.N)} / ${f(r.D)}</dd></div><div><dt>ATR14 / 量比</dt><dd>${f(r.atr14_simple,3)} / ${f(r.volume_ratio,2)}</dd></div><div><dt>理论保护价 S0</dt><dd>${f(r.initial_stop,3)}</dd></div><div><dt>理论最高接受价</dt><dd>${f(r.entry_max_theoretical,3)}</dd></div></dl><p class="explain">${esc(q.execution?.note||'仅完整信号才形成研究计划。')}</p>`:''}<h3>仍须核对</h3><ul class="explain">${a.missing.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div></section>`+
 `<section class="panel"><h2>方法、来源与这份报告的边界</h2><p class="explain">${esc(q.disclosure)}<br>${esc(q.skill.boundary)}</p><ul class="explain">${q.limits.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><details><summary>查看最新版技能、行情来源与指纹</summary><p class="explain">技能 ${esc(q.skill.name)} / ${esc(q.skill.edition)} / ${q.skill.loaded?'已读取':'文件缺失'}<br>行情来源 ${esc(a.meta.source||'待填写')}<br>采集 ${esc(a.meta.fetched_at||'—')} · 复权 ${esc(a.meta.adjustment||'—')} · 已收盘 ${a.meta.completed_confirmed?'已确认':'待确认'}<br>公司行动 ${a.meta.adjustment_verified?'用户确认已核对':'待核对'} · 基准 ${esc(a.benchmark)}</p><p class="code">技能 SHA256 ${esc(q.skill.sha256)}<br>行情 SHA256 ${esc(q.data_sha256)}</p><a href="docs/skill/SKILL.md" target="_blank">查看技能 ↗</a> · <a href="docs/research-method.md" target="_blank">划线与解读的实现口径 ↗</a> · <a href="docs/source-map.md" target="_blank">算法口径说明 ↗</a></details></section>`;
}

function drawResearchChart(){
 const mount=$('#chart-mount');if(!mount||!detail)return;
 const full=detail.chart,data=full.slice(-chartRange),q=detail.research;
 if(data.length<2){mount.innerHTML=empty('暂无可绘制行情','补齐已收盘日线后显示价格、均线与划线。');return;}
 const offset=full.length-data.length,w=1120,h=440,left=18,right=185,top=18,bottom=320,plotRight=w-right;
 const maColors={ma20:'#7fa1a0',ma60:'#bb9c51',ma120:'#7d92b5',ma250:'#ae8cab'};
 const mas=Object.keys(maColors).filter(k=>researchLayers.has(k));
 const vals=data.flatMap(b=>[b.low,b.high,...mas.map(k=>b[k])]).filter(v=>v!=null);
 let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo||1)*.08;lo-=pad;hi+=pad;
 const step=(plotRight-left)/data.length,x=i=>left+(i+.5)*step,y=v=>top+(hi-v)/(hi-lo)*(bottom-top);
 const bucket=l=>l.kind==='v1'?'structure':l.kind==='trend'?'trends':l.kind==='pattern'?'patterns':'horizontal';
 const chosen=(q?.structures?.patterns||[]).some(s=>s.id===activeStructure)?activeStructure:q?.structures?.primary_id;
 const lines=(q?.lines||[]).filter(l=>(researchLayers.has(bucket(l))&&(!l.structure_id||l.structure_id===chosen))||l.id===activeResearchLine);
 const cw=Math.max(1,Math.min(8,step*.6));
 let svg=`<svg class="chart research-chart" role="img" aria-label="均线、支撑压力、候选趋势线与可核验锚点" viewBox="0 0 ${w} ${h}"><defs><clipPath id="price-clip"><rect x="${left}" y="${top}" width="${plotRight-left}" height="${bottom-top}"/></clipPath></defs>`;
 for(let j=0;j<5;j++){const v=lo+(hi-lo)*j/4,yy=y(v);svg+=`<line x1="${left}" y1="${yy}" x2="${plotRight}" y2="${yy}" stroke="#edf1ed"/><text x="${w-58}" y="${yy+4}" fill="#8f9b95" font-size="11">${f(v)}</text>`;}
 const vmax=Math.max(...data.map(b=>b.volume),1);
 data.forEach((b,i)=>{const col=b.close>=b.open?'#b4766a':'#4f9984',xx=x(i);svg+=`<g><title>${esc(b.date)} 开${f(b.open,3)} 高${f(b.high,3)} 低${f(b.low,3)} 收${f(b.close,3)}</title><line x1="${xx}" y1="${y(b.high)}" x2="${xx}" y2="${y(b.low)}" stroke="${col}"/><rect x="${xx-cw/2}" y="${Math.min(y(b.open),y(b.close))}" width="${cw}" height="${Math.max(1,Math.abs(y(b.close)-y(b.open)))}" fill="${col}"/><rect x="${xx-cw/2}" y="${390-b.volume/vmax*42}" width="${cw}" height="${b.volume/vmax*42}" fill="${col}" opacity=".35"/></g>`;});
 for(const key of mas){const points=data.map((b,i)=>b[key]==null?null:`${x(i)},${y(b[key])}`).filter(Boolean).join(' ');svg+=`<polyline points="${points}" fill="none" stroke="${maColors[key]}" stroke-width="1.5"/>`;}
 const labels=[];
 for(const l of lines){
  const si=full.findIndex(b=>b.date===l.start_date),ei=full.findIndex(b=>b.date===l.end_date);
  if(si<0||ei<offset)continue;
  const j=Math.max(si,offset),value=l.start_price+(l.end_price-l.start_price)*(j-si)/Math.max(1,ei-si);
  const startX=x(j-offset),endX=x(ei-offset),color=l.color,active=l.id===activeResearchLine;
  const description=`${l.label}：${f(l.end_price,3)}。${l.status}。锚点 ${l.anchors.map(a=>a.date+' '+f(a.price,3)).join(' / ')}`;
  svg+=`<g clip-path="url(#price-clip)"><title>${esc(description)}</title><line x1="${startX}" y1="${y(value)}" x2="${endX}" y2="${y(l.end_price)}" stroke="${color}" stroke-width="${active?2.7:1.5}" stroke-dasharray="${l.kind==='trend'?'8 4':'4 4'}" opacity="${active?1:.85}"/>`;
  if(l.tolerance){svg+=`<rect x="${startX}" y="${y(l.end_price+l.tolerance)}" width="${endX-startX}" height="${y(l.end_price-l.tolerance)-y(l.end_price+l.tolerance)}" fill="${color}" opacity=".06"/>`;}
  if(researchLayers.has('anchors')||active)l.anchors.forEach((a,i)=>{const ai=full.findIndex(b=>b.date===a.date)-offset;if(ai<0||ai>=data.length)return;svg+=`<g><title>${esc(l.label)} 锚点${i+1}：${esc(a.date)} ${f(a.price,3)}，${esc(a.confirmed_on)}可知</title><circle cx="${x(ai)}" cy="${y(a.price)}" r="${active?4.8:3.3}" stroke="${color}" fill="white" stroke-width="1.5"/>${active?`<text x="${x(ai)+5}" y="${y(a.price)-6}" fill="${color}" font-size="10">${i+1}</text>`:''}</g>`;});
  svg+='</g>';
  if(l.end_price>=lo&&l.end_price<=hi)labels.push({l,yy:y(l.end_price)});
 }
 labels.sort((a,b)=>a.yy-b.yy);let prior=-100;
 for(const item of labels){let yy=Math.max(top+8,item.yy,prior+16);prior=yy;const l=item.l;svg+=`<path d="M${plotRight-1} ${y(l.end_price)} L${plotRight+6} ${yy-3}" stroke="${l.color}" fill="none"/><text x="${plotRight+9}" y="${yy}" fill="${l.color}" font-size="10">${esc(l.label)} ${f(l.end_price,2)}</text>`;}
 if(detail.analysis.result?.status==='RESEARCH_SIGNAL'){const xx=x(data.length-1),yy=y(data.at(-1).close);svg+=`<g><title>当前价格条件齐备；仍须核对资料，下一交易日才考虑执行。</title><circle cx="${xx}" cy="${yy}" r="7" stroke="#347960" fill="none" stroke-width="2"/></g>`;}
 [0,Math.floor(data.length/3),Math.floor(2*data.length/3),data.length-1].forEach(i=>svg+=`<text x="${x(i)}" y="420" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}" fill="#9aa39d" font-size="10">${esc(data[i].date)}</text>`);
 svg+='<text x="18" y="342" fill="#9aa39d" font-size="10">成交量（供应商原始单位）</text></svg>';
 mount.innerHTML=svg;
}

function toggleResearchLayer(key){if(researchLayers.has(key))researchLayers.delete(key);else researchLayers.add(key);$('#analysis-content').innerHTML=detailHTML(detail);drawChart();}
function focusResearchLine(id){const line=detail.research.lines.find(l=>l.id===id);if(!line)return;if(line.structure_id)activeStructure=line.structure_id;activeResearchLine=id;const oldest=Math.min(...line.anchors.map(a=>a.index));const needed=detail.chart.length-oldest;chartRange=needed<=60?60:needed<=120?120:250;$('#analysis-content').innerHTML=detailHTML(detail);drawChart();$('#chart-mount').scrollIntoView?.({behavior:'smooth',block:'center'});}
