/* ============================================================
   🚩 Question report + বাতিল (void) question
   Student: যেকোনো সময় (exam চলাকালীন, result review, vault) 🚩 → preset কারণ + note → POST action=report.
   Teacher: 🚩 Reports tab (🔔 badge) → ✅ Approve = question বাতিল (ঐ সময়ের আগের সব attempt থেকে বাদ, score নতুন করে হিসাব;
            ঠিক না হওয়া পর্যন্ত নতুন exam-এ আসে না) · ✖ Reject · ✏ Edit করে ঠিক করলে (বা "ঠিক হয়েছে") আবার আগের মতো আসে।
   VOIDS = {EXAM:{qi:[{at, fx}]}} (public, from ?action=settings). adj(r) = record with voided questions removed (used by allRawH).
   ============================================================ */
const REP_WHY = [['typo', '✏️ Typing / বানান ভুল'], ['noopt', '❌ সঠিক option নেই'], ['key', '🔑 Answer key ভুল'], ['multi', '☑️ একাধিক option সঠিক'],
  ['sol', '📝 Solution ভুল / নেই'], ['unclear', '❓ Question অস্পষ্ট / অসম্পূর্ণ'], ['math', '🖼 Math / চিহ্ন ঠিকমতো দেখাচ্ছে না'], ['other', '💬 অন্য কিছু']];
const whyL = k => (REP_WHY.find(x => x[0] === k) || [k, k])[1];

/* ---------- void periods + score adjustment ---------- */
let VOIDS = LS.get('mq_voids', {}) || {}, VOIDV = 1;
function setVoids(v){ VOIDS = v && typeof v === 'object' ? v : {}; LS.set('mq_voids', VOIDS); VOIDV++; }
const vPeriods = (ex, qi) => (VOIDS[ex] && VOIDS[ex][qi]) || [];
const voidActive = (ex, qi) => { const l = vPeriods(ex, qi); return !!(l.length && !l[l.length - 1].fx); };
/* attempt-এর সময় t-তে question টা ভুল অবস্থায় ছিল কিনা (প্রতিটা period: আগের fix থেকে এই fix পর্যন্ত) */
function voidAt(ex, qi, t){
  let from = 0;
  for(const p of vPeriods(ex, qi)){ if(t >= from && (!p.fx || t < p.fx)) return true; from = p.fx || Infinity; }
  return false;
}
const ADJ = typeof WeakMap === 'function' ? new WeakMap() : null;
/* বাতিল question বাদ দিয়ে record: d থেকে সরে vd-তে যায়, score/total নতুন (negative mark-ও ফেরত), raw = আগের score */
function adj(r){
  if(!r || !VOIDS[r.exam] || !Array.isArray(r.d)) return r;
  const c = ADJ && ADJ.get(r); if(c && c.v === VOIDV) return c.r;
  const t = aidTime(r.aid), keep = [], vd = [];
  r.d.forEach(x => (voidAt(r.exam, x[0], t) ? vd : keep).push(x));
  let out = r;
  if(vd.length){
    const ok = r.d.filter(x => x[2]).length, wr = r.d.filter(x => x[1] >= 0 && !x[2]).length;
    const neg = wr ? Math.max(0, (ok - r.score) / wr) : ((EXAMS[r.exam] && EXAMS[r.exam].neg) || 0);
    let sc = r.score; vd.forEach(x => { if(x[2]) sc -= 1; else if(x[1] >= 0) sc += neg; });
    out = {...r, d:keep, vd, score:+sc.toFixed(2), total:Math.max(0, r.total - vd.length), raw:{score:r.score, total:r.total}};
  }
  if(ADJ) ADJ.set(r, {v:VOIDV, r:out});
  return out;
}

