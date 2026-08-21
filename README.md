# 2026-08-21

## 班主任工作台 v2.3 发布（终版打磨）

- 需求（用户明言「希望这是最后一次修改」）：所有选学生处加搜索；座次表点姓名搜索交换；值日表加值日生搜索；家长联系去掉 tel:/sms: 跳转只留复制号码（原短信跳转会卡）；课表特殊环节（早/晚餐等整行相同）合并居中且给开关；所有类似选学生处统一加搜索；去掉「回 WorkBuddy 继续聊」按钮；去掉左下角版本角标；整体美观自主打磨。
- 实现要点：
  - 新增共享 `Utils.stuSuggest(inputId,boxId,cbName,exclude)` / `stuSuggestHide`，各模块用全局 pick 回调填充（Dashboard.pickDiscStu/pickCommStu/pickGrowthStu + fillParent、pickHwMiss；Seating.suggestSwap/doSwapSeat、suggestAvail/assignByName；Duty.suggestMember/pickMember(用 `_pickCtx`)；Grades.pickStudent 还会带出已有成绩防误覆盖；Committee.pickStudent）。
  - 座次表 clickSeat 已坐学生改弹「搜索交换」框（显示对方座位如 2排2列），doSwapSeat 关弹窗后调 swap；空位改为搜索入座并排除已入座。
  - 家长联系 parentRow 删除 tel:/sms: 链接，仅留复制号码按钮；卡片头部复制通知文案按钮保留。
  - 课表 renderTable 非 class 行按 `schedMerge`(默认 on) 且 activeAll 时用 colspan 合并居中（`.sched-band-merge`）；设置新增「课表显示」drawer 段 `schedMergeSel` + App.setSchedMerge，openDrawer 同步。
  - 从 shell 分析确证「回 WorkBuddy」按钮由部署平台外壳注入，URL 加 `?fromWbMp=1`（`Oe=!a&&!u&&!f&&!v` 中 a=fromWbMp==1）即可隐藏且无副作用。
  - 删 sidebar-foot 角标；p2 关于文案 v2.2→v2.3。
- 测试：test-v2.js 扩到 108 项断言（新增 24-33 覆盖搜索/交换/入座/复制/parents无跳转/合并开关/角标移除），108/108 通过。
- 部署：page transaction 发布版本 4，链接不变 https://workbuddy.link/p/dwdEoNhVC7PTX6HkCGwOCE；**交付必须用带参链接 https://workbuddy.link/p/dwdEoNhVC7PTX6HkCGwOCE?fromWbMp=1**（否则外壳显示回聊按钮）。字节级验证 versioned index.html（/4/index.html）：v2.3=1、stuSuggest=17、sched-band-merge=3、tel:/sms:/sidebar-foot=0。

## 班主任工作台 v2.2 发布（考勤重构 + 性能优化）

- 需求：早读考勤改名「考勤」；一天多场次可自定义（增删改名）；标记考勤交互重做（原「全部出勤」按钮+隐藏可编辑列表让人困惑）；性能卡顿优化。
- 考勤新数据模型：`attSessions`（场次名数组）+ `attendance={date,data:{场次:[{sid,name,status}异常记录]}}`，只存异常、其余默认出勤；migrate() 自动把旧 `{date,records}` 转换。
- 标记弹窗：大按钮「全员出勤，一键完成」立即保存关闭；下方按行点名（请假/缺勤/迟到三键切换，再点取消），_attToggle 只更新单行 DOM（outerHTML），不再整列表重渲。
- 性能优化（用户反馈"卡"）：移除 topbar/modal-overlay/drawer-backdrop 的 backdrop-filter（sticky 元素模糊是滚动卡顿主因）；所有 `transition:all` 批量替换为显式属性列表（正则）；60s 定时器加 document.hidden 守卫；加 prefers-reduced-motion 支持。
- 测试：扩展到 80 项断言（新增考勤多场次/一键出勤/点名切换/场次增删/旧数据迁移用例），80/80 通过。
- 部署：page transaction 发布版本 3，链接不变 https://workbuddy.link/p/dwdEoNhVC7PTX6HkCGwOCE；静态地址验证 v2.2 标记存在、backdrop-filter 与 transition:all 均已清零。
- 工程注意：onclick 内联参数需 Utils.q() 双层转义（先 JS 反斜杠/引号，再 &quot;），仅 Utils.esc 会因 HTML 实体解码回引号而破坏 JS 字符串。

## 班主任工作台 v2.1 发布（承接 08-20 的 v2.0）

- 需求：值日表周天数可设（高中周日晚补课）、一周第一天周一/周日可选、座次表每周自动换座（多方向+环形回绕+指定两人交换）、作业布置内容与完成情况汇总、考勤请假/缺勤名单直接显示。
- 实现：新增 Store 键 dutyDaysPerWeek / weekStart / seatAutoRotate / seatRotateDir / seatRotatedWeek；homework 条目升级为 {subject, content, notSubmitted[]}；换座用模运算 `(r+dr+R)%R, (c+dc+C)%C` 实现环形回绕；周锚点 mondayOf 在 weekStart=sunday 且今天周日时 base+1。
- 测试：test-v2.js 扩到 64 项断言（新增测试 14-20 覆盖周天数/周首日/换座回绕/互换/自动换座去重/作业内容汇总/考勤名单），64/64 通过。测试中发现并修复真实 bug：renderTodayTasks 排序用了错误变量 t→a。
- 部署：page transaction 协议发布版本 2，同一链接 https://workbuddy.link/p/dwdEoNhVC7PTX6HkCGwOCE；部署后经静态地址（shell 页 __PUBLISH_BOOTSTRAP__ 里取 versioned URL）字节级验证 v2.1 特性标记全部存在。
- 工程注意：
  - 本机无 venv python，调用 skill-library page 脚本要用 `C:\Users\12741\.workbuddy\binaries\python\versions\3.13.12\python.exe`，且 token 必须走 `--token-stdin`（`--token` 参数无效）。
  - PowerShell 工具无 stdout 回显，统一重定向到文件再用 BOM 重编码后 Read。
  - jsdom 回归测试：const 不挂 window，须用 `w.eval()`；DOM ready 须 `await sleep(150)`；与星期相关的断言先用 scheduleAdjust 钉死 effectiveDay。
