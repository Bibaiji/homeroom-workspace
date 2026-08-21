
/* ================= 座次表 ================= */
const Seating={
  get(){return Store.get('seating',{rows:6,cols:5,layout:[]})||{rows:6,cols:5,layout:[]}},
  render(){
    const s=this.get();
    const students=Store.get('students',[])||[];
    const roles=RoleHelper.map();
    document.getElementById('seatCount').textContent=`（${(s.layout||[]).length}/${students.length} 人已就座 · ${s.rows}×${s.cols}）`;
    const search=(document.getElementById('seatSearch').value||'').toLowerCase();
    const stuMap={};students.forEach(st=>stuMap[st.id]=st);
    const seated=new Set((s.layout||[]).map(l=>l.sid));
    let html=`<div class="seat-grid" style="grid-template-columns:repeat(${s.cols},minmax(78px,92px))">`;
    for(let r=0;r<s.rows;r++){
      for(let c=0;c<s.cols;c++){
        const cell=(s.layout||[]).find(l=>l.r===r&&l.c===c);
        const stu=cell?stuMap[cell.sid]:null;
        if(stu){
          const hit=search&&(stu.name.toLowerCase().includes(search)||stu.id.includes(search));
          const role=roles[stu.name];
          html+=`<div class="seat ${hit?'search-hit':''}" draggable="true" data-r="${r}" data-c="${c}" onclick="Seating.clickSeat(${r},${c})">
            ${role?`<span class="seat-role">${Utils.esc(role)}</span>`:''}
            <div class="seat-name">${Utils.esc(stu.name)}</div>
            <div class="seat-id">${stu.id}</div>
          </div>`;
        }else{
          html+=`<div class="seat seat-empty" data-r="${r}" data-c="${c}" onclick="Seating.clickSeat(${r},${c})">＋</div>`;
        }
      }
    }
    html+='</div>';
    document.getElementById('seatingGrid').innerHTML=html;
    this.bindDrag();
  },
  bindDrag(){
    let dragEl=null;
    document.querySelectorAll('#seatingGrid .seat').forEach(el=>{
      el.addEventListener('dragstart',e=>{
        dragEl=el;el.classList.add('dragging');
        e.dataTransfer.effectAllowed='move';
        try{e.dataTransfer.setData('text/plain','seat')}catch(_){}
      });
      el.addEventListener('dragend',()=>{el.classList.remove('dragging');dragEl=null});
      el.addEventListener('dragover',e=>{e.preventDefault()});
      el.addEventListener('drop',e=>{
        e.preventDefault();
        if(!dragEl||dragEl===el)return;
        this.swap(+dragEl.dataset.r,+dragEl.dataset.c,+el.dataset.r,+el.dataset.c);
      });
    });
  },
  swap(r1,c1,r2,c2){
    const s=this.get();s.layout=s.layout||[];
    const l1=s.layout.find(l=>l.r===r1&&l.c===c1);
    const l2=s.layout.find(l=>l.r===r2&&l.c===c2);
    if(l1&&l2){const t=l1.sid;l1.sid=l2.sid;l2.sid=t}
    else if(l1&&!l2){l1.r=r2;l1.c=c2}
    Store.set('seating',s);this.render();Utils.toast('座位已交换','success');
  },
  clickSeat(r,c){
    const s=this.get();s.layout=s.layout||[];
    const cell=s.layout.find(l=>l.r===r&&l.c===c);
    if(cell){
      const stu=(Store.get('students',[])||[]).find(x=>x.id===cell.sid);
      Utils.modal(`座位 ${r+1}排${c+1}列`,
        `<div class="text-sm mb-3" style="color:var(--text-2)">当前：<b style="color:var(--text)">${stu?Utils.esc(stu.name):'未知学生'}</b></div>`,
        `<button class="btn btn-danger" onclick="Seating.removeSeat(${r},${c})">移除</button>
         <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">关闭</button>
         <button class="btn btn-primary" onclick="Seating.pickStudent(${r},${c})">更换学生</button>`);
    }else{
      this.pickStudent(r,c);
    }
  },
  pickStudent(r,c){
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    const s=this.get();s.layout=s.layout||[];
    const seated=new Set(s.layout.map(l=>l.sid));
    const avail=(Store.get('students',[])||[]).filter(st=>!seated.has(st.id));
    if(!avail.length){Utils.toast('所有学生都已安排座位','error');return}
    Utils.modal('安排学生入座',
      `<div class="flex flex-col gap-3">
        <div><label class="label">选择学生（第${r+1}排 · 第${c+1}列）</label>
        <select class="select" id="seat_pick">${avail.map(st=>`<option value="${st.id}">${Utils.esc(st.name)}（${st.id}）</option>`).join('')}</select></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Seating.assign(${r},${c})">安排入座</button>`);
  },
  assign(r,c){
    const sid=document.getElementById('seat_pick').value;
    if(!sid)return;
    const s=this.get();s.layout=s.layout||[];
    s.layout=s.layout.filter(l=>!(l.r===r&&l.c===c));
    s.layout.push({r,c,sid});
    Store.set('seating',s);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();Utils.toast('已安排入座','success');
  },
  removeSeat(r,c){
    const s=this.get();s.layout=s.layout||[];
    s.layout=s.layout.filter(l=>!(l.r===r&&l.c===c));
    Store.set('seating',s);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();Utils.toast('已移除','success');
  },
  sizeModal(){
    const s=this.get();
    Utils.modal('设置座位行列',
      `<div class="grid grid-2">
        <div><label class="label">行数（排）</label><input class="input" type="number" min="1" max="12" id="seat_rows" value="${s.rows}"></div>
        <div><label class="label">列数</label><input class="input" type="number" min="1" max="12" id="seat_cols" value="${s.cols}"></div>
      </div>
      <div class="text-xs text-faint mt-3">缩小范围不会删除已入座数据，超出范围的座位将暂时隐藏。</div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Seating.saveSize()">保存</button>`);
  },
  saveSize(){
    const s=this.get();
    s.rows=Math.max(1,Math.min(12,+document.getElementById('seat_rows').value||6));
    s.cols=Math.max(1,Math.min(12,+document.getElementById('seat_cols').value||5));
    Store.set('seating',s);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();Utils.toast('座位布局已更新','success');
  },
  randomize(){
    Utils.confirm('随机排座','将随机打乱所有已入座学生的位置，确定继续？','Seating.doRandomize()');
  },
  doRandomize(){
    const s=this.get();s.layout=s.layout||[];
    const sids=s.layout.map(l=>l.sid);
    for(let i=sids.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [sids[i],sids[j]]=[sids[j],sids[i]];
    }
    s.layout=s.layout.map((l,i)=>({...l,sid:sids[i]}));
    Store.set('seating',s);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();Utils.toast('已随机排座','success');
  }
};

