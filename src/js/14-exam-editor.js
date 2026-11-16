/* ============================================================
   Exam editor: UI থেকে question edit / add / delete / reorder (CSV লাগে না)
   ============================================================ */
async function openEditor(code){
  if(!CD) CD = clone(CFG);
  if(!code){
    const c = (prompt('নতুন exam-এর code (যেমন CT2):') || '').trim().toUpperCase();
    if(!c) return;
    EDX = {code:c, isNew:true, title:c, minutes:10, neg:0, open:true, qs:[blankQ()], msg:''};
    return render();
  }
  EDX = {code, loading:true, qs:[], msg:''}; render();
  try{
    const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=exam&code=' + encodeURIComponent(code) + '&t=' + Date.now())).json();
    if(!r || !r.questions) throw 0;
    EDX = {code, title:r.title, minutes:r.minutes, neg:r.neg, open:r.open !== false, msg:'', qs:r.questions.map(q => ({q:q.q, o:q.o.slice(), a:q.a, t:q.t, e:q.e, qb:q.qb || '', ob:(q.ob || []).slice(), eb:q.eb || ''}))};
    EDX.orig = EDX.qs.map(qSig);   // 🚩 বাতিল question বদলালে save-এর পরে auto চালু
  }catch(e){ EDX = null; upMsg = 'Exam load হয়নি'; }
  render();
}
const blankQ = () => ({q:'', o:['', '', '', ''], a:0, t:'General', e:'', qb:'', ob:[], eb:''});
function eoptb(i, n, v){ const q = EDX.qs[i]; q.ob = q.ob || []; while(q.ob.length <= n) q.ob.push(''); q.ob[n] = v; edPrev(i); markDirtyEd(); }
function eset(i, k, v){ EDX.qs[i][k] = v; edPrev(i); markDirtyEd(); }
function eopt(i, n, v){ EDX.qs[i].o[n] = v; edPrev(i); markDirtyEd(); }
function markDirtyEd(){ EDX.dirty = true; const m = document.getElementById('edmsg'); if(m) m.textContent = '● unsaved'; }
function edPrev(i){
  const q = EDX.qs[i], el = document.getElementById('pv' + i);
  if(!el) return;
  el.innerHTML = `<div style="font-weight:600">${esc(q.q)}</div>` + q.o.map((o, n) => o ? `<div>${LET[n]}. ${esc(o)}${n === q.a ? ' ✅' : ''}</div>` : '').join('') + (q.e ? `<div class="exp" style="margin-top:6px">💡 ${esc(q.e)}</div>` : '') +
    (String(q.qb || '').trim() ? (b => `<div style="border-top:1px dashed var(--b);margin-top:8px;padding-top:6px"><small class="muted">🇧🇩 বাংলা</small><div style="font-weight:600">${esc(b.q)}</div>` + b.o.map((o, n) => o ? `<div>${LET[n]}. ${esc(o)}${n === q.a ? ' ✅' : ''}</div>` : '').join('') + (b.e ? `<div class="exp" style="margin-top:6px">💡 ${esc(b.e)}</div>` : '') + '</div>')(LQ(q, 'bn')) : '');
  mathify(el);
}
function edAdd(){ EDX.qs.push(blankQ()); markDirtyEd(); render(true); }
function edDel(i){ if(EDX.qs.length > 1 && confirm('Q' + (i + 1) + ' delete করবে?')){ EDX.qs.splice(i, 1); markDirtyEd(); render(true); } }
function edDup(i){ EDX.qs.splice(i + 1, 0, clone(EDX.qs[i])); markDirtyEd(); render(true); }
function edMove(i, d){ const j = i + d; if(j < 0 || j >= EDX.qs.length) return; [EDX.qs[i], EDX.qs[j]] = [EDX.qs[j], EDX.qs[i]]; markDirtyEd(); render(true); }
function edOpt(i, add){
  const q = EDX.qs[i];
  if(add && q.o.length < 5) q.o.push('');
  if(!add && q.o.length > 2){ q.o.pop(); if(q.a >= q.o.length) q.a = 0; }
  markDirtyEd(); render(true);
}
function edHead(k, v){ EDX[k] = v; markDirtyEd(); }
function edCode(v){ EDX.newCode = v; markDirtyEd(); }
const exGet = async c => { try{ const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=exam&code=' + encodeURIComponent(c) + '&t=' + Date.now())).json(); return !!(r && r.questions && r.questions.length); }catch(e){ return null; } };
function vExamEditor(){
  const x = EDX;
  if(x.loading) return '<div class="card muted">Loading…</div>';
  const ovp = 'exams.' + x.code;
  if(!CD.exams) CD.exams = {};
  const head = `<div class="top"><button class="link" onclick="EDX=null;render()">← Exams</button><b>${esc(x.code)}</b></div>
    <div class="card"><h2>Exam info</h2>
      <label class="fld"><span>Exam code (student-রা এটা দিয়ে exam ধরে)</span><input value="${eA(x.newCode == null ? x.code : x.newCode)}" autocapitalize="characters" autocomplete="off" oninput="edCode(this.value)"></label>
      <small class="muted">${x.isNew ? 'নতুন exam — code এখনো বদলানো যায়।' : 'Code বদলালে এই exam-এর পুরোনো সব attempt/result-ও নতুন code-এ চলে যাবে। Student-দের নতুন code জানাতে হবে।'}</small>
      <label class="fld"><span>Title</span><input value="${eA(x.title)}" oninput="edHead('title',this.value)"></label>
      <div class="g2"><label class="fld"><span>Minutes</span><input type="number" min="1" value="${eA(x.minutes)}" oninput="edHead('minutes',this.value)"></label>
      <label class="fld"><span>Negative mark / wrong</span><input type="number" step="0.05" min="0" value="${eA(x.neg)}" oninput="edHead('neg',this.value)"></label></div>
      <label class="chk"><input type="checkbox" ${x.open ? 'checked' : ''} onchange="edHead('open',this.checked)"><span>Exam open (student-রা দিতে পারবে)</span></label></div>
    <div class="card"><h2>Exam rules (শুধু এই exam-এর জন্য)</h2>
      <div class="g2">${fN(ovp + '.maxAttempts', 'Max attempts (0 = global rule)', 0)}${fS(ovp + '.guest', 'Guest access', [['','Global rule follow'],['yes','Guest-রা দিতে পারবে'],['no','শুধু registered student']])}
      <label class="fld"><span>Start time</span><input type="datetime-local" data-p="${eA(ovp + '.start')}" value="${eA(gp(ovp + '.start'))}" oninput="sp(this.dataset.p,this.value)"></label>
      <label class="fld"><span>End time</span><input type="datetime-local" data-p="${eA(ovp + '.end')}" value="${eA(gp(ovp + '.end'))}" oninput="sp(this.dataset.p,this.value)"></label></div>
      ${fA(ovp + '.intro', 'Instructions (শুধু এই exam শুরুর আগে দেখাবে)', '', 3)}
      <small class="muted">এই অংশের পরিবর্তন নিচের "Save" চাপলে save হবে।</small></div>`;
  const qs = x.qs.map((q, i) => `<div class="qed" id="qed${i}">${vEdVoid(x.code, i)}<div class="row" style="margin:0 0 6px"><b>Q${i + 1}</b>
      <span><button class="btn sm ghost" onclick="edMove(${i},-1)">↑</button> <button class="btn sm ghost" onclick="edMove(${i},1)">↓</button> <button class="btn sm ghost" onclick="edDup(${i})">⎘</button> <button class="btn sm ghost" onclick="edDel(${i})">🗑</button></span></div>
      <textarea rows="2" placeholder="Question (math: $x^2$ বা $\\dfrac{1}{2}$)" oninput="eset(${i},'q',this.value)">${escT(q.q)}</textarea>
      ${q.o.map((o, n) => `<div class="oe"><input type="radio" name="a${i}" ${q.a === n ? 'checked' : ''} onchange="eset(${i},'a',${n})" title="সঠিক উত্তর"><b>${LET[n]}</b><input type="text" value="${eA(o)}" placeholder="Option ${LET[n]}" oninput="eopt(${i},${n},this.value)"></div>`).join('')}
      <div class="row" style="margin:2px 0"><span><button class="btn sm ghost" onclick="edOpt(${i},true)">+ option</button> <button class="btn sm ghost" onclick="edOpt(${i},false)">− option</button></span><small class="muted">● = সঠিক উত্তর</small></div>
      <div class="g2"><input placeholder="Topic" value="${eA(q.t)}" oninput="eset(${i},'t',this.value)"></div>
      <textarea rows="3" placeholder="Explanation / solution (ঐচ্ছিক)" oninput="eset(${i},'e',this.value)">${escT(q.e)}</textarea>
      <details class="bnx" ${String(q.qb || '').trim() ? 'open' : ''}><summary>🇧🇩 বাংলা version ${String(q.qb || '').trim() ? '✓' : '(নেই — ঐচ্ছিক)'}</summary>
        <textarea rows="2" placeholder="বাংলা প্রশ্ন" oninput="eset(${i},'qb',this.value)">${escT(q.qb || '')}</textarea>
        ${q.o.map((o, n) => `<div class="oe"><b>${LET[n]}</b><input type="text" value="${eA((q.ob || [])[n] || '')}" placeholder="বাংলা option ${LET[n]} (ফাঁকা = English-টাই দেখাবে)" oninput="eoptb(${i},${n},this.value)"></div>`).join('')}
        <textarea rows="2" placeholder="বাংলা solution (ঐচ্ছিক)" oninput="eset(${i},'eb',this.value)">${escT(q.eb || '')}</textarea></details>
      <div class="pv" id="pv${i}"></div></div>`).join('');
  return head + qs + `<button class="btn ghost full" onclick="edAdd()">+ Add question</button>
    ${x.msg ? `<div class="warn">${esc(x.msg)}</div>` : ''}
    <div class="savebar"><button class="btn full" onclick="saveExam()">💾 Save exam ${DIRTY ? '+ settings' : ''}</button><div class="err" style="text-align:center" id="edmsg">${x.dirty ? '● unsaved' : ''}</div></div>`;
}
async function saveExam(){
  const x = EDX, errs = [];
  const rows = x.qs.map((q, i) => {
    let o = q.o.map(s => String(s).trim()); while(o.length && !o[o.length - 1]) o.pop();
    if(!String(q.q).trim()) errs.push('Q' + (i + 1) + ': question লেখা নেই');
    else if(o.length < 2 || o.some(s => !s)) errs.push('Q' + (i + 1) + ': অন্তত ২টা option লাগবে (মাঝে ফাঁকা নয়)');
    else if(q.a >= o.length) errs.push('Q' + (i + 1) + ': সঠিক উত্তর খালি option-এ');
    const row = {q:String(q.q).trim(), o, a:q.a, t:String(q.t).trim() || 'General', e:String(q.e || '').trim()};
    const be = bnErr(q.qb, (q.ob || []).slice(0, o.length), q.eb, o.length, row);
    if(be) errs.push('Q' + (i + 1) + ': ' + be);
    return row;
  });
  if(errs.length){ x.msg = errs.slice(0, 8).join(' · '); return render(true); }
  const old = x.code, nc = String(x.newCode == null ? old : x.newCode).trim().toUpperCase();
  if(nc !== old){
    if(!/^[A-Z0-9_-]{1,30}$/.test(nc)){ x.msg = 'Exam code-এ শুধু A-Z, 0-9, - _ চলবে (সর্বোচ্চ ৩০ অক্ষর, space নয়)'; return render(true); }
    x.msg = 'Code check করা হচ্ছে…'; render(true);
    const taken = await exGet(nc);
    if(taken === null){ x.msg = 'Network সমস্যা — আবার চেষ্টা করো।'; return render(true); }
    if(taken){ x.msg = '"' + nc + '" নামে আরেকটা exam আগে থেকেই আছে — অন্য code দাও।'; return render(true); }
    if(!x.isNew){
      x.msg = 'Code বদলানো হচ্ছে…'; render(true);
      await tPost({action:'rename', code:old, newcode:nc});
      let done = false;
      for(let i = 0; i < 6 && !done; i++){ await sleep(1500); done = (await exGet(nc)) === true && (await exGet(old)) === false; }
      if(!done){ x.msg = '⚠ Code বদলানো confirm হয়নি (backend Code.gs deploy/password দেখো)'; return render(true); }
      LS.set('mq_local', LS.get('mq_local', []).map(r => r.exam === old ? {...r, exam:nc} : r));
      delete EXAMS[old]; LS.set('mq_exams', EXAMS);
    }
    // এই exam-এর আলাদা rules নতুন code-এ সরাও
    if(CD && CD.exams && CD.exams[old]){ CD.exams[nc] = CD.exams[old]; delete CD.exams[old]; DIRTY = true; CFG = deepMerge(DEF_CFG, CD); }
    x.code = nc; x.newCode = nc;
    if(!x.isNew){ await loadRemote(); await loadCfg(); }
  }
  x.msg = 'Saving…'; render(true);
  const ex = {code:x.code, title:x.title || x.code, minutes:String(x.minutes || 10), neg:String(x.neg || 0), open:x.open ? 'YES' : 'NO', rows};
  await tPost({action:'upload', code:ex.code, rows:JSON.stringify(rowsOf(ex))});
  const ok = await verifyExam(ex);
  if(ok){ const fx = await autoFix(x); x.orig = x.qs.map(qSig); x.dirty = false; x.msg = '✅ Exam saved' + (fx.length ? ' · 🔧 ' + fx.map(i => 'Q' + (i + 1)).join(', ') + ' ঠিক হয়েছে — আবার exam-এ আসবে' : ''); delete EXAMS[ex.code]; LS.set('mq_exams', EXAMS); await loadExamList(); if(DIRTY) await saveAll(); }
  else x.msg = '⚠ Save confirm হয়নি (Code.gs / password দেখো)';
  render(true);
}
