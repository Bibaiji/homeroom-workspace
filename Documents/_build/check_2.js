
/* ================= 工作台 ================= */
const Dashboard={
  _attDraft:{},
  render(){
    const now=new Date();
    const h=now.getHours();
    const greet=h<6?'夜深了':h<9?'早上好':h<12?'上午好':h<14?'中午好':h<18?'下午好':'晚上好';
    document.getElementById('dashGreeting').textContent=greet+'，老师';
    const wd=['日','一','二','三','四','五','六'][now.getDay()];
    document.getElementById('dashDate').textContent=(now.getMonth()+1)+'月'+now.getDate()+'日 · 星期'+wd;
    const adj=Store.get('scheduleAdjust');
    const chip=document.getElementById('adjChip');
    if(adj&&adj.date===Utils.todayStr()){
      chip.style.display='';chip.textContent='调休：今天按'+Schedule.DAY_NAMES[adj.day]+'的课表';
    }else chip.style.display='none';
    this.renderMyCourse();
    this.renderTodayTasks();
    this.renderAttendance();
    this.renderDiscipline();
    this.renderHomework();
    this.renderPatrol();
    this.renderMeetings();
    this.renderComms();
    this.renderGrowth();
    this.renderActivities();
  },

  /* ===== 我的今日课程（按学科聚合所有班级） ===== */
  allSubjects(){
    const set=[];
    (Schedule.getClasses()||[]).forEach(cn=>{
      (Store.get('schedule_'+cn)||[]).forEach(e=>{if(e.subject&&!set.includes(e.subject))set.push(e.subject)});
    });
    return set;
  },
  setMySubject(v){
    Store.set('mySubject',v);
    this.renderMyCourse();
    const s1=document.getElementById('mySubjectSel');if(s1)s1.value=v;
    const s2=document.getElementById('mySubjectDrawer');if(s2)s2.value=v;
  },
  renderMyCourse(){
    const sel=document.getElementById('mySubjectSel');
    const drawerSel=document.getElementById('mySubjectDrawer');
    const subjects=this.allSubjects();
    const current=Store.get('mySubject','全部');
    const opts='<option value="全部">全部学科</option>'+subjects.map(s=>`<option value="${Utils.esc(s)}">${Utils.esc(s)}</option>`).join('');
    if(sel){sel.innerHTML=opts;sel.value=subjects.includes(current)?current:'全部'}
    if(drawerSel){drawerSel.innerHTML=opts;drawerSel.value=subjects.includes(current)?current:'全部'}
    const subj=subjects.includes(current)?current:'全部';
    const cont=document.getElementById('todayCourseBody');
    const classes=Schedule.getClasses()||[];
    const periods=(Schedule.periods()||[]).filter(p=>p.type==='class');
    if(!classes.length||!periods.length){
      cont.innerHTML='<div class="empty-state">还没有班级课表，去「课程表」页创建吧</div>';return;
    }
    const effDay=Schedule.effectiveDay();
    const items=[];
    classes.forEach(cn=>{
      (Store.get('schedule_'+cn)||[]).forEach(e=>{
        if(e.day!==effDay)return;
        if(subj!=='全部'&&e.subject!==subj)return;
        const pi=periods.findIndex(p=>p.id===e.periodId);
        if(pi<0)return;
        items.push({cn,e,pi,period:periods[pi]});
      });
    });
    items.sort((a,b)=>a.pi-b.pi);
    if(!items.length){
      cont.innerHTML=`<div class="empty-state">${subj==='全部'?'今天没有课，好好休息 🍃':'今天没有'+Utils.esc(subj)+'课'}</div>`;return;
    }
    const nowMin=new Date().getHours()*60+new Date().getMinutes();
    let html='';
    items.forEach(it=>{
      const t=(it.period.time||'').split('-');
      let state='';
      if(t.length===2){
        const st=t[0].trim().split(':'),en=t[1].trim().split(':');
        const s=+st[0]*60+ +st[1],e2=+en[0]*60+ +en[1];
        if(nowMin>=s&&nowMin<=e2)state='current';
        else if(nowMin>e2)state='past';
      }
      const c=Schedule.subjectColors(it.e.subject);
      html+=`<div class="mycourse-item ${state}">
        <div class="mycourse-time"><div class="t">${Utils.esc(it.period.time||'')}</div><div class="p">${Utils.esc(it.period.name)}</div></div>
        <div class="mycourse-main">
          <div class="cls">${Utils.esc(it.e.subject)} · ${Utils.esc(it.cn)}</div>
          <div class="meta">${it.e.room?Utils.esc(it.e.room):''}${it.e.teacher&&it.e.room?' · ':''}${it.e.teacher?Utils.esc(it.e.teacher)+' 老师':''}</div>
        </div>
        ${state==='current'?'<span class="pill pill-green"><span class="dot-pulse" style="width:6px;height:6px"></span>进行中</span>':''}
      </div>`;
    });
    cont.innerHTML=html;
  },

  /* ===== 今天要处理 ===== */
  renderTodayTasks(){
    const todos=Store.get('todos',[])||[];
    const today=Utils.todayStr();
    const undone=todos.filter(t=>!t.done).sort((a,b)=>{
      const order={urgent:0,important:1,normal:2};
      if((t.due||'') !== (b.due||''))return (t.due||'')<(b.due||'')?-1:1;
      return (order[t.priority]||2)-(order[b.priority]||2);
    });
    const cont=document.getElementById('todayTasks');
    if(!undone.length){cont.innerHTML='<div class="text-sm text-faint" style="padding:8px 0">全部处理完毕，很棒 👌</div>';return}
    let html='';
    undone.forEach(t=>{
      const overdue=t.due&&t.due<today;
      const pmap={urgent:['pill-red','紧急'],important:['pill-amber','重要'],normal:['pill-gray','普通']};
      const p=pmap[t.priority]||pmap.normal;
      html+=`<div class="task-item ${overdue?'task-overdue':''}">
        <button class="task-check" onclick="Todos.toggle('${t.id}')"></button>
        <div class="task-text">${Utils.esc(t.text)} ${overdue?'<span class="pill pill-red" style="font-size:10px;padding:1px 7px">逾期</span>':''}</div>
        <span class="pill ${p[0]}" style="font-size:10px;padding:1px 7px">${p[1]}</span>
        ${t.due?`<span class="text-xs text-faint">${t.due.slice(5)}</span>`:''}
      </div>`;
    });
    cont.innerHTML=html;
  },

  /* ===== 早读考勤 ===== */
  renderAttendance(){
    const att=Store.get('attendance',{records:[]});
    const valid=att.date===Utils.todayStr()?att.records:[];
    const cnt=st=>valid.filter(r=>r.status===st).length;
    document.getElementById('attBody').innerHTML=`
      <div class="mod-stats">
        <div class="mod-stat"><div class="v text-primary">${cnt('present')}</div><div class="l">出勤</div></div>
        <div class="mod-stat"><div class="v text-danger">${cnt('late')}</div><div class="l">迟到</div></div>
        <div class="mod-stat"><div class="v" style="color:var(--amber)">${cnt('leave')}</div><div class="l">请假</div></div>
        <div class="mod-stat"><div class="v text-muted">${cnt('absent')}</div><div class="l">缺勤</div></div>
      </div>
      <div class="text-xs text-faint">${valid.length?'':'今天还没记录，点击「标记考勤」开始'}</div>`;
  },
  attendanceModal(){
    const students=Store.get('students',[])||[];
    if(!students.length){Utils.toast('请先在花名册添加学生','error');return}
    const att=Store.get('attendance',{records:[]});
    this._attDraft={};
    if(att.date===Utils.todayStr()){
      att.records.forEach(r=>this._attDraft[r.sid]=r.status);
    }else{
      students.forEach(s=>this._attDraft[s.id]='present');
    }
    this._renderAttList();
    Utils.modal('今日早读考勤','<div id="attList"></div>',
      `<button class="btn btn-ghost" onclick="Dashboard._attAllPresent()">全部出勤</button>
       <button class="btn btn-primary" onclick="Dashboard.saveAttendance()">保存</button>`);
  },
  _renderAttList(filter){
    const students=Store.get('students',[])||[];
    const f=(filter||'').toLowerCase();
    let html='<input class="input mb-3" placeholder="搜索学生…" oninput="Dashboard._renderAttList(this.value)">';
    students.filter(s=>!f||s.name.toLowerCase().includes(f)||s.id.includes(f)).forEach(s=>{
      const st=this._attDraft[s.id]||'present';
      const btns=[['present','出勤','pill-green'],['late','迟到','pill-red'],['leave','请假','pill-amber'],['absent','缺勤','pill-gray']]
        .map(([v,l,c])=>`<button class="pill ${st===v?c:'pill-gray'}" style="cursor:pointer;opacity:${st===v?1:.45}" onclick="Dashboard._attSet('${s.id}','${v}')">${l}</button>`).join('');
      html+=`<div class="flex items-center justify-between mb-2" style="gap:10px;padding:6px 4px">
        <span class="text-sm font-semi">${Utils.esc(s.name)}</span><span>${btns}</span></div>`;
    });
    const el=document.getElementById('attList');
    if(el){el.innerHTML=html;const inp=el.querySelector('input');if(filter!==undefined&&inp){inp.value=filter}}
  },
  _attSet(sid,v){this._attDraft[sid]=v;this._renderAttList()},
  _attAllPresent(){Object.keys(this._attDraft).forEach(k=>this._attDraft[k]='present');this._renderAttList()},
  saveAttendance(){
    const students=Store.get('students',[])||[];
    Store.set('attendance',{date:Utils.todayStr(),records:students.map(s=>({sid:s.id,name:s.name,status:this._attDraft[s.id]||'present'}))});
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderAttendance();Utils.toast('考勤已保存','success');
  },

  /* ===== 课堂纪律 ===== */
  renderDiscipline(){
    const d=Store.get('discipline',{});
    let html='';
    if(d.praises&&d.praises.length){
      html+='<div class="text-xs font-semi mb-2" style="color:var(--primary)">本周表扬</div><div class="flex" style="flex-wrap:wrap;gap:6px">'+
        d.praises.map(n=>`<span class="pill pill-green">${Utils.esc(n)}</span>`).join('')+'</div>';
    }
    if(d.focus&&d.focus.length){
      html+='<div class="text-xs font-semi mt-3 mb-2" style="color:var(--amber)">重点关注</div><div class="flex" style="flex-wrap:wrap;gap:6px">'+
        d.focus.map(n=>`<span class="pill pill-amber">${Utils.esc(n)}</span>`).join('')+'</div>';
    }
    if(d.records&&d.records.length){
      html+=`<div class="mini-list mt-3">`+d.records.slice(0,3).map(r=>
        `<div class="mini-list-item"><span>${Utils.esc(r.name)}：${Utils.esc(r.desc)}</span><span class="when">${Utils.esc(r.date||'')}</span></div>`).join('')+'</div>';
    }
    document.getElementById('discBody').innerHTML=html||'<div class="text-xs text-faint">本周暂无记录</div>';
  },
  disciplineModal(){
    const students=(Store.get('students',[])||[]).map(s=>`<option value="${Utils.esc(s.name)}">`).join('');
    Utils.modal('纪律登记',`
      <div class="flex flex-col gap-3">
        <div><label class="label">类型</label>
          <select class="select" id="dc_type"><option value="praise">表扬</option><option value="focus">重点关注</option><option value="record">违纪记录</option></select></div>
        <div><label class="label">学生</label><input class="input" id="dc_student" list="dcStudentList" placeholder="学生姓名"><datalist id="dcStudentList">${students}</datalist></div>
        <div><label class="label">情况描述</label><textarea class="textarea" id="dc_desc" placeholder="如：主动帮助同学补习功课"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.saveDiscipline()">保存</button>`);
  },
  saveDiscipline(){
    const type=document.getElementById('dc_type').value;
    const name=document.getElementById('dc_student').value.trim();
    const desc=document.getElementById('dc_desc').value.trim();
    if(!name){Utils.toast('请填写学生姓名','error');return}
    const d=Store.get('discipline',{praises:[],focus:[],records:[]});
    d.praises=d.praises||[];d.focus=d.focus||[];d.records=d.records||[];
    if(type==='praise'&&!d.praises.includes(name))d.praises.push(name);
    if(type==='focus'&&!d.focus.includes(name))d.focus.push(name);
    if(type==='record')d.records.unshift({name,desc:desc||'违纪',date:Utils.todayStr()});
    Store.set('discipline',d);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderDiscipline();Utils.toast('已登记','success');
  },

  /* ===== 作业收缴 ===== */
  renderHomework(){
    const hw=Store.get('homework',[])||[];
    const students=Store.get('students',[])||[];
    const total=students.length||1;
    if(!hw.length){document.getElementById('hwBody').innerHTML='<div class="text-xs text-faint">暂无收缴记录</div>';return}
    let html='';
    hw.forEach(h=>{
      const miss=h.notSubmitted||[];
      const pct=Math.round((total-miss.length)/total*100);
      const color=pct>=90?'var(--primary)':pct>=70?'var(--amber)':'var(--danger)';
      html+=`<div class="hw-row">
        <span class="name">${Utils.esc(h.subject)}</span>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${color},var(--blue))"></div></div>
        <span class="pct">${total-miss.length}/${total}</span>
        <button class="btn btn-ghost btn-sm" onclick="Dashboard.remindHomework('${Utils.esc(h.subject)}')">催交</button>
      </div>`;
      if(miss.length)html+=`<div class="flex mb-2" style="flex-wrap:wrap;gap:5px;padding-left:66px">${miss.map(n=>`<span class="pill pill-red" style="font-size:10.5px">${Utils.esc(n)}</span>`).join('')}</div>`;
    });
    document.getElementById('hwBody').innerHTML=html;
  },
  remindHomework(subject){
    const h=(Store.get('homework',[])||[]).find(x=>x.subject===subject);
    if(!h||!(h.notSubmitted||[]).length){Utils.toast('该学科已全部交齐','success');return}
    const txt=`【作业催交通知】${subject}作业还有 ${h.notSubmitted.length} 位同学未交：${h.notSubmitted.join('、')}。请家长督促孩子今天完成并订正，谢谢配合！`;
    Utils.copyText(txt);
  },
  homeworkModal(){
    const subjects=(this.allSubjects().length?this.allSubjects():['语文','数学','英语']).map(s=>`<option value="${Utils.esc(s)}">`).join('');
    Utils.modal('作业收缴登记',`
      <div class="flex flex-col gap-3">
        <div><label class="label">学科</label><input class="input" id="hw_subject" list="hwSubjList" placeholder="学科"><datalist id="hwSubjList">${subjects}</datalist></div>
        <div><label class="label">未交学生（用顿号或逗号分隔）</label><textarea class="textarea" id="hw_miss" placeholder="如：张三、李四"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.saveHomework()">保存</button>`);
  },
  saveHomework(){
    const subject=document.getElementById('hw_subject').value.trim();
    if(!subject){Utils.toast('请填写学科','error');return}
    const miss=document.getElementById('hw_miss').value.trim()
      .split(/[、,，\s]+/).filter(Boolean);
    const hw=Store.get('homework',[])||[];
    const idx=hw.findIndex(h=>h.subject===subject);
    if(idx>=0)hw[idx]={subject,notSubmitted:miss};
    else hw.push({subject,notSubmitted:miss});
    Store.set('homework',hw);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderHomework();Utils.toast('收缴情况已登记','success');
  },

  /* ===== 课间巡查 ===== */
  renderPatrol(){
    const p=Store.get('patrol',[])||[];
    if(!p.length){document.getElementById('patrolBody').innerHTML='<div class="text-xs text-faint">今日暂无巡查记录</div>';return}
    document.getElementById('patrolBody').innerHTML='<div class="mini-list">'+p.slice(0,4).map(r=>
      `<div class="mini-list-item"><span>${Utils.esc(r.time)} · ${Utils.esc(r.area)} ${r.status==='异常'?'<span class="pill pill-red" style="font-size:10px;padding:0 7px">异常</span>':'<span class="pill pill-green" style="font-size:10px;padding:0 7px">正常</span>'}${r.note?'<br><span class="text-xs text-faint">'+Utils.esc(r.note)+'</span>':''}</span></div>`).join('')+'</div>';
  },
  patrolModal(){
    const now=new Date();
    const t=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
    Utils.modal('课间巡查登记',`
      <div class="flex flex-col gap-3">
        <div class="grid grid-2">
          <div><label class="label">时间</label><input class="input" id="pt_time" value="${t}"></div>
          <div><label class="label">区域</label><input class="input" id="pt_area" placeholder="如：教学楼A栋" value="教学楼A栋"></div>
        </div>
        <div><label class="label">情况</label><select class="select" id="pt_status"><option>正常</option><option>异常</option></select></div>
        <div><label class="label">备注</label><textarea class="textarea" id="pt_note" placeholder="异常情况说明"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.savePatrol()">保存</button>`);
  },
  savePatrol(){
    const p=Store.get('patrol',[])||[];
    p.unshift({
      time:document.getElementById('pt_time').value.trim(),
      area:document.getElementById('pt_area').value.trim(),
      status:document.getElementById('pt_status').value,
      note:document.getElementById('pt_note').value.trim()
    });
    Store.set('patrol',p);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderPatrol();Utils.toast('巡查已登记','success');
  },

  /* ===== 主题班会 ===== */
  renderMeetings(){
    const m=Store.get('classMeetings',[])||[];
    if(!m.length){document.getElementById('meetBody').innerHTML='<div class="text-xs text-faint">暂无班会计划</div>';return}
    document.getElementById('meetBody').innerHTML='<div class="mini-list">'+m.map(r=>
      `<div class="mini-list-item"><span>${Utils.esc(r.topic)}${r.summary?'<br><span class="text-xs text-faint">'+Utils.esc(r.summary)+'</span>':''}</span>
      <span style="text-align:right"><span class="pill ${r.status==='已开展'?'pill-green':'pill-blue'}" style="font-size:10px;padding:0 7px">${Utils.esc(r.status)}</span><br><span class="when">${Utils.esc(r.date||'')}</span></span></div>`).join('')+'</div>';
  },
  meetingModal(){
    Utils.modal('班会登记',`
      <div class="flex flex-col gap-3">
        <div><label class="label">主题</label><input class="input" id="mt_topic" placeholder="如：感恩教育"></div>
        <div class="grid grid-2">
          <div><label class="label">日期</label><input class="input" type="date" id="mt_date" value="${Utils.todayStr()}"></div>
          <div><label class="label">状态</label><select class="select" id="mt_status"><option>计划中</option><option>已开展</option></select></div>
        </div>
        <div><label class="label">内容摘要</label><textarea class="textarea" id="mt_summary"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.saveMeeting()">保存</button>`);
  },
  saveMeeting(){
    const topic=document.getElementById('mt_topic').value.trim();
    if(!topic){Utils.toast('请填写主题','error');return}
    const m=Store.get('classMeetings',[])||[];
    m.unshift({
      topic,date:document.getElementById('mt_date').value,
      status:document.getElementById('mt_status').value,
      summary:document.getElementById('mt_summary').value.trim()
    });
    Store.set('classMeetings',m);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderMeetings();Utils.toast('班会已登记','success');
  },

  /* ===== 家校沟通 ===== */
  renderComms(){
    const c=Store.get('communications',[])||[];
    if(!c.length){document.getElementById('commBody').innerHTML='<div class="text-xs text-faint">暂无沟通记录</div>';return}
    document.getElementById('commBody').innerHTML='<div class="mini-list">'+c.slice(0,3).map(r=>
      `<div class="mini-list-item"><span><b>${Utils.esc(r.student)}</b>（${Utils.esc(r.parent||'家长')}·${Utils.esc(r.channel)}）<br><span class="text-xs text-faint">${Utils.esc(r.content)}</span></span><span class="when">${Utils.esc(r.date||'')}</span></div>`).join('')+'</div>';
  },
  commModal(){
    const students=Store.get('students',[])||[];
    Utils.modal('家校沟通记录',`
      <div class="flex flex-col gap-3">
        <div class="grid grid-2">
          <div><label class="label">学生</label><input class="input" id="cm_student" list="cmStudentList" oninput="Dashboard.fillParent()"><datalist id="cmStudentList">${students.map(s=>`<option value="${Utils.esc(s.name)}">`).join('')}</datalist></div>
          <div><label class="label">家长</label><input class="input" id="cm_parent" placeholder="自动填充"></div>
        </div>
        <div><label class="label">方式</label><select class="select" id="cm_channel"><option>电话</option><option>微信</option><option>面谈</option><option>家访</option></select></div>
        <div><label class="label">沟通内容</label><textarea class="textarea" id="cm_content"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.saveComm()">保存</button>`);
  },
  fillParent(){
    const name=document.getElementById('cm_student').value.trim();
    const s=(Store.get('students',[])||[]).find(x=>x.name===name);
    document.getElementById('cm_parent').value=s?(s.p1Name||''):'';
  },
  saveComm(){
    const student=document.getElementById('cm_student').value.trim();
    if(!student){Utils.toast('请填写学生','error');return}
    const c=Store.get('communications',[])||[];
    c.unshift({
      student,parent:document.getElementById('cm_parent').value.trim(),
      date:Utils.todayStr(),channel:document.getElementById('cm_channel').value,
      content:document.getElementById('cm_content').value.trim()
    });
    Store.set('communications',c);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderComms();Utils.toast('沟通记录已保存','success');
  },

  /* ===== 学生成长 ===== */
  renderGrowth(){
    const students=Store.get('students',[])||[];
    const tagCount={};
    students.forEach(s=>(s.tags||'').split(/[,，、]/).filter(Boolean).forEach(t=>tagCount[t.trim()]=(tagCount[t.trim()]||0)+1));
    const g=Store.get('growth',[])||[];
    let html='';
    const tagColors={'心理关注':'pill-pink','学科偏科':'pill-amber','特长生':'pill-blue','待关注':'pill-red'};
    if(Object.keys(tagCount).length){
      html+='<div class="flex" style="flex-wrap:wrap;gap:6px">'+Object.entries(tagCount).map(([t,n])=>
        `<span class="pill ${tagColors[t]||'pill-purple'}">${Utils.esc(t)} ${n}</span>`).join('')+'</div>';
    }
    if(g.length){
      html+='<div class="mini-list mt-3">'+g.slice(0,3).map(r=>
        `<div class="mini-list-item"><span><b>${Utils.esc(r.student)}</b>${r.tag?' <span class="pill pill-purple" style="font-size:10px;padding:0 7px">'+Utils.esc(r.tag)+'</span>':''}<br><span class="text-xs text-faint">${Utils.esc(r.content)}</span></span><span class="when">${Utils.esc(r.date||'')}</span></div>`).join('')+'</div>';
    }
    document.getElementById('growthBody').innerHTML=html||'<div class="text-xs text-faint">暂无标签与辅导记录</div>';
  },
  growthModal(){
    const students=Store.get('students',[])||[];
    Utils.modal('辅导记录',`
      <div class="flex flex-col gap-3">
        <div class="grid grid-2">
          <div><label class="label">学生</label><input class="input" id="gr_student" list="grStudentList"><datalist id="grStudentList">${students.map(s=>`<option value="${Utils.esc(s.name)}">`).join('')}</datalist></div>
          <div><label class="label">标签</label><input class="input" id="gr_tag" placeholder="如：心理关注"></div>
        </div>
        <div><label class="label">辅导/观察记录</label><textarea class="textarea" id="gr_content"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.saveGrowth()">保存</button>`);
  },
  saveGrowth(){
    const student=document.getElementById('gr_student').value.trim();
    if(!student){Utils.toast('请填写学生','error');return}
    const g=Store.get('growth',[])||[];
    g.unshift({student,tag:document.getElementById('gr_tag').value.trim(),content:document.getElementById('gr_content').value.trim(),date:Utils.todayStr()});
    Store.set('growth',g);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderGrowth();Utils.toast('记录已保存','success');
  },

  /* ===== 班级活动 ===== */
  renderActivities(){
    const a=Store.get('activities',[])||[];
    if(!a.length){document.getElementById('actBody').innerHTML='<div class="text-xs text-faint">暂无活动记录</div>';return}
    document.getElementById('actBody').innerHTML='<div class="mini-list">'+a.map(r=>
      `<div class="mini-list-item"><span>${Utils.esc(r.title)}${r.note?'<br><span class="text-xs text-faint">'+Utils.esc(r.note)+'</span>':''}</span>
      <span style="text-align:right"><span class="pill ${r.status==='已结束'?'pill-gray':'pill-blue'}" style="font-size:10px;padding:0 7px">${Utils.esc(r.status)}</span><br><span class="when">${Utils.esc(r.date||'')}</span></span></div>`).join('')+'</div>';
  },
  activityModal(){
    Utils.modal('活动登记',`
      <div class="flex flex-col gap-3">
        <div><label class="label">活动名称</label><input class="input" id="ac_title" placeholder="如：秋季运动会"></div>
        <div class="grid grid-2">
          <div><label class="label">日期</label><input class="input" type="date" id="ac_date" value="${Utils.todayStr()}"></div>
          <div><label class="label">状态</label><select class="select" id="ac_status"><option>筹备中</option><option>进行中</option><option>已结束</option></select></div>
        </div>
        <div><label class="label">备注</label><textarea class="textarea" id="ac_note" placeholder="照片留存建议另行存放云盘"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Dashboard.saveActivity()">保存</button>`);
  },
  saveActivity(){
    const title=document.getElementById('ac_title').value.trim();
    if(!title){Utils.toast('请填写活动名称','error');return}
    const a=Store.get('activities',[])||[];
    a.unshift({title,date:document.getElementById('ac_date').value,status:document.getElementById('ac_status').value,note:document.getElementById('ac_note').value.trim()});
    Store.set('activities',a);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderActivities();Utils.toast('活动已登记','success');
  }
};