/* ================= 值日表 ================= */
const Duty={
  SLOTS:['早读','课间','放学'],
  mondayOf(offset){
    const today=new Date();
    const monday=new Date(today);
    monday.setDate(today.getDate()-((today.getDay()+6)%7)+offset*7);
    return monday;
  },
  mondayStr(offset){
    const m=this.mondayOf(offset);
    return m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0')+'-'+String(m.getDate()).padStart(2,'0');
  },
  getData(){return Store.get('duty',{weeks:{}})||{weeks:{}}},
  getGrid(offset){
    const d=this.getData();
    const key=this.mondayStr(offset);
    if(!d.weeks)d.weeks={};
    if(!d.weeks[key])d.weeks[key]={};
    return d.weeks[key];
  },
  saveGrid(offset,grid){
    const d=this.getData();
    if(!d.weeks)d.weeks={};
    d.weeks[this.mondayStr(offset)]=grid;
    Store.set('duty',d);
  },
  render(){
    const offset=this.getData().weekOffset||0;
    const monday=this.mondayOf(offset);
    const today=new Date();
    const weekStr=`${Utils.formatDate(monday)} ~ ${Utils.formatDate(new Date(monday.getTime()+4*86400000))}`;
    document.getElementById('dutyWeekLabel').textContent=`（${offset===0?'本周':offset<0?Math.abs(offset)+'周前':offset+'周后'} · ${weekStr}）`;
    const days=['周一','周二','周三','周四','周五'];
    const grid=this.getGrid(offset);
    let html='<div></div>';
    for(let i=1;i<=5;i++){
      const dt=new Date(monday.getTime()+(i-1)*86400000);
      const isToday=offset===0&&today.toDateString()===dt.toDateString();
      html+=`<div class="duty-dayhead ${isToday?'today':''}">${days[i-1]}<span class="d">${dt.getMonth()+1}/${dt.getDate()}</span></div>`;
    }
    this.SLOTS.forEach(slot=>{
      html+=`<div class="duty-slot">${slot}</div>`;
      for(let day=1;day<=5;day++){
        const cell=grid[day+'_'+slot];
        if(cell&&(cell.students||[]).length){
          html+=`<div class="duty-cell" onclick="Duty.edit(${day},'${slot}')">
            <div class="duty-members">${(cell.students||[]).map(n=>`<span class="duty-member">${Utils.esc(n)}</span>`).join('')}</div>
            ${cell.area?`<div class="duty-area">📍 ${Utils.esc(cell.area)}</div>`:''}
          </div>`;
        }else{
          html+=`<div class="duty-cell duty-cell-empty" onclick="Duty.edit(${day},'${slot}')">＋ 安排</div>`;
        }
      }
    });
    document.getElementById('dutyGrid').innerHTML=html;
  },
  shift(delta){
    const d=this.getData();
    d.weekOffset=(d.weekOffset||0)+delta;
    Store.set('duty',d);this.render();
  },
  edit(day,slot){
    const offset=this.getData().weekOffset||0;
    const grid=this.getGrid(offset);
    const cell=grid[day+'_'+slot]||{students:[],area:''};
    const students=(Store.get('students',[])||[]).map(s=>`<option value="${Utils.esc(s.name)}">`).join('');
    Utils.modal(`${['周一','周二','周三','周四','周五'][day-1]} · ${slot}值日`,
      `<div id="dutyEditBody"></div>
       <div class="flex gap-2 mt-3">
         <input class="input" id="duty_add_name" list="dutyStudentList" placeholder="添加值日生…" style="flex:1">
         <datalist id="dutyStudentList">${students}</datalist>
         <button class="btn btn-primary btn-sm" onclick="Duty.addMember(${day},'${slot}')">添加</button>
       </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">完成</button>`);
    this._renderEditBody(day,slot,cell);
  },
  _renderEditBody(day,slot,cell){
    cell=cell||{students:[],area:''};
    const members=(cell.students||[]).map((n,i)=>
      `<span class="duty-member" style="cursor:pointer" title="点击移除" onclick="Duty.removeMember(${day},'${slot}',${i})">${Utils.esc(n)} ✕</span>`).join('');
    const html=`
      <div class="flex" style="flex-wrap:wrap;gap:6px;min-height:30px;margin-bottom:12px">${members||'<span class="text-xs text-faint">还没有值日生，在下方输入添加</span>'}</div>
      <div><label class="label">卫生区域</label><input class="input" id="duty_area" value="${Utils.esc(cell.area||'')}" placeholder="如：走廊、黑板、卫生区" onchange="Duty.saveArea(${day},'${slot}',this.value)"></div>`;
    const el=document.getElementById('dutyEditBody');
    if(el)el.innerHTML=html;
  },
  _cell(day,slot){
    const offset=this.getData().weekOffset||0;
    const grid=this.getGrid(offset);
    if(!grid[day+'_'+slot])grid[day+'_'+slot]={students:[],area:''};
    return {offset,grid,cell:grid[day+'_'+slot]};
  },
  addMember(day,slot){
    const name=(document.getElementById('duty_add_name').value||'').trim();
    if(!name){Utils.toast('请输入学生姓名','error');return}
    const {offset,grid,cell}=this._cell(day,slot);
    cell.students=cell.students||[];
    if(cell.students.includes(name)){Utils.toast('该学生已在列表中','error');return}
    cell.students.push(name);
    this.saveGrid(offset,grid);
    document.getElementById('duty_add_name').value='';
    this._renderEditBody(day,slot,cell);
    this.render();
  },
  removeMember(day,slot,idx){
    const {offset,grid,cell}=this._cell(day,slot);
    cell.students=(cell.students||[]);
    cell.students.splice(idx,1);
    if(!cell.students.length&&!cell.area)delete grid[day+'_'+slot];
    this.saveGrid(offset,grid);
    this._renderEditBody(day,slot,cell);
    this.render();
  },
  saveArea(day,slot,v){
    const {offset,grid,cell}=this._cell(day,slot);
    cell.area=v;
    if(!cell.area&&!(cell.students||[]).length)delete grid[day+'_'+slot];
    this.saveGrid(offset,grid);
    this.render();
  },
  copyLastWeek(){
    const offset=this.getData().weekOffset||0;
    const last=this.getGrid(offset-1);
    if(!Object.keys(last).length){Utils.toast('上周没有值日安排','error');return}
    const cur=this.getGrid(offset);
    Object.keys(last).forEach(k=>cur[k]=JSON.parse(JSON.stringify(last[k])));
    this.saveGrid(offset,cur);
    this.render();Utils.toast('已复制上周值日表','success');
  },
  copyMonToAll(){
    const offset=this.getData().weekOffset||0;
    const grid=this.getGrid(offset);
    let found=false;
    this.SLOTS.forEach(slot=>{
      const mon=grid['1_'+slot];
      if(mon&&((mon.students||[]).length||mon.area)){
        found=true;
        for(let d=2;d<=5;d++)grid[d+'_'+slot]=JSON.parse(JSON.stringify(mon));
      }
    });
    if(!found){Utils.toast('周一还没有值日安排','error');return}
    this.saveGrid(offset,grid);
    this.render();Utils.toast('已将周一复制到全周','success');
  }
};

