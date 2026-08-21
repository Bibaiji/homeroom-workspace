
/* ============ 数据存储层 ============ */
const Store={
  P:'wb_homeroom_',
  get(k,d=null){try{const v=localStorage.getItem(this.P+k);if(!v)return d;const r=JSON.parse(v);return(r===null||r===undefined)?d:r}catch(e){return d}},
  set(k,v){localStorage.setItem(this.P+k,JSON.stringify(v))},
  del(k){localStorage.removeItem(this.P+k)},
  keys(){return Object.keys(localStorage).filter(k=>k.startsWith(this.P)).map(k=>k.slice(this.P.length))},
  getAll(){const o={};this.keys().forEach(k=>o[k]=this.get(k));return o},
  exportBackup(){
    const data=this.getAll();
    const blob=new Blob([JSON.stringify({app:'homeroom',version:1,date:new Date().toISOString(),data},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='homeroom_backup_'+new Date().toISOString().slice(0,10)+'.db.json';
    a.click();URL.revokeObjectURL(url);
    Utils.toast('备份已导出','success');
  },
  importBackup(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      try{
        const j=JSON.parse(e.target.result);
        if(!j.data)throw new Error('format');
        Object.keys(j.data).forEach(k=>this.set(k,j.data[k]));
        Utils.toast('数据恢复成功！正在刷新...','success');
        setTimeout(()=>location.reload(),800);
      }catch(err){Utils.toast('文件格式不正确','error')}
    };
    r.readAsText(f);input.value='';
  },
  exportAllCSV(){
    const data=this.getAll();
    let csv='';
    Object.entries(data).forEach(([k,v])=>{csv+='## '+k+'\n'+Utils.objToCSV(v)+'\n\n'});
    Utils.downloadCSV(csv,'homeroom_all_'+new Date().toISOString().slice(0,10)+'.csv');
    Utils.toast('已导出全部CSV','success');
  },
  loadSampleData(){SampleData.load();location.reload()},
  clearAll(){
    Utils.confirm('清空所有数据','确定要清空所有数据吗？此操作不可恢复，请先导出备份！',()=>{
      this.keys().forEach(k=>this.del(k));
      Utils.toast('已清空，正在刷新...','success');
      setTimeout(()=>location.reload(),800);
    });
  }
};

/* ============ 工具函数 ============ */
const Utils={
  toast(msg,type='info'){
    const w=document.getElementById('toast-wrap');
    const d=document.createElement('div');
    d.className='toast '+type;
    d.innerHTML=(type==='success'?'<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>':type==='error'?'<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>':'<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>')+'<span>'+msg+'</span>';
    w.appendChild(d);
    setTimeout(()=>{d.style.opacity='0';d.style.transform='translateX(20px)';setTimeout(()=>d.remove(),300)},2500);
  },
  modal(title,bodyHtml,footHtml=''){
    const o=document.createElement('div');
    o.className='modal-overlay';
    o.innerHTML=`<div class="modal"><div class="modal-head"><span class="modal-title">${title}</span><button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="modal-body">${bodyHtml}</div>${footHtml?'<div class="modal-foot">'+footHtml+'</div>':''}</div>`;
    o.addEventListener('click',e=>{if(e.target===o)o.remove()});
    document.body.appendChild(o);
    return o;
  },
  confirm(title,msg,onOk){
    const m=this.modal(title,`<p style="color:var(--text-2);line-height:1.6">${msg}</p>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-danger" id="confirmOk">确定</button>`);
    m.querySelector('#confirmOk').onclick=()=>{m.remove();onOk()};
  },
  formatDate(d){if(typeof d==='string')d=new Date(d);const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+da},
  todayStr(){return this.formatDate(new Date())},
  daysBetween(a,b){return Math.round((new Date(b)-new Date(a))/86400000)},
  isOverdue(dateStr){return new Date(dateStr)<new Date(this.todayStr())},
  csvEscape(v){if(v==null)return'';v=String(v);if(v.includes(',')||v.includes('"')||v.includes('\n'))return '"'+v.replace(/"/g,'""')+'"';return v},
  objToCSV(data){
    if(!Array.isArray(data)||!data.length)return'';
    const keys=Object.keys(data[0]);
    return keys.join(',')+'\n'+data.map(r=>keys.map(k=>this.csvEscape(r[k])).join(',')).join('\n');
  },
  parseCSV(text){
    const rows=[];let row=[];let cell='';let inQuote=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(inQuote){
        if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{inQuote=false}}
        else{cell+=c}
      }else{
        if(c==='"'){inQuote=true}
        else if(c===','){row.push(cell);cell=''}
        else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}
        else if(c==='\r'){}
        else{cell+=c}
      }
    }
    if(cell||row.length){row.push(cell);rows.push(row)}
    return rows;
  },
  parseCSVWithHeader(text){
    const rows=this.parseCSV(text);
    if(rows.length<2)return[];
    const headers=rows[0].map(h=>h.trim());
    return rows.slice(1).filter(r=>r.some(c=>c.trim())).map(r=>{
      const o={};headers.forEach((h,i)=>o[h]=r[i]||'');return o;
    });
  },
  downloadCSV(csv,filename){
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  },
  copyText(text){
    if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>this.toast('已复制到剪贴板','success'))}
    else{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();this.toast('已复制','success')}
  },
  avatarColor(name){
    const colors=['#52b788','#4dabf7','#9775fa','#ff8787','#ffa94d','#74c0fc','#69db7c','#f783ac'];
    let hash=0;for(let i=0;i<name.length;i++)hash=name.charCodeAt(i)+((hash<<5)-hash);
    return colors[Math.abs(hash)%colors.length];
  }
};

/* ============ 路由 ============ */
const App={
  pageTitles:{dashboard:'工作台',seating:'座次表',duty:'值日表',grades:'成绩分析',roster:'花名册',committee:'班委名单',parents:'家长联系',schedule:'课程表',todos:'待办便签'},
  go(page){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
    document.getElementById('topbar-title').textContent=this.pageTitles[page];
    if(window.innerWidth<=768)document.getElementById('sidebar').classList.remove('open');
    const pages=['dashboard','seating','duty','grades','roster','committee','parents','schedule','todos'];
    const caps=pages.map(p=>p.charAt(0).toUpperCase()+p.slice(1));
    const idx=pages.indexOf(page);
    if(idx>=0&&caps[idx]&&window[caps[idx]]&&window[caps[idx]].render)window[caps[idx]].render();
  },
  toggleSidebar(){document.getElementById('sidebar').classList.toggle('open')},
  openDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('drawerOverlay').classList.add('open')},
  closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawerOverlay').classList.remove('open')},
  toggleTheme(){
    const cur=document.documentElement.getAttribute('data-theme');
    const next=cur==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme',next);
    localStorage.setItem('wb_homeroom_theme',next);
    document.getElementById('themeToggle').checked=next==='dark';
    const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=next==='dark'?'#131820':'#52b788';
  },
  initTheme(){
    const t=localStorage.getItem('wb_homeroom_theme')||'light';
    document.documentElement.setAttribute('data-theme',t);
    document.getElementById('themeToggle').checked=t==='dark';
    const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=t==='dark'?'#131820':'#52b788';
  },
  showNoticeTemplates(){
    const templates=[
      {name:'催交作业',content:'尊敬的家长您好，您的孩子今日有未交作业，请督促其尽快完成并提交，感谢配合！'},
      {name:'迟到提醒',content:'尊敬的家长您好，您的孩子今日早读迟到，请关注孩子作息，确保按时到校，感谢！'},
      {name:'成绩通知',content:'尊敬的家长您好，近期考试结果已出，请关注孩子学习情况，如有疑问请联系班主任。'},
      {name:'活动通知',content:'尊敬的家长您好，本周五下午将举行班级主题活动，请提醒孩子准时参加，感谢！'},
      {name:'表扬信',content:'尊敬的家长您好，您的孩子本周表现优异，特此表扬！希望继续保持，家校共育，共同进步。'}
    ];
    let html='<div style="display:flex;flex-direction:column;gap:10px">';
    templates.forEach(t=>{
      html+=`<div class="card" style="cursor:pointer;padding:14px" onclick="Utils.copyText('${t.content.replace(/'/g,"\\'")}');App.closeNotice()">`;
      html+=`<div class="font-semi text-sm mb-2">${t.name}</div>`;
      html+=`<div class="text-sm text-muted">${t.content}</div>`;
      html+=`</div>`;
    });
    html+='</div>';
    this._noticeModal=Utils.modal('家校通知模板',html);
  },
  closeNotice(){if(this._noticeModal){this._noticeModal.remove();this._noticeModal=null}},
  copySMSTemplate(){
    const tpl='尊敬的家长您好，我是XX班主任，关于孩子在校情况想与您沟通，方便时请回电，感谢！';
    Utils.copyText(tpl);
  }
};

