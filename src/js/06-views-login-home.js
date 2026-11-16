/* ============================================================
   Views
   ============================================================ */
const TKEY = () => (SESS && SESS.key) || CONFIG.TEACHER_PASS;
function banner(){
  let s = '';
  if(!CAN_SYNC()) s += '<div class="warn">⚠ Script URL / Google Form link set করা নেই — result শুধু এই device-এ save হবে।</div>';
  return s;
}
let LMODE = '';   // '' = আগে choose screen; student | guest | teacher
const gid = () => { let g = LS.get('mq_gid', ''); if(!g){ g = 'G-' + Math.random().toString(36).slice(2, 6).toUpperCase(); LS.set('mq_gid', g); } return g; };
function setLM(m){ LMODE = m; msg = ''; NETERR = ''; render(); }
function vLogin(){
  const b = CFG.brand, A = CFG.access;
  const opts = [['student', T('tabStudent'), '🎓']].concat(A.guest ? [['guest', T('tabGuest'), '👤']] : []).concat([['teacher', T('tabTeacher'), '🧑‍🏫']]);
  if(!opts.some(t => t[0] === LMODE)) LMODE = '';
  const enter = f => `onkeydown="if(event.key==='Enter')${f}()"`;
  let card;
  if(!LMODE) card = `<div class="card"><div style="display:grid;gap:10px">${opts.map(([k, l, ic]) => `<button class="btn full" style="font-size:18px;padding:16px" onclick="setLM('${k}')">${ic} ${esc(l)}</button>`).join('')}</div></div>`;
  else{
    let body;
    if(LMODE === 'guest') body = `<div class="muted" style="margin-bottom:6px">${esc(T('guestHint'))}</div>
      <input id="gname" placeholder="${esc(T('guestNamePh'))}" autocomplete="name" maxlength="40">
      <input id="gcode" placeholder="${esc(T('codePh'))}" autocapitalize="characters" autocomplete="off" ${enter('doGuest')}>
      ${errBox()}<button class="btn full" onclick="doGuest()">${esc(T('guestBtn'))}</button>`;
    else body = `<input id="${LMODE === 'teacher' ? 'tid' : 'sid'}" placeholder="${esc(T('idPh'))}" autocomplete="username" autocapitalize="off">
      <input id="${LMODE === 'teacher' ? 'tp' : 'pw'}" type="password" placeholder="${esc(T('passPh'))}" autocomplete="current-password" ${enter(LMODE === 'teacher' ? 'doTeacher' : 'doLogin')}>
      ${errBox()}<button class="btn full" onclick="${LMODE === 'teacher' ? 'doTeacher' : 'doLogin'}()">${esc(T('loginBtn'))}</button>`;
    card = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>${esc(opts.find(o => o[0] === LMODE)[1])}</b><button class="link" onclick="setLM('')">${esc(T('back'))}</button></div>${body}</div>`;
  }
  return `<h1>${esc(b.emoji)} ${esc(b.title)}</h1>${banner()}${vNotice()}
  ${card}
  <div style="text-align:center"><button class="link" onclick="diag()">🔧 Connection check</button></div>${DIAG ? `<div class="card"><small>${esc(DIAG)}</small></div>` : ''}`;
}
/* Student: ID + Password (server-side, roster) */
async function doLogin(){
  const sid = norm($('#sid').value), pw = $('#pw').value;
  if(!sid || !pw){ msg = T('idPh') + ' + ' + T('passPh'); return render(true); }
  if(!CONFIG.SCRIPT_URL){ msg = 'Server set করা নেই'; return render(true); }
  msg = 'Checking…'; render(true);
  let r; NETERR = '';
  try{ r = await jget(CONFIG.SCRIPT_URL + '?action=login&sid=' + encodeURIComponent(sid) + '&pin=' + encodeURIComponent(pw) + '&t=' + Date.now()); }
  catch(e){ return netFail(e, 'doLogin'); }
  if(!r || Array.isArray(r) || !r.ok){ msg = r && r.reason === 'blocked' ? T('errBlocked') : T('errLogin'); return render(true); }
  SESS = {sid, name:r.name || sid, teacher:false}; LS.set('mq_sess', SESS); msg = ''; view = 'home'; render(); refresh();
}
/* Guest: শুধু নাম + exam code (ID/password লাগে না); ওই exam-ই দিতে পারবে */
async function doGuest(){
  const gn = $('#gname').value.trim().replace(/\s+/g, ' '), c = $('#gcode').value.trim().toUpperCase();
  if(!gn){ msg = T('guestNamePh'); return render(true); }
  if(!c){ msg = T('codePh'); return render(true); }
  if(!CFG.access.guest){ msg = T('errGuestOff'); return render(true); }
  NETERR = ''; msg = 'Loading…'; render(true);
  const e = await getExam(c);
  if(e === 'offline') return netFail(LASTERR, 'doGuest');
  NETERR = '';
  if(!e){ msg = T('errCode'); return render(true); }
  if(e.open === false){ msg = T('errClosed'); return render(true); }
  if(exOv(c).guest === 'no'){ msg = T('errGuestExam'); return render(true); }
  SESS = {sid:gid(), name:gn + ' (Guest)', teacher:false, guest:true, code:c};
  const why = canStart(c);
  if(why){ SESS = null; msg = why; return render(true); }
  LS.set('mq_sess', SESS); msg = ''; view = 'home'; render(); refresh();
}
/* Teacher: ID + Password */
async function doTeacher(){
  const id = ($('#tid').value || '').trim().toLowerCase(), pw = $('#tp').value;
  NETERR = ''; msg = 'Checking…'; render(true);
  let ok = false;
  if(CONFIG.SCRIPT_URL){
    try{
      await loadCfg();
      const r = await jget(CONFIG.SCRIPT_URL + '?action=tlogin&key=' + encodeURIComponent(pw) + '&t=' + Date.now());
      ok = r && !Array.isArray(r) && typeof r === 'object' ? !!r.ok : pw === CONFIG.TEACHER_PASS;   // পুরোনো backend হলে fallback
      NETERR = '';
    }catch(e){ return netFail(e, 'doTeacher'); }
  } else ok = pw === CONFIG.TEACHER_PASS;
  if(!ok || id !== String(CFG.access.teacherId || 'teacher').trim().toLowerCase()){ msg = T('errLogin'); return render(true); }
  SESS = {sid:'TEACHER', name:'Teacher', teacher:true, key:pw}; LS.set('mq_sess', SESS); msg = ''; view = 'teacher'; render(); refresh();
}
function logout(){ SESS = null; LS.del('mq_sess'); view = 'login'; LMODE = ''; TSTU = null; msg = ''; render(); }
async function refresh(){
  loading = true; render(true);
  await loadCfg(); await loadRemote(); if(SESS && SESS.teacher) await loadExamList(); await ensureExams(); await flush();
  loading = false;
  if(view === 'home' || view === 'teacher') render(true);
}

function vHome(){
  const s = SESS;
  const top = `<div class="top"><div><b>${esc(s.name)}</b> <small>${s.guest ? '' : 'ID: ' + esc(s.sid)}</small></div><button class="link" onclick="logout()">${esc(T('logout'))}</button></div>${banner()}${vNotice()}`;
  const intro = `${introFor ? `<div class="modal"><div class="card"><h2>${esc(introFor)}</h2><div>${esc(introOf(introFor))}</div>
    <div class="row"><button class="btn ghost" onclick="introFor='';render(true)">${esc(T('cancel'))}</button><button class="btn" onclick="const c=introFor;introFor='';startRun(c,'full')">${esc(T('introStart'))}</button></div></div></div>` : ''}`;
  if(s.guest){
    const e = EXAMS[s.code];
    return top + `<div class="card"><h2>${esc(e ? e.title : s.code)}</h2>
      <div class="muted">${esc(s.code)}${e ? ' · ' + e.questions.length + ' Q · ' + e.minutes + ' min' : ''}</div>
      ${errBox()}
      <button class="btn full" onclick="startGuest()">${esc(T('startBtn'))}</button></div>${intro}`;
  }
  return top + `
  <div class="card"><h2>${esc(T('startTitle'))}</h2>
    <input id="code" placeholder="${esc(T('codePh'))}" autocapitalize="characters" autocomplete="off" onkeydown="if(event.key==='Enter')startCode()">
    ${errBox()}
    <button class="btn full" onclick="startCode()">${esc(T('startBtn'))}</button>
  </div>
  ${CFG.rules.analytics ? vBoard(s.sid, false) : ''}${intro}`;
}
function startGuest(){
  const c = SESS.code, e = EXAMS[c];
  if(!e){ msg = T('errCode'); return render(true); }
  const why = canStart(c);
  if(why){ msg = why; return render(true); }
  msg = '';
  if(introOf(c)){ introFor = c; return render(true); }
  startRun(c, 'full');
}
let introFor = '';

async function getExam(code){
  if(CONFIG.SCRIPT_URL){
    let r;
    try{ r = await jget(CONFIG.SCRIPT_URL + '?action=exam&code=' + encodeURIComponent(code) + '&t=' + Date.now()); }
    catch(e){ LASTERR = e; return EXAMS[code] || 'offline'; }
    if(r && r.questions && r.questions.length){ applyOv(r, code); EXAMS[code] = r; LS.set('mq_exams', EXAMS); return r; }
    return null;
  }
  return EXAMS[code] || null;
}
async function ensureExams(){
  if(!CONFIG.SCRIPT_URL) return;
  const codes = [...new Set(allRecs().map(r => r.exam).concat(SESS && SESS.guest ? [SESS.code] : []))].filter(Boolean);
  await Promise.all(codes.map(c => getExam(c)));
}
async function startCode(){
  const c = $('#code').value.trim().toUpperCase();
  if(!c){ msg = T('codePh'); return render(true); }
  NETERR = ''; const er = document.querySelector('.err'); if(er) er.textContent = 'Loading…';
  const e = await getExam(c);
  if(e === 'offline') return netFail(LASTERR, 'startCode');
  NETERR = '';
  if(!e){ msg = T('errCode'); return render(true); }
  if(e.open === false){ msg = T('errClosed'); return render(true); }
  const why = canStart(c);
  if(why){ msg = why; return render(true); }
  msg = '';
  if(introOf(c)){ introFor = c; return render(true); }
  startRun(c, 'full');
}
const RUNKEY = (sid, exam, mode) => norm(sid) + '_' + exam + '_' + mode;
function startRun(exam, mode, idxs){
  const e = EXAMS[exam];
  applyOv(e, exam);
  let order = idxs && idxs.length ? idxs.slice() : e.questions.map((_, i) => i);
  /* সবসময় shuffle (settings দিয়ে বন্ধ করা যায় না): প্রতি attempt-এ question order আর option order নতুন করে এলোমেলো।
     একই student-এর আগের attempt-এর সাথে question order হুবহু এক হলে আবার shuffle করা হয়। */
  shuffle(order);
  const lk = 'mq_lo_' + RUNKEY(SESS.sid, exam, mode), prev = LS.get(lk, null);
  for(let k = 0; k < 20 && order.length > 1 && prev && prev.join() === order.join(); k++) shuffle(order);
  LS.set(lk, order);
  const op = {};
  /* "None of these / All of the above / Both…" option সবসময় শেষে থাকে, বাকিগুলো shuffle হয় */
  const PIN = /^\s*(none of (these|the above)|all of (these|the above)|both\b|উপরের সবগুলো|কোনোটিই নয়)/i;
  order.forEach(qi => {
    const pin = [], mv = [];
    e.questions[qi].o.forEach((t, i) => (PIN.test(t) ? pin : mv).push(i));
    op[qi] = shuffle(mv).concat(pin);
  });
  const perQ = e.minutes * 60 / e.questions.length;
  const dur = mode === 'mistakes' ? Math.max(60, Math.ceil(order.length * perQ)) : e.minutes * 60;
  RUN = {sid:SESS.sid, name:SESS.name, exam, mode, order, op, ans:{}, secs:{}, cur:0, start:Date.now(), dur, last:Date.now()};
  LS.set('mq_run', RUN); confirming = false; view = 'quiz'; render(); startTimer();
}
function retake(exam, mode){
  const e = EXAMS[exam];
  if(!e) return;
  if(mode === 'mistakes'){
    const w = wrongIdx(SESS.sid, exam);
    if(!w.length){ msg = 'কোনো ভুল নেই 🎉'; return render(); }
    startRun(exam, 'mistakes', w);
  } else {
    const why = canStart(exam);
    if(why){ msg = why; view = 'home'; return render(); }
    startRun(exam, 'full');
  }
}