/* ================= 成绩分析 ================= */
const Grades={
  subjects(){
    const set=[];
    (Store.get('grades',[])||[]).forEach(g=>(g.scores||[]).forEach(s=>{
      if(s.subject&&!set.includes(s.subject))set.push(s.subject);
    }));
    return set;
  },
  stats(){
    const grades=Store.get('grades',[])||[];
    const subjects=this.subjects();
    const rows=grades.map(g=>{
      const total=(g.scores||[]).reduce((a,s)=>a+(+s.score||0),0);
      return {g,total};
    });
    const totals=rows.map(r=>r.total);
    const avg=totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:0;
    const max=totals.length?Math.max(...totals):0;
    const min=totals.length?Math.min(...totals):0;
    const full=subjects.length*100;
    const rate=full?rows.filter(r=>r.total/full>=0.85).length/(rows.length||1):0;
    const subjAvg=subjects.map(sub=>{
      const vals=grades.map(g=>{const s=(g.scores||[]).find(x=>x.subject===sub);return s?+s.score:NaN}).filter(v=>!isNaN(v));
      return {subject:sub,avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0};
    });
    const dist=full?{优秀:0,良好:0,及格:0,不及格:0}:{};
    if(full)rows.forEach(r=>{
      const p=r.total/full;
      if(p>=0.85)dist['优秀']++;
      else if(p>=0.7)dist['良好']++;
      else if(p>=0.6)dist['及格']++;
      else dist['不及格']++;
    });
    return {rows,avg,max,min,rate,subjAvg,dist,subjects,count:rows.length};
  },
  render(){
    const st=this.stats();
    document.getElementById('gradesExamName').textContent=st.count?`（${Store.get('gradesExam','成绩单')} · ${st.count}人）`:'';
    document.getElementById('gradesKpi').innerHTML=`
      <div class="kpi-card"><div class="kpi-val text-primary">${st.count?st.avg.toFixed(1):'--'}</div><div class="kpi-label">班级平均分</div></div>
      <div class="kpi-card"><div class="kpi-val" style="color:var(--c2)">${st.count?st.max:'--'}</div><div class="kpi-label">最高分</div></div>
      <div class="kpi-card"><div class="kpi-val text-danger">${st.count?st.min:'--'}</div><div class="kpi-label">最低分</div></div>
      <div class="kpi-card"><div class="kpi-val" style="color:var(--c3)">${st.count?(st.rate*100).toFixed(1)+'%':'--'}</div><div class="kpi-label">优秀率</div></div>`;
    this.renderBar(st);
    this.renderPie(st);
    this.renderRank(st);
  },
  renderBar(st){
    const el=document.getElementById('chartBar');
    if(!st.subjAvg.length){el.innerHTML='<div class="empty-state">暂无成绩数据</div>';return}
    const colors=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)'];
    const W=320,H=180,pad=10,base=140,bw=Math.min(34,(W-2*pad)/st.subjAvg.length-10);
    let svg=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:210px" xmlns="http://www.w3.org/2000/svg">`;
    [0,50,100].forEach(v=>{
      const y=base-v/100*(base-24);
      svg+=`<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="${v===0?'0':'3 4'}"/>
      <text x="${pad}" y="${y-4}" font-size="8.5" fill="var(--text-3)">${v}</text>`;
    });
    st.subjAvg.forEach((s,i)=>{
      const x=pad+((W-2*pad)/st.subjAvg.length)*(i+0.5);
      const h=s.avg/100*(base-24);
      svg+=`<rect x="${x-bw/2}" y="${base-h}" width="${bw}" height="${h}" rx="5" fill="${colors[i%colors.length]}" opacity="0.9"/>`;
      svg+=`<text x="${x}" y="${base-h-6}" font-size="10" font-weight="700" fill="var(--text)" text-anchor="middle">${s.avg.toFixed(1)}</text>`;
      svg+=`<text x="${x}" y="${base+14}" font-size="9.5" fill="var(--text-2)" text-anchor="middle">${s.subject}</text>`;
    });
    svg+='</svg>';
    el.innerHTML=svg;
  },
  renderPie(st){
    const el=document.getElementById('chartPie');
    if(!st.count){el.innerHTML='<div class="empty-state">暂无成绩数据</div>';return}
    const entries=Object.entries(st.dist);
    const colors=['#5B7065','#7C93A8','#C2A88A','#C48B9F'];
    const r=52,cx=70,cy=70,C=2*Math.PI*r;
    let offset=0;
    let svg=`<svg viewBox="0 0 140 140" style="width:150px;height:150px;flex-shrink:0" xmlns="http://www.w3.org/2000/svg">`;
    entries.forEach(([k,v],i)=>{
      if(!v)return;
      const len=v/st.count*C;
      svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="17"
        stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
      offset+=len;
    });
    svg+=`<circle cx="${cx}" cy="${cy}" r="34" fill="var(--card)"/>
      <text x="${cx}" y="${cy-2}" font-size="16" font-weight="800" fill="var(--text)" text-anchor="middle">${st.count}</text>
      <text x="${cx}" y="${cy+13}" font-size="8" fill="var(--text-3)" text-anchor="middle">名学生</text></svg>`;
    const legend='<div class="chart-legend" style="flex-direction:column;gap:8px">'+
      entries.map(([k,v],i)=>`<div class="item"><span class="sw" style="background:${colors[i]}"></span>${k} <b style="color:var(--text)">${v}人</b> <span class="text-faint">${(v/st.count*100).toFixed(0)}%</span></div>`).join('')+'</div>';
    el.innerHTML=`<div class="flex items-center gap-4 justify-center" style="flex-wrap:wrap">${svg}${legend}</div>`;
  },
  renderRank(st){
    const el=document.getElementById('gradeRankBody');
    if(!st.rows.length){el.innerHTML='<div class="empty-state">暂无成绩数据，点击右上角「录入成绩」或导入CSV</div>';return}
    const sorted=[...st.rows].sort((a,b)=>b.total-a.total);
    let html=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>名次</th><th>姓名</th>${st.subjects.map(s=>`<th>${Utils.esc(s)}</th>`).join('')}<th>总分</th></tr></thead><tbody>`;
    sorted.forEach((r,i)=>{
      const badge=i<3?`<span class="rank-badge rank-${i+1}">${i+1}</span>`:`<span class="rank-badge rank-n">${i+1}</span>`;
      html+=`<tr><td>${badge}</td><td class="font-semi">${Utils.esc(r.g.name)}</td>`;
      st.subjects.forEach(sub=>{
        const s=(r.g.scores||[]).find(x=>x.subject===sub);
        const v=s?+s.score:null;
        const color=v==null?'var(--text-3)':v<60?'var(--danger)':v>=90?'var(--primary)':'var(--text)';
        html+=`<td style="color:${color};font-variant-numeric:tabular-nums">${v==null?'-':v}</td>`;
      });
      html+=`<td class="font-bold" style="font-variant-numeric:tabular-nums">${r.total}</td></tr>`;
    });
    html+='</tbody></table></div>';
    el.innerHTML=html;
  },
  editModal(){
    const students=(Store.get('students',[])||[]);
    const subjects=this.subjects();
    if(!students.length&&!subjects.length){
      // 全新录入：提示科目
    }
    const subjInputs=subjects.map(s=>`<div><label class="label">${Utils.esc(s)}</label><input class="input gr-score" type="number" min="0" max="100" data-subject="${Utils.esc(s)}" placeholder="0-100"></div>`).join('');
    Utils.modal('录入成绩',
      `<div class="flex flex-col gap-3">
        <div class="grid grid-2">
          <div><label class="label">学生姓名</label><input class="input" id="gr_name" list="grNameList" placeholder="选择或输入姓名"><datalist id="grNameList">${students.map(s=>`<option value="${Utils.esc(s.name)}">`).join('')}</datalist></div>
          <div><label class="label">新科目（可选）</label><input class="input" id="gr_newsubject" placeholder="如：生物"></div>
        </div>
        ${subjInputs?'<div class="grid grid-2">'+subjInputs+'</div>':''}
        <div class="text-xs text-faint">输入姓名后保存会覆盖该学生已有成绩；填写「新科目」可增加学科列。</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">取消</button>
       <button class="btn btn-primary" onclick="Grades.save()">保存</button>`);
  },
  save(){
    const name=document.getElementById('gr_name').value.trim();
    if(!name){Utils.toast('请填写学生姓名','error');return}
    const newSub=document.getElementById('gr_newsubject').value.trim();
    const grades=Store.get('grades',[])||[];
    let g=grades.find(x=>x.name===name);
    if(!g){g={name,scores:[]};grades.push(g)}
    g.scores=g.scores||[];
    document.querySelectorAll('.gr-score').forEach(inp=>{
      const subject=inp.dataset.subject;
      const v=inp.value;
      if(v==='')return;
      const ex=g.scores.find(s=>s.subject===subject);
      if(ex)ex.score=+v;
      else g.scores.push({subject,score:+v});
    });
    if(newSub){
      const val=prompt('「'+newSub+'」的成绩（'+name+'）：','');
      if(val!==null&&val!=='')g.scores.push({subject:newSub,score:+val});
    }
    Store.set('grades',grades);
    document.querySelectorAll('.modal-overlay').forEach(m=>m.remove());
    this.render();Utils.toast('成绩已保存','success');
  },
  exportCSV(){
    const grades=Store.get('grades',[])||[];
    const subjects=this.subjects();
    if(!grades.length){Utils.toast('暂无成绩数据','error');return}
    let csv='姓名,'+subjects.join(',')+'\n';
    grades.forEach(g=>{
      csv+=Utils.csvEscape(g.name)+','+subjects.map(sub=>{
        const s=(g.scores||[]).find(x=>x.subject===sub);
        return s?s.score:'';
      }).join(',')+'\n';
    });
    Utils.downloadCSV(csv,'成绩表_'+Utils.todayStr()+'.csv');
    Utils.toast('成绩CSV已导出','success');
  },
  importCSV(input){
    const f=input.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      try{
        const data=Utils.parseCSVWithHeader(e.target.result);
        if(!data.length)throw new Error('文件为空');
        const subjects=Object.keys(data[0]).filter(k=>k!=='姓名'&&k!=='name'&&k!=='学生');
        const grades=data.map(row=>{
          const scores=subjects.map(sub=>{
            const v=+(row[sub]||'');
            return {subject:sub,score:isNaN(v)?0:v};
          }).filter(s=>s.subject);
          return {name:row['姓名']||row['name']||row['学生']||'',scores};
        }).filter(g=>g.name);
        if(!grades.length)throw new Error('未识别到有效数据（表头需含「姓名」列）');
        Store.set('grades',grades);
        Utils.toast(`已导入 ${grades.length} 名学生成绩`,'success');
        this.render();
      }catch(err){Utils.toast('导入失败：'+err.message,'error')}
    };
    r.readAsText(f,'utf-8');input.value='';
  }
};
