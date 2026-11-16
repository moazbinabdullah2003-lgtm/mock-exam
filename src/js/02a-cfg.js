/* ============================================================
   Settings engine (CFG): teacher UI থেকে edit হয়, backend 'Settings' sheet-এ save হয়
   ============================================================ */
/* Theme presets — শুধু রং দিলে style (shadow/shape ইত্যাদি) আগেরটা থাকে; পুরো "look" দিলে সব বদলায়.
   n = গ্যালারিতে নাম, d = ছোট বর্ণনা */
const PRESETS = {
  classic:  {n:'Classic Blue', d:'পরিষ্কার, professional', primary:'#2563eb', bg:'#f5f7fb', card:'#ffffff', text:'#0f172a', ok:'#16a34a', bad:'#dc2626', bgStyle:'gradient', shadow:'soft', radius:16, btnShape:'rounded', family:'system'},
  mint:     {n:'Mint Fresh', d:'হালকা সবুজ, চোখে আরাম', primary:'#0d9488', bg:'#f0fdfa', card:'#ffffff', text:'#0f2a27', ok:'#16a34a', bad:'#e11d48', bgStyle:'gradient', shadow:'soft', radius:18, btnShape:'rounded', family:'system'},
  lavender: {n:'Lavender', d:'নরম বেগুনি, modern', primary:'#7c3aed', bg:'#f7f5ff', card:'#ffffff', text:'#1e1633', ok:'#16a34a', bad:'#e11d48', bgStyle:'gradient', shadow:'soft', radius:20, btnShape:'pill', family:'round'},
  coral:    {n:'Coral', d:'উষ্ণ, বন্ধুত্বপূর্ণ', primary:'#f43f5e', bg:'#fff6f5', card:'#ffffff', text:'#2b1517', ok:'#16a34a', bad:'#b91c1c', bgStyle:'gradient', shadow:'soft', radius:18, btnShape:'rounded', family:'round'},
  sky:      {n:'Sky Pill', d:'উজ্জ্বল নীল, গোল button', primary:'#0ea5e9', bg:'#f0f9ff', card:'#ffffff', text:'#0c1e2e', ok:'#10b981', bad:'#ef4444', bgStyle:'dots', shadow:'soft', radius:22, btnShape:'pill', family:'system'},
  notebook: {n:'Notebook', d:'খাতার মতো, পড়তে আরাম', primary:'#1d4ed8', bg:'#fbfaf5', card:'#fffefa', text:'#1f2937', ok:'#15803d', bad:'#b91c1c', bgStyle:'dots', shadow:'none', radius:10, btnShape:'square', family:'serif'},
  minimal:  {n:'Minimal', d:'সাদা-কালো, একদম simple', primary:'#111827', bg:'#fafafa', card:'#ffffff', text:'#111827', ok:'#16a34a', bad:'#dc2626', bgStyle:'plain', shadow:'none', radius:12, btnShape:'rounded', family:'system'},
  emerald:  {n:'Emerald', d:'গাঢ় সবুজ, শান্ত', primary:'#059669', bg:'#f2f8f5', card:'#ffffff', text:'#0f241b', ok:'#16a34a', bad:'#dc2626', bgStyle:'plain', shadow:'strong', radius:16, btnShape:'rounded', family:'system'},
  night:    {n:'Night Blue', d:'Dark mode, রাতে পড়তে', primary:'#60a5fa', bg:'#0b1220', card:'#131c2e', text:'#e2e8f0', ok:'#34d399', bad:'#f87171', bgStyle:'gradient', shadow:'none', radius:16, btnShape:'rounded', family:'system'},
  grape:    {n:'Dark Grape', d:'Dark + বেগুনি', primary:'#a78bfa', bg:'#110f17', card:'#1c1826', text:'#ede9fe', ok:'#4ade80', bad:'#fb7185', bgStyle:'dots', shadow:'none', radius:18, btnShape:'pill', family:'round'},
  // পুরোনো preset (শুধু রং)
  indigo:   {n:'Indigo', d:'আগের default', primary:'#4f46e5', bg:'#f3f4f6', card:'#ffffff', text:'#111827'},
  ocean:    {n:'Ocean', d:'নীল', primary:'#0284c7', bg:'#eef6fb', card:'#ffffff', text:'#0f172a'},
  forest:   {n:'Forest', d:'সবুজ', primary:'#15803d', bg:'#f0f7f1', card:'#ffffff', text:'#14231a'},
  sunset:   {n:'Sunset', d:'কমলা', primary:'#ea580c', bg:'#fdf4ec', card:'#ffffff', text:'#2a1a10'},
  rose:     {n:'Rose', d:'গোলাপি', primary:'#e11d48', bg:'#fdf0f3', card:'#ffffff', text:'#2a1119'},
  paper:    {n:'Paper', d:'পুরোনো কাগজ', primary:'#92400e', bg:'#f5efe0', card:'#fffaf0', text:'#2b2418'},
  midnight: {n:'Midnight', d:'Dark', primary:'#818cf8', bg:'#0f172a', card:'#1e293b', text:'#e5e7eb'},
  black:    {n:'Black', d:'পুরো কালো', primary:'#34d399', bg:'#000000', card:'#111111', text:'#f3f4f6'}
};
const FONTS = {
  system: 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Bengali",sans-serif',
  serif:  'Georgia,"Times New Roman","Noto Serif Bengali",serif',
  mono:   'ui-monospace,Menlo,Consolas,monospace',
  round:  '"Trebuchet MS","Nunito","Noto Sans Bengali",sans-serif'
};
const DEF_CFG = {
  theme:  {preset:'indigo', primary:'#4f46e5', bg:'#f3f4f6', card:'#ffffff', text:'#111827', ok:'#16a34a', bad:'#dc2626', radius:16, font:16, family:'system',
           bgStyle:'gradient', shadow:'soft', density:'normal', width:'normal', btnShape:'rounded', hero:34, align:'center', anim:true},
  brand:  {title:"Muaz's Classroom", tagline:'Practice smart, score high ✨', emoji:'📚', notice:'', noticeType:'info', intro:'', footer:''},
  text:   {},
  access: {guest:true, teacherId:'teacher'},
  rules:  {review:'full', explain:true, showScore:true, passMark:0, retake:true, mistakes:true, maxAttempts:0,
           timer:true, confirm:true, analytics:true, history:true},
  exams:  {}   // per exam: {maxAttempts, start, end, intro, shuffle:''|'yes'|'no'}
};
/* UI label defaults (teacher "Texts" section-এ যেকোনোটা বদলানো যায়) */
const TX = {
  chooseTitle:'কীভাবে ঢুকবে?', chStudent:'ID আর password দিয়ে', chGuest:'শুধু নাম আর exam code', chTeacher:'Dashboard ও control panel', hello:'হ্যালো', statAttempts:'Exams given', statAvg:'Average', statBest:'Best', focusTitle:'🎯 কোন topic-এ practice দরকার', trendTitle:'📈 Score trend', retakeTitle:'🔁 আবার দাও',
  tabStudent:'Student', tabGuest:'Guest', tabTeacher:'Teacher', idPh:'ID', passPh:'Password', loginBtn:'Login', guestHint:'নাম আর exam code দিয়ে সরাসরি exam দাও', guestNamePh:'তোমার নাম', back:'← Back', guestBtn:'Start exam ▶',
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
    --pad:${{compact:'12px', normal:'18px', roomy:'24px'}[t.density] || '18px'};--w:${{narrow:'620px', normal:'760px', wide:'1000px'}[t.width] || '760px'};
    --btnr:${{pill:'999px', square:'4px'}[t.btnShape] || Math.min(t.radius, 14) + 'px'};--hero:${t.hero || 34}px;
    --sh:${{none:'none', strong:'0 2px 4px rgba(0,0,0,.06),0 10px 30px rgba(0,0,0,.14)'}[t.shadow] || '0 1px 2px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.06)'}}
    body{font-size:${t.font}px;font-family:${FONTS[t.family] || FONTS.system}}`;
  if(typeof document === 'undefined' || !document.head || !document.createElement) return;
  if(!st){ st = document.createElement('style'); st.id = 'mq-theme'; document.head.appendChild(st); }
  st.textContent = css;
  try{
    document.documentElement.classList.toggle('anim', t.anim !== false);
    if(document.body){ document.body.classList.remove('bg-gradient', 'bg-dots'); if(t.bgStyle === 'gradient' || t.bgStyle === 'dots') document.body.classList.add('bg-' + t.bgStyle); }
  }catch(e){}
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
