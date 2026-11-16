/* ============================================================
   📅 Date range (সময়সীমা) for every analytics page  +  ✏ teacher log editor (hide / unhide / permanent delete)
   DR = {p:'all'|'1'|'7'|'30'|'90'|'c', f:'YYYY-MM-DD', t:'YYYY-MM-DD'}  (LS mq_dr). Preset = শেষ n দিন (আজ সহ)।
   Analytics views use rng(list); history logic (attempt limit, retake mistakes, exit flags, vault) uses the full list.
   ============================================================ */
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
let DR = LS.get('mq_dr', {p:'all', f:'', t:''});
const DR_P = [['all', 'সব সময়'], ['1', 'আজ'], ['7', '৭ দিন'], ['30', '৩০ দিন'], ['90', '৯০ দিন']];
/* [fromMs, toMs] or null (= সব সময়) */
function drSpan(){
  if(!DR || !DR.p || DR.p === 'all') return null;
  if(DR.p !== 'c'){ const n = new Date(), f = new Date(n.getFullYear(), n.getMonth(), n.getDate() - (+DR.p) + 1); return [f.getTime(), Infinity]; }
  const f = DR.f ? new Date(DR.f + 'T00:00:00').getTime() : -Infinity, t = DR.t ? new Date(DR.t + 'T23:59:59.999').getTime() : Infinity;
  return [f, t];
}
const inDR = r => { const s = drSpan(); if(!s) return true; const t = aidTime(r.aid); return t >= s[0] && t <= s[1]; };
const rng = list => list.filter(inDR);
function saveDR(){ LS.set('mq_dr', DR); render(true); }
function setDRp(p){ DR = {p, f:'', t:''}; saveDR(); }
function setDRd(k, v){
  const s = drSpan(), cur = {f: DR.p === 'c' ? DR.f : s ? ymd(new Date(s[0])) : '', t: DR.p === 'c' ? DR.t : s ? ymd(new Date()) : ''};
  DR = {...cur, p:'c', [k]:v};
  if(DR.f && DR.t && DR.f > DR.t) DR = {...DR, f:DR.t, t:DR.f};
  if(!DR.f && !DR.t) DR = {p:'all', f:'', t:''};
  saveDR();
}
const dDay = ms => new Date(ms).toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'});
function drLabel(){
  const s = drSpan();
  if(!s) return 'সব সময়';
  return (s[0] === -Infinity ? 'শুরু' : dDay(s[0])) + ' → ' + (s[1] === Infinity ? 'আজ' : dDay(s[1]));
}
/* sc = log editor scope {s: sid, e: exam, x: '1' only exits}; all = এই page-এর সব log (সময়সীমা ছাড়া) */
const scMatch = (r, sc) => (!sc.s || norm(r.sid) === norm(sc.s)) && (!sc.e || r.exam === sc.e) && (sc.x !== '1' || isExit(r));
const dsc = sc => `data-s="${esc(sc.s || '')}" data-e="${esc(sc.e || '')}" data-x="${esc(sc.x || '')}"`;
const editBtn = (sc, lbl) => SESS && SESS.teacher ? `<button class="btn sm ghost edl" title="Log hide / delete" ${dsc(sc)} onclick="event.stopPropagation();openLogs(this.dataset)">✏${lbl ? ' ' + lbl : ''}</button>` : '';
function vRange(sc, all){
  const s = drSpan(), shown = all ? rng(all).length : 0;
  const hid = SESS && SESS.teacher ? allRawH().filter(r => r.hid && scMatch(r, sc || {})).length : 0;
  const f = DR.p === 'c' ? DR.f : s ? ymd(new Date(s[0])) : '', t = DR.p === 'c' ? DR.t : s ? ymd(new Date()) : '';
  return `<div class="card drbar"><div class="row" style="margin:0"><b>📅 সময়সীমা</b>${editBtn(sc || {}, 'Edit logs')}</div>
    <div class="chips">${DR_P.map(([k, l]) => `<button class="chip ${DR.p === k ? 'on' : ''}" onclick="setDRp('${k}')">${l}</button>`).join('')}</div>
    <div class="drd"><input type="date" value="${esc(f)}" onchange="setDRd('f',this.value)" aria-label="From"><span>→</span><input type="date" value="${esc(t)}" onchange="setDRd('t',this.value)" aria-label="To"></div>
    <small class="muted">দেখাচ্ছে: <b>${esc(drLabel())}</b>${all ? ` · ${shown}/${all.length}টা log` : ''}${hid ? ` · 🙈 ${hid}টা লুকানো` : ''}</small></div>`;
}
const vNoneInRange = () => `<div class="card muted center">এই সময়সীমায় কোনো data নেই। উপরে 📅 থেকে সময় বদলাও।</div>`;

