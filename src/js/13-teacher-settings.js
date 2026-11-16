/* ============================================================
   Teacher control panel: tabs, Settings, Students (roster), Save
   ============================================================ */
let CD = null, ROSTER = [], ROSTER_OK = false, SO = {}, saveMsg = '', EDX = null;
const eA = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const clone = o => JSON.parse(JSON.stringify(o));
const gpIn = (o, p) => p.split('.').reduce((x, k) => x == null ? x : x[k], o);
const gp = p => { const v = gpIn(CD, p); return v === undefined ? gpIn(DEF_CFG, p) : v; };   // নতুন key পুরোনো saved settings-এ না থাকলে default
function sp(path, v){
  const k = path.split('.'); let o = CD;
  for(let i = 0; i < k.length - 1; i++) o = o[k[i]] = o[k[i]] || {};
  o[k[k.length - 1]] = v; DIRTY = true; saveMsg = '';
  CFG = deepMerge(DEF_CFG, CD); applyTheme();
  const m = document.getElementById('dirty'); if(m) m.textContent = '● unsaved changes';
}
/* field builders (data-p keeps odd characters safe) */
const fT = (p, l, ph) => `<label class="fld"><span>${l}</span><input data-p="${eA(p)}" value="${eA(gp(p))}" placeholder="${eA(ph || '')}" oninput="sp(this.dataset.p,this.value)"></label>`;
const fA = (p, l, ph, rows) => `<label class="fld"><span>${l}</span><textarea data-p="${eA(p)}" rows="${rows || 3}" placeholder="${eA(ph || '')}" oninput="sp(this.dataset.p,this.value)">${escT(gp(p))}</textarea></label>`;
const fN = (p, l, min, max) => `<label class="fld"><span>${l}</span><input type="number" min="${min == null ? 0 : min}" ${max != null ? 'max="' + max + '"' : ''} data-p="${eA(p)}" value="${eA(gp(p))}" oninput="sp(this.dataset.p,this.value===''?0:Number(this.value))"></label>`;
const fC = (p, l) => `<label class="fld"><span>${l}</span><input type="color" data-p="${eA(p)}" value="${eA(gp(p))}" oninput="sp(this.dataset.p,this.value)"></label>`;
const fR = (p, l, min, max) => `<label class="fld"><span>${l}: <b>${eA(gp(p))}</b></span><input type="range" min="${min}" max="${max}" data-p="${eA(p)}" value="${eA(gp(p))}" oninput="this.previousElementSibling.lastElementChild.textContent=this.value;sp(this.dataset.p,Number(this.value))"></label>`;
const fS = (p, l, opts) => `<label class="fld"><span>${l}</span><select data-p="${eA(p)}" onchange="sp(this.dataset.p,this.value)">${opts.map(([v, t]) => `<option value="${eA(v)}" ${String(gp(p)) === String(v) ? 'selected' : ''}>${eA(t)}</option>`).join('')}</select></label>`;
const fK = (p, l) => `<label class="chk"><input type="checkbox" data-p="${eA(p)}" ${gp(p) ? 'checked' : ''} onchange="sp(this.dataset.p,this.checked)"><span>${l}</span></label>`;
/* collapsible section (open/closed state survives re-render) — used on every page */
const sec = (id, title, body, sub) => `<details class="sec" ${SO[id] ? 'open' : ''} ontoggle="SO['${id}']=this.open"><summary><span>${title}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</summary><div class="in">${body}</div></details>`;

