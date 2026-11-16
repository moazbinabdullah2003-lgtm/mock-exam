/* ============================================================
   Network helper: timeout + আসল error-এর কারণ আলাদা করে বোঝা
   ============================================================ */
const INAPP = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|Telegram|; wv\)/i;
/* GET url -> parsed JSON. Throws {kind:'timeout'|'offline'|'http'|'badresp'|'blocked', detail} */
async function jget(url, ms){
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const tm = ac ? setTimeout(() => ac.abort(), ms || 20000) : null;
  let res;
  try{ res = await fetch(url, ac ? {signal: ac.signal} : undefined); }
  catch(e){
    if(tm) clearTimeout(tm);
    if(e && e.name === 'AbortError') throw {kind:'timeout', detail:'no response in ' + Math.round((ms || 20000) / 1000) + 's'};
    if(typeof navigator !== 'undefined' && navigator.onLine === false) throw {kind:'offline', detail:'navigator.onLine=false'};
    throw {kind:'blocked', detail:String(e && e.message || e)};
  }
  if(tm) clearTimeout(tm);
  if(!res.ok) throw {kind:'http', detail:'HTTP ' + res.status};
  const txt = await res.text();
  try{ return JSON.parse(txt); }
  catch(e){ throw {kind:'badresp', detail:txt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}; }
}
function describeErr(e){
  const k = e && e.kind, ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const tail = '\n[' + (k || 'error') + ': ' + (e && e.detail || e && e.message || e) + ']';
  if(k === 'offline') return 'Internet connection নেই। WiFi / mobile data চালু করে আবার try করো।' + tail;
  if(k === 'timeout') return 'Server সাড়া দিচ্ছে না (অনেক ধীর internet বা block)। একটু পরে আবার try করো, অথবা WiFi ↔ mobile data বদলাও।' + tail;
  if(k === 'http') return 'Server সমস্যা দিচ্ছে। একটু পরে আবার try করো।' + tail;
  if(k === 'badresp') return 'Server ভুল response দিয়েছে (অস্থায়ী সমস্যা হতে পারে)। একটু পরে আবার try করো।' + tail;
  return 'Server-এ পৌঁছানো যাচ্ছে না। ' + (INAPP.test(ua) ? 'তুমি Messenger/Facebook-এর ভেতরের browser-এ আছো — Chrome বা Safari-তে link খোলো। ' : 'WiFi ↔ mobile data বদলে দেখো; VPN / ad-blocker / Brave Shields বন্ধ করো।') + tail;
}
let NETERR = '', LASTERR = null, DIAG = '';
function netFail(e, fn){ LASTERR = e; NETERR = fn; msg = describeErr(e); return render(true); }
function errBox(){
  return `<div class="err">${esc(msg)}</div>${NETERR ? `<button class="link" onclick="${NETERR}()">↻ Try again</button>` : ''}`;
}
async function diag(){
  DIAG = 'Checking…'; render(true);
  const L = [], ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  L.push('Online: ' + (typeof navigator !== 'undefined' ? navigator.onLine : '?'));
  L.push('Browser: ' + ua.slice(0, 100));
  if(INAPP.test(ua)) L.push('⚠ In-app browser — Chrome / Safari-তে খোলো');
  let t0 = Date.now();
  try{ await fetch(location.pathname + '?t=' + Date.now(), {cache:'no-store'}); L.push('এই site: OK (' + (Date.now() - t0) + 'ms)'); }catch(e){ L.push('এই site: FAIL'); }
  t0 = Date.now();
  try{ await jget(CONFIG.SCRIPT_URL + '?action=settings&t=' + Date.now(), 15000); L.push('Server (Google): OK (' + (Date.now() - t0) + 'ms)'); }
  catch(e){ L.push('Server (Google): FAIL — ' + (e.kind || 'error') + ': ' + (e.detail || e.message || e)); }
  DIAG = L.join('\n'); render(true);
}

/* ============================================================
   Google Form (write) + Published Sheet (read)
   ============================================================ */
const FORM = (() => {
  try{
    const u = new URL(CONFIG.PREFILLED_LINK), map = {};
    u.searchParams.forEach((v,k) => { if(k.indexOf('entry.')===0) map[String(v).toUpperCase()] = k; });
    return { action: u.origin + u.pathname.replace(/\/viewform.*$/, '/formResponse'), map };
  }catch(e){ return null; }
})();

