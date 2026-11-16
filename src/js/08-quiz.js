/* ---------- Quiz ---------- */
function vQuiz(){
  const e = EXAMS[RUN.exam], p = RUN.cur, last = RUN.order.length - 1, qi = RUN.order[p], q = LQ(e.questions[qi], RUN.lang), a = RUN.ans[p];
  const un = RUN.order.length - Object.keys(RUN.ans).length;
  const perm = (RUN.op && RUN.op[qi]) || q.o.map((_, i) => i);
  return `<div class="top"><div><b>${esc(e.title)}</b>${RUN.mode==='mistakes'?'<span class="tag">mistakes</span>':''}</div>${CFG.rules.timer ? '<div id="tm" class="tm"></div>' : ''}</div>
  <div class="card"><div class="muted">Question ${p+1} / ${last+1}</div><div class="q">${esc(q.q)}</div>
    ${perm.map((oi, n) => `<button class="opt ${a===oi?'sel':''}" onclick="pick(${oi})"><span class="L">${n+1}</span><span>${esc(q.o[oi])}</span></button>`).join('')}
    <div class="kbhint">⌨ ${perm.length > 1 ? '1–' + perm.length : '1'} = option · Enter = save &amp; next · ← → = prev / next</div>
    <div class="row"><button class="btn ghost" onclick="go(${p-1})" ${p===0?'disabled':''}>${esc(T('prev'))}</button>
      ${a!==undefined ? `<button class="link" onclick="pick(-1)">${esc(T('clear'))}</button>` : '<span></span>'}
      <button class="btn" onclick="go(${p+1})" ${p===last?'disabled':''}>${esc(T('next'))}</button></div></div>
  <div class="card"><div class="pal">${RUN.order.map((_,i) => `<button class="pn ${RUN.ans[i]!==undefined?'done':''} ${i===p?'cur':''}" onclick="go(${i})">${i+1}</button>`).join('')}</div>
    <button class="btn full" onclick="${CFG.rules.confirm ? 'confirming=true;render(true)' : 'finish(false)'}">${esc(T('submit'))}</button></div>
  ${confirming ? `<div class="modal"><div class="card"><h2>${esc(T('submitTitle'))}</h2><p>${un ? un + esc(T('unanswered')) : esc(T('allAnswered'))}</p>
    <div class="row"><button class="btn ghost" onclick="confirming=false;render(true)">${esc(T('cancel'))}</button><button class="btn" onclick="finish(false)">${esc(T('submitYes'))}</button></div></div></div>` : ''}`;
}
function pick(i){
  if(!RUN) return;
  if(i < 0) delete RUN.ans[RUN.cur]; else RUN.ans[RUN.cur] = i;
  LS.set('mq_run', RUN); render(true);
}
/* Keyboard: 1..N = option (দেখানো position), Enter = save & next (শেষ question-এ submit confirm), ← → = prev/next */
function onQuizKey(e){
  if(view !== 'quiz' || !RUN || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target; if(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  const k = e.key;
  if(confirming){
    if(k === 'Enter'){ e.preventDefault(); finish(false); } else if(k === 'Escape'){ confirming = false; render(true); }
    return;
  }
  const qi = RUN.order[RUN.cur], q = EXAMS[RUN.exam].questions[qi], perm = (RUN.op && RUN.op[qi]) || q.o.map((_, i) => i), last = RUN.order.length - 1;
  if(/^[1-9]$/.test(k)){ if(+k <= perm.length){ e.preventDefault(); pick(perm[+k - 1]); } }
  else if(k === 'Enter'){ e.preventDefault(); if(RUN.cur < last) go(RUN.cur + 1); else { confirming = true; render(true); } }
  else if(k === 'ArrowRight'){ e.preventDefault(); go(RUN.cur + 1); }
  else if(k === 'ArrowLeft'){ e.preventDefault(); go(RUN.cur - 1); }
}
if(typeof document !== 'undefined' && document.addEventListener) document.addEventListener('keydown', onQuizKey);
function addTime(){
  const now = Date.now();
  RUN.secs[RUN.cur] = (RUN.secs[RUN.cur] || 0) + (now - RUN.last) / 1000;
  RUN.last = now;
}
function go(n){
  if(!RUN || n < 0 || n >= RUN.order.length) return;
  addTime(); RUN.cur = n; LS.set('mq_run', RUN); render(true);
}
function startTimer(){ clearInterval(TM); TM = setInterval(tick, 1000); tick(); }
function tick(){
  if(!RUN) return;
  const rem = Math.max(0, RUN.dur - Math.floor((Date.now() - RUN.start) / 1000));
  const el = $('#tm');
  if(el){ el.textContent = '⏱ ' + fmt(rem); el.classList.toggle('low', rem < 60); }
  if(rem <= 0) finish(true);
}
function finish(auto){
  if(!RUN) return;
  clearInterval(TM); addTime();
  const e = EXAMS[RUN.exam], neg = e.neg || 0;
  let ok = 0, wr = 0;
  const d = RUN.order.map((qi, p) => {
    const q = e.questions[qi], c = RUN.ans[p] === undefined ? -1 : RUN.ans[p], g = c === q.a ? 1 : 0;
    if(c >= 0){ if(g) ok++; else wr++; }
    return [qi, c, g, Math.round(RUN.secs[p] || 0)];
  });
  const rec = {aid:newAid(), sid:RUN.sid, name:RUN.name, exam:RUN.exam, mode:RUN.mode,
    score:+(ok - wr * neg).toFixed(2), total:RUN.order.length,
    secs:Math.min(RUN.dur, Math.round((Date.now() - RUN.start) / 1000)), d};
  if(isBi(e)) rec.lang = RUN.lang || 'en';
  const loc = LS.get('mq_local', []); loc.push(rec); LS.set('mq_local', loc);
  const ob = LS.get('mq_out', []); ob.push(rec); LS.set('mq_out', ob);
  LS.del('mq_run'); RUN = null; confirming = false;
  LAST = rec; RVLANG = ''; BACK = 'home'; view = 'result'; syncMsg = CAN_SYNC() ? 'Saving…' : '';
  render();
  if(CAN_SYNC()) flush().then(n => { syncMsg = n === 0 ? 'Saved ✓' : n > 0 ? 'Network নেই — পরে auto save হবে' : syncMsg; const el = $('#sync'); if(el) el.textContent = syncMsg; });
}

