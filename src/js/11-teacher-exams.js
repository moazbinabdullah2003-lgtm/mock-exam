/* ---------- Teacher: exam upload / manage ---------- */
const escT = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tPost(o){
  const b = new URLSearchParams({...o, key: TKEY()});
  try{ await fetch(CONFIG.SCRIPT_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:b}); return true; }catch(e){ return false; }
}
async function loadExamList(){
  if(!CONFIG.SCRIPT_URL) return;
  try{ EXL = await (await fetch(CONFIG.SCRIPT_URL + '?action=exams&key=' + encodeURIComponent(TKEY()) + '&t=' + Date.now())).json(); if(!Array.isArray(EXL)) EXL = []; }catch(e){}
}
function parseQ(text){
  text = String(text || '').replace(/^\uFEFF/, '');
  if(typeof isMD === 'function' && isMD(text)) return parseMD(text);   // Markdown + LaTeX format (11a)
  const errs = [];
  if(text.indexOf('\uFFFD') >= 0) errs.push('Bengali লেখা ভেঙে গেছে — CSV "UTF-8" format-এ save করো।');
  const first = text.split('\n')[0] || '';
  const delim = first.split('\t').length > first.split(',').length ? '\t' : ',';
  const rows = parseCSV(text, delim);
  if(!rows.length || rows.length < 2) return {errors:['ফাঁকা বা শুধু header আছে'], exams:{}};
  const H = rows[0].map(x => String(x).trim().toUpperCase()), ix = k => H.indexOf(k);
  ['Q','A','B','ANS'].forEach(k => { if(ix(k) < 0) errs.push('Header-এ "' + k + '" column নেই'); });
  if(errs.length) return {errors:errs, exams:{}};
  const exams = {}; let code = '';
  rows.slice(1).forEach((r, n) => {
    const g = k => { const j = ix(k); return j >= 0 && r[j] != null ? String(r[j]).trim() : ''; };
    const rn = n + 2;
    if(!g('Q') && !g('A') && !g('B')) return;
    const c = (g('CODE') || code).toUpperCase();
    if(!c){ errs.push('Row ' + rn + ': CODE নেই'); return; }
    code = c;
    if(!g('Q')){ errs.push('Row ' + rn + ': Question লেখা নেই'); return; }
    const opts = ['A','B','C','D','E'].map(g); let last = opts.length;
    while(last > 0 && !opts[last-1]) last--;
    const o = opts.slice(0, last);
    if(o.length < 2 || o.some(x => !x)){ errs.push('Row ' + rn + ': Option ঠিক নেই (অন্তত ২টা, মাঝে ফাঁকা নয়)'); return; }
    const a = 'ABCDE'.indexOf(g('ANS').toUpperCase());
    if(g('ANS').length !== 1 || a < 0 || a >= o.length){ errs.push('Row ' + rn + ': ANS ভুল ("' + g('ANS') + '")'); return; }
    const ex = exams[c] = exams[c] || {code:c, rows:[]};
    if(!ex.rows.length){ ex.title = g('TITLE') || c; ex.minutes = g('MINUTES') || '10'; ex.neg = g('NEG') || '0'; ex.open = g('OPEN').toUpperCase() === 'NO' ? 'NO' : 'YES'; }
    ex.rows.push({q:g('Q'), o, a, t:g('TOPIC') || 'General', e:g('EXPLANATION')});
  });
  if(!Object.keys(exams).length && !errs.length) errs.push('কোনো valid question পাওয়া যায়নি');
  return {errors:errs, exams};
}
const rowsOf = ex => ex.rows.map((r, i) => [ex.code, i ? '' : ex.title, i ? '' : ex.minutes, i ? '' : ex.neg, i ? '' : ex.open, r.q, r.o[0]||'', r.o[1]||'', r.o[2]||'', r.o[3]||'', r.o[4]||'', 'ABCDE'[r.a], r.t, r.e]);
function onFile(f){ if(!f) return; const rd = new FileReader(); rd.onload = () => { PASTE = String(rd.result); doPreview(); }; rd.readAsText(f, 'UTF-8'); }
function doPreview(){ UP = parseQ(PASTE); upMsg = ''; render(true); }
async function verifyExam(ex){
  for(let i = 0; i < 6; i++){
    await sleep(1500);
    try{
      const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=exam&code=' + encodeURIComponent(ex.code) + '&t=' + Date.now())).json();
      if(r && r.questions && r.questions.length === ex.rows.length && r.questions.every((q, i) => q.q === ex.rows[i].q && q.a === ex.rows[i].a && q.o.join('|') === ex.rows[i].o.join('|') && String(q.e || '') === String(ex.rows[i].e || ''))) return true;
    }catch(e){}
  }
  return false;
}
async function publishUp(){
  if(!UP || UP.errors.length || !CONFIG.SCRIPT_URL) return;
  upMsg = 'Upload হচ্ছে… একটু অপেক্ষা করো'; render(true);
  const codes = [];
  for(const ex of Object.values(UP.exams)){
    await tPost({action:'upload', code:ex.code, rows:JSON.stringify(rowsOf(ex))});
    if(!(await verifyExam(ex))){ upMsg = '⚠ ' + ex.code + ' confirm হয়নি। Password ' + 'Code.gs-এর সাথে মিলছে কিনা আর Script নতুন version-এ deploy করা কিনা দেখো।'; return render(true); }
    codes.push(ex.code);
  }
  upMsg = '✅ Ready! Students এখন এই code দিয়ে exam দিতে পারবে: ' + codes.join(', ');
  UP = null; PASTE = '';
  await loadExamList(); render(true);
}
async function setOpen(code, open){
  upMsg = ''; await tPost({action:'setopen', code, open: open ? 'YES' : 'NO'});
  for(let i = 0; i < 6; i++){ await sleep(1200); await loadExamList(); const x = EXL.find(e => e.code === code); if(x && x.open === open) break; }
  render(true);
}
async function delExam(code){
  if(DELC !== code){ DELC = code; return render(true); }
  DELC = ''; await tPost({action:'delete', code});
  for(let i = 0; i < 6; i++){ await sleep(1200); await loadExamList(); if(!EXL.find(e => e.code === code)) break; }
  render(true);
}
function vExams(){
  if(!CONFIG.SCRIPT_URL) return '';
  let h = '<div class="card"><h2>📚 Exams</h2><button class="btn sm full" style="margin:0 0 8px" onclick="openEditor()">+ New exam (UI থেকে বানাও)</button>';
  const na = {}; allRecs().forEach(r => { na[r.exam] = (na[r.exam] || 0) + 1; });
  h += EXL.length ? EXL.map(x => `<div class="hist"><div style="cursor:pointer" data-c="${esc(x.code)}" onclick="openExA(this.dataset.c)"><b>${esc(x.code)}</b> <small>${esc(x.title)} · ${x.count}Q · ${x.minutes}min${x.neg ? ' · −' + x.neg : ''}</small>${x.open ? '' : '<span class="tag" style="background:#fee2e2;color:#dc2626">closed</span>'}<br><small style="color:var(--p);font-weight:600">📊 Analytics · ${na[x.code] || 0} attempts ›</small></div>
    <div style="white-space:nowrap"><button class="btn sm ghost" data-c="${esc(x.code)}" onclick="openExA(this.dataset.c)">📊</button> <button class="btn sm" data-c="${esc(x.code)}" onclick="openEditor(this.dataset.c)">✏ Edit</button> <button class="btn sm ghost" data-c="${esc(x.code)}" onclick="setOpen(this.dataset.c, ${!x.open})">${x.open ? 'Close' : 'Open'}</button>
    <button class="btn sm ${DELC === x.code ? 'red' : 'ghost'}" data-c="${esc(x.code)}" onclick="delExam(this.dataset.c)">${DELC === x.code ? 'Sure?' : 'Delete'}</button></div></div>`).join('')
    : '<div class="muted">এখনো কোনো exam নেই</div>';
  h += `<h3>⬆ নতুন exam upload (CSV বা MD + LaTeX)</h3>${vAiPromptBox()}
    <input type="file" accept=".csv,.tsv,.txt,.md,text/csv,text/plain,text/markdown" onchange="onFile(this.files[0])">
    <small class="muted">অথবা AI-এর দেওয়া CSV / MD text এখানে paste করো:</small>
    <textarea id="paste" rows="6" placeholder="# EXAM: CODE …  অথবা  CODE,TITLE,MINUTES,NEG,OPEN,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION" oninput="PASTE=this.value">${escT(PASTE)}</textarea>
    <button class="btn ghost full" onclick="doPreview()">Preview</button>`;
  if(upMsg) h += `<div class="warn">${esc(upMsg)}</div>`;
  if(UP){
    if(UP.errors.length) h += `<div class="warn" style="background:var(--rl);color:var(--t)"><b>ভুল পাওয়া গেছে — ঠিক করে আবার upload করো:</b><br>${UP.errors.slice(0, 12).map(esc).join('<br>')}${UP.errors.length > 12 ? '<br>…' : ''}</div>`;
    else {
      h += Object.values(UP.exams).map(ex => {
        const tc = {}; ex.rows.forEach(r => tc[r.t] = (tc[r.t] || 0) + 1);
        const exists = EXL.find(e => e.code === ex.code);
        return `<div class="card" style="margin:8px 0"><b>${esc(ex.code)}</b> — ${esc(ex.title)}${exists ? '<span class="tag" style="background:#fef9c3;color:#a16207">আগেরটা replace হবে</span>' : '<span class="tag">নতুন</span>'}<br>
          <small>${ex.rows.length} questions · ${esc(ex.minutes)} min · negative ${esc(ex.neg)} · ${ex.open === 'NO' ? 'closed' : 'open'}</small><br>
          <small>Topics: ${Object.entries(tc).map(([k, v]) => esc(k) + ' (' + v + ')').join(', ')}</small><br><small class="muted">Q1: ${esc(ex.rows[0].q.slice(0, 80))}</small></div>`;
      }).join('') + '<button class="btn full" onclick="publishUp()">✅ Publish — exam ready করো</button>';
    }
  }
  return h + '</div>';
}