const CAN_SYNC = () => !!(CONFIG.SCRIPT_URL || FORM);
async function send(rec){
  if(CONFIG.SCRIPT_URL){
    const b = new URLSearchParams({sid:rec.sid,name:rec.name,exam:rec.exam,aid:rec.aid,mode:rec.mode,score:rec.score,total:rec.total,secs:rec.secs,details:JSON.stringify(rec.d)});
    try{
      await fetch(CONFIG.SCRIPT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:b});
      return true;
    }catch(e){ return false; }
  }
  if(!FORM) return false;
  const v = {SID:rec.sid,NAME:rec.name,EXAM:rec.exam,AID:rec.aid,MODE:rec.mode,SCORE:rec.score,TOTAL:rec.total,SECS:rec.secs,DETAILS:JSON.stringify(rec.d)};
  const b = new URLSearchParams();
  for(const k in v){ if(!FORM.map[k]) return false; b.append(FORM.map[k], v[k]); }
  try{
    await fetch(FORM.action, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:b});
    return true;
  }catch(e){ return false; }
}
let flushing = false;
async function flush(){
  if(flushing) return -1;
  flushing = true;
  try{
    const ob = LS.get('mq_out', []), rest = [];
    for(const r of ob){ if(!(await send(r))) rest.push(r); }
    LS.set('mq_out', rest);
    return rest.length;
  } finally { flushing = false; }
}

let REMOTE = [], remoteMsg = '';
async function loadRemote(){
  if(CONFIG.SCRIPT_URL){
    if(!SESS) return;
    try{
      const u = CONFIG.SCRIPT_URL + '?' + (SESS.teacher ? 'key=' + encodeURIComponent(TKEY()) : 'sid=' + encodeURIComponent(SESS.sid)) + '&t=' + Date.now();
      const arr = await (await fetch(u)).json();
      REMOTE = arr.map(r => {
        let d = []; try{ d = JSON.parse(r.details); }catch(e){}
        return {sid:norm(r.sid),name:r.name,exam:String(r.exam||'').trim().toUpperCase(),aid:String(r.aid||'').trim(),mode:r.mode,score:parseFloat(r.score)||0,total:parseInt(r.total)||0,secs:parseInt(r.secs)||0,d:Array.isArray(d)?d:[]};
      }).filter(x => x.aid && x.d.length);
      remoteMsg = '';
    }catch(e){ remoteMsg = 'Server থেকে data আনা যায়নি (offline? বা Script deploy ঠিক নেই)'; }
    return;
  }
  if(!CONFIG.SHEET_CSV_URL){ remoteMsg = 'Sheet URL set করা নেই (শুধু এই device-এর data দেখাচ্ছে)'; return; }
  try{
    const u = CONFIG.SHEET_CSV_URL + (CONFIG.SHEET_CSV_URL.indexOf('?')>=0 ? '&' : '?') + 't=' + Date.now();
    const res = await fetch(u);
    const rows = parseCSV(await res.text());
    const h = rows[0].map(x => x.trim().toUpperCase());
    const col = (k, i) => { const j = h.indexOf(k); return j >= 0 ? j : i; };
    const C = {sid:col('SID',1),name:col('NAME',2),exam:col('EXAM',3),aid:col('AID',4),mode:col('MODE',5),score:col('SCORE',6),total:col('TOTAL',7),secs:col('SECS',8),d:col('DETAILS',9)};
    REMOTE = rows.slice(1).map(r => {
      let d = []; try{ d = JSON.parse(r[C.d]); }catch(e){}
      return {sid:norm(r[C.sid]),name:r[C.name],exam:String(r[C.exam]||'').trim().toUpperCase(),aid:String(r[C.aid]||'').trim(),mode:r[C.mode],score:parseFloat(r[C.score])||0,total:parseInt(r[C.total])||0,secs:parseInt(r[C.secs])||0,d:Array.isArray(d)?d:[]};
    }).filter(x => x.aid && x.d.length);
    remoteMsg = '';
  }catch(e){ remoteMsg = 'Sheet load হয়নি (offline, বা Sheet publish করা হয়নি)'; }
}
/* exit record (exam বাতিল করে বের হওয়া): mode 'exit' / 'exit-mistakes' — attempt নয়, শুধু teacher-এর exit report-এ */
const isExit = r => /^exit/.test(String((r && r.mode) || ''));
function allRaw(){
  const m = new Map();
  [...REMOTE, ...LS.get('mq_local', [])].forEach(r => { if(!m.has(r.aid)) m.set(r.aid, r); });
  return [...m.values()].sort((a,b) => aidTime(a.aid) - aidTime(b.aid));
}
const allRecs = () => allRaw().filter(r => !isExit(r));   // সব হিসাব (score, attempt limit, analytics) শুধু আসল attempt দিয়ে
const allExits = () => allRaw().filter(isExit);