/* ---------- student: report popup ---------- */
let RPT = null;   // {ex, qi, why, note, msg, busy, done}
const canReport = () => !!SESS && !SESS.teacher && CFG.rules.report !== false && (!SESS.guest || CFG.rules.reportGuest !== false);
const repDone = (ex, qi) => LS.get('mq_rep', []).includes(ex + '|' + qi) || MYREP.some(r => r.exam === ex && r.qi === qi && r.st === 'new');
const repBtn = (ex, qi) => canReport() ? `<button class="btn sm ghost rpb" data-e="${esc(ex)}" onclick="event.stopPropagation();openRep(this.dataset.e,${qi})" title="Question-এ ভুল? Report করো">🚩${repDone(ex, qi) ? ' ✓' : ''}</button>` : '';
function openRep(ex, qi){ if(!canReport()) return; RPT = {ex, qi:+qi, why:'', note:'', msg:'', busy:false, done:false}; render(true); }
function vRepPopup(){
  const q = qinfo(RPT.ex, RPT.qi), na = RPT.drawn ? ' style="animation:none"' : ''; RPT.drawn = true;
  const body = RPT.done ? `<div class="notice good">${esc(RPT.msg)}</div><button class="btn full" onclick="RPT=null;render(true)">ঠিক আছে</button>` :
    `<small class="muted">কী সমস্যা? একটা বাছাই করো</small>
    <div class="chips repw">${REP_WHY.map(([k, l]) => `<button class="chip ${RPT.why === k ? 'on' : ''}" onclick="RPT.why='${k}';RPT.msg='';render(true)">${l}</button>`).join('')}</div>
    <textarea rows="3" maxlength="500" placeholder="বিস্তারিত লিখো (ঐচ্ছিক) — যেমন কোন option ঠিক হওয়া উচিত" oninput="RPT.note=this.value">${escT(RPT.note)}</textarea>
    ${RPT.msg ? `<div class="err">${esc(RPT.msg)}</div>` : ''}
    <div class="row"><button class="btn ghost" onclick="RPT=null;render(true)">${esc(T('cancel'))}</button><button class="btn" ${RPT.busy ? 'disabled' : ''} onclick="sendRep()">${RPT.busy ? 'পাঠানো হচ্ছে…' : '🚩 Report পাঠাও'}</button></div>`;
  return `<div class="modal"${na} onclick="if(event.target===this){RPT=null;render(true)}"><div class="card"${na}><h2 style="margin-top:0">🚩 Question report</h2>
    ${q ? `<div class="repq">${esc(String(LQ(q, (RUN && RUN.lang) || RVLANG || prefLang()).q || '').slice(0, 220))}</div>` : ''}${body}</div></div>`;
}
async function sendRep(){
  if(!RPT || RPT.busy) return;
  if(!RPT.why){ RPT.msg = 'একটা কারণ বাছাই করো'; return render(true); }
  if(RPT.why === 'other' && !RPT.note.trim()){ RPT.msg = 'কী সমস্যা সেটা লিখে দাও'; return render(true); }
  RPT.busy = true; RPT.msg = ''; render(true);
  const q = qinfo(RPT.ex, RPT.qi);
  const b = new URLSearchParams({action:'report', sid:SESS.sid, name:SESS.name, exam:RPT.ex, qi:String(RPT.qi), why:RPT.why, note:RPT.note.trim(), q:q ? String(q.q).slice(0, 300) : ''});
  let ok = true;
  try{ await fetch(CONFIG.SCRIPT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:b}); }catch(e){ ok = false; }
  if(!RPT) return;
  RPT.busy = false;
  if(ok){
    const L = LS.get('mq_rep', []); if(!L.includes(RPT.ex + '|' + RPT.qi)) L.push(RPT.ex + '|' + RPT.qi); LS.set('mq_rep', L.slice(-300));
    RPT.done = true; RPT.msg = '✅ Report পাঠানো হয়েছে। Teacher দেখে ঠিক করবেন — ধন্যবাদ!';
  } else RPT.msg = '⚠ পাঠানো যায়নি — internet দেখে আবার চেষ্টা করো।';
  render(true);
}

