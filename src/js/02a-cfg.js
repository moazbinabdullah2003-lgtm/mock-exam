/* ============================================================
   Settings engine (CFG): teacher UI থেকে edit হয়, backend 'Settings' sheet-এ save হয়
   ============================================================ */
const PRESETS = {
  indigo:   {primary:'#4f46e5', bg:'#f3f4f6', card:'#ffffff', text:'#111827'},
  ocean:    {primary:'#0284c7', bg:'#eef6fb', card:'#ffffff', text:'#0f172a'},
  forest:   {primary:'#15803d', bg:'#f0f7f1', card:'#ffffff', text:'#14231a'},
  sunset:   {primary:'#ea580c', bg:'#fdf4ec', card:'#ffffff', text:'#2a1a10'},
  rose:     {primary:'#e11d48', bg:'#fdf0f3', card:'#ffffff', text:'#2a1119'},
  paper:    {primary:'#92400e', bg:'#f5efe0', card:'#fffaf0', text:'#2b2418'},
  midnight: {primary:'#818cf8', bg:'#0f172a', card:'#1e293b', text:'#e5e7eb'},
  black:    {primary:'#34d399', bg:'#000000', card:'#111111', text:'#f3f4f6'}
};
const FONTS = {
  system: 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Bengali",sans-serif',
  serif:  'Georgia,"Times New Roman","Noto Serif Bengali",serif',
  mono:   'ui-monospace,Menlo,Consolas,monospace',
  round:  '"Trebuchet MS","Nunito","Noto Sans Bengali",sans-serif'
};
const DEF_CFG = {
  theme:  {preset:'indigo', primary:'#4f46e5', bg:'#f3f4f6', card:'#ffffff', text:'#111827', ok:'#16a34a', bad:'#dc2626', radius:14, font:16, family:'system'},
  brand:  {title:'MCQ Mock Exam', emoji:'📝', notice:'', noticeType:'info', intro:'', footer:''},
  text:   {},
  access: {guest:true, teacherId:'teacher'},
  rules:  {review:'full', explain:true, showScore:true, passMark:0, retake:true, mistakes:true, maxAttempts:0,
           timer:true, confirm:true, analytics:true, history:true},
  exams:  {}   // per exam: {maxAttempts, start, end, intro, shuffle:''|'yes'|'no'}
};
/* UI label defaults (teacher "Texts" section-এ যেকোনোটা বদলানো যায়) */
const TX = {
  tabStudent:'Student', tabGuest:'Guest', tabTeacher:'Teacher', idPh:'ID', passPh:'Password', loginBtn:'Login', guestHint:'Exam code দিয়ে সরাসরি exam দাও', guestBtn:'Start exam ▶',
  startTitle:'Start exam', codePh:'Exam code', startBtn:'Start ▶', logout:'Logout',
  prev:'← Prev', next:'Next →', clear:'Clear', submit:'Submit', submitTitle:'Submit করবে?', submitYes:'Yes, Submit', cancel:'Cancel',
  allAnswered:'সব answer দেওয়া হয়েছে।', unanswered:'টা question unanswered আছে।',
  correct:'Correct', wrong:'Wrong', skipped:'Skipped', topicWise:'Topic-wise', reviewTitle:'Review', yourAnswer:'(তোমার answer)',
  retakeMistakes:'Retake mistakes', fullAgain:'Full again', back:'← Back', analytics:'My Analytics', history:'History',
  pass:'🎉 Passed!', fail:'আরেকটু practice করো 💪', reviewLocked:'Review এখন বন্ধ আছে।',
  errCode:'Exam code ভুল', errClosed:'এই exam এখন বন্ধ', errLogin:'ID বা Password ভুল', errBlocked:'এই ID বন্ধ করা আছে', errGuestOff:'Guest login এখন বন্ধ', errGuestExam:'এই exam-এ guest হিসেবে দেওয়া যাবে না',
  errLimit:'এই exam-এর attempt limit শেষ', errNotStarted:'Exam এখনো শুরু হয়নি', errEnded:'Exam-এর সময় শেষ', introStart:'শুরু করো'
};
const T = k => { const v = CFG.text && CFG.text[k]; return v != null && v !== '' ? v : TX[k]; };

