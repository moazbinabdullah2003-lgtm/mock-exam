/* ---------- Result / review ---------- */
function vResult(r){
  const e = EXAMS[r.exam], R = CFG.rules;
  const okN = r.d.filter(x => x[2]).length, wrN = r.d.filter(x => !x[2] && x[1] >= 0).length, skN = r.d.filter(x => x[1] < 0).length;
  const ts = topicStats([r]);
  const mine = SESS && !SESS.teacher && norm(SESS.sid) === norm(r.sid);
  const isT = SESS && SESS.teacher;
  const w = mine ? wrongIdx(r.sid, r.exam).length : 0;
  const rv = isT ? 'full' : R.review;             // teacher সবসময় সব দেখে
  const showScore = isT || R.showScore;
  const p = pct(r), msgPass = R.passMark ? (p >= R.passMark ? T('pass') : T('fail')) : '';
  let h = `<div class="top"><button class="link" onclick="view=BACK;render();refresh()">${esc(T('back'))}</button><small id="sync">${esc(syncMsg)}</small></div>
  <div class="card"><div class="muted" style="text-align:center">${esc(e ? e.title : r.exam)}${r.mode==='mistakes'?' · mistakes':''}</div>
    ${showScore ? `<p class="big">${r.score}/${r.total}</p><div style="text-align:center" class="muted">${p}% · ${fmt(r.secs)}</div>` : `<p class="big" style="font-size:26px">✓</p><div style="text-align:center" class="muted">Submitted · ${fmt(r.secs)}</div>`}
    ${msgPass && showScore ? `<div style="text-align:center;font-weight:700;margin-top:8px">${esc(msgPass)}</div>` : ''}
    ${showScore ? `<div class="tiles">${tile(okN, T('correct'), 'var(--g)')}${tile(wrN, T('wrong'), 'var(--r)')}${tile(skN, T('skipped'), 'var(--m)')}</div>` : ''}
    ${mine && e && (R.mistakes || R.retake) ? `<div class="row">${R.mistakes ? `<button class="btn ghost" ${w?'':'disabled'} onclick="retake('${esc(r.exam)}','mistakes')">${esc(T('retakeMistakes'))} (${w})</button>` : '<span></span>'}${R.retake ? `<button class="btn" onclick="retake('${esc(r.exam)}','full')">${esc(T('fullAgain'))}</button>` : ''}</div>` : ''}</div>`;
  if(showScore) h += sec('r_topic', '📊 ' + esc(T('topicWise')), `${ts.map(t => `<div class="trow"><span>${esc(t.t)} <small>${t.ok}/${t.n}</small></span><div class="bar"><i style="width:${Math.round(t.p*100)}%;background:${t.p<0.5?'var(--r)':t.p<0.8?'#f59e0b':'var(--g)'}"></i></div><b>${Math.round(t.p*100)}%</b></div>`).join('')}`, ts.length + ' topic');
  h += vTimeBlock([r], 'r_time');
  if(rv === 'none') return h + `<div class="card muted">${esc(T('reviewLocked'))}</div>`;
  const fullLv = rv === 'full';
  h += aiHint(fullLv ? 'তোমার উত্তর, সঠিক উত্তর আর ' + (isT || R.explain ? 'solution ' : '') : 'তোমার উত্তর (✅/❌) ') + `<button class="btn full" onclick="copyRes(-1,this)">📋 Copy full exam for AI</button></div>`;
  let rvh = '';
  r.d.forEach(([qi, c, g, s], n) => {
    const q = qinfo(r.exam, qi);
    if(!q) return;
    rvh += `<div style="margin-bottom:18px"><div class="row" style="margin:0"><span class="muted">Q${n+1} · ${esc(q.t || '')} · ${s}s ${rv==='marks' ? (c < 0 ? '· —' : g ? '· ✅' : '· ❌') : ''}</span><button class="btn sm ghost" onclick="copyRes(${n},this)" title="এই question AI-এর জন্য copy">📋 Copy</button></div><div class="q" style="font-size:.95em">${esc(q.q)}</div>` +
      q.o.map((o, i) => `<div class="opt ${rv==='full' && i===q.a ? 'ok' : i===c ? (rv==='full' ? 'bad' : (g ? 'ok' : 'bad')) : ''}" style="margin:4px 0;padding:8px"><span class="L">${LET[i]}</span><span>${esc(o)}${i===c?' <small>' + esc(T('yourAnswer')) + '</small>':''}</span></div>`).join('') +
      (c < 0 ? `<small class="err">${esc(T('skipped'))}</small>` : '') + (rv === 'full' && R.explain && q.e ? `<div class="exp">💡 ${esc(q.e)}</div>` : '') + '</div>';
  });
  return h + sec('r_review', '📝 ' + esc(T('reviewTitle')), rvh, wrN + skN ? '❌ ' + (wrN + skN) : '✅');
}