/* ---------- student: my reports (status + notice) ---------- */
let MYREP = [];
async function loadMyRep(){
  if(!CONFIG.SCRIPT_URL || !SESS || SESS.teacher) return;
  try{ const r = await jget(CONFIG.SCRIPT_URL + '?action=myreports&sid=' + encodeURIComponent(SESS.sid) + '&t=' + Date.now()); if(Array.isArray(r)) MYREP = r; }catch(e){}
}
const ST_TAG = {new:['⏳ দেখা হয়নি', '#e5e7eb', '#374151'], approved:['✅ Approved — question বাতিল', '#dcfce7', '#15803d'], fixed:['🔧 ঠিক করা হয়েছে', '#dbeafe', '#1d4ed8'], rejected:['✖ মেনে নেওয়া হয়নি', '#fee2e2', '#b91c1c']};
const stTag = st => { const t = ST_TAG[st] || ST_TAG.new; return `<span class="tag" style="background:${t[1]};color:${t[2]}">${t[0]}</span>`; };
function vMyRep(){
  if(!SESS || SESS.teacher || CFG.rules.reportNotify === false || !MYREP.length) return '';
  const sk = 'mq_repseen_' + norm(SESS.sid), seen = LS.get(sk, 0), fresh = MYREP.filter(r => r.dts > seen && r.st !== 'new');
  const qt = r => { const q = qinfo(r.exam, r.qi); return q ? esc(String(q.q).slice(0, 90)) : 'Q' + (r.qi + 1); };
  let h = '';
  if(fresh.length) h += `<div class="notice ${fresh.some(r => r.st !== 'rejected') ? 'good' : 'warn'}"><b>🚩 তোমার report-এর উত্তর এসেছে</b>${fresh.map(r => `<div style="margin:5px 0"><b>${esc(r.exam)}</b> · ${qt(r)}<br>${stTag(r.st)}${r.st === 'approved' ? ' <small>score নতুন করে হিসাব হয়েছে</small>' : ''}</div>`).join('')}
    <button class="btn sm ghost" onclick="LS.set('${sk}',${Math.max(...fresh.map(r => r.dts))});render(true)">ঠিক আছে</button></div>`;
  h += sec('b_rep', '🚩 আমার reports', MYREP.slice().reverse().map(r => `<div class="hist" style="display:block"><div class="muted">${esc(r.exam)} · ${esc(whyL(r.why))} · ${esc(exitWhen(r.at))}</div><div>${qt(r)}</div>${stTag(r.st)}</div>`).join(''), MYREP.length + '');
  return h;
}