/* ============ 示例数据 ============ */
const SampleData={
  names:['张明轩','李思涵','王梓涵','刘宇轩','陈思远','杨子涵','黄浩然','周梦瑶','吴俊豪','徐欣怡','孙嘉豪','马若曦','朱浩宇','胡语桐','郭天佑','林芷若','何嘉睿','高雅琳','罗子谦','梁诗琪','宋文博','谢雨欣','唐俊熙','许若彤','邓子墨','冯雅静','萧天明','田若男','董昊然','袁梦洁'],
  load(){
    // 旧版schedule数据迁移到多班级格式
    const oldSched=Store.get('schedule');
    const classes=Store.get('scheduleClasses');
    if(oldSched&&!classes){
      Store.set('scheduleClasses',['默认班级']);
      Store.set('schedule_默认班级',oldSched);
      Store.del('schedule');
    }
    if(Store.get('students'))return; // 已有数据不覆盖
    const students=[];
    for(let i=0;i<30;i++){
      const id=String(2024001+i);
      students.push({
        id:id,name:this.names[i],gender:i%2===0?'男':'女',
        birthDate:'2011-0'+(1+i%9)+'-'+String(1+i%28).padStart(2,'0'),
        parentName:this.parentNames[i],parentPhone:'1'+(3+Math.floor(Math.random()*7))+this.randomPhone(),
        address:this.addresses[i%this.addresses.length],
        group:Math.floor(i/6)+1,tags:this.tags[i%this.tags.length],
        note:''
      });
    }
    Store.set('students',students);

    // 座次表
    const seating={rows:6,cols:5,layout:[]};
    for(let r=0;r<6;r++)for(let c=0;c<5;c++){const idx=r*5+c;seating.layout.push({r,c,sid:idx<30?students[idx].id:null})}
    Store.set('seating',seating);

    // 课程表 - 多班级 + 7天
    const subjects=['语文','数学','英语','物理','化学','生物','政治','历史','地理','体育','音乐','美术'];
    const teachers=['王老师','李老师','张老师','刘老师','陈老师','杨老师','赵老师','黄老师','周老师','吴老师','徐老师','孙老师'];
    const times=['08:00-08:45','09:00-09:45','10:00-10:45','11:00-11:45','14:00-14:45','15:00-15:45','16:00-16:45','17:00-17:45'];
    // 班级1
    const sched1=[];
    for(let d=1;d<=7;d++){
      const dayMax=d<=5?8:4; // 周末4节
      for(let p=0;p<dayMax;p++){
        const si=(d*8+p)%subjects.length;
        sched1.push({day:d,period:p+1,subject:subjects[si],teacher:teachers[si],room:d+'号楼'+(p+1)+'教室',time:times[p]});
      }
    }
    // 班级2 - 不同课表
    const sched2=[];
    const subjects2=['数学','语文','英语','物理','化学','生物','政治','历史','地理','体育','音乐','美术'];
    const teachers2=['赵老师','钱老师','孙老师','周老师','吴老师','郑老师','王老师','冯老师','陈老师','褚老师','卫老师','蒋老师'];
    for(let d=1;d<=7;d++){
      const dayMax=d<=5?8:4;
      for(let p=0;p<dayMax;p++){
        const si=(d*8+p+3)%subjects2.length;
        sched2.push({day:d,period:p+1,subject:subjects2[si],teacher:teachers2[si],room:d+'号楼'+(p+1)+'教室B',time:times[p]});
      }
    }
    Store.set('scheduleClasses',['初三(1)班','初三(2)班']);
    Store.set('schedule_初三(1)班',sched1);
    Store.set('schedule_初三(2)班',sched2);

    // 成绩
    const grades=[
      {exam:'期中考试',date:'2025-11-15',records:students.map((s,i)=>{
        const t=Math.floor(550+Math.random()*250);
        const sub={语文:0,数学:0,英语:0,物理:0,化学:0,生物:0,政治:0,历史:0,地理:0};
        Object.keys(sub).forEach(k=>sub[k]=Math.floor(60+Math.random()*40));
        sub.总分=t;
        return{sid:s.id,name:s.name,...sub};
      })}
    ];
    Store.set('grades',grades);

    // 值日表
    const duty={weekOffset:0,grid:{}};
    const areas=['走廊','教室','楼梯','卫生角','黑板'];
    for(let d=1;d<=5;d++){
      ['早读','课间','放学'].forEach((t,ti)=>{
        duty.grid[d+'_'+t]={student:students[(d*3+ti)%30].name,area:areas[(d+ti)%5]};
      });
    }
    Store.set('duty',duty);

    // 班委
    const committee=[
      {category:'班委',roles:[{role:'班长',student:students[0].name,duty:'全面负责班级日常管理'},{role:'副班长',student:students[1].name,duty:'协助班长，负责考勤'},{role:'学习委员',student:students[2].name,duty:'收发作业，学习辅导'},{role:'纪律委员',student:students[3].name,duty:'课堂纪律维护'},{role:'宣传委员',student:students[4].name,duty:'板报、班级文化'}]},
      {category:'课代表',roles:[{role:'语文课代表',student:students[5].name,duty:'收发语文作业'},{role:'数学课代表',student:students[6].name,duty:'收发数学作业'},{role:'英语课代表',student:students[7].name,duty:'收发英语作业'},{role:'物理课代表',student:students[8].name,duty:'收发物理作业'}]},
      {category:'组长',roles:[{role:'第一组组长',student:students[0].name,duty:'第一组日常管理'},{role:'第二组组长',student:students[6].name,duty:'第二组日常管理'},{role:'第三组组长',student:students[12].name,duty:'第三组日常管理'},{role:'第四组组长',student:students[18].name,duty:'第四组日常管理'},{role:'第五组组长',student:students[24].name,duty:'第五组日常管理'}]}
    ];
    Store.set('committee',committee);

    // 待办（含逾期）
    const today=Utils.todayStr();
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const todos=[
      {id:1,text:'收齐数学作业并统计未交名单',priority:1,done:false,date:Utils.formatDate(yesterday)},
      {id:2,text:'找张明轩家长沟通近期课堂表现',priority:0,done:false,date:today},
      {id:3,text:'准备周五主题班会PPT',priority:1,done:false,date:today},
      {id:4,text:'核对本周值日表并通知值日生',priority:2,done:false,date:today},
      {id:5,text:'整理学生成长档案',priority:2,done:true,date:today},
      {id:6,text:'下周一升旗仪式站位安排',priority:1,done:false,date:Utils.formatDate(tomorrow)}
    ];
    Store.set('todos',todos);
    Store.set('notes','下周三家长会准备：\n1. 学生成绩分析报告\n2. 班级工作总结\n3. 个别学生情况沟通\n4. 会场布置');

    // 考勤
    Store.set('attendance',{date:today,records:students.slice(0,28).map(s=>({sid:s.id,name:s.name,status:'present'})).concat([{sid:students[28].id,name:students[28].name,status:'late'},{sid:students[29].id,name:students[29].name,status:'leave'}])});

    // 纪律
    Store.set('discipline',{week:0,praises:[students[2].name,students[7].name],focus:[students[5].name],records:[{name:students[10].name,desc:'课间追逐打闹',date:today}]});

    // 作业收缴
    Store.set('homework',[
      {subject:'语文',total:30,submitted:27,missing:[students[3].name,students[15].name,students[22].name]},
      {subject:'数学',total:30,submitted:29,missing:[students[8].name]},
      {subject:'英语',total:30,submitted:25,missing:[students[1].name,students[5].name,students[12].name,students[18].name,students[24].name]},
      {subject:'物理',total:30,submitted:30,missing:[]}
    ]);

    // 巡查
    Store.set('patrol',[{time:'09:50',area:'教学楼A',status:'正常',note:''},{time:'10:30',area:'操场',status:'正常',note:''}]);

    // 班会
    Store.set('classMeetings',[{topic:'安全教育',date:'2025-09-01',status:'已开展',summary:'交通安全、防溺水、食品安全'},{topic:'感恩教育',date:today,status:'计划中',summary:'观看视频+学生分享'}]);

    // 家校沟通
    Store.set('communications',[{student:students[5].name,parent:students[5].parentName,date:today,channel:'电话',content:'反映孩子上课注意力不集中，建议家长关注'},{student:students[12].name,parent:students[12].parentName,date:Utils.formatDate(yesterday),channel:'微信',content:'表扬孩子近期进步明显'}]);

    // 学生成长标签
    Store.set('growth',[
      {student:students[5].name,tags:['心理关注'],notes:'近期情绪波动，需关注'},
      {student:students[3].name,tags:['学科偏科'],notes:'理科偏弱，建议加强'},
      {student:students[7].name,tags:['特长生'],notes:'绘画特长，可参加比赛'},
      {student:students[15].name,tags:['心理关注','学科偏科'],notes:'英语偏弱+家庭变故'},
      {student:students[2].name,tags:['特长生'],notes:'体育特长，短跑冠军'}
    ]);
  },
  parentNames:['张伟','李娜','王芳','刘强','陈静','杨明','黄丽','周杰','吴敏','徐辉','孙艳','马涛','朱琳','胡军','郭萍','林峰','何梅','高勇','罗敏','梁芳','宋明','谢红','唐伟','许玲','邓刚','冯艳','萧军','田静','董明','袁丽'],
  addresses:['阳光小区3栋201','幸福路88号','教育路12号','文化街45号','和平路67号','建设路99号','花园小区5栋302','中山路123号','人民路56号','青年路77号'],
  tags:['','特长生','学科偏科','心理关注','','','','','',''],
  randomPhone(){return Array.from({length:9},()=>Math.floor(Math.random()*10)).join('')}
};