function deepMerge(a, b){
  const o = Array.isArray(a) ? a.slice() : {...a};
  if(b && typeof b === 'object') for(const k in b){
    if(b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = deepMerge(a[k], b[k]);
    else o[k] = b[k];
  }
  return o;
}
let DIRTY = false;
let CFG = deepMerge(DEF_CFG, LS.get('mq_cfg', {}));

function applyTheme(c){
  c = c || CFG;
  const t = c.theme;
  let st = typeof document !== 'undefined' && document.getElementById && document.getElementById('mq-theme');
  const css = `:root{--p:${t.primary};--g:${t.ok};--r:${t.bad};--bg:${t.bg};--card:${t.card};--t:${t.text};--rad:${t.radius}px;
    --pl:color-mix(in srgb,${t.primary} 13%,${t.card});--gl:color-mix(in srgb,${t.ok} 16%,${t.card});--rl:color-mix(in srgb,${t.bad} 14%,${t.card});
    --m:color-mix(in srgb,${t.text} 58%,${t.card});--b:color-mix(in srgb,${t.text} 14%,${t.card})}
    body{font-size:${t.font}px;font-family:${FONTS[t.family] || FONTS.system}}`;
  if(typeof document === 'undefined' || !document.head || !document.createElement) return;
  if(!st){ st = document.createElement('style'); st.id = 'mq-theme'; document.head.appendChild(st); }
  st.textContent = css;
  try{ document.title = (c.brand.emoji ? c.brand.emoji + ' ' : '') + c.brand.title; }catch(e){}
}
function setCfg(remote){
  if(DIRTY) return;   // teacher-এর unsaved edit overwrite করবে না
  CFG = deepMerge(DEF_CFG, remote || {});
  LS.set('mq_cfg', remote || {});
  applyTheme();
  Object.keys(EXAMS).forEach(c => applyOv(EXAMS[c], c));
}
async function loadCfg(){
  if(!CONFIG.SCRIPT_URL) return;
  try{
    const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=settings&t=' + Date.now())).json();
    if(r && r.ok && r.cfg && typeof r.cfg === 'object'){ setCfg(r.cfg); return true; }
  }catch(e){}
  return false;
}

/* per-exam overrides: title/minutes/neg come from the sheet; rules/limits/window/intro from CFG.exams */
const exOv = code => (CFG.exams && CFG.exams[code]) || {};
function applyOv(e, code){
  if(!e || typeof e !== 'object') return e;
  const ov = exOv(code);
  e.shuffle = true;   // shuffle সবসময় চালু (বন্ধ করার option নেই)
  return e;
}
const attemptsOf = (sid, code) => allRecs().filter(r => norm(r.sid) === norm(sid) && r.exam === code && r.mode === 'full').length;
/* returns '' if the student may start, else the error message */
function canStart(code){
  const ov = exOv(code), now = Date.now();
  if(ov.start && now < new Date(ov.start).getTime()) return T('errNotStarted') + ' (' + new Date(ov.start).toLocaleString() + ')';
  if(ov.end && now > new Date(ov.end).getTime()) return T('errEnded');
  const mx = Number(ov.maxAttempts) || Number(CFG.rules.maxAttempts) || 0;
  if(mx && SESS && attemptsOf(SESS.sid, code) >= mx) return T('errLimit') + ' (' + mx + ')';
  return '';
}
const introOf = code => exOv(code).intro || CFG.brand.intro || '';
function vNotice(){
  const b = CFG.brand;
  return b.notice ? `<div class="notice ${esc(b.noticeType)}">${esc(b.notice)}</div>` : '';
}