/* ---------- teacher: 🚩 Reports tab ---------- */
let REPS = {reports:[], notify:{}}, REPF = 'todo', RQMSG = {}, RQBUSY = '';
async function loadReps(){
  if(!CONFIG.SCRIPT_URL || !SESS || !SESS.teacher) return false;
  try{
    const r = await jget(CONFIG.SCRIPT_URL + '?action=reports&key=' + encodeURIComponent(TKEY()) + '&t=' + Date.now());
    if(!r || !r.ok) return false;
    REPS = {reports:r.reports || [], notify:r.notify || {}}; setVoids(r.voids);
    const need = [...new Set(REPS.reports.map(x => x.exam))].filter(c => !EXAMS[c]);
    await Promise.all(need.map(c => getExam(c)));
    return true;
  }catch(e){ return false; }
}
const repNew = () => REPS.reports.filter(r => r.st === 'new').length;
function repGroups(){
  const m = {};
  REPS.reports.forEach(r => { const k = r.exam + '|' + r.qi; (m[k] = m[k] || {k, exam:r.exam, qi:r.qi, list:[]}).list.push(r); });
  Object.keys(VOIDS).forEach(ex => Object.keys(VOIDS[ex]).forEach(qi => { const k = ex + '|' + qi; if(!m[k] && voidActive(ex, +qi)) m[k] = {k, exam:ex, qi:+qi, list:[]}; }));
  return Object.values(m).map(g => ({...g, nNew:g.list.filter(r => r.st === 'new').length, act:voidActive(g.exam, g.qi), last:Math.max(0, ...g.list.map(r => r.at))}))
    .sort((a, b) => (b.nNew > 0) - (a.nNew > 0) || b.act - a.act || b.last - a.last);
}
/* এই question আছে এমন attempt কয়টা (বাতিল হলে যেগুলোর score বদলাবে/বদলেছে) */
const qAttempts = (ex, qi) => allRawH().filter(r => r.exam === ex && !isExit(r) && (r.d.some(x => x[0] === qi) || (r.vd || []).some(x => x[0] === qi))).length;
function vReports(){
  const G = repGroups(), todo = G.filter(g => g.nNew || g.act), show = REPF === 'todo' ? todo : G;
  let h = `<div class="row" style="margin:6px 0"><h2 style="margin:0">🚩 Question reports</h2><button class="btn ghost sm" onclick="refresh()">${loading ? 'Syncing…' : '↻ Refresh'}</button></div>
    <div class="chips" style="display:flex;gap:6px;margin:6px 0 10px"><button class="chip ${REPF === 'todo' ? 'on' : ''}" onclick="REPF='todo';render(true)">কাজ বাকি <small>${todo.length}</small></button><button class="chip ${REPF === 'all' ? 'on' : ''}" onclick="REPF='all';render(true)">সব <small>${G.length}</small></button></div>
    <small class="muted">✅ Approve = question বাতিল: আগের সব attempt থেকে বাদ দিয়ে score নতুন করে হিসাব হবে, আর ঠিক না করা পর্যন্ত exam-এ আসবে না। ✏ Edit করে Save দিলে (বা "ঠিক হয়েছে" চাপলে) আবার আগের মতো আসবে।</small>`;
  if(!show.length) return h + `<div class="card muted center">${G.length ? 'সব report দেখা হয়ে গেছে 👍' : 'এখনো কোনো report আসেনি।'}</div>`;
  return h + show.map(g => {
    const q = qinfo(g.exam, g.qi), per = vPeriods(g.exam, g.qi), fx = per.length && !g.act ? per[per.length - 1].fx : 0;
    const cnt = {}; g.list.forEach(r => { cnt[r.why] = (cnt[r.why] || 0) + 1; });
    const st = g.act ? '<span class="tag" style="background:#fee2e2;color:#b91c1c">🚫 বাতিল — ঠিক করা বাকি</span>' : g.nNew ? `<span class="tag" style="background:#fef3c7;color:#b45309">🔔 ${g.nNew} নতুন</span>` : fx ? '<span class="tag" style="background:#dbeafe;color:#1d4ed8">🔧 ঠিক করা হয়েছে</span>' : '<span class="tag">✖ Rejected</span>';
    const busy = RQBUSY === g.k ? 'disabled' : '', dd = `data-e="${esc(g.exam)}" data-q="${g.qi}"`, B = (op, l, cls) => `<button class="btn sm ${cls || ''}" ${busy} ${dd} onclick="qAct(this.dataset.e,+this.dataset.q,'${op}')">${l}</button>`;
    const btns = [];
    if(g.nNew) btns.push(B('approve', g.act ? '✅ Approve (যোগ করো)' : '✅ Approve — question বাতিল'), B('reject', '✖ Reject', 'ghost'));
    if(g.act) btns.push(`<button class="btn sm" ${busy} ${dd} onclick="openFix(this.dataset.e,+this.dataset.q)">✏ Edit করে ঠিক করো</button>`, B('fix', '🔧 ঠিক হয়েছে — আবার চালু', 'ghost'), B('undo', '↩ Approve ফিরিয়ে নাও', 'ghost'));
    const na = qAttempts(g.exam, g.qi);
    return `<div class="card repc"><div class="row" style="margin:0"><b>${esc(g.exam)} · Q${g.qi + 1}</b>${st}</div>
      ${q ? `<div class="q" style="font-size:.95em;margin:8px 0">${esc(q.q)}</div>${q.o.map((o, i) => `<div class="opt ${i === q.a ? 'ok' : ''}" style="margin:3px 0;padding:6px 8px"><span class="L">${LET[i]}</span><span>${esc(o)}${i === q.a ? ' <small>✔ answer key</small>' : ''}</span></div>`).join('')}${q.e ? `<div class="exp">💡 ${esc(q.e)}</div>` : ''}` : '<div class="muted">Question পাওয়া যায়নি (exam মুছে ফেলা হয়েছে?)</div>'}
      <div class="chips" style="display:flex;flex-wrap:wrap;gap:5px;margin:8px 0">${Object.entries(cnt).map(([k, n]) => `<span class="chip" style="cursor:default">${esc(whyL(k))}${n > 1 ? ' <small>×' + n + '</small>' : ''}</span>`).join('')}</div>
      ${g.list.slice().reverse().map(r => `<div class="hist" style="display:block;padding:6px 0"><b>${esc(r.name || r.sid)}</b> <small>${esc(r.sid)} · ${esc(exitWhen(r.at))}</small> ${stTag(r.st)}<br><small>${esc(whyL(r.why))}</small>${r.note ? `<div style="font-size:14px">“${esc(r.note)}”</div>` : ''}</div>`).join('')}
      <small class="muted">${na} টা attempt-এ এই question আছে${g.act ? ' — সবগুলো থেকে বাদ দিয়ে score হিসাব হচ্ছে' : ''}${fx ? ' · ঠিক করা হয়েছে ' + esc(dDay(fx)) : ''}</small>
      ${btns.length ? `<div class="row" style="margin:10px 0 0;justify-content:flex-start;gap:6px;flex-wrap:wrap">${btns.join('')}</div>` : ''}
      ${RQMSG[g.k] ? `<div class="notice ${/^✅|^🔧|^↩|^✖/.test(RQMSG[g.k]) ? 'good' : /^⚠/.test(RQMSG[g.k]) ? 'warn' : 'info'}" style="margin-top:8px">${esc(RQMSG[g.k])}</div>` : ''}</div>`;
  }).join('');
}
async function qAct(code, qi, op){
  const k = code + '|' + qi;
  if(RQBUSY) return;
  RQBUSY = k; RQMSG[k] = '⏳ Server-এ পাঠানো হচ্ছে…'; render(true);
  await tPost({action:'qvoid', code, qi:String(qi), op});
  const noNew = () => !REPS.reports.some(r => r.exam === code && r.qi === qi && r.st === 'new');
  const done = {approve:() => voidActive(code, qi) && noNew(), reject:noNew, fix:() => !voidActive(code, qi), undo:() => !voidActive(code, qi)}[op];
  let ok = false;
  for(let i = 0; i < 6 && !ok; i++){ ok = (await loadReps()) && done(); if(!ok) await sleep(1300); }
  RQBUSY = '';
  RQMSG[k] = !ok ? '⚠ Server থেকে নিশ্চিত হওয়া যায়নি — একটু পরে ↻ Refresh করো।' : {
    approve:'✅ Question বাতিল — ' + qAttempts(code, qi) + ' টা attempt-এর score নতুন করে হিসাব হয়েছে। এখন ✏ Edit করে ঠিক করো।',
    reject:'✖ Report reject করা হয়েছে (question আগের মতোই থাকবে)।',
    fix:'🔧 আবার চালু — নতুন exam-এ question টা আগের মতো আসবে। পুরোনো attempt-এ বাদই থাকবে।',
    undo:'↩ Approve ফিরিয়ে নেওয়া হয়েছে — score আগের মতো।'}[op];
  render(true);
}
async function openFix(code, qi){
  await openEditor(code);
  if(!EDX) return;
  EDX.focus = qi; render();
  setTimeout(() => { const el = $('#qed' + qi); if(el && el.scrollIntoView) el.scrollIntoView({block:'center'}); }, 60);
}
/* editor: বাতিল question বদলানো হলে save-এর পরে auto "ঠিক হয়েছে" */
const qSig = q => JSON.stringify([String(q.q).trim(), (q.o || []).map(s => String(s).trim()).filter(Boolean), q.a, String(q.e || '').trim(), String(q.qb || '').trim(), (q.ob || []).map(s => String(s).trim()), String(q.eb || '').trim()]);
async function autoFix(x){
  const fixed = x.qs.map((q, i) => i).filter(i => voidActive(x.code, i) && x.orig && x.orig[i] !== undefined && qSig(x.qs[i]) !== x.orig[i]);
  for(const i of fixed) await tPost({action:'qvoid', code:x.code, qi:String(i), op:'fix'});
  if(fixed.length){ for(let k = 0; k < 6; k++){ await loadCfg(); if(fixed.every(i => !voidActive(x.code, i))) break; await sleep(1300); } }
  return fixed;
}
const vEdVoid = (code, i) => voidActive(code, i) ? `<div class="notice bad" style="margin:4px 0 8px">🚫 এই question বাতিল আছে (report approved)। ঠিক করে নিচে <b>Save</b> দিলে আবার exam-এ আগের মতো আসবে।</div>` : '';