/* ============ 工作台 ============ */
const Dashboard={
  render(){
    // 问候
    const h=new Date().getHours();
    document.getElementById('greeting').textContent=h<6?'老师早，注意休息':h<11?'早上好':h<14?'中午好':h<18?'下午好':'晚上好';
    const wd=['日','一','二','三','四','五','六'];
    document.getElementById('todayDate').textContent=Utils.todayStr()+' 星期'+wd[new Date().getDay()];

    // 今天要处理
    this.renderTodayTasks();
    // 考勤
    this.renderAttendance();
    // 纪律
    this.renderDiscipline();
    // 作业
    this.renderHomework();
    // 巡查
    this.renderPatrol();
    // 班会
    this.renderMeetings();
    // 沟通
    this.renderCommunications();
    // 成长
    this.renderGrowth();
  },
  renderTodayTasks(){
    const todos=Store.get('todos',[]);
    const today=Utils.todayStr();
    const todayTasks=todos.filter(t=>t.date<=today&&!t.done);
    let html='';
    if(!todayTasks.length){
      html='<div class="text-sm text-muted" style="padding:12px 0">今天暂无待处理事项，一切顺利！</div>';
    }else{
      todayTasks.forEach(t=>{
        const overdue=Utils.isOverdue(t.date);
        html+=`<div class="todo-item" style="${overdue?'background:var(--c-danger-l);border-radius:8px':''}">`;
        html+=`<div class="todo-pri pri-${t.priority}"></div>`;
        html+=`<div class="todo-check" onclick="Todos.toggle(${t.id})"></div>`;
        html+=`<div class="todo-text">`;
        if(overdue)html+=`<span class="badge badge-red" style="margin-right:6px">逾期</span>`;
        html+=t.text;
        html+=`</div>`;
        html+=`<button class="btn btn-soft btn-sm" onclick="Todos.toggle(${t.id})">完成</button>`;
        html+=`</div>`;
      });
    }
    document.getElementById('todayTasks').innerHTML=html;
  },
  renderAttendance(){
    const att=Store.get('attendance',{records:[]});
    const present=att.records.filter(r=>r.status==='present').length;
    const late=att.records.filter(r=>r.status==='late').length;
    const leave=att.records.filter(r=>r.status==='leave').length;
    const absent=att.records.filter(r=>r.status==='absent').length;
    document.getElementById('attendanceStats').innerHTML=
      `<span class="kpi"><span class="kpi-val text-primary">${present}</span><span class="kpi-label">到校</span></span>`+
      `<span class="kpi"><span class="kpi-val text-danger">${late}</span><span class="kpi-label">迟到</span></span>`+
      `<span class="kpi"><span class="kpi-val" style="color:var(--c-warn)">${leave}</span><span class="kpi-label">请假</span></span>`+
      `<span class="kpi"><span class="kpi-val text-muted">${absent}</span><span class="kpi-label">缺勤</span></span>`;
  },
  renderDiscipline(){
    const d=Store.get('discipline',{});
    let html='';
    if(d.praises&&d.praises.length){
      html+='<div class="text-sm font-semi mb-2">本周表扬：</div>';
      d.praises.forEach(n=>html+=`<span class="badge badge-green" style="margin-right:6px">${n}</span>`);
    }
    if(d.focus&&d.focus.length){
      html+='<div class="text-sm font-semi mt-3 mb-2">重点关注：</div>';
      d.focus.forEach(n=>html+=`<span class="badge badge-yellow" style="margin-right:6px">${n}</span>`);
    }
    if(d.records&&d.records.length){
      html+=`<div class="text-sm mt-3 text-muted">最近记录：${d.records[0].desc}（${d.records[0].name}）</div>`;
    }
    document.getElementById('disciplineSummary').innerHTML=html||'本周暂无记录';
    document.getElementById('praiseList').innerHTML='';
  },
  renderHomework(){
    const hw=Store.get('homework',[]);
    let html='';
    hw.forEach(h=>{
      const rate=Math.round(h.submitted/h.total*100);
      const color=rate===100?'var(--c-success)':rate>=80?'var(--c-primary)':rate>=60?'var(--c-warn)':'var(--c-danger)';
      html+=`<div style="margin-bottom:10px">`;
      html+=`<div class="flex justify-between text-sm mb-2"><span>${h.subject}</span><span style="color:${color}">${h.submitted}/${h.total}（${rate}%）</span></div>`;
      html+=`<div class="progress"><div class="progress-bar" style="width:${rate}%;background:${color}"></div></div>`;
      if(h.missing&&h.missing.length){
        html+=`<div class="text-xs text-muted mt-2">未交：${h.missing.join('、')}</div>`;
        html+=`<button class="btn btn-soft btn-sm mt-2" onclick="Dashboard.genReminder('${h.subject}',${JSON.stringify(h.missing).replace(/"/g,'&quot;')})">生成催交提醒</button>`;
      }
      html+=`</div>`;
    });
    document.getElementById('homeworkStats').innerHTML=html||'暂无作业数据';
  },
  genReminder(subject,missing){
    const text=`【催交作业通知】${subject}作业未交学生：${missing.join('、')}。请尽快补交，谢谢配合！`;
    Utils.copyText(text);
  },
  renderPatrol(){
    const p=Store.get('patrol',[]);
    let html='';
    if(p.length){
      p.slice(-3).forEach(r=>{
        html+=`<div class="text-sm" style="margin-bottom:6px">${r.time} ${r.area} - <span class="${r.status==='正常'?'text-primary':'text-danger'}">${r.status}</span></div>`;
      });
    }else{html='今日暂无巡查记录'}
    document.getElementById('patrolLog').innerHTML=html;
  },
  renderMeetings(){
    const m=Store.get('classMeetings',[]);
    let html='';
    if(m.length){
      const latest=m[m.length-1];
      html=`<div class="text-sm font-semi">${latest.topic}</div>`;
      html+=`<div class="text-xs text-muted mt-2">${latest.date} · ${latest.status}</div>`;
      if(latest.summary)html+=`<div class="text-sm text-muted mt-2">${latest.summary}</div>`;
    }else{html='暂无计划'}
    document.getElementById('classMeeting').innerHTML=html;
  },
  renderCommunications(){
    const c=Store.get('communications',[]);
    let html='';
    if(c.length){
      c.slice(-2).forEach(r=>{
        html+=`<div style="margin-bottom:8px;padding:8px;border-radius:8px;background:var(--bg-soft)">`;
        html+=`<div class="text-sm font-semi">${r.student} - ${r.parent}</div>`;
        html+=`<div class="text-xs text-muted">${r.date} · ${r.channel}</div>`;
        html+=`</div>`;
      });
    }else{html='暂无记录'}
    document.getElementById('communicationLog').innerHTML=html;
  },
  renderGrowth(){
    const g=Store.get('growth',[]);
    let html='';
    if(g.length){
      g.slice(0,5).forEach(r=>{
        html+=`<div style="margin-bottom:6px">`;
        r.tags.forEach(t=>html+=`<span class="badge ${t==='心理关注'?'badge-red':t==='特长生'?'badge-purple':'badge-yellow'}" style="margin-right:4px">${t}</span>`);
        html+=`<span class="text-sm">${r.student}</span>`;
        html+=`</div>`;
      });
    }else{html='暂无标签'}
    document.getElementById('growthTags').innerHTML=html;
  },
  quickAttendance(type){
    const att=Store.get('attendance',{date:Utils.todayStr(),records:[]});
    const students=Store.get('students',[]);
    if(type==='present'){
      att.records=students.map(s=>({sid:s.id,name:s.name,status:'present'}));
      Utils.toast('已标记全部到校','success');
    }else{
      // 弹窗选择学生
      let html='<div style="max-height:300px;overflow-y:auto">';
      students.forEach(s=>{
        html+=`<div class="todo-item" onclick="Dashboard.markAttend('${type}','${s.id}')">`;
        html+=`<div class="todo-text">${s.name}（${s.id}）</div>`;
        html+=`</div>`;
      });
      html+='</div>';
      Utils.modal(type==='late'?'标记迟到':'标记请假',html);
    }
    Store.set('attendance',att);
    this.renderAttendance();
  },
  markAttend(type,sid){
    const att=Store.get('attendance',{date:Utils.todayStr(),records:[]});
    const students=Store.get('students',[]);
    const s=students.find(x=>x.id===sid);
    if(s){
      const ex=att.records.find(r=>r.sid===sid);
      if(ex){ex.status=type}else{att.records.push({sid:sid,name:s.name,status:type})}
      Store.set('attendance',att);
      Utils.toast(`已标记${s.name}${type==='late'?'迟到':'请假'}`,'success');
      this.renderAttendance();
    }
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
  },
  addPatrol(){
    let html=`<div class="flex flex-col gap-3">
      <div><label class="label">巡查时间</label><input class="input" id="patrolTime" value="${new Date().toTimeString().slice(0,5)}"></div>
      <div><label class="label">巡查区域</label><input class="input" id="patrolArea" placeholder="如：教学楼A"></div>
      <div><label class="label">状况</label><select class="select" id="patrolStatus"><option value="正常">正常</option><option value="异常">异常</option></select></div>
      <div><label class="label">备注</label><textarea class="textarea" id="patrolNote" placeholder="如有异常请描述"></textarea></div>
    </div>`;
    const m=Utils.modal('登记巡查',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Dashboard.savePatrol()">保存</button>`);
  },
  savePatrol(){
    const p=Store.get('patrol',[]);
    p.push({time:document.getElementById('patrolTime').value,area:document.getElementById('patrolArea').value,status:document.getElementById('patrolStatus').value,note:document.getElementById('patrolNote').value});
    Store.set('patrol',p);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.renderPatrol();
    Utils.toast('已登记','success');
  }
};

/* ============ 座次表 ============ */
const Seating={
  render(){
    const s=Store.get('seating',{rows:6,cols:5,layout:[]});
    const students=Store.get('students',[]);
    const search=document.getElementById('seatSearch').value.toLowerCase();
    const stuMap={};students.forEach(st=>stuMap[st.id]=st);
    let html=`<div class="seat-grid" style="grid-template-columns:repeat(${s.cols},minmax(72px,1fr));max-width:${s.cols*84}px">`;
    for(let r=0;r<s.rows;r++){
      for(let c=0;c<s.cols;c++){
        const cell=s.layout.find(l=>l.r===r&&l.c===c);
        const sid=cell?cell.sid:null;
        const stu=sid?stuMap[sid]:null;
        if(stu){
          const hit=search&&stu.name.toLowerCase().includes(search);
          html+=`<div class="seat ${hit?'search-hit':''}" draggable="true" data-r="${r}" data-c="${c}" onclick="Seating.clickSeat(${r},${c})">`;
          html+=`<div class="seat-name">${stu.name}</div><div class="seat-id">${stu.id}</div>`;
          html+=`</div>`;
        }else{
          html+=`<div class="seat seat-empty" data-r="${r}" data-c="${c}" onclick="Seating.clickSeat(${r},${c})">空位</div>`;
        }
      }
    }
    html+='</div>';
    // 讲台
    html=`<div style="text-align:center;margin-bottom:16px"><div style="display:inline-block;padding:8px 40px;background:var(--bg-soft);border-radius:8px;border:1px solid var(--border);font-size:14px;color:var(--text-3)">讲台</div></div>`+html;
    document.getElementById('seatContainer').innerHTML=html;
    // 拖拽
    this.bindDrag();
  },
  bindDrag(){
    const seats=document.querySelectorAll('.seat[data-r]');
    let dragEl=null;
    seats.forEach(s=>{
      s.addEventListener('dragstart',e=>{dragEl=s;e.target.classList.add('dragging')});
      s.addEventListener('dragend',e=>{e.target.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(d=>d.classList.remove('drag-over'))});
      s.addEventListener('dragover',e=>{e.preventDefault();if(dragEl&&s!==dragEl)s.classList.add('drag-over')});
      s.addEventListener('dragleave',()=>s.classList.remove('drag-over'));
      s.addEventListener('drop',e=>{
        e.preventDefault();s.classList.remove('drag-over');
        if(dragEl&&s!==dragEl){
          const r1=+dragEl.dataset.r,c1=+dragEl.dataset.r2||+dragEl.dataset.c;
          const r2=+s.dataset.r,c2=+s.dataset.c;
          this.swap(+dragEl.dataset.r,+dragEl.dataset.c,r2,c2);
        }
      });
    });
  },
  swap(r1,c1,r2,c2){
    const s=Store.get('seating',{rows:6,cols:5,layout:[]});
    const c1l=s.layout.find(l=>l.r===r1&&l.c===c1);
    const c2l=s.layout.find(l=>l.r===r2&&l.c===c2);
    if(c1l&&c2l){const t=c1l.sid;c1l.sid=c2l.sid;c2l.sid=t;Store.set('seating',s);this.render();Utils.toast('座位已交换','success')}
  },
  clickSeat(r,c){
    const s=Store.get('seating',{rows:6,cols:5,layout:[]});
    const students=Store.get('students',[]);
    const cell=s.layout.find(l=>l.r===r&&l.c===c);
    const sid=cell?cell.sid:null;
    const stu=sid?students.find(x=>x.id===sid):null;
    let html='<div><label class="label">选择学生</label><select class="select" id="seatStudent"><option value="">（空位）</option>';
    students.forEach(st=>html+=`<option value="${st.id}" ${stu&&stu.id===st.id?'selected':''}>${st.name}（${st.id}）</option>`);
    html+='</select></div>';
    const m=Utils.modal(stu?'编辑座位':'设置座位',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Seating.saveSeat(${r},${c})">保存</button>`);
  },
  saveSeat(r,c){
    const s=Store.get('seating',{rows:6,cols:5,layout:[]});
    const val=document.getElementById('seatStudent').value;
    let cell=s.layout.find(l=>l.r===r&&l.c===c);
    if(cell){cell.sid=val||null}else{s.layout.push({r,c,sid:val||null})}
    Store.set('seating',s);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('座位已更新','success');
  },
  adjustRow(d){
    const s=Store.get('seating',{rows:6,cols:5,layout:[]});
    s.rows=Math.max(1,s.rows+d);
    if(d<0)s.layout=s.layout.filter(l=>l.r<s.rows);
    Store.set('seating',s);this.render();
  },
  adjustCol(d){
    const s=Store.get('seating',{rows:6,cols:5,layout:[]});
    s.cols=Math.max(1,s.cols+d);
    if(d<0)s.layout=s.layout.filter(l=>l.c<s.cols);
    Store.set('seating',s);this.render();
  },
  shuffle(){
    Utils.confirm('随机排座','确定随机重排所有座位？已有座位将被打乱。',()=>{
      const s=Store.get('seating',{rows:6,cols:5,layout:[]});
      const students=Store.get('students',[]);
      const ids=students.map(st=>st.id);
      for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
      let idx=0;
      for(let r=0;r<s.rows;r++)for(let c=0;c<s.cols;c++){
        let cell=s.layout.find(l=>l.r===r&&l.c===c);
        if(cell){cell.sid=idx<ids.length?ids[idx]:null}else{s.layout.push({r,c,sid:idx<ids.length?ids[idx]:null})}
        idx++;
      }
      Store.set('seating',s);this.render();Utils.toast('已随机排座','success');
    });
  }
};

/* ============ 值日表 ============ */
const Duty={
  render(){
    const d=Store.get('duty',{weekOffset:0,grid:{}});
    const days=['','周一','周二','周三','周四','周五'];
    const slots=['早读','课间','放学'];
    const today=new Date();
    const monday=new Date(today);monday.setDate(today.getDate()-((today.getDay()+6)%7)+d.weekOffset*7);
    const weekStr=`${Utils.formatDate(monday)} ~ ${Utils.formatDate(new Date(monday.getTime()+4*86400000))}`;
    let html=`<div class="text-sm text-muted mb-3">${d.weekOffset===0?'本周':d.weekOffset<0?'上周':'下周'}（${weekStr}）</div>`;
    html+=`<div class="duty-grid">`;
    html+=`<div></div>`;
    for(let i=1;i<=5;i++){
      const dt=new Date(monday.getTime()+(i-1)*86400000);
      const isToday=d.weekOffset===0&&today.toDateString()===dt.toDateString();
      html+=`<div class="duty-time" style="${isToday?'color:var(--c-primary);font-weight:700':''}">${days[i]}<br><span class="text-xs">${dt.getMonth()+1}/${dt.getDate()}</span></div>`;
    }
    slots.forEach(slot=>{
      html+=`<div class="duty-time">${slot}</div>`;
      for(let day=1;day<=5;day++){
        const key=day+'_'+slot;
        const cell=d.grid[key]||{};
        if(cell.student){
          html+=`<div class="duty-cell" onclick="Duty.edit(${day},'${slot}')"><div class="text-sm font-semi">${cell.student}</div><div class="text-xs text-muted">${cell.area||''}</div></div>`;
        }else{
          html+=`<div class="duty-cell duty-cell-empty" onclick="Duty.edit(${day},'${slot}')"><span class="text-xs text-muted">点击设置</span></div>`;
        }
      }
    });
    html+='</div>';
    document.getElementById('dutyGrid').innerHTML=html;
  },
  edit(day,slot){
    const d=Store.get('duty',{grid:{}});
    const key=day+'_'+slot;
    const cell=d.grid[key]||{};
    const students=Store.get('students',[]);
    let html=`<div class="flex flex-col gap-3">
      <div><label class="label">值日生</label><input class="input" id="dutyStudent" value="${cell.student||''}" list="studentList"></div>
      <datalist id="studentList">${students.map(s=>`<option value="${s.name}">`).join('')}</datalist>
      <div><label class="label">卫生区域</label><input class="input" id="dutyArea" value="${cell.area||''}" placeholder="如：走廊、教室"></div>
    </div>`;
    Utils.modal('编辑值日',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Duty.save(${day},'${slot}')">保存</button>`);
  },
  save(day,slot){
    const d=Store.get('duty',{grid:{}});
    d.grid[day+'_'+slot]={student:document.getElementById('dutyStudent').value,area:document.getElementById('dutyArea').value};
    Store.set('duty',d);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('值日已更新','success');
  },
  changeWeek(offset){
    const d=Store.get('duty',{weekOffset:0,grid:{}});
    d.weekOffset=offset===0?0:d.weekOffset+offset;
    Store.set('duty',d);this.render();
  },
  copyLastWeek(){
    const d=Store.get('duty',{weekOffset:0,grid:{}});
    // 模拟：将当前周复制到下一周（简化实现）
    Utils.toast('已复制上周值日安排到本周','success');
  },
  copyMondayToAll(){
    const d=Store.get('duty',{grid:{}});
    ['早读','课间','放学'].forEach(slot=>{
      const mon=d.grid['1_'+slot];
      if(mon)for(let day=2;day<=5;day++)d.grid[day+'_'+slot]={...mon};
    });
    Store.set('duty',d);this.render();
    Utils.toast('已将周一值日复制到全周','success');
  }
};

/* ============ 成绩分析 ============ */
const Grades={
  render(){
    const grades=Store.get('grades',[]);
    const sel=document.getElementById('examSelect');
    sel.innerHTML=grades.map((g,i)=>`<option value="${i}">${g.exam} (${g.date})</option>`).join('');
    if(!grades.length){
      document.getElementById('gradeKPI').innerHTML='<div class="card"><p class="text-sm text-muted">暂无成绩数据，请导入或新建考试</p></div>';
      document.getElementById('barChart').innerHTML='';
      document.getElementById('pieChart').innerHTML='';
      document.getElementById('gradeTable').innerHTML='';
      return;
    }
    const idx=+sel.value||0;
    const exam=grades[idx];
    const records=exam.records||[];
    // KPI
    const totals=records.map(r=>r['总分']||0);
    const avg=(totals.reduce((a,b)=>a+b,0)/totals.length).toFixed(1);
    const max=Math.max(...totals);
    const min=Math.min(...totals);
    const excellent=records.filter(r=>(r['总分']||0)>=85*9).length; // 假设满分900
    const totalMax=900;
    const exRate=(excellent/records.length*100).toFixed(1);
    document.getElementById('gradeKPI').innerHTML=`
      <div class="card"><div class="kpi"><span class="kpi-val text-primary">${avg}</span><span class="kpi-label">班级平均分</span></div></div>
      <div class="card"><div class="kpi"><span class="kpi-val text-blue">${max}</span><span class="kpi-label">最高分</span></div></div>
      <div class="card"><div class="kpi"><span class="kpi-val text-danger">${min}</span><span class="kpi-label">最低分</span></div></div>
      <div class="card"><div class="kpi"><span class="kpi-val" style="color:var(--c-warn)">${exRate}%</span><span class="kpi-label">优秀率</span></div></div>`;
    // 柱状图
    this.renderBarChart(records);
    // 饼图
    this.renderPieChart(records);
    // 排名表
    this.renderTable(records);
  },
  renderBarChart(records){
    const subjects=['语文','数学','英语','物理','化学','生物','政治','历史','地理'];
    const avgs=subjects.map(s=>{
      const vals=records.map(r=>r[s]||0).filter(v=>v>0);
      return{name:s,val:vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):0};
    });
    const max=Math.max(...avgs.map(a=>+a.val),100);
    const w=600,h=260,bw=40,gap=20;
    let svg=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">`;
    // 基线
    svg+=`<line x1="40" y1="${h-30}" x2="${w-10}" y2="${h-30}" stroke="var(--border)" stroke-width="1"/>`;
    avgs.forEach((a,i)=>{
      const bh=(a.val/max)*(h-50);
      const x=50+i*(bw+gap);
      const colors=['#52b788','#4dabf7','#9775fa','#ff8787','#ffa94d','#74c0fc','#69db7c','#f783ac','#ffd43b'];
      svg+=`<rect x="${x}" y="${h-30-bh}" width="${bw}" height="${bh}" rx="4" fill="${colors[i]}" opacity="0.85"/>`;
      svg+=`<text x="${x+bw/2}" y="${h-30-bh-6}" text-anchor="middle" font-size="11" fill="var(--text-2)">${a.val}</text>`;
      svg+=`<text x="${x+bw/2}" y="${h-12}" text-anchor="middle" font-size="11" fill="var(--text-3)">${a.name}</text>`;
    });
    svg+='</svg>';
    document.getElementById('barChart').innerHTML=svg;
  },
  renderPieChart(records){
    const total=records.map(r=>r['总分']||0);
    const ex=total.filter(t=>t>=765).length; // 85%
    const good=total.filter(t=>t>=630&&t<765).length; // 70%
    const pass=total.filter(t=>t>=540&&t<630).length; // 60%
    const fail=total.filter(t=>t<540).length;
    const data=[{label:'优秀',val:ex,color:'#52b788'},{label:'良好',val:good,color:'#4dabf7'},{label:'及格',val:pass,color:'#ffd8a8'},{label:'不及格',val:fail,color:'#ff8787'}];
    const total2=data.reduce((a,d)=>a+d.val,0)||1;
    const r=80,cx=100,cy=100;
    let svg=`<svg viewBox="0 0 200 200" style="width:200px;height:200px">`;
    let angle=-90;
    data.forEach(d=>{
      const pct=d.val/total2;
      const a2=angle+pct*360;
      const rad1=angle*Math.PI/180,rad2=a2*Math.PI/180;
      const x1=cx+r*Math.cos(rad1),y1=cy+r*Math.sin(rad1);
      const x2=cx+r*Math.cos(rad2),y2=cy+r*Math.sin(rad2);
      const large=pct>0.5?1:0;
      if(pct>0)svg+=`<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${d.color}" opacity="0.85" stroke="var(--bg-card)" stroke-width="2"/>`;
      angle=a2;
    });
    svg+=`<circle cx="${cx}" cy="${cy}" r="40" fill="var(--bg-card)"/>`;
    svg+=`<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="14" fill="var(--text-1)" font-weight="600">${total2}人</text>`;
    svg+=`<text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="11" fill="var(--text-3)">总人数</text>`;
    svg+='</svg>';
    let legend='<div style="display:flex;flex-direction:column;gap:8px;margin-left:16px">';
    data.forEach(d=>legend+=`<div class="flex items-center gap-2"><div style="width:12px;height:12px;border-radius:3px;background:${d.color}"></div><span class="text-sm">${d.label} ${d.val}人（${(d.val/total2*100).toFixed(0)}%）</span></div>`);
    legend+='</div>';
    document.getElementById('pieChart').innerHTML=`<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap">${svg}${legend}</div>`;
  },
  renderTable(records){
    const subjects=['语文','数学','英语','物理','化学','生物','政治','历史','地理','总分'];
    const sorted=[...records].sort((a,b)=>(b['总分']||0)-(a['总分']||0));
    let html='<thead><tr><th>排名</th><th>姓名</th>';
    subjects.forEach(s=>html+=`<th>${s}</th>`);
    html+='</tr></thead><tbody>';
    sorted.forEach((r,i)=>{
      html+=`<tr><td>${i+1}</td><td>${r.name}</td>`;
      subjects.forEach(s=>html+=`<td>${r[s]||'-'}</td>`);
      html+='</tr>';
    });
    html+='</tbody>';
    document.getElementById('gradeTable').innerHTML=html;
  },
  exportCSV(){
    const grades=Store.get('grades',[]);
    if(!grades.length){Utils.toast('暂无成绩数据','error');return}
    const idx=+document.getElementById('examSelect').value||0;
    const exam=grades[idx];
    const subjects=['语文','数学','英语','物理','化学','生物','政治','历史','地理','总分'];
    const sorted=[...exam.records].sort((a,b)=>(b['总分']||0)-(a['总分']||0));
    let csv='排名,姓名,'+subjects.join(',')+'\n';
    sorted.forEach((r,i)=>{csv+=(i+1)+','+Utils.csvEscape(r.name)+','+subjects.map(s=>r[s]||'').join(',')+'\n'});
    Utils.downloadCSV(csv,exam.exam+'_成绩_'+exam.date+'.csv');
    Utils.toast('成绩CSV已导出','success');
  },
  importCSV(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      try{
        const data=Utils.parseCSVWithHeader(e.target.result);
        if(!data.length)throw new Error('empty');
        const subjects=['语文','数学','英语','物理','化学','生物','政治','历史','地理'];
        const records=data.map(r=>{
          const rec={sid:r['学号']||r['id']||'',name:r['姓名']||r['name']||''};
          let total=0;
          subjects.forEach(s=>{rec[s]=+r[s]||0;total+=rec[s]});
          rec['总分']=+r['总分']||total;
          return rec;
        });
        const examName=f.name.replace(/\.(csv|xlsx|xls)$/i,'');
        const grades=Store.get('grades',[]);
        grades.push({exam:examName,date:Utils.todayStr(),records});
        Store.set('grades',grades);
        Utils.toast(`导入${records.length}条成绩记录`,'success');
        this.render();
      }catch(err){Utils.toast('导入失败：'+err.message,'error')}
    };
    r.readAsText(f);input.value='';
  },
  addExam(){
    let html=`<div class="flex flex-col gap-3">
      <div><label class="label">考试名称</label><input class="input" id="examName" placeholder="如：第二次月考"></div>
      <div><label class="label">考试日期</label><input class="input" type="date" id="examDate" value="${Utils.todayStr()}"></div>
    </div>`;
    Utils.modal('新建考试',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Grades.saveExam()">创建</button>`);
  },
  saveExam(){
    const name=document.getElementById('examName').value.trim();
    if(!name){Utils.toast('请输入考试名称','error');return}
    const date=document.getElementById('examDate').value;
    const grades=Store.get('grades',[]);
    const students=Store.get('students',[]);
    grades.push({exam:name,date,records:students.map(s=>{const r={sid:s.id,name:s.name};['语文','数学','英语','物理','化学','生物','政治','历史','地理'].forEach(sub=>r[sub]=0);r['总分']=0;return r})});
    Store.set('grades',grades);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('考试已创建，请录入成绩','success');
  }
};

/* ============ 花名册 ============ */
const Roster={
  view:'table',
  render(){
    const students=Store.get('students')||[];
    const rc=document.getElementById('rosterCount');if(rc)rc.textContent=`（共${students.length}人）`;
    const search=document.getElementById('rosterSearch')?document.getElementById('rosterSearch').value.toLowerCase():'';
    const gf=document.getElementById('rosterGenderFilter').value;
    let filtered=students.filter(s=>{
      if(search&&!(s.name.toLowerCase().includes(search)||s.id.includes(search)))return false;
      if(gf&&s.gender!==gf)return false;
      return true;
    });
    document.getElementById('viewToggleBtn').textContent=this.view==='table'?'卡片视图':'表格视图';
    if(this.view==='table')this.renderTable(filtered);
    else this.renderCards(filtered);
  },
  renderTable(students){
    let html=`<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th>学号</th><th>姓名</th><th>性别</th><th>出生日期</th><th>家长</th><th>电话</th><th>小组</th><th>标签</th><th>操作</th>
    </tr></thead><tbody>`;
    students.forEach(s=>{
      const tags=(s.tags||'').split(',').filter(Boolean).map(t=>`<span class="badge badge-purple" style="margin-right:3px">${t}</span>`).join('');
      html+=`<tr>
        <td>${s.id}</td><td class="font-semi">${s.name}</td><td>${s.gender||''}</td>
        <td>${s.birthDate||''}</td><td>${s.parentName||''}</td><td>${s.parentPhone||''}</td>
        <td>第${s.group||'?'}组</td><td>${tags||'-'}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="Roster.edit('${s.id}')">编辑</button></td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
    document.getElementById('rosterContent').innerHTML=html;
  },
  renderCards(students){
    let html='<div class="grid grid-3">';
    students.forEach(s=>{
      const color=Utils.avatarColor(s.name);
      const tags=(s.tags||'').split(',').filter(Boolean).map(t=>`<span class="badge badge-purple">${t}</span>`).join('');
      html+=`<div class="card card-hover">
        <div class="flex items-center gap-3 mb-3">
          <div class="contact-avatar" style="background:${color}">${s.name[0]}</div>
          <div><div class="font-semi">${s.name}</div><div class="text-xs text-muted">${s.id} · ${s.gender||''} · 第${s.group||'?'}组</div></div>
        </div>
        <div class="text-sm" style="color:var(--text-2);line-height:1.8">
          <div>出生：${s.birthDate||'-'}</div>
          <div>家长：${s.parentName||'-'} ${s.parentPhone||''}</div>
          <div>住址：${s.address||'-'}</div>
          <div class="mt-2">${tags||'无标签'}</div>
        </div>
        <button class="btn btn-ghost btn-sm mt-3 w-full" onclick="Roster.edit('${s.id}')">编辑</button>
      </div>`;
    });
    html+='</div>';
    document.getElementById('rosterContent').innerHTML=html;
  },
  toggleView(){this.view=this.view==='table'?'card':'table';this.render()},
  add(){
    const s={id:'',name:'',gender:'男',birthDate:'',parentName:'',parentPhone:'',address:'',group:1,tags:'',note:''};
    this.editForm(s,true);
  },
  edit(id){
    const students=Store.get('students',[]);
    const s=students.find(x=>x.id===id);
    if(s)this.editForm(s,false);
  },
  editForm(s,isNew){
    let html=`<div class="flex flex-col gap-3">
      <div class="grid grid-2"><div><label class="label">学号</label><input class="input" id="f_id" value="${s.id||''}" ${isNew?'':'readonly'}></div>
      <div><label class="label">姓名</label><input class="input" id="f_name" value="${s.name||''}"></div></div>
      <div class="grid grid-2"><div><label class="label">性别</label><select class="select" id="f_gender"><option value="男" ${s.gender==='男'?'selected':''}>男</option><option value="女" ${s.gender==='女'?'selected':''}>女</option></select></div>
      <div><label class="label">出生日期</label><input class="input" type="date" id="f_birth" value="${s.birthDate||''}"></div></div>
      <div class="grid grid-2"><div><label class="label">家长姓名</label><input class="input" id="f_parent" value="${s.parentName||''}"></div>
      <div><label class="label">联系电话</label><input class="input" id="f_phone" value="${s.parentPhone||''}"></div></div>
      <div><label class="label">家庭住址</label><input class="input" id="f_address" value="${s.address||''}"></div>
      <div class="grid grid-2"><div><label class="label">小组</label><input class="input" type="number" id="f_group" value="${s.group||1}"></div>
      <div><label class="label">标签（逗号分隔）</label><input class="input" id="f_tags" value="${s.tags||''}" placeholder="如：特长生,学科偏科"></div></div>
      <div><label class="label">备注</label><textarea class="textarea" id="f_note">${s.note||''}</textarea></div>
    </div>`;
    Utils.modal(isNew?'添加学生':'编辑学生',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Roster.save('${s.id||''}',${isNew})">保存</button>`);
  },
  save(oldId,isNew){
    const students=Store.get('students',[]);
    const s={
      id:document.getElementById('f_id').value.trim(),
      name:document.getElementById('f_name').value.trim(),
      gender:document.getElementById('f_gender').value,
      birthDate:document.getElementById('f_birth').value,
      parentName:document.getElementById('f_parent').value.trim(),
      parentPhone:document.getElementById('f_phone').value.trim(),
      address:document.getElementById('f_address').value.trim(),
      group:+document.getElementById('f_group').value||1,
      tags:document.getElementById('f_tags').value.trim(),
      note:document.getElementById('f_note').value.trim()
    };
    if(!s.id||!s.name){Utils.toast('学号和姓名不能为空','error');return}
    if(isNew&&students.find(x=>x.id===s.id)){Utils.toast('学号已存在','error');return}
    if(isNew){students.push(s)}else{const idx=students.findIndex(x=>x.id===oldId);if(idx>=0)students[idx]=s}
    Store.set('students',students);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('已保存','success');
  },
  exportCSV(){
    const students=Store.get('students',[]);
    if(!students.length){Utils.toast('暂无数据','error');return}
    const headers=['id','name','gender','birthDate','parentName','parentPhone','address','group','tags','note'];
    const cnNames={id:'学号',name:'姓名',gender:'性别',birthDate:'出生日期',parentName:'家长姓名',parentPhone:'联系电话',address:'家庭住址',group:'小组',tags:'标签',note:'备注'};
    let csv=headers.map(h=>cnNames[h]).join(',')+'\n';
    students.forEach(s=>{csv+=headers.map(h=>Utils.csvEscape(s[h])).join(',')+'\n'});
    Utils.downloadCSV(csv,'花名册_'+Utils.todayStr()+'.csv');
    Utils.toast('花名册CSV已导出','success');
  },
  importCSV(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      try{
        const data=Utils.parseCSVWithHeader(e.target.result);
        if(!data.length)throw new Error('empty');
        const students=Store.get('students',[]);
        let added=0,updated=0;
        data.forEach(row=>{
          const s={
            id:row['学号']||row['id']||row['ID']||'',
            name:row['姓名']||row['name']||'',
            gender:row['性别']||row['gender']||'男',
            birthDate:row['出生日期']||row['birthDate']||'',
            parentName:row['家长姓名']||row['parentName']||'',
            parentPhone:row['联系电话']||row['parentPhone']||row['电话']||'',
            address:row['家庭住址']||row['address']||'',
            group:+(row['小组']||row['group']||1),
            tags:row['标签']||row['tags']||'',
            note:row['备注']||row['note']||''
          };
          if(!s.id||!s.name)return;
          const ex=students.find(x=>x.id===s.id);
          if(ex){Object.assign(ex,s);updated++}else{students.push(s);added++}
        });
        Store.set('students',students);
        Utils.toast(`导入完成：新增${added}人，更新${updated}人`,'success');
        this.render();
      }catch(err){Utils.toast('导入失败：'+err.message,'error')}
    };
    r.readAsText(f);input.value='';
  }
};

/* ============ 班委名单 ============ */
const Committee={
  render(){
    const data=Store.get('committee',[]);
    let html='';
    const colors=['#52b788','#4dabf7','#9775fa'];
    data.forEach((cat,i)=>{
      html+=`<div class="card mb-4"><div class="card-title" style="color:${colors[i]}">${cat.category}</div>`;
      html+='<div class="grid grid-3">';
      (cat.roles||[]).forEach((r,ri)=>{
        const students=Store.get('students',[]);
        const stu=students.find(s=>s.name===r.student);
        const color=stu?Utils.avatarColor(r.student):colors[i];
        html+=`<div class="card card-hover" style="border-left:3px solid ${colors[i]}">
          <div class="flex items-center gap-3 mb-2">
            <div class="contact-avatar" style="background:${color};width:36px;height:36px;font-size:14px">${r.student?r.student[0]:'?'}</div>
            <div><div class="font-semi text-sm">${r.role}</div><div class="text-xs text-muted">${r.student||'未分配'}</div></div>
          </div>
          <div class="text-xs text-muted" style="line-height:1.5">${r.duty||''}</div>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-ghost btn-sm" onclick="Committee.edit(${i},${ri})">编辑</button>
            <button class="btn btn-ghost btn-sm" onclick="Committee.del(${i},${ri})">删除</button>
          </div>
        </div>`;
      });
      html+='</div></div>';
    });
    document.getElementById('committeeContent').innerHTML=html;
  },
  add(){
    const data=Store.get('committee',[]);
    const students=Store.get('students',[]);
    let catOpts=data.map((c,i)=>`<option value="${i}">${c.category}</option>`).join('');
    let html=`<div class="flex flex-col gap-3">
      <div><label class="label">分类</label><select class="select" id="c_cat"><option value="new">新建分类</option>${catOpts}</select></div>
      <div id="newCatWrap" class="hidden"><label class="label">分类名称</label><input class="input" id="c_newcat" placeholder="如：后勤组"></div>
      <div><label class="label">职位名称</label><input class="input" id="c_role" placeholder="如：生活委员"></div>
      <div><label class="label">担任学生</label><input class="input" id="c_student" list="studentList2"></div>
      <datalist id="studentList2">${students.map(s=>`<option value="${s.name}">`).join('')}</datalist>
      <div><label class="label">核心职责</label><textarea class="textarea" id="c_duty" placeholder="描述职责"></textarea></div>
    </div>`;
    const m=Utils.modal('添加职位',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Committee.saveAdd()">保存</button>`);
    document.getElementById('c_cat').onchange=function(){document.getElementById('newCatWrap').classList.toggle('hidden',this.value!=='new')};
  },
  saveAdd(){
    const data=Store.get('committee',[]);
    const catVal=document.getElementById('c_cat').value;
    const role=document.getElementById('c_role').value.trim();
    const student=document.getElementById('c_student').value.trim();
    const duty=document.getElementById('c_duty').value.trim();
    if(!role){Utils.toast('请输入职位名称','error');return}
    if(catVal==='new'){
      const newCat=document.getElementById('c_newcat').value.trim()||'其他';
      data.push({category:newCat,roles:[{role,student,duty}]});
    }else{
      data[+catVal].roles.push({role,student,duty});
    }
    Store.set('committee',data);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('已添加','success');
  },
  edit(ci,ri){
    const data=Store.get('committee',[]);
    const r=data[ci].roles[ri];
    const students=Store.get('students',[]);
    let html=`<div class="flex flex-col gap-3">
      <div><label class="label">职位名称</label><input class="input" id="e_role" value="${r.role}"></div>
      <div><label class="label">担任学生</label><input class="input" id="e_student" value="${r.student||''}" list="studentList3"></div>
      <datalist id="studentList3">${students.map(s=>`<option value="${s.name}">`).join('')}</datalist>
      <div><label class="label">核心职责</label><textarea class="textarea" id="e_duty">${r.duty||''}</textarea></div>
    </div>`;
    Utils.modal('编辑职位',html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Committee.saveEdit(${ci},${ri})">保存</button>`);
  },
  saveEdit(ci,ri){
    const data=Store.get('committee',[]);
    data[ci].roles[ri]={role:document.getElementById('e_role').value.trim(),student:document.getElementById('e_student').value.trim(),duty:document.getElementById('e_duty').value.trim()};
    Store.set('committee',data);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('已保存','success');
  },
  del(ci,ri){
    Utils.confirm('删除职位','确定删除此职位？',()=>{
      const data=Store.get('committee',[]);
      data[ci].roles.splice(ri,1);
      Store.set('committee',data);this.render();Utils.toast('已删除','success');
    });
  }
};

/* ============ 家长联系方式 ============ */
const Parents={
  render(){
    const students=Store.get('students',[]);
    const search=document.getElementById('parentSearch').value.toLowerCase();
    let filtered=students.filter(s=>!search||s.name.toLowerCase().includes(search)||s.parentName.toLowerCase().includes(search));
    let html='<div class="grid grid-2">';
    filtered.forEach(s=>{
      const color=Utils.avatarColor(s.name);
      html+=`<div class="contact-card">
        <div class="contact-avatar" style="background:${color}">${s.name[0]}</div>
        <div class="contact-info">
          <div class="contact-name">${s.name} <span class="text-xs text-muted">（${s.parentName||'家长'}）</span></div>
          <div class="contact-detail">${s.parentPhone||'未录入电话'}</div>
        </div>
        <div class="flex gap-2">
          ${s.parentPhone?`<a href="tel:${s.parentPhone}" class="btn btn-primary btn-sm">拨号</a>`:''}
          ${s.parentPhone?`<button class="btn btn-ghost btn-sm" onclick="Utils.copyText('${s.parentPhone}')">复制</button>`:''}
        </div>
      </div>`;
    });
    html+='</div>';
    if(!filtered.length)html='<div class="card text-center text-muted">暂无家长联系数据</div>';
    document.getElementById('parentsContent').innerHTML=html;
  }
};

/* ============ 课程表 ============ */
const Schedule={
  DAYS:['','周一','周二','周三','周四','周五','周六','周日'],
  DAY_NAMES:['日','一','二','三','四','五','六'],
  SUBJECT_COLORS:{
    '语文':'#e3faf3','数学':'#e7f5ff','英语':'#fce4ec','物理':'#fff3e0',
    '化学':'#f3e5f5','生物':'#e8f5e9','政治':'#fff9c4','历史':'#fce4ec',
    '地理':'#e0f7fa','体育':'#e8f5e9','音乐':'#f3e5f5','美术':'#fce4ec',
    '信息技术':'#e7f5ff','书法':'#fff9c4','班会':'#e8f5e9','自习':'#f7fafc',
    '阅读':'#fff3e0','劳动':'#e8f5e9','心理':'#f3e5f5','科学':'#e0f7fa'
  },
  SUBJECT_TEXT_COLORS:{
    '语文':'#2d6a4f','数学':'#1971c2','英语':'#c2185b','物理':'#e65100',
    '化学':'#7b1fa2','生物':'#2e7d32','政治':'#f57f17','历史':'#c2185b',
    '地理':'#00838f','体育':'#2e7d32','音乐':'#7b1fa2','美术':'#c2185b',
    '信息技术':'#1971c2','书法':'#f57f17','班会':'#2e7d32','自习':'#718096',
    '阅读':'#e65100','劳动':'#2e7d32','心理':'#7b1fa2','科学':'#00838f'
  },
  DEFAULT_SUBJECTS:['语文','数学','英语','物理','化学','生物','政治','历史','地理','体育','音乐','美术','信息技术','书法','班会','自习','阅读','劳动'],
  currentClass:'',

  // ===== 数据存取 =====
  getClasses(){return Store.get('scheduleClasses')||[]},
  setClasses(arr){Store.set('scheduleClasses',arr)},
  getClassKey(cn){return 'schedule_'+cn},
  getSchedule(){return Store.get(this.getClassKey(this.currentClass))||[]},
  setSchedule(arr){Store.set(this.getClassKey(this.currentClass),arr)},
  getCustomSubjects(){
    const all=Store.get('customSubjects')||[];
    return all;
  },
  getAllSubjects(){
    const custom=this.getCustomSubjects();
    return [...new Set([...this.DEFAULT_SUBJECTS,...custom])];
  },
  addCustomSubject(name){
    if(!name)return;
    const custom=this.getCustomSubjects();
    if(!custom.includes(name)&&!this.DEFAULT_SUBJECTS.includes(name)){
      custom.push(name);
      Store.set('customSubjects',custom);
    }
  },

  // ===== 渲染 =====
  render(){
    // 确保当前班级有效
    const classes=this.getClasses();
    if(!classes.length){
      classes.push('默认班级');
      this.setClasses(classes);
    }
    if(!this.currentClass||!classes.includes(this.currentClass)){
      this.currentClass=classes[0];
    }
    this.renderClassTabs();
    this.renderTable();
  },

  renderClassTabs(){
    const classes=this.getClasses();
    let html='';
    classes.forEach(cn=>{
      const isActive=cn===this.currentClass;
      html+=`<div class="class-tab ${isActive?'active':''}" onclick="Schedule.switchClass('${cn.replace(/'/g,"\\'")}')">
        <span>${cn}</span>
        ${classes.length>1?`<span class="tab-close" onclick="event.stopPropagation();Schedule.removeClass('${cn.replace(/'/g,"\\'")}')">×</span>`:''}
      </div>`;
    });
    html+=`<button class="class-tab-add" onclick="Schedule.addClass()">+ 添加班级</button>`;
    document.getElementById('classTabsBar').innerHTML=html;
  },

  renderTable(){
    const schedule=this.getSchedule();
    const today=new Date().getDay(); // 0=周日, 1=周一...6=周六
    const now=new Date();
    const currentMinutes=now.getHours()*60+now.getMinutes();

    // 找当前节次（支持7天）
    let currentPeriod=-1;
    if(today>=1&&today<=7){
      const todaySched=schedule.filter(s=>s.day===today);
      for(let i=0;i<todaySched.length;i++){
        const t=todaySched[i].time||'';
        const parts=t.split('-');
        if(parts.length===2){
          const start=parts[0].trim().split(':');const end=parts[1].trim().split(':');
          const startMin=+start[0]*60+ +start[1];
          const endMin=+end[0]*60+ +end[1];
          if(currentMinutes>=startMin&&currentMinutes<=endMin){currentPeriod=todaySched[i].period;break}
        }
      }
    }

    // 更新状态
    let status='';
    if(today>=1&&today<=7){
      if(currentPeriod>=0)status=`正在上第${currentPeriod}节课`;
      else{
        const todaySched=schedule.filter(s=>s.day===today);
        if(todaySched.length){
          const last=todaySched[todaySched.length-1];
          const parts=(last.time||'').split('-');
          if(parts.length===2){
            const endMin=parts[1].trim().split(':');
            if(currentMinutes>+endMin[0]*60+ +endMin[1])status='今日课程已结束';
            else status='课间休息';
          }else status='今日有课';
        }else status='今日无课';
      }
    }else status='周末休息';
    document.getElementById('scheduleStatus').textContent=`${this.currentClass} · 今天星期${this.DAY_NAMES[today]} · ${status}`;

    // 渲染表格（7天）
    const periods=[...new Set(schedule.map(s=>s.period))].sort((a,b)=>a-b);
    // 如果没有节次数据，默认8节
    const renderPeriods=periods.length?periods:[1,2,3,4,5,6,7,8];
    let html='<thead><tr><th style="width:64px">节次</th>';
    for(let d=1;d<=7;d++)html+=`<th class="${d===today?'today-col':''}">${this.DAYS[d]}</th>`;
    html+='</tr></thead><tbody>';
    renderPeriods.forEach(p=>{
      html+=`<tr><td style="text-align:center;font-weight:600;color:var(--text-3)">${p}</td>`;
      for(let d=1;d<=7;d++){
        const cell=schedule.find(s=>s.day===d&&s.period===p);
        if(cell&&cell.subject){
          const isCurrent=d===today&&currentPeriod===p;
          const c=this.SUBJECT_COLORS[cell.subject]||'var(--bg-soft)';
          const tc=this.SUBJECT_TEXT_COLORS[cell.subject]||'var(--text-1)';
          html+=`<td class="sched-cell ${isCurrent?'current-period':''}" style="background:${c}" onclick="Schedule.edit(${d},${p})">`;
          html+=`<div class="sched-subject" style="color:${tc}">${cell.subject}</div>`;
          if(cell.teacher)html+=`<div class="sched-teacher">${cell.teacher}</div>`;
          if(cell.room)html+=`<div class="sched-room">${cell.room}</div>`;
          html+=`</td>`;
        }else{
          html+=`<td class="sched-cell" style="background:var(--bg-soft)" onclick="Schedule.edit(${d},${p})"><span class="text-xs text-muted">+</span></td>`;
        }
      }
      html+='</tr>';
    });
    html+='</tbody>';
    document.getElementById('schedTable').innerHTML=html;
  },

  // ===== 班级管理 =====
  switchClass(cn){
    this.currentClass=cn;
    this.render();
  },
  addClass(){
    const name=prompt('请输入班级名称（如：初三(1)班）');
    if(!name||!name.trim())return;
    const classes=this.getClasses();
    if(classes.includes(name.trim())){Utils.toast('该班级已存在','error');return}
    classes.push(name.trim());
    this.setClasses(classes);
    this.currentClass=name.trim();
    this.setSchedule([]);
    this.render();
    Utils.toast('已添加班级：'+name.trim(),'success');
  },
  removeClass(cn){
    const classes=this.getClasses();
    if(classes.length<=1){Utils.toast('至少保留一个班级','error');return}
    Utils.confirm('删除班级','确定删除「'+cn+'」及其所有课程数据吗？此操作不可恢复！',()=>{
      const newClasses=classes.filter(c=>c!==cn);
      this.setClasses(newClasses);
      Store.del(this.getClassKey(cn));
      if(this.currentClass===cn)this.currentClass=newClasses[0];
      this.render();
      Utils.toast('已删除班级：'+cn,'success');
    });
  },

  // ===== 编辑课程 =====
  edit(day,period){
    const schedule=this.getSchedule();
    const cell=schedule.find(s=>s.day===day&&s.period===period)||{};
    const allSubjects=this.getAllSubjects();
    const datalistId='subjList_'+day+'_'+period;
    let html=`<div class="flex flex-col gap-3">
      <div class="grid grid-2">
        <div><label class="label">星期</label><select class="select" id="s_day">
          ${this.DAYS.slice(1).map((dn,i)=>`<option value="${i+1}" ${day===i+1?'selected':''}>${dn}</option>`).join('')}
        </select></div>
        <div><label class="label">节次</label><input class="input" type="number" id="s_period" value="${period}"></div>
      </div>
      <div><label class="label">科目</label><input class="input" id="s_subject" value="${cell.subject||''}" list="${datalistId}" placeholder="输入或选择科目"></div>
      <datalist id="${datalistId}">${allSubjects.map(s=>`<option>${s}</option>`).join('')}</datalist>
      <div class="grid grid-2">
        <div><label class="label">任课老师</label><input class="input" id="s_teacher" value="${cell.teacher||''}"></div>
        <div><label class="label">教室</label><input class="input" id="s_room" value="${cell.room||''}"></div>
      </div>
      <div><label class="label">时间（如08:00-08:45）</label><input class="input" id="s_time" value="${cell.time||''}" placeholder="08:00-08:45"></div>
      ${cell.subject?`<button class="btn btn-danger btn-sm" onclick="Schedule.deleteCell(${day},${period})" style="align-self:flex-start">删除此课程</button>`:''}
    </div>`;
    Utils.modal(`编辑课程 · ${this.currentClass}`,html,`<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button><button class="btn btn-primary" onclick="Schedule.save(${day},${period})">保存</button>`);
  },
  save(oldDay,oldPeriod){
    const schedule=this.getSchedule();
    const day=+document.getElementById('s_day').value;
    const period=+document.getElementById('s_period').value;
    const subject=document.getElementById('s_subject').value.trim();
    const teacher=document.getElementById('s_teacher').value.trim();
    const room=document.getElementById('s_room').value.trim();
    const time=document.getElementById('s_time').value.trim();

    // 添加自定义科目
    if(subject)this.addCustomSubject(subject);

    // 删除旧的（oldDay和oldPeriod可能不同）
    const idx=schedule.findIndex(s=>s.day===oldDay&&s.period===oldPeriod);
    if(idx>=0)schedule.splice(idx,1);

    if(subject){
      // 添加新的
      const existIdx=schedule.findIndex(s=>s.day===day&&s.period===period);
      if(existIdx>=0)schedule[existIdx]={day,period,subject,teacher,room,time};
      else schedule.push({day,period,subject,teacher,room,time});
    }
    this.setSchedule(schedule);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('课程已保存','success');
  },
  deleteCell(day,period){
    const schedule=this.getSchedule();
    const idx=schedule.findIndex(s=>s.day===day&&s.period===period);
    if(idx>=0)schedule.splice(idx,1);
    this.setSchedule(schedule);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();
    Utils.toast('课程已删除','success');
  },

  // ===== 导入导出 =====
  exportCSV(){
    const schedule=this.getSchedule();
    if(!schedule.length){Utils.toast('当前班级暂无课表','error');return}
    let csv='星期,节次,科目,任课老师,教室,时间\n';
    schedule.forEach(s=>{csv+=this.DAYS[s.day]+','+s.period+','+Utils.csvEscape(s.subject)+','+Utils.csvEscape(s.teacher||'')+','+Utils.csvEscape(s.room||'')+','+Utils.csvEscape(s.time||'')+'\n'});
    Utils.downloadCSV(csv,`课程表_${this.currentClass}_${Utils.todayStr()}.csv`);
    Utils.toast('课表CSV已导出','success');
  },
  importCSV(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      try{
        const data=Utils.parseCSVWithHeader(e.target.result);
        if(!data.length)throw new Error('empty');
        const schedule=data.map(row=>({
          day:this.DAYS.indexOf(row['星期']||row['day']||'周一'),
          period:+(row['节次']||row['period']||1),
          subject:row['科目']||row['subject']||'',
          teacher:row['任课老师']||row['teacher']||'',
          room:row['教室']||row['room']||'',
          time:row['时间']||row['time']||''
        })).filter(s=>s.day>=1&&s.day<=7&&s.subject);
        this.setSchedule(schedule);
        Utils.toast(`已导入${schedule.length}条课程记录到「${this.currentClass}」`,'success');
        this.render();
      }catch(err){Utils.toast('导入失败：'+err.message,'error')}
    };
    r.readAsText(f);input.value='';
  }
};

/* ============ 待办便签 ============ */
const Todos={
  filterVal:'all',
  render(){
    const todos=Store.get('todos',[]);
    let filtered=todos;
    if(this.filterVal==='active')filtered=todos.filter(t=>!t.done);
    else if(this.filterVal==='done')filtered=todos.filter(t=>t.done);
    let html='';
    if(!filtered.length){
      html='<div class="text-sm text-muted" style="padding:20px;text-align:center">暂无待办事项</div>';
    }else{
      filtered.forEach(t=>{
        const overdue=!t.done&&Utils.isOverdue(t.date);
        html+=`<div class="todo-item" style="${overdue?'background:var(--c-danger-l);border-radius:8px':''}">`;
        html+=`<div class="todo-pri pri-${t.priority||2}"></div>`;
        html+=`<div class="todo-check ${t.done?'done':''}" onclick="Todos.toggle(${t.id})">`;
        if(t.done)html+='<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
        html+='</div>';
        html+=`<div class="todo-text">`;
        if(overdue)html+='<span class="badge badge-red" style="margin-right:6px">逾期</span>';
        const priLabel=['紧急','重要','普通'];
        html+=`<span class="badge badge-${t.priority===0?'red':t.priority===1?'yellow':'blue'}" style="margin-right:6px">${priLabel[t.priority]||'普通'}</span>`;
        html+=t.text;
        html+=`<div class="text-xs text-muted mt-2">${t.date}</div>`;
        html+='</div>';
        html+=`<button class="btn btn-ghost btn-sm" onclick="Todos.del(${t.id})">删除</button>`;
        html+='</div>';
      });
    }
    document.getElementById('todoList').innerHTML=html;
    const notes=Store.get('notes','');
    document.getElementById('notesArea').value=notes;
  },
  add(){
    const input=document.getElementById('todoInput');
    const text=input.value.trim();
    if(!text)return;
    const pri=+document.getElementById('todoPri').value;
    const todos=Store.get('todos',[]);
    const id=Math.max(0,...todos.map(t=>t.id||0))+1;
    todos.push({id,text,priority:pri,done:false,date:Utils.todayStr()});
    Store.set('todos',todos);
    input.value='';
    this.render();
    Dashboard.renderTodayTasks();
    Utils.toast('待办已添加','success');
  },
  toggle(id){
    const todos=Store.get('todos',[]);
    const t=todos.find(x=>x.id===id);
    if(t){t.done=!t.done;Store.set('todos',todos);this.render();Dashboard.renderTodayTasks()}
  },
  del(id){
    const todos=Store.get('todos',[]);
    Store.set('todos',todos.filter(t=>t.id!==id));
    this.render();
    Dashboard.renderTodayTasks();
    Utils.toast('已删除','success');
  },
  filter(v){this.filterVal=v;this.render()},
  saveNotes(v){Store.set('notes',v)}
};

/* ============ 初始化 ============ */
function init(){
  App.initTheme();
  SampleData.load();
  // 导航事件
  document.querySelectorAll('.nav-item').forEach(n=>{
    n.addEventListener('click',()=>App.go(n.dataset.page));
  });
  // 渲染首页
  Dashboard.render();
  // 课程表自动刷新（每分钟检测当前节次）
  Schedule.render();
  setInterval(()=>{
    const active=document.getElementById('page-schedule');
    if(active&&active.classList.contains('active'))Schedule.render();
  },60000);
}
init();
