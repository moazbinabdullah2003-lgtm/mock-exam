/* ============================================================
   🔖 Saved-question vault (folder-wise) + ✕ Exam exit
   Vault: {ts, folders:['General', …], items:[{id:'EXAM#qi', f:folder, ex, qi, at, title, q:{q,o,a,t,e,qb?,ob?,eb?}}]}
   - এই device-এ LS 'mq_vault_<sid>' + student account-এ sync (backend action=vault / savevault, ID+password বা teacher key)
   - সঠিক উত্তর/solution vault-এ দেখায়, তবে শুধু সেই exam অন্তত একবার submit করার পরে (বাতিল করে উত্তর দেখে আবার দেওয়া আটকাতে)
   ============================================================ */
let VSAVE = null;      // save popup: {ex, qi, f, nf}
let VF = '';           // vault page folder filter ('' = সব)
let VSYNC = '';        // sync status text
let VLANG = '';        // vault-এর ভাষা ('' = prefLang)
let EXITING = false;   // exam exit popup: false | true | 'cancel'
const VDEF = 'General';
const vKey = () => 'mq_vault_' + norm(SESS ? SESS.sid : '');
function vGet(){
  const v = LS.get(vKey(), null) || {};
  return {ts:v.ts || 0, folders:Array.isArray(v.folders) && v.folders.length ? v.folders : [VDEF], items:Array.isArray(v.items) ? v.items : []};
}
function vPut(v){ v.ts = Date.now(); if(!v.folders.includes(VDEF)) v.folders.unshift(VDEF); LS.set(vKey(), v); vPush(); }
const vCan = () => !!(CONFIG.SCRIPT_URL && SESS && !SESS.teacher && !SESS.guest && (SESS.pin || (SESS.back && SESS.back.key)));
const vAuth = () => 'sid=' + encodeURIComponent(SESS.sid) + (SESS.pin ? '&pin=' + encodeURIComponent(SESS.pin) : '&key=' + encodeURIComponent(SESS.back.key));
const vSyncNote = () => !SESS || SESS.guest ? '📱 শুধু এই device-এ (guest)' : !vCan() ? '📱 এই device-এ আছে — সব device-এ পেতে একবার logout করে আবার login করো' : VSYNC;
const vSetSync = t => { VSYNC = t; const el = document.getElementById('vsync'); if(el) el.textContent = vSyncNote(); };
async function vPush(){
  if(!vCan()) return;
  const v = vGet(), body = new URLSearchParams(vAuth().split('&').map(x => x.split('=').map(decodeURIComponent)));
  body.set('action', 'savevault'); body.set('ts', String(v.ts)); body.set('vault', JSON.stringify(v));
  vSetSync('☁ Sync হচ্ছে…');
  try{
    await fetch(CONFIG.SCRIPT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
    for(let i = 0; i < 5; i++){
      await sleep(1200);
      const r = await jget(CONFIG.SCRIPT_URL + '?action=vault&' + vAuth() + '&t=' + Date.now());
      if(r && r.ok && r.ts >= v.ts) return vSetSync('☁ সব device-এ synced ✓');
    }
    vSetSync('⚠ Sync confirm হয়নি — এই device-এ save আছে, পরে আবার চেষ্টা হবে');
  }catch(e){ vSetSync('⚠ Network নেই — এই device-এ save আছে, পরে sync হবে'); }
}
async function vPull(){
  if(!vCan()) return;
  try{
    const r = await jget(CONFIG.SCRIPT_URL + '?action=vault&' + vAuth() + '&t=' + Date.now());
    if(!r || !r.ok) return vSetSync(r && r.reason === 'denied' ? '⚠ Sync হয়নি — logout করে আবার login করো' : '');
    const loc = vGet();
    if(r.vault && (r.ts || 0) > loc.ts){ LS.set(vKey(), {...r.vault, ts:r.ts}); vSetSync('☁ সব device-এ synced ✓'); if(view === 'vault' || view === 'home') render(true); }
    else if(loc.ts > (r.ts || 0)) await vPush();
    else vSetSync('☁ সব device-এ synced ✓');
  }catch(e){}
}
const vFind = (ex, qi) => vGet().items.find(x => x.ex === ex && x.qi === qi);
const vSnap = q => { const s = {q:q.q, o:q.o.slice(), a:q.a, t:q.t, e:q.e}; if(q.qb){ s.qb = q.qb; s.ob = (q.ob || []).slice(); s.eb = q.eb || ''; } return s; };

/* ---- save popup ---- */
function saveQ(ex, qi){
  const it = vFind(ex, qi);
  VSAVE = {ex, qi, f:it ? it.f : LS.get('mq_vlast', VDEF), nf:''};
  if(!vGet().folders.includes(VSAVE.f)) VSAVE.f = VDEF;
  render(true);
}
function doSaveQ(){
  const s = VSAVE; if(!s) return;
  const e = EXAMS[s.ex], q = e && e.questions[s.qi]; if(!q){ VSAVE = null; return render(true); }
  const v = vGet(), nf = String(s.nf || '').trim().slice(0, 40);
  let f = nf || s.f || VDEF;
  const same = v.folders.find(x => x.toLowerCase() === f.toLowerCase());
  if(same) f = same; else v.folders.push(f);
  const id = s.ex + '#' + s.qi, old = v.items.find(x => x.id === id);
  if(old){ old.f = f; old.q = vSnap(q); }
  else v.items.push({id, f, ex:s.ex, qi:s.qi, at:Date.now(), title:e.title || s.ex, q:vSnap(q)});
  LS.set('mq_vlast', f); VSAVE = null; vPut(v); render(true);
}
function unsaveQ(id){ const v = vGet(); v.items = v.items.filter(x => x.id !== id); VSAVE = null; vPut(v); render(true); }
function vSavePopup(){
  const s = VSAVE; if(!s) return '';
  const v = vGet(), it = vFind(s.ex, s.qi), cnt = f => v.items.filter(x => x.f === f).length;
  return `<div class="modal"><div class="card"><h2 style="margin-top:0">🔖 ${it ? 'Saved question' : 'Question save করো'}</h2>
    <div class="muted" style="margin-bottom:8px">কোন folder-এ রাখবে?</div>
    <div class="vfs">${v.folders.map(f => `<button class="chip ${s.f === f && !s.nf ? 'on' : ''}" data-f="${eA(f)}" onclick="VSAVE.f=this.dataset.f;VSAVE.nf='';render(true)">📁 ${esc(f)} <small>${cnt(f)}</small></button>`).join('')}</div>
    <input id="vnf" placeholder="➕ অথবা নতুন folder-এর নাম (যেমন Physics – Ch 3)" value="${eA(s.nf)}" oninput="VSAVE.nf=this.value" maxlength="40">
    <div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn ghost" onclick="VSAVE=null;render(true)">${esc(T('cancel'))}</button>
      ${it ? `<button class="btn ghost red" onclick="unsaveQ('${eA(it.id)}')">🗑 Vault থেকে সরাও</button>` : ''}
      <button class="btn" onclick="doSaveQ()">${it ? '✓ Folder বদলাও' : '🔖 Save'}</button></div></div></div>`;
}
const vSaveBtn = (ex, qi, sm) => SESS && !SESS.teacher ? `<button class="btn sm ghost ${vFind(ex, qi) ? 'saved' : ''}" onclick="saveQ('${eA(ex)}',${qi})" title="Vault-এ save">${vFind(ex, qi) ? '🔖 Saved' : '🔖 Save'}</button>` : '';

/* ---- vault page ---- */
function openVault(){ VF = ''; view = 'vault'; render(); vPull(); }
function vNewFolder(){
  const n = String(prompt('নতুন folder-এর নাম:') || '').trim().slice(0, 40); if(!n) return;
  const v = vGet(); if(!v.folders.some(x => x.toLowerCase() === n.toLowerCase())){ v.folders.push(n); vPut(v); }
  VF = v.folders.find(x => x.toLowerCase() === n.toLowerCase()); render(true);
}
function vRenameFolder(){
  const v = vGet(), o = VF; if(!o || o === VDEF) return;
  const n = String(prompt('Folder-এর নতুন নাম:', o) || '').trim().slice(0, 40); if(!n || n === o) return;
  if(v.folders.some(x => x.toLowerCase() === n.toLowerCase() && x !== o)){ alert('এই নামে folder আগে থেকেই আছে'); return; }
  v.folders = v.folders.map(x => x === o ? n : x); v.items.forEach(x => { if(x.f === o) x.f = n; }); VF = n; vPut(v); render(true);
}
function vDelFolder(){
  const v = vGet(), o = VF; if(!o || o === VDEF) return;
  const n = v.items.filter(x => x.f === o).length;
  if(!confirm('"' + o + '" folder মুছবে?' + (n ? ' এর ' + n + 'টা question "' + VDEF + '"-এ চলে যাবে।' : ''))) return;
  v.folders = v.folders.filter(x => x !== o); v.items.forEach(x => { if(x.f === o) x.f = VDEF; }); VF = ''; vPut(v); render(true);
}
function vMove(id, f){ const v = vGet(), it = v.items.find(x => x.id === id); if(it && v.folders.includes(f)){ it.f = f; vPut(v); render(true); } }
function vRemove(id){ if(confirm('এই question vault থেকে সরাবে?')) unsaveQ(id); }
const vSeen = it => !!SESS && allRecs().some(r => norm(r.sid) === norm(SESS.sid) && r.exam === it.ex);
function vCopy(id, btn){
  const it = vGet().items.find(x => x.id === id); if(!it) return;
  const seen = vSeen(it), q = LQ(it.q, VLANG || prefLang());
  copyText(`I am a student. Help me understand this MCQ question I saved from my exam "${it.title}". ${AI_NOTE}\nExplain step by step and tell me the concept behind it. Then give 1 similar practice question.\n\n` + aiQ(q, 1, undefined, seen ? 'full' : 'none', seen), btn);
}
function vVault(){
  const v = vGet(), all = v.items.slice().sort((a, b) => b.at - a.at), list = VF ? all.filter(x => x.f === VF) : all;
  const lg = VLANG || prefLang(), bi = all.some(x => x.q && x.q.qb);
  let h = `<div class="top"><button class="link" onclick="view='home';render()">${esc(T('back'))}</button><small id="vsync">${esc(vSyncNote())}</small></div>
    <h2 style="margin:6px 0">🔖 Saved questions <small class="muted">(${all.length})</small></h2>
    <div class="vfs"><button class="chip ${!VF ? 'on' : ''}" onclick="VF='';render(true)">সব <small>${all.length}</small></button>${v.folders.map(f => `<button class="chip ${VF === f ? 'on' : ''}" data-f="${eA(f)}" onclick="VF=this.dataset.f;render(true)">📁 ${esc(f)} <small>${all.filter(x => x.f === f).length}</small></button>`).join('')}
      <button class="chip" onclick="vNewFolder()">➕ Folder</button></div>
    ${VF && VF !== VDEF ? `<div class="row" style="justify-content:flex-start;gap:6px;margin:4px 0"><button class="btn sm ghost" onclick="vRenameFolder()">✏ Rename</button><button class="btn sm ghost" onclick="vDelFolder()">🗑 Folder মুছো</button></div>` : ''}
    ${bi ? `<div class="row" style="justify-content:flex-start;gap:6px;margin:6px 0"><small class="muted">🌐 ভাষা:</small> ${Object.entries(LANGS).map(([k, n]) => `<button class="btn sm ${lg === k ? '' : 'ghost'}" onclick="VLANG='${k}';render(true)">${n}</button>`).join('')}</div>` : ''}`;
  if(!list.length) return h + `<div class="card muted center">${all.length ? 'এই folder-এ কোনো question নেই।' : 'এখনো কিছু save করোনি। Exam দেওয়ার সময় বা result-এর review-তে <b>🔖 Save</b> চাপলে question এখানে জমা হবে।'}</div>`;
  return h + list.map(it => {
    const q = LQ(it.q, lg), seen = vSeen(it);
    return `<div class="card vq"><div class="row" style="margin:0 0 6px"><small class="muted">${esc(it.title)} · ${esc(q.t || '')} · 📁 ${esc(it.f)}</small>
        <span style="white-space:nowrap"><button class="btn sm ghost" onclick="vCopy('${eA(it.id)}',this)" title="AI-এর জন্য copy">📋</button> <button class="btn sm ghost" onclick="vRemove('${eA(it.id)}')" title="সরাও">🗑</button></span></div>
      <div class="q" style="font-size:1em">${esc(q.q)}</div>
      ${q.o.map((o, i) => `<div class="opt ${seen && i === q.a ? 'ok' : ''}" style="margin:4px 0;padding:8px;cursor:default"><span class="L">${LET[i]}</span><span>${esc(o)}</span></div>`).join('')}
      ${seen ? (q.e ? `<div class="exp">💡 ${esc(q.e)}</div>` : '') : '<small class="muted">🔒 এই exam submit করার পরে সঠিক উত্তর আর solution এখানে দেখা যাবে</small>'}
      <label class="fld" style="margin-top:8px"><span>📁 Folder</span><select data-id="${eA(it.id)}" onchange="vMove(this.dataset.id,this.value)">${v.folders.map(f => `<option value="${eA(f)}" ${f === it.f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label></div>`;
  }).join('');
}
const vHomeBtn = () => { const n = vGet().items.length; return `<button class="choice" style="margin:12px 0" onclick="openVault()"><span class="ic">🔖</span><span><b>Saved questions</b><small>${n ? n + 'টা question · folder-wise' : 'Exam-এর সময় 🔖 Save চাপলে এখানে জমা হবে'}</small></span></button>`; };

/* ---- ✕ exam exit ---- */
function cancelRun(){
  clearInterval(TM);
  if(RUN){   // exit-এর record: কতটা উত্তর দিয়েছিল, কত সময় পরে বের হলো — teacher-এর report-এর জন্য backend-এ যায়
    addTime();
    const e = EXAMS[RUN.exam], neg = (e && e.neg) || 0; let ok = 0, wr = 0;
    const d = RUN.order.map((qi, p) => { const q = e && e.questions[qi], c = RUN.ans[p] === undefined ? -1 : RUN.ans[p], g = q && c === q.a ? 1 : 0; if(c >= 0){ if(g) ok++; else wr++; } return [qi, c, g, Math.round(RUN.secs[p] || 0)]; });
    const rec = {aid:newAid(), sid:RUN.sid, name:RUN.name, exam:RUN.exam, mode:RUN.mode === 'mistakes' ? 'exit-mistakes' : 'exit',
      score:+(ok - wr * neg).toFixed(2), total:RUN.order.length, secs:Math.min(RUN.dur, Math.round((Date.now() - RUN.start) / 1000)), d};
    const loc = LS.get('mq_local', []); loc.push(rec); LS.set('mq_local', loc);
    const ob = LS.get('mq_out', []); ob.push(rec); LS.set('mq_out', ob);
  }
  LS.del('mq_run'); RUN = null; EXITING = false; confirming = false;
  view = 'home'; render(); refresh();
}
function vExitPopup(){
  if(!EXITING || !RUN) return '';
  if(EXITING === 'cancel') return `<div class="modal"><div class="card"><h2 style="margin-top:0">🗑 Exam বাতিল করবে?</h2>
    <p>এই attempt-এর কোনো result হবে না। <b>Attempt গুনবে না</b> — পরে আবার নতুন করে দিতে পারবে।</p><p class="muted" style="font-size:.92em">ℹ তবে exit-এর তথ্য (কখন, কতটা উত্তর দিয়েছিলে, কত সময় পরে বের হলে) teacher দেখতে পাবেন।</p>
    <div class="row"><button class="btn ghost" onclick="EXITING=true;render(true)">← না, ফিরে যাও</button><button class="btn red" onclick="cancelRun()">হ্যাঁ, বাতিল করো</button></div></div></div>`;
  const un = RUN.order.length - Object.keys(RUN.ans).length;
  return `<div class="modal"><div class="card"><h2 style="margin-top:0">✕ Exam থেকে বের হবে?</h2>
    <p class="muted">কোনো সমস্যা হলে (ভুল exam, network, অন্য কাজ) এখান থেকে বের হতে পারো।${un ? ' এখনো ' + un + 'টা question-এর উত্তর দাওনি।' : ''}</p>
    <button class="btn full" style="margin:6px 0" onclick="EXITING=false;finish(false)">✅ Submit করে বের হও <small>(result save হবে)</small></button>
    <button class="btn full ghost red" style="margin:6px 0" onclick="EXITING='cancel';render(true)">🗑 বাতিল করে বের হও <small>(result হবে না)</small></button>
    <button class="btn full ghost" style="margin:6px 0" onclick="EXITING=false;render(true)">↩ Exam-এ ফিরে যাও</button></div></div>`;
}