/* ---------- teacher settings: Gmail notification (private, not in public cfg) ---------- */
function vNotifySet(){
  const n = REPS.notify || {};
  return `<label class="chk"><input type="checkbox" id="nfon" ${n.on ? 'checked' : ''}><span>📧 নতুন report এলে Gmail-এও পাঠাও</span></label>
    <input id="nfto" type="email" placeholder="তোমার Gmail address" value="${esc(n.to || '')}">
    <button class="btn ghost sm" onclick="saveNotify()">💾 Save email setting</button>
    <div><small class="muted">App-এর ভেতরে 🔔 notification সবসময় থাকে। Gmail প্রথমবার চালু করতে একবার Google permission দিতে হবে — Claude-কে বলো <b>"gmail chalu koro"</b>।</small></div>
    ${n.on && n.err ? `<div class="notice warn">⚠ Gmail পাঠানো যাচ্ছে না: ${esc(n.err)}</div>` : ''}${NFMSG ? `<div class="notice info">${esc(NFMSG)}</div>` : ''}`;
}
let NFMSG = '';
async function saveNotify(){
  const on = !!($('#nfon') && $('#nfon').checked), to = ($('#nfto') && $('#nfto').value || '').trim();
  if(on && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)){ NFMSG = 'সঠিক email address দাও'; return render(true); }
  NFMSG = 'Saving…'; render(true);
  await tPost({action:'setnotify', on:on ? 'YES' : 'NO', to});
  let ok = false;
  for(let i = 0; i < 6 && !ok; i++){ await loadReps(); ok = !!REPS.notify.on === on && (REPS.notify.to || '') === to; if(!ok) await sleep(1300); }
  NFMSG = ok ? '✅ Saved' : '⚠ Save confirm হয়নি'; render(true);
}