/* ---------- ✏ Log editor (teacher only): select → 🙈 Hide / 👁 Unhide / 🗑 Permanent delete ---------- */
let LOGED = null;   // {s, e, x, all:bool (সময়সীমার বাইরেও), sel:{aid:true}, msg, busy, ask}
function openLogs(d){
  if(!SESS || !SESS.teacher) return;
  LOGED = {s:d.s || '', e:d.e || '', x:d.x || '', all:false, sel:{}, msg:'', busy:false, ask:''};
  render(true);
}
function logList(){
  const L = allRawH().filter(r => scMatch(r, LOGED));
  return (LOGED.all ? L : rng(L)).slice().sort((a, b) => aidTime(b.aid) - aidTime(a.aid));
}
const logSel = () => Object.keys(LOGED.sel).filter(a => LOGED.sel[a]);
function logTick(el){
  LOGED.sel[el.dataset.a] = el.checked; LOGED.ask = '';
  const n = logSel().length, c = $('#lgn');
  if(c) c.textContent = n;
  document.querySelectorAll('.lgb').forEach(b => { b.disabled = !n || LOGED.busy; });
}
function logSelAll(on){ LOGED.sel = {}; if(on) logList().forEach(r => { LOGED.sel[r.aid] = true; }); LOGED.ask = ''; render(true); }
function vLogEd(){
  const L = logList(), n = logSel().length, sel = new Set(logSel()), dis = !n || LOGED.busy ? 'disabled' : '';
  const who = LOGED.s ? ((allRawH().filter(r => norm(r.sid) === norm(LOGED.s)).pop() || {}).name || LOGED.s) : 'সব student';
  const kind = r => r.mode === 'mistakes' ? '<span class="tag">mistakes</span>' : isExit(r) ? '<span class="tag" style="background:#fef3c7;color:#b45309">🚪 exit</span>' : '<span class="tag">attempt</span>';
  const rows = L.map(r => `<tr${r.hid ? ' style="opacity:.55"' : ''}><td><input type="checkbox" class="lgc" data-a="${esc(r.aid)}" ${sel.has(r.aid) ? 'checked' : ''} onchange="logTick(this)"></td>
    <td><small>${esc(dLong(r.aid))}</small></td><td><b>${esc(r.name)}</b> <small>${esc(r.sid)}</small></td><td>${esc(r.exam)}</td>
    <td>${kind(r)}${r.hid ? '<span class="tag" style="background:#e5e7eb;color:#374151">🙈 লুকানো</span>' : ''}</td><td>${isExit(r) ? '–' : r.score + '/' + r.total + ' <small>(' + pct(r) + '%)</small>'}</td></tr>`).join('');
  const na = LOGED.drawn ? ' style="animation:none"' : ''; LOGED.drawn = true;   // re-render-এ popup আবার animate করবে না
  return `<div class="modal"${na} onclick="if(event.target===this){LOGED=null;render(true)}"><div class="card loged"${na}>
    <div class="row" style="margin:0"><h2 style="margin:0">✏ Logs edit</h2><button class="link" onclick="LOGED=null;render(true)">✕ Close</button></div>
    <small class="muted">${esc(who)}${LOGED.e ? ' · ' + esc(LOGED.e) : ''}${LOGED.x === '1' ? ' · শুধু exit' : ''} · ${LOGED.all ? 'সব সময়ের log' : esc(drLabel())}</small>
    <label class="lgall"><input type="checkbox" ${LOGED.all ? 'checked' : ''} onchange="LOGED.all=this.checked;LOGED.sel={};render(true)"> সময়সীমার বাইরের log-ও দেখাও</label>
    <div class="notice info" style="margin:8px 0"><b>🙈 Hide</b> = analytics আর student-এর কাছ থেকে লুকাবে, পরে <b>👁 Unhide</b> করে ফেরত আনা যাবে। <b>🗑 Delete</b> = চিরতরে মুছে যাবে।</div>
    ${L.length ? `<div class="scroll lgs"><table><tr><th><input type="checkbox" ${n && n === L.length ? 'checked' : ''} onchange="logSelAll(this.checked)" title="সব"></th><th>কখন</th><th>Student</th><th>Exam</th><th>ধরন</th><th>Score</th></tr>${rows}</table></div>` : '<div class="muted center" style="padding:14px">এখানে কোনো log নেই।</div>'}
    <div style="margin:8px 0"><b id="lgn">${n}</b>টা select করা</div>
    ${LOGED.ask === 'delete' ? `<div class="notice bad"><b>⚠ ${n}টা log চিরতরে মুছে যাবে।</b><br>এটা আর ফেরত আনা যাবে না (শুধু backup থেকে)। লুকাতে চাইলে 🙈 Hide দাও।
      <div class="row" style="margin:8px 0 0;justify-content:flex-start;gap:8px"><button class="btn sm red" onclick="logOp('delete')">হ্যাঁ, চিরতরে মুছে ফেলো</button><button class="btn sm ghost" onclick="LOGED.ask='';render(true)">না</button></div></div>` :
    `<div class="row lgbtns" style="margin:0;justify-content:flex-start;gap:8px;flex-wrap:wrap">
      <button class="btn sm lgb" ${dis} onclick="logOp('hide')">🙈 Hide</button>
      <button class="btn sm ghost lgb" ${dis} onclick="logOp('unhide')">👁 Unhide</button>
      <button class="btn sm red lgb" ${dis} onclick="LOGED.ask='delete';render(true)">🗑 Delete</button></div>`}
    ${LOGED.msg ? `<div class="notice ${/^✅/.test(LOGED.msg) ? 'good' : /^⚠/.test(LOGED.msg) ? 'warn' : 'info'}" style="margin-top:8px">${esc(LOGED.msg)}</div>` : ''}
  </div></div>`;
}
async function logOp(op){
  const aids = logSel();
  if(!aids.length || LOGED.busy) return;
  const S = new Set(aids), word = {hide:'লুকানো হয়েছে', unhide:'আবার দেখা যাবে', delete:'চিরতরে মুছে ফেলা হয়েছে'}[op];
  LOGED.busy = true; LOGED.ask = ''; LOGED.msg = '⏳ Server-এ পাঠানো হচ্ছে…'; render(true);
  const local = aids.filter(a => !REMOTE.some(r => r.aid === a));   // এখনো server-এ পৌঁছায়নি
  if(op === 'delete'){   // এই device-এর copy-ও মুছে দাও
    LS.set('mq_local', LS.get('mq_local', []).filter(r => !S.has(r.aid)));
    LS.set('mq_out', LS.get('mq_out', []).filter(r => !S.has(r.aid)));
  }
  await tPost({action:'logs', op, aids:JSON.stringify(aids)});
  const done = () => op === 'delete' ? !REMOTE.some(r => S.has(r.aid)) : REMOTE.filter(r => S.has(r.aid)).every(r => !!r.hid === (op === 'hide'));
  let ok = false;
  for(let i = 0; i < 6 && !ok; i++){ await loadRemote(); ok = !remoteMsg && done(); if(!ok) await sleep(1300); }
  if(!LOGED) return render(true);
  LOGED.busy = false; LOGED.sel = {};
  LOGED.msg = !ok ? '⚠ Server থেকে নিশ্চিত হওয়া যায়নি — একটু পরে ↻ Refresh করে দেখো।'
    : '✅ ' + (aids.length - (op === 'delete' ? 0 : local.length)) + 'টা log ' + word + (op !== 'delete' && local.length ? ` (${local.length}টা এখনো server-এ পৌঁছায়নি, তাই বদলানো যায়নি)` : '') + '।';
  render(true);
}