function vTabs(){
  const t = [['dash','📊 Dashboard'],['exams','📚 Exams'],['stu','👥 Students'],['set','⚙ Settings']];
  return `<div class="tabs">${t.map(([k, l]) => `<button class="${TTAB === k ? 'on' : ''}" onclick="gotoTab('${k}')">${l}</button>`).join('')}</div>`;
}
async function gotoTab(k){
  TTAB = k; EDX = null; TSTU = null; EXA = null;
  if(!DIRTY || !CD) CD = clone(CFG);
  render();
  if(k === 'stu' && !ROSTER_OK) await loadRoster();
}
async function loadRoster(){
  if(!CONFIG.SCRIPT_URL) return;
  try{
    const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=roster&key=' + encodeURIComponent(TKEY()) + '&t=' + Date.now())).json();
    if(Array.isArray(r)){ ROSTER = r; ROSTER_OK = true; }
  }catch(e){}
  render(true);
}
function vSaveBar(){
  return `<div class="savebar"><button class="btn full" id="savebtn" onclick="saveAll()">💾 Save all changes</button>
    <div style="text-align:center;font-size:13px;margin-top:4px;color:${saveMsg.charAt(0) === '✅' ? 'var(--g)' : 'var(--r)'}" id="dirty">${DIRTY ? '● unsaved changes' : ''}${esc(saveMsg)}</div></div>`;
}
async function saveAll(){
  if(!CD) return;
  if(!CONFIG.SCRIPT_URL){ saveMsg = 'Script URL নেই'; return render(true); }
  saveMsg = 'Saving…'; render(true);
  const cfgStr = JSON.stringify(CD);
  await tPost({action:'savecfg', cfg:cfgStr});
  let rosterStr = null;
  if(ROSTER_OK){ rosterStr = JSON.stringify(ROSTER.filter(r => String(r.id).trim())); await tPost({action:'saveroster', roster:rosterStr}); }
  let okC = false, okR = rosterStr === null;
  for(let i = 0; i < 7 && !(okC && okR); i++){
    await sleep(1300);
    try{
      if(!okC){ const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=settings&t=' + Date.now())).json(); okC = !!(r && r.ok && JSON.stringify(r.cfg) === cfgStr); }
      if(!okR){ const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=roster&key=' + encodeURIComponent(TKEY()) + '&t=' + Date.now())).json(); okR = Array.isArray(r) && JSON.stringify(r) === rosterStr; }
    }catch(e){}
  }
  if(okC && okR){ DIRTY = false; LS.set('mq_cfg', clone(CD)); saveMsg = '✅ Saved — student-রা এখন নতুন settings দেখবে'; }
  else saveMsg = '⚠ Save confirm হয়নি। Code.gs-এর নতুন version deploy করা আছে কিনা, আর password ঠিক কিনা দেখো।';
  render(true);
}

/* ---------------- Settings tab ---------------- */
function applyPreset(n){
  const {n:_n, d:_d, sci:_s, ...pv} = PRESETS[n];
  CD.theme = {...CD.theme, ...pv, preset:n}; DIRTY = true; saveMsg = '';
  CFG = deepMerge(DEF_CFG, CD); applyTheme(); render(true);
}
function resetSec(k){
  if(k === 'theme') CD.theme = clone(DEF_CFG.theme);
  if(k === 'text') CD.text = {};
  if(k === 'rules') CD.rules = clone(DEF_CFG.rules);
  if(k === 'brand') CD.brand = clone(DEF_CFG.brand);
  DIRTY = true; CFG = deepMerge(DEF_CFG, CD); applyTheme(); render(true);
}
function vSettings(){
  if(!CD) CD = clone(CFG);
  const cur = CD.theme.preset;
  const card = ([k, p]) => { const pr = Math.min(p.radius || 14, 16), mo = p.motif && p.motif !== 'none' ? motifURL(p.motif, p.motifInk === 'text' ? p.text : p.primary) : '';
    return `<button class="thm ${cur === k ? 'on' : ''}" onclick="applyPreset('${k}')">
      <div class="thp${mo ? ' mo' : ''}" style="background:${p.bg};border-radius:${pr}px">${mo ? `<i style="position:absolute;inset:0;background-image:${mo.replace(/"/g, "'")};background-size:150px;opacity:${Math.min(.6, (p.motifOp || 12) * 3 / 100)}"></i>` : ''}<div style="background:${p.boxStyle && p.boxStyle !== 'plain' ? `linear-gradient(150deg,color-mix(in srgb,${p.primary} 18%,${p.card}),${p.card} 75%)` : p.card};${p.boxStyle && p.boxStyle !== 'plain' ? 'border-top:3px solid ' + p.primary + ';' : ''}color:${p.text};border-radius:${pr - 4}px;${p.shadow === 'none' ? 'border:1px solid ' + p.text + '22' : 'box-shadow:0 2px 6px rgba(0,0,0,.12)'}"><b style="font-family:${FONTS[p.family] || FONTS.system}">Aa</b><span style="background:${p.primary};border-radius:${p.btnShape === 'pill' ? '99px' : p.btnShape === 'square' ? '2px' : '6px'}"></span></div></div>
      ${p.c2 && p.boxStyle !== 'plain' ? `<div class="thd">${[p.primary, p.c2, p.c3, p.c4].map(x => `<i style="background:${x}"></i>`).join('')}</div>` : ''}<b>${esc(p.n || k)}${cur === k ? ' ✓' : ''}</b><small>${esc(p.d || '')}</small></button>`; };
  const all = Object.entries(PRESETS), sw = `<h3 class="thh">🔬 Science themes (symbol সহ)</h3><div class="thg">${all.filter(e => e[1].sci).map(card).join('')}</div>
    <h3 class="thh">🎨 Color themes</h3><div class="thg">${all.filter(e => !e[1].sci).map(card).join('')}</div>`;
  const theme = `<small class="muted">একটা theme-এ tap করো — সাথে সাথে পুরো app-এ preview হবে। পছন্দ হলে নিচে Save।</small>${sw}<h3>🎛 নিজের মতো বদলাও</h3>
    <div class="g2">${fC('theme.primary', 'Main color')}${fC('theme.bg', 'Page background')}${fC('theme.card', 'Card background')}${fC('theme.text', 'Text color')}${fC('theme.ok', 'Correct color')}${fC('theme.bad', 'Wrong color')}</div>
    ${fR('theme.radius', 'Corner roundness', 0, 28)}${fR('theme.font', 'Font size', 13, 20)}
    ${fS('theme.family', 'Font style', [['system','Default (clean)'],['serif','Serif (book)'],['mono','Monospace'],['round','Rounded']])}
    <h3>🖼 Layout & style (সব page-এ)</h3>
    <div class="g2">${fS('theme.bgStyle', 'Background style', [['plain','Plain'],['gradient','Soft gradient'],['dots','Dots pattern']])}
    ${fS('theme.shadow', 'Card shadow', [['none','None (flat)'],['soft','Soft'],['strong','Strong']])}
    ${fS('theme.density', 'Spacing', [['compact','Compact'],['normal','Normal'],['roomy','Roomy']])}
    ${fS('theme.width', 'Page width (computer-এ)', [['narrow','Narrow'],['normal','Normal'],['wide','Wide']])}
    ${fS('theme.btnShape', 'Button shape', [['rounded','Rounded'],['pill','Pill'],['square','Square']])}
    ${fS('theme.align', 'Login page title', [['center','Center'],['left','Left']])}</div>
    ${fR('theme.hero', 'Login page title size', 22, 48)}
    ${fK('theme.anim', '✨ Animation (page খুললে আস্তে আস্তে আসবে)')}
    <h3>🔬 Background symbols (বিজ্ঞানের pattern)</h3>
    <div class="g2">${fS('theme.motif', 'Symbol type', Object.entries(MOTIFS).map(([k, m]) => [k, m.n]))}
    ${fS('theme.motifInk', 'Symbol color', [['primary','Main color'],['text','Text color (chalk look)']])}</div>
    ${fR('theme.motifOp', 'Symbol কতটা গাঢ় (%)', 3, 35)}${fR('theme.motifSize', 'Symbol size (%)', 60, 180)}
    ${fK('theme.motifQuiz', 'Exam চলার সময়ও symbol দেখাবে (off থাকলে exam page পরিষ্কার থাকে)')}${fK('theme.heroSym', 'Login page-এর title-এর পাশে বড় symbol')}
    <h3>🧱 Box / card-এর look</h3>
    ${fS('theme.boxStyle', 'Box style', [['plain','Plain (সাদামাটা)'],['tint','Tint — main color-এর হালকা আভা + উপরে রঙিন দাগ'],['rainbow','Rainbow — প্রতিটা box আলাদা রঙ'],['bold','Bold — রঙিন tile + রঙিন icon']])}
    <div class="g2">${fC('theme.c2', 'Extra color 2')}${fC('theme.c3', 'Extra color 3')}${fC('theme.c4', 'Extra color 4')}</div>
    ${fK('theme.boxSym', '🔬 Box-এর ভেতরেও symbol texture (কোণার দিকে; উপরের Symbol type লাগবে)')}${fR('theme.boxSymOp', 'Box-এর symbol কতটা গাঢ় (%)', 5, 80)}
    <button class="btn ghost sm" onclick="resetSec('theme')">↺ Reset theme</button>`;
  const brand = `${fT('brand.title', 'App / brand name')}${fT('brand.tagline', 'Tagline (login page-এ নামের নিচে)')}${fT('brand.emoji', 'Logo emoji')}
    ${fA('brand.notice', '📢 Notice / announcement (login + home page-এ দেখাবে)', 'যেমন: কাল CT, সবাই প্রস্তুত থাকো', 3)}
    ${fS('brand.noticeType', 'Notice style', [['info','Info (blue)'],['warn','Warning (yellow)'],['good','Good (green)'],['bad','Alert (red)']])}
    ${fA('brand.intro', '📋 Exam instructions (exam শুরুর আগে popup হিসেবে দেখাবে; ফাঁকা = দেখাবে না)', 'যেমন: ১ ঘণ্টা সময়। Negative marking আছে।', 4)}
    ${fT('brand.footer', 'Footer text')}
    <button class="btn ghost sm" onclick="resetSec('brand')">↺ Reset</button>`;
  const texts = `<small class="muted">ফাঁকা রাখলে default text থাকবে। Placeholder-এ default দেখানো আছে।</small>` +
    Object.keys(TX).map(k => fT('text.' + k, k, TX[k])).join('') + `<button class="btn ghost sm" onclick="resetSec('text')">↺ Reset all texts</button>`;
  const rules = `${fS('rules.review', '📝 Exam শেষে student কী দেখবে (review)', [['full','Full — সঠিক উত্তর + explanation'],['marks','শুধু ✅/❌ (সঠিক উত্তর দেখাবে না)'],['none','কিছুই না (review বন্ধ)']])}
    ${fK('rules.showScore', 'Score / percentage দেখাবে')}${fK('rules.explain', 'Explanation (solution) দেখাবে')}${fN('rules.passMark', 'Pass mark % (0 = বন্ধ)', 0, 100)}
    ${fK('rules.retake', 'Full exam আবার দেওয়া যাবে')}${fK('rules.mistakes', '"Retake mistakes" button')}${fN('rules.maxAttempts', 'প্রতি exam-এ max attempt (0 = unlimited)', 0)}
    <small class="muted">🔀 Question আর option order প্রতি attempt-এ সবসময় এলোমেলো হয় (বন্ধ করা যায় না)।</small>${fK('rules.timer', 'Timer দেখাবে')}${fK('rules.confirm', 'Submit-এর আগে confirm জিজ্ঞেস করবে')}
    ${fK('rules.analytics', 'Student নিজের Analytics দেখবে')}${fK('rules.history', 'Student নিজের History দেখবে')}
    <button class="btn ghost sm" onclick="resetSec('rules')">↺ Reset rules</button>`;
  const sec2 = `${fT('access.teacherId', 'Teacher ID (login-এ এটা লাগবে)', 'teacher')}<small class="muted">Teacher password বদলাও (কমপক্ষে ৪ অক্ষর)। বদলালে নতুন password দিয়ে আবার login করতে হবে।</small>
    <input id="np1" type="password" placeholder="New password"><input id="np2" type="password" placeholder="Confirm new password">
    <button class="btn ghost full" onclick="changePass()">🔐 Change password</button>`;
  return `<h2 style="margin:6px 0">⚙ App Settings</h2><small class="muted">যা বদলাবে তা সাথে সাথে preview হবে। শেষে নিচের Save চাপলে সব student দেখবে।</small>
    ${sec('theme', '🎨 Theme & look', theme)}${sec('brand', '🏷 Branding, notice & instructions', brand)}${sec('rules', '📋 Exam rules & features', rules)}${sec('texts', '✏️ All button / label texts', texts)}${sec('pw', '🔐 Security', sec2)}${vSaveBar()}`;
}
async function changePass(){
  const a = $('#np1').value, b = $('#np2').value;
  if(a.length < 4){ saveMsg = 'Password কমপক্ষে ৪ অক্ষর'; return render(true); }
  if(a !== b){ saveMsg = 'দুটো password মিলছে না'; return render(true); }
  await tPost({action:'setpass', newpass:a});
  for(let i = 0; i < 6; i++){
    await sleep(1300);
    try{ const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=tlogin&key=' + encodeURIComponent(a) + '&t=' + Date.now())).json(); if(r && r.ok){ SESS.key = a; LS.set('mq_sess', SESS); saveMsg = '✅ Password বদলেছে'; return render(true); } }catch(e){}
  }
  saveMsg = '⚠ Password বদলানো confirm হয়নি';
  render(true);
}

/* ---------------- Students tab ---------------- */
function rset(i, k, v){ ROSTER[i][k] = v; DIRTY = true; saveMsg = ''; const m = document.getElementById('dirty'); if(m) m.textContent = '● unsaved changes'; }
function radd(){ ROSTER.push({id:'', name:'', pin:'', blocked:false}); DIRTY = true; render(true); }
function rdel(i){ ROSTER.splice(i, 1); DIRTY = true; render(true); }
function rbulk(){
  const t = ($('#bulk') || {}).value || '';
  t.split('\n').forEach(l => {
    const p = l.split(/[,\t;]/).map(x => x.trim());
    if(!p[0]) return;
    const ex = ROSTER.find(r => norm(r.id) === norm(p[0]));
    if(ex){ ex.pin = p[1] || ex.pin; ex.name = p[2] || ex.name; } else ROSTER.push({id:p[0], pin:p[1] || '', name:p[2] || '', blocked:false});
  });
  DIRTY = true; render(true);
}
function rgen(){
  ROSTER.forEach(r => { if(!String(r.pin || '').trim()) r.pin = String(Math.floor(1000 + Math.random() * 9000)); });
  DIRTY = true; saveMsg = ''; render(true);
}
function rfromAttempts(){
  const seen = {};
  allRecs().forEach(r => { seen[norm(r.sid)] = r.name; });
  Object.entries(seen).forEach(([id, name]) => { if(!ROSTER.find(r => norm(r.id) === id)) ROSTER.push({id, name, pin:'', blocked:false}); });
  DIRTY = true; render(true);
}
function vStudents(){
  if(!CD) CD = clone(CFG);
  const cnt = {}; allRecs().forEach(r => { cnt[norm(r.sid)] = (cnt[norm(r.sid)] || 0) + 1; });
  const rows = ROSTER.map((r, i) => `<div class="card" style="margin:8px 0;padding:10px"><div class="g2">
      <input placeholder="ID" value="${eA(r.id)}" oninput="rset(${i},'id',this.value)"><input placeholder="Password" value="${eA(r.pin)}" oninput="rset(${i},'pin',this.value)" style="${String(r.pin || '').trim() ? '' : 'border-color:var(--r)'}">
      <input placeholder="Name (optional)" value="${eA(r.name)}" oninput="rset(${i},'name',this.value)">
      <div class="row" style="margin:0"><label class="chk" style="margin:0"><input type="checkbox" ${r.blocked ? 'checked' : ''} onchange="rset(${i},'blocked',this.checked)"><span>Block</span></label>
      <small>${cnt[norm(r.id)] || 0} attempts</small><button class="btn sm ghost" onclick="openStu(String(ROSTER[${i}].id).trim())">👤 Profile</button><button class="btn sm ghost" onclick="rdel(${i})">✕</button></div></div></div>`).join('');
  return `<h2 style="margin:6px 0">👥 Students & Access</h2>
    <div class="card">${fK('access.guest', '👤 Guest login চালু (শুধু exam code দিয়ে ওই exam দিতে পারবে)')}
    <small class="muted">Student শুধু <b>ID + Password</b> দিয়ে ঢোকে। নিচের তালিকায় যাদের ID আর Password আছে শুধু তারাই ঢুকতে পারবে। Password খালি থাকলে ওই ID ঢুকতে পারবে না।</small></div>
    ${!CONFIG.SCRIPT_URL ? '<div class="warn">Script URL নেই</div>' : !ROSTER_OK ? '<div class="card muted">Loading roster…</div>' : `
    <div class="card"><b>${ROSTER.length} students in roster</b>
      <div class="row"><button class="btn sm ghost" onclick="radd()">+ Add student</button><button class="btn sm ghost" onclick="rfromAttempts()">⇣ Import from past attempts</button></div>
      <div class="row" style="margin-top:6px"><button class="btn sm ghost" onclick="rgen()">🎲 Password নেই এমন সবাইকে random password দাও</button></div>
      <h3>Bulk add (প্রতি লাইনে: ID, Password, Name — Name না দিলেও চলবে)</h3>
      <textarea id="bulk" rows="4" placeholder="101, 1234, Rahim&#10;102, 5678"></textarea>
      <button class="btn ghost full" onclick="rbulk()">Add / update from list</button></div>${rows}`}
    ${vSaveBar()}`;
}

/* ---------------- Export ---------------- */
function exportCSV(){
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const lines = ['Date,SID,Name,Exam,Mode,Score,Total,Percent,Seconds,Answered'].concat(allRaw().map(r =>
    [new Date(aidTime(r.aid)).toLocaleString(), r.sid, r.name, r.exam, r.mode, r.score, r.total, pct(r), r.secs, r.d.filter(x => x[1] >= 0).length].map(q).join(',')));   // exit row-ও থাকে (Mode = exit)
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], {type:'text/csv;charset=utf-8'}));
  a.download = 'results.csv'; document.body.appendChild(a); a.click(); a.remove();
}
